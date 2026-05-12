const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const LOGS_FILE = path.join(__dirname, '../../data/auditLogs.json');

function loadLogs() {
  if (!fs.existsSync(LOGS_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(LOGS_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

function saveLogs(logs) {
  fs.mkdirSync(path.dirname(LOGS_FILE), { recursive: true });
  fs.writeFileSync(LOGS_FILE, JSON.stringify(logs, null, 2));
}

function logEvent(event) {
  const logs = loadLogs();
  const id = 'evt_' + crypto.randomBytes(6).toString('hex');
  const entry = {
    id,
    timestamp: new Date().toISOString(),
    ...event,
    rawStored: false,
  };
  logs.unshift(entry);
  // Keep last 1000 events
  if (logs.length > 1000) logs.length = 1000;
  saveLogs(logs);
  return id;
}

function getStats() {
  const logs = loadLogs();
  const total = logs.length;
  const blocked = logs.filter(l => l.decision === 'BLOCK').length;
  const warned = logs.filter(l => l.decision === 'WARN').length;
  const humanReview = logs.filter(l => l.decision === 'HUMAN_REVIEW').length;
  const quarantined = logs.filter(l => l.decision === 'QUARANTINE').length;
  const critical = logs.filter(l => l.riskLevel === 'CRITICAL').length;
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

  return { total, blocked, warned, humanReview, quarantined, critical, fileScans, topPolicyHits };
}

module.exports = { logEvent, loadLogs, getStats };
