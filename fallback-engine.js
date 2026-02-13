// PrivacyWriter Fallback AI Engine using Transformers.js
// Handles local inference when Chrome Built-in AI is unavailable

// Enhanced Configuration with model metadata and error recovery
const FALLBACK_CONFIG = {
  models: {
    grammar: {
      name: 'Xenova/LaMini-Flan-T5-248M',
      type: 'text2text-generation',
      size: '960MB',
      purpose: 'Grammar, spelling, general corrections',
      timeout: 20000,
      maxTokens: 256
    },
    rewrite: {
      name: 'Xenova/LaMini-Flan-T5-248M',
      type: 'text2text-generation',
      size: '960MB',
      purpose: 'Text rewriting and tone adjustment',
      timeout: 20000,
      maxTokens: 512
    },
    summarize: {
      name: 'Xenova/distilbart-cnn-6-6',
      type: 'summarization',
      size: '580MB',
      purpose: 'Text summarization and abstractive compression',
      timeout: 20000,
      maxTokens: 256
    },
    translate: {
      name: 'Xenova/nllb-200-distilled-600M',
      type: 'translation',
      size: '600MB',
      purpose: 'Translation to 200+ languages',
      timeout: 25000,
      maxTokens: 512
    }
  },
  libPath: './lib/transformers.js',
  // Fallback to simple rules if models fail
  enableSimpleRules: true,
  // Model download progress
  showProgress: true
};

// Singleton to hold active pipelines with metadata
const activePipelines = {};
const pipelineStatus = {}; // Track which models have been attempted

/**
 * Lazy loads Transformers.js and initializes the specific pipeline with error recovery
 */
async function getPipeline(task, modelConfig = null) {
  const config = modelConfig || FALLBACK_CONFIG.models[task];
  const cacheKey = config.name;

  // Return cached pipeline if available
  if (activePipelines[cacheKey]) {
    console.log(`Using cached pipeline for ${task}`);
    return activePipelines[cacheKey];
  }

  // Prevent duplicate download attempts
  if (pipelineStatus[cacheKey] === 'loading') {
    console.warn(`Pipeline ${cacheKey} is already loading, waiting...`);
    return new Promise(resolve => {
      const checkInterval = setInterval(() => {
        if (activePipelines[cacheKey]) {
          clearInterval(checkInterval);
          resolve(activePipelines[cacheKey]);
        }
      }, 100);
    });
  }

  pipelineStatus[cacheKey] = 'loading';

  try {
    console.log(`[${new Date().toLocaleTimeString()}] Loading ${task} model: ${config.name} (${config.size})`);

    // Notify background that download is in progress
    try {
      chrome.runtime.sendMessage({
        action: 'updateModelStatus',
        task: task,
        status: 'downloading',
        model: config.name
      }).catch(() => {}); // Ignore if no listener
    } catch (e) {}

    // Dynamic import with timeout protection
    const { pipeline, env } = await withTimeout(
      import(chrome.runtime.getURL(FALLBACK_CONFIG.libPath)),
      30000,
      `Failed to load transformers.js library for ${task}`
    );

    // Configure transformers environment
    env.allowLocalModels = false;
    env.useBrowserCache = true;
    env.allowRemoteModels = true;

    // Create pipeline with retry logic
    const pipe = await withTimeout(
      pipeline(config.type, config.name),
      config.timeout,
      `Model download timeout for ${task} (${config.name})`
    );

    activePipelines[cacheKey] = pipe;
    pipelineStatus[cacheKey] = 'ready';

    console.log(`✅ Successfully loaded ${task} model`);

    // Notify success
    try {
      chrome.runtime.sendMessage({
        action: 'updateModelStatus',
        task: task,
        status: 'ready',
        model: config.name
      }).catch(() => {});
    } catch (e) {}

    return pipe;

  } catch (error) {
    pipelineStatus[cacheKey] = 'failed';
    console.error(`❌ Failed to load ${task} model:`, error);

    // Notify failure
    try {
      chrome.runtime.sendMessage({
        action: 'updateModelStatus',
        task: task,
        status: 'failed',
        error: error.message
      }).catch(() => {});
    } catch (e) {}

    throw error;
  }
}

/**
 * Utility: Execute promise with timeout
 */
function withTimeout(promise, ms, errorMsg) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(errorMsg || 'Operation timed out')), ms)
    )
  ]);
}

/**
 * Main entry point called by background.js with robust error recovery
 */
