const { chromium } = require('playwright');

/**
 * Deep dive into extractedSalary and salarySnippet structures
 * Also check jobTypes array for part-time/full-time differentiation
 */

(async () => {
  console.log('='.repeat(70));
  console.log('INDEED SALARY & JOB TYPE DEEP ANALYSIS');
  console.log('='.repeat(70));

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  // Search for jobs with explicit hourly rates
  console.log('\n[STEP 1] Searching for hourly jobs...');
  await page.goto('https://www.indeed.com/jobs?q=cashier&l=New+York');
  await page.waitForTimeout(5000);

  const hourlyAnalysis = await page.evaluate(() => {
    const results = { jobs: [], summary: {} };

    if (window.mosaic?.providerData?.['mosaic-provider-jobcards']?.metaData?.mosaicProviderJobCardsModel?.results) {
      const jobs = window.mosaic.providerData['mosaic-provider-jobcards'].metaData.mosaicProviderJobCardsModel.results;

      jobs.forEach((job, idx) => {
        // Only look at jobs with salary info
        if (job.salarySnippet?.text || job.extractedSalary) {
          results.jobs.push({
            index: idx,
            title: job.title,
            company: job.company,
            jobTypes: job.jobTypes,
            showJobType: job.showJobType,
            salarySnippet: job.salarySnippet,
            extractedSalary: job.extractedSalary,
            // Full raw for inspection
            rawSalarySnippet: JSON.stringify(job.salarySnippet, null, 2),
            rawExtractedSalary: JSON.stringify(job.extractedSalary, null, 2)
          });
        }
      });

      // Summary stats
      results.summary = {
        totalJobs: jobs.length,
        jobsWithSalary: results.jobs.length,
        jobsWithJobTypes: jobs.filter(j => j.jobTypes?.length > 0).length
      };
    }

    return results;
  });

  console.log('\n--- HOURLY JOBS SEARCH RESULTS ---');
  console.log('Summary:', hourlyAnalysis.summary);
  console.log('\nJobs with salary data:');

  hourlyAnalysis.jobs?.slice(0, 8).forEach(job => {
    console.log(`\n${job.title} @ ${job.company}`);
    console.log('  jobTypes:', JSON.stringify(job.jobTypes));
    console.log('  salarySnippet:', job.rawSalarySnippet);
    if (job.extractedSalary) {
      console.log('  extractedSalary:', job.rawExtractedSalary);
    }
  });

  // Now search for annual salary jobs
  console.log('\n\n[STEP 2] Searching for software engineer (annual salary jobs)...');
  await page.goto('https://www.indeed.com/jobs?q=software+engineer&l=Remote');
  await page.waitForTimeout(5000);

  const annualAnalysis = await page.evaluate(() => {
    const results = { jobs: [], summary: {} };

    if (window.mosaic?.providerData?.['mosaic-provider-jobcards']?.metaData?.mosaicProviderJobCardsModel?.results) {
      const jobs = window.mosaic.providerData['mosaic-provider-jobcards'].metaData.mosaicProviderJobCardsModel.results;

      jobs.forEach((job, idx) => {
        if (job.salarySnippet?.text || job.extractedSalary) {
          results.jobs.push({
            title: job.title,
            company: job.company,
            jobTypes: job.jobTypes,
            salarySnippet: job.salarySnippet,
            extractedSalary: job.extractedSalary,
            rawSalarySnippet: JSON.stringify(job.salarySnippet, null, 2),
            rawExtractedSalary: JSON.stringify(job.extractedSalary, null, 2)
          });
        }
      });

      results.summary = {
        totalJobs: jobs.length,
        jobsWithSalary: results.jobs.length,
        jobsWithJobTypes: jobs.filter(j => j.jobTypes?.length > 0).length
      };
    }

    return results;
  });

  console.log('\n--- ANNUAL SALARY JOBS SEARCH RESULTS ---');
  console.log('Summary:', annualAnalysis.summary);

  annualAnalysis.jobs?.slice(0, 5).forEach(job => {
    console.log(`\n${job.title} @ ${job.company}`);
    console.log('  jobTypes:', JSON.stringify(job.jobTypes));
    console.log('  salarySnippet:', job.rawSalarySnippet);
    if (job.extractedSalary) {
      console.log('  extractedSalary:', job.rawExtractedSalary);
    }
  });

  // Final analysis - check if extractedSalary has numeric values
  console.log('\n\n[STEP 3] Checking for numeric salary values in extractedSalary...');

  const numericCheck = await page.evaluate(() => {
    const results = [];

    if (window.mosaic?.providerData?.['mosaic-provider-jobcards']?.metaData?.mosaicProviderJobCardsModel?.results) {
      const jobs = window.mosaic.providerData['mosaic-provider-jobcards'].metaData.mosaicProviderJobCardsModel.results;

      jobs.forEach(job => {
        if (job.extractedSalary) {
          results.push({
            title: job.title,
            extractedSalary: job.extractedSalary,
            hasNumericMin: typeof job.extractedSalary.min === 'number',
            hasNumericMax: typeof job.extractedSalary.max === 'number',
            type: job.extractedSalary.type
          });
        }
      });
    }

    return results;
  });

  console.log('\nJobs with extractedSalary (checking for numeric fields):');
  numericCheck.forEach(job => {
    console.log(`  ${job.title}:`);
    console.log(`    extractedSalary:`, JSON.stringify(job.extractedSalary));
  });

  console.log('\n' + '='.repeat(70));
  console.log('ANALYSIS COMPLETE');
  console.log('='.repeat(70));

  await page.waitForTimeout(10000);
  await browser.close();
})();
