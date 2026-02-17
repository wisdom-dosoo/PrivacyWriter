// Settings Page Script

// Tab switching
document.querySelectorAll('.settings-tab').forEach(tab => {
  tab.addEventListener('click', (e) => {
    const tabName = e.target.dataset.tab;
    
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.remove('active');
    });
    
    // Remove active from all tabs
    document.querySelectorAll('.settings-tab').forEach(t => {
      t.classList.remove('active');
    });
    
    // Show selected tab
    document.getElementById(tabName).classList.add('active');
    e.target.classList.add('active');
  });
});

// Load settings on page load
document.addEventListener('DOMContentLoaded', async () => {
  await loadAllSettings();
  setupEventListeners();
});

/**
 * Setup all button event listeners (CSP-compliant)
 */
function setupEventListeners() {
  // General Settings Tab
  const btnSaveGeneral = document.getElementById('btnSaveGeneral');
  if (btnSaveGeneral) btnSaveGeneral.addEventListener('click', saveGeneralSettings);
  
  const btnResetGeneral = document.getElementById('btnResetGeneral');
  if (btnResetGeneral) btnResetGeneral.addEventListener('click', resetToDefaults);
  
  // AI & Models Tab
  const btnSaveAI = document.getElementById('btnSaveAI');
  if (btnSaveAI) btnSaveAI.addEventListener('click', saveAISettings);
  
  const btnTestAI = document.getElementById('btnTestAI');
  if (btnTestAI) btnTestAI.addEventListener('click', testConnection);
  
  // Privacy & Security Tab
  const btnSavePrivacy = document.getElementById('btnSavePrivacy');
  if (btnSavePrivacy) btnSavePrivacy.addEventListener('click', savePrivacySettings);
  
  const btnClearAllData = document.getElementById('btnClearAllData');
  if (btnClearAllData) btnClearAllData.addEventListener('click', clearAllData);
  
  // Data Management
  const btnExportData = document.getElementById('btnExportData');
  if (btnExportData) btnExportData.addEventListener('click', exportData);
  
  const btnClearHistory = document.getElementById('btnClearHistory');
  if (btnClearHistory) btnClearHistory.addEventListener('click', clearHistory);
  
  const btnClearCache = document.getElementById('btnClearCache');
  if (btnClearCache) btnClearCache.addEventListener('click', clearCache);
  
  // Cloud Sync Tab
  const btnSaveCloud = document.getElementById('btnSaveCloud');
  if (btnSaveCloud) btnSaveCloud.addEventListener('click', saveCloudSettings);
  
  const btnTestCloud = document.getElementById('btnTestCloud');
  if (btnTestCloud) btnTestCloud.addEventListener('click', testCloudConnection);
  
  const btnPerformSync = document.getElementById('btnPerformSync');
  if (btnPerformSync) btnPerformSync.addEventListener('click', performSync);
}

/**
 * Load all settings from storage
 */
async function loadAllSettings() {
  const data = await chrome.storage.local.get(null);
  
  // Load general settings
  document.getElementById('theme').value = data.theme || 'light';
  document.getElementById('language').value = data.language || 'en';
  document.getElementById('autoSaveHistory').checked = data.autoSaveHistory !== false;
  document.getElementById('showShortcuts').checked = data.showShortcuts !== false;
  
  // Load AI settings
  if (data.claudeApiKey) {
    document.getElementById('claudeApiKey').value = '••••••' + data.claudeApiKey.slice(-4);
  }
  document.getElementById('useClaudeAPI').checked = data.useClaudeAPI === true;
  document.getElementById('localOnly').checked = data.localOnly !== false;
  
  // Load privacy settings
  document.getElementById('encryptStorage').checked = data.encryptStorage !== false;
  document.getElementById('disableAnalytics').checked = data.disableAnalytics === true;
  document.getElementById('sessionTimeout').value = data.sessionTimeout || 30;
  
  // Load cloud settings
  document.getElementById('cloudUrl').value = data.cloudUrl || '';
  document.getElementById('autoSync').checked = data.autoSync === true;
  // Don't load password for security
  
  // Load model status
  await loadModelStatus();
}

/**
 * Load AI model availability
 */
