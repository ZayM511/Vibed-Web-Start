import type { JobData, DetectionResult, PlatformAdapter } from '@/types';

// LinkedIn DOM selectors for job list view
const SELECTORS = {
  jobCard: '.jobs-search-results__list-item, .scaffold-layout__list-item, .job-card-container',
  jobCardTitle: '.job-card-list__title, .job-card-container__link, .jobs-unified-top-card__job-title',
  jobCardCompany: '.job-card-container__primary-description, .job-card-container__company-name',
  jobCardLocation: '.job-card-container__metadata-item, .job-card-container__metadata-wrapper',
  jobCardPosted: '.job-card-container__listed-time, .job-card-container__footer-item',
  jobDetail: '.job-view-layout, .jobs-details, .jobs-unified-top-card, .jobs-search__job-details',
  title: '.job-details-jobs-unified-top-card__job-title, .jobs-unified-top-card__job-title, .t-24.t-bold',
  company: '.job-details-jobs-unified-top-card__company-name, .jobs-unified-top-card__company-name, .jobs-unified-top-card__company-name a',
  location: '.job-details-jobs-unified-top-card__bullet, .jobs-unified-top-card__bullet, .jobs-unified-top-card__workplace-type',
  posted: '.job-details-jobs-unified-top-card__posted-date, .jobs-unified-top-card__posted-date, .jobs-unified-top-card__posted-date span',
  applicants: '.jobs-unified-top-card__applicant-count, .jobs-details-top-card__bullet',
  description: '.jobs-description__content, .jobs-description-content__text, .jobs-box__html-content',
  easyApply: '.jobs-apply-button--top-card, .jobs-apply-button, button[data-control-name="jobdetails_topcard_inapply"]',
  promoted: '.job-card-container__footer-job-state, .promoted-badge',
  scoreTarget: '.job-details-jobs-unified-top-card__primary-description, .jobs-unified-top-card__primary-description'
};

// Visual indicator colors
const COLORS: Record<string, string> = {
  safe: '#10b981',
  low_risk: '#3b82f6',
  medium_risk: '#f59e0b',
  high_risk: '#ef4444',
  likely_ghost: '#dc2626',
  staffing: '#9333ea',
  remote: '#06b6d4'
};

export class LinkedInAdapter implements PlatformAdapter {
  private observer: MutationObserver | null = null;
  private processedCards = new Set<string>();

  getJobCards(): Element[] {
    return Array.from(document.querySelectorAll(SELECTORS.jobCard))
      .filter(card => !card.hasAttribute('data-jobfiltr-processed'));
  }

  extractJobData(card: Element): JobData | null {
    try {
      const getText = (selector: string, parent: Element | Document = card): string => {
        const el = parent.querySelector(selector);
        return el?.textContent?.trim() || '';
      };

      // Try to get job ID from card link or data attribute
      const linkEl = card.querySelector('a[href*="/jobs/view/"]') as HTMLAnchorElement;
      const idMatch = linkEl?.href?.match(/\/jobs\/view\/(\d+)/);
      const id = idMatch ? idMatch[1] : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

      // Extract from job card
      let title = getText(SELECTORS.jobCardTitle);
      let company = getText(SELECTORS.jobCardCompany);
      let location = getText(SELECTORS.jobCardLocation);
      const postedDate = getText(SELECTORS.jobCardPosted);

      // If we have the detail view open, get richer data
      const detailView = document.querySelector(SELECTORS.jobDetail);
      if (detailView) {
        title = getText(SELECTORS.title, document) || title;
        company = getText(SELECTORS.company, document) || company;
        location = getText(SELECTORS.location, document) || location;
      }

      const description = getText(SELECTORS.description, document) || '';
      const applicantText = getText(SELECTORS.applicants, document);
      const applicantMatch = applicantText.match(/(\d+)/);

      if (!title || !company) return null;

      return {
        id: `linkedin_${id}`,
        title,
        company,
        location,
        description,
        postedDate: postedDate || null,
        isRemote: /remote/i.test(location),
        applicantCount: applicantMatch ? parseInt(applicantMatch[1]) : undefined
      };
    } catch (error) {
      console.error('[JobFiltr] LinkedIn extraction error:', error);
      return null;
    }
  }

