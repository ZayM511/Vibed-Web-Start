/**
 * Immediate Badge Display Tests
 * TDD: Tests for ensuring job age badges appear immediately on all visible cards
 * when the filter is active, without requiring user to click on each card.
 *
 * Run with: node chrome-extension/tests/immediate-badge-display.test.js
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
    toBeGreaterThan(expected) {
      if (!(actual > expected)) {
        throw new Error(`Expected ${actual} to be > ${expected}`);
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
    },
    toContain(expected) {
      if (!actual.includes(expected)) {
        throw new Error(`Expected ${JSON.stringify(actual)} to contain ${JSON.stringify(expected)}`);
      }
    }
  };
}

// ============================================
// MOCK DOM UTILITIES
// ============================================

function createMockJobCard(jobId, ageText = null, hasExistingBadge = false) {
  return {
    jobId,
    ageText,
    hasExistingBadge,
    dataAttributes: {},
    querySelector(selector) {
      if (selector === '.jobfiltr-age-badge') {
        return hasExistingBadge ? { dataset: { age: '5' } } : null;
      }
      if (selector.includes('/jobs/view/')) {
        return { href: `https://linkedin.com/jobs/view/${jobId}` };
      }
      return null;
    },
    get textContent() {
      return ageText || `Software Engineer at Company ${jobId}`;
    },
    get dataset() {
      return this.dataAttributes;
    },
    style: { display: '' }
  };
}

// ============================================
// FUNCTIONS TO TEST (simulated implementations)
// ============================================

// Time patterns used for parsing job posting ages
const JOB_AGE_TIME_PATTERNS = [
  { pattern: /(\d+)\s*(?:hours?|hr|h)\s*ago/i, multiplier: 0 },
  { pattern: /(\d+)\s*(?:days?|d)\s*ago/i, multiplier: 1 },
  { pattern: /(\d+)\s*(?:weeks?|wk|w)\s*ago/i, multiplier: 7 },
  { pattern: /(\d+)\s*(?:months?|mo)\s*ago/i, multiplier: 30 },
  { pattern: /(?:posted|reposted|listed)\s*(\d+)\s*(?:hours?|hr|h)/i, multiplier: 0 },
  { pattern: /(?:posted|reposted|listed)\s*(\d+)\s*(?:days?|d)/i, multiplier: 1 },
  { pattern: /(?:posted|reposted|listed)\s*(\d+)\s*(?:weeks?|wk|w)/i, multiplier: 7 },
  { pattern: /(?:posted|reposted|listed)\s*(\d+)\s*(?:months?|mo)/i, multiplier: 30 },
  { pattern: /(\d+)\s*(?:minutes?|min|m)\s*ago/i, multiplier: 0 },
];

function parseAgeFromText(text) {
  if (!text || typeof text !== 'string') return null;
  const normalized = text.toLowerCase().trim();

  if (/just\s*now|today|just\s*posted|moment|seconds?\s*ago/i.test(normalized)) {
    return 0;
  }

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
 * KEY FUNCTION: Should scan all visible cards and add badges IMMEDIATELY
 * This is the function that needs to work correctly for badges to appear
 * without clicking on cards.
 */
function processAllVisibleCardsForBadges(cards, cache, addBadgeFn, options = {}) {
  const { forceRefresh = false, skipThrottle = false } = options;

  const results = {
    processed: 0,
    badgesAdded: 0,
    skipped: 0,
    failed: 0
  };

  for (const card of cards) {
    // Skip hidden cards
    if (card.style.display === 'none' || card.dataAttributes?.jobfiltrHidden) {
      results.skipped++;
      continue;
    }

    // Skip if badge already exists (unless force refresh)
    if (!forceRefresh && card.hasExistingBadge) {
      results.skipped++;
      continue;
    }

    results.processed++;

    // Try to get job age from multiple sources
    let jobAge = null;

    // 1. Check cache first (fastest)
    if (cache[card.jobId] !== undefined) {
      jobAge = cache[card.jobId];
    }

    // 2. Try to parse from card text
    if (jobAge === null && card.ageText) {
      jobAge = parseAgeFromText(card.ageText);
    }

    // 3. Try cached attribute on card
    if (jobAge === null && card.dataAttributes.jobfiltrAge) {
      jobAge = parseInt(card.dataAttributes.jobfiltrAge, 10);
    }

    // If we found an age, add the badge
    if (jobAge !== null && !isNaN(jobAge) && jobAge >= 0) {
      addBadgeFn(card, jobAge);
      results.badgesAdded++;
    } else {
      results.failed++;
    }
  }

  return results;
}

