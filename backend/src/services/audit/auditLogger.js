const crypto = require('crypto');
const { readJson, writeJson } = require('../storage/jsonStore');
const { hasPostgres, query } = require('../storage/postgres');
const { exportAuditEvent } = require('../integrations/siemExporter');

const LOGS_FILE = 'auditLogs.json';

async function loadLogs() {
  if (hasPostgres()) {
    const result = await query(
      `SELECT id, timestamp, tenant_id, device_id, site, user_id, department, event_type, risk_score, risk_level,
              decision, policy_hits, evidence, url, status, file_meta, findings, raw_stored,
              prev_hash, entry_hash
         FROM audit_logs
        ORDER BY timestamp DESC
        LIMIT 1000`
    );
    return result.rows.map(mapAuditRow);
  }

  return readJson(LOGS_FILE, []);
}

function saveLogs(logs) {
  writeJson(LOGS_FILE, logs);
}

async function logEvent(event) {
  const id = 'evt_' + crypto.randomBytes(6).toString('hex');
  const timestamp = new Date().toISOString();
  const previous = await getLatestAuditHash();
  const entry = {
    id,
    timestamp,
    ...event,
    rawStored: false,
  };
  entry.prevHash = previous;
  entry.entryHash = generateEntryHash(entry);

  if (hasPostgres()) {
    await query(
      `INSERT INTO audit_logs (
        id, timestamp, tenant_id, device_id, site, user_id, department, event_type, risk_score, risk_level,
        decision, policy_hits, evidence, url, status, file_meta, findings, raw_stored, prev_hash, entry_hash
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12::jsonb, $13, $14, $15, $16::jsonb, $17::jsonb, $18, $19, $20
      )`,
      [
        entry.id,
        entry.timestamp,
        entry.tenantId || 'default',
        entry.deviceId || null,
        entry.site,
        entry.userId,
        entry.department,
        entry.eventType,
        entry.riskScore,
        entry.riskLevel,
        entry.decision,
        JSON.stringify(entry.policyHits || []),
        entry.evidence || null,
        entry.url || null,
        entry.status,
        entry.fileMeta ? JSON.stringify(entry.fileMeta) : null,
        JSON.stringify(entry.findings || []),
        entry.rawStored,
        entry.prevHash,
        entry.entryHash,
      ]
    );
    await exportAuditEvent(entry);
    return id;
  }

  const logs = readJson(LOGS_FILE, []);
  logs.unshift(entry);
  // Keep last 1000 events
  if (logs.length > 1000) logs.length = 1000;
  saveLogs(logs);
  await exportAuditEvent(entry);
  return id;
}

