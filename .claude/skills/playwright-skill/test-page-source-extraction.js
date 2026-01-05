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

  console.log('\n=== TESTING PAGE SOURCE EXTRACTION ===\n');

  // Simulate exactly what the content script does
  const extractionResult = await page.evaluate(() => {
    const jobAgeCache = {};
    const now = Date.now();
    const logs = [];

    const scripts = document.querySelectorAll('script');
    logs.push(`Found ${scripts.length} script tags`);

    for (const script of scripts) {
      const text = script.textContent || '';

      // Look for the mosaic provider data script
      if (text.includes('mosaic-provider-jobcards') && text.includes('mosaicProviderJobCardsModel')) {
        logs.push('Found mosaic-provider-jobcards script');

        // Try to find and parse the results array
        const resultsMatch = text.match(/"results"\s*:\s*\[[\s\S]*?\]\s*,\s*"(?:pagination|meta)/);
        if (resultsMatch) {
          logs.push('Found results match');
          try {
            // Extract just the array portion
            const arrayStart = text.indexOf(resultsMatch[0]);
            const arrayStartIndex = text.indexOf('[', arrayStart);

            // Find the matching closing bracket
            let depth = 0;
            let arrayEndIndex = arrayStartIndex;
            for (let i = arrayStartIndex; i < text.length; i++) {
              if (text[i] === '[') depth++;
              if (text[i] === ']') depth--;
              if (depth === 0) {
                arrayEndIndex = i;
                break;
              }
            }

            const arrayStr = text.substring(arrayStartIndex, arrayEndIndex + 1);
            logs.push(`Array string length: ${arrayStr.length}`);

            const jobs = JSON.parse(arrayStr);
            logs.push(`Parsed ${jobs.length} jobs`);

            if (Array.isArray(jobs)) {
              jobs.forEach(job => {
                if (!job.jobkey) return;

                let ageDays = null;

                // Priority 1: pubDate
                if (job.pubDate && job.pubDate > 0) {
                  ageDays = Math.floor((now - job.pubDate) / (1000 * 60 * 60 * 24));
                  if (ageDays < 0) ageDays = 0;
                }

                // Priority 2: createDate
                if (ageDays === null && job.createDate && job.createDate > 0) {
                  ageDays = Math.floor((now - job.createDate) / (1000 * 60 * 60 * 24));
                  if (ageDays < 0) ageDays = 0;
                }

                // Priority 3: formattedRelativeTime
                if (ageDays === null && job.formattedRelativeTime) {
                  const relTime = job.formattedRelativeTime.toLowerCase();
                  if (relTime.includes('just') || relTime.includes('today') || relTime.includes('hour') || relTime.includes('minute')) {
                    ageDays = 0;
                  } else if (relTime.includes('30+')) {
                    ageDays = 30;
                  } else {
                    const numMatch = relTime.match(/(\d+)/);
                    if (numMatch) {
                      const num = parseInt(numMatch[1]);
                      if (relTime.includes('day')) ageDays = num;
                      else if (relTime.includes('week')) ageDays = num * 7;
                      else if (relTime.includes('month')) ageDays = num * 30;
                    }
                  }
                }

                if (ageDays !== null && ageDays >= 0) {
                  jobAgeCache[job.jobkey] = ageDays;
                }
              });

              logs.push(`Cached ${Object.keys(jobAgeCache).length} job ages`);
            }
          } catch (parseError) {
            logs.push(`Parse error: ${parseError.message}`);
          }
        } else {
          logs.push('Results match not found');
        }
      }
    }

    return {
      logs,
      cacheSize: Object.keys(jobAgeCache).length,
      sampleEntries: Object.entries(jobAgeCache).slice(0, 5).map(([k, v]) => ({ jobKey: k, days: v }))
    };
  });

  console.log('Extraction logs:');
  extractionResult.logs.forEach(log => console.log('  ' + log));

  console.log('\nCache size:', extractionResult.cacheSize);
  if (extractionResult.sampleEntries.length > 0) {
    console.log('Sample entries:');
    extractionResult.sampleEntries.forEach(e => console.log(`  ${e.jobKey}: ${e.days} days`));
  }

  console.log('\nBrowser staying open for 20 seconds...');
  await page.waitForTimeout(20000);

  await browser.close();
})();
