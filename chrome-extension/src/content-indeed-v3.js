// JobFiltr - Indeed Content Script V3
// Updated with 2025 DOM selectors and improved detection

console.log('JobFiltr V3: Indeed content script loaded');

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
    if (!url.includes('/viewjob') && !url.includes('/rc/clk') && !url.includes('/pagead/')) {
      log('Not on a job posting page');
      return null;
    }

    // Updated selectors for 2025 Indeed - confirmed working order
    const titleSelectors = [
      'h2.jobTitle > span',           // Primary selector from Indeed docs
      'h2.jobTitle span',             // Alternative without child combinator
      'h1.jobsearch-JobInfoHeader-title span',
      'h1.jobsearch-JobInfoHeader-title',
      '[data-testid="jobsearch-JobInfoHeader-title"] span',
      '[data-testid="jobsearch-JobInfoHeader-title"]',
      'h1.jobTitle span',
      'h1.jobTitle',
      'h2.jobTitle',
      'h1[class*="jobTitle"]',
      'h2[class*="jobTitle"]',
      '.jobsearch-JobInfoHeader-title-container h1 span',
      '.jobsearch-JobInfoHeader-title-container h1',
      '.jobsearch-JobInfoHeader-title'
    ];

    let title = null;
    for (const selector of titleSelectors) {
      const elem = document.querySelector(selector);
      if (elem) {
        // Get text content and clean it up
        title = elem.textContent.trim();
        // Remove extra whitespace and newlines
        title = title.replace(/\s+/g, ' ').trim();
        log(`Found title using selector: ${selector}`, title);
        break;
      }
    }

    // Extract company name with updated selectors
    const companySelectors = [
      '[data-testid="inlineHeader-companyName"]',
      '[data-company-name="true"]',
      '.jobsearch-InlineCompanyRating-companyHeader a',
      '.jobsearch-CompanyInfoContainer a',
      '[data-testid="company-name"]',
      'div[data-testid="inlineHeader-companyName"] a',
      '.css-1cjgvjm'
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

    // Extract full job description
    const descriptionSelectors = [
      '#jobDescriptionText',
      '.jobsearch-jobDescriptionText',
      '[data-testid="jobDescriptionText"]',
      '#job-description',
      'div[id*="jobDescriptionText"]'
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
      platform: 'indeed'
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
  /teksystems|tek\s*systems/i,
  /insight\s*global/i,
  /aerotek|allegis/i
];

function isStaffingFirm(jobCard) {
  try {
    const companySelectors = [
      '[data-testid="company-name"]',
      '.companyName',
      '.company',
      'span[data-testid="company-name"]',
      '.css-1cjgvjm'
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
    // Indeed marks sponsored posts with specific attributes and classes
    const sponsoredIndicators = [
      jobCard.hasAttribute('data-is-sponsored'),
      jobCard.querySelector('[data-testid="sponsored-label"]'),
      jobCard.querySelector('.sponsoredJob'),
      jobCard.querySelector('.sponsoredGray'),
      jobCard.querySelector('span:contains("Sponsored")'),
      jobCard.classList.contains('sponsoredJob')
    ];

    const isSponsored = sponsoredIndicators.some(indicator => indicator);

    if (isSponsored) {
      log('Detected sponsored job');
    }

    return isSponsored;
  } catch (error) {
    return false;
  }
}

// ===== APPLICANT COUNT EXTRACTION (IMPROVED) =====
function getApplicantCount(jobCard) {
  try {
    const applicantSelectors = [
      '[data-testid="applicant-count"]',
      '.jobCardShelfContainer',
      '.job-snippet',
      'div[class*="applicant"]'
    ];

    for (const selector of applicantSelectors) {
      const elem = jobCard.querySelector(selector);
      if (elem) {
        const text = elem.textContent.trim().toLowerCase();

        // Check for "Be among the first" which indicates < 10
        if (text.includes('be among the first') || text.includes('be one of the first')) {
          log('Found low applicant count indicator');
          return 5; // Estimate
        }

        // Extract explicit numbers
        const match = text.match(/(\d+)\+?\s*applicants?/i);
        if (match) {
          const count = parseInt(match[1]);
          log(`Found applicant count: ${count}`);
          return count;
        }
      }
    }

    return null;
  } catch (error) {
    return null;
  }
}

// ===== KEYWORD FILTERING =====
function getJobCardText(jobCard) {
  // Get title
  const titleSelectors = [
    '[data-testid="job-title"]',
    '.jobTitle',
    'h2.jobTitle span',
    'a[data-jk] span[title]'
  ];

  let title = '';
  for (const selector of titleSelectors) {
    const elem = jobCard.querySelector(selector);
    if (elem) {
      title = elem.textContent.trim().toLowerCase();
      break;
    }
  }

  // Get company
  const companySelectors = [
    '[data-testid="company-name"]',
    '.companyName',
    '.company'
  ];

  let company = '';
  for (const selector of companySelectors) {
    const elem = jobCard.querySelector(selector);
    if (elem) {
      company = elem.textContent.trim().toLowerCase();
      break;
    }
  }

  // Get snippet/description if available
  const snippetElem = jobCard.querySelector('.job-snippet, .jobCardShelfContainer');
  const snippet = snippetElem ? snippetElem.textContent.trim().toLowerCase() : '';

  return `${title} ${company} ${snippet}`;
}

function matchesIncludeKeywords(jobCard, keywords) {
  if (!keywords || keywords.length === 0) return true;

  const text = getJobCardText(jobCard);
  return keywords.some(keyword => text.includes(keyword.toLowerCase()));
}

function matchesExcludeKeywords(jobCard, keywords) {
  if (!keywords || keywords.length === 0) return false;

  const text = getJobCardText(jobCard);
  return keywords.some(keyword => text.includes(keyword.toLowerCase()));
}

// ===== FILTER APPLICATION WITH IMPROVED SELECTORS =====
function applyFilters(settings) {
  filterSettings = settings;
  hiddenJobsCount = 0;

  log('Applying filters with settings:', settings);

  // Updated job card selectors for 2025 Indeed
  const jobCardSelectors = [
    '.jobsearch-ResultsList > li',
    '.job_seen_beacon',
    '[data-testid="job-result"]',
    'li[data-jk]',
    'div.job_seen_beacon',
    'div[data-testid="jobsearch-result"]',
    'a[data-jk]',
    'ul.jobsearch-ResultsList li'
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

    // Filter: Include Keywords (must contain at least one)
    if (settings.filterIncludeKeywords && settings.includeKeywords && settings.includeKeywords.length > 0) {
      if (!matchesIncludeKeywords(jobCard, settings.includeKeywords)) {
        shouldHide = true;
        reasons.push('Missing required keywords');
      }
    }

    // Filter: Exclude Keywords (hide if contains any)
    if (settings.filterExcludeKeywords && settings.excludeKeywords && settings.excludeKeywords.length > 0) {
      if (matchesExcludeKeywords(jobCard, settings.excludeKeywords)) {
        shouldHide = true;
        reasons.push('Contains excluded keywords');
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
    '.jobsearch-ResultsList > li',
    '.job_seen_beacon',
    '[data-testid="job-result"]',
    'li[data-jk]',
    'div.job_seen_beacon'
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

  log('Filters reset on Indeed');
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
  '.jobsearch-ResultsList',
  '#mosaic-provider-jobcards',
  'ul[class*="jobsearch-ResultsList"]',
  'div[id*="mosaic"]'
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

log('Indeed content script ready');
