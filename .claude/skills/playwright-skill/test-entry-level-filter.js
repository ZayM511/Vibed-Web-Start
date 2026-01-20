// Test Entry Level Accuracy Filter - Targeted Test
// Searches for "entry level" jobs and checks if the filter detects experience mismatches
const { chromium } = require('playwright');

(async () => {
  console.log('=== Entry Level Accuracy Filter Test ===\n');
  console.log('Connecting to Chrome on port 9222...\n');

  try {
    const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
    console.log('✅ Connected to Chrome!\n');

    const contexts = browser.contexts();
    const context = contexts[0];

    // Create new tab for entry-level specific search
    console.log('Opening Indeed search for "entry level software developer"...\n');
    const indeedPage = await context.newPage();
    await indeedPage.goto('https://www.indeed.com/jobs?q=entry+level+software+developer&l=Remote&sc=0kf%3Aexplvl(ENTRY_LEVEL)%3B', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    console.log('URL:', indeedPage.url());
    console.log('Title:', await indeedPage.title());

    // Capture extension logs
    const logs = [];
    indeedPage.on('console', msg => {
      const text = msg.text();
      if (text.includes('[JobFiltr') || text.includes('entry') || text.includes('Entry') || text.includes('experience') || text.includes('years')) {
        logs.push(text.substring(0, 200));
        console.log(`[EXT] ${text.substring(0, 150)}`);
      }
    });

    console.log('\nWaiting 10 seconds for extension to process...\n');
    await indeedPage.waitForTimeout(10000);

    // Analyze results
    const analysis = await indeedPage.evaluate(() => {
      const results = {
        totalCards: 0,
        entryLevelLabeled: 0,
        experienceMentions: [],
        warningBadges: [],
        jobDetails: []
      };

      const jobCards = document.querySelectorAll('.job_seen_beacon, [data-jk]');
      results.totalCards = jobCards.length;

      jobCards.forEach((card, index) => {
        const text = card.textContent?.toLowerCase() || '';
        const jobId = card.getAttribute('data-jk') || `job-${index}`;

        // Check if labeled entry level
        if (text.includes('entry level') || text.includes('entry-level')) {
          results.entryLevelLabeled++;
        }

        // Check for experience requirements
        const expPatterns = [
          /(\d+)\+?\s*years?\s+(?:of\s+)?experience/gi,
          /minimum\s+(?:of\s+)?(\d+)\s*years?/gi,
          /at\s+least\s+(\d+)\s+years?/gi,
          /requires?\s+(\d+)\+?\s+years?/gi
        ];

        expPatterns.forEach(pattern => {
          const matches = text.match(pattern);
          if (matches) {
            matches.forEach(m => {
              results.experienceMentions.push({
                jobId,
                text: m,
                years: parseInt(m.match(/\d+/)?.[0] || '0')
              });
            });
          }
        });

        // Check for warning badges (yellow background)
        const warningElements = card.querySelectorAll('[style*="rgb(255, 193, 7)"], [style*="#ffc107"], [style*="255, 193"]');
        warningElements.forEach(el => {
          results.warningBadges.push({
            jobId,
            text: el.textContent?.trim()
          });
        });

        // Get basic job info
        const title = card.querySelector('.jobTitle, [data-testid="job-title"]')?.textContent?.trim();
        const company = card.querySelector('.companyName, [data-testid="company-name"]')?.textContent?.trim();
        if (title) {
          results.jobDetails.push({
            jobId,
            title: title.substring(0, 50),
            company: company?.substring(0, 30)
          });
        }
      });

      return results;
    });

    console.log('\n' + '='.repeat(60));
    console.log('📊 ENTRY LEVEL FILTER TEST RESULTS');
    console.log('='.repeat(60) + '\n');

    console.log(`Total Job Cards: ${analysis.totalCards}`);
    console.log(`Entry-Level Labeled: ${analysis.entryLevelLabeled}`);
    console.log(`Experience Requirements Found: ${analysis.experienceMentions.length}`);
    console.log(`Warning Badges Created: ${analysis.warningBadges.length}\n`);

    if (analysis.experienceMentions.length > 0) {
      console.log('📋 Experience Mentions Found:');
      analysis.experienceMentions.slice(0, 10).forEach(m => {
        const warning = m.years >= 3 ? '⚠️ MISMATCH (3+ years)' : '✅ OK';
        console.log(`   - ${m.text} - ${warning}`);
      });
      console.log('');
    }

    if (analysis.warningBadges.length > 0) {
      console.log('🏷️ Warning Badges Created by Extension:');
      analysis.warningBadges.forEach(b => {
        console.log(`   - ${b.text}`);
      });
      console.log('');
    }

    console.log('📋 Sample Jobs:');
    analysis.jobDetails.slice(0, 5).forEach((j, i) => {
      console.log(`   ${i + 1}. ${j.title} @ ${j.company || 'Unknown'}`);
    });

    // Extension logs
    if (logs.length > 0) {
      console.log('\n📝 Relevant Extension Logs:');
      logs.slice(0, 8).forEach(log => {
        console.log(`   ${log.substring(0, 100)}`);
      });
    }

    // Screenshot
    await indeedPage.screenshot({
      path: 'C:\\Users\\isaia\\OneDrive\\Documents\\2025 Docs\\Claude Copy\\Vibed-Web-Start-1\\.claude\\skills\\playwright-skill\\entry-level-test.png',
      fullPage: false
    });
    console.log('\n📸 Screenshot saved: entry-level-test.png');

    console.log('\n✅ Test complete!');
    await browser.close();

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.message.includes('ECONNREFUSED')) {
      console.log('\nChrome debug mode not running. Start Chrome with --remote-debugging-port=9222');
    }
  }
})();
