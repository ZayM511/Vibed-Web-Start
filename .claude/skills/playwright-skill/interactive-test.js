// Interactive test - launches Chrome with extension, waits for login, then analyzes
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const os = require('os');

const EXTENSION_PATH = path.resolve(__dirname, '../../../chrome-extension');
const TARGET_URL = 'https://www.linkedin.com/jobs/search/?keywords=software%20engineer';

(async () => {
  console.log('=== Interactive JobFiltr Test ===\n');
  console.log('This will launch Chrome with the JobFiltr extension.');
  console.log('Please log in to LinkedIn when the browser opens.\n');

  const tempUserDataDir = path.join(os.tmpdir(), 'playwright-interactive-' + Date.now());

  try {
    const context = await chromium.launchPersistentContext(tempUserDataDir, {
      headless: false,
      channel: 'chrome',
      args: [
        `--disable-extensions-except=${EXTENSION_PATH}`,
        `--load-extension=${EXTENSION_PATH}`,
        '--start-maximized'
      ],
      viewport: { width: 1920, height: 1080 },
      ignoreDefaultArgs: ['--enable-automation', '--disable-extensions'],
      timeout: 60000
    });

    const page = context.pages()[0] || await context.newPage();

    // Collect console messages
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('JobFiltr') || text.includes('[Job') || text.includes('age') || text.includes('badge') || text.includes('showJobAge')) {
        console.log(`[EXT] ${text.substring(0, 250)}`);
      }
    });

    console.log('Navigating to LinkedIn Jobs...');
    await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Take initial screenshot
    await page.screenshot({ path: '/tmp/interactive-1-initial.png' });
    console.log('📸 Screenshot 1: /tmp/interactive-1-initial.png\n');

    console.log('⏳ Waiting 2 minutes for you to log in...');
    console.log('   Please log in to LinkedIn in the browser window.\n');

    // Wait for login (check every 5 seconds)
    let loggedIn = false;
    for (let i = 0; i < 24; i++) { // 2 minutes total
      await page.waitForTimeout(5000);

      const isLoggedIn = await page.evaluate(() => {
        return !!document.querySelector('.global-nav__me-photo, .feed-identity-module, [class*="nav__content__"]');
      });

      if (isLoggedIn && !loggedIn) {
        loggedIn = true;
        console.log('✅ Login detected! Continuing...\n');

        // Navigate to jobs page after login
        await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(5000);

        // Take screenshot after login
        await page.screenshot({ path: '/tmp/interactive-2-logged-in.png' });
        console.log('📸 Screenshot 2: /tmp/interactive-2-logged-in.png\n');
        break;
      }

      console.log(`   Still waiting... (${(i + 1) * 5}s)`);
    }

    if (!loggedIn) {
      console.log('\n⚠️ Login timeout. Continuing with analysis anyway...\n');
    }

    // Wait for extension to process
    console.log('Waiting 10 seconds for extension to process job cards...\n');
    await page.waitForTimeout(10000);

    // Take screenshot after extension processes
    await page.screenshot({ path: '/tmp/interactive-3-processed.png' });
    console.log('📸 Screenshot 3: /tmp/interactive-3-processed.png\n');

    // Analyze job cards and badges
    console.log('=== Analyzing Job Cards ===\n');

    const analysis = await page.evaluate(() => {
      const results = {
        cards: [],
        badges: 0,
        detailBadge: null,
        ghostBadge: null,
        extensionLogs: []
      };

      // Find all job cards
      const cardSelectors = [
        '.scaffold-layout__list-item',
        'li.ember-view.jobs-search-results__list-item',
        '.job-card-container',
        '[data-job-id]'
      ];

      const cards = new Set();
      for (const sel of cardSelectors) {
        document.querySelectorAll(sel).forEach(c => cards.add(c));
      }

      // Analyze each card
      [...cards].slice(0, 8).forEach((card, i) => {
        const badge = card.querySelector('.jobfiltr-age-badge');
        const timeText = card.textContent.match(/(\d+\s*(?:hours?|days?|weeks?|months?)\s*ago)/i);
        const cachedAge = card.dataset.jobfiltrAge;
        const position = window.getComputedStyle(card).position;
        const overflow = window.getComputedStyle(card).overflow;

        results.cards.push({
          index: i,
          hasBadge: !!badge,
          badgeText: badge ? badge.textContent : null,
          timeText: timeText ? timeText[0] : null,
          cachedAge: cachedAge || null,
          position: position,
          overflow: overflow
        });

        if (badge) results.badges++;
      });

      // Check detail panel for badges
      const detailAgeBadge = document.querySelector('.jobfiltr-detail-age-badge');
      if (detailAgeBadge) {
        results.detailBadge = detailAgeBadge.textContent;
      }

      const ghostBadge = document.querySelector('[class*="ghost-score"], [class*="ghost-badge"]');
      if (ghostBadge) {
        results.ghostBadge = ghostBadge.textContent;
      }

      return results;
    });

    console.log(`Total job cards found: ${analysis.cards.length}`);
    console.log(`Cards with age badges: ${analysis.badges}`);
    console.log(`Detail panel age badge: ${analysis.detailBadge || 'Not found'}`);
    console.log(`Ghost badge: ${analysis.ghostBadge || 'Not found'}\n`);

    console.log('--- Card Details ---');
    analysis.cards.forEach(card => {
      const status = card.hasBadge ? '✅' : '❌';
      console.log(`${status} Card ${card.index}: ${card.hasBadge ? 'Has badge "' + card.badgeText + '"' : 'No badge'}`);
      console.log(`   Time text: ${card.timeText || 'none'}`);
      console.log(`   Cached age: ${card.cachedAge || 'none'}`);
      console.log(`   Position: ${card.position}, Overflow: ${card.overflow}`);
    });

    // Final screenshot
    await page.screenshot({ path: '/tmp/interactive-4-final.png', fullPage: false });
    console.log('\n📸 Screenshot 4: /tmp/interactive-4-final.png');

    console.log('\n=== Analysis Complete ===');
    console.log('Browser will stay open for 5 more minutes for manual inspection.');
    console.log('Press Ctrl+C in terminal to close when done.\n');

    await page.waitForTimeout(300000); // 5 minutes

    await context.close();
    fs.rmSync(tempUserDataDir, { recursive: true, force: true });

  } catch (error) {
    console.error('Error:', error.message);
  }
})();
