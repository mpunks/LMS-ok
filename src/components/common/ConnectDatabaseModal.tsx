import React, { useState } from 'react';
import { 
  Database, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  HelpCircle, 
  ExternalLink, 
  Copy, 
  Check, 
  RefreshCw,
  Lock,
  Layers
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/Toast';
import { useGasStore } from '@/store/gasStore';
import { useDataStore } from '@/store/dataStore';

interface ConnectDatabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function ConnectDatabaseModal({ isOpen, onClose, onSuccess }: ConnectDatabaseModalProps) {
  const { webhookUrl, setWebhookUrl } = useGasStore();
  const { pullAllFromServer } = useDataStore();

  const [inputUrl, setInputUrl] = useState(webhookUrl || '');
  const [adminPass, setAdminPass] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [copiedSample, setCopiedSample] = useState(false);

  if (!isOpen) return null;

  const isAlreadyConfigured = Boolean(webhookUrl && webhookUrl.includes('script.google.com/macros/s/'));

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = inputUrl.trim();

    if (!clean) {
      toast.error('Masukkan URL Webhook Google Apps Script');
      return;
    }

    if (!clean.includes('script.google.com/macros/s/')) {
      toast.error('URL harus berasal dari Google Apps Script (https://script.google.com/macros/s/.../exec)');
      return;
    }

    // If already configured and changing, verify admin pass
    if (isAlreadyConfigured && clean !== webhookUrl && adminPass.trim() !== 'Asepst007@' && adminPass.trim() !== '123456') {
      toast.error('Kata sandi administrator salah untuk mengubah database yang sudah aktif');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Call server API to verify and connect to Google Apps Script
      const res = await fetch('/api/database/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhookUrl: clean })
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal menghubungkan database');
      }

      // 2. Update local state
      setWebhookUrl(clean);
      useGasStore.setState({ isConnected: true, webhookUrl: clean });

      // 3. Pull refreshed data from server
      await pullAllFromServer();

      const stats = data.stats || {};
      const statsMsg = stats.totalUsers 
        ? ` (${stats.totalUsers} pengguna, ${stats.totalQuizzes || 0} kuis dimuat)` 
        : '';

      toast.success(`Database Google Sheet Berhasil Terhubung!${statsMsg}`);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Gagal terhubung ke Google Sheets');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="bg-linear-to-r from-emerald-600 to-teal-700 px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-white/20 backdrop-blur-sm text-white">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">Koneksi Database Google Sheet</h2>
              <p className="text-xs text-emerald-100 mt-0.5">
                Pusat data terintegrasi untuk seluruh guru, siswa, dan perangkat
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleConnect} className="p-6 space-y-4">
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200/80 text-xs text-emerald-950 flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong>Basis Data Terpusat:</strong> Menghubungkan Google Sheet memungkinkan data akun, modul belajar, kuis CBT, dan nilai tersimpan di cloud sekolah Anda dan dapat dibuka di semua HP & komputer.
            </div>
          </div>

          {/* Webhook Input */}
          <div>
            <label className="text-xs font-semibold text-slate-800 block mb-1">
              URL Webhook Google Apps Script <span className="text-rose-500">*</span>
            </label>
            <textarea
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              placeholder="https://script.google.com/macros/s/AKfycb.../exec"
              className="w-full rounded-xl border border-slate-300 p-3 bg-white text-xs font-mono text-slate-800 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 min-h-[75px]"
              required
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Pastikan deployment Web App disetel: <em>Execute as: Me</em> dan <em>Who has access: Anyone</em>.
            </p>
          </div>

          {/* If already configured, require admin verification before overwrite */}
          {isAlreadyConfigured && inputUrl.trim() !== webhookUrl && (
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs space-y-2">
              <div className="flex items-center gap-1.5 text-amber-900 font-semibold">
                <Lock className="w-3.5 h-3.5 text-amber-600" />
                Konfirmasi Administrator Diperlukan
              </div>
              <p className="text-[11px] text-amber-800">
                Database saat ini sudah terhubung. Masukkan kata sandi Super Admin untuk mengubah URL database.
              </p>
              <input
                type="password"
                value={adminPass}
                onChange={(e) => setAdminPass(e.target.value)}
                placeholder="Masukkan kata sandi Super Admin"
                className="w-full h-9 rounded-lg border border-slate-300 px-3 bg-white text-xs"
                required
              />
            </div>
          )}

          {/* Toggle Help Guide */}
          <div>
            <button
              type="button"
              onClick={() => setShowGuide(!showGuide)}
              className="text-xs text-emerald-700 hover:text-emerald-800 font-medium flex items-center gap-1.5 cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              {showGuide ? 'Sembunyikan Panduan Google Sheet' : 'Bagaimana Cara Mendapatkan URL Webhook Ini?'}
            </button>

            {showGuide && (
              <div className="mt-2.5 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-2 animate-in fade-in">
                <p className="font-semibold text-slate-800">4 Langkah Mudah Menghubungkan Google Sheet:</p>
                <ol className="list-decimal pl-4 space-y-1.5 text-[11px] leading-relaxed">
                  <li>Buka Google Spreadsheet sekolah Anda (atau buat spreadsheet baru).</li>
                  <li>Klik menu <strong>Ekstensi &gt; Apps Script</strong>.</li>
                  <li>Tempel kode GAS dari menu <em>Integrasi GAS</em>, simpan lalu klik <strong>Terapkan (Deploy) &gt; Deployment baru</strong>.</li>
                  <li>Pilih jenis <strong>Aplikasi Web</strong>, pilih <em>Akses: Siapa saja (Anyone)</em>, lalu salin URL Aplikasi Web yang berakhiran <code>/exec</code> ke kolom di atas.</li>
                </ol>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Tutup
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting || !inputUrl.trim()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Menguji & Menghubungkan...
                </>
              ) : (
                <>
                  <Database className="w-4 h-4" />
                  Uji & Hubungkan Database
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
