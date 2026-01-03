// JobFiltr Chrome Extension - Popup Script
// Handles tab switching, filters, scanner functionality, and panel mode

// ===== THEME MANAGEMENT =====
function initTheme() {
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

// Initialize theme immediately to prevent flash
initTheme();

// Theme toggle button
document.getElementById('themeToggle')?.addEventListener('click', toggleTheme);

// ===== PANEL MODE DETECTION & MANAGEMENT =====
let isPanelMode = false;
let currentDockSide = null;
let panelWindowId = null;

function detectPanelMode() {
  const urlParams = new URLSearchParams(window.location.search);
  isPanelMode = urlParams.get('mode') === 'panel';
  currentDockSide = urlParams.get('dock') || 'left';

  if (isPanelMode) {
    document.body.classList.add('panel-mode');
    document.body.classList.add(`docked-${currentDockSide}`);
    document.getElementById('unpinBtn').style.display = 'flex';
    initDragHandle();
    initPanelModeListeners(); // Set up tab/window change listeners
  }

  return isPanelMode;
}

// Set up listeners for tab/window changes in panel mode
function initPanelModeListeners() {
  // Listen for tab activation changes
  chrome.tabs.onActivated.addListener((activeInfo) => {
    console.log('Tab activated:', activeInfo);
    // Re-detect the site when user switches tabs
    detectCurrentSite();
  });

  // Listen for tab URL changes (navigation)
  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' || changeInfo.url) {
      console.log('Tab updated:', tabId, changeInfo);
      // Re-detect when a tab finishes loading or URL changes
      detectCurrentSite();
    }
  });

  // Listen for window focus changes
  chrome.windows.onFocusChanged.addListener((windowId) => {
    if (windowId !== chrome.windows.WINDOW_ID_NONE) {
      console.log('Window focus changed:', windowId);
      // Small delay to let Chrome update the active tab
      setTimeout(() => {
        detectCurrentSite();
      }, 100);
    }
  });

  // Periodically refresh detection (backup in case listeners miss something)
  setInterval(() => {
    detectCurrentSite();
  }, 3000);
}

// Pin to left side
document.getElementById('pinLeftBtn').addEventListener('click', async () => {
  if (isPanelMode) {
    // Already in panel mode, switch to left dock
    await chrome.runtime.sendMessage({
      action: 'repositionPanel',
      dock: 'left'
    });
    document.body.classList.remove('docked-right');
    document.body.classList.add('docked-left');
    currentDockSide = 'left';
  } else {
    // Open as panel window docked to left
    await chrome.runtime.sendMessage({
      action: 'openPanel',
      dock: 'left'
    });
    window.close(); // Close popup
  }
});

// Pin to right side
document.getElementById('pinRightBtn').addEventListener('click', async () => {
  if (isPanelMode) {
    // Already in panel mode, switch to right dock
    await chrome.runtime.sendMessage({
      action: 'repositionPanel',
      dock: 'right'
    });
    document.body.classList.remove('docked-left');
    document.body.classList.add('docked-right');
    currentDockSide = 'right';
  } else {
    // Open as panel window docked to right
    await chrome.runtime.sendMessage({
      action: 'openPanel',
      dock: 'right'
    });
    window.close(); // Close popup
  }
});

// Unpin button (only visible in panel mode)
document.getElementById('unpinBtn').addEventListener('click', async () => {
  if (isPanelMode) {
    // Close the panel window
    await chrome.runtime.sendMessage({
      action: 'closePanel'
    });
  }
});

// ===== DRAG FUNCTIONALITY =====
let isDragging = false;
let dragStartX = 0;
let windowStartLeft = 0;

