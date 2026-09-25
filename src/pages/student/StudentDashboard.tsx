import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { BookOpen, CheckSquare, Award, KeyRound, ShieldAlert } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useDataStore } from '@/store/dataStore';
import { isItemForClass } from '@/lib/utils';
import ChangePasswordModal from '@/components/common/ChangePasswordModal';

export default function StudentDashboard() {
  const { user } = useAuthStore();
  const { materials, quizzes, quizResults } = useDataStore();
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  
  const myClassMaterials = materials.filter(m => isItemForClass(m.classId, m.targetClasses, user?.classId));
  const myClassQuizzes = quizzes.filter(q => isItemForClass(q.classId, q.targetClasses, user?.classId));
  
  // Calculate average score
  const myResults = quizResults.filter(r => r.studentId === user?.id);
  const avgScore = myResults.length > 0 
    ? (myResults.reduce((acc, curr) => acc + curr.score, 0) / myResults.length).toFixed(1) 
    : '0';

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Halo, {user?.name} 👋</h1>
          <p className="text-slate-500">Semangat belajar hari ini!</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPasswordModal(true)}
            className="text-xs gap-1.5 border-slate-300 hover:border-indigo-400 bg-white"
          >
            <KeyRound className="w-3.5 h-3.5 text-indigo-600" />
            Ubah Password
          </Button>
          <div className="bg-indigo-50 text-indigo-700 px-4 py-2 rounded-lg font-medium text-sm border border-indigo-100">
            Kelas {user?.classId} - Semester Ganjil
          </div>
        </div>
      </div>

      {/* Security Alert: Prompt student to change default password */}
      {!user?.password && (
        <div className="p-4 rounded-xl bg-amber-50/90 border border-amber-200/90 text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs animate-in fade-in">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500 text-white shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-xs sm:text-sm text-amber-950">
                Penting: Anda masih menggunakan Kata Sandi Bawaan (NISN)
              </div>
              <p className="text-[11px] sm:text-xs text-amber-800 mt-0.5">
                Agar akun dan hasil pengerjaan kuis Anda aman dan tidak disalahgunakan orang lain, segera ubah kata sandi dengan kata sandi rahasia Anda sendiri.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => setShowPasswordModal(true)}
            className="shrink-0 bg-amber-600 hover:bg-amber-700 text-white text-xs gap-1.5 shadow-xs"
          >
            <KeyRound className="w-3.5 h-3.5" />
            Ubah Kata Sandi Sekarang
          </Button>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { title: 'Total Materi Kelas', value: myClassMaterials.length.toString(), icon: BookOpen, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { title: 'Kuis Kelas', value: myClassQuizzes.length.toString(), icon: CheckSquare, color: 'text-rose-600', bg: 'bg-rose-50' },
          { title: 'Rata-rata Nilai', value: avgScore, icon: Award, color: 'text-emerald-600', bg: 'bg-emerald-50' },
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
              {myClassMaterials.slice(-3).reverse().map((item, i) => (
                <div key={item.id} className="flex items-center gap-4 p-4 border border-slate-100 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">{item.title}</p>
                    <p className="text-sm text-slate-500">{item.subjectId} • Semester {item.semester}</p>
                  </div>
                </div>
              ))}
              {myClassMaterials.length === 0 && (
                <p className="text-sm text-slate-500 text-center py-4">Belum ada materi untuk kelas ini.</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Kuis & Tugas Aktif</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {myClassQuizzes.slice(-3).reverse().map((item, i) => (
                <div key={item.id} className="flex items-center gap-4 p-4 border border-rose-100 bg-rose-50/30 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer">
                  <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center text-rose-600">
                    <CheckSquare className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">{item.title}</p>
                    <p className="text-sm text-rose-600">Durasi: {item.durationMinutes} menit</p>
                  </div>
                </div>
              ))}
              {myClassQuizzes.length === 0 && (
                <p className="text-sm text-slate-500 text-center py-4">Belum ada kuis untuk kelas ini.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modal Ubah Kata Sandi */}
      {showPasswordModal && (
        <ChangePasswordModal
          isOpen={showPasswordModal}
          onClose={() => setShowPasswordModal(false)}
        />
      )}
    </div>
  );
}
