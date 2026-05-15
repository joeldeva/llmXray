const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { hashPassword } = require('../src/services/auth/authService');

process.env.NODE_ENV = 'test';
process.env.LLMXRAY_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'llmxray-auth-'));

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
  'X-LlmXray-Tenant-Id': 'test-tenant',
  'X-LlmXray-Client-Id': 'test-client-auth',
  'X-LlmXray-Subject-Id': 'test@company.com',
  'X-LlmXray-Client-Version': '1.0.0',
};

function listen() {
  return new Promise(resolve => {
    const server = app.listen(0, () => resolve(server));
  });
}

test('admin login returns a bearer token for valid credentials', async () => {
  const server = await listen();
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@llmxray.local',
        password: 'ChangeMe123!',
      }),
    });

    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.user.email, 'admin@llmxray.local');
    assert.equal(body.user.role, 'admin');
    assert.match(body.token, /^[^.]+\.[^.]+\.[^.]+$/);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});

test('admin routes reject missing bearer token', async () => {
  const server = await listen();
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/audit/stats`);
    assert.equal(response.status, 401);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});

test('master API key is enforced when configured', async () => {
  process.env.LLMXRAY_MASTER_API_KEY = 'test-api-token';
  const server = await listen();
  try {
    const port = server.address().port;
    const unauthorized = await fetch(`http://127.0.0.1:${port}/api/scan/prompt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'normal prompt for testing auth' }),
    });
    assert.equal(unauthorized.status, 401);

    const authorized = await fetch(`http://127.0.0.1:${port}/api/scan/prompt`, {
      method: 'POST',
      headers: {
        ...API_HEADERS,
        'X-Api-Key': 'test-api-token',
      },
      body: JSON.stringify({ prompt: 'normal prompt for testing auth' }),
    });
    assert.equal(authorized.status, 200);
  } finally {
    delete process.env.LLMXRAY_MASTER_API_KEY;
    await new Promise(resolve => server.close(resolve));
  }
});

test('X-Api-Key is accepted as master API key alias', async () => {
  process.env.LLMXRAY_MASTER_API_KEY = 'test-api-token';
  const server = await listen();
  try {
    const port = server.address().port;
    const response = await fetch(`http://127.0.0.1:${port}/api/scan/prompt`, {
      method: 'POST',
      headers: {
        ...API_HEADERS,
        'X-Api-Key': 'test-api-token',
      },
      body: JSON.stringify({ prompt: 'normal prompt for testing x api key auth' }),
    });

    assert.equal(response.status, 200);
  } finally {
    delete process.env.LLMXRAY_MASTER_API_KEY;
    await new Promise(resolve => server.close(resolve));
  }
});

test('reviewer role can read review queue but cannot change policies', async () => {
  const originalUsers = process.env.ADMIN_USERS_JSON;
  process.env.ADMIN_USERS_JSON = JSON.stringify([
    {
      email: 'reviewer@llmxray.local',
      passwordHash: hashPassword('Reviewer123!'),
      role: 'reviewer',
    },
  ]);

  const server = await listen();
  try {
    const port = server.address().port;
    const login = await fetch(`http://127.0.0.1:${port}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'reviewer@llmxray.local',
        password: 'Reviewer123!',
      }),
    });
    assert.equal(login.status, 200);
    const session = await login.json();

    const review = await fetch(`http://127.0.0.1:${port}/api/review`, {
      headers: { Authorization: `Bearer ${session.token}` },
    });
    assert.equal(review.status, 200);

    const policyChange = await fetch(`http://127.0.0.1:${port}/api/policies/POL_SECRET_BLOCK`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${session.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ enabled: false }),
    });
    assert.equal(policyChange.status, 403);
  } finally {
    if (originalUsers === undefined) delete process.env.ADMIN_USERS_JSON;
    else process.env.ADMIN_USERS_JSON = originalUsers;
    await new Promise(resolve => server.close(resolve));
  }
});

test('admin can list clients created by API requests', async () => {
  process.env.LLMXRAY_MASTER_API_KEY = 'inventory-test-key';
  const server = await listen();
  try {
    const port = server.address().port;
    const scan = await fetch(`http://127.0.0.1:${port}/api/scan/prompt`, {
      method: 'POST',
      headers: {
        ...API_HEADERS,
        'X-Api-Key': 'inventory-test-key',
        'X-LlmXray-Client-Id': 'inventory-client',
      },
      body: JSON.stringify({ prompt: 'normal prompt for device inventory', userId: 'inventory@company.com' }),
    });
    assert.equal(scan.status, 200);

    const login = await fetch(`http://127.0.0.1:${port}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@llmxray.local',
        password: 'ChangeMe123!',
      }),
    });
    const session = await login.json();

    const devices = await fetch(`http://127.0.0.1:${port}/api/devices`, {
      headers: { Authorization: `Bearer ${session.token}` },
    });
    assert.equal(devices.status, 200);
    const body = await devices.json();
    assert.ok(body.some(device => device.deviceId === 'inventory-client' && device.status === 'ACTIVE'));
  } finally {
    delete process.env.LLMXRAY_MASTER_API_KEY;
    await new Promise(resolve => server.close(resolve));
  }
});
