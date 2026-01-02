import '@testing-library/jest-dom';
import { vi, beforeEach, afterEach } from 'vitest';

// ═══════════════════════════════════════════════════════════════════════════
// CHROME API MOCKS
// ═══════════════════════════════════════════════════════════════════════════

const mockChromeStorage: Record<string, unknown> = {};

const mockChrome = {
  runtime: {
    id: 'test-extension-id',
    sendMessage: vi.fn().mockResolvedValue(undefined),
    onMessage: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
    getURL: vi.fn((path: string) => `chrome-extension://test-id/${path}`),
    lastError: null,
  },
  storage: {
    local: {
      get: vi.fn((keys: string | string[] | null) => {
        return new Promise((resolve) => {
          if (keys === null) {
            resolve({ ...mockChromeStorage });
          } else if (typeof keys === 'string') {
            resolve({ [keys]: mockChromeStorage[keys] });
          } else if (Array.isArray(keys)) {
            const result: Record<string, unknown> = {};
            keys.forEach(k => {
              if (k in mockChromeStorage) result[k] = mockChromeStorage[k];
            });
            resolve(result);
          } else {
            resolve({});
          }
        });
      }),
      set: vi.fn((items: Record<string, unknown>) => {
        return new Promise<void>((resolve) => {
          Object.assign(mockChromeStorage, items);
          resolve();
        });
      }),
      remove: vi.fn((keys: string | string[]) => {
        return new Promise<void>((resolve) => {
          const keysArray = Array.isArray(keys) ? keys : [keys];
          keysArray.forEach(k => delete mockChromeStorage[k]);
          resolve();
        });
      }),
      clear: vi.fn(() => {
        return new Promise<void>((resolve) => {
          Object.keys(mockChromeStorage).forEach(k => delete mockChromeStorage[k]);
          resolve();
        });
      }),
    },
    sync: {
      get: vi.fn().mockResolvedValue({}),
      set: vi.fn().mockResolvedValue(undefined),
      remove: vi.fn().mockResolvedValue(undefined),
    },
    onChanged: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
  },
  tabs: {
    query: vi.fn().mockResolvedValue([]),
    sendMessage: vi.fn().mockResolvedValue(undefined),
    create: vi.fn().mockResolvedValue({ id: 1 }),
    update: vi.fn().mockResolvedValue({}),
  },
  alarms: {
    create: vi.fn(),
    clear: vi.fn(),
    onAlarm: {
      addListener: vi.fn(),
    },
  },
  action: {
    setBadgeText: vi.fn().mockResolvedValue(undefined),
    setBadgeBackgroundColor: vi.fn().mockResolvedValue(undefined),
  },
  contextMenus: {
    create: vi.fn(),
    onClicked: {
      addListener: vi.fn(),
    },
  },
  identity: {
    getAuthToken: vi.fn(),
    launchWebAuthFlow: vi.fn(),
  },
};

vi.stubGlobal('chrome', mockChrome);

// ═══════════════════════════════════════════════════════════════════════════
// FETCH MOCK
// ═══════════════════════════════════════════════════════════════════════════

global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  json: () => Promise.resolve({}),
  text: () => Promise.resolve(''),
});

// ═══════════════════════════════════════════════════════════════════════════
// LOCALSTORAGE MOCK
// ═══════════════════════════════════════════════════════════════════════════

const localStorageData: Record<string, string> = {};

const localStorageMock = {
  getItem: vi.fn((key: string) => localStorageData[key] ?? null),
  setItem: vi.fn((key: string, value: string) => {
    localStorageData[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete localStorageData[key];
  }),
  clear: vi.fn(() => {
    Object.keys(localStorageData).forEach(k => delete localStorageData[k]);
  }),
  key: vi.fn((index: number) => Object.keys(localStorageData)[index] ?? null),
  get length() {
    return Object.keys(localStorageData).length;
  },
};

vi.stubGlobal('localStorage', localStorageMock);

// ═══════════════════════════════════════════════════════════════════════════
// CONSOLE MOCK (suppress expected warnings)
// ═══════════════════════════════════════════════════════════════════════════

const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeEach(() => {
  // Suppress specific expected warnings
  console.error = vi.fn((...args) => {
    const msg = args[0]?.toString() || '';
    if (msg.includes('[JobFiltr]') || msg.includes('Not implemented')) {
      return;
    }
    originalConsoleError(...args);
  });
  console.warn = vi.fn((...args) => {
    const msg = args[0]?.toString() || '';
    if (msg.includes('[JobFiltr]')) {
      return;
    }
    originalConsoleWarn(...args);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// CLEANUP
// ═══════════════════════════════════════════════════════════════════════════

beforeEach(() => {
  vi.clearAllMocks();
  // Clear mock chrome storage
  Object.keys(mockChromeStorage).forEach(k => delete mockChromeStorage[k]);
  // Clear localStorage mock
  Object.keys(localStorageData).forEach(k => delete localStorageData[k]);
});

afterEach(() => {
  vi.restoreAllMocks();
  // Reset console
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

// ═══════════════════════════════════════════════════════════════════════════
// UTILITY EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

export { mockChrome, mockChromeStorage };
