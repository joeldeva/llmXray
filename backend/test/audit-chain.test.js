const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

process.env.NODE_ENV = 'test';
delete process.env.DATABASE_URL;

const { logEvent, verifyAuditChain } = require('../src/services/audit/auditLogger');

function sampleEvent(decision = 'ALLOW') {
  return {
    site: 'ai-app.example',
    userId: 'chain-test@company.com',
    department: 'Security',
    eventType: 'PROMPT_SCAN',
    riskScore: 0,
    riskLevel: 'LOW',
    decision,
    policyHits: [],
    evidence: null,
    url: 'https://ai-app.example',
    status: 'allowed',
  };
}

test('audit hash chain verifies for generated events', async () => {
  const originalDataDir = process.env.LLMXRAY_DATA_DIR;
  process.env.LLMXRAY_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'llmxray-audit-'));

  try {
    await logEvent(sampleEvent('ALLOW'));
    await logEvent(sampleEvent('WARN'));

    const result = await verifyAuditChain();
    assert.equal(result.valid, true);
    assert.equal(result.checked, 2);
    assert.deepEqual(result.errors, []);
    assert.ok(result.headHash);
  } finally {
    if (originalDataDir === undefined) delete process.env.LLMXRAY_DATA_DIR;
    else process.env.LLMXRAY_DATA_DIR = originalDataDir;
  }
});
