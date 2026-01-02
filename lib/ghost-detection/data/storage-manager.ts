/**
 * Storage Manager
 * Handles local storage and caching for ghost detection data
 */

// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="../types/chrome.d.ts" />

import type {
  BlacklistEntry,
  DetectionConfig,
  UserReport,
  GhostJobScore,
  CacheEntry,
} from '../core/types';
import { CACHE_CONFIG } from '../core/constants';

// Storage keys
const KEYS = {
  blacklist: `${CACHE_CONFIG.storageKey}_blacklist`,
  config: `${CACHE_CONFIG.storageKey}_config`,
  scores: `${CACHE_CONFIG.storageKey}_scores`,
  reports: `${CACHE_CONFIG.storageKey}_reports`,
  version: `${CACHE_CONFIG.storageKey}_version`,
} as const;

// Default configuration
const DEFAULT_CONFIG: DetectionConfig = {
  enabled: true,
  sensitivity: 'medium',
  showScores: true,
  autoHide: false,
  autoHideThreshold: 80,
  syncInterval: 24,
};

class StorageManager {
  private cache = new Map<string, unknown>();
  private initialized = false;

  /**
   * Initialize storage manager
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    const storedVersion = await this.get<string>(KEYS.version);
    if (storedVersion !== CACHE_CONFIG.version) {
      // Version mismatch - could trigger migration if needed
      await this.set(KEYS.version, CACHE_CONFIG.version);
    }

    await this.preloadBlacklist();
    this.initialized = true;
  }

  /**
   * Get value from storage
   */
  async get<T>(key: string): Promise<T | null> {
    // Check in-memory cache first
    if (this.cache.has(key)) {
      return this.cache.get(key) as T;
    }

    try {
      // Check if running in Chrome extension context
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        const result = await chrome.storage.local.get(key);
        return (result[key] as T) ?? null;
      }

      // Fallback to localStorage for web context
      const item = localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : null;
    } catch {
      return null;
    }
  }

  /**
   * Set value in storage
   */
  async set<T>(key: string, value: T): Promise<boolean> {
    try {
      // Update in-memory cache
      this.cache.set(key, value);

      // Check if running in Chrome extension context
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        await chrome.storage.local.set({ [key]: value });
      } else {
        // Fallback to localStorage
        localStorage.setItem(key, JSON.stringify(value));
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Remove value from storage
   */
  async remove(key: string): Promise<boolean> {
    try {
      this.cache.delete(key);

      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        await chrome.storage.local.remove(key);
      } else {
        localStorage.removeItem(key);
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get cached blacklist if not expired
   */
  async getBlacklist(): Promise<CacheEntry<BlacklistEntry[]> | null> {
    const cached = await this.get<CacheEntry<BlacklistEntry[]>>(KEYS.blacklist);

    if (cached && cached.expiresAt > Date.now()) {
      return cached;
    }

    return null;
  }

  /**
   * Save blacklist to storage
   */
  async saveBlacklist(entries: BlacklistEntry[]): Promise<void> {
    const data: CacheEntry<BlacklistEntry[]> = {
      data: entries,
      expiresAt: Date.now() + CACHE_CONFIG.blacklistTTL,
    };

    await this.set(KEYS.blacklist, data);

    // Create lookup map for fast access
    const lookup = new Map(entries.map((e) => [e.normalizedName, e]));
    this.cache.set('blacklist_lookup', lookup);
  }

  /**
   * Quick lookup for company in blacklist
   */
  lookupCompany(normalizedName: string): BlacklistEntry | undefined {
    const lookup = this.cache.get('blacklist_lookup') as
      | Map<string, BlacklistEntry>
      | undefined;
    return lookup?.get(normalizedName);
  }

  /**
   * Preload blacklist into memory
   */
  private async preloadBlacklist(): Promise<void> {
    const cached = await this.getBlacklist();
    if (cached) {
      const lookup = new Map(cached.data.map((e) => [e.normalizedName, e]));
      this.cache.set('blacklist_lookup', lookup);
    }
  }

  /**
   * Get cached score for a job
   */
  async getCachedScore(jobId: string): Promise<GhostJobScore | null> {
    const scores =
      (await this.get<Record<string, CacheEntry<GhostJobScore>>>(
        KEYS.scores
      )) || {};
    const cached = scores[jobId];

    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    return null;
  }

  /**
   * Cache a score for a job
   */
  async cacheScore(jobId: string, score: GhostJobScore): Promise<void> {
    const scores =
      (await this.get<Record<string, CacheEntry<GhostJobScore>>>(
        KEYS.scores
      )) || {};

    // Enforce max cache size
    const keys = Object.keys(scores);
    if (keys.length >= CACHE_CONFIG.maxCacheSize) {
      // Remove oldest entries
      const sorted = keys.sort(
        (a, b) => scores[a].expiresAt - scores[b].expiresAt
      );
      const toRemove = sorted.slice(0, Math.floor(CACHE_CONFIG.maxCacheSize / 4));
      for (const key of toRemove) {
        delete scores[key];
      }
    }

    scores[jobId] = {
      data: score,
      expiresAt: Date.now() + CACHE_CONFIG.scoreCacheTTL,
    };

    await this.set(KEYS.scores, scores);
  }

  /**
   * Save user report
   */
  async saveUserReport(report: UserReport): Promise<void> {
    const reports = (await this.get<UserReport[]>(KEYS.reports)) || [];
    reports.push(report);

    // Keep last 1000 reports
    if (reports.length > 1000) {
      reports.splice(0, reports.length - 1000);
    }

    await this.set(KEYS.reports, reports);
  }

  /**
   * Get reports for a specific company
   */
  async getReportsForCompany(company: string): Promise<UserReport[]> {
    const reports = (await this.get<UserReport[]>(KEYS.reports)) || [];
    const normalized = company.toLowerCase();
    return reports.filter((r) => r.company.toLowerCase().includes(normalized));
  }

  /**
   * Get all user reports
   */
  async getAllReports(): Promise<UserReport[]> {
    return (await this.get<UserReport[]>(KEYS.reports)) || [];
  }

  /**
   * Get detection configuration
   */
  async getConfig(): Promise<DetectionConfig> {
    const config = await this.get<DetectionConfig>(KEYS.config);
    return config || { ...DEFAULT_CONFIG };
  }

  /**
   * Update detection configuration
   */
  async updateConfig(updates: Partial<DetectionConfig>): Promise<void> {
    const current = await this.getConfig();
    await this.set(KEYS.config, { ...current, ...updates });
  }

  /**
   * Clear all cached data
   */
  async clearCache(): Promise<void> {
    this.cache.clear();
    await this.remove(KEYS.scores);
  }

  /**
   * Clear all stored data
   */
  async clearAll(): Promise<void> {
    this.cache.clear();
    for (const key of Object.values(KEYS)) {
      await this.remove(key);
    }
  }
}

// Export singleton instance
export const storageManager = new StorageManager();
