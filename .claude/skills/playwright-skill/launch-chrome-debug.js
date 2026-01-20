// Launch Chrome with remote debugging to connect to existing session
const { chromium } = require('playwright');

(async () => {
  console.log('Attempting to connect to Chrome with remote debugging...');
  console.log('If Chrome is not running with debugging, this will launch a new instance.\n');

  try {
    // Try to connect to existing Chrome first
    let browser;
    try {
      browser = await chromium.connectOverCDP('http://localhost:9222');
      console.log('✅ Connected to existing Chrome instance!');
    } catch (e) {
      console.log('No existing Chrome with debugging found. Launching new instance...');

      // Launch Chrome with a fresh profile (won't conflict with existing Chrome)
      browser = await chromium.launch({
        headless: false,
        channel: 'chrome',
        args: [
          '--remote-debugging-port=9222',
          '--disable-blink-features=AutomationControlled',
          '--start-maximized'
        ],
        ignoreDefaultArgs: ['--enable-automation']
      });
      console.log('✅ Launched new Chrome instance');
    }

    const context = browser.contexts()[0] || await browser.newContext({
      viewport: { width: 1920, height: 1080 }
    });
    const page = context.pages()[0] || await context.newPage();

    console.log('\nNavigating to LinkedIn...');
    await page.goto('https://www.linkedin.com/jobs/search/?keywords=software%20engineer', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    console.log('Page title:', await page.title());
    await page.waitForTimeout(2000);

    // Take screenshot
    await page.screenshot({ path: '/tmp/linkedin-debug.png' });
    console.log('📸 Screenshot saved to /tmp/linkedin-debug.png');

    // Check login status
    const isLoggedIn = await page.locator('.global-nav__me-photo, .feed-identity-module').count() > 0;
    const isLoginPage = await page.locator('input[name="session_key"], #username').count() > 0;

    if (isLoginPage) {
      console.log('\n⚠️ LinkedIn login page detected.');
      console.log('Please log in using the browser window...');
      console.log('After logging in, the script will continue automatically.\n');

      // Wait for navigation away from login page (user logs in)
      try {
        await page.waitForURL('**/feed/**', { timeout: 120000 });
        console.log('✅ Login detected! Redirecting to jobs...');
        await page.goto('https://www.linkedin.com/jobs/search/?keywords=software%20engineer');
        await page.waitForTimeout(3000);
      } catch (e) {
        console.log('Login timeout - checking if on jobs page anyway...');
      }
    } else if (isLoggedIn) {
      console.log('✅ Already logged in!');
    }

    // Analyze the page DOM structure
    console.log('\n=== DOM Analysis ===');

    // Check for time elements
    const timeCount = await page.locator('time').count();
    console.log(`<time> elements: ${timeCount}`);

    // Check for job cards
    const jobCardCount = await page.locator('.scaffold-layout__list-item, .jobs-search-results__list-item').count();
    console.log(`Job cards found: ${jobCardCount}`);

    // Find job age text patterns
    const agePatterns = await page.evaluate(() => {
      const patterns = [];
      const elements = document.querySelectorAll('*');
      for (const el of elements) {
        if (el.children.length === 0) {
          const text = el.textContent?.trim();
          if (text && text.length < 60 && /\d+\s*(hour|day|week|month)s?\s*ago/i.test(text)) {
            patterns.push({ text, tag: el.tagName, class: el.className?.substring(0, 50) });
          }
        }
      }
      return patterns.slice(0, 20);
    });

    if (agePatterns.length > 0) {
      console.log('\nJob age text patterns found:');
      agePatterns.forEach(p => console.log(`  "${p.text}" in <${p.tag}> class="${p.class}"`));
    } else {
      console.log('No "X ago" patterns found in text nodes');
    }

    // Check detail panel structure
    const detailPanel = await page.locator('.scaffold-layout__detail, .jobs-search__job-details').count();
    console.log(`\nDetail panel containers: ${detailPanel}`);

    // Final screenshot
    await page.screenshot({ path: '/tmp/linkedin-final.png', fullPage: false });
    console.log('\n📸 Final screenshot saved to /tmp/linkedin-final.png');

    console.log('\n✅ Analysis complete! Browser staying open for 3 minutes...');
    await page.waitForTimeout(180000);

    await browser.close();
  } catch (error) {
    console.error('Error:', error.message);
  }
})();
