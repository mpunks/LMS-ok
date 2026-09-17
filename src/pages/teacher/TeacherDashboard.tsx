import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { BookOpen, Users, CheckSquare, BarChart } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useDataStore } from '@/store/dataStore';

export default function TeacherDashboard() {
  const { user } = useAuthStore();
  const { materials, quizzes } = useDataStore();
  
  const myMaterials = materials.filter(m => m.teacherId === user?.id);
  const myQuizzes = quizzes.filter(q => myMaterials.some(m => m.id === q.materialId));
  const classCount = new Set(myMaterials.map(m => m.classId)).size;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Selamat datang, {user?.name}</h1>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { title: 'Kelas Diampu', value: classCount.toString(), icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { title: 'Total Materi', value: myMaterials.length.toString(), icon: BookOpen, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { title: 'Kuis Aktif', value: myQuizzes.length.toString(), icon: CheckSquare, color: 'text-purple-600', bg: 'bg-purple-50' },
          { title: 'Nilai Menunggu', value: '0', icon: BarChart, color: 'text-rose-600', bg: 'bg-rose-50' },
        ].map((stat, i) => (
          <Card key={i}>
            <CardContent className="p-6 flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.bg} ${stat.color}`}>
                <stat.icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">{stat.title}</p>
                <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Kelas Diampu</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Array.from(new Set(myMaterials.map(m => m.classId))).map((className, i) => {
                const subject = myMaterials.find(m => m.classId === className)?.subjectId;
                return (
                <div key={i} className="flex items-center justify-between p-4 border border-slate-100 rounded-lg bg-slate-50">
                  <div>
                    <p className="font-semibold text-slate-900">Kelas {className}</p>
                    <p className="text-sm text-slate-500">{subject}</p>
                  </div>
                  <div className="text-sm font-medium text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
                    Aktif
                  </div>
                </div>
              )})}
              {classCount === 0 && (
                <p className="text-sm text-slate-500 text-center py-4">Belum ada kelas yang diampu.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
