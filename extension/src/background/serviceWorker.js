// TrustGuard Service Worker (Background)
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
    fetch('http://localhost:3001/api/extension/scan-prompt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(msg.payload)
    })
    .then(r => r.json())
    .then(data => sendResponse(data))
    .catch(err => sendResponse({ error: err.message }));
    return true;
  }
  if (msg.type === 'SCAN_FILE') {
    fetch('http://localhost:3001/api/extension/scan-file', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(msg.payload)
    })
    .then(r => r.json())
    .then(data => sendResponse(data))
    .catch(err => sendResponse({ error: err.message }));
    return true;
  }
});
