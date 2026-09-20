import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Search, Download, ShieldAlert, AlertTriangle, CheckCircle, Eye, FileText, Filter } from 'lucide-react';
import { toast } from '@/components/ui/Toast';
import { useDataStore } from '@/store/dataStore';
import { User, QuizResult, Quiz } from '@/types';
import ViolationDetailModal from '@/components/teacher/ViolationDetailModal';

export default function TeacherGrades() {
  const { users, quizResults, quizzes } = useDataStore();
  const students = users.filter(u => u.role === 'STUDENT');
  const [selectedClass, setSelectedClass] = useState('');
  const [search, setSearch] = useState('');
  const [filterViolationsOnly, setFilterViolationsOnly] = useState(false);

  // Modal inspection state
  const [selectedModalData, setSelectedModalData] = useState<{
    result: QuizResult;
    student: User;
    quiz?: Quiz;
  } | null>(null);
  
  // Ambil kelas unik dari siswa
  const uniqueClasses = Array.from(new Set(students.map(s => s.classId).filter(Boolean)));
  
  // Default fallback if no class
  if (uniqueClasses.length > 0 && (!selectedClass || !uniqueClasses.includes(selectedClass))) {
    setSelectedClass(uniqueClasses[0] as string);
  }

  const getStudentAverage = (studentId: string) => {
    const results = quizResults.filter(r => r.studentId === studentId);
    if (results.length === 0) return 0;
    return results.reduce((acc, curr) => {
      const score = curr.finalScore !== undefined ? curr.finalScore : curr.score;
      return acc + score;
    }, 0) / results.length;
  };

  const getStudentTotalViolations = (studentId: string) => {
    const results = quizResults.filter(r => r.studentId === studentId);
    return results.reduce((acc, curr) => acc + (curr.violationsCount || (curr.violationLogs?.length || 0)), 0);
  };

  const getStudentLatestResult = (studentId: string): QuizResult | undefined => {
    const results = quizResults.filter(r => r.studentId === studentId);
    if (results.length === 0) return undefined;
    // prioritize result with violations
    const withViolations = results.find(r => (r.violationsCount || (r.violationLogs?.length || 0)) > 0);
    return withViolations || results[results.length - 1];
  };

  let classStudents = students.filter(s => 
    s.classId === selectedClass && 
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  if (filterViolationsOnly) {
    classStudents = classStudents.filter(s => getStudentTotalViolations(s.id) > 0);
  }

  const totalViolationsInClass = classStudents.reduce((acc, curr) => acc + getStudentTotalViolations(curr.id), 0);

  const classAverage = classStudents.length > 0 
    ? (classStudents.reduce((acc, curr) => acc + getStudentAverage(curr.id), 0) / classStudents.length).toFixed(1)
    : '0';

  const highestScore = classStudents.length > 0
    ? Math.max(...classStudents.map(s => getStudentAverage(s.id))).toFixed(1)
    : '0';

  const passedKKM = classStudents.length > 0
    ? Math.round((classStudents.filter(s => getStudentAverage(s.id) >= 75).length / classStudents.length) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Rekapitulasi Nilai & Pengawasan CBT</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Laporan nilai akademik siswa dan berita acara bukti tangkapan layar kecurangan ujian
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            className="gap-2 text-xs" 
            onClick={() => toast.success('Berhasil mengekspor data rekap & berita acara!')}
          >
            <Download className="w-4 h-4" /> Ekspor ke Excel
          </Button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-indigo-600 text-white border-transparent shadow-sm">
          <CardContent className="p-5">
            <h3 className="text-indigo-100 text-xs font-medium mb-1">Rata-rata Kelas {selectedClass || '-'}</h3>
            <p className="text-3xl font-bold">{classAverage}</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-5">
            <h3 className="text-slate-500 text-xs font-medium mb-1">Nilai Tertinggi</h3>
            <p className="text-3xl font-bold text-emerald-600">{highestScore}</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-5">
            <h3 className="text-slate-500 text-xs font-medium mb-1">Ketuntasan KKM (&gt;= 75)</h3>
            <p className="text-3xl font-bold text-indigo-600">{passedKKM}%</p>
          </CardContent>
        </Card>

        <Card className={`shadow-sm border ${
          totalViolationsInClass > 0 
            ? 'bg-rose-50/50 border-rose-200 text-rose-900' 
            : 'border-slate-200'
        }`}>
          <CardContent className="p-5">
            <h3 className={`text-xs font-medium mb-1 ${totalViolationsInClass > 0 ? 'text-rose-600 font-semibold' : 'text-slate-500'}`}>
              Laporan Pelanggaran Integritas
            </h3>
            <p className={`text-3xl font-bold ${totalViolationsInClass > 0 ? 'text-rose-700' : 'text-slate-700'}`}>
              {totalViolationsInClass} <span className="text-sm font-normal">Insiden</span>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Table Card */}
      <Card className="shadow-sm">
        <CardContent className="p-0">
          <div className="p-4 flex flex-col md:flex-row gap-3 border-b border-slate-100 justify-between items-stretch md:items-center">
            <div className="flex flex-wrap items-center gap-3">
              <select 
                className="border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                value={selectedClass}
                onChange={e => setSelectedClass(e.target.value)}
              >
                {uniqueClasses.length === 0 && (
                  <option value="">Belum ada kelas</option>
                )}
                {uniqueClasses.map(c => (
                  <option key={c as string} value={c as string}>Kelas {c}</option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => setFilterViolationsOnly(!filterViolationsOnly)}
                className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border ${
                  filterViolationsOnly 
                    ? 'bg-rose-100 border-rose-300 text-rose-800' 
                    : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                {filterViolationsOnly ? 'Menampilkan Pelanggar Saja' : 'Semua Siswa'}
              </button>
            </div>

            <div className="w-full md:w-72 relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Cari nama siswa..." 
                className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-slate-600">
              <thead className="text-[11px] text-slate-700 uppercase bg-slate-50 border-b border-slate-200 tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">NISN</th>
                  <th className="px-6 py-3.5">Nama Siswa</th>
                  <th className="px-6 py-3.5">Total Ujian</th>
                  <th className="px-6 py-3.5">Status Integritas CBT</th>
                  <th className="px-6 py-3.5">Nilai Akhir</th>
                  <th className="px-6 py-3.5 text-right">Aksi Berita Acara</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {classStudents.map((student) => {
                  const studentResults = quizResults.filter(r => r.studentId === student.id);
                  const avg = getStudentAverage(student.id);
                  const totalV = getStudentTotalViolations(student.id);
                  const latestResult = getStudentLatestResult(student.id);
                  const matchedQuiz = latestResult ? quizzes.find(q => q.id === latestResult.quizId) : undefined;
                  const hasDisqualification = studentResults.some(r => r.disqualified);

                  return (
                    <tr key={student.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-4 font-mono">{student.nisn || '-'}</td>
                      <td className="px-6 py-4 font-semibold text-slate-900">
                        {student.name}
                      </td>
                      <td className="px-6 py-4 font-medium">
                        {studentResults.length} Ujian
                      </td>
                      <td className="px-6 py-4">
                        {hasDisqualification ? (
                          <span className="inline-flex items-center gap-1 bg-rose-600 text-white px-2.5 py-1 rounded-full text-[11px] font-bold">
                            <ShieldAlert className="w-3.5 h-3.5" /> Didiskualifikasi
                          </span>
                        ) : totalV > 0 ? (
                          <span className="inline-flex items-center gap-1 bg-rose-100 text-rose-800 border border-rose-200 px-2.5 py-1 rounded-lg text-[11px] font-semibold">
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                            {totalV}x Pelanggaran Layar
                          </span>
                        ) : studentResults.length > 0 ? (
                          <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-lg text-[11px] font-medium">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Bersih / Jujur
                          </span>
                        ) : (
                          <span className="text-slate-400">Belum Mengikuti</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-sm font-bold ${
                          hasDisqualification 
                            ? 'text-rose-600 line-through' 
                            : avg >= 75 
                              ? 'text-emerald-600' 
                              : avg > 0 
                                ? 'text-amber-600' 
                                : 'text-slate-400'
                        }`}>
                          {hasDisqualification ? '0' : avg > 0 ? avg.toFixed(1) : '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {latestResult ? (
                          <Button
                            size="sm"
                            variant={totalV > 0 ? 'secondary' : 'ghost'}
                            onClick={() => setSelectedModalData({
                              result: latestResult,
                              student: student,
                              quiz: matchedQuiz
                            })}
                            className={`text-xs gap-1.5 ${
                              totalV > 0 
                                ? 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100 font-bold' 
                                : 'text-slate-600'
                            }`}
                          >
                            <Eye className="w-3.5 h-3.5" />
                            {totalV > 0 ? 'Lihat Bukti & Sanksi' : 'Detail Ujian'}
                          </Button>
                        ) : (
                          <span className="text-slate-400 text-xs">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {classStudents.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-slate-500">
                      {filterViolationsOnly 
                        ? 'Tidak ada siswa yang tercatat melakukan pelanggaran integritas.' 
                        : 'Siswa tidak ditemukan untuk kelas ini.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Violation Detail & Sanction Modal */}
      {selectedModalData && (
        <ViolationDetailModal
          isOpen={!!selectedModalData}
          onClose={() => setSelectedModalData(null)}
          result={selectedModalData.result}
          student={selectedModalData.student}
          quiz={selectedModalData.quiz}
        />
      )}
    </div>
  );
}
