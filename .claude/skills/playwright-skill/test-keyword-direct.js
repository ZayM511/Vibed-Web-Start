// Direct test of keyword filters by injecting settings
const { chromium } = require('playwright');
const path = require('path');

async function testKeywordsDirect() {
  console.log('=== Direct Keyword Filter Test ===\n');

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

  // Collect ALL console messages
  page.on('console', msg => {
    console.log(`[Content] ${msg.text()}`);
  });

  try {
    console.log('1. Navigating to LinkedIn Jobs...');
    await page.goto('https://www.linkedin.com/jobs/search/?keywords=software%20engineer', {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    await page.waitForTimeout(5000);

    console.log('\n2. Checking job cards...');
    const jobCardCount = await page.evaluate(() => {
      const cards = document.querySelectorAll('[data-job-id], [data-occludable-job-id], a[href*="/jobs/view/"]');
      return cards.length;
    });
    console.log(`Found ${jobCardCount} job cards`);

    if (jobCardCount === 0) {
      console.log('No job cards found - may need to log in');
      console.log('Waiting 30 seconds for manual login...');
      await page.waitForTimeout(30000);
    }

    console.log('\n3. Injecting test filter settings with keyword "python"...');

    // Inject filter settings directly into chrome storage
    await page.evaluate(async () => {
      const testSettings = {
        hideStaffing: false,
        hideSponsored: false,
        filterIncludeKeywords: true,  // ENABLE include keywords
        includeKeywords: ['python'],  // Filter for "python"
        filterExcludeKeywords: false,
        excludeKeywords: [],
        showJobAge: true
      };

      console.log('[Test] Saving test settings to chrome.storage...');
      console.log('[Test] filterIncludeKeywords:', testSettings.filterIncludeKeywords);
      console.log('[Test] includeKeywords:', JSON.stringify(testSettings.includeKeywords));

      await chrome.storage.local.set({ filterSettings: testSettings });
      console.log('[Test] Settings saved');

      // Now send APPLY_FILTERS message
      console.log('[Test] Sending APPLY_FILTERS message...');
      const response = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({
          type: 'APPLY_FILTERS_TO_ACTIVE',
          settings: testSettings
        }, (resp) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(resp);
          }
        });
      }).catch(e => console.log('[Test] Message error:', e));

      console.log('[Test] Message response:', response);
    });

    await page.waitForTimeout(3000);

    console.log('\n4. Checking results...');

    // Count hidden jobs
    const results = await page.evaluate(() => {
      const hidden = document.querySelectorAll('[data-jobfiltr-hidden="true"]').length;
      const total = document.querySelectorAll('[data-job-id], [data-occludable-job-id]').length;
      const reasons = [];
      document.querySelectorAll('[data-jobfiltr-reasons]').forEach(el => {
        reasons.push(el.dataset.jobfiltrReasons);
      });
      return { hidden, total, reasons };
    });

    console.log(`Total jobs: ${results.total}`);
    console.log(`Hidden jobs: ${results.hidden}`);
    console.log(`Reasons:`, results.reasons.slice(0, 5));

    console.log('\n5. Manually triggering storage change...');

    // Try triggering via storage change
    await page.evaluate(async () => {
      const testSettings = {
        filterIncludeKeywords: true,
        includeKeywords: ['python'],
        showJobAge: true
      };

      // Update storage which should trigger the listener
      await chrome.storage.local.set({ filterSettings: testSettings });
    });

    await page.waitForTimeout(3000);

    // Check again
    const results2 = await page.evaluate(() => {
      const hidden = document.querySelectorAll('[data-jobfiltr-hidden="true"]').length;
      return hidden;
    });
    console.log(`Hidden jobs after storage change: ${results2}`);

    console.log('\n=== Test Complete ===');
    console.log('Keeping browser open for 60 seconds...');
    await page.waitForTimeout(60000);

  } catch (error) {
    console.error('Test error:', error.message);
  } finally {
    await browser.close();
  }
}

testKeywordsDirect().catch(console.error);
