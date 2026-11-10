import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Search, Download, ShieldAlert, AlertTriangle, CheckCircle, Eye, FileText, Filter, RefreshCw, RotateCcw, X } from 'lucide-react';
import { toast } from '@/components/ui/Toast';
import { useDataStore } from '@/store/dataStore';
import { useAuthStore } from '@/store/authStore';
import { User, QuizResult, Quiz } from '@/types';
import { isResultMatchStudent, isItemForClass } from '@/lib/utils';
import * as XLSX from 'xlsx';
import ViolationDetailModal from '@/components/teacher/ViolationDetailModal';
import BulkRetakeModal from '@/components/teacher/BulkRetakeModal';

export default function TeacherGrades() {
  const { user } = useAuthStore();
  const { users, quizResults, quizzes, pullAllFromServer, resetStudentQuiz, resetBulkStudentQuiz } = useDataStore();
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    // 1. Initial pull
    pullAllFromServer().catch(() => {});

    // 2. Realtime auto-refresh interval every 6 seconds so student scores appear instantly as they finish!
    const timer = setInterval(() => {
      pullAllFromServer().catch(() => {});
    }, 6000);

    return () => clearInterval(timer);
  }, []);

  const handleRealtimeSync = async () => {
    setIsRefreshing(true);
    try {
      // Trigger realtime force-sync endpoint with Google Sheets
      await fetch('/api/sync/realtime', { method: 'POST' }).catch(() => {});
      await pullAllFromServer();
      toast.success('Nilai kuis & berita acara berhasil diperbarui secara realtime dari Google Sheet');
    } catch (e) {
      toast.info('Data telah disegarkan');
    } finally {
      setIsRefreshing(false);
    }
  };

  const students = users.filter(u => u.role === 'STUDENT');
  const assignedClasses = user?.assignedClasses || [];
  const uniqueClasses = Array.from(new Set([
    ...students.map(s => s.classId).filter(Boolean),
    ...quizResults.map(r => r.studentClass).filter(Boolean)
  ])) as string[];
  
  // Prioritize teacher assigned classes
  const availableClasses = assignedClasses.length > 0 ? assignedClasses : uniqueClasses;
  const [selectedClass, setSelectedClass] = useState(availableClasses[0] || '');
  const [search, setSearch] = useState('');
  const [filterViolationsOnly, setFilterViolationsOnly] = useState(false);

  // Modal inspection state
  const [selectedModalData, setSelectedModalData] = useState<{
    result: QuizResult;
    student: User;
    quiz?: Quiz;
  } | null>(null);

  // Quick Retake modal state
  const [retakeModalData, setRetakeModalData] = useState<{
    result: QuizResult;
    student: User;
    quiz?: Quiz;
  } | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [bulkModalQuiz, setBulkModalQuiz] = useState<Quiz | null>(null);
  
  // Default fallback if no class
  if (availableClasses.length > 0 && (!selectedClass || !availableClasses.includes(selectedClass))) {
    setSelectedClass(availableClasses[0] as string);
  }

  const availableQuizzesForClass = quizzes.filter(q => 
    !selectedClass || isItemForClass(q.classId, q.targetClasses, selectedClass) || quizzes.length > 0
  );

  const isMatchStudent = (r: QuizResult, student: User) => {
    return isResultMatchStudent(r, student);
  };

  const getStudentResults = (student: User) => {
    return quizResults.filter(r => isMatchStudent(r, student));
  };

  const getStudentAverage = (student: User) => {
    const results = getStudentResults(student);
    if (results.length === 0) return 0;
    return results.reduce((acc, curr) => {
      const score = curr.finalScore !== undefined ? curr.finalScore : curr.score;
      return acc + (score || 0);
    }, 0) / results.length;
  };

  const getStudentTotalViolations = (student: User) => {
    const results = getStudentResults(student);
    return results.reduce((acc, curr) => acc + (curr.violationsCount || (curr.violationLogs?.length || 0)), 0);
  };

  const getStudentLatestResult = (student: User): QuizResult | undefined => {
    const results = getStudentResults(student);
    if (results.length === 0) return undefined;
    // prioritize result with violations
    const withViolations = results.find(r => (r.violationsCount || (r.violationLogs?.length || 0)) > 0);
    return withViolations || results[results.length - 1];
  };

  // Enrich student list: include students from users list AND any students who submitted results for this class
  const classStudentsMap = new Map<string, User>();
  for (const s of students) {
    if (s.classId === selectedClass) {
      classStudentsMap.set(s.id || s.nisn || s.name, s);
    }
  }
  for (const r of quizResults) {
    if (r.studentClass === selectedClass) {
      const match = students.find(s => isMatchStudent(r, s));
      if (!match) {
        const sid = r.studentId || r.studentNisn || `syn-${r.id}`;
        if (!classStudentsMap.has(sid)) {
          classStudentsMap.set(sid, {
            id: sid,
            name: r.studentName || 'Siswa',
            role: 'STUDENT',
            nisn: r.studentNisn || r.studentId || '',
            classId: r.studentClass
          } as User);
        }
      }
    }
  }

  let classStudents = Array.from(classStudentsMap.values()).filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  if (filterViolationsOnly) {
    classStudents = classStudents.filter(s => getStudentTotalViolations(s) > 0);
  }

  const totalViolationsInClass = classStudents.reduce((acc, curr) => acc + getStudentTotalViolations(curr), 0);

  const classAverage = classStudents.length > 0 
    ? (classStudents.reduce((acc, curr) => acc + getStudentAverage(curr), 0) / classStudents.length).toFixed(1)
    : '0';

  const highestScore = classStudents.length > 0
    ? Math.max(...classStudents.map(s => getStudentAverage(s))).toFixed(1)
    : '0';

  const passedKKM = classStudents.length > 0
    ? Math.round((classStudents.filter(s => getStudentAverage(s) >= 75).length / classStudents.length) * 100)
    : 0;

  const handleExportToExcel = () => {
    if (classStudents.length === 0) {
      toast.error('Tidak ada data siswa untuk diekspor pada kelas ini');
      return;
    }

    const exportRows = classStudents.map((student, idx) => {
      const studentResults = getStudentResults(student);
      const avg = getStudentAverage(student);
      const totalV = getStudentTotalViolations(student);
      const hasDisq = studentResults.some(r => r.disqualified);

      return {
        No: idx + 1,
        NISN: student.nisn || '-',
        'Nama Lengkap Siswa': student.name,
        Kelas: student.classId || selectedClass || '-',
        'Jumlah Kuis Diikuti': studentResults.length,
        'Nilai Rata-rata Kuis': Number(avg.toFixed(1)),
        'Ketuntasan KKM (>= 75)': avg >= 75 ? 'Tuntas' : 'Belum Tuntas',
        'Total Pelanggaran CBT': totalV,
        'Status Integritas': hasDisq ? 'Didiskualifikasi' : (totalV > 0 ? `${totalV}x Pelanggaran` : (studentResults.length > 0 ? 'Bersih / Jujur' : 'Belum Mengikuti'))
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `Rekap Nilai Kelas ${selectedClass || 'Semua'}`);
    XLSX.writeFile(workbook, `Laporan_Nilai_CBT_Kelas_${selectedClass || 'Semua'}_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success(`Laporan nilai kelas ${selectedClass || ''} berhasil diekspor ke Excel!`);
  };

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
            size="sm"
            onClick={handleRealtimeSync}
            disabled={isRefreshing}
            className="gap-2 text-xs border-indigo-200 text-indigo-700 bg-indigo-50/50 hover:bg-indigo-100 font-semibold"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-indigo-600' : ''}`} />
            Segarkan Realtime
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            className="gap-2 text-xs border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold" 
            onClick={handleExportToExcel}
          >
            <Download className="w-3.5 h-3.5" /> Ekspor ke Excel
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
                {availableClasses.length === 0 && (
                  <option value="">Belum ada kelas</option>
                )}
                {availableClasses.map(c => (
                  <option key={c} value={c}>
                    Kelas {c} {assignedClasses.includes(c) ? '★ (Diampu)' : ''}
                  </option>
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

              {availableQuizzesForClass.length > 0 && (
                <button
                  type="button"
                  onClick={() => setBulkModalQuiz(availableQuizzesForClass[0])}
                  className="px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100"
                  title="Beri kesempatan remedial / pengulangan kuis bagi siswa kelas ini dengan kriteria nilai tertentu"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                  Pengulangan Kuis (Remedial Massal)
                </button>
              )}
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
                  const studentResults = getStudentResults(student);
                  const avg = getStudentAverage(student);
                  const totalV = getStudentTotalViolations(student);
                  const latestResult = getStudentLatestResult(student);
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
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setRetakeModalData({
                                result: latestResult,
                                student: student,
                                quiz: matchedQuiz
                              })}
                              className="text-xs gap-1 py-1 px-2.5 text-amber-700 border-amber-300 hover:bg-amber-50 hover:text-amber-800 font-medium"
                              title="Izinkan siswa mengulang kuis ini dari awal"
                            >
                              <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                              Ulangi Kuis
                            </Button>
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
                              {totalV > 0 ? 'Lihat Bukti' : 'Detail'}
                            </Button>
                          </div>
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

      {/* Modal Konfirmasi Izinkan Siswa Mengulang Kuis */}
      {retakeModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-amber-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-100 text-amber-700">
                  <RotateCcw className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">Izinkan Siswa Mengulang Kuis</h3>
                  <p className="text-xs text-slate-500">Beri kesempatan siswa mengerjakan kuis dari awal</p>
                </div>
              </div>
              <button
                onClick={() => setRetakeModalData(null)}
                disabled={isResetting}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/80 text-xs space-y-2">
              <div className="flex justify-between py-1 border-b border-amber-100">
                <span className="text-slate-500">Siswa:</span>
                <span className="font-bold text-slate-800">{retakeModalData.student.name}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-amber-100">
                <span className="text-slate-500">NISN / Kelas:</span>
                <span className="font-mono text-slate-700">{retakeModalData.student.nisn || '-'} • Kelas {retakeModalData.student.classId || '-'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-amber-100">
                <span className="text-slate-500">Kuis:</span>
                <span className="font-semibold text-amber-900">{retakeModalData.quiz?.title || retakeModalData.result.quizTitle || 'Kuis CBT'}</span>
              </div>
              <div className="pt-1.5 border-t border-amber-200/60 text-[11px] text-amber-800 leading-relaxed">
                ⚠️ Riwayat nilai dan sesi ujian siswa ini sebelumnya akan di-reset dari sistem sekolah dan Google Sheet agar siswa dapat mengisi lembar ujian baru.
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <Button
                variant="outline"
                type="button"
                onClick={() => setRetakeModalData(null)}
                disabled={isResetting}
                className="w-1/2 text-xs"
              >
                Batal
              </Button>
              <Button
                type="button"
                onClick={async () => {
                  setIsResetting(true);
                  try {
                    const qId = retakeModalData.result.quizId || retakeModalData.quiz?.id;
                    if (qId) {
                      await resetStudentQuiz(
                        qId,
                        retakeModalData.result.studentId || retakeModalData.student.id,
                        retakeModalData.result.studentNisn || retakeModalData.student.nisn,
                        retakeModalData.result.studentName || retakeModalData.student.name,
                        retakeModalData.result.id
                      );
                      await pullAllFromServer().catch(() => {});
                      toast.success(`Siswa ${retakeModalData.student.name} berhasil diizinkan untuk mengulang kuis.`);
                      setRetakeModalData(null);
                    }
                  } catch (err: any) {
                    toast.error(err.message || 'Gagal mereset kuis');
                  } finally {
                    setIsResetting(false);
                  }
                }}
                isLoading={isResetting}
                disabled={isResetting}
                className="w-1/2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1" /> Ya, Izinkan Ulang
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Pengulangan Kuis Massal (Remedial Berdasarkan Kriteria Nilai) */}
      {bulkModalQuiz && (
        <BulkRetakeModal
          isOpen={!!bulkModalQuiz}
          onClose={() => setBulkModalQuiz(null)}
          quiz={bulkModalQuiz}
          results={quizResults.filter(r => r.quizId === bulkModalQuiz.id)}
          users={users}
          onExecute={async (options) => {
            const res = await resetBulkStudentQuiz(bulkModalQuiz.id, options);
            await pullAllFromServer().catch(() => {});
            toast.success(`Berhasil memberikan kesempatan ujian ulang untuk ${res.count} siswa. Siswa dapat langsung memulai ujian kembali di dashboard mereka!`);
          }}
        />
      )}
    </div>
  );
}
