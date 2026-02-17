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
      alert('Please fill in title and content');
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
        alert('Document created!');
        document.getElementById('docTitle').value = '';
        document.getElementById('docContent').value = '';
        loadDocuments();
      } else {
        alert('Error: ' + response.error);
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
      alert('Please enter a standard name');
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
        alert('Standard created!');
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