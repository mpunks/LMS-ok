import React, { useState } from 'react';
import { 
  KeyRound, 
  Eye, 
  EyeOff, 
  Check, 
  X, 
  ShieldCheck, 
  AlertTriangle, 
  Lock 
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/Toast';
import { useAuthStore } from '@/store/authStore';
import { useDataStore } from '@/store/dataStore';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ChangePasswordModal({ isOpen, onClose }: ChangePasswordModalProps) {
  const { user, updateCurrentUser } = useAuthStore();
  const { updateUser, changePassword } = useDataStore();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !user) return null;

  // Evaluate password strength
  const getStrength = (pass: string) => {
    if (!pass) return { score: 0, label: '', color: 'bg-slate-200' };
    let s = 0;
    if (pass.length >= 6) s += 1;
    if (pass.length >= 8) s += 1;
    if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) s += 1;
    if (/\d/.test(pass)) s += 1;
    if (/[^A-Za-z0-9]/.test(pass)) s += 1;

    if (s <= 2) return { score: 1, label: 'Lemah', color: 'bg-rose-500' };
    if (s <= 3) return { score: 2, label: 'Cukup', color: 'bg-amber-500' };
    return { score: 3, label: 'Kuat', color: 'bg-emerald-500' };
  };

  const strength = getStrength(newPassword);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanCurrent = currentPassword.trim();
    const cleanNew = newPassword.trim();
    const cleanConfirm = confirmPassword.trim();

    if (!cleanCurrent) {
      toast.error('Masukkan kata sandi saat ini / bawaan');
      return;
    }

    if (cleanNew.length < 6) {
      toast.error('Kata sandi baru minimal harus 6 karakter');
      return;
    }

    if (cleanNew === cleanCurrent) {
      toast.error('Kata sandi baru tidak boleh sama dengan kata sandi lama');
      return;
    }

    if (cleanNew !== cleanConfirm) {
      toast.error('Konfirmasi kata sandi baru tidak cocok');
      return;
    }

    // Verify current password against user records
    let isCurrentValid = false;
    if (user.password) {
      isCurrentValid = user.password === cleanCurrent;
    } else {
      // Default passwords:
      if (user.role === 'STUDENT') {
        const nisn = (user.nisn || '').trim();
        const nisnNoZero = nisn.replace(/^0+/, '');
        isCurrentValid = cleanCurrent === nisn || cleanCurrent === nisnNoZero || cleanCurrent === '123456';
      } else if (user.role === 'TEACHER') {
        const nik = (user.nik || '').trim();
        isCurrentValid = cleanCurrent === nik || cleanCurrent === '123456';
      } else {
        // Admin
        isCurrentValid = cleanCurrent === 'Asepst007@' || cleanCurrent === '123456' || (Boolean(user.nik) && cleanCurrent === user.nik);
      }
    }

    if (!isCurrentValid) {
      toast.error('Kata sandi saat ini salah. Pastikan NISN/NIK bawaan atau kata sandi lama Anda benar.');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Update in dataStore (syncs to server /api/data, /api/users/change-password, and GAS Webhook)
      await changePassword(user.id, cleanNew);

      // 2. Update active session user
      updateCurrentUser({ password: cleanNew });

      toast.success('Kata sandi berhasil diperbarui dan tersimpan permanen di Google Sheet!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Gagal mengubah kata sandi');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="bg-linear-to-r from-indigo-600 to-indigo-700 px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-white/15 backdrop-blur-sm text-white">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">Ubah Kata Sandi</h2>
              <p className="text-xs text-indigo-100 mt-0.5">
                Perbarui kata sandi untuk mengamankan akun Anda
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* User info banner */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                {user.name.substring(0, 1)}
              </div>
              <div>
                <div className="font-semibold text-slate-800">{user.name}</div>
                <div className="text-[11px] text-slate-500">
                  {user.role === 'STUDENT' ? `NISN: ${user.nisn || '-'} • Kelas ${user.classId || '-'}` : user.role === 'TEACHER' ? `NIK: ${user.nik || '-'}` : user.username || user.name}
                </div>
              </div>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
              {user.role === 'STUDENT' ? 'Siswa' : user.role === 'TEACHER' ? 'Guru' : 'Admin'}
            </span>
          </div>

          {/* Current Password Field */}
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Kata Sandi Saat Ini / Bawaan <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showCurrent ? 'text' : 'password'}
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                placeholder={user.role === 'STUDENT' ? 'Masukkan NISN atau kata sandi lama' : 'Masukkan NIK atau kata sandi lama'}
                className="w-full h-10 rounded-lg border border-slate-300 pl-3 pr-10 bg-white text-xs text-slate-800 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                required
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
              >
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              {user.password 
                ? 'Masukkan kata sandi yang Anda gunakan saat ini.' 
                : (user.role === 'STUDENT' ? 'Akun baru: gunakan NISN Anda sebagai sandi bawaan.' : 'Akun baru: gunakan NIK atau 123456 sebagai sandi bawaan.')}
            </p>
          </div>

          {/* New Password Field */}
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Kata Sandi Baru <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Minimal 6 karakter"
                minLength={6}
                className="w-full h-10 rounded-lg border border-slate-300 pl-3 pr-10 bg-white text-xs text-slate-800 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                required
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
              >
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Strength meter */}
            {newPassword && (
              <div className="mt-2 space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">Kekuatan Sandi:</span>
                  <span className="font-semibold text-slate-700">{strength.label}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden flex gap-1">
                  <div className={`h-full flex-1 rounded-full ${strength.score >= 1 ? strength.color : 'bg-slate-200'}`}></div>
                  <div className={`h-full flex-1 rounded-full ${strength.score >= 2 ? strength.color : 'bg-slate-200'}`}></div>
                  <div className={`h-full flex-1 rounded-full ${strength.score >= 3 ? strength.color : 'bg-slate-200'}`}></div>
                </div>
              </div>
            )}
          </div>

          {/* Confirm New Password Field */}
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Ulangi Kata Sandi Baru <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Ketik ulang kata sandi baru"
                className="w-full h-10 rounded-lg border border-slate-300 pl-3 pr-10 bg-white text-xs text-slate-800 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
              >
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {confirmPassword && (
              <div className="text-[11px] mt-1 flex items-center gap-1 font-medium">
                {confirmPassword === newPassword ? (
                  <span className="text-emerald-600 flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> Cocok dengan kata sandi baru
                  </span>
                ) : (
                  <span className="text-rose-600 flex items-center gap-1">
                    <X className="w-3.5 h-3.5" /> Belum cocok
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Security alert */}
          <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-[11px] text-amber-900 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>Penting:</strong> Setelah kata sandi diperbarui, orang lain tidak akan bisa masuk menggunakan NISN/NIK Anda. Pastikan Anda mengingat atau mencatat kata sandi baru Anda.
            </p>
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Batal
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting || !currentPassword || !newPassword || newPassword !== confirmPassword || newPassword.length < 6}
              className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5"
            >
              <KeyRound className="w-4 h-4" />
              {isSubmitting ? 'Menyimpan...' : 'Simpan Kata Sandi Baru'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
