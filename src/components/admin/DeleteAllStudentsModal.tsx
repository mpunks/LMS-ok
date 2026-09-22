import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { 
  Trash2, 
  AlertTriangle, 
  X, 
  Users,
  ShieldAlert
} from 'lucide-react';
import { toast } from '@/components/ui/Toast';
import { useDataStore } from '@/store/dataStore';

interface DeleteAllStudentsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DeleteAllStudentsModal({ isOpen, onClose }: DeleteAllStudentsModalProps) {
  const { users, deleteAllStudents } = useDataStore();
  const students = users.filter(u => u.role === 'STUDENT');
  
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen) return null;

  const isConfirmed = confirmText.trim().toUpperCase() === 'HAPUS SISWA';

  const handleDeleteAll = async () => {
    if (!isConfirmed) {
      toast.error('Ketik "HAPUS SISWA" untuk mengonfirmasi penghapusan');
      return;
    }

    try {
      setIsDeleting(true);
      const count = await deleteAllStudents();
      toast.success(`Berhasil menghapus seluruh data ${count} siswa`);
      handleClose();
    } catch (error: any) {
      console.error('Delete students error:', error);
      toast.error(error.message || 'Gagal menghapus data siswa');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    setConfirmText('');
    setIsDeleting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200 border border-rose-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-rose-100 flex items-center justify-between bg-rose-50/70">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-600 text-white shadow-md shadow-rose-200">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-rose-950">
                Hapus Seluruh Data Siswa
              </h2>
              <p className="text-xs text-rose-700">
                Tindakan pembersihan khusus data rombongan belajar siswa
              </p>
            </div>
          </div>
          <button 
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-600 p-2 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex gap-3 text-xs text-rose-900">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold">Peringatan Kritis:</p>
              <p className="text-[11px] text-rose-800">
                Tindakan ini akan menghapus <strong>seluruh {students.length} data siswa</strong> dari database lokal dan tabel Google Sheets.
              </p>
              <p className="text-[11px] text-rose-800 font-semibold mt-1">
                Data Guru, Pengajar, dan Super Admin TIDAK akan dihapus.
              </p>
            </div>
          </div>

          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-2">
            <div className="flex justify-between text-slate-600">
              <span>Total Siswa saat ini:</span>
              <strong className="text-slate-900 font-bold">{students.length} orang</strong>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Status Guru & Admin:</span>
              <span className="text-emerald-700 font-semibold">Tetap Aman (Terlindungi)</span>
            </div>
          </div>

          <div className="space-y-2 pt-1">
            <label className="text-xs font-semibold text-slate-700 block">
              Untuk melanjutkan, ketik <strong className="text-rose-600 font-bold tracking-wider">HAPUS SISWA</strong> pada kolom di bawah:
            </label>
            <input 
              type="text" 
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Ketik HAPUS SISWA di sini..." 
              className="w-full px-3.5 py-2.5 border-2 border-rose-200 rounded-xl text-sm focus:border-rose-600 outline-none font-bold text-center tracking-wider text-rose-900 bg-rose-50/20"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 justify-end pt-3 border-t border-slate-100">
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleClose}
              disabled={isDeleting}
            >
              Batal
            </Button>
            <Button 
              type="button" 
              onClick={handleDeleteAll}
              disabled={!isConfirmed || isDeleting}
              className="gap-2 bg-rose-600 hover:bg-rose-700 text-white"
            >
              <Trash2 className="w-4 h-4" />
              {isDeleting ? 'Menghapus Siswa...' : `Hapus ${students.length} Siswa`}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
