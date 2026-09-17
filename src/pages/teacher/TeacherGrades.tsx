import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Search, Download, BarChart } from 'lucide-react';
import { toast } from '@/components/ui/Toast';
import { useDataStore } from '@/store/dataStore';

export default function TeacherGrades() {
  const { users, quizResults } = useDataStore();
  const students = users.filter(u => u.role === 'STUDENT');
  const [selectedClass, setSelectedClass] = useState('');
  const [search, setSearch] = useState('');
  
  // Ambil kelas unik dari siswa
  const uniqueClasses = Array.from(new Set(students.map(s => s.classId).filter(Boolean)));
  
  // Default fallback if no class
  if (uniqueClasses.length > 0 && (!selectedClass || !uniqueClasses.includes(selectedClass))) {
    setSelectedClass(uniqueClasses[0] as string);
  }

  const classStudents = students.filter(s => s.classId === selectedClass && s.name.toLowerCase().includes(search.toLowerCase()));

  const getStudentAverage = (studentId: string) => {
    const results = quizResults.filter(r => r.studentId === studentId);
    if (results.length === 0) return 0;
    return results.reduce((acc, curr) => acc + curr.score, 0) / results.length;
  };

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
        <h1 className="text-2xl font-bold text-slate-900">Rekapitulasi Nilai</h1>
        <Button variant="outline" className="gap-2" onClick={() => toast.success('Berhasil mengekspor data ke Excel!')}>
          <Download className="w-4 h-4" /> Ekspor ke Excel
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-indigo-600 text-white border-transparent">
          <CardContent className="p-6">
            <h3 className="text-indigo-100 text-sm font-medium mb-1">Rata-rata Kelas {selectedClass || '-'}</h3>
            <p className="text-3xl font-bold">{classAverage}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <h3 className="text-slate-500 text-sm font-medium mb-1">Nilai Tertinggi</h3>
            <p className="text-3xl font-bold text-emerald-600">{highestScore}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <h3 className="text-slate-500 text-sm font-medium mb-1">Siswa Lulus KKM (&gt;= 75)</h3>
            <p className="text-3xl font-bold text-indigo-600">{passedKKM}%</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="p-4 flex gap-4 border-b border-slate-100">
            <select 
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
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
            <div className="flex-1 max-w-sm relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Cari nama siswa..." 
                className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-slate-600">
              <thead className="text-xs text-slate-700 uppercase bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">NISN</th>
                  <th className="px-6 py-4">Nama Siswa</th>
                  <th className="px-6 py-4">Total Kuis</th>
                  <th className="px-6 py-4">Nilai Akhir</th>
                </tr>
              </thead>
              <tbody>
                {classStudents.map((student) => {
                  const studentResults = quizResults.filter(r => r.studentId === student.id);
                  const avg = getStudentAverage(student.id);
                  return (
                    <tr key={student.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                      <td className="px-6 py-4">{student.nisn}</td>
                      <td className="px-6 py-4 font-medium text-slate-900">{student.name}</td>
                      <td className="px-6 py-4">{studentResults.length}</td>
                      <td className="px-6 py-4 font-bold text-indigo-600">{avg > 0 ? avg.toFixed(1) : '-'}</td>
                    </tr>
                  )
                })}
                {classStudents.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                      Siswa tidak ditemukan untuk kelas ini.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
