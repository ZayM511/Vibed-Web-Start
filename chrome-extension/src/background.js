// Background service worker for JobFiltr Chrome Extension

// Default Convex URL
const DEFAULT_CONVEX_URL = 'https://reminiscent-goldfish-690.convex.cloud';

// Panel window management
let panelWindowId = null;
const PANEL_WIDTH = 380;
const PANEL_HEIGHT = 700;

// Installation handler
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // First-time installation
    console.log('JobFiltr extension installed');

    // Set default settings
    chrome.storage.sync.set({
      convexUrl: DEFAULT_CONVEX_URL,
      autoScan: false,
      notifications: true
    });

    // Open settings page on first install
    chrome.runtime.openOptionsPage();
  } else if (details.reason === 'update') {
    // Extension updated
    console.log('JobFiltr extension updated');
  }

  // Create context menu on install/update
  chrome.contextMenus.create({
    id: 'scan-job',
    title: 'Scan with JobFiltr',
    contexts: ['page', 'selection'],
    documentUrlPatterns: [
      '*://*.linkedin.com/jobs/*',
      '*://*.indeed.com/*',
      '*://*.glassdoor.com/*',
      '*://*.monster.com/*',
      '*://*.ziprecruiter.com/*',
      '*://*.careerbuilder.com/*'
    ]
  });
});

// Listen for tab updates to detect job pages
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    checkIfJobPage(tab.url, tabId);
  }
});

