// Expanded language support for Pro users (50+ languages)
export const PRO_LANGUAGES = {
  'af': 'Afrikaans', 'sq': 'Albanian', 'am': 'Amharic', 'ar': 'Arabic', 'hy': 'Armenian',
  'az': 'Azerbaijani', 'eu': 'Basque', 'be': 'Belarusian', 'bn': 'Bengali', 'bs': 'Bosnian',
  'bg': 'Bulgarian', 'ca': 'Catalan', 'ceb': 'Cebuano', 'ny': 'Chichewa', 'zh': 'Chinese',
  'co': 'Corsican', 'hr': 'Croatian', 'cs': 'Czech', 'da': 'Danish', 'nl': 'Dutch',
  'en': 'English', 'eo': 'Esperanto', 'et': 'Estonian', 'tl': 'Filipino', 'fi': 'Finnish',
  'fr': 'French', 'fy': 'Frisian', 'gl': 'Galician', 'ka': 'Georgian', 'de': 'German',
  'el': 'Greek', 'gu': 'Gujarati', 'ht': 'Haitian Creole', 'ha': 'Hausa', 'haw': 'Hawaiian',
  'iw': 'Hebrew', 'hi': 'Hindi', 'hmn': 'Hmong', 'hu': 'Hungarian', 'is': 'Icelandic',
  'ig': 'Igbo', 'id': 'Indonesian', 'ga': 'Irish', 'it': 'Italian', 'ja': 'Japanese',
  'jw': 'Javanese', 'kn': 'Kannada', 'kk': 'Kazakh', 'km': 'Khmer', 'ko': 'Korean',
  'ku': 'Kurdish (Kurmanji)', 'ky': 'Kyrgyz', 'lo': 'Lao', 'la': 'Latin', 'lv': 'Latvian',
  'lt': 'Lithuanian', 'lb': 'Luxembourgish', 'mk': 'Macedonian', 'mg': 'Malagasy', 'ms': 'Malay',
  'ml': 'Malayalam', 'mt': 'Maltese', 'mi': 'Maori', 'mr': 'Marathi', 'mn': 'Mongolian',
  'my': 'Myanmar (Burmese)', 'ne': 'Nepali', 'no': 'Norwegian', 'ps': 'Pashto', 'fa': 'Persian',
  'pl': 'Polish', 'pt': 'Portuguese', 'pa': 'Punjabi', 'ro': 'Romanian', 'ru': 'Russian',
  'sm': 'Samoan', 'gd': 'Scots Gaelic', 'sr': 'Serbian', 'st': 'Sesotho', 'sn': 'Shona',
  'sd': 'Sindhi', 'si': 'Sinhala', 'sk': 'Slovak', 'sl': 'Slovenian', 'so': 'Somali',
  'es': 'Spanish', 'su': 'Sundanese', 'sw': 'Swahili', 'sv': 'Swedish', 'tg': 'Tajik',
  'ta': 'Tamil', 'te': 'Telugu', 'th': 'Thai', 'tr': 'Turkish', 'uk': 'Ukrainian',
  'ur': 'Urdu', 'uz': 'Uzbek', 'vi': 'Vietnamese', 'cy': 'Welsh', 'xh': 'Xhosa',
  'yi': 'Yiddish', 'yo': 'Yoruba', 'zu': 'Zulu'
};

// Free tier limited to 6 core languages
export const FREE_LANGUAGES = ['es', 'fr', 'de', 'zh', 'ja', 'pt'];

/**
 * AI Writing Coach: Analyzes text for quality, tone, and clarity with structured feedback
 */
