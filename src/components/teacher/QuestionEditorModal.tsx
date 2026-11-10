import React, { useState, useEffect, useRef } from 'react';
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
  Info, 
  CheckSquare, 
  CircleDot, 
  FileText, 
  Upload, 
  Maximize2,
  Layers
} from 'lucide-react';
import { Question, QuestionType } from '@/types';
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
  const [type, setType] = useState<QuestionType>('SINGLE');
  const [text, setText] = useState('');
  const [options, setOptions] = useState<string[]>(['', '', '', '']);
  const [optionImages, setOptionImages] = useState<string[]>(['', '', '', '']);
  const [correctOptionIndex, setCorrectOptionIndex] = useState(0);
  const [correctOptionIndices, setCorrectOptionIndices] = useState<number[]>([0]);
  const [sampleAnswer, setSampleAnswer] = useState('');
  const [points, setPoints] = useState(10);
  const [explanation, setExplanation] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [activeMediaTab, setActiveMediaTab] = useState<'image' | 'video' | 'audio'>('image');
  const [errors, setErrors] = useState<string[]>([]);
  const [previewZoomImage, setPreviewZoomImage] = useState<string | null>(null);

  // File input ref for option image upload
  const optionFileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingOptionIdx, setUploadingOptionIdx] = useState<number | null>(null);

  useEffect(() => {
    if (questionToEdit) {
      const qType: QuestionType = questionToEdit.type || 'SINGLE';
      setType(qType);
      setText(questionToEdit.text || '');

      const loadedOptions = questionToEdit.options && questionToEdit.options.length > 0 
        ? [...questionToEdit.options] 
        : ['', '', '', ''];
      setOptions(loadedOptions);

      // Align optionImages array length with options
      const loadedOptionImages = questionToEdit.optionImages && questionToEdit.optionImages.length > 0
        ? loadedOptions.map((_, i) => questionToEdit.optionImages?.[i] || '')
        : loadedOptions.map(() => '');
      setOptionImages(loadedOptionImages);

      setCorrectOptionIndex(questionToEdit.correctOptionIndex ?? 0);
      
      if (questionToEdit.correctOptionIndices && questionToEdit.correctOptionIndices.length > 0) {
        setCorrectOptionIndices([...questionToEdit.correctOptionIndices]);
      } else {
        setCorrectOptionIndices([questionToEdit.correctOptionIndex ?? 0]);
      }

      setSampleAnswer(questionToEdit.sampleAnswer || '');
      setPoints(questionToEdit.points ?? 10);
      setExplanation(questionToEdit.explanation || '');
      setImageUrl(questionToEdit.imageUrl || '');
      setVideoUrl(questionToEdit.videoUrl || '');
      setAudioUrl(questionToEdit.audioUrl || '');
    } else {
      setType('SINGLE');
      setText('');
      setOptions(['', '', '', '']);
      setOptionImages(['', '', '', '']);
      setCorrectOptionIndex(0);
      setCorrectOptionIndices([0]);
      setSampleAnswer('');
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

  const handleOptionImageChange = (index: number, val: string) => {
    const updated = [...optionImages];
    updated[index] = val;
    setOptionImages(updated);
  };

  const handleTriggerUploadOptionImage = (idx: number) => {
    setUploadingOptionIdx(idx);
    if (optionFileInputRef.current) {
      optionFileInputRef.current.value = '';
      optionFileInputRef.current.click();
    }
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && uploadingOptionIdx !== null) {
      if (file.size > 2 * 1024 * 1024) {
        alert('Ukuran gambar terlalu besar. Maksimal 2 MB.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (uploadEvt) => {
        const base64 = uploadEvt.target?.result as string;
        handleOptionImageChange(uploadingOptionIdx, base64);
        setUploadingOptionIdx(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddOption = () => {
    if (options.length < 5) {
      setOptions([...options, '']);
      setOptionImages([...optionImages, '']);
    }
  };

  const handleRemoveOption = (index: number) => {
    if (options.length > 2) {
      const updatedOpts = options.filter((_, i) => i !== index);
      const updatedImgs = optionImages.filter((_, i) => i !== index);
      setOptions(updatedOpts);
      setOptionImages(updatedImgs);

      // Adjust single choice index
      if (correctOptionIndex >= updatedOpts.length) {
        setCorrectOptionIndex(0);
      }
      // Adjust MCMA indices
      const filteredIndices = correctOptionIndices
        .filter(i => i !== index)
        .map(i => (i > index ? i - 1 : i));
      setCorrectOptionIndices(filteredIndices.length > 0 ? filteredIndices : [0]);
    }
  };

  // Toggle for MCMA correct options
  const toggleMcmaCorrect = (index: number) => {
    if (correctOptionIndices.includes(index)) {
      if (correctOptionIndices.length === 1) {
        // Prevent deselecting all
        return;
      }
      setCorrectOptionIndices(correctOptionIndices.filter(i => i !== index));
    } else {
      setCorrectOptionIndices([...correctOptionIndices, index].sort((a, b) => a - b));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: string[] = [];

    if (!text.trim()) {
      newErrors.push('Teks pertanyaan / butir soal tidak boleh kosong.');
    }

    if (type === 'SINGLE') {
      const filledCheck = options.map((o, idx) => o.trim() || optionImages[idx]?.trim());
      if (filledCheck.some(val => !val)) {
        newErrors.push('Semua pilihan jawaban harus memiliki teks atau gambar.');
      }
      if (correctOptionIndex < 0 || correctOptionIndex >= options.length) {
        newErrors.push('Pilih salah satu kunci jawaban yang valid.');
      }
    } else if (type === 'MCMA') {
      const filledCheck = options.map((o, idx) => o.trim() || optionImages[idx]?.trim());
      if (filledCheck.some(val => !val)) {
        newErrors.push('Semua pilihan jawaban harus memiliki teks atau gambar.');
      }
      if (correctOptionIndices.length === 0) {
        newErrors.push('Pilih setidaknya 1 kunci jawaban yang benar untuk soal MCMA.');
      }
    } else if (type === 'ESSAY') {
      // Essay doesn't need options, points must be > 0
    }

    if (Number(points) <= 0) {
      newErrors.push('Bobot poin harus lebih besar dari 0.');
    }

    if (newErrors.length > 0) {
      setErrors(newErrors);
      return;
    }

    const questionData: Question = {
      id: questionToEdit?.id || `q-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      type,
      text: text.trim(),
      points: Number(points) > 0 ? Number(points) : 10,
      explanation: explanation.trim() || undefined,
      imageUrl: imageUrl.trim() || undefined,
      videoUrl: videoUrl.trim() || undefined,
      audioUrl: audioUrl.trim() || undefined,
      ...(type === 'ESSAY' ? {
        options: [],
        optionImages: [],
        correctOptionIndex: 0,
        sampleAnswer: sampleAnswer.trim() || undefined
      } : {
        options: options.map(o => o.trim()),
        optionImages: optionImages.map(img => img.trim()),
        correctOptionIndex: type === 'SINGLE' ? correctOptionIndex : (correctOptionIndices[0] ?? 0),
        correctOptionIndices: type === 'MCMA' ? correctOptionIndices : undefined,
        sampleAnswer: undefined
      })
    };

    onSave(questionData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      {/* Hidden file input for option image */}
      <input
        type="file"
        ref={optionFileInputRef}
        onChange={handleFileSelected}
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        className="hidden"
      />

      {/* Lightbox / Zoom modal */}
      {previewZoomImage && (
        <div 
          className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setPreviewZoomImage(null)}
        >
          <div className="relative max-w-2xl max-h-[85vh] bg-white rounded-2xl p-2 shadow-2xl overflow-hidden">
            <button
              onClick={() => setPreviewZoomImage(null)}
              className="absolute top-3 right-3 p-1.5 rounded-full bg-slate-900/70 text-white hover:bg-slate-900"
            >
              <X className="w-5 h-5" />
            </button>
            <img 
              src={previewZoomImage} 
              alt="Pratinjau Gambar Pilihan" 
              className="max-h-[80vh] w-auto object-contain rounded-xl mx-auto" 
            />
          </div>
        </div>
      )}

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
                Pilih jenis soal (Pilihan Ganda, MCMA, atau Essai), sertakan teks, gambar pilihan, & media pendukung
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

          {/* 1. Pemilihan Jenis Soal (Question Type Selector) */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-indigo-600" />
              Jenis Soal / Format Pertanyaan <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Option 1: Pilihan Ganda Tunggal */}
              <button
                type="button"
                onClick={() => setType('SINGLE')}
                className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                  type === 'SINGLE'
                    ? 'border-indigo-600 bg-indigo-50/70 ring-2 ring-indigo-500/20 text-indigo-950 shadow-xs'
                    : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs flex items-center gap-1.5">
                    <CircleDot className={`w-4 h-4 ${type === 'SINGLE' ? 'text-indigo-600' : 'text-slate-400'}`} />
                    Pilihan Ganda Biasa
                  </span>
                  {type === 'SINGLE' && (
                    <span className="w-2 h-2 rounded-full bg-indigo-600" />
                  )}
                </div>
                <p className="text-[11px] text-slate-500 leading-tight">
                  1 kunci jawaban benar (A/B/C/D/E)
                </p>
              </button>

              {/* Option 2: MCMA (Multiple Choice Multiple Answer / Pilihan Ganda Kompleks) */}
              <button
                type="button"
                onClick={() => {
                  setType('MCMA');
                  if (correctOptionIndices.length === 0) {
                    setCorrectOptionIndices([correctOptionIndex]);
                  }
                }}
                className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                  type === 'MCMA'
                    ? 'border-purple-600 bg-purple-50/70 ring-2 ring-purple-500/20 text-purple-950 shadow-xs'
                    : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs flex items-center gap-1.5">
                    <CheckSquare className={`w-4 h-4 ${type === 'MCMA' ? 'text-purple-600' : 'text-slate-400'}`} />
                    MCMA (Kompleks)
                  </span>
                  {type === 'MCMA' && (
                    <span className="w-2 h-2 rounded-full bg-purple-600" />
                  )}
                </div>
                <p className="text-[11px] text-slate-500 leading-tight">
                  Bisa memilih lebih dari 1 jawaban benar (Centang)
                </p>
              </button>

              {/* Option 3: Essai / Uraian */}
              <button
                type="button"
                onClick={() => setType('ESSAY')}
                className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                  type === 'ESSAY'
                    ? 'border-amber-600 bg-amber-50/70 ring-2 ring-amber-500/20 text-amber-950 shadow-xs'
                    : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs flex items-center gap-1.5">
                    <FileText className={`w-4 h-4 ${type === 'ESSAY' ? 'text-amber-600' : 'text-slate-400'}`} />
                    Essai / Uraian
                  </span>
                  {type === 'ESSAY' && (
                    <span className="w-2 h-2 rounded-full bg-amber-600" />
                  )}
                </div>
                <p className="text-[11px] text-slate-500 leading-tight">
                  Siswa mengetik jawaban uraian secara terbuka
                </p>
              </button>
            </div>
          </div>

          {/* 2. Teks Pertanyaan & Poin */}
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
                  className="w-16 h-8 text-xs font-bold text-center border border-slate-300 rounded-lg focus:border-indigo-500 outline-none text-slate-900 bg-white"
                />
              </div>
            </div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={4}
              placeholder="Tuliskan butir soal atau pertanyaan di sini..."
              className="w-full text-sm p-3.5 border border-slate-300 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none leading-relaxed text-slate-900 bg-white placeholder:text-slate-400"
              required
            />
          </div>

          {/* 3. Media Pendukung Soal (Gambar / Video / Audio) */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-800">Media Utama Soal (Opsional):</span>
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
                  label="URL / Link Gambar Soal"
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
                  label="URL / Link Berkas Audio (MP3, WAV, OGG)"
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

          {/* 4. PILIHAN JAWABAN (UNTUK SINGLE & MCMA) ATAU RUBRIK (UNTUK ESSAI) */}
          {type === 'ESSAY' ? (
            /* ESSAI / URAIAN SECTION */
            <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/40 space-y-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-600" />
                <span className="text-xs font-bold text-amber-950">
                  Pedoman Penskoran & Kunci Jawaban Essai / Rubrik (Opsional)
                </span>
              </div>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                Tuliskan kata kunci, poin-poin jawaban yang diharapkan, atau rubrik penilaian agar memudahkan guru saat melakukan pemeriksaan jawaban siswa di menu Rekap Nilai.
              </p>
              <textarea
                value={sampleAnswer}
                onChange={(e) => setSampleAnswer(e.target.value)}
                rows={4}
                placeholder="Contoh: 1. Menyebutkan 3 organ pernapasan (skor 5). 2. Menjelaskan fungsi alveolus (skor 5)..."
                className="w-full text-xs p-3 border border-amber-300 rounded-xl bg-white focus:border-amber-500 focus:ring-1 focus:ring-amber-200 outline-none leading-relaxed text-slate-900 placeholder:text-slate-400"
              />
            </div>
          ) : (
            /* PILIHAN GANDA (SINGLE & MCMA) SECTION DENGAN GAMBAR PADA PILIHAN */
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-xs font-bold text-slate-800">
                    Pilihan Jawaban, Gambar Pilihan, & Kunci Jawaban <span className="text-rose-500">*</span>
                  </label>
                  <p className="text-[11px] text-slate-500">
                    {type === 'SINGLE' 
                      ? 'Klik huruf (A, B, C, D, E) untuk menetapkannya sebagai Kunci Jawaban Benar.' 
                      : 'Centang kotak huruf untuk memilih 1 atau lebih Kunci Jawaban Benar (Pilihan Ganda Kompleks / MCMA).'}
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

              <div className="space-y-3">
                {options.map((opt, idx) => {
                  const letter = String.fromCharCode(65 + idx);
                  const isCorrect = type === 'SINGLE' 
                    ? correctOptionIndex === idx 
                    : correctOptionIndices.includes(idx);
                  const hasImage = Boolean(optionImages[idx]);

                  return (
                    <div 
                      key={idx}
                      className={`p-3 rounded-xl border transition-all space-y-2.5 ${
                        isCorrect 
                          ? 'border-emerald-300 bg-emerald-50/50 ring-2 ring-emerald-500/20' 
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      {/* Top row: Key Selector, Text Input, and Action buttons */}
                      <div className="flex items-center gap-2">
                        {/* Select as Correct Key Button */}
                        <button
                          type="button"
                          onClick={() => {
                            if (type === 'SINGLE') {
                              setCorrectOptionIndex(idx);
                            } else {
                              toggleMcmaCorrect(idx);
                            }
                          }}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 transition-all ${
                            isCorrect
                              ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-300'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                          title={type === 'SINGLE' 
                            ? `Jadikan pilihan ${letter} sebagai KUNCI JAWABAN` 
                            : `Centang / Lepas ${letter} sebagai KUNCI JAWABAN MCMA`}
                        >
                          {type === 'MCMA' && isCorrect ? '✓ ' : ''}{letter}
                        </button>

                        {/* Input Text */}
                        <input
                          type="text"
                          value={opt}
                          onChange={(e) => handleOptionChange(idx, e.target.value)}
                          placeholder={`Teks pilihan jawaban ${letter}... (Bisa dikosongkan jika menggunakan gambar)`}
                          className="flex-1 text-xs bg-transparent border-0 outline-none px-2 font-medium text-slate-900 focus:ring-0 placeholder:text-slate-400"
                        />

                        {/* Button to attach / upload option image */}
                        <button
                          type="button"
                          onClick={() => handleTriggerUploadOptionImage(idx)}
                          className={`p-1.5 rounded-lg border text-xs flex items-center gap-1 transition-colors shrink-0 ${
                            hasImage 
                              ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-medium' 
                              : 'bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                          }`}
                          title="Unggah berkas gambar untuk pilihan jawaban ini"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">{hasImage ? 'Ganti Foto' : 'Foto'}</span>
                        </button>

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

                      {/* Optional URL input & Image Preview for this option */}
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 pt-1 border-t border-slate-100">
                        <div className="flex-1 w-full flex items-center gap-1.5">
                          <ImageIcon className="w-3 h-3 text-slate-400 shrink-0" />
                          <input
                            type="text"
                            value={optionImages[idx] || ''}
                            onChange={(e) => handleOptionImageChange(idx, e.target.value)}
                            placeholder={`URL gambar pilihan ${letter} (opsional, atau gunakan tombol Foto)...`}
                            className="w-full text-[11px] bg-slate-50 border border-slate-200 rounded-md px-2 py-1 outline-none focus:border-indigo-400"
                          />
                        </div>

                        {/* Thumbnail preview if option image exists */}
                        {hasImage && (
                          <div className="flex items-center gap-2 shrink-0">
                            <div 
                              className="relative group w-12 h-10 rounded-md border border-slate-200 overflow-hidden bg-slate-100 cursor-pointer"
                              onClick={() => setPreviewZoomImage(optionImages[idx])}
                              title="Klik untuk memperbesar gambar pilihan"
                            >
                              <img 
                                src={optionImages[idx]} 
                                alt={`Pilihan ${letter}`} 
                                className="w-full h-full object-cover" 
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                <Maximize2 className="w-3 h-3" />
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleOptionImageChange(idx, '')}
                              className="text-[11px] text-rose-500 hover:text-rose-700 underline"
                              title="Hapus gambar pilihan ini"
                            >
                              Hapus Foto
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 5. Pembahasan / Penjelasan (Opsional) */}
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
              className="w-full text-xs p-3 border border-slate-300 rounded-xl focus:border-indigo-500 focus:ring-1 focus:ring-indigo-100 outline-none text-slate-900 bg-white placeholder:text-slate-400"
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
