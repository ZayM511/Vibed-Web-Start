// Content script for extracting job data from various job boards

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extractJobData') {
    const jobData = extractJobData();
    sendResponse(jobData);
  }
  return true;
});

function extractJobData() {
  const url = window.location.href;
  let jobData = {
    title: '',
    company: '',
    location: '',
    description: '',
    salary: '',
    url: url,
    extractedAt: Date.now(),
    useAIExtraction: false // Flag to indicate if AI extraction should be used
  };

  // Detect which job board we're on and use appropriate selectors
  if (url.includes('linkedin.com')) {
    jobData = extractLinkedInData();
  } else if (url.includes('indeed.com')) {
    jobData = extractIndeedData();
  } else if (url.includes('glassdoor.com')) {
    jobData = extractGlassdoorData();
  } else if (url.includes('monster.com')) {
    jobData = extractMonsterData();
  } else if (url.includes('ziprecruiter.com')) {
    jobData = extractZipRecruiterData();
  } else if (url.includes('careerbuilder.com')) {
    jobData = extractCareerBuilderData();
  }

  // Add URL to result
  jobData.url = url;

  // If extraction failed (no title or company), flag for AI extraction
  if (!jobData.title || !jobData.company) {
    console.log('DOM extraction incomplete, will use AI extraction with URL scraping');
    jobData.useAIExtraction = true;

    // Extract full page text as fallback for description
    if (!jobData.description) {
      const bodyText = document.body.innerText || document.body.textContent || '';
      jobData.description = bodyText.substring(0, 2000);
    }
  }

  return jobData;
}

function extractLinkedInData() {
  const data = {
    title: '',
    company: '',
    location: '',
    description: '',
    salary: ''
  };

  try {
    // Job title
    const titleEl = document.querySelector('.job-details-jobs-unified-top-card__job-title, .jobs-unified-top-card__job-title, h1.t-24');
    if (titleEl) data.title = titleEl.textContent.trim();

    // Company name
    const companyEl = document.querySelector('.job-details-jobs-unified-top-card__company-name, .jobs-unified-top-card__company-name, .job-details-jobs-unified-top-card__primary-description a');
    if (companyEl) data.company = companyEl.textContent.trim();

    // Location
    const locationEl = document.querySelector('.job-details-jobs-unified-top-card__bullet, .jobs-unified-top-card__bullet, .job-details-jobs-unified-top-card__primary-description span.tvm__text');
    if (locationEl) data.location = locationEl.textContent.trim();

    // Salary
    const salaryEl = document.querySelector('.job-details-jobs-unified-top-card__job-insight-text-button, .jobs-unified-top-card__job-insight');
    if (salaryEl && salaryEl.textContent.includes('$')) {
      data.salary = salaryEl.textContent.trim();
    }

    // Description
    const descEl = document.querySelector('.jobs-description__content, .jobs-box__html-content, .description__text');
    if (descEl) {
      data.description = descEl.textContent.trim().substring(0, 2000);
    }
  } catch (error) {
    console.error('Error extracting LinkedIn data:', error);
  }

  return data;
}

function extractIndeedData() {
  const data = {
    title: '',
    company: '',
    location: '',
    description: '',
    salary: ''
  };

  try {
    // Job title
    const titleEl = document.querySelector('.jobsearch-JobInfoHeader-title, h1.icl-u-xs-mb--xs');
    if (titleEl) data.title = titleEl.textContent.trim();

    // Company name
    const companyEl = document.querySelector('[data-company-name="true"], .jobsearch-InlineCompanyRating-companyHeader a, .icl-u-lg-mr--sm');
    if (companyEl) data.company = companyEl.textContent.trim();

    // Location
    const locationEl = document.querySelector('[data-testid="job-location"], .jobsearch-JobInfoHeader-subtitle div');
    if (locationEl) data.location = locationEl.textContent.trim();

    // Salary
    const salaryEl = document.querySelector('.jobsearch-JobMetadataHeader-item, #salaryInfoAndJobType span');
    if (salaryEl && salaryEl.textContent.includes('$')) {
      data.salary = salaryEl.textContent.trim();
    }

    // Description
    const descEl = document.querySelector('#jobDescriptionText, .jobsearch-jobDescriptionText');
    if (descEl) {
      data.description = descEl.textContent.trim().substring(0, 2000);
    }
  } catch (error) {
    console.error('Error extracting Indeed data:', error);
  }

  return data;
}

