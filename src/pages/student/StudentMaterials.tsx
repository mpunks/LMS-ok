import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { BookOpen, FileText, Youtube, CheckCircle2, Lock, Link as LinkIcon, Code, UploadCloud } from 'lucide-react';
import { toast } from '@/components/ui/Toast';
import { useDataStore } from '@/store/dataStore';
import { useAuthStore } from '@/store/authStore';
import { isItemForClass } from '@/lib/utils';

export default function StudentMaterials() {
  const { user } = useAuthStore();
  const { materials, markMaterialAsRead, submitAssignment } = useDataStore();
  
  // Ambil materi khusus kelas siswa ini (mendukung penugasan multi-kelas) dan urutkan
  const studentMaterials = materials
    .filter(m => isItemForClass(m.classId, m.targetClasses, user?.classId))
    .sort((a, b) => a.order - b.order);

  // Local state for read status for UI purposes if backend sync takes time
  const [readMaterials, setReadMaterials] = useState<Record<string, boolean>>({});
  const [assignmentUrls, setAssignmentUrls] = useState<Record<string, string>>({});

  const toggleRead = async (id: string) => {
    if (user?.id) {
      try {
        await markMaterialAsRead(user.id, id);
        setReadMaterials(prev => ({ ...prev, [id]: true }));
        toast.success('Materi ditandai sebagai selesai dipelajari! Materi berikutnya terbuka.');
      } catch (error: any) {
        toast.error(error.message || 'Gagal menandai materi');
      }
    }
  };

  const handleAssignmentSubmit = async (materialId: string) => {
    if (!assignmentUrls[materialId]) {
      toast.error('Harap masukkan link tugas Anda');
      return;
    }
    if (user?.id) {
      try {
        await submitAssignment(user.id, materialId, assignmentUrls[materialId]);
        toast.success('Tugas berhasil dikumpulkan!');
        toggleRead(materialId); // Auto complete material after assignment
      } catch (error: any) {
        toast.error(error.message || 'Gagal mengirim tugas');
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Materi Pembelajaran</h1>
      </div>

      <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex gap-3 text-indigo-800 text-sm">
        <BookOpen className="w-5 h-5 shrink-0" />
        <p>Anda harus menyelesaikan materi secara berurutan. Baca dan klik <strong>"Tandai Selesai"</strong> atau kumpulkan tugas untuk membuka materi selanjutnya.</p>
      </div>

      <div className="space-y-6">
        {studentMaterials.map((mat, index) => {
          // Materi terbuka jika: ini materi pertama, ATAU materi sebelumnya sudah selesai dibaca
          const isUnlocked = index === 0 || readMaterials[studentMaterials[index - 1].id];
          const isRead = readMaterials[mat.id];

          return (
            <Card key={mat.id} className={`transition-all ${isUnlocked ? 'border-slate-200' : 'bg-slate-50 border-slate-200 opacity-75'}`}>
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row gap-6 items-start">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                    !isUnlocked ? 'bg-slate-200 text-slate-500' :
                    mat.type === 'VIDEO' ? 'bg-rose-100 text-rose-600' : 
                    mat.type === 'LINK' ? 'bg-purple-100 text-purple-600' :
                    mat.type === 'HTML' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'
                  }`}>
                    {!isUnlocked ? <Lock className="w-6 h-6" /> : (
                      <>
                        {mat.type === 'VIDEO' && <Youtube className="w-6 h-6" />}
                        {mat.type === 'PDF' && <FileText className="w-6 h-6" />}
                        {mat.type === 'LINK' && <LinkIcon className="w-6 h-6" />}
                        {mat.type === 'HTML' && <Code className="w-6 h-6" />}
                      </>
                    )}
                  </div>
                  
                  <div className="flex-1 space-y-4 w-full">
                    <div>
                      <div className="flex flex-wrap gap-2 mb-2">
                        <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-1 rounded">
                          {mat.subjectId} • Bab {mat.chapter}
                        </span>
                        {isUnlocked && (
                          <span className={`text-xs font-semibold px-2 py-1 rounded ${isRead ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                            {isRead ? 'Selesai' : 'Belum Selesai'}
                          </span>
                        )}
                      </div>
                      <h3 className={`font-bold text-xl ${isUnlocked ? 'text-slate-900' : 'text-slate-500'}`}>{mat.title}</h3>
                    </div>

                    {isUnlocked ? (
                      <>
                        <div className="prose prose-sm max-w-none text-slate-600">
                          <p>{mat.content}</p>
                          {mat.type === 'LINK' && mat.linkUrl && (
                            <a href={mat.linkUrl} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">Buka Tautan Materi &rarr;</a>
                          )}
                          {mat.type === 'VIDEO' && mat.youtubeUrl && (
                            <div className="mt-4 p-4 bg-slate-100 rounded-lg text-sm text-slate-500 flex items-center gap-2">
                              <Youtube className="w-4 h-4" /> [Video Player Placeholder untuk {mat.youtubeUrl}]
                            </div>
                          )}
                          {mat.type === 'PDF' && mat.pdfUrl && (
                            <div className="mt-4 p-4 bg-slate-100 rounded-lg text-sm text-slate-500 flex items-center gap-2">
                              <FileText className="w-4 h-4" /> [PDF Viewer Placeholder untuk {mat.pdfUrl}]
                            </div>
                          )}
                        </div>

                        <div className="pt-4 mt-4 border-t border-slate-100 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                          <div className="flex-1 flex gap-2 max-w-md w-full">
                            <Input 
                              placeholder="Tempel link tugas Anda di sini..." 
                              value={assignmentUrls[mat.id] || ''}
                              onChange={e => setAssignmentUrls({...assignmentUrls, [mat.id]: e.target.value})}
                            />
                            <Button className="shrink-0 gap-2" onClick={() => handleAssignmentSubmit(mat.id)}>
                              <UploadCloud className="w-4 h-4" /> Kumpulkan
                            </Button>
                          </div>
                          <button 
                            onClick={() => toggleRead(mat.id)}
                            disabled={isRead}
                            className={`flex items-center gap-2 text-sm font-medium transition-colors p-2 rounded-lg ${
                              isRead ? 'text-emerald-600 cursor-not-allowed' : 'text-indigo-600 hover:bg-indigo-50'
                            }`}
                          >
                            <CheckCircle2 className={`w-5 h-5 ${isRead ? 'fill-emerald-100' : ''}`} />
                            {isRead ? 'Sudah Dipelajari' : 'Tandai Selesai'}
                          </button>
                        </div>
                      </>
                    ) : (
                      <p className="text-sm text-slate-500 flex items-center gap-2">
                        <Lock className="w-4 h-4" /> Selesaikan materi sebelumnya untuk membuka materi ini.
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {studentMaterials.length === 0 && (
          <div className="p-12 text-center border-2 border-dashed border-slate-200 rounded-xl text-slate-500">
            Belum ada materi untuk kelas Anda.
          </div>
        )}
      </div>
    </div>
  );
}
