// Analyze LinkedIn Issues - Deep DOM analysis for filters
const { chromium } = require('playwright');

(async () => {
  console.log('=== LinkedIn Filter Issues Analysis ===\n');
  console.log('Connecting to Chrome on port 9222...\n');

  try {
    const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
    console.log('✅ Connected to Chrome!\n');

    const contexts = browser.contexts();
    const context = contexts[0];
    const pages = context.pages();

    // Find LinkedIn page
    let linkedInPage = pages.find(p => p.url().includes('linkedin.com/jobs'));

    if (!linkedInPage) {
      console.log('No LinkedIn Jobs page found. Opening one...\n');
      linkedInPage = await context.newPage();
      await linkedInPage.goto('https://www.linkedin.com/jobs/search/?keywords=software%20engineer&location=Remote', {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });
      await linkedInPage.waitForTimeout(3000);
    }

    console.log('URL:', linkedInPage.url());
    console.log('Title:', await linkedInPage.title());

    // Capture extension logs
    const extLogs = [];
    linkedInPage.on('console', msg => {
      const text = msg.text();
      if (text.includes('[') && (text.includes('JobFiltr') || text.includes('LinkedIn') ||
          text.includes('applicant') || text.includes('remote') || text.includes('ghost'))) {
        extLogs.push(text.substring(0, 200));
      }
    });

    console.log('\nWaiting 5 seconds for page to settle...\n');
    await linkedInPage.waitForTimeout(5000);

    // Deep DOM analysis
    const analysis = await linkedInPage.evaluate(() => {
      const results = {
        // Issue 1: Applicant Count
        applicantAnalysis: {
          cardSelectors: {},
          detailPanelSelectors: {},
          applicantTextFound: [],
          jobfiltrBadges: []
        },
        // Issue 2: Badge sizing comparison
        badgeSizing: {
          ghostBadges: [],
          ageBadges: [],
          benefitBadges: []
        },
        // Issue 3: Remote filter analysis
        remoteAnalysis: {
          jobsWithRemote: [],
          hybridIndicators: [],
          onsiteIndicators: []
        },
        // General DOM info
        domInfo: {
          jobCards: 0,
          selectedJob: null,
          detailPanelExists: false
        }
      };

      // ===== ISSUE 1: APPLICANT COUNT ANALYSIS =====
      // Check selectors for applicant count in job cards
      const cardApplicantSelectors = [
        '.jobs-unified-top-card__applicant-count',
        '.job-card-container__applicant-count',
        '.jobs-details-top-card__bullet',
        '.job-card-container__footer-item',
        '.job-card-container__metadata-item',
        '.jobs-unified-top-card__subtitle-secondary-grouping',
        '.artdeco-entity-lockup__caption'
      ];

      cardApplicantSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        results.applicantAnalysis.cardSelectors[selector] = elements.length;
      });

      // Check detail panel selectors
      const detailApplicantSelectors = [
        '.jobs-unified-top-card__applicant-count',
        '.job-details-jobs-unified-top-card__job-insight',
        '.jobs-details-top-card__bullet',
        '.tvm__text--positive',
        '.tvm__text--neutral',
        '.jobs-unified-top-card__bullet',
        '.jobs-premium-applicant-insights',
        '.jobs-unified-top-card__job-insight',
        '.job-details-how-you-match__skills-item'
      ];

      detailApplicantSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        results.applicantAnalysis.detailPanelSelectors[selector] = elements.length;
      });

      // Find any text with applicant info
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let node;
      while (node = walker.nextNode()) {
        const text = node.textContent.trim().toLowerCase();
        if (text.includes('applicant') && text.length < 100) {
          results.applicantAnalysis.applicantTextFound.push({
            text: node.textContent.trim(),
            parentTag: node.parentElement?.tagName,
            parentClass: node.parentElement?.className?.substring(0, 100)
          });
        }
      }

      // Check for JobFiltr badges
      document.querySelectorAll('[class*="jobfiltr"]').forEach(el => {
        results.applicantAnalysis.jobfiltrBadges.push({
          class: el.className,
          text: el.textContent?.substring(0, 50)
        });
      });

      // ===== ISSUE 2: BADGE SIZING =====
      // Find ghost job badges
      document.querySelectorAll('.jobfiltr-ghost-score, .jobfiltr-ghost-badge-container').forEach(el => {
        const rect = el.getBoundingClientRect();
        results.badgeSizing.ghostBadges.push({
          class: el.className,
          width: rect.width,
          height: rect.height,
          style: el.getAttribute('style')?.substring(0, 100)
        });
      });

      // Find job age badges
      document.querySelectorAll('.jobfiltr-detail-age-badge, .jobfiltr-age-badge').forEach(el => {
        const rect = el.getBoundingClientRect();
        results.badgeSizing.ageBadges.push({
          class: el.className,
          width: rect.width,
          height: rect.height,
          style: el.getAttribute('style')?.substring(0, 100)
        });
      });

      // ===== ISSUE 3: REMOTE FILTER ANALYSIS =====
      // Find job cards and check for remote/hybrid indicators
      const jobCards = document.querySelectorAll('.scaffold-layout__list-item, [data-occludable-job-id], .job-card-container');
      results.domInfo.jobCards = jobCards.length;

      jobCards.forEach((card, idx) => {
        const text = card.textContent?.toLowerCase() || '';
        const jobId = card.getAttribute('data-occludable-job-id') || `card-${idx}`;

        // Check for remote
        if (text.includes('remote')) {
          const title = card.querySelector('[class*="job-card-list__title"], .job-card-container__link')?.textContent?.trim();
          const location = card.querySelector('[class*="job-card-container__metadata-item"], [class*="topcard__flavor"]')?.textContent?.trim();

          results.remoteAnalysis.jobsWithRemote.push({
            jobId,
            title: title?.substring(0, 50),
            location: location?.substring(0, 50),
            hasHybrid: text.includes('hybrid'),
            hasOnsite: text.includes('on-site') || text.includes('onsite'),
            hasInOffice: text.includes('in-office') || text.includes('in office'),
            rawText: text.substring(0, 200)
          });
        }
      });

      // Check detail panel for selected job
      const detailPanel = document.querySelector('.jobs-details, .job-view-layout, .scaffold-layout__detail');
      if (detailPanel) {
        results.domInfo.detailPanelExists = true;
        const detailText = detailPanel.textContent?.toLowerCase() || '';

        // Look for remote indicators
        if (detailText.includes('remote')) {
          const jobTitle = document.querySelector('.job-details-jobs-unified-top-card__job-title, .jobs-unified-top-card__job-title')?.textContent?.trim();
          results.domInfo.selectedJob = {
            title: jobTitle?.substring(0, 50),
            hasHybrid: detailText.includes('hybrid'),
            hasOnsite: detailText.includes('on-site') || detailText.includes('onsite'),
            workplaceType: ''
          };

          // Look for workplace type badge
          const workplaceBadge = document.querySelector('.ui-label--accent-3, [class*="workplace-type"], .job-details-jobs-unified-top-card__workplace-type');
          if (workplaceBadge) {
            results.domInfo.selectedJob.workplaceType = workplaceBadge.textContent?.trim();
          }
        }
      }

      return results;
    });

    // Print results
    console.log('='.repeat(60));
    console.log('📊 LINKEDIN FILTER ISSUES ANALYSIS');
    console.log('='.repeat(60) + '\n');

    // Issue 1: Applicant Count
    console.log('┌─────────────────────────────────────────────────────────┐');
    console.log('│ ISSUE 1: Applicant Count Filter                         │');
    console.log('└─────────────────────────────────────────────────────────┘\n');

    console.log('Card Selectors Found:');
    Object.entries(analysis.applicantAnalysis.cardSelectors).forEach(([sel, count]) => {
      const status = count > 0 ? '✅' : '❌';
      console.log(`  ${status} ${sel}: ${count}`);
    });

    console.log('\nDetail Panel Selectors Found:');
    Object.entries(analysis.applicantAnalysis.detailPanelSelectors).forEach(([sel, count]) => {
      const status = count > 0 ? '✅' : '❌';
      console.log(`  ${status} ${sel}: ${count}`);
    });

    console.log('\nApplicant Text Found on Page:');
    analysis.applicantAnalysis.applicantTextFound.slice(0, 5).forEach(item => {
      console.log(`  - "${item.text}" (${item.parentTag}.${item.parentClass?.substring(0, 40)})`);
    });

    console.log('\nJobFiltr Badges on Page:');
    analysis.applicantAnalysis.jobfiltrBadges.forEach(badge => {
      console.log(`  - ${badge.class}: "${badge.text}"`);
    });

    // Issue 2: Badge Sizing
    console.log('\n┌─────────────────────────────────────────────────────────┐');
    console.log('│ ISSUE 2: Badge Sizing Comparison                        │');
    console.log('└─────────────────────────────────────────────────────────┘\n');

    console.log('Ghost Job Badges:');
    analysis.badgeSizing.ghostBadges.forEach(b => {
      console.log(`  - ${b.class}: ${Math.round(b.width)}x${Math.round(b.height)}px`);
    });

    console.log('\nJob Age Badges:');
    analysis.badgeSizing.ageBadges.forEach(b => {
      console.log(`  - ${b.class}: ${Math.round(b.width)}x${Math.round(b.height)}px`);
    });

    // Issue 3: Remote Filter
    console.log('\n┌─────────────────────────────────────────────────────────┐');
    console.log('│ ISSUE 3: True Remote Filter Accuracy                    │');
    console.log('└─────────────────────────────────────────────────────────┘\n');

    console.log(`Total Job Cards: ${analysis.domInfo.jobCards}`);
    console.log(`Jobs with "remote" text: ${analysis.remoteAnalysis.jobsWithRemote.length}\n`);

    console.log('Remote Jobs Analysis:');
    analysis.remoteAnalysis.jobsWithRemote.slice(0, 5).forEach((job, idx) => {
      console.log(`\n  ${idx + 1}. ${job.title || 'Unknown Title'}`);
      console.log(`     Location: ${job.location || 'N/A'}`);
      console.log(`     Has Hybrid: ${job.hasHybrid ? '⚠️ YES' : '✅ No'}`);
      console.log(`     Has Onsite: ${job.hasOnsite ? '⚠️ YES' : '✅ No'}`);
      console.log(`     Has In-Office: ${job.hasInOffice ? '⚠️ YES' : '✅ No'}`);
    });

    if (analysis.domInfo.selectedJob) {
      console.log('\nCurrently Selected Job:');
      console.log(`  Title: ${analysis.domInfo.selectedJob.title}`);
      console.log(`  Workplace Type: ${analysis.domInfo.selectedJob.workplaceType || 'Not specified'}`);
      console.log(`  Has Hybrid: ${analysis.domInfo.selectedJob.hasHybrid}`);
      console.log(`  Has Onsite: ${analysis.domInfo.selectedJob.hasOnsite}`);
    }

    // Extension logs
    if (extLogs.length > 0) {
      console.log('\n📝 Extension Logs:');
      extLogs.slice(0, 10).forEach(log => {
        console.log(`  ${log.substring(0, 120)}`);
      });
    }

    // Screenshot
    await linkedInPage.screenshot({
      path: 'C:\\Users\\isaia\\OneDrive\\Documents\\2025 Docs\\Claude Copy\\Vibed-Web-Start-1\\.claude\\skills\\playwright-skill\\linkedin-analysis.png',
      fullPage: false
    });
    console.log('\n📸 Screenshot saved: linkedin-analysis.png');

    console.log('\n✅ Analysis complete!');
    await browser.close();

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.message.includes('ECONNREFUSED')) {
      console.log('\nChrome debug mode not running. Start Chrome with --remote-debugging-port=9222');
    }
  }
})();
