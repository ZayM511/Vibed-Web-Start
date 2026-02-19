/**
 * Indeed Mosaic Data Extractor
 * This script runs in the page's main world (not content script isolated world)
 * It extracts job data from window.mosaic and sends it to the content script via CustomEvent
 */

(function() {
  'use strict';

  function extractAndSendMosaicData() {
    try {
      if (!window.mosaic || !window.mosaic.providerData) {
        return;
      }

      const jobcardsProvider = window.mosaic.providerData['mosaic-provider-jobcards'];
      if (!jobcardsProvider?.metaData?.mosaicProviderJobCardsModel?.results) {
        return;
      }

      const jobs = jobcardsProvider.metaData.mosaicProviderJobCardsModel.results;

      // Send the data we need (jobkey, pubDate, createDate, formattedRelativeTime, extractedSalary, jobTypes)
      const jobData = jobs.map(job => ({
        jobkey: job.jobkey,
        pubDate: job.pubDate,
        createDate: job.createDate,
        formattedRelativeTime: job.formattedRelativeTime,
        // Salary data for salary range filtering
        extractedSalary: job.extractedSalary || null,
        jobTypes: job.jobTypes || [],
        salarySnippetText: job.salarySnippet?.text || null
      }));

      // Dispatch event to content script
      window.dispatchEvent(new CustomEvent('jobfiltr-mosaic-data', {
        detail: jobData
      }));

    } catch (e) {
      console.error('[JobFiltr Mosaic Extractor] Error:', e);
    }
  }

  // Extract immediately
  extractAndSendMosaicData();

  // Also listen for requests to re-extract (for dynamic page updates)
  window.addEventListener('jobfiltr-request-mosaic', extractAndSendMosaicData);

  // Re-extract when mosaic data might have updated (after short delay)
  setTimeout(extractAndSendMosaicData, 500);
  setTimeout(extractAndSendMosaicData, 1500);
})();
