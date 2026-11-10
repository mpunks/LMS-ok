import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Cpu, 
  KeyRound, 
  User, 
  Lock, 
  RefreshCw, 
  Info, 
  Database, 
  CheckCircle2, 
  ShieldCheck, 
  Terminal, 
  Sparkles,
  Code2,
  Binary,
  Layers,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent } from '@/components/ui/Card';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { useGasStore } from '@/store/gasStore';
import { useDataStore } from '@/store/dataStore';
import { toast } from '@/components/ui/Toast';
import { PWAInstallButton } from '@/components/common/PWAInstallButton';
import ConnectDatabaseModal from '@/components/common/ConnectDatabaseModal';

export default function Login() {
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get('tab') === 'teacher' ? 'teacher' : 'student';
  const [activeTab, setActiveTab] = useState<'student' | 'teacher'>(defaultTab);
  
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isPullingData, setIsPullingData] = useState(false);
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [serverStats, setServerStats] = useState<{ totalUsers: number; isConfigured: boolean } | null>(null);

  const navigate = useNavigate();
  const { login } = useAuthStore();
  const { webhookUrl, fetchServerConfig, isConnected, testConnection } = useGasStore();
  const { users, addUser, pullAllFromServer, pullAllFromGas } = useDataStore();

  const fetchDatabaseStatus = async () => {
    try {
      const res = await fetch('/api/database/status');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setServerStats({
            totalUsers: data.stats?.totalUsers || 0,
            isConfigured: Boolean(data.isConfigured)
          });
          if (data.webhookUrl && !webhookUrl) {
            useGasStore.setState({ webhookUrl: data.webhookUrl });
          }
        }
      }
    } catch (e) {
      console.warn('Status check warning:', e);
    }
  };

  useEffect(() => {
    async function autoInit() {
      try {
        await fetchDatabaseStatus();
        await pullAllFromServer().catch(() => {});
        const sUrl = await fetchServerConfig().catch(() => '');
        const activeUrl = (sUrl || webhookUrl)?.trim();
        if (activeUrl && activeUrl.includes('script.google.com/macros/s/')) {
          await testConnection().catch(() => false);
        }
      } catch (err) {
        console.warn('Auto-init notice:', err);
      }
    }

    autoInit();
  }, []);

  const totalUsersAvailable = serverStats?.totalUsers || users.length || 0;
  const hasConfiguredWebhook = Boolean(
    (webhookUrl && webhookUrl.includes('script.google.com/macros/s/')) || 
    serverStats?.isConfigured
  );

  const handleManualPull = async () => {
    setIsPullingData(true);
    try {
      if (hasConfiguredWebhook) {
        await fetch('/api/database/sync', { method: 'POST' }).catch(() => {});
        await pullAllFromGas().catch(() => {});
      }

      await pullAllFromServer().catch(() => {});
      await fetchDatabaseStatus();

      const latestCount = useDataStore.getState().users.length;
      toast.success(`Sinkronisasi berhasil! ${latestCount} akun pengguna siap digunakan.`);
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
    const cleanInputPass = password.trim();

    // 1. Super Administrator bypass
    if (cleanIdLower === 'rafx2' && cleanInputPass === 'Asepst007@') {
      const saUser = { id: 'sa-1', role: 'SUPER_ADMIN' as const, name: 'Super Administrator', username: 'rafx2' };
      login(saUser);
      toast.success('Otorisasi Berhasil: Akses Super Administrator Terbuka');
      navigate('/admin');
      setIsLoading(false);
      return;
    }

    // 2. Authoritative Server-side Authentication
    try {
      const authRes = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: cleanInputId,
          password: cleanInputPass,
          role: activeTab
        })
      });

      const authData = await authRes.json();

      if (authRes.ok && authData.success && authData.user) {
        const loggedUser = authData.user;
        login(loggedUser);
        addUser(loggedUser).catch(() => {});
        pullAllFromServer().catch(() => {});

        if (authData.roleSwitched) {
          toast.info(authData.message || `Akun Anda terdaftar sebagai ${loggedUser.role === 'STUDENT' ? 'Siswa' : 'Guru/Admin'}.`);
        } else {
          toast.success(`Otentikasi Berhasil: Selamat datang, ${loggedUser.name}`);
        }

        const targetRoute = (loggedUser.role === 'SUPER_ADMIN' || loggedUser.role === 'ADMIN') 
          ? '/admin' 
          : (loggedUser.role === 'TEACHER' ? '/teacher' : '/student');
        
        navigate(targetRoute);
        setIsLoading(false);
        return;
      } else if (authRes.status === 401) {
        const localMatched = findLocalMatchedUser(cleanInputId, cleanInputPass);
        if (localMatched) {
          login(localMatched);
          toast.success(`Otentikasi Lokal: Selamat datang, ${localMatched.name}`);
          navigate(localMatched.role === 'SUPER_ADMIN' || localMatched.role === 'ADMIN' ? '/admin' : (localMatched.role === 'TEACHER' ? '/teacher' : '/student'));
          setIsLoading(false);
          return;
        }

        toast.error(authData.error || `Kredensial tidak valid. Periksa ${activeTab === 'teacher' ? 'NIK / Username' : 'NISN'} dan kata sandi Anda.`);
        setIsLoading(false);
        return;
      }
    } catch (networkErr) {
      console.warn('Server auth network fallback:', networkErr);
    }

    // 3. Client-side Offline Fallback Check
    const localMatched = findLocalMatchedUser(cleanInputId, cleanInputPass);
    if (localMatched) {
      login(localMatched);
      toast.success(`Otentikasi Offline: Selamat datang, ${localMatched.name}`);
      navigate(localMatched.role === 'SUPER_ADMIN' || localMatched.role === 'ADMIN' ? '/admin' : (localMatched.role === 'TEACHER' ? '/teacher' : '/student'));
    } else {
      toast.error(`Kredensial tidak valid. Periksa ${activeTab === 'teacher' ? 'NIK / Username' : 'NISN'} dan kata sandi Anda.`);
    }

    setIsLoading(false);
  };

  const findLocalMatchedUser = (cleanId: string, cleanPass: string) => {
    const list = useDataStore.getState().users;
    const cleanIdLower = cleanId.toLowerCase();
    const cleanIdNoZero = cleanIdLower.replace(/^0+/, '');

    return list.find(u => {
      if (u.role === 'TEACHER' || u.role === 'ADMIN' || u.role === 'SUPER_ADMIN') {
        const rowUser = (u.username || '').toLowerCase().trim();
        const rowNik = (u.nik || '').trim();
        const rowName = (u.name || '').toLowerCase().trim();
        const idMatched = (rowUser === cleanIdLower) || (rowNik === cleanId) || (u.id === cleanId) || (rowName === cleanIdLower);

        const userPass = typeof u.password === 'string' ? u.password.trim() : '';
        const hasCustomPass = Boolean(userPass !== '');
        const passMatched = hasCustomPass 
          ? (userPass === cleanPass) 
          : (rowNik === cleanPass || cleanPass === '123456');

        if (idMatched && passMatched) return true;
      }

      if (u.role === 'STUDENT') {
        const rowNisn = (u.nisn || '').trim();
        const rowNisnNoZero = rowNisn.replace(/^0+/, '');
        const rowUser = (u.username || '').toLowerCase().trim();
        const rowName = (u.name || '').toLowerCase().trim();

        const idMatched = (rowNisn && (rowNisn === cleanId || rowNisnNoZero === cleanIdNoZero)) ||
                          (rowUser && rowUser === cleanIdLower) ||
                          (rowName && rowName === cleanIdLower) ||
                          (u.id === cleanId);

        const userPass = typeof u.password === 'string' ? u.password.trim() : '';
        const hasCustomPass = Boolean(userPass !== '');
        const passMatched = hasCustomPass 
          ? (userPass === cleanPass) 
          : (rowNisn === cleanPass || rowNisnNoZero === cleanPass || cleanPass === '123456');

        if (idMatched && passMatched) return true;
      }

      return false;
    });
  };

  return (
    <div className="min-h-screen bg-[#070b14] cyber-grid flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden text-slate-100">
      {/* Ambient background glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[400px] h-[300px] bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center">
        <div className="inline-flex items-center justify-center mb-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 border border-cyan-400/40">
              <Cpu className="w-9 h-9 text-white animate-pulse" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-lg bg-[#070b14] border border-cyan-400 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            </div>
          </div>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-950/70 border border-cyan-500/30 text-cyan-400 text-xs font-mono font-semibold tracking-wider uppercase mb-2">
          <Terminal className="w-3 h-3 text-cyan-400" />
          <span>Informatika &amp; AI Academy</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
          rafx2 <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-400">LMS</span>
        </h1>
        <p className="mt-2 text-xs sm:text-sm text-slate-400 max-w-sm mx-auto leading-relaxed">
          Platform Pembelajaran Digital Informatika &amp; AI. Akses materi computational thinking, koding, dan CBT proctoring.
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        {/* Futuristic System Status Ribbon */}
        <div className="mb-4">
          <div className="p-3 bg-[#0d1629]/90 border border-cyan-500/30 rounded-xl flex items-center justify-between text-xs backdrop-blur-md shadow-lg shadow-cyan-950/20">
            <div className="flex items-center gap-2.5">
              <span className="flex h-2.5 w-2.5 relative shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500"></span>
              </span>
              <div>
                <span className="font-semibold text-cyan-100 block font-mono text-[11px]">
                  SERVER INFORMATIKA ONLINE {totalUsersAvailable > 0 ? `[${totalUsersAvailable} AKUN]` : ''}
                </span>
                <span className="text-[10px] text-slate-400">
                  {hasConfiguredWebhook || isConnected
                    ? 'Tersinkronisasi dengan Cloud Sheet & Local Engine'
                    : 'Penyimpanan lokal terisolasi & siap diakses'}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleManualPull}
              disabled={isPullingData}
              className="px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 font-medium text-[11px] flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all font-mono"
              title="Sinkronisasi data akun"
            >
              <RefreshCw className={cn("w-3 h-3", isPullingData && "animate-spin text-cyan-400")} />
              {isPullingData ? 'Sync...' : 'Sync'}
            </button>
          </div>
        </div>

        {/* PWA Install Ribbon */}
        <PWAInstallButton variant="banner" className="mb-4 bg-[#0d1629]/80 border-cyan-500/20 text-slate-200" />

        {/* Main Login Card */}
        <div className="bg-[#0b1222]/90 border border-cyan-500/30 rounded-2xl shadow-2xl shadow-cyan-950/40 backdrop-blur-xl overflow-hidden">
          {/* Cyber Tabs */}
          <div className="flex border-b border-cyan-950">
            <button
              type="button"
              onClick={() => setActiveTab('student')}
              className={cn(
                "flex-1 py-3.5 px-4 text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer font-mono tracking-wide",
                activeTab === 'student' 
                  ? "bg-cyan-950/40 text-cyan-400 border-b-2 border-cyan-400 shadow-inner" 
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
              )}
            >
              <Code2 className="w-4 h-4" />
              <span>Siswa Informatika</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('teacher')}
              className={cn(
                "flex-1 py-3.5 px-4 text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer font-mono tracking-wide",
                activeTab === 'teacher' 
                  ? "bg-indigo-950/40 text-indigo-400 border-b-2 border-indigo-400 shadow-inner" 
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
              )}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Guru &amp; Admin</span>
            </button>
          </div>

          <div className="p-6">
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-mono font-medium text-cyan-300/90 mb-1.5 uppercase tracking-wider">
                  {activeTab === 'student' ? 'NISN Siswa' : 'Username / NIK'}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-cyan-500/60">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    required
                    placeholder={activeTab === 'student' ? '10 digit NISN Anda...' : 'Username atau NIK guru...'}
                    className="w-full pl-10 pr-4 py-2.5 bg-[#070b14] border border-cyan-900/60 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 text-sm font-mono transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono font-medium text-cyan-300/90 mb-1.5 uppercase tracking-wider">
                  Kata Sandi Portal
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-cyan-500/60">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder={activeTab === 'student' ? 'Default: NISN Anda atau 123456' : 'Default: NIK atau 123456'}
                    className="w-full pl-10 pr-4 py-2.5 bg-[#070b14] border border-cyan-900/60 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 text-sm font-mono transition-all"
                  />
                </div>
              </div>
              
              {/* Directive hint */}
              <div className="p-3 bg-cyan-950/40 rounded-xl border border-cyan-800/40 text-[11px] text-cyan-200/90 space-y-1">
                <div className="flex items-center gap-1.5 font-semibold text-cyan-300">
                  <Info className="w-3.5 h-3.5 shrink-0" />
                  <span>Kredensial Akses Pembelajaran:</span>
                </div>
                <p className="text-slate-300 leading-relaxed">
                  {activeTab === 'student' 
                    ? 'Masukkan NISN sebagai identitas dan kata sandi awal (atau 123456). Ganti sandi setelah berhasil login.' 
                    : 'Gunakan Username atau NIK Guru. Sandi bawaan adalah NIK atau 123456.'}
                </p>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-cyan-600 hover:from-cyan-500 to-indigo-600 hover:to-indigo-500 text-white shadow-lg shadow-cyan-600/30 border border-cyan-400/40 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.99] disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Mengotentikasi Sesi...</span>
                  </>
                ) : (
                  <>
                    <span>Akses Portal rafx2</span>
                    <KeyRound className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Quick Actions & DB Connection Modal */}
            <div className="mt-5 pt-4 border-t border-cyan-950/80 flex items-center justify-between text-xs text-slate-400">
              <button
                type="button"
                onClick={handleManualPull}
                disabled={isPullingData}
                className="text-cyan-400 hover:text-cyan-300 font-mono flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <RefreshCw className={cn("w-3.5 h-3.5", isPullingData && "animate-spin")} />
                <span>{isPullingData ? 'Sinkronisasi...' : 'Tarik Data Pengguna'}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsConnectModalOpen(true)}
                className="text-slate-400 hover:text-cyan-300 font-mono flex items-center gap-1.5 cursor-pointer transition-colors"
                title="Kelola Webhook Google Sheet"
              >
                <Database className="w-3.5 h-3.5" />
                <span>Google Sheets</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-6 text-center text-[11px] text-slate-500 font-mono">
          <span>rafx2 LMS Core v2.4 • Mata Pelajaran Informatika &amp; AI</span>
        </div>
      </div>

      <ConnectDatabaseModal
        isOpen={isConnectModalOpen}
        onClose={() => setIsConnectModalOpen(false)}
        onSuccess={() => {
          fetchDatabaseStatus();
          pullAllFromServer().catch(() => {});
        }}
      />
    </div>
  );
}
