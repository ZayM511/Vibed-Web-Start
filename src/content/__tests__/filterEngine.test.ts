import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FilterEngine } from '../filterEngine';
import { createMockJob, createMockGhostJob, createMockStaffingJob, createMockFakeRemoteJob, createMockFilterSettings } from '@/src/test/factories';
import type { PlatformAdapter, JobData, DetectionResult } from '@/types';

// Mock all dependencies
vi.mock('@/storage/hybridStorage', () => ({
  hybridStorage: {
    getSettings: vi.fn(),
    getCommunityBlocklist: vi.fn().mockResolvedValue([]),
    getProStatus: vi.fn().mockResolvedValue({ isPro: false }),
    getIncludeKeywords: vi.fn().mockResolvedValue([]),
    getExcludeKeywords: vi.fn().mockResolvedValue([]),
    getExcludeCompanies: vi.fn().mockResolvedValue([]),
    getIncludeKeywordsMatchMode: vi.fn().mockResolvedValue('any'),
  },
}));

vi.mock('../detectors/ghostJob', () => ({
  ghostJobDetector: {
    analyze: vi.fn(),
  },
}));

vi.mock('../detectors/staffingFirm', () => ({
  staffingFirmDetector: {
    init: vi.fn().mockResolvedValue(undefined),
    refresh: vi.fn().mockResolvedValue(undefined),
    analyze: vi.fn(),
  },
}));

vi.mock('../detectors/remoteVerifier', () => ({
  remoteVerifier: {
    analyze: vi.fn(),
  },
}));

vi.mock('../filters/includeKeywords', () => ({
  includeKeywordsFilter: {
    init: vi.fn().mockResolvedValue(undefined),
    refresh: vi.fn().mockResolvedValue(undefined),
    analyze: vi.fn(),
  },
}));

vi.mock('../filters/excludeKeywords', () => ({
  excludeKeywordsFilter: {
    init: vi.fn().mockResolvedValue(undefined),
    refresh: vi.fn().mockResolvedValue(undefined),
    analyze: vi.fn(),
  },
}));

vi.mock('../filters/excludeCompanies', () => ({
  excludeCompaniesFilter: {
    init: vi.fn().mockResolvedValue(undefined),
    refresh: vi.fn().mockResolvedValue(undefined),
    analyze: vi.fn(),
  },
}));

import { hybridStorage } from '@/storage/hybridStorage';
import { ghostJobDetector } from '../detectors/ghostJob';
import { staffingFirmDetector } from '../detectors/staffingFirm';
import { remoteVerifier } from '../detectors/remoteVerifier';
import { includeKeywordsFilter } from '../filters/includeKeywords';
import { excludeKeywordsFilter } from '../filters/excludeKeywords';
import { excludeCompaniesFilter } from '../filters/excludeCompanies';

// Create mock adapter
function createMockAdapter(): PlatformAdapter {
  const cards: Element[] = [];
  const hiddenJobs = new Set<string>();

  return {
    getJobCards: vi.fn(() => cards),
    extractJobData: vi.fn((card: Element) => {
      const id = card.getAttribute('data-id');
      return id ? createMockJob({ id }) : null;
    }),
    hideJob: vi.fn((job: JobData) => {
      if (job.id) hiddenJobs.add(job.id);
    }),
    applyVisualIndicator: vi.fn(),
    observeNewJobs: vi.fn(),
    injectScoreUI: vi.fn(),
  };
}

