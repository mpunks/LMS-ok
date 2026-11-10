import React, { useState } from 'react';
import { Smartphone, Download, Share2, PlusSquare, X, Apple, Copy, Check, Compass, Sparkles, ExternalLink, ShieldCheck } from 'lucide-react';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/Toast';

interface PWAInstallButtonProps {
  variant?: 'button' | 'banner' | 'pill' | 'dual';
  platform?: 'all' | 'android' | 'ios' | 'both';
  className?: string;
  showIconOnlyOnMobile?: boolean;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ 
  variant = 'button',
  platform = 'all',
  className = '',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [activeGuideTab, setActiveGuideTab] = useState<'ios' | 'android'>('android');

  // If already running inside standalone app, do not show install prompt
  if (isInstalled) {
    return null;
  }

  const handleOpenIOSGuide = () => {
    setActiveGuideTab('ios');
    setShowGuideModal(true);
  };

  const handleOpenAndroidGuide = async () => {
    setActiveGuideTab('android');
    if (isInstallable) {
      await install();
    } else {
      setShowGuideModal(true);
    }
  };

  // Dedicated iPhone Pill or Button
  if (platform === 'ios') {
    return (
      <>
        <button
          type="button"
          onClick={handleOpenIOSGuide}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer transition-all shadow-xs active:scale-95 ${className}`}
          title="Pasang aplikasi di iPhone / iPad"
        >
          <Apple className="w-3.5 h-3.5 text-white" />
          <span>Pasang di iPhone</span>
        </button>

        {showGuideModal && (
          <InstallGuideModal 
            initialTab="ios" 
            onClose={() => setShowGuideModal(false)} 
          />
        )}
      </>
    );
  }

  // Dedicated Android Pill or Button
  if (platform === 'android') {
    return (
      <>
        <button
          type="button"
          onClick={handleOpenAndroidGuide}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer transition-all shadow-xs active:scale-95 ${className}`}
          title="Pasang aplikasi di HP Android"
        >
          <Smartphone className="w-3.5 h-3.5 text-white" />
          <span>Pasang di Android</span>
        </button>

        {showGuideModal && (
          <InstallGuideModal 
            initialTab="android" 
            onClose={() => setShowGuideModal(false)} 
          />
        )}
      </>
    );
  }

  // Dual button format (Android + iPhone together)
  if (variant === 'dual' || platform === 'both') {
    return (
      <>
        <div className={`flex items-center gap-2 flex-wrap ${className}`}>
          <button
            type="button"
            onClick={handleOpenAndroidGuide}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-semibold cursor-pointer transition-all shadow-2xs active:scale-95"
            title="Pasang aplikasi di HP Android"
          >
            <Smartphone className="w-3.5 h-3.5 text-indigo-600" />
            <span>Android</span>
          </button>
          <button
            type="button"
            onClick={handleOpenIOSGuide}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer transition-all shadow-2xs active:scale-95"
            title="Pasang aplikasi di iPhone / iPad"
          >
            <Apple className="w-3.5 h-3.5 text-white" />
            <span>iPhone</span>
          </button>
        </div>

        {showGuideModal && (
          <InstallGuideModal 
            initialTab={activeGuideTab} 
            onClose={() => setShowGuideModal(false)} 
          />
        )}
      </>
    );
  }

  // Prominent Banner with dedicated buttons for BOTH Android and iPhone
  if (variant === 'banner') {
    return (
      <>
        <div className={`p-4 bg-linear-to-r from-indigo-700 via-indigo-800 to-slate-900 text-white rounded-2xl shadow-md border border-indigo-500/30 ${className}`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-white/15 backdrop-blur-xs flex items-center justify-center shrink-0 border border-white/20">
                <Smartphone className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="font-bold text-sm text-white flex items-center gap-2">
                  <span>Pasang Aplikasi SmartLMS</span>
                  <span className="px-2 py-0.5 rounded-full bg-indigo-500/40 text-[10px] text-indigo-200 border border-indigo-400/30">
                    PWA Resmi
                  </span>
                </div>
                <p className="text-xs text-indigo-100/90 leading-tight mt-0.5">
                  Akses instan di layar utama HP Android & iPhone tanpa bilah browser.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap">
              {/* Android Install Button */}
              <button
                type="button"
                onClick={handleOpenAndroidGuide}
                className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs shadow-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95"
                title="Pasang di HP Android"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Android</span>
              </button>

              {/* iPhone / iOS Install Button */}
              <button
                type="button"
                onClick={handleOpenIOSGuide}
                className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl bg-white text-slate-900 hover:bg-slate-100 font-bold text-xs shadow-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95"
                title="Pasang di iPhone / iPad"
              >
                <Apple className="w-3.5 h-3.5" />
                <span>iPhone</span>
              </button>
            </div>
          </div>
        </div>

        {showGuideModal && (
          <InstallGuideModal 
            initialTab={activeGuideTab} 
            onClose={() => setShowGuideModal(false)} 
          />
        )}
      </>
    );
  }

  // Pill variant
  if (variant === 'pill') {
    return (
      <>
        <div className={`inline-flex items-center gap-1.5 ${className}`}>
          <button
            type="button"
            onClick={isIOS ? handleOpenIOSGuide : handleOpenAndroidGuide}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-semibold cursor-pointer transition-colors shadow-2xs"
            title={isIOS ? 'Pasang di iPhone' : 'Pasang di HP Android'}
          >
            {isIOS ? <Apple className="w-3.5 h-3.5 text-slate-900" /> : <Smartphone className="w-3.5 h-3.5 text-indigo-600" />}
            <span>{isIOS ? 'Pasang di iPhone' : 'Pasang di Android'}</span>
          </button>
          
          {/* Also show alternate button if on desktop or general view */}
          <button
            type="button"
            onClick={isIOS ? handleOpenAndroidGuide : handleOpenIOSGuide}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-medium cursor-pointer transition-colors shadow-2xs"
            title={isIOS ? 'Petunjuk untuk Android' : 'Petunjuk untuk iPhone'}
          >
            {isIOS ? <Smartphone className="w-3.5 h-3.5 text-slate-600" /> : <Apple className="w-3.5 h-3.5 text-slate-800" />}
            <span>{isIOS ? 'Android' : 'iPhone'}</span>
          </button>
        </div>

        {showGuideModal && (
          <InstallGuideModal 
            initialTab={activeGuideTab} 
            onClose={() => setShowGuideModal(false)} 
          />
        )}
      </>
    );
  }

  // Default button variant
  return (
    <>
      <div className={`inline-flex items-center gap-2 ${className}`}>
        <Button
          onClick={handleOpenAndroidGuide}
          className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 font-semibold shadow-xs"
          size="sm"
        >
          <Smartphone className="w-4 h-4" />
          <span>Pasang di Android</span>
        </Button>
        <Button
          onClick={handleOpenIOSGuide}
          variant="outline"
          className="border-slate-300 text-slate-800 hover:bg-slate-100 gap-2 font-semibold shadow-xs"
          size="sm"
        >
          <Apple className="w-4 h-4 text-slate-900" />
          <span>Pasang di iPhone</span>
        </Button>
      </div>

      {showGuideModal && (
        <InstallGuideModal 
          initialTab={activeGuideTab} 
          onClose={() => setShowGuideModal(false)} 
        />
      )}
    </>
  );
};

