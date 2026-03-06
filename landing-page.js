document.addEventListener('DOMContentLoaded', () => {
  const checkStatusBtn = document.getElementById('checkStatusBtn');
  
  // Initial check
  checkSystemStatus();

  checkStatusBtn.addEventListener('click', () => {
    checkStatusBtn.textContent = 'Checking...';
    checkSystemStatus();
    setTimeout(() => {
      checkStatusBtn.textContent = 'Check System Status';
    }, 1000);
  });
});

async function checkSystemStatus() {
  try {
    // Request diagnostics from background script
    const response = await chrome.runtime.sendMessage({ action: 'getDiagnostics' });
    
    if (response && response.success) {
      updateStatusUI(response.diagnostics);
    } else {
      console.error('Failed to get diagnostics');
    }
  } catch (error) {
    console.error('Error checking status:', error);
  }
}

function updateStatusUI(diagnostics) {
  const aiStatus = document.getElementById('status-ai');
  const apiStatus = document.getElementById('status-apis');
  const setupGuide = document.getElementById('setupGuide');

  // Update AI Availability
  const isAiReady = diagnostics.aiAvailable;
  aiStatus.querySelector('.status-icon').textContent = isAiReady ? '✅' : '❌';
  aiStatus.querySelector('.status-desc').textContent = isAiReady 
    ? 'Chrome AI is active' 
    : 'Chrome AI not detected';

  // Update APIs
  const apis = diagnostics.apis || {};
  const activeApis = Object.entries(apis)
    .filter(([_, active]) => active)
    .map(([name]) => name.charAt(0).toUpperCase() + name.slice(1));
  
  apiStatus.querySelector('.status-icon').textContent = activeApis.length > 0 ? '✅' : '⚠️';
  apiStatus.querySelector('.status-desc').textContent = activeApis.length > 0 
    ? activeApis.join(', ') 
    : 'No APIs enabled';

  // Show setup guide if things aren't ready
  if (!isAiReady || activeApis.length === 0) {
    setupGuide.classList.remove('hidden');
  } else {
    setupGuide.classList.add('hidden');
  }
}