const { chromium } = require('playwright');

const EXTENSION_PATH = 'C:\\Users\\isaia\\OneDrive\\Documents\\2025 Docs\\Claude Copy\\Vibed-Web-Start-1\\chrome-extension';

(async () => {
  console.log('Testing LinkedIn Job Age Display');
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
    if (text.includes('JobFiltr') || text.includes('jobfiltr') || text.includes('GhostDetection')) {
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

  // Check for job cards
  console.log('\n3. Checking for job cards and badges...');

  const analysis = await page.evaluate(() => {
    const results = {
      jobCards: [],
      ageBadges: [],
      ghostBadges: [],
      detailAgeBadge: null,
      wrapper: null,
      consoleErrors: [],
      filterSettings: null
    };

    // Try to access filterSettings if available
    try {
      if (typeof filterSettings !== 'undefined') {
        results.filterSettings = JSON.stringify(filterSettings);
      }
    } catch (e) {
      results.filterSettings = 'Not accessible: ' + e.message;
    }

    // Check for job cards
    const cardSelectors = [
      '.jobs-search-results__list-item',
      '.scaffold-layout__list-item',
      '.job-card-container',
      'li[data-occludable-job-id]'
    ];

    for (const sel of cardSelectors) {
      const cards = document.querySelectorAll(sel);
      if (cards.length > 0) {
        results.jobCards.push({
          selector: sel,
          count: cards.length
        });
      }
    }

    // Check for age badges on cards
    const ageBadges = document.querySelectorAll('.jobfiltr-age-badge');
    ageBadges.forEach((badge, i) => {
      results.ageBadges.push({
        index: i,
        dataAge: badge.dataset.age,
        text: badge.textContent?.substring(0, 50),
        visible: badge.offsetParent !== null
      });
    });

    // Check for ghost badges
    const ghostBadges = document.querySelectorAll('.jobfiltr-ghost-score');
    ghostBadges.forEach((badge, i) => {
      results.ghostBadges.push({
        index: i,
        visible: badge.offsetParent !== null
      });
    });

    // Check for detail panel age badge
    const detailBadge = document.querySelector('.jobfiltr-detail-age-badge');
    if (detailBadge) {
      results.detailAgeBadge = {
        text: detailBadge.textContent?.substring(0, 50),
        visible: detailBadge.offsetParent !== null
      };
    }

    // Check for wrapper
    const wrapper = document.getElementById('jobfiltr-badges-wrapper');
    if (wrapper) {
      results.wrapper = {
        childCount: wrapper.children.length,
        visible: wrapper.offsetParent !== null
      };
    }

    return results;
  });

  console.log('\n=== ANALYSIS RESULTS ===');
  console.log('\nFilter Settings:', analysis.filterSettings || 'Not found');

  console.log('\nJob Cards:');
  if (analysis.jobCards.length > 0) {
    analysis.jobCards.forEach(c => console.log(`  ✓ ${c.selector}: ${c.count} cards`));
  } else {
    console.log('  ✗ No job cards found');
  }

  console.log('\nAge Badges on Cards:');
  if (analysis.ageBadges.length > 0) {
    analysis.ageBadges.forEach(b => console.log(`  ✓ Badge ${b.index}: age=${b.dataAge}, visible=${b.visible}`));
  } else {
    console.log('  ✗ No age badges found on job cards');
  }

  console.log('\nGhost Badges:');
  if (analysis.ghostBadges.length > 0) {
    analysis.ghostBadges.forEach(b => console.log(`  ✓ Ghost Badge ${b.index}: visible=${b.visible}`));
  } else {
    console.log('  ✗ No ghost badges found');
  }

  console.log('\nDetail Panel Age Badge:', analysis.detailAgeBadge || 'Not found');
  console.log('Wrapper:', analysis.wrapper || 'Not found');

  // Click on a job card to see detail panel
  console.log('\n4. Clicking on a job card...');
  try {
    const jobCard = await page.$('.jobs-search-results__list-item, .scaffold-layout__list-item');
    if (jobCard) {
      await jobCard.click();
      await page.waitForTimeout(5000);

      // Re-check for badges after clicking
      const afterClick = await page.evaluate(() => {
        return {
          detailAgeBadge: document.querySelector('.jobfiltr-detail-age-badge')?.textContent?.substring(0, 50) || 'NOT FOUND',
          ghostBadge: document.querySelector('.jobfiltr-ghost-score') ? 'FOUND' : 'NOT FOUND',
          wrapper: document.getElementById('jobfiltr-badges-wrapper') ? 'FOUND' : 'NOT FOUND',
          ageBadgesOnCards: document.querySelectorAll('.jobfiltr-age-badge').length
        };
      });

      console.log('\n=== AFTER CLICKING JOB ===');
      console.log('Detail Age Badge:', afterClick.detailAgeBadge);
      console.log('Ghost Badge:', afterClick.ghostBadge);
      console.log('Wrapper:', afterClick.wrapper);
      console.log('Age Badges on Cards:', afterClick.ageBadgesOnCards);
    }
  } catch (e) {
    console.log('Error clicking job card:', e.message);
  }

  // Take screenshot
  await page.screenshot({ path: '/tmp/linkedin-job-age-test.png', fullPage: false });
  console.log('\nScreenshot saved to /tmp/linkedin-job-age-test.png');

  console.log('\n' + '='.repeat(60));
  console.log('Keeping browser open for 60 seconds for manual inspection...');
  await page.waitForTimeout(60000);

  await browser.close();
  console.log('Browser closed.');
})();
