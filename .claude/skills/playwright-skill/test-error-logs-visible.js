/**
 * Test Extension Error Logs Section - Force Visibility
 */

const { chromium } = require('playwright');
const path = require('path');

async function testErrorLogsVisible() {
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

    let extensionId = 'cbfnhebmmmalfoabjmliiidiijpndmbg';
    const backgrounds = browser.serviceWorkers();
    for (const worker of backgrounds) {
      const url = worker.url();
      if (url.includes('chrome-extension://')) {
        extensionId = url.split('chrome-extension://')[1].split('/')[0];
        break;
      }
    }

    const settingsUrl = `chrome-extension://${extensionId}/settings.html`;
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1400, height: 1200 });
    await page.goto(settingsUrl);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Simulate founder mode and force analytics content visible
    console.log('Simulating founder mode and forcing content visible...');
    await page.evaluate(() => {
      // Add founder mode
      document.body.classList.add('founder-mode');

      // Show analytics panel
      const analyticsPanel = document.getElementById('analyticsPanel');
      if (analyticsPanel) {
        analyticsPanel.style.display = 'block';
      }

      // Show founder greeting
      const founderGreeting = document.getElementById('founderGreeting');
      if (founderGreeting) {
        founderGreeting.style.display = 'block';
      }

      // Show error logs button
      const errorLogsBtn = document.getElementById('errorLogsBtn');
      if (errorLogsBtn) {
        errorLogsBtn.style.display = 'flex';
      }

      // IMPORTANT: Hide loading state and show analytics content
      const analyticsLoading = document.getElementById('analyticsLoading');
      if (analyticsLoading) {
        analyticsLoading.style.display = 'none';
      }

      const analyticsContent = document.getElementById('analyticsContent');
      if (analyticsContent) {
        analyticsContent.classList.remove('hidden');
        analyticsContent.style.display = 'block';
      }
    });

    await page.waitForTimeout(500);

    // Screenshot 1: Full founder view with analytics visible
    const screenshot1 = path.resolve(__dirname, 'final-1-founder-analytics.png');
    await page.screenshot({ path: screenshot1, fullPage: true });
    console.log('Screenshot 1 saved:', screenshot1);

    // Scroll the analytics panel to show the error logs section
    console.log('Scrolling to error logs section...');
    await page.evaluate(() => {
      const analyticsPanel = document.getElementById('analyticsPanel');
      if (analyticsPanel) {
        // Find the error logs section and scroll to it
        const errorSection = analyticsPanel.querySelector('.error-logs-section');
        if (errorSection) {
          errorSection.scrollIntoView({ behavior: 'instant', block: 'start' });
        }
      }
    });

    await page.waitForTimeout(500);

    // Screenshot 2: Error logs section visible
    const screenshot2 = path.resolve(__dirname, 'final-2-error-logs-section.png');
    await page.screenshot({ path: screenshot2, fullPage: true });
    console.log('Screenshot 2 saved:', screenshot2);

    // Wait for error data to load
    await page.waitForTimeout(3000);

    // Screenshot 3: After data loads
    const screenshot3 = path.resolve(__dirname, 'final-3-after-data-load.png');
    await page.screenshot({ path: screenshot3, fullPage: true });
    console.log('Screenshot 3 saved:', screenshot3);

    // Get the error logs section stats
    const stats = await page.evaluate(() => {
      return {
        total: document.getElementById('inlineStatTotal')?.textContent || 'N/A',
        last24h: document.getElementById('inlineStat24h')?.textContent || 'N/A',
        unresolved: document.getElementById('inlineStatUnresolved')?.textContent || 'N/A',
        last7d: document.getElementById('inlineStat7d')?.textContent || 'N/A',
        linkedin: document.getElementById('inlinePlatformLinkedIn')?.textContent || 'N/A',
        indeed: document.getElementById('inlinePlatformIndeed')?.textContent || 'N/A',
        google: document.getElementById('inlinePlatformGoogle')?.textContent || 'N/A',
        errorsListContent: document.getElementById('inlineErrorsList')?.textContent?.substring(0, 100) || 'N/A',
      };
    });

    console.log('\n=== Error Logs Section Stats ===');
    console.log(`Total Errors: ${stats.total}`);
    console.log(`Last 24h: ${stats.last24h}`);
    console.log(`Unresolved: ${stats.unresolved}`);
    console.log(`Last 7 Days: ${stats.last7d}`);
    console.log(`\nPlatform Breakdown:`);
    console.log(`  LinkedIn: ${stats.linkedin}`);
    console.log(`  Indeed: ${stats.indeed}`);
    console.log(`  Google: ${stats.google}`);
    console.log(`\nErrors List Preview: ${stats.errorsListContent}`);

    // Check visibility
    const isErrorSectionVisible = await page.evaluate(() => {
      const section = document.querySelector('.error-logs-section');
      if (!section) return false;
      const rect = section.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    });

    console.log(`\n✅ Error Logs Section Visible: ${isErrorSectionVisible ? 'Yes' : 'No'}`);

    console.log('\n📸 Browser will stay open for 30 seconds for manual inspection...');
    console.log('Scroll the right panel to see the Extension Error Logs section.');
    await page.waitForTimeout(30000);

  } catch (error) {
    console.error('Error during test:', error.message);
  } finally {
    await browser.close();
    console.log('\nBrowser closed.');
  }
}

testErrorLogsVisible().catch(console.error);
