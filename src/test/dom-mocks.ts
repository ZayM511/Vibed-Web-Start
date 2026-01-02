// ═══════════════════════════════════════════════════════════════════════════
// LINKEDIN DOM MOCKS
// ═══════════════════════════════════════════════════════════════════════════

export interface MockJobCardData {
  title: string;
  company: string;
  location: string;
  posted?: string;
  id?: string;
}

export function createLinkedInJobCard(job: MockJobCardData): HTMLElement {
  const id = job.id || `${Math.random().toString(36).substr(2, 9)}`;
  const card = document.createElement('div');
  card.className = 'jobs-search-results__list-item scaffold-layout__list-item';
  card.setAttribute('data-job-id', id);

  card.innerHTML = `
    <div class="job-card-container">
      <a href="https://www.linkedin.com/jobs/view/${id}" class="job-card-container__link">
        <span class="job-card-list__title">${job.title}</span>
      </a>
      <div class="job-card-container__primary-description">${job.company}</div>
      <div class="job-card-container__metadata-wrapper">
        <span class="job-card-container__metadata-item">${job.location}</span>
      </div>
      <time class="job-card-container__listed-time">${job.posted || '2 days ago'}</time>
    </div>
  `;

  return card;
}

export function createLinkedInDetailView(job: MockJobCardData & { description?: string }): HTMLElement {
  const detail = document.createElement('div');
  detail.className = 'job-view-layout jobs-details';

  detail.innerHTML = `
    <div class="jobs-unified-top-card">
      <h1 class="jobs-unified-top-card__job-title">${job.title}</h1>
      <div class="jobs-unified-top-card__company-name">${job.company}</div>
      <span class="jobs-unified-top-card__bullet">${job.location}</span>
      <span class="jobs-unified-top-card__posted-date">${job.posted || '2 days ago'}</span>
      <div class="jobs-unified-top-card__primary-description">Job Info</div>
    </div>
    <div class="jobs-description__content">
      <div class="jobs-description-content__text">${job.description || 'Job description here...'}</div>
    </div>
  `;

  return detail;
}

// ═══════════════════════════════════════════════════════════════════════════
// INDEED DOM MOCKS
// ═══════════════════════════════════════════════════════════════════════════

export function createIndeedJobCard(job: MockJobCardData): HTMLElement {
  const id = job.id || `${Math.random().toString(36).substr(2, 9)}`;
  const card = document.createElement('div');
  card.className = 'job_seen_beacon';
  card.setAttribute('data-jk', id);

  card.innerHTML = `
    <h2 class="jobTitle">
      <a href="https://www.indeed.com/viewjob?jk=${id}">${job.title}</a>
    </h2>
    <span class="companyName">${job.company}</span>
    <div class="companyLocation">${job.location}</div>
    <span class="date">${job.posted || '2 days ago'}</span>
  `;

  return card;
}

export function createIndeedDetailView(job: MockJobCardData & { description?: string; salary?: string }): HTMLElement {
  const detail = document.createElement('div');
  detail.className = 'jobsearch-ViewJobLayout';

  detail.innerHTML = `
    <div class="jobsearch-JobInfoHeader">
      <h1 class="jobsearch-JobInfoHeader-title">${job.title}</h1>
      <div class="jobsearch-InlineCompanyRating-companyHeader">${job.company}</div>
      <div class="jobsearch-JobInfoHeader-subtitle">${job.location}</div>
    </div>
    ${job.salary ? `<div id="salaryInfoAndJobType">${job.salary}</div>` : ''}
    <div id="jobDescriptionText" class="jobsearch-jobDescriptionText">${job.description || 'Job description here...'}</div>
  `;

  return detail;
}

// ═══════════════════════════════════════════════════════════════════════════
// JOB LIST CONTAINER
// ═══════════════════════════════════════════════════════════════════════════

export function createJobListContainer(platform: 'linkedin' | 'indeed', jobs: MockJobCardData[]): HTMLElement {
  const container = document.createElement('div');

  if (platform === 'linkedin') {
    container.id = 'jobs-list';
    container.className = 'jobs-search-results-list scaffold-layout__list-container';
    jobs.forEach(job => {
      container.appendChild(createLinkedInJobCard(job));
    });
  } else {
    container.id = 'mosaic-provider-jobcards';
    container.className = 'jobsearch-ResultsList';
    jobs.forEach(job => {
      container.appendChild(createIndeedJobCard(job));
    });
  }

  return container;
}

// ═══════════════════════════════════════════════════════════════════════════
// MOCK LOCATION
// ═══════════════════════════════════════════════════════════════════════════

export function mockLocation(hostname: string, pathname: string, search: string = ''): void {
  Object.defineProperty(window, 'location', {
    value: {
      hostname,
      pathname,
      search,
      href: `https://${hostname}${pathname}${search}`,
      origin: `https://${hostname}`,
    },
    writable: true,
    configurable: true,
  });
}

export function mockLinkedInJobsPage(): void {
  mockLocation('www.linkedin.com', '/jobs/search');
}

export function mockIndeedJobsPage(): void {
  mockLocation('www.indeed.com', '/jobs');
}

// ═══════════════════════════════════════════════════════════════════════════
// DOM CLEANUP
// ═══════════════════════════════════════════════════════════════════════════

export function cleanupDOM(): void {
  document.body.innerHTML = '';
}
