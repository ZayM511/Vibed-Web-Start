import { describe, it, expect, beforeEach } from 'vitest';
import { GhostJobDetector } from '../ghostJob';
import { createMockJob, createMockGhostJob } from '@/src/test/factories';

describe('GhostJobDetector', () => {
  let detector: GhostJobDetector;

  beforeEach(() => {
    detector = new GhostJobDetector();
  });

  describe('Temporal Signals', () => {
    it('should flag jobs with high risk (60+ days old)', () => {
      const oldJob = createMockJob({
        postedDate: '60 days ago',
      });
      const result = detector.analyze(oldJob);
      expect(result.confidence).toBeGreaterThan(0.3);
      expect(result.evidence.some(e => e.includes('60'))).toBe(true);
    });

    it('should flag jobs with medium risk (30+ days old)', () => {
      const mediumJob = createMockJob({
        postedDate: '35 days ago',
      });
      const result = detector.analyze(mediumJob);
      expect(result.confidence).toBeGreaterThan(0.2);
    });

    it('should flag jobs with low risk (14+ days old)', () => {
      const lowRiskJob = createMockJob({
        postedDate: '20 days ago',
      });
      const result = detector.analyze(lowRiskJob);
      expect(result.confidence).toBeGreaterThan(0.1);
    });

    it('should NOT flag fresh jobs (under 14 days)', () => {
      const freshJob = createMockJob({
        postedDate: '5 days ago',
      });
      const result = detector.analyze(freshJob);
      expect(result.evidence.some(e => e.toLowerCase().includes('days ago'))).toBe(false);
    });

    it('should handle "Just posted" correctly', () => {
      const newJob = createMockJob({
        postedDate: 'Just posted',
      });
      const result = detector.analyze(newJob);
      expect(result.evidence.some(e => e.includes('days ago'))).toBe(false);
    });

    it('should handle "X weeks ago" format', () => {
      const weeksJob = createMockJob({
        postedDate: '6 weeks ago',
      });
      const result = detector.analyze(weeksJob);
      // 6 weeks = 42 days, should be flagged
      expect(result.confidence).toBeGreaterThan(0.2);
    });
  });

  describe('Content Signals - Vague Patterns', () => {
    it('should flag "competitive salary" language', () => {
      const vagueJob = createMockJob({
        description: 'Great benefits! Competitive salary based on experience.',
      });
      const result = detector.analyze(vagueJob);
      expect(result.evidence.some(e => e.toLowerCase().includes('vague') || e.toLowerCase().includes('salary'))).toBe(true);
    });

    it('should flag "fast-paced environment" buzzword', () => {
      const buzzwordJob = createMockJob({
        description: 'Join our fast-paced environment with amazing growth opportunities!',
      });
      const result = detector.analyze(buzzwordJob);
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should flag ninja/rockstar/guru titles', () => {
      const ninjaJob = createMockJob({
        title: 'Code Ninja',
        description: 'Looking for a rockstar developer.',
      });
      const result = detector.analyze(ninjaJob);
      expect(result.evidence.some(e => e.toLowerCase().includes('buzzword'))).toBe(true);
    });

    it('should flag "various responsibilities" vagueness', () => {
      const vagueJob = createMockJob({
        description: 'You will handle various responsibilities and duties.',
      });
      const result = detector.analyze(vagueJob);
      expect(result.confidence).toBeGreaterThan(0);
    });
  });

  describe('Content Signals - Repost Patterns', () => {
    it('should flag explicit reposted jobs', () => {
      const repostJob = createMockJob({
        description: 'REPOSTED: We are still looking for candidates.',
      });
      const result = detector.analyze(repostJob);
      expect(result.evidence.some(e => e.toLowerCase().includes('repost'))).toBe(true);
    });

    it('should flag "still looking" language', () => {
      const stillLookingJob = createMockJob({
        description: 'We are still looking for the right candidate.',
      });
      const result = detector.analyze(stillLookingJob);
      expect(result.evidence.some(e => e.toLowerCase().includes('still'))).toBe(true);
    });

    it('should flag "position remains open"', () => {
      const remainsOpenJob = createMockJob({
        description: 'This position remains open.',
      });
      const result = detector.analyze(remainsOpenJob);
      expect(result.evidence.some(e => e.toLowerCase().includes('open') || e.toLowerCase().includes('remains'))).toBe(true);
    });
  });

  describe('Content Signals - Excessive Requirements', () => {
    it('should flag excessive experience requirements (15+ years)', () => {
      const excessiveJob = createMockJob({
        description: 'Must have 15+ years of experience in JavaScript.',
      });
      const result = detector.analyze(excessiveJob);
      expect(result.evidence.some(e => e.toLowerCase().includes('excessive'))).toBe(true);
    });

    it('should flag entry-level with senior requirements', () => {
      const mismatchJob = createMockJob({
        title: 'Entry-Level Developer',
        description: 'Entry level position requiring 7 years of experience.',
      });
      const result = detector.analyze(mismatchJob);
      expect(result.confidence).toBeGreaterThan(0.3);
    });
  });

  describe('Applicant Count Signals (Deprecated)', () => {
    // NOTE: Numeric applicant count detection was removed because extraction was unreliable
    // The isEarlyApplicant() detection is now handled separately in the extension
    it('should NOT flag based on applicant count (feature removed)', () => {
      const lowApplicantJob = createMockJob({
        postedDate: '45 days ago',
        applicantCount: 5,
      });
      const result = detector.analyze(lowApplicantJob);
      // Applicant-based detection was removed due to unreliable data extraction
      expect(result.evidence.some(e => e.toLowerCase().includes('applicant'))).toBe(false);
    });

    it('should ignore applicant count for new posts', () => {
      const newJob = createMockJob({
        postedDate: '2 days ago',
        applicantCount: 5,
      });
      const result = detector.analyze(newJob);
      expect(result.evidence.some(e => e.toLowerCase().includes('applicant'))).toBe(false);
    });
  });

  describe('Missing Information Signals', () => {
    it('should flag missing salary information', () => {
      const noSalaryJob = createMockJob({
        salary: undefined,
        description: 'Great benefits package!',
      });
      const result = detector.analyze(noSalaryJob);
      expect(result.evidence.some(e => e.toLowerCase().includes('salary'))).toBe(true);
    });

    it('should NOT flag when salary is in description', () => {
      const salaryInDescJob = createMockJob({
        salary: undefined,
        description: 'Salary range: $100k-$150k per year.',
      });
      const result = detector.analyze(salaryInDescJob);
      // Should not flag as missing salary since it's in description
      expect(result.evidence.filter(e => e.toLowerCase() === 'no salary information').length).toBe(0);
    });
  });

  describe('Confidence Scoring', () => {
    it('should return high confidence (>0.5) for obvious ghost jobs', () => {
      const obviousGhost = createMockGhostJob();
      const result = detector.analyze(obviousGhost);
      expect(result.confidence).toBeGreaterThan(0.5);
      expect(result.detected).toBe(true);
    });

    it('should return low confidence (<0.3) for legitimate jobs', () => {
      const legitimateJob = createMockJob({
        postedDate: '3 days ago',
        salary: '$150,000 - $180,000',
        applicantCount: 100,
        description: `
          We are seeking a Senior Software Engineer to join our Platform team.

          Responsibilities:
          - Design and implement scalable microservices using TypeScript and Node.js
          - Mentor junior engineers and participate in code reviews
          - Participate in architecture decisions and technical planning

          Requirements:
          - 5+ years of experience with TypeScript/Node.js
          - Experience with AWS or GCP
          - Strong communication skills

          Benefits:
          - Competitive salary: $150,000 - $180,000
          - Health, dental, vision insurance
          - 401k matching up to 4%
          - Unlimited PTO
        `,
      });
      const result = detector.analyze(legitimateJob);
      expect(result.confidence).toBeLessThan(0.3);
      expect(result.detected).toBe(false);
    });

    it('should normalize confidence to max 0.95', () => {
      const extremeGhost = createMockJob({
        postedDate: '90 days ago',
        company: 'Confidential',
        description: 'Reposted! Still looking! Fast-paced! Competitive salary! Ninja wanted!',
        applicantCount: 2,
        salary: undefined,
      });
      const result = detector.analyze(extremeGhost);
      expect(result.confidence).toBeLessThanOrEqual(0.95);
    });
  });

  describe('Category Assignment', () => {
    it('should categorize as "likely_ghost" for confidence >= 0.8', () => {
      const category = detector.getScoreCategory(0.85);
      expect(category).toBe('likely_ghost');
    });

    it('should categorize as "high_risk" for confidence >= 0.6', () => {
      const category = detector.getScoreCategory(0.65);
      expect(category).toBe('high_risk');
    });

    it('should categorize as "medium_risk" for confidence >= 0.4', () => {
      const category = detector.getScoreCategory(0.45);
      expect(category).toBe('medium_risk');
    });

    it('should categorize as "low_risk" for confidence >= 0.2', () => {
      const category = detector.getScoreCategory(0.25);
      expect(category).toBe('low_risk');
    });

    it('should categorize as "safe" for confidence < 0.2', () => {
      const category = detector.getScoreCategory(0.1);
      expect(category).toBe('safe');
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing fields gracefully', () => {
      const incompleteJob = {
        title: 'Engineer',
        company: 'Company',
        location: 'NYC',
        description: '',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any;
      expect(() => detector.analyze(incompleteJob)).not.toThrow();
    });

    it('should handle null/undefined postedDate', () => {
      const nullDateJob = createMockJob({
        postedDate: null,
      });
      expect(() => detector.analyze(nullDateJob)).not.toThrow();
    });

    it('should handle empty description', () => {
      const emptyDescJob = createMockJob({
        description: '',
      });
      const result = detector.analyze(emptyDescJob);
      expect(result).toBeDefined();
    });

    it('should handle extremely long descriptions efficiently', () => {
      const longJob = createMockJob({
        description: 'x'.repeat(50000),
      });
      const start = performance.now();
      detector.analyze(longJob);
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(500); // Should complete in <500ms
    });

    it('should return proper result structure', () => {
      const job = createMockJob();
      const result = detector.analyze(job);

      expect(result).toHaveProperty('detected');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('category');
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('evidence');
      expect(typeof result.detected).toBe('boolean');
      expect(typeof result.confidence).toBe('number');
      expect(Array.isArray(result.evidence)).toBe(true);
    });
  });
});
