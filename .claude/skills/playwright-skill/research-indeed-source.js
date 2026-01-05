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

  // Get the page source (not just innerHTML, but actual source)
  const pageSource = await page.content();

  console.log('\n=== SEARCHING PAGE SOURCE ===\n');

  // Search for "hiringInsightsModel"
  const hiringInsightsMatches = pageSource.match(/hiringInsightsModel[^}]+age[^}]+}/gi);
  if (hiringInsightsMatches) {
    console.log('Found hiringInsightsModel matches:');
    hiringInsightsMatches.slice(0, 5).forEach((m, i) => {
      console.log(`  ${i + 1}. ${m.substring(0, 200)}`);
    });
  } else {
    console.log('No hiringInsightsModel found');
  }

  // Search for "days ago" in source
  const daysAgoMatches = pageSource.match(/"[^"]*\d+\s*days?\s*ago[^"]*"/gi);
  if (daysAgoMatches) {
    console.log('\nFound "days ago" strings:');
    [...new Set(daysAgoMatches)].slice(0, 10).forEach((m, i) => {
      console.log(`  ${i + 1}. ${m}`);
    });
  } else {
    console.log('\nNo "days ago" strings found in quotes');
  }

  // Search for "age": patterns
  const agePatterns = pageSource.match(/"age"\s*:\s*"[^"]+"/gi);
  if (agePatterns) {
    console.log('\nFound "age": patterns:');
    [...new Set(agePatterns)].slice(0, 10).forEach((m, i) => {
      console.log(`  ${i + 1}. ${m}`);
    });
  } else {
    console.log('\nNo "age": patterns found');
  }

  // Search for posted/published/created patterns
  const postedPatterns = pageSource.match(/"(?:posted|published|created)[^"]*"\s*:\s*"[^"]+"/gi);
  if (postedPatterns) {
    console.log('\nFound posted/published/created patterns:');
    [...new Set(postedPatterns)].slice(0, 10).forEach((m, i) => {
      console.log(`  ${i + 1}. ${m}`);
    });
  } else {
    console.log('\nNo posted/published/created patterns found');
  }

  // Look for script tags with JSON data
  const scriptDataMatches = pageSource.match(/<script[^>]*>[\s\S]*?hiringInsights[\s\S]*?<\/script>/gi);
  if (scriptDataMatches) {
    console.log('\nFound script tags with hiringInsights:');
    scriptDataMatches.slice(0, 2).forEach((m, i) => {
      console.log(`  ${i + 1}. (${m.length} chars) Preview: ${m.substring(0, 300)}...`);
    });
  }

  // Check for data in window object or script tags
  const windowData = await page.evaluate(() => {
    // Check if there's any global variable with job data
    const results = [];

    // Check for mosaic data
    if (window.mosaic && window.mosaic.providerData) {
      results.push({ source: 'window.mosaic.providerData', preview: JSON.stringify(window.mosaic.providerData).substring(0, 500) });
    }

    // Look in script tags for JSON data
    const scripts = document.querySelectorAll('script');
    scripts.forEach((script, idx) => {
      const text = script.textContent || '';
      if (text.includes('hiringInsights') || text.includes('days ago')) {
        // Try to extract the relevant JSON
        const ageMatch = text.match(/"age"\s*:\s*"([^"]+)"/);
        if (ageMatch) {
          results.push({ source: `script[${idx}]`, ageValue: ageMatch[1], preview: text.substring(text.indexOf('hiringInsights') - 50, text.indexOf('hiringInsights') + 200) });
        }
      }
    });

    return results;
  });

  if (windowData.length > 0) {
    console.log('\n=== FOUND DATA IN PAGE SCRIPTS ===');
    windowData.forEach((d, i) => {
      console.log(`\n${i + 1}. Source: ${d.source}`);
      if (d.ageValue) console.log(`   Age value: ${d.ageValue}`);
      if (d.preview) console.log(`   Preview: ${d.preview}`);
    });
  }

  // Now click on a job to see if more data loads
  console.log('\n--- Clicking on a job card ---');
  try {
    await page.click('.job_seen_beacon', { timeout: 3000 });
    await page.waitForTimeout(3000);

    const jobDetailSource = await page.content();

    // Search in the updated page
    const detailAgePatterns = jobDetailSource.match(/"age"\s*:\s*"[^"]+"/gi);
    if (detailAgePatterns) {
      console.log('\nAfter clicking job - "age": patterns:');
      [...new Set(detailAgePatterns)].slice(0, 5).forEach((m, i) => {
        console.log(`  ${i + 1}. ${m}`);
      });
    }

    // Look for hiringInsightsModel
    const detailHiringMatch = jobDetailSource.match(/hiringInsightsModel[\s\S]{0,500}/);
    if (detailHiringMatch) {
      console.log('\nFound hiringInsightsModel after click:');
      console.log(`  ${detailHiringMatch[0].substring(0, 300)}`);
    }
  } catch (e) {
    console.log('Error clicking job:', e.message);
  }

  console.log('\nBrowser staying open for 30 seconds...');
  await page.waitForTimeout(30000);

  await browser.close();
})();
