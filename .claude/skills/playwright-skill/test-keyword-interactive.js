// Interactive test - waits for user to sign in, then tests keyword filters
const { chromium } = require('playwright');
const path = require('path');
const readline = require('readline');

function askQuestion(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close();
      resolve(answer);
    });
  });
}

async function testKeywordsInteractive() {
  console.log('=== Interactive Keyword Filter Test ===\n');

  const extensionPath = path.resolve(__dirname, '../../../chrome-extension');

  const browser = await chromium.launchPersistentContext('', {
    headless: false,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
      '--no-sandbox'
    ]
  });

  const page = browser.pages()[0] || await browser.newPage();

  // Collect console messages
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('JobFiltr') || text.includes('KEYWORD') || text.includes('===')) {
      console.log(`[Page] ${text}`);
    }
  });

  try {
    console.log('1. Navigating to LinkedIn Jobs...');
    await page.goto('https://www.linkedin.com/jobs/search/?keywords=software%20engineer', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    await page.waitForTimeout(3000);

    // Get extension ID
    let extId = null;
    const serviceWorkers = browser.serviceWorkers();
    for (const sw of serviceWorkers) {
      const url = sw.url();
      if (url.includes('chrome-extension://') && url.includes('background')) {
        const match = url.match(/chrome-extension:\/\/([^/]+)/);
        if (match) {
          extId = match[1];
          break;
        }
      }
    }

    if (!extId) {
      console.log('Extension ID not found');
      return;
    }

    console.log(`Extension ID: ${extId}`);

    // Open popup
    const popupPage = await browser.newPage();
    await popupPage.goto(`chrome-extension://${extId}/popup-v2.html`);

    // Collect popup console
    popupPage.on('console', msg => {
      console.log(`[Popup] ${msg.text()}`);
    });

    await popupPage.waitForTimeout(2000);

    // Check auth status
    const authOverlayVisible = await popupPage.locator('.auth-overlay:not(.hidden)').isVisible().catch(() => false);

    if (authOverlayVisible) {
      console.log('\n*** Auth overlay is visible ***');
      console.log('Please sign in using the Google button in the popup window.');
      await askQuestion('Press Enter after signing in...');
      await popupPage.waitForTimeout(2000);
    }

    // Check if auth overlay is now hidden
    const stillVisible = await popupPage.locator('.auth-overlay:not(.hidden)').isVisible().catch(() => false);
    if (stillVisible) {
      console.log('Auth overlay still visible. Test cannot continue.');
      return;
    }

    console.log('\n2. Auth successful! Now testing keyword filters...');

    // Clear any existing keywords
    console.log('\n3. Clearing existing keywords...');
    const existingChips = await popupPage.locator('#includeKeywordsChips .keyword-chip').count();
    console.log(`Existing include keyword chips: ${existingChips}`);

    // Add a test keyword
    console.log('\n4. Adding keyword "python"...');
    await popupPage.locator('#includeKeywordInput').fill('python');
    await popupPage.locator('#addIncludeKeyword').click();
    await popupPage.waitForTimeout(500);

    // Verify chip was added
    const newChipCount = await popupPage.locator('#includeKeywordsChips .keyword-chip').count();
    console.log(`Include keyword chips after add: ${newChipCount}`);

    // Check the include keywords checkbox
    console.log('\n5. Enabling include keywords filter...');
    const checkbox = popupPage.locator('#filterIncludeKeywords');
    await checkbox.check();
    const isChecked = await checkbox.isChecked();
    console.log(`Checkbox checked: ${isChecked}`);

    await popupPage.waitForTimeout(500);

    // Click Apply Filters
    console.log('\n6. Clicking Apply Filters button...');
    await popupPage.locator('#applyFilters').click();

    await popupPage.waitForTimeout(3000);

    // Switch to LinkedIn page and check results
    console.log('\n7. Checking results on LinkedIn page...');
    await page.bringToFront();
    await page.waitForTimeout(2000);

    const results = await page.evaluate(() => {
      const hidden = document.querySelectorAll('[data-jobfiltr-hidden="true"]').length;
      const visible = document.querySelectorAll('[data-job-id]:not([data-jobfiltr-hidden="true"]), [data-occludable-job-id]:not([data-jobfiltr-hidden="true"])').length;
      const total = document.querySelectorAll('[data-job-id], [data-occludable-job-id]').length;

      // Get reasons
      const reasons = {};
      document.querySelectorAll('[data-jobfiltr-reasons]').forEach(el => {
        const r = el.dataset.jobfiltrReasons;
        reasons[r] = (reasons[r] || 0) + 1;
      });

      // Get sample job titles
      const titles = [];
      document.querySelectorAll('[data-job-id], [data-occludable-job-id]').forEach(card => {
        const titleEl = card.querySelector('.job-card-list__title, .job-card-container__link, h3, a[href*="/jobs/view/"]');
        if (titleEl) titles.push(titleEl.textContent?.trim().substring(0, 50));
      });

      return { hidden, visible, total, reasons, titles: titles.slice(0, 5) };
    });

    console.log('\n=== RESULTS ===');
    console.log(`Total job cards: ${results.total}`);
    console.log(`Hidden: ${results.hidden}`);
    console.log(`Visible: ${results.visible}`);
    console.log(`Hidden reasons:`, results.reasons);
    console.log(`Sample titles:`, results.titles);

    // Check if keyword filter worked
    if (results.hidden > 0) {
      const keywordHidden = Object.entries(results.reasons).some(([reason]) =>
        reason.includes('Keyword') || reason.includes('keyword')
      );
      if (keywordHidden) {
        console.log('\n✅ KEYWORD FILTER IS WORKING!');
      } else {
        console.log('\n⚠️ Jobs were hidden but not by keyword filter');
      }
    } else {
      console.log('\n❌ NO JOBS WERE HIDDEN - keyword filter may not be working');
      console.log('Check the popup console for debug output');
    }

    console.log('\n=== Test Complete ===');
    await askQuestion('Press Enter to close the browser...');

  } catch (error) {
    console.error('Test error:', error.message);
  } finally {
    await browser.close();
  }
}

testKeywordsInteractive().catch(console.error);
