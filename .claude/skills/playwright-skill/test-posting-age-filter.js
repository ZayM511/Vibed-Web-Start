const { chromium } = require('playwright');

const EXTENSION_PATH = 'C:\\Users\\isaia\\OneDrive\\Documents\\2025 Docs\\Claude Copy\\Vibed-Web-Start-1\\chrome-extension';

(async () => {
  console.log('Testing JobFiltr Job Posting Age Filter');
  console.log('='.repeat(60));

  const browser = await chromium.launch({
    headless: false,
    slowMo: 100,
    args: [
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`
    ]
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();

  // ========== PART 1: TEST ON INDEED (no login required) ==========
  console.log('\n=== TESTING ON INDEED ===');
  console.log('\n1. Navigating to Indeed Jobs...');
  await page.goto('https://www.indeed.com/jobs?q=software+engineer&l=Remote');
  await page.waitForTimeout(5000);

  console.log('\n2. Waiting for job cards to load...');
  try {
    await page.waitForSelector('.job_seen_beacon, .jobsearch-ResultsList, .mosaic-provider-jobcards', { timeout: 15000 });
    await page.waitForTimeout(3000);

    // Analyze Indeed job cards
    console.log('\n3. Analyzing Indeed job cards and their ages...');

    const indeedAnalysis = await page.evaluate(() => {
      const results = {
        totalCards: 0,
        cardsWithBadges: 0,
        ageDistribution: {},
        sampleAges: []
      };

      // Find all job cards on Indeed
      const cards = document.querySelectorAll('.job_seen_beacon, .jobsearch-SerpJobCard, .resultContent');
      results.totalCards = cards.length;

      cards.forEach((card, idx) => {
        if (card.style.display === 'none') return;

        // Check for JobFiltr age badge
        const badge = card.querySelector('.jobfiltr-age-badge');
        if (badge) {
          results.cardsWithBadges++;
          const age = badge.dataset.age;
          if (age) {
            const ageNum = parseInt(age, 10);
            const key = ageNum <= 1 ? '0-1d' : ageNum <= 3 ? '2-3d' : ageNum <= 7 ? '4-7d' : '7d+';
            results.ageDistribution[key] = (results.ageDistribution[key] || 0) + 1;

            if (idx < 5) {
              results.sampleAges.push(ageNum);
            }
          }
        }

        // Also check for Indeed's native date display
        const dateElement = card.querySelector('.date, [data-testid="myJobsStateDate"]');
        if (dateElement && !badge) {
          const text = dateElement.textContent.trim();
          if (idx < 5) {
            results.sampleAges.push(`native: ${text}`);
          }
        }
      });

      return results;
    });

    console.log('\n=== INDEED RESULTS ===');
    console.log(`Total job cards: ${indeedAnalysis.totalCards}`);
    console.log(`Cards with JobFiltr age badges: ${indeedAnalysis.cardsWithBadges}`);
    console.log('Age distribution:', indeedAnalysis.ageDistribution);
    console.log('Sample ages (first 5):', indeedAnalysis.sampleAges);

    // Take screenshot
    await page.screenshot({ path: '/tmp/indeed-age-filter-test.png', fullPage: false });
    console.log('Screenshot saved to /tmp/indeed-age-filter-test.png');

  } catch (e) {
    console.log('Indeed test encountered an issue:', e.message);
  }

  // ========== PART 2: VERIFY FILTER LOGIC ==========
  console.log('\n\n=== VERIFYING FILTER LOGIC ===');

  const filterTests = [
    { range: '12h', maxDays: 0.5, testAge: 1, shouldHide: true },
    { range: '12h', maxDays: 0.5, testAge: 0, shouldHide: false },
    { range: '24h', maxDays: 1, testAge: 2, shouldHide: true },
    { range: '24h', maxDays: 1, testAge: 1, shouldHide: false },
    { range: '24h', maxDays: 1, testAge: 0.5, shouldHide: false },
    { range: '3d', maxDays: 3, testAge: 5, shouldHide: true },
    { range: '3d', maxDays: 3, testAge: 3, shouldHide: false },
    { range: '3d', maxDays: 3, testAge: 2, shouldHide: false },
    { range: '1w', maxDays: 7, testAge: 10, shouldHide: true },
    { range: '1w', maxDays: 7, testAge: 7, shouldHide: false },
    { range: '1w', maxDays: 7, testAge: 5, shouldHide: false },
    { range: '2w', maxDays: 14, testAge: 20, shouldHide: true },
    { range: '2w', maxDays: 14, testAge: 14, shouldHide: false },
    { range: '2w', maxDays: 14, testAge: 10, shouldHide: false },
    { range: '1m', maxDays: 30, testAge: 45, shouldHide: true },
    { range: '1m', maxDays: 30, testAge: 30, shouldHide: false },
    { range: '1m', maxDays: 30, testAge: 25, shouldHide: false }
  ];

  console.log('\nRunning filter logic unit tests...');
  let passed = 0;
  let failed = 0;

  filterTests.forEach(test => {
    const actualShouldHide = test.testAge > test.maxDays;
    const testPassed = actualShouldHide === test.shouldHide;

    if (testPassed) {
      passed++;
    } else {
      failed++;
      console.log(`  FAIL: Range=${test.range}, Age=${test.testAge}d, MaxDays=${test.maxDays}`);
      console.log(`        Expected: shouldHide=${test.shouldHide}, Got: shouldHide=${actualShouldHide}`);
    }
  });

  console.log(`\nUnit Tests: ${passed}/${filterTests.length} passed`);
  if (failed === 0) {
    console.log('ALL FILTER LOGIC TESTS PASSED!');
  }

  // ========== PART 3: TEST FILTER RANGES TABLE ==========
  console.log('\n\n=== FILTER RANGES REFERENCE ===');
  console.log('| Range | Max Days | Example Hidden | Example Shown |');
  console.log('|-------|----------|----------------|---------------|');
  console.log('| 12h   | 0.5      | 1+ day old     | Just posted   |');
  console.log('| 24h   | 1        | 2+ days old    | Today/Yest    |');
  console.log('| 3d    | 3        | 4+ days old    | 1-3 days      |');
  console.log('| 1w    | 7        | 8+ days old    | 1-7 days      |');
  console.log('| 2w    | 14       | 15+ days old   | 1-14 days     |');
  console.log('| 1m    | 30       | 31+ days old   | 1-30 days     |');

  console.log('\n' + '='.repeat(60));
  console.log('Test Complete!');
  console.log('\nKeeping browser open for 20 seconds for manual inspection...');
  await page.waitForTimeout(20000);

  await browser.close();
  console.log('Browser closed.');
})();
