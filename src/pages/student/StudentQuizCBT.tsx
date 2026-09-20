import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  ChevronRight, 
  ChevronLeft, 
  ShieldAlert, 
  Camera, 
  Monitor, 
  Maximize, 
  Lock,
  Eye,
  AlertCircle,
  FileText
} from 'lucide-react';
import { toast } from '@/components/ui/Toast';
import { motion, AnimatePresence } from 'motion/react';
import { useDataStore } from '@/store/dataStore';
import { useAuthStore } from '@/store/authStore';
import { ViolationLog, QuizResult } from '@/types';
import ExamRulesModal from '@/components/student/ExamRulesModal';

// Fallback Mock Quiz if quiz not found in store
const DEFAULT_QUIZ = {
  id: 'q-1',
  materialId: 'm-1',
  classId: '7A',
  subjectId: 'Matematika',
  title: 'Ulangan Harian: Aljabar Dasar & Persamaan Linear',
  durationMinutes: 45,
  createdAt: new Date().toISOString(),
  questions: [
    { 
      id: 'q1', 
      text: 'Berapakah nilai x dari persamaan 2x + 5 = 15?', 
      options: ['x = 5', 'x = 10', 'x = 15', 'x = 20'],
      correctOptionIndex: 0,
      points: 25
    },
    { 
      id: 'q2', 
      text: 'Jika y = 3x - 4 dan x = 2, berapakah nilai y?', 
      options: ['y = 2', 'y = -2', 'y = 1', 'y = -1'],
      correctOptionIndex: 0,
      points: 25
    },
    { 
      id: 'q3', 
      text: 'Bentuk sederhana dari 3(x + 2) - 2x adalah...', 
      options: ['x + 6', '5x + 6', 'x + 2', '5x + 2'],
      correctOptionIndex: 0,
      points: 25
    },
    { 
      id: 'q4', 
      text: 'Nilai dari -5 + 12 - (-3) adalah...', 
      options: ['10', '4', '14', '7'],
      correctOptionIndex: 0,
      points: 25
    }
  ]
};

