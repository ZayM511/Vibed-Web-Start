// Analyze LinkedIn job cards - Launch fresh Chrome with extension
const { chromium } = require('playwright');
const path = require('path');
const os = require('os');
const fs = require('fs');

const EXTENSION_PATH = path.resolve(__dirname, '../../../chrome-extension');
const TARGET_URL = 'https://www.linkedin.com/jobs/search/?keywords=software%20engineer';

(async () => {
  console.log('=== LinkedIn Badge Analysis V2 ===\n');
  console.log('This will launch Chrome with JobFiltr extension.');
  console.log('Please log in to LinkedIn when prompted.\n');

  const tempUserDataDir = path.join(os.tmpdir(), 'playwright-linkedin-' + Date.now());

  try {
    const context = await chromium.launchPersistentContext(tempUserDataDir, {
      headless: false,
      channel: 'chrome',
      args: [
        `--disable-extensions-except=${EXTENSION_PATH}`,
        `--load-extension=${EXTENSION_PATH}`,
        '--start-maximized',
        '--disable-blink-features=AutomationControlled'
      ],
      viewport: { width: 1920, height: 1080 },
      ignoreDefaultArgs: ['--enable-automation'],
      timeout: 60000
    });

    const page = context.pages()[0] || await context.newPage();

    // Navigate to LinkedIn
    console.log('Navigating to LinkedIn Jobs...');
    await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Take initial screenshot
    await page.screenshot({ path: '/tmp/analysis-1-initial.png' });
    console.log('📸 Screenshot: /tmp/analysis-1-initial.png\n');

    // Wait for user to log in
    console.log('⏳ Waiting 90 seconds for you to log in...');
    console.log('   Please log in to LinkedIn in the browser window.\n');

    let loggedIn = false;
    for (let i = 0; i < 18; i++) { // 90 seconds
      await page.waitForTimeout(5000);

      const isLoggedIn = await page.evaluate(() => {
        return !!document.querySelector('.global-nav__me-photo, .feed-identity-module, [class*="nav-item__profile"]');
      });

      if (isLoggedIn) {
        loggedIn = true;
        console.log('✅ Login detected!\n');
        break;
      }

      console.log(`   Still waiting... (${(i + 1) * 5}s)`);
    }

    if (!loggedIn) {
      console.log('⚠️ Login not detected, continuing anyway...\n');
    }

    // Navigate to jobs page after login
    await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded' });
    console.log('Waiting for page and extension to process...');
    await page.waitForTimeout(8000);

    // Take screenshot
    await page.screenshot({ path: '/tmp/analysis-2-jobs.png' });
    console.log('📸 Screenshot: /tmp/analysis-2-jobs.png\n');

    // Analyze job cards
    console.log('=== Analyzing Job Cards ===\n');

    const analysis = await page.evaluate(() => {
      const results = {
        totalCards: 0,
        cardsWithBadges: 0,
        cardsWithoutBadges: [],
        cards: []
      };

      // Find job cards
      const selectors = [
        '.scaffold-layout__list-item',
        'li:has(a[href*="/jobs/view/"])',
        '.jobs-search-results__list-item'
      ];

      const allCards = new Set();
      for (const sel of selectors) {
        try {
          document.querySelectorAll(sel).forEach(c => allCards.add(c));
        } catch (e) {}
      }

      const cards = [...allCards].slice(0, 12);
      results.totalCards = cards.length;

      cards.forEach((card, i) => {
        const badge = card.querySelector('.jobfiltr-age-badge');
        const cardText = card.textContent || '';

        // Time pattern detection
        const patterns = [
          /(\d+)\s*(?:hours?|hr)\s*ago/i,
          /(\d+)\s*(?:days?)\s*ago/i,
          /(\d+)\s*(?:weeks?)\s*ago/i,
          /(\d+)\s*(?:months?)\s*ago/i,
          /\b(\d+)d\b/,
          /\b(\d+)w\b/,
          /just\s*now/i,
          /today/i
        ];

        let ageText = null;
        for (const p of patterns) {
          const m = cardText.match(p);
          if (m) {
            ageText = m[0];
            break;
          }
        }

        const title = card.querySelector('a[href*="/jobs/view/"]')?.textContent?.trim()?.substring(0, 35) || 'Unknown';
        const cachedAge = card.dataset.jobfiltrAge;
        const isActive = /active/i.test(card.className);

        results.cards.push({
          index: i,
          title,
          hasBadge: !!badge,
          badgeAge: badge?.dataset?.age,
          ageText,
          cachedAge,
          isActive
        });

        if (badge) {
          results.cardsWithBadges++;
        } else {
          results.cardsWithoutBadges.push({ index: i, title, hasAgeText: !!ageText, ageText });
        }
      });

      return results;
    });

    console.log(`Total cards: ${analysis.totalCards}`);
    console.log(`WITH badges: ${analysis.cardsWithBadges}`);
    console.log(`WITHOUT badges: ${analysis.cardsWithoutBadges.length}\n`);

    console.log('--- Card Details ---\n');
    analysis.cards.forEach(c => {
      const status = c.hasBadge ? `✅ Badge (${c.badgeAge}d)` : '❌ No badge';
      const text = c.ageText ? `"${c.ageText}"` : 'NO AGE TEXT';
      const active = c.isActive ? ' [ACTIVE]' : '';
      console.log(`${c.index}: ${c.title}...${active}`);
      console.log(`   ${status} | Text: ${text} | Cache: ${c.cachedAge || 'none'}`);
    });

    // KEY FINDING
    console.log('\n=== KEY FINDINGS ===\n');

    const noBadgeNoText = analysis.cardsWithoutBadges.filter(c => !c.hasAgeText);
    const noBadgeHasText = analysis.cardsWithoutBadges.filter(c => c.hasAgeText);

    if (noBadgeHasText.length > 0) {
      console.log(`🐛 BUG: ${noBadgeHasText.length} cards have age text but NO badge:`);
      noBadgeHasText.forEach(c => console.log(`   - Card ${c.index}: "${c.ageText}"`));
    }

    if (noBadgeNoText.length > 0) {
      console.log(`\n⚠️ ${noBadgeNoText.length} cards have NO age text visible in DOM.`);
      console.log('   These need age from detail panel (click card first).');
    }

    // Keep browser open
    console.log('\n\nBrowser will stay open for 2 minutes. Press Ctrl+C to close.\n');
    await page.waitForTimeout(120000);

    await context.close();
    fs.rmSync(tempUserDataDir, { recursive: true, force: true });

  } catch (error) {
    console.error('Error:', error.message);
  }
})();
