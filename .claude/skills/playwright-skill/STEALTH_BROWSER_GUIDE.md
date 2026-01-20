# Stealth Browser Configuration Guide

## Problem

When using Playwright or Puppeteer to automate browsers, sites like LinkedIn, Google, and others detect automation and block sign-ins with messages like:

```
"Couldn't sign you in
This browser or app may not be secure. Learn more
Try using a different browser. If you're already using a supported browser, you can try again to sign in."
```

## Solution

The `stealth-browser-config.js` module provides a pre-configured stealth browser setup that:

1. **Uses Your Existing Chrome Profile** - Maintains all your login sessions
2. **Hides Automation Flags** - Removes `navigator.webdriver` and other detection markers
3. **Uses Real Chrome** - Not Chromium (more trusted by websites)
4. **Injects Stealth Scripts** - Masks automation characteristics

## Usage

### For Playwright Scripts

```javascript
const { launchStealthBrowser } = require('./stealth-browser-config');
const path = require('path');

(async () => {
  const extensionPath = path.join(__dirname, '..', '..', '..', 'chrome-extension');

  // Launch stealth browser with extension
  const { browser, page } = await launchStealthBrowser(extensionPath);

  // Now you can navigate to sites that require login
  await page.goto('https://www.linkedin.com/jobs/');

  // You'll already be logged in from your Chrome profile!
  // ... rest of your script

  // Keep browser open or close when done
  // await browser.close();
})();
```

### For Puppeteer MCP

When using the Puppeteer MCP server, use these navigation options:

```javascript
const { launchStealthBrowserForMCP } = require('./stealth-browser-config');
const path = require('path');

const extensionPath = path.join(__dirname, '..', '..', '..', 'chrome-extension');
const launchOptions = await launchStealthBrowserForMCP(extensionPath);

// Use with puppeteer_navigate tool
// The MCP will handle launching with these options
```

## How It Works

### 1. User Data Directory
Uses your real Chrome profile from:
```
%LOCALAPPDATA%\Google\Chrome\User Data
```

This means:
- ✅ All your logins are already there
- ✅ Your cookies, history, and settings persist
- ✅ Sites recognize you as a normal user

### 2. Stealth Arguments
```javascript
'--disable-blink-features=AutomationControlled'  // Hides automation flag
'--no-sandbox'                                    // Required for extensions
'--disable-web-security'                          // Allows cross-origin
'channel: chrome'                                 // Use real Chrome, not Chromium
```

### 3. Stealth Scripts
Injected on every page load:
```javascript
// Override navigator.webdriver to false
Object.defineProperty(navigator, 'webdriver', { get: () => false });

// Mock Chrome objects that automation browsers lack
window.chrome = { runtime: {}, loadTimes: function() {}, csi: function() {} };

// Remove automation-specific window properties
delete window.cdc_adoQpoasnfa76pfcZLmcfl_Array;
```

## Important Notes

### ⚠️ Close Chrome Before Running
If your Chrome browser is already open, close it first. The automation can't use the profile while Chrome is running.

### ⚠️ Extension Path
Make sure to provide the correct absolute path to your extension:
```javascript
const extensionPath = path.join(__dirname, '..', '..', '..', 'chrome-extension');
```

### ⚠️ First Run
The first time you run a script, it may take longer to start as it loads your Chrome profile.

## Examples

### Example 1: Test LinkedIn with Extension
```javascript
const { launchStealthBrowser } = require('./stealth-browser-config');
const path = require('path');

(async () => {
  const extensionPath = path.join(__dirname, '..', '..', '..', 'chrome-extension');
  const { browser, page } = await launchStealthBrowser(extensionPath);

  await page.goto('https://www.linkedin.com/jobs/search/?keywords=software%20engineer');
  await page.waitForTimeout(5000);

  // Check if extension loaded
  const badges = await page.$$('.jobfiltr-age-badge');
  console.log(`Found ${badges.length} job age badges`);
})();
```

### Example 2: Navigate Without Extension
```javascript
const { launchStealthBrowser } = require('./stealth-browser-config');

(async () => {
  // Pass null if no extension needed
  const { browser, page } = await launchStealthBrowser(null);

  await page.goto('https://www.google.com');
  console.log('Google search loaded without automation detection!');
})();
```

## Troubleshooting

### Issue: "Chrome profile is in use"
**Solution**: Close all Chrome windows and try again.

### Issue: Extension not loading
**Solution**: Verify the extension path is correct:
```javascript
console.log('Extension path:', extensionPath);
// Should point to: C:\Users\...\chrome-extension
```

### Issue: Still getting blocked
**Solution**: Some sites are very aggressive. Try:
1. Closing all Chrome instances completely
2. Waiting 30 seconds
3. Running the script again

### Issue: Timeout errors
**Solution**: Increase timeout values:
```javascript
await page.goto(url, {
  waitUntil: 'networkidle',
  timeout: 120000  // 2 minutes
});
```

## Future Reference

**ALWAYS use this stealth configuration when:**
- Opening LinkedIn
- Opening Google accounts
- Opening any site that blocks automation
- Needing to maintain login sessions
- Testing extensions that require authentication

**File Location:**
```
.claude/skills/playwright-skill/stealth-browser-config.js
```

## Claude Code Instructions

When Claude Code needs to use Playwright or Puppeteer to open a browser for sites requiring login:

1. Import the stealth browser configuration
2. Use `launchStealthBrowser()` instead of regular `chromium.launch()`
3. This will automatically bypass automation detection and use the user's Chrome profile

Example for Claude:
```javascript
const { launchStealthBrowser } = require('./stealth-browser-config');
const { browser, page } = await launchStealthBrowser(extensionPath);
// Now proceed with automation - user will be logged in!
```
