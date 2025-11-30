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

    // Extract description
    const descriptionElem = document.querySelector('.HBvzbc, .WbZuDe');
    const description = descriptionElem ? descriptionElem.textContent.trim() : '';

    return {
      url,
      title,
      company,
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

// ===== ENTRY LEVEL ACCURACY CHECK =====
function checkEntryLevelAccuracy(jobCard) {
  try {
    const descriptionElem = jobCard.querySelector('.HBvzbc');
    if (!descriptionElem) return null;

    const description = descriptionElem.textContent.toLowerCase();

    const isEntryLevel = description.includes('entry level') || description.includes('entry-level');
    if (!isEntryLevel) return null;

    // Check for experience requirements
    const experiencePatterns = [
      /(\d+)\+?\s*years?\s+(?:of\s+)?experience/gi,
      /minimum\s+(?:of\s+)?(\d+)\s+years?/gi
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
function hasVisaSponsorship(jobCard) {
  try {
    const descriptionElem = jobCard.querySelector('.HBvzbc');
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