async function getStats() {
  if (hasPostgres()) {
    const aggregateResult = await query(
      `SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE decision = 'BLOCK')::int AS blocked,
        COUNT(*) FILTER (WHERE decision = 'WARN')::int AS warned,
        COUNT(*) FILTER (WHERE decision = 'ALLOW')::int AS allowed,
        COUNT(*) FILTER (WHERE decision = 'HUMAN_REVIEW')::int AS human_review,
        COUNT(*) FILTER (WHERE decision = 'QUARANTINE')::int AS quarantined,
        COUNT(*) FILTER (WHERE risk_level = 'CRITICAL')::int AS critical,
        COUNT(*) FILTER (WHERE event_type = 'FILE_SCAN')::int AS file_scans
       FROM audit_logs`
    );
    const row = aggregateResult.rows[0] || {};
    const topPolicyHitsResult = await query(
      `SELECT hits.name AS name, COUNT(*)::int AS value
         FROM audit_logs
         CROSS JOIN LATERAL jsonb_array_elements_text(policy_hits) AS hits(name)
        GROUP BY hits.name
        ORDER BY value DESC
        LIMIT 5`
    );
    const riskTrendResult = await query(
      `WITH days AS (
         SELECT generate_series(
           date_trunc('day', NOW()) - INTERVAL '6 days',
           date_trunc('day', NOW()),
           INTERVAL '1 day'
         ) AS day
       )
       SELECT
         to_char(days.day, 'YYYY-MM-DD') AS date,
         COUNT(a.id)::int AS total,
         COUNT(a.id) FILTER (WHERE a.risk_level = 'CRITICAL')::int AS critical,
         COUNT(a.id) FILTER (WHERE a.decision = 'BLOCK')::int AS blocked
       FROM days
       LEFT JOIN audit_logs a
         ON a.timestamp >= days.day
        AND a.timestamp < days.day + INTERVAL '1 day'
       GROUP BY days.day
       ORDER BY days.day`
    );

    const totalScans = Number(row.total || 0);
    const totalBlocked = Number(row.blocked || 0);
    const totalWarned = Number(row.warned || 0);
    const totalAllowed = Number(row.allowed || 0);
    const humanReview = Number(row.human_review || 0);
    const quarantined = Number(row.quarantined || 0);
    const criticalEvents = Number(row.critical || 0);
    const fileScans = Number(row.file_scans || 0);

    return {
      totalScans,
      totalBlocked,
      totalWarned,
      totalAllowed,
      criticalEvents,
      topPolicyHits: topPolicyHitsResult.rows.map(hit => ({ name: hit.name, value: Number(hit.value || 0) })),
      riskTrend: riskTrendResult.rows.map(trend => ({
        date: trend.date,
        total: Number(trend.total || 0),
        critical: Number(trend.critical || 0),
        blocked: Number(trend.blocked || 0),
      })),
      total: totalScans,
      blocked: totalBlocked,
      warned: totalWarned,
      humanReview,
      quarantined,
      critical: criticalEvents,
      fileScans,
    };
  }

  const logs = await loadLogs();
  const totalScans = logs.length;
  const totalBlocked = logs.filter(l => l.decision === 'BLOCK').length;
  const totalWarned = logs.filter(l => l.decision === 'WARN').length;
  const totalAllowed = logs.filter(l => l.decision === 'ALLOW').length;
  const humanReview = logs.filter(l => l.decision === 'HUMAN_REVIEW').length;
  const quarantined = logs.filter(l => l.decision === 'QUARANTINE').length;
  const criticalEvents = logs.filter(l => l.riskLevel === 'CRITICAL').length;
  const fileScans = logs.filter(l => l.eventType === 'FILE_SCAN').length;

  const policyHitCounts = {};
  logs.forEach(l => {
    (l.policyHits || []).forEach(p => {
      policyHitCounts[p] = (policyHitCounts[p] || 0) + 1;
    });
  });
  const topPolicyHits = Object.entries(policyHitCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, value]) => ({ name, value }));

  const riskTrend = buildRiskTrend(logs);

  return {
    totalScans,
    totalBlocked,
    totalWarned,
    totalAllowed,
    criticalEvents,
    topPolicyHits,
    riskTrend,
    total: totalScans,
    blocked: totalBlocked,
    warned: totalWarned,
    humanReview,
    quarantined,
    critical: criticalEvents,
    fileScans,
  };
}

async function queryAuditLogs({ page = 1, limit = 20, decision, userId, from, to } = {}) {
  const parsedPage = Math.max(1, Number(page) || 1);
  const parsedLimit = Math.min(100, Math.max(1, Number(limit) || 20));
  const offset = (parsedPage - 1) * parsedLimit;

  if (hasPostgres()) {
    const where = [];
    const params = [];
    if (decision) where.push(`decision = $${params.push(decision)}`);
    if (userId) where.push(`user_id = $${params.push(userId)}`);
    if (from) {
      const fromDate = new Date(from);
      if (!Number.isNaN(fromDate.getTime())) where.push(`timestamp >= $${params.push(fromDate)}`);
    }
    if (to) {
      const toDate = new Date(to);
      if (!Number.isNaN(toDate.getTime())) where.push(`timestamp <= $${params.push(toDate)}`);
    }

    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const countResult = await query(`SELECT COUNT(*)::int AS count FROM audit_logs ${whereClause}`, params);
    const total = Number(countResult.rows[0]?.count || 0);

    params.push(parsedLimit, offset);
    const dataResult = await query(
      `SELECT id, timestamp, tenant_id, device_id, site, user_id, department, event_type, risk_score, risk_level,
              decision, policy_hits, evidence, url, status, file_meta, findings, raw_stored,
              prev_hash, entry_hash
         FROM audit_logs
         ${whereClause}
        ORDER BY timestamp DESC
        LIMIT $${params.length - 1}
       OFFSET $${params.length}`,
      params
    );

    return {
      events: dataResult.rows.map(row => maskAuditEvent(mapAuditRow(row))),
      pagination: {
        page: parsedPage,
        limit: parsedLimit,
        total,
        totalPages: Math.max(1, Math.ceil(total / parsedLimit)),
      },
    };
  }

  const fromTime = from ? new Date(from).getTime() : null;
  const toTime = to ? new Date(to).getTime() : null;
  let logs = await loadLogs();

  logs = logs.filter(log => {
    const timestamp = new Date(log.timestamp).getTime();
    if (decision && log.decision !== decision) return false;
    if (userId && log.userId !== userId) return false;
    if (fromTime && timestamp < fromTime) return false;
    if (toTime && timestamp > toTime) return false;
    return true;
  });

  const total = logs.length;
  const events = logs.slice(offset, offset + parsedLimit).map(maskAuditEvent);
  return {
    events,
    pagination: {
      page: parsedPage,
      limit: parsedLimit,
      total,
      totalPages: Math.max(1, Math.ceil(total / parsedLimit)),
    },
  };
}

