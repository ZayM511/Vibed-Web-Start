import { supabase, isSupabaseConfigured } from '@/lib/supabase';

// ═══════════════════════════════════════════════════════════════════════════
// BADGE MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════

let filterCount = 0;

function updateBadge(count: number): void {
  filterCount = count;
  const text = count > 0 ? (count > 99 ? '99+' : count.toString()) : '';
  chrome.action.setBadgeText({ text });
  chrome.action.setBadgeBackgroundColor({
    color: count > 0 ? '#3b82f6' : '#6b7280'
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// MESSAGE HANDLING
// ═══════════════════════════════════════════════════════════════════════════

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'UPDATE_BADGE':
      updateBadge(message.payload.count);
      break;

    case 'GET_FILTER_COUNT':
      sendResponse({ count: filterCount });
      break;

    case 'SYNC_BLOCKLIST':
      syncBlocklist().then(() => sendResponse({ success: true }));
      return true; // Keep channel open for async response

    case 'CHECK_PRO_STATUS':
      checkProStatus().then(status => sendResponse(status));
      return true;

    case 'TRACK_EVENT':
      // Forward to analytics (handled by tracker)
      break;

    case 'OPEN_OPTIONS':
      chrome.runtime.openOptionsPage();
      break;

    case 'GET_CURRENT_TAB':
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        sendResponse({ tab: tabs[0] || null });
      });
      return true;
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// PERIODIC SYNC (ALARMS)
// ═══════════════════════════════════════════════════════════════════════════

// Set up alarms on install
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('[JobFiltr] Extension installed/updated:', details.reason);

  // Create alarm for blocklist sync (every 24 hours)
  chrome.alarms.create('syncBlocklist', { periodInMinutes: 1440 });

  // Create alarm for analytics flush (every 5 minutes)
  chrome.alarms.create('flushAnalytics', { periodInMinutes: 5 });

  // Initial sync
  await syncBlocklist();

  // Track install
  if (details.reason === 'install') {
    chrome.storage.local.set({ installDate: Date.now() });
  }
});

// Handle alarms
chrome.alarms.onAlarm.addListener(async (alarm) => {
  console.log('[JobFiltr] Alarm fired:', alarm.name);

  switch (alarm.name) {
    case 'syncBlocklist':
      await syncBlocklist();
      break;

    case 'flushAnalytics':
      // Analytics tracker handles its own flushing
      break;
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// BLOCKLIST SYNC
// ═══════════════════════════════════════════════════════════════════════════

async function syncBlocklist(): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    console.log('[JobFiltr] Supabase not configured, skipping sync');
    return;
  }

  try {
    console.log('[JobFiltr] Syncing community blocklist...');

    const { data, error } = await supabase
      .from('community_blocklist')
      .select('*');

    if (error) throw error;

    const blocklist = data.map(d => ({
      companyName: d.company_name,
      companyNameNormalized: d.company_name_normalized,
      category: d.category,
      source: 'community',
      verified: d.verified,
      submittedCount: d.submitted_count
    }));

    await chrome.storage.local.set({
      jobfiltr_blocklist: blocklist,
      jobfiltr_blocklist_ts: Date.now()
    });

    console.log(`[JobFiltr] Synced ${blocklist.length} companies`);
  } catch (error) {
    console.error('[JobFiltr] Blocklist sync failed:', error);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// PRO STATUS CHECK
// ═══════════════════════════════════════════════════════════════════════════

async function checkProStatus(): Promise<{ isPro: boolean; tier: string }> {
  if (!isSupabaseConfigured || !supabase) {
    return { isPro: false, tier: 'free' };
  }

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { isPro: false, tier: 'free' };

    const { data, error } = await supabase
      .from('user_tiers')
      .select('tier, subscription_status, current_period_end')
      .eq('user_id', user.id)
      .single();

    if (error || !data) return { isPro: false, tier: 'free' };

    const isPro = data.tier === 'pro' &&
      (data.subscription_status === 'active' ||
        (data.current_period_end && new Date(data.current_period_end) > new Date()));

    // Cache the result
    await chrome.storage.local.set({
      proStatus: { isPro, tier: data.tier, cachedAt: Date.now() }
    });

    return { isPro, tier: data.tier };
  } catch (error) {
    console.error('[JobFiltr] Pro status check failed:', error);
    return { isPro: false, tier: 'free' };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB TRACKING (for platform detection)
// ═══════════════════════════════════════════════════════════════════════════

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    const isJobSite =
      tab.url.includes('linkedin.com/jobs') ||
      tab.url.includes('indeed.com') ||
      tab.url.includes('glassdoor.com/job');

    if (isJobSite) {
      // Reset filter count for new page
      updateBadge(0);
    }
  }
});

// Track when tabs are activated to update badge
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (tab.url) {
      const isJobSite =
        tab.url.includes('linkedin.com/jobs') ||
        tab.url.includes('indeed.com') ||
        tab.url.includes('glassdoor.com/job');

      if (!isJobSite) {
        updateBadge(0);
      }
    }
  } catch {
    // Tab might not exist anymore
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// CONTEXT MENU (Right-click to block company)
// ═══════════════════════════════════════════════════════════════════════════

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'blockCompany',
    title: 'Block this company with JobFiltr',
    contexts: ['selection']
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'blockCompany' && info.selectionText) {
    // Send message to content script to handle blocking
    if (tab?.id) {
      chrome.tabs.sendMessage(tab.id, {
        type: 'BLOCK_COMPANY',
        payload: { companyName: info.selectionText.trim() }
      });
    }
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// STARTUP
// ═══════════════════════════════════════════════════════════════════════════

console.log('[JobFiltr] Background service worker started');

// Initial badge reset
updateBadge(0);
