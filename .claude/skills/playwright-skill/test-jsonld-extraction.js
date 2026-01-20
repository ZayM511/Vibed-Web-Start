/**
 * Test JSON-LD extraction logic directly on Indeed page
 * This verifies the core fix without needing the extension
 */

const { chromium } = require('playwright');
const path = require('path');

async function testJsonLdExtraction() {
  const userDataDir = path.join(process.env.LOCALAPPDATA || '', 'Google', 'Chrome', 'User Data - Test');

  let browser;
  try {
    browser = await chromium.launchPersistentContext(userDataDir, {
      headless: false,
      channel: 'chrome',
      args: [
        '--disable-blink-features=AutomationControlled',
        '--no-first-run',
        '--no-default-browser-check'
      ],
      ignoreDefaultArgs: ['--enable-automation'],
      viewport: { width: 1280, height: 800 }
    });

    const page = browser.pages()[0] || await browser.newPage();

    console.log('Navigating to Indeed job page...');
    await page.goto('https://www.indeed.com/viewjob?jk=58ec1c073009ea48', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });

    await page.waitForTimeout(3000);

    // Run the EXACT same logic as the content script's JSON-LD extraction
    const result = await page.evaluate(() => {
      const postedDateSelectors = [
        '[data-testid="myJobsStateDate"]',
        '.jobsearch-JobMetadataFooter [data-testid*="date"]',
        '.jobsearch-HiringInsights-entry--text',
        '.jobsearch-JobMetadataHeader-item:last-child',
        '[class*="posted"]',
        '.date'
      ];

      let postedDate = null;
      let domExtractionResult = null;

      // Try DOM extraction first (same as content script)
      for (const selector of postedDateSelectors) {
        const elem = document.querySelector(selector);
        if (elem) {
          const text = elem.textContent.trim();
          // FIX: Use strict regex that only matches parseable date patterns
          const datePattern = /\d+\s*(day|hour|week|month|minute)s?\s*ago|posted\s*(today|yesterday)|\btoday\b|\byesterday\b|just\s*now|moments?\s*ago/i;
          if (datePattern.test(text)) {
            postedDate = text;
            domExtractionResult = { selector, text };
            break;
          }
        }
      }

      // If no DOM date found, try JSON-LD (same as content script fix)
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
                formattedDate: postedDate
              };
              break;
            }
          }
        } catch (e) {
          jsonLdResult = { error: e.message };
        }
      }

      // Calculate risk (same logic as popup-v2.js)
      function parsePostingAge(dateString) {
        if (!dateString) return null;
        const normalized = dateString.toLowerCase().trim();
        if (/just now|moments? ago/i.test(normalized)) return 0;
        let match;
        if ((match = normalized.match(/(\d+)\s*minutes?\s*ago/i))) return 0;
        if ((match = normalized.match(/(\d+)\s*hours?\s*ago/i))) return 0;
        if ((match = normalized.match(/(\d+)\s*days?\s*ago/i))) return parseInt(match[1]);
        if ((match = normalized.match(/(\d+)\s*weeks?\s*ago/i))) return parseInt(match[1]) * 7;
        if ((match = normalized.match(/(\d+)\s*months?\s*ago/i))) return parseInt(match[1]) * 30;
        return null;
      }

      function calculatePostingAgeRisk(postedDate) {
        if (!postedDate) return { risk: 0, daysPosted: null, desc: null };
        const daysPosted = parsePostingAge(postedDate);
        if (daysPosted === null) return { risk: 0, daysPosted: null, desc: null };

        let risk = 0;
        let desc = null;
        if (daysPosted <= 3) { risk = 0; desc = null; }
        else if (daysPosted <= 7) { risk = 5; desc = null; }
        else if (daysPosted <= 14) { risk = 15; desc = `Posted ${daysPosted} days ago - slightly aged`; }
        else if (daysPosted <= 21) { risk = 30; desc = `Posted ${daysPosted} days ago - moderately aged`; }
        else if (daysPosted <= 30) { risk = 45; desc = `Posted ${daysPosted} days ago - aging posting`; }
        else if (daysPosted <= 45) { risk = 60; desc = `Posted ${daysPosted} days ago - stale posting`; }
        else if (daysPosted <= 60) { risk = 75; desc = `Posted ${daysPosted} days ago - very stale`; }
        else if (daysPosted <= 90) { risk = 85; desc = `Posted ${daysPosted} days ago - likely ghost job`; }
        else { risk = 95; desc = `Posted ${daysPosted}+ days ago - probable ghost/spam job`; }

        return { risk, daysPosted, desc };
      }

      const riskResult = calculatePostingAgeRisk(postedDate);

      return {
        domExtractionResult,
        jsonLdResult,
        finalPostedDate: postedDate,
        riskCalculation: riskResult
      };
    });

    console.log('\n' + '='.repeat(60));
    console.log('JSON-LD EXTRACTION TEST RESULTS');
    console.log('='.repeat(60));
    console.log('\n1. DOM Extraction Result:');
    console.log(JSON.stringify(result.domExtractionResult, null, 2));

    console.log('\n2. JSON-LD Extraction Result:');
    console.log(JSON.stringify(result.jsonLdResult, null, 2));

    console.log('\n3. Final Posted Date:', result.finalPostedDate);

    console.log('\n4. Risk Calculation:');
    console.log(JSON.stringify(result.riskCalculation, null, 2));

    console.log('\n' + '='.repeat(60));
    if (result.riskCalculation.risk > 0) {
      console.log('SUCCESS: Posting age risk is', result.riskCalculation.risk + '%');
      console.log('The fix is working correctly!');
    } else {
      console.log('FAILURE: Posting age risk is 0%');
      console.log('The fix needs more work.');
    }
    console.log('='.repeat(60));

    await page.screenshot({ path: path.join(__dirname, 'jsonld-test-result.png') });

  } catch (error) {
    console.error('Test error:', error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

testJsonLdExtraction();
