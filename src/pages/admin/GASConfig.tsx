import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Copy, CheckCircle2, Server, Download, ShieldAlert, Database } from 'lucide-react';
import { toast } from '@/components/ui/Toast';
import { useGasStore } from '@/store/gasStore';

const GENERATED_GAS_CODE = `/**
 * SmartLMS SMP - Google Apps Script Backend
 * Salin dan tempel kode ini ke editor Google Apps Script Anda.
 */

function setupAllTables() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheets = {
    'Users': ['id', 'role', 'name', 'gender', 'subject', 'username', 'nik', 'nisn', 'classId', 'assignedClasses', 'password'],
    'Materials': ['id', 'classId', 'subjectId', 'teacherId', 'title', 'content', 'type', 'url', 'chapter', 'order', 'semester', 'createdAt'],
    'Quizzes': ['id', 'materialId', 'classId', 'subjectId', 'title', 'durationMinutes', 'createdAt'],
    'QuizResults': ['id', 'quizId', 'studentId', 'score', 'submittedAt'],
    'Assignments': ['studentId', 'materialId', 'link', 'submittedAt'],
    'StudentProgress': ['studentId', 'materialId', 'readAt']
  };
  
  for (const [name, headers] of Object.entries(sheets)) {
    let sheet = ss.getSheetByName(name);
    if (!sheet) {
      sheet = ss.insertSheet(name);
    }
    // Add headers if empty
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(headers);
    }
  }
  
  initSuperAdminScriptProperties();
  return "Setup Complete & Tables Generated";
}

function initSuperAdminScriptProperties() {
  const props = PropertiesService.getScriptProperties();
  props.setProperty('SUPER_ADMIN_ID', 'rafx2');
  props.setProperty('SUPER_ADMIN_PASSWORD', 'Asepst007@');
}

function findRowIndex(sheet, idColIndex, idVal) {
  if (!sheet) return -1;
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][idColIndex] === idVal) return i + 1;
  }
  return -1;
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    if (action === 'ping') {
      return ContentService.createTextOutput(JSON.stringify({ success: true, message: 'pong' })).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'setupAllTables') {
      const result = setupAllTables();
      return ContentService.createTextOutput(JSON.stringify({ success: true, message: result })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // Auth Check
    if (action === 'login') {
      const { identifier, password, role } = data;
      
      if (role === 'teacher') {
        const props = PropertiesService.getScriptProperties();
        if (identifier === props.getProperty('SUPER_ADMIN_ID') && password === props.getProperty('SUPER_ADMIN_PASSWORD')) {
          return ContentService.createTextOutput(JSON.stringify({ 
            success: true, 
            user: { id: 'sa-1', role: 'SUPER_ADMIN', name: 'Super Administrator', username: identifier } 
          })).setMimeType(ContentService.MimeType.JSON);
        }
        
        const userSheet = ss.getSheetByName('Users');
        if (userSheet) {
          const rows = userSheet.getDataRange().getValues();
          for (let i = 1; i < rows.length; i++) {
            const [id, rRole, name, gender, subject, username, nik, nisn, classId, assignedClasses, pass] = rows[i];
            if ((identifier === username || identifier === nik) && password === String(pass) && (rRole === 'TEACHER' || rRole === 'ADMIN')) {
              return ContentService.createTextOutput(JSON.stringify({ 
                success: true, 
                user: { 
                  id, 
                  role: rRole, 
                  name, 
                  gender: gender || 'L', 
                  subject: subject || '', 
                  username, 
                  nik,
                  assignedClasses: assignedClasses ? String(assignedClasses).split(',').map(s => s.trim()).filter(Boolean) : []
                } 
              })).setMimeType(ContentService.MimeType.JSON);
            }
          }
        }
      } else if (role === 'student') {
        const userSheet = ss.getSheetByName('Users');
        if (userSheet) {
          const rows = userSheet.getDataRange().getValues();
          for (let i = 1; i < rows.length; i++) {
            const [id, rRole, name, gender, subject, username, nik, nisn, classId, assignedClasses, pass] = rows[i];
            if (String(identifier) === String(nisn) && String(password) === String(pass) && rRole === 'STUDENT') {
              return ContentService.createTextOutput(JSON.stringify({ 
                success: true, 
                user: { 
                  id, 
                  role: rRole, 
                  name, 
                  gender: gender || 'L', 
                  nisn, 
                  classId 
                } 
              })).setMimeType(ContentService.MimeType.JSON);
            }
          }
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ success: false, message: 'Kredensial tidak valid' })).setMimeType(ContentService.MimeType.JSON);
    }

    // CRUD Handlers
    if (action === 'addUser') {
      const u = data.user;
      const pass = u.role === 'TEACHER' ? u.nik : (u.role === 'STUDENT' ? u.nisn : (u.nik || u.username));
      const assigned = Array.isArray(u.assignedClasses) ? u.assignedClasses.join(',') : (u.assignedClasses || '');
      ss.getSheetByName('Users').appendRow([
        u.id, 
        u.role, 
        u.name, 
        u.gender || 'L', 
        u.subject || '', 
        u.username || '', 
        u.nik || '', 
        u.nisn || '', 
        u.classId || '', 
        assigned, 
        pass
      ]);
    } 
    else if (action === 'setAllUsers') {
      const sheet = ss.getSheetByName('Users');
      if (sheet) {
        if (sheet.getLastRow() > 1) {
          sheet.deleteRows(2, sheet.getLastRow() - 1);
        }
        const userList = data.users || [];
        userList.forEach(u => {
          const pass = u.role === 'TEACHER' ? u.nik : (u.role === 'STUDENT' ? u.nisn : (u.nik || u.username));
          const assigned = Array.isArray(u.assignedClasses) ? u.assignedClasses.join(',') : (u.assignedClasses || '');
          sheet.appendRow([
            u.id, 
            u.role, 
            u.name, 
            u.gender || 'L', 
            u.subject || '', 
            u.username || '', 
            u.nik || '', 
            u.nisn || '', 
            u.classId || '', 
            assigned, 
            pass
          ]);
        });
      }
    }
    else if (action === 'addUsers') {
      const sheet = ss.getSheetByName('Users');
      const userList = data.users || [];
      const existingData = sheet.getLastRow() > 1 ? sheet.getDataRange().getValues() : [];
      
      userList.forEach(u => {
        const pass = u.role === 'TEACHER' ? u.nik : (u.role === 'STUDENT' ? u.nisn : (u.nik || u.username));
        const assigned = Array.isArray(u.assignedClasses) ? u.assignedClasses.join(',') : (u.assignedClasses || '');
        
        // Find if already exists in Sheet (row 2 onwards)
        let foundRow = -1;
        for (let r = 1; r < existingData.length; r++) {
          const rowId = String(existingData[r][0]);
          const rowRole = String(existingData[r][1]);
          const rowNisn = String(existingData[r][7]);
          const rowUser = String(existingData[r][5]);
          const rowName = String(existingData[r][2]).toLowerCase().trim();
          const rowClass = String(existingData[r][8]).toUpperCase().trim();

          if (rowId === u.id) { foundRow = r + 1; break; }
          if (u.role === 'STUDENT' && rowRole === 'STUDENT') {
            if (u.nisn && String(u.nisn).trim() === rowNisn.trim()) { foundRow = r + 1; break; }
            if (u.name && u.classId && u.name.toLowerCase().trim() === rowName && u.classId.toUpperCase().trim() === rowClass) {
              foundRow = r + 1; break;
            }
          } else if (u.role === 'TEACHER' && rowRole === 'TEACHER') {
            if (u.username && String(u.username).toLowerCase().trim() === rowUser.toLowerCase().trim()) { foundRow = r + 1; break; }
          }
        }

        if (foundRow > -1) {
          // Update existing row
          sheet.getRange(foundRow, 3).setValue(u.name);
          sheet.getRange(foundRow, 4).setValue(u.gender || 'L');
          sheet.getRange(foundRow, 5).setValue(u.subject || '');
          sheet.getRange(foundRow, 6).setValue(u.username || '');
          sheet.getRange(foundRow, 7).setValue(u.nik || '');
          sheet.getRange(foundRow, 8).setValue(u.nisn || '');
          sheet.getRange(foundRow, 9).setValue(u.classId || '');
          sheet.getRange(foundRow, 10).setValue(assigned);
          sheet.getRange(foundRow, 11).setValue(pass);
        } else {
          sheet.appendRow([
            u.id, 
            u.role, 
            u.name, 
            u.gender || 'L', 
            u.subject || '', 
            u.username || '', 
            u.nik || '', 
            u.nisn || '', 
            u.classId || '', 
            assigned, 
            pass
          ]);
        }
      });
    }
    else if (action === 'updateUser') {
      const sheet = ss.getSheetByName('Users');
      const rowIdx = findRowIndex(sheet, 0, data.id);
      if (rowIdx > -1) {
        const u = data.data;
        if (u.name !== undefined) sheet.getRange(rowIdx, 3).setValue(u.name);
        if (u.gender !== undefined) sheet.getRange(rowIdx, 4).setValue(u.gender);
        if (u.subject !== undefined) sheet.getRange(rowIdx, 5).setValue(u.subject);
        if (u.username !== undefined) sheet.getRange(rowIdx, 6).setValue(u.username);
        if (u.nik !== undefined) sheet.getRange(rowIdx, 7).setValue(u.nik);
        if (u.nisn !== undefined) sheet.getRange(rowIdx, 8).setValue(u.nisn);
        if (u.classId !== undefined) sheet.getRange(rowIdx, 9).setValue(u.classId);
        if (u.assignedClasses !== undefined) {
          const val = Array.isArray(u.assignedClasses) ? u.assignedClasses.join(',') : u.assignedClasses;
          sheet.getRange(rowIdx, 10).setValue(val);
        }
      }
    }
    else if (action === 'deleteUser') {
      const sheet = ss.getSheetByName('Users');
      const rowIdx = findRowIndex(sheet, 0, data.id);
      if (rowIdx > -1) sheet.deleteRow(rowIdx);
    }
    else if (action === 'resetPassword') {
      const sheet = ss.getSheetByName('Users');
      const rowIdx = findRowIndex(sheet, 0, data.id);
      if (rowIdx > -1) sheet.getRange(rowIdx, 11).setValue(data.password);
    }
    else if (action === 'addMaterial') {
      const m = data.material;
      const url = m.pdfUrl || m.youtubeUrl || m.linkUrl || '';
      ss.getSheetByName('Materials').appendRow([m.id, m.classId, m.subjectId, m.teacherId, m.title, m.content || '', m.type, url, m.chapter, m.order, m.semester, m.createdAt]);
    }
    else if (action === 'updateMaterial') {
      const sheet = ss.getSheetByName('Materials');
      const rowIdx = findRowIndex(sheet, 0, data.id);
      if (rowIdx > -1) {
        const m = data.data;
        if (m.title) sheet.getRange(rowIdx, 5).setValue(m.title);
        if (m.content) sheet.getRange(rowIdx, 6).setValue(m.content);
        if (m.type) sheet.getRange(rowIdx, 7).setValue(m.type);
        if (m.order) sheet.getRange(rowIdx, 10).setValue(m.order);
      }
    }
    else if (action === 'deleteMaterial') {
      const sheet = ss.getSheetByName('Materials');
      const rowIdx = findRowIndex(sheet, 0, data.id);
      if (rowIdx > -1) sheet.deleteRow(rowIdx);
    }
    else if (action === 'addQuiz') {
      const q = data.quiz;
      ss.getSheetByName('Quizzes').appendRow([q.id, q.materialId || '', q.classId || '', q.subjectId || '', q.title, q.durationMinutes, q.createdAt]);
    }
    else if (action === 'updateQuiz') {
      const sheet = ss.getSheetByName('Quizzes');
      const rowIdx = findRowIndex(sheet, 0, data.id);
      if (rowIdx > -1) {
        const q = data.data;
        if (q.title) sheet.getRange(rowIdx, 5).setValue(q.title);
        if (q.durationMinutes) sheet.getRange(rowIdx, 6).setValue(q.durationMinutes);
      }
    }
    else if (action === 'deleteQuiz') {
      const sheet = ss.getSheetByName('Quizzes');
      const rowIdx = findRowIndex(sheet, 0, data.id);
      if (rowIdx > -1) sheet.deleteRow(rowIdx);
    }
    else if (action === 'submitAssignment') {
      ss.getSheetByName('Assignments').appendRow([data.studentId, data.materialId, data.link, new Date().toISOString()]);
    }
    else if (action === 'markMaterialAsRead') {
      ss.getSheetByName('StudentProgress').appendRow([data.studentId, data.materialId, new Date().toISOString()]);
    }
    else if (action === 'clearDatabase') {
      const targets = data.targets || [];
      const isAll = targets.indexOf('All') > -1;

      // Clear Materials
      if (isAll || targets.indexOf('Materials') > -1) {
        const sheet = ss.getSheetByName('Materials');
        if (sheet && sheet.getLastRow() > 1) {
          sheet.deleteRows(2, sheet.getLastRow() - 1);
        }
      }

      // Clear Quizzes
      if (isAll || targets.indexOf('Quizzes') > -1) {
        const sheet = ss.getSheetByName('Quizzes');
        if (sheet && sheet.getLastRow() > 1) {
          sheet.deleteRows(2, sheet.getLastRow() - 1);
        }
      }

      // Clear QuizResults
      if (isAll || targets.indexOf('QuizResults') > -1) {
        const sheet = ss.getSheetByName('QuizResults');
        if (sheet && sheet.getLastRow() > 1) {
          sheet.deleteRows(2, sheet.getLastRow() - 1);
        }
      }

      // Clear Assignments
      if (isAll || targets.indexOf('Assignments') > -1) {
        const sheet = ss.getSheetByName('Assignments');
        if (sheet && sheet.getLastRow() > 1) {
          sheet.deleteRows(2, sheet.getLastRow() - 1);
        }
      }

      // Clear StudentProgress
      if (isAll || targets.indexOf('StudentProgress') > -1) {
        const sheet = ss.getSheetByName('StudentProgress');
        if (sheet && sheet.getLastRow() > 1) {
          sheet.deleteRows(2, sheet.getLastRow() - 1);
        }
      }

      // Clear Users (Students/Teachers, protecting Super Admin)
      const userSheet = ss.getSheetByName('Users');
      if (userSheet && userSheet.getLastRow() > 1) {
        const rows = userSheet.getDataRange().getValues();
        // Traverse backwards from bottom up to row 2
        for (let r = rows.length - 1; r >= 1; r--) {
          const role = String(rows[r][1]).trim();
          if (role === 'SUPER_ADMIN') continue; // Always preserve SUPER_ADMIN!
          
          let shouldDel = false;
          if (isAll) {
            shouldDel = (role !== 'SUPER_ADMIN');
          } else {
            if (targets.indexOf('Students') > -1 && role === 'STUDENT') shouldDel = true;
            if (targets.indexOf('Teachers') > -1 && role === 'TEACHER') shouldDel = true;
          }
          if (shouldDel) {
            userSheet.deleteRow(r + 1);
          }
        }
      }
    }
    
    return ContentService.createTextOutput(JSON.stringify({ success: true, message: 'Action received and processed' })).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: error.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput("SmartLMS Webhook Active").setMimeType(ContentService.MimeType.TEXT);
}`;