export async function analyzeWritingQuality(text) {
  if (!text || text.length < 10) throw new Error("Text too short for analysis");
  
  // Use Prompt API
  if (!('ai' in self && 'languageModel' in self.ai)) {
    throw new Error("AI model not available for analysis");
  }

  try {
    const session = await self.ai.languageModel.create({
      systemPrompt: "You are a professional writing coach. Analyze the text for clarity, tone, engagement, readability, and persuasiveness. Return JSON structure with score, feedback, issues (array), strengths (array)."
    });

    const prompt = `Analyze this writing and respond with ONLY valid JSON (no markdown, no backticks):\n\n"${text}"\n\nJSON format:\n{"score": <number 0-100>, "feedback": "<brief feedback>", "issues": ["<issue1>", "<issue2>", "<issue3>"], "strengths": ["<strength1>", "<strength2>"]}`;
    
    const result = await session.prompt(prompt);
    session.destroy();
    
    // Parse the response
    let analysis;
    try {
      // Clean up the response (remove markdown if present)
      const cleanResult = result.replace(/```json/g, '').replace(/```/g, '').trim();
      analysis = JSON.parse(cleanResult);
    } catch (parseError) {
      // Fallback to simple text response if JSON parsing fails
      analysis = {
        score: 75,
        feedback: result,
        issues: ["Consider revisiting tone and clarity"],
        strengths: ["Well-structured content"]
      };
    }
    
    // Save to history
    await saveHistoryItem('coaching', text.substring(0, 100), JSON.stringify(analysis).substring(0, 100));
    
    return analysis;
  } catch (error) {
    throw new Error(`Writing analysis failed: ${error.message}`);
  }
}

/**
 * Content Generator: Generates content based on templates (20+ templates)
 */
export const CONTENT_TEMPLATES = {
  // Email Templates
  'email-professional': { name: 'Professional Email', prompt: 'Write a professional business email about: ' },
  'email-complaint': { name: 'Complaint Email', prompt: 'Write a professional complaint email about: ' },
  'email-request': { name: 'Request Email', prompt: 'Write a polite request email for: ' },
  'email-thank-you': { name: 'Thank You Email', prompt: 'Write a professional thank you email for: ' },
  'email-follow-up': { name: 'Follow-up Email', prompt: 'Write a follow-up email regarding: ' },
  
  // Content Creation
  'blog-intro': { name: 'Blog Post Intro', prompt: 'Write an engaging blog post introduction for the topic: ' },
  'blog-conclusion': { name: 'Blog Post Conclusion', prompt: 'Write a compelling blog post conclusion for: ' },
  'article-headline': { name: 'Article Headline', prompt: 'Generate 5 catchy article headlines for: ' },
  
  // Social Media
  'linkedin-post': { name: 'LinkedIn Post', prompt: 'Write a professional LinkedIn post about: ' },
  'twitter-thread': { name: 'Twitter Thread', prompt: 'Write a Twitter thread (5 tweets) about: ' },
  'instagram-caption': { name: 'Instagram Caption', prompt: 'Write an engaging Instagram caption for: ' },
  'tiktok-script': { name: 'TikTok Script', prompt: 'Write a 15-30 second TikTok script about: ' },
  
  // Professional Content
  'cover-letter': { name: 'Cover Letter', prompt: 'Write a compelling cover letter for the position of: ' },
  'resume-summary': { name: 'Resume Summary', prompt: 'Write a professional resume summary for someone with expertise in: ' },
  'job-description': { name: 'Job Description', prompt: 'Write a job description for the position of: ' },
  
  // Sales & Marketing
  'product-description': { name: 'Product Description', prompt: 'Write a compelling product description for: ' },
  'sales-pitch': { name: 'Sales Pitch', prompt: 'Write a persuasive sales pitch for: ' },
  'testimonial': { name: 'Testimonial', prompt: 'Write a customer testimonial for: ' },
  
  // Creative & Media
  'youtube-script': { name: 'YouTube Script', prompt: 'Write a YouTube video script about: ' },
  'podcast-intro': { name: 'Podcast Intro', prompt: 'Write a compelling podcast introduction for episode about: ' },
  'newsletter': { name: 'Newsletter', prompt: 'Write a newsletter about: ' },
  
  // General Tools (existing)
  'expand': { name: 'Expand Ideas', prompt: 'Expand this idea into detailed full paragraphs: ' },
  'simplify': { name: 'Simplify', prompt: 'Rewrite this to be simple, clear and easy to understand: ' },
};

