// Test extension loading with different configuration
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const os = require('os');

const EXTENSION_PATH = 'C:\\Users\\isaia\\OneDrive\\Documents\\2025 Docs\\Claude Copy\\Vibed-Web-Start-1\\chrome-extension';
const TEST_PROFILE_DIR = path.join(os.tmpdir(), 'jobfiltr-ext-test');

(async () => {
  console.log('=== Extension Loading Test V2 ===\n');
  console.log('Extension path:', EXTENSION_PATH);
  console.log('Profile dir:', TEST_PROFILE_DIR);

  // Verify extension exists
  const manifestPath = path.join(EXTENSION_PATH, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    console.error('❌ Extension manifest not found!');
    return;
  }
  console.log('✅ Extension manifest found\n');

  // Clean profile for fresh start
  if (fs.existsSync(TEST_PROFILE_DIR)) {
    fs.rmSync(TEST_PROFILE_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(TEST_PROFILE_DIR, { recursive: true });

  try {
    // Launch with explicit extension args
    const context = await chromium.launchPersistentContext(TEST_PROFILE_DIR, {
      headless: false,
      channel: 'chrome',
      args: [
        `--disable-extensions-except=${EXTENSION_PATH}`,
        `--load-extension=${EXTENSION_PATH}`,
        '--start-maximized',
        '--disable-blink-features=AutomationControlled',
        '--no-first-run',
        '--no-default-browser-check'
      ],
      viewport: null,
      ignoreDefaultArgs: [
        '--enable-automation',
        '--disable-extensions',
        '--disable-component-extensions-with-background-pages'
      ],
      timeout: 60000
    });

    console.log('✅ Browser launched\n');

    const page = context.pages()[0] || await context.newPage();

    // Capture ALL console messages
    const allLogs = [];
    page.on('console', msg => {
      const text = msg.text();
      allLogs.push(text);
      // Print immediately if JobFiltr related
      if (text.includes('JobFiltr') || text.includes('[LinkedIn') ||
          text.includes('TESTING MODE') || text.includes('applyFilters') ||
          text.includes('badge') || text.includes('loadAndApply')) {
        console.log(`[EXT] ${text.substring(0, 180)}`);
      }
    });

    // First check extension page
    console.log('Checking chrome://extensions...');
    await page.goto('chrome://extensions/', { waitUntil: 'load' });
    await page.waitForTimeout(2000);

    // Take screenshot of extensions page
    await page.screenshot({ path: 'C:\\tmp\\extensions-page.png' });
    console.log('📸 Extensions page screenshot saved\n');

    // Navigate to LinkedIn
    console.log('Navigating to LinkedIn...');
    await page.goto('https://www.linkedin.com/jobs/search/?keywords=software%20engineer', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    // Handle login if needed
    await page.waitForTimeout(3000);
    if (page.url().includes('login') || page.url().includes('authwall')) {
      console.log('\n⚠️ Please log in to LinkedIn');
      try {
        await page.waitForURL('**/jobs/search/**', { timeout: 120000 });
        console.log('✅ Login successful\n');
      } catch {
        console.log('Login timeout\n');
      }
    }

    // Wait for extension to initialize
    console.log('Waiting 10 seconds for extension...\n');
    await page.waitForTimeout(10000);

    console.log('Page title:', await page.title());

    // Analyze results
    const analysis = await page.evaluate(() => {
      const results = {
        jobfiltrElements: [],
        ageBadges: [],
        ghostBadges: [],
        extensionIndicators: []
      };

      // Look for JobFiltr injected elements
      document.querySelectorAll('[class*="jobfiltr"], [data-jobfiltr]').forEach(el => {
        results.jobfiltrElements.push({
          class: el.className,
          text: el.textContent?.substring(0, 50)
        });
      });

      // Look for age badges
      document.querySelectorAll('.jobfiltr-age-badge').forEach(el => {
        results.ageBadges.push(el.textContent);
      });

      // Look for any styled badges that might be from extension
      document.querySelectorAll('*').forEach(el => {
        const style = el.getAttribute('style') || '';
        const text = el.textContent?.trim() || '';
        if (style.includes('background') && text.length < 30 && text.length > 0) {
          if (/\d+d|ghost|%/i.test(text)) {
            results.extensionIndicators.push({
              text,
              tag: el.tagName
            });
          }
        }
      });

      return results;
    });

    console.log('\n=== Extension Analysis ===');
    console.log('JobFiltr elements:', analysis.jobfiltrElements.length);
    console.log('Age badges:', analysis.ageBadges.length);
    console.log('Extension indicators:', analysis.extensionIndicators.length);

    if (analysis.ageBadges.length > 0) {
      console.log('\nAge badges found:');
      analysis.ageBadges.forEach(b => console.log(`  ${b}`));
    }

    // Print collected logs
    console.log('\n=== Extension Console Logs ===');
    const extLogs = allLogs.filter(l =>
      l.includes('JobFiltr') || l.includes('[LinkedIn') ||
      l.includes('TESTING') || l.includes('applyFilters')
    );

    if (extLogs.length > 0) {
      console.log(`Found ${extLogs.length} extension logs:`);
      extLogs.slice(0, 15).forEach(l => console.log(`  ${l.substring(0, 150)}`));
    } else {
      console.log('No extension logs found');
      console.log('\nAll console logs (first 20):');
      allLogs.slice(0, 20).forEach(l => console.log(`  ${l.substring(0, 100)}`));
    }

    // Take final screenshot
    await page.screenshot({ path: 'C:\\tmp\\extension-test-v2.png' });
    console.log('\n📸 Final screenshot saved');

    console.log('\n✅ Test complete! Browser open for 2 minutes.');
    console.log('Check C:\\tmp\\extensions-page.png to verify extension loaded.\n');

    await page.waitForTimeout(120000);
    await context.close();

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
})();
