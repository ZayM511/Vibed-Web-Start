/**
 * Extension Errors Modal
 * Full-screen modal for viewing extension error logs
 * Accessible via button in settings header (founder-only)
 */

const CONVEX_URL = 'https://reminiscent-goldfish-690.convex.cloud';

let modalState = {
  isOpen: false,
  currentTab: 'grouped', // 'grouped' or 'individual'
  selectedPlatform: null, // null, 'linkedin', 'indeed', 'google'
  showResolved: false,
  stats: null,
  errors: [],
  groupedErrors: [],
  expandedErrors: new Set() // Track which errors are expanded
};

// Initialize modal
function initErrorLogsModal() {
  const btn = document.getElementById('errorLogsBtn');
  const modal = document.getElementById('errorLogsModal');
  const closeBtn = document.getElementById('closeErrorLogs');

  if (!btn || !modal) return;

  // Open modal
  btn.addEventListener('click', openErrorLogsModal);

  // Close modal
  closeBtn?.addEventListener('click', closeErrorLogsModal);

  // Close on backdrop click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeErrorLogsModal();
    }
  });

  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modalState.isOpen) {
      closeErrorLogsModal();
    }
  });

  // Setup filter buttons
  setupModalFilters();

  // Update button badge periodically
  updateErrorCountBadge();
  setInterval(updateErrorCountBadge, 30000); // Every 30 seconds
}

// Open modal
async function openErrorLogsModal() {
  const modal = document.getElementById('errorLogsModal');
  modal.classList.add('active');
  modalState.isOpen = true;
  document.body.style.overflow = 'hidden';

  // Load data
  await loadModalErrorData();
  renderModalContent();
}

// Close modal
function closeErrorLogsModal() {
  const modal = document.getElementById('errorLogsModal');
  modal.classList.remove('active');
  modalState.isOpen = false;
  document.body.style.overflow = '';
}

// Setup filter buttons
function setupModalFilters() {
  // Platform filters
  document.querySelectorAll('.error-filter-btn[data-platform]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const platform = btn.dataset.platform;
      modalState.selectedPlatform = platform === 'all' ? null : platform;

      // Update button states
      document.querySelectorAll('.error-filter-btn[data-platform]').forEach(b => {
        b.classList.toggle('active', b.dataset.platform === btn.dataset.platform);
      });

      await loadModalErrorData();
      renderModalContent();
    });
  });

  // Resolved toggle
  document.querySelector('.error-filter-btn[data-toggle-resolved]')?.addEventListener('click', async function() {
    modalState.showResolved = !modalState.showResolved;
    this.textContent = modalState.showResolved ? 'Showing All' : 'Hide Resolved';
    this.classList.toggle('active', modalState.showResolved);

    await loadModalErrorData();
    renderModalContent();
  });

  // Tab switching
  document.querySelectorAll('.error-tab-btn[data-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      modalState.currentTab = btn.dataset.tab;

      // Update button states
      document.querySelectorAll('.error-tab-btn[data-tab]').forEach(b => {
        b.classList.toggle('active', b.dataset.tab === btn.dataset.tab);
      });

      renderErrorsList();
    });
  });
}

