// Writing History Manager

let fullHistory = [];
let filteredHistory = [];
let currentPage = 1;
const ITEMS_PER_PAGE = 20;

document.addEventListener('DOMContentLoaded', async () => {
  await loadHistory();
  setupEventListeners();
  updateStats();
  setupConfirmationModal();
  // Initial render
  renderPage(1, true);
});

async function loadHistory() {
  const data = await chrome.storage.local.get('history');
  fullHistory = data.history || [];
  filteredHistory = fullHistory;
}

function setupEventListeners() {
  document.getElementById('searchInput').addEventListener('input', filterHistory);
  document.getElementById('typeFilter').addEventListener('change', filterHistory);
  document.getElementById('btnLoadMore').addEventListener('click', () => renderPage(currentPage + 1));

  // Action Buttons
  const btnClear = document.getElementById('btnClearHistory');
  if (btnClear) btnClear.addEventListener('click', clearHistory);

  const btnExportCsv = document.getElementById('btnExportCSV');
  if (btnExportCsv) btnExportCsv.addEventListener('click', exportAsCSV);

  const btnExportJson = document.getElementById('btnExportJSON');
  if (btnExportJson) btnExportJson.addEventListener('click', exportAsJSON);

  // Event Delegation for dynamic items
  document.getElementById('historyList').addEventListener('click', handleItemAction);
}

function filterHistory() {
  const searchTerm = document.getElementById('searchInput').value.toLowerCase();
  const typeFilter = document.getElementById('typeFilter').value;

  // Reset pagination on filter change
  currentPage = 1;

  filteredHistory = fullHistory.filter(item => {
    const matchesSearch = !searchTerm || 
      item.original.toLowerCase().includes(searchTerm) ||
      item.result.toLowerCase().includes(searchTerm);
    
    const matchesType = !typeFilter || item.type === typeFilter;
    
    return matchesSearch && matchesType;
  });

  renderPage(1, true);
}

async function handleItemAction(e) {
  const button = e.target.closest('button');
  if (!button) return;

  const action = button.dataset.action;
  const id = button.dataset.id;

  if (!action || !id) return;

  if (action === 'copy') {
    const field = button.dataset.field;
    await copyToClipboard(id, field);
    
    // Visual feedback
    const originalText = button.innerHTML;
    button.innerHTML = '✅ Copied!';
    button.classList.add('btn-success');
    setTimeout(() => {
      button.innerHTML = originalText;
      button.classList.remove('btn-success');
    }, 1500);
  } else if (action === 'delete') {
    await deleteItem(id);
  }
}

function renderPage(page, reset = false) {
  currentPage = page;
  const start = 0;
  const end = page * ITEMS_PER_PAGE;
  const itemsToShow = filteredHistory.slice(start, end);
  
  const list = document.getElementById('historyList');
  const loadMoreBtn = document.getElementById('loadMoreContainer');
  
  if (itemsToShow.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <p>📭 No matching items found</p>
        <p style="font-size: 0.9em;">Try adjusting your search or filter.</p>
      </div>
    `;
    loadMoreBtn.classList.add('hidden');
    return;
  }

  // Show/Hide Load More button
  if (filteredHistory.length > end) {
    loadMoreBtn.classList.remove('hidden');
  } else {
    loadMoreBtn.classList.add('hidden');
  }

  list.innerHTML = itemsToShow.map((item) => {
    // Find original index in fullHistory for deletion
    const originalIdx = fullHistory.findIndex(h => h.id === item.id);
    
    return `
    <div class="history-item">
      <div class="history-header">
        <span class="history-type type-${item.type}">${getTypeIcon(item.type)} ${formatType(item.type)}</span>
        <span class="history-date">${formatDate(item.date)}</span>
      </div>
      <div style="margin-bottom: 10px;">
        <div class="history-label">Original</div>
        <div class="history-content">${escapeHtml(item.original)}</div>
      </div>
      <div style="margin-bottom: 10px;">
        <div class="history-label">Result</div>
        <div class="history-content">${escapeHtml(item.result)}</div>
      </div>
      <div class="history-actions">
        <button class="small" data-action="copy" data-id="${item.id}" data-field="result">📋 Copy Result</button>
        <button class="small" data-action="copy" data-id="${item.id}" data-field="original">📋 Copy Original</button>
        <button class="small" data-action="delete" data-id="${item.id}" style="background: var(--danger, #ef4444); color: white;">🗑️ Delete</button>
      </div>
    </div>
  `}).join('');
}

function updateStats() {
  const stats = {
    total: fullHistory.length,
    grammar: fullHistory.filter(h => h.type === 'grammar').length,
    rewrite: fullHistory.filter(h => h.type === 'rewrite').length,
    words: fullHistory.reduce((sum, h) => sum + (h.fullOriginal ? h.fullOriginal.split(/\s+/).length : 0), 0)
  };

  document.getElementById('totalCount').textContent = stats.total;
  document.getElementById('grammarCount').textContent = stats.grammar;
  document.getElementById('rewriteCount').textContent = stats.rewrite;
  document.getElementById('wordsCount').textContent = stats.words.toLocaleString();
}

function getTypeIcon(type) {
  const icons = {
    grammar: '✏️',
    rewrite: '🔄',
    summarize: '📋',
    translate: '🌐',
    coaching: '🎯'
  };
  return icons[type] || '📝';
}

function formatType(type) {
  const names = {
    grammar: 'Grammar',
    rewrite: 'Rewrite',
    summarize: 'Summarize',
    translate: 'Translate',
    coaching: 'Writing Coach'
  };
  return names[type] || type;
}

function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
}

function escapeHtml(text) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return text.replace(/[&<>"']/g, m => map[m]);
}

async function copyToClipboard(id, field) {
  // ID comes in as string from HTML attribute
  const item = fullHistory.find(h => h.id == id);
  if (!item) return;

  const text = field === 'result' ? item.result : item.original;
  
  try {
    await navigator.clipboard.writeText(text);
    showToast('Copied to clipboard!', 'success');
  } catch (e) {
    showToast('Failed to copy', 'error');
  }
}

async function deleteItem(id) {
  if (!(await showConfirmation('Delete this history item?', 'Delete'))) return;
  
  fullHistory = fullHistory.filter(h => h.id != id);
  await chrome.storage.local.set({ history: fullHistory });
  
  // Don't reload from storage, just update memory
  filterHistory();
  updateStats();
  showToast('Item deleted', 'success');
}

async function clearHistory() {
  if (!(await showConfirmation('⚠️ Are you sure? This will delete ALL history permanently.', 'Clear All'))) return;
  
  fullHistory = [];
  filteredHistory = [];
  await chrome.storage.local.set({ history: [] });
  
  updateStats();
  renderPage(1, true);
  showToast('History cleared', 'success');
}

function exportAsCSV() {
  if (filteredHistory.length === 0) {
    alert('No items to export');
    return;
  }

  let csv = 'Date,Type,Original,Result\n';
  filteredHistory.forEach(item => {
    const date = new Date(item.date).toLocaleString();
    const original = `"${item.original.replace(/"/g, '""')}"`;
    const result = `"${item.result.replace(/"/g, '""')}"`;
    csv += `"${date}",${item.type},${original},${result}\n`;
  });

  downloadFile('writing-history.csv', csv, 'text/csv');
}

