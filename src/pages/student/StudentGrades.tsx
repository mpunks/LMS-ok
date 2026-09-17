import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { BarChart, Download, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/Toast';

export default function StudentGrades() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-900">Raport Digital</h1>
        <Button variant="outline" className="gap-2" onClick={() => toast.success('Raport PDF sedang diunduh...')}>
          <Download className="w-4 h-4" /> Unduh PDF
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-indigo-600 text-white border-transparent">
          <CardContent className="p-6 flex items-center gap-6">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center shrink-0">
              <GraduationCap className="w-8 h-8" />
            </div>
            <div>
              <p className="text-indigo-100 text-sm font-medium mb-1">Peringkat Kelas Sementara</p>
              <p className="text-3xl font-bold">5 <span className="text-xl font-normal text-indigo-200">dari 32 Siswa</span></p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 flex items-center gap-6">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center shrink-0">
              <BarChart className="w-8 h-8" />
            </div>
            <div>
              <p className="text-slate-500 text-sm font-medium mb-1">Rata-Rata Nilai</p>
              <p className="text-3xl font-bold text-slate-900">85.5</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Rincian Nilai Mata Pelajaran</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-slate-600">
              <thead className="text-xs text-slate-700 uppercase bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">Mata Pelajaran</th>
                  <th className="px-6 py-4 text-center">Tugas & Kuis</th>
                  <th className="px-6 py-4 text-center">UTS</th>
                  <th className="px-6 py-4 text-center">UAS</th>
                  <th className="px-6 py-4 text-center">Nilai Akhir</th>
                  <th className="px-6 py-4 text-center">Predikat</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { subject: 'Matematika', kuis: 88, uts: 85, uas: 90, final: 87.5, grade: 'A' },
                  { subject: 'IPA Terpadu', kuis: 80, uts: 78, uas: 82, final: 80.0, grade: 'B' },
                  { subject: 'Bahasa Indonesia', kuis: 92, uts: 90, uas: 94, final: 92.0, grade: 'A' },
                  { subject: 'Bahasa Inggris', kuis: 85, uts: 88, uas: 86, final: 86.3, grade: 'A-' },
                ].map((item, idx) => (
                  <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50/50">
                    <td className="px-6 py-4 font-medium text-slate-900">{item.subject}</td>
                    <td className="px-6 py-4 text-center">{item.kuis}</td>
                    <td className="px-6 py-4 text-center">{item.uts}</td>
                    <td className="px-6 py-4 text-center">-</td>
                    <td className="px-6 py-4 text-center font-bold text-indigo-600">{item.final}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        item.grade.includes('A') ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {item.grade}
                      </span>
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
