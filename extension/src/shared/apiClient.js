/**
 * apiClient.js
 * Sends scan requests to TrustGuard backend.
 * Returns a structured response including decision, riskScore, policyHits, message.
 */

async function scanPromptWithBackend(promptText, source = 'send_button') {
  const userId = await getUserId();
  return new Promise(resolve => {
    chrome.runtime.sendMessage({
      type: 'SCAN_PROMPT',
      payload: { prompt: promptText, userId, department: 'General', site: location.hostname, context: { source, url: location.href } }
    }, response => {
      if (!response || response.error) {
        console.error('[TrustGuard] Backend scan failed:', response?.error);
        resolve(null);
      } else {
        resolve(response);
      }
    });
  });
}

async function scanFileWithBackend(fileObj) {
  const userId = await getUserId();
  return new Promise(resolve => {
    chrome.runtime.sendMessage({
      type: 'SCAN_FILE',
      payload: { file: fileObj, userId, department: 'General', site: location.hostname }
    }, response => {
      if (!response || response.error) {
        console.error('[TrustGuard] File scan backend failed:', response?.error);
        resolve(null);
      } else {
        resolve(response);
      }
    });
  });
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
