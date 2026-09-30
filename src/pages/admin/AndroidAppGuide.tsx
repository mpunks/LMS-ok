import React from 'react';
import { 
  Smartphone, 
  Download, 
  CheckCircle2, 
  ExternalLink, 
  Layers, 
  ShieldCheck, 
  Sparkles, 
  Terminal, 
  Copy, 
  Globe, 
  Share2 
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/Toast';
import { PWAInstallButton } from '@/components/common/PWAInstallButton';

export default function AndroidAppGuide() {
  const currentUrl = typeof window !== 'undefined' ? window.location.origin : '';

  const copyCommand = (cmd: string) => {
    navigator.clipboard.writeText(cmd);
    toast.success('Perintah disalin ke papan klip!');
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
          <Smartphone className="w-7 h-7 text-indigo-600" />
          Aplikasi Android SmartLMS (PWA & APK)
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          LMS ini telah dirancang dengan standar <strong>Progressive Web App (PWA) Standalone</strong> dan siap dijalankan sebagai aplikasi Android asli di HP siswa dan guru.
        </p>
      </div>

      {/* Status Card */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <div className="text-xs font-bold text-emerald-950">PWA Manifest Aktif</div>
            <p className="text-[11px] text-emerald-800 mt-0.5">Ikon HD, tema warna, dan konfigurasi standalone siap</p>
          </div>
        </div>

        <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-200 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
          <div>
            <div className="text-xs font-bold text-indigo-950">Layar Penuh (Standalone)</div>
            <p className="text-[11px] text-indigo-800 mt-0.5">Tampilan tanpa address bar browser, seperti aplikasi APK asli</p>
          </div>
        </div>

        <div className="p-4 bg-purple-50 rounded-2xl border border-purple-200 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
          <div>
            <div className="text-xs font-bold text-purple-950">Mode Offline Caching</div>
            <p className="text-[11px] text-purple-800 mt-0.5">Service worker menyimpan modul & antarmuka secara lokal</p>
          </div>
        </div>
      </div>

      {/* Metode 1: Pasang Langsung Tanpa Download File */}
      <Card className="border-indigo-200 shadow-sm overflow-hidden">
        <div className="bg-linear-to-r from-indigo-600 to-indigo-800 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-300" />
            <h2 className="font-bold text-sm sm:text-base">Metode 1: Pemasangan Langsung di HP Android (Rekomendasi)</h2>
          </div>
          <span className="text-[11px] bg-white/20 px-2.5 py-0.5 rounded-full font-medium">Instan & Ringan</span>
        </div>
        <CardContent className="p-6 space-y-4 text-xs sm:text-sm text-slate-700">
          <p className="leading-relaxed">
            Siswa dan guru <strong>tidak perlu mengunduh file APK manual</strong> yang berisiko peringatan keamanan. Mereka dapat langsung memasang aplikasi resmi ke layar utama HP mereka:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold text-xs inline-flex items-center justify-center">1</span>
              <p className="font-semibold text-slate-800 mt-1">Buka di Browser HP</p>
              <p className="text-[11px] text-slate-500">Buka alamat LMS ini menggunakan Google Chrome di HP Android.</p>
            </div>
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold text-xs inline-flex items-center justify-center">2</span>
              <p className="font-semibold text-slate-800 mt-1">Klik "Pasang App"</p>
              <p className="text-[11px] text-slate-500">Klik tombol banner <strong>"Pasang Aplikasi SmartLMS"</strong> yang otomatis muncul di halaman login.</p>
            </div>
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold text-xs inline-flex items-center justify-center">3</span>
              <p className="font-semibold text-slate-800 mt-1">Siap Digunakan</p>
              <p className="text-[11px] text-slate-500">Ikon SmartLMS akan terpasang di daftar aplikasi HP dan terbuka di layar penuh.</p>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between border-t border-slate-100">
            <span className="text-xs text-slate-500">Coba pasang di perangkat Anda sekarang:</span>
            <PWAInstallButton variant="pill" />
          </div>
        </CardContent>
      </Card>

      {/* Metode 2: Konversi Menjadi File APK Standalone */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Terminal className="w-5 h-5 text-indigo-600" />
            Metode 2: Membuat File APK Mandiri (Untuk Play Store / Distribusi Offline)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-xs sm:text-sm text-slate-700">
          <p className="leading-relaxed">
            Jika sekolah menginginkan file fisik <code>.apk</code> untuk dibagikan via WhatsApp, Google Drive, atau diunggah ke Google Play Store, gunakan alat resmi Google (<strong>Bubblewrap TWA</strong>) atau <strong>PWABuilder</strong>:
          </p>

          {/* Opsi A: PWABuilder Online (Paling Mudah) */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-indigo-600" />
                Opsi A: Menggunakan PWABuilder (Online Generator Gratis)
              </span>
              <a 
                href="https://www.pwabuilder.com" 
                target="_blank" 
                rel="noreferrer"
                className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
              >
                Buka PWABuilder <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <ol className="list-decimal pl-4 space-y-1 text-xs text-slate-600">
              <li>Buka situs <strong>pwabuilder.com</strong> di laptop/komputer.</li>
              <li>Masukkan URL website LMS sekolah Anda (<code>{currentUrl}</code>).</li>
              <li>Klik <strong>Start</strong> lalu pilih <strong>Package for Android</strong>.</li>
              <li>Klik <strong>Download Package</strong>. Anda akan mendapatkan file <code>.apk</code> untuk dipasang langsung di HP Android dan <code>.aab</code> untuk Google Play Store!</li>
            </ol>
          </div>

          {/* Opsi B: Google Bubblewrap CLI */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <span className="font-bold text-slate-900 flex items-center gap-1.5">
              <Terminal className="w-4 h-4 text-slate-700" />
              Opsi B: Menggunakan Google Bubblewrap CLI (Command Line)
            </span>
            <p className="text-xs text-slate-600">
              Jalankan perintah ini di terminal komputer Anda (memerlukan Node.js dan Java JDK):
            </p>
            <div className="p-3 bg-slate-900 text-emerald-400 font-mono text-xs rounded-xl relative group">
              <pre className="overflow-x-auto">
{`# 1. Pasang Bubblewrap CLI resmi Google
npm i -g @bubblewrap/cli

# 2. Inisialisasi dari manifest website SmartLMS
bubblewrap init --manifest=${currentUrl}/manifest.webmanifest

# 3. Bangun file APK
bubblewrap build`}
              </pre>
              <button
                type="button"
                onClick={() => copyCommand(`npm i -g @bubblewrap/cli\nbubblewrap init --manifest=${currentUrl}/manifest.webmanifest\nbubblewrap build`)}
                className="absolute top-2 right-2 p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
                title="Salin perintah"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
