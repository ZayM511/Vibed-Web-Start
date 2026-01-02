// Background service worker
import type { Message, MessageResponse } from './messaging';
import { getSettings, setSettings } from '../storage/hybridStorage';
import { flushEvents } from '../analytics/tracker';

// Listen for extension install/update
chrome.runtime.onInstalled.addListener((details) => {
  console.log('[JobFiltr] Extension installed:', details.reason);

  if (details.reason === 'install') {
    // Initialize default settings
    console.log('[JobFiltr] Initializing default settings');
  }
});

// Listen for messages from popup and content scripts
chrome.runtime.onMessage.addListener((message: Message, _sender, sendResponse: (response: MessageResponse) => void) => {
  handleMessage(message)
    .then(sendResponse)
    .catch((error) => sendResponse({ success: false, error: error.message }));

  // Return true to indicate async response
  return true;
});

async function handleMessage(message: Message): Promise<MessageResponse> {
  switch (message.type) {
    case 'GET_SETTINGS':
      const settings = await getSettings();
      return { success: true, data: settings };

    case 'SET_SETTINGS':
      await setSettings(message.payload as any);
      return { success: true };

    case 'FLUSH_ANALYTICS':
      await flushEvents();
      return { success: true };

    default:
      return { success: false, error: `Unknown message type: ${message.type}` };
  }
}

// Set up alarm for periodic analytics flush
chrome.alarms.create('flushAnalytics', { periodInMinutes: 5 });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'flushAnalytics') {
    flushEvents().catch(console.error);
  }
});

// Listen for tab updates to inject content script
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    const isSupported =
      tab.url.includes('linkedin.com/jobs') ||
      tab.url.includes('indeed.com');

    if (isSupported) {
      console.log('[JobFiltr] Supported job site detected:', tab.url);
    }
  }
});

console.log('[JobFiltr] Service worker initialized');
