// Connect to running Chrome and analyze LinkedIn
const { chromium } = require('playwright');

(async () => {
  console.log('Connecting to Chrome on port 9222...\n');

  try {
    // Connect via CDP
    const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
    console.log('✅ Connected to Chrome!');

    const contexts = browser.contexts();
    console.log(`Found ${contexts.length} context(s)`);

    if (contexts.length === 0) {
      console.log('No browser contexts found');
      return;
    }

    const context = contexts[0];
    const pages = context.pages();
    console.log(`Found ${pages.length} page(s)`);

    // Find LinkedIn page
    let linkedInPage = null;
    for (const page of pages) {
      const url = page.url();
      console.log(`  - ${url.substring(0, 80)}`);
      if (url.includes('linkedin.com')) {
        linkedInPage = page;
      }
    }

    if (!linkedInPage) {
      console.log('\n❌ No LinkedIn page found. Opening one...');
      linkedInPage = await context.newPage();
      await linkedInPage.goto('https://www.linkedin.com/jobs/search/?keywords=software%20engineer');
      await linkedInPage.waitForTimeout(5000);
    }

    console.log('\n=== LinkedIn Page Analysis ===');
    console.log('URL:', linkedInPage.url());
    console.log('Title:', await linkedInPage.title());

    // Collect console messages
    const consoleLogs = [];
    linkedInPage.on('console', msg => {
      const text = msg.text();
      consoleLogs.push({ type: msg.type(), text });
      if (text.includes('JobFiltr') || text.includes('[LinkedIn') || text.includes('[Job') || text.includes('ghost')) {
        console.log(`[CONSOLE] ${text.substring(0, 150)}`);
      }
    });

    // Wait a moment for any extension activity
    console.log('\nWaiting 3 seconds for extension to run...');
    await linkedInPage.waitForTimeout(3000);

    // Check authentication
    const authCheck = await linkedInPage.evaluate(() => {
      const hasNavPhoto = !!document.querySelector('.global-nav__me-photo, .feed-identity-module, img[alt*="Photo"]');
      const hasLoginForm = !!document.querySelector('input[name="session_key"], input[id="username"]');
      return { authenticated: hasNavPhoto && !hasLoginForm, hasLoginForm };
    });

    console.log('\n=== Authentication Status ===');
    console.log('Authenticated:', authCheck.authenticated ? '✅ YES' : '❌ NO');
    if (authCheck.hasLoginForm) {
      console.log('⚠️ Login form detected - please log in to LinkedIn');
    }

    // Analyze DOM for job cards and extension elements
    const analysis = await linkedInPage.evaluate(() => {
      const results = {
        jobCards: 0,
        jobCardSelector: null,
        jobAgeElements: [],
        ghostBadges: [],
        timeElements: [],
        ageTextPatterns: [],
        extensionLogs: []
      };

      // Job card detection
      const cardSelectors = [
        '.scaffold-layout__list-item',
        '.jobs-search-results__list-item',
        '[data-occludable-job-id]',
        '.job-card-container',
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

      // Look for JobFiltr-injected elements
      const allElements = document.querySelectorAll('*');
      allElements.forEach(el => {
        const style = el.getAttribute('style') || '';
        const text = el.textContent?.trim() || '';
        const className = el.className || '';

        // Job age badges (inline styled)
        if (style.includes('background') && text.length < 40) {
          if (/\d+\s*(d|day|week|hour|month)/i.test(text) || text.includes('Just')) {
            results.jobAgeElements.push({
              tag: el.tagName,
              text: text,
              class: className.substring(0, 50),
              style: style.substring(0, 80)
            });
          }
        }

        // Ghost badges
        if (text.includes('Ghost') || text.includes('%') && style.includes('background')) {
          if (className.includes('ghost') || style.includes('#f') || style.includes('rgb')) {
            results.ghostBadges.push({
              tag: el.tagName,
              text: text.substring(0, 50),
              class: className.substring(0, 50)
            });
          }
        }
      });

      // Time elements
      document.querySelectorAll('time').forEach(t => {
        results.timeElements.push({
          datetime: t.getAttribute('datetime'),
          text: t.textContent?.trim()
        });
      });

      // Search for job age text patterns in DOM
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let node;
      const seen = new Set();
      while (node = walker.nextNode()) {
        const text = node.textContent.trim();
        if (text && text.length < 60 && !seen.has(text)) {
          if (/\d+\s*(hour|day|week|month)s?\s*ago/i.test(text) ||
              /just\s*(posted|now)/i.test(text) ||
              /reposted/i.test(text)) {
            seen.add(text);
            const parent = node.parentElement;
            results.ageTextPatterns.push({
              text: text,
              tag: parent?.tagName,
              class: parent?.className?.substring(0, 60)
            });
          }
        }
      }

      return results;
    });

    console.log('\n=== Job Cards ===');
    console.log(`Found: ${analysis.jobCards} cards`);
    console.log(`Selector: ${analysis.jobCardSelector}`);

    console.log('\n=== Time Elements ===');
    if (analysis.timeElements.length > 0) {
      analysis.timeElements.slice(0, 5).forEach(t =>
        console.log(`  datetime="${t.datetime}" text="${t.text}"`));
    } else {
      console.log('None found (LinkedIn removed these)');
    }

    console.log('\n=== Job Age Text Patterns in DOM ===');
    if (analysis.ageTextPatterns.length > 0) {
      analysis.ageTextPatterns.forEach(p =>
        console.log(`  "${p.text}" in <${p.tag}>`));
    } else {
      console.log('No job age text patterns found');
    }

    console.log('\n=== JobFiltr Age Badges ===');
    if (analysis.jobAgeElements.length > 0) {
      analysis.jobAgeElements.slice(0, 10).forEach(e =>
        console.log(`  <${e.tag}> "${e.text}"`));
    } else {
      console.log('No job age badges found');
    }

    console.log('\n=== Ghost Badges ===');
    if (analysis.ghostBadges.length > 0) {
      analysis.ghostBadges.slice(0, 5).forEach(b =>
        console.log(`  <${b.tag}> "${b.text}"`));
    } else {
      console.log('No ghost badges found');
    }

    // Click on first job card to load detail panel
    console.log('\n=== Testing Detail Panel ===');
    const clickedJob = await linkedInPage.evaluate(() => {
      const firstCard = document.querySelector('.scaffold-layout__list-item a[href*="/jobs/view/"]');
      if (firstCard) {
        firstCard.click();
        return firstCard.href;
      }
      return null;
    });

    if (clickedJob) {
      console.log('Clicked job:', clickedJob.substring(0, 60));
      await linkedInPage.waitForTimeout(2000);

      // Check detail panel for badges
      const detailAnalysis = await linkedInPage.evaluate(() => {
        const results = {
          detailPanel: null,
          jobTitle: null,
          jobAge: null,
          ghostBadge: null,
          ageBadgeInDetail: null
        };

        // Find detail panel
        const panelSelectors = [
          '.jobs-details',
          '.job-details-jobs-unified-top-card',
          '.jobs-unified-top-card',
          '.scaffold-layout__detail'
        ];

        for (const sel of panelSelectors) {
          const panel = document.querySelector(sel);
          if (panel) {
            results.detailPanel = sel;

            // Find job title
            const titleEl = panel.querySelector('h1, h2, .job-details-jobs-unified-top-card__job-title');
            if (titleEl) {
              results.jobTitle = titleEl.textContent?.trim().substring(0, 50);
            }

            // Look for age text
            const walker = document.createTreeWalker(panel, NodeFilter.SHOW_TEXT);
            let node;
            while (node = walker.nextNode()) {
              const text = node.textContent.trim();
              if (/\d+\s*(hour|day|week|month)s?\s*ago/i.test(text) || /reposted/i.test(text)) {
                results.jobAge = text;
                break;
              }
            }

            // Look for injected badges
            panel.querySelectorAll('*').forEach(el => {
              const style = el.getAttribute('style') || '';
              const text = el.textContent?.trim() || '';
              if (style.includes('background') && text.length < 50) {
                if (/\d+d|ghost|%/i.test(text)) {
                  if (!results.ageBadgeInDetail && /\d+d/i.test(text)) {
                    results.ageBadgeInDetail = text;
                  }
                  if (!results.ghostBadge && /ghost|%/i.test(text)) {
                    results.ghostBadge = text;
                  }
                }
              }
            });

            break;
          }
        }

        return results;
      });

      console.log('Detail panel:', detailAnalysis.detailPanel || 'Not found');
      console.log('Job title:', detailAnalysis.jobTitle || 'Not found');
      console.log('Job age text:', detailAnalysis.jobAge || 'Not found');
      console.log('Age badge:', detailAnalysis.ageBadgeInDetail || 'Not found');
      console.log('Ghost badge:', detailAnalysis.ghostBadge || 'Not found');
    }

    // Take screenshot
    await linkedInPage.screenshot({ path: 'C:/tmp/linkedin-analysis.png', fullPage: false });
    console.log('\n📸 Screenshot saved to C:/tmp/linkedin-analysis.png');

    console.log('\n✅ Analysis complete!');
    console.log('Chrome remains open - you can continue to interact with it.');

    // Don't close the browser - leave it open for user

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.message.includes('connect')) {
      console.log('\nMake sure Chrome was launched with --remote-debugging-port=9222');
    }
  }
})();
