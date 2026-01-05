const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false, channel: 'chrome' });
  const page = await browser.newPage();

  console.log('Navigating to Indeed...');
  await page.goto('https://www.indeed.com/jobs?q=software+engineer&l=', {
    waitUntil: 'domcontentloaded',
    timeout: 60000
  });

  await page.waitForTimeout(8000);

  // Test our updated selectors
  const results = await page.evaluate(() => {
    const output = {
      foundDates: [],
      allTextWithAgo: [],
      jobCardsCount: 0
    };

    const jobCards = document.querySelectorAll('.job_seen_beacon');
    output.jobCardsCount = jobCards.length;

    // Our updated selectors
    const timeSelectors = [
      '.date',
      'span.date',
      '[data-testid="job-age"]',
      '[data-testid="myJobsStateDate"]',
      '.jobsearch-HiringInsights-entry--age',
      '[class*="EmployerActive"]',
      '[class*="employer-active"]',
      '.jobMetaDataGroup span',
      '.jobsearch-JobMetadataFooter span',
      '[class*="posted"]',
      '[class*="date"]',
      '[class*="age"]'
    ];

    jobCards.forEach((card, idx) => {
      if (idx >= 5) return; // Only check first 5 cards

      for (const selector of timeSelectors) {
        const elems = card.querySelectorAll(selector);
        elems.forEach(elem => {
          const text = elem.textContent.trim();
          if (text && text.length < 100 && text.match(/ago|day|hour|posted|active|today|just/i)) {
            output.foundDates.push({
              cardIdx: idx,
              selector,
              text
            });
          }
        });
      }

      // Also check full text
      const fullText = card.textContent;
      const agoMatches = fullText.match(/\b\w+\s*\d*\s*\w*\s*ago\b/gi);
      if (agoMatches) {
        agoMatches.forEach(m => {
          output.allTextWithAgo.push({ cardIdx: idx, match: m });
        });
      }
    });

    return output;
  });

  console.log(`\nFound ${results.jobCardsCount} job cards`);

  console.log('\n=== DATES FOUND WITH SELECTORS ===');
  if (results.foundDates.length === 0) {
    console.log('  (none found)');
  } else {
    results.foundDates.forEach(d => console.log(`  Card ${d.cardIdx}: [${d.selector}] "${d.text}"`));
  }

  console.log('\n=== TEXT CONTAINING "AGO" ===');
  if (results.allTextWithAgo.length === 0) {
    console.log('  (none found)');
  } else {
    results.allTextWithAgo.forEach(d => console.log(`  Card ${d.cardIdx}: "${d.match}"`));
  }

  // Check if dates appear in the job details panel
  console.log('\n--- Clicking first job to check details panel ---');
  try {
    await page.click('.job_seen_beacon', { timeout: 3000 });
    await page.waitForTimeout(3000);

    const detailsDates = await page.evaluate(() => {
      const panel = document.querySelector('.jobsearch-ViewJobLayout, .jobsearch-JobComponent, [class*="jobsearch"]');
      if (!panel) return { found: false, text: '' };

      const text = panel.textContent;
      const matches = text.match(/\b(?:posted|active|employer\s*active)\s*\d+\s*\w+\s*ago\b/gi);
      return {
        found: matches && matches.length > 0,
        matches: matches || [],
        excerpt: text.substring(0, 500).replace(/\s+/g, ' ')
      };
    });

    console.log('Details panel has date info:', detailsDates.found);
    if (detailsDates.matches.length > 0) {
      console.log('Matches:', detailsDates.matches);
    }
  } catch (e) {
    console.log('Could not check details panel:', e.message);
  }

  console.log('\nBrowser staying open for 20 seconds...');
  await page.waitForTimeout(20000);

  await browser.close();
})();
