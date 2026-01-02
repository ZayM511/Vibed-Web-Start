/**
 * Blacklist Sync Service
 * Fetches and merges ghost job blacklists from various sources
 */

import type { BlacklistEntry } from '../core/types';
import { DATA_SOURCES } from '../core/constants';
import { storageManager } from './storage-manager';
import { normalizeCompanyName } from '../utils/text-analysis';

class BlacklistSyncService {
  private syncing = false;
  private lastSyncTime = 0;

  /**
   * Sync blacklist data from all sources
   */
  async sync(force = false): Promise<{ success: boolean; count: number }> {
    // Prevent concurrent syncs
    if (this.syncing) {
      return { success: false, count: 0 };
    }

    // Check if we have valid cached data
    if (!force) {
      const cached = await storageManager.getBlacklist();
      if (cached) {
        return { success: true, count: cached.data.length };
      }
    }

    this.syncing = true;

    try {
      // Fetch from all sources in parallel
      const [reddit, community] = await Promise.allSettled([
        this.fetchRedditList(),
        this.fetchCommunityList(),
      ]);

      // Merge results
      const redditEntries =
        reddit.status === 'fulfilled' ? reddit.value : [];
      const communityEntries =
        community.status === 'fulfilled' ? community.value : [];

      const merged = this.mergeBlacklists(redditEntries, communityEntries);

      // Save to storage
      await storageManager.saveBlacklist(merged);

      this.lastSyncTime = Date.now();

      console.log(`[GhostDetection] Synced ${merged.length} blacklist entries`);

      return { success: true, count: merged.length };
    } catch (error) {
      console.error('[GhostDetection] Blacklist sync failed:', error);
      return { success: false, count: 0 };
    } finally {
      this.syncing = false;
    }
  }

  /**
   * Fetch Reddit ghost jobs list
   */
  private async fetchRedditList(): Promise<BlacklistEntry[]> {
    try {
      // Try primary source (Google Sheets CSV)
      const response = await fetch(DATA_SOURCES.redditGhostList.primary, {
        method: 'GET',
        headers: { Accept: 'text/csv' },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const csv = await response.text();
      return this.parseCSV(csv);
    } catch {
      // Try fallback source
      try {
        const response = await fetch(DATA_SOURCES.redditGhostList.fallback);
        const data = await response.json();

        return data.map((d: Record<string, unknown>) => ({
          company: String(d.company || ''),
          normalizedName: normalizeCompanyName(String(d.company || '')),
          source: 'reddit' as const,
          reportCount: Number(d.reportCount) || 1,
          lastReported: Date.now(),
          reasons: Array.isArray(d.reasons)
            ? d.reasons
            : ['Community reported'],
          confidence: 0.7,
          verifiedGhost: false,
        }));
      } catch {
        return [];
      }
    }
  }

  /**
   * Parse CSV data into blacklist entries
   */
  private parseCSV(csv: string): BlacklistEntry[] {
    const lines = csv.split('\n').filter((l) => l.trim());

    // Skip header row
    return lines.slice(1).map((line) => {
      // Handle quoted CSV fields
      const fields = this.parseCSVLine(line);
      const [company = '', count = '1', reason = ''] = fields;

      return {
        company: company.trim(),
        normalizedName: normalizeCompanyName(company),
        source: 'reddit' as const,
        reportCount: parseInt(count) || 1,
        lastReported: Date.now(),
        reasons: reason ? [reason.trim()] : ['Community reported'],
        confidence: 0.7,
        verifiedGhost: false,
      };
    }).filter((e) => e.company.length > 0);
  }

  /**
   * Parse a single CSV line handling quoted fields
   */
  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    result.push(current.trim());
    return result;
  }

  /**
   * Fetch community blacklist
   */
  private async fetchCommunityList(): Promise<BlacklistEntry[]> {
    try {
      const response = await fetch(DATA_SOURCES.communityBlacklist.endpoint);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      return data.map((d: Record<string, unknown>) => ({
        company: String(d.company || ''),
        normalizedName: normalizeCompanyName(String(d.company || '')),
        source: 'community' as const,
        reportCount: Number(d.reportCount) || 1,
        lastReported: Date.now(),
        reasons: Array.isArray(d.reasons) ? d.reasons : [],
        confidence: Number(d.confidence) || 0.6,
        verifiedGhost: Boolean(d.verified),
      }));
    } catch {
      return [];
    }
  }

  /**
   * Merge multiple blacklists, combining duplicate entries
   */
  private mergeBlacklists(...lists: BlacklistEntry[][]): BlacklistEntry[] {
    const map = new Map<string, BlacklistEntry>();

    for (const list of lists) {
      for (const entry of list) {
        const existing = map.get(entry.normalizedName);

        if (existing) {
          // Merge entries
          existing.reportCount += entry.reportCount;
          existing.reasons = Array.from(
            new Set([...existing.reasons, ...entry.reasons])
          );
          existing.confidence = Math.max(existing.confidence, entry.confidence);
          existing.verifiedGhost =
            existing.verifiedGhost || entry.verifiedGhost;
          existing.lastReported = Math.max(
            existing.lastReported,
            entry.lastReported
          );
        } else {
          map.set(entry.normalizedName, { ...entry });
        }
      }
    }

    return Array.from(map.values());
  }

  /**
   * Get last sync time
   */
  getLastSyncTime(): number {
    return this.lastSyncTime;
  }

  /**
   * Check if sync is in progress
   */
  isSyncing(): boolean {
    return this.syncing;
  }
}

// Export singleton instance
export const blacklistSyncService = new BlacklistSyncService();
