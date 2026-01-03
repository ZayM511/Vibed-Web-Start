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
        if (chrome.runtime.lastError) {
          // Silently ignore - content script may not be loaded
          return;
        }
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

    // Applicant Count Display
    document.getElementById('showApplicantCount').checked = filterSettings.showApplicantCount || false;

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
    showBenefitsIndicator: document.getElementById('showBenefitsIndicator').checked,
    // Applicant Count Display
    showApplicantCount: document.getElementById('showApplicantCount').checked
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

// ===== TEMPLATES MANAGEMENT =====
const TEMPLATES_STORAGE_KEY = 'jobfiltr_templates';
let templates = [];
let activeTemplateId = null; // Track currently applied template

async function loadTemplates() {
  try {
    const result = await chrome.storage.local.get(TEMPLATES_STORAGE_KEY);
    templates = result[TEMPLATES_STORAGE_KEY] || [];
    renderTemplates();
  } catch (error) {
    console.error('Error loading templates:', error);
    templates = [];
    renderTemplates();
  }
}

async function saveTemplates() {
  try {
    await chrome.storage.local.set({ [TEMPLATES_STORAGE_KEY]: templates });
  } catch (error) {
    console.error('Error saving templates:', error);
  }
}

function countActiveFilters(settings) {
  const mainFilters = [
    'hideStaffing', 'hideSponsored', 'filterApplicants', 'entryLevelAccuracy',
    'trueRemoteAccuracy', 'filterIncludeKeywords', 'filterExcludeKeywords',
    'filterSalary', 'showActiveRecruiting', 'showJobAge', 'hideApplied',
    'visaOnly', 'easyApplyOnly', 'showBenefitsIndicator', 'showApplicantCount'
  ];
  return mainFilters.filter(key => settings[key] === true).length;
}

function getCurrentFilterSettings() {
  return {
    hideStaffing: document.getElementById('filterStaffing').checked,
    hideSponsored: document.getElementById('filterSponsored').checked,
    filterApplicants: document.getElementById('filterApplicants').checked,
    applicantRange: document.getElementById('applicantRange').value,
    entryLevelAccuracy: document.getElementById('filterEntryLevel').checked,
    trueRemoteAccuracy: document.getElementById('filterTrueRemote').checked,
    excludeHybrid: document.getElementById('excludeHybrid').checked,
    excludeOnsite: document.getElementById('excludeOnsite').checked,
    excludeInOffice: document.getElementById('excludeInOffice').checked,
    excludeInPerson: document.getElementById('excludeInPerson').checked,
    filterIncludeKeywords: document.getElementById('filterIncludeKeywords').checked,
    filterExcludeKeywords: document.getElementById('filterExcludeKeywords').checked,
    includeKeywords: [...includeKeywords],
    excludeKeywords: [...excludeKeywords],
    filterSalary: document.getElementById('filterSalary').checked,
    minSalary: document.getElementById('minSalary').value,
    maxSalary: document.getElementById('maxSalary').value,
    showActiveRecruiting: document.getElementById('filterActiveRecruiting').checked,
    showJobAge: document.getElementById('filterJobAge').checked,
    hideApplied: document.getElementById('filterApplied').checked,
    visaOnly: document.getElementById('filterVisa').checked,
    easyApplyOnly: document.getElementById('filterEasyApply').checked,
    showBenefitsIndicator: document.getElementById('showBenefitsIndicator').checked,
    showApplicantCount: document.getElementById('showApplicantCount').checked
  };
}

