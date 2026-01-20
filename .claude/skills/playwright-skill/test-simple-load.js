const { chromium } = require('playwright');

const EXTENSION_PATH = 'C:\\Users\\isaia\\OneDrive\\Documents\\2025 Docs\\Claude Copy\\Vibed-Web-Start-1\\chrome-extension';

(async () => {
  console.log('Testing Extension Load on Simple Page');
  console.log('='.repeat(60));

  const browser = await chromium.launch({
    headless: false,
    slowMo: 100,
    args: [
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`
    ]
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();

  // Collect errors
  const errors = [];
  page.on('pageerror', error => {
    console.log('[PAGE ERROR]', error.message);
    errors.push(error.message);
  });

  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('JobFiltr')) {
      console.log('[PAGE LOG]', text);
    }
  });

  console.log('\n1. Going to example.com first to let extension initialize...');
  await page.goto('https://example.com');
  await page.waitForTimeout(3000);

  console.log('\n2. Now going to LinkedIn login page...');
  await page.goto('https://www.linkedin.com');
  await page.waitForTimeout(5000);

  console.log('\n=== RESULTS ===');
  if (errors.length === 0) {
    console.log('✓ No page errors detected!');
  } else {
    console.log('✗ Page errors found:');
    errors.forEach(e => console.log('  -', e));
  }

  console.log('\nKeeping browser open for 30 seconds...');
  await page.waitForTimeout(30000);

  await browser.close();
  console.log('Test complete.');
})();
