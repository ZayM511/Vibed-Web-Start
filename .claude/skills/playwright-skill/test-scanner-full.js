/**
 * Full Scanner test - verifies posting age detection via extension popup
 */

const { chromium } = require('playwright');
const path = require('path');

async function runFullTest() {
  const extensionPath = path.resolve(__dirname, '../../..', 'chrome-extension');
  const userDataDir = path.join(process.env.LOCALAPPDATA || '', 'Google', 'Chrome', 'User Data - Test');

  console.log('Extension path:', extensionPath);

  let browser;
  try {
    browser = await chromium.launchPersistentContext(userDataDir, {
      headless: false,
      channel: 'chrome',
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
        '--disable-blink-features=AutomationControlled',
        '--no-first-run',
        '--no-default-browser-check'
      ],
      ignoreDefaultArgs: ['--enable-automation'],
      viewport: { width: 1400, height: 900 }
    });

    const page = browser.pages()[0] || await browser.newPage();

    // Navigate to Indeed job page
    console.log('Navigating to Indeed job page...');
    await page.goto('https://www.indeed.com/viewjob?jk=58ec1c073009ea48', {
      waitUntil: 'networkidle',
      timeout: 60000
    });

    // Wait for page to fully load
    await page.waitForTimeout(5000);

    // Check if page loaded (no Cloudflare)
    const title = await page.title();
    console.log('Page title:', title);

    if (title.includes('Verification') || title.includes('Cloudflare')) {
      console.log('Cloudflare detected - please manually verify and then the test will continue...');
      await page.waitForTimeout(30000);
    }

    // Take screenshot of job page
    await page.screenshot({ path: path.join(__dirname, 'test-1-job-page.png') });
    console.log('Screenshot 1: Job page saved');

    // Get the extension ID by looking at service workers
    let extensionId = null;
    const targets = browser.serviceWorkers();
    for (const target of targets) {
      const url = target.url();
      if (url.includes('chrome-extension://')) {
        extensionId = url.split('chrome-extension://')[1].split('/')[0];
        console.log('Found extension ID:', extensionId);
        break;
      }
    }

    if (!extensionId) {
      // Try to get from background pages
      const bgPages = browser.backgroundPages();
      for (const bg of bgPages) {
        const url = bg.url();
        if (url.includes('chrome-extension://')) {
          extensionId = url.split('chrome-extension://')[1].split('/')[0];
          console.log('Found extension ID from background:', extensionId);
          break;
        }
      }
    }

    if (extensionId) {
      // Open extension popup in a new tab
      const popupUrl = `chrome-extension://${extensionId}/popup-v2.html`;
      console.log('Opening extension popup at:', popupUrl);

      const popupPage = await browser.newPage();
      await popupPage.goto(popupUrl, { waitUntil: 'domcontentloaded' });
      await popupPage.waitForTimeout(2000);

      // Take screenshot of popup
      await popupPage.screenshot({ path: path.join(__dirname, 'test-2-popup-initial.png') });
      console.log('Screenshot 2: Popup initial state saved');

      // Click on Scanner tab (tab id is 'scanner')
      try {
        // Wait for tabs to be visible
        await popupPage.waitForSelector('.tab-btn', { timeout: 5000 });

        // Find and click the Scanner tab
        const scannerTab = await popupPage.$('button:has-text("Scanner")');
        if (scannerTab) {
          await scannerTab.click();
          console.log('Clicked Scanner tab');
          await popupPage.waitForTimeout(1000);
        } else {
          // Try by ID
          await popupPage.click('#scanner-tab');
          console.log('Clicked Scanner tab by ID');
        }

        await popupPage.screenshot({ path: path.join(__dirname, 'test-3-scanner-tab.png') });
        console.log('Screenshot 3: Scanner tab saved');

        // Look for Scan Job button and click it
        const scanButton = await popupPage.$('button:has-text("Scan Job")');
        if (scanButton) {
          // First we need to make sure the Indeed tab is active
          // Go back to the first page with the job
          await page.bringToFront();
          await page.waitForTimeout(500);

          // Now click scan from popup
          await popupPage.bringToFront();
          await scanButton.click();
          console.log('Clicked Scan Job button');

          // Wait for scan to complete
          await popupPage.waitForTimeout(5000);

          await popupPage.screenshot({ path: path.join(__dirname, 'test-4-scan-results.png'), fullPage: true });
          console.log('Screenshot 4: Scan results saved');

          // Try to get the posting age risk value
          const postingAgeRisk = await popupPage.evaluate(() => {
            // Look for the posting age row in the scan results
            const rows = document.querySelectorAll('.analysis-row, .risk-row, .detail-row');
            for (const row of rows) {
              const text = row.textContent;
              if (text.includes('Posting Age') || text.includes('posting age')) {
                return text;
              }
            }

            // Alternative: look for percentage values
            const allText = document.body.innerText;
            const match = allText.match(/posting\s*age[^%]*(\d+)%/i);
            return match ? `Posting Age: ${match[1]}%` : 'Not found';
          });

          console.log('\n=== POSTING AGE RESULT ===');
          console.log(postingAgeRisk);

        } else {
          console.log('Could not find Scan Job button');
        }

      } catch (e) {
        console.error('Error interacting with popup:', e.message);
      }

    } else {
      console.log('Could not find extension ID - extension may not have loaded');
    }

    // Keep browser open for manual inspection
    console.log('\nTest complete. Browser will stay open for 30 seconds for manual inspection...');
    await page.waitForTimeout(30000);

  } catch (error) {
    console.error('Test error:', error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

runFullTest();
