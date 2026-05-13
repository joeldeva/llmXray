/**
 * uiOverlay.js
 * Injects TrustGuard UI into ChatGPT.
 * - Animated protection badge
 * - Block / Warn / Review modals — with full findings list
 */

let tgBadge = null;
let tgModalOverlay = null;

// ── Badge ─────────────────────────────────────────────────────────────────────
function injectBadge() {
  if (document.getElementById('tg-badge')) return;
  tgBadge = document.createElement('div');
  tgBadge.id = 'tg-badge';
  tgBadge.className = 'tg-badge tg-status-active';
  tgBadge.innerHTML = `<span class="tg-badge-dot"></span><span class="tg-badge-text">Protected by TrustGuard</span>`;
  document.body.appendChild(tgBadge);
}

function setBadgeStatus(status) {
  if (!tgBadge) injectBadge();
  tgBadge.className = 'tg-badge';
  const statusMap = { active: 'tg-status-active', scanning: 'tg-status-scanning', blocked: 'tg-status-blocked', warning: 'tg-status-warning', error: 'tg-status-error' };
  tgBadge.classList.add(statusMap[status] || 'tg-status-active');
  const labels = { active: 'Protected by TrustGuard', scanning: 'TrustGuard: Scanning...', blocked: 'TrustGuard: Blocked', warning: 'TrustGuard: Warning', error: 'TrustGuard: Offline' };
  const el = tgBadge.querySelector('.tg-badge-text');
  if (el) el.textContent = labels[status] || 'TrustGuard';
}

// ── Modal overlay ────────────────────────────────────────────────────────────
function getOrCreateOverlay() {
  let overlay = document.getElementById('tg-modal-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'tg-modal-overlay';
    overlay.innerHTML = `<div id="tg-modal"></div>`;
    document.body.appendChild(overlay);
  }
  tgModalOverlay = overlay;
  return overlay;
}

function closeModal() {
  const overlay = document.getElementById('tg-modal-overlay');
  if (overlay) overlay.style.display = 'none';
}

// ── Build findings list HTML ──────────────────────────────────────────────────
function buildFindingsList(findings) {
  if (!findings || !findings.length) return '';
  const items = findings.map(f => {
    const val = f.value ? `<code class="tg-finding-val">${escapeHtml(f.value)}</code>` : '';
    return `<li class="tg-finding-item"><span class="tg-finding-dot"></span><span class="tg-finding-label">${escapeHtml(f.label)}</span>${val}</li>`;
  }).join('');
  return `<ul class="tg-findings-list">${items}</ul>`;
}

function escapeHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function riskBadgeHtml(riskScore, riskLevel) {
  const cls = riskScore >= 80 ? 'tg-risk-critical' : riskScore >= 50 ? 'tg-risk-high' : 'tg-risk-medium';
  return `<span class="tg-risk-score ${cls}">Risk: ${riskScore}/100 — ${riskLevel || 'HIGH'}</span>`;
}

// ── BLOCK Modal ───────────────────────────────────────────────────────────────
function showBlockModal(scanResult) {
  return new Promise(resolve => {
    const overlay = getOrCreateOverlay();
    const modal = document.getElementById('tg-modal');
    const findings = scanResult.findings || [];

    modal.innerHTML = `
      <div class="tg-modal-header tg-modal-block">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
        <h2>TrustGuard blocked this request</h2>
      </div>
      <div class="tg-modal-body">
        ${riskBadgeHtml(scanResult.riskScore || 99, scanResult.riskLevel || 'CRITICAL')}
        <p class="tg-modal-intro">The following threats were detected and this content has been blocked:</p>
        ${buildFindingsList(findings)}
        <div class="tg-tip">⚠️ Never paste API keys, credentials, passwords, or confidential data into ChatGPT. These are intercepted and logged.</div>
      </div>
      <div class="tg-modal-footer">
        <button class="tg-btn tg-btn-close" id="tg-block-dismiss">Dismiss</button>
      </div>
    `;
    overlay.style.display = 'flex';

    document.getElementById('tg-block-dismiss').onclick = () => {
      closeModal();
      resolve('BLOCK');
    };
  });
}

// ── WARN Modal ────────────────────────────────────────────────────────────────
function showWarnModal(scanResult) {
  return new Promise(resolve => {
    const overlay = getOrCreateOverlay();
    const modal = document.getElementById('tg-modal');
    const findings = scanResult.findings || [];

    modal.innerHTML = `
      <div class="tg-modal-header tg-modal-warn">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        <h2>Sensitive content detected</h2>
      </div>
      <div class="tg-modal-body">
        ${riskBadgeHtml(scanResult.riskScore || 55, scanResult.riskLevel || 'MEDIUM')}
        <p class="tg-modal-intro">TrustGuard found the following in your content:</p>
        ${buildFindingsList(findings)}
        <p class="tg-modal-note">This has been logged. You may still send, but it is against company policy to share sensitive data with external AI tools.</p>
      </div>
      <div class="tg-modal-footer">
        <button class="tg-btn tg-btn-secondary" id="tg-warn-cancel">Cancel (Recommended)</button>
        <button class="tg-btn tg-btn-warn" id="tg-warn-continue">Send anyway</button>
      </div>
    `;
    overlay.style.display = 'flex';

    document.getElementById('tg-warn-cancel').onclick = () => { closeModal(); resolve('CANCEL'); };
    document.getElementById('tg-warn-continue').onclick = () => { closeModal(); resolve('CONTINUE'); };
  });
}

// ── REVIEW Modal ──────────────────────────────────────────────────────────────
function showReviewModal(scanResult) {
  return new Promise(resolve => {
    const overlay = getOrCreateOverlay();
    const modal = document.getElementById('tg-modal');
    const findings = scanResult.findings || [];

    modal.innerHTML = `
      <div class="tg-modal-header tg-modal-review">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        <h2>Flagged for security review</h2>
      </div>
      <div class="tg-modal-body">
        ${riskBadgeHtml(scanResult.riskScore || 70, scanResult.riskLevel || 'HIGH')}
        <p class="tg-modal-intro">The following was detected in your content:</p>
        ${buildFindingsList(findings)}
        <p class="tg-modal-note">Your request has been blocked and sent to the security team for review. Event ID: <code class="tg-finding-val">${escapeHtml(scanResult.eventId || 'N/A')}</code></p>
      </div>
      <div class="tg-modal-footer">
        <button class="tg-btn tg-btn-close" id="tg-review-dismiss">OK, understood</button>
      </div>
    `;
    overlay.style.display = 'flex';

    document.getElementById('tg-review-dismiss').onclick = () => { closeModal(); resolve('REVIEW'); };
  });
}
