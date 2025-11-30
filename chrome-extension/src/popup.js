// DOM Elements
const scanSection = document.getElementById('scanSection');
const loadingSection = document.getElementById('loadingSection');
const resultsSection = document.getElementById('resultsSection');
const historySection = document.getElementById('historySection');

const quickModeBtn = document.getElementById('quickModeBtn');
const deepModeBtn = document.getElementById('deepModeBtn');
const scanButton = document.getElementById('scanButton');
const scanButtonText = document.getElementById('scanButtonText');

const resultIcon = document.getElementById('resultIcon');
const resultTitle = document.getElementById('resultTitle');
const resultCompany = document.getElementById('resultCompany');
const resultBadge = document.getElementById('resultBadge');
const scoreValue = document.getElementById('scoreValue');
const scoreFill = document.getElementById('scoreFill');
const flagsList = document.getElementById('flagsList');
const flagsSection = document.getElementById('flagsSection');

const viewFullReportBtn = document.getElementById('viewFullReport');
const newScanBtn = document.getElementById('newScan');
const openSettingsBtn = document.getElementById('openSettings');
const openWebAppBtn = document.getElementById('openWebApp');
const clearHistoryBtn = document.getElementById('clearHistory');
const historyList = document.getElementById('historyList');

// State
let currentMode = 'quick';
let currentUrl = null;
let currentTabId = null;

// Initialize
init();

async function init() {
  // Load current tab info
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab) {
    currentUrl = tab.url;
    currentTabId = tab.id;
  }

  // Check if current page is a supported job site
  if (isSupportedJobSite(currentUrl)) {
    scanButton.disabled = false;
    updateStatusBadge('Ready to Scan', 'ready');
  } else {
    scanButton.disabled = true;
    updateStatusBadge('Navigate to job board', 'inactive');
  }

  // Load scan history
  loadHistory();

  // Event listeners
  quickModeBtn.addEventListener('click', () => setMode('quick'));
  deepModeBtn.addEventListener('click', () => setMode('deep'));
  scanButton.addEventListener('click', handleScan);
  newScanBtn.addEventListener('click', resetToScan);
  viewFullReportBtn.addEventListener('click', openFullReport);
  openSettingsBtn.addEventListener('click', openSettings);
  openWebAppBtn.addEventListener('click', openWebApp);
  clearHistoryBtn.addEventListener('click', clearHistory);
}

function isSupportedJobSite(url) {
  if (!url) return false;
  const jobSites = [
    'linkedin.com/jobs',
    'indeed.com',
    'glassdoor.com',
    'monster.com',
    'ziprecruiter.com',
    'careerbuilder.com'
  ];
  return jobSites.some(site => url.includes(site));
}

function setMode(mode) {
  currentMode = mode;
  quickModeBtn.classList.toggle('active', mode === 'quick');
  deepModeBtn.classList.toggle('active', mode === 'deep');

  scanButton.classList.toggle('deep', mode === 'deep');
  scanButtonText.textContent = mode === 'quick' ? 'Quick Scan' : 'Deep Analysis';
}

function updateStatusBadge(text, status) {
  const badge = document.getElementById('statusBadge');
  const dot = badge.querySelector('.status-dot');
  const span = badge.querySelector('span');

  span.textContent = text;

  // Update styling based on status
  if (status === 'ready') {
    badge.style.background = 'rgba(16, 185, 129, 0.1)';
    badge.style.borderColor = 'rgba(16, 185, 129, 0.3)';
    badge.style.color = '#10B981';
    dot.style.background = '#10B981';
  } else if (status === 'scanning') {
    badge.style.background = 'rgba(59, 130, 246, 0.1)';
    badge.style.borderColor = 'rgba(59, 130, 246, 0.3)';
    badge.style.color = '#3B82F6';
    dot.style.background = '#3B82F6';
  } else if (status === 'inactive') {
    badge.style.background = 'rgba(255, 255, 255, 0.05)';
    badge.style.borderColor = 'rgba(255, 255, 255, 0.1)';
    badge.style.color = 'rgba(255, 255, 255, 0.6)';
    dot.style.background = 'rgba(255, 255, 255, 0.4)';
  }
}

