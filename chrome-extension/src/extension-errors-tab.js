/**
 * Extension Errors Tab for Founder Settings Page
 * Displays real-time error monitoring from Convex
 */

const CONVEX_URL = 'https://reminiscent-goldfish-690.convex.cloud';

let currentErrorsTab = 'grouped'; // 'grouped' or 'individual'
let selectedPlatform = null; // null, 'linkedin', 'indeed', 'google'
let showResolved = false;
let errorStatsData = null;
let errorsData = null;
let groupedErrorsData = null;

// Initialize errors tab
async function initExtensionErrorsTab() {
  setupErrorsTabListeners();
  await loadErrorsData();
  renderErrorsTab();

  // Auto-refresh every 30 seconds
  setInterval(async () => {
    await loadErrorsData();
    renderErrorsTab();
  }, 30000);
}

// Setup event listeners
function setupErrorsTabListeners() {
  // Tab switching
  document.getElementById('errorsTabGrouped')?.addEventListener('click', () => {
    currentErrorsTab = 'grouped';
    renderErrorsTab();
  });

  document.getElementById('errorsTabIndividual')?.addEventListener('click', () => {
    currentErrorsTab = 'individual';
    renderErrorsTab();
  });

  // Platform filters
  document.getElementById('errorFilterAll')?.addEventListener('click', () => {
    selectedPlatform = null;
    loadErrorsData().then(renderErrorsTab);
  });

  document.getElementById('errorFilterLinkedIn')?.addEventListener('click', () => {
    selectedPlatform = 'linkedin';
    loadErrorsData().then(renderErrorsTab);
  });

  document.getElementById('errorFilterIndeed')?.addEventListener('click', () => {
    selectedPlatform = 'indeed';
    loadErrorsData().then(renderErrorsTab);
  });

  document.getElementById('errorFilterGoogle')?.addEventListener('click', () => {
    selectedPlatform = 'google';
    loadErrorsData().then(renderErrorsTab);
  });

  // Show/hide resolved toggle
  document.getElementById('errorToggleResolved')?.addEventListener('click', () => {
    showResolved = !showResolved;
    loadErrorsData().then(renderErrorsTab);
  });

  // Refresh button
  document.getElementById('refreshErrors')?.addEventListener('click', async () => {
    const btn = document.getElementById('refreshErrors');
    btn.classList.add('loading');
    await loadErrorsData();
    renderErrorsTab();
    btn.classList.remove('loading');
  });
}

