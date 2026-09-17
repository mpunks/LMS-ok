import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Clock, AlertTriangle, CheckCircle2, ChevronRight, ChevronLeft } from 'lucide-react';
import { toast } from '@/components/ui/Toast';
import { motion, AnimatePresence } from 'motion/react';

// Mock data
const MOCK_QUIZ = {
  id: 'q-1',
  title: 'Ulangan Harian: Aljabar Dasar',
  durationMinutes: 45,
  questions: [
    { id: '1', text: 'Berapakah nilai x dari persamaan 2x + 5 = 15?', options: ['x = 5', 'x = 10', 'x = 15', 'x = 20'] },
    { id: '2', text: 'Jika y = 3x - 4 dan x = 2, berapakah nilai y?', options: ['y = 2', 'y = -2', 'y = 1', 'y = -1'] },
    { id: '3', text: 'Bentuk sederhana dari 3(x + 2) - 2x adalah...', options: ['x + 6', '5x + 6', 'x + 2', '5x + 2'] },
  ]
};

export default function StudentQuizCBT() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [timeLeft, setTimeLeft] = useState(MOCK_QUIZ.durationMinutes * 60);
  const [isFinished, setIsFinished] = useState(false);
  const [cheatingAttempts, setCheatingAttempts] = useState(0);

  // Anti-Cheat: Detect Tab/Window switch
  useEffect(() => {
    if (isFinished) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setCheatingAttempts(prev => {
          const newVal = prev + 1;
          if (newVal >= 3) {
            handleFinish();
            toast.error('Ujian dihentikan otomatis karena terdeteksi meninggalkan halaman lebih dari 3 kali.');
          } else {
            toast.error(`Peringatan Kecurangan! (${newVal}/3) Jangan tinggalkan halaman ujian!`);
          }
          return newVal;
        });
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [isFinished]);

  // Timer
  useEffect(() => {
    if (isFinished) return;
    if (timeLeft <= 0) {
      handleFinish();
      toast.info('Waktu ujian telah habis.');
      return;
    }
    const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft, isFinished]);

  const handleFinish = () => {
    setIsFinished(true);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const currentQ = MOCK_QUIZ.questions[currentIdx];

  if (isFinished) {
    // Mock calculate score
    const qLen = MOCK_QUIZ.questions.length;
    const answeredCount = Object.keys(answers).length;
    const score = Math.round((answeredCount / qLen) * 100);
    
    return (
      <div className="max-w-2xl mx-auto mt-10">
        <Card className="text-center p-8">
          <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h2 className="text-3xl font-bold text-slate-900 mb-2">Ujian Selesai!</h2>
          <p className="text-slate-600 mb-8">Jawaban Anda telah berhasil disimpan ke sistem.</p>
          
          <div className="bg-slate-50 p-6 rounded-xl border border-slate-100 mb-8 flex justify-around">
            <div>
              <p className="text-sm text-slate-500 mb-1">Nilai Sementara</p>
              <p className="text-3xl font-bold text-indigo-600">{score}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500 mb-1">Terjawab</p>
              <p className="text-3xl font-bold text-slate-800">{answeredCount}/{MOCK_QUIZ.questions.length}</p>
            </div>
          </div>
          
          <Button onClick={() => navigate('/student/quizzes')} className="w-full">
            Kembali ke Daftar Kuis
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto flex flex-col md:flex-row gap-6 items-start">
      {/* Main Question Area */}
      <div className="flex-1 w-full space-y-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between sticky top-16 z-20 md:static">
          <h1 className="font-bold text-slate-800 truncate pr-4">{MOCK_QUIZ.title}</h1>
          <div className="flex items-center gap-2 bg-rose-50 text-rose-700 px-3 py-1.5 rounded-lg font-mono font-bold shrink-0">
            <Clock className="w-4 h-4" />
            {formatTime(timeLeft)}
          </div>
        </div>

        <Card className="min-h-[400px]">
          <CardContent className="p-8">
            <div className="mb-6 flex items-center justify-between">
              <span className="text-sm font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
                Soal {currentIdx + 1} dari {MOCK_QUIZ.questions.length}
              </span>
              {cheatingAttempts > 0 && (
                <span className="text-xs font-semibold text-rose-600 bg-rose-50 px-2 py-1 rounded flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Peringatan: {cheatingAttempts}/3
                </span>
              )}
            </div>
            
            <p className="text-lg text-slate-800 font-medium mb-8 leading-relaxed">
              {currentQ.text}
            </p>

            <div className="space-y-3">
              {currentQ.options.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => setAnswers({ ...answers, [currentQ.id]: i })}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                    answers[currentQ.id] === i 
                      ? 'border-indigo-600 bg-indigo-50/50 text-indigo-900 font-medium'
                      : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full border flex items-center justify-center text-sm ${
                      answers[currentQ.id] === i ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300'
                    }`}>
                      {String.fromCharCode(65 + i)}
                    </div>
                    {opt}
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-between">
          <Button 
            variant="outline" 
            onClick={() => setCurrentIdx(prev => Math.max(0, prev - 1))}
            disabled={currentIdx === 0}
            className="gap-2"
          >
            <ChevronLeft className="w-4 h-4" /> Sebelumnya
          </Button>
          
          {currentIdx === MOCK_QUIZ.questions.length - 1 ? (
            <Button onClick={() => {
              if (window.confirm('Apakah Anda yakin ingin menyelesaikan ujian ini?')) {
                handleFinish();
              }
            }} variant="primary" className="bg-emerald-600 hover:bg-emerald-700">
              Selesai Ujian
            </Button>
          ) : (
            <Button 
              onClick={() => setCurrentIdx(prev => Math.min(MOCK_QUIZ.questions.length - 1, prev + 1))}
              className="gap-2"
            >
              Selanjutnya <ChevronRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Navigation Panel */}
      <Card className="w-full md:w-64 shrink-0">
        <CardContent className="p-4">
          <h3 className="font-semibold text-slate-800 mb-4 text-sm uppercase tracking-wider">Navigasi Soal</h3>
          <div className="grid grid-cols-5 md:grid-cols-4 gap-2">
            {MOCK_QUIZ.questions.map((q, i) => (
              <button
                key={q.id}
                onClick={() => setCurrentIdx(i)}
                className={`h-10 w-full rounded font-medium text-sm transition-colors border ${
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
          
          <div className="mt-6 space-y-2 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-indigo-100 border border-indigo-200"></div>
              <span>Sudah Dijawab</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-white border border-slate-200"></div>
              <span>Belum Dijawab</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
