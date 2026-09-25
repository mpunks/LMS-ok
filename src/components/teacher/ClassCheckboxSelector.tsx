import React from 'react';
import { Check, CheckSquare, Square, Layers, Sparkles, AlertTriangle, Settings } from 'lucide-react';
import { Button } from '@/components/ui/Button';

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
  // Normalize assignedClasses
  const teacherClasses = Array.isArray(assignedClasses)
    ? assignedClasses.map(c => String(c).trim()).filter(Boolean)
    : [];

  const handleToggleClass = (classItem: string) => {
    if (selectedClasses.includes(classItem)) {
      onChange(selectedClasses.filter(c => c !== classItem));
    } else {
      onChange([...selectedClasses, classItem]);
    }
  };

  const handleSelectAll = () => {
    onChange([...teacherClasses]);
  };

  const handleDeselectAll = () => {
    onChange([]);
  };

  const isAllSelected = teacherClasses.length > 0 && selectedClasses.length === teacherClasses.length;

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

        {teacherClasses.length > 0 && (
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
                  Pilih Semua ({teacherClasses.length})
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
                Ubah Kelas Ampu
              </button>
            )}
          </div>
        )}
      </div>

      {/* Checkbox Grid or Empty State */}
      {teacherClasses.length === 0 ? (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-2">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-amber-950">
                Belum ada kelas yang diampu pada profil Anda
              </p>
              <p className="text-amber-800 leading-relaxed">
                Anda belum memiliki daftar kelas yang diampu. Silakan atur kelas yang Anda ampu terlebih dahulu agar dapat memilih kelas target secara leluasa.
              </p>
            </div>
          </div>
          {onOpenManageClasses && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onOpenManageClasses}
              className="mt-1 text-xs border-amber-300 text-amber-900 hover:bg-amber-100 bg-white"
            >
              <Sparkles className="w-3.5 h-3.5 mr-1 text-amber-600" />
              Atur Daftar Kelas Ampuan Anda
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5">
          {teacherClasses.map((cls) => {
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
                  <div className="text-[10px] text-slate-500 flex items-center gap-0.5">
                    <span className="text-amber-500">★</span> Diampu
                  </div>
                </div>
              </label>
            );
          })}
        </div>
      )}

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
