// LinkedIn Filters TDD Tests
// Tests for content-linkedin-v3.js filter functions

// ============================================================================
// TEST FRAMEWORK
// ============================================================================

let testsPassed = 0;
let testsFailed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
    testsPassed++;
  } catch (error) {
    console.log(`✗ ${name}`);
    console.log(`  Error: ${error.message}`);
    testsFailed++;
  }
}

function expect(actual) {
  return {
    toBe: (expected) => {
      if (actual !== expected) {
        throw new Error(`Expected ${expected} but got ${actual}`);
      }
    },
    toBeTruthy: () => {
      if (!actual) {
        throw new Error(`Expected truthy value but got ${actual}`);
      }
    },
    toBeFalsy: () => {
      if (actual) {
        throw new Error(`Expected falsy value but got ${actual}`);
      }
    },
    toBeNull: () => {
      if (actual !== null) {
        throw new Error(`Expected null but got ${actual}`);
      }
    },
    toBeGreaterThan: (expected) => {
      if (actual <= expected) {
        throw new Error(`Expected ${actual} to be greater than ${expected}`);
      }
    },
    toContain: (expected) => {
      if (!actual.includes(expected)) {
        throw new Error(`Expected "${actual}" to contain "${expected}"`);
      }
    }
  };
}

// ============================================================================
// MOCK DOM HELPERS
// ============================================================================

function createMockJobCard(options = {}) {
  const card = document.createElement('li');
  card.className = 'scaffold-layout__list-item';

  if (options.jobId) {
    card.dataset.jobId = options.jobId;
  }

  if (options.entityUrn) {
    card.setAttribute('data-entity-urn', options.entityUrn);
  }

  // Add job link
  const link = document.createElement('a');
  link.href = options.jobLink || 'https://www.linkedin.com/jobs/view/123456789';
  link.className = 'job-card-container__link';
  link.textContent = options.title || 'Software Engineer';
  card.appendChild(link);

  // Add company name
  const company = document.createElement('div');
  company.className = 'job-card-container__company-name';
  company.textContent = options.company || 'Tech Company';
  card.appendChild(company);

  // Add additional text content
  if (options.text) {
    const text = document.createElement('div');
    text.textContent = options.text;
    card.appendChild(text);
  }

  return card;
}

// ============================================================================
// JOB AGE PARSING TESTS
// ============================================================================

console.log('\n=== Job Age Parsing Tests ===\n');

// Simulate parseAgeFromText function
const AGE_PATTERNS = [
  { pattern: /(\d+)\s*(?:seconds?|secs?)\s*ago/i, unit: 'second' },
  { pattern: /(\d+)\s*(?:minutes?|mins?)\s*ago/i, unit: 'minute' },
  { pattern: /(\d+)\s*(?:hours?|hrs?)\s*ago/i, unit: 'hour' },
  { pattern: /(\d+)\s*(?:days?)\s*ago/i, unit: 'day' },
  { pattern: /(\d+)\s*(?:weeks?|wks?)\s*ago/i, unit: 'week' },
  { pattern: /(\d+)\s*(?:months?|mos?)\s*ago/i, unit: 'month' },
  { pattern: /just\s*(?:now|posted)/i, unit: 'now' },
  { pattern: /posted\s*today/i, unit: 'today' },
  { pattern: /yesterday/i, unit: 'yesterday' },
  { pattern: /reposted/i, unit: 'reposted' }
];

function parseAgeFromText(text) {
  if (!text) return null;

  for (const { pattern, unit } of AGE_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      const value = parseInt(match[1], 10) || 0;

      switch (unit) {
        case 'second':
        case 'minute':
        case 'now':
        case 'today':
          return 0;
        case 'yesterday':
          return 1;
        case 'hour':
          return value / 24;
        case 'day':
          return value;
        case 'week':
          return value * 7;
        case 'month':
          return value * 30;
        case 'reposted':
          return 30;
        default:
          return null;
      }
    }
  }

  return null;
}

test('parseAgeFromText: "2 days ago" returns 2', () => {
  const result = parseAgeFromText('Posted 2 days ago');
  expect(result).toBe(2);
});

test('parseAgeFromText: "1 day ago" returns 1', () => {
  const result = parseAgeFromText('1 day ago');
  expect(result).toBe(1);
});

