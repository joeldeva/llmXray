chrome.runtime.sendMessage({ type: 'GET_STATUS' }, (response) => {
  if (response) {
    document.getElementById('user-id').textContent = response.userId || 'N/A';
    const badge = document.getElementById('status-badge');
    badge.textContent = response.active ? 'Active' : 'Inactive';
    badge.className = `status-badge ${response.active ? 'status-active' : ''}`;
  }
});

chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  if (tabs[0] && tabs[0].url) {
    try {
      document.getElementById('hostname').textContent = new URL(tabs[0].url).hostname;
    } catch (_) {}
  }
});
