// Indeed platform adapter
import type { PlatformAdapter, PlatformSelectors } from './types';
import type { JobData } from '../../types';
import { normalizeCompanyName, parseRelativeDate, daysSince, generateId } from '../../lib/utils';

const selectors: PlatformSelectors = {
  jobCard: '.job_seen_beacon, .resultContent',
  jobTitle: '.jobTitle, [data-jk] a',
  company: '.companyName, [data-testid="company-name"]',
  location: '.companyLocation, [data-testid="text-location"]',
  postDate: '.date, [data-testid="myJobsStateDate"]',
  description: '.job-snippet',
  salary: '.salary-snippet, .estimated-salary',
  applicantCount: '[data-testid="urgently-hiring"]',
};

export const indeedAdapter: PlatformAdapter = {
  name: 'indeed',
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
        isSponsored: !!element.querySelector('.sponsoredJob'),
        isEasyApply: !!element.querySelector('.indeed-apply-button'),
        url,
        element,
        platform: 'indeed',
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

    const targetNode = document.querySelector('#mosaic-jobResults') || document.body;
    observer.observe(targetNode, { childList: true, subtree: true });

    return observer;
  },
};
