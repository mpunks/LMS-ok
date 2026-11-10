import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Menu, 
  X, 
  LogOut, 
  LayoutDashboard, 
  Users, 
  BookOpen, 
  CheckSquare, 
  BarChart, 
  Settings, 
  Database, 
  KeyRound, 
  RefreshCw, 
  Smartphone, 
  FileCheck,
  Cpu,
  Terminal,
  Brain,
  Code2,
  Sparkles,
  ShieldCheck,
  Binary
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useGasStore } from '@/store/gasStore';
import { useDataStore } from '@/store/dataStore';
import { toast } from '@/components/ui/Toast';
import { motion, AnimatePresence } from 'motion/react';
import ChangePasswordModal from '@/components/common/ChangePasswordModal';
import { PWAInstallButton } from '@/components/common/PWAInstallButton';

const adminNav = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { name: 'Kelola Tim Admin', href: '/admin/users', icon: Users },
  { name: 'Guru & Siswa', href: '/admin/students', icon: Users },
  { name: 'Pengaturan rafx2', href: '/admin/settings', icon: Settings },
  { name: 'Integrasi Database GAS', href: '/admin/gas', icon: Database },
  { name: 'Aplikasi Mobile (PWA)', href: '/admin/android', icon: Smartphone },
];

const teacherNav = [
  { name: 'Dashboard', href: '/teacher', icon: LayoutDashboard },
  { name: 'Materi Informatika', href: '/teacher/materials', icon: Code2 },
  { name: 'Tugas Masuk', href: '/teacher/assignments', icon: FileCheck },
  { name: 'Kuis & CBT AI', href: '/teacher/quizzes', icon: CheckSquare },
  { name: 'Rekap Nilai Siswa', href: '/teacher/grades', icon: BarChart },
  { name: 'Presensi / Absensi', href: '/teacher/attendance', icon: Users },
];

const studentNav = [
  { name: 'Dashboard', href: '/student', icon: LayoutDashboard },
  { name: 'Materi Informatika', href: '/student/materials', icon: Code2 },
  { name: 'Tugas & Kuis CBT', href: '/student/quizzes', icon: CheckSquare },
  { name: 'Evaluasi & Nilai', href: '/student/grades', icon: BarChart },
];

