import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
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
  FileText,
  CalendarClock,
  LogOut,
  CheckSquare,
  Layers,
  Maximize2,
  X,
  Cpu
} from 'lucide-react';
import { toast } from '@/components/ui/Toast';
import { motion, AnimatePresence } from 'motion/react';
import { useDataStore } from '@/store/dataStore';
import { useAuthStore } from '@/store/authStore';
import { ViolationLog, QuizResult, Quiz } from '@/types';
import ExamRulesModal from '@/components/student/ExamRulesModal';
import QuestionMediaRenderer from '@/components/quiz/QuestionMediaRenderer';
import { isResultMatchStudent, isQuizResetForStudent } from '@/lib/utils';

const MAX_VIOLATIONS = 5;

export default function StudentQuizCBT() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const autoStartRequested = Boolean((location.state as any)?.autoStart);
  const { user, logout } = useAuthStore();
  const { quizzes, quizResults, resetQuizKeys, submitQuiz, pullAllFromServer } = useDataStore();

  const activeQuiz = quizzes.find(q => q.id === id);
  const [isLoadingQuiz, setIsLoadingQuiz] = useState(!activeQuiz);

  // Auto pull from server if quiz is not found locally
  useEffect(() => {
    if (!activeQuiz) {
      pullAllFromServer().catch(() => {}).finally(() => setIsLoadingQuiz(false));
      const t = setTimeout(() => setIsLoadingQuiz(false), 2500);
      return () => clearTimeout(t);
    } else {
      setIsLoadingQuiz(false);
    }
  }, [id, !!activeQuiz]);

  const studentKey = user?.id || user?.nisn || (user as any)?.username || 'guest';
  const storageKey = `cbt_session_${studentKey}_${id}`;
  const finishedKey = `cbt_finished_${studentKey}_${id}`;

  const isResetForMe = isQuizResetForStudent(id || '', user, resetQuizKeys);

  // Find if student already took and completed this quiz in dataStore (unless it was reset by teacher!)
  const existingResult = isResetForMe ? null : quizResults.find(r => 
    r.quizId === id && isResultMatchStudent(r, user)
  );

  // Check saved CBT session from localStorage only if NOT already completed and not reset
  const [savedSession, setSavedSession] = useState<{
    quizId: string;
    studentId: string;
    currentIdx: number;
    answers: Record<string, number>;
    timeLeft: number;
    lastSavedAt: number;
    violationLogs: ViolationLog[];
    isFinished: boolean;
  } | null>(() => {
    if (existingResult) return null;
    try {
      const f = localStorage.getItem(finishedKey);
      if (f === 'true' && !isResetForMe) return null;
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && !parsed.isFinished && parsed.quizId === id) {
          return parsed;
        }
      }
    } catch (e) {}
    return null;
  });

  const [isResumed, setIsResumed] = useState(false);
  const gracePeriodUntilRef = useRef<number>(0);

  // Pre-exam setup state
  const [hasStarted, setHasStarted] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [screenPermission, setScreenPermission] = useState<'pending' | 'granted' | 'fallback'>('pending');
  const [cameraPermission, setCameraPermission] = useState<'pending' | 'granted' | 'unavailable'>('pending');
  const [isInitializingStreams, setIsInitializingStreams] = useState(false);

  const [currentIdx, setCurrentIdx] = useState(() => savedSession?.currentIdx || 0);
  const [answers, setAnswers] = useState<Record<string, any>>(() => (existingResult?.answers as Record<string, any>) || savedSession?.answers || {});
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(() => {
    if (savedSession && activeQuiz) {
      const now = Date.now();
      const sessionAgeMs = now - (savedSession.lastSavedAt || now);
      const isSessionVeryOld = sessionAgeMs > 3 * 60 * 60 * 1000;
      const quizTotalSec = (Number(activeQuiz.durationMinutes) || 45) * 60;
      if (!isSessionVeryOld && savedSession.timeLeft > 30) {
        const elapsed = Math.max(0, Math.floor(sessionAgeMs / 1000));
        return Math.max(60, Math.min(quizTotalSec, savedSession.timeLeft - elapsed));
      }
    }
    return (Number(activeQuiz?.durationMinutes) || 45) * 60;
  });
  
  const [isFinished, setIsFinished] = useState(() => {
    if (isResetForMe) return false;
    if (existingResult) return true;
    try {
      const f = localStorage.getItem(finishedKey);
      if (f === 'true') return true;
      const stored = localStorage.getItem(`cbt_result_${studentKey}_${id}`);
      if (stored) return true;
    } catch (e) {}
    return false;
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedResult, setSubmittedResult] = useState<QuizResult | null>(() => {
    if (isResetForMe) return null;
    if (existingResult) return existingResult;
    try {
      const stored = localStorage.getItem(`cbt_result_${studentKey}_${id}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.quizId === id) return parsed;
      }
    } catch (e) {}
    return null;
  });
  const isFinishedRef = useRef<boolean>(!isResetForMe && (!!existingResult || isFinished));
  const hasJustSubmittedRef = useRef<boolean>(false);
  const hasStartedRef = useRef<boolean>(false);
  const resetCleanedRef = useRef<string | null>(null);

  // Synchronize hasStartedRef
  useEffect(() => {
    hasStartedRef.current = hasStarted;
  }, [hasStarted]);

  const [showConfirmSubmitModal, setShowConfirmSubmitModal] = useState(false);
  const [showResetProgressModal, setShowResetProgressModal] = useState(false);
  const [showAnswersReview, setShowAnswersReview] = useState(false);

  // If student already completed quiz, clear any leftover cbt_session so it never prompts "Lanjutkan Ujian"
  useEffect(() => {
    if ((existingResult && !isResetForMe) || isFinished || submittedResult) {
      try {
        localStorage.removeItem(storageKey);
        setSavedSession(null);
      } catch (e) {}
    }
  }, [existingResult, isResetForMe, isFinished, submittedResult, storageKey]);

  // Synchronize submittedResult when existingResult loads or updates from store
  useEffect(() => {
    if (existingResult && !submittedResult && !isResetForMe) {
      setSubmittedResult(existingResult);
      setIsFinished(true);
      isFinishedRef.current = true;
    }
  }, [existingResult, isResetForMe]);

  // Synchronize timeLeft when activeQuiz loads if exam hasn't started yet
  useEffect(() => {
    if (!hasStarted && !savedSession && activeQuiz) {
      const qDuration = (Number(activeQuiz.durationMinutes) || 45) * 60;
      setTimeLeft(qDuration);
    }
  }, [activeQuiz?.id, activeQuiz?.durationMinutes, hasStarted, !!savedSession]);

  // If student result was reset by teacher, clear old finished state ONCE so student can retake (NEVER interrupts active exam!)
  useEffect(() => {
    // CRITICAL: NEVER reset if student just submitted or is actively taking the exam!
    if (hasJustSubmittedRef.current || hasStarted || hasStartedRef.current) return;

    const isReset = isQuizResetForStudent(id || '', user, resetQuizKeys);
    const resetKey = `${id}::${user?.id || user?.nisn || (user as any)?.username || 'guest'}`;

    if (isReset && user && id && resetCleanedRef.current !== resetKey) {
      resetCleanedRef.current = resetKey;

      const uids = [user.id, user.nisn, (user as any).username, 'guest'].filter(Boolean) as string[];
      try {
        for (const u of uids) {
          localStorage.removeItem(`cbt_finished_${u}_${id}`);
          localStorage.removeItem(`cbt_result_${u}_${id}`);
        }
      } catch (e) {}

      // If student was on finished / score screen from a previous attempt, unlock it so they can retake
      if (isFinished || submittedResult) {
        setIsFinished(false);
        isFinishedRef.current = false;
        setSubmittedResult(null);
      }
    }
  }, [resetQuizKeys, id, user?.id, user?.nisn, user?.name, activeQuiz, hasStarted, isFinished, submittedResult]);

  // Anti-Cheat Proctoring state
  const [violationLogs, setViolationLogs] = useState<ViolationLog[]>(() => (existingResult?.violationLogs as ViolationLog[]) || savedSession?.violationLogs || []);
  const [showViolationModal, setShowViolationModal] = useState(false);
  const [latestViolation, setLatestViolation] = useState<ViolationLog | null>(null);

  // Auto-Save CBT Progress to LocalStorage so refresh / quota disconnect does not lose answers or position
  useEffect(() => {
    if (!hasStarted || isFinished || isFinishedRef.current || !activeQuiz || !user) return;
    try {
      const sessionData = {
        quizId: activeQuiz.id,
        studentId: user.id,
        currentIdx,
        answers,
        timeLeft,
        violationLogs,
        lastSavedAt: Date.now(),
        isFinished: false
      };
      localStorage.setItem(storageKey, JSON.stringify(sessionData));
    } catch (e) {}
  }, [hasStarted, isFinished, currentIdx, answers, timeLeft, violationLogs, activeQuiz?.id, user?.id, storageKey]);

  // Prevent accidental tab closing or page refresh while taking exam
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasStarted && !isFinished) {
        e.preventDefault();
        e.returnValue = 'Ujian sedang berlangsung! Seluruh progres dan jawaban Anda tersimpan otomatis. Yakin ingin keluar?';
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasStarted, isFinished]);

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

  // Helper to run promise with strict timeout
  const withTimeout = <T,>(promise: Promise<T>, ms: number, fallbackValue: T): Promise<T> => {
    return Promise.race([
      promise,
      new Promise<T>((resolve) => setTimeout(() => resolve(fallbackValue), ms))
    ]);
  };

  // Auto-start exam if coming directly from accepted rules modal
  useEffect(() => {
    if (hasJustSubmittedRef.current || isFinished || isFinishedRef.current || submittedResult) {
      return;
    }
    if (autoStartRequested && activeQuiz && !hasStarted && !hasStartedRef.current) {
      handleStartExam(!!savedSession);
    }
  }, [autoStartRequested, !!activeQuiz, hasStarted, isFinished, submittedResult]);

  // Start CBT & Proctoring initialization (100% Non-Blocking & Instant)
  const handleStartExam = (resumeMode = false) => {
    hasStartedRef.current = true;
    setIsInitializingStreams(false);
    setHasStarted(true);
    gracePeriodUntilRef.current = Date.now() + 15000;

    if (savedSession && resumeMode) {
      const now = Date.now();
      const sessionAgeMs = now - (savedSession.lastSavedAt || now);
      const isSessionVeryOld = sessionAgeMs > 3 * 60 * 60 * 1000;
      const quizTotalSec = (Number(activeQuiz?.durationMinutes) || 45) * 60;

      let remainingTime = quizTotalSec;
      if (!isSessionVeryOld && savedSession.timeLeft > 30) {
        const elapsed = Math.max(0, Math.floor(sessionAgeMs / 1000));
        remainingTime = Math.max(60, Math.min(quizTotalSec, (savedSession.timeLeft || quizTotalSec) - elapsed));
      }
      setTimeLeft(remainingTime);
      setAnswers(savedSession.answers || {});
      setCurrentIdx(Math.min(savedSession.currentIdx || 0, (activeQuiz?.questions?.length || 1) - 1));
      setViolationLogs(savedSession.violationLogs || []);
      setIsResumed(true);
      toast.success(`Melanjutkan kuis dari nomor ${(savedSession.currentIdx || 0) + 1}.`);
    } else {
      try {
        localStorage.removeItem(storageKey);
      } catch (e) {}
      setSavedSession(null);
      setAnswers({});
      setCurrentIdx(0);
      setTimeLeft((Number(activeQuiz?.durationMinutes) || 45) * 60);
      setViolationLogs([]);
      setIsResumed(false);
    }

    toast.success(resumeMode ? 'Sesi ujian dilanjutkan!' : 'Mode Ujian CBT telah aktif!');

    // Non-blocking best-effort enhancements (fullscreen & webcam) in background
    try {
      if (!document.fullscreenElement && document.documentElement?.requestFullscreen) {
        document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
      }
    } catch (e) {}

    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 360 } },
        audio: false
      }).then(camStream => {
        if (camStream) {
          webcamStreamRef.current = camStream;
          if (webcamVideoRef.current) {
            webcamVideoRef.current.srcObject = camStream;
            webcamVideoRef.current.play().catch(() => {});
          }
          setCameraPermission('granted');
        } else {
          setCameraPermission('unavailable');
        }
      }).catch(() => {
        setCameraPermission('unavailable');
      });
    } else {
      setCameraPermission('unavailable');
    }
  };

  const recordViolation = (type: ViolationLog['type'], description: string, durationSeconds: number = 0) => {
    if (isFinished || isFinishedRef.current) return;
    if (Date.now() < gracePeriodUntilRef.current) return;

    const log = captureViolationSnapshot(type, description, durationSeconds);
    
    setViolationLogs(prev => {
      const updated = [...prev, log];
      const count = updated.length;

      setLatestViolation(log);
      // Informative proctor warning without prematurely terminating or auto-submitting the exam
      toast.error(`Peringatan Integritas (${count}): Aktivitas keluar jendela dicatat oleh pengawas.`);

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
          // Filter out momentary events under 3 seconds (keyboard popup, status bar, screen tap)
          if (duration >= 3) {
            recordViolation('TAB_SWITCH', `Siswa berpindah tab atau meminimalkan browser selama ${duration} detik`, duration);
          }
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
        // Filter out momentary events under 3 seconds
        if (duration >= 3) {
          recordViolation('WINDOW_BLUR', `Siswa membuka aplikasi lain / kehilangan fokus layar selama ${duration} detik`, duration);
        }
      }
    };

    // 3. Fullscreen Change
    const handleFullscreenChange = () => {
      const isStillFullscreen = !!document.fullscreenElement;
      setIsFullscreen(isStillFullscreen);
      if (!isStillFullscreen && Date.now() >= gracePeriodUntilRef.current) {
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
  const handleFinish = async (currentViolations = violationLogs, isDisqualified = false, overrideAnswers?: Record<string, any>) => {
    if (hasJustSubmittedRef.current || isFinished || isFinishedRef.current || !activeQuiz) return;
    hasJustSubmittedRef.current = true;
    isFinishedRef.current = true;
    setIsFinished(true);
    setHasStarted(false);
    setIsSubmitting(true);
    stopAllMediaStreams();

    const effectiveAnswers = overrideAnswers || answers;

    // Immediately clean up session and set finished flag so student is NEVER stuck on last question
    try {
      localStorage.removeItem(storageKey);
      localStorage.setItem(finishedKey, 'true');
      setSavedSession(null);
    } catch (err) {}

    // Immediately remove from resetQuizKeys in Zustand state so isResetForMe becomes false right away!
    try {
      useDataStore.setState((state) => ({
        resetQuizKeys: (state.resetQuizKeys || []).filter(k => {
          const uids = [user?.id, user?.nisn, (user as any)?.username, user?.name?.toLowerCase()].filter(Boolean) as string[];
          return !uids.some(sk => 
            k === `${activeQuiz.id}::${sk}` || 
            k === `${activeQuiz.id}::${sk.toLowerCase()}` || 
            k === `${activeQuiz.id}::${sk.replace(/^0+/, '')}`
          );
        })
      }));
    } catch (e) {}

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

      const studentAns = effectiveAnswers[q.id];
      const qType = q.type || 'SINGLE';

      if (qType === 'SINGLE') {
        let isCorrect = false;
        if (studentAns !== undefined && studentAns !== null) {
          const numStudent = Number(studentAns);
          let numCorrect = Number(q.correctOptionIndex);
          if (isNaN(numCorrect) && typeof q.correctOptionIndex === 'string') {
            const c = (q.correctOptionIndex as string).trim().toUpperCase();
            if (c >= 'A' && c <= 'E') {
              numCorrect = c.charCodeAt(0) - 65;
            }
          }
          if (!isNaN(numStudent) && !isNaN(numCorrect)) {
            if (numStudent === numCorrect) {
              isCorrect = true;
            } else if (numCorrect >= 1 && numCorrect <= (q.options?.length || 4) && numStudent === numCorrect - 1) {
              isCorrect = true;
            }
          }
        }
        if (isCorrect) {
          earnedPoints += qPoints;
        }
      } else if (qType === 'MCMA') {
        const correctSet = new Set<number>(
          (q.correctOptionIndices && q.correctOptionIndices.length > 0)
            ? q.correctOptionIndices
            : [q.correctOptionIndex ?? 0]
        );
        const studentArr: number[] = Array.isArray(studentAns)
          ? studentAns
          : (studentAns !== undefined && studentAns !== null && !isNaN(Number(studentAns)) ? [Number(studentAns)] : []);
        const studentSet = new Set<number>(studentArr);

        if (correctSet.size > 0 && studentSet.size > 0) {
          let hasWrong = false;
          let correctSelected = 0;
          for (const s of studentSet) {
            if (correctSet.has(s)) {
              correctSelected++;
            } else {
              hasWrong = true;
            }
          }
          if (!hasWrong && correctSelected > 0) {
            const ratio = correctSelected / correctSet.size;
            earnedPoints += Math.round(qPoints * ratio);
          }
        }
      } else if (qType === 'ESSAY') {
        // Initial auto-points for essay is 0 until teacher manually evaluates
      }
    });

    const calculatedScore = totalPoints > 0 
      ? Math.round((earnedPoints / totalPoints) * 100) 
      : 0;

    // Clean violation logs to exclude heavy base64 images so payload is light and fast
    const cleanViolations = (currentViolations || []).map(v => ({
      id: v.id,
      timestamp: v.timestamp,
      type: v.type,
      description: v.description,
      durationSeconds: v.durationSeconds,
      questionIndex: v.questionIndex
    }));

    const finalResult: QuizResult = {
      id: `qr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      quizId: activeQuiz.id,
      quizTitle: activeQuiz.title || 'Kuis CBT',
      subject: activeQuiz.subjectId || '',
      studentId: user?.id || user?.nisn || (user as any)?.username || '',
      studentName: user?.name || 'Siswa',
      studentNisn: user?.nisn || '',
      studentClass: user?.classId || '',
      score: calculatedScore,
      finalScore: isDisqualified ? 0 : calculatedScore,
      answers: effectiveAnswers,
      submittedAt: new Date().toISOString(),
      violationsCount: currentViolations.length,
      violationLogs: cleanViolations,
      disqualified: isDisqualified,
      teacherNote: isDisqualified 
        ? `Ujian dihentikan otomatis oleh sistem karena mencapai ${currentViolations.length} kali pelanggaran integritas.` 
        : ''
    };

    setSubmittedResult(finalResult);
    setIsFinished(true);
    isFinishedRef.current = true;
    setHasStarted(false);

    try {
      localStorage.removeItem(storageKey);
      localStorage.setItem(finishedKey, 'true');
      localStorage.setItem(`cbt_result_${studentKey}_${id}`, JSON.stringify(finalResult));
    } catch (e) {}

    try {
      await submitQuiz(finalResult);
      toast.success('Jawaban & Laporan Integritas berhasil disimpan ke Google Sheet');
    } catch (e: any) {
      console.error('Submit error', e);
      toast.info('Hasil kuis tersimpan di sesi lokal.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitSavedSession = async () => {
    if (!savedSession || !activeQuiz) return;
    await handleFinish(savedSession.violationLogs || [], false, savedSession.answers || {});
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

  // Loading state while verifying quiz data from server
  if (isLoadingQuiz && !activeQuiz) {
    return (
      <div className="max-w-md mx-auto py-20 px-4 text-center">
        <Card className="p-8 space-y-4 shadow-md border-indigo-100 bg-white">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <h2 className="text-base font-bold text-slate-800">Menyiapkan Lembar Ujian CBT...</h2>
          <p className="text-xs text-slate-500">Menghubungkan sistem dengan bank soal dan jadwal ujian sekolah.</p>
        </Card>
      </div>
    );
  }

  // Fallback if quiz is not found
  if (!activeQuiz) {
    return (
      <div className="max-w-md mx-auto py-16 px-4 text-center">
        <Card className="p-8 space-y-4 shadow-md border-slate-200">
          <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto border border-amber-200">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-slate-800">Kuis Tidak Ditemukan</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            Data kuis tidak tersedia atau belum selesai dimuat. Silakan muat ulang atau periksa daftar kuis kelas Anda.
          </p>
          <div className="flex gap-2">
            <Button 
              variant="outline"
              onClick={() => {
                setIsLoadingQuiz(true);
                pullAllFromServer().finally(() => setIsLoadingQuiz(false));
              }}
              className="flex-1 text-xs"
            >
              Muat Ulang
            </Button>
            <Button onClick={() => navigate('/student/quizzes')} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs">
              Kembali ke Daftar
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Live polling for schedule & quiz updates while on waiting screen
  useEffect(() => {
    if (hasStarted || isFinished) return;
    const timer = setInterval(() => {
      pullAllFromServer(false).catch(() => {});
    }, 5000);
    return () => clearInterval(timer);
  }, [hasStarted, isFinished]);

  // 1. EXAM COMPLETED / SCORE SCREEN (Must take precedence over !hasStarted so student always sees their score!)
  const isCompletedExam = isFinished || !!submittedResult || (!!existingResult && !isResetForMe);
  if (isCompletedExam) {
    const finalDisplayResult = submittedResult || existingResult;
    const finalAnswers: Record<string, any> = (finalDisplayResult?.answers as Record<string, any>) || answers || {};
    const questions = activeQuiz.questions || [];
    
    const isQAnswered = (q: any) => {
      const val = finalAnswers[q.id];
      if (val === undefined || val === null) return false;
      if (q.type === 'ESSAY') return typeof val === 'string' && val.trim().length > 0;
      if (q.type === 'MCMA') return Array.isArray(val) && val.length > 0;
      return val !== '';
    };

    const answeredCount = questions.filter(q => isQAnswered(q)).length;
    let earnedPoints = 0;
    let totalPoints = 0;

    questions.forEach(q => {
      const qPoints = q.points || 10;
      totalPoints += qPoints;

      const studentAns = finalAnswers[q.id];
      const qType = q.type || 'SINGLE';

      if (qType === 'SINGLE') {
        let isCorrect = false;
        if (studentAns !== undefined && studentAns !== null) {
          const numStudent = Number(studentAns);
          let numCorrect = Number(q.correctOptionIndex);
          if (isNaN(numCorrect) && typeof q.correctOptionIndex === 'string') {
            const c = (q.correctOptionIndex as string).trim().toUpperCase();
            if (c >= 'A' && c <= 'E') {
              numCorrect = c.charCodeAt(0) - 65;
            }
          }
          if (!isNaN(numStudent) && !isNaN(numCorrect)) {
            if (numStudent === numCorrect) {
              isCorrect = true;
            } else if (numCorrect >= 1 && numCorrect <= (q.options?.length || 4) && numStudent === numCorrect - 1) {
              isCorrect = true;
            }
          }
        }
        if (isCorrect) {
          earnedPoints += qPoints;
        }
      } else if (qType === 'MCMA') {
        const correctSet = new Set<number>(
          (q.correctOptionIndices && q.correctOptionIndices.length > 0)
            ? q.correctOptionIndices
            : [q.correctOptionIndex ?? 0]
        );
        const studentArr: number[] = Array.isArray(studentAns)
          ? studentAns
          : (studentAns !== undefined && studentAns !== null && !isNaN(Number(studentAns)) ? [Number(studentAns)] : []);
        const studentSet = new Set<number>(studentArr);

        if (correctSet.size > 0 && studentSet.size > 0) {
          let hasWrong = false;
          let correctSelected = 0;
          for (const s of studentSet) {
            if (correctSet.has(s)) {
              correctSelected++;
            } else {
              hasWrong = true;
            }
          }
          if (!hasWrong && correctSelected > 0) {
            const ratio = correctSelected / correctSet.size;
            earnedPoints += Math.round(qPoints * ratio);
          }
        }
      } else if (qType === 'ESSAY') {
        if (finalDisplayResult?.essayScores && typeof finalDisplayResult.essayScores[q.id] === 'number') {
          earnedPoints += Math.min(qPoints, Math.max(0, finalDisplayResult.essayScores[q.id]));
        }
      }
    });

    const finalViolationsCount = finalDisplayResult?.violationsCount !== undefined 
      ? finalDisplayResult.violationsCount 
      : violationLogs.length;
    const isDisqualified = Boolean(finalDisplayResult?.disqualified);
    const fallbackScore = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
    const displayScore = isDisqualified 
      ? 0 
      : (finalDisplayResult?.finalScore !== undefined ? finalDisplayResult.finalScore : (finalDisplayResult?.score !== undefined ? finalDisplayResult.score : fallbackScore));
    const finalAnsweredCount = finalDisplayResult?.answers 
      ? Object.keys(finalDisplayResult.answers).length 
      : answeredCount;
    const isPassed = !isDisqualified && displayScore >= 75;

    return (
      <div className="max-w-2xl mx-auto py-10 px-4">
        {hiddenStreamsMarkup}

        {/* Top Header Bar with Student Identity & Easy Logout */}
        <div className="flex items-center justify-between bg-white px-5 py-3.5 rounded-2xl border border-slate-200 shadow-sm mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm uppercase shrink-0">
              {user?.name?.substring(0, 2) || 'S'}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-800 leading-tight truncate">{user?.name}</p>
              <p className="text-xs text-slate-500 truncate">
                {user?.nisn ? `NISN: ${user.nisn}` : (user?.classId ? `Kelas: ${user.classId}` : 'Siswa')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              logout();
              navigate('/');
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors shadow-2xs shrink-0 cursor-pointer"
            title="Keluar dari akun siswa"
          >
            <LogOut className="w-3.5 h-3.5 text-rose-600" />
            <span>Keluar Akun</span>
          </button>
        </div>

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
              <p className="text-xs text-slate-500 mb-1 font-medium">Nilai Akhir</p>
              <p className={`text-2xl font-bold ${isDisqualified ? 'text-rose-600' : isPassed ? 'text-emerald-600' : 'text-indigo-600'}`}>
                {isDisqualified ? '0 (Diskualifikasi)' : displayScore}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1 font-medium">Terjawab</p>
              <p className="text-2xl font-bold text-slate-800">
                {finalAnsweredCount}/{questions.length}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1 font-medium">Pelanggaran</p>
              <p className={`text-2xl font-bold ${finalViolationsCount > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                {finalViolationsCount} / {MAX_VIOLATIONS}
              </p>
            </div>
          </div>

          {/* KKM Status Indicator */}
          <div className="mb-6 flex justify-center">
            {isDisqualified ? (
              <span className="text-xs font-bold px-3 py-1 bg-rose-100 text-rose-800 rounded-full border border-rose-200">
                Status: Diskualifikasi Integritas CBT
              </span>
            ) : isPassed ? (
              <span className="text-xs font-bold px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full border border-emerald-200 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Status: Tuntas / Mencapai KKM (≥75)
              </span>
            ) : (
              <span className="text-xs font-bold px-3 py-1 bg-amber-100 text-amber-800 rounded-full border border-amber-200 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600" /> Status: Di Bawah KKM (&lt;75)
              </span>
            )}
          </div>

          {finalViolationsCount > 0 && (
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-left mb-6 text-xs text-amber-900 space-y-1">
              <span className="font-bold flex items-center gap-1">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                Catatan Berita Acara Guru:
              </span>
              <p>
                Terdapat {finalViolationsCount} catatan peringatan pengawasan yang telah dilaporkan kepada Guru Pengampu untuk rekapitulasi nilai.
              </p>
            </div>
          )}

          {/* Toggle Answer Review */}
          <div className="mb-6 text-left">
            <button
              type="button"
              onClick={() => setShowAnswersReview(!showAnswersReview)}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center justify-between w-full p-3 bg-indigo-50/60 rounded-xl border border-indigo-100 hover:bg-indigo-50 transition-colors"
            >
              <span>{showAnswersReview ? 'Sembunyikan Rincian Lembar Jawaban' : 'Tampilkan Rincian Lembar Jawaban Anda'}</span>
              <span className="text-xs">{showAnswersReview ? '▲' : '▼'}</span>
            </button>

            {showAnswersReview && (
              <div className="mt-3 space-y-3 max-h-80 overflow-y-auto p-1">
                {questions.map((q, idx) => {
                  const studentAns = finalAnswers[q.id];
                  const qType = q.type || 'SINGLE';
                  const hasAnswered = studentAns !== undefined && studentAns !== null && (
                    qType === 'ESSAY' 
                      ? String(studentAns).trim().length > 0 
                      : (qType === 'MCMA' ? (Array.isArray(studentAns) && studentAns.length > 0) : true)
                  );

                  return (
                    <div key={`${q.id}-${idx}`} className="p-3 bg-white border border-slate-200 rounded-xl text-xs space-y-2 shadow-2xs">
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-semibold text-slate-800">
                          {idx + 1}. {q.text || (q as any).question || ''}
                        </div>
                        <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded shrink-0">
                          {qType === 'ESSAY' ? 'Essai' : qType === 'MCMA' ? 'MCMA' : 'PG'} • {q.points || 10} Poin
                        </span>
                      </div>

                      {qType === 'ESSAY' ? (
                        <div className="space-y-1.5 pt-1">
                          <div className="text-[11px] text-slate-500">Jawaban Uraian Anda:</div>
                          {hasAnswered ? (
                            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 whitespace-pre-wrap leading-relaxed">
                              {studentAns}
                            </div>
                          ) : (
                            <span className="italic text-rose-500 font-medium">Tidak Menjawab</span>
                          )}

                          {finalDisplayResult?.essayScores && typeof finalDisplayResult.essayScores[q.id] === 'number' ? (
                            <div className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-md inline-block">
                              Nilai Guru: {finalDisplayResult.essayScores[q.id]} / {q.points || 10}
                            </div>
                          ) : (
                            <div className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 inline-block">
                              Menunggu Pemeriksaan Guru
                            </div>
                          )}
                        </div>
                      ) : qType === 'MCMA' ? (
                        <div className="text-[11px] text-slate-500 pt-1">
                          Pilihan Jawaban Anda:{' '}
                          {hasAnswered && Array.isArray(studentAns) && studentAns.length > 0 ? (
                            <span className="font-semibold text-purple-700">
                              {studentAns.map(ansIdx => {
                                const letter = String.fromCharCode(65 + Number(ansIdx));
                                const optText = q.options?.[ansIdx] || '';
                                return `${letter}${optText ? ` (${optText})` : ''}`;
                              }).join(', ')}
                            </span>
                          ) : (
                            <span className="italic text-rose-500 font-medium">Tidak Dijawab</span>
                          )}
                        </div>
                      ) : (
                        <div className="text-[11px] text-slate-500 pt-1">
                          Pilihan Anda:{' '}
                          {hasAnswered && q.options && q.options[Number(studentAns)] !== undefined ? (
                            <span className="font-semibold text-indigo-700">
                              {String.fromCharCode(65 + Number(studentAns))}. {q.options[Number(studentAns)] || `(Pilihan ${String.fromCharCode(65 + Number(studentAns))})`}
                            </span>
                          ) : (
                            <span className="italic text-rose-500 font-medium">Tidak Dijawab</span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="space-y-2.5">
            <Button onClick={() => navigate('/student/quizzes')} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-3 rounded-xl shadow">
              Kembali ke Daftar Kuis
            </Button>
            <Button variant="outline" onClick={() => navigate('/student/grades')} className="w-full text-xs py-3 rounded-xl border-slate-300 text-slate-700 hover:bg-slate-50">
              Lihat di Daftar Nilai & Evaluasi
            </Button>
            <Button 
              variant="outline"
              type="button"
              onClick={() => {
                logout();
                navigate('/');
              }} 
              className="w-full text-xs py-3 rounded-xl border-rose-200 bg-rose-50/50 text-rose-700 hover:bg-rose-100 font-bold gap-2 cursor-pointer"
            >
              <LogOut className="w-4 h-4 text-rose-600" /> Selesai & Keluar Akun (Logout)
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // 2. PRE-EXAM INTEGRITY CHECK SCREEN
  if (!hasStarted) {
    const isScheduledExam = activeQuiz.isScheduled === true && Boolean(activeQuiz.startTime || activeQuiz.endTime);
    const examStartTime = isScheduledExam && activeQuiz.startTime ? new Date(activeQuiz.startTime) : null;
    const examEndTime = isScheduledExam && activeQuiz.endTime ? new Date(activeQuiz.endTime) : null;
    const isExamNotStarted = examStartTime && !isNaN(examStartTime.getTime()) ? examStartTime > new Date() : false;
    const isExamExpired = examEndTime && !isNaN(examEndTime.getTime()) ? examEndTime < new Date() : false;

    return (
      <div className="max-w-2xl mx-auto py-8 px-4">
        {hiddenStreamsMarkup}
        <Card className="border-cyan-500/30 shadow-xl overflow-hidden bg-white">
          <div className="bg-gradient-to-r from-[#070e1e] via-[#0d1b3e] to-[#0a1835] text-white p-6 text-center border-b border-cyan-500/30 relative">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 text-[11px] font-mono font-semibold tracking-wider uppercase mb-3">
              <Cpu className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
              <span>rafx2 AI Proctoring Engine • CBT Informatika</span>
            </div>
            <h1 className="text-2xl font-extrabold text-white">{activeQuiz.title}</h1>
            <p className="text-xs text-slate-300 mt-1 max-w-md mx-auto">
              Sistem Ujian Evaluasi Mata Pelajaran Informatika dengan Pengawasan Integritas Berbasis Tangkapan Layar Otomatis
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

            {/* Kotak Pemulihan Progres jika Siswa Mengalami Kendala (Refresh / Kuota Habis) */}
            {savedSession && (
              <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-4 space-y-3 text-emerald-950 animate-in fade-in">
                <div className="flex items-center gap-2 font-bold text-emerald-900 text-sm">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  Ditemukan Sesi Pengerjaan Tersimpan
                </div>
                <p className="text-xs text-emerald-800 leading-relaxed">
                  Sistem mendeteksi Anda sebelumnya telah mulai mengerjakan kuis ini. Progres dan jawaban Anda aman tersimpan:
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-white/80 p-2.5 rounded-lg border border-emerald-200">
                    <span className="text-slate-500 block text-[10px]">Posisi Terakhir:</span>
                    <strong className="text-slate-800 text-sm font-bold">Soal Nomor {(savedSession.currentIdx || 0) + 1}</strong>
                  </div>
                  <div className="bg-white/80 p-2.5 rounded-lg border border-emerald-200">
                    <span className="text-slate-500 block text-[10px]">Soal Terjawab:</span>
                    <strong className="text-slate-800 text-sm font-bold">{Object.keys(savedSession.answers || {}).length} dari {activeQuiz.questions.length}</strong>
                  </div>
                </div>
                <div className="text-[11px] text-emerald-700 bg-white/60 p-2 rounded-lg border border-emerald-200/50">
                  ✨ Anda dapat langsung mengirim seluruh jawaban tersimpan tanpa perlu masuk ulang, atau melanjutkan ke lembar ujian.
                </div>

                <div className="pt-2 flex flex-col gap-2">
                  <Button
                    onClick={handleSubmitSavedSession}
                    isLoading={isSubmitting}
                    disabled={isSubmitting}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2 text-xs shadow-md rounded-xl"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Kumpulkan Jawaban Tersimpan Sekarang (Tanpa Masuk Ulang)
                  </Button>
                </div>
              </div>
            )}

            {/* Anti-Cheat Rules Box */}
            {isExamNotStarted && examStartTime ? (
              <div className="bg-amber-50 border border-amber-300 rounded-xl p-5 space-y-2 text-amber-950">
                <div className="flex items-center gap-2 font-bold text-amber-900 text-sm">
                  <CalendarClock className="w-5 h-5 text-amber-600" />
                  Kuis Ini Terjadwal (Belum Dibuka)
                </div>
                <p className="text-xs text-amber-800 leading-relaxed">
                  Guru pengampu telah menjadwalkan kuis ini untuk dimulai pada:<br />
                  <strong className="text-sm text-amber-950 font-bold">
                    {examStartTime.toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' })}
                  </strong>
                </p>
                <p className="text-xs text-amber-700">
                  Silakan kembali lagi saat jam ujian telah dimulai. Halaman ini akan membuka otomatis saat jadwal tiba.
                </p>
              </div>
            ) : isExamExpired && examEndTime ? (
              <div className="bg-slate-100 border border-slate-300 rounded-xl p-5 space-y-2 text-slate-800">
                <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                  <AlertTriangle className="w-5 h-5 text-slate-500" />
                  Batas Waktu Pengerjaan Telah Berakhir
                </div>
                <p className="text-xs text-slate-600">
                  Akses ujian ini telah ditutup pada{' '}
                  <strong>{examEndTime.toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' })}</strong>.
                </p>
              </div>
            ) : (
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
                    <strong>Batas Maksimal 5 Pelanggaran:</strong> Jika mencapai 5 kali peringatan, ujian akan dihentikan seketika dan Anda dapat <strong>didiskualifikasi</strong>.
                  </li>
                </ul>
              </div>
            )}

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

            {isExamNotStarted ? (
              <Button 
                disabled
                className="w-full py-3.5 bg-slate-300 text-slate-600 font-bold gap-2 text-sm rounded-xl cursor-not-allowed"
              >
                <Lock className="w-4 h-4" /> Ujian Belum Dibuka
              </Button>
            ) : isExamExpired ? (
              savedSession && Object.keys(savedSession.answers || {}).length > 0 ? (
                <div className="space-y-2 pt-1">
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs">
                    <p className="font-bold flex items-center gap-1.5 mb-1">
                      <Clock className="w-4 h-4 text-amber-600" /> Waktu Ujian Telah Ditutup
                    </p>
                    <p className="text-[11px] text-amber-800">
                      Anda memiliki {Object.keys(savedSession.answers || {}).length} butir jawaban tersimpan. Kumpulkan sekarang agar nilai Anda masuk ke rekap guru!
                    </p>
                  </div>
                  <Button 
                    onClick={handleSubmitSavedSession}
                    isLoading={isSubmitting}
                    className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2 text-sm shadow-md rounded-xl"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Kumpulkan Jawaban Tersimpan Sekarang
                  </Button>
                </div>
              ) : (
                <Button 
                  disabled
                  className="w-full py-3.5 bg-slate-200 text-slate-500 font-bold gap-2 text-sm rounded-xl cursor-not-allowed"
                >
                  Ujian Telah Ditutup
                </Button>
              )
            ) : savedSession ? (
              <div className="space-y-2 pt-1">
                <Button 
                  onClick={() => handleStartExam(true)} 
                  isLoading={isInitializingStreams}
                  className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2 text-sm shadow-md rounded-xl transition-all"
                >
                  <CheckCircle2 className="w-4 h-4" /> Lanjutkan Pengerjaan (Soal No. {(savedSession.currentIdx || 0) + 1})
                </Button>
                <button
                  type="button"
                  onClick={() => setShowResetProgressModal(true)}
                  className="w-full py-2 text-xs text-slate-500 hover:text-rose-600 transition-colors"
                >
                  Ulangi dari Awal (Hapus Progres Tersimpan)
                </button>
              </div>
            ) : (
              <div className="space-y-2 pt-1">
                <Button 
                  onClick={() => handleStartExam(false)} 
                  className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold gap-2 text-sm shadow-md rounded-xl transition-all"
                >
                  <Lock className="w-4 h-4" /> Mulai Mengerjakan Ujian
                </Button>
                <button
                  type="button"
                  onClick={() => setShowRulesModal(true)}
                  className="w-full py-2 text-xs text-indigo-600 hover:text-indigo-800 transition-colors flex items-center justify-center gap-1 font-medium"
                >
                  <FileText className="w-3.5 h-3.5" /> Baca Tata Tertib Resmi Ujian
                </button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Modal Tata Tertib Ujian Resmi */}
        <ExamRulesModal
          isOpen={showRulesModal}
          onClose={() => setShowRulesModal(false)}
          isLoading={isInitializingStreams}
          onAgreeAndStart={async () => {
            setShowRulesModal(false);
            await handleStartExam(false);
          }}
          quiz={activeQuiz}
          student={user}
        />
      </div>
    );
  }

  const currentQ = activeQuiz.questions[currentIdx] || activeQuiz.questions[0];
  const rawQType = String(currentQ?.type || '').toUpperCase().trim();
  const hasAnyOptionText = Array.isArray(currentQ?.options) && currentQ.options.some(o => String(o || '').trim() !== '');
  const hasAnyOptionImg = Array.isArray(currentQ?.optionImages) && currentQ.optionImages.some(img => String(img || '').trim() !== '');
  const currentQType: 'SINGLE' | 'MCMA' | 'ESSAY' =
    rawQType === 'ESSAY' ||
    rawQType === 'URAIAN' ||
    Boolean(currentQ?.sampleAnswer && String(currentQ.sampleAnswer).trim() !== '') ||
    (!hasAnyOptionText && !hasAnyOptionImg)
      ? 'ESSAY'
      : rawQType === 'MCMA' || (Array.isArray(currentQ?.correctOptionIndices) && currentQ.correctOptionIndices.length > 1)
      ? 'MCMA'
      : 'SINGLE';

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
            {isResumed && (
              <span className="hidden sm:inline-flex text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Melanjutkan Sesi
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {violationLogs.length > 0 && (
              <span className="text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-lg flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                {violationLogs.length}/{MAX_VIOLATIONS} Pelanggaran
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

        {/* Lightbox Modal for Option Images */}
        {lightboxImage && (
          <div 
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
            onClick={() => setLightboxImage(null)}
          >
            <div className="relative max-w-2xl max-h-[85vh] bg-white rounded-2xl p-2 shadow-2xl overflow-hidden">
              <button
                onClick={() => setLightboxImage(null)}
                className="absolute top-3 right-3 p-1.5 rounded-full bg-slate-900/70 text-white hover:bg-slate-900"
              >
                <X className="w-5 h-5" />
              </button>
              <img 
                src={lightboxImage} 
                alt="Gambar Pilihan Ujian" 
                className="max-h-[80vh] w-auto object-contain rounded-xl mx-auto" 
              />
            </div>
          </div>
        )}

        {/* Question Card */}
        <Card className="min-h-[420px] shadow-sm">
          <CardContent className="p-6 md:p-8">
            <div className="mb-6 flex items-center justify-between flex-wrap gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-lg">
                  Soal Nomor {currentIdx + 1} dari {activeQuiz.questions.length}
                </span>

                {/* Badge for Question Type */}
                {currentQ?.type === 'ESSAY' ? (
                  <span className="text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                    Essai / Uraian
                  </span>
                ) : currentQ?.type === 'MCMA' ? (
                  <span className="text-[11px] font-bold text-purple-800 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-md">
                    MCMA (Pilihan Ganda Kompleks)
                  </span>
                ) : (
                  <span className="text-[11px] font-bold text-indigo-800 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md">
                    Pilihan Ganda
                  </span>
                )}

                {(() => {
                  const val = answers[currentQ?.id];
                  const isDone = val !== undefined && val !== null && (
                    currentQ?.type === 'ESSAY' 
                      ? String(val).trim().length > 0 
                      : (currentQ?.type === 'MCMA' ? Array.isArray(val) && val.length > 0 : true)
                  );
                  return isDone ? (
                    <span className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md flex items-center gap-1 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Tersimpan Otomatis
                    </span>
                  ) : (
                    <span className="text-[11px] text-slate-400">
                      Belum dijawab
                    </span>
                  );
                })()}
              </div>

              <div className="flex items-center gap-3">
                {isResumed && (
                  <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Sesi Dipulihkan
                  </span>
                )}
                <span className="text-xs text-slate-400 font-medium">
                  Poin: {currentQ?.points || 10}
                </span>
              </div>
            </div>

            <p className="text-base sm:text-lg text-slate-800 font-medium mb-5 leading-relaxed">
              {currentQ?.text}
            </p>

            {/* Media Rendering (Image, Video, Audio) if attached */}
            {(currentQ?.imageUrl || currentQ?.videoUrl || currentQ?.audioUrl) && (
              <div className="mb-6">
                <QuestionMediaRenderer
                  imageUrl={currentQ?.imageUrl}
                  videoUrl={currentQ?.videoUrl}
                  audioUrl={currentQ?.audioUrl}
                />
              </div>
            )}

            {/* If Essay */}
            {currentQType === 'ESSAY' ? (
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="font-semibold text-slate-700">Tuliskan lembar jawaban uraian Anda di bawah ini:</span>
                  <span className="font-mono text-[11px]">{String(answers[currentQ.id] || '').trim().length} Karakter</span>
                </div>
                <textarea
                  value={answers[currentQ.id] || ''}
                  onChange={(e) => setAnswers({ ...answers, [currentQ.id]: e.target.value })}
                  rows={8}
                  placeholder="Ketikkan jawaban uraian Anda secara jelas dan lengkap di sini..."
                  className="w-full text-sm p-4 border-2 border-slate-200 rounded-xl focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none leading-relaxed transition-all text-slate-900 bg-white placeholder:text-slate-400 font-normal"
                />
              </div>
            ) : currentQType === 'MCMA' ? (
              /* If MCMA: Checkboxes */
              <div className="space-y-3">
                <div className="p-2.5 rounded-lg bg-purple-50/70 border border-purple-200 text-xs text-purple-900 flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-purple-600 shrink-0" />
                  <span>
                    <strong>Pilihan Ganda Kompleks:</strong> Anda dapat memilih/mencentang lebih dari satu pilihan jawaban yang benar.
                  </span>
                </div>

                {currentQ?.options?.map((opt, i) => {
                  const letter = String.fromCharCode(65 + i);
                  const selectedArr: number[] = Array.isArray(answers[currentQ.id]) ? answers[currentQ.id] : [];
                  const isChecked = selectedArr.includes(i);
                  const optImg = currentQ.optionImages?.[i];

                  return (
                    <button
                      type="button"
                      key={i}
                      onClick={() => {
                        const updated = isChecked
                          ? selectedArr.filter(idx => idx !== i)
                          : [...selectedArr, i].sort((a, b) => a - b);
                        setAnswers({ ...answers, [currentQ.id]: updated });
                      }}
                      className={`w-full text-left p-3.5 sm:p-4 rounded-xl border-2 transition-all flex flex-col gap-2 ${
                        isChecked
                          ? 'border-purple-600 bg-purple-50/60 text-purple-950 font-medium shadow-sm'
                          : 'border-slate-200 hover:border-purple-200 hover:bg-slate-50/70 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-3 w-full">
                        <div className={`w-7 h-7 rounded-lg border flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                          isChecked 
                            ? 'border-purple-600 bg-purple-600 text-white' 
                            : 'border-slate-300 bg-white text-slate-600'
                        }`}>
                          {isChecked ? '✓' : letter}
                        </div>
                        <span className="text-sm leading-relaxed flex-1">{opt || `(Pilihan ${letter})`}</span>
                      </div>

                      {/* Option Image if available */}
                      {optImg && (
                        <div className="pl-10 mt-1">
                          <div 
                            className="inline-block relative group rounded-lg overflow-hidden border border-slate-200 bg-white p-1 hover:border-purple-400 cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              setLightboxImage(optImg);
                            }}
                            title="Klik untuk memperbesar gambar opsi"
                          >
                            <img 
                              src={optImg} 
                              alt={`Pilihan ${letter}`} 
                              className="h-24 sm:h-32 object-contain rounded" 
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[11px] gap-1 font-medium">
                              <Maximize2 className="w-3.5 h-3.5" /> Perbesar
                            </div>
                          </div>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              /* If SINGLE: Radio button style */
              <div className="space-y-3">
                {currentQ?.options?.map((opt, i) => {
                  const letter = String.fromCharCode(65 + i);
                  const isChecked = answers[currentQ.id] === i;
                  const optImg = currentQ.optionImages?.[i];

                  return (
                    <button
                      type="button"
                      key={i}
                      onClick={() => setAnswers({ ...answers, [currentQ.id]: i })}
                      className={`w-full text-left p-3.5 sm:p-4 rounded-xl border-2 transition-all flex flex-col gap-2 ${
                        isChecked
                          ? 'border-indigo-600 bg-indigo-50/60 text-indigo-950 font-medium shadow-sm'
                          : 'border-slate-200 hover:border-indigo-200 hover:bg-slate-50/70 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-3 w-full">
                        <div className={`w-7 h-7 rounded-lg border flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                          isChecked 
                            ? 'border-indigo-600 bg-indigo-600 text-white' 
                            : 'border-slate-300 bg-white text-slate-600'
                        }`}>
                          {letter}
                        </div>
                        <span className="text-sm leading-relaxed flex-1">{opt || `(Pilihan ${letter})`}</span>
                      </div>

                      {/* Option Image if available */}
                      {optImg && (
                        <div className="pl-10 mt-1">
                          <div 
                            className="inline-block relative group rounded-lg overflow-hidden border border-slate-200 bg-white p-1 hover:border-indigo-400 cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              setLightboxImage(optImg);
                            }}
                            title="Klik untuk memperbesar gambar opsi"
                          >
                            <img 
                              src={optImg} 
                              alt={`Pilihan ${letter}`} 
                              className="h-24 sm:h-32 object-contain rounded" 
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[11px] gap-1 font-medium">
                              <Maximize2 className="w-3.5 h-3.5" /> Perbesar
                            </div>
                          </div>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
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
              onClick={() => setShowConfirmSubmitModal(true)}
              isLoading={isSubmitting}
              disabled={isSubmitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 text-xs font-bold shadow-sm"
            >
              <CheckCircle2 className="w-4 h-4" /> Selesai & Kirim Ujian
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setShowConfirmSubmitModal(true)}
                isLoading={isSubmitting}
                disabled={isSubmitting}
                className="text-xs text-emerald-700 border-emerald-300 hover:bg-emerald-50 font-medium"
              >
                Kirim Ujian
              </Button>
              <Button
                onClick={() => setCurrentIdx(prev => Math.min(activeQuiz.questions.length - 1, prev + 1))}
                className="gap-2 text-xs"
              >
                Soal Selanjutnya <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Panel */}
      <Card className="w-full md:w-64 shrink-0 shadow-sm">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Navigasi Soal</h3>
            <span className="text-[11px] text-slate-500 font-medium">
              {activeQuiz.questions.filter(q => {
                const val = answers[q.id];
                if (val === undefined || val === null) return false;
                if (q.type === 'ESSAY') return typeof val === 'string' && val.trim().length > 0;
                if (q.type === 'MCMA') return Array.isArray(val) && val.length > 0;
                return val !== '';
              }).length}/{activeQuiz.questions.length} Selesai
            </span>
          </div>

          <div className="grid grid-cols-5 md:grid-cols-4 gap-2">
            {activeQuiz.questions.map((q, i) => {
              const val = answers[q.id];
              const isQDone = val !== undefined && val !== null && (
                q.type === 'ESSAY' 
                  ? typeof val === 'string' && val.trim().length > 0 
                  : (q.type === 'MCMA' ? Array.isArray(val) && val.length > 0 : val !== '')
              );

              return (
                <button
                  key={`${q.id}-${i}`}
                  onClick={() => setCurrentIdx(i)}
                  className={`h-9 w-full rounded-lg font-bold text-xs transition-all border ${
                    currentIdx === i
                      ? 'ring-2 ring-indigo-600 ring-offset-1 border-transparent'
                      : 'border-slate-200'
                  } ${
                    isQDone
                      ? 'bg-indigo-100 text-indigo-700 border-indigo-200'
                      : 'bg-white hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  {i + 1}
                </button>
              );
            })}
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

          {/* Quick Submit in Nav Panel */}
          <Button
            onClick={() => setShowConfirmSubmitModal(true)}
            isLoading={isSubmitting}
            disabled={isSubmitting}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold gap-1.5 py-2.5 rounded-lg shadow-sm"
          >
            <CheckCircle2 className="w-3.5 h-3.5" /> Selesai & Kirim Ujian
          </Button>

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
                {violationLogs.length} / {MAX_VIOLATIONS} Maks
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
                Peringatan: <strong>{violationLogs.length} dari {MAX_VIOLATIONS}</strong>. Jika mencapai {MAX_VIOLATIONS} kali, ujian akan dihentikan otomatis!
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

      {/* Modal Konfirmasi Selesai & Kirim Ujian */}
      {showConfirmSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 text-center shadow-2xl border border-slate-200 space-y-4">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Kirim Seluruh Lembar Jawaban Ujian?
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Setelah dikirim, ujian dinyatakan selesai dan nilai Anda akan langsung direkap ke Google Sheet guru.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl text-center">
                <span className="text-[11px] text-emerald-700 block font-medium">Sudah Terjawab</span>
                <strong className="text-base font-bold text-emerald-900">{Object.keys(answers).length} Butir</strong>
              </div>
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl text-center">
                <span className="text-[11px] text-slate-500 block font-medium">Belum Dijawab</span>
                <strong className={`text-base font-bold ${activeQuiz.questions.length - Object.keys(answers).length > 0 ? 'text-amber-600' : 'text-slate-800'}`}>
                  {Math.max(0, activeQuiz.questions.length - Object.keys(answers).length)} Butir
                </strong>
              </div>
            </div>

            {activeQuiz.questions.length - Object.keys(answers).length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-left text-xs text-amber-900 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>Masih terdapat butir soal yang belum Anda jawab. Anda yakin ingin tetap mengirim lembar ujian sekarang?</span>
              </div>
            )}

            <div className="pt-2 flex flex-col gap-2">
              <Button
                onClick={async () => {
                  setShowConfirmSubmitModal(false);
                  await handleFinish(violationLogs, false);
                }}
                isLoading={isSubmitting}
                disabled={isSubmitting}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 text-xs shadow-md rounded-xl"
              >
                <CheckCircle2 className="w-4 h-4 mr-1.5" /> Ya, Kirim Lembar Jawaban Sekarang
              </Button>
              <Button
                variant="outline"
                type="button"
                onClick={() => setShowConfirmSubmitModal(false)}
                className="w-full text-xs"
              >
                Periksa Kembali Jawaban
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Ulangi dari Awal */}
      {showResetProgressModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 text-center shadow-2xl border border-slate-200 space-y-4">
            <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div>
              <h2 className="text-base font-bold text-slate-900">
                Ulangi Ujian dari Awal?
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Seluruh jawaban yang sebelumnya telah tersimpan di perangkat ini akan dihapus dan Anda akan memulai kembali dari nomor 1.
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setShowResetProgressModal(false)}
                className="flex-1 text-xs"
              >
                Batal
              </Button>
              <Button
                onClick={() => {
                  setShowResetProgressModal(false);
                  handleStartExam(false);
                }}
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
              >
                Hapus & Mulai Ulang
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
