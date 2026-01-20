// Deep analysis of LinkedIn DOM structure for job cards
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function analyzeLinkedInDOM() {
  console.log('=== Deep LinkedIn DOM Analysis ===\n');

  const extensionPath = path.resolve(__dirname, '../../../chrome-extension');

  const browser = await chromium.launchPersistentContext('', {
    headless: false,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
      '--no-sandbox'
    ]
  });

  const page = browser.pages()[0] || await browser.newPage();

  try {
    console.log('1. Navigating to LinkedIn Jobs...');
    await page.goto('https://www.linkedin.com/jobs/search/?keywords=software%20engineer&location=United%20States', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    // Wait for job cards to load
    await page.waitForTimeout(5000);

    console.log('\n2. Analyzing DOM structure...\n');

    const analysis = await page.evaluate(() => {
      const results = {
        jobListContainers: [],
        jobCardPatterns: [],
        sampleCards: [],
        allDataAttributes: new Set(),
        allClassPatterns: new Set()
      };

      // Find all potential job list containers
      const containerSelectors = [
        '.jobs-search-results-list',
        '.scaffold-layout__list',
        '.jobs-search__results-list',
        'ul[class*="jobs"]',
        'div[class*="jobs-search"]'
      ];

      for (const sel of containerSelectors) {
        const el = document.querySelector(sel);
        if (el) {
          results.jobListContainers.push({
            selector: sel,
            tagName: el.tagName,
            className: el.className,
            childCount: el.children.length
          });
        }
      }

      // Find all LI elements that might be job cards
      const allLIs = document.querySelectorAll('li');
      const jobLIs = [];

      allLIs.forEach(li => {
        // Check if this LI contains a job link
        const jobLink = li.querySelector('a[href*="/jobs/view/"]');
        if (jobLink) {
          const text = li.textContent || '';
          if (text.length > 30) {
            jobLIs.push(li);
          }
        }
      });

      results.jobCardPatterns.push({
        type: 'LI with job link',
        count: jobLIs.length
      });

      // Analyze first 5 job cards in detail
      jobLIs.slice(0, 5).forEach((li, index) => {
        const card = {
          index: index + 1,
          tagName: li.tagName,
          className: li.className,
          id: li.id,
          dataAttributes: {},
          textContent: (li.textContent || '').substring(0, 300).replace(/\s+/g, ' '),
          childStructure: []
        };

        // Get all data attributes
        for (const attr of li.attributes) {
          if (attr.name.startsWith('data-')) {
            card.dataAttributes[attr.name] = attr.value;
            results.allDataAttributes.add(attr.name);
          }
        }

        // Analyze child structure
        const analyzeChild = (el, depth) => {
          if (depth > 3) return null;
          const info = {
            tag: el.tagName,
            class: el.className?.substring?.(0, 80) || '',
            text: el.textContent?.substring(0, 50)?.trim() || ''
          };

          // Check for important elements
          if (el.tagName === 'A' && el.href?.includes('/jobs/view/')) {
            info.isJobLink = true;
            info.href = el.href;
          }

          return info;
        };

        // Get direct children
        Array.from(li.children).slice(0, 5).forEach(child => {
          const childInfo = analyzeChild(child, 1);
          if (childInfo) {
            card.childStructure.push(childInfo);
          }
        });

        // Find title element
        const titleSelectors = [
          '.job-card-list__title',
          '.artdeco-entity-lockup__title',
          'a[href*="/jobs/view/"] strong',
          'a[href*="/jobs/view/"]'
        ];

        for (const sel of titleSelectors) {
          const titleEl = li.querySelector(sel);
          if (titleEl) {
            card.titleElement = {
              selector: sel,
              text: titleEl.textContent?.trim()?.substring(0, 100)
            };
            break;
          }
        }

        // Find company element
        const companySelectors = [
          '.job-card-container__company-name',
          '.artdeco-entity-lockup__subtitle',
          '.job-card-container__primary-description'
        ];

        for (const sel of companySelectors) {
          const companyEl = li.querySelector(sel);
          if (companyEl) {
            card.companyElement = {
              selector: sel,
              text: companyEl.textContent?.trim()?.substring(0, 100)
            };
            break;
          }
        }

        results.sampleCards.push(card);
      });

      // Convert Sets to Arrays for JSON serialization
      results.allDataAttributes = Array.from(results.allDataAttributes);

      // Find all unique class patterns that contain "job"
      document.querySelectorAll('*').forEach(el => {
        if (el.className && typeof el.className === 'string') {
          const classes = el.className.split(' ');
          classes.forEach(cls => {
            if (cls.toLowerCase().includes('job')) {
              results.allClassPatterns.add(cls);
            }
          });
        }
      });
      results.allClassPatterns = Array.from(results.allClassPatterns).slice(0, 50);

      return results;
    });

    console.log('=== ANALYSIS RESULTS ===\n');

    console.log('Job List Containers Found:');
    analysis.jobListContainers.forEach(c => {
      console.log(`  - ${c.selector}: ${c.tagName}.${c.className?.substring(0, 50)}, ${c.childCount} children`);
    });

    console.log('\nJob Card Patterns:');
    analysis.jobCardPatterns.forEach(p => {
      console.log(`  - ${p.type}: ${p.count} cards`);
    });

    console.log('\nData Attributes Found:');
    analysis.allDataAttributes.forEach(attr => {
      console.log(`  - ${attr}`);
    });

    console.log('\nJob-related Class Patterns (first 20):');
    analysis.allClassPatterns.slice(0, 20).forEach(cls => {
      console.log(`  - ${cls}`);
    });

    console.log('\n=== SAMPLE JOB CARDS ===\n');
    analysis.sampleCards.forEach(card => {
      console.log(`Card ${card.index}:`);
      console.log(`  Class: ${card.className?.substring(0, 100)}`);
      console.log(`  Data attrs: ${JSON.stringify(card.dataAttributes)}`);
      console.log(`  Title: ${card.titleElement?.text || 'NOT FOUND'} (${card.titleElement?.selector || 'N/A'})`);
      console.log(`  Company: ${card.companyElement?.text || 'NOT FOUND'} (${card.companyElement?.selector || 'N/A'})`);
      console.log(`  Text preview: ${card.textContent?.substring(0, 150)}...`);
      console.log('');
    });

    // Save full analysis to file
    const outputPath = path.join(__dirname, 'linkedin-dom-analysis-results.json');
    fs.writeFileSync(outputPath, JSON.stringify(analysis, null, 2));
    console.log(`\nFull analysis saved to: ${outputPath}`);

    console.log('\nKeeping browser open for 30 seconds for manual inspection...');
    await page.waitForTimeout(30000);

  } catch (error) {
    console.error('Analysis error:', error.message);
  } finally {
    await browser.close();
  }
}

analyzeLinkedInDOM().catch(console.error);
