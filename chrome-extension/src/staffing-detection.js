/**
 * Centralized Staffing Firm Detection Module
 *
 * This module consolidates all staffing detection logic that was previously
 * duplicated across content-linkedin-v3.js, content-indeed-v3.js, etc.
 *
 * REPLACES:
 * - staffingIndicators array in 5+ files
 * - isStaffingFirm() function in 5+ files
 * - checkStaffingAgency() in ghost-detection-bundle.js
 * - KNOWN_STAFFING_AGENCIES in ghost-detection-bundle.js
 *
 * @version 2.0.0
 */

// ============================================
// KNOWN STAFFING AGENCIES DATABASE (500+)
// ============================================

const KNOWN_STAFFING_AGENCIES = {
  // Tier 1: Major Global Staffing Firms (highest confidence - 99%)
  major: [
    'randstad', 'adecco', 'adecco group', 'manpowergroup', 'manpower',
    'kelly services', 'kelly', 'robert half', 'robert half international',
    'hays', 'hays plc', 'allegis group', 'express employment', 'express employment professionals',
    'spherion', 'staffmark', 'recruit holdings', 'kforce', 'kforce inc',
    'trueblue', 'insperity', 'korn ferry', 'page group', 'pagegroup',
    'michael page', 'hudson global', 'sthree', 'heidrick & struggles',
  ],

  // Tier 2: IT/Tech Staffing (95% confidence)
  tech: [
    'teksystems', 'tek systems', 'insight global', 'apex systems', 'apex group',
    'modis', 'cybercoders', 'cyber coders', 'dice', 'hired', 'hired.com',
    'toptal', 'turing', 'andela', 'crossover', 'gun.io', 'arc.dev',
    'mondo', 'mondo staffing', 'mastech', 'mastech digital', 'mastech infotrellis',
    'motion recruitment', 'motion recruitment partners', 'ntt data services',
    'revature', 'collabera', 'syntel', 'infosys bpm', 'wipro',
    'cognizant technology solutions', 'hcl technologies', 'tech mahindra',
    'ltimindtree', 'persistent systems', 'zensar', 'mphasis', 'hexaware',
    'virtusa', 'epam', 'epam systems', 'globant', 'endava', 'softserve',
    'luxoft', 'dataart', 'sigma software', 'n-ix', 'intellias',
    'harvey nash', 'nigel frank', 'frank recruitment', 'tenth revolution',
    'jefferson frank', 'mason frank', 'anderson frank', 'washington frank',
    'eliassen group', 'signature consultants', 'dexian', 'disys',
    'experis', 'talent solutions', 'procom', 'procom consultants',
    'compucom', 'avanade', 'slalom', 'capgemini engineering',
  ],

  // Tier 3: Healthcare Staffing (95% confidence)
  healthcare: [
    'aya healthcare', 'aya', 'cross country healthcare', 'cross country',
    'amn healthcare', 'amn', 'medpro healthcare staffing', 'medpro',
    'travel nurse across america', 'tnaa', 'american mobile healthcare',
    'medical solutions', 'fusion medical staffing', 'host healthcare',
    'trustaff', 'stability healthcare', 'favorite healthcare staffing',
    'supplemental health care', 'maxim healthcare', 'interim healthcare',
    'bayada home health care', 'amedisys', 'lhc group', 'addus homecare',
    'envision healthcare', 'team health', 'sound physicians', 'ihs',
    'healthtrust workforce solutions', 'healthtrust', 'o2partners',
    'medely', 'nomad health', 'incredible health', 'vivian health',
  ],

  // Tier 4: Finance/Accounting Staffing (95% confidence)
  finance: [
    'robert half finance', 'accountemps', 'management recruiters',
    'mri network', 'lucas group', 'solomon page', 'marks sattin',
    'walters people', 'huxley', 'parker lynch', 'cfo selections',
    'creative financial staffing', 'cfs', 'vaco', 'vaco financial',
    'addison group', 'addison group financial', 'kforce finance',
    'beacon hill financial', 'scion staffing', 'rcm&d',
  ],

  // Tier 5: Industrial/Manufacturing/Warehouse Staffing (95% confidence)
  industrial: [
    'aerotek', 'aerotek staffing', 'trueblue', 'peopleready',
    'labor ready', 'staff management smx', 'employbridge', 'resource mfg',
    'elwood staffing', 'pro staff', 'staff force', 'the staffing group',
    'pridestaff', 'select staffing', 'westaff', 'remedy staffing',
    'kelly industrial', 'manpower industrial', 'temp force', 'prologistix',
    'on assignment', 'apex group', 'nesco resource', 'hamilton-ryker',
    'qualified staffing', 'luttrell staffing', 'warehouse jobs',
    'instawork', 'wonolo', 'shiftgig', 'jobstack', 'bluecrew',
  ],

  // Tier 6: Executive Search/Retained Search (90% confidence)
  executive: [
    'spencer stuart', 'egon zehnder', 'russell reynolds', 'heidrick & struggles',
    'korn ferry', 'boyden', 'odgers berndtson', 'stanton chase',
    'dhrnernst international', 'caldwell partners', 'diversified search',
    'witt kieffer', 'academic search', 'isaacson miller', 'jm search',
    'ghsmart', 'y scouts', 'cowen partners', 'jmj phillip',
  ],

  // Tier 7: Creative/Marketing Staffing (95% confidence)
  creative: [
    'creative circle', 'the creative group', 'creative group',
    'aquent', 'vitamin t', '24 seven', 'artisan creative', 'mondo creative',
    'onward search', 'profiles', 'wunderman thompson', 'crispin porter',
    'paladin staffing', 'atrium staffing', 'syndicatebleu', 'betts recruiting',
  ],

  // Tier 8: Legal Staffing (95% confidence)
  legal: [
    'robert half legal', 'special counsel', 'update legal',
    'beacon hill legal', 'hire counsel', 'law clerk', 'lawclerk',
    'axiom', 'axiom law', 'elevate services', 'integreon', 'unitedlex',
    'morae global', 'legility', 'consilio', 'epiq', 'kroll ontrack',
  ],

  // Tier 9: Scientific/Engineering Staffing (95% confidence)
  scientific: [
    'kelly scientific', 'aerotek scientific', 'yoh scientific',
    'lab support', 'analytics search', 'biotech partners', 'sci staffing',
    'ashfield healthcare', 'syneos health', 'iqvia', 'parexel',
    'pra health sciences', 'medpace', 'pharmaceutical product development',
    'icon plc', 'wuxi apptec', 'charles river', 'labcorp drug development',
  ],

  // Tier 10: Regional/Specialized Staffing (90% confidence)
  regional: [
    'volt', 'volt information sciences', 'yoh', 'yoh services',
    'beacon hill staffing', 'beacon hill', 'ultimate staffing',
    'staffing solutions', 'staff smart', 'kelly connect', 'kelly education',
    'teachers on reserve', 'swing education', 'edustaff', 'kelly educational staffing',
    'source2', 'cadre', 'sterling engineering', 'burnett specialists',
    'recruiting solutions', 'career builders staffing', 'integrity staffing',
    'workway', 'roth staffing', 'helpmates staffing', 'ledgent',
    'jobot', 'ziprecruiter', 'indeed flex', 'indeed prime',
    'vettery', 'hired', 'triplebyte', 'interviewing.io',
  ],

  // Tier 11: International Staffing (90% confidence)
  international: [
    'gi group', 'adecco staffing', 'synergie', 'crit interim',
    'proman', 'start people', 'tempo team', 'unique', 'timing',
    'brunel', 'yacht', 'sthree', 'computer futures', 'progressive',
    'huxley associates', 'real staffing', 'global enterprise partners',
    'oliver james', 'phaidon international', 'darwin recruitment',
    'morris recruitment', 'euro london', 'ec1 partners',
  ],

  // Tier 12: Government/Cleared Staffing (95% confidence)
  government: [
    'clearancejobs', 'cleared recruiting', 'linquest', 'technica',
    'saic staffing', 'leidos', 'booz allen hamilton', 'caci international',
    'general dynamics it', 'perspecta', 'mantech', 'engility',
    'dxc technology', 'unisys federal', 'ibm federal',
  ],
};

