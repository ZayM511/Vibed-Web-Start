// JobFiltr - Background Service Worker
// Handles API communication and cross-tab messaging

console.log('JobFiltr: Background service worker loaded');

// ===== INSTALLATION =====
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('JobFiltr: First time installation');

    // Set default filter settings
    chrome.storage.local.set({
      filterSettings: {
        hideStaffing: true,
        hideSponsored: true,
        filterApplicants: false,
        applicantRange: 'under10',
        entryLevelAccuracy: true,
        filterSalary: false,
        minSalary: '',
        maxSalary: '',
        showActiveRecruiting: true,
        showJobAge: true,
        hideApplied: false,
        visaOnly: false,
        easyApplyOnly: false
      },
      scanHistory: []
    });

    // Open welcome page
    chrome.tabs.create({
      url: 'https://jobfiltr.com/extension-installed'
    });
  } else if (details.reason === 'update') {
    console.log('JobFiltr: Extension updated');
  }
});

// ===== MESSAGE HANDLING =====
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('JobFiltr: Message received:', message.type);

  if (message.type === 'FILTER_STATS_UPDATE') {
    // Update badge with hidden jobs count
    const count = message.hiddenCount || 0;
    chrome.action.setBadgeText({
      text: count > 0 ? count.toString() : '',
      tabId: sender.tab.id
    });
    chrome.action.setBadgeBackgroundColor({
      color: '#6366f1',
      tabId: sender.tab.id
    });
  }

  if (message.type === 'SCAN_JOB') {
    // Handle job scanning via backend API
    handleJobScan(message.data)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep channel open for async response
  }

  if (message.type === 'AUTH_REQUIRED') {
    // Handle authentication requirement
    chrome.tabs.create({
      url: 'https://jobfiltr.com/login?redirect=extension'
    });
  }

  return true;
});

// ===== JOB SCANNING =====
async function handleJobScan(jobData) {
  try {
    // Get user authentication token
    const { authToken } = await chrome.storage.local.get('authToken');

    if (!authToken) {
      throw new Error('Authentication required');
    }

    // Call Convex backend API
    const response = await fetch('https://reminiscent-goldfish-690.convex.cloud/scan-job', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify(jobData)
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    const result = await response.json();

    return {
      success: true,
      data: result
    };

  } catch (error) {
    console.error('JobFiltr: Error scanning job:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// ===== TAB UPDATES =====
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    // Clear badge when navigating to new page
    if (!tab.url.includes('linkedin.com') &&
        !tab.url.includes('indeed.com') &&
        !tab.url.includes('google.com')) {
      chrome.action.setBadgeText({ text: '', tabId });
    }
  }
});

// ===== STORAGE SYNC =====
// Periodically sync settings with backend (if user is logged in)
async function syncWithBackend() {
  try {
    const { authToken } = await chrome.storage.local.get('authToken');

    if (!authToken) return;

    const { filterSettings } = await chrome.storage.local.get('filterSettings');

    // Sync settings to Convex backend
    await fetch('https://reminiscent-goldfish-690.convex.cloud/sync-settings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ filterSettings })
    });

    console.log('JobFiltr: Settings synced with backend');

  } catch (error) {
    console.error('JobFiltr: Sync error:', error);
  }
}

// Sync every 5 minutes
setInterval(syncWithBackend, 5 * 60 * 1000);

// ===== CONTEXT MENUS =====
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'scan-job',
    title: 'Scan This Job with JobFiltr',
    contexts: ['page'],
    documentUrlPatterns: [
      'https://*.linkedin.com/jobs/*',
      'https://*.indeed.com/*',
      'https://*.google.com/search*'
    ]
  });

  chrome.contextMenus.create({
    id: 'apply-filters',
    title: 'Apply JobFiltr Filters',
    contexts: ['page'],
    documentUrlPatterns: [
      'https://*.linkedin.com/jobs/*',
      'https://*.indeed.com/*',
      'https://*.google.com/search*'
    ]
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'scan-job') {
    // Open popup or trigger scan
    chrome.action.openPopup();
  }

  if (info.menuItemId === 'apply-filters') {
    // Send message to content script to apply filters
    chrome.tabs.sendMessage(tab.id, {
      type: 'APPLY_FILTERS_FROM_CONTEXT'
    });
  }
});

console.log('JobFiltr: Background service worker ready');
