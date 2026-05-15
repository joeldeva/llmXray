const { Pool } = require('pg');

let pool = null;

function hasPostgres() {
  return Boolean(process.env.DATABASE_URL);
}

function getPool() {
  if (!hasPostgres()) return null;
  if (!pool) {
    const sslEnabled = process.env.DATABASE_SSL === 'true';
    pool = new Pool({
      connectionString: sslEnabled ? stripSslMode(process.env.DATABASE_URL) : process.env.DATABASE_URL,
      ssl: sslEnabled ? { rejectUnauthorized: false } : undefined,
    });
  }
  return pool;
}

async function query(text, params) {
  const db = getPool();
  if (!db) throw new Error('Postgres is not configured.');
  return db.query(text, params);
}

function stripSslMode(connectionString) {
  try {
    const url = new URL(connectionString);
    url.searchParams.delete('sslmode');
    return url.toString();
  } catch {
    return connectionString;
  }
}

module.exports = { getPool, hasPostgres, query };
