import { describe, it, expect, beforeEach } from 'vitest';
import { RemoteVerifier } from '../remoteVerifier';
import { createMockJob, createMockFakeRemoteJob, createMockTrueRemoteJob } from '@/src/test/factories';

describe('RemoteVerifier', () => {
  let verifier: RemoteVerifier;

  beforeEach(() => {
    verifier = new RemoteVerifier();
  });

  describe('Non-Remote Jobs', () => {
    it('should not flag non-remote jobs', () => {
      const onsiteJob = createMockJob({
        title: 'Software Engineer',
        location: 'San Francisco, CA',
        isRemote: false,
        description: 'On-site position in our SF office.',
      });
      const result = verifier.analyze(onsiteJob);
      expect(result.detected).toBe(false);
      expect(result.message).toBe('Not advertised as remote');
    });

    it('should not flag jobs without remote in title or location', () => {
      const normalJob = createMockJob({
        title: 'Backend Developer',
        location: 'New York, NY',
        isRemote: false,
      });
      const result = verifier.analyze(normalJob);
      expect(result.detected).toBe(false);
    });
  });

  describe('True Remote Detection', () => {
    it('should verify "100% remote" as true remote', () => {
      const trueRemoteJob = createMockJob({
        title: 'Remote Engineer',
        isRemote: true,
        description: '100% remote position. Work from anywhere.',
        location: 'Remote',
      });
      const result = verifier.analyze(trueRemoteJob);
      expect(result.detected).toBe(false);
      expect(result.message).toContain('Verified true remote');
    });

    it('should verify "fully remote" as true remote', () => {
      const fullyRemoteJob = createMockJob({
        title: 'Remote Developer',
        isRemote: true,
        description: 'Fully remote position with no office visits required.',
        location: 'Remote - US',
      });
      const result = verifier.analyze(fullyRemoteJob);
      expect(result.detected).toBe(false);
    });

    it('should verify "work from anywhere" as true remote', () => {
      const anywhereJob = createMockJob({
        title: 'Remote SWE',
        isRemote: true,
        description: 'Work from anywhere in the world. We are a distributed team.',
        location: 'Remote - Worldwide',
      });
      const result = verifier.analyze(anywhereJob);
      expect(result.detected).toBe(false);
    });

    it('should verify "remote-first" companies', () => {
      const remoteFirstJob = createMockJob({
        title: 'Software Engineer',
        isRemote: true,
        description: 'We are a remote-first company with team members in 20 countries.',
        location: 'Remote',
      });
      const result = verifier.analyze(remoteFirstJob);
      expect(result.detected).toBe(false);
    });
  });

  describe('Hybrid Detection', () => {
    it('should flag "hybrid" in description', () => {
      const hybridJob = createMockJob({
        title: 'Remote Software Engineer',
        isRemote: true,
        description: 'Hybrid position with 2 days in office per week.',
        location: 'Remote',
      });
      const result = verifier.analyze(hybridJob);
      expect(result.detected).toBe(true);
      expect(result.evidence.some(e => e.toLowerCase().includes('hybrid') || e.toLowerCase().includes('office'))).toBe(true);
    });

    it('should flag "X days in office" requirements', () => {
      const daysInOfficeJob = createMockJob({
        title: 'Remote Engineer',
        isRemote: true,
        description: 'Remote with 3 days in office required.',
        location: 'Remote - San Francisco',
      });
      const result = verifier.analyze(daysInOfficeJob);
      expect(result.detected).toBe(true);
    });

    it('should flag "office attendance required"', () => {
      const officeRequiredJob = createMockJob({
        title: 'Remote Developer',
        isRemote: true,
        description: 'Remote position. Office attendance required for team meetings.',
        location: 'Remote',
      });
      const result = verifier.analyze(officeRequiredJob);
      expect(result.detected).toBe(true);
    });

    it('should flag "primarily remote" as not fully remote', () => {
      const primarilyRemoteJob = createMockJob({
        title: 'Remote SWE',
        isRemote: true,
        description: 'Primarily remote with occasional office visits.',
        location: 'Remote',
      });
      const result = verifier.analyze(primarilyRemoteJob);
      // Should flag some concern
      expect(result.evidence.length).toBeGreaterThan(0);
    });
  });

  describe('On-site Contradiction Detection', () => {
    it('should flag "on-site required" contradiction', () => {
      const contradictionJob = createMockJob({
        title: 'Remote Software Engineer',
        isRemote: true,
        description: 'On-site required for the first 3 months.',
        location: 'Remote',
      });
      const result = verifier.analyze(contradictionJob);
      expect(result.detected).toBe(true);
    });

    it('should flag "in-office required"', () => {
      const inOfficeJob = createMockJob({
        title: 'Remote Developer',
        isRemote: true,
        description: 'In-office required 2 days per week minimum.',
        location: 'Remote',
      });
      const result = verifier.analyze(inOfficeJob);
      expect(result.detected).toBe(true);
    });

    it('should flag "must be located in" requirement', () => {
      const locationRequiredJob = createMockJob({
        title: 'Remote Engineer',
        isRemote: true,
        description: 'Remote position. Must be located in the Austin, TX area.',
        location: 'Remote',
      });
      const result = verifier.analyze(locationRequiredJob);
      expect(result.detected).toBe(true);
    });

    it('should flag relocation requirements', () => {
      const relocationJob = createMockJob({
        title: 'Remote SWE',
        isRemote: true,
        description: 'Remote with relocation required to Seattle.',
        location: 'Remote',
      });
      const result = verifier.analyze(relocationJob);
      expect(result.detected).toBe(true);
    });
  });

  describe('Location Contradiction Detection', () => {
    it('should flag location with specific city + remote', () => {
      const cityRemoteJob = createMockJob({
        title: 'Remote Developer',
        isRemote: true,
        description: 'Great remote opportunity.',
        location: 'Remote / San Francisco, CA',
      });
      const result = verifier.analyze(cityRemoteJob);
      expect(result.evidence.some(e => e.toLowerCase().includes('location'))).toBe(true);
    });

    it('should flag "within X miles" requirements', () => {
      const milesJob = createMockJob({
        title: 'Remote Engineer',
        isRemote: true,
        description: 'Remote position. Must live within 50 miles of headquarters.',
        location: 'Remote',
      });
      const result = verifier.analyze(milesJob);
      expect(result.detected).toBe(true);
    });

    it('should flag "local candidates only"', () => {
      const localOnlyJob = createMockJob({
        title: 'Remote Software Engineer',
        isRemote: true,
        description: 'Remote work available. Local candidates only.',
        location: 'Remote',
      });
      const result = verifier.analyze(localOnlyJob);
      expect(result.detected).toBe(true);
    });
  });

  describe('Fake Remote Job Detection', () => {
    it('should correctly identify fake remote jobs', () => {
      const fakeRemote = createMockFakeRemoteJob();
      const result = verifier.analyze(fakeRemote);
      expect(result.detected).toBe(true);
      expect(result.evidence.length).toBeGreaterThan(0);
    });

    it('should correctly identify true remote jobs', () => {
      const trueRemote = createMockTrueRemoteJob();
      const result = verifier.analyze(trueRemote);
      expect(result.detected).toBe(false);
    });
  });

  describe('Remote Type Assignment', () => {
    it('should set remoteType to true_remote for verified remote', () => {
      const job = createMockJob({
        title: 'Remote Engineer',
        isRemote: true,
        description: '100% remote. Work from anywhere.',
        location: 'Remote',
      });
      verifier.analyze(job);
      expect(job.remoteType).toBe('true_remote');
    });

    it('should set remoteType to hybrid for hybrid detection', () => {
      const job = createMockJob({
        title: 'Remote Engineer',
        isRemote: true,
        description: 'Hybrid with 3 days in office.',
        location: 'Remote',
      });
      verifier.analyze(job);
      expect(job.remoteType).toBe('hybrid');
    });
  });

  describe('Result Structure', () => {
    it('should return proper detection result structure', () => {
      const job = createMockJob({ isRemote: true, location: 'Remote' });
      const result = verifier.analyze(job);

      expect(result).toHaveProperty('detected');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('category');
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('evidence');
      expect(result.category).toBe('remote');
      expect(typeof result.detected).toBe('boolean');
      expect(typeof result.confidence).toBe('number');
      expect(Array.isArray(result.evidence)).toBe(true);
    });

    it('should provide evidence for detected issues', () => {
      const fakeRemote = createMockFakeRemoteJob();
      const result = verifier.analyze(fakeRemote);
      expect(result.evidence.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty description', () => {
      const job = createMockJob({
        isRemote: true,
        location: 'Remote',
        description: '',
      });
      expect(() => verifier.analyze(job)).not.toThrow();
    });

    it('should handle remote in title only', () => {
      const job = createMockJob({
        title: 'Remote Software Engineer',
        isRemote: false,
        location: 'San Francisco, CA',
        description: 'Great engineering role.',
      });
      const result = verifier.analyze(job);
      // Should still analyze since remote is in title
      expect(result).toBeDefined();
    });

    it('should handle remote in location only', () => {
      const job = createMockJob({
        title: 'Software Engineer',
        isRemote: false,
        location: 'Remote - US',
        description: 'Build amazing products.',
      });
      const result = verifier.analyze(job);
      expect(result).toBeDefined();
    });

    it('should handle case insensitivity', () => {
      const job = createMockJob({
        title: 'REMOTE SOFTWARE ENGINEER',
        isRemote: true,
        description: 'HYBRID POSITION WITH 3 DAYS IN OFFICE.',
        location: 'REMOTE',
      });
      const result = verifier.analyze(job);
      expect(result.detected).toBe(true);
    });

    it('should limit evidence to 5 items', () => {
      const manyIssuesJob = createMockJob({
        title: 'Remote Engineer',
        isRemote: true,
        description: 'Hybrid 3 days in office must be located in Austin local candidates only within 50 miles on-site required relocation expected.',
        location: 'Remote / Austin, TX',
      });
      const result = verifier.analyze(manyIssuesJob);
      expect(result.evidence.length).toBeLessThanOrEqual(5);
    });
  });

  describe('Timezone Preferences', () => {
    it('should NOT flag reasonable timezone preferences', () => {
      const tzJob = createMockJob({
        title: 'Remote Engineer',
        isRemote: true,
        description: 'Remote position. Prefer candidates in US timezones for team overlap.',
        location: 'Remote - US',
      });
      const result = verifier.analyze(tzJob);
      // Timezone preference alone shouldn't flag as fake remote
      expect(result.detected).toBe(false);
    });
  });
});
