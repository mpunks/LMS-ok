import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/Button';
import { 
  X, 
  Upload, 
  FileSpreadsheet, 
  FileText, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  HelpCircle,
  Sparkles,
  Info,
  Image as ImageIcon,
  Video,
  Music,
  Copy
} from 'lucide-react';
import { toast } from '@/components/ui/Toast';
import { Question } from '@/types';
import { useGasStore } from '@/store/gasStore';

interface ImportQuestionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (importedQuestions: Question[], mode: 'APPEND' | 'REPLACE') => void;
  existingQuestionsCount?: number;
}

export default function ImportQuestionsModal({
  isOpen,
  onClose,
  onImport,
  existingQuestionsCount = 0
}: ImportQuestionsModalProps) {
  const { isConnected } = useGasStore();
  const [activeTab, setActiveTab] = useState<'excel' | 'word'>('excel');
  const [importMode, setImportMode] = useState<'APPEND' | 'REPLACE'>('APPEND');
  
  // Word / Text pasted content
  const [wordText, setWordText] = useState('');

  // Parsed preview questions
  const [parsedQuestions, setParsedQuestions] = useState<Question[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [fileName, setFileName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  // --- Excel Template Generator ---
  const handleDownloadExcelTemplate = () => {
    const sampleData = [
      {
        'No': 1,
        'Soal': 'Organ tubuh manusia yang berfungsi utama memompa darah ke seluruh tubuh adalah...',
        'Pilihan A': 'Paru-paru',
        'Pilihan B': 'Hati',
        'Pilihan C': 'Jantung',
        'Pilihan D': 'Ginjal',
        'Pilihan E': 'Lambung',
        'Kunci Jawaban': 'C',
        'Poin': 10,
        'Link Gambar': 'https://images.unsplash.com/photo-1530497610245-94d3c16cda28?w=800&auto=format&fit=crop&q=60',
        'Link Video': '',
        'Link Audio': '',
        'Pembahasan': 'Jantung bertugas memompa darah yang kaya oksigen ke seluruh jaringan tubuh.'
      },
      {
        'No': 2,
        'Soal': 'Perhatikan video berikut! Manakah fase pembelahan sel yang ditunjukkan pada tayangan?',
        'Pilihan A': 'Profase',
        'Pilihan B': 'Metafase',
        'Pilihan C': 'Anafase',
        'Pilihan D': 'Telofase',
        'Pilihan E': 'Interfase',
        'Kunci Jawaban': 'B',
        'Poin': 10,
        'Link Gambar': '',
        'Link Video': 'https://www.youtube.com/watch?v=f-ldPgEfAHI',
        'Link Audio': '',
        'Pembahasan': 'Kromosom berjejer di bidang ekuator merupakan ciri khas metafase.'
      },
      {
        'No': 3,
        'Soal': 'Dengarkan rekaman audio berikut. Topik utama dialog percakapan tersebut adalah...',
        'Pilihan A': 'Liburan ke Candi Borobudur',
        'Pilihan B': 'Rencana ujian akhir semester',
        'Pilihan C': 'Tugas presentasi kelompok IPA',
        'Pilihan D': 'Jadwal ekstrakurikuler pramuka',
        'Pilihan E': 'Pengumuman lomba pidato',
        'Kunci Jawaban': 'A',
        'Poin': 10,
        'Link Gambar': '',
        'Link Video': '',
        'Link Audio': 'https://actions.google.com/sounds/v1/ambiences/outdoor_ambience.ogg',
        'Pembahasan': 'Dialog membahas perjalanan wisata menuju Candi Borobudur.'
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    // Set column widths
    worksheet['!cols'] = [
      { wch: 6 },  // No
      { wch: 45 }, // Soal
      { wch: 20 }, // Pilihan A
      { wch: 20 }, // Pilihan B
      { wch: 20 }, // Pilihan C
      { wch: 20 }, // Pilihan D
      { wch: 20 }, // Pilihan E
      { wch: 14 }, // Kunci
      { wch: 8 },  // Poin
      { wch: 35 }, // Link Gambar
      { wch: 35 }, // Link Video
      { wch: 35 }, // Link Audio
      { wch: 35 }  // Pembahasan
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Format Soal CBT');
    XLSX.writeFile(workbook, 'Template_Impor_Soal_Kuis_SMP.xlsx');
    toast.success('Template Excel berhasil diunduh!');
  };

  // --- Excel File Upload & Parse ---
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setIsProcessing(true);
    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(ws);

        parseExcelRows(rawRows);
      } catch (err: any) {
        console.error('Error parsing excel:', err);
        setParseErrors([`Gagal membaca file: ${err.message || 'Format berkas tidak valid'}`]);
      } finally {
        setIsProcessing(false);
      }
    };

    reader.readAsBinaryString(file);
  };

  const parseExcelRows = (rows: Record<string, any>[]) => {
    const questions: Question[] = [];
    const errors: string[] = [];

    if (!rows || rows.length === 0) {
      errors.push('File Excel kosong atau tidak memiliki baris data.');
      setParseErrors(errors);
      setParsedQuestions([]);
      return;
    }

    rows.forEach((row, idx) => {
      const rowNum = idx + 2; // header is row 1
      
      // Look for question text across various possible column headers
      const text = row['Soal'] || row['Pertanyaan'] || row['Teks Soal'] || row['Question'] || row['soal'] || '';
      if (!String(text).trim()) {
        return; // skip completely empty rows
      }

      // Options
      const optA = row['Pilihan A'] ?? row['Opsi A'] ?? row['A'] ?? row['Option A'] ?? '';
      const optB = row['Pilihan B'] ?? row['Opsi B'] ?? row['B'] ?? row['Option B'] ?? '';
      const optC = row['Pilihan C'] ?? row['Opsi C'] ?? row['C'] ?? row['Option C'] ?? '';
      const optD = row['Pilihan D'] ?? row['Opsi D'] ?? row['D'] ?? row['Option D'] ?? '';
      const optE = row['Pilihan E'] ?? row['Opsi E'] ?? row['E'] ?? row['Option E'] ?? '';

      const opts: string[] = [String(optA).trim(), String(optB).trim(), String(optC).trim(), String(optD).trim()];
      if (optE && String(optE).trim()) {
        opts.push(String(optE).trim());
      }

      if (opts.some(o => o === '')) {
        errors.push(`Baris ${rowNum}: Pilihan jawaban A, B, C, D harus lengkap terisi.`);
      }

      // Correct answer key
      const rawKey = String(row['Kunci Jawaban'] || row['Kunci'] || row['Jawaban'] || row['Key'] || 'A').toUpperCase().trim();
      let keyIdx = 0;
      if (rawKey === 'B' || rawKey === '2') keyIdx = 1;
      else if (rawKey === 'C' || rawKey === '3') keyIdx = 2;
      else if (rawKey === 'D' || rawKey === '4') keyIdx = 3;
      else if (rawKey === 'E' || rawKey === '5') keyIdx = 4;
      else if (rawKey === 'A' || rawKey === '1') keyIdx = 0;
      else {
        errors.push(`Baris ${rowNum}: Kunci jawaban "${rawKey}" tidak dikenal. Gunakan huruf A, B, C, D, atau E.`);
      }

      // Points
      const rawPoints = row['Poin'] || row['Bobot'] || row['Points'] || 10;
      const points = parseInt(String(rawPoints)) || 10;

      // Media Links
      const imageUrl = String(row['Link Gambar'] || row['Gambar'] || row['Image'] || row['ImageUrl'] || '').trim();
      const videoUrl = String(row['Link Video'] || row['Video'] || row['VideoUrl'] || '').trim();
      const audioUrl = String(row['Link Audio'] || row['Audio'] || row['AudioUrl'] || '').trim();
      const explanation = String(row['Pembahasan'] || row['Penjelasan'] || row['Explanation'] || '').trim();

      questions.push({
        id: `imp-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
        text: String(text).trim(),
        options: opts,
        correctOptionIndex: keyIdx,
        points: points > 0 ? points : 10,
        explanation: explanation || undefined,
        imageUrl: imageUrl || undefined,
        videoUrl: videoUrl || undefined,
        audioUrl: audioUrl || undefined
      });
    });

    setParsedQuestions(questions);
    setParseErrors(errors);
  };

  // --- Word / Text Format Parser ---
  const handleParseWordText = () => {
    if (!wordText.trim()) {
      toast.error('Kolom teks masih kosong. Silakan tempelkan soal dari Word terlebih dahulu.');
      return;
    }

    const lines = wordText.split(/\r?\n/);
    const questions: Question[] = [];
    const errors: string[] = [];

    let currentQ: {
      textLines: string[];
      options: Record<string, string>;
      key: string;
      points: number;
      explanation: string;
      imageUrl: string;
      videoUrl: string;
      audioUrl: string;
    } | null = null;

    const finalizeCurrentQuestion = () => {
      if (!currentQ) return;
      const fullText = currentQ.textLines.join(' ').trim();
      if (!fullText) return;

      const opts: string[] = [];
      const keys = ['A', 'B', 'C', 'D'];
      if (currentQ.options['E']) keys.push('E');

      for (const k of keys) {
        opts.push(currentQ.options[k] || '');
      }

      if (opts.some(o => !o.trim())) {
        errors.push(`Soal "${fullText.substring(0, 30)}...": Pilihan jawaban belum lengkap.`);
      }

      let keyIdx = 0;
      const rawK = currentQ.key.toUpperCase();
      if (rawK === 'B') keyIdx = 1;
      else if (rawK === 'C') keyIdx = 2;
      else if (rawK === 'D') keyIdx = 3;
      else if (rawK === 'E') keyIdx = 4;

      questions.push({
        id: `wrd-${Date.now()}-${questions.length}-${Math.random().toString(36).substring(2, 6)}`,
        text: fullText,
        options: opts.map(o => o.trim()),
        correctOptionIndex: keyIdx,
        points: currentQ.points || 10,
        explanation: currentQ.explanation.trim() || undefined,
        imageUrl: currentQ.imageUrl.trim() || undefined,
        videoUrl: currentQ.videoUrl.trim() || undefined,
        audioUrl: currentQ.audioUrl.trim() || undefined
      });
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Check if start of a new question: e.g. "1.", "1)", "Soal 1:"
      const questionStartMatch = line.match(/^(?:Soal\s*)?(\d+)[\.\)]\s*(.*)$/i);
      
      // Or check option line: "A.", "A)", "a."
      const optionMatch = line.match(/^([A-Ea-e])[\.\)]\s*(.*)$/);

      // Media tags
      const imgTagMatch = line.match(/^(?:\[?(?:GAMBAR|IMAGE|FOTO)\s*:\s*(https?:\/\/[^\s\]]+)\]?)/i) || 
                          line.match(/^!\[.*?\]\((https?:\/\/[^\s\)]+)\)/i);
      const videoTagMatch = line.match(/^(?:\[?(?:VIDEO|YOUTUBE)\s*:\s*(https?:\/\/[^\s\]]+)\]?)/i);
      const audioTagMatch = line.match(/^(?:\[?(?:AUDIO|SUARA|MP3)\s*:\s*(https?:\/\/[^\s\]]+)\]?)/i);
      
      // Key, Points, Explanation tags
      const keyTagMatch = line.match(/^(?:\[?(?:KUNCI|JAWABAN|KEY)\s*:\s*([A-Ea-e])\]?)/i);
      const pointTagMatch = line.match(/^(?:\[?(?:POIN|BOBOT|NILAI)\s*:\s*(\d+)\]?)/i);
      const expTagMatch = line.match(/^(?:\[?(?:PEMBAHASAN|PENJELASAN)\s*:\s*(.*)\]?)/i);

      if (questionStartMatch) {
        finalizeCurrentQuestion();
        currentQ = {
          textLines: questionStartMatch[2] ? [questionStartMatch[2]] : [],
          options: {},
          key: 'A',
          points: 10,
          explanation: '',
          imageUrl: '',
          videoUrl: '',
          audioUrl: ''
        };
      } else if (imgTagMatch && currentQ) {
        currentQ.imageUrl = imgTagMatch[1];
      } else if (videoTagMatch && currentQ) {
        currentQ.videoUrl = videoTagMatch[1];
      } else if (audioTagMatch && currentQ) {
        currentQ.audioUrl = audioTagMatch[1];
      } else if (keyTagMatch && currentQ) {
        currentQ.key = keyTagMatch[1];
      } else if (pointTagMatch && currentQ) {
        currentQ.points = parseInt(pointTagMatch[1]) || 10;
      } else if (expTagMatch && currentQ) {
        currentQ.explanation = expTagMatch[1];
      } else if (optionMatch && currentQ) {
        const letter = optionMatch[1].toUpperCase();
        currentQ.options[letter] = optionMatch[2];
      } else if (currentQ) {
        // Line belongs to question text
        currentQ.textLines.push(line);
      }
    }

    finalizeCurrentQuestion();

    if (questions.length === 0) {
      errors.push('Tidak ada butir soal yang berhasil diparsing. Pastikan format penomoran dimulai dengan angka (contoh: 1., 2.) dan opsi A, B, C, D.');
    }

    setParsedQuestions(questions);
    setParseErrors(errors);

    if (questions.length > 0) {
      toast.success(`Berhasil memindai ${questions.length} butir soal dari teks!`);
    }
  };

  const handleLoadSampleWordText = () => {
    const sample = `1. Perhatikan gambar organ tubuh berikut!
[GAMBAR: https://images.unsplash.com/photo-1530497610245-94d3c16cda28?w=800&auto=format&fit=crop&q=60]
Organ pada gambar di atas memiliki fungsi utama sebagai...
A. Mengatur kadar gula darah
B. Memompa darah ke seluruh tubuh
C. Menyaring racun dan zat sisa
D. Menghasilkan sel darah putih
KUNCI: B
POIN: 10
PEMBAHASAN: Jantung berfungsi memompa darah beroksigen ke seluruh jaringan tubuh.

2. Simak tayangan video pembelajaran berikut dengan seksama!
[VIDEO: https://www.youtube.com/watch?v=f-ldPgEfAHI]
Proses pembelahan sel yang diperlihatkan dalam video tersebut dinamakan...
A. Mitosis
B. Meiosis
C. Amitosis
D. Sitokinesis
KUNCI: A
POIN: 10
PEMBAHASAN: Mitosis merupakan pembelahan sel tubuh yang menghasilkan dua sel anakan identik.

3. Dengarkan rekaman suara audio berikut untuk menjawab soal!
[AUDIO: https://actions.google.com/sounds/v1/ambiences/outdoor_ambience.ogg]
Berdasarkan suara latar dan percakapan, peristiwa tersebut berlangsung pada suasana...
A. Di dalam ruang kelas
B. Di alam terbuka / taman luar ruangan
C. Di dalam gedung laboratorium tertutup
D. Di stasiun kereta bawah tanah
KUNCI: B
POIN: 10
PEMBAHASAN: Suara rekaman audio menampilkan suasana alam luar ruangan (outdoor).`;

    setWordText(sample);
    toast.info('Format contoh Word dengan link Gambar, Video, & Audio berhasil dimuat!');
  };

  const handleConfirmImport = () => {
    if (parsedQuestions.length === 0) {
      toast.error('Belum ada soal yang siap diimpor.');
      return;
    }

    onImport(parsedQuestions, importMode);
    toast.success(`Berhasil mengimpor ${parsedQuestions.length} soal ke dalam kuis!`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-indigo-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-200">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Impor Butir Soal Kuis (Excel / Word)
              </h2>
              <p className="text-xs text-slate-500">
                Mendukung impor massal lengkap dengan link media Gambar, Video YouTube, & Audio
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

        {/* Google Sheet Sync Notice */}
        <div className={`px-6 py-2.5 text-xs flex items-center justify-between border-b ${
          isConnected 
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
            : 'bg-amber-50 text-amber-800 border-amber-200'
        }`}>
          <div className="flex items-center gap-2">
            <CheckCircle2 className={`w-4 h-4 shrink-0 ${isConnected ? 'text-emerald-600' : 'text-amber-600'}`} />
            <span>
              {isConnected ? (
                <><strong>Tersambung ke Google Sheet:</strong> Seluruh soal yang diimpor akan langsung disimpan otomatis ke tabel <em>Quizzes</em> dan <em>QuizQuestions</em>.</>
              ) : (
                <><strong>Penyimpanan Browser Aktif:</strong> Webhook Google Sheet belum terhubung. Soal tersimpan di database lokal. Sambungkan di menu Integrasi GAS untuk pencadangan cloud.</>
              )}
            </span>
          </div>
        </div>

        {/* Mode Selector & Tabs */}
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex bg-slate-200/70 p-1 rounded-xl w-fit">
            <button
              type="button"
              onClick={() => { setActiveTab('excel'); setParsedQuestions([]); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'excel'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              Format Berkas Excel (.xlsx / .csv)
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('word'); setParsedQuestions([]); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'word'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-4 h-4 text-blue-600" />
              Format Dokumen Word / Teks (Copy-Paste)
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="font-semibold text-slate-600">Metode Impor:</span>
            <select
              value={importMode}
              onChange={(e) => setImportMode(e.target.value as any)}
              className="border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-xs font-medium text-slate-800 outline-none"
            >
              <option value="APPEND">Tambahkan ke Soal yang Sudah Ada (+)</option>
              <option value="REPLACE">Ganti Semua Soal Kuis (Reset)</option>
            </select>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'excel' ? (
            /* TAB 1: EXCEL */
            <div className="space-y-5">
              {/* Template Download Card */}
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 bg-emerald-100 text-emerald-800 rounded-xl mt-0.5 sm:mt-0 shrink-0">
                    <FileSpreadsheet className="w-5 h-5 text-emerald-700" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-emerald-950">
                      Template Resmi Excel Soal CBT SMP
                    </h4>
                    <p className="text-[11px] text-emerald-800 mt-0.5">
                      Kolom sudah disesuaikan untuk: Soal, Opsi A-E, Kunci Jawaban, Poin, Link Gambar, Video, & Audio.
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleDownloadExcelTemplate}
                  className="gap-1.5 border-emerald-300 text-emerald-800 hover:bg-emerald-100 shrink-0 text-xs font-semibold"
                >
                  <Download className="w-3.5 h-3.5" />
                  Unduh Template (.xlsx)
                </Button>
              </div>

              {/* Upload Dropzone */}
              <div className="border-2 border-dashed border-indigo-200 hover:border-indigo-400 bg-indigo-50/20 rounded-2xl p-6 text-center transition-colors">
                <input
                  type="file"
                  id="excel-question-input"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <label 
                  htmlFor="excel-question-input"
                  className="cursor-pointer flex flex-col items-center justify-center space-y-2"
                >
                  <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center">
                    <Upload className="w-6 h-6" />
                  </div>
                  <span className="text-sm font-bold text-slate-800">
                    {fileName ? `File terpilih: ${fileName}` : 'Klik untuk Pilih Berkas Excel / CSV'}
                  </span>
                  <span className="text-xs text-slate-500">
                    Mendukung format .xlsx, .xls, dan .csv
                  </span>
                </label>
              </div>
            </div>
          ) : (
            /* TAB 2: WORD / TEXT */
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>
                    Salin (Copy) teks butir soal dari dokumen Microsoft Word atau Google Docs, lalu tempel (Paste) ke kotak di bawah.
                  </span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleLoadSampleWordText}
                  className="text-[11px] gap-1 border-blue-300 text-blue-800 hover:bg-blue-100 shrink-0"
                >
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  Muat Contoh Format Word
                </Button>
              </div>

              {/* Format Reference Guide */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-[11px] text-slate-600 space-y-1">
                <span className="font-bold text-slate-800 block">Aturan Format Dokumen Word:</span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-slate-600 font-mono text-[10px]">
                  <div className="p-2 bg-white rounded border border-slate-200">
                    <span className="font-bold text-indigo-700 block">Struktur Dasar:</span>
                    1. Teks Soal<br/>
                    A. Pilihan A<br/>
                    B. Pilihan B<br/>
                    C. Pilihan C<br/>
                    D. Pilihan D<br/>
                    KUNCI: A<br/>
                    POIN: 10
                  </div>
                  <div className="p-2 bg-white rounded border border-slate-200">
                    <span className="font-bold text-indigo-700 block">Tag Media Pendukung (Opsional):</span>
                    [GAMBAR: https://link-gambar.jpg]<br/>
                    [VIDEO: https://youtube.com/watch?v=...]<br/>
                    [AUDIO: https://link-audio.mp3]<br/>
                    PEMBAHASAN: Penjelasan materi...
                  </div>
                </div>
              </div>

              <textarea
                value={wordText}
                onChange={(e) => setWordText(e.target.value)}
                rows={9}
                placeholder="Tempelkan soal dari Word di sini...&#10;Contoh:&#10;1. Berapakah hasil dari 25 + 75?&#10;A. 90&#10;B. 100&#10;C. 110&#10;D. 120&#10;KUNCI: B&#10;POIN: 10"
                className="w-full text-xs font-mono p-3.5 border border-slate-300 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none leading-relaxed"
              />

              <div className="flex justify-end">
                <Button
                  type="button"
                  size="sm"
                  onClick={handleParseWordText}
                  className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs"
                >
                  <Sparkles className="w-4 h-4" />
                  Pindai & Ekstrak Soal dari Teks Word
                </Button>
              </div>
            </div>
          )}

          {/* Validation Errors */}
          {parseErrors.length > 0 && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-rose-600" /> Peringatan Format:
              </div>
              <ul className="list-disc list-inside space-y-0.5 pl-1 max-h-32 overflow-y-auto">
                {parseErrors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Parsed Preview Table */}
          {parsedQuestions.length > 0 && (
            <div className="space-y-3 pt-2 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-bold text-slate-800">
                    Pratinjau Hasil Impor: {parsedQuestions.length} Soal Siap Dimasukkan
                  </span>
                </div>
                <span className="text-[11px] text-slate-500">
                  Total Poin: {parsedQuestions.reduce((acc, q) => acc + q.points, 0)}
                </span>
              </div>

              <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-bold text-slate-500 sticky top-0">
                    <tr>
                      <th className="px-3 py-2">No</th>
                      <th className="px-3 py-2">Soal</th>
                      <th className="px-3 py-2">Pilihan & Kunci</th>
                      <th className="px-3 py-2 text-center">Media</th>
                      <th className="px-3 py-2 text-right">Poin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {parsedQuestions.map((q, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="px-3 py-2.5 font-bold text-slate-900 w-8">
                          {idx + 1}
                        </td>
                        <td className="px-3 py-2.5 max-w-xs font-medium text-slate-800 truncate" title={q.text}>
                          {q.text}
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[11px] border border-emerald-200">
                            Kunci: {String.fromCharCode(65 + q.correctOptionIndex)}
                          </span>
                          <span className="text-[10px] text-slate-400 block mt-0.5">
                            {q.options.length} Pilihan Jawaban
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {q.imageUrl && <span title="Ada Gambar"><ImageIcon className="w-3.5 h-3.5 text-indigo-600" /></span>}
                            {q.videoUrl && <span title="Ada Video"><Video className="w-3.5 h-3.5 text-rose-600" /></span>}
                            {q.audioUrl && <span title="Ada Audio"><Music className="w-3.5 h-3.5 text-amber-600" /></span>}
                            {!q.imageUrl && !q.videoUrl && !q.audioUrl && <span className="text-slate-300">-</span>}
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-right font-bold text-indigo-600">
                          {q.points}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            {parsedQuestions.length > 0 ? (
              <span>
                {importMode === 'APPEND' 
                  ? `Akan ditambahkan ke ${existingQuestionsCount} soal yang sudah ada` 
                  : 'Akan menggantikan seluruh butir soal yang ada saat ini'}
              </span>
            ) : (
              <span>Pilih berkas Excel atau tempel teks Word untuk memulai</span>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
            >
              Batal
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleConfirmImport}
              disabled={parsedQuestions.length === 0}
              className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              <CheckCircle2 className="w-4 h-4" />
              Impor {parsedQuestions.length} Soal ke Kuis
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
