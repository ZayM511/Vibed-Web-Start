// Test JobFiltr extension on LinkedIn with extension loaded
const { chromium } = require('playwright');
const path = require('path');

const EXTENSION_PATH = path.resolve(__dirname, '../../../chrome-extension');
const TARGET_URL = 'https://www.linkedin.com/jobs/search/?keywords=software%20engineer';

(async () => {
  console.log('Launching Chrome with JobFiltr extension...');
  console.log('Extension path:', EXTENSION_PATH);

  try {
    // Launch browser with extension
    const context = await chromium.launchPersistentContext('', {
      headless: false,
      channel: 'chrome',
      args: [
        `--disable-extensions-except=${EXTENSION_PATH}`,
        `--load-extension=${EXTENSION_PATH}`,
        '--start-maximized',
        '--disable-blink-features=AutomationControlled'
      ],
      viewport: { width: 1920, height: 1080 },
      ignoreDefaultArgs: ['--enable-automation']
    });

    const page = context.pages()[0] || await context.newPage();

    // Collect console messages from the page
    const consoleLogs = [];
    page.on('console', msg => {
      const text = msg.text();
      consoleLogs.push({ type: msg.type(), text });
      if (text.includes('JobFiltr') || text.includes('[LinkedIn') || text.includes('[Job Age]')) {
        console.log(`[PAGE ${msg.type()}] ${text}`);
      }
    });

    console.log('\nNavigating to LinkedIn Jobs...');
    await page.goto(TARGET_URL, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    console.log('Page title:', await page.title());

    // Wait for page to settle and extension to inject
    await page.waitForTimeout(3000);

    // Take screenshot
    await page.screenshot({ path: '/tmp/linkedin-with-extension.png', fullPage: false });
    console.log('\n📸 Screenshot saved to /tmp/linkedin-with-extension.png');

    // Check for JobFiltr elements
    const extensionCheck = await page.evaluate(() => {
      const jobfiltrElements = document.querySelectorAll('[class*="jobfiltr"], [data-jobfiltr], [class*="ghost-badge"]');
      const ageBadges = document.querySelectorAll('[class*="job-age"], [class*="jobAge"]');

      // Look for extension-injected elements
      const allSpans = document.querySelectorAll('span');
      const injectedBadges = [];
      allSpans.forEach(span => {
        const style = span.getAttribute('style') || '';
        const className = span.className || '';
        if (style.includes('background') && (span.textContent.includes('day') || span.textContent.includes('week') || span.textContent.includes('ghost'))) {
          injectedBadges.push({
            text: span.textContent.trim().substring(0, 50),
            hasStyle: true
          });
        }
        if (className.includes('jobfiltr') || className.includes('ghost')) {
          injectedBadges.push({
            text: span.textContent.trim().substring(0, 50),
            className: className.substring(0, 50)
          });
        }
      });

      // Check for job cards
      const jobCards = document.querySelectorAll('.scaffold-layout__list-item, .jobs-search-results__list-item, .base-card');

      return {
        jobfiltrElementCount: jobfiltrElements.length,
        ageBadgeCount: ageBadges.length,
        injectedBadges: injectedBadges.slice(0, 10),
        jobCardCount: jobCards.length,
        isAuthenticatedView: !!document.querySelector('.global-nav__me, .feed-identity-module')
      };
    });

    console.log('\n=== Extension Check ===');
    console.log('JobFiltr elements found:', extensionCheck.jobfiltrElementCount);
    console.log('Age badges found:', extensionCheck.ageBadgeCount);
    console.log('Job cards found:', extensionCheck.jobCardCount);
    console.log('Authenticated:', extensionCheck.isAuthenticatedView);

    if (extensionCheck.injectedBadges.length > 0) {
      console.log('\nInjected badges:');
      extensionCheck.injectedBadges.forEach(b => console.log(`  - "${b.text}" ${b.className || ''}`));
    }

    // Check for job age text patterns
    const agePatterns = await page.evaluate(() => {
      const patterns = [];
      const cards = document.querySelectorAll('.scaffold-layout__list-item, .jobs-search-results__list-item, .base-card, .job-card-container');
      cards.forEach((card, i) => {
        if (i > 10) return;
        const text = card.textContent;
        const match = text.match(/(\d+\s*(?:hours?|days?|weeks?|months?)\s*ago|just\s*(?:now|posted)|today)/i);
        if (match) {
          const title = card.querySelector('h3, [class*="title"], .job-card-list__title')?.textContent?.trim();
          patterns.push({
            index: i,
            title: title?.substring(0, 40) || 'Unknown',
            age: match[0]
          });
        }
      });
      return patterns;
    });

    console.log('\n=== Job Age Patterns Found ===');
    if (agePatterns.length > 0) {
      agePatterns.forEach(p => console.log(`  [${p.index}] "${p.title}" - ${p.age}`));
    } else {
      console.log('No job age patterns found in cards');
    }

    // Print relevant console logs
    console.log('\n=== Extension Console Logs ===');
    const relevantLogs = consoleLogs.filter(l =>
      l.text.includes('JobFiltr') ||
      l.text.includes('[LinkedIn') ||
      l.text.includes('[Job') ||
      l.text.includes('ghost')
    );
    if (relevantLogs.length > 0) {
      relevantLogs.slice(0, 20).forEach(l => console.log(`  [${l.type}] ${l.text}`));
    } else {
      console.log('No extension logs captured');
    }

    console.log('\n✅ Analysis complete!');
    console.log('Browser will stay open for 2 minutes for manual inspection...');
    console.log('If you see a login page, please log in to test authenticated features.');

    // Keep browser open for inspection
    await page.waitForTimeout(120000);

    await context.close();
  } catch (error) {
    console.error('Error:', error.message);
    if (error.message.includes('extension')) {
      console.log('\n⚠️ Extension loading failed. Make sure the extension path is correct.');
    }
  }
})();
