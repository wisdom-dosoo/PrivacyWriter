// Cloud Sync JS - handles encryption, export, import, and restore
(function(){
  const el = id => document.getElementById(id);
  const status = el('status');
  const preview = el('preview');
  const previewContent = el('previewContent');

  function setStatus(msg, err=false){ status.textContent = msg; status.style.color = err ? 'crimson' : ''; }

  // Helpers: base64 conversions
  function bufToBase64(buf){ return btoa(String.fromCharCode(...new Uint8Array(buf))); }
  function base64ToBuf(b64){ const s = atob(b64); const arr = new Uint8Array(s.length); for(let i=0;i<s.length;i++) arr[i]=s.charCodeAt(i); return arr.buffer; }

  async function deriveKey(pass, salt){
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(pass), {name:'PBKDF2'}, false, ['deriveKey']);
    return crypto.subtle.deriveKey({name:'PBKDF2', salt, iterations:100000, hash:'SHA-256'}, keyMaterial, {name:'AES-GCM', length:256}, true, ['encrypt','decrypt']);
  }

  async function encryptJSON(obj, pass){
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const key = await deriveKey(pass, salt);
    const enc = new TextEncoder();
    const data = enc.encode(JSON.stringify(obj));
    const ct = await crypto.subtle.encrypt({name:'AES-GCM', iv}, key, data);
    return { salt: bufToBase64(salt), iv: bufToBase64(iv), data: bufToBase64(ct) };
  }

  async function decryptJSON(blob, pass){
    const salt = base64ToBuf(blob.salt);
    const iv = base64ToBuf(blob.iv);
    const ct = base64ToBuf(blob.data);
    const key = await deriveKey(pass, new Uint8Array(salt));
    const pt = await crypto.subtle.decrypt({name:'AES-GCM', iv: new Uint8Array(iv)}, key, ct);
    return JSON.parse(new TextDecoder().decode(pt));
  }

  async function download(filename, content){
    const a = document.createElement('a');
    const blob = new Blob([content], {type:'application/json'});
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  // UI actions
  el('saveServer').addEventListener('click', async ()=>{
    const url = el('uploadUrl').value.trim();
    const token = el('uploadToken').value.trim();
    await chrome.storage.local.set({ settings: Object.assign({}, (await chrome.storage.local.get('settings')).settings, { cloudSyncUrl: url || undefined, cloudSyncToken: token || undefined }) });
    setStatus('Server settings saved.');
  });

  el('pushServer').addEventListener('click', async ()=>{
    setStatus('Pushing to server...');
    const { success, status: st, error } = await new Promise(resolve => chrome.runtime.sendMessage({ action: 'syncCloud' }, resolve));
    if (success) setStatus('Push completed: ' + st);
    else setStatus('Push failed: ' + (error||'unknown'), true);
  });

  el('exportRaw').addEventListener('click', async ()=>{
    setStatus('Preparing raw export...');
    const res = await new Promise(resolve => chrome.runtime.sendMessage({ action: 'getCloudPayload' }, resolve));
    if (!res.success) { setStatus('Failed: ' + res.error, true); return; }
    download('privacywriter-backup.json', JSON.stringify(res.payload, null, 2));
    setStatus('Raw backup downloaded.');
  });

  el('exportBtn').addEventListener('click', async ()=>{
    const pass = el('exportPass').value;
    if (!pass) { setStatus('Enter a passphrase to encrypt the backup', true); return; }
    setStatus('Preparing encrypted export...');
    const res = await new Promise(resolve => chrome.runtime.sendMessage({ action: 'getCloudPayload' }, resolve));
    if (!res.success) { setStatus('Failed to prepare payload: ' + res.error, true); return; }
    try {
      const enc = await encryptJSON(res.payload, pass);
      download('privacywriter-backup-encrypted.json', JSON.stringify({ version: '1', encrypted: true, payload: enc }, null, 2));
      setStatus('Encrypted backup downloaded.');
    } catch (e) { setStatus('Encryption failed: ' + e.message, true); }
  });

  el('fileInput').addEventListener('change', ()=>{ setStatus('File selected. Click Import & Decrypt.'); });

  el('importBtn').addEventListener('click', async ()=>{
    const f = el('fileInput').files[0];
    if (!f) { setStatus('Select a backup file first', true); return; }
    setStatus('Reading file...');
    const text = await f.text();
    let parsed;
    try { parsed = JSON.parse(text); } catch(e){ setStatus('Invalid JSON file', true); return; }

    try {
      let payload = null;
      if (parsed.encrypted && parsed.payload) {
        const pass = el('importPass').value;
        if (!pass) { setStatus('Enter passphrase for encrypted backup', true); return; }
        payload = await decryptJSON(parsed.payload, pass);
      } else if (parsed.payload) {
        payload = parsed.payload;
      } else {
        payload = parsed;
      }

      previewContent.textContent = JSON.stringify(payload, null, 2);
      preview.style.display = 'block';
      setStatus('Backup decrypted and ready to preview. Click Restore to restore to extension.');
      // keep last parsed for restore
      window.__lastParsedBackup = payload;
    } catch (e) { setStatus('Decryption/parse failed: ' + e.message, true); }
  });

  el('previewBtn').addEventListener('click', async ()=>{
    const data = await chrome.storage.local.get('lastCloudExport');
    if (!data.lastCloudExport) { setStatus('No local export found', true); return; }
    previewContent.textContent = JSON.stringify(data.lastCloudExport.payload, null, 2);
    preview.style.display = 'block';
    window.__lastParsedBackup = data.lastCloudExport.payload;
    setStatus('Previewing last local export.');
  });

  el('restoreBtn').addEventListener('click', async ()=>{
    const payload = window.__lastParsedBackup;
    if (!payload) { setStatus('Nothing to restore', true); return; }
    setStatus('Restoring payload to extension...');
    const res = await new Promise(resolve => chrome.runtime.sendMessage({ action: 'restoreCloudPayload', payload }, resolve));
    if (res.success) { setStatus('Restore completed successfully.'); }
    else setStatus('Restore failed: ' + res.error, true);
  });

  // Initialize with saved server settings
  (async ()=>{
    const s = await chrome.storage.local.get('settings');
    const settings = s.settings || {};
    if (settings.cloudSyncUrl) el('uploadUrl').value = settings.cloudSyncUrl;
    if (settings.cloudSyncToken) el('uploadToken').value = settings.cloudSyncToken;
  })();

})();
