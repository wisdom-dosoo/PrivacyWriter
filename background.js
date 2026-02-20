// PrivacyWriter Background Service Worker
// Handles: AI initialization, context menus, keyboard shortcuts, Pro status

import {
  PRO_LANGUAGES,
  FREE_LANGUAGES,
  analyzeWritingQuality,
  generateContent,
  saveHistoryItem,
  searchHistory,
  exportHistory,
  buildWritingProfile,
  getWritingProfile,
  checkFacts,
  detectContext
} from './pro-features.js';

// Import other modules (Ensure these files also use 'export' if you need their functions)
import {
  advancedProofread,
  factCheckText,
  buildAnalyticsDashboard,
  createSharedDocument,
  addDocumentComment,
  requestReview,
  approveDocument,
  createTeamStyleGuide,
  enforceTeamStandardsOnDoc
} from './pro-advanced-features.js';

import {
  analyzeStyleGuide,
  processBatchItems,
  prepareCloudSync,
  PRO_PLUS_DEFAULTS
} from './pro-plus-features.js';

import {
  runFallbackAI,
  FALLBACK_CONFIG,
  getModelDownloadStatus
} from './fallback-engine.js';

import {
  checkGrammarWithClaude,
  rewriteTextWithClaude,
  summarizeTextWithClaude,
  translateTextWithClaude,
  testClaudeApiKey
} from './claude-fallback.js';

console.log('PrivacyWriter Background Service Worker Started');

// DEV: Force Activate Pro Plus features for testing
chrome.storage.local.set({
  isPro: true,
  plan: 'pro_plus'
});

// AI Session holders
let writerSession = null;
let rewriterSession = null;
let summarizerSession = null;
let translatorSession = null;
let proofreaderSession = null;
let promptSession = null;

// ==========================================
// INITIALIZATION
// ==========================================

chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('PrivacyWriter installed:', details.reason);
  
  try {
    if (details.reason === 'install') {
      await initializeExtension();
      chrome.tabs.create({ url: 'landing-page.html' }).catch(err => 
        console.error('Failed to open landing page:', err)
      );
    }
    
    createContextMenus();
    await checkAICapabilities();
  } catch (error) {
    console.error('Error during installation:', error);
  }
});

async function initializeExtension() {
  await chrome.storage.local.set({
    isPro: true,
    plan: 'pro_plus',
    settings: {
      autoCorrect: false,
      showInlineTools: true,
      defaultTone: 'professional',
      defaultLength: 'concise',
      preferredLanguage: 'en'
    },
    analytics: {
      grammarChecks: 0,
      rewrites: 0,
      summaries: 0,
      translations: 0,
      wordsProcessed: 0
    },
    usageToday: {
      date: new Date().toDateString(),
      count: 0
    },
    installDate: Date.now(),
    // NEW: AI Fallback Configuration
    aiConfig: {
      preferredModel: 'gemini-nano',
      transformersAvailable: false,
      transformersModels: {
        grammar: false,
        rewrite: false,
        summarize: false,
        translate: false
      }
    },
    // NEW: API Keys (encrypted in production, plaintext in dev)
    apiKeys: {
      claude: ''
    },
    localOnly: true,
    useClaudeAPI: false
  });
}

// ==========================================
// AI CAPABILITY CHECK
// ==========================================

async function checkAICapabilities() {
  const capabilities = {
    prompt: false,
    writer: false,
    rewriter: false,
    summarizer: false,
    translator: false,
    proofreader: false
  };
  
  try {
    // Check Prompt API
    if ('ai' in self && 'languageModel' in self.ai) {
      const status = await self.ai.languageModel.capabilities();
      capabilities.prompt = status.available === 'readily' || status.available === 'after-download';
    }
    
    // Check Writer API
    if ('ai' in self && 'writer' in self.ai) {
      const status = await self.ai.writer.capabilities();
      capabilities.writer = status.available === 'readily' || status.available === 'after-download';
    }
    
    // Check Rewriter API
    if ('ai' in self && 'rewriter' in self.ai) {
      const status = await self.ai.rewriter.capabilities();
      capabilities.rewriter = status.available === 'readily' || status.available === 'after-download';
    }
    
    // Check Summarizer API
    if ('ai' in self && 'summarizer' in self.ai) {
      const status = await self.ai.summarizer.capabilities();
      capabilities.summarizer = status.available === 'readily' || status.available === 'after-download';
    }
    
    // Check Translator API
    if ('ai' in self && 'translator' in self.ai) {
      capabilities.translator = true;
    }
    
    console.log('AI Capabilities:', capabilities);
  } catch (error) {
    console.error('Error checking AI capabilities:', error);
  }
  
  await chrome.storage.local.set({ aiCapabilities: capabilities });
  return capabilities;
}

// ==========================================
// AI DIAGNOSTICS & HELP
// ==========================================

async function getAIDiagnostics() {
  const diagnostics = {
    chromeVersion: '',
    aiAvailable: false,
    apis: {
      prompt: false,
      writer: false,
      rewriter: false,
      summarizer: false,
      translator: false,
      proofreader: false
    },
    requiredFlags: [
      'prompt-api-for-gemini-nano',
      'optimization-guide-on-device-model',
      'summarization-api-for-gemini-nano',
      'rewriter-api-for-gemini-nano',
      'translation-api'
    ],
    setupUrl: 'chrome://flags',
    componentUrl: 'chrome://components'
  };

  try {
    // Check if any AI API is available
    if ('ai' in self) {
      diagnostics.aiAvailable = true;
      
      if ('languageModel' in self.ai) diagnostics.apis.prompt = true;
      if ('writer' in self.ai) diagnostics.apis.writer = true;
      if ('rewriter' in self.ai) diagnostics.apis.rewriter = true;
      if ('summarizer' in self.ai) diagnostics.apis.summarizer = true;
      if ('translator' in self.ai) diagnostics.apis.translator = true;
      if ('proofreader' in self.ai) diagnostics.apis.proofreader = true;
    }
  } catch (error) {
    console.error('Error getting diagnostics:', error);
  }

  return diagnostics;
}

// ==========================================
// CONTEXT MENUS
// ==========================================

