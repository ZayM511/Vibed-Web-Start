# Extension Errors Tab - Integration Guide

This document contains the HTML/CSS additions needed to add the Extension Errors tab to `settings.html`.

## 1. Add CSS Styles

Add this CSS inside the `<style>` tag in settings.html (around line 1336, before the closing `</style>`):

```css
/* ===== EXTENSION ERRORS TAB STYLES ===== */
.errors-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  padding: 4px;
  background: var(--bg-tertiary);
  border-radius: 8px;
}

.errors-tab-btn {
  flex: 1;
  padding: 8px 16px;
  background: transparent;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
}

.errors-tab-btn:hover {
  background: var(--bg-secondary);
  color: var(--text-primary);
}

.errors-tab-btn.active {
  background: var(--accent);
  color: white;
}

.errors-filters {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}

.error-filter-btn {
  padding: 6px 12px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 6px;
  font-size: 11px;
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

.errors-stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  margin-bottom: 16px;
}

.errors-stat-card {
  padding: 12px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 8px;
  text-align: center;
}

.errors-stat-label {
  font-size: 10px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--text-tertiary);
  margin-bottom: 4px;
  display: block;
}

.errors-stat-value {
  font-size: 20px;
  font-weight: 700;
  color: var(--text-primary);
}

.errors-platform-breakdown {
  display: flex;
  justify-content: space-between;
  padding: 14px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 8px;
  margin-bottom: 16px;
}

.platform-stat {
  text-align: center;
}

.platform-stat-label {
  font-size: 11px;
  color: var(--text-tertiary);
  display: block;
  margin-bottom: 4px;
}

.platform-stat-value {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
}

.error-card {
  padding: 14px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-error, #EF4444);
  border-radius: 8px;
  margin-bottom: 10px;
  transition: all 0.2s ease;
}

.error-card:hover {
  border-color: var(--accent);
}

.error-card.resolved {
  opacity: 0.6;
  border-color: var(--border);
}

.error-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.error-type {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}

.error-badges {
  display: flex;
  gap: 6px;
}

.error-badge {
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 500;
}

.error-badge.active {
  background: rgba(239, 68, 68, 0.2);
  color: #EF4444;
  border: 1px solid rgba(239, 68, 68, 0.3);
}

.error-badge.resolved {
  background: rgba(16, 185, 129, 0.2);
  color: #10B981;
  border: 1px solid rgba(16, 185, 129, 0.3);
}

.error-badge.platform {
  background: rgba(99, 102, 241, 0.2);
  color: #6366F1;
  border: 1px solid rgba(99, 102, 241, 0.3);
}

.error-message {
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 8px;
  line-height: 1.5;
}

.error-meta {
  display: flex;
  gap: 12px;
  font-size: 11px;
  color: var(--text-tertiary);
}

.error-stack-toggle {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 8px;
  padding: 6px;
  background: var(--bg-tertiary);
  border-radius: 4px;
  font-size: 11px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
}

.error-stack-toggle:hover {
  background: var(--accent-subtle);
  color: var(--accent);
}

.error-stack {
  margin-top: 8px;
  padding: 10px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: 4px;
  font-size: 10px;
  font-family: 'SF Mono', Monaco, monospace;
  color: var(--text-secondary);
  max-height: 200px;
  overflow-y: auto;
  white-space: pre-wrap;
  word-break: break-all;
}

.errors-empty-state {
  padding: 40px 20px;
  text-align: center;
  color: var(--text-tertiary);
  font-size: 13px;
}

#errorsListContainer {
  max-height: 600px;
  overflow-y: auto;
}
</style>
```

## 2. Add HTML Content

Add this HTML inside the analytics panel, after the "Platform Stats" section (around line 1900, before closing `</div>` of analytics-content):

```html
<!-- Extension Errors Tab -->
<div class="chart-section" id="errorsSection" style="display: none;">
  <h3>
    <svg viewBox="0 0 24 24" fill="none">
      <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
    Extension Errors
    <button class="chart-refresh-btn" id="refreshErrors" title="Refresh Errors">
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M23 4v6h-6M1 20v-6h6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>
  </h3>

  <!-- Stats Cards -->
  <div class="errors-stats-grid">
    <div class="errors-stat-card">
      <span class="errors-stat-label">Total Errors</span>
      <span class="errors-stat-value" id="errorStatTotal">0</span>
    </div>
    <div class="errors-stat-card">
      <span class="errors-stat-label">Last 24 Hours</span>
      <span class="errors-stat-value" id="errorStat24h">0</span>
    </div>
    <div class="errors-stat-card">
      <span class="errors-stat-label">Unresolved</span>
      <span class="errors-stat-value" id="errorStatUnresolved">0</span>
    </div>
    <div class="errors-stat-card">
      <span class="errors-stat-label">Last 7 Days</span>
      <span class="errors-stat-value" id="errorStat7d">0</span>
    </div>
  </div>

  <!-- Platform Breakdown -->
  <div class="errors-platform-breakdown">
    <div class="platform-stat">
      <span class="platform-stat-label">LinkedIn</span>
      <span class="platform-stat-value" id="errorPlatformLinkedIn">0</span>
    </div>
    <div class="platform-stat">
      <span class="platform-stat-label">Indeed</span>
      <span class="platform-stat-value" id="errorPlatformIndeed">0</span>
    </div>
    <div class="platform-stat">
      <span class="platform-stat-label">Google</span>
      <span class="platform-stat-value" id="errorPlatformGoogle">0</span>
    </div>
  </div>

  <!-- Filters -->
  <div class="errors-filters">
    <button class="error-filter-btn active" id="errorFilterAll">All Platforms</button>
    <button class="error-filter-btn" id="errorFilterLinkedIn">LinkedIn</button>
    <button class="error-filter-btn" id="errorFilterIndeed">Indeed</button>
    <button class="error-filter-btn" id="errorFilterGoogle">Google</button>
    <button class="error-filter-btn" id="errorToggleResolved" style="margin-left: auto;">Hide Resolved</button>
  </div>

  <!-- Tabs -->
  <div class="errors-tabs">
    <button class="errors-tab-btn active" id="errorsTabGrouped">Grouped Errors</button>
    <button class="errors-tab-btn" id="errorsTabIndividual">Individual Errors</button>
  </div>

  <!-- Errors List -->
  <div id="errorsListContainer">
    <div class="errors-empty-state">Loading errors...</div>
  </div>
</div>
```

## 3. Add Script Tag

Add this script tag at the bottom of the HTML, just before the closing `</body>` tag (after the existing `<script src="src/settings.js"></script>`):

```html
<script src="src/extension-errors-tab.js"></script>
```

## 4. Show/Hide the Errors Section

Add this JavaScript to `settings.js` in the `showFounderGreeting()` function to display the errors section for founders:

```javascript
// Inside showFounderGreeting() function, add:
const errorsSection = document.getElementById('errorsSection');
if (errorsSection) {
  errorsSection.style.display = 'block';
}
```

## Complete!

After adding these changes:
1. Reload the extension
2. Open settings page
3. Sign in with a founder email
4. The "Extension Errors" section will appear in the analytics panel
5. View and filter extension errors in real-time!
