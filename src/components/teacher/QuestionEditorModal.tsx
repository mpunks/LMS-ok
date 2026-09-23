import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { 
  X, 
  CheckCircle2, 
  HelpCircle, 
  Image as ImageIcon, 
  Video, 
  Music, 
  Plus, 
  Trash2,
  Sparkles,
  Info
} from 'lucide-react';
import { Question } from '@/types';
import QuestionMediaRenderer from '@/components/quiz/QuestionMediaRenderer';

interface QuestionEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (question: Question) => void;
  questionToEdit?: Question | null;
  questionNumber?: number;
}

export default function QuestionEditorModal({
  isOpen,
  onClose,
  onSave,
  questionToEdit,
  questionNumber = 1
}: QuestionEditorModalProps) {
  const [text, setText] = useState('');
  const [options, setOptions] = useState<string[]>(['', '', '', '']);
  const [correctOptionIndex, setCorrectOptionIndex] = useState(0);
  const [points, setPoints] = useState(10);
  const [explanation, setExplanation] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [activeMediaTab, setActiveMediaTab] = useState<'image' | 'video' | 'audio'>('image');
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    if (questionToEdit) {
      setText(questionToEdit.text || '');
      setOptions(
        questionToEdit.options && questionToEdit.options.length > 0 
          ? [...questionToEdit.options] 
          : ['', '', '', '']
      );
      setCorrectOptionIndex(questionToEdit.correctOptionIndex ?? 0);
      setPoints(questionToEdit.points ?? 10);
      setExplanation(questionToEdit.explanation || '');
      setImageUrl(questionToEdit.imageUrl || '');
      setVideoUrl(questionToEdit.videoUrl || '');
      setAudioUrl(questionToEdit.audioUrl || '');
    } else {
      setText('');
      setOptions(['', '', '', '']);
      setCorrectOptionIndex(0);
      setPoints(10);
      setExplanation('');
      setImageUrl('');
      setVideoUrl('');
      setAudioUrl('');
    }
    setErrors([]);
  }, [questionToEdit, isOpen]);

  if (!isOpen) return null;

  const handleOptionChange = (index: number, val: string) => {
    const updated = [...options];
    updated[index] = val;
    setOptions(updated);
  };

  const handleAddOption = () => {
    if (options.length < 5) {
      setOptions([...options, '']);
    }
  };

  const handleRemoveOption = (index: number) => {
    if (options.length > 2) {
      const updated = options.filter((_, i) => i !== index);
      setOptions(updated);
      if (correctOptionIndex >= updated.length) {
        setCorrectOptionIndex(0);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: string[] = [];

    if (!text.trim()) {
      newErrors.push('Teks pertanyaan / soal tidak boleh kosong.');
    }

    const filledOptions = options.map(o => o.trim());
    if (filledOptions.some(o => o === '')) {
      newErrors.push('Semua pilihan jawaban harus diisi.');
    }

    if (correctOptionIndex < 0 || correctOptionIndex >= options.length) {
      newErrors.push('Pilih salah satu kunci jawaban yang valid.');
    }

    if (newErrors.length > 0) {
      setErrors(newErrors);
      return;
    }

    const questionData: Question = {
      id: questionToEdit?.id || `q-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      text: text.trim(),
      options: options.map(o => o.trim()),
      correctOptionIndex,
      points: Number(points) > 0 ? Number(points) : 10,
      explanation: explanation.trim() || undefined,
      imageUrl: imageUrl.trim() || undefined,
      videoUrl: videoUrl.trim() || undefined,
      audioUrl: audioUrl.trim() || undefined
    };

    onSave(questionData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-indigo-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-200">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {questionToEdit ? `Edit Soal Nomor ${questionNumber}` : `Tambah Soal Baru (Nomor ${questionNumber})`}
              </h2>
              <p className="text-xs text-slate-500">
                Lengkapi pertanyaan, pilihan jawaban, kunci jawaban, serta media link pendukung
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-2 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {errors.length > 0 && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <Info className="w-4 h-4 text-rose-600" /> Harap perbaiki sebelum menyimpan:
              </div>
              <ul className="list-disc list-inside space-y-0.5 pl-1">
                {errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Teks Pertanyaan */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800">
                Teks Pertanyaan / Soal <span className="text-rose-500">*</span>
              </label>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-500 font-medium">Bobot Poin:</span>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={points}
                  onChange={(e) => setPoints(Math.max(1, parseInt(e.target.value) || 10))}
                  className="w-16 h-8 text-xs font-bold text-center border border-slate-300 rounded-lg focus:border-indigo-500 outline-none"
                />
              </div>
            </div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={4}
              placeholder="Tuliskan butir soal atau pertanyaan di sini..."
              className="w-full text-sm p-3.5 border border-slate-300 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none leading-relaxed"
              required
            />
          </div>

          {/* Multimedia Link Support */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-800">Media Pendukung Soal (Opsional):</span>
                <span className="text-[10px] text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full font-semibold">
                  Gambar • Video • Audio
                </span>
              </div>
            </div>

            <div className="flex border-b border-slate-200">
              <button
                type="button"
                onClick={() => setActiveMediaTab('image')}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-all ${
                  activeMediaTab === 'image'
                    ? 'border-indigo-600 text-indigo-600 bg-white rounded-t-lg'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5 text-indigo-500" />
                Link Gambar {imageUrl && '✓'}
              </button>
              <button
                type="button"
                onClick={() => setActiveMediaTab('video')}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-all ${
                  activeMediaTab === 'video'
                    ? 'border-rose-600 text-rose-600 bg-white rounded-t-lg'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Video className="w-3.5 h-3.5 text-rose-500" />
                Link Video {videoUrl && '✓'}
              </button>
              <button
                type="button"
                onClick={() => setActiveMediaTab('audio')}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-all ${
                  activeMediaTab === 'audio'
                    ? 'border-amber-600 text-amber-600 bg-white rounded-t-lg'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Music className="w-3.5 h-3.5 text-amber-500" />
                Link Audio {audioUrl && '✓'}
              </button>
            </div>

            {/* Tab Inputs */}
            {activeMediaTab === 'image' && (
              <div className="space-y-2 pt-1">
                <Input
                  label="URL / Link Gambar (PNG, JPG, WebP, SVG, Google Drive public link)"
                  placeholder="https://images.unsplash.com/... atau URL gambar lainnya"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                />
                <p className="text-[11px] text-slate-500">
                  Tip: Masukkan URL gambar langsung atau link berkas gambar yang dapat diakses publik.
                </p>
              </div>
            )}

            {activeMediaTab === 'video' && (
              <div className="space-y-2 pt-1">
                <Input
                  label="URL / Link Video (YouTube atau link video langsung .mp4)"
                  placeholder="https://www.youtube.com/watch?v=... atau https://youtu.be/..."
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                />
                <p className="text-[11px] text-slate-500">
                  Sistem otomatis mengubah link YouTube menjadi pemutar video interaktif untuk siswa saat ujian CBT.
                </p>
              </div>
            )}

            {activeMediaTab === 'audio' && (
              <div className="space-y-2 pt-1">
                <Input
                  label="URL / Link Berkas Audio (MP3, WAV, OGG, audio streaming)"
                  placeholder="https://example.com/listening-section.mp3"
                  value={audioUrl}
                  onChange={(e) => setAudioUrl(e.target.value)}
                />
                <p className="text-[11px] text-slate-500">
                  Sangat cocok untuk soal tes *listening* Bahasa Inggris/Bahasa Indonesia atau materi seni musik.
                </p>
              </div>
            )}

            {/* Real-time media preview */}
            {(imageUrl || videoUrl || audioUrl) && (
              <div className="mt-3 pt-3 border-t border-slate-200">
                <span className="text-[11px] font-bold text-slate-600 block mb-1">Pratinjau Media Soal:</span>
                <QuestionMediaRenderer
                  imageUrl={imageUrl}
                  videoUrl={videoUrl}
                  audioUrl={audioUrl}
                  compact
                />
              </div>
            )}
          </div>

          {/* Pilihan Jawaban */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-bold text-slate-800">
                  Pilihan Jawaban & Kunci Jawaban <span className="text-rose-500">*</span>
                </label>
                <p className="text-[11px] text-slate-500">
                  Klik lingkaran huruf (A, B, C, D, E) untuk menetapkannya sebagai <strong>Kunci Jawaban yang Benar</strong>.
                </p>
              </div>

              {options.length < 5 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddOption}
                  className="gap-1 text-xs text-indigo-700 border-indigo-200 hover:bg-indigo-50"
                >
                  <Plus className="w-3.5 h-3.5" /> Tambah Pilihan {String.fromCharCode(65 + options.length)}
                </Button>
              )}
            </div>

            <div className="space-y-2.5">
              {options.map((opt, idx) => {
                const letter = String.fromCharCode(65 + idx);
                const isCorrect = correctOptionIndex === idx;

                return (
                  <div 
                    key={idx}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border transition-all ${
                      isCorrect 
                        ? 'border-emerald-300 bg-emerald-50/60 ring-2 ring-emerald-500/20' 
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    {/* Select as Correct Key Button */}
                    <button
                      type="button"
                      onClick={() => setCorrectOptionIndex(idx)}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 transition-all ${
                        isCorrect
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                      title={`Jadikan pilihan ${letter} sebagai KUNCI JAWABAN`}
                    >
                      {letter}
                    </button>

                    {/* Input Text */}
                    <input
                      type="text"
                      value={opt}
                      onChange={(e) => handleOptionChange(idx, e.target.value)}
                      placeholder={`Teks pilihan jawaban ${letter}...`}
                      className="flex-1 text-xs bg-transparent border-0 outline-none px-2 font-normal text-slate-800"
                      required
                    />

                    {/* Correct Indicator Badge */}
                    {isCorrect && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full shrink-0 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> KUNCI
                      </span>
                    )}

                    {/* Remove Option Button (min 2 options) */}
                    {options.length > 2 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveOption(idx)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors shrink-0"
                        title="Hapus opsi ini"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Pembahasan / Penjelasan (Opsional) */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Pembahasan / Kunci Penjelasan (Opsional)
            </label>
            <textarea
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              rows={2}
              placeholder="Tuliskan pembahasan atau alasan mengapa kunci jawaban tersebut benar..."
              className="w-full text-xs p-3 border border-slate-300 rounded-xl focus:border-indigo-500 focus:ring-1 focus:ring-indigo-100 outline-none"
            />
          </div>

          {/* Footer Action Buttons */}
          <div className="flex gap-2 justify-end pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
            >
              Batal
            </Button>
            <Button
              type="submit"
              size="sm"
              className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              <CheckCircle2 className="w-4 h-4" />
              {questionToEdit ? 'Simpan Perubahan Soal' : 'Tambahkan ke Kuis'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
