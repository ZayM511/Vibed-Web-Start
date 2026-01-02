/**
 * Ghost Detection Utilities
 *
 * Helper functions and shared utilities for ghost detection.
 */

// Text analysis utilities
export {
  calculateVaguenessScore,
  calculateBuzzwordDensity,
  extractSalaryInfo,
  normalizeCompanyName,
  isLikelyStaffingAgency,
  checkDescriptionLength,
  extractRequirements,
} from './text-analysis';

// Date utilities
export {
  parsePostingDate,
  daysSincePosted,
  calculateTemporalRisk,
  isGhostPeakPeriod,
  getPostingAgeString,
  detectReposting,
  getQuarter,
  isBusinessHours,
} from './date-utils';