async function loadModelStatus() {
  const statusEl = document.getElementById('modelStatus');
  
  try {
    const response = await chrome.runtime.sendMessage({ action: 'checkCapabilities' });
    
    let html = '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">';
    
    const models = [
      { name: 'Chrome Prompt API', key: 'promptAPI', icon: '🤖' },
      { name: 'Rewriter API', key: 'rewriterAPI', icon: '🔄' },
      { name: 'Summarizer API', key: 'summarizerAPI', icon: '📋' },
      { name: 'Translator API', key: 'translatorAPI', icon: '🌐' },
      { name: 'Proofreader API', key: 'proofreaderAPI', icon: '✏️' }
    ];
    
    for (const model of models) {
      const available = response[model.key];
      const status = available ? '✅ Ready' : '⏳ Checking...';
      const statusColor = available ? '#10b981' : '#f59e0b';
      
      html += `
        <div style="padding: 12px; background: var(--bg-light); border-radius: 8px; border-left: 3px solid ${statusColor};">
          <div style="font-weight: 600; margin-bottom: 4px;">${model.icon} ${model.name}</div>
          <div style="font-size: 0.9em; color: ${statusColor};">${status}</div>
        </div>
      `;
    }
    
    html += '</div>';
    statusEl.innerHTML = html;
  } catch (error) {
    statusEl.innerHTML = '<div class="info-box">Unable to check AI status. Models may be loading...</div>';
  }
}

/**
 * Save general settings
 */
async function saveGeneralSettings() {
  const settings = {
    theme: document.getElementById('theme').value,
    language: document.getElementById('language').value,
    autoSaveHistory: document.getElementById('autoSaveHistory').checked,
    showShortcuts: document.getElementById('showShortcuts').checked,
    lastSettingsSaved: Date.now()
  };
  
  await chrome.storage.local.set(settings);
  showMessage('✅ General settings saved!', 'success');
}

/**
 * Save AI settings
 */
async function saveAISettings() {
  const claudeKeyInput = document.getElementById('claudeApiKey').value;
  let claudeKey = null;
  
  // Only save if user entered a new key (not the masked version)
  if (claudeKeyInput && !claudeKeyInput.startsWith('••••••')) {
    claudeKey = claudeKeyInput;
  }
  
  const settings = {
    claudeApiKey: claudeKey,
    useClaudeAPI: document.getElementById('useClaudeAPI').checked,
    localOnly: document.getElementById('localOnly').checked,
    lastSettingsSaved: Date.now()
  };
  
  await chrome.storage.local.set(settings);
  
  // Mask the key for display
  if (claudeKey) {
    document.getElementById('claudeApiKey').value = '••••••' + claudeKey.slice(-4);
  }
  
  showMessage('✅ AI settings saved!', 'success');
}

/**
 * Save privacy settings
 */
async function savePrivacySettings() {
  const settings = {
    encryptStorage: document.getElementById('encryptStorage').checked,
    disableAnalytics: document.getElementById('disableAnalytics').checked,
    sessionTimeout: parseInt(document.getElementById('sessionTimeout').value),
    lastSettingsSaved: Date.now()
  };
  
  await chrome.storage.local.set(settings);
  showMessage('✅ Privacy settings saved!', 'success');
}

/**
 * Save cloud settings
 */
async function saveCloudSettings() {
  const settings = {
    cloudUrl: document.getElementById('cloudUrl').value,
    autoSync: document.getElementById('autoSync').checked,
    lastSettingsSaved: Date.now()
  };
  
  // Only save password if it's new (non-empty)
  const password = document.getElementById('syncPassword').value;
  if (password) {
    settings.syncPassword = password;
  }
  
  await chrome.storage.local.set(settings);
  showMessage('✅ Cloud settings saved!', 'success');
}

/**
 * Test AI connection
 */
async function testConnection() {
  showMessage('Testing AI connection...', 'success');
  
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'checkCapabilities'
    });
    
    if (response) {
      const available = Object.values(response).some(v => v === true);
      if (available) {
        showMessage('✅ AI connection successful! At least one API is available.', 'success');
      } else {
        showMessage('⚠️ No Chrome AI APIs found. Try enabling chrome://flags#ai-apis-on-chrome', 'error');
      }
    }
  } catch (error) {
    showMessage(`❌ Connection test failed: ${error.message}`, 'error');
  }
}

