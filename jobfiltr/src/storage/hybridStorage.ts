// Hybrid storage (Chrome storage + Supabase sync)
import type { FilterSettings } from '../types';

const STORAGE_KEY = 'jobfiltr_settings';

export async function getSettings(): Promise<FilterSettings> {
  return new Promise((resolve) => {
    chrome.storage.sync.get([STORAGE_KEY], (result) => {
      resolve(result[STORAGE_KEY] || getDefaultSettings());
    });
  });
}

export async function setSettings(settings: FilterSettings): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.sync.set({ [STORAGE_KEY]: settings }, resolve);
  });
}

export async function updateSettings(partial: Partial<FilterSettings>): Promise<FilterSettings> {
  const current = await getSettings();
  const updated = { ...current, ...partial };
  await setSettings(updated);
  return updated;
}

export function getDefaultSettings(): FilterSettings {
  return {
    hideGhostJobs: true,
    hideStaffingFirms: false,
    verifyTrueRemote: false,
    ghostJobDaysThreshold: 30,
    datePosted: 'any',
    includeKeywords: [],
    includeKeywordsMatchMode: 'any',
    excludeKeywords: [],
    excludeCompanies: [],
  };
}

export function onSettingsChange(callback: (settings: FilterSettings) => void): () => void {
  const listener = (changes: { [key: string]: chrome.storage.StorageChange }) => {
    if (changes[STORAGE_KEY]) {
      callback(changes[STORAGE_KEY].newValue);
    }
  };
  chrome.storage.onChanged.addListener(listener);
  return () => chrome.storage.onChanged.removeListener(listener);
}