function initDragHandle() {
  const dragHandle = document.getElementById('dragHandle');

  dragHandle.addEventListener('mousedown', async (e) => {
    isDragging = true;
    dragStartX = e.screenX;

    // Get current window position
    const windowInfo = await chrome.runtime.sendMessage({ action: 'getWindowInfo' });
    if (windowInfo) {
      windowStartLeft = windowInfo.left;
    }

    document.body.style.cursor = 'grabbing';
    e.preventDefault();
  });

  document.addEventListener('mousemove', async (e) => {
    if (!isDragging) return;

    const deltaX = e.screenX - dragStartX;
    const newLeft = windowStartLeft + deltaX;

    // Update window position
    await chrome.runtime.sendMessage({
      action: 'movePanel',
      left: newLeft
    });
  });

  document.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      document.body.style.cursor = '';

      // Update dock state based on final position
      updateDockStateFromPosition();
    }
  });

  // Also make header draggable (dead space)
  const header = document.querySelector('.header');
  header.addEventListener('mousedown', async (e) => {
    // Only drag if clicking on header background, not buttons
    if (e.target.closest('.pin-btn') || e.target.closest('.status-badge') || e.target.closest('.logo-section') || e.target.closest('.theme-toggle')) {
      return;
    }

    isDragging = true;
    dragStartX = e.screenX;

    const windowInfo = await chrome.runtime.sendMessage({ action: 'getWindowInfo' });
    if (windowInfo) {
      windowStartLeft = windowInfo.left;
    }

    document.body.style.cursor = 'grabbing';
    e.preventDefault();
  });
}

async function updateDockStateFromPosition() {
  const windowInfo = await chrome.runtime.sendMessage({ action: 'getWindowInfo' });
  if (!windowInfo) return;

  // Get display info to find which monitor the panel is on
  const displayInfo = await chrome.runtime.sendMessage({ action: 'getDisplayForPosition', left: windowInfo.left });

  if (!displayInfo) {
    // Fallback to basic screen detection
    const screenWidth = window.screen.availWidth;
    const panelWidth = 380;
    const snapThreshold = 50;

    if (windowInfo.left < snapThreshold) {
      document.body.classList.remove('docked-right');
      document.body.classList.add('docked-left');
      currentDockSide = 'left';
      await chrome.runtime.sendMessage({ action: 'movePanel', left: 0 });
    } else if (windowInfo.left > screenWidth - panelWidth - snapThreshold) {
      document.body.classList.remove('docked-left');
      document.body.classList.add('docked-right');
      currentDockSide = 'right';
      await chrome.runtime.sendMessage({ action: 'movePanel', left: screenWidth - panelWidth });
    } else {
      document.body.classList.remove('docked-left', 'docked-right');
      currentDockSide = 'float';
    }
    return;
  }

  const { workArea } = displayInfo;
  const panelWidth = 380;
  const snapThreshold = 50;

  // Check if near left edge of THIS monitor
  if (windowInfo.left < workArea.left + snapThreshold) {
    document.body.classList.remove('docked-right');
    document.body.classList.add('docked-left');
    currentDockSide = 'left';
    // Snap to left edge of this monitor
    await chrome.runtime.sendMessage({ action: 'snapToEdge', dock: 'left' });
  }
  // Check if near right edge of THIS monitor
  else if (windowInfo.left > workArea.left + workArea.width - panelWidth - snapThreshold) {
    document.body.classList.remove('docked-left');
    document.body.classList.add('docked-right');
    currentDockSide = 'right';
    // Snap to right edge of this monitor
    await chrome.runtime.sendMessage({ action: 'snapToEdge', dock: 'right' });
  }
  // Floating in middle of this monitor
  else {
    document.body.classList.remove('docked-left', 'docked-right');
    currentDockSide = 'float';
  }
}

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
let currentTabId = null; // Track the active job site tab ID

