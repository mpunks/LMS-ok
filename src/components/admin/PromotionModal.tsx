import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { 
  ArrowUpCircle, 
  GraduationCap, 
  AlertTriangle, 
  Trash2, 
  CheckCircle2, 
  X, 
  ChevronRight,
  ArrowRight,
  Sparkles,
  Users
} from 'lucide-react';
import { toast } from '@/components/ui/Toast';
import { useDataStore } from '@/store/dataStore';
import { PromotionOptions, PromotionSummary } from '@/types';

interface PromotionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PromotionModal({ isOpen, onClose }: PromotionModalProps) {
  const { users, promoteStudents } = useDataStore();
  const students = users.filter(u => u.role === 'STUDENT');

  const [grade9Action, setGrade9Action] = useState<'DELETE' | 'GRADUATE'>('DELETE');
  const [grade8LTarget, setGrade8LTarget] = useState<'9K' | '9L'>('9K');
  const [isProcessing, setIsProcessing] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [summaryResult, setSummaryResult] = useState<PromotionSummary | null>(null);

  if (!isOpen) return null;

  // Grade count breakdown
  const grade7Students = students.filter(s => (s.classId || '').trim().startsWith('7'));
  const grade8Students = students.filter(s => (s.classId || '').trim().startsWith('8'));
  const grade9Students = students.filter(s => (s.classId || '').trim().startsWith('9'));
  const otherStudents = students.filter(s => {
    const c = (s.classId || '').trim();
    return !c.startsWith('7') && !c.startsWith('8') && !c.startsWith('9');
  });