  hideJob(job: JobData): void {
    const id = job.id?.replace('linkedin_', '');
    if (!id) return;

    const cards = document.querySelectorAll(SELECTORS.jobCard);
    cards.forEach(card => {
      const linkEl = card.querySelector(`a[href*="/jobs/view/${id}"]`);
      if (linkEl) {
        const cardEl = card as HTMLElement;
        cardEl.style.display = 'none';
        cardEl.setAttribute('data-jobfiltr-hidden', 'true');
      }
    });
  }

  applyVisualIndicator(job: JobData, results: DetectionResult[]): void {
    const id = job.id?.replace('linkedin_', '');
    if (!id) return;

    const cards = document.querySelectorAll(SELECTORS.jobCard);
    cards.forEach(card => {
      const linkEl = card.querySelector(`a[href*="/jobs/view/${id}"]`);
      if (linkEl && !card.querySelector('.jobfiltr-indicator')) {
        const topResult = results.sort((a, b) => b.confidence - a.confidence)[0];
        if (!topResult) return;

        const color = COLORS[topResult.category] || COLORS.medium_risk;
        const indicator = document.createElement('div');
        indicator.className = 'jobfiltr-indicator';
        indicator.style.cssText = `
          position: absolute;
          top: 8px;
          right: 8px;
          padding: 4px 8px;
          font-size: 11px;
          font-weight: 600;
          color: ${color};
          background: ${color}15;
          border: 1px solid ${color}40;
          border-radius: 4px;
          z-index: 100;
        `;
        indicator.textContent = topResult.message.slice(0, 30);
        indicator.title = results.map(r => `${r.category}: ${r.message}`).join('\n');

        const cardEl = card as HTMLElement;
        if (getComputedStyle(cardEl).position === 'static') {
          cardEl.style.position = 'relative';
        }
        cardEl.appendChild(indicator);
      }
    });
  }

  observeNewJobs(callback: (newCards: Element[]) => void): void {
    this.observer?.disconnect();

    let debounceTimer: ReturnType<typeof setTimeout>;

    this.observer = new MutationObserver(() => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        const newCards = this.getJobCards().filter(card => {
          const linkEl = card.querySelector('a[href*="/jobs/view/"]') as HTMLAnchorElement;
          const id = linkEl?.href?.match(/\/jobs\/view\/(\d+)/)?.[1];
          if (id && !this.processedCards.has(id)) {
            this.processedCards.add(id);
            return true;
          }
          return false;
        });

        if (newCards.length > 0) {
          callback(newCards);
        }
      }, 300);
    });

    const listContainer = document.querySelector('.jobs-search-results-list, .scaffold-layout__list-container');
    if (listContainer) {
      this.observer.observe(listContainer, { childList: true, subtree: true });
    } else {
      this.observer.observe(document.body, { childList: true, subtree: true });
    }
  }

  injectScoreUI(score: number, category: string, onClick: () => void): void {
    document.querySelector('.jobfiltr-ghost-score')?.remove();

    const target = document.querySelector(SELECTORS.scoreTarget);
    if (!target) return;

    const color = COLORS[category] || COLORS.medium_risk;
    const labels: Record<string, string> = {
      safe: 'Likely Legitimate',
      low_risk: 'Low Risk',
      medium_risk: 'Medium Risk',
      high_risk: 'High Risk',
      likely_ghost: 'Likely Ghost Job'
    };

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
      ">
        <span style="font-size: 24px; font-weight: 700; color: ${color};">${Math.round(score * 100)}</span>
        <div style="display: flex; flex-direction: column; gap: 2px;">
          <span style="font-size: 14px; font-weight: 600; color: #334155;">${labels[category] || 'Unknown'}</span>
          <span style="font-size: 11px; color: #94a3b8;">Click for details</span>
        </div>
      </div>
    `;

    badge.addEventListener('click', onClick);
    target.insertAdjacentElement('afterend', badge);
  }

  stopObserving(): void {
    this.observer?.disconnect();
    this.observer = null;
  }

  static isLinkedInJobsPage(): boolean {
    return (
      window.location.hostname.includes('linkedin.com') &&
      window.location.pathname.includes('/jobs')
    );
  }
}

export const linkedInAdapter = new LinkedInAdapter();
