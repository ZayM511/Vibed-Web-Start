// JobFiltr - LinkedIn Content Script V3
// Updated with 2025 DOM selectors and improved detection

console.log('JobFiltr V3: LinkedIn content script loaded');

let filterSettings = {};
let hiddenJobsCount = 0;

// ===== IMPROVED LOGGING =====
function log(message, data = null) {
  const timestamp = new Date().toISOString();
  if (data) {
    console.log(`[JobFiltr ${timestamp}] ${message}`, data);
  } else {
    console.log(`[JobFiltr ${timestamp}] ${message}`);
  }
}

// ===== JOB INFORMATION EXTRACTION (UPDATED 2025) =====
function extractJobInfo() {
  try {
    const url = window.location.href;
    log('Extracting job info from URL:', url);

    // Check if we're on a job posting page
    if (!url.includes('/jobs/')) {
      log('Not on a jobs page');
      return null;
    }

    // Updated selectors for 2025 LinkedIn - ordered by likelihood
    const titleSelectors = [
      'h1.job-details-jobs-unified-top-card__job-title',
      'h1.jobs-unified-top-card__job-title',
      '.job-details-jobs-unified-top-card__job-title h1',
      '.jobs-unified-top-card__job-title h1',
      'h1.t-24.t-bold',
      'h2.t-24.t-bold',
      '.job-details-jobs-unified-top-card__job-title',
      '.jobs-unified-top-card__job-title',
      '[data-job-title]',
      '.jobs-unified-top-card__job-title-link',
      'h1[class*="job-title"]',
      'h2[class*="job-title"]'
    ];

    let title = null;
    for (const selector of titleSelectors) {
      const elem = document.querySelector(selector);
      if (elem) {
        // Get text content, handling nested elements
        title = elem.textContent.trim();
        // Remove extra whitespace and newlines
        title = title.replace(/\s+/g, ' ').trim();
        log(`Found title using selector: ${selector}`, title);
        break;
      }
    }

    if (!title) {
      log('Title not found, trying alternative methods');
      // Try to find any heading with job title patterns
      const headings = document.querySelectorAll('h1, h2, h3');
      for (const heading of headings) {
        const text = heading.textContent.trim();
        if (text.length > 5 && text.length < 200) {
          title = text;
          log('Found title via heading search:', title);
          break;
        }
      }
    }

    // Extract company name with updated selectors
    const companySelectors = [
      '.job-details-jobs-unified-top-card__company-name',
      '.jobs-unified-top-card__company-name',
      'a.job-details-jobs-unified-top-card__company-name',
      'a.jobs-unified-top-card__company-name',
      '.jobs-unified-top-card__subtitle-primary-grouping a',
      '[data-company-name]',
      'a.app-aware-link[href*="/company/"]'
    ];

    let company = null;
    for (const selector of companySelectors) {
      const elem = document.querySelector(selector);
      if (elem) {
        company = elem.textContent.trim();
        log(`Found company using selector: ${selector}`, company);
        break;
      }
    }

    // Extract full job description for analysis
    const descriptionSelectors = [
      '.jobs-description__content',
      '.jobs-box__html-content',
      '#job-details',
      '.jobs-description-content__text',
      'article.jobs-description'
    ];

    let description = '';
    for (const selector of descriptionSelectors) {
      const elem = document.querySelector(selector);
      if (elem) {
        description = elem.textContent.trim();
        log(`Found description using selector: ${selector}, length: ${description.length}`);
        break;
      }
    }

    const jobInfo = {
      url,
      title,
      company,
      description,
      platform: 'linkedin'
    };

    log('Extracted job info:', jobInfo);
    return jobInfo;
  } catch (error) {
    console.error('JobFiltr: Error extracting job info:', error);
    return null;
  }
}

// ===== STAFFING FIRM DETECTION (EXPANDED) =====
const staffingIndicators = [
  /staffing|recruiting|talent|solutions|workforce/i,
  /\b(tek|pro|consulting|systems|global|services)\b/i,
  /robert\s*half|randstad|adecco|manpower|kelly\s*services/i,
  /apex|insight|cybercoders|kforce|modis|judge/i,
  /\b(consulting|staffing|recruiting|talent|workforce)\b/i,
  /teksystems|tek\s*systems/i,
  /insight\s*global/i,
  /aerotek|allegis/i
];