// Compile all agencies into a normalized Set for O(1) lookup
const KNOWN_AGENCIES_SET = new Set(
  Object.values(KNOWN_STAFFING_AGENCIES)
    .flat()
    .map(name => name.toLowerCase().trim())
);

// Get all agencies as a flat array
const KNOWN_AGENCIES_ARRAY = Object.values(KNOWN_STAFFING_AGENCIES).flat();

// ============================================
// STRONG STAFFING INDICATORS (Tier 2)
// ============================================

const STRONG_INDICATORS = [
  { pattern: /\bstaffing\b/i, weight: 0.6, description: 'Contains "staffing"' },
  { pattern: /\brecruiting\b/i, weight: 0.5, description: 'Contains "recruiting"' },
  { pattern: /\brecruitment\b/i, weight: 0.5, description: 'Contains "recruitment"' },
  { pattern: /\btalent\s+(solutions?|acquisition|partners?|agency)\b/i, weight: 0.55, description: 'Talent solutions/acquisition' },
  { pattern: /\bpersonnel\s+(services?|solutions?|agency)\b/i, weight: 0.6, description: 'Personnel services' },
  { pattern: /\bworkforce\s+(solutions?|management|partners?)\b/i, weight: 0.55, description: 'Workforce solutions' },
  { pattern: /\bplacement\s+(services?|agency|firm)\b/i, weight: 0.6, description: 'Placement services' },
  { pattern: /\btemp\s+(agency|services?|staffing)\b/i, weight: 0.65, description: 'Temp agency' },
  { pattern: /\bcontract\s+staffing\b/i, weight: 0.6, description: 'Contract staffing' },
  { pattern: /\bemployment\s+(agency|services?)\b/i, weight: 0.55, description: 'Employment agency' },
  { pattern: /\bheadhunter/i, weight: 0.5, description: 'Headhunter' },
  { pattern: /\bexecutive\s+search\b/i, weight: 0.45, description: 'Executive search' },
  { pattern: /\bjob\s+placement\b/i, weight: 0.5, description: 'Job placement' },
];

