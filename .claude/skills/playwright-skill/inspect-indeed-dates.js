const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false, channel: 'chrome' });
  const page = await browser.newPage();

  console.log('Navigating to Indeed...');
  await page.goto('https://www.indeed.com/jobs?q=software+engineer&l=remote', {
    waitUntil: 'domcontentloaded',
    timeout: 60000
  });

  await page.waitForTimeout(5000);

  // Inspect the DOM for date-related elements
  const dateInfo = await page.evaluate(() => {
    const results = {
      dateClasses: new Set(),
      dateTexts: [],
      possibleDateElements: []
    };

    // Get first few job cards
    const jobCards = document.querySelectorAll('.job_seen_beacon');
    const cardsToCheck = Array.from(jobCards).slice(0, 5);

    cardsToCheck.forEach((card, idx) => {
      const cardText = card.textContent;

      // Look for date-related text patterns
      const datePatterns = [
        /posted\s*\d+\s*days?\s*ago/gi,
        /\d+\s*days?\s*ago/gi,
        /\d+\s*hours?\s*ago/gi,
        /just\s*posted/gi,
        /today/gi,
        /\d+d\s*ago/gi,
        /active\s*\d+\s*days?\s*ago/gi
      ];

      datePatterns.forEach(pattern => {
        const matches = cardText.match(pattern);
        if (matches) {
          matches.forEach(m => results.dateTexts.push({ cardIdx: idx, text: m }));
        }
      });

      // Look for elements with date-related classes or attributes
      const allElements = card.querySelectorAll('*');
      allElements.forEach(el => {
        const className = el.className?.toString() || '';
        const testId = el.getAttribute('data-testid') || '';
        const text = el.textContent?.trim().substring(0, 100) || '';

        // Check for date-related classes
        if (className.match(/date|time|age|posted|ago/i)) {
          results.possibleDateElements.push({
            cardIdx: idx,
            tag: el.tagName,
            className: className.substring(0, 100),
            testId,
            text: text.substring(0, 50)
          });
        }

        // Check for data-testid with date-related names
        if (testId.match(/date|time|age|posted/i)) {
          results.possibleDateElements.push({
            cardIdx: idx,
            tag: el.tagName,
            className: className.substring(0, 100),
            testId,
            text: text.substring(0, 50)
          });
        }

        // Check for span/div containing date-like text
        if (el.tagName === 'SPAN' || el.tagName === 'DIV') {
          if (text.match(/^\d+\s*(days?|hours?|d|h)\s*ago$/i) ||
              text.match(/^posted\s*\d+/i) ||
              text.match(/^just\s*posted$/i) ||
              text.match(/^today$/i) ||
              text.match(/^active\s*\d+/i)) {
            results.possibleDateElements.push({
              cardIdx: idx,
              tag: el.tagName,
              className: className.substring(0, 100),
              testId,
              text: text.substring(0, 50),
              isDateText: true
            });
          }
        }
      });
    });

    return {
      dateTexts: results.dateTexts,
      possibleDateElements: results.possibleDateElements
    };
  });

  console.log('\n=== DATE TEXTS FOUND IN JOB CARDS ===');
  dateInfo.dateTexts.forEach(d => console.log(`Card ${d.cardIdx}: "${d.text}"`));

  console.log('\n=== POSSIBLE DATE ELEMENTS ===');
  dateInfo.possibleDateElements.forEach(el => {
    console.log(`Card ${el.cardIdx}: <${el.tag}> class="${el.className}" testId="${el.testId}" text="${el.text}" ${el.isDateText ? '*** DATE TEXT ***' : ''}`);
  });

  await page.screenshot({ path: '/tmp/indeed-dates-inspect.png', fullPage: false });
  console.log('\nScreenshot saved to /tmp/indeed-dates-inspect.png');

  console.log('\nBrowser staying open for 30 seconds for manual inspection...');
  await page.waitForTimeout(30000);

  await browser.close();
})();
