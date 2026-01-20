// JobFiltr - LinkedIn Content Script V3 (Rewritten)
// Architecture: Follows Indeed V3 patterns with robust infrastructure integration
// Target: ~2,000 lines with single source of truth for selectors
// Integrates: badge-manager, job-cache, feature-flags, api-interceptor

'use strict';

console.log('[JobFiltr] LinkedIn content script V3 loading...');

// =============================================================================
// SECTION 1: INITIALIZATION (~150 lines)
// - Flash prevention, state variables, infrastructure waiting
// =============================================================================

let filterSettings = {};
let hiddenJobsCount = 0;
let currentPage = 1;
let lastPageUrl = '';
let isFilteringInProgress = false;
let infrastructureReady = false;
let periodicScanInterval = null;

// Inject flash prevention CSS immediately
(function injectFlashPreventionCSS() {
  const style = document.createElement('style');
  style.id = 'jobfiltr-flash-prevention';
  style.textContent = `
    .jobfiltr-linkedin-filter-active .scaffold-layout__list-item:not([data-jobfiltr-processed]),
    .jobfiltr-linkedin-filter-active .jobs-search-results__list-item:not([data-jobfiltr-processed]),
    .jobfiltr-linkedin-filter-active .job-card-container:not([data-jobfiltr-processed]) {
      opacity: 0 !important;
      transition: opacity 0.2s ease-in-out;
    }
    .jobfiltr-linkedin-filter-active [data-jobfiltr-processed] {
      opacity: 1 !important;
    }
  `;
  (document.head || document.documentElement).appendChild(style);
})();

// Flash Prevention - runs immediately before DOM renders
(async function initFlashPrevention() {
  try {
    const result = await chrome.storage.local.get(['filterSettings']);
    const settings = result.filterSettings || {};
    if (settings.hideStaffing || settings.hideSponsored || settings.filterPostingAge) {
      document.body.classList.add('jobfiltr-linkedin-filter-active');
      log('Flash prevention: Filter active, hiding unprocessed cards');
    }
  } catch (e) {
    // Storage not available yet, will be handled by main init
  }
})();

// Logging utility
function log(message, data = null) {
  const timestamp = new Date().toISOString().split('T')[1].slice(0, 12);
  if (data !== null) {
    console.log(`[JobFiltr ${timestamp}] ${message}`, data);
  } else {
    console.log(`[JobFiltr ${timestamp}] ${message}`);
  }
}

// Extension context validation
function isExtensionContextValid() {
  try {
    return !!(chrome.runtime && chrome.runtime.id);
  } catch (e) {
    return false;
  }
}

// Update flash prevention class
function updateFlashPrevention(isActive) {
  if (isActive) {
    document.body.classList.add('jobfiltr-linkedin-filter-active');
  } else {
    document.body.classList.remove('jobfiltr-linkedin-filter-active');
  }
}

// Wait for infrastructure (badge manager, job cache, feature flags)
async function waitForInfrastructure(maxWaitMs = 5000) {
  const startTime = Date.now();
  const checkInterval = 100;

  while (Date.now() - startTime < maxWaitMs) {
    const badgeReady = window.badgeStateManager?.initialized;
    const cacheReady = window.linkedInJobCache?.initialized;
    const flagsReady = window.linkedInFeatureFlags?.flags;

    if (badgeReady && cacheReady && flagsReady) {
      log('Infrastructure ready:', { badgeReady, cacheReady, flagsReady });
      return true;
    }

    await new Promise(resolve => setTimeout(resolve, checkInterval));
  }

  log('Infrastructure timeout - proceeding with available components');
  return false;
}

// Initialize infrastructure
async function initializeInfrastructure() {
  try {
    // Initialize badge manager
    if (window.badgeStateManager && !window.badgeStateManager.initialized) {
      await window.badgeStateManager.init();
    }

    // Initialize job cache
    if (window.linkedInJobCache && !window.linkedInJobCache.initialized) {
      await window.linkedInJobCache.init();
    }

    // Feature flags auto-initialize, but wait for them
    if (window.linkedInFeatureFlags && !window.linkedInFeatureFlags.flags) {
      await window.linkedInFeatureFlags.init();
    }

    // Inject API interceptor
    injectAPIInterceptor();

    infrastructureReady = true;
    log('Infrastructure initialized successfully');
  } catch (error) {
    log('Infrastructure init error:', error);
    infrastructureReady = true; // Continue anyway
  }
}

// Inject API interceptor into page context
function injectAPIInterceptor() {
  try {
    if (!isExtensionContextValid()) return;

    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('src/linkedin-api-interceptor.js');
    script.onload = () => {
      log('API interceptor injected');

      // Listen for job data events from interceptor
      window.addEventListener('jobfiltr-linkedin-api-data', async (event) => {
        const jobs = event.detail?.jobs;
        if (jobs && Array.isArray(jobs) && jobs.length > 0) {
          await window.linkedInJobCache?.setJobDataBatch(jobs);
          log(`Cached ${jobs.length} jobs from API interceptor`);
        }
      });
    };
    script.onerror = () => log('API interceptor injection failed');
    (document.head || document.documentElement).appendChild(script);
  } catch (e) {
    log('API interceptor injection error:', e);
  }
}

// =============================================================================
// SECTION 2: DOM SELECTORS - SINGLE SOURCE OF TRUTH (~150 lines)
// - All selectors in one place with multiple fallbacks
// =============================================================================

