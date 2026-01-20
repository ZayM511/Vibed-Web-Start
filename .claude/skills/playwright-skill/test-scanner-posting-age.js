/**
 * Test script for Scanner posting age fix
 * Tests that JSON-LD datePosted extraction works correctly
 */

const { chromium } = require('playwright');
const path = require('path');

async function runTest() {
  const extensionPath = path.resolve(__dirname, '../../..', 'chrome-extension');
  const userDataDir = path.join(process.env.LOCALAPPDATA || '', 'Google', 'Chrome', 'User Data - Test');

  console.log('Extension path:', extensionPath);
  console.log('User data dir:', userDataDir);

  let browser;
  try {
    // Launch Chrome with extension
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
      viewport: { width: 1280, height: 900 }
    });

    const page = browser.pages()[0] || await browser.newPage();

    // Navigate to Indeed job page
    console.log('Navigating to Indeed job page...');
    await page.goto('https://www.indeed.com/viewjob?jk=58ec1c073009ea48', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });

    // Wait for page to load
    await page.waitForTimeout(3000);

    // Take screenshot
    await page.screenshot({ path: path.join(__dirname, 'indeed-job-loaded.png') });
    console.log('Screenshot saved: indeed-job-loaded.png');

    // Check for Cloudflare
    const pageContent = await page.content();
    if (pageContent.includes('Cloudflare') || pageContent.includes('Additional Verification')) {
      console.log('WARNING: Cloudflare verification detected - waiting for manual verification...');
      await page.waitForTimeout(30000); // Wait 30 seconds for manual verification
    }

    // Extract JSON-LD data
    const jsonLdData = await page.evaluate(() => {
      const scripts = document.querySelectorAll('script[type="application/ld+json"]');
      const results = [];
      for (const script of scripts) {
        try {
          const data = JSON.parse(script.textContent);
          results.push(data);
        } catch (e) {
          results.push({ error: e.message, raw: script.textContent.substring(0, 200) });
        }
      }
      return results;
    });

    console.log('JSON-LD data found:', JSON.stringify(jsonLdData, null, 2));

    // Find JobPosting with datePosted
    for (const data of jsonLdData) {
      if (data['@type'] === 'JobPosting' && data.datePosted) {
        console.log('\n=== FOUND JOB POSTING ===');
        console.log('datePosted:', data.datePosted);

        const postedDate = new Date(data.datePosted);
        const now = new Date();
        const diffDays = Math.floor((now - postedDate) / (1000 * 60 * 60 * 24));
        console.log('Days old:', diffDays);

        // Calculate expected risk
        let expectedRisk;
        if (diffDays <= 3) expectedRisk = 0;
        else if (diffDays <= 7) expectedRisk = 5;
        else if (diffDays <= 14) expectedRisk = 15;
        else if (diffDays <= 21) expectedRisk = 30;
        else if (diffDays <= 30) expectedRisk = 45;
        else if (diffDays <= 45) expectedRisk = 60;
        else if (diffDays <= 60) expectedRisk = 75;
        else if (diffDays <= 90) expectedRisk = 85;
        else expectedRisk = 95;

        console.log('Expected posting age risk:', expectedRisk + '%');
      }
    }

    // Keep browser open for manual testing
    console.log('\nBrowser will stay open for 60 seconds for manual testing...');
    console.log('You can now click the JobFiltr extension icon and test the Scanner tab.');
    await page.waitForTimeout(60000);

  } catch (error) {
    console.error('Test error:', error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

runTest();