function exportAsJSON() {
  if (filteredHistory.length === 0) {
    alert('No items to export');
    return;
  }

  const json = JSON.stringify({
    exported: new Date().toISOString(),
    count: filteredHistory.length,
    items: filteredHistory
  }, null, 2);

  downloadFile('writing-history.json', json, 'application/json');
}

function downloadFile(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${type === 'success' ? '✅' : '❌'}</span> ${message}`;
  
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// --- Custom Confirmation Modal ---
function setupConfirmationModal() {
  if (document.getElementById('custom-modal-overlay')) return;

  const css = `
    .custom-modal-overlay {
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0,0,0,0.5); z-index: 10000;
      display: flex; align-items: center; justify-content: center;
      opacity: 0; visibility: hidden; transition: all 0.2s ease;
      backdrop-filter: blur(2px);
    }
    .custom-modal-overlay.active { opacity: 1; visibility: visible; }
    .custom-modal {
      background: var(--card-bg, white); width: 90%; max-width: 320px;
      padding: 24px; border-radius: 12px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.15);
      transform: scale(0.95); transition: all 0.2s ease;
    }
    .custom-modal-overlay.active .custom-modal { transform: scale(1); }
    .custom-modal h3 { margin: 0 0 10px 0; font-size: 18px; color: var(--text-main, #333); }
    .custom-modal p { margin: 0 0 20px 0; color: var(--text-muted, #666); line-height: 1.5; font-size: 14px; }
    .custom-modal-actions { display: flex; justify-content: flex-end; gap: 10px; }
    .modal-btn { padding: 8px 16px; border-radius: 6px; border: none; font-weight: 600; cursor: pointer; transition: background 0.2s, transform 0.1s; font-size: 13px; }
    .modal-btn:active { transform: translateY(1px); }
    .modal-btn-cancel { background: var(--bg-light, #f3f4f6); color: var(--text-muted, #4b5563); }
    .modal-btn-cancel:hover { background: #e5e7eb; }
    .modal-btn-cancel:active { background: #d1d5db; }
    .modal-btn-confirm { background: var(--danger, #ef4444); color: white; }
    .modal-btn-confirm:hover { background: #dc2626; }
    .modal-btn-confirm:active { background: #b91c1c; }
  `;
  
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  const html = `
    <div class="custom-modal">
      <h3 id="modal-title">Confirm Action</h3>
      <p id="modal-message"></p>
      <div class="custom-modal-actions">
        <button class="modal-btn modal-btn-cancel" id="modal-cancel">Cancel</button>
        <button class="modal-btn modal-btn-confirm" id="modal-confirm">Confirm</button>
      </div>
    </div>
  `;
  
  const overlay = document.createElement('div');
  overlay.id = 'custom-modal-overlay';
  overlay.className = 'custom-modal-overlay';
  overlay.innerHTML = html;
  document.body.appendChild(overlay);
}

function showConfirmation(message, confirmText = 'Delete') {
  return new Promise((resolve) => {
    const overlay = document.getElementById('custom-modal-overlay');
    const msgEl = document.getElementById('modal-message');
    const confirmBtn = document.getElementById('modal-confirm');
    const cancelBtn = document.getElementById('modal-cancel');

    if (!overlay) {
      resolve(confirm(message)); // Fallback
      return;
    }

    msgEl.textContent = message;
    confirmBtn.textContent = confirmText;
    
    overlay.classList.add('active');

    const close = (result) => {
      overlay.classList.remove('active');
      confirmBtn.onclick = null;
      cancelBtn.onclick = null;
      setTimeout(() => resolve(result), 200); // Wait for animation
    };

    confirmBtn.onclick = () => close(true);
    cancelBtn.onclick = () => close(false);
    
    // Close on click outside
    overlay.onclick = (e) => {
      if (e.target === overlay) close(false);
    };
  });
}