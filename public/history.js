// Writing History Manager

let fullHistory = [];
let filteredHistory = [];

document.addEventListener('DOMContentLoaded', async () => {
  await loadHistory();
  setupEventListeners();
  updateStats();
  displayHistory(fullHistory);
});

async function loadHistory() {
  const data = await chrome.storage.local.get('history');
  fullHistory = data.history || [];
  filteredHistory = fullHistory;
}

function setupEventListeners() {
  document.getElementById('searchInput').addEventListener('input', filterHistory);
  document.getElementById('typeFilter').addEventListener('change', filterHistory);
}

function filterHistory() {
  const searchTerm = document.getElementById('searchInput').value.toLowerCase();
  const typeFilter = document.getElementById('typeFilter').value;

  filteredHistory = fullHistory.filter(item => {
    const matchesSearch = !searchTerm || 
      item.original.toLowerCase().includes(searchTerm) ||
      item.result.toLowerCase().includes(searchTerm);
    
    const matchesType = !typeFilter || item.type === typeFilter;
    
    return matchesSearch && matchesType;
  });

  displayHistory(filteredHistory);
}

function displayHistory(items) {
  const list = document.getElementById('historyList');
  
  if (items.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <p>📭 No matching items found</p>
        <p style="font-size: 0.9em;">Try adjusting your search or filter.</p>
      </div>
    `;
    return;
  }

  list.innerHTML = items.map((item, idx) => `
    <div class="history-item">
      <div class="history-header">
        <span class="history-type type-${item.type}">${getTypeIcon(item.type)} ${formatType(item.type)}</span>
        <span class="history-date">${formatDate(item.date)}</span>
      </div>
      <div style="margin-bottom: 10px;">
        <h4 style="font-size: 0.9em; margin-bottom: 4px; color: #333;">Original:</h4>
        <div class="history-content">${escapeHtml(item.original)}</div>
      </div>
      <div style="margin-bottom: 10px;">
        <h4 style="font-size: 0.9em; margin-bottom: 4px; color: #333;">Result:</h4>
        <div class="history-content">${escapeHtml(item.result)}</div>
      </div>
      <div class="history-actions">
        <button class="small" onclick="copyToClipboard('${idx}', 'result')">📋 Copy Result</button>
        <button class="small" onclick="copyToClipboard('${idx}', 'original')">📋 Copy Original</button>
        <button class="small" onclick="deleteItem('${idx}')" style="background: #f44336;">🗑️ Delete</button>
      </div>
    </div>
  `).join('');
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

async function copyToClipboard(idx, field) {
  const item = filteredHistory[idx];
  const text = field === 'result' ? item.result : item.original;
  
  try {
    await navigator.clipboard.writeText(text);
    alert('✅ Copied to clipboard!');
  } catch (e) {
    alert('❌ Failed to copy');
  }
}

async function deleteItem(idx) {
  if (!confirm('Delete this history item?')) return;
  
  const item = filteredHistory[idx];
  fullHistory = fullHistory.filter(h => h.id !== item.id);
  await chrome.storage.local.set({ history: fullHistory });
  
  await loadHistory();
  filterHistory();
  updateStats();
}

async function clearHistory() {
  if (!confirm('⚠️ Are you sure? This will delete ALL history permanently.')) return;
  
  fullHistory = [];
  filteredHistory = [];
  await chrome.storage.local.set({ history: [] });
  
  updateStats();
  displayHistory([]);
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
