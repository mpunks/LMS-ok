import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, LogOut, LayoutDashboard, Users, BookOpen, CheckSquare, BarChart, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { useSettingsStore } from '@/store/settingsStore';
import { motion, AnimatePresence } from 'motion/react';

const adminNav = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { name: 'Kelola Tim Admin', href: '/admin/users', icon: Users },
  { name: 'Guru & Siswa', href: '/admin/students', icon: Users },
  { name: 'Pengaturan Aplikasi', href: '/admin/settings', icon: Settings },
  { name: 'Integrasi GAS', href: '/admin/gas', icon: Settings },
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
  const { user, logout } = useAuthStore();
  const { appName, appLogo } = useSettingsStore();
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
    user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN' ? adminNav :
    user?.role === 'TEACHER' ? teacherNav :
    studentNav;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row overflow-hidden">
      {/* Mobile Header (Now acts as top bar for all screens when sidebar is closed, or always visible) */}
      <header className={cn("flex items-center justify-between bg-white border-b border-slate-200 px-4 h-16 sticky top-0 z-30 transition-all", isSidebarOpen ? "md:hidden" : "")}>
        <div className="flex items-center gap-2 text-indigo-600 font-bold text-xl">
          {appLogo ? <img src={appLogo} alt="Logo" className="w-8 h-8 rounded" /> : <BookOpen className="w-6 h-6" />}
          {appName}
        </div>
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="p-2 -mr-2 text-slate-600 hover:text-slate-900 focus:outline-none"
        >
          <Menu className="w-6 h-6" />
        </button>
      </header>

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

        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm uppercase">
              {user?.name?.substring(0, 2) || 'U'}
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-sm text-slate-800 truncate w-36">{user?.name}</span>
              <span className="text-xs text-slate-500 capitalize">{user?.role.toLowerCase().replace('_', ' ')}</span>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 flex flex-col gap-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.href || location.pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                )}
              >
                <item.icon className={cn("w-5 h-5", isActive ? "text-indigo-600" : "text-slate-400")} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-rose-600 hover:bg-rose-50 w-full transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Keluar Akun
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className={cn(
        "flex-1 max-w-7xl mx-auto w-full p-4 md:p-8 md:pt-8 min-h-[calc(100vh-4rem)] md:min-h-screen overflow-x-hidden transition-all duration-300",
        isSidebarOpen ? "md:ml-64" : "ml-0"
      )}>
        {/* Toggle Button for Desktop when sidebar is open */}
        <div className={cn("hidden md:flex items-center mb-6", isSidebarOpen ? "block" : "hidden")}>
           <button
             onClick={() => setIsSidebarOpen(false)}
             className="p-2 -ml-2 text-slate-500 hover:text-slate-800 focus:outline-none"
             title="Tutup Menu"
           >
             <Menu className="w-6 h-6" />
           </button>
        </div>
        {children}
      </main>
    </div>
  );
}