async function handleScan() {
  if (!currentUrl || !currentTabId) return;

  // Show loading
  showSection('loading');
  updateStatusBadge('Scanning...', 'scanning');

  try {
    // Extract job data from page
    const jobData = await chrome.tabs.sendMessage(currentTabId, {
      action: 'extractJobData'
    });

    if (!jobData || !jobData.title) {
      throw new Error('Could not extract job data from this page');
    }

    // Send to backend for analysis
    const result = await analyzeJob(jobData, currentMode);

    // Show results
    displayResults(result);

    // Save to history
    saveToHistory(result);

    updateStatusBadge('Scan Complete', 'ready');
  } catch (error) {
    console.error('Scan error:', error);
    showError(error.message);
    updateStatusBadge('Scan Failed', 'inactive');
  }
}

async function analyzeJob(jobData, mode) {
  // Get Convex URL and auth token from storage
  const { convexUrl, authToken } = await chrome.storage.sync.get({
    convexUrl: 'https://reminiscent-goldfish-690.convex.cloud',
    authToken: ''
  });

  if (!convexUrl) {
    throw new Error('Convex URL not configured. Please check extension settings.');
  }

  if (!authToken) {
    throw new Error('Not authenticated. Please sign in to the web app first.');
  }

  try {
    // Call Convex backend action
    const response = await fetch(`${convexUrl}/api/action`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        path: 'scans/actions:chromeExtensionScanAction',
        args: {
          jobTitle: jobData.title || 'Unknown',
          company: jobData.company || 'Unknown',
          location: jobData.location || undefined,
          description: jobData.description || '',
          salary: jobData.salary || undefined,
          jobUrl: jobData.url,
          mode: mode,
          useAIExtraction: jobData.useAIExtraction || false // Pass AI extraction flag
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Backend error: ${errorText}`);
    }

    const result = await response.json();

    // Transform Convex response to match UI expectations
    return {
      jobTitle: result.report.jobTitle,
      company: result.report.company,
      location: result.report.location,
      confidenceScore: result.report.confidenceScore,
      isScam: result.report.isScam,
      isGhostJob: result.report.isGhostJob,
      isSpam: result.report.isSpam,
      summary: result.report.summary,
      redFlags: result.report.redFlags || [],
      scanMode: mode,
      scannedAt: Date.now(),
      url: currentUrl,
      scanId: result.scanId
    };
  } catch (error) {
    console.error('Error calling Convex backend:', error);
    throw new Error(`Failed to analyze job: ${error.message}`);
  }
}

function generateMockFlags() {
  const possibleFlags = [
    { type: 'urgent_language', description: 'Job posting uses urgent language like "immediate hire" or "apply now"', severity: 'medium' },
    { type: 'vague_description', description: 'Job description lacks specific details about responsibilities', severity: 'low' },
    { type: 'unrealistic_salary', description: 'Salary range appears unusually high for the position level', severity: 'high' },
    { type: 'generic_title', description: 'Job title is very generic and not industry-specific', severity: 'low' },
    { type: 'application_redirect', description: 'Application process redirects to external website', severity: 'medium' }
  ];

  const numFlags = Math.floor(Math.random() * 3);
  return possibleFlags.slice(0, numFlags);
}

function displayResults(result) {
  // Update result header
  resultTitle.textContent = result.jobTitle;
  resultCompany.textContent = result.company + (result.location ? ` • ${result.location}` : '');

  // Update badge and icon
  let badgeText = 'Legitimate';
  let badgeClass = '';
  let iconClass = '';

  if (result.isScam) {
    badgeText = 'Likely Scam';
    badgeClass = 'danger';
    iconClass = 'danger';
  } else if (result.isGhostJob) {
    badgeText = 'Ghost Job';
    badgeClass = 'warning';
    iconClass = 'warning';
  } else if (result.isSpam) {
    badgeText = 'Spam Likely';
    badgeClass = 'spam';
    iconClass = 'spam';
  }

  resultBadge.textContent = badgeText;
  resultBadge.className = `result-badge ${badgeClass}`;
  resultIcon.className = `result-status-icon ${iconClass}`;

  // Update confidence score
  const score = result.confidenceScore;
  scoreValue.textContent = `${score}/100`;
  scoreFill.style.width = `${score}%`;

  if (score >= 75) {
    scoreValue.className = 'score-value';
    scoreFill.className = 'score-fill';
  } else if (score >= 50) {
    scoreValue.className = 'score-value medium';
    scoreFill.className = 'score-fill medium';
  } else {
    scoreValue.className = 'score-value low';
    scoreFill.className = 'score-fill low';
  }

  // Update red flags
  if (result.redFlags && result.redFlags.length > 0) {
    flagsSection.classList.remove('hidden');
    flagsList.innerHTML = result.redFlags.map(flag => `
      <div class="flag-item">
        <svg class="flag-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2L2 7l10 5 10-5-10-5z" fill="currentColor"/>
          <path d="M2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" stroke-width="2" fill="none"/>
        </svg>
        <div>${flag.description}</div>
      </div>
    `).join('');
  } else {
    flagsSection.classList.add('hidden');
  }

  // Show results section
  showSection('results');
}

function showSection(section) {
  scanSection.classList.add('hidden');
  loadingSection.classList.add('hidden');
  resultsSection.classList.add('hidden');

  if (section === 'scan') {
    scanSection.classList.remove('hidden');
  } else if (section === 'loading') {
    loadingSection.classList.remove('hidden');
  } else if (section === 'results') {
    resultsSection.classList.remove('hidden');
  }
}

function resetToScan() {
  showSection('scan');
  updateStatusBadge('Ready to Scan', 'ready');
}

function showError(message) {
  showSection('scan');
  alert('Scan Error: ' + message);
}

async function saveToHistory(result) {
  const { scanHistory = [] } = await chrome.storage.local.get(['scanHistory']);

  scanHistory.unshift({
    ...result,
    id: Date.now()
  });

  // Keep only last 10 scans
  if (scanHistory.length > 10) {
    scanHistory.pop();
  }

  await chrome.storage.local.set({ scanHistory });
  loadHistory();
}

async function loadHistory() {
  const { scanHistory = [] } = await chrome.storage.local.get(['scanHistory']);

  if (scanHistory.length === 0) {
    historyList.innerHTML = `
      <div class="empty-state">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" opacity="0.3"/>
        </svg>
        <p>No recent scans</p>
      </div>
    `;
    return;
  }

  historyList.innerHTML = scanHistory.map(item => `
    <div class="history-item" data-id="${item.id}">
      <div class="history-icon ${item.isScam ? 'danger' : item.isGhostJob ? 'warning' : item.isSpam ? 'spam' : 'success'}">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
          <path d="M8 12L11 15L16 9" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </div>
      <div class="history-info">
        <div class="history-title">${item.jobTitle}</div>
        <div class="history-meta">${item.company} • Score: ${item.confidenceScore}</div>
      </div>
    </div>
  `).join('');

  // Add click handlers
  document.querySelectorAll('.history-item').forEach(item => {
    item.addEventListener('click', () => {
      const id = parseInt(item.dataset.id);
      const scan = scanHistory.find(s => s.id === id);
      if (scan) displayResults(scan);
    });
  });
}

async function clearHistory() {
  if (confirm('Clear all scan history?')) {
    await chrome.storage.local.set({ scanHistory: [] });
    loadHistory();
  }
}

function openFullReport() {
  openWebApp();
}

function openSettings() {
  chrome.runtime.openOptionsPage();
}

function openWebApp() {
  chrome.tabs.create({ url: 'http://localhost:3000/filtr' });
}
