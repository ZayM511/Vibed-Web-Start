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

  const pageSource = await page.content();

  // Find ALL hiringInsightsModel occurrences with context
  console.log('\n=== ALL hiringInsightsModel OCCURRENCES ===');

  const hiringRegex = /"hiringInsightsModel"\s*:\s*\{[^}]+\}/g;
  const allHiring = pageSource.match(hiringRegex);

  if (allHiring) {
    console.log(`Found ${allHiring.length} hiringInsightsModel entries:`);
    allHiring.slice(0, 15).forEach((m, i) => {
      const ageMatch = m.match(/"age"\s*:\s*"([^"]+)"/);
      console.log(`  ${i + 1}. ${ageMatch ? ageMatch[1] : 'no age'}`);
    });
  }

  // Find the data structure - look for jobKey followed by hiringInsightsModel within same object
  console.log('\n=== SEARCHING FOR JOB DATA OBJECTS ===');

  // Try to find the JSON array/object containing all jobs
  const jobDataPattern = /\{"jobkey"\s*:\s*"([^"]+)"[\s\S]*?"hiringInsightsModel"\s*:\s*\{[^}]*"age"\s*:\s*"([^"]+)"[^}]*\}/gi;
  let match;
  let count = 0;
  while ((match = jobDataPattern.exec(pageSource)) !== null && count < 15) {
    console.log(`  ${match[1]}: ${match[2]}`);
    count++;
  }

  if (count === 0) {
    // Try alternate pattern - hiringInsightsModel might come before jobkey
    console.log('  Trying alternate pattern...');
    const altPattern = /"hiringInsightsModel"\s*:\s*\{[^}]*"age"\s*:\s*"([^"]+)"[^}]*\}[\s\S]*?"jobkey"\s*:\s*"([^"]+)"/gi;
    while ((match = altPattern.exec(pageSource)) !== null && count < 15) {
      console.log(`  ${match[2]}: ${match[1]}`);
      count++;
    }
  }

  // Look for script tag with window.mosaic initialization
  console.log('\n=== INSPECTING MOSAIC DATA STRUCTURE ===');

  const mosaicStructure = await page.evaluate(() => {
    const results = {
      providers: [],
      sampleJobData: null
    };

    if (window.mosaic && window.mosaic.providerData) {
      results.providers = Object.keys(window.mosaic.providerData);

      // Find the jobcards provider and look at its structure
      for (const key of results.providers) {
        const data = window.mosaic.providerData[key];
        const dataStr = JSON.stringify(data);

        if (dataStr.includes('hiringInsightsModel') || dataStr.includes('results')) {
          // Found it - let's get the structure
          results.providerWithJobs = key;

          // Navigate to find jobs
          if (data.metaData?.mosaicProviderJobCardsModel?.results) {
            const jobs = data.metaData.mosaicProviderJobCardsModel.results;
            results.jobCount = jobs.length;

            // Get sample job with all keys
            if (jobs.length > 0) {
              results.sampleJobKeys = Object.keys(jobs[0]);
              results.sampleJob = JSON.stringify(jobs[0]).substring(0, 500);

              // Check if any job has hiringInsightsModel
              const jobWithAge = jobs.find(j => j.hiringInsightsModel?.age);
              if (jobWithAge) {
                results.jobWithAge = {
                  jobkey: jobWithAge.jobkey,
                  age: jobWithAge.hiringInsightsModel.age
                };
              }
            }
          }
        }
      }
    }

    // Also look for a __NEXT_DATA__ or similar
    const nextDataScript = document.querySelector('script#__NEXT_DATA__');
    if (nextDataScript) {
      results.hasNextData = true;
    }

    return results;
  });

  console.log('Mosaic providers:', mosaicStructure.providers);
  if (mosaicStructure.providerWithJobs) {
    console.log('Provider with jobs:', mosaicStructure.providerWithJobs);
    console.log('Job count:', mosaicStructure.jobCount);
    console.log('Sample job keys:', mosaicStructure.sampleJobKeys);
    console.log('Sample job:', mosaicStructure.sampleJob);
    if (mosaicStructure.jobWithAge) {
      console.log('Job with age:', mosaicStructure.jobWithAge);
    }
  }

  // Check if the page has the data in a script tag that we need to parse
  console.log('\n=== LOOKING FOR JOB DATA IN SCRIPT TAGS ===');

  const scriptData = await page.evaluate(() => {
    const scripts = document.querySelectorAll('script');
    const results = [];

    for (const script of scripts) {
      const text = script.textContent || '';

      // Look for mosaic provider data initialization
      if (text.includes('mosaic') && text.includes('results') && text.includes('hiringInsightsModel')) {
        // Try to find the results array
        const resultsMatch = text.match(/"results"\s*:\s*\[([\s\S]*?)\]/);
        if (resultsMatch) {
          // Count jobs in this results array
          const jobkeyMatches = resultsMatch[1].match(/"jobkey"\s*:\s*"([^"]+)"/g);
          const ageMatches = resultsMatch[1].match(/"age"\s*:\s*"([^"]+)"/g);

          results.push({
            jobkeyCount: jobkeyMatches ? jobkeyMatches.length : 0,
            ageCount: ageMatches ? ageMatches.length : 0,
            ages: ageMatches ? [...new Set(ageMatches)].slice(0, 10) : []
          });
        }
      }
    }

    return results;
  });

  if (scriptData.length > 0) {
    console.log('Found script with job data:');
    scriptData.forEach((s, i) => {
      console.log(`  Script ${i + 1}: ${s.jobkeyCount} job keys, ${s.ageCount} ages`);
      console.log(`  Ages found: ${s.ages.join(', ')}`);
    });
  }

  // SEARCH FOR UNIX TIMESTAMPS
  console.log('\n=== SEARCHING FOR UNIX TIMESTAMPS ===');

  const timestampFields = [
    'createdate',
    'pubdate',
    'datePublished',
    'dateOnIndeed',
    'postingDate',
    'postedDate',
    'formattedRelativeTime'
  ];

  for (const field of timestampFields) {
    const regex = new RegExp(`"${field}"\\s*:\\s*([\\d"]+)`, 'gi');
    const matches = pageSource.match(regex);
    if (matches && matches.length > 0) {
      console.log(`\n${field}:`);
      [...new Set(matches)].slice(0, 5).forEach(m => {
        console.log(`  ${m}`);
        // If it looks like a timestamp, convert it
        const numMatch = m.match(/:\s*(\d{10,13})/);
        if (numMatch) {
          const ts = parseInt(numMatch[1]);
          // If 13 digits, it's milliseconds
          const date = new Date(ts > 9999999999 ? ts : ts * 1000);
          console.log(`    -> ${date.toISOString()}`);
        }
      });
    }
  }

  // Also look for any field containing timestamp-like numbers near job keys
  console.log('\n=== LOOKING FOR TIMESTAMP PATTERNS NEAR JOB DATA ===');

  const timestampPattern = /"((?:create|pub|post|date)[^"]*)":\s*(\d{10,13})/gi;
  let tsMatch;
  const foundTimestamps = new Set();
  while ((tsMatch = timestampPattern.exec(pageSource)) !== null) {
    const key = `${tsMatch[1]}: ${tsMatch[2]}`;
    if (!foundTimestamps.has(tsMatch[1])) {
      foundTimestamps.add(tsMatch[1]);
      const ts = parseInt(tsMatch[2]);
      const date = new Date(ts > 9999999999 ? ts : ts * 1000);
      console.log(`  "${tsMatch[1]}": ${tsMatch[2]} -> ${date.toISOString()}`);
    }
  }

  console.log('\nBrowser staying open for 20 seconds...');
  await page.waitForTimeout(20000);

  await browser.close();
})();
