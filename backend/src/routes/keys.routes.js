const express = require('express');
const { createApiKey, listApiKeys, revokeApiKey } = require('../services/keys/apiKeyStore');

const router = express.Router();

router.post('/generate', async (req, res, next) => {
  try {
    const key = await createApiKey({
      email: req.body?.email,
      org: req.body?.org,
      plan: req.body?.plan,
    });
    res.status(201).json(key);
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    return next(error);
  }
});

router.get('/list', async (req, res, next) => {
  try {
    res.json({ keys: await listApiKeys() });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const revoked = await revokeApiKey(req.params.id);
    if (!revoked) return res.status(404).json({ error: 'API key not found' });
    return res.json(revoked);
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