export async function generateContent(templateType, params) {
  const template = CONTENT_TEMPLATES[templateType];
  if (!template) throw new Error(`Unknown template: ${templateType}`);

  const basePrompt = template.prompt;
  const topic = params.topic || params.text || params.idea || '';
  const context = params.context || params.audience || '';
  
  let fullPrompt = `${basePrompt} ${topic}`;
  if (context) fullPrompt += `\nContext: ${context}`;
  fullPrompt += '\nMake it engaging, professional, and high-quality.';

  if (!('ai' in self && 'languageModel' in self.ai)) {
    throw new Error("AI model not available for generation");
  }

  try {
    const session = await self.ai.languageModel.create({
      systemPrompt: "You are an expert content writer. Create high-quality, engaging, and professional content."
    });
    const result = await session.prompt(fullPrompt);
    session.destroy();
    
    // Save to history
    await saveHistoryItem('generation', topic, result.substring(0, 100));
    
    return result;
  } catch (error) {
    throw new Error(`Content generation failed: ${error.message}`);
  }
}

/**
 * History Manager: Saves actions to local storage for Pro users
 */
export async function saveHistoryItem(type, original, result) {
  try {
    const data = await chrome.storage.local.get(['history', 'isPro']);
    
    // Only save history for Pro users
    if (!data.isPro) return; 

    const history = data.history || [];
    const newItem = {
      id: Date.now(),
      date: new Date().toISOString(),
      type,
      original: original.substring(0, 150) + (original.length > 150 ? '...' : ''),
      result: result.substring(0, 150) + (result.length > 150 ? '...' : ''),
      fullOriginal: original,
      fullResult: result
    };

    // Keep last 500 items
    history.unshift(newItem);
    if (history.length > 500) history.pop();

    await chrome.storage.local.set({ history });
  } catch (e) {
    console.error("Failed to save history:", e);
  }
}

/**
 * Smart History Search and Filter
 */
export async function searchHistory(query, filters = {}) {
  try {
    const data = await chrome.storage.local.get('history');
    let history = data.history || [];

    // Filter by type if specified
    if (filters.type) {
      history = history.filter(item => item.type === filters.type);
    }

    // Filter by date range if specified
    if (filters.startDate) {
      history = history.filter(item => new Date(item.date) >= new Date(filters.startDate));
    }
    if (filters.endDate) {
      history = history.filter(item => new Date(item.date) <= new Date(filters.endDate));
    }

    // Full-text search if query provided
    if (query) {
      const searchTerm = query.toLowerCase();
      history = history.filter(item => 
        item.original.toLowerCase().includes(searchTerm) ||
        item.result.toLowerCase().includes(searchTerm)
      );
    }

    return history;
  } catch (error) {
    throw new Error(`History search failed: ${error.message}`);
  }
}

/**
 * Export History to PDF/CSV
 */
export async function exportHistory(format = 'csv') {
  try {
    const data = await chrome.storage.local.get('history');
    const history = data.history || [];

    if (format === 'csv') {
      const headers = ['Date', 'Type', 'Original', 'Result'];
      const rows = history.map(item => [
        new Date(item.date).toLocaleString(),
        item.type,
        item.original,
        item.result
      ]);
      
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
      ].join('\n');
      
      return csvContent;
    } else if (format === 'json') {
      return JSON.stringify(history, null, 2);
    }
  } catch (error) {
    throw new Error(`Export failed: ${error.message}`);
  }
}

/**
 * Personal Writing Style Profile
 * Learns user's unique writing patterns
 */
