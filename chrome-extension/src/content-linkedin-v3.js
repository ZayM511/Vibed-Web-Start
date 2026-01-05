// JobFiltr - LinkedIn Content Script V3
// Updated with 2025 DOM selectors and improved detection

console.log('JobFiltr V3: LinkedIn content script loaded');

let filterSettings = {};
let hiddenJobsCount = 0;
let currentPage = 1;
let lastPageUrl = '';

// ===== EXTENSION CONTEXT VALIDATION =====
function isExtensionContextValid() {
  try {
    return chrome && chrome.runtime && chrome.runtime.id;
  } catch (e) {
    return false;
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

// ===== PAGE DETECTION =====
function detectCurrentPage() {
  // Try to get page from URL parameter (start=25 means page 2, etc.)
  const url = new URL(window.location.href);
  const start = url.searchParams.get('start');

  if (start) {
    const startNum = parseInt(start, 10);
    if (!isNaN(startNum)) {
      return Math.floor(startNum / 25) + 1;
    }
  }

  // Try to get from pagination element
  const paginationSelectors = [
    '.artdeco-pagination__indicator--number.active',
    '.jobs-search-pagination__indicator--active',
    'li.artdeco-pagination__indicator--number.selected button',
    '.artdeco-pagination__indicator--number.selected'
  ];

  for (const selector of paginationSelectors) {
    const elem = document.querySelector(selector);
    if (elem) {
      const pageNum = parseInt(elem.textContent.trim(), 10);
      if (!isNaN(pageNum)) {
        return pageNum;
      }
    }
  }

  return 1;
}

function checkForPageChange() {
  const currentUrl = window.location.href;
  const newPage = detectCurrentPage();

  if (currentUrl !== lastPageUrl || newPage !== currentPage) {
    const wasPageChange = currentUrl !== lastPageUrl;
    lastPageUrl = currentUrl;
    currentPage = newPage;

    if (wasPageChange) {
      log(`Page changed to page ${currentPage}`);
      // Reset hidden count for new page
      hiddenJobsCount = 0;

      // Send page change notification
      sendPageUpdate();

      return true;
    }
  }
  return false;
}

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
    if (!error.message?.includes('Extension context invalidated')) {
      log('Failed to send page update:', error);
    }
  }
}

