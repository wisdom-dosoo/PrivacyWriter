/**
 * Advanced Pro Features
 * - Advanced Proofreading & Fact-Checking
 * - Contextual Writing Assistant
 * - Team Collaboration
 * - Writing Analytics
 */

/**
 * Advanced Proofreading: Multi-pass analysis
 */
async function advancedProofread(text) {
  if (!text || text.length < 20) {
    throw new Error("Text too short for proofreading");
  }

  if (!('ai' in self && 'languageModel' in self.ai)) {
    throw new Error("AI model not available");
  }

  try {
    const session = await self.ai.languageModel.create({
      systemPrompt: "You are an expert proofreader. Provide comprehensive editing feedback."
    });

    const proofPrompt = `Perform comprehensive proofreading on this text:\n\n"${text}"\n\nAnalyze and report on:\n1. GRAMMAR & SYNTAX - List every grammatical error\n2. CLARITY - Identify unclear sentences\n3. TONE CONSISTENCY - Flag inconsistent tone\n4. WORD CHOICE - Suggest better word choices\n5. PUNCTUATION - Identify punctuation errors\n6. READABILITY - Rate readability 1-10\n7. POTENTIAL ISSUES - Check for:
   - Offensive language (sensitivity check)
   - Repetition\n   - Awkward phrasing\n\nFormat each finding as:\n[TYPE] | Position | Issue | Suggestion\n\nEnd with a SUMMARY with confidence scores.`;

    const result = await session.prompt(proofPrompt);
    session.destroy();

    await saveHistoryItem('proofreading', text.substring(0, 100), result.substring(0, 100));
    
    return parseProofreadingResult(result);
  } catch (error) {
    throw new Error(`Proofreading failed: ${error.message}`);
  }
}

/**
 * Parse proofreading result into structured format
 */
function parseProofreadingResult(result) {
  const issues = [];
  const lines = result.split('\n');
  let currentSection = '';

  lines.forEach(line => {
    if (line.includes('GRAMMAR') || line.includes('CLARITY') || line.includes('TONE') || 
        line.includes('WORD CHOICE') || line.includes('PUNCTUATION')) {
      currentSection = line.substring(0, 15);
    }
    
    if (line.includes('|')) {
      const parts = line.split('|').map(p => p.trim());
      if (parts.length >= 3) {
        issues.push({
          type: currentSection,
          issue: parts[1],
          suggestion: parts[2] || parts[3] || ''
        });
      }
    }
  });

  return {
    issues: issues,
    summary: result.substring(result.indexOf('SUMMARY'), result.length),
    totalIssues: issues.length,
    severity: issues.length > 10 ? 'high' : issues.length > 5 ? 'medium' : 'low'
  };
}

/**
 * Fact-Checking Layer
 */
async function factCheckText(text) {
  if (!text || text.length < 50) {
    throw new Error("Text too short for fact-checking");
  }

  try {
    const claims = extractClaims(text);
    
    // Use AI to validate claims
    if (!('ai' in self && 'languageModel' in self.ai)) {
      throw new Error("AI model not available");
    }

    const session = await self.ai.languageModel.create({
      systemPrompt: "You are a fact-checker. Evaluate the credibility of claims and identify anything that might need verification."
    });

    const checkPrompt = `Evaluate these claims from the text:\n${claims.join('\n')}\n\nFor each claim, provide:\n1. Confidence level (high/medium/low)\n2. If needs verification\n3. Supporting context if known\n\nFormat:\nCLAIM: [claim]\nCONFIDENCE: [level]\nVERIFICATION: [needed/not needed]\nNOTES: [notes]`;

    const result = await session.prompt(checkPrompt);
    session.destroy();

    return {
      claims: claims,
      analysis: result,
      status: 'ready_for_review'
    };
  } catch (error) {
    throw new Error(`Fact-checking failed: ${error.message}`);
  }
}

/**
 * Extract claims from text (sentences with assertions)
 */
function extractClaims(text) {
  const sentences = text.match(/[^.!?]*[.!?]+/g) || [text];
  return sentences
    .map(s => s.trim())
    .filter(s => s.length > 20)
    .slice(0, 10); // Limit to 10 claims
}

/**
 * Contextual Writing Assistant
 */
