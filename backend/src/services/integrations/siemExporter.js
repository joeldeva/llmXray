async function exportAuditEvent(event) {
  const url = process.env.SIEM_WEBHOOK_URL;
  if (!url) return { enabled: false };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Number(process.env.SIEM_TIMEOUT_MS || 3000));

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify({
        source: 'llmxray',
        type: 'audit_event',
        event,
      }),
      signal: controller.signal,
    });

    return { enabled: true, ok: response.ok, status: response.status };
  } catch (error) {
    console.warn('[LlmXray] SIEM export failed:', error.message);
    return { enabled: true, ok: false, error: error.message };
  } finally {
    clearTimeout(timer);
  }
}

function buildHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  if (process.env.SIEM_WEBHOOK_TOKEN) {
    headers.Authorization = `Bearer ${process.env.SIEM_WEBHOOK_TOKEN}`;
  }
  return headers;
}

module.exports = { exportAuditEvent };
