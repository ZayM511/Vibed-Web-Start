/**
 * Launch stealth browser for Indeed testing
 * This script launches Chrome with stealth settings to avoid Cloudflare detection
 */

const { chromium } = require('playwright');
const path = require('path');

(async () => {
  // Use your existing Chrome profile to maintain login session
  const userDataDir = path.join(process.env.LOCALAPPDATA, 'Google', 'Chrome', 'User Data');
  const extensionPath = path.resolve(__dirname, '..', '..', '..', 'chrome-extension');

  console.log('📂 Using Chrome profile from:', userDataDir);
  console.log('📦 Loading extension from:', extensionPath);
  console.log('');
  console.log('⏳ Launching stealth browser...');

  try {
    const browser = await chromium.launchPersistentContext(userDataDir, {
      headless: false,
      channel: 'chrome', // Use installed Chrome instead of Chromium
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
        '--disable-blink-features=AutomationControlled', // Hide automation
        '--disable-dev-shm-usage',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process',
        '--disable-site-isolation-trials',
        '--no-first-run',
        '--no-default-browser-check',
        '--remote-debugging-port=9222' // Allow DevTools connection
      ],
      ignoreDefaultArgs: ['--enable-automation', '--enable-blink-features=AutomationControlled'],
      viewport: { width: 1920, height: 1080 }
    });

    const page = browser.pages()[0] || await browser.newPage();

    // Add stealth scripts to avoid detection
    await page.addInitScript(() => {
      // Override navigator.webdriver
      Object.defineProperty(navigator, 'webdriver', {
        get: () => false
      });

      // Override navigator.plugins
      Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5]
      });

      // Override navigator.languages
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en']
      });

      // Mock chrome object
      window.chrome = {
        runtime: {},
        loadTimes: function() {},
        csi: function() {},
        app: {}
      };

      // Mock permissions
      const originalQuery = window.navigator.permissions.query;
      window.navigator.permissions.query = (parameters) => (
        parameters.name === 'notifications' ?
          Promise.resolve({ state: Notification.permission }) :
          originalQuery(parameters)
      );

      // Override window.navigator.platform
      Object.defineProperty(navigator, 'platform', {
        get: () => 'Win32'
      });

      // Override window.navigator.hardwareConcurrency
      Object.defineProperty(navigator, 'hardwareConcurrency', {
        get: () => 8
      });

      // Override window.navigator.deviceMemory
      Object.defineProperty(navigator, 'deviceMemory', {
        get: () => 8
      });

      // Remove automation-related window properties
      delete window.cdc_adoQpoasnfa76pfcZLmcfl_Array;
      delete window.cdc_adoQpoasnfa76pfcZLmcfl_Promise;
      delete window.cdc_adoQpoasnfa76pfcZLmcfl_Symbol;
    });

    console.log('✅ Stealth browser launched successfully!');
    console.log('');
    console.log('🌐 Navigating to Indeed...');

    await page.goto('https://www.indeed.com', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });

    console.log('');
    console.log('📋 Browser is ready!');
    console.log('   - Please login to your Indeed account if needed');
    console.log('   - The extension should be loaded');
    console.log('   - DevTools available at http://localhost:9222');
    console.log('');
    console.log('⌨️  Press Ctrl+C to close when done testing');

    // Keep browser open
    await new Promise(() => {});

  } catch (error) {
    console.error('❌ Error launching browser:', error.message);
    if (error.message.includes('profile directory is already in use')) {
      console.log('');
      console.log('💡 Please close all Chrome windows and try again.');
    }
    process.exit(1);
  }
})();
