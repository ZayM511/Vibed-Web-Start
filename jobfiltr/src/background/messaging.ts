// Background messaging types and utilities
export type MessageType =
  | 'GET_SETTINGS'
  | 'SET_SETTINGS'
  | 'GET_STATS'
  | 'INCREMENT_STAT'
  | 'SYNC_DATA'
  | 'ANALYZE_JOB'
  | 'FLUSH_ANALYTICS';

export interface Message<T = unknown> {
  type: MessageType;
  payload?: T;
}

export interface MessageResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export function sendMessage<T, R>(message: Message<T>): Promise<MessageResponse<R>> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(message, (response: MessageResponse<R>) => {
      if (chrome.runtime.lastError) {
        resolve({ success: false, error: chrome.runtime.lastError.message });
      } else {
        resolve(response);
      }
    });
  });
}

export function sendToTab<T, R>(tabId: number, message: Message<T>): Promise<MessageResponse<R>> {
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tabId, message, (response: MessageResponse<R>) => {
      if (chrome.runtime.lastError) {
        resolve({ success: false, error: chrome.runtime.lastError.message });
      } else {
        resolve(response);
      }
    });
  });
}
