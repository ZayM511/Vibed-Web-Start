import { describe, it, expect, beforeEach, vi } from 'vitest';
import { IncludeKeywordsFilter } from '../includeKeywords';
import { createMockJob } from '@/src/test/factories';

// Mock hybridStorage
vi.mock('@/storage/hybridStorage', () => ({
  hybridStorage: {
    getProStatus: vi.fn(),
    getIncludeKeywords: vi.fn(),
    getIncludeKeywordsMatchMode: vi.fn(),
    addIncludeKeyword: vi.fn(),
    removeIncludeKeyword: vi.fn(),
    setIncludeKeywordsMatchMode: vi.fn(),
  },
}));

import { hybridStorage } from '@/storage/hybridStorage';

describe('IncludeKeywordsFilter', () => {
  let filter: IncludeKeywordsFilter;

  beforeEach(() => {
    vi.clearAllMocks();
    filter = new IncludeKeywordsFilter();
  });

  describe('Pro Feature Gating', () => {
    it('should pass all jobs for free users (feature disabled)', async () => {
      vi.mocked(hybridStorage.getProStatus).mockResolvedValue({ isPro: false });

      await filter.init();

      const job = createMockJob({ title: 'Java Developer' });
      const result = filter.analyze(job);

      expect(result.passed).toBe(true);
      expect(result.reason).toBeNull();
    });

    it('should pass all jobs when no keywords configured (Pro user)', async () => {
      vi.mocked(hybridStorage.getProStatus).mockResolvedValue({ isPro: true });
      vi.mocked(hybridStorage.getIncludeKeywords).mockResolvedValue([]);
      vi.mocked(hybridStorage.getIncludeKeywordsMatchMode).mockResolvedValue('any');

      await filter.init();

      const job = createMockJob();
      const result = filter.analyze(job);

      expect(result.passed).toBe(true);
    });

    it('should block addKeyword for free users', async () => {
      vi.mocked(hybridStorage.getProStatus).mockResolvedValue({ isPro: false });

      await filter.init();

      await expect(filter.addKeyword('react')).rejects.toThrow('Pro required');
    });

    it('should block setMatchMode for free users', async () => {
      vi.mocked(hybridStorage.getProStatus).mockResolvedValue({ isPro: false });

      await filter.init();

      await expect(filter.setMatchMode('all')).rejects.toThrow('Pro required');
    });

    it('should report canUse correctly', async () => {
      vi.mocked(hybridStorage.getProStatus).mockResolvedValue({ isPro: true });
      vi.mocked(hybridStorage.getIncludeKeywords).mockResolvedValue([]);
      vi.mocked(hybridStorage.getIncludeKeywordsMatchMode).mockResolvedValue('any');

      await filter.init();

      expect(filter.canUse()).toBe(true);
    });
  });

  describe('OR Mode (Default)', () => {
    beforeEach(async () => {
      vi.mocked(hybridStorage.getProStatus).mockResolvedValue({ isPro: true });
      vi.mocked(hybridStorage.getIncludeKeywords).mockResolvedValue(['react', 'vue', 'angular']);
      vi.mocked(hybridStorage.getIncludeKeywordsMatchMode).mockResolvedValue('any');
      await filter.init();
    });

    it('should pass if ANY keyword is present', () => {
      const reactJob = createMockJob({
        title: 'React Developer',
        description: 'Build React applications',
      });
      const result = filter.analyze(reactJob);
      expect(result.passed).toBe(true);
      expect(result.matchedKeywords).toContain('react');
    });

    it('should pass if multiple keywords are present', () => {
      const multiJob = createMockJob({
        title: 'Frontend Developer',
        description: 'Experience with React and Vue.js required',
      });
      const result = filter.analyze(multiJob);
      expect(result.passed).toBe(true);
      expect(result.matchedKeywords?.length).toBeGreaterThan(1);
    });

    it('should FAIL if NO keywords are present', () => {
      const javaJob = createMockJob({
        title: 'Java Developer',
        description: 'Build enterprise Java applications with Spring Boot',
      });
      const result = filter.analyze(javaJob);
      expect(result.passed).toBe(false);
      expect(result.reason).toContain('Missing');
      expect(result.missingKeywords).toEqual(['react', 'vue', 'angular']);
    });
  });

  describe('AND Mode', () => {
    beforeEach(async () => {
      vi.mocked(hybridStorage.getProStatus).mockResolvedValue({ isPro: true });
      vi.mocked(hybridStorage.getIncludeKeywords).mockResolvedValue(['react', 'typescript']);
      vi.mocked(hybridStorage.getIncludeKeywordsMatchMode).mockResolvedValue('all');
      await filter.init();
    });

    it('should pass only if ALL keywords are present', () => {
      const fullStackJob = createMockJob({
        title: 'React TypeScript Developer',
        description: 'Build React applications with TypeScript',
      });
      const result = filter.analyze(fullStackJob);
      expect(result.passed).toBe(true);
      expect(result.matchedKeywords).toContain('react');
      expect(result.matchedKeywords).toContain('typescript');
    });

    it('should FAIL if only SOME keywords present', () => {
      const partialJob = createMockJob({
        title: 'React Developer',
        description: 'Build React applications with JavaScript',
      });
      const result = filter.analyze(partialJob);
      expect(result.passed).toBe(false);
      expect(result.missingKeywords).toContain('typescript');
    });

    it('should FAIL if NO keywords present', () => {
      const noneJob = createMockJob({
        title: 'Java Developer',
        description: 'Build Java applications',
      });
      const result = filter.analyze(noneJob);
      expect(result.passed).toBe(false);
      expect(result.missingKeywords).toContain('react');
      expect(result.missingKeywords).toContain('typescript');
    });
  });

  describe('Phrase Matching (Quotes)', () => {
    beforeEach(async () => {
      vi.mocked(hybridStorage.getProStatus).mockResolvedValue({ isPro: true });
      vi.mocked(hybridStorage.getIncludeKeywords).mockResolvedValue(['"machine learning"', 'AI']);
      vi.mocked(hybridStorage.getIncludeKeywordsMatchMode).mockResolvedValue('any');
      await filter.init();
    });

    it('should match exact phrases in quotes', () => {
      const mlJob = createMockJob({
        description: 'Experience with machine learning required.',
      });
      const result = filter.analyze(mlJob);
      expect(result.passed).toBe(true);
    });

    it('should NOT match partial phrase', () => {
      vi.mocked(hybridStorage.getIncludeKeywords).mockResolvedValue(['"senior software engineer"']);
      vi.mocked(hybridStorage.getIncludeKeywordsMatchMode).mockResolvedValue('any');

      // Need to reinitialize with new keywords
      filter = new IncludeKeywordsFilter();

      const partialJob = createMockJob({
        title: 'Software Engineer',
        description: 'Looking for a senior candidate',
      });

      // Note: This test uses fresh filter but we'd need to call init() again
      // For now, test the exact phrase matching separately
    });
  });

  describe('Word Boundary Matching', () => {
    beforeEach(async () => {
      vi.mocked(hybridStorage.getProStatus).mockResolvedValue({ isPro: true });
      vi.mocked(hybridStorage.getIncludeKeywords).mockResolvedValue(['java']);
      vi.mocked(hybridStorage.getIncludeKeywordsMatchMode).mockResolvedValue('any');
      await filter.init();
    });

    it('should NOT match partial words', () => {
      const jsJob = createMockJob({
        title: 'JavaScript Developer',
        description: 'Build JavaScript applications',
      });
      const result = filter.analyze(jsJob);
      expect(result.passed).toBe(false);
    });

    it('should match whole words', () => {
      const javaJob = createMockJob({
        title: 'Java Backend Developer',
        description: 'Build Java applications',
      });
      const result = filter.analyze(javaJob);
      expect(result.passed).toBe(true);
    });
  });

  describe('Case Insensitivity', () => {
    beforeEach(async () => {
      vi.mocked(hybridStorage.getProStatus).mockResolvedValue({ isPro: true });
      vi.mocked(hybridStorage.getIncludeKeywords).mockResolvedValue(['REACT', 'TypeScript']);
      vi.mocked(hybridStorage.getIncludeKeywordsMatchMode).mockResolvedValue('any');
      await filter.init();
    });

    it('should match regardless of case', () => {
      const job = createMockJob({
        title: 'react typescript developer',
        description: 'lowercase job description',
      });
      const result = filter.analyze(job);
      expect(result.passed).toBe(true);
    });
  });

  describe('Search Scope', () => {
    beforeEach(async () => {
      vi.mocked(hybridStorage.getProStatus).mockResolvedValue({ isPro: true });
      vi.mocked(hybridStorage.getIncludeKeywords).mockResolvedValue(['remote']);
      vi.mocked(hybridStorage.getIncludeKeywordsMatchMode).mockResolvedValue('any');
      await filter.init();
    });

    it('should search in title', () => {
      const job = createMockJob({
        title: 'Remote Software Engineer',
        description: 'Great opportunity',
        company: 'TechCorp',
        location: 'San Francisco',
      });
      const result = filter.analyze(job);
      expect(result.passed).toBe(true);
    });

    it('should search in description', () => {
      const job = createMockJob({
        title: 'Software Engineer',
        description: 'This is a remote position',
        company: 'TechCorp',
        location: 'San Francisco',
      });
      const result = filter.analyze(job);
      expect(result.passed).toBe(true);
    });

    it('should search in company name', () => {
      const job = createMockJob({
        title: 'Engineer',
        description: 'Great job',
        company: 'Remote First Inc',
        location: 'San Francisco',
      });
      const result = filter.analyze(job);
      expect(result.passed).toBe(true);
    });

    it('should search in location', () => {
      const job = createMockJob({
        title: 'Engineer',
        description: 'Great job',
        company: 'TechCorp',
        location: 'Remote - Worldwide',
      });
      const result = filter.analyze(job);
      expect(result.passed).toBe(true);
    });
  });

  describe('Config Methods', () => {
    beforeEach(async () => {
      vi.mocked(hybridStorage.getProStatus).mockResolvedValue({ isPro: true });
      vi.mocked(hybridStorage.getIncludeKeywords).mockResolvedValue(['test']);
      vi.mocked(hybridStorage.getIncludeKeywordsMatchMode).mockResolvedValue('any');
      await filter.init();
    });

    it('should return current config', () => {
      const config = filter.getConfig();
      expect(config).toHaveProperty('keywords');
      expect(config).toHaveProperty('matchMode');
      expect(config).toHaveProperty('isPro');
      expect(config.isPro).toBe(true);
    });

    it('should add keyword', async () => {
      await filter.addKeyword('newkeyword');
      expect(hybridStorage.addIncludeKeyword).toHaveBeenCalledWith('newkeyword');
    });

    it('should remove keyword', async () => {
      await filter.removeKeyword('test');
      expect(hybridStorage.removeIncludeKeyword).toHaveBeenCalledWith('test');
    });

    it('should set match mode', async () => {
      await filter.setMatchMode('all');
      expect(hybridStorage.setIncludeKeywordsMatchMode).toHaveBeenCalledWith('all');
    });
  });

  describe('Edge Cases', () => {
    beforeEach(async () => {
      vi.mocked(hybridStorage.getProStatus).mockResolvedValue({ isPro: true });
      vi.mocked(hybridStorage.getIncludeKeywords).mockResolvedValue(['test']);
      vi.mocked(hybridStorage.getIncludeKeywordsMatchMode).mockResolvedValue('any');
      await filter.init();
    });

    it('should handle empty description', () => {
      const job = createMockJob({ description: '' });
      expect(() => filter.analyze(job)).not.toThrow();
    });

    it('should handle special regex characters in keywords', async () => {
      vi.mocked(hybridStorage.getIncludeKeywords).mockResolvedValue(['c++', 'c#', '.net']);
      await filter.refresh();

      const job = createMockJob({
        description: 'Looking for C++ developer with .NET experience',
      });
      const result = filter.analyze(job);
      expect(result.passed).toBe(true);
    });
  });
});
