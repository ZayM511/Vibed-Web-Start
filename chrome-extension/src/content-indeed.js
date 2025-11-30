// JobFiltr - Indeed Content Script
// Applies filters and extracts job information from Indeed

console.log('JobFiltr: Indeed content script loaded');

let filterSettings = {};
let hiddenJobsCount = 0;

// ===== JOB INFORMATION EXTRACTION =====
function extractJobInfo() {
  try {
    const url = window.location.href;

    // Check if we're on a job posting page
    if (!url.includes('/viewjob') && !url.includes('/rc/clk')) {
      return null;
    }

    // Extract job title
    const titleSelectors = [
      '.jobsearch-JobInfoHeader-title',
      'h1.jobTitle',
      '[data-testid="jobsearch-JobInfoHeader-title"]'
    ];

    let title = null;
    for (const selector of titleSelectors) {
      const elem = document.querySelector(selector);
      if (elem) {
        title = elem.textContent.trim();
        break;
      }
    }

    // Extract company name
    const companySelectors = [
      '[data-testid="inlineHeader-companyName"]',
      '[data-company-name="true"]',
      '.jobsearch-InlineCompanyRating-companyHeader a',
      '.jobsearch-CompanyInfoContainer a'
    ];

    let company = null;
    for (const selector of companySelectors) {
      const elem = document.querySelector(selector);
      if (elem) {
        company = elem.textContent.trim();
        break;
      }
    }

    // Extract full job description
    const descriptionElem = document.querySelector('#jobDescriptionText, .jobsearch-jobDescriptionText');
    const description = descriptionElem ? descriptionElem.textContent.trim() : '';

    return {
      url,
      title,
      company,
      description,
      platform: 'indeed'
    };
  } catch (error) {
    console.error('JobFiltr: Error extracting job info:', error);
    return null;
  }
}

// ===== STAFFING FIRM DETECTION =====
const staffingIndicators = [
  /staffing|recruiting|talent|solutions|workforce/i,
  /\b(tek|pro|consulting|systems|global|services)\b/i,
  /robert\s*half|randstad|adecco|manpower|kelly\s*services/i,
  /apex|insight|cybercoders|kforce|modis|judge/i
];

function isStaffingFirm(jobCard) {
  try {
    const companyElem = jobCard.querySelector('[data-testid="company-name"], .companyName, .company');
    if (!companyElem) return false;

    const companyName = companyElem.textContent.trim().toLowerCase();

    return staffingIndicators.some(pattern => pattern.test(companyName));
  } catch (error) {
    return false;
  }
}

// ===== SPONSORED POST DETECTION =====
function isSponsored(jobCard) {
  try {
    // Indeed marks sponsored posts with specific attributes
    if (jobCard.hasAttribute('data-is-sponsored') ||
        jobCard.querySelector('[data-testid="sponsored-label"]')) {
      return true;
    }

    // Check for "Sponsored" text
    const sponsoredLabel = jobCard.querySelector('.sponsoredJob, .sponsoredGray');
    if (sponsoredLabel) return true;

    return false;
  } catch (error) {
    return false;
  }
}

// ===== APPLICANT COUNT EXTRACTION =====
function getApplicantCount(jobCard) {
  try {
    // Indeed doesn't always show exact applicant counts
    const applicantElem = jobCard.querySelector('[data-testid="applicant-count"]');
    if (applicantElem) {
      const text = applicantElem.textContent.trim();
      const match = text.match(/(\d+)/);
      if (match) {
        return parseInt(match[1]);
      }
    }

    // Check for "Be among the first to apply" which indicates < 10
    const urgencyText = jobCard.querySelector('.job-snippet, .jobCardShelfContainer');
    if (urgencyText && urgencyText.textContent.includes('Be among the first')) {
      return 5; // Estimate
    }

    return null;
  } catch (error) {
    return null;
  }
}