export async function buildWritingProfile() {
  try {
    const data = await chrome.storage.local.get('history');
    const history = data.history || [];

    if (history.length < 20) {
      throw new Error("Need at least 20 history items to build profile");
    }

    // Sample analysis from first 100 items
    const sampleSize = Math.min(100, history.length);
    const sample = history.slice(0, sampleSize);

    // Analyze patterns
    const profile = {
      totalItems: history.length,
      createdAt: new Date().toISOString(),
      stats: {
        averageOriginalLength: 0,
        averageResultLength: 0,
        grammarCheckFrequency: 0,
        rewriteFrequency: 0,
        translateFrequency: 0,
        summarizeFrequency: 0,
      },
      patterns: {
        commonMistakes: [],
        preferredTone: 'professional',
        sentencePreference: 'moderate', // short, moderate, long
        vocabularyLevel: 'advanced', // simple, intermediate, advanced
        formalityScore: 0.7, // 0-1
        uniqueWords: new Set(),
      },
      recommendations: []
    };

    // Calculate stats
    let totalOriginal = 0, totalResult = 0;
    const typeCount = {};

    sample.forEach(item => {
      totalOriginal += item.fullOriginal?.length || item.original.length;
      totalResult += item.fullResult?.length || item.result.length;
      typeCount[item.type] = (typeCount[item.type] || 0) + 1;

      // Extract words for vocabulary analysis
      const words = item.fullOriginal?.match(/\b\w+\b/g) || [];
      words.forEach(w => profile.patterns.uniqueWords.add(w.toLowerCase()));
    });

    profile.stats.averageOriginalLength = Math.round(totalOriginal / sample.length);
    profile.stats.averageResultLength = Math.round(totalResult / sample.length);
    profile.stats.grammarCheckFrequency = Math.round((typeCount['grammar'] || 0) / sample.length * 100);
    profile.stats.rewriteFrequency = Math.round((typeCount['rewrite'] || 0) / sample.length * 100);
    profile.stats.translateFrequency = Math.round((typeCount['translate'] || 0) / sample.length * 100);
    profile.stats.summarizeFrequency = Math.round((typeCount['summarize'] || 0) / sample.length * 100);

    // Determine writing preferences
    profile.patterns.vocabularyLevel = profile.patterns.uniqueWords.size > 200 ? 'advanced' : 
                                       profile.patterns.uniqueWords.size > 100 ? 'intermediate' : 'simple';
    
    profile.patterns.sentencePreference = profile.stats.averageOriginalLength > 150 ? 'long' :
                                          profile.stats.averageOriginalLength > 80 ? 'moderate' : 'short';

    // Generate recommendations
    if (profile.stats.grammarCheckFrequency > 30) {
      profile.recommendations.push('Your writing has frequent grammar issues. Use Grammar Coach more often.');
    }
    if (profile.patterns.vocabularyLevel === 'simple' && profile.stats.rewriteFrequency < 20) {
      profile.recommendations.push('Expand your vocabulary with the Rewrite tool to use more varied language.');
    }

    // Clean up Set for storage
    profile.patterns.uniqueWords = profile.patterns.uniqueWords.size;

    await chrome.storage.local.set({ writingProfile: profile });
    return profile;
  } catch (error) {
    throw new Error(`Profile building failed: ${error.message}`);
  }
}

/**
 * Get Writing Profile
 */
export async function getWritingProfile() {
  try {
    const data = await chrome.storage.local.get('writingProfile');
    return data.writingProfile || null;
  } catch (error) {
    throw new Error(`Failed to get writing profile: ${error.message}`);
  }
}

/**
 * Personalize suggestions based on writing profile
 */
export async function personalizeSuggestion(suggestion, text) {
  try {
    const profile = await getWritingProfile();
    if (!profile) return suggestion;

    // Adjust suggestion based on user's style profile
    if (profile.patterns.vocabularyLevel === 'simple') {
      // Add simpler vocabulary emphasis
      return `${suggestion}\n\nNote: This follows your preference for clear, simple language.`;
    } else if (profile.patterns.vocabularyLevel === 'advanced') {
      // Can suggest more formal/complex options
      return `${suggestion}\n\nNote: We detected your advanced vocabulary level - consider more sophisticated alternatives.`;
    }

    return suggestion;
  } catch (error) {
    console.error("Personalization failed:", error);
    return suggestion;
  }
}

/**
 * Advanced Fact-Checking (Pro Plus Feature)
 * Checks text for potential fact accuracy issues and sensitive claims
 * @param {string} text 
 */
