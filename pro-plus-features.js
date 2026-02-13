// Pro Plus Features Implementation
// Includes: Batch Processing, Style Guides, Cloud Sync Stub, Team Collaboration Stub

const PRO_PLUS_DEFAULTS = {
  styleGuide: {
    bannedWords: ['utilize', 'leverage', 'synergy', 'disrupt', 'rockstar', 'ninja'],
    preferredTerms: {
      'utilize': 'use',
      'leverage': 'use',
      'synergy': 'cooperation',
      'disrupt': 'change',
      'facilitate': 'help'
    },
    maxSentenceLength: 25,
    tone: 'professional'
  }
};

/**
 * Analyzes text against a custom style guide (Pro Plus)
 * @param {string} text 
 * @param {Object} customGuide 
 */
function analyzeStyleGuide(text, customGuide = null) {
  const guide = customGuide || PRO_PLUS_DEFAULTS.styleGuide;
  const issues = [];
  
  // 1. Check Banned/Preferred Words
  // Simple tokenization by word boundaries
  const words = text.split(/\b/);
  
  words.forEach((word, index) => {
    const cleanWord = word.toLowerCase().trim();
    if (!cleanWord || cleanWord.length < 2) return;

    if (guide.preferredTerms[cleanWord]) {
      issues.push({
        type: 'terminology',
        match: word,
        suggestion: guide.preferredTerms[cleanWord],
        message: `Use "${guide.preferredTerms[cleanWord]}" instead of "${word}"`
      });
    } else if (guide.bannedWords.includes(cleanWord)) {
      issues.push({
        type: 'banned',
        match: word,
        suggestion: null,
        message: `Avoid using "${word}"`
      });
    }
  });

  // 2. Check Sentence Length
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  sentences.forEach(sentence => {
    const wordCount = sentence.trim().split(/\s+/).length;
    if (wordCount > guide.maxSentenceLength) {
      issues.push({
        type: 'readability',
        match: sentence.substring(0, 30) + '...',
        message: `Sentence too long (${wordCount} words). Aim for ${guide.maxSentenceLength}.`
      });
    }
  });

  return {
    score: Math.max(0, 100 - (issues.length * 5)),
    issues
  };
}

/**
 * Batch processes items sequentially (Pro Plus)
 * @param {Array} items - Array of {id, text}
 * @param {Function} processorFn - Async function to process text
 */
async function processBatchItems(items, processorFn) {
  const results = [];
  const timestamp = new Date().toISOString();

  for (const item of items) {
    try {
      const result = await processorFn(item.text);
      results.push({
        id: item.id,
        status: 'success',
        original: item.text,
        result: result,
        processedAt: timestamp
      });
    } catch (error) {
      results.push({
        id: item.id,
        status: 'error',
        original: item.text,
        error: error.message,
        processedAt: timestamp
      });
    }
  }
  return results;
}

/**
 * Prepares data for Cloud Sync (Pro Plus)
 * @returns {Object} Encrypted-ready payload
 */
async function prepareCloudSync() {
  const data = await chrome.storage.local.get(null);
  
  // Filter for syncable data
  return {
    version: '1.0',
    timestamp: Date.now(),
    settings: data.settings,
    history: data.history,
    styleGuides: data.styleGuides || PRO_PLUS_DEFAULTS.styleGuide,
    stats: data.analytics
  };
}