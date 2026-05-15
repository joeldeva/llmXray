require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const authRoutes = require('./routes/auth.routes');
const keyRoutes = require('./routes/keys.routes');
const usageRoutes = require('./routes/usage.routes');
const scanRoutes = require('./routes/scan.routes');
const auditRoutes = require('./routes/audit.routes');
const policiesRoutes = require('./routes/policies.routes');
const reviewRoutes = require('./routes/review.routes');
const devicesRoutes = require('./routes/devices.routes');
const { requireAdmin } = require('./middleware/adminAuth');
const { requireApiKey } = require('./middleware/requireApiKey');
const { bindApiIdentity } = require('./middleware/apiIdentity');
const { enforceUsageLimits } = require('./middleware/usageLimit');
const { rateLimit } = require('./middleware/rateLimit');
const { isUsingDefaultCredentials, getAdminEmail } = require('./services/auth/authService');
const { ensureSchema } = require('./services/storage/ensureSchema');

const app = express();

// Security & logging middleware
app.use(helmet());
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}
app.use(cors(buildCorsOptions));
app.use(express.json({ limit: '2mb' }));
app.use(async (req, res, next) => {
  if (req.path === '/api/health') return next();
  try {
    await ensureSchema();
    return next();
  } catch (error) {
    return next(error);
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'LlmXray Backend', version: '1.0.0', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, max: 30, keyPrefix: 'auth' }), authRoutes);
app.use('/api/keys', requireApiKey, keyRoutes);
app.use('/api/usage', requireApiKey, usageRoutes);
app.use('/api/scan', requireApiKey, enforceUsageLimits, bindApiIdentity, scanRoutes);
app.use('/api/audit', requireApiKey, auditRoutes);
app.use('/api/policies', requireAdmin, policiesRoutes);
app.use('/api/review', requireAdmin, reviewRoutes);
app.use('/api/devices', requireAdmin, devicesRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }
  console.error(err.stack);
  return res.status(500).json({ error: 'Internal server error' });
});

function buildCorsOptions(req, callback) {
  const configuredOrigins = parseAllowedOrigins();
  const origin = req.get('origin');
  const hasApiKey = Boolean(req.get('x-api-key') || req.get('x-llmxray-api-token'));
  let allowedOrigin = '*';

  if (configuredOrigins.length > 0 && !configuredOrigins.includes('*')) {
    if (!origin) {
      allowedOrigin = true;
    } else if (configuredOrigins.includes(origin) || hasApiKey) {
      allowedOrigin = origin;
    } else {
      allowedOrigin = false;
    }
  }

  callback(null, {
    origin: allowedOrigin,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Api-Key',
      'X-LlmXray-Api-Token',
      'X-LlmXray-Tenant-Id',
      'X-LlmXray-Client-Id',
      'X-LlmXray-Subject-Id',
      'X-LlmXray-Client-Version',
    ],
  });
}

function parseAllowedOrigins() {
  return (process.env.ALLOWED_ORIGINS || '*')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);
}

function startServer(port = process.env.PORT || 3001) {
  return app.listen(port, () => {
    console.log(`[LlmXray] Backend running on port ${port}`);
    console.log(`[LlmXray] Health: http://localhost:${port}/api/health`);
    if (isUsingDefaultCredentials()) {
      console.warn(`[LlmXray] Development admin credentials active: ${getAdminEmail()} / ChangeMe123!`);
    }
  });
}

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };
