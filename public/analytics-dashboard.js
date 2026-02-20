document.addEventListener('DOMContentLoaded', initDashboard);

async function initDashboard() {
  const app = document.getElementById('app');
  
  // Load data
  const data = await chrome.storage.local.get(['history', 'writingProfile']);
  const history = data.history || [];
  
  if (history.length === 0) {
    renderEmptyState(app);
    return;
  }

  // Calculate Metrics
  const metrics = calculateMetrics(history);
  
  // Render Dashboard
  renderDashboard(app, metrics);
}

function calculateMetrics(history) {
  const totalItems = history.length;
  
  // Words Processed
  const totalWords = history.reduce((sum, item) => {
    const text = item.fullOriginal || item.original || '';
    return sum + text.split(/\s+/).length;
  }, 0);

  // Time Saved (Estimate: 1 min saved per 100 words processed/rewritten vs manual editing)
  const timeSavedMinutes = Math.round(totalWords / 100);
  const timeSavedDisplay = timeSavedMinutes < 60 
    ? `${timeSavedMinutes} min` 
    : `${(timeSavedMinutes / 60).toFixed(1)} hrs`;

  // Streak Calculation
  const dates = history.map(h => new Date(h.date).toDateString());
  const uniqueDates = [...new Set(dates)].sort((a, b) => new Date(b) - new Date(a));
  
  let streak = 0;
  let currentDate = new Date();
  
  // Check if used today
  if (uniqueDates.includes(currentDate.toDateString())) {
    streak = 1;
    currentDate.setDate(currentDate.getDate() - 1);
  }
  
  // Count backwards
  while (uniqueDates.includes(currentDate.toDateString())) {
    streak++;
    currentDate.setDate(currentDate.getDate() - 1);
  }

  // Activity by Day (Last 7 Days)
  const last7Days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toDateString();
    const count = history.filter(h => new Date(h.date).toDateString() === dateStr).length;
    last7Days.push({ day: d.toLocaleDateString('en-US', { weekday: 'short' }), count });
  }

  // Usage by Type
  const typeCounts = history.reduce((acc, item) => {
    acc[item.type] = (acc[item.type] || 0) + 1;
    return acc;
  }, {});

  return {
    totalItems,
    totalWords,
    timeSavedDisplay,
    streak,
    last7Days,
    typeCounts
  };
}

function renderDashboard(container, metrics) {
  container.innerHTML = `
    <div class="header">
      <div>
        <h1>Writing Analytics</h1>
        <p>Track your productivity and writing habits</p>
      </div>
      <div class="date-range">
        <span>📅 Last 30 Days</span>
      </div>
    </div>

    <!-- KPI Cards -->
    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-label">Total Words Processed</div>
        <div class="kpi-value">${metrics.totalWords.toLocaleString()}</div>
        <div class="kpi-trend trend-up">📝 Lifetime count</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Time Saved</div>
        <div class="kpi-value">${metrics.timeSavedDisplay}</div>
        <div class="kpi-trend trend-up">⚡ Based on editing speed</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Current Streak</div>
        <div class="kpi-value">${metrics.streak} Days</div>
        <div class="kpi-trend ${metrics.streak > 0 ? 'trend-up' : 'trend-neutral'}">🔥 Keep it up!</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Total Actions</div>
        <div class="kpi-value">${metrics.totalItems}</div>
        <div class="kpi-trend trend-neutral">📊 History items</div>
      </div>
    </div>

    <!-- Charts -->
    <div class="charts-grid">
      <!-- Activity Chart -->
      <div class="chart-card">
        <div class="chart-header">
          <div class="chart-title">Activity (Last 7 Days)</div>
        </div>
        <div class="chart-container">
          ${renderBarChart(metrics.last7Days)}
        </div>
      </div>

      <!-- Distribution Chart -->
      <div class="chart-card">
        <div class="chart-header">
          <div class="chart-title">Tool Usage Distribution</div>
        </div>
        <div class="chart-container" style="align-items: center; justify-content: center;">
          ${renderDonutChart(metrics.typeCounts)}
        </div>
      </div>
    </div>

    <!-- Insights -->
    <div class="insights-section">
      <h3 style="margin-bottom: 20px;">💡 AI Insights</h3>
      
      <div class="insight-item">
        <div class="insight-icon">🏆</div>
        <div class="insight-content">
          <h4>Top Tool: ${getTopTool(metrics.typeCounts)}</h4>
          <p>You use this tool most frequently. Consider exploring other features to maximize productivity.</p>
        </div>
      </div>

      <div class="insight-item">
        <div class="insight-icon">📈</div>
        <div class="insight-content">
          <h4>Productivity Peak</h4>
          <p>Your most active day was ${getPeakDay(metrics.last7Days)}. Try to maintain this momentum!</p>
        </div>
      </div>
    </div>

    <div style="text-align: center; margin-top: 40px; color: var(--text-muted); font-size: 0.9rem;">
      <p>🔒 All analytics are calculated locally on your device. No data is sent to servers.</p>
    </div>
  `;
}

function renderBarChart(data) {
  const max = Math.max(...data.map(d => d.count)) || 1;
  
  return data.map(d => {
    const height = (d.count / max) * 100;
    return `
      <div class="bar-group">
        <div class="bar" style="height: ${height}%;" title="${d.count} actions"></div>
        <div class="bar-label">${d.day}</div>
      </div>
    `;
  }).join('');
}

function renderDonutChart(typeCounts) {
  const total = Object.values(typeCounts).reduce((a, b) => a + b, 0);
  if (total === 0) return '<p>No data</p>';

  const colors = ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#8b5cf6'];
  let startAngle = 0;
  
  const slices = Object.entries(typeCounts).map(([type, count], index) => {
    const percentage = count / total;
    const angle = percentage * 360;
    const endAngle = startAngle + angle;
    
    // SVG Path calculation for arc
    const x1 = 50 + 40 * Math.cos(Math.PI * startAngle / 180);
    const y1 = 50 + 40 * Math.sin(Math.PI * startAngle / 180);
    const x2 = 50 + 40 * Math.cos(Math.PI * endAngle / 180);
    const y2 = 50 + 40 * Math.sin(Math.PI * endAngle / 180);
    
    const largeArcFlag = angle > 180 ? 1 : 0;
    
    const pathData = [
      `M 50 50`,
      `L ${x1} ${y1}`,
      `A 40 40 0 ${largeArcFlag} 1 ${x2} ${y2}`,
      `Z`
    ].join(' ');

    startAngle = endAngle;
    
    return `<path d="${pathData}" fill="${colors[index % colors.length]}" stroke="var(--card-bg)" stroke-width="1" />`;
  }).join('');

  // Legend
  const legend = Object.entries(typeCounts).map(([type, count], index) => `
    <div style="display: flex; align-items: center; gap: 6px; font-size: 0.8rem; margin-top: 4px;">
      <span style="width: 10px; height: 10px; background: ${colors[index % colors.length]}; border-radius: 50%;"></span>
      <span style="text-transform: capitalize;">${type} (${Math.round(count/total*100)}%)</span>
    </div>
  `).join('');

  return `
    <div style="display: flex; align-items: center; gap: 20px;">
      <svg viewBox="0 0 100 100" width="150" height="150" style="transform: rotate(-90deg);">
        ${slices}
        <circle cx="50" cy="50" r="25" fill="var(--card-bg)" />
      </svg>
      <div style="display: flex; flex-direction: column;">
        ${legend}
      </div>
    </div>
  `;
}

function getTopTool(counts) {
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return sorted.length > 0 ? sorted[0][0].charAt(0).toUpperCase() + sorted[0][0].slice(1) : 'None';
}

function getPeakDay(days) {
  const sorted = [...days].sort((a, b) => b.count - a.count);
  return sorted[0].day;
}

function renderEmptyState(container) {
  container.innerHTML = `
    <div style="text-align: center; padding: 60px 20px;">
      <div style="font-size: 4rem; margin-bottom: 20px;">📊</div>
      <h2 style="margin-bottom: 10px;">No Analytics Data Yet</h2>
      <p style="color: var(--text-muted); margin-bottom: 30px;">
        Start using PrivacyWriter tools to generate insights about your writing habits.
      </p>
      <button onclick="window.close()" style="padding: 10px 20px; background: var(--primary); color: white; border: none; border-radius: 8px; cursor: pointer;">
        Start Writing
      </button>
    </div>
  `;
}