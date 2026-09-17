import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsState {
  appName: string;
  appLogo: string;
  themeColor: string;
  setSettings: (settings: Partial<Omit<SettingsState, 'setSettings'>>) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      appName: 'SmartLMS',
      appLogo: '',
      themeColor: 'indigo',
      setSettings: (settings) => set((state) => ({ ...state, ...settings })),
    }),
    {
      name: 'settings-storage',
    }
  )
);
