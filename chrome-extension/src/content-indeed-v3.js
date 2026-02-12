// JobFiltr - Indeed Content Script V3
// Updated with 2025 DOM selectors and improved detection

console.log('JobFiltr V3: Indeed content script loaded');

let filterSettings = {};
let hiddenJobsCount = 0;
let lastSentHiddenCount = -1; // Track last sent count to prevent duplicate messages
let isFilteringInProgress = false; // Prevent concurrent filter runs

// ===== ULTRATHINK: Flash Prevention for Visa Filter =====
// Check visa filter state from storage IMMEDIATELY to prevent flash
// This runs before any DOM processing to hide cards before they render
(async function initFlashPrevention() {
  try {
    const result = await chrome.storage.local.get(['filterSettings']);
    if (result.filterSettings?.visaOnly) {
      document.body.classList.add('jobfiltr-visa-filter-active');
      console.log('[JobFiltr] Flash prevention: Visa filter active, hiding unprocessed cards');
    }
  } catch (e) {
    // Storage not available yet, will be handled by main init
  }
})();

/**
 * ULTRATHINK: Update body class for visa filter flash prevention
 * @param {boolean} isActive - Whether visa filter is active
 */
function updateVisaFilterFlashPrevention(isActive) {
  if (isActive) {
    document.body.classList.add('jobfiltr-visa-filter-active');
  } else {
    document.body.classList.remove('jobfiltr-visa-filter-active');
    // Remove processed markers when visa filter is disabled (for clean state)
    document.querySelectorAll('[data-jobfiltr-processed]').forEach(el => {
      delete el.dataset.jobfiltrProcessed;
    });
  }
}

// ===== IMPROVED LOGGING =====
function log(message, data = null) {
  const timestamp = new Date().toISOString();
  if (data) {
    console.log(`[JobFiltr ${timestamp}] ${message}`, data);
  } else {
    console.log(`[JobFiltr ${timestamp}] ${message}`);
  }
}

// ===== EXTENSION CONTEXT VALIDATION =====
// Check if the extension context is still valid (not invalidated after reload)
function isExtensionContextValid() {
  try {
    // Accessing chrome.runtime.id will throw if context is invalidated
    return !!(chrome.runtime && chrome.runtime.id);
  } catch (e) {
    return false;
  }
}

// ===== JOB INFORMATION EXTRACTION (UPDATED 2025) =====
// ULTRATHINK: Comprehensive job extraction for Scanner tab
// Supports: /viewjob pages, /jobs search with vjk= selected job, and /rc/clk redirects
// FIX: Now async with retry logic for dynamically loaded content
async function extractJobInfo() {
  try {
    const url = window.location.href;
    log('Extracting job info from URL:', url);

    // ULTRATHINK: Check if we're on a page where job details are visible
    // 1. Direct job view: /viewjob?jk=xxx
    // 2. Search results with job selected: /jobs?...&vjk=xxx (detail panel visible)
    // 3. Click redirect: /rc/clk or /pagead/
    // 4. Any page with jk= or vjk= parameter (job key present)
    const urlParams = new URLSearchParams(window.location.search);
    const hasJobKey = urlParams.has('vjk') || urlParams.has('jk');
    const isViewJobPage = url.includes('/viewjob');
    const isJobsPage = url.includes('/jobs');
    const isRedirectPage = url.includes('/rc/clk') || url.includes('/pagead/');

    // Also check if a job detail panel is actually visible in the DOM
    const hasJobDetailPanel = document.querySelector(
      '#jobsearch-ViewjobPaneWrapper, ' +
      '.jobsearch-ViewJobLayout, ' +
      '.jobsearch-JobComponent, ' +
      '[data-testid="jobsearch-ViewJobLayout"], ' +
      '.jobsearch-RightPane'
    );

    const isJobDetailVisible = isViewJobPage || isRedirectPage || hasJobKey || hasJobDetailPanel;

    if (!isJobDetailVisible) {
      log('Not on a job posting page - no job detail visible');
      log(`URL check: viewjob=${isViewJobPage}, jobs=${isJobsPage}, hasKey=${hasJobKey}, hasPanel=${!!hasJobDetailPanel}`);
      return null;
    }

    log('Job detail context detected, extracting info...');

    // ULTRATHINK: Comprehensive title selectors for both search results panel and viewjob pages
    const titleSelectors = [
      // Search results detail panel selectors (right pane)
      '.jobsearch-JobInfoHeader-title',
      '.jobsearch-JobInfoHeader-title span',
      '[data-testid="jobsearch-JobInfoHeader-title"]',
      '[data-testid="jobsearch-JobInfoHeader-title"] span',
      // Direct viewjob page selectors
      'h1.jobsearch-JobInfoHeader-title span',
      'h1.jobsearch-JobInfoHeader-title',
      'h2.jobTitle > span',
      'h2.jobTitle span',
      'h2.jobTitle',
      'h1.jobTitle span',
      'h1.jobTitle',
      'h1[class*="jobTitle"]',
      'h2[class*="jobTitle"]',
      // Additional fallback selectors
      '[data-testid="job-title"]',
      '.icl-u-xs-mb--xs h1',
      '.jobsearch-ViewJobLayout h1'
    ];

    let title = null;
    for (const selector of titleSelectors) {
      const elem = document.querySelector(selector);
      if (elem) {
        title = elem.textContent.trim().replace(/\s+/g, ' ').trim();
        if (title && title.length > 0) {
          log(`Found title using selector: ${selector}`, title);
          break;
        }
      }
    }

    // ULTRATHINK: Comprehensive company selectors
    const companySelectors = [
      // Detail panel selectors
      '[data-testid="inlineHeader-companyName"]',
      '[data-testid="inlineHeader-companyName"] a',
      '.jobsearch-InlineCompanyRating-companyHeader',
      '.jobsearch-InlineCompanyRating-companyHeader a',
      // Viewjob page selectors
      '[data-company-name="true"]',
      '.jobsearch-CompanyInfoContainer a',
      '[data-testid="company-name"]',
      // Additional fallback selectors
      '.jobsearch-CompanyInfoWithoutHeaderImage a',
      '.icl-u-lg-mr--sm a',
      '[data-testid="jobsearch-CompanyInfoContainer"] a'
    ];

    let company = null;
    for (const selector of companySelectors) {
      const elem = document.querySelector(selector);
      if (elem) {
        company = elem.textContent.trim();
        if (company && company.length > 0) {
          log(`Found company using selector: ${selector}`, company);
          break;
        }
      }
    }

    // ULTRATHINK: Comprehensive location selectors
    const locationSelectors = [
      // Detail panel location selectors
      '[data-testid="inlineHeader-companyLocation"]',
      '[data-testid="job-location"]',
      '.jobsearch-JobInfoHeader-subtitle',
      '[data-testid="jobsearch-JobInfoHeader-subtitle"]',
      // Additional location selectors
      '.jobsearch-CompanyInfoContainer [data-testid*="location"]',
      '.companyLocation',
      '[data-testid="text-location"]',
      '.jobsearch-JobMetadataHeader-item',
      // Fallback: look for location-like content
      '.icl-u-xs-mt--xs .icl-IconFunctional--location + span'
    ];

    let location = null;
    for (const selector of locationSelectors) {
      const elem = document.querySelector(selector);
      if (elem) {
        const rawLocation = elem.textContent.trim();
        // Clean up location - remove extra metadata
        location = rawLocation
          .split(/[·•‧∙]/)[0]  // Split on dot-like separators
          .split(/\s+[-–—]\s+/)[0]  // Split on dashes with spaces
          .replace(/\s+Reposted.*$/i, '')
          .replace(/\s+Posted.*$/i, '')
          .replace(/\s*\d+\s*(day|hour|week|month)s?\s*ago.*$/i, '')
          .replace(/\s*\d+\s*applicants?.*$/i, '')
          .replace(/\s*Apply\s*now.*$/i, '')
          .trim();
        if (location && location.length > 0) {
          log(`Found location using selector: ${selector}`, location);
          break;
        }
      }
    }

    // ULTRATHINK: Description selectors (expanded for SSR and alternative containers)
    const descriptionSelectors = [
      '#jobDescriptionText',
      '.jobsearch-jobDescriptionText',
      '[data-testid="jobDescriptionText"]',
      '#job-description',
      '.jobsearch-JobComponent-description',
      // SSR and alternative containers (FIX: these were missing)
      '#viewJobSSRRoot .jobsearch-jobDescriptionText',
      '#viewJobSSRRoot [data-testid="jobDescriptionText"]',
      '#viewJobSSRRoot #jobDescriptionText',
      '.jobsearch-ViewJobLayout-jobDescription',
      '[data-testid="job-description-content"]',
      '.jobsearch-RightPane .jobsearch-jobDescriptionText',
      '#jobsearch-ViewjobPaneWrapper .jobsearch-jobDescriptionText'
    ];

    // FIX 5: Diagnostic debug logging to identify which selectors work
    log('=== DESCRIPTION EXTRACTION DEBUG ===');
    log('Available selectors:', descriptionSelectors.length);
    for (const selector of descriptionSelectors) {
      const elem = document.querySelector(selector);
      if (elem) {
        const text = elem.textContent?.trim() || '';
        log(`Selector "${selector}": FOUND (length: ${text.length})`);
      } else {
        log(`Selector "${selector}": NOT FOUND`);
      }
    }

    let description = '';
    for (const selector of descriptionSelectors) {
      const elem = document.querySelector(selector);
      if (elem) {
        description = elem.textContent.trim();
        if (description.length > 0) {
          log(`Found description using selector: ${selector}, length: ${description.length}`);
          break;
        }
      }
    }

    // FIX 7: Increased retry wait times (was 500ms, now 1000ms)
    if (!description || description.length === 0) {
      log('Description not found on first attempt, waiting 1000ms and retrying...');
      await new Promise(resolve => setTimeout(resolve, 1000));

      for (const selector of descriptionSelectors) {
        const elem = document.querySelector(selector);
        if (elem) {
          description = elem.textContent.trim();
          if (description.length > 0) {
            log(`Found description on RETRY using selector: ${selector}, length: ${description.length}`);
            break;
          }
        }
      }

      // FIX 7: Second retry with longer wait (was 1000ms, now 2000ms)
      if (!description || description.length === 0) {
        log('Description still not found, waiting 2000ms for final retry...');
        await new Promise(resolve => setTimeout(resolve, 2000));

        for (const selector of descriptionSelectors) {
          const elem = document.querySelector(selector);
          if (elem) {
            description = elem.textContent.trim();
            if (description.length > 0) {
              log(`Found description on FINAL RETRY using selector: ${selector}, length: ${description.length}`);
              break;
            }
          }
        }
      }
    }

    // FIX 6: Fallback description extraction if all selectors fail
    if (!description || description.length < 50) {
      log('All selectors failed, attempting fallback extraction...');

      // Try to find any large text container in the job detail area
      const containers = document.querySelectorAll(
        '#viewJobSSRRoot, ' +
        '.jobsearch-ViewJobLayout, ' +
        '#jobsearch-ViewjobPaneWrapper, ' +
        '.jobsearch-RightPane, ' +
        '[data-testid="viewJobBody"]'
      );

      for (const container of containers) {
        if (container) {
          // Find all paragraphs and divs with substantial text
          const textElements = container.querySelectorAll('p, div, section, ul, li');
          let longestText = description;
          for (const el of textElements) {
            const text = el.textContent?.trim() || '';
            // Look for substantial text blocks (job descriptions are usually 200+ chars)
            if (text.length > 200 && text.length > longestText.length) {
              longestText = text;
            }
          }
          if (longestText.length > description.length) {
            description = longestText;
            log(`Fallback found description from container, length: ${description.length}`);
            break;
          }
        }
      }
    }

    // FIX 10: ULTIMATE FALLBACK - Get visible text from the page body
    // If ALL selectors failed, grab visible page text as last resort
    if (!description || description.length < 100) {
      log('All extraction methods failed, using body text fallback...');

      // Try to find any large text container in the job detail area
      const mainContent = document.querySelector(
        'main, [role="main"], #main, .jobsearch-ViewJobLayout, ' +
        '#viewJobSSRRoot, #jobsearch-ViewjobPaneWrapper, .jobsearch-RightPane'
      );

      if (mainContent) {
        const bodyText = mainContent.innerText || mainContent.textContent || '';
        // Take a reasonable chunk of text (first 5000 chars)
        if (bodyText.length > 200) {
          description = bodyText.substring(0, 5000).trim();
          log(`Ultimate fallback found text, length: ${description.length}`);
        }
      }

      // If still empty, try document body as absolute last resort
      if (!description || description.length < 100) {
        const fullBody = document.body.innerText || '';
        if (fullBody.length > 500) {
          // Extract middle portion (skip nav/header, avoid footer)
          const start = Math.floor(fullBody.length * 0.15);
          const end = Math.min(start + 5000, fullBody.length * 0.85);
          description = fullBody.substring(start, end).trim();
          log(`Document body fallback found text, length: ${description.length}`);
        }
      }
    }

    // Posted date selectors for Scanner analysis
    const postedDateSelectors = [
      '[data-testid="myJobsStateDate"]',
      '.jobsearch-JobMetadataFooter [data-testid*="date"]',
      '.jobsearch-HiringInsights-entry--text',
      '.jobsearch-JobMetadataHeader-item:last-child',
      '[class*="posted"]',
      '.date'
    ];

    let postedDate = null;
    for (const selector of postedDateSelectors) {
      const elem = document.querySelector(selector);
      if (elem) {
        const text = elem.textContent.trim();
        // CRITICAL FIX: Match ALL Indeed date formats including "Active X days ago" and "EmployerActive X days ago"
        // This pattern MUST match everything that parsePostingAge() can handle
        const datePattern = /(?:employer\s*)?active\s*\d+\s*days?\s*ago|\d+\+?\s*(day|hour|week|month|minute)s?\s*ago|posted\s*(today|yesterday|just\s*now|\d+\s*(day|hour|week|month|minute)s?\s*ago)|\btoday\b|\byesterday\b|just\s*(?:posted|now)|moments?\s*ago/i;
        if (datePattern.test(text)) {
          postedDate = text;
          log(`Found posted date using selector: ${selector}`, postedDate);
          break;
        }
      }
    }

    // ULTRATHINK FIX: If no visible date found, extract from JSON-LD structured data
    // Indeed embeds datePosted in JSON-LD schema.org JobPosting data
    log('POSTED DATE DEBUG: DOM extraction result:', postedDate);
    if (!postedDate) {
      log('POSTED DATE DEBUG: Attempting JSON-LD extraction...');
      try {
        const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
        log('POSTED DATE DEBUG: Found JSON-LD scripts:', jsonLdScripts.length);
        for (const script of jsonLdScripts) {
          const data = JSON.parse(script.textContent);
          log('POSTED DATE DEBUG: JSON-LD type:', data['@type'], 'has datePosted:', !!data.datePosted);
          if (data['@type'] === 'JobPosting' && data.datePosted) {
            // Convert ISO date to "X days ago" format for the scanner
            const postedDateObj = new Date(data.datePosted);
            const now = new Date();
            const diffMs = now - postedDateObj;
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

            // IMPORTANT: Always use days format for precision in scanner analysis
            // The scanner's parsePostingAge function handles days most accurately
            if (diffDays === 0) {
              postedDate = 'Posted today';
            } else if (diffDays === 1) {
              postedDate = 'Posted 1 day ago';
            } else {
              // Use days directly for maximum precision (scanner uses days for risk calculation)
              postedDate = `Posted ${diffDays} days ago`;
            }
            log(`Found posted date from JSON-LD: ${data.datePosted} -> ${postedDate} (${diffDays} days)`);
            break;
          }
        }
      } catch (e) {
        log('Error parsing JSON-LD for posted date:', e);
      }
    }

    // SCANNER FIX: If still no postedDate, try the jobAgeCache (used by badges)
    // This cache is populated from Indeed's mosaic data and is more reliable
    if (!postedDate) {
      const jobKey = urlParams.get('vjk') || urlParams.get('jk');
      if (jobKey) {
        // Ensure the cache is populated by extracting from page data first
        try {
          if (typeof extractJobAgesFromPageData === 'function') {
            extractJobAgesFromPageData();
          }
        } catch (e) {
          log('POSTED DATE DEBUG: Error calling extractJobAgesFromPageData:', e);
        }

        // Now check the cache
        if (typeof jobAgeCache !== 'undefined' && jobAgeCache[jobKey] !== undefined) {
          const ageDays = jobAgeCache[jobKey];
          log('POSTED DATE DEBUG: Found age in jobAgeCache for', jobKey, '->', ageDays, 'days');
          if (ageDays === 0) {
            postedDate = 'Posted today';
          } else if (ageDays === 1) {
            postedDate = 'Posted 1 day ago';
          } else {
            // Use exact day count for scanner precision (parsePostingAge handles "X days ago" format)
            postedDate = `Posted ${Math.round(ageDays)} days ago`;
          }
          log('POSTED DATE DEBUG: Set postedDate from jobAgeCache:', postedDate);
        } else {
          log('POSTED DATE DEBUG: jobAgeCache miss for jobKey:', jobKey, 'cache keys:', typeof jobAgeCache !== 'undefined' ? Object.keys(jobAgeCache).length : 'undefined');
        }
      }
    }

    // Build the job URL - use current URL or construct from job key
    let jobUrl = url;
    if (hasJobKey && !isViewJobPage) {
      // If we're on search results, construct a direct job link
      const jobKey = urlParams.get('vjk') || urlParams.get('jk');
      if (jobKey) {
        jobUrl = `https://www.indeed.com/viewjob?jk=${jobKey}`;
      }
    }

    const jobInfo = {
      url: jobUrl,
      title,
      company,
      location,
      description,
      postedDate,
      platform: 'indeed'
    };
    log('POSTED DATE DEBUG: FINAL postedDate value:', postedDate);
    log('Extracted job info:', jobInfo);
    return jobInfo;
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
      'span[data-testid="company-name"]'
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
    return staffingIndicators.some(pattern => pattern.test(companyName));
  } catch (error) {
    return false;
  }
}

// ===== COMMUNITY-REPORTED COMPANIES DETECTION =====
// Companies reported for spam/ghost jobs (Jan 2026)

/**
 * Normalize company name for matching
 */
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

