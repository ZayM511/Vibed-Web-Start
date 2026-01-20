const { chromium } = require('playwright');

const EXTENSION_PATH = 'C:\\Users\\isaia\\OneDrive\\Documents\\2025 Docs\\Claude Copy\\Vibed-Web-Start-1\\chrome-extension';

(async () => {
  console.log('Inspecting LinkedIn Job Details DOM Structure');
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

  console.log('\n1. Please log into LinkedIn manually in the browser window...');
  await page.goto('https://www.linkedin.com/login');

  // Wait for user to log in (look for jobs link or feed)
  console.log('Waiting for login to complete (looking for home page elements)...');
  try {
    await page.waitForSelector('.global-nav, .feed-shared-update-v2', { timeout: 120000 });
    console.log('Login detected!');
  } catch (e) {
    console.log('Login timeout - continuing anyway...');
  }

  // Navigate to LinkedIn Jobs
  console.log('\n2. Navigating to LinkedIn Jobs...');
  await page.goto('https://www.linkedin.com/jobs/search/?keywords=software%20engineer');
  await page.waitForTimeout(5000);

  console.log('\n3. Waiting for job cards to load...');
  try {
    await page.waitForSelector('.jobs-search-results-list, .scaffold-layout__list', { timeout: 15000 });
    await page.waitForTimeout(3000);
  } catch (e) {
    console.log('Could not find job list, trying alternate selectors...');
    await page.waitForTimeout(3000);
  }

  // Click on a job card to load the detail panel
  console.log('\n4. Clicking on a job card to load details...');
  try {
    const jobCard = await page.$('li.jobs-search-results__list-item, .scaffold-layout__list-item');
    if (jobCard) {
      await jobCard.click();
      await page.waitForTimeout(3000);
    }
  } catch (e) {
    console.log('Could not click job card:', e.message);
  }

  // Inspect the DOM structure
  console.log('\n5. Inspecting job detail panel DOM structure...');

  const domAnalysis = await page.evaluate(() => {
    const analysis = {
      detailPanelSelectors: [],
      topCardSelectors: [],
      titleSelectors: [],
      companySelectors: [],
      jobfiltrWrapper: null,
      topElements: [],
      possibleInsertionPoints: []
    };

    // Check what selectors exist
    const selectorTests = [
      // Detail panel containers
      '.jobs-unified-top-card',
      '.job-details-jobs-unified-top-card',
      '.jobs-details-top-card',
      '.jobs-details',
      '.job-view-layout',
      '.jobs-box',
      '.jobs-description',
      // Top card variants
      '.jobs-unified-top-card__content',
      '.job-details-jobs-unified-top-card__container',
      // Title variants
      '.job-details-jobs-unified-top-card__job-title',
      '.jobs-unified-top-card__job-title',
      '.jobs-unified-top-card__job-title a',
      '.job-details-jobs-unified-top-card__job-title-link',
      '.t-24.t-bold',
      'h1',
      'h2.t-24',
      // Company variants
      '.job-details-jobs-unified-top-card__company-name',
      '.jobs-unified-top-card__company-name',
      // Primary description
      '.job-details-jobs-unified-top-card__primary-description-container',
      '.jobs-unified-top-card__primary-description',
      // Content areas
      '.jobs-unified-top-card__content--two-pane',
      '.jobs-details__main-content',
      '.jobs-box__html-content',
      // New LinkedIn selectors
      '.job-details-module',
      '.jobs-home-module',
      '[data-test-component="job-details"]'
    ];

    selectorTests.forEach(selector => {
      const el = document.querySelector(selector);
      if (el) {
        const category =
          selector.includes('title') || selector.includes('h1') || selector.includes('h2') ? 'title' :
          selector.includes('company') ? 'company' :
          selector.includes('container') || selector.includes('content') ? 'container' :
          'other';
        analysis[category === 'title' ? 'titleSelectors' :
                 category === 'company' ? 'companySelectors' :
                 category === 'container' ? 'topCardSelectors' : 'detailPanelSelectors'].push({
          selector,
          tagName: el.tagName,
          className: el.className?.substring(0, 100),
          firstChildTag: el.firstElementChild?.tagName || null
        });
      }
    });

    // Check for JobFiltr wrapper
    const wrapper = document.getElementById('jobfiltr-badges-wrapper');
    if (wrapper) {
      const rect = wrapper.getBoundingClientRect();
      analysis.jobfiltrWrapper = {
        found: true,
        position: {
          top: rect.top,
          left: rect.left,
          height: rect.height
        },
        parent: wrapper.parentElement?.className?.substring(0, 100) || null
      };
    }

    // Get first 10 elements inside the detail panel to understand structure
    const detailPanel = document.querySelector('.jobs-unified-top-card, .job-details-jobs-unified-top-card, .jobs-details, .job-view-layout');
    if (detailPanel) {
      const children = detailPanel.children;
      for (let i = 0; i < Math.min(10, children.length); i++) {
        const child = children[i];
        analysis.topElements.push({
          index: i,
          tagName: child.tagName,
          className: child.className?.substring(0, 100),
          id: child.id || null
        });
      }
    }

    // Look for elements that could be good insertion points
    const possibleTargets = document.querySelectorAll('.jobs-unified-top-card > *, .job-details-jobs-unified-top-card > *');
    possibleTargets.forEach((el, i) => {
      if (i < 15) {
        const rect = el.getBoundingClientRect();
        analysis.possibleInsertionPoints.push({
          index: i,
          tagName: el.tagName,
          className: el.className?.substring(0, 80),
          topPosition: rect.top,
          height: rect.height
        });
      }
    });

    return analysis;
  });

  console.log('\n=== DOM ANALYSIS RESULTS ===');
  console.log('\nDetail Panel Selectors Found:');
  domAnalysis.detailPanelSelectors.forEach(s => {
    console.log(`  ✓ ${s.selector} -> <${s.tagName}>`);
  });

  console.log('\nTop Card/Container Selectors Found:');
  domAnalysis.topCardSelectors.forEach(s => {
    console.log(`  ✓ ${s.selector} -> <${s.tagName}>`);
  });

  console.log('\nTitle Selectors Found:');
  domAnalysis.titleSelectors.forEach(s => {
    console.log(`  ✓ ${s.selector} -> <${s.tagName}>`);
  });

  console.log('\nCompany Selectors Found:');
  domAnalysis.companySelectors.forEach(s => {
    console.log(`  ✓ ${s.selector} -> <${s.tagName}>`);
  });

  if (domAnalysis.jobfiltrWrapper) {
    console.log('\nJobFiltr Wrapper Found:');
    console.log(`  Position: top=${domAnalysis.jobfiltrWrapper.position.top}px`);
    console.log(`  Parent: ${domAnalysis.jobfiltrWrapper.parent}`);
  } else {
    console.log('\nJobFiltr Wrapper: NOT FOUND');
  }

  console.log('\nTop Elements in Detail Panel:');
  domAnalysis.topElements.forEach(el => {
    console.log(`  [${el.index}] <${el.tagName}> .${el.className || 'no-class'}`);
  });

  console.log('\nPossible Insertion Points (first 15):');
  domAnalysis.possibleInsertionPoints.forEach(el => {
    console.log(`  [${el.index}] <${el.tagName}> top=${el.topPosition.toFixed(0)}px h=${el.height.toFixed(0)}px`);
    console.log(`      class: ${el.className || 'none'}`);
  });

  // Take screenshot
  await page.screenshot({ path: '/tmp/linkedin-dom-inspection.png', fullPage: false });
  console.log('\nScreenshot saved to /tmp/linkedin-dom-inspection.png');

  console.log('\n' + '='.repeat(60));
  console.log('Keeping browser open for 60 seconds for manual inspection...');
  console.log('Use DevTools (F12) to inspect the DOM structure.');
  await page.waitForTimeout(60000);

  await browser.close();
  console.log('Browser closed.');
})();
