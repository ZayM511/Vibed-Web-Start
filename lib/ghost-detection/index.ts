/**
 * Ghost Detection Module
 *
 * Core detection algorithms and utilities for identifying ghost jobs,
 * scam postings, and spam across job platforms.
 *
 * @example
 * ```typescript
 * import { ghostDetector, ghostDetectionController } from '@/lib/ghost-detection';
 *
 * // Analyze a job listing
 * const score = await ghostDetector.analyze(jobListing);
 * console.log(`Ghost score: ${score.overall} (${score.category})`);
 * ```
 */

// Type exports
export type {
  SignalCategory,
  DetectionSignal,
  GhostJobScore,
  JobListing,
  BlacklistEntry,
  DetectionConfig,
  UserReport,
  SalaryInfo,
  StaffingAgencyResult,
  CacheEntry,
} from './core/types';

// Core exports
export { GhostDetector, ghostDetector } from './core/ghost-detector';
export {
  GhostDetectionController,
  ghostDetectionController,
} from './core/controller';

// Constants exports
export {
  SIGNAL_WEIGHTS,
  SCORE_THRESHOLDS,
  TEMPORAL_THRESHOLDS,
  CONTENT_THRESHOLDS,
  KNOWN_STAFFING_AGENCIES,
  HIGH_RISK_INDUSTRIES,
  DATA_SOURCES,
  CACHE_CONFIG,
  SCORE_COLORS,
  SCORE_LABELS,
} from './core/constants';

// Data layer exports
export { storageManager } from './data/storage-manager';
export { blacklistSyncService } from './data/blacklist-sync';

// Utility exports
export {
  calculateVaguenessScore,
  calculateBuzzwordDensity,
  extractSalaryInfo,
  normalizeCompanyName,
  isLikelyStaffingAgency,
  checkDescriptionLength,
  extractRequirements,
} from './utils/text-analysis';

export {
  parsePostingDate,
  daysSincePosted,
  calculateTemporalRisk,
  isGhostPeakPeriod,
  getPostingAgeString,
  detectReposting,
  getQuarter,
  isBusinessHours,
} from './utils/date-utils';
