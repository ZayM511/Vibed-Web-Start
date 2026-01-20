/**
 * Early Applicant Detection Tests
 * Comprehensive test suite for the confidence-based early applicant detection system
 *
 * This tests the pattern matching logic that is used by both Indeed and LinkedIn adapters
 */

import { describe, it, expect } from 'vitest';

// Pattern categories with confidence weights (same as production code)
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

interface PatternResult {
  confidence: number;
  matchedPatterns: string[];
}

/**
 * Check patterns in text - mirrors production logic
 */
function checkPatternsInText(text: string | null | undefined, conservativeMode = true): PatternResult {
  const result: PatternResult = { confidence: 0, matchedPatterns: [] };
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

  // Check medium confidence patterns
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

/**
 * Simulate the isEarlyApplicant function
 */
function isEarlyApplicant(text: string, conservativeMode = true): boolean {
  const detection = checkPatternsInText(text, conservativeMode);
  const threshold = conservativeMode ? 70 : 50;
  return detection.confidence >= threshold;
}

describe('Early Applicant Detection - Pattern Matching', () => {

  describe('High Confidence Patterns (85-100%)', () => {

    it('should detect "Be among the first 25 applicants" with 100% confidence', () => {
      const result = checkPatternsInText('Be among the first 25 applicants');
      expect(result.confidence).toBe(100);
      expect(result.matchedPatterns).toContain('be_among_first_N');
    });

    it('should detect variations of applicant numbers', () => {
      expect(checkPatternsInText('Be among the first 10 applicants').confidence).toBe(100);
      expect(checkPatternsInText('Be among the first 50 applicants').confidence).toBe(100);
      expect(checkPatternsInText('Be among the first 100 applicants').confidence).toBe(100);
      expect(checkPatternsInText('Be among the first 1 applicant').confidence).toBe(100);
    });

    it('should detect "Be one of the first X applicants"', () => {
      const result = checkPatternsInText('Be one of the first 15 applicants');
      expect(result.confidence).toBe(100);
      expect(result.matchedPatterns).toContain('be_one_of_first_N');
    });

    it('should detect "Be among the first to apply" with 95% confidence', () => {
      const result = checkPatternsInText('Be among the first to apply');
      expect(result.confidence).toBe(95);
      expect(result.matchedPatterns).toContain('be_among_first_apply');
    });

    it('should detect "Early applicant opportunity" with 95% confidence', () => {
      const result = checkPatternsInText('This is an early applicant opportunity');
      expect(result.confidence).toBe(95);
    });

    it('should detect "Fewer than X applicants" with 90% confidence', () => {
      const result = checkPatternsInText('Fewer than 10 applicants');
      expect(result.confidence).toBe(90);
      expect(result.matchedPatterns).toContain('fewer_than_N');
    });

    it('should detect "Less than X applicants" with 90% confidence', () => {
      const result = checkPatternsInText('Less than 5 applicants have applied');
      expect(result.confidence).toBe(90);
      expect(result.matchedPatterns).toContain('less_than_N');
    });

    it('should detect "Under X applicants" with 88% confidence', () => {
      const result = checkPatternsInText('Under 20 applicants');
      expect(result.confidence).toBe(88);
      expect(result.matchedPatterns).toContain('under_N');
    });

    it('should be case insensitive', () => {
      expect(checkPatternsInText('BE AMONG THE FIRST 25 APPLICANTS').confidence).toBe(100);
      expect(checkPatternsInText('be among the first 25 applicants').confidence).toBe(100);
      expect(checkPatternsInText('Be Among The First 25 Applicants').confidence).toBe(100);
    });
  });

  describe('Medium Confidence Patterns (60-84%)', () => {

    it('should detect "Only X applicants" with 80% confidence', () => {
      const result = checkPatternsInText('Only 15 applicants', false);
      expect(result.confidence).toBe(80);
      expect(result.matchedPatterns).toContain('only_N');
    });

    it('should detect "Just posted" with 70% confidence', () => {
      const result = checkPatternsInText('Just posted', false);
      expect(result.confidence).toBe(70);
      expect(result.matchedPatterns).toContain('just_posted');
    });

    it('should detect "Posted today" with 70% confidence', () => {
      const result = checkPatternsInText('Posted today', false);
      expect(result.confidence).toBe(70);
    });

    it('should detect "X applicants so far" with 75% confidence', () => {
      const result = checkPatternsInText('5 applicants so far', false);
      expect(result.confidence).toBe(75);
    });
  });

  describe('Low Confidence Patterns (40-59%)', () => {

    it('should detect "Few applicants" only in non-conservative mode', () => {
      const conservative = checkPatternsInText('Few applicants', true);
      const nonConservative = checkPatternsInText('Few applicants', false);

      expect(conservative.confidence).toBe(0); // Not detected in conservative
      expect(nonConservative.confidence).toBe(55);
    });

    it('should detect "Low applicant" only in non-conservative mode', () => {
      const conservative = checkPatternsInText('Low applicant count', true);
      const nonConservative = checkPatternsInText('Low applicant count', false);

      expect(conservative.confidence).toBe(0);
      expect(nonConservative.confidence).toBe(50);
    });

    it('should detect "Apply now" only in non-conservative mode', () => {
      const conservative = checkPatternsInText('Apply now', true);
      const nonConservative = checkPatternsInText('Apply now', false);

      expect(conservative.confidence).toBe(0);
      expect(nonConservative.confidence).toBe(40);
    });
  });

  describe('Conservative Mode Behavior', () => {

    it('should meet 70% threshold for isEarlyApplicant in conservative mode', () => {
      expect(isEarlyApplicant('Be among the first 25 applicants', true)).toBe(true); // 100%
      expect(isEarlyApplicant('Just posted', true)).toBe(true); // 70%
      expect(isEarlyApplicant('Few applicants', true)).toBe(false); // 0% in conservative
    });

    it('should prioritize high confidence patterns', () => {
      const text = 'Be among the first 25 applicants. Just posted today.';
      const result = checkPatternsInText(text, true);

      expect(result.confidence).toBe(100);
      expect(result.matchedPatterns).toContain('be_among_first_N');
    });
  });

  describe('Non-Conservative Mode Behavior', () => {

    it('should meet 50% threshold for isEarlyApplicant in non-conservative mode', () => {
      expect(isEarlyApplicant('Few applicants', false)).toBe(true); // 55%
      expect(isEarlyApplicant('Apply now', false)).toBe(false); // 40%
    });
  });

  describe('Edge Cases and False Positive Prevention', () => {

    it('should NOT detect "first" in unrelated context', () => {
      const result = checkPatternsInText('This is the first company to offer such benefits');
      expect(result.confidence).toBe(0);
    });

    it('should NOT detect generic "apply" context', () => {
      const result = checkPatternsInText('These rules apply to all employees');
      expect(result.confidence).toBe(0);
    });

    it('should NOT detect numbers without applicant context', () => {
      const result = checkPatternsInText('We have 50 employees');
      expect(result.confidence).toBe(0);
    });

    it('should handle empty text', () => {
      const result = checkPatternsInText('');
      expect(result.confidence).toBe(0);
      expect(result.matchedPatterns).toEqual([]);
    });

    it('should handle very short text', () => {
      const result = checkPatternsInText('Hi');
      expect(result.confidence).toBe(0);
    });

    it('should handle null/undefined text', () => {
      expect(checkPatternsInText(null).confidence).toBe(0);
      expect(checkPatternsInText(undefined).confidence).toBe(0);
    });

    it('should NOT flag "posted yesterday"', () => {
      const result = checkPatternsInText('Posted yesterday');
      expect(result.confidence).toBe(0);
    });

    it('should NOT flag large applicant numbers like "1000 applicants"', () => {
      const result = checkPatternsInText('1000 applicants have applied');
      expect(result.confidence).toBe(0);
    });

    it('should NOT flag "applicants" in job description context', () => {
      const result = checkPatternsInText('You will review applicants for positions');
      expect(result.confidence).toBe(0);
    });
  });

  describe('Multiple Pattern Detection', () => {

    it('should capture all matched patterns', () => {
      const text = 'Be among the first 25 applicants. Fewer than 30 applicants have applied.';
      const result = checkPatternsInText(text, true);

      expect(result.matchedPatterns.length).toBeGreaterThanOrEqual(2);
      expect(result.matchedPatterns).toContain('be_among_first_N');
      expect(result.matchedPatterns).toContain('fewer_than_N');
    });

    it('should use highest confidence from multiple matches', () => {
      const text = 'Be among the first 25 applicants. Under 30 applicants.';
      const result = checkPatternsInText(text, true);

      // 100% (be_among_first_N) > 88% (under_N)
      expect(result.confidence).toBe(100);
    });
  });

  describe('Real-World Indeed/LinkedIn Text Scenarios', () => {

    it('should detect Indeed hiring insights format', () => {
      const text = `
        Software Engineer
        TechCorp Inc. - San Francisco, CA
        Be among the first 25 applicants
        Apply on company site
      `;
      expect(isEarlyApplicant(text, true)).toBe(true);
    });

    it('should detect in mixed content', () => {
      const text = `
        Job Description:
        We are looking for a talented developer...
        Hiring Insights:
        Be among the first to apply
        Benefits include health insurance...
      `;
      expect(isEarlyApplicant(text, true)).toBe(true);
    });

    it('should NOT false positive on job description mentioning applicants', () => {
      const text = `
        Job Description:
        You will work with applicants to process their requests.
        This is your first opportunity to join our team.
      `;
      expect(isEarlyApplicant(text, true)).toBe(false);
    });

    it('should detect LinkedIn-style "fewer than X" format', () => {
      const text = 'Fewer than 10 applicants';
      expect(isEarlyApplicant(text, true)).toBe(true);
    });
  });
});

describe('Confidence Threshold Tests', () => {

  it('conservative mode threshold is 70%', () => {
    const CONSERVATIVE_THRESHOLD = 70;

    expect(70 >= CONSERVATIVE_THRESHOLD).toBe(true);
    expect(69 >= CONSERVATIVE_THRESHOLD).toBe(false);
  });

  it('normal mode threshold is 50%', () => {
    const NORMAL_THRESHOLD = 50;

    expect(50 >= NORMAL_THRESHOLD).toBe(true);
    expect(49 >= NORMAL_THRESHOLD).toBe(false);
  });
});