export async function checkFacts(text) {
  if (!text || text.length < 20) {
    return {
      score: 100,
      warnings: [],
      claims: [],
      sensitivityFlags: []
    };
  }

  try {
    // Step 1: Fast Static Analysis (Regex)
    const regexClaims = extractClaims(text);
    const sensitivityFlags = checkSensitiveContent(text);
    const regexWarnings = identifyUnverifiableClaims(regexClaims);
    
    let aiResults = null;

    // Step 2: Deep AI Analysis (Pro Feature)
    // Enhances accuracy by understanding context, not just patterns
    if ('ai' in self && 'languageModel' in self.ai) {
      try {
        const session = await self.ai.languageModel.create({
          systemPrompt: "You are an expert fact-checker. Analyze text for credibility, logical fallacies, and unverifiable claims. Return JSON."
        });

        const prompt = `Analyze this text. Return JSON with 'score' (0-100), 'warnings' (array of strings), and 'keyClaims' (array of strings).
        Text: "${text.substring(0, 1500)}"
        JSON:`;

        const result = await session.prompt(prompt);
        session.destroy();

        const cleanResult = result.replace(/```json/g, '').replace(/```/g, '').trim();
        aiResults = JSON.parse(cleanResult);
      } catch (e) {
        console.warn("AI Fact Check unavailable or failed, using static analysis:", e);
      }
    }

    // Step 3: Merge Results
    if (aiResults) {
      const aiWarnings = (aiResults.warnings || []).map(w => ({
        severity: 'medium',
        message: w,
        suggestion: 'Verify with reliable source'
      }));

      return {
        score: Math.round((aiResults.score + (100 - regexWarnings.length * 10)) / 2),
        warnings: [...aiWarnings, ...regexWarnings],
        claims: regexClaims, 
        sensitivityFlags: sensitivityFlags
      };
    }

    // Fallback to static scoring
    const score = Math.max(0, 100 - (regexWarnings.length * 10) - (sensitivityFlags.length * 5));

    return {
      score: Math.min(100, score),
      warnings: regexWarnings,
      claims: regexClaims.slice(0, 5),
      sensitivityFlags: sensitivityFlags
    };
  } catch (error) {
    throw new Error(`Fact-checking failed: ${error.message}`);
  }
}

/**
 * Extract factual claims from text (numbers, specific assertions)
 */
function extractClaims(text) {
  const claims = [];
  
  // Find percentage claims
  const percentMatches = text.matchAll(/(\d+(?:\.\d+)?)\s*%/g);
  for (const match of percentMatches) {
    claims.push({ type: 'percentage', value: match[1], text: match[0] });
  }
  
  // Find year/date claims
  const yearMatches = text.matchAll(/\b(19|20)\d{2}\b/g);
  for (const match of yearMatches) {
    claims.push({ type: 'year', value: match[0], text: match[0] });
  }
  
  // Find quantity claims (numbers followed by units)
  const quantityMatches = text.matchAll(/(\d+(?:,\d{3})*(?:\.\d+)?)\s*(million|billion|trillion|thousand|people|dollars|units|items|files)/gi);
  for (const match of quantityMatches) {
    claims.push({ type: 'quantity', value: match[1], unit: match[2], text: match[0] });
  }
  
  return claims;
}

/**
 * Identify sensitive content that may need fact-checking
 */
function checkSensitiveContent(text) {
  const flags = [];
  const sensitivePatterns = {
    'health claims': /\b(cure|heal|treat|prevent|diagnosis)\s+(cancer|disease|illness)\b/gi,
    'medical assertions': /\b(FDA|clinical trial|approved|cure rate)\b/gi,
    'statistical claims': /\b(study shows|research proves|data indicates)\b/gi,
    'attribution': /\b(studies show|experts say|research found)\b(?!\s+(that|the))/gi,
    'absolute claims': /\b(always|never|all|none)\s+(will|causes|leads to|prevents)\b/gi,
  };

  for (const [flagType, pattern] of Object.entries(sensitivePatterns)) {
    if (pattern.test(text)) {
      const matches = text.match(pattern) || [];
      flags.push({
        type: flagType,
        count: matches.length,
        examples: matches.slice(0, 2)
      });
    }
  }

  return flags;
}

/**
 * Identify claims that cannot be objectively verified
 */
