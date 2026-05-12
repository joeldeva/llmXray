/**
 * chatgptSelectors.js
 * DOM selector strategies for the ChatGPT composer.
 * ChatGPT changes its DOM frequently - we use multiple strategies.
 */

const CHATGPT_SELECTORS = {
  // Primary prompt textarea/contenteditable
  composer: [
    '#prompt-textarea',
    'div[contenteditable="true"][data-virtuoso-scroller]',
    'div[contenteditable="true"].ProseMirror',
    'textarea[placeholder]',
    'div[contenteditable="true"]',
  ],
  // Send button
  sendButton: [
    'button[data-testid="send-button"]',
    'button[aria-label="Send prompt"]',
    'button[aria-label="Send message"]',
    'button:has(svg[data-icon="paper-plane-top"])',
  ],
  // File input
  fileInput: [
    'input[type="file"]',
    'input[accept*="image"]',
    'input[accept*=".pdf"]',
  ],
};

function findComposer() {
  for (const selector of CHATGPT_SELECTORS.composer) {
    try {
      const el = document.querySelector(selector);
      if (el) return el;
    } catch (_) {}
  }
  return null;
}

function findSendButton() {
  for (const selector of CHATGPT_SELECTORS.sendButton) {
    try {
      const el = document.querySelector(selector);
      if (el) return el;
    } catch (_) {}
  }
  return null;
}

function findFileInputs() {
  const inputs = [];
  for (const selector of CHATGPT_SELECTORS.fileInput) {
    try {
      document.querySelectorAll(selector).forEach(el => inputs.push(el));
    } catch (_) {}
  }
  return [...new Set(inputs)];
}

function getComposerText(el) {
  if (!el) return '';
  return el.value || el.innerText || el.textContent || '';
}
