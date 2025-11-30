// JobFiltr - LinkedIn Content Script
// Applies filters and extracts job information from LinkedIn

console.log('JobFiltr: LinkedIn content script loaded');

let filterSettings = {};
let hiddenJobsCount = 0;

// ===== JOB INFORMATION EXTRACTION =====
function extractJobInfo() {
  try {
    const url = window.location.href;

    // Check if we're on a job posting page
    if (!url.includes('/jobs/view/') && !url.includes('/jobs/collections/')) {
      return null;
    }

    // Extract job title
    const titleSelectors = [
      '.job-details-jobs-unified-top-card__job-title',
      '.jobs-unified-top-card__job-title',
      '.t-24.t-bold',
      'h1.job-title'
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
      '.job-details-jobs-unified-top-card__company-name',
      '.jobs-unified-top-card__company-name',
      '.jobs-unified-top-card__subtitle-primary-grouping a',
      'a.topcard__org-name-link'
    ];

    let company = null;
    for (const selector of companySelectors) {
      const elem = document.querySelector(selector);
      if (elem) {
        company = elem.textContent.trim();
        break;
      }
    }

    // Extract full job description for analysis
    const descriptionElem = document.querySelector('.jobs-description__content, .jobs-box__html-content, #job-details');
    const description = descriptionElem ? descriptionElem.textContent.trim() : '';

    return {
      url,
      title,
      company,
      description,
      platform: 'linkedin'
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
  /apex|insight|cybercoders|kforce|modis|judge/i,
  /\b(consulting|staffing|recruiting|talent|workforce)\b/i
];

function isStaffingFirm(jobCard) {
  try {
    const companyElem = jobCard.querySelector('.base-search-card__subtitle, .job-card-container__company-name');
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
    // Check for promoted badge
    const promotedBadge = jobCard.querySelector('[data-is-promoted="true"], .job-card-container__footer-job-type');
    if (promotedBadge && promotedBadge.textContent.toLowerCase().includes('promoted')) {
      return true;
    }

    // Check for sponsored label
    const sponsoredLabel = jobCard.querySelector('.job-card-container__footer-item');
    if (sponsoredLabel && sponsoredLabel.textContent.toLowerCase().includes('promoted')) {
      return true;
    }

    return false;
  } catch (error) {
    return false;
  }
}

// ===== APPLICANT COUNT EXTRACTION =====
function getApplicantCount(jobCard) {
  try {
    const applicantSelectors = [
      '.job-card-container__applicant-count',
      '.jobs-unified-top-card__applicant-count',
      '[data-test-applicant-count]'
    ];

    for (const selector of applicantSelectors) {
      const elem = jobCard.querySelector(selector);
      if (elem) {
        const text = elem.textContent.trim();
        // Extract number from text like "Be among the first 25 applicants" or "100+ applicants"
        const match = text.match(/(\d+)\+?/);
        if (match) {
          return parseInt(match[1]);
        }
      }
    }

    return null;
  } catch (error) {
    return null;
  }
}

// ===== ENTRY LEVEL ACCURACY CHECK =====
function checkEntryLevelAccuracy(jobCard) {
  try {
    // Check if job is labeled as entry level
    const seniorityElem = jobCard.querySelector('.job-card-container__footer-item, .job-details-jobs-unified-top-card__job-insight');
    if (!seniorityElem || !seniorityElem.textContent.toLowerCase().includes('entry level')) {
      return null;
    }

    // Check description for experience requirements
    const descriptionElem = jobCard.querySelector('.jobs-description__content');
    if (!descriptionElem) return null;

    const description = descriptionElem.textContent.toLowerCase();

    // Look for experience requirements
    const experiencePatterns = [
      /(\d+)\+?\s*years?\s+(?:of\s+)?experience/gi,
      /minimum\s+(?:of\s+)?(\d+)\s+years?/gi,
      /(\d+)\s+years?\s+(?:minimum|required)/gi
    ];

    for (const pattern of experiencePatterns) {
      const matches = description.matchAll(pattern);
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
    const timeElem = jobCard.querySelector('time, .job-card-container__listed-time');
    if (!timeElem) return null;

    const datetime = timeElem.getAttribute('datetime');
    if (datetime) {
      const postDate = new Date(datetime);
      const now = new Date();
      const daysAgo = Math.floor((now - postDate) / (1000 * 60 * 60 * 24));
      return daysAgo;
    }

    // Fallback: parse text like "2 weeks ago"
    const text = timeElem.textContent.trim().toLowerCase();
    if (text.includes('hour')) return 0;
    if (text.includes('day')) {
      const match = text.match(/(\d+)/);
      return match ? parseInt(match[1]) : 1;
    }
    if (text.includes('week')) {
      const match = text.match(/(\d+)/);
      return match ? parseInt(match[1]) * 7 : 7;
    }
    if (text.includes('month')) {
      const match = text.match(/(\d+)/);
      return match ? parseInt(match[1]) * 30 : 30;
    }

    return null;
  } catch (error) {
    return null;
  }
}

// ===== EASY APPLY DETECTION =====
function hasEasyApply(jobCard) {
  try {
    const easyApplyButton = document.querySelector('.jobs-apply-button--top-card, [data-job-posting-id] .jobs-apply-button');
    return easyApplyButton && easyApplyButton.textContent.toLowerCase().includes('easy apply');
  } catch (error) {
    return false;
  }
}

// ===== VISA SPONSORSHIP DETECTION =====
function hasVisaSponsorship(jobCard) {
  try {
    const descriptionElem = document.querySelector('.jobs-description__content');
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

  const jobCards = document.querySelectorAll('.jobs-search__results-list > li, .scaffold-layout__list-item');

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
        addBadgeToJob(jobCard, `Posted ${jobAge} days ago`, jobAge > 60 ? 'danger' : 'warning');
      }
    }

    // Filter 10: Easy Apply Only
    if (settings.easyApplyOnly && !hasEasyApply(jobCard)) {
      shouldHide = true;
      reasons.push('Not Easy Apply');
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

  console.log(`JobFiltr: Filtered ${hiddenJobsCount} jobs`);
}

// ===== BADGE ADDITION =====
function addBadgeToJob(jobCard, message, type = 'warning') {
  // Remove existing badge if any
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
  const jobCards = document.querySelectorAll('.jobs-search__results-list > li, .scaffold-layout__list-item');

  jobCards.forEach(jobCard => {
    jobCard.style.display = '';
    delete jobCard.dataset.jobfiltrHidden;
    delete jobCard.dataset.jobfiltrReasons;

    // Remove badges
    const badges = jobCard.querySelectorAll('.jobfiltr-badge');
    badges.forEach(badge => badge.remove());
  });

  hiddenJobsCount = 0;

  chrome.runtime.sendMessage({
    type: 'FILTER_STATS_UPDATE',
    hiddenCount: 0
  });

  console.log('JobFiltr: Filters reset');
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

  return true; // Keep channel open for async response
});

// ===== MUTATION OBSERVER FOR DYNAMIC CONTENT =====
const observer = new MutationObserver((mutations) => {
  if (Object.keys(filterSettings).length > 0) {
    // Re-apply filters when new jobs are loaded
    requestAnimationFrame(() => {
      applyFilters(filterSettings);
    });
  }
});

// Observe the jobs list for changes
const jobsList = document.querySelector('.jobs-search__results-list, .scaffold-layout__list');
if (jobsList) {
  observer.observe(jobsList, {
    childList: true,
    subtree: true
  });
}

console.log('JobFiltr: LinkedIn content script ready');
