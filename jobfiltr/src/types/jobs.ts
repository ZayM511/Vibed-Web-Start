// Job-related types

import type { JobData, DetectionResult } from './index';

export interface ProcessedJob extends JobData {
  processedAt: number;
  ghostResult?: DetectionResult;
  staffingResult?: DetectionResult;
  remoteResult?: DetectionResult;
  filtersPassed: boolean;
  hideReasons: string[];
}

export interface JobStats {
  totalScanned: number;
  ghostJobsFound: number;
  staffingFirmsFound: number;
  keywordMatches: number;
  companiesBlocked: number;
}

export interface SessionStats extends JobStats {
  sessionStart: number;
  lastActivity: number;
}
