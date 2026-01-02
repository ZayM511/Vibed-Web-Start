import type { JobData, FilterResult } from '@/types';
import { normalizeCompanyName } from '@/lib/utils';
import { hybridStorage } from '@/storage/hybridStorage';

const FREE_LIMIT = 1;

export class ExcludeCompaniesFilter {
  private companies: string[] = [];
  private isPro = false;
  private initialized = false;

  async init(): Promise<void> {
    if (this.initialized) return;

    const proStatus = await hybridStorage.getProStatus();
    this.isPro = proStatus.isPro;
    this.companies = await hybridStorage.getExcludeCompanies();
    this.initialized = true;
  }

  async refresh(): Promise<void> {
    this.initialized = false;
    await this.init();
  }

  analyze(job: JobData): FilterResult {
    if (this.companies.length === 0) {
      return { passed: true, reason: null };
    }

    const normalized = normalizeCompanyName(job.company);

    for (const company of this.companies) {
      // Check both directions for partial matches
      if (normalized.includes(company) || company.includes(normalized)) {
        return {
          passed: false,
          reason: `Blocked company: ${job.company}`,
          blockedCompany: job.company
        };
      }
    }

    return { passed: true, reason: null };
  }

  async addCompany(company: string): Promise<void> {
    if (!this.isPro && this.companies.length >= FREE_LIMIT) {
      throw new Error(`Free limit: ${FREE_LIMIT} company block. Upgrade for unlimited.`);
    }
    await hybridStorage.addExcludeCompany(company);
    this.companies.push(normalizeCompanyName(company));
  }

  async removeCompany(company: string): Promise<void> {
    await hybridStorage.removeExcludeCompany(company);
    this.companies = this.companies.filter(c => c !== normalizeCompanyName(company));
  }

  getConfig() {
    return { companies: this.companies, isPro: this.isPro, limit: this.isPro ? Infinity : FREE_LIMIT };
  }

  getCount() {
    return this.companies.length;
  }

  getLimit() {
    return this.isPro ? Infinity : FREE_LIMIT;
  }
}

export const excludeCompaniesFilter = new ExcludeCompaniesFilter();
