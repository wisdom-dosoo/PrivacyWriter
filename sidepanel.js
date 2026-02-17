// PrivacyWriter Side Panel JavaScript

document.addEventListener('DOMContentLoaded', async () => {
  await initializePopup();
  await populateProLanguages();
  setupEventListeners();
  setupNavigation();
  await checkAIStatus();
  await loadAnalytics();
  await updateUsageDisplay();
});

// State
let currentAction = null;
let currentResult = null;

// Initialize popup
async function initializePopup() {
  const { isPro, plan } = await chrome.storage.local.get(['isPro', 'plan']);
  
  if (isPro) {
    document.getElementById('proBadge').classList.remove('hidden');
    document.getElementById('upgradeBanner').classList.add('hidden');
    
    // Unlock Standard Pro features
    const standardProCards = ['toolCoach', 'toolCustom', 'toolHistory', 'toolProfile', 'toolAnalytics'];
    standardProCards.forEach(id => {
      const card = document.getElementById(id);
      if (card) {
        card.classList.remove('locked');
        const tag = card.querySelector('.pro-tag');
        if (tag) tag.classList.add('hidden');
      }
    });

    // Unlock Pro Plus features
    const isProPlus = ['pro_plus', 'team', 'enterprise'].includes(plan);
    if (isProPlus) {
      const proPlusCards = ['toolBatch', 'toolStyle', 'toolApi', 'toolProofread', 'toolContextual', 'toolTeam'];
      proPlusCards.forEach(id => {
        const card = document.getElementById(id);
        if (card) {
          card.classList.remove('locked');
          const tag = card.querySelector('.pro-tag');
          if (tag) tag.classList.add('hidden');
        }
      });
    }
  }
}

// Setup Navigation Tabs
function setupNavigation() {
  const tabs = document.querySelectorAll('.nav-tab');
  const contents = document.querySelectorAll('.tab-content');
  
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetTab = tab.dataset.tab;
      
      // Remove active class from all tabs and contents
      tabs.forEach(t => t.classList.remove('active'));
      contents.forEach(c => c.classList.remove('active'));
      
      // Add active class to clicked tab and corresponding content
      tab.classList.add('active');
      const content = document.getElementById(targetTab);
      if (content) {
        content.classList.add('active');
      }
    });
  });
}

// Setup event listeners
function setupEventListeners() {
  const addListener = (id, event, handler) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener(event, handler);
  };

  // Text input
  const inputText = document.getElementById('inputText');
  if (inputText) {
    inputText.addEventListener('input', () => {
      const charCount = document.getElementById('charCount');
      if (charCount) charCount.textContent = inputText.value.length;
    });
  }
  
  // Action buttons
  addListener('btnGrammar', 'click', () => handleAction('grammar'));
  addListener('btnRewrite', 'click', () => handleAction('rewrite'));
  addListener('btnSummarize', 'click', () => handleAction('summarize'));
  addListener('btnTranslate', 'click', () => handleAction('translate'));
  
  // Tone buttons
  document.querySelectorAll('.tone-btn').forEach(btn => {
    btn.addEventListener('click', () => executeRewrite(btn.dataset.tone));
  });
  
  // Language buttons
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => executeTranslate(btn.dataset.lang));
  });
  
  // Pro Language Dropdown
  const proLangSelect = document.getElementById('proLanguageSelect');
  if (proLangSelect) {
    proLangSelect.addEventListener('change', () => {
      if (proLangSelect.value) executeTranslate(proLangSelect.value);
    });
  }
  
  // Output actions
  addListener('copyResult', 'click', copyResult);
  addListener('replaceOriginal', 'click', replaceOriginal);
  
  // Upgrade button
  addListener('btnUpgrade', 'click', upgradeToPro);
  
  // Tool cards
  addListener('toolCompose', 'click', () => openTool('compose'));
  addListener('toolExpand', 'click', () => openTool('expand'));
  addListener('toolSimplify', 'click', () => openTool('simplify'));
  addListener('toolApi', 'click', generateApiKey);
  addListener('toolCoach', 'click', runWritingCoach);
  addListener('toolCustom', 'click', setupCustomPrompt);
  addListener('toolHistory', 'click', showHistory);
  addListener('toolProofread', 'click', runAdvancedProofreading);
  addListener('toolContextual', 'click', runContextualAssistant);
  addListener('toolProfile', 'click', viewWritingProfile);
  addListener('toolAnalytics', 'click', openAnalyticsDashboard);
  
  const btnSettings = document.getElementById('btnSettings');
  if (btnSettings) {
    btnSettings.addEventListener('click', () => window.open('public/settings.html', '_blank'));
  }

  // Handle inline links in status messages (CSP fix)
  const statusMessage = document.getElementById('statusMessage');
  if (statusMessage) {
    statusMessage.addEventListener('click', (e) => {
      if (e.target.classList.contains('inline-link')) {
        e.preventDefault();
        chrome.tabs.create({ url: 'chrome://flags' });
      }
    });
  }
}

