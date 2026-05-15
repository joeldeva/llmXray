const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

process.env.NODE_ENV = 'test';
process.env.LLMXRAY_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'llmxray-cors-'));

const { app } = require('../src/server');

function listen() {
  return new Promise(resolve => {
    const server = app.listen(0, () => resolve(server));
  });
}

test('CORS defaults to open API testing mode', async () => {
  const originalOrigins = process.env.ALLOWED_ORIGINS;
  delete process.env.ALLOWED_ORIGINS;
  const server = await listen();
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/scan/prompt`, {
      method: 'OPTIONS',
      headers: {
        Origin: 'https://example.test',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'content-type,x-api-key',
      },
    });

    assert.equal(response.status, 204);
    assert.equal(response.headers.get('access-control-allow-origin'), '*');
    assert.match(response.headers.get('access-control-allow-headers') || '', /X-Api-Key/i);
  } finally {
    if (originalOrigins === undefined) delete process.env.ALLOWED_ORIGINS;
    else process.env.ALLOWED_ORIGINS = originalOrigins;
    await new Promise(resolve => server.close(resolve));
  }
});

test('API-key preflight is allowed when origins are restricted', async () => {
  const originalOrigins = process.env.ALLOWED_ORIGINS;
  process.env.ALLOWED_ORIGINS = 'https://trusted.example';
  const server = await listen();
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/scan/prompt`, {
      method: 'OPTIONS',
      headers: {
        Origin: 'https://unlisted.example',
        'X-Api-Key': 'present-on-preflight-test',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'content-type,x-api-key',
      },
    });

    assert.equal(response.status, 204);
    assert.equal(response.headers.get('access-control-allow-origin'), 'https://unlisted.example');
  } finally {
    if (originalOrigins === undefined) delete process.env.ALLOWED_ORIGINS;
    else process.env.ALLOWED_ORIGINS = originalOrigins;
    await new Promise(resolve => server.close(resolve));
  }
});