// ===== ENTRY LEVEL ACCURACY CHECK =====
function checkEntryLevelAccuracy(jobCard) {
  try {
    // Check if job title or metadata includes "entry level"
    const titleElem = jobCard.querySelector('[data-testid="job-title"], .jobTitle');
    const metadataElem = jobCard.querySelector('.job-snippet, #jobDescriptionText');

    if (!titleElem && !metadataElem) return null;

    const titleText = titleElem ? titleElem.textContent.toLowerCase() : '';
    const metadataText = metadataElem ? metadataElem.textContent.toLowerCase() : '';

    const isEntryLevel = titleText.includes('entry level') || metadataText.includes('entry level');

    if (!isEntryLevel) return null;

    // Check for experience requirements
    const experiencePatterns = [
      /(\d+)\+?\s*years?\s+(?:of\s+)?experience/gi,
      /minimum\s+(?:of\s+)?(\d+)\s+years?/gi,
      /(\d+)\s+years?\s+(?:minimum|required)/gi
    ];

    for (const pattern of experiencePatterns) {
      const matches = metadataText.matchAll(pattern);
      for (const match of matches) {
        const years = parseInt(match[1]);
        if (years >= 3) {
          return {
            mismatch: true,
            years,
            message: `⚠️ Labeled Entry Level but requires ${years}+ years`
          };
        }
      }
    }

    return { mismatch: false };
  } catch (error) {
    return null;
  }
}

// ===== JOB AGE DETECTION =====
function getJobAge(jobCard) {
  try {
    const dateElem = jobCard.querySelector('[data-testid="myJobsStateDate"], .date');
    if (!dateElem) return null;

    const text = dateElem.textContent.trim().toLowerCase();

    if (text.includes('today') || text.includes('just posted')) return 0;
    if (text.includes('day')) {
      const match = text.match(/(\d+)/);
      return match ? parseInt(match[1]) : 1;
    }
    if (text.includes('30+')) return 30;

    return null;
  } catch (error) {
    return null;
  }
}

// ===== EASY APPLY DETECTION =====
function hasEasyApply(jobCard) {
  try {
    const easyApplyButton = jobCard.querySelector('[data-testid="apply-button-desktop"], .ia-IndeedApplyButton');
    return easyApplyButton && easyApplyButton.textContent.toLowerCase().includes('easily apply');
  } catch (error) {
    return false;
  }
}

// ===== VISA SPONSORSHIP DETECTION =====
function hasVisaSponsorship(jobCard) {
  try {
    const descriptionElem = document.querySelector('#jobDescriptionText');
    if (!descriptionElem) return false;

    const description = descriptionElem.textContent.toLowerCase();
    return /visa\s+sponsor|h-1b|h1b|sponsorship\s+available/i.test(description);
  } catch (error) {
    return false;
  }
}

