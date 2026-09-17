import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { CheckSquare, Plus, Clock, Users } from 'lucide-react';
import { toast } from '@/components/ui/Toast';

export default function TeacherQuizzes() {
  const quizzes = [
    { id: 'q-1', title: 'Ulangan Harian: Aljabar Dasar', subject: 'Matematika', class: '7A, 7B', status: 'AKTIF', submissions: 45 },
    { id: 'q-2', title: 'Ujian Tengah Semester', subject: 'Matematika', class: '8A', status: 'DRAFT', submissions: 0 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-900">Kelola Kuis & Ujian</h1>
        <Button className="gap-2" onClick={() => toast.info('Fitur pembuatan kuis CBT dalam pengembangan.')}>
          <Plus className="w-4 h-4" /> Buat Kuis Baru
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {quizzes.map((quiz) => (
          <Card key={quiz.id} className="hover:border-indigo-200 transition-colors">
            <CardHeader className="pb-3 border-b-0">
              <div className="flex justify-between items-start">
                <span className={`text-xs font-semibold px-2 py-1 rounded ${
                  quiz.status === 'AKTIF' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  {quiz.status}
                </span>
                <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-1 rounded">
                  {quiz.subject}
                </span>
              </div>
              <CardTitle className="text-lg mt-3">{quiz.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 text-sm text-slate-600 mb-6">
                <div className="flex items-center gap-1.5">
                  <Users className="w-4 h-4" /> {quiz.class}
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckSquare className="w-4 h-4" /> {quiz.submissions} Terkumpul
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="w-full">Lihat Nilai</Button>
                <Button variant="secondary" className="w-full">Edit Kuis</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
