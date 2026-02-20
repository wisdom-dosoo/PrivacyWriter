document.addEventListener('DOMContentLoaded', async () => {
  // Load saved settings
  const { settings } = await chrome.storage.local.get('settings');
  if (settings?.cloudSyncUrl) document.getElementById('uploadUrl').value = settings.cloudSyncUrl;
  if (settings?.cloudSyncToken) document.getElementById('uploadToken').value = settings.cloudSyncToken;

  // Event Listeners
  document.getElementById('saveServer').addEventListener('click', saveServerConfig);
  document.getElementById('pushServer').addEventListener('click', pushToServer);
  document.getElementById('exportBtn').addEventListener('click', () => exportBackup(true));
  document.getElementById('exportRaw').addEventListener('click', () => exportBackup(false));
  document.getElementById('importBtn').addEventListener('click', importBackup);
  document.getElementById('restoreBtn').addEventListener('click', restoreData);
});

async function saveServerConfig() {
  const url = document.getElementById('uploadUrl').value.trim();
  const token = document.getElementById('uploadToken').value.trim();

  const { settings = {} } = await chrome.storage.local.get('settings');
  settings.cloudSyncUrl = url;
  settings.cloudSyncToken = token;

  await chrome.storage.local.set({ settings });
  showToast('Server configuration saved');
}

async function pushToServer() {
  const url = document.getElementById('uploadUrl').value.trim();
  if (!url) return showToast('Please configure a server URL first', 'error');

  showToast('Syncing...');
  
  try {
    const response = await chrome.runtime.sendMessage({ action: 'syncCloud' });
    if (response.success) {
      showToast('✅ Sync successful!');
    } else {
      showToast('Sync failed: ' + response.error, 'error');
    }
  } catch (error) {
    handleExtensionError(error);
  }
}

async function exportBackup(encrypt) {
  const pass = document.getElementById('exportPass').value;
  if (encrypt && !pass) return showToast('Please enter a password to encrypt', 'error');

  try {
    const response = await chrome.runtime.sendMessage({ action: 'getCloudPayload' });
    if (!response.success) throw new Error(response.error);

    let data = JSON.stringify(response.payload);
    let filename = `privacylens_backup_${new Date().toISOString().slice(0,10)}.json`;

    if (encrypt) {
      data = await encryptData(data, pass);
      filename = filename.replace('.json', '.enc.json');
    }

    downloadFile(filename, data, 'application/json');
    showToast('Backup exported successfully');
  } catch (error) {
    handleExtensionError(error);
  }
}

async function importBackup() {
  const fileInput = document.getElementById('fileInput');
  const file = fileInput.files[0];
  const pass = document.getElementById('importPass').value;

  if (!file) return showToast('Please select a file', 'error');

  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      let content = e.target.result;

      // Try to detect if encrypted (basic check)
      if (file.name.includes('.enc') || !content.trim().startsWith('{')) {
        if (!pass) return showToast('Password required for encrypted file', 'error');
        content = await decryptData(content, pass);
      }

      const payload = JSON.parse(content);
      
      // Show preview
      document.getElementById('preview').style.display = 'block';
      document.getElementById('previewContent').textContent = JSON.stringify(payload, null, 2).substring(0, 500) + '...';
      
      // Store for restore
      window.pendingRestore = payload;
      showToast('File loaded. Click Restore to apply.');
    } catch (error) {
      console.error(error);
      showToast('Failed to parse or decrypt file. Wrong password?', 'error');
    }
  };
  reader.readAsText(file);
}

async function restoreData() {
  if (!window.pendingRestore) return;

  if (!confirm('⚠️ This will overwrite your current settings and history. Continue?')) return;

  try {
    const response = await chrome.runtime.sendMessage({ 
      action: 'restoreCloudPayload', 
      payload: window.pendingRestore 
    });

    if (response.success) {
      showToast('✅ Data restored successfully!');
      setTimeout(() => location.reload(), 1500);
    } else {
      showToast('Restore failed: ' + response.error, 'error');
    }
  } catch (error) {
    handleExtensionError(error);
  }
}

// --- Crypto Utilities (Web Crypto API) ---

async function encryptData(text, password) {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw", enc.encode(password), { name: "PBKDF2" }, false, ["deriveKey"]
  );
  
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const key = await window.crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
    keyMaterial, { name: "AES-GCM", length: 256 }, false, ["encrypt"]
  );

  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv }, key, enc.encode(text)
  );

  // Pack salt + iv + data
  const buffer = new Uint8Array(salt.byteLength + iv.byteLength + encrypted.byteLength);
  buffer.set(salt, 0);
  buffer.set(iv, salt.byteLength);
  buffer.set(new Uint8Array(encrypted), salt.byteLength + iv.byteLength);

  return btoa(String.fromCharCode(...buffer));
}

async function decryptData(base64, password) {
  const binary = atob(base64);
  const buffer = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) buffer[i] = binary.charCodeAt(i);

  const salt = buffer.slice(0, 16);
  const iv = buffer.slice(16, 28);
  const data = buffer.slice(28);

  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw", enc.encode(password), { name: "PBKDF2" }, false, ["deriveKey"]
  );

  const key = await window.crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
    keyMaterial, { name: "AES-GCM", length: 256 }, false, ["decrypt"]
  );

  const decrypted = await window.crypto.subtle.decrypt(
    { name: "AES-GCM", iv }, key, data
  );

  return new TextDecoder().decode(decrypted);
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

function handleExtensionError(error) {
  console.error(error);
  if (error.message.includes('Extension context invalidated')) {
    showToast('Extension updated. Reloading page...', 'error');
    setTimeout(() => location.reload(), 2000);
  } else {
    showToast('Error: ' + error.message, 'error');
  }
}

function showToast(message, type = 'success') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${type === 'success' ? '✅' : '❌'}</span> ${message}`;
  container.appendChild(toast);
  setTimeout(() => { toast.remove(); }, 3000);
}