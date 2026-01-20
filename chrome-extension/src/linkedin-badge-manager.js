// linkedin-badge-manager.js
// JobFiltr - Badge State Management for LinkedIn
// Manages badge state persistence to prevent badges from disappearing on React re-renders
// Stores badge data in chrome.storage.local

(function() {
  'use strict';

  const LOG_PREFIX = '[JobFiltr Badge]';

  /**
   * BadgeStateManager - Centralized badge state management
   * Persists badge state to chrome.storage to survive:
   * - React re-renders
   * - DOM mutations
   * - Page scroll/pagination
   */
  class BadgeStateManager {
    constructor() {
      this.STORAGE_KEY = 'linkedin_badge_state';
      this.TTL = 24 * 60 * 60 * 1000; // 24 hours
      this.MAX_ENTRIES = 500;
      this.cache = new Map();
      this.initialized = false;
      this.saveDebounceTimer = null;
      this.SAVE_DEBOUNCE_MS = 500;
    }

    /**
     * Initialize badge state from storage
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
            if (data.timestamp && (now - data.timestamp < this.TTL)) {
              this.cache.set(id, data);
              loadedCount++;
            }
          }

          console.log(LOG_PREFIX, `Loaded ${loadedCount} badge states from storage`);
        }

        this.initialized = true;
        return true;
      } catch (e) {
        console.error(LOG_PREFIX, 'Badge state init failed:', e);
        this.initialized = true;
        return false;
      }
    }

    /**
     * Set badge data for a job
     * @param {string} jobId - LinkedIn job ID
     * @param {Object} data - Badge data (age, benefits, ghost, staffing, etc.)
     */
    async setBadgeData(jobId, data) {
      if (!jobId) return;

      const existing = this.cache.get(jobId) || {};
      const newData = {
        ...existing,
        ...data,
        timestamp: Date.now()
      };

      this.cache.set(jobId, newData);
      this.enforceMaxEntries();
      this.debouncedPersist();
    }

    /**
     * Get badge data for a job
     * @param {string} jobId - LinkedIn job ID
     * @returns {Object|null}
     */
    getBadgeData(jobId) {
      if (!jobId) return null;

      const data = this.cache.get(jobId);
      if (!data) return null;

      // Check TTL
      if (Date.now() - data.timestamp > this.TTL) {
        this.cache.delete(jobId);
        return null;
      }

      return data;
    }

    /**
     * Check if badge exists for a job
     * @param {string} jobId - LinkedIn job ID
     * @param {string} badgeType - Type of badge ('age', 'ghost', 'staffing', 'benefits')
     * @returns {boolean}
     */
    hasBadge(jobId, badgeType) {
      const data = this.getBadgeData(jobId);
      if (!data) return false;

      if (badgeType === 'age') {
        return data.age !== undefined && data.age !== null;
      }
      if (badgeType === 'ghost') {
        return data.ghostScore !== undefined;
      }
      if (badgeType === 'staffing') {
        return data.staffingScore !== undefined;
      }
      if (badgeType === 'benefits') {
        return data.benefits !== undefined && data.benefits.length > 0;
      }

      return data[badgeType] !== undefined;
    }

    /**
     * Set job age badge data
     * @param {string} jobId
     * @param {number} age - Age in days
     */
    async setAgeBadge(jobId, age) {
      await this.setBadgeData(jobId, { age });
    }

    /**
     * Set ghost score badge data
     * @param {string} jobId
     * @param {number} score - Ghost score 0-100
     * @param {string} category - Risk category
     * @param {Object} breakdown - Score breakdown
     */
    async setGhostBadge(jobId, score, category, breakdown = null) {
      await this.setBadgeData(jobId, {
        ghostScore: score,
        ghostCategory: category,
        ghostBreakdown: breakdown
      });
    }

    /**
     * Set staffing detection badge data
     * @param {string} jobId
     * @param {number} confidence - Confidence 0-1
     * @param {string} reason - Detection reason
     */
    async setStaffingBadge(jobId, confidence, reason = '') {
      await this.setBadgeData(jobId, {
        staffingScore: confidence,
        staffingReason: reason
      });
    }

    /**
     * Set benefits badge data
     * @param {string} jobId
     * @param {Array} benefits - List of detected benefits
     */
    async setBenefitsBadge(jobId, benefits) {
      await this.setBadgeData(jobId, { benefits });
    }

    /**
     * Mark badge as rendered in DOM
     * @param {string} jobId
     * @param {string} badgeType
     */
    async markRendered(jobId, badgeType) {
      const data = this.getBadgeData(jobId) || {};
      const rendered = data.rendered || {};
      rendered[badgeType] = Date.now();
      await this.setBadgeData(jobId, { rendered });
    }

    /**
     * Check if badge is currently rendered
     * @param {string} jobId
     * @param {string} badgeType
     * @returns {boolean}
     */
    isRendered(jobId, badgeType) {
      const data = this.getBadgeData(jobId);
      return data?.rendered?.[badgeType] ? true : false;
    }

    /**
     * Clear rendered status (for re-rendering after DOM change)
     * @param {string} jobId
     */
    clearRenderedStatus(jobId) {
      const data = this.getBadgeData(jobId);
      if (data) {
        delete data.rendered;
        this.cache.set(jobId, data);
      }
    }

    /**
     * Get all job IDs with cached badge data
     * @returns {Array<string>}
     */
    getAllJobIds() {
      return Array.from(this.cache.keys());
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
     * Persist to chrome.storage
     */
    async persistToStorage() {
      try {
        this.clearExpired();

        const obj = Object.fromEntries(this.cache);
        await chrome.storage.local.set({ [this.STORAGE_KEY]: obj });

        console.log(LOG_PREFIX, `Persisted ${this.cache.size} badge states`);
      } catch (e) {
        console.error(LOG_PREFIX, 'Failed to persist badge state:', e);
      }
    }

    /**
     * Clear expired entries
     */
    clearExpired() {
      const now = Date.now();
      let cleared = 0;

      for (const [jobId, data] of this.cache.entries()) {
        if (!data.timestamp || (now - data.timestamp > this.TTL)) {
          this.cache.delete(jobId);
          cleared++;
        }
      }

      if (cleared > 0) {
        console.log(LOG_PREFIX, `Cleared ${cleared} expired badge states`);
      }
    }

    /**
     * Enforce max entries limit
     */
    enforceMaxEntries() {
      if (this.cache.size <= this.MAX_ENTRIES) return;

      const entries = Array.from(this.cache.entries())
        .sort((a, b) => (a[1].timestamp || 0) - (b[1].timestamp || 0));

      const toRemove = entries.length - this.MAX_ENTRIES;
      for (let i = 0; i < toRemove; i++) {
        this.cache.delete(entries[i][0]);
      }
    }

    /**
     * Clear all badge state
     */
    async clear() {
      this.cache.clear();
      try {
        await chrome.storage.local.remove(this.STORAGE_KEY);
        console.log(LOG_PREFIX, 'Badge state cleared');
      } catch (e) {
        console.error(LOG_PREFIX, 'Failed to clear badge state:', e);
      }
    }

    /**
     * Get statistics
     */
    getStats() {
      let withAge = 0;
      let withGhost = 0;
      let withStaffing = 0;
      let withBenefits = 0;

      for (const data of this.cache.values()) {
        if (data.age !== undefined) withAge++;
        if (data.ghostScore !== undefined) withGhost++;
        if (data.staffingScore !== undefined) withStaffing++;
        if (data.benefits?.length > 0) withBenefits++;
      }

      return {
        total: this.cache.size,
        withAge,
        withGhost,
        withStaffing,
        withBenefits,
        initialized: this.initialized
      };
    }
  }

  // Create singleton instance
  const badgeStateManager = new BadgeStateManager();

  // Export globally
  window.badgeStateManager = badgeStateManager;

  console.log(LOG_PREFIX, 'Badge state manager loaded');
})();
