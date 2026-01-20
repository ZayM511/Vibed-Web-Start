import type { JobData, DetectionResult, PlatformAdapter } from '@/types';

// Indeed DOM selectors
const SELECTORS = {
  jobCard: '.job_seen_beacon, .jobsearch-ResultsList > li, .result, [data-jk]',
  jobCardTitle: '.jobTitle, [data-testid="job-title"], .jcs-JobTitle',
  jobCardCompany: '.companyName, [data-testid="company-name"], .company_location .companyName',
  jobCardLocation: '.companyLocation, [data-testid="text-location"]',
  jobCardPosted: '.date, [data-testid="myJobsStateDate"], .result-footer .date',
  jobDetail: '.jobsearch-ViewJobLayout, .jobsearch-JobComponent, #jobDescriptionText',
  title: '.jobsearch-JobInfoHeader-title, [data-testid="jobsearch-JobInfoHeader-title"], .icl-u-xs-mb--xs',
  company: '[data-testid="inlineHeader-companyName"], .jobsearch-InlineCompanyRating-companyHeader, .jobsearch-CompanyInfoContainer a',
  location: '[data-testid="job-location"], .jobsearch-JobInfoHeader-subtitle, [data-testid="inlineHeader-companyLocation"]',
  posted: '.jobsearch-HiringInsights-entry--age, [data-testid="job-age"]',
  description: '#jobDescriptionText, .jobsearch-jobDescriptionText, .jobsearch-JobComponent-description',
  salary: '#salaryInfoAndJobType, .jobsearch-JobMetadataHeader-item',
  applyButton: '.jobsearch-IndeedApplyButton, #indeedApplyButton',
  // ULTRATHINK: Enhanced sponsored selectors for maximum detection accuracy
  sponsored: '.sponsoredJob, .sponsoredGray, .jobsearch-JobCard-Sponsored, .job-result-sponsored, [data-is-sponsored], [data-is-sponsored="true"], [data-testid="sponsored-label"], [data-sponsored="true"]',
  scoreTarget: '.jobsearch-JobInfoHeader-subtitle, [data-testid="jobsearch-JobInfoHeader-subtitle"]'
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

export class IndeedAdapter implements PlatformAdapter {
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

      // Get job ID from data attribute or link
      const dataJk = card.getAttribute('data-jk');
      const linkEl = card.querySelector('a[href*="jk="], a[href*="vjk="]') as HTMLAnchorElement;
      let id = dataJk;
      if (!id && linkEl) {
        const params = new URLSearchParams(linkEl.href.split('?')[1] || '');
        id = params.get('jk') || params.get('vjk');
      }
      if (!id) {
        id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      }

      // Extract from job card
      let title = getText(SELECTORS.jobCardTitle);
      let company = getText(SELECTORS.jobCardCompany);
      let location = getText(SELECTORS.jobCardLocation);
      const postedDate = getText(SELECTORS.jobCardPosted);

      // If detail panel is open, get richer data
      const detailView = document.querySelector(SELECTORS.jobDetail);
      if (detailView) {
        title = getText(SELECTORS.title, document) || title;
        company = getText(SELECTORS.company, document) || company;
        location = getText(SELECTORS.location, document) || location;
      }

      const description = getText(SELECTORS.description, document) || '';
      const salary = getText(SELECTORS.salary, document) || undefined;

      if (!title || !company) return null;

      return {
        id: `indeed_${id}`,
        title,
        company,
        location,
        description,
        postedDate: postedDate || null,
        salary,
        isRemote: /remote/i.test(location) || /remote/i.test(title)
      };
    } catch (error) {
      console.error('[JobFiltr] Indeed extraction error:', error);
      return null;
    }
  }

  hideJob(job: JobData): void {
    const id = job.id?.replace('indeed_', '');
    if (!id) return;

    const cardByJk = document.querySelector(`[data-jk="${id}"]`) as HTMLElement;
    if (cardByJk) {
      cardByJk.style.display = 'none';
      cardByJk.setAttribute('data-jobfiltr-hidden', 'true');
      return;
    }

    const cards = document.querySelectorAll(SELECTORS.jobCard);
    cards.forEach(card => {
      const linkEl = card.querySelector(`a[href*="jk=${id}"], a[href*="vjk=${id}"]`);
      if (linkEl) {
        const cardEl = card as HTMLElement;
        cardEl.style.display = 'none';
        cardEl.setAttribute('data-jobfiltr-hidden', 'true');
      }
    });
  }

  applyVisualIndicator(job: JobData, results: DetectionResult[]): void {
    const id = job.id?.replace('indeed_', '');
    if (!id) return;

    const card = document.querySelector(`[data-jk="${id}"]`) ||
      Array.from(document.querySelectorAll(SELECTORS.jobCard)).find(c =>
        c.querySelector(`a[href*="jk=${id}"], a[href*="vjk=${id}"]`)
      );

    if (card && !card.querySelector('.jobfiltr-indicator')) {
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
  }

  observeNewJobs(callback: (newCards: Element[]) => void): void {
    this.observer?.disconnect();

    let debounceTimer: ReturnType<typeof setTimeout>;

    this.observer = new MutationObserver(() => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        const newCards = this.getJobCards().filter(card => {
          const id = card.getAttribute('data-jk') ||
            (card.querySelector('a[href*="jk="]') as HTMLAnchorElement)?.href?.match(/jk=([^&]+)/)?.[1];
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

    const listContainer = document.querySelector('.jobsearch-ResultsList, #mosaic-provider-jobcards');
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

  static isIndeedJobsPage(): boolean {
    return (
      window.location.hostname.includes('indeed.') &&
      (window.location.pathname.includes('/jobs') ||
        window.location.pathname.includes('/viewjob') ||
        window.location.search.includes('vjk=') ||
        window.location.search.includes('jk='))
    );
  }
}

export const indeedAdapter = new IndeedAdapter();
