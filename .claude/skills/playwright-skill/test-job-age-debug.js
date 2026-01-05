const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const extensionPath = path.resolve(__dirname, '../../../chrome-extension');
  console.log('Loading extension from:', extensionPath);

  // Launch Chrome with extension
  const browser = await chromium.launchPersistentContext('', {
    headless: false,
    channel: 'chrome',
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
    ],
    slowMo: 50
  });

  const page = await browser.newPage();

  // Capture ALL console messages
  page.on('console', msg => {
    console.log('CONSOLE:', msg.text());
  });

  // Capture page errors
  page.on('pageerror', error => {
    console.log('PAGE ERROR:', error.message);
  });

  console.log('\nNavigating to Indeed...');
  await page.goto('https://www.indeed.com/jobs?q=software+engineer&l=remote', {
    waitUntil: 'domcontentloaded',
    timeout: 60000
  });

  // Wait for page to fully load
  console.log('Waiting 5 seconds for page and content script to load...');
  await page.waitForTimeout(5000);

  console.log('\n=== CHECKING CONTENT SCRIPT STATUS ===');

  // Check if our script element exists (in document.documentElement)
  const scriptCheck = await page.evaluate(() => {
    const script = document.getElementById('jobfiltr-mosaic-extractor');
    const allScripts = document.querySelectorAll('script[id*="jobfiltr"]');
    return {
      hasScript: !!script,
      scriptCount: allScripts.length,
      scriptIds: Array.from(allScripts).map(s => s.id),
      // Check documentElement for any injected scripts
      docElementScriptCount: document.documentElement.querySelectorAll('script').length,
      bodyScriptCount: document.body.querySelectorAll('script').length
    };
  });

  console.log('Script check:', JSON.stringify(scriptCheck, null, 2));

  // Check if the custom event works
  console.log('\n=== TESTING CUSTOM EVENT ===');

  const eventTest = await page.evaluate(() => {
    return new Promise((resolve) => {
      let received = false;

      // Listen for the response
      const handler = (event) => {
        received = true;
        window.removeEventListener('jobfiltr-mosaic-data', handler);
        resolve({
          received: true,
          dataLength: event.detail ? event.detail.length : 0
        });
      };

      window.addEventListener('jobfiltr-mosaic-data', handler);

      // Trigger a request
      window.dispatchEvent(new CustomEvent('jobfiltr-request-mosaic'));

      // Timeout after 2 seconds
      setTimeout(() => {
        if (!received) {
          window.removeEventListener('jobfiltr-mosaic-data', handler);
          resolve({ received: false, dataLength: 0 });
        }
      }, 2000);
    });
  });

  console.log('Event test result:', eventTest);

  // Try manually extracting mosaic data
  console.log('\n=== MANUALLY CHECKING MOSAIC DATA ===');

  const mosaicCheck = await page.evaluate(() => {
    if (window.mosaic && window.mosaic.providerData) {
      const provider = window.mosaic.providerData['mosaic-provider-jobcards'];
      if (provider?.metaData?.mosaicProviderJobCardsModel?.results) {
        return {
          available: true,
          jobCount: provider.metaData.mosaicProviderJobCardsModel.results.length
        };
      }
    }
    return { available: false };
  });

  console.log('Mosaic data check:', mosaicCheck);

  console.log('\nBrowser staying open for 30 seconds...');
  await page.waitForTimeout(30000);

  await browser.close();
})();
