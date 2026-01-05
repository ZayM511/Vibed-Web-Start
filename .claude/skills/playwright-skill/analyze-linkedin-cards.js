const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 50 });
  const page = await browser.newPage();

  console.log('Navigating to LinkedIn Jobs...');
  await page.goto('https://www.linkedin.com/jobs/search/?keywords=software%20engineer');

  console.log('\nWaiting for job cards to load...');
  await page.waitForTimeout(5000);

  console.log('\n=== ANALYZING JOB CARD STRUCTURES ===\n');

  // Analyze different types of job cards
  const analysis = await page.evaluate(() => {
    const results = {
      cardTypes: [],
      dismissButtons: [],
      timeElements: [],
      recommendations: []
    };

    // Find all potential job cards
    const cardSelectors = [
      '.jobs-search__results-list > li',
      '.scaffold-layout__list-item',
      'li.jobs-search-results__list-item',
      '.job-card-container',
      '.jobs-unified-list li',
      '.jobs-job-card-list li',
      '.job-card-list__entity-lockup'
    ];

    const allCards = new Set();
    cardSelectors.forEach(sel => {
      document.querySelectorAll(sel).forEach(c => allCards.add(c));
    });

    let cardIndex = 0;
    for (const card of allCards) {
      if (cardIndex >= 5) break; // Analyze first 5 cards
      cardIndex++;

      const cardInfo = {
        index: cardIndex,
        tagName: card.tagName,
        className: card.className,
        hasTime: false,
        timeElementInfo: null,
        hasDismissButton: false,
        dismissButtonPosition: null,
        innerContainers: [],
        computedPosition: window.getComputedStyle(card).position
      };

      // Check for time elements
      const timeEl = card.querySelector('time');
      if (timeEl) {
        cardInfo.hasTime = true;
        cardInfo.timeElementInfo = {
          datetime: timeEl.getAttribute('datetime'),
          textContent: timeEl.textContent.trim(),
          parentClass: timeEl.parentElement?.className || 'none'
        };
      }

      // Check for dismiss button (X button)
      const dismissSelectors = [
        'button[data-control-name*="dismiss"]',
        'button[aria-label*="Dismiss"]',
        'button[aria-label*="dismiss"]',
        'button[aria-label*="Remove"]',
        'button[aria-label*="remove"]',
        '.artdeco-button--circle[aria-label]',
        'button.job-card-container__action',
        '[class*="dismiss"]',
        'button.artdeco-button--tertiary'
      ];

      for (const sel of dismissSelectors) {
        const btn = card.querySelector(sel);
        if (btn) {
          const rect = btn.getBoundingClientRect();
          const cardRect = card.getBoundingClientRect();
          cardInfo.hasDismissButton = true;
          cardInfo.dismissButtonPosition = {
            selector: sel,
            ariaLabel: btn.getAttribute('aria-label'),
            relativeTop: rect.top - cardRect.top,
            relativeRight: cardRect.right - rect.right,
            width: rect.width,
            height: rect.height
          };
          break;
        }
      }

      // Check for inner containers
      const innerSelectors = [
        '.job-card-container',
        '.job-card-list__entity-lockup',
        '.artdeco-entity-lockup',
        '.job-card-container__link'
      ];

      innerSelectors.forEach(sel => {
        const inner = card.querySelector(sel);
        if (inner) {
          cardInfo.innerContainers.push({
            selector: sel,
            position: window.getComputedStyle(inner).position
          });
        }
      });

      results.cardTypes.push(cardInfo);
    }

    // Specific analysis of dismiss buttons across the page
    const allDismissButtons = document.querySelectorAll('button[aria-label*="Dismiss"], button[aria-label*="dismiss"], button[aria-label*="Remove"]');
    allDismissButtons.forEach((btn, idx) => {
      if (idx >= 3) return;
      results.dismissButtons.push({
        ariaLabel: btn.getAttribute('aria-label'),
        className: btn.className,
        parentClass: btn.parentElement?.className || 'none'
      });
    });

    // Find all time elements to understand time patterns
    const allTimeElements = document.querySelectorAll('time');
    allTimeElements.forEach((time, idx) => {
      if (idx >= 5) return;
      results.timeElements.push({
        datetime: time.getAttribute('datetime'),
        textContent: time.textContent.trim().substring(0, 50),
        closestCardClass: time.closest('.scaffold-layout__list-item, .job-card-container, li')?.className?.substring(0, 80) || 'none'
      });
    });

    return results;
  });

  console.log('Card Types Found:');
  console.log(JSON.stringify(analysis.cardTypes, null, 2));

  console.log('\n=== Dismiss Buttons ===');
  console.log(JSON.stringify(analysis.dismissButtons, null, 2));

  console.log('\n=== Time Elements ===');
  console.log(JSON.stringify(analysis.timeElements, null, 2));

  // Take a screenshot
  await page.screenshot({ path: '/tmp/linkedin-cards-analysis.png', fullPage: false });
  console.log('\n📸 Screenshot saved to /tmp/linkedin-cards-analysis.png');

  // Wait a bit for user to see
  await page.waitForTimeout(3000);

  await browser.close();
  console.log('\nAnalysis complete!');
})();