// Pre-computed reported companies list with normalized names
const REPORTED_COMPANIES_CARD = [
  { name: 'AbbVie', normalized: 'abbvie', category: 'ghost' },
  { name: 'Accenture', normalized: 'accenture', category: 'ghost' },
  { name: 'Accruent', normalized: 'accruent', category: 'ghost' },
  { name: 'AECOM', normalized: 'aecom', category: 'ghost' },
  { name: 'Affinipay', normalized: 'affinipay', category: 'ghost' },
  { name: 'Age of Learning', normalized: 'age of learning', category: 'ghost' },
  { name: 'Aha!', normalized: 'aha', aliases: ['aha'], category: 'ghost' },
  { name: 'Apotex', normalized: 'apotex', category: 'ghost' },
  { name: 'Arrowstreet Capital', normalized: 'arrowstreet capital', category: 'ghost' },
  { name: 'Ascendion', normalized: 'ascendion', category: 'ghost' },
  { name: 'Assigncorp', normalized: 'assigncorp', category: 'ghost' },
  { name: 'Atlas Health', normalized: 'atlas health', category: 'ghost' },
  { name: 'Atlassian', normalized: 'atlassian', category: 'ghost' },
  { name: 'Aya Healthcare', normalized: 'aya healthcare', category: 'ghost' },
  { name: 'Balfour Beatty', normalized: 'balfour beatty', aliases: ['balfour beaty'], category: 'ghost' },
  { name: 'Bank of America', normalized: 'bank of america', aliases: ['bofa', 'bankofamerica'], category: 'ghost' },
  { name: 'Beyond Trust', normalized: 'beyond trust', aliases: ['beyondtrust'], category: 'ghost' },
  { name: 'Biorender', normalized: 'biorender', category: 'ghost' },
  { name: 'Bobsled', normalized: 'bobsled', category: 'ghost' },
  { name: 'Booksource', normalized: 'booksource', category: 'ghost' },
  { name: 'Boston Scientific', normalized: 'boston scientific', category: 'ghost' },
  { name: 'Burt Intelligence', normalized: 'burt intelligence', category: 'ghost' },
  { name: 'Business Wire', normalized: 'business wire', category: 'ghost' },
  { name: 'CACI', normalized: 'caci', category: 'ghost' },
  { name: "Caesar's", normalized: 'caesars', aliases: ['caesars', 'caesars entertainment'], category: 'ghost' },
  { name: 'Cardinal Health', normalized: 'cardinal health', category: 'ghost' },
  { name: 'Cedars Sinai', normalized: 'cedars sinai', aliases: ['cedarssinai'], category: 'ghost' },
  { name: 'ChenMed', normalized: 'chenmed', category: 'ghost' },
  { name: 'Clari', normalized: 'clari', category: 'ghost' },
  { name: 'ClearWater', normalized: 'clearwater', aliases: ['clearwater analytics'], category: 'ghost' },
  { name: 'Clover', normalized: 'clover', category: 'ghost' },
  { name: 'Code and Theory', normalized: 'code and theory', category: 'ghost' },
  { name: 'Comcast', normalized: 'comcast', category: 'ghost' },
  { name: 'Contra', normalized: 'contra', category: 'ghost' },
  { name: 'Cotiviti', normalized: 'cotiviti', category: 'ghost' },
  { name: 'Credit Acceptance', normalized: 'credit acceptance', category: 'ghost' },
  { name: 'Crocs', normalized: 'crocs', category: 'ghost' },
  { name: 'Crossover', normalized: 'crossover', category: 'ghost' },
  { name: 'CVS', normalized: 'cvs', aliases: ['cvs health', 'cvs pharmacy'], category: 'ghost' },
  { name: 'DCBL', normalized: 'dcbl', category: 'ghost' },
  { name: 'Dice', normalized: 'dice', aliases: ['dicecom'], category: 'spam' },
  { name: 'DoorDash', normalized: 'doordash', category: 'ghost' },
  { name: 'Earnin', normalized: 'earnin', category: 'ghost' },
  { name: 'Embraer', normalized: 'embraer', category: 'ghost' },
  { name: 'Evidation', normalized: 'evidation', category: 'ghost' },
  { name: 'Excellence Services LLC', normalized: 'excellence services', category: 'ghost' },
  { name: 'EY', normalized: 'ey', aliases: ['ernst young', 'ernst  young'], category: 'ghost' },
  { name: 'Fanatics', normalized: 'fanatics', category: 'ghost' },
  { name: 'Files.com', normalized: 'filescom', aliases: ['filescom'], category: 'ghost' },
  { name: 'FiServe', normalized: 'fiserve', aliases: ['fiserv'], category: 'ghost' },
  { name: 'FloQast', normalized: 'floqast', category: 'ghost' },
  { name: 'Fluency', normalized: 'fluency', category: 'ghost' },
  { name: 'FluentStream', normalized: 'fluentstream', category: 'ghost' },
  { name: 'GE Healthcare', normalized: 'ge healthcare', aliases: ['ge health', 'general electric healthcare'], category: 'ghost' },
  { name: 'Genworth', normalized: 'genworth', category: 'ghost' },
  { name: 'Golden Hippo', normalized: 'golden hippo', category: 'ghost' },
  { name: 'GoodRX', normalized: 'goodrx', aliases: ['goodrx'], category: 'ghost' },
  { name: 'Greendot', normalized: 'greendot', aliases: ['green dot'], category: 'ghost' },
  { name: 'Harbor Freight Tools', normalized: 'harbor freight tools', aliases: ['harbor freight'], category: 'ghost' },
  { name: 'Health Edge', normalized: 'health edge', aliases: ['healthedge'], category: 'ghost' },
  { name: 'HireMeFast LLC', normalized: 'hiremefast', category: 'scam' },
  { name: 'HubSpot', normalized: 'hubspot', category: 'ghost' },
  { name: 'JP Morgan Chase', normalized: 'jp morgan chase', aliases: ['jpmorgan', 'jp morgan', 'chase', 'jpmorganchase'], category: 'ghost' },
  { name: 'Kforce', normalized: 'kforce', category: 'ghost' },
  { name: "King's Hawaiian", normalized: 'kings hawaiian', aliases: ['kings hawaiian'], category: 'ghost' },
  { name: 'Klaviyo', normalized: 'klaviyo', category: 'ghost' },
  { name: 'Kraft & Kennedy', normalized: 'kraft  kennedy', aliases: ['kraft kennedy'], category: 'ghost' },
  { name: 'Leidos', normalized: 'leidos', category: 'ghost' },
  { name: 'Lumenalta', normalized: 'lumenalta', category: 'ghost' },
  { name: 'Magistrate', normalized: 'magistrate', category: 'ghost' },
  { name: 'Mandai', normalized: 'mandai', category: 'ghost' },
  { name: 'Matterport', normalized: 'matterport', category: 'ghost' },
  { name: 'Medix', normalized: 'medix', category: 'ghost' },
  { name: 'Molina Health', normalized: 'molina health', aliases: ['molina healthcare'], category: 'ghost' },
  { name: 'Motion Recruitment', normalized: 'motion recruitment', category: 'ghost' },
  { name: 'Mozilla', normalized: 'mozilla', category: 'ghost' },
  { name: 'NBC News', normalized: 'nbc news', category: 'ghost' },
  { name: 'NBC Universal', normalized: 'nbc universal', aliases: ['nbcuniversal'], category: 'ghost' },
  { name: 'NV5', normalized: 'nv5', category: 'ghost' },
  { name: 'Oneforma', normalized: 'oneforma', category: 'ghost' },
  { name: 'OneTrust', normalized: 'onetrust', category: 'ghost' },
  { name: 'Origin', normalized: 'origin', category: 'ghost' },
  { name: 'Oscar Health', normalized: 'oscar health', category: 'ghost' },
  { name: 'Paradox.ai', normalized: 'paradoxai', aliases: ['paradox ai', 'paradoxai'], category: 'ghost' },
  { name: 'Polly', normalized: 'polly', category: 'ghost' },
  { name: 'Posit', normalized: 'posit', category: 'ghost' },
  { name: 'Prize Picks', normalized: 'prize picks', aliases: ['prizepicks'], category: 'ghost' },
  { name: 'Publicis Health', normalized: 'publicis health', category: 'ghost' },
  { name: 'Raptive', normalized: 'raptive', category: 'ghost' },
  { name: 'Resmed', normalized: 'resmed', aliases: ['res med'], category: 'ghost' },
  { name: 'Robert Half', normalized: 'robert half', category: 'ghost' },
  { name: 'Seetec', normalized: 'seetec', category: 'ghost' },
  { name: 'Signify Health', normalized: 'signify health', category: 'ghost' },
  { name: 'SmithRX', normalized: 'smithrx', category: 'ghost' },
  { name: 'SoCal Edison', normalized: 'socal edison', aliases: ['southern california edison', 'sce'], category: 'ghost' },
  { name: 'SoCal Gas', normalized: 'socal gas', aliases: ['southern california gas', 'socalgas'], category: 'ghost' },
  { name: 'Softrams', normalized: 'softrams', category: 'ghost' },
  { name: 'Sonder', normalized: 'sonder', category: 'ghost' },
  { name: 'Stickermule', normalized: 'stickermule', aliases: ['sticker mule'], category: 'ghost' },
  { name: 'Sundays for Dogs', normalized: 'sundays for dogs', category: 'ghost' },
  { name: 'Sunnova', normalized: 'sunnova', category: 'ghost' },
  { name: 'Swooped', normalized: 'swooped', category: 'scam' },
  { name: 'Tabby', normalized: 'tabby', category: 'ghost' },
  { name: 'Talentify.io', normalized: 'talentifyio', aliases: ['talentify'], category: 'spam' },
  { name: 'Techie Talent', normalized: 'techie talent', category: 'scam' },
  { name: 'TekSystems', normalized: 'teksystems', aliases: ['tek systems'], category: 'ghost' },
  { name: 'Terrabis', normalized: 'terrabis', category: 'ghost' },
  { name: 'Thermo Fisher', normalized: 'thermo fisher', aliases: ['thermo fisher scientific', 'thermofisher'], category: 'ghost' },
  { name: 'Tickets.Com', normalized: 'ticketscom', aliases: ['ticketscom', 'tickets com'], category: 'ghost' },
  { name: 'Tixr', normalized: 'tixr', category: 'ghost' },
  { name: 'Toast', normalized: 'toast', category: 'ghost' },
  { name: 'UCLA Health', normalized: 'ucla health', category: 'ghost' },
  { name: 'ULine', normalized: 'uline', aliases: ['uline'], category: 'ghost' },
  { name: 'Underdog', normalized: 'underdog', category: 'ghost' },
  { name: 'Underdog Sports', normalized: 'underdog sports', category: 'ghost' },
  { name: 'Unisys', normalized: 'unisys', category: 'ghost' },
  { name: 'Vertafore', normalized: 'vertafore', category: 'ghost' },
  { name: 'VXI', normalized: 'vxi', category: 'ghost' },
  { name: 'Webstaurant', normalized: 'webstaurant', aliases: ['webstaurant store', 'webstaruant'], category: 'ghost' },
  { name: 'Wrike', normalized: 'wrike', category: 'ghost' },
  { name: 'Yahoo News', normalized: 'yahoo news', aliases: ['yahoo'], category: 'ghost' },
  { name: '1-800-Pack-Rat', normalized: '1800packrat', aliases: ['1 800 pack rat', '1800packrat', '1 800 pack a rat', '1800 pack rat'], category: 'ghost' }
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

/**
 * Get category-specific warning message
 */
function getReportedCategoryMessage(category) {
  switch (category) {
    case 'spam': return 'posting spam job listings';
    case 'ghost': return 'posting ghost jobs (jobs that may not actually exist)';
    case 'scam': return 'potentially scam job postings';
    default: return 'questionable hiring practices';
  }
}

/**
 * Check if company is in reported list from job card
 * @param {HTMLElement} jobCard - Job card element
 * @returns {Object|null} Detection result or null if not found
 */
function checkReportedCompanyFromCard(jobCard) {
  try {
    const companySelectors = [
      '[data-testid="company-name"]',
      '.companyName',
      '.company',
      'span[data-testid="company-name"]'
    ];

    let companyName = '';
    for (const selector of companySelectors) {
      const elem = jobCard.querySelector(selector);
      if (elem) {
        companyName = elem.textContent.trim();
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

    // 2. Partial match
    for (const company of REPORTED_COMPANIES_CARD) {
      if (normalized.includes(company.normalized) && company.normalized.length >= 3) {
        return {
          detected: true,
          company: company,
          message: `${company.name} has been reported for ${getReportedCategoryMessage(company.category)}`
        };
      }
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

/**
 * Apply orange highlight to job card for reported company
 */
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

  // Note: Badge removed from job cards per user request - only shown on detail pages
}

/**
 * Add small warning indicator badge to job card
 */
function addReportedCompanyBadgeToCard(jobCard, reportResult) {
  // Check if badge already exists
  if (jobCard.querySelector('.jobfiltr-card-reported-badge')) return;

  const badge = document.createElement('div');
  badge.className = 'jobfiltr-card-reported-badge';
  badge.style.cssText = `
    position: absolute;
    top: 8px;
    right: 8px;
    background: linear-gradient(135deg, #fef3c7, #fde68a);
    border: 1px solid #f97316;
    border-radius: 4px;
    padding: 2px 6px;
    font-size: 10px;
    font-weight: 600;
    color: #9a3412;
    z-index: 10;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  `;
  badge.innerHTML = '⚠️ Reported';
  badge.title = reportResult.message;

  // Ensure job card has relative positioning for badge
  const computedStyle = window.getComputedStyle(jobCard);
  if (computedStyle.position === 'static') {
    jobCard.style.position = 'relative';
  }
  jobCard.appendChild(badge);
}

/**
 * Remove reported company styling from job card
 */
function removeReportedCompanyStyling(jobCard) {
  if (!jobCard.classList.contains('jobfiltr-reported-company')) return;

  jobCard.classList.remove('jobfiltr-reported-company');
  jobCard.style.border = '';
  jobCard.style.borderRadius = '';
  jobCard.style.backgroundColor = '';
  jobCard.style.boxShadow = '';

  const badge = jobCard.querySelector('.jobfiltr-card-reported-badge');
  if (badge) badge.remove();
}

// ===== APPLIED JOBS DETECTION =====
// Patterns that indicate user has already applied to a job
const APPLIED_PATTERNS = [
  /applied\s+\d+\s*(days?|weeks?|months?|hours?|minutes?)\s*ago/i,
  /applied\s+on\s+/i,
  /you\s+applied/i,
  /application\s+sent/i,
  /application\s+submitted/i,
  /applied\s+today/i,
  /applied\s+yesterday/i,
  /applied\s+recently/i
];

/**
 * Check if job card text indicates user has already applied
 * @param {HTMLElement|string} jobCardOrText - Job card element or text to check
 * @returns {boolean} - True if user has already applied
 */
function hasAppliedText(jobCardOrText) {
  let text = '';

  if (typeof jobCardOrText === 'string') {
    text = jobCardOrText;
  } else if (jobCardOrText && jobCardOrText.textContent) {
    text = jobCardOrText.textContent;
  }

  if (!text || typeof text !== 'string') return false;

  const normalized = text.toLowerCase();

  for (const pattern of APPLIED_PATTERNS) {
    if (pattern.test(normalized)) {
      return true;
    }
  }

  return false;
}

// ===== URGENTLY HIRING DETECTION =====
// ULTRATHINK: Multi-tier detection for Indeed's "Urgently Hiring" badge
// This badge is employer-controlled (paid feature) and appears in the jobMetaDataGroup

/**
 * DOM selectors for "Urgently Hiring" badge detection
 * Ordered by reliability - data-testid attributes are most stable
 */
const URGENTLY_HIRING_SELECTORS = {
  // TIER 1: Data test ID attributes (most stable)
  primary: [
    '[data-testid="attribute_snippet_testid"]',
    '[data-testid="urgently-hiring"]',
  ],
  // TIER 2: Class-based containers (Indeed's native badge classes)
  secondary: [
    '[class*="mosaic-provider-jobcards"]', // Indeed's badge container class prefix
    '.jobMetaDataGroup',
    '.attribute_snippet',
    '.jobCardShelfContainer',
    '.underShelfFooter',
    '.css-glvc6p', // Badge row container
  ]
};

// Text patterns that indicate "Urgently Hiring" badge
const URGENTLY_HIRING_PATTERNS = [
  /urgently\s*hiring/i,
  /hiring\s*immediately/i,
  /immediate\s*hire/i,
  /urgent\s*need/i,
];

/**
 * Detect if a job card has the "Urgently Hiring" badge
 * @param {Element} jobCard - The job card element to check
 * @returns {{ isUrgent: boolean, source: string, confidence: number }}
 */
function detectUrgentlyHiring(jobCard) {
  const result = {
    isUrgent: false,
    source: 'none',
    confidence: 0
  };

  try {
    // TIER 1: Check primary selectors (most reliable)
    for (const selector of URGENTLY_HIRING_SELECTORS.primary) {
      const elements = jobCard.querySelectorAll(selector);
      for (const elem of elements) {
        const text = (elem.textContent || '').toLowerCase();
        for (const pattern of URGENTLY_HIRING_PATTERNS) {
          if (pattern.test(text)) {
            result.isUrgent = true;
            result.source = `primary:${selector}`;
            result.confidence = 100;
            log(`Urgently Hiring detected via ${selector}: "${text.substring(0, 50)}"`);
            return result;
          }
        }
      }
    }

    // TIER 2: Check secondary selectors
    for (const selector of URGENTLY_HIRING_SELECTORS.secondary) {
      const elements = jobCard.querySelectorAll(selector);
      for (const elem of elements) {
        const text = (elem.textContent || '').toLowerCase();
        for (const pattern of URGENTLY_HIRING_PATTERNS) {
          if (pattern.test(text)) {
            result.isUrgent = true;
            result.source = `secondary:${selector}`;
            result.confidence = 90;
            log(`Urgently Hiring detected via ${selector}: "${text.substring(0, 50)}"`);
            return result;
          }
        }
      }
    }

    // TIER 3: Full card text scan (lowest confidence - last resort)
    const fullText = (jobCard.textContent || '').toLowerCase();
    for (const pattern of URGENTLY_HIRING_PATTERNS) {
      if (pattern.test(fullText)) {
        result.isUrgent = true;
        result.source = 'fulltext';
        result.confidence = 75;
        log(`Urgently Hiring detected via full text scan`);
        return result;
      }
    }

    return result;
  } catch (error) {
    log('Error in detectUrgentlyHiring:', error);
    return result;
  }
}

/**
 * Simple boolean wrapper for backward compatibility
 * @param {Element} jobCard - The job card element to check
 * @returns {boolean} - True if job has "Urgently Hiring" badge
 */
function isUrgentlyHiring(jobCard) {
  return detectUrgentlyHiring(jobCard).isUrgent;
}

/**
 * Count jobs on the current page with "Urgently Hiring" badge
 * Used for zero-result UX improvement
 * @returns {{ total: number, urgent: number, percentage: number }}
 */
function countUrgentlyHiringJobs() {
  const jobCardSelectors = [
    '.jobsearch-ResultsList > li',
    '.job_seen_beacon',
    '[data-testid="job-result"]',
    'li[data-jk]',
  ];

  let jobCards = [];
  for (const selector of jobCardSelectors) {
    jobCards = document.querySelectorAll(selector);
    if (jobCards.length > 0) break;
  }

  let urgentCount = 0;
  jobCards.forEach(card => {
    if (isUrgentlyHiring(card)) {
      urgentCount++;
    }
  });

  return {
    total: jobCards.length,
    urgent: urgentCount,
    percentage: jobCards.length > 0 ? Math.round((urgentCount / jobCards.length) * 100) : 0
  };
}

/**
 * Count sponsored/promoted jobs on the current page
 * Used for UX warning message in Hide Sponsored filter
 * @returns {{ total: number, sponsored: number, percentage: number }}
 */
function countSponsoredJobs() {
  const jobCardSelectors = [
    '.jobsearch-ResultsList > li',
    '.job_seen_beacon',
    '[data-testid="job-result"]',
    'li[data-jk]',
  ];

  let jobCards = [];
  for (const selector of jobCardSelectors) {
    jobCards = document.querySelectorAll(selector);
    if (jobCards.length > 0) break;
  }

  let sponsoredCount = 0;
  jobCards.forEach(card => {
    if (isSponsored(card)) {
      sponsoredCount++;
    }
  });

  return {
    total: jobCards.length,
    sponsored: sponsoredCount,
    percentage: jobCards.length > 0 ? Math.round((sponsoredCount / jobCards.length) * 100) : 0
  };
}

/**
 * Count early applicant jobs on the current page
 * Used for UX warning message in Early Applicant filter
 * @returns {{ total: number, early: number, percentage: number }}
 */
function countEarlyApplicantJobs() {
  const jobCardSelectors = [
    '.jobsearch-ResultsList > li',
    '.job_seen_beacon',
    '[data-testid="job-result"]',
    'li[data-jk]',
  ];

  let jobCards = [];
  for (const selector of jobCardSelectors) {
    jobCards = document.querySelectorAll(selector);
    if (jobCards.length > 0) break;
  }

  let earlyCount = 0;
  jobCards.forEach(card => {
    if (isEarlyApplicant(card)) {
      earlyCount++;
    }
  });

  return {
    total: jobCards.length,
    early: earlyCount,
    percentage: jobCards.length > 0 ? Math.round((earlyCount / jobCards.length) * 100) : 0
  };
}

// ===== STAFFING DISPLAY MODE FUNCTIONS =====
function addStaffingBadge(jobCard) {
  // Don't add duplicate badges
  if (jobCard.querySelector('.jobfiltr-staffing-badge')) return;

  const badge = document.createElement('div');
  badge.className = 'jobfiltr-staffing-badge';

  badge.innerHTML = `
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" style="flex-shrink: 0;">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      <circle cx="9" cy="7" r="4" stroke="currentColor" stroke-width="2"/>
      <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    </svg>
    <span>Staffing</span>
  `;

  badge.title = 'This appears to be a staffing/recruiting firm';

  badge.style.cssText = `
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 8px;
    background: rgba(239, 68, 68, 0.12);
    border: 1px solid rgba(239, 68, 68, 0.35);
    border-radius: 12px;
    font-size: 11px;
    font-weight: 500;
    color: #DC2626;
    margin-left: 8px;
    cursor: help;
    white-space: nowrap;
    vertical-align: middle;
  `;

  // Find the company name element to insert badge after
  const companySelectors = [
    '[data-testid="company-name"]',
    '.companyName',
    '.company'
  ];

  for (const selector of companySelectors) {
    const companyElement = jobCard.querySelector(selector);
    if (companyElement && companyElement.parentNode) {
      companyElement.parentNode.insertBefore(badge, companyElement.nextSibling);
      return;
    }
  }

  // Fallback: prepend to job card
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

// ===== SPONSORED POST DETECTION =====
// ULTRATHINK: Enhanced sponsored detection with comprehensive selectors,
// aria-label fallback, text pattern matching, and debugging support.
// Covers Indeed's 2024-2025 DOM variations for maximum accuracy (~99%).

// Primary CSS selectors for sponsored detection (ordered by reliability)
const SPONSORED_SELECTORS = {
  // TIER 1: Data attributes (most stable)
  dataAttributes: [
    '[data-is-sponsored]',
    '[data-is-sponsored="true"]',
    '[data-testid="sponsored-label"]',
    '[data-sponsored="true"]'
  ],
  // TIER 2: Class-based selectors (common patterns)
  classes: [
    '.sponsoredJob',
    '.sponsoredGray',
    '.jobsearch-JobCard-Sponsored',
    '.job-result-sponsored',
    '[class*="sponsored"]'
  ]
};

/**
 * ULTRATHINK: Detect if a job card is a sponsored/promoted listing
 * Uses multi-tier detection: data attributes > classes > aria-label > text content
 * @param {Element} jobCard - The job card element to check
 * @returns {boolean} - True if sponsored/promoted
 */
function isSponsored(jobCard) {
  try {
    // TIER 1: Check data attributes (highest priority - most stable)
    if (jobCard.hasAttribute('data-is-sponsored')) {
      log('Sponsored detected via: data-is-sponsored attribute');
      return true;
    }

    if (jobCard.getAttribute('data-is-sponsored') === 'true') {
      log('Sponsored detected via: data-is-sponsored="true"');
      return true;
    }

    // TIER 2: Check direct class membership
    const sponsoredClasses = ['sponsoredJob', 'sponsoredGray', 'jobsearch-JobCard-Sponsored', 'job-result-sponsored'];
    for (const className of sponsoredClasses) {
      if (jobCard.classList.contains(className)) {
        log(`Sponsored detected via: classList contains "${className}"`);
        return true;
      }
    }

    // TIER 3: Check child element selectors (catches nested structures)
    const childSelectors = [
      '[data-testid="sponsored-label"]',
      '[data-is-sponsored]',
      '[data-is-sponsored="true"]',
      '.sponsoredJob',
      '.sponsoredGray',
      '.jobsearch-JobCard-Sponsored'
    ];

    for (const selector of childSelectors) {
      const element = jobCard.querySelector(selector);
      if (element) {
        log(`Sponsored detected via: child selector "${selector}"`);
        return true;
      }
    }

    // TIER 4: Check aria-label for accessibility features
    const ariaLabel = (jobCard.getAttribute('aria-label') || '').toLowerCase();
    if (ariaLabel.includes('sponsored') || ariaLabel.includes('promoted')) {
      log('Sponsored detected via: aria-label contains "sponsored/promoted"');
      return true;
    }

    // TIER 5: Text-based fallback - look for "Sponsored" text label
    // This catches cases where Indeed uses a text label without specific classes
    const sponsoredTextSelectors = [
      '[data-testid="sponsored-label"]',
      '.sponsoredJob',
      '.sponsoredGray',
      '[class*="sponsor"]',
      'span[class*="Sponsor"]'
    ];

    for (const selector of sponsoredTextSelectors) {
      const element = jobCard.querySelector(selector);
      if (element) {
        const text = (element.textContent || '').toLowerCase().trim();
        if (text === 'sponsored' || text === 'promoted' || text.includes('sponsored job')) {
          log(`Sponsored detected via: text content "${text}" in "${selector}"`);
          return true;
        }
      }
    }

    // TIER 6: Check for wildcard class pattern [class*="sponsored"]
    // This is a fallback for any class containing "sponsored"
    const allElements = jobCard.querySelectorAll('*');
    for (const el of allElements) {
      const classList = Array.from(el.classList || []);
      for (const cls of classList) {
        if (cls.toLowerCase().includes('sponsored') || cls.toLowerCase().includes('promoted')) {
          log(`Sponsored detected via: wildcard class "${cls}"`);
          return true;
        }
      }
      // Limit iteration to prevent performance issues (check first 50 elements max)
      if (Array.from(allElements).indexOf(el) > 50) break;
    }

    return false;
  } catch (error) {
    log('Error in isSponsored detection:', error);
    return false; // Fail safe - don't hide on error
  }
}

/**
 * Get detailed sponsored detection result (for debugging/analytics)
 * @param {Element} jobCard - The job card element to check
 * @returns {{ isSponsored: boolean, source: string, details: string }}
 */
function getSponsoredDetails(jobCard) {
  const result = { isSponsored: false, source: 'none', details: '' };

  try {
    // Check data attributes
    if (jobCard.hasAttribute('data-is-sponsored')) {
      result.isSponsored = true;
      result.source = 'data-attribute';
      result.details = 'data-is-sponsored attribute present';
      return result;
    }

    if (jobCard.getAttribute('data-is-sponsored') === 'true') {
      result.isSponsored = true;
      result.source = 'data-attribute';
      result.details = 'data-is-sponsored="true"';
      return result;
    }

    // Check classes
    const sponsoredClasses = ['sponsoredJob', 'sponsoredGray', 'jobsearch-JobCard-Sponsored'];
    for (const className of sponsoredClasses) {
      if (jobCard.classList.contains(className)) {
        result.isSponsored = true;
        result.source = 'class';
        result.details = `classList contains "${className}"`;
        return result;
      }
    }

    // Check child selectors
    const childSelectors = [
      '[data-testid="sponsored-label"]',
      '.sponsoredJob',
      '.sponsoredGray',
      '.jobsearch-JobCard-Sponsored'
    ];

    for (const selector of childSelectors) {
      if (jobCard.querySelector(selector)) {
        result.isSponsored = true;
        result.source = 'child-selector';
        result.details = `Found child element matching "${selector}"`;
        return result;
      }
    }

    // Check aria-label
    const ariaLabel = (jobCard.getAttribute('aria-label') || '').toLowerCase();
    if (ariaLabel.includes('sponsored') || ariaLabel.includes('promoted')) {
      result.isSponsored = true;
      result.source = 'aria-label';
      result.details = `aria-label contains sponsored/promoted: "${ariaLabel.substring(0, 50)}..."`;
      return result;
    }

    return result;
  } catch (error) {
    result.details = `Error: ${error.message}`;
    return result;
  }
}

// ===== EARLY APPLICANT DETECTION WITH CONFIDENCE SCORING =====
// UltraThink Implementation: Conservative detection with confidence scoring
// Returns { isEarly: boolean, confidence: number (0-100), matchedPatterns: string[], source: string }

// Pattern categories with confidence weights (conservative approach)
const EARLY_APPLICANT_PATTERNS = {
  // HIGH CONFIDENCE (85-100%): Explicit Indeed phrases
  high: [
    { pattern: /be among the first \d+ applicants?/i, confidence: 100, name: 'be_among_first_N' },
    { pattern: /be one of the first \d+ applicants?/i, confidence: 100, name: 'be_one_of_first_N' },
    { pattern: /be among the first to apply/i, confidence: 95, name: 'be_among_first_apply' },
    { pattern: /early applicant opportunity/i, confidence: 95, name: 'early_applicant_opportunity' },
    { pattern: /fewer than \d+ applicants?/i, confidence: 90, name: 'fewer_than_N' },
    { pattern: /less than \d+ applicants?/i, confidence: 90, name: 'less_than_N' },
    { pattern: /under \d+ applicants?/i, confidence: 88, name: 'under_N' },
  ],
  // MEDIUM CONFIDENCE (60-84%): Strong indicators
  medium: [
    { pattern: /only \d+ applicants?/i, confidence: 80, name: 'only_N' },
    { pattern: /just posted/i, confidence: 70, name: 'just_posted' },
    { pattern: /posted today/i, confidence: 70, name: 'posted_today' },
    { pattern: /\d+ applicants? so far/i, confidence: 75, name: 'N_applicants_so_far' },
  ],
  // LOW CONFIDENCE (40-59%): Weak indicators (NOT used in conservative mode)
  low: [
    { pattern: /few applicants?/i, confidence: 55, name: 'few_applicants' },
    { pattern: /low applicant/i, confidence: 50, name: 'low_applicant' },
    { pattern: /apply now/i, confidence: 40, name: 'apply_now' }, // Too generic
  ]
};

// Primary DOM selectors for early applicant information (ordered by specificity)
const EARLY_APPLICANT_SELECTORS = {
  // TIER 1: Most specific - hiring insights section only
  primary: [
    '.jobsearch-HiringInsights-entry',
    '[data-testid="hiring-insights"]',
    '.jobsearch-HiringInsights-entry--age',
    '[data-testid="applicant-count"]',
  ],
  // TIER 2: Secondary containers - job card snippets
  secondary: [
    '.job-snippet',
    '.jobCardShelfContainer',
    '[data-testid="job-snippet"]',
    '.underShelfFooter',
  ],
  // TIER 3: Fallback - broader containers (risk of false positives)
  fallback: [
    '.jobsearch-JobComponent',
    '.jobsearch-ViewJobLayout',
  ]
};

/**
 * Detect early applicant opportunity with confidence scoring
 * @param {Element} jobElement - The job card or container element
 * @param {boolean} conservativeMode - If true, only use high confidence patterns (default: true)
 * @returns {{ isEarly: boolean, confidence: number, matchedPatterns: string[], source: string }}
 */
function detectEarlyApplicant(jobElement, conservativeMode = true) {
  const result = {
    isEarly: false,
    confidence: 0,
    matchedPatterns: [],
    source: 'none'
  };

  try {
    // Step 1: Check primary selectors first (most reliable)
    for (const selector of EARLY_APPLICANT_SELECTORS.primary) {
      const element = jobElement.querySelector ? jobElement.querySelector(selector) : document.querySelector(selector);
      if (element) {
        const text = element.textContent || '';
        const detection = checkPatternsInText(text, conservativeMode);
        if (detection.confidence > result.confidence) {
          result.confidence = detection.confidence;
          result.matchedPatterns = detection.matchedPatterns;
          result.source = `primary:${selector}`;
        }
      }
    }

    // Step 2: If no high-confidence match, check secondary selectors
    if (result.confidence < 80) {
      for (const selector of EARLY_APPLICANT_SELECTORS.secondary) {
        const element = jobElement.querySelector ? jobElement.querySelector(selector) : document.querySelector(selector);
        if (element) {
          const text = element.textContent || '';
          const detection = checkPatternsInText(text, conservativeMode);
          if (detection.confidence > result.confidence) {
            result.confidence = detection.confidence;
            result.matchedPatterns = detection.matchedPatterns;
            result.source = `secondary:${selector}`;
          }
        }
      }
    }

    // Step 3: Only use fallback if nothing found and NOT in conservative mode
    if (result.confidence === 0 && !conservativeMode) {
      for (const selector of EARLY_APPLICANT_SELECTORS.fallback) {
        const element = document.querySelector(selector);
        if (element) {
          const text = element.textContent || '';
          const detection = checkPatternsInText(text, false);
          // Apply penalty for fallback source (higher false positive risk)
          const penalizedConfidence = Math.floor(detection.confidence * 0.7);
          if (penalizedConfidence > result.confidence) {
            result.confidence = penalizedConfidence;
            result.matchedPatterns = detection.matchedPatterns;
            result.source = `fallback:${selector}`;
          }
        }
      }
    }

    // Determine if early applicant based on confidence threshold
    // Conservative mode: require 70% confidence
    // Normal mode: require 50% confidence
    const threshold = conservativeMode ? 70 : 50;
    result.isEarly = result.confidence >= threshold;

    if (result.isEarly) {
      log(`Early applicant detected: confidence=${result.confidence}%, patterns=[${result.matchedPatterns.join(', ')}], source=${result.source}`);
    }

    return result;
  } catch (error) {
    log('Error in detectEarlyApplicant:', error);
    return result;
  }
}

/**
 * Check text against pattern categories
 * @param {string} text - Text to search
 * @param {boolean} conservativeMode - Only use high confidence patterns
 * @returns {{ confidence: number, matchedPatterns: string[] }}
 */
function checkPatternsInText(text, conservativeMode) {
  const result = { confidence: 0, matchedPatterns: [] };
  if (!text || text.length < 5) return result;

  const textLower = text.toLowerCase();

  // Check high confidence patterns first
  for (const p of EARLY_APPLICANT_PATTERNS.high) {
    if (p.pattern.test(textLower)) {
      if (p.confidence > result.confidence) {
        result.confidence = p.confidence;
      }
      result.matchedPatterns.push(p.name);
    }
  }

  // Check medium confidence patterns if conservative mode allows
  if (!conservativeMode || result.confidence === 0) {
    for (const p of EARLY_APPLICANT_PATTERNS.medium) {
      if (p.pattern.test(textLower)) {
        if (p.confidence > result.confidence) {
          result.confidence = p.confidence;
        }
        result.matchedPatterns.push(p.name);
      }
    }
  }

  // Low confidence patterns only in non-conservative mode
  if (!conservativeMode && result.confidence === 0) {
    for (const p of EARLY_APPLICANT_PATTERNS.low) {
      if (p.pattern.test(textLower)) {
        if (p.confidence > result.confidence) {
          result.confidence = p.confidence;
        }
        result.matchedPatterns.push(p.name);
      }
    }
  }

  return result;
}

/**
 * Simple boolean wrapper for backward compatibility
 * Uses conservative detection mode
 * @param {Element} jobElement - The job element to check
 * @returns {boolean} - True if early applicant opportunity
 */
function isEarlyApplicant(jobElement) {
  const detection = detectEarlyApplicant(jobElement, true);
  return detection.isEarly;
}

/**
 * Get detailed early applicant detection result
 * @param {Element} jobElement - The job element to check
 * @returns {{ isEarly: boolean, confidence: number, matchedPatterns: string[], source: string }}
 */
function getEarlyApplicantDetails(jobElement) {
  return detectEarlyApplicant(jobElement, true);
}

// Legacy function - kept for backward compatibility
// Returns null to indicate we no longer extract numeric counts
function getApplicantCount(jobCard) {
  // DEPRECATED: We no longer extract numeric applicant counts
  // Indeed doesn't consistently show this data (only ~40-60% availability)
  // Use detectEarlyApplicant() for confidence-based detection
  return null;
}

// ===== EARLY APPLICANT BADGE ON JOB CARDS =====
// Shows early applicant badge on job cards when display mode is 'flag'
function addEarlyApplicantBadgeToCard(jobCard) {
  // Don't add duplicate badges
  if (jobCard.querySelector('.jobfiltr-early-applicant-badge')) return;

  const detection = detectEarlyApplicant(jobCard, true);
  if (!detection.isEarly) return;

  const badge = document.createElement('div');
  badge.className = 'jobfiltr-early-applicant-badge';
  badge.innerHTML = `<span style="margin-right: 4px;">🚀</span>Early Applicant`;
  badge.title = `Confidence: ${detection.confidence}% - ${detection.matchedPatterns.join(', ')}`;

  // Green badge style matching other JobFiltr badges
  const bgColor = '#dcfce7'; // Light green
  const textColor = '#166534'; // Dark green

  badge.style.cssText = `
    display: inline-flex;
    align-items: center;
    background: ${bgColor};
    color: ${textColor};
    padding: 4px 10px;
    border-radius: 6px;
    font-size: 11px;
    font-weight: 600;
    margin: 4px 0;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  `;

  // Insert badge at the top of the job card
  const topRow = getTopBadgesRow(jobCard);
  topRow.appendChild(badge);
  log(`Added early applicant badge to job card`);
}

// Remove early applicant badge from job card
function removeEarlyApplicantBadgeFromCard(jobCard) {
  const badge = jobCard.querySelector('.jobfiltr-early-applicant-badge');
  if (badge) badge.remove();
}

// ===== EARLY APPLICANT BADGE IN DETAIL PANEL =====
// Shows early applicant badge with confidence score near the top of the expanded job detail panel
function addEarlyApplicantBadgeToDetailPanel() {
  // Only show badge when filter is enabled and display mode is 'flag'
  if (!filterSettings.filterEarlyApplicant || filterSettings.earlyApplicantDisplayMode !== 'flag') return;

  // Remove any existing early applicant badge
  const existingBadge = document.querySelector('.jobfiltr-detail-early-applicant-badge');
  if (existingBadge) existingBadge.remove();

  // Use the new confidence-based detection system
  const detailContainer = document.querySelector('.jobsearch-ViewJobLayout') || document.body;
  const detection = detectEarlyApplicant(detailContainer, true); // Conservative mode

  if (!detection.isEarly) {
    log(`Not an early applicant opportunity - confidence: ${detection.confidence}% (threshold: 70%)`);
    return;
  }

  // Determine badge styling based on confidence level
  const { confidence, matchedPatterns } = detection;
  const confidenceLabel = confidence >= 90 ? 'High' : confidence >= 75 ? 'Good' : 'Moderate';
  const confidenceColor = confidence >= 90 ? '#166534' : confidence >= 75 ? '#15803d' : '#22c55e';

  // Create the badge with confidence indicator
  const badge = document.createElement('div');
  badge.className = 'jobfiltr-detail-early-applicant-badge';
  badge.title = `Detection confidence: ${confidence}%\nMatched: ${matchedPatterns.join(', ')}\nSource: ${detection.source}`;
  badge.innerHTML = `
    <div style="display: flex; align-items: center; gap: 6px;">
      <span style="font-size: 15px;">🌟</span>
      <div>
        <div style="font-weight: 700; font-size: 12px;">Early Applicant</div>
        <div style="font-size: 9px; opacity: 0.85; display: flex; align-items: center; gap: 4px;">
          <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: ${confidenceColor};"></span>
          ${confidenceLabel} confidence
        </div>
      </div>
    </div>
  `;
  badge.style.cssText = `
    background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);
    color: #166534;
    padding: 10px 13px;
    border-radius: 10px;
    font-size: 9px;
    font-weight: 600;
    box-shadow: 0 2px 6px rgba(0,0,0,0.1);
    border: 1px solid #16653430;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    max-width: fit-content;
    cursor: help;
  `;

  // First, check if the badges container exists (created by Job Age badge)
  let container = document.querySelector('.jobfiltr-badges-container');
  if (container) {
    container.appendChild(badge);
    log(`Added early applicant badge (${confidence}% confidence) to badges container`);
    return;
  }

  // If no container exists yet, create one directly under the job title
  // Using refined selectors prioritizing stable test IDs
  const insertTargets = [
    '[data-testid="jobsearch-JobInfoHeader-title"]',
    '[data-testid="jobsearch-JobInfoHeader-subtitle"]',
    'h1.jobsearch-JobInfoHeader-title',
    '.jobsearch-JobInfoHeader-title',
    '.jobsearch-JobInfoHeader-title-container',
    '.jobsearch-JobInfoHeader-subtitle',
    '.jobsearch-InlineCompanyRating',
    '.jobsearch-JobInfoHeader',
    '.jobsearch-CompanyInfoContainer',
    '.jobsearch-ViewJobLayout-jobDisplay',
    '.jobsearch-JobComponent-description',
    '#jobDescriptionText'
  ];

  for (const selector of insertTargets) {
    const target = document.querySelector(selector);
    if (target) {
      container = document.createElement('div');
      container.className = 'jobfiltr-badges-container';
      container.style.cssText = `
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        align-items: flex-start;
        margin: 10px 0;
      `;
      container.appendChild(badge);
      target.insertAdjacentElement('afterend', container);
      log(`Created badges container and added early applicant badge (${confidence}% confidence)`);
      return;
    }
  }

  log('Could not find suitable location for early applicant badge in detail panel');
}

// ===== GET JOB CARD TEXT (INCLUDING LOCATION) =====
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

  // Get location - IMPORTANT for remote detection
  const locationSelectors = [
    '[data-testid="text-location"]',
    '.companyLocation',
    '.company_location',
    'div[class*="location"]'
  ];

  let location = '';
  for (const selector of locationSelectors) {
    const elem = jobCard.querySelector(selector);
    if (elem) {
      location = elem.textContent.trim().toLowerCase();
      break;
    }
  }

  // Get snippet/description
  const snippetElem = jobCard.querySelector('.job-snippet, .jobCardShelfContainer');
  const snippet = snippetElem ? snippetElem.textContent.trim().toLowerCase() : '';

  // Get metadata (often contains remote/hybrid info)
  const metadataElem = jobCard.querySelector('.jobMetaDataGroup, .metadata, [data-testid="job-metadata"]');
  const metadata = metadataElem ? metadataElem.textContent.trim().toLowerCase() : '';

  return `${title} ${company} ${location} ${snippet} ${metadata}`;
}

// ===== KEYWORD MATCHING =====
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

// ===== EXCLUDE COMPANIES =====
function getCompanyNameForFilter(jobCard) {
  const selectors = [
    '[data-testid="company-name"]',
    '.companyName',
    '.company',
    'span[data-testid="company-name"]'
  ];
  for (const selector of selectors) {
    const el = jobCard.querySelector(selector);
    if (el) return el.textContent.trim().toLowerCase();
  }
  return '';
}

function matchesExcludeCompanies(jobCard, companies) {
  if (!companies || companies.length === 0) return false;
  const companyName = getCompanyNameForFilter(jobCard);
  if (!companyName) return false;
  return companies.some(excluded => companyName.includes(excluded.toLowerCase()));
}

// ===== SALARY DETECTION =====
// Detects if a job card has salary OR hourly rate information
// Jobs with hourly rates (e.g., "$20/hr", "$18 an hour") should be considered as having salary info
function hasSalaryInfo(jobCard) {
  try {
    // Get text from the regular job card selectors
    const cardText = getJobCardText(jobCard);

    // IMPORTANT: Also get ALL text from the job card to catch salary info in any element
    // This ensures we don't miss salary/hourly info displayed in non-standard locations
    const fullCardText = (jobCard.textContent || '').toLowerCase();

    // Salary-specific selectors on Indeed job cards (2025 updated)
    const salarySelectors = [
      '.salary-snippet-container',
      '.salaryOnly',
      '[data-testid="attribute_snippet_testid"]',
      '.metadata.salary-snippet-container',
      '.underShelfFooter .salary-snippet-container',
      '.estimated-salary',
      '.attribute_snippet',
      // Additional 2025 selectors
      '.jobMetaDataGroup',
      '[data-testid="salary-snippet"]',
      '[data-testid="job-salary"]',
      '.compensation-snippet',
      '.jobCardShelfContainer span',
      '[class*="salary"]',
      '[class*="compensation"]',
      '[class*="pay"]'
    ];

    // Check for salary elements with comprehensive salary/hourly patterns
    for (const selector of salarySelectors) {
      const elems = jobCard.querySelectorAll(selector);
      for (const elem of elems) {
        const text = (elem.textContent || '').toLowerCase();
        // Check if it contains salary or hourly rate content
        if (hasSalaryOrHourlyPattern(text)) {
          return true;
        }
      }
    }

    // Check the full card text for salary/hourly patterns
    if (hasSalaryOrHourlyPattern(fullCardText)) {
      return true;
    }

    // Also check the standard card text extraction
    if (hasSalaryOrHourlyPattern(cardText)) {
      return true;
    }

    return false;
  } catch (error) {
    log('Error checking salary info:', error);
    return false; // Don't hide if we can't check
  }
}

// Helper function to check for salary OR hourly rate patterns
// This explicitly preserves jobs with hourly rate info like "$20/hr", "$18 an hour"
function hasSalaryOrHourlyPattern(text) {
  if (!text) return false;

  // Explicit hourly rate patterns - these should ALWAYS be detected
  // Matches: $20/hr, $18.50/hour, $15 an hour, $22 per hour, etc.
  const hourlyPatterns = [
    /\$[\d,.]+\s*(?:\/|-|–|per|an|a)\s*(?:hr|hour)/i,           // $20/hr, $20 per hour, $20 an hour
    /\$[\d,.]+\s*[-–]\s*\$?[\d,.]+\s*(?:\/|-|per|an|a)\s*(?:hr|hour)/i,  // $18 - $22 an hour, $18-$22/hr
    /\$[\d,.]+\s*hourly/i,                                       // $20 hourly
    /\$[\d,.]+\s*[-–]\s*\$?[\d,.]+\s*hourly/i,                   // $18-$22 hourly
    /hourly\s*[:.]?\s*\$[\d,.]+/i,                               // hourly: $20, hourly $18
    /(?:estimated|est\.?)\s*\$[\d,.]+\s*[-–]?\s*\$?[\d,.]*\s*(?:\/|-|per|an|a)?\s*(?:hr|hour|hourly)?/i,  // Estimated $18-$22 an hour
  ];

  // Check hourly patterns first (priority for the user's use case)
  for (const pattern of hourlyPatterns) {
    if (pattern.test(text)) {
      return true;
    }
  }

  // General salary patterns
  const salaryPatterns = [
    /\$[\d,]+(?:\s*[-–]\s*\$?[\d,]+)?(?:\s*\/?\s*(?:yr|year|annually|annual|month|mo|week|wk))/i,  // Annual/monthly/weekly salary
    /\$[\d,]+k\s*[-–]?\s*\$?\d*k?/i,                              // $50k, $50k-$60k
    /(?:salary|pay|compensation)\s*[:.]?\s*\$[\d,]+/i,           // salary: $50,000
    /\bfrom\s+\$[\d,]+/i,                                        // from $50,000
    /\bup\s+to\s+\$[\d,]+/i,                                     // up to $100,000
    /\$[\d,]+\s*[-–]\s*\$[\d,]+\s*(?:a\s+)?year/i,               // $50,000 - $70,000 a year
    /\d+k\s*[-–]\s*\d+k/i,                                       // 50k-60k (without $)
  ];

  for (const pattern of salaryPatterns) {
    if (pattern.test(text)) {
      return true;
    }
  }

  // Simple presence check for common salary indicators
  // These are fallback checks if the patterns above don't match
  const simpleIndicators = [
    /\$[\d,]+\s*[-–]\s*\$[\d,]+/,  // Any dollar range like $50,000 - $70,000
    /\/yr\b/i,                      // /yr anywhere
    /\/hr\b/i,                      // /hr anywhere
    /per\s+hour/i,                  // per hour
    /an\s+hour/i,                   // an hour
    /a\s+hour/i,                    // a hour (grammatically incorrect but used)
    /per\s+year/i,                  // per year
    /a\s+year/i,                    // a year
    /\bhourly\b/i,                  // hourly (standalone word)
    /\bannually\b/i,                // annually
  ];

  for (const pattern of simpleIndicators) {
    if (pattern.test(text)) {
      return true;
    }
  }

  return false;
}

// ===== SALARY RANGE FILTERING =====
// Constants for salary normalization
const HOURS_PER_YEAR_FULL_TIME = 2080;  // 40 hours × 52 weeks
const HOURS_PER_YEAR_PART_TIME = 1040;  // 20 hours × 52 weeks

/**
 * Get salary data for a job from cache or parse from DOM
 * Returns: { min: number, max: number, type: 'HOURLY'|'YEARLY'|null, isPartTime: boolean }
 */
function getJobSalaryData(jobCard) {
  try {
    // Get job key from data attribute
    const jobKey = jobCard.dataset.jk || jobCard.querySelector('[data-jk]')?.dataset?.jk;

    // Check cache first (from mosaic data)
    if (jobKey && jobSalaryCache[jobKey]) {
      const cached = jobSalaryCache[jobKey];
      const isPartTime = cached.jobTypes?.includes('Part-time') && !cached.jobTypes?.includes('Full-time');

      if (cached.extractedSalary) {
        return {
          min: cached.extractedSalary.min > 0 ? cached.extractedSalary.min : null,
          max: cached.extractedSalary.max > 0 ? cached.extractedSalary.max : null,
          type: cached.extractedSalary.type || null,
          isPartTime: isPartTime,
          source: 'mosaic'
        };
      }

      // Try to parse from salarySnippetText if no extractedSalary
      if (cached.salarySnippetText) {
        const parsed = parseSalaryFromText(cached.salarySnippetText);
        if (parsed) {
          parsed.isPartTime = isPartTime;
          parsed.source = 'snippet';
          return parsed;
        }
      }
    }

    // Fallback: Parse from DOM text
    const salaryText = getSalaryTextFromCard(jobCard);
    if (salaryText) {
      const parsed = parseSalaryFromText(salaryText);
      if (parsed) {
        // Check job type from DOM
        const cardText = (jobCard.textContent || '').toLowerCase();
        parsed.isPartTime = cardText.includes('part-time') && !cardText.includes('full-time');
        parsed.source = 'dom';
        return parsed;
      }
    }

    return null;
  } catch (error) {
    log('Error getting job salary data:', error);
    return null;
  }
}

/**
 * Extract salary text from job card DOM
 */
function getSalaryTextFromCard(jobCard) {
  const salarySelectors = [
    '.salary-snippet-container',
    '.salaryOnly',
    '[data-testid="attribute_snippet_testid"]',
    '.estimated-salary',
    '.attribute_snippet',
    '.jobMetaDataGroup',
    '[data-testid="salary-snippet"]'
  ];

  for (const selector of salarySelectors) {
    const elem = jobCard.querySelector(selector);
    if (elem) {
      const text = elem.textContent?.trim();
      if (text && /\$[\d,]+/.test(text)) {
        return text;
      }
    }
  }
  return null;
}

/**
 * Parse salary min/max and type from text
 * Returns: { min: number, max: number, type: 'HOURLY'|'YEARLY' }
 */
function parseSalaryFromText(text) {
  if (!text) return null;

  const lowerText = text.toLowerCase();

  // Determine salary type
  let type = null;
  if (/\/hr|per\s+hour|an\s+hour|hourly/i.test(text)) {
    type = 'HOURLY';
  } else if (/\/yr|per\s+year|a\s+year|annually|annual/i.test(text)) {
    type = 'YEARLY';
  } else if (/\/mo|per\s+month|a\s+month|monthly/i.test(text)) {
    type = 'MONTHLY';
  } else if (/\/wk|per\s+week|a\s+week|weekly/i.test(text)) {
    type = 'WEEKLY';
  }

  // Extract dollar amounts
  const dollarMatches = text.match(/\$[\d,]+(?:\.\d{2})?/g);
  if (!dollarMatches || dollarMatches.length === 0) return null;

  // Parse the numbers
  const amounts = dollarMatches.map(m => {
    const num = parseFloat(m.replace(/[$,]/g, ''));
    return isNaN(num) ? 0 : num;
  }).filter(n => n > 0);

  if (amounts.length === 0) return null;

  // Determine min and max
  let min = Math.min(...amounts);
  let max = amounts.length > 1 ? Math.max(...amounts) : min;

  // If type is null, try to infer from values
  if (!type) {
    // If values are < 200, likely hourly; if > 10000, likely yearly
    if (max < 200) {
      type = 'HOURLY';
    } else if (min > 10000) {
      type = 'YEARLY';
    }
  }

  return { min, max, type };
}

/**
 * Normalize salary to annual equivalent for comparison
 * @param {number} amount - The salary amount
 * @param {string} type - 'HOURLY', 'YEARLY', 'MONTHLY', 'WEEKLY'
 * @param {boolean} isPartTime - Whether the job is part-time
 * @param {boolean} normalizePartTime - User setting to use part-time hours
 */
function normalizeToAnnual(amount, type, isPartTime = false, normalizePartTime = false) {
  if (!amount || amount <= 0) return null;

  const hoursPerYear = (isPartTime && normalizePartTime) ? HOURS_PER_YEAR_PART_TIME : HOURS_PER_YEAR_FULL_TIME;

  switch (type) {
    case 'HOURLY':
      return amount * hoursPerYear;
    case 'WEEKLY':
      return amount * 52;
    case 'MONTHLY':
      return amount * 12;
    case 'YEARLY':
    default:
      return amount;
  }
}

/**
 * Check if a job's salary matches the user's filter criteria
 * @param {Object} salaryData - From getJobSalaryData()
 * @param {Object} settings - Filter settings from popup
 * @returns {Object} { matches: boolean, reason: string }
 */
function checkSalaryMatch(salaryData, settings) {
  if (!salaryData) {
    return { matches: true, reason: null }; // No salary data, don't filter
  }

  const userMin = parseFloat(settings.minSalary) || 0;
  const userMax = parseFloat(settings.maxSalary) || Infinity;
  const userPeriod = settings.salaryPeriod || 'yearly';
  const normalizePartTime = settings.normalizePartTime || false;

  // If user didn't set any salary range, don't filter
  if (userMin === 0 && userMax === Infinity) {
    return { matches: true, reason: null };
  }

  // Convert user input to annual
  let userMinAnnual, userMaxAnnual;
  if (userPeriod === 'hourly') {
    userMinAnnual = userMin * HOURS_PER_YEAR_FULL_TIME;
    userMaxAnnual = userMax === Infinity ? Infinity : userMax * HOURS_PER_YEAR_FULL_TIME;
  } else {
    userMinAnnual = userMin;
    userMaxAnnual = userMax;
  }

  // Normalize job salary to annual
  const jobMinAnnual = normalizeToAnnual(salaryData.min, salaryData.type, salaryData.isPartTime, normalizePartTime);
  const jobMaxAnnual = normalizeToAnnual(salaryData.max, salaryData.type, salaryData.isPartTime, normalizePartTime);

  if (!jobMinAnnual && !jobMaxAnnual) {
    return { matches: true, reason: null }; // Couldn't parse, don't filter
  }

  // Use the job's max salary (or min if no max) for comparison
  const jobSalary = jobMaxAnnual || jobMinAnnual;

  // Check if job salary is within user's range
  // Job is a match if its salary overlaps with user's desired range
  const jobMin = jobMinAnnual || jobMaxAnnual;
  const jobMax = jobMaxAnnual || jobMinAnnual;

  // Overlap check: job range overlaps with user range
  const overlaps = jobMax >= userMinAnnual && jobMin <= userMaxAnnual;

  if (!overlaps) {
    // Format reason message
    const formatSalary = (amt) => {
      if (amt >= 1000) {
        return '$' + Math.round(amt / 1000) + 'k';
      }
      return '$' + Math.round(amt);
    };

    let reason;
    if (jobMax < userMinAnnual) {
      reason = `Salary too low (${formatSalary(jobMax)}/yr vs min ${formatSalary(userMinAnnual)}/yr)`;
    } else {
      reason = `Salary too high (${formatSalary(jobMin)}/yr vs max ${formatSalary(userMaxAnnual)}/yr)`;
    }

    return { matches: false, reason };
  }

  return { matches: true, reason: null };
}

// ===== TRUE REMOTE ACCURACY DETECTION =====
const nonRemotePatterns = {
  hybrid: [
    /\bhybrid\b/i,
    /\b\d+\s*days?\s*(in[-\s]?office|on[-\s]?site|in[-\s]?person)\b/i,
    /\b(some|occasional)\s*(in[-\s]?office|on[-\s]?site)\b/i
  ],
  onsite: [
    /\bon[-\s]?site\b/i,
    /\bonsite\b/i,
    /\bon[-\s]?location\b/i,
    /\boffice[-\s]?based\b/i,
    /\bwork\s+from\s+(the\s+)?office\b/i
  ],
  inOffice: [
    /\bin[-\s]?office\b/i,
    /\boffice\s+required\b/i,
    /\bmust\s+(work\s+)?(in|from)\s+(the\s+)?office\b/i
  ],
  inPerson: [
    /\bin[-\s]?person\b/i,
    /\bface[-\s]?to[-\s]?face\b/i,
    /\bphysical\s+presence\b/i,
    /\bcommute\b/i,
    /\blocal\s+candidates?\s+(only|preferred)\b/i,
    /\bmust\s+be\s+(located|local|able\s+to\s+commute)\b/i,
    /\brelocation\s+required\b/i
  ]
};

// ULTRATHINK: Remote POSITIVE patterns - indicates job IS remote
// Used to detect if a job explicitly states it's remote vs having no info at all
const remotePositivePatterns = [
  /\bremote\b/i,                              // "Remote" anywhere
  /\bwork\s+from\s+home\b/i,                  // "Work from home"
  /\bwork\s+from\s+anywhere\b/i,              // "Work from anywhere"
  /\b100%\s*remote\b/i,                       // "100% remote"
  /\bfully\s+remote\b/i,                      // "Fully remote"
  /\bcompletely\s+remote\b/i,                 // "Completely remote"
  /\btelecommute\b/i,                         // "Telecommute"
  /\btele[-\s]?work\b/i,                      // "Telework" or "Tele-work"
  /\bwfh\b/i,                                 // "WFH" abbreviation
  /\bvirtual\s+(position|role|job|opportunity)\b/i,  // "Virtual position/role/job"
  /\bremote[-\s]?first\b/i,                   // "Remote-first"
  /\bremote[-\s]?friendly\b/i,                // "Remote-friendly"
  /\bno\s+office\s+required\b/i,              // "No office required"
  /\banywhere\s+in\s+(the\s+)?(us|usa|united\s+states|world)\b/i  // "Anywhere in the US/world"
];

/**
 * ULTRATHINK: Detect work location type classification for a job card
 * Returns the work type and confidence level
 * @param {Element} jobCard - The job card element to analyze
 * @returns {{ type: 'remote'|'hybrid'|'onsite'|'unclear', confidence: number, details: string }}
 */
function detectWorkLocationType(jobCard) {
  const text = getJobCardText(jobCard);

  // Check for explicit REMOTE indicators
  const matchedRemotePatterns = [];
  for (const pattern of remotePositivePatterns) {
    if (pattern.test(text)) {
      matchedRemotePatterns.push(pattern.source);
    }
  }
  const isExplicitlyRemote = matchedRemotePatterns.length > 0;

  // Check for NON-remote indicators using existing patterns
  const hasHybrid = nonRemotePatterns.hybrid.some(p => p.test(text));
  const hasOnsite = nonRemotePatterns.onsite.some(p => p.test(text));
  const hasInOffice = nonRemotePatterns.inOffice.some(p => p.test(text));
  const hasInPerson = nonRemotePatterns.inPerson.some(p => p.test(text));

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
 * ULTRATHINK: Add "Work Type Unclear" warning badge to job card
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

  // Solid amber/yellow style matching Job Age badge pattern
  const bgColor = '#fef3c7'; // Light amber (solid)
  const textColor = '#92400e'; // Dark amber

  badge.style.cssText = `
    background: ${bgColor};
    color: ${textColor};
    padding: 4px 10px;
    border-radius: 12px;
    font-size: 11px;
    font-weight: 600;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    border: 1px solid ${textColor}30;
    display: inline-flex;
    align-items: center;
    cursor: help;
    pointer-events: auto;
    white-space: nowrap;
  `;

  // Append to the main container (below the top row with Job Age + Actively Recruiting)
  const container = getOrCreateTopBadgesContainer(jobCard);
  container.appendChild(badge);

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

/**
 * Add "No Salary Info" notification badge to job card
 * Shows when Salary filter is enabled and job has no salary information
 * @param {Element} jobCard - The job card element
 */
function addNoSalaryBadge(jobCard) {
  // Don't add duplicate badges
  if (jobCard.querySelector('.jobfiltr-nosalary-badge')) return;

  const badge = document.createElement('div');
  badge.className = 'jobfiltr-nosalary-badge';
  badge.innerHTML = `<span style="margin-right: 4px;">💰</span>No Salary Info`;
  badge.title = 'This job listing does not include salary or compensation information';

  // Light gray/neutral style
  const bgColor = '#f3f4f6'; // Light gray
  const textColor = '#6b7280'; // Medium gray

  badge.style.cssText = `
    background: ${bgColor};
    color: ${textColor};
    padding: 4px 10px;
    border-radius: 12px;
    font-size: 11px;
    font-weight: 600;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    border: 1px solid ${textColor}30;
    display: inline-flex;
    align-items: center;
    cursor: help;
    pointer-events: auto;
    white-space: nowrap;
  `;

  // Append to the main container
  const container = getOrCreateTopBadgesContainer(jobCard);
  container.appendChild(badge);

  log('Added No Salary Info badge to job card');
}

/**
 * Remove no salary badge from job card
 * @param {Element} jobCard - The job card element
 */
function removeNoSalaryBadge(jobCard) {
  const badge = jobCard.querySelector('.jobfiltr-nosalary-badge');
  if (badge) badge.remove();
}

function detectNonRemoteIndicators(jobCard, settings) {
  const text = getJobCardText(jobCard);
  log('Checking for non-remote indicators in text:', text.substring(0, 200));

  const detected = {
    hybrid: false,
    onsite: false,
    inOffice: false,
    inPerson: false
  };

  if (settings.excludeHybrid !== false) {
    detected.hybrid = nonRemotePatterns.hybrid.some(pattern => pattern.test(text));
  }
  if (settings.excludeOnsite !== false) {
    detected.onsite = nonRemotePatterns.onsite.some(pattern => pattern.test(text));
  }
  if (settings.excludeInOffice !== false) {
    detected.inOffice = nonRemotePatterns.inOffice.some(pattern => pattern.test(text));
  }
  if (settings.excludeInPerson !== false) {
    detected.inPerson = nonRemotePatterns.inPerson.some(pattern => pattern.test(text));
  }

  const hasNonRemote = detected.hybrid || detected.onsite || detected.inOffice || detected.inPerson;

  if (hasNonRemote) {
    const types = [];
    if (detected.hybrid) types.push('Hybrid');
    if (detected.onsite) types.push('On-site');
    if (detected.inOffice) types.push('In-office');
    if (detected.inPerson) types.push('In-person');
    log(`Non-remote indicators found: ${types.join(', ')}`);
  }

  return hasNonRemote;
}

// ===== CHECK DETAIL PANEL FOR NON-REMOTE INDICATORS =====
// This function checks the full job description in the detail panel
// and hides the currently selected job card if non-remote indicators are found
function checkDetailPanelForNonRemote(clickedJobCard) {
  if (!filterSettings.trueRemoteAccuracy) return;

  // Get the full job description from the detail panel
  const descriptionSelectors = [
    '#jobDescriptionText',
    '.jobsearch-jobDescriptionText',
    '[data-testid="jobDescriptionText"]',
    '#job-description',
    '.jobsearch-JobComponent-description'
  ];

  let descriptionText = '';
  for (const selector of descriptionSelectors) {
    const descEl = document.querySelector(selector);
    if (descEl) {
      descriptionText = descEl.textContent.trim().toLowerCase();
      break;
    }
  }

  if (!descriptionText) {
    log('No job description found in detail panel for True Remote check');
    return;
  }

  // Also get the work location/job type info from detail panel header
  const locationSelectors = [
    '.jobsearch-JobInfoHeader-subtitle',
    '[data-testid="jobsearch-JobInfoHeader-subtitle"]',
    '.jobsearch-CompanyInfoContainer',
    '[data-testid="inlineHeader-companyLocation"]',
    '.jobsearch-JobMetadataHeader-item'
  ];

  let locationText = '';
  for (const selector of locationSelectors) {
    const locEl = document.querySelector(selector);
    if (locEl) {
      locationText += ' ' + locEl.textContent.trim().toLowerCase();
    }
  }

  // Combine all text sources for comprehensive checking
  const fullText = `${descriptionText} ${locationText}`;
  log('Checking detail panel for non-remote indicators, text length:', fullText.length);

  // Check each category based on settings
  const detected = {
    hybrid: false,
    onsite: false,
    inOffice: false,
    inPerson: false
  };

  if (filterSettings.excludeHybrid !== false) {
    detected.hybrid = nonRemotePatterns.hybrid.some(pattern => pattern.test(fullText));
  }
  if (filterSettings.excludeOnsite !== false) {
    detected.onsite = nonRemotePatterns.onsite.some(pattern => pattern.test(fullText));
  }
  if (filterSettings.excludeInOffice !== false) {
    detected.inOffice = nonRemotePatterns.inOffice.some(pattern => pattern.test(fullText));
  }
  if (filterSettings.excludeInPerson !== false) {
    detected.inPerson = nonRemotePatterns.inPerson.some(pattern => pattern.test(fullText));
  }

  const hasNonRemote = detected.hybrid || detected.onsite || detected.inOffice || detected.inPerson;

  if (hasNonRemote && clickedJobCard) {
    const types = [];
    if (detected.hybrid) types.push('Hybrid');
    if (detected.onsite) types.push('On-site');
    if (detected.inOffice) types.push('In-office');
    if (detected.inPerson) types.push('In-person');

    log(`Non-remote indicators found in detail panel: ${types.join(', ')}`);

    // Hide the job card
    clickedJobCard.style.display = 'none';
    clickedJobCard.dataset.jobfiltrHidden = 'true';
    const existingReasons = clickedJobCard.dataset.jobfiltrReasons || '';
    const newReason = `Non-remote in description: ${types.join(', ')}`;
    clickedJobCard.dataset.jobfiltrReasons = existingReasons
      ? `${existingReasons}, ${newReason}`
      : newReason;

    hiddenJobsCount++;

    // Update the hidden count in popup
    try {
      chrome.runtime.sendMessage({
        type: 'FILTER_STATS_UPDATE',
        hiddenCount: hiddenJobsCount
      });
    } catch (error) {
      // Silently ignore extension context invalidated errors
    }

    log(`Hidden job card due to non-remote indicators in description: ${types.join(', ')}`);
  }

  return hasNonRemote;
}


// ===== ACTIVE RECRUITING DETECTION =====
// Detects if employer is actively recruiting based on "Employer Active X days ago" indicator

function isActivelyRecruiting(jobCard) {
  try {
    // Step 1: Look for "Employer Active X days ago" indicator in metadata
    const metadataSelectors = [
      '[class*="EmployerActive"]',
      '[class*="employer-active"]',
      '.jobMetaDataGroup span',
      '.jobsearch-JobMetadataFooter span',
      '.jobCardShelfContainer span',
      '[data-testid="job-metadata"]',
      '.underShelfFooter span'
    ];

    for (const selector of metadataSelectors) {
      try {
        const elements = jobCard.querySelectorAll(selector);
        for (const elem of elements) {
          const text = elem.textContent.trim();

          // Match "Employer Active X days ago" pattern
          const employerMatch = text.match(/employer\s*active\s*(\d+)\s*days?\s*ago/i);
          if (employerMatch) {
            const days = parseInt(employerMatch[1]);
            // Actively recruiting if within last 14 days
            return { active: days <= 14, days: days, source: 'employer_active' };
          }

          // Also check for plain "Active X days ago" without "Employer"
          const activeMatch = text.match(/\bactive\s*(\d+)\s*days?\s*ago/i);
          if (activeMatch && !text.toLowerCase().includes('view')) {
            const days = parseInt(activeMatch[1]);
            return { active: days <= 14, days: days, source: 'active' };
          }
        }
      } catch (e) {
        // Continue to next selector on error
      }
    }

    // Step 2: Fallback to job age inference if no explicit indicator found
    const jobAge = getJobAge(jobCard);
    if (jobAge !== null) {
      // If very fresh (0-7 days), assume actively recruiting
      if (jobAge <= 7) {
        return { active: true, days: jobAge, source: 'job_age' };
      }
      // If older (30+ days), likely stale
      if (jobAge >= 30) {
        return { active: false, days: jobAge, source: 'job_age' };
      }
      // Grey zone (7-30 days) - return uncertain
      return { active: null, days: jobAge, source: 'job_age' };
    }

    // Step 3: Unable to determine
    return null;
  } catch (error) {
    log('Error checking active recruiting status:', error);
    return null;
  }
}

// ULTRATHINK: Helper function to inject badge positioning CSS rules
// This ensures consistent positioning across all Indeed job card variants
function injectBadgePositioningStyles() {
  if (document.getElementById('jobfiltr-badge-positioning-styles')) return;

  const style = document.createElement('style');
  style.id = 'jobfiltr-badge-positioning-styles';
  style.textContent = `
    /* Ensure job cards are positioning contexts */
    .job_seen_beacon,
    .jobsearch-ResultsList > li,
    [data-testid="job-result"],
    li[data-jk] {
      position: relative !important;
    }

    /* Badge container - absolute top-right positioning with two-row layout */
    .jobfiltr-top-badges-container {
      position: absolute !important;
      top: 8px !important;
      right: 8px !important;
      display: flex !important;
      flex-direction: column !important;
      align-items: flex-end !important;
      gap: 4px !important;
      z-index: 1000 !important;
      pointer-events: auto !important;
    }

    /* Top row - horizontal layout for Actively Recruiting + Job Age */
    .jobfiltr-top-badges-row {
      display: flex !important;
      flex-direction: row !important;
      align-items: center !important;
      gap: 6px !important;
    }

    /* Individual badges - ensure they display correctly */
    .jobfiltr-age-badge,
    .jobfiltr-recruiting-badge,
    .jobfiltr-worktype-badge {
      position: static !important;
      pointer-events: auto !important;
      white-space: nowrap !important;
    }
  `;
  document.head.appendChild(style);
  log('Injected badge positioning CSS');
}

// Helper function to ensure job card is a positioning context
function ensurePositionContext(jobCard) {
  const computed = window.getComputedStyle(jobCard);
  if (computed.position === 'static') {
    jobCard.style.position = 'relative';
  }
}

// ULTRATHINK: Helper function to get or create the top badges container
// This container holds badges at the top RIGHT of the card with two-row layout:
// Row 1 (top-row): [Actively Recruiting] [Job Age] - horizontal
// Row 2: [Work Type Unclear] - aligned right under Job Age
function getOrCreateTopBadgesContainer(jobCard) {
  // Inject CSS rules on first use
  injectBadgePositioningStyles();

  let container = jobCard.querySelector('.jobfiltr-top-badges-container');
  if (container) return container;

  // Ensure job card is a positioning context for absolute positioning
  ensurePositionContext(jobCard);

  container = document.createElement('div');
  container.className = 'jobfiltr-top-badges-container';

  // ULTRATHINK: Use ABSOLUTE positioning for reliable top-right placement
  // Two-row structure: top row for horizontal badges, bottom for work type unclear
  container.style.cssText = `
    position: absolute;
    top: 8px;
    right: 8px;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 4px;
    z-index: 1000;
    pointer-events: auto;
  `;

  // Create top row for horizontal badges (Actively Recruiting + Job Age)
  const topRow = document.createElement('div');
  topRow.className = 'jobfiltr-top-badges-row';
  topRow.style.cssText = `
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 6px;
  `;
  container.appendChild(topRow);

  // Append directly to job card (not to a wrapper) for consistent positioning
  jobCard.appendChild(container);

  return container;
}

// Helper to get the top row within the badges container (for horizontal badges)
function getTopBadgesRow(jobCard) {
  const container = getOrCreateTopBadgesContainer(jobCard);
  let topRow = container.querySelector('.jobfiltr-top-badges-row');
  if (!topRow) {
    topRow = document.createElement('div');
    topRow.className = 'jobfiltr-top-badges-row';
    topRow.style.cssText = `
      display: flex;
      flex-direction: row;
      align-items: center;
      gap: 6px;
    `;
    container.insertBefore(topRow, container.firstChild);
  }
  return topRow;
}

function addActiveRecruitingBadge(jobCard, recruitingInfo) {
  // Don't add duplicate badges
  if (jobCard.querySelector('.jobfiltr-recruiting-badge')) return;

  const isActive = recruitingInfo.active;
  const days = recruitingInfo.days;

  const badge = document.createElement('div');
  badge.className = 'jobfiltr-recruiting-badge';

  // Determine solid colors based on status (matching Job Age badge style)
  let bgColor, textColor, icon;
  if (isActive) {
    bgColor = '#dcfce7'; // Light green (solid)
    textColor = '#166534'; // Dark green
    icon = '✓';
    badge.innerHTML = `<span style="margin-right: 4px;">${icon}</span>Actively Recruiting`;
    badge.title = `Employer has been active within the last ${days} days`;
  } else if (isActive === false && days >= 30) {
    bgColor = '#fecaca'; // Light red (solid)
    textColor = '#991b1b'; // Dark red
    icon = '⚠️';
    badge.innerHTML = `<span style="margin-right: 4px;">${icon}</span>Possibly Stale (${days}d)`;
    badge.title = `This job posting appears to be ${days} days old - may no longer be active`;
  } else {
    // Don't show badge for uncertain status
    return;
  }

  // Apply solid styles matching Job Age badge
  badge.style.cssText = `
    background: ${bgColor};
    color: ${textColor};
    padding: 4px 10px;
    border-radius: 12px;
    font-size: 11px;
    font-weight: 600;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    border: 1px solid ${textColor}30;
    display: inline-flex;
    align-items: center;
    cursor: help;
    pointer-events: auto;
    white-space: nowrap;
  `;

  // Get the top row (horizontal row for Actively Recruiting + Job Age)
  const topRow = getTopBadgesRow(jobCard);

  // Insert at the beginning of the top row (left of Job Age)
  topRow.insertBefore(badge, topRow.firstChild);
  log(`Added ${isActive ? 'active recruiting' : 'stale posting'} badge to top row`);
}

// ===== VISA SPONSORSHIP DETECTION =====
// ULTRATHINK: Multi-tier detection for visa sponsorship mentions in job postings
// Visa sponsorship info is typically found in full job descriptions, not job cards

/**
 * Negative patterns - job does NOT offer sponsorship (check FIRST)
 * These patterns indicate the employer will NOT sponsor work visas
 */
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

/**
 * Positive patterns - job OFFERS sponsorship
 * These patterns indicate the employer WILL sponsor work visas
 */
const VISA_POSITIVE_PATTERNS = [
  // Direct sponsorship mentions
  /\bwill\s+sponsor/i,
  /visa\s+sponsor(ship)?(\s+available|\s+provided|\s+offered)?/i,
  /sponsor(s|ing|ed)?\s+(visa|work\s+authorization)/i,
  /\bsponsorship\s+available\b/i,
  /sponsorship\s+(is\s+)?(available|provided|offered)/i,
  /\bopen\s+to\s+sponsor/i,

  // Specific visa types (presence indicates sponsorship possible)
  /\bh-?1b\b/i,
  /\bh1-?b\b/i,
  /\bh-?2b\b/i,
  /\btn\s+visa\b/i,
  /\be-?3\s+visa\b/i,
  /\bl-?1\s+visa\b/i,
  /\bperm\s+(sponsorship|process|filing)/i,
  /\bgreen\s+card\s+sponsor/i,

  // General positive indicators
  /sponsor.*work\s+(permit|authorization|visa)/i,
  /immigration\s+sponsor/i
];

/**
 * Check if job description text offers visa sponsorship
 * Uses negative-first priority to handle ambiguous cases
 * @param {string} text - Job description text
 * @returns {boolean} - True if job offers sponsorship
 */
function hasVisaSponsorshipText(text) {
  if (!text || text.length < 50) return false;

  const normalizedText = text.toLowerCase();

  // Check negative patterns FIRST (higher priority)
  for (const pattern of VISA_NEGATIVE_PATTERNS) {
    if (pattern.test(normalizedText)) {
      return false;  // Explicitly says NO sponsorship
    }
  }

  // Then check positive patterns
  for (const pattern of VISA_POSITIVE_PATTERNS) {
    if (pattern.test(normalizedText)) {
      return true;  // Mentions sponsorship positively
    }
  }

  return false;  // No mention of sponsorship
}

/**
 * Check if a job card/listing offers visa sponsorship
 * Checks both job card text and expanded detail panel
 * @param {HTMLElement} jobCard - The job card element
 * @returns {boolean} - True if job offers sponsorship
 */
function hasVisaSponsorship(jobCard) {
  try {
    // First check job card text
    const cardText = getJobCardText(jobCard);
    if (hasVisaSponsorshipText(cardText)) {
      return true;
    }

    // Then check detail panel if available
    const detailPanel = document.querySelector('#jobsearch-ViewjobPaneWrapper, .jobsearch-JobComponent, #viewJobSSRRoot');
    if (detailPanel) {
      const detailText = detailPanel.innerText || detailPanel.textContent || '';
      if (hasVisaSponsorshipText(detailText)) {
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error('JobFiltr: Error checking visa sponsorship:', error);
    return false;
  }
}

/**
 * Count jobs on the current page with visa sponsorship
 * ULTRATHINK: Comprehensive detection across all visible job cards
 * @returns {{ total: number, visa: number, percentage: number }}
 */
function countVisaSponsorshipJobs() {
  const jobCardSelectors = [
    '.job_seen_beacon',
    '.jobsearch-ResultsList li',
    '[data-jk]',
    '.tapItem'
  ];

  let jobCards = [];
  for (const selector of jobCardSelectors) {
    const found = document.querySelectorAll(selector);
    if (found.length > 0) {
      jobCards = Array.from(found);
      break;
    }
  }

  if (jobCards.length === 0) {
    return { total: 0, visa: 0, percentage: 0 };
  }

  let visaCount = 0;
  for (const card of jobCards) {
    if (hasVisaSponsorship(card)) {
      visaCount++;
    }
  }

  return {
    total: jobCards.length,
    visa: visaCount,
    percentage: jobCards.length > 0 ? Math.round((visaCount / jobCards.length) * 100) : 0
  };
}

/**
 * ULTRATHINK: Check detail panel for visa sponsorship when a job is clicked
 * This function is called when visaOnly filter is active and user clicks a job card
 * It checks the full job description in the detail panel for visa sponsorship mentions
 * @param {HTMLElement} clickedJobCard - The job card that was clicked
 */
function checkDetailPanelForVisaSponsorship(clickedJobCard) {
  if (!filterSettings.visaOnly) return;

  // Get the full job description from the detail panel
  const detailPanel = document.querySelector('#jobsearch-ViewjobPaneWrapper, .jobsearch-JobComponent, #viewJobSSRRoot');
  if (!detailPanel) {
    log('No detail panel found for visa sponsorship check');
    return;
  }

  const detailText = detailPanel.innerText || detailPanel.textContent || '';
  if (!detailText || detailText.length < 100) {
    log('Detail panel text too short for visa sponsorship analysis');
    return;
  }

  // Check for visa sponsorship in the detail panel
  const hasVisa = hasVisaSponsorshipText(detailText);

  // Get job key for logging
  const jobKey = clickedJobCard.getAttribute('data-jk') ||
                 clickedJobCard.querySelector('[data-jk]')?.getAttribute('data-jk') ||
                 clickedJobCard.querySelector('a[data-jk]')?.getAttribute('data-jk');

  if (hasVisa) {
    // Job has visa sponsorship - mark it and ensure it's visible
    clickedJobCard.dataset.jobfiltrVisaSponsorship = 'true';
    log(`Visa sponsorship FOUND in detail panel for job: ${jobKey}`);

    // If this job was previously hidden due to unknown visa status, show it
    if (clickedJobCard.dataset.jobfiltrHidden === 'true' &&
        clickedJobCard.dataset.jobfiltrReasons?.includes('Visa sponsorship')) {
      clickedJobCard.style.display = '';
      delete clickedJobCard.dataset.jobfiltrHidden;
      delete clickedJobCard.dataset.jobfiltrReasons;
      hiddenJobsCount = Math.max(0, hiddenJobsCount - 1);
      try {
        chrome.runtime.sendMessage({
          type: 'FILTER_STATS_UPDATE',
          hiddenCount: hiddenJobsCount
        });
      } catch (error) {
        // Silently ignore
      }
      log(`Restored job card with visa sponsorship: ${jobKey}`);
    }
  } else {
    // No visa sponsorship found in full description - hide the job
    clickedJobCard.dataset.jobfiltrVisaSponsorship = 'false';
    log(`No visa sponsorship in detail panel for job: ${jobKey}`);

    // Hide the job card if not already hidden
    if (clickedJobCard.style.display !== 'none') {
      clickedJobCard.style.display = 'none';
      clickedJobCard.dataset.jobfiltrHidden = 'true';
      const existingReasons = clickedJobCard.dataset.jobfiltrReasons || '';
      const newReason = 'No visa sponsorship mentioned';
      clickedJobCard.dataset.jobfiltrReasons = existingReasons
        ? `${existingReasons}, ${newReason}`
        : newReason;

      hiddenJobsCount++;
      try {
        chrome.runtime.sendMessage({
          type: 'FILTER_STATS_UPDATE',
          hiddenCount: hiddenJobsCount
        });
      } catch (error) {
        // Silently ignore
      }
      log(`Hidden job card (no visa sponsorship): ${jobKey}`);
    }
  }
}

// ===== JOB AGE IN DETAIL PANEL =====
// Shows job age badge near the top of the expanded job posting detail panel

function addJobAgeToDetailPanel() {
  if (!filterSettings.showJobAge) return;

  // Remove any existing detail panel job age badge
  const existingBadge = document.querySelector('.jobfiltr-detail-age-badge');
  if (existingBadge) existingBadge.remove();

  // First, ensure we have job ages extracted
  extractJobAgesFromPageData();

  // Find the job key of the currently selected/viewed job
  // Try to find it from the URL first
  const urlParams = new URLSearchParams(window.location.search);
  let currentJobKey = urlParams.get('vjk') || urlParams.get('jk');

  // If not in URL, try to find from the selected job card
  if (!currentJobKey) {
    const selectedSelectors = [
      '.jobsearch-ResultsList li.vjs-highlight',
      '.job_seen_beacon.vjs-highlight',
      'a.jcs-JobTitle[data-jk]',
      '[data-testid="job-result"].active',
      'li[data-jk].clicked'
    ];

    for (const selector of selectedSelectors) {
      const selectedJob = document.querySelector(selector);
      if (selectedJob) {
        currentJobKey = selectedJob.getAttribute('data-jk') ||
                        selectedJob.closest('[data-jk]')?.getAttribute('data-jk');
        if (currentJobKey) break;
      }
    }
  }

  // If still no job key, try to extract from the detail panel itself
  if (!currentJobKey) {
    // Look for job key in any hidden input or data attribute
    const detailPanel = document.querySelector('.jobsearch-JobComponent, .jobsearch-ViewJobLayout');
    if (detailPanel) {
      const jobLink = detailPanel.querySelector('a[data-jk], [data-job-id]');
      if (jobLink) {
        currentJobKey = jobLink.getAttribute('data-jk') || jobLink.getAttribute('data-job-id');
      }
    }
  }

  // Look up the job age from cache
  let jobAge = null;
  if (currentJobKey && jobAgeCache[currentJobKey] !== undefined) {
    jobAge = jobAgeCache[currentJobKey];
  }

  // If we don't have age from cache, try to get it from the detail panel text
  if (jobAge === null) {
    // Look for posting date in the detail panel
    const dateSelectors = [
      '.jobsearch-JobMetadataFooter span',
      '.jobsearch-HiringInsights-entry--age',
      '[data-testid="myJobsStateDate"]',
      '.jobsearch-JobComponent .date',
      '.jobsearch-ViewJobLayout .date'
    ];

    for (const selector of dateSelectors) {
      const dateEl = document.querySelector(selector);
      if (dateEl) {
        const text = dateEl.textContent.trim().toLowerCase();
        if (text.includes('just posted') || text.includes('today')) {
          jobAge = 0;
          break;
        }
        if (text.includes('hour') || text.includes('minute')) {
          jobAge = 0;
          break;
        }
        const dayMatch = text.match(/(\d+)\s*days?\s*ago/);
        if (dayMatch) {
          jobAge = parseInt(dayMatch[1]);
          break;
        }
        const weekMatch = text.match(/(\d+)\s*weeks?\s*ago/);
        if (weekMatch) {
          jobAge = parseInt(weekMatch[1]) * 7;
          break;
        }
        if (text.includes('30+') || text.includes('month')) {
          jobAge = 30;
          break;
        }
      }
    }
  }

  if (jobAge === null) {
    log('Could not determine job age for detail panel');
    return;
  }

  // Format the age text
  const ageText = formatJobAge(jobAge);

  // Determine color based on age
  let bgColor, textColor, icon;
  if (jobAge <= 3) {
    bgColor = 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)';
    textColor = '#166534';
    icon = '🟢';
  } else if (jobAge <= 7) {
    bgColor = 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)';
    textColor = '#1e40af';
    icon = '🔵';
  } else if (jobAge <= 14) {
    bgColor = 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)';
    textColor = '#92400e';
    icon = '🟡';
  } else if (jobAge <= 30) {
    bgColor = 'linear-gradient(135deg, #fed7aa 0%, #fdba74 100%)';
    textColor = '#9a3412';
    icon = '🟠';
  } else {
    bgColor = 'linear-gradient(135deg, #fecaca 0%, #fca5a5 100%)';
    textColor = '#991b1b';
    icon = '🔴';
  }

  // Create the badge - ULTRATHINK: Sized to ~80% of original for detail panel
  const badge = document.createElement('div');
  badge.className = 'jobfiltr-detail-age-badge';
  badge.innerHTML = `
    <div style="display: flex; align-items: center; gap: 6px;">
      <span style="font-size: 15px;">${icon}</span>
      <div>
        <div style="font-weight: 700; font-size: 12px;">Posted ${ageText}${jobAge > 30 ? ' ago' : ''}</div>
        <div style="font-size: 9px; opacity: 0.8;">${jobAge <= 3 ? 'Fresh posting!' : jobAge <= 7 ? 'Recent posting' : jobAge <= 14 ? 'Moderately recent' : jobAge <= 30 ? 'Getting older' : 'May be stale'}</div>
      </div>
    </div>
  `;
  badge.style.cssText = `
    background: ${bgColor};
    color: ${textColor};
    padding: 10px 13px;
    border-radius: 10px;
    font-size: 9px;
    font-weight: 600;
    box-shadow: 0 2px 6px rgba(0,0,0,0.1);
    border: 1px solid ${textColor}30;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    max-width: fit-content;
  `;

  // First, check if the badges container exists (created by Ghost Job badge)
  // If it exists, append the Job Age badge to the right of the Ghost badge
  let container = document.querySelector('.jobfiltr-badges-container');
  if (container) {
    container.appendChild(badge);
    log('Added job age badge to badges container (right of Ghost badge)');
    return;
  }

  // If no container exists yet, create one directly under the job title
  // Priority: job title first (for proper positioning under title)
  const insertTargets = [
    'h1.jobsearch-JobInfoHeader-title',  // Primary: directly under job title
    '[data-testid="jobsearch-JobInfoHeader-title"]',
    '.jobsearch-JobInfoHeader-title',
    '.jobsearch-JobInfoHeader-title-container',
    '.jobsearch-JobInfoHeader-subtitle',
    '[data-testid="jobsearch-JobInfoHeader-subtitle"]',
    '.jobsearch-InlineCompanyRating',
    '.jobsearch-JobInfoHeader',
    '.jobsearch-CompanyInfoContainer',
    '.jobsearch-ViewJobLayout-jobDisplay',
    '.jobsearch-JobComponent-description',
    '#jobDescriptionText'
  ];

  for (const selector of insertTargets) {
    const target = document.querySelector(selector);
    if (target) {
      // Create a container for badges layout directly under job title - ~80% size
      container = document.createElement('div');
      container.className = 'jobfiltr-badges-container';
      container.style.cssText = `
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        align-items: flex-start;
        margin: 10px 0;
      `;
      container.appendChild(badge);
      target.insertAdjacentElement('afterend', container);
      log('Created badges container under job title and added job age badge');
      return;
    }
  }

  log('Could not find suitable location for job age badge in detail panel');
}

// ===== JOB AGE DETECTION =====

// Cache for job ages extracted from page JSON data
// Exposed to window for cross-script access (e.g., ghost-detection-bundle)
let jobAgeCache = {};
let lastJobAgeCacheUpdate = 0;
let mosaicDataRequested = false;

// Expose cache access function to window for ghost detection bundle
// Using a function instead of direct reference ensures ghost detection always gets current data
window.getIndeedJobAge = (jobKey) => {
  if (jobAgeCache[jobKey] !== undefined) {
    console.log('[JobFiltr] getIndeedJobAge called for', jobKey, '->', jobAgeCache[jobKey]);
    return jobAgeCache[jobKey];
  }
  return null;
};
// Also expose the cache object directly for debugging
window.indeedJobAgeCache = jobAgeCache;

// ===== SALARY DATA CACHE =====
// Cache for extractedSalary and jobTypes from mosaic data
// Structure: { jobkey: { extractedSalary: {min, max, type}, jobTypes: ['Full-time'] } }
let jobSalaryCache = {};

// Listen for mosaic data from injected page script
window.addEventListener('jobfiltr-mosaic-data', (event) => {
  try {
    const jobs = event.detail;
    if (jobs && Array.isArray(jobs)) {
      const now = Date.now();
      jobs.forEach(job => {
        if (!job.jobkey) return;

        let ageDays = null;

        // PRIORITY 1: Calculate EXACT age from pubDate Unix timestamp (most accurate)
        // ULTRATHINK: Use fractional days (not Math.floor) for sub-day precision
        // This enables accurate 12h and 24h filtering
        if (job.pubDate && job.pubDate > 0) {
          const pubDateMs = typeof job.pubDate === 'number' ? job.pubDate : parseInt(job.pubDate);
          if (!isNaN(pubDateMs) && pubDateMs > 0) {
            const ageMs = now - pubDateMs;
            ageDays = ageMs / (1000 * 60 * 60 * 24);
            if (ageDays < 0) ageDays = 0;
            // Round to 2 decimal places for precision
            ageDays = Math.round(ageDays * 100) / 100;
          }
        }

        // PRIORITY 2: Calculate from createDate Unix timestamp
        if (ageDays === null && job.createDate && job.createDate > 0) {
          const createDateMs = typeof job.createDate === 'number' ? job.createDate : parseInt(job.createDate);
          if (!isNaN(createDateMs) && createDateMs > 0) {
            const ageMs = now - createDateMs;
            ageDays = ageMs / (1000 * 60 * 60 * 24);
            if (ageDays < 0) ageDays = 0;
            ageDays = Math.round(ageDays * 100) / 100;
          }
        }

        // PRIORITY 3: Fallback to formattedRelativeTime
        // ULTRATHINK: Convert hours to fractional days for sub-day filtering accuracy
        if (ageDays === null && job.formattedRelativeTime) {
          const relTime = job.formattedRelativeTime.toString().trim().toLowerCase();

          if (relTime.includes('just posted') || relTime.includes('today') || relTime === 'just now') {
            ageDays = 0;
          } else if (relTime.includes('30+') || relTime.includes('30 +')) {
            ageDays = 30;
          } else if (relTime.includes('hour')) {
            // Convert hours to fractional days for accurate filtering
            const numMatch = relTime.match(/(\d+)/);
            const hours = numMatch ? parseInt(numMatch[1]) : 1;
            ageDays = Math.round((hours / 24) * 100) / 100; // e.g., 12 hours = 0.5 days
          } else if (relTime.includes('minute')) {
            ageDays = 0.01; // Minutes = very recent, but not zero for filtering
          } else if (relTime.includes('day')) {
            const numMatch = relTime.match(/(\d+)/);
            if (numMatch) ageDays = parseInt(numMatch[1]);
          } else if (relTime.includes('week')) {
            const numMatch = relTime.match(/(\d+)/);
            ageDays = numMatch ? parseInt(numMatch[1]) * 7 : 7;
          } else if (relTime.includes('month')) {
            const numMatch = relTime.match(/(\d+)/);
            ageDays = numMatch ? parseInt(numMatch[1]) * 30 : 30;
          } else {
            const numMatch = relTime.match(/^(\d+)/);
            if (numMatch) ageDays = parseInt(numMatch[1]);
          }
        }

        if (ageDays !== null && ageDays >= 0) {
          jobAgeCache[job.jobkey] = ageDays;
        }

        // SALARY DATA: Cache extractedSalary and jobTypes for salary filtering
        if (job.extractedSalary || (job.jobTypes && job.jobTypes.length > 0)) {
          jobSalaryCache[job.jobkey] = {
            extractedSalary: job.extractedSalary || null,
            jobTypes: job.jobTypes || [],
            salarySnippetText: job.salarySnippetText || null
          };
        }
      });

      log(`Received job ages for ${Object.keys(jobAgeCache).length} jobs from page context`);
      log(`Received salary data for ${Object.keys(jobSalaryCache).length} jobs from page context`);
      lastJobAgeCacheUpdate = Date.now();
    }
  } catch (error) {
    log('Error processing mosaic data:', error);
  }
});

// Inject script into page context to access window.mosaic
function injectMosaicDataExtractor() {
  // Only inject once
  if (document.getElementById('jobfiltr-mosaic-extractor')) return;

  const script = document.createElement('script');
  script.id = 'jobfiltr-mosaic-extractor';
  script.textContent = `
    (function() {
      function extractAndSendMosaicData() {
        try {
          if (window.mosaic && window.mosaic.providerData) {
            const jobcardsProvider = window.mosaic.providerData['mosaic-provider-jobcards'];
            if (jobcardsProvider && jobcardsProvider.metaData &&
                jobcardsProvider.metaData.mosaicProviderJobCardsModel &&
                jobcardsProvider.metaData.mosaicProviderJobCardsModel.results) {
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
              window.dispatchEvent(new CustomEvent('jobfiltr-mosaic-data', { detail: jobData }));
            }
          }
        } catch (e) {
          console.error('JobFiltr: Error extracting mosaic data:', e);
        }
      }

      // Extract immediately
      extractAndSendMosaicData();

      // Also listen for requests to re-extract (for dynamic page updates)
      window.addEventListener('jobfiltr-request-mosaic', extractAndSendMosaicData);
    })();
  `;
  document.documentElement.appendChild(script);
}

// Request fresh mosaic data from page context
function requestMosaicData() {
  window.dispatchEvent(new CustomEvent('jobfiltr-request-mosaic'));
}

// Extract job ages from Indeed's embedded JSON data
// Uses page source parsing (works reliably in content script context)
// Also tries injecting a script for window.mosaic access as a backup
function extractJobAgesFromPageData() {
  try {
    const now = Date.now();

    // Only update cache every 5 seconds to avoid excessive processing
    if (now - lastJobAgeCacheUpdate < 5000 && Object.keys(jobAgeCache).length > 0) {
      return;
    }
    lastJobAgeCacheUpdate = now;

    // PRIMARY METHOD: Parse from page source (always works in content script)
    extractJobAgesFromPageSource();

    // BACKUP METHOD: Try injecting script for window.mosaic access
    // This is less reliable but might catch edge cases
    if (Object.keys(jobAgeCache).length === 0) {
      injectMosaicDataExtractor();
      requestMosaicData();
    }
  } catch (error) {
    log('Error extracting job ages from page data:', error);
  }
}

// Fallback: Extract job ages from page source HTML
// This parses the embedded JSON in script tags to find job posting dates
function extractJobAgesFromPageSource() {
  try {
    const scripts = document.querySelectorAll('script');
    const now = Date.now();

    for (const script of scripts) {
      const text = script.textContent || '';

      // Look for the mosaic provider data script with job data
      if (text.includes('mosaic-provider-jobcards') && text.includes('jobkey') && text.includes('pubDate')) {
        log('Found mosaic-provider-jobcards script, parsing...');

        // Find all job entries with jobkey and extract their data
        // Pattern: look for jobkey, then find pubDate or formattedRelativeTime nearby
        const jobkeyPattern = /"jobkey"\s*:\s*"([a-f0-9]+)"/gi;
        let match;

        while ((match = jobkeyPattern.exec(text)) !== null) {
          const jobKey = match[1];
          const matchPos = match.index;

          // Don't re-extract if already in cache
          if (jobAgeCache[jobKey]) continue;

          // Look for pubDate and formattedRelativeTime within 1000 chars after jobkey
          // (job objects can be large with many fields)
          const searchWindow = text.substring(matchPos, matchPos + 1500);

          let ageDays = null;

          // ULTRATHINK: Store precise fractional days for hour-level accuracy
          // This enables accurate filtering for "12 hours" and "24 hours" options

          // Try pubDate first (most accurate - millisecond timestamp)
          const pubDateMatch = searchWindow.match(/"pubDate"\s*:\s*(\d+)/);
          if (pubDateMatch) {
            const pubDate = parseInt(pubDateMatch[1]);
            if (pubDate > 1000000000000) { // Looks like milliseconds timestamp
              // ULTRATHINK: Use precise calculation to preserve hours
              // Store as fractional days (e.g., 0.5 = 12 hours, 0.25 = 6 hours)
              const ageMs = now - pubDate;
              ageDays = ageMs / (1000 * 60 * 60 * 24);
              if (ageDays < 0) ageDays = 0;
              // Round to 2 decimal places for precision without excessive detail
              ageDays = Math.round(ageDays * 100) / 100;
            }
          }

          // Try createDate if pubDate not found
          if (ageDays === null) {
            const createDateMatch = searchWindow.match(/"createDate"\s*:\s*(\d+)/);
            if (createDateMatch) {
              const createDate = parseInt(createDateMatch[1]);
              if (createDate > 1000000000000) {
                const ageMs = now - createDate;
                ageDays = ageMs / (1000 * 60 * 60 * 24);
                if (ageDays < 0) ageDays = 0;
                ageDays = Math.round(ageDays * 100) / 100;
              }
            }
          }

          // Fallback to formattedRelativeTime
          // ULTRATHINK: Convert hours to fractional days for sub-day filtering accuracy
          if (ageDays === null) {
            const relTimeMatch = searchWindow.match(/"formattedRelativeTime"\s*:\s*"([^"]+)"/);
            if (relTimeMatch) {
              const relTime = relTimeMatch[1].toLowerCase();
              if (relTime.includes('just') || relTime.includes('today')) {
                ageDays = 0;
              } else if (relTime.includes('minute')) {
                ageDays = 0.01; // Minutes = very recent
              } else if (relTime.includes('hour')) {
                // Convert hours to fractional days for accurate filtering
                const numMatch = relTime.match(/(\d+)/);
                const hours = numMatch ? parseInt(numMatch[1]) : 1;
                ageDays = Math.round((hours / 24) * 100) / 100;
              } else if (relTime.includes('30+')) {
                ageDays = 30;
              } else {
                const numMatch = relTime.match(/(\d+)/);
                if (numMatch) {
                  const num = parseInt(numMatch[1]);
                  if (relTime.includes('day')) ageDays = num;
                  else if (relTime.includes('week')) ageDays = num * 7;
                  else if (relTime.includes('month')) ageDays = num * 30;
                  else ageDays = num; // Just the number
                }
              }
            }
          }

          if (ageDays !== null && ageDays >= 0) {
            jobAgeCache[jobKey] = ageDays;
          }
        }

        if (Object.keys(jobAgeCache).length > 0) {
          log(`Extracted job ages for ${Object.keys(jobAgeCache).length} jobs from page source`);
          return; // Found data, no need to check other scripts
        }
      }
    }

    // Log if nothing found
    if (Object.keys(jobAgeCache).length === 0) {
      log('No job age data found in page source');
    }
  } catch (error) {
    log('Error extracting job ages from page source:', error);
  }
}

// Get job age for a specific job card
function getJobAge(jobCard) {
  try {
    // First, try to extract ages from page data if not done recently
    extractJobAgesFromPageData();

    // Get job key from the job card
    const jobKey = jobCard.getAttribute('data-jk') ||
                   jobCard.querySelector('[data-jk]')?.getAttribute('data-jk');

    // Check our cache first
    if (jobKey && jobAgeCache[jobKey] !== undefined) {
      return jobAgeCache[jobKey];
    }

    // Fallback: Try to find age in DOM elements
    // Try multiple selectors for time/date elements - comprehensive list for Indeed's current DOM
    const timeSelectors = [
      '.date',
      'span.date',
      '[data-testid="job-age"]',
      '[data-testid="myJobsStateDate"]',
      '.jobsearch-HiringInsights-entry--age',
      '.jobCardShelfContainer .date',
      '.job-snippet .date',
      '.metadata .date',
      '.underShelfFooter .date',
      // Indeed's "EmployerActive" indicator
      '[class*="EmployerActive"]',
      '[class*="employer-active"]',
      '.jobMetaDataGroup span',
      // Job card footer elements
      '.jobsearch-JobMetadataFooter span',
      '.result-footer span',
      // Newer Indeed selectors
      '[class*="posted"]',
      '[class*="date"]',
      '[class*="age"]'
    ];

    for (const selector of timeSelectors) {
      const timeElems = jobCard.querySelectorAll(selector);
      for (const timeElem of timeElems) {
        const text = timeElem.textContent.trim().toLowerCase();

        // Skip if text doesn't look like a date
        if (!text || text.length > 100) continue;

        // Match patterns - "EmployerActive X days ago" is common on Indeed
        if (text.includes('just posted') || text.includes('today') || text.includes('just now')) return 0;

        // ULTRATHINK: Convert hours/minutes to fractional days for accurate filtering
        if (text.includes('minute')) return 0.01; // Very recent
        if (text.includes('hour')) {
          const match = text.match(/(\d+)/);
          const hours = match ? parseInt(match[1]) : 1;
          return Math.round((hours / 24) * 100) / 100; // e.g., 12 hours = 0.5 days
        }

        // Check for "Active X days ago" or "EmployerActive X days ago"
        const activeMatch = text.match(/(?:employer\s*)?active\s*(\d+)\s*days?\s*ago/i);
        if (activeMatch) return parseInt(activeMatch[1]);

        if (text.includes('day')) {
          const match = text.match(/(\d+)/);
          if (match) return parseInt(match[1]);
        }
        if (text.includes('week')) {
          const match = text.match(/(\d+)/);
          return match ? parseInt(match[1]) * 7 : 7;
        }
        if (text.includes('month')) {
          const match = text.match(/(\d+)/);
          return match ? parseInt(match[1]) * 30 : 30;
        }

        // Check for "30+ days ago" pattern
        if (text.includes('30+')) return 30;
      }
    }

    // Also check the full job card text for time references
    // ULTRATHINK: Hours now return fractional days for accurate sub-day filtering
    const fullText = jobCard.textContent.toLowerCase();
    const timePatterns = [
      { pattern: /just\s+posted/i, days: 0 },
      { pattern: /just\s+now/i, days: 0 },
      { pattern: /today/i, days: 0 },
      { pattern: /(\d+)\s*(?:minutes?|min|m)\s*ago/i, days: 0.01 },
      // Hours: convert to fractional days (e.g., 12 hours = 0.5 days)
      { pattern: /(\d+)\s*(?:hours?|hr|h)\s*ago/i, hourMultiplier: 1/24 },
      // "EmployerActive X days ago" - Indeed's current format
      { pattern: /(?:employer\s*)?active\s*(\d+)\s*days?\s*ago/i, multiplier: 1 },
      { pattern: /(\d+)\s*(?:days?|d)\s*ago/i, multiplier: 1 },
      { pattern: /(\d+)\s*(?:weeks?|wk|w)\s*ago/i, multiplier: 7 },
      { pattern: /(\d+)\s*(?:months?|mo)\s*ago/i, multiplier: 30 },
      { pattern: /30\+\s*days?\s*ago/i, days: 30 },
      // Posted X days format
      { pattern: /posted\s*(\d+)\s*days?\s*ago/i, multiplier: 1 },
      { pattern: /posted\s*(\d+)\s*weeks?\s*ago/i, multiplier: 7 },
      { pattern: /posted\s*(\d+)\s*months?\s*ago/i, multiplier: 30 }
    ];

    for (const { pattern, multiplier, hourMultiplier, days } of timePatterns) {
      const match = fullText.match(pattern);
      if (match) {
        if (days !== undefined) return days;
        if (hourMultiplier !== undefined) {
          // Convert hours to fractional days
          const hours = parseInt(match[1] || 1);
          return Math.round((hours * hourMultiplier) * 100) / 100;
        }
        return parseInt(match[1] || 1) * (multiplier || 1);
      }
    }

    return null;
  } catch (error) {
    log('Error getting job age:', error);
    return null;
  }
}

// Format job age for display
// ULTRATHINK: Now handles fractional days for hour-level precision
// For jobs 30+ days old, show "30+ days" with estimated exact age
function formatJobAge(days) {
  // Handle sub-day precision (fractional days)
  if (days < 0.04) return 'Just now';  // Less than 1 hour
  if (days < 0.5) {
    const hours = Math.round(days * 24);
    return hours <= 1 ? '1 hour' : `${hours} hours`;
  }
  if (days < 1) return 'Today';  // 12-24 hours
  if (days < 2) return '1 day';
  if (days <= 30) return `${Math.round(days)} days`;

  // For jobs over 30 days, show "30+ days" with estimate
  // Format the estimate based on how old it is
  if (days <= 60) {
    return `30+ days (~${Math.round(days)}d)`;
  } else if (days <= 90) {
    const weeks = Math.round(days / 7);
    return `30+ days (~${weeks}w)`;
  } else if (days <= 365) {
    const months = Math.round(days / 30);
    return `30+ days (~${months}mo)`;
  } else {
    // Over a year old
    const years = Math.floor(days / 365);
    return `30+ days (~${years}y+)`;
  }
}

// Add job age badge to job card (positioned to the RIGHT of active recruiting badge)
// ULTRATHINK: Both badges share a container at the top of the card, above the job title
function addJobAgeBadge(jobCard, days) {
  // Remove existing job age badge if any
  const existingBadge = jobCard.querySelector('.jobfiltr-age-badge');
  if (existingBadge) existingBadge.remove();

  const ageText = formatJobAge(days);

  // Determine color based on age
  let bgColor, textColor, icon;
  if (days <= 3) {
    bgColor = '#dcfce7'; // Light green
    textColor = '#166534'; // Dark green
    icon = '🟢';
  } else if (days <= 7) {
    bgColor = '#dbeafe'; // Light blue
    textColor = '#1e40af'; // Dark blue
    icon = '🔵';
  } else if (days <= 14) {
    bgColor = '#fef3c7'; // Light yellow
    textColor = '#92400e'; // Dark amber
    icon = '🟡';
  } else if (days <= 30) {
    bgColor = '#fed7aa'; // Light orange
    textColor = '#9a3412'; // Dark orange
    icon = '🟠';
  } else {
    bgColor = '#fecaca'; // Light red
    textColor = '#991b1b'; // Dark red
    icon = '🔴';
  }

  const badge = document.createElement('div');
  badge.className = 'jobfiltr-age-badge';
  badge.innerHTML = `<span style="margin-right: 4px;">${icon}</span>${ageText}`;

  // Job age badge styling - positioned via absolute container at top-right
  badge.style.cssText = `
    background: ${bgColor};
    color: ${textColor};
    padding: 4px 10px;
    border-radius: 12px;
    font-size: 11px;
    font-weight: 600;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    border: 1px solid ${textColor}30;
    display: inline-flex;
    align-items: center;
    pointer-events: auto;
    white-space: nowrap;
  `;

  // Get the top row (horizontal row for Actively Recruiting + Job Age)
  // Job Age goes at the END (right side) of the row
  const topRow = getTopBadgesRow(jobCard);
  topRow.appendChild(badge);
}

// Add "No Date" badge when job age data is unavailable (e.g., sponsored/ad jobs)
function addUnknownAgeBadge(jobCard) {
  const existingBadge = jobCard.querySelector('.jobfiltr-age-badge');
  if (existingBadge) existingBadge.remove();

  const badge = document.createElement('div');
  badge.className = 'jobfiltr-age-badge';
  badge.innerHTML = `<span style="margin-right: 4px;">⚪</span>No Date`;
  badge.title = 'Indeed did not provide posting date data for this job (typically sponsored/ad listings)';

  badge.style.cssText = `
    background: #f3f4f6;
    color: #6b7280;
    padding: 4px 10px;
    border-radius: 12px;
    font-size: 11px;
    font-weight: 600;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    border: 1px solid #6b728030;
    display: inline-flex;
    align-items: center;
    pointer-events: auto;
    white-space: nowrap;
  `;

  const topRow = getTopBadgesRow(jobCard);
  topRow.appendChild(badge);
}

// Add "No Data" recruiting badge when recruiting status can't be determined
function addUnknownRecruitingBadge(jobCard) {
  if (jobCard.querySelector('.jobfiltr-recruiting-badge')) return;

  const badge = document.createElement('div');
  badge.className = 'jobfiltr-recruiting-badge';
  badge.innerHTML = `<span style="margin-right: 4px;">❓</span>No Data`;
  badge.title = 'Recruiting status unknown - no posting date data available for this job';

  badge.style.cssText = `
    background: #f3f4f6;
    color: #6b7280;
    padding: 4px 10px;
    border-radius: 12px;
    font-size: 11px;
    font-weight: 600;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    border: 1px solid #6b728030;
    display: inline-flex;
    align-items: center;
    cursor: help;
    pointer-events: auto;
    white-space: nowrap;
  `;

  const topRow = getTopBadgesRow(jobCard);
  topRow.insertBefore(badge, topRow.firstChild);
}

// ===== MAIN FILTER APPLICATION =====
function applyFilters(settings) {
  // ULTRATHINK: Prevent concurrent filter runs to avoid flashing
  if (isFilteringInProgress) {
    log('Filter already in progress, skipping');
    return;
  }
  isFilteringInProgress = true;

  filterSettings = settings;
  // ULTRATHINK: Use local count to prevent global from flashing to 0
  let currentHiddenCount = 0;

  log('Applying filters with settings:', settings);

  const jobCardSelectors = [
    '.jobsearch-ResultsList > li',
    '.job_seen_beacon',
    '[data-testid="job-result"]',
    'li[data-jk]',
    'div.job_seen_beacon',
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

  jobCards.forEach((jobCard) => {
    let shouldHide = false;
    const reasons = [];

    // Remove generic badges first (specific badge types are managed by their own filter logic)
    const existingBadges = jobCard.querySelectorAll('.jobfiltr-badge');
    existingBadges.forEach(b => b.remove());

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

    // Filter 2: Hide Sponsored
    if (settings.hideSponsored && isSponsored(jobCard)) {
      shouldHide = true;
      reasons.push('Sponsored');
    }

    // Filter 2.5: Auto-Hide Applied Jobs
    // Hides jobs that the user has already applied to based on text patterns
    if (settings.hideApplied && hasAppliedText(jobCard)) {
      shouldHide = true;
      reasons.push('Already applied');
    }

    // Filter 2.6: Urgently Hiring Only (Indeed-specific)
    // Shows only jobs with the "Urgently Hiring" badge when enabled
    if (settings.filterUrgentlyHiring && !isUrgentlyHiring(jobCard)) {
      shouldHide = true;
      reasons.push('Not urgently hiring');
    }

    // Filter 3: Early Applicant Filter (with display mode support)
    // Shows only jobs where you can be among the first to apply OR flags them with badge
    if (settings.filterEarlyApplicant) {
      const displayMode = settings.earlyApplicantDisplayMode || 'hide';
      const isEarly = isEarlyApplicant(jobCard);

      if (displayMode === 'hide') {
        // Hide mode: hide non-early applicant jobs
        if (!isEarly) {
          shouldHide = true;
          reasons.push('Not an early applicant opportunity');
        }
      } else if (displayMode === 'flag') {
        // Flag mode: add badge to early applicant jobs
        if (isEarly) {
          addEarlyApplicantBadgeToCard(jobCard);
        } else {
          removeEarlyApplicantBadgeFromCard(jobCard);
        }
      }
    } else {
      // Remove badge if filter is disabled
      removeEarlyApplicantBadgeFromCard(jobCard);
    }

    // Filter 3.5: Job Posting Age (ULTRATHINK: More accurate than native filter)
    // Uses precise pubDate timestamps from Indeed's JSON data for accuracy
    if (settings.filterPostingAge) {
      const jobAge = getJobAge(jobCard);
      if (jobAge !== null) {
        const range = settings.postingAgeRange;
        let maxDays = 7; // default 1 week

        // ULTRATHINK: Map posting age range to max days
        // For sub-day options (12h, 24h), we use fractional days for precision
        // Now using actual millisecond timestamps from Indeed's pubDate for accuracy
        if (range === '12h') maxDays = 0.5;      // 12 hours = 0.5 days
        else if (range === '24h') maxDays = 1;   // 24 hours = 1 day
        else if (range === '3d') maxDays = 3;
        else if (range === '1w') maxDays = 7;
        else if (range === '2w') maxDays = 14;
        else if (range === '1m') maxDays = 30;

        // ULTRATHINK: With precise fractional days from pubDate timestamps,
        // we can now accurately filter 12h and 24h options
        if (jobAge > maxDays) {
          shouldHide = true;
          // Format reason message appropriately
          let ageDisplay;
          if (jobAge < 1) {
            const hours = Math.round(jobAge * 24);
            ageDisplay = `${hours} hours ago`;
          } else if (jobAge < 2) {
            const hours = Math.round(jobAge * 24);
            ageDisplay = `${hours} hours ago`;
          } else {
            ageDisplay = `${Math.round(jobAge)} days ago`;
          }

          // Format limit message
          let limitDisplay;
          if (range === '12h') limitDisplay = '12 hours';
          else if (range === '24h') limitDisplay = '24 hours';
          else if (range === '3d') limitDisplay = '3 days';
          else if (range === '1w') limitDisplay = '1 week';
          else if (range === '2w') limitDisplay = '2 weeks';
          else if (range === '1m') limitDisplay = '1 month';
          else limitDisplay = range;

          reasons.push(`Posted ${ageDisplay} (limit: ${limitDisplay})`);
        }
      }
      // Note: If jobAge is null, we don't hide - prefer showing jobs when age is unknown
    }

    // Filter 4: True Remote Accuracy
    if (settings.trueRemoteAccuracy) {
      if (detectNonRemoteIndicators(jobCard, settings)) {
        shouldHide = true;
        reasons.push('Non-remote indicators detected');
      }
    }

    // Job Age Display (display only, doesn't hide)
    // ULTRATHINK: Moved before Work Type Unclear Badge so Job Age appears on TOP in vertical stack
    if (settings.showJobAge && !shouldHide) {
      let jobAge = getJobAge(jobCard);
      // Use cached age if getJobAge returns null but we have a cached value
      if (jobAge === null && jobCard.dataset.jobfiltrAge) {
        jobAge = parseInt(jobCard.dataset.jobfiltrAge, 10);
      }
      if (jobAge !== null) {
        // Cache the job age for future reference
        jobCard.dataset.jobfiltrAge = jobAge.toString();
        addJobAgeBadge(jobCard, jobAge);
      } else {
        // Show "No Date" badge when age data is unavailable (sponsored/ad jobs)
        addUnknownAgeBadge(jobCard);
      }
    } else {
      // Remove job age badge when filter is disabled
      const ageBadge = jobCard.querySelector('.jobfiltr-age-badge');
      if (ageBadge) ageBadge.remove();
    }

    // Filter 4.5: Work Type Unclear Badge (ULTRATHINK)
    // Shows warning badge when True Remote Accuracy is active but job has no work type info
    // Appears BELOW Job Age badge in the vertical stack
    // Remove existing badge first to ensure clean state
    removeWorkTypeBadge(jobCard);
    if (settings.trueRemoteAccuracy && settings.showWorkTypeUnclear !== false && !shouldHide) {
      const workType = detectWorkLocationType(jobCard);
      if (workType.type === 'unclear') {
        addWorkTypeUnclearBadge(jobCard);
        log(`Work Type Unclear badge added: ${workType.details}`);
      }
    }

    // Filter 5: Include Keywords
    if (settings.filterIncludeKeywords && settings.includeKeywords && settings.includeKeywords.length > 0) {
      if (!matchesIncludeKeywords(jobCard, settings.includeKeywords)) {
        shouldHide = true;
        reasons.push('Missing required keywords');
      }
    }

    // Filter 6: Exclude Keywords
    if (settings.filterExcludeKeywords && settings.excludeKeywords && settings.excludeKeywords.length > 0) {
      if (matchesExcludeKeywords(jobCard, settings.excludeKeywords)) {
        shouldHide = true;
        reasons.push('Contains excluded keywords');
      }
    }

    // Filter 6b: Exclude Companies
    if (settings.filterExcludeCompanies && settings.excludeCompanies?.length > 0) {
      if (matchesExcludeCompanies(jobCard, settings.excludeCompanies)) {
        shouldHide = true;
        reasons.push('Excluded company');
      }
    }

    // Filter 7: Salary Range Filter
    if (settings.filterSalary) {
      // 7a: Hide jobs without salary info
      if (settings.hideNoSalary) {
        if (!hasSalaryInfo(jobCard)) {
          shouldHide = true;
          reasons.push('No salary info');
        }
      }

      // 7b: Filter by salary range (if min or max is set)
      if (!shouldHide && (settings.minSalary || settings.maxSalary)) {
        const salaryData = getJobSalaryData(jobCard);
        if (salaryData) {
          const salaryMatch = checkSalaryMatch(salaryData, settings);
          if (!salaryMatch.matches) {
            shouldHide = true;
            reasons.push(salaryMatch.reason || 'Salary out of range');
          }
        }
      }
    }

    // Filter 7c: No Salary Info Badge (display notification for visible cards without salary)
    // Shows badge when salary filter is enabled and job has no salary info but is not hidden
    removeNoSalaryBadge(jobCard);
    if (settings.filterSalary && !shouldHide && !hasSalaryInfo(jobCard)) {
      addNoSalaryBadge(jobCard);
    }

    // Filter 8: Active Recruiting Badge
    // Shows green badge for actively recruiting, warns for stale postings
    if (settings.showActiveRecruiting) {
      const recruitingInfo = isActivelyRecruiting(jobCard);
      if (recruitingInfo) {
        // Option to hide stale postings
        if (settings.hideStalePostings && recruitingInfo.active === false && recruitingInfo.days >= 30) {
          shouldHide = true;
          reasons.push(`Stale posting: ${recruitingInfo.days} days old`);
        }
        // Add badge for active or stale status
        if (!shouldHide) {
          addActiveRecruitingBadge(jobCard, recruitingInfo);
        }
      } else if (!shouldHide) {
        // Show "No Data" badge when recruiting status can't be determined
        addUnknownRecruitingBadge(jobCard);
      }
    } else {
      // Remove recruiting badge when filter is disabled
      const recruitBadge = jobCard.querySelector('.jobfiltr-recruiting-badge');
      if (recruitBadge) recruitBadge.remove();
    }

    // Filter 9: Visa Sponsorship Only
    // ULTRATHINK: Hide jobs that don't explicitly mention visa sponsorship
    // This checks both job card text AND the detail panel if available
    // Jobs without visa sponsorship mentions will be hidden when this filter is active
    if (settings.visaOnly && !shouldHide) {
      // Check if this job card is the currently selected one (detail panel visible)
      const jobKey = jobCard.getAttribute('data-jk') ||
                     jobCard.querySelector('[data-jk]')?.getAttribute('data-jk') ||
                     jobCard.querySelector('a[data-jk]')?.getAttribute('data-jk');

      const urlParams = new URLSearchParams(window.location.search);
      const selectedJobKey = urlParams.get('vjk') || urlParams.get('jk');
      const isSelectedJob = jobKey && selectedJobKey && jobKey === selectedJobKey;

      // For the selected job, we can check the detail panel for visa info
      // For other jobs, we check the job card text only
      const hasVisa = hasVisaSponsorship(jobCard);

      // If we found visa sponsorship info (either in card or detail panel for selected job), mark it
      if (hasVisa) {
        jobCard.dataset.jobfiltrVisaSponsorship = 'true';
        log(`Job has visa sponsorship: ${jobKey}`);
      } else {
        // Check if we've previously verified this job has visa sponsorship
        if (jobCard.dataset.jobfiltrVisaSponsorship === 'true') {
          // Previously verified - keep it visible
          log(`Job previously verified with visa sponsorship: ${jobKey}`);
        } else if (isSelectedJob) {
          // This is the selected job and we checked the detail panel - definitely no visa
          shouldHide = true;
          reasons.push('No visa sponsorship mentioned');
          jobCard.dataset.jobfiltrVisaSponsorship = 'false';
          log(`Selected job has no visa sponsorship: ${jobKey}`);
        } else {
          // Not the selected job - we can only check card text
          // Card text rarely has visa info, so check if description is loaded
          const cardText = getJobCardText(jobCard);
          if (cardText && cardText.length > 200) {
            // Has substantial text but no visa mention - likely no sponsorship
            shouldHide = true;
            reasons.push('No visa sponsorship mentioned');
            log(`Job card text has no visa sponsorship: ${jobKey}`);
          } else {
            // Not enough info to determine - hide to be safe (user wants visa ONLY)
            shouldHide = true;
            reasons.push('Visa sponsorship status unknown');
            log(`Insufficient info to verify visa sponsorship: ${jobKey}`);
          }
        }
      }
    }

    // NOTE: Job Age Display has been moved earlier (before Work Type Unclear Badge)
    // to ensure proper vertical stacking order in the badges container

    // Filter 10: Community-Reported Companies (highlight with orange)
    // Shows orange outline and badge for companies reported for spam/ghost jobs
    if (settings.showCommunityReportedWarnings !== false) {
      const reportResult = checkReportedCompanyFromCard(jobCard);
      if (reportResult) {
        applyReportedCompanyHighlight(jobCard, reportResult);
        log(`Reported company detected: ${reportResult.company.name}`);
      } else {
        // Remove styling if company is not in the reported list
        removeReportedCompanyStyling(jobCard);
      }
    } else {
      // Remove styling when feature is disabled
      removeReportedCompanyStyling(jobCard);
    }

    // Apply hiding - ULTRATHINK: Only change display if state actually changes to prevent flashing
    if (shouldHide) {
      // Only hide if not already hidden to prevent flashing
      if (jobCard.style.display !== 'none') {
        jobCard.style.display = 'none';
        jobCard.dataset.jobfiltrHidden = 'true';
        jobCard.dataset.jobfiltrReasons = reasons.join(', ');
        log(`Hidden job card: ${reasons.join(', ')}`);
      }
      currentHiddenCount++;
    } else {
      // Only show if it was hidden by us (not by other means) to prevent flashing
      if (jobCard.style.display === 'none' && jobCard.dataset.jobfiltrHidden) {
        jobCard.style.display = '';
        delete jobCard.dataset.jobfiltrHidden;
        delete jobCard.dataset.jobfiltrReasons;
      }
    }

    // ULTRATHINK: Mark card as processed for flash prevention CSS
    // This allows the CSS to reveal the card after we've determined its visibility
    jobCard.dataset.jobfiltrProcessed = 'true';
  });

  // ULTRATHINK: Update visa filter flash prevention state
  updateVisaFilterFlashPrevention(settings.visaOnly);

  // ULTRATHINK: Only update global count and send message if count actually changed
  if (currentHiddenCount !== lastSentHiddenCount) {
    hiddenJobsCount = currentHiddenCount;
    lastSentHiddenCount = currentHiddenCount;
    try {
      chrome.runtime.sendMessage({
        type: 'FILTER_STATS_UPDATE',
        hiddenCount: hiddenJobsCount
      });
    } catch (error) {
      // Silently ignore extension context invalidated errors
    }
    log(`Filtered ${hiddenJobsCount} jobs out of ${jobCards.length}`);
  }

  // Release the filter lock
  isFilteringInProgress = false;

  // Start periodic scanning to catch dynamically loaded jobs
  if (typeof startPeriodicScan === 'function') {
    startPeriodicScan();
  }
}

// ===== RESET FILTERS =====
function resetFilters() {
  // Stop periodic scanning
  if (typeof stopPeriodicScan === 'function') {
    stopPeriodicScan();
  }

  // Clear filter settings
  filterSettings = {};
  const jobCardSelectors = [
    '.jobsearch-ResultsList > li',
    '.job_seen_beacon',
    '[data-testid="job-result"]',
    'li[data-jk]'
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
    delete jobCard.dataset.jobfiltrVisaSponsorship; // Clear visa sponsorship cache
    delete jobCard.dataset.jobfiltrAge; // Clear job age cache
    delete jobCard.dataset.jobfiltrProcessed; // Clear processed marker for flash prevention
    // Remove all JobFiltr badges including container, Recruiting, Work Type, Early Applicant, and Reported Company badges
    const badges = jobCard.querySelectorAll('.jobfiltr-badge, .jobfiltr-age-badge, .jobfiltr-recruiting-badge, .jobfiltr-worktype-badge, .jobfiltr-early-applicant-badge, .jobfiltr-top-badges-container, .jobfiltr-card-reported-badge');
    badges.forEach(badge => badge.remove());
    // Remove reported company styling
    removeReportedCompanyStyling(jobCard);
  });

  // ULTRATHINK: Clear flash prevention state
  updateVisaFilterFlashPrevention(false);

  // Also remove detail panel job age badge
  const detailAgeBadge = document.querySelector('.jobfiltr-detail-age-badge');
  if (detailAgeBadge) detailAgeBadge.remove();

  // Also remove detail panel early applicant badge
  const detailEarlyBadge = document.querySelector('.jobfiltr-detail-early-applicant-badge');
  if (detailEarlyBadge) detailEarlyBadge.remove();

  // ULTRATHINK: Reset all tracking variables
  hiddenJobsCount = 0;
  lastSentHiddenCount = 0; // Set to 0 (not -1) since we're sending 0

  try {
    chrome.runtime.sendMessage({ type: 'FILTER_STATS_UPDATE', hiddenCount: 0 });
  } catch (error) {
    // Silently ignore extension context invalidated errors
  }

  log('Filters reset on Indeed');
}

// ===== MESSAGE LISTENER =====
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  log('Received message:', message);

  // FIX 8: PING handler for content script verification
  if (message.type === 'PING') {
    sendResponse({ success: true, platform: 'indeed', timestamp: Date.now() });
    return true;
  }

  if (message.type === 'EXTRACT_JOB_INFO') {
    // FIX: extractJobInfo is now async with retry logic, use .then() to handle response
    extractJobInfo().then(jobInfo => {
      sendResponse({ success: !!jobInfo, data: jobInfo });
    }).catch(error => {
      console.error('JobFiltr: Error in extractJobInfo:', error);
      sendResponse({ success: false, data: null });
    });
    return true; // Keep message channel open for async response
  }

  // ULTRATHINK: Dedicated message type for extracting posted date from JSON-LD
  // This is a fallback if the main extraction doesn't get the date
  if (message.type === 'EXTRACT_POSTED_DATE_JSONLD') {
    try {
      const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
      for (const script of jsonLdScripts) {
        const data = JSON.parse(script.textContent);
        if (data['@type'] === 'JobPosting' && data.datePosted) {
          const postedDateObj = new Date(data.datePosted);
          const now = new Date();
          const diffMs = now - postedDateObj;
          const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

          let postedDate;
          if (diffDays === 0) {
            postedDate = 'Posted today';
          } else if (diffDays === 1) {
            postedDate = 'Posted 1 day ago';
          } else {
            postedDate = `Posted ${diffDays} days ago`;
          }

          log('EXTRACT_POSTED_DATE_JSONLD: Found date:', data.datePosted, '->', postedDate);
          sendResponse({ success: true, postedDate: postedDate, daysOld: diffDays, rawDate: data.datePosted });
          return true;
        }
      }
      sendResponse({ success: false, error: 'No JSON-LD date found' });
    } catch (e) {
      sendResponse({ success: false, error: e.message });
    }
    return true;
  }

  if (message.type === 'APPLY_FILTERS') {
    // Save settings to storage so they persist across page refreshes and navigation
    chrome.storage.local.set({ filterSettings: message.settings }).then(() => {
      log('APPLY_FILTERS: Saved settings to storage');
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

  if (message.type === 'ANALYZE_GHOST_JOB') {
    // Perform ghost job analysis using the job data
    const result = performGhostAnalysis(message.jobData);
    sendResponse({ success: true, data: result });
    return true;
  }

  // Count urgently hiring jobs on current page (for UX improvements)
  if (message.type === 'COUNT_URGENTLY_HIRING') {
    const counts = countUrgentlyHiringJobs();
    log(`Urgently Hiring count: ${counts.urgent}/${counts.total} (${counts.percentage}%)`);
    sendResponse({ success: true, data: counts });
    return true;
  }

  // Count sponsored/promoted jobs on current page (for UX improvements)
  if (message.type === 'COUNT_SPONSORED_JOBS') {
    const counts = countSponsoredJobs();
    log(`Sponsored count: ${counts.sponsored}/${counts.total} (${counts.percentage}%)`);
    sendResponse({ success: true, data: counts });
    return true;
  }

  // Count early applicant jobs on current page (for UX improvements)
  if (message.type === 'COUNT_EARLY_APPLICANT') {
    const counts = countEarlyApplicantJobs();
    log(`Early Applicant count: ${counts.early}/${counts.total} (${counts.percentage}%)`);
    sendResponse({ success: true, data: counts });
    return true;
  }

  // Count visa sponsorship jobs on current page (for UX improvements)
  if (message.type === 'COUNT_VISA_SPONSORSHIP') {
    const counts = countVisaSponsorshipJobs();
    log(`Visa Sponsorship count: ${counts.visa}/${counts.total} (${counts.percentage}%)`);
    sendResponse({ success: true, data: counts });
    return true;
  }

  // Handle notification request from popup (after sign-in)
  if (message.action === 'showNotification') {
    // Force show the notification by clearing session storage
    sessionStorage.removeItem('jobfiltr_notification_shown');

    // Show different notification based on whether it's first sign-in
    if (message.isFirstSignIn) {
      showFirstSignInNotification();
    } else {
      showJobFiltrActiveNotification();
    }
    sendResponse({ success: true });
    return true;
  }

  return false;
});

// ===== GHOST JOB ANALYSIS =====
// ULTRATHINK: Fixed to return proper percentage values for confidence and breakdown
function performGhostAnalysis(jobData) {
  const redFlags = [];
  let score = 100; // Start with perfect score, subtract for issues

  // Track signals for confidence and breakdown calculations
  const signals = [];
  const breakdown = {
    temporal: 0,
    content: 0,
    company: 0,
    behavioral: 0
  };

  // ===== TEMPORAL SIGNALS =====
  let temporalRisk = 0;
  let temporalConfidence = 0.5;

  // Check posting age (if available from page or jobData)
  let daysPosted = null;
  if (jobData.postedDate) {
    daysPosted = parsePostingAgeForAnalysis(jobData.postedDate);
  }
  // Also try to get from page
  if (daysPosted === null) {
    const timeSelectors = ['.date', '[data-testid="job-age"]', '.jobsearch-HiringInsights-entry--age'];
    for (const selector of timeSelectors) {
      const timeElem = document.querySelector(selector);
      if (timeElem) {
        const text = timeElem.textContent.trim();
        daysPosted = parsePostingAgeForAnalysis(text);
        if (daysPosted !== null) break;
      }
    }
  }

  if (daysPosted !== null) {
    temporalConfidence = 0.9;
    if (daysPosted > 60) {
      temporalRisk = 0.8;
      redFlags.push(`Job posted ${daysPosted} days ago (stale posting)`);
      score -= 20;
    } else if (daysPosted > 30) {
      temporalRisk = 0.5;
      redFlags.push(`Job posted ${daysPosted} days ago`);
      score -= 10;
    } else if (daysPosted > 14) {
      temporalRisk = 0.2;
    }
  }
  signals.push({ category: 'temporal', value: temporalRisk, confidence: temporalConfidence });
  breakdown.temporal = temporalRisk * 100;

  // ===== COMPANY SIGNALS =====
  let companyRisk = 0;
  let companyConfidence = 0.7;

  // Check for staffing indicators
  const staffingPatterns = [
    /staffing|recruiting|talent|solutions|workforce/i,
    /robert\s*half|randstad|adecco|manpower|kelly\s*services/i,
    /teksystems|insight\s*global|aerotek|allegis/i,
    /cybercoders|kforce|modis|judge|apex/i
  ];

  const companyLower = (jobData.company || '').toLowerCase();
  for (const pattern of staffingPatterns) {
    if (pattern.test(companyLower)) {
      redFlags.push('Company appears to be a staffing agency');
      companyRisk = 0.6;
      companyConfidence = 0.95;
      score -= 20;
      break;
    }
  }
  signals.push({ category: 'company', value: companyRisk, confidence: companyConfidence });
  breakdown.company = companyRisk * 100;

  // ===== CONTENT SIGNALS =====
  let contentRisk = 0;
  let contentConfidence = 0.8;

  // Check for vague descriptions
  const vagueIndicators = [
    'fast-paced', 'self-starter', 'team player', 'dynamic',
    'exciting opportunity', 'competitive salary', 'rock star', 'ninja',
    'guru', 'wear many hats', 'other duties as assigned'
  ];

  const descLower = (jobData.description || '').toLowerCase();
  let vagueCount = 0;
  for (const indicator of vagueIndicators) {
    if (descLower.includes(indicator)) vagueCount++;
  }

  if (vagueCount >= 3) {
    redFlags.push('Job description contains multiple vague/buzzword phrases');
    contentRisk += 0.4;
    score -= 15;
  } else if (vagueCount >= 1) {
    redFlags.push('Job description contains some vague language');
    contentRisk += 0.15;
    score -= 5;
  }

  // Check for salary transparency
  const descText = jobData.description || '';
  if (!/\$[\d,]+/.test(descText) && !/salary|pay|compensation/i.test(descText)) {
    redFlags.push('No salary information provided');
    contentRisk += 0.25;
    score -= 10;
  }

  // Check description length
  if (descText.length < 200) {
    redFlags.push('Job description is unusually short');
    contentRisk += 0.35;
    contentConfidence = 0.9;
    score -= 15;
  } else if (descText.length < 500) {
    contentRisk += 0.1;
  }

  // Check for remote work clarity issues
  if (/remote/i.test(descText) && /hybrid|on-?site|in-?office|commute/i.test(descText)) {
    redFlags.push('Conflicting remote/in-office requirements');
    contentRisk += 0.2;
    score -= 10;
  }

  contentRisk = Math.min(1, contentRisk);
  signals.push({ category: 'content', value: contentRisk, confidence: contentConfidence });
  breakdown.content = contentRisk * 100;

  // ===== BEHAVIORAL SIGNALS =====
  let behavioralRisk = 0;
  let behavioralConfidence = 0.6;

  // Check applicant count if available
  if (jobData.applicantCount !== undefined && jobData.applicantCount !== null) {
    behavioralConfidence = 0.85;
    if (jobData.applicantCount > 500) {
      behavioralRisk = 0.5;
      redFlags.push(`High applicant volume (${jobData.applicantCount}+)`);
      score -= 10;
    } else if (jobData.applicantCount > 200) {
      behavioralRisk = 0.3;
    }
  }

  // Check for Easy Apply
  if (jobData.isEasyApply === false) {
    behavioralRisk += 0.15;
  }

  behavioralRisk = Math.min(1, behavioralRisk);
  signals.push({ category: 'behavioral', value: behavioralRisk, confidence: behavioralConfidence });
  breakdown.behavioral = behavioralRisk * 100;

  // ===== CALCULATE OVERALL CONFIDENCE =====
  // Weighted average of signal confidences
  const totalConfidence = signals.reduce((sum, s) => sum + s.confidence, 0);
  const avgConfidence = signals.length > 0 ? totalConfidence / signals.length : 0.5;

  // Adjust confidence based on how much data we have
  const dataCompleteness = [
    jobData.description ? 0.3 : 0,
    jobData.company ? 0.2 : 0,
    jobData.postedDate ? 0.2 : 0,
    jobData.title ? 0.15 : 0,
    jobData.location ? 0.15 : 0
  ].reduce((a, b) => a + b, 0);

  // Final confidence as percentage (0-100)
  const finalConfidence = Math.round((avgConfidence * 0.7 + dataCompleteness * 0.3) * 100);

  // ===== APPLY CEILING SCORES =====
  // For obvious ghost indicators, cap the legitimacy score
  if (daysPosted !== null) {
    if (daysPosted >= 90) {
      score = Math.min(score, 35);
      if (!redFlags.some(f => f.includes('posted'))) {
        redFlags.push(`Job posted ${daysPosted} days ago - very stale posting`);
      }
    } else if (daysPosted >= 60) {
      score = Math.min(score, 50);
    } else if (daysPosted >= 45) {
      score = Math.min(score, 65);
    }
  }

  // High applicant count with old posting
  if (jobData.applicantCount && jobData.applicantCount >= 500) {
    score = Math.min(score, 55);
    if (daysPosted && daysPosted >= 30) {
      score = Math.min(score, 45);
    }
  }

  // Reposted indicator
  const isReposted = /reposted/i.test(descText) || /reposted/i.test(jobData.title || '');
  if (isReposted) {
    score = Math.min(score, 50);
    if (!redFlags.some(f => f.includes('reposted'))) {
      redFlags.push('Job has been reposted (possibly unfilled for long time)');
    }
  }

  // Clamp score
  score = Math.max(0, Math.min(100, score));

  return {
    legitimacyScore: score,
    redFlags: redFlags.length > 0 ? redFlags : ['No significant red flags detected'],
    confidence: finalConfidence, // Now returns percentage (0-100) instead of decimal
    breakdown: breakdown, // Now includes breakdown object with percentage values
    analyzedAt: Date.now()
  };
}

// Helper function to parse posting age from various date string formats
function parsePostingAgeForAnalysis(dateString) {
  if (!dateString) return null;
  const normalized = dateString.toLowerCase().trim();

  if (/just now|moments? ago/i.test(normalized)) return 0;

  let match;
  if ((match = normalized.match(/(\d+)\s*minutes?\s*ago/i))) return 0;
  if ((match = normalized.match(/(\d+)\s*hours?\s*ago/i))) return 0;
  if ((match = normalized.match(/(\d+)\s*days?\s*ago/i))) return parseInt(match[1]);
  if ((match = normalized.match(/(\d+)\s*weeks?\s*ago/i))) return parseInt(match[1]) * 7;
  if ((match = normalized.match(/(\d+)\s*months?\s*ago/i))) return parseInt(match[1]) * 30;
  if ((match = normalized.match(/30\+\s*days?/i))) return 31;
  if ((match = normalized.match(/active\s*(\d+)\s*days?\s*ago/i))) return parseInt(match[1]);

  return null;
}

// ===== MUTATION OBSERVER FOR DYNAMIC CONTENT =====
// ULTRATHINK: Increased debounce from 500ms to 1000ms to better coordinate with
// the 2-second periodic scan and reduce rapid consecutive filter applications
let observerTimeout;
const observer = new MutationObserver((mutations) => {
  if (Object.keys(filterSettings).length > 0) {
    clearTimeout(observerTimeout);
    observerTimeout = setTimeout(() => {
      log('Re-applying filters due to DOM changes');
      applyFilters(filterSettings);
    }, 1000);
  }
});

const possibleContainers = [
  '.jobsearch-ResultsList',
  '#mosaic-provider-jobcards',
  'ul[class*="jobsearch-ResultsList"]'
];

let observerStarted = false;
for (const selector of possibleContainers) {
  const container = document.querySelector(selector);
  if (container && !observerStarted) {
    log(`Starting mutation observer on: ${selector}`);
    observer.observe(container, { childList: true, subtree: true });
    observerStarted = true;
    break;
  }
}

if (!observerStarted) {
  window.addEventListener('load', () => {
    for (const selector of possibleContainers) {
      const container = document.querySelector(selector);
      if (container && !observerStarted) {
        log(`Starting mutation observer on (after load): ${selector}`);
        observer.observe(container, { childList: true, subtree: true });
        observerStarted = true;
        break;
      }
    }
  });
}

// ===== PERIODIC FULL SCAN (Every 2 seconds) =====
// Ensures filters are always applied to all visible jobs, including dynamically loaded content
let periodicScanInterval = null;

function performFullScan() {
  if (Object.keys(filterSettings).length === 0) return;

  // ULTRATHINK: Prevent concurrent filter runs to avoid flashing
  if (isFilteringInProgress) {
    return; // Skip silently, another filter is running
  }
  isFilteringInProgress = true;

  // Update job age badge in detail panel for selected job
  if (filterSettings.showJobAge) {
    addJobAgeToDetailPanel();
  } else {
    const detailAgeBadge = document.querySelector('.jobfiltr-detail-age-badge');
    if (detailAgeBadge) detailAgeBadge.remove();
  }

  // Update early applicant badge in detail panel for selected job (flag mode)
  if (filterSettings.filterEarlyApplicant && filterSettings.earlyApplicantDisplayMode === 'flag') {
    addEarlyApplicantBadgeToDetailPanel();
  } else {
    const detailEarlyBadge = document.querySelector('.jobfiltr-detail-early-applicant-badge');
    if (detailEarlyBadge) detailEarlyBadge.remove();
  }

  const jobCardSelectors = [
    '.jobsearch-ResultsList > li',
    '.job_seen_beacon',
    '[data-testid="job-result"]',
    'li[data-jk]',
    'div.job_seen_beacon',
    'ul.jobsearch-ResultsList li'
  ];

  let jobCards = [];
  for (const selector of jobCardSelectors) {
    jobCards = document.querySelectorAll(selector);
    if (jobCards.length > 0) break;
  }

  if (jobCards.length === 0) return;

  let hiddenCount = 0;

  jobCards.forEach((jobCard) => {
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

    // Filter 2: Hide Sponsored
    if (filterSettings.hideSponsored && isSponsored(jobCard)) {
      shouldHide = true;
      reasons.push('Sponsored');
    }

    // Filter 2.5: Auto-Hide Applied Jobs
    // Hides jobs that the user has already applied to based on text patterns
    if (filterSettings.hideApplied && hasAppliedText(jobCard)) {
      shouldHide = true;
      reasons.push('Already applied');
    }

    // Filter 2.6: Urgently Hiring Only (Indeed-specific)
    // Shows only jobs with the "Urgently Hiring" badge when enabled
    if (filterSettings.filterUrgentlyHiring && !isUrgentlyHiring(jobCard)) {
      shouldHide = true;
      reasons.push('Not urgently hiring');
    }

    // Filter 3: Early Applicant Filter (with display mode support)
    // Shows only jobs where you can be among the first to apply OR flags them with badge
    if (filterSettings.filterEarlyApplicant) {
      const displayMode = filterSettings.earlyApplicantDisplayMode || 'hide';
      const isEarly = isEarlyApplicant(jobCard);

      if (displayMode === 'hide') {
        // Hide mode: hide non-early applicant jobs
        if (!isEarly) {
          shouldHide = true;
          reasons.push('Not an early applicant opportunity');
        }
      } else if (displayMode === 'flag') {
        // Flag mode: add badge to early applicant jobs
        if (isEarly) {
          addEarlyApplicantBadgeToCard(jobCard);
        } else {
          removeEarlyApplicantBadgeFromCard(jobCard);
        }
      }
    } else {
      // Remove badge if filter is disabled
      removeEarlyApplicantBadgeFromCard(jobCard);
    }

    // Filter 3.5: Job Posting Age (CRITICAL FIX: Was missing from performFullScan!)
    // Uses precise pubDate timestamps from Indeed's JSON data for accuracy
    if (filterSettings.filterPostingAge) {
      const jobAge = getJobAge(jobCard);
      if (jobAge !== null) {
        const range = filterSettings.postingAgeRange;
        let maxDays = 7; // default 1 week

        // Map posting age range to max days
        // For sub-day options (12h, 24h), we use fractional days for precision
        if (range === '12h') maxDays = 0.5;      // 12 hours = 0.5 days
        else if (range === '24h') maxDays = 1;   // 24 hours = 1 day
        else if (range === '3d') maxDays = 3;
        else if (range === '1w') maxDays = 7;
        else if (range === '2w') maxDays = 14;
        else if (range === '1m') maxDays = 30;

        // With precise fractional days from pubDate timestamps,
        // we can accurately filter 12h and 24h options
        if (jobAge > maxDays) {
          shouldHide = true;
          // Format reason message appropriately
          let ageDisplay;
          if (jobAge < 1) {
            const hours = Math.round(jobAge * 24);
            ageDisplay = `${hours}h ago`;
          } else if (jobAge < 2) {
            const hours = Math.round(jobAge * 24);
            ageDisplay = `${hours}h ago`;
          } else {
            ageDisplay = `${Math.round(jobAge)}d ago`;
          }
          reasons.push(`Posted ${ageDisplay}`);
        }
      }
    }

    // Filter 4: True Remote Accuracy
    if (filterSettings.trueRemoteAccuracy) {
      if (detectNonRemoteIndicators(jobCard, filterSettings)) {
        shouldHide = true;
        reasons.push('Non-remote');
      }
    }

    // Job Age Display (display only, on visible jobs)
    // ULTRATHINK: Moved before Work Type Unclear Badge so Job Age appears on TOP in vertical stack
    if (filterSettings.showJobAge && !shouldHide) {
      if (!jobCard.querySelector('.jobfiltr-age-badge')) {
        let jobAge = getJobAge(jobCard);
        // Use cached age if getJobAge returns null but we have a cached value
        if (jobAge === null && jobCard.dataset.jobfiltrAge) {
          jobAge = parseInt(jobCard.dataset.jobfiltrAge, 10);
        }
        if (jobAge !== null) {
          // Cache the job age for future reference
          jobCard.dataset.jobfiltrAge = jobAge.toString();
          addJobAgeBadge(jobCard, jobAge);
        } else {
          // Show "No Date" badge when age data is unavailable (sponsored/ad jobs)
          addUnknownAgeBadge(jobCard);
        }
      }
    } else {
      // Remove job age badge when filter is disabled
      const ageBadge = jobCard.querySelector('.jobfiltr-age-badge');
      if (ageBadge) ageBadge.remove();
    }

    // Filter 4.5: Work Type Unclear Badge (ULTRATHINK)
    // Appears BELOW Job Age badge in the vertical stack
    removeWorkTypeBadge(jobCard);
    if (filterSettings.trueRemoteAccuracy && filterSettings.showWorkTypeUnclear !== false && !shouldHide) {
      const workType = detectWorkLocationType(jobCard);
      if (workType.type === 'unclear') {
        addWorkTypeUnclearBadge(jobCard);
      }
    }

    // Filter 5: Include Keywords
    if (filterSettings.filterIncludeKeywords && filterSettings.includeKeywords?.length > 0) {
      if (!matchesIncludeKeywords(jobCard, filterSettings.includeKeywords)) {
        shouldHide = true;
        reasons.push('Missing keywords');
      }
    }

    // Filter 6: Exclude Keywords
    if (filterSettings.filterExcludeKeywords && filterSettings.excludeKeywords?.length > 0) {
      if (matchesExcludeKeywords(jobCard, filterSettings.excludeKeywords)) {
        shouldHide = true;
        reasons.push('Excluded keywords');
      }
    }

    // Filter 6b: Exclude Companies
    if (filterSettings.filterExcludeCompanies && filterSettings.excludeCompanies?.length > 0) {
      if (matchesExcludeCompanies(jobCard, filterSettings.excludeCompanies)) {
        shouldHide = true;
        reasons.push('Excluded company');
      }
    }

    // Filter 7: Salary Range Filter
    if (filterSettings.filterSalary) {
      // 7a: Hide jobs without salary info
      if (filterSettings.hideNoSalary) {
        if (!hasSalaryInfo(jobCard)) {
          shouldHide = true;
          reasons.push('No salary info');
        }
      }

      // 7b: Filter by salary range (if min or max is set)
      if (!shouldHide && (filterSettings.minSalary || filterSettings.maxSalary)) {
        const salaryData = getJobSalaryData(jobCard);
        if (salaryData) {
          const salaryMatch = checkSalaryMatch(salaryData, filterSettings);
          if (!salaryMatch.matches) {
            shouldHide = true;
            reasons.push(salaryMatch.reason || 'Salary out of range');
          }
        }
      }
    }

    // Filter 7c: No Salary Info Badge (display notification for visible cards without salary)
    // Shows badge when salary filter is enabled and job has no salary info but is not hidden
    removeNoSalaryBadge(jobCard);
    if (filterSettings.filterSalary && !shouldHide && !hasSalaryInfo(jobCard)) {
      addNoSalaryBadge(jobCard);
    }

    // Filter 8: Active Recruiting Badge
    // Shows green badge for actively recruiting, warns for stale postings
    if (filterSettings.showActiveRecruiting) {
      const recruitingInfo = isActivelyRecruiting(jobCard);
      if (recruitingInfo) {
        // Option to hide stale postings
        if (filterSettings.hideStalePostings && recruitingInfo.active === false && recruitingInfo.days >= 30) {
          shouldHide = true;
          reasons.push(`Stale posting: ${recruitingInfo.days} days old`);
        }
        // Add badge for active or stale status
        if (!shouldHide && !jobCard.querySelector('.jobfiltr-recruiting-badge')) {
          addActiveRecruitingBadge(jobCard, recruitingInfo);
        }
      } else if (!shouldHide && !jobCard.querySelector('.jobfiltr-recruiting-badge')) {
        // Show "No Data" badge when recruiting status can't be determined
        addUnknownRecruitingBadge(jobCard);
      }
    } else {
      // Remove recruiting badge when filter is disabled
      const recruitBadge = jobCard.querySelector('.jobfiltr-recruiting-badge');
      if (recruitBadge) recruitBadge.remove();
    }

    // Apply hiding
    if (shouldHide) {
      if (jobCard.style.display !== 'none') {
        jobCard.style.display = 'none';
        jobCard.dataset.jobfiltrHidden = 'true';
        jobCard.dataset.jobfiltrReasons = reasons.join(', ');
      }
      hiddenCount++;
    } else {
      if (jobCard.style.display === 'none' && jobCard.dataset.jobfiltrHidden) {
        jobCard.style.display = '';
        delete jobCard.dataset.jobfiltrHidden;
        delete jobCard.dataset.jobfiltrReasons;
      }
      // NOTE: Job Age Display has been moved earlier (before Work Type Unclear Badge)
      // to ensure proper vertical stacking order in the badges container
    }
  });

  // ULTRATHINK: Only update global count and send message if count actually changed
  // Use lastSentHiddenCount to prevent duplicate messages across applyFilters and performFullScan
  if (hiddenCount !== lastSentHiddenCount) {
    hiddenJobsCount = hiddenCount;
    lastSentHiddenCount = hiddenCount;
    try {
      chrome.runtime.sendMessage({
        type: 'FILTER_STATS_UPDATE',
        hiddenCount: hiddenJobsCount,
        site: 'indeed'
      });
    } catch (error) {}
  }

  // Release the filter lock
  isFilteringInProgress = false;
}

function startPeriodicScan() {
  if (periodicScanInterval) return; // Already running

  log('Starting periodic filter scan (every 2s)');
  periodicScanInterval = setInterval(() => {
    performFullScan();
  }, 2000);

  // Also run immediately
  performFullScan();
}

function stopPeriodicScan() {
  if (periodicScanInterval) {
    clearInterval(periodicScanInterval);
    periodicScanInterval = null;
    log('Stopped periodic filter scan');
  }
}

// ===== AUTO-LOAD SAVED FILTERS ON PAGE LOAD =====
async function loadAndApplyFilters() {
  // Check if extension context is still valid
  if (!isExtensionContextValid()) {
    return;
  }

  try {
    // Check if user is authenticated before auto-applying filters
    const authResult = await chrome.storage.local.get(['authToken', 'authExpiry']);
    if (!authResult.authToken || !authResult.authExpiry || Date.now() >= authResult.authExpiry) {
      log('User not authenticated, skipping auto-apply filters');
      return;
    }

    const result = await chrome.storage.local.get('filterSettings');
    if (result.filterSettings && Object.keys(result.filterSettings).length > 0) {
      filterSettings = result.filterSettings;
      log('Auto-loaded saved filter settings');
      // Give page time to render initial jobs
      setTimeout(() => {
        applyFilters(filterSettings);
      }, 1000);
    }
  } catch (error) {
    // Silently handle extension context invalidated errors
    if (!error.message?.includes('Extension context invalidated')) {
      log('Error loading saved filters:', error);
    }
  }
}

// Inject mosaic extractor early so job age data is available when filters are applied
injectMosaicDataExtractor();

// Load saved filters when script initializes
loadAndApplyFilters();

// Start periodic scan if we have active filters
if (Object.keys(filterSettings).length > 0) {
  startPeriodicScan();
}

// ===== JOB CARD CLICK LISTENER FOR BENEFITS, JOB AGE, TRUE REMOTE, AND VISA =====
// When a user clicks on a job card, update badges and check filters from the detail panel
document.addEventListener('click', (e) => {
  const jobCard = e.target.closest('.jobsearch-ResultsList li, .job_seen_beacon, [data-testid="job-result"], li[data-jk]');
  if (jobCard) {
    // Wait for the job description panel to load
    setTimeout(() => {
      // Check detail panel for non-remote indicators (True Remote Accuracy)
      // This catches jobs where the full description contains hybrid/onsite terms
      // that weren't visible in the job card snippet
      if (filterSettings.trueRemoteAccuracy) {
        checkDetailPanelForNonRemote(jobCard);
      }

      // Update job age badge in detail panel
      if (filterSettings.showJobAge) {
        addJobAgeToDetailPanel();
      }

      // Update early applicant badge in detail panel (flag mode)
      if (filterSettings.filterEarlyApplicant && filterSettings.earlyApplicantDisplayMode === 'flag') {
        addEarlyApplicantBadgeToDetailPanel();
      }

      // ULTRATHINK: Check detail panel for visa sponsorship
      // When visaOnly filter is active, verify visa status from the full job description
      if (filterSettings.visaOnly) {
        checkDetailPanelForVisaSponsorship(jobCard);
      }
    }, 500);
  }
}, true);

log('Indeed content script ready');

// ===== JOBFILTR ACTIVE NOTIFICATION =====
// Shows a small notification when JobFiltr first activates on Indeed

function showJobFiltrActiveNotification() {
  // Check if extension context is still valid
  if (!isExtensionContextValid()) {
    return;
  }

  // Check if we've already shown the notification this session
  const notificationKey = 'jobfiltr_notification_shown';
  if (sessionStorage.getItem(notificationKey)) {
    return;
  }

  // Check if popup is currently open/pinned by querying the background
  try {
    chrome.runtime.sendMessage({ type: 'CHECK_POPUP_STATE' }, (response) => {
      // Handle potential error from chrome.runtime.lastError
      if (chrome.runtime.lastError) {
        // Extension context invalidated or other error - silently ignore
        return;
      }

      // If popup is open/pinned, don't show notification
      if (response && response.popupOpen) {
        return;
      }

    // Mark as shown for this session
    sessionStorage.setItem(notificationKey, 'true');

    // Create the notification element
    const notification = document.createElement('div');
    notification.id = 'jobfiltr-active-notification';
    notification.innerHTML = `
      <div class="jobfiltr-notif-content">
        <div class="jobfiltr-notif-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M9 12l2 2 4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
          </svg>
        </div>
        <div class="jobfiltr-notif-text">
          <span class="jobfiltr-notif-title">JobFiltr Is Active</span>
          <span class="jobfiltr-notif-subtitle">Filtering jobs on this page</span>
        </div>
        <button class="jobfiltr-notif-close" aria-label="Close notification">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </button>
      </div>
    `;

    // Add styles
    const style = document.createElement('style');
    style.textContent = `
      #jobfiltr-active-notification {
        position: fixed;
        top: 24px;
        right: 24px;
        z-index: 99999;
        animation: jobfiltr-notif-slide-in 0.4s ease-out;
      }

      @keyframes jobfiltr-notif-slide-in {
        from {
          opacity: 0;
          transform: translateX(100px);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }

      @keyframes jobfiltr-notif-slide-out {
        from {
          opacity: 1;
          transform: translateX(0);
        }
        to {
          opacity: 0;
          transform: translateX(100px);
        }
      }

      .jobfiltr-notif-content {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 16px;
        background: linear-gradient(135deg, #1E3A5F 0%, #2A4A73 100%);
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(30, 58, 95, 0.3), 0 2px 8px rgba(0, 0, 0, 0.1);
        color: white;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      }

      .jobfiltr-notif-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 36px;
        height: 36px;
        background: rgba(255, 255, 255, 0.15);
        border-radius: 10px;
        flex-shrink: 0;
      }

      .jobfiltr-notif-icon svg {
        color: #34D399;
      }

      .jobfiltr-notif-text {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }

      .jobfiltr-notif-title {
        font-size: 14px;
        font-weight: 600;
        letter-spacing: -0.01em;
      }

      .jobfiltr-notif-subtitle {
        font-size: 12px;
        opacity: 0.8;
      }

      .jobfiltr-notif-close {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 24px;
        height: 24px;
        background: transparent;
        border: none;
        border-radius: 6px;
        color: rgba(255, 255, 255, 0.6);
        cursor: pointer;
        transition: all 0.2s;
        flex-shrink: 0;
      }

      .jobfiltr-notif-close:hover {
        background: rgba(255, 255, 255, 0.1);
        color: #ffffff;
      }

      #jobfiltr-active-notification.hiding {
        animation: jobfiltr-notif-slide-out 0.3s ease-in forwards;
      }
    `;

    document.head.appendChild(style);
    document.body.appendChild(notification);

    // Close button handler
    const closeBtn = notification.querySelector('.jobfiltr-notif-close');
    closeBtn.addEventListener('click', () => {
      dismissNotification(notification);
    });

    // Auto-dismiss after 4 seconds
    setTimeout(() => {
      if (document.body.contains(notification)) {
        dismissNotification(notification);
      }
    }, 4000);
    });
  } catch (e) {
    // Extension context invalidated or other error - silently ignore
    return;
  }
}

function dismissNotification(notification) {
  notification.classList.add('hiding');
  setTimeout(() => {
    notification.remove();
  }, 300);
}

// ===== FIRST SIGN-IN NOTIFICATION (Bottom-Right) =====
// Shows a special notification at bottom-right when user first signs in
function showFirstSignInNotification() {
  // Remove any existing notifications first
  const existingNotif = document.getElementById('jobfiltr-signin-notification');
  if (existingNotif) existingNotif.remove();

  // Create the notification element
  const notification = document.createElement('div');
  notification.id = 'jobfiltr-signin-notification';
  notification.innerHTML = `
    <div class="jobfiltr-signin-content">
      <div class="jobfiltr-signin-glow"></div>
      <div class="jobfiltr-signin-inner">
        <div class="jobfiltr-signin-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M9 12l2 2 4-4" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
          </svg>
        </div>
        <div class="jobfiltr-signin-text">
          <span class="jobfiltr-signin-title">JobFiltr Is Active</span>
          <span class="jobfiltr-signin-subtitle">Welcome! Your filters are now running</span>
        </div>
        <button class="jobfiltr-signin-close" aria-label="Close notification">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </button>
      </div>
    </div>
  `;

  // Add styles for bottom-right notification
  const styleId = 'jobfiltr-signin-styles';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      #jobfiltr-signin-notification {
        position: fixed;
        bottom: 24px;
        right: 24px;
        z-index: 99999;
        animation: jobfiltr-signin-slide-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
      }

      @keyframes jobfiltr-signin-slide-in {
        from {
          opacity: 0;
          transform: translateY(40px) scale(0.9);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }

      @keyframes jobfiltr-signin-slide-out {
        from {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
        to {
          opacity: 0;
          transform: translateY(20px) scale(0.95);
        }
      }

      @keyframes jobfiltr-glow-pulse {
        0%, 100% {
          opacity: 0.5;
          transform: scale(1);
        }
        50% {
          opacity: 0.8;
          transform: scale(1.05);
        }
      }

      .jobfiltr-signin-content {
        position: relative;
      }

      .jobfiltr-signin-glow {
        position: absolute;
        inset: -4px;
        background: linear-gradient(135deg, #4ade80 0%, #22c55e 50%, #16a34a 100%);
        border-radius: 18px;
        opacity: 0.4;
        filter: blur(12px);
        animation: jobfiltr-glow-pulse 2s ease-in-out infinite;
      }

      .jobfiltr-signin-inner {
        position: relative;
        display: flex;
        align-items: center;
        gap: 14px;
        padding: 16px 20px;
        background: linear-gradient(145deg, #1a1a2e 0%, #16213e 50%, #0f172a 100%);
        border-radius: 14px;
        box-shadow:
          0 10px 40px rgba(0, 0, 0, 0.4),
          0 0 0 1px rgba(74, 222, 128, 0.2),
          inset 0 1px 0 rgba(255, 255, 255, 0.05);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        backdrop-filter: blur(10px);
      }

      .jobfiltr-signin-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 44px;
        height: 44px;
        background: linear-gradient(135deg, rgba(74, 222, 128, 0.25) 0%, rgba(34, 197, 94, 0.15) 100%);
        border-radius: 12px;
        color: #4ade80;
        flex-shrink: 0;
        border: 1px solid rgba(74, 222, 128, 0.3);
      }

      .jobfiltr-signin-text {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .jobfiltr-signin-title {
        font-size: 15px;
        font-weight: 600;
        color: #ffffff;
        letter-spacing: -0.01em;
      }

      .jobfiltr-signin-subtitle {
        font-size: 13px;
        color: #94a3b8;
        letter-spacing: -0.01em;
      }

      .jobfiltr-signin-close {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        color: #64748b;
        cursor: pointer;
        transition: all 0.2s ease;
        margin-left: 8px;
        flex-shrink: 0;
      }

      .jobfiltr-signin-close:hover {
        background: rgba(255, 255, 255, 0.1);
        color: #ffffff;
        border-color: rgba(255, 255, 255, 0.2);
      }

      #jobfiltr-signin-notification.hiding {
        animation: jobfiltr-signin-slide-out 0.3s ease-in forwards;
      }
    `;
    document.head.appendChild(style);
  }

  document.body.appendChild(notification);

  // Close button handler
  const closeBtn = notification.querySelector('.jobfiltr-signin-close');
  closeBtn.addEventListener('click', () => {
    notification.classList.add('hiding');
    setTimeout(() => notification.remove(), 300);
  });

  // Auto-dismiss after 5 seconds
  setTimeout(() => {
    if (document.body.contains(notification)) {
      notification.classList.add('hiding');
      setTimeout(() => notification.remove(), 300);
    }
  }, 5000);
}

// Check if user is signed in before showing notification
async function isUserSignedIn() {
  // First check if extension context is still valid
  if (!isExtensionContextValid()) {
    // Extension was reloaded - silently return false without logging error
    return false;
  }

  try {
    const result = await chrome.storage.local.get(['authToken', 'authExpiry']);
    if (result.authToken && result.authExpiry && Date.now() < result.authExpiry) {
      return true;
    }
    return false;
  } catch (error) {
    // Only log if it's not an "Extension context invalidated" error
    if (!error.message?.includes('Extension context invalidated')) {
      console.error('JobFiltr: Error checking auth state:', error);
    }
    return false;
  }
}

// Show notification only if user is signed in
async function showNotificationIfSignedIn() {
  const signedIn = await isUserSignedIn();
  if (signedIn) {
    showJobFiltrActiveNotification();
  }
}

// Track if tab was previously hidden (user was on another tab/window)
let wasTabHidden = false;

// Listen for visibility changes to detect when user returns from non-compatible sites
document.addEventListener('visibilitychange', async () => {
  if (document.visibilityState === 'hidden') {
    // Tab is being hidden - user is navigating away
    wasTabHidden = true;
  } else if (document.visibilityState === 'visible' && wasTabHidden) {
    // Tab became visible again after being hidden
    wasTabHidden = false;

    // Clear the session notification flag so it can show again
    sessionStorage.removeItem('jobfiltr_notification_shown');

    // Show notification if user is signed in
    setTimeout(async () => {
      await showNotificationIfSignedIn();
    }, 500);
  }
});

// Clear notification flag if user navigated from a different origin (not just tab switching)
// This ensures notification shows when navigating to Indeed from another site
try {
  const referrer = document.referrer;
  const currentOrigin = window.location.origin;
  // If there's a referrer and it's from a different origin, clear the flag
  if (referrer) {
    const referrerOrigin = new URL(referrer).origin;
    if (referrerOrigin !== currentOrigin) {
      sessionStorage.removeItem('jobfiltr_notification_shown');
      log('Cleared notification flag - navigated from different origin');
    }
  } else {
    // No referrer typically means direct navigation, typed URL, or bookmark
    // Clear the flag to show notification for fresh navigation
    sessionStorage.removeItem('jobfiltr_notification_shown');
    log('Cleared notification flag - direct navigation or no referrer');
  }
} catch (e) {
  // If URL parsing fails, play it safe and clear the flag
  sessionStorage.removeItem('jobfiltr_notification_shown');
}

// Show notification after a short delay to ensure page is loaded (only if signed in)
setTimeout(async () => {
  await showNotificationIfSignedIn();
}, 1500);
