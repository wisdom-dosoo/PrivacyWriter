document.addEventListener('DOMContentLoaded', async () => {
  const contentDiv = document.getElementById('content');
  const periodSpan = document.getElementById('period');

  try {
    // Request analytics data from background
    const response = await chrome.runtime.sendMessage({ action: 'buildAnalyticsDashboard' });

    if (response.success) {
      renderDashboard(response.data);
    } else {
      renderError(response.error || 'Failed to load analytics.');
    }
  } catch (error) {
    renderError('Error connecting to extension backend.');
    console.error(error);
  }

  function renderDashboard(data) {
    if (data.status === 'no_data') {
      contentDiv.innerHTML = `
        <div class="no-data">
          <div class="no-data-icon">📊</div>
          <p>No analytics data available yet.</p>
          <p style="font-size: 0.9em; margin-top: 10px;">Start using PrivacyWriter tools to generate insights!</p>
        </div>
      `;
      return;
    }

    periodSpan.textContent = data.period;

    // 1. Summary Cards
    let html = `
      <div class="grid">
        <div class="card">
          <h3>Total Words Processed</h3>
          <div class="value">${formatNumber(data.summary.totalWords)}</div>
          <div class="unit">words</div>
        </div>
        <div class="card">
          <h3>Total Actions</h3>
          <div class="value">${formatNumber(data.summary.totalItems)}</div>
          <div class="unit">operations</div>
        </div>
        <div class="card">
          <h3>Daily Average</h3>
          <div class="value">${data.summary.averageItemsPerDay}</div>
          <div class="unit">actions/day</div>
        </div>
        <div class="card">
          <h3>Top Feature</h3>
          <div class="value" style="font-size: 1.8em; text-transform: capitalize;">${data.summary.mostUsedFeature || 'None'}</div>
          <div class="unit">most frequent</div>
        </div>
      </div>
    `;

    // 2. Feature Usage Chart (Simple CSS Bar Chart)
    const maxVal = Math.max(...Object.values(data.breakdownByType));
    const chartBars = Object.entries(data.breakdownByType).map(([type, count]) => {
      const height = Math.max(10, (count / maxVal) * 100);
      return `
        <div class="bar" style="height: ${height}%;" title="${type}: ${count}">
          <div class="bar-value">${count}</div>
          <div class="bar-label" style="text-transform: capitalize;">${type}</div>
        </div>
      `;
    }).join('');

    html += `
      <div class="chart-container">
        <h3>Feature Usage</h3>
        <div class="bar-chart">
          ${chartBars}
        </div>
      </div>
    `;

    // 3. Improvement & Insights
    html += `
      <div class="grid">
        <div class="card">
          <h3>Improvement Trend</h3>
          <div class="value">${data.improvement.grammarErrorTrend}</div>
          <div class="trend ${parseFloat(data.improvement.grammarErrorTrend) > 0 ? 'positive' : 'negative'}">
            ${data.improvement.description}
          </div>
        </div>
        <div class="insights">
          <h3>💡 AI Insights</h3>
          ${data.insights.map(insight => `<div class="insight">${insight}</div>`).join('')}
        </div>
      </div>
    `;

    // 4. Top Mistakes (if any)
    if (data.topMistakes && data.topMistakes.length > 0) {
      html += `
        <div class="chart-container">
          <h3>Common Patterns</h3>
          <p style="margin-bottom: 15px; color: #666;">Frequent terms found in your grammar corrections:</p>
          <ul class="mistake-list">
            ${data.topMistakes.map(m => `
              <li class="mistake">
                <strong>${m.mistake}</strong> <span style="color: #666; font-size: 0.9em;">(${m.occurrences} times)</span>
              </li>
            `).join('')}
          </ul>
        </div>
      `;
    }

    // 5. Actions
    html += `
      <div style="text-align: center; margin-top: 40px;">
        <button onclick="window.print()">🖨️ Print Report</button>
      </div>
    `;

    contentDiv.innerHTML = html;
  }

  function renderError(msg) {
    contentDiv.innerHTML = `
      <div class="no-data">
        <p style="color: #f44336;">Error: ${msg}</p>
      </div>
    `;
  }

  function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }
});