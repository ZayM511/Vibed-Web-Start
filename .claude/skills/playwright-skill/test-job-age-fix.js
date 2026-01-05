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

  // Listen to console messages
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('JobFiltr') || text.includes('mosaic') || text.includes('job age')) {
      console.log('CONSOLE:', text);
    }
  });

  console.log('\nNavigating to Indeed...');
  await page.goto('https://www.indeed.com/jobs?q=software+engineer&l=remote', {
    waitUntil: 'domcontentloaded',
    timeout: 60000
  });

  // Wait for page to fully load
  await page.waitForTimeout(3000);

  console.log('\n=== CHECKING IF MOSAIC EXTRACTOR WAS INJECTED ===');

  const injectorExists = await page.evaluate(() => {
    return !!document.getElementById('jobfiltr-mosaic-extractor');
  });
  console.log('Mosaic extractor script injected:', injectorExists);

  // Wait a bit more for data to be processed
  await page.waitForTimeout(2000);

  // Simulate applying filters with showJobAge enabled
  console.log('\n=== SIMULATING APPLY FILTERS WITH SHOW JOB AGE ===');

  // Send message to content script to apply filters
  await page.evaluate(() => {
    // Dispatch a message event that the content script will receive
    window.postMessage({
      type: 'JOBFILTR_TEST_APPLY',
      settings: { showJobAge: true }
    }, '*');
  });

  // Actually, let's just check if the content script's cache got populated
  // by checking if age badges exist or if we need to trigger manually
  await page.waitForTimeout(2000);

  console.log('\n=== CHECKING FOR JOB AGE BADGES ===');

  const badgeCheck = await page.evaluate(() => {
    const badges = document.querySelectorAll('.jobfiltr-age-badge');
    return {
      count: badges.length,
      samples: Array.from(badges).slice(0, 5).map(b => b.textContent.trim())
    };
  });

  console.log('Job age badges found:', badgeCheck.count);
  if (badgeCheck.count > 0) {
    console.log('Sample badges:', badgeCheck.samples);
  } else {
    console.log('No badges yet - filters may need to be applied via popup');
  }

  // Check job cards for data-jk
  console.log('\n=== CHECKING JOB CARD STRUCTURE ===');

  const cardInfo = await page.evaluate(() => {
    const beacons = document.querySelectorAll('.job_seen_beacon');
    return {
      beaconCount: beacons.length,
      firstBeaconHasChild: beacons[0]?.querySelector('[data-jk]') ? true : false,
      firstChildDataJk: beacons[0]?.querySelector('[data-jk]')?.getAttribute('data-jk')
    };
  });

  console.log('Job beacons:', cardInfo.beaconCount);
  console.log('First beacon has [data-jk] child:', cardInfo.firstBeaconHasChild);
  console.log('First child data-jk:', cardInfo.firstChildDataJk);

  console.log('\n=== MANUAL TEST INSTRUCTIONS ===');
  console.log('1. Click JobFiltr extension icon');
  console.log('2. Go to Scanner tab');
  console.log('3. Enable "Show Job Age" checkbox');
  console.log('4. Click "Apply Filters"');
  console.log('5. Check console for "Received job ages" message');
  console.log('6. Verify age badges appear on job cards');

  console.log('\nBrowser staying open for 90 seconds for testing...');
  await page.waitForTimeout(90000);

  await browser.close();
})();
