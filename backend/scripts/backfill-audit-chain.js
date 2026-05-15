require('dotenv').config();

const { backfillAuditChain, verifyAuditChain } = require('../src/services/audit/auditLogger');

async function run() {
  const before = await verifyAuditChain();
  const result = await backfillAuditChain();
  const after = await verifyAuditChain();

  console.log(JSON.stringify({
    before,
    backfill: result,
    after,
  }, null, 2));

  if (!after.valid) process.exitCode = 1;
}

run().catch(error => {
  console.error('[LlmXray] Audit backfill failed:', error.message);
  process.exit(1);
});