function createContextMenus() {
  chrome.contextMenus.removeAll(() => {
    // Parent menu
    chrome.contextMenus.create({
      id: 'privacylens',
      title: '🔒 PrivacyWriter AI',
      contexts: ['selection']
    });
    
    // --- FREE TIER ---
    
    chrome.contextMenus.create({
      id: 'checkGrammar',
      parentId: 'privacylens',
      title: '✏️ Check Grammar',
      contexts: ['selection']
    });
    
    // Summarize
    chrome.contextMenus.create({
      id: 'summarize',
      parentId: 'privacylens',
      title: '📋 Summarize',
      contexts: ['selection']
    });

    // Rewrite (Group)
    chrome.contextMenus.create({
      id: 'rewrite',
      parentId: 'privacylens',
      title: '🔄 Rewrite',
      contexts: ['selection']
    });
    
    // Free Tones
    chrome.contextMenus.create({
      id: 'rewrite-professional',
      parentId: 'rewrite',
      title: '💼 Professional',
      contexts: ['selection']
    });
    
    chrome.contextMenus.create({
      id: 'rewrite-casual',
      parentId: 'rewrite',
      title: '😊 Casual',
      contexts: ['selection']
    });
    
    chrome.contextMenus.create({
      id: 'rewrite-shorter',
      parentId: 'rewrite',
      title: '📝 Shorter',
      contexts: ['selection']
    });
    
    chrome.contextMenus.create({
      id: 'rewrite-longer',
      parentId: 'rewrite',
      title: '📄 Longer',
      contexts: ['selection']
    });
    
    // Translate (Group)
    chrome.contextMenus.create({
      id: 'translate',
      parentId: 'privacylens',
      title: '🌐 Translate',
      contexts: ['selection']
    });
    
    // Free Languages
    chrome.contextMenus.create({
      id: 'translate-es',
      parentId: 'translate',
      title: '🇪🇸 Spanish',
      contexts: ['selection']
    });
    
    chrome.contextMenus.create({
      id: 'translate-fr',
      parentId: 'translate',
      title: '🇫🇷 French',
      contexts: ['selection']
    });
    
    chrome.contextMenus.create({
      id: 'translate-de',
      parentId: 'translate',
      title: '🇩🇪 German',
      contexts: ['selection']
    });
    
    chrome.contextMenus.create({
      id: 'translate-zh',
      parentId: 'translate',
      title: '🇨🇳 Chinese',
      contexts: ['selection']
    });
    
    chrome.contextMenus.create({
      id: 'translate-ja',
      parentId: 'translate',
      title: '🇯🇵 Japanese',
      contexts: ['selection']
    });

    // --- PRO TIER SEPARATOR ---
    chrome.contextMenus.create({
      id: 'sep-pro',
      parentId: 'privacylens',
      type: 'separator',
      contexts: ['selection']
    });

    // Pro Tones (in Rewrite menu)
    chrome.contextMenus.create({ id: 'sep-rewrite-pro', parentId: 'rewrite', type: 'separator', contexts: ['selection'] });
    chrome.contextMenus.create({ id: 'rewrite-executive', parentId: 'rewrite', title: '⭐ Executive (Pro)', contexts: ['selection'] });
    chrome.contextMenus.create({ id: 'rewrite-academic', parentId: 'rewrite', title: '⭐ Academic (Pro)', contexts: ['selection'] });
    chrome.contextMenus.create({ id: 'rewrite-persuasive', parentId: 'rewrite', title: '⭐ Persuasive (Pro)', contexts: ['selection'] });

    // Pro Features
    chrome.contextMenus.create({
      id: 'analyzeWriting',
      parentId: 'privacylens',
      title: '🧠 AI Coach: Analyze (Pro)',
      contexts: ['selection']
    });

    chrome.contextMenus.create({
      id: 'detectContext',
      parentId: 'privacylens',
      title: '🔍 Detect Context (Pro)',
      contexts: ['selection']
    });

    // --- PRO PLUS TIER SEPARATOR ---
    chrome.contextMenus.create({
      id: 'sep-pro-plus',
      parentId: 'privacylens',
      type: 'separator',
      contexts: ['selection']
    });

    // Pro Plus Features
    chrome.contextMenus.create({
      id: 'factCheck',
      parentId: 'privacylens',
      title: '🛡️ Fact Check (Pro+)',
      contexts: ['selection']
    });
  });
}

  /**
   * Perform Cloud Sync: prepare payload and optionally upload to configured endpoint.
   */
  async function performCloudSync() {
    try {
      const payload = await prepareCloudSync();

      // Save local snapshot for user to download or restore later
      await chrome.storage.local.set({ lastCloudExport: { payload, timestamp: Date.now() } });

      // If user configured a cloud URL, attempt upload
      const { settings = {} } = await chrome.storage.local.get('settings');
      const uploadUrl = settings?.cloudSyncUrl;
      const uploadToken = settings?.cloudSyncToken;

      if (uploadUrl) {
        try {
          const resp = await fetch(uploadUrl, {
            method: 'POST',
            headers: Object.assign({ 'Content-Type': 'application/json' }, uploadToken ? { 'Authorization': `Bearer ${uploadToken}` } : {}),
            body: JSON.stringify({ payload, meta: { extension: 'PrivacyWriter', timestamp: Date.now() } })
          });

          if (!resp.ok) throw new Error('Upload failed: ' + resp.statusText);

          return { success: true, status: 'uploaded', timestamp: Date.now() };
        } catch (e) {
          // Upload failed, but local export exists
          return { success: true, status: 'local-saved-upload-failed', timestamp: Date.now(), error: e.message };
        }
      }

      return { success: true, status: 'local-saved', timestamp: Date.now() };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const text = info.selectionText;
  if (!text) return;
  
  let result = null;
  let action = '';
  
  try {
    const menuId = info.menuItemId;

    if (menuId === 'checkGrammar') {
      action = 'grammar';
      result = await checkGrammar(text);
    } 
    else if (menuId === 'summarize') {
      action = 'summarize';
      result = await summarizeText(text);
    }
    else if (menuId.startsWith('rewrite-')) {
      action = 'rewrite';
      const styleKey = menuId.replace('rewrite-', '');
      const styleMap = {
        'professional': 'more-formal',
        'casual': 'more-casual',
        'shorter': 'shorter',
        'longer': 'longer',
        'executive': 'executive',
        'academic': 'academic',
        'persuasive': 'persuasive'
      };
      // Default to the key itself if not in map
      const style = styleMap[styleKey] || styleKey;
      result = await rewriteText(text, style);
    }
    else if (menuId.startsWith('translate-')) {
      action = 'translate';
      const lang = menuId.replace('translate-', '');
      result = await translateText(text, lang);
    }
    else if (menuId === 'analyzeWriting') {
      action = 'coach';
      const analysis = await analyzeWritingQuality(text);
      result = `**Score: ${analysis.score}/100**\n\n${analysis.feedback}\n\n**Issues:**\n• ${analysis.issues.join('\n• ')}`;
    }
    else if (menuId === 'detectContext') {
      action = 'context';
      const ctx = await detectContext(text);
      result = `**Context:** ${ctx.detectedContext} (${ctx.confidence}%)\n**Tone:** ${ctx.tone}\n**Audience:** ${ctx.audience}`;
    }
    else if (menuId === 'factCheck') {
      action = 'fact-check';
      const fc = await checkFacts(text);
      const warnings = fc.warnings.length > 0 ? fc.warnings.map(w => `⚠️ ${w.message}`).join('\n') : '✅ No issues found.';
      result = `**Fact Check Score: ${fc.score}/100**\n\n${warnings}`;
    }
    
    if (result) {
      // Send result to content script
      chrome.tabs.sendMessage(tab.id, {
        action: 'showResult',
        originalText: text,
        result: typeof result === 'object' ? result.text : result,
        type: action
      }).catch(err => {
        console.debug('Failed to send result to content script:', err);
      });
      
      // Update analytics
      await updateAnalytics(action, text.split(/\s+/).length);
    }
  } catch (error) {
    console.error('Context menu action error:', error);
    
    // Attempt fallback if AI error occurred
    if (action && text) {
       // Logic to retry with fallback could go here, but for context menus we usually just report error
    }
    
    let errorMessage = error.message || 'An unexpected error occurred.';
    if (error.message.includes('Text is too short to summarize')) {
        errorMessage = 'The selected text is too short to summarize. Please select a longer passage.';
    }

    chrome.tabs.sendMessage(tab.id, {
      action: 'showError',
      error: errorMessage
    }).catch(err => {
      console.debug('Failed to send error to content script:', err);
    });


  }
});

