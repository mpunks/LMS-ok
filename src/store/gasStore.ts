import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface GasState {
  webhookUrl: string;
  isConnected: boolean;
  lastSyncTime?: string;
  lastSyncSuccess?: boolean;
  lastSyncMessage?: string;
  setWebhookUrl: (url: string) => void;
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
      setWebhookUrl: (url) => set({ webhookUrl: url, isConnected: false }),
      recordSyncResult: (success: boolean, message: string) => {
        set({
          lastSyncTime: new Date().toISOString(),
          lastSyncSuccess: success,
          lastSyncMessage: message
        });
      },
      executeAction: async (action: string, payload: any = {}) => {
        const { webhookUrl, recordSyncResult } = get();
        const cleanUrl = webhookUrl?.trim() || '';
        if (!cleanUrl) {
          return { success: false, error: 'Webhook URL belum dikonfigurasi' };
        }
        
        try {
          // Increase timeout to 30 seconds for heavy sheet insertions and cold starts
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 30000);

          const response = await fetch(cleanUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'text/plain;charset=utf-8',
            },
            // Menggunakan text/plain agar tidak memicu preflight OPTIONS yang tidak didukung oleh GAS Web App
            body: JSON.stringify({ action, ...payload }),
            redirect: 'follow',
            signal: controller.signal
          });

          clearTimeout(timeoutId);

          if (!response.ok) {
            const errStr = `Server merespon dengan status ${response.status}`;
            recordSyncResult(false, errStr);
            return { success: false, error: errStr };
          }
          
          const result = await response.json();
          if (result && result.success) {
            recordSyncResult(true, result.message || `Aksi ${action} berhasil disinkronkan`);
          } else {
            recordSyncResult(false, result?.error || result?.message || `Aksi ${action} gagal`);
          }
          return result;
        } catch (error: any) {
          const errorMsg = error?.name === 'AbortError' 
            ? 'Batas waktu koneksi Google Apps Script habis (timeout 30d). Periksa koneksi internet atau script Google Sheet.' 
            : (error?.message || 'Koneksi ke server Google Apps Script gagal');
          
          console.warn('GAS Request Notice:', errorMsg);
          recordSyncResult(false, errorMsg);
          return { success: false, error: errorMsg };
        }
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

