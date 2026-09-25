import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { 
  Users, 
  Search, 
  Plus, 
  GraduationCap, 
  Upload, 
  Trash2, 
  KeyRound, 
  Edit2, 
  BookOpen, 
  Filter,
  Check,
  ArrowUpCircle,
  Sparkles,
  AlertTriangle,
  RefreshCw,
  CloudCheck
} from 'lucide-react';
import { toast } from '@/components/ui/Toast';
import { useDataStore } from '@/store/dataStore';
import { useGasStore } from '@/store/gasStore';
import ImportUsersModal from '@/components/admin/ImportUsersModal';
import PromotionModal from '@/components/admin/PromotionModal';
import DeleteAllStudentsModal from '@/components/admin/DeleteAllStudentsModal';
import { STANDARD_SCHOOL_SUBJECTS } from '@/data/schoolSubjects';
import { ALL_SCHOOL_CLASSES } from '@/data/schoolClasses';

export default function AdminStudents() {
  const [activeTab, setActiveTab] = useState<'teachers' | 'students'>('teachers');
  const { 
    users, 
    addUser, 
    addUsers, 
    updateUser, 
    deleteUser, 
    resetPassword,
    deduplicateUsers
  } = useDataStore();
  
  const teachers = users.filter(u => u.role === 'TEACHER');
  const students = users.filter(u => u.role === 'STUDENT');
  
  const [search, setSearch] = useState('');
  const [genderFilter, setGenderFilter] = useState<'ALL' | 'L' | 'P'>('ALL');
  const [classFilter, setClassFilter] = useState<string>('ALL');
  const [subjectFilter, setSubjectFilter] = useState<string>('ALL');
  const [showForm, setShowForm] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showPromotionModal, setShowPromotionModal] = useState(false);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [isDeduplicating, setIsDeduplicating] = useState(false);
  const [isSyncingUsers, setIsSyncingUsers] = useState(false);
  const { isConnected, executeAction } = useGasStore();
  
  const [formData, setFormData] = useState<{
    id: string;
    name: string;
    gender: 'L' | 'P';
    subject: string;
    username: string;
    nik: string;
    nisn: string;
    classId: string;
  }>({ 
    id: '', 
    name: '', 
    gender: 'L', 
    subject: 'Matematika', 
    username: '', 
    nik: '', 
    nisn: '', 
    classId: '7A' 
  });
  const [isEdit, setIsEdit] = useState(false);

  // Filtered dataset
  const filteredData = activeTab === 'teachers' 
    ? teachers.filter(t => {
        const matchesSearch = t.name.toLowerCase().includes(search.toLowerCase()) || 
          t.nik?.includes(search) || 
          t.subject?.toLowerCase().includes(search.toLowerCase());
        const matchesGender = genderFilter === 'ALL' || t.gender === genderFilter;
        const matchesSubject = subjectFilter === 'ALL' || t.subject === subjectFilter;
        return matchesSearch && matchesGender && matchesSubject;
      })
    : students.filter(s => {
        const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase()) || 
          s.nisn?.includes(search) || 
          s.classId?.toLowerCase().includes(search.toLowerCase());
        const matchesGender = genderFilter === 'ALL' || s.gender === genderFilter;
        const matchesClass = classFilter === 'ALL' || s.classId === classFilter;
        return matchesSearch && matchesGender && matchesClass;
      });

  // Statistics counters
  const teacherLCount = teachers.filter(t => t.gender === 'L').length;
  const teacherPCount = teachers.filter(t => t.gender === 'P').length;
  const studentLCount = students.filter(s => s.gender === 'L').length;
  const studentPCount = students.filter(s => s.gender === 'P').length;

  // Detect duplicate students
  const duplicateStudentCount = useMemo(() => {
    const seen = new Set<string>();
    let duplicates = 0;
    for (const s of students) {
      const key = s.nisn && s.nisn.trim() 
        ? `nisn:${s.nisn.trim()}` 
        : `name:${s.name.toLowerCase().trim()}::${(s.classId || '').toUpperCase().trim()}`;
      if (seen.has(key)) {
        duplicates++;
      } else {
        seen.add(key);
      }
    }
    return duplicates;
  }, [students]);

  const handleDeduplicate = async () => {
    try {
      setIsDeduplicating(true);
      const res = await deduplicateUsers();
      if (res.duplicatesRemoved > 0) {
        toast.success(`Berhasil membersihkan ${res.duplicatesRemoved} data duplikat! Total siswa tersisa ${res.totalRemaining}.`);
      } else {
        toast.info('Database bersih: tidak ditemukan data ganda/duplikat.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Gagal membersihkan duplikat');
    } finally {
      setIsDeduplicating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Nama wajib diisi');
      return;
    }

    try {
      if (isEdit) {
        await updateUser(formData.id, {
          name: formData.name.trim(),
          gender: formData.gender,
          ...(activeTab === 'teachers' 
            ? { username: formData.username.trim(), nik: formData.nik.trim(), subject: formData.subject } 
            : { nisn: formData.nisn.trim(), classId: formData.classId })
        });
        toast.success('Data berhasil diperbarui');
      } else {
        const newUser = {
          id: `${activeTab === 'teachers' ? 't' : 's'}-${Date.now()}`,
          name: formData.name.trim(),
          gender: formData.gender,
          role: activeTab === 'teachers' ? 'TEACHER' as const : 'STUDENT' as const,
          ...(activeTab === 'teachers' 
            ? { username: formData.username.trim(), nik: formData.nik.trim(), subject: formData.subject } 
            : { nisn: formData.nisn.trim(), classId: formData.classId })
        };
        await addUser(newUser);
        toast.success('Data berhasil ditambahkan');
      }
      
      setShowForm(false);
      setIsEdit(false);
      setFormData({ id: '', name: '', gender: 'L', subject: 'Matematika', username: '', nik: '', nisn: '', classId: '7A' });
    } catch (error: any) {
      toast.error(error.message || 'Gagal menyimpan data');
    }
  };

  const handleEdit = (user: any) => {
    setFormData({
      id: user.id,
      name: user.name,
      gender: (user.gender === 'P' ? 'P' : 'L'),
      subject: user.subject || 'Matematika',
      username: user.username || '',
      nik: user.nik || '',
      nisn: user.nisn || '',
      classId: user.classId || '7A'
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

  const handleSyncUsersToGas = async () => {
    if (!isConnected) {
      toast.error('Webhook Google Sheets belum terhubung. Konfigurasikan Webhook di menu Integrasi GAS.');
      return;
    }
    setIsSyncingUsers(true);
    try {
      const res = await executeAction('setAllUsers', { users });
      if (res && res.success) {
        toast.success(`Berhasil! ${users.length} data guru & siswa telah tersimpan di sheet 'Users' Google Sheets.`);
      } else {
        toast.error(res?.error || 'Gagal sinkronisasi pengguna ke Google Sheet');
      }
    } catch (err: any) {
      toast.error('Gagal: ' + err?.message);
    } finally {
      setIsSyncingUsers(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900">Data Guru & Siswa</h1>
            {isConnected ? (
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                <CloudCheck className="w-3 h-3 text-emerald-600" /> Google Sheet Aktif
              </span>
            ) : (
              <span className="text-[11px] font-normal px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                Penyimpanan Lokal
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Pengelolaan profil pengajar, mata pelajaran ampuan, jenis kelamin (L/P), dan data rombongan belajar siswa.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isConnected && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 shrink-0 border-emerald-300 text-emerald-800 bg-emerald-50 hover:bg-emerald-100"
              onClick={handleSyncUsersToGas}
              disabled={isSyncingUsers}
              title="Kirim dan sinkronkan seluruh data pengguna saat ini ke Google Sheet"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-emerald-600 ${isSyncingUsers ? 'animate-spin' : ''}`} />
              {isSyncingUsers ? 'Menyinkronkan...' : 'Sinkronkan ke Google Sheet'}
            </Button>
          )}
          {activeTab === 'students' && (
            <>
              {duplicateStudentCount > 0 && (
                <Button 
                  variant="outline" 
                  size="sm"
                  className="gap-1.5 shrink-0 border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100" 
                  onClick={handleDeduplicate}
                  disabled={isDeduplicating}
                  title="Bersihkan data ganda/duplikat akibat impor berulang"
                >
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  {isDeduplicating ? 'Membersihkan...' : `Bersihkan Duplikat (${duplicateStudentCount})`}
                </Button>
              )}

              <Button 
                variant="outline" 
                size="sm"
                className="gap-1.5 shrink-0 border-indigo-200 text-indigo-700 hover:bg-indigo-50" 
                onClick={() => setShowPromotionModal(true)}
                title="Proses otomatis kenaikan kelas 7 ke 8, 8 ke 9, dan kelulusan kelas 9"
              >
                <ArrowUpCircle className="w-4 h-4 text-indigo-600" /> Kenaikan Kelas Otomatis
              </Button>

              <Button 
                variant="outline" 
                size="sm"
                className="gap-1.5 shrink-0 border-rose-200 text-rose-700 hover:bg-rose-50" 
                onClick={() => setShowDeleteAllModal(true)}
                title="Hapus seluruh data siswa dari database tanpa menghapus guru"
              >
                <Trash2 className="w-4 h-4 text-rose-600" /> Hapus Seluruh Siswa
              </Button>
            </>
          )}

          <Button 
            variant="outline" 
            size="sm"
            className="gap-2 shrink-0 border-slate-300 text-slate-700 hover:bg-slate-50" 
            onClick={() => setShowImportModal(true)}
          >
            <Upload className="w-4 h-4" /> Impor Data (Excel / CSV)
          </Button>

          <Button 
            size="sm"
            className="gap-2 shrink-0 bg-indigo-600 hover:bg-indigo-700" 
            onClick={() => {
              setIsEdit(false);
              setFormData({ id: '', name: '', gender: 'L', subject: 'Matematika', username: '', nik: '', nisn: '', classId: '7A' });
              setShowForm(!showForm);
            }}
          >
            <Plus className="w-4 h-4" /> Tambah {activeTab === 'teachers' ? 'Guru' : 'Siswa'}
          </Button>
        </div>
      </div>

      {/* Duplicate Alert Banner */}
      {activeTab === 'students' && duplicateStudentCount > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs animate-in fade-in">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-100 text-amber-800 rounded-xl mt-0.5 sm:mt-0 shrink-0">
              <AlertTriangle className="w-5 h-5 text-amber-700" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-950 flex items-center gap-2">
                Terdeteksi {duplicateStudentCount} Data Siswa Ganda (Duplikat)
                <span className="text-[11px] font-normal px-2 py-0.5 rounded-full bg-amber-200/80 text-amber-900">
                  Akibat 2x Impor
                </span>
              </h4>
              <p className="text-xs text-amber-800 mt-0.5">
                Sistem mendeteksi NISN atau nama siswa yang sama tersimpan lebih dari sekali. 
                Gunakan filter pembersih untuk menyatukan data kembali tanpa kehilangan informasi.
              </p>
            </div>
          </div>
          <Button 
            size="sm" 
            onClick={handleDeduplicate}
            disabled={isDeduplicating}
            className="gap-2 bg-amber-700 hover:bg-amber-800 text-white shrink-0 self-end sm:self-center shadow-xs"
          >
            <Sparkles className="w-4 h-4" />
            {isDeduplicating ? 'Memproses Filter...' : 'Bersihkan & Filter Duplikat Sekarang'}
          </Button>
        </div>
      )}

      {showForm && (
        <Card className="border-indigo-100 bg-indigo-50/30 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold text-indigo-950 flex items-center gap-2">
              {activeTab === 'teachers' ? <BookOpen className="w-5 h-5 text-indigo-600" /> : <GraduationCap className="w-5 h-5 text-indigo-600" />}
              {isEdit ? 'Edit Data' : 'Tambah Data'} {activeTab === 'teachers' ? 'Guru Pengajar' : 'Siswa'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
              <Input
                label="Nama Lengkap"
                placeholder="Contoh: Budi Santoso, S.Pd"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                required
              />

              {/* Input Jenis Kelamin */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Jenis Kelamin</label>
                <div className="flex gap-2 h-10 items-center">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, gender: 'L' })}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg border text-xs font-semibold transition-all ${
                      formData.gender === 'L'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <span>♂ Laki-laki (L)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, gender: 'P' })}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg border text-xs font-semibold transition-all ${
                      formData.gender === 'P'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <span>♀ Perempuan (P)</span>
                  </button>
                </div>
              </div>

              {activeTab === 'teachers' ? (
                <>
                  {/* Pilihan Mata Pelajaran yang Diampu */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                      Mata Pelajaran yang Diampu
                    </label>
                    <select
                      value={formData.subject}
                      onChange={e => setFormData({ ...formData, subject: e.target.value })}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white font-medium text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                      {STANDARD_SCHOOL_SUBJECTS.map(subj => (
                        <option key={subj.id} value={subj.id}>
                          {subj.name} ({subj.category})
                        </option>
                      ))}
                    </select>
                  </div>

                  <Input
                    label="Username"
                    placeholder="Contoh: budi.santoso"
                    value={formData.username}
                    onChange={e => setFormData({...formData, username: e.target.value})}
                    required
                  />

                  <Input
                    label="NIK / NIP (16 Digit)"
                    placeholder="198001012005011001"
                    value={formData.nik}
                    onChange={e => setFormData({...formData, nik: e.target.value})}
                    maxLength={18}
                    required
                  />
                </>
              ) : (
                <>
                  <Input
                    label="NISN (10 Digit)"
                    placeholder="0081234567"
                    value={formData.nisn}
                    onChange={e => setFormData({...formData, nisn: e.target.value})}
                    maxLength={12}
                    required
                  />

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                      <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
                      Rombel / Kelas (7A - 9K)
                    </label>
                    <select
                      value={formData.classId}
                      onChange={e => setFormData({ ...formData, classId: e.target.value })}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white font-medium text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                      {ALL_SCHOOL_CLASSES.map(cls => (
                        <option key={cls} value={cls}>Kelas {cls}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              <div className="lg:col-span-3 flex gap-2 justify-end mt-2 pt-2 border-t border-indigo-100">
                <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Batal</Button>
                <Button type="submit">Simpan Data {activeTab === 'teachers' ? 'Guru' : 'Siswa'}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        {/* Navigation Tabs with Gender Breakdown Counters */}
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => { setActiveTab('teachers'); setShowForm(false); setGenderFilter('ALL'); }}
            className={`flex-1 py-4 px-4 text-sm font-semibold text-center transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'teachers' ? 'bg-white text-indigo-600 border-b-2 border-indigo-600' : 'bg-slate-50 text-slate-500 hover:text-slate-700'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Daftar Guru ({teachers.length})</span>
            <div className="hidden sm:flex items-center gap-1.5 ml-2 text-xs font-normal">
              <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-100 font-medium">
                {teacherLCount} L
              </span>
              <span className="bg-rose-50 text-rose-700 px-2 py-0.5 rounded-full border border-rose-100 font-medium">
                {teacherPCount} P
              </span>
            </div>
          </button>
          <button
            onClick={() => { setActiveTab('students'); setShowForm(false); setGenderFilter('ALL'); }}
            className={`flex-1 py-4 px-4 text-sm font-semibold text-center transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'students' ? 'bg-white text-indigo-600 border-b-2 border-indigo-600' : 'bg-slate-50 text-slate-500 hover:text-slate-700'
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            <span>Daftar Siswa ({students.length})</span>
            <div className="hidden sm:flex items-center gap-1.5 ml-2 text-xs font-normal">
              <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-100 font-medium">
                {studentLCount} L
              </span>
              <span className="bg-rose-50 text-rose-700 px-2 py-0.5 rounded-full border border-rose-100 font-medium">
                {studentPCount} P
              </span>
            </div>
          </button>
        </div>

        <CardContent className="p-0">
          {/* Filter & Search Bar */}
          <div className="p-4 border-b border-slate-100 flex flex-wrap gap-3 items-center justify-between">
            <div className="flex-1 min-w-[240px] max-w-md relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={activeTab === 'teachers' ? "Cari nama, NIK, atau mata pelajaran..." : "Cari nama, NISN, atau kelas..."} 
                className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            {/* Filter by Gender */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-500 mr-1">Filter JK:</span>
              <button
                onClick={() => setGenderFilter('ALL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  genderFilter === 'ALL'
                    ? 'bg-slate-800 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Semua ({activeTab === 'teachers' ? teachers.length : students.length})
              </button>
              <button
                onClick={() => setGenderFilter('L')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                  genderFilter === 'L'
                    ? 'bg-blue-600 text-white'
                    : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                }`}
              >
                <span>♂ Laki-laki</span>
                <span className="px-1.5 py-0.2 rounded-full bg-blue-200/50 text-[10px]">
                  {activeTab === 'teachers' ? teacherLCount : studentLCount}
                </span>
              </button>
              <button
                onClick={() => setGenderFilter('P')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                  genderFilter === 'P'
                    ? 'bg-rose-600 text-white'
                    : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                }`}
              >
                <span>♀ Perempuan</span>
                <span className="px-1.5 py-0.2 rounded-full bg-rose-200/50 text-[10px]">
                  {activeTab === 'teachers' ? teacherPCount : studentPCount}
                </span>
              </button>
            </div>

            {/* Additional Filter: Class for Students, Subject for Teachers */}
            {activeTab === 'students' ? (
              <select
                value={classFilter}
                onChange={e => setClassFilter(e.target.value)}
                className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white font-medium text-slate-700 outline-none"
              >
                <option value="ALL">Semua Kelas</option>
                {ALL_SCHOOL_CLASSES.map(c => (
                  <option key={c} value={c}>Kelas {c}</option>
                ))}
              </select>
            ) : (
              <select
                value={subjectFilter}
                onChange={e => setSubjectFilter(e.target.value)}
                className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white font-medium text-slate-700 outline-none max-w-[180px]"
              >
                <option value="ALL">Semua Mata Pelajaran</option>
                {STANDARD_SCHOOL_SUBJECTS.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-slate-600">
              <thead className="text-xs text-slate-700 uppercase bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">Nama Lengkap</th>
                  <th className="px-6 py-4 text-center w-24">Jenis Kelamin</th>
                  {activeTab === 'teachers' ? (
                    <>
                      <th className="px-6 py-4">Mata Pelajaran</th>
                      <th className="px-6 py-4">NIK / Username</th>
                      <th className="px-6 py-4">Kelas Ampuan</th>
                    </>
                  ) : (
                    <>
                      <th className="px-6 py-4">NISN</th>
                      <th className="px-6 py-4">Kelas</th>
                    </>
                  )}
                  <th className="px-6 py-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map(user => (
                  <tr key={user.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                    <td className="px-6 py-4 font-semibold text-slate-900">
                      {user.name}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {user.gender === 'P' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          ♀ Perempuan (P)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          ♂ Laki-laki (L)
                        </span>
                      )}
                    </td>
                    
                    {activeTab === 'teachers' ? (
                      <>
                        <td className="px-6 py-4">
                          {user.subject ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                              <BookOpen className="w-3 h-3" />
                              {user.subject}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400 italic">Belum diatur</span>
                          )}
                        </td>
                        <td className="px-6 py-4 font-mono text-xs text-slate-700">
                          {user.nik ? (
                            <div>
                              <div className="font-semibold">{user.nik}</div>
                              <div className="text-slate-400 text-[11px] font-sans">@{user.username}</div>
                            </div>
                          ) : (
                            `@${user.username}`
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {user.assignedClasses && user.assignedClasses.length > 0 ? (
                            <div className="flex flex-wrap gap-1 max-w-xs">
                              {user.assignedClasses.map(c => (
                                <span key={c} className="text-[10px] bg-slate-100 text-slate-700 font-bold px-1.5 py-0.5 rounded border border-slate-200">
                                  {c}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 italic">Belum diatur</span>
                          )}
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-6 py-4 font-mono text-xs font-medium text-slate-700">
                          {user.nisn || '-'}
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 font-bold text-xs rounded-md border border-indigo-100">
                            Kelas {user.classId}
                          </span>
                        </td>
                      </>
                    )}

                    <td className="px-6 py-4 text-right space-x-2">
                      <Button variant="outline" size="sm" onClick={() => handleResetPassword(user)} title="Reset Sandi Default">
                        <KeyRound className="w-4 h-4" />
                      </Button>
                      <Button variant="secondary" size="sm" onClick={() => handleEdit(user)} title="Edit Profil">
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button variant="danger" size="sm" onClick={() => handleDelete(user.id)} title="Hapus Pengguna">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
                {filteredData.length === 0 && (
                  <tr>
                    <td colSpan={activeTab === 'teachers' ? 6 : 5} className="px-6 py-10 text-center text-slate-500">
                      Data tidak ditemukan untuk kriteria pencarian dan filter yang dipilih.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <ImportUsersModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        defaultRole={activeTab === 'teachers' ? 'TEACHER' : 'STUDENT'}
        onImportSuccess={async (newUsers) => {
          await addUsers(newUsers);
          if (isConnected) {
            toast.success(`Berhasil! ${newUsers.length} data telah diimpor dan otomatis disimpan ke Google Sheet.`);
          }
        }}
      />
    </div>
  );
}
