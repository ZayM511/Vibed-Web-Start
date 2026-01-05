const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false, channel: 'chrome' });
  const page = await browser.newPage();

  console.log('Navigating to Indeed...');
  await page.goto('https://www.indeed.com/jobs?q=software+engineer&l=remote', {
    waitUntil: 'domcontentloaded',
    timeout: 60000
  });

  // Wait longer for dynamic content
  await page.waitForTimeout(8000);

  // Get detailed info about first job card
  const cardInfo = await page.evaluate(() => {
    const results = [];
    const jobCards = document.querySelectorAll('.job_seen_beacon');

    // Analyze first 3 cards
    Array.from(jobCards).slice(0, 3).forEach((card, idx) => {
      const cardData = {
        cardIdx: idx,
        fullText: card.textContent.replace(/\s+/g, ' ').trim().substring(0, 500),
        allSpans: [],
        metadataElements: []
      };

      // Get all spans with their text
      card.querySelectorAll('span').forEach(span => {
        const text = span.textContent.trim();
        if (text && text.length < 50 && text.length > 0) {
          cardData.allSpans.push({
            class: span.className?.substring(0, 80) || '',
            text: text
          });
        }
      });

      // Look for metadata containers
      card.querySelectorAll('[class*="metadata"], [class*="snippet"], [class*="footer"], [class*="info"]').forEach(el => {
        cardData.metadataElements.push({
          class: el.className?.substring(0, 100) || '',
          text: el.textContent.trim().substring(0, 100)
        });
      });

      results.push(cardData);
    });

    return results;
  });

  console.log('\n=== FIRST 3 JOB CARD ANALYSIS ===\n');

  cardInfo.forEach(card => {
    console.log(`\n--- CARD ${card.cardIdx} ---`);
    console.log('Full text (first 500 chars):', card.fullText);

    console.log('\nSpans with content:');
    card.allSpans.forEach(s => {
      // Highlight potential date-like content
      const isDateLike = /\d/.test(s.text) && (
        s.text.match(/ago|day|hour|week|month|posted|active/i) ||
        s.text.match(/^\d+[dhwm]$/i)
      );
      if (isDateLike) {
        console.log(`  *** "${s.text}" (class: ${s.class})`);
      }
    });

    console.log('\nMetadata elements:');
    card.metadataElements.slice(0, 5).forEach(m => {
      console.log(`  class: ${m.class}`);
      console.log(`  text: ${m.text}`);
      console.log('  ---');
    });
  });

  // Also check for any element containing "Posted" or time-related words
  const timeElements = await page.evaluate(() => {
    const results = [];
    const allElements = document.querySelectorAll('.job_seen_beacon *');

    allElements.forEach(el => {
      const text = el.textContent?.trim() || '';
      // Only direct text content (not from children)
      const directText = Array.from(el.childNodes)
        .filter(n => n.nodeType === 3) // Text nodes only
        .map(n => n.textContent.trim())
        .join(' ')
        .trim();

      if (directText && (
        directText.match(/posted|ago|day|hour|active/i) ||
        directText.match(/^\d+[dhwm]$/i)
      )) {
        results.push({
          tag: el.tagName,
          class: el.className?.substring(0, 80) || '',
          directText: directText.substring(0, 50)
        });
      }
    });

    return results.slice(0, 20);
  });

  console.log('\n=== ELEMENTS WITH DATE-LIKE DIRECT TEXT ===');
  timeElements.forEach(el => {
    console.log(`<${el.tag}> class="${el.class}" -> "${el.directText}"`);
  });

  console.log('\nBrowser staying open for 20 seconds...');
  await page.waitForTimeout(20000);

  await browser.close();
})();
