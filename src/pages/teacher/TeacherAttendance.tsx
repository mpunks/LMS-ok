import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Calendar, Users, Save } from 'lucide-react';
import { toast } from '@/components/ui/Toast';
import { useDataStore } from '@/store/dataStore';
import { useAuthStore } from '@/store/authStore';

export default function TeacherAttendance() {
  const { user } = useAuthStore();
  const { users } = useDataStore();
  const students = users.filter(u => u.role === 'STUDENT');
  
  const assignedClasses = user?.assignedClasses || [];
  const uniqueStudentClasses = Array.from(new Set(students.map(s => s.classId).filter(Boolean))) as string[];
  
  // Prefer teacher's assigned classes if configured, otherwise fall back to all student classes
  const availableClasses = assignedClasses.length > 0 ? assignedClasses : uniqueStudentClasses;
  const [selectedClass, setSelectedClass] = useState(availableClasses[0] || '');
  
  const classStudents = students.filter(s => s.classId === selectedClass);
  
  // Local state for attendance for UI demo since we don't have an attendance table yet.
  const [attendance, setAttendance] = useState<Record<string, string>>({});

  const handleSave = () => {
    toast.success('Data absensi berhasil disimpan');
  };

  const hadir = classStudents.filter(s => attendance[s.id] === 'HADIR' || !attendance[s.id]).length;
  const sakit = classStudents.filter(s => attendance[s.id] === 'SAKIT').length;
  const izin = classStudents.filter(s => attendance[s.id] === 'IZIN').length;
  const alpa = classStudents.filter(s => attendance[s.id] === 'ALPA').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-900">Presensi Kehadiran</h1>
        <Button className="gap-2" onClick={handleSave}>
          <Save className="w-4 h-4" /> Simpan Absensi
        </Button>
      </div>

      <Card>
        <CardHeader className="bg-slate-50 border-b border-slate-100">
          <div className="flex flex-col sm:flex-row gap-4 justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 bg-white px-3 py-2 rounded border border-slate-200">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span className="text-sm font-medium text-slate-700">{new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
              </div>
              <select 
                className="border border-slate-300 rounded px-3 py-2 text-sm outline-none bg-white font-medium"
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
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
            </div>
            <div className="flex items-center gap-4 text-sm font-medium">
              <span className="text-emerald-600">Hadir: {hadir}</span>
              <span className="text-amber-600">Sakit: {sakit}</span>
              <span className="text-blue-600">Izin: {izin}</span>
              <span className="text-rose-600">Alpa: {alpa}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-slate-600">
              <thead className="text-xs text-slate-700 uppercase bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 w-12">No</th>
                  <th className="px-6 py-4">Nama Siswa</th>
                  <th className="px-6 py-4 text-center">Kehadiran</th>
                </tr>
              </thead>
              <tbody>
                {classStudents.map((student, idx) => (
                  <tr key={student.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                    <td className="px-6 py-4">{idx + 1}</td>
                    <td className="px-6 py-4 font-medium text-slate-900">{student.name}</td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center gap-2">
                        {['HADIR', 'SAKIT', 'IZIN', 'ALPA'].map((status) => (
                          <label key={status} className="flex items-center gap-1 cursor-pointer">
                            <input 
                              type="radio" 
                              name={`attendance-${student.id}`} 
                              checked={(attendance[student.id] || 'HADIR') === status}
                              onChange={() => setAttendance(prev => ({ ...prev, [student.id]: status }))}
                              className="text-indigo-600 focus:ring-indigo-500"
                            />
                            <span className={`text-xs font-semibold ${
                              status === 'HADIR' ? 'text-emerald-600' : 
                              status === 'SAKIT' ? 'text-amber-600' : 
                              status === 'IZIN' ? 'text-blue-600' : 'text-rose-600'
                            }`}>{status.charAt(0)}</span>
                          </label>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
                {classStudents.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-6 py-8 text-center text-slate-500">
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
