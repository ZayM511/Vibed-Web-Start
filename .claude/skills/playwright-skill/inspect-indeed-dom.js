const { chromium } = require('playwright');

const EXTENSION_PATH = 'C:\\Users\\isaia\\OneDrive\\Documents\\2025 Docs\\Claude Copy\\Vibed-Web-Start-1\\chrome-extension';

(async () => {
  console.log('Inspecting Indeed Job Details DOM Structure');
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

  // Navigate to Indeed Jobs
  console.log('\n1. Navigating to Indeed Jobs...');
  await page.goto('https://www.indeed.com/jobs?q=senior+software+engineer&l=');
  await page.waitForTimeout(5000);

  console.log('\n2. Waiting for job cards to load...');
  try {
    await page.waitForSelector('.job_seen_beacon, .jobsearch-ResultsList, .resultContent', { timeout: 15000 });
    await page.waitForTimeout(3000);
  } catch (e) {
    console.log('Could not find job list, trying alternate selectors...');
    await page.waitForTimeout(3000);
  }

  // Click on a job card to load the detail panel
  console.log('\n3. Clicking on a job card to load details...');
  try {
    const jobCard = await page.$('.job_seen_beacon, .resultContent, .jobsearch-ResultsList li');
    if (jobCard) {
      await jobCard.click();
      await page.waitForTimeout(4000);
    }
  } catch (e) {
    console.log('Could not click job card:', e.message);
  }

  // Inspect the DOM structure
  console.log('\n4. Inspecting job detail panel DOM structure...');

  const domAnalysis = await page.evaluate(() => {
    const analysis = {
      titleElement: null,
      titleInfo: null,
      subtitleElement: null,
      headerStructure: [],
      insertionTargets: [],
      wrapperInfo: null,
      potentialIssues: []
    };

    // Check for title element
    const titleSelectors = [
      '.jobsearch-JobInfoHeader-title',
      'h1.jobsearch-JobInfoHeader-title',
      '[data-testid="jobsearch-JobInfoHeader-title"]',
      '.jobsearch-JobInfoHeader-title-container h1'
    ];

    for (const selector of titleSelectors) {
      const el = document.querySelector(selector);
      if (el) {
        const rect = el.getBoundingClientRect();
        const styles = window.getComputedStyle(el);
        analysis.titleElement = {
          selector,
          tagName: el.tagName,
          className: el.className?.substring(0, 100),
          text: el.textContent?.substring(0, 100),
          height: rect.height,
          lineHeight: styles.lineHeight,
          fontSize: styles.fontSize,
          display: styles.display,
          isMultiLine: rect.height > parseFloat(styles.lineHeight) * 1.5
        };
        break;
      }
    }

    // Check for title container
    const titleContainer = document.querySelector('.jobsearch-JobInfoHeader-title-container');
    if (titleContainer) {
      const rect = titleContainer.getBoundingClientRect();
      analysis.titleInfo = {
        selector: '.jobsearch-JobInfoHeader-title-container',
        height: rect.height,
        children: Array.from(titleContainer.children).map(c => ({
          tagName: c.tagName,
          className: c.className?.substring(0, 50)
        }))
      };
    }

    // Check for subtitle element
    const subtitleSelectors = [
      '.jobsearch-JobInfoHeader-subtitle',
      '[data-testid="jobsearch-JobInfoHeader-subtitle"]',
      '.jobsearch-InlineCompanyRating'
    ];

    for (const selector of subtitleSelectors) {
      const el = document.querySelector(selector);
      if (el) {
        const rect = el.getBoundingClientRect();
        analysis.subtitleElement = {
          selector,
          tagName: el.tagName,
          className: el.className?.substring(0, 100),
          height: rect.height,
          nextSibling: el.nextElementSibling?.className?.substring(0, 50) || 'none'
        };
        break;
      }
    }

    // Check header structure
    const header = document.querySelector('.jobsearch-JobInfoHeader, .jobsearch-ViewJobLayout-header');
    if (header) {
      const children = header.children;
      for (let i = 0; i < Math.min(10, children.length); i++) {
        const child = children[i];
        const rect = child.getBoundingClientRect();
        analysis.headerStructure.push({
          index: i,
          tagName: child.tagName,
          className: child.className?.substring(0, 80),
          height: rect.height,
          top: rect.top
        });
      }
    }

    // Check all potential insertion targets
    const insertionSelectors = [
      '.jobsearch-JobInfoHeader-title-container',
      '.jobsearch-JobInfoHeader-subtitle',
      '[data-testid="jobsearch-JobInfoHeader-subtitle"]',
      '.jobsearch-InlineCompanyRating',
      '.jobsearch-JobInfoHeader',
      'h1.jobsearch-JobInfoHeader-title',
      '.jobsearch-JobInfoHeader-title',
      '.jobsearch-CompanyInfoContainer',
      '.jobsearch-ViewJobLayout-jobDisplay',
      '.jobsearch-JobComponent-description',
      '#jobDescriptionText'
    ];

    insertionSelectors.forEach(selector => {
      const el = document.querySelector(selector);
      if (el) {
        const rect = el.getBoundingClientRect();
        analysis.insertionTargets.push({
          selector,
          exists: true,
          tagName: el.tagName,
          top: Math.round(rect.top),
          height: Math.round(rect.height),
          nextSiblingClass: el.nextElementSibling?.className?.substring(0, 50) || 'none'
        });
      } else {
        analysis.insertionTargets.push({
          selector,
          exists: false
        });
      }
    });

    // Check for JobFiltr wrapper
    const wrapper = document.getElementById('jobfiltr-badges-wrapper');
    if (wrapper) {
      const rect = wrapper.getBoundingClientRect();
      const parent = wrapper.parentElement;
      const prevSibling = wrapper.previousElementSibling;
      analysis.wrapperInfo = {
        found: true,
        top: Math.round(rect.top),
        height: Math.round(rect.height),
        parentClass: parent?.className?.substring(0, 50) || 'none',
        prevSiblingClass: prevSibling?.className?.substring(0, 50) || 'none',
        childCount: wrapper.children.length
      };
    } else {
      analysis.wrapperInfo = { found: false };
    }

    // Check for potential issues
    const ghostBadge = document.querySelector('.jobfiltr-ghost-score');
    const ageBadge = document.querySelector('.jobfiltr-detail-age-badge');

    if (ghostBadge && ageBadge) {
      const ghostRect = ghostBadge.getBoundingClientRect();
      const ageRect = ageBadge.getBoundingClientRect();

      // Check if they're stacking (similar Y position) or overlapping
      const yDiff = Math.abs(ghostRect.top - ageRect.top);
      const xDiff = Math.abs(ghostRect.left - ageRect.left);

      if (yDiff > 20) {
        analysis.potentialIssues.push({
          issue: 'Badges are stacking vertically',
          ghostTop: ghostRect.top,
          ageTop: ageRect.top,
          yDiff
        });
      }

      if (ghostRect.right > ageRect.left && ghostRect.left < ageRect.right &&
          ghostRect.bottom > ageRect.top && ghostRect.top < ageRect.bottom) {
        analysis.potentialIssues.push({
          issue: 'Badges are overlapping',
          ghostRect: { left: ghostRect.left, right: ghostRect.right },
          ageRect: { left: ageRect.left, right: ageRect.right }
        });
      }
    }

    return analysis;
  });

  console.log('\n=== DOM ANALYSIS RESULTS ===');

  console.log('\nTitle Element:');
  if (domAnalysis.titleElement) {
    console.log(`  Selector: ${domAnalysis.titleElement.selector}`);
    console.log(`  Height: ${domAnalysis.titleElement.height}px`);
    console.log(`  Line Height: ${domAnalysis.titleElement.lineHeight}`);
    console.log(`  Font Size: ${domAnalysis.titleElement.fontSize}`);
    console.log(`  Multi-line: ${domAnalysis.titleElement.isMultiLine}`);
    console.log(`  Text: ${domAnalysis.titleElement.text}`);
  } else {
    console.log('  NOT FOUND');
  }

  console.log('\nTitle Container:');
  if (domAnalysis.titleInfo) {
    console.log(`  Height: ${domAnalysis.titleInfo.height}px`);
    console.log(`  Children: ${JSON.stringify(domAnalysis.titleInfo.children)}`);
  } else {
    console.log('  NOT FOUND');
  }

  console.log('\nSubtitle Element:');
  if (domAnalysis.subtitleElement) {
    console.log(`  Selector: ${domAnalysis.subtitleElement.selector}`);
    console.log(`  Height: ${domAnalysis.subtitleElement.height}px`);
    console.log(`  Next Sibling: ${domAnalysis.subtitleElement.nextSibling}`);
  } else {
    console.log('  NOT FOUND');
  }

  console.log('\nHeader Structure:');
  domAnalysis.headerStructure.forEach(el => {
    console.log(`  [${el.index}] <${el.tagName}> h=${el.height}px top=${el.top}px`);
    console.log(`      class: ${el.className}`);
  });

  console.log('\nInsertion Targets:');
  domAnalysis.insertionTargets.forEach(t => {
    if (t.exists) {
      console.log(`  ✓ ${t.selector}`);
      console.log(`      <${t.tagName}> top=${t.top}px h=${t.height}px`);
      console.log(`      nextSibling: ${t.nextSiblingClass}`);
    } else {
      console.log(`  ✗ ${t.selector} - NOT FOUND`);
    }
  });

  console.log('\nJobFiltr Wrapper:');
  if (domAnalysis.wrapperInfo.found) {
    console.log(`  Found at top=${domAnalysis.wrapperInfo.top}px, h=${domAnalysis.wrapperInfo.height}px`);
    console.log(`  Parent: ${domAnalysis.wrapperInfo.parentClass}`);
    console.log(`  Previous Sibling: ${domAnalysis.wrapperInfo.prevSiblingClass}`);
    console.log(`  Child Count: ${domAnalysis.wrapperInfo.childCount}`);
  } else {
    console.log('  NOT FOUND (extension may not have loaded yet)');
  }

  console.log('\nPotential Issues:');
  if (domAnalysis.potentialIssues.length > 0) {
    domAnalysis.potentialIssues.forEach(issue => {
      console.log(`  ⚠ ${issue.issue}`);
      console.log(`      Details: ${JSON.stringify(issue)}`);
    });
  } else {
    console.log('  None detected');
  }

  // Take screenshot
  await page.screenshot({ path: '/tmp/indeed-dom-inspection.png', fullPage: false });
  console.log('\nScreenshot saved to /tmp/indeed-dom-inspection.png');

  console.log('\n' + '='.repeat(60));
  console.log('Keeping browser open for 30 seconds for manual inspection...');
  console.log('Use DevTools (F12) to inspect the DOM structure.');
  await page.waitForTimeout(30000);

  await browser.close();
  console.log('Browser closed.');
})();
