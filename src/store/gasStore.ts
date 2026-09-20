import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface GasState {
  webhookUrl: string;
  isConnected: boolean;
  setWebhookUrl: (url: string) => void;
  testConnection: () => Promise<boolean>;
  executeAction: (action: string, payload?: any) => Promise<any>;
}

export const useGasStore = create<GasState>()(
  persist(
    (set, get) => ({
      webhookUrl: '',
      isConnected: false,
      setWebhookUrl: (url) => set({ webhookUrl: url, isConnected: false }),
      executeAction: async (action: string, payload: any = {}) => {
        const { webhookUrl } = get();
        const cleanUrl = webhookUrl?.trim() || '';
        if (!cleanUrl) {
          return { success: false, error: 'Webhook URL belum dikonfigurasi' };
        }
        
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000);

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
            return { success: false, error: `Server merespon dengan status ${response.status}` };
          }
          
          return await response.json();
        } catch (error: any) {
          const errorMsg = error?.name === 'AbortError' 
            ? 'Batas waktu koneksi habis (timeout)' 
            : (error?.message || 'Koneksi ke server gagal');
          
          console.warn('GAS Request Notice:', errorMsg);
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

