import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Play, Clock, HelpCircle, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const MOCK_QUIZZES = [
  { id: 'q-1', title: 'Ulangan Harian: Aljabar Dasar', subject: 'Matematika', duration: 45, questions: 15, status: 'AVAILABLE' },
  { id: 'q-2', title: 'Ujian Tengah Semester', subject: 'IPA Terpadu', duration: 90, questions: 40, status: 'COMPLETED', score: 85 },
];

export default function StudentQuizzes() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Kuis & Ujian</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {MOCK_QUIZZES.map((quiz) => (
          <Card key={quiz.id} className={quiz.status === 'COMPLETED' ? 'opacity-75 bg-slate-50' : 'border-indigo-100 hover:border-indigo-300 transition-colors'}>
            <CardHeader className="pb-3 border-b-0">
              <div className="flex items-start justify-between">
                <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-1 rounded">{quiz.subject}</span>
                {quiz.status === 'COMPLETED' && (
                  <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded">Selesai</span>
                )}
              </div>
              <CardTitle className="text-lg mt-3">{quiz.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-6 text-sm text-slate-600 mb-6">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" /> {quiz.duration} Menit
                </div>
                <div className="flex items-center gap-2">
                  <HelpCircle className="w-4 h-4" /> {quiz.questions} Soal
                </div>
              </div>

              {quiz.status === 'AVAILABLE' ? (
                <div className="space-y-4">
                  <div className="bg-amber-50 text-amber-800 text-xs p-3 rounded-lg flex gap-2">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    <span>Perhatian: Sistem Anti-Kecurangan aktif. Anda tidak dapat berpindah tab selama ujian.</span>
                  </div>
                  <Button 
                    className="w-full gap-2" 
                    onClick={() => navigate(`/student/quizzes/${quiz.id}`)}
                  >
                    <Play className="w-4 h-4" /> Mulai Ujian
                  </Button>
                </div>
              ) : (
                <div className="mt-4 pt-4 border-t border-slate-200 flex justify-between items-center">
                  <span className="text-sm font-medium text-slate-500">Nilai Akhir:</span>
                  <span className="text-2xl font-bold text-emerald-600">{quiz.score}</span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
