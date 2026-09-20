import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Play, Clock, HelpCircle, AlertTriangle, CheckCircle2, FileText, ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDataStore } from '@/store/dataStore';
import { useAuthStore } from '@/store/authStore';
import ExamRulesModal from '@/components/student/ExamRulesModal';

export default function StudentQuizzes() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { quizzes, quizResults } = useDataStore();

  const [selectedQuizForRules, setSelectedQuizForRules] = useState<any | null>(null);

  const studentQuizzes = quizzes.filter(q => q.classId === user?.classId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Kuis & Ujian</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {studentQuizzes.map((quiz) => {
          const result = quizResults.find(r => r.quizId === quiz.id && r.studentId === user?.id);
          const isCompleted = !!result;

          return (
            <Card key={quiz.id} className={isCompleted ? 'opacity-75 bg-slate-50' : 'border-indigo-100 hover:border-indigo-300 transition-colors'}>
              <CardHeader className="pb-3 border-b-0">
                <div className="flex items-start justify-between">
                  <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-1 rounded">{quiz.subjectId || 'Mata Pelajaran'}</span>
                  {isCompleted && (
                    <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Selesai
                    </span>
                  )}
                </div>
                <CardTitle className="text-lg mt-3">{quiz.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-6 text-sm text-slate-600 mb-6">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" /> {quiz.durationMinutes} Menit
                  </div>
                </div>

                {!isCompleted ? (
                  <div className="space-y-3">
                    <div className="bg-amber-50 text-amber-800 text-xs p-3 rounded-lg flex gap-2 border border-amber-200">
                      <ShieldAlert className="w-4 h-4 flex-shrink-0 text-amber-600 mt-0.5" />
                      <span>Dilengkapi pengawasan tangkapan layar & wajib menyetujui tata tertib ujian sebelum mulai.</span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="text-xs gap-1.5 border-slate-300 text-slate-700 hover:bg-slate-50"
                        onClick={() => setSelectedQuizForRules(quiz)}
                      >
                        <FileText className="w-3.5 h-3.5 text-indigo-600" /> Tata Tertib
                      </Button>
                      <Button 
                        size="sm"
                        className="gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white" 
                        onClick={() => setSelectedQuizForRules(quiz)}
                      >
                        <Play className="w-3.5 h-3.5" /> Mulai Ujian
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 pt-4 border-t border-slate-200 flex justify-between items-center">
                    <span className="text-sm font-medium text-slate-500">Nilai Akhir:</span>
                    <span className="text-2xl font-bold text-emerald-600">{result?.score || 100}</span>
                  </div>
                )}
              </CardContent>
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
