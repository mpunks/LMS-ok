import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { 
  BookOpen, 
  FileText, 
  Youtube, 
  CheckCircle2, 
  Lock, 
  Link as LinkIcon, 
  Code, 
  UploadCloud,
  ClipboardList,
  CalendarClock
} from 'lucide-react';
import { toast } from '@/components/ui/Toast';
import { useDataStore } from '@/store/dataStore';
import { useAuthStore } from '@/store/authStore';
import { isItemForClass } from '@/lib/utils';

export default function StudentMaterials() {
  const { user } = useAuthStore();
  const { materials, markMaterialAsRead, submitAssignment, pullAllFromServer } = useDataStore();

  useEffect(() => {
    pullAllFromServer().catch(() => {});
  }, []);
  
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

                        {/* Kotak Penugasan Siswa - HANYA TAMPIL JIKA GURU MEMBERIKAN TUGAS */}
                        {mat.hasAssignment ? (
                          <div className="mt-5 p-4 rounded-xl bg-amber-50/80 border border-amber-200/90 space-y-3">
                            <div className="flex items-start justify-between gap-2 flex-wrap">
                              <div className="flex items-center gap-2 text-amber-950 font-bold text-sm">
                                <div className="p-1.5 rounded-lg bg-amber-500 text-white">
                                  <ClipboardList className="w-4 h-4" />
                                </div>
                                <span>Tugas: {mat.assignmentTitle || 'Penugasan Materi'}</span>
                              </div>
                              {mat.assignmentDueDate && (
                                <span className="text-[11px] font-medium text-amber-800 bg-amber-100/90 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                                  <CalendarClock className="w-3.5 h-3.5 text-amber-600" />
                                  Batas: {new Date(mat.assignmentDueDate).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                                </span>
                              )}
                            </div>

                            {mat.assignmentInstructions && (
                              <div className="text-xs text-amber-950 bg-white/90 p-3 rounded-lg border border-amber-200/60 leading-relaxed whitespace-pre-line">
                                <div className="font-semibold text-amber-800 mb-1">Petunjuk & Instruksi Tugas:</div>
                                {mat.assignmentInstructions}
                              </div>
                            )}

                            <div className="pt-1 flex flex-col sm:flex-row gap-2">
                              <Input 
                                placeholder="Tempel link pengumpulan tugas Anda (Google Drive / Dokumen / dsb)..." 
                                value={assignmentUrls[mat.id] || ''}
                                onChange={e => setAssignmentUrls({...assignmentUrls, [mat.id]: e.target.value})}
                                className="bg-white text-xs h-10"
                              />
                              <Button className="shrink-0 gap-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs h-10 px-4" onClick={() => handleAssignmentSubmit(mat.id)}>
                                <UploadCloud className="w-4 h-4" /> Kumpulkan Tugas
                              </Button>
                            </div>
                          </div>
                        ) : null}

                        {/* Status dan Tombol Penyelesaian Pembelajaran */}
                        <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                          <span className="text-xs text-slate-400">
                            {mat.hasAssignment ? 'Materi ini memiliki tugas yang perlu dikumpulkan' : 'Materi mandiri (tanpa penugasan)'}
                          </span>
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
