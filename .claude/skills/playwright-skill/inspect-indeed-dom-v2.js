const { chromium } = require('playwright');

const EXTENSION_PATH = 'C:\\Users\\isaia\\OneDrive\\Documents\\2025 Docs\\Claude Copy\\Vibed-Web-Start-1\\chrome-extension';

(async () => {
  console.log('Inspecting Indeed Job Details DOM Structure v2');
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

  // Navigate to Indeed Jobs with a specific search
  console.log('\n1. Navigating to Indeed Jobs...');
  await page.goto('https://www.indeed.com/jobs?q=software+engineer&l=remote', {
    waitUntil: 'domcontentloaded',
    timeout: 30000
  });

  // Wait for page to load
  console.log('Waiting for page load...');
  await page.waitForTimeout(8000);

  // Look for any job cards with more flexible selectors
  console.log('\n2. Finding job cards...');

  const jobCardsInfo = await page.evaluate(() => {
    // Try to find any clickable job elements
    const possibleJobSelectors = [
      '.job_seen_beacon',
      '.jobsearch-ResultsList li',
      '.resultContent',
      'a.jcs-JobTitle',
      '[data-jk]',
      '.jobCard_mainContent',
      '.tapItem',
      '.result',
      'td.resultContent'
    ];

    const results = [];
    for (const selector of possibleJobSelectors) {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        results.push({
          selector,
          count: elements.length,
          firstElement: {
            tagName: elements[0].tagName,
            className: elements[0].className?.substring(0, 100),
            id: elements[0].id || 'none'
          }
        });
      }
    }
    return results;
  });

  console.log('Job card selectors found:');
  jobCardsInfo.forEach(info => {
    console.log(`  ✓ ${info.selector} (${info.count} elements)`);
    console.log(`      First: <${info.firstElement.tagName}> class="${info.firstElement.className}"`);
  });

  // Click on the first job using a flexible approach
  console.log('\n3. Clicking on a job card...');
  try {
    // Try multiple approaches to click a job
    const clickSelectors = [
      '.job_seen_beacon',
      'a.jcs-JobTitle',
      '.tapItem',
      '.resultContent h2 a',
      '[data-jk] h2 a'
    ];

    for (const selector of clickSelectors) {
      const element = await page.$(selector);
      if (element) {
        console.log(`  Clicking: ${selector}`);
        await element.click();
        break;
      }
    }

    // Wait for detail panel to load
    await page.waitForTimeout(5000);
  } catch (e) {
    console.log('  Error clicking job card:', e.message);
  }

  // Now inspect the detail panel DOM
  console.log('\n4. Inspecting detail panel DOM structure...');

  const detailAnalysis = await page.evaluate(() => {
    const analysis = {
      allH1Elements: [],
      allH2Elements: [],
      detailPanelCandidates: [],
      jobTitleCandidates: [],
      companyElements: [],
      descriptionElements: [],
      wrapperInfo: null,
      badgesInfo: [],
      fullDOMSnapshot: []
    };

    // Find all H1 elements (job titles are often H1)
    document.querySelectorAll('h1').forEach((el, i) => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        analysis.allH1Elements.push({
          index: i,
          text: el.textContent?.substring(0, 80),
          className: el.className?.substring(0, 80),
          parentClass: el.parentElement?.className?.substring(0, 50),
          height: Math.round(rect.height),
          top: Math.round(rect.top),
          isMultiLine: rect.height > 40
        });
      }
    });

    // Find all H2 elements
    document.querySelectorAll('h2').forEach((el, i) => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0 && rect.left > 400) { // Right side of page
        analysis.allH2Elements.push({
          index: i,
          text: el.textContent?.substring(0, 80),
          className: el.className?.substring(0, 80),
          height: Math.round(rect.height),
          top: Math.round(rect.top)
        });
      }
    });

    // Look for detail panel containers
    const detailSelectors = [
      '.jobsearch-ViewJobLayout',
      '.jobsearch-JobComponent',
      '#jobDetailsSection',
      '#viewJobSSRRoot',
      '[data-testid="viewJobBody"]',
      '.jobsearch-BodyContainer',
      '#mosaic-jobResults',
      '.jobsearch-RightPane'
    ];

    detailSelectors.forEach(selector => {
      const el = document.querySelector(selector);
      if (el) {
        const rect = el.getBoundingClientRect();
        analysis.detailPanelCandidates.push({
          selector,
          className: el.className?.substring(0, 80),
          width: Math.round(rect.width),
          left: Math.round(rect.left),
          childCount: el.children.length
        });
      }
    });

    // Look for job title in the detail view
    const titleSelectors = [
      '.jobsearch-JobInfoHeader-title',
      '[class*="JobInfoHeader-title"]',
      '[class*="jobTitle"]',
      '[data-testid*="title"]',
      '.icl-u-xs-mb--xs h1',
      '.jobsearch-JobInfoHeader h1'
    ];

    titleSelectors.forEach(selector => {
      const el = document.querySelector(selector);
      if (el) {
        const rect = el.getBoundingClientRect();
        analysis.jobTitleCandidates.push({
          selector,
          text: el.textContent?.substring(0, 80),
          tagName: el.tagName,
          height: Math.round(rect.height),
          isMultiLine: rect.height > 40
        });
      }
    });

    // Check for JobFiltr elements
    const wrapper = document.getElementById('jobfiltr-badges-wrapper');
    if (wrapper) {
      const rect = wrapper.getBoundingClientRect();
      analysis.wrapperInfo = {
        found: true,
        top: Math.round(rect.top),
        left: Math.round(rect.left),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        display: window.getComputedStyle(wrapper).display,
        flexWrap: window.getComputedStyle(wrapper).flexWrap,
        childCount: wrapper.children.length,
        parentClass: wrapper.parentElement?.className?.substring(0, 50)
      };
    }

    // Check for badges
    const ghostBadge = document.querySelector('.jobfiltr-ghost-score');
    const ageBadge = document.querySelector('.jobfiltr-detail-age-badge');

    if (ghostBadge) {
      const rect = ghostBadge.getBoundingClientRect();
      analysis.badgesInfo.push({
        type: 'ghost',
        top: Math.round(rect.top),
        left: Math.round(rect.left),
        width: Math.round(rect.width),
        height: Math.round(rect.height)
      });
    }

    if (ageBadge) {
      const rect = ageBadge.getBoundingClientRect();
      analysis.badgesInfo.push({
        type: 'age',
        top: Math.round(rect.top),
        left: Math.round(rect.left),
        width: Math.round(rect.width),
        height: Math.round(rect.height)
      });
    }

    // Get a snapshot of the right side of the page (detail panel area)
    const rightSideElements = document.querySelectorAll('*');
    rightSideElements.forEach((el, i) => {
      if (i > 500) return; // Limit
      const rect = el.getBoundingClientRect();
      // Only elements on the right side of the page and visible
      if (rect.left > 400 && rect.width > 100 && rect.height > 20 && rect.top < 500) {
        const className = el.className;
        if (typeof className === 'string' && className.includes('job')) {
          analysis.fullDOMSnapshot.push({
            tagName: el.tagName,
            className: className.substring(0, 100),
            top: Math.round(rect.top),
            height: Math.round(rect.height)
          });
        }
      }
    });

    return analysis;
  });

  console.log('\n=== DETAIL PANEL ANALYSIS ===');

  console.log('\nH1 Elements (potential titles):');
  detailAnalysis.allH1Elements.forEach(el => {
    console.log(`  [${el.index}] h=${el.height}px top=${el.top}px multiLine=${el.isMultiLine}`);
    console.log(`      text: "${el.text}"`);
    console.log(`      class: ${el.className}`);
  });

  console.log('\nH2 Elements on right side:');
  detailAnalysis.allH2Elements.forEach(el => {
    console.log(`  [${el.index}] h=${el.height}px top=${el.top}px`);
    console.log(`      text: "${el.text}"`);
  });

  console.log('\nDetail Panel Containers:');
  detailAnalysis.detailPanelCandidates.forEach(el => {
    console.log(`  ✓ ${el.selector}`);
    console.log(`      width=${el.width}px left=${el.left}px children=${el.childCount}`);
  });

  console.log('\nJob Title Candidates:');
  detailAnalysis.jobTitleCandidates.forEach(el => {
    console.log(`  ✓ ${el.selector} <${el.tagName}>`);
    console.log(`      h=${el.height}px multiLine=${el.isMultiLine}`);
    console.log(`      text: "${el.text}"`);
  });

  console.log('\nJobFiltr Wrapper:');
  if (detailAnalysis.wrapperInfo) {
    console.log(`  Found: top=${detailAnalysis.wrapperInfo.top}px h=${detailAnalysis.wrapperInfo.height}px`);
    console.log(`  Display: ${detailAnalysis.wrapperInfo.display}, flexWrap: ${detailAnalysis.wrapperInfo.flexWrap}`);
    console.log(`  Children: ${detailAnalysis.wrapperInfo.childCount}`);
    console.log(`  Parent: ${detailAnalysis.wrapperInfo.parentClass}`);
  } else {
    console.log('  NOT FOUND');
  }

  console.log('\nBadges:');
  detailAnalysis.badgesInfo.forEach(badge => {
    console.log(`  ${badge.type}: top=${badge.top}px left=${badge.left}px w=${badge.width}px h=${badge.height}px`);
  });

  if (detailAnalysis.badgesInfo.length === 2) {
    const ghost = detailAnalysis.badgesInfo.find(b => b.type === 'ghost');
    const age = detailAnalysis.badgesInfo.find(b => b.type === 'age');
    if (ghost && age) {
      const yDiff = Math.abs(ghost.top - age.top);
      console.log(`\n  Layout analysis:`);
      console.log(`    Y difference: ${yDiff}px (${yDiff > 20 ? '⚠ STACKING' : '✓ SIDE BY SIDE'})`);
      console.log(`    Ghost ends at x=${ghost.left + ghost.width}, Age starts at x=${age.left}`);
    }
  }

  console.log('\nDOM elements with "job" in class (right side, top area):');
  detailAnalysis.fullDOMSnapshot.slice(0, 15).forEach(el => {
    console.log(`  <${el.tagName}> top=${el.top}px h=${el.height}px`);
    console.log(`      class: ${el.className}`);
  });

  // Take screenshot
  await page.screenshot({ path: '/tmp/indeed-dom-v2.png', fullPage: false });
  console.log('\nScreenshot saved to /tmp/indeed-dom-v2.png');

  console.log('\n' + '='.repeat(60));
  console.log('Keeping browser open for 45 seconds for manual inspection...');
  await page.waitForTimeout(45000);

  await browser.close();
  console.log('Browser closed.');
})();
