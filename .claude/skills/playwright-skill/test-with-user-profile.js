/**
 * Test with user's actual Chrome profile where extension is already installed
 */

const { chromium } = require('playwright');
const path = require('path');

async function testWithUserProfile() {
  // Use the actual Chrome user data directory
  const userDataDir = path.join(process.env.LOCALAPPDATA || '', 'Google', 'Chrome', 'User Data');

  console.log('Using Chrome profile:', userDataDir);

  let browser;
  try {
    browser = await chromium.launchPersistentContext(userDataDir, {
      headless: false,
      channel: 'chrome',
      args: [
        '--disable-blink-features=AutomationControlled',
        '--profile-directory=Default',
        '--no-first-run'
      ],
      ignoreDefaultArgs: ['--enable-automation'],
      viewport: { width: 1400, height: 900 }
    });

    const page = browser.pages()[0] || await browser.newPage();

    console.log('\n1. Navigating to Indeed job page...');
    await page.goto('https://www.indeed.com/viewjob?jk=58ec1c073009ea48', {
      waitUntil: 'networkidle',
      timeout: 60000
    });

    await page.waitForTimeout(3000);

    // Check for Cloudflare
    const pageContent = await page.content();
    if (pageContent.includes('Cloudflare') || pageContent.includes('Additional Verification')) {
      console.log('Cloudflare detected - waiting for manual verification...');
      console.log('Please solve the captcha in the browser window.');
      await page.waitForSelector('h1.jobsearch-JobInfoHeader-title, [class*="jobsearch-JobInfo"]', { timeout: 120000 });
      console.log('Page loaded after verification!');
    }

    await page.screenshot({ path: path.join(__dirname, 'user-profile-1-indeed.png') });
    console.log('Screenshot saved: user-profile-1-indeed.png');

    // Test JSON-LD extraction
    console.log('\n2. Testing JSON-LD extraction...');
    const jsonLdData = await page.evaluate(() => {
      const scripts = document.querySelectorAll('script[type="application/ld+json"]');
      for (const script of scripts) {
        try {
          const data = JSON.parse(script.textContent);
          if (data['@type'] === 'JobPosting' && data.datePosted) {
            return {
              datePosted: data.datePosted,
              title: data.title,
              company: data.hiringOrganization?.name
            };
          }
        } catch (e) {}
      }
      return null;
    });

    if (jsonLdData) {
      const daysOld = Math.floor((new Date() - new Date(jsonLdData.datePosted)) / (1000 * 60 * 60 * 24));
      console.log('Job Title:', jsonLdData.title);
      console.log('Company:', jsonLdData.company);
      console.log('Date Posted:', jsonLdData.datePosted);
      console.log('Days Old:', daysOld);

      let expectedRisk;
      if (daysOld <= 3) expectedRisk = 0;
      else if (daysOld <= 7) expectedRisk = 5;
      else if (daysOld <= 14) expectedRisk = 15;
      else if (daysOld <= 21) expectedRisk = 30;
      else if (daysOld <= 30) expectedRisk = 45;
      else if (daysOld <= 45) expectedRisk = 60;
      else if (daysOld <= 60) expectedRisk = 75;
      else if (daysOld <= 90) expectedRisk = 85;
      else expectedRisk = 95;

      console.log('\nExpected Posting Age Risk:', expectedRisk + '%');
    }

    // Check for extension
    console.log('\n3. Checking for extension...');
    const bgPages = browser.backgroundPages();
    const serviceWorkers = browser.serviceWorkers();

    console.log('Background pages:', bgPages.length);
    console.log('Service workers:', serviceWorkers.length);

    let extensionId = null;
    for (const sw of serviceWorkers) {
      if (sw.url().includes('chrome-extension://')) {
        extensionId = sw.url().split('chrome-extension://')[1].split('/')[0];
        console.log('Found extension SW:', sw.url());
      }
    }

    for (const bg of bgPages) {
      if (bg.url().includes('chrome-extension://')) {
        extensionId = bg.url().split('chrome-extension://')[1].split('/')[0];
        console.log('Found extension BG:', bg.url());
      }
    }

    if (extensionId) {
      console.log('Extension ID:', extensionId);

      // Open popup
      const popupPage = await browser.newPage();
      await popupPage.goto(`chrome-extension://${extensionId}/popup-v2.html`, { waitUntil: 'domcontentloaded' });
      await popupPage.waitForTimeout(2000);
      await popupPage.screenshot({ path: path.join(__dirname, 'user-profile-2-popup.png') });

      // Click Scanner tab
      try {
        await popupPage.click('[data-tab="scanner"]');
        await popupPage.waitForTimeout(1000);
        await popupPage.screenshot({ path: path.join(__dirname, 'user-profile-3-scanner.png') });

        // Click Scan
        await page.bringToFront();
        await popupPage.bringToFront();
        await popupPage.click('#scanButton');
        await popupPage.waitForTimeout(5000);
        await popupPage.screenshot({ path: path.join(__dirname, 'user-profile-4-results.png'), fullPage: true });

        // Get posting age risk
        const risk = await popupPage.evaluate(() => {
          const text = document.body.innerText;
          const match = text.match(/posting\s*age[^%]*?(\d+)%/i);
          return match ? match[1] : 'not found';
        });

        console.log('\n====================================');
        console.log('ACTUAL POSTING AGE RISK:', risk + '%');
        console.log('====================================');
      } catch (e) {
        console.log('Error during scan:', e.message);
      }
    }

    console.log('\nBrowser staying open for 60 seconds for manual testing...');
    console.log('You can manually test the extension Scanner tab.');
    await page.waitForTimeout(60000);

  } catch (error) {
    console.error('Error:', error.message);
    if (error.message.includes('Make sure no other Chrome instances are running')) {
      console.log('\n*** Please close all Chrome windows and try again ***');
    }
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

testWithUserProfile();
