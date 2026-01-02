// Background service worker for JobFiltr Chrome Extension

// Default Convex URL
const DEFAULT_CONVEX_URL = 'https://reminiscent-goldfish-690.convex.cloud';

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

console.log('JobFiltr background service worker loaded');
