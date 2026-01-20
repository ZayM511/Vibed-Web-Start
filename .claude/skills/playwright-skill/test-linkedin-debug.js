const { chromium } = require('playwright');

const EXTENSION_PATH = 'C:\\Users\\isaia\\OneDrive\\Documents\\2025 Docs\\Claude Copy\\Vibed-Web-Start-1\\chrome-extension';

(async () => {
  console.log('Debug LinkedIn Job Age Display');
  console.log('='.repeat(60));

  const browser = await chromium.launch({
    headless: false,
    slowMo: 100,
    args: [
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`
    ]
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();

  // Listen for console messages from the page
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('JobFiltr')) {
      console.log('[PAGE LOG]', text);
    }
  });

  // Listen for page errors
  page.on('pageerror', error => {
    console.log('[PAGE ERROR]', error.message);
  });

  console.log('\n1. Please log into LinkedIn manually...');
  await page.goto('https://www.linkedin.com/login');

  // Wait for login
  console.log('Waiting for login (look for jobs link)...');
  try {
    await page.waitForSelector('.global-nav, [data-control-name="nav.jobs"]', { timeout: 120000 });
    console.log('Login detected!');
  } catch (e) {
    console.log('Login timeout - continuing...');
  }

  // Navigate to Jobs
  console.log('\n2. Navigating to LinkedIn Jobs...');
  await page.goto('https://www.linkedin.com/jobs/search/?keywords=software%20engineer');
  await page.waitForTimeout(8000);

  // Check filterSettings and job cards
  console.log('\n3. Checking extension state...');

  const analysis = await page.evaluate(() => {
    const results = {
      scriptLoaded: false,
      filterSettings: null,
      jobCards: 0,
      ageBadges: 0,
      detailAgeBadge: null,
      consoleMessages: []
    };

    // Check if content script is loaded
    try {
      if (typeof filterSettings !== 'undefined') {
        results.scriptLoaded = true;
        results.filterSettings = JSON.parse(JSON.stringify(filterSettings));
      }
    } catch (e) {
      results.consoleMessages.push('filterSettings not accessible: ' + e.message);
    }

    // Count job cards
    const cards = document.querySelectorAll('.scaffold-layout__list-item, .jobs-search-results__list-item');
    results.jobCards = cards.length;

    // Count age badges
    const badges = document.querySelectorAll('.jobfiltr-age-badge');
    results.ageBadges = badges.length;

    // Check for detail panel age badge
    const detailBadge = document.querySelector('.jobfiltr-detail-age-badge');
    if (detailBadge) {
      results.detailAgeBadge = detailBadge.textContent?.substring(0, 50);
    }

    return results;
  });

  console.log('\n=== ANALYSIS RESULTS ===');
  console.log('Script loaded:', analysis.scriptLoaded);
  console.log('Filter settings:', JSON.stringify(analysis.filterSettings, null, 2));
  console.log('Job cards found:', analysis.jobCards);
  console.log('Age badges found:', analysis.ageBadges);
  console.log('Detail panel age badge:', analysis.detailAgeBadge || 'NOT FOUND');
  if (analysis.consoleMessages.length > 0) {
    console.log('Console messages:', analysis.consoleMessages);
  }

  // Check Chrome storage for filter settings
  console.log('\n4. Checking Chrome storage...');
  const storageData = await page.evaluate(async () => {
    return new Promise((resolve) => {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get(['filterSettings', 'authToken', 'authExpiry'], (result) => {
          resolve({
            hasFilterSettings: !!result.filterSettings,
            filterSettings: result.filterSettings,
            hasAuthToken: !!result.authToken,
            authExpiry: result.authExpiry,
            isExpired: result.authExpiry ? Date.now() >= result.authExpiry : true
          });
        });
      } else {
        resolve({ error: 'Chrome storage not available' });
      }
    });
  });

  console.log('Storage data:', JSON.stringify(storageData, null, 2));

  // Click on a job card
  console.log('\n5. Clicking on a job card...');
  try {
    const jobCard = await page.$('.scaffold-layout__list-item, .jobs-search-results__list-item');
    if (jobCard) {
      await jobCard.click();
      await page.waitForTimeout(3000);

      // Re-check for badges after clicking
      const afterClick = await page.evaluate(() => {
        return {
          ageBadges: document.querySelectorAll('.jobfiltr-age-badge').length,
          detailAgeBadge: document.querySelector('.jobfiltr-detail-age-badge')?.textContent?.substring(0, 50) || 'NOT FOUND',
          ghostBadge: document.querySelector('.jobfiltr-ghost-score') ? 'FOUND' : 'NOT FOUND',
          wrapper: document.getElementById('jobfiltr-badges-wrapper') ? 'FOUND' : 'NOT FOUND'
        };
      });

      console.log('\n=== AFTER CLICKING JOB ===');
      console.log('Age badges:', afterClick.ageBadges);
      console.log('Detail age badge:', afterClick.detailAgeBadge);
      console.log('Ghost badge:', afterClick.ghostBadge);
      console.log('Wrapper:', afterClick.wrapper);
    }
  } catch (e) {
    console.log('Error clicking job card:', e.message);
  }

  console.log('\n' + '='.repeat(60));
  console.log('Keeping browser open for 60 seconds for manual inspection...');
  await page.waitForTimeout(60000);

  await browser.close();
  console.log('Browser closed.');
})();
