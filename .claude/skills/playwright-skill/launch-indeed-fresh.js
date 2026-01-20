/**
 * Launch a fresh stealth browser for Indeed testing
 * Uses a separate profile to avoid conflicts
 */

const { chromium } = require('playwright');
const path = require('path');
const os = require('os');

(async () => {
  const extensionPath = path.resolve(__dirname, '..', '..', '..', 'chrome-extension');
  // Use a separate profile directory for testing
  const userDataDir = path.join(os.tmpdir(), 'chrome-indeed-test-profile');

  console.log('📂 Using test profile at:', userDataDir);
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

      // Override navigator.plugins - make it look real
      Object.defineProperty(navigator, 'plugins', {
        get: () => [
          { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer' },
          { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai' },
          { name: 'Native Client', filename: 'internal-nacl-plugin' }
        ]
      });

      // Override navigator.languages
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en']
      });

      // Mock chrome object properly
      if (!window.chrome) {
        window.chrome = {};
      }
      window.chrome.runtime = window.chrome.runtime || {};
      window.chrome.loadTimes = function() { return {}; };
      window.chrome.csi = function() { return {}; };
      window.chrome.app = window.chrome.app || {};

      // Mock permissions
      if (window.navigator.permissions) {
        const originalQuery = window.navigator.permissions.query;
        window.navigator.permissions.query = (parameters) => (
          parameters.name === 'notifications' ?
            Promise.resolve({ state: Notification.permission }) :
            originalQuery(parameters)
        );
      }

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
    console.log('');
    console.log('🔑 IMPORTANT: Since this is a fresh profile, you need to:');
    console.log('   1. Login to your Indeed account');
    console.log('   2. Let me know once you are logged in');
    console.log('');
    console.log('DevTools available at: http://localhost:9222');
    console.log('');
    console.log('⌨️  Press Ctrl+C to close when done testing');

    // Keep browser open
    await new Promise(() => {});

  } catch (error) {
    console.error('❌ Error launching browser:', error.message);
    console.error(error);
    process.exit(1);
  }
})();
