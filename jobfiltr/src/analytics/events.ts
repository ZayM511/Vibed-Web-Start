// Analytics event definitions
export type AnalyticsEvent =
  | { type: 'job_scanned'; platform: string }
  | { type: 'job_hidden'; reason: string; platform: string }
  | { type: 'ghost_detected'; confidence: number }
  | { type: 'staffing_detected'; company: string }
  | { type: 'filter_applied'; filterType: string }
  | { type: 'keyword_added'; keyword: string; filterType: 'include' | 'exclude' }
  | { type: 'keyword_removed'; keyword: string; filterType: 'include' | 'exclude' }
  | { type: 'company_blocked'; company: string }
  | { type: 'settings_changed'; setting: string; value: unknown }
  | { type: 'popup_opened' }
  | { type: 'tab_changed'; tab: string }
  | { type: 'upgrade_clicked' }
  | { type: 'export_triggered'; format: string; count: number };

export interface AnalyticsPayload {
  event: AnalyticsEvent;
  timestamp: number;
  sessionId: string;
  userId?: string;
}
