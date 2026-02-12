// JobFiltr - LinkedIn Content Script V3 (Rewritten)
// Architecture: Follows Indeed V3 patterns with robust infrastructure integration
// Target: ~2,000 lines with single source of truth for selectors
// Integrates: badge-manager, job-cache, feature-flags, api-interceptor

'use strict';

// Mark as injected to prevent duplicate injections (used by background.js)
if (window.__jobfiltrInjected) {
  console.log('[JobFiltr] Content script already injected, skipping...');
} else {
  window.__jobfiltrInjected = true;

console.log('[JobFiltr] LinkedIn content script V3 loading...');

// =============================================================================
// SECTION 1: INITIALIZATION (~150 lines)
// - Flash prevention, state variables, infrastructure waiting
// =============================================================================

let filterSettings = {};
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

// CRITICAL: Inject API interceptor as early as possible to capture initial job list API calls
// This is async and non-blocking - the interceptor will start capturing once loaded
// NOTE: injectAPIInterceptor() is hoisted, so it can be called before its definition
setTimeout(() => {
  try {
    injectAPIInterceptor();
    console.log('[JobFiltr] Early API interceptor injection triggered');
  } catch (e) {
    console.log('[JobFiltr] Early API interceptor injection deferred');
  }
}, 0);

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

// Initialize infrastructure with retry logic for robustness
async function initializeInfrastructure() {
  const maxRetries = 3;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      log(`Infrastructure init attempt ${attempt}/${maxRetries}`);

      // Initialize badge manager with timeout protection
      if (window.badgeStateManager && !window.badgeStateManager.initialized) {
        await Promise.race([
          window.badgeStateManager.init(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Badge manager timeout')), 2000))
        ]);
      }

      // Initialize job cache with timeout protection
      if (window.linkedInJobCache && !window.linkedInJobCache.initialized) {
        await Promise.race([
          window.linkedInJobCache.init(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Job cache timeout')), 2000))
        ]);
      }

      // Feature flags auto-initialize, but wait for them with timeout
      if (window.linkedInFeatureFlags && !window.linkedInFeatureFlags.flags) {
        await Promise.race([
          window.linkedInFeatureFlags.init(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Feature flags timeout')), 2000))
        ]);
      }

      // Inject API interceptor
      injectAPIInterceptor();

      infrastructureReady = true;
      log(`Infrastructure initialized successfully (attempt ${attempt})`);
      return; // Success - exit the retry loop

    } catch (error) {
      log(`Infrastructure init attempt ${attempt} failed:`, error.message || error);

      if (attempt < maxRetries) {
        // Exponential backoff: 500ms, 1000ms, 1500ms
        const delay = 500 * attempt;
        log(`Retrying in ${delay}ms...`);
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }

  // All retries failed - proceed anyway with degraded functionality
  log('Infrastructure init failed after all retries - proceeding with fallbacks');
  infrastructureReady = true;
}

// Track if API interceptor has been injected to prevent duplicate injections
let apiInterceptorInjected = false;

// Inject API interceptor into page context
function injectAPIInterceptor() {
  try {
    // Prevent duplicate injections
    if (apiInterceptorInjected) {
      return;
    }
    apiInterceptorInjected = true;

    if (!isExtensionContextValid()) {
      apiInterceptorInjected = false; // Reset so it can retry
      return;
    }

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

          // NEW: Refresh job card badges with the newly captured data
          // This enables badges to appear immediately when API data is captured
          refreshJobCardBadges(jobs);
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
    // Logged-in view selectors
    '.scaffold-layout__list-item',
    'li.jobs-search-results__list-item',
    'div.job-card-container',
    'div[data-job-id]',
    'li[data-occludable-job-id]',
    '[data-occludable-job-id]',
    '.job-card-container--visited',
    '.jobs-unified-list li',
    '.jobs-job-card-list__item',
    '.job-card-list li',
    '.jobs-home-recommendations li',
    '.jobs-save-list li',
    // Public view selectors
    '.base-card[data-entity-urn*="jobPosting"]',
    'div[data-entity-urn*="jobPosting"]',
    '.jobs-search__results-list > li',
    '.base-search-card',
    // Generic fallbacks
    '[class*="job-card"]',
    'li.ember-view'
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
    '.job-view-layout',
    '[data-testid="lazy-column"]'  // Works with LinkedIn's obfuscated CSS
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

  // Detail panel age - LinkedIn uses tvm__text for posting date now
  detailAge: [
    '.tvm__text.tvm__text--low-emphasis',  // Current LinkedIn format: "12 months ago"
    '.tvm__text--low-emphasis',
    '.job-details-jobs-unified-top-card__primary-description-container .tvm__text',
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
    // Existing selectors
    '.jobs-search__results-list',
    '.scaffold-layout__list',
    '.jobs-search-results-list',
    '.jobs-search-two-pane__results',
    // Broader fallbacks (more resilient to LinkedIn changes)
    '[role="list"]',
    'main ul',
    '[class*="jobs-search-results"]',
    '[class*="scaffold-layout"] ul'
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

// Track job IDs extracted from URL changes (for new LinkedIn UI)
const jobCardIdMap = new WeakMap();
let lastKnownJobId = null;

// Extract job ID from URL
function getJobIdFromUrl(url = window.location.href) {
  // Try currentJobId parameter first
  const currentMatch = url.match(/currentJobId=(\d+)/);
  if (currentMatch) return currentMatch[1];

  // Try /jobs/view/ID pattern
  const viewMatch = url.match(/\/jobs\/view\/(\d+)/);
  if (viewMatch) return viewMatch[1];

  return null;
}

// Update tracking when URL changes
function trackJobIdFromUrl() {
  const jobId = getJobIdFromUrl();
  if (jobId && jobId !== lastKnownJobId) {
    lastKnownJobId = jobId;
    log(`Tracked job ID from URL: ${jobId}`);
  }
}

// Extract job ID from card
function extractJobId(jobCard) {
  // Check if we have a cached ID for this card
  const cachedId = jobCardIdMap.get(jobCard);
  if (cachedId) return cachedId;

  // Try data attributes first (logged-in view - legacy)
  const dataJobId = jobCard.getAttribute('data-job-id') ||
                    jobCard.getAttribute('data-occludable-job-id');
  if (dataJobId) {
    jobCardIdMap.set(jobCard, dataJobId);
    return dataJobId;
  }

  // Try data-entity-urn (public view: urn:li:jobPosting:4334367155)
  const entityUrn = jobCard.getAttribute('data-entity-urn');
  if (entityUrn) {
    const urnMatch = entityUrn.match(/jobPosting:(\d+)/);
    if (urnMatch) {
      jobCardIdMap.set(jobCard, urnMatch[1]);
      return urnMatch[1];
    }
  }

  // Try link href (both patterns)
  const links = jobCard.querySelectorAll('a[href]');
  for (const link of links) {
    const href = link.getAttribute('href') || '';
    const viewMatch = href.match(/\/jobs\/view\/(\d+)/);
    if (viewMatch) {
      jobCardIdMap.set(jobCard, viewMatch[1]);
      return viewMatch[1];
    }
    const currentMatch = href.match(/currentJobId=(\d+)/);
    if (currentMatch) {
      jobCardIdMap.set(jobCard, currentMatch[1]);
      return currentMatch[1];
    }
  }

  // Try nested elements with data-entity-urn
  const entityUrnEl = jobCard.querySelector('[data-entity-urn*="jobPosting"]');
  if (entityUrnEl) {
    const urn = entityUrnEl.getAttribute('data-entity-urn');
    const match = urn?.match(/jobPosting:(\d+)/);
    if (match) {
      jobCardIdMap.set(jobCard, match[1]);
      return match[1];
    }
  }

  // Try nested elements with job IDs
  for (const selector of SELECTORS.jobId) {
    try {
      const el = jobCard.querySelector(selector);
      if (el) {
        const id = el.getAttribute('data-job-id') ||
                   el.getAttribute('data-occludable-job-id');
        if (id) {
          jobCardIdMap.set(jobCard, id);
          return id;
        }
      }
    } catch (e) { /* Invalid selector */ }
  }

  // NEW: For content-based detected cards, generate a stable ID from content
  // This allows filtering to work even without a real job ID
  const cardText = jobCard.textContent || '';
  if (cardText.length > 20) {
    // Extract key identifiers from card text to create a pseudo-ID
    // This includes company name, job title first words, and time
    const textHash = simpleHash(cardText.substring(0, 200));
    const pseudoId = `content-${textHash}`;
    jobCardIdMap.set(jobCard, pseudoId);
    return pseudoId;
  }

  return null;
}

// Simple hash function for generating stable pseudo-IDs
function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
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
// Works even if infrastructure isn't fully initialized - DOM extraction is always available
async function getJobAge(jobId, jobCard) {
  const featureName = 'enableJobAgeBadges';

  // Check if feature is enabled (default to true if flags not initialized)
  // Feature flags default enableJobAgeBadges=true, so this is a safe fallback
  const featureEnabled = window.linkedInFeatureFlags?.isEnabled(featureName) ?? true;
  if (!featureEnabled) {
    return null;
  }

  // Layer 1: Badge cache (instant, most reliable) - if available
  if (window.badgeStateManager?.initialized) {
    const cachedBadge = window.badgeStateManager.getBadgeData(jobId);
    if (cachedBadge?.age !== undefined && cachedBadge.age !== null) {
      await window.linkedInFeatureFlags?.recordSuccess(featureName);
      return cachedBadge.age;
    }
  }

  // Layer 2: Job cache (API data from interceptor) - if available
  if (window.linkedInJobCache?.initialized) {
    const ageFromCache = window.linkedInJobCache.getJobAgeFromCache(jobId);
    if (ageFromCache !== null) {
      await window.badgeStateManager?.setBadgeData(jobId, { age: Math.floor(ageFromCache) });
      await window.linkedInFeatureFlags?.recordSuccess(featureName);
      return Math.floor(ageFromCache);
    }
  }

  // Layer 3: DOM extraction with multiple fallbacks (always available)
  const ageFromDOM = extractJobAgeFromDOM(jobCard);
  if (ageFromDOM !== null) {
    // Cache to badge manager if available
    if (window.badgeStateManager?.initialized) {
      await window.badgeStateManager.setBadgeData(jobId, { age: ageFromDOM });
    }
    await window.linkedInFeatureFlags?.recordSuccess(featureName);
    return ageFromDOM;
  }

  // NOTE: Not recording failure here - returning null is expected when:
  // - Job card doesn't display time info (LinkedIn only shows it on some cards)
  // - API data not available yet
  // This is normal behavior, not a failure that should disable the feature
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
  // CRITICAL FIX: Always use the full card text for keyword matching
  // Keywords may appear anywhere in the card (title, company, location, description snippet, skills, etc.)
  // Only extracting specific fields (title/company/location) would miss many keyword matches
  const fullText = jobCard.textContent?.trim().toLowerCase() || '';

  // For debugging: also check specific elements
  const titleEl = queryWithFallbacks(jobCard, SELECTORS.cardTitle);
  const title = titleEl?.textContent?.trim().toLowerCase() || '';
  const companyEl = queryWithFallbacks(jobCard, SELECTORS.cardCompany);
  const company = companyEl?.textContent?.trim().toLowerCase() || '';

  // Return full text for comprehensive keyword matching
  // This ensures keywords in job snippets, skills, and other parts are matched
  return fullText;
}

// Extract detailed job info for Scanner tab
function extractJobInfo() {
  try {
    const url = window.location.href;
    if (!url.includes('/jobs/')) return null;

    let title = null, company = null, location = null, description = '', postedDate = null;

    // Title (class-based selectors for old UI)
    for (const selector of SELECTORS.detailTitle) {
      const elem = document.querySelector(selector);
      if (elem?.textContent?.trim()) {
        title = elem.textContent.trim().replace(/\s+/g, ' ');
        break;
      }
    }

    // Company (class-based selectors for old UI)
    for (const selector of SELECTORS.detailCompany) {
      const elem = document.querySelector(selector);
      if (elem?.textContent?.trim()) {
        company = elem.textContent.trim();
        break;
      }
    }

    // Description (class-based selectors for old UI)
    for (const selector of SELECTORS.description) {
      const elem = document.querySelector(selector);
      if (elem?.textContent?.trim()) {
        description = elem.textContent.trim();
        break;
      }
    }

    // Posted date (class-based selectors for old UI)
    for (const selector of SELECTORS.detailAge) {
      const elem = document.querySelector(selector);
      if (elem?.textContent?.trim()) {
        postedDate = elem.textContent.trim();
        break;
      }
    }

    // ===== NEW AI SEARCH UI FALLBACKS =====
    // Company fallback: company link
    if (!company) {
      const companyLink = document.querySelector('a[href*="/company/"]');
      if (companyLink?.textContent?.trim()) {
        company = companyLink.textContent.trim();
      }
    }

    // Title + Location + PostedDate fallback: use detail panel structure
    // On new UI: company link's grandparent contains sibling DIVs for title, and a P for metadata
    if (!title || !location) {
      const companyLink = document.querySelector('a[href*="/company/"]');
      if (companyLink) {
        const container = companyLink.closest('div')?.parentElement;
        if (container) {
          const children = Array.from(container.children);
          for (const child of children) {
            const text = child.textContent?.trim();
            if (!text) continue;
            // The metadata P tag: "City, ST · X ago · N applicants"
            if (child.tagName === 'P' && /·/.test(text)) {
              const parts = text.split(/\s*·\s*/);
              if (!location && parts[0]) {
                location = parts[0].trim();
              }
              if (!postedDate) {
                for (const part of parts) {
                  if (/\b(ago|hour|day|week|month|year|minute|second|today|just|Reposted)\b/i.test(part)) {
                    postedDate = part.trim();
                    break;
                  }
                }
              }
            }
            // Title: a DIV sibling that's not the company, not empty, and looks like a job title
            if (!title && child.tagName === 'DIV' && text.length > 3 && text.length < 200) {
              // Skip if it's the company name or badge container
              if (text === company) continue;
              // Skip any JobFiltr-injected element (badges, containers, etc.)
              if (child.className && /jobfiltr-/i.test(child.className)) continue;
              if (child.querySelector('[class*="jobfiltr-"]')) continue;
              // Skip known badge text patterns
              if (/Ghost Job|Low Risk|High Risk|Community Reported|Responses managed/i.test(text)) continue;
              if (/^\d+\s*(second|minute|hour|day|week|month|year)s?\s*ago$/i.test(text)) continue;
              if (/^(Active|Stale|Moderate|Early Applicant|Verified|Staffing Agency)$/i.test(text)) continue;
              if (child.querySelector('a[href*="/company/"]')) continue;
              title = text.replace(/\s+/g, ' ');
            }
          }
        }
      }
    }

    // Description fallback: "About the job" heading -> parent's next sibling
    if (!description || description.length < 50) {
      const headings = document.querySelectorAll('h2');
      for (const h of headings) {
        if (h.textContent?.trim() === 'About the job') {
          const descEl = h.parentElement?.nextElementSibling;
          if (descEl?.textContent?.trim()) {
            description = descEl.textContent.trim();
          }
          break;
        }
      }
    }

    // Location fallback: check metadata spans in right panel (x > 500)
    if (!location) {
      const spans = document.querySelectorAll('span');
      for (const span of spans) {
        const text = span.textContent?.trim();
        if (text && /^[A-Z][a-z]+,\s*[A-Z]{2}$/.test(text)) {
          const rect = span.getBoundingClientRect();
          if (rect.x > 500) { // Right panel
            location = text;
            break;
          }
        }
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
  // Try specific company selector first
  const companyEl = queryWithFallbacks(jobCard, SELECTORS.cardCompany);
  if (companyEl) {
    const companyName = companyEl.textContent.trim().toLowerCase();
    if (STAFFING_PATTERNS.some(pattern => pattern.test(companyName))) {
      return true;
    }
  }

  // FALLBACK for content-based detected cards (new LinkedIn UI)
  // Check the full card text for staffing company names
  const fullText = jobCard.textContent?.toLowerCase() || '';

  // Only check for specific staffing company names to avoid false positives
  const specificStaffingNames = [
    /robert\s*half/i,
    /randstad/i,
    /adecco/i,
    /manpower/i,
    /kelly\s*services/i,
    /teksystems|tek\s*systems/i,
    /insight\s*global/i,
    /aerotek/i,
    /allegis/i,
    /cybercoders/i,
    /kforce/i,
    /modis/i,
    /apex\s*(group|systems)/i
  ];

  return specificStaffingNames.some(pattern => pattern.test(fullText));
}

// ===== STAFFING DISPLAY MODE FUNCTIONS =====
function addStaffingBadge(jobCard) {
  // Don't add duplicate badges
  if (jobCard.querySelector('.jobfiltr-staffing-badge')) return;

  const badge = document.createElement('div');
  badge.className = 'jobfiltr-staffing-badge';

  badge.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" style="flex-shrink: 0;">
      <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
    <span class="jobfiltr-staffing-tooltip">Community Reported</span>`;

  badge.style.cssText = `
    position: absolute !important;
    top: 32px !important;
    right: 8px !important;
    background: #f97316 !important;
    color: white !important;
    width: 24px !important;
    height: 24px !important;
    border-radius: 6px !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    z-index: 10000 !important;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2) !important;
    cursor: pointer !important;
    pointer-events: auto !important;
  `;

  // Make job card position relative for absolute badge positioning
  const computedStyle = window.getComputedStyle(jobCard);
  if (computedStyle.position === 'static') {
    jobCard.style.position = 'relative';
  }

  jobCard.prepend(badge);
}

function applyStaffingDimEffect(jobCard) {
  if (jobCard.classList.contains('jobfiltr-staffing-dimmed')) return;

  jobCard.classList.add('jobfiltr-staffing-dimmed');
  jobCard.style.opacity = '0.5';
  jobCard.style.transition = 'opacity 0.2s ease';

  // Also add the badge when dimming
  addStaffingBadge(jobCard);
}

function removeStaffingStyling(jobCard) {
  const badge = jobCard.querySelector('.jobfiltr-staffing-badge');
  if (badge) badge.remove();

  jobCard.classList.remove('jobfiltr-staffing-dimmed');
  jobCard.style.opacity = '';
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

  // FALLBACK for content-based detected cards (new LinkedIn UI)
  // Check for "Promoted" text in the card
  const cardText = jobCard.textContent?.toLowerCase() || '';
  if (/\bpromoted\b|\bsponsored\b/.test(cardText)) {
    return true;
  }

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

// ===== ACTIVELY RECRUITING DETECTION =====
function isActivelyRecruiting(jobCard) {
  try {
    // Use job age data - LinkedIn doesn't show "Employer Active" like Indeed
    const jobId = extractJobId(jobCard);
    const cachedAge = jobCard.dataset.jobfiltrAge ? parseInt(jobCard.dataset.jobfiltrAge, 10) : null;
    const jobAge = cachedAge !== null ? cachedAge : parseJobAge(jobCard.textContent || '');

    if (jobAge !== null) {
      if (jobAge <= 7) return { active: true, days: jobAge, source: 'job_age' };
      if (jobAge >= 30) return { active: false, days: jobAge, source: 'job_age' };
      return { active: null, days: jobAge, source: 'job_age' };
    }
    return null;
  } catch (error) {
    return null;
  }
}

// Shared top-right badges wrapper for age + recruiting badges on job cards
function getOrCreateCardBadgesWrapper(jobCard) {
  let wrapper = jobCard.querySelector('.jobfiltr-card-badges-wrapper');
  if (!wrapper) {
    wrapper = document.createElement('div');
    wrapper.className = 'jobfiltr-card-badges-wrapper';
    wrapper.style.cssText = `
      position: absolute !important; top: 8px !important; right: 8px !important;
      display: flex !important; gap: 6px !important; align-items: center !important;
      z-index: 10000 !important; pointer-events: none !important;
    `;
    if (window.getComputedStyle(jobCard).position === 'static') {
      jobCard.style.position = 'relative';
    }
    jobCard.appendChild(wrapper);
  }
  return wrapper;
}

function addActiveRecruitingBadge(jobCard, recruitingInfo) {
  if (jobCard.querySelector('.jobfiltr-recruiting-badge')) return;
  const isActive = recruitingInfo.active;
  const days = recruitingInfo.days;
  let bgColor, textColor, icon;
  if (isActive) {
    bgColor = '#dcfce7'; textColor = '#166534'; icon = '\u2705';
  } else if (isActive === false) {
    bgColor = '#fecaca'; textColor = '#991b1b'; icon = '\u{1F534}';
  } else {
    bgColor = '#fef3c7'; textColor = '#92400e'; icon = '\u{1F7E1}';
  }
  const badge = document.createElement('div');
  badge.className = 'jobfiltr-recruiting-badge';
  const label = isActive ? 'Active' : isActive === false ? 'Stale' : 'Moderate';
  badge.innerHTML = `<span style="margin-right:3px;">${icon}</span>${label}`;
  badge.style.cssText = `
    background: ${bgColor} !important; color: ${textColor} !important;
    padding: 4px 10px !important; border-radius: 12px !important;
    font-size: 11px !important; font-weight: 600 !important;
    display: flex !important; align-items: center !important; pointer-events: none !important;
    white-space: nowrap !important; line-height: 1 !important;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
    border: 1px solid ${textColor}30 !important;
    box-shadow: 0 2px 4px rgba(0,0,0,0.15) !important;
  `;
  const wrapper = getOrCreateCardBadgesWrapper(jobCard);
  // Prepend so recruiting badge is to the left of age badge
  wrapper.insertBefore(badge, wrapper.firstChild);
}

function removeActiveRecruitingBadge(jobCard) {
  const badge = jobCard.querySelector('.jobfiltr-recruiting-badge');
  if (badge) {
    badge.remove();
    // Clean up empty wrapper
    const wrapper = jobCard.querySelector('.jobfiltr-card-badges-wrapper');
    if (wrapper && wrapper.children.length === 0) wrapper.remove();
  }
}

// ===== VISA SPONSORSHIP DETECTION =====
const VISA_NEGATIVE_PATTERNS = [
  /\b(not|no|cannot|can't|won't|will\s+not|unable\s+to|do\s+not|does\s+not)\s+(provide\s+)?(sponsor|sponsorship)/i,
  /sponsor(ship)?\s+(is\s+)?(not|unavailable)/i,
  /without\s+sponsor/i,
  /\bno\s+visa\s+(support|sponsorship|assistance)/i,
  /\bnot\s+eligible\s+for\s+(visa\s+)?sponsorship/i,
  /must\s+have\s+(valid\s+)?(work\s+)?(authorization|permit|visa)/i,
  /must\s+be\s+(legally\s+)?authorized\s+to\s+work/i,
  /sponsorship\s+(is\s+)?not\s+(available|offered|provided)/i,
  /unable\s+to\s+sponsor/i,
  /we\s+are\s+not\s+able\s+to\s+sponsor/i
];

const VISA_POSITIVE_PATTERNS = [
  /\bwill\s+sponsor/i,
  /visa\s+sponsor(ship)?(\s+available|\s+provided|\s+offered)?/i,
  /sponsor(s|ing|ed)?\s+(visa|work\s+authorization)/i,
  /\bsponsorship\s+available\b/i,
  /sponsorship\s+(is\s+)?(available|provided|offered)/i,
  /\bopen\s+to\s+sponsor/i,
  /\bh-?1b\b/i, /\bh1-?b\b/i, /\bh-?2b\b/i,
  /\btn\s+visa\b/i, /\be-?3\s+visa\b/i, /\bl-?1\s+visa\b/i,
  /\bperm\s+(sponsorship|process|filing)/i,
  /\bgreen\s+card\s+sponsor/i,
  /sponsor.*work\s+(permit|authorization|visa)/i,
  /immigration\s+sponsor/i,
  /visa\s*([\+&,]|\s+and)\s*relocation/i,
  /visa\s+(support|supported|assistance|provided|available)/i,
  /\bwork\s+visa\b/i,
  /\bvisa\s+transfer\b/i
];

function hasVisaSponsorshipText(text) {
  if (!text || text.length < 50) return false;
  const normalized = text.toLowerCase();
  for (const pattern of VISA_NEGATIVE_PATTERNS) {
    if (pattern.test(normalized)) return false;
  }
  for (const pattern of VISA_POSITIVE_PATTERNS) {
    if (pattern.test(normalized)) return true;
  }
  return false;
}

function hasVisaSponsorship(jobCard) {
  try {
    const cardText = getJobCardText(jobCard);
    if (hasVisaSponsorshipText(cardText)) return true;
    // Check LinkedIn detail panel (class-based for old UI)
    const detailPanel = document.querySelector('.jobs-description, .job-details-about-the-job-card, [class*="jobs-description"]');
    if (detailPanel) {
      const detailText = detailPanel.innerText || detailPanel.textContent || '';
      if (hasVisaSponsorshipText(detailText)) return true;
    }
    // Fallback for new AI search UI: find "About the job" heading and check its parent
    const headings = document.querySelectorAll('h2, h3, h4, span, div');
    for (const h of headings) {
      if (h.textContent?.trim() === 'About the job') {
        const container = h.parentElement;
        if (container) {
          const descText = container.innerText || container.textContent || '';
          if (hasVisaSponsorshipText(descText)) return true;
        }
        break;
      }
    }
    return false;
  } catch (error) {
    return false;
  }
}

function countVisaSponsorshipJobs() {
  const jobCards = getAllJobCards();
  let visaCount = 0;
  for (const card of jobCards) {
    if (hasVisaSponsorship(card)) visaCount++;
  }
  return {
    total: jobCards.length,
    visa: visaCount,
    percentage: jobCards.length > 0 ? Math.round((visaCount / jobCards.length) * 100) : 0
  };
}

function countSponsoredJobs() {
  const jobCards = getAllJobCards();
  let sponsoredCount = 0;
  for (const card of jobCards) {
    if (isSponsored(card)) sponsoredCount++;
  }
  return {
    total: jobCards.length,
    sponsored: sponsoredCount,
    percentage: jobCards.length > 0 ? Math.round((sponsoredCount / jobCards.length) * 100) : 0
  };
}

// Keyword matching
function matchesIncludeKeywords(jobCard, keywords) {
  if (!keywords || keywords.length === 0) return true;
  const text = getJobCardText(jobCard);
  const matches = keywords.some(keyword => text.includes(keyword.toLowerCase()));
  // Debug logging for keyword matching
  if (keywords.length > 0) {
    log(`Include keywords check: ${keywords.join(', ')} | Match: ${matches} | Text length: ${text.length}`);
  }
  return matches;
}

function matchesExcludeKeywords(jobCard, keywords) {
  if (!keywords || keywords.length === 0) return false;
  const text = getJobCardText(jobCard);
  const matches = keywords.some(keyword => text.includes(keyword.toLowerCase()));
  // Debug logging for keyword matching - ALWAYS log to diagnose issues
  log(`Exclude keywords check:`);
  log(`  Keywords: ${JSON.stringify(keywords)}`);
  log(`  Text length: ${text.length}`);
  log(`  Text preview: "${text.substring(0, 150).replace(/\s+/g, ' ')}"`);
  log(`  Match result: ${matches}`);
  if (matches) {
    log(`  Matched keywords: ${keywords.filter(k => text.includes(k.toLowerCase())).join(', ')}`);
  }
  return matches;
}

// ===== EXCLUDE COMPANIES =====
function getCompanyNameForFilter(jobCard) {
  // Strategy 1: Class-based selectors (old LinkedIn UI)
  const selectors = [
    '.job-card-container__company-name',
    '.artdeco-entity-lockup__subtitle',
    '.job-card-list__company-name',
    'a[data-tracking-control-name="public_jobs_topcard-org-name"]'
  ];
  for (const selector of selectors) {
    const el = jobCard.querySelector(selector);
    if (el) return el.textContent.trim().toLowerCase();
  }

  // Strategy 2: Content-based (new LinkedIn AI search with obfuscated classes)
  // Card <p> structure: [title_concat] [company] [location] [salary] ...
  const pElements = Array.from(jobCard.querySelectorAll('p'))
    .filter(p => {
      const text = p.textContent?.trim();
      return text && text.length > 1;
    });

  // Company name is typically the 2nd <p> (skip 1st which is concatenated title)
  for (let i = 1; i < Math.min(4, pElements.length); i++) {
    const text = pElements[i].textContent.trim();
    // Skip location patterns (city, STATE (On-site/Remote/Hybrid))
    if (/\(on-?site\)|\(remote\)|\(hybrid\)/i.test(text)) continue;
    // Skip salary patterns
    if (/^\$\d|\/hr|\/yr/i.test(text)) continue;
    // Skip benefit/metadata patterns
    if (/\d+\s*benefits?|401\(k\)|medical|vision|dental/i.test(text)) continue;
    // This is likely the company name
    return text.toLowerCase();
  }

  return '';
}

function matchesExcludeCompanies(jobCard, companies) {
  if (!companies || companies.length === 0) return false;
  const companyName = getCompanyNameForFilter(jobCard);
  if (!companyName) return false;
  const matches = companies.some(excluded => companyName.includes(excluded.toLowerCase()));
  if (matches) {
    log(`Exclude companies match: "${companyName}" matches excluded company`);
  }
  return matches;
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

// Remote positive patterns for work type detection
const REMOTE_POSITIVE_PATTERNS = [
  /\bfully\s+remote\b/i,
  /\b100%\s*remote\b/i,
  /\bremote\s+(only|position|role|job|work|opportunity)\b/i,
  /\bwork\s+from\s+(home|anywhere)\b/i,
  /\bwfh\b/i,
  /\bvirtual\s+(position|role|job|opportunity)\b/i,
  /\bremote[-\s]?first\b/i,
  /\bremote[-\s]?friendly\b/i,
  /\bno\s+office\s+required\b/i,
  /\banywhere\s+in\s+(the\s+)?(us|usa|united\s+states|world)\b/i
];

/**
 * Detect work location type classification for a job card
 * Returns the work type and confidence level
 * @param {Element} jobCard - The job card element to analyze
 * @returns {{ type: 'remote'|'hybrid'|'onsite'|'unclear', confidence: number, details: string }}
 */
function detectWorkLocationType(jobCard) {
  const text = getJobCardText(jobCard);

  // Check for explicit REMOTE indicators
  const matchedRemotePatterns = [];
  for (const pattern of REMOTE_POSITIVE_PATTERNS) {
    if (pattern.test(text)) {
      matchedRemotePatterns.push(pattern.toString());
    }
  }
  const isExplicitlyRemote = matchedRemotePatterns.length > 0;

  // Check for NON-remote indicators using existing patterns
  const hasHybrid = NON_REMOTE_PATTERNS.hybrid.some(p => p.test(text));
  const hasOnsite = NON_REMOTE_PATTERNS.onsite.some(p => p.test(text));
  const hasInOffice = NON_REMOTE_PATTERNS.inOffice.some(p => p.test(text));
  const hasInPerson = NON_REMOTE_PATTERNS.inPerson.some(p => p.test(text));

  const hasNonRemote = hasHybrid || hasOnsite || hasInOffice || hasInPerson;

  // Determine work type classification
  if (isExplicitlyRemote && !hasNonRemote) {
    return {
      type: 'remote',
      confidence: 0.9,
      details: `Matched: ${matchedRemotePatterns.slice(0, 2).join(', ')}`
    };
  } else if (hasHybrid) {
    return { type: 'hybrid', confidence: 0.85, details: 'Hybrid indicators found' };
  } else if (hasOnsite || hasInOffice || hasInPerson) {
    const types = [];
    if (hasOnsite) types.push('on-site');
    if (hasInOffice) types.push('in-office');
    if (hasInPerson) types.push('in-person');
    return { type: 'onsite', confidence: 0.85, details: `Found: ${types.join(', ')}` };
  } else if (isExplicitlyRemote && hasNonRemote) {
    // Mixed signals - says remote but also has non-remote indicators
    return { type: 'hybrid', confidence: 0.7, details: 'Mixed remote/non-remote signals' };
  } else {
    // No work type information found at all
    return { type: 'unclear', confidence: 1.0, details: 'No work type indicators found' };
  }
}

/**
 * Add "Work Type Unclear" warning badge to job card
 * Shows when True Remote Accuracy is active and job has no work location info
 * @param {Element} jobCard - The job card element
 */
function addWorkTypeUnclearBadge(jobCard) {
  // Don't add duplicate badges
  if (jobCard.querySelector('.jobfiltr-worktype-badge')) return;

  const badge = document.createElement('div');
  badge.className = 'jobfiltr-worktype-badge';
  badge.innerHTML = `<span style="margin-right: 4px;">⚠️</span>Work Type Unclear`;
  badge.title = 'This job listing does not specify if it is Remote, Hybrid, or On-site. Click to view full description for more details.';

  // Solid amber/yellow style
  const bgColor = '#fef3c7'; // Light amber (solid)
  const textColor = '#92400e'; // Dark amber

  badge.style.cssText = `
    background: ${bgColor};
    color: ${textColor};
    padding: 4px 10px;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 600;
    display: flex;
    align-items: center;
    cursor: help;
    pointer-events: auto;
    white-space: nowrap;
    position: absolute;
    top: 32px;
    right: 8px;
    z-index: 1000;
    box-shadow: 0 1px 2px rgba(0,0,0,0.1);
  `;

  // Make job card position relative for absolute badge positioning
  const computedStyle = window.getComputedStyle(jobCard);
  if (computedStyle.position === 'static') {
    jobCard.style.position = 'relative';
  }

  jobCard.appendChild(badge);
  log('Added Work Type Unclear badge to job card');
}

/**
 * Remove work type badge from job card
 * @param {Element} jobCard - The job card element
 */
function removeWorkTypeBadge(jobCard) {
  const badge = jobCard.querySelector('.jobfiltr-worktype-badge');
  if (badge) badge.remove();
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

// =============================================================================
// Community-Reported Companies Detection (for job cards)
// Companies reported for spam/ghost jobs - applies orange highlight + badge
// =============================================================================

// Community-reported companies list (Jan 2026) - subset for card detection
const REPORTED_COMPANIES_CARD = [
  { name: 'Accenture', normalized: 'accenture', category: 'ghost' },
  { name: 'Bank of America', normalized: 'bank of america', aliases: ['bofa', 'bankofamerica'], category: 'ghost' },
  { name: 'Comcast', normalized: 'comcast', category: 'ghost' },
  { name: 'CVS', normalized: 'cvs', aliases: ['cvs health', 'cvs pharmacy'], category: 'ghost' },
  { name: 'Dice', normalized: 'dice', aliases: ['dicecom'], category: 'spam' },
  { name: 'DoorDash', normalized: 'doordash', category: 'ghost' },
  { name: 'EY', normalized: 'ey', aliases: ['ernst young', 'ernst  young'], category: 'ghost' },
  { name: 'GE Healthcare', normalized: 'ge healthcare', aliases: ['ge health', 'general electric healthcare'], category: 'ghost' },
  { name: 'HubSpot', normalized: 'hubspot', category: 'ghost' },
  { name: 'JP Morgan Chase', normalized: 'jp morgan chase', aliases: ['jpmorgan', 'jp morgan', 'chase', 'jpmorganchase'], category: 'ghost' },
  { name: 'Kforce', normalized: 'kforce', category: 'ghost' },
  { name: 'LinkedIn', normalized: 'linkedin', category: 'ghost' },
  { name: 'Meta', normalized: 'meta', aliases: ['facebook', 'fb'], category: 'ghost' },
  { name: 'Microsoft', normalized: 'microsoft', category: 'ghost' },
  { name: 'Oracle', normalized: 'oracle', category: 'ghost' },
  { name: 'PayPal', normalized: 'paypal', category: 'ghost' },
  { name: 'Progressive Insurance', normalized: 'progressive insurance', aliases: ['progressive'], category: 'ghost' },
  { name: 'Salesforce', normalized: 'salesforce', category: 'ghost' },
  { name: 'ServiceNow', normalized: 'servicenow', category: 'ghost' },
  { name: 'Spotify', normalized: 'spotify', category: 'ghost' },
  { name: 'Tesla', normalized: 'tesla', category: 'ghost' },
  { name: 'Uber', normalized: 'uber', category: 'ghost' },
  { name: 'UnitedHealth Group', normalized: 'unitedhealth group', aliases: ['unitedhealth', 'optum'], category: 'ghost' },
  { name: 'Visa', normalized: 'visa', category: 'ghost' },
  { name: 'Walmart', normalized: 'walmart', category: 'ghost' },
  { name: 'Wells Fargo', normalized: 'wells fargo', category: 'ghost' },
  { name: 'Workday', normalized: 'workday', category: 'ghost' },
  { name: 'Zendesk', normalized: 'zendesk', category: 'ghost' },
  { name: 'Zillow', normalized: 'zillow', category: 'ghost' },
  { name: 'Zoom', normalized: 'zoom', aliases: ['zoom video', 'zoom communications'], category: 'ghost' },
];

// Build lookup map for O(1) matching
const REPORTED_COMPANY_CARD_MAP = new Map();
for (const company of REPORTED_COMPANIES_CARD) {
  REPORTED_COMPANY_CARD_MAP.set(company.normalized, company);
  if (company.aliases) {
    for (const alias of company.aliases) {
      REPORTED_COMPANY_CARD_MAP.set(alias, company);
    }
  }
}

// Normalize company name for matching
function normalizeCompanyNameForCardMatch(name) {
  if (!name) return '';
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\b(inc|llc|ltd|corp|corporation|company|co)\b/gi, '')
    .trim();
}

// Get category-specific warning message
function getReportedCategoryMessage(category) {
  switch (category) {
    case 'spam': return 'posting spam job listings';
    case 'ghost': return 'posting ghost jobs (jobs that may not actually exist)';
    case 'scam': return 'potentially scam job postings';
    default: return 'questionable hiring practices';
  }
}

// Check if company on job card is in reported list
function checkReportedCompanyFromCard(jobCard) {
  try {
    // Try company selectors (old LinkedIn UI)
    let companyName = '';
    const companyEl = queryWithFallbacks(jobCard, SELECTORS.cardCompany);
    if (companyEl) {
      companyName = companyEl.textContent.trim();
    }

    // Content-based fallback (new LinkedIn AI search with obfuscated classes)
    // Card <p> structure: [title_concat] [company] [location] [salary] [benefits]
    if (!companyName) {
      const pElements = Array.from(jobCard.querySelectorAll('p'))
        .filter(p => {
          const text = p.textContent?.trim();
          return text && text.length > 1;
        });
      for (let i = 1; i < Math.min(4, pElements.length); i++) {
        const text = pElements[i].textContent.trim();
        if (/\(on-?site\)|\(remote\)|\(hybrid\)/i.test(text)) continue;
        if (/^\$\d|\/hr|\/yr/i.test(text)) continue;
        if (/\d+\s*benefits?|401\(k\)|medical|vision|dental/i.test(text)) continue;
        companyName = text;
        break;
      }
    }

    if (!companyName) return null;

    const normalized = normalizeCompanyNameForCardMatch(companyName);

    // 1. Exact match
    const exactMatch = REPORTED_COMPANY_CARD_MAP.get(normalized);
    if (exactMatch) {
      return {
        detected: true,
        company: exactMatch,
        message: `${exactMatch.name} has been reported for ${getReportedCategoryMessage(exactMatch.category)}`
      };
    }

    // 2. Partial match (both directions)
    for (const company of REPORTED_COMPANIES_CARD) {
      // Check if card company contains reported company name
      if (normalized.includes(company.normalized) && company.normalized.length >= 3) {
        return {
          detected: true,
          company: company,
          message: `${company.name} has been reported for ${getReportedCategoryMessage(company.category)}`
        };
      }
      // Check if reported company name contains card company name
      if (company.normalized.includes(normalized) && normalized.length >= 3) {
        return {
          detected: true,
          company: company,
          message: `${company.name} has been reported for ${getReportedCategoryMessage(company.category)}`
        };
      }
      // Check aliases
      if (company.aliases) {
        for (const alias of company.aliases) {
          if (normalized.includes(alias) && alias.length >= 3) {
            return {
              detected: true,
              company: company,
              message: `${company.name} has been reported for ${getReportedCategoryMessage(company.category)}`
            };
          }
        }
      }
    }

    return null;
  } catch (error) {
    return null;
  }
}

// Apply orange highlight styling to job card for reported company
function applyReportedCompanyHighlight(jobCard, reportResult) {
  // Prevent duplicate processing
  if (jobCard.classList.contains('jobfiltr-reported-company')) return;

  jobCard.classList.add('jobfiltr-reported-company');

  // Apply orange outline styling
  jobCard.style.border = '2px solid #f97316';
  jobCard.style.borderRadius = '8px';
  jobCard.style.backgroundColor = 'rgba(249, 115, 22, 0.06)';
  jobCard.style.boxShadow = '0 0 0 1px rgba(249, 115, 22, 0.3)';
  jobCard.style.transition = 'all 0.2s ease';

  // Add small warning badge to the card
  addReportedCompanyBadgeToCard(jobCard, reportResult);

  log(`Applied community-reported highlight: ${reportResult.company.name}`);
}

// Add small warning indicator badge to job card
function addReportedCompanyBadgeToCard(jobCard, reportResult) {
  // Check if badge already exists
  if (jobCard.querySelector('.jobfiltr-card-reported-badge')) return;

  const badge = document.createElement('div');
  badge.className = 'jobfiltr-card-reported-badge';
  badge.style.cssText = `
    position: absolute !important;
    bottom: 8px !important;
    right: 8px !important;
    display: inline-flex !important;
    align-items: center !important;
    gap: 4px !important;
    padding: 3px 8px !important;
    background: linear-gradient(135deg, #fef3c7, #fde68a) !important;
    border: 1px solid #f97316 !important;
    border-radius: 12px !important;
    font-size: 10px !important;
    font-weight: 600 !important;
    color: #9a3412 !important;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
    cursor: pointer !important;
    z-index: 10000 !important;
    white-space: nowrap !important;
    pointer-events: none !important;
    box-shadow: 0 1px 3px rgba(249, 115, 22, 0.2) !important;
  `;
  badge.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" style="flex-shrink: 0;">
      <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        stroke="#9a3412" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg><span>Community Reported</span>`;

  // Ensure parent has relative positioning for absolute placement
  const computedPos = window.getComputedStyle(jobCard).position;
  if (computedPos === 'static') {
    jobCard.style.position = 'relative';
  }

  // Append to the job card (bottom-right, below the age badge at top-right)
  jobCard.appendChild(badge);
}

// Remove reported company styling from job card
function removeReportedCompanyStyling(jobCard) {
  if (!jobCard.classList.contains('jobfiltr-reported-company')) return;

  jobCard.classList.remove('jobfiltr-reported-company');
  jobCard.style.border = '';
  jobCard.style.borderRadius = '';
  jobCard.style.backgroundColor = '';
  jobCard.style.boxShadow = '';

  // Remove badge
  const badge = jobCard.querySelector('.jobfiltr-card-reported-badge');
  if (badge) badge.remove();
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

// Remove benefits badge from job card
function removeBenefitsBadge(jobCard) {
  const badge = jobCard.querySelector('.jobfiltr-benefits-badge');
  if (badge) badge.remove();
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

// ROBUST: Find job cards using multiple detection strategies
// Handles both logged-in and public LinkedIn views
// NOTE: LinkedIn now uses CSS-in-JS with obfuscated class names - content-based detection is most reliable
function findJobCardsStructurally() {
  const jobCards = new Set();

  // DEBUG: Log what selectors find
  const debugSelectors = {
    '.job-card-container[data-job-id]': document.querySelectorAll('.job-card-container[data-job-id]').length,
    '.job-card-container': document.querySelectorAll('.job-card-container').length,
    '[data-job-id]': document.querySelectorAll('[data-job-id]').length,
    '[data-occludable-job-id]': document.querySelectorAll('[data-occludable-job-id]').length
  };
  log('Job card selector debug:', JSON.stringify(debugSelectors));

  // === STRATEGY 1: Prefer .job-card-container (most precise, ~1200-1500 chars) ===
  // [data-occludable-job-id] is on parent LI elements which can contain 100K+ chars
  // [data-job-id] is directly on .job-card-container - much more precise
  const jobCardContainers = document.querySelectorAll('.job-card-container[data-job-id]');
  if (jobCardContainers.length > 0) {
    log(`Found ${jobCardContainers.length} job cards via .job-card-container[data-job-id]`);
    return Array.from(jobCardContainers);
  }

  // Fallback: .job-card-container without data-job-id
  const fallbackContainers = document.querySelectorAll('.job-card-container');
  if (fallbackContainers.length > 0) {
    log(`Found ${fallbackContainers.length} job cards via .job-card-container`);
    return Array.from(fallbackContainers);
  }

  // === STRATEGY 2: Direct attribute-based detection ===
  // Note: [data-occludable-job-id] selects parent LI with huge text content, use carefully
  const directSelectors = [
    '[data-job-id]:not(li)',              // Prefer non-LI elements with data-job-id
    '.base-card[data-entity-urn*="jobPosting"]',  // Public view
    'div[data-entity-urn*="jobPosting"]'  // Alternative public view
  ];

  for (const selector of directSelectors) {
    try {
      document.querySelectorAll(selector).forEach(el => jobCards.add(el));
    } catch (e) { /* Invalid selector */ }
  }

  if (jobCards.size > 0) {
    log(`Found ${jobCards.size} job cards via direct attribute detection`);
    return Array.from(jobCards);
  }

  // Last resort: LI elements with data-occludable-job-id, but get child .job-card-container
  const liCards = document.querySelectorAll('[data-occludable-job-id]');
  for (const li of liCards) {
    const container = li.querySelector('.job-card-container');
    if (container) {
      jobCards.add(container);
    } else {
      // Fallback to the LI itself if no container found
      jobCards.add(li);
    }
  }

  if (jobCards.size > 0) {
    log(`Found ${jobCards.size} job cards via data-occludable-job-id with container fallback`);
    return Array.from(jobCards);
  }

  // === STRATEGY 2: CONTENT-BASED DETECTION (most reliable for new LinkedIn UI) ===
  // LinkedIn's new UI uses obfuscated CSS classes but job cards always contain:
  // - Time patterns: "X days ago", "X weeks ago", "X months ago"
  // - Location patterns: "(On-site)", "(Remote)", "(Hybrid)"
  const contentBasedCards = findJobCardsByContent();
  if (contentBasedCards.length > 0) {
    log(`Found ${contentBasedCards.length} job cards via content-based detection`);
    return contentBasedCards;
  }

  // === STRATEGY 3: LazyColumn-based detection ===
  // LinkedIn's job list is rendered inside a LazyColumn component
  const lazyColumnCards = findJobCardsInLazyColumn();
  if (lazyColumnCards.length > 0) {
    log(`Found ${lazyColumnCards.length} job cards via LazyColumn detection`);
    return lazyColumnCards;
  }

  // === STRATEGY 4: Link-based detection with parent walking ===
  // Find job links and walk up to find card container
  const linkPatterns = [
    'a[href*="/jobs/view/"]',
    'a[href*="currentJobId="]',
    'a[href*="/jobs/collections/"]'
  ];

  for (const pattern of linkPatterns) {
    try {
      const links = document.querySelectorAll(pattern);
      links.forEach(link => {
        let parent = link.parentElement;
        for (let i = 0; i < 8 && parent && parent !== document.body; i++) {
          // Check for job card indicators
          const hasJobAttr = parent.hasAttribute('data-job-id') ||
                            parent.hasAttribute('data-occludable-job-id') ||
                            (parent.hasAttribute('data-entity-urn') &&
                             parent.getAttribute('data-entity-urn')?.includes('jobPosting'));

          const classList = parent.classList?.toString() || '';
          const hasJobClass = classList.includes('job-card') ||
                             classList.includes('base-card') ||
                             classList.includes('scaffold-layout__list-item');

          if (hasJobAttr || hasJobClass) {
            jobCards.add(parent);
            break;
          }

          // Stop at LI if it's inside a jobs list
          if (parent.tagName === 'LI') {
            const parentList = parent.parentElement;
            const listClass = parentList?.classList?.toString() || '';
            if (listClass.includes('jobs') || listClass.includes('search-results')) {
              jobCards.add(parent);
              break;
            }
          }

          parent = parent.parentElement;
        }
      });
    } catch (e) { /* Invalid selector */ }
  }

  if (jobCards.size > 0) {
    log(`Found ${jobCards.size} job cards via link-based detection`);
    return Array.from(jobCards);
  }

  // === STRATEGY 5: Class-based detection (fallback) ===
  const classSelectors = [
    '.scaffold-layout__list-item',
    '.jobs-search-results__list-item',
    '.job-card-container',
    '.job-card-list__entity-lockup',
    '.jobs-job-board-list__item',
    'li.ember-view[id^="ember"]'  // LinkedIn uses Ember.js
  ];

  for (const selector of classSelectors) {
    try {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        elements.forEach(el => jobCards.add(el));
        log(`Found ${elements.length} job cards via class selector: ${selector}`);
        break;
      }
    } catch (e) { /* Invalid selector */ }
  }

  if (jobCards.size > 0) {
    return Array.from(jobCards);
  }

  // === STRATEGY 6: Structural detection (last resort) ===
  // Find the job list container and get its direct children
  const listSelectors = [
    '.jobs-search__results-list',
    '.scaffold-layout__list',
    '.jobs-search-results-list',
    'ul[class*="jobs"]'
  ];

  for (const selector of listSelectors) {
    try {
      const list = document.querySelector(selector);
      if (list && list.children.length > 0) {
        Array.from(list.children).forEach(child => {
          if (child.tagName === 'LI' || child.tagName === 'DIV') {
            jobCards.add(child);
          }
        });
        if (jobCards.size > 0) {
          log(`Found ${jobCards.size} job cards via list children: ${selector}`);
          break;
        }
      }
    } catch (e) { /* Invalid selector */ }
  }

  return Array.from(jobCards);
}

// CONTENT-BASED DETECTION: Find job cards by analyzing text content
// This is the most robust method for LinkedIn's new obfuscated CSS UI
function findJobCardsByContent() {
  const jobCards = [];

  // Time patterns that appear in job cards
  const timePatterns = [
    /\d+\s*(second|minute|hour|day|week|month)s?\s*ago/i,
    /just\s*(now|posted)/i,
    /today/i,
    /yesterday/i,
    /\d+[dwmh]\s*ago/i,  // Shorthand: 2d ago, 1w ago
    /posted\s*\d+/i,
    /reposted/i
  ];

  // Location patterns that appear in job cards
  const locationPatterns = [
    /\(on-?site\)/i,
    /\(remote\)/i,
    /\(hybrid\)/i,
    /on-?site/i,
    /remote/i,
    /hybrid/i
  ];

  // Find the job list container first
  // LinkedIn uses LazyColumn for virtualized lists
  let searchContainer = document.querySelector('[data-testid="lazy-column"]');

  // Fallback containers
  if (!searchContainer) {
    searchContainer = document.querySelector('main') || document.body;
  }

  // Find all DIVs that could be job cards (they typically have click handlers)
  const candidateElements = searchContainer.querySelectorAll('div');

  for (const el of candidateElements) {
    // Skip very small or very large elements
    const rect = el.getBoundingClientRect();
    if (rect.width < 200 || rect.width > 600) continue;
    if (rect.height < 60 || rect.height > 300) continue;

    // Skip if already marked or if it's a child of an already-found card
    if (jobCards.some(card => card.contains(el) || el.contains(card))) continue;

    const text = el.textContent || '';

    // Check for time pattern
    const hasTimePattern = timePatterns.some(p => p.test(text));

    // Check for location pattern
    const hasLocationPattern = locationPatterns.some(p => p.test(text));

    // A job card should have a time pattern AND additional job-related indicators
    const hasCompanyIndicator = /\b(inc|llc|corp|company|technologies|solutions|services|group)\b/i.test(text);

    // Additional job card indicators for cards without explicit location/company patterns
    // Many LinkedIn cards show "City, ST" without "(On-site)"/"(Remote)" and company names
    // like "Accenture" that don't match generic company suffixes
    const hasJobIndicator = /\$\d+/.test(text) ||                           // Salary
                            /\b\d+\s*(school\s*)?alumni\b/i.test(text) ||   // Alumni count
                            /\bapplicant/i.test(text) ||                    // Applicant text
                            /\bviewed\b/i.test(text) ||                     // Viewed status
                            /\b[A-Z][a-z]+,\s*[A-Z]{2}\b/.test(text);      // City, State format

    if (hasTimePattern && (hasLocationPattern || hasCompanyIndicator || hasJobIndicator)) {
      // Verify this is likely a card container and not a child element
      // Job cards are usually direct children of the list container or have specific dimensions
      const isCardSized = rect.width >= 300 && rect.height >= 80;

      // Also check if it has interactive behavior (cursor, onclick)
      const style = window.getComputedStyle(el);
      const hasInteraction = style.cursor === 'pointer' ||
                            el.onclick ||
                            el.getAttribute('role') === 'button' ||
                            el.getAttribute('tabindex') !== null;

      if (isCardSized || hasInteraction) {
        // Walk up to find the actual card container (avoid nested duplicates)
        let cardContainer = el;
        let parent = el.parentElement;

        // Walk up to find a better container if this is a text element
        for (let i = 0; i < 5 && parent && parent !== searchContainer; i++) {
          const parentRect = parent.getBoundingClientRect();
          // If parent has similar dimensions, it might be the actual card
          if (parentRect.width >= 300 && parentRect.width <= 600 &&
              parentRect.height >= 80 && parentRect.height <= 300) {
            cardContainer = parent;
          }
          parent = parent.parentElement;
        }

        // Avoid adding duplicate containers
        if (!jobCards.includes(cardContainer)) {
          jobCards.push(cardContainer);
        }
      }
    }
  }

  return jobCards;
}

// Find job cards inside LinkedIn's LazyColumn virtualized list
function findJobCardsInLazyColumn() {
  const jobCards = [];

  // LinkedIn uses multiple LazyColumn instances - find the one with job cards
  const lazyColumns = document.querySelectorAll('[data-testid="lazy-column"]');

  for (const column of lazyColumns) {
    // The job list LazyColumn is typically the leftmost one
    const rect = column.getBoundingClientRect();
    if (rect.left > 500) continue; // Skip right-side panels

    // Get direct children which should be job card containers
    const children = column.children;

    for (const child of children) {
      const childRect = child.getBoundingClientRect();

      // Job cards are typically 300-500px wide and 80-200px tall
      if (childRect.width >= 250 && childRect.width <= 550 &&
          childRect.height >= 60 && childRect.height <= 250) {

        // Verify it has job-related content
        const text = child.textContent || '';
        const hasJobContent = /\d+\s*(day|week|month|hour)s?\s*ago/i.test(text) ||
                             /\(remote\)|\(on-?site\)|\(hybrid\)/i.test(text) ||
                             /applicant/i.test(text);

        if (hasJobContent) {
          jobCards.push(child);
        }
      }
    }

    // If we found job cards in this column, stop searching
    if (jobCards.length > 0) break;
  }

  return jobCards;
}

// Diagnostic function to help debug what LinkedIn's DOM looks like
function diagnoseLinkedInDOM() {
  const results = {
    // Link-based detection
    links: {
      jobsView: document.querySelectorAll('a[href*="/jobs/view/"]').length,
      currentJobId: document.querySelectorAll('a[href*="currentJobId="]').length,
      anyJobs: document.querySelectorAll('a[href*="/jobs/"]').length
    },
    // Attribute-based detection (legacy LinkedIn)
    attributes: {
      dataJobId: document.querySelectorAll('[data-job-id]').length,
      dataOccludable: document.querySelectorAll('[data-occludable-job-id]').length,
      dataEntityUrn: document.querySelectorAll('[data-entity-urn*="jobPosting"]').length
    },
    // Class-based detection (legacy LinkedIn)
    classes: {
      scaffoldListItem: document.querySelectorAll('.scaffold-layout__list-item').length,
      baseCard: document.querySelectorAll('.base-card').length,
      jobCard: document.querySelectorAll('[class*="job-card"]').length,
      jobsList: document.querySelectorAll('[class*="jobs-search"]').length
    },
    // New LinkedIn UI detection
    newUI: {
      lazyColumns: document.querySelectorAll('[data-testid="lazy-column"]').length,
      mainElement: !!document.querySelector('main'),
      urlJobId: getJobIdFromUrl()
    },
    // Content-based detection test
    contentBased: {
      timePatternDivs: countDivsWithPattern(/\d+\s*(day|week|month)s?\s*ago/i),
      locationPatternDivs: countDivsWithPattern(/\(remote\)|\(on-?site\)|\(hybrid\)/i),
      potentialCards: findJobCardsByContent().length
    }
  };

  console.log('[JobFiltr DOM Diagnosis]', results);

  // Log detection method that would be used
  if (results.attributes.dataOccludable > 0 || results.attributes.dataJobId > 0) {
    console.log('[JobFiltr] Would use: STRATEGY 1 (Direct attributes)');
  } else if (results.contentBased.potentialCards > 0) {
    console.log('[JobFiltr] Would use: STRATEGY 2 (Content-based detection)');
  } else if (results.newUI.lazyColumns > 0) {
    console.log('[JobFiltr] Would use: STRATEGY 3 (LazyColumn)');
  } else if (results.links.jobsView > 0) {
    console.log('[JobFiltr] Would use: STRATEGY 4 (Link-based)');
  } else if (results.classes.scaffoldListItem > 0) {
    console.log('[JobFiltr] Would use: STRATEGY 5 (Class-based)');
  } else {
    console.log('[JobFiltr] No detection strategy matched - LinkedIn structure may have changed');
  }

  return results;
}

// Helper for diagnosis: count DIVs matching a pattern
function countDivsWithPattern(pattern) {
  let count = 0;
  const container = document.querySelector('main') || document.body;
  const divs = container.querySelectorAll('div');
  for (const div of divs) {
    if (pattern.test(div.textContent || '')) {
      count++;
    }
  }
  return count;
}

// Show job card
function showJobCard(jobCard) {
  jobCard.style.display = '';
  delete jobCard.dataset.jobfiltrHidden;
  delete jobCard.dataset.jobfiltrReasons;
  jobCard.setAttribute('data-jobfiltr-processed', 'true');
}

// Get all job cards with comprehensive detection
function getAllJobCards() {
  // Run DOM diagnosis once to help debug
  if (!window._jobfiltrDiagnosisRun) {
    window._jobfiltrDiagnosisRun = true;
    diagnoseLinkedInDOM();
  }

  // Use the multi-strategy structural detection
  const structuralCards = findJobCardsStructurally();
  if (structuralCards.length > 0) {
    return structuralCards;
  }

  // FALLBACK: Try class-based selectors from SELECTORS object
  const cards = new Set();
  for (const selector of SELECTORS.jobCards) {
    try {
      document.querySelectorAll(selector).forEach(card => cards.add(card));
    } catch (e) {
      // Invalid selector, skip
    }
  }

  if (cards.size > 0) {
    log(`Found ${cards.size} job cards via SELECTORS fallback`);
    return Array.from(cards);
  }

  log('No job cards found - LinkedIn DOM may not be ready yet');
  return [];
}

// Wait for job cards to appear with retry
async function waitForJobCards(maxWaitMs = 5000, checkIntervalMs = 500) {
  const startTime = Date.now();
  while (Date.now() - startTime < maxWaitMs) {
    const cards = getAllJobCards();
    if (cards.length > 0) {
      return cards;
    }
    await new Promise(r => setTimeout(r, checkIntervalMs));
  }
  log('Timeout waiting for job cards');
  return [];
}

// Main filter application with concurrent filtering prevention
async function applyFilters(settings) {
  if (isFilteringInProgress) {
    log('Filter already in progress, skipping');
    return;
  }

  isFilteringInProgress = true;
  filterSettings = settings;

  try {
    // DIAGNOSTIC: Color-coded log to track filter applications
    console.log('%c[applyFilters] CALLED - Setting filterSettings to:', 'background: #E91E63; color: white; padding: 2px 6px; font-weight: bold;');
    console.log('  includeKeywords:', JSON.stringify(settings.includeKeywords), '| filterIncludeKeywords:', settings.filterIncludeKeywords);
    console.log('  excludeKeywords:', JSON.stringify(settings.excludeKeywords), '| filterExcludeKeywords:', settings.filterExcludeKeywords);
    console.log('  Caller stack:', new Error().stack?.split('\n').slice(2, 5).join(' <- '));

    log('Applying filters with settings:', Object.keys(settings).filter(k => settings[k]));

    // DEBUG: Log keyword filter settings specifically
    log('KEYWORD DEBUG:');
    log('  filterIncludeKeywords:', settings.filterIncludeKeywords);
    log('  includeKeywords:', JSON.stringify(settings.includeKeywords));
    log('  filterExcludeKeywords:', settings.filterExcludeKeywords);
    log('  excludeKeywords:', JSON.stringify(settings.excludeKeywords));

    // Use waitForJobCards to handle LinkedIn's dynamic content loading
    const jobCards = await waitForJobCards(5000, 300);
    if (jobCards.length === 0) {
      log('No job cards found after waiting');
      return;
    }

    log(`Processing ${jobCards.length} job cards`);

    for (const jobCard of jobCards) {
      let shouldHide = false;
      const reasons = [];

      // Get job ID for caching
      const jobId = extractJobId(jobCard);

      // Filter 1: Staffing Firms (with display mode support)
      // Only show badge/styling when the filter is enabled
      const isStaffing = isStaffingFirm(jobCard);
      if (isStaffing && settings.hideStaffing) {
        const displayMode = settings.staffingDisplayMode || 'hide';
        if (displayMode === 'hide') {
          shouldHide = true;
          reasons.push('Staffing Firm');
        } else if (displayMode === 'dim') {
          applyStaffingDimEffect(jobCard);
        } else if (displayMode === 'flag') {
          addStaffingBadge(jobCard);
        }
      } else {
        removeStaffingStyling(jobCard);
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

      // Filter 6.5: Work Type Unclear Badge
      // Shows warning badge when True Remote Accuracy is active but job has no work type info
      removeWorkTypeBadge(jobCard);
      if (settings.trueRemoteAccuracy && settings.showWorkTypeUnclear !== false && !shouldHide) {
        const workType = detectWorkLocationType(jobCard);
        if (workType.type === 'unclear') {
          addWorkTypeUnclearBadge(jobCard);
          log(`Work Type Unclear badge added: ${workType.details}`);
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

      // Filter 8b: Exclude Companies
      if (settings.filterExcludeCompanies && settings.excludeCompanies?.length > 0 && !shouldHide) {
        if (matchesExcludeCompanies(jobCard, settings.excludeCompanies)) {
          shouldHide = true;
          reasons.push('Excluded company');
        }
      }

      // Filter 9: Salary Info
      if (settings.filterSalary && settings.hideNoSalary && !shouldHide) {
        if (!hasSalaryInfo(jobCard)) {
          shouldHide = true;
          reasons.push('No salary');
        }
      }

      // Filter 10: Community-Reported Companies (highlight with orange)
      // Always check - showCommunityReportedWarnings defaults to true
      if (settings.showCommunityReportedWarnings !== false) {
        const reportResult = checkReportedCompanyFromCard(jobCard);
        if (reportResult) {
          applyReportedCompanyHighlight(jobCard, reportResult);
        } else {
          // Remove styling if company is not in the reported list
          removeReportedCompanyStyling(jobCard);
        }
      } else {
        // Remove styling when feature is disabled
        removeReportedCompanyStyling(jobCard);
      }

      // Filter 11: Actively Recruiting Badge
      removeActiveRecruitingBadge(jobCard);
      if (settings.showActiveRecruiting) {
        const recruitingInfo = isActivelyRecruiting(jobCard);
        if (recruitingInfo) {
          if (settings.hideStalePostings && recruitingInfo.active === false && recruitingInfo.days >= 30) {
            shouldHide = true;
            reasons.push(`Stale posting: ${recruitingInfo.days} days old`);
          }
          if (!shouldHide) {
            addActiveRecruitingBadge(jobCard, recruitingInfo);
          }
        }
      }

      // Filter 12: Visa Sponsorship Only
      if (settings.visaOnly && !shouldHide) {
        const hasVisa = hasVisaSponsorship(jobCard);
        if (hasVisa) {
          jobCard.dataset.jobfiltrVisaSponsorship = 'true';
        } else if (jobCard.dataset.jobfiltrVisaSponsorship !== 'true') {
          shouldHide = true;
          reasons.push('No visa sponsorship mentioned');
        }
      }

      // Apply visibility
      if (shouldHide) {
        hideJobCard(jobCard, reasons);
        removeBenefitsBadge(jobCard);
      } else {
        showJobCard(jobCard);
        removeBenefitsBadge(jobCard);
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

    // Also update detail panel badge
    if (settings.showJobAge) {
      addJobAgeToDetailPanel();
    }

    log(`Filtered ${getHiddenJobsCount()} jobs out of ${jobCards.length}`);

  } finally {
    isFilteringInProgress = false;
  }
}

// Reset all filters
function resetFilters() {
  stopPeriodicScan();
  filterSettings = {};

  const jobCards = getAllJobCards();
  for (const jobCard of jobCards) {
    showJobCard(jobCard);
    // Remove all badges
    const allBadgeTypes = [
      '.jobfiltr-age-badge',
      '.jobfiltr-badge',
      '.jobfiltr-benefits-badge',
      '.jobfiltr-entry-level-badge',
      '.jobfiltr-early-applicant-badge',
      '.jobfiltr-card-reported-badge',
      '.jobfiltr-staffing-badge',
      '.jobfiltr-worktype-badge'
    ];
    jobCard.querySelectorAll(allBadgeTypes.join(', ')).forEach(b => b.remove());
    delete jobCard.dataset.jobfiltrAge;

    // Remove community-reported styling
    removeReportedCompanyStyling(jobCard);

    // Remove work type badge
    removeWorkTypeBadge(jobCard);

    // Remove staffing styling (dim effect)
    removeStaffingStyling(jobCard);
  }

  // Remove detail panel badges
  document.querySelectorAll('.jobfiltr-detail-age-badge, .jobfiltr-detail-badge, .jobfiltr-benefits-badge, .jobfiltr-reported-company-badge').forEach(b => b.remove());

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

    // Filter 1: Staffing Firms (with display mode support)
    // Only show badge/styling when the filter is enabled
    const isStaffing = isStaffingFirm(jobCard);
    if (isStaffing && filterSettings.hideStaffing) {
      const displayMode = filterSettings.staffingDisplayMode || 'hide';
      if (displayMode === 'hide') {
        shouldHide = true;
        reasons.push('Staffing Firm');
      } else if (displayMode === 'dim') {
        applyStaffingDimEffect(jobCard);
      } else if (displayMode === 'flag') {
        addStaffingBadge(jobCard);
      }
    } else {
      removeStaffingStyling(jobCard);
    }

    if (filterSettings.hideSponsored && isSponsored(jobCard)) {
      shouldHide = true;
      reasons.push('Sponsored');
    }

    // True Remote Accuracy
    if (filterSettings.trueRemoteAccuracy && !shouldHide) {
      if (detectNonRemoteIndicators(jobCard, filterSettings)) {
        shouldHide = true;
        reasons.push('Non-remote');
      }
    }

    // Work Type Unclear Badge
    removeWorkTypeBadge(jobCard);
    if (filterSettings.trueRemoteAccuracy && filterSettings.showWorkTypeUnclear !== false && !shouldHide) {
      const workType = detectWorkLocationType(jobCard);
      if (workType.type === 'unclear') {
        addWorkTypeUnclearBadge(jobCard);
      }
    }

    // CRITICAL FIX: Include Keywords filter (was missing - caused jobs to reappear)
    if (filterSettings.filterIncludeKeywords && filterSettings.includeKeywords?.length > 0 && !shouldHide) {
      if (!matchesIncludeKeywords(jobCard, filterSettings.includeKeywords)) {
        shouldHide = true;
        reasons.push('Missing keywords');
      }
    }

    // CRITICAL FIX: Exclude Keywords filter (was missing - caused jobs to reappear)
    if (filterSettings.filterExcludeKeywords && filterSettings.excludeKeywords?.length > 0 && !shouldHide) {
      if (matchesExcludeKeywords(jobCard, filterSettings.excludeKeywords)) {
        shouldHide = true;
        reasons.push('Excluded keywords');
      }
    }

    // Exclude Companies filter
    if (filterSettings.filterExcludeCompanies && filterSettings.excludeCompanies?.length > 0 && !shouldHide) {
      if (matchesExcludeCompanies(jobCard, filterSettings.excludeCompanies)) {
        shouldHide = true;
        reasons.push('Excluded company');
      }
    }

    // Actively Recruiting Badge
    removeActiveRecruitingBadge(jobCard);
    if (filterSettings.showActiveRecruiting) {
      const recruitingInfo = isActivelyRecruiting(jobCard);
      if (recruitingInfo) {
        if (filterSettings.hideStalePostings && recruitingInfo.active === false && recruitingInfo.days >= 30) {
          shouldHide = true;
          reasons.push(`Stale posting: ${recruitingInfo.days} days old`);
        }
        if (!shouldHide) {
          addActiveRecruitingBadge(jobCard, recruitingInfo);
        }
      }
    }

    // Visa Sponsorship Only
    if (filterSettings.visaOnly && !shouldHide) {
      const hasVisa = hasVisaSponsorship(jobCard);
      if (hasVisa) {
        jobCard.dataset.jobfiltrVisaSponsorship = 'true';
      } else if (jobCard.dataset.jobfiltrVisaSponsorship !== 'true') {
        shouldHide = true;
        reasons.push('No visa sponsorship mentioned');
      }
    }

    if (shouldHide) {
      hideJobCard(jobCard, reasons);
    } else {
      showJobCard(jobCard);
    }

    // Community-reported companies detection (orange highlight)
    if (filterSettings.showCommunityReportedWarnings !== false) {
      const reportResult = checkReportedCompanyFromCard(jobCard);
      if (reportResult) {
        applyReportedCompanyHighlight(jobCard, reportResult);
      }
    }

    // Add age badge if needed
    const jobId = extractJobId(jobCard);
    if (filterSettings.showJobAge && jobId) {
      await renderJobAgeBadge(jobCard, jobId);
    }

    // Remove any existing benefits badges (feature removed)
    removeBenefitsBadge(jobCard);

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

// Update a specific job card's badge with age data from detail panel or cache
// This enables propagation: detail panel extraction -> job card badge
function updateJobCardBadge(jobId, days) {
  if (!jobId || days === null || days === undefined) return;

  // Find the job card by various selectors
  const card = document.querySelector(
    `[data-job-id="${jobId}"], [data-occludable-job-id="${jobId}"], li[data-occludable-job-id="${jobId}"] .job-card-container`
  );
  if (!card) return;

  // Check if badge already exists
  const existingBadge = card.querySelector('.jobfiltr-age-badge');
  if (existingBadge) {
    // Update existing badge with new data
    const colors = getAgeBadgeColors(days);
    const ageText = formatJobAge(days);
    existingBadge.innerHTML = `<span style="margin-right:4px;">${colors.icon}</span>${ageText}`;
    existingBadge.style.background = colors.bg;
    existingBadge.style.color = colors.text;
    existingBadge.dataset.age = days.toString();
    card.dataset.jobfiltrAge = days.toString();
    log(`Updated existing card badge for job ${jobId}: ${days} days`);
  } else {
    // Store age in card dataset for renderJobAgeBadge to use
    card.dataset.jobfiltrAge = days.toString();
    // Render new badge
    renderJobAgeBadge(card, jobId);
    log(`Created card badge for job ${jobId}: ${days} days`);
  }
}

// Refresh badges for multiple jobs when API data arrives
// Called when API interceptor captures batch job data
function refreshJobCardBadges(jobs) {
  if (!filterSettings.showJobAge) return;
  if (!jobs || !Array.isArray(jobs) || jobs.length === 0) return;

  log(`Refreshing badges for ${jobs.length} jobs from API data`);

  requestAnimationFrame(() => {
    let updated = 0;
    for (const job of jobs) {
      if (job.id && job.listedAt) {
        // Calculate days from listedAt timestamp
        const listedDate = new Date(job.listedAt);
        if (!isNaN(listedDate.getTime())) {
          const days = Math.floor((Date.now() - listedDate.getTime()) / (1000 * 60 * 60 * 24));
          if (days >= 0 && days <= 365) {
            updateJobCardBadge(job.id, days);
            updated++;
          }
        }
      }
    }
    if (updated > 0) {
      log(`Updated ${updated} job card badges from API data`);
    }
  });
}

// Render job age badge on job card
async function renderJobAgeBadge(jobCard, jobId) {
  // Check if badge already exists inside this card
  if (jobCard.querySelector('.jobfiltr-age-badge')) return;

  // CRITICAL FIX: Add badges to the innermost job card element to prevent duplicates
  // If this is an outer wrapper, find the inner card and add badge there
  const innerJobCard = jobCard.querySelector('[data-job-id], .job-card-container');
  if (innerJobCard) {
    // This is an outer wrapper (like scaffold-layout__list-item)
    // Add badge to the inner job card instead
    if (innerJobCard.querySelector('.jobfiltr-age-badge')) return;
    jobCard = innerJobCard;  // Use inner card for badge insertion
  }

  // Also check if a parent element already has a badge (prevent duplicates from race conditions)
  const parentCard = jobCard.parentElement?.closest('[data-occludable-job-id]');
  if (parentCard && parentCard.querySelector('.jobfiltr-age-badge')) return;

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
    background: ${colors.bg} !important;
    color: ${colors.text} !important;
    padding: 4px 10px !important;
    border-radius: 12px !important;
    font-size: 11px !important;
    font-weight: 600 !important;
    box-shadow: 0 2px 4px rgba(0,0,0,0.15) !important;
    border: 1px solid ${colors.text}30 !important;
    display: flex !important;
    align-items: center !important;
    pointer-events: none !important;
    white-space: nowrap !important;
    line-height: 1 !important;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
  `;

  // Use shared wrapper so age badge sits next to recruiting badge
  const wrapper = getOrCreateCardBadgesWrapper(jobCard);
  // Append age badge (rightmost position)
  wrapper.appendChild(badge);

  // CRITICAL FIX: Mark card as processed so periodic scan handles it correctly
  // Without this, React re-renders can clear badges and they won't be re-added
  jobCard.setAttribute('data-jobfiltr-processed', 'true');
}

// Helper: Wait for an element to appear in the DOM with timeout
// Useful for LinkedIn's async React rendering
async function waitForElement(selectorArray, maxWaitMs = 3000) {
  const startTime = Date.now();
  while (Date.now() - startTime < maxWaitMs) {
    const el = queryWithFallbacks(document, selectorArray);
    if (el) return el;
    await new Promise(r => setTimeout(r, 100));
  }
  return null;
}

// Lock to prevent concurrent detail panel badge updates
let detailPanelBadgeLock = false;
let detailPanelBadgeLockTime = 0;
let detailPanelBadgeCallId = 0;

// Cache for fast badge re-injection when LinkedIn re-renders
let lastAgeBadgeCache = { jobId: null, days: null };

/**
 * Get or create a shared badges container inside the LinkedIn detail panel top card.
 * Both age badge and ghost badge use this container for consistent positioning.
 * Placed after the primary description (location/time/applicants line).
 */
function getOrCreateLinkedInBadgesContainer() {
  // Return existing container if present
  let container = document.querySelector('.jobfiltr-linkedin-badges-container');
  if (container) return container;

  // Find the primary description container in the detail panel top card
  // This is the line showing "Location · X days ago · Y applicants"
  const insertionTargets = [
    '.job-details-jobs-unified-top-card__primary-description-container',
    '.jobs-unified-top-card__primary-description',
    '.jobs-details-top-card__content-container',
  ];

  let anchor = null;
  for (const sel of insertionTargets) {
    anchor = document.querySelector(sel);
    if (anchor) break;
  }

  // Fallback: content-based detection for both classic and new obfuscated UI
  // Search all spans for metadata text with "ago" pattern, filtering to right panel
  if (!anchor) {
    const allSpans = document.querySelectorAll('span');
    for (const span of allSpans) {
      const text = span.textContent?.trim() || '';
      if (/\d+\s*(second|minute|hour|day|week|month)s?\s*ago/i.test(text) || text.toLowerCase() === 'today') {
        // Filter to right panel (detail panel) to avoid matching left panel job cards
        const rect = span.getBoundingClientRect();
        if (rect.x < 500 || rect.width === 0) continue;

        // Walk up to find the metadata container (typically a <p> or div)
        let parent = span.parentElement;
        for (let i = 0; i < 5 && parent; i++) {
          if (parent.childElementCount >= 1 && parent.getBoundingClientRect().height > 15) {
            anchor = parent;
            break;
          }
          parent = parent.parentElement;
        }
        if (anchor) break;
      }
    }
  }

  if (!anchor) {
    log('Could not find insertion anchor for LinkedIn badges container');
    return null;
  }

  // Create the badges container
  container = document.createElement('div');
  container.className = 'jobfiltr-linkedin-badges-container';
  container.style.cssText = `
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
    margin: 8px 0 4px 0;
    padding: 0;
  `;

  // Insert after the anchor element
  anchor.insertAdjacentElement('afterend', container);
  log('Created LinkedIn badges container after primary description');

  // Adopt any orphaned badges that were inserted before this container existed
  // Order: ghost badge first, then age badge, then community reported badge last
  const orphanedGhost = document.querySelector('.jobfiltr-ghost-score:not(.jobfiltr-linkedin-badges-container .jobfiltr-ghost-score)');
  if (orphanedGhost) {
    container.appendChild(orphanedGhost);
    log('Adopted orphaned ghost badge into badges container');
  }
  const orphanedReported = document.querySelector('.jobfiltr-reported-company-badge:not(.jobfiltr-linkedin-badges-container .jobfiltr-reported-company-badge)');
  if (orphanedReported) {
    container.appendChild(orphanedReported);
    log('Adopted orphaned community reported badge into badges container');
  }

  return container;
}

// Add job age badge to detail panel
// Works with or without infrastructure - DOM extraction always available
// CRITICAL FIX: Uses content-based detection for LinkedIn's obfuscated DOM
async function addJobAgeToDetailPanel() {
  if (!filterSettings.showJobAge) return;

  // Lock with timeout safety - force-release if stuck for more than 10 seconds
  if (detailPanelBadgeLock) {
    if (Date.now() - detailPanelBadgeLockTime > 10000) {
      log('Force-releasing stuck detail panel badge lock');
      detailPanelBadgeLock = false;
    } else {
      log('Detail panel badge update already in progress, skipping');
      return;
    }
  }

  detailPanelBadgeLock = true;
  detailPanelBadgeLockTime = Date.now();
  const thisCallId = ++detailPanelBadgeCallId;

  try {
    // Try to get job ID from URL
    const urlMatch = window.location.href.match(/currentJobId=(\d+)|\/jobs\/view\/(\d+)/);
    const jobId = urlMatch?.[1] || urlMatch?.[2];

    // If a CURRENT badge already exists for this job, don't flash by removing/re-adding
    const existingBadge = document.querySelector('.jobfiltr-detail-age-badge');
    if (existingBadge && existingBadge.dataset.jobfiltrJobId === jobId) {
      return; // Badge is current and correct, no action needed
    }

    // Remove stale badges (from different job or without jobId)
    document.querySelectorAll('.jobfiltr-detail-age-badge').forEach(b => b.remove());

    // Short delay to let LinkedIn finish rendering
    await new Promise(r => setTimeout(r, 150));

    let days = null;
    let ageTextElement = null;

    // CONTENT-BASED DETECTION FIRST: Right-panel span is the most accurate source
    // for the detail badge. Caches may contain stale/wrong values from card processing.
    {
      const allSpans = document.querySelectorAll('span');
      for (const span of allSpans) {
        const text = span.textContent?.trim();
        if (text && /^(Reposted\s+)?\d+\s*(second|minute|hour|day|week|month)s?\s*ago$/i.test(text)) {
          const rect = span.getBoundingClientRect();
          if (rect.width === 0) continue;
          if (rect.x > 500) {
            const parsed = parseJobAge(text);
            if (parsed !== null) {
              days = parsed;
              ageTextElement = span;
              log(`Found age text in detail panel: "${text}" = ${days} days`);
              break;
            }
          }
        }
      }
    }

    // Try caches only if no right-panel span found
    if (days === null && jobId && window.badgeStateManager?.initialized) {
      const cached = window.badgeStateManager.getBadgeData(jobId);
      if (cached?.age !== undefined) {
        days = cached.age;
      }
    }
    if (days === null && jobId && window.linkedInJobCache?.initialized) {
      const cacheAge = window.linkedInJobCache.getJobAgeFromCache(jobId);
      if (cacheAge !== null) {
        days = Math.floor(cacheAge);
      }
    }

    // Left-panel fallback as last resort for content detection
    if (days === null) {
      const allSpans = document.querySelectorAll('span');
      for (const span of allSpans) {
        const text = span.textContent?.trim();
        if (text && /^(Reposted\s+)?\d+\s*(second|minute|hour|day|week|month)s?\s*ago$/i.test(text)) {
          const rect = span.getBoundingClientRect();
          if (rect.width === 0) continue;
          const parsed = parseJobAge(text);
          if (parsed !== null) {
            days = parsed;
            ageTextElement = span;
            log(`Using left panel age fallback: ${days} days`);
            break;
          }
        }
      }
    }

    // Fallback: Look for "Today" or "Just now" patterns
    if (days === null) {
      const allSpans = document.querySelectorAll('span');
      for (const span of allSpans) {
        const text = span.textContent?.trim().toLowerCase();
        if (text === 'today' || text === 'just now' || text === 'just posted') {
          days = 0;
          ageTextElement = span;
          log('Found "Today" age text');
          break;
        }
      }
    }

    // Try active card badge fallback
    if (days === null) {
      // Look for any job card with a badge that's currently "active" or visible
      const allBadges = document.querySelectorAll('.jobfiltr-age-badge[data-age]');
      for (const badge of allBadges) {
        // Check if this badge's card is somehow related to the current URL job ID
        const card = badge.closest('[data-occludable-job-id], [data-job-id]');
        if (card) {
          const cardJobId = card.getAttribute('data-occludable-job-id') || card.getAttribute('data-job-id');
          if (cardJobId === jobId) {
            days = parseInt(badge.dataset.age, 10);
            log(`Got age ${days} from matching card badge`);
            break;
          }
        }
      }
    }

    if (days === null || isNaN(days) || days < 0 || days > 365) {
      log('Could not determine job age for detail panel');
      return;
    }

    const colors = getAgeBadgeColors(days);
    const ageText = formatJobAge(days);

    const badge = document.createElement('div');
    badge.className = 'jobfiltr-detail-age-badge';
    badge.dataset.jobfiltrJobId = jobId;
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
      padding: 10px 14px;
      border-radius: 10px;
      font-size: 13px;
      font-weight: 700;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      border: 1.5px solid ${colors.text}40;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: fit-content;
      cursor: default;
      display: flex;
      align-items: center;
      min-height: 67px;
      box-sizing: border-box;
    `;

    // CRITICAL FIX: Final check before inserting - another call may have added a badge
    // Also verify this is still the latest call (callId matches)
    if (document.querySelector('.jobfiltr-detail-age-badge') || thisCallId !== detailPanelBadgeCallId) {
      log('Badge already exists or newer call in progress, skipping insert');
      return;
    }

    // INLINE DOM INSERTION: Insert badge inside the detail panel top card area
    // Uses a shared badges container that both age badge and ghost badge can share
    const badgesContainer = getOrCreateLinkedInBadgesContainer();
    if (badgesContainer) {
      // Insert age badge before any community reported badge (which should always be last)
      const reportedBadge = badgesContainer.querySelector('.jobfiltr-reported-company-badge');
      if (reportedBadge) {
        badgesContainer.insertBefore(badge, reportedBadge);
      } else {
        badgesContainer.appendChild(badge);
      }
      log('Inserted detail age badge inline in badges container');

      // Ensure community reported badge stays last (re-append if present)
      if (reportedBadge) {
        badgesContainer.appendChild(reportedBadge);
        log('Moved community reported badge to end of badges container');
      }

      // Cache badge data for fast re-injection after LinkedIn re-renders
      lastAgeBadgeCache = { jobId, days };
    } else {
      log('Could not find insertion point for detail age badge');
    }

    // NEW: Propagate age to job card badge
    // This ensures card badges appear after viewing detail panel
    if (jobId && days !== null) {
      // Cache the age for future use
      if (window.badgeStateManager?.initialized) {
        await window.badgeStateManager.setAgeBadge(jobId, days);
      }

      // Update the corresponding job card badge in the list
      updateJobCardBadge(jobId, days);
      log(`Propagated age ${days} days from detail panel to card for job ${jobId}`);
    }
  } catch (err) {
    console.error('[JobFiltr] addJobAgeToDetailPanel error:', err);
  } finally {
    // Always release the lock
    detailPanelBadgeLock = false;
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

  // Try structural detection first: find parent of job cards
  let container = null;
  const jobCards = findJobCardsStructurally();
  if (jobCards.length > 0) {
    // The container is typically the common parent of all job cards
    container = jobCards[0].parentElement;
    log('Found job list container via structural detection');
  }

  // Fallback to selector-based detection
  if (!container) {
    container = queryWithFallbacks(document, SELECTORS.jobListContainers);
  }

  // Ultimate fallback: observe document body
  if (!container) {
    container = document.body;
    log('Using document.body as observer target (fallback)');
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

  // Try standard selectors first
  let panel = queryWithFallbacks(document, SELECTORS.detailPanel.filter(s => !s.includes('lazy-column')));

  // Fallback: Find the RIGHT lazy column (detail panel, not job list)
  if (!panel) {
    const lazyColumns = document.querySelectorAll('[data-testid="lazy-column"]');
    const viewportWidth = window.innerWidth;
    for (const col of lazyColumns) {
      const rect = col.getBoundingClientRect();
      // Detail panel is the one on the right side
      if (rect.left > viewportWidth * 0.3 && rect.width > 200) {
        panel = col;
        log('Using lazy-column as detail panel observer target');
        break;
      }
    }
  }

  if (!panel) {
    panel = document.body;
    log('Using document.body as detail panel observer target (fallback)');
  }

  let lastJobUrl = '';

  detailPanelObserver = new MutationObserver(() => {
    // Detect job change by URL or by content
    const currentJobUrl = window.location.href;
    const badgeExists = !!document.querySelector('.jobfiltr-detail-age-badge');

    // Re-add badge if job changed OR badge was removed by React
    if (currentJobUrl !== lastJobUrl || !badgeExists) {
      lastJobUrl = currentJobUrl;

      // Debounced update
      clearTimeout(window.detailPanelUpdateTimer);
      window.detailPanelUpdateTimer = setTimeout(() => {
        if (filterSettings.showJobAge && !document.querySelector('.jobfiltr-detail-age-badge')) {
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
// Count actually-hidden job cards from the DOM (always accurate)
function getHiddenJobsCount() {
  return document.querySelectorAll('[data-jobfiltr-hidden="true"]').length;
}

function sendStatsUpdate() {
  if (!isExtensionContextValid()) return;

  try {
    chrome.runtime.sendMessage({
      type: 'FILTER_STATS_UPDATE',
      hiddenCount: getHiddenJobsCount(),
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
      hiddenCount: getHiddenJobsCount(),
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
    // DIAGNOSTIC: Log exactly what we received
    console.log('%c[APPLY_FILTERS] Received settings from popup:', 'background: #4CAF50; color: white; padding: 2px 6px;');
    console.log('  filterIncludeKeywords:', message.settings?.filterIncludeKeywords);
    console.log('  includeKeywords:', JSON.stringify(message.settings?.includeKeywords));
    console.log('  filterExcludeKeywords:', message.settings?.filterExcludeKeywords);
    console.log('  excludeKeywords:', JSON.stringify(message.settings?.excludeKeywords));

    // CRITICAL FIX: Save settings to storage so they persist across URL changes
    // Without this, loadAndApplyFilters() would overwrite in-memory settings with stale storage data
    chrome.storage.local.set({ filterSettings: message.settings }).then(() => {
      log('APPLY_FILTERS: Saved settings to storage (including keywords)');
      // Verify what was actually saved
      chrome.storage.local.get('filterSettings').then(result => {
        console.log('%c[APPLY_FILTERS] Verified storage after save:', 'background: #2196F3; color: white; padding: 2px 6px;');
        console.log('  includeKeywords in storage:', JSON.stringify(result.filterSettings?.includeKeywords));
        console.log('  excludeKeywords in storage:', JSON.stringify(result.filterSettings?.excludeKeywords));
      });
    }).catch(err => {
      log('APPLY_FILTERS: Failed to save to storage:', err);
    });

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
      hiddenCount: getHiddenJobsCount(),
      site: 'linkedin'
    });
    return true;
  }

  if (message.type === 'COUNT_VISA_SPONSORSHIP') {
    const counts = countVisaSponsorshipJobs();
    sendResponse({ success: true, data: counts });
    return true;
  }

  if (message.type === 'COUNT_SPONSORED_JOBS') {
    const counts = countSponsoredJobs();
    sendResponse({ success: true, data: counts });
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
// CRITICAL FIX: Force full re-initialization on navigation to handle React re-renders
let lastUrlValue = location.href;
const urlObserver = new MutationObserver(() => {
  if (location.href !== lastUrlValue) {
    const oldUrl = lastUrlValue;
    lastUrlValue = location.href;

    // Track job ID from new URL (for new LinkedIn UI)
    trackJobIdFromUrl();

    log('URL changed, forcing full re-initialization');

    // Check if this is just a job selection change (same page, different job)
    const oldJobId = getJobIdFromUrl(oldUrl);
    const newJobId = getJobIdFromUrl(lastUrlValue);
    const isJobSelectionChange = oldJobId !== newJobId && newJobId;

    if (isJobSelectionChange) {
      // Quick update for job selection - just update detail panel
      log(`Job selection changed: ${oldJobId} -> ${newJobId}`);
      setTimeout(() => {
        if (filterSettings.showJobAge) {
          addJobAgeToDetailPanel();
        }
      }, 500);
    }

    // CRITICAL: Clear all processed markers so badges can be re-added
    // LinkedIn's React may have removed badges during navigation
    document.querySelectorAll('[data-jobfiltr-processed]').forEach(el => {
      el.removeAttribute('data-jobfiltr-processed');
    });

    // Also clear age data so it gets refreshed
    document.querySelectorAll('[data-jobfiltr-age]').forEach(el => {
      el.removeAttribute('data-jobfiltr-age');
    });

    // Remove any orphaned badges that may have lost their context
    document.querySelectorAll('.jobfiltr-age-badge, .jobfiltr-detail-age-badge').forEach(b => {
      b.remove();
    });

    setTimeout(async () => {
      currentPage = detectCurrentPage();
      checkForPageChange();
      initializeObservers();

      // Force reload settings from storage to ensure fresh state
      await loadAndApplyFilters();

      // Apply filters even if loadAndApplyFilters already did (ensures badges render)
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
// Updated to work with content-based detected cards (new LinkedIn UI)
document.addEventListener('click', (e) => {
  // Try legacy selectors first
  let jobCard = e.target.closest('li.jobs-search-results__list-item, .scaffold-layout__list-item, div.job-card-container');

  // If not found, check if the click target looks like a job card (for new LinkedIn UI)
  if (!jobCard) {
    let element = e.target;
    for (let i = 0; i < 10 && element && element !== document.body; i++) {
      const text = element.textContent || '';
      // Check if this element looks like a job card
      if (/\d+\s*(day|week|month|hour)s?\s*ago/i.test(text) &&
          (/\(remote\)|\(on-?site\)|\(hybrid\)/i.test(text) ||
           /\b(inc|llc|corp|company)\b/i.test(text))) {
        const rect = element.getBoundingClientRect();
        if (rect.width >= 250 && rect.width <= 600 && rect.height >= 60 && rect.height <= 300) {
          jobCard = element;
          break;
        }
      }
      element = element.parentElement;
    }
  }

  if (jobCard) {
    log('Job card clicked, updating detail panel');
    // Use multiple delays to handle varying load times
    [300, 600, 1000, 1500].forEach(delay => {
      setTimeout(() => {
        // Track job ID from URL after click
        trackJobIdFromUrl();

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
// NOTE: Auth check REMOVED - core features (job age badges, ghost detection, community reported)
// should work for ALL users, not just authenticated ones. Auth is only for premium/cloud features.
async function loadAndApplyFilters() {
  if (!isExtensionContextValid()) {
    log('Extension context invalid, cannot load filters');
    return;
  }

  try {
    console.log('%c[loadAndApplyFilters] Loading settings from storage...', 'background: #FF9800; color: white; padding: 2px 6px;');
    const result = await chrome.storage.local.get('filterSettings');

    // DIAGNOSTIC: Log exactly what we loaded
    console.log('%c[loadAndApplyFilters] Storage result:', 'background: #FF9800; color: white; padding: 2px 6px;');
    console.log('  Has settings:', !!result.filterSettings);
    console.log('  filterIncludeKeywords:', result.filterSettings?.filterIncludeKeywords);
    console.log('  includeKeywords:', JSON.stringify(result.filterSettings?.includeKeywords));
    console.log('  filterExcludeKeywords:', result.filterSettings?.filterExcludeKeywords);
    console.log('  excludeKeywords:', JSON.stringify(result.filterSettings?.excludeKeywords));

    if (result.filterSettings && Object.keys(result.filterSettings).length > 0) {
      // Merge with defaults - use user's settings, with defaults for undefined values
      filterSettings = {
        ...result.filterSettings,
        showJobAge: result.filterSettings.showJobAge !== false,  // Default true
        enableGhostAnalysis: result.filterSettings.enableGhostAnalysis !== false,  // Default true
        showCommunityReportedWarnings: result.filterSettings.showCommunityReportedWarnings !== false  // Default true
      };
      log('Loaded saved filter settings');

      // DIAGNOSTIC: Log what filterSettings now contains
      console.log('%c[loadAndApplyFilters] filterSettings after merge:', 'background: #9C27B0; color: white; padding: 2px 6px;');
      console.log('  includeKeywords:', JSON.stringify(filterSettings.includeKeywords));
      console.log('  excludeKeywords:', JSON.stringify(filterSettings.excludeKeywords));

      // Give page time to render
      setTimeout(() => {
        applyFilters(filterSettings);
      }, 1000);

      // Fallback: Ensure detail panel age badge appears even if mutation observer misses it
      // Use interval check that retries until badge appears or max attempts reached
      let detailBadgeRetries = 0;
      const detailBadgeInterval = setInterval(() => {
        detailBadgeRetries++;
        if (detailBadgeRetries > 10) {
          clearInterval(detailBadgeInterval);
          return;
        }
        if (filterSettings.showJobAge && !document.querySelector('.jobfiltr-detail-age-badge')) {
          addJobAgeToDetailPanel();
        } else {
          clearInterval(detailBadgeInterval);
        }
      }, 2000);
    } else {
      console.log('%c[loadAndApplyFilters] No saved settings found in storage', 'background: #f44336; color: white; padding: 2px 6px;');
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

  // Track job ID from initial URL (for new LinkedIn UI)
  trackJobIdFromUrl();

  // Initialize page tracking
  lastPageUrl = location.href;
  currentPage = detectCurrentPage();

  // Wait for and initialize infrastructure
  await initializeInfrastructure();
  const infrastructureOk = await waitForInfrastructure(3000);

  if (!infrastructureOk) {
    log('Infrastructure not fully ready - core filters will still work');
  }

  // Initialize observers
  let observerOk = initializeObservers();

  // Retry observers if needed
  if (!observerOk) {
    setTimeout(() => {
      if (!jobListObserver) initializeObservers();
    }, 2000);
  }

  // Load and apply saved filters (works for all users now - auth check removed)
  await loadAndApplyFilters();

  // Default feature values (used only when settings are undefined)
  const FEATURE_DEFAULTS = {
    showJobAge: true,
    enableGhostAnalysis: true,
    showCommunityReportedWarnings: true
  };

  // Fallback: Auto-apply filters from storage even if loadAndApplyFilters didn't run
  // This ensures filters work even in edge cases
  if (Object.keys(filterSettings).length === 0) {
    try {
      const result = await chrome.storage.local.get('filterSettings');
      if (result.filterSettings && Object.keys(result.filterSettings).length > 0) {
        log('Fallback: Loading filters from storage');
        // Use user settings with defaults for undefined values only
        filterSettings = {
          ...result.filterSettings,
          showJobAge: result.filterSettings.showJobAge !== false,  // Default true
          enableGhostAnalysis: result.filterSettings.enableGhostAnalysis !== false,  // Default true
          showCommunityReportedWarnings: result.filterSettings.showCommunityReportedWarnings !== false  // Default true
        };
      } else {
        // Apply feature defaults when no saved settings exist
        log('No saved settings found - applying feature defaults');
        filterSettings = { ...FEATURE_DEFAULTS };
      }
      setTimeout(() => {
        applyFilters(filterSettings);
      }, 500);
    } catch (e) {
      // On error, still apply feature defaults
      log('Storage error, applying feature defaults');
      filterSettings = { ...FEATURE_DEFAULTS };
      setTimeout(() => {
        applyFilters(filterSettings);
      }, 500);
    }
  }

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

  // Badge persistence: periodic check to re-inject detail panel age badge
  // LinkedIn's new reactive UI removes injected elements on re-render.
  // Self-sufficient: detects age inline without relying on async addJobAgeToDetailPanel()
  setInterval(() => {
    if (!filterSettings.showJobAge) return;
    const urlMatch = window.location.href.match(/currentJobId=(\d+)|\/jobs\/view\/(\d+)/);
    const currentJobId = urlMatch?.[1] || urlMatch?.[2];
    if (!currentJobId) return;

    // Remove stale badge from a DIFFERENT job (critical for client-side navigation)
    const existingBadge = document.querySelector('.jobfiltr-detail-age-badge');
    if (existingBadge) {
      if (existingBadge.dataset.jobfiltrJobId === currentJobId) return; // Badge is current, skip
      existingBadge.remove(); // Stale badge from previous job, remove it
      log('Removed stale age badge from previous job');
    }

    let days = null;

    // RIGHT-PANEL DETECTION FIRST: Most accurate source for the detail badge
    // Caches may have stale/wrong values from card processing
    {
      const allSpans = document.querySelectorAll('span');
      for (const span of allSpans) {
        const text = span.textContent?.trim();
        if (!text) continue;
        if (/^(Reposted\s+)?\d+\s*(second|minute|hour|day|week|month)s?\s*ago$/i.test(text)) {
          const rect = span.getBoundingClientRect();
          if (rect.width === 0 || rect.x <= 500) continue;
          const parsed = parseJobAge(text);
          if (parsed !== null) { days = parsed; break; }
        }
        const lower = text.toLowerCase();
        if (lower === 'today' || lower === 'just now' || lower === 'just posted') {
          const rect = span.getBoundingClientRect();
          if (rect.x > 500) { days = 0; break; }
        }
      }
    }

    // Cache fallback: only if no right-panel span found
    if (days === null && lastAgeBadgeCache.jobId === currentJobId && lastAgeBadgeCache.days !== null) {
      days = lastAgeBadgeCache.days;
    }
    if (days === null && window.badgeStateManager?.initialized) {
      const cached = window.badgeStateManager.getBadgeData(currentJobId);
      if (cached?.age !== undefined) days = cached.age;
    }
    if (days === null && window.linkedInJobCache?.initialized) {
      const cacheAge = window.linkedInJobCache.getJobAgeFromCache(currentJobId);
      if (cacheAge !== null) days = Math.floor(cacheAge);
    }

    if (days === null || isNaN(days) || days < 0 || days > 365) return;

    // Create and insert badge
    const colors = getAgeBadgeColors(days);
    const ageText = formatJobAge(days);
    const badge = document.createElement('div');
    badge.className = 'jobfiltr-detail-age-badge';
    badge.dataset.jobfiltrJobId = currentJobId;
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
      padding: 10px 14px;
      border-radius: 10px;
      font-size: 13px;
      font-weight: 700;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      border: 1.5px solid ${colors.text}40;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: fit-content;
      cursor: default;
      display: flex;
      align-items: center;
      min-height: 67px;
      box-sizing: border-box;
    `;

    // Double-check badge wasn't added by another path while we were building
    if (document.querySelector('.jobfiltr-detail-age-badge')) return;

    const container = getOrCreateLinkedInBadgesContainer();
    if (container) {
      const reported = container.querySelector('.jobfiltr-reported-company-badge');
      if (reported) {
        container.insertBefore(badge, reported);
      } else {
        container.appendChild(badge);
      }
      // Update cache for fast re-injection
      lastAgeBadgeCache = { jobId: currentJobId, days };
      log(`Periodic interval inserted age badge: ${days} days for job ${currentJobId}`);
    }
  }, 500);

  // === DIAGNOSTIC LOGGING ===
  // These logs help debug initialization issues
  console.log('[JobFiltr] === INITIALIZATION COMPLETE ===');
  console.log('[JobFiltr] Infrastructure ready:', infrastructureReady);
  console.log('[JobFiltr] Badge manager initialized:', window.badgeStateManager?.initialized || false);
  console.log('[JobFiltr] Job cache initialized:', window.linkedInJobCache?.initialized || false);
  console.log('[JobFiltr] Feature flags ready:', !!window.linkedInFeatureFlags?.flags);
  console.log('[JobFiltr] Filter settings:', JSON.stringify(filterSettings));
  console.log('[JobFiltr] Page:', currentPage);
  log(`LinkedIn content script ready (Page ${currentPage})`);
}

// Start initialization
init();

} // End of duplicate injection check (window.__jobfiltrInjected)
