const { chromium } = require('playwright');

/**
 * Inspect Indeed's job data structure to understand:
 * 1. What fields are available in mosaic provider data
 * 2. How employment type (part-time/full-time) is represented
 * 3. How salary/hourly info is structured
 */

(async () => {
  console.log('='.repeat(70));
  console.log('INDEED JOB DATA STRUCTURE ANALYSIS');
  console.log('Investigating part-time vs full-time and salary data');
  console.log('='.repeat(70));

  const browser = await chromium.launch({
    headless: false,
    slowMo: 50
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();

  // Capture console logs from page
  page.on('console', msg => {
    if (msg.text().includes('JOBFILTR_DATA')) {
      console.log('\n' + msg.text());
    }
  });

  // Navigate to Indeed with a search that will have mixed part-time/full-time results
  console.log('\n[STEP 1] Navigating to Indeed with "customer service" search (mix of PT/FT)...');
  await page.goto('https://www.indeed.com/jobs?q=customer+service&l=Remote');
  await page.waitForTimeout(5000);

  // Extract and analyze the mosaic data structure
  console.log('\n[STEP 2] Extracting mosaic provider data structure...');

  const mosaicAnalysis = await page.evaluate(() => {
    const results = {
      hasMosaicData: false,
      sampleJobs: [],
      allFieldsFound: new Set(),
      employmentTypeFields: [],
      salaryFields: [],
      jobTypeIndicators: []
    };

    try {
      if (window.mosaic && window.mosaic.providerData) {
        results.hasMosaicData = true;
        const jobcardsProvider = window.mosaic.providerData['mosaic-provider-jobcards'];

        if (jobcardsProvider?.metaData?.mosaicProviderJobCardsModel?.results) {
          const jobs = jobcardsProvider.metaData.mosaicProviderJobCardsModel.results;

          // Analyze first 5 jobs in detail
          jobs.slice(0, 5).forEach((job, idx) => {
            const jobSummary = {
              index: idx,
              jobkey: job.jobkey,
              title: job.title,
              company: job.company,
              allFields: Object.keys(job),
              // Look for employment type indicators
              jobTypes: job.jobTypes,
              employmentType: job.employmentType,
              jobType: job.jobType,
              workType: job.workType,
              scheduleType: job.scheduleType,
              // Look for salary info
              salary: job.salary,
              salarySnippet: job.salarySnippet,
              extractedSalary: job.extractedSalary,
              estimatedSalary: job.estimatedSalary,
              compensation: job.compensation,
              // Other potentially useful fields
              formattedRelativeTime: job.formattedRelativeTime,
              pubDate: job.pubDate,
              // Full job object for inspection
              rawJobData: JSON.stringify(job, null, 2).substring(0, 2000)
            };
            results.sampleJobs.push(jobSummary);

            // Collect all field names
            Object.keys(job).forEach(key => results.allFieldsFound.add(key));
          });

          results.allFieldsFound = Array.from(results.allFieldsFound);
          results.totalJobsInMosaic = jobs.length;
        }
      }
    } catch (e) {
      results.error = e.message;
    }

    return results;
  });

  console.log('\n--- MOSAIC DATA ANALYSIS ---');
  console.log('Has mosaic data:', mosaicAnalysis.hasMosaicData);
  console.log('Total jobs in mosaic:', mosaicAnalysis.totalJobsInMosaic);
  console.log('\nAll fields found in job objects:');
  console.log(mosaicAnalysis.allFieldsFound?.join(', '));

  console.log('\n--- SAMPLE JOBS ---');
  mosaicAnalysis.sampleJobs?.forEach(job => {
    console.log(`\nJob ${job.index}: ${job.title} @ ${job.company}`);
    console.log('  jobTypes:', job.jobTypes);
    console.log('  employmentType:', job.employmentType);
    console.log('  jobType:', job.jobType);
    console.log('  salary:', job.salary);
    console.log('  salarySnippet:', job.salarySnippet);
    console.log('  All fields:', job.allFields?.join(', '));
  });

  // Now look at the DOM structure for job type indicators
  console.log('\n[STEP 3] Analyzing DOM for job type indicators...');

  const domAnalysis = await page.evaluate(() => {
    const results = {
      jobCards: [],
      jobTypeSelectors: []
    };

    // Find job cards
    const cards = document.querySelectorAll('.job_seen_beacon, [data-jk]');

    cards.forEach((card, idx) => {
      if (idx >= 3) return; // Only analyze first 3 cards

      const cardData = {
        index: idx,
        title: card.querySelector('h2, .jobTitle')?.textContent?.trim(),
        // Look for job type in various places
        metadataText: card.querySelector('.jobMetaDataGroup')?.textContent?.trim(),
        attributeSnippet: card.querySelector('.attribute_snippet, [data-testid="attribute_snippet_testid"]')?.textContent?.trim(),
        salarySnippet: card.querySelector('.salary-snippet-container, .salaryOnly')?.textContent?.trim(),
        // Check for specific job type badges
        jobTypeBadges: [],
        allTextContent: card.textContent?.substring(0, 500)
      };

      // Look for job type indicators
      const allSpans = card.querySelectorAll('span, div');
      allSpans.forEach(el => {
        const text = el.textContent?.trim().toLowerCase() || '';
        if (text.includes('part-time') || text.includes('part time') ||
            text.includes('full-time') || text.includes('full time') ||
            text.includes('contract') || text.includes('temporary')) {
          cardData.jobTypeBadges.push({
            text: el.textContent?.trim(),
            className: el.className,
            tagName: el.tagName
          });
        }
      });

      results.jobCards.push(cardData);
    });

    return results;
  });

  console.log('\n--- DOM ANALYSIS ---');
  domAnalysis.jobCards?.forEach(card => {
    console.log(`\nCard ${card.index}: ${card.title}`);
    console.log('  Metadata:', card.metadataText);
    console.log('  Attribute snippet:', card.attributeSnippet);
    console.log('  Salary snippet:', card.salarySnippet);
    console.log('  Job type badges found:', card.jobTypeBadges?.length || 0);
    card.jobTypeBadges?.forEach(badge => {
      console.log(`    - "${badge.text}" (class: ${badge.className})`);
    });
  });

  // Check JSON-LD structured data
  console.log('\n[STEP 4] Checking for JSON-LD structured data...');

  const jsonLdData = await page.evaluate(() => {
    const scripts = document.querySelectorAll('script[type="application/ld+json"]');
    const results = [];
    scripts.forEach(script => {
      try {
        const data = JSON.parse(script.textContent);
        if (data['@type'] === 'JobPosting' || data.employmentType) {
          results.push({
            type: data['@type'],
            employmentType: data.employmentType,
            baseSalary: data.baseSalary,
            title: data.title
          });
        }
      } catch (e) {}
    });
    return results;
  });

  console.log('JSON-LD JobPosting data found:', jsonLdData?.length || 0);
  jsonLdData?.forEach(ld => {
    console.log('  Employment type:', ld.employmentType);
    console.log('  Base salary:', JSON.stringify(ld.baseSalary));
  });

  // Click on a job to see detail panel data
  console.log('\n[STEP 5] Clicking on a job to inspect detail panel...');

  try {
    await page.click('.job_seen_beacon, [data-jk]', { timeout: 5000 });
    await page.waitForTimeout(3000);

    const detailAnalysis = await page.evaluate(() => {
      const results = {
        jobTypeInDetail: [],
        salaryInDetail: null
      };

      // Look for job type in detail panel
      const detailSelectors = [
        '.jobsearch-JobMetadataHeader-item',
        '.jobsearch-JobInfoHeader-subtitle',
        '[data-testid="jobsearch-JobInfoHeader-subtitle"]',
        '.jobsearch-CompanyInfoContainer'
      ];

      detailSelectors.forEach(sel => {
        const els = document.querySelectorAll(sel);
        els.forEach(el => {
          const text = el.textContent?.trim() || '';
          if (text.includes('Part-time') || text.includes('Full-time') ||
              text.includes('Contract') || text.includes('Temporary')) {
            results.jobTypeInDetail.push({
              selector: sel,
              text: text.substring(0, 100)
            });
          }
        });
      });

      // Look for salary in detail
      const salaryEl = document.querySelector('.jobsearch-JobMetadataHeader-item, [data-testid="compensation-details"]');
      if (salaryEl) {
        results.salaryInDetail = salaryEl.textContent?.trim();
      }

      return results;
    });

    console.log('Job type found in detail panel:', detailAnalysis.jobTypeInDetail);
    console.log('Salary in detail:', detailAnalysis.salaryInDetail);

  } catch (e) {
    console.log('Could not click job card:', e.message);
  }

  console.log('\n' + '='.repeat(70));
  console.log('ANALYSIS COMPLETE');
  console.log('='.repeat(70));
  console.log('\nKeeping browser open for 20 seconds for manual inspection...');
  await page.waitForTimeout(20000);

  await browser.close();
  console.log('Browser closed.');
})();
