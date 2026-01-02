import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { normalizeCompanyName } from '@/lib/utils';
import type { FilterSettings, BlocklistEntry } from '@/types';

const CACHE_KEYS = {
  settings: 'jobfiltr_settings',
  blocklist: 'jobfiltr_blocklist',
  blocklistTimestamp: 'jobfiltr_blocklist_ts',
  includeKeywords: 'jobfiltr_include_kw',
  excludeKeywords: 'jobfiltr_exclude_kw',
  excludeCompanies: 'jobfiltr_exclude_co',
  proStatus: 'jobfiltr_pro_status'
};

const DEFAULT_SETTINGS: FilterSettings = {
  hideGhostJobs: true,
  hideStaffingFirms: true,
  verifyTrueRemote: false,
  ghostJobDaysThreshold: 30,
  datePosted: 'any',
  includeKeywords: [],
  includeKeywordsMatchMode: 'any',
  excludeKeywords: [],
  excludeCompanies: []
};

const CACHE_TTL = 3600000; // 1 hour
const FREE_LIMITS = { excludeKeywords: 3, excludeCompanies: 1 };

class HybridStorageService {
  private cache: Map<string, unknown> = new Map();

  // ═══════════════════════════════════════════════════════════════════════════
  // SETTINGS
  // ═══════════════════════════════════════════════════════════════════════════

  async getSettings(): Promise<FilterSettings> {
    try {
      const result = await chrome.storage.local.get(CACHE_KEYS.settings);
      return { ...DEFAULT_SETTINGS, ...(result[CACHE_KEYS.settings] || {}) };
    } catch {
      return DEFAULT_SETTINGS;
    }
  }

  async updateSettings(partial: Partial<FilterSettings>): Promise<void> {
    const current = await this.getSettings();
    const updated = { ...current, ...partial };
    await chrome.storage.local.set({ [CACHE_KEYS.settings]: updated });

    // Sync to Supabase if logged in
    if (isSupabaseConfigured && supabase) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('user_settings').upsert({
          user_id: user.id,
          hide_ghost_jobs: updated.hideGhostJobs,
          hide_staffing_firms: updated.hideStaffingFirms,
          require_true_remote: updated.verifyTrueRemote,
          ghost_job_days_threshold: updated.ghostJobDaysThreshold
        });
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // COMMUNITY BLOCKLIST
  // ═══════════════════════════════════════════════════════════════════════════

  async getCommunityBlocklist(): Promise<BlocklistEntry[]> {
    // Check cache first
    const cached = await chrome.storage.local.get([
      CACHE_KEYS.blocklist,
      CACHE_KEYS.blocklistTimestamp
    ]);
    const timestamp = cached[CACHE_KEYS.blocklistTimestamp] || 0;

    if (cached[CACHE_KEYS.blocklist] && Date.now() - timestamp < CACHE_TTL) {
      return cached[CACHE_KEYS.blocklist];
    }

    // Fetch fresh if online
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.from('community_blocklist').select('*');
        if (!error && data) {
          const entries: BlocklistEntry[] = data.map(d => ({
            companyName: d.company_name,
            companyNameNormalized: d.company_name_normalized,
            category: d.category,
            source: 'community' as const,
            verified: d.verified,
            submittedCount: d.submitted_count
          }));
          await chrome.storage.local.set({
            [CACHE_KEYS.blocklist]: entries,
            [CACHE_KEYS.blocklistTimestamp]: Date.now()
          });
          return entries;
        }
      } catch {
        /* Fall through to cached */
      }
    }

    return cached[CACHE_KEYS.blocklist] || [];
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // INCLUDE KEYWORDS (PRO)
  // ═══════════════════════════════════════════════════════════════════════════

  async getIncludeKeywords(): Promise<string[]> {
    const result = await chrome.storage.local.get(CACHE_KEYS.includeKeywords);
    return result[CACHE_KEYS.includeKeywords] || [];
  }