const CONTEXT_TYPES = {
  'professional': {
    name: 'Professional/Business',
    rules: {
      tone: 'formal',
      maxSlang: 0,
      minFormality: 0.8,
      warnings: ['casual language', 'emoji', 'exclamation marks']
    }
  },
  'academic': {
    name: 'Academic/Scholarly',
    rules: {
      tone: 'formal_scholarly',
      minCitations: true,
      maxColloquial: 0,
      warnings: ['first person', 'contractions', 'personal anecdotes']
    }
  },
  'casual': {
    name: 'Casual/Friendly',
    rules: {
      tone: 'friendly',
      allowContractions: true,
      allowEmoji: true,
      warnings: ['overly formal language']
    }
  },
  'technical': {
    name: 'Technical/Documentation',
    rules: {
      tone: 'precise',
      clarity: 'maximum',
      warnings: ['ambiguous terms', 'jargon without definition']
    }
  },
  'creative': {
    name: 'Creative/Fiction',
    rules: {
      tone: 'varied',
      allowCreativeLanguage: true,
      warnings: ['tell instead of show']
    }
  },
  'social': {
    name: 'Social Media',
    rules: {
      tone: 'engaging',
      viral: true,
      allowEmoji: true,
      maxLength: 280,
      warnings: ['too formal', 'too long']
    }
  },
  'legal': {
    name: 'Legal/Formal',
    rules: {
      tone: 'precise_formal',
      maxAmbiguity: 0,
      clearTerms: true,
      warnings: ['vague language', 'ambiguous pronouns']
    }
  },
  'marketing': {
    name: 'Marketing/Sales',
    rules: {
      tone: 'persuasive',
      callToAction: true,
      emotionalAppeal: 'moderate',
      warnings: ['weak language', 'lack of benefit statements']
    }
  }
};

async function analyzeContext(text, contextType) {
  if (!CONTEXT_TYPES[contextType]) {
    throw new Error(`Unknown context type: ${contextType}`);
  }

  const context = CONTEXT_TYPES[contextType];
  const analysis = {
    contextType: context.name,
    rules: context.rules,
    issues: [],
    suggestions: [],
    overallScore: 0
  };

  // Basic pattern checks
  analysis.issues = checkContextIssues(text, context.rules);
  analysis.suggestions = generateContextSuggestions(text, context.rules);
  analysis.overallScore = Math.max(0, 100 - (analysis.issues.length * 10));

  return analysis;
}

function checkContextIssues(text, rules) {
  const issues = [];

  if (rules.warnings) {
    rules.warnings.forEach(warning => {
      if (warning === 'casual language' && /\b(gonna|wanna|kinda|sorta)\b/i.test(text)) {
        issues.push('Contains casual language inappropriate for professional context');
      }
      if (warning === 'emoji' && /[\p{Emoji}]/u.test(text)) {
        issues.push('Contains emoji - not recommended for professional/academic context');
      }
      if (warning === 'exclamation marks' && text.split('!').length > 5) {
        issues.push('Too many exclamation marks for professional tone');
      }
      if (warning === 'contractions' && /\b(don't|can't|won't|isn't)\b/i.test(text)) {
        issues.push('Contains contractions - spell out for formal academic writing');
      }
      if (warning === 'overly formal language' && /\b(hereby|aforementioned|pursuant)\b/i.test(text)) {
        issues.push('Too formal for casual context - simplify language');
      }
      if (warning === 'weak language' && /\b(might|somewhat|fairly|rather)\b/i.test(text)) {
        issues.push('Weak language - use stronger words for marketing');
      }
    });
  }

  return issues;
}

function generateContextSuggestions(text, rules) {
  const suggestions = [];

  if (rules.tone === 'persuasive') {
    if (!text.includes('call to action') && !text.includes('Click') && !text.includes('Learn more')) {
      suggestions.push('Add a clear call-to-action to drive conversion');
    }
  }

  if (rules.clarity === 'maximum') {
    const avgSentenceLength = text.split(/[.!?]/).reduce((acc, s) => acc + s.split(' ').length, 0) / 
                             text.split(/[.!?]/).length;
    if (avgSentenceLength > 25) {
      suggestions.push('Break down long sentences for clarity in technical documentation');
    }
  }

  return suggestions;
}

/**
 * Team Collaboration Features
 */

