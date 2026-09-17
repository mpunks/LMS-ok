import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { BarChart, Download, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/Toast';
import { useAuthStore } from '@/store/authStore';
import { useDataStore } from '@/store/dataStore';

export default function StudentGrades() {
  const { user } = useAuthStore();
  const { users, quizResults, quizzes } = useDataStore();
  
  const myResults = quizResults.filter(r => r.studentId === user?.id);
  const myClassmates = users.filter(u => u.role === 'STUDENT' && u.classId === user?.classId);
  
  const getStudentAverage = (studentId: string) => {
    const results = quizResults.filter(r => r.studentId === studentId);
    if (results.length === 0) return 0;
    return results.reduce((acc, curr) => acc + curr.score, 0) / results.length;
  };

  const myAvg = getStudentAverage(user?.id || '');
  
  // Calculate Rank
  const rankings = myClassmates.map(s => ({ id: s.id, avg: getStudentAverage(s.id) })).sort((a, b) => b.avg - a.avg);
  const myRank = rankings.findIndex(r => r.id === user?.id) + 1;
  const totalStudents = rankings.length;

  // Group by subjects (using quiz metadata)
  const subjectsMap = new Map<string, { totalScore: number, count: number }>();
  myResults.forEach(r => {
    const quiz = quizzes.find(q => q.id === r.quizId);
    if (quiz && quiz.subjectId) {
      const existing = subjectsMap.get(quiz.subjectId) || { totalScore: 0, count: 0 };
      subjectsMap.set(quiz.subjectId, {
        totalScore: existing.totalScore + r.score,
        count: existing.count + 1
      });
    }
  });

  const subjectRows = Array.from(subjectsMap.entries()).map(([subject, data]) => {
    const final = data.totalScore / data.count;
    let grade = 'C';
    if (final >= 90) grade = 'A';
    else if (final >= 85) grade = 'A-';
    else if (final >= 80) grade = 'B+';
    else if (final >= 75) grade = 'B';
    return { subject, kuisCount: data.count, final, grade };
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-900">Raport Digital</h1>
        <Button variant="outline" className="gap-2" onClick={() => toast.success('Raport PDF sedang diunduh...')}>
          <Download className="w-4 h-4" /> Unduh PDF
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-indigo-600 text-white border-transparent">
          <CardContent className="p-6 flex items-center gap-6">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center shrink-0">
              <GraduationCap className="w-8 h-8" />
            </div>
            <div>
              <p className="text-indigo-100 text-sm font-medium mb-1">Peringkat Kelas Sementara</p>
              <p className="text-3xl font-bold">{myRank > 0 ? myRank : '-'} <span className="text-xl font-normal text-indigo-200">dari {totalStudents} Siswa</span></p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6 flex items-center gap-6">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center shrink-0">
              <BarChart className="w-8 h-8" />
            </div>
            <div>
              <p className="text-slate-500 text-sm font-medium mb-1">Rata-Rata Nilai Kuis</p>
              <p className="text-3xl font-bold text-slate-900">{myAvg > 0 ? myAvg.toFixed(1) : '-'}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Rincian Nilai per Mata Pelajaran</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-slate-600">
              <thead className="text-xs text-slate-700 uppercase bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">Mata Pelajaran</th>
                  <th className="px-6 py-4 text-center">Total Kuis Dikerjakan</th>
                  <th className="px-6 py-4 text-center">Rata-Rata Nilai</th>
                  <th className="px-6 py-4 text-center">Predikat</th>
                </tr>
              </thead>
              <tbody>
                {subjectRows.map((item, idx) => (
                  <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50/50">
                    <td className="px-6 py-4 font-medium text-slate-900">{item.subject}</td>
                    <td className="px-6 py-4 text-center">{item.kuisCount}</td>
                    <td className="px-6 py-4 text-center font-bold text-indigo-600">{item.final.toFixed(1)}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        item.grade.includes('A') ? 'bg-emerald-100 text-emerald-800' : 
                        item.grade.includes('B') ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-800'
                      }`}>
                        {item.grade}
                      </span>
                    </td>
                  </tr>
                ))}
                {subjectRows.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                      Belum ada nilai kuis yang tersimpan.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