// Handle action button click
function handleAction(action) {
  const text = document.getElementById('inputText').value.trim();
  
  if (!text) {
    showMessage('Please enter some text first', true);
    return;
  }
  
  currentAction = action;
  
  // Reset action buttons
  document.querySelectorAll('.action-btn').forEach(btn => btn.classList.remove('active'));
  document.getElementById(`btn${action.charAt(0).toUpperCase() + action.slice(1)}`).classList.add('active');
  
  // Hide all option sections
  document.getElementById('toneSection').classList.add('hidden');
  document.getElementById('langSection').classList.add('hidden');
  
  // Show relevant options or execute directly
  switch (action) {
    case 'grammar':
      executeGrammarCheck(text);
      break;
    case 'rewrite':
      document.getElementById('toneSection').classList.remove('hidden');
      break;
    case 'summarize':
      executeSummarize(text);
      break;
    case 'translate':
      document.getElementById('langSection').classList.remove('hidden');
      break;
  }
}

// Execute grammar check
async function executeGrammarCheck(text) {
  showLoading(true);
  hideOutput();
  
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'checkGrammar',
      text: text
    });
    
    if (response.success) {
      currentResult = response.result;
      showOutput(response.result, 'Grammar Corrected');
    } else {
      showMessage(response.error || 'Error checking grammar', true);
      await showAIDiagnosticsHelp();
    }
  } catch (error) {
    showMessage('Error: ' + error.message, true);
    await showAIDiagnosticsHelp();
  } finally {
    showLoading(false);
    await updateUsageDisplay();
  }
}

// Execute rewrite
async function executeRewrite(tone) {
  const text = document.getElementById('inputText').value.trim();
  
  showLoading(true);
  hideOutput();
  
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'rewrite',
      text: text,
      style: tone
    });
    
    if (response.success) {
      currentResult = response.result;
      const toneNames = {
        'more-formal': 'Professional',
        'more-casual': 'Casual',
        'shorter': 'Shortened',
        'longer': 'Expanded',
        'executive': 'Executive',
        'academic': 'Academic',
        'persuasive': 'Persuasive',
        'empathetic': 'Empathetic',
        'humorous': 'Humorous',
        'critical': 'Critical'
      };
      showOutput(response.result, `${toneNames[tone]} Version`);
    } else {
      showMessage(response.error || 'Error rewriting text', true);
      await showAIDiagnosticsHelp();
    }
  } catch (error) {
    showMessage('Error: ' + error.message, true);
    await showAIDiagnosticsHelp();
  } finally {
    showLoading(false);
    await updateUsageDisplay();
  }
}

// Execute summarize
async function executeSummarize(text) {
  showLoading(true);
  hideOutput();
  
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'summarize',
      text: text
    });
    
    if (response.success) {
      currentResult = response.result;
      showOutput(response.result, 'Summary');
    } else {
      showMessage(response.error || 'Error summarizing text', true);
      await showAIDiagnosticsHelp();
    }
  } catch (error) {
    showMessage('Error: ' + error.message, true);
    await showAIDiagnosticsHelp();
  } finally {
    showLoading(false);
    await updateUsageDisplay();
  }
}

