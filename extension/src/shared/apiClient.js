/**
 * apiClient.js
 * Sends scan requests via the background service worker (bypasses CORS).
 * Hard 6s timeout on every call — never hangs the UI.
 */

const MSG_TIMEOUT_MS = 6000; // 6 seconds max wait

/** Wrapper around chrome.runtime.sendMessage with a timeout. */
function sendMessageWithTimeout(msg) {
  return new Promise((resolve) => {
    let resolved = false;

    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        console.warn('[TrustGuard] Message timed out, releasing intercept.');
        resolve(null); // null = backend unreachable, allow through
      }
    }, MSG_TIMEOUT_MS);

    try {
      chrome.runtime.sendMessage(msg, (response) => {
        if (!resolved) {
          clearTimeout(timer);
          resolved = true;
          if (chrome.runtime.lastError) {
            console.warn('[TrustGuard] Runtime error:', chrome.runtime.lastError.message);
            resolve(null);
          } else {
            resolve(response);
          }
        }
      });
    } catch (e) {
      clearTimeout(timer);
      resolved = true;
      console.warn('[TrustGuard] sendMessage threw:', e.message);
      resolve(null);
    }
  });
}

async function scanPromptWithBackend(promptText, source = 'send_button') {
  const userId = await getUserId();
  const response = await sendMessageWithTimeout({
    type: 'SCAN_PROMPT',
    payload: {
      prompt: promptText,
      userId,
      department: 'General',
      site: location.hostname,
      context: { source, url: location.href },
    },
  });
  if (!response || response.error || response.timedOut) return null;
  return response;
}

async function scanFileWithBackend(fileObj) {
  const userId = await getUserId();
  const response = await sendMessageWithTimeout({
    type: 'SCAN_FILE',
    payload: {
      file: fileObj,
      userId,
      department: 'General',
      site: location.hostname,
    },
  });
  if (!response || response.error || response.timedOut) return null;
  return response;
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
