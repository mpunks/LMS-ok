import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, LogOut, LayoutDashboard, Users, BookOpen, CheckSquare, BarChart, Settings, Database, KeyRound, RefreshCw, Smartphone } from 'lucide-react';
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
  { name: 'Pengaturan Aplikasi', href: '/admin/settings', icon: Settings },
  { name: 'Integrasi GAS', href: '/admin/gas', icon: Settings },
  { name: 'Aplikasi Android', href: '/admin/android', icon: Smartphone },
];

const teacherNav = [
  { name: 'Dashboard', href: '/teacher', icon: LayoutDashboard },
  { name: 'Materi Belajar', href: '/teacher/materials', icon: BookOpen },
  { name: 'Kuis & CBT', href: '/teacher/quizzes', icon: CheckSquare },
  { name: 'Rekap Nilai', href: '/teacher/grades', icon: BarChart },
  { name: 'Absensi', href: '/teacher/attendance', icon: Users },
];

const studentNav = [
  { name: 'Dashboard', href: '/student', icon: LayoutDashboard },
  { name: 'Materi Belajar', href: '/student/materials', icon: BookOpen },
  { name: 'Tugas & Kuis', href: '/student/quizzes', icon: CheckSquare },
  { name: 'Raport Saya', href: '/student/grades', icon: BarChart },
];

