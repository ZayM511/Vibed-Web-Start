/**
 * Visa Sponsorship Detection Tests
 * TDD: Write failing tests first, then implement to make them pass
 *
 * Run with: node chrome-extension/tests/visa-sponsorship-detection.test.js
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
// VISA SPONSORSHIP DETECTION PATTERNS
// ============================================

// Negative patterns - job does NOT offer sponsorship (check FIRST)
const VISA_NEGATIVE_PATTERNS = [
  /\b(not|no|cannot|can't|won't|will\s+not|unable\s+to|do\s+not|does\s+not)\s+(provide\s+)?(sponsor|sponsorship)/i,
  /sponsor(ship)?\s+(is\s+)?(not|unavailable)/i,
  /without\s+sponsor/i,
  /\bno\s+visa\s+(support|sponsorship|assistance)/i,
  /must\s+(be|have|already\s+be)\s+(legally\s+)?(authorized|eligible)/i,
  /must\s+have\s+(valid\s+)?(work\s+)?(authorization|permit|visa)/i,
  /authorized\s+to\s+work.*without\s+sponsor/i,
  /not\s+eligible\s+for\s+sponsor/i,
  /sponsorship\s+(is\s+)?not\s+(available|offered|provided)/i
];

// Positive patterns - job OFFERS sponsorship
const VISA_POSITIVE_PATTERNS = [
  // Direct sponsorship mentions
  /\b(will|can|may|able\s+to)\s+(provide\s+)?sponsor/i,
  /visa\s+sponsor(ship)?(\s+available|\s+provided|\s+offered)?/i,
  /sponsor(s|ing|ed)?\s+(visa|work\s+authorization)/i,
  /willing\s+to\s+sponsor/i,
  /sponsorship\s+(is\s+)?(available|provided|offered)/i,
  /open\s+to\s+sponsor/i,

  // Specific visa types (presence indicates sponsorship possible)
  /\bh-?1b\b/i,
  /\bh-?2b\b/i,
  /\bo-?1\b/i,
  /\btn\s+visa\b/i,
  /\bl-?1\b/i,
  /\be-?2\b/i,
  /\beb-?[123]\b/i,
  /\bperm\s+(sponsorship|process|filing)/i,
  /green\s+card\s+sponsor/i,

  // Work authorization support
  /work\s+authorization\s+sponsor/i,
  /immigration\s+sponsor/i,
  /sponsor.*work\s+(permit|authorization|visa)/i
];

/**
 * Check if job description offers visa sponsorship
 * @param {string} text - Job description text
 * @returns {boolean} - True if job offers sponsorship
 */
function hasVisaSponsorshipText(text) {
  if (!text || typeof text !== 'string') return false;

  const normalized = text.toLowerCase();

  // Check NEGATIVE patterns FIRST - they override positive matches
  for (const pattern of VISA_NEGATIVE_PATTERNS) {
    if (pattern.test(normalized)) {
      return false;  // Explicitly says NO sponsorship
    }
  }

  // Check POSITIVE patterns
  for (const pattern of VISA_POSITIVE_PATTERNS) {
    if (pattern.test(normalized)) {
      return true;  // Mentions sponsorship positively
    }
  }

  return false;  // No mention of sponsorship
}

// ============================================
// TEST CASES - POSITIVE MATCHES (Offers sponsorship)
// ============================================

console.log('\n=== Visa Sponsorship Detection Tests ===\n');
console.log('--- Positive Matches (Should return TRUE) ---\n');

// Direct sponsorship mentions
test('hasVisaSponsorshipText: "We will sponsor your visa" returns true', () => {
  expect(hasVisaSponsorshipText('We will sponsor your visa')).toBe(true);
});

test('hasVisaSponsorshipText: "Visa sponsorship available" returns true', () => {
  expect(hasVisaSponsorshipText('Visa sponsorship available')).toBe(true);
});

test('hasVisaSponsorshipText: "Willing to sponsor the right candidate" returns true', () => {
  expect(hasVisaSponsorshipText('Willing to sponsor the right candidate')).toBe(true);
});

test('hasVisaSponsorshipText: "Sponsorship is provided" returns true', () => {
  expect(hasVisaSponsorshipText('Sponsorship is provided')).toBe(true);
});

test('hasVisaSponsorshipText: "Can sponsor work authorization" returns true', () => {
  expect(hasVisaSponsorshipText('Can sponsor work authorization')).toBe(true);
});

test('hasVisaSponsorshipText: "Open to sponsoring visa" returns true', () => {
  expect(hasVisaSponsorshipText('Open to sponsoring visa')).toBe(true);
});

// Specific visa type mentions
test('hasVisaSponsorshipText: "H1B visa transfer accepted" returns true', () => {
  expect(hasVisaSponsorshipText('H1B visa transfer accepted')).toBe(true);
});

test('hasVisaSponsorshipText: "H-1B sponsorship available" returns true', () => {
  expect(hasVisaSponsorshipText('H-1B sponsorship available')).toBe(true);
});

test('hasVisaSponsorshipText: "O-1 visa candidates welcome" returns true', () => {
  expect(hasVisaSponsorshipText('O-1 visa candidates welcome')).toBe(true);
});

test('hasVisaSponsorshipText: "TN visa holders accepted" returns true', () => {
  expect(hasVisaSponsorshipText('TN visa holders accepted')).toBe(true);
});

test('hasVisaSponsorshipText: "L-1 transfer available" returns true', () => {
  expect(hasVisaSponsorshipText('L-1 transfer available')).toBe(true);
});

test('hasVisaSponsorshipText: "EB-2 sponsorship offered" returns true', () => {
  expect(hasVisaSponsorshipText('EB-2 sponsorship offered')).toBe(true);
});

