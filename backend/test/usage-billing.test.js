const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

process.env.NODE_ENV = 'test';
process.env.LLMXRAY_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'llmxray-billing-'));
process.env.LLMXRAY_MASTER_API_KEY = 'billing-test-key';
process.env.LLMXRAY_RATE_LIMIT_PER_MINUTE = '2000';
process.env.LLMXRAY_RATE_LIMIT_PER_DAY = '2000';

const auditPath = require.resolve('../src/services/audit/auditLogger');
require.cache[auditPath] = {
  id: auditPath,
  filename: auditPath,
  loaded: true,
  exports: {
    logEvent: () => 'evt_test_no_write',
    loadLogs: () => [],
    getStats: () => ({
      totalScans: 0,
      totalBlocked: 0,
      totalWarned: 0,
      totalAllowed: 0,
      criticalEvents: 0,
      topPolicyHits: [],
      riskTrend: [],
    }),
  },
};

const { app } = require('../src/server');
const { writeJson } = require('../src/services/storage/jsonStore');

function listen() {
  return new Promise(resolve => {
    const server = app.listen(0, () => resolve(server));
  });
}

async function generateKey(baseUrl, plan = 'free') {
  const response = await fetch(`${baseUrl}/api/keys/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': 'billing-test-key',
    },
    body: JSON.stringify({ email: 'billing@example.com', org: 'Billing Co', plan }),
  });
  assert.equal(response.status, 201);
  return response.json();
}

test('usage route reports monthly plan usage and free limit returns 402', async () => {
  const server = await listen();
  try {
    const baseUrl = `http://127.0.0.1:${server.address().port}`;
    const key = await generateKey(baseUrl);

    const usage = await fetch(`${baseUrl}/api/usage`, {
      headers: { 'X-Api-Key': key.apiKey },
    });
    assert.equal(usage.status, 200);
    const usageBody = await usage.json();
    assert.equal(usageBody.apiKey, key.maskedKey);
    assert.equal(usageBody.org, 'Billing Co');
    assert.equal(usageBody.plan, 'free');
    assert.equal(usageBody.scansThisMonth, 0);
    assert.equal(usageBody.scansLimit, 1000);
    assert.equal(usageBody.percentUsed, 0);
    assert.match(usageBody.resetDate, /^\d{4}-\d{2}-\d{2}T/);

    writeJson('usageEvents.json', {
      [key.id]: Array.from({ length: 1000 }, () => Date.now()),
    });

    const blocked = await fetch(`${baseUrl}/api/scan/prompt`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': key.apiKey,
      },
      body: JSON.stringify({ prompt: 'Summarize AI for productivity' }),
    });
    assert.equal(blocked.status, 402);
    const blockedBody = await blocked.json();
    assert.equal(blockedBody.error, 'Scan limit reached. Upgrade to Team plan at llmxray.com/pricing');
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});
