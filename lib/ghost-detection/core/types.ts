/**
 * Ghost Job Detection Type Definitions
 * Core types for the detection system
 */

// Detection signal categories
export type SignalCategory =
  | 'temporal'
  | 'content'
  | 'company'
  | 'behavioral'
  | 'community'
  | 'structural';

// Individual detection signal
export interface DetectionSignal {
  id: string;
  category: SignalCategory;
  name: string;
  weight: number; // 0-100
  value: number;
  normalizedValue: number; // 0-1
  confidence: number; // 0-1
  description: string;
  evidence?: string;
}

// Overall ghost job score
export interface GhostJobScore {
  overall: number; // 0-100
  confidence: number; // 0-1
  category: 'safe' | 'low_risk' | 'medium_risk' | 'high_risk' | 'likely_ghost';
  signals: DetectionSignal[];
  breakdown: {
    temporal: number;
    content: number;
    company: number;
    behavioral: number;
    community: number;
    structural: number;
  };
  timestamp: number;
}

// Job listing data structure
export interface JobListing {
  id: string;
  platform: 'linkedin' | 'indeed';
  url: string;
  title: string;
  company: string;
  location: string;
  postedDate: string | null;
  description: string;
  salary?: string;
  applicantCount?: number;
  isEasyApply?: boolean;
  isSponsored?: boolean;
  companyIndustry?: string;
}

// Blacklist entry for known ghost job companies
export interface BlacklistEntry {
  company: string;
  normalizedName: string;
  source: 'reddit' | 'community' | 'user' | 'curated';
  reportCount: number;
  lastReported: number;
  reasons: string[];
  confidence: number;
  verifiedGhost: boolean;
}

// Detection configuration
export interface DetectionConfig {
  enabled: boolean;
  sensitivity: 'low' | 'medium' | 'high';
  showScores: boolean;
  autoHide: boolean;
  autoHideThreshold: number;
  syncInterval: number;
}

// User report structure
export interface UserReport {
  jobId: string;
  platform: string;
  company: string;
  reportType: 'ghost' | 'scam' | 'misleading' | 'spam';
  details: string;
  timestamp: number;
}

// Salary extraction result
export interface SalaryInfo {
  hasSalary: boolean;
  salaryRange?: {
    min: number;
    max: number;
  };
  isVague: boolean;
}

// Staffing agency detection result
export interface StaffingAgencyResult {
  isLikely: boolean;
  confidence: number;
  matchedIndicators: string[];
}

// Cache entry wrapper
export interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}
