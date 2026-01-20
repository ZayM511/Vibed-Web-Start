/**
 * Unit Tests for Staffing Display Mode Feature
 *
 * Tests the three display modes:
 * - 'hide': Completely hide staffing firm job cards
 * - 'flag': Show cards with a "Staffing" badge
 * - 'dim': Show cards with reduced opacity + badge
 */

// Mock DOM environment
const createMockJobCard = (companyName) => {
  const card = document.createElement('div');
  card.className = 'scaffold-layout__list-item';
  card.innerHTML = `
    <div class="job-card-container">
      <div class="job-card-container__company-name">${companyName}</div>
    </div>
  `;
  return card;
};

// Mock the staffing detection module
const mockStaffingModule = {
  isStaffingFirm: (jobCard, platform) => {
    const companyEl = jobCard.querySelector('.job-card-container__company-name');
    const companyName = companyEl?.textContent?.toLowerCase() || '';
    const knownStaffing = ['randstad', 'adecco', 'robert half', 'teksystems', 'insight global'];
    const isStaffing = knownStaffing.some(name => companyName.includes(name));
    return {
      isStaffing,
      confidence: isStaffing ? 0.95 : 0,
      tier: isStaffing ? 1 : null,
      reason: isStaffing ? 'Known staffing agency' : null
    };
  },
  addStaffingBadge: (jobCard, result, platform) => {
    if (jobCard.querySelector('.jobfiltr-staffing-badge')) return;
    const badge = document.createElement('span');
    badge.className = 'jobfiltr-staffing-badge';
    badge.textContent = 'Staffing';
    jobCard.appendChild(badge);
  },
  applyDimEffect: (jobCard) => {
    jobCard.classList.add('jobfiltr-staffing-dimmed');
    jobCard.style.opacity = '0.5';
  }
};

/**
 * Helper: Apply staffing filter to a job card based on display mode
 * This is the EXPECTED behavior we're testing against
 */
function applyStaffingFilter(jobCard, filterSettings, staffingModule) {
  if (!filterSettings.hideStaffing) return { shouldHide: false };

  const staffingResult = staffingModule.isStaffingFirm(jobCard, 'linkedin');

  if (!staffingResult.isStaffing) return { shouldHide: false };

  const displayMode = filterSettings.staffingDisplayMode || 'hide';

  if (displayMode === 'hide') {
    return { shouldHide: true, reason: 'Staffing Firm' };
  } else if (displayMode === 'flag') {
    staffingModule.addStaffingBadge(jobCard, staffingResult, 'linkedin');
    jobCard.dataset.jobfiltrStaffingFlagged = 'true';
    return { shouldHide: false };
  } else if (displayMode === 'dim') {
    staffingModule.applyDimEffect(jobCard);
    staffingModule.addStaffingBadge(jobCard, staffingResult, 'linkedin');
    jobCard.dataset.jobfiltrStaffingDimmed = 'true';
    return { shouldHide: false };
  }

  return { shouldHide: false };
}

// Test Suite
const tests = [];
let passCount = 0;
let failCount = 0;

function test(name, fn) {
  tests.push({ name, fn });
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
        throw new Error(`Expected truthy but got ${actual}`);
      }
    },
    toBeFalsy: () => {
      if (actual) {
        throw new Error(`Expected falsy but got ${actual}`);
      }
    },
    toContain: (expected) => {
      if (!actual || !actual.includes(expected)) {
        throw new Error(`Expected "${actual}" to contain "${expected}"`);
      }
    }
  };
}

// ========== TEST CASES ==========

test('Display Mode: hide - should hide staffing firm cards', () => {
  const card = createMockJobCard('Randstad USA');
  const settings = { hideStaffing: true, staffingDisplayMode: 'hide' };

  const result = applyStaffingFilter(card, settings, mockStaffingModule);

  expect(result.shouldHide).toBe(true);
  expect(result.reason).toBe('Staffing Firm');
});

test('Display Mode: flag - should NOT hide staffing firm cards', () => {
  const card = createMockJobCard('TekSystems Inc');
  const settings = { hideStaffing: true, staffingDisplayMode: 'flag' };

  const result = applyStaffingFilter(card, settings, mockStaffingModule);

  expect(result.shouldHide).toBe(false);
});

test('Display Mode: flag - should add staffing badge', () => {
  const card = createMockJobCard('Insight Global');
  const settings = { hideStaffing: true, staffingDisplayMode: 'flag' };

  applyStaffingFilter(card, settings, mockStaffingModule);

  const badge = card.querySelector('.jobfiltr-staffing-badge');
  expect(badge).toBeTruthy();
  expect(badge.textContent).toContain('Staffing');
});

