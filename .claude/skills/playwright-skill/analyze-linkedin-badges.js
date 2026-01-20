// Analyze LinkedIn job cards to understand why some have badges and others don't
// Uses stealth connection to user's Chrome with their profile

const { chromium } = require('playwright');
const { execSync, spawn } = require('child_process');
const path = require('path');

const TARGET_URL = 'https://www.linkedin.com/jobs/search/?keywords=software%20engineer';
const EXTENSION_PATH = path.resolve(__dirname, '../../../chrome-extension');

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

(async () => {
  console.log('=== LinkedIn Badge Analysis ===\n');

  try {
    // Step 1: Close existing Chrome
    console.log('Step 1: Closing existing Chrome instances...');
    try {
      execSync('taskkill /F /IM chrome.exe', { stdio: 'ignore' });
    } catch (e) {}
    await sleep(3000);

    // Step 2: Launch Chrome with user profile and remote debugging
    console.log('Step 2: Launching Chrome with your profile...');

    const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
    const userDataDir = path.join(process.env.LOCALAPPDATA, 'Google', 'Chrome', 'User Data');

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

    console.log('Waiting for Chrome to start...');
    await sleep(10000);

    // Step 3: Connect via CDP
    console.log('\nStep 3: Connecting to Chrome...');

    let browser;
    for (let i = 0; i < 5; i++) {
      try {
        browser = await chromium.connectOverCDP('http://localhost:9222');
        console.log('✅ Connected!\n');
        break;
      } catch (e) {
        console.log(`Attempt ${i + 1} failed, retrying...`);
        await sleep(2000);
      }
    }

    if (!browser) {
      throw new Error('Could not connect to Chrome');
    }

    // Get LinkedIn page
    const contexts = browser.contexts();
    let page = null;

    for (const context of contexts) {
      const pages = context.pages();
      for (const p of pages) {
        if (p.url().includes('linkedin.com')) {
          page = p;
          break;
        }
      }
      if (page) break;
    }

    if (!page) {
      console.log('No LinkedIn page found');
      await browser.close();
      return;
    }

    // Wait for page to fully load
    console.log('Waiting for page to load and extension to process...');
    await sleep(8000);

    // Take screenshot
    await page.screenshot({ path: '/tmp/linkedin-badges-analysis.png', fullPage: false });
    console.log('📸 Screenshot: /tmp/linkedin-badges-analysis.png\n');

    // Analyze job cards
    console.log('=== Analyzing Job Cards ===\n');

    const analysis = await page.evaluate(() => {
      const results = {
        totalCards: 0,
        cardsWithBadges: 0,
        cardsWithoutBadges: 0,
        cardsWithAgeText: 0,
        cardsWithoutAgeText: 0,
        cards: []
      };

      // Find all job cards
      const cardSelectors = [
        'li:has(a[href*="/jobs/view/"])',
        '.scaffold-layout__list-item',
        '.jobs-search-results__list-item'
      ];

      const allCards = new Set();
      for (const sel of cardSelectors) {
        try {
          document.querySelectorAll(sel).forEach(c => allCards.add(c));
        } catch (e) {}
      }

      const cards = [...allCards].slice(0, 15); // Analyze first 15 cards
      results.totalCards = cards.length;

      cards.forEach((card, i) => {
        const badge = card.querySelector('.jobfiltr-age-badge');
        const cardText = card.textContent || '';

        // Check for time patterns in card text
        const timePatterns = [
          /(\d+)\s*(?:hours?|hr)\s*ago/i,
          /(\d+)\s*(?:days?|d)\s*ago/i,
          /(\d+)\s*(?:weeks?|w)\s*ago/i,
          /(\d+)\s*(?:months?|mo)\s*ago/i,
          /\b(\d+)d\b/,
          /\b(\d+)w\b/,
          /\b(\d+)mo\b/,
          /just\s*now/i,
          /today/i,
          /yesterday/i
        ];

        let hasAgeText = false;
        let ageTextFound = null;
        for (const pattern of timePatterns) {
          const match = cardText.match(pattern);
          if (match) {
            hasAgeText = true;
            ageTextFound = match[0];
            break;
          }
        }

        // Get job title for identification
        const titleEl = card.querySelector('a[href*="/jobs/view/"]');
        const title = titleEl?.textContent?.trim()?.substring(0, 40) || 'Unknown';

        // Check for cached age
        const cachedAge = card.dataset.jobfiltrAge;

        // Check if card is active
        const isActive = /active|selected/i.test(card.className);

        const cardInfo = {
          index: i,
          title: title,
          hasBadge: !!badge,
          badgeAge: badge?.dataset?.age || null,
          hasAgeText: hasAgeText,
          ageTextFound: ageTextFound,
          cachedAge: cachedAge || null,
          isActive: isActive,
          cardClasses: card.className?.split(' ').slice(0, 3).join(' ') || ''
        };

        results.cards.push(cardInfo);

        if (badge) results.cardsWithBadges++;
        else results.cardsWithoutBadges++;

        if (hasAgeText) results.cardsWithAgeText++;
        else results.cardsWithoutAgeText++;
      });

      return results;
    });

    // Print analysis
    console.log(`Total cards analyzed: ${analysis.totalCards}`);
    console.log(`Cards WITH badges: ${analysis.cardsWithBadges}`);
    console.log(`Cards WITHOUT badges: ${analysis.cardsWithoutBadges}`);
    console.log(`Cards with age text in DOM: ${analysis.cardsWithAgeText}`);
    console.log(`Cards without age text: ${analysis.cardsWithoutAgeText}\n`);

    console.log('--- Individual Card Analysis ---\n');
    analysis.cards.forEach(card => {
      const badgeStatus = card.hasBadge ? `✅ Badge (${card.badgeAge} days)` : '❌ No badge';
      const textStatus = card.hasAgeText ? `Has text: "${card.ageTextFound}"` : 'No age text';
      const activeStatus = card.isActive ? ' [ACTIVE]' : '';

      console.log(`Card ${card.index}: ${card.title}...${activeStatus}`);
      console.log(`  ${badgeStatus}`);
      console.log(`  ${textStatus}`);
      console.log(`  Cached age: ${card.cachedAge || 'none'}`);
      console.log('');
    });

    // Key insight
    console.log('=== KEY INSIGHT ===');
    const noBadgeNoText = analysis.cards.filter(c => !c.hasBadge && !c.hasAgeText);
    const noBadgeHasText = analysis.cards.filter(c => !c.hasBadge && c.hasAgeText);

    if (noBadgeNoText.length > 0) {
      console.log(`\n${noBadgeNoText.length} cards have NO badge AND NO age text in DOM.`);
      console.log('These cards need age from detail panel or another source.');
    }

    if (noBadgeHasText.length > 0) {
      console.log(`\n${noBadgeHasText.length} cards have age text but NO badge - this is a BUG!`);
      console.log('The extension should be extracting age from these cards.');
    }

    // Scroll down and check more
    console.log('\n\nScrolling down to check lazy-loaded cards...');
    await page.evaluate(() => window.scrollBy(0, 500));
    await sleep(3000);

    // Take another screenshot
    await page.screenshot({ path: '/tmp/linkedin-badges-scrolled.png', fullPage: false });
    console.log('📸 Screenshot after scroll: /tmp/linkedin-badges-scrolled.png');

    console.log('\n=== Analysis Complete ===');
    console.log('Browser will stay open. Close manually when done.\n');

    await browser.close(); // Just disconnects, Chrome stays open

  } catch (error) {
    console.error('Error:', error.message);
  }
})();
