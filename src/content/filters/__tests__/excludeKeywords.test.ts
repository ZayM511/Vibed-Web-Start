import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ExcludeKeywordsFilter } from '../excludeKeywords';
import { createMockJob } from '@/src/test/factories';

// Mock hybridStorage
vi.mock('@/storage/hybridStorage', () => ({
  hybridStorage: {
    getProStatus: vi.fn(),
    getExcludeKeywords: vi.fn(),
    addExcludeKeyword: vi.fn(),
    removeExcludeKeyword: vi.fn(),
  },
}));

import { hybridStorage } from '@/storage/hybridStorage';

describe('ExcludeKeywordsFilter', () => {
  let filter: ExcludeKeywordsFilter;

  beforeEach(() => {
    vi.clearAllMocks();
    filter = new ExcludeKeywordsFilter();
  });

  describe('Basic Exclusion', () => {
    beforeEach(async () => {
      vi.mocked(hybridStorage.getProStatus).mockResolvedValue({ isPro: false });
      vi.mocked(hybridStorage.getExcludeKeywords).mockResolvedValue(['senior', 'lead', 'principal']);
      await filter.init();
    });

    it('should exclude jobs containing any excluded keyword', () => {
      const seniorJob = createMockJob({ title: 'Senior Developer' });
      const result = filter.analyze(seniorJob);
      expect(result.passed).toBe(false);
      expect(result.matchedKeywords).toContain('senior');
    });

    it('should exclude jobs with keyword in description', () => {
      const leadJob = createMockJob({
        title: 'Software Engineer',
        description: 'Looking for a lead engineer to manage the team.',
      });
      const result = filter.analyze(leadJob);
      expect(result.passed).toBe(false);
      expect(result.matchedKeywords).toContain('lead');
    });

    it('should exclude jobs with keyword in company name', () => {
      const principalJob = createMockJob({
        title: 'Engineer',
        company: 'Principal Financial',
      });
      const result = filter.analyze(principalJob);
      expect(result.passed).toBe(false);
    });

    it('should NOT exclude jobs without excluded keywords', () => {
      const juniorJob = createMockJob({ title: 'Junior Developer' });
      const result = filter.analyze(juniorJob);
      expect(result.passed).toBe(true);
      expect(result.reason).toBeNull();
    });
  });

  describe('Empty Keywords', () => {
    it('should pass all jobs when no keywords configured', async () => {
      vi.mocked(hybridStorage.getProStatus).mockResolvedValue({ isPro: false });
      vi.mocked(hybridStorage.getExcludeKeywords).mockResolvedValue([]);
      await filter.init();

      const job = createMockJob({ title: 'Senior Lead Principal Developer' });
      const result = filter.analyze(job);
      expect(result.passed).toBe(true);
    });
  });

  describe('Free Tier Limits', () => {
    it('should allow up to 3 keywords for Free users', async () => {
      vi.mocked(hybridStorage.getProStatus).mockResolvedValue({ isPro: false });
      vi.mocked(hybridStorage.getExcludeKeywords).mockResolvedValue(['one', 'two']);
      await filter.init();

      // Should allow adding third keyword
      await expect(filter.addKeyword('three')).resolves.not.toThrow();
    });

    it('should block adding more than 3 keywords for Free users', async () => {
      vi.mocked(hybridStorage.getProStatus).mockResolvedValue({ isPro: false });
      vi.mocked(hybridStorage.getExcludeKeywords).mockResolvedValue(['one', 'two', 'three']);
      await filter.init();

      await expect(filter.addKeyword('four')).rejects.toThrow('Free limit');
    });

    it('should return correct limit for Free users', async () => {
      vi.mocked(hybridStorage.getProStatus).mockResolvedValue({ isPro: false });
      vi.mocked(hybridStorage.getExcludeKeywords).mockResolvedValue([]);
      await filter.init();

      expect(filter.getLimit()).toBe(3);
    });
  });

  describe('Pro Tier Unlimited', () => {
    it('should allow unlimited keywords for Pro users', async () => {
      vi.mocked(hybridStorage.getProStatus).mockResolvedValue({ isPro: true });
      vi.mocked(hybridStorage.getExcludeKeywords).mockResolvedValue(
        Array.from({ length: 50 }, (_, i) => `keyword${i}`)
      );
      await filter.init();

      await expect(filter.addKeyword('keyword51')).resolves.not.toThrow();
    });

    it('should return Infinity limit for Pro users', async () => {
      vi.mocked(hybridStorage.getProStatus).mockResolvedValue({ isPro: true });
      vi.mocked(hybridStorage.getExcludeKeywords).mockResolvedValue([]);
      await filter.init();

      expect(filter.getLimit()).toBe(Infinity);
    });
  });

  describe('Phrase Matching (Quotes)', () => {
    beforeEach(async () => {
      vi.mocked(hybridStorage.getProStatus).mockResolvedValue({ isPro: true });
      vi.mocked(hybridStorage.getExcludeKeywords).mockResolvedValue(['"entry level"', '"no experience"']);
      await filter.init();
    });

    it('should exclude exact phrases in quotes', () => {
      const entryJob = createMockJob({
        title: 'Entry Level Developer',
        description: 'No experience required.',
      });
      const result = filter.analyze(entryJob);
      expect(result.passed).toBe(false);
    });

    it('should NOT match partial phrase', () => {
      const partialJob = createMockJob({
        title: 'Developer',
        description: 'Entry point for your career. Level up your skills.',
      });
      const result = filter.analyze(partialJob);
      expect(result.passed).toBe(true);
    });
  });

  describe('Word Boundary Matching', () => {
    beforeEach(async () => {
      vi.mocked(hybridStorage.getProStatus).mockResolvedValue({ isPro: true });
      vi.mocked(hybridStorage.getExcludeKeywords).mockResolvedValue(['intern']);
      await filter.init();
    });

    it('should NOT match partial words', () => {
      const internalJob = createMockJob({
        title: 'Internal Tools Developer',
        description: 'Work on internal infrastructure.',
      });
      const result = filter.analyze(internalJob);
      expect(result.passed).toBe(true);
    });

    it('should match whole words', () => {
      const internJob = createMockJob({
        title: 'Software Engineering Intern',
        description: 'Summer internship program.',
      });
      const result = filter.analyze(internJob);
      expect(result.passed).toBe(false);
    });
  });

  describe('Case Insensitivity', () => {
    beforeEach(async () => {
      vi.mocked(hybridStorage.getProStatus).mockResolvedValue({ isPro: true });
      vi.mocked(hybridStorage.getExcludeKeywords).mockResolvedValue(['UNPAID', 'Volunteer']);
      await filter.init();
    });

    it('should match regardless of case', () => {
      const unpaidJob = createMockJob({
        description: 'This is an unpaid volunteer position.',
      });
      const result = filter.analyze(unpaidJob);
      expect(result.passed).toBe(false);
    });
  });

  describe('Result Structure', () => {
    beforeEach(async () => {
      vi.mocked(hybridStorage.getProStatus).mockResolvedValue({ isPro: true });
      vi.mocked(hybridStorage.getExcludeKeywords).mockResolvedValue(['test']);
      await filter.init();
    });

    it('should return proper result structure for excluded job', () => {
      const job = createMockJob({ title: 'Test Developer' });
      const result = filter.analyze(job);

      expect(result).toHaveProperty('passed');
      expect(result).toHaveProperty('reason');
      expect(result).toHaveProperty('matchedKeywords');
      expect(result.passed).toBe(false);
      expect(result.reason).toContain('test');
      expect(result.matchedKeywords).toContain('test');
    });

    it('should return proper result structure for passed job', () => {
      const job = createMockJob({ title: 'Software Engineer' });
      const result = filter.analyze(job);

      expect(result.passed).toBe(true);
      expect(result.reason).toBeNull();
    });
  });

  describe('Config Methods', () => {
    beforeEach(async () => {
      vi.mocked(hybridStorage.getProStatus).mockResolvedValue({ isPro: true });
      vi.mocked(hybridStorage.getExcludeKeywords).mockResolvedValue(['test1', 'test2']);
      await filter.init();
    });

    it('should return current config', () => {
      const config = filter.getConfig();
      expect(config).toHaveProperty('keywords');
      expect(config).toHaveProperty('isPro');
      expect(config).toHaveProperty('limit');
      expect(config.keywords).toHaveLength(2);
    });

    it('should return keyword count', () => {
      expect(filter.getCount()).toBe(2);
    });

    it('should add keyword', async () => {
      await filter.addKeyword('newkeyword');
      expect(hybridStorage.addExcludeKeyword).toHaveBeenCalledWith('newkeyword');
    });

    it('should remove keyword', async () => {
      await filter.removeKeyword('test1');
      expect(hybridStorage.removeExcludeKeyword).toHaveBeenCalledWith('test1');
    });
  });

  describe('Edge Cases', () => {
    beforeEach(async () => {
      vi.mocked(hybridStorage.getProStatus).mockResolvedValue({ isPro: true });
      vi.mocked(hybridStorage.getExcludeKeywords).mockResolvedValue(['test']);
      await filter.init();
    });

    it('should handle empty description', () => {
      const job = createMockJob({
        title: 'Test Job',
        description: '',
        company: '',
      });
      expect(() => filter.analyze(job)).not.toThrow();
    });

    it('should handle special regex characters', async () => {
      vi.mocked(hybridStorage.getExcludeKeywords).mockResolvedValue(['c++', 'c#', '.net']);
      await filter.refresh();

      const job = createMockJob({
        title: 'C++ Developer',
        description: 'Must know C#',
      });
      const result = filter.analyze(job);
      expect(result.passed).toBe(false);
    });

    it('should stop at first match', () => {
      const multiMatchJob = createMockJob({
        title: 'Test Development Lead Manager',
      });
      const result = filter.analyze(multiMatchJob);
      // Should match 'test' and return immediately
      expect(result.passed).toBe(false);
      expect(result.matchedKeywords).toHaveLength(1);
    });
  });

  describe('Refresh Functionality', () => {
    it('should reload keywords on refresh', async () => {
      vi.mocked(hybridStorage.getProStatus).mockResolvedValue({ isPro: true });
      vi.mocked(hybridStorage.getExcludeKeywords).mockResolvedValue(['old']);
      await filter.init();

      // Change the mock to return new keywords
      vi.mocked(hybridStorage.getExcludeKeywords).mockResolvedValue(['new']);
      await filter.refresh();

      const job = createMockJob({ title: 'New Developer' });
      const result = filter.analyze(job);
      expect(result.passed).toBe(false);
    });
  });
});
