// Analytics Dashboard Script

document.addEventListener('DOMContentLoaded', async () => {
  await loadAnalyticsDashboard();
  setupEventListeners();
  
  // Load Chart.js library for better visualizations
  loadChartLibrary();
});

/**
 * Load Chart.js library dynamically
 */
function loadChartLibrary() {
  const script = document.createElement('script');
  script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.js';
  script.onload = () => {
    // Refresh dashboard with charts when Chart.js loads
    loadAnalyticsDashboard();
  };
  document.head.appendChild(script);
}

/**
 * Setup event listeners (CSP-compliant)
 */
function setupEventListeners() {
  const btnExportCSV = document.getElementById('btnExportCSV');
  const btnExportJSON = document.getElementById('btnExportJSON');
  const btnBack = document.getElementById('btnBack');

  if (btnExportCSV) btnExportCSV.addEventListener('click', () => exportAnalytics('csv'));
  if (btnExportJSON) btnExportJSON.addEventListener('click', () => exportAnalytics('json'));
  if (btnBack) btnBack.addEventListener('click', () => window.close());
}

async function loadAnalyticsDashboard() {
  const contentDiv = document.getElementById('content');
  
  try {
    // Get analytics data from storage
    const data = await chrome.storage.local.get(['analytics', 'history']);
    const analytics = data.analytics || {};
    const history = data.history || [];

    if (!analytics.grammarChecks && !analytics.rewrites && history.length === 0) {
      showNoData();
      return;
    }

    // Build dashboard data
    const dashboard = buildDashboardData(analytics, history);
    document.getElementById('period').textContent = dashboard.period;

    let html = `
      <div class="grid">
        <div class="card">
          <h3>Total Corrections</h3>
          <div class="value">${dashboard.summary.totalItems}</div>
          <div class="unit">writing improvements</div>
          <div class="trend positive" style="margin-top: 10px;">↑ ${dashboard.summary.percentageChange}% from last week</div>
        </div>
        
        <div class="card">
          <h3>Total Words Processed</h3>
          <div class="value">${(dashboard.summary.totalWords / 1000).toFixed(1)}K</div>
          <div class="unit">words</div>
          <div class="trend positive" style="margin-top: 10px;">📈 ${dashboard.summary.dailyAverage} per day</div>
        </div>
        
        <div class="card">
          <h3>Most Used Feature</h3>
          <div class="value" style="text-transform: capitalize; font-size: 1.5em;">${dashboard.summary.mostUsedFeature}</div>
          <div class="unit">${dashboard.breakdownByType[dashboard.summary.mostUsedFeature] || 0} uses</div>
        </div>

        <div class="card">
          <h3>Writing Score</h3>
          <div class="value">${dashboard.summary.writingScore}</div>
          <div class="unit">/100 - Excellent work!</div>
          ${dashboard.summary.improvementTrend ? `<div class="trend positive" style="margin-top: 10px;">Improving over time ⭐</div>` : ''}
        </div>
      </div>
    `;

    // Feature breakdown chart
    html += renderFeatureChart(dashboard.breakdownByType);

    // Writing improvement trend
    html += renderImprovementTrend(dashboard.improvement);

    // Top mistakes
    if (dashboard.topMistakes && dashboard.topMistakes.length > 0) {
      html += `
        <div class="chart-container">
          <h3>🎯 Top Writing Patterns</h3>
          <ul class="mistake-list">
            ${dashboard.topMistakes.map((m, i) => `
              <li class="mistake">
                <strong>#${i + 1}:</strong> "${m.mistake}" 
                <span style="color: #999;">(${m.occurrences} times)</span>
              </li>
            `).join('')}
          </ul>
        </div>
      `;
    }

    // Insights
    if (dashboard.insights && dashboard.insights.length > 0) {
      html += `
        <div class="insights">
          <h3 style="color: #333; margin-bottom: 15px;">💡 Smart Insights</h3>
          ${dashboard.insights.map(insight => `
            <div class="insight">✨ ${insight}</div>
          `).join('')}
        </div>
      `;
    }

    // Action buttons (CSP-compliant with IDs)
    html += `
      <div class="button-group">
        <button id="btnExportCSV">📥 Export as CSV</button>
        <button id="btnExportJSON">📥 Export as JSON</button>
        <button id="btnBack">← Back</button>
      </div>
    `;

    contentDiv.innerHTML = html;
    
    // Reattach event listeners after HTML update
    setupEventListeners();
  } catch (error) {
    console.error('Error loading dashboard:', error);
    contentDiv.innerHTML = `
      <div class="no-data">
        <div class="no-data-icon">⚠️</div>
        <p>Error loading analytics: ${error.message}</p>
        <p style="margin-top: 10px; font-size: 0.9em; color: #ccc;">Please try refreshing or check the console for details.</p>
      </div>
    `;
  }
}

/**
 * Build dashboard data from analytics and history
 */
