import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Users, Plus, Trash2, KeyRound, ShieldAlert } from 'lucide-react';
import { toast } from '@/components/ui/Toast';
import { useAuthStore } from '@/store/authStore';

// Mock data
const initialAdmins = [
  { id: 'sa-1', name: 'Super Administrator', username: 'rafx2', role: 'SUPER_ADMIN' },
  { id: 'a-1', name: 'Admin Sekolah 1', username: 'admin1', nik: '1234567890123456', role: 'ADMIN' },
];

export default function AdminUsers() {
  const { user: currentUser } = useAuthStore();
  const [admins, setAdmins] = useState(initialAdmins);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', username: '', nik: '' });

  const handleAddAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.username || !formData.nik) {
      toast.error('Semua kolom wajib diisi');
      return;
    }
    const newAdmin = {
      id: `a-${Date.now()}`,
      ...formData,
      role: 'ADMIN'
    };
    setAdmins([...admins, newAdmin]);
    setFormData({ name: '', username: '', nik: '' });
    setShowForm(false);
    toast.success('Admin baru berhasil ditambahkan');
  };

  const handleDelete = (id: string) => {
    if (id === currentUser?.id) {
      toast.error('Anda tidak dapat menghapus akun Anda sendiri saat sedang login');
      return;
    }
    const adminToDelete = admins.find(a => a.id === id);
    if (adminToDelete?.role === 'SUPER_ADMIN') {
      toast.error('Akun Super Admin tidak dapat dihapus');
      return;
    }
    const remainingAdmins = admins.filter(a => a.role === 'ADMIN' || a.role === 'SUPER_ADMIN');
    if (remainingAdmins.length <= 1) {
      toast.error('Minimal harus ada 1 Admin/Super Admin aktif');
      return;
    }

    setAdmins(admins.filter(a => a.id !== id));
    toast.success('Admin berhasil dihapus');
  };

  const handleResetPassword = (id: string) => {
    const admin = admins.find(a => a.id === id);
    if (admin?.role === 'SUPER_ADMIN') {
      toast.error('Sandi Super Admin dikelola di Script Properties Google Apps Script');
      return;
    }
    toast.info(`Sandi admin ${admin?.name} direset ke NIK default.`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Kelola Tim Admin</h1>
        <Button onClick={() => setShowForm(!showForm)} className="gap-2">
          {showForm ? 'Batal' : <><Plus className="w-4 h-4" /> Tambah Admin</>}
        </Button>
      </div>

      {showForm && (
        <Card className="border-indigo-100 bg-indigo-50/30">
          <CardHeader>
            <CardTitle>Tambah Admin Baru</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddAdmin} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <Input
                label="Nama Lengkap"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                placeholder="Misal: Budi Santoso"
              />
              <Input
                label="Username / ID"
                value={formData.username}
                onChange={e => setFormData({...formData, username: e.target.value})}
                placeholder="Misal: admin2"
              />
              <Input
                label="NIK (16 Digit)"
                value={formData.nik}
                onChange={e => setFormData({...formData, nik: e.target.value})}
                placeholder="1234567890123456"
                maxLength={16}
              />
              <div className="md:col-span-3">
                <p className="text-sm text-slate-500 mb-4 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-indigo-500" />
                  Sandi default akan menggunakan NIK yang didaftarkan.
                </p>
                <Button type="submit">Simpan Admin</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-slate-600">
              <thead className="text-xs text-slate-700 uppercase bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">Nama Lengkap</th>
                  <th className="px-6 py-4">Username</th>
                  <th className="px-6 py-4">Peran</th>
                  <th className="px-6 py-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {admins.map((admin) => (
                  <tr key={admin.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                    <td className="px-6 py-4 font-medium text-slate-900">
                      {admin.name}
                      {admin.id === currentUser?.id && (
                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800">
                          Anda
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">{admin.username}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                        admin.role === 'SUPER_ADMIN' ? 'bg-purple-100 text-purple-800' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {admin.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleResetPassword(admin.id)}
                        disabled={admin.role === 'SUPER_ADMIN'}
                        title="Reset Sandi ke NIK"
                      >
                        <KeyRound className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="danger" 
                        size="sm" 
                        onClick={() => handleDelete(admin.id)}
                        disabled={admin.id === currentUser?.id || admin.role === 'SUPER_ADMIN'}
                        title="Hapus Akun"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
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
