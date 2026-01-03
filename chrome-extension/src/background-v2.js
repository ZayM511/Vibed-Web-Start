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

// ===== PANEL WINDOW MANAGEMENT =====
let panelWindowId = null;
let lastActiveJobTabId = null;

// Track active job site tabs
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (tab.url && (tab.url.includes('linkedin.com') || tab.url.includes('indeed.com'))) {
      lastActiveJobTabId = activeInfo.tabId;
      console.log('JobFiltr: Tracking job site tab:', activeInfo.tabId);
    }
  } catch (error) {
    console.error('JobFiltr: Error tracking tab:', error);
  }
});

// Handle panel-related messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'openPanel') {
    openPanelWindow(message.dock).then(sendResponse);
    return true;
  }

  if (message.action === 'closePanel') {
    if (panelWindowId) {
      chrome.windows.remove(panelWindowId).catch(() => {});
      panelWindowId = null;
    }
    sendResponse({ success: true });
    return true;
  }

  if (message.action === 'repositionPanel') {
    repositionPanel(message.dock).then(sendResponse);
    return true;
  }

  if (message.action === 'getWindowInfo') {
    if (panelWindowId) {
      chrome.windows.get(panelWindowId).then(win => {
        sendResponse({ left: win.left, top: win.top, width: win.width, height: win.height });
      }).catch(() => sendResponse(null));
      return true;
    }
    sendResponse(null);
    return true;
  }

  if (message.action === 'movePanel') {
    if (panelWindowId) {
      chrome.windows.update(panelWindowId, { left: message.left }).catch(() => {});
    }
    sendResponse({ success: true });
    return true;
  }

  if (message.action === 'snapToEdge') {
    snapPanelToEdge(message.dock).then(sendResponse);
    return true;
  }

  if (message.action === 'getDisplayForPosition') {
    chrome.system.display.getInfo().then(displays => {
      const display = displays.find(d => {
        const left = d.workArea.left;
        const right = left + d.workArea.width;
        return message.left >= left && message.left < right;
      });
      sendResponse(display || null);
    }).catch(() => sendResponse(null));
    return true;
  }

  if (message.action === 'getActiveJobTab') {
    getActiveJobTab().then(tab => sendResponse({ tab })).catch(() => sendResponse({ tab: null }));
    return true;
  }

  return false;
});

async function getActiveJobTab() {
  // First try the last known job tab
  if (lastActiveJobTabId) {
    try {
      const tab = await chrome.tabs.get(lastActiveJobTabId);
      if (tab.url && (tab.url.includes('linkedin.com') || tab.url.includes('indeed.com'))) {
        return tab;
      }
    } catch (error) {}
  }

  // Find any active job site tab
  const tabs = await chrome.tabs.query({ active: true });
  for (const tab of tabs) {
    if (tab.url && (tab.url.includes('linkedin.com') || tab.url.includes('indeed.com'))) {
      lastActiveJobTabId = tab.id;
      return tab;
    }
  }

  // Find any job site tab
  const allTabs = await chrome.tabs.query({});
  for (const tab of allTabs) {
    if (tab.url && (tab.url.includes('linkedin.com') || tab.url.includes('indeed.com'))) {
      return tab;
    }
  }

  return null;
}

async function openPanelWindow(dock = 'left') {
  const panelWidth = 380;
  const displays = await chrome.system.display.getInfo();
  const primaryDisplay = displays.find(d => d.isPrimary) || displays[0];
  const { workArea } = primaryDisplay;

  const left = dock === 'right' ? workArea.left + workArea.width - panelWidth : workArea.left;

  const win = await chrome.windows.create({
    url: `popup-v2.html?mode=panel&dock=${dock}`,
    type: 'popup',
    width: panelWidth,
    height: workArea.height,
    left: left,
    top: workArea.top,
    focused: false
  });

  panelWindowId = win.id;

  // Keep panel always on top by re-focusing when another window gets focus
  chrome.windows.onFocusChanged.addListener(async (windowId) => {
    if (windowId !== chrome.windows.WINDOW_ID_NONE && windowId !== panelWindowId && panelWindowId) {
      // Don't steal focus, but ensure panel is visible
      try {
        await chrome.windows.update(panelWindowId, { focused: false });
      } catch (error) {}
    }
  });

  return { success: true, windowId: win.id };
}

async function repositionPanel(dock) {
  if (!panelWindowId) return { success: false };

  const panelWidth = 380;
  const displays = await chrome.system.display.getInfo();
  const primaryDisplay = displays.find(d => d.isPrimary) || displays[0];
  const { workArea } = primaryDisplay;

  const left = dock === 'right' ? workArea.left + workArea.width - panelWidth : workArea.left;

  await chrome.windows.update(panelWindowId, { left, top: workArea.top, height: workArea.height });
  return { success: true };
}

async function snapPanelToEdge(dock) {
  if (!panelWindowId) return { success: false };

  const panelWidth = 380;
  const currentWindow = await chrome.windows.get(panelWindowId);
  const displays = await chrome.system.display.getInfo();

  // Find which display the panel is on
  const display = displays.find(d => {
    const left = d.workArea.left;
    const right = left + d.workArea.width;
    return currentWindow.left >= left && currentWindow.left < right;
  }) || displays[0];

  const { workArea } = display;
  const left = dock === 'right' ? workArea.left + workArea.width - panelWidth : workArea.left;

  await chrome.windows.update(panelWindowId, { left });
  return { success: true };
}

console.log('JobFiltr: Background service worker ready');