async function runFallbackAI(task, text, options = {}) {
  console.log(`[Fallback AI] Processing task: ${task}`);

  if (!text || text.trim().length === 0) {
    throw new Error('Input text cannot be empty');
  }

  // Text length validation
  const maxLengths = { grammar: 50000, rewrite: 50000, summarize: 100000, translate: 50000, write: 50000 };
  if (text.length > (maxLengths[task] || 50000)) {
    throw new Error(`Text exceeds maximum length of ${maxLengths[task]} characters for ${task}`);
  }

  try {
    let result;

    switch (task) {
      case 'grammar':
        try {
          result = await performGrammarCheck(text);
        } catch (err) {
          console.warn('Grammar model failed, trying simple rules:', err);
          if (FALLBACK_CONFIG.enableSimpleRules) {
            result = simpleGrammarFix(text);
          } else {
            throw err;
          }
        }
        break;

      case 'rewrite':
        try {
          result = await performRewrite(text, options.style || 'professional');
        } catch (err) {
          console.warn('Rewrite model failed, trying simple rules:', err);
          if (FALLBACK_CONFIG.enableSimpleRules) {
            result = simpleRewrite(text, options.style);
          } else {
            throw err;
          }
        }
        break;

      case 'summarize':
        // Minimum 20 words check
        const wordCount = text.split(/\s+/).length;
        if (wordCount < 20) {
          throw new Error('Text must be at least 20 words to summarize');
        }
        result = await performSummarize(text);
        break;

      case 'translate':
        result = await performTranslate(text, options.targetLang || 'es');
        break;

      case 'write':
        result = await performWrite(text);
        break;

      default:
        throw new Error(`Unknown fallback task: ${task}`);
    }

    if (!result || result.trim().length === 0) {
      throw new Error(`${task} produced empty result`);
    }

    console.log(`✅ ${task} completed successfully`);
    return result;

  } catch (error) {
    console.error(`❌ Fallback AI Error for ${task}:`, error);
    throw new Error(`Local AI failed for ${task}: ${error.message}`);
  }
}

/**
 * Perform grammar checking with fallback to simple rules
 */
async function performGrammarCheck(text) {
  const config = FALLBACK_CONFIG.models.grammar;
  const pipe = await getPipeline('grammar', config);
  const prompt = `Fix grammar and spelling errors. Return only corrected text:\n\n"${text}"`;
  const output = await withTimeout(
    pipe(prompt, { max_new_tokens: config.maxTokens }),
    config.timeout
  );
  return output[0]?.generated_text || text;
}

/**
 * Perform text rewriting with style
 */
async function performRewrite(text, style) {
  const config = FALLBACK_CONFIG.models.rewrite;
  const pipe = await getPipeline('rewrite', config);

  // Map shorthand styles to descriptions
  const styleMap = {
    'professional': 'professional and formal',
    'more-formal': 'professional and formal',
    'casual': 'casual and friendly',
    'more-casual': 'casual and friendly',
    'shorter': 'concise and brief',
    'longer': 'detailed and expanded'
  };

  const styleDesc = styleMap[style] || style;
  const prompt = `Rewrite this text to be ${styleDesc}. Return only rewritten text:\n\n"${text}"`;
  const output = await withTimeout(
    pipe(prompt, { max_new_tokens: config.maxTokens }),
    config.timeout
  );
  return output[0]?.generated_text || text;
}

/**
 * Perform summarization
 */
async function performSummarize(text) {
  const config = FALLBACK_CONFIG.models.summarize;
  const pipe = await getPipeline('summarize', config);
  const output = await withTimeout(
    pipe(text, { max_new_tokens: config.maxTokens }),
    config.timeout
  );
  return output[0]?.summary_text || text;
}

/**
 * Perform translation
 */
async function performTranslate(text, targetLang) {
  const config = FALLBACK_CONFIG.models.translate;
  const pipe = await getPipeline('translate', config);
  const srcLang = 'eng_Latn'; // Default to English source
  const tgtLang = mapToNLLB(targetLang);

  const output = await withTimeout(
    pipe(text, { src_lang: srcLang, tgt_lang: tgtLang }),
    config.timeout
  );
  return output[0]?.translation_text || text;
}

/**
 * Perform content writing/generation
 */
async function performWrite(text) {
  const config = FALLBACK_CONFIG.models.rewrite; // Reuse rewrite model
  const pipe = await getPipeline('write', config);
  const output = await withTimeout(
    pipe(text, { max_new_tokens: config.maxTokens }),
    config.timeout
  );
  return output[0]?.generated_text || text;
}

