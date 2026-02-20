// Writing History Manager

let fullHistory = [];
let filteredHistory = [];
let currentPage = 1;
const ITEMS_PER_PAGE = 20;

document.addEventListener('DOMContentLoaded', async () => {
  await loadHistory();
  setupEventListeners();
  updateStats();
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
        <button class="small" onclick="copyToClipboard('${item.id}', 'result')">📋 Copy Result</button>
        <button class="small" onclick="copyToClipboard('${item.id}', 'original')">📋 Copy Original</button>
        <button class="small" onclick="deleteItem('${item.id}')" style="background: #f44336;">🗑️ Delete</button>
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
  if (!confirm('Delete this history item?')) return;
  
  fullHistory = fullHistory.filter(h => h.id != id);
  await chrome.storage.local.set({ history: fullHistory });
  
  // Don't reload from storage, just update memory
  filterHistory();
  updateStats();
  showToast('Item deleted', 'success');
}

async function clearHistory() {
  if (!confirm('⚠️ Are you sure? This will delete ALL history permanently.')) return;
  
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