const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

process.env.NODE_ENV = 'test';
process.env.LLMXRAY_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'llmxray-keys-'));
process.env.LLMXRAY_MASTER_API_KEY = 'master-test-key';

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

test('API key lifecycle and scan authentication', async () => {
  const server = await listen();
  try {
    const baseUrl = `http://127.0.0.1:${server.address().port}`;

    const missingKey = await fetch(`${baseUrl}/api/scan/prompt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'safe prompt' }),
    });
    assert.equal(missingKey.status, 401);

    const generated = await fetch(`${baseUrl}/api/keys/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': 'master-test-key',
      },
      body: JSON.stringify({ email: 'api@example.com', org: 'Acme', plan: 'team' }),
    });
    assert.equal(generated.status, 201);
    const generatedBody = await generated.json();
    assert.match(generatedBody.apiKey, /^llmxray_live_[a-f0-9]{32}$/);
    assert.equal(generatedBody.email, 'api@example.com');
    assert.equal(generatedBody.org, 'Acme');
    assert.equal(generatedBody.plan, 'team');

    const scan = await fetch(`${baseUrl}/api/scan/prompt`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': generatedBody.apiKey,
      },
      body: JSON.stringify({ prompt: 'Summarize AI for productivity' }),
    });
    assert.equal(scan.status, 200);

    const listed = await fetch(`${baseUrl}/api/keys/list`, {
      headers: { 'X-Api-Key': 'master-test-key' },
    });
    assert.equal(listed.status, 200);
    const listedBody = await listed.json();
    assert.equal(listedBody.keys.length, 1);
    assert.equal(listedBody.keys[0].apiKey, undefined);
    assert.equal(listedBody.keys[0].maskedKey.includes('...'), true);

    const revoked = await fetch(`${baseUrl}/api/keys/${generatedBody.id}`, {
      method: 'DELETE',
      headers: { 'X-Api-Key': 'master-test-key' },
    });
    assert.equal(revoked.status, 200);

    const revokedScan = await fetch(`${baseUrl}/api/scan/prompt`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': generatedBody.apiKey,
      },
      body: JSON.stringify({ prompt: 'safe prompt' }),
    });
    assert.equal(revokedScan.status, 401);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});