// Execute translate
async function executeTranslate(targetLang) {
  const text = document.getElementById('inputText').value.trim();
  
  showLoading(true);
  hideOutput();
  
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'translate',
      text: text,
      targetLang: targetLang
    });
    
    if (response.success) {
      currentResult = response.result;
      const langNames = {
        'es': 'Spanish', 'fr': 'French', 'de': 'German',
        'zh': 'Chinese', 'ja': 'Japanese', 'pt': 'Portuguese'
      };
      showOutput(response.result, `Translated to ${langNames[targetLang]}`);
    } else {
      showMessage(response.error || 'Error translating text', true);
      await showAIDiagnosticsHelp();
    }
  } catch (error) {
    showMessage('Error: ' + error.message, true);
    await showAIDiagnosticsHelp();
  } finally {
    showLoading(false);
    await updateUsageDisplay();
  }
}

// Show output
function showOutput(text, title = 'Result') {
  const outputSection = document.getElementById('outputSection');
  const outputText = document.getElementById('outputText');
  
  outputText.textContent = text;
  outputSection.classList.remove('hidden');
  
  // Update header title
  outputSection.querySelector('h3').textContent = title;

  // Ensure replace button is visible by default
  document.getElementById('replaceOriginal').classList.remove('hidden');
}

// Hide output
function hideOutput() {
  document.getElementById('outputSection').classList.add('hidden');
}

// Copy result to clipboard
async function copyResult() {
  if (!currentResult) return;
  
  try {
    await navigator.clipboard.writeText(currentResult);
    showMessage('✅ Copied to clipboard!');
  } catch (error) {
    showMessage('Failed to copy', true);
  }
}

// Replace original text with result
function replaceOriginal() {
  if (!currentResult) return;
  
  document.getElementById('inputText').value = currentResult;
  document.getElementById('charCount').textContent = currentResult.length;
  hideOutput();
  showMessage('✅ Text replaced!');
}

// Show/hide loading
function showLoading(show) {
  const loading = document.getElementById('loading');
  if (show) {
    loading.classList.remove('hidden');
  } else {
    loading.classList.add('hidden');
  }
}

// Display AI diagnostics and setup help
async function showAIDiagnosticsHelp() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'getDiagnostics' });
    
    if (response.success && response.diagnostics) {
      const diag = response.diagnostics;
      const missingFlags = diag.requiredFlags.filter((flag, idx) => {
        const apis = ['prompt', 'optimizer', 'summarizer', 'rewriter', 'translator'];
        return !diag.apis[apis[idx]];
      });
      
      if (missingFlags.length > 0) {
        const flagsText = missingFlags.slice(0, 2).join(', ');
        const message = 
          'Chrome AI requires setup:\n' +
          `Missing flags: ${flagsText}\n` +
          'Click to open chrome://flags';
        
        showMessage(message, true);
      }
    }
  } catch (error) {
    console.error('Error getting diagnostics:', error);
  }
}

// Show message
function showMessage(message, isError = false) {
  const statusEl = document.getElementById('statusMessage');
  statusEl.classList.remove('hidden');
  
  if (isError) {
    statusEl.classList.add('error');
    // Format multi-line error messages (for Chrome flag setup instructions)
    if (message.includes('\n')) {
      statusEl.innerHTML = message
        .split('\n')
        .map(line => {
          if (line.includes('chrome://flags')) {
            return `<div><a href="#" class="inline-link">chrome://flags</a></div>`;
          }
          return `<div>${line}</div>`;
        })
        .join('');
      // Extend timeout for longer messages
      setTimeout(() => {
        statusEl.classList.add('hidden');
      }, 5000);
    } else {
      statusEl.textContent = message;
      setTimeout(() => {
        statusEl.classList.add('hidden');
      }, 3000);
    }
  } else {
    statusEl.classList.remove('error');
    statusEl.textContent = message;
    setTimeout(() => {
      statusEl.classList.add('hidden');
    }, 3000);
  }
}

