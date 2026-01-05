const { chromium } = require('playwright');

(async () => {
  console.log('Testing JobFiltr Job Age Badge Display on LinkedIn\n');
  console.log('='.repeat(60));

  const browser = await chromium.launch({
    headless: false,
    slowMo: 100,
    args: [
      '--disable-extensions-except=C:\\Users\\isaia\\OneDrive\\Documents\\2025 Docs\\Claude Copy\\Vibed-Web-Start-1\\chrome-extension',
      '--load-extension=C:\\Users\\isaia\\OneDrive\\Documents\\2025 Docs\\Claude Copy\\Vibed-Web-Start-1\\chrome-extension'
    ]
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();

  console.log('\n1. Navigating to LinkedIn Jobs...');
  await page.goto('https://www.linkedin.com/jobs/search/?keywords=software%20engineer');
  await page.waitForTimeout(5000);

  console.log('\n2. Waiting for job cards to load...');
  await page.waitForSelector('.job-card-container, .scaffold-layout__list-item, .jobs-search-results__list-item', { timeout: 15000 });
  await page.waitForTimeout(3000);

  console.log('\n3. Analyzing job cards and badges...');

  const analysis = await page.evaluate(() => {
    const results = {
      totalCards: 0,
      cardsWithBadges: 0,
      cardsWithoutBadges: [],
      dismissibleCards: 0,
      dismissibleWithBadges: 0,
      badgePositions: [],
      activeCard: null
    };

    // Find all job cards
    const cardSelectors = [
      '.scaffold-layout__list-item',
      'li.jobs-search-results__list-item',
      '.job-card-container',
      '.jobs-unified-list li',
      '.jobs-job-card-list li'
    ];

    const allCards = new Set();
    cardSelectors.forEach(sel => {
      document.querySelectorAll(sel).forEach(c => allCards.add(c));
    });

    results.totalCards = allCards.size;

    for (const card of allCards) {
      // Skip hidden cards
      if (card.style.display === 'none') continue;

      // Check for age badge
      const badge = card.querySelector('.jobfiltr-age-badge');
      if (badge) {
        results.cardsWithBadges++;

        // Record badge position
        const rect = badge.getBoundingClientRect();
        const cardRect = card.getBoundingClientRect();
        results.badgePositions.push({
          right: cardRect.right - rect.right,
          top: rect.top - cardRect.top
        });
      } else {
        // Record info about cards without badges
        const title = card.querySelector('a[data-control-name], .job-card-container__link, .job-card-list__title')?.textContent?.trim()?.substring(0, 50) || 'Unknown';
        const hasTimeElement = !!card.querySelector('time');
        results.cardsWithoutBadges.push({
          title,
          hasTimeElement,
          className: card.className.substring(0, 80)
        });
      }

      // Check for dismiss button (X button)
      const dismissSelectors = [
        'button[aria-label*="Dismiss"]',
        'button[aria-label*="dismiss"]',
        'button[aria-label*="Remove"]',
        '.job-card-container__action'
      ];

      for (const sel of dismissSelectors) {
        if (card.querySelector(sel)) {
          results.dismissibleCards++;
          if (badge) results.dismissibleWithBadges++;
          break;
        }
      }

      // Check if active
      if (card.classList.contains('scaffold-layout__list-item--active') ||
          card.classList.contains('job-card-container--active') ||
          /active|selected/i.test(card.className)) {
        results.activeCard = {
          hasBadge: !!badge,
          title: card.querySelector('a')?.textContent?.trim()?.substring(0, 50) || 'Unknown'
        };
      }
    }

    // Check detail panel for age badge
    const detailBadge = document.querySelector('.jobfiltr-detail-age-badge');
    results.detailPanelHasBadge = !!detailBadge;
    if (detailBadge) {
      results.detailBadgeText = detailBadge.textContent.trim().substring(0, 50);
    }

    return results;
  });

  console.log('\n=== RESULTS ===');
  console.log(`Total job cards found: ${analysis.totalCards}`);
  console.log(`Cards with age badges: ${analysis.cardsWithBadges}`);
  console.log(`Cards without badges: ${analysis.cardsWithoutBadges.length}`);
  console.log(`Dismissible cards: ${analysis.dismissibleCards}`);
  console.log(`Dismissible cards with badges: ${analysis.dismissibleWithBadges}`);
  console.log(`Detail panel has badge: ${analysis.detailPanelHasBadge}`);

  if (analysis.activeCard) {
    console.log(`\nActive card: "${analysis.activeCard.title}"`);
    console.log(`Active card has badge: ${analysis.activeCard.hasBadge}`);
  }

  if (analysis.cardsWithoutBadges.length > 0) {
    console.log('\n--- Cards without badges ---');
    analysis.cardsWithoutBadges.slice(0, 5).forEach((card, i) => {
      console.log(`${i+1}. "${card.title}" - Has time element: ${card.hasTimeElement}`);
    });
  }

  if (analysis.badgePositions.length > 0) {
    console.log('\n--- Badge positions (first 5) ---');
    analysis.badgePositions.slice(0, 5).forEach((pos, i) => {
      console.log(`${i+1}. Right offset: ${pos.right.toFixed(0)}px, Top offset: ${pos.top.toFixed(0)}px`);
    });
  }

  // Take screenshot
  await page.screenshot({ path: '/tmp/linkedin-job-age-test.png', fullPage: false });
  console.log('\nScreenshot saved to /tmp/linkedin-job-age-test.png');

  console.log('\n4. Testing click on different job cards...');

  // Click on a few different job cards
  const jobCards = await page.$$('.scaffold-layout__list-item, .job-card-container');
  const cardsToTest = Math.min(3, jobCards.length);

  for (let i = 0; i < cardsToTest; i++) {
    console.log(`\nClicking job card ${i + 1}...`);
    await jobCards[i].click();
    await page.waitForTimeout(2000);

    const clickAnalysis = await page.evaluate((index) => {
      const cards = document.querySelectorAll('.scaffold-layout__list-item, .job-card-container');
      const clickedCard = cards[index];
      const badge = clickedCard?.querySelector('.jobfiltr-age-badge');
      const detailBadge = document.querySelector('.jobfiltr-detail-age-badge');

      return {
        cardHasBadge: !!badge,
        cardBadgeAge: badge?.dataset?.age || null,
        detailHasBadge: !!detailBadge,
        detailBadgeText: detailBadge?.textContent?.trim()?.substring(0, 30) || null
      };
    }, i);

    console.log(`Card ${i+1} badge: ${clickAnalysis.cardHasBadge ? `Yes (${clickAnalysis.cardBadgeAge} days)` : 'No'}`);
    console.log(`Detail panel badge: ${clickAnalysis.detailHasBadge ? `Yes - ${clickAnalysis.detailBadgeText}` : 'No'}`);
  }

  console.log('\n='.repeat(60));
  console.log('Test complete! Keeping browser open for 30 seconds for manual inspection...');
  await page.waitForTimeout(30000);

  await browser.close();
  console.log('Browser closed.');
})();
