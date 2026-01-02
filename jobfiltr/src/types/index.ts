// Core types for JobFiltr

export type UserTier = 'free' | 'pro';

export type DetectionCategory = 'ghost' | 'staffing' | 'remote' | 'include_keyword' | 'exclude_keyword' | 'company';

export interface JobData {
  id: string;
  title: string;
  company: string;
  companyNormalized: string;
  location: string;
  postDate: string | null;
  daysSincePosted: number | null;
  isRemote: boolean;
  remoteType: 'true_remote' | 'hybrid' | 'onsite' | 'unclear';
  description: string;
  salary?: string;
  applicantCount?: number;
  isSponsored: boolean;
  isEasyApply: boolean;
  url: string;
  element: Element;
  platform: 'linkedin' | 'indeed';
}

export interface DetectionResult {
  detected: boolean;
  confidence: number;
  category: DetectionCategory;
  message: string;
  evidence?: string[];
  signals?: DetectionSignal[];
}

export interface DetectionSignal {
  id: string;
  name: string;
  weight: number;
  value: number;
  normalizedValue: number;
  description: string;
}

export interface FilterResult {
  passed: boolean;
  reason: string | null;
  matchedKeywords?: string[];
  missingKeywords?: string[];
}

export interface FilterSettings {
  hideGhostJobs: boolean;
  hideStaffingFirms: boolean;
  verifyTrueRemote: boolean;
  ghostJobDaysThreshold: 30 | 60 | 90;
  datePosted: '24h' | 'week' | 'month' | 'any';
  includeKeywords: string[];
  includeKeywordsMatchMode: 'any' | 'all';
  excludeKeywords: string[];
  excludeCompanies: string[];
}

export class ProRequiredError extends Error {
  constructor(feature: string) {
    super(`Pro required: ${feature}`);
    this.name = 'ProRequiredError';
  }
}

export class LimitReachedError extends Error {
  constructor(feature: string, limit: number) {
    super(`Limit: ${limit} ${feature}`);
    this.name = 'LimitReachedError';
  }
}
