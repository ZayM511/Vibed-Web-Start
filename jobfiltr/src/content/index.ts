// Content script entry point
import { linkedinAdapter, indeedAdapter, type PlatformAdapter } from './platforms';
import { detectGhostJob, detectStaffingFirm, verifyRemote } from './detectors';
import { filterIncludeKeywords, filterExcludeKeywords, filterExcludeCompanies } from './filters';
import type { JobData, FilterSettings } from '../types';

// Determine current platform
function getPlatformAdapter(): PlatformAdapter | null {
  const hostname = window.location.hostname;
  if (hostname.includes('linkedin.com')) return linkedinAdapter;
  if (hostname.includes('indeed.com')) return indeedAdapter;
  return null;
}

// Main content script logic
async function init() {
  const adapter = getPlatformAdapter();
  if (!adapter) {
    console.log('[JobFiltr] No supported platform detected');
    return;
  }

  console.log(`[JobFiltr] Initialized on ${adapter.name}`);

  // Load settings from storage
  const settings = await loadSettings();

  // Start observing for jobs
  adapter.observeJobList((elements) => {
    for (const element of elements) {
      const jobData = adapter.extractJobData(element);
      if (jobData) {
        processJob(jobData, settings);
      }
    }
  });

  // Process initial jobs on page
  const initialJobs = document.querySelectorAll(adapter.selectors.jobCard);
  for (const element of initialJobs) {
    const jobData = adapter.extractJobData(element);
    if (jobData) {
      processJob(jobData, settings);
    }
  }
}

async function loadSettings(): Promise<FilterSettings> {
  // Default settings
  return {
    hideGhostJobs: true,
    hideStaffingFirms: false,
    verifyTrueRemote: false,
    ghostJobDaysThreshold: 30,
    datePosted: 'any',
    includeKeywords: [],
    includeKeywordsMatchMode: 'any',
    excludeKeywords: [],
    excludeCompanies: [],
  };
}

function processJob(job: JobData, settings: FilterSettings) {
  let shouldHide = false;
  const reasons: string[] = [];

  // Ghost job detection
  if (settings.hideGhostJobs) {
    const ghostResult = detectGhostJob(job, settings.ghostJobDaysThreshold);
    if (ghostResult.detected) {
      shouldHide = true;
      reasons.push(ghostResult.message);
    }
  }

  // Staffing firm detection
  if (settings.hideStaffingFirms) {
    const staffingResult = detectStaffingFirm(job);
    if (staffingResult.detected) {
      shouldHide = true;
      reasons.push(staffingResult.message);
    }
  }

  // Include keywords filter
  const includeResult = filterIncludeKeywords(job, settings.includeKeywords, settings.includeKeywordsMatchMode);
  if (!includeResult.passed) {
    shouldHide = true;
    reasons.push(includeResult.reason!);
  }

  // Exclude keywords filter
  const excludeKeywordsResult = filterExcludeKeywords(job, settings.excludeKeywords);
  if (!excludeKeywordsResult.passed) {
    shouldHide = true;
    reasons.push(excludeKeywordsResult.reason!);
  }

  // Exclude companies filter
  const excludeCompaniesResult = filterExcludeCompanies(job, settings.excludeCompanies);
  if (!excludeCompaniesResult.passed) {
    shouldHide = true;
    reasons.push(excludeCompaniesResult.reason!);
  }

  // Apply visibility
  if (shouldHide) {
    hideJob(job.element, reasons);
  }
}

function hideJob(element: Element, reasons: string[]) {
  const el = element as HTMLElement;
  el.style.display = 'none';
  el.setAttribute('data-jobfiltr-hidden', 'true');
  el.setAttribute('data-jobfiltr-reasons', reasons.join(' | '));
}

// Initialize
init();
