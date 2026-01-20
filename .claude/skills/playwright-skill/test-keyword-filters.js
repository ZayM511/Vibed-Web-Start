// Test keyword filters on LinkedIn with console log capture
const { chromium } = require('playwright');
const path = require('path');

async function testKeywordFilters() {
  console.log('=== LinkedIn Keyword Filter Debug Test ===\n');

  const extensionPath = path.resolve(__dirname, '../../../chrome-extension');
  console.log('Extension path:', extensionPath);

  const browser = await chromium.launchPersistentContext('', {
    headless: false,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
      '--no-sandbox',
      '--disable-blink-features=AutomationControlled'
    ]
  });

  const pages = browser.pages();
  let page = pages[0];
  if (!page) {
    page = await browser.newPage();
  }

  // Collect console messages
  const consoleLogs = [];
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('JobFiltr') || text.includes('KEYWORD') || text.includes('Include') || text.includes('Exclude')) {
      consoleLogs.push(`[${msg.type()}] ${text}`);
      console.log(`[Console] ${text}`);
    }
  });

  try {
    // Navigate to LinkedIn Jobs
    console.log('\n1. Navigating to LinkedIn Jobs...');
    await page.goto('https://www.linkedin.com/jobs/search/?keywords=software%20engineer', {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    // Wait for page to load
    await page.waitForTimeout(3000);

    // Check if we're logged in (look for job cards or sign-in form)
    const isLoggedIn = await page.locator('a[href*="/jobs/view/"]').first().isVisible().catch(() => false);
    console.log('Logged in:', isLoggedIn);

    if (!isLoggedIn) {
      console.log('\n⚠️ Not logged in to LinkedIn. Please log in manually...');
      await page.waitForTimeout(60000); // Wait 60 seconds for manual login
    }

    // Wait for job cards
    console.log('\n2. Waiting for job cards...');
    await page.waitForSelector('a[href*="/jobs/view/"]', { timeout: 30000 });

    // Get extension popup
    console.log('\n3. Opening extension popup...');

    // Find extension ID
    const extensionId = await page.evaluate(async () => {
      if (chrome && chrome.runtime) {
        return chrome.runtime.id;
      }
      return null;
    }).catch(() => null);

    console.log('Extension ID from page:', extensionId);

    // Open popup in new tab
    const popupUrl = `chrome-extension://${extensionId || 'unknown'}/popup-v2.html`;
    console.log('Popup URL:', popupUrl);

    // Try to get extension info from service worker
    let extId = null;
    const serviceWorkers = browser.serviceWorkers();
    for (const sw of serviceWorkers) {
      const url = sw.url();
      if (url.includes('chrome-extension://') && url.includes('background')) {
        const match = url.match(/chrome-extension:\/\/([^/]+)/);
        if (match) {
          extId = match[1];
          console.log('Found extension ID from SW:', extId);
          break;
        }
      }
    }

    if (!extId) {
      console.log('Could not find extension ID, checking running extensions...');

      // List all pages to find extension
      const allPages = browser.pages();
      for (const p of allPages) {
        const url = p.url();
        console.log('Page URL:', url);
        if (url.includes('chrome-extension://')) {
          const match = url.match(/chrome-extension:\/\/([^/]+)/);
          if (match) extId = match[1];
        }
      }
    }

    if (extId) {
      // Open popup in new page
      const popupPage = await browser.newPage();
      await popupPage.goto(`chrome-extension://${extId}/popup-v2.html`, { timeout: 10000 });

      // Collect popup console messages
      popupPage.on('console', msg => {
        const text = msg.text();
        console.log(`[Popup Console] ${text}`);
      });

      await popupPage.waitForTimeout(2000);

      // Check if user is authenticated
      const authOverlay = await popupPage.locator('.auth-overlay').isVisible().catch(() => false);
      console.log('Auth overlay visible:', authOverlay);

      // Find include keywords input
      const includeInput = popupPage.locator('#includeKeywordInput');
      const includeInputVisible = await includeInput.isVisible().catch(() => false);
      console.log('Include keyword input visible:', includeInputVisible);

      if (includeInputVisible) {
        // Add a test keyword
        console.log('\n4. Adding test keyword "python"...');
        await includeInput.fill('python');
        await popupPage.locator('#addIncludeKeyword').click();
        await popupPage.waitForTimeout(500);

        // Check if chip was created
        const chips = await popupPage.locator('.keyword-chip').count();
        console.log('Keyword chips count:', chips);

        // Check the include keywords checkbox
        console.log('\n5. Checking include keywords checkbox...');
        const checkbox = popupPage.locator('#filterIncludeKeywords');
        const isChecked = await checkbox.isChecked();
        console.log('Checkbox initially checked:', isChecked);

        if (!isChecked) {
          await checkbox.check();
          console.log('Checkbox now checked:', await checkbox.isChecked());
        }

        await popupPage.waitForTimeout(500);

        // Click Apply Filters
        console.log('\n6. Clicking Apply Filters...');
        await popupPage.locator('#applyFilters').click();

        await popupPage.waitForTimeout(3000);

        // Check popup console for keyword debug output
        console.log('\n=== Checking popup console output ===');
      } else {
        console.log('Include keyword input not found - auth may be required');
      }

      await popupPage.close();
    }

    // Go back to LinkedIn page and check content script console
    console.log('\n7. Checking content script console output...');
    await page.bringToFront();
    await page.waitForTimeout(2000);

    // Print collected logs
    console.log('\n=== Collected Console Logs ===');
    consoleLogs.forEach(log => console.log(log));

    // Check if any jobs were hidden
    const hiddenJobs = await page.locator('[data-jobfiltr-hidden="true"]').count();
    console.log('\nHidden job cards:', hiddenJobs);

    const visibleJobs = await page.locator('a[href*="/jobs/view/"]').count();
    console.log('Visible job links:', visibleJobs);

    console.log('\n=== Test Complete ===');
    console.log('Check console output above for keyword filter debug info');

    // Keep browser open for inspection
    console.log('\nBrowser will stay open for 60 seconds for inspection...');
    await page.waitForTimeout(60000);

  } catch (error) {
    console.error('Test error:', error.message);
    console.log('\nCollected logs before error:');
    consoleLogs.forEach(log => console.log(log));
  } finally {
    await browser.close();
  }
}

testKeywordFilters().catch(console.error);
