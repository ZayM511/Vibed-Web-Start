// Test the auth-bypassed extension
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const os = require('os');

const EXTENSION_PATH = 'C:\\Users\\isaia\\OneDrive\\Documents\\2025 Docs\\Claude Copy\\Vibed-Web-Start-1\\chrome-extension';
const TEST_PROFILE_DIR = path.join(os.tmpdir(), 'jobfiltr-test-profile');

(async () => {
  console.log('=== JobFiltr Auth Bypass Test ===\n');
  console.log('Extension:', EXTENSION_PATH);
  console.log('Test profile:', TEST_PROFILE_DIR);

  if (!fs.existsSync(TEST_PROFILE_DIR)) {
    fs.mkdirSync(TEST_PROFILE_DIR, { recursive: true });
  }

  try {
    const context = await chromium.launchPersistentContext(TEST_PROFILE_DIR, {
      headless: false,
      channel: 'chrome',
      args: [
        `--load-extension=${EXTENSION_PATH}`,
        '--start-maximized',
        '--disable-blink-features=AutomationControlled'
      ],
      viewport: null,
      ignoreDefaultArgs: ['--enable-automation', '--disable-extensions'],
      timeout: 60000
    });

    console.log('✅ Browser launched!\n');

    const page = context.pages()[0] || await context.newPage();

    // Capture ALL console logs
    const allLogs = [];
    page.on('console', msg => {
      const text = msg.text();
      allLogs.push({ type: msg.type(), text, time: new Date().toISOString() });
      // Print JobFiltr logs immediately
      if (text.includes('JobFiltr') || text.includes('[LinkedIn') || text.includes('[Job') ||
          text.includes('ghost') || text.includes('badge') || text.includes('TESTING MODE') ||
          text.includes('applyFilters')) {
        console.log(`[EXT] ${text.substring(0, 200)}`);
      }
    });

    console.log('Navigating to LinkedIn Jobs...');
    await page.goto('https://www.linkedin.com/jobs/search/?keywords=software%20engineer', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    console.log('URL:', page.url());

    // Wait for page + extension
    console.log('Waiting 8 seconds for extension to run...\n');
    await page.waitForTimeout(8000);

    console.log('Page title:', await page.title());

    // Check for login prompt
    const needsLogin = page.url().includes('login') || page.url().includes('authwall');
    if (needsLogin) {
      console.log('\n⚠️ PLEASE LOG IN TO LINKEDIN');
      console.log('Waiting up to 2 minutes...\n');
      try {
        await page.waitForURL('**/jobs/search/**', { timeout: 120000 });
        console.log('✅ Login detected!\n');
        await page.waitForTimeout(5000); // Let extension run
      } catch {
        console.log('Timeout waiting for login.\n');
      }
    }

    // Comprehensive analysis
    console.log('\n=== Comprehensive Analysis ===');

    const analysis = await page.evaluate(() => {
      const results = {
        isAuthenticated: false,
        jobCards: [],
        timeElements: [],
        ageTextPatterns: [],
        jobfiltrBadges: [],
        jobfiltrElements: [],
        detailPanel: null
      };

      // Check LinkedIn auth
      results.isAuthenticated = !!(
        document.querySelector('.global-nav__me-photo') ||
        document.querySelector('.feed-identity-module') ||
        document.querySelector('img[alt*="Photo"]')
      );

      // Find job cards with multiple selectors
      const cardSelectors = [
        { sel: '.scaffold-layout__list-item', name: 'scaffold-layout__list-item' },
        { sel: '.base-card', name: 'base-card' },
        { sel: '.job-search-card', name: 'job-search-card' },
        { sel: '[data-occludable-job-id]', name: 'data-occludable-job-id' },
        { sel: 'li[data-job-id]', name: 'li[data-job-id]' }
      ];

      for (const { sel, name } of cardSelectors) {
        const cards = document.querySelectorAll(sel);
        if (cards.length > 0) {
          results.jobCards.push({ selector: name, count: cards.length });
        }
      }

      // Find time elements
      document.querySelectorAll('time').forEach(t => {
        results.timeElements.push({
          datetime: t.getAttribute('datetime'),
          text: t.textContent?.trim(),
          class: t.className
        });
      });

      // Find all text patterns
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let node;
      const seen = new Set();
      while (node = walker.nextNode()) {
        const text = node.textContent.trim();
        if (text && text.length < 50 && !seen.has(text)) {
          if (/\d+\s*(hour|day|week|month)s?\s*ago/i.test(text) || /reposted/i.test(text)) {
            seen.add(text);
            results.ageTextPatterns.push({
              text,
              parentTag: node.parentElement?.tagName,
              parentClass: node.parentElement?.className?.substring(0, 50)
            });
          }
        }
      }

      // Look for JobFiltr badges
      document.querySelectorAll('.jobfiltr-age-badge, [class*="jobfiltr"]').forEach(el => {
        results.jobfiltrBadges.push({
          text: el.textContent?.trim(),
          class: el.className,
          tag: el.tagName
        });
      });

      // Look for ANY injected badges with inline styles
      document.querySelectorAll('*').forEach(el => {
        const style = el.getAttribute('style') || '';
        const text = el.textContent?.trim() || '';
        if (style.includes('background') && text.length > 0 && text.length < 30) {
          if (/\d+d|days?|weeks?|ghost|%/i.test(text)) {
            results.jobfiltrElements.push({
              text,
              tag: el.tagName,
              class: el.className?.substring(0, 50),
              style: style.substring(0, 60)
            });
          }
        }
      });

      // Check detail panel
      const panelSelectors = ['.jobs-details', '.scaffold-layout__detail'];
      for (const sel of panelSelectors) {
        if (document.querySelector(sel)) {
          results.detailPanel = sel;
          break;
        }
      }

      return results;
    });

    console.log('LinkedIn Auth:', analysis.isAuthenticated ? '✅ Yes' : '❌ No');

    console.log('\n--- Job Cards ---');
    if (analysis.jobCards.length > 0) {
      analysis.jobCards.forEach(c => console.log(`  ${c.selector}: ${c.count}`));
    } else {
      console.log('  None found');
    }

    console.log('\n--- Time Elements ---');
    if (analysis.timeElements.length > 0) {
      analysis.timeElements.slice(0, 8).forEach(t =>
        console.log(`  "${t.text}" (${t.datetime}) [${t.class}]`));
    } else {
      console.log('  None found');
    }

    console.log('\n--- Job Age Text Patterns ---');
    if (analysis.ageTextPatterns.length > 0) {
      analysis.ageTextPatterns.slice(0, 10).forEach(p =>
        console.log(`  "${p.text}" in <${p.parentTag}>`));
    } else {
      console.log('  None found');
    }

    console.log('\n--- JobFiltr Badges ---');
    if (analysis.jobfiltrBadges.length > 0) {
      analysis.jobfiltrBadges.forEach(b => console.log(`  "${b.text}" [${b.class}]`));
    } else {
      console.log('  None found (extension may not be running)');
    }

    console.log('\n--- Injected Elements with Background ---');
    if (analysis.jobfiltrElements.length > 0) {
      analysis.jobfiltrElements.slice(0, 10).forEach(e =>
        console.log(`  "${e.text}" <${e.tag}>`));
    } else {
      console.log('  None found');
    }

    // Print collected extension logs
    console.log('\n=== Extension Console Logs ===');
    const extLogs = allLogs.filter(l =>
      l.text.includes('JobFiltr') || l.text.includes('TESTING') ||
      l.text.includes('applyFilters') || l.text.includes('badge') ||
      l.text.includes('[Job') || l.text.includes('[LinkedIn')
    );
    if (extLogs.length > 0) {
      extLogs.slice(0, 20).forEach(l => console.log(`  ${l.text.substring(0, 150)}`));
    } else {
      console.log('  No extension logs captured');
      console.log('  (Extension may not have loaded - check chrome://extensions)');
    }

    // Take screenshot
    await page.screenshot({ path: 'C:\\tmp\\jobfiltr-bypass-test.png' });
    console.log('\n📸 Screenshot: C:\\tmp\\jobfiltr-bypass-test.png');

    console.log('\n✅ Analysis complete!');
    console.log('Browser staying open for 3 minutes.');
    console.log('Check chrome://extensions to verify extension is loaded.\n');

    await page.waitForTimeout(180000);
    await context.close();

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
})();
