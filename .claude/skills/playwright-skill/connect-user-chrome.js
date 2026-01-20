// Connect to user's Chrome with their profile and extensions
const { chromium } = require('playwright');
const path = require('path');
const os = require('os');

const TARGET_URL = 'https://www.linkedin.com/jobs/search/?keywords=software%20engineer';

(async () => {
  console.log('Launching Chrome with your user profile and extensions...\n');

  // User's Chrome profile path
  const userDataDir = path.join(os.homedir(), 'AppData', 'Local', 'Google', 'Chrome', 'User Data');
  console.log('User data directory:', userDataDir);

  try {
    // Launch Chrome with persistent context (uses user's profile with extensions)
    const context = await chromium.launchPersistentContext(userDataDir, {
      headless: false,
      channel: 'chrome',
      args: [
        '--profile-directory=Default',
        '--remote-debugging-port=9222',
        '--start-maximized',
        '--disable-blink-features=AutomationControlled'
      ],
      viewport: { width: 1920, height: 1080 },
      ignoreDefaultArgs: ['--enable-automation', '--disable-extensions'],
      timeout: 60000
    });

    const page = context.pages()[0] || await context.newPage();

    // Collect console messages
    const consoleLogs = [];
    page.on('console', msg => {
      const text = msg.text();
      consoleLogs.push({ type: msg.type(), text });
      // Print JobFiltr-related logs immediately
      if (text.includes('JobFiltr') || text.includes('[LinkedIn') || text.includes('[Job Age]') || text.includes('ghost')) {
        console.log(`[CONSOLE] ${text}`);
      }
    });

    console.log('\nNavigating to LinkedIn Jobs...');
    await page.goto(TARGET_URL, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    console.log('Page title:', await page.title());

    // Wait for page to settle
    await page.waitForTimeout(4000);

    // Take screenshot
    await page.screenshot({ path: '/tmp/linkedin-user-chrome.png', fullPage: false });
    console.log('\n📸 Screenshot saved to /tmp/linkedin-user-chrome.png');

    // Check authentication status
    const isAuthenticated = await page.evaluate(() => {
      return !!(document.querySelector('.global-nav__me-photo') ||
                document.querySelector('.feed-identity-module') ||
                document.querySelector('img[alt*="Photo of"]') ||
                document.querySelector('[data-control-name="identity_welcome_message"]'));
    });
    console.log('\nAuthenticated:', isAuthenticated ? '✅ YES' : '❌ NO (Please log in)');

    // Check for JobFiltr elements
    const extensionCheck = await page.evaluate(() => {
      // Look for JobFiltr-specific elements
      const jobfiltrElements = document.querySelectorAll('[class*="jobfiltr"], [data-jobfiltr]');
      const ghostBadges = document.querySelectorAll('[class*="ghost-score"], [class*="ghost-badge"]');
      const ageBadges = document.querySelectorAll('[class*="job-age"]');

      // Look for injected style badges
      const allElements = document.querySelectorAll('*');
      const injectedElements = [];
      allElements.forEach(el => {
        const style = el.getAttribute('style') || '';
        const text = el.textContent?.trim() || '';
        // JobFiltr typically injects badges with inline styles
        if (style.includes('background') && style.includes('rgb') && text.length < 30) {
          if (text.includes('day') || text.includes('week') || text.includes('hour') || text.includes('ghost') || text.includes('%')) {
            injectedElements.push({
              tag: el.tagName,
              text: text,
              style: style.substring(0, 80)
            });
          }
        }
      });

      // Check for job cards
      const jobCards = document.querySelectorAll('.scaffold-layout__list-item, .jobs-search-results__list-item, [data-job-id]');

      // Check for time elements
      const timeElements = document.querySelectorAll('time');
      const timeData = [];
      timeElements.forEach(t => {
        timeData.push({
          datetime: t.getAttribute('datetime'),
          text: t.textContent?.trim()
        });
      });

      return {
        jobfiltrCount: jobfiltrElements.length,
        ghostBadgeCount: ghostBadges.length,
        ageBadgeCount: ageBadges.length,
        injectedElements: injectedElements.slice(0, 10),
        jobCardCount: jobCards.length,
        timeElements: timeData.slice(0, 10)
      };
    });

    console.log('\n=== Extension Detection ===');
    console.log('JobFiltr elements:', extensionCheck.jobfiltrCount);
    console.log('Ghost badges:', extensionCheck.ghostBadgeCount);
    console.log('Age badges:', extensionCheck.ageBadgeCount);
    console.log('Job cards:', extensionCheck.jobCardCount);
    console.log('Time elements:', extensionCheck.timeElements.length);

    if (extensionCheck.injectedElements.length > 0) {
      console.log('\nInjected badge elements:');
      extensionCheck.injectedElements.forEach(e => console.log(`  <${e.tag}> "${e.text}"`));
    }

    if (extensionCheck.timeElements.length > 0) {
      console.log('\nTime elements found:');
      extensionCheck.timeElements.slice(0, 5).forEach(t => console.log(`  datetime="${t.datetime}" text="${t.text}"`));
    }

    // Check for job age text patterns
    const agePatterns = await page.evaluate(() => {
      const patterns = [];
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
      let node;
      const seen = new Set();
      while (node = walker.nextNode()) {
        const text = node.textContent.trim();
        if (text.length > 0 && text.length < 50) {
          if (/\d+\s*(hour|day|week|month)s?\s*ago/i.test(text) ||
              /just\s*(posted|now)/i.test(text) ||
              /today/i.test(text)) {
            if (!seen.has(text)) {
              seen.add(text);
              const parent = node.parentElement;
              patterns.push({
                text: text,
                tag: parent?.tagName,
                class: parent?.className?.substring(0, 40)
              });
            }
          }
        }
      }
      return patterns.slice(0, 15);
    });

    console.log('\n=== Job Age Text Patterns ===');
    if (agePatterns.length > 0) {
      agePatterns.forEach(p => console.log(`  "${p.text}" in <${p.tag}>`));
    } else {
      console.log('No job age text patterns found');
    }

    // Print extension console logs
    console.log('\n=== Extension Console Logs ===');
    const extLogs = consoleLogs.filter(l =>
      l.text.includes('JobFiltr') ||
      l.text.includes('[LinkedIn') ||
      l.text.includes('[Job') ||
      l.text.includes('ghost') ||
      l.text.includes('badge')
    );
    if (extLogs.length > 0) {
      extLogs.forEach(l => console.log(`  [${l.type}] ${l.text.substring(0, 100)}`));
    } else {
      console.log('No extension logs captured');
    }

    console.log('\n✅ Analysis complete!');
    console.log('Browser staying open for 3 minutes. Please log in if not authenticated.');

    await page.waitForTimeout(180000);
    await context.close();

  } catch (error) {
    console.error('Error:', error.message);
    if (error.message.includes('user data directory is already in use')) {
      console.log('\n⚠️ Chrome is already running with this profile.');
      console.log('Please close all Chrome windows and try again.');
    }
  }
})();