// Check if current page is a supported job site
function checkIfJobPage(url, tabId) {
  const jobSites = [
    'linkedin.com/jobs',
    'indeed.com/viewjob',
    'indeed.com/rc/clk',
    'glassdoor.com/job-listing',
    'monster.com/job-openings',
    'ziprecruiter.com/c',
    'careerbuilder.com/job'
  ];

  const isJobPage = jobSites.some(site => url.includes(site));

  if (isJobPage) {
    // Update badge to show extension is active
    chrome.action.setBadgeText({ text: '✓', tabId });
    chrome.action.setBadgeBackgroundColor({ color: '#10B981', tabId });

    // Check if auto-scan is enabled
    chrome.storage.sync.get(['autoScan'], (result) => {
      if (result.autoScan) {
        // Auto-scan would be triggered here
        console.log('Auto-scan enabled for:', url);
      }
    });
  } else {
    // Clear badge
    chrome.action.setBadgeText({ text: '', tabId });
  }
}

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // ===== PANEL WINDOW MANAGEMENT =====
  if (request.action === 'openPanel') {
    openPanelWindow(request.dock)
      .then(windowInfo => sendResponse({ success: true, windowId: windowInfo.id }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (request.action === 'closePanel') {
    closePanelWindow()
      .then(() => sendResponse({ success: true }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (request.action === 'repositionPanel') {
    repositionPanelWindow(request.dock)
      .then(() => sendResponse({ success: true }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (request.action === 'movePanel') {
    movePanelWindow(request.left)
      .then(() => sendResponse({ success: true }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (request.action === 'getWindowInfo') {
    getPanelWindowInfo()
      .then(info => sendResponse(info))
      .catch(() => sendResponse(null));
    return true;
  }

  if (request.action === 'getDisplayForPosition') {
    getDisplayForPosition(request.left)
      .then(info => sendResponse(info))
      .catch(() => sendResponse(null));
    return true;
  }

  if (request.action === 'snapToEdge') {
    snapPanelToEdge(request.dock)
      .then(() => sendResponse({ success: true }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  // ===== EXISTING HANDLERS =====
  if (request.action === 'scanJob') {
    handleJobScan(request.data, sender.tab?.id)
      .then(result => sendResponse({ success: true, data: result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep channel open for async response
  }

  if (request.action === 'getSettings') {
    chrome.storage.sync.get(null, (settings) => {
      sendResponse(settings);
    });
    return true;
  }

  if (request.action === 'updateSettings') {
    chrome.storage.sync.set(request.settings, () => {
      sendResponse({ success: true });
    });
    return true;
  }
});

// Handle job scanning
async function handleJobScan(jobData, tabId) {
  try {
    // Get Convex URL from settings
    const settings = await chrome.storage.sync.get(['convexUrl']);

    if (!settings.convexUrl) {
      throw new Error('Convex URL not configured. Please update extension settings.');
    }

    // In production, this would call your Convex backend
    // For now, we'll return mock data
    const result = await mockScanJob(jobData);

    // Show notification if enabled
    const { notifications } = await chrome.storage.sync.get(['notifications']);
    if (notifications) {
      showNotification(result);
    }

    // Update badge based on result
    updateBadgeForResult(result, tabId);

    return result;
  } catch (error) {
    console.error('Job scan error:', error);
    throw error;
  }
}

// Mock scan function (replace with actual API call in production)
async function mockScanJob(jobData) {
  return new Promise((resolve) => {
    setTimeout(() => {
      const confidenceScore = Math.floor(Math.random() * 40) + 60;
      resolve({
        jobTitle: jobData.title,
        company: jobData.company,
        location: jobData.location,
        confidenceScore,
        isScam: Math.random() > 0.8,
        isGhostJob: Math.random() > 0.7,
        summary: `Analysis complete for ${jobData.title}`,
        redFlags: [],
        scannedAt: Date.now()
      });
    }, 2000);
  });
}

// Show notification for scan result
function showNotification(result) {
  let notificationOptions = {
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: 'JobFiltr Scan Complete',
    message: '',
    priority: 1
  };

  if (result.isScam) {
    notificationOptions.message = `⚠️ Potential scam detected: ${result.jobTitle}`;
    notificationOptions.priority = 2;
  } else if (result.isGhostJob) {
    notificationOptions.message = `⚠️ Possible ghost job: ${result.jobTitle}`;
    notificationOptions.priority = 2;
  } else {
    notificationOptions.message = `✅ Job appears legitimate: ${result.jobTitle}`;
  }

  chrome.notifications.create('jobfiltr-scan-' + Date.now(), notificationOptions);
}

// Update badge based on scan result
function updateBadgeForResult(result, tabId) {
  if (!tabId) return;

  if (result.isScam) {
    chrome.action.setBadgeText({ text: '⚠️', tabId });
    chrome.action.setBadgeBackgroundColor({ color: '#EF4444', tabId });
  } else if (result.isGhostJob) {
    chrome.action.setBadgeText({ text: '⚠', tabId });
    chrome.action.setBadgeBackgroundColor({ color: '#F59E0B', tabId });
  } else {
    chrome.action.setBadgeText({ text: '✓', tabId });
    chrome.action.setBadgeBackgroundColor({ color: '#10B981', tabId });
  }
}

// Context menu click handler
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'scan-job') {
    // Trigger scan via content script
    chrome.tabs.sendMessage(tab.id, { action: 'extractJobData' }, (jobData) => {
      if (jobData) {
        handleJobScan(jobData, tab.id);
      }
    });
  }
});

// ===== PANEL WINDOW MANAGEMENT FUNCTIONS =====

// Helper function to find which display a window is on based on its position
function findDisplayForWindow(windowInfo, displays) {
  if (!windowInfo || windowInfo.left === undefined) {
    return displays.find(d => d.isPrimary) || displays[0];
  }

  const windowCenterX = windowInfo.left + (windowInfo.width || 0) / 2;
  const windowCenterY = windowInfo.top + (windowInfo.height || 0) / 2;

  // Find the display that contains the center of the window
  for (const display of displays) {
    const bounds = display.workArea;
    if (
      windowCenterX >= bounds.left &&
      windowCenterX < bounds.left + bounds.width &&
      windowCenterY >= bounds.top &&
      windowCenterY < bounds.top + bounds.height
    ) {
      return display;
    }
  }

  // If no display found (window might be partially off-screen), find closest display
  let closestDisplay = displays[0];
  let closestDistance = Infinity;

  for (const display of displays) {
    const bounds = display.workArea;
    const displayCenterX = bounds.left + bounds.width / 2;
    const displayCenterY = bounds.top + bounds.height / 2;
    const distance = Math.sqrt(
      Math.pow(windowCenterX - displayCenterX, 2) +
      Math.pow(windowCenterY - displayCenterY, 2)
    );

    if (distance < closestDistance) {
      closestDistance = distance;
      closestDisplay = display;
    }
  }

  return closestDisplay;
}

// Get the current active browser window and its display
async function getCurrentWindowDisplay() {
  try {
    // Get the currently focused window
    const currentWindow = await chrome.windows.getCurrent();
    const displays = await chrome.system.display.getInfo();

    console.log('Current window:', currentWindow);
    console.log('Available displays:', displays.map(d => ({
      id: d.id,
      isPrimary: d.isPrimary,
      workArea: d.workArea
    })));

    const targetDisplay = findDisplayForWindow(currentWindow, displays);

    console.log('Target display:', targetDisplay.workArea);

    return {
      window: currentWindow,
      display: targetDisplay,
      displays: displays
    };
  } catch (error) {
    console.error('Error getting current window display:', error);
    // Fallback to primary display
    const displays = await chrome.system.display.getInfo();
    return {
      window: null,
      display: displays.find(d => d.isPrimary) || displays[0],
      displays: displays
    };
  }
}

// Open panel window docked to specified side ON THE SAME MONITOR as the active browser window
async function openPanelWindow(dock = 'left') {
  // Close existing panel if open
  if (panelWindowId) {
    try {
      await chrome.windows.remove(panelWindowId);
    } catch (e) {
      // Window might already be closed
    }
    panelWindowId = null;
  }

  // Get current window's display (the monitor the browser is on)
  const { display } = await getCurrentWindowDisplay();
  const workArea = display.workArea;

  // Use full height of the monitor's work area
  const screenWidth = workArea.width;
  const screenHeight = workArea.height;
  const screenLeft = workArea.left;
  const screenTop = workArea.top;

  console.log(`Opening panel on monitor: left=${screenLeft}, top=${screenTop}, width=${screenWidth}, height=${screenHeight}`);

  // Calculate position based on dock side
  let left;
  if (dock === 'left') {
    left = screenLeft;
  } else if (dock === 'right') {
    left = screenLeft + screenWidth - PANEL_WIDTH;
  } else {
    // Center
    left = screenLeft + Math.floor((screenWidth - PANEL_WIDTH) / 2);
  }

  // Create panel window with FULL HEIGHT of the monitor
  const panelWindow = await chrome.windows.create({
    url: `popup-v2.html?mode=panel&dock=${dock}`,
    type: 'popup',
    width: PANEL_WIDTH,
    height: screenHeight, // Full height of the monitor's work area
    left: left,
    top: screenTop,
    focused: true
  });

  panelWindowId = panelWindow.id;

  // Save panel state including the display info
  await chrome.storage.local.set({
    panelState: {
      isOpen: true,
      dock: dock,
      windowId: panelWindowId,
      displayId: display.id
    }
  });

  return panelWindow;
}

// Close panel window
async function closePanelWindow() {
  if (panelWindowId) {
    try {
      await chrome.windows.remove(panelWindowId);
    } catch (e) {
      // Window might already be closed
    }
    panelWindowId = null;
  }

  // Clear panel state
  await chrome.storage.local.set({
    panelState: {
      isOpen: false,
      dock: null,
      windowId: null
    }
  });
}

// Reposition panel to specified dock side on the CURRENT MONITOR where the panel is located
async function repositionPanelWindow(dock) {
  if (!panelWindowId) return;

  try {
    // Get current panel window position to determine which monitor it's on
    const panelWindow = await chrome.windows.get(panelWindowId);
    const displays = await chrome.system.display.getInfo();

    // Find which display the panel is currently on
    const currentDisplay = findDisplayForWindow(panelWindow, displays);
    const workArea = currentDisplay.workArea;

    // Calculate new position on the same monitor
    let left;
    if (dock === 'left') {
      left = workArea.left;
    } else if (dock === 'right') {
      left = workArea.left + workArea.width - PANEL_WIDTH;
    }

    // Update window position and ensure full height
    await chrome.windows.update(panelWindowId, {
      left: left,
      top: workArea.top,
      height: workArea.height
    });

    // Update stored state
    await chrome.storage.local.set({
      panelState: {
        isOpen: true,
        dock: dock,
        windowId: panelWindowId,
        displayId: currentDisplay.id
      }
    });
  } catch (error) {
    console.error('Error repositioning panel:', error);
  }
}

// Move panel to specific x position (for dragging) - supports multi-monitor
async function movePanelWindow(left) {
  if (!panelWindowId) return;

  try {
    const displays = await chrome.system.display.getInfo();

    // Calculate the total screen bounds across all monitors
    let minLeft = Infinity;
    let maxRight = -Infinity;

    for (const display of displays) {
      const workArea = display.workArea;
      minLeft = Math.min(minLeft, workArea.left);
      maxRight = Math.max(maxRight, workArea.left + workArea.width);
    }

    // Clamp to total screen bounds (allowing movement across all monitors)
    const clampedLeft = Math.max(minLeft, Math.min(left, maxRight - PANEL_WIDTH));

    await chrome.windows.update(panelWindowId, { left: clampedLeft });
  } catch (error) {
    console.error('Error moving panel:', error);
  }
}

// Get current panel window info
async function getPanelWindowInfo() {
  if (!panelWindowId) return null;

  try {
    const windowInfo = await chrome.windows.get(panelWindowId);
    return {
      id: windowInfo.id,
      left: windowInfo.left,
      top: windowInfo.top,
      width: windowInfo.width,
      height: windowInfo.height
    };
  } catch (e) {
    panelWindowId = null;
    return null;
  }
}

// Get display info for a given x position (to find which monitor the panel is on)
async function getDisplayForPosition(left) {
  if (!panelWindowId) return null;

  try {
    const panelWindow = await chrome.windows.get(panelWindowId);
    const displays = await chrome.system.display.getInfo();

    // Find display that contains this position
    const targetDisplay = findDisplayForWindow(panelWindow, displays);

    return {
      workArea: targetDisplay.workArea,
      displayId: targetDisplay.id
    };
  } catch (error) {
    console.error('Error getting display for position:', error);
    return null;
  }
}

// Snap panel to left or right edge of the monitor it's currently on
async function snapPanelToEdge(dock) {
  if (!panelWindowId) return;

  try {
    const panelWindow = await chrome.windows.get(panelWindowId);
    const displays = await chrome.system.display.getInfo();

    // Find which display the panel is currently on
    const currentDisplay = findDisplayForWindow(panelWindow, displays);
    const workArea = currentDisplay.workArea;

    // Calculate snap position
    let left;
    if (dock === 'left') {
      left = workArea.left;
    } else if (dock === 'right') {
      left = workArea.left + workArea.width - PANEL_WIDTH;
    }

    // Update window position and ensure full height
    await chrome.windows.update(panelWindowId, {
      left: left,
      top: workArea.top,
      height: workArea.height
    });

    // Update stored state
    await chrome.storage.local.set({
      panelState: {
        isOpen: true,
        dock: dock,
        windowId: panelWindowId,
        displayId: currentDisplay.id
      }
    });

    console.log(`Snapped panel to ${dock} edge of display ${currentDisplay.id}`);
  } catch (error) {
    console.error('Error snapping panel to edge:', error);
  }
}

// Track when panel window is closed manually
chrome.windows.onRemoved.addListener((windowId) => {
  if (windowId === panelWindowId) {
    panelWindowId = null;
    chrome.storage.local.set({
      panelState: {
        isOpen: false,
        dock: null,
        windowId: null
      }
    });
  }
});

// Restore panel state on service worker startup
chrome.storage.local.get(['panelState'], async (result) => {
  if (result.panelState && result.panelState.isOpen && result.panelState.windowId) {
    // Check if window still exists
    try {
      await chrome.windows.get(result.panelState.windowId);
      panelWindowId = result.panelState.windowId;
    } catch (e) {
      // Window no longer exists, clear state
      await chrome.storage.local.set({
        panelState: {
          isOpen: false,
          dock: null,
          windowId: null
        }
      });
    }
  }
});

console.log('JobFiltr background service worker loaded');
