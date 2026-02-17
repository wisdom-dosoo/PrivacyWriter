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
      showStatus('Please enter at least 20 characters to analyze.', 'error');
      return;
    }

    showStatus('Analyzing context...', 'success'); // Using success style for info
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
        showStatus('Analysis complete!', 'success');
      } else {
        showStatus(response.error || 'Analysis failed.', 'error');
      }
    } catch (error) {
      showStatus('Error connecting to AI service.', 'error');
      console.error(error);
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

  function showStatus(msg, type) {
    statusMessage.textContent = msg;
    statusMessage.className = `status-message visible ${type}`;
    setTimeout(() => {
      if (type === 'success' && msg !== 'Analyzing context...') statusMessage.classList.remove('visible');
    }, 3000);
  }
});