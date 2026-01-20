/**
 * Test Extension Error Logs Section - Final Version
 */

const { chromium } = require('playwright');
const path = require('path');

async function testErrorLogsFinal() {
  const extensionPath = path.resolve(__dirname, '../../../chrome-extension');

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

    // Navigate to settings page
    const settingsUrl = `chrome-extension://${extensionId}/settings.html`;
    const page = await browser.newPage();

    // Set larger viewport
    await page.setViewportSize({ width: 1400, height: 1200 });

    await page.goto(settingsUrl);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Simulate founder mode
    console.log('Simulating founder mode...');
    await page.evaluate(() => {
      document.body.classList.add('founder-mode');

      const analyticsPanel = document.getElementById('analyticsPanel');
      if (analyticsPanel) {
        analyticsPanel.style.display = 'block';
      }

      const founderGreeting = document.getElementById('founderGreeting');
      if (founderGreeting) {
        founderGreeting.style.display = 'block';
      }

      const errorLogsBtn = document.getElementById('errorLogsBtn');
      if (errorLogsBtn) {
        errorLogsBtn.style.display = 'flex';
      }
    });

    // Wait for analytics to load (or timeout after 5 seconds)
    console.log('Waiting for analytics to load...');
    await page.waitForTimeout(3000);

    // Screenshot 1: Full page founder view
    const screenshot1 = path.resolve(__dirname, 'test-1-founder-view.png');
    await page.screenshot({ path: screenshot1, fullPage: true });
    console.log('Screenshot 1 saved:', screenshot1);

    // Scroll to bottom of the analytics panel to find the error logs section
    console.log('Scrolling to error logs section...');
    await page.evaluate(() => {
      const analyticsPanel = document.getElementById('analyticsPanel');
      if (analyticsPanel) {
        analyticsPanel.scrollTop = analyticsPanel.scrollHeight;
      }
    });

    await page.waitForTimeout(1000);

    // Screenshot 2: Scrolled to bottom
    const screenshot2 = path.resolve(__dirname, 'test-2-scrolled-bottom.png');
    await page.screenshot({ path: screenshot2, fullPage: true });
    console.log('Screenshot 2 saved:', screenshot2);

    // Check if error logs section exists
    const errorSection = await page.$('.error-logs-section');
    const errorSectionHtml = await page.$eval('.error-logs-section', el => el.outerHTML).catch(() => null);

    if (errorSectionHtml) {
      console.log('\n✅ Error Logs Section found!');

      // Get the stats values
      const stats = await page.evaluate(() => {
        return {
          total: document.getElementById('inlineStatTotal')?.textContent || 'N/A',
          last24h: document.getElementById('inlineStat24h')?.textContent || 'N/A',
          unresolved: document.getElementById('inlineStatUnresolved')?.textContent || 'N/A',
          last7d: document.getElementById('inlineStat7d')?.textContent || 'N/A',
          linkedin: document.getElementById('inlinePlatformLinkedIn')?.textContent || 'N/A',
          indeed: document.getElementById('inlinePlatformIndeed')?.textContent || 'N/A',
          google: document.getElementById('inlinePlatformGoogle')?.textContent || 'N/A',
        };
      });

      console.log('\n=== Error Stats ===');
      console.log(`Total Errors: ${stats.total}`);
      console.log(`Last 24h: ${stats.last24h}`);
      console.log(`Unresolved: ${stats.unresolved}`);
      console.log(`Last 7 Days: ${stats.last7d}`);
      console.log(`\nPlatform Breakdown:`);
      console.log(`  LinkedIn: ${stats.linkedin}`);
      console.log(`  Indeed: ${stats.indeed}`);
      console.log(`  Google: ${stats.google}`);

      // Check the errors list content
      const errorListContent = await page.$eval('#inlineErrorsList', el => el.textContent).catch(() => '');
      if (errorListContent.includes('Loading')) {
        console.log('\n⏳ Errors list is still loading...');
      } else if (errorListContent.includes('No unresolved errors')) {
        console.log('\n✅ No unresolved errors (empty state displayed)');
      } else {
        console.log('\n✅ Errors are displayed in the list');
      }
    } else {
      console.log('\n❌ Error Logs Section NOT found');
    }

    // Test the View All Errors button
    const viewAllBtn = await page.$('#viewAllErrorsBtn');
    if (viewAllBtn) {
      console.log('\n✅ "View All Errors" button found');

      // Click the button to open the modal
      await viewAllBtn.click();
      await page.waitForTimeout(1000);

      // Screenshot 3: Error logs modal
      const screenshot3 = path.resolve(__dirname, 'test-3-error-modal.png');
      await page.screenshot({ path: screenshot3, fullPage: true });
      console.log('Screenshot 3 saved (modal):', screenshot3);

      // Check if modal opened
      const modal = await page.$('#errorLogsModal.active');
      if (modal) {
        console.log('✅ Error logs modal opened successfully');
      }

      // Close modal
      const closeBtn = await page.$('#closeErrorLogs');
      if (closeBtn) {
        await closeBtn.click();
        await page.waitForTimeout(500);
      }
    }

    // Test the header Error Logs button
    const headerBtn = await page.$('#errorLogsBtn');
    if (headerBtn) {
      console.log('\n✅ Header "Error Logs" button found');
    }

    console.log('\n\n📸 Browser will stay open for 20 seconds for manual inspection...');
    console.log('You can scroll the analytics panel to see the Extension Error Logs section.');
    await page.waitForTimeout(20000);

  } catch (error) {
    console.error('Error during test:', error.message);
  } finally {
    await browser.close();
    console.log('\nBrowser closed.');
  }
}

testErrorLogsFinal().catch(console.error);
