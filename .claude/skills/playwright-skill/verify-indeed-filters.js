// Verify Indeed Filters - Comprehensive Live Test
// Tests: Entry Level Accuracy, Benefits Indicator, Application Competition, Active Recruiting Badge
const { chromium } = require('playwright');

(async () => {
  console.log('=== Indeed Filters Verification Test ===\n');
  console.log('Connecting to Chrome on port 9222...\n');

  try {
    const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
    console.log('✅ Connected to Chrome!\n');

    const contexts = browser.contexts();
    if (contexts.length === 0) {
      console.log('No contexts found. Make sure Chrome has at least one window open.');
      return;
    }

    const context = contexts[0];
    const pages = context.pages();

    // Find or create Indeed page
    let indeedPage = pages.find(p => p.url().includes('indeed.com'));

    if (!indeedPage) {
      console.log('No Indeed page found. Opening entry-level software engineer search...\n');
      indeedPage = await context.newPage();
      await indeedPage.goto('https://www.indeed.com/jobs?q=entry+level+software+engineer&l=Remote', {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });
    }

    console.log('URL:', indeedPage.url());
    console.log('Title:', await indeedPage.title());

    // Capture extension console logs
    const extensionLogs = [];
    indeedPage.on('console', msg => {
      const text = msg.text();
      if (text.includes('[Indeed') || text.includes('JobFiltr') ||
          text.includes('filter') || text.includes('badge') ||
          text.includes('applicant') || text.includes('benefit') ||
          text.includes('entry') || text.includes('recruiting')) {
        extensionLogs.push(text.substring(0, 200));
        console.log(`[EXT] ${text.substring(0, 150)}`);
      }
    });

    console.log('\nWaiting 8 seconds for extension to process jobs...\n');
    await indeedPage.waitForTimeout(8000);

    // Comprehensive analysis of all four filters
    const analysis = await indeedPage.evaluate(() => {
      const results = {
        totalJobCards: 0,
        filters: {
          entryLevel: {
            warningBadges: [],
            description: 'Entry Level Accuracy - warns when "entry level" jobs require 3+ years'
          },
          benefits: {
            detectedBadges: [],
            description: 'Benefits Indicator - shows benefit categories detected'
          },
          applicantCompetition: {
            data: [],
            description: 'Application Competition - shows applicant counts'
          },
          activeRecruiting: {
            activeBadges: [],
            staleBadges: [],
            description: 'Active Recruiting Badge - shows employer activity status'
          }
        },
        rawDOMData: {
          experienceText: [],
          benefitsText: [],
          applicantText: [],
          employerActivityText: []
        }
      };

      // Find all job cards
      const jobCards = document.querySelectorAll('.job_seen_beacon, .jobsearch-ResultsList > li, [data-jk]');
      results.totalJobCards = jobCards.length;

      jobCards.forEach((card, index) => {
        const cardText = card.textContent?.toLowerCase() || '';
        const cardId = card.getAttribute('data-jk') || `card-${index}`;

        // Check for Entry Level Warning Badges (yellow badges)
        const entryWarningBadge = card.querySelector('[style*="rgb(255, 193, 7)"], [style*="#ffc107"], .entry-level-warning');
        if (entryWarningBadge) {
          results.filters.entryLevel.warningBadges.push({
            jobId: cardId,
            badgeText: entryWarningBadge.textContent?.trim()
          });
        }

        // Check for Benefits Badges (colored benefit badges)
        const benefitBadges = card.querySelectorAll('[style*="background"][style*="#"], .benefit-badge, .jobfiltr-benefit-badge');
        benefitBadges.forEach(badge => {
          const text = badge.textContent?.trim();
          if (text && text.length < 50 && /health|401k|pto|dental|vision|remote|equity/i.test(text)) {
            results.filters.benefits.detectedBadges.push({
              jobId: cardId,
              benefit: text
            });
          }
        });

        // Check for Applicant Count displays
        const applicantBadge = card.querySelector('[style*="background"][style*="applicant" i], .applicant-count-badge');
        if (applicantBadge) {
          results.filters.applicantCompetition.data.push({
            jobId: cardId,
            display: applicantBadge.textContent?.trim()
          });
        }

        // Check for Active Recruiting Badges
        const activeBadge = card.querySelector('[style*="rgb(40, 167, 69)"], [style*="#28a745"], [style*="#198754"], .active-recruiting-badge');
        const staleBadge = card.querySelector('[style*="rgb(220, 53, 69)"], [style*="#dc3545"], .stale-posting-badge');

        if (activeBadge) {
          results.filters.activeRecruiting.activeBadges.push({
            jobId: cardId,
            text: activeBadge.textContent?.trim()
          });
        }
        if (staleBadge) {
          results.filters.activeRecruiting.staleBadges.push({
            jobId: cardId,
            text: staleBadge.textContent?.trim()
          });
        }

        // Raw DOM data extraction for debugging
        // Experience requirements
        const expMatch = cardText.match(/(\d+)\+?\s*years?\s+(?:of\s+)?experience/i);
        if (expMatch) {
          results.rawDOMData.experienceText.push({
            jobId: cardId,
            text: expMatch[0]
          });
        }

        // Benefits text
        ['health', '401k', 'dental', 'vision', 'pto', 'remote', 'equity'].forEach(keyword => {
          if (cardText.includes(keyword)) {
            results.rawDOMData.benefitsText.push({
              jobId: cardId,
              keyword: keyword
            });
          }
        });

        // Applicant count text
        const applicantMatch = cardText.match(/(\d+)\s*applicants?/i);
        if (applicantMatch) {
          results.rawDOMData.applicantText.push({
            jobId: cardId,
            text: applicantMatch[0]
          });
        }

        // Employer activity
        const activityMatch = cardText.match(/employer\s+active\s+(\d+)\s*days?\s+ago/i);
        if (activityMatch) {
          results.rawDOMData.employerActivityText.push({
            jobId: cardId,
            text: activityMatch[0]
          });
        }
      });

      // Also check for any JobFiltr-specific elements
      results.jobfiltrElements = document.querySelectorAll('[class*="jobfiltr"]').length;

      return results;
    });

    // Print comprehensive results
    console.log('\n' + '='.repeat(60));
    console.log('📊 INDEED FILTERS VERIFICATION RESULTS');
    console.log('='.repeat(60) + '\n');

    console.log(`Total Job Cards Found: ${analysis.totalJobCards}\n`);
    console.log(`JobFiltr Elements on Page: ${analysis.jobfiltrElements}\n`);

    // Filter 1: Entry Level Accuracy
    console.log('┌─────────────────────────────────────────────────────────┐');
    console.log('│ FILTER 1: Entry Level Accuracy                          │');
    console.log('├─────────────────────────────────────────────────────────┤');
    console.log(`│ Warning Badges Found: ${analysis.filters.entryLevel.warningBadges.length.toString().padEnd(34)}│`);
    if (analysis.filters.entryLevel.warningBadges.length > 0) {
      analysis.filters.entryLevel.warningBadges.slice(0, 3).forEach(b => {
        console.log(`│   - ${(b.badgeText || 'Unknown').substring(0, 50).padEnd(51)}│`);
      });
    }
    console.log(`│ Raw Experience Data: ${analysis.rawDOMData.experienceText.length} jobs have experience reqs    │`);
    console.log('└─────────────────────────────────────────────────────────┘\n');

    // Filter 2: Benefits Indicator
    console.log('┌─────────────────────────────────────────────────────────┐');
    console.log('│ FILTER 2: Benefits Indicator                            │');
    console.log('├─────────────────────────────────────────────────────────┤');
    console.log(`│ Benefit Badges Found: ${analysis.filters.benefits.detectedBadges.length.toString().padEnd(33)}│`);
    if (analysis.filters.benefits.detectedBadges.length > 0) {
      analysis.filters.benefits.detectedBadges.slice(0, 5).forEach(b => {
        console.log(`│   - ${(b.benefit || 'Unknown').substring(0, 50).padEnd(51)}│`);
      });
    }
    console.log(`│ Raw Benefits Keywords: ${analysis.rawDOMData.benefitsText.length} mentions in job cards   │`);
    console.log('└─────────────────────────────────────────────────────────┘\n');

    // Filter 3: Application Competition
    console.log('┌─────────────────────────────────────────────────────────┐');
    console.log('│ FILTER 3: Application Competition                       │');
    console.log('├─────────────────────────────────────────────────────────┤');
    console.log(`│ Applicant Badges Found: ${analysis.filters.applicantCompetition.data.length.toString().padEnd(31)}│`);
    if (analysis.filters.applicantCompetition.data.length > 0) {
      analysis.filters.applicantCompetition.data.slice(0, 3).forEach(b => {
        console.log(`│   - ${(b.display || 'Unknown').substring(0, 50).padEnd(51)}│`);
      });
    }
    console.log(`│ Raw Applicant Text: ${analysis.rawDOMData.applicantText.length} jobs show applicant count   │`);
    console.log('└─────────────────────────────────────────────────────────┘\n');

    // Filter 4: Active Recruiting Badge
    console.log('┌─────────────────────────────────────────────────────────┐');
    console.log('│ FILTER 4: Active Recruiting Badge                       │');
    console.log('├─────────────────────────────────────────────────────────┤');
    console.log(`│ Active (Green) Badges: ${analysis.filters.activeRecruiting.activeBadges.length.toString().padEnd(32)}│`);
    console.log(`│ Stale (Red) Badges: ${analysis.filters.activeRecruiting.staleBadges.length.toString().padEnd(35)}│`);
    if (analysis.filters.activeRecruiting.activeBadges.length > 0) {
      analysis.filters.activeRecruiting.activeBadges.slice(0, 2).forEach(b => {
        console.log(`│   ✅ ${(b.text || 'Active').substring(0, 49).padEnd(49)}│`);
      });
    }
    if (analysis.filters.activeRecruiting.staleBadges.length > 0) {
      analysis.filters.activeRecruiting.staleBadges.slice(0, 2).forEach(b => {
        console.log(`│   🔴 ${(b.text || 'Stale').substring(0, 49).padEnd(49)}│`);
      });
    }
    console.log(`│ Raw Activity Data: ${analysis.rawDOMData.employerActivityText.length} jobs show employer activity │`);
    console.log('└─────────────────────────────────────────────────────────┘\n');

    // Extension logs summary
    if (extensionLogs.length > 0) {
      console.log('📝 Extension Console Logs:');
      extensionLogs.slice(0, 10).forEach(log => {
        console.log(`   ${log.substring(0, 100)}`);
      });
      console.log('');
    }

    // Take screenshot
    const screenshotPath = 'C:\\Users\\isaia\\OneDrive\\Documents\\2025 Docs\\Claude Copy\\Vibed-Web-Start-1\\.claude\\skills\\playwright-skill\\indeed-filters-test.png';
    await indeedPage.screenshot({ path: screenshotPath, fullPage: false });
    console.log(`📸 Screenshot saved: indeed-filters-test.png\n`);

    // Summary assessment
    console.log('='.repeat(60));
    console.log('📋 VERIFICATION SUMMARY');
    console.log('='.repeat(60));

    const hasEntryLevel = analysis.filters.entryLevel.warningBadges.length > 0 || analysis.rawDOMData.experienceText.length > 0;
    const hasBenefits = analysis.filters.benefits.detectedBadges.length > 0 || analysis.rawDOMData.benefitsText.length > 0;
    const hasApplicant = analysis.filters.applicantCompetition.data.length > 0 || analysis.rawDOMData.applicantText.length > 0;
    const hasRecruiting = analysis.filters.activeRecruiting.activeBadges.length + analysis.filters.activeRecruiting.staleBadges.length > 0 || analysis.rawDOMData.employerActivityText.length > 0;

    console.log(`Entry Level Filter:    ${hasEntryLevel ? '✅ DATA AVAILABLE' : '⚠️  No data found (check if jobs are entry-level)'}`);
    console.log(`Benefits Filter:       ${hasBenefits ? '✅ DATA AVAILABLE' : '⚠️  No data found'}`);
    console.log(`Applicant Filter:      ${hasApplicant ? '✅ DATA AVAILABLE' : '⚠️  No data found'}`);
    console.log(`Active Recruiting:     ${hasRecruiting ? '✅ DATA AVAILABLE' : '⚠️  No data found'}`);

    console.log('\n✅ Verification complete! Chrome remains open.\n');

    await browser.close();

  } catch (error) {
    console.error('❌ Error:', error.message);

    if (error.message.includes('connect ECONNREFUSED')) {
      console.log('\n📌 Chrome is not running with remote debugging enabled.');
      console.log('\nTo enable:');
      console.log('1. Close all Chrome windows completely');
      console.log('2. Run Chrome with: --remote-debugging-port=9222');
      console.log('   Or use the launch script: launch-chrome-debug.bat');
      console.log('3. Navigate to Indeed and try again');
    }
  }
})();
