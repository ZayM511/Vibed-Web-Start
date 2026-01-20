/**
 * Test Extension Settings Page - Error Logs Section
 * This script loads the Chrome extension and tests the settings page
 */

const { chromium } = require('playwright');
const path = require('path');

async function testExtensionSettings() {
  const extensionPath = path.resolve(__dirname, '../../../chrome-extension');

  console.log('Extension path:', extensionPath);
  console.log('Launching browser with extension...');

  // Launch Chrome with the extension loaded
  const browser = await chromium.launchPersistentContext('', {
    headless: false,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
      '--no-sandbox',
    ],
  });

  try {
    // Wait a moment for extension to initialize
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Get the extension ID from the service worker
    let extensionId = null;
    const backgrounds = browser.serviceWorkers();

    for (const worker of backgrounds) {
      const url = worker.url();
      console.log('Service worker URL:', url);
      if (url.includes('chrome-extension://')) {
        extensionId = url.split('chrome-extension://')[1].split('/')[0];
        console.log('Found extension ID:', extensionId);
        break;
      }
    }

    if (!extensionId) {
      // Try to find extension ID from background pages
      const pages = browser.pages();
      for (const page of pages) {
        const url = page.url();
        if (url.includes('chrome-extension://')) {
          extensionId = url.split('chrome-extension://')[1].split('/')[0];
          console.log('Found extension ID from page:', extensionId);
          break;
        }
      }
    }

    if (!extensionId) {
      console.log('Could not find extension ID automatically. Using known ID...');
      extensionId = 'cbfnhebmmmalfoabjmliiidiijpndmbg';
    }

    // Navigate to the extension's settings page
    const settingsUrl = `chrome-extension://${extensionId}/settings.html`;
    console.log('Navigating to:', settingsUrl);

    const page = await browser.newPage();
    await page.goto(settingsUrl);
    await page.waitForLoadState('networkidle');

    // Wait for content to load
    await page.waitForTimeout(2000);

    // Take a full page screenshot
    const screenshotPath = path.resolve(__dirname, 'extension-settings-screenshot.png');
    await page.screenshot({
      path: screenshotPath,
      fullPage: true
    });
    console.log('Screenshot saved to:', screenshotPath);

    // Check if founder mode is enabled (we need to simulate founder login)
    // For now, let's check if the error logs section exists in the HTML
    const errorLogsSection = await page.$('.error-logs-section');
    if (errorLogsSection) {
      console.log('✅ Extension Error Logs section found!');
    } else {
      console.log('⚠️ Error logs section not visible (may require founder mode)');
    }

    // Check for analytics panel
    const analyticsPanel = await page.$('#analyticsPanel');
    if (analyticsPanel) {
      console.log('✅ Analytics panel found!');

      // Check if it's visible (founder mode)
      const isVisible = await analyticsPanel.isVisible();
      console.log('Analytics panel visible:', isVisible);
    }

    // Log the page title
    const title = await page.title();
    console.log('Page title:', title);

    // Check for key elements in the error logs section
    const elementsToCheck = [
      { selector: '#inlineStatTotal', name: 'Total Errors stat' },
      { selector: '#inlineStat24h', name: 'Last 24h stat' },
      { selector: '#inlineStatUnresolved', name: 'Unresolved stat' },
      { selector: '#inlineErrorsList', name: 'Errors list' },
      { selector: '#viewAllErrorsBtn', name: 'View All Errors button' },
      { selector: '.error-stats-grid', name: 'Stats grid' },
      { selector: '.error-platform-breakdown', name: 'Platform breakdown' },
    ];

    console.log('\nChecking for error logs elements:');
    for (const el of elementsToCheck) {
      const element = await page.$(el.selector);
      console.log(`  ${element ? '✅' : '❌'} ${el.name} (${el.selector})`);
    }

    // Try to enable founder mode by simulating founder email
    console.log('\nAttempting to check page structure...');

    // Get the HTML content of the analytics panel area
    const htmlContent = await page.content();

    // Check if error-logs-section exists in HTML
    if (htmlContent.includes('error-logs-section')) {
      console.log('✅ Error logs section HTML exists in page');
    } else {
      console.log('❌ Error logs section HTML NOT found in page');
    }

    if (htmlContent.includes('Extension Error Logs')) {
      console.log('✅ "Extension Error Logs" text found in page');
    } else {
      console.log('❌ "Extension Error Logs" text NOT found in page');
    }

    // Keep browser open for manual inspection
    console.log('\n📸 Browser will stay open for 10 seconds for manual inspection...');
    await page.waitForTimeout(10000);

  } catch (error) {
    console.error('Error during test:', error);
  } finally {
    await browser.close();
    console.log('Browser closed.');
  }
}

testExtensionSettings().catch(console.error);