/**
 * Simulates populating cache from page data
 * KEY: Should NOT throttle on initial activation
 */
function populateCacheFromPageData(cache, pageData, options = {}) {
  const { isInitialActivation = false } = options;

  // If NOT initial activation and recent update, skip (throttle)
  if (!isInitialActivation && cache._lastUpdate &&
      Date.now() - cache._lastUpdate < 5000) {
    return { skipped: true, entriesAdded: 0 };
  }

  let entriesAdded = 0;

  for (const job of pageData) {
    if (cache[job.id] === undefined && job.age !== null) {
      cache[job.id] = job.age;
      entriesAdded++;
    }
  }

  cache._lastUpdate = Date.now();
  return { skipped: false, entriesAdded };
}

// ============================================
// TEST CASES
// ============================================

console.log('\n=== Immediate Badge Display Tests ===\n');

// Test 1: All visible cards should be processed
test('processAllVisibleCardsForBadges: processes all visible cards', () => {
  const cards = [
    createMockJobCard('1', '3 days ago'),
    createMockJobCard('2', '1 week ago'),
    createMockJobCard('3', '2 days ago')
  ];
  const cache = {};
  const badgesAdded = [];
  const addBadgeFn = (card, age) => badgesAdded.push({ jobId: card.jobId, age });

  const results = processAllVisibleCardsForBadges(cards, cache, addBadgeFn);

  expect(results.processed).toBe(3);
  expect(badgesAdded.length).toBe(3);
});

// Test 2: Cards with existing badges should be skipped
test('processAllVisibleCardsForBadges: skips cards with existing badges', () => {
  const cards = [
    createMockJobCard('1', '3 days ago', true),  // Has badge
    createMockJobCard('2', '1 week ago', false)  // No badge
  ];
  const cache = {};
  const badgesAdded = [];
  const addBadgeFn = (card, age) => badgesAdded.push({ jobId: card.jobId, age });

  const results = processAllVisibleCardsForBadges(cards, cache, addBadgeFn);

  expect(results.skipped).toBe(1);
  expect(badgesAdded.length).toBe(1);
  expect(badgesAdded[0].jobId).toBe('2');
});

// Test 3: Hidden cards should be skipped
test('processAllVisibleCardsForBadges: skips hidden cards', () => {
  const cards = [
    createMockJobCard('1', '3 days ago'),
    createMockJobCard('2', '1 week ago')
  ];
  cards[0].style.display = 'none';  // Hide first card

  const cache = {};
  const badgesAdded = [];
  const addBadgeFn = (card, age) => badgesAdded.push({ jobId: card.jobId, age });

  const results = processAllVisibleCardsForBadges(cards, cache, addBadgeFn);

  expect(results.skipped).toBe(1);
  expect(badgesAdded.length).toBe(1);
});

// Test 4: Cache should be used when available
test('processAllVisibleCardsForBadges: uses cache for ages', () => {
  const cards = [
    createMockJobCard('1', null),  // No age in text
    createMockJobCard('2', null)
  ];
  const cache = { '1': 5, '2': 10 };  // Ages from cache
  const badgesAdded = [];
  const addBadgeFn = (card, age) => badgesAdded.push({ jobId: card.jobId, age });

  const results = processAllVisibleCardsForBadges(cards, cache, addBadgeFn);

  expect(badgesAdded.length).toBe(2);
  expect(badgesAdded[0].age).toBe(5);
  expect(badgesAdded[1].age).toBe(10);
});

// Test 5: Force refresh should reprocess cards with existing badges
test('processAllVisibleCardsForBadges: forceRefresh reprocesses all cards', () => {
  const cards = [
    createMockJobCard('1', '3 days ago', true),  // Has badge
    createMockJobCard('2', '1 week ago', true)   // Has badge
  ];
  const cache = {};
  const badgesAdded = [];
  const addBadgeFn = (card, age) => badgesAdded.push({ jobId: card.jobId, age });

  const results = processAllVisibleCardsForBadges(cards, cache, addBadgeFn, { forceRefresh: true });

  expect(results.processed).toBe(2);
  expect(badgesAdded.length).toBe(2);
});

// Test 6: Cards without age info should be tracked as failed
test('processAllVisibleCardsForBadges: tracks cards where age extraction fails', () => {
  const cards = [
    createMockJobCard('1', 'No time info here'),
    createMockJobCard('2', '3 days ago')
  ];
  const cache = {};
  const badgesAdded = [];
  const addBadgeFn = (card, age) => badgesAdded.push({ jobId: card.jobId, age });

  const results = processAllVisibleCardsForBadges(cards, cache, addBadgeFn);

  expect(results.failed).toBe(1);
  expect(results.badgesAdded).toBe(1);
});

