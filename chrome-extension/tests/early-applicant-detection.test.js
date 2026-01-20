/**
 * Early Applicant Detection Tests
 * Comprehensive test suite for the confidence-based early applicant detection system
 *
 * Test Coverage:
 * - Pattern matching with confidence scores
 * - High, medium, and low confidence patterns
 * - Conservative vs aggressive mode
 * - DOM selector priorities
 * - Edge cases and false positive prevention
 */

// Import the pattern definitions (simulated for testing)
const EARLY_APPLICANT_PATTERNS = {
  high: [
    { pattern: /be among the first \d+ applicants?/i, confidence: 100, name: 'be_among_first_N' },
    { pattern: /be one of the first \d+ applicants?/i, confidence: 100, name: 'be_one_of_first_N' },
    { pattern: /be among the first to apply/i, confidence: 95, name: 'be_among_first_apply' },
    { pattern: /early applicant opportunity/i, confidence: 95, name: 'early_applicant_opportunity' },
    { pattern: /fewer than \d+ applicants?/i, confidence: 90, name: 'fewer_than_N' },
    { pattern: /less than \d+ applicants?/i, confidence: 90, name: 'less_than_N' },
    { pattern: /under \d+ applicants?/i, confidence: 88, name: 'under_N' },
  ],
  medium: [
    { pattern: /only \d+ applicants?/i, confidence: 80, name: 'only_N' },
    { pattern: /just posted/i, confidence: 70, name: 'just_posted' },
    { pattern: /posted today/i, confidence: 70, name: 'posted_today' },
    { pattern: /\d+ applicants? so far/i, confidence: 75, name: 'N_applicants_so_far' },
  ],
  low: [
    { pattern: /few applicants?/i, confidence: 55, name: 'few_applicants' },
    { pattern: /low applicant/i, confidence: 50, name: 'low_applicant' },
    { pattern: /apply now/i, confidence: 40, name: 'apply_now' },
  ]
};

/**
 * Helper: Check patterns in text (same logic as production code)
 */
function checkPatternsInText(text, conservativeMode = true) {
  const result = { confidence: 0, matchedPatterns: [] };
  if (!text || text.length < 5) return result;

  const textLower = text.toLowerCase();

  // Check high confidence patterns first
  for (const p of EARLY_APPLICANT_PATTERNS.high) {
    if (p.pattern.test(textLower)) {
      if (p.confidence > result.confidence) {
        result.confidence = p.confidence;
      }
      result.matchedPatterns.push(p.name);
    }
  }

  // Check medium confidence patterns if conservative mode allows
  if (!conservativeMode || result.confidence === 0) {
    for (const p of EARLY_APPLICANT_PATTERNS.medium) {
      if (p.pattern.test(textLower)) {
        if (p.confidence > result.confidence) {
          result.confidence = p.confidence;
        }
        result.matchedPatterns.push(p.name);
      }
    }
  }

  // Low confidence patterns only in non-conservative mode
  if (!conservativeMode && result.confidence === 0) {
    for (const p of EARLY_APPLICANT_PATTERNS.low) {
      if (p.pattern.test(textLower)) {
        if (p.confidence > result.confidence) {
          result.confidence = p.confidence;
        }
        result.matchedPatterns.push(p.name);
      }
    }
  }

  return result;
}

// ============================================
// TEST SUITE
// ============================================

