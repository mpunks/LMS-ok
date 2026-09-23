import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { 
  X, 
  Plus, 
  Trash2, 
  Edit2, 
  Upload, 
  HelpCircle, 
  CheckCircle2, 
  Copy, 
  Image as ImageIcon, 
  Video, 
  Music,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Eye
} from 'lucide-react';
import { Quiz, Question } from '@/types';
import { useDataStore } from '@/store/dataStore';
import { toast } from '@/components/ui/Toast';
import QuestionEditorModal from './QuestionEditorModal';
import ImportQuestionsModal from './ImportQuestionsModal';
import QuestionMediaRenderer from '@/components/quiz/QuestionMediaRenderer';

interface QuizQuestionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  quiz: Quiz;
}

export default function QuizQuestionsModal({
  isOpen,
  onClose,
  quiz
}: QuizQuestionsModalProps) {
  const { updateQuiz } = useDataStore();
  const questions: Question[] = quiz.questions || [];

  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [showEditorModal, setShowEditorModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [expandedMediaQuestionId, setExpandedMediaQuestionId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const totalPoints = questions.reduce((acc, q) => acc + (q.points || 0), 0);

  // Handle Save (Add or Edit single question)
  const handleSaveQuestion = async (savedQuestion: Question) => {
    try {
      setIsSaving(true);
      let updatedQuestions: Question[];
      const existsIndex = questions.findIndex(q => q.id === savedQuestion.id);

      if (existsIndex >= 0) {
        // Edit existing
        updatedQuestions = [...questions];
        updatedQuestions[existsIndex] = savedQuestion;
        toast.success(`Soal nomor ${existsIndex + 1} berhasil diperbarui`);
      } else {
        // Add new
        updatedQuestions = [...questions, savedQuestion];
        toast.success(`Soal baru berhasil ditambahkan (Total ${updatedQuestions.length} soal)`);
      }

      await updateQuiz(quiz.id, { questions: updatedQuestions });
    } catch (error: any) {
      toast.error(error.message || 'Gagal menyimpan soal');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Delete Question
  const handleDeleteQuestion = async (questionId: string, index: number) => {
    if (!window.confirm(`Yakin ingin menghapus butir soal nomor ${index + 1}?`)) {
      return;
    }

    try {
      setIsSaving(true);
      const updatedQuestions = questions.filter(q => q.id !== questionId);
      await updateQuiz(quiz.id, { questions: updatedQuestions });
      toast.success(`Soal nomor ${index + 1} berhasil dihapus`);
    } catch (error: any) {
      toast.error(error.message || 'Gagal menghapus soal');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Duplicate Question
  const handleDuplicateQuestion = async (question: Question, index: number) => {
    try {
      setIsSaving(true);
      const duplicated: Question = {
        ...question,
        id: `q-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        text: `${question.text} (Salinan)`
      };
      const updatedQuestions = [...questions];
      updatedQuestions.splice(index + 1, 0, duplicated);
      await updateQuiz(quiz.id, { questions: updatedQuestions });
      toast.success(`Soal nomor ${index + 1} berhasil digandakan`);
    } catch (error: any) {
      toast.error(error.message || 'Gagal menggandakan soal');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Import Questions from Excel / Word
  const handleImportQuestions = async (imported: Question[], mode: 'APPEND' | 'REPLACE') => {
    try {
      setIsSaving(true);
      const finalQuestions = mode === 'REPLACE' ? imported : [...questions, ...imported];
      await updateQuiz(quiz.id, { questions: finalQuestions });
      setShowImportModal(false);
    } catch (error: any) {
      toast.error(error.message || 'Gagal mengimpor soal');
    } finally {
      setIsSaving(false);
    }
  };

  // Move Question Up/Down
  const handleMoveQuestion = async (index: number, direction: 'UP' | 'DOWN') => {
    if (direction === 'UP' && index === 0) return;
    if (direction === 'DOWN' && index === questions.length - 1) return;

    const targetIndex = direction === 'UP' ? index - 1 : index + 1;
    const reordered = [...questions];
    const temp = reordered[index];
    reordered[index] = reordered[targetIndex];
    reordered[targetIndex] = temp;

    try {
      await updateQuiz(quiz.id, { questions: reordered });
    } catch (err: any) {
      toast.error(err.message || 'Gagal mengatur urutan soal');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-indigo-50/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-200">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">
                  Kelola Butir Soal: {quiz.title}
                </h2>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                  Kelas {quiz.classId}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Total: <strong>{questions.length} Soal</strong> • Total Bobot Nilai: <strong>{totalPoints} Poin</strong> • Durasi: <strong>{quiz.durationMinutes} Menit</strong>
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

        {/* Action Bar */}
        <div className="px-6 py-3 border-b border-slate-100 bg-white flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">
              Daftar Soal Ujian:
            </span>
            <span className="text-xs font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg">
              {questions.length} Butir Soal
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowImportModal(true)}
              className="gap-1.5 text-xs text-indigo-700 border-indigo-200 hover:bg-indigo-50"
            >
              <Upload className="w-3.5 h-3.5 text-indigo-600" />
              Impor Soal (Word / Excel)
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={() => {
                setEditingQuestion(null);
                setShowEditorModal(true);
              }}
              className="gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              <Plus className="w-4 h-4" />
              Tambah Soal Manual
            </Button>
          </div>
        </div>

        {/* Questions List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50">
          {questions.length === 0 ? (
            <div className="text-center py-16 px-4 bg-white border-2 border-dashed border-slate-200 rounded-2xl">
              <div className="w-14 h-14 bg-indigo-50 text-indigo-500 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <HelpCircle className="w-7 h-7" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">
                Belum Ada Butir Soal di Kuis Ini
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Tambahkan butir soal secara manual atau gunakan fitur impor massal dari Word atau Excel beserta media gambar, video, dan audio.
              </p>
              <div className="flex justify-center gap-2 mt-4">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowImportModal(true)}
                  className="gap-1 text-xs border-indigo-200 text-indigo-700"
                >
                  <Upload className="w-3.5 h-3.5" /> Impor dari Excel/Word
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    setEditingQuestion(null);
                    setShowEditorModal(true);
                  }}
                  className="gap-1 text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  <Plus className="w-3.5 h-3.5" /> Tambah Soal Manual
                </Button>
              </div>
            </div>
          ) : (
            questions.map((question, index) => {
              const hasMedia = !!(question.imageUrl || question.videoUrl || question.audioUrl);
              const isMediaExpanded = expandedMediaQuestionId === question.id;

              return (
                <div
                  key={question.id}
                  className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs hover:border-indigo-200 transition-all space-y-3"
                >
                  {/* Top Bar of Card */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <span className="w-7 h-7 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                        {index + 1}
                      </span>
                      <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg">
                        {question.points || 10} Poin
                      </span>

                      {/* Media Badges */}
                      {question.imageUrl && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md">
                          <ImageIcon className="w-3 h-3" /> Gambar
                        </span>
                      )}
                      {question.videoUrl && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md">
                          <Video className="w-3 h-3" /> Video
                        </span>
                      )}
                      {question.audioUrl && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                          <Music className="w-3 h-3" /> Audio
                        </span>
                      )}
                    </div>

                    {/* Question Action Buttons */}
                    <div className="flex items-center gap-1 shrink-0">
                      {/* Move Up/Down */}
                      <button
                        type="button"
                        onClick={() => handleMoveQuestion(index, 'UP')}
                        disabled={index === 0}
                        className="p-1.5 text-slate-400 hover:text-slate-700 disabled:opacity-30 rounded-lg hover:bg-slate-100"
                        title="Geser ke atas"
                      >
                        <ChevronUp className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveQuestion(index, 'DOWN')}
                        disabled={index === questions.length - 1}
                        className="p-1.5 text-slate-400 hover:text-slate-700 disabled:opacity-30 rounded-lg hover:bg-slate-100"
                        title="Geser ke bawah"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>

                      {/* Duplicate */}
                      <button
                        type="button"
                        onClick={() => handleDuplicateQuestion(question, index)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-100"
                        title="Gandakan soal ini"
                      >
                        <Copy className="w-4 h-4" />
                      </button>

                      {/* Edit */}
                      <button
                        type="button"
                        onClick={() => {
                          setEditingQuestion(question);
                          setShowEditorModal(true);
                        }}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-100"
                        title="Edit soal ini"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={() => handleDeleteQuestion(question.id, index)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100"
                        title="Hapus soal ini"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Question Text */}
                  <div className="text-sm font-medium text-slate-800 leading-relaxed pl-1">
                    {question.text}
                  </div>

                  {/* Expand Media Preview Toggle */}
                  {hasMedia && (
                    <div>
                      <button
                        type="button"
                        onClick={() => setExpandedMediaQuestionId(isMediaExpanded ? null : question.id)}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50/70 hover:bg-indigo-100/70 px-2.5 py-1 rounded-lg transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        {isMediaExpanded ? 'Tutup Pratinjau Media' : 'Lihat Pratinjau Media (Gambar/Video/Audio)'}
                      </button>

                      {isMediaExpanded && (
                        <div className="mt-2.5 p-3 rounded-xl border border-indigo-100 bg-slate-50/70">
                          <QuestionMediaRenderer
                            imageUrl={question.imageUrl}
                            videoUrl={question.videoUrl}
                            audioUrl={question.audioUrl}
                            compact
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Options List */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 pl-1">
                    {question.options.map((opt, optIdx) => {
                      const isCorrect = question.correctOptionIndex === optIdx;
                      const letter = String.fromCharCode(65 + optIdx);

                      return (
                        <div
                          key={optIdx}
                          className={`flex items-center gap-2.5 p-2 rounded-xl border text-xs ${
                            isCorrect
                              ? 'border-emerald-300 bg-emerald-50/80 text-emerald-950 font-semibold'
                              : 'border-slate-200 bg-slate-50/50 text-slate-700'
                          }`}
                        >
                          <span className={`w-5 h-5 rounded-md flex items-center justify-center font-bold text-[11px] shrink-0 ${
                            isCorrect 
                              ? 'bg-emerald-600 text-white' 
                              : 'bg-white border border-slate-300 text-slate-600'
                          }`}>
                            {letter}
                          </span>
                          <span className="truncate flex-1">{opt}</span>
                          {isCorrect && (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Explanation if exists */}
                  {question.explanation && (
                    <div className="p-2.5 bg-amber-50/60 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold">Pembahasan: </span>
                        <span>{question.explanation}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <div className="text-xs text-slate-500 font-medium">
            Perubahan butir soal langsung tersimpan dan disinkronkan ke database kuis.
          </div>
          <Button
            type="button"
            size="sm"
            onClick={onClose}
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            Selesai Kelola Soal
          </Button>
        </div>
      </div>

      {/* Question Editor Modal */}
      {showEditorModal && (
        <QuestionEditorModal
          isOpen={showEditorModal}
          onClose={() => {
            setShowEditorModal(false);
            setEditingQuestion(null);
          }}
          onSave={handleSaveQuestion}
          questionToEdit={editingQuestion}
          questionNumber={
            editingQuestion 
              ? questions.findIndex(q => q.id === editingQuestion.id) + 1 
              : questions.length + 1
          }
        />
      )}

      {/* Import Questions Modal */}
      {showImportModal && (
        <ImportQuestionsModal
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          onImport={handleImportQuestions}
          existingQuestionsCount={questions.length}
        />
      )}
    </div>
  );
}