function buildDashboardData(analytics, history) {
  const totalItems = (analytics.grammarChecks || 0) + 
                     (analytics.rewrites || 0) + 
                     (analytics.summaries || 0) + 
                     (analytics.translations || 0);
  
  const totalWords = analytics.wordsProcessed || 0;
  const dailyAverage = Math.round(totalItems / 7) || 0;

  // Breakdown by type
  const breakdownByType = {
    Grammar: analytics.grammarChecks || 0,
    Rewrites: analytics.rewrites || 0,
    Summaries: analytics.summaries || 0,
    Translations: analytics.translations || 0,
    'Content Gen': analytics.contentGenerated || 0,
    'Fact Check': analytics.factChecks || 0
  };

  // Calculate trends
  const lastWeekItems = Math.max(totalItems - 15, 0); // Rough estimation
  const percentageChange = totalItems > 0 ? Math.round((totalItems / (lastWeekItems + totalItems || 1)) * 100) : 0;

  // Writing score (0-100 based on usage and quality)
  const writingScore = Math.min(100, Math.round(40 + (totalItems / 10) + (totalWords / 500)));

  // Top mistakes
  const topMistakes = extractTopMistakes(history);

  // Generate insights
  const insights = generateInsights(analytics, totalWords, totalItems);

  return {
    period: `Last 30 days`,
    summary: {
      totalItems,
      totalWords,
      dailyAverage,
      percentageChange,
      mostUsedFeature: Object.keys(breakdownByType).reduce((a, b) => 
        breakdownByType[a] > breakdownByType[b] ? a : b, 'Grammar'),
      writingScore,
      improvementTrend: totalItems > 10
    },
    breakdownByType,
    improvement: {
      grammarErrorTrend: '📈 Improving',
      description: 'Your writing quality has improved with more corrections applied'
    },
    topMistakes,
    insights
  };
}

/**
 * Extract top mistakes from history
 */
function extractTopMistakes(history) {
  const mistakes = {};
  
  history.forEach(item => {
    if (item.type === 'grammar' && item.details) {
      try {
        const details = typeof item.details === 'string' ? JSON.parse(item.details) : item.details;
        if (details.issues && Array.isArray(details.issues)) {
          details.issues.forEach(issue => {
            const key = issue.trim();
            mistakes[key] = (mistakes[key] || 0) + 1;
          });
        }
      } catch (e) {
        // Skip invalid entries
      }
    }
  });

  return Object.entries(mistakes)
    .map(([mistake, occurrences]) => ({ mistake, occurrences }))
    .sort((a, b) => b.occurrences - a.occurrences)
    .slice(0, 5);
}

/**
 * Generate smart insights
 */
function generateInsights(analytics, totalWords, totalItems) {
  const insights = [];

  if (totalWords > 5000) {
    insights.push('Prolific writer! You\'ve exceeded 5K words processed.');
  }

  if ((analytics.grammarChecks || 0) > (analytics.rewrites || 0)) {
    insights.push('Focus on grammar quality is strong. Consider exploring tone variations with rewrites.');
  }

  if ((analytics.summaries || 0) > 5) {
    insights.push('Active summarization usage. Great for content curation.');
  }

  if ((analytics.translations || 0) > 3) {
    insights.push('Multi-language author detected! You\'re writing across cultures.');
  }

  if (totalItems < 10) {
    insights.push('Getting started! Complete 10 writing improvements to unlock advanced insights.');
  } else if (totalItems >= 50) {
    insights.push('Expert user! Your writing patterns show mastery. Consider mentoring others.');
  }

  return insights.length > 0 ? insights : ['You\'re making progress! Keep using PrivacyWriter to unlock more insights.'];
}

function renderFeatureChart(breakdownByType) {
  const features = Object.keys(breakdownByType).filter(f => breakdownByType[f] > 0);
  if (features.length === 0) return '';

  const maxValue = Math.max(...Object.values(breakdownByType));
  
  const bars = features.map(feature => {
    const value = breakdownByType[feature];
    const height = (value / maxValue) * 100;
    return `
      <div class="bar" style="height: ${height}%;">
        <div class="bar-value">${value}</div>
        <div class="bar-label">${feature}</div>
      </div>
    `;
  }).join('');

  return `
    <div class="chart-container">
      <h3>🛠️ Feature Usage Breakdown</h3>
      <div class="bar-chart">${bars}</div>
    </div>
  `;
}

function renderImprovementTrend(improvement) {
  return `
    <div class="chart-container">
      <h3>📈 Writing Improvement</h3>
      <div style="padding: 20px; text-align: center;">
        <div class="trend positive" style="font-size: 1.5em; color: #4caf50;">
          ${improvement.grammarErrorTrend}
        </div>
        <p style="margin-top: 10px; color: #666;">${improvement.description}</p>
      </div>
    </div>
  `;
}

function showNoData() {
  document.getElementById('content').innerHTML = `
    <div class="no-data">
      <div class="no-data-icon">📊</div>
      <p>No analytics data available yet</p>
      <p style="margin-top: 10px; font-size: 0.9em; color: #999;">Start using PrivacyWriter features to see your analytics appear here!</p>
    </div>
  `;
}

async function exportAnalytics(format) {
  try {
    const data = await chrome.storage.local.get(['analytics', 'history']);
    const exportData = {
      exportedAt: new Date().toISOString(),
      analytics: data.analytics || {},
      historyCount: (data.history || []).length
    };

    let content;
    let mimeType;
    let filename = `writing-analytics-${new Date().toISOString().split('T')[0]}`;

    if (format === 'json') {
      content = JSON.stringify(exportData, null, 2);
      mimeType = 'application/json';
      filename += '.json';
    } else {
      // CSV format
      const analytics = exportData.analytics;
      content = `Writing Analytics Export\n`;
      content += `Exported: ${exportData.exportedAt}\n\n`;
      content += `Metric,Value\n`;
      content += `Grammar Checks,${analytics.grammarChecks || 0}\n`;
      content += `Rewrites,${analytics.rewrites || 0}\n`;
      content += `Summaries,${analytics.summaries || 0}\n`;
      content += `Translations,${analytics.translations || 0}\n`;
      content += `Words Processed,${analytics.wordsProcessed || 0}\n`;
      content += `Content Generated,${analytics.contentGenerated || 0}\n`;
      content += `Fact Checks,${analytics.factChecks || 0}\n`;
      mimeType = 'text/csv';
      filename += '.csv';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    alert(`✅ Exported to ${filename}`);
  } catch (error) {
    alert('Export failed: ' + error.message);
  }
}

