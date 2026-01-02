/**
 * Indeed Platform Adapter
 * Extracts job data and injects UI on Indeed job pages
 */

// Indeed DOM selectors
const SELECTORS = {
  jobDetail: '.jobsearch-ViewJobLayout, .jobsearch-JobComponent, #jobDescriptionText',
  title:
    '.jobsearch-JobInfoHeader-title, [data-testid="jobsearch-JobInfoHeader-title"], .icl-u-xs-mb--xs',
  company:
    '[data-testid="inlineHeader-companyName"], .jobsearch-InlineCompanyRating-companyHeader, .jobsearch-CompanyInfoContainer a',
  location:
    '[data-testid="job-location"], .jobsearch-JobInfoHeader-subtitle, [data-testid="inlineHeader-companyLocation"]',
  posted: '.jobsearch-HiringInsights-entry--age, [data-testid="job-age"]',
  description:
    '#jobDescriptionText, .jobsearch-jobDescriptionText, .jobsearch-JobComponent-description',
  salary: '#salaryInfoAndJobType, .jobsearch-JobMetadataHeader-item',
  applyButton:
    '.jobsearch-IndeedApplyButton, #indeedApplyButton, .jobsearch-IndeedApplyButton-contentWrapper',
  sponsored: '.sponsoredJob, .jobsearch-JobCard-Sponsored',
  scoreTarget:
    '.jobsearch-JobInfoHeader-subtitle, [data-testid="jobsearch-JobInfoHeader-subtitle"]',
};

// Score category colors
const COLORS = {
  safe: '#10b981',
  low_risk: '#3b82f6',
  medium_risk: '#f59e0b',
  high_risk: '#ef4444',
  likely_ghost: '#dc2626',
};

// Score category labels
const LABELS = {
  safe: 'Likely Legitimate',
  low_risk: 'Low Risk',
  medium_risk: 'Medium Risk',
  high_risk: 'High Risk',
  likely_ghost: 'Likely Ghost Job',
};

class IndeedAdapter {
  constructor() {
    this.observer = null;
    this.currentJobId = null;
  }

  /**
   * Extract job data from the current Indeed page
   */
  extractJobData() {
    try {
      const container = document.querySelector(SELECTORS.jobDetail);
      if (!container) return null;

      // Extract job ID from URL
      const params = new URLSearchParams(window.location.search);
      const id = params.get('vjk') || params.get('jk') || `${Date.now()}`;

      // Helper function to get text from selector
      const getText = (selector) => {
        const el = document.querySelector(selector);
        return el?.textContent?.trim() || '';
      };

      return {
        id: `indeed_${id}`,
        platform: 'indeed',
        url: window.location.href,
        title: getText(SELECTORS.title),
        company: getText(SELECTORS.company),
        location: getText(SELECTORS.location),
        postedDate: getText(SELECTORS.posted) || null,
        description: getText(SELECTORS.description),
        salary: getText(SELECTORS.salary) || undefined,
        isEasyApply: !!document.querySelector(SELECTORS.applyButton),
        isSponsored: !!document.querySelector(SELECTORS.sponsored),
      };
    } catch (error) {
      console.error('[GhostDetection] Indeed extraction error:', error);
      return null;
    }
  }

  /**
   * Inject ghost score UI into the page
   */
  injectScoreUI(score, category, onClick) {
    // Remove existing badge
    document.querySelector('.jobfiltr-ghost-score')?.remove();

    // Find injection target
    const target = document.querySelector(SELECTORS.scoreTarget);
    if (!target) {
      console.warn('[GhostDetection] Indeed: Could not find injection target');
      return;
    }

    const color = COLORS[category] || COLORS.medium_risk;
    const label = LABELS[category] || 'Unknown';

    // Create badge element
    const badge = document.createElement('div');
    badge.className = 'jobfiltr-ghost-score';
    badge.innerHTML = `
      <div style="
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 8px 16px;
        background: #f8fafc;
        border: 2px solid ${color};
        border-radius: 8px;
        cursor: pointer;
        margin: 12px 0;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        transition: all 0.2s ease;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      " onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'">
        <span style="
          font-size: 24px;
          font-weight: 700;
          color: ${color};
        ">${score}</span>
        <div style="display: flex; flex-direction: column; gap: 2px;">
          <span style="
            font-size: 14px;
            font-weight: 600;
            color: #334155;
          ">${label}</span>
          <span style="
            font-size: 11px;
            color: #94a3b8;
          ">Click for details</span>
        </div>
      </div>
    `;

    badge.addEventListener('click', onClick);
    target.insertAdjacentElement('afterend', badge);
  }

  /**
   * Start observing DOM for job changes
   */
  startObserving(callback) {
    // Disconnect existing observer
    this.observer?.disconnect();

    // Create new observer
    this.observer = new MutationObserver((mutations) => {
      // Check if job detail view changed
      const jobDetail = document.querySelector(SELECTORS.jobDetail);
      if (jobDetail) {
        // Extract job ID to detect changes
        const params = new URLSearchParams(window.location.search);
        const jobId = params.get('vjk') || params.get('jk');

        if (jobId && jobId !== this.currentJobId) {
          this.currentJobId = jobId;
          // Debounce the callback
          setTimeout(() => callback(), 500);
        }
      }
    });

    // Start observing
    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  /**
   * Stop observing DOM
   */
  stopObserving() {
    this.observer?.disconnect();
    this.observer = null;
  }

  /**
   * Check if current page is Indeed jobs
   */
  static isIndeedJobsPage() {
    return (
      window.location.hostname.includes('indeed.com') &&
      (window.location.pathname.includes('/jobs') ||
        window.location.pathname.includes('/viewjob') ||
        window.location.search.includes('vjk=') ||
        window.location.search.includes('jk='))
    );
  }
}

// Export for use in content scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { IndeedAdapter };
}

// Also export for ES modules
export { IndeedAdapter };
export const indeedAdapter = new IndeedAdapter();
