/**
 * Test extension integration by loading extension and checking content script
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function testExtensionIntegration() {
  const extensionPath = path.resolve(__dirname, '../../..', 'chrome-extension');
  const userDataDir = path.join(process.env.LOCALAPPDATA || '', 'Google', 'Chrome', 'User Data - Test2');

  console.log('Extension path:', extensionPath);
  console.log('User data dir:', userDataDir);

  // Clean user data dir to ensure fresh extension load
  if (fs.existsSync(userDataDir)) {
    try {
      fs.rmSync(userDataDir, { recursive: true, force: true });
      console.log('Cleaned previous user data directory');
    } catch (e) {
      console.log('Could not clean user data dir:', e.message);
    }
  }

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

    // First go to chrome://extensions to verify extension loaded
    console.log('\n1. Checking extension is loaded...');
    await page.goto('chrome://extensions', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(__dirname, 'test-ext-1-extensions.png') });

    // Navigate to Indeed job page
    console.log('\n2. Navigating to Indeed job page...');
    await page.goto('https://www.indeed.com/viewjob?jk=58ec1c073009ea48', {
      waitUntil: 'networkidle',
      timeout: 60000
    });

    // Wait for content script to load
    await page.waitForTimeout(5000);

    // Take screenshot
    await page.screenshot({ path: path.join(__dirname, 'test-ext-2-indeed.png') });
    console.log('Indeed page loaded');

    // Check if content script is injected by looking for JobFiltr markers
    console.log('\n3. Testing if content script is active...');

    const contentScriptCheck = await page.evaluate(() => {
      // The content script should have set up message listeners
      // Let's check if there are any JobFiltr-specific elements or markers
      const jobFiltrBadges = document.querySelectorAll('[class*="jobfiltr"], [data-jobfiltr]');

      return {
        jobFiltrElements: jobFiltrBadges.length,
        pageTitle: document.title,
        isIndeed: window.location.hostname.includes('indeed.com')
      };
    });

    console.log('Content script check:', contentScriptCheck);

    // Now test the EXTRACT_JOB_INFO message by simulating what the popup does
    // We can't send chrome.runtime messages from page context, but we can inject a script

    console.log('\n4. Testing JSON-LD extraction in page context...');

    const extractionTest = await page.evaluate(() => {
      // This simulates the extractJobInfo function from content-indeed-v3.js

      const postedDateSelectors = [
        '[data-testid="myJobsStateDate"]',
        '.jobsearch-JobMetadataFooter [data-testid*="date"]',
        '.jobsearch-HiringInsights-entry--text',
        '.jobsearch-JobMetadataHeader-item:last-child',
        '[class*="posted"]',
        '.date'
      ];

      let postedDate = null;
      let domResult = null;

      for (const selector of postedDateSelectors) {
        const elem = document.querySelector(selector);
        if (elem) {
          const text = elem.textContent.trim();
          // FIX: Use strict regex that only matches parseable date patterns
          const datePattern = /\d+\s*(day|hour|week|month|minute)s?\s*ago|posted\s*(today|yesterday)|\btoday\b|\byesterday\b|just\s*now|moments?\s*ago/i;
          if (datePattern.test(text)) {
            postedDate = text;
            domResult = { selector, text };
            break;
          }
        }
      }

      // JSON-LD extraction (same as content script)
      let jsonLdResult = null;
      if (!postedDate) {
        try {
          const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
          for (const script of jsonLdScripts) {
            const data = JSON.parse(script.textContent);
            if (data['@type'] === 'JobPosting' && data.datePosted) {
              const postedDateObj = new Date(data.datePosted);
              const now = new Date();
              const diffMs = now - postedDateObj;
              const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

              if (diffDays === 0) {
                postedDate = 'Posted today';
              } else if (diffDays === 1) {
                postedDate = 'Posted 1 day ago';
              } else {
                postedDate = `Posted ${diffDays} days ago`;
              }

              jsonLdResult = {
                rawDate: data.datePosted,
                daysOld: diffDays,
                formatted: postedDate
              };
              break;
            }
          }
        } catch (e) {
          jsonLdResult = { error: e.message };
        }
      }

      // Simulate full job extraction
      const title = document.querySelector('.jobsearch-JobInfoHeader-title span, h1')?.textContent?.trim() || 'Not found';
      const company = document.querySelector('[data-testid="inlineHeader-companyName"] a, .jobsearch-InlineCompanyRating-companyHeader a')?.textContent?.trim() || 'Not found';

      return {
        title,
        company,
        domResult,
        jsonLdResult,
        finalPostedDate: postedDate
      };
    });

    console.log('\nExtraction results:');
    console.log('- Title:', extractionTest.title);
    console.log('- Company:', extractionTest.company);
    console.log('- DOM Date Result:', extractionTest.domResult);
    console.log('- JSON-LD Result:', JSON.stringify(extractionTest.jsonLdResult, null, 2));
    console.log('- Final Posted Date:', extractionTest.finalPostedDate);

    // Now let's try to get extension ID and open popup
    console.log('\n5. Getting extension ID...');

    // Check service workers
    const serviceWorkers = browser.serviceWorkers();
    console.log('Service workers:', serviceWorkers.length);

    for (const sw of serviceWorkers) {
      console.log('SW URL:', sw.url());
    }

    // Check background pages
    const bgPages = browser.backgroundPages();
    console.log('Background pages:', bgPages.length);

    for (const bg of bgPages) {
      console.log('BG URL:', bg.url());
    }

    // Try to find extension ID
    let extensionId = null;
    for (const sw of serviceWorkers) {
      const url = sw.url();
      if (url.includes('chrome-extension://')) {
        extensionId = url.split('chrome-extension://')[1].split('/')[0];
        break;
      }
    }

    if (!extensionId) {
      for (const bg of bgPages) {
        const url = bg.url();
        if (url.includes('chrome-extension://')) {
          extensionId = url.split('chrome-extension://')[1].split('/')[0];
          break;
        }
      }
    }

    if (extensionId) {
      console.log('Found extension ID:', extensionId);

      // Open the popup in a new tab
      console.log('\n6. Opening extension popup...');
      const popupUrl = `chrome-extension://${extensionId}/popup-v2.html`;
      const popupPage = await browser.newPage();
      await popupPage.goto(popupUrl, { waitUntil: 'domcontentloaded' });
      await popupPage.waitForTimeout(3000);

      await popupPage.screenshot({ path: path.join(__dirname, 'test-ext-3-popup.png') });
      console.log('Popup loaded');

      // Click Scanner tab
      try {
        await popupPage.waitForSelector('[data-tab="scanner"], button:has-text("Scanner")', { timeout: 5000 });
        await popupPage.click('[data-tab="scanner"], button:has-text("Scanner")');
        console.log('Clicked Scanner tab');
        await popupPage.waitForTimeout(1000);
        await popupPage.screenshot({ path: path.join(__dirname, 'test-ext-4-scanner-tab.png') });
      } catch (e) {
        console.log('Could not click Scanner tab:', e.message);
      }

      // Try to trigger scan
      try {
        await page.bringToFront(); // Make sure Indeed tab is active
        await popupPage.bringToFront();

        const scanBtn = await popupPage.$('button:has-text("Scan"), #scanButton');
        if (scanBtn) {
          await scanBtn.click();
          console.log('Clicked Scan button');
          await popupPage.waitForTimeout(5000);
          await popupPage.screenshot({ path: path.join(__dirname, 'test-ext-5-scan-result.png'), fullPage: true });

          // Extract the posting age risk from the results
          const riskValue = await popupPage.evaluate(() => {
            const text = document.body.innerText;
            const match = text.match(/posting\s*age[:\s]*(\d+)%/i);
            return match ? match[1] : 'not found';
          });

          console.log('\n===========================================');
          console.log('POSTING AGE RISK VALUE:', riskValue + '%');
          console.log('===========================================');
        }
      } catch (e) {
        console.log('Error during scan:', e.message);
      }
    } else {
      console.log('Could not find extension ID');
    }

    // Keep browser open
    console.log('\nBrowser staying open for manual inspection (60 seconds)...');
    await page.waitForTimeout(60000);

  } catch (error) {
    console.error('Test error:', error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

testExtensionIntegration();
