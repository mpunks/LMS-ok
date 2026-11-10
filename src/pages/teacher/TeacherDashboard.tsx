import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { 
  BookOpen, 
  Users, 
  CheckSquare, 
  GraduationCap, 
  Settings2, 
  Edit3, 
  PlusCircle, 
  ArrowRight,
  ClipboardList,
  Sparkles,
  CalendarCheck2,
  Award,
  KeyRound,
  ShieldAlert,
  FileCheck,
  Clock,
  Cpu
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useDataStore } from '@/store/dataStore';
import { getGradeFromClass } from '@/data/schoolClasses';
import { isItemForClass } from '@/lib/utils';
import ManageTeacherClassesModal from '@/components/teacher/ManageTeacherClassesModal';
import ChangePasswordModal from '@/components/common/ChangePasswordModal';
import { PWAInstallButton } from '@/components/common/PWAInstallButton';

export default function TeacherDashboard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { materials, quizzes, users, assignments = [] } = useDataStore();
  
  const [showClassesModal, setShowClassesModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedGradeFilter, setSelectedGradeFilter] = useState<'ALL' | 7 | 8 | 9>('ALL');

  // Assigned classes from teacher user profile
  const assignedClasses = user?.assignedClasses || [];

  // Filter materials & quizzes related to teacher and assigned classes with flexible matching
  const myMaterials = materials.filter(m => {
    if (!m) return false;
    const matchId = user?.id && m.teacherId === user.id;
    const matchNik = user?.nik && (m.teacherId === user.nik || (m as any).teacherNik === user.nik);
    const matchUser = user?.username && (m.teacherId === user.username || (m as any).teacherUsername === user.username);
    const matchName = user?.name && (m as any).teacherName && String((m as any).teacherName).toLowerCase().trim() === String(user.name).toLowerCase().trim();
    const matchSubject = user?.subject && m.subjectId === user.subject;
    const matchClass = assignedClasses.some(c => isItemForClass(m.classId, m.targetClasses, c));
    return matchId || matchNik || matchUser || matchName || matchSubject || matchClass;
  });

  const myQuizzes = quizzes.filter(q => 
    assignedClasses.some(c => isItemForClass(q.classId, q.targetClasses, c)) || myMaterials.some(m => m.id === q.materialId)
  );

  // Submissions for this teacher's assigned classes or materials
  const teacherSubmissions = assignments.filter(a => {
    const student = users.find(u => u.id === a.studentId || (u.nisn && u.nisn === a.studentId));
    if (student?.classId && assignedClasses.includes(student.classId)) return true;
    const material = materials.find(m => m.id === a.materialId);
    if (material && (material.teacherId === user?.id || (material as any).teacherNik === user?.nik || material.subjectId === user?.subject)) return true;
    return false;
  });
  const ungradedSubmissionsCount = teacherSubmissions.filter(a => a.grade === undefined || a.grade === null || a.grade === '').length;
  const gradedSubmissionsCount = teacherSubmissions.length - ungradedSubmissionsCount;

  // Total students enrolled in the teacher's assigned classes
  const studentsInAssignedClasses = users.filter(
    u => u.role === 'STUDENT' && u.classId && assignedClasses.includes(u.classId)
  );
  const totalStudentsInAssignedClasses = studentsInAssignedClasses.length;
  const maleStudentsCount = studentsInAssignedClasses.filter(s => s.gender !== 'P').length;
  const femaleStudentsCount = studentsInAssignedClasses.filter(s => s.gender === 'P').length;

  // Filter displayed classes
  const filteredAssignedClasses = assignedClasses.filter(c => {
    if (selectedGradeFilter === 'ALL') return true;
    return getGradeFromClass(c) === selectedGradeFilter;
  });

  return (
    <div className="space-y-6">
      {/* Welcome & Header Action Bar - rafx2 LMS */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#070e1e] via-[#0d1b3e] to-[#0a1835] border border-cyan-500/30 p-6 text-white shadow-xl shadow-cyan-950/20">
        <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-1/3 w-60 h-60 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-400/30 text-cyan-300 text-xs font-mono font-semibold">
                <Cpu className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                Pusat Kendali Guru Informatika
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-xs font-semibold text-indigo-200">
                <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                Mapel: Informatika
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-xs text-slate-300">
                <span>{user?.gender === 'P' ? 'Guru Perempuan (P)' : 'Guru Laki-laki (L)'}</span>
              </div>
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-white">Selamat datang, {user?.name}</h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
              Pusat manajemen kurikulum Informatika &amp; AI: kelola modul computational thinking, bank kuis CBT, monitoring integritas ujian, dan evaluasi hasil belajar siswa.
            </p>
          </div>

          <div className="relative z-10 flex flex-wrap items-center gap-2 self-start sm:self-center shrink-0">
            <Button
              onClick={() => setShowPasswordModal(true)}
              className="bg-[#091124] hover:bg-white/10 text-slate-200 font-medium text-xs sm:text-sm gap-1.5 py-2.5 px-3 rounded-xl border border-slate-700 transition-all cursor-pointer"
              title="Ganti kata sandi akun guru Anda"
            >
              <KeyRound className="w-4 h-4 text-cyan-400" />
              Ubah Password
            </Button>
            <Button
              onClick={() => setShowClassesModal(true)}
              className="bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm shadow-md shadow-cyan-600/20 gap-2 py-2.5 px-4 rounded-xl border border-cyan-400/30 transition-transform active:scale-95 cursor-pointer"
            >
              <Edit3 className="w-4 h-4 text-white" />
              Kelola Kelas Informatika
              {assignedClasses.length > 0 && (
                <span className="bg-white/20 text-white text-xs px-2 py-0.5 rounded-full font-bold">
                  {assignedClasses.length}
                </span>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Security Alert: Prompt teacher to change default password */}
      {!user?.password && (
        <div className="p-4 rounded-xl bg-amber-50/90 border border-amber-200/90 text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs animate-in fade-in">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500 text-white shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-xs sm:text-sm text-amber-950">
                Keamanan Akun: Anda masih menggunakan Kata Sandi Bawaan (NIK / 123456)
              </div>
              <p className="text-[11px] sm:text-xs text-amber-800 mt-0.5">
                Demi menjaga kerahasiaan butir soal ujian, kunci jawaban, dan rekap nilai siswa, segera buat kata sandi rahasia Anda sendiri.
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

      {/* Install Mobile App on Android & iPhone Banner */}
      <PWAInstallButton variant="banner" className="shadow-xs" />

      {/* Teaching Assignment Quick Info Ribbon */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
            <Settings2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Status Penugasan & Mapel
              </span>
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                Tahun Ajaran Aktif
              </span>
              {user?.subject && (
                <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                  {user.subject}
                </span>
              )}
            </div>
            <p className="text-sm font-semibold text-slate-900 mt-0.5">
              {assignedClasses.length > 0 ? (
                <>
                  Mengampu <strong>{assignedClasses.length} rombel</strong>: {assignedClasses.join(', ')}
                  <span className="text-xs font-normal text-slate-500 ml-2">
                    ({totalStudentsInAssignedClasses} siswa: {maleStudentsCount} L, {femaleStudentsCount} P)
                  </span>
                </>
              ) : (
                <span className="text-amber-600">Belum ada kelas yang dipilih untuk tahun ajaran ini.</span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowClassesModal(true)}
            className="text-xs gap-1.5 border-slate-300 hover:bg-slate-50 font-medium"
          >
            <Edit3 className="w-3.5 h-3.5 text-slate-500" />
            Ubah Kelas & Mapel
          </Button>
        </div>
      </div>

      {/* Banner Khusus Menu Guru: Tugas Yang Sudah Anak Kumpulkan */}
      <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 rounded-2xl p-5 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0">
            <FileCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-bold">Tugas yang Sudah Anak Kumpulkan</h2>
              {ungradedSubmissionsCount > 0 ? (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-white text-amber-900 shadow-xs">
                  {ungradedSubmissionsCount} Perlu Dinilai
                </span>
              ) : (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-400 text-emerald-950 shadow-xs">
                  Semua Sudah Dinilai
                </span>
              )}
            </div>
            <p className="text-xs text-amber-100 mt-0.5">
              Terdapat <strong>{teacherSubmissions.length} tugas</strong> dikumpulkan oleh anak-anak ({gradedSubmissionsCount} telah diberi nilai, {ungradedSubmissionsCount} menunggu nilai & umpan balik).
            </p>
          </div>
        </div>
        <Button
          onClick={() => navigate('/teacher/assignments')}
          className="bg-white text-amber-800 hover:bg-amber-50 font-bold text-xs gap-2 py-2.5 px-4 rounded-xl shadow-xs self-start md:self-center shrink-0 transition-transform active:scale-95 cursor-pointer"
        >
          <ClipboardList className="w-4 h-4 text-amber-700" />
          Lihat & Nilai Tugas Anak
          <ArrowRight className="w-4 h-4 text-amber-700" />
        </Button>
      </div>

      {/* Stats Summary Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { 
            title: 'Kelas Diampu', 
            value: assignedClasses.length.toString(), 
            subtext: assignedClasses.length > 0 ? `${assignedClasses.length} rombel terdaftar` : 'Klik kelola kelas',
            icon: GraduationCap, 
            color: 'text-indigo-600', 
            bg: 'bg-indigo-50',
            onClick: () => setShowClassesModal(true)
          },
          { 
            title: 'Total Siswa Diampu', 
            value: totalStudentsInAssignedClasses.toString(), 
            subtext: 'Dari seluruh kelas ampu',
            icon: Users, 
            color: 'text-blue-600', 
            bg: 'bg-blue-50' 
          },
          { 
            title: 'Materi Pembelajaran', 
            value: myMaterials.length.toString(), 
            subtext: 'Materi telah diterbitkan',
            icon: BookOpen, 
            color: 'text-emerald-600', 
            bg: 'bg-emerald-50',
            onClick: () => navigate('/teacher/materials')
          },
          { 
            title: 'Tugas Anak Terkumpul', 
            value: teacherSubmissions.length.toString(), 
            subtext: ungradedSubmissionsCount > 0 ? `${ungradedSubmissionsCount} belum dinilai` : 'Semua dinilai',
            icon: FileCheck, 
            color: 'text-amber-600', 
            bg: 'bg-amber-50',
            highlight: ungradedSubmissionsCount > 0,
            onClick: () => navigate('/teacher/assignments')
          },
          { 
            title: 'Kuis & Ujian CBT', 
            value: myQuizzes.length.toString(), 
            subtext: 'Siap dikerjakan siswa',
            icon: CheckSquare, 
            color: 'text-purple-600', 
            bg: 'bg-purple-50',
            onClick: () => navigate('/teacher/quizzes')
          },
        ].map((stat, i) => (
          <Card 
            key={i} 
            onClick={stat.onClick}
            className={`transition-all ${stat.onClick ? 'cursor-pointer hover:shadow-md hover:border-indigo-200' : 'hover:shadow-sm'} ${stat.highlight ? 'border-amber-300 ring-2 ring-amber-200/50' : ''}`}
          >
            <CardContent className="p-4 flex items-center gap-3.5">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${stat.bg} ${stat.color}`}>
                <stat.icon className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-500 truncate">{stat.title}</p>
                <p className="text-xl font-bold text-slate-900 mt-0.5">{stat.value}</p>
                <p className="text-[11px] text-slate-400 mt-0.5 truncate">{stat.subtext}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Section: Kelas yang Diampu */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              Daftar Kelas yang Diampu
              <span className="text-xs font-semibold px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full">
                {assignedClasses.length} Kelas
              </span>
            </h2>
            <p className="text-xs text-slate-500">
              Hanya menampilkan rombongan belajar yang Anda ampu sesuai penugasan sekolah.
            </p>
          </div>

          {/* Grade Quick Filter if teacher teaches multiple grades */}
          {assignedClasses.length > 0 && (
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg self-start sm:self-auto text-xs">
              <button
                onClick={() => setSelectedGradeFilter('ALL')}
                className={`px-3 py-1 rounded-md font-semibold transition ${
                  selectedGradeFilter === 'ALL'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Semua ({assignedClasses.length})
              </button>
              {[7, 8, 9].map((g) => {
                const countInGrade = assignedClasses.filter(c => getGradeFromClass(c) === g).length;
                if (countInGrade === 0) return null;
                return (
                  <button
                    key={g}
                    onClick={() => setSelectedGradeFilter(g as any)}
                    className={`px-3 py-1 rounded-md font-semibold transition ${
                      selectedGradeFilter === g
                        ? 'bg-white text-indigo-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Kelas {g} ({countInGrade})
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Empty State if No Classes Assigned */}
        {assignedClasses.length === 0 ? (
          <Card className="border-dashed border-2 border-slate-300 bg-slate-50/50">
            <CardContent className="p-10 text-center space-y-4 max-w-lg mx-auto">
              <div className="w-16 h-16 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto shadow-xs">
                <GraduationCap className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-slate-900">Belum Ada Kelas yang Diatur</h3>
                <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                  Karena setiap tahun penugasan mengajar dapat berganti, silakan tentukan kelas yang Anda ampu dari daftar kelas <strong>7A-7L, 8A-8L, atau 9A-9K</strong>.
                </p>
              </div>
              <Button
                onClick={() => setShowClassesModal(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold gap-2 py-2.5 px-6 rounded-xl shadow-sm"
              >
                <PlusCircle className="w-4 h-4" />
                Pilih & Kelola Kelas Ampuan Sekarang
              </Button>
            </CardContent>
          </Card>
        ) : (
          /* Cards Grid for Assigned Classes */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredAssignedClasses.map((classId) => {
              const grade = getGradeFromClass(classId);
              const classStudents = users.filter(u => u.role === 'STUDENT' && u.classId === classId);
              const classMaterials = materials.filter(m => isItemForClass(m.classId, m.targetClasses, classId) && (m.teacherId === user?.id || (m as any).teacherNik === user?.nik || (m as any).teacherUsername === user?.username || m.subjectId === user?.subject));
              const classQuizzes = quizzes.filter(q => isItemForClass(q.classId, q.targetClasses, classId));
              const classSubmissions = assignments.filter(a => classStudents.some(s => s.id === a.studentId || (s.nisn && s.nisn === a.studentId)));

              // Grade badge color themes
              const gradeStyles = grade === 7 
                ? { badge: 'bg-blue-50 text-blue-700 border-blue-200', border: 'hover:border-blue-300' }
                : grade === 8 
                ? { badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', border: 'hover:border-emerald-300' }
                : { badge: 'bg-purple-50 text-purple-700 border-purple-200', border: 'hover:border-purple-300' };

              return (
                <Card 
                  key={classId} 
                  className={`border border-slate-200 hover:shadow-md transition-all ${gradeStyles.border} bg-white flex flex-col justify-between`}
                >
                  <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white font-extrabold text-base flex items-center justify-center shadow-xs">
                          {classId}
                        </div>
                        <div>
                          <CardTitle className="text-base font-bold text-slate-900">
                            Kelas {classId}
                          </CardTitle>
                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded border inline-block mt-0.5 ${gradeStyles.badge}`}>
                            Tingkat {grade === 7 ? 'VII (Tujuh)' : (grade === 8 ? 'VIII (Delapan)' : 'IX (Sembilan)')}
                          </span>
                        </div>
                      </div>

                      <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100">
                        Diampu
                      </span>
                    </div>
                  </CardHeader>

                  <CardContent className="p-4 space-y-4 flex-1 flex flex-col justify-between">
                    {/* Class Stats Summary */}
                    <div className="grid grid-cols-3 gap-2 py-2 bg-slate-50 rounded-xl p-2 text-center border border-slate-100">
                      <div>
                        <p className="text-[10px] text-slate-500 font-medium">Siswa</p>
                        <p className="text-base font-bold text-slate-800">{classStudents.length}</p>
                      </div>
                      <div className="border-x border-slate-200">
                        <p className="text-[10px] text-slate-500 font-medium">Materi</p>
                        <p className="text-base font-bold text-slate-800">{classMaterials.length}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-500 font-medium">Kuis</p>
                        <p className="text-base font-bold text-slate-800">{classQuizzes.length}</p>
                      </div>
                    </div>

                    {/* Quick Access Actions for This Class */}
                    <div className="space-y-2 pt-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/teacher/assignments?classId=${classId}`)}
                        className="w-full text-xs gap-1.5 h-8 bg-amber-50/80 border-amber-200 text-amber-900 hover:bg-amber-100 hover:text-amber-950 font-semibold cursor-pointer"
                      >
                        <FileCheck className="w-3.5 h-3.5 text-amber-600" />
                        Tugas Anak Terkumpul ({classSubmissions.length})
                      </Button>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate('/teacher/materials')}
                          className="text-xs gap-1.5 h-8 border-slate-200 text-slate-700 hover:text-indigo-600 hover:border-indigo-200"
                        >
                          <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                          Materi
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate('/teacher/quizzes')}
                          className="text-xs gap-1.5 h-8 border-slate-200 text-slate-700 hover:text-indigo-600 hover:border-indigo-200"
                        >
                          <CheckSquare className="w-3.5 h-3.5 text-purple-600" />
                          Kuis CBT
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate('/teacher/attendance')}
                          className="text-xs gap-1.5 h-8 border-slate-200 text-slate-700 hover:text-indigo-600 hover:border-indigo-200"
                        >
                          <CalendarCheck2 className="w-3.5 h-3.5 text-emerald-600" />
                          Presensi
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate('/teacher/grades')}
                          className="text-xs gap-1.5 h-8 border-slate-200 text-slate-700 hover:text-indigo-600 hover:border-indigo-200"
                        >
                          <Award className="w-3.5 h-3.5 text-amber-600" />
                          Nilai
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Dialog Kelola Kelas Ampuan */}
      <ManageTeacherClassesModal
        isOpen={showClassesModal}
        onClose={() => setShowClassesModal(false)}
      />

      {/* Modal Ubah Kata Sandi Guru */}
      {showPasswordModal && (
        <ChangePasswordModal
          isOpen={showPasswordModal}
          onClose={() => setShowPasswordModal(false)}
        />
      )}
    </div>
  );
}
