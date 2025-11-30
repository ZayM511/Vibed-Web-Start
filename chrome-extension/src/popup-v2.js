// JobFiltr Chrome Extension - Popup Script
// Handles tab switching, filters, and scanner functionality

// ===== TAB SWITCHING =====
document.querySelectorAll('.tab-button').forEach(button => {
  button.addEventListener('click', () => {
    const tabName = button.dataset.tab;

    // Update active tab button
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');

    // Update active tab content
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    document.getElementById(`${tabName}Tab`).classList.add('active');

    // Initialize tab-specific functionality
    if (tabName === 'filters') {
      initializeFilters();
    } else if (tabName === 'scanner') {
      initializeScanner();
    }
  });
});

// ===== SITE DETECTION =====
let currentSite = null;

async function detectCurrentSite() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const url = tab.url;

    let site = null;
    if (url.includes('linkedin.com')) {
      site = 'linkedin';
    } else if (url.includes('indeed.com')) {
      site = 'indeed';
    } else if (url.includes('google.com') && url.includes('jobs')) {
      site = 'google-jobs';
    }

    currentSite = site;
    updateSiteStatus(site);

    // Enable/disable filters based on site
    const filtersContainer = document.getElementById('filtersContainer');
    const applyBtn = document.getElementById('applyFilters');

    if (site) {
      filtersContainer.style.opacity = '1';
      filtersContainer.style.pointerEvents = 'auto';
      applyBtn.disabled = false;
    } else {
      filtersContainer.style.opacity = '0.5';
      filtersContainer.style.pointerEvents = 'none';
      applyBtn.disabled = true;
    }

    return site;
  } catch (error) {
    console.error('Error detecting site:', error);
    return null;
  }
}

function updateSiteStatus(site) {
  const siteStatus = document.querySelector('.site-status');
  const currentSiteText = document.getElementById('currentSite');

  if (site) {
    siteStatus.classList.add('active');
    const siteNames = {
      'linkedin': 'LinkedIn',
      'indeed': 'Indeed',
      'google-jobs': 'Google Jobs'
    };
    currentSiteText.textContent = `Active on ${siteNames[site]}`;
  } else {
    siteStatus.classList.remove('active');
    currentSiteText.textContent = 'Not on a supported job site';
  }
}

// ===== FILTERS FUNCTIONALITY =====
let filterSettings = {};

async function initializeFilters() {
  await detectCurrentSite();
  await loadFilterSettings();
  updateFilterStats();
}

async function loadFilterSettings() {
  try {
    const result = await chrome.storage.local.get('filterSettings');
    filterSettings = result.filterSettings || {};

    // Apply saved settings to UI
    document.getElementById('filterStaffing').checked = filterSettings.hideStaffing || false;
    document.getElementById('filterSponsored').checked = filterSettings.hideSponsored || false;
    document.getElementById('filterApplicants').checked = filterSettings.filterApplicants || false;
    document.getElementById('applicantRange').value = filterSettings.applicantRange || 'under10';
    document.getElementById('filterEntryLevel').checked = filterSettings.entryLevelAccuracy || false;
    document.getElementById('filterSalary').checked = filterSettings.filterSalary || false;
    document.getElementById('minSalary').value = filterSettings.minSalary || '';
    document.getElementById('maxSalary').value = filterSettings.maxSalary || '';
    document.getElementById('filterActiveRecruiting').checked = filterSettings.showActiveRecruiting || false;
    document.getElementById('filterJobAge').checked = filterSettings.showJobAge || false;
    document.getElementById('filterApplied').checked = filterSettings.hideApplied || false;
    document.getElementById('filterVisa').checked = filterSettings.visaOnly || false;
    document.getElementById('filterEasyApply').checked = filterSettings.easyApplyOnly || false;

  } catch (error) {
    console.error('Error loading filter settings:', error);
  }
}

