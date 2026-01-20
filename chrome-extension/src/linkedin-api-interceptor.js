// linkedin-api-interceptor.js
// JobFiltr - LinkedIn Voyager API Interceptor
// Intercepts fetch/XHR requests to extract structured job data before DOM rendering
// This script runs in the PAGE CONTEXT (not content script) to access network requests

(function() {
  'use strict';

  // Prevent double injection
  if (window.__jobfiltrApiInterceptorLoaded) {
    return;
  }
  window.__jobfiltrApiInterceptorLoaded = true;

  const JOB_DATA_EVENT = 'jobfiltr-linkedin-api-data';
  const LOG_PREFIX = '[JobFiltr API]';

  // Store for intercepted job data
  const interceptedJobs = new Map();

  // Debug logging (can be toggled)
  const DEBUG = false;
  function debugLog(...args) {
    if (DEBUG) {
      console.log(LOG_PREFIX, ...args);
    }
  }

  // ===== FETCH INTERCEPTION =====
  const originalFetch = window.fetch;
  window.fetch = async function(input, init) {
    const response = await originalFetch.apply(this, arguments);

    try {
      const url = typeof input === 'string' ? input : input?.url || '';

      // Check if this is a LinkedIn Voyager API call
      if (url.includes('/voyager/api/') || url.includes('linkedin.com/voyager')) {
        debugLog('Fetch intercepted:', url);

        // Clone response to read without consuming
        const clone = response.clone();

        // Process asynchronously to not block the original request
        clone.json().then(data => {
          processVoyagerResponse(url, data);
        }).catch(() => {
          // Not JSON or parse error, ignore
        });
      }
    } catch (e) {
      // Don't break original functionality on errors
      debugLog('Fetch intercept error:', e);
    }

    return response;
  };

  // ===== XHR INTERCEPTION =====
  const originalXHROpen = XMLHttpRequest.prototype.open;
  const originalXHRSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function(method, url, ...rest) {
    // Store URL for later checking
    this._jobfiltrUrl = url;
    return originalXHROpen.apply(this, [method, url, ...rest]);
  };

  XMLHttpRequest.prototype.send = function(body) {
    try {
      const url = this._jobfiltrUrl || '';

      if (url.includes('/voyager/api/') || url.includes('linkedin.com/voyager')) {
        debugLog('XHR intercepted:', url);

        this.addEventListener('load', function() {
          try {
            const data = JSON.parse(this.responseText);
            processVoyagerResponse(url, data);
          } catch (e) {
            // Not JSON or parse error, ignore
          }
        });
      }
    } catch (e) {
      debugLog('XHR intercept error:', e);
    }

    return originalXHRSend.apply(this, arguments);
  };

  // ===== VOYAGER API RESPONSE PROCESSING =====
  function processVoyagerResponse(url, data) {
    if (!data) return;

    const jobs = [];

    // LinkedIn's Voyager API typically includes entities in `included` array
    if (data.included && Array.isArray(data.included)) {
      for (const entity of data.included) {
        const job = extractJobFromEntity(entity, data.included);
        if (job) {
          jobs.push(job);
          interceptedJobs.set(job.id, job);
        }
      }
    }

    // Also check `elements` array (used in some endpoints)
    if (data.elements && Array.isArray(data.elements)) {
      for (const element of data.elements) {
        const job = extractJobFromEntity(element, data.included || []);
        if (job) {
          jobs.push(job);
          interceptedJobs.set(job.id, job);
        }
      }
    }

    // Also check data directly (some endpoints return job data directly)
    if (data.$type && data.$type.includes('Job')) {
      const job = extractJobFromEntity(data, data.included || []);
      if (job) {
        jobs.push(job);
        interceptedJobs.set(job.id, job);
      }
    }

    // Dispatch event with extracted jobs
    if (jobs.length > 0) {
      debugLog(`Extracted ${jobs.length} jobs from API response`);

      window.dispatchEvent(new CustomEvent(JOB_DATA_EVENT, {
        detail: {
          jobs: jobs,
          timestamp: Date.now(),
          url: url
        }
      }));
    }
  }

  // ===== JOB DATA EXTRACTION =====
  function extractJobFromEntity(entity, includedEntities) {
    if (!entity) return null;

    const entityType = entity.$type || entity['$type'] || '';

    // Check if this is a job-related entity
    const jobTypes = [
      'com.linkedin.voyager.jobs.JobPosting',
      'com.linkedin.voyager.jobs.Job',
      'com.linkedin.voyager.deco.jobs.web.shared.WebJobPosting',
      'com.linkedin.voyager.dash.jobs.JobPosting',
      'com.linkedin.voyager.dash.jobs.Job'
    ];

    const isJobEntity = jobTypes.some(type => entityType.includes(type)) ||
                        entityType.toLowerCase().includes('job') ||
                        (entity.title && entity.listedAt); // Duck typing fallback

    if (!isJobEntity) return null;

    // Extract job ID
    const jobId = extractJobId(entity);
    if (!jobId) return null;

    // Extract company information
    const companyInfo = extractCompanyInfo(entity, includedEntities);

    // Build job object
    const job = {
      id: jobId,
      listedAt: entity.listedAt,                                    // Unix timestamp in ms
      repostedAt: entity.repostedAt,                               // Unix timestamp if reposted
      title: entity.title || '',
      companyName: companyInfo.name,
      companyId: companyInfo.id,
      location: entity.formattedLocation ||
                entity.location?.defaultLocalizedName ||
                entity.locationName ||
                '',
      description: extractDescription(entity),
      applicantCount: entity.applicantCount,
      isRemote: entity.workRemoteAllowed ||
                (entity.workplaceTypes && entity.workplaceTypes.includes('remote')) ||
                false,
      closedAt: entity.closedAt,
      applyMethod: entity.applyMethod?.$type ||
                   entity.applyMethod?.companyApplyUrl ||
                   null,
      isEasyApply: entity.applyMethod?.$type?.includes('InAppApply') || false,
      views: entity.views,
      salary: extractSalary(entity),
      benefits: entity.benefits || [],
      employmentType: entity.employmentType,
      experienceLevel: entity.experienceLevel,
      isPromoted: entity.isSponsored || entity.isPromoted || false
    };

    debugLog('Extracted job:', job.id, job.title, 'listedAt:', job.listedAt);

    return job;
  }

  function extractJobId(entity) {
    // Try various ID extraction methods
    if (entity.jobPostingId) {
      return String(entity.jobPostingId);
    }

    if (entity.entityUrn) {
      const match = entity.entityUrn.match(/(?:jobPosting|job):(\d+)/i);
      if (match) return match[1];
    }

    if (entity.trackingUrn) {
      const match = entity.trackingUrn.match(/(?:jobPosting|job):(\d+)/i);
      if (match) return match[1];
    }

    if (entity['*jobPosting']) {
      const match = entity['*jobPosting'].match(/(\d+)/);
      if (match) return match[1];
    }

    // Try to extract from dashEntityUrn
    if (entity.dashEntityUrn) {
      const match = entity.dashEntityUrn.match(/(\d+)/);
      if (match) return match[1];
    }

    return null;
  }

  function extractCompanyInfo(job, includedEntities) {
    let name = null;
    let id = null;

    // Try direct company name
    if (job.companyDetails?.company?.name) {
      name = job.companyDetails.company.name;
      id = job.companyDetails.company.entityUrn;
    }

    // Try company from companyResolutionResult
    if (!name && job.companyResolutionResult?.name) {
      name = job.companyResolutionResult.name;
    }

    // Try companyName directly
    if (!name && job.companyName) {
      name = job.companyName;
    }

    // Look up in included entities
    if (!name && job.companyDetails?.companyUrn && includedEntities) {
      const companyUrn = job.companyDetails.companyUrn;
      for (const entity of includedEntities) {
        if (entity.entityUrn === companyUrn ||
            entity['*company'] === companyUrn) {
          name = entity.name || entity.localizedName;
          id = entity.entityUrn;
          break;
        }
      }
    }

    // Try '*company' reference
    if (!name && job['*company'] && includedEntities) {
      for (const entity of includedEntities) {
        if (entity.entityUrn === job['*company']) {
          name = entity.name || entity.localizedName;
          id = entity.entityUrn;
          break;
        }
      }
    }

    return { name, id };
  }

  function extractDescription(entity) {
    if (entity.description?.text) {
      return entity.description.text;
    }
    if (typeof entity.description === 'string') {
      return entity.description;
    }
    if (entity.descriptionText) {
      return entity.descriptionText;
    }
    return '';
  }

  function extractSalary(entity) {
    if (entity.salaryInsights) {
      return entity.salaryInsights;
    }
    if (entity.compensation) {
      return entity.compensation;
    }
    if (entity.formattedSalary) {
      return entity.formattedSalary;
    }
    return null;
  }

  // ===== UTILITY: Get job by ID (for content script queries) =====
  window.__jobfiltrGetJob = function(jobId) {
    return interceptedJobs.get(jobId) || null;
  };

  // ===== UTILITY: Get all intercepted jobs =====
  window.__jobfiltrGetAllJobs = function() {
    return Object.fromEntries(interceptedJobs);
  };

  console.log(LOG_PREFIX, 'LinkedIn API interceptor loaded successfully');
})();
