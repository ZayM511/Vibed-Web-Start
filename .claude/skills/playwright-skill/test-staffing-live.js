// Connect to user's Chrome and test staffing badges on LinkedIn
// Requires Chrome to be running with --remote-debugging-port=9222
const { chromium } = require('playwright');

(async () => {
  console.log('=== JobFiltr Live Staffing Test ===\n');
  console.log('Connecting to Chrome on port 9222...\n');

  try {
    const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
    console.log('Connected to Chrome!\n');

    const contexts = browser.contexts();
    if (contexts.length === 0) {
      console.log('No browser contexts found.');
      return;
    }

    const context = contexts[0];
    const pages = context.pages();

    // Find or create LinkedIn Jobs page
    let page = pages.find(p => p.url().includes('linkedin.com/jobs'));

    if (!page) {
      console.log('No LinkedIn Jobs page found. Opening one...');
      page = await context.newPage();
      await page.goto('https://www.linkedin.com/jobs/search/?keywords=software%20engineer&location=United%20States', {
        waitUntil: 'domcontentloaded',
        timeout: 45000
      });
    }

    console.log('LinkedIn page URL:', page.url());
    console.log('Title:', await page.title());

    // Listen for console logs
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('JobFiltr') || text.includes('staffing') || text.includes('Staffing')) {
        console.log(`[EXT] ${text.substring(0, 120)}`);
      }
    });

    // Wait for page to settle
    console.log('\nWaiting 5 seconds for extension to process...\n');
    await page.waitForTimeout(5000);

    // Analyze current state
    const analysis = await page.evaluate(() => {
      const results = {
        isLoggedIn: false,
        jobCards: 0,
        staffingBadges: [],
        ageBadges: [],
        dimmedCards: 0,
        hiddenCards: 0,
        companyNames: [],
        filterSettings: null
      };

      // Check if logged in
      results.isLoggedIn = !!(
        document.querySelector('.global-nav__me-photo') ||
        document.querySelector('.feed-identity-module') ||
        document.querySelector('.profile__identity')
      );

      // Get filter settings from window if available
      if (window.filterSettings) {
        results.filterSettings = {
          hideStaffing: window.filterSettings.hideStaffing,
          staffingDisplayMode: window.filterSettings.staffingDisplayMode
        };
      }

      // Find all job cards
      const cardSelectors = [
        '.scaffold-layout__list-item',
        '[data-occludable-job-id]',
        '.job-card-container',
        '.jobs-search-results__list-item'
      ];

      const cardsSet = new Set();
      cardSelectors.forEach(sel => {
        document.querySelectorAll(sel).forEach(c => cardsSet.add(c));
      });

      results.jobCards = cardsSet.size;

      cardsSet.forEach((card, idx) => {
        // Get company name
        const companyEl = card.querySelector('.job-card-container__company-name, .artdeco-entity-lockup__subtitle, .base-search-card__subtitle');
        const companyName = companyEl?.textContent?.trim();
        if (companyName && results.companyNames.length < 20) {
          results.companyNames.push(companyName);
        }

        // Check for staffing badge
        const staffingBadge = card.querySelector('.jobfiltr-staffing-badge');
        if (staffingBadge) {
          results.staffingBadges.push({
            company: companyName,
            text: staffingBadge.textContent?.trim(),
            tier: staffingBadge.dataset?.staffingTier
          });
        }

        // Check for age badge
        const ageBadge = card.querySelector('.jobfiltr-age-badge');
        if (ageBadge) {
          results.ageBadges.push(ageBadge.textContent?.trim());
        }

        // Check for dimmed
        if (card.classList.contains('jobfiltr-staffing-dimmed') || card.style.opacity === '0.5') {
          results.dimmedCards++;
        }

        // Check for hidden
        if (card.style.display === 'none' || card.dataset.jobfiltrHidden === 'true') {
          results.hiddenCards++;
        }
      });

      return results;
    });

    console.log('=== ANALYSIS RESULTS ===\n');
    console.log(`Logged in: ${analysis.isLoggedIn ? 'YES' : 'NO'}`);
    console.log(`Job cards found: ${analysis.jobCards}`);
    console.log(`Hidden cards: ${analysis.hiddenCards}`);
    console.log(`Dimmed cards: ${analysis.dimmedCards}`);
    console.log(`Staffing badges: ${analysis.staffingBadges.length}`);
    console.log(`Age badges: ${analysis.ageBadges.length}`);

    if (analysis.filterSettings) {
      console.log(`\nFilter settings detected:`);
      console.log(`  - hideStaffing: ${analysis.filterSettings.hideStaffing}`);
      console.log(`  - staffingDisplayMode: ${analysis.filterSettings.staffingDisplayMode}`);
    }

    if (analysis.staffingBadges.length > 0) {
      console.log('\nStaffing badges found:');
      analysis.staffingBadges.forEach(b => {
        console.log(`  - ${b.company}: "${b.text}" (tier: ${b.tier})`);
      });
    }

    if (analysis.companyNames.length > 0) {
      console.log('\nFirst 20 company names:');
      analysis.companyNames.forEach((name, i) => {
        console.log(`  ${i + 1}. ${name}`);
      });
    }

    // Test: Manually check for known staffing companies
    console.log('\n=== STAFFING DETECTION TEST ===');
    const knownStaffingPatterns = ['randstad', 'adecco', 'robert half', 'kelly', 'manpower', 'teksystems', 'insight global', 'apex', 'cybercoders', 'kforce'];
    const detectedStaffing = analysis.companyNames.filter(name => {
      const lower = name.toLowerCase();
      return knownStaffingPatterns.some(pattern => lower.includes(pattern));
    });

    if (detectedStaffing.length > 0) {
      console.log('Known staffing companies in results:');
      detectedStaffing.forEach(name => console.log(`  - ${name}`));

      if (analysis.staffingBadges.length === 0) {
        console.log('\nWARNING: Staffing companies detected but no badges shown!');
        console.log('Check that "Hide Staffing Firms" is enabled in the popup');
        console.log('and display mode is set to "Show with badge" or "Dim"');
      }
    } else {
      console.log('No known staffing companies detected in visible results');
    }

    // Take screenshot
    await page.screenshot({ path: 'C:\\tmp\\linkedin-staffing-test.png' });
    console.log('\nScreenshot saved to C:\\tmp\\linkedin-staffing-test.png');

    console.log('\nTest complete. Your Chrome remains open.');
    await browser.close();

  } catch (error) {
    if (error.message.includes('ECONNREFUSED')) {
      console.log('ERROR: Cannot connect to Chrome.');
      console.log('\nTo fix this:');
      console.log('1. Close ALL Chrome windows');
      console.log('2. Open Command Prompt and run:');
      console.log('   "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" --remote-debugging-port=9222');
      console.log('3. Log in to LinkedIn in that Chrome window');
      console.log('4. Navigate to LinkedIn Jobs');
      console.log('5. Run this test again');
    } else {
      console.error('Error:', error.message);
    }
  }
})();
