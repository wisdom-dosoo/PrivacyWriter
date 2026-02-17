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

function showStatus(message, isError = false) {
  const statusEl = document.getElementById('statusMessage');
  statusEl.textContent = message;
  statusEl.className = isError ? 'status-message visible status-error' : 'status-message visible status-success';
  setTimeout(() => statusEl.classList.remove('visible'), 5000);
}

async function generateContent() {
  if (!selectedTemplate) {
    showStatus('Please select a template first', true);
    return;
  }

  const topic = document.getElementById('topic').value.trim();
  if (!topic) {
    showStatus('Please enter a topic', true);
    return;
  }

  const context = document.getElementById('context').value.trim();
  const generateBtn = document.getElementById('generateBtn');
  
  generateBtn.disabled = true;
  generateBtn.classList.add('loading');
  showStatus('Generating content...');

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
      showStatus('✅ Content generated successfully!');
    } else {
      showStatus(`Error: ${response.error}`, true);
    }
  } catch (error) {
    showStatus(`Error: ${error.message}`, true);
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
    showStatus('✅ Copied to clipboard!');
  }).catch(err => {
    showStatus('Failed to copy', true);
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
  
  showStatus('✅ Downloaded!');
}

function useInBatch() {
  if (!lastGenerated) return;
  showStatus('Open Batch Processor and paste the generated content', false);
  // Could also open batch processor in a new tab
  // chrome.tabs.create({ url: chrome.runtime.getURL('public/batch-processor.html') });
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', initializeTemplates);
