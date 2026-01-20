// Test JobFiltr extension on LinkedIn Jobs
const { chromium } = require('playwright');

const TARGET_URL = 'https://www.linkedin.com/jobs/search/?keywords=software%20engineer';

(async () => {
  const browser = await chromium.launch({
    headless: false,
    slowMo: 100
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });

  const page = await context.newPage();

  // Collect console messages
  const consoleLogs = [];
  page.on('console', msg => {
    const text = msg.text();
    consoleLogs.push({ type: msg.type(), text });
    // Print JobFiltr-related logs immediately
    if (text.includes('JobFiltr') || text.includes('jobfiltr')) {
      console.log(`[CONSOLE ${msg.type()}] ${text}`);
    }
  });

  try {
    console.log('Navigating to LinkedIn Jobs...');
    await page.goto(TARGET_URL, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    console.log('Page loaded. Title:', await page.title());

    // Wait for page to settle
    await page.waitForTimeout(3000);

    // Take initial screenshot
    await page.screenshot({
      path: '/tmp/linkedin-jobs-initial.png',
      fullPage: false
    });
    console.log('📸 Initial screenshot saved to /tmp/linkedin-jobs-initial.png');

    // Check if we're on a login page
    const isLoginPage = await page.locator('input[name="session_key"], input[id="username"]').count() > 0;
    if (isLoginPage) {
      console.log('⚠️ LinkedIn requires login. Extension cannot be tested without authentication.');
      console.log('Please log in to LinkedIn in a browser first, or use a persistent browser context.');
    }

    // Check for job cards
    const jobCards = await page.locator('.jobs-search-results-list, .scaffold-layout__list, [class*="job-card"]').count();
    console.log(`Found ${jobCards} potential job list containers`);

    // Look for any JobFiltr elements
    const jobfiltrBadges = await page.locator('[class*="jobfiltr"]').count();
    console.log(`Found ${jobfiltrBadges} JobFiltr badges/elements`);

    // Wait a bit more and take another screenshot
    await page.waitForTimeout(2000);
    await page.screenshot({
      path: '/tmp/linkedin-jobs-after-wait.png',
      fullPage: false
    });
    console.log('📸 Second screenshot saved to /tmp/linkedin-jobs-after-wait.png');

    // Print all JobFiltr console logs found
    console.log('\n=== JobFiltr Console Logs ===');
    const jobfiltrLogs = consoleLogs.filter(log =>
      log.text.includes('JobFiltr') || log.text.includes('jobfiltr')
    );
    if (jobfiltrLogs.length > 0) {
      jobfiltrLogs.forEach(log => console.log(`[${log.type}] ${log.text}`));
    } else {
      console.log('No JobFiltr logs found. Extension may not be installed in this browser instance.');
    }

    // Check the DOM for time-related elements
    console.log('\n=== Checking for time elements ===');
    const timeElements = await page.locator('time').count();
    console.log(`Found ${timeElements} <time> elements`);

    // Look for text containing "ago"
    const agoText = await page.evaluate(() => {
      const elements = document.querySelectorAll('*');
      const matches = [];
      for (const el of elements) {
        if (el.children.length === 0 && el.textContent) {
          const text = el.textContent.trim();
          if (text.length < 50 && /\d+\s*(day|week|month|hour)s?\s*ago/i.test(text)) {
            matches.push(text);
          }
        }
      }
      return matches.slice(0, 10); // First 10 matches
    });

    if (agoText.length > 0) {
      console.log('Found time-related text:', agoText);
    } else {
      console.log('No "X ago" text patterns found');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    await page.screenshot({ path: '/tmp/linkedin-error.png' });
  } finally {
    // Keep browser open for inspection
    console.log('\nKeeping browser open for 10 seconds for inspection...');
    await page.waitForTimeout(10000);
    await browser.close();
  }
})();
