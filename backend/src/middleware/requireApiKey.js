const { validateApiKey } = require('../services/keys/apiKeyStore');

async function requireApiKey(req, res, next) {
  try {
    const rawKey = req.get('x-api-key');
    if (!rawKey) {
      return res.status(401).json({ error: 'x-api-key header is required' });
    }

    const apiKey = await validateApiKey(rawKey);
    if (!apiKey) {
      return res.status(401).json({ error: 'invalid API key' });
    }

    req.apiKey = apiKey;
    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = { requireApiKey };
