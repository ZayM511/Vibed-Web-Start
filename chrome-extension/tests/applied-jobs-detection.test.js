/**
 * Applied Jobs Detection Tests
 * TDD: Write failing tests first, then implement to make them pass
 *
 * Run with: node chrome-extension/tests/applied-jobs-detection.test.js
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
    toBeTruthy() {
      if (!actual) {
        throw new Error(`Expected ${JSON.stringify(actual)} to be truthy`);
      }
    },
    toBeFalsy() {
      if (actual) {
        throw new Error(`Expected ${JSON.stringify(actual)} to be falsy`);
      }
    }
  };
}

// ============================================
// APPLIED JOB DETECTION PATTERNS
// ============================================

// Patterns that indicate user has applied to a job
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
 * Check if text indicates user has applied to the job
 * @param {string} text - Text content to check
 * @returns {boolean} - True if user has applied
 */
function hasAppliedText(text) {
  if (!text || typeof text !== 'string') return false;

  const normalized = text.toLowerCase();

  for (const pattern of APPLIED_PATTERNS) {
    if (pattern.test(normalized)) {
      return true;
    }
  }

  return false;
}

// ============================================
// TEST CASES - POSITIVE MATCHES (User HAS applied)
// ============================================

console.log('\n=== Applied Jobs Detection Tests ===\n');
console.log('--- Positive Matches (Should return TRUE) ---\n');

test('hasAppliedText: "Applied 3 days ago" returns true', () => {
  expect(hasAppliedText('Applied 3 days ago')).toBe(true);
});

test('hasAppliedText: "Applied 1 day ago" returns true', () => {
  expect(hasAppliedText('Applied 1 day ago')).toBe(true);
});

test('hasAppliedText: "Applied 2 weeks ago" returns true', () => {
  expect(hasAppliedText('Applied 2 weeks ago')).toBe(true);
});

test('hasAppliedText: "Applied 1 month ago" returns true', () => {
  expect(hasAppliedText('Applied 1 month ago')).toBe(true);
});

test('hasAppliedText: "Applied 5 hours ago" returns true', () => {
  expect(hasAppliedText('Applied 5 hours ago')).toBe(true);
});

test('hasAppliedText: "Applied 30 minutes ago" returns true', () => {
  expect(hasAppliedText('Applied 30 minutes ago')).toBe(true);
});

test('hasAppliedText: "Applied today" returns true', () => {
  expect(hasAppliedText('Applied today')).toBe(true);
});

test('hasAppliedText: "Applied yesterday" returns true', () => {
  expect(hasAppliedText('Applied yesterday')).toBe(true);
});

test('hasAppliedText: "You applied to this job" returns true', () => {
  expect(hasAppliedText('You applied to this job')).toBe(true);
});

test('hasAppliedText: "Application sent" returns true', () => {
  expect(hasAppliedText('Application sent')).toBe(true);
});

test('hasAppliedText: "Application submitted" returns true', () => {
  expect(hasAppliedText('Application submitted')).toBe(true);
});

test('hasAppliedText: "Applied on January 5, 2025" returns true', () => {
  expect(hasAppliedText('Applied on January 5, 2025')).toBe(true);
});

// ============================================
// TEST CASES - Case Insensitivity
// ============================================

console.log('\n--- Case Insensitivity ---\n');

test('hasAppliedText: "APPLIED 3 DAYS AGO" (uppercase) returns true', () => {
  expect(hasAppliedText('APPLIED 3 DAYS AGO')).toBe(true);
});

test('hasAppliedText: "Applied Today" (mixed case) returns true', () => {
  expect(hasAppliedText('Applied Today')).toBe(true);
});

// ============================================
// TEST CASES - Within Larger Text
// ============================================

console.log('\n--- Text Within Larger Content ---\n');

test('hasAppliedText: finds "Applied 2 days ago" within job card text', () => {
  const cardText = 'Software Engineer at Google · San Francisco, CA · Applied 2 days ago · 150 applicants';
  expect(hasAppliedText(cardText)).toBe(true);
});

test('hasAppliedText: finds "You applied" within LinkedIn footer', () => {
  const footerText = 'Easy Apply · You applied · Promoted';
  expect(hasAppliedText(footerText)).toBe(true);
});

// ============================================
// TEST CASES - NEGATIVE MATCHES (User has NOT applied)
// ============================================

console.log('\n--- Negative Matches (Should return FALSE) ---\n');

test('hasAppliedText: regular job card without applied status returns false', () => {
  const cardText = 'Software Engineer at Meta · Remote · Posted 3 days ago · Easy Apply';
  expect(hasAppliedText(cardText)).toBe(false);
});

test('hasAppliedText: job with applicant count (not applied) returns false', () => {
  const cardText = 'Data Scientist · 200 applicants · Posted 1 week ago';
  expect(hasAppliedText(cardText)).toBe(false);
});

test('hasAppliedText: empty string returns false', () => {
  expect(hasAppliedText('')).toBe(false);
});

test('hasAppliedText: null returns false', () => {
  expect(hasAppliedText(null)).toBe(false);
});

test('hasAppliedText: undefined returns false', () => {
  expect(hasAppliedText(undefined)).toBe(false);
});

test('hasAppliedText: "Apply now" does NOT match (different word)', () => {
  expect(hasAppliedText('Apply now to this job')).toBe(false);
});

test('hasAppliedText: "applications" does NOT match (plural form)', () => {
  expect(hasAppliedText('Over 100 applications received')).toBe(false);
});

// ============================================
// EDGE CASES
// ============================================

console.log('\n--- Edge Cases ---\n');

test('hasAppliedText: "Applied recently" returns true', () => {
  expect(hasAppliedText('Applied recently')).toBe(true);
});

test('hasAppliedText: multiple spaces "Applied  3  days  ago" returns true', () => {
  expect(hasAppliedText('Applied  3  days  ago')).toBe(true);
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
