import { LinkedInAdapter } from './platforms/linkedin';
import { IndeedAdapter } from './platforms/indeed';
import { FilterEngine } from './filterEngine';
import type { PlatformAdapter } from '@/types';

// Platform detector utility
class PlatformDetector {
  static detectPlatform(): 'linkedin' | 'indeed' | null {
    const hostname = window.location.hostname.toLowerCase();

    if (hostname.includes('linkedin.com')) return 'linkedin';
    if (hostname.includes('indeed.com') || hostname.includes('indeed.')) return 'indeed';

    return null;
  }
}

// Global engine reference for message handling
let engine: FilterEngine | null = null;

async function initJobFiltr() {
  console.log('[JobFiltr] Initializing...');

  // Step 1: Detect platform
  const platform = PlatformDetector.detectPlatform();
  if (!platform) {
    console.log('[JobFiltr] Not on a supported platform');
    return;
  }

  console.log(`[JobFiltr] Detected platform: ${platform}`);

  // Step 2: Instantiate correct adapter
  const adapter: PlatformAdapter = platform === 'linkedin'
    ? new LinkedInAdapter()
    : new IndeedAdapter();

  // Step 3: Initialize FilterEngine
  engine = new FilterEngine(adapter);
  await engine.init();

  // Step 4: Process existing jobs
  await engine.processJobs();

  // Step 5: Watch for new jobs (infinite scroll)
  adapter.observeNewJobs(async (newCards) => {
    console.log(`[JobFiltr] Processing ${newCards.length} new jobs`);
    await engine?.processNewCards(newCards);
  });

  // Step 6: Notify popup of platform detection
  try {
    chrome.runtime.sendMessage({
      type: 'PLATFORM_DETECTED',
      payload: { platform }
    }).catch(() => {
      // Extension context may be invalidated
    });
  } catch {
    // Ignore errors if chrome runtime is unavailable
  }

  console.log(`[JobFiltr] Ready on ${platform}`);
}

// Run when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initJobFiltr);
} else {
  initJobFiltr();
}

// Listen for settings updates from popup
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'SETTINGS_UPDATED') {
    console.log('[JobFiltr] Settings updated, refreshing...');

    // Re-initialize with new settings
    if (engine) {
      engine.refresh().then(() => {
        engine?.processJobs();
      });
    } else {
      initJobFiltr();
    }
  }

  if (message.type === 'GET_STATS') {
    const stats = engine?.getStats() ||
      (window as unknown as Record<string, unknown>).__jobfiltr_stats ||
      {};
    sendResponse({ stats });
  }

  // Required for async response
  return true;
});

// Re-process when URL changes (SPA navigation)
let lastUrl = window.location.href;
const urlObserver = new MutationObserver(() => {
  if (window.location.href !== lastUrl) {
    lastUrl = window.location.href;
    console.log('[JobFiltr] URL changed, re-processing...');

    // Delay to let DOM update
    setTimeout(() => {
      engine?.processJobs();
    }, 1000);
  }
});

urlObserver.observe(document.body, { childList: true, subtree: true });
