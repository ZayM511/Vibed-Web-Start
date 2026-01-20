/**
 * Test script to verify the job age badge fix on LinkedIn
 * This will check if job age badges appear on job cards without needing to click them
 */

const { launchStealthBrowser } = require('./stealth-browser-config');
const path = require('path');

(async () => {
  console.log('🔍 Testing LinkedIn Job Age Badge Fix...\n');

  const extensionPath = path.join(__dirname, '..', '..', '..', 'chrome-extension');

  // Launch stealth browser with extension
  const { browser, page } = await launchStealthBrowser(extensionPath);

  try {
    // Navigate to LinkedIn jobs page
    console.log('📍 Navigating to LinkedIn jobs...');
    await page.goto('https://www.linkedin.com/jobs/search/?keywords=software%20engineer&location=United%20States', {
      waitUntil: 'networkidle',
      timeout: 60000
    });

    // Wait for page to fully load
    await page.waitForTimeout(5000);

    console.log('⏳ Waiting for job cards to load...');

    // Wait for job cards to appear
    await page.waitForSelector('li.jobs-search-results__list-item, li.scaffold-layout__list-item', {
      timeout: 30000
    });

    // Wait for extension to process cards
    await page.waitForTimeout(3000);

    // Check for job age badges WITHOUT clicking any cards
    console.log('\n✅ Checking for job age badges on initial load (no clicking)...\n');

    const badgeInfo = await page.evaluate(() => {
      const badges = document.querySelectorAll('.jobfiltr-age-badge');
      const jobCards = document.querySelectorAll('li.jobs-search-results__list-item, li.scaffold-layout__list-item');

      const results = {
        totalCards: jobCards.length,
        totalBadges: badges.length,
        badgeDetails: []
      };

      badges.forEach((badge, index) => {
        const jobId = badge.dataset.jobId;
        const age = badge.dataset.age;
        const text = badge.textContent.trim();

        results.badgeDetails.push({
          index: index + 1,
          jobId,
          age,
          displayText: text
        });
      });

      return results;
    });

    console.log(`📊 Results:`);
    console.log(`   Total job cards found: ${badgeInfo.totalCards}`);
    console.log(`   Total job age badges: ${badgeInfo.totalBadges}`);
    console.log(`   Coverage: ${((badgeInfo.totalBadges / badgeInfo.totalCards) * 100).toFixed(1)}%\n`);

    if (badgeInfo.badgeDetails.length > 0) {
      console.log(`📋 Badge Details (first 10):`);
      badgeInfo.badgeDetails.slice(0, 10).forEach(badge => {
        console.log(`   ${badge.index}. Job ${badge.jobId}: ${badge.displayText} (${badge.age} days)`);
      });
    }

    // Now click on a job card and verify the ages match
    console.log('\n🖱️ Clicking on first job card to verify consistency...');

    await page.click('li.jobs-search-results__list-item:first-child, li.scaffold-layout__list-item:first-child');
    await page.waitForTimeout(2000);

    const consistencyCheck = await page.evaluate(() => {
      const activeCard = document.querySelector('.jobs-search-results-list__list-item--active, .scaffold-layout__list-item--active');
      const cardBadge = activeCard?.querySelector('.jobfiltr-age-badge');
      const detailBadge = document.querySelector('.jobfiltr-detail-age-badge');

      return {
        cardBadgeText: cardBadge?.textContent.trim() || 'Not found',
        cardBadgeAge: cardBadge?.dataset.age || 'N/A',
        detailBadgeText: detailBadge?.textContent.trim() || 'Not found',
        detailBadgeAge: detailBadge?.dataset.age || 'N/A',
        match: cardBadge?.dataset.age === detailBadge?.dataset.age
      };
    });

    console.log('\n🔄 Consistency Check:');
    console.log(`   Card badge: ${consistencyCheck.cardBadgeText} (${consistencyCheck.cardBadgeAge} days)`);
    console.log(`   Detail badge: ${consistencyCheck.detailBadgeText} (${consistencyCheck.detailBadgeAge} days)`);
    console.log(`   Match: ${consistencyCheck.match ? '✅ YES' : '❌ NO'}`);

    if (consistencyCheck.match) {
      console.log('\n🎉 SUCCESS: Job ages match between card and detail panel!');
    } else {
      console.log('\n⚠️ WARNING: Job ages do NOT match. There may still be an issue.');
    }

    console.log('\n✅ Test complete. Browser will stay open for manual inspection.');
    console.log('   Press Ctrl+C to close when done.\n');

  } catch (error) {
    console.error('❌ Error during test:', error.message);
  }

  // Keep browser open for inspection
  // await browser.close();
})();
