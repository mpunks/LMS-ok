import React, { useState } from 'react';
import { 
  Database, 
  Trash2, 
  AlertTriangle, 
  ShieldAlert, 
  Download, 
  RefreshCw, 
  CheckCircle2, 
  Users, 
  BookOpen, 
  CheckSquare, 
  BarChart, 
  Lock, 
  FileText,
  Layers,
  Sparkles,
  Info
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { toast } from '@/components/ui/Toast';
import { useAuthStore } from '@/store/authStore';
import { useDataStore } from '@/store/dataStore';
import { useGasStore } from '@/store/gasStore';
import { DatabaseCleanTarget, DatabaseCleanSummary } from '@/types';

export default function AdminDatabaseClean() {
  const { user } = useAuthStore();
  const { users, materials, quizzes, quizResults, clearDatabase, cleanInitialSamples } = useDataStore();
  const { isConnected } = useGasStore();

  // Selection states
  const [selectedTargets, setSelectedTargets] = useState<DatabaseCleanTarget[]>([]);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [confirmationInput, setConfirmationInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCleaningSamples, setIsCleaningSamples] = useState(false);
  const [lastSummary, setLastSummary] = useState<DatabaseCleanSummary | null>(null);

  const handleCleanSamples = async () => {
    setIsCleaningSamples(true);
    try {
      await cleanInitialSamples();
      toast.success('Data contoh awal (Siswa Contoh, Guru Contoh, Kuis & Materi Contoh) berhasil dibersihkan dari Google Sheet & database!');
    } catch (err: any) {
      toast.error('Gagal membersihkan data contoh: ' + (err?.message || err));
    } finally {
      setIsCleaningSamples(false);
    }
  };

  // Security check: Only SUPER_ADMIN allowed
  if (user?.role !== 'SUPER_ADMIN') {
    return (
      <div className="max-w-2xl mx-auto mt-12 p-8 bg-white border border-rose-200 rounded-2xl text-center shadow-sm">
        <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Akses Terbatas: Khusus Super Admin</h2>
        <p className="text-sm text-slate-600 mb-6">
          Halaman pembersihan database hanya dapat diakses oleh akun dengan tingkat kewenangan <strong>Super Administrator</strong>.
        </p>
        <Button variant="outline" onClick={() => window.history.back()}>
          Kembali ke Dashboard
        </Button>
      </div>
    );
  }

  // Calculate current counts
  const studentCount = users.filter(u => u.role === 'STUDENT').length;
  const maleStudentCount = users.filter(u => u.role === 'STUDENT' && u.gender !== 'P').length;
  const femaleStudentCount = users.filter(u => u.role === 'STUDENT' && u.gender === 'P').length;
  const teacherCount = users.filter(u => u.role === 'TEACHER').length;
  const adminCount = users.filter(u => u.role === 'ADMIN' || u.role === 'SUPER_ADMIN').length;
  const materialCount = materials.length;
  const quizCount = quizzes.length;
  const resultCount = quizResults.length;

  // Backup data before wipe
  const handleBackupDownload = () => {
    try {
      const backupData = {
        exportedAt: new Date().toISOString(),
        application: 'SmartLMS & CBT School System',
        exportedBy: user.name,
        counts: {
          users: users.length,
          materials: materials.length,
          quizzes: quizzes.length,
          quizResults: quizResults.length,
        },
        data: {
          users,
          materials,
          quizzes,
          quizResults,
        }
      };

      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backupData, null, 2));
      const downloadAnchor = document.createElement('a');
      const dateStr = new Date().toISOString().split('T')[0];
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `backup_database_smartlms_${dateStr}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      toast.success('File cadangan database berhasil diunduh (.json)');
    } catch (err: any) {
      toast.error('Gagal mencadangkan database: ' + err.message);
    }
  };

  // Toggle individual target
  const handleToggleTarget = (target: DatabaseCleanTarget) => {
    if (target === 'ALL') {
      if (selectedTargets.includes('ALL')) {
        setSelectedTargets([]);
      } else {
        setSelectedTargets(['ALL']);
      }
      return;
    }

    // If 'ALL' was previously checked, clear it and toggle specific target
    const current = selectedTargets.filter(t => t !== 'ALL');
    if (current.includes(target)) {
      setSelectedTargets(current.filter(t => t !== target));
    } else {
      setSelectedTargets([...current, target]);
    }
  };

  // Preset selection helpers
  const handleSelectPreset = (preset: 'all' | 'students' | 'results' | 'materials_quizzes') => {
    if (preset === 'all') {
      setSelectedTargets(['ALL']);
    } else if (preset === 'students') {
      setSelectedTargets(['STUDENTS']);
    } else if (preset === 'results') {
      setSelectedTargets(['QUIZ_RESULTS']);
    } else if (preset === 'materials_quizzes') {
      setSelectedTargets(['MATERIALS', 'QUIZZES', 'QUIZ_RESULTS']);
    }
  };

  // Open confirmation modal
  const handleInitiateClean = () => {
    if (selectedTargets.length === 0) {
      toast.error('Pilih minimal satu kategori data yang ingin dibersihkan');
      return;
    }
    setConfirmationInput('');
    setIsConfirmModalOpen(true);
  };

  // Perform the clean execution
  const handleExecuteClean = async () => {
    if (confirmationInput.trim() !== 'BERSIHKAN DATABASE') {
      toast.error('Ketik kata konfirmasi "BERSIHKAN DATABASE" dengan benar');
      return;
    }

    setIsProcessing(true);
    try {
      const summary = await clearDatabase({
        targets: selectedTargets,
        preserveAdmins: true
      });

      setLastSummary(summary);
      setIsConfirmModalOpen(false);
      setSelectedTargets([]);
      toast.success('Pembersihan database berhasil diselesaikan!');
    } catch (err: any) {
      toast.error(err?.message || 'Terjadi kesalahan saat membersihkan database');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Top Banner & Security Badge */}
      <div className="bg-gradient-to-r from-rose-700 via-rose-600 to-amber-700 rounded-2xl p-6 text-white shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-xs text-xs font-semibold text-rose-100">
              <ShieldAlert className="w-3.5 h-3.5" />
              Kewenangan Khusus: Super Administrator
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Pembersihan & Reset Database</h1>
            <p className="text-xs sm:text-sm text-rose-100/90 max-w-2xl">
              Fasilitas khusus Super Admin untuk mereset data siswa, guru, materi pelajaran, atau hasil ujian saat pergantian semester maupun tahun ajaran baru. Akun Super Admin selalu terlindungi.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={handleBackupDownload}
              className="bg-white text-rose-700 hover:bg-rose-50 font-bold text-xs sm:text-sm shadow-sm gap-2 py-2.5 px-4 rounded-xl border border-white/20"
            >
              <Download className="w-4 h-4 text-rose-600" />
              Unduh Backup JSON
            </Button>
          </div>
        </div>
      </div>

      {/* Cloud Integration Notice */}
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
          <div>
            <p className="text-xs sm:text-sm font-semibold text-slate-800">
              Status Sinkronisasi Penyimpanan Cloud (Google Sheets): {isConnected ? 'Terhubung' : 'Penyimpanan Lokal Aktif'}
            </p>
            <p className="text-[11px] text-slate-500">
              {isConnected 
                ? 'Pembersihan akan otomatis menghapus data lokal dan baris data terkait pada Google Spreadsheet.' 
                : 'Pembersihan akan mereset penyimpanan lokal browser. Hubungkan GAS untuk persistensi cloud.'}
            </p>
          </div>
        </div>
        <div className="hidden sm:block text-right">
          <span className="text-xs font-medium text-slate-400">Total Akun Admin Aman: {adminCount}</span>
        </div>
      </div>

      {/* Real-Time Database Inventory */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
            <Database className="w-4 h-4 text-indigo-600" />
            Inventaris Data Saat Ini
          </h2>
          <span className="text-xs text-slate-500">Kondisi riil tersimpan di sistem</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          <Card className="border-slate-200 shadow-xs">
            <CardContent className="p-4">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold">Data Siswa</span>
                <Users className="w-4 h-4 text-blue-500" />
              </div>
              <div className="text-2xl font-bold text-slate-900">{studentCount}</div>
              <p className="text-[11px] text-slate-500 mt-1">
                {maleStudentCount} L / {femaleStudentCount} P
              </p>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-xs">
            <CardContent className="p-4">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold">Data Guru</span>
                <Users className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-2xl font-bold text-slate-900">{teacherCount}</div>
              <p className="text-[11px] text-slate-500 mt-1">Guru pengajar aktif</p>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-xs">
            <CardContent className="p-4">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold">Materi Ajar</span>
                <BookOpen className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-2xl font-bold text-slate-900">{materialCount}</div>
              <p className="text-[11px] text-slate-500 mt-1">Modul & media belajar</p>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-xs">
            <CardContent className="p-4">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold">Kuis & CBT</span>
                <CheckSquare className="w-4 h-4 text-purple-500" />
              </div>
              <div className="text-2xl font-bold text-slate-900">{quizCount}</div>
              <p className="text-[11px] text-slate-500 mt-1">Paket soal ujian</p>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-xs col-span-2 sm:col-span-1">
            <CardContent className="p-4">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold">Hasil Nilai</span>
                <BarChart className="w-4 h-4 text-rose-500" />
              </div>
              <div className="text-2xl font-bold text-slate-900">{resultCount}</div>
              <p className="text-[11px] text-slate-500 mt-1">Riwayat pengerjaan siswa</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Card Pembersihan Data Contoh / Sample Awal */}
      <Card className="border-amber-200 bg-amber-50/50 shadow-xs">
        <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Bersihkan Data Contoh / Mock Awal dari Google Sheet & Server
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                Menghapus akun contoh awal (Siswa Contoh, Guru Contoh), kuis contoh Bangun Datar & Aljabar, serta materi contoh. Akun resmi Anda dan Super Admin tidak terganggu.
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            disabled={isCleaningSamples}
            onClick={handleCleanSamples}
            className="shrink-0 gap-2 border-amber-300 bg-white hover:bg-amber-100/80 text-amber-900 font-semibold text-xs py-2 px-4 rounded-xl shadow-xs"
          >
            {isCleaningSamples ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-amber-600" />
                Membersihkan...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4 text-amber-600" />
                Hapus Data Contoh Sekarang
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Preset Quick Actions */}
      <Card className="border-slate-200 shadow-xs">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            Preset Pembersihan Cepat
          </CardTitle>
          <p className="text-xs text-slate-500">
            Pilih skenario pembersihan yang sesuai dengan siklus akademik sekolah Anda:
          </p>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <button
            type="button"
            onClick={() => handleSelectPreset('all')}
            className={`p-4 rounded-xl border text-left transition-all ${
              selectedTargets.includes('ALL')
                ? 'border-rose-500 bg-rose-50/70 ring-2 ring-rose-300'
                : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-xs">
                ALL
              </div>
              {selectedTargets.includes('ALL') && (
                <CheckCircle2 className="w-4 h-4 text-rose-600" />
              )}
            </div>
            <h4 className="text-xs font-bold text-slate-900">Reset Total Tahun Ajaran</h4>
            <p className="text-[11px] text-slate-500 mt-1">
              Bersihkan seluruh siswa, guru, materi, kuis, dan nilai. (Akun Super Admin tetap utuh).
            </p>
          </button>

          <button
            type="button"
            onClick={() => handleSelectPreset('students')}
            className={`p-4 rounded-xl border text-left transition-all ${
              selectedTargets.length === 1 && selectedTargets.includes('STUDENTS')
                ? 'border-blue-500 bg-blue-50/70 ring-2 ring-blue-300'
                : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                SISWA
              </div>
              {selectedTargets.length === 1 && selectedTargets.includes('STUDENTS') && (
                <CheckCircle2 className="w-4 h-4 text-blue-600" />
              )}
            </div>
            <h4 className="text-xs font-bold text-slate-900">Bersihkan Siswa Saja</h4>
            <p className="text-[11px] text-slate-500 mt-1">
              Hanya menghapus akun siswa (kelulusan/penerimaan siswa baru). Guru & materi tetap ada.
            </p>
          </button>

          <button
            type="button"
            onClick={() => handleSelectPreset('results')}
            className={`p-4 rounded-xl border text-left transition-all ${
              selectedTargets.length === 1 && selectedTargets.includes('QUIZ_RESULTS')
                ? 'border-purple-500 bg-purple-50/70 ring-2 ring-purple-300'
                : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs">
                NILAI
              </div>
              {selectedTargets.length === 1 && selectedTargets.includes('QUIZ_RESULTS') && (
                <CheckCircle2 className="w-4 h-4 text-purple-600" />
              )}
            </div>
            <h4 className="text-xs font-bold text-slate-900">Reset Nilai & Ujian Saja</h4>
            <p className="text-[11px] text-slate-500 mt-1">
              Hapus riwayat nilai siswa agar kuis siap diujikan ulang di semester/tahun ajaran berikutnya.
            </p>
          </button>

          <button
            type="button"
            onClick={() => handleSelectPreset('materials_quizzes')}
            className={`p-4 rounded-xl border text-left transition-all ${
              selectedTargets.includes('MATERIALS') && selectedTargets.includes('QUIZZES')
                ? 'border-amber-500 bg-amber-50/70 ring-2 ring-amber-300'
                : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-xs">
                KONTEN
              </div>
              {selectedTargets.includes('MATERIALS') && selectedTargets.includes('QUIZZES') && (
                <CheckCircle2 className="w-4 h-4 text-amber-600" />
              )}
            </div>
            <h4 className="text-xs font-bold text-slate-900">Bersihkan Konten & Soal</h4>
            <p className="text-[11px] text-slate-500 mt-1">
              Hapus seluruh materi ajar dan bank soal ujian. Akun siswa dan guru tetap aman.
            </p>
          </button>
        </CardContent>
      </Card>

      {/* Custom Selective Clean Matrix */}
      <Card className="border-slate-200 shadow-xs">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-600" />
            Pilihan Kategori Data Spesifik
          </CardTitle>
          <p className="text-xs text-slate-500">
            Centang satu atau beberapa jenis data yang ingin dihapus secara selektif:
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white">
            {/* Siswa */}
            <label className="flex items-center justify-between p-3.5 hover:bg-slate-50/80 cursor-pointer transition-colors">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={selectedTargets.includes('ALL') || selectedTargets.includes('STUDENTS')}
                  onChange={() => handleToggleTarget('STUDENTS')}
                  className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-slate-300"
                />
                <div>
                  <div className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-2">
                    <span>Data Akun Siswa</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                      {studentCount} akun
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Menghapus seluruh akun siswa dan data kelasnya (7A–9K).
                  </p>
                </div>
              </div>
              <span className="text-xs font-semibold text-slate-400">
                {studentCount > 0 ? `${studentCount} terdata` : 'Kosong'}
              </span>
            </label>

            {/* Guru */}
            <label className="flex items-center justify-between p-3.5 hover:bg-slate-50/80 cursor-pointer transition-colors">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={selectedTargets.includes('ALL') || selectedTargets.includes('TEACHERS')}
                  onChange={() => handleToggleTarget('TEACHERS')}
                  className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-slate-300"
                />
                <div>
                  <div className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-2">
                    <span>Data Akun Guru</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {teacherCount} akun
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Menghapus akun guru dan penugasan kelas ampuannya (Akun Super Admin & Admin tetap aman).
                  </p>
                </div>
              </div>
              <span className="text-xs font-semibold text-slate-400">
                {teacherCount > 0 ? `${teacherCount} terdata` : 'Kosong'}
              </span>
            </label>

            {/* Materi */}
            <label className="flex items-center justify-between p-3.5 hover:bg-slate-50/80 cursor-pointer transition-colors">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={selectedTargets.includes('ALL') || selectedTargets.includes('MATERIALS')}
                  onChange={() => handleToggleTarget('MATERIALS')}
                  className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-slate-300"
                />
                <div>
                  <div className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-2">
                    <span>Materi & Modul Pembelajaran</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                      {materialCount} materi
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Menghapus seluruh bahan ajar, dokumen PDF, link, dan video pembelajaran.
                  </p>
                </div>
              </div>
              <span className="text-xs font-semibold text-slate-400">
                {materialCount > 0 ? `${materialCount} terdata` : 'Kosong'}
              </span>
            </label>

            {/* Kuis & Bank Soal */}
            <label className="flex items-center justify-between p-3.5 hover:bg-slate-50/80 cursor-pointer transition-colors">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={selectedTargets.includes('ALL') || selectedTargets.includes('QUIZZES')}
                  onChange={() => handleToggleTarget('QUIZZES')}
                  className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-slate-300"
                />
                <div>
                  <div className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-2">
                    <span>Kuis & Bank Soal CBT</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                      {quizCount} kuis
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Menghapus seluruh kuis dan butir soal pilihan ganda.
                  </p>
                </div>
              </div>
              <span className="text-xs font-semibold text-slate-400">
                {quizCount > 0 ? `${quizCount} terdata` : 'Kosong'}
              </span>
            </label>

            {/* Nilai & Hasil Ujian */}
            <label className="flex items-center justify-between p-3.5 hover:bg-slate-50/80 cursor-pointer transition-colors">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={selectedTargets.includes('ALL') || selectedTargets.includes('QUIZ_RESULTS')}
                  onChange={() => handleToggleTarget('QUIZ_RESULTS')}
                  className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-slate-300"
                />
                <div>
                  <div className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-2">
                    <span>Rekap Nilai & Riwayat Ujian Siswa</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                      {resultCount} riwayat
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Menghapus riwayat pengerjaan kuis siswa, rekaman kecurangan proctoring, dan nilai raport.
                  </p>
                </div>
              </div>
              <span className="text-xs font-semibold text-slate-400">
                {resultCount > 0 ? `${resultCount} terdata` : 'Kosong'}
              </span>
            </label>
          </div>

          {/* Action Button */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-slate-500">
              {selectedTargets.length === 0 ? (
                <span>Silakan centang kategori di atas atau pilih preset.</span>
              ) : (
                <span className="font-semibold text-rose-600">
                  {selectedTargets.includes('ALL') ? 'Seluruh database' : `${selectedTargets.length} kategori`} dipilih untuk dibersihkan.
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              {selectedTargets.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedTargets([])}
                  className="text-xs text-slate-600"
                >
                  Batal Pilih
                </Button>
              )}
              <Button
                variant="danger"
                disabled={selectedTargets.length === 0}
                onClick={handleInitiateClean}
                className="gap-2 w-full sm:w-auto font-bold text-xs sm:text-sm"
              >
                <Trash2 className="w-4 h-4" />
                Lanjutkan Pembersihan Database
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Safety Notice & Guarantee */}
      <div className="p-4 bg-amber-50/70 border border-amber-200/80 rounded-xl flex items-start gap-3">
        <Lock className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-900 space-y-1">
          <p className="font-bold">Perlindungan Kredensial Super Admin:</p>
          <p>
            Akun <strong>Super Administrator</strong> ({user.username || 'rafx2'}) dan akun tim Admin terlindungi secara otomatis oleh sistem, sehingga Anda tidak akan pernah terkunci keluar dari platform LMS setelah pembersihan.
          </p>
        </div>
      </div>

      {/* Success Summary Alert */}
      {lastSummary && (
        <Card className="border-emerald-200 bg-emerald-50/60 shadow-xs">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm mb-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              Laporan Pembersihan Terakhir:
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs text-emerald-900">
              <div className="p-2 bg-white/70 rounded-lg border border-emerald-200">
                <span className="text-emerald-700 font-medium block">Siswa Dihapus</span>
                <span className="font-bold text-base">{lastSummary.students}</span>
              </div>
              <div className="p-2 bg-white/70 rounded-lg border border-emerald-200">
                <span className="text-emerald-700 font-medium block">Guru Dihapus</span>
                <span className="font-bold text-base">{lastSummary.teachers}</span>
              </div>
              <div className="p-2 bg-white/70 rounded-lg border border-emerald-200">
                <span className="text-emerald-700 font-medium block">Materi Dihapus</span>
                <span className="font-bold text-base">{lastSummary.materials}</span>
              </div>
              <div className="p-2 bg-white/70 rounded-lg border border-emerald-200">
                <span className="text-emerald-700 font-medium block">Kuis Dihapus</span>
                <span className="font-bold text-base">{lastSummary.quizzes}</span>
              </div>
              <div className="p-2 bg-white/70 rounded-lg border border-emerald-200 col-span-2 sm:col-span-1">
                <span className="text-emerald-700 font-medium block">Nilai Dihapus</span>
                <span className="font-bold text-base">{lastSummary.quizResults}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Double Confirmation Modal */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-rose-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Konfirmasi Pembersihan Database</h3>
                <p className="text-xs text-rose-600 font-semibold">Tindakan ini bersifat permanen dan tidak dapat dibatalkan</p>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-700 space-y-2">
              <p className="font-semibold text-slate-900">Data yang akan dibersihkan:</p>
              <ul className="list-disc list-inside space-y-1 text-slate-600">
                {selectedTargets.includes('ALL') && (
                  <li className="font-bold text-rose-700">Seluruh Siswa, Guru, Materi, Kuis, dan Nilai</li>
                )}
                {!selectedTargets.includes('ALL') && selectedTargets.includes('STUDENTS') && (
                  <li>Data seluruh akun Siswa ({studentCount} siswa)</li>
                )}
                {!selectedTargets.includes('ALL') && selectedTargets.includes('TEACHERS') && (
                  <li>Data seluruh akun Guru ({teacherCount} guru)</li>
                )}
                {!selectedTargets.includes('ALL') && selectedTargets.includes('MATERIALS') && (
                  <li>Seluruh Materi Pelajaran ({materialCount} materi)</li>
                )}
                {!selectedTargets.includes('ALL') && selectedTargets.includes('QUIZZES') && (
                  <li>Seluruh Paket Kuis & Bank Soal ({quizCount} kuis)</li>
                )}
                {!selectedTargets.includes('ALL') && selectedTargets.includes('QUIZ_RESULTS') && (
                  <li>Seluruh Riwayat Nilai & Hasil Ujian ({resultCount} riwayat)</li>
                )}
              </ul>
              {isConnected && (
                <p className="text-[11px] text-indigo-700 font-medium pt-1 border-t border-slate-200">
                  ⚡ Sinkronisasi ke Google Spreadsheet Webhook aktif. Baris data pada sheet terkait akan ikut dibersihkan.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">
                Untuk konfirmasi, ketik <span className="text-rose-600 font-mono bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">BERSIHKAN DATABASE</span> di bawah:
              </label>
              <Input
                value={confirmationInput}
                onChange={(e) => setConfirmationInput(e.target.value)}
                placeholder="Ketik BERSIHKAN DATABASE"
                className="font-mono text-center font-bold text-sm"
                autoFocus
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setIsConfirmModalOpen(false)}
                disabled={isProcessing}
                className="text-xs sm:text-sm"
              >
                Batal
              </Button>
              <Button
                variant="danger"
                onClick={handleExecuteClean}
                disabled={confirmationInput.trim() !== 'BERSIHKAN DATABASE' || isProcessing}
                className="text-xs sm:text-sm font-bold gap-2"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Memproses Pembersihan...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Ya, Bersihkan Sekarang
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
