/**
 * Centralized Error Logger for JobFiltr Chrome Extension
 *
 * This module captures errors, warnings, and debugging information
 * and sends them to Convex for real-time monitoring.
 */

const ERROR_LOGGER_VERSION = '1.0.0';
const MAX_CONSOLE_LOGS = 50; // Keep last 50 console messages
const CONVEX_URL = 'https://reminiscent-goldfish-690.convex.cloud';

class ErrorLogger {
  constructor(platform) {
    this.platform = platform; // 'linkedin', 'indeed', or 'google'
    this.consoleLogs = [];
    this.isEnabled = true;
    this.userId = null;
    this.extensionVersion = '2.0.0'; // From manifest

    this.setupErrorHandlers();
    this.interceptConsole();
    this.getUserId();
  }

  /**
   * Get user ID from Chrome storage if available
   */
  async getUserId() {
    try {
      const result = await chrome.storage.sync.get(['userId']);
      if (result.userId) {
        this.userId = result.userId;
      }
    } catch (error) {
      console.warn('Could not get user ID for error logging:', error);
    }
  }

  /**
   * Set up global error handlers
   */
  setupErrorHandlers() {
    // Catch uncaught errors
    window.addEventListener('error', (event) => {
      this.logError({
        message: event.message,
        stack: event.error?.stack,
        errorType: event.error?.name || 'Error',
        url: window.location.href,
      });
    });

    // Catch unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.logError({
        message: `Unhandled Promise Rejection: ${event.reason}`,
        stack: event.reason?.stack,
        errorType: 'UnhandledRejection',
        url: window.location.href,
      });
    });
  }

  /**
   * Intercept console methods to capture logs
   */
  interceptConsole() {
    const methods = ['log', 'warn', 'error', 'info'];

    methods.forEach(method => {
      const original = console[method];
      console[method] = (...args) => {
        // Store in our buffer
        this.addConsoleLog(method, args.map(arg => {
          try {
            return typeof arg === 'object' ? JSON.stringify(arg) : String(arg);
          } catch {
            return String(arg);
          }
        }).join(' '));

        // Call original method
        original.apply(console, args);
      };
    });
  }

  /**
   * Add a console log to the buffer
   */
  addConsoleLog(level, message) {
    this.consoleLogs.push({
      level,
      message,
      timestamp: Date.now(),
    });

    // Keep only last N logs
    if (this.consoleLogs.length > MAX_CONSOLE_LOGS) {
      this.consoleLogs.shift();
    }
  }

  /**
   * Extract job context from the current page
   */
  extractJobContext() {
    try {
      if (this.platform === 'linkedin') {
        // Try to get job details from the page
        const titleEl = document.querySelector('.job-details-jobs-unified-top-card__job-title, .jobs-unified-top-card__job-title');
        const companyEl = document.querySelector('.job-details-jobs-unified-top-card__company-name, .jobs-unified-top-card__company-name');
        const jobIdMatch = window.location.href.match(/currentJobId=(\d+)/);

        return {
          jobTitle: titleEl?.textContent?.trim(),
          company: companyEl?.textContent?.trim(),
          jobId: jobIdMatch?.[1],
        };
      } else if (this.platform === 'indeed') {
        const titleEl = document.querySelector('.jobsearch-JobInfoHeader-title');
        const companyEl = document.querySelector('[data-company-name="true"]');
        const jobIdMatch = window.location.href.match(/jk=([a-f0-9]+)/);

        return {
          jobTitle: titleEl?.textContent?.trim(),
          company: companyEl?.textContent?.trim(),
          jobId: jobIdMatch?.[1],
        };
      }
    } catch (error) {
      console.warn('Error extracting job context:', error);
    }

    return undefined;
  }

  /**
   * Capture DOM snapshot of relevant elements
   */
  captureDOMSnapshot() {
    try {
      const snapshot = {
        activeElement: document.activeElement?.tagName + (document.activeElement?.className ? '.' + document.activeElement.className : ''),
      };

      // Platform-specific snapshots
      if (this.platform === 'linkedin') {
        const detailPanel = document.querySelector('.jobs-details__main-content');
        if (detailPanel) {
          snapshot.detailPanelHTML = detailPanel.innerHTML.substring(0, 5000); // Limit size
        }
      } else if (this.platform === 'indeed') {
        const jobDetails = document.querySelector('#jobDescriptionText');
        if (jobDetails) {
          snapshot.relevantHTML = jobDetails.innerHTML.substring(0, 5000);
        }
      }

      return snapshot;
    } catch (error) {
      console.warn('Error capturing DOM snapshot:', error);
      return undefined;
    }
  }

  /**
   * Log an error to Convex
   */
  async logError(errorData) {
    if (!this.isEnabled) return;

    try {
      const payload = {
        message: errorData.message || 'Unknown error',
        stack: errorData.stack,
        errorType: errorData.errorType || 'Error',
        platform: this.platform,
        url: errorData.url || window.location.href,
        userAgent: navigator.userAgent,
        userId: this.userId,
        jobContext: this.extractJobContext(),
        domSnapshot: this.captureDOMSnapshot(),
        consoleLogs: [...this.consoleLogs], // Copy array
        extensionVersion: this.extensionVersion,
      };

      // Send to Convex via background script
      chrome.runtime.sendMessage({
        action: 'logError',
        data: payload
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.warn('Error sending error log:', chrome.runtime.lastError);
        } else if (response?.success) {
          console.log('Error logged successfully:', response.errorId);
        }
      });
    } catch (error) {
      console.error('Failed to log error to Convex:', error);
    }
  }

  /**
   * Manually log an error with custom message
   */
  log(message, context = {}) {
    const error = new Error(message);
    this.logError({
      message,
      stack: error.stack,
      errorType: context.type || 'CustomError',
      url: window.location.href,
      ...context
    });
  }

  /**
   * Wrap a function to catch errors
   */
  wrap(fn, name) {
    return async (...args) => {
      try {
        return await fn(...args);
      } catch (error) {
        this.logError({
          message: `Error in ${name}: ${error.message}`,
          stack: error.stack,
          errorType: error.name,
          url: window.location.href,
        });
        throw error; // Re-throw to maintain normal error flow
      }
    };
  }

  /**
   * Enable or disable error logging
   */
  setEnabled(enabled) {
    this.isEnabled = enabled;
  }
}

// Export a singleton instance
window.errorLogger = null;

/**
 * Initialize the error logger for a specific platform
 */
function initErrorLogger(platform) {
  if (!window.errorLogger) {
    window.errorLogger = new ErrorLogger(platform);
    console.log(`Error logger initialized for ${platform}`);
  }
  return window.errorLogger;
}

// Auto-detect platform and initialize
(function autoInit() {
  const hostname = window.location.hostname;
  let platform;

  if (hostname.includes('linkedin.com')) {
    platform = 'linkedin';
  } else if (hostname.includes('indeed.com')) {
    platform = 'indeed';
  } else if (hostname.includes('google.com')) {
    platform = 'google';
  }

  if (platform) {
    initErrorLogger(platform);
  }
})();
