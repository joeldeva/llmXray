const fs = require('fs');
const path = require('path');
const { getPool, hasPostgres } = require('./postgres');

let schemaPromise = null;

async function ensureSchema() {
  if (!hasPostgres()) return;
  if (!schemaPromise) {
    schemaPromise = runSchema();
  }
  await schemaPromise;
}

async function runSchema() {
  const schema = fs.readFileSync(path.join(__dirname, '../../../db/schema.sql'), 'utf-8');
  await getPool().query(schema);
}

module.exports = { ensureSchema };
