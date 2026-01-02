/**
 * Platform Adapter Types
 * Interfaces for platform-specific job extraction and visualization
 */

import type { DetectionResult } from '@/types';

export type Platform = 'linkedin' | 'indeed';

export type RemoteType = 'true_remote' | 'hybrid' | 'onsite' | 'unclear';

/**
 * Extended JobData for platform adapters
 * Includes DOM element reference and platform-specific fields
 */
export interface JobData {
  id: string;
  platform: Platform;
  url: string;
  title: string;
  company: string;
  companyNormalized: string;
  location: string;
  postDate: string | null;
  postDateParsed: Date | null;
  daysSincePosted: number | null;
  isRemote: boolean;
  remoteType: RemoteType;
  description: string;
  salary?: string;
  applicantCount?: number;
  isEasyApply?: boolean;
  isSponsored?: boolean;
  element?: Element;
}

/**
 * Platform adapter interface
 * Each supported job platform must implement this interface
 */
export interface PlatformAdapter {
  platform: Platform;

  /**
   * Extract job data from a job card element
   */
  extractJobData(card: Element): JobData | null;

  /**
   * Get all job card elements on the current page
   */
  getJobCards(): Element[];

  /**
   * Observe DOM for new job cards (infinite scroll, pagination)
   */
  observeNewJobs(callback: (cards: Element[]) => void): void;

  /**
   * Stop observing for new jobs
   */
  stopObserving(): void;

  /**
   * Apply visual badges/indicators to a job card
   */
  applyVisualIndicator(job: JobData, results: DetectionResult[]): void;

  /**
   * Hide a job card from view
   */
  hideJob(job: JobData): void;

  /**
   * Show a previously hidden job card
   */
  showJob(job: JobData): void;
}
