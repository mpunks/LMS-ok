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
        if (!webhookUrl) throw new Error('Webhook URL belum dikonfigurasi');
        
        try {
          const response = await fetch(webhookUrl, {
            method: 'POST',
            // Kita sengaja tidak menggunakan Content-Type: application/json 
            // untuk menghindari CORS preflight (OPTIONS) request yang tidak didukung GAS
            body: JSON.stringify({ action, ...payload })
          });
          
          return await response.json();
        } catch (error) {
          console.error('GAS Request Error:', error);
          return { success: false, error: 'Koneksi ke server gagal' };
        }
      },
      testConnection: async () => {
        const { webhookUrl, executeAction } = get();
        if (!webhookUrl || !webhookUrl.includes('script.google.com/macros/s/')) {
          set({ isConnected: false });
          return false;
        }
        
        try {
          const res = await executeAction('ping');
          if (res && res.success) {
            set({ isConnected: true });
            return true;
          }
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

