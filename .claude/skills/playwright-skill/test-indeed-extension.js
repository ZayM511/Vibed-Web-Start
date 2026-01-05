const { chromium } = require('playwright');
const path = require('path');

(async () => {
  // Path to the Chrome extension
  const extensionPath = path.resolve(__dirname, '../../../chrome-extension');

  console.log('Loading extension from:', extensionPath);

  // Launch Chrome with the extension loaded
  const browser = await chromium.launchPersistentContext('', {
    headless: false,
    channel: 'chrome',
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
    ],
    slowMo: 100
  });

  const page = await browser.newPage();

  // Navigate to Indeed job search
  console.log('Navigating to Indeed...');
  await page.goto('https://www.indeed.com/jobs?q=software+engineer&l=remote', {
    waitUntil: 'domcontentloaded',
    timeout: 60000
  });

  console.log('Page loaded:', await page.title());

  // Wait for job cards to load
  await page.waitForTimeout(3000);

  // Take a screenshot
  await page.screenshot({ path: '/tmp/indeed-test.png', fullPage: true });
  console.log('Screenshot saved to /tmp/indeed-test.png');

  // Check for job cards
  const jobCards = await page.locator('.job_seen_beacon, .jobsearch-ResultsList > li').count();
  console.log(`Found ${jobCards} job cards`);

  // Look for salary information in job cards
  const salaryElements = await page.locator('.salary-snippet-container, .salaryOnly, .estimated-salary').count();
  console.log(`Found ${salaryElements} salary elements`);

  // Check if extension content script is running
  const extensionBadges = await page.locator('[class*="jobfiltr"]').count();
  console.log(`Found ${extensionBadges} JobFiltr elements (extension active: ${extensionBadges > 0})`);

  // Keep browser open for manual inspection
  console.log('\nBrowser will stay open for 60 seconds for manual inspection...');
  console.log('You can interact with the JobFiltr extension popup manually.');
  await page.waitForTimeout(60000);

  await browser.close();
  console.log('Test complete.');
})();
