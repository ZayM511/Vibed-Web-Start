// Load JobFiltr extension into fresh Chrome browser
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const os = require('os');

const EXTENSION_PATH = path.resolve(__dirname, '../../../chrome-extension');
const TARGET_URL = 'https://www.linkedin.com/jobs/search/?keywords=software%20engineer';

(async () => {
  console.log('=== JobFiltr Extension Test ===\n');
  console.log('Extension path:', EXTENSION_PATH);

  // Verify extension exists
  const manifestPath = path.join(EXTENSION_PATH, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    console.error('❌ Extension manifest not found at:', manifestPath);
    return;
  }
  console.log('✅ Extension manifest found\n');

  // Create a temp directory for the browser profile
  const tempUserDataDir = path.join(os.tmpdir(), 'playwright-chrome-' + Date.now());
  console.log('Using temp profile:', tempUserDataDir);

  try {
    // Launch Chrome with extension using persistent context
    const context = await chromium.launchPersistentContext(tempUserDataDir, {
      headless: false,
      channel: 'chrome',
      args: [
        `--disable-extensions-except=${EXTENSION_PATH}`,
        `--load-extension=${EXTENSION_PATH}`,
        '--start-maximized',
        '--disable-blink-features=AutomationControlled',
        '--no-first-run'
      ],
      viewport: { width: 1920, height: 1080 },
      ignoreDefaultArgs: ['--enable-automation', '--disable-extensions'],
      timeout: 60000
    });

    console.log('✅ Browser launched with extension!\n');

    const page = context.pages()[0] || await context.newPage();

    // Collect console messages
    const consoleLogs = [];
    page.on('console', msg => {
      const text = msg.text();
      consoleLogs.push({ type: msg.type(), text });
      if (text.includes('JobFiltr') || text.includes('[LinkedIn') || text.includes('[Job') || text.includes('ghost')) {
        console.log(`[EXT LOG] ${text.substring(0, 150)}`);
      }
    });

    console.log('Navigating to LinkedIn Jobs...');
    await page.goto(TARGET_URL, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    console.log('Page title:', await page.title());
    await page.waitForTimeout(5000);

    // Take initial screenshot
    await page.screenshot({ path: '/tmp/linkedin-ext-initial.png' });
    console.log('\n📸 Initial screenshot: /tmp/linkedin-ext-initial.png');

    // Check if login required
    const needsLogin = await page.evaluate(() => {
      return !!document.querySelector('input[name="session_key"], #username, button[data-tracking-control-name*="sign"]');
    });

    if (needsLogin) {
      console.log('\n⚠️ LinkedIn requires login.');
      console.log('Please log in using the browser window...');
      console.log('Waiting up to 2 minutes for login...\n');

      // Wait for login
      try {
        await page.waitForSelector('.global-nav__me, .feed-identity-module, [class*="jobs-search"]', { timeout: 120000 });
        console.log('✅ Login detected! Continuing...');
        await page.goto(TARGET_URL);
        await page.waitForTimeout(5000);
      } catch (e) {
        console.log('Login timeout - continuing anyway...');
      }
    }

    // Check for extension elements
    const extensionStatus = await page.evaluate(() => {
      // Look for JobFiltr-injected elements
      const jobfiltrBadges = document.querySelectorAll('[class*="jobfiltr"], [data-jobfiltr], [style*="jobfiltr"]');
      const ghostBadges = document.querySelectorAll('[class*="ghost-score"], [class*="ghost-badge"], [class*="ghost-indicator"]');

      // Look for colored badges (JobFiltr uses colored backgrounds)
      const coloredBadges = [];
      document.querySelectorAll('span, div').forEach(el => {
        const style = el.getAttribute('style') || '';
        const text = el.textContent?.trim() || '';
        if (style.includes('background') && text.length < 40 && text.length > 0) {
          if (text.match(/\d+\s*(d|day|w|week|h|hour|mo|month)/) ||
              text.includes('ghost') || text.includes('%') ||
              text.toLowerCase().includes('fresh') || text.toLowerCase().includes('old')) {
            coloredBadges.push({ text, tag: el.tagName });
          }
        }
      });

      // Check job cards
      const jobCards = document.querySelectorAll('.scaffold-layout__list-item, .jobs-search-results__list-item, .base-card, [class*="job-card"]');

      // Check for time elements
      const timeEls = document.querySelectorAll('time');
      const times = [];
      timeEls.forEach(t => {
        times.push({ datetime: t.getAttribute('datetime'), text: t.textContent?.trim() });
      });

      return {
        jobfiltrBadges: jobfiltrBadges.length,
        ghostBadges: ghostBadges.length,
        coloredBadges: coloredBadges.slice(0, 10),
        jobCards: jobCards.length,
        timeElements: times.slice(0, 5),
        isAuthenticated: !!document.querySelector('.global-nav__me, .feed-identity-module')
      };
    });

    console.log('\n=== Extension Status ===');
    console.log('Authenticated:', extensionStatus.isAuthenticated ? '✅ YES' : '❌ NO');
    console.log('JobFiltr badges:', extensionStatus.jobfiltrBadges);
    console.log('Ghost badges:', extensionStatus.ghostBadges);
    console.log('Job cards:', extensionStatus.jobCards);
    console.log('Time elements:', extensionStatus.timeElements.length);

    if (extensionStatus.coloredBadges.length > 0) {
      console.log('\nColored badges found (likely from extension):');
      extensionStatus.coloredBadges.forEach(b => console.log(`  <${b.tag}> "${b.text}"`));
    }

    if (extensionStatus.timeElements.length > 0) {
      console.log('\nTime elements:');
      extensionStatus.timeElements.forEach(t => console.log(`  ${t.datetime} - "${t.text}"`));
    }

    // Check job age patterns
    const agePatterns = await page.evaluate(() => {
      const patterns = [];
      const seen = new Set();
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
      let node;
      while (node = walker.nextNode()) {
        const text = node.textContent.trim();
        if (text.length > 0 && text.length < 50 && !seen.has(text)) {
          if (/\d+\s*(hour|day|week|month)s?\s*ago/i.test(text)) {
            seen.add(text);
            patterns.push(text);
          }
        }
      }
      return patterns.slice(0, 10);
    });

    console.log('\n=== Job Age Patterns ===');
    agePatterns.forEach(p => console.log(`  "${p}"`));

    // Print relevant extension logs
    console.log('\n=== Extension Console Logs ===');
    const extLogs = consoleLogs.filter(l =>
      l.text.includes('JobFiltr') || l.text.includes('[LinkedIn') ||
      l.text.includes('[Job') || l.text.includes('ghost') || l.text.includes('badge')
    );
    if (extLogs.length > 0) {
      extLogs.slice(0, 20).forEach(l => console.log(`  ${l.text.substring(0, 120)}`));
    } else {
      console.log('  (No extension logs captured yet)');
    }

    // Take final screenshot
    await page.screenshot({ path: '/tmp/linkedin-ext-final.png' });
    console.log('\n📸 Final screenshot: /tmp/linkedin-ext-final.png');

    console.log('\n✅ Test complete! Browser staying open for 3 minutes.');
    console.log('You can interact with the page to test the extension.\n');

    await page.waitForTimeout(180000);
    await context.close();

    // Clean up temp directory
    try {
      fs.rmSync(tempUserDataDir, { recursive: true, force: true });
    } catch (e) {
      // Ignore cleanup errors
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.message.includes('extension')) {
      console.log('\nMake sure the extension directory exists and has a valid manifest.json');
    }
  }
})();
