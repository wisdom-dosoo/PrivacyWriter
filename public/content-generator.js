// Content Generator Script

let selectedTemplate = null;
let lastGenerated = null;

// Template emojis and descriptions
const TEMPLATE_INFO = {
  'email-professional': { emoji: '📧', name: 'Professional Email', desc: 'Business emails' },
  'email-complaint': { emoji: '⚠️', name: 'Complaint Email', desc: 'Formal complaints' },
  'email-request': { emoji: '📨', name: 'Request Email', desc: 'Polite requests' },
  'email-thank-you': { emoji: '🙏', name: 'Thank You Email', desc: 'Gratitude notes' },
  'email-follow-up': { emoji: '↩️', name: 'Follow-up Email', desc: 'Follow-ups' },
  'blog-intro': { emoji: '📖', name: 'Blog Intro', desc: 'Opening hooks' },
  'blog-conclusion': { emoji: '🎯', name: 'Blog Conclusion', desc: 'Closing paragraphs' },
  'article-headline': { emoji: '📰', name: 'Headlines', desc: 'Catchy titles' },
  'linkedin-post': { emoji: '💼', name: 'LinkedIn Post', desc: 'Professional posts' },
  'twitter-thread': { emoji: '🐦', name: 'Twitter Thread', desc: '5-tweet series' },
  'instagram-caption': { emoji: '📸', name: 'Instagram Caption', desc: 'Photo captions' },
  'tiktok-script': { emoji: '🎬', name: 'TikTok Script', desc: '15-30s video' },
  'cover-letter': { emoji: '💌', name: 'Cover Letter', desc: 'Job applications' },
  'resume-summary': { emoji: '📋', name: 'Resume Summary', desc: 'Profile highlights' },
  'job-description': { emoji: '👔', name: 'Job Description', desc: 'Job postings' },
  'product-description': { emoji: '🛍️', name: 'Product Description', desc: 'Sales copy' },
  'sales-pitch': { emoji: '💰', name: 'Sales Pitch', desc: 'Pitch decks' },
  'testimonial': { emoji: '⭐', name: 'Testimonial', desc: 'Reviews/quotes' },
  'youtube-script': { emoji: '▶️', name: 'YouTube Script', desc: 'Video scripts' },
  'podcast-intro': { emoji: '🎙️', name: 'Podcast Intro', desc: 'Episode intros' },
  'newsletter': { emoji: '📬', name: 'Newsletter', desc: 'Email newsletters' },
  'expand': { emoji: '📈', name: 'Expand Ideas', desc: 'Detailed version' },
  'simplify': { emoji: '📉', name: 'Simplify', desc: 'Short & clear' },
};

// Initialize template grid
function initializeTemplates() {
  const grid = document.getElementById('templateGrid');
  grid.innerHTML = Object.entries(TEMPLATE_INFO).map(([key, info]) => `
    <div class="template-card" onclick="selectTemplate('${key}')">
      <h3>${info.emoji} ${info.name}</h3>
      <p>${info.desc}</p>
    </div>
  `).join('');
}

function selectTemplate(templateKey) {
  selectedTemplate = templateKey;
  
  // Update UI
  document.querySelectorAll('.template-card').forEach(card => card.classList.remove('selected'));
  event.target.closest('.template-card').classList.add('selected');
  
  // Show parameter form
  document.getElementById('parameterForm').style.display = 'block';
  
  // Clear previous result
  document.getElementById('resultBox').classList.remove('visible');
}

function clearForm() {
  document.getElementById('topic').value = '';
  document.getElementById('context').value = '';
  lastGenerated = null;
  document.getElementById('resultBox').classList.remove('visible');
}

async function generateContent() {
  if (!selectedTemplate) {
    showToast('Please select a template first', 'error');
    return;
  }

  const topic = document.getElementById('topic').value.trim();
  if (!topic) {
    showToast('Please enter a topic', 'error');
    return;
  }

  const context = document.getElementById('context').value.trim();
  const generateBtn = document.getElementById('generateBtn');
  
  generateBtn.disabled = true;
  generateBtn.classList.add('loading');

  try {
    const response = await chrome.runtime.sendMessage({
      action: 'generateContent',
      template: selectedTemplate,
      topic: topic,
      context: context,
      params: { topic: topic, context: context }
    });

    if (response.success) {
      lastGenerated = response.result;
      displayResult(response.result);
      showToast('Content generated successfully!');
    } else {
      showToast(`Error: ${response.error}`, 'error');
    }
  } catch (error) {
    handleExtensionError(error);
  } finally {
    generateBtn.disabled = false;
    generateBtn.classList.remove('loading');
  }
}

function displayResult(content) {
  const resultBox = document.getElementById('resultBox');
  const resultContent = document.getElementById('resultContent');
  resultContent.textContent = content;
  resultBox.classList.add('visible');
}

function copyResult() {
  if (!lastGenerated) return;
  
  navigator.clipboard.writeText(lastGenerated).then(() => {
    showToast('Copied to clipboard!');
  }).catch(err => {
    showToast('Failed to copy', 'error');
  });
}

function downloadResult() {
  if (!lastGenerated) return;
  
  const template = TEMPLATE_INFO[selectedTemplate];
  const filename = `${template.name.replace(/\s+/g, '_')}_${Date.now()}.txt`;
  
  const blob = new Blob([lastGenerated], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  showToast('Downloaded!');
}

function useInBatch() {
  if (!lastGenerated) return;
  showToast('Open Batch Processor and paste the generated content');
  // Could also open batch processor in a new tab
  // chrome.tabs.create({ url: chrome.runtime.getURL('public/batch-processor.html') });
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

// Initialize on page load
document.addEventListener('DOMContentLoaded', initializeTemplates);

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
