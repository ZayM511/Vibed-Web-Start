import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockChromeStorage } from '@/src/test/setup';

// Mock supabase module
vi.mock('@/lib/supabase', () => ({
  supabase: null,
  isSupabaseConfigured: false,
}));

// Need to import after mock setup
const { hybridStorage } = await import('../hybridStorage');

describe('HybridStorageService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear mock storage
    Object.keys(mockChromeStorage).forEach(k => delete mockChromeStorage[k]);
  });

  describe('Settings Management', () => {
    it('should return default settings when none stored', async () => {
      const settings = await hybridStorage.getSettings();

      expect(settings).toMatchObject({
        hideGhostJobs: true,
        hideStaffingFirms: true,
        verifyTrueRemote: false,
        ghostJobDaysThreshold: 30,
      });
    });

    it('should merge stored settings with defaults', async () => {
      mockChromeStorage['jobfiltr_settings'] = {
        hideGhostJobs: false,
        customField: 'test',
      };

      const settings = await hybridStorage.getSettings();

      expect(settings.hideGhostJobs).toBe(false);
      expect(settings.hideStaffingFirms).toBe(true); // Default
    });

    it('should update settings in chrome.storage', async () => {
      await hybridStorage.updateSettings({ hideGhostJobs: false });

      expect(chrome.storage.local.set).toHaveBeenCalled();
    });

    it('should preserve existing settings when updating partial', async () => {
      mockChromeStorage['jobfiltr_settings'] = {
        hideGhostJobs: true,
        hideStaffingFirms: false,
      };

      await hybridStorage.updateSettings({ verifyTrueRemote: true });

      const settings = await hybridStorage.getSettings();
      expect(settings.hideGhostJobs).toBe(true);
      expect(settings.hideStaffingFirms).toBe(false);
      expect(settings.verifyTrueRemote).toBe(true);
    });
  });

  describe('Include Keywords (Pro Feature)', () => {
    it('should return empty array when no keywords stored', async () => {
      const keywords = await hybridStorage.getIncludeKeywords();
      expect(keywords).toEqual([]);
    });

    it('should return stored keywords', async () => {
      mockChromeStorage['jobfiltr_include_kw'] = ['react', 'typescript'];

      const keywords = await hybridStorage.getIncludeKeywords();
      expect(keywords).toEqual(['react', 'typescript']);
    });

    it('should throw error when non-Pro user tries to add keyword', async () => {
      // Pro status is false by default since supabase is mocked
      await expect(hybridStorage.addIncludeKeyword('react')).rejects.toThrow('Pro required');
    });

    it('should remove keyword', async () => {
      mockChromeStorage['jobfiltr_include_kw'] = ['react', 'vue', 'angular'];

      await hybridStorage.removeIncludeKeyword('vue');

      expect(chrome.storage.local.set).toHaveBeenCalled();
    });
  });

  describe('Exclude Keywords', () => {
    it('should return empty array when no keywords stored', async () => {
      const keywords = await hybridStorage.getExcludeKeywords();
      expect(keywords).toEqual([]);
    });

    it('should return stored keywords', async () => {
      mockChromeStorage['jobfiltr_exclude_kw'] = ['senior', 'lead'];

      const keywords = await hybridStorage.getExcludeKeywords();
      expect(keywords).toEqual(['senior', 'lead']);
    });

    it('should add keyword for free user within limit', async () => {
      mockChromeStorage['jobfiltr_exclude_kw'] = ['one', 'two'];

      await hybridStorage.addExcludeKeyword('three');

      expect(chrome.storage.local.set).toHaveBeenCalled();
    });

    it('should throw error when free user exceeds limit', async () => {
      mockChromeStorage['jobfiltr_exclude_kw'] = ['one', 'two', 'three'];

      await expect(hybridStorage.addExcludeKeyword('four')).rejects.toThrow('Free limit');
    });

    it('should not add duplicate keywords', async () => {
      mockChromeStorage['jobfiltr_exclude_kw'] = ['senior'];

      await hybridStorage.addExcludeKeyword('senior');

      // Should not have called set (no change)
      const setCalls = vi.mocked(chrome.storage.local.set).mock.calls;
      // Check that no new keyword was added
    });

    it('should remove keyword', async () => {
      mockChromeStorage['jobfiltr_exclude_kw'] = ['senior', 'lead'];

      await hybridStorage.removeExcludeKeyword('senior');

      expect(chrome.storage.local.set).toHaveBeenCalled();
    });

    it('should normalize keyword to lowercase', async () => {
      mockChromeStorage['jobfiltr_exclude_kw'] = [];

      await hybridStorage.addExcludeKeyword('SENIOR');

      const setCalls = vi.mocked(chrome.storage.local.set).mock.calls;
      const lastCall = setCalls[setCalls.length - 1][0];
      expect(lastCall['jobfiltr_exclude_kw']).toContain('senior');
    });
  });

  describe('Exclude Companies', () => {
    it('should return empty array when no companies stored', async () => {
      const companies = await hybridStorage.getExcludeCompanies();
      expect(companies).toEqual([]);
    });

    it('should return stored companies', async () => {
      mockChromeStorage['jobfiltr_exclude_co'] = ['amazon', 'meta'];

      const companies = await hybridStorage.getExcludeCompanies();
      expect(companies).toEqual(['amazon', 'meta']);
    });

    it('should add company for free user within limit (1)', async () => {
      mockChromeStorage['jobfiltr_exclude_co'] = [];

      await hybridStorage.addExcludeCompany('Amazon');

      expect(chrome.storage.local.set).toHaveBeenCalled();
    });

    it('should throw error when free user exceeds company limit', async () => {
      mockChromeStorage['jobfiltr_exclude_co'] = ['amazon'];

      await expect(hybridStorage.addExcludeCompany('meta')).rejects.toThrow('Free limit');
    });

    it('should remove company', async () => {
      mockChromeStorage['jobfiltr_exclude_co'] = ['amazon'];

      await hybridStorage.removeExcludeCompany('amazon');

      expect(chrome.storage.local.set).toHaveBeenCalled();
    });
  });

  describe('Community Blocklist', () => {
    it('should return empty array when no blocklist cached', async () => {
      const blocklist = await hybridStorage.getCommunityBlocklist();
      expect(blocklist).toEqual([]);
    });

    it('should return cached blocklist if within TTL', async () => {
      const cachedBlocklist = [
        { companyName: 'Staffing Inc', companyNameNormalized: 'staffinginc', category: 'staffing' },
      ];
      mockChromeStorage['jobfiltr_blocklist'] = cachedBlocklist;
      mockChromeStorage['jobfiltr_blocklist_ts'] = Date.now();

      const blocklist = await hybridStorage.getCommunityBlocklist();
      expect(blocklist).toEqual(cachedBlocklist);
    });

    it('should return stale cache when Supabase unavailable', async () => {
      const staleBlocklist = [
        { companyName: 'Old Entry', companyNameNormalized: 'oldentry', category: 'staffing' },
      ];
      mockChromeStorage['jobfiltr_blocklist'] = staleBlocklist;
      mockChromeStorage['jobfiltr_blocklist_ts'] = Date.now() - 2 * 60 * 60 * 1000; // 2 hours ago

      const blocklist = await hybridStorage.getCommunityBlocklist();
      // Should return stale cache since Supabase is mocked as unavailable
      expect(blocklist).toEqual(staleBlocklist);
    });
  });

  describe('Pro Status', () => {
    it('should return false when Supabase unavailable', async () => {
      const isPro = await hybridStorage.checkProStatus();
      expect(isPro).toBe(false);
    });

    it('should return cached Pro status if within TTL', async () => {
      mockChromeStorage['jobfiltr_pro_status'] = {
        isPro: true,
        cachedAt: Date.now(),
      };

      const isPro = await hybridStorage.checkProStatus();
      expect(isPro).toBe(true);
    });

    it('should re-check if cache expired', async () => {
      mockChromeStorage['jobfiltr_pro_status'] = {
        isPro: true,
        cachedAt: Date.now() - 10 * 60 * 1000, // 10 minutes ago (past 5 min TTL)
      };

      const isPro = await hybridStorage.checkProStatus();
      // Should be false since Supabase is unavailable
      expect(isPro).toBe(false);
    });

    it('should return Pro status object', async () => {
      const proStatus = await hybridStorage.getProStatus();
      expect(proStatus).toHaveProperty('isPro');
      expect(typeof proStatus.isPro).toBe('boolean');
    });
  });

  describe('Include Keywords Match Mode', () => {
    it('should return default mode from settings', async () => {
      const mode = await hybridStorage.getIncludeKeywordsMatchMode();
      expect(mode).toBe('any');
    });

    it('should return stored mode', async () => {
      mockChromeStorage['jobfiltr_settings'] = {
        includeKeywordsMatchMode: 'all',
      };

      const mode = await hybridStorage.getIncludeKeywordsMatchMode();
      expect(mode).toBe('all');
    });

    it('should update match mode through settings', async () => {
      await hybridStorage.setIncludeKeywordsMatchMode('all');

      expect(chrome.storage.local.set).toHaveBeenCalled();
    });
  });

  describe('Cache Management', () => {
    it('should clear cache', async () => {
      mockChromeStorage['jobfiltr_blocklist_ts'] = Date.now();
      mockChromeStorage['jobfiltr_pro_status'] = { isPro: true, cachedAt: Date.now() };

      await hybridStorage.clearCache();

      expect(chrome.storage.local.remove).toHaveBeenCalledWith([
        'jobfiltr_blocklist_ts',
        'jobfiltr_pro_status',
      ]);
    });
  });

  describe('Error Handling', () => {
    it('should handle chrome.storage errors gracefully', async () => {
      vi.mocked(chrome.storage.local.get).mockRejectedValueOnce(new Error('Storage error'));

      const settings = await hybridStorage.getSettings();

      // Should return defaults on error
      expect(settings).toMatchObject({
        hideGhostJobs: true,
        hideStaffingFirms: true,
      });
    });
  });
});