async function detectCurrentSite() {
  try {
    let tab;

    if (isPanelMode) {
      // In panel mode, we need to get the active tab from the last focused browser window
      // Ask background script to find it for us
      const response = await chrome.runtime.sendMessage({ action: 'getActiveJobTab' });
      if (response && response.tab) {
        tab = response.tab;
      } else {
        // Fallback: query all windows for active tabs
        const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
        // Filter out extension pages
        tab = tabs.find(t => t.url && !t.url.startsWith('chrome-extension://'));
        if (!tab && tabs.length > 0) {
          // Try to find any tab in a normal window
          const allTabs = await chrome.tabs.query({ active: true });
          tab = allTabs.find(t => t.url && !t.url.startsWith('chrome-extension://'));
        }
      }
    } else {
      // Normal popup mode - get active tab in current window
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      tab = activeTab;
    }

    if (!tab || !tab.url) {
      currentSite = null;
      updateSiteStatus(null);
      return null;
    }

    const url = tab.url;
    currentTabId = tab.id; // Store the tab ID for sending messages

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
  const pageIndicator = document.getElementById('pageIndicator');

  if (site) {
    siteStatus.classList.add('active');
    const siteNames = {
      'linkedin': 'LinkedIn',
      'indeed': 'Indeed',
      'google-jobs': 'Google Jobs'
    };
    currentSiteText.textContent = `Active on ${siteNames[site]}`;

    // Show page indicator for LinkedIn, request current page info
    if (site === 'linkedin') {
      requestPageInfo();
    } else {
      pageIndicator?.classList.add('hidden');
    }
  } else {
    siteStatus.classList.remove('active');
    currentSiteText.textContent = 'Not on a supported job site';
    pageIndicator?.classList.add('hidden');
  }
}

// Request current page info from content script
async function requestPageInfo() {
  try {
    let tabId = currentTabId;
    if (!tabId) {
      if (isPanelMode) {
        const response = await chrome.runtime.sendMessage({ action: 'getActiveJobTab' });
        tabId = response?.tab?.id;
      } else {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        tabId = tab?.id;
      }
    }

    if (tabId) {
      chrome.tabs.sendMessage(tabId, { type: 'GET_PAGE_INFO' }, (response) => {
        if (response && response.page) {
          updatePageIndicator(response.page, response.hiddenCount);
        }
      });
    }
  } catch (error) {
    console.error('Error requesting page info:', error);
  }
}

// ===== FILTERS FUNCTIONALITY =====
let filterSettings = {};
let includeKeywords = [];
let excludeKeywords = [];

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

    // True Remote Accuracy settings
    document.getElementById('filterTrueRemote').checked = filterSettings.trueRemoteAccuracy || false;
    document.getElementById('excludeHybrid').checked = filterSettings.excludeHybrid !== false; // Default true
    document.getElementById('excludeOnsite').checked = filterSettings.excludeOnsite !== false; // Default true
    document.getElementById('excludeInOffice').checked = filterSettings.excludeInOffice !== false; // Default true
    document.getElementById('excludeInPerson').checked = filterSettings.excludeInPerson !== false; // Default true

    document.getElementById('filterIncludeKeywords').checked = filterSettings.filterIncludeKeywords || false;
    document.getElementById('filterExcludeKeywords').checked = filterSettings.filterExcludeKeywords || false;
    document.getElementById('filterSalary').checked = filterSettings.filterSalary || false;
    document.getElementById('minSalary').value = filterSettings.minSalary || '';
    document.getElementById('maxSalary').value = filterSettings.maxSalary || '';
    document.getElementById('filterActiveRecruiting').checked = filterSettings.showActiveRecruiting || false;
    document.getElementById('filterJobAge').checked = filterSettings.showJobAge || false;
    document.getElementById('filterApplied').checked = filterSettings.hideApplied || false;
    document.getElementById('filterVisa').checked = filterSettings.visaOnly || false;
    document.getElementById('filterEasyApply').checked = filterSettings.easyApplyOnly || false;

    // Benefits Indicator
    document.getElementById('showBenefitsIndicator').checked = filterSettings.showBenefitsIndicator || false;
    updateBenefitsLegend(filterSettings.showBenefitsIndicator || false);

    // Load keywords
    includeKeywords = filterSettings.includeKeywords || [];
    excludeKeywords = filterSettings.excludeKeywords || [];
    renderKeywordChips();

  } catch (error) {
    console.error('Error loading filter settings:', error);
  }
}

// Benefits legend toggle
function updateBenefitsLegend(show) {
  const legend = document.getElementById('benefitsLegend');
  if (legend) {
    legend.classList.toggle('hidden', !show);
  }
}

document.getElementById('showBenefitsIndicator')?.addEventListener('change', (e) => {
  updateBenefitsLegend(e.target.checked);
});

