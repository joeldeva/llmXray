/**
 * fileMonitor.js
 * Monitors file inputs on ChatGPT for file/media uploads.
 * Reads small text files, scans them, blocks or allows.
 */

const MAX_TEXT_SIZE = 512 * 1024; // 512KB
const TEXT_TYPES = ['text/plain', 'text/csv', 'application/json', 'text/markdown', 'text/x-markdown'];

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    if (file.size > MAX_TEXT_SIZE) return resolve(null); // Too large, send metadata only
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.onerror = () => resolve(null);
    reader.readAsText(file);
  });
}

async function handleFileSelected(file, inputEl) {
  setBadgeStatus('scanning');

  let content = null;
  if (TEXT_TYPES.includes(file.type) || file.name.match(/\.(txt|csv|json|md)$/i)) {
    content = await readFileAsText(file);
  }

  const filePayload = {
    name: file.name,
    type: file.type,
    size: file.size,
    content: content || undefined,
  };

  const result = await scanFileWithBackend(filePayload);

  if (!result) {
    setBadgeStatus('error');
    setTimeout(() => setBadgeStatus('active'), 3000);
    return; // Backend unreachable - allow but note
  }

  const { decision } = result;

  if (decision === 'ALLOW') {
    setBadgeStatus('active');
    return;
  }

  if (decision === 'WARN') {
    setBadgeStatus('warning');
    await showWarnModal(result);
    setBadgeStatus('active');
    return;
  }

  if (decision === 'BLOCK' || decision === 'QUARANTINE' || decision === 'HUMAN_REVIEW') {
    setBadgeStatus('blocked');
    // Clear the file input to prevent upload
    try {
      const dt = new DataTransfer();
      inputEl.files = dt.files;
    } catch (_) {}

    if (decision === 'HUMAN_REVIEW') {
      await showReviewModal(result);
    } else {
      await showBlockModal(result);
    }
    setBadgeStatus('active');
  }
}

function attachFileMonitor() {
  // Use event delegation to catch file inputs added dynamically
  document.addEventListener('change', async (e) => {
    const input = e.target;
    if (input.type === 'file' && input.files && input.files.length > 0) {
      const file = input.files[0];
      await handleFileSelected(file, input);
    }
  }, true);

  // Drop event on document
  document.addEventListener('drop', async (e) => {
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      await handleFileSelected(file, null);
    }
  }, true);
}
