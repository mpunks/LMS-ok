import React, { useState, useEffect } from 'react';
import { 
  GraduationCap, 
  Check, 
  X, 
  Search, 
  CheckCheck, 
  RotateCcw, 
  Users, 
  Layers, 
  Sparkles,
  Info,
  BookOpen
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { 
  ALL_SCHOOL_CLASSES, 
  GRADE_7_CLASSES, 
  GRADE_8_CLASSES, 
  GRADE_9_CLASSES, 
  SCHOOL_CLASSES_BY_GRADE 
} from '@/data/schoolClasses';
import { STANDARD_SCHOOL_SUBJECTS } from '@/data/schoolSubjects';
import { useDataStore } from '@/store/dataStore';
import { useAuthStore } from '@/store/authStore';
import { toast } from '@/components/ui/Toast';

interface ManageTeacherClassesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (classes: string[], subject?: string) => void;
}

export default function ManageTeacherClassesModal({
  isOpen,
  onClose,
  onSaved,
}: ManageTeacherClassesModalProps) {
  const { user, updateTeachingAssignment, updateAssignedClasses } = useAuthStore();
  const { users, updateUser } = useDataStore();

  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>('Matematika');
  const [activeGradeTab, setActiveGradeTab] = useState<number | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Initialize selected classes from user state
  useEffect(() => {
    if (isOpen && user) {
      // Default to existing assignedClasses or empty array
      setSelectedClasses(user.assignedClasses || []);
      setSelectedSubject(user.subject || 'Matematika');
      setActiveGradeTab('all');
      setSearchQuery('');
    }
  }, [isOpen, user]);

  if (!isOpen) return null;

  // Count students per class
  const getStudentCount = (classId: string) => {
    return users.filter(u => u.role === 'STUDENT' && u.classId === classId).length;
  };

  const handleToggleClass = (classId: string) => {
    setSelectedClasses(prev => 
      prev.includes(classId)
        ? prev.filter(c => c !== classId)
        : [...prev, classId]
    );
  };

  const handleSelectAllInGrade = (classes: string[]) => {
    setSelectedClasses(prev => {
      const set = new Set(prev);
      classes.forEach(c => set.add(c));
      return Array.from(set);
    });
  };

  const handleDeselectAllInGrade = (classes: string[]) => {
    setSelectedClasses(prev => prev.filter(c => !classes.includes(c)));
  };

  const handleSelectAll = () => {
    setSelectedClasses([...ALL_SCHOOL_CLASSES]);
  };

  const handleClearAll = () => {
    setSelectedClasses([]);
  };

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);

    try {
      // 1. Update session state
      if (updateTeachingAssignment) {
        updateTeachingAssignment(selectedClasses, selectedSubject);
      } else {
        updateAssignedClasses(selectedClasses);
      }

      // 2. Persist to dataStore and GAS sync
      await updateUser(user.id, { 
        assignedClasses: selectedClasses,
        subject: selectedSubject 
      });

      toast.success(
        `Berhasil memperbarui penugasan: ${selectedSubject} (${selectedClasses.length} kelas ampuan aktif)`
      );

      if (onSaved) {
        onSaved(selectedClasses, selectedSubject);
      }
      onClose();
    } catch (err) {
      console.warn('Gagal menyimpan kelas ampuan:', err);
      toast.error('Terjadi kendala saat menyimpan penugasan kelas.');
    } finally {
      setIsSaving(false);
    }
  };

  // Filter groups according to tab and search
  const filteredGroups = SCHOOL_CLASSES_BY_GRADE
    .filter(group => activeGradeTab === 'all' || group.grade === activeGradeTab)
    .map(group => {
      const filteredClasses = group.classes.filter(c => 
        c.toLowerCase().includes(searchQuery.trim().toLowerCase())
      );
      return {
        ...group,
        classes: filteredClasses,
      };
    })
    .filter(group => group.classes.length > 0);

  // Selected counts
  const countGrade7 = selectedClasses.filter(c => GRADE_7_CLASSES.includes(c)).length;
  const countGrade8 = selectedClasses.filter(c => GRADE_8_CLASSES.includes(c)).length;
  const countGrade9 = selectedClasses.filter(c => GRADE_9_CLASSES.includes(c)).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-3xl w-full flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-100 flex items-start justify-between bg-gradient-to-r from-indigo-50 via-white to-blue-50">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                Kelola Kelas Ampuan Guru
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                  Tahun Ajaran Aktif
                </span>
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                Pilih rombongan belajar yang Anda ajar sesuai SK Pembagian Tugas (7A-7L, 8A-8L, 9A-9K).
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Subject Assignment Banner */}
        <div className="px-5 py-3 bg-indigo-50/60 border-b border-indigo-100/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <label htmlFor="teacher-subject-select" className="text-xs font-bold text-slate-800 tracking-wide block">
                Mata Pelajaran yang Diampu
              </label>
              <p className="text-[11px] text-slate-500">
                Bidang studi pengajaran aktif tahun ajaran ini
              </p>
            </div>
          </div>
          <div className="w-full sm:w-64">
            <select
              id="teacher-subject-select"
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full px-3 py-1.5 text-xs sm:text-sm font-medium bg-white border border-indigo-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-xs cursor-pointer"
            >
              {STANDARD_SCHOOL_SUBJECTS.map((subj) => (
                <option key={subj.id} value={subj.id}>
                  {subj.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/70 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            {/* Grade Tabs */}
            <div className="flex items-center p-1 bg-slate-200/70 rounded-xl w-full sm:w-auto">
              <button
                onClick={() => setActiveGradeTab('all')}
                className={`flex-1 sm:flex-initial px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  activeGradeTab === 'all'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Semua ({selectedClasses.length})
              </button>
              <button
                onClick={() => setActiveGradeTab(7)}
                className={`flex-1 sm:flex-initial px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  activeGradeTab === 7
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Kelas 7 ({countGrade7}/12)
              </button>
              <button
                onClick={() => setActiveGradeTab(8)}
                className={`flex-1 sm:flex-initial px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  activeGradeTab === 8
                    ? 'bg-white text-emerald-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Kelas 8 ({countGrade8}/12)
              </button>
              <button
                onClick={() => setActiveGradeTab(9)}
                className={`flex-1 sm:flex-initial px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  activeGradeTab === 9
                    ? 'bg-white text-purple-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Kelas 9 ({countGrade9}/11)
              </button>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-56">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Cari kelas (mis: 8C)..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 text-xs h-9 bg-white"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="flex flex-wrap items-center gap-2">
              {activeGradeTab === 'all' ? (
                <>
                  <button
                    onClick={handleSelectAll}
                    className="inline-flex items-center gap-1 text-xs font-medium text-indigo-700 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-md transition"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    Pilih Semua 35 Kelas
                  </button>
                  <button
                    onClick={() => handleSelectAllInGrade(GRADE_7_CLASSES)}
                    className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded-md transition"
                  >
                    + Semua Kelas 7
                  </button>
                  <button
                    onClick={() => handleSelectAllInGrade(GRADE_8_CLASSES)}
                    className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2 py-1 rounded-md transition"
                  >
                    + Semua Kelas 8
                  </button>
                  <button
                    onClick={() => handleSelectAllInGrade(GRADE_9_CLASSES)}
                    className="inline-flex items-center gap-1 text-xs font-medium text-purple-700 hover:text-purple-800 bg-purple-50 hover:bg-purple-100 px-2 py-1 rounded-md transition"
                  >
                    + Semua Kelas 9
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => {
                      if (activeGradeTab === 7) handleSelectAllInGrade(GRADE_7_CLASSES);
                      if (activeGradeTab === 8) handleSelectAllInGrade(GRADE_8_CLASSES);
                      if (activeGradeTab === 9) handleSelectAllInGrade(GRADE_9_CLASSES);
                    }}
                    className="inline-flex items-center gap-1 text-xs font-medium text-indigo-700 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-md transition"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    Pilih Semua Kelas {activeGradeTab}
                  </button>
                  <button
                    onClick={() => {
                      if (activeGradeTab === 7) handleDeselectAllInGrade(GRADE_7_CLASSES);
                      if (activeGradeTab === 8) handleDeselectAllInGrade(GRADE_8_CLASSES);
                      if (activeGradeTab === 9) handleDeselectAllInGrade(GRADE_9_CLASSES);
                    }}
                    className="inline-flex items-center gap-1 text-xs font-medium text-slate-700 hover:text-slate-800 bg-slate-200/80 hover:bg-slate-300 px-2.5 py-1 rounded-md transition"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Batal Pilih Kelas {activeGradeTab}
                  </button>
                </>
              )}
            </div>

            {selectedClasses.length > 0 && (
              <button
                onClick={handleClearAll}
                className="inline-flex items-center gap-1 text-xs font-medium text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2 py-1 rounded-md transition ml-auto"
              >
                <RotateCcw className="w-3 h-3" />
                Kosongkan Pilihan
              </button>
            )}
          </div>
        </div>

        {/* Classes Content List */}
        <div className="p-5 overflow-y-auto space-y-6 flex-1 bg-white">
          {filteredGroups.map(group => {
            const selectedInThisGroup = group.classes.filter(c => selectedClasses.includes(c)).length;
            const isAllSelected = group.classes.length > 0 && selectedInThisGroup === group.classes.length;

            return (
              <div key={group.grade} className="space-y-3">
                {/* Group Heading */}
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${group.color.accent}`} />
                    <h3 className="text-sm font-bold text-slate-900">
                      {group.label}
                    </h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${group.color.bg} ${group.color.text}`}>
                      {selectedInThisGroup} dari {group.classes.length} dipilih
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => 
                        isAllSelected 
                          ? handleDeselectAllInGrade(group.classes)
                          : handleSelectAllInGrade(group.classes)
                      }
                      className="text-xs font-medium text-slate-500 hover:text-indigo-600 transition"
                    >
                      {isAllSelected ? 'Batalkan Semua' : 'Pilih Semua'}
                    </button>
                  </div>
                </div>

                {/* Class Pill Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
                  {group.classes.map(classId => {
                    const isSelected = selectedClasses.includes(classId);
                    const studentCount = getStudentCount(classId);

                    return (
                      <button
                        key={classId}
                        type="button"
                        onClick={() => handleToggleClass(classId)}
                        className={`relative p-3 rounded-xl border text-left transition-all flex flex-col justify-between group ${
                          isSelected
                            ? 'bg-indigo-50/70 border-indigo-500 ring-2 ring-indigo-500/20 shadow-xs'
                            : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/80'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className={`text-base font-extrabold ${isSelected ? 'text-indigo-700' : 'text-slate-800'}`}>
                            {classId}
                          </span>
                          <div className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors ${
                            isSelected 
                              ? 'bg-indigo-600 text-white' 
                              : 'border border-slate-300 text-transparent group-hover:border-slate-400'
                          }`}>
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-500">
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3 text-slate-400" />
                            {studentCount} siswa
                          </span>
                          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                            isSelected ? 'bg-indigo-100/70 text-indigo-700' : 'bg-slate-100 text-slate-600'
                          }`}>
                            Tk. {group.grade}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {filteredGroups.length === 0 && (
            <div className="text-center py-10">
              <Layers className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-600">Tidak ada kelas yang cocok dengan pencarian "{searchQuery}"</p>
              <button 
                onClick={() => setSearchQuery('')}
                className="mt-2 text-xs text-indigo-600 font-semibold hover:underline"
              >
                Hapus filter pencarian
              </button>
            </div>
          )}
        </div>

        {/* Selected Summary Bar & Info */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-slate-600">
              <Info className="w-4 h-4 text-indigo-600 flex-shrink-0" />
              <span>
                <strong>{selectedClasses.length} kelas</strong> terpilih. Dashboard Guru hanya akan menampilkan kelas yang telah Anda centang di atas.
              </span>
            </div>

            {selectedClasses.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-slate-500 font-medium">Ringkasan:</span>
                {selectedClasses.slice(0, 8).map(cls => (
                  <span 
                    key={cls} 
                    className="inline-flex items-center gap-1 bg-white border border-slate-300 text-slate-800 px-2 py-0.5 rounded text-[11px] font-semibold"
                  >
                    {cls}
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleClass(cls);
                      }}
                      className="text-slate-400 hover:text-rose-500"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                {selectedClasses.length > 8 && (
                  <span className="text-[11px] text-indigo-600 font-semibold px-1">
                    +{selectedClasses.length - 8} kelas lainnya
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-1">
            <Button 
              variant="outline" 
              onClick={onClose} 
              disabled={isSaving}
              className="border-slate-300 text-slate-700"
            >
              Batal
            </Button>
            <Button 
              onClick={handleSave} 
              isLoading={isSaving}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold gap-2 shadow-sm"
            >
              <Sparkles className="w-4 h-4" />
              Simpan Penugasan Kelas ({selectedClasses.length} Kelas)
            </Button>
          </div>
        </div>

      </div>
    </div>
  );
}