const SELECTORS = {
  // Job card containers
  jobCards: [
    '.scaffold-layout__list-item',
    'li.jobs-search-results__list-item',
    'div.job-card-container',
    'div[data-job-id]',
    'li[data-occludable-job-id]',
    '.job-card-container--visited',
    '.jobs-unified-list li',
    '.jobs-job-card-list__item',
    '.job-card-list li',
    '.jobs-home-recommendations li',
    '.jobs-save-list li'
  ],

  // Job title within card
  cardTitle: [
    '.job-card-list__title',
    '.artdeco-entity-lockup__title',
    '.job-card-container__link',
    'a[data-control-name="job_card_title"]'
  ],

  // Company name within card
  cardCompany: [
    '.job-card-container__company-name',
    '.artdeco-entity-lockup__subtitle',
    '.job-card-list__company-name',
    'a[data-tracking-control-name="public_jobs_topcard-org-name"]'
  ],

  // Job age/time within card
  cardAge: [
    'time[datetime]',
    'time',
    '.job-card-container__listed-time',
    '.job-card-list__footer-wrapper time',
    '.job-card-container__footer-item',
    '.artdeco-entity-lockup__caption',
    '.base-card__metadata time',
    '[class*="listed"]',
    '[class*="posted"]'
  ],

  // Location within card
  cardLocation: [
    '.job-card-container__metadata-item',
    '.artdeco-entity-lockup__caption',
    '.job-card-list__location',
    '.job-card-container__metadata-wrapper'
  ],

  // Job ID extraction
  jobId: [
    '[data-job-id]',
    '[data-occludable-job-id]',
    'a[href*="currentJobId="]',
    'a[href*="/jobs/view/"]'
  ],

  // Detail panel containers
  detailPanel: [
    '.jobs-details__main-content',
    '.jobs-unified-top-card',
    '.job-details-jobs-unified-top-card',
    '.jobs-details-top-card',
    '.job-view-layout'
  ],

  // Detail panel title
  detailTitle: [
    '.jobs-unified-top-card__job-title',
    '.job-details-jobs-unified-top-card__job-title',
    'h1.job-title',
    '.jobs-details-top-card__job-title'
  ],

  // Detail panel company
  detailCompany: [
    '.jobs-unified-top-card__company-name',
    '.job-details-jobs-unified-top-card__company-name',
    'a[href*="/company/"]'
  ],

  // Detail panel age
  detailAge: [
    '.jobs-unified-top-card__posted-date',
    '.job-details-jobs-unified-top-card__posted-date',
    'time[datetime]',
    '[class*="posted-date"]'
  ],

  // Job description
  description: [
    '.jobs-description__content',
    '.jobs-box__html-content',
    '.jobs-description-content__text',
    '#job-details'
  ],

  // Job list containers for observers
  jobListContainers: [
    '.jobs-search__results-list',
    '.scaffold-layout__list',
    '.jobs-search-results-list',
    '.jobs-search-two-pane__results'
  ],

  // Pagination
  pagination: [
    '.artdeco-pagination__indicator--number.active',
    '.jobs-search-pagination__indicator--active',
    'li.artdeco-pagination__indicator--number.selected button'
  ],

  // Badge insertion points (for detail panel)
  badgeInsertionPoints: [
    '.job-details-jobs-unified-top-card__primary-description-container',
    '.jobs-unified-top-card__primary-description',
    '.jobs-details-top-card__content-container',
    '.jobs-details__main-content header'
  ],

  // Promoted/sponsored indicators
  promoted: [
    '.job-card-container__footer-job-state',
    '.promoted-badge',
    '.job-card-container__footer-item--promoted',
    '[data-promoted-badge]'
  ],

  // Applicant count elements
  applicantCount: [
    '.jobs-unified-top-card__applicant-count',
    '.job-details-jobs-unified-top-card__job-insight',
    '.jobs-details-top-card__bullet',
    '.tvm__text--positive'
  ]
};

// =============================================================================
// SECTION 3: JOB DATA EXTRACTION (~300 lines)
// - Multi-layer extraction with graceful fallbacks and auto-disable
// =============================================================================

// Helper: Get first matching element using selector array
function queryWithFallbacks(element, selectorArray) {
  for (const selector of selectorArray) {
    try {
      const result = element.querySelector(selector);
      if (result) return result;
    } catch (e) {
      // Invalid selector, skip
    }
  }
  return null;
}

// Helper: Get all matching elements using selector array
function queryAllWithFallbacks(element, selectorArray) {
  const results = new Set();
  for (const selector of selectorArray) {
    try {
      const elements = element.querySelectorAll(selector);
      elements.forEach(el => results.add(el));
    } catch (e) {
      // Invalid selector, skip
    }
  }
  return Array.from(results);
}

// Extract job ID from card
function extractJobId(jobCard) {
  // Try data attributes first
  const dataJobId = jobCard.getAttribute('data-job-id') ||
                    jobCard.getAttribute('data-occludable-job-id');
  if (dataJobId) return dataJobId;

  // Try link href
  const link = jobCard.querySelector('a[href*="/jobs/view/"], a[href*="currentJobId="]');
  if (link) {
    const href = link.getAttribute('href') || '';
    const viewMatch = href.match(/\/jobs\/view\/(\d+)/);
    if (viewMatch) return viewMatch[1];
    const currentMatch = href.match(/currentJobId=(\d+)/);
    if (currentMatch) return currentMatch[1];
  }

  // Try nested elements
  for (const selector of SELECTORS.jobId) {
    const el = jobCard.querySelector(selector);
    if (el) {
      const id = el.getAttribute('data-job-id') ||
                 el.getAttribute('data-occludable-job-id');
      if (id) return id;
    }
  }

  return null;
}

// Parse age text to days
function parseJobAge(text) {
  if (!text) return null;
  text = text.toLowerCase().trim();

  // Immediate postings
  if (/just now|moment|today|just posted/i.test(text)) return 0;
  if (/yesterday/i.test(text)) return 1;
  if (/\b(hours?|minutes?|seconds?|hr|min|sec)\b/i.test(text)) return 0;

  // Shorthand: 2d, 1w, 3mo
  const shortMatch = text.match(/\b(\d+)(d|w|mo)\b/i);
  if (shortMatch) {
    const num = parseInt(shortMatch[1]);
    const unit = shortMatch[2].toLowerCase();
    if (unit === 'd') return num;
    if (unit === 'w') return num * 7;
    if (unit === 'mo') return num * 30;
  }

  // Time patterns with ago
  const patterns = [
    { regex: /(\d+)\s*(?:days?|d)\s*ago/i, multiplier: 1 },
    { regex: /(\d+)\s*(?:weeks?|wk|w)\s*ago/i, multiplier: 7 },
    { regex: /(\d+)\s*(?:months?|mo)\s*ago/i, multiplier: 30 },
    { regex: /(?:posted|reposted|listed)\s*(\d+)\s*(?:days?|d)/i, multiplier: 1 },
    { regex: /(?:posted|reposted|listed)\s*(\d+)\s*(?:weeks?|wk|w)/i, multiplier: 7 },
    { regex: /(?:posted|reposted|listed)\s*(\d+)\s*(?:months?|mo)/i, multiplier: 30 }
  ];

  for (const { regex, multiplier } of patterns) {
    const match = text.match(regex);
    if (match) {
      const value = parseInt(match[1]) * multiplier;
      if (value >= 0 && value <= 365) return value;
    }
  }

  // Fallback patterns
  if (text.includes('day')) {
    const match = text.match(/(\d+)/);
    if (match) return parseInt(match[1]);
  }
  if (text.includes('week')) {
    const match = text.match(/(\d+)/);
    if (match) return parseInt(match[1]) * 7;
    return 7;
  }
  if (text.includes('month')) {
    const match = text.match(/(\d+)/);
    if (match) return parseInt(match[1]) * 30;
    return 30;
  }

  return null;
}

// Multi-layer job age extraction with feature flag integration
async function getJobAge(jobId, jobCard) {
  const featureName = 'enableJobAgeBadges';

  // Check if feature is enabled
  if (!window.linkedInFeatureFlags?.isEnabled(featureName)) {
    return null;
  }

  // Layer 1: Badge cache (instant, most reliable)
  const cachedBadge = window.badgeStateManager?.getBadgeData(jobId);
  if (cachedBadge?.age !== undefined && cachedBadge.age !== null) {
    await window.linkedInFeatureFlags?.recordSuccess(featureName);
    return cachedBadge.age;
  }

  // Layer 2: Job cache (API data from interceptor)
  const ageFromCache = window.linkedInJobCache?.getJobAgeFromCache(jobId);
  if (ageFromCache !== null) {
    await window.badgeStateManager?.setBadgeData(jobId, { age: Math.floor(ageFromCache) });
    await window.linkedInFeatureFlags?.recordSuccess(featureName);
    return Math.floor(ageFromCache);
  }

  // Layer 3: DOM extraction with multiple fallbacks
  const ageFromDOM = extractJobAgeFromDOM(jobCard);
  if (ageFromDOM !== null) {
    await window.badgeStateManager?.setBadgeData(jobId, { age: ageFromDOM });
    await window.linkedInFeatureFlags?.recordSuccess(featureName);
    return ageFromDOM;
  }

  // Layer 4: Failure - record and check if should auto-disable
  await window.linkedInFeatureFlags?.recordFailure(featureName);
  return null;
}

