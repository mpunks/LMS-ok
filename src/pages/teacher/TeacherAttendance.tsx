import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Calendar, Users, Save } from 'lucide-react';
import { toast } from '@/components/ui/Toast';

export default function TeacherAttendance() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-900">Presensi Kehadiran</h1>
        <Button className="gap-2" onClick={() => toast.success('Data absensi berhasil disimpan')}>
          <Save className="w-4 h-4" /> Simpan Absensi
        </Button>
      </div>

      <Card>
        <CardHeader className="bg-slate-50 border-b border-slate-100">
          <div className="flex flex-col sm:flex-row gap-4 justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 bg-white px-3 py-2 rounded border border-slate-200">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span className="text-sm font-medium text-slate-700">17 Sep 2026</span>
              </div>
              <select className="border border-slate-300 rounded px-3 py-2 text-sm outline-none bg-white">
                <option>Kelas 7A</option>
                <option>Kelas 7B</option>
              </select>
            </div>
            <div className="flex items-center gap-4 text-sm font-medium">
              <span className="text-emerald-600">Hadir: 28</span>
              <span className="text-amber-600">Sakit: 1</span>
              <span className="text-blue-600">Izin: 1</span>
              <span className="text-rose-600">Alpa: 0</span>
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
                {[
                  { id: '1', name: 'Andi Saputra', status: 'HADIR' },
                  { id: '2', name: 'Budi Haryanto', status: 'SAKIT' },
                  { id: '3', name: 'Citra Dewi', status: 'HADIR' },
                  { id: '4', name: 'Deni Kurniawan', status: 'IZIN' },
                ].map((student, idx) => (
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
                              defaultChecked={student.status === status}
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
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
