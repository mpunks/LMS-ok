import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface GasState {
  webhookUrl: string;
  isConnected: boolean;
  lastSyncTime?: string;
  lastSyncSuccess?: boolean;
  lastSyncMessage?: string;
  setWebhookUrl: (url: string) => void;
  fetchServerConfig: () => Promise<string>;
  testConnection: () => Promise<boolean>;
  executeAction: (action: string, payload?: any) => Promise<any>;
  recordSyncResult: (success: boolean, message: string) => void;
}

export const useGasStore = create<GasState>()(
  persist(
    (set, get) => ({
      webhookUrl: '',
      isConnected: false,
      lastSyncTime: undefined,
      lastSyncSuccess: undefined,
      lastSyncMessage: undefined,
      setWebhookUrl: (url) => {
        const clean = url?.trim() || '';
        set({ webhookUrl: clean, isConnected: false });
        // Persist to server config so all browsers receive it
        fetch('/api/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ webhookUrl: clean })
        }).catch((err) => console.warn('Could not save config to server:', err));
      },
      fetchServerConfig: async () => {
        try {
          const res = await fetch('/api/config');
          if (res.ok) {
            const data = await res.json();
            if (data?.webhookUrl && typeof data.webhookUrl === 'string') {
              const serverUrl = data.webhookUrl.trim();
              if (serverUrl && (!get().webhookUrl || get().webhookUrl !== serverUrl)) {
                set({ webhookUrl: serverUrl });
                return serverUrl;
              }
            }
          }
        } catch (e) {
          console.warn('Could not fetch server config:', e);
        }
        return get().webhookUrl || '';
      },
      recordSyncResult: (success: boolean, message: string) => {
        set({
          lastSyncTime: new Date().toISOString(),
          lastSyncSuccess: success,
          lastSyncMessage: message
        });
      },
      executeAction: async (action: string, payload: any = {}) => {
        const { webhookUrl, recordSyncResult } = get();
        let cleanUrl = webhookUrl?.trim() || '';
        
        // If not in local memory, check server
        if (!cleanUrl) {
          cleanUrl = await get().fetchServerConfig();
        }

        if (!cleanUrl) {
          return { success: false, error: 'Webhook URL belum dikonfigurasi' };
        }
        
        // 1. Try direct fetch
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 25000);

          const response = await fetch(cleanUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'text/plain;charset=utf-8',
            },
            body: JSON.stringify({ action, ...payload }),
            redirect: 'follow',
            signal: controller.signal
          });

          clearTimeout(timeoutId);

          if (response.ok) {
            const result = await response.json();
            if (result && result.success) {
              recordSyncResult(true, result.message || `Aksi ${action} berhasil disinkronkan`);
            } else {
              recordSyncResult(false, result?.error || result?.message || `Aksi ${action} gagal`);
            }
            return result;
          }
        } catch (error: any) {
          console.warn(`Direct GAS fetch notice (${action}):`, error?.message || error);
        }

        // 2. Fallback to server proxy (/api/gas-proxy)
        try {
          const proxyRes = await fetch('/api/gas-proxy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              webhookUrl: cleanUrl,
              payload: { action, ...payload }
            })
          });

          if (proxyRes.ok) {
            const proxyData = await proxyRes.json();
            if (proxyData && proxyData.success) {
              recordSyncResult(true, proxyData.message || `Aksi ${action} berhasil`);
            } else {
              recordSyncResult(false, proxyData?.error || `Aksi ${action} gagal`);
            }
            return proxyData;
          }
        } catch (proxyErr: any) {
          console.warn('Proxy fallback error:', proxyErr);
        }

        const fallbackMsg = 'Gagal menghubungi server Google Apps Script. Periksa koneksi internet atau status Webhook.';
        recordSyncResult(false, fallbackMsg);
        return { success: false, error: fallbackMsg };
      },
      testConnection: async () => {
        const { webhookUrl, executeAction } = get();
        const cleanUrl = webhookUrl?.trim() || '';
        if (!cleanUrl || !cleanUrl.includes('script.google.com/macros/s/')) {
          set({ isConnected: false });
          return false;
        }
        
        try {
          const res = await executeAction('ping');
          if (res && res.success) {
            set({ isConnected: true });
            return true;
          }
          set({ isConnected: false });
          return false;
        } catch (e) {
          set({ isConnected: false });
          return false;
        }
      },
    }),
    {
      name: 'smartlms-gas-storage',
    }
  )
);

