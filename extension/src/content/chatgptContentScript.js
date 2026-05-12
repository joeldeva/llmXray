/**
 * chatgptContentScript.js
 * Main entry point for the TrustGuard content script.
 * Orchestrates all monitors and injects the badge.
 */

(function () {
  'use strict';

  // Only activate on ChatGPT domains
  const host = location.hostname;
  if (!TRUSTGUARD_CONFIG.PROTECTED_DOMAINS.some(d => host.endsWith(d))) return;

  console.log('[TrustGuard] Content script loaded on', host);

  // Inject the protection badge
  injectBadge();

  // Attach file monitor (document-level event delegation, safe to attach immediately)
  attachFileMonitor();

  // Attach send button monitor (document-level delegation)
  attachSendButtonMonitor();

  // Attempt to attach prompt monitor. Retry if composer not found yet.
  let attempts = 0;
  const maxAttempts = 20;
  const retryInterval = 1000;

  function tryAttachPromptMonitor() {
    const success = attachPromptMonitor();
    if (!success && attempts < maxAttempts) {
      attempts++;
      setTimeout(tryAttachPromptMonitor, retryInterval);
    } else if (!success) {
      console.warn('[TrustGuard] Could not find ChatGPT composer after multiple attempts.');
      setBadgeStatus('error');
    }
  }

  tryAttachPromptMonitor();

  // Re-attach on URL change (SPA navigation)
  let lastUrl = location.href;
  const observer = new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      attempts = 0;
      setTimeout(tryAttachPromptMonitor, 1500);
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
})();
