# Extension Error Logs Button - Complete Implementation

Add this complete implementation to show error logs in a modal overlay accessible via a button in the header.

## Step 1: Add CSS (in the `<style>` tag around line 1336)

```css
/* ===== ERROR LOGS BUTTON ===== */
.error-logs-btn {
  display: none; /* Hidden by default, shown for founders */
  position: relative;
  padding: 8px 12px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--transition-normal);
  font-size: 13px;
  font-weight: 500;
  gap: 6px;
  align-items: center;
}

.error-logs-btn:hover {
  background: var(--accent-subtle);
  border-color: var(--accent);
  color: var(--accent);
}

.error-logs-btn svg {
  width: 16px;
  height: 16px;
}

.error-logs-btn.has-errors {
  border-color: #EF4444;
  color: #EF4444;
  animation: errorPulse 2s ease-in-out infinite;
}

@keyframes errorPulse {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4);
  }
  50% {
    box-shadow: 0 0 0 6px rgba(239, 68, 68, 0);
  }
}

.error-count-badge {
  position: absolute;
  top: -6px;
  right: -6px;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  background: #EF4444;
  color: white;
  border-radius: 9px;
  font-size: 10px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid var(--bg-primary);
}

/* ===== ERROR LOGS MODAL ===== */
.error-logs-modal {
  display: none;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(4px);
  z-index: 10000;
  animation: fadeIn 0.2s ease;
}

.error-logs-modal.active {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.error-logs-content {
  width: 100%;
  max-width: 900px;
  max-height: 90vh;
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.error-logs-header {
  padding: 20px 24px;
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.error-logs-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 10px;
}

.error-logs-title svg {
  width: 20px;
  height: 20px;
  color: var(--accent);
}

.error-logs-close {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
}

.error-logs-close:hover {
  background: var(--accent-subtle);
  border-color: var(--accent);
  color: var(--accent);
}

.error-logs-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px;
}

/* Stats Grid */
.error-modal-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 20px;
}

.error-modal-stat {
  padding: 14px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 10px;
  text-align: center;
}

.error-modal-stat-label {
  font-size: 10px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-tertiary);
  margin-bottom: 6px;
  display: block;
}

.error-modal-stat-value {
  font-size: 22px;
  font-weight: 700;
  color: var(--text-primary);
}

/* Platform Breakdown */
.error-modal-platforms {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
  padding: 16px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 10px;
}

.error-platform-item {
  flex: 1;
  text-align: center;
}

.error-platform-label {
  font-size: 11px;
  color: var(--text-tertiary);
  margin-bottom: 6px;
  display: block;
}

.error-platform-value {
  font-size: 20px;
  font-weight: 700;
  color: var(--text-primary);
}

/* Filters */
.error-modal-filters {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}

.error-filter-btn {
  padding: 7px 14px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 8px;
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
}

.error-filter-btn:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.error-filter-btn.active {
  background: var(--accent);
  border-color: var(--accent);
  color: white;
}

/* Tabs */
.error-modal-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  padding: 4px;
  background: var(--bg-secondary);
  border-radius: 8px;
}

.error-tab-btn {
  flex: 1;
  padding: 10px 16px;
  background: transparent;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
}

.error-tab-btn:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.error-tab-btn.active {
  background: var(--accent);
  color: white;
}

/* Error Cards */
.error-card {
  padding: 16px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-left: 3px solid #EF4444;
  border-radius: 10px;
  margin-bottom: 12px;
  transition: all 0.2s ease;
}

.error-card:hover {
  border-color: var(--accent);
  transform: translateX(2px);
}

.error-card.resolved {
  opacity: 0.6;
  border-left-color: #10B981;
}

.error-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 10px;
}

.error-type {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.error-badges {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.error-badge {
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.error-badge.active {
  background: rgba(239, 68, 68, 0.15);
  color: #EF4444;
  border: 1px solid rgba(239, 68, 68, 0.3);
}

.error-badge.resolved {
  background: rgba(16, 185, 129, 0.15);
  color: #10B981;
  border: 1px solid rgba(16, 185, 129, 0.3);
}

.error-badge.platform {
  background: rgba(99, 102, 241, 0.15);
  color: #6366F1;
  border: 1px solid rgba(99, 102, 241, 0.3);
}

.error-message {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.6;
  margin-bottom: 10px;
}

.error-meta {
  display: flex;
  gap: 16px;
  font-size: 11px;
  color: var(--text-tertiary);
  flex-wrap: wrap;
}

.error-expand-btn {
  margin-top: 10px;
  padding: 8px 12px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: 6px;
  font-size: 11px;
  font-weight: 500;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.error-expand-btn:hover {
  background: var(--accent-subtle);
  border-color: var(--accent);
  color: var(--accent);
}

.error-expand-btn svg {
  width: 14px;
  height: 14px;
  transition: transform 0.2s ease;
}

.error-expand-btn.expanded svg {
  transform: rotate(180deg);
}

.error-details {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--border);
  display: none;
}

.error-details.visible {
  display: block;
  animation: slideDown 0.2s ease;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.error-stack {
  margin-top: 10px;
  padding: 12px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: 6px;
  font-size: 10px;
  font-family: 'SF Mono', Monaco, monospace;
  color: var(--text-secondary);
  max-height: 200px;
  overflow-y: auto;
  white-space: pre-wrap;
  word-break: break-all;
}

.error-empty {
  padding: 60px 20px;
  text-align: center;
  color: var(--text-tertiary);
}

.error-empty svg {
  width: 48px;
  height: 48px;
  margin: 0 auto 16px;
  opacity: 0.4;
}

.error-loading {
  padding: 60px 20px;
  text-align: center;
  color: var(--text-tertiary);
}

.error-loading svg {
  width: 32px;
  height: 32px;
  margin: 0 auto 12px;
  animation: spin 1s linear infinite;
}

/* Show button for founders */
body.founder-mode .error-logs-btn {
  display: inline-flex;
}
```