function isStaffingFirm(jobCard) {
  try {
    // Multiple selector strategies for company name
    const companySelectors = [
      '.base-search-card__subtitle',
      '.job-card-container__company-name',
      '.artdeco-entity-lockup__subtitle',
      'a[href*="/company/"]',
      '.job-card-list__entity-lockup .artdeco-entity-lockup__subtitle'
    ];

    let companyName = '';
    for (const selector of companySelectors) {
      const elem = jobCard.querySelector(selector);
      if (elem) {
        companyName = elem.textContent.trim().toLowerCase();
        break;
      }
    }

    if (!companyName) return false;

    const isStaffing = staffingIndicators.some(pattern => pattern.test(companyName));
    if (isStaffing) {
      log('Detected staffing firm:', companyName);
    }
    return isStaffing;
  } catch (error) {
    return false;
  }
}

// ===== SPONSORED POST DETECTION (UPDATED) =====
function isSponsored(jobCard) {
  try {
    // Check for promoted/sponsored indicators
    const sponsoredSelectors = [
      '[data-is-promoted="true"]',
      '.job-card-container__footer-job-type',
      '.job-card-container__footer-item',
      'li-icon[type="external-link-icon"]',
      '.job-card-container__footer-wrapper .job-card-container__footer-item:first-child'
    ];

    for (const selector of sponsoredSelectors) {
      const elem = jobCard.querySelector(selector);
      if (elem) {
        const text = elem.textContent.toLowerCase();
        if (text.includes('promoted') || text.includes('sponsored')) {
          log('Detected sponsored job');
          return true;
        }
      }
    }

    return false;
  } catch (error) {
    return false;
  }
}

// ===== APPLICANT COUNT EXTRACTION (IMPROVED) =====
function getApplicantCount(jobCard) {
  try {
    const applicantSelectors = [
      '.job-card-container__applicant-count',
      '.jobs-unified-top-card__applicant-count',
      '[data-test-applicant-count]',
      '.job-card-container__footer-item'
    ];

    for (const selector of applicantSelectors) {
      const elem = jobCard.querySelector(selector);
      if (elem) {
        const text = elem.textContent.trim();
        // Extract number from various formats
        const patterns = [
          /(\d+)\+?\s*applicants?/i,
          /be among the first (\d+)/i,
          /over (\d+)\s*applicants?/i
        ];

        for (const pattern of patterns) {
          const match = text.match(pattern);
          if (match) {
            const count = parseInt(match[1]);
            log(`Found applicant count: ${count}`);
            return count;
          }
        }
      }
    }

    return null;
  } catch (error) {
    return null;
  }
}