// ==========================================
// AI FUNCTIONS
// ==========================================

async function checkGrammar(text) {
  // Validate input
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    throw new Error('Please provide text to check.');
  }

  if (text.length > 50000) {
    throw new Error('Text is too long. Maximum 50,000 characters allowed.');
  }

  // Check usage limits for free users
  const canProceed = await checkUsageLimits();
  if (!canProceed) {
    throw new Error('Daily limit reached. Upgrade to Pro for unlimited usage.');
  }

  // Get settings
  const { settings, apiKeys = {}, isPro, localOnly, useClaudeAPI } = await chrome.storage.local.get(['settings', 'apiKeys', 'isPro', 'localOnly', 'useClaudeAPI']);
  const autoCorrect = settings?.autoCorrect || false;

  try {
    // TIER 1: Try Proofreader API (Chrome native - fastest)
    if ('ai' in self && 'proofreader' in self.ai) {
      try {
        if (!proofreaderSession) {
          proofreaderSession = await self.ai.proofreader.create();
        }
        const result = await proofreaderSession.proofread(text);
        await saveHistoryItem('grammar', text, result);
        console.log('✅ Grammar check: Using Chrome Proofreader API');
        return { text: result || 'No grammar issues found.', model: 'Chrome Proofreader (Local)' };
      } catch (err) {
        console.warn('❌ Proofreader API failed, attempting next tier:', err.message);
        proofreaderSession = null;
      }
    }

    // TIER 2: Try Prompt API (Chrome native - fallback)
    if ('ai' in self && 'languageModel' in self.ai) {
      try {
        if (!promptSession) {
          promptSession = await self.ai.languageModel.create({
            systemPrompt: `You are a grammar and spelling checker.
            Analyze the text and return a corrected version.
            Only fix actual errors, don't change style unless necessary.`
          });
        }

        let prompt;
        if (autoCorrect) {
          prompt = `Correct grammar and spelling. Return ONLY the corrected text:\n\n"${text}"`;
        } else {
          prompt = `Check and correct grammar/spelling in this text:\n\n"${text}"\n\nFormat: Return the corrected text, then list changes made.`;
        }

        const response = await promptSession.prompt(prompt);
        await saveHistoryItem('grammar', text, response);
        console.log('✅ Grammar check: Using Chrome Prompt API');
        return { text: response || 'No grammar issues found.', model: 'Chrome Gemini Nano (Local)' };
      } catch (err) {
        console.warn('❌ Prompt API failed, attempting next tier:', err.message);
        promptSession = null;
      }
    }

    // TIER 3: Try Claude API (Cloud - Pro tier only)
    if (isPro && apiKeys?.claude && useClaudeAPI && localOnly === false) {
      try {
        console.log('Attempting Claude API for grammar...');
        const result = await checkGrammarWithClaude(text, apiKeys.claude);
        await saveHistoryItem('grammar', text, result);
        await updateAnalytics('grammar-claude', text.split(/\s+/).length);
        console.log('✅ Grammar check: Using Claude API');
        return { text: result || 'No grammar issues found.', model: 'Claude API (Cloud)' };
      } catch (err) {
        console.warn('❌ Claude API failed, attempting next tier:', err.message);
      }
    }

    // TIER 4: Try Transformers.js local (offline)
    try {
      console.log('Attempting local Transformers.js for grammar...');
      const result = await runFallbackAI('grammar', text);
      await saveHistoryItem('grammar', text, result);
      console.log('✅ Grammar check: Using local Transformers.js');
      return { text: result || 'No grammar issues found.', model: 'Transformers.js (Local)' };
    } catch (err) {
      console.warn('❌ Transformers.js failed, attempting simple rules:', err.message);
    }

    // TIER 5: Simple regex-based rules (always works)
    console.log('Using simple regex-based grammar rules...');
    const result = simpleGrammarFix(text);
    await saveHistoryItem('grammar', text, result);
    console.log('✅ Grammar check: Using simple rules');
    return { text: result || text, model: 'Basic Rules (Local)' };

  } catch (error) {
    console.error('All grammar check methods failed:', error);

    throw new Error(
      'Chrome AI is not available. Quick fix:\n' +
      '1. Open chrome://flags\n' +
      '2. Search for "prompt-api"\n' +
      '3. Enable "prompt-api-for-gemini-nano"\n' +
      '4. Restart Chrome\n' +
      '5. Try again\n\n' +
      'Pro members: Add Claude API key in Settings for faster fallback.'
    );
  }
}