// ===== JOB INFORMATION EXTRACTION =====
function extractJobInfo() {
  try {
    const url = window.location.href;
    log('Extracting job info from URL:', url);

    if (!url.includes('/jobs/')) {
      log('Not on a job posting page');
      return null;
    }

    const titleSelectors = [
      '.jobs-unified-top-card__job-title',
      '.job-details-jobs-unified-top-card__job-title',
      'h1.job-title',
      '.jobs-details-top-card__job-title',
      'h1[class*="job-title"]',
      '.topcard__title'
    ];

    let title = null;
    for (const selector of titleSelectors) {
      const elem = document.querySelector(selector);
      if (elem) {
        title = elem.textContent.trim().replace(/\s+/g, ' ').trim();
        log(`Found title using selector: ${selector}`, title);
        break;
      }
    }

    const companySelectors = [
      '.jobs-unified-top-card__company-name',
      '.job-details-jobs-unified-top-card__company-name',
      '.jobs-details-top-card__company-info a',
      'a[href*="/company/"]',
      '.topcard__org-name-link'
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

    // Location selectors
    const locationSelectors = [
      '.jobs-unified-top-card__bullet',
      '.job-details-jobs-unified-top-card__bullet',
      '.jobs-details-top-card__bullet',
      '.topcard__flavor--bullet',
      '.job-details-jobs-unified-top-card__primary-description-container .t-black--light',
      '[class*="job-details"] [class*="location"]'
    ];

    let location = null;
    for (const selector of locationSelectors) {
      const elem = document.querySelector(selector);
      if (elem) {
        location = elem.textContent.trim();
        log(`Found location using selector: ${selector}`, location);
        break;
      }
    }

    const descriptionSelectors = [
      '.jobs-description__content',
      '.jobs-box__html-content',
      '.jobs-description-content__text',
      '#job-details',
      '.job-view-layout .description__text'
    ];

    let description = '';
    for (const selector of descriptionSelectors) {
      const elem = document.querySelector(selector);
      if (elem) {
        description = elem.textContent.trim();
        log(`Found description, length: ${description.length}`);
        break;
      }
    }

    const jobInfo = { url, title, company, location, description, platform: 'linkedin' };
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
      '.job-card-container__company-name',
      '.artdeco-entity-lockup__subtitle',
      '.job-card-list__company-name',
      'a[data-tracking-control-name="public_jobs_topcard-org-name"]'
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

// ===== SPONSORED/PROMOTED POST DETECTION =====
function isSponsored(jobCard) {
  try {
    const sponsoredIndicators = [
      jobCard.hasAttribute('data-is-promoted'),
      jobCard.querySelector('[data-promoted-badge]'),
      jobCard.querySelector('.job-card-container__footer-job-state'),
      jobCard.classList.contains('promoted')
    ];

    // Check text content for "Promoted" label
    const footerText = jobCard.querySelector('.job-card-list__footer-wrapper');
    if (footerText && footerText.textContent.toLowerCase().includes('promoted')) {
      return true;
    }

    return sponsoredIndicators.some(indicator => indicator);
  } catch (error) {
    return false;
  }
}

// ===== APPLICANT COUNT EXTRACTION =====
function getApplicantCount(jobCard) {
  try {
    // First, try to find applicant count within the job card itself
    const cardApplicantSelectors = [
      '.jobs-unified-top-card__applicant-count',
      '.job-card-container__applicant-count',
      '.jobs-details-top-card__bullet',
      '.job-card-container__footer-item',
      '.job-card-container__metadata-item',
      '.job-card-list__insight',
      '.artdeco-entity-lockup__caption'
    ];

    // FIRST PASS: Look for actual numeric applicant counts
    for (const selector of cardApplicantSelectors) {
      const elems = jobCard.querySelectorAll(selector);
      for (const elem of elems) {
        const text = elem.textContent.trim().toLowerCase();

        // Match "X people clicked apply" pattern FIRST (most common on LinkedIn now)
        const clickedMatch = text.match(/(?:over\s+)?(\d+)\+?\s*people\s+(?:clicked\s+)?appl/i);
        if (clickedMatch) {
          return parseInt(clickedMatch[1]);
        }

        // Match patterns like "25 applicants", "100+ applicants", "Over 200 applicants"
        const applicantMatch = text.match(/(?:over\s+)?(\d+)\+?\s*applicants?/i);
        if (applicantMatch) {
          return parseInt(applicantMatch[1]);
        }
      }
    }

    // Also check the full text content of the job card for numeric counts
    const cardText = jobCard.textContent.toLowerCase();

    // Match "X people clicked apply" pattern first
    const clickedTextMatch = cardText.match(/(?:over\s+)?(\d+)\+?\s*people\s+(?:clicked\s+)?appl/i);
    if (clickedTextMatch) {
      return parseInt(clickedTextMatch[1]);
    }

    // Match "X applicants" pattern
    const textMatch = cardText.match(/(?:over\s+)?(\d+)\+?\s*applicants?/i);
    if (textMatch) {
      return parseInt(textMatch[1]);
    }

    // SECOND PASS: Only check for early applicant if no numeric count found
    for (const selector of cardApplicantSelectors) {
      const elems = jobCard.querySelectorAll(selector);
      for (const elem of elems) {
        const text = elem.textContent.trim().toLowerCase();
        if (text.includes('be among the first') || text.includes('be an early applicant') ||
            text.includes('be one of the first')) {
          return 0; // Return 0 for early applicant (essentially no applicants yet)
        }
      }
    }

    // Check full card text for early applicant indicators last
    if (cardText.includes('be among the first') || cardText.includes('be an early applicant')) {
      return 0; // Return 0 for early applicant
    }

    // Check if this job is currently selected and look at the detail panel
    const isSelected = jobCard.classList.contains('jobs-search-results-list__list-item--active') ||
                       jobCard.querySelector('.job-card-container--active') ||
                       jobCard.getAttribute('data-occludable-job-id');

    if (isSelected) {
      // Try to get applicant count from the job detail panel using enhanced function
      const detailCount = getDetailPanelApplicantCount();
      if (detailCount) {
        // Return just the count for filtering purposes
        return typeof detailCount === 'object' ? detailCount.count : detailCount;
      }
    }

    return null;
  } catch (error) {
    log('Error getting applicant count:', error);
    return null;
  }
}

// Round to nearest multiple of 5 for fallback display
function roundToNearestFive(num) {
  return Math.round(num / 5) * 5;
}

// Estimate applicant count based on job age if exact count not available
function estimateApplicantCount() {
  try {
    // Look for job posting age indicators
    const ageSelectors = [
      '.jobs-unified-top-card__posted-date',
      '.job-details-jobs-unified-top-card__job-insight span',
      '.jobs-unified-top-card__subtitle-secondary-grouping span',
      '.tvm__text'
    ];

    for (const selector of ageSelectors) {
      const elems = document.querySelectorAll(selector);
      for (const elem of elems) {
        const text = elem.textContent.trim().toLowerCase();

        // Check for time-based indicators
        if (text.includes('just now') || text.includes('moment')) {
          return { count: 5, isEstimate: true };
        }
        if (text.includes('hour') || text.includes('minute')) {
          const hourMatch = text.match(/(\d+)\s*hour/);
          if (hourMatch) {
            const hours = parseInt(hourMatch[1]);
            // Estimate ~2-3 applicants per hour for competitive jobs
            return { count: roundToNearestFive(Math.max(5, hours * 2)), isEstimate: true };
          }
          return { count: 5, isEstimate: true };
        }
        if (text.includes('day')) {
          const dayMatch = text.match(/(\d+)\s*day/);
          if (dayMatch) {
            const days = parseInt(dayMatch[1]);
            // Estimate ~20-30 applicants per day average
            return { count: roundToNearestFive(Math.max(10, days * 25)), isEstimate: true };
          }
          return { count: 25, isEstimate: true };
        }
        if (text.includes('week')) {
          const weekMatch = text.match(/(\d+)\s*week/);
          if (weekMatch) {
            const weeks = parseInt(weekMatch[1]);
            return { count: roundToNearestFive(Math.max(50, weeks * 100)), isEstimate: true };
          }
          return { count: 100, isEstimate: true };
        }
        if (text.includes('month')) {
          return { count: 200, isEstimate: true };
        }
      }
    }

    return null;
  } catch (error) {
    return null;
  }
}

// Get applicant count from the job detail panel (for currently viewed job)
function getDetailPanelApplicantCount() {
  try {
    const detailSelectors = [
      '.jobs-unified-top-card__applicant-count',
      '.job-details-jobs-unified-top-card__job-insight',
      '.jobs-details-top-card__bullet',
      '.tvm__text--positive',
      '.jobs-unified-top-card__subtitle-secondary-grouping span',
      '.job-details-jobs-unified-top-card__primary-description span',
      '.jobs-unified-top-card__job-insight span',
      // Additional selectors for better coverage
      '.job-details-jobs-unified-top-card__container span',
      '.jobs-box__html-content span',
      '.jobs-unified-top-card__content span',
      '[data-test-job-insight]',
      '.job-details-how-you-match__skills-item'
    ];

    // FIRST PASS: Look for actual applicant counts (numbers) across ALL elements
    // This ensures we don't incorrectly return "early applicant" when a count exists elsewhere
    for (const selector of detailSelectors) {
      const elems = document.querySelectorAll(selector);
      for (const elem of elems) {
        const text = elem.textContent.trim().toLowerCase();

        // Match "X people clicked apply" pattern FIRST (most common on LinkedIn now)
        const clickedMatch = text.match(/(?:over\s+)?(\d+)\+?\s*people\s+(?:clicked\s+)?appl/i);
        if (clickedMatch) {
          return { count: parseInt(clickedMatch[1]), isEstimate: false, metricType: 'clicked' };
        }

        // Match patterns like "25 applicants", "100+ applicants", "Over 200 applicants"
        const applicantMatch = text.match(/(?:over\s+)?(\d+)\+?\s*applicants?/i);
        if (applicantMatch) {
          return { count: parseInt(applicantMatch[1]), isEstimate: false, metricType: 'applied' };
        }

        // "Fewer than 25 applicants"
        const fewerMatch = text.match(/fewer\s+than\s+(\d+)\s*applicants?/i);
        if (fewerMatch) {
          const maxCount = parseInt(fewerMatch[1]);
          return { count: roundToNearestFive(Math.max(5, maxCount - 10)), isEstimate: true, metricType: 'applied' };
        }
      }
    }

    // Also scan the whole detail panel text for counts BEFORE checking early applicant
    const detailPanel = document.querySelector('.jobs-details, .job-view-layout, .scaffold-layout__detail');
    if (detailPanel) {
      const panelText = detailPanel.textContent.toLowerCase();

      // Match "X people clicked apply" pattern first
      const clickedMatch = panelText.match(/(?:over\s+)?(\d+)\+?\s*people\s+(?:clicked\s+)?appl/i);
      if (clickedMatch) {
        return { count: parseInt(clickedMatch[1]), isEstimate: false, metricType: 'clicked' };
      }

      // Match "X applicants" pattern
      const applicantMatch = panelText.match(/(?:over\s+)?(\d+)\+?\s*applicants?/i);
      if (applicantMatch) {
        return { count: parseInt(applicantMatch[1]), isEstimate: false, metricType: 'applied' };
      }

      // "Fewer than X applicants"
      const fewerMatch = panelText.match(/fewer\s+than\s+(\d+)\s*applicants?/i);
      if (fewerMatch) {
        const maxCount = parseInt(fewerMatch[1]);
        return { count: roundToNearestFive(Math.max(5, maxCount - 10)), isEstimate: true, metricType: 'applied' };
      }
    }

    // SECOND PASS: Only check for early applicant if NO numeric count was found
    // This prevents false "early applicant" when the actual count exists in a different element
    for (const selector of detailSelectors) {
      const elems = document.querySelectorAll(selector);
      for (const elem of elems) {
        const text = elem.textContent.trim().toLowerCase();
        if (text.includes('be among the first') || text.includes('be an early applicant') ||
            text.includes('be one of the first') || text.includes('early applicant')) {
          return { count: 0, isEstimate: false, metricType: 'early' };
        }
      }
    }

    // Check detail panel text for early applicant last
    if (detailPanel) {
      const panelText = detailPanel.textContent.toLowerCase();
      if (panelText.includes('be among the first') || panelText.includes('be an early applicant') ||
          panelText.includes('early applicant')) {
        return { count: 0, isEstimate: false, metricType: 'early' };
      }
    }

    // Fallback: estimate based on job age
    const estimate = estimateApplicantCount();
    if (estimate) {
      return { ...estimate, metricType: 'estimate' };
    }

    return null;
  } catch (error) {
    return null;
  }
}

// Add applicant count badge to the job detail panel (not job cards)
function addApplicantCountBadgeToDetailPanel(countData) {
  // Remove any existing badge in the detail panel
  const existingBadge = document.querySelector('.jobfiltr-detail-applicant-badge');
  if (existingBadge) existingBadge.remove();

  if (countData === null) return;

  // Handle both old format (number) and new format (object)
  let count, isEstimate, metricType;
  if (typeof countData === 'object') {
    count = countData.count;
    isEstimate = countData.isEstimate;
    metricType = countData.metricType || 'applied';
  } else {
    count = countData;
    isEstimate = false;
    metricType = 'applied';
  }

  if (count === null || count === undefined) return;

  // Determine color based on count (and metric type for early applicant)
  let bgColor, textColor, icon, oddsText;

  // Special handling for early applicant
  if (metricType === 'early') {
    bgColor = 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)';
    textColor = '#166534';
    icon = '🌟';
    oddsText = 'Be an early applicant!';
  } else if (count <= 10) {
    bgColor = 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)';
    textColor = '#166534';
    icon = '🟢';
    oddsText = 'Excellent odds';
  } else if (count <= 50) {
    bgColor = 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)';
    textColor = '#1e40af';
    icon = '🔵';
    oddsText = 'Good odds';
  } else if (count <= 200) {
    bgColor = 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)';
    textColor = '#92400e';
    icon = '🟡';
    oddsText = 'Moderate competition';
  } else if (count <= 500) {
    bgColor = 'linear-gradient(135deg, #fed7aa 0%, #fdba74 100%)';
    textColor = '#9a3412';
    icon = '🟠';
    oddsText = 'High competition';
  } else {
    bgColor = 'linear-gradient(135deg, #fecaca 0%, #fca5a5 100%)';
    textColor = '#991b1b';
    icon = '🔴';
    oddsText = 'Very competitive';
  }

  // Format the count display based on metric type
  let countDisplay, metricLabel;

  if (metricType === 'early') {
    countDisplay = 'Early';
    metricLabel = 'applicant';
  } else if (metricType === 'clicked') {
    // For "clicked apply" metric
    if (isEstimate) {
      const nextMultiple = Math.ceil(count / 5) * 5 + 5;
      countDisplay = `~${nextMultiple}`;
      oddsText += ' (est.)';
    } else {
      countDisplay = `${count}${count >= 100 ? '+' : ''}`;
    }
    metricLabel = 'clicked apply';
  } else if (metricType === 'estimate') {
    // For estimates based on job age
    const nextMultiple = Math.ceil(count / 5) * 5 + 5;
    countDisplay = `~${nextMultiple}`;
    metricLabel = 'applicants';
    oddsText += ' (est.)';
  } else {
    // For actual "applicants" metric
    if (isEstimate) {
      const nextMultiple = Math.ceil(count / 5) * 5 + 5;
      countDisplay = `~${nextMultiple}`;
      oddsText += ' (est.)';
    } else {
      countDisplay = `${count}${count >= 100 ? '+' : ''}`;
    }
    metricLabel = 'applicants';
  }

  const badge = document.createElement('div');
  badge.className = 'jobfiltr-detail-applicant-badge';
  badge.innerHTML = `
    <div style="display: flex; align-items: center; gap: 8px;">
      <span style="font-size: 18px;">${icon}</span>
      <div>
        <div style="font-weight: 700; font-size: 14px;">${countDisplay} ${metricLabel}</div>
        <div style="font-size: 11px; opacity: 0.8;">${oddsText}</div>
      </div>
    </div>
  `;
  badge.style.cssText = `
    background: ${bgColor};
    color: ${textColor};
    padding: 12px 16px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 600;
    margin: 12px 0;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    border: 1px solid ${textColor}30;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  `;

  // Find the best place to insert in the detail panel
  const insertTargets = [
    '.job-details-jobs-unified-top-card__primary-description-container',
    '.jobs-unified-top-card__primary-description',
    '.jobs-details-top-card__content-container',
    '.jobs-unified-top-card__content--two-pane',
    '.jobs-details__main-content header',
    '.job-view-layout header'
  ];

  for (const selector of insertTargets) {
    const target = document.querySelector(selector);
    if (target) {
      target.insertAdjacentElement('afterend', badge);
      log('Added applicant count badge to detail panel');
      return;
    }
  }
}

// Update applicant count in detail panel when job is selected
function updateApplicantCountInDetailPanel() {
  if (!filterSettings.showApplicantCount) return;

  const count = getDetailPanelApplicantCount();
  addApplicantCountBadgeToDetailPanel(count);
}

