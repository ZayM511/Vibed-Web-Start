/**
 * LinkedIn Badge Analysis Script
 *
 * This script:
 * 1. Loads LinkedIn with the extension
 * 2. Takes screenshots of job cards
 * 3. Analyzes which cards have badges and which don't
 * 4. Checks console for errors
 * 5. Inspects DOM to understand why some badges are missing
 */

const { chromium } = require('playwright');
const path = require('path');

// Extension path
const EXTENSION_PATH = path.resolve(__dirname, '../../../chrome-extension');

(async () => {
  console.log('🚀 Starting LinkedIn Badge Analysis...');
  console.log('📁 Extension path:', EXTENSION_PATH);

  // Launch browser with extension
  const browser = await chromium.launchPersistentContext('', {
    headless: false,
    args: [
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`,
      '--disable-blink-features=AutomationControlled',
      '--no-sandbox'
    ],
    slowMo: 100
  });

  const page = await browser.newPage();

  // Listen for console messages
  const consoleMessages = [];
  page.on('console', msg => {
    const text = msg.text();
    consoleMessages.push({ type: msg.type(), text });

    // Log important messages
    if (text.includes('[Badge') || text.includes('[JobFiltr]') || text.includes('Error')) {
      console.log(`[Console ${msg.type()}]`, text);
    }
  });

  // Navigate to LinkedIn jobs
  console.log('\n📍 Navigating to LinkedIn jobs...');
  await page.goto('https://www.linkedin.com/jobs/search/?keywords=software%20engineer', {
    waitUntil: 'networkidle',
    timeout: 30000
  });

  console.log('⏳ Waiting 5 seconds for badges to load...');
  await page.waitForTimeout(5000);

  // Take initial screenshot
  await page.screenshot({
    path: path.join(__dirname, 'linkedin-initial-state.png'),
    fullPage: true
  });
  console.log('📸 Initial screenshot saved');

  // Analyze job cards
  console.log('\n🔍 Analyzing job cards...');

  const cardAnalysis = await page.evaluate(() => {
    const cards = document.querySelectorAll('li.jobs-search-results__list-item');
    const results = {
      totalCards: cards.length,
      cardsWithAgeBadges: 0,
      cardsWithBenefitsBadges: 0,
      cardsWithoutBadges: 0,
      cardDetails: []
    };

    cards.forEach((card, index) => {
      const jobId = card.dataset.jobId ||
                    card.dataset.occludableJobId ||
                    card.querySelector('a[href*="/jobs/view/"]')?.href?.match(/\/jobs\/view\/(\d+)/)?.[1];

      const cardContainer = card.closest('li') || card;
      const hasAgeBadge = !!cardContainer.querySelector('.jobfiltr-age-badge');
      const hasBenefitsBadge = !!cardContainer.querySelector('.jobfiltr-benefits-badge');

      // Count badges
      const ageBadgeCount = cardContainer.querySelectorAll('.jobfiltr-age-badge').length;
      const benefitsBadgeCount = cardContainer.querySelectorAll('.jobfiltr-benefits-badge').length;

      // Get benefit badge details
      const benefitsBadges = cardContainer.querySelectorAll('.jobfiltr-benefits-badge');
      const benefitDetails = Array.from(benefitsBadges).map(badge => {
        const benefitTags = badge.querySelectorAll('span[style*="background"]');
        return {
          benefitCount: benefitTags.length,
          benefits: Array.from(benefitTags).map(tag => tag.textContent.trim())
        };
      });

      // Get age badge text
      const ageBadgeText = cardContainer.querySelector('.jobfiltr-age-badge')?.textContent || null;

      // Get card text for age detection
      const cardText = card.textContent.substring(0, 200);

      // Check for insertion point
      let insertionPointExists = false;
      let current = card;
      let depth = 0;
      while (current && depth < 10) {
        const style = window.getComputedStyle(current);
        if (style.position !== 'static') {
          insertionPointExists = true;
          break;
        }
        current = current.parentElement;
        depth++;
      }

      if (hasAgeBadge) results.cardsWithAgeBadges++;
      if (hasBenefitsBadge) results.cardsWithBenefitsBadges++;
      if (!hasAgeBadge && !hasBenefitsBadge) results.cardsWithoutBadges++;

      results.cardDetails.push({
        index,
        jobId,
        hasAgeBadge,
        hasBenefitsBadge,
        ageBadgeCount,
        benefitsBadgeCount,
        ageBadgeText,
        benefitDetails,
        cardTextSnippet: cardText,
        insertionPointExists,
        insertionDepth: depth
      });
    });

    return results;
  });

  console.log('\n📊 Card Analysis Results:');
  console.log(`   Total cards: ${cardAnalysis.totalCards}`);
  console.log(`   Cards with age badges: ${cardAnalysis.cardsWithAgeBadges}`);
  console.log(`   Cards with benefits badges: ${cardAnalysis.cardsWithBenefitsBadges}`);
  console.log(`   Cards without any badges: ${cardAnalysis.cardsWithoutBadges}`);

  // Show detailed breakdown
  console.log('\n📋 Detailed Card Breakdown:');
  cardAnalysis.cardDetails.forEach(card => {
    const status = [];
    if (card.hasAgeBadge) status.push(`✅ Age (${card.ageBadgeText})`);
    else status.push('❌ Age');

    if (card.hasBenefitsBadge) {
      const benefitCount = card.benefitDetails[0]?.benefitCount || 0;
      status.push(`✅ Benefits (${benefitCount} shown)`);
    } else {
      status.push('❌ Benefits');
    }

    console.log(`   Card ${card.index}: ${status.join(', ')}`);

    if (!card.hasAgeBadge || !card.hasBenefitsBadge) {
      console.log(`      JobID: ${card.jobId || 'NOT FOUND'}`);
      console.log(`      Insertion point: ${card.insertionPointExists ? 'Found' : 'NOT FOUND'} (depth: ${card.insertionDepth})`);
    }

    if (card.hasBenefitsBadge && card.benefitDetails.length > 0) {
      const benefits = card.benefitDetails[0].benefits;
      console.log(`      Benefits shown: ${benefits.join(', ')}`);
    }
  });

  // Check badge system status
  console.log('\n🔧 Badge System Status:');
  const badgeSystemStatus = await page.evaluate(() => {
    return {
      badgeStateManagerExists: !!window.badgeStateManager,
      badgeRendererExists: !!window.badgeRenderer,
      useNewBadgeSystem: typeof USE_NEW_BADGE_SYSTEM !== 'undefined' ? USE_NEW_BADGE_SYSTEM : 'undefined',
      cacheStats: window.badgeStateManager ? window.badgeStateManager.getStats() : null,
      insertionAttempts: window.badgeRenderer ? 'WeakMap (cannot inspect)' : null
    };
  });

  console.log('   Badge State Manager:', badgeSystemStatus.badgeStateManagerExists ? '✅ Loaded' : '❌ Not loaded');
  console.log('   Badge Renderer:', badgeSystemStatus.badgeRendererExists ? '✅ Loaded' : '❌ Not loaded');
  console.log('   USE_NEW_BADGE_SYSTEM:', badgeSystemStatus.useNewBadgeSystem);
  if (badgeSystemStatus.cacheStats) {
    console.log('   Cache Stats:', JSON.stringify(badgeSystemStatus.cacheStats, null, 2));
  }

  // Check filter settings
  console.log('\n⚙️  Filter Settings:');
  const filterSettings = await page.evaluate(() => {
    return new Promise((resolve) => {
      chrome.storage.local.get(null, (settings) => {
        resolve({
          showJobAge: settings.showJobAge,
          showBenefitsIndicator: settings.showBenefitsIndicator,
          hideStaffing: settings.hideStaffing,
          staffingDisplayMode: settings.staffingDisplayMode
        });
      });
    });
  });
  console.log('   Show Job Age:', filterSettings.showJobAge);
  console.log('   Show Benefits Indicator:', filterSettings.showBenefitsIndicator);

  // Analyze specific cards without badges
  const cardsWithoutAge = cardAnalysis.cardDetails.filter(c => !c.hasAgeBadge).slice(0, 3);

  if (cardsWithoutAge.length > 0) {
    console.log('\n🔍 Analyzing cards without age badges...');

    for (const cardInfo of cardsWithoutAge) {
      console.log(`\n   Card ${cardInfo.index} (JobID: ${cardInfo.jobId || 'MISSING'}):`);

      const detailedAnalysis = await page.evaluate((index) => {
        const card = document.querySelectorAll('li.jobs-search-results__list-item')[index];
        if (!card) return null;

        // Try to extract age using same logic as extension
        const cardText = card.textContent;
        const agePatterns = [
          /(\d+)\s*(?:hours?|hr|h)\s*ago/i,
          /(\d+)\s*(?:days?|d)\s*ago/i,
          /(\d+)\s*(?:weeks?|wk|w)\s*ago/i,
          /(\d+)\s*(?:months?|mo)\s*ago/i,
          /\b(\d+)d\b/i,
          /\b(\d+)w\b/i
        ];

        let ageFound = null;
        for (const pattern of agePatterns) {
          const match = cardText.match(pattern);
          if (match) {
            ageFound = match[0];
            break;
          }
        }

        return {
          hasAgeText: !!ageFound,
          ageTextFound: ageFound,
          cardTextSample: cardText.substring(0, 300)
        };
      }, cardInfo.index);

      if (detailedAnalysis) {
        console.log(`      Age text in DOM: ${detailedAnalysis.hasAgeText ? '✅ Found (' + detailedAnalysis.ageTextFound + ')' : '❌ Not found'}`);
        if (!detailedAnalysis.hasAgeText) {
          console.log(`      Card text sample: "${detailedAnalysis.cardTextSample.substring(0, 150)}..."`);
        }
      }
    }
  }

  // Take screenshot highlighting cards without badges
  await page.evaluate(() => {
    const cards = document.querySelectorAll('li.jobs-search-results__list-item');
    cards.forEach((card, index) => {
      const cardContainer = card.closest('li') || card;
      const hasAgeBadge = !!cardContainer.querySelector('.jobfiltr-age-badge');
      const hasBenefitsBadge = !!cardContainer.querySelector('.jobfiltr-benefits-badge');

      if (!hasAgeBadge || !hasBenefitsBadge) {
        card.style.border = '3px solid red';
      } else {
        card.style.border = '3px solid green';
      }
    });
  });

  await page.screenshot({
    path: path.join(__dirname, 'linkedin-badges-highlighted.png'),
    fullPage: true
  });
  console.log('\n📸 Highlighted screenshot saved (red = missing badges, green = has badges)');

  // Check console errors
  const errors = consoleMessages.filter(m => m.type === 'error');
  if (errors.length > 0) {
    console.log('\n❌ Console Errors Found:');
    errors.forEach(err => console.log(`   ${err.text}`));
  }

  // Save full analysis report
  const report = {
    timestamp: new Date().toISOString(),
    cardAnalysis,
    badgeSystemStatus,
    filterSettings,
    consoleErrors: errors,
    consoleWarnings: consoleMessages.filter(m => m.type === 'warning')
  };

  const fs = require('fs');
  fs.writeFileSync(
    path.join(__dirname, 'badge-analysis-report.json'),
    JSON.stringify(report, null, 2)
  );
  console.log('\n💾 Full analysis report saved to badge-analysis-report.json');

  console.log('\n✅ Analysis complete! Browser will stay open for manual inspection.');
  console.log('   Press Ctrl+C when done.');

  // Keep browser open for manual inspection
  await new Promise(() => {});
})();