// Load error data from Convex
async function loadModalErrorData() {
  try {
    // Get stats
    const statsRes = await fetch(`${CONVEX_URL}/api/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: 'extensionErrors:getErrorStats',
        args: {}
      })
    });
    modalState.stats = await statsRes.json();

    // Get errors list
    const errorsRes = await fetch(`${CONVEX_URL}/api/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: 'extensionErrors:getErrors',
        args: {
          platform: modalState.selectedPlatform,
          resolved: modalState.showResolved ? undefined : false,
          limit: 100
        }
      })
    });
    modalState.errors = await errorsRes.json();

    // Get grouped errors
    const groupedRes = await fetch(`${CONVEX_URL}/api/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: 'extensionErrors:getGroupedErrors',
        args: { platform: modalState.selectedPlatform }
      })
    });
    modalState.groupedErrors = await groupedRes.json();

  } catch (error) {
    console.error('Error loading modal data:', error);
  }
}

// Render modal content
function renderModalContent() {
  const loading = document.getElementById('errorLoading');
  const content = document.getElementById('errorLogsContent');

  if (!modalState.stats) {
    loading.style.display = 'block';
    content.style.display = 'none';
    return;
  }

  loading.style.display = 'none';
  content.style.display = 'block';

  // Update stats
  document.getElementById('modalStatTotal').textContent = modalState.stats.total || 0;
  document.getElementById('modalStat24h').textContent = modalState.stats.last24Hours || 0;
  document.getElementById('modalStatUnresolved').textContent = modalState.stats.unresolved || 0;
  document.getElementById('modalStat7d').textContent = modalState.stats.last7Days || 0;

  // Update platforms
  document.getElementById('modalPlatformLinkedIn').textContent = modalState.stats.byPlatform?.linkedin || 0;
  document.getElementById('modalPlatformIndeed').textContent = modalState.stats.byPlatform?.indeed || 0;

  // Render errors list
  renderErrorsList();
}

// Render errors list based on current tab
function renderErrorsList() {
  const container = document.getElementById('modalErrorsList');
  if (!container) return;

  if (modalState.currentTab === 'grouped') {
    renderGroupedErrorsList(container);
  } else {
    renderIndividualErrorsList(container);
  }
}

// Render grouped errors
function renderGroupedErrorsList(container) {
  if (!modalState.groupedErrors || modalState.groupedErrors.length === 0) {
    container.innerHTML = '<div class="error-empty">No errors found</div>';
    return;
  }

  container.innerHTML = modalState.groupedErrors.map(group => `
    <div class="error-card ${group.resolved ? 'resolved' : ''}" data-error-type="${escapeHtml(group.errorType)}" data-error-message="${escapeHtml(group.message)}">
      <div class="error-card-header">
        <div class="error-type">${escapeHtml(group.errorType)}</div>
        <div class="error-badges">
          <span class="error-badge ${group.resolved ? 'resolved' : 'active'}">
            ${group.count} occurrence${group.count > 1 ? 's' : ''}
          </span>
          <span class="error-badge platform">${group.platform}</span>
          <button class="error-copy-btn" onclick="copyErrorToClipboard('${group.errorType}', '${escapeHtml(group.message).replace(/'/g, "\\'")}', 'grouped')" title="Copy error details">
            <svg viewBox="0 0 24 24" fill="none" width="14" height="14">
              <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" stroke-width="2"/>
              <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke="currentColor" stroke-width="2"/>
            </svg>
          </button>
        </div>
      </div>
      <div class="error-message">${escapeHtml(group.message)}</div>
      <div class="error-meta">
        <span>First: ${new Date(group.firstOccurrence).toLocaleString()}</span>
        <span>Last: ${new Date(group.lastOccurrence).toLocaleString()}</span>
        <span>Count: ${group.count}</span>
      </div>
    </div>
  `).join('');
}

// Render individual errors
function renderIndividualErrorsList(container) {
  if (!modalState.errors || modalState.errors.length === 0) {
    container.innerHTML = '<div class="error-empty">No errors found</div>';
    return;
  }

  container.innerHTML = modalState.errors.map(error => {
    const isExpanded = modalState.expandedErrors.has(error._id);
    const errorData = JSON.stringify({
      type: error.errorType,
      message: error.message,
      stack: error.stack,
      platform: error.platform,
      timestamp: error.timestamp,
      url: error.url,
      jobContext: error.jobContext,
      consoleLogs: error.consoleLogs
    }).replace(/'/g, "\\'");

    return `
      <div class="error-card ${error.resolved ? 'resolved' : ''}">
        <div class="error-card-header">
          <div class="error-type">${escapeHtml(error.errorType)}</div>
          <div class="error-badges">
            <span class="error-badge ${error.resolved ? 'resolved' : 'active'}">
              ${error.resolved ? 'Resolved' : 'Active'}
            </span>
            <span class="error-badge platform">${error.platform}</span>
            <button class="error-copy-btn" onclick='copyFullErrorToClipboard(${errorData})' title="Copy full error details">
              <svg viewBox="0 0 24 24" fill="none" width="14" height="14">
                <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" stroke-width="2"/>
                <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke="currentColor" stroke-width="2"/>
              </svg>
            </button>
          </div>
        </div>
        <div class="error-message">${escapeHtml(error.message)}</div>
        <div class="error-meta">
          <span>${new Date(error.timestamp).toLocaleString()}</span>
          ${error.jobContext?.jobTitle ? `
            <span>${escapeHtml(error.jobContext.jobTitle)} @ ${escapeHtml(error.jobContext.company)}</span>
          ` : ''}
        </div>
        ${error.stack ? `
          <button class="error-expand-btn ${isExpanded ? 'expanded' : ''}" onclick="toggleErrorDetails('${error._id}')">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            ${isExpanded ? 'Hide' : 'View'} Details
          </button>
          <div class="error-details ${isExpanded ? 'visible' : ''}" id="error-details-${error._id}">
            <div style="font-size: 11px; font-weight: 600; color: var(--text-primary); margin-bottom: 6px;">Stack Trace:</div>
            <pre class="error-stack">${escapeHtml(error.stack)}</pre>
            ${error.consoleLogs && error.consoleLogs.length > 0 ? `
              <div style="font-size: 11px; font-weight: 600; color: var(--text-primary); margin-top: 12px; margin-bottom: 6px;">Console Logs (${error.consoleLogs.length}):</div>
              <div class="error-stack">${error.consoleLogs.map(log =>
                `[${new Date(log.timestamp).toLocaleTimeString()}] [${log.level}] ${escapeHtml(log.message)}`
              ).join('\n')}</div>
            ` : ''}
          </div>
        ` : ''}
      </div>
    `;
  }).join('');
}

// Toggle error details
window.toggleErrorDetails = function(errorId) {
  if (modalState.expandedErrors.has(errorId)) {
    modalState.expandedErrors.delete(errorId);
  } else {
    modalState.expandedErrors.add(errorId);
  }
  renderErrorsList();
};

// Update error count badge on button
async function updateErrorCountBadge() {
  try {
    const res = await fetch(`${CONVEX_URL}/api/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: 'extensionErrors:getErrorStats',
        args: {}
      })
    });
    const stats = await res.json();

    const badge = document.getElementById('errorCountBadge');
    const btn = document.getElementById('errorLogsBtn');

    if (stats && stats.unresolved > 0) {
      badge.textContent = stats.unresolved > 99 ? '99+' : stats.unresolved;
      badge.style.display = 'flex';
      btn.classList.add('has-errors');
    } else {
      badge.style.display = 'none';
      btn.classList.remove('has-errors');
    }
  } catch (error) {
    console.error('Error updating badge:', error);
  }
}

