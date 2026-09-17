import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { BookOpen, Plus, FileText, Youtube, Trash2, Edit2, Link as LinkIcon, Code } from 'lucide-react';
import { toast } from '@/components/ui/Toast';
import { useDataStore } from '@/store/dataStore';
import { useAuthStore } from '@/store/authStore';

export default function TeacherMaterials() {
  const { user } = useAuthStore();
  const { materials, addMaterial, updateMaterial, deleteMaterial } = useDataStore();
  
  const teacherMaterials = materials.filter(m => m.teacherId === user?.id).sort((a, b) => a.order - b.order);
  
  const [showForm, setShowForm] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [formData, setFormData] = useState({ 
    id: '', title: '', classId: '7A', subjectId: 'Matematika', 
    type: 'PDF' as 'PDF' | 'VIDEO' | 'LINK' | 'HTML', 
    content: '', url: '', chapter: 'Bab 1', order: 1 
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const matData = {
      title: formData.title,
      classId: formData.classId,
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
        toast.success('Materi diperbarui');
      } else {
        await addMaterial({
          ...matData,
          id: `m-${Date.now()}`,
          createdAt: new Date().toISOString()
        });
        toast.success('Materi ditambahkan');
      }
      setShowForm(false);
    } catch (error: any) {
      toast.error(error.message || 'Gagal menyimpan materi');
    }
  };

  const handleEdit = (mat: any) => {
    setFormData({
      id: mat.id,
      title: mat.title,
      classId: mat.classId,
      subjectId: mat.subjectId,
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
        <h1 className="text-2xl font-bold text-slate-900">Materi Belajar</h1>
        <Button className="gap-2 shrink-0" onClick={() => {
          setIsEdit(false);
          setFormData({ id: '', title: '', classId: '7A', subjectId: 'Matematika', type: 'PDF', content: '', url: '', chapter: 'Bab 1', order: teacherMaterials.length + 1 });
          setShowForm(!showForm);
        }}>
          <Plus className="w-4 h-4" /> Tambah Materi Baru
        </Button>
      </div>

      {showForm && (
        <Card className="border-indigo-100 bg-indigo-50/30">
          <CardHeader>
            <CardTitle>{isEdit ? 'Edit Materi' : 'Tambah Materi Baru'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Judul Materi" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} required />
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-sm font-medium text-slate-700 block mb-1.5">Kelas</label>
                  <select className="w-full h-10 rounded-lg border border-slate-300 px-3 bg-white" value={formData.classId} onChange={e => setFormData({...formData, classId: e.target.value})}>
                    <option value="7A">7A</option>
                    <option value="7B">7B</option>
                    <option value="8A">8A</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="text-sm font-medium text-slate-700 block mb-1.5">Bab</label>
                  <Input value={formData.chapter} onChange={e => setFormData({...formData, chapter: e.target.value})} required />
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-sm font-medium text-slate-700 block mb-1.5">Tipe Materi</label>
                  <select className="w-full h-10 rounded-lg border border-slate-300 px-3 bg-white" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as any})}>
                    <option value="PDF">Dokumen PDF</option>
                    <option value="VIDEO">Video YouTube</option>
                    <option value="LINK">Tautan Eksternal</option>
                    <option value="HTML">Teks Kaya (HTML)</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="text-sm font-medium text-slate-700 block mb-1.5">Urutan (Akses Bertahap)</label>
                  <Input type="number" min="1" value={formData.order} onChange={e => setFormData({...formData, order: parseInt(e.target.value) || 1})} required />
                </div>
              </div>
              {(formData.type as any) !== 'HTML' && (
                <Input label="URL (Tautan File/Video/Web)" className="md:col-span-2" value={formData.url} onChange={e => setFormData({...formData, url: e.target.value})} required={(formData.type as any) !== 'HTML'} />
              )}
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-slate-700 block mb-1.5">Deskripsi / Konten (Opsional)</label>
                <textarea 
                  className="w-full rounded-lg border border-slate-300 p-3 bg-white min-h-[100px]"
                  value={formData.content}
                  onChange={e => setFormData({...formData, content: e.target.value})}
                  placeholder="Masukkan deskripsi materi atau konten HTML di sini..."
                ></textarea>
              </div>
              <div className="md:col-span-2 flex justify-end gap-2 mt-4">
                <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Batal</Button>
                <Button type="submit">Simpan Materi</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {teacherMaterials.map((mat) => (
          <Card key={mat.id} className="hover:border-indigo-200 transition-colors flex flex-col group">
            <CardContent className="p-6 flex-1">
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
                <div className="flex flex-col gap-1 items-end">
                  <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-1 rounded">Kelas {mat.classId}</span>
                  <span className="text-xs font-semibold text-indigo-500 bg-indigo-50 px-2 py-1 rounded">Urutan {mat.order}</span>
                </div>
              </div>
              <h3 className="font-bold text-slate-900 mb-2 group-hover:text-indigo-600 transition-colors">{mat.title}</h3>
              <p className="text-sm text-slate-500 line-clamp-2 mb-4">{mat.content}</p>
              
              <div className="flex gap-2 mt-auto pt-4 border-t border-slate-100">
                <Button variant="secondary" size="sm" className="flex-1" onClick={() => handleEdit(mat)}>
                  <Edit2 className="w-4 h-4 mr-2" /> Edit
                </Button>
                <Button variant="danger" size="sm" onClick={() => handleDelete(mat.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {teacherMaterials.length === 0 && (
          <div className="col-span-full p-12 text-center border-2 border-dashed border-slate-200 rounded-xl text-slate-500">
            Belum ada materi yang ditambahkan.
          </div>
        )}
      </div>
    </div>
  );
}