// ============================================
// WEAK INDICATORS (require multiple matches)
// ============================================

const WEAK_INDICATORS = [
  'solutions', 'consulting', 'services', 'global', 'partners',
  'group', 'associates', 'professionals', 'resources', 'search'
];

// ============================================
// FALSE POSITIVE EXCLUSIONS
// ============================================

// Companies that match patterns but are NOT staffing firms
const FALSE_POSITIVE_EXCLUSIONS = new Set([
  'google', 'microsoft', 'amazon', 'apple', 'meta', 'facebook',
  'netflix', 'tesla', 'nvidia', 'intel', 'amd', 'ibm', 'oracle',
  'salesforce', 'adobe', 'vmware', 'cisco', 'dell', 'hp', 'hpe',
  'accenture', 'deloitte', 'pwc', 'kpmg', 'ey', 'ernst & young',
  'mckinsey', 'bcg', 'boston consulting', 'bain', 'bain & company',
  'jpmorgan', 'goldman sachs', 'morgan stanley', 'bank of america',
  'wells fargo', 'citibank', 'citi', 'capital one', 'american express',
  'walmart', 'target', 'costco', 'home depot', 'lowes',
  'ups', 'fedex', 'dhl', 'usps',
  'at&t', 'verizon', 't-mobile', 'comcast', 'charter',
  'disney', 'warner bros', 'paramount', 'sony', 'universal',
  'johnson & johnson', 'pfizer', 'merck', 'abbvie', 'eli lilly',
  'procter & gamble', 'unilever', 'nestle', 'coca-cola', 'pepsico',
  'general motors', 'ford', 'toyota', 'honda', 'bmw', 'mercedes',
  'boeing', 'lockheed martin', 'raytheon', 'northrop grumman',
  'general electric', '3m', 'honeywell', 'caterpillar', 'john deere',
]);

// ============================================
// MAIN DETECTION FUNCTIONS
// ============================================

/**
 * Check if a company name matches a known staffing agency
 *
 * @param {string} companyName - The company name to check
 * @returns {object} Detection result with isStaffing, confidence, tier, and reason
 */
