import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Copy, CheckCircle2, Server, Download, ShieldAlert, Database, RefreshCw, CloudCheck, AlertTriangle, Trash2 } from 'lucide-react';
import { toast } from '@/components/ui/Toast';
import { useGasStore } from '@/store/gasStore';
import { useDataStore } from '@/store/dataStore';

const GENERATED_GAS_CODE = `/**
 * SmartLMS SMP - Google Apps Script Backend (v3 - Primary Key & Strict Sync)
 * Salin dan tempel kode ini ke editor Google Apps Script Anda (Code.gs).
 */

function getOrCreateSheet(ss, name, headers) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  if (sheet.getLastRow() === 0 && headers && headers.length > 0) {
    sheet.appendRow(headers);
  } else if (sheet.getLastRow() > 0 && headers && headers.length > 0) {
    // Auto-migrate: check if any new headers are missing from row 1 and append them
    var curHeaders = sheet.getRange(1, 1, 1, Math.max(1, sheet.getLastColumn())).getValues()[0].map(function(h) { return String(h).trim(); });
    for (var i = 0; i < headers.length; i++) {
      if (curHeaders.indexOf(headers[i]) === -1) {
        curHeaders.push(headers[i]);
        sheet.getRange(1, curHeaders.length).setValue(headers[i]);
      }
    }
  }
  return sheet;
}

function ensureAllTablesExist(ss) {
  const sheets = {
    'Users': ['id', 'role', 'name', 'gender', 'subject', 'username', 'nik', 'nisn', 'classId', 'assignedClasses', 'password', 'status'],
    'Materials': ['id', 'classId', 'targetClasses', 'subjectId', 'teacherId', 'teacherName', 'title', 'content', 'type', 'url', 'chapter', 'order', 'semester', 'createdAt', 'hasAssignment', 'assignmentTitle', 'assignmentInstructions', 'assignmentDueDate'],
    'Quizzes': ['id', 'materialId', 'classId', 'subjectId', 'title', 'durationMinutes', 'isScheduled', 'startTime', 'endTime', 'totalQuestions', 'questionsJson', 'createdAt'],
    'QuizQuestions': ['id', 'quizId', 'quizTitle', 'questionNumber', 'text', 'type', 'optionA', 'optionB', 'optionC', 'optionD', 'optionE', 'correctOptionIndex', 'correctOptionIndices', 'sampleAnswer', 'optionImagesJson', 'points', 'imageUrl', 'videoUrl', 'audioUrl', 'explanation', 'createdAt'],
    'QuizResults': ['id', 'quizId', 'quizTitle', 'subject', 'studentId', 'studentName', 'studentNisn', 'studentClass', 'score', 'finalScore', 'violationsCount', 'violationLogsJson', 'penaltyDeduction', 'answersJson', 'essayScoresJson', 'submittedAt', 'disqualified', 'teacherNote'],
    'Assignments': ['id', 'studentId', 'studentName', 'studentNisn', 'studentClass', 'materialId', 'materialTitle', 'subject', 'link', 'fileName', 'fileSize', 'submittedAt', 'grade', 'feedback', 'gradedAt'],
    'StudentProgress': ['studentId', 'materialId', 'readAt']
  };
  
  for (const [name, headers] of Object.entries(sheets)) {
    getOrCreateSheet(ss, name, headers);
  }
}

function findRowIndex(sheet, idColIndex, idVal) {
  if (!sheet) return -1;
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return -1;
  const data = sheet.getRange(2, idColIndex + 1, lastRow - 1, 1).getValues();
  for (let i = 0; i < data.length; i++) {
    if (String(data[i][0]).trim() === String(idVal).trim()) return i + 2;
  }
  return -1;
}

// Primary key matching for Users table
function findUserRow(sheet, user) {
  if (!sheet) return -1;
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return -1;
  const rows = sheet.getDataRange().getValues();
  const uId = String(user.id || '').trim();
  const uNisn = String(user.nisn || '').trim();
  const uNik = String(user.nik || '').trim();
  const uUser = String(user.username || '').toLowerCase().trim();
  const uRole = String(user.role || '').toUpperCase().trim();

  for (let r = 1; r < rows.length; r++) {
    const rowId = String(rows[r][0] || '').trim();
    const rowRole = String(rows[r][1] || '').toUpperCase().trim();
    const rowUser = String(rows[r][5] || '').toLowerCase().trim();
    const rowNik = String(rows[r][6] || '').trim();
    const rowNisn = String(rows[r][7] || '').trim();

    // 1. Match by NISN (Primary key for students)
    if ((uRole === 'STUDENT' || rowRole === 'STUDENT') && uNisn && rowNisn) {
      const uNoZero = uNisn.replace(/^0+/, '');
      const rNoZero = rowNisn.replace(/^0+/, '');
      if (uNisn === rowNisn || (uNoZero && uNoZero === rNoZero)) {
        return r + 1;
      }
    }
    // 2. Match by NIK or Username (Primary key for teachers)
    if ((uRole === 'TEACHER' || rowRole === 'TEACHER')) {
      if (uUser && rowUser && uUser === rowUser) return r + 1;
      if (uNik && rowNik && uNik === rowNik) return r + 1;
    }
    // 3. Match by Username (for admin)
    if (uUser && rowUser && uUser === rowUser) {
      return r + 1;
    }
    // 4. Fallback ID match
    if (uId && rowId && uId === rowId) {
      return r + 1;
    }
  }
  return -1;
}

// Composite Primary Key for Assignments (studentId + materialId or id)
function findAssignmentRow(sheet, studentId, materialId, id) {
  if (!sheet) return -1;
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return -1;
  const rows = sheet.getDataRange().getValues();
  const headers = rows[0].map(function(h) { return String(h).trim().toLowerCase(); });
  const idCol = headers.indexOf('id');
  const sidCol = headers.indexOf('studentid');
  const midCol = headers.indexOf('materialid');

  const targetId = String(id || '').trim();
  const sid = String(studentId || '').trim();
  const mid = String(materialId || '').trim();

  for (let r = 1; r < rows.length; r++) {
    const rowId = idCol >= 0 ? String(rows[r][idCol] || '').trim() : '';
    const rowSid = sidCol >= 0 ? String(rows[r][sidCol] || '').trim() : String(rows[r][0] || '').trim();
    const rowMid = midCol >= 0 ? String(rows[r][midCol] || '').trim() : String(rows[r][1] || '').trim();
    if (targetId && rowId && targetId === rowId) return r + 1;
    if (sid && mid && rowSid === sid && rowMid === mid) return r + 1;
  }
  return -1;
}

// Composite Primary Key for QuizResults (id or quizId + studentId / studentNisn)
function findQuizResultRow(sheet, quizId, studentId, studentNisn, id) {
  if (!sheet) return -1;
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return -1;
  const rows = sheet.getDataRange().getValues();
  const headers = rows[0].map(function(h) { return String(h).trim().toLowerCase(); });
  const idCol = headers.indexOf('id');
  const qidCol = headers.indexOf('quizid');
  const sidCol = headers.indexOf('studentid');
  const snisnCol = headers.indexOf('studentnisn');

  const targetId = String(id || '').trim();
  const qid = String(quizId || '').trim();
  const sid = String(studentId || '').trim();
  const nisn = String(studentNisn || '').trim();

  for (let r = 1; r < rows.length; r++) {
    const rowId = idCol >= 0 ? String(rows[r][idCol] || '').trim() : '';
    const rowQid = qidCol >= 0 ? String(rows[r][qidCol] || '').trim() : String(rows[r][1] || '').trim();
    const rowSid = sidCol >= 0 ? String(rows[r][sidCol] || '').trim() : String(rows[r][2] || '').trim();
    const rowNisn = snisnCol >= 0 ? String(rows[r][snisnCol] || '').trim() : '';

    if (targetId && rowId && targetId === rowId) return r + 1;
    if (qid && rowQid === qid) {
      if (sid && rowSid === sid) return r + 1;
      if (nisn && rowNisn && nisn === rowNisn) return r + 1;
      if (sid && rowNisn && sid === rowNisn) return r + 1;
      if (nisn && rowSid && nisn === rowSid) return r + 1;
    }
  }
  return -1;
}

// Function to clean all sample / mock data from spreadsheet and deduplicate
function cleanInitialSampleData(ss) {
  // 1. Clean sample users
  const uSheet = ss.getSheetByName('Users');
  if (uSheet && uSheet.getLastRow() > 1) {
    const uRows = uSheet.getDataRange().getValues();
    const seenStudentNisns = {};
    const seenTeacherUsernames = {};
    const seenIds = {};

    for (let r = uRows.length - 1; r >= 1; r--) {
      const id = String(uRows[r][0] || '').trim();
      const role = String(uRows[r][1] || '').trim().toUpperCase();
      const name = String(uRows[r][2] || '').toLowerCase().trim();
      const user = String(uRows[r][5] || '').toLowerCase().trim();
      const nik = String(uRows[r][6] || '').trim();
      const nisn = String(uRows[r][7] || '').trim();

      if (role === 'SUPER_ADMIN' || user === 'rafx2' || id === 'sa-1') continue;

      // Check if sample
      const isSample = id === 'student-1' || id === 'teacher-1' || 
        name.indexOf('contoh') > -1 || name.indexOf('percobaan') > -1 || name.indexOf('sample') > -1 ||
        nisn === '1234567890' || nik === '198501012010011001';
      
      if (isSample) {
        uSheet.deleteRow(r + 1);
        continue;
      }

      // Check duplicate primary keys
      if (role === 'STUDENT' && nisn) {
        if (seenStudentNisns[nisn]) {
          uSheet.deleteRow(r + 1); // remove duplicate row
          continue;
        }
        seenStudentNisns[nisn] = true;
      } else if (role === 'TEACHER' && (user || nik)) {
        const tKey = user || nik;
        if (seenTeacherUsernames[tKey]) {
          uSheet.deleteRow(r + 1);
          continue;
        }
        seenTeacherUsernames[tKey] = true;
      } else if (id) {
        if (seenIds[id]) {
          uSheet.deleteRow(r + 1);
          continue;
        }
        seenIds[id] = true;
      }
    }
  }

  // 2. Clean sample quizzes & questions
  const qSheet = ss.getSheetByName('Quizzes');
  const sampleQuizIds = [];
  if (qSheet && qSheet.getLastRow() > 1) {
    const qRows = qSheet.getDataRange().getValues();
    const seenQuizIds = {};
    for (let r = qRows.length - 1; r >= 1; r--) {
      const qId = String(qRows[r][0] || '').trim();
      const qTitle = String(qRows[r][4] || '').toLowerCase().trim();
      const isSample = qId === 'quiz-cbt-1' || qId === 'quiz-1' || qId === 'q-1' ||
        qTitle.indexOf('bangun datar') > -1 || qTitle.indexOf('aljabar dasar') > -1 || qTitle.indexOf('contoh') > -1;
      
      if (isSample) {
        sampleQuizIds.push(qId);
        qSheet.deleteRow(r + 1);
        continue;
      }

      if (qId) {
        if (seenQuizIds[qId]) {
          qSheet.deleteRow(r + 1);
          continue;
        }
        seenQuizIds[qId] = true;
      }
    }
  }

  const qqSheet = ss.getSheetByName('QuizQuestions');
  if (qqSheet && qqSheet.getLastRow() > 1) {
    const qqRows = qqSheet.getDataRange().getValues();
    for (let r = qqRows.length - 1; r >= 1; r--) {
      const qzId = String(qqRows[r][1] || '').trim();
      const qzTitle = String(qqRows[r][2] || '').toLowerCase().trim();
      if (sampleQuizIds.indexOf(qzId) > -1 || qzId === 'quiz-cbt-1' || qzId === 'quiz-1' || 
          qzTitle.indexOf('bangun datar') > -1 || qzTitle.indexOf('aljabar') > -1) {
        qqSheet.deleteRow(r + 1);
      }
    }
  }

  // 3. Clean sample materials
  const mSheet = ss.getSheetByName('Materials');
  if (mSheet && mSheet.getLastRow() > 1) {
    const mRows = mSheet.getDataRange().getValues();
    const seenMatIds = {};
    for (let r = mRows.length - 1; r >= 1; r--) {
      const mId = String(mRows[r][0] || '').toLowerCase().trim();
      const mTitle = String(mRows[r][6] || mRows[r][4] || '').toLowerCase().trim();
      const isSampleMat = mId === 'm-1' || mId === 'm-demo' || mId.indexOf('test') > -1 ||
        mTitle.indexOf('contoh') > -1 || mTitle.indexOf('uji coba') > -1 || mTitle.indexOf('dummy') > -1 || mTitle.indexOf('sample') > -1;
      if (isSampleMat) {
        mSheet.deleteRow(r + 1);
        continue;
      }
      if (mId) {
        if (seenMatIds[mId]) {
          mSheet.deleteRow(r + 1);
          continue;
        }
        seenMatIds[mId] = true;
      }
    }
  }

  // 4. Deduplicate & Clean sample assignments
  const asgSheet = ss.getSheetByName('Assignments');
  if (asgSheet && asgSheet.getLastRow() > 1) {
    const asgRows = asgSheet.getDataRange().getValues();
    const seenAsg = {};
    for (let r = asgRows.length - 1; r >= 1; r--) {
      const row = asgRows[r];
      const sId = String(row[1] || row[0] || '').toLowerCase().trim();
      const mId = String(row[5] || row[1] || '').toLowerCase().trim();
      const file = String(row[9] || row[3] || '').toLowerCase().trim();
      const link = String(row[8] || row[2] || '').toLowerCase().trim();
      const isSampleAsg = sId === 'student-1' || sId === 'student-test-1' || sId.indexOf('test') > -1 ||
        mId === 'm-1' || mId === 'm-demo' || mId.indexOf('test') > -1 ||
        file.indexOf('test') > -1 || link.indexOf('test') > -1 || file.indexOf('contoh') > -1;
      if (isSampleAsg) {
        asgSheet.deleteRow(r + 1);
        continue;
      }
      const key = sId + '::' + mId;
      if (seenAsg[key]) {
        asgSheet.deleteRow(r + 1);
      } else {
        seenAsg[key] = true;
      }
    }
  }

  // 5. Deduplicate & Clean sample quiz results
  const qrSheet = ss.getSheetByName('QuizResults');
  if (qrSheet && qrSheet.getLastRow() > 1) {
    const qrRows = qrSheet.getDataRange().getValues();
    const headers = qrRows[0].map(function(h) { return String(h).trim().toLowerCase(); });
    const qidCol = headers.indexOf('quizid');
    const sidCol = headers.indexOf('studentid');
    const seenQr = {};
    for (let r = qrRows.length - 1; r >= 1; r--) {
      const row = qrRows[r];
      const qId = qidCol >= 0 ? String(row[qidCol] || '').toLowerCase().trim() : String(row[1] || '').toLowerCase().trim();
      const sId = sidCol >= 0 ? String(row[sidCol] || '').toLowerCase().trim() : String(row[2] || '').toLowerCase().trim();
      const isSampleQr = sId === 'student-1' || sId === 'student-test-1' || sId.indexOf('test') > -1 ||
        qId === 'q-1' || qId === 'quiz-1' || qId === 'quiz-cbt-1' || qId.indexOf('test') > -1;
      if (isSampleQr) {
        qrSheet.deleteRow(r + 1);
        continue;
      }
      const key = qId + '::' + sId;
      if (seenQr[key]) {
        qrSheet.deleteRow(r + 1);
      } else {
        seenQr[key] = true;
      }
    }
  }
}

function setupAllTables() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ensureAllTablesExist(ss);
  initSuperAdminScriptProperties();
  cleanInitialSampleData(ss);
  return "Setup Berhasil! Semua Tabel (Materials, Assignments, Quizzes, QuizQuestions, dsb) Telah Dibuat di Google Sheet & Sampel Awal Dibersihkan.";
}

function initSuperAdminScriptProperties() {
  const props = PropertiesService.getScriptProperties();
  props.setProperty('SUPER_ADMIN_ID', 'rafx2');
  props.setProperty('SUPER_ADMIN_PASSWORD', 'Asepst007@');
}

function formatGasDate(d) {
  if (!d) return '';
  if (Object.prototype.toString.call(d) === '[object Date]') {
    try {
      return Utilities.formatDate(d, Session.getScriptTimeZone() || 'Asia/Jakarta', "yyyy-MM-dd'T'HH:mm");
    } catch (e) {
      return d.toISOString().substring(0, 16);
    }
  }
  var s = String(d).trim();
  if (!s) return '';
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s)) return s;
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(s)) return s.substring(0, 16);

  var spaceMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})/);
  if (spaceMatch) {
    return spaceMatch[1] + '-' + spaceMatch[2] + '-' + spaceMatch[3] + 'T' + spaceMatch[4] + ':' + spaceMatch[5];
  }
  var dmyMatch = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\s+(\d{1,2}):(\d{2})/);
  if (dmyMatch) {
    var pad = function(n) { return String(n).length < 2 ? '0' + n : String(n); };
    return dmyMatch[3] + '-' + pad(dmyMatch[2]) + '-' + pad(dmyMatch[1]) + 'T' + pad(dmyMatch[4]) + ':' + pad(dmyMatch[5]);
  }

  var parsed = new Date(s);
  if (!isNaN(parsed.getTime())) {
    try {
      return Utilities.formatDate(parsed, Session.getScriptTimeZone() || 'Asia/Jakarta', "yyyy-MM-dd'T'HH:mm");
    } catch (e) {
      return parsed.toISOString().substring(0, 16);
    }
  }
  return s;
}

function saveQuizQuestions(ss, quiz) {
  if (!quiz || !quiz.id) return;
  const qqStandardHeaders = [
    'id', 'quizId', 'quizTitle', 'questionNumber', 'text', 'type', 'optionA', 'optionB', 'optionC', 'optionD', 'optionE', 'correctOptionIndex', 'correctOptionIndices', 'sampleAnswer', 'optionImagesJson', 'points', 'imageUrl', 'videoUrl', 'audioUrl', 'explanation', 'createdAt'
  ];
  const qqSheet = getOrCreateSheet(ss, 'QuizQuestions', qqStandardHeaders);
  const curHeaders = qqSheet.getRange(1, 1, 1, Math.max(1, qqSheet.getLastColumn())).getValues()[0].map(function(h) { 
    return String(h || '').trim().toLowerCase().replace(/[\s_\-]/g, ''); 
  });
  
  const questions = quiz.questions || [];
  const newRows = questions.map(function(q, idx) {
    const opts = Array.isArray(q.options) ? q.options : [];
    const optImgs = Array.isArray(q.optionImages) ? q.optionImages : [];
    const qType = q.type || (Array.isArray(q.correctOptionIndices) && q.correctOptionIndices.length > 1 ? 'MCMA' : (q.sampleAnswer ? 'ESSAY' : 'SINGLE'));
    const corIndicesStr = Array.isArray(q.correctOptionIndices) ? JSON.stringify(q.correctOptionIndices) : '';
    const optImgsStr = optImgs.length > 0 ? JSON.stringify(optImgs) : '';

    const valMap = {
      'id': q.id || ('q-' + (idx + 1)),
      'quizid': quiz.id,
      'idkuis': quiz.id,
      'quiztitle': quiz.title || '',
      'judulkuis': quiz.title || '',
      'questionnumber': idx + 1,
      'nomorsoal': idx + 1,
      'nomor': idx + 1,
      'text': q.text || '',
      'soal': q.text || '',
      'tekssoal': q.text || '',
      'type': qType,
      'jenissoal': qType,
      'tipe': qType,
      'optiona': opts[0] || '',
      'opsia': opts[0] || '',
      'pilihana': opts[0] || '',
      'optionb': opts[1] || '',
      'opsib': opts[1] || '',
      'pilihanb': opts[1] || '',
      'optionc': opts[2] || '',
      'opsic': opts[2] || '',
      'pilihanc': opts[2] || '',
      'optiond': opts[3] || '',
      'opsid': opts[3] || '',
      'pilihand': opts[3] || '',
      'optione': opts[4] || '',
      'opsie': opts[4] || '',
      'pilihane': opts[4] || '',
      'correctoptionindex': (Array.isArray(q.correctOptionIndices) && q.correctOptionIndices.length > 0)
        ? q.correctOptionIndices[0]
        : (q.correctOptionIndex !== undefined ? q.correctOptionIndex : 0),
      'kunci': (Array.isArray(q.correctOptionIndices) && q.correctOptionIndices.length > 0)
        ? q.correctOptionIndices[0]
        : (q.correctOptionIndex !== undefined ? q.correctOptionIndex : 0),
      'kuncijawaban': (Array.isArray(q.correctOptionIndices) && q.correctOptionIndices.length > 0)
        ? q.correctOptionIndices[0]
        : (q.correctOptionIndex !== undefined ? q.correctOptionIndex : 0),
      'correctoptionindices': corIndicesStr,
      'kuncikompleks': corIndicesStr,
      'sampleanswer': q.sampleAnswer || '',
      'kunciessai': q.sampleAnswer || '',
      'rubrik': q.sampleAnswer || '',
      'optionimagesjson': optImgsStr,
      'gambarpilihan': optImgsStr,
      'points': q.points !== undefined ? Number(q.points) : 10,
      'poin': q.points !== undefined ? Number(q.points) : 10,
      'bobot': q.points !== undefined ? Number(q.points) : 10,
      'imageurl': q.imageUrl || '',
      'linkgambar': q.imageUrl || '',
      'gambar': q.imageUrl || '',
      'videourl': q.videoUrl || '',
      'linkvideo': q.videoUrl || '',
      'video': q.videoUrl || '',
      'audiourl': q.audioUrl || '',
      'linkaudio': q.audioUrl || '',
      'audio': q.audioUrl || '',
      'explanation': q.explanation || '',
      'pembahasan': q.explanation || '',
      'createdat': new Date().toISOString()
    };

    return curHeaders.map(function(h) {
      return valMap[h] !== undefined ? valMap[h] : '';
    });
  });

  // Dynamic row expansion & safe atomic update:
  // Preserves existing questions for OTHER quizzes, and replaces or appends questions for THIS quiz
  const targetCols = curHeaders.length;
  const lastRow = qqSheet.getLastRow();
  let remainingRows = [];
  if (lastRow > 1) {
    const allData = qqSheet.getRange(2, 1, lastRow - 1, qqSheet.getLastColumn()).getValues();
    const qidIdx = curHeaders.indexOf('quizid') >= 0 ? curHeaders.indexOf('quizid') : 1;
    remainingRows = allData
      .filter(function(r) { return String(r[qidIdx]) !== String(quiz.id); })
      .map(function(r) {
        while (r.length < targetCols) r.push('');
        return r.slice(0, targetCols);
      });
  }
  const combined = remainingRows.concat(newRows);
  if (combined.length > 0) {
    // If the spreadsheet doesn't have enough rows, automatically insert rows so it never gets capped
    const currentMaxRows = qqSheet.getMaxRows();
    const neededRows = combined.length + 50;
    if (neededRows > currentMaxRows) {
      qqSheet.insertRowsAfter(currentMaxRows, neededRows - currentMaxRows);
    }
    // Clear only old content range
    if (lastRow > 1) {
      qqSheet.getRange(2, 1, lastRow - 1, qqSheet.getLastColumn()).clearContent();
    }
    const writeRange = qqSheet.getRange(2, 1, combined.length, targetCols);
    writeRange.setValues(combined);

    // Format text columns (like JSON strings) as plain text so Google Sheet doesn't corrupt quotes
    const corIdxCol = curHeaders.indexOf('correctoptionindices') + 1;
    if (corIdxCol > 0) {
      qqSheet.getRange(2, corIdxCol, combined.length, 1).setNumberFormat('@');
    }
  }
}

function saveOrUpdateQuiz(ss, quiz, shouldUpdateQuestions) {
  if (!quiz || !quiz.id) return;
  const qSheet = getOrCreateSheet(ss, 'Quizzes', [
    'id', 'materialId', 'classId', 'subjectId', 'title', 'durationMinutes', 'isScheduled', 'startTime', 'endTime', 'totalQuestions', 'questionsJson', 'createdAt'
  ]);
  
  const questions = quiz.questions || [];
  const startStr = quiz.isScheduled ? formatGasDate(quiz.startTime) : '';
  const endStr = quiz.isScheduled ? formatGasDate(quiz.endTime) : '';
  const qRow = [
    quiz.id,
    quiz.materialId || '',
    quiz.classId || '',
    quiz.subjectId || '',
    quiz.title || '',
    Number(quiz.durationMinutes) || 45,
    quiz.isScheduled ? 'TRUE' : 'FALSE',
    startStr,
    endStr,
    questions.length,
    JSON.stringify(questions),
    quiz.createdAt || new Date().toISOString()
  ];
  
  // Check Primary Key
  const rowIdx = findRowIndex(qSheet, 0, quiz.id);
  if (rowIdx > -1) {
    qSheet.getRange(rowIdx, 1, 1, qRow.length).setValues([qRow]);
    if (startStr) qSheet.getRange(rowIdx, 8).setNumberFormat('@').setValue(startStr);
    if (endStr) qSheet.getRange(rowIdx, 9).setNumberFormat('@').setValue(endStr);
  } else {
    qSheet.appendRow(qRow);
    const newRow = qSheet.getLastRow();
    if (startStr) qSheet.getRange(newRow, 8).setNumberFormat('@').setValue(startStr);
    if (endStr) qSheet.getRange(newRow, 9).setNumberFormat('@').setValue(endStr);
  }
  
  // Only update question sub-table if explicitly requested or new quiz with questions
  if (shouldUpdateQuestions || (rowIdx === -1 && questions.length > 0)) {
    saveQuizQuestions(ss, quiz);
  }
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // Otomatis pastikan seluruh tabel (termasuk Materials dan Assignments) langsung dibuat jika belum ada di spreadsheet
    ensureAllTablesExist(ss);

    if (action === 'ping') {
      return ContentService.createTextOutput(JSON.stringify({ success: true, message: 'pong' })).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'setupAllTables') {
      const result = setupAllTables();
      return ContentService.createTextOutput(JSON.stringify({ success: true, message: result })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // Auth Check (Flexible, handles leading zeroes and default passwords)
    if (action === 'login') {
      const identifier = String(data.identifier || '').trim();
      const password = String(data.password || '').trim();
      const role = String(data.role || '').toLowerCase();
      
      const cleanId = identifier.toLowerCase();
      const cleanIdNoZero = cleanId.replace(/^0+/, '');
      
      // Super Admin check
      const props = PropertiesService.getScriptProperties();
      if ((cleanId === String(props.getProperty('SUPER_ADMIN_ID') || 'rafx2').toLowerCase()) && 
          password === (props.getProperty('SUPER_ADMIN_PASSWORD') || 'Asepst007@')) {
        return ContentService.createTextOutput(JSON.stringify({ 
          success: true, 
          user: { id: 'sa-1', role: 'SUPER_ADMIN', name: 'Super Administrator', username: 'rafx2' } 
        })).setMimeType(ContentService.MimeType.JSON);
      }

      const userSheet = ss.getSheetByName('Users');
      if (userSheet && userSheet.getLastRow() > 1) {
        const rows = userSheet.getDataRange().getValues();
        for (let i = 1; i < rows.length; i++) {
          const [id, rRole, name, gender, subject, username, nik, nisn, classId, assignedClasses, pass] = rows[i];
          const rowRole = String(rRole || '').trim().toUpperCase();
          const rowUser = String(username || '').trim().toLowerCase();
          const rowNik = String(nik || '').trim();
          const rowNisn = String(nisn || '').trim();
          const rowNisnNoZero = rowNisn.replace(/^0+/, '');
          const rowPass = String(pass !== undefined && pass !== null ? pass : '').trim();

          if (role === 'teacher' && (rowRole === 'TEACHER' || rowRole === 'ADMIN' || rowRole === 'SUPER_ADMIN')) {
            const idMatched = (cleanId === rowUser) || (cleanId === rowNik) || (cleanId === String(id));
            // Jika kata sandi telah diubah (rowPass terisi), WAJIB cocok dengan rowPass!
            // Jika rowPass belum disetel, izinkan kata sandi bawaan (NIK atau 123456)
            const passMatched = rowPass ? (rowPass === password) : (password === rowNik || password === '123456');
            if (idMatched && passMatched) {
              return ContentService.createTextOutput(JSON.stringify({ 
                success: true, 
                user: { 
                  id: String(id), 
                  role: rowRole, 
                  name: String(name || ''), 
                  gender: gender || 'L', 
                  subject: subject || '', 
                  username: rowUser, 
                  nik: rowNik,
                  password: rowPass || rowNik || '123456',
                  assignedClasses: assignedClasses ? String(assignedClasses).split(',').map(function(s) { return s.trim(); }).filter(Boolean) : []
                } 
              })).setMimeType(ContentService.MimeType.JSON);
            }
          } else if (role === 'student' && rowRole === 'STUDENT') {
            const idMatched = (cleanId === rowNisn) || (cleanIdNoZero && cleanIdNoZero === rowNisnNoZero) || (cleanId === rowUser) || (cleanId === String(id));
            // Jika kata sandi telah diubah (rowPass terisi), WAJIB cocok dengan rowPass!
            // Jika rowPass belum disetel, izinkan kata sandi bawaan (NISN atau 123456)
            const passMatched = rowPass ? (rowPass === password) : (password === rowNisn || (cleanIdNoZero && password === rowNisnNoZero) || password === '123456');
            if (idMatched && passMatched) {
              return ContentService.createTextOutput(JSON.stringify({ 
                success: true, 
                user: { 
                  id: String(id), 
                  role: 'STUDENT', 
                  name: String(name || ''), 
                  gender: gender || 'L', 
                  nisn: rowNisn, 
                  classId: String(classId || ''),
                  password: rowPass || rowNisn || '123456'
                } 
              })).setMimeType(ContentService.MimeType.JSON);
            }
          }
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ success: false, message: 'Kredensial tidak valid atau akun belum terdaftar' })).setMimeType(ContentService.MimeType.JSON);
    }

    // CRUD Handlers - Users
    if (action === 'cleanInitialSampleData') {
      cleanInitialSampleData(ss);
      return ContentService.createTextOutput(JSON.stringify({ 
        success: true, 
        message: 'Data sampel awal & data duplikat berhasil dibersihkan dari Google Sheet!' 
      })).setMimeType(ContentService.MimeType.JSON);
    }
    else if (action === 'addUser') {
      const u = data.user;
      const pass = u.password || (u.role === 'TEACHER' ? u.nik : (u.role === 'STUDENT' ? u.nisn : (u.nik || u.username)));
      const assigned = Array.isArray(u.assignedClasses) ? u.assignedClasses.join(',') : (u.assignedClasses || '');
      const uSheet = getOrCreateSheet(ss, 'Users', ['id', 'role', 'name', 'gender', 'subject', 'username', 'nik', 'nisn', 'classId', 'assignedClasses', 'password']);
      
      const foundRow = findUserRow(uSheet, u);
      if (foundRow > -1) {
        uSheet.getRange(foundRow, 3).setValue(u.name);
        uSheet.getRange(foundRow, 4).setValue(u.gender || 'L');
        uSheet.getRange(foundRow, 5).setValue(u.subject || '');
        uSheet.getRange(foundRow, 6).setValue(u.username || '');
        uSheet.getRange(foundRow, 7).setValue(u.nik || '');
        uSheet.getRange(foundRow, 8).setValue(u.nisn || '');
        uSheet.getRange(foundRow, 9).setValue(u.classId || '');
        uSheet.getRange(foundRow, 10).setValue(assigned);
        if (u.password && String(u.password).trim() !== '') {
          uSheet.getRange(foundRow, 11).setValue(String(u.password).trim());
        }
      } else {
        uSheet.appendRow([
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
    } 
    else if (action === 'setAllUsers') {
      const sheet = getOrCreateSheet(ss, 'Users', ['id', 'role', 'name', 'gender', 'subject', 'username', 'nik', 'nisn', 'classId', 'assignedClasses', 'password']);
      if (sheet.getLastRow() > 1) {
        sheet.deleteRows(2, sheet.getLastRow() - 1);
      }
      const userList = data.users || [];
      if (userList.length > 0) {
        const rows = userList.map(function(u) {
          const pass = u.password || (u.role === 'TEACHER' ? u.nik : (u.role === 'STUDENT' ? u.nisn : (u.nik || u.username)));
          const assigned = Array.isArray(u.assignedClasses) ? u.assignedClasses.join(',') : (u.assignedClasses || '');
          return [
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
          ];
        });
        sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
      }
    }
    else if (action === 'addUsers') {
      const sheet = getOrCreateSheet(ss, 'Users', ['id', 'role', 'name', 'gender', 'subject', 'username', 'nik', 'nisn', 'classId', 'assignedClasses', 'password']);
      const userList = data.users || [];
      
      userList.forEach(function(u) {
        const pass = u.password || (u.role === 'TEACHER' ? u.nik : (u.role === 'STUDENT' ? u.nisn : (u.nik || u.username)));
        const assigned = Array.isArray(u.assignedClasses) ? u.assignedClasses.join(',') : (u.assignedClasses || '');
        const foundRow = findUserRow(sheet, u);

        if (foundRow > -1) {
          sheet.getRange(foundRow, 3).setValue(u.name);
          sheet.getRange(foundRow, 4).setValue(u.gender || 'L');
          sheet.getRange(foundRow, 5).setValue(u.subject || '');
          sheet.getRange(foundRow, 6).setValue(u.username || '');
          sheet.getRange(foundRow, 7).setValue(u.nik || '');
          sheet.getRange(foundRow, 8).setValue(u.nisn || '');
          sheet.getRange(foundRow, 9).setValue(u.classId || '');
          sheet.getRange(foundRow, 10).setValue(assigned);
          if (u.password !== undefined && String(u.password).trim() !== '') {
            sheet.getRange(foundRow, 11).setValue(String(u.password).trim());
          }
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
    else if (action === 'changePassword') {
      const sheet = ss.getSheetByName('Users');
      if (sheet && sheet.getLastRow() > 1) {
        const rows = sheet.getDataRange().getValues();
        const headers = rows[0].map(function(h) { return String(h).trim().toLowerCase(); });
        let passCol = headers.indexOf('password');
        if (passCol < 0) passCol = headers.indexOf('pass');
        if (passCol < 0) passCol = headers.indexOf('katasandi');
        if (passCol < 0) passCol = 10;

        const idCol = headers.indexOf('id');
        const userCol = headers.indexOf('username');
        const nikCol = headers.indexOf('nik');
        const nisnCol = headers.indexOf('nisn');
        const nameCol = headers.indexOf('name') >= 0 ? headers.indexOf('name') : headers.indexOf('nama');

        let targetRow = -1;
        const targetId = String(data.id || '').trim();
        const targetNisn = String(data.nisn || '').trim();
        const targetNisnNoZero = targetNisn.replace(/^0+/, '');
        const targetNik = String(data.nik || '').trim();
        const targetUser = String(data.username || '').toLowerCase().trim();
        const targetName = String(data.name || '').toLowerCase().trim();
        const newPass = String(data.password || '').trim();

        for (let r = 1; r < rows.length; r++) {
          const rowId = idCol >= 0 ? String(rows[r][idCol] || '').trim() : String(rows[r][0] || '').trim();
          const rowUser = userCol >= 0 ? String(rows[r][userCol] || '').toLowerCase().trim() : String(rows[r][5] || '').toLowerCase().trim();
          const rowNik = nikCol >= 0 ? String(rows[r][nikCol] || '').trim() : String(rows[r][6] || '').trim();
          const rowNisn = nisnCol >= 0 ? String(rows[r][nisnCol] || '').trim() : String(rows[r][7] || '').trim();
          const rowNisnNoZero = rowNisn.replace(/^0+/, '');
          const rowName = nameCol >= 0 ? String(rows[r][nameCol] || '').toLowerCase().trim() : String(rows[r][2] || '').toLowerCase().trim();

          if (targetId && rowId === targetId) { targetRow = r + 1; break; }
          if (targetNisn && (rowNisn === targetNisn || (targetNisnNoZero && rowNisnNoZero === targetNisnNoZero))) { targetRow = r + 1; break; }
          if (targetNik && rowNik === targetNik) { targetRow = r + 1; break; }
          if (targetUser && rowUser === targetUser) { targetRow = r + 1; break; }
          if (targetName && rowName && targetName === rowName) { targetRow = r + 1; break; }
        }

        if (targetRow > -1 && newPass) {
          sheet.getRange(targetRow, passCol + 1).setNumberFormat('@').setValue(newPass);
          return ContentService.createTextOutput(JSON.stringify({ 
            success: true, 
            message: 'Kata sandi berhasil diperbarui dan tersimpan permanen di Google Sheet!' 
          })).setMimeType(ContentService.MimeType.JSON);
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ 
        success: false, 
        message: 'Pengguna tidak ditemukan di tabel Google Sheet Users' 
      })).setMimeType(ContentService.MimeType.JSON);
    }
    else if (action === 'updateUser') {
      const sheet = ss.getSheetByName('Users');
      if (sheet && sheet.getLastRow() > 1) {
        const rows = sheet.getDataRange().getValues();
        let targetRow = -1;
        const targetId = String(data.id || '').trim();
        const targetNisn = String(data.nisn || '').trim();
        const targetNik = String(data.nik || '').trim();
        const targetUser = String(data.username || '').toLowerCase().trim();

        for (let r = 1; r < rows.length; r++) {
          const rowId = String(rows[r][0]).trim();
          const rowUser = String(rows[r][5]).toLowerCase().trim();
          const rowNik = String(rows[r][6]).trim();
          const rowNisn = String(rows[r][7]).trim();

          if (targetId && rowId === targetId) { targetRow = r + 1; break; }
          if (targetNisn && rowNisn === targetNisn) { targetRow = r + 1; break; }
          if (targetNik && rowNik === targetNik) { targetRow = r + 1; break; }
          if (targetUser && rowUser === targetUser) { targetRow = r + 1; break; }
        }

        if (targetRow > -1) {
          const u = data.data || data;
          if (u.name !== undefined) sheet.getRange(targetRow, 3).setValue(u.name);
          if (u.gender !== undefined) sheet.getRange(targetRow, 4).setValue(u.gender);
          if (u.subject !== undefined) sheet.getRange(targetRow, 5).setValue(u.subject);
          if (u.username !== undefined) sheet.getRange(targetRow, 6).setValue(u.username);
          if (u.nik !== undefined) sheet.getRange(targetRow, 7).setValue(u.nik);
          if (u.nisn !== undefined) sheet.getRange(targetRow, 8).setValue(u.nisn);
          if (u.classId !== undefined) sheet.getRange(targetRow, 9).setValue(u.classId);
          if (u.assignedClasses !== undefined) {
            const val = Array.isArray(u.assignedClasses) ? u.assignedClasses.join(',') : u.assignedClasses;
            sheet.getRange(targetRow, 10).setValue(val);
          }
          const passToSet = u.password !== undefined ? u.password : data.password;
          if (passToSet !== undefined && String(passToSet).trim() !== '') {
            sheet.getRange(targetRow, 11).setNumberFormat('@').setValue(String(passToSet).trim());
          }
          return ContentService.createTextOutput(JSON.stringify({ success: true, message: 'Data pengguna diperbarui di Google Sheet' })).setMimeType(ContentService.MimeType.JSON);
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ success: false, message: 'Pengguna tidak ditemukan' })).setMimeType(ContentService.MimeType.JSON);
    }
    else if (action === 'deleteUser') {
      const sheet = ss.getSheetByName('Users');
      const targetId = String(data.id || '').trim();
      const targetNisn = String(data.nisn || '').trim();
      const targetNik = String(data.nik || '').trim();
      const targetUser = String(data.username || '').toLowerCase().trim();

      if (sheet && sheet.getLastRow() > 1) {
        const rows = sheet.getDataRange().getValues();
        for (let r = rows.length - 1; r >= 1; r--) {
          const rowId = String(rows[r][0] || '').trim();
          const rowRole = String(rows[r][1] || '').trim();
          if (rowRole === 'SUPER_ADMIN') continue;
          const rowUser = String(rows[r][5] || '').toLowerCase().trim();
          const rowNik = String(rows[r][6] || '').trim();
          const rowNisn = String(rows[r][7] || '').trim();

          let match = false;
          if (targetId && rowId === targetId) match = true;
          if (targetNisn && rowNisn && targetNisn === rowNisn) match = true;
          if (targetNik && rowNik && targetNik === rowNik) match = true;
          if (targetUser && rowUser && targetUser === rowUser) match = true;

          if (match) {
            sheet.deleteRow(r + 1);
          }
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ success: true, message: 'Pengguna dihapus dari Google Sheet' })).setMimeType(ContentService.MimeType.JSON);
    }
    else if (action === 'resetPassword') {
      const sheet = ss.getSheetByName('Users');
      const rowIdx = findRowIndex(sheet, 0, data.id);
      if (rowIdx > -1) {
        sheet.getRange(rowIdx, 11).setNumberFormat('@').setValue(data.password);
        return ContentService.createTextOutput(JSON.stringify({ success: true, message: 'Kata sandi direset di Google Sheet' })).setMimeType(ContentService.MimeType.JSON);
      }
      return ContentService.createTextOutput(JSON.stringify({ success: false, message: 'Pengguna tidak ditemukan' })).setMimeType(ContentService.MimeType.JSON);
    }

    // CRUD Handlers - Materials
    else if (action === 'addMaterial') {
      const m = data.material;
      const url = m.pdfUrl || m.youtubeUrl || m.linkUrl || '';
      const targetClasses = Array.isArray(m.targetClasses) ? m.targetClasses.join(', ') : (m.targetClasses || m.classId || '');
      const mHeaders = ['id', 'classId', 'targetClasses', 'subjectId', 'teacherId', 'teacherName', 'title', 'content', 'type', 'url', 'chapter', 'order', 'semester', 'createdAt', 'hasAssignment', 'assignmentTitle', 'assignmentInstructions', 'assignmentDueDate'];
      const mSheet = getOrCreateSheet(ss, 'Materials', mHeaders);
      const rowIdx = findRowIndex(mSheet, 0, m.id);
      const rowData = [
        m.id, 
        m.classId || '', 
        targetClasses,
        m.subjectId || '', 
        m.teacherId || '', 
        m.teacherName || '',
        m.title || '', 
        m.content || '', 
        m.type || 'LINK', 
        url, 
        m.chapter || '', 
        m.order || 1, 
        m.semester || 1, 
        m.createdAt || new Date().toISOString(),
        m.hasAssignment ? 'TRUE' : 'FALSE',
        m.assignmentTitle || '',
        m.assignmentInstructions || '',
        m.assignmentDueDate || ''
      ];
      if (rowIdx > -1) {
        mSheet.getRange(rowIdx, 1, 1, rowData.length).setValues([rowData]);
      } else {
        mSheet.appendRow(rowData);
      }
      return ContentService.createTextOutput(JSON.stringify({ success: true, message: 'Materi berhasil disimpan di Google Sheet' })).setMimeType(ContentService.MimeType.JSON);
    }
    else if (action === 'updateMaterial') {
      const sheet = ss.getSheetByName('Materials');
      const rowIdx = findRowIndex(sheet, 0, data.id);
      if (rowIdx > -1) {
        const m = data.data || {};
        const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(function(h) { return String(h).trim().toLowerCase(); });
        function setIfDef(colName, val) {
          const idx = headers.indexOf(colName);
          if (idx >= 0 && val !== undefined) sheet.getRange(rowIdx, idx + 1).setValue(val);
        }
        setIfDef('title', m.title);
        setIfDef('content', m.content);
        setIfDef('type', m.type);
        setIfDef('teachername', m.teacherName);
        if (m.targetClasses !== undefined) {
          const tc = Array.isArray(m.targetClasses) ? m.targetClasses.join(', ') : m.targetClasses;
          setIfDef('targetclasses', tc);
        }
        setIfDef('order', m.order);
        if (m.hasAssignment !== undefined) setIfDef('hasassignment', m.hasAssignment ? 'TRUE' : 'FALSE');
        setIfDef('assignmenttitle', m.assignmentTitle || '');
        setIfDef('assignmentinstructions', m.assignmentInstructions || '');
        setIfDef('assignmentduedate', m.assignmentDueDate || '');
      }
      return ContentService.createTextOutput(JSON.stringify({ success: true, message: 'Materi berhasil diperbarui di Google Sheet' })).setMimeType(ContentService.MimeType.JSON);
    }
    else if (action === 'deleteMaterial') {
      const sheet = ss.getSheetByName('Materials');
      const rowIdx = findRowIndex(sheet, 0, data.id);
      if (rowIdx > -1) sheet.deleteRow(rowIdx);
      return ContentService.createTextOutput(JSON.stringify({ success: true, message: 'Materi berhasil dihapus dari Google Sheet' })).setMimeType(ContentService.MimeType.JSON);
    }

    // CRUD Handlers - Quizzes & Questions
    else if (action === 'addQuiz' || action === 'saveQuiz') {
      const q = data.quiz;
      saveOrUpdateQuiz(ss, q, true);
      return ContentService.createTextOutput(JSON.stringify({ success: true, message: 'Kuis berhasil disimpan di Google Sheet' })).setMimeType(ContentService.MimeType.JSON);
    }
    else if (action === 'updateQuiz') {
      const quiz = data.quiz;
      if (quiz && quiz.id) {
        const hasQuestions = Array.isArray(quiz.questions) && (quiz.questions.length > 0 || Boolean(data.updateQuestions) || Boolean(data.data && data.data.questions));
        saveOrUpdateQuiz(ss, quiz, hasQuestions);
      } else {
        const sheet = getOrCreateSheet(ss, 'Quizzes', ['id', 'materialId', 'classId', 'subjectId', 'title', 'durationMinutes', 'isScheduled', 'startTime', 'endTime', 'totalQuestions', 'questionsJson', 'createdAt']);
        const rowIdx = findRowIndex(sheet, 0, data.id);
        const q = data.data || {};
        if (rowIdx > -1) {
          if (q.title !== undefined) sheet.getRange(rowIdx, 5).setValue(q.title);
          if (q.durationMinutes !== undefined) sheet.getRange(rowIdx, 6).setValue(Number(q.durationMinutes));
          if (q.isScheduled !== undefined) sheet.getRange(rowIdx, 7).setValue(q.isScheduled ? 'TRUE' : 'FALSE');
          if (q.startTime !== undefined) sheet.getRange(rowIdx, 8).setNumberFormat('@').setValue(formatGasDate(q.startTime) || '');
          if (q.endTime !== undefined) sheet.getRange(rowIdx, 9).setNumberFormat('@').setValue(formatGasDate(q.endTime) || '');
          if (q.classId !== undefined) sheet.getRange(rowIdx, 3).setValue(q.classId);
          if (q.questions !== undefined) {
            sheet.getRange(rowIdx, 10).setValue(q.questions.length);
            sheet.getRange(rowIdx, 11).setValue(JSON.stringify(q.questions));
            saveQuizQuestions(ss, { id: data.id, title: q.title || '', questions: q.questions });
          }
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ success: true, message: 'Jadwal & data kuis berhasil diperbarui di Google Sheet' })).setMimeType(ContentService.MimeType.JSON);
    }
    else if (action === 'syncQuizQuestions') {
      const quiz = data.quiz;
      if (quiz) {
        saveOrUpdateQuiz(ss, quiz, true);
      }
      return ContentService.createTextOutput(JSON.stringify({ success: true, message: 'Butir soal kuis berhasil disinkronkan ke Google Sheet' })).setMimeType(ContentService.MimeType.JSON);
    }
    else if (action === 'deleteQuiz') {
      const sheet = ss.getSheetByName('Quizzes');
      if (sheet) {
        const rowIdx = findRowIndex(sheet, 0, data.id);
        if (rowIdx > -1) sheet.deleteRow(rowIdx);
      }
      const qqSheet = ss.getSheetByName('QuizQuestions');
      if (qqSheet && qqSheet.getLastRow() > 1) {
        const dataRows = qqSheet.getRange(2, 2, qqSheet.getLastRow() - 1, 1).getValues();
        for (let i = dataRows.length - 1; i >= 0; i--) {
          if (String(dataRows[i][0]) === String(data.id)) {
            qqSheet.deleteRow(i + 2);
          }
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ success: true, message: 'Kuis berhasil dihapus dari Google Sheet' })).setMimeType(ContentService.MimeType.JSON);
    }
    else if (action === 'submitQuiz') {
      const r = data.result || data;
      const qrHeaders = ['id', 'quizId', 'quizTitle', 'subject', 'studentId', 'studentName', 'studentNisn', 'studentClass', 'score', 'finalScore', 'violationsCount', 'answersJson', 'essayScoresJson', 'submittedAt', 'disqualified', 'teacherNote'];
      const resSheet = getOrCreateSheet(ss, 'QuizResults', qrHeaders);
      const rowIdx = findQuizResultRow(resSheet, r.quizId, r.studentId, r.studentNisn, r.id);

      const headers = resSheet.getRange(1, 1, 1, resSheet.getLastColumn()).getValues()[0].map(function(h) { 
        return String(h || '').trim().toLowerCase().replace(/[\s_\-]/g, ''); 
      });
      
      const scoreVal = r.score !== undefined ? Number(r.score) : 0;
      const fScoreVal = r.finalScore !== undefined ? Number(r.finalScore) : scoreVal;
      const violVal = Number(r.violationsCount || (r.violationLogs ? r.violationLogs.length : 0) || 0);
      const ansVal = typeof r.answers === 'string' ? r.answers : JSON.stringify(r.answers || {});
      const essayVal = r.essayScores ? (typeof r.essayScores === 'string' ? r.essayScores : JSON.stringify(r.essayScores)) : '{}';

      const valMap = {
        'id': r.id || ('qr-' + new Date().getTime() + '-' + Math.floor(Math.random() * 10000)),
        'quizid': r.quizId || '',
        'idkuis': r.quizId || '',
        'quiztitle': r.quizTitle || '',
        'judulkuis': r.quizTitle || '',
        'subject': r.subject || '',
        'mapel': r.subject || '',
        'studentid': r.studentId || '',
        'idsiswa': r.studentId || '',
        'studentname': r.studentName || '',
        'namasiswa': r.studentName || '',
        'nama': r.studentName || '',
        'studentnisn': r.studentNisn || '',
        'nisn': r.studentNisn || '',
        'studentclass': r.studentClass || '',
        'kelas': r.studentClass || '',
        'score': scoreVal,
        'nilai': scoreVal,
        'finalscore': fScoreVal,
        'nilaiakhir': fScoreVal,
        'violationscount': violVal,
        'pelanggaran': violVal,
        'violationlogsjson': Array.isArray(r.violationLogs) ? JSON.stringify(r.violationLogs) : '[]',
        'penaltydeduction': Number(r.penaltyDeduction || 0),
        'answersjson': ansVal,
        'jawaban': ansVal,
        'essayscoresjson': essayVal,
        'nilaiessai': essayVal,
        'submittedat': r.submittedAt || new Date().toISOString(),
        'waktusubmit': r.submittedAt || new Date().toISOString(),
        'disqualified': r.disqualified ? 'YA' : 'TIDAK',
        'didiskualifikasi': r.disqualified ? 'YA' : 'TIDAK',
        'teachernote': r.teacherNote || '',
        'catatan': r.teacherNote || ''
      };

      const rowData = headers.map(function(h) {
        return valMap[h] !== undefined ? valMap[h] : '';
      });

      if (rowIdx > -1) {
        resSheet.getRange(rowIdx, 1, 1, rowData.length).setValues([rowData]);
      } else {
        resSheet.appendRow(rowData);
      }
      return ContentService.createTextOutput(JSON.stringify({ success: true, message: 'Hasil ujian berhasil disimpan di Google Sheet' })).setMimeType(ContentService.MimeType.JSON);
    }
    else if (action === 'updateQuizResult') {
      const qrHeaders = ['id', 'quizId', 'quizTitle', 'subject', 'studentId', 'studentName', 'studentNisn', 'studentClass', 'score', 'finalScore', 'violationsCount', 'answersJson', 'essayScoresJson', 'submittedAt', 'disqualified', 'teacherNote'];
      const resSheet = getOrCreateSheet(ss, 'QuizResults', qrHeaders);
      const rowIdx = findQuizResultRow(resSheet, data.quizId, data.studentId, data.studentNisn, data.id || data.resultId);
      if (rowIdx > -1) {
        const headers = resSheet.getRange(1, 1, 1, resSheet.getLastColumn()).getValues()[0].map(function(h) { 
          return String(h || '').trim().toLowerCase().replace(/[\s_\-]/g, ''); 
        });
        function setIfDef(colName, val) {
          const idx = headers.indexOf(colName);
          if (idx >= 0 && val !== undefined) resSheet.getRange(rowIdx, idx + 1).setValue(val);
        }
        const d = data.data || data;
        if (d.score !== undefined) setIfDef('score', Number(d.score));
        if (d.finalScore !== undefined) setIfDef('finalscore', Number(d.finalScore));
        if (d.essayScores !== undefined) {
          const esVal = typeof d.essayScores === 'string' ? d.essayScores : JSON.stringify(d.essayScores);
          setIfDef('essayscoresjson', esVal);
        }
        if (d.teacherNote !== undefined) setIfDef('teachernote', String(d.teacherNote));
        if (d.disqualified !== undefined) setIfDef('disqualified', d.disqualified ? 'YA' : 'TIDAK');
        if (d.answers !== undefined) {
          const aVal = typeof d.answers === 'string' ? d.answers : JSON.stringify(d.answers);
          setIfDef('answersjson', aVal);
        }
        return ContentService.createTextOutput(JSON.stringify({ success: true, message: 'Hasil ujian siswa diperbarui di Google Sheet' })).setMimeType(ContentService.MimeType.JSON);
      }
      return ContentService.createTextOutput(JSON.stringify({ success: false, message: 'Hasil ujian tidak ditemukan di Google Sheet' })).setMimeType(ContentService.MimeType.JSON);
    }
    else if (action === 'deleteQuizResult' || action === 'resetStudentQuiz') {
      const qrHeaders = ['id', 'quizId', 'quizTitle', 'subject', 'studentId', 'studentName', 'studentNisn', 'studentClass', 'score', 'finalScore', 'violationsCount', 'answersJson', 'essayScoresJson', 'submittedAt', 'disqualified', 'teacherNote'];
      const resSheet = getOrCreateSheet(ss, 'QuizResults', qrHeaders);
      const rowIdx = findQuizResultRow(resSheet, data.quizId, data.studentId, data.studentNisn, data.id || data.resultId);
      if (rowIdx > -1) {
        resSheet.deleteRow(rowIdx);
        return ContentService.createTextOutput(JSON.stringify({ success: true, message: 'Hasil ujian siswa berhasil dihapus dari Google Sheet' })).setMimeType(ContentService.MimeType.JSON);
      }
      return ContentService.createTextOutput(JSON.stringify({ success: true, message: 'Data hasil kuis tidak ditemukan atau sudah bersih di Google Sheet' })).setMimeType(ContentService.MimeType.JSON);
    }
    else if (action === 'submitAssignment') {
      const asgHeaders = ['id', 'studentId', 'studentName', 'studentNisn', 'studentClass', 'materialId', 'materialTitle', 'subject', 'link', 'fileName', 'fileSize', 'submittedAt', 'grade', 'feedback', 'gradedAt'];
      const asgSheet = getOrCreateSheet(ss, 'Assignments', asgHeaders);
      const rowIdx = findAssignmentRow(asgSheet, data.studentId, data.materialId, data.id);
      
      let existingGrade = '';
      let existingFeedback = '';
      let existingGradedAt = '';
      let existingId = data.id || ('asg-' + new Date().getTime() + '-' + Math.floor(Math.random() * 10000));

      if (rowIdx > -1) {
        const curRow = asgSheet.getRange(rowIdx, 1, 1, asgSheet.getLastColumn()).getValues()[0];
        const headers = asgSheet.getRange(1, 1, 1, asgSheet.getLastColumn()).getValues()[0].map(function(h) { return String(h).trim().toLowerCase(); });
        const gIdx = headers.indexOf('grade');
        const fIdx = headers.indexOf('feedback');
        const gaIdx = headers.indexOf('gradedat');
        const idIdx = headers.indexOf('id');
        if (gIdx >= 0 && curRow[gIdx] !== undefined && curRow[gIdx] !== '') existingGrade = curRow[gIdx];
        if (fIdx >= 0 && curRow[fIdx] !== undefined) existingFeedback = curRow[fIdx];
        if (gaIdx >= 0 && curRow[gaIdx] !== undefined) existingGradedAt = curRow[gaIdx];
        if (idIdx >= 0 && curRow[idIdx]) existingId = curRow[idIdx];
      }

      const rowData = [
        existingId,
        data.studentId || '',
        data.studentName || '',
        data.studentNisn || '',
        data.studentClass || '',
        data.materialId || '',
        data.materialTitle || '',
        data.subject || '',
        data.link || '',
        data.fileName || '',
        data.fileSize || 0,
        data.submittedAt || new Date().toISOString(),
        data.grade !== undefined && data.grade !== null && data.grade !== '' ? data.grade : existingGrade,
        data.feedback !== undefined && data.feedback !== null ? data.feedback : existingFeedback,
        data.gradedAt || existingGradedAt
      ];
      if (rowIdx > -1) {
        asgSheet.getRange(rowIdx, 1, 1, rowData.length).setValues([rowData]);
      } else {
        asgSheet.appendRow(rowData);
      }
      return ContentService.createTextOutput(JSON.stringify({ success: true, message: 'Tugas siswa berhasil disimpan di Google Sheet' })).setMimeType(ContentService.MimeType.JSON);
    }
    else if (action === 'gradeAssignment') {
      const asgHeaders = ['id', 'studentId', 'studentName', 'studentNisn', 'studentClass', 'materialId', 'materialTitle', 'subject', 'link', 'fileName', 'fileSize', 'submittedAt', 'grade', 'feedback', 'gradedAt'];
      const asgSheet = getOrCreateSheet(ss, 'Assignments', asgHeaders);
      const rowIdx = findAssignmentRow(asgSheet, data.studentId, data.materialId, data.id);
      if (rowIdx > -1) {
        const headers = asgSheet.getRange(1, 1, 1, asgSheet.getLastColumn()).getValues()[0].map(function(h) { return String(h).trim().toLowerCase(); });
        const gIdx = headers.indexOf('grade');
        const fIdx = headers.indexOf('feedback');
        const gaIdx = headers.indexOf('gradedat');
        if (gIdx >= 0 && data.grade !== undefined) asgSheet.getRange(rowIdx, gIdx + 1).setValue(Number(data.grade));
        if (fIdx >= 0 && data.feedback !== undefined) asgSheet.getRange(rowIdx, fIdx + 1).setValue(String(data.feedback || ''));
        if (gaIdx >= 0) asgSheet.getRange(rowIdx, gaIdx + 1).setValue(data.gradedAt || new Date().toISOString());
      }
      return ContentService.createTextOutput(JSON.stringify({ success: true, message: 'Nilai tugas siswa berhasil diperbarui di Google Sheet' })).setMimeType(ContentService.MimeType.JSON);
    }
    else if (action === 'markMaterialAsRead') {
      getOrCreateSheet(ss, 'StudentProgress', ['studentId', 'materialId', 'readAt'])
        .appendRow([data.studentId, data.materialId, new Date().toISOString()]);
      return ContentService.createTextOutput(JSON.stringify({ success: true, message: 'Progress materi diperbarui' })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // Ambil Seluruh Data Pengguna (Untuk Browser Baru / Sinkronisasi Offline)
    else if (action === 'getAllUsers') {
      const userSheet = ss.getSheetByName('Users');
      const usersList = [];
      if (userSheet && userSheet.getLastRow() > 1) {
        const rows = userSheet.getDataRange().getValues();
        for (let i = 1; i < rows.length; i++) {
          const [id, rRole, name, gender, subject, username, nik, nisn, classId, assignedClasses, pass] = rows[i];
          if (id) {
            usersList.push({
              id: String(id),
              role: rRole || 'STUDENT',
              name: String(name || ''),
              gender: gender || 'L',
              subject: subject || '',
              username: String(username || ''),
              nik: String(nik || ''),
              nisn: String(nisn || ''),
              classId: String(classId || ''),
              assignedClasses: assignedClasses ? String(assignedClasses).split(',').map(function(s) { return s.trim(); }).filter(Boolean) : [],
              password: String(pass || '')
            });
          }
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ success: true, users: usersList })).setMimeType(ContentService.MimeType.JSON);
    }

    // Ambil Seluruh Data Sistem (Users, Quizzes, Questions, Materials, Results)
    else if (action === 'getAllData') {
      // 1. Users
      const userSheet = ss.getSheetByName('Users');
      const usersList = [];
      if (userSheet && userSheet.getLastRow() > 1) {
        const rows = userSheet.getDataRange().getValues();
        const headers = rows[0].map(function(h) { return String(h || '').trim().toLowerCase().replace(/[\s_\-]/g, ''); });
        const idCol = headers.indexOf('id');
        const roleCol = headers.indexOf('role');
        const nameCol = headers.indexOf('name') >= 0 ? headers.indexOf('name') : headers.indexOf('nama');
        const genderCol = headers.indexOf('gender') >= 0 ? headers.indexOf('gender') : (headers.indexOf('jk') >= 0 ? headers.indexOf('jk') : headers.indexOf('jeniskelamin'));
        const subCol = headers.indexOf('subject') >= 0 ? headers.indexOf('subject') : headers.indexOf('mapel');
        const userCol = headers.indexOf('username');
        const nikCol = headers.indexOf('nik');
        const nisnCol = headers.indexOf('nisn');
        const classCol = headers.indexOf('classid') >= 0 ? headers.indexOf('classid') : headers.indexOf('kelas');
        const assignedCol = headers.indexOf('assignedclasses') >= 0 ? headers.indexOf('assignedclasses') : headers.indexOf('kelasmengajar');
        let passCol = headers.indexOf('password');
        if (passCol < 0) passCol = headers.indexOf('katasandi');
        if (passCol < 0) passCol = headers.indexOf('pass');

        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          const id = idCol >= 0 && row[idCol] ? String(row[idCol]).trim() : String(row[0] || '').trim();
          if (id) {
            const rRole = roleCol >= 0 && row[roleCol] ? String(row[roleCol]).trim() : String(row[1] || 'STUDENT').trim();
            const name = nameCol >= 0 && row[nameCol] ? String(row[nameCol]).trim() : String(row[2] || '').trim();
            const gender = genderCol >= 0 && row[genderCol] ? String(row[genderCol]).trim() : String(row[3] || 'L').trim();
            const subject = subCol >= 0 && row[subCol] ? String(row[subCol]).trim() : String(row[4] || '').trim();
            const username = userCol >= 0 && row[userCol] ? String(row[userCol]).trim() : String(row[5] || '').trim();
            const nik = nikCol >= 0 && row[nikCol] ? String(row[nikCol]).trim() : String(row[6] || '').trim();
            const nisn = nisnCol >= 0 && row[nisnCol] ? String(row[nisnCol]).trim() : String(row[7] || '').trim();
            const classId = classCol >= 0 && row[classCol] ? String(row[classCol]).trim() : String(row[8] || '').trim();
            const assigned = assignedCol >= 0 && row[assignedCol] ? row[assignedCol] : (row[9] || '');
            const pass = passCol >= 0 && row[passCol] !== undefined ? String(row[passCol]).trim() : (row[10] ? String(row[10]).trim() : '');

            usersList.push({
              id: id,
              role: rRole || 'STUDENT',
              name: name,
              gender: gender || 'L',
              subject: subject,
              username: username,
              nik: nik,
              nisn: nisn,
              classId: classId,
              assignedClasses: assigned ? String(assigned).split(',').map(function(s) { return s.trim(); }).filter(Boolean) : [],
              password: pass
            });
          }
        }
      }

      // 2. Quiz Questions
      const qqSheet = ss.getSheetByName('QuizQuestions');
      const questionsByQuiz = {};
      if (qqSheet && qqSheet.getLastRow() > 1) {
        const qRows = qqSheet.getDataRange().getValues();
        const qqHeaders = qRows[0].map(function(h) { return String(h || '').trim().toLowerCase().replace(/[\s_\-]/g, ''); });
        const qIdCol = qqHeaders.indexOf('id');
        const quizIdCol = qqHeaders.indexOf('quizid') >= 0 ? qqHeaders.indexOf('quizid') : qqHeaders.indexOf('idkuis');
        const textCol = qqHeaders.indexOf('text') >= 0 ? qqHeaders.indexOf('text') : (qqHeaders.indexOf('soal') >= 0 ? qqHeaders.indexOf('soal') : qqHeaders.indexOf('tekssoal'));
        const typeCol = qqHeaders.indexOf('type') >= 0 ? qqHeaders.indexOf('type') : (qqHeaders.indexOf('jenissoal') >= 0 ? qqHeaders.indexOf('jenissoal') : qqHeaders.indexOf('tipe'));
        const optACol = qqHeaders.indexOf('optiona') >= 0 ? qqHeaders.indexOf('optiona') : (qqHeaders.indexOf('opsia') >= 0 ? qqHeaders.indexOf('opsia') : qqHeaders.indexOf('pilihana'));
        const optBCol = qqHeaders.indexOf('optionb') >= 0 ? qqHeaders.indexOf('optionb') : (qqHeaders.indexOf('opsib') >= 0 ? qqHeaders.indexOf('opsib') : qqHeaders.indexOf('pilihanb'));
        const optCCol = qqHeaders.indexOf('optionc') >= 0 ? qqHeaders.indexOf('optionc') : (qqHeaders.indexOf('opsic') >= 0 ? qqHeaders.indexOf('opsic') : qqHeaders.indexOf('pilihanc'));
        const optDCol = qqHeaders.indexOf('optiond') >= 0 ? qqHeaders.indexOf('optiond') : (qqHeaders.indexOf('opsid') >= 0 ? qqHeaders.indexOf('opsid') : qqHeaders.indexOf('pilihand'));
        const optECol = qqHeaders.indexOf('optione') >= 0 ? qqHeaders.indexOf('optione') : (qqHeaders.indexOf('opsie') >= 0 ? qqHeaders.indexOf('opsie') : qqHeaders.indexOf('pilihane'));
        const corIdxCol = qqHeaders.indexOf('correctoptionindex') >= 0 ? qqHeaders.indexOf('correctoptionindex') : qqHeaders.indexOf('kunci');
        const corIndicesCol = qqHeaders.indexOf('correctoptionindices') >= 0 ? qqHeaders.indexOf('correctoptionindices') : qqHeaders.indexOf('kuncikompleks');
        const sampleAnsCol = qqHeaders.indexOf('sampleanswer') >= 0 ? qqHeaders.indexOf('sampleanswer') : (qqHeaders.indexOf('kunciessai') >= 0 ? qqHeaders.indexOf('kunciessai') : qqHeaders.indexOf('rubrik'));
        const optImgsCol = qqHeaders.indexOf('optionimagesjson') >= 0 ? qqHeaders.indexOf('optionimagesjson') : qqHeaders.indexOf('gambarpilihan');
        const ptsCol = qqHeaders.indexOf('points') >= 0 ? qqHeaders.indexOf('points') : (qqHeaders.indexOf('poin') >= 0 ? qqHeaders.indexOf('poin') : qqHeaders.indexOf('bobot'));
        const imgCol = qqHeaders.indexOf('imageurl') >= 0 ? qqHeaders.indexOf('imageurl') : qqHeaders.indexOf('linkgambar');
        const vidCol = qqHeaders.indexOf('videourl') >= 0 ? qqHeaders.indexOf('videourl') : qqHeaders.indexOf('linkvideo');
        const audCol = qqHeaders.indexOf('audiourl') >= 0 ? qqHeaders.indexOf('audiourl') : qqHeaders.indexOf('linkaudio');
        const expCol = qqHeaders.indexOf('explanation') >= 0 ? qqHeaders.indexOf('explanation') : qqHeaders.indexOf('pembahasan');

        for (let i = 1; i < qRows.length; i++) {
          const row = qRows[i];
          const quizId = quizIdCol >= 0 && row[quizIdCol] ? String(row[quizIdCol]).trim() : String(row[1] || '').trim();
          if (quizId) {
            if (!questionsByQuiz[quizId]) questionsByQuiz[quizId] = [];
            const optA = optACol >= 0 ? row[optACol] : row[5];
            const optB = optBCol >= 0 ? row[optBCol] : row[6];
            const optC = optCCol >= 0 ? row[optCCol] : row[7];
            const optD = optDCol >= 0 ? row[optDCol] : row[8];
            const optE = optECol >= 0 ? row[optECol] : row[9];
            const opts = [optA, optB, optC, optD];
            if (optE) opts.push(optE);

            let parsedType = typeCol >= 0 && row[typeCol] ? String(row[typeCol]).toUpperCase().trim() : '';
            let parsedCorrectIndices = [];
            const rawCorIndices = corIndicesCol >= 0 ? row[corIndicesCol] : '';
            if (rawCorIndices !== undefined && rawCorIndices !== null && String(rawCorIndices).trim() !== '') {
              try {
                const ci = typeof rawCorIndices === 'string' ? JSON.parse(rawCorIndices) : rawCorIndices;
                if (Array.isArray(ci)) parsedCorrectIndices = ci.map(Number);
              } catch (e) {
                // If stored as "0, 1, 2" or "A, B, C" or "0,2"
                const str = String(rawCorIndices).replace(/[\[\]]/g, '').trim();
                if (str) {
                  const parts = str.split(/[,;\s]+/).filter(Boolean);
                  parsedCorrectIndices = parts.map(function(p) {
                    const upper = p.trim().toUpperCase();
                    if (/^[A-E]$/.test(upper)) return upper.charCodeAt(0) - 65;
                    const num = parseInt(p.trim(), 10);
                    return isNaN(num) ? 0 : num;
                  });
                }
              }
            }

            let parsedOptionImages = [];
            if (optImgsCol >= 0 && row[optImgsCol]) {
              try {
                const oi = typeof row[optImgsCol] === 'string' ? JSON.parse(row[optImgsCol]) : row[optImgsCol];
                if (Array.isArray(oi)) parsedOptionImages = oi.map(String);
              } catch (e) {}
            }

            const sampleAns = sampleAnsCol >= 0 && row[sampleAnsCol] ? String(row[sampleAnsCol]) : undefined;
            if (parsedCorrectIndices.length > 1 || parsedType === 'MCMA' || parsedType === 'KOMPLEKS' || parsedType === 'PGK') {
              parsedType = 'MCMA';
            } else if (sampleAns || parsedType === 'ESSAY' || parsedType === 'URAIAN') {
              parsedType = 'ESSAY';
            } else {
              parsedType = 'SINGLE';
            }

            const qObj = {
              id: qIdCol >= 0 && row[qIdCol] ? String(row[qIdCol]) : String(row[0] || ('q-' + i)),
              text: textCol >= 0 && row[textCol] ? String(row[textCol]) : String(row[4] || ''),
              type: parsedType,
              options: parsedType === 'ESSAY' ? [] : opts.map(String),
              correctOptionIndex: corIdxCol >= 0 && !isNaN(Number(row[corIdxCol])) ? Number(row[corIdxCol]) : (Number(row[10]) || 0),
              points: ptsCol >= 0 && !isNaN(Number(row[ptsCol])) ? Number(row[ptsCol]) : (Number(row[11]) || 10),
              imageUrl: (imgCol >= 0 && row[imgCol]) ? String(row[imgCol]) : (row[12] ? String(row[12]) : undefined),
              videoUrl: (vidCol >= 0 && row[vidCol]) ? String(row[vidCol]) : (row[13] ? String(row[13]) : undefined),
              audioUrl: (audCol >= 0 && row[audCol]) ? String(row[audCol]) : (row[14] ? String(row[14]) : undefined),
              explanation: (expCol >= 0 && row[expCol]) ? String(row[expCol]) : (row[15] ? String(row[15]) : undefined)
            };
            if (parsedCorrectIndices.length > 0) qObj.correctOptionIndices = parsedCorrectIndices;
            if (sampleAns) qObj.sampleAnswer = sampleAns;
            if (parsedOptionImages.length > 0) qObj.optionImages = parsedOptionImages;

            questionsByQuiz[quizId].push(qObj);
          }
        }
      }

      // 3. Quizzes
      const quizSheet = ss.getSheetByName('Quizzes');
      const quizzesList = [];
      if (quizSheet && quizSheet.getLastRow() > 1) {
        const qzRows = quizSheet.getDataRange().getValues();
        const headers = qzRows[0].map(function(h) { return String(h || '').trim().toLowerCase().replace(/[\s_\-]/g, ''); });
        const idCol = headers.indexOf('id');
        const matCol = headers.indexOf('materialid');
        const clsCol = headers.indexOf('classid') >= 0 ? headers.indexOf('classid') : headers.indexOf('kelas');
        const subCol = headers.indexOf('subjectid') >= 0 ? headers.indexOf('subjectid') : headers.indexOf('mapel');
        const titleCol = headers.indexOf('title') >= 0 ? headers.indexOf('title') : headers.indexOf('judul');
        const durCol = headers.indexOf('durationminutes') >= 0 ? headers.indexOf('durationminutes') : headers.indexOf('durasi');
        const schedCol = headers.indexOf('isscheduled') >= 0 ? headers.indexOf('isscheduled') : headers.indexOf('terjadwal');
        const startCol = headers.indexOf('starttime') >= 0 ? headers.indexOf('starttime') : headers.indexOf('waktumulai');
        const endCol = headers.indexOf('endtime') >= 0 ? headers.indexOf('endtime') : headers.indexOf('waktuselesai');
        const qJsonCol = headers.indexOf('questionsjson');
        const crCol = headers.indexOf('createdat');

        for (let i = 1; i < qzRows.length; i++) {
          const row = qzRows[i];
          const id = idCol >= 0 && row[idCol] ? String(row[idCol]).trim() : String(row[0] || '').trim();
          if (id) {
            const rawSched = schedCol >= 0 ? row[schedCol] : row[6];
            const rawStart = startCol >= 0 ? row[startCol] : row[7];
            const rawEnd = endCol >= 0 ? row[endCol] : row[8];
            const cleanStart = rawStart ? formatGasDate(rawStart) : '';
            const cleanEnd = rawEnd ? formatGasDate(rawEnd) : '';

            const rawSchedStr = String(rawSched || '').toUpperCase().trim();
            const isExplicitFalse = rawSchedStr === 'FALSE' || rawSchedStr === 'TIDAK' || rawSchedStr === 'SALAH' || rawSchedStr === '0';
            const isExplicitTrue = rawSchedStr === 'TRUE' || rawSchedStr === 'YA' || rawSchedStr === 'BENAR' || rawSchedStr === '1' || rawSched === true;

            const isSched = isExplicitFalse ? false : (isExplicitTrue || Boolean(cleanStart && cleanStart.trim() !== ''));

            let questions = [];
            // Prioritas 1: Ambil butir soal dari sub-sheet QuizQuestions (paling mutakhir dan lengkap)
            if (questionsByQuiz[id] && questionsByQuiz[id].length > 0) {
              questions = questionsByQuiz[id];
            } else {
              const rawQJson = qJsonCol >= 0 ? row[qJsonCol] : row[10];
              if (rawQJson) {
                try {
                  const parsed = typeof rawQJson === 'string' ? JSON.parse(rawQJson) : rawQJson;
                  if (Array.isArray(parsed) && parsed.length > 0) {
                    questions = parsed.map(function(q, qIdx) {
                      const opts = Array.isArray(q.options) ? q.options : [];
                      const optImgs = Array.isArray(q.optionImages) ? q.optionImages : [];
                      const rawCi = q.correctOptionIndices;
                      let corIndices = [];
                      if (Array.isArray(rawCi)) {
                        corIndices = rawCi.map(Number);
                      } else if (typeof rawCi === 'string' && rawCi.trim()) {
                        try {
                          const p = JSON.parse(rawCi);
                          if (Array.isArray(p)) corIndices = p.map(Number);
                        } catch (e) {
                          const parts = rawCi.replace(/[\[\]]/g, '').split(/[,;\s]+/).filter(Boolean);
                          corIndices = parts.map(function(x) {
                            const u = x.trim().toUpperCase();
                            if (/^[A-E]$/.test(u)) return u.charCodeAt(0) - 65;
                            const n = parseInt(x.trim(), 10);
                            return isNaN(n) ? 0 : n;
                          });
                        }
                      }
                      const sAns = q.sampleAnswer || '';
                      const hasOptText = opts.some(function(o) { return String(o || '').trim() !== ''; });
                      const hasOptImg = optImgs.some(function(img) { return String(img || '').trim() !== ''; });
                      const infType = (sAns && String(sAns).trim() !== '') || (!hasOptText && !hasOptImg)
                        ? 'ESSAY'
                        : (corIndices.length > 1 || q.type === 'MCMA' || q.type === 'KOMPLEKS' || q.type === 'PGK')
                        ? 'MCMA'
                        : (q.type || 'SINGLE');
                      return {
                        id: q.id || ('q-' + (qIdx + 1)),
                        text: q.text || '',
                        type: infType,
                        options: infType === 'ESSAY' ? [] : opts,
                        optionImages: infType === 'ESSAY' ? [] : optImgs,
                        correctOptionIndex: q.correctOptionIndex !== undefined ? q.correctOptionIndex : 0,
                        correctOptionIndices: corIndices,
                        sampleAnswer: sAns,
                        points: q.points !== undefined ? Number(q.points) : 10,
                        imageUrl: q.imageUrl || undefined,
                        videoUrl: q.videoUrl || undefined,
                        audioUrl: q.audioUrl || undefined,
                        explanation: q.explanation || undefined
                      };
                    });
                  }
                } catch (e) {}
              }
            }

            quizzesList.push({
              id: id,
              materialId: matCol >= 0 && row[matCol] ? String(row[matCol]) : String(row[1] || ''),
              classId: clsCol >= 0 && row[clsCol] ? String(row[clsCol]) : String(row[2] || ''),
              subjectId: subCol >= 0 && row[subCol] ? String(row[subCol]) : String(row[3] || ''),
              title: titleCol >= 0 && row[titleCol] ? String(row[titleCol]) : String(row[4] || ''),
              durationMinutes: Number(durCol >= 0 ? row[durCol] : row[5]) || 45,
              isScheduled: isSched,
              startTime: isSched ? cleanStart : '',
              endTime: isSched ? cleanEnd : '',
              questions: questions,
              createdAt: String((crCol >= 0 ? row[crCol] : row[11]) || new Date().toISOString())
            });
          }
        }
      }

      // 4. Materials
      const matSheet = ss.getSheetByName('Materials');
      const materialsList = [];
      if (matSheet && matSheet.getLastRow() > 1) {
        const mRows = matSheet.getDataRange().getValues();
        const headers = mRows[0].map(function(h) { return String(h).trim().toLowerCase(); });
        const idCol = headers.indexOf('id');
        const cidCol = headers.indexOf('classid');
        const tcCol = headers.indexOf('targetclasses');
        const subCol = headers.indexOf('subjectid');
        const tidCol = headers.indexOf('teacherid');
        const tnameCol = headers.indexOf('teachername');
        const titleCol = headers.indexOf('title');
        const contentCol = headers.indexOf('content');
        const typeCol = headers.indexOf('type');
        const urlCol = headers.indexOf('url');
        const chCol = headers.indexOf('chapter');
        const ordCol = headers.indexOf('order');
        const semCol = headers.indexOf('semester');
        const crCol = headers.indexOf('createdat');
        const hasAsgCol = headers.indexOf('hasassignment');
        const asgTitleCol = headers.indexOf('assignmenttitle');
        const asgInstCol = headers.indexOf('assignmentinstructions');
        const asgDueCol = headers.indexOf('assignmentduedate');

        for (let i = 1; i < mRows.length; i++) {
          const row = mRows[i];
          const mId = idCol >= 0 ? String(row[idCol] || '') : String(row[0] || '');
          if (mId) {
            const rawUrl = urlCol >= 0 ? String(row[urlCol] || '') : String(row[7] || '');
            const rawType = (typeCol >= 0 && row[typeCol]) ? String(row[typeCol]) : 'LINK';
            const rawHasAsg = hasAsgCol >= 0 ? String(row[hasAsgCol]).toUpperCase() === 'TRUE' : String(row[12]).toUpperCase() === 'TRUE';
            const rawTargetClasses = tcCol >= 0 && row[tcCol] ? String(row[tcCol]).split(',').map(function(s) { return s.trim(); }).filter(Boolean) : undefined;
            const cid = cidCol >= 0 ? String(row[cidCol] || '') : String(row[1] || '');

            materialsList.push({
              id: mId,
              classId: cid,
              targetClasses: rawTargetClasses || (cid ? cid.split(',').map(function(s) { return s.trim(); }).filter(Boolean) : undefined),
              subjectId: subCol >= 0 ? String(row[subCol] || '') : String(row[2] || ''),
              teacherId: tidCol >= 0 ? String(row[tidCol] || '') : String(row[3] || ''),
              teacherName: tnameCol >= 0 && row[tnameCol] ? String(row[tnameCol]) : undefined,
              title: titleCol >= 0 ? String(row[titleCol] || '') : String(row[4] || ''),
              content: contentCol >= 0 ? String(row[contentCol] || '') : String(row[5] || ''),
              type: rawType,
              linkUrl: rawType === 'LINK' ? rawUrl : undefined,
              pdfUrl: rawType === 'PDF' ? rawUrl : undefined,
              youtubeUrl: rawType === 'VIDEO' ? rawUrl : undefined,
              chapter: chCol >= 0 ? String(row[chCol] || '') : String(row[8] || ''),
              order: ordCol >= 0 ? Number(row[ordCol]) || 1 : Number(row[9]) || 1,
              semester: semCol >= 0 ? Number(row[semCol]) || 1 : Number(row[10]) || 1,
              createdAt: crCol >= 0 && row[crCol] ? String(row[crCol]) : (row[11] ? String(row[11]) : new Date().toISOString()),
              hasAssignment: rawHasAsg,
              assignmentTitle: asgTitleCol >= 0 && row[asgTitleCol] ? String(row[asgTitleCol]) : (row[13] ? String(row[13]) : undefined),
              assignmentInstructions: asgInstCol >= 0 && row[asgInstCol] ? String(row[asgInstCol]) : (row[14] ? String(row[14]) : undefined),
              assignmentDueDate: asgDueCol >= 0 && row[asgDueCol] ? String(row[asgDueCol]) : (row[15] ? String(row[15]) : undefined)
            });
          }
        }
      }

      // 5. Quiz Results
      const qrSheet = ss.getSheetByName('QuizResults');
      const quizResultsList = [];
      if (qrSheet && qrSheet.getLastRow() > 1) {
        const qrRows = qrSheet.getDataRange().getValues();
        const headers = qrRows[0].map(function(h) { return String(h || '').trim().toLowerCase().replace(/[\s_\-]/g, ''); });
        const idCol = headers.indexOf('id');
        const qidCol = headers.indexOf('quizid') >= 0 ? headers.indexOf('quizid') : headers.indexOf('idkuis');
        const qtitleCol = headers.indexOf('quiztitle') >= 0 ? headers.indexOf('quiztitle') : headers.indexOf('judulkuis');
        const subjCol = headers.indexOf('subject') >= 0 ? headers.indexOf('subject') : headers.indexOf('mapel');
        const sidCol = headers.indexOf('studentid') >= 0 ? headers.indexOf('studentid') : headers.indexOf('idsiswa');
        const snameCol = headers.indexOf('studentname') >= 0 ? headers.indexOf('studentname') : (headers.indexOf('nama') >= 0 ? headers.indexOf('nama') : headers.indexOf('namasiswa'));
        const snisnCol = headers.indexOf('studentnisn') >= 0 ? headers.indexOf('studentnisn') : headers.indexOf('nisn');
        const sclassCol = headers.indexOf('studentclass') >= 0 ? headers.indexOf('studentclass') : headers.indexOf('kelas');
        const scoreCol = headers.indexOf('score') >= 0 ? headers.indexOf('score') : headers.indexOf('nilai');
        const fscoreCol = headers.indexOf('finalscore') >= 0 ? headers.indexOf('finalscore') : headers.indexOf('nilaiakhir');
        const violCol = headers.indexOf('violationscount') >= 0 ? headers.indexOf('violationscount') : headers.indexOf('pelanggaran');
        const ansCol = headers.indexOf('answersjson') >= 0 ? headers.indexOf('answersjson') : headers.indexOf('jawaban');
        const subAtCol = headers.indexOf('submittedat') >= 0 ? headers.indexOf('submittedat') : headers.indexOf('waktusubmit');
        const disqCol = headers.indexOf('disqualified') >= 0 ? headers.indexOf('disqualified') : headers.indexOf('didiskualifikasi');
        const noteCol = headers.indexOf('teachernote') >= 0 ? headers.indexOf('teachernote') : headers.indexOf('catatan');
        const essayCol = headers.indexOf('essayscoresjson') >= 0 ? headers.indexOf('essayscoresjson') : (headers.indexOf('nilaiessai') >= 0 ? headers.indexOf('nilaiessai') : headers.indexOf('essayscores'));

        for (let i = 1; i < qrRows.length; i++) {
          const row = qrRows[i];
          const id = idCol >= 0 && row[idCol] ? String(row[idCol]) : String(row[0] || '');
          const quizId = qidCol >= 0 && row[qidCol] ? String(row[qidCol]) : String(row[1] || '');
          const studentId = sidCol >= 0 && row[sidCol] ? String(row[sidCol]) : (snisnCol >= 0 && row[snisnCol] ? String(row[snisnCol]) : String(row[4] || ''));
          if (quizId && (studentId || id)) {
            let parsedAnswers = {};
            const rawAns = ansCol >= 0 ? row[ansCol] : '';
            if (rawAns) {
              try { parsedAnswers = typeof rawAns === 'string' ? JSON.parse(rawAns) : rawAns; } catch (e) {}
            }
            let parsedEssayScores = {};
            const rawEssay = essayCol >= 0 ? row[essayCol] : '';
            if (rawEssay) {
              try { parsedEssayScores = typeof rawEssay === 'string' ? JSON.parse(rawEssay) : rawEssay; } catch (e) {}
            }
            const rawScore = scoreCol >= 0 ? row[scoreCol] : row[8];
            const rawFscore = fscoreCol >= 0 ? row[fscoreCol] : row[9];
            const sc = (rawScore !== '' && rawScore !== null && !isNaN(Number(rawScore))) ? Number(rawScore) : 0;
            const fsc = (rawFscore !== '' && rawFscore !== null && !isNaN(Number(rawFscore))) ? Number(rawFscore) : sc;
            const isDisq = disqCol >= 0 ? (String(row[disqCol]).toUpperCase() === 'YA' || String(row[disqCol]).toUpperCase() === 'TRUE') : false;

            quizResultsList.push({
              id: id || ('qr-' + quizId + '-' + studentId),
              quizId: String(quizId),
              quizTitle: qtitleCol >= 0 && row[qtitleCol] ? String(row[qtitleCol]) : undefined,
              subject: subjCol >= 0 && row[subjCol] ? String(row[subjCol]) : undefined,
              studentId: String(studentId),
              studentName: snameCol >= 0 && row[snameCol] ? String(row[snameCol]) : undefined,
              studentNisn: snisnCol >= 0 && row[snisnCol] ? String(row[snisnCol]) : undefined,
              studentClass: sclassCol >= 0 && row[sclassCol] ? String(row[sclassCol]) : undefined,
              score: sc,
              finalScore: fsc,
              violationsCount: violCol >= 0 && !isNaN(Number(row[violCol])) ? Number(row[violCol]) : 0,
              answers: parsedAnswers,
              essayScores: parsedEssayScores,
              submittedAt: subAtCol >= 0 && row[subAtCol] ? String(row[subAtCol]) : new Date().toISOString(),
              disqualified: isDisq,
              teacherNote: noteCol >= 0 && row[noteCol] ? String(row[noteCol]) : undefined
            });
          }
        }
      }

      // 6. Assignments
      const asgSheet = ss.getSheetByName('Assignments');
      const assignmentsList = [];
      if (asgSheet && asgSheet.getLastRow() > 1) {
        const asgRows = asgSheet.getDataRange().getValues();
        const headers = asgRows[0].map(function(h) { return String(h).trim().toLowerCase(); });
        const idCol = headers.indexOf('id');
        const sidCol = headers.indexOf('studentid');
        const snameCol = headers.indexOf('studentname');
        const snisnCol = headers.indexOf('studentnisn');
        const sclassCol = headers.indexOf('studentclass');
        const midCol = headers.indexOf('materialid');
        const mtitleCol = headers.indexOf('materialtitle');
        const subjCol = headers.indexOf('subject');
        const linkCol = headers.indexOf('link');
        const fileCol = headers.indexOf('filename');
        const sizeCol = headers.indexOf('filesize');
        const subAtCol = headers.indexOf('submittedat');
        const gradeCol = headers.indexOf('grade');
        const feedCol = headers.indexOf('feedback');
        const gradedAtCol = headers.indexOf('gradedat');

        for (let i = 1; i < asgRows.length; i++) {
          const row = asgRows[i];
          const studentId = sidCol >= 0 ? String(row[sidCol] || '') : String(row[0] || '');
          const materialId = midCol >= 0 ? String(row[midCol] || '') : String(row[1] || '');
          if (studentId && materialId) {
            const rawGrade = gradeCol >= 0 ? row[gradeCol] : '';
            assignmentsList.push({
              id: idCol >= 0 && row[idCol] ? String(row[idCol]) : ('asg-' + studentId + '-' + materialId),
              studentId: String(studentId),
              studentName: snameCol >= 0 && row[snameCol] ? String(row[snameCol]) : undefined,
              studentNisn: snisnCol >= 0 && row[snisnCol] ? String(row[snisnCol]) : undefined,
              studentClass: sclassCol >= 0 && row[sclassCol] ? String(row[sclassCol]) : undefined,
              materialId: String(materialId),
              materialTitle: mtitleCol >= 0 && row[mtitleCol] ? String(row[mtitleCol]) : undefined,
              subject: subjCol >= 0 && row[subjCol] ? String(row[subjCol]) : undefined,
              link: linkCol >= 0 ? String(row[linkCol] || '') : String(row[2] || ''),
              fileName: fileCol >= 0 && row[fileCol] ? String(row[fileCol]) : undefined,
              fileSize: sizeCol >= 0 && Number(row[sizeCol]) ? Number(row[sizeCol]) : undefined,
              submittedAt: subAtCol >= 0 && row[subAtCol] ? String(row[subAtCol]) : (row[3] ? String(row[3]) : new Date().toISOString()),
              grade: rawGrade !== '' && rawGrade !== null && !isNaN(Number(rawGrade)) ? Number(rawGrade) : undefined,
              feedback: feedCol >= 0 && row[feedCol] ? String(row[feedCol]) : undefined,
              gradedAt: gradedAtCol >= 0 && row[gradedAtCol] ? String(row[gradedAtCol]) : undefined
            });
          }
        }
      }

      return ContentService.createTextOutput(JSON.stringify({ 
        success: true, 
        users: usersList, 
        quizzes: quizzesList, 
        materials: materialsList,
        quizResults: quizResultsList,
        assignments: assignmentsList
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // Sinkronisasi Massal Seluruh Data (Users, Quizzes, Questions, Materials, Assignments, Results)
    else if (action === 'syncAllData') {
      // 1. Users
      if (data.users && Array.isArray(data.users)) {
        const uSheet = getOrCreateSheet(ss, 'Users', ['id', 'role', 'name', 'gender', 'subject', 'username', 'nik', 'nisn', 'classId', 'assignedClasses', 'password']);
        if (uSheet.getLastRow() > 1) {
          uSheet.deleteRows(2, uSheet.getLastRow() - 1);
        }
        if (data.users.length > 0) {
          const userRows = data.users.map(function(u) {
            const pass = u.password || (u.role === 'TEACHER' ? u.nik : (u.role === 'STUDENT' ? u.nisn : (u.nik || u.username)));
            const assigned = Array.isArray(u.assignedClasses) ? u.assignedClasses.join(',') : (u.assignedClasses || '');
            return [
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
            ];
          });
          uSheet.getRange(2, 1, userRows.length, userRows[0].length).setValues(userRows);
        }
      }
      // 2. Quizzes & QuizQuestions
      if (data.quizzes && Array.isArray(data.quizzes)) {
        const qSheet = getOrCreateSheet(ss, 'Quizzes', ['id', 'materialId', 'classId', 'subjectId', 'title', 'durationMinutes', 'isScheduled', 'startTime', 'endTime', 'totalQuestions', 'questionsJson', 'createdAt']);
        if (qSheet.getLastRow() > 1) {
          qSheet.deleteRows(2, qSheet.getLastRow() - 1);
        }
        const qqSheet = getOrCreateSheet(ss, 'QuizQuestions', ['id', 'quizId', 'quizTitle', 'questionNumber', 'text', 'type', 'optionA', 'optionB', 'optionC', 'optionD', 'optionE', 'correctOptionIndex', 'correctOptionIndices', 'sampleAnswer', 'optionImagesJson', 'points', 'imageUrl', 'videoUrl', 'audioUrl', 'explanation', 'createdAt']);
        if (qqSheet.getLastRow() > 1) {
          qqSheet.deleteRows(2, qqSheet.getLastRow() - 1);
        }
        data.quizzes.forEach(function(quiz) {
          saveOrUpdateQuiz(ss, quiz, true);
        });
      }
      // 3. Materials
      if (data.materials && Array.isArray(data.materials)) {
        const mHeaders = ['id', 'classId', 'targetClasses', 'subjectId', 'teacherId', 'teacherName', 'title', 'content', 'type', 'url', 'chapter', 'order', 'semester', 'createdAt', 'hasAssignment', 'assignmentTitle', 'assignmentInstructions', 'assignmentDueDate'];
        const mSheet = getOrCreateSheet(ss, 'Materials', mHeaders);
        if (mSheet.getLastRow() > 1) {
          mSheet.deleteRows(2, mSheet.getLastRow() - 1);
        }
        if (data.materials.length > 0) {
          const matRows = data.materials.map(function(m) {
            const url = m.pdfUrl || m.youtubeUrl || m.linkUrl || '';
            const targetClasses = Array.isArray(m.targetClasses) ? m.targetClasses.join(', ') : (m.targetClasses || m.classId || '');
            return [
              m.id,
              m.classId || '',
              targetClasses,
              m.subjectId || '',
              m.teacherId || '',
              m.teacherName || '',
              m.title || '',
              m.content || '',
              m.type || 'LINK',
              url,
              m.chapter || '',
              m.order || 1,
              m.semester || 1,
              m.createdAt || new Date().toISOString(),
              m.hasAssignment ? 'TRUE' : 'FALSE',
              m.assignmentTitle || '',
              m.assignmentInstructions || '',
              m.assignmentDueDate || ''
            ];
          });
          mSheet.getRange(2, 1, matRows.length, matRows[0].length).setValues(matRows);
        }
      }
      // 4. QuizResults (Safe Upsert - Nilai ujian siswa TIDAK BOLEH terhapus saat sinkronisasi jadwal atau data lain)
      if (data.quizResults && Array.isArray(data.quizResults) && data.quizResults.length > 0) {
        const qrHeaders = ['id', 'quizId', 'quizTitle', 'subject', 'studentId', 'studentName', 'studentNisn', 'studentClass', 'score', 'finalScore', 'violationsCount', 'answersJson', 'essayScoresJson', 'submittedAt', 'disqualified', 'teacherNote'];
        const qrSheet = getOrCreateSheet(ss, 'QuizResults', qrHeaders);
        const headers = qrSheet.getRange(1, 1, 1, qrSheet.getLastColumn()).getValues()[0].map(function(h) { return String(h).trim().toLowerCase(); });
        
        const qidCol = headers.indexOf('quizid');
        const sidCol = headers.indexOf('studentid');
        const nisnCol = headers.indexOf('studentnisn');
        const idCol = headers.indexOf('id');
        
        const lastRow = qrSheet.getLastRow();
        const existingData = lastRow > 1 ? qrSheet.getRange(2, 1, lastRow - 1, qrSheet.getLastColumn()).getValues() : [];
        
        data.quizResults.forEach(function(r) {
          if (!r || !r.quizId) return;
          const rId = String(r.id || '').trim();
          const rQuizId = String(r.quizId || '').trim();
          const rStudentId = String(r.studentId || '').trim();
          const rNisn = String(r.studentNisn || '').trim();
          
          let targetRowIdx = -1;
          for (let i = 0; i < existingData.length; i++) {
            const exId = idCol >= 0 ? String(existingData[i][idCol] || '').trim() : '';
            const exQid = qidCol >= 0 ? String(existingData[i][qidCol] || '').trim() : '';
            const exSid = sidCol >= 0 ? String(existingData[i][sidCol] || '').trim() : '';
            const exNisn = nisnCol >= 0 ? String(existingData[i][nisnCol] || '').trim() : '';
            
            if (rId && exId && rId === exId) {
              targetRowIdx = i + 2;
              break;
            }
            if (exQid === rQuizId && ((rStudentId && exSid === rStudentId) || (rNisn && (exSid === rNisn || exNisn === rNisn)))) {
              targetRowIdx = i + 2;
              break;
            }
          }
          
          const essayVal = r.essayScores ? (typeof r.essayScores === 'string' ? r.essayScores : JSON.stringify(r.essayScores)) : '{}';
          const valMap = {
            'id': r.id || ('qr-' + (r.quizId || 'q') + '-' + (r.studentId || 's')),
            'quizid': r.quizId || '',
            'quiztitle': r.quizTitle || '',
            'subject': r.subject || '',
            'studentid': r.studentId || '',
            'studentname': r.studentName || '',
            'studentnisn': r.studentNisn || '',
            'studentclass': r.studentClass || '',
            'score': r.score !== undefined ? Number(r.score) : 0,
            'finalscore': r.finalScore !== undefined ? Number(r.finalScore) : (r.score !== undefined ? Number(r.score) : 0),
            'violationscount': Number(r.violationsCount || (r.violationLogs ? r.violationLogs.length : 0) || 0),
            'answersjson': typeof r.answers === 'string' ? r.answers : JSON.stringify(r.answers || {}),
            'essayscoresjson': essayVal,
            'nilaiessai': essayVal,
            'submittedat': r.submittedAt || new Date().toISOString(),
            'disqualified': r.disqualified ? 'YA' : 'TIDAK',
            'teachernote': r.teacherNote || ''
          };
          const rowVals = headers.map(function(h) {
            return valMap[h] !== undefined ? valMap[h] : '';
          });
          
          if (targetRowIdx > -1) {
            qrSheet.getRange(targetRowIdx, 1, 1, rowVals.length).setValues([rowVals]);
          } else {
            qrSheet.appendRow(rowVals);
            existingData.push(rowVals);
          }
        });
      }
      // 5. Assignments
      if (data.assignments && Array.isArray(data.assignments)) {
        const asgHeaders = ['id', 'studentId', 'studentName', 'studentNisn', 'studentClass', 'materialId', 'materialTitle', 'subject', 'link', 'fileName', 'fileSize', 'submittedAt', 'grade', 'feedback', 'gradedAt'];
        const asgSheet = getOrCreateSheet(ss, 'Assignments', asgHeaders);
        if (asgSheet.getLastRow() > 1) {
          asgSheet.deleteRows(2, asgSheet.getLastRow() - 1);
        }
        if (data.assignments.length > 0) {
          const asgRows = data.assignments.map(function(a) {
            return [
              a.id || ('asg-' + a.studentId + '-' + a.materialId),
              a.studentId || '',
              a.studentName || '',
              a.studentNisn || '',
              a.studentClass || '',
              a.materialId || '',
              a.materialTitle || '',
              a.subject || '',
              a.link || '',
              a.fileName || '',
              a.fileSize || 0,
              a.submittedAt || new Date().toISOString(),
              a.grade !== undefined && a.grade !== null ? a.grade : '',
              a.feedback || '',
              a.gradedAt || ''
            ];
          });
          asgSheet.getRange(2, 1, asgRows.length, asgRows[0].length).setValues(asgRows);
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ 
        success: true, 
        message: 'Seluruh data pengguna, kuis, butir soal, materi, dan pengumpulan tugas berhasil disinkronkan ke Google Sheet!' 
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // Clear Database (Super Admin)
    else if (action === 'clearDatabase') {
      const targets = data.targets || [];
      const isAll = targets.indexOf('All') > -1;

      if (isAll || targets.indexOf('Materials') > -1) {
        const sheet = ss.getSheetByName('Materials');
        if (sheet && sheet.getLastRow() > 1) sheet.deleteRows(2, sheet.getLastRow() - 1);
      }
      if (isAll || targets.indexOf('Quizzes') > -1) {
        const sheet = ss.getSheetByName('Quizzes');
        if (sheet && sheet.getLastRow() > 1) sheet.deleteRows(2, sheet.getLastRow() - 1);
        const qqSheet = ss.getSheetByName('QuizQuestions');
        if (qqSheet && qqSheet.getLastRow() > 1) qqSheet.deleteRows(2, qqSheet.getLastRow() - 1);
      }
      if (isAll || targets.indexOf('QuizResults') > -1) {
        const sheet = ss.getSheetByName('QuizResults');
        if (sheet && sheet.getLastRow() > 1) sheet.deleteRows(2, sheet.getLastRow() - 1);
      }
      if (isAll || targets.indexOf('Assignments') > -1) {
        const sheet = ss.getSheetByName('Assignments');
        if (sheet && sheet.getLastRow() > 1) sheet.deleteRows(2, sheet.getLastRow() - 1);
      }
      if (isAll || targets.indexOf('StudentProgress') > -1) {
        const sheet = ss.getSheetByName('StudentProgress');
        if (sheet && sheet.getLastRow() > 1) sheet.deleteRows(2, sheet.getLastRow() - 1);
      }
      const userSheet = ss.getSheetByName('Users');
      if (userSheet && userSheet.getLastRow() > 1) {
        const rows = userSheet.getDataRange().getValues();
        for (let r = rows.length - 1; r >= 1; r--) {
          const role = String(rows[r][1]).trim();
          if (role === 'SUPER_ADMIN') continue;
          let shouldDel = false;
          if (isAll) {
            shouldDel = (role !== 'SUPER_ADMIN');
          } else {
            if (targets.indexOf('Students') > -1 && role === 'STUDENT') shouldDel = true;
            if (targets.indexOf('Teachers') > -1 && role === 'TEACHER') shouldDel = true;
          }
          if (shouldDel) userSheet.deleteRow(r + 1);
        }
      }
    }
    
    return ContentService.createTextOutput(JSON.stringify({ success: true, message: 'Action received and processed' })).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: error.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput("SmartLMS Webhook Active & Ready").setMimeType(ContentService.MimeType.TEXT);
}`;