// Helper for NLLB language codes
function mapToNLLB(code) {
  const map = {
    'es': 'spa_Latn', 'fr': 'fra_Latn', 'de': 'deu_Latn',
    'zh': 'zho_Hans', 'ja': 'jpn_Jpan', 'pt': 'por_Latn',
    'ru': 'rus_Cyrl', 'hi': 'hin_Deva', 'ar': 'arb_Arab',
    'it': 'ita_Latn', 'nl': 'nld_Latn', 'pl': 'pol_Latn',
    'tr': 'tur_Latn', 'ko': 'kor_Hang', 'vi': 'vie_Latn'
  };
  return map[code] || 'spa_Latn';
}

/**
 * TIER 5 FALLBACK: Simple regex-based grammar fixes (no ML needed)
 * Used when all models fail
 */
function simpleGrammarFix(text) {
  let corrected = text;

  // Common grammar patterns
  // 1. Capitalize 'I'
  corrected = corrected.replace(/\bi\b/g, 'I');

  // 2. Remove double spaces
  corrected = corrected.replace(/\s{2,}/g, ' ');

  // 3. Space before punctuation
  corrected = corrected.replace(/\s+([.,!?;:])/g, '$1');

  // 4. Add space after punctuation if missing
  corrected = corrected.replace(/([.,!?;:])([A-Z])/g, '$1 $2');

  // 5. Common typo fixes
  const typos = {
    'teh ': 'the ',
    'adn ': 'and ',
    'recieve': 'receive',
    'thier': 'their',
    'its a': 'it\'s a',
    'your welcome': 'you\'re welcome',
    'alot': 'a lot'
  };

  Object.entries(typos).forEach(([typo, fix]) => {
    const regex = new RegExp(`\\b${typo}\\b`, 'gi');
    corrected = corrected.replace(regex, fix);
  });

  // 6. Capitalize first letter of sentence
  corrected = corrected.replace(/(^|\.\s+)([a-z])/g, (match, p1, p2) => p1 + p2.toUpperCase());

  return corrected || text;
}

/**
 * TIER 5 FALLBACK: Simple text rewriting based on rules
 */
function simpleRewrite(text, style) {
  let rewritten = text;

  switch (style?.toLowerCase()) {
    case 'shorter':
    case 'more-concise':
      // Remove filler words
      const fillerWords = [
        '\\bin my opinion\\b', 'very ', 'really ', 'quite ', 'rather ', 'somewhat '
      ];
      fillerWords.forEach(word => {
        rewritten = rewritten.replace(new RegExp(word, 'gi'), '');
      });
      break;

    case 'longer':
    case 'more-detailed':
      // Add some descriptive words (very basic)
      rewritten = rewritten.replace(/\badd\b/gi, 'incorporate');
      rewritten = rewritten.replace(/\buse\b/gi, 'utilize');
      rewritten = rewritten.replace(/\bget\b/gi, 'obtain');
      break;

    case 'professional':
    case 'more-formal':
      // Replace casual with formal
      const informalToFormal = {
        "don't": "do not",
        "can't": "cannot",
        "won't": "will not",
        "it's": "it is",
        "you're": "you are",
        "we're": "we are",
        "gonna": "going to",
        "wanna": "want to",
        "hey ": "hello ",
        "gotta": "have to",
        "kinda": "kind of",
        "sorta": "sort of"
      };

      Object.entries(informalToFormal).forEach(([informal, formal]) => {
        const regex = new RegExp(`\\b${informal}\\b`, 'gi');
        rewritten = rewritten.replace(regex, formal);
      });
      break;

    case 'casual':
    case 'more-casual':
      // Replace formal with casual (carefully)
      rewritten = rewritten.replace(/\bcannot\b/gi, "can't");
      rewritten = rewritten.replace(/\bdo not\b/gi, "don't");
      rewritten = rewritten.replace(/\bwill not\b/gi, "won't");
      break;

    default:
      // Return as-is if style not recognized
      return text;
  }

  return rewritten || text;
}

/**
 * Get list of downloaded models status
 */
async function getModelDownloadStatus() {
  const status = {};
  Object.keys(FALLBACK_CONFIG.models).forEach(task => {
    status[task] = {
      status: pipelineStatus[FALLBACK_CONFIG.models[task].name] || 'not-started',
      size: FALLBACK_CONFIG.models[task].size,
      purpose: FALLBACK_CONFIG.models[task].purpose
    };
  });
  return status;
}

/**
 * Clear all cached pipelines (for debugging or settings reset)
 */
function clearPolicelines() {
  Object.keys(activePipelines).forEach(key => {
    delete activePipelines[key];
    delete pipelineStatus[key];
  });
  console.log('All cached pipelines cleared');
  return true;
}