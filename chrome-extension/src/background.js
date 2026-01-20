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

  // Toggle side-by-side mode (keeps panel visible when navigating)
  if (request.action === 'setSideBySideMode') {
    sideBySideEnabled = request.enabled;
    // Save preference
    chrome.storage.local.set({ sideBySideEnabled: request.enabled });

    // If enabling and panel is open, arrange immediately
    if (sideBySideEnabled && panelWindowId && mainBrowserWindowId) {
      ensureSideBySideArrangement(mainBrowserWindowId)
        .then(() => sendResponse({ success: true, enabled: sideBySideEnabled }))
        .catch(error => sendResponse({ success: false, error: error.message }));
    } else if (!sideBySideEnabled && mainBrowserWindowId) {
      // If disabling, restore main window
      restoreMainWindowSize()
        .then(() => sendResponse({ success: true, enabled: sideBySideEnabled }))
        .catch(error => sendResponse({ success: false, error: error.message }));
    } else {
      sendResponse({ success: true, enabled: sideBySideEnabled });
    }
    return true;
  }

  // Get current side-by-side mode status
  if (request.action === 'getSideBySideMode') {
    sendResponse({ enabled: sideBySideEnabled });
    return true;
  }

  // Get active tab from main browser window (for panel mode site detection)
  if (request.action === 'getActiveJobTab') {
    getActiveJobTab()
      .then(tab => sendResponse({ tab }))
      .catch(error => {
        console.error('Error getting active job tab:', error);
        sendResponse({ tab: null });
      });
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

// Get the active tab from the main browser window (not the panel) for site detection
async function getActiveJobTab() {
  try {
    // First, try to use the tracked mainBrowserWindowId if available
    if (mainBrowserWindowId) {
      try {
        const win = await chrome.windows.get(mainBrowserWindowId);
        if (win) {
          const tabs = await chrome.tabs.query({ active: true, windowId: mainBrowserWindowId });
          if (tabs.length > 0 && tabs[0].url) {
            console.log('Found active job tab from tracked main window:', tabs[0].url);
            return tabs[0];
          }
        }
      } catch (e) {
        // Window no longer exists, clear the reference
        mainBrowserWindowId = null;
      }
    }

    // Fallback: Get all normal windows and find the best candidate
    const windows = await chrome.windows.getAll({ windowTypes: ['normal'] });

    // Filter out the panel window and find the last focused normal window
    let targetWindow = null;
    let focusedWindow = null;

    for (const win of windows) {
      // Skip the panel window (check by ID)
      if (panelWindowId && win.id === panelWindowId) continue;

      // Track focused window
      if (win.focused) {
        focusedWindow = win;
      }

      // Take any normal window as fallback
      if (!targetWindow) {
        targetWindow = win;
      }
    }

    // Prefer focused window, fall back to any normal window
    targetWindow = focusedWindow || targetWindow;

    if (!targetWindow) {
      console.log('No suitable browser window found');
      return null;
    }

    // Update mainBrowserWindowId for future reference
    mainBrowserWindowId = targetWindow.id;

    // Get the active tab in this window
    const tabs = await chrome.tabs.query({ active: true, windowId: targetWindow.id });

    if (tabs.length === 0) {
      console.log('No active tab in target window');
      return null;
    }

    const tab = tabs[0];
    console.log('Found active job tab:', tab.url);

    return tab;
  } catch (error) {
    console.error('Error in getActiveJobTab:', error);
    return null;
  }
}

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
    // Get all windows and find the last focused normal browser window
    // This is more reliable than getCurrent() which can return popup windows
    const allWindows = await chrome.windows.getAll({ windowTypes: ['normal'] });

    // Try to get the last focused window first
    let currentWindow = null;
    try {
      currentWindow = await chrome.windows.getLastFocused({ windowTypes: ['normal'] });
    } catch (e) {
      // Fallback: find any normal window
      currentWindow = allWindows.find(w => w.focused) || allWindows[0];
    }

    // If we still don't have a window, try any window
    if (!currentWindow && allWindows.length > 0) {
      currentWindow = allWindows[0];
    }

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

  // Arrange main browser window side-by-side with panel
  // Find a normal browser window to use as main browser (may not be focused since panel just got focus)
  try {
    const allWindows = await chrome.windows.getAll({ windowTypes: ['normal'] });
    // Find any normal window that's not the panel - prefer previously focused or largest
    const browserWindow = allWindows.find(w => w.id !== panelWindowId);

    if (browserWindow) {
      mainBrowserWindowId = browserWindow.id;

      // Arrange side-by-side if enabled - force=true to ensure it happens
      if (sideBySideEnabled) {
        // Small delay to let panel window settle first
        setTimeout(async () => {
          try {
            await ensureSideBySideArrangement(browserWindow.id, true); // force=true
            console.log('Arranged browser window on panel open');
          } catch (e) {
            console.log('Error arranging on panel open:', e);
          }
        }, 200);
      }
    }
  } catch (e) {
    console.log('Could not arrange side-by-side on panel open:', e);
  }

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
    // Restore main window to full width when panel is closed
    restoreMainWindowSize();
  }
});