async function saveFilterSettings() {
  filterSettings = {
    hideStaffing: document.getElementById('filterStaffing').checked,
    hideSponsored: document.getElementById('filterSponsored').checked,
    filterApplicants: document.getElementById('filterApplicants').checked,
    applicantRange: document.getElementById('applicantRange').value,
    entryLevelAccuracy: document.getElementById('filterEntryLevel').checked,
    // True Remote Accuracy settings
    trueRemoteAccuracy: document.getElementById('filterTrueRemote').checked,
    excludeHybrid: document.getElementById('excludeHybrid').checked,
    excludeOnsite: document.getElementById('excludeOnsite').checked,
    excludeInOffice: document.getElementById('excludeInOffice').checked,
    excludeInPerson: document.getElementById('excludeInPerson').checked,
    filterIncludeKeywords: document.getElementById('filterIncludeKeywords').checked,
    filterExcludeKeywords: document.getElementById('filterExcludeKeywords').checked,
    includeKeywords: includeKeywords,
    excludeKeywords: excludeKeywords,
    filterSalary: document.getElementById('filterSalary').checked,
    minSalary: document.getElementById('minSalary').value,
    maxSalary: document.getElementById('maxSalary').value,
    showActiveRecruiting: document.getElementById('filterActiveRecruiting').checked,
    showJobAge: document.getElementById('filterJobAge').checked,
    hideApplied: document.getElementById('filterApplied').checked,
    visaOnly: document.getElementById('filterVisa').checked,
    easyApplyOnly: document.getElementById('filterEasyApply').checked,
    // Benefits Indicator
    showBenefitsIndicator: document.getElementById('showBenefitsIndicator').checked
  };

  await chrome.storage.local.set({ filterSettings });
}

function updateFilterStats() {
  // Count main filters (excluding trueRemoteAccuracy and showBenefitsIndicator)
  const mainFilters = [
    'hideStaffing',
    'hideSponsored',
    'filterApplicants',
    'entryLevelAccuracy',
    'filterIncludeKeywords',
    'filterExcludeKeywords',
    'filterSalary',
    'showActiveRecruiting',
    'showJobAge',
    'hideApplied',
    'visaOnly',
    'easyApplyOnly'
  ];

  let activeCount = mainFilters.filter(key => filterSettings[key] === true).length;

  // Only count True Remote sub-checkboxes when trueRemoteAccuracy is enabled
  if (filterSettings.trueRemoteAccuracy) {
    const remoteSubFilters = ['excludeHybrid', 'excludeOnsite', 'excludeInOffice', 'excludeInPerson'];
    activeCount += remoteSubFilters.filter(key => filterSettings[key] === true).length;
  }

  document.getElementById('activeFiltersCount').textContent = activeCount;
}

// ===== KEYWORDS MANAGEMENT =====
function renderKeywordChips() {
  // Render include keywords
  const includeContainer = document.getElementById('includeKeywordsChips');
  includeContainer.innerHTML = '';

  if (includeKeywords.length === 0) {
    includeContainer.innerHTML = '<span class="keywords-empty">No keywords added</span>';
  } else {
    includeKeywords.forEach((keyword, index) => {
      const chip = createKeywordChip(keyword, 'include', index);
      includeContainer.appendChild(chip);
    });
  }

  // Render exclude keywords
  const excludeContainer = document.getElementById('excludeKeywordsChips');
  excludeContainer.innerHTML = '';

  if (excludeKeywords.length === 0) {
    excludeContainer.innerHTML = '<span class="keywords-empty">No keywords added</span>';
  } else {
    excludeKeywords.forEach((keyword, index) => {
      const chip = createKeywordChip(keyword, 'exclude', index);
      excludeContainer.appendChild(chip);
    });
  }
}

function createKeywordChip(keyword, type, index) {
  const chip = document.createElement('span');
  chip.className = `keyword-chip ${type === 'exclude' ? 'exclude' : ''}`;
  chip.innerHTML = `
    ${keyword}
    <button class="keyword-chip-remove" data-type="${type}" data-index="${index}">&times;</button>
  `;

  // Add click handler for remove button
  chip.querySelector('.keyword-chip-remove').addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    removeKeyword(type, index);
  });

  return chip;
}

function addKeyword(type, keyword) {
  keyword = keyword.trim().toLowerCase();

  if (!keyword) return false;

  if (type === 'include') {
    if (includeKeywords.includes(keyword)) {
      return false; // Already exists
    }
    includeKeywords.push(keyword);
  } else {
    if (excludeKeywords.includes(keyword)) {
      return false; // Already exists
    }
    excludeKeywords.push(keyword);
  }

  renderKeywordChips();
  return true;
}

function removeKeyword(type, index) {
  if (type === 'include') {
    includeKeywords.splice(index, 1);
  } else {
    excludeKeywords.splice(index, 1);
  }

  renderKeywordChips();
}

// Include keyword input handlers
document.getElementById('includeKeywordInput').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    const input = e.target;
    if (addKeyword('include', input.value)) {
      input.value = '';
    }
  }
});

