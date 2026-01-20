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
  // ULTRATHINK: Enhanced sponsored selectors for maximum detection accuracy
  sponsored: '.sponsoredJob, .sponsoredGray, .jobsearch-JobCard-Sponsored, .job-result-sponsored, [data-is-sponsored], [data-is-sponsored="true"], [data-testid="sponsored-label"], [data-sponsored="true"]',
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
   * Updated to match Job Age Display badge size and enable side-by-side positioning
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

    // Get or create the badges container for side-by-side layout
    let container = document.querySelector('.jobfiltr-badges-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'jobfiltr-badges-container';
      container.style.cssText = `
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        align-items: flex-start;
        margin: 12px 0;
        outline: none;
        box-shadow: none;
      `;
      target.insertAdjacentElement('afterend', container);
    }

    // Create badge element with styling matched to Job Age Display badge
    const badge = document.createElement('div');
    badge.className = 'jobfiltr-ghost-score';
    badge.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="font-size: 18px;">👻</span>
        <div>
          <div style="font-weight: 700; font-size: 14px;">Ghost Risk: ${score}%</div>
          <div style="font-size: 11px; opacity: 0.8;">${label} - Click for details</div>
        </div>
      </div>
    `;

    // Apply styling to match Job Age Display badge exactly
    badge.style.cssText = `
      background: linear-gradient(135deg, ${color}15 0%, ${color}25 100%);
      color: ${color};
      padding: 12px 16px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 700;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      border: 1px solid ${color}30;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: fit-content;
      cursor: pointer;
      transition: all 0.2s ease;
      outline: none;
    `;

    badge.addEventListener('mouseenter', () => {
      badge.style.transform = 'scale(1.02)';
      badge.style.outline = 'none';
      badge.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
    });
    badge.addEventListener('mouseleave', () => {
      badge.style.transform = 'scale(1)';
      badge.style.outline = 'none';
      badge.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
    });
    badge.addEventListener('focus', () => {
      badge.style.outline = 'none';
    });
    badge.addEventListener('click', onClick);

    // Insert at the beginning of the container (Ghost badge first, Age badge second)
    container.insertBefore(badge, container.firstChild);
  }

  /**
   * Inject community-reported company warning badge
   * Shows a prominent orange warning when a company has been reported for spam/ghost jobs
   *
   * @param {Object} reportResult - The detection result from reportedCompanyDetector
   * @param {Function} onClick - Click handler to show details modal
   */
  injectReportedCompanyBadge(reportResult, onClick) {
    // Remove existing badge if present
    document.querySelector('.jobfiltr-reported-company-badge')?.remove();

    if (!reportResult || !reportResult.detected) {
      return;
    }

    // Find injection target
    const target = document.querySelector(SELECTORS.scoreTarget);
    if (!target) {
      console.warn('[JobFiltr] Indeed: Could not find injection target for reported company badge');
      return;
    }

    // Warning color - prominent orange/amber
    const warningColor = '#f97316';

    // Get or create the badges container for side-by-side layout
    let container = document.querySelector('.jobfiltr-badges-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'jobfiltr-badges-container';
      container.style.cssText = `
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        align-items: flex-start;
        margin: 12px 0;
        outline: none;
        box-shadow: none;
      `;
      target.insertAdjacentElement('afterend', container);
    }

    // Create warning badge element
    const badge = document.createElement('div');
    badge.className = 'jobfiltr-reported-company-badge';
    badge.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="font-size: 18px;">⚠️</span>
        <div>
          <div style="font-weight: 700; font-size: 14px;">Community Reported</div>
          <div style="font-size: 11px; opacity: 0.9;">Proceed with Caution - Click for details</div>
        </div>
      </div>
    `;

    // Apply prominent warning styling
    badge.style.cssText = `
      background: linear-gradient(135deg, ${warningColor}20 0%, ${warningColor}35 100%);
      color: ${warningColor};
      padding: 12px 16px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 700;
      box-shadow: 0 2px 12px rgba(249, 115, 22, 0.25);
      border: 2px solid ${warningColor}60;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: fit-content;
      cursor: pointer;
      transition: all 0.2s ease;
      outline: none;
    `;

    // Hover effects
    badge.addEventListener('mouseenter', () => {
      badge.style.transform = 'scale(1.02)';
      badge.style.boxShadow = '0 4px 16px rgba(249, 115, 22, 0.35)';
    });
    badge.addEventListener('mouseleave', () => {
      badge.style.transform = 'scale(1)';
      badge.style.boxShadow = '0 2px 12px rgba(249, 115, 22, 0.25)';
    });
    badge.addEventListener('focus', () => {
      badge.style.outline = 'none';
    });
    badge.addEventListener('click', () => {
      if (onClick) onClick(reportResult);
    });

    // Insert at the VERY BEGINNING of the container (warning badge first, before all others)
    container.insertBefore(badge, container.firstChild);

    console.log(`[JobFiltr] Reported company badge injected for: ${reportResult.company?.name}`);
  }

  /**
   * Show modal with reported company details
   * @param {Object} reportResult - The detection result
   */
  showReportedCompanyModal(reportResult) {
    // Remove existing modal if present
    document.querySelector('.jobfiltr-reported-modal')?.remove();

    if (!reportResult || !reportResult.company) {
      return;
    }

    const company = reportResult.company;
    const warningColor = '#f97316';

    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.className = 'jobfiltr-reported-modal';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.6);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;

    // Create modal content
    const modal = document.createElement('div');
    modal.style.cssText = `
      background: white;
      border-radius: 16px;
      padding: 24px;
      max-width: 480px;
      width: 90%;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      position: relative;
    `;

    modal.innerHTML = `
      <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
        <span style="font-size: 32px;">⚠️</span>
        <h2 style="margin: 0; font-size: 20px; font-weight: 700; color: ${warningColor};">
          Community Reported Company
        </h2>
      </div>

      <div style="background: ${warningColor}10; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
        <div style="font-size: 16px; font-weight: 600; color: #1f2937; margin-bottom: 8px;">
          ${company.name}
        </div>
        <div style="font-size: 14px; color: #4b5563; line-height: 1.5;">
          Users have reported that <strong>${company.name}</strong> frequently posts jobs that may be spam, ghost jobs, or have questionable hiring practices. Proceed with caution.
        </div>
      </div>

      <div style="font-size: 12px; color: #6b7280; margin-bottom: 20px;">
        <strong>Category:</strong> ${company.category === 'spam' ? 'Spam Jobs' : company.category === 'scam' ? 'Potential Scam' : 'Ghost Jobs'}<br>
        <strong>Source:</strong> Community reports as of January 2026<br>
        <strong>Match confidence:</strong> ${Math.round(reportResult.confidence * 100)}%
      </div>

      <button class="jobfiltr-modal-close" style="
        background: ${warningColor};
        color: white;
        border: none;
        border-radius: 8px;
        padding: 12px 24px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        width: 100%;
        transition: background 0.2s;
      ">
        I Understand - Close
      </button>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // Close handlers
    const closeModal = () => overlay.remove();

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal();
    });

    modal.querySelector('.jobfiltr-modal-close').addEventListener('click', closeModal);

    // Close on Escape key
    const escHandler = (e) => {
      if (e.key === 'Escape') {
        closeModal();
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);
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
