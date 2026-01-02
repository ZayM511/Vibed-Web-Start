/**
 * Platform Adapters Index
 * Barrel export for all platform adapters
 */

export { LinkedInAdapter, linkedInAdapter } from './linkedin';
export { IndeedAdapter, indeedAdapter } from './indeed';
export type { PlatformAdapter, JobData, Platform, RemoteType } from './types';

import { LinkedInAdapter, linkedInAdapter } from './linkedin';
import { IndeedAdapter, indeedAdapter } from './indeed';
import type { PlatformAdapter, Platform } from './types';

/**
 * Get the appropriate adapter for the current page
 */
export function getAdapterForCurrentPage(): PlatformAdapter | null {
  if (LinkedInAdapter.isLinkedInJobsPage()) {
    return linkedInAdapter;
  }
  if (IndeedAdapter.isIndeedJobsPage()) {
    return indeedAdapter;
  }
  return null;
}

/**
 * Get adapter by platform name
 */
export function getAdapterByPlatform(platform: Platform): PlatformAdapter {
  switch (platform) {
    case 'linkedin':
      return linkedInAdapter;
    case 'indeed':
      return indeedAdapter;
    default:
      throw new Error(`Unknown platform: ${platform}`);
  }
}

/**
 * All available adapters
 */
export const adapters: Record<Platform, PlatformAdapter> = {
  linkedin: linkedInAdapter,
  indeed: indeedAdapter
};
