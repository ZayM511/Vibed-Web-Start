import type { JobData, FilterResult } from '@/types';
import { hybridStorage } from '@/storage/hybridStorage';

const FREE_LIMIT = 3;

export class ExcludeKeywordsFilter {
  private keywords: string[] = [];
  private isPro = false;
  private initialized = false;

  async init(): Promise<void> {
    if (this.initialized) return;

    const proStatus = await hybridStorage.getProStatus();
    this.isPro = proStatus.isPro;
    this.keywords = (await hybridStorage.getExcludeKeywords()).map(k => k.toLowerCase().trim());
    this.initialized = true;
  }

  async refresh(): Promise<void> {
    this.initialized = false;
    await this.init();
  }

  analyze(job: JobData): FilterResult {
    if (this.keywords.length === 0) {
      return { passed: true, reason: null };
    }

    const searchText = `${job.title} ${job.company} ${job.description}`.toLowerCase();

    for (const kw of this.keywords) {
      // Handle exact phrase matching with quotes
      if (kw.startsWith('"') && kw.endsWith('"')) {
        if (searchText.includes(kw.slice(1, -1))) {
          return { passed: false, reason: `Contains: ${kw}`, matchedKeywords: [kw] };
        }
        continue;
      }

      // Check if keyword contains special regex characters that break word boundaries
      const hasSpecialChars = /[+#.]/.test(kw);
      if (hasSpecialChars) {
        // For keywords with special chars (c++, c#, .net), use case-insensitive substring match
        if (searchText.includes(kw)) {
          return { passed: false, reason: `Contains: ${kw}`, matchedKeywords: [kw] };
        }
        continue;
      }

      // Word boundary matching for regular keywords
      const regex = new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (regex.test(searchText)) {
        return { passed: false, reason: `Contains: ${kw}`, matchedKeywords: [kw] };
      }
    }

    return { passed: true, reason: null };
  }

  async addKeyword(kw: string): Promise<void> {
    if (!this.isPro && this.keywords.length >= FREE_LIMIT) {
      throw new Error(`Free limit: ${FREE_LIMIT} exclude keywords. Upgrade for unlimited.`);
    }
    await hybridStorage.addExcludeKeyword(kw);
    this.keywords.push(kw.toLowerCase().trim());
  }

  async removeKeyword(kw: string): Promise<void> {
    await hybridStorage.removeExcludeKeyword(kw);
    this.keywords = this.keywords.filter(k => k !== kw.toLowerCase().trim());
  }

  getConfig() {
    return { keywords: this.keywords, isPro: this.isPro, limit: this.isPro ? Infinity : FREE_LIMIT };
  }

  getCount() {
    return this.keywords.length;
  }

  getLimit() {
    return this.isPro ? Infinity : FREE_LIMIT;
  }
}

export const excludeKeywordsFilter = new ExcludeKeywordsFilter();
