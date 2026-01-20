/**
 * LinkedIn Job Age & Ghost Badge Feature Test
 * Tests the updated 2025/2026 LinkedIn DOM selectors and text-based job age extraction
 *
 * Run: cd .claude/skills/playwright-skill && node run.js test-linkedin-v2-features.js
 */

const { chromium } = require('playwright');

const EXTENSION_PATH = 'C:\\Users\\isaia\\OneDrive\\Documents\\2025 Docs\\Claude Copy\\Vibed-Web-Start-1\\chrome-extension';

(async () => {
  console.log('='.repeat(70));
  console.log('LinkedIn Job Age & Ghost Badge Feature Test');
  console.log('Testing updated selectors for 2025/2026 LinkedIn DOM');
  console.log('='.repeat(70));

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

  // Collect console logs
  const consoleLogs = [];
  page.on('console', msg => {
    const text = msg.text();
    consoleLogs.push({ type: msg.type(), text });
    if (text.includes('JobFiltr') || text.includes('Job Age') || text.includes('GhostDetection')) {
      console.log(`[PAGE ${msg.type().toUpperCase()}]`, text.substring(0, 150));
    }
  });

  // Collect errors
  const errors = [];
  page.on('pageerror', error => {
    console.log('[PAGE ERROR]', error.message);
    errors.push(error.message);
  });

  // Results tracking
  const results = {
    jobCardAges: 0,
    detailAgeBadge: false,
    ghostBadge: false,
    ghostBadgePosition: 'unknown',
    timePatternFound: false,
    errors: []
  };

  console.log('\n[STEP 1] Navigating to LinkedIn login...');
  await page.goto('https://www.linkedin.com/login');

  console.log('[STEP 2] Please log into LinkedIn manually (90 seconds timeout)...');
  try {
    await page.waitForSelector('.global-nav, [data-control-name="nav.jobs"]', { timeout: 90000 });
    console.log('[OK] Login detected!');
  } catch (e) {
    console.log('[WARN] Login timeout - continuing anyway...');
  }

  await page.waitForTimeout(2000);

  console.log('\n[STEP 3] Navigating to LinkedIn Jobs search...');
  await page.goto('https://www.linkedin.com/jobs/search/?keywords=software%20engineer&location=United%20States');

  console.log('[STEP 4] Waiting for page to load (15 seconds)...');
  await page.waitForTimeout(15000);

  // Test 1: Check for time pattern text in the page
  console.log('\n[TEST 1] Checking for time pattern text in page...');
  const timePatternTest = await page.evaluate(() => {
    // Find all text nodes that might contain time patterns
    const pattern = /\d+\s*(hour|day|week|month)s?\s*ago/i;
    const elements = [];

    // Search all text content
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );

    let node;
    while (node = walker.nextNode()) {
      const text = node.textContent?.trim();
      if (text && pattern.test(text)) {
        elements.push({
          text: text.substring(0, 50),
          parentTag: node.parentElement?.tagName,
          parentClass: node.parentElement?.className?.substring(0, 50)
        });
      }
    }

    return {
      found: elements.length > 0,
      count: elements.length,
      samples: elements.slice(0, 5)
    };
  });

  console.log(`   Time patterns found: ${timePatternTest.count}`);
  if (timePatternTest.found) {
    console.log('   Samples:');
    timePatternTest.samples.forEach((s, i) => {
      console.log(`     ${i + 1}. "${s.text}" (${s.parentTag}.${s.parentClass})`);
    });
    results.timePatternFound = true;
  }

  // Test 2: Click on first job card
  console.log('\n[TEST 2] Clicking on first job card...');
  try {
    // Find job cards using new selectors
    const jobCardClicked = await page.evaluate(() => {
      // Try to find job cards
      const selectors = [
        'a[href*="/jobs/view/"]',
        '.scaffold-layout__list-item',
        'li[data-occludable-job-id]'
      ];

      for (const sel of selectors) {
        const els = document.querySelectorAll(sel);
        for (const el of els) {
          // Find the parent li for the job card
          const li = el.closest('li');
          if (li) {
            li.click();
            return { clicked: true, selector: sel };
          }
        }
      }
      return { clicked: false };
    });

    if (jobCardClicked.clicked) {
      console.log(`   Clicked job card using: ${jobCardClicked.selector}`);
    } else {
      console.log('   Could not find job card to click');
    }
  } catch (e) {
    console.log('   Error clicking job card:', e.message);
  }

  console.log('[STEP 5] Waiting for detail panel to load (5 seconds)...');
  await page.waitForTimeout(5000);

  // Test 3: Check for JobFiltr badges
  console.log('\n[TEST 3] Checking for JobFiltr badges...');
  const badgeCheck = await page.evaluate(() => {
    const result = {
      ageBadgesOnCards: document.querySelectorAll('.jobfiltr-age-badge').length,
      detailAgeBadge: null,
      ghostBadge: null,
      badgesWrapper: null,
      detailPanel: null
    };

    // Check for detail age badge
    const detailBadge = document.querySelector('.jobfiltr-detail-age-badge');
    if (detailBadge) {
      result.detailAgeBadge = {
        text: detailBadge.textContent?.trim().substring(0, 50),
        visible: detailBadge.offsetParent !== null
      };
    }

    // Check for ghost badge
    const ghostBadge = document.querySelector('.jobfiltr-ghost-score');
    if (ghostBadge) {
      // Check where it's positioned
      const isFloating = ghostBadge.closest('#jobfiltr-floating-badge-container');
      const isInWrapper = ghostBadge.closest('#jobfiltr-badges-wrapper');
      const isInDetailPanel = ghostBadge.closest('.scaffold-layout__detail, .jobs-search__job-details');

      result.ghostBadge = {
        visible: ghostBadge.offsetParent !== null,
        position: isFloating ? 'floating' : (isInDetailPanel ? 'detail-panel' : 'unknown'),
        inWrapper: !!isInWrapper
      };
    }

    // Check for wrapper
    const wrapper = document.getElementById('jobfiltr-badges-wrapper');
    if (wrapper) {
      result.badgesWrapper = {
        childCount: wrapper.children.length,
        visible: wrapper.offsetParent !== null
      };
    }

    // Check detail panel exists
    const panel = document.querySelector('.scaffold-layout__detail, .scaffold-layout__detail-inner');
    if (panel) {
      result.detailPanel = {
        found: true,
        hasH1: !!panel.querySelector('h1'),
        hasJobLink: !!panel.querySelector('a[href*="/jobs/view/"]'),
        hasCompanyLink: !!panel.querySelector('a[href*="/company/"]')
      };
    }

    return result;
  });

  console.log('   Age badges on cards:', badgeCheck.ageBadgesOnCards);
  console.log('   Detail age badge:', badgeCheck.detailAgeBadge || 'NOT FOUND');
  console.log('   Ghost badge:', badgeCheck.ghostBadge || 'NOT FOUND');
  console.log('   Badges wrapper:', badgeCheck.badgesWrapper || 'NOT FOUND');
  console.log('   Detail panel:', badgeCheck.detailPanel || 'NOT FOUND');

  results.jobCardAges = badgeCheck.ageBadgesOnCards;
  results.detailAgeBadge = !!badgeCheck.detailAgeBadge;
  results.ghostBadge = !!badgeCheck.ghostBadge;
  if (badgeCheck.ghostBadge) {
    results.ghostBadgePosition = badgeCheck.ghostBadge.position;
  }

  // Test 4: Check console logs for job age extraction
  console.log('\n[TEST 4] Analyzing console logs...');
  const jobAgeLogCount = consoleLogs.filter(l =>
    l.text.includes('Job Age') || l.text.includes('getJobAge')
  ).length;
  const ghostDetectionLogCount = consoleLogs.filter(l =>
    l.text.includes('GhostDetection')
  ).length;
  const errorLogCount = consoleLogs.filter(l => l.type === 'error').length;

  console.log(`   Job Age related logs: ${jobAgeLogCount}`);
  console.log(`   Ghost Detection logs: ${ghostDetectionLogCount}`);
  console.log(`   Error logs: ${errorLogCount}`);

  // Take screenshot
  const screenshotPath = 'C:\\Users\\isaia\\OneDrive\\Documents\\2025 Docs\\Claude Copy\\Vibed-Web-Start-1\\.claude\\skills\\playwright-skill\\linkedin-test-result.png';
  await page.screenshot({ path: screenshotPath, fullPage: false });
  console.log(`\n   Screenshot saved to: ${screenshotPath}`);

  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('TEST RESULTS SUMMARY');
  console.log('='.repeat(70));

  const checkMark = (passed) => passed ? '✓' : '✗';

  console.log(`${checkMark(results.timePatternFound)} Time patterns found in page`);
  console.log(`${checkMark(results.jobCardAges > 0)} Job age badges on cards (${results.jobCardAges} found)`);
  console.log(`${checkMark(results.detailAgeBadge)} Detail panel age badge`);
  console.log(`${checkMark(results.ghostBadge)} Ghost job analysis badge`);
  console.log(`${checkMark(results.ghostBadgePosition === 'detail-panel')} Ghost badge in correct position (${results.ghostBadgePosition})`);
  console.log(`${checkMark(errors.length === 0)} No page errors (${errors.length} errors)`);

  const allPassed = results.timePatternFound &&
                    results.detailAgeBadge &&
                    results.ghostBadge &&
                    results.ghostBadgePosition === 'detail-panel' &&
                    errors.length === 0;

  console.log('\n' + (allPassed ? '✓ ALL TESTS PASSED!' : '✗ SOME TESTS FAILED'));

  console.log('\n' + '='.repeat(70));
  console.log('Keeping browser open for 60 seconds for manual inspection...');
  console.log('Check the detail panel for job age and ghost badges.');
  console.log('='.repeat(70));

  await page.waitForTimeout(60000);

  await browser.close();
  console.log('Browser closed.');

  process.exit(allPassed ? 0 : 1);
})();
