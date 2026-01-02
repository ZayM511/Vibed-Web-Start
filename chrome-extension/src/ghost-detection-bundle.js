/**
 * Ghost Detection Bundle
 * Self-contained ghost job detection for Chrome extension content scripts
 * This is a bundled version that doesn't require ES module imports
 */

(function () {
  'use strict';

  // ============================================
  // CONSTANTS
  // ============================================

  const SIGNAL_WEIGHTS = {
    temporal: {
      categoryWeight: 25,
      signals: { postingAge: 35, seasonalPattern: 15 },
    },
    content: {
      categoryWeight: 25,
      signals: { descriptionVagueness: 25, salaryTransparency: 20, buzzwordDensity: 15 },
    },
    company: {
      categoryWeight: 20,
      signals: { blacklistMatch: 40, companySize: 20, industryRisk: 20 },
    },
    behavioral: {
      categoryWeight: 15,
      signals: { applicationMethod: 35, sponsoredPost: 25, applicantCount: 25 },
    },
    community: { categoryWeight: 10, signals: { userReports: 50 } },
    structural: { categoryWeight: 5, signals: {} },
  };

  const SCORE_COLORS = {
    safe: '#10b981',
    low_risk: '#3b82f6',
    medium_risk: '#f59e0b',
    high_risk: '#ef4444',
    likely_ghost: '#dc2626',
  };

  const SCORE_LABELS = {
    safe: 'Likely Legitimate',
    low_risk: 'Low Risk',
    medium_risk: 'Medium Risk',
    high_risk: 'High Risk',
    likely_ghost: 'Likely Ghost Job',
  };

  const KNOWN_STAFFING_AGENCIES = [
    'robert half', 'randstad', 'kelly services', 'manpower', 'adecco',
    'aerotek', 'insight global', 'teksystems', 'apex systems', 'kforce',
    'cybercoders', 'jobot', 'motion recruitment', 'vaco', 'addison group',
    'hays', 'allegis group', 'spherion', 'volt', 'beacon hill',
  ];

  const VAGUE_INDICATORS = [
    'fast-paced', 'self-starter', 'team player', 'dynamic',
    'exciting opportunity', 'competitive salary', 'rock star', 'ninja',
    'guru', 'wear many hats', 'other duties as assigned',
  ];

  const STORAGE_KEY = 'jobfiltr_ghost_detection';
  const CACHE_KEY = `${STORAGE_KEY}_scores`;
  const CONFIG_KEY = `${STORAGE_KEY}_config`;
  const BLACKLIST_KEY = `${STORAGE_KEY}_blacklist`;

  // ============================================
  // LINKEDIN SELECTORS
  // ============================================

  const LINKEDIN_SELECTORS = {
    jobDetail: '.job-view-layout, .jobs-details, .jobs-unified-top-card, .jobs-search__job-details',
    title: '.job-details-jobs-unified-top-card__job-title, .jobs-unified-top-card__job-title, .t-24.t-bold',
    company: '.job-details-jobs-unified-top-card__company-name, .jobs-unified-top-card__company-name a',
    location: '.job-details-jobs-unified-top-card__bullet, .jobs-unified-top-card__bullet',
    posted: '.job-details-jobs-unified-top-card__posted-date, .jobs-unified-top-card__posted-date',
    applicants: '.jobs-unified-top-card__applicant-count, .jobs-details-top-card__bullet',
    description: '.jobs-description__content, .jobs-description-content__text, .jobs-box__html-content',
    easyApply: '.jobs-apply-button--top-card, .jobs-apply-button',
    promoted: '.job-card-container__footer-job-state, .promoted-badge',
    scoreTarget: '.job-details-jobs-unified-top-card__primary-description, .jobs-unified-top-card__primary-description',
  };

  // ============================================
  // INDEED SELECTORS
  // ============================================

  const INDEED_SELECTORS = {
    jobDetail: '.jobsearch-ViewJobLayout, .jobsearch-JobComponent, #jobDescriptionText',
    title: '.jobsearch-JobInfoHeader-title, [data-testid="jobsearch-JobInfoHeader-title"]',
    company: '[data-testid="inlineHeader-companyName"], .jobsearch-InlineCompanyRating-companyHeader',
    location: '[data-testid="job-location"], .jobsearch-JobInfoHeader-subtitle',
    posted: '.jobsearch-HiringInsights-entry--age, [data-testid="job-age"]',
    description: '#jobDescriptionText, .jobsearch-jobDescriptionText',
    salary: '#salaryInfoAndJobType',
    applyButton: '.jobsearch-IndeedApplyButton, #indeedApplyButton',
    sponsored: '.sponsoredJob',
    scoreTarget: '.jobsearch-JobInfoHeader-subtitle, [data-testid="jobsearch-JobInfoHeader-subtitle"]',
  };

  // ============================================
  // STATE
  // ============================================

  let initialized = false;
  let config = null;
  let currentJob = null;
  let currentScore = null;
  let currentJobId = null;
  let observer = null;

  // ============================================
  // UTILITY FUNCTIONS
  // ============================================

  function getText(selector) {
    const el = document.querySelector(selector);
    return el?.textContent?.trim() || '';
  }

  function parsePostingDays(dateString) {
    if (!dateString) return null;
    const normalized = dateString.toLowerCase().trim();

    if (/just now|moments? ago/i.test(normalized)) return 0;

    let match;
    if ((match = normalized.match(/(\d+)\s*minutes?\s*ago/i))) return 0;
    if ((match = normalized.match(/(\d+)\s*hours?\s*ago/i))) return 0;
    if ((match = normalized.match(/(\d+)\s*days?\s*ago/i))) return parseInt(match[1]);
    if ((match = normalized.match(/(\d+)\s*weeks?\s*ago/i))) return parseInt(match[1]) * 7;
    if ((match = normalized.match(/(\d+)\s*months?\s*ago/i))) return parseInt(match[1]) * 30;

    return null;
  }

  function calculateTemporalRisk(days) {
    if (days === null) return 0.5;
    if (days <= 7) return 0;
    if (days <= 30) return 0.2;
    if (days <= 60) return 0.5;
    if (days <= 90) return 0.75;
    return 1;
  }

  function calculateVagueness(text) {
    const normalized = text.toLowerCase();
    let vagueCount = 0;
    for (const indicator of VAGUE_INDICATORS) {
      if (normalized.includes(indicator)) vagueCount++;
    }
    return Math.min(1, vagueCount / 5);
  }

  function checkStaffingAgency(company) {
    const normalized = company.toLowerCase();
    for (const agency of KNOWN_STAFFING_AGENCIES) {
      if (normalized.includes(agency)) {
        return { isLikely: true, confidence: 0.95 };
      }
    }
    const indicators = ['staffing', 'recruiting', 'talent', 'solutions', 'consulting'];
    let score = 0;
    for (const ind of indicators) {
      if (normalized.includes(ind)) score += 0.2;
    }
    return { isLikely: score >= 0.4, confidence: Math.min(0.9, score) };
  }

  function getCategory(score) {
    if (score <= 20) return 'safe';
    if (score <= 40) return 'low_risk';
    if (score <= 60) return 'medium_risk';
    if (score <= 80) return 'high_risk';
    return 'likely_ghost';
  }

  // ============================================
  // STORAGE FUNCTIONS
  // ============================================

  async function loadConfig() {
    return new Promise((resolve) => {
      chrome.storage.local.get(CONFIG_KEY, (result) => {
        resolve(result[CONFIG_KEY] || {
          enabled: true,
          sensitivity: 'medium',
          showScores: true,
          autoHide: false,
          autoHideThreshold: 80,
        });
      });
    });
  }

  async function getCachedScore(jobId) {
    return new Promise((resolve) => {
      chrome.storage.local.get(CACHE_KEY, (result) => {
        const scores = result[CACHE_KEY] || {};
        const cached = scores[jobId];
        if (cached && cached.expiresAt > Date.now()) {
          resolve(cached.data);
        } else {
          resolve(null);
        }
      });
    });
  }

  async function cacheScore(jobId, score) {
    return new Promise((resolve) => {
      chrome.storage.local.get(CACHE_KEY, (result) => {
        const scores = result[CACHE_KEY] || {};
        scores[jobId] = {
          data: score,
          expiresAt: Date.now() + 60 * 60 * 1000,
        };
        chrome.storage.local.set({ [CACHE_KEY]: scores }, resolve);
      });
    });
  }

  async function checkBlacklist(company) {
    return new Promise((resolve) => {
      chrome.storage.local.get(BLACKLIST_KEY, (result) => {
        const cached = result[BLACKLIST_KEY];
        if (!cached || cached.expiresAt < Date.now()) {
          resolve(null);
          return;
        }
        const normalized = company.toLowerCase().replace(/[^a-z0-9]/g, '');
        const entry = cached.data?.find((e) => normalized.includes(e.normalizedName));
        resolve(entry || null);
      });
    });
  }

  // ============================================
  // SIGNAL ANALYSIS
  // ============================================

  function analyzeTemporalSignals(job) {
    const signals = [];
    const weights = SIGNAL_WEIGHTS.temporal.signals;

    const days = parsePostingDays(job.postedDate);
    const ageRisk = calculateTemporalRisk(days);

    signals.push({
      id: 'posting_age',
      category: 'temporal',
      name: 'Posting Age',
      weight: weights.postingAge,
      value: days ?? -1,
      normalizedValue: ageRisk,
      confidence: days !== null ? 0.9 : 0.5,
      description: days !== null ? `Posted ${days} days ago` : 'Unknown posting date',
    });

    const month = new Date().getMonth() + 1;
    const isPeakPeriod = [1, 2, 11, 12].includes(month);

    signals.push({
      id: 'seasonal',
      category: 'temporal',
      name: 'Seasonal Risk',
      weight: weights.seasonalPattern,
      value: isPeakPeriod ? 1 : 0,
      normalizedValue: isPeakPeriod ? 0.3 : 0,
      confidence: 0.6,
      description: isPeakPeriod ? 'Peak ghost job period (Q1/Q4)' : 'Normal period',
    });

    return signals;
  }

  function analyzeContentSignals(job) {
    const signals = [];
    const weights = SIGNAL_WEIGHTS.content.signals;

    const vagueness = calculateVagueness(job.description);
    signals.push({
      id: 'vagueness',
      category: 'content',
      name: 'Description Quality',
      weight: weights.descriptionVagueness,
      value: vagueness,
      normalizedValue: vagueness,
      confidence: 0.8,
      description: vagueness > 0.6 ? 'Vague and generic' : vagueness > 0.3 ? 'Some vague elements' : 'Specific and detailed',
    });

    const hasSalary = /\$[\d,]+/.test(job.description) || !!job.salary;
    const isVagueSalary = /competitive|DOE|negotiable/i.test(job.description);
    const salaryRisk = !hasSalary ? 0.6 : isVagueSalary ? 0.4 : 0;

    signals.push({
      id: 'salary',
      category: 'content',
      name: 'Salary Transparency',
      weight: weights.salaryTransparency,
      value: salaryRisk,
      normalizedValue: salaryRisk,
      confidence: 0.7,
      description: salaryRisk > 0.5 ? 'No salary info' : salaryRisk > 0 ? 'Vague salary' : 'Salary provided',
    });

    return signals;
  }

  async function analyzeCompanySignals(job) {
    const signals = [];
    const weights = SIGNAL_WEIGHTS.company.signals;

    const blacklistEntry = await checkBlacklist(job.company);
    signals.push({
      id: 'blacklist',
      category: 'company',
      name: 'Blacklist Check',
      weight: weights.blacklistMatch,
      value: blacklistEntry?.reportCount || 0,
      normalizedValue: blacklistEntry ? Math.min(1, blacklistEntry.confidence) : 0,
      confidence: blacklistEntry ? blacklistEntry.confidence : 0.9,
      description: blacklistEntry ? `On ${blacklistEntry.source} blacklist` : 'Not on blacklists',
    });

    const staffing = checkStaffingAgency(job.company);
    signals.push({
      id: 'staffing',
      category: 'company',
      name: 'Staffing Agency',
      weight: weights.companySize,
      value: staffing.confidence,
      normalizedValue: staffing.isLikely ? staffing.confidence : 0,
      confidence: staffing.isLikely ? 0.85 : 0.7,
      description: staffing.isLikely ? 'Likely staffing agency' : 'Not a staffing agency',
    });

    return signals;
  }

  function analyzeBehavioralSignals(job) {
    const signals = [];
    const weights = SIGNAL_WEIGHTS.behavioral.signals;

    signals.push({
      id: 'apply_method',
      category: 'behavioral',
      name: 'Application Method',
      weight: weights.applicationMethod,
      value: job.isEasyApply ? 0 : 1,
      normalizedValue: job.isEasyApply ? 0 : 0.2,
      confidence: 0.6,
      description: job.isEasyApply ? 'Easy Apply available' : 'External application',
    });

    if (job.isSponsored !== undefined) {
      signals.push({
        id: 'sponsored',
        category: 'behavioral',
        name: 'Sponsored Post',
        weight: weights.sponsoredPost,
        value: job.isSponsored ? 1 : 0,
        normalizedValue: job.isSponsored ? 0.2 : 0,
        confidence: 0.9,
        description: job.isSponsored ? 'Sponsored/promoted' : 'Organic posting',
      });
    }

    if (job.applicantCount !== undefined) {
      const risk = job.applicantCount > 500 ? 0.5 : job.applicantCount > 200 ? 0.3 : 0;
      signals.push({
        id: 'applicants',
        category: 'behavioral',
        name: 'Applicant Volume',
        weight: weights.applicantCount,
        value: job.applicantCount,
        normalizedValue: risk,
        confidence: 0.7,
        description: `${job.applicantCount} applicants`,
      });
    }

    return signals;
  }

  function calculateBreakdown(signals) {
    const categories = ['temporal', 'content', 'company', 'behavioral', 'community', 'structural'];
    const breakdown = {};

    for (const cat of categories) {
      const catSignals = signals.filter((s) => s.category === cat);
      if (!catSignals.length) {
        breakdown[cat] = 0;
        continue;
      }

      let sum = 0;
      let totalWeight = 0;
      for (const s of catSignals) {
        sum += s.normalizedValue * s.weight * s.confidence;
        totalWeight += s.weight;
      }

      breakdown[cat] = totalWeight > 0 ? (sum / totalWeight) * 100 : 0;
    }

    return breakdown;
  }

  function calculateOverall(breakdown) {
    const w = SIGNAL_WEIGHTS;
    const score =
      (breakdown.temporal || 0) * (w.temporal.categoryWeight / 100) +
      (breakdown.content || 0) * (w.content.categoryWeight / 100) +
      (breakdown.company || 0) * (w.company.categoryWeight / 100) +
      (breakdown.behavioral || 0) * (w.behavioral.categoryWeight / 100) +
      (breakdown.community || 0) * (w.community.categoryWeight / 100) +
      (breakdown.structural || 0) * (w.structural.categoryWeight / 100);

    return Math.round(Math.min(100, Math.max(0, score)));
  }

  // ============================================
  // CORE ANALYSIS
  // ============================================

  async function analyzeJob(job) {
    const cached = await getCachedScore(job.id);
    if (cached) {
      console.log('[GhostDetection] Using cached score');
      return cached;
    }

    const signals = [];
    signals.push(...analyzeTemporalSignals(job));
    signals.push(...analyzeContentSignals(job));
    signals.push(...(await analyzeCompanySignals(job)));
    signals.push(...analyzeBehavioralSignals(job));

    const breakdown = calculateBreakdown(signals);
    const overall = calculateOverall(breakdown);
    const category = getCategory(overall);
    const confidence = signals.length > 0
      ? signals.reduce((sum, s) => sum + s.confidence, 0) / signals.length
      : 0.5;

    const score = { overall, confidence, category, signals, breakdown, timestamp: Date.now() };
    await cacheScore(job.id, score);

    return score;
  }

  // ============================================
  // UI INJECTION
  // ============================================

  function injectScoreUI(score, category, scoreTarget, onClick) {
    document.querySelector('.jobfiltr-ghost-score')?.remove();

    const target = document.querySelector(scoreTarget);
    if (!target) {
      console.warn('[GhostDetection] Could not find injection target');
      return;
    }

    const color = SCORE_COLORS[category] || SCORE_COLORS.medium_risk;
    const label = SCORE_LABELS[category] || 'Unknown';

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
        <span style="font-size: 24px; font-weight: 700; color: ${color};">${score}</span>
        <div style="display: flex; flex-direction: column; gap: 2px;">
          <span style="font-size: 14px; font-weight: 600; color: #334155;">${label}</span>
          <span style="font-size: 11px; color: #94a3b8;">Click for details</span>
        </div>
      </div>
    `;

    badge.addEventListener('click', onClick);
    target.insertAdjacentElement('afterend', badge);
  }

  function showDetails() {
    if (!currentJob || !currentScore) return;

    console.log('[GhostDetection] Score details:', currentScore);

    const getColor = (cat) => SCORE_COLORS[cat] || SCORE_COLORS.medium_risk;
    const getLabel = (cat) => SCORE_LABELS[cat] || 'Unknown';

    const modal = document.createElement('div');
    modal.className = 'jobfiltr-modal';
    modal.innerHTML = `
      <div style="
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.5);
        display: flex; align-items: center; justify-content: center;
        z-index: 99999;
      " onclick="this.parentElement.remove()">
        <div style="
          background: white; border-radius: 12px; padding: 24px;
          max-width: 500px; width: 90%; max-height: 80vh; overflow-y: auto;
          box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);
        " onclick="event.stopPropagation()">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
            <h2 style="margin: 0; font-size: 20px; color: #1e293b;">Ghost Job Analysis</h2>
            <button onclick="this.closest('.jobfiltr-modal').remove()" style="
              background: none; border: none; font-size: 24px; cursor: pointer; color: #94a3b8;
            ">&times;</button>
          </div>

          <div style="text-align: center; padding: 16px; background: #f8fafc; border-radius: 8px; margin-bottom: 16px;">
            <div style="font-size: 48px; font-weight: 700; color: ${getColor(currentScore.category)};">
              ${currentScore.overall}
            </div>
            <div style="font-size: 16px; color: #64748b;">${getLabel(currentScore.category)}</div>
            <div style="font-size: 12px; color: #94a3b8; margin-top: 4px;">
              Confidence: ${Math.round(currentScore.confidence * 100)}%
            </div>
          </div>

          <h3 style="font-size: 14px; color: #64748b; margin: 16px 0 8px;">Score Breakdown</h3>
          ${Object.entries(currentScore.breakdown)
            .filter(([_, value]) => value > 0)
            .map(([category, value]) => `
              <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
                <span style="text-transform: capitalize; color: #334155;">${category}</span>
                <span style="font-weight: 600; color: ${value > 50 ? '#ef4444' : value > 25 ? '#f59e0b' : '#10b981'};">
                  ${Math.round(value)}%
                </span>
              </div>
            `).join('')}

          <h3 style="font-size: 14px; color: #64748b; margin: 16px 0 8px;">Detection Signals</h3>
          ${currentScore.signals
            .filter((s) => s.normalizedValue > 0.1)
            .slice(0, 5)
            .map((s) => `
              <div style="padding: 8px; background: #f8fafc; border-radius: 6px; margin-bottom: 8px;">
                <div style="display: flex; justify-content: space-between;">
                  <span style="font-weight: 500; color: #334155;">${s.name}</span>
                  <span style="font-size: 12px; color: #64748b;">${Math.round(s.normalizedValue * 100)}%</span>
                </div>
                <div style="font-size: 12px; color: #64748b;">${s.description}</div>
              </div>
            `).join('')}

          <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #e2e8f0; text-align: center;">
            <span style="font-size: 12px; color: #94a3b8;">Powered by JobFiltr Ghost Detection</span>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
  }

  // ============================================
  // PLATFORM DETECTION
  // ============================================

  function isLinkedIn() {
    return window.location.hostname.includes('linkedin.com') &&
           window.location.pathname.includes('/jobs');
  }

  function isIndeed() {
    return window.location.hostname.includes('indeed.com') &&
           (window.location.pathname.includes('/jobs') ||
            window.location.pathname.includes('/viewjob') ||
            window.location.search.includes('vjk='));
  }

  function extractLinkedInJob() {
    try {
      const container = document.querySelector(LINKEDIN_SELECTORS.jobDetail);
      if (!container) return null;

      const urlMatch = window.location.href.match(/\/jobs\/view\/(\d+)/);
      const id = urlMatch ? urlMatch[1] : `${Date.now()}`;

      const applicantText = getText(LINKEDIN_SELECTORS.applicants);
      const applicantMatch = applicantText.match(/(\d+)/);

      return {
        id: `linkedin_${id}`,
        platform: 'linkedin',
        url: window.location.href,
        title: getText(LINKEDIN_SELECTORS.title),
        company: getText(LINKEDIN_SELECTORS.company),
        location: getText(LINKEDIN_SELECTORS.location),
        postedDate: getText(LINKEDIN_SELECTORS.posted) || null,
        description: getText(LINKEDIN_SELECTORS.description),
        applicantCount: applicantMatch ? parseInt(applicantMatch[1]) : undefined,
        isEasyApply: !!document.querySelector(LINKEDIN_SELECTORS.easyApply),
        isSponsored: !!document.querySelector(LINKEDIN_SELECTORS.promoted) ||
                     document.body.innerHTML.includes('Promoted'),
      };
    } catch (e) {
      console.error('[GhostDetection] LinkedIn extraction error:', e);
      return null;
    }
  }

  function extractIndeedJob() {
    try {
      const container = document.querySelector(INDEED_SELECTORS.jobDetail);
      if (!container) return null;

      const params = new URLSearchParams(window.location.search);
      const id = params.get('vjk') || params.get('jk') || `${Date.now()}`;

      return {
        id: `indeed_${id}`,
        platform: 'indeed',
        url: window.location.href,
        title: getText(INDEED_SELECTORS.title),
        company: getText(INDEED_SELECTORS.company),
        location: getText(INDEED_SELECTORS.location),
        postedDate: getText(INDEED_SELECTORS.posted) || null,
        description: getText(INDEED_SELECTORS.description),
        salary: getText(INDEED_SELECTORS.salary) || undefined,
        isEasyApply: !!document.querySelector(INDEED_SELECTORS.applyButton),
        isSponsored: !!document.querySelector(INDEED_SELECTORS.sponsored),
      };
    } catch (e) {
      console.error('[GhostDetection] Indeed extraction error:', e);
      return null;
    }
  }

  // ============================================
  // ANALYSIS HANDLERS
  // ============================================

  async function analyzeLinkedIn() {
    if (!config?.enabled) return;

    const job = extractLinkedInJob();
    if (!job || job.id === currentJob?.id) return;

    currentJob = job;
    console.log('[GhostDetection] Analyzing LinkedIn job:', job.title, '@', job.company);

    try {
      const score = await analyzeJob(job);
      currentScore = score;

      console.log(`[GhostDetection] Score: ${score.overall} (${score.category})`);

      if (config.showScores) {
        injectScoreUI(score.overall, score.category, LINKEDIN_SELECTORS.scoreTarget, showDetails);
      }
    } catch (e) {
      console.error('[GhostDetection] LinkedIn analysis error:', e);
    }
  }

  async function analyzeIndeed() {
    if (!config?.enabled) return;

    const job = extractIndeedJob();
    if (!job || job.id === currentJob?.id) return;

    currentJob = job;
    console.log('[GhostDetection] Analyzing Indeed job:', job.title, '@', job.company);

    try {
      const score = await analyzeJob(job);
      currentScore = score;

      console.log(`[GhostDetection] Score: ${score.overall} (${score.category})`);

      if (config.showScores) {
        injectScoreUI(score.overall, score.category, INDEED_SELECTORS.scoreTarget, showDetails);
      }
    } catch (e) {
      console.error('[GhostDetection] Indeed analysis error:', e);
    }
  }

  // ============================================
  // OBSERVERS
  // ============================================

  function startObserving() {
    if (observer) observer.disconnect();

    observer = new MutationObserver(() => {
      if (isLinkedIn()) {
        const urlMatch = window.location.href.match(/\/jobs\/view\/(\d+)/);
        const jobId = urlMatch ? urlMatch[1] : null;
        if (jobId && jobId !== currentJobId) {
          currentJobId = jobId;
          setTimeout(analyzeLinkedIn, 500);
        }
      } else if (isIndeed()) {
        const params = new URLSearchParams(window.location.search);
        const jobId = params.get('vjk') || params.get('jk');
        if (jobId && jobId !== currentJobId) {
          currentJobId = jobId;
          setTimeout(analyzeIndeed, 500);
        }
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  // ============================================
  // INITIALIZATION
  // ============================================

  async function initialize() {
    if (initialized) return;

    console.log('[GhostDetection] Initializing...');

    config = await loadConfig();

    if (!config.enabled) {
      console.log('[GhostDetection] Detection disabled');
      return;
    }

    if (isLinkedIn()) {
      console.log('[GhostDetection] LinkedIn detected');
      setTimeout(analyzeLinkedIn, 1000);
      startObserving();
    } else if (isIndeed()) {
      console.log('[GhostDetection] Indeed detected');
      setTimeout(analyzeIndeed, 1000);
      startObserving();
    }

    initialized = true;
    console.log('[GhostDetection] Initialized successfully');
  }

  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }

  // Handle SPA navigation
  let lastUrl = window.location.href;
  setInterval(() => {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;
      currentJob = null;
      currentScore = null;
      currentJobId = null;
      if (isLinkedIn() || isIndeed()) {
        setTimeout(() => {
          if (isLinkedIn()) analyzeLinkedIn();
          else if (isIndeed()) analyzeIndeed();
        }, 500);
      }
    }
  }, 1000);

})();