  const handlePromote = async () => {
    if (!confirmed) {
      toast.error('Harap centang konfirmasi sebelum memproses kenaikan kelas');
      return;
    }

    try {
      setIsProcessing(true);
      const options: PromotionOptions = {
        grade9Action,
        grade8LTarget
      };
      const result = await promoteStudents(options);
      setSummaryResult(result);
      toast.success('Kenaikan kelas otomatis berhasil diproses!');
    } catch (error: any) {
      console.error('Promotion error:', error);
      toast.error(error.message || 'Gagal memproses kenaikan kelas');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    setConfirmed(false);
    setSummaryResult(null);
    setIsProcessing(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-indigo-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-200">
              <ArrowUpCircle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Kenaikan Kelas Otomatis
              </h2>
              <p className="text-xs text-slate-500">
                Otomatisasi kenaikan tingkat akhir tahun ajaran (Kelas 7 &rarr; 8, 8 &rarr; 9, dan kelulusan Kelas 9).
              </p>
            </div>
          </div>
          <button 
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-600 p-2 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {summaryResult ? (
            /* Result View */
            <div className="space-y-5 text-center py-4 animate-in fade-in">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Kenaikan Kelas Berhasil Diproses!</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Database siswa dan integrasi Google Sheets telah berhasil disinkronkan.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3 text-left">
                <div className="p-3.5 bg-blue-50 border border-blue-100 rounded-xl">
                  <span className="text-[11px] font-semibold text-blue-700 uppercase tracking-wider block">Kelas 7 &rarr; 8</span>
                  <span className="text-2xl font-black text-blue-950 mt-1 block">{summaryResult.promotedGrade7To8}</span>
                  <span className="text-[11px] text-blue-600">Siswa naik tingkat</span>
                </div>

                <div className="p-3.5 bg-indigo-50 border border-indigo-100 rounded-xl">
                  <span className="text-[11px] font-semibold text-indigo-700 uppercase tracking-wider block">Kelas 8 &rarr; 9</span>
                  <span className="text-2xl font-black text-indigo-950 mt-1 block">{summaryResult.promotedGrade8To9}</span>
                  <span className="text-[11px] text-indigo-600">Siswa naik tingkat</span>
                </div>

                <div className="p-3.5 bg-amber-50 border border-amber-100 rounded-xl">
                  <span className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider block">Kelas 9 (Lulus)</span>
                  <span className="text-2xl font-black text-amber-950 mt-1 block">{summaryResult.grade9Handled}</span>
                  <span className="text-[11px] text-amber-700">
                    {summaryResult.grade9Action === 'DELETE' ? 'Dihapus dari database' : 'Ditandai Alumni/Lulus'}
                  </span>
                </div>
              </div>

              <div className="pt-3">
                <Button onClick={handleClose} className="w-full">
                  Selesai
                </Button>
              </div>
            </div>
          ) : (
            /* Setup & Confirmation View */
            <div className="space-y-6">
              {/* Preview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Grade 7 */}
                <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/50 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-xs font-bold text-blue-800">
                      <span>Kelas 7</span>
                      <span className="px-2 py-0.5 rounded-full bg-blue-200/60 text-blue-900">{grade7Students.length} siswa</span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-1.5">
                      Semua rombel (7A - 7L) akan dinaikkan langsung ke <strong>Kelas 8</strong> (8A - 8L).
                    </p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-blue-100 flex items-center justify-between text-xs font-semibold text-blue-700">
                    <span>Tingkat 7</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                    <span>Tingkat 8</span>
                  </div>
                </div>

                {/* Grade 8 */}
                <div className="p-3.5 rounded-xl border border-indigo-200 bg-indigo-50/50 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-xs font-bold text-indigo-800">
                      <span>Kelas 8</span>
                      <span className="px-2 py-0.5 rounded-full bg-indigo-200/60 text-indigo-900">{grade8Students.length} siswa</span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-1.5">
                      Semua rombel (8A - 8K) akan dinaikkan ke <strong>Kelas 9</strong> (9A - 9K).
                    </p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-indigo-100 flex items-center justify-between text-xs font-semibold text-indigo-700">
                    <span>Tingkat 8</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                    <span>Tingkat 9</span>
                  </div>
                </div>

                {/* Grade 9 */}
                <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/50 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-xs font-bold text-amber-800">
                      <span>Kelas 9</span>
                      <span className="px-2 py-0.5 rounded-full bg-amber-200/60 text-amber-900">{grade9Students.length} siswa</span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-1.5">
                      Siswa kelas 9 telah menyelesaikan jenjang pendidikan di SMP.
                    </p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-amber-100 flex items-center justify-between text-xs font-semibold text-amber-700">
                    <span>Tingkat 9</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                    <span>{grade9Action === 'DELETE' ? 'Hapus Data' : 'Lulus / Alumni'}</span>
                  </div>
                </div>
              </div>

              {/* Setting Option for Grade 9 */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                  <GraduationCap className="w-4 h-4 text-indigo-600" />
                  <span>Pilihan Penanganan Siswa Kelas 9 (Lulus):</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    grade9Action === 'DELETE' 
                      ? 'bg-rose-50/60 border-rose-300 ring-2 ring-rose-500/20' 
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}>
                    <input 
                      type="radio" 
                      name="grade9Action" 
                      checked={grade9Action === 'DELETE'} 
                      onChange={() => setGrade9Action('DELETE')}
                      className="mt-1 text-rose-600 focus:ring-rose-500" 
                    />
                    <div>
                      <span className="text-xs font-bold text-rose-950 flex items-center gap-1.5">
                        <Trash2 className="w-3.5 h-3.5 text-rose-600" /> Hapus dari Database (Direkomendasikan)
                      </span>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Siswa kelas 9 dihapus dari database aktif sehingga siap untuk menerima data siswa baru kelas 7 tahun ajaran berikutnya.
                      </p>
                    </div>
                  </label>

                  <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    grade9Action === 'GRADUATE' 
                      ? 'bg-indigo-50/60 border-indigo-300 ring-2 ring-indigo-500/20' 
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}>
                    <input 
                      type="radio" 
                      name="grade9Action" 
                      checked={grade9Action === 'GRADUATE'} 
                      onChange={() => setGrade9Action('GRADUATE')}
                      className="mt-1 text-indigo-600 focus:ring-indigo-500" 
                    />
                    <div>
                      <span className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-600" /> Mode Lulus / Alumni
                      </span>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Siswa ditandai status LULUS dan kelas diubah menjadi 'LULUS'. Data tetap disimpan sebagai riwayat alumni.
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Special Setting for 8L Target */}
              {students.some(s => (s.classId || '').trim().toUpperCase() === '8L') && (
                <div className="p-3.5 rounded-xl border border-indigo-100 bg-indigo-50/30 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-slate-800">Target Siswa Kelas 8L:</span>
                    <p className="text-[11px] text-slate-500">
                      Karena rombel kelas 9 standar adalah 9A - 9K, tentukan kelas tujuan untuk siswa 8L:
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setGrade8LTarget('9K')}
                      className={`px-3 py-1.5 rounded-lg font-bold border transition-all ${
                        grade8LTarget === '9K' 
                          ? 'bg-indigo-600 text-white border-indigo-600' 
                          : 'bg-white text-slate-700 border-slate-300'
                      }`}
                    >
                      Masuk ke 9K
                    </button>
                    <button
                      type="button"
                      onClick={() => setGrade8LTarget('9L')}
                      className={`px-3 py-1.5 rounded-lg font-bold border transition-all ${
                        grade8LTarget === '9L' 
                          ? 'bg-indigo-600 text-white border-indigo-600' 
                          : 'bg-white text-slate-700 border-slate-300'
                      }`}
                    >
                      Tetap 9L
                    </button>
                  </div>
                </div>
              )}

              {/* Warning Notice */}
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex gap-3 text-xs text-amber-900">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold">Perhatian Penting:</p>
                  <p className="text-[11px] text-amber-800">
                    Kenaikan kelas akan memperbarui rombel siswa di penyimpanan aplikasi dan tabel Google Sheets. 
                    Pastikan Anda telah mengunduh cadangan (backup) nilai atau rapor siswa sebelum melanjutkan.
                  </p>
                </div>
              </div>

              {/* Confirmation Checkbox */}
              <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-xl bg-slate-50/50 cursor-pointer hover:bg-slate-100/50 transition-colors">
                <input 
                  type="checkbox" 
                  checked={confirmed} 
                  onChange={(e) => setConfirmed(e.target.checked)} 
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                />
                <span className="text-xs font-semibold text-slate-800">
                  Saya mengonfirmasi untuk memproses kenaikan kelas {grade7Students.length + grade8Students.length} siswa dan kelulusan {grade9Students.length} siswa.
                </span>
              </label>

              {/* Action Buttons */}
              <div className="flex gap-2 justify-end pt-2 border-t border-slate-100">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handleClose}
                  disabled={isProcessing}
                >
                  Batal
                </Button>
                <Button 
                  type="button" 
                  onClick={handlePromote}
                  disabled={!confirmed || isProcessing}
                  className="gap-2 bg-indigo-600 hover:bg-indigo-700"
                >
                  <ArrowUpCircle className="w-4 h-4" />
                  {isProcessing ? 'Memproses Kenaikan...' : 'Proses Kenaikan Kelas'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
