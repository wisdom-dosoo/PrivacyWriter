// PrivacyWriter Content Script
// Handles: Inline text selection tools, result display, text replacement

console.log('PrivacyWriter Content Script Loaded');

// State
let selectionToolbar = null;
let resultPopup = null;
let selectedText = '';
let selectedRange = null;
let selectedElement = null;
let currentToolMode = 'default';

// Tool Configurations for Quick Actions
const TOOL_MODES = {
  'default': [
    { action: 'grammar', icon: '✏️', title: 'Check Grammar' },
    { action: 'rewrite', icon: '🔄', title: 'Rewrite' },
    { action: 'summarize', icon: '📋', title: 'Summarize' },
    { action: 'translate', icon: '🌐', title: 'Translate' }
  ],
  'compose-email': [
    { action: 'email-professional', icon: '👔', title: 'Professional Email' },
    { action: 'email-request', icon: '🙏', title: 'Request Email' },
    { action: 'email-follow-up', icon: '↩️', title: 'Follow-up Email' },
    { action: 'exit-mode', icon: '🔙', title: 'Back to Default' }
  ],
  'expand-ideas': [
    { action: 'expand', icon: '➕', title: 'Expand Ideas' },
    { action: 'blog-intro', icon: '📝', title: 'Blog Intro' },
    { action: 'exit-mode', icon: '🔙', title: 'Back to Default' }
  ],
  'simplify-language': [
    { action: 'simplify', icon: '👶', title: 'Simplify' },
    { action: 'summarize', icon: '📋', title: 'Summarize' },
    { action: 'exit-mode', icon: '🔙', title: 'Back to Default' }
  ],
  'writing-coach': [
    { action: 'analyze-writing', icon: '🧠', title: 'Analyze Quality' },
    { action: 'grammar', icon: '✏️', title: 'Fix Grammar' },
    { action: 'exit-mode', icon: '🔙', title: 'Back to Default' }
  ],
  'custom-prompts': [
    { action: 'rewrite', icon: '✨', title: 'Run Custom' },
    { action: 'exit-mode', icon: '🔙', title: 'Back to Default' }
  ]
};

// Initialize
init();

function init() {
  createSelectionToolbar();
  createResultPopup();
  setupEventListeners();
}

// Create floating toolbar for text selection
function createSelectionToolbar() {
  selectionToolbar = document.createElement('div');
  selectionToolbar.id = 'privacylens-toolbar';
  // Initial render
  updateToolbarButtons();

  // Prevent toolbar clicks from clearing selection
  selectionToolbar.addEventListener('mousedown', (e) => {
    e.preventDefault();
    e.stopPropagation();
  });

  document.body.appendChild(selectionToolbar);
}

// Update toolbar buttons based on current mode
function updateToolbarButtons() {
  const tools = TOOL_MODES[currentToolMode] || TOOL_MODES['default'];
  selectionToolbar.innerHTML = tools.map(tool => 
    `<button data-action="${tool.action}" title="${tool.title}">${tool.icon}</button>`
  ).join('');
}

// Create result popup
function createResultPopup() {
  resultPopup = document.createElement('div');
  resultPopup.id = 'privacylens-result';
  resultPopup.innerHTML = `
    <div class="pl-result-header">
      <span class="pl-result-title">Result</span>
      <button class="pl-close-btn">×</button>
    </div>
    <div class="pl-result-content"></div>
    <div class="pl-result-actions">
      <button class="pl-copy-btn">📋 Copy</button>
      <button class="pl-replace-btn">✅ Replace</button>
    </div>
    <div class="pl-privacy-note">🔒 Processed locally on your device</div>
  `;
  document.body.appendChild(resultPopup);
  
  // Event listeners for popup
  resultPopup.querySelector('.pl-close-btn').addEventListener('click', hideResultPopup);
  resultPopup.querySelector('.pl-copy-btn').addEventListener('click', copyResult);
  resultPopup.querySelector('.pl-replace-btn').addEventListener('click', replaceSelection);

  // Prevent popup clicks from stealing focus (crucial for replacement)
  resultPopup.addEventListener('mousedown', (e) => {
    e.preventDefault();
    e.stopPropagation();
  });
}

// Setup event listeners
function setupEventListeners() {
  // Show toolbar on text selection
  document.addEventListener('mouseup', handleTextSelection);
  document.addEventListener('keyup', handleTextSelection);
  
  // Hide toolbar when clicking elsewhere
  document.addEventListener('mousedown', (e) => {
    if (!selectionToolbar.contains(e.target) && !resultPopup.contains(e.target)) {
      hideSelectionToolbar();
    }
  });
  
  // Toolbar button clicks
  selectionToolbar.addEventListener('click', (e) => {
    const button = e.target.closest('button');
    if (button) {
      handleToolbarAction(button.dataset.action);
    }
  });
  
  // Listen for messages from background
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'showResult') {
      showResultPopup(request.result, request.type);
    } else if (request.action === 'showError') {
      showError(request.error);
    } else if (request.action === 'setToolMode') {
      // Switch toolbar mode
      if (TOOL_MODES[request.mode]) {
        currentToolMode = request.mode;
        if (selectionToolbar && selectionToolbar.style.display !== 'none') {
          updateToolbarButtons();
        }
        showNotification(`Mode: ${request.mode.replace('-', ' ')}`);
      }
    }
  });
}

