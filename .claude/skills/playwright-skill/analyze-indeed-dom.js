// Comprehensive Indeed DOM Analysis - 2025
const { chromium } = require('playwright');

(async () => {
  console.log('=== Indeed DOM Structure Analysis 2025 ===\n');
  console.log('Connecting to Chrome on port 9222...\n');

  try {
    const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
    console.log('✅ Connected to Chrome!\n');

    const contexts = browser.contexts();
    const context = contexts[0];
    const pages = context.pages();

    // Find Indeed page
    let indeedPage = pages.find(p => p.url().includes('indeed.com'));

    if (!indeedPage) {
      console.log('No Indeed page found. Opening one...\n');
      indeedPage = await context.newPage();
      await indeedPage.goto('https://www.indeed.com/jobs?q=software+engineer&l=Remote', {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });
      await indeedPage.waitForTimeout(3000);
    }

    console.log('URL:', indeedPage.url());
    console.log('Title:', await indeedPage.title());

    // Capture extension logs
    const extLogs = [];
    indeedPage.on('console', msg => {
      const text = msg.text();
      if (text.includes('[JobFiltr') || text.includes('[Indeed')) {
        extLogs.push(text.substring(0, 200));
      }
    });

    console.log('\nWaiting 5 seconds for page and extension...\n');
    await indeedPage.waitForTimeout(5000);

    // Deep DOM analysis
    const analysis = await indeedPage.evaluate(() => {
      const results = {
        // Job card structure
        jobCards: {
          selectors: {},
          sampleCard: null,
          totalCards: 0
        },
        // Applicant count
        applicantData: {
          selectorsFound: {},
          textPatterns: [],
          pageDataScript: null
        },
        // Benefits
        benefits: {
          textFound: [],
          badgesFound: []
        },
        // Active recruiting / employer activity
        employerActivity: {
          textPatterns: [],
          elements: []
        },
        // Entry level indicators
        entryLevel: {
          labels: [],
          experienceRequirements: []
        },
        // Remote indicators
        remote: {
          indicators: [],
          locationTexts: []
        },
        // Ghost/Legitimacy badges
        badges: {
          jobfiltrBadges: [],
          ghostBadges: []
        },
        // Indeed page data (from script tags)
        pageData: {
          jobAges: [],
          mosaicData: null
        }
      };

      // ===== JOB CARD SELECTORS =====
      const cardSelectors = [
        '.job_seen_beacon',
        '.jobsearch-ResultsList > li',
        '[data-testid="job-result"]',
        'li[data-jk]',
        'div.job_seen_beacon',
        'ul.jobsearch-ResultsList li',
        '.tapItem',
        '.resultWithShelf',
        '[data-jk]'
      ];

      cardSelectors.forEach(sel => {
        const count = document.querySelectorAll(sel).length;
        results.jobCards.selectors[sel] = count;
        if (count > 0 && !results.jobCards.totalCards) {
          results.jobCards.totalCards = count;
        }
      });

      // Get first job card structure
      const firstCard = document.querySelector('.job_seen_beacon') ||
                        document.querySelector('[data-jk]');
      if (firstCard) {
        results.jobCards.sampleCard = {
          tagName: firstCard.tagName,
          id: firstCard.id,
          classes: firstCard.className,
          dataJk: firstCard.getAttribute('data-jk'),
          children: Array.from(firstCard.children).map(c => ({
            tag: c.tagName,
            class: c.className?.substring(0, 50)
          }))
        };
      }

      // ===== APPLICANT COUNT SELECTORS =====
      const applicantSelectors = [
        '[data-testid="applicant-count"]',
        '[data-testid="job-snippet"]',
        '.jobCardShelfContainer',
        '.job-snippet',
        '.jobsearch-HiringInsights-entry',
        '.underShelfFooter',
        '.metadata',
        '.jobMetaDataGroup',
        '[class*="applicant"]',
        '[class*="Applicant"]',
        '.hiring-insights',
        '.hiringInsight'
      ];

      applicantSelectors.forEach(sel => {
        const elems = document.querySelectorAll(sel);
        results.applicantData.selectorsFound[sel] = elems.length;
      });

      // Search for applicant text patterns
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let node;
      while (node = walker.nextNode()) {
        const text = node.textContent.trim().toLowerCase();
        if (text.length > 5 && text.length < 100) {
          if (text.includes('applicant')) {
            results.applicantData.textPatterns.push({
              text: node.textContent.trim(),
              parentTag: node.parentElement?.tagName,
              parentClass: node.parentElement?.className?.substring(0, 60)
            });
          }
          if (text.includes('employer active') || text.includes('days ago') || text.includes('just posted')) {
            results.employerActivity.textPatterns.push({
              text: node.textContent.trim(),
              parentTag: node.parentElement?.tagName,
              parentClass: node.parentElement?.className?.substring(0, 60)
            });
          }
          if (text.includes('entry level') || text.includes('entry-level')) {
            results.entryLevel.labels.push({
              text: node.textContent.trim(),
              parentClass: node.parentElement?.className?.substring(0, 60)
            });
          }
          if (/\d+\s*\+?\s*years?\s*(of\s+)?experience/i.test(text)) {
            results.entryLevel.experienceRequirements.push({
              text: node.textContent.trim().substring(0, 100)
            });
          }
        }
      }

      // ===== BENEFITS DETECTION =====
      const benefitKeywords = ['health', '401k', 'dental', 'vision', 'pto', 'paid time', 'insurance', 'remote', 'equity'];
      document.querySelectorAll('.job_seen_beacon, [data-jk]').forEach(card => {
        const text = card.textContent.toLowerCase();
        benefitKeywords.forEach(keyword => {
          if (text.includes(keyword)) {
            results.benefits.textFound.push({
              keyword,
              jobId: card.getAttribute('data-jk')
            });
          }
        });
      });

      // ===== REMOTE/LOCATION =====
      document.querySelectorAll('.companyLocation, [data-testid="text-location"], .job-snippet-location').forEach(el => {
        results.remote.locationTexts.push(el.textContent.trim());
      });

      // ===== JOBFILTR BADGES =====
      document.querySelectorAll('[class*="jobfiltr"]').forEach(el => {
        const rect = el.getBoundingClientRect();
        results.badges.jobfiltrBadges.push({
          class: el.className,
          text: el.textContent?.substring(0, 50),
          width: Math.round(rect.width),
          height: Math.round(rect.height)
        });
      });

      // ===== GHOST BADGES =====
      document.querySelectorAll('.jobfiltr-ghost-score, .jobfiltr-ghost-badge-container').forEach(el => {
        const rect = el.getBoundingClientRect();
        results.badges.ghostBadges.push({
          class: el.className,
          text: el.textContent?.substring(0, 100),
          width: Math.round(rect.width),
          height: Math.round(rect.height)
        });
      });

      // ===== INDEED PAGE DATA SCRIPT =====
      // Look for mosaic-provider-jobcards script which contains job data
      const scripts = document.querySelectorAll('script');
      scripts.forEach(script => {
        const content = script.textContent || '';
        if (content.includes('mosaic-provider-jobcards') || content.includes('jobKeysWithInfo')) {
          // Extract job ages if present
          const ageMatch = content.match(/"jobAge"\s*:\s*"([^"]+)"/g);
          if (ageMatch) {
            results.pageData.jobAges = ageMatch.slice(0, 5).map(m => m.match(/"jobAge"\s*:\s*"([^"]+)"/)?.[1]);
          }
          results.pageData.mosaicData = 'Found mosaic data script';
        }
      });

      // Check for window.mosaic or similar data objects
      if (window.mosaic) {
        results.pageData.mosaicData = 'window.mosaic exists';
      }

      return results;
    });

    // Print results
    console.log('='.repeat(70));
    console.log('📊 INDEED DOM STRUCTURE ANALYSIS');
    console.log('='.repeat(70) + '\n');

    // Job Cards
    console.log('┌─────────────────────────────────────────────────────────────────────┐');
    console.log('│ JOB CARD STRUCTURE                                                   │');
    console.log('└─────────────────────────────────────────────────────────────────────┘\n');

    console.log('Job Card Selectors:');
    Object.entries(analysis.jobCards.selectors).forEach(([sel, count]) => {
      const status = count > 0 ? '✅' : '❌';
      console.log(`  ${status} ${sel}: ${count}`);
    });

    if (analysis.jobCards.sampleCard) {
      console.log('\nSample Card Structure:');
      console.log(`  Tag: ${analysis.jobCards.sampleCard.tagName}`);
      console.log(`  Classes: ${analysis.jobCards.sampleCard.classes?.substring(0, 60)}`);
      console.log(`  data-jk: ${analysis.jobCards.sampleCard.dataJk}`);
    }

    // Applicant Data
    console.log('\n┌─────────────────────────────────────────────────────────────────────┐');
    console.log('│ APPLICANT COUNT DATA                                                 │');
    console.log('└─────────────────────────────────────────────────────────────────────┘\n');

    console.log('Applicant Selectors:');
    Object.entries(analysis.applicantData.selectorsFound).forEach(([sel, count]) => {
      const status = count > 0 ? '✅' : '❌';
      console.log(`  ${status} ${sel}: ${count}`);
    });

    console.log('\nApplicant Text Found:');
    analysis.applicantData.textPatterns.slice(0, 5).forEach(p => {
      console.log(`  - "${p.text}" (${p.parentTag})`);
    });

    // Employer Activity
    console.log('\n┌─────────────────────────────────────────────────────────────────────┐');
    console.log('│ EMPLOYER ACTIVITY / ACTIVE RECRUITING                               │');
    console.log('└─────────────────────────────────────────────────────────────────────┘\n');

    console.log('Activity Text Found:');
    analysis.employerActivity.textPatterns.slice(0, 10).forEach(p => {
      console.log(`  - "${p.text}" (${p.parentClass?.substring(0, 40)})`);
    });

    // Entry Level
    console.log('\n┌─────────────────────────────────────────────────────────────────────┐');
    console.log('│ ENTRY LEVEL INDICATORS                                              │');
    console.log('└─────────────────────────────────────────────────────────────────────┘\n');

    console.log('Entry Level Labels:');
    analysis.entryLevel.labels.slice(0, 5).forEach(l => {
      console.log(`  - "${l.text}"`);
    });

    console.log('\nExperience Requirements Found:');
    analysis.entryLevel.experienceRequirements.slice(0, 5).forEach(e => {
      console.log(`  - "${e.text}"`);
    });

    // Remote/Location
    console.log('\n┌─────────────────────────────────────────────────────────────────────┐');
    console.log('│ REMOTE / LOCATION INDICATORS                                        │');
    console.log('└─────────────────────────────────────────────────────────────────────┘\n');

    console.log('Location Texts:');
    [...new Set(analysis.remote.locationTexts)].slice(0, 10).forEach(loc => {
      console.log(`  - "${loc}"`);
    });

    // JobFiltr Badges
    console.log('\n┌─────────────────────────────────────────────────────────────────────┐');
    console.log('│ JOBFILTR BADGES                                                      │');
    console.log('└─────────────────────────────────────────────────────────────────────┘\n');

    console.log(`Total JobFiltr Elements: ${analysis.badges.jobfiltrBadges.length}`);
    analysis.badges.jobfiltrBadges.slice(0, 10).forEach(b => {
      console.log(`  - ${b.class}: "${b.text}" (${b.width}x${b.height}px)`);
    });

    console.log('\nGhost Badges:');
    if (analysis.badges.ghostBadges.length > 0) {
      analysis.badges.ghostBadges.forEach(b => {
        console.log(`  - ${b.class}: "${b.text}" (${b.width}x${b.height}px)`);
      });
    } else {
      console.log('  ❌ No ghost badges found');
    }

    // Page Data
    console.log('\n┌─────────────────────────────────────────────────────────────────────┐');
    console.log('│ INDEED PAGE DATA                                                     │');
    console.log('└─────────────────────────────────────────────────────────────────────┘\n');

    console.log(`Mosaic Data: ${analysis.pageData.mosaicData || 'Not found'}`);
    console.log('Job Ages from Script:');
    analysis.pageData.jobAges.forEach(age => {
      console.log(`  - ${age}`);
    });

    // Extension logs
    if (extLogs.length > 0) {
      console.log('\n📝 Extension Logs:');
      extLogs.slice(0, 15).forEach(log => {
        console.log(`  ${log}`);
      });
    }

    // Screenshot
    await indeedPage.screenshot({
      path: 'C:\\Users\\isaia\\OneDrive\\Documents\\2025 Docs\\Claude Copy\\Vibed-Web-Start-1\\.claude\\skills\\playwright-skill\\indeed-dom-analysis.png',
      fullPage: false
    });
    console.log('\n📸 Screenshot saved: indeed-dom-analysis.png');

    console.log('\n✅ Analysis complete!');
    await browser.close();

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.message.includes('ECONNREFUSED')) {
      console.log('\nChrome debug mode not running. Start Chrome with --remote-debugging-port=9222');
    }
  }
})();
