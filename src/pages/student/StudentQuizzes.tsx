import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Play, Clock, HelpCircle, AlertTriangle, CheckCircle2, FileText, ShieldAlert, CalendarClock, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDataStore } from '@/store/dataStore';
import { useAuthStore } from '@/store/authStore';
import { toast } from '@/components/ui/Toast';
import { isItemForClass } from '@/lib/utils';
import ExamRulesModal from '@/components/student/ExamRulesModal';

export default function StudentQuizzes() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { quizzes, quizResults } = useDataStore();

  const [selectedQuizForRules, setSelectedQuizForRules] = useState<any | null>(null);

  const studentQuizzes = quizzes.filter(q => isItemForClass(q.classId, q.targetClasses, user?.classId));
  const now = new Date();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Kuis & Ujian CBT</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Daftar tugas evaluasi dan ujian terjadwal untuk kelas Anda
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {studentQuizzes.map((quiz) => {
          const result = quizResults.find(r => r.quizId === quiz.id && r.studentId === user?.id);
          const isCompleted = !!result;

          const startTime = quiz.startTime ? new Date(quiz.startTime) : null;
          const endTime = quiz.endTime ? new Date(quiz.endTime) : null;
          const isNotStarted = startTime ? startTime > now : false;
          const isExpired = endTime ? endTime < now : false;

          return (
            <Card key={quiz.id} className={isCompleted ? 'opacity-75 bg-slate-50' : 'border-indigo-100 hover:border-indigo-300 transition-colors flex flex-col justify-between'}>
              <div>
                <CardHeader className="pb-3 border-b-0">
                  <div className="flex items-start justify-between">
                    <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-1 rounded">
                      {quiz.subjectId || 'Mata Pelajaran'}
                    </span>
                    {isCompleted ? (
                      <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Selesai
                      </span>
                    ) : isNotStarted ? (
                      <span className="text-xs font-semibold text-amber-700 bg-amber-100 px-2 py-1 rounded flex items-center gap-1">
                        <Lock className="w-3 h-3" /> Terjadwal
                      </span>
                    ) : isExpired ? (
                      <span className="text-xs font-semibold text-slate-600 bg-slate-200 px-2 py-1 rounded flex items-center gap-1">
                        Ditutup
                      </span>
                    ) : (
                      <span className="text-xs font-semibold text-emerald-700 bg-emerald-100 px-2 py-1 rounded flex items-center gap-1">
                        Tersedia
                      </span>
                    )}
                  </div>
                  <CardTitle className="text-lg mt-3 leading-snug">{quiz.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-6 text-sm text-slate-600 mb-4">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-slate-400" /> {quiz.durationMinutes} Menit
                    </div>
                    <div className="flex items-center gap-2">
                      <HelpCircle className="w-4 h-4 text-slate-400" /> {quiz.questions?.length || 0} Soal
                    </div>
                  </div>

                  {/* Scheduled Time Warning if not started yet */}
                  {isNotStarted && startTime && (
                    <div className="mb-4 bg-amber-50 text-amber-900 border border-amber-200 text-xs p-3 rounded-xl space-y-1">
                      <div className="font-bold flex items-center gap-1.5 text-amber-800">
                        <CalendarClock className="w-4 h-4 text-amber-600 shrink-0" />
                        Jadwal Ujian Terjadwal
                      </div>
                      <p className="text-[11px] leading-relaxed">
                        Kuis baru dapat dimulai pada:<br/>
                        <strong className="text-amber-950 font-semibold">
                          {startTime.toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' })}
                        </strong>
                      </p>
                    </div>
                  )}

                  {/* Expired Warning */}
                  {isExpired && !isCompleted && (
                    <div className="mb-4 bg-slate-100 text-slate-700 border border-slate-200 text-xs p-3 rounded-xl flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-slate-500 shrink-0" />
                      <span>Batas waktu pengerjaan kuis ini telah berakhir.</span>
                    </div>
                  )}

                  {!isCompleted && !isNotStarted && !isExpired && (
                    <div className="bg-amber-50 text-amber-800 text-xs p-3 rounded-lg flex gap-2 border border-amber-200 mb-4">
                      <ShieldAlert className="w-4 h-4 flex-shrink-0 text-amber-600 mt-0.5" />
                      <span>Dilengkapi pengawasan tangkapan layar & wajib menyetujui tata tertib ujian sebelum mulai.</span>
                    </div>
                  )}
                </CardContent>
              </div>

              <div className="p-6 pt-0">
                {!isCompleted ? (
                  <div className="grid grid-cols-2 gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="text-xs gap-1.5 border-slate-300 text-slate-700 hover:bg-slate-50"
                      onClick={() => setSelectedQuizForRules(quiz)}
                    >
                      <FileText className="w-3.5 h-3.5 text-indigo-600" /> Tata Tertib
                    </Button>
                    
                    {isNotStarted ? (
                      <Button 
                        size="sm"
                        disabled
                        className="gap-1.5 text-xs bg-slate-300 text-slate-600 cursor-not-allowed"
                        title="Ujian belum dibuka sesuai jadwal guru"
                      >
                        <Lock className="w-3.5 h-3.5" /> Belum Dibuka
                      </Button>
                    ) : isExpired ? (
                      <Button 
                        size="sm"
                        disabled
                        className="gap-1.5 text-xs bg-slate-200 text-slate-500 cursor-not-allowed"
                      >
                        Waktu Habis
                      </Button>
                    ) : (
                      <Button 
                        size="sm"
                        className="gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm" 
                        onClick={() => setSelectedQuizForRules(quiz)}
                      >
                        <Play className="w-3.5 h-3.5" /> Mulai Ujian
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="pt-3 border-t border-slate-200 flex justify-between items-center">
                    <span className="text-sm font-medium text-slate-500">Nilai Akhir:</span>
                    <span className="text-2xl font-bold text-emerald-600">{result?.score || 100}</span>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
        {studentQuizzes.length === 0 && (
          <div className="col-span-full p-12 text-center border-2 border-dashed border-slate-200 rounded-xl text-slate-500">
            Belum ada kuis yang ditugaskan untuk kelas Anda.
          </div>
        )}
      </div>

      {/* Modal Tata Tertib CBT Sebelum Mulai Ujian */}
      {selectedQuizForRules && (
        <ExamRulesModal
          isOpen={!!selectedQuizForRules}
          onClose={() => setSelectedQuizForRules(null)}
          onAgreeAndStart={() => {
            const quizId = selectedQuizForRules.id;
            setSelectedQuizForRules(null);
            navigate(`/student/quizzes/${quizId}`);
          }}
          quiz={selectedQuizForRules}
          student={user}
        />
      )}
    </div>
  );
}
