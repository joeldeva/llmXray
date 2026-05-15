const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

process.env.NODE_ENV = 'test';
process.env.LLMXRAY_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'llmxray-audit-routes-'));
process.env.LLMXRAY_MASTER_API_KEY = 'audit-route-test-key';

const { app } = require('../src/server');

function listen() {
  return new Promise(resolve => {
    const server = app.listen(0, () => resolve(server));
  });
}

async function scan(baseUrl, prompt) {
  return fetch(`${baseUrl}/api/scan/prompt`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': 'audit-route-test-key',
      'X-LlmXray-Subject-Id': 'audit-user@example.com',
    },
    body: JSON.stringify({ prompt, userId: 'audit-user@example.com', site: 'audit-test' }),
  });
}

test('audit logs are paginated, filtered, and stats summarize scans', async () => {
  const server = await listen();
  try {
    const baseUrl = `http://127.0.0.1:${server.address().port}`;
    const safe = await scan(baseUrl, 'Summarize AI for productivity');
    assert.equal(safe.status, 200);
    const blocked = await scan(baseUrl, `Here is my key ${['sk-', '1234567890', 'abcdefghij'].join('')}`);
    assert.equal(blocked.status, 200);

    const logs = await fetch(`${baseUrl}/api/audit/logs?page=1&limit=1&decision=BLOCK`, {
      headers: { 'X-Api-Key': 'audit-route-test-key' },
    });
    assert.equal(logs.status, 200);
    const logsBody = await logs.json();
    assert.equal(logsBody.events.length, 1);
    assert.equal(logsBody.events[0].decision, 'BLOCK');
    assert.equal(logsBody.events[0].eventType, 'PROMPT_SCAN');
    assert.ok(Array.isArray(logsBody.events[0].findings));
    assert.equal(logsBody.events[0].prompt, undefined);
    assert.equal(logsBody.pagination.total, 1);

    const stats = await fetch(`${baseUrl}/api/audit/stats`, {
      headers: { 'X-Api-Key': 'audit-route-test-key' },
    });
    assert.equal(stats.status, 200);
    const statsBody = await stats.json();
    assert.equal(statsBody.totalScans, 2);
    assert.equal(statsBody.totalBlocked, 1);
    assert.equal(statsBody.totalAllowed, 1);
    assert.ok(Array.isArray(statsBody.topPolicyHits));
    assert.equal(statsBody.riskTrend.length, 7);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});