export default function StudentQuizCBT() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { quizzes, submitQuiz } = useDataStore();

  const activeQuiz = quizzes.find(q => q.id === id) || DEFAULT_QUIZ;

  // Pre-exam setup state
  const [hasStarted, setHasStarted] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [screenPermission, setScreenPermission] = useState<'pending' | 'granted' | 'fallback'>('pending');
  const [cameraPermission, setCameraPermission] = useState<'pending' | 'granted' | 'unavailable'>('pending');
  const [isInitializingStreams, setIsInitializingStreams] = useState(false);

  // In-exam state
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [timeLeft, setTimeLeft] = useState(activeQuiz.durationMinutes * 60);
  const [isFinished, setIsFinished] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Anti-Cheat Proctoring state
  const [violationLogs, setViolationLogs] = useState<ViolationLog[]>([]);
  const [showViolationModal, setShowViolationModal] = useState(false);
  const [latestViolation, setLatestViolation] = useState<ViolationLog | null>(null);

  // Media Stream references
  const screenStreamRef = useRef<MediaStream | null>(null);
  const webcamStreamRef = useRef<MediaStream | null>(null);
  const screenVideoRef = useRef<HTMLVideoElement | null>(null);
  const webcamVideoRef = useRef<HTMLVideoElement | null>(null);
  
  // Tracking away time
  const awayStartRef = useRef<number | null>(null);
  const isTerminatedRef = useRef<boolean>(false);

  // Cleanup media streams on unmount
  useEffect(() => {
    return () => {
      stopAllMediaStreams();
    };
  }, []);

  const stopAllMediaStreams = () => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(t => t.stop());
      screenStreamRef.current = null;
    }
    if (webcamStreamRef.current) {
      webcamStreamRef.current.getTracks().forEach(t => t.stop());
      webcamStreamRef.current = null;
    }
  };

  // Capture Screenshot & Webcam Snapshot
  const captureViolationSnapshot = (
    type: ViolationLog['type'], 
    description: string,
    durationSeconds: number = 0
  ): ViolationLog => {
    let snapshotImage: string | undefined = undefined;
    let webcamImage: string | undefined = undefined;

    // 1. Capture screen from video element if active
    if (screenVideoRef.current && screenVideoRef.current.videoWidth > 0) {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 640;
        canvas.height = 360;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(screenVideoRef.current, 0, 0, canvas.width, canvas.height);
          // Forensic Watermark
          ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
          ctx.fillRect(0, canvas.height - 32, canvas.width, 32);
          ctx.fillStyle = '#ff4d4f';
          ctx.font = 'bold 12px sans-serif';
          ctx.fillText(`🚨 BUKTI KECURANGAN: ${description.toUpperCase()}`, 12, canvas.height - 18);
          ctx.fillStyle = '#ffffff';
          ctx.font = '10px sans-serif';
          ctx.fillText(`${new Date().toLocaleString('id-ID')} | Siswa: ${user?.name || 'Siswa'}`, 12, canvas.height - 6);
          snapshotImage = canvas.toDataURL('image/jpeg', 0.65);
        }
      } catch (err) {
        console.warn('Screen snapshot capture note:', err);
      }
    }

    // Fallback forensic card snapshot if screen capture is restricted
    if (!snapshotImage) {
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 360;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Warning Header
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(0, 0, canvas.width, 50);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 18px sans-serif';
        ctx.fillText('BUKTI FORENSIK: TERDETEKSI KELUAR DARI JENDELA UJIAN', 20, 32);

        // Details
        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 14px sans-serif';
        ctx.fillText(`Kejadian: ${description}`, 24, 90);
        ctx.font = '13px sans-serif';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText(`Waktu Deteksi: ${new Date().toLocaleString('id-ID')}`, 24, 125);
        ctx.fillText(`Lama Waktu Meninggalkan: ${durationSeconds > 0 ? `${durationSeconds} Detik` : 'Seketika'}`, 24, 155);
        ctx.fillText(`Soal Aktif Saat Kejadian: Nomor ${currentIdx + 1}`, 24, 185);
        ctx.fillText(`Identitas Siswa: ${user?.name || 'Siswa'} (NISN: ${user?.nisn || '-'})`, 24, 215);

        // Footer Alert Box
        ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
        ctx.fillRect(20, 245, canvas.width - 40, 80);
        ctx.strokeStyle = '#ef4444';
        ctx.strokeRect(20, 245, canvas.width - 40, 80);
        ctx.fillStyle = '#fca5a5';
        ctx.font = 'bold 12px sans-serif';
        ctx.fillText('⚠️ PERINGATAN INTEGRITAS SMART LMS CBT', 36, 275);
        ctx.font = '11px sans-serif';
        ctx.fillStyle = '#e2e8f0';
        ctx.fillText('Peristiwa ini telah direkam oleh sistem pengawas otomatis untuk ditindaklanjuti oleh guru.', 36, 300);

        snapshotImage = canvas.toDataURL('image/jpeg', 0.7);
      }
    }

    // 2. Capture webcam photo if active
    if (webcamVideoRef.current && webcamVideoRef.current.videoWidth > 0) {
      try {
        const camCanvas = document.createElement('canvas');
        camCanvas.width = 360;
        camCanvas.height = 270;
        const camCtx = camCanvas.getContext('2d');
        if (camCtx) {
          camCtx.drawImage(webcamVideoRef.current, 0, 0, camCanvas.width, camCanvas.height);
          // Cam watermark
          camCtx.fillStyle = 'rgba(0, 0, 0, 0.7)';
          camCtx.fillRect(0, camCanvas.height - 24, camCanvas.width, 24);
          camCtx.fillStyle = '#ff4d4f';
          camCtx.font = 'bold 10px sans-serif';
          camCtx.fillText(`CAM DETEKSI: ${new Date().toLocaleTimeString('id-ID')}`, 8, camCanvas.height - 8);
          webcamImage = camCanvas.toDataURL('image/jpeg', 0.65);
        }
      } catch (err) {
        console.warn('Webcam snapshot note:', err);
      }
    }

    const log: ViolationLog = {
      id: `v-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp: new Date().toISOString(),
      type,
      description,
      durationSeconds,
      questionIndex: currentIdx,
      snapshotImage,
      webcamImage
    };

    return log;
  };

  // Start CBT & Proctoring initialization
  const handleStartExam = async () => {
    setIsInitializingStreams(true);

    try {
      // 1. Enter Fullscreen
      if (!document.fullscreenElement) {
        try {
          await document.documentElement.requestFullscreen();
          setIsFullscreen(true);
        } catch (e) {
          console.warn('Fullscreen request bypassed:', e);
        }
      }

      // 2. Request Camera (Optional but highly recommended)
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          const camStream = await navigator.mediaDevices.getUserMedia({ 
            video: { width: { ideal: 640 }, height: { ideal: 360 } }, 
            audio: false 
          });
          webcamStreamRef.current = camStream;
          if (webcamVideoRef.current) {
            webcamVideoRef.current.srcObject = camStream;
            webcamVideoRef.current.play().catch(() => {});
          }
          setCameraPermission('granted');
        }
      } catch (camErr) {
        console.warn('Webcam permission not granted or unavailable:', camErr);
        setCameraPermission('unavailable');
      }

      // 3. Request Screen Sharing (for capturing the student's screen on tab switch)
      try {
        if (navigator.mediaDevices && (navigator.mediaDevices as any).getDisplayMedia) {
          const screenStream = await (navigator.mediaDevices as any).getDisplayMedia({
            video: { cursor: 'always' },
            audio: false
          });
          screenStreamRef.current = screenStream;
          if (screenVideoRef.current) {
            screenVideoRef.current.srcObject = screenStream;
            screenVideoRef.current.play().catch(() => {});
          }
          setScreenPermission('granted');

          // If user stops sharing screen externally
          screenStream.getVideoTracks()[0].onended = () => {
            recordViolation('FULLSCREEN_EXIT', 'Siswa menghentikan izin perekaman layar pengawas');
          };
        } else {
          setScreenPermission('fallback');
        }
      } catch (screenErr) {
        console.warn('Screen share permission skipped, using simulated forensic audit mode:', screenErr);
        setScreenPermission('fallback');
      }

      setHasStarted(true);
      toast.success('Mode Ujian CBT & Pengawas Anti-Kecurangan telah aktif!');
    } catch (err: any) {
      toast.error('Gagal memulai mode pengawas: ' + err.message);
    } finally {
      setIsInitializingStreams(false);
    }
  };

  const recordViolation = (type: ViolationLog['type'], description: string, durationSeconds: number = 0) => {
    if (isFinished || isTerminatedRef.current) return;

    const log = captureViolationSnapshot(type, description, durationSeconds);
    
    setViolationLogs(prev => {
      const updated = [...prev, log];
      const count = updated.length;

      setLatestViolation(log);
      setShowViolationModal(true);

      if (count >= 3) {
        isTerminatedRef.current = true;
        handleFinish(updated, true);
        toast.error('UJIAN DIHENTIKAN OTOMATIS! Anda telah melanggar aturan integritas lebih dari 3 kali.');
      } else {
        toast.error(`Peringatan Kecurangan (${count}/3)! Bukti pelanggaran telah direkam.`);
      }

      return updated;
    });
  };

  // Anti-Cheat Listeners
  useEffect(() => {
    if (!hasStarted || isFinished) return;

    // 1. Visibility Change (Tab Switch / Minimize)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        awayStartRef.current = Date.now();
      } else {
        if (awayStartRef.current) {
          const duration = Math.max(1, Math.round((Date.now() - awayStartRef.current) / 1000));
          awayStartRef.current = null;
          recordViolation('TAB_SWITCH', `Siswa berpindah tab atau meminimalkan browser selama ${duration} detik`, duration);
        } else {
          recordViolation('TAB_SWITCH', 'Siswa beralih dari halaman ujian');
        }
      }
    };

    // 2. Window Blur (Opening other apps like WhatsApp, Calculator, Split screen)
    const handleWindowBlur = () => {
      if (!awayStartRef.current) {
        awayStartRef.current = Date.now();
      }
    };

    const handleWindowFocus = () => {
      if (awayStartRef.current) {
        const duration = Math.max(1, Math.round((Date.now() - awayStartRef.current) / 1000));
        awayStartRef.current = null;
        recordViolation('WINDOW_BLUR', `Siswa membuka aplikasi lain / kehilangan fokus layar selama ${duration} detik`, duration);
      }
    };

    // 3. Fullscreen Change
    const handleFullscreenChange = () => {
      const isStillFullscreen = !!document.fullscreenElement;
      setIsFullscreen(isStillFullscreen);
      if (!isStillFullscreen) {
        recordViolation('FULLSCREEN_EXIT', 'Siswa keluar dari Mode Layar Penuh (Fullscreen)');
      }
    };

    // 4. Context Menu (Right Click)
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      recordViolation('RIGHT_CLICK', 'Siswa mencoba membuka klik kanan (Menu Konteks)');
    };

    // 5. Copy & Paste
    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      recordViolation('COPY_PASTE', 'Siswa berupaya menyalin (copy) teks soal');
    };

    const handlePaste = (e: ClipboardEvent) => {
      e.preventDefault();
      recordViolation('COPY_PASTE', 'Siswa berupaya menempelkan (paste) teks jawaban dari luar');
    };

    // 6. Keyboard shortcuts (F12, Esc, Alt+Tab warning)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && e.key === 'I')) {
        e.preventDefault();
        recordViolation('RIGHT_CLICK', 'Siswa berupaya membuka Developer Tools / Inspect Element');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('copy', handleCopy);
    document.addEventListener('cut', handleCopy);
    document.addEventListener('paste', handlePaste);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focus', handleWindowFocus);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('cut', handleCopy);
      document.removeEventListener('paste', handlePaste);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [hasStarted, isFinished, currentIdx]);

  // Exam Countdown Timer
  useEffect(() => {
    if (!hasStarted || isFinished) return;
    if (timeLeft <= 0) {
      handleFinish(violationLogs, false);
      toast.info('Waktu ujian telah berakhir.');
      return;
    }
    const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft, hasStarted, isFinished, violationLogs]);

  // Finish exam & submit results
  const handleFinish = async (currentViolations = violationLogs, isDisqualified = false) => {
    if (isFinished) return;
    setIsFinished(true);
    setIsSubmitting(true);
    stopAllMediaStreams();

    // Exit fullscreen if still active
    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen();
      } catch (e) {}
    }

    // Calculate score
    const questions = activeQuiz.questions || [];
    let earnedPoints = 0;
    let totalPoints = 0;

    questions.forEach(q => {
      const qPoints = q.points || 10;
      totalPoints += qPoints;
      if (answers[q.id] === q.correctOptionIndex) {
        earnedPoints += qPoints;
      }
    });

    const calculatedScore = totalPoints > 0 
      ? Math.round((earnedPoints / totalPoints) * 100) 
      : 0;

    const finalResult: QuizResult = {
      id: `qr-${Date.now()}`,
      quizId: activeQuiz.id,
      studentId: user?.id || 'student-1',
      score: calculatedScore,
      finalScore: isDisqualified ? 0 : calculatedScore,
      answers: answers,
      submittedAt: new Date().toISOString(),
      violationsCount: currentViolations.length,
      violationLogs: currentViolations,
      disqualified: isDisqualified,
      teacherNote: isDisqualified 
        ? `Ujian dihentikan otomatis oleh sistem karena mencapai ${currentViolations.length} kali pelanggaran integritas.` 
        : ''
    };

    try {
      await submitQuiz(finalResult);
      toast.success('Jawaban & Laporan Integritas berhasil disimpan');
    } catch (e: any) {
      console.error('Submit error', e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Hidden video elements for stream capture
  const hiddenStreamsMarkup = (
    <div className="hidden" aria-hidden="true">
      <video ref={screenVideoRef} autoPlay playsInline muted />
      <video ref={webcamVideoRef} autoPlay playsInline muted />
    </div>
  );

  // 1. PRE-EXAM INTEGRITY CHECK SCREEN
  if (!hasStarted) {
    return (
      <div className="max-w-2xl mx-auto py-8 px-4">
        {hiddenStreamsMarkup}
        <Card className="border-indigo-100 shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-700 via-indigo-800 to-slate-900 text-white p-6 text-center">
            <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-3 backdrop-blur-sm border border-white/20">
              <ShieldAlert className="w-8 h-8 text-indigo-200" />
            </div>
            <h1 className="text-2xl font-bold">{activeQuiz.title}</h1>
            <p className="text-xs text-indigo-200 mt-1">
              Sistem CBT Terproteksi & Pengawasan Integritas Berbasis Tangkapan Layar
            </p>
          </div>

          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
                <span className="text-xs text-slate-500 block">Durasi Ujian</span>
                <span className="text-lg font-bold text-slate-800">{activeQuiz.durationMinutes} Menit</span>
              </div>
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
                <span className="text-xs text-slate-500 block">Jumlah Soal</span>
                <span className="text-lg font-bold text-slate-800">{activeQuiz.questions.length} Butir</span>
              </div>
            </div>

            {/* Anti-Cheat Rules Box */}
            <div className="bg-rose-50/70 border border-rose-200 rounded-xl p-4 space-y-3">
              <h3 className="text-sm font-bold text-rose-900 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                Ketentuan Integritas & Anti-Kecurangan Ujian:
              </h3>
              <ul className="text-xs text-rose-800 space-y-2 list-disc pl-5">
                <li>
                  <strong>Tangkapan Layar Otomatis:</strong> Sistem secara otomatis menjepret bukti tangkapan layar saat Anda berpindah tab, meminimalkan jendela, atau membuka aplikasi lain.
                </li>
                <li>
                  <strong>Kamera Pengawas:</strong> Foto wajah dan durasi Anda meninggalkan lembar ujian dicatat ke dalam Berita Acara Guru.
                </li>
                <li>
                  <strong>Mode Layar Penuh Wajib:</strong> Ujian harus dikerjakan dalam mode Fullscreen. Menekan tombol keluar akan dianggap pelanggaran.
                </li>
                <li>
                  <strong>Batas Maksimal 3 Pelanggaran:</strong> Jika mencapai 3 kali peringatan, ujian akan dihentikan seketika dan Anda dapat <strong>didiskualifikasi</strong>.
                </li>
              </ul>
            </div>

            {/* Proctoring Check List */}
            <div className="space-y-2 border border-slate-200 rounded-xl p-4 bg-slate-50/50">
              <div className="text-xs font-semibold text-slate-700 mb-2">Pemeriksaan Kesiapan Perangkat:</div>
              <div className="flex items-center justify-between text-xs py-1">
                <span className="flex items-center gap-2 text-slate-600">
                  <Maximize className="w-4 h-4 text-indigo-600" /> Mode Layar Penuh (Fullscreen)
                </span>
                <span className="text-emerald-600 font-medium">Otomatis Aktif</span>
              </div>
              <div className="flex items-center justify-between text-xs py-1">
                <span className="flex items-center gap-2 text-slate-600">
                  <Monitor className="w-4 h-4 text-indigo-600" /> Perekam Bukti Layar (Screen Capture)
                </span>
                <span className="text-indigo-600 font-medium">Meminta Izin Browser</span>
              </div>
              <div className="flex items-center justify-between text-xs py-1">
                <span className="flex items-center gap-2 text-slate-600">
                  <Camera className="w-4 h-4 text-indigo-600" /> Kamera Pengawas Wajah (Webcam)
                </span>
                <span className="text-indigo-600 font-medium">Meminta Izin Browser</span>
              </div>
            </div>

            <Button 
              onClick={() => setShowRulesModal(true)} 
              isLoading={isInitializingStreams}
              className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold gap-2 text-sm shadow-md rounded-xl transition-all"
            >
              <FileText className="w-4 h-4" /> Buka Tata Tertib & Mulai Ujian
            </Button>
          </CardContent>
        </Card>

        {/* Modal Tata Tertib Ujian Resmi */}
        <ExamRulesModal
          isOpen={showRulesModal}
          onClose={() => setShowRulesModal(false)}
          isLoading={isInitializingStreams}
          onAgreeAndStart={async () => {
            setShowRulesModal(false);
            await handleStartExam();
          }}
          quiz={activeQuiz}
          student={user}
        />
      </div>
    );
  }

  // 2. EXAM COMPLETED / TERMINATED SCREEN
  if (isFinished) {
    const questions = activeQuiz.questions || [];
    const answeredCount = Object.keys(answers).length;
    let earnedPoints = 0;
    let totalPoints = 0;

    questions.forEach(q => {
      const qPoints = q.points || 10;
      totalPoints += qPoints;
      if (answers[q.id] === q.correctOptionIndex) {
        earnedPoints += qPoints;
      }
    });

    const score = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
    const isDisqualified = violationLogs.length >= 3;

    return (
      <div className="max-w-2xl mx-auto py-10 px-4">
        {hiddenStreamsMarkup}
        <Card className="text-center p-8 shadow-xl border-slate-200">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${
            isDisqualified ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'
          }`}>
            {isDisqualified ? <AlertTriangle className="w-10 h-10" /> : <CheckCircle2 className="w-10 h-10" />}
          </div>

          <h2 className="text-2xl font-bold text-slate-900 mb-1">
            {isDisqualified ? 'Ujian Dihentikan: Melampaui Batas Pelanggaran' : 'Ujian Selesai!'}
          </h2>
          <p className="text-sm text-slate-600 mb-6">
            {isDisqualified 
              ? 'Sistem mendeteksi aktivitas mencurigakan yang melampaui toleransi integritas CBT.' 
              : 'Seluruh jawaban dan rekaman pengawasan telah berhasil disimpan.'}
          </p>

          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 mb-6 grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-slate-500 mb-1 font-medium">Nilai</p>
              <p className={`text-2xl font-bold ${isDisqualified ? 'text-rose-600' : 'text-indigo-600'}`}>
                {isDisqualified ? '0 (Diskualifikasi)' : score}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1 font-medium">Terjawab</p>
              <p className="text-2xl font-bold text-slate-800">
                {answeredCount}/{questions.length}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1 font-medium">Pelanggaran</p>
              <p className={`text-2xl font-bold ${violationLogs.length > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                {violationLogs.length} Kali
              </p>
            </div>
          </div>

          {violationLogs.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-left mb-6 text-xs text-amber-900 space-y-1">
              <span className="font-bold block flex items-center gap-1">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                Catatan Berita Acara Guru:
              </span>
              <p>
                Terdapat {violationLogs.length} catatan bukti tangkapan layar yang telah dilaporkan langsung kepada Guru Pengawas untuk peninjauan sanksi nilai.
              </p>
            </div>
          )}

          <Button onClick={() => navigate('/student/quizzes')} className="w-full">
            Kembali ke Daftar Kuis
          </Button>
        </Card>
      </div>
    );
  }

  const currentQ = activeQuiz.questions[currentIdx] || activeQuiz.questions[0];

  // 3. ACTIVE CBT EXAM INTERFACE
  return (
    <div className="max-w-4xl mx-auto flex flex-col md:flex-row gap-6 items-start py-4 px-4 select-none">
      {hiddenStreamsMarkup}

      {/* Main Question Area */}
      <div className="flex-1 w-full space-y-4">
        {/* Top Header Bar */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between sticky top-16 z-20 md:static">
          <div className="flex items-center gap-2 truncate pr-4">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <h1 className="font-bold text-slate-800 truncate text-sm sm:text-base">{activeQuiz.title}</h1>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {violationLogs.length > 0 && (
              <span className="text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-lg flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                {violationLogs.length}/3 Pelanggaran
              </span>
            )}

            <div className="flex items-center gap-1.5 bg-rose-50 text-rose-700 px-3 py-1.5 rounded-lg font-mono font-bold text-sm">
              <Clock className="w-4 h-4" />
              {formatTime(timeLeft)}
            </div>
          </div>
        </div>

        {/* Fullscreen restore prompt if lost */}
        {!isFullscreen && (
          <div className="bg-amber-500 text-white p-3 rounded-xl flex items-center justify-between text-xs font-bold shadow-md animate-bounce">
            <span className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              PERINGATAN: Anda sedang berada di luar Mode Layar Penuh!
            </span>
            <button
              onClick={() => {
                if (!document.fullscreenElement) {
                  document.documentElement.requestFullscreen().catch(() => {});
                  setIsFullscreen(true);
                }
              }}
              className="bg-white text-amber-900 px-3 py-1 rounded-lg hover:bg-amber-50"
            >
              Kembali ke Layar Penuh
            </button>
          </div>
        )}

        {/* Question Card */}
        <Card className="min-h-[420px] shadow-sm">
          <CardContent className="p-6 md:p-8">
            <div className="mb-6 flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-lg">
                Soal Nomor {currentIdx + 1} dari {activeQuiz.questions.length}
              </span>
              <span className="text-xs text-slate-400 font-medium">
                Poin: {currentQ?.points || 10}
              </span>
            </div>

            <p className="text-base sm:text-lg text-slate-800 font-medium mb-8 leading-relaxed">
              {currentQ?.text}
            </p>

            <div className="space-y-3">
              {currentQ?.options?.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => setAnswers({ ...answers, [currentQ.id]: i })}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-center gap-3.5 ${
                    answers[currentQ.id] === i
                      ? 'border-indigo-600 bg-indigo-50/60 text-indigo-950 font-medium shadow-sm'
                      : 'border-slate-200 hover:border-indigo-200 hover:bg-slate-50/70 text-slate-700'
                  }`}
                >
                  <div className={`w-7 h-7 rounded-lg border flex items-center justify-center text-xs font-bold shrink-0 ${
                    answers[currentQ.id] === i 
                      ? 'border-indigo-600 bg-indigo-600 text-white' 
                      : 'border-slate-300 bg-white text-slate-600'
                  }`}>
                    {String.fromCharCode(65 + i)}
                  </div>
                  <span className="text-sm leading-relaxed">{opt}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Bottom Navigation Buttons */}
        <div className="flex items-center justify-between pt-2">
          <Button
            variant="outline"
            onClick={() => setCurrentIdx(prev => Math.max(0, prev - 1))}
            disabled={currentIdx === 0}
            className="gap-2 text-xs"
          >
            <ChevronLeft className="w-4 h-4" /> Soal Sebelumnya
          </Button>

          {currentIdx === activeQuiz.questions.length - 1 ? (
            <Button
              onClick={() => {
                if (window.confirm('Apakah Anda yakin ingin menyelesaikan ujian dan mengirim seluruh jawaban?')) {
                  handleFinish(violationLogs, false);
                }
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 text-xs font-bold"
            >
              <CheckCircle2 className="w-4 h-4" /> Selesai & Kirim Ujian
            </Button>
          ) : (
            <Button
              onClick={() => setCurrentIdx(prev => Math.min(activeQuiz.questions.length - 1, prev + 1))}
              className="gap-2 text-xs"
            >
              Soal Selanjutnya <ChevronRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Navigation Panel */}
      <Card className="w-full md:w-64 shrink-0 shadow-sm">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Navigasi Soal</h3>
            <span className="text-[11px] text-slate-500 font-medium">
              {Object.keys(answers).length}/{activeQuiz.questions.length} Selesai
            </span>
          </div>

          <div className="grid grid-cols-5 md:grid-cols-4 gap-2">
            {activeQuiz.questions.map((q, i) => (
              <button
                key={q.id}
                onClick={() => setCurrentIdx(i)}
                className={`h-9 w-full rounded-lg font-bold text-xs transition-all border ${
                  currentIdx === i
                    ? 'ring-2 ring-indigo-600 ring-offset-1 border-transparent'
                    : 'border-slate-200'
                } ${
                  answers[q.id] !== undefined
                    ? 'bg-indigo-100 text-indigo-700 border-indigo-200'
                    : 'bg-white hover:bg-slate-50 text-slate-600'
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>

          {/* Legend */}
          <div className="pt-2 border-t border-slate-100 space-y-1.5 text-[11px] text-slate-500">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-indigo-100 border border-indigo-300"></div>
              <span>Sudah Dijawab</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-white border border-slate-200"></div>
              <span>Belum Dijawab</span>
            </div>
          </div>

          {/* Live Proctoring Status */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-[11px] space-y-1.5 text-slate-600">
            <div className="font-semibold text-slate-800 flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5 text-indigo-600" /> Pengawasan Aktif:
            </div>
            <div className="flex items-center justify-between">
              <span>Layar Penuh:</span>
              <span className={isFullscreen ? 'text-emerald-600 font-semibold' : 'text-rose-600 font-semibold'}>
                {isFullscreen ? 'Terkunci' : 'Terlepas'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Bukti Layar:</span>
              <span className="text-emerald-600 font-semibold">Siap Deteksi</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Pelanggaran:</span>
              <span className={violationLogs.length > 0 ? 'text-rose-600 font-bold' : 'text-slate-500'}>
                {violationLogs.length} / 3 Maks
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pop-up Violation Alert Modal (When student is caught) */}
      {showViolationModal && latestViolation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 text-center shadow-2xl border-2 border-rose-500 space-y-4">
            <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle className="w-9 h-9" />
            </div>

            <div>
              <h2 className="text-xl font-bold text-rose-600">
                PERINGATAN PELANGGARAN TERDETEKSI!
              </h2>
              <p className="text-xs text-slate-600 mt-1">
                Peringatan: <strong>{violationLogs.length} dari 3</strong>. Jika mencapai 3 kali, ujian akan dihentikan otomatis!
              </p>
            </div>

            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 text-left text-xs text-rose-900 space-y-1">
              <p><strong>Aktivitas Terlarang:</strong> {latestViolation.description}</p>
              <p><strong>Waktu:</strong> {new Date(latestViolation.timestamp).toLocaleTimeString('id-ID')}</p>
              {latestViolation.durationSeconds !== undefined && latestViolation.durationSeconds > 0 && (
                <p><strong>Durasi Keluar:</strong> {latestViolation.durationSeconds} Detik</p>
              )}
            </div>

            {latestViolation.snapshotImage && (
              <div className="text-left space-y-1">
                <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                  <Monitor className="w-3.5 h-3.5 text-rose-600" /> Tangkapan Layar Bukti Telah Disimpan:
                </span>
                <div className="rounded-lg overflow-hidden border border-slate-200 bg-black aspect-video max-h-40 flex items-center justify-center">
                  <img 
                    src={latestViolation.snapshotImage} 
                    alt="Bukti Pelanggaran" 
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>
            )}

            <Button
              onClick={() => setShowViolationModal(false)}
              className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs"
            >
              Saya Mengerti & Kembali ke Lembar Ujian
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
