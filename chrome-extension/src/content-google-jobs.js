// JobFiltr - Google Jobs Content Script
// Applies filters and extracts job information from Google Jobs

console.log('JobFiltr: Google Jobs content script loaded');

let filterSettings = {};
let hiddenJobsCount = 0;

// ===== JOB INFORMATION EXTRACTION =====
function extractJobInfo() {
  try {
    const url = window.location.href;

    // Check if we're on Google Jobs
    if (!url.includes('google.com') || !url.includes('jobs')) {
      return null;
    }

    // Extract job title
    const titleElem = document.querySelector('.KLsYvd, h2.i92P5');
    const title = titleElem ? titleElem.textContent.trim() : null;

    // Extract company name
    const companyElem = document.querySelector('.vNEEBe, .nJlQNd');
    const company = companyElem ? companyElem.textContent.trim() : null;

    // Extract location
    const locationElem = document.querySelector('.Qk80Jf, .sMzDkb, .I2Cbhb');
    const location = locationElem ? locationElem.textContent.trim() : null;

    // Extract description
    const descriptionElem = document.querySelector('.HBvzbc, .WbZuDe');
    const description = descriptionElem ? descriptionElem.textContent.trim() : '';

    return {
      url,
      title,
      company,
      location,
      description,
      platform: 'google-jobs'
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
  /robert\s*half|randstad|adecco|manpower|kelly\s*services/i
];

function isStaffingFirm(jobCard) {
  try {
    const companyElem = jobCard.querySelector('.vNEEBe, .nJlQNd');
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
    // Google Jobs typically doesn't show sponsored posts in the same way
    // but we can check for "Ad" or "Sponsored" labels
    const adLabel = jobCard.querySelector('.zHQkBf');
    return adLabel && adLabel.textContent.toLowerCase().includes('ad');
  } catch (error) {
    return false;
  }
}

// ===== JOB AGE DETECTION =====
function getJobAge(jobCard) {
  try {
    const dateElem = jobCard.querySelector('.LL4CDc, .KKh3md');
    if (!dateElem) return null;

    const text = dateElem.textContent.trim().toLowerCase();

    if (text.includes('hour')) return 0;
    if (text.includes('day')) {
      const match = text.match(/(\d+)/);
      return match ? parseInt(match[1]) : 1;
    }
    if (text.includes('week')) {
      const match = text.match(/(\d+)/);
      return match ? parseInt(match[1]) * 7 : 7;
    }
    if (text.includes('30+')) return 30;

    return null;
  } catch (error) {
    return null;
  }
}

// ===== VISA SPONSORSHIP DETECTION =====
// Comprehensive pattern matching with negative-first priority

// Negative patterns - job does NOT offer sponsorship (check FIRST)
const VISA_NEGATIVE_PATTERNS = [
  /\b(not|no|cannot|can't|won't|will\s+not|unable\s+to|do\s+not|does\s+not)\s+(provide\s+)?(sponsor|sponsorship)/i,
  /sponsor(ship)?\s+(is\s+)?(not|unavailable)/i,
  /without\s+sponsor/i,
  /\bno\s+visa\s+(support|sponsorship|assistance)/i,
  /must\s+(be|have|already\s+be)\s+(legally\s+)?(authorized|eligible)/i,
  /must\s+have\s+(valid\s+)?(work\s+)?(authorization|permit|visa)/i,
  /authorized\s+to\s+work.*without\s+sponsor/i,
  /not\s+eligible\s+for\s+sponsor/i,
  /sponsorship\s+(is\s+)?not\s+(available|offered|provided)/i
];

// Positive patterns - job OFFERS sponsorship
const VISA_POSITIVE_PATTERNS = [
  // Direct sponsorship mentions
  /\b(will|can|may|able\s+to)\s+(provide\s+)?sponsor/i,
  /visa\s+sponsor(ship)?(\s+available|\s+provided|\s+offered)?/i,
  /sponsor(s|ing|ed)?\s+(visa|work\s+authorization)/i,
  /willing\s+to\s+sponsor/i,
  /sponsorship\s+(is\s+)?(available|provided|offered)/i,
  /open\s+to\s+sponsor/i,

  // Specific visa types (presence indicates sponsorship possible)
  /\bh-?1b\b/i,
  /\bh-?2b\b/i,
  /\bo-?1\b/i,
  /\btn\s+visa\b/i,
  /\bl-?1\b/i,
  /\be-?2\b/i,
  /\beb-?[123]\b/i,
  /\bperm\s+(sponsorship|process|filing)/i,
  /green\s+card\s+sponsor/i,

  // Work authorization support
  /work\s+authorization\s+sponsor/i,
  /immigration\s+sponsor/i,
  /sponsor.*work\s+(permit|authorization|visa)/i
];

/**
 * Check if job description text offers visa sponsorship
 * Uses negative-first priority to avoid false positives
 * @param {string} text - Job description text
 * @returns {boolean} - True if job offers sponsorship
 */
function hasVisaSponsorshipText(text) {
  if (!text || typeof text !== 'string') return false;

  const normalized = text.toLowerCase();

  // Check NEGATIVE patterns FIRST - they override positive matches
  for (const pattern of VISA_NEGATIVE_PATTERNS) {
    if (pattern.test(normalized)) {
      return false;  // Explicitly says NO sponsorship
    }
  }

  // Check POSITIVE patterns
  for (const pattern of VISA_POSITIVE_PATTERNS) {
    if (pattern.test(normalized)) {
      return true;  // Mentions sponsorship positively
    }
  }

  return false;  // No mention of sponsorship
}

function hasVisaSponsorship(jobCard) {
  try {
    // Try multiple selectors for job description
    const descriptionSelectors = [
      '.HBvzbc',
      '.WbZuDe',
      '.YgLbBe',
      '[data-share-url] .HBvzbc'
    ];

    let description = '';
    for (const selector of descriptionSelectors) {
      const elem = jobCard.querySelector(selector) || document.querySelector(selector);
      if (elem) {
        description = elem.textContent || '';
        break;
      }
    }

    if (!description) return false;

    return hasVisaSponsorshipText(description);
  } catch (error) {
    console.error('JobFiltr: Error checking visa sponsorship:', error);
    return false;
  }
}

// ===== FILTER APPLICATION =====
function applyFilters(settings) {
  filterSettings = settings;
  hiddenJobsCount = 0;

  const jobCards = document.querySelectorAll('.PwjeAc, .gws-plugins-horizon-jobs__li-ed');

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

    // Filter 4: Job Age Display
    if (settings.showJobAge) {
      const jobAge = getJobAge(jobCard);
      if (jobAge !== null && jobAge > 30) {
        addBadgeToJob(jobCard, `Posted ${jobAge}+ days ago`, 'warning');
      }
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

  // Send stats update
  chrome.runtime.sendMessage({
    type: 'FILTER_STATS_UPDATE',
    hiddenCount: hiddenJobsCount
  });

  console.log(`JobFiltr: Filtered ${hiddenJobsCount} jobs on Google Jobs`);
}

// ===== BADGE ADDITION =====
function addBadgeToJob(jobCard, message, type = 'warning') {
  const existingBadge = jobCard.querySelector('.jobfiltr-badge');
  if (existingBadge) existingBadge.remove();

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
  const jobCards = document.querySelectorAll('.PwjeAc, .gws-plugins-horizon-jobs__li-ed');

  jobCards.forEach(jobCard => {
    jobCard.style.display = '';
    delete jobCard.dataset.jobfiltrHidden;
    const badges = jobCard.querySelectorAll('.jobfiltr-badge');
    badges.forEach(badge => badge.remove());
  });

  hiddenJobsCount = 0;
  chrome.runtime.sendMessage({ type: 'FILTER_STATS_UPDATE', hiddenCount: 0 });
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

// ===== MUTATION OBSERVER =====
const observer = new MutationObserver(() => {
  if (Object.keys(filterSettings).length > 0) {
    requestAnimationFrame(() => applyFilters(filterSettings));
  }
});

const jobsList = document.querySelector('.zxU94d');
if (jobsList) {
  observer.observe(jobsList, { childList: true, subtree: true });
}

console.log('JobFiltr: Google Jobs content script ready');
