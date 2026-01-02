import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StaffingFirmDetector } from '../staffingFirm';
import { createMockJob, createMockStaffingJob, KNOWN_STAFFING_FIRMS } from '@/src/test/factories';

// Mock hybridStorage
vi.mock('@/storage/hybridStorage', () => ({
  hybridStorage: {
    getCommunityBlocklist: vi.fn().mockResolvedValue([]),
    addExcludeCompany: vi.fn().mockResolvedValue(undefined),
  },
}));

describe('StaffingFirmDetector', () => {
  let detector: StaffingFirmDetector;

  beforeEach(async () => {
    detector = new StaffingFirmDetector();
    // Initialize without loading blocklist
  });

  describe('Company Name Pattern Detection', () => {
    const staffingPatterns = [
      { company: 'ABC Staffing Solutions', pattern: 'staffing' },
      { company: 'Tech Recruiting Partners', pattern: 'recruiting' },
      { company: 'Talent Solutions Group', pattern: 'talent solutions' },
      { company: 'Workforce Management Inc', pattern: 'workforce' },
      { company: 'Personnel Services LLC', pattern: 'personnel' },
      { company: 'Technical Resources Corp', pattern: 'technical resources' },
      { company: 'Placement Professionals', pattern: 'placement' },
      { company: 'IT Contractors', pattern: 'contractors' },
    ];

    staffingPatterns.forEach(({ company, pattern }) => {
      it(`should detect company with "${pattern}" pattern: ${company}`, () => {
        const job = createMockJob({ company });
        const result = detector.analyze(job);
        expect(result.confidence).toBeGreaterThan(0.5);
      });
    });

    it('should NOT flag legitimate companies with similar words', () => {
      const legitimateCompanies = [
        'Stafford Technologies',
        'The Hartford Insurance',
        'Microsoft',
        'Google',
        'Amazon',
      ];

      legitimateCompanies.forEach(company => {
        const job = createMockJob({ company });
        const result = detector.analyze(job);
        // These should have lower confidence (may have some pattern match)
        if (!company.toLowerCase().includes('staffing') && !company.toLowerCase().includes('recruit')) {
          expect(result.detected).toBe(false);
        }
      });
    });
  });

  describe('Description Language Detection', () => {
    it('should detect "our client" phrasing', () => {
      const job = createMockJob({
        company: 'Tech Solutions Inc',
        description: 'Our client, a Fortune 500 company, is seeking a talented developer.',
      });
      const result = detector.analyze(job);
      expect(result.confidence).toBeGreaterThan(0.5);
      expect(result.evidence.some(e => e.toLowerCase().includes('client'))).toBe(true);
    });

    it('should detect "on behalf of our client"', () => {
      const job = createMockJob({
        description: 'We are hiring on behalf of our client for this exciting role.',
      });
      const result = detector.analyze(job);
      expect(result.evidence.some(e => e.toLowerCase().includes('client'))).toBe(true);
    });

    it('should detect contract-to-hire terminology', () => {
      const job = createMockJob({
        description: 'This is a contract-to-hire position with excellent benefits.',
      });
      const result = detector.analyze(job);
      expect(result.evidence.some(e => e.toLowerCase().includes('contract'))).toBe(true);
    });

    it('should detect W2 contract mentions', () => {
      const job = createMockJob({
        description: 'Position available as W2 contract. Great hourly rate!',
      });
      const result = detector.analyze(job);
      expect(result.evidence.some(e => e.toLowerCase().includes('w2'))).toBe(true);
    });

    it('should detect C2C (Corp-to-Corp) mentions', () => {
      const job = createMockJob({
        description: 'C2C available for qualified candidates. 1099 also accepted.',
      });
      const result = detector.analyze(job);
      expect(result.evidence.some(e => e.toLowerCase().includes('c2c'))).toBe(true);
    });

    it('should detect "confidential client"', () => {
      const job = createMockJob({
        description: 'Our confidential client is looking for experienced developers.',
      });
      const result = detector.analyze(job);
      expect(result.evidence.some(e => e.toLowerCase().includes('confidential'))).toBe(true);
    });

    it('should detect "right to represent"', () => {
      const job = createMockJob({
        description: 'Please confirm right to represent before submission.',
      });
      const result = detector.analyze(job);
      expect(result.evidence.some(e => e.toLowerCase().includes('right to represent'))).toBe(true);
    });

    it('should detect "bill rate" mentions', () => {
      const job = createMockJob({
        description: 'Bill rate: $85/hour. Looking for senior developers.',
      });
      const result = detector.analyze(job);
      expect(result.evidence.some(e => e.toLowerCase().includes('bill rate'))).toBe(true);
    });
  });

  describe('Combined Signal Detection', () => {
    it('should have high confidence when multiple signals present', () => {
      const job = createMockStaffingJob();
      const result = detector.analyze(job);
      expect(result.confidence).toBeGreaterThan(0.8);
      expect(result.detected).toBe(true);
    });

    it('should accumulate confidence from multiple signals', () => {
      const multiSignalJob = createMockJob({
        company: 'IT Recruiting Solutions',
        description: 'Our client is seeking a developer. This is a W2 contract-to-hire position.',
      });
      const result = detector.analyze(multiSignalJob);
      expect(result.confidence).toBeGreaterThan(0.7);
      expect(result.evidence.length).toBeGreaterThan(1);
    });
  });

  describe('Direct Hire Detection', () => {
    it('should NOT flag direct hire positions', () => {
      const directHireJob = createMockJob({
        company: 'Google',
        description: 'Direct hire position. No agencies or recruiters please. Full-time permanent role.',
      });
      const result = detector.analyze(directHireJob);
      expect(result.detected).toBe(false);
    });

    it('should NOT flag jobs without staffing indicators', () => {
      const normalJob = createMockJob({
        company: 'Stripe',
        description: 'Join our engineering team to build payment infrastructure.',
      });
      const result = detector.analyze(normalJob);
      expect(result.detected).toBe(false);
      expect(result.confidence).toBeLessThan(0.5);
    });
  });

  describe('Result Structure', () => {
    it('should return proper detection result structure', () => {
      const job = createMockJob();
      const result = detector.analyze(job);

      expect(result).toHaveProperty('detected');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('category');
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('evidence');
      expect(result.category).toBe('staffing');
      expect(typeof result.detected).toBe('boolean');
      expect(typeof result.confidence).toBe('number');
      expect(Array.isArray(result.evidence)).toBe(true);
    });

    it('should provide appropriate messages', () => {
      const staffingJob = createMockStaffingJob();
      const result = detector.analyze(staffingJob);
      expect(typeof result.message).toBe('string');
      expect(result.message.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty description', () => {
      const job = createMockJob({
        description: '',
      });
      expect(() => detector.analyze(job)).not.toThrow();
    });

    it('should handle missing company name', () => {
      const job = createMockJob({
        company: '',
      });
      expect(() => detector.analyze(job)).not.toThrow();
    });

    it('should handle case insensitivity', () => {
      const upperCaseJob = createMockJob({
        description: 'OUR CLIENT IS SEEKING A W2 CONTRACT DEVELOPER.',
      });
      const result = detector.analyze(upperCaseJob);
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('should limit evidence to 5 items', () => {
      const manySignalsJob = createMockJob({
        company: 'Tech Staffing Recruiting Solutions',
        description: 'Our client W2 contract-to-hire C2C bill rate confidential right to represent.',
      });
      const result = detector.analyze(manySignalsJob);
      expect(result.evidence.length).toBeLessThanOrEqual(5);
    });
  });

  describe('Stats', () => {
    it('should return stats object', () => {
      const stats = detector.getStats();
      expect(stats).toHaveProperty('total');
      expect(typeof stats.total).toBe('number');
    });
  });
});