// ===== GET JOB CARD TEXT (INCLUDING LOCATION) =====
function getJobCardText(jobCard) {
  // Get title
  const titleSelectors = [
    '.job-card-list__title',
    '.job-card-container__link',
    '.artdeco-entity-lockup__title',
    'a[data-control-name="job_card_title"]'
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
    '.job-card-container__company-name',
    '.artdeco-entity-lockup__subtitle',
    '.job-card-list__company-name'
  ];

  let company = '';
  for (const selector of companySelectors) {
    const elem = jobCard.querySelector(selector);
    if (elem) {
      company = elem.textContent.trim().toLowerCase();
      break;
    }
  }

  // Get location - CRITICAL for remote detection
  const locationSelectors = [
    '.job-card-container__metadata-item',
    '.artdeco-entity-lockup__caption',
    '.job-card-list__location',
    '.job-card-container__metadata-wrapper'
  ];

  let location = '';
  for (const selector of locationSelectors) {
    const elem = jobCard.querySelector(selector);
    if (elem) {
      location = elem.textContent.trim().toLowerCase();
      break;
    }
  }

  // Get all metadata text from the card
  const metadataWrapper = jobCard.querySelector('.job-card-container__metadata-wrapper');
  const metadata = metadataWrapper ? metadataWrapper.textContent.trim().toLowerCase() : '';

  // Get any insight text
  const insightElem = jobCard.querySelector('.job-card-list__insight');
  const insight = insightElem ? insightElem.textContent.trim().toLowerCase() : '';

  return `${title} ${company} ${location} ${metadata} ${insight}`;
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

// ===== SALARY DETECTION =====
function hasSalaryInfo(jobCard) {
  try {
    // Get all text from the job card
    const cardText = getJobCardText(jobCard);

    // Salary-specific selectors on LinkedIn job cards
    const salarySelectors = [
      '.job-card-container__metadata-item--salary',
      '.job-card-list__salary',
      '.jobs-unified-top-card__job-insight--salary',
      '.job-card-container__footer-item',
      '.compensation__salary',
      '[data-test-id="salary"]'
    ];

    // Check for salary elements
    for (const selector of salarySelectors) {
      const elem = jobCard.querySelector(selector);
      if (elem) {
        const text = elem.textContent.toLowerCase();
        // Check if it contains salary-related content
        if (/\$[\d,]+|\d+k|\bsalary\b|\bpay\b|\bcompensation\b|\/yr|\/hr|per hour|per year|annually/i.test(text)) {
          return true;
        }
      }
    }

    // Check the full card text for salary patterns
    // Matches: $50,000, $100K, $50-60/hr, $80,000-$100,000/yr, etc.
    const salaryPatterns = [
      /\$[\d,]+(?:\s*[-–]\s*\$?[\d,]+)?(?:\s*\/?\s*(?:yr|year|hr|hour|annually|hourly|month|mo))?/i,
      /\$\d+k\s*[-–]?\s*\$?\d*k?/i,
      /(?:salary|pay|compensation)\s*[:.]?\s*\$[\d,]+/i
    ];

    for (const pattern of salaryPatterns) {
      if (pattern.test(cardText)) {
        return true;
      }
    }

    return false;
  } catch (error) {
    log('Error checking salary info:', error);
    return false; // Don't hide if we can't check
  }
}

// ===== ENTRY LEVEL ACCURACY CHECK =====
function checkEntryLevelAccuracy(jobCard) {
  try {
    // Get the job card text and check for "entry level" label
    const cardText = getJobCardText(jobCard).toLowerCase();

    // Check job card for entry level indicators
    const entryLevelSelectors = [
      '.job-card-container__footer-item',
      '.job-card-container__metadata-item',
      '.artdeco-entity-lockup__caption',
      '.job-card-list__insight',
      '.jobs-unified-top-card__job-insight'
    ];

    let isLabeledEntryLevel = cardText.includes('entry level') || cardText.includes('entry-level');

    // Also check specific seniority elements
    for (const selector of entryLevelSelectors) {
      const elem = jobCard.querySelector(selector);
      if (elem && elem.textContent.toLowerCase().includes('entry level')) {
        isLabeledEntryLevel = true;
        break;
      }
    }

    // If not labeled as entry level, skip this check
    if (!isLabeledEntryLevel) {
      return null;
    }

    // Get the full job description from the detail panel if available
    let descriptionText = cardText;
    const descriptionSelectors = [
      '.jobs-description__content',
      '.jobs-description-content__text',
      '.jobs-box__html-content',
      '#job-details',
      '.job-view-layout .description__text'
    ];

    for (const selector of descriptionSelectors) {
      const descEl = document.querySelector(selector);
      if (descEl) {
        descriptionText += ' ' + descEl.textContent.toLowerCase();
        break;
      }
    }

    // Look for experience requirements that contradict "entry level"
    const experiencePatterns = [
      /(\d+)\+?\s*years?\s+(?:of\s+)?experience/gi,
      /minimum\s+(?:of\s+)?(\d+)\s+years?/gi,
      /(\d+)\s+years?\s+(?:minimum|required)/gi,
      /at\s+least\s+(\d+)\s+years?/gi,
      /(\d+)\s*-\s*\d+\s+years?\s+(?:of\s+)?experience/gi,
      /requires?\s+(\d+)\+?\s+years?/gi
    ];

    for (const pattern of experiencePatterns) {
      const matches = [...descriptionText.matchAll(pattern)];
      for (const match of matches) {
        const years = parseInt(match[1]);
        // Entry level should be 0-2 years max; 3+ years is a mismatch
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
    log('Error checking entry level accuracy:', error);
    return null;
  }
}

// Add entry level mismatch warning badge
function addEntryLevelWarningBadge(jobCard, message) {
  const existingBadge = jobCard.querySelector('.jobfiltr-entry-level-badge');
  if (existingBadge) existingBadge.remove();

  const badge = document.createElement('div');
  badge.className = 'jobfiltr-entry-level-badge';
  badge.innerHTML = `⚠️ ${message}`;
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
    max-width: 180px;
    line-height: 1.3;
  `;

  if (window.getComputedStyle(jobCard).position === 'static') {
    jobCard.style.position = 'relative';
  }
  jobCard.appendChild(badge);
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

// ===== BENEFITS DETECTION =====
const benefitsPatterns = {
  health: [
    /\b(health|medical|dental|vision)\s*(insurance|coverage|plan|benefits?)\b/i,
    /\bhealthcare\b/i,
    /\bHSA\b/i,
    /\bFSA\b/i
  ],
  retirement: [
    /\b401\s*\(?\s*k\s*\)?\b/i,
    /\b401k\b/i,
    /\bpension\b/i,
    /\bretirement\s+(plan|benefits?|savings)\b/i,
    /\bcompany\s+match(ing)?\b/i
  ],
  pto: [
    /\bPTO\b/,
    /\bpaid\s+time\s+off\b/i,
    /\bvacation\s+(days?|time|policy)\b/i,
    /\bunlimited\s+(PTO|vacation|time\s+off)\b/i,
    /\bsick\s+(leave|days?|time)\b/i,
    /\bpaid\s+(holidays?|leave)\b/i
  ],
  equity: [
    /\bstock\s+options?\b/i,
    /\bequity\b/i,
    /\bRSU\s*s?\b/i,
    /\bESPP\b/i
  ],
  other: [
    /\bbonus(es)?\b/i,
    /\btuition\s+(reimbursement|assistance)\b/i,
    /\bremote\s+(work\s+)?stipend\b/i,
    /\blife\s+insurance\b/i,
    /\bparental\s+leave\b/i,
    /\bwellness\b/i
  ]
};

function detectBenefits(text) {
  const detected = { health: false, retirement: false, pto: false, equity: false, other: false };
  for (const [category, patterns] of Object.entries(benefitsPatterns)) {
    detected[category] = patterns.some(pattern => pattern.test(text));
  }
  return detected;
}

function createBenefitsBadge(benefits) {
  const detectedCategories = Object.entries(benefits)
    .filter(([_, detected]) => detected)
    .map(([category]) => category);

  if (detectedCategories.length === 0) return null;

  const badge = document.createElement('div');
  badge.className = 'jobfiltr-benefits-badge';

  const categoryLabels = { health: 'Health', retirement: '401k', pto: 'PTO', equity: 'Equity', other: 'Bonus' };
  const categoryIcons = { health: '🏥', retirement: '💰', pto: '🏖️', equity: '📈', other: '🎁' };
  const categoryColors = { health: '#ef4444', retirement: '#22c55e', pto: '#3b82f6', equity: '#a855f7', other: '#f59e0b' };
  const categoryDescriptions = {
    health: 'Health/Medical/Dental/Vision Insurance',
    retirement: '401k/Pension/Retirement Plan',
    pto: 'Paid Time Off/Vacation/Sick Leave',
    equity: 'Stock Options/RSUs/Equity',
    other: 'Bonus/Tuition/Wellness/Life Insurance'
  };

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
  const hiddenCategories = detectedCategories.slice(maxVisible);

  // Add visible benefit tags with icons
  visibleCategories.forEach(category => {
    const tag = document.createElement('span');
    tag.innerHTML = `${categoryIcons[category]} ${categoryLabels[category]}`;
    tag.title = categoryDescriptions[category];
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
      cursor: default;
    `;
    badge.appendChild(tag);
  });

  // Add "+X More" button if there are hidden categories
  if (hiddenCategories.length > 0) {
    const moreTag = document.createElement('span');
    moreTag.className = 'jobfiltr-benefits-more';
    moreTag.innerHTML = `+${hiddenCategories.length} More`;
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
      cursor: pointer;
      transition: all 0.2s ease;
    `;

    // Create expanded dropdown
    const dropdown = document.createElement('div');
    dropdown.className = 'jobfiltr-benefits-dropdown';
    dropdown.style.cssText = `
      display: none;
      position: absolute;
      bottom: 100%;
      right: 0;
      margin-bottom: 8px;
      background: white;
      border-radius: 10px;
      padding: 10px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.15);
      border: 1px solid #e2e8f0;
      min-width: 180px;
      z-index: 1001;
    `;

    // Add all benefits to dropdown
    dropdown.innerHTML = `
      <div style="font-size: 11px; font-weight: 700; color: #334155; margin-bottom: 8px; padding-bottom: 6px; border-bottom: 1px solid #e2e8f0;">
        All Benefits Detected
      </div>
      ${detectedCategories.map(cat => `
        <div style="display: flex; align-items: center; gap: 8px; padding: 5px 0; font-size: 11px;">
          <span style="font-size: 14px;">${categoryIcons[cat]}</span>
          <div>
            <div style="font-weight: 600; color: ${categoryColors[cat]};">${categoryLabels[cat]}</div>
            <div style="font-size: 9px; color: #64748b;">${categoryDescriptions[cat]}</div>
          </div>
        </div>
      `).join('')}
    `;

    // Toggle dropdown on click
    moreTag.addEventListener('click', (e) => {
      e.stopPropagation();
      const isVisible = dropdown.style.display === 'block';
      dropdown.style.display = isVisible ? 'none' : 'block';
      moreTag.style.background = isVisible ? '#64748b20' : '#64748b';
      moreTag.style.color = isVisible ? '#64748b' : 'white';
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', () => {
      dropdown.style.display = 'none';
      moreTag.style.background = '#64748b20';
      moreTag.style.color = '#64748b';
    });

    badge.appendChild(moreTag);
    badge.appendChild(dropdown);
  }

  return badge;
}

function addBenefitsBadgeToJob(jobCard, text) {
  const existingBadge = jobCard.querySelector('.jobfiltr-benefits-badge');
  if (existingBadge) existingBadge.remove();

  // Get job description from the detail panel if available (for selected job)
  let fullText = text;

  // Check if this job card is currently selected/active
  const isSelected = jobCard.classList.contains('jobs-search-results-list__list-item--active') ||
                     jobCard.querySelector('.job-card-container--active') ||
                     jobCard.hasAttribute('data-occludable-job-id');

  // Try to get the full job description from the detail panel
  const descriptionSelectors = [
    '.jobs-description__content',
    '.jobs-description-content__text',
    '.jobs-box__html-content',
    '#job-details',
    '.job-view-layout .description__text',
    '.jobs-details__main-content .jobs-description'
  ];

  for (const selector of descriptionSelectors) {
    const descEl = document.querySelector(selector);
    if (descEl) {
      fullText += ' ' + descEl.textContent.trim().toLowerCase();
      break;
    }
  }

  const benefits = detectBenefits(fullText);
  const badge = createBenefitsBadge(benefits);

  if (badge) {
    if (window.getComputedStyle(jobCard).position === 'static') {
      jobCard.style.position = 'relative';
    }
    jobCard.appendChild(badge);
    log('Added benefits badge to job card');
  }
}

// Enhanced function to scan all visible jobs for benefits from description panel
function updateBenefitsFromDetailPanel() {
  if (!filterSettings.showBenefitsIndicator) return;

  // Get the job description from the detail panel
  const descriptionSelectors = [
    '.jobs-description__content',
    '.jobs-description-content__text',
    '.jobs-box__html-content',
    '#job-details',
    '.job-view-layout .description__text'
  ];

  let descriptionText = '';
  for (const selector of descriptionSelectors) {
    const descEl = document.querySelector(selector);
    if (descEl) {
      descriptionText = descEl.textContent.trim().toLowerCase();
      break;
    }
  }

  if (!descriptionText) return;

  // Find the currently selected job card
  const selectedSelectors = [
    '.jobs-search-results-list__list-item--active',
    'li.jobs-search-results-list__list-item[class*="active"]',
    '.scaffold-layout__list-item--active',
    'div.job-card-container--active'
  ];

  for (const selector of selectedSelectors) {
    const selectedCard = document.querySelector(selector);
    if (selectedCard) {
      // Remove old badge and add new one with full description info
      const existingBadge = selectedCard.querySelector('.jobfiltr-benefits-badge');
      if (existingBadge) existingBadge.remove();

      const cardText = getJobCardText(selectedCard);
      const fullText = cardText + ' ' + descriptionText;
      const benefits = detectBenefits(fullText);
      const badge = createBenefitsBadge(benefits);

      if (badge) {
        if (window.getComputedStyle(selectedCard).position === 'static') {
          selectedCard.style.position = 'relative';
        }
        selectedCard.appendChild(badge);
        log('Updated benefits badge from detail panel');
      }
      break;
    }
  }
}

// ===== JOB AGE DETECTION =====
function getJobAge(jobCard) {
  try {
    // Try multiple selectors for time/date elements - comprehensive list
    const timeSelectors = [
      'time',
      '.job-card-container__listed-time',
      '.job-card-list__footer-wrapper time',
      '.artdeco-entity-lockup__caption',
      '.job-card-container__metadata-item--workplace-type',
      '.job-card-container__footer-item',
      '.job-card-list__footer-wrapper',
      '.jobs-unified-top-card__posted-date',
      '.job-card-container__footer-job-state',
      '.job-card-list__insight',
      '.job-card-container__primary-description',
      '.job-card-container__metadata-wrapper',
      // Selectors for visited/viewed jobs
      '.job-card-container--visited time',
      '.job-card-container--visited .job-card-container__footer-item',
      '.scaffold-layout__list-item--is-viewed time',
      '.jobs-search-results-list__list-item--visited time',
      // More general selectors
      '[class*="listed"]',
      '[class*="posted"]',
      '[class*="time"]',
      'li[class*="job"] time',
      'div[class*="job-card"] time'
    ];

    for (const selector of timeSelectors) {
      const timeElems = jobCard.querySelectorAll(selector);
      for (const timeElem of timeElems) {
        // Try datetime attribute first
        const datetime = timeElem.getAttribute('datetime');
        if (datetime) {
          const postDate = new Date(datetime);
          const now = new Date();
          const daysAgo = Math.floor((now - postDate) / (1000 * 60 * 60 * 24));
          if (!isNaN(daysAgo) && daysAgo >= 0) {
            return daysAgo;
          }
        }

        // Fallback: parse text
        const text = timeElem.textContent.trim().toLowerCase();

        // Match patterns like "1 hour ago", "2 days ago", "3 weeks ago", "1 month ago"
        if (text.includes('just now') || text.includes('moment') || text.includes('today')) return 0;
        if (text.includes('hour') || text.includes('minute') || text.includes('second')) return 0;

        // Check for "Xd" or "Xw" or "Xmo" shorthand
        const shortMatch = text.match(/\b(\d+)\s*(d|w|mo|m)\b/i);
        if (shortMatch) {
          const num = parseInt(shortMatch[1]);
          const unit = shortMatch[2].toLowerCase();
          if (unit === 'd') return num;
          if (unit === 'w') return num * 7;
          if (unit === 'mo' || unit === 'm') return num * 30;
        }

        if (text.includes('day')) {
          const match = text.match(/(\d+)/);
          if (match) return parseInt(match[1]);
        }
        if (text.includes('week')) {
          const match = text.match(/(\d+)/);
          if (match) return parseInt(match[1]) * 7;
          return 7; // Default to 1 week if no number found
        }
        if (text.includes('month')) {
          const match = text.match(/(\d+)/);
          if (match) return parseInt(match[1]) * 30;
          return 30; // Default to 1 month if no number found
        }
      }
    }

    // Check the full job card text for time references - more comprehensive patterns
    const fullText = jobCard.textContent.toLowerCase();

    // Check for "just now", "today", etc.
    if (fullText.includes('just now') || fullText.includes('posted today') || fullText.includes('just posted')) {
      return 0;
    }

    const timePatterns = [
      // With "ago"
      { pattern: /(\d+)\s*(?:hours?|hr|h)\s*ago/i, multiplier: 0 },
      { pattern: /(\d+)\s*(?:days?|d)\s*ago/i, multiplier: 1 },
      { pattern: /(\d+)\s*(?:weeks?|wk|w)\s*ago/i, multiplier: 7 },
      { pattern: /(\d+)\s*(?:months?|mo)\s*ago/i, multiplier: 30 },
      // Without "ago" (e.g., "Posted 3 days", "Reposted 1 week")
      { pattern: /(?:posted|reposted|listed)\s*(\d+)\s*(?:days?|d)/i, multiplier: 1 },
      { pattern: /(?:posted|reposted|listed)\s*(\d+)\s*(?:weeks?|wk|w)/i, multiplier: 7 },
      { pattern: /(?:posted|reposted|listed)\s*(\d+)\s*(?:months?|mo)/i, multiplier: 30 },
      // Shorthand format (e.g., "2d", "1w", "3mo")
      { pattern: /\b(\d+)\s*d\b/i, multiplier: 1 },
      { pattern: /\b(\d+)\s*w\b/i, multiplier: 7 },
      { pattern: /\b(\d+)\s*mo\b/i, multiplier: 30 }
    ];

    for (const { pattern, multiplier } of timePatterns) {
      const match = fullText.match(pattern);
      if (match) {
        const value = parseInt(match[1]) * multiplier;
        // Sanity check - job age should be reasonable (0-365 days)
        if (value >= 0 && value <= 365) {
          return value;
        }
      }
    }

    // Last resort: check for time element anywhere in the card's parent list item
    const parentListItem = jobCard.closest('li');
    if (parentListItem && parentListItem !== jobCard) {
      const parentTime = parentListItem.querySelector('time');
      if (parentTime) {
        const datetime = parentTime.getAttribute('datetime');
        if (datetime) {
          const postDate = new Date(datetime);
          const now = new Date();
          const daysAgo = Math.floor((now - postDate) / (1000 * 60 * 60 * 24));
          if (!isNaN(daysAgo) && daysAgo >= 0 && daysAgo <= 365) {
            return daysAgo;
          }
        }

        const timeText = parentTime.textContent.trim().toLowerCase();
        for (const { pattern, multiplier } of timePatterns) {
          const match = timeText.match(pattern);
          if (match) {
            return parseInt(match[1]) * multiplier;
          }
        }
      }
    }

    return null;
  } catch (error) {
    log('Error getting job age:', error);
    return null;
  }
}

// Format job age for display - shows exact age
function formatJobAge(days) {
  if (days === 0) return 'Today';
  if (days === 1) return '1 day';
  return `${days} days`;
}

// Add job age badge to job card (positioned on the RIGHT side)
function addJobAgeBadge(jobCard, days) {
  // Cache the job age on the job card for persistence
  jobCard.dataset.jobfiltrAge = days.toString();

  // Check if badge already exists with correct value
  const existingBadge = jobCard.querySelector('.jobfiltr-age-badge');
  if (existingBadge && existingBadge.dataset.age === days.toString()) {
    return; // Badge already exists with correct value, no need to recreate
  }

  // Remove existing job age badge if any
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
  badge.dataset.age = days.toString(); // Store age for comparison
  badge.innerHTML = `<span style="margin-right: 4px;">${icon}</span>${ageText}`;
  badge.style.cssText = `
    position: absolute;
    top: 8px;
    right: 8px;
    background: ${bgColor};
    color: ${textColor};
    padding: 4px 10px;
    border-radius: 12px;
    font-size: 11px;
    font-weight: 600;
    z-index: 1000;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    border: 1px solid ${textColor}30;
    display: flex;
    align-items: center;
  `;

  if (window.getComputedStyle(jobCard).position === 'static') {
    jobCard.style.position = 'relative';
  }
  jobCard.appendChild(badge);
}

// ===== MAIN FILTER APPLICATION =====
function applyFilters(settings) {
  filterSettings = settings;
  hiddenJobsCount = 0;

  // Clear processed cache to force re-evaluation of all jobs
  if (typeof processedJobCards !== 'undefined') {
    processedJobCards = new WeakSet();
  }

  log('Applying filters with settings:', settings);

  // Comprehensive job card selectors - includes viewed/visited jobs and dismissible jobs with X button
  const jobCardSelectors = [
    '.jobs-search__results-list > li',
    '.scaffold-layout__list-item',
    'li.jobs-search-results__list-item',
    'div.job-card-container',
    'div[data-job-id]',
    'li[data-occludable-job-id]',
    // Viewed/visited job selectors
    '.job-card-container--visited',
    '.scaffold-layout__list-item--is-viewed',
    '.jobs-search-results-list__list-item--visited',
    'li.ember-view.jobs-search-results__list-item',
    // Dismissible jobs with X button (collections, saved jobs, job alerts)
    '.jobs-unified-list li',
    '.jobs-unified-list .scaffold-layout__list-item',
    '.jobs-job-card-list li',
    '.jobs-job-card-list__item',
    '.job-card-list li',
    '.jobs-home-recommendations li',
    '.jobs-save-list li',
    // Additional selectors for edge cases
    '.jobs-search-results__list-item',
    '.job-card-list__entity-lockup'
  ];

  let jobCards = new Set();
  for (const selector of jobCardSelectors) {
    const cards = document.querySelectorAll(selector);
    cards.forEach(card => jobCards.add(card));
  }

  jobCards = Array.from(jobCards);

  if (jobCards.length === 0) {
    log('No job cards found with any selector');
    return;
  }

  log(`Found ${jobCards.length} job cards (including viewed jobs)`);

  jobCards.forEach((jobCard) => {
    let shouldHide = false;
    const reasons = [];

    // Remove existing badges first (but NOT age badges - those persist)
    const existingBadges = jobCard.querySelectorAll('.jobfiltr-badge, .jobfiltr-benefits-badge');
    existingBadges.forEach(b => b.remove());

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
        let applicantMismatch = false;
        if (range === 'zero' && applicantCount > 0) applicantMismatch = true;
        if (range === 'under5' && applicantCount >= 5) applicantMismatch = true;
        if (range === 'under10' && applicantCount >= 10) applicantMismatch = true;
        if (range === '10-50' && (applicantCount < 10 || applicantCount > 50)) applicantMismatch = true;
        if (range === '50-200' && (applicantCount < 50 || applicantCount > 200)) applicantMismatch = true;
        if (range === 'over200' && applicantCount < 200) applicantMismatch = true;
        if (range === 'over500' && applicantCount < 500) applicantMismatch = true;
        if (applicantMismatch) {
          shouldHide = true;
          reasons.push(`Applicants: ${applicantCount}`);
        }
      } else if (settings.applicantRange === 'zero') {
        // For "zero applicants" filter, check for early applicant indicators
        const jobText = getJobCardText(jobCard);
        const hasEarlyApplicantText = /be among the first|be an early applicant|be one of the first/i.test(jobText);
        if (!hasEarlyApplicantText) {
          // If no early applicant indicator, can't confirm zero applicants - don't hide
        }
      }
    }

    // Filter 3.5: Job Posting Age
    if (settings.filterPostingAge) {
      const jobAge = getJobAge(jobCard);
      if (jobAge !== null) {
        const range = settings.postingAgeRange;
        let maxDays = 7; // default 1 week
        if (range === '12h') maxDays = 0.5;
        if (range === '24h') maxDays = 1;
        if (range === '3d') maxDays = 3;
        if (range === '1w') maxDays = 7;
        if (range === '2w') maxDays = 14;
        if (range === '1m') maxDays = 30;

        if (jobAge > maxDays) {
          shouldHide = true;
          reasons.push(`Posted ${jobAge} days ago (max: ${maxDays})`);
        }
      }
    }

    // Filter 4: True Remote Accuracy
    if (settings.trueRemoteAccuracy) {
      if (detectNonRemoteIndicators(jobCard, settings)) {
        shouldHide = true;
        reasons.push('Non-remote indicators detected');
      }
    }

    // Filter 5: Entry Level Accuracy
    if (settings.entryLevelAccuracy) {
      const entryCheck = checkEntryLevelAccuracy(jobCard);
      if (entryCheck && entryCheck.mismatch) {
        shouldHide = true;
        reasons.push(`Entry Level mismatch: requires ${entryCheck.years}+ years`);
        // Also add a warning badge for visibility
        addEntryLevelWarningBadge(jobCard, `Requires ${entryCheck.years}+ years exp`);
      }
    }

    // Filter 6: Include Keywords
    if (settings.filterIncludeKeywords && settings.includeKeywords && settings.includeKeywords.length > 0) {
      if (!matchesIncludeKeywords(jobCard, settings.includeKeywords)) {
        shouldHide = true;
        reasons.push('Missing required keywords');
      }
    }

    // Filter 7: Exclude Keywords
    if (settings.filterExcludeKeywords && settings.excludeKeywords && settings.excludeKeywords.length > 0) {
      if (matchesExcludeKeywords(jobCard, settings.excludeKeywords)) {
        shouldHide = true;
        reasons.push('Contains excluded keywords');
      }
    }

    // Filter 8: Hide jobs without salary info
    if (settings.hideNoSalary) {
      if (!hasSalaryInfo(jobCard)) {
        shouldHide = true;
        reasons.push('No salary info');
      }
    }

    // Benefits Indicator (display only, doesn't hide)
    if (settings.showBenefitsIndicator && !shouldHide) {
      const text = getJobCardText(jobCard);
      addBenefitsBadgeToJob(jobCard, text);
    }

    // Job Age Display (display only, doesn't hide)
    if (settings.showJobAge && !shouldHide) {
      let jobAge = getJobAge(jobCard);
      // Use cached age if getJobAge returns null but we have a cached value
      if (jobAge === null && jobCard.dataset.jobfiltrAge) {
        jobAge = parseInt(jobCard.dataset.jobfiltrAge, 10);
      }
      if (jobAge !== null) {
        addJobAgeBadge(jobCard, jobAge);
      }
    }

    // Note: Applicant Count is now shown in the detail panel only (not on job cards)
    // This is because LinkedIn doesn't expose applicant counts on most job cards

    // Apply hiding
    if (shouldHide) {
      jobCard.style.display = 'none';
      jobCard.dataset.jobfiltrHidden = 'true';
      jobCard.dataset.jobfiltrReasons = reasons.join(', ');
      hiddenJobsCount++;
      log(`Hidden job card: ${reasons.join(', ')}`);
    } else {
      jobCard.style.display = '';
      delete jobCard.dataset.jobfiltrHidden;
    }
  });

  // Send stats update with page info
  if (isExtensionContextValid()) {
    try {
      chrome.runtime.sendMessage({
        type: 'FILTER_STATS_UPDATE',
        hiddenCount: hiddenJobsCount,
        page: currentPage,
        site: 'linkedin'
      });
    } catch (error) {
      if (!error.message?.includes('Extension context invalidated')) {
        log('Failed to send stats update:', error);
      }
    }
  }

  log(`Filtered ${hiddenJobsCount} jobs out of ${jobCards.length} on page ${currentPage}`);

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

  // Comprehensive job card selectors - includes viewed/visited jobs and dismissible jobs with X button
  const jobCardSelectors = [
    '.jobs-search__results-list > li',
    '.scaffold-layout__list-item',
    'li.jobs-search-results__list-item',
    'div.job-card-container',
    'div[data-job-id]',
    'li[data-occludable-job-id]',
    // Viewed/visited job selectors
    '.job-card-container--visited',
    '.scaffold-layout__list-item--is-viewed',
    '.jobs-search-results-list__list-item--visited',
    'li.ember-view.jobs-search-results__list-item',
    // Dismissible jobs with X button (collections, saved jobs, job alerts)
    '.jobs-unified-list li',
    '.jobs-unified-list .scaffold-layout__list-item',
    '.jobs-job-card-list li',
    '.jobs-job-card-list__item',
    '.job-card-list li',
    '.jobs-home-recommendations li',
    '.jobs-save-list li',
    '.jobs-search-results__list-item'
  ];

  // Use Set to avoid duplicates
  let jobCardsSet = new Set();
  for (const selector of jobCardSelectors) {
    const cards = document.querySelectorAll(selector);
    cards.forEach(card => jobCardsSet.add(card));
  }

  const jobCards = Array.from(jobCardsSet);

  jobCards.forEach(jobCard => {
    jobCard.style.display = '';
    delete jobCard.dataset.jobfiltrHidden;
    delete jobCard.dataset.jobfiltrReasons;
    // Remove badges but NOT age badges - those persist permanently
    const badges = jobCard.querySelectorAll('.jobfiltr-badge, .jobfiltr-benefits-badge, .jobfiltr-entry-level-badge');
    badges.forEach(badge => badge.remove());
  });

  // Also remove detail panel badges
  const detailBadges = document.querySelectorAll('.jobfiltr-detail-applicant-badge');
  detailBadges.forEach(badge => badge.remove());

  hiddenJobsCount = 0;

  if (isExtensionContextValid()) {
    try {
      chrome.runtime.sendMessage({ type: 'FILTER_STATS_UPDATE', hiddenCount: 0 });
    } catch (error) {
      if (!error.message?.includes('Extension context invalidated')) {
        log('Failed to send reset update:', error);
      }
    }
  }

  log('Filters reset on LinkedIn');
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

  if (message.type === 'GET_PAGE_INFO') {
    sendResponse({
      page: currentPage,
      hiddenCount: hiddenJobsCount,
      site: 'linkedin'
    });
    return true;
  }

  if (message.type === 'ANALYZE_GHOST_JOB') {
    // Perform ghost job analysis using the job data
    const result = performGhostAnalysis(message.jobData);
    sendResponse({ success: true, data: result });
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
function performGhostAnalysis(jobData) {
  const redFlags = [];
  let score = 100; // Start with perfect score, subtract for issues

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
      score -= 20;
      break;
    }
  }

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
    score -= 15;
  } else if (vagueCount >= 1) {
    redFlags.push('Job description contains some vague language');
    score -= 5;
  }

  // Check for salary transparency
  const descText = jobData.description || '';
  if (!/\$[\d,]+/.test(descText) && !/salary|pay|compensation/i.test(descText)) {
    redFlags.push('No salary information provided');
    score -= 10;
  }

  // Check description length
  if (descText.length < 200) {
    redFlags.push('Job description is unusually short');
    score -= 15;
  }

  // Check for remote work clarity issues
  if (/remote/i.test(descText) && /hybrid|on-?site|in-?office|commute/i.test(descText)) {
    redFlags.push('Conflicting remote/in-office requirements');
    score -= 10;
  }

  // Check posting age (if available from page)
  const timeSelectors = ['time', '.job-card-container__listed-time'];
  for (const selector of timeSelectors) {
    const timeElem = document.querySelector(selector);
    if (timeElem) {
      const text = timeElem.textContent.trim().toLowerCase();
      if (text.includes('month') && parseInt(text) >= 2) {
        redFlags.push('Job has been posted for over 2 months');
        score -= 15;
        break;
      }
    }
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

// ===== CONTINUOUS SCANNING SYSTEM =====
// Efficiently scans for new jobs without interrupting user actions

let processedJobCards = new WeakSet();
let scanDebounceTimer = null;
let isScanning = false;

// Debounced filter application - prevents excessive re-runs
function scheduleFilterScan(immediate = false) {
  if (Object.keys(filterSettings).length === 0) return;

  clearTimeout(scanDebounceTimer);

  if (immediate) {
    performIncrementalScan();
  } else {
    scanDebounceTimer = setTimeout(() => {
      performIncrementalScan();
    }, 300);
  }
}

// Only process new/unprocessed job cards
function performIncrementalScan() {
  if (isScanning || Object.keys(filterSettings).length === 0) return;
  isScanning = true;

  // Comprehensive job card selectors - includes viewed/visited jobs and dismissible jobs with X button
  const jobCardSelectors = [
    '.jobs-search__results-list > li',
    '.scaffold-layout__list-item',
    'li.jobs-search-results__list-item',
    'div.job-card-container',
    'div[data-job-id]',
    'li[data-occludable-job-id]',
    // Viewed/visited job selectors
    '.job-card-container--visited',
    '.scaffold-layout__list-item--is-viewed',
    '.jobs-search-results-list__list-item--visited',
    'li.ember-view.jobs-search-results__list-item',
    // Dismissible jobs with X button (collections, saved jobs, job alerts)
    '.jobs-unified-list li',
    '.jobs-unified-list .scaffold-layout__list-item',
    '.jobs-job-card-list li',
    '.jobs-job-card-list__item',
    '.job-card-list li',
    '.jobs-home-recommendations li',
    '.jobs-save-list li',
    // Additional selectors
    '.jobs-search-results__list-item',
    '.job-card-list__entity-lockup'
  ];

  // Use Set to avoid duplicates
  let jobCardsSet = new Set();
  for (const selector of jobCardSelectors) {
    const cards = document.querySelectorAll(selector);
    cards.forEach(card => jobCardsSet.add(card));
  }

  const jobCards = Array.from(jobCardsSet);

  let newJobsProcessed = 0;

  jobCards.forEach((jobCard) => {
    // Skip already processed cards (unless settings changed)
    if (processedJobCards.has(jobCard) && !jobCard.dataset.jobfiltrSettingsHash) {
      return;
    }

    // Mark as processed
    processedJobCards.add(jobCard);

    let shouldHide = false;
    const reasons = [];

    // Remove existing badges first (but NOT age badges - those persist)
    const existingBadges = jobCard.querySelectorAll('.jobfiltr-badge, .jobfiltr-benefits-badge');
    existingBadges.forEach(b => b.remove());

    // Apply all filters
    if (filterSettings.hideStaffing && isStaffingFirm(jobCard)) {
      shouldHide = true;
      reasons.push('Staffing Firm');
    }

    if (filterSettings.hideSponsored && isSponsored(jobCard)) {
      shouldHide = true;
      reasons.push('Sponsored');
    }

    if (filterSettings.filterApplicants) {
      const applicantCount = getApplicantCount(jobCard);
      if (applicantCount !== null) {
        const range = filterSettings.applicantRange;
        if (range === 'under10' && applicantCount >= 10) shouldHide = true;
        if (range === '10-50' && (applicantCount < 10 || applicantCount > 50)) shouldHide = true;
        if (range === '50-200' && (applicantCount < 50 || applicantCount > 200)) shouldHide = true;
        if (range === 'over200' && applicantCount < 200) shouldHide = true;
        if (range === 'over500' && applicantCount < 500) shouldHide = true;
        if (shouldHide && !reasons.includes('Applicants')) reasons.push(`Applicants: ${applicantCount}`);
      }
    }

    if (filterSettings.trueRemoteAccuracy) {
      if (detectNonRemoteIndicators(jobCard, filterSettings)) {
        shouldHide = true;
        reasons.push('Non-remote indicators detected');
      }
    }

    if (filterSettings.filterIncludeKeywords && filterSettings.includeKeywords?.length > 0) {
      if (!matchesIncludeKeywords(jobCard, filterSettings.includeKeywords)) {
        shouldHide = true;
        reasons.push('Missing required keywords');
      }
    }

    if (filterSettings.filterExcludeKeywords && filterSettings.excludeKeywords?.length > 0) {
      if (matchesExcludeKeywords(jobCard, filterSettings.excludeKeywords)) {
        shouldHide = true;
        reasons.push('Contains excluded keywords');
      }
    }

    // Hide jobs without salary info
    if (filterSettings.hideNoSalary) {
      if (!hasSalaryInfo(jobCard)) {
        shouldHide = true;
        reasons.push('No salary info');
      }
    }

    // Benefits Indicator (display only)
    if (filterSettings.showBenefitsIndicator && !shouldHide) {
      const text = getJobCardText(jobCard);
      addBenefitsBadgeToJob(jobCard, text);
    }

    // Job Age Display (display only)
    if (filterSettings.showJobAge && !shouldHide) {
      let jobAge = getJobAge(jobCard);
      // Use cached age if getJobAge returns null but we have a cached value
      if (jobAge === null && jobCard.dataset.jobfiltrAge) {
        jobAge = parseInt(jobCard.dataset.jobfiltrAge, 10);
      }
      if (jobAge !== null) {
        addJobAgeBadge(jobCard, jobAge);
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

    newJobsProcessed++;
  });

  if (newJobsProcessed > 0) {
    log(`Incremental scan: processed ${newJobsProcessed} job cards, ${hiddenJobsCount} total hidden on page ${currentPage}`);
    if (isExtensionContextValid()) {
      try {
        chrome.runtime.sendMessage({
          type: 'FILTER_STATS_UPDATE',
          hiddenCount: hiddenJobsCount,
          page: currentPage,
          site: 'linkedin'
        });
      } catch (error) {
        // Silently ignore errors in background updates
      }
    }
  }

  isScanning = false;
}

// Clear processed cache when settings change (force re-evaluation)
function clearProcessedCache() {
  processedJobCards = new WeakSet();
  hiddenJobsCount = 0;
}

// ===== MUTATION OBSERVER FOR NEW JOB CARDS =====
const jobListObserver = new MutationObserver((mutations) => {
  let hasNewNodes = false;

  for (const mutation of mutations) {
    if (mutation.addedNodes.length > 0) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          hasNewNodes = true;
          break;
        }
      }
    }
    if (hasNewNodes) break;
  }

  if (hasNewNodes) {
    scheduleFilterScan();
  }
});

// ===== INTERSECTION OBSERVER FOR SCROLL VISIBILITY =====
const visibilityObserver = new IntersectionObserver((entries) => {
  let hasVisibleNew = false;

  entries.forEach(entry => {
    if (entry.isIntersecting && !processedJobCards.has(entry.target)) {
      hasVisibleNew = true;
    }
  });

  if (hasVisibleNew && Object.keys(filterSettings).length > 0) {
    scheduleFilterScan();
  }
}, {
  rootMargin: '200px', // Pre-process jobs about to scroll into view
  threshold: 0.1
});

// ===== SCROLL LISTENER FOR INFINITE SCROLL =====
let scrollDebounceTimer = null;
function handleScroll() {
  clearTimeout(scrollDebounceTimer);
  scrollDebounceTimer = setTimeout(() => {
    if (Object.keys(filterSettings).length > 0) {
      scheduleFilterScan();
    }
  }, 150);
}

// ===== INITIALIZE OBSERVERS =====
function initializeObservers() {
  const possibleContainers = [
    '.jobs-search__results-list',
    '.scaffold-layout__list',
    '.jobs-search-results-list',
    '.jobs-search-two-pane__results'
  ];

  let observerStarted = false;

  for (const selector of possibleContainers) {
    const container = document.querySelector(selector);
    if (container && !observerStarted) {
      log(`Starting continuous scan observer on: ${selector}`);
      jobListObserver.observe(container, { childList: true, subtree: true });
      observerStarted = true;

      // Also observe existing job cards for visibility
      const jobCards = container.querySelectorAll('li, div[data-job-id]');
      jobCards.forEach(card => visibilityObserver.observe(card));

      break;
    }
  }

  // Add scroll listener for infinite scroll detection
  window.addEventListener('scroll', handleScroll, { passive: true });

  return observerStarted;
}

// Try to initialize immediately
let observerInitialized = initializeObservers();

// Retry on load if not found
if (!observerInitialized) {
  window.addEventListener('load', () => {
    if (!observerInitialized) {
      observerInitialized = initializeObservers();
    }
  });

  // Also retry after a short delay (LinkedIn loads content dynamically)
  setTimeout(() => {
    if (!observerInitialized) {
      observerInitialized = initializeObservers();
    }
  }, 2000);
}

// ===== AUTO-LOAD SAVED FILTERS ON PAGE LOAD =====
async function loadAndApplyFilters() {
  // Check if extension context is valid before attempting to use Chrome APIs
  if (!isExtensionContextValid()) {
    log('Extension context invalidated, cannot load filters');
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
    // Only log error if it's not a context invalidation error
    if (!error.message?.includes('Extension context invalidated')) {
      log('Error loading saved filters:', error);
    }
  }
}

// Load saved filters when script initializes
loadAndApplyFilters();

// Also re-apply on navigation within LinkedIn (SPA behavior)
let lastUrl = location.href;
const urlObserver = new MutationObserver(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    log('URL changed, re-initializing observers');

    // Check for page change and update page number
    const pageChanged = checkForPageChange();

    // Always clear cache and re-apply on URL change
    clearProcessedCache();

    setTimeout(() => {
      // Re-detect page after DOM settles
      currentPage = detectCurrentPage();

      initializeObservers();
      if (Object.keys(filterSettings).length > 0) {
        log(`Re-applying filters on page ${currentPage}`);
        applyFilters(filterSettings);
      }
    }, 1000);
  }
});
urlObserver.observe(document.body, { childList: true, subtree: true });

// Also watch for pagination clicks
document.addEventListener('click', (e) => {
  const paginationBtn = e.target.closest('.artdeco-pagination__indicator, .jobs-search-pagination__button');
  if (paginationBtn) {
    log('Pagination click detected');
    // Wait for page to load then re-apply
    setTimeout(() => {
      checkForPageChange();
      clearProcessedCache();
      if (Object.keys(filterSettings).length > 0) {
        applyFilters(filterSettings);
      }
    }, 1500);
  }
}, true);

// Initialize page tracking
lastPageUrl = location.href;
currentPage = detectCurrentPage();

// ===== JOB CARD CLICK LISTENER FOR DETAIL PANEL UPDATES =====
// When a user clicks on a job card, update badges from the detail panel
document.addEventListener('click', (e) => {
  const jobCard = e.target.closest('li.jobs-search-results__list-item, .scaffold-layout__list-item, div.job-card-container');
  if (jobCard) {
    // Wait for the job description panel to load - multiple attempts
    [300, 600, 1000, 1500].forEach(delay => {
      setTimeout(() => {
        // Update benefits badge from detail panel
        if (filterSettings.showBenefitsIndicator) {
          updateBenefitsFromDetailPanel();
        }
        // Update applicant count in detail panel
        if (filterSettings.showApplicantCount) {
          updateApplicantCountInDetailPanel();
        }
      }, delay);
    });
  }
}, true);

// ===== MUTATION OBSERVER FOR JOB DETAIL PANEL =====
// Watch for changes in the job detail panel to update applicant count
let detailPanelObserver = null;
let lastDetailPanelContent = '';

function setupDetailPanelObserver() {
  // Find the detail panel container
  const detailPanelSelectors = [
    '.jobs-details',
    '.job-view-layout',
    '.scaffold-layout__detail',
    '.jobs-search__job-details'
  ];

  let detailPanel = null;
  for (const selector of detailPanelSelectors) {
    detailPanel = document.querySelector(selector);
    if (detailPanel) break;
  }

  if (!detailPanel) return;

  // Disconnect existing observer
  if (detailPanelObserver) {
    detailPanelObserver.disconnect();
  }

  // Create new observer
  detailPanelObserver = new MutationObserver((mutations) => {
    // Check if the content has actually changed
    const currentContent = detailPanel.querySelector('.jobs-unified-top-card, .job-details-jobs-unified-top-card')?.textContent || '';

    if (currentContent !== lastDetailPanelContent) {
      lastDetailPanelContent = currentContent;

      // Debounce the update
      clearTimeout(window.detailPanelUpdateTimeout);
      window.detailPanelUpdateTimeout = setTimeout(() => {
        if (filterSettings.showApplicantCount) {
          updateApplicantCountInDetailPanel();
        }
        if (filterSettings.showBenefitsIndicator) {
          updateBenefitsFromDetailPanel();
        }
      }, 200);
    }
  });

  detailPanelObserver.observe(detailPanel, {
    childList: true,
    subtree: true,
    characterData: true
  });

  log('Detail panel observer set up');
}

// Set up the observer after page load
setTimeout(setupDetailPanelObserver, 2000);

// Re-setup observer when URL changes (SPA navigation)
let lastSetupUrl = location.href;
setInterval(() => {
  if (location.href !== lastSetupUrl) {
    lastSetupUrl = location.href;
    setTimeout(setupDetailPanelObserver, 1000);
  }
}, 1000);

// ===== PERIODIC FULL SCAN (Every 2 seconds) =====
// Ensures filters are always applied to all visible jobs, including dynamically loaded content
let periodicScanInterval = null;

function performFullScan() {
  if (Object.keys(filterSettings).length === 0) return;

  // Also update benefits from detail panel for selected job
  if (filterSettings.showBenefitsIndicator) {
    updateBenefitsFromDetailPanel();
  }

  // Update applicant count in detail panel for selected job
  if (filterSettings.showApplicantCount) {
    updateApplicantCountInDetailPanel();
  }

  // Comprehensive job card selectors - includes viewed/visited jobs and dismissible jobs with X button
  const jobCardSelectors = [
    '.jobs-search__results-list > li',
    '.scaffold-layout__list-item',
    'li.jobs-search-results__list-item',
    'div.job-card-container',
    'div[data-job-id]',
    'li[data-occludable-job-id]',
    // Viewed/visited job selectors
    '.job-card-container--visited',
    '.scaffold-layout__list-item--is-viewed',
    '.jobs-search-results-list__list-item--visited',
    'li.ember-view.jobs-search-results__list-item',
    // Dismissible jobs with X button (collections, saved jobs, job alerts)
    '.jobs-unified-list li',
    '.jobs-unified-list .scaffold-layout__list-item',
    '.jobs-job-card-list li',
    '.jobs-job-card-list__item',
    '.job-card-list li',
    '.jobs-home-recommendations li',
    '.jobs-save-list li',
    // Additional selectors for edge cases
    '.jobs-search-results__list-item',
    '.job-card-list__entity-lockup'
  ];

  // Use Set to avoid duplicates when using multiple selectors
  let jobCardsSet = new Set();
  for (const selector of jobCardSelectors) {
    const cards = document.querySelectorAll(selector);
    cards.forEach(card => jobCardsSet.add(card));
  }

  const jobCards = Array.from(jobCardsSet);

  if (jobCards.length === 0) return;

  let hiddenCount = 0;

  jobCards.forEach((jobCard) => {
    let shouldHide = false;
    const reasons = [];

    // Filter 1: Hide Staffing Firms
    if (filterSettings.hideStaffing && isStaffingFirm(jobCard)) {
      shouldHide = true;
      reasons.push('Staffing Firm');
    }

    // Filter 2: Hide Sponsored
    if (filterSettings.hideSponsored && isSponsored(jobCard)) {
      shouldHide = true;
      reasons.push('Sponsored');
    }

    // Filter 3: Applicant Count
    if (filterSettings.filterApplicants) {
      const applicantCount = getApplicantCount(jobCard);
      if (applicantCount !== null) {
        const range = filterSettings.applicantRange;
        let applicantMismatch = false;
        if (range === 'zero' && applicantCount > 0) applicantMismatch = true;
        if (range === 'under5' && applicantCount >= 5) applicantMismatch = true;
        if (range === 'under10' && applicantCount >= 10) applicantMismatch = true;
        if (range === '10-50' && (applicantCount < 10 || applicantCount > 50)) applicantMismatch = true;
        if (range === '50-200' && (applicantCount < 50 || applicantCount > 200)) applicantMismatch = true;
        if (range === 'over200' && applicantCount < 200) applicantMismatch = true;
        if (range === 'over500' && applicantCount < 500) applicantMismatch = true;
        if (applicantMismatch && !reasons.includes('Applicants')) {
          shouldHide = true;
          reasons.push(`Applicants: ${applicantCount}`);
        }
      }
    }

    // Filter 3.5: Job Posting Age
    if (filterSettings.filterPostingAge) {
      const jobAge = getJobAge(jobCard);
      if (jobAge !== null) {
        const range = filterSettings.postingAgeRange;
        let maxDays = 7;
        if (range === '12h') maxDays = 0.5;
        if (range === '24h') maxDays = 1;
        if (range === '3d') maxDays = 3;
        if (range === '1w') maxDays = 7;
        if (range === '2w') maxDays = 14;
        if (range === '1m') maxDays = 30;

        if (jobAge > maxDays) {
          shouldHide = true;
          reasons.push(`Too old: ${jobAge}d`);
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

    // Filter 5: Entry Level Accuracy
    if (filterSettings.entryLevelAccuracy) {
      const entryCheck = checkEntryLevelAccuracy(jobCard);
      if (entryCheck && entryCheck.mismatch) {
        shouldHide = true;
        reasons.push(`Entry Level mismatch`);
        // Add warning badge
        if (!jobCard.querySelector('.jobfiltr-entry-level-badge')) {
          addEntryLevelWarningBadge(jobCard, `Requires ${entryCheck.years}+ years exp`);
        }
      }
    }

    // Filter 6: Include Keywords
    if (filterSettings.filterIncludeKeywords && filterSettings.includeKeywords?.length > 0) {
      if (!matchesIncludeKeywords(jobCard, filterSettings.includeKeywords)) {
        shouldHide = true;
        reasons.push('Missing keywords');
      }
    }

    // Filter 7: Exclude Keywords
    if (filterSettings.filterExcludeKeywords && filterSettings.excludeKeywords?.length > 0) {
      if (matchesExcludeKeywords(jobCard, filterSettings.excludeKeywords)) {
        shouldHide = true;
        reasons.push('Excluded keywords');
      }
    }

    // Filter 8: Hide jobs without salary info
    if (filterSettings.hideNoSalary) {
      if (!hasSalaryInfo(jobCard)) {
        shouldHide = true;
        reasons.push('No salary info');
      }
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

      // Benefits Indicator (display only, on visible jobs)
      if (filterSettings.showBenefitsIndicator) {
        if (!jobCard.querySelector('.jobfiltr-benefits-badge')) {
          const text = getJobCardText(jobCard);
          addBenefitsBadgeToJob(jobCard, text);
        }
      }

      // Job Age Display (display only, on visible jobs)
      if (filterSettings.showJobAge) {
        if (!jobCard.querySelector('.jobfiltr-age-badge')) {
          let jobAge = getJobAge(jobCard);
          // Use cached age if getJobAge returns null but we have a cached value
          if (jobAge === null && jobCard.dataset.jobfiltrAge) {
            jobAge = parseInt(jobCard.dataset.jobfiltrAge, 10);
          }
          if (jobAge !== null) {
            addJobAgeBadge(jobCard, jobAge);
          }
        }
      }

      // Note: Applicant Count is shown in detail panel only (not on job cards)

      // Entry Level Warning Badge (display on visible jobs if mismatch detected but not hiding)
      if (filterSettings.entryLevelAccuracy) {
        const entryCheck = checkEntryLevelAccuracy(jobCard);
        if (entryCheck && entryCheck.mismatch && !jobCard.querySelector('.jobfiltr-entry-level-badge')) {
          addEntryLevelWarningBadge(jobCard, `Requires ${entryCheck.years}+ years exp`);
        }
      }
    }
  });

  // Update count if changed
  if (hiddenCount !== hiddenJobsCount) {
    hiddenJobsCount = hiddenCount;
    if (isExtensionContextValid()) {
      try {
        chrome.runtime.sendMessage({
          type: 'FILTER_STATS_UPDATE',
          hiddenCount: hiddenJobsCount,
          page: currentPage,
          site: 'linkedin'
        });
      } catch (error) {
        // Silently ignore errors in background updates
      }
    }
  }
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

// Start periodic scan if we have active filters
if (Object.keys(filterSettings).length > 0) {
  startPeriodicScan();
}

log(`LinkedIn content script ready with continuous scanning (Page ${currentPage})`);

// ===== JOBFILTR ACTIVE NOTIFICATION =====
// Shows a small notification when JobFiltr first activates on LinkedIn/Indeed

function showJobFiltrActiveNotification() {
  // Check if we've already shown the notification this session
  const notificationKey = 'jobfiltr_notification_shown';
  if (sessionStorage.getItem(notificationKey)) {
    return;
  }

  // Check extension context before attempting to send message
  if (!isExtensionContextValid()) {
    return;
  }

  // Check if popup is currently open/pinned by querying the background
  try {
    chrome.runtime.sendMessage({ type: 'CHECK_POPUP_STATE' }, (response) => {
      // Check for runtime errors
      if (chrome.runtime.lastError) {
        // Extension context invalidated or other error, skip notification
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
        padding: 14px 16px;
        background: linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%);
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3), 0 2px 8px rgba(0, 0, 0, 0.2);
        border: 1px solid rgba(255, 255, 255, 0.1);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }

      .jobfiltr-notif-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 36px;
        height: 36px;
        background: rgba(74, 222, 128, 0.2);
        border-radius: 10px;
        color: #4ade80;
        flex-shrink: 0;
      }

      .jobfiltr-notif-text {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }

      .jobfiltr-notif-title {
        font-size: 14px;
        font-weight: 600;
        color: #ffffff;
      }

      .jobfiltr-notif-subtitle {
        font-size: 12px;
        color: #94a3b8;
      }

      .jobfiltr-notif-close {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 28px;
        height: 28px;
        background: transparent;
        border: none;
        border-radius: 6px;
        color: #64748b;
        cursor: pointer;
        transition: all 0.2s ease;
        margin-left: 4px;
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
  } catch (error) {
    // Silently ignore errors when extension context is invalidated
    if (!error.message?.includes('Extension context invalidated')) {
      console.error('JobFiltr: Error showing notification:', error);
    }
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

  // Create the notification element with vertical stack layout
  const notification = document.createElement('div');
  notification.id = 'jobfiltr-signin-notification';
  notification.innerHTML = `
    <div class="jobfiltr-signin-content">
      <div class="jobfiltr-signin-glow"></div>
      <div class="jobfiltr-signin-inner">
        <button class="jobfiltr-signin-close" aria-label="Close notification">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </button>
        <div class="jobfiltr-signin-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M9 12l2 2 4-4" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
          </svg>
        </div>
        <div class="jobfiltr-signin-text">
          <span class="jobfiltr-signin-title">JobFiltr Is Active</span>
          <span class="jobfiltr-signin-subtitle">Your filters are running</span>
        </div>
      </div>
    </div>
  `;

  // Add styles for bottom-right vertical notification
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
          transform: translateY(100px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      @keyframes jobfiltr-signin-slide-out {
        from {
          opacity: 1;
          transform: translateY(0);
        }
        to {
          opacity: 0;
          transform: translateY(40px);
        }
      }

      @keyframes jobfiltr-glow-pulse {
        0%, 100% {
          opacity: 0.4;
          transform: scale(1);
        }
        50% {
          opacity: 0.6;
          transform: scale(1.03);
        }
      }

      .jobfiltr-signin-content {
        position: relative;
      }

      .jobfiltr-signin-glow {
        position: absolute;
        inset: -4px;
        background: linear-gradient(135deg, #4ade80 0%, #22c55e 50%, #16a34a 100%);
        border-radius: 16px;
        opacity: 0.4;
        filter: blur(10px);
        animation: jobfiltr-glow-pulse 2s ease-in-out infinite;
      }

      .jobfiltr-signin-inner {
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 10px;
        padding: 16px 20px;
        background: linear-gradient(145deg, #1a1a2e 0%, #16213e 50%, #0f172a 100%);
        border-radius: 14px;
        box-shadow:
          0 10px 40px rgba(0, 0, 0, 0.4),
          0 0 0 1px rgba(74, 222, 128, 0.2),
          inset 0 1px 0 rgba(255, 255, 255, 0.05);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        backdrop-filter: blur(10px);
        min-width: 140px;
      }

      .jobfiltr-signin-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 40px;
        height: 40px;
        background: linear-gradient(135deg, rgba(74, 222, 128, 0.25) 0%, rgba(34, 197, 94, 0.15) 100%);
        border-radius: 10px;
        color: #4ade80;
        flex-shrink: 0;
        border: 1px solid rgba(74, 222, 128, 0.3);
      }

      .jobfiltr-signin-text {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 2px;
        text-align: center;
      }

      .jobfiltr-signin-title {
        font-size: 13px;
        font-weight: 600;
        color: #ffffff;
        letter-spacing: -0.01em;
      }

      .jobfiltr-signin-subtitle {
        font-size: 11px;
        color: #94a3b8;
        letter-spacing: -0.01em;
      }

      .jobfiltr-signin-close {
        position: absolute;
        top: 8px;
        right: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 20px;
        height: 20px;
        background: rgba(255, 255, 255, 0.05);
        border: none;
        border-radius: 4px;
        color: #64748b;
        cursor: pointer;
        transition: all 0.2s ease;
        padding: 0;
      }

      .jobfiltr-signin-close:hover {
        background: rgba(255, 255, 255, 0.15);
        color: #ffffff;
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
  // Check if extension context is valid before attempting to use Chrome APIs
  if (!isExtensionContextValid()) {
    return false;
  }

  try {
    const result = await chrome.storage.local.get(['authToken', 'authExpiry']);
    if (result.authToken && result.authExpiry && Date.now() < result.authExpiry) {
      return true;
    }
    return false;
  } catch (error) {
    // Only log error if it's not a context invalidation error
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

// Show notification after a short delay to ensure page is loaded (only if signed in)
setTimeout(async () => {
  await showNotificationIfSignedIn();
}, 1500);
