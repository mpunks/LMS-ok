import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Users, BookOpen, CheckSquare, Settings } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

export default function AdminDashboard() {
  const { user } = useAuthStore();
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard Administrator</h1>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { title: 'Total Siswa', value: '452', icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { title: 'Total Guru', value: '32', icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { title: 'Materi Belajar', value: '128', icon: BookOpen, color: 'text-purple-600', bg: 'bg-purple-50' },
          { title: 'Kuis Aktif', value: '24', icon: CheckSquare, color: 'text-rose-600', bg: 'bg-rose-50' },
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
            <CardTitle>Aktivitas Terbaru</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-slate-500">Belum ada aktivitas hari ini.</p>
            </div>
          </CardContent>
        </Card>

        {user?.role === 'SUPER_ADMIN' && (
          <Card className="border-indigo-100 bg-indigo-50/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-indigo-600" />
                Status Integrasi Google Sheets
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-3 h-3 rounded-full bg-rose-500 animate-pulse"></div>
                <span className="text-sm font-medium text-slate-700">Webhook belum terhubung</span>
              </div>
              <p className="text-sm text-slate-600 mb-4">
                Sistem saat ini menggunakan penyimpanan lokal (mock). Hubungkan dengan Google Sheets untuk persistensi data secara cloud.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
