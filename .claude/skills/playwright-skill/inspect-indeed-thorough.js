const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false, channel: 'chrome' });
  const page = await browser.newPage();

  console.log('Navigating to Indeed...');
  await page.goto('https://www.indeed.com/jobs?q=software+engineer&l=remote', {
    waitUntil: 'networkidle',
    timeout: 60000
  });

  await page.waitForTimeout(5000);

  // Click on the first job card to open details
  console.log('Clicking on first job card...');
  try {
    await page.click('.job_seen_beacon', { timeout: 5000 });
  } catch (e) {
    console.log('Could not click job card:', e.message);
  }

  // Wait for details panel to load
  await page.waitForTimeout(5000);

  // Search entire page for "ago" text
  const pageAnalysis = await page.evaluate(() => {
    const results = {
      bodyText: document.body.innerText.replace(/\s+/g, ' ').substring(0, 5000),
      agoMatches: [],
      postedMatches: []
    };

    // Search for "ago" in the page
    const bodyText = document.body.innerText.toLowerCase();

    // Find all occurrences of text containing "ago"
    const agoPattern = /\b\w+\s*\d*\s*\w*\s*ago\b/gi;
    const matches = document.body.innerText.match(agoPattern);
    if (matches) {
      results.agoMatches = [...new Set(matches)].slice(0, 20);
    }

    // Find "Posted" text
    const postedPattern = /posted[^.]*?\d+[^.]*/gi;
    const postedMatches = document.body.innerText.match(postedPattern);
    if (postedMatches) {
      results.postedMatches = [...new Set(postedMatches)].slice(0, 10);
    }

    // Also look for "EmployerActive" which Indeed uses
    const activePattern = /employer\s*active[^.]*/gi;
    const activeMatches = document.body.innerText.match(activePattern);
    if (activeMatches) {
      results.activeMatches = activeMatches.slice(0, 5);
    }

    return results;
  });

  console.log('\n=== "AGO" MATCHES ON PAGE ===');
  pageAnalysis.agoMatches.forEach(m => console.log(`  "${m}"`));

  console.log('\n=== "POSTED" MATCHES ===');
  pageAnalysis.postedMatches.forEach(m => console.log(`  "${m}"`));

  if (pageAnalysis.activeMatches) {
    console.log('\n=== "EMPLOYER ACTIVE" MATCHES ===');
    pageAnalysis.activeMatches.forEach(m => console.log(`  "${m}"`));
  }

  console.log('\n=== PAGE TEXT EXCERPT (searching for date context) ===');
  // Extract lines containing numbers and time-related words
  const lines = pageAnalysis.bodyText.split(/[.!?\n]/);
  const dateLines = lines.filter(l =>
    l.match(/\d/) && l.match(/day|hour|week|month|ago|posted|active/i)
  );
  dateLines.slice(0, 10).forEach(l => console.log(`  "${l.trim()}"`));

  // Take screenshot
  await page.screenshot({ path: '/tmp/indeed-thorough.png', fullPage: true });
  console.log('\nFull page screenshot saved to /tmp/indeed-thorough.png');

  console.log('\nBrowser staying open for 30 seconds for manual inspection...');
  await page.waitForTimeout(30000);

  await browser.close();
})();
