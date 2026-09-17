import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { CheckSquare, Plus, Trash2, Edit2, Users } from 'lucide-react';
import { toast } from '@/components/ui/Toast';
import { useDataStore } from '@/store/dataStore';

export default function TeacherQuizzes() {
  const { quizzes, addQuiz, updateQuiz, deleteQuiz } = useDataStore();
  const [showForm, setShowForm] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  
  const [formData, setFormData] = useState({ id: '', title: '', subjectId: 'Matematika', classId: '7A', durationMinutes: 45, materialId: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isEdit) {
        await updateQuiz(formData.id, formData);
        toast.success('Kuis diperbarui');
      } else {
        await addQuiz({
          ...formData,
          id: `q-${Date.now()}`,
          createdAt: new Date().toISOString(),
          questions: []
        });
        toast.success('Kuis baru berhasil dibuat');
      }
      setShowForm(false);
    } catch (error: any) {
      toast.error(error.message || 'Gagal menyimpan kuis');
    }
  };

  const handleEdit = (quiz: any) => {
    setFormData({ id: quiz.id, title: quiz.title, subjectId: quiz.subjectId || 'Matematika', classId: quiz.classId || '7A', durationMinutes: quiz.durationMinutes, materialId: quiz.materialId });
    setIsEdit(true);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Yakin ingin menghapus kuis ini?')) {
      try {
        await deleteQuiz(id);
        toast.success('Kuis berhasil dihapus');
      } catch (error: any) {
        toast.error(error.message || 'Gagal menghapus kuis');
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-900">Kelola Kuis & Ujian</h1>
        <Button className="gap-2 shrink-0" onClick={() => {
          setIsEdit(false);
          setFormData({ id: '', title: '', subjectId: 'Matematika', classId: '7A', durationMinutes: 45, materialId: '' });
          setShowForm(!showForm);
        }}>
          <Plus className="w-4 h-4" /> Buat Kuis Baru
        </Button>
      </div>

      {showForm && (
        <Card className="border-indigo-100 bg-indigo-50/30">
          <CardHeader>
            <CardTitle>{isEdit ? 'Edit Kuis' : 'Buat Kuis Baru'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Judul Kuis" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} required />
              <Input label="Durasi Ujian (Menit)" type="number" min="5" value={formData.durationMinutes} onChange={e => setFormData({...formData, durationMinutes: parseInt(e.target.value) || 45})} required />
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-sm font-medium text-slate-700 block mb-1.5">Kelas</label>
                  <select className="w-full h-10 rounded-lg border border-slate-300 px-3 bg-white" value={formData.classId} onChange={e => setFormData({...formData, classId: e.target.value})}>
                    <option value="7A">7A</option>
                    <option value="7B">7B</option>
                  </select>
                </div>
              </div>
              <div className="md:col-span-2 flex justify-end gap-2 mt-4">
                <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Batal</Button>
                <Button type="submit">Simpan Kuis</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {quizzes.map((quiz) => (
          <Card key={quiz.id} className="hover:border-indigo-200 transition-colors">
            <CardHeader className="pb-3 border-b-0">
              <div className="flex justify-between items-start">
                <span className="text-xs font-semibold text-emerald-700 bg-emerald-100 px-2 py-1 rounded">
                  {quiz.classId}
                </span>
                <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-1 rounded">
                  {quiz.subjectId || 'Matematika'}
                </span>
              </div>
              <CardTitle className="text-lg mt-3">{quiz.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 text-sm text-slate-600 mb-6">
                <div className="flex items-center gap-1.5">
                  <Users className="w-4 h-4" /> Kelas {quiz.classId}
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckSquare className="w-4 h-4" /> {quiz.durationMinutes} Mnt
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" className="flex-1" onClick={() => handleEdit(quiz)}>
                  <Edit2 className="w-4 h-4 mr-2" /> Edit Kuis
                </Button>
                <Button variant="danger" size="sm" onClick={() => handleDelete(quiz.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {quizzes.length === 0 && (
          <div className="col-span-full p-12 text-center border-2 border-dashed border-slate-200 rounded-xl text-slate-500">
            Belum ada kuis yang ditambahkan.
          </div>
        )}
      </div>
    </div>
  );
}