// ===== JOB AGE DETECTION (COMPREHENSIVE) =====
function getJobAge(jobCard) {
  try {
    // Multiple selectors for time elements
    const timeSelectors = [
      'time',
      '.job-card-container__listed-time',
      '.job-card-list__date',
      '.jobs-unified-top-card__posted-date',
      '[data-job-posted-date]',
      '.artdeco-entity-lockup__caption'
    ];

    let timeElem = null;
    for (const selector of timeSelectors) {
      timeElem = jobCard.querySelector(selector);
      if (timeElem) break;
    }

    if (!timeElem) return null;

    // Try datetime attribute first (most accurate)
    const datetime = timeElem.getAttribute('datetime');
    if (datetime) {
      const postDate = new Date(datetime);
      const now = new Date();
      const diffMs = now - postDate;
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      log(`Job age from datetime: ${diffDays} days, ${diffHours % 24} hours, ${diffMinutes % 60} minutes`);

      return {
        minutes: diffMinutes,
        hours: diffHours,
        days: diffDays,
        formatted: formatJobAge(diffMinutes, diffHours, diffDays)
      };
    }

    // Fallback: parse text like "2 weeks ago", "3 days ago", "5 hours ago"
    const text = timeElem.textContent.trim().toLowerCase();
    log(`Parsing job age from text: "${text}"`);

    // Minutes
    if (text.includes('minute')) {
      const match = text.match(/(\d+)\s*minute/);
      const minutes = match ? parseInt(match[1]) : 1;
      return {
        minutes,
        hours: 0,
        days: 0,
        formatted: `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`
      };
    }

    // Hours
    if (text.includes('hour')) {
      const match = text.match(/(\d+)\s*hour/);
      const hours = match ? parseInt(match[1]) : 1;
      return {
        minutes: hours * 60,
        hours,
        days: 0,
        formatted: `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`
      };
    }

    // Days
    if (text.includes('day')) {
      const match = text.match(/(\d+)\s*day/);
      const days = match ? parseInt(match[1]) : 1;
      return {
        minutes: days * 1440,
        hours: days * 24,
        days,
        formatted: `${days} ${days === 1 ? 'day' : 'days'} ago`
      };
    }

    // Weeks
    if (text.includes('week')) {
      const match = text.match(/(\d+)\s*week/);
      const weeks = match ? parseInt(match[1]) : 1;
      const days = weeks * 7;
      return {
        minutes: days * 1440,
        hours: days * 24,
        days,
        formatted: `${days} days ago`
      };
    }

    // Months
    if (text.includes('month')) {
      const match = text.match(/(\d+)\s*month/);
      const months = match ? parseInt(match[1]) : 1;
      const days = months * 30;
      return {
        minutes: days * 1440,
        hours: days * 24,
        days,
        formatted: `${days}+ days ago`
      };
    }

    return null;
  } catch (error) {
    log('Error getting job age:', error);
    return null;
  }
}

// ===== FORMAT JOB AGE =====
function formatJobAge(minutes, hours, days) {
  if (days >= 1) {
    return `${days} ${days === 1 ? 'day' : 'days'} ago`;
  } else if (hours >= 1) {
    return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  } else {
    return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
  }
}

// ===== ADD BADGE TO JOB CARD =====
function addBadgeToJob(jobCard, message, type = 'info') {
  try {
    // Remove existing JobFiltr badge if any
    const existingBadge = jobCard.querySelector('.jobfiltr-badge');
    if (existingBadge) {
      existingBadge.remove();
    }

    const badge = document.createElement('div');
    badge.className = `jobfiltr-badge jobfiltr-badge-${type}`;
    badge.textContent = message;

    // Color based on type
    let bgColor = '#3b82f6'; // blue for info
    if (type === 'warning') bgColor = '#f59e0b'; // orange
    if (type === 'danger') bgColor = '#ef4444'; // red
    if (type === 'success') bgColor = '#10b981'; // green

    badge.style.cssText = `
      position: absolute;
      top: 8px;
      right: 8px;
      background: ${bgColor};
      color: white;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 600;
      z-index: 1000;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      backdrop-filter: blur(4px);
      pointer-events: none;
    `;

    // Ensure parent has position relative
    if (window.getComputedStyle(jobCard).position === 'static') {
      jobCard.style.position = 'relative';
    }

    jobCard.appendChild(badge);
    log(`Added ${type} badge: ${message}`);
  } catch (error) {
    log('Error adding badge:', error);
  }
}

