// Launch Chrome with user's profile using Playwright
const { chromium } = require('playwright');
const path = require('path');

const EXTENSION_PATH = 'C:\\Users\\isaia\\OneDrive\\Documents\\2025 Docs\\Claude Copy\\Vibed-Web-Start-1\\chrome-extension';
const USER_DATA_DIR = 'C:\\Users\\isaia\\AppData\\Local\\Google\\Chrome\\User Data';

(async () => {
  console.log('Launching Chrome with your profile and extension...');
  console.log('Extension:', EXTENSION_PATH);
  console.log('User data:', USER_DATA_DIR);

  try {
    // Launch persistent context - this uses the user's Chrome profile
    const context = await chromium.launchPersistentContext(USER_DATA_DIR, {
      headless: false,
      channel: 'chrome',
      args: [
        '--profile-directory=Default',
        `--load-extension=${EXTENSION_PATH}`,
        '--start-maximized',
        '--disable-blink-features=AutomationControlled'
      ],
      viewport: null,
      ignoreDefaultArgs: ['--enable-automation', '--disable-extensions'],
      timeout: 60000
    });

    console.log('✅ Browser launched!');

    // Get existing page or create new one
    const pages = context.pages();
    const page = pages[0] || await context.newPage();

    // Collect console logs
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('JobFiltr') || text.includes('[LinkedIn') || text.includes('[Job') || text.includes('ghost')) {
        console.log(`[EXT] ${text.substring(0, 150)}`);
      }
    });

    // Navigate to LinkedIn
    console.log('\nNavigating to LinkedIn Jobs...');
    await page.goto('https://www.linkedin.com/jobs/search/?keywords=software%20engineer', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    console.log('Page URL:', page.url());
    console.log('Page title:', await page.title());

    // Wait for page to settle
    await page.waitForTimeout(5000);

    // Check authentication
    const isAuthenticated = await page.evaluate(() => {
      return !!(
        document.querySelector('.global-nav__me-photo') ||
        document.querySelector('.feed-identity-module') ||
        document.querySelector('img[alt*="Photo of"]') ||
        document.querySelector('[data-control-name="identity_welcome_message"]')
      );
    });

    console.log('\n=== Authentication ===');
    if (isAuthenticated) {
      console.log('✅ You are logged in to LinkedIn!');
    } else {
      console.log('❌ Not logged in - please sign in to LinkedIn in the browser window');
      console.log('I will wait 60 seconds for you to log in...');
      await page.waitForTimeout(60000);
    }

    // Analyze the page
    console.log('\n=== Analyzing Page ===');
    const analysis = await page.evaluate(() => {
      const results = {
        jobCards: 0,
        timeElements: [],
        agePatterns: [],
        injectedBadges: []
      };

      // Count job cards
      const cards = document.querySelectorAll('.scaffold-layout__list-item, [data-occludable-job-id]');
      results.jobCards = cards.length;

      // Find time elements
      document.querySelectorAll('time').forEach(t => {
        results.timeElements.push({
          datetime: t.getAttribute('datetime'),
          text: t.textContent?.trim()
        });
      });

      // Find age text patterns
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let node;
      const seen = new Set();
      while (node = walker.nextNode()) {
        const text = node.textContent.trim();
        if (text && text.length < 50 && !seen.has(text)) {
          if (/\d+\s*(hour|day|week|month)s?\s*ago/i.test(text) || /reposted/i.test(text)) {
            seen.add(text);
            results.agePatterns.push(text);
          }
        }
      }

      // Look for injected badges
      document.querySelectorAll('*').forEach(el => {
        const style = el.getAttribute('style') || '';
        const text = el.textContent?.trim() || '';
        if (style.includes('background') && text.length < 30) {
          if (/\d+d|ghost|%|day|week/i.test(text)) {
            results.injectedBadges.push(text);
          }
        }
      });

      return results;
    });

    console.log('Job cards found:', analysis.jobCards);
    console.log('Time elements:', analysis.timeElements.length);
    console.log('Age patterns in DOM:', analysis.agePatterns.slice(0, 5).join(', ') || 'None');
    console.log('Injected badges:', analysis.injectedBadges.slice(0, 5).join(', ') || 'None');

    // Take screenshot
    await page.screenshot({ path: 'C:\\tmp\\linkedin-test.png' });
    console.log('\n📸 Screenshot saved to C:\\tmp\\linkedin-test.png');

    console.log('\n✅ Analysis complete! Browser will stay open for 2 minutes.');
    console.log('You can interact with the page. The extension should be active.');

    await page.waitForTimeout(120000);
    await context.close();

  } catch (error) {
    console.error('❌ Error:', error.message);

    if (error.message.includes('user data directory is already in use')) {
      console.log('\n⚠️ Chrome is already running with this profile.');
      console.log('Please close ALL Chrome windows and try again.');
    }
  }
})();
