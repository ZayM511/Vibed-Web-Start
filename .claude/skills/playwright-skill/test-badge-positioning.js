// Test Badge Positioning on Indeed Detail Page
const { chromium } = require('playwright');

(async () => {
  console.log('=== Indeed Badge Positioning Test ===\n');
  console.log('Connecting to Chrome on port 9222...\n');

  try {
    const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
    console.log('Connected to Chrome!\n');

    const contexts = browser.contexts();
    const context = contexts[0];
    const pages = context.pages();

    // Find Indeed page
    let indeedPage = pages.find(p => p.url().includes('indeed.com'));

    if (!indeedPage) {
      console.log('No Indeed page found. Opening one...\n');
      indeedPage = await context.newPage();
      await indeedPage.goto('https://www.indeed.com/jobs?q=software+engineer&l=Remote', {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });
      await indeedPage.waitForTimeout(3000);
    }

    console.log('URL:', indeedPage.url());
    console.log('Title:', await indeedPage.title());

    // Wait for extension to process
    console.log('\nWaiting 5 seconds for extension to process...\n');
    await indeedPage.waitForTimeout(5000);

    // Click on the first job to see detail panel
    const jobCardSelectors = [
      '.job_seen_beacon',
      '[data-jk]',
      '.jobsearch-ResultsList li'
    ];

    let clicked = false;
    for (const selector of jobCardSelectors) {
      const jobCard = await indeedPage.$(selector);
      if (jobCard) {
        await jobCard.click();
        clicked = true;
        console.log(`Clicked job card using: ${selector}`);
        break;
      }
    }

    if (!clicked) {
      console.log('Could not find job card to click');
    }

    // Wait for detail panel to load
    await indeedPage.waitForTimeout(3000);

    // Analyze badge positioning
    const badgeAnalysis = await indeedPage.evaluate(() => {
      const results = {
        jobTitle: null,
        badgesContainer: null,
        ghostBadge: null,
        ageBadge: null,
        positioning: {
          containerUnderTitle: false,
          ghostOnLeft: false,
          ageOnRight: false,
          sameSize: false
        }
      };

      // Find job title
      const titleSelectors = [
        'h1.jobsearch-JobInfoHeader-title',
        '[data-testid="jobsearch-JobInfoHeader-title"]',
        '.jobsearch-JobInfoHeader-title'
      ];

      for (const sel of titleSelectors) {
        const title = document.querySelector(sel);
        if (title) {
          results.jobTitle = {
            selector: sel,
            text: title.textContent?.trim().substring(0, 50),
            rect: title.getBoundingClientRect()
          };
          break;
        }
      }

      // Find badges container
      const container = document.querySelector('.jobfiltr-badges-container');
      if (container) {
        results.badgesContainer = {
          exists: true,
          rect: container.getBoundingClientRect(),
          childCount: container.children.length,
          display: window.getComputedStyle(container).display,
          gap: window.getComputedStyle(container).gap
        };

        // Check if container is under title
        if (results.jobTitle) {
          const titleBottom = results.jobTitle.rect.bottom;
          const containerTop = results.badgesContainer.rect.top;
          results.positioning.containerUnderTitle = containerTop >= titleBottom - 20; // 20px tolerance
        }
      }

      // Find ghost badge
      const ghostBadge = document.querySelector('.jobfiltr-ghost-score, .jobfiltr-ghost-badge-container');
      if (ghostBadge) {
        const rect = ghostBadge.getBoundingClientRect();
        results.ghostBadge = {
          exists: true,
          rect: rect,
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          text: ghostBadge.textContent?.substring(0, 50)
        };
      }

      // Find age badge
      const ageBadge = document.querySelector('.jobfiltr-detail-age-badge');
      if (ageBadge) {
        const rect = ageBadge.getBoundingClientRect();
        results.ageBadge = {
          exists: true,
          rect: rect,
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          text: ageBadge.textContent?.substring(0, 50)
        };
      }

      // Check positioning: ghost on left, age on right
      if (results.ghostBadge && results.ageBadge) {
        results.positioning.ghostOnLeft = results.ghostBadge.rect.left < results.ageBadge.rect.left;
        results.positioning.ageOnRight = results.ageBadge.rect.left > results.ghostBadge.rect.left;

        // Check same size (within 20px tolerance)
        const widthDiff = Math.abs(results.ghostBadge.width - results.ageBadge.width);
        const heightDiff = Math.abs(results.ghostBadge.height - results.ageBadge.height);
        results.positioning.sameSize = heightDiff <= 20; // Height should be similar
      }

      return results;
    });

    // Print results
    console.log('='.repeat(60));
    console.log('BADGE POSITIONING ANALYSIS');
    console.log('='.repeat(60) + '\n');

    // Job Title
    console.log('JOB TITLE:');
    if (badgeAnalysis.jobTitle) {
      console.log(`  Found: ${badgeAnalysis.jobTitle.selector}`);
      console.log(`  Text: "${badgeAnalysis.jobTitle.text}..."`);
      console.log(`  Position: top=${Math.round(badgeAnalysis.jobTitle.rect.top)}, bottom=${Math.round(badgeAnalysis.jobTitle.rect.bottom)}`);
    } else {
      console.log('  NOT FOUND');
    }

    // Badges Container
    console.log('\nBADGES CONTAINER:');
    if (badgeAnalysis.badgesContainer) {
      console.log(`  Exists: YES`);
      console.log(`  Display: ${badgeAnalysis.badgesContainer.display}`);
      console.log(`  Gap: ${badgeAnalysis.badgesContainer.gap}`);
      console.log(`  Child count: ${badgeAnalysis.badgesContainer.childCount}`);
      console.log(`  Position: top=${Math.round(badgeAnalysis.badgesContainer.rect.top)}`);
    } else {
      console.log('  NOT FOUND');
    }

    // Ghost Badge
    console.log('\nGHOST JOB ANALYSIS BADGE:');
    if (badgeAnalysis.ghostBadge) {
      console.log(`  Exists: YES`);
      console.log(`  Size: ${badgeAnalysis.ghostBadge.width}x${badgeAnalysis.ghostBadge.height}px`);
      console.log(`  Left position: ${Math.round(badgeAnalysis.ghostBadge.rect.left)}px`);
      console.log(`  Text: "${badgeAnalysis.ghostBadge.text}..."`);
    } else {
      console.log('  NOT FOUND');
    }

    // Age Badge
    console.log('\nJOB AGE DISPLAY BADGE:');
    if (badgeAnalysis.ageBadge) {
      console.log(`  Exists: YES`);
      console.log(`  Size: ${badgeAnalysis.ageBadge.width}x${badgeAnalysis.ageBadge.height}px`);
      console.log(`  Left position: ${Math.round(badgeAnalysis.ageBadge.rect.left)}px`);
      console.log(`  Text: "${badgeAnalysis.ageBadge.text}..."`);
    } else {
      console.log('  NOT FOUND');
    }

    // Positioning Results
    console.log('\n' + '='.repeat(60));
    console.log('POSITIONING VERIFICATION');
    console.log('='.repeat(60) + '\n');

    const pos = badgeAnalysis.positioning;
    console.log(`  Container under title: ${pos.containerUnderTitle ? '✅ YES' : '❌ NO'}`);
    console.log(`  Ghost badge on LEFT: ${pos.ghostOnLeft ? '✅ YES' : '❌ NO'}`);
    console.log(`  Age badge on RIGHT: ${pos.ageOnRight ? '✅ YES' : '❌ NO'}`);
    console.log(`  Same height (within 20px): ${pos.sameSize ? '✅ YES' : '❌ NO'}`);

    // Overall status
    const allPassed = pos.containerUnderTitle && pos.ghostOnLeft && pos.ageOnRight;
    console.log(`\n  OVERALL: ${allPassed ? '✅ ALL POSITIONING CORRECT!' : '❌ SOME ISSUES DETECTED'}`);

    // Screenshot
    await indeedPage.screenshot({
      path: 'C:\\Users\\isaia\\OneDrive\\Documents\\2025 Docs\\Claude Copy\\Vibed-Web-Start-1\\.claude\\skills\\playwright-skill\\badge-positioning-test.png',
      fullPage: false
    });
    console.log('\nScreenshot saved: badge-positioning-test.png');

    console.log('\nAnalysis complete!');
    await browser.close();

  } catch (error) {
    console.error('Error:', error.message);
    if (error.message.includes('ECONNREFUSED')) {
      console.log('\nChrome debug mode not running. Start Chrome with --remote-debugging-port=9222');
    }
  }
})();