// Copy error to clipboard (for grouped errors)
window.copyErrorToClipboard = async function(errorType, message, view) {
  const text = `Error Type: ${errorType}\nMessage: ${message}\nView: ${view}\n\nCopied from JobFiltr Extension Error Logs`;

  try {
    await navigator.clipboard.writeText(text);
    showCopyNotification('Error copied to clipboard!');
  } catch (err) {
    console.error('Failed to copy:', err);
  }
};

// Copy full error to clipboard (for individual errors)
window.copyFullErrorToClipboard = async function(errorData) {
  const text = `
=== JobFiltr Extension Error ===

Type: ${errorData.type}
Message: ${errorData.message}
Platform: ${errorData.platform}
Timestamp: ${new Date(errorData.timestamp).toLocaleString()}
URL: ${errorData.url}

${errorData.jobContext ? `Job Context:
- Title: ${errorData.jobContext.jobTitle || 'N/A'}
- Company: ${errorData.jobContext.company || 'N/A'}
- Job ID: ${errorData.jobContext.jobId || 'N/A'}

` : ''}${errorData.stack ? `Stack Trace:
${errorData.stack}

` : ''}${errorData.consoleLogs && errorData.consoleLogs.length > 0 ? `Console Logs (${errorData.consoleLogs.length}):
${errorData.consoleLogs.map(log => `[${new Date(log.timestamp).toLocaleTimeString()}] [${log.level}] ${log.message}`).join('\n')}
` : ''}
=== End of Error ===
`.trim();

  try {
    await navigator.clipboard.writeText(text);
    showCopyNotification('Full error details copied to clipboard!');
  } catch (err) {
    console.error('Failed to copy:', err);
  }
};

