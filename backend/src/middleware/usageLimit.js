const { checkAndRecordUsage } = require('../services/usage/usageTracker');

async function enforceUsageLimits(req, res, next) {
  try {
    const result = await checkAndRecordUsage(req.apiKey);
    req.usage = result.usage;

    if (!result.allowed) {
      if (result.statusCode === 402) {
        return res.status(402).json({
          error: result.message,
          usage: result.usage,
        });
      }

      res.set('Retry-After', String(result.retryAfter));
      return res.status(result.statusCode).json({
        error: 'Too Many Requests',
        usage: result.usage,
      });
    }

    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = { enforceUsageLimits };
