import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Settings, Save, Image as ImageIcon, Database, Trash2, AlertTriangle } from 'lucide-react';
import { toast } from '@/components/ui/Toast';
import { useSettingsStore } from '@/store/settingsStore';
import { useAuthStore } from '@/store/authStore';

export default function AdminSettings() {
  const { user } = useAuthStore();
  const { appName, appLogo, themeColor, setSettings } = useSettingsStore();
  const [formData, setFormData] = useState({ appName, appLogo, themeColor });

  const handleSave = () => {
    setSettings(formData);
    toast.success('Pengaturan berhasil disimpan');
    // Update document title
    document.title = formData.appName;
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024) { // 1MB max
        toast.error('Ukuran logo maksimal 1MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, appLogo: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Pengaturan Aplikasi</h1>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-indigo-600" />
            Tampilan & Informasi
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nama Aplikasi / Sekolah</label>
            <Input 
              value={formData.appName} 
              onChange={e => setFormData(prev => ({ ...prev, appName: e.target.value }))}
              placeholder="Contoh: LMS SMA 1 Jakarta"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Logo Aplikasi</label>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center bg-slate-50 overflow-hidden">
                {formData.appLogo ? (
                  <img src={formData.appLogo} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon className="w-6 h-6 text-slate-400" />
                )}
              </div>
              <div className="flex-1">
                <input 
                  type="file" 
                  accept="image/png, image/jpeg, image/svg+xml"
                  onChange={handleLogoUpload}
                  className="block w-full text-sm text-slate-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-full file:border-0
                    file:text-sm file:font-semibold
                    file:bg-indigo-50 file:text-indigo-700
                    hover:file:bg-indigo-100"
                />
                <p className="text-xs text-slate-500 mt-1">Format didukung: PNG, JPG, SVG. Maks 1MB.</p>
              </div>
            </div>
          </div>
          
          <Button onClick={handleSave} className="w-full">
            <Save className="w-4 h-4 mr-2" />
            Simpan Pengaturan
          </Button>
        </CardContent>
      </Card>

      {user?.role === 'SUPER_ADMIN' && (
        <Card className="border-rose-200 shadow-xs overflow-hidden">
          <CardHeader className="bg-rose-50/50 border-b border-rose-100">
            <CardTitle className="text-base flex items-center justify-between">
              <div className="flex items-center gap-2 text-rose-700 font-bold">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
                Zona Berbahaya: Pembersihan Database
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200 uppercase">
                Khusus Super Admin
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <p className="text-xs text-slate-600 leading-relaxed">
              Fasilitas pembersihan database digunakan untuk menghapus data siswa, guru, materi pelajaran, atau hasil ujian saat pergantian semester dan tahun ajaran baru. Tindakan ini permanen, namun akun Super Admin selalu terlindungi.
            </p>
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-slate-500 flex items-center gap-1.5">
                <Database className="w-4 h-4 text-slate-400" />
                Mendukung backup & pembersihan selektif
              </span>
              <Link to="/admin/database">
                <Button variant="danger" size="sm" className="text-xs font-bold gap-2">
                  <Trash2 className="w-3.5 h-3.5" />
                  Buka Menu Pembersihan Database
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
