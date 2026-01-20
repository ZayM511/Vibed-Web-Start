// Connect to user's actual Chrome browser with remote debugging
const { chromium } = require('playwright');

(async () => {
  console.log('Connecting to your Chrome browser on port 9222...\n');

  try {
    // Connect to the user's Chrome via CDP
    const browser = await chromium.connectOverCDP('http://localhost:9222');
    console.log('✅ Successfully connected to your Chrome browser!\n');

    // Get the existing context and pages
    const contexts = browser.contexts();
    console.log(`Found ${contexts.length} browser context(s)`);

    let page = null;
    for (const context of contexts) {
      const pages = context.pages();
      console.log(`  Context has ${pages.length} page(s)`);
      for (const p of pages) {
        const url = p.url();
        console.log(`    - ${url}`);
        if (url.includes('linkedin.com/jobs')) {
          page = p;
        }
      }
    }

    if (!page) {
      console.log('\nNo LinkedIn jobs page found. Opening one...');
      const context = contexts[0] || await browser.newContext();
      page = await context.newPage();
      await page.goto('https://www.linkedin.com/jobs/search/?keywords=software%20engineer');
    }

    console.log('\n=== Analyzing LinkedIn Jobs Page ===\n');
    console.log('Current URL:', page.url());
    console.log('Page title:', await page.title());

    // Wait for page to be ready
    await page.waitForTimeout(2000);

    // Take screenshot
    await page.screenshot({ path: '/tmp/linkedin-authenticated-actual.png' });
    console.log('📸 Screenshot saved to /tmp/linkedin-authenticated-actual.png\n');

    // Check if logged in
    const isLoggedIn = await page.evaluate(() => {
      return !!(document.querySelector('.global-nav__me-photo') ||
                document.querySelector('.feed-identity-module') ||
                document.querySelector('img[alt*="Photo of"]') ||
                document.querySelector('[data-control-name="identity_welcome_message"]'));
    });
    console.log('Logged in:', isLoggedIn ? '✅ YES' : '❌ NO');

    // Analyze DOM structure
    console.log('\n=== DOM Structure Analysis ===\n');

    // Check for time elements
    const timeAnalysis = await page.evaluate(() => {
      const timeElements = document.querySelectorAll('time');
      const results = [];
      timeElements.forEach(el => {
        results.push({
          datetime: el.getAttribute('datetime'),
          text: el.textContent.trim(),
          class: el.className,
          parent: el.parentElement?.className?.substring(0, 50)
        });
      });
      return results;
    });

    console.log(`<time> elements found: ${timeAnalysis.length}`);
    if (timeAnalysis.length > 0) {
      timeAnalysis.slice(0, 10).forEach(t => {
        console.log(`  - "${t.text}" datetime="${t.datetime}" class="${t.class}"`);
      });
    }

    // Check for job cards
    const jobCardCount = await page.evaluate(() => {
      const selectors = [
        '.scaffold-layout__list-item',
        '.jobs-search-results__list-item',
        '.job-card-container',
        '[data-job-id]',
        '.jobs-search-results-list li'
      ];
      let count = 0;
      for (const sel of selectors) {
        const found = document.querySelectorAll(sel).length;
        if (found > count) count = found;
      }
      return count;
    });
    console.log(`\nJob cards found: ${jobCardCount}`);

    // Find all "X ago" text patterns
    const agePatterns = await page.evaluate(() => {
      const patterns = [];
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        null,
        false
      );
      let node;
      while (node = walker.nextNode()) {
        const text = node.textContent.trim();
        if (text.length > 0 && text.length < 60) {
          if (/\d+\s*(hour|day|week|month|minute)s?\s*ago/i.test(text) ||
              /just\s*(posted|now)/i.test(text) ||
              /today/i.test(text) ||
              /reposted/i.test(text)) {
            const parent = node.parentElement;
            patterns.push({
              text: text,
              tag: parent?.tagName,
              class: parent?.className?.substring(0, 60)
            });
          }
        }
      }
      // Deduplicate
      const seen = new Set();
      return patterns.filter(p => {
        const key = p.text;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      }).slice(0, 20);
    });

    console.log(`\nJob age text patterns found: ${agePatterns.length}`);
    if (agePatterns.length > 0) {
      agePatterns.forEach(p => {
        console.log(`  "${p.text}" in <${p.tag}> class="${p.class}"`);
      });
    }

    // Check detail panel
    const detailPanelInfo = await page.evaluate(() => {
      const selectors = [
        '.scaffold-layout__detail',
        '.jobs-search__job-details',
        '.jobs-details',
        '.job-view-layout'
      ];
      for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (el) {
          return {
            found: true,
            selector: sel,
            hasH1: !!el.querySelector('h1'),
            hasH2: !!el.querySelector('h2'),
            hasTimeElement: !!el.querySelector('time')
          };
        }
      }
      return { found: false };
    });

    console.log('\nDetail panel:', detailPanelInfo.found ? '✅ Found' : '❌ Not found');
    if (detailPanelInfo.found) {
      console.log(`  Selector: ${detailPanelInfo.selector}`);
      console.log(`  Has <h1>: ${detailPanelInfo.hasH1}`);
      console.log(`  Has <h2>: ${detailPanelInfo.hasH2}`);
      console.log(`  Has <time>: ${detailPanelInfo.hasTimeElement}`);
    }

    // Click on a job to load detail panel
    console.log('\nClicking on first job card to load detail panel...');
    try {
      await page.click('.scaffold-layout__list-item:first-child, .jobs-search-results__list-item:first-child', { timeout: 5000 });
      await page.waitForTimeout(2000);

      // Re-check detail panel
      const detailAfterClick = await page.evaluate(() => {
        const panel = document.querySelector('.scaffold-layout__detail, .jobs-search__job-details');
        if (!panel) return { found: false };

        // Look for time patterns in detail panel
        const timePatterns = [];
        const walker = document.createTreeWalker(panel, NodeFilter.SHOW_TEXT, null, false);
        let node;
        while (node = walker.nextNode()) {
          const text = node.textContent.trim();
          if (text.length < 60 && /\d+\s*(hour|day|week|month)s?\s*ago/i.test(text)) {
            timePatterns.push(text);
          }
        }

        return {
          found: true,
          timeElements: panel.querySelectorAll('time').length,
          timePatterns: [...new Set(timePatterns)].slice(0, 5),
          h1Text: panel.querySelector('h1')?.textContent?.trim()?.substring(0, 50)
        };
      });

      console.log('\nDetail panel after clicking job:');
      console.log(`  <time> elements in panel: ${detailAfterClick.timeElements}`);
      console.log(`  Time patterns found: ${JSON.stringify(detailAfterClick.timePatterns)}`);
      console.log(`  Job title (h1): "${detailAfterClick.h1Text}"`);

      // Final screenshot
      await page.screenshot({ path: '/tmp/linkedin-detail-panel.png' });
      console.log('\n📸 Detail panel screenshot saved to /tmp/linkedin-detail-panel.png');
    } catch (e) {
      console.log('Could not click job card:', e.message);
    }

    console.log('\n=== Analysis Complete ===\n');
    console.log('Summary:');
    console.log(`  - Logged in: ${isLoggedIn ? 'Yes' : 'No'}`);
    console.log(`  - <time> elements: ${timeAnalysis.length}`);
    console.log(`  - Job cards: ${jobCardCount}`);
    console.log(`  - Age text patterns: ${agePatterns.length}`);
    console.log(`  - Detail panel: ${detailPanelInfo.found ? 'Found' : 'Not found'}`);

    // Don't close the browser - it's the user's actual browser
    console.log('\n✅ Done! Your browser remains open.');

  } catch (error) {
    console.error('Error:', error.message);
    if (error.message.includes('ECONNREFUSED')) {
      console.log('\n⚠️ Could not connect to Chrome. Make sure Chrome was launched with --remote-debugging-port=9222');
    }
  }
})();
