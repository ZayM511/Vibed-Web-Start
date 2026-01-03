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

    if (!url.includes('/viewjob') && !url.includes('/rc/clk') && !url.includes('/pagead/')) {
      log('Not on a job posting page');
      return null;
    }

    const titleSelectors = [
      'h2.jobTitle > span',
      'h2.jobTitle span',
      'h1.jobsearch-JobInfoHeader-title span',
      'h1.jobsearch-JobInfoHeader-title',
      '[data-testid="jobsearch-JobInfoHeader-title"] span',
      '[data-testid="jobsearch-JobInfoHeader-title"]',
      'h1.jobTitle span',
      'h1.jobTitle',
      'h2.jobTitle',
      'h1[class*="jobTitle"]',
      'h2[class*="jobTitle"]'
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
      '[data-testid="inlineHeader-companyName"]',
      '[data-company-name="true"]',
      '.jobsearch-InlineCompanyRating-companyHeader a',
      '.jobsearch-CompanyInfoContainer a',
      '[data-testid="company-name"]'
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

    const descriptionSelectors = [
      '#jobDescriptionText',
      '.jobsearch-jobDescriptionText',
      '[data-testid="jobDescriptionText"]',
      '#job-description'
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

    const jobInfo = { url, title, company, description, platform: 'indeed' };
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

// ===== SPONSORED POST DETECTION =====
function isSponsored(jobCard) {
  try {
    const sponsoredIndicators = [
      jobCard.hasAttribute('data-is-sponsored'),
      jobCard.querySelector('[data-testid="sponsored-label"]'),
      jobCard.querySelector('.sponsoredJob'),
      jobCard.querySelector('.sponsoredGray'),
      jobCard.classList.contains('sponsoredJob')
    ];
    return sponsoredIndicators.some(indicator => indicator);
  } catch (error) {
    return false;
  }
}

// ===== APPLICANT COUNT EXTRACTION =====
function getApplicantCount(jobCard) {
  try {
    const applicantSelectors = [
      '[data-testid="applicant-count"]',
      '.jobCardShelfContainer',
      '.job-snippet'
    ];

    for (const selector of applicantSelectors) {
      const elem = jobCard.querySelector(selector);
      if (elem) {
        const text = elem.textContent.trim().toLowerCase();
        if (text.includes('be among the first') || text.includes('be one of the first')) {
          return 5;
        }
        const match = text.match(/(\d+)\+?\s*applicants?/i);
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

  const categoryLabels = { health: 'Health', retirement: '401k', pto: 'PTO', equity: 'Equity', other: '+More' };
  const categoryColors = { health: '#ef4444', retirement: '#22c55e', pto: '#3b82f6', equity: '#a855f7', other: '#6b7280' };

  badge.style.cssText = `
    position: absolute;
    bottom: 8px;
    right: 8px;
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
    max-width: 200px;
    z-index: 1000;
  `;

  detectedCategories.slice(0, 4).forEach(category => {
    const tag = document.createElement('span');
    tag.textContent = categoryLabels[category];
    tag.style.cssText = `
      display: inline-block;
      padding: 2px 6px;
      font-size: 9px;
      font-weight: 600;
      border-radius: 9999px;
      background: ${categoryColors[category]}20;
      color: ${categoryColors[category]};
      border: 1px solid ${categoryColors[category]}40;
    `;
    badge.appendChild(tag);
  });

  return badge;
}

function addBenefitsBadgeToJob(jobCard, text) {
  const existingBadge = jobCard.querySelector('.jobfiltr-benefits-badge');
  if (existingBadge) existingBadge.remove();

  // Get job description from the detail panel if available
  let fullText = text;

  // Try to get the full job description from the detail panel
  const descriptionSelectors = [
    '#jobDescriptionText',
    '.jobsearch-jobDescriptionText',
    '[data-testid="jobDescriptionText"]',
    '#job-description',
    '.jobsearch-ViewJobLayout'
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

// Enhanced function to scan jobs for benefits from description panel
function updateBenefitsFromDetailPanel() {
  if (!filterSettings.showBenefitsIndicator) return;

  // Get the job description from the detail panel
  const descriptionSelectors = [
    '#jobDescriptionText',
    '.jobsearch-jobDescriptionText',
    '[data-testid="jobDescriptionText"]',
    '#job-description'
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

  // Find the currently selected/clicked job card
  const selectedSelectors = [
    '.jobsearch-ResultsList li.clicked',
    '.job_seen_beacon.clicked',
    '[data-testid="job-result"].clicked',
    'li[data-jk].clicked'
  ];

  // Try to find which job corresponds to the description
  // On Indeed, the job cards may not have an "active" state, so update all visible cards
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

  // Update each visible job card that doesn't already have benefits detected
  jobCards.forEach((jobCard) => {
    const existingBadge = jobCard.querySelector('.jobfiltr-benefits-badge');
    if (!existingBadge && jobCard.style.display !== 'none') {
      const cardText = getJobCardText(jobCard);
      const fullText = cardText + ' ' + descriptionText;
      const benefits = detectBenefits(fullText);
      const badge = createBenefitsBadge(benefits);

      if (badge) {
        if (window.getComputedStyle(jobCard).position === 'static') {
          jobCard.style.position = 'relative';
        }
        jobCard.appendChild(badge);
      }
    }
  });
}

// ===== JOB AGE DETECTION =====
function getJobAge(jobCard) {
  try {
    // Try multiple selectors for time/date elements
    const timeSelectors = [
      '.date',
      '[data-testid="job-age"]',
      '.jobsearch-HiringInsights-entry--age',
      '.jobCardShelfContainer .date',
      'span.date'
    ];

    for (const selector of timeSelectors) {
      const timeElem = jobCard.querySelector(selector);
      if (!timeElem) continue;

      const text = timeElem.textContent.trim().toLowerCase();

      // Match patterns
      if (text.includes('just posted') || text.includes('today')) return 0;
      if (text.includes('hour') || text.includes('minute')) return 0;

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

      // Check for "30+ days ago" pattern
      if (text.includes('30+')) return 30;
    }

    // Also check the full job card text for time references
    const fullText = jobCard.textContent.toLowerCase();
    const timePatterns = [
      { pattern: /just\s+posted/i, days: 0 },
      { pattern: /today/i, days: 0 },
      { pattern: /(\d+)\s*(?:hours?|hr)\s*ago/i, multiplier: 0 },
      { pattern: /(\d+)\s*(?:days?|d)\s*ago/i, multiplier: 1 },
      { pattern: /(\d+)\s*(?:weeks?|wk)\s*ago/i, multiplier: 7 },
      { pattern: /(\d+)\s*(?:months?|mo)\s*ago/i, multiplier: 30 },
      { pattern: /30\+\s*days?\s*ago/i, days: 30 }
    ];

    for (const { pattern, multiplier, days } of timePatterns) {
      const match = fullText.match(pattern);
      if (match) {
        if (days !== undefined) return days;
        return parseInt(match[1] || 1) * (multiplier || 1);
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

    // Remove existing badges first
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
        if (range === 'under10' && applicantCount >= 10) shouldHide = true;
        if (range === '10-50' && (applicantCount < 10 || applicantCount > 50)) shouldHide = true;
        if (range === '50-200' && (applicantCount < 50 || applicantCount > 200)) shouldHide = true;
        if (range === 'over200' && applicantCount < 200) shouldHide = true;
        if (range === 'over500' && applicantCount < 500) shouldHide = true;
        if (shouldHide) reasons.push(`Applicants: ${applicantCount}`);
      }
    }

    // Filter 4: True Remote Accuracy
    if (settings.trueRemoteAccuracy) {
      if (detectNonRemoteIndicators(jobCard, settings)) {
        shouldHide = true;
        reasons.push('Non-remote indicators detected');
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

    // Benefits Indicator (display only, doesn't hide)
    if (settings.showBenefitsIndicator && !shouldHide) {
      const text = getJobCardText(jobCard);
      addBenefitsBadgeToJob(jobCard, text);
    }

    // Job Age Display (display only, doesn't hide)
    if (settings.showJobAge && !shouldHide) {
      const jobAge = getJobAge(jobCard);
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
      log(`Hidden job card: ${reasons.join(', ')}`);
    } else {
      jobCard.style.display = '';
      delete jobCard.dataset.jobfiltrHidden;
    }
  });

  try {
    chrome.runtime.sendMessage({
      type: 'FILTER_STATS_UPDATE',
      hiddenCount: hiddenJobsCount
    });
  } catch (error) {
    log('Failed to send stats update:', error);
  }

  log(`Filtered ${hiddenJobsCount} jobs out of ${jobCards.length}`);

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
    const badges = jobCard.querySelectorAll('.jobfiltr-badge, .jobfiltr-benefits-badge, .jobfiltr-age-badge');
    badges.forEach(badge => badge.remove());
  });

  hiddenJobsCount = 0;

  try {
    chrome.runtime.sendMessage({ type: 'FILTER_STATS_UPDATE', hiddenCount: 0 });
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

  if (message.type === 'ANALYZE_GHOST_JOB') {
    // Perform ghost job analysis using the job data
    const result = performGhostAnalysis(message.jobData);
    sendResponse({ success: true, data: result });
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
  const timeSelectors = ['.date', '[data-testid="job-age"]'];
  for (const selector of timeSelectors) {
    const timeElem = document.querySelector(selector);
    if (timeElem) {
      const text = timeElem.textContent.trim().toLowerCase();
      if (text.includes('30+') || (text.includes('month') && parseInt(text) >= 1)) {
        redFlags.push('Job has been posted for over 30 days');
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

// ===== MUTATION OBSERVER FOR DYNAMIC CONTENT =====
let observerTimeout;
const observer = new MutationObserver((mutations) => {
  if (Object.keys(filterSettings).length > 0) {
    clearTimeout(observerTimeout);
    observerTimeout = setTimeout(() => {
      log('Re-applying filters due to DOM changes');
      applyFilters(filterSettings);
    }, 500);
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

  // Also update benefits from detail panel for selected job
  if (filterSettings.showBenefitsIndicator) {
    updateBenefitsFromDetailPanel();
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
        if (range === 'under10' && applicantCount >= 10) shouldHide = true;
        if (range === '10-50' && (applicantCount < 10 || applicantCount > 50)) shouldHide = true;
        if (range === '50-200' && (applicantCount < 50 || applicantCount > 200)) shouldHide = true;
        if (range === 'over200' && applicantCount < 200) shouldHide = true;
        if (range === 'over500' && applicantCount < 500) shouldHide = true;
        if (shouldHide && !reasons.includes('Applicants')) reasons.push(`Applicants: ${applicantCount}`);
      }
    }

    // Filter 4: True Remote Accuracy
    if (filterSettings.trueRemoteAccuracy) {
      if (detectNonRemoteIndicators(jobCard, filterSettings)) {
        shouldHide = true;
        reasons.push('Non-remote');
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
          const jobAge = getJobAge(jobCard);
          if (jobAge !== null) {
            addJobAgeBadge(jobCard, jobAge);
          }
        }
      }
    }
  });

  // Update count if changed
  if (hiddenCount !== hiddenJobsCount) {
    hiddenJobsCount = hiddenCount;
    try {
      chrome.runtime.sendMessage({
        type: 'FILTER_STATS_UPDATE',
        hiddenCount: hiddenJobsCount,
        site: 'indeed'
      });
    } catch (error) {}
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

// ===== AUTO-LOAD SAVED FILTERS ON PAGE LOAD =====
async function loadAndApplyFilters() {
  try {
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
    log('Error loading saved filters:', error);
  }
}

// Load saved filters when script initializes
loadAndApplyFilters();

// Start periodic scan if we have active filters
if (Object.keys(filterSettings).length > 0) {
  startPeriodicScan();
}

// ===== JOB CARD CLICK LISTENER FOR BENEFITS =====
// When a user clicks on a job card, update benefits badge from the detail panel
document.addEventListener('click', (e) => {
  const jobCard = e.target.closest('.jobsearch-ResultsList li, .job_seen_beacon, [data-testid="job-result"], li[data-jk]');
  if (jobCard && filterSettings.showBenefitsIndicator) {
    // Wait for the job description panel to load
    setTimeout(() => {
      updateBenefitsFromDetailPanel();
    }, 500);
  }
}, true);

log('Indeed content script ready');
