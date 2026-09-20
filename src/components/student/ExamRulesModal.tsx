import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { 
  ShieldAlert, 
  CheckSquare, 
  AlertTriangle, 
  Lock, 
  Monitor, 
  Camera, 
  Maximize, 
  Eye, 
  FileText,
  UserCheck,
  XCircle,
  HelpCircle,
  ArrowRight
} from 'lucide-react';
import { User, Quiz } from '@/types';

interface ExamRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAgreeAndStart: () => void;
  isLoading?: boolean;
  quiz: {
    title: string;
    durationMinutes: number;
    questions: any[];
    classId?: string;
    subjectId?: string;
  };
  student?: User | null;
}

export default function ExamRulesModal({
  isOpen,
  onClose,
  onAgreeAndStart,
  isLoading = false,
  quiz,
  student
}: ExamRulesModalProps) {
  const [agreementChecked, setAgreementChecked] = useState(false);
  const [activeTab, setActiveTab] = useState<'rules' | 'consequences'>('rules');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/75 backdrop-blur-sm overflow-y-auto animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full my-auto flex flex-col overflow-hidden border border-slate-200">
        
        {/* Header with Official Badge */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 sm:p-6 border-b border-indigo-900/50 relative">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center shrink-0 text-indigo-300">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-indigo-500/30 text-indigo-200 border border-indigo-400/20">
                  TATA TERTIB RESMI CBT
                </span>
                <span className="text-[11px] text-slate-300">
                  SMP SMART LMS
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-white mt-1 leading-snug">
                Pakta Integritas & Ketentuan Ujian Digital
              </h2>
            </div>
          </div>

          {/* Student & Quiz Information Bar */}
          <div className="mt-4 pt-3 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="bg-white/5 p-2 rounded-lg border border-white/5">
              <span className="text-[10px] text-slate-400 block">Nama Peserta:</span>
              <span className="font-semibold text-white truncate block">{student?.name || 'Siswa'}</span>
            </div>
            <div className="bg-white/5 p-2 rounded-lg border border-white/5">
              <span className="text-[10px] text-slate-400 block">NISN / Kelas:</span>
              <span className="font-semibold text-white truncate block">{student?.nisn || '-'} ({quiz.classId || '-'})</span>
            </div>
            <div className="bg-white/5 p-2 rounded-lg border border-white/5">
              <span className="text-[10px] text-slate-400 block">Durasi Ujian:</span>
              <span className="font-semibold text-amber-300 block">{quiz.durationMinutes} Menit</span>
            </div>
            <div className="bg-white/5 p-2 rounded-lg border border-white/5">
              <span className="text-[10px] text-slate-400 block">Jumlah Soal:</span>
              <span className="font-semibold text-white block">{quiz.questions.length} Butir Soal</span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50/80 px-6 pt-2">
          <button
            type="button"
            onClick={() => setActiveTab('rules')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'rules'
                ? 'border-indigo-600 text-indigo-700 bg-white rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <FileText className="w-3.5 h-3.5" /> 1. Tata Tertib & Larangan
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('consequences')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'consequences'
                ? 'border-rose-600 text-rose-700 bg-white rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" /> 2. Sanksi & Pengawasan Layar
          </button>
        </div>

        {/* Scrollable Rules Content */}
        <div className="p-6 max-h-[50vh] overflow-y-auto space-y-4 text-xs text-slate-700 leading-relaxed">
          {activeTab === 'rules' ? (
            <div className="space-y-4">
              <div className="bg-indigo-50/70 border border-indigo-100 rounded-xl p-3.5">
                <h4 className="font-bold text-indigo-950 text-xs flex items-center gap-2 mb-1.5">
                  <UserCheck className="w-4 h-4 text-indigo-600" />
                  Kewajiban Peserta Ujian:
                </h4>
                <ol className="list-decimal pl-4 space-y-1 text-indigo-900">
                  <li>Mengerjakan ujian secara mandiri, jujur, dan berintegritas tanpa bantuan orang lain.</li>
                  <li>Mengizinkan mode <strong>Layar Penuh (Fullscreen)</strong> selama ujian berlangsung.</li>
                  <li>Memberikan izin sensor pengawasan layar (*display capture*) dan kamera saat diminta oleh peramban.</li>
                  <li>Menjawab butir soal sebelum batas waktu hitung mundur berakhir.</li>
                </ol>
              </div>

              <div className="border border-rose-200 bg-rose-50/40 rounded-xl p-3.5 space-y-2">
                <h4 className="font-bold text-rose-900 text-xs flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-rose-600" />
                  Larangan Keras Selama Ujian:
                </h4>
                <ul className="list-disc pl-4 space-y-1.5 text-rose-950">
                  <li>
                    <strong>Dilarang Membuka Tab / Browser Lain:</strong> Membuka tab baru (Google, AI, ChatGPT, Brainly, dsb) akan memicu peringatan seketika.
                  </li>
                  <li>
                    <strong>Dilarang Berpindah Aplikasi / Split Screen:</strong> Meminimalkan browser, membuka WhatsApp Web/Desktop, kalkulator eksternal, atau catatan sampingan.
                  </li>
                  <li>
                    <strong>Dilarang Keluar dari Layar Penuh:</strong> Menekan tombol <code>Esc</code> atau tombol Windows untuk keluar dari mode fullscreen.
                  </li>
                  <li>
                    <strong>Dilarang Salin-Tempel Teks (Copy-Paste):</strong> Soal ujian tidak dapat disalin dan sistem memblokir teks yang ditempel dari luar.
                  </li>
                  <li>
                    <strong>Dilarang Mengklik Kanan:</strong> Membuka menu konteks atau Developer Tools (F12) untuk melihat kunci jawaban.
                  </li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2.5">
                <h4 className="font-bold text-amber-900 text-xs flex items-center gap-2">
                  <Monitor className="w-4 h-4 text-amber-600" />
                  Mekanisme Perekaman Bukti Visual Otomatis:
                </h4>
                <p className="text-amber-950">
                  Aplikasi CBT ini dilengkapi sistem <strong>Snapshot Evidence</strong>. Setiap kali Anda berpindah tab atau keluar dari aplikasi ujian, sistem akan:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <div className="bg-white/80 p-2.5 rounded-lg border border-amber-200/60">
                    <span className="font-bold text-slate-800 block mb-0.5">📸 Tangkapan Layar Forensik</span>
                    <span className="text-[11px] text-slate-600">Menyimpan gambar layar saat jendela lain dibuka beserta stempel waktu presisi.</span>
                  </div>
                  <div className="bg-white/80 p-2.5 rounded-lg border border-amber-200/60">
                    <span className="font-bold text-slate-800 block mb-0.5">⏱️ Rekap Durasi Meninggalkan</span>
                    <span className="text-[11px] text-slate-600">Menghitung berapa detik Anda berada di luar lembar ujian dan nomor soal yang dibuka.</span>
                  </div>
                </div>
              </div>

              <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 space-y-2">
                <h4 className="font-bold text-rose-900 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  Tingkatan Sanksi & Hukuman:
                </h4>
                <div className="space-y-1.5 text-rose-950">
                  <p>• <strong>Peringatan 1 - 2:</strong> Muncul notifikasi peringatan di layar dan bukti tangkapan layar langsung dikirim ke Berita Acara Guru.</p>
                  <p>• <strong>Peringatan 3:</strong> Lembar ujian <strong>otomatis dikunci dan dihentikan seketika</strong>.</p>
                  <p>• <strong>Sanksi Guru & Sekolah:</strong> Guru berhak memberikan <strong>pemotongan nilai</strong>, pembatalan nilai, atau <strong>diskualifikasi ujian (Nilai 0)</strong> berdasarkan bukti Berita Acara Pelanggaran.</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Confirmation Checkbox & Action Button */}
        <div className="p-5 bg-slate-50 border-t border-slate-200 space-y-4">
          <label className="flex items-start gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={agreementChecked}
              onChange={(e) => setAgreementChecked(e.target.checked)}
              className="mt-0.5 w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
            />
            <span className="text-xs text-slate-800 leading-relaxed">
              Saya telah membaca, memahami, dan berjanji akan mematuhi <strong>Tata Tertib Ujian Digital</strong> di atas. Saya bersedia menerima sanksi pembatalan nilai apabila terbukti melakukan kecurangan.
            </span>
          </label>

          <div className="flex items-center justify-between gap-3 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="text-xs text-slate-600"
            >
              Kembali
            </Button>

            <Button
              type="button"
              size="sm"
              disabled={!agreementChecked || isLoading}
              isLoading={isLoading}
              onClick={onAgreeAndStart}
              className={`gap-2 text-xs font-bold transition-all px-5 py-2.5 ${
                agreementChecked 
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md' 
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Lock className="w-4 h-4" />
              Mulai Mengerjakan Ujian <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

      </div>
    </div>
  );
}