// Copy all visible errors
window.copyAllErrors = async function() {
  const errors = modalState.currentTab === 'grouped' ? modalState.groupedErrors : modalState.errors;

  if (!errors || errors.length === 0) {
    showCopyNotification('No errors to copy', true);
    return;
  }

  let text = `=== JobFiltr Extension Errors (${errors.length} total) ===\n\n`;

  if (modalState.currentTab === 'grouped') {
    text += errors.map((group, i) => `
${i + 1}. ${group.errorType}
   Message: ${group.message}
   Platform: ${group.platform}
   Occurrences: ${group.count}
   First: ${new Date(group.firstOccurrence).toLocaleString()}
   Last: ${new Date(group.lastOccurrence).toLocaleString()}
   Status: ${group.resolved ? 'Resolved' : 'Active'}
`).join('\n---\n');
  } else {
    text += errors.map((error, i) => `
${i + 1}. ${error.errorType}
   Message: ${error.message}
   Platform: ${error.platform}
   Timestamp: ${new Date(error.timestamp).toLocaleString()}
   URL: ${error.url}
   Status: ${error.resolved ? 'Resolved' : 'Active'}
   ${error.jobContext ? `Job: ${error.jobContext.jobTitle} @ ${error.jobContext.company}` : ''}
`).join('\n---\n');
  }

  text += '\n\n=== End of Error Report ===';

  try {
    await navigator.clipboard.writeText(text);
    showCopyNotification(`Copied ${errors.length} error${errors.length > 1 ? 's' : ''} to clipboard!`);
  } catch (err) {
    console.error('Failed to copy:', err);
  }
};

// Show copy notification
function showCopyNotification(message, isError = false) {
  // Remove existing notification
  const existing = document.querySelector('.copy-notification');
  if (existing) existing.remove();

  // Create notification
  const notification = document.createElement('div');
  notification.className = 'copy-notification';
  notification.textContent = message;
  if (isError) notification.classList.add('error');

  document.body.appendChild(notification);

  // Animate in
  setTimeout(() => notification.classList.add('show'), 10);

  // Remove after 2 seconds
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => notification.remove(), 300);
  }, 2000);
}

// Open web dashboard
window.openWebDashboard = function() {
  // Try to detect if running locally or in production
  const webAppUrl = window.location.hostname === 'localhost'
    ? 'http://localhost:3000/admin'
    : 'https://your-app-url.vercel.app/admin'; // Update this with your actual production URL

  window.open(webAppUrl, '_blank');
};

// Escape HTML
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ===== INLINE ERROR LOGS SECTION =====

let inlineState = {
  selectedPlatform: null, // null, 'linkedin', 'indeed', 'google'
  stats: null,
  errors: [],
  isLoading: true
};

// Initialize inline error logs section
function initInlineErrorLogs() {
  const section = document.querySelector('.error-logs-section');
  if (!section) return;

  // Setup filter buttons
  document.querySelectorAll('.inline-filter-btn[data-inline-platform]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const platform = btn.dataset.inlinePlatform;
      inlineState.selectedPlatform = platform === 'all' ? null : platform;

      // Update button states
      document.querySelectorAll('.inline-filter-btn[data-inline-platform]').forEach(b => {
        b.classList.toggle('active', b.dataset.inlinePlatform === btn.dataset.inlinePlatform);
      });

      await loadInlineErrorData();
      renderInlineErrors();
    });
  });

  // Setup refresh button
  document.getElementById('refreshErrorLogs')?.addEventListener('click', async () => {
    await loadInlineErrorData();
    renderInlineErrors();
  });

  // Setup view all button to open modal
  document.getElementById('viewAllErrorsBtn')?.addEventListener('click', () => {
    openErrorLogsModal();
  });

  // Initial load
  loadInlineErrorData();

  // Refresh periodically
  setInterval(() => {
    if (document.querySelector('.error-logs-section')) {
      loadInlineErrorData();
    }
  }, 60000); // Every 60 seconds
}

