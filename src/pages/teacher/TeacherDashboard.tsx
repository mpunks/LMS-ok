import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { BookOpen, Users, CheckSquare, BarChart } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

export default function TeacherDashboard() {
  const { user } = useAuthStore();
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Selamat datang, {user?.name}</h1>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { title: 'Kelas Diampu', value: '3', icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { title: 'Total Materi', value: '12', icon: BookOpen, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { title: 'Kuis Aktif', value: '2', icon: CheckSquare, color: 'text-purple-600', bg: 'bg-purple-50' },
          { title: 'Nilai Menunggu', value: '45', icon: BarChart, color: 'text-rose-600', bg: 'bg-rose-50' },
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
            <CardTitle>Jadwal Kelas Hari Ini</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { time: '07:30 - 09:00', class: '7A', subject: 'Matematika' },
                { time: '10:00 - 11:30', class: '8B', subject: 'Matematika' },
              ].map((schedule, i) => (
                <div key={i} className="flex items-center justify-between p-4 border border-slate-100 rounded-lg bg-slate-50">
                  <div>
                    <p className="font-semibold text-slate-900">{schedule.class}</p>
                    <p className="text-sm text-slate-500">{schedule.subject}</p>
                  </div>
                  <div className="text-sm font-medium text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
                    {schedule.time}
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