document.getElementById('addIncludeKeyword').addEventListener('click', () => {
  const input = document.getElementById('includeKeywordInput');
  if (addKeyword('include', input.value)) {
    input.value = '';
  }
  input.focus();
});

// Exclude keyword input handlers
document.getElementById('excludeKeywordInput').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    const input = e.target;
    if (addKeyword('exclude', input.value)) {
      input.value = '';
    }
  }
});

document.getElementById('addExcludeKeyword').addEventListener('click', () => {
  const input = document.getElementById('excludeKeywordInput');
  if (addKeyword('exclude', input.value)) {
    input.value = '';
  }
  input.focus();
});

// Apply Filters Button
document.getElementById('applyFilters').addEventListener('click', async () => {
  await saveFilterSettings();

  // Send message to content script to apply filters
  try {
    // In panel mode, use the stored currentTabId from detectCurrentSite()
    // Otherwise, query the active tab in current window
    let tabId = currentTabId;
    if (!tabId) {
      if (isPanelMode) {
        // In panel mode, get tab from background script
        const response = await chrome.runtime.sendMessage({ action: 'getActiveJobTab' });
        tabId = response?.tab?.id;
      } else {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        tabId = tab?.id;
      }
    }

    if (!tabId) {
      console.error('No tab found to apply filters');
      return;
    }

    await chrome.tabs.sendMessage(tabId, {
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

  // Reset keywords
  includeKeywords = [];
  excludeKeywords = [];
  renderKeywordChips();

  filterSettings = {};
  await chrome.storage.local.set({ filterSettings: {} });

  // Send reset message to content script
  try {
    // In panel mode, use the stored currentTabId or get from background
    let tabId = currentTabId;
    if (!tabId) {
      if (isPanelMode) {
        const response = await chrome.runtime.sendMessage({ action: 'getActiveJobTab' });
        tabId = response?.tab?.id;
      } else {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        tabId = tab?.id;
      }
    }

    if (tabId) {
      await chrome.tabs.sendMessage(tabId, {
        type: 'RESET_FILTERS'
      });
    }
  } catch (error) {
    console.error('Error resetting filters:', error);
  }

  updateFilterStats();
});

// ===== SCANNER FUNCTIONALITY =====
let currentJobData = null;
let scannerRefreshInterval = null;

async function initializeScanner() {
  // Ensure we have the correct tab first
  await detectCurrentSite();
  await detectCurrentJob();

  // Start auto-refresh for scanner detection (every 2 seconds)
  if (scannerRefreshInterval) {
    clearInterval(scannerRefreshInterval);
  }
  scannerRefreshInterval = setInterval(async () => {
    // Only refresh if scanner tab is active
    const scannerTab = document.querySelector('.tab-button[data-tab="scanner"]');
    if (scannerTab && scannerTab.classList.contains('active')) {
      await detectCurrentJob();
    }
  }, 2000);
}

async function detectCurrentJob() {
  try {
    // In panel mode, use the stored currentTabId or get from background
    let tabId = currentTabId;
    if (!tabId) {
      if (isPanelMode) {
        const response = await chrome.runtime.sendMessage({ action: 'getActiveJobTab' });
        tabId = response?.tab?.id;
      } else {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        tabId = tab?.id;
      }
    }

    if (!tabId) {
      updateDetectedJobInfo(null);
      return;
    }

    // Send message to content script to extract job info
    const response = await chrome.tabs.sendMessage(tabId, {
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
    // Get the tab ID to send message to
    let tabId = currentTabId;
    if (!tabId) {
      if (isPanelMode) {
        const response = await chrome.runtime.sendMessage({ action: 'getActiveJobTab' });
        tabId = response?.tab?.id;
      } else {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        tabId = tab?.id;
      }
    }

    if (!tabId) {
      throw new Error('No tab found for scanning');
    }

    // Send message to content script to perform ghost detection analysis
    const result = await chrome.tabs.sendMessage(tabId, {
      type: 'ANALYZE_GHOST_JOB',
      jobData: currentJobData
    });

    // Hide loading, show results
    document.querySelector('.loading-section').classList.add('hidden');
    document.querySelector('.scan-results').classList.remove('hidden');

    if (result && result.success) {
      displayScanResults(result.data);
      // Save to history
      await saveScanToHistory(result.data);
    } else {
      // Fallback: perform local analysis if content script doesn't respond
      const localResult = performLocalGhostAnalysis(currentJobData);
      displayScanResults(localResult);
      await saveScanToHistory(localResult);
    }

  } catch (error) {
    console.error('Error scanning job:', error);
    // Fallback: perform local analysis
    try {
      const localResult = performLocalGhostAnalysis(currentJobData);
      document.querySelector('.loading-section').classList.add('hidden');
      document.querySelector('.scan-results').classList.remove('hidden');
      displayScanResults(localResult);
      await saveScanToHistory(localResult);
    } catch (fallbackError) {
      document.querySelector('.loading-section').classList.add('hidden');
      alert('Error scanning job. Please try again.');
    }
  }
});

// Local ghost job analysis (fallback when content script unavailable)
function performLocalGhostAnalysis(jobData) {
  const redFlags = [];
  let score = 100; // Start with perfect score, subtract for issues

  // Check for staffing indicators
  const staffingPatterns = [
    /staffing|recruiting|talent|solutions|workforce/i,
    /robert\s*half|randstad|adecco|manpower|kelly\s*services/i,
    /teksystems|insight\s*global|aerotek|allegis/i,
    /cybercoders|kforce|modis|judge|apex/i
  ];

  const companyLower = (jobData.company || '').toLowerCase();
  for (const pattern of staffingPatterns) {
    if (pattern.test(companyLower)) {
      redFlags.push('Company appears to be a staffing agency');
      score -= 20;
      break;
    }
  }

  // Check for vague descriptions
  const vagueIndicators = [
    'fast-paced', 'self-starter', 'team player', 'dynamic',
    'exciting opportunity', 'competitive salary', 'rock star', 'ninja',
    'guru', 'wear many hats', 'other duties as assigned'
  ];

  const descLower = (jobData.description || '').toLowerCase();
  let vagueCount = 0;
  for (const indicator of vagueIndicators) {
    if (descLower.includes(indicator)) vagueCount++;
  }

  if (vagueCount >= 3) {
    redFlags.push('Job description contains multiple vague/buzzword phrases');
    score -= 15;
  } else if (vagueCount >= 1) {
    redFlags.push('Job description contains some vague language');
    score -= 5;
  }

  // Check for salary transparency
  if (!/\$[\d,]+/.test(jobData.description || '') && !/salary|pay|compensation/i.test(jobData.description || '')) {
    redFlags.push('No salary information provided');
    score -= 10;
  }

  // Check description length
  if ((jobData.description || '').length < 200) {
    redFlags.push('Job description is unusually short');
    score -= 15;
  }

  // Check for remote work clarity issues
  if (/remote/i.test(jobData.description || '') && /hybrid|on-?site|in-?office|commute/i.test(jobData.description || '')) {
    redFlags.push('Conflicting remote/in-office requirements');
    score -= 10;
  }

  // Clamp score
  score = Math.max(0, Math.min(100, score));

  return {
    legitimacyScore: score,
    redFlags: redFlags.length > 0 ? redFlags : ['No significant red flags detected'],
    confidence: 0.75,
    analyzedAt: Date.now()
  };
}

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
  // Detect if in panel mode first
  detectPanelMode();

  // Initialize filters tab by default
  initializeFilters();
  loadScanHistory();
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'FILTER_STATS_UPDATE') {
    document.getElementById('hiddenJobsCount').textContent = message.hiddenCount || 0;

    // Update page indicator if on LinkedIn
    if (message.site === 'linkedin' && message.page) {
      updatePageIndicator(message.page, message.hiddenCount);
    }
  }

  if (message.type === 'PAGE_UPDATE') {
    if (message.site === 'linkedin') {
      updatePageIndicator(message.page, message.hiddenCount);
    }
  }
});

// Update page indicator display
function updatePageIndicator(page, hiddenCount) {
  const pageIndicator = document.getElementById('pageIndicator');
  const currentPageText = document.getElementById('currentPageText');
  const pageHiddenCount = document.getElementById('pageHiddenCount');

  if (pageIndicator && currentSite === 'linkedin') {
    pageIndicator.classList.remove('hidden');
    currentPageText.textContent = `Page ${page}`;
    pageHiddenCount.textContent = hiddenCount || 0;
  }
}

// Hide page indicator when not on LinkedIn
function hidePageIndicator() {
  const pageIndicator = document.getElementById('pageIndicator');
  if (pageIndicator) {
    pageIndicator.classList.add('hidden');
  }
}
