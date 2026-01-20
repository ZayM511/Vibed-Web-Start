/**
 * Stealth Browser Configuration for Playwright/Puppeteer
 *
 * This configuration bypasses automation detection by:
 * 1. Using your existing Chrome profile (maintains login sessions)
 * 2. Hiding automation flags (webdriver, automation-controlled)
 * 3. Using real Chrome instead of Chromium
 * 4. Injecting stealth scripts to mask automation
 *
 * Usage:
 *   const { launchStealthBrowser } = require('./stealth-browser-config');
 *   const { browser, page } = await launchStealthBrowser(extensionPath);
 */

const { chromium } = require('playwright');
const path = require('path');

/**
 * Launch a stealth browser with extension support
 * @param {string} extensionPath - Absolute path to Chrome extension directory
 * @param {object} options - Additional launch options
 * @returns {Promise<{browser: BrowserContext, page: Page}>}
 */
async function launchStealthBrowser(extensionPath, options = {}) {
  // Use your existing Chrome profile to maintain login session
  const userDataDir = path.join(process.env.LOCALAPPDATA, 'Google', 'Chrome', 'User Data');

  console.log('📂 Using Chrome profile from:', userDataDir);
  console.log('📦 Loading extension from:', extensionPath);

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
      '--no-default-browser-check'
    ],
    ignoreDefaultArgs: ['--enable-automation', '--enable-blink-features=AutomationControlled'],
    viewport: { width: 1920, height: 1080 },
    ...options
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

  console.log('✅ Stealth browser launched successfully');

  return { browser, page };
}

/**
 * Launch stealth browser with Puppeteer MCP
 * @param {string} extensionPath - Absolute path to Chrome extension directory
 * @returns {Promise<void>}
 */
async function launchStealthBrowserForMCP(extensionPath) {
  const userDataDir = path.join(process.env.LOCALAPPDATA, 'Google', 'Chrome', 'User Data');

  // Return launch options for Puppeteer MCP
  return {
    userDataDir,
    headless: false,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
      '--disable-blink-features=AutomationControlled',
      '--disable-dev-shm-usage',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process',
      '--disable-site-isolation-trials',
      '--no-first-run',
      '--no-default-browser-check'
    ],
    ignoreDefaultArgs: ['--enable-automation', '--enable-blink-features=AutomationControlled']
  };
}

module.exports = {
  launchStealthBrowser,
  launchStealthBrowserForMCP
};