function mapAuditRow(row) {
  return {
    id: row.id,
    timestamp: row.timestamp?.toISOString?.() || row.timestamp,
    tenantId: row.tenant_id,
    deviceId: row.device_id,
    site: row.site,
    userId: row.user_id,
    department: row.department,
    eventType: row.event_type,
    riskScore: row.risk_score,
    riskLevel: row.risk_level,
    decision: row.decision,
    policyHits: row.policy_hits || [],
    evidence: row.evidence,
    url: row.url,
    status: row.status,
    fileMeta: row.file_meta,
    findings: row.findings || [],
    rawStored: row.raw_stored,
    prevHash: row.prev_hash,
    entryHash: row.entry_hash,
  };
}

function maskAuditEvent(log) {
  return {
    id: log.id,
    timestamp: log.timestamp,
    userId: log.userId,
    site: log.site,
    eventType: log.eventType,
    decision: log.decision,
    riskScore: log.riskScore,
    riskLevel: log.riskLevel,
    policyHits: log.policyHits || [],
    findings: log.findings || [],
    fileMeta: log.fileMeta || null,
  };
}

function buildRiskTrend(logs) {
  const days = [];
  const now = new Date();
  for (let i = 6; i >= 0; i -= 1) {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - i));
    const day = date.toISOString().slice(0, 10);
    const dayLogs = logs.filter(log => String(log.timestamp).slice(0, 10) === day);
    days.push({
      date: day,
      total: dayLogs.length,
      critical: dayLogs.filter(log => log.riskLevel === 'CRITICAL').length,
      blocked: dayLogs.filter(log => log.decision === 'BLOCK').length,
    });
  }
  return days;
}

async function verifyAuditChain() {
  const logs = await loadLogs();
  const ordered = [...logs].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  const errors = [];
  let previousHash = null;

  for (const entry of ordered) {
    if (!entry.entryHash) {
      errors.push({ id: entry.id, reason: 'missing entryHash' });
      continue;
    }

    if ((entry.prevHash || null) !== previousHash) {
      errors.push({ id: entry.id, reason: 'prevHash mismatch' });
    }

    const expectedHash = generateEntryHash({ ...entry, prevHash: entry.prevHash || null });
    if (entry.entryHash !== expectedHash) {
      errors.push({ id: entry.id, reason: 'entryHash mismatch' });
    }

    previousHash = entry.entryHash;
  }

  return {
    valid: errors.length === 0,
    checked: ordered.length,
    errors,
    headHash: ordered[ordered.length - 1]?.entryHash || null,
  };
}

async function backfillAuditChain() {
  const logs = await loadLogs();
  const ordered = [...logs].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  let previousHash = null;
  const repaired = [];

  for (const entry of ordered) {
    const repairedEntry = {
      ...entry,
      rawStored: entry.rawStored === true,
      prevHash: previousHash,
    };
    repairedEntry.entryHash = generateEntryHash(repairedEntry);
    previousHash = repairedEntry.entryHash;
    repaired.push(repairedEntry);
  }

  if (hasPostgres()) {
    for (const entry of repaired) {
      await query(
        `UPDATE audit_logs
            SET prev_hash = $2, entry_hash = $3
          WHERE id = $1`,
        [entry.id, entry.prevHash, entry.entryHash]
      );
    }
  } else {
    saveLogs(repaired.reverse());
  }

  return {
    repaired: repaired.length,
    headHash: previousHash,
  };
}

async function getLatestAuditHash() {
  if (hasPostgres()) {
    const result = await query('SELECT entry_hash FROM audit_logs ORDER BY timestamp DESC LIMIT 1');
    return result.rows[0]?.entry_hash || null;
  }

  const logs = readJson(LOGS_FILE, []);
  return logs[0]?.entryHash || null;
}

function generateEntryHash(entry) {
  const stable = JSON.stringify({
    id: entry.id,
    timestamp: entry.timestamp,
    tenantId: entry.tenantId || 'default',
    deviceId: entry.deviceId || null,
    site: entry.site,
    userId: entry.userId,
    department: entry.department,
    eventType: entry.eventType,
    riskScore: entry.riskScore,
    riskLevel: entry.riskLevel,
    decision: entry.decision,
    policyHits: entry.policyHits || [],
    evidence: entry.evidence || null,
    url: entry.url || '',
    status: entry.status,
    fileMeta: entry.fileMeta || null,
    findings: entry.findings || [],
    rawStored: entry.rawStored,
    prevHash: entry.prevHash || null,
  });
  return crypto.createHash('sha256').update(stable).digest('hex');
}

module.exports = { backfillAuditChain, logEvent, loadLogs, queryAuditLogs, getStats, generateEntryHash, verifyAuditChain };
