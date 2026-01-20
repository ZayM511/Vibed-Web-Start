// Directly inject and test job age detection on authenticated LinkedIn
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const os = require('os');

const TEST_PROFILE_DIR = path.join(os.tmpdir(), 'jobfiltr-test-profile');

(async () => {
  console.log('=== Direct Job Age Detection Test ===\n');

  try {
    // Launch without extension first - just test the detection logic
    const context = await chromium.launchPersistentContext(TEST_PROFILE_DIR, {
      headless: false,
      channel: 'chrome',
      args: ['--start-maximized'],
      viewport: null,
      timeout: 60000
    });

    console.log('✅ Browser launched\n');

    const page = context.pages()[0] || await context.newPage();

    // Navigate to LinkedIn
    console.log('Navigating to LinkedIn...');
    await page.goto('https://www.linkedin.com/jobs/search/?keywords=software%20engineer', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    // Check for login
    await page.waitForTimeout(3000);
    if (page.url().includes('login') || page.url().includes('authwall')) {
      console.log('\n⚠️ Please log in to LinkedIn');
      console.log('Waiting up to 2 minutes...\n');
      try {
        await page.waitForURL('**/jobs/search/**', { timeout: 120000 });
        console.log('✅ Login detected!\n');
      } catch {
        console.log('Login timeout\n');
      }
    }

    await page.waitForTimeout(5000);
    console.log('Page:', await page.title());

    // Inject our job age detection code
    console.log('\n=== Injecting Job Age Detection Code ===\n');

    const results = await page.evaluate(() => {
      // ========== INJECTED CODE FROM EXTENSION ==========

      function parseAgeFromText(text) {
        if (!text) return null;

        // Patterns for job age
        const patterns = [
          /(\d+)\s*minutes?\s*ago/i,
          /(\d+)\s*hours?\s*ago/i,
          /(\d+)\s*days?\s*ago/i,
          /(\d+)\s*weeks?\s*ago/i,
          /(\d+)\s*months?\s*ago/i,
          /just\s*(now|posted)/i,
          /today/i,
          /yesterday/i,
          /reposted\s*(\d+)\s*days?\s*ago/i
        ];

        for (const pattern of patterns) {
          const match = text.match(pattern);
          if (match) {
            if (/minutes?/i.test(text)) return 0;
            if (/hours?/i.test(text)) return 0;
            if (/just|today/i.test(text)) return 0;
            if (/yesterday/i.test(text)) return 1;
            if (/days?/i.test(text)) return parseInt(match[1], 10);
            if (/weeks?/i.test(text)) return parseInt(match[1], 10) * 7;
            if (/months?/i.test(text)) return parseInt(match[1], 10) * 30;
          }
        }
        return null;
      }

      function findJobAgeInElement(element) {
        // Search all text nodes
        const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
        let node;
        while (node = walker.nextNode()) {
          const text = node.textContent.trim();
          if (text && text.length < 60) {
            const age = parseAgeFromText(text);
            if (age !== null) {
              return { age, text, source: 'text_node' };
            }
          }
        }

        // Also check time elements
        const timeEls = element.querySelectorAll('time');
        for (const t of timeEls) {
          const datetime = t.getAttribute('datetime');
          if (datetime) {
            const postDate = new Date(datetime);
            const now = new Date();
            const daysAgo = Math.floor((now - postDate) / (1000 * 60 * 60 * 24));
            if (!isNaN(daysAgo) && daysAgo >= 0) {
              return { age: daysAgo, text: t.textContent, source: 'time_element', datetime };
            }
          }
        }

        return null;
      }

      // ========== TEST THE CODE ==========

      const results = {
        pageType: 'unknown',
        jobCards: [],
        detailPanel: null,
        foundAges: []
      };

      // Determine page type
      if (document.querySelector('.global-nav__me-photo, .feed-identity-module')) {
        results.pageType = 'authenticated';
      } else if (document.querySelector('.base-card')) {
        results.pageType = 'unauthenticated';
      }

      // Find job cards
      const cardSelectors = [
        '.scaffold-layout__list-item',
        '[data-occludable-job-id]',
        '.base-card',
        '.job-search-card'
      ];

      for (const sel of cardSelectors) {
        const cards = document.querySelectorAll(sel);
        if (cards.length > 0) {
          results.jobCards.push({ selector: sel, count: cards.length });

          // Test age detection on first 3 cards
          cards.forEach((card, i) => {
            if (i >= 3) return;
            const ageResult = findJobAgeInElement(card);
            if (ageResult) {
              results.foundAges.push({
                cardIndex: i,
                selector: sel,
                ...ageResult
              });
            }
          });

          break;
        }
      }

      // Check detail panel
      const detailSelectors = [
        '.jobs-details',
        '.scaffold-layout__detail',
        '.job-details-jobs-unified-top-card'
      ];

      for (const sel of detailSelectors) {
        const panel = document.querySelector(sel);
        if (panel) {
          results.detailPanel = { selector: sel };

          // Find job age in detail panel
          const ageResult = findJobAgeInElement(panel);
          if (ageResult) {
            results.detailPanel.age = ageResult;
          }

          // Also look specifically in the metadata area
          const metaAreas = panel.querySelectorAll(
            '.job-details-jobs-unified-top-card__primary-description-container, ' +
            '.jobs-unified-top-card__subtitle-primary-grouping, ' +
            '[class*="primary-description"], ' +
            '[class*="subtitle"]'
          );

          metaAreas.forEach((area, i) => {
            const text = area.textContent;
            if (text) {
              const age = parseAgeFromText(text);
              if (age !== null) {
                results.detailPanel.metaAge = {
                  age,
                  fullText: text.substring(0, 100),
                  areaIndex: i
                };
              }
            }
          });

          break;
        }
      }

      // Search entire page for age patterns
      const pageWalker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let pageNode;
      const allAgeTexts = [];
      while (pageNode = pageWalker.nextNode()) {
        const text = pageNode.textContent.trim();
        if (text && text.length < 60 && text.length > 3) {
          if (/\d+\s*(minute|hour|day|week|month)s?\s*ago/i.test(text) ||
              /just\s*(now|posted)/i.test(text) ||
              /reposted/i.test(text)) {
            allAgeTexts.push({
              text,
              parentTag: pageNode.parentElement?.tagName,
              parentClass: pageNode.parentElement?.className?.substring(0, 50)
            });
          }
        }
      }
      results.allAgeTextsOnPage = allAgeTexts;

      return results;
    });

    console.log('Page type:', results.pageType);

    console.log('\n--- Job Cards Found ---');
    results.jobCards.forEach(c => console.log(`  ${c.selector}: ${c.count}`));

    console.log('\n--- Ages Found on Cards ---');
    if (results.foundAges.length > 0) {
      results.foundAges.forEach(a =>
        console.log(`  Card ${a.cardIndex}: ${a.age} days (from ${a.source}: "${a.text}")`));
    } else {
      console.log('  None found on cards');
    }

    console.log('\n--- Detail Panel ---');
    if (results.detailPanel) {
      console.log(`  Found: ${results.detailPanel.selector}`);
      if (results.detailPanel.age) {
        console.log(`  Age: ${results.detailPanel.age.age} days (${results.detailPanel.age.source})`);
      }
      if (results.detailPanel.metaAge) {
        console.log(`  Meta area age: ${results.detailPanel.metaAge.age} days`);
        console.log(`  Meta text: "${results.detailPanel.metaAge.fullText}"`);
      }
    } else {
      console.log('  Not found');
    }

    console.log('\n--- All Age Texts on Page ---');
    if (results.allAgeTextsOnPage.length > 0) {
      results.allAgeTextsOnPage.slice(0, 10).forEach(t =>
        console.log(`  "${t.text}" in <${t.parentTag}> .${t.parentClass}`));
    } else {
      console.log('  None found!');
    }

    // Click on a job card to load detail panel
    console.log('\n=== Clicking Job Card to Test Detail Panel ===');
    const clicked = await page.evaluate(() => {
      const link = document.querySelector('.scaffold-layout__list-item a[href*="/jobs/view/"]');
      if (link) {
        link.click();
        return link.href?.substring(0, 60);
      }
      return null;
    });

    if (clicked) {
      console.log('Clicked:', clicked);
      await page.waitForTimeout(3000);

      // Re-analyze after click
      const detailResults = await page.evaluate(() => {
        function parseAgeFromText(text) {
          if (!text) return null;
          const patterns = [
            /(\d+)\s*minutes?\s*ago/i,
            /(\d+)\s*hours?\s*ago/i,
            /(\d+)\s*days?\s*ago/i,
            /(\d+)\s*weeks?\s*ago/i
          ];
          for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match) {
              if (/minutes?|hours?/i.test(text)) return 0;
              if (/days?/i.test(text)) return parseInt(match[1], 10);
              if (/weeks?/i.test(text)) return parseInt(match[1], 10) * 7;
            }
          }
          return null;
        }

        const results = { found: false, ages: [] };

        // Search detail panel specifically
        const panel = document.querySelector('.scaffold-layout__detail, .jobs-details');
        if (!panel) return results;

        results.found = true;

        // Get all text content
        const walker = document.createTreeWalker(panel, NodeFilter.SHOW_TEXT);
        let node;
        while (node = walker.nextNode()) {
          const text = node.textContent.trim();
          if (text && /\d+\s*(minute|hour|day|week)s?\s*ago/i.test(text)) {
            const age = parseAgeFromText(text);
            results.ages.push({
              text,
              age,
              parentTag: node.parentElement?.tagName,
              parentClass: node.parentElement?.className?.substring(0, 60)
            });
          }
        }

        return results;
      });

      console.log('\nDetail panel found:', detailResults.found);
      if (detailResults.ages.length > 0) {
        console.log('Ages in detail panel:');
        detailResults.ages.forEach(a =>
          console.log(`  "${a.text}" -> ${a.age} days`));
        console.log(`  Parent: <${detailResults.ages[0]?.parentTag}> .${detailResults.ages[0]?.parentClass}`);
      } else {
        console.log('No age text found in detail panel');
      }
    }

    // Take screenshot
    await page.screenshot({ path: 'C:\\tmp\\inject-test.png' });
    console.log('\n📸 Screenshot: C:\\tmp\\inject-test.png');

    console.log('\n✅ Test complete! Browser open for 2 minutes.');
    await page.waitForTimeout(120000);
    await context.close();

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
})();
