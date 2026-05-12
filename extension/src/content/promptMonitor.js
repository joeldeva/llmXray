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
    // Programmatically submit since we prevented it
    const sendBtn = findSendButton();
    if (sendBtn) sendBtn.click();
    return;
  }

  const { decision } = result;

  if (decision === 'ALLOW') {
    setBadgeStatus('active');
    // Programmatically submit
    const sendBtn = findSendButton();
    if (sendBtn) sendBtn.click();
    return; // Allow send to proceed
  }

  if (decision === 'WARN') {
    setBadgeStatus('warning');
    const userChoice = await showWarnModal(result);
    setBadgeStatus('active');
    if (userChoice === 'CONTINUE') {
      const sendBtn = findSendButton();
      if (sendBtn) sendBtn.click();
    }
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
    const sendBtn = findSendButton();
    if (sendBtn) sendBtn.click();
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
  // Use document delegation to catch it early
  document.addEventListener('paste', async (e) => {
    const isComposer = e.target.closest('#prompt-textarea') || e.target.closest('div[contenteditable="true"]');
    if (!isComposer) return;
    
    setTimeout(async () => {
      composerEl = isComposer;
      const text = getComposerText(composerEl);
      const localHits = localScan(text);
      if (localHits.length > 0) setBadgeStatus('warning');
      else setBadgeStatus('active');
    }, 100);
  }, true);

  // Keydown: intercept Enter to scan before send
  document.addEventListener('keydown', async (e) => {
    if (e.key === 'Enter' && !e.shiftKey && e.isTrusted) {
      const isComposer = e.target.closest('#prompt-textarea') || e.target.closest('div[contenteditable="true"]');
      if (isComposer) {
        e.preventDefault();
        e.stopImmediatePropagation();
        await handleSubmit('enter_key');
      }
    }
  }, true);

  return true;
}

function attachSendButtonMonitor() {
  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-testid="send-button"], button[aria-label="Send prompt"], button[aria-label="Send message"]');
    if (btn && e.isTrusted) { // ONLY intercept real user clicks
      e.preventDefault();
      e.stopImmediatePropagation();
      await handleSubmit('send_button');
    }
  }, true);
}