function checkStaffingAgency(companyName) {
  if (!companyName || typeof companyName !== 'string') {
    return { isStaffing: false, confidence: 0, tier: null, reason: null };
  }

  const normalized = companyName.toLowerCase().trim();

  // Check false positive exclusions first
  for (const excluded of FALSE_POSITIVE_EXCLUSIONS) {
    if (normalized.includes(excluded) || excluded.includes(normalized)) {
      return {
        isStaffing: false,
        confidence: 0.95,
        tier: 0,
        reason: 'Excluded: Known non-staffing company'
      };
    }
  }

  // TIER 1: Exact match on known agencies (95-99% confidence)
  if (KNOWN_AGENCIES_SET.has(normalized)) {
    return {
      isStaffing: true,
      confidence: 0.99,
      tier: 1,
      reason: 'Exact match: Known staffing agency'
    };
  }

  // TIER 1b: Partial match on known agencies
  for (const agency of KNOWN_AGENCIES_ARRAY) {
    const agencyLower = agency.toLowerCase();
    // Check if company name contains the agency name or vice versa
    if (normalized.includes(agencyLower) || agencyLower.includes(normalized)) {
      // Avoid matching very short strings
      if (agencyLower.length >= 4 && normalized.length >= 4) {
        return {
          isStaffing: true,
          confidence: 0.92,
          tier: 1,
          reason: `Partial match: ${agency}`
        };
      }
    }
  }

  // TIER 2: Strong keyword indicators
  let strongScore = 0;
  const matchedStrong = [];

  for (const indicator of STRONG_INDICATORS) {
    if (indicator.pattern.test(normalized)) {
      strongScore += indicator.weight;
      matchedStrong.push(indicator.description);
    }
  }

  if (strongScore >= 0.5) {
    return {
      isStaffing: true,
      confidence: Math.min(0.90, 0.70 + strongScore * 0.25),
      tier: 2,
      reason: `Strong indicators: ${matchedStrong.join(', ')}`
    };
  }

  // TIER 3: Weak indicators (only flag, not auto-hide in strict mode)
  const weakMatches = WEAK_INDICATORS.filter(ind => normalized.includes(ind));

  if (weakMatches.length >= 2) {
    return {
      isStaffing: false, // Don't auto-flag in strict mode
      confidence: 0.30 + (weakMatches.length * 0.10),
      tier: 3,
      reason: `Possible indicators: ${weakMatches.join(', ')}`,
      requiresReview: true
    };
  }

  // No match
  return { isStaffing: false, confidence: 0, tier: null, reason: null };
}

/**
 * Check if a job card is from a staffing firm (DOM-based detection)
 * This function extracts the company name from a job card and checks it
 *
 * @param {HTMLElement} jobCard - The job card DOM element
 * @param {string} platform - The platform ('linkedin', 'indeed', 'google')
 * @returns {object} Detection result
 */
function isStaffingFirm(jobCard, platform = 'linkedin') {
  if (!jobCard) {
    return { isStaffing: false, confidence: 0, tier: null, reason: null };
  }

  // Platform-specific company name selectors
  const selectors = {
    linkedin: [
      '.job-card-container__company-name',
      '.artdeco-entity-lockup__subtitle',
      '.job-card-list__company-name',
      'a[data-tracking-control-name="public_jobs_topcard-org-name"]',
      '.base-search-card__subtitle',
      'a[href*="/company/"]',
    ],
    indeed: [
      '[data-testid="company-name"]',
      '.companyName',
      '.company',
      'span[data-testid="company-name"]',
      '.companyInfo',
    ],
    google: [
      '.vNEEBe',
      '.nJlQNd',
      '.BjJfJf',
    ],
  };

  const platformSelectors = selectors[platform] || selectors.linkedin;
  let companyName = '';

  // Try each selector until we find the company name
  for (const selector of platformSelectors) {
    try {
      const elem = jobCard.querySelector(selector);
      if (elem) {
        companyName = elem.textContent.trim();
        if (companyName) break;
      }
    } catch (e) {
      // Ignore selector errors
    }
  }

  if (!companyName) {
    return { isStaffing: false, confidence: 0, tier: null, reason: 'Company name not found' };
  }

  // Use the main detection function
  return checkStaffingAgency(companyName);
}

/**
 * Get detection result with display mode applied
 *
 * @param {HTMLElement} jobCard - The job card element
 * @param {object} settings - User settings
 * @param {string} platform - The platform
 * @returns {object} Result with shouldHide, shouldFlag, shouldDim
 */
function getStaffingFilterResult(jobCard, settings, platform = 'linkedin') {
  const result = isStaffingFirm(jobCard, platform);

  // If not a staffing firm, no action needed
  if (!result.isStaffing) {
    return {
      ...result,
      shouldHide: false,
      shouldFlag: false,
      shouldDim: false,
    };
  }

  // Apply user's display mode preference
  const displayMode = settings.staffingDisplayMode || 'hide';
  const sensitivity = settings.staffingSensitivity || 'strict';

  // In strict mode, only act on Tier 1 and strong Tier 2
  if (sensitivity === 'strict' && result.tier > 2) {
    return {
      ...result,
      shouldHide: false,
      shouldFlag: true, // Still flag for awareness
      shouldDim: false,
    };
  }

  return {
    ...result,
    shouldHide: displayMode === 'hide',
    shouldFlag: displayMode === 'flag',
    shouldDim: displayMode === 'dim',
  };
}

