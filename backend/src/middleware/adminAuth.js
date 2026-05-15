const { verifyToken } = require('../services/auth/authService');

function requireAdmin(req, res, next) {
  return requireAuth(req, res, next);
}

function requirePermission(permission) {
  return (req, res, next) => requireAuth(req, res, error => {
    if (error) return next(error);
    if (!req.admin.permissions.includes(permission)) {
      return res.status(403).json({ error: 'insufficient permissions' });
    }
    return next();
  });
}

function requireAuth(req, res, next) {
  const header = req.get('authorization') || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'authentication required' });
  }

  const payload = verifyToken(token);
  if (!payload || !payload.role) {
    return res.status(401).json({ error: 'invalid or expired token' });
  }

  req.admin = {
    email: payload.sub,
    role: payload.role,
    permissions: Array.isArray(payload.permissions) ? payload.permissions : [],
  };
  return next();
}

module.exports = { requireAdmin, requirePermission };