// Extract job age from DOM with comprehensive selectors
function extractJobAgeFromDOM(jobCard) {
  // Try time elements with datetime attribute first
  for (const selector of SELECTORS.cardAge) {
    try {
      const elements = jobCard.querySelectorAll(selector);
      for (const timeEl of elements) {
        const datetime = timeEl.getAttribute('datetime');
        if (datetime) {
          const postDate = new Date(datetime);
          const now = new Date();
          const daysAgo = Math.floor((now - postDate) / (1000 * 60 * 60 * 24));
          if (!isNaN(daysAgo) && daysAgo >= 0 && daysAgo <= 365) {
            return daysAgo;
          }
        }
        // Try parsing text
        const age = parseJobAge(timeEl.textContent);
        if (age !== null) return age;
      }
    } catch (e) {
      // Invalid selector, skip
    }
  }

  // Fallback: parse full card text
  const fullText = jobCard.textContent;
  return parseJobAge(fullText);
}

// Get combined text from job card for filtering
function getJobCardText(jobCard) {
  const parts = [];

  // Title
  const titleEl = queryWithFallbacks(jobCard, SELECTORS.cardTitle);
  if (titleEl) parts.push(titleEl.textContent.trim().toLowerCase());

  // Company
  const companyEl = queryWithFallbacks(jobCard, SELECTORS.cardCompany);
  if (companyEl) parts.push(companyEl.textContent.trim().toLowerCase());

  // Location
  const locationEl = queryWithFallbacks(jobCard, SELECTORS.cardLocation);
  if (locationEl) parts.push(locationEl.textContent.trim().toLowerCase());

  return parts.join(' ');
}

// Extract detailed job info for Scanner tab
function extractJobInfo() {
  try {
    const url = window.location.href;
    if (!url.includes('/jobs/')) return null;

    let title = null, company = null, location = null, description = '', postedDate = null;

    // Title
    for (const selector of SELECTORS.detailTitle) {
      const elem = document.querySelector(selector);
      if (elem?.textContent?.trim()) {
        title = elem.textContent.trim().replace(/\s+/g, ' ');
        break;
      }
    }

    // Company
    for (const selector of SELECTORS.detailCompany) {
      const elem = document.querySelector(selector);
      if (elem?.textContent?.trim()) {
        company = elem.textContent.trim();
        break;
      }
    }

    // Description
    for (const selector of SELECTORS.description) {
      const elem = document.querySelector(selector);
      if (elem?.textContent?.trim()) {
        description = elem.textContent.trim();
        break;
      }
    }

    // Posted date
    for (const selector of SELECTORS.detailAge) {
      const elem = document.querySelector(selector);
      if (elem?.textContent?.trim()) {
        postedDate = elem.textContent.trim();
        break;
      }
    }

    return { url, title, company, location, description, postedDate, platform: 'linkedin' };
  } catch (error) {
    log('Error extracting job info:', error);
    return null;
  }
}

// =============================================================================
// SECTION 4: FILTERING LOGIC (~400 lines)
// - Main filter application with concurrent filtering prevention
// =============================================================================

// Staffing firm detection patterns
const STAFFING_PATTERNS = [
  /staffing|recruiting|talent|solutions|workforce/i,
  /\b(tek|pro|consulting|systems|global|services)\b/i,
  /robert\s*half|randstad|adecco|manpower|kelly\s*services/i,
  /apex|insight|cybercoders|kforce|modis|judge/i,
  /teksystems|tek\s*systems|insight\s*global|aerotek|allegis/i
];

function isStaffingFirm(jobCard) {
  const companyEl = queryWithFallbacks(jobCard, SELECTORS.cardCompany);
  if (!companyEl) return false;
  const companyName = companyEl.textContent.trim().toLowerCase();
  return STAFFING_PATTERNS.some(pattern => pattern.test(companyName));
}

// Sponsored/promoted detection
function isSponsored(jobCard) {
  // Data attributes
  if (jobCard.hasAttribute('data-is-promoted')) return true;
  if (jobCard.querySelector('[data-promoted-badge]')) return true;

  // Class-based
  if (jobCard.classList.contains('promoted')) return true;
  const promotedEl = queryWithFallbacks(jobCard, SELECTORS.promoted);
  if (promotedEl) return true;

  // Text-based
  const footerSelectors = [
    '.job-card-list__footer-wrapper',
    '.job-card-container__footer',
    '.artdeco-entity-lockup__caption'
  ];
  for (const selector of footerSelectors) {
    const elem = jobCard.querySelector(selector);
    if (elem) {
      const text = elem.textContent.toLowerCase();
      if (/\bpromoted\b|\bsponsored\b|\bfeatured\b/.test(text)) return true;
    }
  }

  return false;
}

// Keyword matching
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

// Non-remote detection patterns
const NON_REMOTE_PATTERNS = {
  hybrid: [/\bhybrid\b/i, /\b\d+\s*days?\s*(in[-\s]?office|on[-\s]?site)/i],
  onsite: [/\bon[-\s]?site\b/i, /\bonsite\b/i, /\boffice[-\s]?based\b/i],
  inOffice: [/\bin[-\s]?office\b/i, /\boffice\s+required\b/i],
  inPerson: [/\bin[-\s]?person\b/i, /\bcommute\b/i, /\blocal\s+candidates?\s+(only|preferred)\b/i]
};

function detectNonRemoteIndicators(jobCard, settings) {
  const text = getJobCardText(jobCard);
  let detected = false;

  if (settings.excludeHybrid !== false) {
    detected = detected || NON_REMOTE_PATTERNS.hybrid.some(p => p.test(text));
  }
  if (settings.excludeOnsite !== false) {
    detected = detected || NON_REMOTE_PATTERNS.onsite.some(p => p.test(text));
  }
  if (settings.excludeInOffice !== false) {
    detected = detected || NON_REMOTE_PATTERNS.inOffice.some(p => p.test(text));
  }
  if (settings.excludeInPerson !== false) {
    detected = detected || NON_REMOTE_PATTERNS.inPerson.some(p => p.test(text));
  }

  return detected;
}

// Get applicant count from card
function getApplicantCount(jobCard) {
  const cardText = jobCard.textContent.toLowerCase();

  // Match patterns
  const clickedMatch = cardText.match(/(?:over\s+)?(\d+)\+?\s*people\s+(?:clicked\s+)?appl/i);
  if (clickedMatch) return parseInt(clickedMatch[1]);

  const applicantMatch = cardText.match(/(?:over\s+)?(\d+)\+?\s*applicants?/i);
  if (applicantMatch) return parseInt(applicantMatch[1]);

  // Early applicant indicators
  if (/be among the first|be an early applicant|be one of the first/i.test(cardText)) {
    return 0;
  }

  return null;
}

