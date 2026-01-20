/**
 * Ghost Detection Bundle
 * Self-contained ghost job detection for Chrome extension content scripts
 * This is a bundled version that doesn't require ES module imports
 */

(function () {
  'use strict';

  // ============================================
  // CONSTANTS
  // ============================================

  const SIGNAL_WEIGHTS = {
    temporal: {
      categoryWeight: 40, // INCREASED: Posting age is the strongest ghost indicator
      signals: { postingAge: 45, seasonalPattern: 10 },
    },
    content: {
      categoryWeight: 20,
      signals: { descriptionVagueness: 25, salaryTransparency: 20, buzzwordDensity: 15 },
    },
    company: {
      categoryWeight: 20,
      signals: { blacklistMatch: 40, companySize: 20, industryRisk: 20 },
    },
    behavioral: {
      categoryWeight: 15,
      signals: { applicationMethod: 30, sponsoredPost: 20, applicantCount: 30 },
    },
    community: { categoryWeight: 5, signals: { userReports: 50 } },
    structural: { categoryWeight: 0, signals: {} }, // Reduced - less important
  };

  const SCORE_COLORS = {
    safe: '#10b981',
    low_risk: '#3b82f6',
    medium_risk: '#f59e0b',
    high_risk: '#ef4444',
    likely_ghost: '#dc2626',
  };

  const SCORE_LABELS = {
    safe: 'Likely Legitimate',
    low_risk: 'Low Risk',
    medium_risk: 'Medium Risk',
    high_risk: 'High Risk',
    likely_ghost: 'Likely Ghost Job',
  };

  const KNOWN_STAFFING_AGENCIES = [
    'robert half', 'randstad', 'kelly services', 'manpower', 'adecco',
    'aerotek', 'insight global', 'teksystems', 'apex systems', 'kforce',
    'cybercoders', 'jobot', 'motion recruitment', 'vaco', 'addison group',
    'hays', 'allegis group', 'spherion', 'volt', 'beacon hill',
  ];

  // Vague language indicators with weights (higher = stronger ghost signal)
  // Based on 2025 research from Interview Guys, Work Shift Guide, and FTC guidance
  const VAGUE_INDICATORS = {
    // High-weight indicators (strong ghost signals)
    high: [
      'always looking for talented',  // Generic evergreen language
      'perfect candidate',            // Impossible standards
      'endless possibilities',        // Vague growth promises
      'unlimited earning potential',  // Often scam-adjacent
      'immediate need',               // Urgency without specifics
      'work hard play hard',          // Culture buzzword masking issues
    ],
    // Medium-weight indicators (moderate ghost signals)
    medium: [
      'rock star', 'ninja', 'guru', 'wizard', 'unicorn',  // Tech buzzwords
      'growing team',                 // Often masks turnover
      'wear many hats',               // Role not defined
      'other duties as assigned',     // Catch-all responsibilities
      'competitive salary',           // No actual salary disclosed
      'exciting opportunity',         // Generic enthusiasm
      'make an impact',               // Vague contribution
      'hit the ground running',       // No training/support
    ],
    // Low-weight indicators (weak signals, common in legitimate posts too)
    low: [
      'fast-paced',                   // Common but legitimate
      'self-starter',                 // Standard HR language
      'team player',                  // Very common
      'dynamic',                      // Overused but not red flag
      'motivated individual',         // Generic
      'passionate',                   // Overused
      'results-driven',               // Business speak
    ],
  };

  const STORAGE_KEY = 'jobfiltr_ghost_detection';
  const CACHE_KEY = `${STORAGE_KEY}_scores`;
  const CONFIG_KEY = `${STORAGE_KEY}_config`;
  const BLACKLIST_KEY = `${STORAGE_KEY}_blacklist`;

  // ============================================
  // LINKEDIN SELECTORS
  // ============================================

  const LINKEDIN_SELECTORS = {
    jobDetail: '.job-view-layout, .jobs-details, .jobs-unified-top-card, .jobs-search__job-details, .scaffold-layout__detail, .jobs-details__main-content',
    title: '.job-details-jobs-unified-top-card__job-title, .jobs-unified-top-card__job-title, .t-24.t-bold, .job-details-jobs-unified-top-card__job-title-link, h1.t-24, .jobs-details-top-card__job-title',
    company: '.job-details-jobs-unified-top-card__company-name, .jobs-unified-top-card__company-name a, .job-details-jobs-unified-top-card__primary-description-container a, .jobs-details-top-card__company-url',
    location: '.job-details-jobs-unified-top-card__bullet, .jobs-unified-top-card__bullet, .job-details-jobs-unified-top-card__primary-description-container .t-black--light',
    posted: '.job-details-jobs-unified-top-card__posted-date, .jobs-unified-top-card__posted-date, .jobs-details-top-card__bullet',
    applicants: '.jobs-unified-top-card__applicant-count, .jobs-details-top-card__bullet, .job-details-jobs-unified-top-card__bullet',
    description: '.jobs-description__content, .jobs-description-content__text, .jobs-box__html-content, .jobs-description',
    easyApply: '.jobs-apply-button--top-card, .jobs-apply-button, .jobs-s-apply button',
    promoted: '.job-card-container__footer-job-state, .promoted-badge',
    // Multiple fallback targets for score injection (updated for 2025/2026 LinkedIn layout)
    scoreTargets: [
      // Primary targets - most reliable in 2026 LinkedIn layout
      '.jobs-details',
      '.job-view-layout',
      '.scaffold-layout__detail',

      // Modern LinkedIn selectors (2025+)
      '.jobs-details__main-content .jobs-details-top-card__container',
      '.jobs-search__job-details .jobs-details-top-card',
      '.scaffold-layout__detail .jobs-unified-top-card',
      '.jobs-details .artdeco-card',
      '.job-details-jobs-unified-top-card',
      '.jobs-details-top-card__container',
      '.jobs-search__right-rail .jobs-details-top-card',
      '.jobs-unified-top-card__top-card',
      '.job-details-module',

      // Legacy selectors (keep for compatibility)
      '.job-details-jobs-unified-top-card__primary-description-container',
      '.job-details-jobs-unified-top-card__primary-description',
      '.jobs-unified-top-card__primary-description',
      '.jobs-details-top-card__content-container',
      '.jobs-unified-top-card__content--two-pane',
      '.jobs-details__main-content header',
      '.jobs-search__job-details--container header',
      '.scaffold-layout__detail-item header',
      '.job-view-layout header',
      '.jobs-unified-top-card',
      '.jobs-details-top-card',

      // Absolute fallbacks (very broad)
      '.jobs-search__job-details',
      '.jobs-details__main-content',
      '[data-job-id]',
    ],
  };

  // ============================================
  // INDEED SELECTORS
  // ============================================

  // Indeed selectors (updated 2025 based on Oxylabs & ScrapingBee research)
  const INDEED_SELECTORS = {
    // Job detail container - multiple fallbacks for different page layouts
    jobDetail: '.jobsearch-ViewJobLayout, .jobsearch-JobComponent, #jobDescriptionText, .job_seen_beacon',
    // Title selectors with 2025 fallbacks
    title: '.jobsearch-JobInfoHeader-title, [data-testid="jobsearch-JobInfoHeader-title"], h2.jobTitle span, h2.jobTitle > span[title]',
    // Company selectors with additional fallbacks
    company: '[data-testid="inlineHeader-companyName"], .jobsearch-InlineCompanyRating-companyHeader, span.companyName, [data-testid="company-name"]',
    // Location selectors
    location: '[data-testid="job-location"], .jobsearch-JobInfoHeader-subtitle, div.companyLocation, [data-testid="text-location"]',
    // Posted date selectors with additional fallbacks for date extraction
    posted: '.jobsearch-HiringInsights-entry--age, [data-testid="job-age"], .date, [data-testid="myJobsStateDate"]',
    // Description selectors
    description: '#jobDescriptionText, .jobsearch-jobDescriptionText, .jobDescriptionText',
    // Salary selectors with 2025 fallbacks
    salary: '#salaryInfoAndJobType, .salary-snippet-container, div.salary-snippet, [data-testid="salary-snippet"], .attribute_snippet',
    // Apply button selectors
    applyButton: '.jobsearch-IndeedApplyButton, #indeedApplyButton, .ia-IndeedApplyButton',
    // ULTRATHINK: Enhanced sponsored selectors for maximum detection accuracy
    sponsored: '.sponsoredJob, .sponsoredGray, .jobsearch-JobCard-Sponsored, .job-result-sponsored, [data-is-sponsored], [data-is-sponsored="true"], [data-testid="sponsored-label"], [data-sponsored="true"]',
    // Job card selectors (for list view detection)
    jobCard: '.job_seen_beacon, .jobsearch-ResultsList > li, [data-testid="job-result"], .tapItem',
    // Multiple fallback targets for score injection (updated 2025)
    scoreTargets: [
      // Primary targets
      '.jobsearch-JobInfoHeader-subtitle',
      '[data-testid="jobsearch-JobInfoHeader-subtitle"]',
      '.jobsearch-JobInfoHeader-title',
      // Secondary targets
      '.jobsearch-ViewJobLayout header',
      '.jobsearch-JobComponent header',
      '.jobsearch-InlineCompanyRating',
      // 2025 additional targets
      '.jobsearch-CompanyInfoContainer',
      '.jobsearch-JobMetadataHeader',
      '[data-testid="job-header"]',
      // Fallback
      '#jobDescriptionText',
      '.job_seen_beacon',
    ],
  };

  // ============================================
  // COMMUNITY-REPORTED COMPANIES LIST (Jan 2026)
  // 100+ companies reported for spam/ghost jobs
  // ============================================

  /**
   * Normalize company name for matching
   * Mirrors the logic from lib/utils.ts normalizeCompanyName()
   */
  function normalizeCompanyNameForMatch(name) {
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
  const REPORTED_COMPANIES = [
    // A
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

    // B
    { name: 'Balfour Beatty', normalized: 'balfour beatty', aliases: ['balfour beaty'], category: 'ghost' },
    { name: 'Bank of America', normalized: 'bank of america', aliases: ['bofa', 'bankofamerica'], category: 'ghost' },
    { name: 'Beyond Trust', normalized: 'beyond trust', aliases: ['beyondtrust'], category: 'ghost' },
    { name: 'Biorender', normalized: 'biorender', category: 'ghost' },
    { name: 'Bobsled', normalized: 'bobsled', category: 'ghost' },
    { name: 'Booksource', normalized: 'booksource', category: 'ghost' },
    { name: 'Boston Scientific', normalized: 'boston scientific', category: 'ghost' },
    { name: 'Burt Intelligence', normalized: 'burt intelligence', category: 'ghost' },
    { name: 'Business Wire', normalized: 'business wire', category: 'ghost' },

    // C
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

    // D
    { name: 'DCBL', normalized: 'dcbl', category: 'ghost' },
    { name: 'Dice', normalized: 'dice', aliases: ['dicecom'], category: 'spam' },
    { name: 'DoorDash', normalized: 'doordash', category: 'ghost' },

    // E
    { name: 'Earnin', normalized: 'earnin', category: 'ghost' },
    { name: 'Embraer', normalized: 'embraer', category: 'ghost' },
    { name: 'Evidation', normalized: 'evidation', category: 'ghost' },
    { name: 'Excellence Services LLC', normalized: 'excellence services', category: 'ghost' },
    { name: 'EY', normalized: 'ey', aliases: ['ernst young', 'ernst  young'], category: 'ghost' },

    // F
    { name: 'Fanatics', normalized: 'fanatics', category: 'ghost' },
    { name: 'Files.com', normalized: 'filescom', aliases: ['filescom'], category: 'ghost' },
    { name: 'FiServe', normalized: 'fiserve', aliases: ['fiserv'], category: 'ghost' },
    { name: 'FloQast', normalized: 'floqast', category: 'ghost' },
    { name: 'Fluency', normalized: 'fluency', category: 'ghost' },
    { name: 'FluentStream', normalized: 'fluentstream', category: 'ghost' },

    // G
    { name: 'GE Healthcare', normalized: 'ge healthcare', aliases: ['ge health', 'general electric healthcare'], category: 'ghost' },
    { name: 'Genworth', normalized: 'genworth', category: 'ghost' },
    { name: 'Golden Hippo', normalized: 'golden hippo', category: 'ghost' },
    { name: 'GoodRX', normalized: 'goodrx', aliases: ['goodrx'], category: 'ghost' },
    { name: 'Greendot', normalized: 'greendot', aliases: ['green dot'], category: 'ghost' },

    // H
    { name: 'Harbor Freight Tools', normalized: 'harbor freight tools', aliases: ['harbor freight'], category: 'ghost' },
    { name: 'Health Edge', normalized: 'health edge', aliases: ['healthedge'], category: 'ghost' },
    { name: 'HireMeFast LLC', normalized: 'hiremefast', category: 'scam' },
    { name: 'HubSpot', normalized: 'hubspot', category: 'ghost' },

    // J-K
    { name: 'JP Morgan Chase', normalized: 'jp morgan chase', aliases: ['jpmorgan', 'jp morgan', 'chase', 'jpmorganchase'], category: 'ghost' },
    { name: 'Kforce', normalized: 'kforce', category: 'ghost' },
    { name: "King's Hawaiian", normalized: 'kings hawaiian', aliases: ['kings hawaiian'], category: 'ghost' },
    { name: 'Klaviyo', normalized: 'klaviyo', category: 'ghost' },
    { name: 'Kraft & Kennedy', normalized: 'kraft  kennedy', aliases: ['kraft kennedy'], category: 'ghost' },

    // L
    { name: 'Leidos', normalized: 'leidos', category: 'ghost' },
    { name: 'Lumenalta', normalized: 'lumenalta', category: 'ghost' },

    // M
    { name: 'Magistrate', normalized: 'magistrate', category: 'ghost' },
    { name: 'Mandai', normalized: 'mandai', category: 'ghost' },
    { name: 'Matterport', normalized: 'matterport', category: 'ghost' },
    { name: 'Medix', normalized: 'medix', category: 'ghost' },
    { name: 'Molina Health', normalized: 'molina health', aliases: ['molina healthcare'], category: 'ghost' },
    { name: 'Motion Recruitment', normalized: 'motion recruitment', category: 'ghost' },
    { name: 'Mozilla', normalized: 'mozilla', category: 'ghost' },

    // N
    { name: 'NBC News', normalized: 'nbc news', category: 'ghost' },
    { name: 'NBC Universal', normalized: 'nbc universal', aliases: ['nbcuniversal'], category: 'ghost' },
    { name: 'NV5', normalized: 'nv5', category: 'ghost' },

    // O
    { name: 'Oneforma', normalized: 'oneforma', category: 'ghost' },
    { name: 'OneTrust', normalized: 'onetrust', category: 'ghost' },
    { name: 'Origin', normalized: 'origin', category: 'ghost' },
    { name: 'Oscar Health', normalized: 'oscar health', category: 'ghost' },

    // P
    { name: 'Paradox.ai', normalized: 'paradoxai', aliases: ['paradox ai', 'paradoxai'], category: 'ghost' },
    { name: 'Polly', normalized: 'polly', category: 'ghost' },
    { name: 'Posit', normalized: 'posit', category: 'ghost' },
    { name: 'Prize Picks', normalized: 'prize picks', aliases: ['prizepicks'], category: 'ghost' },
    { name: 'Publicis Health', normalized: 'publicis health', category: 'ghost' },

    // R
    { name: 'Raptive', normalized: 'raptive', category: 'ghost' },
    { name: 'Resmed', normalized: 'resmed', aliases: ['res med'], category: 'ghost' },
    { name: 'Robert Half', normalized: 'robert half', category: 'ghost' },

    // S
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

    // T
    { name: 'Tabby', normalized: 'tabby', category: 'ghost' },
    { name: 'Talentify.io', normalized: 'talentifyio', aliases: ['talentify'], category: 'spam' },
    { name: 'Techie Talent', normalized: 'techie talent', category: 'scam' },
    { name: 'TekSystems', normalized: 'teksystems', aliases: ['tek systems'], category: 'ghost' },
    { name: 'Terrabis', normalized: 'terrabis', category: 'ghost' },
    { name: 'Thermo Fisher', normalized: 'thermo fisher', aliases: ['thermo fisher scientific', 'thermofisher'], category: 'ghost' },
    { name: 'Tickets.Com', normalized: 'ticketscom', aliases: ['ticketscom', 'tickets com'], category: 'ghost' },
    { name: 'Tixr', normalized: 'tixr', category: 'ghost' },
    { name: 'Toast', normalized: 'toast', category: 'ghost' },

    // U
    { name: 'UCLA Health', normalized: 'ucla health', category: 'ghost' },
    { name: 'ULine', normalized: 'uline', aliases: ['uline'], category: 'ghost' },
    { name: 'Underdog', normalized: 'underdog', category: 'ghost' },
    { name: 'Underdog Sports', normalized: 'underdog sports', category: 'ghost' },
    { name: 'Unisys', normalized: 'unisys', category: 'ghost' },

    // V
    { name: 'Vertafore', normalized: 'vertafore', category: 'ghost' },
    { name: 'VXI', normalized: 'vxi', category: 'ghost' },

    // W-Y
    { name: 'Webstaurant', normalized: 'webstaurant', aliases: ['webstaurant store', 'webstaruant'], category: 'ghost' },
    { name: 'Wrike', normalized: 'wrike', category: 'ghost' },
    { name: 'Yahoo News', normalized: 'yahoo news', aliases: ['yahoo'], category: 'ghost' },

    // Special cases with numbers/symbols
    { name: '1-800-Pack-Rat', normalized: '1800packrat', aliases: ['1 800 pack rat', '1800packrat', '1 800 pack a rat', '1800 pack rat'], category: 'ghost' }
  ];

  // Build lookup map for O(1) matching
  const REPORTED_COMPANY_MAP = new Map();
  for (const company of REPORTED_COMPANIES) {
    REPORTED_COMPANY_MAP.set(company.normalized, company);
    if (company.aliases) {
      for (const alias of company.aliases) {
        REPORTED_COMPANY_MAP.set(alias, company);
      }
    }
  }

  /**
   * Get category-specific warning message
   */
  function getCategoryMessage(category) {
    switch (category) {
      case 'spam': return 'posting spam job listings';
      case 'ghost': return 'posting ghost jobs (jobs that may not actually exist)';
      case 'scam': return 'potentially scam job postings';
      default: return 'questionable hiring practices';
    }
  }

  /**
   * Detect if a company is in the reported list
   * @param {string} companyName - The company name to check
   * @returns {Object} Detection result with detected, confidence, company, message
   */
  function detectReportedCompany(companyName) {
    if (!companyName || companyName.trim() === '') {
      return { detected: false, confidence: 0, company: null, message: '' };
    }

    const normalized = normalizeCompanyNameForMatch(companyName);

    // 1. Exact match in map (includes primary names and aliases)
    const exactMatch = REPORTED_COMPANY_MAP.get(normalized);
    if (exactMatch) {
      return {
        detected: true,
        confidence: 1.0,
        matchType: 'exact',
        company: exactMatch,
        message: `${exactMatch.name} has been reported for ${getCategoryMessage(exactMatch.category)}`
      };
    }

    // 2. Partial match (bidirectional substring)
    for (const company of REPORTED_COMPANIES) {
      // Check if job company contains reported company name
      if (normalized.includes(company.normalized) && company.normalized.length >= 3) {
        return {
          detected: true,
          confidence: 0.85,
          matchType: 'partial',
          company: company,
          message: `${company.name} has been reported for ${getCategoryMessage(company.category)}`
        };
      }

      // Check if reported company name contains job company
      if (company.normalized.includes(normalized) && normalized.length >= 3) {
        return {
          detected: true,
          confidence: 0.85,
          matchType: 'partial',
          company: company,
          message: `${company.name} has been reported for ${getCategoryMessage(company.category)}`
        };
      }

      // Check aliases for partial matches
      if (company.aliases) {
        for (const alias of company.aliases) {
          if (normalized.includes(alias) && alias.length >= 3) {
            return {
              detected: true,
              confidence: 0.9,
              matchType: 'alias',
              company: company,
              message: `${company.name} has been reported for ${getCategoryMessage(company.category)}`
            };
          }
          if (alias.includes(normalized) && normalized.length >= 3) {
            return {
              detected: true,
              confidence: 0.9,
              matchType: 'alias',
              company: company,
              message: `${company.name} has been reported for ${getCategoryMessage(company.category)}`
            };
          }
        }
      }
    }

    return { detected: false, confidence: 0, company: null, message: '' };
  }

  /**
   * Inject community-reported warning badge
   * Works for both LinkedIn and Indeed with platform-specific container detection
   * ULTRATHINK: Indeed badge matches job age/ghost badge styling (~80% size, two-line layout)
   */
  function injectReportedCompanyBadge(reportResult) {
    if (!reportResult.detected) return;

    // Remove existing badge if present
    const existing = document.querySelector('.jobfiltr-reported-company-badge');
    if (existing) existing.remove();

    // Find or create badge container
    let container = document.querySelector('.jobfiltr-badges-container');
    if (!container) {
      // Platform-specific title selectors
      const titleSelectors = isLinkedIn() ? [
        '.job-details-jobs-unified-top-card__job-title',
        '.jobs-unified-top-card__job-title',
        'h1.t-24',
        '.t-24.t-bold'
      ] : [
        'h1.jobsearch-JobInfoHeader-title',
        '[data-testid="jobsearch-JobInfoHeader-title"]',
        '.jobsearch-JobInfoHeader-title',
        '.jobsearch-JobInfoHeader-title-container'
      ];

      let titleEl = null;
      for (const sel of titleSelectors) {
        titleEl = document.querySelector(sel);
        if (titleEl) break;
      }

      if (titleEl) {
        container = document.createElement('div');
        container.className = 'jobfiltr-badges-container';
        container.style.cssText = 'display: flex; gap: 10px; margin: 10px 0; flex-wrap: wrap; align-items: flex-start;';
        titleEl.insertAdjacentElement('afterend', container);
        console.log('[GhostDetection] Created badges container for reported company badge');
      }
    }

    if (!container) {
      console.log('[GhostDetection] Could not find badge container for reported company badge');
      return;
    }

    // Create warning badge - ULTRATHINK: Indeed uses matching style with job age/ghost badges
    // Inject styles first to ensure glow animation is available
    injectStyles();

    const badge = document.createElement('div');
    badge.className = 'jobfiltr-reported-company-badge';

    if (isIndeed()) {
      // Indeed styling - matches job age badge and ghost analysis badge (~80% size, two-line layout)
      // ULTRATHINK: Add glow class for steady glowing animation on Indeed
      badge.classList.add('jobfiltr-reported-company-badge-glow');

      badge.innerHTML = `
        <div style="display: flex; align-items: center; gap: 6px;">
          <span style="font-size: 15px;">⚠️</span>
          <div>
            <div style="font-weight: 700; font-size: 12px;">Community Reported</div>
            <div style="font-size: 9px; opacity: 0.8;">Spam/Ghost Reports • Click for details</div>
          </div>
        </div>
      `;
      badge.style.cssText = `
        background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
        color: #9a3412;
        padding: 10px 13px;
        border-radius: 10px;
        font-size: 9px;
        font-weight: 600;
        border: 1px solid #f9731650;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        max-width: fit-content;
        cursor: pointer;
        transition: transform 0.2s ease;
      `;
    } else {
      // LinkedIn/default styling
      badge.style.cssText = `
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 12px;
        background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
        border: 2px solid #f97316;
        border-radius: 8px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 12px;
        font-weight: 600;
        color: #9a3412;
        cursor: pointer;
        box-shadow: 0 2px 4px rgba(249, 115, 22, 0.2);
        transition: all 0.2s ease;
      `;
      badge.innerHTML = `
        <span style="font-size: 14px;">⚠️</span>
        <span>Community Reported</span>
      `;
    }

    badge.title = reportResult.message;

    // Click handler to show modal
    badge.addEventListener('click', () => showReportedCompanyModal(reportResult));

    // Hover effects - ULTRATHINK: For Indeed, only transform on hover (glow animation handles box-shadow)
    badge.addEventListener('mouseenter', () => {
      badge.style.transform = 'scale(1.02)';
      if (!isIndeed()) {
        badge.style.boxShadow = '0 4px 8px rgba(249, 115, 22, 0.3)';
      }
    });
    badge.addEventListener('mouseleave', () => {
      badge.style.transform = 'scale(1)';
      if (!isIndeed()) {
        badge.style.boxShadow = '0 2px 4px rgba(249, 115, 22, 0.2)';
      }
    });

    // ULTRATHINK: Position at END of container (right side, after job age badge) for Indeed
    // For LinkedIn, keep at beginning for visibility
    if (isIndeed()) {
      container.appendChild(badge);
      console.log('[GhostDetection] Injected community-reported badge to RIGHT of other badges (Indeed)');
    } else {
      container.insertBefore(badge, container.firstChild);
      console.log('[GhostDetection] Injected community-reported badge to LEFT (LinkedIn)');
    }
    console.log('[GhostDetection] Injected community-reported warning badge for:', reportResult.company?.name);
  }

  /**
   * Show modal with reported company details
   */
  function showReportedCompanyModal(reportResult) {
    // Remove existing modal
    const existing = document.querySelector('.jobfiltr-reported-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.className = 'jobfiltr-reported-modal';
    modal.innerHTML = `
      <div style="
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 99999;
      " onclick="this.parentElement.remove()">
        <div style="
          background: white;
          border-radius: 12px;
          padding: 24px;
          max-width: 450px;
          width: 90%;
          box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);
        " onclick="event.stopPropagation()">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
            <h2 style="margin: 0; font-size: 20px; color: #9a3412; display: flex; align-items: center; gap: 8px;">
              <span>⚠️</span> Community Reported
            </h2>
            <button onclick="this.closest('.jobfiltr-reported-modal').remove()" style="
              background: none;
              border: none;
              font-size: 24px;
              cursor: pointer;
              color: #94a3b8;
            ">&times;</button>
          </div>

          <div style="background: #fef3c7; border: 1px solid #fde68a; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
            <div style="font-weight: 600; color: #92400e; font-size: 16px; margin-bottom: 8px;">
              ${reportResult.company?.name || 'Unknown Company'}
            </div>
            <div style="color: #78350f; font-size: 14px;">
              ${reportResult.message}
            </div>
          </div>

          <div style="color: #64748b; font-size: 13px; line-height: 1.5;">
            <p style="margin: 0 0 12px 0;">
              <strong>What this means:</strong> Users have reported that this company frequently posts jobs that may not represent genuine hiring opportunities.
            </p>
            <p style="margin: 0;">
              <strong>Recommendation:</strong> Research the company thoroughly before applying. Look for recent employee reviews and verify the role through the company's official website.
            </p>
          </div>

          <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #e2e8f0; text-align: center; color: #94a3b8; font-size: 11px;">
            Community reports as of January 2026 • Powered by JobFiltr
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
  }

  // ============================================
  // SEMANTIC PANEL DETECTION (Resilient to DOM changes)
  // ============================================

  /**
   * Find the job detail panel using semantic patterns
   * This is more resilient to LinkedIn DOM changes than specific CSS selectors
   * @returns {HTMLElement|null} The detail panel element or null
   */
  function findDetailPanelSemanticly() {
    // STRATEGY 1: Find by ARIA role (most stable)
    const mainContent = document.querySelector('[role="main"], main, #main');
    if (mainContent) {
      // Look for job-related content in main area
      const heading = mainContent.querySelector('h1, h2');
      if (heading && heading.textContent.length > 5) {
        // Verify it's in a detail panel area (not sidebar)
        const rect = heading.getBoundingClientRect();
        if (rect.left > window.innerWidth * 0.3) {
          // Return the heading's parent for insertion
          return heading.parentElement || heading;
        }
      }
    }

    // STRATEGY 2: Find by position (right side of split view for LinkedIn)
    const allContainers = document.querySelectorAll('div, section, article');
    for (const container of allContainers) {
      const rect = container.getBoundingClientRect();

      // Right side, reasonable width, visible
      if (rect.left > window.innerWidth * 0.35 &&
          rect.width > 400 &&
          rect.height > 300 &&
          rect.top >= 0 &&
          rect.top < window.innerHeight) {

        // Check if it contains job-related content
        const text = container.textContent?.slice(0, 2000) || '';
        if (text.includes('Apply') ||
            text.includes('Description') ||
            text.includes('Skills') ||
            text.includes('Qualifications') ||
            (text.includes('ago') && text.includes('applicant'))) {

          // Find the best insertion point within this container
          const title = container.querySelector('h1, h2');
          if (title) {
            return title.parentElement || title;
          }
          return container;
        }
      }
    }

    // STRATEGY 3: Find by URL-based job ID matching
    const urlMatch = window.location.href.match(/\/jobs\/view\/(\d+)/);
    if (urlMatch) {
      const jobId = urlMatch[1];

      // Look for elements referencing this job ID
      const jobElements = document.querySelectorAll(`[data-job-id="${jobId}"], [data-entity-urn*="${jobId}"]`);
      for (const el of jobElements) {
        // Find the detail panel ancestor (not list item)
        let current = el;
        while (current && current !== document.body) {
          const rect = current.getBoundingClientRect();
          if (rect.width > 400 && rect.left > window.innerWidth * 0.3) {
            const title = current.querySelector('h1, h2');
            if (title) {
              return title.parentElement || title;
            }
            return current;
          }
          current = current.parentElement;
        }
      }
    }

    // STRATEGY 4: Find job card that's marked as active/selected
    const activeSelectors = [
      '[class*="active"]',
      '[class*="selected"]',
      '[aria-selected="true"]'
    ];

    for (const selector of activeSelectors) {
      const activeElements = document.querySelectorAll(selector);
      for (const el of activeElements) {
        // Check if this is in the detail area (not sidebar list)
        const rect = el.getBoundingClientRect();
        if (rect.width > 400 && rect.left > window.innerWidth * 0.3) {
          const title = el.querySelector('h1, h2');
          if (title) {
            return title.parentElement || title;
          }
        }
      }
    }

    return null;
  }

  // ============================================
  // STATE
  // ============================================

  let initialized = false;
  let config = null;
  let currentJob = null;
  let currentScore = null;
  let currentJobId = null;
  let observer = null;

  // FIX: Use a Map to store scores by job ID instead of a single global score
  // This ensures each job badge shows its own score when clicked
  const jobScoreCache = new Map();
  const jobDataCache = new Map();

  // Counter for generating unique IDs when URL params are missing
  let uniqueIdCounter = 0;

  // ============================================
  // UTILITY FUNCTIONS
  // ============================================

  function getText(selector) {
    // Handle comma-separated selectors as fallbacks
    const selectors = selector.split(',').map(s => s.trim());
    for (const sel of selectors) {
      try {
        const el = document.querySelector(sel);
        if (el?.textContent?.trim()) {
          return el.textContent.trim();
        }
      } catch (e) {
        // Invalid selector, try next
      }
    }
    return '';
  }

  // Specialized function to extract posting date with multiple strategies
  function extractPostedDate() {
    // Strategy 1: Try direct selectors for posted date
    const dateSelectors = [
      '.job-details-jobs-unified-top-card__posted-date',
      '.jobs-unified-top-card__posted-date',
      '.tvm__text--positive', // Sometimes shows "Posted X ago"
      'time[datetime]',
      '.jobs-details-top-card__bullet:contains("ago")', // jQuery-like but won't work
    ];

    for (const sel of dateSelectors) {
      try {
        const el = document.querySelector(sel);
        if (el) {
          const text = el.textContent?.trim()?.toLowerCase() || '';
          // Check if it looks like a posting date
          if (text.includes('ago') || text.includes('posted') || text.includes('reposted') ||
              /^\d+\s*(d|w|mo|day|week|month|hour|minute)/i.test(text)) {
            return text;
          }
        }
      } catch (e) { /* skip */ }
    }

    // Strategy 2: Look for time element with datetime attribute
    const timeEl = document.querySelector('.jobs-details time[datetime], .scaffold-layout__detail time[datetime]');
    if (timeEl) {
      const datetime = timeEl.getAttribute('datetime');
      if (datetime) {
        const postDate = new Date(datetime);
        const now = new Date();
        const daysAgo = Math.floor((now - postDate) / (1000 * 60 * 60 * 24));
        if (!isNaN(daysAgo) && daysAgo >= 0) {
          return `${daysAgo} days ago`;
        }
      }
    }

    // Strategy 3: Search for "X days/weeks/months ago" pattern in the detail area
    const detailArea = document.querySelector('.jobs-details, .scaffold-layout__detail');
    if (detailArea) {
      const allText = detailArea.textContent || '';
      const patterns = [
        /(\d+)\s*months?\s*ago/i,
        /(\d+)\s*weeks?\s*ago/i,
        /(\d+)\s*days?\s*ago/i,
        /(\d+)\s*hours?\s*ago/i,
        /posted\s+(\d+)\s*(d|w|mo|months?|weeks?|days?)/i,
        /reposted\s+(\d+)\s*(d|w|mo|months?|weeks?|days?)/i,
      ];
      for (const pattern of patterns) {
        const match = allText.match(pattern);
        if (match) {
          return match[0];
        }
      }
    }

    return null;
  }

  function parsePostingDays(dateString) {
    if (!dateString) return null;
    const normalized = dateString.toLowerCase().trim();

    if (/just now|moments? ago/i.test(normalized)) return 0;

    let match;
    if ((match = normalized.match(/(\d+)\s*minutes?\s*ago/i))) return 0;
    if ((match = normalized.match(/(\d+)\s*hours?\s*ago/i))) return 0;
    if ((match = normalized.match(/(\d+)\s*days?\s*ago/i))) return parseInt(match[1]);
    if ((match = normalized.match(/(\d+)\s*weeks?\s*ago/i))) return parseInt(match[1]) * 7;
    if ((match = normalized.match(/(\d+)\s*months?\s*ago/i))) return parseInt(match[1]) * 30;

    return null;
  }

  function calculateTemporalRisk(days) {
    if (days === null) return 0.3; // Reduced default - unknown is still concerning
    if (days <= 3) return 0;       // Fresh posting - no risk
    if (days <= 7) return 0.05;    // Very recent
    if (days <= 14) return 0.15;   // Recent
    if (days <= 21) return 0.25;   // 2-3 weeks
    if (days <= 30) return 0.4;    // A month old - getting concerning
    if (days <= 45) return 0.6;    // 6 weeks - significant risk
    if (days <= 60) return 0.75;   // 2 months - high risk
    if (days <= 90) return 0.9;    // 3 months - very high risk
    return 1;                       // 3+ months - almost certain ghost
  }

  function calculateVagueness(text) {
    const normalized = text.toLowerCase();
    let weightedScore = 0;
    let matchedIndicators = [];

    // High-weight indicators (0.25 each, max contribution)
    for (const indicator of VAGUE_INDICATORS.high) {
      if (normalized.includes(indicator)) {
        weightedScore += 0.25;
        matchedIndicators.push(`HIGH:${indicator}`);
      }
    }

    // Medium-weight indicators (0.12 each)
    for (const indicator of VAGUE_INDICATORS.medium) {
      if (normalized.includes(indicator)) {
        weightedScore += 0.12;
        matchedIndicators.push(`MED:${indicator}`);
      }
    }

    // Low-weight indicators (0.05 each)
    for (const indicator of VAGUE_INDICATORS.low) {
      if (normalized.includes(indicator)) {
        weightedScore += 0.05;
        matchedIndicators.push(`LOW:${indicator}`);
      }
    }

    // Log matched indicators for debugging (only if matches found)
    if (matchedIndicators.length > 0) {
      console.log('[GhostDetection] Vague indicators found:', matchedIndicators.join(', '));
    }

    // Cap at 1.0 and return
    return Math.min(1, weightedScore);
  }

  function checkStaffingAgency(company) {
    const normalized = company.toLowerCase();
    for (const agency of KNOWN_STAFFING_AGENCIES) {
      if (normalized.includes(agency)) {
        return { isLikely: true, confidence: 0.95 };
      }
    }
    // "staffing" in company name is a very strong indicator - give it higher weight
    // Other indicators are supporting signals
    const strongIndicators = ['staffing', 'recruiting', 'recruiters'];
    const weakIndicators = ['talent', 'solutions', 'consulting', 'workforce', 'employment'];
    let score = 0;
    for (const ind of strongIndicators) {
      if (normalized.includes(ind)) score += 0.4; // Strong indicator = immediate flag
    }
    for (const ind of weakIndicators) {
      if (normalized.includes(ind)) score += 0.15;
    }
    return { isLikely: score >= 0.4, confidence: Math.min(0.9, score) };
  }

  function getCategory(score) {
    if (score <= 20) return 'safe';
    if (score <= 40) return 'low_risk';
    if (score <= 60) return 'medium_risk';
    if (score <= 80) return 'high_risk';
    return 'likely_ghost';
  }

  // ============================================
  // STORAGE FUNCTIONS
  // ============================================

  // Helper to check if extension context is still valid
  function isExtensionContextValid() {
    try {
      return chrome && chrome.runtime && chrome.runtime.id;
    } catch (e) {
      return false;
    }
  }

  async function loadConfig() {
    if (!isExtensionContextValid()) {
      console.log('[GhostDetection] Extension context invalidated, using defaults');
      return {
        enabled: true,
        sensitivity: 'medium',
        showScores: true,
        autoHide: false,
        autoHideThreshold: 80,
      };
    }

    return new Promise((resolve) => {
      try {
        chrome.storage.local.get(CONFIG_KEY, (result) => {
          if (chrome.runtime.lastError) {
            console.error('[GhostDetection] Storage error:', chrome.runtime.lastError);
            resolve({
              enabled: true,
              sensitivity: 'medium',
              showScores: true,
              autoHide: false,
              autoHideThreshold: 80,
            });
            return;
          }
          resolve(result[CONFIG_KEY] || {
            enabled: true,
            sensitivity: 'medium',
            showScores: true,
            autoHide: false,
            autoHideThreshold: 80,
          });
        });
      } catch (e) {
        console.error('[GhostDetection] Failed to load config:', e);
        resolve({
          enabled: true,
          sensitivity: 'medium',
          showScores: true,
          autoHide: false,
          autoHideThreshold: 80,
        });
      }
    });
  }

  // Check if ghost analysis is enabled in filter settings
  async function isGhostAnalysisEnabled() {
    if (!isExtensionContextValid()) {
      return { enabled: true, showCommunityWarnings: true }; // Default to enabled if can't check
    }

    return new Promise((resolve) => {
      try {
        chrome.storage.local.get('filterSettings', (result) => {
          if (chrome.runtime.lastError) {
            console.error('[GhostDetection] Error checking filter settings:', chrome.runtime.lastError);
            resolve({ enabled: true, showCommunityWarnings: true });
            return;
          }
          const filterSettings = result.filterSettings || {};
          // Default to true if not set
          const enabled = filterSettings.enableGhostAnalysis !== false;
          // Community-reported warnings checkbox (controls spam/ghost company warning badge)
          const showCommunityWarnings = filterSettings.showCommunityReportedWarnings !== false;
          resolve({ enabled, showCommunityWarnings });
        });
      } catch (e) {
        console.error('[GhostDetection] Failed to check filter settings:', e);
        resolve({ enabled: true, showCommunityWarnings: true });
      }
    });
  }

  async function getCachedScore(jobId) {
    if (!isExtensionContextValid()) {
      return null;
    }

    return new Promise((resolve) => {
      try {
        chrome.storage.local.get(CACHE_KEY, (result) => {
          if (chrome.runtime.lastError) {
            console.error('[GhostDetection] Cache read error:', chrome.runtime.lastError);
            resolve(null);
            return;
          }
          const scores = result[CACHE_KEY] || {};
          const cached = scores[jobId];
          if (cached && cached.expiresAt > Date.now()) {
            resolve(cached.data);
          } else {
            resolve(null);
          }
        });
      } catch (e) {
        console.error('[GhostDetection] Failed to get cached score:', e);
        resolve(null);
      }
    });
  }

  async function cacheScore(jobId, score) {
    if (!isExtensionContextValid()) {
      return;
    }

    return new Promise((resolve) => {
      try {
        chrome.storage.local.get(CACHE_KEY, (result) => {
          if (chrome.runtime.lastError) {
            console.error('[GhostDetection] Cache write error:', chrome.runtime.lastError);
            resolve();
            return;
          }
          const scores = result[CACHE_KEY] || {};
          scores[jobId] = {
            data: score,
            expiresAt: Date.now() + 60 * 60 * 1000,
          };
          chrome.storage.local.set({ [CACHE_KEY]: scores }, () => {
            if (chrome.runtime.lastError) {
              console.error('[GhostDetection] Cache set error:', chrome.runtime.lastError);
            }
            resolve();
          });
        });
      } catch (e) {
        console.error('[GhostDetection] Failed to cache score:', e);
        resolve();
      }
    });
  }

  async function checkBlacklist(company) {
    if (!isExtensionContextValid()) {
      return null;
    }

    return new Promise((resolve) => {
      try {
        chrome.storage.local.get(BLACKLIST_KEY, (result) => {
          if (chrome.runtime.lastError) {
            console.error('[GhostDetection] Blacklist read error:', chrome.runtime.lastError);
            resolve(null);
            return;
          }
          const cached = result[BLACKLIST_KEY];
          if (!cached || cached.expiresAt < Date.now()) {
            resolve(null);
            return;
          }
          const normalized = company.toLowerCase().replace(/[^a-z0-9]/g, '');
          const entry = cached.data?.find((e) => normalized.includes(e.normalizedName));
          resolve(entry || null);
        });
      } catch (e) {
        console.error('[GhostDetection] Failed to check blacklist:', e);
        resolve(null);
      }
    });
  }

  // ============================================
  // SIGNAL ANALYSIS
  // ============================================

  function analyzeTemporalSignals(job) {
    const signals = [];
    const weights = SIGNAL_WEIGHTS.temporal.signals;

    const days = parsePostingDays(job.postedDate);
    const ageRisk = calculateTemporalRisk(days);

    signals.push({
      id: 'posting_age',
      category: 'temporal',
      name: 'Posting Age',
      weight: weights.postingAge,
      value: days ?? -1,
      normalizedValue: ageRisk,
      confidence: days !== null ? 0.9 : 0.5,
      description: days !== null ? `Posted ${days} days ago` : 'Unknown posting date',
    });

    const month = new Date().getMonth() + 1;
    const isPeakPeriod = [1, 2, 11, 12].includes(month);

    signals.push({
      id: 'seasonal',
      category: 'temporal',
      name: 'Seasonal Risk',
      weight: weights.seasonalPattern,
      value: isPeakPeriod ? 1 : 0,
      normalizedValue: isPeakPeriod ? 0.3 : 0,
      confidence: 0.6,
      description: isPeakPeriod ? 'Peak ghost job period (Q1/Q4)' : 'Normal period',
    });

    return signals;
  }

  function analyzeContentSignals(job) {
    const signals = [];
    const weights = SIGNAL_WEIGHTS.content.signals;

    const vagueness = calculateVagueness(job.description);
    signals.push({
      id: 'vagueness',
      category: 'content',
      name: 'Description Quality',
      weight: weights.descriptionVagueness,
      value: vagueness,
      normalizedValue: vagueness,
      confidence: 0.8,
      description: vagueness > 0.6 ? 'Vague and generic' : vagueness > 0.3 ? 'Some vague elements' : 'Specific and detailed',
    });

    const hasSalary = /\$[\d,]+/.test(job.description) || !!job.salary;
    const isVagueSalary = /competitive|DOE|negotiable/i.test(job.description);
    const salaryRisk = !hasSalary ? 0.6 : isVagueSalary ? 0.4 : 0;

    signals.push({
      id: 'salary',
      category: 'content',
      name: 'Salary Transparency',
      weight: weights.salaryTransparency,
      value: salaryRisk,
      normalizedValue: salaryRisk,
      confidence: 0.7,
      description: salaryRisk > 0.5 ? 'No salary info' : salaryRisk > 0 ? 'Vague salary' : 'Salary provided',
    });

    return signals;
  }

  async function analyzeCompanySignals(job) {
    const signals = [];
    const weights = SIGNAL_WEIGHTS.company.signals;

    const blacklistEntry = await checkBlacklist(job.company);
    signals.push({
      id: 'blacklist',
      category: 'company',
      name: 'Blacklist Check',
      weight: weights.blacklistMatch,
      value: blacklistEntry?.reportCount || 0,
      normalizedValue: blacklistEntry ? Math.min(1, blacklistEntry.confidence) : 0,
      confidence: blacklistEntry ? blacklistEntry.confidence : 0.9,
      description: blacklistEntry ? `On ${blacklistEntry.source} blacklist` : 'Not on blacklists',
    });

    const staffing = checkStaffingAgency(job.company);
    signals.push({
      id: 'staffing',
      category: 'company',
      name: 'Staffing Agency',
      weight: weights.companySize,
      value: staffing.confidence,
      normalizedValue: staffing.isLikely ? staffing.confidence : 0,
      confidence: staffing.isLikely ? 0.85 : 0.7,
      description: staffing.isLikely ? 'Likely staffing agency' : 'Not a staffing agency',
    });

    return signals;
  }

  function analyzeBehavioralSignals(job) {
    const signals = [];
    const weights = SIGNAL_WEIGHTS.behavioral.signals;

    signals.push({
      id: 'apply_method',
      category: 'behavioral',
      name: 'Application Method',
      weight: weights.applicationMethod,
      value: job.isEasyApply ? 0 : 1,
      normalizedValue: job.isEasyApply ? 0 : 0.2,
      confidence: 0.6,
      description: job.isEasyApply ? 'Easy Apply available' : 'External application',
    });

    if (job.isSponsored !== undefined) {
      signals.push({
        id: 'sponsored',
        category: 'behavioral',
        name: 'Sponsored Post',
        weight: weights.sponsoredPost,
        value: job.isSponsored ? 1 : 0,
        normalizedValue: job.isSponsored ? 0.2 : 0,
        confidence: 0.9,
        description: job.isSponsored ? 'Sponsored/promoted' : 'Organic posting',
      });
    }

    if (job.applicantCount !== undefined) {
      const risk = job.applicantCount > 500 ? 0.5 : job.applicantCount > 200 ? 0.3 : 0;
      signals.push({
        id: 'applicants',
        category: 'behavioral',
        name: 'Applicant Volume',
        weight: weights.applicantCount,
        value: job.applicantCount,
        normalizedValue: risk,
        confidence: 0.7,
        description: `${job.applicantCount} applicants`,
      });
    }

    return signals;
  }

  function calculateBreakdown(signals) {
    const categories = ['temporal', 'content', 'company', 'behavioral', 'community', 'structural'];
    const breakdown = {};

    for (const cat of categories) {
      const catSignals = signals.filter((s) => s.category === cat);
      if (!catSignals.length) {
        breakdown[cat] = 0;
        continue;
      }

      let sum = 0;
      let totalWeight = 0;
      for (const s of catSignals) {
        sum += s.normalizedValue * s.weight * s.confidence;
        totalWeight += s.weight;
      }

      breakdown[cat] = totalWeight > 0 ? (sum / totalWeight) * 100 : 0;
    }

    return breakdown;
  }

  function calculateOverall(breakdown) {
    const w = SIGNAL_WEIGHTS;
    const score =
      (breakdown.temporal || 0) * (w.temporal.categoryWeight / 100) +
      (breakdown.content || 0) * (w.content.categoryWeight / 100) +
      (breakdown.company || 0) * (w.company.categoryWeight / 100) +
      (breakdown.behavioral || 0) * (w.behavioral.categoryWeight / 100) +
      (breakdown.community || 0) * (w.community.categoryWeight / 100) +
      (breakdown.structural || 0) * (w.structural.categoryWeight / 100);

    return Math.round(Math.min(100, Math.max(0, score)));
  }

  // ============================================
  // CORE ANALYSIS
  // ============================================

  // Cache version - increment when algorithm changes to invalidate old cached scores
  const CACHE_VERSION = 2;

  async function analyzeJob(job) {
    const cached = await getCachedScore(job.id);
    // Only use cache if version matches (invalidate old cached scores)
    if (cached && cached.version === CACHE_VERSION) {
      console.log('[GhostDetection] Using cached score (v' + CACHE_VERSION + ')');
      return cached;
    }

    const signals = [];
    signals.push(...analyzeTemporalSignals(job));
    signals.push(...analyzeContentSignals(job));
    signals.push(...(await analyzeCompanySignals(job)));
    signals.push(...analyzeBehavioralSignals(job));

    const breakdown = calculateBreakdown(signals);
    let overall = calculateOverall(breakdown);

    // Apply floor scores for obvious ghost job indicators
    const days = parsePostingDays(job.postedDate);

    // Very old postings should have minimum scores regardless of other factors
    if (days !== null) {
      if (days >= 90) {
        // 3+ months old = minimum 65 (high_risk)
        overall = Math.max(overall, 65);
        console.log('[GhostDetection] Floor applied: 90+ days old');
      } else if (days >= 60) {
        // 2+ months old = minimum 50 (medium_risk)
        overall = Math.max(overall, 50);
        console.log('[GhostDetection] Floor applied: 60+ days old');
      } else if (days >= 45) {
        // 6+ weeks old = minimum 35 (low_risk leaning medium)
        overall = Math.max(overall, 35);
      }
    }

    // Staffing agencies should have minimum score
    const staffingCheck = checkStaffingAgency(job.company || '');
    if (staffingCheck.isLikely) {
      overall = Math.max(overall, 40); // Minimum medium_risk for staffing
    }

    // Very high applicant count is a strong ghost signal
    if (job.applicantCount && job.applicantCount >= 500) {
      overall = Math.max(overall, 45);
      if (days && days >= 30) {
        // Old posting with high applicants = very suspicious
        overall = Math.max(overall, 55);
      }
    }

    // Reposted indicator (if detected in description or title)
    const isReposted = /reposted/i.test(job.description || '') || /reposted/i.test(job.title || '');
    if (isReposted) {
      overall = Math.max(overall, 50); // Reposted jobs are suspicious
    }

    overall = Math.min(100, Math.max(0, overall));

    const category = getCategory(overall);

    // Calculate confidence based on data quality and signal consistency
    // This produces varied confidence scores based on actual job data
    let confidence = 0.5;
    if (signals.length > 0) {
      // 1. Data completeness: how many signals have known/real data vs unknowns
      const knownSignals = signals.filter(s =>
        s.value !== -1 &&
        !s.description?.toLowerCase().includes('unknown') &&
        s.normalizedValue !== undefined
      );
      const dataCompleteness = knownSignals.length / signals.length;

      // 2. Signal consistency: lower variance in risk values = higher confidence
      const normalizedValues = signals.map(s => s.normalizedValue || 0);
      const mean = normalizedValues.reduce((a, b) => a + b, 0) / normalizedValues.length;
      const variance = normalizedValues.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / normalizedValues.length;
      const consistency = 1 - Math.min(1, Math.sqrt(variance) * 2); // Lower variance = higher consistency

      // 3. Evidence strength: weighted by signal importance
      const totalWeight = signals.reduce((sum, s) => sum + s.weight, 0);
      const weightedEvidence = totalWeight > 0
        ? signals.reduce((sum, s) => sum + (s.normalizedValue > 0 ? s.weight : 0), 0) / totalWeight
        : 0;
      const evidenceStrength = Math.abs(overall - 50) / 50; // How far from neutral (50%)

      // Combine factors: 40% completeness, 30% consistency, 30% evidence strength
      confidence = (dataCompleteness * 0.4) + (consistency * 0.3) + (evidenceStrength * 0.3);

      // Scale to 50-95% range (never 100% certain, never below 50% if we have data)
      confidence = 0.5 + (confidence * 0.45);
    }

    const score = { overall, confidence, category, signals, breakdown, timestamp: Date.now(), version: CACHE_VERSION };
    await cacheScore(job.id, score);

    return score;
  }

  // ============================================
  // UI INJECTION
  // ============================================

  // Inject CSS animations once
  function injectStyles() {
    if (document.getElementById('jobfiltr-ghost-styles')) return;

    const style = document.createElement('style');
    style.id = 'jobfiltr-ghost-styles';
    style.textContent = `
      @keyframes jobfiltr-progress-fill {
        from { stroke-dashoffset: 251.2; }
      }
      @keyframes jobfiltr-score-pop {
        0% { transform: scale(0); opacity: 0; }
        50% { transform: scale(1.1); }
        100% { transform: scale(1); opacity: 1; }
      }
      @keyframes jobfiltr-pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.05); }
      }
      @keyframes jobfiltr-fade-in {
        from { opacity: 0; transform: translateY(-10px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes jobfiltr-modal-in {
        from { opacity: 0; transform: scale(0.9); }
        to { opacity: 1; transform: scale(1); }
      }
      @keyframes slideInRight {
        from {
          opacity: 0;
          transform: translateX(100px);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }
      @keyframes jobfiltr-reported-glow {
        0%, 100% {
          box-shadow: 0 2px 6px rgba(0,0,0,0.1), 0 0 8px rgba(249, 115, 22, 0.3);
        }
        50% {
          box-shadow: 0 2px 6px rgba(0,0,0,0.1), 0 0 16px rgba(249, 115, 22, 0.5);
        }
      }
      .jobfiltr-reported-company-badge-glow {
        animation: jobfiltr-reported-glow 2s ease-in-out infinite;
      }
      .jobfiltr-ghost-score:hover {
        transform: scale(1.02);
        box-shadow: 0 6px 20px rgba(0,0,0,0.35) !important;
      }
      .jobfiltr-ghost-badge-container {
        animation: jobfiltr-fade-in 0.4s ease-out;
      }
      .jobfiltr-progress-ring {
        transform: rotate(-90deg);
      }
      .jobfiltr-progress-ring-circle {
        transition: stroke-dashoffset 0.8s ease-out;
      }
      .jobfiltr-modal-content {
        animation: jobfiltr-modal-in 0.3s ease-out;
      }
      .jobfiltr-close-btn:hover {
        color: #1e293b !important;
        background: #f1f5f9 !important;
      }
    `;
    document.head.appendChild(style);
  }

  // Create SVG circular progress indicator
  // If animated=true, starts from 0 and animates to target score
  function createCircularProgress(score, color, size = 60, animated = false, elementId = null) {
    const strokeWidth = 4;
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const progress = Math.min(100, Math.max(0, score));
    const targetOffset = circumference - (progress / 100) * circumference;

    // For animated version, start from full offset (0%) and animate to target
    const startOffset = animated ? circumference : targetOffset;
    const textId = elementId ? `id="${elementId}"` : '';
    const circleId = elementId ? `id="${elementId}-circle"` : '';

    // Use darker track for inline badge (size 56), lighter track for modal (size 100)
    const trackColor = size <= 60 ? 'rgba(255,255,255,0.15)' : '#e2e8f0';
    // Use white text for inline preview badge (navy background), score color for modal
    const textColor = size <= 60 ? '#ffffff' : color;

    return `
      <svg class="jobfiltr-progress-ring" width="${size}" height="${size}">
        <circle
          stroke="${trackColor}"
          stroke-width="${strokeWidth}"
          fill="transparent"
          r="${radius}"
          cx="${size / 2}"
          cy="${size / 2}"
        />
        <circle
          ${circleId}
          class="jobfiltr-progress-ring-circle"
          stroke="${color}"
          stroke-width="${strokeWidth}"
          stroke-linecap="round"
          fill="transparent"
          r="${radius}"
          cx="${size / 2}"
          cy="${size / 2}"
          data-circumference="${circumference}"
          data-target-offset="${targetOffset}"
          style="
            stroke-dasharray: ${circumference} ${circumference};
            stroke-dashoffset: ${startOffset};
            transition: stroke-dashoffset 1.5s ease-out;
          "
        />
        <text
          ${textId}
          x="50%"
          y="50%"
          text-anchor="middle"
          dominant-baseline="central"
          style="
            font-size: ${size > 80 ? '24px' : '16px'};
            font-weight: 700;
            fill: ${textColor};
            transform: rotate(90deg);
            transform-origin: center;
          "
        >${animated ? '0' : score}%</text>
      </svg>
    `;
  }

  // Animate score counting from 0 to target value
  function animateScoreCount(elementId, targetScore, duration = 1500) {
    const element = document.getElementById(elementId);
    const circleElement = document.getElementById(`${elementId}-circle`);

    if (!element) return;

    const startTime = performance.now();
    const startValue = 0;

    // Animate the circle stroke
    if (circleElement) {
      const targetOffset = circleElement.dataset.targetOffset;
      setTimeout(() => {
        circleElement.style.strokeDashoffset = targetOffset;
      }, 50);
    }

    // Animate the number counting
    function updateCount(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease-out function for smooth deceleration
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const currentValue = Math.round(startValue + (targetScore - startValue) * easeOut);

      element.textContent = `${currentValue}%`;

      if (progress < 1) {
        requestAnimationFrame(updateCount);
      } else {
        element.textContent = `${targetScore}%`;
      }
    }

    requestAnimationFrame(updateCount);
  }

  // Animate confidence counting
  function animateConfidenceCount(elementId, targetConfidence, duration = 1500) {
    const element = document.getElementById(elementId);
    if (!element) return;

    const startTime = performance.now();
    const startValue = 0;

    function updateCount(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease-out function
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const currentValue = Math.round(startValue + (targetConfidence - startValue) * easeOut);

      element.textContent = `Confidence: ${currentValue}%`;

      if (progress < 1) {
        requestAnimationFrame(updateCount);
      } else {
        element.textContent = `Confidence: ${targetConfidence}%`;
      }
    }

    requestAnimationFrame(updateCount);
  }

  function injectScoreUI(score, category, scoreTargets, onClick) {
    injectStyles();
    document.querySelector('.jobfiltr-ghost-score')?.remove();
    document.getElementById('jobfiltr-floating-badge-container')?.remove();

    const color = SCORE_COLORS[category] || SCORE_COLORS.medium_risk;
    const label = SCORE_LABELS[category] || 'Unknown';

    // Calculate display percentage: for "safe" category, show legitimacy % (100 - ghostScore)
    // For risk categories, show the ghost/risk score directly
    const displayPercent = (category === 'safe') ? (100 - score) : score;

    // Get risk level emoji
    const riskEmoji = {
      safe: '✅',
      low_risk: '🔵',
      medium_risk: '🟡',
      high_risk: '🟠',
      likely_ghost: '👻'
    }[category] || '❓';

    const badge = document.createElement('div');
    badge.className = 'jobfiltr-ghost-score jobfiltr-ghost-badge-container';

    // Use Indeed-specific styling and positioning
    if (isIndeed()) {
      // Indeed styling - ULTRATHINK: Sized to ~80% of original for detail panel
      badge.innerHTML = `
        <div style="display: flex; align-items: center; gap: 6px;">
          <span style="font-size: 15px;">${riskEmoji}</span>
          <div>
            <div style="font-weight: 700; font-size: 12px;">${displayPercent}% ${label}</div>
            <div style="font-size: 9px; opacity: 0.8;">Ghost Job Analysis • Click for details</div>
          </div>
        </div>
      `;
      badge.style.cssText = `
        background: linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%);
        color: #ffffff;
        padding: 10px 13px;
        border-radius: 10px;
        font-size: 9px;
        font-weight: 600;
        box-shadow: 0 2px 6px rgba(0,0,0,0.1);
        border: 1px solid ${color}50;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        max-width: fit-content;
        cursor: pointer;
        transition: all 0.2s ease;
      `;
      badge.addEventListener('click', onClick);

      // For Indeed: Find or create a badges container directly under the job title
      // This ensures ghost badge is on the LEFT, and job age badge will be on the RIGHT
      let badgesContainer = document.querySelector('.jobfiltr-badges-container');

      if (!badgesContainer) {
        // Find the job title element to place badges directly under it
        const jobTitleSelectors = [
          'h1.jobsearch-JobInfoHeader-title',
          '[data-testid="jobsearch-JobInfoHeader-title"]',
          '.jobsearch-JobInfoHeader-title',
          '.jobsearch-JobInfoHeader-title-container'
        ];

        let jobTitle = null;
        for (const selector of jobTitleSelectors) {
          jobTitle = document.querySelector(selector);
          if (jobTitle) break;
        }

        if (jobTitle) {
          // Create the badges container directly under the job title
          // ULTRATHINK: Gap and margin sized to ~80% to match badge sizes
          badgesContainer = document.createElement('div');
          badgesContainer.className = 'jobfiltr-badges-container';
          badgesContainer.style.cssText = `
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            align-items: flex-start;
            margin: 10px 0;
          `;
          jobTitle.insertAdjacentElement('afterend', badgesContainer);
          console.log('[GhostDetection] Created badges container under job title for Indeed');
        }
      }

      if (badgesContainer) {
        // Insert ghost badge at the beginning (left side)
        badgesContainer.insertBefore(badge, badgesContainer.firstChild);
        console.log('[GhostDetection] Added ghost badge to badges container (left side)');
        return true;
      }

      // Fallback: If no title found, use standard insertion
      console.warn('[GhostDetection] Could not find job title, using fallback insertion');
    } else {
      // LinkedIn/default styling - ULTRATHINK: Sized to ~80% of original for detail panel
      badge.innerHTML = `
        <div style="
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 9px 13px;
          background: linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%);
          border: 2px solid ${color};
          border-radius: 10px;
          cursor: pointer;
          margin: 10px 0;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          transition: all 0.3s ease;
          box-shadow: 0 3px 8px rgba(0,0,0,0.25);
        ">
          ${createCircularProgress(displayPercent, color, 45)}
          <div style="display: flex; flex-direction: column; gap: 3px;">
            <div style="display: flex; align-items: center; gap: 5px;">
              <span style="font-size: 13px;">${riskEmoji}</span>
              <span style="font-size: 11px; font-weight: 600; color: #ffffff;">${label}</span>
            </div>
            <span style="font-size: 9px; color: #94a3b8;">Ghost Job Analysis • Click for details</span>
          </div>
        </div>
      `;
      badge.addEventListener('click', onClick);
    }

    // Standard insertion for LinkedIn and fallback
    // Handle both single selector (string) and array of selectors
    const selectors = Array.isArray(scoreTargets) ? scoreTargets : [scoreTargets];

    let target = null;
    let usedSelector = null;

    // Try each selector until we find a valid target
    for (const selector of selectors) {
      target = document.querySelector(selector);
      if (target) {
        usedSelector = selector;
        break;
      }
    }

    if (!target) {
      console.warn('[GhostDetection] Standard selectors failed. Trying semantic detection...');

      // ===== SEMANTIC PANEL DETECTION (Resilient to DOM changes) =====
      target = findDetailPanelSemanticly();

      if (target) {
        usedSelector = 'semantic-detection';
        console.log('[GhostDetection] Found target via semantic detection');
      } else {
        // Last resort fallback: create a floating badge at the top of the viewport
        console.log('[GhostDetection] Using floating badge fallback');
        const floatingContainer = document.createElement('div');
        floatingContainer.id = 'jobfiltr-floating-badge-container';
        floatingContainer.style.cssText = `
          position: fixed;
          top: 80px;
          right: 20px;
          z-index: 9999;
          animation: slideInRight 0.3s ease-out;
        `;
        document.body.appendChild(floatingContainer);
        target = floatingContainer;
        usedSelector = 'floating-fallback';
      }
    } else {
      console.log('[GhostDetection] Found injection target:', usedSelector);
    }

    target.insertAdjacentElement('afterend', badge);
    return true;
  }

  // Detect if dark mode is enabled
  function isDarkMode() {
    // Check for JobFiltr popup theme setting stored in localStorage
    try {
      const storedTheme = localStorage.getItem('jobfiltr_theme');
      if (storedTheme) return storedTheme === 'dark';
    } catch (e) {}

    // Check document data-theme attribute
    const docTheme = document.documentElement.getAttribute('data-theme');
    if (docTheme) return docTheme === 'dark';

    // Check body data-theme attribute
    const bodyTheme = document.body.getAttribute('data-theme');
    if (bodyTheme) return bodyTheme === 'dark';

    // Check system preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return true;
    }

    // Check if LinkedIn is in dark mode (LinkedIn specific)
    const linkedInDark = document.body.classList.contains('theme--dark') ||
                         document.documentElement.classList.contains('theme--dark');
    if (linkedInDark) return true;

    return false;
  }

  // FIX: showDetails now accepts a jobId parameter to look up the correct score
  // This prevents the global currentScore from showing the wrong job's score
  function showDetails(jobId = null) {
    // Look up the specific job's score and data from cache
    const scoreToShow = jobId ? jobScoreCache.get(jobId) : currentScore;
    const jobToShow = jobId ? jobDataCache.get(jobId) : currentJob;

    if (!jobToShow || !scoreToShow) {
      console.warn('[GhostDetection] No score/job data for:', jobId);
      return;
    }

    console.log('[GhostDetection] Score details for job:', jobId, scoreToShow);

    // Remove any existing modal
    document.querySelector('.jobfiltr-modal')?.remove();

    const getColor = (cat) => SCORE_COLORS[cat] || SCORE_COLORS.medium_risk;
    const getLabel = (cat) => SCORE_LABELS[cat] || 'Unknown';
    const color = getColor(scoreToShow.category);

    // Detect dark mode
    const darkMode = isDarkMode();

    // Theme-aware colors
    const theme = {
      modalBg: darkMode ? '#18181b' : 'white',
      modalText: darkMode ? '#fafafa' : '#1e293b',
      modalTextSecondary: darkMode ? '#a1a1aa' : '#64748b',
      cardBg: darkMode ? '#27272a' : '#f8fafc',
      cardBorder: darkMode ? '#3f3f46' : '#e2e8f0',
      headerText: darkMode ? '#fafafa' : '#1e293b',
      closeBtn: darkMode ? '#71717a' : '#94a3b8',
      closeBtnHover: darkMode ? '#fafafa' : '#1e293b',
      closeBtnHoverBg: darkMode ? '#3f3f46' : '#f1f5f9',
      progressBarBg: darkMode ? '#3f3f46' : '#e2e8f0',
      ghostIconFill: darkMode ? '#a1a1aa' : '#64748b',
      ghostEyeFill: darkMode ? '#27272a' : 'white'
    };

    const modal = document.createElement('div');
    modal.className = 'jobfiltr-modal';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,${darkMode ? '0.7' : '0.5'});
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 99999;
      backdrop-filter: blur(2px);
    `;

    const content = document.createElement('div');
    content.className = 'jobfiltr-modal-content';
    content.style.cssText = `
      background: ${theme.modalBg};
      border-radius: 16px;
      padding: 24px;
      max-width: 500px;
      width: 90%;
      max-height: 80vh;
      overflow-y: auto;
      box-shadow: 0 25px 50px -12px rgba(0,0,0,${darkMode ? '0.5' : '0.25'});
      ${darkMode ? 'border: 1px solid #3f3f46;' : ''}
    `;

    // SVG ghost icon - clean, friendly ghost design (no tongue) - theme aware
    const ghostIconSvg = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align: middle; margin-right: 8px;">
        <path d="M12 2C7.03 2 3 6.03 3 11v9c0 .83.94 1.3 1.58.79L6 19.5l1.42 1.29c.39.35.97.35 1.36 0L10.2 19.5l1.42 1.29c.39.35.97.35 1.36 0L14.4 19.5l1.42 1.29c.39.35.97.35 1.36 0L18.6 19.5l1.42 1.29c.64.51 1.58.04 1.58-.79v-9c0-4.97-4.03-9-9-9z" fill="${theme.ghostIconFill}"/>
        <circle cx="9" cy="11" r="1.5" fill="${theme.ghostEyeFill}"/>
        <circle cx="15" cy="11" r="1.5" fill="${theme.ghostEyeFill}"/>
      </svg>
    `;

    // Score section background - navy for safe, theme-aware for others
    const scoreSectionBg = scoreToShow.category === 'safe'
      ? 'linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%)'
      : (darkMode ? 'linear-gradient(135deg, #27272a 0%, #18181b 100%)' : 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)');

    const scoreLabelColor = scoreToShow.category === 'safe' ? '#ffffff' : theme.modalText;
    const scoreConfidenceColor = scoreToShow.category === 'safe' ? '#94a3b8' : theme.modalTextSecondary;

    content.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
        <h2 style="margin: 0; font-size: 20px; color: ${theme.headerText}; font-weight: 700; display: flex; align-items: center;">${ghostIconSvg}Ghost Job Analysis</h2>
        <button class="jobfiltr-close-btn" style="
          background: none;
          border: none;
          width: 32px;
          height: 32px;
          border-radius: 8px;
          font-size: 20px;
          cursor: pointer;
          color: ${theme.closeBtn};
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        " onmouseover="this.style.color='${theme.closeBtnHover}';this.style.background='${theme.closeBtnHoverBg}'" onmouseout="this.style.color='${theme.closeBtn}';this.style.background='none'">✕</button>
      </div>

      <div style="text-align: center; padding: 24px; background: ${scoreSectionBg}; border-radius: 12px; margin-bottom: 20px;">
        <div style="display: inline-block; margin-bottom: 12px;">
          ${createCircularProgress(scoreToShow.category === 'safe' ? (100 - scoreToShow.overall) : scoreToShow.overall, scoreToShow.category === 'safe' ? '#4ade80' : color, 100, true, 'jobfiltr-modal-score')}
        </div>
        <div style="font-size: 18px; font-weight: 600; color: ${scoreLabelColor}; margin-bottom: 4px;">${getLabel(scoreToShow.category)}</div>
        <div id="jobfiltr-modal-confidence" style="font-size: 13px; color: ${scoreConfidenceColor};">
          Confidence: 0%
        </div>
      </div>

      <h3 style="font-size: 13px; color: ${theme.modalTextSecondary}; margin: 20px 0 12px; text-transform: uppercase; letter-spacing: 0.5px;">Risk Breakdown</h3>
      <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 20px;">
        ${Object.entries(scoreToShow.breakdown)
          .filter(([_, value]) => value > 0)
          .map(([category, value]) => {
            const categoryDescriptions = {
              temporal: 'How long the job has been posted and seasonal hiring patterns',
              content: 'Quality and specificity of the job description',
              company: 'Company reputation, size, and staffing agency indicators',
              behavioral: 'Application method, sponsored status, and applicant volume',
              community: 'User reports and community feedback',
              structural: 'Job posting structure and formatting'
            };
            return `
            <div style="background: ${theme.cardBg}; border-radius: 8px; padding: 12px; ${darkMode ? 'border: 1px solid ' + theme.cardBorder + ';' : ''}">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                <span style="text-transform: capitalize; color: ${theme.modalText}; font-weight: 500;">${category}</span>
                <span style="font-weight: 600; color: ${value > 50 ? '#ef4444' : value > 25 ? '#f59e0b' : '#10b981'};">
                  ${Math.round(value)}%
                </span>
              </div>
              <div style="font-size: 11px; color: ${theme.modalTextSecondary}; margin-bottom: 8px;">${categoryDescriptions[category] || 'Risk factors in this category'}</div>
              <div style="height: 4px; background: ${theme.progressBarBg}; border-radius: 2px; overflow: hidden;">
                <div style="
                  height: 100%;
                  width: ${value}%;
                  background: ${value > 50 ? '#ef4444' : value > 25 ? '#f59e0b' : '#10b981'};
                  border-radius: 2px;
                  transition: width 0.5s ease-out;
                "></div>
              </div>
            </div>
          `}).join('')}
      </div>

      <h3 style="font-size: 13px; color: ${theme.modalTextSecondary}; margin: 20px 0 12px; text-transform: uppercase; letter-spacing: 0.5px;">Detection Signals</h3>
      <div style="display: flex; flex-direction: column; gap: 8px;">
        ${scoreToShow.signals
          .filter((s) => s.normalizedValue > 0.1)
          .slice(0, 5)
          .map((s) => `
            <div style="padding: 12px; background: ${theme.cardBg}; border-radius: 8px; border-left: 3px solid ${s.normalizedValue > 0.5 ? '#ef4444' : s.normalizedValue > 0.25 ? '#f59e0b' : '#10b981'}; ${darkMode ? 'border: 1px solid ' + theme.cardBorder + '; border-left: 3px solid ' + (s.normalizedValue > 0.5 ? '#ef4444' : s.normalizedValue > 0.25 ? '#f59e0b' : '#10b981') + ';' : ''}">
              <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                <span style="font-weight: 500; color: ${theme.modalText};">${s.name}</span>
                <span style="font-size: 12px; font-weight: 600; color: ${s.normalizedValue > 0.5 ? '#ef4444' : s.normalizedValue > 0.25 ? '#f59e0b' : '#10b981'};">${Math.round(s.normalizedValue * 100)}%</span>
              </div>
              <div style="font-size: 12px; color: ${theme.modalTextSecondary};">${s.description}</div>
            </div>
          `).join('')}
      </div>

      <div style="margin-top: 20px; padding-top: 16px; border-top: 1px solid ${theme.cardBorder}; text-align: center;">
        <span style="font-size: 11px; color: ${theme.modalTextSecondary};">Powered by JobFiltr Ghost Detection</span>
      </div>
    `;

    modal.appendChild(content);

    // Add event listeners (not inline onclick which doesn't work in content scripts)
    const closeBtn = content.querySelector('.jobfiltr-close-btn');
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      modal.remove();
    });

    // Click outside to close
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });

    // Prevent clicks inside content from closing
    content.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    // ESC key to close
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        modal.remove();
        document.removeEventListener('keydown', handleEsc);
      }
    };
    document.addEventListener('keydown', handleEsc);

    document.body.appendChild(modal);

    // Trigger animations after modal is in DOM
    setTimeout(() => {
      animateScoreCount('jobfiltr-modal-score', scoreToShow.category === 'safe' ? (100 - scoreToShow.overall) : scoreToShow.overall, 1500);
      animateConfidenceCount('jobfiltr-modal-confidence', Math.round(scoreToShow.confidence * 100), 1500);
    }, 100);
  }

  // ============================================
  // PLATFORM DETECTION
  // ============================================

  function isLinkedIn() {
    return window.location.hostname.includes('linkedin.com') &&
           window.location.pathname.includes('/jobs');
  }

  function isIndeed() {
    return window.location.hostname.includes('indeed.com') &&
           (window.location.pathname.includes('/jobs') ||
            window.location.pathname.includes('/viewjob') ||
            window.location.search.includes('vjk='));
  }

  function extractLinkedInJob() {
    try {
      const container = document.querySelector(LINKEDIN_SELECTORS.jobDetail);
      if (!container) return null;

      const urlMatch = window.location.href.match(/\/jobs\/view\/(\d+)/);
      const id = urlMatch ? urlMatch[1] : `${Date.now()}`;

      const applicantText = getText(LINKEDIN_SELECTORS.applicants);
      const applicantMatch = applicantText.match(/(\d+)/);

      // Use enhanced posted date extraction
      const postedDate = extractPostedDate() || getText(LINKEDIN_SELECTORS.posted) || null;

      const job = {
        id: `linkedin_${id}`,
        platform: 'linkedin',
        url: window.location.href,
        title: getText(LINKEDIN_SELECTORS.title),
        company: getText(LINKEDIN_SELECTORS.company),
        location: getText(LINKEDIN_SELECTORS.location),
        postedDate: postedDate,
        description: getText(LINKEDIN_SELECTORS.description),
        applicantCount: applicantMatch ? parseInt(applicantMatch[1]) : undefined,
        isEasyApply: !!document.querySelector(LINKEDIN_SELECTORS.easyApply),
        isSponsored: !!document.querySelector(LINKEDIN_SELECTORS.promoted) ||
                     document.body.innerHTML.includes('Promoted'),
      };

      console.log('[GhostDetection] Extracted LinkedIn job:', {
        title: job.title?.substring(0, 50),
        company: job.company,
        postedDate: job.postedDate,
        applicantCount: job.applicantCount
      });

      return job;
    } catch (e) {
      console.error('[GhostDetection] LinkedIn extraction error:', e);
      return null;
    }
  }

  function extractIndeedJob() {
    try {
      const container = document.querySelector(INDEED_SELECTORS.jobDetail);
      if (!container) return null;

      // FIX: Generate truly unique job IDs to prevent score collisions
      // Priority order: URL params > DOM data attributes > content hash > unique counter
      const params = new URLSearchParams(window.location.search);
      let id = params.get('vjk') || params.get('jk');

      // If no URL param, try to get from DOM data attributes
      if (!id) {
        const jobCard = document.querySelector('[data-jk], [data-vjk], [data-job-id]');
        if (jobCard) {
          id = jobCard.getAttribute('data-jk') ||
               jobCard.getAttribute('data-vjk') ||
               jobCard.getAttribute('data-job-id');
        }
      }

      // Extract job data first so we can use it for ID generation if needed
      const title = getText(INDEED_SELECTORS.title);
      const company = getText(INDEED_SELECTORS.company);
      const location = getText(INDEED_SELECTORS.location);

      // If still no ID, create a content-based hash for consistent identification
      if (!id) {
        // Create a simple hash from job content for consistent IDs
        const contentKey = `${title}|${company}|${location}`.toLowerCase().replace(/\s+/g, '_');
        // Use a simple hash function for the content
        let hash = 0;
        for (let i = 0; i < contentKey.length; i++) {
          const char = contentKey.charCodeAt(i);
          hash = ((hash << 5) - hash) + char;
          hash = hash & hash; // Convert to 32bit integer
        }
        id = `content_${Math.abs(hash)}_${++uniqueIdCounter}`;
        console.log('[GhostDetection] Generated content-based ID:', id, 'from:', title, '@', company);
      }

      return {
        id: `indeed_${id}`,
        platform: 'indeed',
        url: window.location.href,
        title,
        company,
        location,
        postedDate: getText(INDEED_SELECTORS.posted) || null,
        description: getText(INDEED_SELECTORS.description),
        salary: getText(INDEED_SELECTORS.salary) || undefined,
        isEasyApply: !!document.querySelector(INDEED_SELECTORS.applyButton),
        isSponsored: !!document.querySelector(INDEED_SELECTORS.sponsored),
      };
    } catch (e) {
      console.error('[GhostDetection] Indeed extraction error:', e);
      return null;
    }
  }

  // ============================================
  // ANALYSIS HANDLERS
  // ============================================

  async function analyzeLinkedIn() {
    if (!config?.enabled) return;

    // Check if ghost analysis is enabled in filter settings
    const ghostSettings = await isGhostAnalysisEnabled();
    if (!ghostSettings.enabled) {
      console.log('[GhostDetection] Ghost analysis disabled in filter settings, skipping');
      return;
    }

    const job = extractLinkedInJob();
    if (!job || job.id === currentJob?.id) return;

    currentJob = job;
    console.log('[GhostDetection] Analyzing LinkedIn job:', job.title, '@', job.company, 'ID:', job.id);

    try {
      const score = await analyzeJob(job);
      currentScore = score;

      // FIX: Store score and job data in caches by job ID for accurate badge click handling
      jobScoreCache.set(job.id, score);
      jobDataCache.set(job.id, job);

      console.log(`[GhostDetection] Score: ${score.overall} (${score.category}) for job:`, job.id);

      // Ghost analysis badge automatically shows when toggle is ON
      if (config.showScores) {
        // FIX: Pass job ID to showDetails callback so clicking badge shows the correct job's score
        const jobId = job.id;
        injectScoreUI(score.overall, score.category, LINKEDIN_SELECTORS.scoreTargets, () => showDetails(jobId));
      }

      // Community-reported warnings badge (controlled by separate checkbox)
      if (ghostSettings.showCommunityWarnings) {
        const reportResult = detectReportedCompany(job.company);
        if (reportResult.detected) {
          console.log(`[GhostDetection] Community-reported company detected: ${reportResult.company?.name}`);
          injectReportedCompanyBadge(reportResult);
        }
      }
    } catch (e) {
      console.error('[GhostDetection] LinkedIn analysis error:', e);
    }
  }

  async function analyzeIndeed() {
    if (!config?.enabled) return;

    // Check if ghost analysis is enabled in filter settings
    const ghostSettings = await isGhostAnalysisEnabled();
    if (!ghostSettings.enabled) {
      console.log('[GhostDetection] Ghost analysis disabled in filter settings, skipping');
      return;
    }

    const job = extractIndeedJob();
    if (!job || job.id === currentJob?.id) return;

    currentJob = job;
    console.log('[GhostDetection] Analyzing Indeed job:', job.title, '@', job.company, 'ID:', job.id);

    try {
      const score = await analyzeJob(job);
      currentScore = score;

      // FIX: Store score and job data in caches by job ID for accurate badge click handling
      jobScoreCache.set(job.id, score);
      jobDataCache.set(job.id, job);

      console.log(`[GhostDetection] Score: ${score.overall} (${score.category}) for job:`, job.id);

      // Ghost analysis badge automatically shows when toggle is ON
      if (config.showScores) {
        // FIX: Pass job ID to showDetails callback so clicking badge shows the correct job's score
        const jobId = job.id;
        injectScoreUI(score.overall, score.category, INDEED_SELECTORS.scoreTargets, () => showDetails(jobId));
      }

      // Community-reported warnings badge (controlled by separate checkbox)
      if (ghostSettings.showCommunityWarnings) {
        const reportResult = detectReportedCompany(job.company);
        if (reportResult.detected) {
          console.log(`[GhostDetection] Community-reported company detected: ${reportResult.company?.name}`);
          injectReportedCompanyBadge(reportResult);
        }
      }
    } catch (e) {
      console.error('[GhostDetection] Indeed analysis error:', e);
    }
  }

  // ============================================
  // OBSERVERS
  // ============================================

  function startObserving() {
    if (observer) observer.disconnect();

    observer = new MutationObserver(() => {
      if (isLinkedIn()) {
        const urlMatch = window.location.href.match(/\/jobs\/view\/(\d+)/);
        const jobId = urlMatch ? urlMatch[1] : null;
        if (jobId && jobId !== currentJobId) {
          currentJobId = jobId;
          setTimeout(analyzeLinkedIn, 500);
        }
      } else if (isIndeed()) {
        const params = new URLSearchParams(window.location.search);
        const jobId = params.get('vjk') || params.get('jk');
        if (jobId && jobId !== currentJobId) {
          currentJobId = jobId;
          setTimeout(analyzeIndeed, 500);
        }
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  // ============================================
  // INITIALIZATION
  // ============================================

  async function initialize() {
    if (initialized) return;

    // Check if extension context is still valid
    if (!isExtensionContextValid()) {
      console.log('[GhostDetection] Extension context invalidated, aborting initialization');
      return;
    }

    console.log('[GhostDetection] Initializing...');

    config = await loadConfig();

    if (!config.enabled) {
      console.log('[GhostDetection] Detection disabled');
      return;
    }

    if (isLinkedIn()) {
      console.log('[GhostDetection] LinkedIn detected');
      setTimeout(analyzeLinkedIn, 1000);
      startObserving();
    } else if (isIndeed()) {
      console.log('[GhostDetection] Indeed detected');
      setTimeout(analyzeIndeed, 1000);
      startObserving();
    }

    initialized = true;
    console.log('[GhostDetection] Initialized successfully');
  }

  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }

  // Handle SPA navigation
  let lastUrl = window.location.href;
  const navigationInterval = setInterval(() => {
    // Stop the interval if extension context is invalidated
    if (!isExtensionContextValid()) {
      console.log('[GhostDetection] Extension context invalidated, stopping navigation observer');
      clearInterval(navigationInterval);
      return;
    }

    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;
      currentJob = null;
      currentScore = null;
      currentJobId = null;

      // Limit cache size to prevent memory issues (keep last 50 jobs)
      if (jobScoreCache.size > 50) {
        const keysToDelete = [...jobScoreCache.keys()].slice(0, jobScoreCache.size - 50);
        keysToDelete.forEach(k => {
          jobScoreCache.delete(k);
          jobDataCache.delete(k);
        });
      }

      if (isLinkedIn() || isIndeed()) {
        setTimeout(() => {
          if (isLinkedIn()) analyzeLinkedIn();
          else if (isIndeed()) analyzeIndeed();
        }, 500);
      }
    }
  }, 1000);

})();
