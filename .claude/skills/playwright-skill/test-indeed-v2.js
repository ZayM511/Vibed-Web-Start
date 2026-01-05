const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const extensionPath = path.resolve(__dirname, '../../../chrome-extension');
  console.log('Loading extension from:', extensionPath);

  // Launch Chrome with extension
  const browser = await chromium.launchPersistentContext('', {
    headless: false,
    channel: 'chrome',
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
    ],
    slowMo: 50
  });

  // Get the extension ID from service worker
  let extensionId = null;
  const backgroundPages = browser.serviceWorkers();
  if (backgroundPages.length > 0) {
    const url = backgroundPages[0].url();
    extensionId = url.split('/')[2];
    console.log('Extension ID:', extensionId);
  }

  const page = await browser.newPage();

  // Listen to console messages
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('JobFiltr') || text.includes('jobfiltr') || text.includes('[Indeed]')) {
      console.log('EXTENSION LOG:', text);
    }
  });

  // Navigate to Indeed
  console.log('\nNavigating to Indeed...');
  await page.goto('https://www.indeed.com/jobs?q=software+engineer&l=remote', {
    waitUntil: 'domcontentloaded',
    timeout: 60000
  });

  console.log('Page title:', await page.title());

  // Wait for page to fully load
  await page.waitForTimeout(5000);

  // Take initial screenshot
  await page.screenshot({ path: '/tmp/indeed-initial.png', fullPage: false });
  console.log('Initial screenshot saved to /tmp/indeed-initial.png');

  // Check for job cards with different selectors
  const selectors = [
    '.job_seen_beacon',
    '.jobsearch-ResultsList > li',
    '[data-jk]',
    '.resultContent',
    '.slider_container',
    'td.resultContent'
  ];

  for (const sel of selectors) {
    const count = await page.locator(sel).count();
    if (count > 0) {
      console.log(`Found ${count} elements with selector: ${sel}`);
    }
  }

  // Check for salary info with different selectors
  const salarySelectors = [
    '.salary-snippet-container',
    '.salaryOnly',
    '[data-testid="attribute_snippet_testid"]',
    '.estimated-salary',
    '.metadata'
  ];

  for (const sel of salarySelectors) {
    const count = await page.locator(sel).count();
    if (count > 0) {
      console.log(`Found ${count} salary elements with: ${sel}`);
    }
  }

  // Check extension elements
  const extensionSelectors = [
    '[class*="jobfiltr"]',
    '[data-jobfiltr-scanned]',
    '[data-jobfiltr-hidden]',
    '.jobfiltr-scanned',
    '.jobfiltr-badge'
  ];

  for (const sel of extensionSelectors) {
    const count = await page.locator(sel).count();
    if (count > 0) {
      console.log(`Found ${count} extension elements with: ${sel}`);
    }
  }

  // Try to open extension popup (if we have extension ID)
  if (extensionId) {
    console.log('\nOpening extension popup...');
    const popupPage = await browser.newPage();
    await popupPage.goto(`chrome-extension://${extensionId}/popup-v2.html`);
    await popupPage.waitForTimeout(2000);
    await popupPage.screenshot({ path: '/tmp/extension-popup.png' });
    console.log('Popup screenshot saved to /tmp/extension-popup.png');
    await popupPage.close();
  }

  console.log('\n--- Browser open for manual testing (90 seconds) ---');
  console.log('1. Click the JobFiltr extension icon in the toolbar');
  console.log('2. Enable "Hide jobs without salary info" in the popup');
  console.log('3. Observe if job cards are filtered');

  await page.waitForTimeout(90000);

  await browser.close();
  console.log('Test complete.');
})();
