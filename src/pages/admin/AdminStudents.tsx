import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Users, Search, Plus, GraduationCap, Upload, Trash2, KeyRound, Edit2 } from 'lucide-react';
import { toast } from '@/components/ui/Toast';
import { useDataStore } from '@/store/dataStore';

export default function AdminStudents() {
  const [activeTab, setActiveTab] = useState<'teachers' | 'students'>('teachers');
  const { users, addUser, updateUser, deleteUser, resetPassword } = useDataStore();
  
  const teachers = users.filter(u => u.role === 'TEACHER');
  const students = users.filter(u => u.role === 'STUDENT');
  
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  
  const [formData, setFormData] = useState({ id: '', name: '', username: '', nik: '', nisn: '', classId: '' });
  const [isEdit, setIsEdit] = useState(false);

  const filteredData = activeTab === 'teachers' 
    ? teachers.filter(t => t.name.toLowerCase().includes(search.toLowerCase()) || t.nik?.includes(search))
    : students.filter(s => s.name.toLowerCase().includes(search.toLowerCase()) || s.nisn?.includes(search) || s.classId?.toLowerCase().includes(search.toLowerCase()));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      toast.error('Nama wajib diisi');
      return;
    }

    try {
      if (isEdit) {
        await updateUser(formData.id, formData);
        toast.success('Data berhasil diperbarui');
      } else {
        const newUser = {
          id: `${activeTab === 'teachers' ? 't' : 's'}-${Date.now()}`,
          name: formData.name,
          role: activeTab === 'teachers' ? 'TEACHER' as const : 'STUDENT' as const,
          ...(activeTab === 'teachers' ? { username: formData.username, nik: formData.nik } : { nisn: formData.nisn, classId: formData.classId })
        };
        await addUser(newUser);
        toast.success('Data berhasil ditambahkan');
      }
      
      setShowForm(false);
      setIsEdit(false);
      setFormData({ id: '', name: '', username: '', nik: '', nisn: '', classId: '' });
    } catch (error: any) {
      toast.error(error.message || 'Gagal menyimpan data');
    }
  };

  const handleEdit = (user: any) => {
    setFormData({
      id: user.id,
      name: user.name,
      username: user.username || '',
      nik: user.nik || '',
      nisn: user.nisn || '',
      classId: user.classId || ''
    });
    setIsEdit(true);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Yakin ingin menghapus pengguna ini?')) {
      try {
        await deleteUser(id);
        toast.success('Pengguna berhasil dihapus');
      } catch (error: any) {
        toast.error(error.message || 'Gagal menghapus pengguna');
      }
    }
  };

  const handleResetPassword = async (user: any) => {
    const pass = user.role === 'TEACHER' ? user.nik : user.nisn;
    if (pass) {
      try {
        await resetPassword(user.id, pass);
        toast.info(`Sandi berhasil direset ke default (${pass})`);
      } catch (error: any) {
        toast.error(error.message || 'Gagal mereset kata sandi');
      }
    } else {
      toast.error('Pengguna tidak memiliki NIK/NISN untuk dijadikan sandi default');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-900">Data Guru & Siswa</h1>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2 shrink-0" onClick={() => toast.info('Fitur impor data menyusul')}>
            <Upload className="w-4 h-4" /> Impor Excel
          </Button>
          <Button className="gap-2 shrink-0" onClick={() => {
            setIsEdit(false);
            setFormData({ id: '', name: '', username: '', nik: '', nisn: '', classId: '' });
            setShowForm(!showForm);
          }}>
            <Plus className="w-4 h-4" /> Tambah Data
          </Button>
        </div>
      </div>

      {showForm && (
        <Card className="border-indigo-100 bg-indigo-50/30">
          <CardHeader>
            <CardTitle>{isEdit ? 'Edit Data' : 'Tambah Data'} {activeTab === 'teachers' ? 'Guru' : 'Siswa'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
              <Input
                label="Nama Lengkap"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                required
              />
              {activeTab === 'teachers' ? (
                <>
                  <Input
                    label="Username"
                    value={formData.username}
                    onChange={e => setFormData({...formData, username: e.target.value})}
                    required
                  />
                  <Input
                    label="NIK (16 Digit)"
                    value={formData.nik}
                    onChange={e => setFormData({...formData, nik: e.target.value})}
                    maxLength={16}
                    required
                  />
                </>
              ) : (
                <>
                  <Input
                    label="NISN"
                    value={formData.nisn}
                    onChange={e => setFormData({...formData, nisn: e.target.value})}
                    required
                  />
                  <Input
                    label="Kelas (misal: 7A)"
                    value={formData.classId}
                    onChange={e => setFormData({...formData, classId: e.target.value})}
                    required
                  />
                </>
              )}
              <div className="lg:col-span-3 flex gap-2 justify-end mt-4">
                <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Batal</Button>
                <Button type="submit">Simpan Data</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => { setActiveTab('teachers'); setShowForm(false); }}
            className={`flex-1 py-4 text-sm font-medium text-center transition-colors ${
              activeTab === 'teachers' ? 'bg-white text-indigo-600 border-b-2 border-indigo-600' : 'bg-slate-50 text-slate-500 hover:text-slate-700'
            }`}
          >
            Daftar Guru ({teachers.length})
          </button>
          <button
            onClick={() => { setActiveTab('students'); setShowForm(false); }}
            className={`flex-1 py-4 text-sm font-medium text-center transition-colors ${
              activeTab === 'students' ? 'bg-white text-indigo-600 border-b-2 border-indigo-600' : 'bg-slate-50 text-slate-500 hover:text-slate-700'
            }`}
          >
            Daftar Siswa ({students.length})
          </button>
        </div>
        <CardContent className="p-0">
          <div className="p-4 border-b border-slate-100 flex gap-4">
            <div className="flex-1 max-w-md relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                value={search}
                onChange={e => setSearch(e.target.value)}
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
                {filteredData.map(user => (
                  <tr key={user.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                    <td className="px-6 py-4 font-medium text-slate-900">{user.name}</td>
                    <td className="px-6 py-4">{activeTab === 'teachers' ? `${user.nik} / ${user.username}` : user.nisn}</td>
                    {activeTab === 'students' && <td className="px-6 py-4">{user.classId}</td>}
                    <td className="px-6 py-4 text-right space-x-2">
                      <Button variant="outline" size="sm" onClick={() => handleResetPassword(user)} title="Reset Sandi">
                        <KeyRound className="w-4 h-4" />
                      </Button>
                      <Button variant="secondary" size="sm" onClick={() => handleEdit(user)} title="Edit">
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button variant="danger" size="sm" onClick={() => handleDelete(user.id)} title="Hapus">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
                {filteredData.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                      Data tidak ditemukan
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
