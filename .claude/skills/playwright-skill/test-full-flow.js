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

  const page = await browser.newPage();

  // Listen to console messages
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('JobFiltr')) {
      console.log('EXTENSION LOG:', text);
    }
  });

  console.log('\nNavigating to Indeed...');
  await page.goto('https://www.indeed.com/jobs?q=software+engineer&l=remote', {
    waitUntil: 'domcontentloaded',
    timeout: 60000
  });

  console.log('Waiting for page load...');
  await page.waitForTimeout(5000);

  console.log('\n=== CHECKING EXTENSION STATUS ===');

  // Check if we can see any JobFiltr logs appeared
  // Check the DOM for any JobFiltr-related elements
  const extensionStatus = await page.evaluate(() => {
    return {
      hasMosaicExtractor: !!document.getElementById('jobfiltr-mosaic-extractor'),
      hasAgeBadges: document.querySelectorAll('.jobfiltr-age-badge').length,
      hasBenefitsBadges: document.querySelectorAll('.jobfiltr-benefits-badge').length,
      jobCardCount: document.querySelectorAll('.job_seen_beacon').length
    };
  });

  console.log('Extension status:', extensionStatus);

  console.log('\n=== INSTRUCTIONS FOR MANUAL TESTING ===');
  console.log('1. Click the JobFiltr extension icon in the Chrome toolbar');
  console.log('2. Navigate to the Scanner tab');
  console.log('3. Check the "Show Job Age" checkbox');
  console.log('4. Click "Apply Filters" button');
  console.log('5. Look for age badges on job cards (e.g., "🟢 1 day", "🔴 30+ days (~92d)")');
  console.log('6. Check browser console for "JobFiltr" logs');

  console.log('\n>>> Browser will stay open for 2 minutes for testing <<<');
  await page.waitForTimeout(120000);

  await browser.close();
})();
