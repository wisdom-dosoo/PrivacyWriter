// Writing Profile Manager

document.addEventListener('DOMContentLoaded', async () => {
  await loadAndDisplayProfile();
});

async function loadAndDisplayProfile() {
  const data = await chrome.storage.local.get(['writingProfile', 'history']);
  const profile = data.writingProfile;
  const history = data.history || [];

  if (!profile || !profile.characteristics) {
    document.getElementById('emptyState').style.display = 'block';
    document.getElementById('profileContent').style.display = 'none';
    return;
  }

  document.getElementById('emptyState').style.display = 'none';
  document.getElementById('profileContent').style.display = 'block';

  // Update stats
  document.getElementById('sampleSize').textContent = profile.sampleSize || history.length;
  document.getElementById('profileReady').textContent = (profile.confidence && profile.confidence > 60) ? '✅' : '⚠️';
  if (profile.lastUpdated) {
    document.getElementById('lastUpdated').textContent = new Date(profile.lastUpdated).toLocaleDateString();
  }

  const char = profile.characteristics || {};

  // Display characteristics
  document.getElementById('avgSentenceLength').textContent = `${char.avgSentenceLength || '15-25'} words per sentence - ${char.sentenceLengthAssessment || 'Natural and varied'}`;
  document.getElementById('vocabLevel').textContent = `${char.vocabLevel || 'Professional'} - ${char.vocabAssessment || 'Balanced use of simple and complex terms'}`;
  document.getElementById('writingStyle').textContent = char.style || 'Analytical and professional';

  // Display strengths
  const strengthsList = document.getElementById('strengthsList');
  if (char.strengths && char.strengths.length > 0) {
    strengthsList.innerHTML = char.strengths.map(s => `
      <div class="profile-card" style="border-left-color: #10b981; background: #d1fae5; margin-bottom: 10px;">
        <p>✅ ${s}</p>
      </div>
    `).join('');
  } else {
    strengthsList.innerHTML = '<p style="color: #666;">Your unique strengths will appear after more samples.</p>';
  }

  // Display improvements
  const improvementList = document.getElementById('improvementList');
  if (char.improvements && char.improvements.length > 0) {
    improvementList.innerHTML = char.improvements.map(imp => `
      <div class="profile-card" style="border-left-color: #f59e0b; background: #fef3c7; margin-bottom: 10px;">
        <p>🎯 ${imp}</p>
      </div>
    `).join('');
  } else {
    improvementList.innerHTML = '<p style="color: #666;">Areas for growth will appear after more samples.</p>';
  }

  // Display patterns
  const patternsList = document.getElementById('patternsList');
  if (char.patterns && Object.keys(char.patterns).length > 0) {
    let patternsHtml = '';
    for (const [pattern, count] of Object.entries(char.patterns)) {
      patternsHtml += `<span class="tag">${pattern} (${count})</span>`;
    }
    patternsList.innerHTML = patternsHtml;
  } else {
    patternsList.innerHTML = '<p style="color: #666;">Common patterns in your writing will appear after more analysis.</p>';
  }

  // Personalization tip
  const tipMessages = [
    'The AI customizes all suggestions based on your profile to preserve your unique voice.',
    'Your writing profile prevents over-correction and respects your personal style preferences.',
    'This profile helps the AI give you more natural, personalized writing suggestions.',
    'The more you use PrivacyWriter, the better your personalized profile becomes.'
  ];
  document.getElementById('personalizationTip').textContent = tipMessages[Math.floor(Math.random() * tipMessages.length)];
}

async function buildProfile() {
  document.querySelector('button').disabled = true;
  document.querySelector('button').textContent = '🔄 Building...';

  try {
    // Request profile building from background
    const response = await new Promise(resolve => 
      chrome.runtime.sendMessage({ action: 'buildWritingProfile' }, resolve)
    );

    if (response.success) {
      await loadAndDisplayProfile();
      alert('✅ Writing profile generated!');
    } else {
      alert('❌ ' + (response.error || 'Failed to build profile'));
    }
  } catch (error) {
    alert('❌ Error: ' + error.message);
  } finally {
    document.querySelector('button').disabled = false;
    document.querySelector('button').textContent = '🔨 Generate Profile';
  }
}

async function exportProfile() {
  const data = await chrome.storage.local.get('writingProfile');
  const profile = data.writingProfile;

  if (!profile) {
    alert('No profile to export');
    return;
  }

  const json = JSON.stringify({
    exported: new Date().toISOString(),
    profile: profile
  }, null, 2);

  downloadFile('writing-profile.json', json, 'application/json');
}

async function resetProfile() {
  if (!confirm('⚠️ Are you sure? This will delete your writing profile.')) return;

  await chrome.storage.local.set({ writingProfile: null });
  document.getElementById('emptyState').style.display = 'block';
  document.getElementById('profileContent').style.display = 'none';
  alert('✅ Profile reset');
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
