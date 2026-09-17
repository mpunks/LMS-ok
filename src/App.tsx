import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { ToastContainer } from './components/ui/Toast';
import { MainLayout } from './components/layout/MainLayout';
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import GASConfig from './pages/admin/GASConfig';
import AdminUsers from './pages/admin/AdminUsers';
import AdminStudents from './pages/admin/AdminStudents';

// Teacher Pages
import TeacherDashboard from './pages/teacher/TeacherDashboard';
import TeacherMaterials from './pages/teacher/TeacherMaterials';
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
      <ToastContainer />
    </BrowserRouter>
  );
}
