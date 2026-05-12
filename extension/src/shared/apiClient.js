/**
 * apiClient.js
 * Sends scan requests to TrustGuard backend.
 * Returns a structured response including decision, riskScore, policyHits, message.
 */

async function scanPromptWithBackend(promptText, source = 'send_button') {
  const userId = await getUserId();
  try {
    const response = await fetch(`${TRUSTGUARD_CONFIG.BACKEND_URL}/api/extension/scan-prompt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: promptText,
        userId,
        department: 'General',
        site: location.hostname,
        context: { source, url: location.href },
      }),
    });
    if (!response.ok) throw new Error(`Backend HTTP ${response.status}`);
    return await response.json();
  } catch (err) {
    console.error('[TrustGuard] Backend scan failed:', err.message);
    return null; // null means backend unreachable — do not block, but log
  }
}

async function scanFileWithBackend(fileObj) {
  const userId = await getUserId();
  try {
    const response = await fetch(`${TRUSTGUARD_CONFIG.BACKEND_URL}/api/extension/scan-file`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        file: fileObj,
        userId,
        department: 'General',
        site: location.hostname,
      }),
    });
    if (!response.ok) throw new Error(`Backend HTTP ${response.status}`);
    return await response.json();
  } catch (err) {
    console.error('[TrustGuard] File scan backend failed:', err.message);
    return null;
  }
}

async function getUserId() {
  return new Promise(resolve => {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get(['tg_user_id'], r => resolve(r.tg_user_id || 'employee@enterprise.com'));
    } else {
      resolve('employee@enterprise.com');
    }
  });
}