// Handle text selection
function handleTextSelection(e) {
  // Check if extension context is valid
  try {
    if (!chrome.runtime?.id) return;
  } catch (err) {
    return;
  }

  // Skip if selection is in our popup
  if (resultPopup.contains(e.target) || selectionToolbar.contains(e.target)) return;
  
  const selection = window.getSelection();
  const text = selection.toString().trim();
  
  if (text.length > 5) { // Minimum 5 characters
    selectedText = text;
    selectedRange = selection.getRangeAt(0).cloneRange();
    selectedElement = document.activeElement;
    showSelectionToolbar(selection);
  } else {
    hideSelectionToolbar();
  }
}

// Show selection toolbar
function showSelectionToolbar(selection) {
  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();
  updateToolbarButtons(); // Ensure correct buttons are shown
  
  selectionToolbar.style.display = 'flex';
  
  // Calculate dimensions
  const toolbarHeight = selectionToolbar.offsetHeight || 50;
  const toolbarWidth = selectionToolbar.offsetWidth || 180;
  
  // Vertical positioning
  let top = window.scrollY + rect.top - toolbarHeight - 10;
  if (rect.top < (toolbarHeight + 10)) top = window.scrollY + rect.bottom + 10; // Flip to bottom if near top
  
  // Horizontal positioning
  let left = window.scrollX + rect.left + (rect.width / 2) - (toolbarWidth / 2);
  
  // Clamp to viewport edges
  const minLeft = window.scrollX + 10;
  const maxLeft = window.scrollX + window.innerWidth - toolbarWidth - 10;
  
  if (left < minLeft) left = minLeft;
  if (left > maxLeft) left = maxLeft;
  
  selectionToolbar.style.top = `${top}px`;
  selectionToolbar.style.left = `${left}px`;
}

// Hide selection toolbar
function hideSelectionToolbar() {
  selectionToolbar.style.display = 'none';
}

// Handle toolbar action
async function handleToolbarAction(action) {
  // Fallback: Try to get selection if state is missing
  if (!selectedText) {
    const selection = window.getSelection();
    const text = selection.toString().trim();
    if (text) {
      selectedText = text;
      selectedRange = selection.getRangeAt(0).cloneRange();
    }
  }

  if (!selectedText) return;
  
  if (action === 'exit-mode') {
    currentToolMode = 'default';
    hideSelectionToolbar();
    return;
  }

  hideSelectionToolbar();
  showLoading();
  
  try {
    if (!chrome.runtime?.id) {
      throw new Error('Extension context invalidated');
    }

    let response;
    
    switch (action) {
      case 'grammar':
        response = await chrome.runtime.sendMessage({
          action: 'checkGrammar',
          text: selectedText
        });
        break;
        
      case 'rewrite':
        response = await chrome.runtime.sendMessage({
          action: 'rewrite',
          text: selectedText,
          style: 'more-formal'
        });
        break;
        
      case 'summarize':
        response = await chrome.runtime.sendMessage({
          action: 'summarize',
          text: selectedText
        });
        break;
        
      case 'translate':
        response = await chrome.runtime.sendMessage({
          action: 'translate',
          text: selectedText,
          targetLang: 'es' // Default to Spanish, could add language picker
        });
        break;
        
      // NEW: Handle dynamic tool actions
      case 'expand':
      case 'simplify':
        response = await chrome.runtime.sendMessage({
          action: 'generateContent',
          template: action,
          topic: selectedText
        });
        break;
        
      case 'analyze-writing':
        response = await chrome.runtime.sendMessage({
          action: 'analyzeWriting',
          text: selectedText
        });
        // Format object result for display
        if (response && response.success && typeof response.result === 'object') {
           const a = response.result;
           response.result = `Score: ${a.score}/100\n\n${a.feedback}\n\nIssues:\n• ${a.issues.join('\n• ')}`;
        }
        break;

      default:
        // Handle dynamic templates like email-professional
        if (action.startsWith('email-') || action.startsWith('blog-')) {
           response = await chrome.runtime.sendMessage({
             action: 'generateContent',
             template: action,
             topic: selectedText
           });
        }
    }
    
    if (response && response.success) {
      showResultPopup(response.result, action, response.model);
    } else {
      showError(response?.error || 'Processing failed');
    }
  } catch (error) {
    if (error.message.includes('Extension context invalidated')) {
      showError('Extension updated. Please refresh the page.');
    } else {
      showError(error.message);
    }
  }
}