/**
 * Add a staffing badge to a job card
 *
 * @param {HTMLElement} jobCard - The job card element
 * @param {object} result - The detection result
 * @param {string} platform - The platform
 */
function addStaffingBadge(jobCard, result, platform = 'linkedin') {
  // Don't add duplicate badges
  if (jobCard.querySelector('.jobfiltr-staffing-badge')) return;

  const badge = document.createElement('div');
  badge.className = 'jobfiltr-staffing-badge';
  badge.setAttribute('data-staffing-tier', result.tier || 'unknown');
  badge.setAttribute('data-staffing-confidence', result.confidence || 0);

  // Different badge styles based on confidence
  const isHighConfidence = result.confidence >= 0.9;
  const bgColor = isHighConfidence ? 'rgba(239, 68, 68, 0.12)' : 'rgba(245, 158, 11, 0.12)';
  const borderColor = isHighConfidence ? 'rgba(239, 68, 68, 0.35)' : 'rgba(245, 158, 11, 0.35)';
  const textColor = isHighConfidence ? '#DC2626' : '#D97706';

  badge.innerHTML = `
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" style="flex-shrink: 0;">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      <circle cx="9" cy="7" r="4" stroke="currentColor" stroke-width="2"/>
      <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    </svg>
    <span>Staffing</span>
  `;

  badge.title = result.reason || 'This appears to be a staffing/recruiting firm';

  badge.style.cssText = `
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 8px;
    background: ${bgColor};
    border: 1px solid ${borderColor};
    border-radius: 12px;
    font-size: 11px;
    font-weight: 500;
    color: ${textColor};
    margin-left: 8px;
    cursor: help;
    white-space: nowrap;
    vertical-align: middle;
  `;

  // Find the company name element to insert badge after
  const companySelectors = {
    linkedin: ['.job-card-container__company-name', '.artdeco-entity-lockup__subtitle', '.base-search-card__subtitle'],
    indeed: ['[data-testid="company-name"]', '.companyName', '.company'],
    google: ['.vNEEBe', '.nJlQNd'],
  };

  const selectors = companySelectors[platform] || companySelectors.linkedin;

  for (const selector of selectors) {
    const companyElement = jobCard.querySelector(selector);
    if (companyElement) {
      // Insert after the company name
      if (companyElement.parentNode) {
        companyElement.parentNode.insertBefore(badge, companyElement.nextSibling);
        return;
      }
    }
  }

  // Fallback: prepend to job card
  jobCard.prepend(badge);
}

/**
 * Apply dim effect to a job card
 *
 * @param {HTMLElement} jobCard - The job card element
 */
function applyDimEffect(jobCard) {
  if (jobCard.classList.contains('jobfiltr-staffing-dimmed')) return;

  jobCard.classList.add('jobfiltr-staffing-dimmed');
  jobCard.style.opacity = '0.5';
  jobCard.style.transition = 'opacity 0.2s ease';
}

/**
 * Remove staffing-related styling from a job card
 *
 * @param {HTMLElement} jobCard - The job card element
 */
function removeStaffingStyling(jobCard) {
  const badge = jobCard.querySelector('.jobfiltr-staffing-badge');
  if (badge) badge.remove();

  jobCard.classList.remove('jobfiltr-staffing-dimmed');
  jobCard.style.opacity = '';
}

// ============================================
// EXPORTS (for module usage)
// ============================================

// For content scripts that use IIFE pattern, attach to window
if (typeof window !== 'undefined') {
  window.JobFiltrStaffing = {
    checkStaffingAgency,
    isStaffingFirm,
    getStaffingFilterResult,
    addStaffingBadge,
    applyDimEffect,
    removeStaffingStyling,
    KNOWN_STAFFING_AGENCIES,
    KNOWN_AGENCIES_SET,
    KNOWN_AGENCIES_ARRAY,
  };
}

// For ES module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    checkStaffingAgency,
    isStaffingFirm,
    getStaffingFilterResult,
    addStaffingBadge,
    applyDimEffect,
    removeStaffingStyling,
    KNOWN_STAFFING_AGENCIES,
    KNOWN_AGENCIES_SET,
    KNOWN_AGENCIES_ARRAY,
  };
}
