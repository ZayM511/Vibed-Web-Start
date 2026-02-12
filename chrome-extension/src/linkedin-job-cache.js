// linkedin-job-cache.js
// JobFiltr - Persistent Job Data Cache for LinkedIn
// Stores job data in chrome.storage.local for persistence across page loads
// Provides multi-tier caching: memory (fast) + storage (persistent)

(function() {
  'use strict';

  const LOG_PREFIX = '[JobFiltr Cache]';

  /**
   * LinkedInJobCache - Persistent cache for LinkedIn job data
   * Two-tier caching:
   * 1. Memory cache (Map) - fast access during session
   * 2. Chrome storage - persistence across page loads
   */
  class LinkedInJobCache {
    constructor() {
      this.STORAGE_KEY = 'linkedin_job_data_cache';
      this.TTL = 24 * 60 * 60 * 1000; // 24 hours
      this.MAX_ENTRIES = 500; // Limit cache size
      this.memoryCache = new Map();
      this.initialized = false;
      this.saveDebounceTimer = null;
      this.SAVE_DEBOUNCE_MS = 1000; // Debounce storage writes
    }

    /**
     * Initialize cache from chrome.storage
     */
    async init() {
      if (this.initialized) return true;

      try {
        const stored = await chrome.storage.local.get(this.STORAGE_KEY);
        if (stored[this.STORAGE_KEY]) {
          const entries = Object.entries(stored[this.STORAGE_KEY]);
          const now = Date.now();
          let loadedCount = 0;

          for (const [id, data] of entries) {
            // Only load non-expired entries
            if (data.cachedAt && (now - data.cachedAt < this.TTL)) {
              this.memoryCache.set(id, data);
              loadedCount++;
            }
          }

          console.log(LOG_PREFIX, `Loaded ${loadedCount} jobs from storage cache`);
        }

        this.initialized = true;
        return true;
      } catch (e) {
        console.error(LOG_PREFIX, 'Failed to init job cache:', e);
        this.initialized = true; // Continue without persistence
        return false;
      }
    }

    /**
     * Store job data in cache
     * @param {string} jobId - LinkedIn job ID
     * @param {Object} data - Job data object
     */
    async setJobData(jobId, data) {
      if (!jobId) return;

      const entry = {
        ...data,
        cachedAt: Date.now()
      };

      this.memoryCache.set(jobId, entry);

      // Enforce max entries limit
      this.enforceMaxEntries();

      // Debounced persist to storage
      this.debouncedPersist();
    }

    /**
     * Set multiple jobs at once (batch operation)
     * @param {Array} jobs - Array of job objects with id property
     */
    async setJobDataBatch(jobs) {
      if (!jobs || !Array.isArray(jobs)) return;

      const now = Date.now();
      for (const job of jobs) {
        if (job.id) {
          this.memoryCache.set(job.id, {
            ...job,
            cachedAt: now
          });
        }
      }

      this.enforceMaxEntries();
      this.debouncedPersist();
    }

    /**
     * Get job data from cache
     * @param {string} jobId - LinkedIn job ID
     * @returns {Object|null} Job data or null if not found/expired
     */
    getJobData(jobId) {
      if (!jobId) return null;

      const data = this.memoryCache.get(jobId);
      if (!data) return null;

      // Check TTL
      if (Date.now() - data.cachedAt > this.TTL) {
        this.memoryCache.delete(jobId);
        return null;
      }

      return data;
    }

    /**
     * Check if job exists in cache (and not expired)
     * @param {string} jobId - LinkedIn job ID
     * @returns {boolean}
     */
    hasJob(jobId) {
      return this.getJobData(jobId) !== null;
    }

    /**
     * Get job age in days from cached listedAt timestamp
     * @param {string} jobId - LinkedIn job ID
     * @returns {number|null} Age in days (fractional) or null
     */
    getJobAgeFromCache(jobId) {
      const data = this.getJobData(jobId);
      if (!data || !data.listedAt) return null;

      const listedDate = new Date(data.listedAt);
      if (isNaN(listedDate.getTime())) return null;

      const now = new Date();
      const daysAgo = (now - listedDate) / (1000 * 60 * 60 * 24);

      return daysAgo;
    }

    /**
     * Get company name from cached job data
     * @param {string} jobId - LinkedIn job ID
     * @returns {string|null}
     */
    getCompanyName(jobId) {
      const data = this.getJobData(jobId);
      return data?.companyName || null;
    }

    /**
     * Get job description from cache
     * @param {string} jobId - LinkedIn job ID
     * @returns {string|null}
     */
    getDescription(jobId) {
      const data = this.getJobData(jobId);
      return data?.description || null;
    }

    /**
     * Check if job is remote
     * @param {string} jobId - LinkedIn job ID
     * @returns {boolean|null}
     */
    isRemote(jobId) {
      const data = this.getJobData(jobId);
      return data?.isRemote ?? null;
    }

    /**
     * Debounced persist to storage
     */
    debouncedPersist() {
      if (this.saveDebounceTimer) {
        clearTimeout(this.saveDebounceTimer);
      }

      this.saveDebounceTimer = setTimeout(() => {
        this.persistToStorage();
      }, this.SAVE_DEBOUNCE_MS);
    }

    /**
     * Persist memory cache to chrome.storage
     */
    async persistToStorage() {
      try {
        // Clean expired entries before saving
        this.clearExpired();

        const obj = Object.fromEntries(this.memoryCache);
        await chrome.storage.local.set({ [this.STORAGE_KEY]: obj });

        console.log(LOG_PREFIX, `Persisted ${this.memoryCache.size} jobs to storage`);
      } catch (e) {
        console.error(LOG_PREFIX, 'Failed to persist job cache:', e);
      }
    }

    /**
     * Clear expired entries from memory cache
     */
    clearExpired() {
      const now = Date.now();
      let cleared = 0;

      for (const [jobId, data] of this.memoryCache.entries()) {
        if (!data.cachedAt || (now - data.cachedAt > this.TTL)) {
          this.memoryCache.delete(jobId);
          cleared++;
        }
      }

      if (cleared > 0) {
        console.log(LOG_PREFIX, `Cleared ${cleared} expired entries`);
      }
    }

    /**
     * Enforce maximum cache entries (LRU-like: remove oldest)
     */
    enforceMaxEntries() {
      if (this.memoryCache.size <= this.MAX_ENTRIES) return;

      // Sort by cachedAt, remove oldest
      const entries = Array.from(this.memoryCache.entries())
        .sort((a, b) => (a[1].cachedAt || 0) - (b[1].cachedAt || 0));

      const toRemove = entries.length - this.MAX_ENTRIES;
      for (let i = 0; i < toRemove; i++) {
        this.memoryCache.delete(entries[i][0]);
      }

      console.log(LOG_PREFIX, `Evicted ${toRemove} old entries to maintain limit`);
    }

    /**
     * Clear all cache data
     */
    async clear() {
      this.memoryCache.clear();
      try {
        await chrome.storage.local.remove(this.STORAGE_KEY);
        console.log(LOG_PREFIX, 'Cache cleared');
      } catch (e) {
        console.error(LOG_PREFIX, 'Failed to clear storage:', e);
      }
    }

    /**
     * Get cache statistics
     */
    getStats() {
      const entries = Array.from(this.memoryCache.values());
      const now = Date.now();

      let withListedAt = 0;
      let avgAge = 0;

      for (const entry of entries) {
        if (entry.listedAt) {
          withListedAt++;
          avgAge += (now - entry.listedAt) / (1000 * 60 * 60 * 24);
        }
      }

      return {
        totalEntries: this.memoryCache.size,
        entriesWithListedAt: withListedAt,
        averageJobAge: withListedAt > 0 ? avgAge / withListedAt : 0,
        initialized: this.initialized
      };
    }
  }

  // Create singleton instance
  const linkedInJobCache = new LinkedInJobCache();

  // Export globally for use in content scripts
  window.linkedInJobCache = linkedInJobCache;

  console.log(LOG_PREFIX, 'LinkedIn job cache module loaded');

  // Auto-initialize when script loads
  (async () => {
    await window.linkedInJobCache.init();
    console.log(LOG_PREFIX, 'LinkedIn job cache initialized');
  })();
})();