async function rewriteText(text, style) {
  // Validate input
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    throw new Error('Please provide text to rewrite.');
  }

  if (text.length > 50000) {
    throw new Error('Text is too long. Maximum 50,000 characters allowed.');
  }

  // Include Pro tones: executive, academic, persuasive, empathetic, humorous, critical
  const validStyles = ['more-formal', 'more-casual', 'shorter', 'longer', 'executive', 'academic', 'persuasive', 'empathetic', 'humorous', 'critical'];
  if (!validStyles.includes(style)) {
    throw new Error('Invalid rewrite style specified.');
  }

  const canProceed = await checkUsageLimits();
  if (!canProceed) {
    throw new Error('Daily limit reached. Upgrade to Pro for unlimited usage.');
  }

  const { apiKeys = {}, isPro, localOnly, useClaudeAPI } = await chrome.storage.local.get(['apiKeys', 'isPro', 'localOnly', 'useClaudeAPI']);
  
  // Check Pro-only tones
  const proOnlyTones = ['executive', 'academic', 'persuasive', 'empathetic', 'humorous', 'critical'];
  if (proOnlyTones.includes(style) && !isPro) {
    throw new Error('This tone requires Pro. Upgrade to unlock all 10+ writing tones.');
  }

  try {
    // TIER 1: Try Rewriter API (Chrome native - fastest)
    if ('ai' in self && 'rewriter' in self.ai) {
      try {
        if (!rewriterSession) {
          rewriterSession = await self.ai.rewriter.create({
            tone: style === 'more-formal' ? 'more-formal' :
                  style === 'more-casual' ? 'more-casual' : 'as-is',
            length: style === 'shorter' ? 'shorter' :
                    style === 'longer' ? 'longer' : 'as-is'
          });
        }

        const result = await rewriterSession.rewrite(text);
        await saveHistoryItem('rewrite', text, result);
        console.log('✅ Rewrite: Using Chrome Rewriter API');
        return { text: result || text, model: 'Chrome Rewriter (Local)' };
      } catch (err) {
        console.warn('❌ Rewriter API failed, attempting next tier:', err.message);
        rewriterSession = null;
      }
    }

    // TIER 2: Try Prompt API (Chrome native - fallback)
    if ('ai' in self && 'languageModel' in self.ai) {
      try {
        if (!promptSession) {
          promptSession = await self.ai.languageModel.create();
        }

        const stylePrompts = {
          'more-formal': 'Rewrite this text in a more professional, formal tone:',
          'more-casual': 'Rewrite this text in a more casual, friendly tone:',
          'shorter': 'Rewrite this text to be more concise while keeping the meaning:',
          'longer': 'Expand this text with more detail while keeping the same meaning:',
          'executive': 'Rewrite this in an executive summary tone - decisive, authoritative, results-focused:',
          'academic': 'Rewrite this in academic scholarly tone - analytical, evidence-based, formal:',
          'persuasive': 'Rewrite this in a persuasive marketing tone - compelling, benefit-focused, engaging:',
          'empathetic': 'Rewrite this in an empathetic warm tone - compassionate, understanding, supportive:',
          'humorous': 'Rewrite this with humor and lightness while maintaining the core message:',
          'critical': 'Rewrite this in a critical analytical tone - questioning, evaluative, examining strengths and weaknesses:'
        };

        const response = await promptSession.prompt(
          `${stylePrompts[style]}\n\n"${text}"`
        );
        await saveHistoryItem('rewrite', text, response);
        console.log('✅ Rewrite: Using Chrome Prompt API');
        return { text: response || text, model: 'Chrome Gemini Nano (Local)' };
      } catch (err) {
        console.warn('❌ Prompt API failed, attempting next tier:', err.message);
        promptSession = null;
      }
    }

    // TIER 3: Try Claude API (Cloud - Pro tier only)
    if (isPro && apiKeys?.claude && useClaudeAPI && localOnly === false) {
      try {
        console.log('Attempting Claude API for rewrite...');
        const result = await rewriteTextWithClaude(text, style, apiKeys.claude);
        await saveHistoryItem('rewrite', text, result);
        await updateAnalytics('rewrite-claude', text.split(/\s+/).length);
        console.log('✅ Rewrite: Using Claude API');
        return { text: result || text, model: 'Claude API (Cloud)' };
      } catch (err) {
        console.warn('❌ Claude API failed, attempting next tier:', err.message);
      }
    }

    // TIER 4: Try Transformers.js local (offline)
    try {
      console.log('Attempting local Transformers.js for rewrite...');
      const result = await runFallbackAI('rewrite', text, { style });
      await saveHistoryItem('rewrite', text, result);
      console.log('✅ Rewrite: Using local Transformers.js');
      return { text: result || text, model: 'Transformers.js (Local)' };
    } catch (err) {
      console.warn('❌ Transformers.js failed, attempting simple rules:', err.message);
    }

    // TIER 5: Simple regex-based rules (always works)
    console.log('Using simple regex-based rewriting...');
    const result = simpleRewrite(text, style);
    await saveHistoryItem('rewrite', text, result);
    console.log('✅ Rewrite: Using simple rules');
    return { text: result || text, model: 'Basic Rules (Local)' };

  } catch (error) {
    console.error('All rewrite methods failed:', error);
    throw new Error(
      'Chrome AI is not available. Quick fix:\n' +
      '1. Open chrome://flags\n' +
      '2. Search for "rewriter-api"\n' +
      '3. Enable "rewriter-api-for-gemini-nano"\n' +
      '4. Restart Chrome\n' +
      '5. Try again\n\n' +
      'Pro members: Add Claude API key in Settings for faster fallback.'
    );
  }
}