// Check salary info presence
function hasSalaryInfo(jobCard) {
  const text = getJobCardText(jobCard);
  const salaryPatterns = [
    /\$\d+(?:\.\d+)?(?:K|k)?(?:\s*[-–]\s*\$?\d+(?:\.\d+)?(?:K|k)?)?(?:\s*\/\s*(?:yr|hr))?/i,
    /\$\d+(?:,\d{3})+(?:\s*[-–]\s*\$?\d{1,3}(?:,\d{3})+)?/i
  ];
  return salaryPatterns.some(p => p.test(text));
}

// Early applicant detection
function isEarlyApplicant(jobCard) {
  const text = getJobCardText(jobCard);
  return /be among the first|be an early applicant|be one of the first|early applicant/i.test(text);
}

// Benefits detection patterns
const BENEFITS_PATTERNS = {
  health: [/\b(health|medical|dental|vision)\s*(insurance|coverage|plan|benefits?)\b/i, /\bhealthcare\b/i, /\bHSA\b/i, /\bFSA\b/i],
  retirement: [/\b401\s*\(?\s*k\s*\)?\b/i, /\bpension\b/i, /\bretirement\s+(plan|benefits?|savings)\b/i, /\bcompany\s+match(ing)?\b/i],
  pto: [/\bPTO\b/, /\bpaid\s+time\s+off\b/i, /\bvacation\s+(days?|time|policy)\b/i, /\bunlimited\s+(PTO|vacation|time\s+off)\b/i],
  equity: [/\bstock\s+options?\b/i, /\bequity\b/i, /\bRSU\s*s?\b/i, /\bESPP\b/i],
  other: [/\bbonus(es)?\b/i, /\btuition\s+(reimbursement|assistance)\b/i, /\blife\s+insurance\b/i, /\bparental\s+leave\b/i]
};

function detectBenefits(text) {
  const detected = { health: false, retirement: false, pto: false, equity: false, other: false };
  for (const [category, patterns] of Object.entries(BENEFITS_PATTERNS)) {
    detected[category] = patterns.some(pattern => pattern.test(text));
  }
  return detected;
}

// Entry level accuracy checking
function checkEntryLevelAccuracy(jobCard) {
  try {
    const cardText = getJobCardText(jobCard);
    const isLabeledEntryLevel = cardText.includes('entry level') || cardText.includes('entry-level');
    if (!isLabeledEntryLevel) return null;

    let descriptionText = cardText;
    const descEl = queryWithFallbacks(document, SELECTORS.description);
    if (descEl) {
      descriptionText += ' ' + descEl.textContent.toLowerCase();
    }

    const experiencePatterns = [
      /(\d+)\+?\s*years?\s+(?:of\s+)?experience/gi,
      /minimum\s+(?:of\s+)?(\d+)\s+years?/gi,
      /(\d+)\s+years?\s+(?:minimum|required)/gi,
      /at\s+least\s+(\d+)\s+years?/gi,
      /requires?\s+(\d+)\+?\s+years?/gi
    ];

    for (const pattern of experiencePatterns) {
      const matches = [...descriptionText.matchAll(pattern)];
      for (const match of matches) {
        const years = parseInt(match[1]);
        if (years >= 3) {
          return { mismatch: true, years, message: `Requires ${years}+ years` };
        }
      }
    }

    return { mismatch: false };
  } catch (error) {
    log('Error checking entry level accuracy:', error);
    return null;
  }
}

// Add entry level warning badge
function addEntryLevelWarningBadge(jobCard, message) {
  const existingBadge = jobCard.querySelector('.jobfiltr-entry-level-badge');
  if (existingBadge) return;

  const badge = document.createElement('div');
  badge.className = 'jobfiltr-entry-level-badge';
  badge.innerHTML = `\u26A0\uFE0F ${message}`;
  badge.style.cssText = `
    position: absolute;
    top: 8px;
    left: 8px;
    background: #fef3c7;
    color: #92400e;
    padding: 4px 10px;
    border-radius: 8px;
    font-size: 10px;
    font-weight: 600;
    z-index: 1000;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    border: 1px solid #f59e0b40;
  `;

  if (window.getComputedStyle(jobCard).position === 'static') {
    jobCard.style.position = 'relative';
  }
  jobCard.appendChild(badge);
}

// Add early applicant badge
function addEarlyApplicantBadge(jobCard) {
  const existingBadge = jobCard.querySelector('.jobfiltr-early-applicant-badge');
  if (existingBadge) return;

  const badge = document.createElement('div');
  badge.className = 'jobfiltr-early-applicant-badge';
  badge.innerHTML = '\u{1F525} Early Applicant';
  badge.style.cssText = `
    position: absolute;
    top: 8px;
    left: 8px;
    background: #dcfce7;
    color: #166534;
    padding: 4px 10px;
    border-radius: 8px;
    font-size: 10px;
    font-weight: 600;
    z-index: 1000;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    border: 1px solid #22c55e40;
  `;

  if (window.getComputedStyle(jobCard).position === 'static') {
    jobCard.style.position = 'relative';
  }
  jobCard.appendChild(badge);
}

function removeEarlyApplicantBadge(jobCard) {
  const badge = jobCard.querySelector('.jobfiltr-early-applicant-badge');
  if (badge) badge.remove();
}

// Benefits badge creation
function createBenefitsBadge(benefits) {
  const detectedCategories = Object.entries(benefits)
    .filter(([_, detected]) => detected)
    .map(([category]) => category);

  if (detectedCategories.length === 0) return null;

  const badge = document.createElement('div');
  badge.className = 'jobfiltr-benefits-badge';

  const categoryLabels = { health: 'Health', retirement: '401k', pto: 'PTO', equity: 'Equity', other: 'Bonus' };
  const categoryIcons = { health: '\u{1F3E5}', retirement: '\u{1F4B0}', pto: '\u{1F3D6}\uFE0F', equity: '\u{1F4C8}', other: '\u{1F381}' };
  const categoryColors = { health: '#ef4444', retirement: '#22c55e', pto: '#3b82f6', equity: '#a855f7', other: '#f59e0b' };

  badge.style.cssText = `
    position: absolute;
    bottom: 8px;
    right: 8px;
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
    max-width: 220px;
    z-index: 1000;
  `;

  const maxVisible = 3;
  const visibleCategories = detectedCategories.slice(0, maxVisible);

  visibleCategories.forEach(category => {
    const tag = document.createElement('span');
    tag.innerHTML = `${categoryIcons[category]} ${categoryLabels[category]}`;
    tag.style.cssText = `
      display: inline-flex;
      align-items: center;
      gap: 2px;
      padding: 3px 8px;
      font-size: 10px;
      font-weight: 600;
      border-radius: 9999px;
      background: ${categoryColors[category]}20;
      color: ${categoryColors[category]};
      border: 1px solid ${categoryColors[category]}40;
    `;
    badge.appendChild(tag);
  });

  if (detectedCategories.length > maxVisible) {
    const moreTag = document.createElement('span');
    moreTag.innerHTML = `+${detectedCategories.length - maxVisible}`;
    moreTag.style.cssText = `
      display: inline-flex;
      align-items: center;
      padding: 3px 8px;
      font-size: 10px;
      font-weight: 600;
      border-radius: 9999px;
      background: #64748b20;
      color: #64748b;
      border: 1px solid #64748b40;
    `;
    badge.appendChild(moreTag);
  }

  return badge;
}