export default function GASConfig() {
  const { webhookUrl, setWebhookUrl, testConnection, isConnected, executeAction, lastSyncTime, lastSyncSuccess, lastSyncMessage, fetchServerConfig } = useGasStore();
  const { users, quizzes, materials, syncAllToGas, pullAllFromGas, pullAllFromServer, cleanInitialSamples } = useDataStore();
  const [url, setUrl] = useState(webhookUrl);
  const [isTesting, setIsTesting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCleanSamples = async () => {
    if (!isConnected) {
      toast.error('Webhook Google Sheets belum terhubung.');
      return;
    }
    setIsCleaning(true);
    try {
      await cleanInitialSamples();
      toast.success('Data contoh/mock awal di Google Sheet dan server berhasil dibersihkan!');
    } catch (err: any) {
      toast.error('Gagal membersihkan data contoh: ' + (err?.message || err));
    } finally {
      setIsCleaning(false);
    }
  };

  useEffect(() => {
    async function loadServerConfig() {
      const serverUrl = await fetchServerConfig();
      if (serverUrl) {
        setUrl(serverUrl);
        await testConnection().catch(() => {});
      }
    }
    loadServerConfig();
  }, []);

  const totalQuestions = quizzes.reduce((acc, q) => acc + (q.questions?.length || 0), 0);
  const totalStudents = users.filter(u => u.role === 'STUDENT').length;
  const totalTeachers = users.filter(u => u.role === 'TEACHER').length;

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

    // Call server to test & persist centrally
    try {
      await fetch('/api/database/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhookUrl: cleanUrl })
      });
      await pullAllFromServer().catch(() => {});
    } catch (e) {}

    const success = await testConnection();
    if (success) {
      toast.success('Koneksi Webhook Berhasil dan Tersimpan Permanen!');
      pullAllFromServer().catch(() => {});
    } else {
      toast.error('Gagal terhubung ke Webhook. Pastikan URL berakhiran /exec dan akses disetel ke "Anyone" (Siapa saja).');
    }
    setIsTesting(false);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(GENERATED_GAS_CODE);
    setCopied(true);
    toast.success('Kode Google Apps Script berhasil disalin!');
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
        toast.success('Berhasil! Semua tabel (termasuk QuizQuestions) telah dibuat di Google Sheets.');
      } else {
        toast.error('Gagal: ' + (res.error || 'Terjadi kesalahan'));
      }
    } catch (e: any) {
      toast.error('Gagal memproses permintaan: ' + e?.message);
    }
    setIsGenerating(false);
  };

  const handleSyncAllNow = async () => {
    if (!isConnected) {
      toast.error('Webhook Google Sheets belum terhubung. Silakan tes koneksi terlebih dahulu.');
      return;
    }
    setIsSyncingAll(true);
    try {
      const res = await syncAllToGas();
      if (res && res.success) {
        toast.success(`Berhasil! ${users.length} Pengguna, ${quizzes.length} Kuis, dan ${totalQuestions} Butir Soal telah tersimpan ke Google Sheet.`);
      } else {
        toast.error(res?.error || 'Gagal melakukan sinkronisasi ke Google Sheet');
      }
    } catch (err: any) {
      toast.error('Terjadi kesalahan sinkronisasi: ' + err?.message);
    } finally {
      setIsSyncingAll(false);
    }
  };

  const handlePullAllNow = async () => {
    if (!isConnected) {
      toast.error('Webhook Google Sheets belum terhubung. Silakan tes koneksi terlebih dahulu.');
      return;
    }
    setIsPulling(true);
    try {
      const ok = await pullAllFromGas();
      if (ok) {
        const latestUsers = useDataStore.getState().users;
        const latestQuizzes = useDataStore.getState().quizzes;
        const qCount = latestQuizzes.reduce((acc, q) => acc + (q.questions?.length || 0), 0);
        toast.success(`Berhasil! ${latestUsers.length} Pengguna, ${latestQuizzes.length} Kuis, dan ${qCount} Butir Soal berhasil dimuat dari Google Sheet ke browser ini.`);
      } else {
        toast.error('Gagal mengambil data dari Google Sheet. Pastikan spreadsheet memiliki data.');
      }
    } catch (err: any) {
      toast.error('Gagal menarik data: ' + err?.message);
    } finally {
      setIsPulling(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Integrasi Google Sheets (GAS)</h1>
          <p className="text-xs text-slate-500 mt-1">
            Persistensi cloud dua arah untuk data siswa, guru, materi, dan butir soal kuis dengan Google Spreadsheet.
          </p>
        </div>
      </div>

      {/* Sync Status Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-lg">
            {users.length}
          </div>
          <div>
            <div className="text-xs text-slate-500">Pengguna Tersimpan</div>
            <div className="text-sm font-semibold text-slate-800">{totalStudents} Siswa, {totalTeachers} Guru</div>
          </div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-lg">
            {quizzes.length}
          </div>
          <div>
            <div className="text-xs text-slate-500">Kuis & CBT Aktif</div>
            <div className="text-sm font-semibold text-slate-800">{totalQuestions} Butir Soal Siap Ujian</div>
          </div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isConnected ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
            {isConnected ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          </div>
          <div>
            <div className="text-xs text-slate-500">Status Google Sheets</div>
            <div className={`text-sm font-semibold ${isConnected ? 'text-emerald-700' : 'text-rose-700'}`}>
              {isConnected ? 'Terhubung & Aktif' : 'Belum Terhubung'}
            </div>
          </div>
        </div>
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
            Masukkan URL Web App dari Google Apps Script yang telah Anda deploy. Format URL diawali dengan <code>https://script.google.com/macros/s/...</code>
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
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
            <p className="font-semibold text-amber-900">Tips Penting Agar Data Tersimpan Nyata di Google Sheets:</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>Saat <strong>Deploy &gt; New deployment &gt; Web app</strong> di Google Apps Script:</li>
              <li><strong>Execute as:</strong> Pilih <em>Me (email Anda)</em>.</li>
              <li><strong>Who has access:</strong> Wajib pilih <strong><em>Anyone (Siapa saja)</em></strong>.</li>
              <li>Pastikan URL berakhiran <code>/exec</code> (bukan <code>/dev</code>).</li>
              <li>Jika ada pembaruan kode di <code>Code.gs</code>, lakukan <strong>Deploy &gt; Manage deployments &gt; Edit (ikon pensil) &gt; New version &gt; Deploy</strong> agar script Google Sheet memakai versi terbaru!</li>
            </ul>
          </div>

          {isConnected && (
            <div className="space-y-3 bg-emerald-50/70 p-4 rounded-xl border border-emerald-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-emerald-800 text-sm font-semibold">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>Webhook Google Sheet Terhubung dan Aktif</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleGenerateTables} 
                    isLoading={isGenerating}
                    className="border-emerald-300 text-emerald-800 hover:bg-emerald-100 bg-white"
                  >
                    <Database className="w-4 h-4 mr-1.5 text-emerald-600" />
                    Buat / Update Struktur Tabel
                  </Button>
                  <Button 
                    variant="outline"
                    size="sm" 
                    onClick={handlePullAllNow} 
                    isLoading={isPulling}
                    className="border-indigo-300 text-indigo-800 hover:bg-indigo-100 bg-white"
                    title="Tarik seluruh data pengguna, kuis, dan materi dari Google Sheet ke browser ini"
                  >
                    <Download className={`w-4 h-4 mr-1.5 text-indigo-600 ${isPulling ? 'animate-bounce' : ''}`} />
                    Tarik Data dari Google Sheet
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={handleSyncAllNow} 
                    isLoading={isSyncingAll}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs"
                  >
                    <RefreshCw className={`w-4 h-4 mr-1.5 ${isSyncingAll ? 'animate-spin' : ''}`} />
                    Kirim Semua Data ke Google Sheet
                  </Button>
                  <Button 
                    variant="outline"
                    size="sm" 
                    onClick={handleCleanSamples} 
                    isLoading={isCleaning}
                    className="border-amber-300 text-amber-800 hover:bg-amber-100 bg-white"
                    title="Bersihkan data akun contoh, materi contoh, dan kuis contoh dari Google Sheet"
                  >
                    <Trash2 className="w-4 h-4 mr-1.5 text-amber-600" />
                    Bersihkan Data Contoh
                  </Button>
                </div>
              </div>

              {lastSyncTime && (
                <div className="text-[11px] text-emerald-700 flex items-center gap-1.5 pt-1 border-t border-emerald-200/60">
                  <span className="font-semibold">Sinkronisasi terakhir:</span>
                  <span>{new Date(lastSyncTime).toLocaleString('id-ID')}</span>
                  {lastSyncMessage && <span className="text-emerald-800">({lastSyncMessage})</span>}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-indigo-600" />
              Kode Backend Google Apps Script (Code.gs)
            </div>
            <Button variant="outline" size="sm" onClick={handleCopyCode} className="gap-2">
              {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Tersalin' : 'Salin Seluruh Kode'}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600 mb-4">
            Buka spreadsheet Anda di <a href="https://sheets.new" target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline font-semibold">Google Sheets</a> &gt; Menu <strong>Ekstensi (Extensions)</strong> &gt; <strong>Apps Script</strong>. Ganti semua isi berkas <code>Code.gs</code> dengan kode di bawah ini, lalu jalankan fungsi <code>setupAllTables</code> sekali untuk inisialisasi sheet dan super admin. Setelah itu, <strong>Deploy sebagai Web App</strong>.
          </p>
          <div className="relative">
            <pre className="bg-slate-900 text-slate-50 p-4 rounded-lg overflow-x-auto text-xs font-mono leading-relaxed h-[420px]">
              <code>{GENERATED_GAS_CODE}</code>
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