test('parseAgeFromText: "5 hours ago" returns fractional days', () => {
  const result = parseAgeFromText('5 hours ago');
  expect(result).toBe(5 / 24);
});

test('parseAgeFromText: "1 week ago" returns 7', () => {
  const result = parseAgeFromText('1 week ago');
  expect(result).toBe(7);
});

test('parseAgeFromText: "2 weeks ago" returns 14', () => {
  const result = parseAgeFromText('2 weeks ago');
  expect(result).toBe(14);
});

test('parseAgeFromText: "1 month ago" returns 30', () => {
  const result = parseAgeFromText('1 month ago');
  expect(result).toBe(30);
});

test('parseAgeFromText: "just posted" returns 0', () => {
  const result = parseAgeFromText('just posted');
  expect(result).toBe(0);
});

test('parseAgeFromText: "posted today" returns 0', () => {
  const result = parseAgeFromText('posted today');
  expect(result).toBe(0);
});

test('parseAgeFromText: "yesterday" returns 1', () => {
  const result = parseAgeFromText('yesterday');
  expect(result).toBe(1);
});

test('parseAgeFromText: "reposted" returns 30 (assume old)', () => {
  const result = parseAgeFromText('reposted');
  expect(result).toBe(30);
});

test('parseAgeFromText: empty string returns null', () => {
  const result = parseAgeFromText('');
  expect(result).toBeNull();
});

test('parseAgeFromText: no age pattern returns null', () => {
  const result = parseAgeFromText('Some random text without age');
  expect(result).toBeNull();
});

// ============================================================================
// STAFFING FIRM DETECTION TESTS
// ============================================================================

console.log('\n=== Staffing Firm Detection Tests ===\n');

const STAFFING_KEYWORDS = [
  'staffing', 'recruiting', 'recruitment', 'talent acquisition',
  'placement', 'agency', 'consultancy', 'solutions',
  'apex systems', 'robert half', 'randstad', 'manpower',
  'kelly services', 'adecco', 'express employment',
  'insight global', 'tek systems', 'aerotek', 'hays',
  'beacon hill', 'modis', 'kforce', 'collabera',
  'cybercoders', 'hireright', 'jobot', 'talentbridge'
];

function isStaffingFirm(companyName, title = '', text = '') {
  const companyLower = companyName.toLowerCase();
  const titleLower = title.toLowerCase();

  for (const keyword of STAFFING_KEYWORDS) {
    if (companyLower.includes(keyword) || titleLower.includes(keyword)) {
      return true;
    }
  }

  if (/\b(staffing|recruiting|recruitment|talent)\b/.test(companyLower)) {
    return true;
  }

  return false;
}

test('isStaffingFirm: "Robert Half" is staffing', () => {
  expect(isStaffingFirm('Robert Half')).toBeTruthy();
});

test('isStaffingFirm: "Apex Systems" is staffing', () => {
  expect(isStaffingFirm('Apex Systems')).toBeTruthy();
});

test('isStaffingFirm: "Randstad" is staffing', () => {
  expect(isStaffingFirm('Randstad')).toBeTruthy();
});

test('isStaffingFirm: "ABC Staffing Solutions" is staffing', () => {
  expect(isStaffingFirm('ABC Staffing Solutions')).toBeTruthy();
});

test('isStaffingFirm: "Tech Recruiting Inc" is staffing', () => {
  expect(isStaffingFirm('Tech Recruiting Inc')).toBeTruthy();
});

test('isStaffingFirm: "Google" is NOT staffing', () => {
  expect(isStaffingFirm('Google')).toBeFalsy();
});

test('isStaffingFirm: "Microsoft" is NOT staffing', () => {
  expect(isStaffingFirm('Microsoft')).toBeFalsy();
});

test('isStaffingFirm: "Amazon" is NOT staffing', () => {
  expect(isStaffingFirm('Amazon')).toBeFalsy();
});

// ============================================================================
// EARLY APPLICANT DETECTION TESTS
// ============================================================================

console.log('\n=== Early Applicant Detection Tests ===\n');