// Add benefits badge to job card
function addBenefitsBadge(jobCard, text) {
  const existingBadge = jobCard.querySelector('.jobfiltr-benefits-badge');
  if (existingBadge) existingBadge.remove();

  let fullText = text;
  const descEl = queryWithFallbacks(document, SELECTORS.description);
  if (descEl) {
    fullText += ' ' + descEl.textContent.trim().toLowerCase();
  }

  const benefits = detectBenefits(fullText);
  const badge = createBenefitsBadge(benefits);

  if (badge) {
    if (window.getComputedStyle(jobCard).position === 'static') {
      jobCard.style.position = 'relative';
    }
    jobCard.appendChild(badge);
  }
}

// Ghost job analysis
function performGhostAnalysis(jobData) {
  const redFlags = [];
  let score = 100;
  let isStaffing = false;

  // Check for staffing indicators
  const companyLower = (jobData.company || '').toLowerCase();
  if (STAFFING_PATTERNS.some(pattern => pattern.test(companyLower))) {
    redFlags.push('Company appears to be a staffing agency');
    score -= 25;
    isStaffing = true;
  }

  // Check for vague descriptions
  const vagueIndicators = ['fast-paced', 'self-starter', 'team player', 'dynamic', 'exciting opportunity', 'rock star', 'ninja', 'guru'];
  const descLower = (jobData.description || '').toLowerCase();
  let vagueCount = vagueIndicators.filter(i => descLower.includes(i)).length;

  if (vagueCount >= 3) {
    redFlags.push('Job description contains multiple vague/buzzword phrases');
    score -= 20;
  } else if (vagueCount >= 1) {
    redFlags.push('Job description contains some vague language');
    score -= 8;
  }

  // Check for salary transparency
  if (!/\$[\d,]+/.test(descLower) && !/salary|pay|compensation/i.test(descLower)) {
    redFlags.push('No salary information provided');
    score -= 12;
  }

  // Check description length
  if (descLower.length < 200) {
    redFlags.push('Job description is unusually short');
    score -= 20;
  }

  // Clamp score
  score = Math.max(0, Math.min(100, score));

  return {
    legitimacyScore: score,
    redFlags: redFlags.length > 0 ? redFlags : ['No significant red flags detected'],
    confidence: 0.8,
    analyzedAt: Date.now()
  };
}

// Hide job card
function hideJobCard(jobCard, reasons) {
  jobCard.style.display = 'none';
  jobCard.dataset.jobfiltrHidden = 'true';
  jobCard.dataset.jobfiltrReasons = reasons.join(', ');
  jobCard.setAttribute('data-jobfiltr-processed', 'true');
}

// Show job card
function showJobCard(jobCard) {
  jobCard.style.display = '';
  delete jobCard.dataset.jobfiltrHidden;
  delete jobCard.dataset.jobfiltrReasons;
  jobCard.setAttribute('data-jobfiltr-processed', 'true');
}

// Get all job cards
function getAllJobCards() {
  const cards = new Set();
  for (const selector of SELECTORS.jobCards) {
    try {
      document.querySelectorAll(selector).forEach(card => cards.add(card));
    } catch (e) {
      // Invalid selector, skip
    }
  }
  return Array.from(cards);
}

// Main filter application with concurrent filtering prevention
async function applyFilters(settings) {
  if (isFilteringInProgress) {
    log('Filter already in progress, skipping');
    return;
  }

  isFilteringInProgress = true;
  filterSettings = settings;
  hiddenJobsCount = 0;

  try {
    log('Applying filters with settings:', Object.keys(settings).filter(k => settings[k]));

    const jobCards = getAllJobCards();
    if (jobCards.length === 0) {
      log('No job cards found');
      return;
    }

    log(`Processing ${jobCards.length} job cards`);

    for (const jobCard of jobCards) {
      let shouldHide = false;
      const reasons = [];

      // Get job ID for caching
      const jobId = extractJobId(jobCard);

      // Filter 1: Staffing Firms
      if (settings.hideStaffing && isStaffingFirm(jobCard)) {
        shouldHide = true;
        reasons.push('Staffing Firm');
      }

      // Filter 2: Sponsored/Promoted
      if (settings.hideSponsored && isSponsored(jobCard)) {
        shouldHide = true;
        reasons.push('Sponsored');
      }

      // Filter 3: Early Applicant
      if (settings.filterEarlyApplicant) {
        const displayMode = settings.earlyApplicantDisplayMode || 'hide';
        const isEarly = isEarlyApplicant(jobCard);

        if (displayMode === 'hide' && !isEarly) {
          shouldHide = true;
          reasons.push('Not early applicant');
        } else if (displayMode === 'flag' && isEarly) {
          addEarlyApplicantBadge(jobCard);
        } else {
          removeEarlyApplicantBadge(jobCard);
        }
      } else {
        removeEarlyApplicantBadge(jobCard);
      }

      // Filter 3.5: Entry Level Accuracy
      if (settings.entryLevelAccuracy && !shouldHide) {
        const entryCheck = checkEntryLevelAccuracy(jobCard);
        if (entryCheck && entryCheck.mismatch) {
          shouldHide = true;
          reasons.push(`Entry Level mismatch: ${entryCheck.years}+ years`);
          addEntryLevelWarningBadge(jobCard, entryCheck.message);
        }
      }

      // Filter 4: Applicant Count
      if (settings.filterApplicants && !shouldHide) {
        const count = getApplicantCount(jobCard);
        if (count !== null) {
          const range = settings.applicantRange;
          let mismatch = false;
          if (range === 'zero' && count > 0) mismatch = true;
          if (range === 'under5' && count >= 5) mismatch = true;
          if (range === 'under10' && count >= 10) mismatch = true;
          if (range === '10-50' && (count < 10 || count > 50)) mismatch = true;
          if (range === '50-200' && (count < 50 || count > 200)) mismatch = true;
          if (range === 'over200' && count < 200) mismatch = true;
          if (range === 'over500' && count < 500) mismatch = true;
          if (mismatch) {
            shouldHide = true;
            reasons.push(`Applicants: ${count}`);
          }
        }
      }

      // Filter 5: Posting Age
      if (settings.filterPostingAge && !shouldHide && jobId) {
        const jobAge = await getJobAge(jobId, jobCard);
        if (jobAge !== null) {
          const range = settings.postingAgeRange;
          let maxDays = 7;
          if (range === '12h') maxDays = 0.5;
          if (range === '24h') maxDays = 1;
          if (range === '3d') maxDays = 3;
          if (range === '1w') maxDays = 7;
          if (range === '2w') maxDays = 14;
          if (range === '1m') maxDays = 30;

          if (jobAge > maxDays) {
            shouldHide = true;
            reasons.push(`Posted ${jobAge}d ago`);
          }
        }
      }

      // Filter 6: True Remote Accuracy
      if (settings.trueRemoteAccuracy && !shouldHide) {
        if (detectNonRemoteIndicators(jobCard, settings)) {
          shouldHide = true;
          reasons.push('Non-remote');
        }
      }

      // Filter 7: Include Keywords
      if (settings.filterIncludeKeywords && settings.includeKeywords?.length > 0 && !shouldHide) {
        if (!matchesIncludeKeywords(jobCard, settings.includeKeywords)) {
          shouldHide = true;
          reasons.push('Missing keywords');
        }
      }

      // Filter 8: Exclude Keywords
      if (settings.filterExcludeKeywords && settings.excludeKeywords?.length > 0 && !shouldHide) {
        if (matchesExcludeKeywords(jobCard, settings.excludeKeywords)) {
          shouldHide = true;
          reasons.push('Excluded keywords');
        }
      }

      // Filter 9: Salary Info
      if (settings.filterSalary && settings.hideNoSalary && !shouldHide) {
        if (!hasSalaryInfo(jobCard)) {
          shouldHide = true;
          reasons.push('No salary');
        }
      }

      // Apply visibility
      if (shouldHide) {
        hideJobCard(jobCard, reasons);
        hiddenJobsCount++;
      } else {
        showJobCard(jobCard);

        // Display badges (only for visible cards)
        if (settings.showBenefitsIndicator) {
          const text = getJobCardText(jobCard);
          addBenefitsBadge(jobCard, text);
        }
      }

      // Job age badge (even for hidden cards)
      if (settings.showJobAge && jobId) {
        await renderJobAgeBadge(jobCard, jobId);
      }
    }

    // Update flash prevention state
    updateFlashPrevention(Object.keys(settings).some(k => settings[k]));

    // Send stats update
    sendStatsUpdate();

    // Start periodic scanning
    startPeriodicScan();

    log(`Filtered ${hiddenJobsCount} jobs out of ${jobCards.length}`);

  } finally {
    isFilteringInProgress = false;
  }
}

