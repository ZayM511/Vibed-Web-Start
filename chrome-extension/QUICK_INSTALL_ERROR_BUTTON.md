# Quick Install: Error Logs Button

Follow these 4 simple steps to add the Error Logs button to your Chrome extension settings page.

## ✅ Step 1: Add CSS

Open `settings.html` and find the `</style>` closing tag (around line 1336).

**BEFORE** the `</style>` tag, copy and paste all the CSS from `FINAL_ERROR_LOGS_BUTTON.md` Step 1.

## ✅ Step 2: Add Button HTML

In `settings.html`, find this line (around line 1353):
```html
<div class="header-actions">
```

**RIGHT AFTER** that line, add this button:

```html
        <button class="error-logs-btn" id="errorLogsBtn" title="View Extension Error Logs">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          Error Logs
          <span class="error-count-badge" id="errorCountBadge" style="display: none;">0</span>
        </button>
```

## ✅ Step 3: Add Modal HTML

In `settings.html`, find this line (around line 1907):
```html
  <script src="src/settings.js"></script>
```

**RIGHT BEFORE** that line, copy and paste all the modal HTML from `FINAL_ERROR_LOGS_BUTTON.md` Step 3.

## ✅ Step 4: Add JavaScript

In `settings.html`, find this line (around line 1907):
```html
  <script src="src/settings.js"></script>
```

**RIGHT AFTER** that line, add:
```html
  <script src="src/extension-errors-modal.js"></script>
```

## 🎉 Done!

1. Save `settings.html`
2. Reload your extension in Chrome
3. Open settings (the extension is already created at `src/extension-errors-modal.js`)
4. Sign in with your founder email
5. You'll see the "Error Logs" button in the header (to the left of the theme toggle)
6. Click it to view the full error monitoring dashboard!

## 🚨 What You'll See

**Button Features:**
- Shows "Error Logs" with a warning icon
- Displays a red badge with unresolved error count
- Pulses when there are active errors
- Only visible when signed in as founder

**Modal Features:**
- Full-screen overlay
- Stats cards (Total, 24h, Unresolved, 7d)
- Platform breakdown (LinkedIn/Indeed/Google)
- Filter by platform
- Show/hide resolved errors
- Grouped and Individual views
- Expandable error details with stack traces and console logs
- Real-time auto-refresh
- Beautiful animations

## Files Created:
- ✅ `src/extension-errors-modal.js` - Modal functionality
- ✅ `FINAL_ERROR_LOGS_BUTTON.md` - Complete CSS/HTML
- ✅ `QUICK_INSTALL_ERROR_BUTTON.md` - This guide
