// Filter-related types

import type { FilterSettings } from './index';

export interface SavedFilter {
  id: string;
  name: string;
  settings: Partial<FilterSettings>;
  createdAt: string;
  updatedAt: string;
}

export interface FilterPreset {
  id: string;
  name: string;
  description: string;
  settings: Partial<FilterSettings>;
  isBuiltIn: boolean;
}

export const DEFAULT_PRESETS: FilterPreset[] = [
  {
    id: 'aggressive',
    name: 'Aggressive',
    description: 'Maximum filtering - hides ghost jobs, staffing firms, and verifies remote',
    settings: {
      hideGhostJobs: true,
      hideStaffingFirms: true,
      verifyTrueRemote: true,
      ghostJobDaysThreshold: 30,
    },
    isBuiltIn: true,
  },
  {
    id: 'moderate',
    name: 'Moderate',
    description: 'Balanced filtering - hides ghost jobs only',
    settings: {
      hideGhostJobs: true,
      hideStaffingFirms: false,
      verifyTrueRemote: false,
      ghostJobDaysThreshold: 60,
    },
    isBuiltIn: true,
  },
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Light filtering - only very old posts',
    settings: {
      hideGhostJobs: true,
      hideStaffingFirms: false,
      verifyTrueRemote: false,
      ghostJobDaysThreshold: 90,
    },
    isBuiltIn: true,
  },
];
