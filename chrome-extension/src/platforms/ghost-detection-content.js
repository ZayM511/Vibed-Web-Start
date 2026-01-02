/**
 * Ghost Detection Content Script
 * Main entry point for ghost detection in the Chrome extension
 * Runs on LinkedIn and Indeed job pages
 */

import { LinkedInAdapter, linkedInAdapter } from './linkedin-adapter.js';
import { IndeedAdapter, indeedAdapter } from './indeed-adapter.js';

// Detection state
let initialized = false;
let config = null;
let currentJob = null;
let currentScore = null;

// Storage keys
const STORAGE_KEY = 'jobfiltr_ghost_detection';
const CACHE_KEY = `${STORAGE_KEY}_scores`;
const CONFIG_KEY = `${STORAGE_KEY}_config`;
const BLACKLIST_KEY = `${STORAGE_KEY}_blacklist`;

/**
 * Initialize the ghost detection system
 */
async function initialize() {
  if (initialized) return;

  console.log('[GhostDetection] Initializing content script...');

  // Load config
  config = await loadConfig();

  if (!config.enabled) {
    console.log('[GhostDetection] Detection disabled in config');
    return;
  }

  // Start platform-specific detection
  startDetection();

  initialized = true;
  console.log('[GhostDetection] Content script initialized');
}

/**
 * Load configuration from storage
 */
async function loadConfig() {
  return new Promise((resolve) => {
    chrome.storage.local.get(CONFIG_KEY, (result) => {
      resolve(
        result[CONFIG_KEY] || {
          enabled: true,
          sensitivity: 'medium',
          showScores: true,
          autoHide: false,
          autoHideThreshold: 80,
          syncInterval: 24,
        }
      );
    });
  });
}

/**
 * Start detection based on current platform
 */
function startDetection() {
  if (LinkedInAdapter.isLinkedInJobsPage()) {
    console.log('[GhostDetection] LinkedIn detected');
    analyzeLinkedIn();
    linkedInAdapter.startObserving(() => {
      setTimeout(() => analyzeLinkedIn(), 500);
    });
  } else if (IndeedAdapter.isIndeedJobsPage()) {
    console.log('[GhostDetection] Indeed detected');
    analyzeIndeed();
    indeedAdapter.startObserving(() => {
      setTimeout(() => analyzeIndeed(), 500);
    });
  }
}

/**
 * Analyze job on LinkedIn
 */
async function analyzeLinkedIn() {
  if (!config?.enabled) return;

  const job = linkedInAdapter.extractJobData();
  if (!job || job.id === currentJob?.id) return;

  currentJob = job;
  console.log('[GhostDetection] Analyzing LinkedIn job:', job.title);

  try {
    const score = await analyzeJob(job);
    currentScore = score;

    if (config.showScores) {
      linkedInAdapter.injectScoreUI(score.overall, score.category, () =>
        showDetails()
      );
    }

    if (config.autoHide && score.overall >= config.autoHideThreshold) {
      console.log('[GhostDetection] Auto-hiding high-risk job');
      // TODO: Implement auto-hide functionality
    }
  } catch (error) {
    console.error('[GhostDetection] LinkedIn analysis error:', error);
  }
}

/**
 * Analyze job on Indeed
 */
async function analyzeIndeed() {
  if (!config?.enabled) return;

  const job = indeedAdapter.extractJobData();
  if (!job || job.id === currentJob?.id) return;

  currentJob = job;
  console.log('[GhostDetection] Analyzing Indeed job:', job.title);

  try {
    const score = await analyzeJob(job);
    currentScore = score;

    if (config.showScores) {
      indeedAdapter.injectScoreUI(score.overall, score.category, () =>
        showDetails()
      );
    }

    if (config.autoHide && score.overall >= config.autoHideThreshold) {
      console.log('[GhostDetection] Auto-hiding high-risk job');
      // TODO: Implement auto-hide functionality
    }
  } catch (error) {
    console.error('[GhostDetection] Indeed analysis error:', error);
  }
}

/**
 * Core job analysis function
 */
async function analyzeJob(job) {
  // Check cache first
  const cached = await getCachedScore(job.id);
  if (cached) {
    console.log('[GhostDetection] Using cached score');
    return cached;
  }

  // Analyze job
  const signals = [];

  // Temporal signals
  signals.push(...analyzeTemporalSignals(job));

  // Content signals
  signals.push(...analyzeContentSignals(job));

  // Company signals
  signals.push(...(await analyzeCompanySignals(job)));

  // Behavioral signals
  signals.push(...analyzeBehavioralSignals(job));

  // Calculate breakdown
  const breakdown = calculateBreakdown(signals);

  // Calculate overall score
  const overall = calculateOverall(breakdown);

  // Get category
  const category = getCategory(overall);

  // Calculate confidence
  const confidence =
    signals.length > 0
      ? signals.reduce((sum, s) => sum + s.confidence, 0) / signals.length
      : 0.5;

  const score = {
    overall,
    confidence,
    category,
    signals,
    breakdown,
    timestamp: Date.now(),
  };

  // Cache the score
  await cacheScore(job.id, score);

  return score;
}