// ===== FILTER APPLICATION =====
function applyFilters(settings) {
  filterSettings = settings;
  hiddenJobsCount = 0;

  const jobCards = document.querySelectorAll('.jobsearch-ResultsList > li, .job_seen_beacon, [data-testid="job-result"]');

  jobCards.forEach(jobCard => {
    let shouldHide = false;
    const reasons = [];

    // Filter 1: Hide Staffing Firms
    if (settings.hideStaffing && isStaffingFirm(jobCard)) {
      shouldHide = true;
      reasons.push('Staffing Firm');
    }

    // Filter 2: Hide Sponsored
    if (settings.hideSponsored && isSponsored(jobCard)) {
      shouldHide = true;
      reasons.push('Sponsored');
    }

    // Filter 3: Applicant Count
    if (settings.filterApplicants) {
      const applicantCount = getApplicantCount(jobCard);
      if (applicantCount !== null) {
        const range = settings.applicantRange;
        if (range === 'under10' && applicantCount >= 10) shouldHide = true;
        if (range === '10-50' && (applicantCount < 10 || applicantCount > 50)) shouldHide = true;
        if (range === '50-200' && (applicantCount < 50 || applicantCount > 200)) shouldHide = true;
        if (range === 'over200' && applicantCount < 200) shouldHide = true;
        if (range === 'over500' && applicantCount < 500) shouldHide = true;

        if (shouldHide) reasons.push(`Applicants: ${applicantCount}`);
      }
    }

    // Filter 4: Entry Level Accuracy
    if (settings.entryLevelAccuracy) {
      const check = checkEntryLevelAccuracy(jobCard);
      if (check && check.mismatch) {
        addBadgeToJob(jobCard, check.message, 'warning');
      }
    }

    // Filter 6: Job Age Display
    if (settings.showJobAge) {
      const jobAge = getJobAge(jobCard);
      if (jobAge !== null && jobAge > 30) {
        addBadgeToJob(jobCard, `Posted ${jobAge}+ days ago`, 'warning');
      }
    }

    // Filter 10: Easy Apply Only
    if (settings.easyApplyOnly && !hasEasyApply(jobCard)) {
      shouldHide = true;
      reasons.push('Not Easily Apply');
    }

    // Filter 9: Visa Sponsorship
    if (settings.visaOnly && !hasVisaSponsorship(jobCard)) {
      shouldHide = true;
      reasons.push('No Visa Sponsorship');
    }

    // Apply hiding
    if (shouldHide) {
      jobCard.style.display = 'none';
      jobCard.dataset.jobfiltrHidden = 'true';
      jobCard.dataset.jobfiltrReasons = reasons.join(', ');
      hiddenJobsCount++;
    } else {
      jobCard.style.display = '';
      delete jobCard.dataset.jobfiltrHidden;
    }
  });

  // Send stats update to popup
  chrome.runtime.sendMessage({
    type: 'FILTER_STATS_UPDATE',
    hiddenCount: hiddenJobsCount
  });

  console.log(`JobFiltr: Filtered ${hiddenJobsCount} jobs on Indeed`);
}

// ===== BADGE ADDITION =====
function addBadgeToJob(jobCard, message, type = 'warning') {
  const existingBadge = jobCard.querySelector('.jobfiltr-badge');
  if (existingBadge) {
    existingBadge.remove();
  }

  const badge = document.createElement('div');
  badge.className = `jobfiltr-badge jobfiltr-badge-${type}`;
  badge.textContent = message;
  badge.style.cssText = `
    position: absolute;
    top: 8px;
    right: 8px;
    background: ${type === 'danger' ? '#ef4444' : '#f59e0b'};
    color: white;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 600;
    z-index: 1000;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  `;

  jobCard.style.position = 'relative';
  jobCard.appendChild(badge);
}

// ===== RESET FILTERS =====
function resetFilters() {
  const jobCards = document.querySelectorAll('.jobsearch-ResultsList > li, .job_seen_beacon, [data-testid="job-result"]');

  jobCards.forEach(jobCard => {
    jobCard.style.display = '';
    delete jobCard.dataset.jobfiltrHidden;
    delete jobCard.dataset.jobfiltrReasons;

    const badges = jobCard.querySelectorAll('.jobfiltr-badge');
    badges.forEach(badge => badge.remove());
  });

  hiddenJobsCount = 0;

  chrome.runtime.sendMessage({
    type: 'FILTER_STATS_UPDATE',
    hiddenCount: 0
  });

  console.log('JobFiltr: Filters reset on Indeed');
}

// ===== MESSAGE LISTENER =====
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'EXTRACT_JOB_INFO') {
    const jobInfo = extractJobInfo();
    sendResponse({ success: !!jobInfo, data: jobInfo });
  }

  if (message.type === 'APPLY_FILTERS') {
    applyFilters(message.settings);
    sendResponse({ success: true });
  }

  if (message.type === 'RESET_FILTERS') {
    resetFilters();
    sendResponse({ success: true });
  }

  return true;
});

// ===== MUTATION OBSERVER FOR DYNAMIC CONTENT =====
const observer = new MutationObserver((mutations) => {
  if (Object.keys(filterSettings).length > 0) {
    requestAnimationFrame(() => {
      applyFilters(filterSettings);
    });
  }
});

const jobsList = document.querySelector('.jobsearch-ResultsList, #mosaic-provider-jobcards');
if (jobsList) {
  observer.observe(jobsList, {
    childList: true,
    subtree: true
  });
}

console.log('JobFiltr: Indeed content script ready');