// Shared document management
async function createSharedDocument(title, content, teamMembers = []) {
  const doc = {
    id: 'doc_' + Date.now(),
    title: title,
    content: content,
    owner: 'current_user', // In real implementation, get from auth
    teamMembers: teamMembers,
    createdAt: new Date().toISOString(),
    lastModified: new Date().toISOString(),
    revisions: [{
      timestamp: new Date().toISOString(),
      content: content,
      author: 'current_user'
    }],
    comments: [],
    reviewStatus: 'draft',
    approvals: {}
  };

  const data = await chrome.storage.local.get('sharedDocuments');
  const docs = data.sharedDocuments || [];
  docs.push(doc);
  await chrome.storage.local.set({ sharedDocuments: docs });

  return doc;
}

// Add comment to document
async function addDocumentComment(docId, text, position, author = 'current_user') {
  const data = await chrome.storage.local.get('sharedDocuments');
  const docs = data.sharedDocuments || [];
  const doc = docs.find(d => d.id === docId);

  if (!doc) throw new Error('Document not found');

  const comment = {
    id: 'comment_' + Date.now(),
    author: author,
    text: text,
    position: position,
    timestamp: new Date().toISOString(),
    resolved: false,
    replies: []
  };

  doc.comments.push(comment);
  doc.lastModified = new Date().toISOString();

  await chrome.storage.local.set({ sharedDocuments: docs });
  return comment;
}

// Request review
async function requestReview(docId, reviewers = []) {
  const data = await chrome.storage.local.get('sharedDocuments');
  const docs = data.sharedDocuments || [];
  const doc = docs.find(d => d.id === docId);

  if (!doc) throw new Error('Document not found');

  doc.reviewStatus = 'pending_review';
  doc.lastModified = new Date().toISOString();
  
  reviewers.forEach(reviewer => {
    doc.approvals[reviewer] = { status: 'pending', timestamp: null };
  });

  await chrome.storage.local.set({ sharedDocuments: docs });
  return doc;
}

// Approve document
async function approveDocument(docId, reviewer = 'current_user', feedback = '') {
  const data = await chrome.storage.local.get('sharedDocuments');
  const docs = data.sharedDocuments || [];
  const doc = docs.find(d => d.id === docId);

  if (!doc) throw new Error('Document not found');

  doc.approvals[reviewer] = {
    status: 'approved',
    timestamp: new Date().toISOString(),
    feedback: feedback
  };

  // Check if all reviewers approved
  const allApproved = Object.values(doc.approvals).every(a => a.status === 'approved');
  if (allApproved) {
    doc.reviewStatus = 'approved';
  }

  doc.lastModified = new Date().toISOString();
  await chrome.storage.local.set({ sharedDocuments: docs });

  return doc;
}

/**
 * Writing Analytics & Dashboard Data
 */

async function buildAnalyticsDashboard() {
  try {
    const data = await chrome.storage.local.get(['history', 'analytics', 'installDate']);
    const history = data.history || [];
    const analytics = data.analytics || {};
    const installDate = new Date(data.installDate || Date.now());

    if (history.length === 0) {
      return { status: 'no_data', message: 'No analytics data available yet' };
    }

    // Calculate metrics
    const metricsbyType = {};
    const metricsbyDate = {};
    let totalWords = 0;

    history.forEach(item => {
      // By type
      metricsbyType[item.type] = (metricsbyType[item.type] || 0) + 1;

      // By date (normalized)
      const date = new Date(item.date).toLocaleDateString();
      metricsbyDate[date] = (metricsbyDate[date] || 0) + 1;

      // Total words
      totalWords += item.fullOriginal?.length || item.original.length;
    });

    // Calculate improvement trends
    const recentItems = history.slice(0, 50);
    const oldItems = history.slice(50, 100);

    const recentGrammarRate = recentItems.filter(i => i.type === 'grammar').length / recentItems.length;
    const oldGrammarRate = oldItems.filter(i => i.type === 'grammar').length / oldItems.length || 0;
    const improvementTrend = ((oldGrammarRate - recentGrammarRate) / (oldGrammarRate || 0.01) * 100).toFixed(1);

    const dashboard = {
      period: `Since ${installDate.toLocaleDateString()}`,
      summary: {
        totalItems: history.length,
        totalWords: totalWords,
        averageItemsPerDay: (history.length / Math.ceil((Date.now() - installDate) / (1000 * 60 * 60 * 24))).toFixed(1),
        mostUsedFeature: Object.keys(metricsbyType).sort((a, b) => metricsbyType[b] - metricsbyType[a])[0]
      },
      breakdownByType: metricsbyType,
      breakdownByDate: metricsbyDate,
      improvement: {
        grammarErrorTrend: `${improvementTrend}%`,
        description: improvementTrend > 0 ? 'Your writing is improving!' : 'Keep practicing!'
      },
      topMistakes: findTopMistakesPatterns(recentItems),
      timeSeriesData: generateTimeSeriesData(history),
      insights: generateInsights(metricsbyType, history, improvementTrend)
    };

    return dashboard;
  } catch (error) {
    throw new Error(`Dashboard generation failed: ${error.message}`);
  }
}

