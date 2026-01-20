// Test JobFiltr staffing badges and refresh behavior on LinkedIn
const { chromium } = require('playwright');
const path = require('path');

const TARGET_URL = 'https://www.linkedin.com/jobs/search/?keywords=software%20engineer&location=United%20States';
const EXTENSION_PATH = path.resolve(__dirname, '../../..', 'chrome-extension');

(async () => {
  console.log('=== JobFiltr Staffing Badge & Refresh Test ===\n');
  console.log('Extension path:', EXTENSION_PATH);

  // Launch Chrome with extension
  const browser = await chromium.launchPersistentContext(
    '', // Empty string = temporary profile
    {
      headless: false,
      args: [
        `--disable-extensions-except=${EXTENSION_PATH}`,
        `--load-extension=${EXTENSION_PATH}`,
        '--no-first-run',
        '--disable-default-apps',
      ],
      viewport: { width: 1400, height: 900 },
      slowMo: 50
    }
  );

  const page = await browser.newPage();

  // Track console logs for extension activity
  const extensionLogs = [];
  page.on('console', msg => {
    const text = msg.text();
    extensionLogs.push({ type: msg.type(), text, time: Date.now() });
    if (text.includes('JobFiltr') || text.includes('staffing') || text.includes('Staffing')) {
      console.log(`[EXT] ${text.substring(0, 150)}`);
    }
  });

  // Track for flicker detection
  let domMutationCount = 0;
  let lastMutationTime = Date.now();

  try {
    console.log('\n1. Navigating to LinkedIn Jobs...');
    await page.goto(TARGET_URL, {
      waitUntil: 'domcontentloaded',
      timeout: 45000
    });

    console.log('Page loaded. Title:', await page.title());

    // Wait for initial page load
    await page.waitForTimeout(3000);

    // Check if login is required
    const isLoginPage = await page.locator('input[name="session_key"], input[id="username"], button[data-litms-control-urn*="sign-in"]').count() > 0;
    if (isLoginPage) {
      console.log('\n=== LOGIN REQUIRED ===');
      console.log('LinkedIn requires authentication.');
      console.log('Please log in manually in the browser window...');
      console.log('Waiting 60 seconds for manual login...\n');
      await page.waitForTimeout(60000);
    }

    // Wait for job cards to load
    console.log('\n2. Waiting for job cards to load...');
    await page.waitForSelector('.scaffold-layout__list-item, .jobs-search-results-list, [data-occludable-job-id]', { timeout: 30000 }).catch(() => {
      console.log('Job card selectors not found, continuing anyway...');
    });

    await page.waitForTimeout(3000);

    // Take initial screenshot
    await page.screenshot({ path: 'C:\\tmp\\linkedin-initial.png', fullPage: false });
    console.log('Initial screenshot: C:\\tmp\\linkedin-initial.png');

    // Set up mutation observer to track DOM changes (flicker detection)
    await page.evaluate(() => {
      window.__jobfiltrMutationCount = 0;
      window.__jobfiltrMutationTimes = [];
      const observer = new MutationObserver((mutations) => {
        mutations.forEach(m => {
          if (m.target.closest && (
            m.target.closest('.scaffold-layout__list-item') ||
            m.target.closest('.jobs-search-results-list') ||
            m.target.closest('[data-occludable-job-id]')
          )) {
            window.__jobfiltrMutationCount++;
            window.__jobfiltrMutationTimes.push(Date.now());
          }
        });
      });
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style', 'class']
      });
    });

    console.log('\n3. Analyzing extension behavior for 10 seconds...');
    const startTime = Date.now();

    // Wait 10 seconds and monitor
    await page.waitForTimeout(10000);

    // Get mutation data
    const mutationData = await page.evaluate(() => ({
      count: window.__jobfiltrMutationCount,
      times: window.__jobfiltrMutationTimes.slice(-50) // Last 50 mutations
    }));

    console.log(`\n=== FLICKER ANALYSIS ===`);
    console.log(`DOM mutations in job list area: ${mutationData.count}`);

    // Calculate mutation frequency (flickering would be high-frequency mutations)
    if (mutationData.times.length > 2) {
      const intervals = [];
      for (let i = 1; i < mutationData.times.length; i++) {
        intervals.push(mutationData.times[i] - mutationData.times[i - 1]);
      }
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      console.log(`Average mutation interval: ${avgInterval.toFixed(0)}ms`);

      // Check for 2-second pattern (the reported flicker issue)
      const twoSecIntervals = intervals.filter(i => i >= 1800 && i <= 2200).length;
      if (twoSecIntervals > 3) {
        console.log(`WARNING: Detected ${twoSecIntervals} mutations at ~2 second intervals (potential flicker)`);
      } else {
        console.log(`OK: No 2-second flicker pattern detected`);
      }
    }

    // Take screenshot after monitoring
    await page.screenshot({ path: 'C:\\tmp\\linkedin-after-monitor.png', fullPage: false });
    console.log('After monitoring screenshot: C:\\tmp\\linkedin-after-monitor.png');

    // Now analyze badges
    console.log('\n4. Analyzing JobFiltr badges...');
    const analysis = await page.evaluate(() => {
      const results = {
        totalJobCards: 0,
        staffingBadges: [],
        ageBadges: [],
        dimmedCards: 0,
        hiddenCards: 0,
        jobfiltrElements: [],
        companyNames: []
      };

      // Count job cards
      const cards = document.querySelectorAll('.scaffold-layout__list-item, [data-occludable-job-id], .job-card-container');
      results.totalJobCards = cards.length;

      cards.forEach((card, idx) => {
        // Check for staffing badge
        const staffingBadge = card.querySelector('.jobfiltr-staffing-badge');
        if (staffingBadge) {
          results.staffingBadges.push({
            index: idx,
            text: staffingBadge.textContent?.trim(),
            tier: staffingBadge.dataset?.staffingTier,
            confidence: staffingBadge.dataset?.staffingConfidence
          });
        }

        // Check for age badge
        const ageBadge = card.querySelector('.jobfiltr-age-badge');
        if (ageBadge) {
          results.ageBadges.push({
            index: idx,
            text: ageBadge.textContent?.trim()
          });
        }

        // Check for dimmed cards
        if (card.classList.contains('jobfiltr-staffing-dimmed') || card.style.opacity === '0.5') {
          results.dimmedCards++;
        }

        // Check for hidden cards
        if (card.style.display === 'none' || card.dataset.jobfiltrHidden) {
          results.hiddenCards++;
        }

        // Extract company name for analysis
        const companyEl = card.querySelector('.job-card-container__company-name, .artdeco-entity-lockup__subtitle');
        if (companyEl && idx < 15) {
          results.companyNames.push(companyEl.textContent?.trim());
        }
      });

      // Find all JobFiltr elements
      document.querySelectorAll('[class*="jobfiltr"]').forEach(el => {
        results.jobfiltrElements.push({
          class: el.className,
          text: el.textContent?.trim().substring(0, 50)
        });
      });

      return results;
    });

    console.log('\n=== BADGE ANALYSIS ===');
    console.log(`Total job cards found: ${analysis.totalJobCards}`);
    console.log(`Staffing badges: ${analysis.staffingBadges.length}`);
    console.log(`Age badges: ${analysis.ageBadges.length}`);
    console.log(`Dimmed cards: ${analysis.dimmedCards}`);
    console.log(`Hidden cards: ${analysis.hiddenCards}`);
    console.log(`All JobFiltr elements: ${analysis.jobfiltrElements.length}`);

    if (analysis.staffingBadges.length > 0) {
      console.log('\nStaffing badges found:');
      analysis.staffingBadges.slice(0, 5).forEach(b => {
        console.log(`  Card ${b.index}: "${b.text}" (tier: ${b.tier}, conf: ${b.confidence})`);
      });
    } else {
      console.log('\nNo staffing badges found. Checking company names...');
      console.log('Company names in first 15 cards:');
      analysis.companyNames.forEach((name, i) => {
        console.log(`  ${i + 1}. ${name}`);
      });
    }

    if (analysis.ageBadges.length > 0) {
      console.log('\nAge badges:');
      analysis.ageBadges.slice(0, 5).forEach(b => {
        console.log(`  Card ${b.index}: "${b.text}"`);
      });
    }

    // Check extension console logs
    console.log('\n=== EXTENSION LOGS ===');
    const jobfiltrLogs = extensionLogs.filter(l =>
      l.text.includes('JobFiltr') || l.text.includes('staffing') || l.text.includes('filter')
    );
    if (jobfiltrLogs.length > 0) {
      console.log(`Found ${jobfiltrLogs.length} extension logs:`);
      jobfiltrLogs.slice(-10).forEach(l => console.log(`  [${l.type}] ${l.text.substring(0, 100)}`));
    } else {
      console.log('No JobFiltr logs captured. Extension may not be running.');
    }

    // Final screenshot
    await page.screenshot({ path: 'C:\\tmp\\linkedin-final.png', fullPage: false });
    console.log('\nFinal screenshot: C:\\tmp\\linkedin-final.png');

    // Summary
    console.log('\n=== TEST SUMMARY ===');
    console.log(`1. Extension loaded: ${extensionLogs.some(l => l.text.includes('JobFiltr')) ? 'YES' : 'UNKNOWN'}`);
    console.log(`2. Staffing badges visible: ${analysis.staffingBadges.length > 0 ? 'YES' : 'NO'}`);
    console.log(`3. Visible flicker: ${mutationData.count > 50 ? 'POTENTIAL ISSUE' : 'ACCEPTABLE'}`);

    console.log('\nKeeping browser open for 30 seconds for manual inspection...');
    await page.waitForTimeout(30000);

  } catch (error) {
    console.error('\nError:', error.message);
    await page.screenshot({ path: 'C:\\tmp\\linkedin-error.png' });
    console.log('Error screenshot: C:\\tmp\\linkedin-error.png');
  } finally {
    await browser.close();
  }
})();
