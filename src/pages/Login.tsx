import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { BookOpen, KeyRound, User, Lock, RefreshCw, CloudCheck, Info, Database, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent } from '@/components/ui/Card';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { useGasStore } from '@/store/gasStore';
import { useDataStore } from '@/store/dataStore';
import { toast } from '@/components/ui/Toast';
import { PWAInstallButton } from '@/components/common/PWAInstallButton';

export default function Login() {
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get('tab') === 'teacher' ? 'teacher' : 'student';
  const [activeTab, setActiveTab] = useState<'student' | 'teacher'>(defaultTab);
  
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isPullingData, setIsPullingData] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const { webhookUrl, executeAction, fetchServerConfig, isConnected, testConnection } = useGasStore();
  const { users, addUser, pullAllFromGas, pullUsersFromGas, pullAllFromServer } = useDataStore();

  useEffect(() => {
    // Sinkronkan otomatis saat pertama kali web dibuka
    async function autoSyncOnFirstLoad() {
      try {
        await pullAllFromServer().catch(() => {});
        const serverUrl = await fetchServerConfig().catch(() => '');
        const activeUrl = (serverUrl || webhookUrl)?.trim();

        if (activeUrl && activeUrl.includes('script.google.com/macros/s/')) {
          const ok = await testConnection().catch(() => false);
          if (ok) {
            await pullAllFromGas().catch(() => {});
          }
        } else {
          // Bila belum terhubung di browser, minta server melakukan sinkronisasi otomatis
          const res = await fetch('/api/database/sync', { method: 'POST' }).then(r => r.json()).catch(() => null);
          if (res && res.success) {
            await pullAllFromServer().catch(() => {});
            await fetchServerConfig().catch(() => {});
          }
        }
      } catch (err) {
        console.warn('Auto-sync notice on initial boot:', err);
      }
    }

    autoSyncOnFirstLoad();
  }, []);

  const hasConfiguredWebhook = Boolean(webhookUrl && webhookUrl.includes('script.google.com/macros/s/'));

  const handleManualPull = async () => {
    setIsPullingData(true);
    try {
      await fetch('/api/database/sync', { method: 'POST' }).catch(() => {});
      await pullAllFromServer().catch(() => {});
      await pullAllFromGas().catch(() => {});
      const total = useDataStore.getState().users.length;
      toast.success(`Berhasil menyinkronkan database! ${total} akun pengguna siap digunakan.`);
    } catch (err: any) {
      toast.error('Gagal sinkronisasi data: ' + err?.message);
    } finally {
      setIsPullingData(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const cleanInputId = identifier.trim();
    const cleanIdLower = cleanInputId.toLowerCase();
    const cleanIdNoZero = cleanIdLower.replace(/^0+/, '');
    const cleanInputPass = password.trim();

    // 1. Super Admin default credential check (instant access)
    if (activeTab === 'teacher' && cleanIdLower === 'rafx2' && cleanInputPass === 'Asepst007@') {
      const saUser = { id: 'sa-1', role: 'SUPER_ADMIN' as const, name: 'Super Administrator', username: 'rafx2' };
      login(saUser);
      toast.success('Berhasil masuk sebagai Super Administrator');
      navigate('/admin');
      setIsLoading(false);
      return;
    }

    // 2. Ensure Webhook URL is loaded from server in case of fresh browser
    let activeWebhook = webhookUrl?.trim();
    if (!activeWebhook) {
      activeWebhook = await fetchServerConfig();
    }

    let loginSuccess = false;

    // 3. Try Direct Google Apps Script Online Authentication
    if (activeWebhook && activeWebhook.includes('script.google.com/macros/s/')) {
      try {
        const res = await executeAction('login', { 
          identifier: cleanInputId, 
          password: cleanInputPass, 
          role: activeTab 
        });
        
        if (res && res.success && res.user) {
          login(res.user);
          addUser(res.user).catch(() => {});
          pullAllFromGas().catch(() => {});

          toast.success(`Selamat datang, ${res.user.name}`);
          navigate(res.user.role === 'SUPER_ADMIN' || res.user.role === 'ADMIN' ? '/admin' : (res.user.role === 'TEACHER' ? '/teacher' : '/student'));
          loginSuccess = true;
          setIsLoading(false);
          return;
        }
      } catch (err) {
        console.warn('GAS Auth fallback triggered:', err);
      }
    }

    // Helper matcher function
    const findMatchedUser = (list: any[]) => {
      return list.find(u => {
        if (activeTab === 'teacher') {
          const isStaff = u.role === 'TEACHER' || u.role === 'ADMIN' || u.role === 'SUPER_ADMIN';
          const rowUser = (u.username || '').toLowerCase().trim();
          const rowNik = (u.nik || '').trim();
          const idMatched = (rowUser === cleanIdLower) || (rowNik === cleanInputId) || (u.id === cleanInputId);
          
          const hasCustomPass = Boolean(u.password && typeof u.password === 'string' && u.password.trim() !== '');
          const passMatched = hasCustomPass 
            ? (u.password.trim() === cleanInputPass) 
            : (rowNik === cleanInputPass || cleanInputPass === '123456');
          return isStaff && idMatched && passMatched;
        } else {
          const isStudent = u.role === 'STUDENT';
          const rowNisn = (u.nisn || '').trim();
          const rowNisnNoZero = rowNisn.replace(/^0+/, '');
          const rowUser = (u.username || '').toLowerCase().trim();
          
          const idMatched = (rowNisn && (rowNisn === cleanInputId || rowNisnNoZero === cleanIdNoZero)) ||
                            (rowUser && rowUser === cleanIdLower) ||
                            (u.id === cleanInputId);
          
          const hasCustomPass = Boolean(u.password && typeof u.password === 'string' && u.password.trim() !== '');
          const passMatched = hasCustomPass 
            ? (u.password.trim() === cleanInputPass) 
            : (rowNisn === cleanInputPass || rowNisnNoZero === cleanInputPass || cleanInputPass === '123456');
          return isStudent && idMatched && passMatched;
        }
      });
    };

    // 4. Match against dataStore users
    let latestUsers = useDataStore.getState().users;
    let matchedUser = findMatchedUser(latestUsers);

    // 5. If not matched, try querying server & Google Sheets in real-time!
    if (!matchedUser) {
      await pullAllFromServer().catch(() => {});
      latestUsers = useDataStore.getState().users;
      matchedUser = findMatchedUser(latestUsers);

      if (!matchedUser && (activeWebhook || hasConfiguredWebhook)) {
        try {
          await pullAllFromGas();
          await pullAllFromServer();
          latestUsers = useDataStore.getState().users;
          matchedUser = findMatchedUser(latestUsers);
        } catch (e) {}
      }
    }

    if (matchedUser) {
      login(matchedUser);
      pullAllFromGas().catch(() => {});
      toast.success(`Selamat datang kembali, ${matchedUser.name}`);
      navigate(matchedUser.role === 'SUPER_ADMIN' || matchedUser.role === 'ADMIN' ? '/admin' : (matchedUser.role === 'TEACHER' ? '/teacher' : '/student'));
    } else {
      if (!hasConfiguredWebhook && !activeWebhook) {
        toast.error('Database Google Sheet belum terhubung. Hubungkan database terlebih dahulu melalui tombol di atas.');
      } else {
        toast.error(`Kredensial tidak valid. Pastikan ${activeTab === 'teacher' ? 'NIK / Username' : 'NISN'} dan kata sandi Anda sudah sesuai.`);
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
          Silakan masuk sesuai dengan peran Anda di sekolah
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        {/* Database Connection Status Notification */}
        <div className="mb-4">
          {hasConfiguredWebhook || isConnected ? (
            <div className="p-3 bg-emerald-50/90 border border-emerald-200/90 rounded-xl flex items-center justify-between text-xs shadow-xs animate-in fade-in">
              <div className="flex items-center gap-2.5">
                <span className="flex h-2.5 w-2.5 relative shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <div>
                  <span className="font-bold text-emerald-950 block">Terhubung ke Database Google Sheet</span>
                  <span className="text-[10px] text-emerald-700">Tersinkronisasi otomatis untuk semua perangkat</span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleManualPull}
                disabled={isPullingData}
                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-[11px] flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors shrink-0"
                title="Perbarui data dari spreadsheet"
              >
                <RefreshCw className={cn("w-3 h-3", isPullingData && "animate-spin")} />
                {isPullingData ? 'Sinkron...' : 'Sinkronkan'}
              </button>
            </div>
          ) : (
            <div className="p-3 bg-indigo-50/90 border border-indigo-200/90 rounded-xl flex items-center justify-between text-xs shadow-xs animate-in fade-in">
              <div className="flex items-center gap-2.5">
                <RefreshCw className={cn("w-3.5 h-3.5 text-indigo-600 shrink-0", isPullingData ? "animate-spin" : "")} />
                <div>
                  <span className="font-bold text-indigo-950 block">Menghubungkan ke Database Google Sheet...</span>
                  <span className="text-[10px] text-indigo-700">Sinkronisasi otomatis saat pertama kali dibuka</span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleManualPull}
                disabled={isPullingData}
                className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-[11px] flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors shrink-0"
              >
                {isPullingData ? 'Sinkron...' : 'Sinkronkan'}
              </button>
            </div>
          )}
        </div>

        {/* Pasang Aplikasi Android Banner */}
        <PWAInstallButton variant="banner" className="mb-4" />

        <Card className="shadow-lg border-slate-200">
          {/* Tabs */}
          <div className="flex border-b border-slate-200">
            <button
              onClick={() => setActiveTab('student')}
              className={cn(
                "flex-1 py-4 text-sm font-medium text-center transition-colors cursor-pointer",
                activeTab === 'student' ? "bg-white text-indigo-600 border-b-2 border-indigo-600" : "bg-slate-50 text-slate-500 hover:text-slate-700"
              )}
            >
              Portal Siswa
            </button>
            <button
              onClick={() => setActiveTab('teacher')}
              className={cn(
                "flex-1 py-4 text-sm font-medium text-center transition-colors cursor-pointer",
                activeTab === 'teacher' ? "bg-white text-indigo-600 border-b-2 border-indigo-600" : "bg-slate-50 text-slate-500 hover:text-slate-700"
              )}
            >
              Guru & Admin
            </button>
          </div>

          <CardContent className="pt-6">
            <form onSubmit={handleLogin} className="space-y-5">
              <Input
                label={activeTab === 'student' ? 'NISN (Nomor Induk Siswa Nasional)' : 'ID / Username / NIK'}
                placeholder={activeTab === 'student' ? 'Masukkan 10 digit NISN...' : 'Masukkan username atau NIK...'}
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
                icon={<User className="w-4 h-4 text-slate-400" />}
              />
              <Input
                label="Kata Sandi"
                type="password"
                placeholder={activeTab === 'student' ? 'Default: NISN Anda atau 123456' : 'Default: NIK atau 123456'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                icon={<Lock className="w-4 h-4 text-slate-400" />}
              />
              
              <div className="p-3 bg-indigo-50/70 rounded-xl border border-indigo-100 text-[11px] text-indigo-900 space-y-1">
                <div className="flex items-center gap-1.5 font-semibold text-indigo-950">
                  <Info className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span>Petunjuk Masuk Akun:</span>
                </div>
                <p className="text-indigo-800 leading-relaxed">
                  {activeTab === 'student' 
                    ? 'Gunakan NISN sebagai identitas dan kata sandi awal Anda (atau 123456 jika sandi belum diubah).' 
                    : 'Gunakan NIK atau Username. Sandi awal adalah NIK atau 123456.'}
                </p>
              </div>

              <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold" size="lg" isLoading={isLoading}>
                Masuk ke Sistem <KeyRound className="w-4 h-4 ml-2" />
              </Button>
            </form>

            {/* Cloud Sync Helper for Cross-Browser */}
            <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={handleManualPull}
                disabled={isPullingData}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1.5 hover:underline transition-colors cursor-pointer"
                title="Tarik data siswa & guru terbaru yang baru saja diimpor dari perangkat lain"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-indigo-600 ${isPullingData ? 'animate-spin' : ''}`} />
                <span>{isPullingData ? 'Menyinkronkan data database...' : 'Sinkronkan Data Database Google Sheet'}</span>
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
