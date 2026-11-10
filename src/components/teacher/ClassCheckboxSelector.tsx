import React from 'react';
import { Check, CheckSquare, Square, Layers, Sparkles, AlertTriangle, Settings } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useDataStore } from '@/store/dataStore';

interface ClassCheckboxSelectorProps {
  assignedClasses: string[];
  selectedClasses: string[];
  onChange: (classes: string[]) => void;
  label?: string;
  description?: string;
  onOpenManageClasses?: () => void;
}

export default function ClassCheckboxSelector({
  assignedClasses,
  selectedClasses,
  onChange,
  label = 'Pilih Kelas Target',
  description = 'Kuis/materi hanya akan ditugaskan ke kelas yang Anda pilih di bawah ini',
  onOpenManageClasses
}: ClassCheckboxSelectorProps) {
  const { users } = useDataStore();

  // Normalize assignedClasses
  const teacherClasses = Array.isArray(assignedClasses)
    ? assignedClasses.map(c => String(c).trim()).filter(Boolean)
    : [];

  // Extract unique student classes from school database as fallback
  const schoolClasses = Array.from(new Set(
    (users || [])
      .filter(u => u.role === 'STUDENT' && u.classId && String(u.classId).trim())
      .map(u => String(u.classId).trim().toUpperCase())
  )).sort();

  const fallbackClasses = schoolClasses.length > 0 
    ? schoolClasses 
    : ['7A', '7B', '7C', '8A', '8B', '8C', '9A', '9B', '9C', '9D', '9E', '9F', '9G', '9H', '9I', '9J', '9K'];

  const displayClasses = teacherClasses.length > 0 ? teacherClasses : fallbackClasses;
  const isUsingFallback = teacherClasses.length === 0;

  const handleToggleClass = (classItem: string) => {
    if (selectedClasses.includes(classItem)) {
      onChange(selectedClasses.filter(c => c !== classItem));
    } else {
      onChange([...selectedClasses, classItem]);
    }
  };

  const handleSelectAll = () => {
    onChange([...displayClasses]);
  };

  const handleDeselectAll = () => {
    onChange([]);
  };

  const isAllSelected = displayClasses.length > 0 && selectedClasses.length === displayClasses.length;

  return (
    <div className="space-y-2.5">
      {/* Header and Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-indigo-600" />
            {label} <span className="text-rose-500">*</span>
          </label>
          {description && (
            <p className="text-[11px] text-slate-500 mt-0.5">
              {description} (hanya menampilkan kelas yang Anda ampu).
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={isAllSelected ? handleDeselectAll : handleSelectAll}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-200 transition-colors flex items-center gap-1"
          >
            {isAllSelected ? (
              <>
                <Square className="w-3.5 h-3.5" />
                Batal Pilih Semua
              </>
            ) : (
              <>
                <CheckSquare className="w-3.5 h-3.5" />
                Pilih Semua ({displayClasses.length})
              </>
            )}
          </button>
          {onOpenManageClasses && (
            <button
              type="button"
              onClick={onOpenManageClasses}
              className="text-[11px] text-slate-500 hover:text-slate-800 hover:bg-slate-100 px-2 py-1 rounded-md transition-colors flex items-center gap-1"
              title="Kelola kelas ampu Anda"
            >
              <Settings className="w-3 h-3" />
              {isUsingFallback ? 'Atur Kelas Ampu' : 'Ubah Kelas Ampu'}
            </button>
          )}
        </div>
      </div>

      {isUsingFallback && (
        <div className="flex items-center justify-between px-3 py-2 bg-amber-50/70 border border-amber-200/80 rounded-lg text-xs text-amber-900">
          <span className="flex items-center gap-1.5 text-[11px]">
            <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            Menampilkan seluruh kelas terdaftar di sekolah (Anda belum menyaring kelas ampu spesifik).
          </span>
          {onOpenManageClasses && (
            <button
              type="button"
              onClick={onOpenManageClasses}
              className="text-[11px] font-semibold text-amber-800 hover:underline shrink-0 ml-2"
            >
              Atur Khusus Kelas Saya
            </button>
          )}
        </div>
      )}

      {/* Checkbox Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5">
        {displayClasses.map((cls) => {
          const isChecked = selectedClasses.includes(cls);
          return (
            <label
              key={cls}
              className={`relative flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer select-none transition-all ${
                isChecked
                  ? 'bg-indigo-50/90 border-indigo-500 shadow-xs ring-1 ring-indigo-500'
                  : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors shrink-0 ${
                  isChecked
                    ? 'bg-indigo-600 border-indigo-600 text-white'
                    : 'border-slate-300 bg-white'
                }`}
              >
                {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              </div>
              <input
                type="checkbox"
                checked={isChecked}
                onChange={() => handleToggleClass(cls)}
                className="sr-only"
              />
              <div className="min-w-0">
                <div className={`text-xs font-bold truncate ${isChecked ? 'text-indigo-950' : 'text-slate-800'}`}>
                  Kelas {cls}
                </div>
                {!isUsingFallback && (
                  <div className="text-[10px] text-slate-500 flex items-center gap-0.5">
                    <span className="text-amber-500">★</span> Diampu
                  </div>
                )}
              </div>
            </label>
          );
        })}
      </div>

      {/* Selected Summary and Validation Alert */}
      <div className="flex items-center justify-between text-xs pt-1">
        {selectedClasses.length === 0 ? (
          <span className="text-rose-600 font-medium flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" />
            Wajib memilih minimal satu kelas target.
          </span>
        ) : (
          <span className="text-emerald-700 font-semibold flex items-center gap-1">
            <Check className="w-3.5 h-3.5 text-emerald-600" />
            {selectedClasses.length} kelas terpilih ({selectedClasses.join(', ')})
          </span>
        )}
      </div>
    </div>
  );
}
