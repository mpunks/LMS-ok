import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { 
  Upload, 
  FileSpreadsheet, 
  ClipboardPaste, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  Trash2, 
  X, 
  Users, 
  GraduationCap,
  FileCheck
} from 'lucide-react';
import { toast } from '@/components/ui/Toast';
import { User } from '@/types';

interface ImportUsersModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultRole: 'TEACHER' | 'STUDENT';
  onImportSuccess: (newUsers: User[]) => Promise<void>;
}

interface ParsedUserRow {
  id: string;
  name: string;
  nik?: string;
  nisn?: string;
  username?: string;
  classId?: string;
  isValid: boolean;
  errorMessage?: string;
  isSelected: boolean;
}

export default function ImportUsersModal({
  isOpen,
  onClose,
  defaultRole,
  onImportSuccess
}: ImportUsersModalProps) {
  const [role, setRole] = useState<'TEACHER' | 'STUDENT'>(defaultRole);
  const [mode, setMode] = useState<'file' | 'paste'>('file');
  const [pasteText, setPasteText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedRows, setParsedRows] = useState<ParsedUserRow[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync role if defaultRole changes
  React.useEffect(() => {
    setRole(defaultRole);
  }, [defaultRole]);

  if (!isOpen) return null;

  const normalizeKey = (key: string): string => {
    return key.toLowerCase().replace(/[^a-z0-9]/g, '');
  };

  const cleanString = (val: any): string => {
    if (val === null || val === undefined) return '';
    return String(val).trim();
  };

  const generateUsernameFromName = (name: string): string => {
    const clean = name
      .toLowerCase()
      .replace(/^(drs\.|dr\.|prof\.|h\.|hj\.|ir\.)\s*/g, '')
      .replace(/,\s*(s\.pd|m\.pd|s\.kom|m\.kom|s\.t|m\.t|s\.si|m\.si|ph\.d|s\.e|m\.m).*/g, '')
      .replace(/[^a-z0-9\s]/g, '')
      .trim()
      .split(/\s+/)[0];
    return clean || `user${Math.floor(1000 + Math.random() * 9000)}`;
  };

  const processRawData = (rows: Record<string, any>[]) => {
    if (!rows || rows.length === 0) {
      toast.error('File atau data tidak memuat baris data yang dapat dibaca');
      return;
    }

    const parsed: ParsedUserRow[] = [];

    rows.forEach((row, index) => {
      // Create normalized key lookup
      const rowKeys = Object.keys(row);
      const getVal = (aliases: string[]): string => {
        for (const alias of aliases) {
          const normAlias = normalizeKey(alias);
          const matchedKey = rowKeys.find(k => normalizeKey(k) === normAlias);
          if (matchedKey && row[matchedKey] !== undefined && row[matchedKey] !== null) {
            const strVal = cleanString(row[matchedKey]);
            if (strVal) return strVal;
          }
        }
        return '';
      };

      const name = getVal(['nama', 'nama lengkap', 'namasiswa', 'namaguru', 'name', 'fullname', 'nama_lengkap']);
      
      let isValid = true;
      let errorMessage = '';

      if (!name) {
        isValid = false;
        errorMessage = 'Nama wajib diisi';
      }

      if (role === 'STUDENT') {
        const nisn = getVal(['nisn', 'nis', 'noinduk', 'nomorinduk', 'id']);
        const classId = getVal(['kelas', 'rombel', 'class', 'tingkat', 'kelasrombel']) || 'Umum';

        if (!nisn) {
          isValid = false;
          errorMessage = errorMessage ? `${errorMessage}, NISN kosong` : 'NISN wajib diisi (untuk password default)';
        }

        parsed.push({
          id: `s-import-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 4)}`,
          name,
          nisn,
          classId: classId.toUpperCase(),
          isValid,
          errorMessage,
          isSelected: isValid
        });
      } else {
        const nik = getVal(['nik', 'nip', 'noktp', 'nomorinduk', 'password']);
        let username = getVal(['username', 'user', 'idpengguna', 'email']);

        if (!nik) {
          isValid = false;
          errorMessage = errorMessage ? `${errorMessage}, NIK kosong` : 'NIK/NIP wajib diisi (untuk password default)';
        }

        if (!username && name) {
          username = generateUsernameFromName(name);
        }

        parsed.push({
          id: `t-import-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 4)}`,
          name,
          nik,
          username,
          isValid,
          errorMessage,
          isSelected: isValid
        });
      }
    });

    if (parsed.length === 0) {
      toast.error('Tidak ada data valid yang dapat dibaca. Pastikan kolom sesuai format template.');
      return;
    }

    setParsedRows(parsed);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    readFile(file);
  };

  const readFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
        processRawData(json);
      } catch (err: any) {
        console.error('Error reading excel/csv file:', err);
        toast.error('Gagal membaca file. Pastikan format file adalah .xlsx, .xls, atau .csv');
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      readFile(file);
    }
  };

  const handlePasteProcess = () => {
    if (!pasteText.trim()) {
      toast.error('Silakan tempel (paste) data terlebih dahulu');
      return;
    }

    // Process TSV or CSV pasted text
    const lines = pasteText.trim().split(/\r?\n/);
    if (lines.length < 2) {
      toast.error('Data harus memiliki minimal 1 baris judul kolom dan 1 baris data');
      return;
    }

    // Determine separator: tab or semicolon or comma
    const headerLine = lines[0];
    let sep = '\t';
    if (headerLine.includes('\t')) sep = '\t';
    else if (headerLine.includes(';')) sep = ';';
    else if (headerLine.includes(',')) sep = ',';

    const headers = headerLine.split(sep).map(h => h.trim().replace(/^["']|["']$/g, ''));
    const rows: Record<string, string>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const cols = line.split(sep).map(c => c.trim().replace(/^["']|["']$/g, ''));
      const obj: Record<string, string> = {};
      headers.forEach((header, idx) => {
        obj[header] = cols[idx] || '';
      });
      rows.push(obj);
    }

    processRawData(rows);
  };

  const downloadTemplate = (format: 'xlsx' | 'csv') => {
    let headers: string[] = [];
    let sampleRows: any[] = [];
    let fileName = '';

    if (role === 'STUDENT') {
      fileName = `template_impor_siswa.${format}`;
      headers = ['Nama Lengkap', 'NISN', 'Kelas'];
      sampleRows = [
        { 'Nama Lengkap': 'Ahmad Fauzi Pratama', 'NISN': '0081234561', 'Kelas': '7A' },
        { 'Nama Lengkap': 'Citra Dewi Lestari', 'NISN': '0081234562', 'Kelas': '7A' },
        { 'Nama Lengkap': 'Budi Santoso', 'NISN': '0081234563', 'Kelas': '7B' },
        { 'Nama Lengkap': 'Dinda Ayu Maharani', 'NISN': '0081234564', 'Kelas': '8A' },
      ];
    } else {
      fileName = `template_impor_guru.${format}`;
      headers = ['Nama Lengkap', 'NIK', 'Username'];
      sampleRows = [
        { 'Nama Lengkap': 'Drs. Bambang Sudarsono, M.Pd', 'NIK': '197508122005011002', 'Username': 'bambang' },
        { 'Nama Lengkap': 'Siti Rahmawati, S.Pd', 'NIK': '198203152008012005', 'Username': 'siti.rahma' },
        { 'Nama Lengkap': 'Hadi Wijaya, S.Kom', 'NIK': '198911202015021001', 'Username': 'hadi.wijaya' },
      ];
    }

    const ws = XLSX.utils.json_to_sheet(sampleRows, { header: headers });
    // Set column widths
    ws['!cols'] = [{ wch: 30 }, { wch: 22 }, { wch: 15 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, role === 'STUDENT' ? 'Data Siswa' : 'Data Guru');

    XLSX.writeFile(wb, fileName, { bookType: format });
    toast.success(`Template ${fileName} berhasil diunduh`);
  };

  const handleToggleRow = (index: number) => {
    setParsedRows(prev => prev.map((row, i) => i === index ? { ...row, isSelected: !row.isSelected } : row));
  };

  const handleSelectAll = (checked: boolean) => {
    setParsedRows(prev => prev.map(row => ({ ...row, isSelected: row.isValid ? checked : false })));
  };

  const handleDeleteRow = (index: number) => {
    setParsedRows(prev => prev.filter((_, i) => i !== index));
  };

  const handleExecuteImport = async () => {
    const selectedRows = parsedRows.filter(r => r.isSelected && r.isValid);
    if (selectedRows.length === 0) {
      toast.error('Pilih minimal satu baris data yang valid untuk diimpor');
      return;
    }

    setIsProcessing(true);
    try {
      const usersToImport: User[] = selectedRows.map(r => {
        if (role === 'STUDENT') {
          return {
            id: r.id,
            name: r.name,
            role: 'STUDENT',
            nisn: r.nisn,
            classId: r.classId || 'Umum'
          };
        } else {
          return {
            id: r.id,
            name: r.name,
            role: 'TEACHER',
            nik: r.nik,
            username: r.username || generateUsernameFromName(r.name)
          };
        }
      });

      await onImportSuccess(usersToImport);
      toast.success(`Berhasil mengimpor ${usersToImport.length} data ${role === 'STUDENT' ? 'siswa' : 'guru'}`);
      handleClose();
    } catch (err: any) {
      console.error('Import error:', err);
      toast.error(err.message || 'Gagal mengimpor data pengguna');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    setParsedRows([]);
    setPasteText('');
    setIsProcessing(false);
    onClose();
  };

  const validCount = parsedRows.filter(r => r.isValid).length;
  const invalidCount = parsedRows.filter(r => !r.isValid).length;
  const selectedCount = parsedRows.filter(r => r.isSelected && r.isValid).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${role === 'STUDENT' ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'}`}>
              {role === 'STUDENT' ? <GraduationCap className="w-6 h-6" /> : <Users className="w-6 h-6" />}
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Impor Data {role === 'STUDENT' ? 'Siswa' : 'Guru'}
              </h2>
              <p className="text-xs text-slate-500">
                Tambahkan data massal dengan mudah melalui berkas Excel, CSV, atau salin-tempel.
              </p>
            </div>
          </div>
          <button 
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-600 p-2 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          
          {/* Target Role Switcher & Template bar */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => { setRole('STUDENT'); setParsedRows([]); }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  role === 'STUDENT' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Data Siswa
              </button>
              <button
                type="button"
                onClick={() => { setRole('TEACHER'); setParsedRows([]); }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  role === 'TEACHER' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Data Guru
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-500 hidden sm:inline">Format Template:</span>
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                onClick={() => downloadTemplate('xlsx')}
                className="gap-1.5 text-xs text-emerald-700 border-emerald-200 hover:bg-emerald-50"
              >
                <Download className="w-3.5 h-3.5" /> Unduh Template (.xlsx)
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                onClick={() => downloadTemplate('csv')}
                className="gap-1.5 text-xs text-slate-700 border-slate-200 hover:bg-slate-100"
              >
                <Download className="w-3.5 h-3.5" /> CSV
              </Button>
            </div>
          </div>

          {/* If no parsed rows yet: Show Input Options */}
          {parsedRows.length === 0 && (
            <div className="space-y-4">
              {/* Method Switcher */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setMode('file')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 text-sm font-semibold transition-all ${
                    mode === 'file' 
                      ? 'border-indigo-600 bg-indigo-50/40 text-indigo-700' 
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <FileSpreadsheet className="w-4 h-4" /> Unggah Berkas (Excel / CSV)
                </button>
                <button
                  type="button"
                  onClick={() => setMode('paste')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 text-sm font-semibold transition-all ${
                    mode === 'paste' 
                      ? 'border-indigo-600 bg-indigo-50/40 text-indigo-700' 
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <ClipboardPaste className="w-4 h-4" /> Salin-Tempel (Copy Paste Tabel)
                </button>
              </div>

              {/* Mode 1: File Upload */}
              {mode === 'file' && (
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-3 ${
                    isDragOver 
                      ? 'border-indigo-600 bg-indigo-50/50 scale-[0.99]' 
                      : 'border-slate-300 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-400'
                  }`}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  <div className="w-16 h-16 rounded-2xl bg-indigo-100/80 text-indigo-600 flex items-center justify-center shadow-inner">
                    <Upload className="w-8 h-8" />
                  </div>
                  <div>
                    <p className="text-base font-semibold text-slate-800">
                      Klik untuk memilih berkas atau seret berkas ke sini
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Mendukung format <strong>.xlsx, .xls, .csv</strong> (Maksimal 5.000 baris)
                    </p>
                  </div>
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-slate-200 text-xs font-medium text-slate-600 shadow-sm mt-2">
                    <FileCheck className="w-3.5 h-3.5 text-indigo-600" />
                    Kolom yang otomatis dikenali: {role === 'STUDENT' ? 'Nama Lengkap, NISN, Kelas' : 'Nama Lengkap, NIK/NIP, Username'}
                  </div>
                </div>
              )}

              {/* Mode 2: Copy Paste */}
              {mode === 'paste' && (
                <div className="space-y-3">
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <strong>Tips Salin-Tempel:</strong> Salin (Copy) langsung baris dari Microsoft Excel atau Google Spreadsheet termasuk baris judul kolom (Header), lalu tempelkan (Paste) di kotak berikut.
                    </div>
                  </div>
                  <textarea
                    rows={7}
                    value={pasteText}
                    onChange={(e) => setPasteText(e.target.value)}
                    placeholder={
                      role === 'STUDENT'
                        ? "Nama Lengkap\tNISN\tKelas\nAhmad Fauzi\t0081234561\t7A\nSiti Nurhaliza\t0081234562\t7A\nBudi Santoso\t0081234563\t7B"
                        : "Nama Lengkap\tNIK\tUsername\nDrs. Bambang Sudarsono, M.Pd\t197508122005011002\tbambang\nSiti Rahmawati, S.Pd\t198203152008012005\tsiti.rahma"
                    }
                    className="w-full font-mono text-xs p-3.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none leading-relaxed"
                  />
                  <div className="flex justify-end">
                    <Button 
                      type="button" 
                      onClick={handlePasteProcess}
                      disabled={!pasteText.trim()}
                      className="gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4" /> Proses Data Tempel
                    </Button>
                  </div>
                </div>
              )}

              {/* Petunjuk Tambahan */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-600 space-y-1.5">
                <p className="font-semibold text-slate-800">Petunjuk Format Berkas:</p>
                <ul className="list-disc list-inside space-y-1 pl-1">
                  <li>
                    <strong>Kata Sandi Default:</strong> Murid akan login dengan kata sandi berupa <strong>NISN</strong>, dan Guru akan login dengan <strong>NIK/NIP</strong>.
                  </li>
                  <li>
                    Untuk nama kolom, sistem mendukung huruf besar/kecil (contoh: <em>nama</em>, <em>NAMA LENGKAP</em>, <em>nisn</em>, <em>kelas</em>).
                  </li>
                  <li>
                    Jika kolom Username guru kosong, sistem akan membuatkan username otomatis dari nama guru.
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* If parsed rows exist: Show Preview Table */}
          {parsedRows.length > 0 && (
            <div className="space-y-4">
              {/* Summary Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div className="flex items-center gap-3 text-sm">
                  <span className="font-medium text-slate-700">
                    Total Terbaca: <strong>{parsedRows.length}</strong>
                  </span>
                  <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-100/70 px-2.5 py-0.5 rounded-full text-xs font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" /> {validCount} Siap
                  </span>
                  {invalidCount > 0 && (
                    <span className="inline-flex items-center gap-1 text-rose-700 bg-rose-100/70 px-2.5 py-0.5 rounded-full text-xs font-semibold">
                      <AlertCircle className="w-3.5 h-3.5" /> {invalidCount} Perlu Periksa
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setParsedRows([]);
                      setPasteText('');
                    }}
                    className="text-xs"
                  >
                    Ganti Berkas / Tempel Ulang
                  </Button>
                </div>
              </div>

              {/* Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-72 overflow-y-auto">
                <table className="w-full text-xs text-left text-slate-600">
                  <thead className="bg-slate-100 text-slate-700 uppercase font-semibold sticky top-0 border-b border-slate-200 z-10">
                    <tr>
                      <th className="p-3 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={validCount > 0 && selectedCount === validCount}
                          onChange={(e) => handleSelectAll(e.target.checked)}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                      </th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Nama Lengkap</th>
                      <th className="p-3">{role === 'STUDENT' ? 'NISN (Password)' : 'NIK (Password)'}</th>
                      <th className="p-3">{role === 'STUDENT' ? 'Kelas' : 'Username'}</th>
                      <th className="p-3 w-12 text-center">Hapus</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {parsedRows.map((row, index) => (
                      <tr 
                        key={row.id} 
                        className={`transition-colors ${
                          !row.isValid 
                            ? 'bg-rose-50/50 hover:bg-rose-50' 
                            : row.isSelected 
                              ? 'bg-indigo-50/30 hover:bg-indigo-50/50' 
                              : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="p-3 text-center">
                          <input
                            type="checkbox"
                            checked={row.isSelected}
                            disabled={!row.isValid}
                            onChange={() => handleToggleRow(index)}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-30"
                          />
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          {row.isValid ? (
                            <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[11px] font-medium border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" /> Siap
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-rose-700 bg-rose-50 px-2 py-0.5 rounded text-[11px] font-medium border border-rose-200" title={row.errorMessage}>
                              <AlertCircle className="w-3 h-3" /> {row.errorMessage}
                            </span>
                          )}
                        </td>
                        <td className="p-3 font-medium text-slate-900">
                          {row.name || <span className="text-rose-400 italic">Nama kosong</span>}
                        </td>
                        <td className="p-3">
                          {role === 'STUDENT' ? (
                            row.nisn || <span className="text-rose-400 italic">NISN kosong</span>
                          ) : (
                            row.nik || <span className="text-rose-400 italic">NIK kosong</span>
                          )}
                        </td>
                        <td className="p-3">
                          {role === 'STUDENT' ? (
                            <span className="px-2 py-0.5 rounded bg-slate-100 font-mono text-slate-700">
                              {row.classId || 'Umum'}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-slate-100 font-mono text-slate-700">
                              {row.username}
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteRow(index)}
                            className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-slate-100"
                            title="Hapus baris ini dari pratinjau"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            onClick={handleClose}
            disabled={isProcessing}
          >
            Batal
          </Button>

          {parsedRows.length > 0 && (
            <Button
              type="button"
              onClick={handleExecuteImport}
              isLoading={isProcessing}
              disabled={selectedCount === 0 || isProcessing}
              className="gap-2"
            >
              <CheckCircle2 className="w-4 h-4" /> 
              Impor {selectedCount} Data {role === 'STUDENT' ? 'Siswa' : 'Guru'}
            </Button>
          )}
        </div>

      </div>
    </div>
  );
}
