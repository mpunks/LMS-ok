import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { 
  RotateCcw, 
  X, 
  AlertTriangle, 
  Users, 
  CheckCircle2, 
  Sliders, 
  ShieldAlert, 
  Sparkles,
  Info
} from 'lucide-react';
import { Quiz, QuizResult, User } from '@/types';
import { isResultMatchStudent } from '@/lib/utils';

interface BulkRetakeModalProps {
  isOpen: boolean;
  onClose: () => void;
  quiz: Quiz;
  results: QuizResult[];
  users: User[];
  onExecute: (options: { 
    filterType: 'below_threshold' | 'disqualified' | 'all' | 'selected'; 
    threshold: number; 
    studentIds: string[];
  }) => Promise<void>;
}

export default function BulkRetakeModal({
  isOpen,
  onClose,
  quiz,
  results,
  users,
  onExecute
}: BulkRetakeModalProps) {
  if (!isOpen || !quiz) return null;

  const [filterType, setFilterType] = useState<'below_threshold' | 'disqualified' | 'all' | 'selected'>('below_threshold');
  const [threshold, setThreshold] = useState<number>(75);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Map each result to its matched student user
  const enrichedResults = results.map(r => {
    const student = users.find(u => isResultMatchStudent(r, u)) || {
      id: r.studentId,
      name: r.studentName || 'Siswa',
      role: 'STUDENT',
      nisn: r.studentNisn || '-',
      classId: r.studentClass || quiz.classId
    } as User;

    const score = Number(r.finalScore !== undefined ? r.finalScore : (r.score !== undefined ? r.score : 0));
    const isDisqualified = Boolean(r.disqualified) || Number(r.violationsCount || 0) > 0;

    return {
      result: r,
      student,
      score,
      isDisqualified
    };
  });

  // Filter matching results based on selected criteria
  const matchingItems = enrichedResults.filter(item => {
    if (filterType === 'below_threshold') {
      return item.score < threshold;
    }
    if (filterType === 'disqualified') {
      return item.isDisqualified;
    }
    if (filterType === 'all') {
      return true;
    }
    if (filterType === 'selected') {
      return selectedIds.includes(item.result.id);
    }
    return false;
  });

  const toggleSelectStudent = (resultId: string) => {
    setSelectedIds(prev => 
      prev.includes(resultId) ? prev.filter(id => id !== resultId) : [...prev, resultId]
    );
  };

  const handleSelectAllManual = () => {
    if (selectedIds.length === enrichedResults.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(enrichedResults.map(i => i.result.id));
    }
  };

  const handleSubmit = async () => {
    if (matchingItems.length === 0) return;
    setIsSubmitting(true);
    try {
      await onExecute({
        filterType,
        threshold,
        studentIds: matchingItems.map(i => i.result.id)
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-amber-100 flex items-center justify-between bg-amber-50/80">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500 text-white shadow-xs">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>Pengulangan Kuis (Remedial Massal)</span>
              </h3>
              <p className="text-xs text-slate-500">
                {quiz.title} • Kelas {quiz.classId || 'Semua Kelas'}
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {/* Section: Select Criteria */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              1. Pilih Kriteria Siswa untuk Ujian Ulang
            </label>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Option 1: Below KKM */}
              <div 
                onClick={() => setFilterType('below_threshold')}
                className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                  filterType === 'below_threshold' 
                    ? 'border-amber-500 bg-amber-50/60 ring-2 ring-amber-200' 
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <input 
                    type="radio" 
                    name="filterType"
                    checked={filterType === 'below_threshold'} 
                    onChange={() => setFilterType('below_threshold')}
                    className="mt-0.5 text-amber-600 focus:ring-amber-500" 
                  />
                  <div className="flex-1">
                    <div className="font-bold text-xs text-slate-900">Nilai di Bawah KKM / Target</div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Siswa dengan nilai di bawah batas tertentu
                    </p>
                  </div>
                </div>
              </div>

              {/* Option 2: Disqualified / Violations */}
              <div 
                onClick={() => setFilterType('disqualified')}
                className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                  filterType === 'disqualified' 
                    ? 'border-amber-500 bg-amber-50/60 ring-2 ring-amber-200' 
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <input 
                    type="radio" 
                    name="filterType"
                    checked={filterType === 'disqualified'} 
                    onChange={() => setFilterType('disqualified')}
                    className="mt-0.5 text-amber-600 focus:ring-amber-500" 
                  />
                  <div className="flex-1">
                    <div className="font-bold text-xs text-slate-900">Terdiskualifikasi / Melanggar</div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Siswa yang terkena sanksi integritas CBT
                    </p>
                  </div>
                </div>
              </div>

              {/* Option 3: All Students */}
              <div 
                onClick={() => setFilterType('all')}
                className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                  filterType === 'all' 
                    ? 'border-amber-500 bg-amber-50/60 ring-2 ring-amber-200' 
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <input 
                    type="radio" 
                    name="filterType"
                    checked={filterType === 'all'} 
                    onChange={() => setFilterType('all')}
                    className="mt-0.5 text-amber-600 focus:ring-amber-500" 
                  />
                  <div className="flex-1">
                    <div className="font-bold text-xs text-slate-900">Seluruh Siswa</div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Semua siswa yang telah mengumpulkan ({results.length} siswa)
                    </p>
                  </div>
                </div>
              </div>

              {/* Option 4: Manual Checklist */}
              <div 
                onClick={() => setFilterType('selected')}
                className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                  filterType === 'selected' 
                    ? 'border-amber-500 bg-amber-50/60 ring-2 ring-amber-200' 
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <input 
                    type="radio" 
                    name="filterType"
                    checked={filterType === 'selected'} 
                    onChange={() => setFilterType('selected')}
                    className="mt-0.5 text-amber-600 focus:ring-amber-500" 
                  />
                  <div className="flex-1">
                    <div className="font-bold text-xs text-slate-900">Pilih Siswa Manual</div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Centang nama siswa satu per satu
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* If Below KKM, show threshold input */}
          {filterType === 'below_threshold' && (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <Sliders className="w-4 h-4 text-amber-600" />
                  Batas Nilai KKM / Target Remedial:
                </label>
                <div className="flex items-center gap-2">
                  <input 
                    type="number"
                    min="0"
                    max="100"
                    value={threshold}
                    onChange={(e) => setThreshold(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
                    className="w-20 px-3 py-1.5 text-center font-bold text-sm rounded-lg border border-slate-300 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 bg-white"
                  />
                  <span className="text-xs font-medium text-slate-500">Poin</span>
                </div>
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] text-slate-500 mr-1">Preset KKM Cepat:</span>
                {[60, 65, 70, 75, 80].map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setThreshold(val)}
                    className={`px-2 py-0.5 rounded text-[11px] font-semibold border transition-all ${
                      threshold === val 
                        ? 'bg-amber-600 text-white border-amber-600 shadow-xs' 
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    &lt; {val}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Section: Matching Students Preview */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-indigo-600" />
                2. Siswa yang Memenuhi Kriteria ({matchingItems.length} Siswa Terpilih)
              </label>
              {filterType === 'selected' && (
                <button
                  type="button"
                  onClick={handleSelectAllManual}
                  className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800"
                >
                  {selectedIds.length === enrichedResults.length ? 'Batal Pilih Semua' : 'Pilih Semua Siswa'}
                </button>
              )}
            </div>

            {matchingItems.length === 0 ? (
              <div className="p-6 text-center border-2 border-dashed border-slate-200 rounded-xl text-slate-500 text-xs bg-slate-50/50">
                Tidak ada siswa yang memenuhi kriteria nilai di atas.
              </div>
            ) : (
              <div className="max-h-56 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl bg-slate-50/30">
                {enrichedResults.map((item) => {
                  const isMatched = matchingItems.some(m => m.result.id === item.result.id);
                  if (filterType !== 'selected' && !isMatched) return null;

                  return (
                    <div 
                      key={item.result.id}
                      onClick={() => {
                        if (filterType === 'selected') {
                          toggleSelectStudent(item.result.id);
                        }
                      }}
                      className={`p-3 flex items-center justify-between text-xs transition-colors ${
                        filterType === 'selected' ? 'cursor-pointer hover:bg-indigo-50/40' : ''
                      } ${isMatched ? 'bg-amber-50/40' : 'opacity-60 bg-white'}`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {filterType === 'selected' && (
                          <input 
                            type="checkbox"
                            checked={selectedIds.includes(item.result.id)}
                            onChange={() => {}}
                            className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 shrink-0"
                          />
                        )}
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 truncate">
                            {item.student.name}
                          </p>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                            <span>NISN: {item.student.nisn || '-'}</span>
                            {item.student.classId && <span>• Kelas {item.student.classId}</span>}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {item.isDisqualified ? (
                          <span className="bg-rose-100 text-rose-700 px-2 py-0.5 rounded text-[10px] font-bold">
                            Diskualifikasi
                          </span>
                        ) : null}
                        <span className={`px-2.5 py-1 rounded-lg font-bold text-xs ${
                          item.score < 75 
                            ? 'bg-rose-100 text-rose-700 border border-rose-200' 
                            : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                        }`}>
                          Nilai: {item.score}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Real-time Notice */}
          <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-start gap-2.5 leading-relaxed">
            <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-blue-950">
                Pemberitahuan Otomatis ke Siswa
              </p>
              <p className="text-[11px] text-blue-800 mt-0.5">
                Setelah tombol ditekan, status kuis untuk <strong>{matchingItems.length} siswa</strong> akan langsung di-reset. Dashboard siswa akan langsung menampilkan tombol <em>"Mulai Ujian Ulang"</em> secara realtime tanpa perlu logout.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
            className="text-xs"
          >
            Batal
          </Button>

          <Button
            type="button"
            onClick={handleSubmit}
            disabled={matchingItems.length === 0 || isSubmitting}
            isLoading={isSubmitting}
            className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs gap-1.5 shadow-md"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Izinkan Ujian Ulang ({matchingItems.length} Siswa)
          </Button>
        </div>
      </div>
    </div>
  );
}
