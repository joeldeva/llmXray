/**
 * promptMonitor.js
 * Monitors the ChatGPT composer for prompt text.
 * - Runs local scan on paste events
 * - Intercepts send button clicks and Enter keydowns
 * - Calls backend deep scan before allowing send
 */

let composerEl = null;
let sendBtnEl = null;
let isScanning = false;

async function handleSubmit(source) {
  if (isScanning) return;
  composerEl = findComposer();
  if (!composerEl) return;

  const text = getComposerText(composerEl);
  if (!text || text.trim().length < TRUSTGUARD_CONFIG.MIN_SCAN_LENGTH) return;

  // Step 1: Local quick scan
  const localHits = localScan(text);
  if (localHits.length > 0) {
    setBadgeStatus('blocked');
    await showBlockModal({
      riskScore: 99,
      riskLevel: 'CRITICAL',
      policyHits: localHits.map(h => h.id),
      message: `Local scan detected: ${localHits.map(h => h.label).join(', ')}. This prompt has been blocked.`,
    });
    setBadgeStatus('active');
    return; // Block - prevent send
  }

  // Step 2: Backend deep scan
  isScanning = true;
  setBadgeStatus('scanning');

  const result = await scanPromptWithBackend(text, source);
  isScanning = false;

  if (!result) {
    // Backend unreachable - allow but log locally
    setBadgeStatus('error');
    setTimeout(() => setBadgeStatus('active'), 3000);
    return;
  }

  const { decision } = result;

  if (decision === 'ALLOW') {
    setBadgeStatus('active');
    return; // Allow send to proceed
  }

  if (decision === 'WARN') {
    setBadgeStatus('warning');
    const userChoice = await showWarnModal(result);
    setBadgeStatus('active');
    if (userChoice === 'CONTINUE') return; // Let send proceed
    return; // Cancelled
  }

  if (decision === 'MASK') {
    setBadgeStatus('warning');
    if (result.maskedPrompt) {
      if (composerEl.value !== undefined) {
        composerEl.value = result.maskedPrompt;
      } else {
        composerEl.innerText = result.maskedPrompt;
      }
    }
    setBadgeStatus('active');
    return; // Allow masked send
  }

  if (decision === 'BLOCK' || decision === 'QUARANTINE') {
    setBadgeStatus('blocked');
    await showBlockModal(result);
    setBadgeStatus('active');
    return; // Blocked
  }

  if (decision === 'HUMAN_REVIEW') {
    setBadgeStatus('warning');
    await showReviewModal(result);
    setBadgeStatus('active');
    return; // Blocked pending review
  }
}

function attachPromptMonitor() {
  composerEl = findComposer();

  if (!composerEl) {
    console.warn('[TrustGuard] Composer not found. Will retry.');
    return false;
  }

  // Paste event - local scan only on paste
  composerEl.addEventListener('paste', async (e) => {
    setTimeout(async () => {
      const text = getComposerText(composerEl);
      const localHits = localScan(text);
      if (localHits.length > 0) {
        setBadgeStatus('warning');
      } else {
        setBadgeStatus('active');
      }
    }, 100);
  });

  // Keydown: intercept Enter to scan before send
  composerEl.addEventListener('keydown', async (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      e.stopImmediatePropagation();
      await handleSubmit('enter_key');
    }
  }, true);

  return true;
}

function attachSendButtonMonitor() {
  // Use event delegation on document since send button may re-render
  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-testid="send-button"], button[aria-label="Send prompt"], button[aria-label="Send message"]');
    if (btn) {
      e.preventDefault();
      e.stopImmediatePropagation();
      await handleSubmit('send_button');
    }
  }, true);
}
