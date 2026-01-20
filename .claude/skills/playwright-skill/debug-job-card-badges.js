// Debug job card badge display issues
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const os = require('os');

const EXTENSION_PATH = path.resolve(__dirname, '../../../chrome-extension');
const TARGET_URL = 'https://www.linkedin.com/jobs/search/?keywords=software%20engineer';

(async () => {
  console.log('=== Job Card Badge Debug ===\n');

  const tempUserDataDir = path.join(os.tmpdir(), 'playwright-debug-' + Date.now());

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
      if (text.includes('JobFiltr') || text.includes('[Job') || text.includes('badge') || text.includes('age')) {
        console.log(`[EXT] ${text.substring(0, 200)}`);
      }
    });

    console.log('Navigating to LinkedIn Jobs...');
    await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    console.log('Page title:', await page.title());

    // Wait for extension to process
    await page.waitForTimeout(5000);

    // Take initial screenshot
    await page.screenshot({ path: '/tmp/debug-initial.png' });
    console.log('📸 Screenshot: /tmp/debug-initial.png');

    // Analyze the job card structure
    const analysis = await page.evaluate(() => {
      const results = {
        jobCards: [],
        badges: [],
        issues: []
      };

      // Find all potential job cards
      const cardSelectors = [
        '.scaffold-layout__list-item',
        'li.jobs-search-results__list-item',
        '.job-card-container',
        'li:has(a[href*="/jobs/view/"])'
      ];

      let allCards = [];
      for (const sel of cardSelectors) {
        try {
          const cards = document.querySelectorAll(sel);
          cards.forEach(c => allCards.push({ element: c, selector: sel }));
        } catch (e) {}
      }

      // Dedupe
      const seen = new Set();
      allCards = allCards.filter(c => {
        if (seen.has(c.element)) return false;
        seen.add(c.element);
        return true;
      });

      // Analyze each card
      allCards.slice(0, 5).forEach((cardObj, i) => {
        const card = cardObj.element;
        const rect = card.getBoundingClientRect();
        const style = window.getComputedStyle(card);

        // Check for existing badge
        const badge = card.querySelector('.jobfiltr-age-badge');
        const cachedAge = card.dataset.jobfiltrAge;

        // Check for time text
        const timeEl = card.querySelector('time');
        const timeText = card.textContent.match(/(\d+\s*(?:hours?|days?|weeks?|months?)\s*ago)/i);

        // Check overflow
        const overflow = style.overflow;
        const overflowX = style.overflowX;
        const overflowY = style.overflowY;
        const position = style.position;

        const cardInfo = {
          index: i,
          selector: cardObj.selector,
          rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height },
          hasTimeBadge: !!badge,
          cachedAge: cachedAge,
          timeElement: timeEl ? { datetime: timeEl.getAttribute('datetime'), text: timeEl.textContent } : null,
          timeText: timeText ? timeText[0] : null,
          overflow: { main: overflow, x: overflowX, y: overflowY },
          position: position,
          visibility: style.visibility,
          display: style.display
        };

        results.jobCards.push(cardInfo);

        // Check for issues
        if (!badge && (timeEl || timeText)) {
          results.issues.push(`Card ${i}: Has time data but no badge`);
        }
        if (badge) {
          const badgeRect = badge.getBoundingClientRect();
          const badgeStyle = window.getComputedStyle(badge);
          results.badges.push({
            cardIndex: i,
            rect: { top: badgeRect.top, left: badgeRect.left, width: badgeRect.width, height: badgeRect.height },
            visible: badgeRect.width > 0 && badgeRect.height > 0,
            display: badgeStyle.display,
            visibility: badgeStyle.visibility,
            opacity: badgeStyle.opacity,
            zIndex: badgeStyle.zIndex,
            text: badge.textContent
          });

          // Check if badge is clipped
          if (badgeRect.top < rect.top || badgeRect.right > rect.right) {
            results.issues.push(`Card ${i}: Badge may be clipped (badge top: ${badgeRect.top}, card top: ${rect.top})`);
          }
          if ((overflow === 'hidden' || overflowX === 'hidden' || overflowY === 'hidden') && badge) {
            results.issues.push(`Card ${i}: Has overflow:hidden which may clip the badge`);
          }
        }
      });

      // Check for any orphaned badges
      const allBadges = document.querySelectorAll('.jobfiltr-age-badge');
      results.totalBadges = allBadges.length;

      return results;
    });

    console.log('\n=== Analysis Results ===\n');
    console.log('Job cards found:', analysis.jobCards.length);
    console.log('Badges found:', analysis.totalBadges);

    console.log('\n--- Job Cards ---');
    analysis.jobCards.forEach(card => {
      console.log(`Card ${card.index}:`);
      console.log(`  Selector: ${card.selector}`);
      console.log(`  Position: ${card.position}`);
      console.log(`  Has badge: ${card.hasTimeBadge}`);
      console.log(`  Cached age: ${card.cachedAge || 'none'}`);
      console.log(`  Time text: ${card.timeText || 'none'}`);
      console.log(`  Overflow: ${card.overflow.main}`);
    });

    if (analysis.badges.length > 0) {
      console.log('\n--- Badges ---');
      analysis.badges.forEach(badge => {
        console.log(`Badge for card ${badge.cardIndex}:`);
        console.log(`  Text: ${badge.text}`);
        console.log(`  Visible: ${badge.visible}`);
        console.log(`  Display: ${badge.display}`);
        console.log(`  Z-index: ${badge.zIndex}`);
      });
    }

    if (analysis.issues.length > 0) {
      console.log('\n--- Issues Found ---');
      analysis.issues.forEach(issue => console.log(`  ⚠️ ${issue}`));
    }

    // Take another screenshot after analysis
    await page.screenshot({ path: '/tmp/debug-analysis.png' });
    console.log('\n📸 Screenshot: /tmp/debug-analysis.png');

    console.log('\n✅ Debug complete. Browser staying open for 60 seconds...');
    await page.waitForTimeout(60000);

    await context.close();
    fs.rmSync(tempUserDataDir, { recursive: true, force: true });

  } catch (error) {
    console.error('Error:', error.message);
  }
})();
