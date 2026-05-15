const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

process.env.NODE_ENV = 'test';
process.env.LLMXRAY_MASTER_API_KEY = 'scan-route-test-key';
process.env.LLMXRAY_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'llmxray-route-'));

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

const API_HEADERS = {
  'Content-Type': 'application/json',
  'X-Api-Key': 'scan-route-test-key',
  'X-LlmXray-Tenant-Id': 'test-tenant',
  'X-LlmXray-Client-Id': 'api-client',
  'X-LlmXray-Subject-Id': 'test@company.com',
};

function listen() {
  return new Promise(resolve => {
    const server = app.listen(0, () => resolve(server));
  });
}

test('POST /api/scan/prompt returns a block decision for secrets', async () => {
  const server = await listen();
  try {
    const port = server.address().port;
    const response = await fetch(`http://127.0.0.1:${port}/api/scan/prompt`, {
      method: 'POST',
      headers: API_HEADERS,
      body: JSON.stringify({
        prompt: `Here is my database key: ${['sk-', '1234567890', 'abcdefghij'].join('')}`,
        userId: 'test@company.com',
        department: 'Engineering',
        site: 'api-client',
      }),
    });

    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.decision, 'BLOCK');
    assert.equal(body.riskLevel, 'CRITICAL');
    assert.deepEqual(body.policyHits, ['POL_SECRET_BLOCK']);
    assert.equal(body.findings[0].category, 'secrets');
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});

test('POST /api/scan/prompt validates prompt input', async () => {
  const server = await listen();
  try {
    const port = server.address().port;
    const response = await fetch(`http://127.0.0.1:${port}/api/scan/prompt`, {
      method: 'POST',
      headers: API_HEADERS,
      body: JSON.stringify({ userId: 'test@company.com' }),
    });

    assert.equal(response.status, 400);
    const body = await response.json();
    assert.equal(body.error, 'validation failed');
    assert.ok(body.details.includes('prompt must be a string'));
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});

test('POST /api/scan/prompt supports simple curl without identity headers', async () => {
  const server = await listen();
  try {
    const port = server.address().port;
    const response = await fetch(`http://127.0.0.1:${port}/api/scan/prompt`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': 'scan-route-test-key',
      },
      body: JSON.stringify({
        prompt: 'Summarize the benefits of AI for productivity',
        userId: 'test@company.com',
        site: 'api-client',
      }),
    });

    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.decision, 'ALLOW');
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});

test('POST /api/scan/file scans multipart text uploads', async () => {
  const server = await listen();
  try {
    const port = server.address().port;
    const form = new FormData();
    form.append('file', new Blob([`Here is my key ${['sk-', '1234567890', 'abcdefghij'].join('')}`], { type: 'text/plain' }), 'notes.txt');
    form.append('userId', 'test@company.com');
    form.append('site', 'api-client');

    const response = await fetch(`http://127.0.0.1:${port}/api/scan/file`, {
      method: 'POST',
      headers: { 'X-Api-Key': 'scan-route-test-key' },
      body: form,
    });

    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.decision, 'BLOCK');
    assert.equal(body.riskLevel, 'CRITICAL');
    assert.equal(body.fileMeta.name, 'notes.txt');
    assert.equal(body.findings[0].label, 'OpenAI API Key');
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});

test('POST /api/scan/file blocks dangerous file types without scanning', async () => {
  const server = await listen();
  try {
    const port = server.address().port;
    const form = new FormData();
    form.append('file', new Blob(['SECRET=value'], { type: 'text/plain' }), '.env');

    const response = await fetch(`http://127.0.0.1:${port}/api/scan/file`, {
      method: 'POST',
      headers: { 'X-Api-Key': 'scan-route-test-key' },
      body: form,
    });

    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.decision, 'BLOCK');
    assert.equal(body.riskScore, 100);
    assert.equal(body.findings[0].label, 'Dangerous file type');
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});
