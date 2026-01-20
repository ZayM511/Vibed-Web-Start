const { chromium } = require('playwright');

const EXTENSION_PATH = 'C:\\Users\\isaia\\OneDrive\\Documents\\2025 Docs\\Claude Copy\\Vibed-Web-Start-1\\chrome-extension';

(async () => {
  console.log('Comprehensive LinkedIn Extension Diagnostic');
  console.log('='.repeat(60));

  const browser = await chromium.launch({
    headless: false,
    slowMo: 50,
    args: [
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`
    ]
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();

  // Collect ALL console messages
  const consoleLogs = [];
  page.on('console', msg => {
    const text = msg.text();
    consoleLogs.push({ type: msg.type(), text });
    if (text.includes('JobFiltr') || text.includes('GhostDetection') || text.includes('jobfiltr')) {
      console.log(`[PAGE ${msg.type().toUpperCase()}]`, text);
    }
  });

  // Collect errors
  const errors = [];
  page.on('pageerror', error => {
    console.log('[PAGE ERROR]', error.message);
    errors.push(error.message);
  });

  console.log('\n1. Navigating to LinkedIn login page...');
  await page.goto('https://www.linkedin.com/login');

  console.log('\n2. Please log into LinkedIn manually within 90 seconds...');
  console.log('   Waiting for login detection...');

  try {
    await page.waitForSelector('.global-nav, [data-control-name="nav.jobs"]', { timeout: 90000 });
    console.log('   Login detected!');
  } catch (e) {
    console.log('   Login timeout - please ensure you logged in');
  }

  // Wait a moment for the page to stabilize
  await page.waitForTimeout(3000);

  console.log('\n3. Navigating to LinkedIn Jobs search...');
  await page.goto('https://www.linkedin.com/jobs/search/?keywords=software%20engineer&location=United%20States');

  console.log('   Waiting for page to load (15 seconds)...');
  await page.waitForTimeout(15000);

  // Click on the first job to load the detail panel
  console.log('\n4. Clicking on first job card...');
  try {
    const jobCard = await page.$('.scaffold-layout__list-item, .jobs-search-results__list-item');
    if (jobCard) {
      await jobCard.click();
      console.log('   Clicked job card, waiting 5 seconds for detail panel...');
      await page.waitForTimeout(5000);
    } else {
      console.log('   No job cards found!');
    }
  } catch (e) {
    console.log('   Error clicking job:', e.message);
  }

  // Run comprehensive diagnostic
  console.log('\n5. Running comprehensive diagnostic...');

  const diagnostic = await page.evaluate(() => {
    const results = {
      // Check if content script variables are accessible
      filterSettings: null,
      filterSettingsError: null,

      // Chrome storage check
      storageCheck: null,

      // DOM elements check
      dom: {
        jobCards: 0,
        ageBadgesOnCards: 0,
        detailAgeBadge: null,
        ghostBadge: null,
        wrapper: null,
        jobDetailPanel: null,
        jobTitle: null
      },

      // Selector tests
      selectorTests: []
    };

    // Try to access filterSettings
    try {
      if (typeof filterSettings !== 'undefined') {
        results.filterSettings = JSON.parse(JSON.stringify(filterSettings));
      } else {
        results.filterSettingsError = 'filterSettings is undefined';
      }
    } catch (e) {
      results.filterSettingsError = e.message;
    }

    // Count job cards
    const cardSelectors = [
      '.scaffold-layout__list-item',
      '.jobs-search-results__list-item',
      'li[data-occludable-job-id]',
      '.job-card-container'
    ];

    for (const sel of cardSelectors) {
      const count = document.querySelectorAll(sel).length;
      if (count > 0) {
        results.selectorTests.push({ selector: sel, count, type: 'job-card' });
        results.dom.jobCards = Math.max(results.dom.jobCards, count);
      }
    }

    // Check for age badges on cards
    results.dom.ageBadgesOnCards = document.querySelectorAll('.jobfiltr-age-badge').length;

    // Check for detail panel badge
    const detailBadge = document.querySelector('.jobfiltr-detail-age-badge');
    if (detailBadge) {
      results.dom.detailAgeBadge = {
        text: detailBadge.textContent?.trim(),
        visible: detailBadge.offsetParent !== null
      };
    }

    // Check for ghost badge
    const ghostBadge = document.querySelector('.jobfiltr-ghost-score');
    if (ghostBadge) {
      results.dom.ghostBadge = {
        visible: ghostBadge.offsetParent !== null,
        html: ghostBadge.outerHTML.substring(0, 200)
      };
    }

    // Check for wrapper
    const wrapper = document.getElementById('jobfiltr-badges-wrapper');
    if (wrapper) {
      results.dom.wrapper = {
        childCount: wrapper.children.length,
        display: window.getComputedStyle(wrapper).display,
        visible: wrapper.offsetParent !== null
      };
    }

    // Check for detail panel
    const detailSelectors = [
      '.scaffold-layout__detail-inner',
      '.scaffold-layout__detail',
      '.jobs-search__job-details',
      '.jobs-details'
    ];

    for (const sel of detailSelectors) {
      const el = document.querySelector(sel);
      if (el) {
        results.selectorTests.push({ selector: sel, found: true, type: 'detail-panel' });
        if (!results.dom.jobDetailPanel) {
          results.dom.jobDetailPanel = sel;
        }
      }
    }

    // Check for job title in detail panel
    const titleSelectors = [
      '.jobs-unified-top-card__job-title',
      '.job-details-jobs-unified-top-card__job-title',
      'h1.t-24',
      '.t-24.t-bold'
    ];

    for (const sel of titleSelectors) {
      const el = document.querySelector(sel);
      if (el) {
        results.selectorTests.push({
          selector: sel,
          found: true,
          type: 'job-title',
          text: el.textContent?.trim().substring(0, 50)
        });
        if (!results.dom.jobTitle) {
          results.dom.jobTitle = el.textContent?.trim().substring(0, 50);
        }
      }
    }

    // Check for time elements (used for job age)
    const timeElements = document.querySelectorAll('time');
    results.selectorTests.push({
      selector: 'time',
      count: timeElements.length,
      type: 'time-elements',
      samples: Array.from(timeElements).slice(0, 5).map(t => ({
        datetime: t.getAttribute('datetime'),
        text: t.textContent?.trim()
      }))
    });

    return results;
  });

  console.log('\n=== DIAGNOSTIC RESULTS ===');

  console.log('\n--- Filter Settings ---');
  if (diagnostic.filterSettings) {
    console.log('filterSettings is accessible:');
    console.log('  showJobAge:', diagnostic.filterSettings.showJobAge);
    console.log('  hideStaffing:', diagnostic.filterSettings.hideStaffing);
    console.log('  Full settings:', JSON.stringify(diagnostic.filterSettings, null, 2));
  } else {
    console.log('filterSettings NOT accessible:', diagnostic.filterSettingsError);
  }

  console.log('\n--- DOM Elements ---');
  console.log('Job cards found:', diagnostic.dom.jobCards);
  console.log('Age badges on cards:', diagnostic.dom.ageBadgesOnCards);
  console.log('Detail age badge:', diagnostic.dom.detailAgeBadge || 'NOT FOUND');
  console.log('Ghost badge:', diagnostic.dom.ghostBadge || 'NOT FOUND');
  console.log('Wrapper:', diagnostic.dom.wrapper || 'NOT FOUND');
  console.log('Detail panel:', diagnostic.dom.jobDetailPanel || 'NOT FOUND');
  console.log('Job title:', diagnostic.dom.jobTitle || 'NOT FOUND');

  console.log('\n--- Selector Tests ---');
  diagnostic.selectorTests.forEach(test => {
    if (test.type === 'time-elements') {
      console.log(`${test.selector}: ${test.count} found`);
      if (test.samples && test.samples.length > 0) {
        console.log('  Samples:');
        test.samples.forEach((s, i) => {
          console.log(`    ${i+1}. datetime="${s.datetime}" text="${s.text}"`);
        });
      }
    } else if (test.count !== undefined) {
      console.log(`${test.selector}: ${test.count} found (${test.type})`);
    } else if (test.found) {
      console.log(`${test.selector}: FOUND (${test.type})${test.text ? ' - "' + test.text + '"' : ''}`);
    }
  });

  console.log('\n--- Console Logs Summary ---');
  const jobfiltrLogs = consoleLogs.filter(l =>
    l.text.includes('JobFiltr') ||
    l.text.includes('GhostDetection') ||
    l.text.includes('jobfiltr')
  );
  console.log(`Found ${jobfiltrLogs.length} JobFiltr-related console messages`);
  if (jobfiltrLogs.length > 0) {
    console.log('Recent messages:');
    jobfiltrLogs.slice(-10).forEach(l => {
      console.log(`  [${l.type}] ${l.text.substring(0, 150)}`);
    });
  }

  console.log('\n--- Errors ---');
  if (errors.length === 0) {
    console.log('No page errors detected');
  } else {
    errors.forEach(e => console.log('  -', e));
  }

  // Take screenshot
  await page.screenshot({ path: '/tmp/linkedin-diagnostic.png', fullPage: false });
  console.log('\nScreenshot saved to /tmp/linkedin-diagnostic.png');

  console.log('\n' + '='.repeat(60));
  console.log('Keeping browser open for 60 seconds for manual inspection...');
  console.log('You can check the browser console (F12) for more details.');
  await page.waitForTimeout(60000);

  await browser.close();
  console.log('Browser closed.');
})();