export default function GASConfig() {
  const { webhookUrl, setWebhookUrl, testConnection, isConnected, executeAction } = useGasStore();
  const [url, setUrl] = useState(webhookUrl);
  const [isTesting, setIsTesting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleTest = async () => {
    const cleanUrl = url?.trim() || '';
    if (!cleanUrl) {
      toast.error('Masukkan URL Webhook terlebih dahulu');
      return;
    }
    if (!cleanUrl.includes('script.google.com/macros/s/')) {
      toast.error('URL harus diawali dengan https://script.google.com/macros/s/...');
      return;
    }
    setIsTesting(true);
    setWebhookUrl(cleanUrl);
    const success = await testConnection();
    if (success) {
      toast.success('Koneksi Webhook Berhasil!');
    } else {
      toast.error('Gagal terhubung ke Webhook. Pastikan URL berakhiran /exec dan akses disetel ke "Anyone" (Siapa saja).');
    }
    setIsTesting(false);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(GENERATED_GAS_CODE);
    setCopied(true);
    toast.success('Kode berhasil disalin');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleGenerateTables = async () => {
    if (!isConnected) {
      toast.error('Pastikan webhook sudah terhubung terlebih dahulu!');
      return;
    }
    setIsGenerating(true);
    try {
      const res = await executeAction('setupAllTables');
      if (res.success) {
        toast.success('Berhasil! Semua tabel telah digenerasi otomatis di Google Sheets.');
      } else {
        toast.error('Gagal: ' + (res.error || 'Terjadi kesalahan'));
      }
    } catch (e) {
      toast.error('Gagal memproses permintaan.');
    }
    setIsGenerating(false);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Integrasi Google Sheets (GAS)</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="w-5 h-5 text-indigo-600" />
            Pengaturan Webhook URL
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-600">
            Masukkan URL Web App dari Google Apps Script yang telah Anda deploy. Format URL biasanya diawali dengan <code>https://script.google.com/macros/s/...</code>
          </p>
          <div className="flex gap-4">
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://script.google.com/macros/s/.../exec"
              className="flex-1"
            />
            <Button onClick={handleTest} isLoading={isTesting}>
              Tes Koneksi Webhook
            </Button>
          </div>

          <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-800 space-y-1">
            <p className="font-semibold text-amber-900">Tips Penting Agar Tidak Terjadi "Failed to fetch":</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>Saat <strong>Deploy &gt; New deployment &gt; Web app</strong> di Google Apps Script:</li>
              <li><strong>Execute as:</strong> Pilih <em>Me (email Anda)</em>.</li>
              <li><strong>Who has access:</strong> Wajib pilih <strong><em>Anyone (Siapa saja)</em></strong>. Jangan pilih &quot;Only myself&quot; karena browser akan memblokir request dengan error <em>Failed to fetch</em>.</li>
              <li>Pastikan URL berakhiran <code>/exec</code> (bukan <code>/dev</code>).</li>
            </ul>
          </div>
          {isConnected && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-emerald-50 p-4 rounded-lg border border-emerald-100">
              <div className="flex items-center gap-2 text-emerald-700 text-sm font-medium">
                <CheckCircle2 className="w-5 h-5" />
                Webhook terhubung dan aktif
              </div>
              <Button 
                variant="primary" 
                size="sm" 
                onClick={handleGenerateTables} 
                isLoading={isGenerating}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                <Database className="w-4 h-4 mr-2" />
                Eksekusi Pembuatan Tabel Otomatis
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-indigo-600" />
              Generator Kode Apps Script
            </div>
            <Button variant="outline" size="sm" onClick={handleCopyCode} className="gap-2">
              {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Tersalin' : 'Salin Kode'}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600 mb-4">
            Buat project baru di <a href="https://script.google.com" target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">Google Apps Script</a>. Salin kode di bawah ini ke dalam <code>Code.gs</code>, simpan, lalu jalankan fungsi <code>setupAllTables</code> sekali untuk inisialisasi sheet dan super admin. Setelah itu, Deploy sebagai Web App.
          </p>
          <div className="relative">
            <pre className="bg-slate-900 text-slate-50 p-4 rounded-lg overflow-x-auto text-sm font-mono leading-relaxed h-[400px]">
              <code>{GENERATED_GAS_CODE}</code>
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
