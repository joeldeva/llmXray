const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

process.env.NODE_ENV = 'test';
process.env.LLMXRAY_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'llmxray-usage-'));
process.env.LLMXRAY_MASTER_API_KEY = 'usage-test-key';
process.env.LLMXRAY_RATE_LIMIT_PER_MINUTE = '2';
process.env.LLMXRAY_RATE_LIMIT_PER_DAY = '10';

const auditPath = require.resolve('../src/services/audit/auditLogger');
require.cache[auditPath] = {
  id: auditPath,
  filename: auditPath,
  loaded: true,
  exports: {
    logEvent: () => 'evt_test_no_write',
    loadLogs: () => [],
    getStats: () => ({
      total: 0,
      blocked: 0,
      warned: 0,
      humanReview: 0,
      quarantined: 0,
      critical: 0,
      fileScans: 0,
      topPolicyHits: [],
    }),
  },
};

const { app } = require('../src/server');

function listen() {
  return new Promise(resolve => {
    const server = app.listen(0, () => resolve(server));
  });
}

async function scan(baseUrl) {
  return fetch(`${baseUrl}/api/scan/prompt`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': 'usage-test-key',
    },
    body: JSON.stringify({ prompt: 'Summarize AI for productivity' }),
  });
}

test('scan responses include usage and enforce per-minute limits', async () => {
  const server = await listen();
  try {
    const baseUrl = `http://127.0.0.1:${server.address().port}`;
    const first = await scan(baseUrl);
    assert.equal(first.status, 200);
    const firstBody = await first.json();
    assert.deepEqual(firstBody.usage, {
      requestsThisMinute: 1,
      requestsToday: 1,
      dailyLimit: 10,
    });

    const second = await scan(baseUrl);
    assert.equal(second.status, 200);

    const third = await scan(baseUrl);
    assert.equal(third.status, 429);
    assert.ok(Number(third.headers.get('retry-after')) >= 1);
    const thirdBody = await third.json();
    assert.equal(thirdBody.error, 'Too Many Requests');
    assert.equal(thirdBody.usage.requestsThisMinute, 2);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});