  async addIncludeKeyword(keyword: string): Promise<void> {
    const isPro = await this.checkProStatus();
    if (!isPro) throw new Error('Pro required for include keywords');

    const current = await this.getIncludeKeywords();
    const normalized = keyword.toLowerCase().trim();
    if (!normalized || current.includes(normalized)) return;

    const updated = [...current, normalized];
    await chrome.storage.local.set({ [CACHE_KEYS.includeKeywords]: updated });

    // Sync to Supabase
    if (isSupabaseConfigured && supabase) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('user_include_keywords').insert({
          user_id: user.id,
          keyword: normalized
        });
      }
    }
  }

  async removeIncludeKeyword(keyword: string): Promise<void> {
    const current = await this.getIncludeKeywords();
    const updated = current.filter(k => k !== keyword.toLowerCase().trim());
    await chrome.storage.local.set({ [CACHE_KEYS.includeKeywords]: updated });
  }

  async getIncludeKeywordsMatchMode(): Promise<'any' | 'all'> {
    const settings = await this.getSettings();
    return settings.includeKeywordsMatchMode;
  }

  async setIncludeKeywordsMatchMode(mode: 'any' | 'all'): Promise<void> {
    await this.updateSettings({ includeKeywordsMatchMode: mode });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // EXCLUDE KEYWORDS
  // ═══════════════════════════════════════════════════════════════════════════

  async getExcludeKeywords(): Promise<string[]> {
    const result = await chrome.storage.local.get(CACHE_KEYS.excludeKeywords);
    return result[CACHE_KEYS.excludeKeywords] || [];
  }

  async addExcludeKeyword(keyword: string): Promise<void> {
    const current = await this.getExcludeKeywords();
    const isPro = await this.checkProStatus();

    if (!isPro && current.length >= FREE_LIMITS.excludeKeywords) {
      throw new Error(
        `Free limit: ${FREE_LIMITS.excludeKeywords} exclude keywords. Upgrade for unlimited.`
      );
    }

    const normalized = keyword.toLowerCase().trim();
    if (!normalized || current.includes(normalized)) return;

    await chrome.storage.local.set({
      [CACHE_KEYS.excludeKeywords]: [...current, normalized]
    });
  }

  async removeExcludeKeyword(keyword: string): Promise<void> {
    const current = await this.getExcludeKeywords();
    await chrome.storage.local.set({
      [CACHE_KEYS.excludeKeywords]: current.filter(
        k => k !== keyword.toLowerCase().trim()
      )
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // EXCLUDE COMPANIES
  // ═══════════════════════════════════════════════════════════════════════════

  async getExcludeCompanies(): Promise<string[]> {
    const result = await chrome.storage.local.get(CACHE_KEYS.excludeCompanies);
    return result[CACHE_KEYS.excludeCompanies] || [];
  }

  async addExcludeCompany(company: string): Promise<void> {
    const current = await this.getExcludeCompanies();
    const isPro = await this.checkProStatus();

    if (!isPro && current.length >= FREE_LIMITS.excludeCompanies) {
      throw new Error(
        `Free limit: ${FREE_LIMITS.excludeCompanies} company block. Upgrade for unlimited.`
      );
    }

    const normalized = normalizeCompanyName(company);
    if (!normalized || current.includes(normalized)) return;

    await chrome.storage.local.set({
      [CACHE_KEYS.excludeCompanies]: [...current, normalized]
    });
  }

  async removeExcludeCompany(company: string): Promise<void> {
    const current = await this.getExcludeCompanies();
    await chrome.storage.local.set({
      [CACHE_KEYS.excludeCompanies]: current.filter(
        c => c !== normalizeCompanyName(company)
      )
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PRO STATUS
  // ═══════════════════════════════════════════════════════════════════════════

  async checkProStatus(): Promise<boolean> {
    const cached = await chrome.storage.local.get(CACHE_KEYS.proStatus);
    const proData = cached[CACHE_KEYS.proStatus];

    if (proData?.cachedAt && Date.now() - proData.cachedAt < 300000) {
      return proData.isPro;
    }

    if (!isSupabaseConfigured || !supabase) return false;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { data } = await supabase.rpc('check_pro_access', { p_user_id: user.id });
      const isPro = !!data;

      await chrome.storage.local.set({
        [CACHE_KEYS.proStatus]: { isPro, cachedAt: Date.now() }
      });

      return isPro;
    } catch {
      return false;
    }
  }

  async getProStatus(): Promise<{ isPro: boolean }> {
    return { isPro: await this.checkProStatus() };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CACHE MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  async clearCache(): Promise<void> {
    this.cache.clear();
    await chrome.storage.local.remove([
      CACHE_KEYS.blocklistTimestamp,
      CACHE_KEYS.proStatus
    ]);
  }

  async syncFromCloud(): Promise<void> {
    if (!isSupabaseConfigured || !supabase) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Sync settings from cloud
    const { data: settings } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (settings) {
      await this.updateSettings({
        hideGhostJobs: settings.hide_ghost_jobs,
        hideStaffingFirms: settings.hide_staffing_firms,
        verifyTrueRemote: settings.require_true_remote,
        ghostJobDaysThreshold: settings.ghost_job_days_threshold
      });
    }

    // Sync include keywords from cloud
    const { data: keywords } = await supabase
      .from('user_include_keywords')
      .select('keyword')
      .eq('user_id', user.id);

    if (keywords) {
      await chrome.storage.local.set({
        [CACHE_KEYS.includeKeywords]: keywords.map(k => k.keyword)
      });
    }
  }
}

export const hybridStorage = new HybridStorageService();
