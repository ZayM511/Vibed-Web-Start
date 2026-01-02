/**
 * LinkedIn Platform Adapter
 * Extracts job data and injects UI on LinkedIn job pages
 */

// LinkedIn DOM selectors
const SELECTORS = {
  jobDetail:
    '.job-view-layout, .jobs-details, .jobs-unified-top-card, .jobs-search__job-details',
  title:
    '.job-details-jobs-unified-top-card__job-title, .jobs-unified-top-card__job-title, .t-24.t-bold',
  company:
    '.job-details-jobs-unified-top-card__company-name, .jobs-unified-top-card__company-name, .jobs-unified-top-card__company-name a',
  location:
    '.job-details-jobs-unified-top-card__bullet, .jobs-unified-top-card__bullet, .jobs-unified-top-card__workplace-type',
  posted:
    '.job-details-jobs-unified-top-card__posted-date, .jobs-unified-top-card__posted-date, .jobs-unified-top-card__posted-date span',
  applicants:
    '.jobs-unified-top-card__applicant-count, .jobs-details-top-card__bullet',
  description:
    '.jobs-description__content, .jobs-description-content__text, .jobs-box__html-content',
  easyApply:
    '.jobs-apply-button--top-card, .jobs-apply-button, button[data-control-name="jobdetails_topcard_inapply"]',
  promoted: '.job-card-container__footer-job-state, .promoted-badge',
  scoreTarget:
    '.job-details-jobs-unified-top-card__primary-description, .jobs-unified-top-card__primary-description',
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

class LinkedInAdapter {
  constructor() {
    this.observer = null;
    this.currentJobId = null;
  }

  /**
   * Extract job data from the current LinkedIn page
   */
  extractJobData() {
    try {
      const container = document.querySelector(SELECTORS.jobDetail);
      if (!container) return null;

      // Extract job ID from URL
      const urlMatch = window.location.href.match(/\/jobs\/view\/(\d+)/);
      const id = urlMatch ? urlMatch[1] : `${Date.now()}`;

      // Helper function to get text from selector
      const getText = (selector) => {
        const el = document.querySelector(selector);
        return el?.textContent?.trim() || '';
      };

      // Extract applicant count
      const applicantText = getText(SELECTORS.applicants);
      const applicantMatch = applicantText.match(/(\d+)/);

      // Check for promoted/sponsored
      const promotedEl = document.querySelector(SELECTORS.promoted);
      const isSponsored =
        !!promotedEl || document.body.innerHTML.includes('Promoted');

      return {
        id: `linkedin_${id}`,
        platform: 'linkedin',
        url: window.location.href,
        title: getText(SELECTORS.title),
        company: getText(SELECTORS.company),
        location: getText(SELECTORS.location),
        postedDate: getText(SELECTORS.posted) || null,
        description: getText(SELECTORS.description),
        applicantCount: applicantMatch ? parseInt(applicantMatch[1]) : undefined,
        isEasyApply: !!document.querySelector(SELECTORS.easyApply),
        isSponsored: isSponsored,
      };
    } catch (error) {
      console.error('[GhostDetection] LinkedIn extraction error:', error);
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
      console.warn('[GhostDetection] LinkedIn: Could not find injection target');
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
        const urlMatch = window.location.href.match(/\/jobs\/view\/(\d+)/);
        const jobId = urlMatch ? urlMatch[1] : null;

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
   * Check if current page is LinkedIn jobs
   */
  static isLinkedInJobsPage() {
    return (
      window.location.hostname.includes('linkedin.com') &&
      window.location.pathname.includes('/jobs')
    );
  }
}

// Export for use in content scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { LinkedInAdapter };
}

// Also export for ES modules
export { LinkedInAdapter };
export const linkedInAdapter = new LinkedInAdapter();
