import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Users, Search, Plus, GraduationCap, Upload } from 'lucide-react';
import { toast } from '@/components/ui/Toast';

export default function AdminStudents() {
  const [activeTab, setActiveTab] = useState<'teachers' | 'students'>('teachers');

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-900">Data Guru & Siswa</h1>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2 shrink-0" onClick={() => toast.info('Fitur impor data menyusul')}>
            <Upload className="w-4 h-4" /> Impor Excel
          </Button>
          <Button className="gap-2 shrink-0" onClick={() => toast.info('Form tambah pengguna belum tersedia')}>
            <Plus className="w-4 h-4" /> Tambah Data
          </Button>
        </div>
      </div>

      <Card>
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => setActiveTab('teachers')}
            className={`flex-1 py-4 text-sm font-medium text-center transition-colors ${
              activeTab === 'teachers' ? 'bg-white text-indigo-600 border-b-2 border-indigo-600' : 'bg-slate-50 text-slate-500 hover:text-slate-700'
            }`}
          >
            Daftar Guru
          </button>
          <button
            onClick={() => setActiveTab('students')}
            className={`flex-1 py-4 text-sm font-medium text-center transition-colors ${
              activeTab === 'students' ? 'bg-white text-indigo-600 border-b-2 border-indigo-600' : 'bg-slate-50 text-slate-500 hover:text-slate-700'
            }`}
          >
            Daftar Siswa
          </button>
        </div>
        <CardContent className="p-0">
          <div className="p-4 border-b border-slate-100 flex gap-4">
            <div className="flex-1 max-w-md relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="Cari nama atau nomor induk..." 
                className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-slate-600">
              <thead className="text-xs text-slate-700 uppercase bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">Nama Lengkap</th>
                  <th className="px-6 py-4">{activeTab === 'teachers' ? 'NIK / Username' : 'NISN'}</th>
                  {activeTab === 'students' && <th className="px-6 py-4">Kelas</th>}
                  <th className="px-6 py-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {activeTab === 'teachers' ? (
                  <tr className="border-b border-slate-100 hover:bg-slate-50/50">
                    <td className="px-6 py-4 font-medium text-slate-900">Budi Santoso, S.Pd</td>
                    <td className="px-6 py-4">1234567890123456</td>
                    <td className="px-6 py-4 text-right">
                      <Button variant="outline" size="sm">Edit</Button>
                    </td>
                  </tr>
                ) : (
                  <tr className="border-b border-slate-100 hover:bg-slate-50/50">
                    <td className="px-6 py-4 font-medium text-slate-900">Andi Saputra</td>
                    <td className="px-6 py-4">12345</td>
                    <td className="px-6 py-4">7A</td>
                    <td className="px-6 py-4 text-right">
                      <Button variant="outline" size="sm">Edit</Button>
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
