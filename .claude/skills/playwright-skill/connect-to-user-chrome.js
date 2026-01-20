// Connect to user's Chrome via CDP (Chrome DevTools Protocol)
// This preserves all extensions, logins, and settings
const { chromium } = require('playwright');

(async () => {
  console.log('=== Connecting to Your Chrome ===\n');
  console.log('Attempting to connect to Chrome on port 9222...\n');

  try {
    // Connect to existing Chrome instance
    const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
    console.log('✅ Connected to your Chrome!\n');

    const contexts = browser.contexts();
    console.log(`Found ${contexts.length} browser context(s)`);

    if (contexts.length === 0) {
      console.log('No contexts found. Make sure Chrome has at least one window open.');
      return;
    }

    const context = contexts[0];
    const pages = context.pages();
    console.log(`Found ${pages.length} page(s):\n`);

    pages.forEach((p, i) => {
      console.log(`  ${i + 1}. ${p.url().substring(0, 70)}`);
    });

    // Find LinkedIn page
    let linkedInPage = pages.find(p => p.url().includes('linkedin.com'));

    if (!linkedInPage) {
      console.log('\nNo LinkedIn page found. Opening one...');
      linkedInPage = await context.newPage();
      await linkedInPage.goto('https://www.linkedin.com/jobs/search/?keywords=software%20engineer', {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });
    }

    console.log('\n=== LinkedIn Page ===');
    console.log('URL:', linkedInPage.url());
    console.log('Title:', await linkedInPage.title());

    // Capture console logs
    linkedInPage.on('console', msg => {
      const text = msg.text();
      if (text.includes('JobFiltr') || text.includes('[LinkedIn') ||
          text.includes('TESTING MODE') || text.includes('applyFilters') ||
          text.includes('badge') || text.includes('[Job')) {
        console.log(`[EXT] ${text.substring(0, 180)}`);
      }
    });

    // Wait for extension to run
    console.log('\nWaiting 5 seconds for extension...\n');
    await linkedInPage.waitForTimeout(5000);

    // Analyze the page
    const analysis = await linkedInPage.evaluate(() => {
      const results = {
        authenticated: false,
        jobCards: 0,
        jobfiltrElements: 0,
        ageBadges: [],
        extensionLogs: [],
        ageTextsOnPage: []
      };

      // Check auth
      results.authenticated = !!(
        document.querySelector('.global-nav__me-photo') ||
        document.querySelector('.feed-identity-module')
      );

      // Count job cards
      const cards = document.querySelectorAll('.scaffold-layout__list-item, [data-occludable-job-id]');
      results.jobCards = cards.length;

      // Find JobFiltr elements
      document.querySelectorAll('[class*="jobfiltr"], .jobfiltr-age-badge').forEach(el => {
        results.jobfiltrElements++;
        if (el.classList.contains('jobfiltr-age-badge')) {
          results.ageBadges.push(el.textContent?.trim());
        }
      });

      // Find any styled badges
      document.querySelectorAll('*').forEach(el => {
        const style = el.getAttribute('style') || '';
        const text = el.textContent?.trim() || '';
        if (style.includes('background') && text.length < 30 && text.length > 0) {
          if (/\d+\s*d|days?|weeks?|ghost|%/i.test(text)) {
            results.ageBadges.push(text);
          }
        }
      });

      // Find age text patterns
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let node;
      while (node = walker.nextNode()) {
        const text = node.textContent.trim();
        if (text && text.length < 50 && /\d+\s*(minute|hour|day|week)s?\s*ago/i.test(text)) {
          results.ageTextsOnPage.push(text);
        }
      }

      return results;
    });

    console.log('=== Analysis Results ===');
    console.log('Authenticated:', analysis.authenticated ? '✅ Yes' : '❌ No');
    console.log('Job cards:', analysis.jobCards);
    console.log('JobFiltr elements:', analysis.jobfiltrElements);
    console.log('Age badges found:', analysis.ageBadges.length);

    if (analysis.ageBadges.length > 0) {
      console.log('\nAge badges:');
      analysis.ageBadges.slice(0, 10).forEach(b => console.log(`  "${b}"`));
    }

    console.log('\nAge texts on page:', analysis.ageTextsOnPage.slice(0, 5).join(', ') || 'None');

    // Take screenshot
    await linkedInPage.screenshot({ path: 'C:\\tmp\\connected-chrome.png' });
    console.log('\n📸 Screenshot saved to C:\\tmp\\connected-chrome.png');

    console.log('\n✅ Analysis complete!');
    console.log('Your Chrome remains open with all your extensions.\n');

    // Disconnect (doesn't close the browser)
    await browser.close();

  } catch (error) {
    console.error('❌ Error:', error.message);

    if (error.message.includes('connect ECONNREFUSED')) {
      console.log('\n📌 Chrome is not running with remote debugging enabled.');
      console.log('\nTo fix this:');
      console.log('1. Close all Chrome windows');
      console.log('2. Run: C:\\jobfiltr-ext\\launch-chrome-debug.bat');
      console.log('3. Then try this script again');
    }
  }
})();
