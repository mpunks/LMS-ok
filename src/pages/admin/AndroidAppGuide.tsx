import React, { useState } from 'react';
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
  Share2,
  Apple,
  Compass,
  PlusSquare,
  Check
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/Toast';
import { PWAInstallButton } from '@/components/common/PWAInstallButton';

export default function AndroidAppGuide() {
  const currentUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const [copied, setCopied] = useState(false);

  const copyCommand = (cmd: string) => {
    navigator.clipboard.writeText(cmd);
    toast.success('Perintah disalin ke papan klip!');
  };

  const copyAppUrl = () => {
    navigator.clipboard.writeText(currentUrl);
    setCopied(true);
    toast.success('Tautan aplikasi berhasil disalin!');
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
          <Smartphone className="w-7 h-7 text-indigo-600" />
          Aplikasi Mobile SmartLMS (iPhone & Android)
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          LMS ini telah dirancang dengan standar <strong>Progressive Web App (PWA) Standalone</strong> dan siap dipasang serta dijalankan sebagai aplikasi resmi di HP <strong>iPhone (iOS)</strong> maupun <strong>Android</strong>.
        </p>
      </div>

      {/* Status Card */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-slate-900 text-white rounded-2xl border border-slate-800 flex items-start gap-3 shadow-sm">
          <Apple className="w-5 h-5 text-white shrink-0 mt-0.5" />
          <div>
            <div className="text-xs font-bold text-white">iPhone & iPad Siap</div>
            <p className="text-[11px] text-slate-300 mt-0.5">Ikon Apple Touch HD, Web App Capable, dan panduan Safari terintegrasi</p>
          </div>
        </div>

        <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-start gap-3 shadow-sm">
          <Smartphone className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <div className="text-xs font-bold text-emerald-950">Android & Chrome Siap</div>
            <p className="text-[11px] text-emerald-800 mt-0.5">PWA Manifest lengkap, instalasi 1-klik, dan opsi APK mandiri</p>
          </div>
        </div>

        <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-200 flex items-start gap-3 shadow-sm">
          <ShieldCheck className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
          <div>
            <div className="text-xs font-bold text-indigo-950">Layar Penuh Mandiri</div>
            <p className="text-[11px] text-indigo-800 mt-0.5">Berjalan tanpa bilah URL browser, aman dan fokus untuk ujian CBT</p>
          </div>
        </div>
      </div>

      {/* PANDUAN IPHONE & IPAD (IOS) */}
      <Card className="border-slate-300 shadow-sm overflow-hidden">
        <div className="bg-linear-to-r from-slate-900 via-slate-800 to-indigo-950 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Apple className="w-5 h-5 text-white" />
            <div>
              <h2 className="font-bold text-sm sm:text-base">Pemasangan di iPhone & iPad (iOS Safari)</h2>
              <p className="text-[11px] text-slate-300">Resmi, tanpa perlu jailbreak atau instalasi ribet</p>
            </div>
          </div>
          <PWAInstallButton platform="ios" variant="pill" className="bg-white text-slate-900 hover:bg-slate-100" />
        </div>

        <CardContent className="p-6 space-y-4 text-xs sm:text-sm text-slate-700">
          <p className="leading-relaxed">
            Pengguna <strong>iPhone</strong> dan <strong>iPad</strong> dapat memasang SmartLMS langsung ke Layar Utama (Home Screen) menggunakan browser bawaan <strong>Safari</strong>:
          </p>

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 flex items-start gap-2.5">
            <Compass className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div className="text-xs leading-relaxed">
              <strong>Catatan Safari:</strong> Di iOS, Apple mewajibkan pemasangan PWA dilakukan melalui browser <strong>Safari</strong>. Jika link dibuka dari WhatsApp atau Instagram, salin tautan dan tempel di Safari.
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <span className="w-6 h-6 rounded-full bg-slate-900 text-white font-bold text-xs inline-flex items-center justify-center">1</span>
              <p className="font-semibold text-slate-800 mt-1">Buka di Safari</p>
              <p className="text-[11px] text-slate-500">Buka alamat LMS di browser Safari iPhone Anda.</p>
            </div>
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <span className="w-6 h-6 rounded-full bg-slate-900 text-white font-bold text-xs inline-flex items-center justify-center">2</span>
              <p className="font-semibold text-slate-800 mt-1">Ketuk Tombol Share</p>
              <p className="text-[11px] text-slate-500">Ketuk ikon <strong>Bagikan (Share)</strong> <Share2 className="w-3 h-3 inline text-indigo-600" /> di menu bawah Safari.</p>
            </div>
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <span className="w-6 h-6 rounded-full bg-slate-900 text-white font-bold text-xs inline-flex items-center justify-center">3</span>
              <p className="font-semibold text-slate-800 mt-1">Pilih Add to Home Screen</p>
              <p className="text-[11px] text-slate-500">Gulir ke bawah dan ketuk menu <strong>"Tambahkan ke Layar Utama"</strong> <PlusSquare className="w-3 h-3 inline text-indigo-600" />.</p>
            </div>
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <span className="w-6 h-6 rounded-full bg-slate-900 text-white font-bold text-xs inline-flex items-center justify-center">4</span>
              <p className="font-semibold text-slate-800 mt-1">Ketuk Tambah</p>
              <p className="text-[11px] text-slate-500">Ketuk <strong>Tambah (Add)</strong> di pojok kanan atas. Ikon langsung muncul di layar utama iPhone!</p>
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100">
            <div className="text-xs text-slate-500">
              Tautan untuk dibagikan ke siswa/guru iPhone: <code className="font-mono text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{currentUrl}</code>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={copyAppUrl} className="gap-1.5 text-xs">
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Tersalin' : 'Salin Tautan'}
              </Button>
              <PWAInstallButton platform="ios" variant="pill" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* PANDUAN ANDROID */}
      <Card className="border-indigo-200 shadow-sm overflow-hidden">
        <div className="bg-linear-to-r from-emerald-600 via-teal-700 to-indigo-800 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-white" />
            <div>
              <h2 className="font-bold text-sm sm:text-base">Pemasangan di HP Android (Google Chrome)</h2>
              <p className="text-[11px] text-emerald-100">Instalasi instan 1-klik via Web App Install Prompt</p>
            </div>
          </div>
          <PWAInstallButton platform="android" variant="pill" className="bg-white text-emerald-700 hover:bg-emerald-50" />
        </div>
        <CardContent className="p-6 space-y-4 text-xs sm:text-sm text-slate-700">
          <p className="leading-relaxed">
            Siswa dan guru pengguna Android <strong>tidak perlu mengunduh file APK manual</strong> yang berisiko peringatan keamanan. Mereka dapat langsung memasang aplikasi resmi ke layar utama HP mereka:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold text-xs inline-flex items-center justify-center">1</span>
              <p className="font-semibold text-slate-800 mt-1">Buka di Browser HP</p>
              <p className="text-[11px] text-slate-500">Buka alamat LMS ini menggunakan Google Chrome di HP Android.</p>
            </div>
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold text-xs inline-flex items-center justify-center">2</span>
              <p className="font-semibold text-slate-800 mt-1">Klik "Pasang di Android"</p>
              <p className="text-[11px] text-slate-500">Klik tombol banner <strong>"Pasang Aplikasi SmartLMS"</strong> yang otomatis muncul di halaman login.</p>
            </div>
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold text-xs inline-flex items-center justify-center">3</span>
              <p className="font-semibold text-slate-800 mt-1">Siap Digunakan</p>
              <p className="text-[11px] text-slate-500">Ikon SmartLMS akan terpasang di daftar aplikasi HP dan terbuka di layar penuh.</p>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between border-t border-slate-100">
            <span className="text-xs text-slate-500">Coba pasang di HP Android Anda sekarang:</span>
            <PWAInstallButton platform="android" variant="pill" />
          </div>
        </CardContent>
      </Card>

      {/* METODE PEMBUATAN FILE APK STANDALONE */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Terminal className="w-5 h-5 text-indigo-600" />
            Membuat File APK Mandiri (Untuk Play Store / Distribusi Offline)
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
              <li>Klik <strong>Start</strong> lalu pilih <strong>Package for Android</strong> (atau iOS untuk format Xcode).</li>
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
                className="absolute top-2 right-2 p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
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
