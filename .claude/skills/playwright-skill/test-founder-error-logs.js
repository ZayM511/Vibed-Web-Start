/**
 * Test Extension Settings Page - Founder Mode with Error Logs
 * This script loads the extension and simulates founder mode to test the error logs section
 */

const { chromium } = require('playwright');
const path = require('path');

async function testFounderErrorLogs() {
  const extensionPath = path.resolve(__dirname, '../../../chrome-extension');

  console.log('Extension path:', extensionPath);
  console.log('Launching browser with extension...');

  const browser = await chromium.launchPersistentContext('', {
    headless: false,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
      '--no-sandbox',
    ],
  });

  try {
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Get extension ID
    let extensionId = 'cbfnhebmmmalfoabjmliiidiijpndmbg';
    const backgrounds = browser.serviceWorkers();
    for (const worker of backgrounds) {
      const url = worker.url();
      if (url.includes('chrome-extension://')) {
        extensionId = url.split('chrome-extension://')[1].split('/')[0];
        break;
      }
    }

    console.log('Extension ID:', extensionId);

    // Navigate to settings page
    const settingsUrl = `chrome-extension://${extensionId}/settings.html`;
    const page = await browser.newPage();
    await page.goto(settingsUrl);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Simulate founder mode by adding the class to body and making the panel visible
    console.log('\nSimulating founder mode...');
    await page.evaluate(() => {
      // Add founder-mode class to body
      document.body.classList.add('founder-mode');

      // Show the analytics panel
      const analyticsPanel = document.getElementById('analyticsPanel');
      if (analyticsPanel) {
        analyticsPanel.style.display = 'block';
      }

      // Show the founder greeting
      const founderGreeting = document.getElementById('founderGreeting');
      if (founderGreeting) {
        founderGreeting.style.display = 'block';
      }

      // Show error logs button in header
      const errorLogsBtn = document.getElementById('errorLogsBtn');
      if (errorLogsBtn) {
        errorLogsBtn.style.display = 'flex';
      }

      // Show founder crown
      const founderCrown = document.getElementById('founderCrown');
      if (founderCrown) {
        founderCrown.classList.remove('hidden');
      }
    });

    await page.waitForTimeout(500);

    // Set viewport to show the full width
    await page.setViewportSize({ width: 1200, height: 900 });
    await page.waitForTimeout(500);

    // Take screenshot of full page with founder mode
    const screenshotPath1 = path.resolve(__dirname, 'founder-settings-full.png');
    await page.screenshot({
      path: screenshotPath1,
      fullPage: true
    });
    console.log('Full page screenshot saved to:', screenshotPath1);

    // Scroll to the error logs section and take a focused screenshot
    const errorLogsSection = await page.$('.error-logs-section');
    if (errorLogsSection) {
      await errorLogsSection.scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);

      const screenshotPath2 = path.resolve(__dirname, 'error-logs-section.png');
      await errorLogsSection.screenshot({
        path: screenshotPath2
      });
      console.log('Error logs section screenshot saved to:', screenshotPath2);
    }

    // Check element values
    console.log('\n=== Error Logs Section Status ===');

    const statsTotal = await page.$eval('#inlineStatTotal', el => el.textContent).catch(() => 'N/A');
    const stats24h = await page.$eval('#inlineStat24h', el => el.textContent).catch(() => 'N/A');
    const statsUnresolved = await page.$eval('#inlineStatUnresolved', el => el.textContent).catch(() => 'N/A');
    const stats7d = await page.$eval('#inlineStat7d', el => el.textContent).catch(() => 'N/A');

    console.log(`Total Errors: ${statsTotal}`);
    console.log(`Last 24h: ${stats24h}`);
    console.log(`Unresolved: ${statsUnresolved}`);
    console.log(`Last 7 Days: ${stats7d}`);

    const linkedInCount = await page.$eval('#inlinePlatformLinkedIn', el => el.textContent).catch(() => 'N/A');
    const indeedCount = await page.$eval('#inlinePlatformIndeed', el => el.textContent).catch(() => 'N/A');
    const googleCount = await page.$eval('#inlinePlatformGoogle', el => el.textContent).catch(() => 'N/A');

    console.log(`\nPlatform Breakdown:`);
    console.log(`  LinkedIn: ${linkedInCount}`);
    console.log(`  Indeed: ${indeedCount}`);
    console.log(`  Google: ${googleCount}`);

    // Check errors list content
    const errorsList = await page.$eval('#inlineErrorsList', el => el.innerHTML).catch(() => '');
    if (errorsList.includes('inline-error-item')) {
      console.log('\n✅ Error items are being displayed');
    } else if (errorsList.includes('inline-error-empty')) {
      console.log('\n✅ Empty state displayed (no unresolved errors)');
    } else if (errorsList.includes('inline-error-loading')) {
      console.log('\n⏳ Still loading errors...');
    }

    // Check visibility of key elements
    const analyticsVisible = await page.$eval('#analyticsPanel', el => {
      const style = window.getComputedStyle(el);
      return style.display !== 'none';
    }).catch(() => false);

    console.log(`\nAnalytics Panel Visible: ${analyticsVisible ? '✅ Yes' : '❌ No'}`);

    // Take a final wide screenshot
    await page.setViewportSize({ width: 1400, height: 1000 });
    await page.waitForTimeout(500);
    const screenshotPath3 = path.resolve(__dirname, 'founder-wide-view.png');
    await page.screenshot({
      path: screenshotPath3,
      fullPage: false
    });
    console.log('\nWide view screenshot saved to:', screenshotPath3);

    console.log('\n📸 Browser will stay open for 15 seconds for manual inspection...');
    await page.waitForTimeout(15000);

  } catch (error) {
    console.error('Error during test:', error);
  } finally {
    await browser.close();
    console.log('Browser closed.');
  }
}

testFounderErrorLogs().catch(console.error);