export function MainLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 768);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [isCheckingGas, setIsCheckingGas] = useState(false);
  const { user, logout } = useAuthStore();
  const { appName, appLogo } = useSettingsStore();
  const { isConnected, testConnection } = useGasStore();
  const { pullAllFromServer, assignments = [], users = [], materials = [] } = useDataStore();
  const location = useLocation();
  const navigate = useNavigate();

  // Auto-close menu on route change only on mobile
  useEffect(() => {
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // Submissions count for teacher nav badge
  const assignedClasses = user?.assignedClasses || [];
  const teacherSubmissions = assignments.filter(a => {
    const student = users.find(u => u.id === a.studentId || (u.nisn && u.nisn === a.studentId));
    if (student?.classId && (Array.isArray(assignedClasses) ? assignedClasses.includes(student.classId) : false)) return true;
    const material = materials.find(m => m.id === a.materialId);
    if (material && (material.teacherId === user?.id || (material as any).teacherNik === user?.nik || material.subjectId === user?.subject)) return true;
    return false;
  });
  const pendingSubmissionsCount = teacherSubmissions.filter(a => a.grade === undefined || a.grade === null || a.grade === '').length;

  const teacherNavWithBadge = [
    { name: 'Dashboard', href: '/teacher', icon: LayoutDashboard },
    { name: 'Materi Informatika', href: '/teacher/materials', icon: Code2 },
    { 
      name: 'Tugas Siswa Masuk', 
      href: '/teacher/assignments', 
      icon: FileCheck,
      badge: pendingSubmissionsCount > 0 ? `${pendingSubmissionsCount} Baru` : (teacherSubmissions.length > 0 ? `${teacherSubmissions.length}` : undefined)
    },
    { name: 'Kuis & CBT Cerdas', href: '/teacher/quizzes', icon: CheckSquare },
    { name: 'Rekap Nilai Siswa', href: '/teacher/grades', icon: BarChart },
    { name: 'Presensi / Absensi', href: '/teacher/attendance', icon: Users },
  ];

  const navItems = 
    user?.role === 'SUPER_ADMIN' 
      ? [
          ...adminNav,
          { name: 'Reset Database', href: '/admin/database', icon: Database, isDanger: true, badge: 'Super Admin' }
        ]
      : user?.role === 'ADMIN' 
        ? adminNav 
        : user?.role === 'TEACHER' 
          ? teacherNavWithBadge 
          : studentNav;

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col md:flex-row overflow-hidden cyber-grid selection:bg-cyan-500 selection:text-black">
      {/* Header: Mobile Top Bar with Logo, User info & Easy Logout */}
      <header 
        id="main-top-header"
        className="md:hidden bg-[#0a0f1d]/90 backdrop-blur-md border-b border-cyan-500/20 px-3.5 h-14 sticky top-0 z-30 flex items-center justify-between shadow-lg shrink-0"
      >
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-1.5 -ml-1 text-slate-300 hover:text-cyan-400 rounded-lg hover:bg-slate-800/60 transition-colors"
            title="Buka Menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 font-bold text-sm truncate">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500 via-indigo-600 to-purple-600 p-0.5 flex items-center justify-center shrink-0">
              <div className="w-full h-full bg-[#070b14] rounded-[6px] flex items-center justify-center">
                <Cpu className="w-3.5 h-3.5 text-cyan-400" />
              </div>
            </div>
            <span className="font-extrabold text-white tracking-tight glow-text-cyan">rafx2 LMS</span>
            <span className="text-[10px] font-mono text-cyan-400 px-1.5 py-0.2 rounded bg-cyan-950/60 border border-cyan-500/30">Informatika</span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold text-rose-300 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/30 transition-colors shadow-2xs cursor-pointer"
            title="Keluar dari akun"
          >
            <LogOut className="w-3.5 h-3.5 text-rose-400" />
            <span>Keluar</span>
          </button>
        </div>
      </header>

      {/* Mobile Backdrop */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        className={cn(
          "fixed top-0 left-0 z-50 h-screen w-64 bg-[#0a0f1d] border-r border-cyan-500/20 flex flex-col transition-transform duration-300 ease-in-out shadow-2xl backdrop-blur-xl",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-slate-800/80 bg-[#080d19]/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-400 via-indigo-500 to-purple-600 p-0.5 shadow-md shadow-cyan-500/20 flex items-center justify-center shrink-0">
              <div className="w-full h-full bg-[#0a0f1d] rounded-[10px] flex items-center justify-center">
                <Cpu className="w-5 h-5 text-cyan-400 animate-pulse" />
              </div>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base tracking-tight text-white glow-text-cyan">rafx2</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">LMS</span>
              </div>
              <p className="text-[9px] text-cyan-400/80 tracking-widest font-mono uppercase">Informatika & AI Hub</p>
            </div>
          </div>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="p-1 text-slate-400 hover:text-white md:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Card */}
        <div className="p-4 border-b border-slate-800/80 bg-[#090e1c]/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-indigo-600/30 border border-cyan-500/40 flex items-center justify-center text-cyan-300 font-mono font-bold text-sm uppercase shrink-0 shadow-inner">
              {user?.name?.substring(0, 2) || 'RX'}
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="font-bold text-sm text-slate-100 truncate">{user?.name}</span>
              <div className="flex items-center gap-1.5 text-[11px] text-cyan-400/90 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
                <span className="capitalize truncate">
                  {user?.role === 'STUDENT' ? (user?.classId ? `Kelas ${user.classId}` : 'Siswa Informatika') : user?.role.toLowerCase().replace('_', ' ')}
                </span>
              </div>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setShowChangePassword(true)}
              className="text-[11px] text-cyan-300 hover:text-white bg-cyan-950/40 hover:bg-cyan-900/50 px-2 py-1.5 rounded-lg border border-cyan-500/30 transition-colors flex items-center gap-1.5 justify-center font-medium truncate cursor-pointer"
              title="Ganti kata sandi akun Anda"
            >
              <KeyRound className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span className="truncate">Kata Sandi</span>
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="text-[11px] text-rose-300 hover:text-white bg-rose-950/40 hover:bg-rose-900/60 px-2 py-1.5 rounded-lg border border-rose-500/40 transition-colors flex items-center gap-1.5 justify-center font-bold truncate shadow-xs cursor-pointer"
              title="Keluar dari akun Anda"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              <span>Keluar</span>
            </button>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto py-3 px-2.5 flex flex-col gap-1">
          <div className="px-3 py-1 text-[10px] font-mono font-bold tracking-wider text-slate-500 uppercase">
            Menu Pembelajaran
          </div>
          {navItems.map((item: any) => {
            const isActive = location.pathname === item.href || location.pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex items-center justify-between px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all group",
                  isActive
                    ? (item.isDanger 
                        ? "bg-rose-950/50 text-rose-300 border border-rose-500/40 shadow-xs" 
                        : "bg-gradient-to-r from-cyan-950/70 via-indigo-950/50 to-slate-900 text-cyan-300 border border-cyan-500/40 shadow-xs font-semibold glow-cyan")
                    : (item.isDanger 
                        ? "text-rose-400 hover:bg-rose-950/30" 
                        : "text-slate-400 hover:bg-slate-800/50 hover:text-cyan-200")
                )}
              >
                <div className="flex items-center gap-2.5">
                  <item.icon className={cn(
                    "w-4 h-4 sm:w-4.5 sm:h-4.5 transition-colors", 
                    isActive 
                      ? (item.isDanger ? "text-rose-400" : "text-cyan-400") 
                      : (item.isDanger ? "text-rose-400/70" : "text-slate-500 group-hover:text-cyan-400")
                  )} />
                  <span>{item.name}</span>
                </div>
                {item.badge && (
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-cyan-900/60 text-cyan-300 border border-cyan-500/30">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Database Status Chip */}
        <div className="px-4 py-2.5 bg-[#080d19] border-t border-slate-800/80">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <span className="flex h-2 w-2 relative shrink-0">
                {isConnected && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                )}
                <span className={cn("relative inline-flex rounded-full h-2 w-2", isConnected ? "bg-cyan-400" : "bg-amber-400")}></span>
              </span>
              <span className={cn("font-mono text-[10px] truncate", isConnected ? "text-cyan-300 font-medium" : "text-amber-300")}>
                {isConnected ? 'Database GAS: Terhubung' : 'GAS: Menyinkronkan...'}
              </span>
            </div>
            <button
              type="button"
              disabled={isCheckingGas}
              onClick={async () => {
                setIsCheckingGas(true);
                try {
                  const ok = await testConnection();
                  await pullAllFromServer();
                  if (ok) {
                    toast.success('Koneksi Google Sheets Aktif & Tersinkron!');
                  } else {
                    toast.info('Status koneksi diperbarui dari server.');
                  }
                } finally {
                  setIsCheckingGas(false);
                }
              }}
              className="text-[10px] font-mono text-cyan-400 hover:text-cyan-200 underline cursor-pointer disabled:opacity-50 flex items-center gap-1"
              title="Cek & Sinkronkan Koneksi Google Sheets"
            >
              {isCheckingGas ? <RefreshCw className="w-2.5 h-2.5 animate-spin" /> : 'Sync'}
            </button>
          </div>
        </div>

        {/* PWA Mobile Shortcut */}
        <div className="p-3 border-t border-slate-800/80 bg-[#070b14]/60 space-y-1.5">
          <div className="text-[10px] font-mono text-slate-400 px-1 uppercase tracking-wider flex items-center gap-1">
            <Smartphone className="w-3 h-3 text-cyan-400" /> Aplikasi HP:
          </div>
          <PWAInstallButton variant="dual" className="w-full justify-between" />
        </div>

        {/* Bottom Profile Actions */}
        <div className="p-3 border-t border-slate-800/80 bg-[#080d19] space-y-1">
          <button
            type="button"
            onClick={() => setShowChangePassword(true)}
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-cyan-300 hover:bg-slate-800/50 w-full transition-colors"
          >
            <KeyRound className="w-3.5 h-3.5 text-slate-500" />
            Ubah Kata Sandi
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium text-rose-400 hover:bg-rose-950/40 w-full transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Keluar Akun
          </button>
        </div>
      </motion.aside>

      {/* Main Content Area */}
      <main 
        id="main-content-canvas"
        className={cn(
          "flex-1 w-full min-h-screen overflow-x-hidden transition-all duration-300",
          isSidebarOpen 
            ? "md:ml-64 max-w-7xl mx-auto p-4 md:p-8" 
            : "ml-0 max-w-none p-4 md:p-8 lg:p-10 pt-16 md:pt-8"
        )}
      >
        {/* Desktop Top Header Bar with Easy Access Logout & AI Badge */}
        <div className="hidden md:flex items-center justify-between mb-6 pb-3 border-b border-cyan-500/20 bg-[#0d1527]/80 backdrop-blur-md -mt-2 px-5 py-3 rounded-2xl shadow-xl">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-700/80 bg-[#0a0f1d] hover:bg-slate-800 text-slate-300 hover:text-cyan-400 text-xs font-semibold shadow-xs transition-all hover:border-cyan-500/40 cursor-pointer"
              title={isSidebarOpen ? "Sembunyikan Menu Navigasi" : "Buka Menu Navigasi"}
            >
              <Menu className="w-4 h-4 text-cyan-400" />
              <span>{isSidebarOpen ? "Sembunyikan Panel" : "Buka Panel"}</span>
            </button>

            <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-xs font-mono text-cyan-300">
              <Code2 className="w-3.5 h-3.5 text-cyan-400" />
              <span>Mata Pelajaran: <strong>Informatika</strong></span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5 px-3 py-1 bg-[#0a0f1d] border border-slate-800 rounded-xl shadow-xs">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500 to-indigo-600 flex items-center justify-center text-white font-mono font-bold text-xs uppercase shrink-0">
                {user?.name?.substring(0, 2) || 'RX'}
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-slate-100 leading-tight truncate max-w-[160px]">{user?.name}</p>
                <p className="text-[10px] text-cyan-400 font-mono">
                  {user?.role === 'STUDENT' ? (user?.classId ? `Kelas ${user.classId}` : 'Siswa Informatika') : user?.role.toLowerCase().replace('_', ' ')}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-rose-500/40 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 font-bold text-xs shadow-xs transition-all cursor-pointer"
              title="Keluar dari akun (Logout)"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-400" />
              <span>Keluar Akun</span>
            </button>
          </div>
        </div>
        {children}
      </main>

      {/* Modal Ubah Kata Sandi */}
      {showChangePassword && (
        <ChangePasswordModal
          isOpen={showChangePassword}
          onClose={() => setShowChangePassword(false)}
        />
      )}
    </div>
  );
}
