require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const extensionRoutes = require('./routes/extension.routes');
const auditRoutes = require('./routes/audit.routes');
const policiesRoutes = require('./routes/policies.routes');
const reviewRoutes = require('./routes/review.routes');

const app = express();

// Security & logging middleware
app.use(helmet());
app.use(morgan('combined'));
app.use(cors({ origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*' }));
app.use(express.json({ limit: '2mb' }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'TrustGuard Backend', version: '1.0.0', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/extension', extensionRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/policies', policiesRoutes);
app.use('/api/review', reviewRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`[TrustGuard] Backend running on port ${PORT}`);
  console.log(`[TrustGuard] Health: http://localhost:${PORT}/api/health`);
});
