// Platform types
import type { JobData } from '../../types';

export interface PlatformAdapter {
  name: 'linkedin' | 'indeed';
  selectors: PlatformSelectors;
  extractJobData(element: Element): JobData | null;
  observeJobList(callback: (jobs: Element[]) => void): MutationObserver;
}

export interface PlatformSelectors {
  jobCard: string;
  jobTitle: string;
  company: string;
  location: string;
  postDate: string;
  description: string;
  salary?: string;
  applicantCount?: string;
  easyApply?: string;
  sponsored?: string;
}
