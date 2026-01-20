/**
 * Job Age Extraction Tests
 * TDD: Write failing tests first, then implement to make them pass
 *
 * Run with: node chrome-extension/tests/job-age-extraction.test.js
 */

// Simple test framework
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
    toBe(expected) {
      if (actual !== expected) {
        throw new Error(`Expected ${JSON.stringify(expected)} but got ${JSON.stringify(actual)}`);
      }
    },
    toBeNull() {
      if (actual !== null) {
        throw new Error(`Expected null but got ${JSON.stringify(actual)}`);
      }
    },
    toBeGreaterThanOrEqual(expected) {
      if (actual < expected) {
        throw new Error(`Expected ${actual} to be >= ${expected}`);
      }
    },
    toBeLessThanOrEqual(expected) {
      if (actual > expected) {
        throw new Error(`Expected ${actual} to be <= ${expected}`);
      }
    }
  };
}

// ============================================
// FUNCTION TO TEST (copy from content-linkedin-v3.js and adapt)
// ============================================

// Time patterns used for parsing job posting ages
const JOB_AGE_TIME_PATTERNS = [
  // With "ago" suffix
  { pattern: /(\d+)\s*(?:hours?|hr|h)\s*ago/i, multiplier: 0 },
  { pattern: /(\d+)\s*(?:days?|d)\s*ago/i, multiplier: 1 },
  { pattern: /(\d+)\s*(?:weeks?|wk|w)\s*ago/i, multiplier: 7 },
  { pattern: /(\d+)\s*(?:months?|mo)\s*ago/i, multiplier: 30 },
  // Without "ago" (e.g., "Posted 3 days", "Reposted 1 week")
  { pattern: /(?:posted|reposted|listed)\s*(\d+)\s*(?:hours?|hr|h)/i, multiplier: 0 },
  { pattern: /(?:posted|reposted|listed)\s*(\d+)\s*(?:days?|d)/i, multiplier: 1 },
  { pattern: /(?:posted|reposted|listed)\s*(\d+)\s*(?:weeks?|wk|w)/i, multiplier: 7 },
  { pattern: /(?:posted|reposted|listed)\s*(\d+)\s*(?:months?|mo)/i, multiplier: 30 },
  // Minute patterns (treat as 0 days - just posted)
  { pattern: /(\d+)\s*(?:minutes?|min|m)\s*ago/i, multiplier: 0 },
  { pattern: /(?:posted|reposted|listed)\s*(\d+)\s*(?:minutes?|min)/i, multiplier: 0 },
];

/**
 * Parse job age from text string
 * @param {string} text - Text containing job age info
 * @returns {number|null} - Days since posting, or null if not found
 */
function parseJobAgeFromText(text) {
  if (!text || typeof text !== 'string') return null;

  const normalized = text.toLowerCase().trim();

  // Handle "just now", "today", "just posted" as 0 days
  if (/just\s*now|today|just\s*posted|moment|seconds?\s*ago/i.test(normalized)) {
    return 0;
  }

  // Try each pattern
  for (const { pattern, multiplier } of JOB_AGE_TIME_PATTERNS) {
    const match = normalized.match(pattern);
    if (match) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num)) {
        return num * multiplier;
      }
    }
  }

  return null;
}

/**
 * Search for job age text within an element's text content
 * Uses regex to find time-related patterns
 * @param {string} elementText - Text content of an element
 * @returns {number|null} - Days since posting, or null if not found
 */
function findJobAgeInText(elementText) {
  if (!elementText) return null;

  // Find all potential matches in the text
  const timePattern = /(\d+)\s*(hours?|days?|weeks?|months?|hr|d|wk|w|mo|h)\s*ago/gi;
  const matches = elementText.match(timePattern);

  if (matches && matches.length > 0) {
    // Return the first match found
    return parseJobAgeFromText(matches[0]);
  }

  // Check for "Posted X time" pattern without "ago"
  const postedPattern = /(?:posted|reposted|listed)\s*(\d+)\s*(hours?|days?|weeks?|months?|hr|d|wk|w|mo|h)/gi;
  const postedMatches = elementText.match(postedPattern);

  if (postedMatches && postedMatches.length > 0) {
    return parseJobAgeFromText(postedMatches[0]);
  }

  // Check for "just now" etc
  if (/just\s*now|today|just\s*posted/i.test(elementText)) {
    return 0;
  }

  return null;
}

// ============================================
// TEST CASES
// ============================================

console.log('\n=== Job Age Extraction Tests ===\n');

// Basic "X ago" patterns
test('parseJobAgeFromText: "3 days ago" returns 3', () => {
  expect(parseJobAgeFromText('3 days ago')).toBe(3);
});

test('parseJobAgeFromText: "1 day ago" returns 1', () => {
  expect(parseJobAgeFromText('1 day ago')).toBe(1);
});

test('parseJobAgeFromText: "1 week ago" returns 7', () => {
  expect(parseJobAgeFromText('1 week ago')).toBe(7);
});

test('parseJobAgeFromText: "2 weeks ago" returns 14', () => {
  expect(parseJobAgeFromText('2 weeks ago')).toBe(14);
});