/**
 * Test cloud connection
 */
async function testCloudConnection() {
  const cloudUrl = document.getElementById('cloudUrl').value;
  
  if (!cloudUrl) {
    showMessage('⚠️ Please enter a cloud sync URL first', 'error');
    return;
  }
  
  showMessage('Testing cloud connection...', 'success');
  
  try {
    const response = await fetch(cloudUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ test: true })
    });
    
    if (response.ok) {
      showMessage('✅ Cloud connection successful!', 'success');
    } else {
      showMessage(`❌ Server returned error: ${response.status}`, 'error');
    }
  } catch (error) {
    showMessage(`❌ Connection failed: ${error.message}`, 'error');
  }
}

/**
 * Perform cloud sync now
 */
async function performSync() {
  showMessage('Syncing to cloud...', 'success');
  
  try {
    const response = await chrome.runtime.sendMessage({ action: 'syncCloud' });
    
    if (response.success) {
      showMessage(`✅ Sync successful! Status: ${response.status}`, 'success');
    } else {
      showMessage(`❌ Sync failed: ${response.error}`, 'error');
    }
  } catch (error) {
    showMessage(`❌ Sync error: ${error.message}`, 'error');
  }
}

/**
 * Reset to default settings
 */
async function resetToDefaults() {
  if (!confirm('Are you sure? This will reset all general settings to defaults.')) {
    return;
  }
  
  const defaults = {
    theme: 'light',
    language: 'en',
    autoSaveHistory: true,
    showShortcuts: true
  };
  
  await chrome.storage.local.set(defaults);
  
  // Reload UI
  document.getElementById('theme').value = defaults.theme;
  document.getElementById('language').value = defaults.language;
  document.getElementById('autoSaveHistory').checked = defaults.autoSaveHistory;
  document.getElementById('showShortcuts').checked = defaults.showShortcuts;
  
  showMessage('✅ Settings reset to defaults!', 'success');
}

/**
 * Clear all user data
 */
async function clearAllData() {
  if (!confirm('⚠️ WARNING: This will DELETE all your data including history, profiles, and settings. This cannot be undone!')) {
    return;
  }
  
  if (!confirm('Are you absolutely sure? This is permanent.')) {
    return;
  }
  
  await chrome.storage.local.clear();
  showMessage('✅ All data cleared. Reloading...', 'success');
  
  setTimeout(() => {
    location.reload();
  }, 1000);
}

/**
 * Clear history only
 */
async function clearHistory() {
  if (!confirm('Delete all history? This cannot be undone.')) {
    return;
  }
  
  const data = await chrome.storage.local.get(null);
  delete data.history;
  await chrome.storage.local.set(data);
  
  showMessage('✅ History cleared!', 'success');
}

/**
 * Clear browser cache
 */
async function clearCache() {
  if (!confirm('Clear browser cache? This may affect extension performance.')) {
    return;
  }
  
  try {
    await chrome.browsingData.remove(
      { since: 0 },
      {
        appcache: true,
        cache: true,
        cookies: false,
        fileSystems: true,
        formData: false,
        history: false,
        indexedDB: true,
        localStorage: false,
        pluginData: true,
        serviceWorkers: true,
        webSQL: true
      }
    );
    
    showMessage('✅ Cache cleared!', 'success');
  } catch (error) {
    showMessage(`⚠️ Cache clearing may require additional permissions: ${error.message}`, 'error');
  }
}

/**
 * Export all data as JSON
 */
async function exportData() {
  const data = await chrome.storage.local.get(null);
  
  // Don't export sensitive data
  delete data.claudeApiKey;
  delete data.syncPassword;
  
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `privacywriter-backup-${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  showMessage('✅ Data exported successfully!', 'success');
}

/**
 * Show status message
 */
function showMessage(message, type = 'success') {
  const messageEl = document.getElementById('statusMessage');
  messageEl.textContent = message;
  messageEl.className = `status-message visible ${type}`;
  
  setTimeout(() => {
    messageEl.classList.remove('visible');
  }, 4000);
}
