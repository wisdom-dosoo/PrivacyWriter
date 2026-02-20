document.addEventListener('DOMContentLoaded', () => {
  // Tab Switching Logic
  window.switchTab = (tabId) => {
    // Hide all tabs
    ['shared', 'review', 'comments', 'standards'].forEach(t => {
      document.getElementById(`${t}-tab`).style.display = 'none';
    });
    // Show selected
    document.getElementById(`${tabId}-tab`).style.display = 'block';
    
    // Refresh data
    if (tabId === 'shared') loadDocuments();
    if (tabId === 'standards') loadStandards();
  };

  // --- Shared Documents ---

  window.createNewDocument = async () => {
    const title = document.getElementById('docTitle').value;
    const content = document.getElementById('docContent').value;
    const members = document.getElementById('docTeamMembers').value.split(',').map(e => e.trim());

    if (!title || !content) {
      showToast('Please fill in title and content', 'error');
      return;
    }

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'createSharedDocument',
        title,
        content,
        teamMembers: members
      });

      if (response.success) {
        showToast('Document created successfully!');
        document.getElementById('docTitle').value = '';
        document.getElementById('docContent').value = '';
        loadDocuments();
      } else {
        showToast('Error: ' + response.error, 'error');
      }
    } catch (e) {
      console.error(e);
    }
  };

  async function loadDocuments() {
    // In a real app, we'd fetch list. For now, we rely on what we just created or mock data
    // Since we don't have a 'getDocuments' endpoint in background.js yet, we'll mock display
    // based on local storage if we could access it, or just show a placeholder.
    // However, createSharedDocument saves to storage.
    
    const list = document.getElementById('documentList');
    // Mock retrieval for UI demonstration
    chrome.storage.local.get('sharedDocuments', (data) => {
      const docs = data.sharedDocuments || [];
      if (docs.length === 0) {
        list.innerHTML = '<li style="padding: 20px; text-align: center; color: #999;">📭 No documents yet.</li>';
        return;
      }

      list.innerHTML = docs.map(doc => `
        <li class="document-item">
          <div class="document-info">
            <h4>${doc.title}</h4>
            <span style="font-size: 0.85em; color: #666;">Owner: You • ${new Date(doc.lastModified).toLocaleDateString()}</span>
          </div>
          <span class="document-status status-${doc.reviewStatus || 'draft'}">${doc.reviewStatus || 'Draft'}</span>
        </li>
      `).join('');
    });
  }

  // --- Team Standards ---

  window.createTeamStandard = async () => {
    const name = document.getElementById('standardName').value;
    const banned = document.getElementById('bannedWords').value.split(',').map(w => w.trim()).filter(w => w);
    const required = document.getElementById('requiredTerms').value.split(',').map(w => w.trim()).filter(w => w);

    if (!name) {
      showToast('Please enter a standard name', 'error');
      return;
    }

    const rules = [];
    if (banned.length) rules.push({ type: 'bannedWords', words: banned });
    if (required.length) rules.push({ type: 'requireWords', words: required, description: 'Required terms' });

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'createTeamStyleGuide',
        name,
        rules
      });

      if (response.success) {
        showToast('Standard created successfully!');
        loadStandards();
      }
    } catch (e) {
      console.error(e);
    }
  };

  function loadStandards() {
    const list = document.getElementById('standardsList');
    chrome.storage.local.get('teamStyleGuides', (data) => {
      const guides = data.teamStyleGuides || [];
      if (guides.length === 0) {
        list.innerHTML = '📋 No standards created yet';
        return;
      }

      list.innerHTML = guides.map(g => `
        <div style="background: white; padding: 10px; margin-bottom: 8px; border-radius: 6px; border: 1px solid #eee;">
          <strong>${g.name}</strong> <span style="color: #999; font-size: 0.9em;">(${g.rules.length} rules)</span>
        </div>
      `).join('');
    });
  }
});

// --- Toast Notification System ---
function showToast(message, type = 'success') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.style.cssText = "position: fixed; bottom: 20px; right: 20px; z-index: 1000; display: flex; flex-direction: column; gap: 10px;";
    document.body.appendChild(container);
    
    const style = document.createElement('style');
    style.textContent = `
      .toast { background: #333; color: white; padding: 12px 24px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); animation: slideIn 0.3s ease; display: flex; align-items: center; gap: 10px; font-family: system-ui, -apple-system, sans-serif; font-size: 14px; }
      .toast.success { background: #10b981; }
      .toast.error { background: #ef4444; }
      @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
    `;
    document.head.appendChild(style);
  }

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${type === 'success' ? '✅' : '❌'}</span> ${message}`;
  
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}