const EARLY_APPLICANT_PATTERNS = [
  /be among the first \d+ applicants?/i,
  /be one of the first \d+ applicants?/i,
  /be among the first to apply/i,
  /early applicant/i,
  /fewer than \d+ applicants?/i,
  /less than \d+ applicants?/i,
  /only \d+ applicants?/i
];

function isEarlyApplicant(text) {
  return EARLY_APPLICANT_PATTERNS.some(pattern => pattern.test(text));
}

test('isEarlyApplicant: "Be among the first 25 applicants" is early', () => {
  expect(isEarlyApplicant('Be among the first 25 applicants')).toBeTruthy();
});

test('isEarlyApplicant: "Be one of the first 10 applicants" is early', () => {
  expect(isEarlyApplicant('Be one of the first 10 applicants')).toBeTruthy();
});

test('isEarlyApplicant: "Early applicant opportunity" is early', () => {
  expect(isEarlyApplicant('Early applicant opportunity')).toBeTruthy();
});

test('isEarlyApplicant: "Fewer than 10 applicants" is early', () => {
  expect(isEarlyApplicant('Fewer than 10 applicants')).toBeTruthy();
});

test('isEarlyApplicant: "Only 5 applicants" is early', () => {
  expect(isEarlyApplicant('Only 5 applicants')).toBeTruthy();
});

test('isEarlyApplicant: "Over 100 applicants" is NOT early', () => {
  expect(isEarlyApplicant('Over 100 applicants')).toBeFalsy();
});

test('isEarlyApplicant: "200+ applicants" is NOT early', () => {
  expect(isEarlyApplicant('200+ applicants')).toBeFalsy();
});

// ============================================================================
// APPLIED JOB DETECTION TESTS
// ============================================================================

console.log('\n=== Applied Job Detection Tests ===\n');

const APPLIED_PATTERNS = [
  /\bapplied\b/i,
  /\byou applied\b/i,
  /\bapplication sent\b/i,
  /\bapplication submitted\b/i
];

function hasAppliedText(text) {
  return APPLIED_PATTERNS.some(pattern => pattern.test(text));
}

test('hasAppliedText: "Applied" is detected', () => {
  expect(hasAppliedText('Applied')).toBeTruthy();
});

test('hasAppliedText: "You applied 2 days ago" is detected', () => {
  expect(hasAppliedText('You applied 2 days ago')).toBeTruthy();
});

test('hasAppliedText: "Application sent" is detected', () => {
  expect(hasAppliedText('Application sent')).toBeTruthy();
});

test('hasAppliedText: "Application submitted" is detected', () => {
  expect(hasAppliedText('Application submitted')).toBeTruthy();
});

test('hasAppliedText: No applied text is NOT detected', () => {
  expect(hasAppliedText('Apply now for this position')).toBeFalsy();
});

// ============================================================================
// SPONSORED/PROMOTED DETECTION TESTS
// ============================================================================

console.log('\n=== Sponsored Detection Tests ===\n');

function isSponsored(text) {
  return /\bpromoted\b/i.test(text) || /\bsponsored\b/i.test(text);
}

test('isSponsored: "Promoted" is detected', () => {
  expect(isSponsored('Promoted')).toBeTruthy();
});

test('isSponsored: "Promoted by hirer" is detected', () => {
  expect(isSponsored('Promoted by hirer')).toBeTruthy();
});

test('isSponsored: "Sponsored" is detected', () => {
  expect(isSponsored('Sponsored')).toBeTruthy();
});

test('isSponsored: Regular job is NOT sponsored', () => {
  expect(isSponsored('Software Engineer at Google')).toBeFalsy();
});

// ============================================================================
// KEYWORD MATCHING TESTS
// ============================================================================

console.log('\n=== Keyword Matching Tests ===\n');

// Normalize keywords function (matches content script)
function normalizeKeywords(keywords) {
  if (!keywords) return [];

  // If already an array, filter out empty strings
  if (Array.isArray(keywords)) {
    return keywords.map(k => String(k).trim().toLowerCase()).filter(k => k.length > 0);
  }

  // If string, split by comma
  if (typeof keywords === 'string') {
    return keywords.split(',').map(k => k.trim().toLowerCase()).filter(k => k.length > 0);
  }

  return [];
}

