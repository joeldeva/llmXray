const express = require('express');
const router = express.Router();

const {
  authenticateAdmin,
  getAdminEmail,
  isUsingDefaultCredentials,
} = require('../services/auth/authService');
const { requireAdmin } = require('../middleware/adminAuth');
const { requireString, validateBody } = require('../middleware/validate');

router.post('/login', validateBody({
  email: requireString('email', { max: 320 }),
  password: requireString('password', { max: 256 }),
}), (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }

  const session = authenticateAdmin(email, password);
  if (!session) {
    return res.status(401).json({ error: 'invalid credentials' });
  }

  res.json({
    ...session,
    usingDefaultCredentials: isUsingDefaultCredentials(),
  });
});

router.get('/me', requireAdmin, (req, res) => {
  res.json({
    user: req.admin,
    configuredAdminEmail: getAdminEmail(),
    usingDefaultCredentials: isUsingDefaultCredentials(),
  });
});

module.exports = router;
