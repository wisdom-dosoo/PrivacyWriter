// Expanded language support for Pro users (50+ languages)
const PRO_LANGUAGES = {
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
const FREE_LANGUAGES = ['es', 'fr', 'de', 'zh', 'ja', 'pt'];

/**
 * AI Writing Coach: Analyzes text for quality, tone, and clarity
 */
async function analyzeWritingQuality(text) {
  if (!text || text.length < 10) throw new Error("Text too short for analysis");
  
  // Use Prompt API
  if (!('ai' in self && 'languageModel' in self.ai)) {
    throw new Error("AI model not available for analysis");
  }

  // Create a specific session for coaching
  const session = await self.ai.languageModel.create({
    systemPrompt: "You are a professional writing coach. Analyze the text for clarity, tone, and engagement. Provide a score out of 100 and 3 specific improvement tips."
  });

  const prompt = `Analyze this text:\n"${text}"\n\nOutput format:\nScore: [0-100]\nSummary: [One sentence]\nTips:\n1. [Tip]\n2. [Tip]\n3. [Tip]`;
  const result = await session.prompt(prompt);
  
  // Clean up
  session.destroy();
  
  return result;
}

/**
 * Content Generator: Generates content based on templates
 */
async function generateContent(templateType, params) {
  const templates = {
    'email': "Write a professional email about: ",
    'blog': "Write a blog post introduction about: ",
    'social': "Write a social media post for: ",
    'cover-letter': "Write a cover letter for the position of: ",
    'expand': "Expand this idea into a full paragraph: ",
    'simplify': "Rewrite this to be simple and easy to understand: "
  };

  const basePrompt = templates[templateType] || "Write about: ";
  const fullPrompt = `${basePrompt} ${params.topic || params.text}. \nContext: ${params.context || ''}`;

  if (!('ai' in self && 'languageModel' in self.ai)) {
    throw new Error("AI model not available for generation");
  }

  const session = await self.ai.languageModel.create();
  const result = await session.prompt(fullPrompt);
  session.destroy();
  
  return result;
}

/**
 * History Manager: Saves actions to local storage for Pro users
 */
async function saveHistoryItem(type, original, result) {
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
      result: result.substring(0, 150) + (result.length > 150 ? '...' : '')
    };

    // Keep last 100 items
    history.unshift(newItem);
    if (history.length > 100) history.pop();

    await chrome.storage.local.set({ history });
  } catch (e) {
    console.error("Failed to save history:", e);
  }
}