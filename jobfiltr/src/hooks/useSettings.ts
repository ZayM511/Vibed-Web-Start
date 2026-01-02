// User settings hook
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  notifications: boolean;
  autoSync: boolean;
  showBadges: boolean;
  animationsEnabled: boolean;
}

interface SettingsState extends AppSettings {
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setNotifications: (enabled: boolean) => void;
  setAutoSync: (enabled: boolean) => void;
  setShowBadges: (enabled: boolean) => void;
  setAnimationsEnabled: (enabled: boolean) => void;
}

const defaultSettings: AppSettings = {
  theme: 'system',
  notifications: true,
  autoSync: true,
  showBadges: true,
  animationsEnabled: true,
};

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      ...defaultSettings,

      setTheme: (theme) => set({ theme }),
      setNotifications: (notifications) => set({ notifications }),
      setAutoSync: (autoSync) => set({ autoSync }),
      setShowBadges: (showBadges) => set({ showBadges }),
      setAnimationsEnabled: (animationsEnabled) => set({ animationsEnabled }),
    }),
    {
      name: 'jobfiltr-settings',
    }
  )
);
