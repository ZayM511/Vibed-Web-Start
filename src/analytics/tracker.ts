import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { generateId } from '@/lib/utils';

interface AnalyticsEvent {
  eventType: string;
  eventData: Record<string, unknown>;
  platform: string;
  timestamp: number;
}

// Event types we track (privacy-focused)
export type EventType =
  | 'extension_installed'
  | 'extension_opened'
  | 'job_filtered'
  | 'settings_changed'
  | 'company_reported'
  | 'user_signed_up'
  | 'user_upgraded_to_pro'
  | 'keyword_added'
  | 'template_saved'
  | 'job_analyzed'
  | 'export_triggered';

class AnalyticsTracker {
  private queue: AnalyticsEvent[] = [];
  private anonymousId: string | null = null;
  private flushInterval: ReturnType<typeof setInterval> | null = null;
  private readonly BATCH_SIZE = 10;
  private readonly FLUSH_INTERVAL = 30000; // 30 seconds

  constructor() {
    this.init();
  }

  private async init() {
    // Get or create anonymous ID
    const stored = await chrome.storage.local.get('analyticsId');
    if (stored.analyticsId) {
      this.anonymousId = stored.analyticsId;
    } else {
      this.anonymousId = generateId();
      await chrome.storage.local.set({ analyticsId: this.anonymousId });
    }

    // Start flush interval
    this.flushInterval = setInterval(() => this.flush(), this.FLUSH_INTERVAL);

    // Flush on unload
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => this.flush());
    }
  }

  /**
   * Track an event (privacy-first - no PII, no job content)
   */
  track(eventType: EventType, data: Record<string, unknown> = {}) {
    // Filter out any potentially sensitive data
    const safeData = this.sanitizeData(data);

    this.queue.push({
      eventType,
      eventData: safeData,
      platform: data.platform || 'extension',
      timestamp: Date.now()
    });

    // Flush if batch size reached
    if (this.queue.length >= this.BATCH_SIZE) {
      this.flush();
    }
  }

  /**
   * Sanitize data to remove PII
   */
  private sanitizeData(data: Record<string, unknown>): Record<string, unknown> {
    const safe: Record<string, unknown> = {};
    const allowedKeys = [
      'category', 'count', 'platform', 'feature', 'tier',
      'filterType', 'action', 'settingName', 'version'
    ];

    for (const [key, value] of Object.entries(data)) {
      if (allowedKeys.includes(key)) {
        // Never include strings that might be job titles, company names, etc.
        if (typeof value === 'string' && value.length > 50) continue;
        safe[key] = value;
      }
    }

    return safe;
  }

  /**
   * Flush queued events to backend
   */
  private async flush() {
    if (this.queue.length === 0) return;

    if (!isSupabaseConfigured || !supabase) {
      // Store locally if offline
      const stored = await chrome.storage.local.get('pendingAnalytics');
      const pending = stored.pendingAnalytics || [];
      await chrome.storage.local.set({
        pendingAnalytics: [...pending, ...this.queue].slice(-100)
      });
      this.queue = [];
      return;
    }

    const events = [...this.queue];
    this.queue = [];

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const version = chrome.runtime.getManifest().version;

      const records = events.map(e => ({
        user_id: user?.id || null,
        anonymous_id: this.anonymousId!,
        event_type: e.eventType,
        event_data: e.eventData,
        platform: e.platform,
        extension_version: version
      }));

      await supabase.from('analytics_events').insert(records);

      // Also flush any pending offline events
      const stored = await chrome.storage.local.get('pendingAnalytics');
      if (stored.pendingAnalytics?.length > 0) {
        const pendingRecords = stored.pendingAnalytics.map((e: AnalyticsEvent) => ({
          user_id: user?.id || null,
          anonymous_id: this.anonymousId!,
          event_type: e.eventType,
          event_data: e.eventData,
          platform: e.platform,
          extension_version: version
        }));
        await supabase.from('analytics_events').insert(pendingRecords);
        await chrome.storage.local.remove('pendingAnalytics');
      }
    } catch (error) {
      // Put events back in queue on failure
      this.queue = [...events, ...this.queue];
      console.error('[JobFiltr] Analytics flush failed:', error);
    }
  }

  /**
   * Cleanup
   */
  destroy() {
    if (this.flushInterval) clearInterval(this.flushInterval);
    this.flush();
  }
}

export const analytics = new AnalyticsTracker();

// Convenience methods
export const trackJobFiltered = (category: string, platform: string) =>
  analytics.track('job_filtered', { category, platform });

export const trackSettingChanged = (settingName: string) =>
  analytics.track('settings_changed', { settingName });

export const trackKeywordAdded = (type: 'include' | 'exclude') =>
  analytics.track('keyword_added', { filterType: type });

export const trackUpgrade = () =>
  analytics.track('user_upgraded_to_pro', { tier: 'pro' });