function matchesIncludeKeywords(text, title, keywords) {
  const normalizedKeywords = normalizeKeywords(keywords);
  if (normalizedKeywords.length === 0) return true;

  const textLower = text.toLowerCase();
  const titleLower = title.toLowerCase();

  return normalizedKeywords.some(kw => {
    return titleLower.includes(kw) || textLower.includes(kw);
  });
}

function matchesExcludeKeywords(text, title, keywords) {
  const normalizedKeywords = normalizeKeywords(keywords);
  if (normalizedKeywords.length === 0) return false;

  const textLower = text.toLowerCase();
  const titleLower = title.toLowerCase();

  return normalizedKeywords.some(kw => {
    return titleLower.includes(kw) || textLower.includes(kw);
  });
}

// normalizeKeywords tests
test('normalizeKeywords: null returns empty array', () => {
  expect(normalizeKeywords(null).length).toBe(0);
});

test('normalizeKeywords: undefined returns empty array', () => {
  expect(normalizeKeywords(undefined).length).toBe(0);
});

test('normalizeKeywords: empty array returns empty array', () => {
  expect(normalizeKeywords([]).length).toBe(0);
});

test('normalizeKeywords: array with values normalizes correctly', () => {
  const result = normalizeKeywords(['React', '  Angular  ', 'VUE']);
  expect(result.length).toBe(3);
  expect(result[0]).toBe('react');
  expect(result[1]).toBe('angular');
  expect(result[2]).toBe('vue');
});

test('normalizeKeywords: array with empty strings filters them out', () => {
  const result = normalizeKeywords(['react', '', '  ', 'angular']);
  expect(result.length).toBe(2);
});

test('normalizeKeywords: comma-separated string splits correctly', () => {
  const result = normalizeKeywords('react, angular, vue');
  expect(result.length).toBe(3);
  expect(result[0]).toBe('react');
  expect(result[1]).toBe('angular');
  expect(result[2]).toBe('vue');
});

test('normalizeKeywords: single string returns single item array', () => {
  const result = normalizeKeywords('react');
  expect(result.length).toBe(1);
  expect(result[0]).toBe('react');
});

// matchesIncludeKeywords tests
test('matchesIncludeKeywords: empty keywords returns true', () => {
  expect(matchesIncludeKeywords('Some text', 'Title', [])).toBeTruthy();
});

test('matchesIncludeKeywords: null keywords returns true', () => {
  expect(matchesIncludeKeywords('Some text', 'Title', null)).toBeTruthy();
});

test('matchesIncludeKeywords: matching keyword in title', () => {
  expect(matchesIncludeKeywords('Some text', 'React Developer', ['react'])).toBeTruthy();
});

test('matchesIncludeKeywords: matching keyword in text', () => {
  expect(matchesIncludeKeywords('Looking for React skills', 'Developer', ['react'])).toBeTruthy();
});

test('matchesIncludeKeywords: no matching keyword returns false', () => {
  expect(matchesIncludeKeywords('Python job', 'Python Developer', ['react', 'angular'])).toBeFalsy();
});

test('matchesIncludeKeywords: works with comma-separated string', () => {
  expect(matchesIncludeKeywords('Some text', 'React Developer', 'react, angular')).toBeTruthy();
});

test('matchesIncludeKeywords: case insensitive matching', () => {
  expect(matchesIncludeKeywords('Some text', 'REACT Developer', ['react'])).toBeTruthy();
});

// matchesExcludeKeywords tests
test('matchesExcludeKeywords: empty keywords returns false', () => {
  expect(matchesExcludeKeywords('Some text', 'Title', [])).toBeFalsy();
});

test('matchesExcludeKeywords: null keywords returns false', () => {
  expect(matchesExcludeKeywords('Some text', 'Title', null)).toBeFalsy();
});

test('matchesExcludeKeywords: matching keyword found', () => {
  expect(matchesExcludeKeywords('Senior position', 'Senior Developer', ['senior'])).toBeTruthy();
});

test('matchesExcludeKeywords: no matching keyword returns false', () => {
  expect(matchesExcludeKeywords('Junior role', 'Junior Developer', ['senior', 'lead'])).toBeFalsy();
});

test('matchesExcludeKeywords: works with comma-separated string', () => {
  expect(matchesExcludeKeywords('Senior position', 'Senior Developer', 'senior, lead')).toBeTruthy();
});

