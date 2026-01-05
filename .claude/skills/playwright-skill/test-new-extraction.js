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

  console.log('\n=== TESTING NEW EXTRACTION LOGIC ===\n');

  const extractionResult = await page.evaluate(() => {
    const jobAgeCache = {};
    const now = Date.now();
    const logs = [];

    const scripts = document.querySelectorAll('script');
    logs.push(`Found ${scripts.length} script tags`);

    for (const script of scripts) {
      const text = script.textContent || '';

      // Look for the mosaic provider data script with job data
      if (text.includes('mosaic-provider-jobcards') && text.includes('jobkey') && text.includes('pubDate')) {
        logs.push('Found mosaic-provider-jobcards script with jobkey and pubDate');

        // Find all job entries with jobkey and extract their data
        const jobkeyPattern = /"jobkey"\s*:\s*"([a-f0-9]+)"/gi;
        let match;
        let matchCount = 0;

        while ((match = jobkeyPattern.exec(text)) !== null) {
          matchCount++;
          const jobKey = match[1];
          const matchPos = match.index;

          // Don't re-extract if already in cache
          if (jobAgeCache[jobKey]) continue;

          // Look for pubDate within 1500 chars after jobkey
          const searchWindow = text.substring(matchPos, matchPos + 1500);

          let ageDays = null;

          // Try pubDate first
          const pubDateMatch = searchWindow.match(/"pubDate"\s*:\s*(\d+)/);
          if (pubDateMatch) {
            const pubDate = parseInt(pubDateMatch[1]);
            if (pubDate > 1000000000000) {
              ageDays = Math.floor((now - pubDate) / (1000 * 60 * 60 * 24));
              if (ageDays < 0) ageDays = 0;
            }
          }

          // Try createDate if pubDate not found
          if (ageDays === null) {
            const createDateMatch = searchWindow.match(/"createDate"\s*:\s*(\d+)/);
            if (createDateMatch) {
              const createDate = parseInt(createDateMatch[1]);
              if (createDate > 1000000000000) {
                ageDays = Math.floor((now - createDate) / (1000 * 60 * 60 * 24));
                if (ageDays < 0) ageDays = 0;
              }
            }
          }

          // Fallback to formattedRelativeTime
          if (ageDays === null) {
            const relTimeMatch = searchWindow.match(/"formattedRelativeTime"\s*:\s*"([^"]+)"/);
            if (relTimeMatch) {
              const relTime = relTimeMatch[1].toLowerCase();
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
                  else ageDays = num;
                }
              }
            }
          }

          if (ageDays !== null && ageDays >= 0) {
            jobAgeCache[jobKey] = ageDays;
          }
        }

        logs.push(`Found ${matchCount} jobkey matches`);
        logs.push(`Cached ${Object.keys(jobAgeCache).length} job ages`);
        break;
      }
    }

    return {
      logs,
      cacheSize: Object.keys(jobAgeCache).length,
      sampleEntries: Object.entries(jobAgeCache).slice(0, 10).map(([k, v]) => ({ jobKey: k, days: v }))
    };
  });

  console.log('Extraction logs:');
  extractionResult.logs.forEach(log => console.log('  ' + log));

  console.log('\nCache size:', extractionResult.cacheSize);
  if (extractionResult.sampleEntries.length > 0) {
    console.log('\nSample entries:');
    extractionResult.sampleEntries.forEach(e => console.log(`  ${e.jobKey}: ${e.days} days`));
  }

  if (extractionResult.cacheSize > 0) {
    console.log('\n✅ SUCCESS: Job age extraction is working!');
  } else {
    console.log('\n❌ FAILED: No job ages extracted');
  }

  console.log('\nBrowser staying open for 15 seconds...');
  await page.waitForTimeout(15000);

  await browser.close();
})();
