// PrivacyWriter Claude AI Fallback
// Provides Claude Anthropic API as secondary fallback for Pro users
// Only accessed if Gemini Nano and transformers.js fail

class ClaudeAIFallback {
  constructor(apiKey) {
    this.apiKey = apiKey?.trim();
    this.baseURL = 'https://api.anthropic.com/v1/messages';
    this.model = 'claude-3-5-haiku-20241022'; // Fast and cost-effective
    this.maxRetries = 3;
    this.timeout = 30000; // 30 seconds
    this.isValid = this.validateApiKey();
  }

  /**
   * Validate API key format
   */
  validateApiKey() {
    if (!this.apiKey) return false;
    // Claude API keys start with sk-ant-
    return this.apiKey.startsWith('sk-ant-') && this.apiKey.length > 20;
  }

  /**
   * Generic request handler with retry logic and timeout
   */
  async sendRequest(messages, maxTokens = 1024, retries = 0) {
    if (!this.isValid) {
      throw new Error('Invalid Claude API key format. Must start with sk-ant-');
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(this.baseURL, {
        method: 'POST',
        headers: {
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: maxTokens,
          messages: messages
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      // Handle rate limiting with exponential backoff
      if (response.status === 429 && retries < this.maxRetries) {
        const waitTime = Math.pow(2, retries) * 1000; // 1s, 2s, 4s, 8s
        console.warn(`Rate limited. Retrying in ${waitTime}ms (attempt ${retries + 1}/${this.maxRetries})`);
        await this.delay(waitTime);
        return this.sendRequest(messages, maxTokens, retries + 1);
      }

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(`Claude API error (${response.status}): ${error.error?.message || error.message || response.statusText}`);
      }

      const data = await response.json();

      if (!data.content || !data.content[0]) {
        throw new Error('Unexpected Claude API response format');
      }

      return data.content[0].text;

    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('Claude API request timeout');
      }
      throw error;
    }
  }

  /**
   * Check grammar and spelling
   */
  async checkGrammar(text) {
    const messages = [{
      role: 'user',
      content: `Fix grammar, spelling, and punctuation in this text. Return ONLY the corrected text, no explanations:\n\n"${text}"`
    }];

    return this.sendRequest(messages, 256);
  }

  /**
   * Rewrite text with specified tone
   */
  async rewriteText(text, tone = 'professional') {
    const toneMap = {
      'professional': 'professional and formal business English',
      'more-formal': 'professional and formal business English',
      'casual': 'casual, conversational, and friendly English',
      'more-casual': 'casual, conversational, and friendly English',
      'shorter': 'very concise and brief, removing all unnecessary words',
      'longer': 'detailed, expanded, and comprehensive explanations'
    };

    const toneDesc = toneMap[tone] || toneMap['professional'];

    const messages = [{
      role: 'user',
      content: `Rewrite the following text in ${toneDesc} style. Return ONLY the rewritten text, no explanations:\n\n"${text}"`
    }];

    return this.sendRequest(messages, 512);
  }

  /**
   * Summarize text into key points
   */
  async summarizeText(text, length = 'medium') {
    const lengthMap = {
      'short': 'a brief 2-3 sentence summary',
      'medium': '3-5 bullet points covering the main ideas',
      'long': '6-8 bullet points with important details'
    };

    const lengthDesc = lengthMap[length] || lengthMap['medium'];

    const messages = [{
      role: 'user',
      content: `Summarize the following text as ${lengthDesc}. Return ONLY the summary, no additional text:\n\n"${text}"`
    }];

    return this.sendRequest(messages, 512);
  }

  /**
   * Translate text to target language
   */
  async translateText(text, targetLang = 'es') {
    // Language code to full name mapping
    const langMap = {
      'es': 'Spanish', 'fr': 'French', 'de': 'German', 'it': 'Italian',
      'pt': 'Portuguese', 'pl': 'Polish', 'ru': 'Russian', 'ja': 'Japanese',
      'zh': 'Chinese', 'ko': 'Korean', 'ar': 'Arabic', 'hi': 'Hindi',
      'nl': 'Dutch', 'tr': 'Turkish', 'vi': 'Vietnamese', 'th': 'Thai'
    };

    const langName = langMap[targetLang] || langMap['es'];

    const messages = [{
      role: 'user',
      content: `Translate the following text to ${langName}. Return ONLY the translated text, no additional text or explanations:\n\n"${text}"`
    }];

    return this.sendRequest(messages, 512);
  }

  /**
   * Generate content from a prompt
   */
  async generateContent(prompt, context = '') {
    const messages = [{
      role: 'user',
      content: context ? `Context: ${context}\n\nRequest: ${prompt}` : prompt
    }];

    return this.sendRequest(messages, 512);
  }

  /**
   * Analyze writing quality (Pro feature)
   */
  async analyzeWritingQuality(text) {
    const messages = [{
      role: 'user',
      content: `Analyze the writing quality of this text. Provide a score (0-100) and 3-5 specific improvement suggestions. Format as JSON: {"score": <number>, "suggestions": [<string>, ...], "strengths": [<string>, ...]}\n\n"${text}"`
    }];

    const response = await this.sendRequest(messages, 256);

    try {
      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      return jsonMatch ? JSON.parse(jsonMatch[0]) : { score: 0, suggestions: [], strengths: [] };
    } catch (e) {
      return { score: 0, suggestions: [response], strengths: [] };
    }
  }

  /**
   * Utility: Delay for retry logic
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Test API key validity
   */
  async testApiKey() {
    if (!this.isValid) {
      throw new Error('Invalid API key format');
    }

    try {
      const result = await this.sendRequest([{
        role: 'user',
        content: 'Say "OK" if you can see this.'
      }], 10);

      return result.toLowerCase().includes('ok');
    } catch (error) {
      console.error('API key test failed:', error);
      return false;
    }
  }
}

/**
 * Export functions for use in background.js
 */

export async function checkGrammarWithClaude(text, apiKey) {
  const claude = new ClaudeAIFallback(apiKey);
  return claude.checkGrammar(text);
}

export async function rewriteTextWithClaude(text, tone, apiKey) {
  const claude = new ClaudeAIFallback(apiKey);
  return claude.rewriteText(text, tone);
}

export async function summarizeTextWithClaude(text, apiKey) {
  const claude = new ClaudeAIFallback(apiKey);
  return claude.summarizeText(text);
}

export async function translateTextWithClaude(text, targetLang, apiKey) {
  const claude = new ClaudeAIFallback(apiKey);
  return claude.translateText(text, targetLang);
}

export async function analyzeWritingQualityWithClaude(text, apiKey) {
  const claude = new ClaudeAIFallback(apiKey);
  return claude.analyzeWritingQuality(text);
}

export async function testClaudeApiKey(apiKey) {
  const claude = new ClaudeAIFallback(apiKey);
  return claude.testApiKey();
}
