import React from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Search, Download, BarChart } from 'lucide-react';
import { toast } from '@/components/ui/Toast';

export default function TeacherGrades() {
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
            <h3 className="text-indigo-100 text-sm font-medium mb-1">Rata-rata Kelas 7A</h3>
            <p className="text-3xl font-bold">82.5</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <h3 className="text-slate-500 text-sm font-medium mb-1">Nilai Tertinggi</h3>
            <p className="text-3xl font-bold text-emerald-600">98.0</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <h3 className="text-slate-500 text-sm font-medium mb-1">Siswa Lulus KKM</h3>
            <p className="text-3xl font-bold text-indigo-600">85%</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="p-4 flex gap-4 border-b border-slate-100">
            <select className="border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
              <option>Pilih Kelas (7A)</option>
              <option>Pilih Kelas (7B)</option>
            </select>
            <div className="flex-1 max-w-sm relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
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
                  <th className="px-6 py-4">Ulangan Harian 1</th>
                  <th className="px-6 py-4">UTS</th>
                  <th className="px-6 py-4">Nilai Akhir</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { id: '12345', name: 'Andi Saputra', uh: 85, uts: 88, final: 86.5 },
                  { id: '12346', name: 'Budi Haryanto', uh: 78, uts: 82, final: 80.0 },
                  { id: '12347', name: 'Citra Dewi', uh: 92, uts: 95, final: 93.5 },
                ].map((student) => (
                  <tr key={student.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                    <td className="px-6 py-4">{student.id}</td>
                    <td className="px-6 py-4 font-medium text-slate-900">{student.name}</td>
                    <td className="px-6 py-4">{student.uh}</td>
                    <td className="px-6 py-4">{student.uts}</td>
                    <td className="px-6 py-4 font-bold text-indigo-600">{student.final}</td>
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