console.log('\n=== Cache Population Tests ===\n');

// Test 7: Initial activation should NOT throttle cache population
test('populateCacheFromPageData: does NOT throttle on initial activation', () => {
  const cache = { _lastUpdate: Date.now() };  // Recently updated
  const pageData = [
    { id: '1', age: 3 },
    { id: '2', age: 7 }
  ];

  // Initial activation should skip throttle
  const result = populateCacheFromPageData(cache, pageData, { isInitialActivation: true });

  expect(result.skipped).toBe(false);
  expect(result.entriesAdded).toBe(2);
});

// Test 8: Normal updates should be throttled
test('populateCacheFromPageData: throttles non-initial updates', () => {
  const cache = { _lastUpdate: Date.now() };  // Just updated
  const pageData = [
    { id: '1', age: 3 }
  ];

  // Normal update should be throttled
  const result = populateCacheFromPageData(cache, pageData, { isInitialActivation: false });

  expect(result.skipped).toBe(true);
  expect(result.entriesAdded).toBe(0);
});

// Test 9: Cache should not overwrite existing entries
test('populateCacheFromPageData: does not overwrite existing cache entries', () => {
  const cache = { '1': 10 };  // Existing entry with age 10
  const pageData = [
    { id: '1', age: 3 },  // Different age
    { id: '2', age: 7 }   // New entry
  ];

  const result = populateCacheFromPageData(cache, pageData, { isInitialActivation: true });

  expect(cache['1']).toBe(10);  // Should keep original value
  expect(cache['2']).toBe(7);   // Should add new entry
  expect(result.entriesAdded).toBe(1);
});

console.log('\n=== Integration Tests ===\n');

// Test 10: Full flow - activate filter should populate cache and add all badges
test('Integration: filter activation populates cache AND adds badges to all cards', () => {
  // Simulate page data (from LinkedIn's embedded JSON)
  const pageData = [
    { id: '1', age: 3 },
    { id: '2', age: 7 },
    { id: '3', age: 14 }
  ];

  // Simulate job cards (some have text, some don't)
  const cards = [
    createMockJobCard('1', null),  // No text age
    createMockJobCard('2', '1 week ago'),  // Has text age
    createMockJobCard('3', null)   // No text age
  ];

  // Step 1: Populate cache (initial activation)
  const cache = {};
  populateCacheFromPageData(cache, pageData, { isInitialActivation: true });

  // Step 2: Process all cards
  const badgesAdded = [];
  const addBadgeFn = (card, age) => badgesAdded.push({ jobId: card.jobId, age });
  const results = processAllVisibleCardsForBadges(cards, cache, addBadgeFn);

  // All 3 cards should have badges
  expect(badgesAdded.length).toBe(3);
  expect(results.badgesAdded).toBe(3);
  expect(results.failed).toBe(0);
});

// Test 11: Badges should appear on cards even when text doesn't contain age
test('Integration: cards without visible age text get badges from cache', () => {
  const cache = { '1': 5, '2': 10, '3': 20 };
  const cards = [
    createMockJobCard('1', 'Software Engineer at Google'),  // No age in text
    createMockJobCard('2', 'Product Manager at Meta'),       // No age in text
    createMockJobCard('3', 'Data Scientist at Amazon')       // No age in text
  ];

  const badgesAdded = [];
  const addBadgeFn = (card, age) => badgesAdded.push({ jobId: card.jobId, age });
  const results = processAllVisibleCardsForBadges(cards, cache, addBadgeFn);

  // All cards should get badges from cache
  expect(results.badgesAdded).toBe(3);
  expect(badgesAdded[0].age).toBe(5);
  expect(badgesAdded[1].age).toBe(10);
  expect(badgesAdded[2].age).toBe(20);
});

// Test 12: Mixed scenario - some from cache, some from text
test('Integration: mixed sources - cache and text parsing', () => {
  const cache = { '1': 5 };  // Only job 1 in cache
  const cards = [
    createMockJobCard('1', null),           // Age from cache
    createMockJobCard('2', '3 days ago'),   // Age from text
    createMockJobCard('3', 'No time info')  // Will fail
  ];

  const badgesAdded = [];
  const addBadgeFn = (card, age) => badgesAdded.push({ jobId: card.jobId, age });
  const results = processAllVisibleCardsForBadges(cards, cache, addBadgeFn);

  expect(results.badgesAdded).toBe(2);
  expect(results.failed).toBe(1);
  expect(badgesAdded.find(b => b.jobId === '1').age).toBe(5);
  expect(badgesAdded.find(b => b.jobId === '2').age).toBe(3);
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