// Reset all filters
function resetFilters() {
  stopPeriodicScan();
  filterSettings = {};
  hiddenJobsCount = 0;

  const jobCards = getAllJobCards();
  for (const jobCard of jobCards) {
    showJobCard(jobCard);
    // Remove all badges
    const allBadgeTypes = [
      '.jobfiltr-age-badge',
      '.jobfiltr-badge',
      '.jobfiltr-benefits-badge',
      '.jobfiltr-entry-level-badge',
      '.jobfiltr-early-applicant-badge'
    ];
    jobCard.querySelectorAll(allBadgeTypes.join(', ')).forEach(b => b.remove());
    delete jobCard.dataset.jobfiltrAge;
  }

  // Remove detail panel badges
  document.querySelectorAll('.jobfiltr-detail-age-badge, .jobfiltr-detail-badge, .jobfiltr-benefits-badge').forEach(b => b.remove());

  updateFlashPrevention(false);
  sendStatsUpdate();
  log('Filters reset');
}

// Periodic scanning functions
function startPeriodicScan() {
  if (periodicScanInterval) return;

  log('Starting periodic scan (every 2s)');
  periodicScanInterval = setInterval(() => {
    if (Object.keys(filterSettings).length > 0 && !isFilteringInProgress) {
      performPeriodicScan();
    }
  }, 2000);
}

function stopPeriodicScan() {
  if (periodicScanInterval) {
    clearInterval(periodicScanInterval);
    periodicScanInterval = null;
    log('Stopped periodic scan');
  }
}

async function performPeriodicScan() {
  if (isFilteringInProgress) return;

  const jobCards = getAllJobCards();
  let processedCount = 0;

  for (const jobCard of jobCards) {
    // Skip already processed cards
    if (jobCard.dataset.jobfiltrProcessed) continue;

    // Quick filter checks for new cards
    let shouldHide = false;
    const reasons = [];

    if (filterSettings.hideStaffing && isStaffingFirm(jobCard)) {
      shouldHide = true;
      reasons.push('Staffing');
    }

    if (filterSettings.hideSponsored && isSponsored(jobCard)) {
      shouldHide = true;
      reasons.push('Sponsored');
    }

    if (shouldHide) {
      hideJobCard(jobCard, reasons);
      hiddenJobsCount++;
    } else {
      showJobCard(jobCard);
    }

    // Add age badge if needed
    const jobId = extractJobId(jobCard);
    if (filterSettings.showJobAge && jobId) {
      await renderJobAgeBadge(jobCard, jobId);
    }

    processedCount++;
  }

  if (processedCount > 0) {
    log(`Periodic scan processed ${processedCount} new cards`);
    sendStatsUpdate();
  }
}

// =============================================================================
// SECTION 5: BADGE RENDERING (~400 lines)
// - Job age badges on cards and detail panel
// =============================================================================

// Format job age for display
function formatJobAge(days) {
  if (days === 0) return 'Today';
  if (days === 1) return '1 day';
  return `${days} days`;
}

// Get badge colors based on age
function getAgeBadgeColors(days) {
  if (days <= 3) {
    return { bg: '#dcfce7', text: '#166534', icon: '\u{1F7E2}' }; // Green
  } else if (days <= 7) {
    return { bg: '#dbeafe', text: '#1e40af', icon: '\u{1F535}' }; // Blue
  } else if (days <= 14) {
    return { bg: '#fef3c7', text: '#92400e', icon: '\u{1F7E1}' }; // Yellow
  } else if (days <= 30) {
    return { bg: '#fed7aa', text: '#9a3412', icon: '\u{1F7E0}' }; // Orange
  } else {
    return { bg: '#fecaca', text: '#991b1b', icon: '\u{1F534}' }; // Red
  }
}

// Render job age badge on job card
async function renderJobAgeBadge(jobCard, jobId) {
  // Check if badge already exists
  if (jobCard.querySelector('.jobfiltr-age-badge')) return;

  // Check if already cached on card
  let days = null;
  if (jobCard.dataset.jobfiltrAge) {
    days = parseInt(jobCard.dataset.jobfiltrAge, 10);
  } else {
    days = await getJobAge(jobId, jobCard);
    if (days !== null) {
      jobCard.dataset.jobfiltrAge = days.toString();
    }
  }

  if (days === null || isNaN(days) || days < 0) return;

  const colors = getAgeBadgeColors(days);
  const ageText = formatJobAge(days);

  const badge = document.createElement('div');
  badge.className = 'jobfiltr-age-badge';
  badge.dataset.age = days.toString();
  badge.innerHTML = `<span style="margin-right:4px;">${colors.icon}</span>${ageText}`;

  badge.style.cssText = `
    position: absolute !important;
    top: 8px !important;
    right: 8px !important;
    background: ${colors.bg} !important;
    color: ${colors.text} !important;
    padding: 4px 10px !important;
    border-radius: 12px !important;
    font-size: 11px !important;
    font-weight: 600 !important;
    z-index: 10000 !important;
    box-shadow: 0 2px 4px rgba(0,0,0,0.15) !important;
    border: 1px solid ${colors.text}30 !important;
    display: flex !important;
    align-items: center !important;
    pointer-events: none !important;
    white-space: nowrap !important;
    line-height: 1 !important;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
  `;

  // Ensure job card has relative positioning
  if (window.getComputedStyle(jobCard).position === 'static') {
    jobCard.style.position = 'relative';
  }

  jobCard.appendChild(badge);
}

