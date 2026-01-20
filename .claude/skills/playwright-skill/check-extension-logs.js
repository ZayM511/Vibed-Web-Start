// Check extension console logs in detail
const { chromium } = require('playwright');

(async () => {
  console.log('Connecting to Chrome...\n');

  try {
    const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
    const contexts = browser.contexts();
    const context = contexts[0];
    const pages = context.pages();

    let linkedInPage = pages.find(p => p.url().includes('linkedin.com/jobs'));
    if (!linkedInPage) {
      console.log('No LinkedIn page found');
      return;
    }

    console.log('Found LinkedIn page:', linkedInPage.url().substring(0, 60));

    // Capture ALL console messages
    const allLogs = [];
    linkedInPage.on('console', msg => {
      allLogs.push({ type: msg.type(), text: msg.text() });
    });

    // Refresh the page to capture extension initialization
    console.log('\nRefreshing page to capture extension logs...\n');
    await linkedInPage.reload({ waitUntil: 'domcontentloaded' });

    // Wait for extension to initialize
    await linkedInPage.waitForTimeout(8000);

    // Print ALL console logs
    console.log('=== ALL Console Logs ===');
    allLogs.forEach((log, i) => {
      if (i < 50) {
        console.log(`[${log.type}] ${log.text.substring(0, 150)}`);
      }
    });

    // Filter for extension-related
    console.log('\n=== JobFiltr Related Logs ===');
    const extLogs = allLogs.filter(l =>
      l.text.includes('JobFiltr') ||
      l.text.includes('[LinkedIn') ||
      l.text.includes('TESTING') ||
      l.text.includes('loadAndApply') ||
      l.text.includes('applyFilters') ||
      l.text.includes('content script')
    );

    if (extLogs.length > 0) {
      extLogs.forEach(l => console.log(`[${l.type}] ${l.text}`));
    } else {
      console.log('No JobFiltr logs found - extension may not be running');
    }

    // Check for errors
    console.log('\n=== Errors ===');
    const errors = allLogs.filter(l => l.type === 'error');
    if (errors.length > 0) {
      errors.slice(0, 10).forEach(e => console.log(`[ERROR] ${e.text.substring(0, 200)}`));
    } else {
      console.log('No errors found');
    }

    // Check page for extension elements
    const check = await linkedInPage.evaluate(() => {
      return {
        jobfiltrClasses: document.querySelectorAll('[class*="jobfiltr"]').length,
        ageBadges: document.querySelectorAll('.jobfiltr-age-badge').length,
        anyScriptTags: Array.from(document.querySelectorAll('script')).map(s => s.src).filter(s => s.includes('jobfiltr')).length
      };
    });

    console.log('\n=== Extension Elements ===');
    console.log('JobFiltr classes:', check.jobfiltrClasses);
    console.log('Age badges:', check.ageBadges);
    console.log('JobFiltr scripts:', check.anyScriptTags);

    await linkedInPage.screenshot({ path: 'C:\\tmp\\extension-check.png' });
    console.log('\n📸 Screenshot saved');

    await browser.close();

  } catch (error) {
    console.error('Error:', error.message);
  }
})();
