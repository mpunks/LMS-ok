import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { 
  FileCheck, 
  Search, 
  Filter, 
  Download, 
  ExternalLink, 
  Clock, 
  User as UserIcon, 
  BookOpen, 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  Award, 
  Edit3, 
  FileText, 
  Layers, 
  RefreshCw,
  FolderDown,
  X,
  File
} from 'lucide-react';
import { useDataStore } from '@/store/dataStore';
import { useAuthStore } from '@/store/authStore';
import { toast } from '@/components/ui/Toast';
import { cn, isItemForClass } from '@/lib/utils';
import * as XLSX from 'xlsx';

export default function TeacherAssignments() {
  const [searchParams] = useSearchParams();
  const initialMaterialId = searchParams.get('materialId') || 'ALL';
  const initialClassId = searchParams.get('classId') || 'ALL';
  const navigate = useNavigate();

  const { user } = useAuthStore();
  const { materials, assignments = [], users, gradeAssignment, pullAllFromServer } = useDataStore();

  const [selectedClass, setSelectedClass] = useState<string>(initialClassId);
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>(initialMaterialId);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'GRADED' | 'UNGRADED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Sync with searchParams if they change
  useEffect(() => {
    const matParam = searchParams.get('materialId');
    if (matParam) setSelectedMaterialId(matParam);
    const clsParam = searchParams.get('classId');
    if (clsParam) setSelectedClass(clsParam);
  }, [searchParams]);

  // Grading Modal State
  const [gradingModalOpen, setGradingModalOpen] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null);
  const [gradeInput, setGradeInput] = useState<number | string>('');
  const [feedbackInput, setFeedbackInput] = useState<string>('');
  const [isSavingGrade, setIsSavingGrade] = useState(false);

  useEffect(() => {
    pullAllFromServer().catch(() => {});
  }, []);

  // Format file size
  const formatFileSize = (bytes?: number) => {
    if (!bytes || bytes === 0) return '';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Format Indonesian date
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  // Teacher classes
  const assignedClasses = useMemo(() => {
    if (!user?.assignedClasses) return [];
    if (Array.isArray(user.assignedClasses)) return user.assignedClasses;
    return String(user.assignedClasses).split(',').map(s => s.trim()).filter(Boolean);
  }, [user]);

  // Is staff
  const isStaff = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';

  // Materials created by or related to teacher that have assignments
  const teacherMaterialsWithAssignments = useMemo(() => {
    return materials.filter(m => {
      if (!m.hasAssignment) return false;
      if (isStaff) return true;
      const matchId = user?.id && m.teacherId === user.id;
      const matchNik = user?.nik && (m.teacherId === user.nik || (m as any).teacherNik === user.nik);
      const matchUser = user?.username && (m.teacherId === user.username || (m as any).teacherUsername === user.username);
      const matchSubject = user?.subject && m.subjectId === user.subject;
      const matchClass = assignedClasses.some(c => isItemForClass(m.classId, m.targetClasses, c));
      return matchId || matchNik || matchUser || matchSubject || matchClass;
    });
  }, [materials, user, isStaff, assignedClasses]);

  // Set of material IDs relevant to this teacher
  const relevantMaterialIds = useMemo(() => {
    return new Set(teacherMaterialsWithAssignments.map(m => m.id));
  }, [teacherMaterialsWithAssignments]);

  // Filtered submissions list - ensure NO student in teacher classes is excluded
  const enrichedSubmissions = useMemo(() => {
    return assignments
      .filter(a => {
        if (isStaff) return true;
        if (relevantMaterialIds.has(a.materialId)) return true;
        const student = users.find(u => u.id === a.studentId || (u.nisn && u.nisn === a.studentId));
        if (student?.classId && assignedClasses.includes(student.classId)) return true;
        const material = materials.find(m => m.id === a.materialId);
        if (material && assignedClasses.some(c => isItemForClass(material.classId, material.targetClasses, c))) return true;
        return false;
      })
      .map(sub => {
        const student = users.find(u => u.id === sub.studentId || (u.nisn && u.nisn === sub.studentId));
        const material = materials.find(m => m.id === sub.materialId);
        return {
          ...sub,
          studentName: student?.name || 'Siswa',
          studentNisn: student?.nisn || '-',
          studentClass: student?.classId || '-',
          materialTitle: material?.assignmentTitle || material?.title || 'Tugas Tanpa Judul',
          materialSubject: material?.subjectId || '-',
          dueDate: material?.assignmentDueDate
        };
      });
  }, [assignments, users, materials, isStaff, relevantMaterialIds, assignedClasses]);

  const filteredSubmissions = useMemo(() => {
    return enrichedSubmissions.filter(sub => {
      // 1. Class filter
      if (selectedClass !== 'ALL' && sub.studentClass !== selectedClass) {
        return false;
      }
      // 2. Material filter
      if (selectedMaterialId !== 'ALL' && sub.materialId !== selectedMaterialId) {
        return false;
      }
      // 3. Status filter
      const isGraded = sub.grade !== undefined && sub.grade !== null && sub.grade !== '';
      if (statusFilter === 'GRADED' && !isGraded) return false;
      if (statusFilter === 'UNGRADED' && isGraded) return false;

      // 4. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = sub.studentName.toLowerCase().includes(q);
        const matchesNisn = sub.studentNisn.toLowerCase().includes(q);
        const matchesTitle = sub.materialTitle.toLowerCase().includes(q);
        const matchesClass = sub.studentClass.toLowerCase().includes(q);
        return matchesName || matchesNisn || matchesTitle || matchesClass;
      }

      return true;
    }).sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
  }, [enrichedSubmissions, selectedClass, selectedMaterialId, statusFilter, searchQuery]);

  // Statistics
  const totalSubmissions = enrichedSubmissions.length;
  const gradedCount = enrichedSubmissions.filter(s => s.grade !== undefined && s.grade !== null && s.grade !== '').length;
  const ungradedCount = totalSubmissions - gradedCount;
  const averageGrade = useMemo(() => {
    const graded = enrichedSubmissions.filter(s => typeof s.grade === 'number' && !isNaN(s.grade));
    if (graded.length === 0) return 0;
    const sum = graded.reduce((acc, curr) => acc + curr.grade, 0);
    return Math.round((sum / graded.length) * 10) / 10;
  }, [enrichedSubmissions]);

  // Handle open grading modal
  const handleOpenGradeModal = (sub: any) => {
    setSelectedSubmission(sub);
    setGradeInput(sub.grade !== undefined && sub.grade !== null ? sub.grade : '');
    setFeedbackInput(sub.feedback || '');
    setGradingModalOpen(true);
  };

  // Handle submit grade
  const handleSaveGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubmission) return;

    const numGrade = Number(gradeInput);
    if (isNaN(numGrade) || numGrade < 0 || numGrade > 100) {
      toast.error('Nilai harus berupa angka antara 0 sampai 100');
      return;
    }

    setIsSavingGrade(true);
    try {
      await gradeAssignment(
        selectedSubmission.studentId,
        selectedSubmission.materialId,
        numGrade,
        feedbackInput.trim()
      );
      toast.success(`Nilai untuk ${selectedSubmission.studentName} berhasil disimpan (${numGrade})`);
      setGradingModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Gagal menyimpan nilai tugas');
    } finally {
      setIsSavingGrade(false);
    }
  };

  // Handle Refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await pullAllFromServer();
      toast.success('Data tugas berhasil diperbarui dari server');
    } catch {
      toast.error('Gagal memperbarui data');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Export to Excel
  const handleExportExcel = () => {
    if (filteredSubmissions.length === 0) {
      toast.error('Tidak ada data tugas yang dapat diekspor');
      return;
    }

    const exportRows = filteredSubmissions.map((s, idx) => ({
      No: idx + 1,
      'Nama Siswa': s.studentName,
      NISN: s.studentNisn,
      Kelas: s.studentClass,
      'Judul Tugas / Materi': s.materialTitle,
      'Mata Pelajaran': s.materialSubject,
      'Waktu Pengumpulan': formatDate(s.submittedAt),
      'Nilai Tugas': s.grade !== undefined && s.grade !== null ? s.grade : 'Belum Dinilai',
      'Catatan / Feedback Guru': s.feedback || '-',
      'Tautan / Berkas': s.link || '-'
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Tugas Siswa');
    XLSX.writeFile(workbook, `Rekap_Tugas_Siswa_${user?.subject || 'SMP'}_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success('Berkas rekap tugas berhasil diunduh (Excel)');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl">
              <FileCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Tugas Masuk Siswa</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Pantau kiriman tugas siswa, unduh berkas lampiran, dan berikan penilaian langsung.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button 
            variant="secondary" 
            size="sm" 
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="text-xs gap-1.5"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", isRefreshing && "animate-spin")} />
            {isRefreshing ? 'Memperbarui...' : 'Perbarui'}
          </Button>
          <Button 
            size="sm" 
            onClick={handleExportExcel}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 shadow-sm"
          >
            <FolderDown className="w-3.5 h-3.5" />
            Ekspor Excel
          </Button>
        </div>
      </div>

      {/* Quick Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white border-slate-200 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500">Total Tugas Masuk</p>
              <h3 className="text-2xl font-extrabold text-slate-900 mt-1">{totalSubmissions}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-amber-600">Menunggu Dinilai</p>
              <h3 className="text-2xl font-extrabold text-amber-700 mt-1">{ungradedCount}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-emerald-600">Sudah Dinilai</p>
              <h3 className="text-2xl font-extrabold text-emerald-700 mt-1">{gradedCount}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-purple-600">Rata-rata Nilai</p>
              <h3 className="text-2xl font-extrabold text-purple-700 mt-1">
                {averageGrade > 0 ? averageGrade : '-'}
              </h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
              <Award className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="bg-white border-slate-200 shadow-xs">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari siswa, NISN, atau judul..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:border-indigo-500 focus:bg-white transition-all"
              />
            </div>

            {/* Filter Kelas */}
            <div>
              <select
                value={selectedClass}
                onChange={e => setSelectedClass(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:border-indigo-500 focus:bg-white text-slate-700 cursor-pointer"
              >
                <option value="ALL">Semua Kelas Ampuan</option>
                {assignedClasses.map(cls => (
                  <option key={cls} value={cls}>Kelas {cls}</option>
                ))}
              </select>
            </div>

            {/* Filter Materi */}
            <div>
              <select
                value={selectedMaterialId}
                onChange={e => setSelectedMaterialId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:border-indigo-500 focus:bg-white text-slate-700 cursor-pointer truncate"
              >
                <option value="ALL">Semua Tugas / Materi</option>
                {teacherMaterialsWithAssignments.map(m => (
                  <option key={m.id} value={m.id} className="truncate">
                    {m.assignmentTitle || m.title} ({m.classId})
                  </option>
                ))}
              </select>
            </div>

            {/* Filter Status Penilaian */}
            <div>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:border-indigo-500 focus:bg-white text-slate-700 cursor-pointer"
              >
                <option value="ALL">Semua Status Penilaian</option>
                <option value="UNGRADED">Belum Dinilai</option>
                <option value="GRADED">Sudah Dinilai</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Submissions List / Table */}
      <Card className="bg-white border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Siswa</th>
                <th className="py-3 px-4">Judul Tugas</th>
                <th className="py-3 px-4">Waktu Dikirim</th>
                <th className="py-3 px-4">Berkas / Lampiran</th>
                <th className="py-3 px-4 text-center">Nilai Tugas</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSubmissions.length > 0 ? (
                filteredSubmissions.map((sub, idx) => {
                  const isGraded = sub.grade !== undefined && sub.grade !== null && sub.grade !== '';
                  const isFileUpload = sub.link && sub.link.startsWith('/uploads/');

                  return (
                    <tr key={`${sub.studentId}-${sub.materialId}-${idx}`} className="hover:bg-slate-50/60 transition-colors">
                      {/* Siswa */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0">
                            {sub.studentName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900 leading-snug">{sub.studentName}</div>
                            <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1.5">
                              <span>NISN: {sub.studentNisn}</span>
                              <span>•</span>
                              <span className="font-semibold text-indigo-600 bg-indigo-50 px-1.5 py-0.2 rounded">
                                Kelas {sub.studentClass}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Judul Tugas */}
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-800 line-clamp-1 max-w-[220px]" title={sub.materialTitle}>
                          {sub.materialTitle}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Mapel: {sub.materialSubject}
                        </div>
                      </td>

                      {/* Waktu Dikirim */}
                      <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>{formatDate(sub.submittedAt)}</span>
                        </div>
                      </td>

                      {/* Berkas / Lampiran */}
                      <td className="py-3.5 px-4">
                        {isFileUpload ? (
                          <div className="flex items-center gap-2">
                            <a
                              href={sub.link}
                              download={sub.fileName || 'tugas_siswa'}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-medium text-xs border border-indigo-200/60 transition-colors"
                              title="Klik untuk mengunduh berkas tugas"
                            >
                              <File className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                              <span className="truncate max-w-[130px]">{sub.fileName || 'Berkas Tugas'}</span>
                              {sub.fileSize ? (
                                <span className="text-[10px] text-indigo-500 font-normal">
                                  ({formatFileSize(sub.fileSize)})
                                </span>
                              ) : null}
                              <Download className="w-3 h-3 ml-0.5 opacity-70" />
                            </a>
                          </div>
                        ) : sub.link ? (
                          <a
                            href={sub.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium text-xs border border-blue-200/60 transition-colors"
                            title="Buka tautan tugas di tab baru"
                          >
                            <ExternalLink className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            <span className="truncate max-w-[150px]">Buka Tautan Tugas</span>
                          </a>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Tidak ada lampiran</span>
                        )}
                      </td>

                      {/* Nilai Tugas */}
                      <td className="py-3.5 px-4 text-center">
                        {isGraded ? (
                          <div className="inline-flex flex-col items-center">
                            <span className={cn(
                              "px-2.5 py-0.5 rounded-full font-bold text-xs inline-flex items-center gap-1",
                              Number(sub.grade) >= 75 
                                ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                : "bg-amber-100 text-amber-800 border border-amber-300"
                            )}>
                              {sub.grade} / 100
                            </span>
                            {sub.feedback && (
                              <span className="text-[10px] text-slate-500 mt-1 max-w-[140px] truncate" title={sub.feedback}>
                                "{sub.feedback}"
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-medium text-[10px] border border-slate-200">
                            Belum Dinilai
                          </span>
                        )}
                      </td>

                      {/* Aksi */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <Button
                          size="sm"
                          variant={isGraded ? "secondary" : "primary"}
                          onClick={() => handleOpenGradeModal(sub)}
                          className={cn(
                            "text-xs gap-1.5 px-3 py-1 font-semibold",
                            !isGraded && "bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
                          )}
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          {isGraded ? 'Edit Nilai' : 'Beri Nilai'}
                        </Button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <FileCheck className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold text-slate-600 text-sm">Tidak Ada Tugas yang Ditemukan</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {searchQuery || selectedClass !== 'ALL' || selectedMaterialId !== 'ALL' || statusFilter !== 'ALL'
                        ? 'Coba sesuaikan filter atau kata kunci pencarian Anda.'
                        : 'Belum ada siswa yang mengumpulkan tugas untuk materi Anda.'}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal Beri / Edit Nilai */}
      {gradingModalOpen && selectedSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in">
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-indigo-600 px-6 py-4 flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-indigo-200" />
                <h3 className="font-bold text-base">Penilaian Tugas Siswa</h3>
              </div>
              <button
                type="button"
                onClick={() => setGradingModalOpen(false)}
                className="text-indigo-200 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveGrade} className="p-6 space-y-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Nama Siswa:</span>
                  <span className="font-bold text-slate-900">{selectedSubmission.studentName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">NISN / Kelas:</span>
                  <span className="text-slate-800">{selectedSubmission.studentNisn} (Kelas {selectedSubmission.studentClass})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Judul Tugas:</span>
                  <span className="text-slate-800 font-medium truncate max-w-[200px]" title={selectedSubmission.materialTitle}>
                    {selectedSubmission.materialTitle}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-1 border-t border-slate-200">
                  <span className="text-slate-500">Lampiran Tugas:</span>
                  {selectedSubmission.link ? (
                    <a
                      href={selectedSubmission.link}
                      download={selectedSubmission.fileName || 'tugas'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:text-indigo-800 font-semibold inline-flex items-center gap-1 hover:underline"
                    >
                      <Download className="w-3 h-3" />
                      {selectedSubmission.fileName || 'Unduh / Lihat Tugas'}
                    </a>
                  ) : (
                    <span className="text-slate-400 italic">Tidak ada lampiran</span>
                  )}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Nilai Tugas (Skala 0 - 100) <span className="text-rose-500">*</span>
                </label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  placeholder="Contoh: 85"
                  value={gradeInput}
                  onChange={e => setGradeInput(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Catatan / Umpan Balik Guru (Opsional)
                </label>
                <textarea
                  className="w-full rounded-lg border border-slate-300 p-3 bg-white text-xs outline-none focus:border-indigo-500 min-h-[80px]"
                  placeholder="Contoh: Analisis jawaban sangat baik dan lengkap. Pertahankan prestasimu!"
                  value={feedbackInput}
                  onChange={e => setFeedbackInput(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button 
                  type="button" 
                  variant="secondary" 
                  size="sm" 
                  onClick={() => setGradingModalOpen(false)}
                >
                  Batal
                </Button>
                <Button 
                  type="submit" 
                  size="sm" 
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
                  isLoading={isSavingGrade}
                >
                  Simpan Nilai
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