function extractGlassdoorData() {
  const data = {
    title: '',
    company: '',
    location: '',
    description: '',
    salary: ''
  };

  try {
    // Job title
    const titleEl = document.querySelector('[data-test="job-title"], .e1tk4kwz5');
    if (titleEl) data.title = titleEl.textContent.trim();

    // Company name
    const companyEl = document.querySelector('[data-test="employer-name"], .e1tk4kwz1');
    if (companyEl) data.company = companyEl.textContent.trim();

    // Location
    const locationEl = document.querySelector('[data-test="location"], .e1tk4kwz4');
    if (locationEl) data.location = locationEl.textContent.trim();

    // Salary
    const salaryEl = document.querySelector('[data-test="detailSalary"], .e1v3ed7e1');
    if (salaryEl) data.salary = salaryEl.textContent.trim();

    // Description
    const descEl = document.querySelector('[data-test="jobDescriptionText"], #JobDescriptionContainer');
    if (descEl) {
      data.description = descEl.textContent.trim().substring(0, 2000);
    }
  } catch (error) {
    console.error('Error extracting Glassdoor data:', error);
  }

  return data;
}

function extractMonsterData() {
  const data = {
    title: '',
    company: '',
    location: '',
    description: '',
    salary: ''
  };

  try {
    // Job title
    const titleEl = document.querySelector('.job-header-title, h1.title');
    if (titleEl) data.title = titleEl.textContent.trim();

    // Company name
    const companyEl = document.querySelector('.company-name, .job-company');
    if (companyEl) data.company = companyEl.textContent.trim();

    // Location
    const locationEl = document.querySelector('.job-header-location, .job-location');
    if (locationEl) data.location = locationEl.textContent.trim();

    // Salary
    const salaryEl = document.querySelector('.job-header-salary, .salary-info');
    if (salaryEl) data.salary = salaryEl.textContent.trim();

    // Description
    const descEl = document.querySelector('.job-description, #JobDescription');
    if (descEl) {
      data.description = descEl.textContent.trim().substring(0, 2000);
    }
  } catch (error) {
    console.error('Error extracting Monster data:', error);
  }

  return data;
}

function extractZipRecruiterData() {
  const data = {
    title: '',
    company: '',
    location: '',
    description: '',
    salary: ''
  };

  try {
    // Job title
    const titleEl = document.querySelector('.job_title, h1.job-title');
    if (titleEl) data.title = titleEl.textContent.trim();

    // Company name
    const companyEl = document.querySelector('.hiring_company_text, .company-name a');
    if (companyEl) data.company = companyEl.textContent.trim();

    // Location
    const locationEl = document.querySelector('.job_location, .location');
    if (locationEl) data.location = locationEl.textContent.trim();

    // Salary
    const salaryEl = document.querySelector('.compensation, .salary-range');
    if (salaryEl) data.salary = salaryEl.textContent.trim();

    // Description
    const descEl = document.querySelector('.jobDescriptionSection, .job-description');
    if (descEl) {
      data.description = descEl.textContent.trim().substring(0, 2000);
    }
  } catch (error) {
    console.error('Error extracting ZipRecruiter data:', error);
  }

  return data;
}

function extractCareerBuilderData() {
  const data = {
    title: '',
    company: '',
    location: '',
    description: '',
    salary: ''
  };

  try {
    // Job title
    const titleEl = document.querySelector('.data-details-title, h1.job-title');
    if (titleEl) data.title = titleEl.textContent.trim();

    // Company name
    const companyEl = document.querySelector('.data-details-company-name, .company-name');
    if (companyEl) data.company = companyEl.textContent.trim();

    // Location
    const locationEl = document.querySelector('.data-details-location, .job-location');
    if (locationEl) data.location = locationEl.textContent.trim();

    // Salary
    const salaryEl = document.querySelector('.data-details-pay, .pay-range');
    if (salaryEl) data.salary = salaryEl.textContent.trim();

    // Description
    const descEl = document.querySelector('.data-details-job-description, .job-description');
    if (descEl) {
      data.description = descEl.textContent.trim().substring(0, 2000);
    }
  } catch (error) {
    console.error('Error extracting CareerBuilder data:', error);
  }

  return data;
}

// Inject visual indicator when on supported job page
function injectIndicator() {
  if (document.querySelector('.jobfiltr-indicator')) return;

  const indicator = document.createElement('div');
  indicator.className = 'jobfiltr-indicator';
  indicator.innerHTML = `
    <div class="jobfiltr-badge">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
        <path d="M8 12L11 15L16 9" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
      <span>JobFiltr Active</span>
    </div>
  `;

  document.body.appendChild(indicator);

  // Auto-remove after 3 seconds
  setTimeout(() => {
    indicator.classList.add('fade-out');
    setTimeout(() => indicator.remove(), 300);
  }, 3000);
}

// Initialize on supported pages
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', injectIndicator);
} else {
  injectIndicator();
}
