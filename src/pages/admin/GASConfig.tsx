import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Copy, CheckCircle2, Server, Download, ShieldAlert, Database, RefreshCw, CloudCheck, AlertTriangle } from 'lucide-react';
import { toast } from '@/components/ui/Toast';
import { useGasStore } from '@/store/gasStore';
import { useDataStore } from '@/store/dataStore';

const GENERATED_GAS_CODE = `/**
 * SmartLMS SMP - Google Apps Script Backend (v2 - Full Questions & CBT Sync)
 * Salin dan tempel kode ini ke editor Google Apps Script Anda (Code.gs).
 */

function getOrCreateSheet(ss, name, headers) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  if (sheet.getLastRow() === 0 && headers && headers.length > 0) {
    sheet.appendRow(headers);
  }
  return sheet;
}

function setupAllTables() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheets = {
    'Users': ['id', 'role', 'name', 'gender', 'subject', 'username', 'nik', 'nisn', 'classId', 'assignedClasses', 'password'],
    'Materials': ['id', 'classId', 'subjectId', 'teacherId', 'title', 'content', 'type', 'url', 'chapter', 'order', 'semester', 'createdAt'],
    'Quizzes': ['id', 'materialId', 'classId', 'subjectId', 'title', 'durationMinutes', 'isScheduled', 'startTime', 'endTime', 'totalQuestions', 'questionsJson', 'createdAt'],
    'QuizQuestions': ['id', 'quizId', 'quizTitle', 'questionNumber', 'text', 'optionA', 'optionB', 'optionC', 'optionD', 'optionE', 'correctOptionIndex', 'points', 'imageUrl', 'videoUrl', 'audioUrl', 'explanation', 'createdAt'],
    'QuizResults': ['id', 'quizId', 'studentId', 'score', 'finalScore', 'violationsCount', 'answersJson', 'submittedAt'],
    'Assignments': ['studentId', 'materialId', 'link', 'submittedAt'],
    'StudentProgress': ['studentId', 'materialId', 'readAt']
  };
  
  for (const [name, headers] of Object.entries(sheets)) {
    getOrCreateSheet(ss, name, headers);
  }
  
  initSuperAdminScriptProperties();
  return "Setup Berhasil! Semua Tabel Termasuk Butir Soal Kuis (QuizQuestions) Telah Digenerasi.";
}

function initSuperAdminScriptProperties() {
  const props = PropertiesService.getScriptProperties();
  props.setProperty('SUPER_ADMIN_ID', 'rafx2');
  props.setProperty('SUPER_ADMIN_PASSWORD', 'Asepst007@');
}

function findRowIndex(sheet, idColIndex, idVal) {
  if (!sheet) return -1;
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return -1;
  const data = sheet.getRange(2, idColIndex + 1, lastRow - 1, 1).getValues();
  for (let i = 0; i < data.length; i++) {
    if (String(data[i][0]) === String(idVal)) return i + 2;
  }
  return -1;
}

function saveQuizQuestions(ss, quiz) {
  if (!quiz || !quiz.id) return;
  const qqSheet = getOrCreateSheet(ss, 'QuizQuestions', [
    'id', 'quizId', 'quizTitle', 'questionNumber', 'text', 'optionA', 'optionB', 'optionC', 'optionD', 'optionE', 'correctOptionIndex', 'points', 'imageUrl', 'videoUrl', 'audioUrl', 'explanation', 'createdAt'
  ]);
  
  // Hapus butir soal lama untuk quizId ini
  const lastRow = qqSheet.getLastRow();
  if (lastRow > 1) {
    const data = qqSheet.getRange(2, 2, lastRow - 1, 1).getValues(); // Kolom B adalah quizId
    for (let i = data.length - 1; i >= 0; i--) {
      if (String(data[i][0]) === String(quiz.id)) {
        qqSheet.deleteRow(i + 2);
      }
    }
  }
  
  // Simpan butir soal baru
  const questions = quiz.questions || [];
  if (questions.length > 0) {
    const rows = questions.map(function(q, idx) {
      const opts = Array.isArray(q.options) ? q.options : [];
      return [
        q.id || ('q-' + (idx + 1)),
        quiz.id,
        quiz.title || '',
        idx + 1,
        q.text || '',
        opts[0] || '',
        opts[1] || '',
        opts[2] || '',
        opts[3] || '',
        opts[4] || '',
        q.correctOptionIndex !== undefined ? q.correctOptionIndex : 0,
        q.points || 0,
        q.imageUrl || '',
        q.videoUrl || '',
        q.audioUrl || '',
        q.explanation || '',
        new Date().toISOString()
      ];
    });
    qqSheet.getRange(qqSheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
  }
}

function saveOrUpdateQuiz(ss, quiz) {
  if (!quiz || !quiz.id) return;
  const qSheet = getOrCreateSheet(ss, 'Quizzes', [
    'id', 'materialId', 'classId', 'subjectId', 'title', 'durationMinutes', 'isScheduled', 'startTime', 'endTime', 'totalQuestions', 'questionsJson', 'createdAt'
  ]);
  
  const questions = quiz.questions || [];
  const qRow = [
    quiz.id,
    quiz.materialId || '',
    quiz.classId || '',
    quiz.subjectId || '',
    quiz.title || '',
    quiz.durationMinutes || 45,
    quiz.isScheduled ? 'TRUE' : 'FALSE',
    quiz.startTime || '',
    quiz.endTime || '',
    questions.length,
    JSON.stringify(questions),
    quiz.createdAt || new Date().toISOString()
  ];
  
  const rowIdx = findRowIndex(qSheet, 0, quiz.id);
  if (rowIdx > -1) {
    qSheet.getRange(rowIdx, 1, 1, qRow.length).setValues([qRow]);
  } else {
    qSheet.appendRow(qRow);
  }
  
  // Sinkronkan setiap butir soal ke tabel QuizQuestions
  saveQuizQuestions(ss, quiz);
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
            const passMatched = (rowPass && rowPass === password) || (!rowPass && (password === rowNik || password === '123456')) || (password === rowNik) || (password === '123456');
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
                  assignedClasses: assignedClasses ? String(assignedClasses).split(',').map(function(s) { return s.trim(); }).filter(Boolean) : []
                } 
              })).setMimeType(ContentService.MimeType.JSON);
            }
          } else if (role === 'student' && rowRole === 'STUDENT') {
            const idMatched = (cleanId === rowNisn) || (cleanIdNoZero && cleanIdNoZero === rowNisnNoZero) || (cleanId === rowUser) || (cleanId === String(id));
            const passMatched = (rowPass && rowPass === password) || (!rowPass && (password === rowNisn || password === '123456')) || (password === rowNisn) || (cleanIdNoZero && password === rowNisnNoZero) || (password === '123456');
            if (idMatched && passMatched) {
              return ContentService.createTextOutput(JSON.stringify({ 
                success: true, 
                user: { 
                  id: String(id), 
                  role: 'STUDENT', 
                  name: String(name || ''), 
                  gender: gender || 'L', 
                  nisn: rowNisn, 
                  classId: String(classId || '') 
                } 
              })).setMimeType(ContentService.MimeType.JSON);
            }
          }
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ success: false, message: 'Kredensial tidak valid atau akun belum terdaftar' })).setMimeType(ContentService.MimeType.JSON);
    }

    // CRUD Handlers - Users
    if (action === 'addUser') {
      const u = data.user;
      const pass = u.role === 'TEACHER' ? u.nik : (u.role === 'STUDENT' ? u.nisn : (u.nik || u.username));
      const assigned = Array.isArray(u.assignedClasses) ? u.assignedClasses.join(',') : (u.assignedClasses || '');
      getOrCreateSheet(ss, 'Users', ['id', 'role', 'name', 'gender', 'subject', 'username', 'nik', 'nisn', 'classId', 'assignedClasses', 'password']).appendRow([
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
      const sheet = getOrCreateSheet(ss, 'Users', ['id', 'role', 'name', 'gender', 'subject', 'username', 'nik', 'nisn', 'classId', 'assignedClasses', 'password']);
      if (sheet.getLastRow() > 1) {
        sheet.deleteRows(2, sheet.getLastRow() - 1);
      }
      const userList = data.users || [];
      if (userList.length > 0) {
        const rows = userList.map(function(u) {
          const pass = u.role === 'TEACHER' ? u.nik : (u.role === 'STUDENT' ? u.nisn : (u.nik || u.username));
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
      const existingData = sheet.getLastRow() > 1 ? sheet.getDataRange().getValues() : [];
      
      userList.forEach(function(u) {
        const pass = u.role === 'TEACHER' ? u.nik : (u.role === 'STUDENT' ? u.nisn : (u.nik || u.username));
        const assigned = Array.isArray(u.assignedClasses) ? u.assignedClasses.join(',') : (u.assignedClasses || '');
        
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
        if (u.password !== undefined) sheet.getRange(rowIdx, 11).setValue(u.password);
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

    // CRUD Handlers - Materials
    else if (action === 'addMaterial') {
      const m = data.material;
      const url = m.pdfUrl || m.youtubeUrl || m.linkUrl || '';
      getOrCreateSheet(ss, 'Materials', ['id', 'classId', 'subjectId', 'teacherId', 'title', 'content', 'type', 'url', 'chapter', 'order', 'semester', 'createdAt'])
        .appendRow([m.id, m.classId, m.subjectId, m.teacherId, m.title, m.content || '', m.type, url, m.chapter, m.order, m.semester, m.createdAt]);
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

    // CRUD Handlers - Quizzes & Questions
    else if (action === 'addQuiz' || action === 'saveQuiz') {
      const q = data.quiz;
      saveOrUpdateQuiz(ss, q);
    }
    else if (action === 'updateQuiz') {
      const quiz = data.quiz;
      if (quiz && quiz.id) {
        saveOrUpdateQuiz(ss, quiz);
      } else {
        const sheet = getOrCreateSheet(ss, 'Quizzes', ['id', 'materialId', 'classId', 'subjectId', 'title', 'durationMinutes', 'isScheduled', 'startTime', 'endTime', 'totalQuestions', 'questionsJson', 'createdAt']);
        const rowIdx = findRowIndex(sheet, 0, data.id);
        const q = data.data || {};
        if (rowIdx > -1) {
          if (q.title !== undefined) sheet.getRange(rowIdx, 5).setValue(q.title);
          if (q.durationMinutes !== undefined) sheet.getRange(rowIdx, 6).setValue(q.durationMinutes);
          if (q.isScheduled !== undefined) sheet.getRange(rowIdx, 7).setValue(q.isScheduled ? 'TRUE' : 'FALSE');
          if (q.startTime !== undefined) sheet.getRange(rowIdx, 8).setValue(q.startTime);
          if (q.endTime !== undefined) sheet.getRange(rowIdx, 9).setValue(q.endTime);
          if (q.questions !== undefined) {
            sheet.getRange(rowIdx, 10).setValue(q.questions.length);
            sheet.getRange(rowIdx, 11).setValue(JSON.stringify(q.questions));
            saveQuizQuestions(ss, { id: data.id, title: q.title || '', questions: q.questions });
          }
        }
      }
    }
    else if (action === 'syncQuizQuestions') {
      const quiz = data.quiz;
      if (quiz) {
        saveOrUpdateQuiz(ss, quiz);
      }
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
    }
    else if (action === 'submitQuiz') {
      const r = data.result;
      const resSheet = getOrCreateSheet(ss, 'QuizResults', ['id', 'quizId', 'studentId', 'score', 'finalScore', 'violationsCount', 'answersJson', 'submittedAt']);
      resSheet.appendRow([
        r.id,
        r.quizId,
        r.studentId,
        r.score,
        r.finalScore !== undefined ? r.finalScore : r.score,
        r.violationsCount || 0,
        JSON.stringify(r.answers || {}),
        r.submittedAt || new Date().toISOString()
      ]);
    }
    else if (action === 'submitAssignment') {
      getOrCreateSheet(ss, 'Assignments', ['studentId', 'materialId', 'link', 'submittedAt'])
        .appendRow([data.studentId, data.materialId, data.link, new Date().toISOString()]);
    }
    else if (action === 'markMaterialAsRead') {
      getOrCreateSheet(ss, 'StudentProgress', ['studentId', 'materialId', 'readAt'])
        .appendRow([data.studentId, data.materialId, new Date().toISOString()]);
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

    // Ambil Seluruh Data Sistem (Users, Quizzes, Questions, Materials)
    else if (action === 'getAllData') {
      // 1. Users
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

      // 2. Quiz Questions
      const qqSheet = ss.getSheetByName('QuizQuestions');
      const questionsByQuiz = {};
      if (qqSheet && qqSheet.getLastRow() > 1) {
        const qRows = qqSheet.getDataRange().getValues();
        for (let i = 1; i < qRows.length; i++) {
          const [qId, quizId, qTitle, qNum, qText, optA, optB, optC, optD, optE, correctIdx, points, imgUrl, vidUrl, audUrl, exp] = qRows[i];
          if (quizId) {
            if (!questionsByQuiz[quizId]) questionsByQuiz[quizId] = [];
            const opts = [optA, optB, optC, optD];
            if (optE) opts.push(optE);
            questionsByQuiz[quizId].push({
              id: String(qId),
              text: String(qText || ''),
              options: opts.map(String),
              correctOptionIndex: Number(correctIdx) || 0,
              points: Number(points) || 10,
              imageUrl: imgUrl ? String(imgUrl) : undefined,
              videoUrl: vidUrl ? String(vidUrl) : undefined,
              audioUrl: audUrl ? String(audUrl) : undefined,
              explanation: exp ? String(exp) : undefined
            });
          }
        }
      }

      // 3. Quizzes
      const quizSheet = ss.getSheetByName('Quizzes');
      const quizzesList = [];
      if (quizSheet && quizSheet.getLastRow() > 1) {
        const qzRows = quizSheet.getDataRange().getValues();
        for (let i = 1; i < qzRows.length; i++) {
          const [id, materialId, classId, subjectId, title, durationMinutes, isScheduled, startTime, endTime, totalQuestions, questionsJson, createdAt] = qzRows[i];
          if (id) {
            let questions = questionsByQuiz[id] || [];
            if (questions.length === 0 && questionsJson) {
              try { questions = JSON.parse(questionsJson); } catch (e) {}
            }
            quizzesList.push({
              id: String(id),
              materialId: String(materialId || ''),
              classId: String(classId || ''),
              subjectId: String(subjectId || ''),
              title: String(title || ''),
              durationMinutes: Number(durationMinutes) || 45,
              isScheduled: String(isScheduled).toUpperCase() === 'TRUE',
              startTime: startTime ? String(startTime) : undefined,
              endTime: endTime ? String(endTime) : undefined,
              questions: questions,
              createdAt: String(createdAt || new Date().toISOString())
            });
          }
        }
      }

      // 4. Materials
      const matSheet = ss.getSheetByName('Materials');
      const materialsList = [];
      if (matSheet && matSheet.getLastRow() > 1) {
        const mRows = matSheet.getDataRange().getValues();
        for (let i = 1; i < mRows.length; i++) {
          const [id, classId, subjectId, teacherId, title, content, type, url, chapter, order, semester, createdAt] = mRows[i];
          if (id) {
            materialsList.push({
              id: String(id),
              classId: String(classId || ''),
              subjectId: String(subjectId || ''),
              teacherId: String(teacherId || ''),
              title: String(title || ''),
              content: String(content || ''),
              type: type || 'LINK',
              linkUrl: url ? String(url) : undefined,
              chapter: String(chapter || ''),
              order: Number(order) || 1,
              semester: Number(semester) || 1,
              createdAt: String(createdAt || new Date().toISOString())
            });
          }
        }
      }

      return ContentService.createTextOutput(JSON.stringify({ 
        success: true, 
        users: usersList, 
        quizzes: quizzesList, 
        materials: materialsList 
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // Sinkronisasi Massal Seluruh Data (Users, Quizzes, Questions, Materials)
    else if (action === 'syncAllData') {
      // 1. Users
      if (data.users && Array.isArray(data.users)) {
        const uSheet = getOrCreateSheet(ss, 'Users', ['id', 'role', 'name', 'gender', 'subject', 'username', 'nik', 'nisn', 'classId', 'assignedClasses', 'password']);
        if (uSheet.getLastRow() > 1) {
          uSheet.deleteRows(2, uSheet.getLastRow() - 1);
        }
        if (data.users.length > 0) {
          const userRows = data.users.map(function(u) {
            const pass = u.role === 'TEACHER' ? u.nik : (u.role === 'STUDENT' ? u.nisn : (u.nik || u.username));
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
        const qqSheet = getOrCreateSheet(ss, 'QuizQuestions', ['id', 'quizId', 'quizTitle', 'questionNumber', 'text', 'optionA', 'optionB', 'optionC', 'optionD', 'optionE', 'correctOptionIndex', 'points', 'imageUrl', 'videoUrl', 'audioUrl', 'explanation', 'createdAt']);
        if (qqSheet.getLastRow() > 1) {
          qqSheet.deleteRows(2, qqSheet.getLastRow() - 1);
        }
        data.quizzes.forEach(function(quiz) {
          saveOrUpdateQuiz(ss, quiz);
        });
      }
      return ContentService.createTextOutput(JSON.stringify({ 
        success: true, 
        message: 'Seluruh data pengguna, kuis, dan butir soal berhasil disinkronkan ke Google Sheet!' 
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
  const { users, quizzes, materials, syncAllToGas, pullAllFromGas, pullAllFromServer } = useDataStore();
  const [url, setUrl] = useState(webhookUrl);
  const [isTesting, setIsTesting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [copied, setCopied] = useState(false);

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

