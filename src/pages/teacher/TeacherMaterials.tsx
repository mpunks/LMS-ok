import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { BookOpen, Plus, FileText, Youtube, Trash2, Edit2, Link as LinkIcon, Code } from 'lucide-react';
import { toast } from '@/components/ui/Toast';
import { useDataStore } from '@/store/dataStore';
import { useAuthStore } from '@/store/authStore';
import { parseItemClasses } from '@/lib/utils';
import ClassCheckboxSelector from '@/components/teacher/ClassCheckboxSelector';
import ManageTeacherClassesModal from '@/components/teacher/ManageTeacherClassesModal';

export default function TeacherMaterials() {
  const { user } = useAuthStore();
  const { materials, addMaterial, updateMaterial, deleteMaterial } = useDataStore();
  
  // Normalize assignedClasses to string array
  const assignedClasses = Array.isArray(user?.assignedClasses)
    ? user.assignedClasses
    : (typeof user?.assignedClasses === 'string' && user.assignedClasses
        ? (user.assignedClasses as string).split(',').map(s => s.trim()).filter(Boolean)
        : []);

  const teacherMaterials = materials.filter(m => m.teacherId === user?.id).sort((a, b) => a.order - b.order);
  
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
    order: 1 
  });

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
      pdfUrl: formData.type === 'PDF' ? formData.url : undefined,
      youtubeUrl: formData.type === 'VIDEO' ? formData.url : undefined,
      linkUrl: formData.type === 'LINK' ? formData.url : undefined,
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
      url: mat.pdfUrl || mat.youtubeUrl || mat.linkUrl || ''
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
            Kelola dan tugaskan bahan ajar (PDF, video, link, teks) untuk kelas yang Anda ampu
          </p>
        </div>
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
            order: teacherMaterials.length + 1 
          });
          setShowForm(!showForm);
        }}>
          <Plus className="w-4 h-4" /> Tambah Materi Baru
        </Button>
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
                    className="w-full h-10 rounded-lg border border-slate-300 px-3 bg-white text-xs outline-none focus:border-indigo-500"
                    placeholder="Contoh: Matematika"
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
                    className="w-full h-10 rounded-lg border border-slate-300 px-3 bg-white text-xs" 
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
                  <p className="text-xs text-slate-500 line-clamp-2 mb-4">{mat.content}</p>
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
          <div className="col-span-full p-12 text-center border-2 border-dashed border-slate-200 rounded-xl text-slate-500">
            Belum ada materi pembelajaran yang ditambahkan.
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