// ============================================================================
// SALARY DETECTION TESTS
// ============================================================================

console.log('\n=== Salary Detection Tests ===\n');

const SALARY_PATTERNS = [
  /\$[\d,]+/,
  /\d+k\s*-\s*\d+k/i,
  /salary/i,
  /compensation/i,
  /\/hour/i,
  /\/yr/i,
  /per hour/i,
  /per year/i,
  /annually/i
];

function hasSalaryInfo(text) {
  return SALARY_PATTERNS.some(pattern => pattern.test(text));
}

test('hasSalaryInfo: "$100,000" is detected', () => {
  expect(hasSalaryInfo('$100,000 - $150,000')).toBeTruthy();
});

test('hasSalaryInfo: "100k-150k" is detected', () => {
  expect(hasSalaryInfo('100k-150k')).toBeTruthy();
});

test('hasSalaryInfo: "Salary: competitive" is detected', () => {
  expect(hasSalaryInfo('Salary: competitive')).toBeTruthy();
});

test('hasSalaryInfo: "$50/hour" is detected', () => {
  expect(hasSalaryInfo('$50/hour')).toBeTruthy();
});

test('hasSalaryInfo: "$120,000/yr" is detected', () => {
  expect(hasSalaryInfo('$120,000/yr')).toBeTruthy();
});

test('hasSalaryInfo: "per hour" is detected', () => {
  expect(hasSalaryInfo('$45 per hour')).toBeTruthy();
});

test('hasSalaryInfo: No salary info returns false', () => {
  expect(hasSalaryInfo('Great benefits and team culture')).toBeFalsy();
});

// ============================================================================
// VISA SPONSORSHIP DETECTION TESTS
// ============================================================================

console.log('\n=== Visa Sponsorship Detection Tests ===\n');

const VISA_PATTERNS = [
  /visa\s*sponsor/i,
  /sponsorship\s*available/i,
  /h1b\s*sponsor/i,
  /h-1b\s*sponsor/i,
  /will\s*sponsor/i,
  /provides?\s*sponsorship/i,
  /offers?\s*sponsorship/i
];

function hasVisaSponsorship(text) {
  return VISA_PATTERNS.some(pattern => pattern.test(text));
}

test('hasVisaSponsorship: "visa sponsorship available" is detected', () => {
  expect(hasVisaSponsorship('visa sponsorship available')).toBeTruthy();
});

test('hasVisaSponsorship: "H1B sponsorship" is detected', () => {
  expect(hasVisaSponsorship('H1B sponsorship provided')).toBeTruthy();
});

test('hasVisaSponsorship: "will sponsor visa" is detected', () => {
  expect(hasVisaSponsorship('Will sponsor visa for right candidate')).toBeTruthy();
});

test('hasVisaSponsorship: "provides sponsorship" is detected', () => {
  expect(hasVisaSponsorship('Company provides sponsorship')).toBeTruthy();
});

test('hasVisaSponsorship: "offers sponsorship" is detected', () => {
  expect(hasVisaSponsorship('This role offers sponsorship')).toBeTruthy();
});

test('hasVisaSponsorship: No sponsorship mention returns false', () => {
  expect(hasVisaSponsorship('Must be authorized to work in the US')).toBeFalsy();
});

// ============================================================================
// REMOTE WORK DETECTION TESTS
// ============================================================================

console.log('\n=== Remote Work Detection Tests ===\n');

const NON_REMOTE_INDICATORS = [
  /\bhybrid\b/i,
  /\bon-?site\b/i,
  /\bin-?office\b/i,
  /\bin-?person\b/i,
  /\bdays? in office\b/i,
  /\boffice days?\b/i,
  /\bcommute\b/i
];

function detectNonRemoteIndicators(text, settings) {
  for (const pattern of NON_REMOTE_INDICATORS) {
    if (pattern.test(text)) {
      if (settings.excludeHybrid && /hybrid/i.test(text)) return true;
      if (settings.excludeOnsite && /on-?site/i.test(text)) return true;
      if (settings.excludeInOffice && /in-?office/i.test(text)) return true;
      if (settings.excludeInPerson && /in-?person/i.test(text)) return true;
    }
  }
  return false;
}