// ===== PERSISTENT PANEL - KEEP VISIBLE WHEN NAVIGATING =====
// Track the main browser window we're working alongside
let mainBrowserWindowId = null;
let sideBySideEnabled = true; // Enable side-by-side arrangement by default
let isArrangingWindows = false; // Prevent re-entry during arrangement
let lastArrangementTime = 0; // Debounce arrangement calls

// Keep panel visible when user focuses on main browser window
// Uses side-by-side arrangement so windows don't overlap
chrome.windows.onFocusChanged.addListener(async (windowId) => {
  // Ignore if no panel is open or if focus went to nothing
  if (!panelWindowId || windowId === chrome.windows.WINDOW_ID_NONE) return;

  // If the panel itself got focus, no action needed
  if (windowId === panelWindowId) return;

  // Prevent re-entry while we're arranging windows
  if (isArrangingWindows) return;

  // Debounce - don't arrange more than once per second
  const now = Date.now();
  if (now - lastArrangementTime < 1000) return;

  try {
    // Get the focused window info
    const focusedWindow = await chrome.windows.get(windowId);

    // Only act on normal browser windows (not popups, devtools, etc.)
    if (focusedWindow.type !== 'normal') return;

    // Store this as our main browser window
    mainBrowserWindowId = windowId;
    lastArrangementTime = now;

    // Ensure side-by-side arrangement if enabled
    if (sideBySideEnabled) {
      isArrangingWindows = true;
      try {
        await ensureSideBySideArrangement(windowId, true); // force=true

        // Also use drawAttention to make panel visible without stealing focus
        await chrome.windows.update(panelWindowId, { drawAttention: true });
        // Clear the attention after a brief moment
        setTimeout(async () => {
          try {
            await chrome.windows.update(panelWindowId, { drawAttention: false });
          } catch (e) { /* panel might be closed */ }
        }, 100);
      } finally {
        // Reset flag after a delay to allow arrangement to settle
        setTimeout(() => {
          isArrangingWindows = false;
        }, 500);
      }
    }
  } catch (error) {
    // Window might not exist anymore
    console.log('Focus change handling error:', error);
    isArrangingWindows = false;
  }
});

// Ensure main browser window and panel are arranged side-by-side
// force: if true, always resize; if false, only resize if windows overlap
async function ensureSideBySideArrangement(browserWindowId, force = false) {
  if (!panelWindowId) return;

  try {
    const panelState = await chrome.storage.local.get(['panelState']);
    const dock = panelState?.panelState?.dock || 'right';

    const panelWindow = await chrome.windows.get(panelWindowId);
    const browserWindow = await chrome.windows.get(browserWindowId);
    const displays = await chrome.system.display.getInfo();

    // Find which display the panel is on
    const display = findDisplayForWindow(panelWindow, displays);
    if (!display) return;

    const workArea = display.workArea;
    const availableWidth = workArea.width - PANEL_WIDTH;

    // Calculate browser window position and size based on panel dock position
    let browserLeft, browserWidth;

    if (dock === 'left') {
      // Panel on left, browser on right
      browserLeft = workArea.left + PANEL_WIDTH;
      browserWidth = availableWidth;
    } else {
      // Panel on right, browser on left
      browserLeft = workArea.left;
      browserWidth = availableWidth;
    }

    // Check if browser window is on the same display
    const browserOnSameDisplay = browserWindow.left >= workArea.left &&
                                  browserWindow.left < workArea.left + workArea.width;

    if (browserOnSameDisplay) {
      // Check if browser window overlaps with panel area
      const browserRight = browserWindow.left + browserWindow.width;
      const panelLeft = dock === 'left' ? workArea.left : workArea.left + workArea.width - PANEL_WIDTH;
      const panelRight = panelLeft + PANEL_WIDTH;

      const overlapsPanel = (browserWindow.left < panelRight && browserRight > panelLeft);

      // Resize if forced OR if windows overlap
      if (force || overlapsPanel) {
        // Resize browser window to fit beside panel
        await chrome.windows.update(browserWindowId, {
          left: browserLeft,
          width: browserWidth,
          top: workArea.top,
          height: workArea.height
        });
        console.log(`Arranged browser window side-by-side (dock: ${dock}, force: ${force})`);
      }
    }
  } catch (error) {
    console.log('Side-by-side arrangement error:', error);
  }
}

// Restore main window to full width when panel is closed
async function restoreMainWindowSize() {
  if (!mainBrowserWindowId) return;

  try {
    const displays = await chrome.system.display.getInfo();
    const browserWindow = await chrome.windows.get(mainBrowserWindowId);
    const display = findDisplayForWindow(browserWindow, displays);

    if (display) {
      // Restore to full width of the work area
      await chrome.windows.update(mainBrowserWindowId, {
        left: display.workArea.left,
        width: display.workArea.width
      });
    }
  } catch (error) {
    console.log('Error restoring main window size:', error);
  }

  mainBrowserWindowId = null;
}

// Restore panel state and preferences on service worker startup
chrome.storage.local.get(['panelState', 'sideBySideEnabled'], async (result) => {
  // Restore side-by-side preference (default to true)
  if (result.sideBySideEnabled !== undefined) {
    sideBySideEnabled = result.sideBySideEnabled;
  }

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
