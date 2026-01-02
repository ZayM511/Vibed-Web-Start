import type { JobData, FilterSettings, DetectionResult, BlocklistEntry } from '@/types';

// ═══════════════════════════════════════════════════════════════════════════
// JOB DATA FACTORIES
// ═══════════════════════════════════════════════════════════════════════════

export function createMockJob(overrides: Partial<JobData> = {}): JobData {
  return {
    id: `job-${Math.random().toString(36).substr(2, 9)}`,
    title: 'Software Engineer',
    company: 'TechCorp Inc',
    location: 'San Francisco, CA',
    description: 'We are looking for a talented engineer to join our team. Requirements: 3-5 years experience with TypeScript/React. Benefits include health insurance and 401k.',
    postedDate: '2 days ago',
    isRemote: false,
    salary: '$120,000 - $150,000',
    applicantCount: 45,
    ...overrides,
  };
}

export function createMockGhostJob(overrides: Partial<JobData> = {}): JobData {
  return createMockJob({
    postedDate: '45 days ago',
    description: 'Great opportunity! Join our amazing team! Fast-paced environment! Competitive salary!',
    company: 'Confidential',
    salary: undefined,
    applicantCount: 3,
    ...overrides,
  });
}

export function createMockStaffingJob(overrides: Partial<JobData> = {}): JobData {
  return createMockJob({
    company: 'Robert Half International',
    title: 'Contract Software Developer',
    description: 'Our client, a Fortune 500 company, is seeking a talented developer. This is a W2 contract position with contract-to-hire potential.',
    ...overrides,
  });
}

export function createMockFakeRemoteJob(overrides: Partial<JobData> = {}): JobData {
  return createMockJob({
    title: 'Remote Software Engineer',
    isRemote: true,
    description: 'Remote position. Must be located in Austin, TX area. Hybrid schedule with 3 days in office required.',
    location: 'Austin, TX (Hybrid)',
    ...overrides,
  });
}

export function createMockTrueRemoteJob(overrides: Partial<JobData> = {}): JobData {
  return createMockJob({
    title: 'Remote Software Engineer',
    isRemote: true,
    description: 'Fully remote position. Work from anywhere in the world. We are a distributed team across 15 countries. Async communication via Slack.',
    location: 'Remote - Worldwide',
    ...overrides,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// USER TIER TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type UserTier = 'free' | 'pro';

export interface MockUser {
  id: string;
  email: string;
  tier: UserTier;
  createdAt: string;
  subscriptionEnd: string | null;
}

export function createMockUser(tier: UserTier = 'free'): MockUser {
  return {
    id: `user-${Math.random().toString(36).substr(2, 9)}`,
    email: 'test@example.com',
    tier,
    createdAt: new Date().toISOString(),
    subscriptionEnd: tier === 'pro'
      ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      : null,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// FILTER SETTINGS FACTORY
// ═══════════════════════════════════════════════════════════════════════════

export function createMockFilterSettings(overrides: Partial<FilterSettings> = {}): FilterSettings {
  return {
    hideGhostJobs: true,
    hideStaffingFirms: true,
    verifyTrueRemote: true,
    ghostJobDaysThreshold: 30,
    datePosted: 'any',
    includeKeywords: [],
    includeKeywordsMatchMode: 'any',
    excludeKeywords: [],
    excludeCompanies: [],
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// DETECTION RESULT FACTORY
// ═══════════════════════════════════════════════════════════════════════════

export function createMockDetectionResult(overrides: Partial<DetectionResult> = {}): DetectionResult {
  return {
    detected: false,
    confidence: 0,
    category: 'ghost_job',
    message: 'Appears legitimate',
    evidence: [],
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// BLOCKLIST ENTRY FACTORY
// ═══════════════════════════════════════════════════════════════════════════

export function createMockBlocklistEntry(overrides: Partial<BlocklistEntry> = {}): BlocklistEntry {
  return {
    companyName: 'Staffing Agency Inc',
    companyNameNormalized: 'staffingagencyinc',
    category: 'staffing',
    source: 'community',
    verified: true,
    submittedCount: 50,
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// KNOWN STAFFING FIRMS LIST
// ═══════════════════════════════════════════════════════════════════════════

export const KNOWN_STAFFING_FIRMS = [
  'Robert Half',
  'Randstad',
  'Kelly Services',
  'Manpower',
  'Adecco',
  'TEKsystems',
  'Insight Global',
  'Aerotek',
  'Kforce',
  'Apex Systems',
  'Experis',
  'Hays',
  'Michael Page',
  'Allegis Group',
  'Express Employment',
  'Cybercoders',
  'Dice',
  'Modis',
  'Accenture Federal',
  'Aquent',
];