// Load error data for inline section
async function loadInlineErrorData() {
  inlineState.isLoading = true;
  renderInlineErrors();

  try {
    // Get stats
    const statsRes = await fetch(`${CONVEX_URL}/api/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: 'extensionErrors:getErrorStats',
        args: {}
      })
    });
    inlineState.stats = await statsRes.json();

    // Get recent errors
    const errorsRes = await fetch(`${CONVEX_URL}/api/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: 'extensionErrors:getErrors',
        args: {
          platform: inlineState.selectedPlatform,
          resolved: false,
          limit: 10 // Show only recent 10 for inline view
        }
      })
    });
    inlineState.errors = await errorsRes.json();

    inlineState.isLoading = false;
    renderInlineErrors();
    updateInlineStats();
  } catch (error) {
    console.error('Error loading inline error data:', error);
    inlineState.isLoading = false;
    renderInlineErrors();
  }
}

// Update inline stats display
function updateInlineStats() {
  if (!inlineState.stats) return;

  // Update stat cards
  document.getElementById('inlineStatTotal').textContent = inlineState.stats.total || 0;
  document.getElementById('inlineStat24h').textContent = inlineState.stats.last24Hours || 0;
  document.getElementById('inlineStatUnresolved').textContent = inlineState.stats.unresolved || 0;
  document.getElementById('inlineStat7d').textContent = inlineState.stats.last7Days || 0;

  // Update platform breakdown
  document.getElementById('inlinePlatformLinkedIn').textContent = inlineState.stats.byPlatform?.linkedin || 0;
  document.getElementById('inlinePlatformIndeed').textContent = inlineState.stats.byPlatform?.indeed || 0;
  document.getElementById('inlinePlatformGoogle').textContent = inlineState.stats.byPlatform?.google || 0;

  // Update section badge
  const badge = document.getElementById('errorSectionBadge');
  if (inlineState.stats.unresolved > 0) {
    badge.textContent = inlineState.stats.unresolved > 99 ? '99+' : inlineState.stats.unresolved;
    badge.style.display = 'inline-flex';
  } else {
    badge.style.display = 'none';
  }
}

// Render inline errors list
function renderInlineErrors() {
  const container = document.getElementById('inlineErrorsList');
  if (!container) return;

  if (inlineState.isLoading) {
    container.innerHTML = `
      <div class="inline-error-loading">
        <svg viewBox="0 0 24 24" fill="none" class="spin">
          <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" stroke-dasharray="32" stroke-linecap="round"/>
        </svg>
        Loading errors...
      </div>
    `;
    return;
  }

  if (!inlineState.errors || inlineState.errors.length === 0) {
    container.innerHTML = `
      <div class="inline-error-empty">
        <svg viewBox="0 0 24 24" fill="none">
          <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <div>No unresolved errors found</div>
        <div style="font-size: 10px; margin-top: 4px;">Great job! Everything is running smoothly.</div>
      </div>
    `;
    return;
  }

  container.innerHTML = inlineState.errors.map(error => `
    <div class="inline-error-item ${error.resolved ? 'resolved' : ''}">
      <div class="inline-error-header">
        <span class="inline-error-type">${escapeHtml(error.errorType)}</span>
        <div class="inline-error-badges">
          <span class="inline-error-badge platform">${error.platform}</span>
          <span class="inline-error-badge status ${error.resolved ? 'resolved' : ''}">${error.resolved ? 'Resolved' : 'Active'}</span>
        </div>
      </div>
      <div class="inline-error-message">${escapeHtml(truncateMessage(error.message, 100))}</div>
      <div class="inline-error-meta">
        <span>${formatTimeAgo(error.timestamp)}</span>
        ${error.jobContext?.jobTitle ? `<span>${escapeHtml(error.jobContext.jobTitle)}</span>` : ''}
      </div>
    </div>
  `).join('');
}

// Truncate message to specified length
function truncateMessage(message, maxLength) {
  if (!message) return '';
  if (message.length <= maxLength) return message;
  return message.substring(0, maxLength) + '...';
}

// Format timestamp as relative time
function formatTimeAgo(timestamp) {
  const now = Date.now();
  const diff = now - timestamp;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'Just now';
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initErrorLogsModal();
    initInlineErrorLogs();
  });
} else {
  initErrorLogsModal();
  initInlineErrorLogs();
}
