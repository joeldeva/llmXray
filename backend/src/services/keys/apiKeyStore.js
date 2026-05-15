const crypto = require('crypto');
const { readJson, writeJson } = require('../storage/jsonStore');
const { hasPostgres, query } = require('../storage/postgres');

const KEYS_FILE = 'apiKeys.json';
const KEY_PREFIX = 'llmxray_live_';
const VALID_PLANS = new Set(['free', 'team', 'enterprise']);

function generateRawKey() {
  return `${KEY_PREFIX}${crypto.randomBytes(16).toString('hex')}`;
}

async function createApiKey({ email, org, plan = 'free' }) {
  const rawKey = generateRawKey();
  const record = {
    id: `key_${crypto.randomBytes(8).toString('hex')}`,
    keyHash: hashKey(rawKey),
    keyPrefix: rawKey.slice(0, KEY_PREFIX.length + 8),
    maskedKey: maskKey(rawKey),
    email: String(email || '').trim().toLowerCase(),
    org: String(org || 'default').trim(),
    plan: normalizePlan(plan),
    status: 'active',
    createdAt: new Date().toISOString(),
    revokedAt: null,
    lastUsedAt: null,
  };

  if (!record.email) {
    const error = new Error('email is required');
    error.statusCode = 400;
    throw error;
  }

  if (hasPostgres()) {
    await query(
      `INSERT INTO api_keys (id, key_hash, key_prefix, masked_key, email, org, plan, status, created_at, revoked_at, last_used_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        record.id,
        record.keyHash,
        record.keyPrefix,
        record.maskedKey,
        record.email,
        record.org,
        record.plan,
        record.status,
        record.createdAt,
        record.revokedAt,
        record.lastUsedAt,
      ]
    );
  } else {
    const keys = readJson(KEYS_FILE, []);
    keys.unshift(record);
    writeJson(KEYS_FILE, keys);
  }

  return { ...publicKeyRecord(record), apiKey: rawKey };
}

async function listApiKeys() {
  const records = await loadApiKeyRecords();
  return records.map(publicKeyRecord);
}

async function revokeApiKey(id) {
  const revokedAt = new Date().toISOString();
  if (hasPostgres()) {
    const result = await query(
      `UPDATE api_keys
          SET status = 'revoked', revoked_at = $2
        WHERE id = $1
        RETURNING id, key_hash, key_prefix, masked_key, email, org, plan, status, created_at, revoked_at, last_used_at`,
      [id, revokedAt]
    );
    return result.rows[0] ? publicKeyRecord(mapRow(result.rows[0])) : null;
  }

  const keys = readJson(KEYS_FILE, []);
  const idx = keys.findIndex(key => key.id === id);
  if (idx === -1) return null;
  keys[idx] = { ...keys[idx], status: 'revoked', revokedAt };
  writeJson(KEYS_FILE, keys);
  return publicKeyRecord(keys[idx]);
}

async function validateApiKey(rawKey) {
  const bootstrap = bootstrapKeyRecord(rawKey);
  if (bootstrap) return bootstrap;

  if (!rawKey || !rawKey.startsWith(KEY_PREFIX)) return null;
  const keyHash = hashKey(rawKey);
  const records = await loadApiKeyRecords();
  const record = records.find(key => key.keyHash === keyHash && key.status === 'active');
  if (!record) return null;
  await touchApiKey(record.id);
  return publicKeyRecord({ ...record, lastUsedAt: new Date().toISOString() });
}

async function touchApiKey(id) {
  const lastUsedAt = new Date().toISOString();
  if (hasPostgres()) {
    await query('UPDATE api_keys SET last_used_at = $2 WHERE id = $1', [id, lastUsedAt]);
    return;
  }

  const keys = readJson(KEYS_FILE, []);
  const idx = keys.findIndex(key => key.id === id);
  if (idx !== -1) {
    keys[idx].lastUsedAt = lastUsedAt;
    writeJson(KEYS_FILE, keys);
  }
}

async function loadApiKeyRecords() {
  if (hasPostgres()) {
    const result = await query(
      `SELECT id, key_hash, key_prefix, masked_key, email, org, plan, status, created_at, revoked_at, last_used_at
         FROM api_keys
        ORDER BY created_at DESC`
    );
    return result.rows.map(mapRow);
  }

  return readJson(KEYS_FILE, []);
}

function bootstrapKeyRecord(rawKey) {
  const bootstrapKey = process.env.LLMXRAY_MASTER_API_KEY;
  if (!bootstrapKey || !rawKey || !safeEqual(rawKey, bootstrapKey)) return null;
  return {
    id: 'bootstrap',
    maskedKey: maskKey(rawKey),
    email: process.env.LLMXRAY_MASTER_EMAIL || 'admin@llmxray.local',
    org: process.env.LLMXRAY_MASTER_ORG || 'LlmXray',
    plan: 'enterprise',
    status: 'active',
    createdAt: null,
    revokedAt: null,
    lastUsedAt: null,
    isBootstrap: true,
  };
}

function publicKeyRecord(record) {
  return {
    id: record.id,
    apiKey: undefined,
    maskedKey: record.maskedKey,
    email: record.email,
    org: record.org,
    plan: normalizePlan(record.plan),
    status: record.status,
    createdAt: record.createdAt,
    revokedAt: record.revokedAt || null,
    lastUsedAt: record.lastUsedAt || null,
    isBootstrap: record.isBootstrap === true,
  };
}

function mapRow(row) {
  return {
    id: row.id,
    keyHash: row.key_hash,
    keyPrefix: row.key_prefix,
    maskedKey: row.masked_key,
    email: row.email,
    org: row.org,
    plan: row.plan,
    status: row.status,
    createdAt: row.created_at?.toISOString?.() || row.created_at,
    revokedAt: row.revoked_at?.toISOString?.() || row.revoked_at,
    lastUsedAt: row.last_used_at?.toISOString?.() || row.last_used_at,
  };
}

function hashKey(rawKey) {
  return crypto.createHash('sha256').update(String(rawKey)).digest('hex');
}

function maskKey(rawKey) {
  const value = String(rawKey || '');
  if (value.length <= 12) return '****';
  return `${value.slice(0, 14)}...${value.slice(-4)}`;
}

function normalizePlan(plan) {
  return VALID_PLANS.has(plan) ? plan : 'free';
}

function safeEqual(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

module.exports = {
  createApiKey,
  listApiKeys,
  maskKey,
  revokeApiKey,
  validateApiKey,
};
