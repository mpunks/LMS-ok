import React, { useState } from 'react';
import { Smartphone, Download, Check, Share2, PlusSquare, X } from 'lucide-react';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { Button } from '@/components/ui/Button';

interface PWAInstallButtonProps {
  variant?: 'button' | 'banner' | 'pill';
  className?: string;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ 
  variant = 'button',
  className = '' 
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);

  // If already running inside standalone app, do not show install prompt
  if (isInstalled) {
    return null;
  }

  // Handle click: if Chrome beforeinstallprompt is ready, trigger it; otherwise show guide
  const handleClick = async () => {
    if (isInstallable) {
      await install();
    } else {
      setShowGuideModal(true);
    }
  };

  if (variant === 'banner') {
    return (
      <>
        <div className={`p-3.5 bg-linear-to-r from-indigo-600 to-indigo-800 text-white rounded-2xl shadow-md flex items-center justify-between gap-3 ${className}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0">
              <Smartphone className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-bold text-xs sm:text-sm">Pasang Aplikasi SmartLMS</div>
              <p className="text-[11px] text-indigo-100 leading-tight mt-0.5">
                Akses lebih cepat & layar penuh di HP Android / iOS tanpa browser bar
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClick}
            className="px-3.5 py-1.5 rounded-xl bg-white text-indigo-700 hover:bg-indigo-50 font-bold text-xs shrink-0 shadow-xs flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
          >
            <Download className="w-3.5 h-3.5" />
            Pasang App
          </button>
        </div>

        {/* Manual guide modal */}
        {showGuideModal && <InstallGuideModal isIOS={isIOS} onClose={() => setShowGuideModal(false)} />}
      </>
    );
  }

  if (variant === 'pill') {
    return (
      <>
        <button
          type="button"
          onClick={handleClick}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-semibold cursor-pointer transition-colors shadow-2xs ${className}`}
          title="Pasang aplikasi di layar utama HP"
        >
          <Smartphone className="w-3.5 h-3.5 text-indigo-600" />
          <span>Pasang App Android</span>
        </button>

        {showGuideModal && <InstallGuideModal isIOS={isIOS} onClose={() => setShowGuideModal(false)} />}
      </>
    );
  }

  return (
    <>
      <Button
        onClick={handleClick}
        className={`bg-indigo-600 hover:bg-indigo-700 text-white gap-2 font-semibold shadow-xs ${className}`}
        size="sm"
      >
        <Smartphone className="w-4 h-4" />
        <span>Pasang Aplikasi Android</span>
      </Button>

      {showGuideModal && <InstallGuideModal isIOS={isIOS} onClose={() => setShowGuideModal(false)} />}
    </>
  );
};

function InstallGuideModal({ isIOS, onClose }: { isIOS: boolean; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 overflow-hidden">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-slate-700 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-indigo-100 text-indigo-600">
            <Smartphone className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-base">Pasang Aplikasi di HP</h3>
            <p className="text-xs text-slate-500">Jadikan aplikasi resmi di layar utama</p>
          </div>
        </div>

        {isIOS ? (
          <div className="space-y-3 text-xs text-slate-600">
            <p className="font-semibold text-slate-800">Petunjuk Pengguna iPhone / iPad (Safari):</p>
            <ol className="list-decimal pl-4 space-y-2">
              <li className="flex items-center gap-2">
                <span>1. Ketuk tombol <strong>Bagikan (Share)</strong></span>
                <Share2 className="w-3.5 h-3.5 text-indigo-600 inline" />
                <span>di menu Safari bawah.</span>
              </li>
              <li className="flex items-center gap-2">
                <span>2. Gulir ke bawah lalu pilih</span>
                <span className="font-bold text-slate-900">Tambahkan ke Layar Utama</span>
                <PlusSquare className="w-3.5 h-3.5 text-indigo-600 inline" />
              </li>
              <li>3. Ketuk <strong>Tambah</strong> di pojok kanan atas.</li>
            </ol>
          </div>
        ) : (
          <div className="space-y-3 text-xs text-slate-600">
            <p className="font-semibold text-slate-800">Petunjuk Pengguna Android (Chrome):</p>
            <ol className="list-decimal pl-4 space-y-2">
              <li>Buka menu titik tiga (<strong>⋮</strong>) di pojok kanan atas browser Chrome.</li>
              <li>Pilih menu <strong>"Instal aplikasi"</strong> atau <strong>"Tambahkan ke Layar Utama"</strong>.</li>
              <li>Ketuk <strong>Instal</strong>. Ikon aplikasi SmartLMS akan langsung muncul di daftar aplikasi HP Anda dan siap digunakan secara mandiri (layar penuh).</li>
            </ol>
          </div>
        )}

        <div className="mt-5 pt-3 border-t border-slate-100 flex justify-end">
          <Button size="sm" onClick={onClose} className="w-full">
            Saya Mengerti
          </Button>
        </div>
      </div>
    </div>
  );
}
