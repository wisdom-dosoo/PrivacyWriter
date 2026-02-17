/**
 * PrivacyWriter API Server (Vercel Serverless Function)
 * 
 * Handles API requests for Teams & Integrations.
 * Implements stubbed logic for core writing features.
 * 
 * Endpoints handled via 'action' parameter or body:
 * - check-grammar
 * - rewrite
 * - summarize
 * - translate
 */

export default async function handler(req, res) {
  // 1. CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  // Handle OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // 2. Authentication Check
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer pl_')) {
    return res.status(401).json({ 
      success: false, 
      error: 'Unauthorized. Invalid or missing API Key. Keys must start with "pl_".' 
    });
  }

  // 3. Request Validation
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed. Use POST.' });
  }

  const { text, action, options = {} } = req.body;

  if (!text || typeof text !== 'string') {
    return res.status(400).json({ success: false, error: 'Missing "text" in request body.' });
  }

  if (!action) {
    return res.status(400).json({ success: false, error: 'Missing "action" in request body.' });
  }

  // 4. Logic Dispatch (Stubbed AI)
  try {
    let result;
    const startTime = Date.now();

    switch (action) {
      case 'check-grammar':
        result = simpleGrammarFix(text);
        break;

      case 'rewrite':
        result = simpleRewrite(text, options.style || 'professional');
        break;

      case 'summarize':
        result = simpleSummarize(text);
        break;

      case 'translate':
        result = simpleTranslate(text, options.targetLang || 'es');
        break;

      default:
        return res.status(400).json({ success: false, error: `Unknown action: ${action}` });
    }

    // 5. Response
    return res.status(200).json({
      success: true,
      data: {
        result: result,
        originalLength: text.length,
        resultLength: result.length,
        processingTimeMs: Date.now() - startTime,
        model: 'privacy-writer-stub-v1'
      }
    });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error processing request.' });
  }
}

// --- Stubbed Logic Functions (Rule-based Fallbacks) ---

function simpleGrammarFix(text) {
  let corrected = text;
  // Capitalize 'i'
  corrected = corrected.replace(/\bi\b/g, 'I');
  // Fix spacing
  corrected = corrected.replace(/\s{2,}/g, ' ');
  corrected = corrected.replace(/\s+([.,!?;:])/g, '$1');
  corrected = corrected.replace(/([.,!?;:])([A-Z])/g, '$1 $2');
  // Common typos
  const typos = { 'teh': 'the', 'adn': 'and', 'dont': "don't", 'cant': "can't" };
  Object.entries(typos).forEach(([k, v]) => {
    corrected = corrected.replace(new RegExp(`\\b${k}\\b`, 'gi'), v);
  });
  // Capitalize sentences
  corrected = corrected.replace(/(^|\.\s+)([a-z])/g, (m, p1, p2) => p1 + p2.toUpperCase());
  return corrected;
}

function simpleRewrite(text, style) {
  let rewritten = text;
  if (style === 'professional' || style === 'more-formal') {
    const formalMap = {
      "can't": "cannot", "won't": "will not", "don't": "do not",
      "gonna": "going to", "wanna": "want to", "hey": "hello",
      "check out": "review", "get": "obtain", "use": "utilize"
    };
    Object.entries(formalMap).forEach(([k, v]) => {
      rewritten = rewritten.replace(new RegExp(`\\b${k}\\b`, 'gi'), v);
    });
  } else if (style === 'shorter') {
    const fillers = ['very', 'really', 'quite', 'actually', 'basically', 'literally'];
    fillers.forEach(w => {
      rewritten = rewritten.replace(new RegExp(`\\b${w}\\s?`, 'gi'), '');
    });
  }
  return rewritten;
}

function simpleSummarize(text) {
  // Mock summary: First sentence + Last sentence
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  if (sentences.length <= 2) return text;
  return sentences[0].trim() + ' ' + sentences[sentences.length - 1].trim();
}

function simpleTranslate(text, lang) {
  // Mock translation: Append language tag
  const langNames = { 'es': 'Spanish', 'fr': 'French', 'de': 'German', 'zh': 'Chinese' };
  return `[Translated to ${langNames[lang] || lang}]: ${text}`;
}