describe('FilterEngine', () => {
  let engine: FilterEngine;
  let mockAdapter: PlatformAdapter;

  beforeEach(async () => {
    vi.clearAllMocks();

    mockAdapter = createMockAdapter();

    // Default mock returns
    vi.mocked(hybridStorage.getSettings).mockResolvedValue(createMockFilterSettings());
    vi.mocked(includeKeywordsFilter.analyze).mockReturnValue({ passed: true, reason: null });
    vi.mocked(excludeKeywordsFilter.analyze).mockReturnValue({ passed: true, reason: null });
    vi.mocked(excludeCompaniesFilter.analyze).mockReturnValue({ passed: true, reason: null });
    vi.mocked(ghostJobDetector.analyze).mockReturnValue({
      detected: false,
      confidence: 0.1,
      category: 'ghost_job',
      message: 'Appears legitimate',
      evidence: [],
    });
    vi.mocked(staffingFirmDetector.analyze).mockReturnValue({
      detected: false,
      confidence: 0.1,
      category: 'staffing',
      message: 'Not a staffing agency',
      evidence: [],
    });
    vi.mocked(remoteVerifier.analyze).mockReturnValue({
      detected: false,
      confidence: 0.9,
      category: 'remote',
      message: 'Not advertised as remote',
      evidence: [],
    });

    engine = new FilterEngine(mockAdapter);
    await engine.init();
  });

  describe('Initialization', () => {
    it('should initialize all filters and detectors', async () => {
      expect(staffingFirmDetector.init).toHaveBeenCalled();
      expect(includeKeywordsFilter.init).toHaveBeenCalled();
      expect(excludeKeywordsFilter.init).toHaveBeenCalled();
      expect(excludeCompaniesFilter.init).toHaveBeenCalled();
    });

    it('should load settings from storage', async () => {
      expect(hybridStorage.getSettings).toHaveBeenCalled();
    });
  });

  describe('Filter Processing Order', () => {
    it('should process include keywords first', async () => {
      const callOrder: string[] = [];

      vi.mocked(includeKeywordsFilter.analyze).mockImplementation(() => {
        callOrder.push('include');
        return { passed: false, reason: 'Missing keywords' };
      });

      vi.mocked(excludeKeywordsFilter.analyze).mockImplementation(() => {
        callOrder.push('exclude');
        return { passed: true, reason: null };
      });

      const card = document.createElement('div');
      card.setAttribute('data-id', 'test-job');
      vi.mocked(mockAdapter.getJobCards).mockReturnValue([card]);

      await engine.processJobs();

      // Include should be called before exclude
      expect(callOrder[0]).toBe('include');
    });

    it('should short-circuit if include filter fails', async () => {
      vi.mocked(includeKeywordsFilter.analyze).mockReturnValue({
        passed: false,
        reason: 'Missing keywords',
        missingKeywords: ['react'],
      });

      const card = document.createElement('div');
      card.setAttribute('data-id', 'test-job');
      vi.mocked(mockAdapter.getJobCards).mockReturnValue([card]);

      await engine.processJobs();

      expect(mockAdapter.hideJob).toHaveBeenCalled();
    });

    it('should short-circuit if exclude keywords filter fails', async () => {
      vi.mocked(excludeKeywordsFilter.analyze).mockReturnValue({
        passed: false,
        reason: 'Contains: senior',
        matchedKeywords: ['senior'],
      });

      const card = document.createElement('div');
      card.setAttribute('data-id', 'test-job');
      vi.mocked(mockAdapter.getJobCards).mockReturnValue([card]);

      await engine.processJobs();

      expect(mockAdapter.hideJob).toHaveBeenCalled();
    });

    it('should short-circuit if exclude companies filter fails', async () => {
      vi.mocked(excludeCompaniesFilter.analyze).mockReturnValue({
        passed: false,
        reason: 'Blocked company',
        blockedCompany: 'BlockedCorp',
      });

      const card = document.createElement('div');
      card.setAttribute('data-id', 'test-job');
      vi.mocked(mockAdapter.getJobCards).mockReturnValue([card]);

      await engine.processJobs();

      expect(mockAdapter.hideJob).toHaveBeenCalled();
    });
  });

  describe('Ghost Job Detection', () => {
    it('should hide ghost jobs when enabled and confidence > 0.7', async () => {
      vi.mocked(hybridStorage.getSettings).mockResolvedValue(
        createMockFilterSettings({ hideGhostJobs: true })
      );
      await engine.init();

      vi.mocked(ghostJobDetector.analyze).mockReturnValue({
        detected: true,
        confidence: 0.85,
        category: 'ghost_job',
        message: 'Likely ghost job',
        evidence: ['Old posting'],
      });

      const card = document.createElement('div');
      card.setAttribute('data-id', 'ghost-job');
      vi.mocked(mockAdapter.getJobCards).mockReturnValue([card]);

      await engine.processJobs();

      expect(mockAdapter.hideJob).toHaveBeenCalled();
    });

    it('should NOT hide ghost jobs when disabled', async () => {
      vi.mocked(hybridStorage.getSettings).mockResolvedValue(
        createMockFilterSettings({ hideGhostJobs: false })
      );
      await engine.init();

      vi.mocked(ghostJobDetector.analyze).mockReturnValue({
        detected: true,
        confidence: 0.9,
        category: 'ghost_job',
        message: 'Likely ghost job',
        evidence: ['Old posting'],
      });

      const card = document.createElement('div');
      card.setAttribute('data-id', 'ghost-job');
      vi.mocked(mockAdapter.getJobCards).mockReturnValue([card]);

      await engine.processJobs();

      expect(mockAdapter.hideJob).not.toHaveBeenCalled();
    });

    it('should NOT hide ghost jobs with low confidence', async () => {
      vi.mocked(hybridStorage.getSettings).mockResolvedValue(
        createMockFilterSettings({ hideGhostJobs: true })
      );
      await engine.init();

      vi.mocked(ghostJobDetector.analyze).mockReturnValue({
        detected: true,
        confidence: 0.5, // Below 0.7 threshold
        category: 'ghost_job',
        message: 'Medium risk',
        evidence: [],
      });

      const card = document.createElement('div');
      card.setAttribute('data-id', 'low-risk-job');
      vi.mocked(mockAdapter.getJobCards).mockReturnValue([card]);

      await engine.processJobs();

      expect(mockAdapter.hideJob).not.toHaveBeenCalled();
    });
  });

  describe('Staffing Agency Detection', () => {
    it('should hide staffing jobs when enabled and confidence > 0.7', async () => {
      vi.mocked(hybridStorage.getSettings).mockResolvedValue(
        createMockFilterSettings({ hideStaffingFirms: true })
      );
      await engine.init();

      vi.mocked(staffingFirmDetector.analyze).mockReturnValue({
        detected: true,
        confidence: 0.9,
        category: 'staffing',
        message: 'Known staffing agency',
        evidence: ['Robert Half'],
      });

      const card = document.createElement('div');
      card.setAttribute('data-id', 'staffing-job');
      vi.mocked(mockAdapter.getJobCards).mockReturnValue([card]);

      await engine.processJobs();

      expect(mockAdapter.hideJob).toHaveBeenCalled();
    });

    it('should NOT hide staffing jobs when disabled', async () => {
      vi.mocked(hybridStorage.getSettings).mockResolvedValue(
        createMockFilterSettings({ hideStaffingFirms: false })
      );
      await engine.init();

      vi.mocked(staffingFirmDetector.analyze).mockReturnValue({
        detected: true,
        confidence: 0.95,
        category: 'staffing',
        message: 'Known staffing agency',
        evidence: ['Randstad'],
      });

      const card = document.createElement('div');
      card.setAttribute('data-id', 'staffing-job');
      vi.mocked(mockAdapter.getJobCards).mockReturnValue([card]);

      await engine.processJobs();

      expect(mockAdapter.hideJob).not.toHaveBeenCalled();
    });
  });

  describe('Remote Verification', () => {
    it('should apply visual indicator for misleading remote jobs', async () => {
      vi.mocked(hybridStorage.getSettings).mockResolvedValue(
        createMockFilterSettings({ verifyTrueRemote: true })
      );
      await engine.init();

      vi.mocked(remoteVerifier.analyze).mockReturnValue({
        detected: true,
        confidence: 0.85,
        category: 'remote',
        message: 'Misleading: Hybrid role',
        evidence: ['Hybrid mentioned'],
      });

      const card = document.createElement('div');
      card.setAttribute('data-id', 'fake-remote-job');
      vi.mocked(mockAdapter.getJobCards).mockReturnValue([card]);

      await engine.processJobs();

      // Remote verification should add indicator but not hide by default
      expect(mockAdapter.applyVisualIndicator).toHaveBeenCalled();
    });
  });

  describe('Visual Indicators', () => {
    it('should apply indicators for detected issues when not hiding', async () => {
      vi.mocked(hybridStorage.getSettings).mockResolvedValue(
        createMockFilterSettings({ hideGhostJobs: true })
      );
      await engine.init();

      // Low confidence - won't hide but should show indicator
      vi.mocked(ghostJobDetector.analyze).mockReturnValue({
        detected: true,
        confidence: 0.5,
        category: 'ghost_job',
        message: 'Medium risk',
        evidence: ['Some concerns'],
      });

      const card = document.createElement('div');
      card.setAttribute('data-id', 'medium-risk-job');
      vi.mocked(mockAdapter.getJobCards).mockReturnValue([card]);

      await engine.processJobs();

      expect(mockAdapter.applyVisualIndicator).toHaveBeenCalled();
    });
  });

  describe('Statistics Tracking', () => {
    it('should track total scanned jobs', async () => {
      const cards = [
        document.createElement('div'),
        document.createElement('div'),
        document.createElement('div'),
      ];
      cards.forEach((card, i) => card.setAttribute('data-id', `job-${i}`));
      vi.mocked(mockAdapter.getJobCards).mockReturnValue(cards);

      await engine.processJobs();

      const stats = engine.getStats();
      expect(stats.totalScanned).toBe(3);
    });

    it('should track filtered jobs', async () => {
      vi.mocked(includeKeywordsFilter.analyze).mockReturnValue({
        passed: false,
        reason: 'Missing keywords',
      });

      const card = document.createElement('div');
      card.setAttribute('data-id', 'filtered-job');
      vi.mocked(mockAdapter.getJobCards).mockReturnValue([card]);

      await engine.processJobs();

      const stats = engine.getStats();
      expect(stats.totalFiltered).toBe(1);
      expect(stats.includeKeywordMisses).toBe(1);
    });

    it('should track ghost jobs filtered', async () => {
      vi.mocked(hybridStorage.getSettings).mockResolvedValue(
        createMockFilterSettings({ hideGhostJobs: true })
      );
      await engine.init();

      vi.mocked(ghostJobDetector.analyze).mockReturnValue({
        detected: true,
        confidence: 0.9,
        category: 'ghost_job',
        message: 'Likely ghost',
        evidence: [],
      });

      const card = document.createElement('div');
      card.setAttribute('data-id', 'ghost');
      vi.mocked(mockAdapter.getJobCards).mockReturnValue([card]);

      await engine.processJobs();

      const stats = engine.getStats();
      expect(stats.ghostJobsFiltered).toBe(1);
    });

    it('should track staffing jobs filtered', async () => {
      vi.mocked(hybridStorage.getSettings).mockResolvedValue(
        createMockFilterSettings({ hideStaffingFirms: true })
      );
      await engine.init();

      vi.mocked(staffingFirmDetector.analyze).mockReturnValue({
        detected: true,
        confidence: 0.95,
        category: 'staffing',
        message: 'Staffing agency',
        evidence: [],
      });

      const card = document.createElement('div');
      card.setAttribute('data-id', 'staffing');
      vi.mocked(mockAdapter.getJobCards).mockReturnValue([card]);

      await engine.processJobs();

      const stats = engine.getStats();
      expect(stats.staffingFiltered).toBe(1);
    });
  });

  describe('Processed Card Tracking', () => {
    it('should skip already processed cards', async () => {
      const card = document.createElement('div');
      card.setAttribute('data-id', 'test-job');
      card.setAttribute('data-jobfiltr-processed', 'true');
      vi.mocked(mockAdapter.getJobCards).mockReturnValue([card]);

      await engine.processJobs();

      expect(includeKeywordsFilter.analyze).not.toHaveBeenCalled();
    });

    it('should mark cards as processed after processing', async () => {
      const card = document.createElement('div');
      card.setAttribute('data-id', 'test-job');
      vi.mocked(mockAdapter.getJobCards).mockReturnValue([card]);

      await engine.processJobs();

      expect(card.getAttribute('data-jobfiltr-processed')).toBe('true');
    });
  });

  describe('Refresh', () => {
    it('should reload settings on refresh', async () => {
      await engine.refresh();

      expect(hybridStorage.getSettings).toHaveBeenCalledTimes(2); // init + refresh
    });

    it('should refresh all filters', async () => {
      await engine.refresh();

      expect(staffingFirmDetector.refresh).toHaveBeenCalled();
      expect(includeKeywordsFilter.refresh).toHaveBeenCalled();
      expect(excludeKeywordsFilter.refresh).toHaveBeenCalled();
      expect(excludeCompaniesFilter.refresh).toHaveBeenCalled();
    });

    it('should reset stats on refresh', async () => {
      // Process some jobs first
      const card = document.createElement('div');
      card.setAttribute('data-id', 'test-job');
      vi.mocked(mockAdapter.getJobCards).mockReturnValue([card]);
      await engine.processJobs();

      expect(engine.getStats().totalScanned).toBe(1);

      // Refresh
      await engine.refresh();

      expect(engine.getStats().totalScanned).toBe(0);
    });
  });

  describe('New Cards Processing', () => {
    it('should process new cards from observer', async () => {
      const cards = [document.createElement('div')];
      cards[0].setAttribute('data-id', 'new-job');

      await engine.processNewCards(cards);

      expect(includeKeywordsFilter.analyze).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle null job data from adapter', async () => {
      vi.mocked(mockAdapter.extractJobData).mockReturnValue(null);

      const card = document.createElement('div');
      vi.mocked(mockAdapter.getJobCards).mockReturnValue([card]);

      // Should not throw
      await expect(engine.processJobs()).resolves.not.toThrow();
    });

    it('should handle empty job list', async () => {
      vi.mocked(mockAdapter.getJobCards).mockReturnValue([]);

      await expect(engine.processJobs()).resolves.not.toThrow();

      const stats = engine.getStats();
      expect(stats.totalScanned).toBe(0);
    });
  });
});