## Step 2: Add HTML (in header-actions, BEFORE the theme-toggle button, around line 1353)

```html
<button class="error-logs-btn" id="errorLogsBtn" title="View Extension Error Logs">
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>
  Error Logs
  <span class="error-count-badge" id="errorCountBadge" style="display: none;">0</span>
</button>
```

## Step 3: Add Modal HTML (at the end of body, BEFORE closing `</body>` tag, around line 1905)

```html
<!-- Error Logs Modal -->
<div class="error-logs-modal" id="errorLogsModal">
  <div class="error-logs-content">
    <div class="error-logs-header">
      <div class="error-logs-title">
        <svg viewBox="0 0 24 24" fill="none">
          <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        Extension Error Logs
      </div>
      <button class="error-logs-close" id="closeErrorLogs">
        <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
          <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </button>
    </div>

    <div class="error-logs-body">
      <!-- Loading State -->
      <div class="error-loading" id="errorLoading">
        <svg viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" stroke-dasharray="32" stroke-linecap="round"/>
        </svg>
        <div>Loading error logs...</div>
      </div>

      <!-- Content (hidden initially) -->
      <div id="errorLogsContent" style="display: none;">
        <!-- Stats -->
        <div class="error-modal-stats">
          <div class="error-modal-stat">
            <span class="error-modal-stat-label">Total</span>
            <span class="error-modal-stat-value" id="modalStatTotal">0</span>
          </div>
          <div class="error-modal-stat">
            <span class="error-modal-stat-label">Last 24h</span>
            <span class="error-modal-stat-value" id="modalStat24h">0</span>
          </div>
          <div class="error-modal-stat">
            <span class="error-modal-stat-label">Unresolved</span>
            <span class="error-modal-stat-value" id="modalStatUnresolved">0</span>
          </div>
          <div class="error-modal-stat">
            <span class="error-modal-stat-label">Last 7d</span>
            <span class="error-modal-stat-value" id="modalStat7d">0</span>
          </div>
        </div>

        <!-- Platform Breakdown -->
        <div class="error-modal-platforms">
          <div class="error-platform-item">
            <span class="error-platform-label">LinkedIn</span>
            <span class="error-platform-value" id="modalPlatformLinkedIn">0</span>
          </div>
          <div class="error-platform-item">
            <span class="error-platform-label">Indeed</span>
            <span class="error-platform-value" id="modalPlatformIndeed">0</span>
          </div>
          <div class="error-platform-item">
            <span class="error-platform-label">Google</span>
            <span class="error-platform-value" id="modalPlatformGoogle">0</span>
          </div>
        </div>

        <!-- Filters -->
        <div class="error-modal-filters">
          <button class="error-filter-btn active" data-platform="all">All Platforms</button>
          <button class="error-filter-btn" data-platform="linkedin">LinkedIn</button>
          <button class="error-filter-btn" data-platform="indeed">Indeed</button>
          <button class="error-filter-btn" data-platform="google">Google</button>
          <button class="error-filter-btn" data-toggle-resolved style="margin-left: auto;">Hide Resolved</button>
        </div>

        <!-- Tabs -->
        <div class="error-modal-tabs">
          <button class="error-tab-btn active" data-tab="grouped">Grouped Errors</button>
          <button class="error-tab-btn" data-tab="individual">Individual Errors</button>
        </div>

        <!-- Errors List -->
        <div id="modalErrorsList">
          <div class="error-empty">No errors found</div>
        </div>
      </div>
    </div>
  </div>
</div>
```

## Step 4: Add JavaScript (before closing `</body>`, AFTER settings.js script)

```html
<script src="src/extension-errors-modal.js"></script>
```

This implementation provides:
- ✅ Button in header (visible only to founders)
- ✅ Error count badge that pulses when there are errors
- ✅ Full-screen modal overlay
- ✅ Stats dashboard
- ✅ Platform filtering
- ✅ Grouped and individual views
- ✅ Expandable error details with stack traces
- ✅ Real-time updates
- ✅ Beautiful animations and transitions