async function summarizeText(text) {
  // Validate input
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    throw new Error('Please provide text to summarize.');
  }

  if (text.length > 100000) {
    throw new Error('Text is too long. Maximum 100,000 characters allowed.');
  }

  if (text.split(/\s+/).length < 20) {
    throw new Error('Text is too short to summarize. Please provide at least 20 words.');
  }

  const canProceed = await checkUsageLimits();
  if (!canProceed) {
    throw new Error('Daily limit reached. Upgrade to Pro for unlimited usage.');
  }

  const { apiKeys = {}, isPro, localOnly, useClaudeAPI } = await chrome.storage.local.get(['apiKeys', 'isPro', 'localOnly', 'useClaudeAPI']);

  try {
    // TIER 1: Try Summarizer API (Chrome native - fastest)
    if ('ai' in self && 'summarizer' in self.ai) {
      try {
        if (!summarizerSession) {
          summarizerSession = await self.ai.summarizer.create({
            type: 'key-points',
            length: 'medium'
          });
        }

        const result = await summarizerSession.summarize(text);
        await saveHistoryItem('summarize', text, result);
        console.log('✅ Summarize: Using Chrome Summarizer API');
        return { text: result || 'Unable to generate summary.', model: 'Chrome Summarizer (Local)' };
      } catch (err) {
        console.warn('❌ Summarizer API failed, attempting next tier:', err.message);
        summarizerSession = null;
      }
    }

    // TIER 2: Try Prompt API (Chrome native - fallback)
    if ('ai' in self && 'languageModel' in self.ai) {
      try {
        if (!promptSession) {
          promptSession = await self.ai.languageModel.create();
        }

        const response = await promptSession.prompt(
          `Summarize this text in 2-3 key points:\n\n"${text}"`
        );
        await saveHistoryItem('summarize', text, response);
        console.log('✅ Summarize: Using Chrome Prompt API');
        return { text: response || 'Unable to generate summary.', model: 'Chrome Gemini Nano (Local)' };
      } catch (err) {
        console.warn('❌ Prompt API failed, attempting next tier:', err.message);
        promptSession = null;
      }
    }

    // TIER 3: Try Claude API (Cloud - Pro tier only)
    if (isPro && apiKeys?.claude && useClaudeAPI && localOnly === false) {
      try {
        console.log('Attempting Claude API for summarization...');
        const result = await summarizeTextWithClaude(text, apiKeys.claude);
        await saveHistoryItem('summarize', text, result);
        await updateAnalytics('summarize-claude', text.split(/\s+/).length);
        console.log('✅ Summarize: Using Claude API');
        return { text: result || 'Unable to generate summary.', model: 'Claude API (Cloud)' };
      } catch (err) {
        console.warn('❌ Claude API failed, attempting next tier:', err.message);
      }
    }

    // TIER 4: Try Transformers.js local (offline)
    try {
      console.log('Attempting local Transformers.js for summarization...');
      const result = await runFallbackAI('summarize', text);
      await saveHistoryItem('summarize', text, result);
      console.log('✅ Summarize: Using local Transformers.js');
      return { text: result || 'Unable to generate summary.', model: 'Transformers.js (Local)' };
    } catch (err) {
      console.warn('❌ Transformers.js failed:', err.message);
    }

    throw new Error(
      'Summarization service unavailable. Please try again later or upgrade to Pro for Claude API fallback.\n\n' +
      'To enable Chrome AI:\n' +
      '1. Open chrome://flags\n' +
      '2. Search for "summarization-api"\n' +
      '3. Enable "summarization-api-for-gemini-nano"\n' +
      '4. Restart Chrome'
    );
  } catch (error) {
    console.error('All summarize methods failed:', error);
    throw error;
  }
}

async function translateText(text, targetLang) {
  // Validate input
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    throw new Error('Please provide text to translate.');
  }

  if (text.length > 50000) {
    throw new Error('Text is too long. Maximum 50,000 characters allowed.');
  }

  const canProceed = await checkUsageLimits();
  if (!canProceed) {
    throw new Error('Daily limit reached. Upgrade to Pro for unlimited usage.');
  }

  // Check Pro status for language support
  const { isPro, apiKeys = {}, localOnly, useClaudeAPI } = await chrome.storage.local.get(['isPro', 'apiKeys', 'localOnly', 'useClaudeAPI']);

  // Validate language availability
  if (isPro) {
    if (!PRO_LANGUAGES[targetLang]) {
      throw new Error(`Language '${targetLang}' is not supported even in Pro.`);
    }
  } else {
    if (!FREE_LANGUAGES.includes(targetLang)) {
      throw new Error(`Language '${targetLang}' is a Pro feature. Upgrade to access 50+ languages.`);
    }
  }

  const targetLangName = PRO_LANGUAGES[targetLang] || targetLang;

  try {
    // TIER 1: Try Translator API (Chrome native - fastest)
    if ('ai' in self && 'translator' in self.ai) {
      try {
        const translator = await self.ai.translator.create({
          sourceLanguage: 'en',
          targetLanguage: targetLang
        });

        const result = await translator.translate(text);
        await saveHistoryItem('translate', text, result);
        console.log('✅ Translate: Using Chrome Translator API');
        return { text: result || text, model: 'Chrome Translator (Local)' };
      } catch (err) {
        console.warn('❌ Translator API failed, attempting next tier:', err.message);
      }
    }

    // TIER 2: Try Prompt API (Chrome native - fallback)
    if ('ai' in self && 'languageModel' in self.ai) {
      try {
        if (!promptSession) {
          promptSession = await self.ai.languageModel.create();
        }

        const response = await promptSession.prompt(
          `Translate this text to ${targetLangName}:\n\n"${text}"`
        );
        await saveHistoryItem('translate', text, response);
        console.log('✅ Translate: Using Chrome Prompt API');
        return { text: response || text, model: 'Chrome Gemini Nano (Local)' };
      } catch (err) {
        console.warn('❌ Prompt API failed, attempting next tier:', err.message);
        promptSession = null;
      }
    }

    // TIER 3: Try Claude API (Cloud - Pro tier only)
    if (isPro && apiKeys?.claude && useClaudeAPI && localOnly === false) {
      try {
        console.log('Attempting Claude API for translation...');
        const result = await translateTextWithClaude(text, targetLang, apiKeys.claude);
        await saveHistoryItem('translate', text, result);
        await updateAnalytics('translate-claude', text.split(/\s+/).length);
        console.log('✅ Translate: Using Claude API');
        return { text: result || text, model: 'Claude API (Cloud)' };
      } catch (err) {
        console.warn('❌ Claude API failed, attempting next tier:', err.message);
      }
    }

    // TIER 4: Try Transformers.js local (offline)
    try {
      console.log('Attempting local Transformers.js for translation...');
      const result = await runFallbackAI('translate', text, { targetLang });
      await saveHistoryItem('translate', text, result);
      console.log('✅ Translate: Using local Transformers.js');
      return { text: result || text, model: 'Transformers.js (Local)' };
    } catch (err) {
      console.warn('❌ Transformers.js failed:', err.message);
    }

    throw new Error(
      'Translation service unavailable. Please try again later or upgrade to Pro for Claude API fallback.\n\n' +
      'To enable Chrome AI:\n' +
      '1. Open chrome://flags\n' +
      '2. Search for "translation-api"\n' +
      '3. Enable "translation-api"\n' +
      '4. Restart Chrome'
    );
  } catch (error) {
    console.error('All translate methods failed:', error);
    throw error;
  }
}

