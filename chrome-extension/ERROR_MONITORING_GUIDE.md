# Error Monitoring Guide - How It Works

## How Errors Are Captured

✅ **Automatic Error Capture** - Errors are automatically captured when:
- Any JavaScript error occurs on LinkedIn or Indeed pages
- Any unhandled promise rejection happens
- The extension encounters an issue while processing jobs

**Supported Platforms:**
- ✅ LinkedIn
- ✅ Indeed
- ❌ Google Jobs (support removed due to technical feasibility)

**What Gets Captured:**
- Error message and type
- Full stack trace
- Platform (LinkedIn/Indeed)
- Current URL
- Job context (if on a job page): title, company, job ID
- Last 50 console logs
- DOM snapshot of relevant elements
- Timestamp and user info

**Where It's Stored:**
- All errors are sent to your Convex database in real-time
- Accessible from both your Chrome extension and Next.js web app

---

## How You (Claude) Can See Errors

### Option 1: Chrome Extension (Manual)
**Location:** `chrome-extension://cbfnhebmmmalfoabjmliiidiijpndmbg/settings.html`

**Access:** I **CANNOT** navigate to this directly because:
- Chrome extension pages only exist in your browser
- They're not accessible via URL outside of Chrome
- Browser automation tools can't reach internal extension pages

**What You Need to Do:**
- Open your extension settings
- Sign in as founder
- Click the "Error Logs" button (left of dark mode toggle)
- Copy errors using the copy button on each error or "Copy All" button
- Paste the error details to me in chat

### Option 2: Web Dashboard (Automatic - I CAN Access This!)
**Location:** `http://localhost:3000/admin` (dev) or your production URL

**Access:** I **CAN** navigate to this using browser automation tools!

**What I Can Do:**
- Navigate to your web app's admin page
- View all extension errors in real-time
- Filter by platform (LinkedIn/Indeed/Google)
- See stack traces, console logs, and job context
- Analyze patterns and troubleshoot issues

**How It Works:**
- When you ask me to check errors or fix an issue, I can:
  1. Use the Playwright skill to navigate to your web dashboard
  2. Read the error logs directly from the page
  3. Analyze the errors and propose fixes
  4. Test the fixes on the actual pages

---

## Copy Features Added

### Individual Error Copy
- Each error card has a small copy button (📋 icon)
- **Grouped View**: Copies error type, message, and occurrence count
- **Individual View**: Copies full error details including stack trace, console logs, job context, and timestamp

### Copy All Errors
- Button in modal header: "Copy All"
- Copies all visible errors based on current filters
- Formats as a numbered list with all key details
- Perfect for sharing multiple errors at once

### Format Example:
```
=== JobFiltr Extension Error ===

Type: TypeError
Message: Cannot read property 'querySelector' of null
Platform: linkedin
Timestamp: 1/6/2026, 3:45:12 PM
URL: https://www.linkedin.com/jobs/view/123456789

Job Context:
- Title: Senior Software Engineer
- Company: Acme Corp
- Job ID: 123456789

Stack Trace:
TypeError: Cannot read property 'querySelector' of null
    at extractJobAge (linkedin-adapter.js:245)
    at processJobCard (content-linkedin-v3.js:189)
    ...

Console Logs (12):
[3:45:10 PM] [log] Processing job card
[3:45:11 PM] [warn] Detail panel not found
[3:45:12 PM] [error] Failed to extract job age

=== End of Error ===
```

---

## Web Dashboard Button

**"Open Web Dashboard" Button** in the modal header:
- Opens your Next.js admin page in a new tab
- Shows the same errors with full interface
- Allows you to share a URL with me so I can check it directly

**Important:** Update the production URL in `src/extension-errors-modal.js` line 462:
```javascript
const webAppUrl = window.location.hostname === 'localhost'
  ? 'http://localhost:3000/admin'
  : 'https://your-actual-app-url.vercel.app/admin'; // ← Update this
```

---

## Workflow Recommendations

### When Adding/Changing Features:
1. **Test on LinkedIn/Indeed/Google**
2. **Check for errors:**
   - Option A: Open extension settings → Error Logs button → Copy any errors to me
   - Option B: Tell me to check `localhost:3000/admin` using Playwright skill
3. **I analyze and fix** based on the error details
4. **Repeat** until no errors occur

### When Something Isn't Working:
1. **Tell me the issue** (e.g., "Job age badges not showing on LinkedIn")
2. **I check the web dashboard** using browser automation
3. **I see the actual errors** with full context (stack traces, console logs, DOM state)
4. **I propose fixes** based on the real error data
5. **We test** and verify the fix worked

### Best Practice:
- **Give me access to your web dashboard URL** (localhost or production)
- **I can proactively check for errors** when working on features
- **No need to manually copy/paste** errors unless the web dashboard isn't accessible

---

## Summary

**Yes, errors show up automatically** when they occur on LinkedIn, Indeed, or Google Jobs!

**Can I see them automatically?**
- ✅ **YES** - via your web dashboard at `localhost:3000/admin` or production URL
- ❌ **NO** - via the Chrome extension settings page (requires you to copy/paste)

**Best approach:**
- Keep your web app running (`npm run dev`)
- When I'm helping with features, I'll check the admin dashboard directly
- You can also copy specific errors to me using the copy buttons if needed

**Copy features:**
- 📋 Copy button on each error card
- "Copy All" button for bulk copying
- "Open Web Dashboard" button to access full interface
- Toast notifications confirm successful copies

---

## Files Modified

1. **chrome-extension/settings.html** - Added error logs button, modal, CSS
2. **chrome-extension/src/extension-errors-modal.js** - Added copy functions, web dashboard link
3. **This guide** - Explains how everything works

## Next Steps

1. Reload your Chrome extension
2. Open settings and verify the Error Logs button appears (when signed in as founder)
3. Update the production URL in `extension-errors-modal.js` if you have a deployed app
4. Start your Next.js app (`npm run dev`) so I can access the web dashboard
5. When working on features, I'll check `localhost:3000/admin` to see any errors automatically!
