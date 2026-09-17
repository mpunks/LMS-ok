import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { BookOpen, CheckSquare, Award } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

export default function StudentDashboard() {
  const { user } = useAuthStore();
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Halo, {user?.name} 👋</h1>
          <p className="text-slate-500">Semangat belajar hari ini!</p>
        </div>
        <div className="bg-indigo-50 text-indigo-700 px-4 py-2 rounded-lg font-medium text-sm border border-indigo-100">
          Kelas 7A - Semester Ganjil
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { title: 'Materi Belum Dibaca', value: '4', icon: BookOpen, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { title: 'Kuis Mendatang', value: '2', icon: CheckSquare, color: 'text-rose-600', bg: 'bg-rose-50' },
          { title: 'Rata-rata Nilai', value: '85.5', icon: Award, color: 'text-emerald-600', bg: 'bg-emerald-50' },
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
            <CardTitle>Materi Terbaru</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { title: 'Aljabar Linear Dasar', subject: 'Matematika', date: 'Hari ini' },
                { title: 'Sistem Tata Surya', subject: 'IPA', date: 'Kemarin' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-4 p-4 border border-slate-100 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">{item.title}</p>
                    <p className="text-sm text-slate-500">{item.subject} • {item.date}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Kuis & Tugas Aktif</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { title: 'Kuis Harian Aljabar', subject: 'Matematika', deadline: 'Besok, 23:59' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-4 p-4 border border-rose-100 bg-rose-50/30 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer">
                  <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center text-rose-600">
                    <CheckSquare className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">{item.title}</p>
                    <p className="text-sm text-rose-600">Batas Waktu: {item.deadline}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