async function saveFilterSettings() {
  filterSettings = {
    hideStaffing: document.getElementById('filterStaffing').checked,
    hideSponsored: document.getElementById('filterSponsored').checked,
    filterApplicants: document.getElementById('filterApplicants').checked,
    applicantRange: document.getElementById('applicantRange').value,
    entryLevelAccuracy: document.getElementById('filterEntryLevel').checked,
    filterSalary: document.getElementById('filterSalary').checked,
    minSalary: document.getElementById('minSalary').value,
    maxSalary: document.getElementById('maxSalary').value,
    showActiveRecruiting: document.getElementById('filterActiveRecruiting').checked,
    showJobAge: document.getElementById('filterJobAge').checked,
    hideApplied: document.getElementById('filterApplied').checked,
    visaOnly: document.getElementById('filterVisa').checked,
    easyApplyOnly: document.getElementById('filterEasyApply').checked
  };

  await chrome.storage.local.set({ filterSettings });
}

function updateFilterStats() {
  const activeCount = Object.values(filterSettings).filter(v => v === true).length;
  document.getElementById('activeFiltersCount').textContent = activeCount;
}

// Apply Filters Button
document.getElementById('applyFilters').addEventListener('click', async () => {
  await saveFilterSettings();

  // Send message to content script to apply filters
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    await chrome.tabs.sendMessage(tab.id, {
      type: 'APPLY_FILTERS',
      settings: filterSettings,
      site: currentSite
    });

    // Show success feedback
    const btn = document.getElementById('applyFilters');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 12L11 15L16 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg> Filters Applied!';
    btn.style.background = 'var(--success)';

    setTimeout(() => {
      btn.innerHTML = originalText;
      btn.style.background = '';
    }, 2000);

    updateFilterStats();
  } catch (error) {
    console.error('Error applying filters:', error);
  }
});

// Reset Filters Button
document.getElementById('resetFilters').addEventListener('click', async () => {
  // Reset all checkboxes
  document.querySelectorAll('.filter-checkbox').forEach(checkbox => {
    checkbox.checked = false;
  });

  // Reset other inputs
  document.getElementById('applicantRange').value = 'under10';
  document.getElementById('minSalary').value = '';
  document.getElementById('maxSalary').value = '';

  filterSettings = {};
  await chrome.storage.local.set({ filterSettings: {} });

  // Send reset message to content script
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    await chrome.tabs.sendMessage(tab.id, {
      type: 'RESET_FILTERS'
    });
  } catch (error) {
    console.error('Error resetting filters:', error);
  }

  updateFilterStats();
});

// ===== SCANNER FUNCTIONALITY =====
let currentJobData = null;

async function initializeScanner() {
  await detectCurrentJob();
}

async function detectCurrentJob() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // Send message to content script to extract job info
    const response = await chrome.tabs.sendMessage(tab.id, {
      type: 'EXTRACT_JOB_INFO'
    });

    if (response && response.success) {
      currentJobData = response.data;
      updateDetectedJobInfo(response.data);
    } else {
      updateDetectedJobInfo(null);
    }
  } catch (error) {
    console.error('Error detecting job:', error);
    updateDetectedJobInfo(null);
  }
}

function updateDetectedJobInfo(data) {
  if (data) {
    document.getElementById('detectedTitle').textContent = data.title || 'Not detected';
    document.getElementById('detectedCompany').textContent = data.company || 'Not detected';
    document.getElementById('detectedUrl').textContent = data.url || 'Not detected';
    document.getElementById('detectedUrl').title = data.url || '';

    // Enable scan button
    document.getElementById('scanButton').disabled = false;
  } else {
    document.getElementById('detectedTitle').textContent = 'Not detected';
    document.getElementById('detectedCompany').textContent = 'Not detected';
    document.getElementById('detectedUrl').textContent = 'Not on a job posting page';

    // Disable scan button
    document.getElementById('scanButton').disabled = true;
  }
}

// Scan Button
document.getElementById('scanButton').addEventListener('click', async () => {
  if (!currentJobData) {
    await detectCurrentJob();
    if (!currentJobData) {
      alert('No job posting detected. Please navigate to a job posting page.');
      return;
    }
  }

  // Show loading state
  document.querySelector('.scan-results').classList.add('hidden');
  document.querySelector('.loading-section').classList.remove('hidden');

  try {
    // Call your backend API to analyze the job
    const response = await fetch('https://your-backend-url.com/api/scan-job', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(currentJobData)
    });

    const result = await response.json();

    // Hide loading, show results
    document.querySelector('.loading-section').classList.add('hidden');
    document.querySelector('.scan-results').classList.remove('hidden');

    displayScanResults(result);

    // Save to history
    await saveScanToHistory(result);

  } catch (error) {
    console.error('Error scanning job:', error);
    document.querySelector('.loading-section').classList.add('hidden');
    alert('Error scanning job. Please try again.');
  }
});

