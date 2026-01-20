// Interactive LinkedIn DOM analysis - waits for user login
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const readline = require('readline');

function askQuestion(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close();
      resolve(answer.toLowerCase());
    });
  });
}

async function analyzeLinkedInDOM() {
  console.log('=== Interactive LinkedIn DOM Analysis ===\n');
  console.log('This will open a browser in incognito mode.');
  console.log('Please log in to LinkedIn when prompted.\n');

  const extensionPath = path.resolve(__dirname, '../../../chrome-extension');

  // Launch in incognito mode (no persistent context data)
  const browser = await chromium.launch({
    headless: false,
    args: [
      '--incognito',
      '--no-sandbox',
      '--disable-blink-features=AutomationControlled'
    ]
  });

  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 }
  });

  const page = await context.newPage();

  try {
    console.log('1. Opening LinkedIn Jobs page...');
    await page.goto('https://www.linkedin.com/jobs/search/?keywords=software%20engineer&location=United%20States', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });

    await page.waitForTimeout(2000);

    // Check if we need to log in
    const needsLogin = await page.evaluate(() => {
      return document.querySelector('.nav__button-secondary') !== null ||
             document.querySelector('[data-tracking-control-name="public_jobs_nav-header-signin"]') !== null ||
             document.body.textContent.includes('Sign in');
    });

    if (needsLogin) {
      console.log('\n⚠️  LinkedIn requires login to see job details.');
      console.log('Please log in to your LinkedIn account in the browser window.\n');

      let confirmed = false;
      while (!confirmed) {
        const answer = await askQuestion('Type "done" when you are logged in and can see job listings, or "retry" to refresh: ');

        if (answer === 'done') {
          // Verify we can see job cards now
          const canSeeJobs = await page.evaluate(() => {
            const cards = document.querySelectorAll('a[href*="/jobs/view/"]');
            const text = document.body.textContent || '';
            // Check if content is not blurred
            return cards.length > 0 && !text.includes('*****');
          });

          if (canSeeJobs) {
            confirmed = true;
            console.log('\n✅ Login confirmed! Proceeding with analysis...\n');
          } else {
            console.log('\n❌ Cannot see job cards yet. Please ensure you are fully logged in.');
            console.log('Navigate to: https://www.linkedin.com/jobs/search/?keywords=software%20engineer\n');
          }
        } else if (answer === 'retry') {
          console.log('Refreshing page...');
          await page.reload({ waitUntil: 'domcontentloaded' });
          await page.waitForTimeout(3000);
        }
      }
    }

    // Navigate to jobs search to ensure we have the right page
    console.log('2. Navigating to job search results...');
    await page.goto('https://www.linkedin.com/jobs/search/?keywords=software%20engineer&location=United%20States&refresh=true', {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    await page.waitForTimeout(3000);

    console.log('3. Analyzing DOM structure...\n');

    const analysis = await page.evaluate(() => {
      const results = {
        url: window.location.href,
        timestamp: new Date().toISOString(),
        jobListContainers: [],
        jobCardElements: [],
        sampleCards: [],
        titleSelectors: [],
        companySelectors: [],
        metadataSelectors: [],
        recommendedApproach: {}
      };

      // Find job list containers
      const containerSelectors = [
        '.jobs-search-results-list',
        '.scaffold-layout__list',
        '.jobs-search__results-list',
        '.jobs-search-results__list',
        'ul.scaffold-layout__list-container',
        '[class*="jobs-search-results"]'
      ];

      for (const sel of containerSelectors) {
        const el = document.querySelector(sel);
        if (el) {
          results.jobListContainers.push({
            selector: sel,
            tag: el.tagName,
            className: el.className?.substring(0, 100),
            childCount: el.children.length,
            hasJobLinks: el.querySelectorAll('a[href*="/jobs/view/"]').length
          });
        }
      }

      // Find all elements with job-related data attributes
      const dataJobElements = document.querySelectorAll('[data-job-id], [data-occludable-job-id], [data-entity-urn*="jobPosting"]');
      results.jobCardElements.push({
        type: 'data-job-id elements',
        count: document.querySelectorAll('[data-job-id]').length
      });
      results.jobCardElements.push({
        type: 'data-occludable-job-id elements',
        count: document.querySelectorAll('[data-occludable-job-id]').length
      });
      results.jobCardElements.push({
        type: 'entity-urn jobPosting elements',
        count: document.querySelectorAll('[data-entity-urn*="jobPosting"]').length
      });

      // Find LI elements with job links
      const jobLIs = [];
      document.querySelectorAll('li').forEach(li => {
        const link = li.querySelector('a[href*="/jobs/view/"]');
        if (link && (li.textContent || '').length > 50) {
          jobLIs.push(li);
        }
      });
      results.jobCardElements.push({
        type: 'LI elements with job links (>50 chars)',
        count: jobLIs.length
      });

      // Analyze first 5 job cards in detail
      const cardsToAnalyze = jobLIs.slice(0, 5);

      cardsToAnalyze.forEach((card, index) => {
        const cardInfo = {
          index: index + 1,
          tag: card.tagName,
          className: card.className || '(no class)',
          id: card.id || '(no id)',
          dataAttributes: {},
          parentInfo: {
            tag: card.parentElement?.tagName,
            className: card.parentElement?.className?.substring(0, 80)
          }
        };

        // Collect data attributes
        for (const attr of card.attributes) {
          if (attr.name.startsWith('data-')) {
            cardInfo.dataAttributes[attr.name] = attr.value.substring(0, 50);
          }
        }

        // Find title - test multiple selectors
        const titleTests = [
          { sel: '.job-card-list__title', priority: 1 },
          { sel: '.job-card-list__title--link', priority: 2 },
          { sel: '.artdeco-entity-lockup__title', priority: 3 },
          { sel: '.job-card-container__link', priority: 4 },
          { sel: 'a[href*="/jobs/view/"] span', priority: 5 },
          { sel: 'a[href*="/jobs/view/"]', priority: 6 },
          { sel: 'strong', priority: 7 }
        ];

        for (const test of titleTests) {
          const el = card.querySelector(test.sel);
          if (el && el.textContent?.trim()) {
            const text = el.textContent.trim();
            if (text.length > 3 && !text.toLowerCase().includes('easy apply')) {
              cardInfo.title = {
                selector: test.sel,
                text: text.substring(0, 100),
                priority: test.priority
              };

              // Track which selectors work
              if (!results.titleSelectors.find(s => s.selector === test.sel)) {
                results.titleSelectors.push({
                  selector: test.sel,
                  worksOnCard: index + 1
                });
              }
              break;
            }
          }
        }

        // Find company
        const companyTests = [
          '.job-card-container__company-name',
          '.job-card-container__primary-description',
          '.artdeco-entity-lockup__subtitle',
          '.job-card-list__company-name'
        ];

        for (const sel of companyTests) {
          const el = card.querySelector(sel);
          if (el && el.textContent?.trim()) {
            cardInfo.company = {
              selector: sel,
              text: el.textContent.trim().substring(0, 100)
            };
            if (!results.companySelectors.find(s => s.selector === sel)) {
              results.companySelectors.push({ selector: sel });
            }
            break;
          }
        }

        // Find metadata (location, time posted, etc.)
        const metaTests = [
          '.job-card-container__metadata-wrapper',
          '.job-card-container__metadata-item',
          '.artdeco-entity-lockup__caption',
          '.job-search-card__location',
          'time'
        ];

        cardInfo.metadata = [];
        for (const sel of metaTests) {
          const els = card.querySelectorAll(sel);
          els.forEach(el => {
            const text = el.textContent?.trim();
            if (text && text.length < 100) {
              cardInfo.metadata.push({
                selector: sel,
                text: text
              });
            }
          });
        }

        // Get full text content
        cardInfo.fullText = (card.textContent || '').replace(/\s+/g, ' ').trim().substring(0, 300);

        results.sampleCards.push(cardInfo);
      });

      // Determine recommended approach
      if (jobLIs.length > 0) {
        results.recommendedApproach = {
          findCards: 'li elements containing a[href*="/jobs/view/"] with >50 chars text',
          cardCount: jobLIs.length,
          bestTitleSelector: results.titleSelectors[0]?.selector || 'a[href*="/jobs/view/"]',
          bestCompanySelector: results.companySelectors[0]?.selector || 'NOT FOUND',
          getFullText: 'card.textContent'
        };
      }

      return results;
    });

    // Print results
    console.log('=== DOM ANALYSIS RESULTS ===\n');
    console.log('URL:', analysis.url);
    console.log('Timestamp:', analysis.timestamp);

    console.log('\n--- Job List Containers ---');
    analysis.jobListContainers.forEach(c => {
      console.log(`  ${c.selector}: ${c.tag}, ${c.childCount} children, ${c.hasJobLinks} job links`);
    });

    console.log('\n--- Job Card Element Types ---');
    analysis.jobCardElements.forEach(e => {
      console.log(`  ${e.type}: ${e.count}`);
    });

    console.log('\n--- Working Title Selectors ---');
    analysis.titleSelectors.forEach(s => {
      console.log(`  ${s.selector} (works on card ${s.worksOnCard})`);
    });

    console.log('\n--- Working Company Selectors ---');
    analysis.companySelectors.forEach(s => {
      console.log(`  ${s.selector}`);
    });

    console.log('\n--- Sample Cards ---');
    analysis.sampleCards.forEach(card => {
      console.log(`\nCard ${card.index}:`);
      console.log(`  Class: ${card.className}`);
      console.log(`  Data attrs: ${JSON.stringify(card.dataAttributes)}`);
      console.log(`  Title: ${card.title?.text || 'NOT FOUND'} [${card.title?.selector || 'N/A'}]`);
      console.log(`  Company: ${card.company?.text || 'NOT FOUND'} [${card.company?.selector || 'N/A'}]`);
      console.log(`  Metadata: ${card.metadata?.map(m => m.text).join(' | ') || 'None'}`);
      console.log(`  Full text (200 chars): ${card.fullText?.substring(0, 200)}...`);
    });

    console.log('\n--- RECOMMENDED APPROACH ---');
    console.log(JSON.stringify(analysis.recommendedApproach, null, 2));

    // Save to file
    const outputPath = path.join(__dirname, 'linkedin-dom-analysis-full.json');
    fs.writeFileSync(outputPath, JSON.stringify(analysis, null, 2));
    console.log(`\n✅ Full analysis saved to: ${outputPath}`);

    // Keep browser open
    console.log('\n🔵 Browser will stay open. Press Ctrl+C to close when done.');

    // Wait indefinitely (until user closes)
    await new Promise(() => {});

  } catch (error) {
    console.error('Analysis error:', error.message);
    const answer = await askQuestion('Error occurred. Type "retry" to try again or "exit" to close: ');
    if (answer === 'retry') {
      await browser.close();
      return analyzeLinkedInDOM();
    }
  }
}

analyzeLinkedInDOM().catch(console.error);
