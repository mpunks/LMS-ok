import React, { useState } from 'react';
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
  CloudCheck
} from 'lucide-react';
import { toast } from '@/components/ui/Toast';
import { useDataStore } from '@/store/dataStore';
import { useAuthStore } from '@/store/authStore';
import { useGasStore } from '@/store/gasStore';
import { Quiz, QuizResult, User } from '@/types';
import { parseItemClasses } from '@/lib/utils';
import ViolationDetailModal from '@/components/teacher/ViolationDetailModal';
import QuizQuestionsModal from '@/components/teacher/QuizQuestionsModal';
import ClassCheckboxSelector from '@/components/teacher/ClassCheckboxSelector';
import ManageTeacherClassesModal from '@/components/teacher/ManageTeacherClassesModal';

export default function TeacherQuizzes() {
  const { user } = useAuthStore();
  const { quizzes, addQuiz, updateQuiz, deleteQuiz, quizResults, users, syncAllToGas } = useDataStore();
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

  // Modal states
  const [activeResultsQuiz, setActiveResultsQuiz] = useState<Quiz | null>(null);
  const [activeQuestionsQuiz, setActiveQuestionsQuiz] = useState<Quiz | null>(null);
  const [selectedViolationResult, setSelectedViolationResult] = useState<{
    result: QuizResult;
    student: User;
    quiz: Quiz;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.selectedClasses.length === 0) {
      toast.error('Pilih minimal satu kelas yang Anda ampu');
      return;
    }

    const classIdStr = formData.selectedClasses.join(', ');

    try {
      if (isEdit) {
        await updateQuiz(formData.id, {
          title: formData.title,
          subjectId: formData.subjectId,
          classId: classIdStr,
          targetClasses: formData.selectedClasses,
          durationMinutes: formData.durationMinutes,
          materialId: formData.materialId,
          isScheduled: formData.isScheduled,
          startTime: formData.isScheduled && formData.startTime ? formData.startTime : undefined,
          endTime: formData.isScheduled && formData.endTime ? formData.endTime : undefined
        });
        toast.success('Kuis diperbarui');
      } else {
        const newQuizId = `q-${Date.now()}`;
        const newQuizData: Quiz = {
          id: newQuizId,
          title: formData.title,
          subjectId: formData.subjectId,
          classId: classIdStr,
          targetClasses: formData.selectedClasses,
          durationMinutes: formData.durationMinutes,
          materialId: formData.materialId,
          isScheduled: formData.isScheduled,
          startTime: formData.isScheduled && formData.startTime ? formData.startTime : undefined,
          endTime: formData.isScheduled && formData.endTime ? formData.endTime : undefined,
          createdAt: new Date().toISOString(),
          questions: [
            { 
              id: `q1-${Date.now()}`, 
              text: 'Berapakah hasil dari 15 + 27?', 
              options: ['42', '32', '45', '52'],
              correctOptionIndex: 0,
              points: 25
            },
            { 
              id: `q2-${Date.now()}`, 
              text: 'Suku sejenis dari 3x + 2y - x + 5 adalah...', 
              options: ['3x dan -x', '3x dan 2y', '2y dan 5', 'x dan 5'],
              correctOptionIndex: 0,
              points: 25
            }
          ]
        };
        await addQuiz(newQuizData);
        toast.success(`Kuis baru berhasil dibuat untuk kelas ${classIdStr}! Anda dapat langsung mengelola atau mengimpor butir soal.`);
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
      startTime: quiz.startTime || '',
      endTime: quiz.endTime || ''
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
        <Card className="border-indigo-100 bg-indigo-50/30 shadow-sm animate-in fade-in">
          <CardHeader>
            <CardTitle>{isEdit ? 'Edit Kuis & Pengaturan Jadwal' : 'Buat Kuis Baru'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input 
                label="Judul Kuis / Ujian" 
                value={formData.title} 
                onChange={e => setFormData({...formData, title: e.target.value})} 
                placeholder="Contoh: Penilaian Harian Bab 1 Bilangan Bulat"
                required 
              />
              <Input 
                label="Durasi Ujian (Menit)" 
                type="number" 
                min="5" 
                value={formData.durationMinutes} 
                onChange={e => setFormData({...formData, durationMinutes: parseInt(e.target.value) || 45})} 
                required 
              />
              
              <div className="md:col-span-2">
                <label className="text-xs font-medium text-slate-700 block mb-1.5">Mata Pelajaran</label>
                <input
                  type="text"
                  value={formData.subjectId}
                  onChange={e => setFormData({...formData, subjectId: e.target.value})}
                  className="w-full h-10 rounded-lg border border-slate-300 px-3 bg-white text-xs outline-none focus:border-indigo-500"
                  placeholder="Contoh: Matematika"
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
                  onClick={() => setActiveResultsQuiz(quiz)}
                  className="w-full text-xs gap-1.5 font-medium text-slate-700 border-slate-200 hover:bg-slate-50"
                >
                  <Eye className="w-3.5 h-3.5 text-slate-500" />
                  Lihat Hasil & Pengawasan CBT ({results.length})
                </Button>

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
              <button 
                onClick={() => setActiveResultsQuiz(null)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              {(() => {
                const results = quizResults.filter(r => r.quizId === activeResultsQuiz.id);
                if (results.length === 0) {
                  return (
                    <div className="text-center py-12 text-slate-500 text-xs border-2 border-dashed border-slate-200 rounded-xl">
                      Belum ada siswa yang mengumpulkan kuis ini.
                    </div>
                  );
                }

                return (
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
                        {results.map((res) => {
                          const student = users.find(u => u.id === res.studentId) || {
                            id: res.studentId,
                            name: 'Siswa',
                            role: 'STUDENT',
                            nisn: '-',
                            classId: activeResultsQuiz.classId
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
                              <td className="px-4 py-3 text-right">
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  className="text-xs gap-1 py-1"
                                  onClick={() => setSelectedViolationResult({
                                    result: res,
                                    student: student,
                                    quiz: activeResultsQuiz
                                  })}
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  {vCount > 0 ? 'Bukti & Sanksi' : 'Detail'}
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
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