function findTopMistakesPatterns(items) {
  const patterns = {};
  
  items.forEach(item => {
    if (item.type === 'grammar') {
      // Extract common error patterns from results
      const words = item.result.match(/\b\w+\b/g) || [];
      words.slice(0, 5).forEach(word => {
        patterns[word] = (patterns[word] || 0) + 1;
      });
    }
  });

  return Object.entries(patterns)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([mistake, count]) => ({ mistake, occurrences: count }));
}

function generateTimeSeriesData(history) {
  const data = {};
  history.forEach(item => {
    const date = new Date(item.date).toLocaleDateString();
    if (!data[date]) {
      data[date] = { grammar: 0, rewrite: 0, summarize: 0, translate: 0, total: 0 };
    }
    data[date][item.type] = (data[date][item.type] || 0) + 1;
    data[date].total += 1;
  });

  return data;
}

function generateInsights(typeMetrics, history, improvementRate) {
  const insights = [];

  if (typeMetrics.grammar > typeMetrics.rewrite) {
    insights.push('💡 You focus on correcting grammar. Try the Rewrite feature to improve tone and style.');
  }

  if (typeMetrics.summarize > 0 && typeMetrics.summarize < typeMetrics.grammar / 5) {
    insights.push('💡 You rarely use Summarization. Try summarizing long emails to save reading time.');
  }

  if (improvementRate > 10) {
    insights.push('🎉 Your writing is improving significantly! Keep up the great work.');
  }

  if (history.length > 100) {
    insights.push('⭐ You\'re a power user! Consider exploring the Writing Coach feature for deeper insights.');
  }

  return insights;
}

/**
 * Team Writing Standards
 */

async function createTeamStyleGuide(name, rules) {
  const guide = {
    id: 'guide_' + Date.now(),
    name: name,
    rules: rules,
    createdAt: new Date().toISOString(),
    appliedDocs: 0,
    violations: []
  };

  const data = await chrome.storage.local.get('teamStyleGuides');
  const guides = data.teamStyleGuides || [];
  guides.push(guide);
  await chrome.storage.local.set({ teamStyleGuides: guides });

  return guide;
}

async function enforceTeamStandardsOnDoc(docContent, guideId) {
  const data = await chrome.storage.local.get('teamStyleGuides');
  const guides = data.teamStyleGuides || [];
  const guide = guides.find(g => g.id === guideId);

  if (!guide) throw new Error('Style guide not found');

  const violations = [];

  // Check each rule in the guide
  guide.rules.forEach(rule => {
    if (rule.type === 'bannedWords') {
      rule.words.forEach(word => {
        const regex = new RegExp(`\\b${word}\\b`, 'gi');
        const matches = docContent.match(regex);
        if (matches) {
          violations.push({
            rule: `Banned word: "${word}"`,
            count: matches.length,
            suggestion: rule.replacement || `Remove "${word}"`
          });
        }
      });
    }

    if (rule.type === 'requireWords') {
      // Check if required terms are present
      const found = rule.words.some(word => 
        new RegExp(`\\b${word}\\b`, 'i').test(docContent)
      );
      if (!found) {
        violations.push({
          rule: `Should include one of: ${rule.words.join(', ')}`,
          suggestion: `Add terminology related to: ${rule.description}`
        });
      }
    }
  });

  return {
    guideId: guideId,
    guideName: guide.name,
    violations: violations,
    compliance: 100 - (violations.length * 15),
    status: violations.length === 0 ? 'compliant' : 'violations'
  };
}
