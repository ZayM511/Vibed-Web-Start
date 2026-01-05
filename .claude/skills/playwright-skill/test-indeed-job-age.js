const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const extensionPath = path.resolve(__dirname, '../../../chrome-extension');
  console.log('Loading extension from:', extensionPath);

  // Launch Chrome with extension
  const browser = await chromium.launchPersistentContext('', {
    headless: false,
    channel: 'chrome',
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
    ],
    slowMo: 50
  });

  const page = await browser.newPage();

  // Listen to console messages for extension logs
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('JobFiltr') || text.includes('job age') || text.includes('Extracted')) {
      console.log('EXTENSION:', text);
    }
  });

  console.log('\nNavigating to Indeed...');
  await page.goto('https://www.indeed.com/jobs?q=software+engineer&l=remote', {
    waitUntil: 'domcontentloaded',
    timeout: 60000
  });

  // Wait for page to load
  await page.waitForTimeout(5000);

  // Check if job age badges appear
  console.log('\n=== CHECKING FOR JOB AGE BADGES ===');

  const badges = await page.evaluate(() => {
    const ageBadges = document.querySelectorAll('.jobfiltr-age-badge');
    return Array.from(ageBadges).map(badge => ({
      text: badge.textContent.trim(),
      visible: badge.offsetParent !== null
    }));
  });

  if (badges.length > 0) {
    console.log(`Found ${badges.length} job age badges:`);
    badges.slice(0, 10).forEach((b, i) => console.log(`  ${i + 1}. "${b.text}" (visible: ${b.visible})`));
  } else {
    console.log('No job age badges found yet - extension may need settings enabled');
  }

  // Check the mosaic data
  console.log('\n=== CHECKING MOSAIC DATA ACCESS ===');

  const mosaicCheck = await page.evaluate(() => {
    if (window.mosaic && window.mosaic.providerData) {
      const provider = window.mosaic.providerData['mosaic-provider-jobcards'];
      if (provider?.metaData?.mosaicProviderJobCardsModel?.results) {
        const jobs = provider.metaData.mosaicProviderJobCardsModel.results;
        return {
          accessible: true,
          jobCount: jobs.length,
          sampleJobs: jobs.slice(0, 5).map(j => ({
            jobkey: j.jobkey,
            title: j.displayTitle?.substring(0, 30),
            formattedRelativeTime: j.formattedRelativeTime,
            pubDate: j.pubDate ? new Date(j.pubDate).toISOString() : null
          }))
        };
      }
    }
    return { accessible: false };
  });

  if (mosaicCheck.accessible) {
    console.log(`Mosaic data accessible! Found ${mosaicCheck.jobCount} jobs:`);
    mosaicCheck.sampleJobs.forEach((j, i) => {
      console.log(`  ${i + 1}. ${j.jobkey}: "${j.title}..."`);
      console.log(`     formattedRelativeTime: ${j.formattedRelativeTime}`);
      console.log(`     pubDate: ${j.pubDate}`);
    });
  } else {
    console.log('Mosaic data not accessible');
  }

  // Check job cards for data-jk attributes
  console.log('\n=== JOB CARDS WITH DATA-JK ===');

  const jobCards = await page.evaluate(() => {
    const cards = document.querySelectorAll('[data-jk]');
    return Array.from(cards).slice(0, 5).map(card => ({
      jobKey: card.getAttribute('data-jk'),
      hasAgeBadge: !!card.querySelector('.jobfiltr-age-badge'),
      ageBadgeText: card.querySelector('.jobfiltr-age-badge')?.textContent?.trim()
    }));
  });

  jobCards.forEach((c, i) => {
    console.log(`  ${i + 1}. ${c.jobKey}: badge=${c.hasAgeBadge ? c.ageBadgeText : 'none'}`);
  });

  console.log('\n=== MANUAL TEST INSTRUCTIONS ===');
  console.log('1. Click the JobFiltr extension icon');
  console.log('2. Go to Scanner tab');
  console.log('3. Enable "Show Job Age" option');
  console.log('4. Scroll the job listings');
  console.log('5. Job age badges should appear on job cards');

  console.log('\nBrowser staying open for 60 seconds for manual testing...');
  await page.waitForTimeout(60000);

  await browser.close();
})();
