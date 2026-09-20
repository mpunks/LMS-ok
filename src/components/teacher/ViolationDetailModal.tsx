import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { 
  X, 
  AlertTriangle, 
  ShieldAlert, 
  Clock, 
  Camera, 
  Monitor, 
  Printer, 
  CheckCircle, 
  Slash, 
  FileText,
  RotateCcw,
  ZoomIn
} from 'lucide-react';
import { QuizResult, ViolationLog, User, Quiz } from '@/types';
import { toast } from '@/components/ui/Toast';
import { useDataStore } from '@/store/dataStore';

interface ViolationDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: QuizResult;
  student?: User;
  quiz?: Quiz;
}

export default function ViolationDetailModal({
  isOpen,
  onClose,
  result,
  student,
  quiz
}: ViolationDetailModalProps) {
  const { updateQuizResult, deleteQuizResult } = useDataStore();
  
  const [penaltyPoints, setPenaltyPoints] = useState<number>(result.penaltyDeduction || 0);
  const [isDisqualified, setIsDisqualified] = useState<boolean>(result.disqualified || false);
  const [teacherNote, setTeacherNote] = useState<string>(result.teacherNote || '');
  const [selectedSnapshot, setSelectedSnapshot] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const rawScore = result.score;
  const computedFinal = isDisqualified ? 0 : Math.max(0, rawScore - penaltyPoints);
  const violations = result.violationLogs || [];
  const totalDurationAway = violations.reduce((acc, curr) => acc + (curr.durationSeconds || 0), 0);

  const handleSaveSanction = async () => {
    setIsSaving(true);
    try {
      await updateQuizResult(result.id, {
        penaltyDeduction: penaltyPoints,
        disqualified: isDisqualified,
        finalScore: computedFinal,
        teacherNote: teacherNote
      });
      toast.success('Keputusan sanksi dan berita acara berhasil disimpan');
      onClose();
    } catch (e: any) {
      toast.error(e.message || 'Gagal menyimpan sanksi');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetExam = async () => {
    if (window.confirm(`Hapus hasil ujian ${student?.name} agar siswa dapat mengulang ujian kembali?`)) {
      try {
        await deleteQuizResult(result.id);
        toast.success('Hasil ujian telah di-reset. Siswa dapat mengikuti ujian kembali.');
        onClose();
      } catch (e: any) {
        toast.error(e.message || 'Gagal mereset hasil ujian');
      }
    }
  };

  const handlePrintReport = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto print:p-0 print:bg-white">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200 print:max-h-none print:shadow-none print:rounded-none">
        
        {/* Header (Hidden in Print for custom print layout) */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 print:hidden">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${violations.length > 0 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                Berita Acara & Bukti Pelanggaran CBT
                {isDisqualified && (
                  <span className="text-xs bg-rose-600 text-white font-semibold px-2 py-0.5 rounded-full">
                    DIDISKUALIFIKASI
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-500">
                Siswa: <strong>{student?.name || 'Siswa'}</strong> (NISN: {student?.nisn || '-'}) • Kelas: {student?.classId || '-'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-2 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6 print:p-8">

          {/* Printable Header */}
          <div className="hidden print:block border-b-2 border-slate-900 pb-4 mb-6">
            <div className="text-center">
              <h1 className="text-2xl font-bold uppercase tracking-wider">BERITA ACARA PELANGGARAN UJIAN (CBT)</h1>
              <p className="text-sm text-slate-600">SMART LMS - SISTEM PENGAWASAN & INTEGRITAS UJIAN DIGITAL</p>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-6 text-sm">
              <div>
                <p><strong>Nama Siswa:</strong> {student?.name}</p>
                <p><strong>NISN:</strong> {student?.nisn || '-'}</p>
                <p><strong>Kelas:</strong> {student?.classId || '-'}</p>
              </div>
              <div>
                <p><strong>Judul Ujian:</strong> {quiz?.title || 'Ujian CBT'}</p>
                <p><strong>Waktu Submit:</strong> {new Date(result.submittedAt).toLocaleString('id-ID')}</p>
                <p><strong>Status Integritas:</strong> {violations.length > 0 ? `${violations.length} Pelanggaran Terdeteksi` : 'Bersih'}</p>
              </div>
            </div>
          </div>

          {/* Metric Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl text-center">
              <span className="text-xs text-slate-500 block mb-1 font-medium">Total Pelanggaran</span>
              <span className={`text-2xl font-bold ${violations.length > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                {violations.length} Kali
              </span>
            </div>
            <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl text-center">
              <span className="text-xs text-slate-500 block mb-1 font-medium">Durasi Keluar</span>
              <span className="text-2xl font-bold text-amber-600">
                {totalDurationAway > 0 ? `${totalDurationAway} dtk` : '0 dtk'}
              </span>
            </div>
            <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl text-center">
              <span className="text-xs text-slate-500 block mb-1 font-medium">Nilai Murni</span>
              <span className="text-2xl font-bold text-slate-700">
                {rawScore.toFixed(1)}
              </span>
            </div>
            <div className={`p-3.5 rounded-xl text-center border ${
              isDisqualified 
                ? 'bg-rose-50 border-rose-200 text-rose-900' 
                : 'bg-indigo-50 border-indigo-200 text-indigo-900'
            }`}>
              <span className="text-xs block mb-1 font-medium">
                {isDisqualified ? 'Nilai (Diskualifikasi)' : 'Nilai Akhir'}
              </span>
              <span className="text-2xl font-bold">
                {isDisqualified ? '0' : computedFinal.toFixed(1)}
              </span>
            </div>
          </div>

          {/* Sanksi & Tindakan Guru Form (Hidden in Print) */}
          <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-4 space-y-4 print:hidden">
            <div className="flex items-center gap-2 text-amber-900 font-semibold text-sm">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              Pertimbangan Sanksi & Keputusan Guru
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                  Potongan Nilai Penalti (Poin):
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max={rawScore}
                    value={penaltyPoints}
                    disabled={isDisqualified}
                    onChange={(e) => setPenaltyPoints(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-32 px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                  />
                  <span className="text-xs text-slate-500">
                    Poin dikurangi dari {rawScore} → Sisa Nilai: <strong>{Math.max(0, rawScore - penaltyPoints).toFixed(1)}</strong>
                  </span>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                  Status Diskualifikasi Ujian:
                </label>
                <button
                  type="button"
                  onClick={() => setIsDisqualified(!isDisqualified)}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                    isDisqualified 
                      ? 'bg-rose-600 text-white shadow-sm' 
                      : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Slash className="w-3.5 h-3.5" />
                  {isDisqualified ? 'Siswa Didiskualifikasi (Nilai 0)' : 'Tidak Didiskualifikasi'}
                </button>
              </div>

              <div className="md:col-span-2">
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                  Catatan Berita Acara Pelanggaran (Untuk Rapor/Wali Murid):
                </label>
                <textarea
                  rows={2}
                  value={teacherNote}
                  onChange={(e) => setTeacherNote(e.target.value)}
                  placeholder="Contoh: Siswa terbukti membuka tab browser lain selama 45 detik pada soal nomor 3. Diberikan sanksi pengurangan nilai sebesar 20 poin."
                  className="w-full text-xs p-3 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-amber-200">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleResetExam}
                className="text-xs text-rose-700 border-rose-200 hover:bg-rose-50 gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Beri Kesempatan Ujian Ulang (Reset)
              </Button>

              <Button
                type="button"
                size="sm"
                onClick={handleSaveSanction}
                isLoading={isSaving}
                className="gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700"
              >
                <CheckCircle className="w-3.5 h-3.5" /> Simpan Keputusan Sanksi
              </Button>
            </div>
          </div>

          {/* Teacher Note in Print View */}
          {teacherNote && (
            <div className="hidden print:block border p-4 rounded-lg bg-slate-50 text-sm">
              <p className="font-bold text-slate-900 mb-1">Catatan Keputusan Guru:</p>
              <p className="text-slate-700 italic">"{teacherNote}"</p>
              <p className="mt-2 text-xs text-slate-500">
                Nilai Awal: {rawScore} | Penalti: -{penaltyPoints} poin | Nilai Akhir: <strong>{isDisqualified ? '0 (DISKUALIFIKASI)' : computedFinal}</strong>
              </p>
            </div>
          )}

          {/* Timeline of Captured Evidence */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-600" />
                Daftar Barang Bukti Pelanggaran & Rekaman Tangkapan Layar
              </h3>
              <span className="text-xs text-slate-500">
                Total {violations.length} rekaman bukti
              </span>
            </div>

            {violations.length === 0 ? (
              <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-800">Tidak Ditemukan Pelanggaran</p>
                <p className="text-xs text-slate-500">Siswa menyelesaikan ujian secara jujur tanpa berpindah jendela atau keluar dari mode layar penuh.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {violations.map((violation, idx) => (
                  <div 
                    key={violation.id || idx}
                    className="border border-slate-200 rounded-xl p-4 bg-white hover:border-slate-300 transition-shadow space-y-3"
                  >
                    {/* Header Item */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-rose-100 text-rose-700 text-xs font-bold flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <span className="text-xs font-bold text-slate-800">
                          {violation.type === 'TAB_SWITCH' && 'Membuka Tab Lain / Browser Lain'}
                          {violation.type === 'WINDOW_BLUR' && 'Membuka Aplikasi Lain (Split Screen / Loss Focus)'}
                          {violation.type === 'FULLSCREEN_EXIT' && 'Keluar Dari Layar Penuh'}
                          {violation.type === 'COPY_PASTE' && 'Upaya Salin / Tempel Teks'}
                          {violation.type === 'RIGHT_CLICK' && 'Klik Kanan (Context Menu)'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500">
                        <span className="inline-flex items-center gap-1 font-mono">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {new Date(violation.timestamp).toLocaleTimeString('id-ID')}
                        </span>
                        {violation.durationSeconds !== undefined && violation.durationSeconds > 0 && (
                          <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded text-[11px] font-semibold">
                            Keluar {violation.durationSeconds} Detik
                          </span>
                        )}
                        {violation.questionIndex !== undefined && (
                          <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px]">
                            Soal No. {violation.questionIndex + 1}
                          </span>
                        )}
                      </div>
                    </div>

                    <p className="text-xs text-slate-600">
                      {violation.description}
                    </p>

                    {/* Snapshot Preview */}
                    {(violation.snapshotImage || violation.webcamImage) && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                        {violation.snapshotImage && (
                          <div className="space-y-1">
                            <span className="text-[11px] font-semibold text-slate-600 flex items-center gap-1">
                              <Monitor className="w-3.5 h-3.5 text-indigo-600" />
                              Tangkapan Layar Saat Terjadi Pelanggaran:
                            </span>
                            <div 
                              className="relative group rounded-lg overflow-hidden border border-slate-200 bg-slate-900 cursor-pointer aspect-video"
                              onClick={() => setSelectedSnapshot(violation.snapshotImage || null)}
                            >
                              <img 
                                src={violation.snapshotImage} 
                                alt="Bukti Tangkapan Layar" 
                                className="w-full h-full object-contain"
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs gap-1.5 font-medium">
                                <ZoomIn className="w-4 h-4" /> Perbesar Tangkapan Layar
                              </div>
                            </div>
                          </div>
                        )}

                        {violation.webcamImage && (
                          <div className="space-y-1">
                            <span className="text-[11px] font-semibold text-slate-600 flex items-center gap-1">
                              <Camera className="w-3.5 h-3.5 text-rose-600" />
                              Foto Kamera Pengawas (Wajah Siswa):
                            </span>
                            <div 
                              className="relative group rounded-lg overflow-hidden border border-slate-200 bg-slate-900 cursor-pointer aspect-video"
                              onClick={() => setSelectedSnapshot(violation.webcamImage || null)}
                            >
                              <img 
                                src={violation.webcamImage} 
                                alt="Bukti Foto Kamera Siswa" 
                                className="w-full h-full object-contain"
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs gap-1.5 font-medium">
                                <ZoomIn className="w-4 h-4" /> Perbesar Foto Kamera
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Printable Signature Section */}
          <div className="hidden print:grid grid-cols-2 gap-10 mt-12 text-sm pt-8 border-t border-slate-300">
            <div className="text-center">
              <p>Guru Pengawas Ujian,</p>
              <div className="h-20"></div>
              <p className="font-bold underline">(......................................................)</p>
              <p className="text-xs text-slate-500">NIP:</p>
            </div>
            <div className="text-center">
              <p>Kepala Sekolah / Tim Tatib,</p>
              <div className="h-20"></div>
              <p className="font-bold underline">(......................................................)</p>
              <p className="text-xs text-slate-500">NIP:</p>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between print:hidden">
          <Button
            type="button"
            variant="outline"
            onClick={handlePrintReport}
            className="gap-2 text-xs text-slate-700"
          >
            <Printer className="w-4 h-4" /> Cetak Berita Acara Pelanggaran
          </Button>

          <Button
            type="button"
            onClick={onClose}
            className="text-xs"
          >
            Tutup Jendela
          </Button>
        </div>

      </div>

      {/* Fullscreen Snapshot Modal Lightbox */}
      {selectedSnapshot && (
        <div 
          className="fixed inset-0 z-60 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-in fade-in"
          onClick={() => setSelectedSnapshot(null)}
        >
          <div className="max-w-5xl w-full flex justify-end mb-2">
            <button 
              onClick={() => setSelectedSnapshot(null)}
              className="text-white hover:text-rose-400 p-2 text-sm font-semibold flex items-center gap-1 bg-white/10 rounded-lg px-3"
            >
              <X className="w-5 h-5" /> Tutup Pratinjau
            </button>
          </div>
          <div className="max-w-5xl max-h-[85vh] overflow-hidden rounded-xl border border-white/20 shadow-2xl bg-black">
            <img 
              src={selectedSnapshot} 
              alt="Tangkapan Layar Resolusi Penuh" 
              className="w-full h-auto max-h-[85vh] object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}
