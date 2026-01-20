// Launch browser and keep it open indefinitely
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const os = require('os');

const TEST_PROFILE_DIR = path.join(os.tmpdir(), 'jobfiltr-persistent');

(async () => {
  console.log('=== Launching Persistent Browser ===\n');

  // Keep existing profile if it has login session
  if (!fs.existsSync(TEST_PROFILE_DIR)) {
    fs.mkdirSync(TEST_PROFILE_DIR, { recursive: true });
  }

  try {
    const context = await chromium.launchPersistentContext(TEST_PROFILE_DIR, {
      headless: false,
      channel: 'chrome',
      args: [
        '--start-maximized',
        '--disable-blink-features=AutomationControlled'
      ],
      viewport: null,
      ignoreDefaultArgs: ['--enable-automation'],
      timeout: 60000
    });

    console.log('✅ Browser launched!');
    console.log('Profile:', TEST_PROFILE_DIR);
    console.log('\n📌 Browser will stay open. DO NOT close this terminal.\n');
    console.log('Instructions:');
    console.log('1. Go to chrome://extensions/');
    console.log('2. Enable "Developer mode" (top right)');
    console.log('3. Click "Load unpacked"');
    console.log('4. Select: C:\\Users\\isaia\\OneDrive\\Documents\\2025 Docs\\Claude Copy\\Vibed-Web-Start-1\\chrome-extension');
    console.log('5. Navigate to LinkedIn jobs page\n');

    const page = context.pages()[0] || await context.newPage();

    // Navigate to extensions page
    await page.goto('chrome://extensions/', { waitUntil: 'load' });
    console.log('Opened chrome://extensions/ - please load the extension manually.\n');

    // Keep alive forever - check every 30 seconds
    console.log('Keeping browser open... (Ctrl+C to exit)\n');

    while (true) {
      await new Promise(r => setTimeout(r, 30000));
      try {
        // Check if browser is still alive
        await page.title();
      } catch {
        console.log('Browser was closed.');
        break;
      }
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
})();
