import type { JobData, FilterResult } from '@/types';
import { hybridStorage } from '@/storage/hybridStorage';

export class IncludeKeywordsFilter {
  private keywords: string[] = [];
  private matchMode: 'any' | 'all' = 'any';
  private isPro = false;
  private initialized = false;

  async init(): Promise<void> {
    if (this.initialized) return;

    const proStatus = await hybridStorage.getProStatus();
    this.isPro = proStatus.isPro;

    if (!this.isPro) {
      this.initialized = true;
      return;
    }

    this.keywords = (await hybridStorage.getIncludeKeywords()).map(k => k.toLowerCase().trim());
    this.matchMode = await hybridStorage.getIncludeKeywordsMatchMode();
    this.initialized = true;
  }

  async refresh(): Promise<void> {
    this.initialized = false;
    await this.init();
  }

  analyze(job: JobData): FilterResult {
    if (!this.isPro || this.keywords.length === 0) {
      return { passed: true, reason: null };
    }

    const searchText = `${job.title} ${job.company} ${job.description} ${job.location}`.toLowerCase();

    const matchedKeywords = this.keywords.filter(kw => {
      // Handle exact phrase matching with quotes
      if (kw.startsWith('"') && kw.endsWith('"')) {
        return searchText.includes(kw.slice(1, -1));
      }
      // Check if keyword contains special regex characters that break word boundaries
      const hasSpecialChars = /[+#.]/.test(kw);
      if (hasSpecialChars) {
        // For keywords with special chars (c++, c#, .net), use case-insensitive substring match
        return searchText.includes(kw);
      }
      // Word boundary matching for regular keywords
      return new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(searchText);
    });

    if (this.matchMode === 'any') {
      return matchedKeywords.length > 0
        ? { passed: true, reason: null, matchedKeywords }
        : { passed: false, reason: 'Missing required keywords', missingKeywords: this.keywords };
    } else {
      // 'all' mode - all keywords must match
      const missing = this.keywords.filter(k => !matchedKeywords.includes(k));
      return missing.length === 0
        ? { passed: true, reason: null, matchedKeywords }
        : {
            passed: false,
            reason: `Missing: ${missing.slice(0, 3).join(', ')}${missing.length > 3 ? '...' : ''}`,
            matchedKeywords,
            missingKeywords: missing
          };
    }
  }

  async addKeyword(kw: string): Promise<void> {
    if (!this.isPro) throw new Error('Pro required');
    await hybridStorage.addIncludeKeyword(kw);
    this.keywords.push(kw.toLowerCase().trim());
  }

  async removeKeyword(kw: string): Promise<void> {
    await hybridStorage.removeIncludeKeyword(kw);
    this.keywords = this.keywords.filter(k => k !== kw.toLowerCase().trim());
  }

  async setMatchMode(mode: 'any' | 'all'): Promise<void> {
    if (!this.isPro) throw new Error('Pro required');
    await hybridStorage.setIncludeKeywordsMatchMode(mode);
    this.matchMode = mode;
  }

  getConfig() {
    return { keywords: this.keywords, matchMode: this.matchMode, isPro: this.isPro };
  }

  canUse() {
    return this.isPro;
  }
}

export const includeKeywordsFilter = new IncludeKeywordsFilter();
