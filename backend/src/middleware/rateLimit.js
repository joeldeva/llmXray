const { hasPostgres, query } = require('../services/storage/postgres');

const buckets = new Map();
let lastCleanupAt = 0;

function rateLimit({ windowMs, max, keyPrefix = 'global' }) {
  return async (req, res, next) => {
    if (process.env.NODE_ENV === 'test') return next();

    const key = `${keyPrefix}:${req.ip || req.socket.remoteAddress || 'unknown'}`;

    try {
      if (hasPostgres()) {
        await cleanupPostgresBuckets();
        return await rateLimitPostgres({ key, windowMs, max, res, next });
      }

      return rateLimitMemory({ key, windowMs, max, res, next });
    } catch (error) {
      return next(error);
    }
  };
}

async function rateLimitPostgres({ key, windowMs, max, res, next }) {
  const countResult = await query(
    `SELECT COUNT(*)::int AS count
       FROM rate_limit_buckets
      WHERE bucket_key = $1
        AND ts > NOW() - ($2::text || ' milliseconds')::interval`,
    [key, windowMs]
  );
  const currentCount = Number(countResult.rows[0]?.count || 0);
  const nextCount = currentCount + 1;

  await query('INSERT INTO rate_limit_buckets (bucket_key) VALUES ($1)', [key]);

  res.setHeader('X-RateLimit-Limit', String(max));
  res.setHeader('X-RateLimit-Remaining', String(Math.max(0, max - nextCount)));
  res.setHeader('X-RateLimit-Reset', String(Math.ceil((Date.now() + windowMs) / 1000)));

  if (nextCount > max) {
    return res.status(429).json({ error: 'rate limit exceeded' });
  }

  return next();
}

function rateLimitMemory({ key, windowMs, max, res, next }) {
  const now = Date.now();
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
}

async function cleanupPostgresBuckets() {
  const now = Date.now();
  if (now - lastCleanupAt < 60 * 1000) return;
  lastCleanupAt = now;
  await query("DELETE FROM rate_limit_buckets WHERE ts < NOW() - INTERVAL '1 hour'");
}

module.exports = { rateLimit };
