import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { 
  CheckSquare, 
  Plus, 
  Trash2, 
  Edit2, 
  Users, 
  ShieldAlert, 
  AlertTriangle, 
  Eye, 
  X, 
  FileCheck, 
  Clock,
  Calendar,
  HelpCircle,
  Upload,
  CalendarClock,
  RefreshCw,
  CloudCheck,
  RotateCcw,
  Download
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { toast } from '@/components/ui/Toast';
import { useDataStore } from '@/store/dataStore';
import { useAuthStore } from '@/store/authStore';
import { useGasStore } from '@/store/gasStore';
import { Quiz, QuizResult, User } from '@/types';
import { parseItemClasses, formatDateTimeForInput, isResultMatchStudent } from '@/lib/utils';
import ViolationDetailModal from '@/components/teacher/ViolationDetailModal';
import QuizQuestionsModal from '@/components/teacher/QuizQuestionsModal';
import ClassCheckboxSelector from '@/components/teacher/ClassCheckboxSelector';
import ManageTeacherClassesModal from '@/components/teacher/ManageTeacherClassesModal';
import BulkRetakeModal from '@/components/teacher/BulkRetakeModal';

export default function TeacherQuizzes() {
  const { user } = useAuthStore();
  const { 
    quizzes, 
    addQuiz, 
    updateQuiz, 
    deleteQuiz, 
    quizResults, 
    users, 
    syncAllToGas, 
    pullAllFromServer, 
    resetStudentQuiz,
    resetBulkStudentQuiz
  } = useDataStore();
  const { isConnected } = useGasStore();

  // Normalize assignedClasses to string array
  const assignedClasses = Array.isArray(user?.assignedClasses)
    ? user.assignedClasses
    : (typeof user?.assignedClasses === 'string' && user.assignedClasses
        ? (user.assignedClasses as string).split(',').map(s => s.trim()).filter(Boolean)
        : []);

  const [showForm, setShowForm] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [showManageClassesModal, setShowManageClassesModal] = useState(false);
  const [resultsClassFilter, setResultsClassFilter] = useState<string>('ALL');
  const [resultsStatusFilter, setResultsStatusFilter] = useState<'ALL' | 'SUBMITTED' | 'NOT_SUBMITTED'>('ALL');
  const [activeResultsQuiz, setActiveResultsQuiz] = useState<Quiz | null>(null);
  const [activeQuestionsQuiz, setActiveQuestionsQuiz] = useState<Quiz | null>(null);

  const [formData, setFormData] = useState<{
    id: string;
    title: string;
    subjectId: string;
    selectedClasses: string[];
    durationMinutes: number;
    materialId: string;
    isScheduled: boolean;
    startTime: string;
    endTime: string;
  }>({ 
    id: '', 
    title: '', 
    subjectId: user?.subject || 'Matematika', 
    selectedClasses: assignedClasses.length > 0 ? [assignedClasses[0]] : [], 
    durationMinutes: 45, 
    materialId: '',
    isScheduled: false,
    startTime: '',
    endTime: ''
  });

  useEffect(() => {
    pullAllFromServer().catch(() => {});

    // Active live polling so incoming student scores and retake updates appear instantly,
    // BUT pause polling while the teacher is actively editing questions or modal is open
    // so background fetches never overwrite questions being edited!
    const interval = setInterval(() => {
      if (!activeQuestionsQuiz && !showForm) {
        pullAllFromServer(false).catch(() => {});
      }
    }, 6000);

    return () => clearInterval(interval);
  }, [activeQuestionsQuiz, showForm]);
  const [selectedViolationResult, setSelectedViolationResult] = useState<{
    result: QuizResult;
    student: User;
    quiz: Quiz;
  } | null>(null);
  const [retakeModalStudent, setRetakeModalStudent] = useState<{
    result: QuizResult;
    student: User;
    quiz: Quiz;
  } | null>(null);
  const [isResettingStudent, setIsResettingStudent] = useState(false);
  const [bulkRetakeQuiz, setBulkRetakeQuiz] = useState<Quiz | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.selectedClasses.length === 0) {
      toast.error('Pilih minimal satu kelas yang Anda ampu');
      return;
    }

    const classIdStr = formData.selectedClasses.join(', ');

    try {
      if (isEdit) {
        const cleanStart = formData.isScheduled && formData.startTime ? formatDateTimeForInput(formData.startTime) : '';
        const cleanEnd = formData.isScheduled && formData.endTime ? formatDateTimeForInput(formData.endTime) : '';
        await updateQuiz(formData.id, {
          title: formData.title,
          subjectId: formData.subjectId,
          classId: classIdStr,
          targetClasses: formData.selectedClasses,
          durationMinutes: Number(formData.durationMinutes) || 45,
          materialId: formData.materialId,
          isScheduled: formData.isScheduled,
          startTime: cleanStart,
          endTime: cleanEnd
        });
        toast.success('Jadwal & pengaturan ujian berhasil disimpan dan disinkronkan ke Google Sheet!');
      } else {
        const cleanStart = formData.isScheduled && formData.startTime ? formatDateTimeForInput(formData.startTime) : '';
        const cleanEnd = formData.isScheduled && formData.endTime ? formatDateTimeForInput(formData.endTime) : '';
        const newQuizId = `q-${Date.now()}`;
        const newQuizData: Quiz = {
          id: newQuizId,
          title: formData.title,
          subjectId: formData.subjectId,
          classId: classIdStr,
          targetClasses: formData.selectedClasses,
          durationMinutes: Number(formData.durationMinutes) || 45,
          materialId: formData.materialId,
          isScheduled: formData.isScheduled,
          startTime: cleanStart,
          endTime: cleanEnd,
          createdAt: new Date().toISOString(),
          questions: []
        };
        await addQuiz(newQuizData);
        toast.success(`Kuis baru berhasil dibuat dan disimpan di Google Sheet! Silakan tambah atau impor butir soal.`);
        // Prompt to open questions manager
        setActiveQuestionsQuiz(newQuizData);
      }
      setShowForm(false);
    } catch (error: any) {
      toast.error(error.message || 'Gagal menyimpan kuis');
    }
  };

  const handleEdit = (quiz: Quiz) => {
    const parsed = parseItemClasses(quiz.classId, quiz.targetClasses);
    setFormData({ 
      id: quiz.id, 
      title: quiz.title, 
      subjectId: quiz.subjectId || user?.subject || 'Matematika', 
      selectedClasses: parsed.length > 0 ? parsed : (assignedClasses.length > 0 ? [assignedClasses[0]] : []), 
      durationMinutes: quiz.durationMinutes, 
      materialId: quiz.materialId || '',
      isScheduled: !!quiz.isScheduled || !!quiz.startTime,
      startTime: formatDateTimeForInput(quiz.startTime),
      endTime: formatDateTimeForInput(quiz.endTime)
    });
    setIsEdit(true);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Yakin ingin menghapus kuis ini beserta seluruh soal dan data nilainya?')) {
      try {
        await deleteQuiz(id);
        toast.success('Kuis berhasil dihapus');
      } catch (error: any) {
        toast.error(error.message || 'Gagal menghapus kuis');
      }
    }
  };

  // Helper for schedule status
  const getScheduleStatus = (quiz: Quiz) => {
    if (!quiz.startTime) return null;
    const now = new Date();
    const start = new Date(quiz.startTime);
    const end = quiz.endTime ? new Date(quiz.endTime) : null;

    if (now < start) {
      return {
        label: 'Terjadwal (Belum Mulai)',
        color: 'bg-amber-100 text-amber-800 border-amber-200',
        detail: `Mulai: ${start.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}`
      };
    } else if (end && now > end) {
      return {
        label: 'Selesai / Ditutup',
        color: 'bg-slate-100 text-slate-700 border-slate-200',
        detail: `Berakhir: ${end.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}`
      };
    } else {
      return {
        label: 'Sedang Aktif',
        color: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        detail: 'Kuis dapat dikerjakan siswa'
      };
    }
  };

  const handleSyncAllQuizzesToGas = async () => {
    if (!isConnected) {
      toast.error('Webhook Google Sheets belum terhubung. Silakan buka menu Integrasi GAS di panel Admin.');
      return;
    }
    setIsSyncingAll(true);
    try {
      const res = await syncAllToGas();
      if (res && res.success) {
        const qCount = quizzes.reduce((acc, q) => acc + (q.questions?.length || 0), 0);
        toast.success(`Berhasil! ${quizzes.length} Kuis dan ${qCount} butir soal telah tersimpan di Google Sheet (Sheet 'Quizzes' & 'QuizQuestions').`);
      } else {
        toast.error(res?.error || 'Gagal menyinkronkan data kuis ke Google Sheet');
      }
    } catch (err: any) {
      toast.error('Gagal sinkronisasi: ' + err?.message);
    } finally {
      setIsSyncingAll(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900">Kelola Kuis & Ujian CBT</h1>
            {isConnected ? (
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                <CloudCheck className="w-3 h-3 text-emerald-600" /> Google Sheet Aktif
              </span>
            ) : (
              <span className="text-[11px] font-normal px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                Penyimpanan Lokal
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Manajemen butir soal ujian (tambah, edit, hapus, impor Excel/Word), penjadwalan waktu mulai, dan pemantauan CBT
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isConnected && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSyncAllQuizzesToGas}
              disabled={isSyncingAll}
              className="gap-1.5 text-xs text-emerald-800 border-emerald-300 bg-emerald-50 hover:bg-emerald-100"
              title="Kirim dan sinkronkan seluruh kuis dan butir soal ke Google Sheet"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-emerald-600 ${isSyncingAll ? 'animate-spin' : ''}`} />
              {isSyncingAll ? 'Menyinkronkan...' : 'Sinkronkan ke Google Sheet'}
            </Button>
          )}
          <Button className="gap-2 shrink-0 text-xs bg-indigo-600 hover:bg-indigo-700" onClick={() => {
            setIsEdit(false);
            setFormData({ 
              id: '', 
              title: '', 
              subjectId: user?.subject || 'Matematika', 
              selectedClasses: assignedClasses.length > 0 ? [assignedClasses[0]] : [], 
              durationMinutes: 45, 
              materialId: '',
              isScheduled: false,
              startTime: '',
              endTime: ''
            });
            setShowForm(!showForm);
          }}>
            <Plus className="w-4 h-4" /> Buat Kuis Baru
          </Button>
        </div>
      </div>

      {showForm && (
        <Card className="border-slate-200 bg-white text-slate-900 shadow-md animate-in fade-in">
          <CardHeader>
            <CardTitle className="text-slate-900 font-bold">{isEdit ? 'Edit Kuis & Pengaturan Jadwal' : 'Buat Kuis Baru'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input 
                label="Judul Kuis / Ujian" 
                value={formData.title} 
                onChange={e => setFormData({...formData, title: e.target.value})} 
                placeholder="Contoh: Penilaian Harian Bab 1 Bilangan Bulat"
                className="text-slate-900 bg-white font-medium"
                required 
              />
              <Input 
                label="Durasi Ujian (Menit)" 
                type="number" 
                min="5" 
                value={formData.durationMinutes} 
                onChange={e => setFormData({...formData, durationMinutes: parseInt(e.target.value) || 45})} 
                className="text-slate-900 bg-white font-medium"
                required 
              />
              
              <div className="md:col-span-2">
                <label className="text-xs font-medium text-slate-700 block mb-1.5">Mata Pelajaran</label>
                <input
                  type="text"
                  value={formData.subjectId}
                  onChange={e => setFormData({...formData, subjectId: e.target.value})}
                  className="w-full h-10 rounded-lg border border-slate-300 px-3 bg-white text-xs text-slate-900 font-medium outline-none focus:border-cyan-500"
                  placeholder="Contoh: Informatika"
                  required
                />
              </div>

              {/* Class Target Checkbox Selector - ONLY classes taught by this teacher */}
              <div className="md:col-span-2 p-4 rounded-xl border border-indigo-100 bg-white/90 shadow-xs">
                <ClassCheckboxSelector
                  assignedClasses={assignedClasses}
                  selectedClasses={formData.selectedClasses}
                  onChange={(newClasses) => setFormData(prev => ({ ...prev, selectedClasses: newClasses }))}
                  label="Kelas Target Ujian (Pilihan Checkbox)"
                  description="Centang kelas-kelas yang Anda ampu yang ditugaskan untuk mengerjakan kuis ini"
                  onOpenManageClasses={() => setShowManageClassesModal(true)}
                />
              </div>

              {/* Opsi Penjadwalan Waktu Mulai Kuis */}
              <div className="md:col-span-2 p-4 rounded-xl border border-indigo-200 bg-white/80 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isScheduled}
                      onChange={e => setFormData({...formData, isScheduled: e.target.checked})}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                    />
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <CalendarClock className="w-4 h-4 text-indigo-600" />
                      Jadwalkan Waktu Kapan Kuis Bisa Mulai Dikerjakan
                    </span>
                  </label>
                  <span className="text-[11px] text-slate-500">
                    {formData.isScheduled ? 'Terjadwal Otomatis' : 'Fleksibel (Kapan Saja)'}
                  </span>
                </div>

                {formData.isScheduled ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100 animate-in fade-in">
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">
                        Waktu Mulai Pengerjaan <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="datetime-local"
                        value={formData.startTime}
                        onChange={e => setFormData({...formData, startTime: e.target.value})}
                        className="w-full h-10 rounded-lg border border-slate-300 px-3 bg-white text-xs font-medium text-slate-800 outline-none focus:border-indigo-500"
                        required={formData.isScheduled}
                      />
                      <p className="text-[11px] text-slate-500 mt-1">
                        Siswa tidak dapat memulai ujian sebelum jam & tanggal yang ditentukan ini.
                      </p>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">
                        Batas Akhir / Waktu Selesai (Opsional)
                      </label>
                      <input
                        type="datetime-local"
                        value={formData.endTime}
                        onChange={e => setFormData({...formData, endTime: e.target.value})}
                        className="w-full h-10 rounded-lg border border-slate-300 px-3 bg-white text-xs font-medium text-slate-800 outline-none focus:border-indigo-500"
                      />
                      <p className="text-[11px] text-slate-500 mt-1">
                        Setelah waktu ini lewat, akses kuis akan ditutup bagi siswa.
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-500">
                    Kuis dapat dikerjakan siswa kapan saja tanpa batasan tanggal/jam mulai. Aktifkan opsi di atas jika ingin membatasi waktu serentak.
                  </p>
                )}
              </div>

              <div className="md:col-span-2 flex justify-end gap-2 mt-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowForm(false)}>Batal</Button>
                <Button type="submit" size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white">
                  {isEdit ? 'Simpan Perubahan Kuis' : 'Simpan Kuis & Lanjut ke Soal'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Grid of Quizzes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {quizzes.map((quiz) => {
          const results = quizResults.filter(r => r.quizId === quiz.id);
          const totalViolations = results.reduce((acc, curr) => acc + (curr.violationsCount || (curr.violationLogs?.length || 0)), 0);
          const scheduleStatus = getScheduleStatus(quiz);

          return (
            <Card key={quiz.id} className="hover:border-indigo-200 transition-colors shadow-sm flex flex-col justify-between">
              <div>
                <CardHeader className="pb-3 border-b-0">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex flex-wrap items-center gap-1 max-w-[70%]">
                      {parseItemClasses(quiz.classId, quiz.targetClasses).map(cls => (
                        <span key={cls} className="text-xs font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                          Kelas {cls}
                        </span>
                      ))}
                    </div>
                    <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded shrink-0">
                      {quiz.subjectId || 'Matematika'}
                    </span>
                  </div>
                  <CardTitle className="text-base mt-3 leading-snug">{quiz.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 mb-3">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" /> {quiz.durationMinutes} Menit
                    </div>
                    <button 
                      type="button"
                      onClick={() => setActiveQuestionsQuiz(quiz)}
                      className="flex items-center gap-1.5 hover:text-indigo-600 font-semibold cursor-pointer text-indigo-700 bg-indigo-50/70 hover:bg-indigo-100/70 px-2 py-0.5 rounded transition-colors"
                      title="Klik untuk kelola butir soal"
                    >
                      <CheckSquare className="w-3.5 h-3.5 text-indigo-600" /> {quiz.questions?.length || 0} Soal
                    </button>
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-indigo-500" /> {results.length} Mengerjakan
                    </div>
                  </div>

                  {/* Scheduled Time Banner if set */}
                  {scheduleStatus && (
                    <div className={`mb-3 p-2 rounded-lg border text-xs font-medium flex items-center justify-between ${scheduleStatus.color}`}>
                      <div className="flex items-center gap-1.5">
                        <CalendarClock className="w-3.5 h-3.5 shrink-0" />
                        <span>{scheduleStatus.label}</span>
                      </div>
                      <span className="text-[10px] opacity-90">{scheduleStatus.detail}</span>
                    </div>
                  )}

                  {/* Violation Tag */}
                  {totalViolations > 0 ? (
                    <div className="mb-2 bg-rose-50 border border-rose-200 text-rose-800 text-xs px-3 py-2 rounded-lg flex items-center gap-2 font-medium">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>{totalViolations} Insiden Pelanggaran Terdeteksi</span>
                    </div>
                  ) : results.length > 0 ? (
                    <div className="mb-2 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-medium">
                      <FileCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Semua Peserta Tertib</span>
                    </div>
                  ) : null}
                </CardContent>
              </div>

              {/* Action Buttons in Card */}
              <div className="p-4 pt-0 space-y-2 border-t border-slate-100 mt-2">
                {/* Button Kelola Soal (Utama) */}
                <Button
                  size="sm"
                  onClick={() => setActiveQuestionsQuiz(quiz)}
                  className="w-full text-xs gap-1.5 font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 shadow-none"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  Kelola Soal ({quiz.questions?.length || 0}) • Tambah / Edit / Impor
                </Button>

                {/* Button Lihat Hasil */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setActiveResultsQuiz(quiz);
                    pullAllFromServer().catch(() => {});
                  }}
                  className="w-full text-xs gap-1.5 font-medium text-slate-700 border-slate-200 hover:bg-slate-50"
                >
                  <Eye className="w-3.5 h-3.5 text-slate-500" />
                  Lihat Hasil & Pengawasan CBT ({results.length})
                </Button>

                {/* Button Remedial Massal */}
                {results.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setBulkRetakeQuiz(quiz);
                      pullAllFromServer().catch(() => {});
                    }}
                    className="w-full text-xs gap-1.5 font-medium text-amber-700 border-amber-300 hover:bg-amber-50 hover:text-amber-800"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                    Beri Pengulangan Kuis (Remedial Massal)
                  </Button>
                )}

                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" className="flex-1 text-xs" onClick={() => handleEdit(quiz)}>
                    <Edit2 className="w-3.5 h-3.5 mr-1.5" /> Edit Jadwal & Judul
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => handleDelete(quiz.id)} title="Hapus kuis">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}

        {quizzes.length === 0 && (
          <div className="col-span-full p-12 text-center border-2 border-dashed border-slate-200 rounded-xl text-slate-500">
            Belum ada kuis yang ditambahkan. Silakan klik tombol "Buat Kuis Baru" di atas.
          </div>
        )}
      </div>

      {/* Quiz Questions Management Modal */}
      {activeQuestionsQuiz && (
        <QuizQuestionsModal
          isOpen={!!activeQuestionsQuiz}
          onClose={() => {
            setActiveQuestionsQuiz(null);
          }}
          quiz={quizzes.find(q => q.id === activeQuestionsQuiz.id) || activeQuestionsQuiz}
        />
      )}

      {/* Modal List of Students for Active Quiz */}
      {activeResultsQuiz && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Hasil & Pengawasan: {activeResultsQuiz.title}
                </h3>
                <p className="text-xs text-slate-500">
                  Kelas {activeResultsQuiz.classId} • Durasi {activeResultsQuiz.durationMinutes} Menit
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const allQuizResults = quizResults.filter(r => r.quizId === activeResultsQuiz.id);
                    const quizTargetClasses = Array.isArray(activeResultsQuiz.targetClasses) && activeResultsQuiz.targetClasses.length > 0
                      ? activeResultsQuiz.targetClasses
                      : (activeResultsQuiz.classId ? activeResultsQuiz.classId.split(',').map(s => s.trim()).filter(Boolean) : []);

                    const relevantStudents = users.filter(u => {
                      if (u.role !== 'STUDENT') return false;
                      if (resultsClassFilter !== 'ALL') return u.classId === resultsClassFilter;
                      if (quizTargetClasses.length > 0) return u.classId && quizTargetClasses.includes(u.classId);
                      return true;
                    });

                    const results = allQuizResults.filter(r => {
                      if (resultsClassFilter !== 'ALL' && r.studentClass !== resultsClassFilter) return false;
                      return true;
                    });

                    const unsubmittedStudents = relevantStudents.filter(st => {
                      return !allQuizResults.some(r =>
                        r.studentId === st.id ||
                        (st.nisn && (r.studentId === st.nisn || r.studentNisn === st.nisn)) ||
                        (st.name && r.studentName && r.studentName.toLowerCase() === st.name.toLowerCase())
                      );
                    });

                    const submittedRows = results.map((r, idx) => {
                      const fScore = r.finalScore !== undefined ? r.finalScore : r.score;
                      const vCount = r.violationsCount || (r.violationLogs ? r.violationLogs.length : 0) || 0;
                      return {
                        No: idx + 1,
                        'Nama Siswa': r.studentName || 'Siswa',
                        NISN: r.studentNisn || '-',
                        Kelas: r.studentClass || '-',
                        'Judul Kuis': activeResultsQuiz.title,
                        'Waktu Submit': r.submittedAt || '-',
                        'Nilai Kuis': fScore,
                        'Ketuntasan KKM (>= 75)': fScore >= 75 ? 'Tuntas' : 'Belum Tuntas',
                        'Jumlah Pelanggaran CBT': vCount,
                        'Status Integritas': r.disqualified ? 'Didiskualifikasi' : (vCount > 0 ? `${vCount}x Pelanggaran` : 'Bersih / Jujur'),
                        'Status Pengerjaan': 'Selesai Mengerjakan'
                      };
                    });

                    const unsubmittedRows = resultsStatusFilter !== 'SUBMITTED' ? unsubmittedStudents.map((st, idx) => ({
                      No: submittedRows.length + idx + 1,
                      'Nama Siswa': st.name,
                      NISN: st.nisn || '-',
                      Kelas: st.classId || '-',
                      'Judul Kuis': activeResultsQuiz.title,
                      'Waktu Submit': '-',
                      'Nilai Kuis': 0,
                      'Ketuntasan KKM (>= 75)': 'Belum Mengerjakan',
                      'Jumlah Pelanggaran CBT': 0,
                      'Status Integritas': '-',
                      'Status Pengerjaan': 'Belum Mengerjakan'
                    })) : [];

                    const allRows = [...submittedRows, ...unsubmittedRows];
                    if (allRows.length === 0) {
                      toast.error('Tidak ada data siswa untuk diekspor');
                      return;
                    }

                    const worksheet = XLSX.utils.json_to_sheet(allRows);
                    const workbook = XLSX.utils.book_new();
                    XLSX.utils.book_append_sheet(workbook, worksheet, 'Hasil Kuis');
                    XLSX.writeFile(workbook, `Hasil_Kuis_${activeResultsQuiz.title.replace(/[\/\\?%*:|"<>]/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`);
                    toast.success('Hasil kuis berhasil diekspor ke Excel!');
                  }}
                  title="Ekspor rekap hasil kuis ke berkas Excel"
                  className="p-2 text-emerald-700 hover:text-emerald-800 rounded-lg hover:bg-emerald-50 border border-emerald-300 text-xs flex items-center gap-1 font-semibold"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-600" /> Ekspor Excel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    pullAllFromServer().catch(() => {});
                    toast.success('Hasil kuis diperbarui');
                  }}
                  title="Segarkan hasil terbaru"
                  className="p-2 text-indigo-600 hover:text-indigo-800 rounded-lg hover:bg-indigo-50 border border-indigo-200 text-xs flex items-center gap-1 font-medium"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Segarkan
                </button>
                <button 
                  onClick={() => setActiveResultsQuiz(null)}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              {(() => {
                const allQuizResults = quizResults.filter(r => r.quizId === activeResultsQuiz.id);
                const allClassesList = Array.from(new Set([
                  ...assignedClasses,
                  ...users.filter(u => u.role === 'STUDENT' && u.classId).map(u => u.classId as string),
                  ...allQuizResults.map(r => r.studentClass).filter(Boolean) as string[]
                ])).sort();

                const quizTargetClasses = Array.isArray(activeResultsQuiz.targetClasses) && activeResultsQuiz.targetClasses.length > 0
                  ? activeResultsQuiz.targetClasses
                  : (activeResultsQuiz.classId ? activeResultsQuiz.classId.split(',').map(s => s.trim()).filter(Boolean) : []);

                const relevantStudents = users.filter(u => {
                  if (u.role !== 'STUDENT') return false;
                  if (resultsClassFilter !== 'ALL') {
                    return u.classId === resultsClassFilter;
                  }
                  if (quizTargetClasses.length > 0) {
                    return u.classId && quizTargetClasses.includes(u.classId);
                  }
                  return true;
                });

                const results = allQuizResults.filter(r => {
                  if (resultsClassFilter !== 'ALL' && r.studentClass !== resultsClassFilter) return false;
                  return true;
                });

                const unsubmittedStudents = relevantStudents.filter(st => {
                  return !allQuizResults.some(r =>
                    r.studentId === st.id ||
                    (st.nisn && (r.studentId === st.nisn || r.studentNisn === st.nisn)) ||
                    (st.name && r.studentName && r.studentName.toLowerCase() === st.name.toLowerCase())
                  );
                });

                const avgScore = results.length > 0 
                  ? (results.reduce((a, b) => a + (b.finalScore !== undefined ? b.finalScore : b.score), 0) / results.length).toFixed(1)
                  : '0';
                const below75 = results.filter(r => (r.finalScore !== undefined ? r.finalScore : r.score) < 75).length;
                const disqCount = results.filter(r => r.disqualified || (r.violationsCount || 0) > 0).length;

                return (
                  <div className="space-y-4">
                    {/* Summary Stats & Remedial Action Bar */}
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                          <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-wider">Total Mengumpulkan</span>
                          <span className="text-lg font-bold text-slate-900">{results.length} Siswa</span>
                        </div>
                        <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl">
                          <span className="text-[10px] text-indigo-600 block uppercase font-bold tracking-wider">Rata-rata Nilai</span>
                          <span className="text-lg font-bold text-indigo-700">{avgScore}</span>
                        </div>
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                          <span className="text-[10px] text-amber-700 block uppercase font-bold tracking-wider">Di Bawah KKM (&lt;75)</span>
                          <span className="text-lg font-bold text-amber-800">{below75} Siswa</span>
                        </div>
                        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl">
                          <span className="text-[10px] text-rose-700 block uppercase font-bold tracking-wider">Pelanggaran CBT</span>
                          <span className="text-lg font-bold text-rose-800">{disqCount} Siswa</span>
                        </div>
                      </div>

                      {/* Remedial / Bulk Retake Button Bar */}
                      <div className="p-3.5 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-300 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 rounded-lg bg-amber-500 text-white shrink-0">
                            <RotateCcw className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-bold text-xs text-amber-950">
                              Fasilitas Pengulangan Kuis (Remedial Massal)
                            </div>
                            <p className="text-[11px] text-amber-800">
                              Beri kesempatan ujian ulang secara massal bagi seluruh anak dengan kriteria nilai tertentu (misal &lt; KKM).
                            </p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => setBulkRetakeQuiz(activeResultsQuiz)}
                          className="shrink-0 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs gap-1.5 shadow-xs"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          Beri Pengulangan Kuis (Remedial)
                        </Button>
                      </div>
                    </div>

                    {/* Filter Kelas & Status Pengerjaan */}
                    <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                      <div className="flex flex-wrap items-center gap-2">
                        <label className="text-xs font-semibold text-slate-700">Filter Kelas:</label>
                        <select
                          value={resultsClassFilter}
                          onChange={(e) => setResultsClassFilter(e.target.value)}
                          className="text-xs px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-800 font-medium focus:outline-none focus:border-indigo-500"
                        >
                          <option value="ALL">Semua Kelas ({allClassesList.length})</option>
                          {allClassesList.map(cls => (
                            <option key={cls} value={cls}>Kelas {cls}</option>
                          ))}
                        </select>

                        <label className="text-xs font-semibold text-slate-700 ml-2">Status:</label>
                        <select
                          value={resultsStatusFilter}
                          onChange={(e) => setResultsStatusFilter(e.target.value as any)}
                          className="text-xs px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-800 font-medium focus:outline-none focus:border-indigo-500"
                        >
                          <option value="ALL">Semua ({results.length + unsubmittedStudents.length})</option>
                          <option value="SUBMITTED">Sudah Mengerjakan ({results.length})</option>
                          <option value="NOT_SUBMITTED">Belum Mengerjakan ({unsubmittedStudents.length})</option>
                        </select>
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Menampilkan <strong className="text-slate-800">{resultsStatusFilter === 'NOT_SUBMITTED' ? 0 : results.length}</strong> selesai, <strong className="text-rose-600">{resultsStatusFilter === 'SUBMITTED' ? 0 : unsubmittedStudents.length}</strong> belum
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left text-slate-600">
                      <thead className="text-[11px] text-slate-700 uppercase bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th className="px-4 py-3">Nama Siswa</th>
                          <th className="px-4 py-3">Waktu Submit</th>
                          <th className="px-4 py-3">Integritas CBT</th>
                          <th className="px-4 py-3">Nilai</th>
                          <th className="px-4 py-3 text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {resultsStatusFilter !== 'NOT_SUBMITTED' && results.map((res) => {
                          const student = users.find(u => isResultMatchStudent(res, u)) || {
                            id: res.studentId,
                            name: res.studentName || 'Siswa',
                            role: 'STUDENT',
                            nisn: res.studentNisn || '-',
                            classId: res.studentClass || activeResultsQuiz.classId
                          } as User;

                          const vCount = res.violationsCount || (res.violationLogs?.length || 0);
                          const finalSc = res.finalScore !== undefined ? res.finalScore : res.score;

                          return (
                            <tr key={res.id} className="hover:bg-slate-50">
                              <td className="px-4 py-3 font-semibold text-slate-900">
                                <div className="flex items-center gap-1.5">
                                  <span>{student.name}</span>
                                  {student.classId && (
                                    <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded">
                                      Kelas {student.classId}
                                    </span>
                                  )}
                                </div>
                                <span className="text-[10px] text-slate-400 block font-normal">NISN: {student.nisn || '-'}</span>
                              </td>
                              <td className="px-4 py-3 font-mono text-[11px]">
                                {new Date(res.submittedAt).toLocaleString('id-ID')}
                              </td>
                              <td className="px-4 py-3">
                                {res.disqualified ? (
                                  <span className="bg-rose-600 text-white px-2 py-0.5 rounded text-[10px] font-bold">
                                    Didiskualifikasi
                                  </span>
                                ) : vCount > 0 ? (
                                  <span className="bg-rose-100 text-rose-800 px-2 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1 w-fit">
                                    <AlertTriangle className="w-3 h-3 text-rose-600" />
                                    {vCount}x Pelanggaran
                                  </span>
                                ) : (
                                  <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-[10px] font-medium">
                                    Tertib
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <span className="text-sm font-bold text-indigo-600">
                                  {res.disqualified ? '0' : finalSc}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right whitespace-nowrap">
                                <div className="flex items-center justify-end gap-1.5">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-[11px] gap-1 py-1 px-2.5 text-amber-700 border-amber-300 hover:bg-amber-50 hover:text-amber-800 font-medium"
                                    onClick={() => setRetakeModalStudent({
                                      result: res,
                                      student: student,
                                      quiz: activeResultsQuiz
                                    })}
                                    title="Izinkan siswa mengulang kuis ini dari awal"
                                  >
                                    <RotateCcw className="w-3 h-3 text-amber-600" />
                                    Ulangi Kuis
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    className="text-[11px] gap-1 py-1 px-2.5"
                                    onClick={() => setSelectedViolationResult({
                                      result: res,
                                      student: student,
                                      quiz: activeResultsQuiz
                                    })}
                                  >
                                    <Eye className="w-3 h-3" />
                                    {vCount > 0 ? 'Bukti & Sanksi' : 'Detail'}
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                        {resultsStatusFilter !== 'SUBMITTED' && unsubmittedStudents.map((st) => (
                          <tr key={`unsub-${st.id}`} className="bg-slate-50/50 hover:bg-slate-50">
                            <td className="px-4 py-3 font-semibold text-slate-700">
                              <div className="flex items-center gap-1.5">
                                <span>{st.name}</span>
                                {st.classId && (
                                  <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">
                                    Kelas {st.classId}
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-slate-400 block font-normal">NISN: {st.nisn || '-'}</span>
                            </td>
                            <td className="px-4 py-3 text-slate-400 italic text-[11px]">-</td>
                            <td className="px-4 py-3">
                              <span className="bg-slate-200/80 text-slate-600 px-2 py-0.5 rounded text-[10px] font-medium">
                                Belum Mengerjakan
                              </span>
                            </td>
                            <td className="px-4 py-3 text-slate-400 font-bold">-</td>
                            <td className="px-4 py-3 text-right text-[11px] text-slate-400">Menunggu</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
              })()}
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <Button size="sm" onClick={() => setActiveResultsQuiz(null)}>
                Tutup
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Violation Detail Modal */}
      {selectedViolationResult && (
        <ViolationDetailModal
          isOpen={!!selectedViolationResult}
          onClose={() => setSelectedViolationResult(null)}
          result={selectedViolationResult.result}
          student={selectedViolationResult.student}
          quiz={selectedViolationResult.quiz}
        />
      )}

      {/* Modal Konfirmasi Izinkan Siswa Mengulang Kuis */}
      {retakeModalStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 text-center shadow-2xl border border-slate-200 space-y-4">
            <div className="w-14 h-14 bg-amber-100 text-amber-700 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
              <RotateCcw className="w-7 h-7" />
            </div>

            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Izinkan Siswa Mengulang Kuis?
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Siswa dapat login kembali dan mengerjakan kuis ini dari awal.
              </p>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-left text-xs text-amber-900 space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Nama Siswa:</span>
                <strong className="text-slate-900">{retakeModalStudent.student.name}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">NISN / Kelas:</span>
                <span>{retakeModalStudent.student.nisn || '-'} • Kelas {retakeModalStudent.student.classId || retakeModalStudent.quiz.classId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Nilai Saat Ini:</span>
                <span className="font-bold text-indigo-700">{retakeModalStudent.result.finalScore ?? retakeModalStudent.result.score}</span>
              </div>
              <div className="pt-1.5 border-t border-amber-200/60 text-[11px] text-amber-800 leading-relaxed">
                ⚠️ Riwayat nilai dan sesi ujian siswa ini sebelumnya akan di-reset dari sistem sekolah dan Google Sheet agar siswa dapat mengisi lembar ujian baru.
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <Button
                variant="outline"
                type="button"
                onClick={() => setRetakeModalStudent(null)}
                disabled={isResettingStudent}
                className="w-1/2 text-xs"
              >
                Batal
              </Button>
              <Button
                type="button"
                onClick={async () => {
                  setIsResettingStudent(true);
                  try {
                    await resetStudentQuiz(
                      retakeModalStudent.quiz.id,
                      retakeModalStudent.result.studentId || retakeModalStudent.student.id,
                      retakeModalStudent.result.studentNisn || retakeModalStudent.student.nisn,
                      retakeModalStudent.result.studentName || retakeModalStudent.student.name,
                      retakeModalStudent.result.id
                    );
                    await pullAllFromServer().catch(() => {});
                    toast.success(`Siswa ${retakeModalStudent.student.name} berhasil diizinkan untuk mengulang kuis.`);
                    setRetakeModalStudent(null);
                  } catch (err: any) {
                    toast.error(err.message || 'Gagal mereset kuis');
                  } finally {
                    setIsResettingStudent(false);
                  }
                }}
                isLoading={isResettingStudent}
                disabled={isResettingStudent}
                className="w-1/2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1" /> Ya, Izinkan Ulang
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Pengulangan Kuis Massal (Remedial Berdasarkan Kriteria Nilai) */}
      {bulkRetakeQuiz && (
        <BulkRetakeModal
          isOpen={!!bulkRetakeQuiz}
          onClose={() => setBulkRetakeQuiz(null)}
          quiz={bulkRetakeQuiz}
          results={quizResults.filter(r => r.quizId === bulkRetakeQuiz.id)}
          users={users}
          onExecute={async (options) => {
            const res = await resetBulkStudentQuiz(bulkRetakeQuiz.id, options);
            await pullAllFromServer().catch(() => {});
            toast.success(`Berhasil memberikan kesempatan ujian ulang untuk ${res.count} siswa. Siswa dapat langsung memulai ujian kembali di dashboard mereka!`);
          }}
        />
      )}

      {/* Modal Kelola Kelas Ampuan Guru */}
      {showManageClassesModal && (
        <ManageTeacherClassesModal
          isOpen={showManageClassesModal}
          onClose={() => setShowManageClassesModal(false)}
        />
      )}
    </div>
  );
}