test('hasVisaSponsorshipText: "PERM sponsorship process" returns true', () => {
  expect(hasVisaSponsorshipText('We offer PERM sponsorship process')).toBe(true);
});

test('hasVisaSponsorshipText: "Green card sponsorship available" returns true', () => {
  expect(hasVisaSponsorshipText('Green card sponsorship available')).toBe(true);
});

// ============================================
// TEST CASES - NEGATIVE MATCHES (Does NOT offer sponsorship)
// ============================================

console.log('\n--- Negative Matches (Should return FALSE) ---\n');

// Explicit no sponsorship
test('hasVisaSponsorshipText: "We do not sponsor visas" returns false', () => {
  expect(hasVisaSponsorshipText('We do not sponsor visas')).toBe(false);
});

test('hasVisaSponsorshipText: "No visa sponsorship available" returns false', () => {
  expect(hasVisaSponsorshipText('No visa sponsorship available')).toBe(false);
});

test('hasVisaSponsorshipText: "Cannot sponsor work authorization" returns false', () => {
  expect(hasVisaSponsorshipText('Cannot sponsor work authorization')).toBe(false);
});

test('hasVisaSponsorshipText: "Unable to sponsor" returns false', () => {
  expect(hasVisaSponsorshipText('Unable to sponsor at this time')).toBe(false);
});

test('hasVisaSponsorshipText: "Sponsorship is not available" returns false', () => {
  expect(hasVisaSponsorshipText('Sponsorship is not available for this role')).toBe(false);
});

test('hasVisaSponsorshipText: "Will not sponsor" returns false', () => {
  expect(hasVisaSponsorshipText('We will not sponsor for this position')).toBe(false);
});

test('hasVisaSponsorshipText: "Won\'t sponsor" returns false', () => {
  expect(hasVisaSponsorshipText("We won't sponsor visas")).toBe(false);
});

// Work authorization requirements (implies no sponsorship)
test('hasVisaSponsorshipText: "Must be authorized to work" returns false', () => {
  expect(hasVisaSponsorshipText('Must be authorized to work in the United States')).toBe(false);
});

test('hasVisaSponsorshipText: "Must have valid work permit" returns false', () => {
  expect(hasVisaSponsorshipText('Must have valid work permit')).toBe(false);
});

test('hasVisaSponsorshipText: "Must already be eligible to work" returns false', () => {
  expect(hasVisaSponsorshipText('Must already be eligible to work without sponsorship')).toBe(false);
});

// No mention of sponsorship at all
test('hasVisaSponsorshipText: Job with no visa mention returns false', () => {
  const description = `
    Software Engineer position. Requirements:
    - 5 years experience in JavaScript
    - Bachelor's degree in CS
    - Strong communication skills
  `;
  expect(hasVisaSponsorshipText(description)).toBe(false);
});

test('hasVisaSponsorshipText: empty string returns false', () => {
  expect(hasVisaSponsorshipText('')).toBe(false);
});

test('hasVisaSponsorshipText: null returns false', () => {
  expect(hasVisaSponsorshipText(null)).toBe(false);
});

// ============================================
// TEST CASES - CRITICAL: Negative overrides Positive
// ============================================

console.log('\n--- Critical: Negative Overrides Positive ---\n');

test('hasVisaSponsorshipText: "H1B visa - we do not sponsor" returns FALSE (negative wins)', () => {
  const text = 'H1B visa holders welcome but we do not sponsor new visas';
  expect(hasVisaSponsorshipText(text)).toBe(false);
});

test('hasVisaSponsorshipText: "Sponsorship not available for H1B" returns FALSE', () => {
  const text = 'Sponsorship is not available for H1B or other work visas';
  expect(hasVisaSponsorshipText(text)).toBe(false);
});

test('hasVisaSponsorshipText: mixed message with "cannot sponsor" returns FALSE', () => {
  const text = 'We support diverse candidates but cannot sponsor work visas at this time';
  expect(hasVisaSponsorshipText(text)).toBe(false);
});

// ============================================
// TEST CASES - Realistic Job Descriptions
// ============================================

console.log('\n--- Realistic Job Descriptions ---\n');

test('hasVisaSponsorshipText: Real positive job description', () => {
  const description = `
    Senior Software Engineer - San Francisco

    We are looking for talented engineers to join our team.

    Benefits:
    - Competitive salary
    - Health insurance
    - Visa sponsorship available for qualified candidates
    - 401k matching
  `;
  expect(hasVisaSponsorshipText(description)).toBe(true);
});

test('hasVisaSponsorshipText: Real negative job description', () => {
  const description = `
    Data Scientist - Remote

    Requirements:
    - PhD in Machine Learning
    - 3+ years experience

    Note: Candidates must be legally authorized to work in the United States.
    We are unable to sponsor work visas for this position.
  `;
  expect(hasVisaSponsorshipText(description)).toBe(false);
});

test('hasVisaSponsorshipText: Job that only mentions authorization requirement', () => {
  const description = `
    Product Manager - New York

    Must have authorization to work in the US.
  `;
  expect(hasVisaSponsorshipText(description)).toBe(false);
});

// ============================================
// TEST CASES - Case Insensitivity
// ============================================

console.log('\n--- Case Insensitivity ---\n');

test('hasVisaSponsorshipText: "VISA SPONSORSHIP AVAILABLE" (uppercase) returns true', () => {
  expect(hasVisaSponsorshipText('VISA SPONSORSHIP AVAILABLE')).toBe(true);
});

test('hasVisaSponsorshipText: "NO SPONSORSHIP" (uppercase) returns false', () => {
  expect(hasVisaSponsorshipText('NO SPONSORSHIP AVAILABLE')).toBe(false);
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