// Check AI status
async function checkAIStatus() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'checkCapabilities' });
    const { isPro, apiKeys = {} } = await chrome.storage.local.get(['isPro', 'apiKeys']);

    if (response.success) {
      const caps = response.capabilities;

      updateStatusBadge('statusNano', caps.prompt);
      updateStatusBadge('statusGrammar', caps.proofreader || caps.prompt);
      updateStatusBadge('statusTranslate', caps.translator || caps.prompt);

      // NEW: Update main AI status badge
      let statusText = '';
      let statusTitle = '';

      if (caps.prompt) {
        statusText = '✅ Chrome AI Ready';
        statusTitle = 'Using Chrome\'s Gemini Nano\n(fastest, on-device)';
      } else if (isPro && apiKeys?.claude) {
        statusText = '⚡ Claude API Ready';
        statusTitle = 'Using Claude API as fallback\n(Pro feature)';
      } else {
        statusText = '📥 Local Models Available';
        statusTitle = 'Will use local Transformers.js\n(on-device, ~600MB)';
      }

      const badge = document.getElementById('aiStatusBadge');
      if (badge) {
        badge.textContent = statusText;
        badge.title = statusTitle;
      }
    }
  } catch (error) {
    console.error('Error checking AI status:', error);
    updateStatusBadge('statusNano', false);
    updateStatusBadge('statusGrammar', false);
    updateStatusBadge('statusTranslate', false);

    const badge = document.getElementById('aiStatusBadge');
    if (badge) {
      badge.textContent = '⚠️ Setup Required';
      badge.title = 'No AI available. Visit chrome://flags or add Claude API key in Settings.';
    }
  }
}

function updateStatusBadge(elementId, isReady) {
  const badge = document.getElementById(elementId);
  badge.classList.remove('checking', 'ready', 'error');
  
  if (isReady) {
    badge.textContent = 'Ready';
    badge.classList.add('ready');
  } else {
    badge.textContent = 'Enable in chrome://flags';
    badge.classList.add('error');
  }
}

// Load analytics
async function loadAnalytics() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'getAnalytics' });
    
    if (response.success) {
      const { analytics } = response;
      
      document.getElementById('statWords').textContent = 
        formatNumber(analytics.wordsProcessed || 0);
      document.getElementById('statGrammar').textContent = 
        analytics.grammarChecks || 0;
      document.getElementById('statRewrites').textContent = 
        analytics.rewrites || 0;
      document.getElementById('statTranslations').textContent = 
        analytics.translations || 0;
    }
  } catch (error) {
    console.error('Error loading analytics:', error);
  }
}

// Update usage display
async function updateUsageDisplay() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'getUsage' });
    
    if (response.success) {
      const { usage, isPro, limit } = response;
      const remaining = isPro ? '∞' : Math.max(0, limit - usage.count);
      
      document.getElementById('usageCount').textContent = 
        isPro ? 'Unlimited (Pro)' : `${remaining}/${limit} left today`;
    }
  } catch (error) {
    console.error('Error updating usage:', error);
  }
}