test('Display Mode: flag - should set flagged data attribute', () => {
  const card = createMockJobCard('Robert Half');
  const settings = { hideStaffing: true, staffingDisplayMode: 'flag' };

  applyStaffingFilter(card, settings, mockStaffingModule);

  expect(card.dataset.jobfiltrStaffingFlagged).toBe('true');
});

test('Display Mode: dim - should NOT hide staffing firm cards', () => {
  const card = createMockJobCard('Adecco Group');
  const settings = { hideStaffing: true, staffingDisplayMode: 'dim' };

  const result = applyStaffingFilter(card, settings, mockStaffingModule);

  expect(result.shouldHide).toBe(false);
});

test('Display Mode: dim - should apply dim effect (opacity)', () => {
  const card = createMockJobCard('Randstad');
  const settings = { hideStaffing: true, staffingDisplayMode: 'dim' };

  applyStaffingFilter(card, settings, mockStaffingModule);

  expect(card.style.opacity).toBe('0.5');
  expect(card.classList.contains('jobfiltr-staffing-dimmed')).toBe(true);
});

test('Display Mode: dim - should add staffing badge AND dim', () => {
  const card = createMockJobCard('TekSystems');
  const settings = { hideStaffing: true, staffingDisplayMode: 'dim' };

  applyStaffingFilter(card, settings, mockStaffingModule);

  const badge = card.querySelector('.jobfiltr-staffing-badge');
  expect(badge).toBeTruthy();
  expect(card.style.opacity).toBe('0.5');
});

test('Display Mode: dim - should set dimmed data attribute', () => {
  const card = createMockJobCard('Insight Global LLC');
  const settings = { hideStaffing: true, staffingDisplayMode: 'dim' };

  applyStaffingFilter(card, settings, mockStaffingModule);

  expect(card.dataset.jobfiltrStaffingDimmed).toBe('true');
});

test('Non-staffing company - should NOT be hidden regardless of mode', () => {
  const card = createMockJobCard('Google Inc');
  const settings = { hideStaffing: true, staffingDisplayMode: 'hide' };

  const result = applyStaffingFilter(card, settings, mockStaffingModule);

  expect(result.shouldHide).toBe(false);
});

test('Non-staffing company - should NOT get staffing badge', () => {
  const card = createMockJobCard('Microsoft Corporation');
  const settings = { hideStaffing: true, staffingDisplayMode: 'flag' };

  applyStaffingFilter(card, settings, mockStaffingModule);

  const badge = card.querySelector('.jobfiltr-staffing-badge');
  expect(badge).toBeFalsy();
});

test('hideStaffing disabled - should NOT hide or badge staffing firms', () => {
  const card = createMockJobCard('Randstad');
  const settings = { hideStaffing: false, staffingDisplayMode: 'hide' };

  const result = applyStaffingFilter(card, settings, mockStaffingModule);

  expect(result.shouldHide).toBe(false);
  const badge = card.querySelector('.jobfiltr-staffing-badge');
  expect(badge).toBeFalsy();
});

test('Default display mode (undefined) - should default to hide', () => {
  const card = createMockJobCard('Adecco');
  const settings = { hideStaffing: true }; // No staffingDisplayMode set

  const result = applyStaffingFilter(card, settings, mockStaffingModule);

  expect(result.shouldHide).toBe(true);
});

// ========== RUN TESTS ==========

function runTests() {
  console.log('\\n========== Staffing Display Mode Tests ==========\\n');

  for (const { name, fn } of tests) {
    try {
      // Reset DOM for each test
      document.body.innerHTML = '';
      fn();
      console.log(`✓ ${name}`);
      passCount++;
    } catch (error) {
      console.log(`✗ ${name}`);
      console.log(`  Error: ${error.message}`);
      failCount++;
    }
  }

  console.log(`\\n========== Results ==========`);
  console.log(`Passed: ${passCount}`);
  console.log(`Failed: ${failCount}`);
  console.log(`Total:  ${tests.length}`);

  return failCount === 0;
}

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { runTests, tests, applyStaffingFilter };
}

// Run if executed directly
if (typeof window !== 'undefined') {
  runTests();
} else if (typeof require !== 'undefined' && require.main === module) {
  // Node.js with JSDOM
  const { JSDOM } = require('jsdom');
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
  global.document = dom.window.document;

  const success = runTests();
  process.exit(success ? 0 : 1);
}
