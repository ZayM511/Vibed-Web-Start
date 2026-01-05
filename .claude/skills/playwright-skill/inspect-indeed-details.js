const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false, channel: 'chrome' });
  const page = await browser.newPage();

  console.log('Navigating to Indeed...');
  await page.goto('https://www.indeed.com/jobs?q=software+engineer&l=remote', {
    waitUntil: 'domcontentloaded',
    timeout: 60000
  });

  await page.waitForTimeout(5000);

  // Click on the first job card to open details
  console.log('Clicking on first job card...');
  const firstJob = page.locator('.job_seen_beacon').first();
  await firstJob.click();

  // Wait for details panel to load
  await page.waitForTimeout(3000);

  // Look for date elements in the job details panel
  const detailsInfo = await page.evaluate(() => {
    const results = {
      panelText: '',
      dateElements: [],
      allTextWithNumbers: []
    };

    // Job details panel selectors
    const detailsPanel = document.querySelector('.jobsearch-JobComponent') ||
                         document.querySelector('#jobDescriptionText') ||
                         document.querySelector('.jobsearch-ViewJobLayout') ||
                         document.querySelector('[class*="jobsearch"]');

    if (detailsPanel) {
      results.panelText = detailsPanel.textContent.replace(/\s+/g, ' ').trim().substring(0, 1000);

      // Look for date patterns in the panel
      const allElements = detailsPanel.querySelectorAll('*');
      allElements.forEach(el => {
        const text = el.textContent?.trim() || '';
        const directText = Array.from(el.childNodes)
          .filter(n => n.nodeType === 3)
          .map(n => n.textContent.trim())
          .join(' ')
          .trim();

        if (directText && directText.match(/posted|ago|active|day|hour/i)) {
          results.dateElements.push({
            tag: el.tagName,
            class: el.className?.substring(0, 80) || '',
            text: directText.substring(0, 100)
          });
        }
      });
    }

    // Also check the entire page for "Posted" text
    const pageText = document.body.textContent;
    const postedMatches = pageText.match(/posted\s*\d+\s*\w+\s*ago/gi) || [];
    const activeMatches = pageText.match(/active\s*\d+\s*\w+\s*ago/gi) || [];

    results.postedTexts = [...postedMatches, ...activeMatches].slice(0, 10);

    return results;
  });

  console.log('\n=== JOB DETAILS PANEL (first 1000 chars) ===');
  console.log(detailsInfo.panelText);

  console.log('\n=== DATE ELEMENTS IN DETAILS ===');
  detailsInfo.dateElements.forEach(el => {
    console.log(`<${el.tag}> class="${el.class}" -> "${el.text}"`);
  });

  console.log('\n=== "POSTED/ACTIVE X AGO" MATCHES ON PAGE ===');
  detailsInfo.postedTexts.forEach(t => console.log(`  "${t}"`));

  // Take screenshot
  await page.screenshot({ path: '/tmp/indeed-details.png', fullPage: false });
  console.log('\nScreenshot saved to /tmp/indeed-details.png');

  console.log('\nBrowser staying open for 30 seconds...');
  await page.waitForTimeout(30000);

  await browser.close();
})();
