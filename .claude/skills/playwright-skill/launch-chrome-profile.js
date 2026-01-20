// Launch actual Chrome browser with user profile for authenticated testing
const { chromium } = require('playwright');
const path = require('path');
const os = require('os');

(async () => {
  // Get the user's Chrome profile path
  const userDataDir = path.join(os.homedir(), 'AppData', 'Local', 'Google', 'Chrome', 'User Data');

  console.log('Launching Chrome with your existing profile...');
  console.log('User data dir:', userDataDir);

  try {
    // Launch Chrome with persistent context (uses your actual profile)
    const context = await chromium.launchPersistentContext(userDataDir, {
      headless: false,
      channel: 'chrome', // Use installed Chrome, not Chromium
      args: [
        '--profile-directory=Default', // Use default profile
        '--disable-blink-features=AutomationControlled', // Reduce detection
        '--start-maximized'
      ],
      viewport: { width: 1920, height: 1080 },
      ignoreDefaultArgs: ['--enable-automation'],
      timeout: 60000
    });

    const page = context.pages()[0] || await context.newPage();

    console.log('Chrome launched successfully!');
    console.log('Navigating to LinkedIn Jobs...');

    // Navigate to LinkedIn jobs search
    await page.goto('https://www.linkedin.com/jobs/search/?keywords=software%20engineer', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    console.log('Page loaded. Title:', await page.title());

    // Wait for page to settle
    await page.waitForTimeout(3000);

    // Take screenshot
    await page.screenshot({
      path: '/tmp/linkedin-authenticated.png',
      fullPage: false
    });
    console.log('📸 Screenshot saved to /tmp/linkedin-authenticated.png');

    // Check if logged in by looking for user avatar or feed elements
    const isLoggedIn = await page.locator('.global-nav__me, .feed-identity-module, img[alt*="Photo"]').count() > 0;
    console.log('Logged in:', isLoggedIn ? 'YES' : 'NO - Please log in manually');

    if (!isLoggedIn) {
      console.log('\n⚠️ Please log in to LinkedIn in the browser window.');
      console.log('The browser will stay open for you to log in...');
    }

    // Check for job cards
    const jobCards = await page.locator('.scaffold-layout__list-item, .jobs-search-results__list-item, [class*="job-card"]').count();
    console.log(`Found ${jobCards} job cards`);

    // Check for time elements in authenticated view
    const timeElements = await page.locator('time').count();
    console.log(`Found ${timeElements} <time> elements`);

    // Look for job age text patterns
    const agePatterns = await page.evaluate(() => {
      const patterns = [];
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        null,
        false
      );
      let node;
      while (node = walker.nextNode()) {
        const text = node.textContent.trim();
        if (text.length < 50 && /\d+\s*(hour|day|week|month)s?\s*ago/i.test(text)) {
          patterns.push(text);
        }
      }
      return [...new Set(patterns)].slice(0, 15); // Unique, first 15
    });

    if (agePatterns.length > 0) {
      console.log('\n=== Job Age Text Patterns Found ===');
      agePatterns.forEach(p => console.log('  -', p));
    }

    // Keep browser open for manual inspection
    console.log('\n✅ Browser will stay open. Press Ctrl+C to close when done.');

    // Keep alive - wait for a very long time
    await page.waitForTimeout(300000); // 5 minutes

    await context.close();
  } catch (error) {
    console.error('Error:', error.message);

    if (error.message.includes('user data directory is already in use')) {
      console.log('\n⚠️ Chrome is already running. Please close all Chrome windows and try again.');
      console.log('Or use a different profile by modifying --profile-directory=Profile 1');
    }
  }
})();
