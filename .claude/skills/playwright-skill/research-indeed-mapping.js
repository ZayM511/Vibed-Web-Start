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

  // Get job keys from visible cards
  const jobKeys = await page.evaluate(() => {
    const cards = document.querySelectorAll('[data-jk]');
    return Array.from(cards).slice(0, 10).map(card => ({
      jobKey: card.getAttribute('data-jk'),
      title: card.querySelector('h2, .jobTitle')?.textContent?.trim().substring(0, 50) || 'Unknown'
    }));
  });

  console.log('\n=== JOB KEYS FROM VISIBLE CARDS ===');
  jobKeys.forEach((jk, i) => console.log(`  ${i + 1}. ${jk.jobKey}: "${jk.title}"`));

  // Now search for these job keys in the page source and find their ages
  const pageSource = await page.content();

  console.log('\n=== SEARCHING FOR JOB KEY + AGE ASSOCIATIONS ===');

  for (const { jobKey, title } of jobKeys.slice(0, 5)) {
    // Look for this jobKey in the source
    const regex = new RegExp(`"${jobKey}"[\\s\\S]{0,2000}?"age"\\s*:\\s*"([^"]+)"`, 'i');
    const match = pageSource.match(regex);

    // Also try reverse order (age before jobKey)
    const regex2 = new RegExp(`"age"\\s*:\\s*"([^"]+)"[\\s\\S]{0,500}?"${jobKey}"`, 'i');
    const match2 = pageSource.match(regex2);

    if (match) {
      console.log(`  ${jobKey}: age = "${match[1]}" (title: ${title})`);
    } else if (match2) {
      console.log(`  ${jobKey}: age = "${match2[1]}" (title: ${title}) [reverse match]`);
    } else {
      // Try to find any context around this job key
      const contextRegex = new RegExp(`.{0,100}${jobKey}.{0,300}`, 'i');
      const contextMatch = pageSource.match(contextRegex);
      console.log(`  ${jobKey}: No direct age match (title: ${title})`);
      if (contextMatch) {
        console.log(`    Context: ...${contextMatch[0].substring(0, 200)}...`);
      }
    }
  }

  // Look for the structure of the JSON data
  console.log('\n=== LOOKING FOR JSON DATA STRUCTURE ===');

  const jsonStructure = await page.evaluate(() => {
    const results = [];

    // Find script tags with job data
    const scripts = document.querySelectorAll('script');
    for (const script of scripts) {
      const text = script.textContent || '';

      // Look for array of jobs with hiringInsightsModel
      if (text.includes('hiringInsightsModel') && text.includes('jobKey')) {
        // Try to find the pattern
        const jobPattern = /"jobKey"\s*:\s*"([^"]+)"[\s\S]*?"hiringInsightsModel"\s*:\s*\{[^}]*"age"\s*:\s*"([^"]+)"/g;
        let match;
        let count = 0;
        while ((match = jobPattern.exec(text)) !== null && count < 5) {
          results.push({ jobKey: match[1], age: match[2] });
          count++;
        }
      }
    }

    // Also check window.mosaic
    if (window.mosaic && window.mosaic.providerData) {
      const providerDataStr = JSON.stringify(window.mosaic.providerData);
      if (providerDataStr.includes('hiringInsightsModel')) {
        results.push({ note: 'Found in window.mosaic.providerData', preview: providerDataStr.substring(0, 300) });
      }
    }

    return results;
  });

  if (jsonStructure.length > 0) {
    console.log('\nJob key to age mappings found:');
    jsonStructure.forEach((item, i) => {
      if (item.jobKey) {
        console.log(`  ${i + 1}. ${item.jobKey} -> "${item.age}"`);
      } else if (item.note) {
        console.log(`  ${item.note}`);
        console.log(`  Preview: ${item.preview}`);
      }
    });
  }

  // Let's also check if there's a global data object with all job info
  const mosaicData = await page.evaluate(() => {
    if (window.mosaic && window.mosaic.providerData) {
      // Find jobcards provider
      const providers = Object.keys(window.mosaic.providerData);
      const jobcardsProvider = providers.find(p => p.includes('jobcards'));

      if (jobcardsProvider && window.mosaic.providerData[jobcardsProvider]) {
        const data = window.mosaic.providerData[jobcardsProvider];
        // Look for job results
        if (data.metaData && data.metaData.mosaicProviderJobCardsModel) {
          const model = data.metaData.mosaicProviderJobCardsModel;
          if (model.results) {
            return model.results.slice(0, 5).map(job => ({
              jobKey: job.jobkey,
              title: job.displayTitle,
              age: job.hiringInsightsModel?.age,
              company: job.company
            }));
          }
        }
      }

      // Return the keys for debugging
      return { availableKeys: providers };
    }
    return null;
  });

  if (mosaicData) {
    console.log('\n=== MOSAIC PROVIDER DATA ===');
    if (Array.isArray(mosaicData)) {
      mosaicData.forEach((job, i) => {
        console.log(`  ${i + 1}. ${job.jobKey}: "${job.title}" by ${job.company}`);
        console.log(`     Age: ${job.age || 'not found'}`);
      });
    } else {
      console.log('Available providers:', mosaicData.availableKeys);
    }
  }

  // ALSO SEARCH FOR datePosted - exact posting date
  console.log('\n=== SEARCHING FOR datePosted ===');

  const datePostedMatches = pageSource.match(/"datePosted"\s*:\s*"([^"]+)"/gi);
  if (datePostedMatches) {
    console.log('Found datePosted values:');
    [...new Set(datePostedMatches)].slice(0, 10).forEach((m, i) => {
      console.log(`  ${i + 1}. ${m}`);
    });
  } else {
    console.log('No datePosted found in standard format');
  }

  // Also try alternate formats
  const dateFormats = [
    /"postedDate"\s*:\s*"([^"]+)"/gi,
    /"postDate"\s*:\s*"([^"]+)"/gi,
    /"publishedDate"\s*:\s*"([^"]+)"/gi,
    /"createDate"\s*:\s*"([^"]+)"/gi
  ];

  for (const format of dateFormats) {
    const matches = pageSource.match(format);
    if (matches && matches.length > 0) {
      console.log(`Found with pattern ${format}:`, [...new Set(matches)].slice(0, 3));
    }
  }

  console.log('\nBrowser staying open for 20 seconds...');
  await page.waitForTimeout(20000);

  await browser.close();
})();
