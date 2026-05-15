require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { getPool, hasPostgres } = require('../src/services/storage/postgres');

async function migrate() {
  if (!hasPostgres()) {
    throw new Error('DATABASE_URL is required to run Postgres migrations.');
  }

  const schema = fs.readFileSync(path.join(__dirname, '../db/schema.sql'), 'utf-8');
  const pool = getPool();
  await pool.query(schema);
  await pool.end();
  console.log('[LlmXray] Database migration completed.');
}

migrate().catch(error => {
  console.error('[LlmXray] Migration failed:', error.message);
  process.exit(1);
});
