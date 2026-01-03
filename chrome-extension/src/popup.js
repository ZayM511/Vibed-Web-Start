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
const themeToggle = document.getElementById('themeToggle');

// State
let currentMode = 'quick';
let currentUrl = null;
let currentTabId = null;

// Initialize
init();

async function init() {
  // Initialize theme
  initTheme();

  // Load current tab info
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab) {
    currentUrl = tab.url;
    currentTabId = tab.id;
  }

  // Check if current page is a supported job site
  if (isSupportedJobSite(currentUrl)) {
    scanButton.disabled = false;
  } else {
    scanButton.disabled = true;
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
  themeToggle.addEventListener('click', toggleTheme);
}

// Theme Management
function initTheme() {
  // Check stored preference first
  chrome.storage.local.get(['theme'], (result) => {
    if (result.theme) {
      setTheme(result.theme);
    } else {
      // Check system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setTheme(prefersDark ? 'dark' : 'light');
    }
  });
}

function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  chrome.storage.local.set({ theme });
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  setTheme(newTheme);
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
  scanButtonText.textContent = mode === 'quick' ? 'Quick Scan' : 'Deep Analysis';
}

async function handleScan() {
  if (!currentUrl || !currentTabId) return;

  // Show loading
  showSection('loading');
  document.body.classList.add('scanning');

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

    document.body.classList.remove('scanning');
  } catch (error) {
    console.error('Scan error:', error);
    showError(error.message);
    document.body.classList.remove('scanning');
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
          useAIExtraction: jobData.useAIExtraction || false
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

function displayResults(result) {
  // Update result header
  resultTitle.textContent = result.jobTitle;
  resultCompany.textContent = result.company + (result.location ? ` • ${result.location}` : '');

  // Update badge and icon
  let badgeText = 'Verified';
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
    badgeText = 'Spam';
    badgeClass = 'warning';
    iconClass = 'warning';
  }

  resultBadge.textContent = badgeText;
  resultBadge.className = `result-badge ${badgeClass}`;
  resultIcon.className = `result-status-icon ${iconClass}`;

  // Update icon SVG based on result
  if (iconClass === 'danger' || iconClass === 'warning') {
    resultIcon.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 9v4m0 4h.01M5.07 19H19a2 2 0 001.72-3.01L13.72 4.99a2 2 0 00-3.44 0L3.35 15.99A2 2 0 005.07 19z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `;
  } else {
    resultIcon.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `;
  }

  // Update confidence score
  const score = result.confidenceScore;
  scoreValue.textContent = score;
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
        <svg class="flag-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
          <path d="M12 8v4m0 4h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
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
}

function showError(message) {
  showSection('scan');
  // Create a more elegant error display
  const errorDiv = document.createElement('div');
  errorDiv.className = 'error-toast';
  errorDiv.textContent = message;
  errorDiv.style.cssText = `
    position: fixed;
    bottom: 80px;
    left: 50%;
    transform: translateX(-50%);
    background: var(--danger-bg);
    border: 1px solid var(--danger-border);
    color: var(--danger);
    padding: 12px 20px;
    border-radius: 10px;
    font-size: 13px;
    z-index: 100;
    animation: fadeInUp 0.3s ease-out;
  `;
  document.body.appendChild(errorDiv);

  setTimeout(() => {
    errorDiv.style.opacity = '0';
    errorDiv.style.transform = 'translateX(-50%) translateY(10px)';
    errorDiv.style.transition = 'all 0.3s ease-out';
    setTimeout(() => errorDiv.remove(), 300);
  }, 3000);
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
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <p>No recent scans</p>
      </div>
    `;
    return;
  }

  historyList.innerHTML = scanHistory.map(item => `
    <div class="history-item" data-id="${item.id}">
      <div class="history-icon ${item.isScam ? 'danger' : item.isGhostJob ? 'warning' : ''}">
        <svg viewBox="0 0 24 24" fill="none">
          ${item.isScam || item.isGhostJob ? `
            <path d="M12 9v4m0 4h.01M5.07 19H19a2 2 0 001.72-3.01L13.72 4.99a2 2 0 00-3.44 0L3.35 15.99A2 2 0 005.07 19z" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          ` : `
            <path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          `}
        </svg>
      </div>
      <div class="history-info">
        <div class="history-title">${item.jobTitle}</div>
        <div class="history-meta">${item.company} • ${item.confidenceScore}%</div>
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
