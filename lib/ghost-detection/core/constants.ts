/**
 * Ghost Detection Constants & Scoring Weights
 * Calibrated for best-in-class ghost job detection
 */

// SCORING WEIGHTS - Calibrated for optimal detection
export const SIGNAL_WEIGHTS = {
  temporal: {
    // 25% of total score
    categoryWeight: 25,
    signals: {
      postingAge: 35,
      repostFrequency: 30,
      lastActivityDate: 20,
      seasonalPattern: 15,
    },
  },
  content: {
    // 25% of total score
    categoryWeight: 25,
    signals: {
      descriptionVagueness: 25,
      salaryTransparency: 20,
      requirementRealism: 20,
      buzzwordDensity: 15,
      descriptionLength: 10,
      contactInfo: 10,
    },
  },
  company: {
    // 20% of total score
    categoryWeight: 20,
    signals: {
      blacklistMatch: 40,
      companySize: 20,
      hiringVolume: 20,
      industryRisk: 20,
    },
  },
  behavioral: {
    // 15% of total score
    categoryWeight: 15,
    signals: {
      applicationMethod: 35,
      sponsoredPost: 25,
      applicantCount: 25,
      responseRate: 15,
    },
  },
  community: {
    // 10% of total score
    categoryWeight: 10,
    signals: {
      userReports: 50,
      glassdoorReviews: 30,
      redditMentions: 20,
    },
  },
  structural: {
    // 5% of total score
    categoryWeight: 5,
    signals: {
      duplicateDetection: 50,
      formattingQuality: 30,
      linkIntegrity: 20,
    },
  },
} as const;

// Score category thresholds
export const SCORE_THRESHOLDS = {
  safe: { min: 0, max: 20 },
  low_risk: { min: 21, max: 40 },
  medium_risk: { min: 41, max: 60 },
  high_risk: { min: 61, max: 80 },
  likely_ghost: { min: 81, max: 100 },
} as const;

// Temporal analysis thresholds (in days)
export const TEMPORAL_THRESHOLDS = {
  freshPost: 7,
  normalPost: 30,
  stalePost: 60,
  veryStalePost: 90,
  minRepostInterval: 14,
  maxRepostsBeforeFlag: 3,
  ghostPeakMonths: [1, 2, 11, 12], // Q1 and Q4
} as const;

// Content analysis thresholds
export const CONTENT_THRESHOLDS = {
  minDescriptionLength: 200,
  maxBuzzwordPercentage: 15,
  vaguenessIndicators: [
    'fast-paced environment',
    'self-starter',
    'team player',
    'dynamic',
    'exciting opportunity',
    'competitive salary',
    'commensurate with experience',
    'DOE',
    'negotiable',
    'rock star',
    'ninja',
    'guru',
    'wear many hats',
    'other duties as assigned',
    'up to',
  ],
  legitimacyIndicators: [
    'reports to',
    'team of',
    'specific project',
    'start date',
    'interview process',
    'benefits include',
    'PTO',
    '401k',
    'health insurance',
  ],
} as const;

// Known staffing agencies
export const KNOWN_STAFFING_AGENCIES = [
  'robert half',
  'randstad',
  'kelly services',
  'manpower',
  'adecco',
  'aerotek',
  'insight global',
  'teksystems',
  'apex systems',
  'kforce',
  'hays',
  'allegis group',
  'express employment',
  'spherion',
  'volt',
  'beacon hill',
  'modis',
  'aquent',
  'creative circle',
  'mastech',
  'cybercoders',
  'jobot',
  'motion recruitment',
  'vaco',
  'addison group',
] as const;

// High-risk industries for ghost jobs
export const HIGH_RISK_INDUSTRIES = [
  'staffing',
  'recruiting',
  'talent acquisition',
  'consulting',
  'marketing agency',
  'call center',
  'insurance sales',
  'financial services',
] as const;

// Data source configuration
export const DATA_SOURCES = {
  redditGhostList: {
    primary:
      'https://docs.google.com/spreadsheets/d/1HjPOyF4E8Y_tT-dHXkVgFmqPU9BHpLsP/export?format=csv',
    fallback: 'https://api.jobfiltr.com/data/reddit-ghost-list.json',
    updateInterval: 24, // hours
  },
  communityBlacklist: {
    endpoint: 'https://api.jobfiltr.com/data/community-blacklist.json',
    updateInterval: 12, // hours
  },
} as const;

// Cache configuration
export const CACHE_CONFIG = {
  blacklistTTL: 24 * 60 * 60 * 1000, // 24 hours in ms
  scoreCacheTTL: 60 * 60 * 1000, // 1 hour in ms
  maxCacheSize: 10000,
  storageKey: 'jobfiltr_ghost_detection',
  version: '1.0.0',
} as const;

// UI Colors for score categories
export const SCORE_COLORS = {
  safe: '#10b981',
  low_risk: '#3b82f6',
  medium_risk: '#f59e0b',
  high_risk: '#ef4444',
  likely_ghost: '#dc2626',
} as const;

// UI Labels for score categories
export const SCORE_LABELS = {
  safe: 'Likely Legitimate',
  low_risk: 'Low Risk',
  medium_risk: 'Medium Risk',
  high_risk: 'High Risk',
  likely_ghost: 'Likely Ghost Job',
} as const;
