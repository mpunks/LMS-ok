import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { 
  BookOpen, 
  Plus, 
  FileText, 
  Youtube, 
  Trash2, 
  Edit2, 
  Link as LinkIcon, 
  Code,
  ClipboardList,
  CalendarClock,
  FileCheck,
  ChevronRight,
  RefreshCw
} from 'lucide-react';
import { toast } from '@/components/ui/Toast';
import { useDataStore } from '@/store/dataStore';
import { useAuthStore } from '@/store/authStore';
import { parseItemClasses } from '@/lib/utils';
import ClassCheckboxSelector from '@/components/teacher/ClassCheckboxSelector';
import ManageTeacherClassesModal from '@/components/teacher/ManageTeacherClassesModal';

export default function TeacherMaterials() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { materials, assignments = [], addMaterial, updateMaterial, deleteMaterial, pullAllFromServer } = useDataStore();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [viewScope, setViewScope] = useState<'MY' | 'ALL'>('MY');

  useEffect(() => {
    pullAllFromServer().catch(() => {});
  }, []);
  
  // Normalize assignedClasses to string array
  const assignedClasses = Array.isArray(user?.assignedClasses)
    ? user.assignedClasses
    : (typeof user?.assignedClasses === 'string' && user.assignedClasses
        ? (user.assignedClasses as string).split(',').map(s => s.trim()).filter(Boolean)
        : []);

  const isStaff = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';

  // Flexible filter so teacher materials are NEVER lost on reopen/relogin
  const myMaterialsList = materials.filter(m => {
    if (!m) return false;
    if (isStaff) return true;
    const matchId = user?.id && m.teacherId === user.id;
    const matchNik = user?.nik && (m.teacherId === user.nik || (m as any).teacherNik === user.nik);
    const matchUser = user?.username && (m.teacherId === user.username || (m as any).teacherUsername === user.username);
    const matchName = user?.name && (m as any).teacherName && String((m as any).teacherName).toLowerCase().trim() === String(user.name).toLowerCase().trim();
    const matchSubject = user?.subject && m.subjectId && String(m.subjectId).toLowerCase().trim() === String(user.subject).toLowerCase().trim();
    const matchClass = assignedClasses.length > 0 && assignedClasses.some(c => (m.classId && m.classId.includes(c)) || (Array.isArray(m.targetClasses) && m.targetClasses.includes(c)));
    return matchId || matchNik || matchUser || matchName || matchSubject || matchClass;
  });

  const teacherMaterials = (viewScope === 'ALL' || isStaff ? materials : myMaterialsList).sort((a, b) => a.order - b.order);
  
  const [showForm, setShowForm] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [showManageClassesModal, setShowManageClassesModal] = useState(false);
  
  const [formData, setFormData] = useState({ 
    id: '', 
    title: '', 
    selectedClasses: assignedClasses.length > 0 ? [assignedClasses[0]] : [] as string[], 
    subjectId: user?.subject || 'Matematika', 
    type: 'PDF' as 'PDF' | 'VIDEO' | 'LINK' | 'HTML', 
    content: '', 
    url: '', 
    chapter: 'Bab 1', 
    order: 1,
    hasAssignment: false,
    assignmentTitle: '',
    assignmentInstructions: '',
    assignmentDueDate: ''
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await pullAllFromServer();
      toast.success('Materi berhasil disinkronkan dari server');
    } catch {
      toast.error('Gagal memperbarui materi');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.selectedClasses.length === 0) {
      toast.error('Pilih minimal satu kelas target yang Anda ampu');
      return;
    }

    const classIdStr = formData.selectedClasses.join(', ');
    
    const matData = {
      title: formData.title,
      classId: classIdStr,
      targetClasses: formData.selectedClasses,
      subjectId: formData.subjectId,
      type: formData.type,
      content: formData.content,
      chapter: formData.chapter,
      order: formData.order,
      semester: 1,
      teacherId: user!.id,
      teacherName: user?.name || '',
      teacherNik: user?.nik || '',
      teacherUsername: user?.username || '',
      pdfUrl: formData.type === 'PDF' ? formData.url : undefined,
      youtubeUrl: formData.type === 'VIDEO' ? formData.url : undefined,
      linkUrl: formData.type === 'LINK' ? formData.url : undefined,
      hasAssignment: Boolean(formData.hasAssignment),
      assignmentTitle: formData.hasAssignment ? (formData.assignmentTitle || formData.title) : undefined,
      assignmentInstructions: formData.hasAssignment ? formData.assignmentInstructions : undefined,
      assignmentDueDate: formData.hasAssignment ? formData.assignmentDueDate : undefined,
    };

    try {
      if (isEdit) {
        await updateMaterial(formData.id, matData);
        toast.success(`Materi berhasil diperbarui untuk kelas ${classIdStr}`);
      } else {
        await addMaterial({
          ...matData,
          id: `m-${Date.now()}`,
          createdAt: new Date().toISOString()
        });
        toast.success(`Materi baru berhasil ditugaskan untuk kelas ${classIdStr}`);
      }
      setShowForm(false);
    } catch (error: any) {
      toast.error(error.message || 'Gagal menyimpan materi');
    }
  };

  const handleEdit = (mat: any) => {
    const parsed = parseItemClasses(mat.classId, mat.targetClasses);
    setFormData({
      id: mat.id,
      title: mat.title,
      selectedClasses: parsed.length > 0 ? parsed : (assignedClasses.length > 0 ? [assignedClasses[0]] : []),
      subjectId: mat.subjectId || user?.subject || 'Matematika',
      type: mat.type,
      content: mat.content || '',
      chapter: mat.chapter || '',
      order: mat.order || 1,
      url: mat.pdfUrl || mat.youtubeUrl || mat.linkUrl || '',
      hasAssignment: Boolean(mat.hasAssignment),
      assignmentTitle: mat.assignmentTitle || '',
      assignmentInstructions: mat.assignmentInstructions || '',
      assignmentDueDate: mat.assignmentDueDate || ''
    });
    setIsEdit(true);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Hapus materi ini?')) {
      try {
        await deleteMaterial(id);
        toast.success('Materi dihapus');
      } catch (error: any) {
        toast.error(error.message || 'Gagal menghapus materi');
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Materi Belajar</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Kelola bahan ajar, tugas, dan modul pembelajaran untuk kelas yang Anda ampu
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="text-xs gap-1.5 border-slate-300 hover:bg-slate-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Menyinkronkan...' : 'Sinkronkan'}
          </Button>
          <Button className="gap-2 shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white" onClick={() => {
            setIsEdit(false);
            setFormData({ 
              id: '', 
              title: '', 
              selectedClasses: assignedClasses.length > 0 ? [assignedClasses[0]] : [], 
              subjectId: user?.subject || 'Matematika', 
              type: 'PDF', 
              content: '', 
              url: '', 
              chapter: 'Bab 1', 
              order: teacherMaterials.length + 1,
              hasAssignment: false,
              assignmentTitle: '',
              assignmentInstructions: '',
              assignmentDueDate: ''
            });
            setShowForm(!showForm);
          }}>
            <Plus className="w-4 h-4" /> Tambah Materi Baru
          </Button>
        </div>
      </div>

      {/* Scope Filter Tabs */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-3 flex-wrap">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setViewScope('MY')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              viewScope === 'MY'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            Materi Saya ({myMaterialsList.length})
          </button>
          <button
            type="button"
            onClick={() => setViewScope('ALL')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              viewScope === 'ALL'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            Semua Materi Sekolah ({materials.length})
          </button>
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Menampilkan <strong className="text-slate-800">{teacherMaterials.length}</strong> bahan ajar tersimpan
        </div>
      </div>

      {showForm && (
        <Card className="border-indigo-100 bg-indigo-50/30 shadow-sm animate-in fade-in">
          <CardHeader>
            <CardTitle>{isEdit ? 'Edit Materi Belajar' : 'Tambah Materi Baru'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Judul Materi" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="Contoh: Modul Bab 1 Bilangan Bulat" required />
              
              <div className="flex gap-4">
                <div className="flex-1">
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
                <div className="flex-1">
                  <Input label="Bab" value={formData.chapter} onChange={e => setFormData({...formData, chapter: e.target.value})} placeholder="Contoh: Bab 1" required />
                </div>
              </div>

              {/* Target Class Checkboxes - ONLY classes taught by this teacher */}
              <div className="md:col-span-2 p-4 rounded-xl border border-indigo-100 bg-white/90 shadow-xs">
                <ClassCheckboxSelector
                  assignedClasses={assignedClasses}
                  selectedClasses={formData.selectedClasses}
                  onChange={(newClasses) => setFormData(prev => ({ ...prev, selectedClasses: newClasses }))}
                  label="Kelas Target Materi (Pilihan Checkbox)"
                  description="Centang kelas-kelas yang Anda ampu yang ditugaskan untuk mengakses materi pembelajaran ini"
                  onOpenManageClasses={() => setShowManageClassesModal(true)}
                />
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-xs font-medium text-slate-700 block mb-1.5">Tipe Materi</label>
                  <select 
                    className="w-full h-10 rounded-lg border border-slate-300 px-3 bg-white text-xs text-slate-900 font-medium outline-none focus:border-cyan-500" 
                    value={formData.type} 
                    onChange={e => setFormData({...formData, type: e.target.value as any})}
                  >
                    <option value="PDF">Dokumen PDF</option>
                    <option value="VIDEO">Video YouTube</option>
                    <option value="LINK">Tautan Eksternal</option>
                    <option value="HTML">Teks Kaya (HTML)</option>
                  </select>
                </div>
                <div className="flex-1">
                  <Input 
                    label="Urutan (Akses Bertahap)" 
                    type="number" 
                    min="1" 
                    value={formData.order} 
                    onChange={e => setFormData({...formData, order: parseInt(e.target.value) || 1})} 
                    required 
                  />
                </div>
              </div>

              {(formData.type as any) !== 'HTML' && (
                <Input 
                  label="URL (Tautan File/Video/Web)" 
                  className="md:col-span-2" 
                  value={formData.url} 
                  onChange={e => setFormData({...formData, url: e.target.value})} 
                  placeholder={formData.type === 'VIDEO' ? 'https://www.youtube.com/watch?v=...' : 'https://...'}
                  required={(formData.type as any) !== 'HTML'} 
                />
              )}
              
              <div className="md:col-span-2">
                <label className="text-xs font-medium text-slate-700 block mb-1.5">Deskripsi / Konten (Opsional)</label>
                <textarea 
                  className="w-full rounded-lg border border-slate-300 p-3 bg-white min-h-[100px] text-xs font-mono"
                  value={formData.content}
                  onChange={e => setFormData({...formData, content: e.target.value})}
                  placeholder="Masukkan ringkasan materi, instruksi belajar, atau konten HTML di sini..."
                ></textarea>
              </div>

              {/* Form Penugasan Siswa (Opsional) */}
              <div className="md:col-span-2 p-4 rounded-xl border border-amber-200 bg-amber-50/40 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className={`p-2 rounded-lg ${formData.hasAssignment ? 'bg-amber-500 text-white shadow-xs' : 'bg-slate-200 text-slate-500'}`}>
                      <ClipboardList className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800">Penugasan Siswa untuk Materi Ini (Opsional)</div>
                      <div className="text-[11px] text-slate-500">
                        Jika diaktifkan, kolom pengumpulan tugas akan muncul di akun siswa. Jika dinonaktifkan, siswa hanya membaca materi tanpa tugas.
                      </div>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={formData.hasAssignment} 
                      onChange={e => setFormData({ ...formData, hasAssignment: e.target.checked })} 
                      className="sr-only peer" 
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
                  </label>
                </div>

                {formData.hasAssignment && (
                  <div className="pt-3 border-t border-amber-200/60 space-y-3 animate-in fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Input 
                        label="Judul / Nama Tugas" 
                        placeholder="Contoh: Lembar Kerja Mandiri Bab 1" 
                        value={formData.assignmentTitle} 
                        onChange={e => setFormData({ ...formData, assignmentTitle: e.target.value })} 
                      />
                      <div>
                        <label className="text-xs font-medium text-slate-700 block mb-1.5 flex items-center gap-1">
                          <CalendarClock className="w-3.5 h-3.5 text-slate-400" /> Batas Waktu Pengumpulan (Deadline - Opsional)
                        </label>
                        <input 
                          type="datetime-local" 
                          value={formData.assignmentDueDate} 
                          onChange={e => setFormData({ ...formData, assignmentDueDate: e.target.value })} 
                          className="w-full h-10 rounded-lg border border-slate-300 px-3 bg-white text-xs outline-none focus:border-indigo-500" 
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-700 block mb-1.5">
                        Petunjuk & Instruksi Pengerjaan Tugas untuk Siswa
                      </label>
                      <textarea 
                        className="w-full rounded-lg border border-slate-300 p-3 bg-white min-h-[80px] text-xs outline-none focus:border-indigo-500" 
                        value={formData.assignmentInstructions} 
                        onChange={e => setFormData({ ...formData, assignmentInstructions: e.target.value })} 
                        placeholder="Tuliskan petunjuk tugas (misal: Kerjakan latihan soal hal. 20 di buku catatan, foto dan unggah ke Google Drive Anda, lalu tempel tautannya di kolom pengumpulan)..." 
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="md:col-span-2 flex justify-end gap-2 mt-4">
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowForm(false)}>Batal</Button>
                <Button type="submit" size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white">
                  {isEdit ? 'Simpan Perubahan' : 'Simpan Materi'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {teacherMaterials.map((mat) => {
          const targetClasses = parseItemClasses(mat.classId, mat.targetClasses);
          return (
            <Card key={mat.id} className="hover:border-indigo-200 transition-colors flex flex-col group shadow-sm">
              <CardContent className="p-6 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      (mat.type as any) === 'VIDEO' ? 'bg-rose-100 text-rose-600' : 
                      (mat.type as any) === 'LINK' ? 'bg-purple-100 text-purple-600' :
                      (mat.type as any) === 'HTML' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'
                    }`}>
                      {(mat.type as any) === 'VIDEO' && <Youtube className="w-5 h-5" />}
                      {(mat.type as any) === 'PDF' && <FileText className="w-5 h-5" />}
                      {(mat.type as any) === 'LINK' && <LinkIcon className="w-5 h-5" />}
                      {(mat.type as any) === 'HTML' && <Code className="w-5 h-5" />}
                    </div>
                    <div className="flex flex-col gap-1 items-end max-w-[65%]">
                      <div className="flex flex-wrap gap-1 justify-end">
                        {targetClasses.map(cls => (
                          <span key={cls} className="text-xs font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                            Kelas {cls}
                          </span>
                        ))}
                      </div>
                      <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                        Urutan {mat.order}
                      </span>
                    </div>
                  </div>
                  <h3 className="font-bold text-slate-900 mb-1 group-hover:text-indigo-600 transition-colors leading-snug">
                    {mat.title}
                  </h3>
                  <div className="text-[11px] text-slate-400 mb-2">
                    {mat.chapter} • {mat.subjectId || 'Mata Pelajaran'}
                  </div>
                  <p className="text-xs text-slate-500 line-clamp-2 mb-3">{mat.content}</p>

                  {/* Badge penugasan jika materi ini memiliki tugas */}
                  {mat.hasAssignment && (() => {
                    const matSubmissions = (assignments || []).filter(a => a.materialId === mat.id);
                    const graded = matSubmissions.filter(a => a.grade !== undefined && a.grade !== null && a.grade !== '').length;
                    const ungraded = matSubmissions.length - graded;

                    return (
                      <div className="p-3 rounded-xl bg-amber-50/90 border border-amber-200/90 text-xs mb-3 space-y-2">
                        <div className="flex items-center justify-between text-amber-950 font-semibold gap-2">
                          <div className="flex items-center gap-1.5 truncate">
                            <ClipboardList className="w-4 h-4 text-amber-600 shrink-0" />
                            <span className="truncate">{mat.assignmentTitle || 'Penugasan Siswa'}</span>
                          </div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-200/80 text-amber-900 shrink-0">
                            {matSubmissions.length} Anak Mengumpulkan
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2 pt-1 border-t border-amber-200/60 text-[11px]">
                          <span className="text-slate-600">
                            {ungraded > 0 ? (
                              <strong className="text-rose-600 font-bold">{ungraded} menunggu nilai</strong>
                            ) : (
                              <span className="text-emerald-700 font-medium">Semua telah dinilai</span>
                            )}
                          </span>
                          <button
                            type="button"
                            onClick={() => navigate(`/teacher/assignments?materialId=${mat.id}`)}
                            className="inline-flex items-center gap-1 text-indigo-700 hover:text-indigo-900 font-bold text-xs hover:underline cursor-pointer shrink-0"
                          >
                            Periksa Tugas Anak <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </div>
                
                <div className="flex gap-2 mt-auto pt-4 border-t border-slate-100">
                  <Button variant="secondary" size="sm" className="flex-1 text-xs" onClick={() => handleEdit(mat)}>
                    <Edit2 className="w-3.5 h-3.5 mr-1.5" /> Edit
                  </Button>
                  <Button variant="danger" size="sm" className="text-xs" onClick={() => handleDelete(mat.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {teacherMaterials.length === 0 && (
          <div className="col-span-full p-12 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50 space-y-3">
            <BookOpen className="w-10 h-10 text-slate-400 mx-auto" />
            <div className="text-sm font-bold text-slate-700">
              {viewScope === 'MY' 
                ? 'Belum ada materi pembelajaran yang dibuat untuk kelas/mapel Anda.'
                : 'Belum ada materi pembelajaran tersimpan di server.'}
            </div>
            {viewScope === 'MY' && materials.length > 0 && (
              <p className="text-xs text-slate-500">
                Terdapat <strong>{materials.length} materi</strong> di bank materi sekolah.
                <button
                  type="button"
                  onClick={() => setViewScope('ALL')}
                  className="ml-1 text-indigo-600 font-bold underline cursor-pointer"
                >
                  Tampilkan Semua Materi
                </button>
              </p>
            )}
            <div className="pt-2">
              <Button
                size="sm"
                onClick={() => setShowForm(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" /> Tambah Materi Pertama
              </Button>
            </div>
          </div>
        )}
      </div>

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