function applyTemplateSettings(settings) {
  // Apply all settings to UI
  document.getElementById('filterStaffing').checked = settings.hideStaffing || false;
  document.getElementById('filterSponsored').checked = settings.hideSponsored || false;
  document.getElementById('filterApplicants').checked = settings.filterApplicants || false;
  document.getElementById('applicantRange').value = settings.applicantRange || 'under10';
  document.getElementById('filterEntryLevel').checked = settings.entryLevelAccuracy || false;
  document.getElementById('filterTrueRemote').checked = settings.trueRemoteAccuracy || false;
  document.getElementById('excludeHybrid').checked = settings.excludeHybrid !== false;
  document.getElementById('excludeOnsite').checked = settings.excludeOnsite !== false;
  document.getElementById('excludeInOffice').checked = settings.excludeInOffice !== false;
  document.getElementById('excludeInPerson').checked = settings.excludeInPerson !== false;
  document.getElementById('filterIncludeKeywords').checked = settings.filterIncludeKeywords || false;
  document.getElementById('filterExcludeKeywords').checked = settings.filterExcludeKeywords || false;
  document.getElementById('filterSalary').checked = settings.filterSalary || false;
  document.getElementById('minSalary').value = settings.minSalary || '';
  document.getElementById('maxSalary').value = settings.maxSalary || '';
  document.getElementById('filterActiveRecruiting').checked = settings.showActiveRecruiting || false;
  document.getElementById('filterJobAge').checked = settings.showJobAge || false;
  document.getElementById('filterApplied').checked = settings.hideApplied || false;
  document.getElementById('filterVisa').checked = settings.visaOnly || false;
  document.getElementById('filterEasyApply').checked = settings.easyApplyOnly || false;
  document.getElementById('showBenefitsIndicator').checked = settings.showBenefitsIndicator || false;
  document.getElementById('showApplicantCount').checked = settings.showApplicantCount || false;

  // Apply keywords
  includeKeywords = settings.includeKeywords || [];
  excludeKeywords = settings.excludeKeywords || [];
  renderKeywordChips();

  // Update benefits legend visibility
  updateBenefitsLegend(settings.showBenefitsIndicator || false);

  // Update filter stats
  filterSettings = settings;
  updateFilterStats();
}

async function saveTemplate(name) {
  const settings = getCurrentFilterSettings();
  const template = {
    id: Date.now().toString(),
    name: name.trim(),
    createdAt: Date.now(),
    settings: settings,
    filterCount: countActiveFilters(settings),
    isFavorite: false
  };

  templates.unshift(template);

  // Limit to 10 templates
  if (templates.length > 10) {
    templates.pop();
  }

  await saveTemplates();
  renderTemplates();
}

async function deleteTemplate(id) {
  templates = templates.filter(t => t.id !== id);
  await saveTemplates();
  renderTemplates();
}

async function toggleFavorite(id) {
  const template = templates.find(t => t.id === id);
  if (template) {
    template.isFavorite = !template.isFavorite;
    await saveTemplates();
    renderTemplates();
  }
}

function loadTemplate(id) {
  const template = templates.find(t => t.id === id);
  if (template) {
    applyTemplateSettings(template.settings);

    // Set as active template
    activeTemplateId = id;
    renderTemplates(); // Re-render to show active state

    // Show feedback
    const saveBtn = document.getElementById('saveTemplateBtn');
    const originalHTML = saveBtn.innerHTML;
    saveBtn.innerHTML = `
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M5 12l5 5L20 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      Loaded!
    `;
    saveBtn.style.background = 'var(--success)';

    setTimeout(() => {
      saveBtn.innerHTML = originalHTML;
      saveBtn.style.background = '';
    }, 1500);
  }
}

// Clear active template when filters are manually changed
function clearActiveTemplate() {
  if (activeTemplateId) {
    activeTemplateId = null;
    renderTemplates();
  }
}

function formatDate(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString();
}