function identifyUnverifiableClaims(claims) {
  const warnings = [];

  if (claims.length === 0) {
    return warnings;
  }

  // Check if we have specific numbers that could be wrong
  const percentageClaims = claims.filter(c => c.type === 'percentage');
  if (percentageClaims.length > 3) {
    warnings.push({
      severity: 'medium',
      message: 'Multiple specific percentages used. Ensure each is sourced.',
      suggestion: 'Add citations for statistical claims'
    });
  }

  // Check for vague timeframes
  const yearClaims = claims.filter(c => c.type === 'year');
  if (yearClaims.length > 0) {
    warnings.push({
      severity: 'low',
      message: 'Contains date-specific claims. Verify current accuracy.',
      suggestion: 'Check if dates are still relevant or if data has changed'
    });
  }

  return warnings;
}

/**
 * Retrieve fact-check results for display
 */
export function getFactCheckResults(text) {
  return checkFacts(text);
}

/**
 * Context Detection: Analyzes text to determine writing context
 * Detects: professional, academic, casual, technical, creative, marketing, legal, social-media
 */
export async function detectContext(text, userSelectedContext = null) {
  if (!text || text.length < 20) {
    throw new Error('Text too short for context detection');
  }

  // Analyze text characteristics
  const sentences = text.match(/[.!?]+/g) || [];
  const words = text.split(/\s+/).filter(w => w.length > 0);
  const avgSentenceLength = words.length / (sentences.length || 1);
  
  // Tone detection
  const tone = detectTone(text);
  const formalityLevel = calculateFormality(text);
  
  // Context scoring
  const contextScores = {
    professional: scoreContext(text, 'professional'),
    academic: scoreContext(text, 'academic'),
    casual: scoreContext(text, 'casual'),
    technical: scoreContext(text, 'technical'),
    creative: scoreContext(text, 'creative'),
    marketing: scoreContext(text, 'marketing'),
    legal: scoreContext(text, 'legal'),
    'social-media': scoreContext(text, 'social-media')
  };

  // Determine detected context
  const detectedContext = Object.entries(contextScores)
    .sort(([, a], [, b]) => b - a)[0][0];
  
  const confidence = Math.round(contextScores[detectedContext]);

  // Determine audience based on context
  const audienceMap = {
    professional: 'Business professionals, colleagues',
    academic: 'Academics, researchers, educators',
    casual: 'Friends, peers, informal groups',
    technical: 'Developers, engineers, technical teams',
    creative: 'Readers, audiences, creative communities',
    marketing: 'Customers, potential buyers, prospects',
    legal: 'Legal professionals, parties, courts',
    'social-media': 'Social followers, general public'
  };

  // Get recommendations
  const recommendations = getContextRecommendations(detectedContext, tone);

  // Calculate clarity score (0-100)
  const clarityScore = Math.min(100, Math.round(
    (100 - Math.abs(avgSentenceLength - 17) * 2) // Optimal sentence length is ~17 words
  ));

  // Calculate complexity
  const avgWordLength = words.reduce((sum, w) => sum + w.length, 0) / words.length;
  const complexity = avgWordLength > 6 ? 'High' : avgWordLength > 4 ? 'Medium' : 'Low';

  // Determine writing style
  const writingStyle = getWritingStyle(text, detectedContext);

  // Save context detection to history
  await saveHistoryItem('context-detection', text.substring(0, 100), JSON.stringify({
    detectedContext,
    confidence,
    tone
  }).substring(0, 100));

  return {
    detectedContext,
    confidence,
    tone,
    formalityLevel,
    audience: audienceMap[detectedContext],
    writingStyle,
    avgSentenceLength: Math.round(avgSentenceLength),
    complexity,
    clarityScore,
    recommendations
  };
}

/**
 * Score text for a specific context (0-100)
 */
