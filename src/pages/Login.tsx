import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { BookOpen, KeyRound, User, Lock } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent } from '@/components/ui/Card';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { useGasStore } from '@/store/gasStore';
import { useDataStore } from '@/store/dataStore';
import { toast } from '@/components/ui/Toast';

export default function Login() {
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get('tab') === 'teacher' ? 'teacher' : 'student';
  const [activeTab, setActiveTab] = useState<'student' | 'teacher'>(defaultTab);
  
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const { webhookUrl, executeAction } = useGasStore();
  const { users } = useDataStore();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const cleanWebhook = webhookUrl?.trim();
    let loginSuccess = false;

    if (cleanWebhook && cleanWebhook.includes('script.google.com/macros/s/')) {
      try {
        const res = await executeAction('login', { identifier, password, role: activeTab });
        
        if (res && res.success && res.user) {
          login(res.user);
          toast.success('Berhasil masuk');
          navigate(res.user.role === 'SUPER_ADMIN' || res.user.role === 'ADMIN' ? '/admin' : (res.user.role === 'TEACHER' ? '/teacher' : '/student'));
          loginSuccess = true;
        }
      } catch (err) {
        console.warn('GAS Auth fallback triggered:', err);
      }
    }

    if (!loginSuccess) {
      // Local fallback verification
      // 1. Super Admin default check
      if (activeTab === 'teacher' && identifier === 'rafx2' && password === 'Asepst007@') {
        const saUser = { id: 'sa-1', role: 'SUPER_ADMIN' as const, name: 'Super Administrator', username: 'rafx2' };
        login(saUser);
        toast.success('Berhasil masuk sebagai Super Administrator');
        navigate('/admin');
        setIsLoading(false);
        return;
      }

      // 2. Check local users in dataStore
      const matchedUser = users.find(u => {
        if (activeTab === 'teacher') {
          const isStaff = u.role === 'TEACHER' || u.role === 'ADMIN' || u.role === 'SUPER_ADMIN';
          const matchId = u.username === identifier || u.nik === identifier || u.id === identifier;
          const matchPass = (u.password ? u.password === password : (u.nik === password || password === '123456'));
          return isStaff && matchId && matchPass;
        } else {
          const isStudent = u.role === 'STUDENT';
          const matchId = u.nisn === identifier || u.username === identifier || u.id === identifier;
          const matchPass = (u.password ? u.password === password : (u.nisn === password || password === '123456'));
          return isStudent && matchId && matchPass;
        }
      });

      if (matchedUser) {
        login(matchedUser);
        toast.success(`Selamat datang kembali, ${matchedUser.name}`);
        navigate(matchedUser.role === 'SUPER_ADMIN' || matchedUser.role === 'ADMIN' ? '/admin' : (matchedUser.role === 'TEACHER' ? '/teacher' : '/student'));
      } else {
        if (!cleanWebhook) {
          toast.error('Kredensial tidak valid atau akun belum terdaftar.');
        } else {
          toast.error('Kredensial tidak valid atau koneksi ke server GAS bermasalah.');
        }
      }
    }
    
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center text-indigo-600 mb-6">
          <BookOpen className="w-12 h-12" />
        </div>
        <h2 className="text-center text-3xl font-extrabold text-slate-900">
          Masuk ke Portal
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600">
          Silakan masuk sesuai dengan peran Anda
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <Card>
          {/* Tabs */}
          <div className="flex border-b border-slate-200">
            <button
              onClick={() => setActiveTab('student')}
              className={cn(
                "flex-1 py-4 text-sm font-medium text-center transition-colors",
                activeTab === 'student' ? "bg-white text-indigo-600 border-b-2 border-indigo-600" : "bg-slate-50 text-slate-500 hover:text-slate-700"
              )}
            >
              Portal Siswa
            </button>
            <button
              onClick={() => setActiveTab('teacher')}
              className={cn(
                "flex-1 py-4 text-sm font-medium text-center transition-colors",
                activeTab === 'teacher' ? "bg-white text-indigo-600 border-b-2 border-indigo-600" : "bg-slate-50 text-slate-500 hover:text-slate-700"
              )}
            >
              Guru & Admin
            </button>
          </div>

          <CardContent className="pt-6">
            <form onSubmit={handleLogin} className="space-y-6">
              <Input
                label={activeTab === 'student' ? 'NISN (Nomor Induk Siswa Nasional)' : 'ID / Username / NIK'}
                placeholder={activeTab === 'student' ? 'Masukkan NISN...' : 'Masukkan identitas...'}
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
                icon={<User className="w-4 h-4 text-slate-400" />}
              />
              <Input
                label="Kata Sandi"
                type="password"
                placeholder="Masukkan kata sandi..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                icon={<Lock className="w-4 h-4 text-slate-400" />}
              />
              
              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                  <span className="text-slate-600">Ingat Saya</span>
                </label>
                <a href="#" className="text-indigo-600 hover:text-indigo-500 font-medium">Lupa sandi?</a>
              </div>

              <Button type="submit" className="w-full" size="lg" isLoading={isLoading}>
                Masuk ke Sistem <KeyRound className="w-4 h-4 ml-2" />
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