// ===== FILTER APPLICATION WITH IMPROVED SELECTORS =====
function applyFilters(settings) {
  filterSettings = settings;
  hiddenJobsCount = 0;

  log('Applying filters with settings:', settings);

  // Updated job card selectors for 2025
  const jobCardSelectors = [
    '.jobs-search__results-list > li',
    '.scaffold-layout__list-item',
    'li.jobs-search-results__list-item',
    'div.job-card-container',
    'div[data-job-id]',
    'li[data-occludable-job-id]'
  ];

  let jobCards = [];
  for (const selector of jobCardSelectors) {
    jobCards = document.querySelectorAll(selector);
    if (jobCards.length > 0) {
      log(`Found ${jobCards.length} job cards using selector: ${selector}`);
      break;
    }
  }

  if (jobCards.length === 0) {
    log('No job cards found with any selector');
    return;
  }

  jobCards.forEach((jobCard, index) => {
    let shouldHide = false;
    const reasons = [];

    // Remove any existing badges first (for clean re-application)
    const existingBadge = jobCard.querySelector('.jobfiltr-badge');
    if (existingBadge) {
      existingBadge.remove();
    }

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

    // Filter: Job Age Display (ALWAYS DISPLAY WHEN ENABLED - DON'T HIDE)
    if (settings.showJobAge && !shouldHide) {
      const jobAge = getJobAge(jobCard);
      if (jobAge) {
        // Determine badge type based on age
        let badgeType = 'info';
        if (jobAge.days > 30) {
          badgeType = 'danger'; // Red for old jobs
        } else if (jobAge.days > 14) {
          badgeType = 'warning'; // Orange for 2+ weeks
        } else if (jobAge.days < 1 && jobAge.hours < 24) {
          badgeType = 'success'; // Green for fresh jobs
        }

        // Add badge to show age
        addBadgeToJob(jobCard, `Posted ${jobAge.formatted}`, badgeType);
      }
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
  try {
    chrome.runtime.sendMessage({
      type: 'FILTER_STATS_UPDATE',
      hiddenCount: hiddenJobsCount
    });
  } catch (error) {
    log('Failed to send stats update:', error);
  }

  log(`Filtered ${hiddenJobsCount} jobs out of ${jobCards.length}`);
}

// ===== RESET FILTERS =====
function resetFilters() {
  const jobCardSelectors = [
    '.jobs-search__results-list > li',
    '.scaffold-layout__list-item',
    'li.jobs-search-results__list-item',
    'div.job-card-container',
    'div[data-job-id]',
    'li[data-occludable-job-id]'
  ];

  let jobCards = [];
  for (const selector of jobCardSelectors) {
    jobCards = document.querySelectorAll(selector);
    if (jobCards.length > 0) break;
  }

  jobCards.forEach(jobCard => {
    jobCard.style.display = '';
    delete jobCard.dataset.jobfiltrHidden;
    delete jobCard.dataset.jobfiltrReasons;

    const badges = jobCard.querySelectorAll('.jobfiltr-badge');
    badges.forEach(badge => badge.remove());
  });

  hiddenJobsCount = 0;

  try {
    chrome.runtime.sendMessage({
      type: 'FILTER_STATS_UPDATE',
      hiddenCount: 0
    });
  } catch (error) {
    log('Failed to send reset update:', error);
  }

  log('Filters reset');
}

// ===== MESSAGE LISTENER =====
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  log('Received message:', message);

  if (message.type === 'EXTRACT_JOB_INFO') {
    const jobInfo = extractJobInfo();
    sendResponse({ success: !!jobInfo, data: jobInfo });
    return true;
  }

  if (message.type === 'APPLY_FILTERS') {
    applyFilters(message.settings);
    sendResponse({ success: true });
    return true;
  }

  if (message.type === 'RESET_FILTERS') {
    resetFilters();
    sendResponse({ success: true });
    return true;
  }

  return false;
});

// ===== MUTATION OBSERVER FOR DYNAMIC CONTENT =====
let observerTimeout;
const observer = new MutationObserver((mutations) => {
  if (Object.keys(filterSettings).length > 0) {
    // Debounce re-application
    clearTimeout(observerTimeout);
    observerTimeout = setTimeout(() => {
      log('Re-applying filters due to DOM changes');
      applyFilters(filterSettings);
    }, 500);
  }
});

// Observe multiple possible containers
const possibleContainers = [
  '.jobs-search__results-list',
  '.scaffold-layout__list',
  '.jobs-search-results-list',
  'main.scaffold-layout__main'
];

let observerStarted = false;
for (const selector of possibleContainers) {
  const container = document.querySelector(selector);
  if (container && !observerStarted) {
    log(`Starting mutation observer on: ${selector}`);
    observer.observe(container, {
      childList: true,
      subtree: true
    });
    observerStarted = true;
    break;
  }
}

// If no container found initially, try again after page load
if (!observerStarted) {
  window.addEventListener('load', () => {
    for (const selector of possibleContainers) {
      const container = document.querySelector(selector);
      if (container && !observerStarted) {
        log(`Starting mutation observer on (after load): ${selector}`);
        observer.observe(container, {
          childList: true,
          subtree: true
        });
        observerStarted = true;
        break;
      }
    }
  });
}

log('LinkedIn content script ready');