async function writeText(prompt, context) {
  const canProceed = await checkUsageLimits();
  if (!canProceed) {
    throw new Error('Daily limit reached. Upgrade to Pro for unlimited usage.');
  }
  
  try {
    // Try Writer API
    if ('ai' in self && 'writer' in self.ai) {
      if (!writerSession) {
        writerSession = await self.ai.writer.create({
          tone: 'neutral',
          length: 'medium'
        });
      }
      
      const result = await writerSession.write(prompt, { context });
      return result;
    }
    
    // Fallback to Prompt API
    if ('ai' in self && 'languageModel' in self.ai) {
      if (!promptSession) {
        promptSession = await self.ai.languageModel.create();
      }
      
      const response = await promptSession.prompt(prompt);
      return response;
    }
    
    throw new Error('AI not available');
  } catch (error) {
    console.error('Write error:', error);
    try {
      console.log('Attempting local fallback for Write...');
      return await runFallbackAI('write', prompt, { context });
    } catch (fallbackError) {
      throw error;
    }
  }
}

// ==========================================
// USAGE LIMITS CHECK
// ==========================================

async function checkUsageLimits() {
  try {
    const { isPro, usageToday } = await chrome.storage.local.get(['isPro', 'usageToday']);

    // Pro users have unlimited usage
    if (isPro) {
      return true;
    }

    // Free users: check daily limit (25 requests per day)
    const today = new Date().toDateString();
    const { count = 0, date = today } = usageToday || {};

    // Reset counter if new day
    if (date !== today) {
      await chrome.storage.local.set({
        usageToday: { date: today, count: 0 }
      });
      return true;
    }

    // Check if limit reached (25 requests per day for free users)
    if (count >= 25) {
      return false;
    }

    // Increment usage counter
    await chrome.storage.local.set({
      usageToday: { date: today, count: count + 1 }
    });

    return true;
  } catch (error) {
    console.error('Error checking usage limits:', error);
    // On error, allow operation to proceed (fail open)
    return true;
  }
}

async function updateAnalytics(action, wordCount) {
  const { analytics } = await chrome.storage.local.get('analytics');
  
  switch (action) {
    case 'grammar':
      analytics.grammarChecks = (analytics.grammarChecks || 0) + 1;
      break;
    case 'rewrite':
      analytics.rewrites = (analytics.rewrites || 0) + 1;
      break;
    case 'summarize':
      analytics.summaries = (analytics.summaries || 0) + 1;
      break;
    case 'translate':
      analytics.translations = (analytics.translations || 0) + 1;
      break;
  }
  
  analytics.wordsProcessed = (analytics.wordsProcessed || 0) + wordCount;
  
  await chrome.storage.local.set({ analytics });
}

async function checkProPlusAccess() {
  const data = await chrome.storage.local.get(['isPro', 'plan']);
  if (!data.isPro) return false;
  
  const plan = data.plan || 'pro';
  return ['pro_plus', 'team', 'enterprise'].includes(plan);
}