// Format large numbers
function formatNumber(num) {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

// Open tool
function openTool(tool) {
  const inputText = document.getElementById('inputText');
  
  switch (tool) {
    case 'compose':
      inputText.value = '';
      inputText.placeholder = 'Describe the email you want to compose (e.g., "Request meeting with manager about project timeline")';
      inputText.focus();
      break;
      
    case 'expand':
      inputText.placeholder = 'Enter bullet points or brief notes to expand into full paragraphs...';
      inputText.focus();
      break;
      
    case 'simplify':
      inputText.placeholder = 'Paste complex text to simplify...';
      inputText.focus();
      break;
  }
  
  // Switch to Write tab
  document.querySelector('[data-tab="write"]').click();
}

// Generate API Key (Pro Plus)
async function generateApiKey() {
  const { isPro, plan } = await chrome.storage.local.get(['isPro', 'plan']);
  const isProPlus = isPro && ['pro_plus', 'team', 'enterprise'].includes(plan);

  if (!isProPlus) return;

  const dummyKey = 'pl_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  
  currentResult = dummyKey;
  
  // Switch to write tab to show output
  document.querySelector('[data-tab="write"]').click();
  
  const output = `🔑 API KEY GENERATED\n` +
                 `${dummyKey}\n\n` +
                 `📡 API ENDPOINT\n` +
                 `https://api.privacywriter.com/v1\n\n` +
                 `📚 DOCUMENTATION\n` +
                 `https://privacywriter.com/docs/api`;
                 
  showOutput(output, 'Team API Access');
  
  // Hide replace button for API keys
  document.getElementById('replaceOriginal').classList.add('hidden');
  
  showMessage('✅ API Key Generated');
}

// Upgrade to Pro
function upgradeToPro() {
  chrome.tabs.create({
    url: 'public/index.html#/upgrade?source=extension'
  });
}

// Populate Pro languages dropdown
async function populateProLanguages() {
  const select = document.getElementById('proLanguageSelect');
  if (!select || typeof PRO_LANGUAGES === 'undefined') return;

  const { isPro } = await chrome.storage.local.get('isPro');

  if (!isPro) {
    select.disabled = true;
    select.style.opacity = '0.6';
    select.style.cursor = 'not-allowed';
    const defaultOption = select.querySelector('option');
    if (defaultOption) {
      defaultOption.textContent = "🔒 50+ Languages (Pro Only)";
    }
    return;
  }

  // Sort languages by name
  const sortedLangs = Object.entries(PRO_LANGUAGES)
    .sort(([,a], [,b]) => a.localeCompare(b));

  sortedLangs.forEach(([code, name]) => {
    const option = document.createElement('option');
    option.value = code;
    option.textContent = name;
    select.appendChild(option);
  });
}

// Run Writing Coach
async function runWritingCoach() {
  const text = document.getElementById('inputText').value.trim();
  
  // Switch to write tab
  document.querySelector('[data-tab="write"]').click();

  if (!text) {
    showMessage('Please enter text to analyze first', true);
    document.getElementById('inputText').focus();
    return;
  }
  
  showLoading(true);
  hideOutput();
  
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'analyzeWriting',
      text: text
    });
    
    if (response.success) {
      // Enhanced display for Writing Coach with score visualization
      const analysis = response.result;
      if (typeof analysis === 'object' && analysis.score !== undefined) {
        displayWritingCoachResults(analysis);
      } else {
        showOutput(analysis, 'Writing Coach Report');
      }
    } else {
      showMessage(response.error || 'Analysis failed', true);
      await showAIDiagnosticsHelp();
    }
  } catch (error) {
    showMessage('Error: ' + error.message, true);
  } finally {
    showLoading(false);
  }
}

// Display Writing Coach analysis with visual score
function displayWritingCoachResults(analysis) {
  const outputSection = document.getElementById('outputSection');
  const outputText = document.getElementById('outputText');
  const scoreColor = analysis.score >= 75 ? '#10b981' : analysis.score >= 50 ? '#f59e0b' : '#ef4444';
  
  let html = `
    <div style="margin-bottom: 16px;">
      <h4 style="margin: 0 0 12px; color: #333; font-size: 14px;">Writing Quality Score</h4>
      <div style="display: flex; align-items: center; gap: 12px;">
        <div style="flex: 1; height: 12px; background: #e5e7eb; border-radius: 6px; overflow: hidden;">
          <div style="height: 100%; width: ${analysis.score}%; background: ${scoreColor}; transition: width 0.3s;"></div>
        </div>
        <span style="font-weight: bold; font-size: 18px; color: ${scoreColor};">${analysis.score}/100</span>
      </div>
    </div>
  `;
  
  if (analysis.feedback) {
    html += `<h4 style="margin: 12px 0 8px; color: #333; font-size: 14px;">Feedback</h4>`;
    html += `<p style="margin: 0 0 12px; color: #555; font-size: 13px; line-height: 1.6;">${analysis.feedback}</p>`;
  }
  
  if (analysis.issues && Array.isArray(analysis.issues) && analysis.issues.length > 0) {
    html += `<h4 style="margin: 12px 0 8px; color: #333; font-size: 14px;">Areas for Improvement</h4>`;
    html += `<ul style="margin: 0; padding-left: 20px; color: #555; font-size: 13px;">`;
    analysis.issues.slice(0, 5).forEach(issue => {
      html += `<li style="margin-bottom: 4px;">${issue}</li>`;
    });
    html += `</ul>`;
  }
  
  if (analysis.strengths && Array.isArray(analysis.strengths) && analysis.strengths.length > 0) {
    html += `<h4 style="margin: 12px 0 8px; color: #333; font-size: 14px;">✅ Strengths</h4>`;
    html += `<ul style="margin: 0; padding-left: 20px; color: #10b981; font-size: 13px;">`;
    analysis.strengths.forEach(strength => {
      html += `<li style="margin-bottom: 4px;">${strength}</li>`;
    });
    html += `</ul>`;
  }
  
  outputText.innerHTML = html;
  outputSection.classList.remove('hidden');
  outputSection.querySelector('h3').textContent = '📊 Writing Coach Analysis';
  document.getElementById('replaceOriginal').classList.add('hidden');
  currentResult = null;
}

