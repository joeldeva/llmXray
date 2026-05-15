const { readJson, writeJson } = require('../storage/jsonStore');
const { hasPostgres, query } = require('../storage/postgres');

const DEVICES_FILE = 'devices.json';
const VALID_STATUSES = new Set(['ACTIVE', 'SUSPENDED', 'REVOKED']);

async function recordDeviceSeen(identity) {
  const now = new Date().toISOString();
  const entry = normalizeDevice({
    ...identity,
    status: identity.status || 'ACTIVE',
    firstSeen: now,
    lastSeen: now,
  });

  if (hasPostgres()) {
    await query(
      `INSERT INTO devices (
        tenant_id, device_id, user_id, status, client_version, first_seen, last_seen, user_agent
      ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW(), $6)
      ON CONFLICT (tenant_id, device_id)
      DO UPDATE SET
        user_id = EXCLUDED.user_id,
        client_version = EXCLUDED.client_version,
        last_seen = NOW(),
        user_agent = EXCLUDED.user_agent`,
      [
        entry.tenantId,
        entry.deviceId,
        entry.userId,
        entry.status,
        entry.clientVersion,
        entry.userAgent,
      ]
    );
    return getDevice(entry.tenantId, entry.deviceId);
  }

  const devices = readJson(DEVICES_FILE, []);
  const idx = devices.findIndex(device => device.tenantId === entry.tenantId && device.deviceId === entry.deviceId);
  if (idx === -1) {
    devices.unshift(entry);
    writeJson(DEVICES_FILE, devices);
    return entry;
  }

  devices[idx] = {
    ...devices[idx],
    userId: entry.userId,
    clientVersion: entry.clientVersion,
    userAgent: entry.userAgent,
    lastSeen: now,
  };
  writeJson(DEVICES_FILE, devices);
  return devices[idx];
}

async function getDevice(tenantId, deviceId) {
  if (hasPostgres()) {
    const result = await query(
      `SELECT tenant_id, device_id, user_id, status, client_version, first_seen, last_seen, user_agent
         FROM devices
        WHERE tenant_id = $1 AND device_id = $2`,
      [tenantId, deviceId]
    );
    return result.rows[0] ? mapRow(result.rows[0]) : null;
  }

  return readJson(DEVICES_FILE, []).find(device => device.tenantId === tenantId && device.deviceId === deviceId) || null;
}

async function listDevices() {
  if (hasPostgres()) {
    const result = await query(
      `SELECT tenant_id, device_id, user_id, status, client_version, first_seen, last_seen, user_agent
         FROM devices
        ORDER BY last_seen DESC
        LIMIT 1000`
    );
    return result.rows.map(mapRow);
  }

  return readJson(DEVICES_FILE, []);
}

async function updateDeviceStatus(tenantId, deviceId, status) {
  if (!VALID_STATUSES.has(status)) return null;

  if (hasPostgres()) {
    const result = await query(
      `UPDATE devices
          SET status = $3
        WHERE tenant_id = $1 AND device_id = $2
        RETURNING tenant_id, device_id, user_id, status, client_version, first_seen, last_seen, user_agent`,
      [tenantId, deviceId, status]
    );
    return result.rows[0] ? mapRow(result.rows[0]) : null;
  }

  const devices = readJson(DEVICES_FILE, []);
  const idx = devices.findIndex(device => device.tenantId === tenantId && device.deviceId === deviceId);
  if (idx === -1) return null;
  devices[idx].status = status;
  writeJson(DEVICES_FILE, devices);
  return devices[idx];
}

function normalizeDevice(device) {
  return {
    tenantId: String(device.tenantId || 'default'),
    deviceId: String(device.deviceId || ''),
    userId: String(device.userId || 'unknown'),
    status: VALID_STATUSES.has(device.status) ? device.status : 'ACTIVE',
    clientVersion: device.clientVersion || null,
    firstSeen: device.firstSeen,
    lastSeen: device.lastSeen,
    userAgent: device.userAgent || null,
  };
}

function mapRow(row) {
  return {
    tenantId: row.tenant_id,
    deviceId: row.device_id,
    userId: row.user_id,
    status: row.status,
    clientVersion: row.client_version,
    firstSeen: row.first_seen.toISOString(),
    lastSeen: row.last_seen.toISOString(),
    userAgent: row.user_agent,
  };
}

module.exports = { getDevice, listDevices, recordDeviceSeen, updateDeviceStatus };
