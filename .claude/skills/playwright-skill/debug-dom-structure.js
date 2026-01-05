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

  // Analyze the DOM structure around job cards and data-jk
  console.log('\n=== ANALYZING DOM STRUCTURE ===\n');

  const domAnalysis = await page.evaluate(() => {
    const results = [];

    // Find all elements with data-jk
    const dataJkElements = document.querySelectorAll('[data-jk]');
    console.log(`Found ${dataJkElements.length} elements with data-jk`);

    // For first 3, analyze the structure
    Array.from(dataJkElements).slice(0, 3).forEach((el, i) => {
      const jobKey = el.getAttribute('data-jk');
      const tagName = el.tagName.toLowerCase();
      const classes = el.className;

      // Check relationship with .job_seen_beacon
      const hasJobSeenBeacon = !!el.querySelector('.job_seen_beacon');
      const isInsideJobSeenBeacon = !!el.closest('.job_seen_beacon');
      const jobSeenBeaconParent = el.parentElement?.closest('.job_seen_beacon');

      results.push({
        index: i + 1,
        jobKey,
        tagName,
        classes: classes.substring(0, 100),
        hasJobSeenBeaconChild: hasJobSeenBeacon,
        isInsideJobSeenBeacon,
        parentHasJobSeenBeacon: !!jobSeenBeaconParent
      });
    });

    // Now check .job_seen_beacon elements
    const beaconElements = document.querySelectorAll('.job_seen_beacon');
    results.push({
      separator: '---',
      beaconCount: beaconElements.length
    });

    Array.from(beaconElements).slice(0, 3).forEach((beacon, i) => {
      const tagName = beacon.tagName.toLowerCase();

      // Check for data-jk in beacon or parents/children
      const hasDataJk = beacon.hasAttribute('data-jk');
      const childWithDataJk = beacon.querySelector('[data-jk]');
      const parentWithDataJk = beacon.closest('[data-jk]');

      results.push({
        beaconIndex: i + 1,
        tagName,
        hasDataJkAttr: hasDataJk,
        dataJkValue: hasDataJk ? beacon.getAttribute('data-jk') : null,
        hasChildWithDataJk: !!childWithDataJk,
        childDataJk: childWithDataJk?.getAttribute('data-jk'),
        hasParentWithDataJk: !!parentWithDataJk,
        parentDataJk: parentWithDataJk?.getAttribute('data-jk')
      });
    });

    return results;
  });

  domAnalysis.forEach(item => {
    console.log(JSON.stringify(item, null, 2));
  });

  // Now let's check what selector would work best
  console.log('\n=== TESTING SELECTORS ===\n');

  const selectorTests = await page.evaluate(() => {
    const tests = {};

    // Test different selectors
    const selectors = [
      '.jobsearch-ResultsList > li',
      '.job_seen_beacon',
      '[data-testid="job-result"]',
      'li[data-jk]',
      'div[data-jk]',
      'td[data-jk]',
      '[data-jk]',
      '.jobsearch-SerpJobCard',
      '.result',
      'table.jobCard_mainContent'
    ];

    selectors.forEach(sel => {
      const elements = document.querySelectorAll(sel);
      if (elements.length > 0) {
        const first = elements[0];
        tests[sel] = {
          count: elements.length,
          tagName: first.tagName.toLowerCase(),
          hasDataJk: first.hasAttribute('data-jk'),
          dataJk: first.getAttribute('data-jk'),
          // Check if we can get data-jk from this element or its children/parents
          canGetJobKey: !!(first.getAttribute('data-jk') || first.querySelector('[data-jk]')?.getAttribute('data-jk') || first.closest('[data-jk]')?.getAttribute('data-jk'))
        };
      }
    });

    return tests;
  });

  Object.entries(selectorTests).forEach(([sel, info]) => {
    console.log(`${sel}:`);
    console.log(`  Count: ${info.count}, Tag: ${info.tagName}, hasDataJk: ${info.hasDataJk}, canGetJobKey: ${info.canGetJobKey}`);
    if (info.dataJk) console.log(`  data-jk: ${info.dataJk}`);
  });

  console.log('\nBrowser staying open for 20 seconds...');
  await page.waitForTimeout(20000);

  await browser.close();
})();