// Setup Custom Prompt
function setupCustomPrompt() {
  const inputText = document.getElementById('inputText');
  inputText.value = '';
  inputText.placeholder = 'Enter your custom prompt here...';
  document.querySelector('[data-tab="write"]').click();
  inputText.focus();
  showMessage('Custom Prompt mode ready');
}

// Show History
async function showHistory() {
  document.querySelector('[data-tab="write"]').click();
  hideOutput();
  
  const { history } = await chrome.storage.local.get('history');
  
  if (!history || history.length === 0) {
    showMessage('No history found', true);
    return;
  }
  
  const historyText = history.map(h => {
    const date = new Date(h.date).toLocaleDateString();
    return `[${date}] ${h.type.toUpperCase()}\nInput: ${h.original}\nResult: ${h.result}\n-------------------`;
  }).join('\n');
  
  showOutput(historyText, 'History (Last 100 items)');
}

// ===== NEW PRO ADVANCED FEATURES HANDLERS =====

// Advanced Proofreading
async function runAdvancedProofreading() {
  const text = document.getElementById('inputText').value.trim();
  
  document.querySelector('[data-tab="write"]').click();

  if (!text) {
    showMessage('Please enter text to proofread first', true);
    document.getElementById('inputText').focus();
    return;
  }
  
  showLoading(true);
  hideOutput();
  
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'advancedProofread',
      text: text
    });
    
    if (response.success) {
      const result = response.result;
      let output = `📊 PROOFREADING REPORT\n\n`;
      output += `Severity: ${result.severity.toUpperCase()}\n`;
      output += `Total Issues Found: ${result.totalIssues}\n\n`;
      
      if (result.issues && result.issues.length > 0) {
        output += `ISSUES:\n`;
        result.issues.forEach((issue, i) => {
          output += `\n${i + 1}. [${issue.type}]\n   Issue: ${issue.issue}\n   Suggestion: ${issue.suggestion}`;
        });
      }
      
      output += `\n\n${result.summary}`;
      showOutput(output, 'Advanced Proofreading Results');
    } else {
      showMessage(response.error || 'Proofreading failed', true);
    }
  } catch (error) {
    showMessage('Error: ' + error.message, true);
  } finally {
    showLoading(false);
  }
}