// Show result popup
function showResultPopup(result, type, model) {
  const typeNames = {
    'grammar': '✏️ Grammar Corrected',
    'rewrite': '🔄 Rewritten',
    'summarize': '📋 Summary',
    'translate': '🌐 Translation'
  };
  
  resultPopup.querySelector('.pl-result-title').textContent = typeNames[type] || 'Result';
  resultPopup.querySelector('.pl-result-content').textContent = result;
  resultPopup.dataset.result = result;

  // Update privacy note with actual model used
  const privacyNote = resultPopup.querySelector('.pl-privacy-note');
  if (model) {
    privacyNote.textContent = `🔒 ${model}`;
    if (model.includes('Cloud')) {
       privacyNote.textContent = `☁️ ${model}`;
    }
  } else {
    privacyNote.textContent = '🔒 Processed locally on your device';
  }
  
  // Position popup
  positionPopup(resultPopup, selectedRange);
  
  resultPopup.style.display = 'block';
  hideLoading();
}

// Hide result popup
function hideResultPopup() {
  resultPopup.style.display = 'none';
}

// Show error
function showError(message) {
  hideLoading();
  
  resultPopup.querySelector('.pl-result-title').textContent = '❌ Error';
  resultPopup.querySelector('.pl-result-content').textContent = message;
  resultPopup.style.display = 'block';
  
  // Position at top of viewport
  resultPopup.style.position = 'fixed';
  resultPopup.style.top = '20px';
  resultPopup.style.left = '50%';
  resultPopup.style.transform = 'translate(-50%, 0)';
}

// Copy result
async function copyResult() {
  const result = resultPopup.dataset.result;
  
  try {
    await navigator.clipboard.writeText(result);
    const copyBtn = resultPopup.querySelector('.pl-copy-btn');
    copyBtn.textContent = '✅ Copied!';
    setTimeout(() => {
      copyBtn.textContent = '📋 Copy';
    }, 2000);
  } catch (error) {
    console.error('Failed to copy:', error);
  }
}

// Replace selection with result
function replaceSelection() {
  const result = resultPopup.dataset.result;
  
  if (!selectedRange || !result) return;
  
  try {
    // Use captured element or fall back to active
    const target = selectedElement || document.activeElement;
    
    // Restore focus
    if (target && target.isConnected) target.focus();

    if (target.isContentEditable || 
        target.tagName === 'TEXTAREA' || 
        target.tagName === 'INPUT') {
      
      // For editable elements
      if (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT') {
        const start = target.selectionStart;
        const end = target.selectionEnd;
        const value = target.value;
      
        target.value = value.substring(0, start) + result + value.substring(end);
        target.setSelectionRange(start, start + result.length);
      } else {
        // ContentEditable
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(selectedRange);
        document.execCommand('insertText', false, result);
      }
    }
    
    hideResultPopup();
    
    // Visual feedback
    showNotification('✅ Text replaced!');
  } catch (error) {
    console.error('Failed to replace text:', error);
  }
}

// Show loading indicator
function showLoading() {
  resultPopup.querySelector('.pl-result-title').textContent = '⏳ Processing...';
  resultPopup.querySelector('.pl-result-content').innerHTML = `
    <div class="pl-loading">
      <div class="pl-spinner"></div>
      <span>Analyzing locally on your device...</span>
    </div>
  `;
  resultPopup.style.display = 'block';
  
  // Position popup
  positionPopup(resultPopup, selectedRange);
}

// Hide loading
function hideLoading() {
  // Loading is replaced by actual content
}

// Show notification
function showNotification(message) {
  const notification = document.createElement('div');
  notification.id = 'privacylens-notification';
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.remove();
  }, 3000);
}

// Check if element is editable
function isEditable(element) {
  return element.isContentEditable ||
         element.tagName === 'TEXTAREA' ||
         element.tagName === 'INPUT' ||
         element.getAttribute('contenteditable') === 'true';
}

// Helper: Position popup relative to selection or center screen
function positionPopup(element, range) {
  element.style.position = 'absolute';
  element.style.transform = 'none';
  
  if (range) {
    const rect = range.getBoundingClientRect();
    if (rect.width > 0 || rect.height > 0) {
      element.style.top = `${window.scrollY + rect.bottom + 10}px`;
      element.style.left = `${window.scrollX + rect.left}px`;
      return;
    }
  }
  
  // Fallback: Center fixed
  element.style.position = 'fixed';
  element.style.top = '50%';
  element.style.left = '50%';
  element.style.transform = 'translate(-50%, -50%)';
}