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
  const sheets = ['Users', 'Classes', 'Materials', 'Quizzes', 'QuizResults', 'Attendance', 'Forum'];
  
  sheets.forEach(name => {
    let sheet = ss.getSheetByName(name);
    if (!sheet) {
      sheet = ss.insertSheet(name);
    }
    // Add headers if empty
    if (sheet.getLastRow() === 0) {
      if (name === 'Users') sheet.appendRow(['id', 'role', 'name', 'username', 'nik', 'nisn', 'classId', 'password']);
      // Add other headers as needed...
    }
  });
  
  initSuperAdminScriptProperties();
  return "Setup Complete & Tables Generated";
}

function initSuperAdminScriptProperties() {
  const props = PropertiesService.getScriptProperties();
  props.setProperty('SUPER_ADMIN_ID', 'rafx2');
  props.setProperty('SUPER_ADMIN_PASSWORD', 'Asepst007@');
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    
    if (action === 'ping') {
      return ContentService.createTextOutput(JSON.stringify({ success: true, message: 'pong' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'setupAllTables') {
      const result = setupAllTables();
      return ContentService.createTextOutput(JSON.stringify({ success: true, message: result }))
        .setMimeType(ContentService.MimeType.JSON);
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
        
        // Cek sheet Users untuk guru/admin lain (disini hanya contoh kerangka)
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const userSheet = ss.getSheetByName('Users');
        if (userSheet) {
          const rows = userSheet.getDataRange().getValues();
          for (let i = 1; i < rows.length; i++) {
            const [id, rRole, name, username, nik, nisn, classId, pass] = rows[i];
            if ((identifier === username || identifier === nik) && password === pass && (rRole === 'TEACHER' || rRole === 'ADMIN')) {
              return ContentService.createTextOutput(JSON.stringify({ 
                success: true, 
                user: { id, role: rRole, name, username, nik } 
              })).setMimeType(ContentService.MimeType.JSON);
            }
          }
        }
      } else if (role === 'student') {
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const userSheet = ss.getSheetByName('Users');
        if (userSheet) {
          const rows = userSheet.getDataRange().getValues();
          for (let i = 1; i < rows.length; i++) {
            const [id, rRole, name, username, nik, nisn, classId, pass] = rows[i];
            if (identifier === nisn && password === pass && rRole === 'STUDENT') {
              return ContentService.createTextOutput(JSON.stringify({ 
                success: true, 
                user: { id, role: rRole, name, nisn, classId } 
              })).setMimeType(ContentService.MimeType.JSON);
            }
          }
        }
      }
      
      return ContentService.createTextOutput(JSON.stringify({ success: false, message: 'Kredensial tidak valid' }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ success: true, message: 'Action received' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput("SmartLMS Webhook Active")
    .setMimeType(ContentService.MimeType.TEXT);
}
`;

export default function GASConfig() {
  const { webhookUrl, setWebhookUrl, testConnection, isConnected, executeAction } = useGasStore();
  const [url, setUrl] = useState(webhookUrl);
  const [isTesting, setIsTesting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleTest = async () => {
    if (!url) {
      toast.error('Masukkan URL Webhook terlebih dahulu');
      return;
    }
    setIsTesting(true);
    setWebhookUrl(url);
    const success = await testConnection();
    if (success) {
      toast.success('Koneksi Webhook Berhasil!');
    } else {
      toast.error('Gagal terhubung ke Webhook. Pastikan URL valid dan Apps Script telah di-deploy dengan benar.');
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
