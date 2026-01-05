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

  console.log('\n=== ANALYZING SCRIPT STRUCTURE ===\n');

  const analysis = await page.evaluate(() => {
    const results = {};
    const scripts = document.querySelectorAll('script');

    for (const script of scripts) {
      const text = script.textContent || '';

      if (text.includes('mosaic-provider-jobcards') && text.includes('mosaicProviderJobCardsModel')) {
        results.found = true;
        results.length = text.length;

        // Find where "results" appears
        const resultsIndex = text.indexOf('"results"');
        if (resultsIndex !== -1) {
          results.resultsContext = text.substring(resultsIndex, resultsIndex + 200);

          // Find where the array starts after "results"
          const afterResults = text.substring(resultsIndex, resultsIndex + 50);
          results.afterResults = afterResults;

          // Check what comes after the results array
          // Find the first [ after "results"
          const bracketIndex = text.indexOf('[', resultsIndex);
          if (bracketIndex !== -1) {
            // Find what comes before the array closes
            let depth = 0;
            let endIndex = bracketIndex;
            for (let i = bracketIndex; i < text.length && i < bracketIndex + 50000; i++) {
              if (text[i] === '[') depth++;
              if (text[i] === ']') depth--;
              if (depth === 0) {
                endIndex = i;
                break;
              }
            }

            results.arrayStart = bracketIndex;
            results.arrayEnd = endIndex;

            // What comes after the array?
            results.afterArray = text.substring(endIndex, endIndex + 50);
          }
        }

        // Look for jobkey pattern
        const jobkeyMatch = text.match(/"jobkey"\s*:\s*"([^"]+)"/);
        if (jobkeyMatch) {
          results.hasJobkey = true;
          results.sampleJobkey = jobkeyMatch[1];
        }

        // Look for pubDate pattern
        const pubDateMatch = text.match(/"pubDate"\s*:\s*(\d+)/);
        if (pubDateMatch) {
          results.hasPubDate = true;
          results.samplePubDate = pubDateMatch[1];
        }

        // Look for formattedRelativeTime
        const relTimeMatch = text.match(/"formattedRelativeTime"\s*:\s*"([^"]+)"/);
        if (relTimeMatch) {
          results.hasFormattedRelativeTime = true;
          results.sampleRelTime = relTimeMatch[1];
        }

        break;
      }
    }

    return results;
  });

  console.log('Analysis:', JSON.stringify(analysis, null, 2));

  console.log('\nBrowser staying open for 15 seconds...');
  await page.waitForTimeout(15000);

  await browser.close();
})();
