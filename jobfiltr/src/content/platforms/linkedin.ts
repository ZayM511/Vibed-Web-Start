// LinkedIn platform adapter
import type { PlatformAdapter, PlatformSelectors } from './types';
import type { JobData } from '../../types';
import { normalizeCompanyName, parseRelativeDate, daysSince, generateId } from '../../lib/utils';

const selectors: PlatformSelectors = {
  jobCard: '.jobs-search-results__list-item, .job-card-container',
  jobTitle: '.job-card-list__title, .job-card-container__link',
  company: '.job-card-container__primary-description, .job-card-container__company-name',
  location: '.job-card-container__metadata-item',
  postDate: '.job-card-container__listed-time, time',
  description: '.job-card-list__footer-wrapper',
  salary: '.job-card-container__salary-info',
  applicantCount: '.job-card-container__applicant-count',
  easyApply: '.job-card-container__apply-method--easy-apply',
  sponsored: '.job-card-container__footer-job-state',
};

export const linkedinAdapter: PlatformAdapter = {
  name: 'linkedin',
  selectors,

  extractJobData(element: Element): JobData | null {
    try {
      const title = element.querySelector(selectors.jobTitle)?.textContent?.trim() || '';
      const company = element.querySelector(selectors.company)?.textContent?.trim() || '';
      const location = element.querySelector(selectors.location)?.textContent?.trim() || '';
      const postDateStr = element.querySelector(selectors.postDate)?.textContent?.trim() || null;
      const postDate = parseRelativeDate(postDateStr);
      const url = element.querySelector('a')?.href || '';

      if (!title || !company) return null;

      return {
        id: generateId(),
        title,
        company,
        companyNormalized: normalizeCompanyName(company),
        location,
        postDate: postDateStr,
        daysSincePosted: daysSince(postDate),
        isRemote: /remote|work from home|wfh/i.test(location),
        remoteType: 'unclear',
        description: element.querySelector(selectors.description)?.textContent?.trim() || '',
        salary: selectors.salary ? element.querySelector(selectors.salary)?.textContent?.trim() : undefined,
        applicantCount: selectors.applicantCount ? (parseInt(element.querySelector(selectors.applicantCount)?.textContent?.replace(/\D/g, '') || '0') || undefined) : undefined,
        isSponsored: selectors.sponsored ? !!element.querySelector(selectors.sponsored)?.textContent?.includes('Promoted') : false,
        isEasyApply: selectors.easyApply ? !!element.querySelector(selectors.easyApply) : false,
        url,
        element,
        platform: 'linkedin',
      };
    } catch {
      return null;
    }
  },

  observeJobList(callback: (jobs: Element[]) => void): MutationObserver {
    const observer = new MutationObserver(() => {
      const jobs = Array.from(document.querySelectorAll(selectors.jobCard));
      if (jobs.length > 0) callback(jobs);
    });

    const targetNode = document.querySelector('.jobs-search-results-list') || document.body;
    observer.observe(targetNode, { childList: true, subtree: true });

    return observer;
  },
};
