require('dotenv').config();

const { hasPostgres, query } = require('../src/services/storage/postgres');

async function run() {
  const days = Number(process.env.AUDIT_RETENTION_DAYS || 365);
  if (!hasPostgres()) {
    console.log('[LlmXray] Retention job skipped: DATABASE_URL is not configured.');
    return;
  }

  const result = await query(
    "DELETE FROM audit_logs WHERE timestamp < NOW() - ($1::int * INTERVAL '1 day')",
    [days]
  );
  console.log(`[LlmXray] Retention deleted ${result.rowCount} audit rows older than ${days} days.`);
}

run().catch(error => {
  console.error('[LlmXray] Retention job failed:', error.message);
  process.exit(1);
});