function renderTemplates() {
  const templatesList = document.getElementById('templatesList');
  const templatesEmpty = document.getElementById('templatesEmpty');

  // Clear existing template items (but keep empty state element)
  const existingItems = templatesList.querySelectorAll('.template-item');
  existingItems.forEach(item => item.remove());

  if (templates.length === 0) {
    templatesEmpty.classList.remove('hidden');
    return;
  }

  templatesEmpty.classList.add('hidden');

  // Sort templates: favorites first, then by creation date (newest first)
  const sortedTemplates = [...templates].sort((a, b) => {
    // Favorites first
    if (a.isFavorite && !b.isFavorite) return -1;
    if (!a.isFavorite && b.isFavorite) return 1;
    // Then by creation date (newest first)
    return b.createdAt - a.createdAt;
  });

  sortedTemplates.forEach(template => {
    const isFavorite = template.isFavorite || false;
    const isActive = template.id === activeTemplateId;
    const item = document.createElement('div');
    item.className = `template-item${isFavorite ? ' is-favorite' : ''}${isActive ? ' is-active' : ''}`;
    item.dataset.id = template.id;
    item.innerHTML = `
      <button class="btn-favorite-template${isFavorite ? ' active' : ''}" title="${isFavorite ? 'Remove from favorites' : 'Add to favorites'}" data-id="${template.id}">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="${isFavorite ? 'currentColor' : 'none'}" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
      <div class="template-item-info">
        <div class="template-item-name">
          ${escapeHtml(template.name)}
          ${isActive ? '<span class="template-active-badge">Active</span>' : ''}
        </div>
        <div class="template-item-meta">
          <span class="template-filter-count">${template.filterCount} filters</span>
          <span>${formatDate(template.createdAt)}</span>
        </div>
      </div>
      <div class="template-item-actions">
        <button class="btn-load-template" title="Load template" data-id="${template.id}">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M5 12l5 5L20 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        <button class="btn-delete-template" title="Delete template" data-id="${template.id}">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </button>
      </div>
    `;

    // Click on item to load template (except on action buttons)
    item.addEventListener('click', (e) => {
      if (!e.target.closest('.btn-delete-template') && !e.target.closest('.btn-favorite-template')) {
        loadTemplate(template.id);
      }
    });

    // Favorite button handler
    item.querySelector('.btn-favorite-template').addEventListener('click', (e) => {
      e.stopPropagation();
      toggleFavorite(template.id);
    });

    // Load button handler
    item.querySelector('.btn-load-template').addEventListener('click', (e) => {
      e.stopPropagation();
      loadTemplate(template.id);
    });

    // Delete button handler
    item.querySelector('.btn-delete-template').addEventListener('click', (e) => {
      e.stopPropagation();
      deleteTemplate(template.id);
    });

    templatesList.appendChild(item);
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Templates toggle (expand/collapse)
document.getElementById('templatesToggle')?.addEventListener('click', () => {
  const section = document.getElementById('templatesSection');
  section.classList.toggle('collapsed');

  // Save preference
  chrome.storage.local.set({
    templatesCollapsed: section.classList.contains('collapsed')
  });
});

// Load templates collapsed state
async function loadTemplatesCollapsedState() {
  try {
    const result = await chrome.storage.local.get('templatesCollapsed');
    if (result.templatesCollapsed) {
      document.getElementById('templatesSection')?.classList.add('collapsed');
    }
  } catch (error) {
    // Ignore errors
  }
}

// Save template button - show input
document.getElementById('saveTemplateBtn')?.addEventListener('click', () => {
  const modal = document.getElementById('saveTemplateModal');
  modal.classList.remove('hidden');
  const input = document.getElementById('templateNameInput');
  input.value = '';
  input.focus();
});

// Confirm save template
document.getElementById('confirmSaveTemplate')?.addEventListener('click', async () => {
  const input = document.getElementById('templateNameInput');
  const name = input.value.trim();

  if (name) {
    await saveTemplate(name);
    document.getElementById('saveTemplateModal').classList.add('hidden');
    input.value = '';
  }
});

// Cancel save template
document.getElementById('cancelSaveTemplate')?.addEventListener('click', () => {
  document.getElementById('saveTemplateModal').classList.add('hidden');
  document.getElementById('templateNameInput').value = '';
});

// Enter key to confirm save
document.getElementById('templateNameInput')?.addEventListener('keypress', async (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    const name = e.target.value.trim();
    if (name) {
      await saveTemplate(name);
      document.getElementById('saveTemplateModal').classList.add('hidden');
      e.target.value = '';
    }
  }
});

// Escape key to cancel
document.getElementById('templateNameInput')?.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.getElementById('saveTemplateModal').classList.add('hidden');
    e.target.value = '';
  }
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

    try {
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
    } catch (msgError) {
      // Handle content script not available
      if (msgError.message?.includes('Receiving end does not exist')) {
        console.warn('Content script not loaded on this page');
        // Show error feedback
        const btn = document.getElementById('applyFilters');
        const originalText = btn.innerHTML;
        btn.innerHTML = '⚠ Content script not loaded';
        btn.style.background = 'var(--error)';

        setTimeout(() => {
          btn.innerHTML = originalText;
          btn.style.background = '';
        }, 2000);
      } else {
        throw msgError;
      }
    }
  } catch (error) {
    console.error('Error applying filters:', error);
  }
});

