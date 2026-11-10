import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { useGasStore } from './store/gasStore';
import { useDataStore } from './store/dataStore';
import { OfflineIndicator } from './components/common/OfflineIndicator';
import { ToastContainer } from './components/ui/Toast';
import { MainLayout } from './components/layout/MainLayout';
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import GASConfig from './pages/admin/GASConfig';
import AdminUsers from './pages/admin/AdminUsers';
import AdminStudents from './pages/admin/AdminStudents';
import AdminSettings from './pages/admin/AdminSettings';
import AdminDatabaseClean from './pages/admin/AdminDatabaseClean';
import AndroidAppGuide from './pages/admin/AndroidAppGuide';

// Teacher Pages
import TeacherDashboard from './pages/teacher/TeacherDashboard';
import TeacherMaterials from './pages/teacher/TeacherMaterials';
import TeacherAssignments from './pages/teacher/TeacherAssignments';
import TeacherQuizzes from './pages/teacher/TeacherQuizzes';
import TeacherGrades from './pages/teacher/TeacherGrades';
import TeacherAttendance from './pages/teacher/TeacherAttendance';

// Student Pages
import StudentDashboard from './pages/student/StudentDashboard';
import StudentMaterials from './pages/student/StudentMaterials';
import StudentQuizzes from './pages/student/StudentQuizzes';
import StudentQuizCBT from './pages/student/StudentQuizCBT';
import StudentGrades from './pages/student/StudentGrades';

// Protected Route Component
function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: string[] }) {
  const { isAuthenticated, user } = useAuthStore();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <MainLayout>{children}</MainLayout>;
}