function scoreContext(text, context) {
  let score = 50; // Base score
  const lowerText = text.toLowerCase();

  const contextKeywords = {
    professional: {
      words: ['hereby', 'regarding', 'proposal', 'meeting', 'stakeholder', 'deliverable', 'synergy', 'leverage', 'bandwidth', 'alignment'],
      phrases: ['in accordance with', 'as per', 'at your earliest convenience', 'action items'],
      weight: 10
    },
    academic: {
      words: ['research', 'hypothesis', 'methodology', 'analysis', 'conclusion', 'citation', 'academic', 'scholarly', 'findings', 'study'],
      phrases: ['in conclusion', 'furthermore', 'moreover', 'it has been demonstrated', 'according to'],
      weight: 10
    },
    casual: {
      words: ['hey', 'yeah', 'cool', 'awesome', 'lol', 'btw', 'omg', 'like', 'gonna', 'wanna'],
      phrases: ['you know', 'sort of', 'kind of', 'i think', 'i feel'],
      weight: 15
    },
    technical: {
      words: ['function', 'variable', 'algorithm', 'database', 'server', 'api', 'json', 'xml', 'cache', 'query'],
      phrases: ['implementation details', 'stack trace', 'dependency', 'version', 'config'],
      weight: 12
    },
    creative: {
      words: ['imagine', 'felt', 'whispered', 'trembled', 'ethereal', 'magnificent', 'shadow', 'light', 'wonder', 'dream'],
      phrases: ['once upon a time', 'in a world', 'as if', 'seemed to'],
      weight: 10
    },
    marketing: {
      words: ['exclusive', 'limited', 'offer', 'discount', 'free', 'bonus', 'urgent', 'special', 'amazing', 'save'],
      phrases: ['call to action', 'don\'t miss out', 'act now', 'limited time'],
      weight: 12
    },
    legal: {
      words: ['hereinafter', 'whereas', 'thereof', 'hereunder', 'aforementioned', 'defendant', 'plaintiff', 'clause', 'covenant'],
      phrases: ['in the event of', 'notwithstanding', 'severability clause', 'binding agreement'],
      weight: 11
    },
    'social-media': {
      words: ['retweet', 'hashtag', '#', '@', 'emoji', 'follow', 'like', 'share', 'trending', 'viral'],
      phrases: ['check this out', 'must read', 'swipe up', 'drop a like'],
      weight: 13
    }
  };

  const contextData = contextKeywords[context];
  if (!contextData) return score;

  // Check for context keywords
  contextData.words.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    const matches = lowerText.match(regex) || [];
    score += matches.length * contextData.weight;
  });

  // Check for context phrases
  contextData.phrases.forEach(phrase => {
    const matches = (lowerText.match(new RegExp(phrase, 'gi')) || []).length;
    score += matches * (contextData.weight * 2);
  });

  // Normalize to 0-100
  return Math.min(100, Math.max(0, score));
}

/**
 * Detect tone of the text
 */
function detectTone(text) {
  const lowerText = text.toLowerCase();
  
  const tones = {
    'professional': ['hereby', 'regarding', 'proposal', 'recommend', 'suggest'],
    'academic': ['research', 'study', 'findings', 'conclude', 'demonstrate'],
    'friendly': ['please', 'thank', 'appreciate', 'glad', 'would love'],
    'urgent': ['urgent', 'immediate', 'asap', 'critical', 'emergency'],
    'persuasive': ['must', 'should', 'important', 'crucial', 'necessary'],
    'formal': ['hereby', 'moreover', 'furthermore', 'notwithstanding']
  };

  let detectedTone = 'neutral';
  let maxMatches = 0;

  Object.entries(tones).forEach(([tone, words]) => {
    const matches = words.filter(w => lowerText.includes(w)).length;
    if (matches > maxMatches) {
      maxMatches = matches;
      detectedTone = tone;
    }
  });

  return detectedTone.charAt(0).toUpperCase() + detectedTone.slice(1);
}

/**
 * Calculate formality level
 */