// Reset Filters Button
document.getElementById('resetFilters').addEventListener('click', async () => {
  // Clear active template
  activeTemplateId = null;
  renderTemplates();

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
      try {
        await chrome.tabs.sendMessage(tabId, {
          type: 'RESET_FILTERS'
        });
      } catch (msgError) {
        // Silently ignore if content script is not available
        // This happens when the tab doesn't have our content script loaded
        if (!msgError.message?.includes('Receiving end does not exist')) {
          console.error('Error sending reset message:', msgError);
        }
      }
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
    try {
      const response = await chrome.tabs.sendMessage(tabId, {
        type: 'EXTRACT_JOB_INFO'
      });

      if (response && response.success) {
        currentJobData = response.data;
        updateDetectedJobInfo(response.data);
      } else {
        updateDetectedJobInfo(null);
      }
    } catch (msgError) {
      // Silently ignore if content script is not available
      if (!msgError.message?.includes('Receiving end does not exist')) {
        console.error('Error sending job extraction message:', msgError);
      }
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
    document.getElementById('detectedLocation').textContent = data.location || 'Not detected';
    document.getElementById('detectedUrl').textContent = data.url || 'Not detected';
    document.getElementById('detectedUrl').title = data.url || '';

    // Enable scan button
    document.getElementById('scanButton').disabled = false;
  } else {
    document.getElementById('detectedTitle').textContent = 'Not detected';
    document.getElementById('detectedCompany').textContent = 'Not detected';
    document.getElementById('detectedLocation').textContent = 'Not detected';
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
    let result;
    try {
      result = await chrome.tabs.sendMessage(tabId, {
        type: 'ANALYZE_GHOST_JOB',
        jobData: currentJobData
      });
    } catch (msgError) {
      // Handle content script not available - fall back to local analysis
      if (msgError.message?.includes('Receiving end does not exist')) {
        console.warn('Content script not available, using local analysis');
        result = null;
      } else {
        throw msgError;
      }
    }

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

      // Format date and time with timezone
      const scanDate = new Date(scan.timestamp);
      const dateStr = scanDate.toLocaleDateString();
      const timeStr = scanDate.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short'
      });

      historyItem.innerHTML = `
        <div class="history-item-header">
          <span class="history-item-title">${scan.title || 'Unknown Job'}</span>
          <span class="history-item-score">${scan.legitimacyScore}/100</span>
        </div>
        <div class="history-item-company">${scan.company || 'Unknown Company'}</div>
        <div class="history-item-date">${dateStr} at ${timeStr}</div>
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

  // Load templates
  loadTemplates();
  loadTemplatesCollapsedState();
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

// ===== DOCUMENTS TAB =====
const DOCUMENT_LIMITS = {
  resumes: 10,
  coverLetters: 10,
  portfolio: 10
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB per file

// Accepted file types per category
const ACCEPTED_FILE_TYPES = {
  resumes: {
    mimeTypes: ['application/pdf'],
    extensions: ['.pdf'],
    accept: '.pdf',
    description: 'PDF files only'
  },
  coverLetters: {
    mimeTypes: ['application/pdf'],
    extensions: ['.pdf'],
    accept: '.pdf',
    description: 'PDF files only'
  },
  portfolio: {
    mimeTypes: [
      'application/pdf',
      'image/png',
      'image/jpeg',
      'image/gif',
      'image/webp',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ],
    extensions: ['.pdf', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.xls', '.xlsx'],
    accept: '.pdf,.png,.jpg,.jpeg,.gif,.webp,.xls,.xlsx',
    description: 'PDF, Images, Excel'
  }
};

let documents = {
  resumes: [],
  coverLetters: [],
  portfolio: []
};

let currentUploadCategory = null;
let currentPreviewDoc = null;
let currentPreviewPage = 1;
let pdfDoc = null;

// Initialize documents tab
async function initializeDocuments() {
  await loadDocuments();
  renderAllDocuments();
  updateStorageInfo();
  setupDocumentEventListeners();
}

// Load documents from storage
async function loadDocuments() {
  try {
    const result = await chrome.storage.local.get('userDocuments');
    if (result.userDocuments) {
      documents = result.userDocuments;
    }
  } catch (error) {
    console.error('Error loading documents:', error);
  }
}

// Save documents to storage
async function saveDocuments() {
  try {
    await chrome.storage.local.set({ userDocuments: documents });
    updateStorageInfo();
  } catch (error) {
    console.error('Error saving documents:', error);
  }
}

// Setup event listeners for documents tab
function setupDocumentEventListeners() {
  // Add document buttons
  document.getElementById('addResumeBtn').addEventListener('click', () => triggerFileUpload('resumes'));
  document.getElementById('addCoverLetterBtn').addEventListener('click', () => triggerFileUpload('coverLetters'));
  document.getElementById('addPortfolioBtn').addEventListener('click', () => triggerFileUpload('portfolio'));

  // File input change
  document.getElementById('fileInput').addEventListener('change', handleFileSelect);

  // Preview modal controls
  document.getElementById('closePreviewBtn').addEventListener('click', closePreviewModal);
  document.getElementById('docPreviewOverlay').addEventListener('click', closePreviewModal);
  document.getElementById('downloadDocBtn').addEventListener('click', downloadCurrentDoc);
  document.getElementById('deleteDocBtn').addEventListener('click', deleteCurrentDoc);
  document.getElementById('prevPageBtn').addEventListener('click', () => changePage(-1));
  document.getElementById('nextPageBtn').addEventListener('click', () => changePage(1));

  // Cloud sync toggle
  document.getElementById('cloudSyncToggle').addEventListener('change', handleCloudSyncToggle);

  // Keyboard shortcuts for modal
  document.addEventListener('keydown', (e) => {
    if (!document.getElementById('docPreviewModal').classList.contains('hidden')) {
      if (e.key === 'Escape') closePreviewModal();
      if (e.key === 'ArrowLeft') changePage(-1);
      if (e.key === 'ArrowRight') changePage(1);
    }
  });
}

// Trigger file upload for a category
function triggerFileUpload(category) {
  if (documents[category].length >= DOCUMENT_LIMITS[category]) {
    alert(`Maximum ${DOCUMENT_LIMITS[category]} documents allowed in this category.`);
    return;
  }
  currentUploadCategory = category;
  // Set accept attribute based on category
  const fileInput = document.getElementById('fileInput');
  fileInput.setAttribute('accept', ACCEPTED_FILE_TYPES[category].accept);
  fileInput.click();
}

// Handle file selection
async function handleFileSelect(event) {
  const file = event.target.files[0];
  if (!file) return;

  const category = currentUploadCategory;
  const acceptedTypes = ACCEPTED_FILE_TYPES[category];

  // Validate file type based on category
  const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
  const isValidType = acceptedTypes.mimeTypes.includes(file.type) ||
                      acceptedTypes.extensions.includes(fileExtension);

  if (!isValidType) {
    alert(`Invalid file type. Accepted: ${acceptedTypes.description}`);
    event.target.value = '';
    return;
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    alert('File size must be less than 10MB.');
    event.target.value = '';
    return;
  }

  try {
    // Read file as base64
    const base64Data = await readFileAsBase64(file);

    // Generate thumbnail based on file type
    let thumbnail = null;
    if (file.type.startsWith('image/')) {
      thumbnail = base64Data; // Use image itself as thumbnail
    } else if (file.type === 'application/pdf') {
      thumbnail = await generatePDFThumbnail(base64Data);
    }
    // Excel files get no thumbnail (will use placeholder)

    // Determine file type category for display
    let fileType = 'pdf';
    if (file.type.startsWith('image/')) {
      fileType = 'image';
    } else if (file.type.includes('excel') || file.type.includes('spreadsheet') ||
               fileExtension === '.xls' || fileExtension === '.xlsx') {
      fileType = 'excel';
    }

    // Create document object
    const doc = {
      id: Date.now().toString(),
      name: file.name,
      size: file.size,
      type: file.type,
      fileType: fileType,
      data: base64Data,
      thumbnail: thumbnail,
      createdAt: Date.now()
    };

    // Add to category
    documents[category].push(doc);

    // Save and render
    await saveDocuments();
    renderDocuments(category);
    updateDocumentCount(category);

  } catch (error) {
    console.error('Error uploading file:', error);
    alert('Error uploading file. Please try again.');
  }

  // Reset file input
  event.target.value = '';
  currentUploadCategory = null;
}

// Read file as base64
function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Generate PDF thumbnail using canvas
async function generatePDFThumbnail(base64Data) {
  // For now, return null and use placeholder
  // In a full implementation, you would use PDF.js here
  return null;
}

// Render all document categories
function renderAllDocuments() {
  renderDocuments('resumes');
  renderDocuments('coverLetters');
  renderDocuments('portfolio');
  updateDocumentCount('resumes');
  updateDocumentCount('coverLetters');
  updateDocumentCount('portfolio');
}

// Render documents for a category
function renderDocuments(category) {
  const gridId = {
    resumes: 'resumesGrid',
    coverLetters: 'coverLettersGrid',
    portfolio: 'portfolioGrid'
  }[category];

  const grid = document.getElementById(gridId);
  const docs = documents[category];

  if (docs.length === 0) {
    // Show empty state
    const emptyStates = {
      resumes: `
        <div class="empty-docs-state">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="currentColor" stroke-width="2" stroke-dasharray="4 2"/>
            <path d="M12 11v6M9 14h6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
          <p>No resumes uploaded</p>
          <span>Click "Add" to upload your resume</span>
        </div>`,
      coverLetters: `
        <div class="empty-docs-state">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="currentColor" stroke-width="2" stroke-dasharray="4 2"/>
            <path d="M12 11v6M9 14h6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
          <p>No cover letters uploaded</p>
          <span>Click "Add" to upload a cover letter</span>
        </div>`,
      portfolio: `
        <div class="empty-docs-state">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="2" y="3" width="20" height="14" rx="2" stroke="currentColor" stroke-width="2" stroke-dasharray="4 2"/>
            <path d="M12 9v6M9 12h6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
          <p>No portfolio items uploaded</p>
          <span>Click "Add" to upload portfolio work</span>
        </div>`
    };
    grid.innerHTML = emptyStates[category];
    return;
  }

  // Render document cards
  grid.innerHTML = docs.map(doc => {
    const fileType = doc.fileType || 'pdf';
    let thumbnailHTML = '';

    if (doc.thumbnail) {
      // Use thumbnail if available (PDF generated or image file)
      thumbnailHTML = `<img src="${doc.thumbnail}" alt="${doc.name}">`;
    } else if (fileType === 'excel') {
      // Excel file placeholder
      thumbnailHTML = `
        <div class="doc-thumbnail-placeholder excel">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2"/>
            <path d="M3 9h18M9 3v18" stroke="currentColor" stroke-width="2"/>
            <path d="M12 12l3 3M15 12l-3 3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
          <span>Excel</span>
        </div>`;
    } else if (fileType === 'image') {
      // Image without thumbnail (fallback)
      thumbnailHTML = `
        <div class="doc-thumbnail-placeholder image">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2"/>
            <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor"/>
            <path d="M21 15l-5-5L5 21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
          <span>Image</span>
        </div>`;
    } else {
      // PDF placeholder
      thumbnailHTML = `
        <div class="doc-thumbnail-placeholder">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="currentColor" stroke-width="2"/>
            <path d="M14 2v6h6" stroke="currentColor" stroke-width="2"/>
          </svg>
          <span>PDF</span>
        </div>`;
    }

    return `
      <div class="doc-card"
           data-id="${doc.id}"
           data-category="${category}"
           data-file-type="${fileType}"
           draggable="true"
           title="${doc.name}">
        <div class="doc-drag-handle">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
            <circle cx="9" cy="6" r="1.5" fill="currentColor"/>
            <circle cx="15" cy="6" r="1.5" fill="currentColor"/>
            <circle cx="9" cy="12" r="1.5" fill="currentColor"/>
            <circle cx="15" cy="12" r="1.5" fill="currentColor"/>
            <circle cx="9" cy="18" r="1.5" fill="currentColor"/>
            <circle cx="15" cy="18" r="1.5" fill="currentColor"/>
          </svg>
        </div>
        <div class="doc-thumbnail">${thumbnailHTML}</div>
        <div class="doc-name">${truncateName(doc.name)}</div>
        <div class="doc-size">${formatFileSize(doc.size)}</div>
      </div>
    `;
  }).join('');

  // Add click listeners to doc cards
  grid.querySelectorAll('.doc-card').forEach(card => {
    card.addEventListener('click', () => openPreviewModal(card.dataset.id, card.dataset.category));

    // Drag and drop functionality
    card.addEventListener('dragstart', handleDragStart);
    card.addEventListener('dragend', handleDragEnd);
  });
}

// Update document count display
function updateDocumentCount(category) {
  const countId = {
    resumes: 'resumeCount',
    coverLetters: 'coverLetterCount',
    portfolio: 'portfolioCount'
  }[category];

  const count = documents[category].length;
  const limit = DOCUMENT_LIMITS[category];
  document.getElementById(countId).textContent = `${count}/${limit}`;

  // Disable add button if at limit
  const btnId = {
    resumes: 'addResumeBtn',
    coverLetters: 'addCoverLetterBtn',
    portfolio: 'addPortfolioBtn'
  }[category];
  document.getElementById(btnId).disabled = count >= limit;
}

// Truncate filename for display
function truncateName(name) {
  const maxLength = 12;
  if (name.length <= maxLength) return name;
  const ext = name.split('.').pop();
  const baseName = name.slice(0, maxLength - ext.length - 4);
  return `${baseName}...${ext}`;
}

// Format file size
function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// Update storage info
async function updateStorageInfo() {
  try {
    let totalSize = 0;

    // Calculate total size of all documents
    for (const category of Object.keys(documents)) {
      for (const doc of documents[category]) {
        totalSize += doc.size;
      }
    }

    // With unlimitedStorage, we show usage but not a strict limit
    const usedText = formatFileSize(totalSize);
    document.getElementById('storageUsed').textContent = usedText;
    document.getElementById('storageTotal').textContent = 'Unlimited';

    // Update storage bar (use 100MB as visual reference)
    const visualLimit = 100 * 1024 * 1024;
    const percentage = Math.min((totalSize / visualLimit) * 100, 100);
    const storageFill = document.getElementById('storageFill');
    storageFill.style.width = percentage + '%';

    // Add warning/danger classes
    storageFill.classList.remove('warning', 'danger');
    if (percentage > 90) {
      storageFill.classList.add('danger');
    } else if (percentage > 70) {
      storageFill.classList.add('warning');
    }
  } catch (error) {
    console.error('Error updating storage info:', error);
  }
}

// Open preview modal
function openPreviewModal(docId, category) {
  const doc = documents[category].find(d => d.id === docId);
  if (!doc) return;

  currentPreviewDoc = { ...doc, category };
  currentPreviewPage = 1;

  document.getElementById('previewDocName').textContent = doc.name;
  document.getElementById('docPreviewModal').classList.remove('hidden');

  // Render preview based on file type
  const fileType = doc.fileType || 'pdf';
  if (fileType === 'image') {
    renderImagePreview(doc.data, doc.name);
  } else if (fileType === 'excel') {
    renderExcelPreview(doc.name);
  } else {
    renderPDFPreview(doc.data);
  }
}

// Render image preview
function renderImagePreview(base64Data, name) {
  const previewContent = document.getElementById('docPreviewContent');

  previewContent.innerHTML = `
    <div class="image-preview-container">
      <img src="${base64Data}" alt="${name}" class="image-preview" />
    </div>
  `;

  // Hide page navigation for images
  document.getElementById('previewPageInfo').textContent = 'Image preview';
  document.getElementById('prevPageBtn').style.display = 'none';
  document.getElementById('nextPageBtn').style.display = 'none';
}

// Render Excel preview (placeholder since we can't preview Excel in browser)
function renderExcelPreview(name) {
  const previewContent = document.getElementById('docPreviewContent');

  previewContent.innerHTML = `
    <div class="excel-preview-placeholder">
      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2"/>
        <path d="M3 9h18M9 3v18" stroke="currentColor" stroke-width="2"/>
        <path d="M12 12l3 3M15 12l-3 3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
      <h4>Excel File</h4>
      <p>${name}</p>
      <span class="excel-hint">Preview not available for Excel files.<br>Click Download to open in Excel.</span>
    </div>
  `;

  // Hide page navigation for Excel
  document.getElementById('previewPageInfo').textContent = 'Excel file';
  document.getElementById('prevPageBtn').style.display = 'none';
  document.getElementById('nextPageBtn').style.display = 'none';
}

// Render PDF preview using iframe
function renderPDFPreview(base64Data) {
  const previewContent = document.getElementById('docPreviewContent');

  // Create blob from base64
  const byteCharacters = atob(base64Data.split(',')[1]);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: 'application/pdf' });
  const blobUrl = URL.createObjectURL(blob);

  // Use embed element for PDF preview
  previewContent.innerHTML = `
    <embed
      src="${blobUrl}#toolbar=0&navpanes=0"
      type="application/pdf"
      width="100%"
      height="100%"
      style="border: none; border-radius: 8px;"
    />
  `;

  // Hide page navigation since embed handles it
  document.getElementById('previewPageInfo').textContent = 'Use scroll to navigate';
  document.getElementById('prevPageBtn').style.display = 'none';
  document.getElementById('nextPageBtn').style.display = 'none';
}

// Close preview modal
function closePreviewModal() {
  document.getElementById('docPreviewModal').classList.add('hidden');
  document.getElementById('docPreviewContent').innerHTML = '';
  currentPreviewDoc = null;
  currentPreviewPage = 1;
  pdfDoc = null;

  // Reset page nav visibility
  document.getElementById('prevPageBtn').style.display = '';
  document.getElementById('nextPageBtn').style.display = '';
}

// Change page in preview
function changePage(delta) {
  if (!pdfDoc) return;

  const newPage = currentPreviewPage + delta;
  if (newPage < 1 || newPage > pdfDoc.numPages) return;

  currentPreviewPage = newPage;
  // Re-render page would go here with PDF.js
}

// Download current document
function downloadCurrentDoc() {
  if (!currentPreviewDoc) return;

  const link = document.createElement('a');
  link.href = currentPreviewDoc.data;
  link.download = currentPreviewDoc.name;
  link.click();
}

// Delete current document
async function deleteCurrentDoc() {
  if (!currentPreviewDoc) return;

  if (!confirm(`Are you sure you want to delete "${currentPreviewDoc.name}"?`)) return;

  const category = currentPreviewDoc.category;
  documents[category] = documents[category].filter(d => d.id !== currentPreviewDoc.id);

  await saveDocuments();
  renderDocuments(category);
  updateDocumentCount(category);
  closePreviewModal();
}

// Drag and drop handlers
function handleDragStart(event) {
  const card = event.target.closest('.doc-card');
  if (!card) return;

  card.classList.add('dragging');

  const docId = card.dataset.id;
  const category = card.dataset.category;
  const doc = documents[category].find(d => d.id === docId);

  if (!doc) return;

  // Determine MIME type based on file type
  const mimeType = doc.type || 'application/pdf';

  // Set drag data - the file data for dropping into other applications
  event.dataTransfer.setData('text/plain', doc.name);
  event.dataTransfer.setData(mimeType, doc.data);

  // Create a file from the base64 data for drag-and-drop
  try {
    const byteCharacters = atob(doc.data.split(',')[1]);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const file = new File([byteArray], doc.name, { type: mimeType });

    // For some browsers, we can set the file directly
    if (event.dataTransfer.items) {
      event.dataTransfer.items.add(file);
    }
  } catch (error) {
    console.error('Error setting drag data:', error);
  }

  event.dataTransfer.effectAllowed = 'copy';
}

function handleDragEnd(event) {
  const card = event.target.closest('.doc-card');
  if (card) {
    card.classList.remove('dragging');
  }
}

// Cloud sync toggle handler
async function handleCloudSyncToggle(event) {
  const isEnabled = event.target.checked;
  const statusElement = document.getElementById('syncStatus');

  if (isEnabled) {
    // Check if user is authenticated
    const { authToken } = await chrome.storage.local.get('authToken');

    if (!authToken) {
      alert('Please log in to JobFiltr to enable cloud sync.');
      event.target.checked = false;
      return;
    }

    statusElement.textContent = 'Syncing...';

    try {
      // Sync documents to cloud (placeholder for actual implementation)
      await syncDocumentsToCloud();
      statusElement.textContent = 'Synced to cloud';

      // Save sync preference
      await chrome.storage.local.set({ cloudSyncEnabled: true });
    } catch (error) {
      console.error('Error syncing to cloud:', error);
      statusElement.textContent = 'Sync failed';
      event.target.checked = false;
    }
  } else {
    statusElement.textContent = 'Local only';
    await chrome.storage.local.set({ cloudSyncEnabled: false });
  }
}

// Sync documents to cloud (placeholder)
async function syncDocumentsToCloud() {
  // This would integrate with Convex backend
  // For now, just simulate a sync
  return new Promise(resolve => setTimeout(resolve, 1000));
}

// Load cloud sync preference
async function loadCloudSyncPreference() {
  try {
    const result = await chrome.storage.local.get(['cloudSyncEnabled', 'authToken']);

    if (result.cloudSyncEnabled && result.authToken) {
      document.getElementById('cloudSyncToggle').checked = true;
      document.getElementById('syncStatus').textContent = 'Synced to cloud';
    }
  } catch (error) {
    console.error('Error loading sync preference:', error);
  }
}

// Initialize documents when tab is shown
document.querySelector('[data-tab="documents"]')?.addEventListener('click', () => {
  if (!documents.resumes.length && !documents.coverLetters.length && !documents.portfolio.length) {
    initializeDocuments();
  }
});

// Initialize on DOMContentLoaded (deferred)
document.addEventListener('DOMContentLoaded', () => {
  // Defer documents initialization until tab is accessed
  setTimeout(() => {
    initializeDocuments();
    loadCloudSyncPreference();
  }, 100);
});
