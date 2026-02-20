document.addEventListener('DOMContentLoaded', () => {
  const contextCards = document.querySelectorAll('.context-card');
  const textInput = document.getElementById('textInput');
  const analyzeBtn = document.getElementById('analyzeBtn');
  const clearBtn = document.getElementById('clearBtn');
  const statusMessage = document.getElementById('statusMessage');
  const detectionResult = document.getElementById('detectionResult');
  const detectionContent = document.getElementById('detectionContent');
  const recommendationsSection = document.getElementById('recommendationsSection');
  const recommendationsContent = document.getElementById('recommendationsContent');

  let selectedContext = null;

  // Handle Context Selection
  contextCards.forEach(card => {
    card.addEventListener('click', () => {
      // Remove active class from all
      contextCards.forEach(c => c.classList.remove('active'));
      // Add to clicked
      card.classList.add('active');
      selectedContext = card.dataset.context;
    });
  });

  // Handle Analyze Button
  analyzeBtn.addEventListener('click', async () => {
    const text = textInput.value.trim();

    if (text.length < 20) {
      showToast('Please enter at least 20 characters to analyze.', 'error');
      return;
    }

    analyzeBtn.disabled = true;
    analyzeBtn.innerHTML = '<span class="loading"></span> Analyzing...';

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'detectContext',
        text: text,
        userSelectedContext: selectedContext
      });

      if (response.success) {
        displayResults(response.data);
        showToast('Analysis complete!');
      } else {
        showToast(response.error || 'Analysis failed.', 'error');
      }
    } catch (error) {
      handleExtensionError(error);
    } finally {
      analyzeBtn.disabled = false;
      analyzeBtn.textContent = '🔍 Analyze Context';
    }
  });

  // Handle Clear Button
  clearBtn.addEventListener('click', () => {
    textInput.value = '';
    contextCards.forEach(c => c.classList.remove('active'));
    selectedContext = null;
    detectionResult.style.display = 'none';
    recommendationsSection.style.display = 'none';
    statusMessage.style.display = 'none';
  });

  function displayResults(data) {
    // Display Detection Results
    detectionContent.innerHTML = `
      <div class="result-item">
        <div class="result-label">Detected Context</div>
        <div class="result-value" style="text-transform: capitalize;">${data.detectedContext}</div>
        <div class="confidence-bar">
          <div class="confidence-fill" style="width: ${data.confidence}%"></div>
        </div>
        <div style="font-size: 0.8em; color: #666; margin-top: 4px;">${data.confidence}% Confidence</div>
      </div>
      
      <div class="result-item">
        <div class="result-label">Tone</div>
        <div class="result-value">${data.tone}</div>
      </div>

      <div class="result-item">
        <div class="result-label">Target Audience</div>
        <div class="result-value">${data.audience}</div>
      </div>

      <div class="result-item">
        <div class="result-label">Writing Style</div>
        <div class="result-value">${data.writingStyle}</div>
      </div>
    `;
    detectionResult.style.display = 'block';

    // Display Recommendations
    if (data.recommendations && data.recommendations.length > 0) {
      recommendationsContent.innerHTML = data.recommendations.map(rec => `
        <div class="recommendation">
          <div style="font-weight: 600; color: #374151; margin-bottom: 4px;">${rec.title}</div>
          <div style="font-size: 0.9em; color: #6b7280;">${rec.description}</div>
        </div>
      `).join('');
      recommendationsSection.style.display = 'block';
    } else {
      recommendationsSection.style.display = 'none';
    }

    // Scroll to results
    detectionResult.scrollIntoView({ behavior: 'smooth' });
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