function displayScanResults(result) {
  // Update result icon and badge
  const resultIcon = document.getElementById('resultIcon');
  const resultBadge = document.getElementById('resultBadge');
  const scoreValue = document.getElementById('scoreValue');
  const scoreFill = document.getElementById('scoreFill');

  const score = result.legitimacyScore || 0;
  scoreValue.textContent = `${score}/100`;
  scoreFill.style.width = `${score}%`;

  // Determine status
  let status = 'legitimate';
  let statusText = 'Legitimate';
  if (score < 40) {
    status = 'danger';
    statusText = 'Scam/Ghost Job';
  } else if (score < 70) {
    status = 'warning';
    statusText = 'Suspicious';
  }

  resultIcon.className = `result-icon ${status}`;
  resultBadge.className = `result-badge ${status}`;
  resultBadge.textContent = statusText;

  // Update result title
  document.getElementById('resultTitle').textContent = currentJobData.title || 'Analysis Complete';

  // Display flags
  const flagsList = document.getElementById('flagsList');
  flagsList.innerHTML = '';

  if (result.redFlags && result.redFlags.length > 0) {
    result.redFlags.forEach(flag => {
      const flagItem = document.createElement('div');
      flagItem.className = 'flag-item';
      flagItem.innerHTML = `
        <svg class="flag-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2v20M12 2l8 6-8 6M12 8l-8 6 8 6" stroke="currentColor" stroke-width="2"/>
        </svg>
        <span>${flag}</span>
      `;
      flagsList.appendChild(flagItem);
    });
  } else {
    flagsList.innerHTML = '<div class="flag-item"><span>No red flags detected!</span></div>';
  }
}

async function saveScanToHistory(result) {
  try {
    const history = await chrome.storage.local.get('scanHistory');
    const scanHistory = history.scanHistory || [];

    scanHistory.unshift({
      ...currentJobData,
      ...result,
      timestamp: Date.now()
    });

    // Keep only last 10 scans
    if (scanHistory.length > 10) {
      scanHistory.pop();
    }

    await chrome.storage.local.set({ scanHistory });
    loadScanHistory();
  } catch (error) {
    console.error('Error saving scan to history:', error);
  }
}

async function loadScanHistory() {
  try {
    const history = await chrome.storage.local.get('scanHistory');
    const scanHistory = history.scanHistory || [];

    const historyList = document.getElementById('historyList');

    if (scanHistory.length === 0) {
      historyList.innerHTML = '<div class="empty-state"><p>No recent scans</p></div>';
      return;
    }

    historyList.innerHTML = '';
    scanHistory.forEach((scan, index) => {
      const historyItem = document.createElement('div');
      historyItem.className = 'history-item';
      historyItem.innerHTML = `
        <div class="history-item-header">
          <span class="history-item-title">${scan.title || 'Unknown Job'}</span>
          <span class="history-item-score">${scan.legitimacyScore}/100</span>
        </div>
        <div class="history-item-company">${scan.company || 'Unknown Company'}</div>
        <div class="history-item-date">${new Date(scan.timestamp).toLocaleDateString()}</div>
      `;
      historyList.appendChild(historyItem);
    });
  } catch (error) {
    console.error('Error loading scan history:', error);
  }
}

// New Scan Button
document.getElementById('newScan').addEventListener('click', () => {
  document.querySelector('.scan-results').classList.add('hidden');
  currentJobData = null;
  detectCurrentJob();
});

// Clear History Button
document.getElementById('clearHistory').addEventListener('click', async () => {
  if (confirm('Are you sure you want to clear all scan history?')) {
    await chrome.storage.local.set({ scanHistory: [] });
    loadScanHistory();
  }
});

// ===== FOOTER ACTIONS =====
document.getElementById('openSettings').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

document.getElementById('openWebApp').addEventListener('click', () => {
  chrome.tabs.create({ url: 'https://jobfiltr.com/dashboard' });
});

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', () => {
  // Initialize filters tab by default
  initializeFilters();
  loadScanHistory();
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'FILTER_STATS_UPDATE') {
    document.getElementById('hiddenJobsCount').textContent = message.hiddenCount || 0;
  }
});
