import React, { useState, useEffect, useRef } from 'react';
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
  CalendarClock,
  FolderOpen,
  FileCheck,
  ExternalLink,
  Download,
  Loader2,
  File,
  RefreshCw,
  X
} from 'lucide-react';
import { toast } from '@/components/ui/Toast';
import { useDataStore } from '@/store/dataStore';
import { useAuthStore } from '@/store/authStore';
import { isItemForClass } from '@/lib/utils';

export default function StudentMaterials() {
  const { user } = useAuthStore();
  const { materials, assignments, markMaterialAsRead, submitAssignment, pullAllFromServer } = useDataStore();

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
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, { name: string; size: number; url: string }>>({});
  const [uploadingState, setUploadingState] = useState<Record<string, boolean>>({});
  const [showResubmit, setShowResubmit] = useState<Record<string, boolean>>({});
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const formatFileSize = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

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

  const handleFileUpload = async (materialId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check size limit: 25MB
    if (file.size > 25 * 1024 * 1024) {
      toast.error('Ukuran berkas terlalu besar. Batas maksimal adalah 25MB');
      return;
    }

    setUploadingState(prev => ({ ...prev, [materialId]: true }));
    try {
      // Read file to base64
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64Data = reader.result as string;
          const res = await fetch('/api/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fileName: file.name,
              fileData: base64Data
            })
          });

          if (!res.ok) throw new Error('Gagal mengunggah berkas ke server');
          const json = await res.json();
          if (json.success && json.fileUrl) {
            setUploadedFiles(prev => ({
              ...prev,
              [materialId]: {
                name: file.name,
                size: file.size,
                url: json.fileUrl
              }
            }));
            setAssignmentUrls(prev => ({ ...prev, [materialId]: json.fileUrl }));
            toast.success(`Berkas "${file.name}" berhasil diunggah dari media penyimpanan!`);
          } else {
            throw new Error(json.error || 'Gagal menyimpan berkas');
          }
        } catch (err: any) {
          toast.error(err.message || 'Gagal mengunggah berkas');
        } finally {
          setUploadingState(prev => ({ ...prev, [materialId]: false }));
        }
      };
      reader.onerror = () => {
        toast.error('Gagal membaca berkas dari media penyimpanan');
        setUploadingState(prev => ({ ...prev, [materialId]: false }));
      };
      reader.readAsDataURL(file);
    } catch (e: any) {
      toast.error('Gagal memproses berkas: ' + e.message);
      setUploadingState(prev => ({ ...prev, [materialId]: false }));
    }
  };

  const handleAssignmentSubmit = async (materialId: string) => {
    const finalUrl = assignmentUrls[materialId] || uploadedFiles[materialId]?.url;
    if (!finalUrl || finalUrl.trim() === '') {
      toast.error('Harap unggah berkas dari media penyimpanan atau masukkan link tugas Anda');
      return;
    }
    if (user?.id) {
      try {
        const fileInfo = uploadedFiles[materialId];
        await submitAssignment(
          user.id, 
          materialId, 
          finalUrl.trim(),
          fileInfo?.name,
          fileInfo?.size
        );
        toast.success('Tugas berhasil dikumpulkan ke guru!');
        setShowResubmit(prev => ({ ...prev, [materialId]: false }));
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
                        {mat.hasAssignment ? (() => {
                          const existingSubmission = (assignments || []).find(a => a.studentId === user?.id && a.materialId === mat.id);
                          const isResubmitting = showResubmit[mat.id];
                          const uploadedFile = uploadedFiles[mat.id];
                          const isUploading = uploadingState[mat.id];

                          return (
                            <div className="mt-5 p-4 rounded-xl bg-amber-50/80 border border-amber-200/90 space-y-3.5">
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

                              {/* Tampilan jika siswa sudah pernah mengumpulkan tugas */}
                              {existingSubmission && !isResubmitting ? (
                                <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-950 space-y-2.5">
                                  <div className="flex items-center justify-between gap-2 flex-wrap">
                                    <div className="flex items-center gap-2 font-semibold text-xs text-emerald-800">
                                      <FileCheck className="w-4 h-4 text-emerald-600" />
                                      <span>Tugas Telah Berhasil Dikumpulkan</span>
                                    </div>
                                    <span className="text-[11px] text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded">
                                      {new Date(existingSubmission.submittedAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-2 p-2 bg-white/90 rounded border border-emerald-200/70 text-xs">
                                    <File className="w-4 h-4 text-emerald-600 shrink-0" />
                                    <div className="flex-1 truncate">
                                      <span className="font-medium text-slate-800 truncate block">
                                        {existingSubmission.fileName || existingSubmission.link}
                                      </span>
                                      {existingSubmission.fileSize ? (
                                        <span className="text-[10px] text-slate-500">
                                          {formatFileSize(existingSubmission.fileSize)}
                                        </span>
                                      ) : null}
                                    </div>
                                    <a 
                                      href={existingSubmission.link} 
                                      target="_blank" 
                                      rel="noreferrer"
                                      className="p-1.5 rounded hover:bg-emerald-50 text-emerald-700 flex items-center gap-1 text-[11px] font-medium shrink-0"
                                    >
                                      <Download className="w-3.5 h-3.5" /> Buka / Unduh
                                    </a>
                                  </div>

                                  <div className="flex justify-end pt-1">
                                    <Button 
                                      variant="outline" 
                                      size="sm" 
                                      className="text-xs h-8 gap-1.5 text-slate-700 hover:text-slate-900 border-slate-300"
                                      onClick={() => setShowResubmit(prev => ({ ...prev, [mat.id]: true }))}
                                    >
                                      <RefreshCw className="w-3.5 h-3.5" /> Kirim Ulang / Ganti Berkas Tugas
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                /* Form Pengumpulan Tugas (Upload Berkas dari Media Penyimpanan & Input Link) */
                                <div className="space-y-3 pt-1">
                                  {isResubmitting && (
                                    <div className="flex items-center justify-between text-xs text-amber-800 bg-amber-100/70 px-3 py-1.5 rounded">
                                      <span>Mode pengiriman ulang tugas</span>
                                      <button 
                                        type="button" 
                                        onClick={() => setShowResubmit(prev => ({ ...prev, [mat.id]: false }))} 
                                        className="text-slate-600 hover:text-slate-900 underline"
                                      >
                                        Batal
                                      </button>
                                    </div>
                                  )}

                                  {/* Input Tersembunyi untuk Berkas Media Penyimpanan */}
                                  <input 
                                    type="file" 
                                    ref={el => { fileInputRefs.current[mat.id] = el; }}
                                    className="hidden" 
                                    accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.webp,.zip,.rar,.txt"
                                    onChange={e => handleFileUpload(mat.id, e)}
                                  />

                                  {/* Tombol Utama Unggah Berkas dari Media Penyimpanan */}
                                  <div className="p-3 bg-white rounded-xl border border-dashed-2 border-amber-300 hover:border-amber-400 transition-colors">
                                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                                      <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700 shrink-0">
                                          <FolderOpen className="w-5 h-5" />
                                        </div>
                                        <div>
                                          <div className="text-xs font-bold text-slate-800">
                                            Unggah Berkas dari Media Penyimpanan
                                          </div>
                                          <div className="text-[11px] text-slate-500">
                                            Mendukung dokumen PDF, Word, Excel, PPT, Gambar, atau ZIP (Maks. 25MB)
                                          </div>
                                        </div>
                                      </div>

                                      <Button 
                                        type="button" 
                                        variant="outline" 
                                        disabled={isUploading}
                                        onClick={() => fileInputRefs.current[mat.id]?.click()}
                                        className="w-full sm:w-auto shrink-0 gap-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300 text-xs h-9 px-3.5"
                                      >
                                        {isUploading ? (
                                          <>
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Mengunggah...
                                          </>
                                        ) : (
                                          <>
                                            <UploadCloud className="w-4 h-4 text-amber-600" /> Pilih dari Perangkat
                                          </>
                                        )}
                                      </Button>
                                    </div>

                                    {/* Preview Berkas yang Baru Saja Berhasil Diunggah */}
                                    {uploadedFile && (
                                      <div className="mt-3 p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs text-emerald-900">
                                        <div className="flex items-center gap-2 truncate">
                                          <FileCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                                          <span className="font-semibold truncate">{uploadedFile.name}</span>
                                          <span className="text-[10px] text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                                            {formatFileSize(uploadedFile.size)}
                                          </span>
                                        </div>
                                        <button 
                                          type="button" 
                                          onClick={() => {
                                            setUploadedFiles(prev => {
                                              const updated = { ...prev };
                                              delete updated[mat.id];
                                              return updated;
                                            });
                                            setAssignmentUrls(prev => ({ ...prev, [mat.id]: '' }));
                                          }} 
                                          className="p-1 text-slate-400 hover:text-rose-600 ml-2"
                                          title="Hapus berkas"
                                        >
                                          <X className="w-4 h-4" />
                                        </button>
                                      </div>
                                    )}
                                  </div>

                                  {/* Input Tautan Alternatif (Google Drive / Online Link) */}
                                  <div className="space-y-1">
                                    <label className="text-[11px] font-medium text-slate-600 block">
                                      Atau masukkan tautan tugas secara manual (Google Drive / Docs / OneDrive / Canva):
                                    </label>
                                    <div className="flex flex-col sm:flex-row gap-2">
                                      <Input 
                                        placeholder="https://drive.google.com/... atau tautan berkas tugas Anda" 
                                        value={assignmentUrls[mat.id] || ''}
                                        onChange={e => setAssignmentUrls({...assignmentUrls, [mat.id]: e.target.value})}
                                        className="bg-white text-xs h-10"
                                      />
                                      <Button 
                                        type="button"
                                        disabled={isUploading}
                                        className="shrink-0 gap-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs h-10 px-5 shadow-sm font-semibold" 
                                        onClick={() => handleAssignmentSubmit(mat.id)}
                                      >
                                        <UploadCloud className="w-4 h-4" /> Kumpulkan Tugas
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })() : null}

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
