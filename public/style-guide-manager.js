// Style Guide Manager Script

document.addEventListener('DOMContentLoaded', () => {
  loadStyleGuides();
  populateGuideSelector();
});

async function createStyleGuide() {
  const name = document.getElementById('guideName').value.trim();
  const description = document.getElementById('guideDescription').value.trim();
  const bannedWordsStr = document.getElementById('bannedWords').value.trim();
  const preferredWordsStr = document.getElementById('preferredWords').value.trim();
  const requiredTermsStr = document.getElementById('requiredTerms').value.trim();
  const maxSentenceLength = parseInt(document.getElementById('maxSentenceLength').value) || 25;
  const tonePref = document.getElementById('tonePref').value;

  if (!name) {
    alert('Please enter a guide name');
    return;
  }

  const rules = [];

  if (bannedWordsStr) {
    rules.push({
      type: 'bannedWords',
      words: bannedWordsStr.split('\n').map(w => w.trim()).filter(w => w),
      description: 'Banned words'
    });
  }

  if (preferredWordsStr) {
    const preferred = {};
    preferredWordsStr.split('\n').forEach(line => {
      const [old, newWord] = line.split('=').map(w => w.trim());
      if (old && newWord) {
        preferred[old] = newWord;
      }
    });
    rules.push({
      type: 'preferredTerms',
      terms: preferred,
      description: 'Preferred terminology'
    });
  }

  if (requiredTermsStr) {
    rules.push({
      type: 'requireWords',
      words: requiredTermsStr.split(',').map(w => w.trim()),
      description: 'Required terms'
    });
  }

  rules.push({
    type: 'sentenceLength',
    maxLength: maxSentenceLength,
    description: `Max ${maxSentenceLength} words per sentence`
  });

  rules.push({
    type: 'tone',
    tone: tonePref,
    description: `Preferred tone: ${tonePref}`
  });

  const guide = {
    id: 'guide_' + Date.now(),
    name: name,
    description: description,
    rules: rules,
    createdAt: new Date().toISOString(),
    appliedDocs: 0
  };

  try {
    const data = await chrome.storage.local.get('styleGuides');
    const guides = data.styleGuides || [];
    guides.push(guide);
    await chrome.storage.local.set({ styleGuides: guides });

    alert('✅ Style guide created!');
    document.getElementById('guideName').value = '';
    document.getElementById('guideDescription').value = '';
    document.getElementById('bannedWords').value = '';
    document.getElementById('preferredWords').value = '';
    document.getElementById('requiredTerms').value = '';
    document.getElementById('maxSentenceLength').value = '25';

    loadStyleGuides();
    populateGuideSelector();
  } catch (error) {
    alert('Error: ' + error.message);
  }
}

async function loadStyleGuides() {
  try {
    const data = await chrome.storage.local.get('styleGuides');
    const guides = data.styleGuides || [];

    const list = document.getElementById('guidesList');
    
    if (guides.length === 0) {
      list.innerHTML = '<div style="padding: 20px; text-align: center; color: #999;">📋 No style guides created yet.</div>';
      return;
    }

    list.innerHTML = guides.map(guide => `
      <div class="rule-card">
        <div class="rule-header">
          <div>
            <h3>${guide.name}</h3>
            <p style="color: #666; font-size: 0.9em; margin: 5px 0;">
              ${guide.description || 'No description'} • ${guide.rules.length} rules
            </p>
            <p style="color: #999; font-size: 0.85em; margin: 5px 0;">
              Created ${new Date(guide.createdAt).toLocaleDateString()}
            </p>
          </div>
          <button onclick="deleteStyleGuide('${guide.id}')" class="delete-btn">🗑️ Delete</button>
        </div>
        <div style="margin-top: 10px;">
          ${guide.rules.map(rule => `
            <div style="font-size: 0.9em; color: #666; margin: 5px 0; padding: 5px; background: #f5f5f5; border-radius: 4px;">
              • ${rule.description}
            </div>
          `).join('')}
        </div>
      </div>
    `).join('');
  } catch (error) {
    console.error('Error loading guides:', error);
  }
}

async function deleteStyleGuide(guideId) {
  if (!confirm('Delete this style guide?')) return;

  try {
    const data = await chrome.storage.local.get('styleGuides');
    const guides = (data.styleGuides || []).filter(g => g.id !== guideId);
    await chrome.storage.local.set({ styleGuides: guides });

    loadStyleGuides();
    populateGuideSelector();
    alert('✅ Style guide deleted');
  } catch (error) {
    alert('Error: ' + error.message);
  }
}

async function populateGuideSelector() {
  try {
    const data = await chrome.storage.local.get('styleGuides');
    const guides = data.styleGuides || [];

    const selector = document.getElementById('guideSelector');
    const currentValue = selector.value;

    selector.innerHTML = '<option value="">-- Choose a style guide --</option>' +
      guides.map(g => `<option value="${g.id}">${g.name}</option>`).join('');

    if (currentValue && guides.some(g => g.id === currentValue)) {
      selector.value = currentValue;
    }
  } catch (error) {
    console.error('Error populating selector:', error);
  }
}

async function testStyleGuide() {
  const guideId = document.getElementById('guideSelector').value;
  const text = document.getElementById('testText').value.trim();

  if (!guideId) {
    alert('Please select a style guide');
    return;
  }

  if (!text) {
    alert('Please enter text to test');
    return;
  }

  try {
    const response = await chrome.runtime.sendMessage({
      action: 'enforceTeamStandards',
      content: text,
      guideId: guideId
    });

    if (response.success) {
      const result = response.result;
      let html = `
        <div style="padding: 15px; background: #f5f5f5; border-radius: 6px;">
          <h4 style="margin-bottom: 10px;">📊 Compliance Report</h4>
          <p><strong>Guide:</strong> ${result.guideName}</p>
          <p><strong>Compliance Score:</strong> <span style="color: ${result.compliance >= 80 ? '#4caf50' : '#ff9800'}; font-size: 1.2em; font-weight: bold;">${result.compliance}/100</span></p>
          <p><strong>Status:</strong> ${result.status === 'compliant' ? '✅ Compliant' : '⚠️ Violations Found'}</p>
      `;

      if (result.violations && result.violations.length > 0) {
        html += `<h4 style="margin-top: 15px; margin-bottom: 10px;">⚠️ Issues (${result.violations.length})</h4>`;
        html += result.violations.map(v => `
          <div style="padding: 10px; background: white; border-left: 3px solid #ff9800; border-radius: 4px; margin-bottom: 8px;">
            <p style="margin: 0; color: #666;"><strong>${v.rule}</strong></p>
            <p style="margin: 5px 0 0; color: #999; font-size: 0.9em;">${v.suggestion || 'Review and correct'}</p>
          </div>
        `).join('');
      } else {
        html += '<p style="margin-top: 10px; color: #4caf50;">✅ No violations found!</p>';
      }

      html += '</div>';

      document.getElementById('testResults').style.display = 'block';
      document.getElementById('resultsContent').innerHTML = html;
    } else {
      alert('Error: ' + response.error);
    }
  } catch (error) {
    alert('Test failed: ' + error.message);
  }
}