export function MainLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 768);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [isCheckingGas, setIsCheckingGas] = useState(false);
  const { user, logout } = useAuthStore();
  const { appName, appLogo } = useSettingsStore();
  const { isConnected, testConnection } = useGasStore();
  const { pullAllFromServer } = useDataStore();
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

  const navItems = 
    user?.role === 'SUPER_ADMIN' 
      ? [
          ...adminNav,
          { name: 'Bersihkan Database', href: '/admin/database', icon: Database, isDanger: true, badge: 'Super Admin' }
        ]
      : user?.role === 'ADMIN' 
        ? adminNav 
        : user?.role === 'TEACHER' 
          ? teacherNav 
          : studentNav;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row overflow-hidden">
      {/* Header: Completely hidden when menu is hidden so dashboard frame expands fully without top bar obstruction */}
      <header 
        id="main-top-header"
        className={cn(
          "bg-white border-b border-slate-200 px-4 h-16 sticky top-0 z-30 transition-all",
          !isSidebarOpen ? "hidden" : "md:hidden flex items-center justify-between"
        )}
      >
        <div className="flex items-center gap-2 text-indigo-600 font-bold text-xl">
          {appLogo ? <img src={appLogo} alt="Logo" className="w-8 h-8 rounded" /> : <BookOpen className="w-6 h-6" />}
          {appName}
        </div>
        <button
          onClick={() => setIsSidebarOpen(false)}
          className="p-2 -mr-2 text-slate-600 hover:text-slate-900 focus:outline-none"
          title="Tutup Menu"
        >
          <X className="w-6 h-6" />
        </button>
      </header>

      {/* Floating Menu Toggle Button when menu is hidden */}
      {!isSidebarOpen && (
        <motion.button
          id="btn-open-sidebar"
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.85 }}
          transition={{ duration: 0.2 }}
          onClick={() => setIsSidebarOpen(true)}
          className="fixed top-3 left-3 z-40 p-2.5 rounded-xl bg-white/95 hover:bg-white text-slate-700 hover:text-indigo-600 shadow-md hover:shadow-xl border border-slate-200/90 backdrop-blur-md transition-all hover:scale-105 active:scale-95 group flex items-center gap-2"
          title="Buka Menu Navigasi"
          aria-label="Buka Menu Navigasi"
        >
          <Menu className="w-5 h-5 text-slate-600 group-hover:text-indigo-600 transition-colors" />
          <span className="text-xs font-semibold text-slate-700 group-hover:text-indigo-600 pr-1 hidden sm:inline-block transition-all">
            Menu
          </span>
        </motion.button>
      )}

      {/* Mobile Backdrop */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        className={cn(
          "fixed top-0 left-0 z-50 h-screen w-64 bg-white border-r border-slate-200 flex flex-col transition-transform duration-300 ease-in-out",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-200">
          <div className="flex items-center gap-2 text-indigo-600 font-bold text-xl">
            {appLogo ? <img src={appLogo} alt="Logo" className="w-8 h-8 rounded" /> : <BookOpen className="w-6 h-6" />}
            <span>{appName}</span>
          </div>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="p-1 text-slate-500 hover:text-slate-800"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-5 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm uppercase shrink-0">
              {user?.name?.substring(0, 2) || 'U'}
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="font-semibold text-sm text-slate-800 truncate">{user?.name}</span>
              <span className="text-xs text-slate-500 capitalize">{user?.role.toLowerCase().replace('_', ' ')}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowChangePassword(true)}
            className="mt-3 text-xs text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100/90 px-3 py-1.5 rounded-lg border border-indigo-200/70 transition-colors flex items-center gap-2 w-full justify-center font-medium"
            title="Ganti kata sandi akun Anda"
          >
            <KeyRound className="w-3.5 h-3.5 text-indigo-600" />
            Ubah Kata Sandi
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 flex flex-col gap-1">
          {navItems.map((item: any) => {
            const isActive = location.pathname === item.href || location.pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex items-center justify-between px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors",
                  isActive
                    ? (item.isDanger ? "bg-rose-50 text-rose-700 font-semibold" : "bg-indigo-50 text-indigo-700 font-semibold")
                    : (item.isDanger ? "text-rose-600 hover:bg-rose-50/70" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900")
                )}
              >
                <div className="flex items-center gap-3">
                  <item.icon className={cn("w-4 h-4 sm:w-5 sm:h-5", isActive ? (item.isDanger ? "text-rose-600" : "text-indigo-600") : (item.isDanger ? "text-rose-500" : "text-slate-400"))} />
                  <span>{item.name}</span>
                </div>
                {item.badge && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 border border-rose-200 uppercase tracking-wider">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* GAS Database Live Connection Status */}
        <div className="px-4 py-2 bg-slate-50 border-t border-slate-200">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="flex h-2 w-2 relative shrink-0">
                {isConnected && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                )}
                <span className={cn("relative inline-flex rounded-full h-2 w-2", isConnected ? "bg-emerald-500" : "bg-amber-500")}></span>
              </span>
              <span className={cn("font-medium truncate text-[11px]", isConnected ? "text-emerald-700 font-semibold" : "text-amber-700")}>
                {isConnected ? 'Database GAS Aktif' : 'GAS Disinkronkan...'}
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
              className="text-[10px] text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer underline shrink-0 disabled:opacity-50 flex items-center gap-1"
              title="Cek & Sinkronkan Koneksi Google Sheets"
            >
              {isCheckingGas ? <RefreshCw className="w-2.5 h-2.5 animate-spin" /> : 'Cek'}
            </button>
          </div>
        </div>

        {/* Pasang Aplikasi Android Shortcut */}
        <div className="p-3 border-t border-slate-200 bg-indigo-50/40">
          <PWAInstallButton variant="pill" className="w-full justify-center text-center" />
        </div>

        <div className="p-4 border-t border-slate-200 space-y-1">
          <button
            type="button"
            onClick={() => setShowChangePassword(true)}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 w-full transition-colors"
          >
            <KeyRound className="w-4 h-4 text-slate-400" />
            Ubah Kata Sandi
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-rose-600 hover:bg-rose-50 w-full transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Keluar Akun
          </button>
        </div>
      </motion.aside>

      {/* Main Content: Expands fully across the entire screen when menu is hidden */}
      <main 
        id="main-content-canvas"
        className={cn(
          "flex-1 w-full min-h-screen overflow-x-hidden transition-all duration-300",
          isSidebarOpen 
            ? "md:ml-64 max-w-7xl mx-auto p-4 md:p-8" 
            : "ml-0 max-w-none p-4 md:p-8 lg:p-10 pt-16 md:pt-8"
        )}
      >
        {/* Toggle Button for Desktop when sidebar is open */}
        {isSidebarOpen && (
          <div className="hidden md:flex items-center justify-between mb-4 pb-2 border-b border-slate-200/60">
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200/80 bg-white hover:bg-slate-50 text-slate-600 hover:text-indigo-600 text-xs font-medium shadow-xs transition-all hover:border-indigo-200"
              title="Sembunyikan Menu Navigasi (Perbesar Layar Dashboard)"
            >
              <Menu className="w-4 h-4 text-slate-500 hover:text-indigo-600" />
              <span>Sembunyikan Menu (Perbesar Tampilan)</span>
            </button>
          </div>
        )}
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
