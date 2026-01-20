// Launch Chrome with a dedicated testing profile
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const os = require('os');

const EXTENSION_PATH = 'C:\\Users\\isaia\\OneDrive\\Documents\\2025 Docs\\Claude Copy\\Vibed-Web-Start-1\\chrome-extension';
const TEST_PROFILE_DIR = path.join(os.tmpdir(), 'jobfiltr-test-profile');

(async () => {
  console.log('=== JobFiltr LinkedIn Testing ===\n');
  console.log('Extension:', EXTENSION_PATH);
  console.log('Test profile:', TEST_PROFILE_DIR);

  // Create test profile dir if needed
  if (!fs.existsSync(TEST_PROFILE_DIR)) {
    fs.mkdirSync(TEST_PROFILE_DIR, { recursive: true });
  }

  try {
    // Launch persistent context with test profile
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

    // Collect console logs
    const extensionLogs = [];
    page.on('console', msg => {
      const text = msg.text();
      extensionLogs.push(text);
      if (text.includes('JobFiltr') || text.includes('[LinkedIn') || text.includes('[Job') || text.includes('ghost') || text.includes('badge')) {
        console.log(`[EXT] ${text.substring(0, 200)}`);
      }
    });

    // Navigate to LinkedIn
    console.log('Navigating to LinkedIn Jobs...');
    await page.goto('https://www.linkedin.com/jobs/search/?keywords=software%20engineer', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    console.log('URL:', page.url());

    // Check if we need to log in
    await page.waitForTimeout(3000);

    const needsLogin = await page.evaluate(() => {
      return !!(
        document.querySelector('input[name="session_key"]') ||
        document.querySelector('input[id="username"]') ||
        document.querySelector('.join-form') ||
        page.url().includes('/login') ||
        page.url().includes('/authwall')
      );
    });

    if (needsLogin || page.url().includes('login') || page.url().includes('authwall')) {
      console.log('\n⚠️ PLEASE LOG IN TO LINKEDIN');
      console.log('A browser window should be open - please sign in.');
      console.log('Waiting up to 2 minutes for you to log in...\n');

      // Wait for navigation away from login page
      try {
        await page.waitForURL('**/jobs/search/**', { timeout: 120000 });
        console.log('✅ Login detected! Continuing...\n');
      } catch {
        console.log('Timeout waiting for login. Continuing anyway...\n');
      }
    } else {
      console.log('✅ Already logged in or page loaded directly');
    }

    // Wait for page to fully load
    await page.waitForTimeout(5000);
    console.log('\nPage title:', await page.title());

    // Analyze the page
    console.log('\n=== Page Analysis ===');

    const analysis = await page.evaluate(() => {
      const results = {
        isAuthenticated: false,
        jobCards: 0,
        jobCardSelector: null,
        timeElements: [],
        ageTextPatterns: [],
        injectedElements: [],
        detailPanel: null
      };

      // Check authentication
      results.isAuthenticated = !!(
        document.querySelector('.global-nav__me-photo') ||
        document.querySelector('.feed-identity-module') ||
        document.querySelector('img[alt*="Photo"]')
      );

      // Find job cards
      const cardSelectors = [
        '.scaffold-layout__list-item',
        '[data-occludable-job-id]',
        '.jobs-search-results__list-item',
        'li.jobs-search-results-list__list-item'
      ];
      for (const sel of cardSelectors) {
        const cards = document.querySelectorAll(sel);
        if (cards.length > 0) {
          results.jobCards = cards.length;
          results.jobCardSelector = sel;
          break;
        }
      }

      // Find time elements
      document.querySelectorAll('time').forEach(t => {
        results.timeElements.push({
          datetime: t.getAttribute('datetime'),
          text: t.textContent?.trim()
        });
      });

      // Find job age text patterns in DOM
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let node;
      const seen = new Set();
      while (node = walker.nextNode()) {
        const text = node.textContent.trim();
        if (text && text.length < 60 && !seen.has(text)) {
          if (/\d+\s*(hour|day|week|month)s?\s*ago/i.test(text) ||
              /just\s*posted/i.test(text) ||
              /reposted/i.test(text)) {
            seen.add(text);
            const parent = node.parentElement;
            results.ageTextPatterns.push({
              text,
              tag: parent?.tagName,
              class: parent?.className?.substring(0, 50)
            });
          }
        }
      }

      // Look for injected badges (JobFiltr styling)
      document.querySelectorAll('*').forEach(el => {
        const style = el.getAttribute('style') || '';
        const text = el.textContent?.trim() || '';
        if (style.includes('background') && text.length < 40 && text.length > 0) {
          if (/\d+\s*d|ghost|%|days?\s*ago|weeks?\s*ago/i.test(text)) {
            results.injectedElements.push({
              text,
              tag: el.tagName,
              style: style.substring(0, 60)
            });
          }
        }
      });

      // Check for detail panel
      const panelSelectors = ['.jobs-details', '.scaffold-layout__detail', '.job-details'];
      for (const sel of panelSelectors) {
        if (document.querySelector(sel)) {
          results.detailPanel = sel;
          break;
        }
      }

      return results;
    });

    console.log('Authenticated:', analysis.isAuthenticated ? '✅ Yes' : '❌ No');
    console.log('Job cards:', analysis.jobCards, `(${analysis.jobCardSelector})`);
    console.log('Time elements:', analysis.timeElements.length);

    console.log('\n=== Job Age Text in DOM ===');
    if (analysis.ageTextPatterns.length > 0) {
      analysis.ageTextPatterns.slice(0, 10).forEach(p => {
        console.log(`  "${p.text}" in <${p.tag}>`);
      });
    } else {
      console.log('  None found');
    }

    console.log('\n=== JobFiltr Injected Badges ===');
    if (analysis.injectedElements.length > 0) {
      analysis.injectedElements.slice(0, 10).forEach(e => {
        console.log(`  "${e.text}" <${e.tag}>`);
      });
    } else {
      console.log('  None found');
    }

    // Click first job to load detail panel
    console.log('\n=== Testing Detail Panel ===');
    const clicked = await page.evaluate(() => {
      const link = document.querySelector('.scaffold-layout__list-item a[href*="/jobs/view/"]');
      if (link) {
        link.click();
        return link.href;
      }
      return null;
    });

    if (clicked) {
      console.log('Clicked:', clicked.substring(0, 60));
      await page.waitForTimeout(3000);

      const detailAnalysis = await page.evaluate(() => {
        const detail = document.querySelector('.jobs-details, .scaffold-layout__detail');
        if (!detail) return { found: false };

        const results = {
          found: true,
          title: null,
          ageText: null,
          injectedAge: null,
          ghostBadge: null
        };

        // Find title
        const h1 = detail.querySelector('h1, h2');
        if (h1) results.title = h1.textContent?.trim().substring(0, 50);

        // Find age text
        const walker = document.createTreeWalker(detail, NodeFilter.SHOW_TEXT);
        let node;
        while (node = walker.nextNode()) {
          const text = node.textContent.trim();
          if (/\d+\s*(hour|day|week|month)s?\s*ago/i.test(text) || /reposted/i.test(text)) {
            results.ageText = text;
            break;
          }
        }

        // Look for injected elements
        detail.querySelectorAll('*').forEach(el => {
          const style = el.getAttribute('style') || '';
          const text = el.textContent?.trim() || '';
          if (style.includes('background')) {
            if (/\d+\s*d/i.test(text) && !results.injectedAge) {
              results.injectedAge = text;
            }
            if (/ghost|%/i.test(text) && !results.ghostBadge) {
              results.ghostBadge = text;
            }
          }
        });

        return results;
      });

      console.log('Detail panel:', detailAnalysis.found ? '✅ Found' : '❌ Not found');
      if (detailAnalysis.found) {
        console.log('Title:', detailAnalysis.title || 'N/A');
        console.log('Age text:', detailAnalysis.ageText || 'Not found');
        console.log('Injected age badge:', detailAnalysis.injectedAge || 'Not found');
        console.log('Ghost badge:', detailAnalysis.ghostBadge || 'Not found');
      }
    }

    // Print extension logs
    console.log('\n=== Extension Console Logs ===');
    const relevantLogs = extensionLogs.filter(l =>
      l.includes('JobFiltr') || l.includes('[LinkedIn') || l.includes('[Job') ||
      l.includes('ghost') || l.includes('badge') || l.includes('age')
    );
    if (relevantLogs.length > 0) {
      relevantLogs.slice(0, 15).forEach(l => console.log(`  ${l.substring(0, 150)}`));
    } else {
      console.log('  No relevant logs captured');
    }

    // Take screenshot
    const screenshotPath = 'C:\\tmp\\linkedin-jobfiltr-test.png';
    await page.screenshot({ path: screenshotPath });
    console.log(`\n📸 Screenshot: ${screenshotPath}`);

    console.log('\n✅ Analysis complete!');
    console.log('Browser staying open for 2 minutes. You can interact with it.');

    await page.waitForTimeout(120000);
    await context.close();

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
})();