// Signal weights
const SIGNAL_WEIGHTS = {
  temporal: { categoryWeight: 25, signals: { postingAge: 35, seasonalPattern: 15 } },
  content: { categoryWeight: 25, signals: { descriptionVagueness: 25, salaryTransparency: 20, buzzwordDensity: 15 } },
  company: { categoryWeight: 20, signals: { blacklistMatch: 40, companySize: 20, industryRisk: 20 } },
  behavioral: { categoryWeight: 15, signals: { applicationMethod: 35, sponsoredPost: 25, applicantCount: 25 } },
  community: { categoryWeight: 10, signals: { userReports: 50 } },
  structural: { categoryWeight: 5, signals: {} },
};

/**
 * Analyze temporal signals
 */
function analyzeTemporalSignals(job) {
  const signals = [];
  const weights = SIGNAL_WEIGHTS.temporal.signals;

  // Parse posting date
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

  // Seasonal pattern
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

/**
 * Parse days from posting date string
 */
function parsePostingDays(dateString) {
  if (!dateString) return null;

  const normalized = dateString.toLowerCase().trim();

  const patterns = [
    [/just now|moments? ago/i, 0],
    [/(\d+)\s*minutes?\s*ago/i, 0],
    [/(\d+)\s*hours?\s*ago/i, 0],
    [/(\d+)\s*days?\s*ago/i, (m) => parseInt(m[1])],
    [/(\d+)\s*weeks?\s*ago/i, (m) => parseInt(m[1]) * 7],
    [/(\d+)\s*months?\s*ago/i, (m) => parseInt(m[1]) * 30],
  ];

  for (const [pattern, calc] of patterns) {
    const match = normalized.match(pattern);
    if (match) {
      return typeof calc === 'function' ? calc(match) : calc;
    }
  }

  return null;
}

/**
 * Calculate temporal risk score
 */
function calculateTemporalRisk(days) {
  if (days === null) return 0.5;
  if (days <= 7) return 0;
  if (days <= 30) return 0.2;
  if (days <= 60) return 0.5;
  if (days <= 90) return 0.75;
  return 1;
}

/**
 * Analyze content signals
 */
function analyzeContentSignals(job) {
  const signals = [];
  const weights = SIGNAL_WEIGHTS.content.signals;

  // Description vagueness
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

  // Salary transparency
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

/**
 * Calculate vagueness score
 */
function calculateVagueness(text) {
  const vagueIndicators = [
    'fast-paced', 'self-starter', 'team player', 'dynamic',
    'exciting opportunity', 'competitive salary', 'rock star', 'ninja',
  ];

  const normalized = text.toLowerCase();
  const words = normalized.split(/\s+/).length;

  let vagueCount = 0;
  for (const indicator of vagueIndicators) {
    if (normalized.includes(indicator)) vagueCount++;
  }

  return Math.min(1, vagueCount / 5);
}

/**
 * Analyze company signals
 */
async function analyzeCompanySignals(job) {
  const signals = [];
  const weights = SIGNAL_WEIGHTS.company.signals;

  // Check blacklist
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

  // Check staffing agency
  const isStaffing = checkStaffingAgency(job.company);
  signals.push({
    id: 'staffing',
    category: 'company',
    name: 'Staffing Agency',
    weight: weights.companySize,
    value: isStaffing.confidence,
    normalizedValue: isStaffing.isLikely ? isStaffing.confidence : 0,
    confidence: isStaffing.isLikely ? 0.85 : 0.7,
    description: isStaffing.isLikely ? 'Appears to be staffing agency' : 'Not a staffing agency',
  });

  return signals;
}

/**
 * Check company against blacklist
 */
async function checkBlacklist(company) {
  return new Promise((resolve) => {
    chrome.storage.local.get(BLACKLIST_KEY, (result) => {
      const cached = result[BLACKLIST_KEY];
      if (!cached || cached.expiresAt < Date.now()) {
        resolve(null);
        return;
      }

      const normalized = company.toLowerCase().replace(/[^a-z0-9]/g, '');
      const entry = cached.data.find((e) => normalized.includes(e.normalizedName));
      resolve(entry || null);
    });
  });
}

/**
 * Check if company is a staffing agency
 */
function checkStaffingAgency(company) {
  const knownAgencies = [
    'robert half', 'randstad', 'kelly services', 'manpower', 'adecco',
    'aerotek', 'insight global', 'teksystems', 'apex systems', 'kforce',
    'cybercoders', 'jobot', 'motion recruitment',
  ];

  const normalized = company.toLowerCase();

  for (const agency of knownAgencies) {
    if (normalized.includes(agency)) {
      return { isLikely: true, confidence: 0.95 };
    }
  }

  const indicators = ['staffing', 'recruiting', 'talent', 'solutions'];
  let score = 0;
  for (const ind of indicators) {
    if (normalized.includes(ind)) score += 0.25;
  }

  return { isLikely: score >= 0.5, confidence: score };
}

/**
 * Analyze behavioral signals
 */
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

/**
 * Calculate breakdown by category
 */
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

/**
 * Calculate overall score from breakdown
 */
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

/**
 * Get score category
 */
function getCategory(score) {
  if (score <= 20) return 'safe';
  if (score <= 40) return 'low_risk';
  if (score <= 60) return 'medium_risk';
  if (score <= 80) return 'high_risk';
  return 'likely_ghost';
}

/**
 * Get cached score
 */
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

/**
 * Cache a score
 */
async function cacheScore(jobId, score) {
  return new Promise((resolve) => {
    chrome.storage.local.get(CACHE_KEY, (result) => {
      const scores = result[CACHE_KEY] || {};
      scores[jobId] = {
        data: score,
        expiresAt: Date.now() + 60 * 60 * 1000, // 1 hour
      };
      chrome.storage.local.set({ [CACHE_KEY]: scores }, resolve);
    });
  });
}

/**
 * Show score details
 */
function showDetails() {
  if (!currentJob || !currentScore) return;

  console.log('[GhostDetection] Score details:', currentScore);

  // Create modal
  const modal = document.createElement('div');
  modal.className = 'jobfiltr-modal';
  modal.innerHTML = `
    <div style="
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 99999;
    " onclick="this.parentElement.remove()">
      <div style="
        background: white;
        border-radius: 12px;
        padding: 24px;
        max-width: 500px;
        width: 90%;
        max-height: 80vh;
        overflow-y: auto;
        box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);
      " onclick="event.stopPropagation()">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <h2 style="margin: 0; font-size: 20px; color: #1e293b;">Ghost Job Analysis</h2>
          <button onclick="this.closest('.jobfiltr-modal').remove()" style="
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
            color: #94a3b8;
          ">&times;</button>
        </div>

        <div style="text-align: center; padding: 16px; background: #f8fafc; border-radius: 8px; margin-bottom: 16px;">
          <div style="font-size: 48px; font-weight: 700; color: ${getScoreColor(currentScore.category)};">
            ${currentScore.overall}
          </div>
          <div style="font-size: 16px; color: #64748b;">${getScoreLabel(currentScore.category)}</div>
          <div style="font-size: 12px; color: #94a3b8; margin-top: 4px;">
            Confidence: ${Math.round(currentScore.confidence * 100)}%
          </div>
        </div>

        <h3 style="font-size: 14px; color: #64748b; margin: 16px 0 8px;">Score Breakdown</h3>
        ${Object.entries(currentScore.breakdown)
          .filter(([_, value]) => value > 0)
          .map(
            ([category, value]) => `
          <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
            <span style="text-transform: capitalize; color: #334155;">${category}</span>
            <span style="font-weight: 600; color: ${value > 50 ? '#ef4444' : value > 25 ? '#f59e0b' : '#10b981'};">
              ${Math.round(value)}%
            </span>
          </div>
        `
          )
          .join('')}

        <h3 style="font-size: 14px; color: #64748b; margin: 16px 0 8px;">Detection Signals</h3>
        ${currentScore.signals
          .filter((s) => s.normalizedValue > 0.1)
          .slice(0, 5)
          .map(
            (s) => `
          <div style="padding: 8px; background: #f8fafc; border-radius: 6px; margin-bottom: 8px;">
            <div style="display: flex; justify-content: space-between;">
              <span style="font-weight: 500; color: #334155;">${s.name}</span>
              <span style="font-size: 12px; color: #64748b;">${Math.round(s.normalizedValue * 100)}%</span>
            </div>
            <div style="font-size: 12px; color: #64748b;">${s.description}</div>
          </div>
        `
          )
          .join('')}

        <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #e2e8f0; text-align: center;">
          <a href="https://jobfiltr.com" target="_blank" style="
            font-size: 12px;
            color: #3b82f6;
            text-decoration: none;
          ">Powered by JobFiltr</a>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
}

/**
 * Get color for score category
 */
function getScoreColor(category) {
  const colors = {
    safe: '#10b981',
    low_risk: '#3b82f6',
    medium_risk: '#f59e0b',
    high_risk: '#ef4444',
    likely_ghost: '#dc2626',
  };
  return colors[category] || colors.medium_risk;
}

/**
 * Get label for score category
 */
function getScoreLabel(category) {
  const labels = {
    safe: 'Likely Legitimate',
    low_risk: 'Low Risk',
    medium_risk: 'Medium Risk',
    high_risk: 'High Risk',
    likely_ghost: 'Likely Ghost Job',
  };
  return labels[category] || 'Unknown';
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}

// Listen for URL changes (SPA navigation)
let lastUrl = window.location.href;
new MutationObserver(() => {
  if (window.location.href !== lastUrl) {
    lastUrl = window.location.href;
    currentJob = null;
    currentScore = null;
    startDetection();
  }
}).observe(document, { subtree: true, childList: true });

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { initialize, analyzeJob };
}
