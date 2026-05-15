const buckets = new Map();

function rateLimit({ windowMs, max, keyPrefix = 'global' }) {
  return (req, res, next) => {
    if (process.env.NODE_ENV === 'test') return next();

    const now = Date.now();
    const key = `${keyPrefix}:${req.ip || req.socket.remoteAddress || 'unknown'}`;
    const bucket = buckets.get(key) || { count: 0, resetAt: now + windowMs };

    if (bucket.resetAt <= now) {
      bucket.count = 0;
      bucket.resetAt = now + windowMs;
    }

    bucket.count += 1;
    buckets.set(key, bucket);

    res.setHeader('X-RateLimit-Limit', String(max));
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, max - bucket.count)));
    res.setHeader('X-RateLimit-Reset', String(Math.ceil(bucket.resetAt / 1000)));

    if (bucket.count > max) {
      return res.status(429).json({ error: 'rate limit exceeded' });
    }

    return next();
  };
}

module.exports = { rateLimit };
