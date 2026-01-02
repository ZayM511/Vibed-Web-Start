// Analytics tracker
import type { AnalyticsEvent, AnalyticsPayload } from './events';

const SESSION_KEY = 'jobfiltr_session';
const EVENTS_KEY = 'jobfiltr_analytics_queue';
const MAX_QUEUE_SIZE = 100;

let sessionId: string | null = null;

function getSessionId(): string {
  if (!sessionId) {
    sessionId = localStorage.getItem(SESSION_KEY);
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem(SESSION_KEY, sessionId);
    }
  }
  return sessionId;
}

export function track(event: AnalyticsEvent, userId?: string): void {
  const payload: AnalyticsPayload = {
    event,
    timestamp: Date.now(),
    sessionId: getSessionId(),
    userId,
  };

  queueEvent(payload);
}

function queueEvent(payload: AnalyticsPayload): void {
  const queue = getEventQueue();
  queue.push(payload);

  // Trim queue if too large
  if (queue.length > MAX_QUEUE_SIZE) {
    queue.splice(0, queue.length - MAX_QUEUE_SIZE);
  }

  localStorage.setItem(EVENTS_KEY, JSON.stringify(queue));
}

function getEventQueue(): AnalyticsPayload[] {
  const raw = localStorage.getItem(EVENTS_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function flushEvents(): Promise<void> {
  const queue = getEventQueue();
  if (queue.length === 0) return;

  // TODO: Send to analytics endpoint
  console.log('[JobFiltr Analytics] Flushing events:', queue.length);

  // Clear queue after sending
  localStorage.removeItem(EVENTS_KEY);
}

export function resetSession(): void {
  sessionId = null;
  localStorage.removeItem(SESSION_KEY);
}

// Convenience tracking functions
export const trackJobScanned = (platform: string) => track({ type: 'job_scanned', platform });
export const trackJobHidden = (reason: string, platform: string) => track({ type: 'job_hidden', reason, platform });
export const trackGhostDetected = (confidence: number) => track({ type: 'ghost_detected', confidence });
export const trackStaffingDetected = (company: string) => track({ type: 'staffing_detected', company });
export const trackPopupOpened = () => track({ type: 'popup_opened' });
export const trackTabChanged = (tab: string) => track({ type: 'tab_changed', tab });
export const trackUpgradeClicked = () => track({ type: 'upgrade_clicked' });
