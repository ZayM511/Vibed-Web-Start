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

// ===== SALARY DETECTION =====
function hasSalaryInfo(jobCard) {
  try {
    // Get all text from the job card
    const cardText = getJobCardText(jobCard);

    // Salary-specific selectors on Indeed job cards
    const salarySelectors = [
      '.salary-snippet-container',
      '.salaryOnly',
      '[data-testid="attribute_snippet_testid"]',
      '.metadata.salary-snippet-container',
      '.underShelfFooter .salary-snippet-container',
      '.estimated-salary',
      '.attribute_snippet'
    ];

    // Check for salary elements
    for (const selector of salarySelectors) {
      const elem = jobCard.querySelector(selector);
      if (elem) {
        const text = elem.textContent.toLowerCase();
        // Check if it contains salary-related content
        if (/\$[\d,]+|\d+k|\bsalary\b|\bpay\b|\bcompensation\b|\/yr|\/hr|per hour|per year|annually|a year|an hour/i.test(text)) {
          return true;
        }
      }
    }

    // Check the full card text for salary patterns
    // Matches: $50,000, $100K, $50-60/hr, $80,000-$100,000/yr, etc.
    const salaryPatterns = [
      /\$[\d,]+(?:\s*[-–]\s*\$?[\d,]+)?(?:\s*\/?\s*(?:yr|year|hr|hour|annually|hourly|month|mo|a year|an hour))?/i,
      /\$\d+k\s*[-–]?\s*\$?\d*k?/i,
      /(?:salary|pay|compensation)\s*[:.]?\s*\$[\d,]+/i,
      /\bfrom\s+\$[\d,]+/i,
      /\bup\s+to\s+\$[\d,]+/i
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

  // Create the badge
  const badge = document.createElement('div');
  badge.className = 'jobfiltr-detail-age-badge';
  badge.innerHTML = `
    <div style="display: flex; align-items: center; gap: 8px;">
      <span style="font-size: 18px;">${icon}</span>
      <div>
        <div style="font-weight: 700; font-size: 14px;">Posted ${ageText}${jobAge > 30 ? ' ago' : ''}</div>
        <div style="font-size: 11px; opacity: 0.8;">${jobAge <= 3 ? 'Fresh posting!' : jobAge <= 7 ? 'Recent posting' : jobAge <= 14 ? 'Moderately recent' : jobAge <= 30 ? 'Getting older' : 'May be stale'}</div>
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
    max-width: fit-content;
  `;

  // Find the best place to insert in the detail panel
  const insertTargets = [
    '.jobsearch-JobInfoHeader-title-container',
    '.jobsearch-InlineCompanyRating',
    '.jobsearch-JobInfoHeader',
    'h1.jobsearch-JobInfoHeader-title',
    '.jobsearch-CompanyInfoContainer',
    '.jobsearch-ViewJobLayout-jobDisplay',
    '.jobsearch-JobComponent-description',
    '#jobDescriptionText'
  ];

  for (const selector of insertTargets) {
    const target = document.querySelector(selector);
    if (target) {
      // Insert after the target element
      target.insertAdjacentElement('afterend', badge);
      log('Added job age badge to Indeed detail panel');
      return;
    }
  }

  log('Could not find suitable location for job age badge in detail panel');
}

// ===== JOB AGE DETECTION =====

// Cache for job ages extracted from page JSON data
let jobAgeCache = {};
let lastJobAgeCacheUpdate = 0;
let mosaicDataRequested = false;

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
        if (job.pubDate && job.pubDate > 0) {
          const pubDateMs = typeof job.pubDate === 'number' ? job.pubDate : parseInt(job.pubDate);
          if (!isNaN(pubDateMs) && pubDateMs > 0) {
            ageDays = Math.floor((now - pubDateMs) / (1000 * 60 * 60 * 24));
            if (ageDays < 0) ageDays = 0;
          }
        }

        // PRIORITY 2: Calculate from createDate Unix timestamp
        if (ageDays === null && job.createDate && job.createDate > 0) {
          const createDateMs = typeof job.createDate === 'number' ? job.createDate : parseInt(job.createDate);
          if (!isNaN(createDateMs) && createDateMs > 0) {
            ageDays = Math.floor((now - createDateMs) / (1000 * 60 * 60 * 24));
            if (ageDays < 0) ageDays = 0;
          }
        }

        // PRIORITY 3: Fallback to formattedRelativeTime
        if (ageDays === null && job.formattedRelativeTime) {
          const relTime = job.formattedRelativeTime.toString().trim().toLowerCase();

          if (relTime.includes('just posted') || relTime.includes('today') || relTime === 'just now') {
            ageDays = 0;
          } else if (relTime.includes('30+') || relTime.includes('30 +')) {
            ageDays = 30;
          } else if (relTime.includes('hour') || relTime.includes('minute')) {
            ageDays = 0;
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
      });

      log(`Received job ages for ${Object.keys(jobAgeCache).length} jobs from page context`);
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
              // Send only the data we need (jobkey, pubDate, createDate, formattedRelativeTime)
              const jobData = jobs.map(job => ({
                jobkey: job.jobkey,
                pubDate: job.pubDate,
                createDate: job.createDate,
                formattedRelativeTime: job.formattedRelativeTime
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

          // Try pubDate first (most accurate)
          const pubDateMatch = searchWindow.match(/"pubDate"\s*:\s*(\d+)/);
          if (pubDateMatch) {
            const pubDate = parseInt(pubDateMatch[1]);
            if (pubDate > 1000000000000) { // Looks like milliseconds timestamp
              ageDays = Math.floor((now - pubDate) / (1000 * 60 * 60 * 24));
              if (ageDays < 0) ageDays = 0;
            }
          }

          // Try createDate if pubDate not found
          if (ageDays === null) {
            const createDateMatch = searchWindow.match(/"createDate"\s*:\s*(\d+)/);
            if (createDateMatch) {
              const createDate = parseInt(createDateMatch[1]);
              if (createDate > 1000000000000) {
                ageDays = Math.floor((now - createDate) / (1000 * 60 * 60 * 24));
                if (ageDays < 0) ageDays = 0;
              }
            }
          }

          // Fallback to formattedRelativeTime
          if (ageDays === null) {
            const relTimeMatch = searchWindow.match(/"formattedRelativeTime"\s*:\s*"([^"]+)"/);
            if (relTimeMatch) {
              const relTime = relTimeMatch[1].toLowerCase();
              if (relTime.includes('just') || relTime.includes('today') || relTime.includes('hour') || relTime.includes('minute')) {
                ageDays = 0;
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
        if (text.includes('hour') || text.includes('minute')) return 0;

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
    const fullText = jobCard.textContent.toLowerCase();
    const timePatterns = [
      { pattern: /just\s+posted/i, days: 0 },
      { pattern: /just\s+now/i, days: 0 },
      { pattern: /today/i, days: 0 },
      { pattern: /(\d+)\s*(?:hours?|hr|h)\s*ago/i, multiplier: 0 },
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

// Format job age for display
// For jobs 30+ days old, show "30+ days" with estimated exact age
function formatJobAge(days) {
  if (days === 0) return 'Today';
  if (days === 1) return '1 day';
  if (days <= 30) return `${days} days`;

  // For jobs over 30 days, show "30+ days" with estimate
  // Format the estimate based on how old it is
  if (days <= 60) {
    return `30+ days (~${days}d)`;
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

    // Filter 7: Hide jobs without salary info (only if salary filter is active)
    if (settings.filterSalary && settings.hideNoSalary) {
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
        // Cache the job age for future reference
        jobCard.dataset.jobfiltrAge = jobAge.toString();
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
    // Silently ignore extension context invalidated errors
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

  // Also remove detail panel job age badge
  const detailAgeBadge = document.querySelector('.jobfiltr-detail-age-badge');
  if (detailAgeBadge) detailAgeBadge.remove();

  hiddenJobsCount = 0;

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

  // Update job age badge in detail panel for selected job
  if (filterSettings.showJobAge) {
    addJobAgeToDetailPanel();
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

    // Filter 7: Hide jobs without salary info (only if salary filter is active)
    if (filterSettings.filterSalary && filterSettings.hideNoSalary) {
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
            // Cache the job age for future reference
            jobCard.dataset.jobfiltrAge = jobAge.toString();
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

// ===== JOB CARD CLICK LISTENER FOR BENEFITS AND JOB AGE =====
// When a user clicks on a job card, update badges from the detail panel
document.addEventListener('click', (e) => {
  const jobCard = e.target.closest('.jobsearch-ResultsList li, .job_seen_beacon, [data-testid="job-result"], li[data-jk]');
  if (jobCard) {
    // Wait for the job description panel to load
    setTimeout(() => {
      // Update benefits badge from detail panel
      if (filterSettings.showBenefitsIndicator) {
        updateBenefitsFromDetailPanel();
      }
      // Update job age badge in detail panel
      if (filterSettings.showJobAge) {
        addJobAgeToDetailPanel();
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
