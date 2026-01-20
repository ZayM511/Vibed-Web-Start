const { chromium } = require('playwright');

const EXTENSION_PATH = 'C:\\Users\\isaia\\OneDrive\\Documents\\2025 Docs\\Claude Copy\\Vibed-Web-Start-1\\chrome-extension';

(async () => {
  console.log('='.repeat(70));
  console.log('COMPREHENSIVE JOB POSTING AGE FILTER TEST');
  console.log('Testing the filterPostingAge feature on Indeed');
  console.log('='.repeat(70));

  const browser = await chromium.launch({
    headless: false,
    slowMo: 50,
    args: [
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`
    ]
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();

  // ========== STEP 1: Navigate to Indeed ==========
  console.log('\n[STEP 1] Navigating to Indeed job search...');
  await page.goto('https://www.indeed.com/jobs?q=software+engineer&l=Remote');
  await page.waitForTimeout(5000);

  // Wait for job cards to load
  console.log('[STEP 1] Waiting for job cards to load...');
  try {
    await page.waitForSelector('.job_seen_beacon, .jobsearch-ResultsList, .mosaic-provider-jobcards', { timeout: 15000 });
    await page.waitForTimeout(3000);
  } catch (e) {
    console.log('Warning: Could not find job cards selector:', e.message);
  }

  // ========== STEP 2: Analyze job cards BEFORE enabling filter ==========
  console.log('\n[STEP 2] Analyzing job cards BEFORE enabling posting age filter...');

  const beforeAnalysis = await page.evaluate(() => {
    const results = {
      visibleCards: 0,
      hiddenCards: 0,
      cardsWithAgeBadges: 0,
      jobAges: [],
      extractedAges: []
    };

    // Find all job cards
    const cards = document.querySelectorAll('.job_seen_beacon, [data-jk], .resultContent');

    cards.forEach((card, idx) => {
      const isHidden = card.style.display === 'none' || card.dataset.jobfiltrHidden === 'true';

      if (isHidden) {
        results.hiddenCards++;
      } else {
        results.visibleCards++;
      }

      // Check for JobFiltr age badge
      const badge = card.querySelector('.jobfiltr-age-badge');
      if (badge) {
        results.cardsWithAgeBadges++;
        const badgeText = badge.textContent.trim();
        if (idx < 10) {
          results.jobAges.push(badgeText);
        }
      }

      // Try to extract age from card text
      if (idx < 10) {
        const dateSelectors = ['.date', '[data-testid="myJobsStateDate"]', '.jobsearch-HiringInsights-entry--age'];
        for (const sel of dateSelectors) {
          const dateEl = card.querySelector(sel);
          if (dateEl) {
            results.extractedAges.push(dateEl.textContent.trim());
            break;
          }
        }
      }
    });

    return results;
  });

  console.log('\n--- BEFORE FILTER ---');
  console.log(`Visible job cards: ${beforeAnalysis.visibleCards}`);
  console.log(`Hidden job cards: ${beforeAnalysis.hiddenCards}`);
  console.log(`Cards with age badges: ${beforeAnalysis.cardsWithAgeBadges}`);
  console.log(`Sample job ages (badges): ${beforeAnalysis.jobAges.join(', ') || 'None'}`);
  console.log(`Sample extracted ages: ${beforeAnalysis.extractedAges.join(', ') || 'None'}`);

  await page.screenshot({ path: '/tmp/indeed-before-filter.png', fullPage: false });
  console.log('Screenshot saved: /tmp/indeed-before-filter.png');

  // ========== STEP 3: Enable the posting age filter via storage ==========
  console.log('\n[STEP 3] Enabling posting age filter (1 week max)...');

  // Inject settings into storage to enable the filter
  await page.evaluate(() => {
    const settings = {
      filterPostingAge: true,
      postingAgeRange: '1w',  // 1 week = 7 days
      showJobAge: true,
      hideStaffing: false,
      hideSponsored: false
    };

    // Use chrome.storage.sync if available
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
      chrome.storage.sync.set({ filterSettings: settings }, () => {
        console.log('Filter settings saved via chrome.storage.sync');
      });
    }

    // Also set in localStorage as fallback
    localStorage.setItem('jobfiltr_settings', JSON.stringify(settings));
    console.log('Filter settings saved to localStorage');
  });

  // Trigger a filter refresh by reloading
  console.log('[STEP 3] Refreshing page to apply filter...');
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(5000);

  // ========== STEP 4: Analyze job cards AFTER enabling filter ==========
  console.log('\n[STEP 4] Analyzing job cards AFTER enabling posting age filter (1w)...');

  const afterAnalysis = await page.evaluate(() => {
    const results = {
      visibleCards: 0,
      hiddenCards: 0,
      cardsWithAgeBadges: 0,
      jobAges: [],
      hiddenReasons: [],
      ageData: []
    };

    // Find all job cards
    const cards = document.querySelectorAll('.job_seen_beacon, [data-jk], .resultContent');

    cards.forEach((card, idx) => {
      const isHidden = card.style.display === 'none' || card.dataset.jobfiltrHidden === 'true';

      if (isHidden) {
        results.hiddenCards++;
        const reason = card.dataset.jobfiltrReasons;
        if (reason && idx < 10) {
          results.hiddenReasons.push(reason);
        }
      } else {
        results.visibleCards++;
      }

      // Check for JobFiltr age badge
      const badge = card.querySelector('.jobfiltr-age-badge');
      if (badge) {
        results.cardsWithAgeBadges++;
        const badgeText = badge.textContent.trim();
        if (idx < 15) {
          results.jobAges.push(badgeText);
        }
      }

      // Get age from data attribute if available
      if (card.dataset.jobfiltrAge && idx < 15) {
        results.ageData.push({
          age: parseFloat(card.dataset.jobfiltrAge),
          hidden: isHidden
        });
      }
    });

    return results;
  });

  console.log('\n--- AFTER FILTER (1 week) ---');
  console.log(`Visible job cards: ${afterAnalysis.visibleCards}`);
  console.log(`Hidden job cards: ${afterAnalysis.hiddenCards}`);
  console.log(`Cards with age badges: ${afterAnalysis.cardsWithAgeBadges}`);
  console.log(`Sample job ages: ${afterAnalysis.jobAges.slice(0, 8).join(', ') || 'None'}`);
  console.log(`Hidden reasons: ${afterAnalysis.hiddenReasons.slice(0, 5).join(' | ') || 'None'}`);

  if (afterAnalysis.ageData.length > 0) {
    console.log('\nAge data samples:');
    afterAnalysis.ageData.slice(0, 10).forEach(d => {
      console.log(`  Age: ${d.age} days, Hidden: ${d.hidden}`);
    });
  }

  await page.screenshot({ path: '/tmp/indeed-after-filter-1w.png', fullPage: false });
  console.log('Screenshot saved: /tmp/indeed-after-filter-1w.png');

  // ========== STEP 5: Test with a stricter filter (3 days) ==========
  console.log('\n[STEP 5] Testing with stricter filter (3 days)...');

  await page.evaluate(() => {
    const settings = {
      filterPostingAge: true,
      postingAgeRange: '3d',  // 3 days
      showJobAge: true
    };

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
      chrome.storage.sync.set({ filterSettings: settings });
    }
    localStorage.setItem('jobfiltr_settings', JSON.stringify(settings));
  });

  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(5000);

  const stricterAnalysis = await page.evaluate(() => {
    const results = {
      visibleCards: 0,
      hiddenCards: 0,
      hiddenReasons: []
    };

    const cards = document.querySelectorAll('.job_seen_beacon, [data-jk], .resultContent');

    cards.forEach((card, idx) => {
      const isHidden = card.style.display === 'none' || card.dataset.jobfiltrHidden === 'true';

      if (isHidden) {
        results.hiddenCards++;
        const reason = card.dataset.jobfiltrReasons;
        if (reason && idx < 10) {
          results.hiddenReasons.push(reason);
        }
      } else {
        results.visibleCards++;
      }
    });

    return results;
  });

  console.log('\n--- AFTER FILTER (3 days) ---');
  console.log(`Visible job cards: ${stricterAnalysis.visibleCards}`);
  console.log(`Hidden job cards: ${stricterAnalysis.hiddenCards}`);
  console.log(`Hidden reasons: ${stricterAnalysis.hiddenReasons.slice(0, 5).join(' | ') || 'None'}`);

  await page.screenshot({ path: '/tmp/indeed-after-filter-3d.png', fullPage: false });
  console.log('Screenshot saved: /tmp/indeed-after-filter-3d.png');

  // ========== STEP 6: Check console for filter logs ==========
  console.log('\n[STEP 6] Checking browser console for filter activity...');

  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('[JobFiltr') || text.includes('filterPostingAge') || text.includes('job age')) {
      console.log(`  Console: ${text.substring(0, 150)}`);
    }
  });

  // Reload once more to capture console logs
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(5000);

  // ========== SUMMARY ==========
  console.log('\n' + '='.repeat(70));
  console.log('POSTING AGE FILTER TEST SUMMARY');
  console.log('='.repeat(70));
  console.log(`\nBefore filter: ${beforeAnalysis.visibleCards} visible, ${beforeAnalysis.hiddenCards} hidden`);
  console.log(`After 1 week filter: ${afterAnalysis.visibleCards} visible, ${afterAnalysis.hiddenCards} hidden`);
  console.log(`After 3 days filter: ${stricterAnalysis.visibleCards} visible, ${stricterAnalysis.hiddenCards} hidden`);

  const filtering1w = afterAnalysis.hiddenCards > beforeAnalysis.hiddenCards;
  const filtering3d = stricterAnalysis.hiddenCards > afterAnalysis.hiddenCards;

  console.log('\n--- FILTER EFFECTIVENESS ---');
  if (filtering1w) {
    console.log('1 week filter: WORKING (hiding old jobs)');
  } else {
    console.log('1 week filter: NOT HIDING ADDITIONAL JOBS (may need investigation)');
  }

  if (filtering3d) {
    console.log('3 day filter: WORKING (stricter than 1 week)');
  } else if (stricterAnalysis.hiddenCards >= afterAnalysis.hiddenCards) {
    console.log('3 day filter: WORKING (hiding at least as many as 1 week)');
  } else {
    console.log('3 day filter: UNEXPECTED BEHAVIOR');
  }

  console.log('\n' + '='.repeat(70));
  console.log('Keeping browser open for 30 seconds for manual inspection...');
  await page.waitForTimeout(30000);

  await browser.close();
  console.log('Browser closed.');
})();