test('detectNonRemoteIndicators: "Hybrid" with excludeHybrid=true', () => {
  expect(detectNonRemoteIndicators('Hybrid - 3 days in office', { excludeHybrid: true })).toBeTruthy();
});

test('detectNonRemoteIndicators: "On-site" with excludeOnsite=true', () => {
  expect(detectNonRemoteIndicators('On-site position', { excludeOnsite: true })).toBeTruthy();
});

test('detectNonRemoteIndicators: "In-office" with excludeInOffice=true', () => {
  expect(detectNonRemoteIndicators('In-office required', { excludeInOffice: true })).toBeTruthy();
});

test('detectNonRemoteIndicators: "Hybrid" with excludeHybrid=false returns false', () => {
  expect(detectNonRemoteIndicators('Hybrid - 3 days in office', { excludeHybrid: false })).toBeFalsy();
});

test('detectNonRemoteIndicators: "Remote" with all settings returns false', () => {
  expect(detectNonRemoteIndicators('Fully remote position', { excludeHybrid: true, excludeOnsite: true })).toBeFalsy();
});

// ============================================================================
// JOB AGE FORMATTING TESTS
// ============================================================================

console.log('\n=== Job Age Formatting Tests ===\n');

function formatJobAge(days) {
  if (days < 1) {
    const hours = Math.max(1, Math.round(days * 24));
    return `${hours}h`;
  } else if (days < 7) {
    return `${Math.round(days)}d`;
  } else if (days < 30) {
    const weeks = Math.round(days / 7);
    return `${weeks}w`;
  } else {
    return `30+ days`;
  }
}

test('formatJobAge: 0.5 days returns hours', () => {
  expect(formatJobAge(0.5)).toBe('12h');
});

test('formatJobAge: 0.04 days (1 hour) returns 1h', () => {
  expect(formatJobAge(0.04)).toBe('1h');
});

test('formatJobAge: 3 days returns "3d"', () => {
  expect(formatJobAge(3)).toBe('3d');
});

test('formatJobAge: 7 days returns "1w"', () => {
  expect(formatJobAge(7)).toBe('1w');
});

test('formatJobAge: 14 days returns "2w"', () => {
  expect(formatJobAge(14)).toBe('2w');
});

test('formatJobAge: 30 days returns "30+ days"', () => {
  expect(formatJobAge(30)).toBe('30+ days');
});

test('formatJobAge: 60 days returns "30+ days"', () => {
  expect(formatJobAge(60)).toBe('30+ days');
});

// ============================================================================
// JOB ID EXTRACTION TESTS
// ============================================================================

console.log('\n=== Job ID Extraction Tests ===\n');

function extractJobIdFromUrl(url) {
  const match = url.match(/\/jobs\/view\/(\d+)/);
  return match ? match[1] : null;
}

function extractJobIdFromUrn(urn) {
  const match = urn.match(/jobPosting:(\d+)/);
  return match ? match[1] : null;
}

test('extractJobIdFromUrl: standard LinkedIn job URL', () => {
  expect(extractJobIdFromUrl('https://www.linkedin.com/jobs/view/123456789')).toBe('123456789');
});

test('extractJobIdFromUrl: URL with query params', () => {
  expect(extractJobIdFromUrl('https://www.linkedin.com/jobs/view/123456789?refId=abc')).toBe('123456789');
});

test('extractJobIdFromUrl: invalid URL returns null', () => {
  expect(extractJobIdFromUrl('https://www.linkedin.com/feed')).toBeNull();
});

test('extractJobIdFromUrn: standard entity URN', () => {
  expect(extractJobIdFromUrn('urn:li:jobPosting:123456789')).toBe('123456789');
});

test('extractJobIdFromUrn: invalid URN returns null', () => {
  expect(extractJobIdFromUrn('urn:li:member:123456')).toBeNull();
});

// ============================================================================
// SUMMARY
// ============================================================================

console.log('\n=== Test Summary ===\n');
console.log(`Passed: ${testsPassed}`);
console.log(`Failed: ${testsFailed}`);
console.log(`Total: ${testsPassed + testsFailed}`);

if (testsFailed > 0) {
  console.log('\n⚠️ Some tests failed!');
  process.exitCode = 1;
} else {
  console.log('\n✅ All tests passed!');
}
