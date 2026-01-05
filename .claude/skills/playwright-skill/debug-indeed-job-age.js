const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const extensionPath = path.resolve(__dirname, '../../../chrome-extension');
  console.log('Loading extension from:', extensionPath);

  // Launch Chrome with extension
  const browser = await chromium.launchPersistentContext('', {
    headless: false,
    channel: 'chrome',
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
    ],
    slowMo: 50
  });

  const page = await browser.newPage();

  // Listen to console messages for extension logs
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('JobFiltr') || text.includes('job age') || text.includes('Extracted') || text.includes('mosaic')) {
      console.log('EXTENSION:', text);
    }
  });

  console.log('\nNavigating to Indeed...');
  await page.goto('https://www.indeed.com/jobs?q=software+engineer&l=remote', {
    waitUntil: 'domcontentloaded',
    timeout: 60000
  });

  // Wait for page to load
  await page.waitForTimeout(5000);

  // Check if mosaic data is available
  console.log('\n=== CHECKING MOSAIC DATA ===');

  const mosaicData = await page.evaluate(() => {
    const results = {
      hasMosaic: false,
      hasProviderData: false,
      hasJobcards: false,
      jobCount: 0,
      sampleJobs: []
    };

    if (window.mosaic) {
      results.hasMosaic = true;
      if (window.mosaic.providerData) {
        results.hasProviderData = true;
        results.providers = Object.keys(window.mosaic.providerData);

        const jobcardsProvider = window.mosaic.providerData['mosaic-provider-jobcards'];
        if (jobcardsProvider) {
          results.hasJobcards = true;
          if (jobcardsProvider.metaData?.mosaicProviderJobCardsModel?.results) {
            const jobs = jobcardsProvider.metaData.mosaicProviderJobCardsModel.results;
            results.jobCount = jobs.length;
            results.sampleJobs = jobs.slice(0, 5).map(job => ({
              jobkey: job.jobkey,
              title: job.displayTitle?.substring(0, 30),
              pubDate: job.pubDate,
              pubDateFormatted: job.pubDate ? new Date(job.pubDate).toISOString() : null,
              formattedRelativeTime: job.formattedRelativeTime,
              createDate: job.createDate
            }));
          }
        }
      }
    }

    return results;
  });

  console.log('Mosaic check:', JSON.stringify(mosaicData, null, 2));

  // Check visible job cards
  console.log('\n=== CHECKING JOB CARDS ===');

  const jobCards = await page.evaluate(() => {
    const selectors = [
      '.jobsearch-ResultsList > li',
      '.job_seen_beacon',
      '[data-testid="job-result"]',
      'li[data-jk]'
    ];

    for (const selector of selectors) {
      const cards = document.querySelectorAll(selector);
      if (cards.length > 0) {
        return {
          selector,
          count: cards.length,
          sampleCards: Array.from(cards).slice(0, 5).map(card => ({
            jobKey: card.getAttribute('data-jk'),
            hasAgeBadge: !!card.querySelector('.jobfiltr-age-badge'),
            ageBadgeText: card.querySelector('.jobfiltr-age-badge')?.textContent?.trim(),
            hasBenefitsBadge: !!card.querySelector('.jobfiltr-benefits-badge')
          }))
        };
      }
    }
    return { selector: 'none', count: 0 };
  });

  console.log('Job cards:', JSON.stringify(jobCards, null, 2));

  // Check if jobAgeCache has data (by calling the function)
  console.log('\n=== TESTING JOB AGE EXTRACTION ===');

  const extractionTest = await page.evaluate(() => {
    // This simulates what the content script does
    const cache = {};
    const now = Date.now();

    if (window.mosaic && window.mosaic.providerData) {
      const jobcardsProvider = window.mosaic.providerData['mosaic-provider-jobcards'];
      if (jobcardsProvider?.metaData?.mosaicProviderJobCardsModel?.results) {
        const jobs = jobcardsProvider.metaData.mosaicProviderJobCardsModel.results;

        jobs.forEach(job => {
          if (!job.jobkey) return;

          let ageDays = null;

          // Try pubDate
          if (job.pubDate && job.pubDate > 0) {
            const pubDateMs = typeof job.pubDate === 'number' ? job.pubDate : parseInt(job.pubDate);
            if (!isNaN(pubDateMs) && pubDateMs > 0) {
              ageDays = Math.floor((now - pubDateMs) / (1000 * 60 * 60 * 24));
            }
          }

          // Try formattedRelativeTime
          if (ageDays === null && job.formattedRelativeTime) {
            const relTime = job.formattedRelativeTime.toString().trim().toLowerCase();
            if (relTime.includes('day')) {
              const numMatch = relTime.match(/(\d+)/);
              if (numMatch) ageDays = parseInt(numMatch[1]);
            } else if (relTime.includes('hour') || relTime.includes('minute') || relTime.includes('just')) {
              ageDays = 0;
            }
          }

          if (ageDays !== null && ageDays >= 0) {
            cache[job.jobkey] = ageDays;
          }
        });
      }
    }

    return {
      cacheSize: Object.keys(cache).length,
      sampleEntries: Object.entries(cache).slice(0, 5).map(([key, days]) => ({ jobKey: key, days }))
    };
  });

  console.log('Extraction test:', JSON.stringify(extractionTest, null, 2));

  console.log('\n=== MANUAL TESTING ===');
  console.log('1. Click the JobFiltr extension icon in toolbar');
  console.log('2. Go to Scanner tab');
  console.log('3. Enable "Show Job Age" checkbox');
  console.log('4. Click "Apply Filters" button');
  console.log('5. Check if age badges appear on job cards');
  console.log('\nBrowser staying open for 60 seconds for manual testing...');

  await page.waitForTimeout(60000);

  await browser.close();
})();
