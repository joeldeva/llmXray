/**
 * uiOverlay.js
 * Injects TrustGuard UI elements into ChatGPT.
 * - Protection badge
 * - Block/Warn/Review modals
 */

let tgBadge = null;
let tgModalOverlay = null;
let pendingResolve = null;

function injectBadge() {
  if (document.getElementById('tg-badge')) return;

  tgBadge = document.createElement('div');
  tgBadge.id = 'tg-badge';
  tgBadge.className = 'tg-badge tg-status-active';
  tgBadge.innerHTML = `
    <span class="tg-badge-dot"></span>
    <span class="tg-badge-text">Protected by TrustGuard</span>
  `;
  document.body.appendChild(tgBadge);
}

function setBadgeStatus(status) {
  if (!tgBadge) return;
  tgBadge.className = 'tg-badge';
  if (status === 'scanning') tgBadge.classList.add('tg-status-scanning');
  else if (status === 'blocked') tgBadge.classList.add('tg-status-blocked');
  else if (status === 'warning') tgBadge.classList.add('tg-status-warning');
  else if (status === 'error') tgBadge.classList.add('tg-status-error');
  else tgBadge.classList.add('tg-status-active');

  const labels = { active: 'Protected by TrustGuard', scanning: 'TrustGuard: Scanning...', blocked: 'TrustGuard: Blocked', warning: 'TrustGuard: Warning', error: 'TrustGuard: Error' };
  const textEl = tgBadge.querySelector('.tg-badge-text');
  if (textEl) textEl.textContent = labels[status] || 'TrustGuard';
}

function createModalOverlay() {
  if (document.getElementById('tg-modal-overlay')) return;
  tgModalOverlay = document.createElement('div');
  tgModalOverlay.id = 'tg-modal-overlay';
  tgModalOverlay.innerHTML = `<div id="tg-modal"></div>`;
  document.body.appendChild(tgModalOverlay);
}

function showBlockModal(scanResult) {
  return new Promise(resolve => {
    createModalOverlay();
    pendingResolve = resolve;
    const modal = document.getElementById('tg-modal');
    modal.innerHTML = `
      <div class="tg-modal-header tg-modal-block">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
        <h2>TrustGuard blocked this request</h2>
      </div>
      <div class="tg-modal-body">
        <div class="tg-risk-score tg-risk-critical">Risk Score: ${scanResult.riskScore}/100 — ${scanResult.riskLevel}</div>
        <div class="tg-policy-hit">Policy: ${(scanResult.policyHits || []).join(', ') || 'Policy Violation'}</div>
        <p class="tg-modal-message">${scanResult.message || 'This prompt violates your company security policy.'}</p>
        <p class="tg-modal-tip">⚠️ Do not paste API keys, credentials, passwords, or confidential data into ChatGPT.</p>
      </div>
      <div class="tg-modal-footer">
        <button class="tg-btn tg-btn-close" id="tg-block-dismiss">Dismiss</button>
      </div>
    `;
    tgModalOverlay.style.display = 'flex';
    
    document.getElementById('tg-block-dismiss').onclick = () => {
      tgModalOverlay.style.display = 'none';
      resolve('BLOCK');
    };
  });
}

function showWarnModal(scanResult) {
  return new Promise(resolve => {
    createModalOverlay();
    pendingResolve = resolve;
    const modal = document.getElementById('tg-modal');
    modal.innerHTML = `
      <div class="tg-modal-header tg-modal-warn">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        <h2>Sensitive information may be included</h2>
      </div>
      <div class="tg-modal-body">
        <div class="tg-risk-score tg-risk-high">Risk Score: ${scanResult.riskScore}/100 — ${scanResult.riskLevel}</div>
        <div class="tg-policy-hit">Policy: ${(scanResult.policyHits || []).join(', ')}</div>
        <p class="tg-modal-message">${scanResult.message}</p>
      </div>
      <div class="tg-modal-footer">
        <button class="tg-btn tg-btn-secondary" id="tg-warn-cancel">Cancel</button>
        <button class="tg-btn tg-btn-warn" id="tg-warn-continue">I understand, send anyway</button>
      </div>
    `;
    tgModalOverlay.style.display = 'flex';

    document.getElementById('tg-warn-cancel').onclick = () => {
      tgModalOverlay.style.display = 'none';
      resolve('CANCEL');
    };
    document.getElementById('tg-warn-continue').onclick = () => {
      tgModalOverlay.style.display = 'none';
      resolve('CONTINUE');
    };
  });
}

function showReviewModal(scanResult) {
  return new Promise(resolve => {
    createModalOverlay();
    const modal = document.getElementById('tg-modal');
    modal.innerHTML = `
      <div class="tg-modal-header tg-modal-review">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        <h2>Request sent for human review</h2>
      </div>
      <div class="tg-modal-body">
        <p class="tg-modal-message">${scanResult.message}</p>
        <div class="tg-event-id">Event ID: ${scanResult.eventId || 'N/A'}</div>
        <p style="font-size:0.85rem;color:#94a3b8;margin-top:0.5rem;">A security administrator will review this request. You will be notified of the outcome.</p>
      </div>
      <div class="tg-modal-footer">
        <button class="tg-btn tg-btn-close" id="tg-review-dismiss">OK</button>
      </div>
    `;
    tgModalOverlay.style.display = 'flex';
    
    document.getElementById('tg-review-dismiss').onclick = () => {
      tgModalOverlay.style.display = 'none';
      resolve('REVIEW');
    };
  });
}