// ==========================================
// MESSAGE HANDLING
// ==========================================

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  (async () => {
    try {
      if (!request || !request.action) {
        sendResponse({ success: false, error: 'No action specified' });
        return;
      }

      switch (request.action) {
        case 'checkGrammar':
          try {
            const grammarResult = await checkGrammar(request.text);
            sendResponse({ success: true, result: grammarResult.text, model: grammarResult.model });
          } catch (error) {
            sendResponse({ success: false, error: error.message || 'Grammar check failed' });
          }
          break;
          
        case 'rewrite':
          try {
            const rewriteResult = await rewriteText(request.text, request.style);
            sendResponse({ success: true, result: rewriteResult.text, model: rewriteResult.model });
          } catch (error) {
            sendResponse({ success: false, error: error.message || 'Rewrite failed' });
          }
          break;
          
        case 'summarize':
          try {
            const summaryResult = await summarizeText(request.text);
            sendResponse({ success: true, result: summaryResult.text, model: summaryResult.model });
          } catch (error) {
            sendResponse({ success: false, error: error.message || 'Summarization failed' });
          }
          break;
          
        case 'translate':
          try {
            const translateResult = await translateText(request.text, request.targetLang);
            sendResponse({ success: true, result: translateResult.text, model: translateResult.model });
          } catch (error) {
            sendResponse({ success: false, error: error.message || 'Translation failed' });
          }
          break;

        case 'analyzeStyle':
          if (!(await checkProPlusAccess())) {
             sendResponse({ success: false, error: 'Upgrade to Pro Plus to use Style Guides' });
             return;
          }
          try {
            const styleResult = analyzeStyleGuide(request.text, request.guide);
            sendResponse({ success: true, result: styleResult });
          } catch (e) {
            sendResponse({ success: false, error: e.message });
          }
          break;

        case 'batchProcess':
          if (!(await checkProPlusAccess())) {
             sendResponse({ success: false, error: 'Upgrade to Pro Plus for Batch Processing' });
             return;
          }
          try {
            let processor;
            if (request.task === 'grammar') {
              processor = checkGrammar;
            } else if (request.task === 'rewrite') {
              processor = (t) => rewriteText(t, request.style || 'more-formal');
            } else if (request.task === 'summarize') {
              processor = summarizeText;
            } else if (request.task === 'translate') {
              processor = (t) => translateText(t, request.targetLang);
            } else if (request.task === 'generate') {
              // Content generation with template
              processor = async (t) => {
                const result = await generateContent(request.template, { topic: t, context: '' });
                return result;
              };
            } else if (request.task === 'fact-check') {
              // Fact-checking task
              processor = async (t) => {
                const result = await checkFacts(t);
                return JSON.stringify(result);
              };
            } else if (request.task === 'style-guide') {
              // Style guide compliance check
              processor = (t) => {
                const result = analyzeStyleGuide(t, null);
                return `Style Score: ${result.score}/100\nIssues Found: ${result.issues.length}\n${result.issues.map(i => `- ${i.message}`).join('\n')}`;
              };
            } else {
              throw new Error('Invalid batch task');
            }

            const batchResults = await processBatchItems(request.items, processor);
            sendResponse({ success: true, results: batchResults });
          } catch (e) {
             sendResponse({ success: false, error: e.message });
          }
          break;

        case 'syncCloud':
          const syncResult = await performCloudSync();
          if (syncResult.success) {
            sendResponse({ success: true, status: syncResult.status, timestamp: syncResult.timestamp });
          } else {
            sendResponse({ success: false, error: syncResult.error });
          }
          break;

        case 'getCloudPayload':
          try {
            const payload = await prepareCloudSync();
            sendResponse({ success: true, payload });
          } catch (e) {
            sendResponse({ success: false, error: e.message });
          }
          break;

        case 'restoreCloudPayload':
          try {
            const incoming = request.payload;
            // Only allow known keys to be restored
            const allowed = {};
            if (incoming.settings) allowed.settings = incoming.settings;
            if (incoming.history) allowed.history = incoming.history;
            if (incoming.styleGuides) allowed.styleGuides = incoming.styleGuides;
            if (incoming.analytics) allowed.analytics = incoming.analytics;
            if (incoming.usageToday) allowed.usageToday = incoming.usageToday;

            await chrome.storage.local.set(allowed);
            // Update a timestamp for sync
            await chrome.storage.local.set({ lastCloudRestore: Date.now() });
            sendResponse({ success: true });
          } catch (e) {
            sendResponse({ success: false, error: e.message });
          }
          break;

        case 'getStyleGuide':
          const sgData = await chrome.storage.local.get('styleGuides');
          // Return stored guide or default from pro-plus-features.js
          sendResponse({ 
            success: true, 
            guide: sgData.styleGuides || PRO_PLUS_DEFAULTS.styleGuide 
          });
          break;

        case 'saveStyleGuide':
          if (await checkProPlusAccess()) {
            await chrome.storage.local.set({ 
              styleGuides: request.guide,
              syncTimestamp: Date.now() // Update timestamp to trigger sync push
            });
            sendResponse({ success: true });
          } else {
            sendResponse({ success: false, error: 'Pro Plus required' });
          }
          break;
          
        case 'write':
          try {
            const writeResult = await writeText(request.prompt, request.context);
            sendResponse({ success: true, result: writeResult });
          } catch (error) {
            sendResponse({ success: false, error: error.message || 'Writing failed' });
          }
          break;
          
        case 'analyzeWriting':
          try {
            const analysisResult = await analyzeWritingQuality(request.text);
            await updateAnalytics('coach', request.text.split(/\s+/).length);
            sendResponse({ success: true, result: analysisResult });
          } catch (error) {
            sendResponse({ success: false, error: error.message || 'Analysis failed' });
          }
          break;

        case 'generateContent':
          try {
            const template = request.template || request.params?.template;
            const params = request.params || { topic: request.topic, context: request.context };
            const genResult = await generateContent(template, params);
            sendResponse({ success: true, result: genResult });
          } catch (error) {
            sendResponse({ success: false, error: error.message || 'Generation failed' });
          }
          break;

        case 'buildWritingProfile':
          try {
            const profile = await buildWritingProfile();
            sendResponse({ success: true, profile });
          } catch (error) {
            sendResponse({ success: false, error: error.message || 'Profile building failed' });
          }
          break;

        case 'checkCapabilities':
          try {
            const capabilities = await checkAICapabilities();
            sendResponse({ success: true, capabilities });
          } catch (error) {
            sendResponse({ success: false, error: error.message || 'Capability check failed' });
          }
          break;
          
        case 'getDiagnostics':
          try {
            const diagnostics = await getAIDiagnostics();
            sendResponse({ success: true, diagnostics });
          } catch (error) {
            sendResponse({ success: false, error: error.message || 'Diagnostics failed' });
          }
          break;
          
        case 'getAnalytics':
          try {
            const { analytics = { grammarChecks: 0, rewrites: 0, summaries: 0, translations: 0, wordsProcessed: 0 } } = 
              await chrome.storage.local.get('analytics');
            sendResponse({ success: true, analytics });
          } catch (error) {
            sendResponse({ success: false, error: error.message || 'Failed to get analytics' });
          }
          break;
          
        case 'getUsage':
          try {
            const { usageToday = { date: new Date().toDateString(), count: 0 }, isPro = false } = 
              await chrome.storage.local.get(['usageToday', 'isPro']);
            sendResponse({ 
              success: true, 
              usage: usageToday, 
              isPro,
              limit: isPro ? Infinity : 25
            });
          } catch (error) {
            sendResponse({ success: false, error: error.message || 'Failed to get usage' });
          }
          break;
          
        case 'proActivated':
          try {
            await chrome.storage.local.set({
              isPro: true,
              plan: request.plan || 'pro',
              proActivatedAt: Date.now()
            });
            sendResponse({ success: true });
          } catch (error) {
            sendResponse({ success: false, error: error.message || 'Pro activation failed' });
          }
          break;

        // NEW: Test Claude API Key
        case 'testClaudeKey':
          try {
            const isValid = await testClaudeApiKey(request.apiKey);
            if (isValid) {
              // Save the API key if valid
              const { apiKeys = {} } = await chrome.storage.local.get('apiKeys');
              apiKeys.claude = request.apiKey;
              await chrome.storage.local.set({ apiKeys });
              sendResponse({ success: true, message: 'Claude API key is valid and saved!' });
            } else {
              sendResponse({ success: false, error: 'Invalid Claude API key' });
            }
          } catch (error) {
            sendResponse({ success: false, error: error.message || 'API key test failed' });
          }
          break;

        // NEW: Save Claude API Key
        case 'saveClaudeKey':
          try {
            const { apiKeys = {} } = await chrome.storage.local.get('apiKeys');
            if (request.apiKey) {
              apiKeys.claude = request.apiKey;
            } else {
              delete apiKeys.claude;
            }
            await chrome.storage.local.set({ apiKeys });
            sendResponse({ success: true, message: 'Claude API key saved' });
          } catch (error) {
            sendResponse({ success: false, error: error.message });
          }
          break;

        // NEW: Get Model Download Status
        case 'getModelStatus':
          try {
            const status = await getModelDownloadStatus();
            sendResponse({ success: true, status });
          } catch (error) {
            sendResponse({ success: false, error: error.message });
          }
          break;

        // NEW: Download Fallback Model
        case 'downloadFallbackModel':
          try {
            // Initiate model download (async)
            getPipeline(request.task, FALLBACK_CONFIG.models[request.task]).then(() => {
              chrome.runtime.sendMessage({
                action: 'modelDownloadComplete',
                task: request.task,
                success: true
              }).catch(() => {});
            }).catch(err => {
              chrome.runtime.sendMessage({
                action: 'modelDownloadComplete',
                task: request.task,
                success: false,
                error: err.message
              }).catch(() => {});
            });
            sendResponse({ success: true, message: `Downloading ${request.task} model...` });
          } catch (error) {
            sendResponse({ success: false, error: error.message });
          }
          break;

        // NEW: Update Model Status (called from fallback-engine.js)
        case 'updateModelStatus':
          // Just log for now, could store in chrome.storage
          console.log(`Model ${request.task} status: ${request.status}`, request.model);
          break;

        // ===== NEW PRO ADVANCED FEATURES =====

        // Writing Style Profile
        case 'buildWritingProfile':
          try {
            const profile = await buildWritingProfile();
            sendResponse({ success: true, data: profile });
          } catch (error) {
            sendResponse({ success: false, error: error.message || 'Profile building failed' });
          }
          break;

        case 'getWritingProfile':
          try {
            const profile = await getWritingProfile();
            sendResponse({ success: true, data: profile });
          } catch (error) {
            sendResponse({ success: false, error: error.message || 'Failed to get profile' });
          }
          break;

        // History Management
        case 'searchHistory':
          try {
            const results = await searchHistory(request.query, request.filters);
            sendResponse({ success: true, results });
          } catch (error) {
            sendResponse({ success: false, error: error.message });
          }
          break;

        case 'exportHistory':
          try {
            const data = await exportHistory(request.format);
            sendResponse({ success: true, data });
          } catch (error) {
            sendResponse({ success: false, error: error.message });
          }
          break;

        // Advanced Proofreading
        case 'advancedProofread':
          try {
            const proofResult = await advancedProofread(request.text);
            sendResponse({ success: true, result: proofResult });
          } catch (error) {
            sendResponse({ success: false, error: error.message });
          }
          break;

        case 'factCheckText':
          try {
            const factCheckResult = await factCheckText(request.text);
            sendResponse({ success: true, result: factCheckResult });
          } catch (error) {
            sendResponse({ success: false, error: error.message });
          }
          break;

        // Contextual Writing Assistant
        case 'detectContext':
          try {
            const contextResult = await detectContext(request.text, request.userSelectedContext);
            await updateAnalytics('context-detection', request.text.split(/\s+/).length);
            sendResponse({ success: true, data: contextResult });
          } catch (error) {
            sendResponse({ success: false, error: error.message || 'Context detection failed' });
          }
          break;

        // Analytics Dashboard
        case 'buildAnalyticsDashboard':
          try {
            const dashboard = await buildAnalyticsDashboard();
            sendResponse({ success: true, data: dashboard });
          } catch (error) {
            sendResponse({ success: false, error: error.message });
          }
          break;

        // Team Collaboration
        case 'createSharedDocument':
          try {
            const doc = await createSharedDocument(request.title, request.content, request.teamMembers);
            sendResponse({ success: true, document: doc });
          } catch (error) {
            sendResponse({ success: false, error: error.message });
          }
          break;

        case 'addDocumentComment':
          try {
            const comment = await addDocumentComment(request.docId, request.text, request.position);
            sendResponse({ success: true, comment });
          } catch (error) {
            sendResponse({ success: false, error: error.message });
          }
          break;

        case 'requestReview':
          try {
            const doc = await requestReview(request.docId, request.reviewers);
            sendResponse({ success: true, document: doc });
          } catch (error) {
            sendResponse({ success: false, error: error.message });
          }
          break;

        case 'approveDocument':
          try {
            const doc = await approveDocument(request.docId, 'current_user', request.feedback);
            sendResponse({ success: true, document: doc });
          } catch (error) {
            sendResponse({ success: false, error: error.message });
          }
          break;

        // Team Writing Standards
        case 'createTeamStyleGuide':
          try {
            const guide = await createTeamStyleGuide(request.name, request.rules);
            sendResponse({ success: true, guide });
          } catch (error) {
            sendResponse({ success: false, error: error.message });
          }
          break;

        case 'enforceTeamStandards':
          try {
            const result = await enforceTeamStandardsOnDoc(request.content, request.guideId);
            sendResponse({ success: true, result });
          } catch (error) {
            sendResponse({ success: false, error: error.message });
          }
          break;

        default:
          sendResponse({ success: false, error: 'Unknown action: ' + request.action });
      }
    } catch (error) {
      console.error('Message handler error:', error);
      sendResponse({ success: false, error: 'Internal error: ' + error.message });
    }
  })();
  
  return true; // Keep channel open for async response
});

// ==========================================
// KEYBOARD SHORTCUTS
// ==========================================

chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'open_sidepanel') {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.sidePanel.open({ tabId: tab.id });
  }
});

// ==========================================
// SIDE PANEL
// ==========================================

chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false });

console.log('PrivacyLens Background Service Worker Ready');