// Export dedicated iPhone Install Button
export const IPhoneInstallButton: React.FC<{ className?: string; variant?: 'button' | 'pill' }> = ({
  className = '',
  variant = 'pill'
}) => {
  return <PWAInstallButton platform="ios" variant={variant} className={className} />;
};

// Export dedicated Android Install Button
export const AndroidInstallButton: React.FC<{ className?: string; variant?: 'button' | 'pill' }> = ({
  className = '',
  variant = 'pill'
}) => {
  return <PWAInstallButton platform="android" variant={variant} className={className} />;
};

// Comprehensive Install Guide Modal with dedicated iOS & Android tabs
function InstallGuideModal({ 
  initialTab = 'ios', 
  onClose 
}: { 
  initialTab?: 'ios' | 'android'; 
  onClose: () => void;
}) {
  const [activeTab, setActiveTab] = useState<'ios' | 'android'>(initialTab);
  const [copied, setCopied] = useState(false);
  const { isInstallable, install } = usePWAInstall();

  const appUrl = typeof window !== 'undefined' ? window.location.origin : '';

  const handleCopyLink = async () => {
    try {
      if (navigator.clipboard && window.location.href) {
        await navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        toast.success('Tautan berhasil disalin! Silakan tempel di browser Safari iPhone Anda.');
        setTimeout(() => setCopied(false), 3000);
      }
    } catch {
      toast.info(`Tautan web: ${window.location.href}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 overflow-hidden max-h-[92vh] flex flex-col">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          title="Tutup"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-linear-to-tr from-indigo-600 to-indigo-700 text-white flex items-center justify-center shadow-md shadow-indigo-200 shrink-0">
            {activeTab === 'ios' ? <Apple className="w-6 h-6 text-white" /> : <Smartphone className="w-6 h-6 text-white" />}
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 text-lg leading-tight">
              {activeTab === 'ios' ? 'Pasang di iPhone / iPad' : 'Pasang di HP Android'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Jadikan aplikasi mandiri di layar utama (Homescreen)
            </p>
          </div>
        </div>

        {/* Platform Switcher Tabs */}
        <div className="flex p-1 bg-slate-100 rounded-xl mb-4 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('ios')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'ios'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Apple className="w-4 h-4" />
            <span>iPhone / iPad (iOS)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('android')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'android'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Smartphone className="w-4 h-4 text-emerald-600" />
            <span>Android (Chrome)</span>
          </button>
        </div>

        {/* Content based on Tab */}
        <div className="overflow-y-auto pr-1 space-y-4 text-xs text-slate-700 flex-1">
          {activeTab === 'ios' ? (
            <div className="space-y-3.5">
              {/* Important Safari Notice */}
              <div className="p-3 bg-amber-50 border border-amber-200/80 rounded-xl text-amber-900 flex items-start gap-2.5">
                <Compass className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div className="text-[11px] leading-relaxed">
                  <strong>Penting:</strong> Di iPhone / iPad, instalasi wajib dilakukan melalui browser <strong>Safari</strong> (bukan dari dalam aplikasi WhatsApp atau Instagram).
                </div>
              </div>

              {/* Copy URL Quick Action */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-2">
                <div className="truncate text-[11px] text-slate-600">
                  <span className="font-semibold text-slate-800 block text-[10px] uppercase tracking-wider text-slate-400">Tautan Web:</span>
                  <span className="font-mono text-indigo-600">{appUrl}</span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold flex items-center gap-1.5 shrink-0 shadow-xs cursor-pointer transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Tersalin!' : 'Salin Link'}</span>
                </button>
              </div>

              {/* Step by Step Guide for iPhone */}
              <div className="space-y-2.5">
                <p className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  4 Langkah Mudah Memasang di iPhone:
                </p>

                <div className="space-y-2">
                  <div className="flex items-start gap-3 p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl">
                    <span className="w-5 h-5 rounded-full bg-slate-900 text-white font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                      1
                    </span>
                    <div className="text-xs">
                      Buka tautan website ini di browser <strong>Safari</strong> pada iPhone Anda.
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl">
                    <span className="w-5 h-5 rounded-full bg-slate-900 text-white font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                      2
                    </span>
                    <div className="text-xs">
                      Ketuk tombol <strong>Bagikan (Share)</strong>
                      <span className="inline-flex items-center gap-1 mx-1.5 px-2 py-0.5 bg-white border border-slate-300 rounded font-semibold text-indigo-600 shadow-2xs">
                        <Share2 className="w-3 h-3 text-indigo-600" /> Share
                      </span>
                      di bilah bawah Safari.
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl">
                    <span className="w-5 h-5 rounded-full bg-slate-900 text-white font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                      3
                    </span>
                    <div className="text-xs">
                      Gulir ke bawah menu dan pilih <strong>"Tambahkan ke Layar Utama"</strong> (<em>Add to Home Screen</em>)
                      <span className="inline-flex items-center gap-1 mx-1.5 px-2 py-0.5 bg-white border border-slate-300 rounded font-semibold text-slate-900 shadow-2xs">
                        <PlusSquare className="w-3 h-3 text-indigo-600" /> ＋
                      </span>.
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl">
                    <span className="w-5 h-5 rounded-full bg-slate-900 text-white font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                      4
                    </span>
                    <div className="text-xs">
                      Ketuk tombol <strong>Tambah (Add)</strong> di sudut kanan atas layar iPhone Anda.
                    </div>
                  </div>
                </div>
              </div>

              {/* iPhone Safari Visual Mockup */}
              <div className="p-3 bg-linear-to-b from-slate-900 to-slate-800 text-white rounded-2xl border border-slate-700 shadow-inner">
                <div className="flex items-center justify-between text-[11px] text-slate-300 border-b border-slate-700/80 pb-2 mb-2">
                  <span className="flex items-center gap-1">
                    <Compass className="w-3.5 h-3.5 text-indigo-400" />
                    Tampilan Bilah Bawah Safari iPhone
                  </span>
                  <span className="text-[10px] text-emerald-400 font-mono">iOS Ready</span>
                </div>
                <div className="flex items-center justify-around py-1 text-slate-300">
                  <span className="text-xs font-mono text-slate-500">◀</span>
                  <span className="text-xs font-mono text-slate-500">▶</span>
                  <div className="flex flex-col items-center">
                    <div className="p-1.5 rounded-lg bg-indigo-600 text-white animate-bounce shadow-md">
                      <Share2 className="w-4 h-4" />
                    </div>
                    <span className="text-[9px] text-indigo-300 font-bold mt-1">Ketuk di sini</span>
                  </div>
                  <span className="text-xs font-mono text-slate-500">📖</span>
                  <span className="text-xs font-mono text-slate-500">⊞</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3.5">
              {/* Native install prompt button if available in Chromium */}
              {isInstallable && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-2">
                  <div className="font-bold text-emerald-900 text-xs">
                    Perangkat Anda mendukung instalasi instan!
                  </div>
                  <Button
                    onClick={async () => {
                      const res = await install();
                      if (res) onClose();
                    }}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-2 text-xs font-bold shadow-xs cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    Instal Aplikasi Sekarang
                  </Button>
                </div>
              )}

              {/* Step by Step Guide for Android */}
              <div className="space-y-2.5">
                <p className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  Cara Memasang di Android (Google Chrome):
                </p>

                <div className="space-y-2">
                  <div className="flex items-start gap-3 p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                      1
                    </span>
                    <div className="text-xs">
                      Buka situs LMS ini menggunakan browser <strong>Google Chrome</strong> di HP Android Anda.
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                      2
                    </span>
                    <div className="text-xs">
                      Ketuk menu titik tiga (<strong>⋮</strong>) di sudut kanan atas browser Chrome.
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                      3
                    </span>
                    <div className="text-xs">
                      Pilih menu <strong>"Instal aplikasi"</strong> atau <strong>"Tambahkan ke Layar Utama"</strong>.
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                      4
                    </span>
                    <div className="text-xs">
                      Ketuk <strong>Instal</strong>. Ikon SmartLMS akan muncul di daftar aplikasi HP Android Anda.
                    </div>
                  </div>
                </div>
              </div>

              {/* Benefits Box */}
              <div className="p-3 bg-indigo-50/70 border border-indigo-200/80 rounded-2xl space-y-1.5 text-[11px] text-indigo-900">
                <div className="font-bold flex items-center gap-1.5 text-xs text-indigo-950">
                  <ShieldCheck className="w-4 h-4 text-indigo-600" />
                  Keuntungan Aplikasi PWA:
                </div>
                <ul className="list-disc pl-4 space-y-0.5 text-indigo-800">
                  <li>Tampilan layar penuh tanpa terganggu bilah navigasi browser.</li>
                  <li>Mengerjakan CBT dan kuis lebih fokus dan stabil.</li>
                  <li>Hemat kuota dan waktu muat halaman jauh lebih cepat.</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2 shrink-0">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onClose} 
            className="flex-1 font-semibold text-slate-700 cursor-pointer"
          >
            Tutup
          </Button>
          <Button 
            size="sm" 
            onClick={() => {
              if (activeTab === 'ios') {
                handleCopyLink();
              } else if (isInstallable) {
                install().then(() => onClose());
              } else {
                onClose();
              }
            }} 
            className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-semibold cursor-pointer"
          >
            {activeTab === 'ios' ? 'Salin Link Safari' : (isInstallable ? 'Instal Sekarang' : 'Saya Mengerti')}
          </Button>
        </div>
      </div>
    </div>
  );
}