function calculateFormality(text) {
  const contractions = (text.match(/\b(don't|isn't|won't|can't|shouldn't|wouldn't|haven't|hasn't|didn't|doesn't|aren't|I'm|it's|that's|you're|we're|they're)\b/gi) || []).length;
  const informalWords = (text.match(/\b(gonna|wanna|gotta|kinda|sorta|yeah|yep|nope)(\W|$)/gi) || []).length;
  const formalWords = (text.match(/\b(hereby|moreover|furthermore|notwithstanding|aforementioned|thereof)\b/gi) || []).length;

  const informalScore = (contractions + informalWords) * 2;
  const formalScore = formalWords * 3;

  if (formalScore > informalScore * 2) return 'Very Formal';
  if (formalScore > informalScore) return 'Formal';
  if (informalScore > formalScore * 2) return 'Very Casual';
  if (informalScore > formalScore) return 'Casual';
  return 'Balanced';
}

/**
 * Get writing style description
 */
function getWritingStyle(text, context) {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const avgLength = text.split(/\s+/).length / sentences.length;

  if (avgLength > 20) return 'Elaborate & detailed';
  if (avgLength > 15) return 'Balanced & comprehensive';
  if (avgLength > 10) return 'Concise & focused';
  return 'Short & punchy';
}

/**
 * Get context-specific recommendations
 */
function getContextRecommendations(context, tone) {
  const recommendations = {
    professional: [
      { title: 'Use Active Voice', description: 'Replace passive constructions with active voice for clarity and impact' },
      { title: 'Avoid Jargon', description: 'Use clear language that stakeholders can understand' },
      { title: 'Follow Business Tone', description: 'Maintain a respectful, objective tone appropriate for business communication' },
      { title: 'Parallel Structure', description: 'Use consistent structure for lists and bullet points' }
    ],
    academic: [
      { title: 'Cite Sources', description: 'Ensure all claims and quotes have proper citations' },
      { title: 'Use Formal Language', description: 'Avoid contractions and colloquialisms' },
      { title: 'Define Terms', description: 'Clearly define specialized terminology on first use' },
      { title: 'Maintain Objectivity', description: 'Use third person and avoid personal opinions' }
    ],
    casual: [
      { title: 'Keep It Natural', description: 'Maintain conversational tone while staying clear' },
      { title: 'Use Contractions', description: 'Contractions make casual writing feel more natural' },
      { title: 'Be Relatable', description: 'Use examples and references your audience understands' },
      { title: 'Show Personality', description: 'Let your voice come through in your writing' }
    ],
    technical: [
      { title: 'Be Precise', description: 'Use exact terminology and avoid ambiguity' },
      { title: 'Include Examples', description: 'Provide code samples or concrete examples' },
      { title: 'Explain Concepts', description: 'Assume some technical knowledge but explain new concepts' },
      { title: 'Use Lists', description: 'Break down complex information with bullet points' }
    ],
    creative: [
      { title: 'Show Don\'t Tell', description: 'Use vivid descriptions instead of stating emotions' },
      { title: 'Vary Sentence Length', description: 'Mix short punchy sentences with longer flowing ones' },
      { title: 'Use Sensory Details', description: 'Engage multiple senses in your descriptions' },
      { title: 'Develop Character Voice', description: 'Make your characters\' dialogue and thoughts distinct' }
    ],
    marketing: [
      { title: 'Focus on Benefits', description: 'Highlight what customers gain, not just features' },
      { title: 'Use Power Words', description: 'Include action verbs like "discover", "transform", "get"' },
      { title: 'Create Urgency', description: 'Use limited-time offers or exclusive language' },
      { title: 'Clear Call-to-Action', description: 'Make it obvious what you want readers to do' }
    ],
    legal: [
      { title: 'Be Precise', description: 'Use exact legal terminology to avoid ambiguity' },
      { title: 'Define Terms', description: 'Clearly define all potential ambiguous terms' },
      { title: 'Consider Implications', description: 'Review for unintended legal interpretations' },
      { title: 'Use Conditional Language', description: 'Use "if/then" and "provided that" for conditions' }
    ],
    'social-media': [
      { title: 'Keep It Brief', description: 'Shorter posts get better engagement' },
      { title: 'Use Emojis Wisely', description: 'Emojis add personality but don\'t overuse' },
      { title: 'Include Hashtags', description: 'Use relevant hashtags to increase discoverability' },
      { title: 'Ask Questions', description: 'Encourage engagement by asking your audience' }
    ]
  };

  return recommendations[context] || recommendations.professional;
}