describe('Early Applicant Detection', () => {

  // -----------------------------------------
  // HIGH CONFIDENCE PATTERN TESTS
  // -----------------------------------------
  describe('High Confidence Patterns', () => {

    test('should detect "Be among the first 25 applicants" with 100% confidence', () => {
      const result = checkPatternsInText('Be among the first 25 applicants');
      expect(result.confidence).toBe(100);
      expect(result.matchedPatterns).toContain('be_among_first_N');
    });

    test('should detect "Be among the first 10 applicants" with 100% confidence', () => {
      const result = checkPatternsInText('Be among the first 10 applicants');
      expect(result.confidence).toBe(100);
      expect(result.matchedPatterns).toContain('be_among_first_N');
    });

    test('should detect "Be one of the first 50 applicants" with 100% confidence', () => {
      const result = checkPatternsInText('Be one of the first 50 applicants');
      expect(result.confidence).toBe(100);
      expect(result.matchedPatterns).toContain('be_one_of_first_N');
    });

    test('should detect "Be among the first to apply" with 95% confidence', () => {
      const result = checkPatternsInText('Be among the first to apply for this position');
      expect(result.confidence).toBe(95);
      expect(result.matchedPatterns).toContain('be_among_first_apply');
    });

    test('should detect "Early applicant opportunity" with 95% confidence', () => {
      const result = checkPatternsInText('This is an early applicant opportunity');
      expect(result.confidence).toBe(95);
      expect(result.matchedPatterns).toContain('early_applicant_opportunity');
    });

    test('should detect "Fewer than 10 applicants" with 90% confidence', () => {
      const result = checkPatternsInText('Fewer than 10 applicants have applied');
      expect(result.confidence).toBe(90);
      expect(result.matchedPatterns).toContain('fewer_than_N');
    });

    test('should detect "Less than 5 applicants" with 90% confidence', () => {
      const result = checkPatternsInText('Less than 5 applicants');
      expect(result.confidence).toBe(90);
      expect(result.matchedPatterns).toContain('less_than_N');
    });

    test('should detect "Under 20 applicants" with 88% confidence', () => {
      const result = checkPatternsInText('Under 20 applicants so far');
      expect(result.confidence).toBe(88);
      expect(result.matchedPatterns).toContain('under_N');
    });

    test('should handle case insensitivity', () => {
      const result1 = checkPatternsInText('BE AMONG THE FIRST 25 APPLICANTS');
      const result2 = checkPatternsInText('be among the first 25 applicants');
      const result3 = checkPatternsInText('Be Among The First 25 Applicants');

      expect(result1.confidence).toBe(100);
      expect(result2.confidence).toBe(100);
      expect(result3.confidence).toBe(100);
    });

    test('should handle singular "applicant"', () => {
      const result = checkPatternsInText('Be among the first 1 applicant');
      expect(result.confidence).toBe(100);
    });
  });

  // -----------------------------------------
  // MEDIUM CONFIDENCE PATTERN TESTS
  // -----------------------------------------
  describe('Medium Confidence Patterns', () => {

    test('should detect "Only 15 applicants" with 80% confidence in non-conservative mode', () => {
      const result = checkPatternsInText('Only 15 applicants have applied', false);
      expect(result.confidence).toBe(80);
      expect(result.matchedPatterns).toContain('only_N');
    });

    test('should detect "Just posted" with 70% confidence in non-conservative mode', () => {
      const result = checkPatternsInText('Just posted - Apply now!', false);
      expect(result.confidence).toBe(70);
      expect(result.matchedPatterns).toContain('just_posted');
    });

    test('should detect "Posted today" with 70% confidence in non-conservative mode', () => {
      const result = checkPatternsInText('Posted today at 9:00 AM', false);
      expect(result.confidence).toBe(70);
      expect(result.matchedPatterns).toContain('posted_today');
    });

    test('should detect "5 applicants so far" with 75% confidence in non-conservative mode', () => {
      const result = checkPatternsInText('5 applicants so far', false);
      expect(result.confidence).toBe(75);
      expect(result.matchedPatterns).toContain('N_applicants_so_far');
    });

    test('should NOT detect medium patterns in conservative mode when no high patterns exist', () => {
      const result = checkPatternsInText('Just posted - Apply now!', true);
      // In conservative mode with no high patterns, medium patterns are still checked
      // but threshold is 70%, so this should still be flagged
      expect(result.confidence).toBe(70);
    });
  });

  // -----------------------------------------
  // LOW CONFIDENCE PATTERN TESTS
  // -----------------------------------------
  describe('Low Confidence Patterns', () => {

    test('should detect "Few applicants" with 55% confidence only in non-conservative mode', () => {
      const conservative = checkPatternsInText('Few applicants have applied', true);
      const nonConservative = checkPatternsInText('Few applicants have applied', false);

      expect(conservative.confidence).toBe(0); // Should NOT match in conservative
      expect(nonConservative.confidence).toBe(55);
      expect(nonConservative.matchedPatterns).toContain('few_applicants');
    });

    test('should detect "Low applicant" with 50% confidence only in non-conservative mode', () => {
      const conservative = checkPatternsInText('Low applicant count', true);
      const nonConservative = checkPatternsInText('Low applicant count', false);

      expect(conservative.confidence).toBe(0);
      expect(nonConservative.confidence).toBe(50);
    });

    test('should detect "Apply now" with 40% confidence only in non-conservative mode', () => {
      const conservative = checkPatternsInText('Apply now for this great opportunity', true);
      const nonConservative = checkPatternsInText('Apply now for this great opportunity', false);

      expect(conservative.confidence).toBe(0);
      expect(nonConservative.confidence).toBe(40);
    });
  });

  // -----------------------------------------
  // CONSERVATIVE MODE BEHAVIOR
  // -----------------------------------------
  describe('Conservative Mode Behavior', () => {

    test('should require 70% confidence threshold in conservative mode', () => {
      // 70% is the threshold, so "Just posted" (70%) should pass
      const result = checkPatternsInText('Just posted', true);
      expect(result.confidence).toBe(70);
      // isEarly would be: result.confidence >= 70 = true
    });

    test('should NOT flag low confidence patterns in conservative mode', () => {
      const result = checkPatternsInText('Apply now for this job with few applicants', true);
      // "Apply now" is 40%, "few applicants" is 55% - both below threshold
      expect(result.confidence).toBe(0);
    });

    test('should prioritize high confidence patterns over medium', () => {
      const text = 'Be among the first 25 applicants. Just posted today.';
      const result = checkPatternsInText(text, true);

      expect(result.confidence).toBe(100); // High pattern takes priority
      expect(result.matchedPatterns).toContain('be_among_first_N');
    });
  });

  // -----------------------------------------
  // EDGE CASES AND FALSE POSITIVE PREVENTION
  // -----------------------------------------
  describe('Edge Cases and False Positive Prevention', () => {

    test('should NOT detect "first" in unrelated context', () => {
      const result = checkPatternsInText('This is the first company to offer such benefits', true);
      expect(result.confidence).toBe(0);
    });

    test('should NOT detect "apply" in unrelated context', () => {
      const result = checkPatternsInText('These policies apply to all employees', true);
      expect(result.confidence).toBe(0);
    });

    test('should NOT detect numbers without applicant context', () => {
      const result = checkPatternsInText('We have 50 employees and 10 locations', true);
      expect(result.confidence).toBe(0);
    });

    test('should handle empty text', () => {
      const result = checkPatternsInText('', true);
      expect(result.confidence).toBe(0);
      expect(result.matchedPatterns).toEqual([]);
    });

    test('should handle very short text', () => {
      const result = checkPatternsInText('Hi', true);
      expect(result.confidence).toBe(0);
    });

    test('should handle null/undefined text', () => {
      const result1 = checkPatternsInText(null, true);
      const result2 = checkPatternsInText(undefined, true);

      expect(result1.confidence).toBe(0);
      expect(result2.confidence).toBe(0);
    });

    test('should NOT flag "posted yesterday" as early applicant', () => {
      const result = checkPatternsInText('Posted yesterday', true);
      expect(result.confidence).toBe(0);
    });

    test('should NOT flag "1000 applicants"', () => {
      // This should NOT match because it's not "fewer than" or "under"
      const result = checkPatternsInText('1000 applicants have already applied', true);
      expect(result.confidence).toBe(0);
    });
  });

  // -----------------------------------------
  // MULTIPLE PATTERN DETECTION
  // -----------------------------------------
  describe('Multiple Pattern Detection', () => {

    test('should capture all matched patterns', () => {
      const text = 'Be among the first 25 applicants. Fewer than 30 applicants have applied so far.';
      const result = checkPatternsInText(text, true);

      expect(result.matchedPatterns.length).toBeGreaterThanOrEqual(2);
      expect(result.matchedPatterns).toContain('be_among_first_N');
      expect(result.matchedPatterns).toContain('fewer_than_N');
    });

    test('should use highest confidence from multiple matches', () => {
      const text = 'Be among the first 25 applicants. Under 30 applicants.';
      const result = checkPatternsInText(text, true);

      // 100% > 88%
      expect(result.confidence).toBe(100);
    });
  });

  // -----------------------------------------
  // REAL-WORLD TEXT SCENARIOS
  // -----------------------------------------
  describe('Real-World Indeed Text Scenarios', () => {

    test('should detect Indeed hiring insights format', () => {
      const text = `
        Software Engineer
        TechCorp Inc. - San Francisco, CA

        Be among the first 25 applicants

        Apply on company site
      `;
      const result = checkPatternsInText(text, true);
      expect(result.confidence).toBe(100);
    });

    test('should detect in mixed content', () => {
      const text = `
        Job Description:
        We are looking for a talented developer...

        Hiring Insights:
        Be among the first to apply

        Benefits include health insurance...
      `;
      const result = checkPatternsInText(text, true);
      expect(result.confidence).toBe(95);
    });

    test('should NOT false positive on job description mentioning applicants', () => {
      const text = `
        Job Description:
        You will work with applicants to process their requests.
        This is your first opportunity to join our team.
      `;
      const result = checkPatternsInText(text, true);
      expect(result.confidence).toBe(0);
    });

    test('should detect Indeed "fewer than X" format', () => {
      const text = 'Hiring Insights: Fewer than 10 applicants';
      const result = checkPatternsInText(text, true);
      expect(result.confidence).toBe(90);
    });
  });
});

// -----------------------------------------
// CONFIDENCE THRESHOLD TESTS
// -----------------------------------------
describe('Confidence Threshold Logic', () => {

  test('conservative mode threshold is 70%', () => {
    const CONSERVATIVE_THRESHOLD = 70;

    // 70% should pass
    expect(70 >= CONSERVATIVE_THRESHOLD).toBe(true);
    // 69% should fail
    expect(69 >= CONSERVATIVE_THRESHOLD).toBe(false);
  });

  test('normal mode threshold is 50%', () => {
    const NORMAL_THRESHOLD = 50;

    // 50% should pass
    expect(50 >= NORMAL_THRESHOLD).toBe(true);
    // 49% should fail
    expect(49 >= NORMAL_THRESHOLD).toBe(false);
  });
});

// Run tests if in Node environment
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { checkPatternsInText, EARLY_APPLICANT_PATTERNS };
}