export default function App() {
  const { webhookUrl, testConnection, fetchServerConfig, checkAndMaintainConnection } = useGasStore();
  const { pullAllFromServer, processOfflineQueue } = useDataStore();

  useEffect(() => {
    async function initApp() {
      // 1. Fetch server config to obtain shared Google Sheets Webhook URL
      const activeUrl = await fetchServerConfig().catch(() => '');
      const clean = (activeUrl || webhookUrl)?.trim();

      // 2. Direct real-time sync with Google Sheet on every device startup
      try {
        if (clean && clean.includes('script.google.com/macros/s/')) {
          await pullAllFromServer(true);
        } else {
          await pullAllFromServer(false);
        }
        await processOfflineQueue();
      } catch (e) {
        await pullAllFromServer(false).catch(() => {});
      }

      if (clean && clean.includes('script.google.com/macros/s/')) {
        await testConnection().catch(() => {});
      }
    }
    initApp();

    // 3. Real-time Push via Server-Sent Events (SSE) for instant zero-latency sync across all devices
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource('/api/realtime/stream');
      eventSource.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload && payload.type !== 'connected') {
            // Avoid interrupting teacher while actively editing quiz questions
            if (!useDataStore.getState().activeEditingQuizId) {
              pullAllFromServer(false).catch(() => {});
            }
          }
        } catch (e) {}
      };
      eventSource.onerror = () => {
        // EventSource will automatically reconnect in background
      };
    } catch (e) {}

    // 4. Multi-device Active Polling Loop: Pull latest quizzes, schedules & scores every 5 seconds
    const syncInterval = setInterval(() => {
      // Do not interrupt teacher while actively editing quiz questions
      if (!useDataStore.getState().activeEditingQuizId) {
        pullAllFromServer(false).catch(() => {});
      }
      processOfflineQueue().catch(() => {});
    }, 5 * 1000);

    // 5. Persistent Auto-Reconnect Heartbeat: Keep Google Apps Script connected
    const heartbeatInterval = setInterval(() => {
      checkAndMaintainConnection().catch(() => {});
    }, 45 * 1000);

    // 6. Online reconnection sync: trigger fresh pull from Sheet when device comes online
    const handleOnline = () => {
      processOfflineQueue().catch(() => {});
      if (!useDataStore.getState().activeEditingQuizId) {
        pullAllFromServer(true).catch(() => {});
      }
    };
    window.addEventListener('online', handleOnline);

    // 7. Window focus / visibility change / pageshow sync: update instantly when switching back to tab or unlocking phone
    const handleResume = () => {
      if (typeof document !== 'undefined' && document.visibilityState && document.visibilityState !== 'visible') {
        return;
      }
      if (!useDataStore.getState().activeEditingQuizId) {
        pullAllFromServer(false).catch(() => {});
      }
      processOfflineQueue().catch(() => {});
    };
    window.addEventListener('focus', handleResume);
    window.addEventListener('pageshow', handleResume);
    document.addEventListener('visibilitychange', handleResume);

    return () => {
      if (eventSource) eventSource.close();
      clearInterval(syncInterval);
      clearInterval(heartbeatInterval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('focus', handleResume);
      window.removeEventListener('pageshow', handleResume);
      document.removeEventListener('visibilitychange', handleResume);
    };
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        
        {/* Admin Routes */}
        <Route path="/admin" element={
          <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN']}>
            <AdminDashboard />
          </ProtectedRoute>
        } />
        <Route path="/admin/users" element={
          <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN']}>
            <AdminUsers />
          </ProtectedRoute>
        } />
        <Route path="/admin/students" element={
          <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN']}>
            <AdminStudents />
          </ProtectedRoute>
        } />
        <Route path="/admin/gas" element={
          <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
            <GASConfig />
          </ProtectedRoute>
        } />
        <Route path="/admin/settings" element={
          <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
            <AdminSettings />
          </ProtectedRoute>
        } />
        <Route path="/admin/database" element={
          <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
            <AdminDatabaseClean />
          </ProtectedRoute>
        } />
        <Route path="/admin/android" element={
          <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN']}>
            <AndroidAppGuide />
          </ProtectedRoute>
        } />

        {/* Teacher Routes */}
        <Route path="/teacher" element={
          <ProtectedRoute allowedRoles={['TEACHER']}>
            <TeacherDashboard />
          </ProtectedRoute>
        } />
        <Route path="/teacher/materials" element={
          <ProtectedRoute allowedRoles={['TEACHER']}>
            <TeacherMaterials />
          </ProtectedRoute>
        } />
        <Route path="/teacher/assignments" element={
          <ProtectedRoute allowedRoles={['TEACHER', 'SUPER_ADMIN', 'ADMIN']}>
            <TeacherAssignments />
          </ProtectedRoute>
        } />
        <Route path="/teacher/quizzes" element={
          <ProtectedRoute allowedRoles={['TEACHER']}>
            <TeacherQuizzes />
          </ProtectedRoute>
        } />
        <Route path="/teacher/grades" element={
          <ProtectedRoute allowedRoles={['TEACHER']}>
            <TeacherGrades />
          </ProtectedRoute>
        } />
        <Route path="/teacher/attendance" element={
          <ProtectedRoute allowedRoles={['TEACHER']}>
            <TeacherAttendance />
          </ProtectedRoute>
        } />

        {/* Student Routes */}
        <Route path="/student" element={
          <ProtectedRoute allowedRoles={['STUDENT']}>
            <StudentDashboard />
          </ProtectedRoute>
        } />
        <Route path="/student/materials" element={
          <ProtectedRoute allowedRoles={['STUDENT']}>
            <StudentMaterials />
          </ProtectedRoute>
        } />
        <Route path="/student/quizzes" element={
          <ProtectedRoute allowedRoles={['STUDENT']}>
            <StudentQuizzes />
          </ProtectedRoute>
        } />
        <Route path="/student/quizzes/:id" element={
          <ProtectedRoute allowedRoles={['STUDENT']}>
            <StudentQuizCBT />
          </ProtectedRoute>
        } />
        <Route path="/student/grades" element={
          <ProtectedRoute allowedRoles={['STUDENT']}>
            <StudentGrades />
          </ProtectedRoute>
        } />
      </Routes>
      <OfflineIndicator />
      <ToastContainer />
    </BrowserRouter>
  );
}