test('parseJobAgeFromText: "1 month ago" returns 30', () => {
  expect(parseJobAgeFromText('1 month ago')).toBe(30);
});

test('parseJobAgeFromText: "5 hours ago" returns 0 (same day)', () => {
  expect(parseJobAgeFromText('5 hours ago')).toBe(0);
});

test('parseJobAgeFromText: "30 minutes ago" returns 0 (same day)', () => {
  expect(parseJobAgeFromText('30 minutes ago')).toBe(0);
});

// "Posted/Reposted X time" patterns
test('parseJobAgeFromText: "Posted 5 days ago" returns 5', () => {
  expect(parseJobAgeFromText('Posted 5 days ago')).toBe(5);
});

test('parseJobAgeFromText: "Reposted 1 week ago" returns 7', () => {
  expect(parseJobAgeFromText('Reposted 1 week ago')).toBe(7);
});

test('parseJobAgeFromText: "Posted 2 weeks" returns 14 (no "ago")', () => {
  expect(parseJobAgeFromText('Posted 2 weeks')).toBe(14);
});

test('parseJobAgeFromText: "Reposted 1 month" returns 30 (no "ago")', () => {
  expect(parseJobAgeFromText('Reposted 1 month')).toBe(30);
});

// Just now / today patterns
test('parseJobAgeFromText: "Just now" returns 0', () => {
  expect(parseJobAgeFromText('Just now')).toBe(0);
});

test('parseJobAgeFromText: "today" returns 0', () => {
  expect(parseJobAgeFromText('today')).toBe(0);
});

test('parseJobAgeFromText: "Just posted" returns 0', () => {
  expect(parseJobAgeFromText('Just posted')).toBe(0);
});

// Abbreviated formats
test('parseJobAgeFromText: "3d ago" returns 3', () => {
  expect(parseJobAgeFromText('3d ago')).toBe(3);
});

test('parseJobAgeFromText: "2w ago" returns 14', () => {
  expect(parseJobAgeFromText('2w ago')).toBe(14);
});

test('parseJobAgeFromText: "1mo ago" returns 30', () => {
  expect(parseJobAgeFromText('1mo ago')).toBe(30);
});

// Invalid/no match patterns
test('parseJobAgeFromText: random text returns null', () => {
  expect(parseJobAgeFromText('Random text without time')).toBeNull();
});

test('parseJobAgeFromText: empty string returns null', () => {
  expect(parseJobAgeFromText('')).toBeNull();
});

test('parseJobAgeFromText: null returns null', () => {
  expect(parseJobAgeFromText(null)).toBeNull();
});

// Case insensitivity
test('parseJobAgeFromText: "3 DAYS AGO" (uppercase) returns 3', () => {
  expect(parseJobAgeFromText('3 DAYS AGO')).toBe(3);
});

test('parseJobAgeFromText: "Posted 1 WEEK ago" (mixed case) returns 7', () => {
  expect(parseJobAgeFromText('Posted 1 WEEK ago')).toBe(7);
});

// Text with extra content
console.log('\n=== Find Job Age in Element Text ===\n');

test('findJobAgeInText: finds age in longer text', () => {
  const text = 'Software Engineer at Company Inc. · 3 days ago · 100 applicants';
  expect(findJobAgeInText(text)).toBe(3);
});

test('findJobAgeInText: finds age with Posted prefix', () => {
  const text = 'Posted 2 weeks ago · San Francisco, CA';
  expect(findJobAgeInText(text)).toBe(14);
});

test('findJobAgeInText: finds age when buried in HTML-like text', () => {
  const text = 'Apply now! This position was listed 5 days ago and has 50 applicants';
  expect(findJobAgeInText(text)).toBe(5);
});

test('findJobAgeInText: returns null for text without time info', () => {
  const text = 'Software Engineer · Remote · Full-time';
  expect(findJobAgeInText(text)).toBeNull();
});

test('findJobAgeInText: handles "just now" in longer text', () => {
  const text = 'New position! Just posted · Apply now';
  expect(findJobAgeInText(text)).toBe(0);
});

// Edge cases for LinkedIn's actual text patterns
console.log('\n=== LinkedIn-Specific Patterns ===\n');

test('parseJobAgeFromText: "Actively recruiting · Posted 3 days ago" extracts correctly', () => {
  expect(findJobAgeInText('Actively recruiting · Posted 3 days ago')).toBe(3);
});

test('parseJobAgeFromText: handles LinkedIn bullet separator', () => {
  const text = 'Remote · Posted 1 week ago · 200+ applicants';
  expect(findJobAgeInText(text)).toBe(7);
});

test('parseJobAgeFromText: handles "Reposted" jobs', () => {
  const text = 'Reposted 2 days ago';
  expect(parseJobAgeFromText(text)).toBe(2);
});

// Summary
console.log('\n=== Test Summary ===');
console.log(`Passed: ${testsPassed}`);
console.log(`Failed: ${testsFailed}`);
console.log(`Total: ${testsPassed + testsFailed}`);

if (testsFailed > 0) {
  console.log('\n❌ Some tests failed!');
  process.exit(1);
} else {
  console.log('\n✓ All tests passed!');
  process.exit(0);
}