// Load data from Convex
async function loadErrorsData() {
  try {
    // Get error stats
    const statsResponse = await fetch(`${CONVEX_URL}/api/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: 'extensionErrors:getErrorStats',
        args: {}
      })
    });
    errorStatsData = await statsResponse.json();

    // Get errors list
    const errorsResponse = await fetch(`${CONVEX_URL}/api/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: 'extensionErrors:getErrors',
        args: {
          platform: selectedPlatform,
          resolved: showResolved ? undefined : false,
          limit: 50
        }
      })
    });
    errorsData = await errorsResponse.json();

    // Get grouped errors
    const groupedResponse = await fetch(`${CONVEX_URL}/api/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: 'extensionErrors:getGroupedErrors',
        args: { platform: selectedPlatform }
      })
    });
    groupedErrorsData = await groupedResponse.json();

  } catch (error) {
    console.error('Error loading extension errors:', error);
  }
}

// Render the errors tab
function renderErrorsTab() {
  if (!errorStatsData) return;

  // Update stats cards
  document.getElementById('errorStatTotal').textContent = errorStatsData.total || 0;
  document.getElementById('errorStat24h').textContent = errorStatsData.last24Hours || 0;
  document.getElementById('errorStatUnresolved').textContent = errorStatsData.unresolved || 0;
  document.getElementById('errorStat7d').textContent = errorStatsData.last7Days || 0;

  // Update platform breakdown
  document.getElementById('errorPlatformLinkedIn').textContent = errorStatsData.byPlatform?.linkedin || 0;
  document.getElementById('errorPlatformIndeed').textContent = errorStatsData.byPlatform?.indeed || 0;
  document.getElementById('errorPlatformGoogle').textContent = errorStatsData.byPlatform?.google || 0;

  // Update filter button states
  updateFilterButtonStates();

  // Render appropriate tab content
  if (currentErrorsTab === 'grouped') {
    renderGroupedErrors();
  } else {
    renderIndividualErrors();
  }

  // Update tab button states
  document.getElementById('errorsTabGrouped').classList.toggle('active', currentErrorsTab === 'grouped');
  document.getElementById('errorsTabIndividual').classList.toggle('active', currentErrorsTab === 'individual');
}

// Update filter button states
function updateFilterButtonStates() {
  document.getElementById('errorFilterAll').classList.toggle('active', selectedPlatform === null);
  document.getElementById('errorFilterLinkedIn').classList.toggle('active', selectedPlatform === 'linkedin');
  document.getElementById('errorFilterIndeed').classList.toggle('active', selectedPlatform === 'indeed');
  document.getElementById('errorFilterGoogle').classList.toggle('active', selectedPlatform === 'google');

  const toggleBtn = document.getElementById('errorToggleResolved');
  toggleBtn.textContent = showResolved ? 'Showing All' : 'Hide Resolved';
  toggleBtn.classList.toggle('active', showResolved);
}

// Render grouped errors view
function renderGroupedErrors() {
  const container = document.getElementById('errorsListContainer');
  if (!container || !groupedErrorsData) return;

  if (groupedErrorsData.length === 0) {
    container.innerHTML = '<div class="errors-empty-state">No errors found</div>';
    return;
  }

  container.innerHTML = groupedErrorsData.map(group => `
    <div class="error-card ${group.resolved ? 'resolved' : ''}">
      <div class="error-card-header">
        <div class="error-type">${escapeHtml(group.errorType)}</div>
        <div class="error-badges">
          <span class="error-badge ${group.resolved ? 'resolved' : 'active'}">${group.count} occurrence${group.count > 1 ? 's' : ''}</span>
          <span class="error-badge platform">${group.platform}</span>
        </div>
      </div>
      <div class="error-message">${escapeHtml(group.message)}</div>
      <div class="error-meta">
        <span>First: ${new Date(group.firstOccurrence).toLocaleString()}</span>
        <span>Last: ${new Date(group.lastOccurrence).toLocaleString()}</span>
      </div>
    </div>
  `).join('');
}

// Render individual errors view
function renderIndividualErrors() {
  const container = document.getElementById('errorsListContainer');
  if (!container || !errorsData) return;

  if (errorsData.length === 0) {
    container.innerHTML = '<div class="errors-empty-state">No errors found</div>';
    return;
  }

  container.innerHTML = errorsData.map(error => `
    <div class="error-card ${error.resolved ? 'resolved' : ''}">
      <div class="error-card-header">
        <div class="error-type">${escapeHtml(error.errorType)}</div>
        <div class="error-badges">
          <span class="error-badge ${error.resolved ? 'resolved' : 'active'}">${error.resolved ? 'Resolved' : 'Active'}</span>
          <span class="error-badge platform">${error.platform}</span>
        </div>
      </div>
      <div class="error-message">${escapeHtml(error.message)}</div>
      <div class="error-meta">
        <span>${new Date(error.timestamp).toLocaleString()}</span>
        ${error.jobContext?.jobTitle ? `<span>${escapeHtml(error.jobContext.jobTitle)} at ${escapeHtml(error.jobContext.company)}</span>` : ''}
      </div>
      ${error.stack ? `
        <div class="error-stack-toggle" onclick="toggleErrorStack('${error._id}')">
          <svg viewBox="0 0 24 24" fill="none" width="14" height="14">
            <path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2"/>
          </svg>
          View Stack Trace
        </div>
        <pre class="error-stack hidden" id="error-stack-${error._id}">${escapeHtml(error.stack)}</pre>
      ` : ''}
    </div>
  `).join('');
}

// Toggle error stack trace visibility
window.toggleErrorStack = function(errorId) {
  const stackEl = document.getElementById(`error-stack-${errorId}`);
  if (stackEl) {
    stackEl.classList.toggle('hidden');
  }
};

// Escape HTML to prevent XSS
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    // Wait for founder check to complete
    setTimeout(initExtensionErrorsTab, 1000);
  });
} else {
  setTimeout(initExtensionErrorsTab, 1000);
}