// Contextual Writing Assistant
async function runContextualAssistant() {
  document.querySelector('[data-tab="write"]').click();
  
  const text = document.getElementById('inputText').value.trim();
  if (!text) {
    showMessage('Please enter text to analyze', true);
    return;
  }

  // Show context selector
  const contexts = [
    { id: 'professional', label: '💼 Professional/Business' },
    { id: 'academic', label: '📚 Academic/Scholarly' },
    { id: 'casual', label: '😊 Casual/Friendly' },
    { id: 'technical', label: '⚙️ Technical/Documentation' },
    { id: 'creative', label: '✨ Creative/Fiction' },
    { id: 'social', label: '📱 Social Media' },
    { id: 'legal', label: '⚖️ Legal/Formal' },
    { id: 'marketing', label: '🎯 Marketing/Sales' }
  ];

  let contextHtml = 'Select writing context:\n\n';
  contexts.forEach(c => {
    contextHtml += `${c.label}\n`;
  });

  const selectedContext = prompt(contextHtml + '\nEnter context id (e.g., professional):', 'professional');
  
  if (!selectedContext) return;

  showLoading(true);
  hideOutput();

  try {
    const response = await chrome.runtime.sendMessage({
      action: 'analyzeContext',
      text: text,
      contextType: selectedContext
    });
    
    if (response.success) {
      const result = response.result;
      let output = `🎯 CONTEXTUAL ANALYSIS\n\n`;
      output += `Context: ${result.contextType}\n`;
      output += `Score: ${result.overallScore}/100\n\n`;
      
      if (result.issues && result.issues.length > 0) {
        output += `⚠️ ISSUES (${result.issues.length}):\n`;
        result.issues.forEach(issue => {
          output += `• ${issue}\n`;
        });
      } else {
        output += `✅ No major issues detected!\n`;
      }
      
      if (result.suggestions && result.suggestions.length > 0) {
        output += `\n💡 SUGGESTIONS:\n`;
        result.suggestions.forEach(sug => {
          output += `• ${sug}\n`;
        });
      }
      
      showOutput(output, `${result.contextType} - Writing Analysis`);
    } else {
      showMessage(response.error || 'Analysis failed', true);
    }
  } catch (error) {
    showMessage('Error: ' + error.message, true);
  } finally {
    showLoading(false);
  }
}

// Writing Profile
async function viewWritingProfile() {
  document.querySelector('[data-tab="write"]').click();
  hideOutput();
  
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'getWritingProfile'
    });

    if (response.success && response.data) {
      const profile = response.data;
      let output = `👤 YOUR WRITING PROFILE\n\n`;
      output += `Total Corrections: ${profile.totalItems}\n`;
      output += `Profile Created: ${new Date(profile.createdAt).toLocaleDateString()}\n\n`;
      
      output += `📊 STATISTICS:\n`;
      output += `• Average Original Length: ${profile.stats.averageOriginalLength} chars\n`;
      output += `• Average Result Length: ${profile.stats.averageResultLength} chars\n`;
      output += `• Grammar Checks: ${profile.stats.grammarCheckFrequency}%\n`;
      output += `• Rewrites: ${profile.stats.rewriteFrequency}%\n`;
      output += `• Translations: ${profile.stats.translateFrequency}%\n`;
      output += `• Summaries: ${profile.stats.summarizeFrequency}%\n\n`;
      
      output += `🎯 PATTERNS:\n`;
      output += `• Vocabulary Level: ${profile.patterns.vocabularyLevel}\n`;
      output += `• Sentence Preference: ${profile.patterns.sentencePreference}\n`;
      output += `• Formality Score: ${(profile.patterns.formalityScore * 100).toFixed(0)}/100\n`;
      output += `• Unique Words: ${profile.patterns.uniqueWords}\n\n`;
      
      if (profile.recommendations.length > 0) {
        output += `💡 RECOMMENDATIONS:\n`;
        profile.recommendations.forEach(rec => {
          output += `• ${rec}\n`;
        });
      }

      showOutput(output, 'Your Writing Profile');
    } else {
      showMessage('No profile yet. Build a profile by using more features.', true);
      
      showLoading(true);
      const buildResp = await chrome.runtime.sendMessage({
        action: 'buildWritingProfile'
      });
      showLoading(false);
      
      if (buildResp.success) {
        showMessage('✅ Writing profile built! Check again.', false);
        setTimeout(() => viewWritingProfile(), 1000);
      }
    }
  } catch (error) {
    showMessage('Error: ' + error.message, true);
  }
}

// Open Analytics Dashboard
function openAnalyticsDashboard() {
  chrome.tabs.create({ url: chrome.runtime.getURL('analytics-dashboard.html') });
}