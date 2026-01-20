/**
 * LinkedIn Feature Flags System
 *
 * Manages feature toggles for LinkedIn integration with auto-disable capability
 * for features that fail too frequently due to LinkedIn's changing DOM.
 *
 * Tier 1: Robust, API-based features (ON by default)
 * Tier 2: Simplified features (OFF until tested)
 * Tier 3: Unreliable features (OFF by default, manual enable only)
 */

class LinkedInFeatureFlags {
  constructor() {
    this.defaults = {
      // Tier 1: Robust, API-based (ON by default)
      enableJobAgeBadges: true,

      // Tier 2: Simplified features (OFF until tested)
      enableBenefitsBadges: false,

      // Tier 3: Unreliable (OFF by default, manual enable only)
      enableDetailedApplicantCount: false,
      enableComplexBadgePositioning: false,
      enableSalaryParsing: false,

      // Core infrastructure (Always ON)
      apiInterceptorEnabled: true,
      badgePersistenceEnabled: true
    };

    this.failureThreshold = 50; // Failures before auto-disable
    this.failureCounts = {};    // Track failures per feature
    this.flags = { ...this.defaults };
  }

  /**
   * Initialize feature flags from storage
   */
  async init() {
    try {
      const stored = await chrome.storage.local.get(['linkedinFeatureFlags', 'linkedinFeatureFailures']);

      if (stored.linkedinFeatureFlags) {
        this.flags = { ...this.defaults, ...stored.linkedinFeatureFlags };
      } else {
        this.flags = { ...this.defaults };
        // Save defaults to storage
        await chrome.storage.local.set({ linkedinFeatureFlags: this.flags });
      }

      if (stored.linkedinFeatureFailures) {
        this.failureCounts = stored.linkedinFeatureFailures;
      }

      console.log('[LinkedIn Feature Flags] Initialized:', this.flags);
    } catch (error) {
      console.error('[LinkedIn Feature Flags] Initialization error:', error);
      // Fall back to defaults on error
      this.flags = { ...this.defaults };
    }
  }

  /**
   * Check if a feature is enabled
   * @param {string} feature - Feature flag name
   * @returns {boolean}
   */
  isEnabled(feature) {
    return this.flags[feature] ?? false;
  }

  /**
   * Set a feature flag value
   * @param {string} feature - Feature flag name
   * @param {boolean} value - Enable/disable
   */
  async setFlag(feature, value) {
    try {
      this.flags[feature] = value;
      await chrome.storage.local.set({ linkedinFeatureFlags: this.flags });
      console.log(`[LinkedIn Feature Flags] ${feature} set to ${value}`);
    } catch (error) {
      console.error('[LinkedIn Feature Flags] Error setting flag:', error);
    }
  }

  /**
   * Record a failure for a feature
   * @param {string} feature - Feature flag name
   */
  async recordFailure(feature) {
    try {
      this.failureCounts[feature] = (this.failureCounts[feature] || 0) + 1;
      await chrome.storage.local.set({ linkedinFeatureFailures: this.failureCounts });

      const count = this.failureCounts[feature];
      if (count % 10 === 0) {
        console.warn(`[LinkedIn Feature Flags] ${feature} failure count: ${count}`);
      }

      // Check if we should auto-disable
      if (await this.shouldAutoDisable(feature)) {
        await this.setFlag(feature, false);
        await this.notifyAutoDisable(feature);
      }
    } catch (error) {
      console.error('[LinkedIn Feature Flags] Error recording failure:', error);
    }
  }

  /**
   * Record a success for a feature (resets failure count)
   * @param {string} feature - Feature flag name
   */
  async recordSuccess(feature) {
    try {
      const previousCount = this.failureCounts[feature] || 0;
      if (previousCount > 0) {
        this.failureCounts[feature] = 0;
        await chrome.storage.local.set({ linkedinFeatureFailures: this.failureCounts });
        console.log(`[LinkedIn Feature Flags] ${feature} failure count reset (was ${previousCount})`);
      }
    } catch (error) {
      console.error('[LinkedIn Feature Flags] Error recording success:', error);
    }
  }

  /**
   * Get failure count for a feature
   * @param {string} feature - Feature flag name
   * @returns {number}
   */
  getFailureCount(feature) {
    return this.failureCounts[feature] || 0;
  }

  /**
   * Check if a feature should be auto-disabled
   * @param {string} feature - Feature flag name
   * @returns {boolean}
   */
  async shouldAutoDisable(feature) {
    // Only auto-disable Tier 1 & 2 features, not Tier 3 (already OFF)
    if (!this.isEnabled(feature)) return false;

    const tier3Features = ['enableDetailedApplicantCount', 'enableComplexBadgePositioning', 'enableSalaryParsing'];
    if (tier3Features.includes(feature)) return false;

    return this.getFailureCount(feature) >= this.failureThreshold;
  }

  /**
   * Notify user that a feature was auto-disabled
   * @param {string} feature - Feature flag name
   */
  async notifyAutoDisable(feature) {
    try {
      const featureNames = {
        enableJobAgeBadges: 'Job Age Badges',
        enableBenefitsBadges: 'Benefits Badges',
        enableDetailedApplicantCount: 'Detailed Applicant Count',
        enableComplexBadgePositioning: 'Complex Badge Positioning',
        enableSalaryParsing: 'Salary Parsing'
      };

      const friendlyName = featureNames[feature] || feature;

      console.error(`[LinkedIn Feature Flags] Auto-disabled ${friendlyName} after ${this.failureThreshold} failures`);

      // Send message to popup/background
      chrome.runtime.sendMessage({
        type: 'FEATURE_AUTO_DISABLED',
        feature: friendlyName,
        reason: 'LinkedIn DOM changed, feature temporarily unavailable'
      }).catch(() => {
        // Ignore errors if popup not open
      });
    } catch (error) {
      console.error('[LinkedIn Feature Flags] Error notifying auto-disable:', error);
    }
  }

  /**
   * Reset all failure counts (for testing/debugging)
   */
  async resetFailureCounts() {
    try {
      this.failureCounts = {};
      await chrome.storage.local.set({ linkedinFeatureFailures: {} });
      console.log('[LinkedIn Feature Flags] All failure counts reset');
    } catch (error) {
      console.error('[LinkedIn Feature Flags] Error resetting failure counts:', error);
    }
  }

  /**
   * Reset to default flags (for testing/debugging)
   */
  async resetToDefaults() {
    try {
      this.flags = { ...this.defaults };
      await chrome.storage.local.set({ linkedinFeatureFlags: this.flags });
      await this.resetFailureCounts();
      console.log('[LinkedIn Feature Flags] Reset to defaults:', this.flags);
    } catch (error) {
      console.error('[LinkedIn Feature Flags] Error resetting to defaults:', error);
    }
  }
}

// Create global instance
window.linkedInFeatureFlags = new LinkedInFeatureFlags();

// Auto-initialize when script loads
(async () => {
  await window.linkedInFeatureFlags.init();
})();
