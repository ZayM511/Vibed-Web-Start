/**
 * Reported Company Detector
 *
 * Detects companies that have been reported by the community
 * for posting spam jobs, ghost jobs, or engaging in questionable
 * hiring practices.
 *
 * Matching Algorithm:
 * 1. Exact match (confidence: 1.0) - Normalized name matches exactly
 * 2. Alias match (confidence: 0.95) - Matches any alias in the list
 * 3. Partial match (confidence: 0.85) - Bidirectional substring match
 */

import { normalizeCompanyName } from '../../../lib/utils';
import {
  REPORTED_COMPANY_MAP,
  REPORTED_COMPANIES,
  type ReportedCompany
} from '../../data/reportedCompanies';

// Job data structure for detection
export interface JobData {
  company: string;
  title?: string;
  description?: string;
  url?: string;
}

// Detection result structure
export interface ReportedCompanyResult {
  detected: boolean;
  confidence: number;
  matchType: 'exact' | 'alias' | 'partial' | 'none';
  company: ReportedCompany | null;
  matchedOn: string; // What string triggered the match
  message: string;
}

export class ReportedCompanyDetector {
  private companyMap: Map<string, ReportedCompany>;
  private companyList: ReportedCompany[];

  constructor() {
    // Use pre-built map for O(1) lookups
    this.companyMap = REPORTED_COMPANY_MAP;
    this.companyList = REPORTED_COMPANIES;
  }

  /**
   * Analyze a job to check if the company has been reported
   */
  analyze(job: JobData): ReportedCompanyResult {
    if (!job.company || job.company.trim() === '') {
      return this.noMatch();
    }

    const normalized = normalizeCompanyName(job.company);

    // 1. Check exact match in map (includes primary names and aliases)
    const exactMatch = this.companyMap.get(normalized);
    if (exactMatch) {
      return {
        detected: true,
        confidence: 1.0,
        matchType: 'exact',
        company: exactMatch,
        matchedOn: normalized,
        message: `${exactMatch.name} has been reported for ${this.getCategoryMessage(exactMatch.category)}`
      };
    }

    // 2. Check partial matches (bidirectional substring)
    for (const company of this.companyList) {
      // Check if job company contains reported company name
      if (normalized.includes(company.normalized) && company.normalized.length >= 3) {
        return {
          detected: true,
          confidence: 0.85,
          matchType: 'partial',
          company: company,
          matchedOn: company.normalized,
          message: `${company.name} has been reported for ${this.getCategoryMessage(company.category)}`
        };
      }

      // Check if reported company name contains job company
      if (company.normalized.includes(normalized) && normalized.length >= 3) {
        return {
          detected: true,
          confidence: 0.85,
          matchType: 'partial',
          company: company,
          matchedOn: normalized,
          message: `${company.name} has been reported for ${this.getCategoryMessage(company.category)}`
        };
      }

      // Check aliases for partial matches
      if (company.aliases) {
        for (const alias of company.aliases) {
          if (normalized.includes(alias) && alias.length >= 3) {
            return {
              detected: true,
              confidence: 0.9,
              matchType: 'alias',
              company: company,
              matchedOn: alias,
              message: `${company.name} has been reported for ${this.getCategoryMessage(company.category)}`
            };
          }
          if (alias.includes(normalized) && normalized.length >= 3) {
            return {
              detected: true,
              confidence: 0.9,
              matchType: 'alias',
              company: company,
              matchedOn: normalized,
              message: `${company.name} has been reported for ${this.getCategoryMessage(company.category)}`
            };
          }
        }
      }
    }

    return this.noMatch();
  }

  /**
   * Get category-specific message
   */
  private getCategoryMessage(category: 'spam' | 'ghost' | 'scam'): string {
    switch (category) {
      case 'spam':
        return 'posting spam job listings';
      case 'ghost':
        return 'posting ghost jobs (jobs that may not actually exist)';
      case 'scam':
        return 'potentially scam job postings';
      default:
        return 'questionable hiring practices';
    }
  }

  /**
   * Return a no-match result
   */
  private noMatch(): ReportedCompanyResult {
    return {
      detected: false,
      confidence: 0,
      matchType: 'none',
      company: null,
      matchedOn: '',
      message: ''
    };
  }

  /**
   * Quick check if a company name might match (for filtering)
   */
  quickCheck(companyName: string): boolean {
    const normalized = normalizeCompanyName(companyName);
    return this.companyMap.has(normalized);
  }

  /**
   * Get stats about the detector
   */
  getStats() {
    return {
      totalCompanies: this.companyList.length,
      totalAliases: this.companyMap.size - this.companyList.length,
      categories: {
        spam: this.companyList.filter(c => c.category === 'spam').length,
        ghost: this.companyList.filter(c => c.category === 'ghost').length,
        scam: this.companyList.filter(c => c.category === 'scam').length
      }
    };
  }
}

// Export singleton instance
export const reportedCompanyDetector = new ReportedCompanyDetector();
