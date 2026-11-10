import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { 
  BookOpen, 
  CheckSquare, 
  Award, 
  KeyRound, 
  ShieldAlert, 
  ChevronRight, 
  RefreshCw, 
  Sparkles, 
  CheckCircle2, 
  Play, 
  RotateCcw,
  Cpu,
  Terminal,
  Code2,
  Binary,
  Layers,
  Network,
  Database as DbIcon,
  HardDrive
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useDataStore } from '@/store/dataStore';
import { isItemForClass, isResultMatchStudent, isQuizResetForStudent } from '@/lib/utils';
import ChangePasswordModal from '@/components/common/ChangePasswordModal';
import { PWAInstallButton } from '@/components/common/PWAInstallButton';

export default function StudentDashboard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { users, materials, quizzes, quizResults, resetQuizKeys, pullAllFromServer } = useDataStore();
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Resolve current student details from users database
  const currentStudent = users.find(u => 
    (user?.id && u.id === user.id) || 
    (user?.nisn && u.nisn === user.nisn) ||
    (user?.username && u.username === user.username)
  ) || user;

  const studentClass = currentStudent?.classId || (currentStudent as any)?.kelas || (currentStudent as any)?.className || user?.classId || (user as any)?.kelas || '';

  // Synchronize classId in authStore
  useEffect(() => {
    if (currentStudent?.classId && (!user?.classId || user.classId !== currentStudent.classId)) {
      useAuthStore.getState().updateCurrentUser({ classId: currentStudent.classId });
    }
  }, [currentStudent?.classId, user?.classId]);

  // Pull latest data on mount & periodic sync
  useEffect(() => {
    pullAllFromServer().catch(() => {});

    const interval = setInterval(() => {
      pullAllFromServer().catch(() => {});
    }, 10000);

    const handleFocus = () => {
      pullAllFromServer().catch(() => {});
    };
    window.addEventListener('focus', handleFocus);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        pullAllFromServer().catch(() => {});
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await pullAllFromServer();
    } finally {
      setIsRefreshing(false);
    }
  };
  
  const myClassMaterials = materials.filter(m => isItemForClass(m.classId, m.targetClasses, studentClass) || (!studentClass && materials.length > 0));
  const myClassQuizzes = quizzes.filter(q => isItemForClass(q.classId, q.targetClasses, studentClass) || (!studentClass && quizzes.length > 0));
  
  const isResetForMe = (quizId: string) => {
    const hasResult = quizResults.some(r => r.quizId === quizId && isResultMatchStudent(r, currentStudent || user));
    if (hasResult) return false;
    return isQuizResetForStudent(quizId, currentStudent || user, resetQuizKeys);
  };

  const myResults = quizResults.filter(r => 
    isResultMatchStudent(r, currentStudent || user) && !isResetForMe(r.quizId)
  );
  const completedQuizIds = new Set(myResults.map(r => r.quizId));
  const completedCount = myClassQuizzes.filter(q => completedQuizIds.has(q.id)).length;
  const pendingCount = Math.max(0, myClassQuizzes.length - completedCount);
  const resetQuizzesForMe = myClassQuizzes.filter(q => isResetForMe(q.id));

  const avgScore = myResults.length > 0 
    ? (myResults.reduce((acc, curr) => acc + (curr.finalScore !== undefined ? curr.finalScore : curr.score), 0) / myResults.length).toFixed(1) 
    : '0';

  const informaticsStrands = [
    { title: 'Berpikir Komputasional', icon: Binary, desc: 'Dekomposisi, Abstraksi & Pola' },
    { title: 'Algoritma & Pemrograman', icon: Code2, desc: 'Logika Koding & Flowchart' },
    { title: 'Sistem Komputer', icon: Cpu, desc: 'Hardware, OS & Arsitektur' },
    { title: 'Jaringan & Internet', icon: Network, desc: 'Protokol, LAN & Cyber Security' },
    { title: 'Analisis Data', icon: DbIcon, desc: 'Pemodelan & Basis Data' },
    { title: 'Dampak Sosial Informatika', icon: HardDrive, desc: 'Etika Digital, HKI & AI' },
  ];

  return (
    <div className="space-y-6">
      {/* Futuristic Hero Banner - rafx2 LMS Informatics */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#070e1e] via-[#0d1b3e] to-[#0a1835] border border-cyan-500/30 p-6 sm:p-7 shadow-xl shadow-cyan-950/20 text-white">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-400/40 text-cyan-300 text-xs font-mono font-semibold tracking-wider">
                <Cpu className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                <span>rafx2 AI Lab</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-slate-200 text-xs font-medium">
                <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                Mata Pelajaran: Informatika
              </span>
              <span className="px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-200 text-xs font-mono font-bold">
                Kelas {studentClass || user?.classId || '-'}
              </span>
            </div>

            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
                Halo, {currentStudent?.name || user?.name}
                <span className="text-cyan-400">⚡</span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 max-w-xl mt-1 leading-relaxed">
                Selamat datang di laboratorium digital Informatika. Akses modul komputasi, latihan algoritma, dan ujian evaluasi berintegritas tinggi.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-center shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="text-xs gap-1.5 bg-[#091124] border-cyan-500/40 text-cyan-300 hover:bg-cyan-950/60 hover:text-white"
              title="Perbarui data materi dan kuis terbaru dari server"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Memuat...' : 'Sinkronkan'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPasswordModal(true)}
              className="text-xs gap-1.5 bg-[#091124] border-slate-700 text-slate-200 hover:bg-white/10"
            >
              <KeyRound className="w-3.5 h-3.5 text-cyan-400" />
              Ganti Password
            </Button>
          </div>
        </div>

        {/* Core Strands Bar */}
        <div className="mt-6 pt-5 border-t border-cyan-900/60 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
          {informaticsStrands.map((s, idx) => (
            <div key={idx} className="p-2.5 rounded-xl bg-white/5 border border-white/5 hover:border-cyan-500/30 hover:bg-white/10 transition-all">
              <div className="flex items-center gap-1.5 text-cyan-300 font-semibold mb-1">
                <s.icon className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span className="truncate text-[11px]">{s.title}</span>
              </div>
              <p className="text-[10px] text-slate-400 truncate">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Security Alert: Prompt student to change default password */}
      {!user?.password && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-xs sm:text-sm text-amber-200">
                Penting: Akun Anda masih menggunakan Kata Sandi Bawaan (NISN)
              </div>
              <p className="text-[11px] sm:text-xs text-amber-300/80 mt-0.5">
                Agar data jawaban dan akun aman, segera ubah sandi menjadi kata sandi pribadi Anda.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => setShowPasswordModal(true)}
            className="shrink-0 bg-amber-600 hover:bg-amber-500 text-white text-xs gap-1.5 font-semibold"
          >
            <KeyRound className="w-3.5 h-3.5" />
            Ubah Kata Sandi
          </Button>
        </div>
      )}
      
      {/* Alert: Ujian Di-reset oleh Guru */}
      {resetQuizzesForMe.length > 0 && (
        <div className="p-4 rounded-xl bg-cyan-950/60 border border-cyan-500/50 text-cyan-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg shadow-cyan-950/30 animate-in fade-in">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-400/40 shrink-0">
              <RotateCcw className="w-5 h-5 animate-spin" style={{ animationDuration: '4s' }} />
            </div>
            <div>
              <div className="font-bold text-xs sm:text-sm text-cyan-200 flex items-center gap-2">
                <span>Pemberitahuan Ujian: Kuis Di-reset Guru Informatika!</span>
                <span className="bg-cyan-500/20 text-cyan-300 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border border-cyan-500/30">
                  Siap Dikerjakan
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-300 mt-0.5 leading-relaxed">
                Guru telah mengizinkan Anda untuk mengerjakan kembali kuis <strong>"{resetQuizzesForMe[0].title}"</strong>.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => {
              const uids = [user?.id, user?.nisn, 'guest'].filter(Boolean) as string[];
              for (const u of uids) {
                localStorage.removeItem(`cbt_finished_${u}_${resetQuizzesForMe[0].id}`);
                localStorage.removeItem(`cbt_result_${u}_${resetQuizzesForMe[0].id}`);
              }
              navigate(`/student/quizzes/${resetQuizzesForMe[0].id}`);
            }}
            className="shrink-0 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold gap-1.5 shadow-md shadow-cyan-600/30"
          >
            <Play className="w-3.5 h-3.5" /> Kerjakan Kuis Sekarang →
          </Button>
        </div>
      )}

      {/* Install Mobile App on Android & iPhone Banner */}
      <PWAInstallButton variant="banner" className="shadow-xs" />
      
      {/* 3 Main Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { 
            title: 'Materi Informatika', 
            value: myClassMaterials.length.toString(), 
            subText: `${myClassMaterials.length} modul komputasi siap dipelajari`,
            icon: BookOpen, 
            color: 'text-cyan-400', 
            bg: 'bg-cyan-500/10 border border-cyan-500/20', 
            link: '/student/materials' 
          },
          { 
            title: 'Kuis & CBT AI', 
            value: `${completedCount}/${myClassQuizzes.length}`, 
            subText: pendingCount > 0 ? `${pendingCount} kuis siap dikerjakan` : 'Semua kuis telah tuntas',
            icon: CheckSquare, 
            color: 'text-indigo-400', 
            bg: 'bg-indigo-500/10 border border-indigo-500/20', 
            link: '/student/quizzes' 
          },
          { 
            title: 'Indeks Nilai Rata-rata', 
            value: avgScore, 
            subText: myResults.length > 0 ? `Dari ${myResults.length} evaluasi selesai` : 'Belum ada ujian diselesaikan',
            icon: Award, 
            color: 'text-emerald-400', 
            bg: 'bg-emerald-500/10 border border-emerald-500/20', 
            link: '/student/grades' 
          },
        ].map((stat, i) => (
          <div 
            key={i} 
            onClick={() => navigate(stat.link)}
            className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-sm hover:border-cyan-400 hover:shadow-md transition-all cursor-pointer group flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.bg} ${stat.color} group-hover:scale-105 transition-transform`}>
                <stat.icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{stat.title}</p>
                <p className="text-2xl font-bold text-slate-900 mt-0.5">{stat.value}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">{stat.subText}</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-cyan-600 group-hover:translate-x-1 transition-all" />
          </div>
        ))}
      </div>

      {/* Materials & Quizzes List Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Modul Pembelajaran */}
        <div className="bg-white border border-slate-200/90 rounded-2xl shadow-sm flex flex-col justify-between overflow-hidden">
          <div>
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-cyan-50 text-cyan-600">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Modul Pembelajaran Informatika</h2>
                  <p className="text-[11px] text-slate-500">Bahan ajar kelas {studentClass || user?.classId || ''}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/student/materials')}
                className="text-xs text-cyan-700 hover:text-cyan-800 hover:bg-cyan-50 gap-1 font-semibold"
              >
                Lihat Semua <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>

            <div className="p-5 space-y-3">
              {myClassMaterials.slice(-4).reverse().map((item) => (
                <div 
                  key={item.id} 
                  onClick={() => navigate('/student/materials')}
                  className="flex items-center gap-3.5 p-3.5 border border-slate-150 rounded-xl hover:border-cyan-300 hover:bg-cyan-50/30 transition-all cursor-pointer group"
                >
                  <div className="w-10 h-10 rounded-xl bg-cyan-50 text-cyan-700 flex items-center justify-center shrink-0 group-hover:bg-cyan-600 group-hover:text-white transition-colors">
                    <Code2 className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 truncate group-hover:text-cyan-700 transition-colors text-sm">{item.title}</p>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                      <span className="font-medium text-cyan-700">Informatika</span>
                      <span>•</span>
                      <span>{item.chapter || `Semester ${item.semester}`}</span>
                      {item.type && (
                        <>
                          <span>•</span>
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 text-[10px] uppercase font-bold text-slate-600">{item.type}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-cyan-600 group-hover:translate-x-0.5 transition-all shrink-0" />
                </div>
              ))}
              {myClassMaterials.length === 0 && (
                <div className="text-center py-8 space-y-2 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <p className="text-sm font-semibold text-slate-700">Belum ada materi untuk kelas {studentClass || user?.classId || 'Anda'}</p>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto">
                    Materi Informatika yang ditugaskan guru akan otomatis tampil di sini.
                  </p>
                </div>
              )}
            </div>
          </div>

          {myClassMaterials.length > 0 && (
            <div className="p-4 pt-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/student/materials')}
                className="w-full text-xs text-cyan-700 border-cyan-200 hover:bg-cyan-50 font-semibold"
              >
                Buka Seluruh {myClassMaterials.length} Modul Informatika →
              </Button>
            </div>
          )}
        </div>

        {/* Kuis & Ujian CBT Informatika */}
        <div className="bg-white border border-slate-200/90 rounded-2xl shadow-sm flex flex-col justify-between overflow-hidden">
          <div>
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                  <CheckSquare className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Ujian &amp; CBT Informatika</h2>
                  <p className="text-[11px] text-slate-500">Evaluasi berbasis CBT anti-cheat</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/student/quizzes')}
                className="text-xs text-indigo-700 hover:text-indigo-800 hover:bg-indigo-50 gap-1 font-semibold"
              >
                Lihat Kuis <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>

            <div className="p-5 space-y-3">
              {myClassQuizzes.slice(-4).reverse().map((item) => {
                const isResetQuiz = isResetForMe(item.id);
                const result = isResetQuiz ? null : quizResults.find(r => r.quizId === item.id && isResultMatchStudent(r, currentStudent || user));
                const isCompleted = !!result;
                const isResetForStudent = isResetQuiz;

                return (
                  <div 
                    key={item.id} 
                    onClick={() => {
                      if (isResetForStudent) {
                        const uids = [user?.id, user?.nisn, currentStudent?.id, currentStudent?.nisn, 'guest'].filter(Boolean) as string[];
                        for (const u of uids) {
                          localStorage.removeItem(`cbt_finished_${u}_${item.id}`);
                          localStorage.removeItem(`cbt_result_${u}_${item.id}`);
                        }
                      }
                      navigate(`/student/quizzes/${item.id}`);
                    }}
                    className={`flex items-center gap-3.5 p-3.5 border rounded-xl transition-all cursor-pointer group ${
                      isCompleted 
                        ? 'border-emerald-200 bg-emerald-50/20 hover:border-emerald-300' 
                        : isResetForStudent
                          ? 'border-amber-300 bg-amber-50/40 hover:border-amber-400'
                          : 'border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                      isCompleted 
                        ? 'bg-emerald-100 text-emerald-700' 
                        : isResetForStudent
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white'
                    }`}>
                      {isCompleted ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : isResetForStudent ? (
                        <RotateCcw className="w-4 h-4 animate-spin" style={{ animationDuration: '6s' }} />
                      ) : (
                        <Play className="w-4 h-4 ml-0.5" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-slate-900 truncate group-hover:text-indigo-700 transition-colors text-sm">
                          {item.title}
                        </p>
                        {isCompleted ? (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/90 border border-emerald-200 px-2 py-0.5 rounded-full shrink-0">
                            Nilai: {result.disqualified ? '0 (Diskualifikasi)' : (result.finalScore ?? result.score)}
                          </span>
                        ) : isResetForStudent ? (
                          <span className="text-[10px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full shrink-0 flex items-center gap-1">
                            <RotateCcw className="w-2.5 h-2.5" /> Di-reset Guru
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-cyan-700 bg-cyan-50 border border-cyan-200 px-2 py-0.5 rounded-full shrink-0">
                            Tersedia
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                        <span className="font-medium text-indigo-600">Informatika</span>
                        <span>•</span>
                        <span>{item.durationMinutes} Menit</span>
                        <span>•</span>
                        <span>{item.questions?.length || 0} Soal</span>
                        <span>•</span>
                        <span className={
                          isCompleted 
                            ? 'text-emerald-600 font-semibold' 
                            : isResetForStudent 
                              ? 'text-amber-700 font-bold' 
                              : 'text-amber-600 font-semibold'
                        }>
                          {isCompleted ? 'Selesai' : isResetForStudent ? 'Boleh Mengulang' : 'Siap Dikerjakan'}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all shrink-0" />
                  </div>
                );
              })}
              {myClassQuizzes.length === 0 && (
                <div className="text-center py-8 space-y-2 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                    <CheckSquare className="w-5 h-5" />
                  </div>
                  <p className="text-sm font-semibold text-slate-700">Belum ada ujian aktif untuk kelas {studentClass || user?.classId || 'Anda'}</p>
                </div>
              )}
            </div>
          </div>

          {myClassQuizzes.length > 0 && (
            <div className="p-4 pt-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/student/quizzes')}
                className="w-full text-xs text-indigo-700 border-indigo-200 hover:bg-indigo-50 font-semibold"
              >
                Buka Portal Kuis &amp; CBT Informatika →
              </Button>
            </div>
          )}
        </div>
      </div>

      {showPasswordModal && (
        <ChangePasswordModal
          isOpen={showPasswordModal}
          onClose={() => setShowPasswordModal(false)}
        />
      )}
    </div>
  );
}
