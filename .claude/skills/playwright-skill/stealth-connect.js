// Stealth connection to user's Chrome with their profile
const { chromium } = require('playwright');
const { execSync, spawn } = require('child_process');
const path = require('path');

const TARGET_URL = 'https://www.linkedin.com/jobs/search/?keywords=software%20engineer';
const EXTENSION_PATH = path.resolve(__dirname, '../../../chrome-extension');

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

(async () => {
  console.log('=== Stealth LinkedIn Connection ===\n');

  try {
    // Step 1: Close all Chrome instances
    console.log('Step 1: Closing existing Chrome instances...');
    try {
      execSync('taskkill /F /IM chrome.exe', { stdio: 'ignore' });
    } catch (e) {
      // Chrome might not be running
    }
    await sleep(3000);

    // Step 2: Launch Chrome with user profile AND remote debugging
    console.log('Step 2: Launching Chrome with your profile and remote debugging...');

    const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
    const userDataDir = path.join(process.env.LOCALAPPDATA, 'Google', 'Chrome', 'User Data');

    // Launch Chrome with arguments
    const chrome = spawn(chromePath, [
      `--user-data-dir=${userDataDir}`,
      '--profile-directory=Default',
      '--remote-debugging-port=9222',
      `--load-extension=${EXTENSION_PATH}`,
      '--start-maximized',
      TARGET_URL
    ], {
      detached: true,
      stdio: 'ignore'
    });
    chrome.unref();

    console.log('Chrome launched. Waiting for it to start...');
    await sleep(8000);

    // Step 3: Connect via CDP
    console.log('\nStep 3: Connecting to Chrome via CDP...');

    let browser;
    for (let i = 0; i < 5; i++) {
      try {
        browser = await chromium.connectOverCDP('http://localhost:9222');
        console.log('✅ Connected to Chrome!\n');
        break;
      } catch (e) {
        console.log(`Connection attempt ${i + 1} failed, retrying...`);
        await sleep(2000);
      }
    }

    if (!browser) {
      throw new Error('Could not connect to Chrome. Make sure it started properly.');
    }

    // Get the page
    const contexts = browser.contexts();
    console.log(`Found ${contexts.length} browser context(s)`);

    let page = null;
    for (const context of contexts) {
      const pages = context.pages();
      for (const p of pages) {
        const url = p.url();
        console.log(`  Page: ${url}`);
        if (url.includes('linkedin.com')) {
          page = p;
          break;
        }
      }
      if (page) break;
    }

    if (!page) {
      console.log('\nNo LinkedIn page found. Creating one...');
      const context = contexts[0];
      page = await context.newPage();
      await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded' });
    }

    // Wait for page to load
    await sleep(5000);

    // Take screenshot
    await page.screenshot({ path: '/tmp/stealth-1-connected.png' });
    console.log('\n📸 Screenshot: /tmp/stealth-1-connected.png');

    // Check login status
    const isLoggedIn = await page.evaluate(() => {
      return !!document.querySelector('.global-nav__me-photo, .feed-identity-module, nav[aria-label="Primary"]');
    });
    console.log(`\nLogged in: ${isLoggedIn ? '✅ YES' : '❌ NO'}`);

    // If logged in, analyze badges
    if (isLoggedIn) {
      console.log('\n=== Analyzing Job Cards ===\n');

      // Wait for extension to process
      await sleep(5000);

      const analysis = await page.evaluate(() => {
        const results = {
          cards: [],
          totalBadges: 0,
          detailBadge: null,
          ghostBadge: null
        };

        // Find job cards
        const cardSelectors = [
          '.scaffold-layout__list-item',
          'li.ember-view.jobs-search-results__list-item',
          '.job-card-container',
          '[class*="job-card"]'
        ];

        const cards = new Set();
        for (const sel of cardSelectors) {
          try {
            document.querySelectorAll(sel).forEach(c => cards.add(c));
          } catch (e) {}
        }

        [...cards].slice(0, 10).forEach((card, i) => {
          const badge = card.querySelector('.jobfiltr-age-badge');
          const timeText = card.textContent.match(/(\d+\s*(?:hours?|days?|weeks?|months?)\s*ago)/i);
          const cachedAge = card.dataset.jobfiltrAge;

          results.cards.push({
            index: i,
            hasBadge: !!badge,
            badgeText: badge ? badge.textContent.trim() : null,
            badgeVisible: badge ? (badge.offsetWidth > 0 && badge.offsetHeight > 0) : false,
            timeText: timeText ? timeText[0] : null,
            cachedAge: cachedAge || null
          });

          if (badge) results.totalBadges++;
        });

        // Check detail panel
        const detailBadge = document.querySelector('.jobfiltr-detail-age-badge');
        if (detailBadge) {
          results.detailBadge = {
            text: detailBadge.textContent.trim(),
            visible: detailBadge.offsetWidth > 0 && detailBadge.offsetHeight > 0
          };
        }

        const ghostBadge = document.querySelector('[class*="ghost-score"], [class*="ghost-badge"], [class*="jobfiltr-ghost"]');
        if (ghostBadge) {
          results.ghostBadge = {
            text: ghostBadge.textContent.trim(),
            visible: ghostBadge.offsetWidth > 0 && ghostBadge.offsetHeight > 0
          };
        }

        return results;
      });

      console.log(`Total cards found: ${analysis.cards.length}`);
      console.log(`Cards with badges: ${analysis.totalBadges}`);
      console.log(`Detail panel badge: ${analysis.detailBadge ? analysis.detailBadge.text + (analysis.detailBadge.visible ? ' (visible)' : ' (hidden)') : 'None'}`);
      console.log(`Ghost badge: ${analysis.ghostBadge ? analysis.ghostBadge.text : 'None'}`);

      console.log('\n--- Job Card Analysis ---');
      analysis.cards.forEach(card => {
        const status = card.hasBadge ? '✅' : '❌';
        console.log(`${status} Card ${card.index}:`);
        console.log(`   Badge: ${card.hasBadge ? '"' + card.badgeText + '"' + (card.badgeVisible ? ' (visible)' : ' (HIDDEN)') : 'None'}`);
        console.log(`   Time in text: ${card.timeText || 'Not found'}`);
        console.log(`   Cached age: ${card.cachedAge || 'None'}`);
      });

      // Final screenshot
      await page.screenshot({ path: '/tmp/stealth-2-analyzed.png' });
      console.log('\n📸 Final screenshot: /tmp/stealth-2-analyzed.png');
    } else {
      console.log('\n⚠️ Not logged in. Your LinkedIn session may have expired.');
      console.log('Please log in manually in the browser, then run this script again.');
    }

    console.log('\n=== Analysis Complete ===');
    console.log('Browser will remain open. Close it manually when done.\n');

    // Don't close browser - let user keep it open
    await browser.close(); // This just disconnects, doesn't close Chrome

  } catch (error) {
    console.error('Error:', error.message);
    if (error.message.includes('ECONNREFUSED')) {
      console.log('\n⚠️ Could not connect to Chrome on port 9222.');
      console.log('Try running this manually in PowerShell:');
      console.log('& "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" --remote-debugging-port=9222');
    }
  }
})();
