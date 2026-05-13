// TrustGuard Service Worker (Background)
const BACKEND = 'http://localhost:3001';
const TIMEOUT_MS = 5000; // 5 second hard timeout

/** fetch with AbortController timeout */
function fetchWithTimeout(url, options, timeoutMs = TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal })
    .finally(() => clearTimeout(timer));
}

chrome.runtime.onInstalled.addListener(() => {
  console.log('[TrustGuard] Extension installed.');
  chrome.storage.local.set({ tg_user_id: 'employee@enterprise.com', tg_active: true });
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'GET_STATUS') {
    chrome.storage.local.get(['tg_active', 'tg_user_id'], (data) => {
      sendResponse({ active: data.tg_active !== false, userId: data.tg_user_id });
    });
    return true;
  }

  if (msg.type === 'SET_USER') {
    chrome.storage.local.set({ tg_user_id: msg.userId });
    sendResponse({ ok: true });
    return true;
  }

  if (msg.type === 'SCAN_PROMPT') {
    fetchWithTimeout(`${BACKEND}/api/extension/scan-prompt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(msg.payload),
    })
    .then(r => r.json())
    .then(data => sendResponse(data))
    .catch(err => {
      console.warn('[TrustGuard] Scan timed out or failed:', err.message);
      sendResponse({ error: err.message, timedOut: true });
    });
    return true;
  }

  if (msg.type === 'SCAN_FILE') {
    fetchWithTimeout(`${BACKEND}/api/extension/scan-file`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(msg.payload),
    })
    .then(r => r.json())
    .then(data => sendResponse(data))
    .catch(err => {
      console.warn('[TrustGuard] File scan timed out or failed:', err.message);
      sendResponse({ error: err.message, timedOut: true });
    });
    return true;
  }
});
