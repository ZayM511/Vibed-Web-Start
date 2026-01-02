export interface FilterSettings {
  hideGhostJobs: boolean;
  hideStaffingFirms: boolean;
  verifyTrueRemote: boolean;
  ghostJobDaysThreshold: number;
  datePosted: 'any' | 'day' | 'week' | 'month';
  includeKeywords: string[];
  includeKeywordsMatchMode: 'any' | 'all';
  excludeKeywords: string[];
  excludeCompanies: string[];
}

export interface BlocklistEntry {
  companyName: string;
  companyNameNormalized: string;
  category: 'staffing' | 'ghost_poster' | 'scam' | 'other';
  source: 'community' | 'user' | 'verified';
  verified: boolean;
  submittedCount: number;
}

export interface ProRequiredError {
  type: 'pro_required';
  feature: string;
  message: string;
}

export interface LimitReachedError {
  type: 'limit_reached';
  feature: string;
  limit: number;
  message: string;
}

export type StorageError = ProRequiredError | LimitReachedError;

export interface ProStatus {
  isPro: boolean;
  cachedAt?: number;
}

// Job Data for detection analysis
export interface JobData {
  id?: string;
  title: string;
  company: string;
  location: string;
  description: string;
  isRemote?: boolean;
  remoteType?: 'true_remote' | 'hybrid' | 'onsite' | 'unclear';
  postedDate?: string | null;
  salary?: string;
  applicantCount?: number;
}

// Detection result from analyzers
export interface DetectionResult {
  detected: boolean;
  confidence: number;
  category: string;
  message: string;
  evidence: string[];
}

// Filter result for keyword/company filters
export interface FilterResult {
  passed: boolean;
  reason: string | null;
  matchedKeywords?: string[];
  missingKeywords?: string[];
  blockedCompany?: string;
}

// Platform adapter interface for content script
export interface PlatformAdapter {
  getJobCards(): Element[];
  extractJobData(card: Element): JobData | null;
  hideJob(job: JobData): void;
  applyVisualIndicator(job: JobData, results: DetectionResult[]): void;
  observeNewJobs(callback: (newCards: Element[]) => void): void;
  injectScoreUI?(score: number, category: string, onClick: () => void): void;
}

// Saved template for Pro users
export interface SavedTemplate {
  id: string;
  userId: string;
  name: string;
  config: FilterSettings;
  createdAt: Date;
  updatedAt: Date;
}

// Export job data for CSV/JSON export
export interface ExportJob {
  title: string;
  company: string;
  location: string;
  postDate: string;
  url: string;
  filteredReason?: string;
}