// Add job age badge to detail panel
async function addJobAgeToDetailPanel() {
  if (!filterSettings.showJobAge) return;

  // Remove existing badge
  const existingBadge = document.querySelector('.jobfiltr-detail-age-badge');
  if (existingBadge) existingBadge.remove();

  // Find detail panel
  const panel = queryWithFallbacks(document, SELECTORS.detailPanel);
  if (!panel) return;

  // Try to get job ID from URL
  const urlMatch = window.location.href.match(/currentJobId=(\d+)|\/jobs\/view\/(\d+)/);
  const jobId = urlMatch?.[1] || urlMatch?.[2];

  let days = null;

  // Try badge cache first
  if (jobId) {
    const cached = window.badgeStateManager?.getBadgeData(jobId);
    if (cached?.age !== undefined) {
      days = cached.age;
    }
  }

  // Try job cache
  if (days === null && jobId) {
    const cacheAge = window.linkedInJobCache?.getJobAgeFromCache(jobId);
    if (cacheAge !== null) {
      days = Math.floor(cacheAge);
    }
  }

  // Try DOM extraction
  if (days === null) {
    for (const selector of SELECTORS.detailAge) {
      const timeEl = panel.querySelector(selector);
      if (timeEl) {
        const datetime = timeEl.getAttribute('datetime');
        if (datetime) {
          const postDate = new Date(datetime);
          const now = new Date();
          const daysAgo = Math.floor((now - postDate) / (1000 * 60 * 60 * 24));
          if (!isNaN(daysAgo) && daysAgo >= 0 && daysAgo <= 365) {
            days = daysAgo;
            break;
          }
        }
        const parsed = parseJobAge(timeEl.textContent);
        if (parsed !== null) {
          days = parsed;
          break;
        }
      }
    }
  }

  // Try active card badge fallback
  if (days === null) {
    const activeCard = document.querySelector('.scaffold-layout__list-item--active, .jobs-search-results-list__list-item--active');
    if (activeCard) {
      const cardBadge = activeCard.querySelector('.jobfiltr-age-badge[data-age]');
      if (cardBadge) {
        days = parseInt(cardBadge.dataset.age, 10);
      }
    }
  }

  if (days === null || isNaN(days) || days < 0 || days > 365) return;

  const colors = getAgeBadgeColors(days);
  const ageText = formatJobAge(days);

  const badge = document.createElement('div');
  badge.className = 'jobfiltr-detail-age-badge';
  badge.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;">
      <span style="font-size:18px;">${colors.icon}</span>
      <div>
        <div style="font-weight:700;font-size:14px;">Posted ${ageText}${days > 30 ? ' ago' : ''}</div>
        <div style="font-size:11px;opacity:0.8;">${days <= 3 ? 'Fresh posting!' : days <= 7 ? 'Recent posting' : days <= 14 ? 'Moderately recent' : days <= 30 ? 'Getting older' : 'May be stale'}</div>
      </div>
    </div>
  `;

  badge.style.cssText = `
    background: linear-gradient(135deg, ${colors.bg} 0%, ${colors.bg}ee 100%);
    color: ${colors.text};
    padding: 16px 20px;
    border-radius: 12px;
    font-size: 14px;
    font-weight: 700;
    margin: 16px 0;
    box-shadow: 0 4px 16px rgba(0,0,0,0.2);
    border: 2px solid ${colors.text};
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    max-width: fit-content;
  `;

  // Insert badge
  const insertPoint = queryWithFallbacks(document, SELECTORS.badgeInsertionPoints);
  if (insertPoint) {
    insertPoint.insertAdjacentElement('afterend', badge);
  } else {
    panel.insertAdjacentElement('afterbegin', badge);
  }
}

// =============================================================================
// SECTION 6: MUTATION OBSERVERS (~200 lines)
// - Single observer for job list, debounced callbacks
// =============================================================================

let jobListObserver = null;
let detailPanelObserver = null;
let observerDebounceTimer = null;
const OBSERVER_DEBOUNCE_MS = 500;

// Debounced filter application
function debouncedApplyFilters() {
  clearTimeout(observerDebounceTimer);
  observerDebounceTimer = setTimeout(() => {
    if (Object.keys(filterSettings).length > 0) {
      applyFilters(filterSettings);
    }
  }, OBSERVER_DEBOUNCE_MS);
}

// Initialize job list observer
function initializeJobListObserver() {
  if (jobListObserver) return;

  const container = queryWithFallbacks(document, SELECTORS.jobListContainers);
  if (!container) {
    log('Job list container not found, will retry');
    return false;
  }

  jobListObserver = new MutationObserver((mutations) => {
    // Only process if new nodes were added
    const hasNewNodes = mutations.some(m =>
      Array.from(m.addedNodes).some(n => n.nodeType === Node.ELEMENT_NODE)
    );

    if (hasNewNodes) {
      log('Job list mutation detected');
      debouncedApplyFilters();
    }
  });

  jobListObserver.observe(container, { childList: true, subtree: true });
  log('Job list observer initialized');
  return true;
}

// Initialize detail panel observer
function initializeDetailPanelObserver() {
  if (detailPanelObserver) {
    detailPanelObserver.disconnect();
  }

  const panel = queryWithFallbacks(document, SELECTORS.detailPanel);
  if (!panel) return false;

  let lastContent = '';

  detailPanelObserver = new MutationObserver(() => {
    const currentContent = panel.querySelector('.jobs-unified-top-card, .job-details-jobs-unified-top-card')?.textContent || '';

    if (currentContent !== lastContent) {
      lastContent = currentContent;

      // Debounced update
      clearTimeout(window.detailPanelUpdateTimer);
      window.detailPanelUpdateTimer = setTimeout(() => {
        if (filterSettings.showJobAge) {
          addJobAgeToDetailPanel();
        }
      }, 200);
    }
  });

  detailPanelObserver.observe(panel, { childList: true, subtree: true, characterData: true });
  log('Detail panel observer initialized');
  return true;
}

// Initialize all observers
function initializeObservers() {
  const listObserverOk = initializeJobListObserver();
  const detailObserverOk = initializeDetailPanelObserver();

  // Also add scroll listener for infinite scroll
  window.addEventListener('scroll', handleScroll, { passive: true });

  return listObserverOk;
}

// Scroll handler for infinite scroll detection
let scrollDebounceTimer = null;
function handleScroll() {
  clearTimeout(scrollDebounceTimer);
  scrollDebounceTimer = setTimeout(() => {
    if (Object.keys(filterSettings).length > 0) {
      debouncedApplyFilters();
    }
  }, 150);
}

// =============================================================================
// SECTION 7: EVENT HANDLERS (~200 lines)
// - Message listener, page navigation, filter updates
// =============================================================================

// Send stats update to popup
function sendStatsUpdate() {
  if (!isExtensionContextValid()) return;

  try {
    chrome.runtime.sendMessage({
      type: 'FILTER_STATS_UPDATE',
      hiddenCount: hiddenJobsCount,
      page: currentPage,
      site: 'linkedin'
    });
  } catch (error) {
    // Silently ignore errors
  }
}

// Send page update
function sendPageUpdate() {
  if (!isExtensionContextValid()) return;

  try {
    chrome.runtime.sendMessage({
      type: 'PAGE_UPDATE',
      page: currentPage,
      hiddenCount: hiddenJobsCount,
      site: 'linkedin'
    });
  } catch (error) {
    // Silently ignore errors
  }
}

// Detect current page number
function detectCurrentPage() {
  const url = new URL(window.location.href);
  const start = url.searchParams.get('start');
  if (start) {
    const startNum = parseInt(start, 10);
    if (!isNaN(startNum)) {
      return Math.floor(startNum / 25) + 1;
    }
  }

  const paginationEl = queryWithFallbacks(document, SELECTORS.pagination);
  if (paginationEl) {
    const pageNum = parseInt(paginationEl.textContent.trim(), 10);
    if (!isNaN(pageNum)) return pageNum;
  }

  return 1;
}

// Check for page change
function checkForPageChange() {
  const currentUrl = window.location.href;
  const newPage = detectCurrentPage();

  if (currentUrl !== lastPageUrl || newPage !== currentPage) {
    lastPageUrl = currentUrl;
    currentPage = newPage;
    hiddenJobsCount = 0;
    sendPageUpdate();
    return true;
  }
  return false;
}

// Message listener
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  log('Received message:', message.type);

  if (message.type === 'PING') {
    sendResponse({ success: true, platform: 'linkedin', timestamp: Date.now() });
    return true;
  }

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

  if (message.type === 'GET_PAGE_INFO') {
    sendResponse({
      page: currentPage,
      hiddenCount: hiddenJobsCount,
      site: 'linkedin'
    });
    return true;
  }

  if (message.type === 'ANALYZE_GHOST_JOB') {
    const result = performGhostAnalysis(message.jobData);
    sendResponse({ success: true, data: result });
    return true;
  }

  if (message.action === 'showNotification') {
    sessionStorage.removeItem('jobfiltr_notification_shown');
    showJobFiltrActiveNotification();
    sendResponse({ success: true });
    return true;
  }

  return false;
});

// URL change observer (SPA navigation)
let lastUrlValue = location.href;
const urlObserver = new MutationObserver(() => {
  if (location.href !== lastUrlValue) {
    lastUrlValue = location.href;
    log('URL changed, reinitializing');

    setTimeout(() => {
      currentPage = detectCurrentPage();
      checkForPageChange();
      initializeObservers();

      if (Object.keys(filterSettings).length > 0) {
        applyFilters(filterSettings);
      }
    }, 1000);
  }
});
urlObserver.observe(document.body, { childList: true, subtree: true });

// Pagination click handler
document.addEventListener('click', (e) => {
  const paginationBtn = e.target.closest('.artdeco-pagination__indicator, .jobs-search-pagination__button');
  if (paginationBtn) {
    log('Pagination click detected');
    setTimeout(() => {
      checkForPageChange();
      if (Object.keys(filterSettings).length > 0) {
        applyFilters(filterSettings);
      }
    }, 1500);
  }
}, true);

// Job card click handler (for detail panel updates)
document.addEventListener('click', (e) => {
  const jobCard = e.target.closest('li.jobs-search-results__list-item, .scaffold-layout__list-item, div.job-card-container');
  if (jobCard) {
    [300, 600, 1000].forEach(delay => {
      setTimeout(() => {
        if (filterSettings.showJobAge) {
          addJobAgeToDetailPanel();
        }
      }, delay);
    });
  }
}, true);

// =============================================================================
// SECTION 8: UTILITIES & INITIALIZATION (~100 lines)
// - Debounce, init function, startup
// =============================================================================

// Debounce utility
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Load and apply saved filters
async function loadAndApplyFilters() {
  if (!isExtensionContextValid()) {
    log('Extension context invalid, cannot load filters');
    return;
  }

  try {
    // Check authentication
    const authResult = await chrome.storage.local.get(['authToken', 'authExpiry']);
    if (!authResult.authToken || !authResult.authExpiry || Date.now() >= authResult.authExpiry) {
      log('User not authenticated, skipping auto-apply');
      return;
    }

    const result = await chrome.storage.local.get('filterSettings');
    if (result.filterSettings && Object.keys(result.filterSettings).length > 0) {
      filterSettings = result.filterSettings;
      log('Loaded saved filter settings');

      // Give page time to render
      setTimeout(() => {
        applyFilters(filterSettings);
      }, 1000);
    }
  } catch (error) {
    if (!error.message?.includes('Extension context invalidated')) {
      log('Error loading filters:', error);
    }
  }
}

// Notification display
function showJobFiltrActiveNotification() {
  if (sessionStorage.getItem('jobfiltr_notification_shown')) return;
  if (!isExtensionContextValid()) return;

  try {
    chrome.runtime.sendMessage({ type: 'CHECK_POPUP_STATE' }, (response) => {
      if (chrome.runtime.lastError || (response && response.popupOpen)) return;

      sessionStorage.setItem('jobfiltr_notification_shown', 'true');

      const notification = document.createElement('div');
      notification.id = 'jobfiltr-active-notification';
      notification.innerHTML = `
        <div style="display:flex;align-items:center;gap:12px;padding:14px 16px;background:linear-gradient(135deg,#1e3a5f 0%,#0f172a 100%);border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.1);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
          <div style="display:flex;align-items:center;justify-content:center;width:36px;height:36px;background:rgba(74,222,128,0.2);border-radius:10px;color:#4ade80;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M9 12l2 2 4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/></svg>
          </div>
          <div>
            <div style="font-size:14px;font-weight:600;color:#fff;">JobFiltr Is Active</div>
            <div style="font-size:12px;color:#94a3b8;">Filtering jobs on this page</div>
          </div>
          <button onclick="this.closest('#jobfiltr-active-notification').remove()" style="display:flex;align-items:center;justify-content:center;width:28px;height:28px;background:transparent;border:none;border-radius:6px;color:#64748b;cursor:pointer;margin-left:4px;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
          </button>
        </div>
      `;
      notification.style.cssText = 'position:fixed;top:24px;right:24px;z-index:99999;animation:jobfiltr-slide-in 0.4s ease-out;';

      const style = document.createElement('style');
      style.textContent = '@keyframes jobfiltr-slide-in{from{opacity:0;transform:translateX(100px)}to{opacity:1;transform:translateX(0)}}';
      document.head.appendChild(style);
      document.body.appendChild(notification);

      setTimeout(() => {
        if (document.body.contains(notification)) {
          notification.style.animation = 'jobfiltr-slide-in 0.3s ease-in reverse forwards';
          setTimeout(() => notification.remove(), 300);
        }
      }, 4000);
    });
  } catch (error) {
    // Silently ignore
  }
}

// Main initialization
async function init() {
  log('Initializing LinkedIn content script');

  // Initialize page tracking
  lastPageUrl = location.href;
  currentPage = detectCurrentPage();

  // Wait for and initialize infrastructure
  await initializeInfrastructure();
  await waitForInfrastructure(3000);

  // Initialize observers
  let observerOk = initializeObservers();

  // Retry observers if needed
  if (!observerOk) {
    setTimeout(() => {
      if (!jobListObserver) initializeObservers();
    }, 2000);
  }

  // Load and apply saved filters
  await loadAndApplyFilters();

  // Show notification if signed in
  setTimeout(async () => {
    if (!isExtensionContextValid()) return;
    try {
      const result = await chrome.storage.local.get(['authToken', 'authExpiry']);
      if (result.authToken && result.authExpiry && Date.now() < result.authExpiry) {
        showJobFiltrActiveNotification();
      }
    } catch (e) {
      // Silently ignore
    }
  }, 1500);

  log(`LinkedIn content script ready (Page ${currentPage})`);
}

// Start initialization
init();
