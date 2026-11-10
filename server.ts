import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const portArgIdx = process.argv.indexOf('--port');
const portFromArg = portArgIdx !== -1 && process.argv[portArgIdx + 1] ? Number(process.argv[portArgIdx + 1]) : null;
const PORT = portFromArg || (process.env.NODE_ENV === 'production' ? (Number(process.env.PORT) || 3000) : 3000);

app.use(express.json({ limit: '10mb' }));
app.use(express.text({ limit: '10mb' }));

const dataDir = path.join(__dirname, 'data');
const CONFIG_FILE = path.join(dataDir, 'app-config.json');
const APP_DATA_FILE = path.join(dataDir, 'app-data.json');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

function readConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = fs.readFileSync(CONFIG_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      if (parsed && parsed.webhookUrl && typeof parsed.webhookUrl === 'string' && parsed.webhookUrl.trim()) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Error reading config file:', err);
  }

  // Check APP_DATA_FILE if CONFIG_FILE is empty
  try {
    if (fs.existsSync(APP_DATA_FILE)) {
      const appDataStr = fs.readFileSync(APP_DATA_FILE, 'utf-8');
      const appData = JSON.parse(appDataStr);
      if (appData && appData.webhookUrl && typeof appData.webhookUrl === 'string' && appData.webhookUrl.trim()) {
        return { webhookUrl: appData.webhookUrl.trim() };
      }
    }
  } catch (e) {}

  // Check .env file if CONFIG_FILE is empty
  try {
    const envPath = path.join(__dirname, '.env');
    if (fs.existsSync(envPath)) {
      const envData = fs.readFileSync(envPath, 'utf-8');
      const match = envData.match(/VITE_GAS_WEBHOOK_URL=["']?([^"'\r\n]+)["']?/);
      if (match && match[1]) {
        return { webhookUrl: match[1].trim() };
      }
    }
  } catch (e) {}

  return {
    webhookUrl: process.env.VITE_GAS_WEBHOOK_URL || process.env.GAS_WEBHOOK_URL || ''
  };
}

function writeConfig(config: any) {
  try {
    const cleanUrl = (config?.webhookUrl || '').trim();
    const configToSave = { ...config, webhookUrl: cleanUrl };
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(configToSave, null, 2), 'utf-8');
    
    // Also save in APP_DATA_FILE for redundant multi-layer persistence
    if (cleanUrl && fs.existsSync(APP_DATA_FILE)) {
      try {
        const raw = fs.readFileSync(APP_DATA_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          parsed.webhookUrl = cleanUrl;
          fs.writeFileSync(APP_DATA_FILE, JSON.stringify(parsed, null, 2), 'utf-8');
        }
      } catch (e) {}
    }

    // Also save to .env for persistent restarts
    if (cleanUrl) {
      try {
        const envPath = path.join(__dirname, '.env');
        let envContent = '';
        if (fs.existsSync(envPath)) {
          envContent = fs.readFileSync(envPath, 'utf-8');
        }
        if (envContent.includes('VITE_GAS_WEBHOOK_URL=')) {
          envContent = envContent.replace(/VITE_GAS_WEBHOOK_URL=.*/g, `VITE_GAS_WEBHOOK_URL="${cleanUrl}"`);
        } else {
          envContent += `\nVITE_GAS_WEBHOOK_URL="${cleanUrl}"\n`;
        }
        fs.writeFileSync(envPath, envContent, 'utf-8');
      } catch (e) {}
    }
    return true;
  } catch (err) {
    console.error('Error writing config file:', err);
    return false;
  }
}

function getDefaultAppData() {
  return {
    users: [
      { id: 'sa-1', role: 'SUPER_ADMIN', name: 'Super Administrator', username: 'rafx2' }
    ],
    materials: [],
    quizzes: [],
    quizResults: [],
    assignments: [],
    deletedUserKeys: [] as string[],
    customPasswords: {} as Record<string, string>,
    updatedAt: new Date().toISOString()
  };
}

// Set of quiz-student keys that were reset by teachers to prevent resurrection from stale Google Sheets cache
const resetQuizKeys = new Map<string, number>();

function isQuizResultReset(quizId: string, sKey?: string): boolean {
  if (!quizId || !sKey) return false;
  const cleanKey = String(sKey).trim();
  const compositeKey = `${quizId}::${cleanKey}`;
  const compositeKeyLower = `${quizId}::${cleanKey.toLowerCase()}`;
  const compositeKeyNoZero = `${quizId}::${cleanKey.replace(/^0+/, '')}`;

  if (resetQuizKeys.has(compositeKey) || resetQuizKeys.has(compositeKeyLower) || resetQuizKeys.has(compositeKeyNoZero)) {
    return true;
  }
  try {
    const current = readAppData();
    if (Array.isArray(current.resetQuizKeys)) {
      if (
        current.resetQuizKeys.includes(compositeKey) ||
        current.resetQuizKeys.includes(compositeKeyLower) ||
        current.resetQuizKeys.includes(compositeKeyNoZero)
      ) {
        return true;
      }
    }
  } catch (e) {}
  return false;
}

function markQuizResultReset(quizId: string, sKeys: (string | undefined)[]) {
  const now = Date.now();
  for (const k of sKeys) {
    if (k && String(k).trim()) {
      const clean = String(k).trim();
      resetQuizKeys.set(`${quizId}::${clean}`, now);
      resetQuizKeys.set(`${quizId}::${clean.toLowerCase()}`, now);
      const noZero = clean.replace(/^0+/, '');
      if (noZero) resetQuizKeys.set(`${quizId}::${noZero}`, now);
    }
  }
}

// Primary key detection helpers
function getUserPrimaryKeys(u: any): string[] {
  if (!u) return [];
  const keys: string[] = [];
  if (u.id) keys.push(String(u.id).trim());
  if (u.nisn && String(u.nisn).trim()) {
    const rawNisn = String(u.nisn).trim();
    keys.push(rawNisn);
    const noZero = rawNisn.replace(/^0+/, '');
    if (noZero && noZero !== rawNisn) keys.push(noZero);
  }
  if (u.nik && String(u.nik).trim()) keys.push(String(u.nik).trim());
  if (u.username && String(u.username).trim()) keys.push(String(u.username).trim().toLowerCase());
  if (u.name && String(u.name).trim()) keys.push(String(u.name).trim().toLowerCase());
  return keys;
}

function normalizeDateTimeString(val?: any): string {
  if (!val) return '';
  const str = String(val).trim();
  if (!str) return '';

  // 1. If already YYYY-MM-DDTHH:mm format
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(str)) {
    return str;
  }
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(str)) {
    return str.substring(0, 16);
  }

  // 2. Space-separated format: YYYY-MM-DD HH:mm
  const spaceMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})/);
  if (spaceMatch) {
    return `${spaceMatch[1]}-${spaceMatch[2]}-${spaceMatch[3]}T${spaceMatch[4]}:${spaceMatch[5]}`;
  }

  // 3. Indonesian / European format: DD/MM/YYYY HH:mm or DD-MM-YYYY HH:mm
  const dmyMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\s+(\d{1,2}):(\d{2})/);
  if (dmyMatch) {
    const pad = (n: string | number) => String(n).padStart(2, '0');
    return `${dmyMatch[3]}-${pad(dmyMatch[2])}-${pad(dmyMatch[1])}T${pad(dmyMatch[4])}:${pad(dmyMatch[5])}`;
  }

  // 4. Handle standard Date string / GMT format
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
  return str;
}

function isUserDeleted(u: any, deletedKeys: string[] = []): boolean {
  if (!u || !Array.isArray(deletedKeys) || deletedKeys.length === 0) return false;
  // NEVER treat Super Admin as deleted
  if (u.role === 'SUPER_ADMIN' || u.username === 'rafx2' || u.id === 'sa-1') return false;
  const userKeys = getUserPrimaryKeys(u);
  return userKeys.some(k => deletedKeys.includes(k) || deletedKeys.includes(k.toLowerCase()));
}

function findMatchingUser(list: any[], candidate: any) {
  if (!candidate) return null;
  const candidateKeys = getUserPrimaryKeys(candidate);
  for (const item of list) {
    if (candidate.id && item.id && candidate.id === item.id) return item;
    if (candidate.role === 'STUDENT' && item.role === 'STUDENT') {
      if (candidate.nisn && item.nisn && String(candidate.nisn).trim() === String(item.nisn).trim()) return item;
    }
    if (candidate.role === 'TEACHER' && item.role === 'TEACHER') {
      if (candidate.username && item.username && String(candidate.username).trim().toLowerCase() === String(item.username).trim().toLowerCase()) return item;
      if (candidate.nik && item.nik && String(candidate.nik).trim() === String(item.nik).trim()) return item;
    }
    if (candidate.username && item.username && String(candidate.username).trim().toLowerCase() === String(item.username).trim().toLowerCase()) return item;
  }
  return null;
}

function deduplicateUsersList(users: any[]): any[] {
  const result: any[] = [];
  const seenNisns = new Set<string>();
  const seenTeacherUsernames = new Set<string>();
  const seenIds = new Set<string>();

  for (const u of users) {
    if (!u) continue;
    // Super admin check
    if (u.role === 'SUPER_ADMIN' || u.username === 'rafx2' || u.id === 'sa-1') {
      if (!seenIds.has('sa-1')) {
        seenIds.add('sa-1');
        result.push(u);
      }
      continue;
    }

    if (u.role === 'STUDENT') {
      const cleanNisn = u.nisn ? String(u.nisn).trim() : '';
      if (cleanNisn) {
        if (seenNisns.has(cleanNisn)) continue;
        seenNisns.add(cleanNisn);
      } else {
        if (u.id && seenIds.has(u.id)) continue;
      }
      if (u.id) seenIds.add(u.id);
      result.push(u);
    } else if (u.role === 'TEACHER') {
      const cleanUser = u.username ? String(u.username).trim().toLowerCase() : (u.nik ? String(u.nik).trim() : '');
      if (cleanUser) {
        if (seenTeacherUsernames.has(cleanUser)) continue;
        seenTeacherUsernames.add(cleanUser);
      } else {
        if (u.id && seenIds.has(u.id)) continue;
      }
      if (u.id) seenIds.add(u.id);
      result.push(u);
    } else {
      if (u.id && seenIds.has(u.id)) continue;
      if (u.id) seenIds.add(u.id);
      result.push(u);
    }
  }

  return result;
}

// Real-time SSE (Server-Sent Events) clients for immediate live sync to all devices (Android, Desktop, iOS)
const sseClients = new Set<express.Response>();

function broadcastRealtimeUpdate(type: string, payload: any = {}) {
  const message = `data: ${JSON.stringify({ type, payload, timestamp: Date.now() })}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(message);
    } catch (e) {
      sseClients.delete(client);
    }
  }
}

function readAppData() {
  try {
    if (fs.existsSync(APP_DATA_FILE)) {
      const data = fs.readFileSync(APP_DATA_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      if (parsed && Array.isArray(parsed.users)) {
        if (Array.isArray(parsed.quizzes)) {
          parsed.quizzes = parsed.quizzes
            .filter((q: any) => 
              !q.title?.toLowerCase().includes('bangun datar') && 
              !q.title?.toLowerCase().includes('aljabar dasar') &&
              q.id !== 'quiz-cbt-1' && 
              q.id !== 'quiz-1' &&
              q.id !== 'q-1'
            )
            .map((q: any) => {
              const isSched = q.isScheduled === true || String(q.isScheduled).toUpperCase() === 'TRUE';
              return {
                ...q,
                isScheduled: isSched,
                startTime: isSched ? normalizeDateTimeString(q.startTime) : '',
                endTime: isSched ? normalizeDateTimeString(q.endTime) : '',
                durationMinutes: Number(q.durationMinutes) || 45
              };
            });
        } else {
          parsed.quizzes = [];
        }
        if (Array.isArray(parsed.materials)) {
          parsed.materials = parsed.materials.filter((m: any) => {
            const mId = String(m?.id || '').toLowerCase();
            return mId !== 'm-1' && mId !== 'm-demo';
          });
        } else {
          parsed.materials = [];
        }
        if (Array.isArray(parsed.assignments)) {
          parsed.assignments = parsed.assignments.filter((a: any) => {
            const sId = String(a.studentId || '').toLowerCase();
            const mId = String(a.materialId || '').toLowerCase();
            const file = String(a.fileName || '').toLowerCase();
            const link = String(a.link || '').toLowerCase();
            return sId !== 'student-1' && sId !== 'student-test-1' && !sId.includes('test') &&
              mId !== 'm-1' && mId !== 'm-demo' && !mId.includes('test') &&
              !file.includes('test') && !link.includes('test');
          });
        } else {
          parsed.assignments = [];
        }
        if (!Array.isArray(parsed.quizResults)) {
          parsed.quizResults = [];
        } else {
          parsed.quizResults = parsed.quizResults.filter((r: any) => {
            const sId = String(r.studentId || '').toLowerCase();
            return sId !== 'student-1' && sId !== 'student-test-1' && sId !== 's-test-check' && !sId.includes('test');
          });
        }
        if (!Array.isArray(parsed.deletedUserKeys)) {
          parsed.deletedUserKeys = [];
        }
        if (!Array.isArray(parsed.resetQuizKeys)) {
          parsed.resetQuizKeys = [];
        }
        if (!parsed.customPasswords || typeof parsed.customPasswords !== 'object') {
          parsed.customPasswords = {};
        }

        // Filter out sample/example users AND deleted tombstoned users
        parsed.users = parsed.users.filter((u: any) => {
          const nameLower = (u.name || '').toLowerCase();
          const isSample = u.id === 'student-1' || u.id === 'teacher-1' || 
            nameLower.includes('contoh') || nameLower.includes('percobaan') || nameLower.includes('sample') ||
            (u.nisn && String(u.nisn).trim() === '1234567890');
          if (isSample) return false;
          if (isUserDeleted(u, parsed.deletedUserKeys)) return false;
          return true;
        });

        // Deduplicate
        parsed.users = deduplicateUsersList(parsed.users);

        // Apply saved custom passwords
        for (const u of parsed.users) {
          const keys = getUserPrimaryKeys(u);
          for (const k of keys) {
            if (parsed.customPasswords[k]) {
              u.password = parsed.customPasswords[k];
              break;
            }
          }
        }

        // Ensure Super Admin
        if (!parsed.users.some((u: any) => u.role === 'SUPER_ADMIN')) {
          parsed.users.unshift({ id: 'sa-1', role: 'SUPER_ADMIN', name: 'Super Administrator', username: 'rafx2' });
        }

        return parsed;
      }
    }
  } catch (err) {
    console.error('Error reading app data file:', err);
  }
  const defaultData = getDefaultAppData();
  writeAppData(defaultData);
  return defaultData;
}

function writeAppData(data: any, broadcastType: string = 'data_updated') {
  try {
    fs.writeFileSync(APP_DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
    if (broadcastType) {
      broadcastRealtimeUpdate(broadcastType, { updatedAt: data.updatedAt });
    }
    return true;
  } catch (err) {
    console.error('Error writing app data file:', err);
    return false;
  }
}

// Helper to call Google Apps Script from server (bypassing CORS)
async function callGasServer(targetUrl: string, action: string, payload: any = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 35000);
  try {
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, ...payload }),
      redirect: 'follow',
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (!response.ok) {
      throw new Error(`Google Apps Script HTTP ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (err: any) {
    clearTimeout(timeoutId);
    throw err;
  }
}

let lastGasSyncTime = '';
let isGasSyncing = false;

async function syncServerWithGoogleSheets(customUrl?: string) {
  if (isGasSyncing) return { success: false, message: 'Sinkronisasi sedang berjalan...' };
  const config = readConfig();
  const webhookUrl = (customUrl || config.webhookUrl || '').trim();
  if (!webhookUrl || !webhookUrl.includes('script.google.com/macros/s/')) {
    return { success: false, message: 'Webhook URL belum dikonfigurasi' };
  }

  isGasSyncing = true;
  try {
    const res = await callGasServer(webhookUrl, 'getAllData', {});
    if (res && res.success) {
      const current = readAppData();
      
      // Authoritative user sync without resurrecting deleted users!
      let updatedUsers = current.users;
      if (Array.isArray(res.users) && res.users.length > 0) {
        const cleanUsers: any[] = [];

        for (const u of res.users) {
          // 1. Ignore if user was previously deleted (tombstone check)
          if (isUserDeleted(u, current.deletedUserKeys)) {
            continue;
          }

          // 2. Ignore mock/sample accounts
          const nameLower = (u.name || '').toLowerCase();
          const isSample = u.id === 'student-1' || u.id === 'teacher-1' || 
            nameLower.includes('contoh') || nameLower.includes('percobaan') || nameLower.includes('sample') ||
            (u.nisn && String(u.nisn).trim() === '1234567890');
          if (isSample) continue;

          // 3. Match against existing user in server memory by Primary Key (NISN / NIK / username / ID)
          const existing = findMatchingUser(current.users, u);

          // 4. Custom password preservation: NEVER revert to default NISN/NIK if custom password was set!
          const keys = getUserPrimaryKeys(u);
          let savedCustomPass = '';
          for (const k of keys) {
            if (current.customPasswords && current.customPasswords[k]) {
              savedCustomPass = current.customPasswords[k];
              break;
            }
          }

          const cleanPassSheet = u.password ? String(u.password).trim() : '';
          const cleanNisn = u.nisn ? String(u.nisn).trim() : '';
          const cleanNik = u.nik ? String(u.nik).trim() : '';
          const isGasCustom = cleanPassSheet && 
            cleanPassSheet !== cleanNisn && 
            cleanPassSheet !== cleanNisn.replace(/^0+/, '') &&
            cleanPassSheet !== cleanNik && 
            cleanPassSheet !== '123456';

          const isExistingCustom = existing?.password && 
            existing.password !== cleanNisn && 
            existing.password !== cleanNisn.replace(/^0+/, '') &&
            existing.password !== cleanNik && 
            existing.password !== '123456';

          const finalPass = (isGasCustom ? cleanPassSheet : savedCustomPass) || 
            (isExistingCustom ? existing.password : (cleanPassSheet || existing?.password || cleanNisn || cleanNik || '123456'));

          // If a custom password is found, cache it permanently in customPasswords dictionary
          if (isGasCustom || savedCustomPass || isExistingCustom) {
            const passToCache = isGasCustom ? cleanPassSheet : (savedCustomPass || existing?.password || cleanPassSheet);
            for (const k of keys) {
              current.customPasswords[k] = passToCache;
            }
          }

          cleanUsers.push({
            ...(existing || {}),
            ...u,
            id: (existing && existing.id) ? existing.id : u.id,
            password: finalPass
          });
        }

        // Deduplicate clean users by primary key
        updatedUsers = deduplicateUsersList(cleanUsers);

        if (!updatedUsers.some((u: any) => u.role === 'SUPER_ADMIN')) {
          updatedUsers.unshift({ id: 'sa-1', role: 'SUPER_ADMIN', name: 'Super Administrator', username: 'rafx2' });
        }
      }

      // Safely merge materials with existing materials so locally saved materials are never lost
      const matMap = new Map<string, any>();
      for (const m of (current.materials || [])) {
        if (m && m.id) matMap.set(m.id, m);
      }
      if (Array.isArray(res.materials)) {
        for (const gm of res.materials) {
          if (gm && gm.id) matMap.set(gm.id, gm);
        }
      }
      const mergedMaterials = Array.from(matMap.values());

      // Safely merge assignments so student submissions are never wiped
      const asgMap = new Map<string, any>();
      for (const a of (current.assignments || [])) {
        if (a && a.studentId && a.materialId) asgMap.set(`${a.studentId}::${a.materialId}`, a);
      }
      if (Array.isArray(res.assignments)) {
        for (const ga of res.assignments) {
          if (ga && ga.studentId && ga.materialId) {
            const key = `${ga.studentId}::${ga.materialId}`;
            const existing = asgMap.get(key);
            asgMap.set(key, { ...(existing || {}), ...ga });
          }
        }
      }
      const mergedAssignments = Array.from(asgMap.values());

      // Safely merge quizResults so student exam scores are never wiped
      const qrMap = new Map<string, any>();
      for (const qr of (current.quizResults || [])) {
        if (qr && qr.quizId) {
          const sKey = qr.studentId || qr.studentNisn || qr.studentName?.toLowerCase() || qr.id;
          qrMap.set(`${qr.quizId}::${sKey}`, qr);
        }
      }
      if (Array.isArray(res.quizResults)) {
        for (const gqr of res.quizResults) {
          if (gqr && gqr.quizId) {
            const sKey = gqr.studentId || gqr.studentNisn || gqr.studentName?.toLowerCase() || gqr.id;
            // Skip resurrection if the teacher recently reset this quiz for this student
            if (
              isQuizResultReset(gqr.quizId, sKey) ||
              (gqr.studentId && isQuizResultReset(gqr.quizId, gqr.studentId)) ||
              (gqr.studentNisn && isQuizResultReset(gqr.quizId, gqr.studentNisn)) ||
              (gqr.id && isQuizResultReset(gqr.quizId, gqr.id))
            ) {
              continue;
            }
            const key = `${gqr.quizId}::${sKey}`;
            const existing = qrMap.get(key);
            qrMap.set(key, { 
              ...(existing || {}), 
              ...gqr,
              essayScores: gqr.essayScores || existing?.essayScores || {}
            });
          }
        }
      }
      const mergedQuizResults = Array.from(qrMap.values());

      // Safely merge quizzes so Google Sheet schedule changes are AUTHORITATIVE and questions are preserved with full fidelity
      const quizMap = new Map<string, any>();
      for (const q of (current.quizzes || [])) {
        if (q && q.id) {
          quizMap.set(q.id, {
            ...q,
            startTime: normalizeDateTimeString(q.startTime),
            endTime: normalizeDateTimeString(q.endTime)
          });
        }
      }
      if (Array.isArray(res.quizzes)) {
        for (const gq of res.quizzes) {
          if (gq && gq.id) {
            const existing = quizMap.get(gq.id);
            const gqStart = normalizeDateTimeString(gq.startTime);
            const gqEnd = normalizeDateTimeString(gq.endTime);

            // Google Sheet is authoritative for schedule
            const isGqScheduled = gq.isScheduled !== undefined 
              ? (String(gq.isScheduled).toUpperCase() === 'TRUE' || gq.isScheduled === true)
              : Boolean(gqStart);

            if (existing) {
              const mergedQuestions = (Array.isArray(gq.questions) && gq.questions.length > 0)
                ? gq.questions.map((gqQ: any, idx: number) => {
                    const eq = (existing?.questions || []).find((q: any) => q.id === gqQ.id) || (existing?.questions || [])[idx];
                    const mergedOpts = (Array.isArray(gqQ.options) && gqQ.options.length > 0) ? gqQ.options : (eq?.options || []);
                    const mergedOptImgs = (Array.isArray(gqQ.optionImages) && gqQ.optionImages.length > 0) ? gqQ.optionImages : (eq?.optionImages || []);
                    let gqCorIndices: number[] = [];
                    if (Array.isArray(gqQ.correctOptionIndices)) {
                      gqCorIndices = gqQ.correctOptionIndices.map(Number);
                    } else if (typeof gqQ.correctOptionIndices === 'string' && gqQ.correctOptionIndices.trim()) {
                      try {
                        const parsed = JSON.parse(gqQ.correctOptionIndices);
                        if (Array.isArray(parsed)) gqCorIndices = parsed.map(Number);
                      } catch (e) {
                        const parts = gqQ.correctOptionIndices.replace(/[\[\]]/g, '').split(/[,;\s]+/).filter(Boolean);
                        gqCorIndices = parts.map((p: string) => {
                          const u = p.trim().toUpperCase();
                          if (/^[A-E]$/.test(u)) return u.charCodeAt(0) - 65;
                          const n = parseInt(p.trim(), 10);
                          return isNaN(n) ? 0 : n;
                        });
                      }
                    }

                    const mergedCorIndices = gqCorIndices.length > 0
                      ? gqCorIndices
                      : (Array.isArray(eq?.correctOptionIndices) && eq.correctOptionIndices.length > 0 ? eq.correctOptionIndices : []);

                    const mergedSampleAns = gqQ.sampleAnswer !== undefined ? gqQ.sampleAnswer : eq?.sampleAnswer;
                    const hasOptText = Array.isArray(mergedOpts) && mergedOpts.some((o: any) => String(o || '').trim() !== '');
                    const hasOptImg = Array.isArray(mergedOptImgs) && mergedOptImgs.some((img: any) => String(img || '').trim() !== '');
                    const inferredType =
                      (mergedSampleAns && String(mergedSampleAns).trim() !== '') || (!hasOptText && !hasOptImg)
                        ? 'ESSAY'
                        : (mergedCorIndices.length > 1 || gqQ.type === 'MCMA' || eq?.type === 'MCMA')
                        ? 'MCMA'
                        : (gqQ.type || eq?.type || 'SINGLE');
                    return {
                      ...eq,
                      ...gqQ,
                      type: inferredType,
                      options: inferredType === 'ESSAY' ? [] : mergedOpts,
                      optionImages: inferredType === 'ESSAY' ? [] : mergedOptImgs,
                      correctOptionIndex: gqQ.correctOptionIndex !== undefined ? gqQ.correctOptionIndex : eq?.correctOptionIndex,
                      correctOptionIndices: mergedCorIndices,
                      sampleAnswer: mergedSampleAns,
                      points: gqQ.points !== undefined ? Number(gqQ.points) : (eq?.points !== undefined ? Number(eq.points) : 10)
                    };
                  })
                : ((Array.isArray(existing.questions) && existing.questions.length > 0) ? existing.questions : []);

              const mappedIds = new Set((Array.isArray(gq.questions) ? gq.questions : []).map((q: any) => q.id).filter(Boolean));
              const extraExisting = (Array.isArray(existing.questions) ? existing.questions : []).filter((eqQ: any) => eqQ && eqQ.id && !mappedIds.has(eqQ.id));
              const finalMergedQuestions = [...mergedQuestions, ...extraExisting];

              quizMap.set(gq.id, {
                ...existing,
                ...gq,
                isScheduled: isGqScheduled,
                startTime: isGqScheduled ? gqStart : '',
                endTime: isGqScheduled ? gqEnd : '',
                durationMinutes: Number(gq.durationMinutes) || Number(existing.durationMinutes) || 45,
                questions: finalMergedQuestions
              });
            } else {
              quizMap.set(gq.id, {
                ...gq,
                isScheduled: isGqScheduled,
                startTime: isGqScheduled ? gqStart : '',
                endTime: isGqScheduled ? gqEnd : '',
                durationMinutes: Number(gq.durationMinutes) || 45,
                questions: Array.isArray(gq.questions) ? gq.questions : []
              });
            }
          }
        }
      }
      const mergedQuizzes = Array.from(quizMap.values());

      const updated = {
        ...current,
        users: updatedUsers,
        materials: mergedMaterials,
        quizzes: mergedQuizzes,
        quizResults: mergedQuizResults,
        assignments: mergedAssignments,
        updatedAt: new Date().toISOString()
      };

      writeAppData(updated, 'sheets_synced');
      lastGasSyncTime = new Date().toISOString();
      console.log(`[Google Sheets Database] Sinkronisasi Berhasil: ${updated.users.length} pengguna, ${updated.quizzes.length} kuis.`);
      return { 
        success: true, 
        message: 'Berhasil disinkronkan dengan Google Sheets', 
        stats: {
          totalUsers: updated.users.length,
          totalStudents: updated.users.filter((u: any) => u.role === 'STUDENT').length,
          totalTeachers: updated.users.filter((u: any) => u.role === 'TEACHER').length,
          totalQuizzes: updated.quizzes.length,
          totalMaterials: updated.materials.length
        }
      };
    } else {
      return { success: false, message: res?.error || 'Gagal mengambil data dari Google Sheets' };
    }
  } catch (err: any) {
    console.warn('[Google Sheets Database Sync Error]:', err.message);
    return { success: false, message: err.message || 'Koneksi ke Google Sheets gagal' };
  } finally {
    isGasSyncing = false;
  }
}

// API Routes
app.post('/api/auth/login', async (req, res) => {
  try {
    const { identifier, password, role } = req.body || {};
    const cleanId = String(identifier || '').trim();
    const cleanIdLower = cleanId.toLowerCase();
    const cleanIdNoZero = cleanIdLower.replace(/^0+/, '');
    const cleanPass = String(password || '').trim();

    if (!cleanId || !cleanPass) {
      return res.status(400).json({ success: false, error: 'Identitas (NISN / NIK / Username) dan kata sandi wajib diisi.' });
    }

    // 1. Super Admin instant verification
    if (cleanIdLower === 'rafx2' && cleanPass === 'Asepst007@') {
      const saUser = { id: 'sa-1', role: 'SUPER_ADMIN', name: 'Super Administrator', username: 'rafx2' };
      return res.json({ 
        success: true, 
        user: saUser, 
        roleSwitched: role === 'student',
        message: 'Berhasil masuk sebagai Super Administrator' 
      });
    }

    const appData = readAppData();
    const allUsers = appData.users || [];

    // Helper to find and verify user credentials
    function matchUser(candidateRole?: string) {
      for (const u of allUsers) {
        if (!u) continue;
        const uRole = String(u.role || '').toUpperCase();

        if (candidateRole === 'teacher' || (!candidateRole && (uRole === 'TEACHER' || uRole === 'ADMIN' || uRole === 'SUPER_ADMIN'))) {
          if (uRole !== 'TEACHER' && uRole !== 'ADMIN' && uRole !== 'SUPER_ADMIN') continue;

          const uUsername = String(u.username || '').toLowerCase().trim();
          const uNik = String(u.nik || '').trim();
          const uName = String(u.name || '').toLowerCase().trim();
          const uId = String(u.id || '').trim();

          const idMatch = (uUsername && uUsername === cleanIdLower) ||
                          (uNik && uNik === cleanId) ||
                          (uId && uId === cleanId) ||
                          (uName && uName === cleanIdLower) ||
                          (cleanIdLower.includes('@') && uUsername && cleanIdLower.startsWith(uUsername));

          if (!idMatch) continue;

          // Password verification
          const customPass = appData.customPasswords?.[uId] || 
                             (uNik ? appData.customPasswords?.[uNik] : '') || 
                             (uUsername ? appData.customPasswords?.[uUsername] : '');
          const actualPass = customPass || u.password;

          let passMatch = false;
          if (actualPass && String(actualPass).trim() !== '') {
            passMatch = String(actualPass).trim() === cleanPass;
          } else {
            passMatch = (cleanPass === uNik || cleanPass === '123456');
          }

          if (passMatch) return u;
        }

        if (candidateRole === 'student' || (!candidateRole && uRole === 'STUDENT')) {
          if (uRole !== 'STUDENT') continue;

          const uNisn = String(u.nisn || '').trim();
          const uNisnNoZero = uNisn.replace(/^0+/, '');
          const uUsername = String(u.username || '').toLowerCase().trim();
          const uName = String(u.name || '').toLowerCase().trim();
          const uId = String(u.id || '').trim();

          const idMatch = (uNisn && (uNisn === cleanId || uNisnNoZero === cleanIdNoZero)) ||
                          (uUsername && uUsername === cleanIdLower) ||
                          (uId && uId === cleanId) ||
                          (uName && uName === cleanIdLower);

          if (!idMatch) continue;

          // Password verification
          const customPass = appData.customPasswords?.[uId] || 
                             (uNisn ? appData.customPasswords?.[uNisn] : '') || 
                             (uUsername ? appData.customPasswords?.[uUsername] : '');
          const actualPass = customPass || u.password;

          let passMatch = false;
          if (actualPass && String(actualPass).trim() !== '') {
            passMatch = String(actualPass).trim() === cleanPass;
          } else {
            passMatch = (cleanPass === uNisn || (uNisnNoZero && cleanPass === uNisnNoZero) || cleanPass === '123456');
          }

          if (passMatch) return u;
        }
      }
      return null;
    }

    // 1. Try matching with selected tab role
    let targetUser = matchUser(role);
    let roleSwitched = false;

    // 2. If not found, attempt cross-role match (in case user selected wrong tab)
    if (!targetUser) {
      const oppositeRole = role === 'teacher' ? 'student' : 'teacher';
      targetUser = matchUser(oppositeRole);
      if (targetUser) {
        roleSwitched = true;
      }
    }

    // 3. Fallback: check Google Apps Script online if configured
    const config = readConfig();
    if (!targetUser && config.webhookUrl && config.webhookUrl.includes('script.google.com/macros/s/')) {
      try {
        const gasRes = await callGasServer(config.webhookUrl, 'login', {
          identifier: cleanId,
          password: cleanPass,
          role: role || 'student'
        });

        if (gasRes && gasRes.success && gasRes.user) {
          targetUser = gasRes.user;
          // Cache in server memory
          const existingIdx = appData.users.findIndex((u: any) => 
            u.id === targetUser.id || 
            (targetUser.nisn && u.nisn === targetUser.nisn) || 
            (targetUser.username && u.username === targetUser.username)
          );
          if (existingIdx >= 0) {
            appData.users[existingIdx] = { ...appData.users[existingIdx], ...targetUser };
          } else {
            appData.users.push(targetUser);
          }
          writeAppData(appData);
        }
      } catch (gasErr: any) {
        console.warn('[Online GAS Login Notice]:', gasErr.message);
      }
    }

    if (targetUser) {
      const uId = String(targetUser.id || '').trim();
      const uNik = String(targetUser.nik || '').trim();
      const uNisn = String(targetUser.nisn || '').trim();
      const uUsername = String(targetUser.username || '').toLowerCase().trim();
      const customPass = (appData.customPasswords && (
        appData.customPasswords[uId] ||
        (uNisn && appData.customPasswords[uNisn]) ||
        (uNik && appData.customPasswords[uNik]) ||
        (uUsername && appData.customPasswords[uUsername])
      )) || targetUser.password;

      const safeUser = {
        ...targetUser,
        password: customPass || targetUser.password
      };

      return res.json({
        success: true,
        user: safeUser,
        roleSwitched,
        message: roleSwitched
          ? `Berhasil masuk! Akun terdeteksi sebagai ${targetUser.role === 'STUDENT' ? 'Siswa' : 'Guru/Admin'}.`
          : 'Berhasil masuk ke portal'
      });
    }

    return res.status(401).json({
      success: false,
      error: `Kredensial tidak valid. Pastikan ${role === 'teacher' ? 'NIK / Username' : 'NISN'} dan kata sandi Anda sudah sesuai.`
    });
  } catch (err: any) {
    console.error('Error in /api/auth/login:', err);
    res.status(500).json({ success: false, error: err.message || 'Terjadi kesalahan sistem saat verifikasi masuk' });
  }
});

app.get('/api/database/status', (_req, res) => {
  const config = readConfig();
  const data = readAppData();
  const isConfigured = Boolean(config.webhookUrl && config.webhookUrl.includes('script.google.com/macros/s/'));
  res.json({
    success: true,
    isConfigured,
    webhookUrl: config.webhookUrl || '',
    lastSyncTime: lastGasSyncTime || data.updatedAt,
    stats: {
      totalUsers: (data.users || []).length,
      totalStudents: (data.users || []).filter((u: any) => u.role === 'STUDENT').length,
      totalTeachers: (data.users || []).filter((u: any) => u.role === 'TEACHER').length,
      totalQuizzes: (data.quizzes || []).length,
      totalMaterials: (data.materials || []).length
    }
  });
});

app.post('/api/database/connect', async (req, res) => {
  const { webhookUrl } = req.body || {};
  const cleanUrl = typeof webhookUrl === 'string' ? webhookUrl.trim() : '';
  if (!cleanUrl || !cleanUrl.includes('script.google.com/macros/s/')) {
    return res.status(400).json({ success: false, error: 'URL Webhook Google Apps Script tidak valid. Harus diawali dengan https://script.google.com/macros/s/...' });
  }

  try {
    // 1. Test ping
    const pingRes = await callGasServer(cleanUrl, 'ping');
    if (!pingRes || !pingRes.success) {
      return res.status(400).json({ success: false, error: pingRes?.error || 'Uji koneksi gagal. Pastikan deployment Apps Script disetel akses: Anyone (Siapa saja).' });
    }

    // 2. Save config
    writeConfig({ webhookUrl: cleanUrl, updatedAt: new Date().toISOString() });

    // 3. Pull all initial data
    const syncRes = await syncServerWithGoogleSheets(cleanUrl);

    res.json({
      success: true,
      message: 'Berhasil terhubung ke database Google Sheet sekolah!',
      stats: syncRes.stats
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Gagal menghubungi Google Apps Script' });
  }
});

app.post('/api/database/sync', async (_req, res) => {
  const result = await syncServerWithGoogleSheets();
  res.json(result);
});

app.get('/api/config', (_req, res) => {
  const config = readConfig();
  res.json(config);
});

app.post('/api/config', (req, res) => {
  const { webhookUrl } = req.body || {};
  const current = readConfig();
  const updated = {
    ...current,
    webhookUrl: typeof webhookUrl === 'string' ? webhookUrl.trim() : current.webhookUrl,
    updatedAt: new Date().toISOString()
  };
  writeConfig(updated);
  
  // Trigger background sync if valid URL provided
  if (updated.webhookUrl && updated.webhookUrl.includes('script.google.com/macros/s/')) {
    syncServerWithGoogleSheets(updated.webhookUrl).catch(() => {});
  }

  res.json({ success: true, config: updated });
});

// Central shared database API routes
app.get('/api/data', async (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');

  const config = readConfig();
  const clientWebhook = (req.query.webhookUrl as string || req.headers['x-gas-webhook-url'] as string || '').trim();
  let webhookUrl = (config.webhookUrl || clientWebhook || '').trim();
  if (clientWebhook && clientWebhook.includes('script.google.com/macros/s/') && clientWebhook !== config.webhookUrl) {
    writeConfig({ ...config, webhookUrl: clientWebhook });
    webhookUrl = clientWebhook;
  }

  const now = Date.now();
  const lastSyncMs = lastGasSyncTime ? new Date(lastGasSyncTime).getTime() : 0;
  
  // Connect directly to Google Sheets on device startup or if sync is older than 15 seconds
  if (webhookUrl && webhookUrl.includes('script.google.com/macros/s/') && (now - lastSyncMs > 15000) && !isGasSyncing) {
    try {
      await Promise.race([
        syncServerWithGoogleSheets(webhookUrl),
        new Promise(resolve => setTimeout(resolve, 3500))
      ]);
    } catch (e) {}
  }

  const data = readAppData();
  const combinedResetKeys = Array.from(new Set([
    ...Array.from(resetQuizKeys.keys()),
    ...(Array.isArray(data.resetQuizKeys) ? data.resetQuizKeys : [])
  ]));

  res.json({ 
    success: true, 
    data, 
    lastGasSyncTime, 
    webhookUrl,
    resetQuizKeys: combinedResetKeys
  });
});

// SSE endpoint for instant live push updates to Android, Desktop, and iOS
app.get('/api/realtime/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  if (typeof (res as any).flushHeaders === 'function') {
    (res as any).flushHeaders();
  }

  sseClients.add(res);
  res.write(`data: ${JSON.stringify({ type: 'connected', timestamp: Date.now() })}\n\n`);

  const keepAlive = setInterval(() => {
    try {
      res.write(': keepalive\n\n');
    } catch (e) {
      clearInterval(keepAlive);
    }
  }, 15000);

  req.on('close', () => {
    clearInterval(keepAlive);
    sseClients.delete(res);
  });
});

// Dedicated Real-time Force Sync endpoint (for instant refresh from Google Sheets)
app.post('/api/sync/realtime', async (req, res) => {
  try {
    const config = readConfig();
    const webhookUrl = (req.body?.webhookUrl || config.webhookUrl || '').trim();
    if (webhookUrl && webhookUrl.includes('script.google.com/macros/s/') && webhookUrl !== config.webhookUrl) {
      writeConfig({ ...config, webhookUrl });
    }
    if (!webhookUrl || !webhookUrl.includes('script.google.com/macros/s/')) {
      const data = readAppData();
      return res.json({ success: true, message: 'Data lokal termutakhir', data, lastGasSyncTime });
    }
    const syncRes = await syncServerWithGoogleSheets(webhookUrl);
    const data = readAppData();
    res.json({ success: true, message: syncRes.message, data, stats: syncRes.stats, lastGasSyncTime, webhookUrl });
  } catch (err: any) {
    const data = readAppData();
    res.json({ success: false, error: err.message, data, lastGasSyncTime });
  }
});

app.post('/api/data', (req, res) => {
  try {
    const current = readAppData();
    const incoming = req.body || {};
    
    // Merge quizzes safely: do not let an older client or truncated payload wipe out questions or revert MCMA/ESSAY types
    const rawIncomingQuizzes = Array.isArray(incoming.quizzes) ? incoming.quizzes : current.quizzes;
    const cleanQuizzes = rawIncomingQuizzes
      .filter((q: any) => !q.title?.includes('Bangun Datar & Aljabar') && q.id !== 'quiz-cbt-1' && q.id !== 'quiz-1')
      .map((iq: any) => {
        const existing = (current.quizzes || []).find((eq: any) => eq.id === iq.id);
        if (!existing) return iq;

        // If incoming questions is missing or empty, preserve existing questions!
        const existingQuestions = Array.isArray(existing.questions) ? existing.questions : [];
        const incomingQuestions = Array.isArray(iq.questions) ? iq.questions : [];
        const finalQuestions = (incomingQuestions.length > 0 ? incomingQuestions : existingQuestions).map((q: any, idx: number) => {
          const eqItem = existingQuestions.find((item: any) => item.id === q.id) || existingQuestions[idx];
          let qCorIndices: number[] = [];
          if (Array.isArray(q.correctOptionIndices)) {
            qCorIndices = q.correctOptionIndices.map(Number);
          } else if (typeof q.correctOptionIndices === 'string' && q.correctOptionIndices.trim()) {
            try {
              const p = JSON.parse(q.correctOptionIndices);
              if (Array.isArray(p)) qCorIndices = p.map(Number);
            } catch (e) {
              const parts = q.correctOptionIndices.replace(/[\[\]]/g, '').split(/[,;\s]+/).filter(Boolean);
              qCorIndices = parts.map((x: string) => {
                const u = x.trim().toUpperCase();
                if (/^[A-E]$/.test(u)) return u.charCodeAt(0) - 65;
                const n = parseInt(x.trim(), 10);
                return isNaN(n) ? 0 : n;
              });
            }
          }

          const mergedCorIndices = qCorIndices.length > 0
            ? qCorIndices
            : (Array.isArray(eqItem?.correctOptionIndices) && eqItem.correctOptionIndices.length > 0 ? eqItem.correctOptionIndices : []);
          const sampleAns = q.sampleAnswer !== undefined ? q.sampleAnswer : eqItem?.sampleAnswer;
          const mergedOpts = (Array.isArray(q.options) && q.options.length > 0) ? q.options : (eqItem?.options || []);
          const mergedOptImgs = (Array.isArray(q.optionImages) && q.optionImages.length > 0) ? q.optionImages : (eqItem?.optionImages || []);
          const hasOptText = Array.isArray(mergedOpts) && mergedOpts.some((o: any) => String(o || '').trim() !== '');
          const hasOptImg = Array.isArray(mergedOptImgs) && mergedOptImgs.some((img: any) => String(img || '').trim() !== '');

          const inferredType =
            (sampleAns && String(sampleAns).trim() !== '') || (!hasOptText && !hasOptImg)
              ? 'ESSAY'
              : (mergedCorIndices.length > 1 || q.type === 'MCMA' || eqItem?.type === 'MCMA')
              ? 'MCMA'
              : (q.type || eqItem?.type || 'SINGLE');

          return {
            ...(eqItem || {}),
            ...q,
            type: inferredType,
            options: inferredType === 'ESSAY' ? [] : mergedOpts,
            optionImages: inferredType === 'ESSAY' ? [] : mergedOptImgs,
            correctOptionIndices: mergedCorIndices,
            sampleAnswer: sampleAns
          };
        });

        return {
          ...existing,
          ...iq,
          questions: finalQuestions
        };
      });

    let incomingUsers = Array.isArray(incoming.users) ? incoming.users : current.users;
    
    // Filter out deleted users and sample users
    incomingUsers = incomingUsers.filter((u: any) => {
      const nameLower = (u.name || '').toLowerCase();
      const isSample = u.id === 'student-1' || u.id === 'teacher-1' || 
        nameLower.includes('contoh') || nameLower.includes('percobaan') || nameLower.includes('sample') ||
        (u.nisn && String(u.nisn).trim() === '1234567890');
      if (isSample) return false;
      if (isUserDeleted(u, current.deletedUserKeys)) return false;
      return true;
    });

    // Update customPasswords cache for users with custom password
    if (!current.customPasswords) current.customPasswords = {};
    if (incoming.customPasswords && typeof incoming.customPasswords === 'object') {
      current.customPasswords = { ...current.customPasswords, ...incoming.customPasswords };
    }
    for (const u of incomingUsers) {
      const isCustom = u.password && u.password !== u.nisn && u.password !== u.nik && u.password !== '123456';
      if (isCustom) {
        const keys = getUserPrimaryKeys(u);
        for (const k of keys) {
          current.customPasswords[k] = u.password.trim();
        }
      } else {
        // Check if we have an existing custom password for this user
        const keys = getUserPrimaryKeys(u);
        for (const k of keys) {
          if (current.customPasswords[k]) {
            u.password = current.customPasswords[k];
            break;
          }
        }
      }
    }

    // Deduplicate
    const finalUsers = deduplicateUsersList(incomingUsers);

    // Ensure Super Admin
    if (!finalUsers.some((u: any) => u.role === 'SUPER_ADMIN')) {
      finalUsers.unshift({ id: 'sa-1', role: 'SUPER_ADMIN', name: 'Super Administrator', username: 'rafx2' });
    }

    // Merge materials safely so no material is lost
    let mergedMaterials = current.materials || [];
    if (Array.isArray(incoming.materials)) {
      const matMap = new Map<string, any>();
      for (const m of (current.materials || [])) {
        if (m && m.id) matMap.set(m.id, m);
      }
      for (const im of incoming.materials) {
        if (im && im.id) matMap.set(im.id, im);
      }
      mergedMaterials = Array.from(matMap.values());
    }

    // Merge assignments safely
    let mergedAssignments = current.assignments || [];
    if (Array.isArray(incoming.assignments)) {
      const asgMap = new Map<string, any>();
      for (const a of (current.assignments || [])) {
        if (a && a.studentId && a.materialId) asgMap.set(`${a.studentId}::${a.materialId}`, a);
      }
      for (const ia of incoming.assignments) {
        if (ia && ia.studentId && ia.materialId) {
          const key = `${ia.studentId}::${ia.materialId}`;
          const existing = asgMap.get(key);
          asgMap.set(key, { ...(existing || {}), ...ia });
        }
      }
      mergedAssignments = Array.from(asgMap.values());
    }

    // Merge quizResults safely, but DO NOT resurrect results that were reset by teachers!
    let mergedQuizResults = current.quizResults || [];
    if (Array.isArray(incoming.quizResults)) {
      const qrMap = new Map<string, any>();
      for (const qr of (current.quizResults || [])) {
        if (qr && qr.quizId) {
          const sKey = qr.studentId || qr.studentNisn || qr.studentName?.toLowerCase() || qr.id;
          if (
            isQuizResultReset(qr.quizId, sKey) ||
            (qr.studentId && isQuizResultReset(qr.quizId, qr.studentId)) ||
            (qr.studentNisn && isQuizResultReset(qr.quizId, qr.studentNisn)) ||
            (qr.id && isQuizResultReset(qr.quizId, qr.id))
          ) {
            continue;
          }
          const key = qr.id || `${qr.quizId}::${sKey}`;
          qrMap.set(key, qr);
        }
      }
      for (const iqr of incoming.quizResults) {
        if (iqr && iqr.quizId) {
          const sKey = iqr.studentId || iqr.studentNisn || iqr.studentName?.toLowerCase() || iqr.id;
          if (
            isQuizResultReset(iqr.quizId, sKey) ||
            (iqr.studentId && isQuizResultReset(iqr.quizId, iqr.studentId)) ||
            (iqr.studentNisn && isQuizResultReset(iqr.quizId, iqr.studentNisn)) ||
            (iqr.id && isQuizResultReset(iqr.quizId, iqr.id))
          ) {
            continue;
          }
          const key = iqr.id || `${iqr.quizId}::${sKey}`;
          const existing = qrMap.get(key);
          qrMap.set(key, { ...(existing || {}), ...iqr });
        }
      }
      mergedQuizResults = Array.from(qrMap.values());
    }

    const updated = {
      ...current,
      users: finalUsers,
      materials: mergedMaterials,
      quizzes: cleanQuizzes,
      quizResults: mergedQuizResults,
      assignments: mergedAssignments,
      deletedUserKeys: current.deletedUserKeys,
      customPasswords: current.customPasswords,
      resetQuizKeys: current.resetQuizKeys || [],
      updatedAt: new Date().toISOString()
    };

    writeAppData(updated);

    res.json({ success: true, message: 'Data berhasil disimpan di server dan disinkronkan', data: updated });
  } catch (err: any) {
    console.error('Error saving app data:', err);
    res.status(500).json({ success: false, error: err.message || 'Gagal menyimpan data di server' });
  }
});

// Dedicated Material CRUD Endpoints for permanent persistence
app.get('/api/materials', (_req, res) => {
  const current = readAppData();
  res.json({ success: true, materials: current.materials || [] });
});

app.post('/api/materials', (req, res) => {
  try {
    const { material } = req.body || {};
    if (!material || !material.id || !material.title) {
      return res.status(400).json({ success: false, error: 'Data materi tidak lengkap' });
    }

    const current = readAppData();
    if (!Array.isArray(current.materials)) current.materials = [];

    const existingIdx = current.materials.findIndex((m: any) => m.id === material.id);
    if (existingIdx >= 0) {
      current.materials[existingIdx] = { ...current.materials[existingIdx], ...material };
    } else {
      current.materials.push(material);
    }

    current.updatedAt = new Date().toISOString();
    writeAppData(current);

    // Forward to GAS asynchronously
    const config = readConfig();
    const webhookUrl = (config.webhookUrl || '').trim();
    if (webhookUrl && webhookUrl.includes('script.google.com/macros/s/')) {
      callGasServer(webhookUrl, 'addMaterial', { material }).catch(() => {});
    }

    res.json({ success: true, material, count: current.materials.length });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/materials/:id', (req, res) => {
  try {
    const id = req.params.id;
    const updateData = req.body || {};
    if (!id) return res.status(400).json({ success: false, error: 'ID materi diperlukan' });

    const current = readAppData();
    if (!Array.isArray(current.materials)) current.materials = [];

    const existingIdx = current.materials.findIndex((m: any) => m.id === id);
    if (existingIdx >= 0) {
      current.materials[existingIdx] = { ...current.materials[existingIdx], ...updateData, id };
    } else {
      current.materials.push({ ...updateData, id });
    }

    current.updatedAt = new Date().toISOString();
    writeAppData(current);

    const config = readConfig();
    const webhookUrl = (config.webhookUrl || '').trim();
    if (webhookUrl && webhookUrl.includes('script.google.com/macros/s/')) {
      callGasServer(webhookUrl, 'updateMaterial', { id, data: updateData }).catch(() => {});
    }

    res.json({ success: true, material: current.materials[existingIdx >= 0 ? existingIdx : current.materials.length - 1] });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/materials/:id', (req, res) => {
  try {
    const id = req.params.id;
    if (!id) return res.status(400).json({ success: false, error: 'ID materi diperlukan' });

    const current = readAppData();
    if (Array.isArray(current.materials)) {
      current.materials = current.materials.filter((m: any) => m.id !== id);
      current.updatedAt = new Date().toISOString();
      writeAppData(current);
    }

    const config = readConfig();
    const webhookUrl = (config.webhookUrl || '').trim();
    if (webhookUrl && webhookUrl.includes('script.google.com/macros/s/')) {
      callGasServer(webhookUrl, 'deleteMaterial', { id }).catch(() => {});
    }

    res.json({ success: true, message: 'Materi berhasil dihapus' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Dedicated Quiz CRUD Endpoints for permanent persistence & immediate Google Sheets sync
app.get('/api/quizzes', (_req, res) => {
  const current = readAppData();
  res.json({ success: true, quizzes: current.quizzes || [] });
});

app.post('/api/quizzes', async (req, res) => {
  try {
    const { quiz } = req.body || {};
    if (!quiz || !quiz.id || !quiz.title) {
      return res.status(400).json({ success: false, error: 'Data kuis tidak lengkap' });
    }

    const current = readAppData();
    if (!Array.isArray(current.quizzes)) current.quizzes = [];

    // Clean schedule dates
    quiz.startTime = normalizeDateTimeString(quiz.startTime);
    quiz.endTime = normalizeDateTimeString(quiz.endTime);

    const existingIdx = current.quizzes.findIndex((q: any) => q.id === quiz.id);
    if (existingIdx >= 0) {
      current.quizzes[existingIdx] = { ...current.quizzes[existingIdx], ...quiz };
    } else {
      current.quizzes.push(quiz);
    }

    current.updatedAt = new Date().toISOString();
    writeAppData(current);

    // Forward to GAS immediately
    const config = readConfig();
    const webhookUrl = (config.webhookUrl || '').trim();
    let gasSynced = false;
    if (webhookUrl && webhookUrl.includes('script.google.com/macros/s/')) {
      try {
        const gasRes = await callGasServer(webhookUrl, 'addQuiz', { quiz });
        gasSynced = Boolean(gasRes && gasRes.success);
      } catch (e: any) {
        console.warn('[GAS Add Quiz Notice]:', e.message);
      }
    }

    res.json({ success: true, quiz, count: current.quizzes.length, gasSynced });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/quizzes/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const { data, quiz } = req.body || {};
    if (!id) return res.status(400).json({ success: false, error: 'ID kuis diperlukan' });

    const current = readAppData();
    if (!Array.isArray(current.quizzes)) current.quizzes = [];

    const existingIdx = current.quizzes.findIndex((q: any) => q.id === id);
    const updatePayload = quiz || data || req.body || {};

    if (updatePayload.isScheduled === false) {
      updatePayload.startTime = '';
      updatePayload.endTime = '';
    } else {
      if (updatePayload.startTime !== undefined) {
        updatePayload.startTime = normalizeDateTimeString(updatePayload.startTime);
      }
      if (updatePayload.endTime !== undefined) {
        updatePayload.endTime = normalizeDateTimeString(updatePayload.endTime);
      }
    }

    let updatedQuiz: any;
    if (existingIdx >= 0) {
      updatedQuiz = { ...current.quizzes[existingIdx], ...updatePayload, id };
      current.quizzes[existingIdx] = updatedQuiz;
    } else {
      updatedQuiz = { ...updatePayload, id };
      current.quizzes.push(updatedQuiz);
    }

    current.updatedAt = new Date().toISOString();
    writeAppData(current, 'quizzes_updated');

    // Forward directly to GAS
    const config = readConfig();
    const webhookUrl = (config.webhookUrl || '').trim();
    let gasSynced = false;
    if (webhookUrl && webhookUrl.includes('script.google.com/macros/s/')) {
      try {
        const gasRes = await callGasServer(webhookUrl, 'updateQuiz', { 
          id, 
          data: updatePayload, 
          quiz: updatedQuiz,
          updateQuestions: Boolean(updatePayload.questions && updatePayload.questions.length > 0)
        });
        gasSynced = Boolean(gasRes && gasRes.success);
      } catch (e: any) {
        console.warn('[GAS Update Quiz Notice]:', e.message);
      }
    }

    console.log(`[Quiz Update] Kuis ${id} (${updatedQuiz.title}) jadwal diperbarui: ${updatedQuiz.startTime || 'Tanpa jadwal'} - Gas: ${gasSynced}`);
    res.json({ success: true, quiz: updatedQuiz, gasSynced });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/quizzes/:id', async (req, res) => {
  try {
    const id = req.params.id;
    if (!id) return res.status(400).json({ success: false, error: 'ID kuis diperlukan' });

    const current = readAppData();
    if (Array.isArray(current.quizzes)) {
      current.quizzes = current.quizzes.filter((q: any) => q.id !== id);
      current.updatedAt = new Date().toISOString();
      writeAppData(current, 'quizzes_updated');
    }

    const config = readConfig();
    const webhookUrl = (config.webhookUrl || '').trim();
    if (webhookUrl && webhookUrl.includes('script.google.com/macros/s/')) {
      callGasServer(webhookUrl, 'deleteQuiz', { id }).catch(() => {});
    }

    res.json({ success: true, message: 'Kuis berhasil dihapus' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Dedicated Assignment Endpoints
app.get('/api/assignments', (_req, res) => {
  const current = readAppData();
  res.json({ success: true, assignments: current.assignments || [] });
});

app.post('/api/assignments', (req, res) => {
  try {
    const { studentId, materialId, link, fileName, fileSize, studentName, studentNisn, studentClass, materialTitle, subject } = req.body || {};
    if (!studentId || !materialId || !link) {
      return res.status(400).json({ success: false, error: 'Data tugas tidak lengkap' });
    }

    const current = readAppData();
    if (!Array.isArray(current.assignments)) current.assignments = [];

    // Find student & material to enrich details if not explicitly passed
    const student = (current.users || []).find((u: any) => u.id === studentId || (u.nisn && u.nisn === studentId));
    const material = (current.materials || []).find((m: any) => m.id === materialId);

    const existingIdx = current.assignments.findIndex((a: any) => a.studentId === studentId && a.materialId === materialId);
    const newSubmission = {
      id: existingIdx >= 0 && current.assignments[existingIdx].id ? current.assignments[existingIdx].id : `asg-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      studentId,
      studentName: studentName || student?.name || 'Siswa',
      studentNisn: studentNisn || student?.nisn || '',
      studentClass: studentClass || student?.classId || '',
      materialId,
      materialTitle: materialTitle || material?.assignmentTitle || material?.title || 'Tugas Siswa',
      subject: subject || material?.subjectId || '',
      link,
      fileName: fileName || '',
      fileSize: fileSize || 0,
      submittedAt: new Date().toISOString(),
      ...(existingIdx >= 0 ? {
        grade: current.assignments[existingIdx].grade,
        feedback: current.assignments[existingIdx].feedback,
        gradedAt: current.assignments[existingIdx].gradedAt
      } : {})
    };

    if (existingIdx >= 0) {
      current.assignments[existingIdx] = newSubmission;
    } else {
      current.assignments.push(newSubmission);
    }

    current.updatedAt = new Date().toISOString();
    writeAppData(current);

    const config = readConfig();
    const webhookUrl = (config.webhookUrl || '').trim();
    if (webhookUrl && webhookUrl.includes('script.google.com/macros/s/')) {
      callGasServer(webhookUrl, 'submitAssignment', newSubmission).catch(() => {});
    }

    res.json({ success: true, assignment: newSubmission });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/assignments/grade', (req, res) => {
  try {
    const { studentId, materialId, grade, feedback, gradedAt } = req.body || {};
    if (!studentId || !materialId || grade === undefined) {
      return res.status(400).json({ success: false, error: 'Data penilaian tugas tidak lengkap' });
    }

    const current = readAppData();
    if (!Array.isArray(current.assignments)) current.assignments = [];

    const existingIdx = current.assignments.findIndex((a: any) => a.studentId === studentId && a.materialId === materialId);
    if (existingIdx === -1) {
      return res.status(404).json({ success: false, error: 'Pengumpulan tugas tidak ditemukan' });
    }

    const now = gradedAt || new Date().toISOString();
    current.assignments[existingIdx].grade = Number(grade);
    current.assignments[existingIdx].feedback = feedback || '';
    current.assignments[existingIdx].gradedAt = now;

    current.updatedAt = new Date().toISOString();
    writeAppData(current);

    const config = readConfig();
    const webhookUrl = (config.webhookUrl || '').trim();
    if (webhookUrl && webhookUrl.includes('script.google.com/macros/s/')) {
      callGasServer(webhookUrl, 'gradeAssignment', { 
        studentId, 
        materialId, 
        grade: Number(grade), 
        feedback: feedback || '',
        gradedAt: now
      }).catch(() => {});
    }

    res.json({ success: true, message: 'Nilai tugas berhasil disimpan', assignment: current.assignments[existingIdx] });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Dedicated Endpoints for Quiz Results & Submissions
app.get('/api/quiz-results', (_req, res) => {
  const current = readAppData();
  res.json({ success: true, quizResults: current.quizResults || [] });
});

app.post('/api/quizzes/submit', async (req, res) => {
  try {
    const r = req.body || {};
    const { quizId, studentId } = r;
    if (!quizId || !studentId) {
      return res.status(400).json({ success: false, error: 'quizId dan studentId diperlukan' });
    }

    const current = readAppData();
    if (!Array.isArray(current.quizResults)) current.quizResults = [];
    if (!Array.isArray(current.resetQuizKeys)) current.resetQuizKeys = [];

    // Find student in current.users for enrichment
    const student = (current.users || []).find((u: any) => {
      if (!u) return false;
      const uId = String(u.id || '').trim();
      const uNisn = String(u.nisn || '').trim();
      const uNisnNoZero = uNisn.replace(/^0+/, '');
      const sId = String(studentId || '').trim();
      const sIdNoZero = sId.replace(/^0+/, '');
      const sNisn = String(r.studentNisn || '').trim();
      const sName = String(r.studentName || '').trim().toLowerCase();

      return (
        (uId && (uId === sId || (sNisn && uId === sNisn))) ||
        (uNisn && (uNisn === sId || (sIdNoZero && uNisnNoZero === sIdNoZero) || (sNisn && uNisn === sNisn))) ||
        (sName && u.name && u.name.trim().toLowerCase() === sName)
      );
    });
    const quiz = (current.quizzes || []).find((q: any) => q.id === quizId);

    const resolvedStudentId = student?.id || studentId;
    const studentName = r.studentName || student?.name || 'Siswa';
    const studentNisn = r.studentNisn || student?.nisn || '';
    const studentClass = r.studentClass || student?.classId || '';
    const quizTitle = r.quizTitle || quiz?.title || 'Kuis CBT';
    const subject = r.subject || quiz?.subjectId || '';

    // Strip heavy base64 images from violation logs before storing in persistent file to avoid disk bloating and GAS quota limits
    const cleanViolationLogs = Array.isArray(r.violationLogs)
      ? r.violationLogs.map((v: any) => ({
          id: v.id,
          timestamp: v.timestamp,
          type: v.type,
          description: v.description,
          durationSeconds: v.durationSeconds,
          questionIndex: v.questionIndex
        }))
      : [];

    const enrichedResult = {
      id: r.id || `qr-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      quizId,
      quizTitle,
      subject,
      studentId: resolvedStudentId,
      studentName,
      studentNisn,
      studentClass,
      score: Number(r.score !== undefined ? r.score : 0),
      finalScore: Number(r.finalScore !== undefined ? r.finalScore : (r.score !== undefined ? r.score : 0)),
      answers: r.answers || {},
      essayScores: r.essayScores || {},
      submittedAt: r.submittedAt || new Date().toISOString(),
      violationsCount: Number(r.violationsCount || cleanViolationLogs.length || 0),
      violationLogs: cleanViolationLogs,
      disqualified: Boolean(r.disqualified),
      teacherNote: r.teacherNote || (r.disqualified ? 'Ujian dihentikan otomatis oleh sistem' : '')
    };

    // Find existing result for this student and quiz
    const existingIdx = current.quizResults.findIndex((qr: any) => 
      qr.quizId === quizId && (
        qr.studentId === resolvedStudentId ||
        qr.studentId === studentId ||
        (student && qr.studentId === student.id) ||
        (studentNisn && (qr.studentId === studentNisn || qr.studentNisn === studentNisn)) ||
        (studentName && qr.studentName && qr.studentName.toLowerCase() === studentName.toLowerCase())
      )
    );

    if (existingIdx >= 0) {
      current.quizResults[existingIdx] = { ...current.quizResults[existingIdx], ...enrichedResult };
    } else {
      current.quizResults.push(enrichedResult);
    }

    // Now that student submitted, clear any previous reset keys for this student-quiz so it shows completed!
    const studentResetKeys = [
      resolvedStudentId,
      studentId,
      student?.id,
      studentNisn,
      student?.nisn,
      studentName?.toLowerCase(),
      student?.name?.toLowerCase()
    ].filter(Boolean) as string[];

    if (Array.isArray(current.resetQuizKeys)) {
      current.resetQuizKeys = current.resetQuizKeys.filter((k: string) => {
        return !studentResetKeys.some(sk => 
          k === `${quizId}::${sk}` || 
          k === `${quizId}::${sk.toLowerCase()}` || 
          k === `${quizId}::${sk.replace(/^0+/, '')}`
        );
      });
    }
    for (const sk of studentResetKeys) {
      resetQuizKeys.delete(`${quizId}::${sk}`);
      resetQuizKeys.delete(`${quizId}::${sk.toLowerCase()}`);
      resetQuizKeys.delete(`${quizId}::${sk.replace(/^0+/, '')}`);
    }

    current.updatedAt = new Date().toISOString();
    writeAppData(current, 'quiz_result_saved');
    broadcastRealtimeUpdate('DATA_UPDATED');

    // Forward immediately to Google Apps Script Webhook
    const config = readConfig();
    const webhookUrl = (req.body?.webhookUrl || config.webhookUrl || '').trim();
    if (webhookUrl && (!config.webhookUrl || config.webhookUrl !== webhookUrl)) {
      writeConfig({ ...config, webhookUrl });
    }

    let gasSynced = false;
    let gasMessage = '';
    if (webhookUrl && webhookUrl.includes('script.google.com/macros/s/')) {
      try {
        const gasRes = await callGasServer(webhookUrl, 'submitQuiz', { result: enrichedResult });
        if (gasRes && gasRes.success) {
          gasSynced = true;
          gasMessage = gasRes.message || 'Berhasil disimpan di Google Sheet';
        }
      } catch (gasErr: any) {
        console.warn('[GAS submitQuiz Error]:', gasErr.message);
      }
    }

    console.log(`[Quiz Submit] Nilai ${studentName} (${quizTitle}): ${enrichedResult.finalScore} berhasil disimpan (Sheet Synced: ${gasSynced})`);
    res.json({ 
      success: true, 
      message: gasSynced 
        ? 'Hasil kuis berhasil disimpan dan dikirim langsung ke Google Sheet' 
        : 'Hasil kuis berhasil disimpan di LMS sekolah', 
      result: enrichedResult,
      resetQuizKeys: current.resetQuizKeys || [],
      gasSynced
    });
  } catch (err: any) {
    console.error('Error submitting quiz result:', err);
    res.status(500).json({ success: false, error: err.message || 'Gagal menyimpan hasil kuis' });
  }
});

// Dedicated endpoint to update a quiz result (e.g. for essay grading, penalties, or teacher notes)
app.post('/api/quizzes/result/update', async (req, res) => {
  try {
    const { id, data: updateData } = req.body || {};
    if (!id) {
      return res.status(400).json({ success: false, error: 'ID hasil kuis diperlukan' });
    }

    const current = readAppData();
    if (!Array.isArray(current.quizResults)) current.quizResults = [];

    const idx = current.quizResults.findIndex((qr: any) => qr.id === id);
    if (idx >= 0) {
      const existing = current.quizResults[idx];
      const updated = {
        ...existing,
        ...(updateData || {})
      };
      current.quizResults[idx] = updated;
      current.updatedAt = new Date().toISOString();
      writeAppData(current, 'quiz_result_updated');

      // Forward to Google Apps Script Webhook
      const config = readConfig();
      const webhookUrl = (config.webhookUrl || '').trim();
      let gasSynced = false;
      if (webhookUrl && webhookUrl.includes('script.google.com/macros/s/')) {
        try {
          const gasRes = await callGasServer(webhookUrl, 'updateQuizResult', { id, data: updated, result: updated });
          if (gasRes && gasRes.success) gasSynced = true;
        } catch (e: any) {
          console.warn('[GAS updateQuizResult Error]:', e.message);
        }
      }

      broadcastRealtimeUpdate('DATA_UPDATED');
      return res.json({ success: true, message: 'Hasil ujian berhasil diperbarui', result: updated, gasSynced });
    }

    return res.status(404).json({ success: false, error: 'Hasil kuis tidak ditemukan' });
  } catch (err: any) {
    console.error('Error updating quiz result:', err);
    res.status(500).json({ success: false, error: err.message || 'Gagal memperbarui hasil kuis' });
  }
});

// Dedicated endpoint for teachers to reset a quiz for a student so the student can retake it
app.post('/api/quizzes/reset-student', async (req, res) => {
  try {
    const { quizId, studentId, studentNisn, resultId, studentName } = req.body || {};
    if (!quizId && !resultId) {
      return res.status(400).json({ success: false, error: 'quizId atau resultId diperlukan' });
    }

    const current = readAppData();
    if (!Array.isArray(current.quizResults)) current.quizResults = [];
    if (!Array.isArray(current.resetQuizKeys)) current.resetQuizKeys = [];

    // 1. Find existing target result by resultId or by quizId + student info
    let targetResult = (resultId ? current.quizResults.find((qr: any) => qr.id === resultId) : null) ||
      (quizId ? current.quizResults.find((qr: any) => 
        qr.quizId === quizId && (
          (studentId && (qr.studentId === studentId || qr.studentNisn === studentId)) ||
          (studentNisn && (qr.studentNisn === studentNisn || qr.studentId === studentNisn)) ||
          (studentName && qr.studentName && qr.studentName.toLowerCase() === String(studentName).trim().toLowerCase())
        )
      ) : null);

    const actualQuizId = quizId || targetResult?.quizId;

    // 2. Resolve matching student in current.users
    const candidateStudents = (current.users || []).filter((u: any) => {
      if (!u) return false;
      const uId = String(u.id || '').trim().toLowerCase();
      const uNisn = String(u.nisn || '').trim().toLowerCase();
      const uNisnNoZero = uNisn.replace(/^0+/, '');
      const uUser = String(u.username || '').toLowerCase().trim();
      const uName = String(u.name || '').toLowerCase().trim();

      const matchKeys = [
        studentId, studentNisn, studentName?.toLowerCase(), resultId,
        targetResult?.studentId, targetResult?.studentNisn, targetResult?.studentName?.toLowerCase()
      ].filter(Boolean).map(x => String(x).trim().toLowerCase());

      return matchKeys.some(k => 
        k === uId ||
        (uNisn && (k === uNisn || (uNisnNoZero && k === uNisnNoZero))) ||
        (uUser && k === uUser) ||
        (uName && k === uName)
      );
    });

    const targetStudentUser = candidateStudents[0];

    // 3. Build a comprehensive set of identifiers for this student
    const studentKeysSet = new Set<string>();
    if (resultId) studentKeysSet.add(String(resultId).trim());
    if (studentId) {
      const s = String(studentId).trim();
      studentKeysSet.add(s);
      studentKeysSet.add(s.toLowerCase());
      studentKeysSet.add(s.replace(/^0+/, ''));
    }
    if (studentNisn) {
      const sn = String(studentNisn).trim();
      studentKeysSet.add(sn);
      studentKeysSet.add(sn.replace(/^0+/, ''));
    }
    if (studentName) {
      studentKeysSet.add(String(studentName).trim().toLowerCase());
    }
    if (targetResult) {
      if (targetResult.id) studentKeysSet.add(String(targetResult.id).trim());
      if (targetResult.studentId) {
        studentKeysSet.add(String(targetResult.studentId).trim());
        studentKeysSet.add(String(targetResult.studentId).trim().toLowerCase());
        studentKeysSet.add(String(targetResult.studentId).trim().replace(/^0+/, ''));
      }
      if (targetResult.studentNisn) {
        studentKeysSet.add(String(targetResult.studentNisn).trim());
        studentKeysSet.add(String(targetResult.studentNisn).trim().replace(/^0+/, ''));
      }
      if (targetResult.studentName) {
        studentKeysSet.add(String(targetResult.studentName).trim().toLowerCase());
      }
    }
    if (targetStudentUser) {
      if (targetStudentUser.id) studentKeysSet.add(String(targetStudentUser.id).trim());
      if (targetStudentUser.nisn) {
        const raw = String(targetStudentUser.nisn).trim();
        studentKeysSet.add(raw);
        studentKeysSet.add(raw.replace(/^0+/, ''));
      }
      if (targetStudentUser.username) studentKeysSet.add(String(targetStudentUser.username).trim().toLowerCase());
      if (targetStudentUser.name) studentKeysSet.add(String(targetStudentUser.name).trim().toLowerCase());
    }

    const beforeCount = current.quizResults.length;
    current.quizResults = current.quizResults.filter((qr: any) => {
      if (resultId && qr.id === resultId) return false;
      if (actualQuizId && qr.quizId === actualQuizId) {
        if (qr.id && studentKeysSet.has(String(qr.id).trim())) return false;
        if (qr.studentId && (
          studentKeysSet.has(String(qr.studentId).trim()) ||
          studentKeysSet.has(String(qr.studentId).trim().toLowerCase()) ||
          studentKeysSet.has(String(qr.studentId).trim().replace(/^0+/, ''))
        )) return false;
        if (qr.studentNisn && (
          studentKeysSet.has(String(qr.studentNisn).trim()) ||
          studentKeysSet.has(String(qr.studentNisn).trim().replace(/^0+/, ''))
        )) return false;
        if (qr.studentName && studentKeysSet.has(String(qr.studentName).trim().toLowerCase())) return false;
      }
      return true;
    });

    const removedCount = beforeCount - current.quizResults.length;

    // 4. Register permanently into resetQuizKeys memory & app-data.json
    if (actualQuizId) {
      const keysList = Array.from(studentKeysSet);
      markQuizResultReset(actualQuizId, keysList);
      for (const k of keysList) {
        const compKey = `${actualQuizId}::${k}`;
        if (!current.resetQuizKeys.includes(compKey)) {
          current.resetQuizKeys.push(compKey);
        }
      }
    }

    current.updatedAt = new Date().toISOString();
    writeAppData(current, 'quiz_result_reset');

    // Notify Google Apps Script
    const config = readConfig();
    const webhookUrl = (req.body?.webhookUrl || config.webhookUrl || '').trim();
    let gasSynced = false;
    if (webhookUrl && webhookUrl.includes('script.google.com/macros/s/')) {
      try {
        const gasRes = await callGasServer(webhookUrl, 'deleteQuizResult', {
          quizId: actualQuizId,
          studentId: studentId || targetResult?.studentId || targetStudentUser?.id,
          studentNisn: studentNisn || targetResult?.studentNisn || targetStudentUser?.nisn,
          studentName: studentName || targetResult?.studentName || targetStudentUser?.name,
          resultId: resultId || targetResult?.id,
          id: resultId || targetResult?.id
        });
        if (gasRes && gasRes.success) {
          gasSynced = true;
        }
      } catch (gasErr: any) {
        console.warn('[GAS deleteQuizResult Error]:', gasErr.message);
      }
    }

    broadcastRealtimeUpdate('DATA_UPDATED');

    console.log(`[Quiz Reset] Kuis ${actualQuizId} di-reset untuk siswa ${studentName || studentId || studentNisn || resultId} (${removedCount} dihapus, Sheet Synced: ${gasSynced})`);
    res.json({
      success: true,
      message: `Hasil ujian berhasil di-reset. Siswa kini dapat mengulang kuis kembali.`,
      removedCount,
      gasSynced
    });
  } catch (err: any) {
    console.error('Error resetting quiz for student:', err);
    res.status(500).json({ success: false, error: err.message || 'Gagal mereset kuis siswa' });
  }
});

// Dedicated endpoint for teachers to bulk reset quizzes for students meeting specific criteria (e.g. score < KKM, disqualified, or all)
app.post('/api/quizzes/bulk-reset', async (req, res) => {
  try {
    const { quizId, filterType, threshold, studentIds, webhookUrl: customWebhook } = req.body || {};
    if (!quizId) {
      return res.status(400).json({ success: false, error: 'quizId diperlukan' });
    }

    const current = readAppData();
    if (!Array.isArray(current.quizResults)) current.quizResults = [];
    if (!Array.isArray(current.resetQuizKeys)) current.resetQuizKeys = [];

    const numThreshold = Number(threshold !== undefined ? threshold : 75);

    // Find all results matching the criteria
    const matchingResults = current.quizResults.filter((qr: any) => {
      if (qr.quizId !== quizId) return false;
      const score = Number(qr.finalScore !== undefined ? qr.finalScore : qr.score || 0);
      const isDisqualified = Boolean(qr.disqualified) || Number(qr.violationsCount || 0) > 0;

      if (filterType === 'below_threshold') {
        return score < numThreshold;
      } else if (filterType === 'disqualified') {
        return isDisqualified;
      } else if (filterType === 'all') {
        return true;
      } else if (filterType === 'selected') {
        if (!Array.isArray(studentIds)) return false;
        return studentIds.some((sid: string) => 
          qr.id === sid ||
          qr.studentId === sid ||
          qr.studentNisn === sid
        );
      }
      return false;
    });

    if (matchingResults.length === 0) {
      return res.json({
        success: true,
        count: 0,
        studentNames: [],
        message: 'Tidak ada siswa yang memenuhi kriteria untuk pengulangan kuis.'
      });
    }

    // Collect all student keys for matching results
    const resetStudentNames: string[] = [];

    for (const mr of matchingResults) {
      const studentKeysSet = new Set<string>();
      if (mr.id) studentKeysSet.add(String(mr.id).trim());
      if (mr.studentId) {
        const s = String(mr.studentId).trim();
        studentKeysSet.add(s);
        studentKeysSet.add(s.toLowerCase());
        studentKeysSet.add(s.replace(/^0+/, ''));
      }
      if (mr.studentNisn) {
        const sn = String(mr.studentNisn).trim();
        studentKeysSet.add(sn);
        studentKeysSet.add(sn.replace(/^0+/, ''));
      }
      if (mr.studentName) {
        studentKeysSet.add(String(mr.studentName).trim().toLowerCase());
        if (!resetStudentNames.includes(mr.studentName)) {
          resetStudentNames.push(mr.studentName);
        }
      }

      // Also look up in users list
      const u = (current.users || []).find((usr: any) => 
        (mr.studentId && (usr.id === mr.studentId || usr.nisn === mr.studentId)) ||
        (mr.studentNisn && usr.nisn === mr.studentNisn) ||
        (mr.studentName && usr.name && usr.name.toLowerCase() === mr.studentName.toLowerCase())
      );
      if (u) {
        if (u.id) studentKeysSet.add(String(u.id).trim());
        if (u.nisn) {
          studentKeysSet.add(String(u.nisn).trim());
          studentKeysSet.add(String(u.nisn).trim().replace(/^0+/, ''));
        }
        if (u.username) studentKeysSet.add(String(u.username).trim().toLowerCase());
        if (u.name) studentKeysSet.add(String(u.name).trim().toLowerCase());
      }

      const keysList = Array.from(studentKeysSet);
      markQuizResultReset(quizId, keysList);
      for (const k of keysList) {
        const compKey = `${quizId}::${k}`;
        if (!current.resetQuizKeys.includes(compKey)) {
          current.resetQuizKeys.push(compKey);
        }
      }
    }

    // Remove matching results from current.quizResults
    const matchIds = new Set(matchingResults.map((r: any) => r.id));
    current.quizResults = current.quizResults.filter((r: any) => !matchIds.has(r.id));

    current.updatedAt = new Date().toISOString();
    writeAppData(current, 'bulk_quiz_reset');

    // Notify Google Apps Script in background
    const config = readConfig();
    const webhookUrl = (customWebhook || req.body?.webhookUrl || config.webhookUrl || '').trim();
    if (webhookUrl && webhookUrl.includes('script.google.com/macros/s/')) {
      (async () => {
        for (const mr of matchingResults) {
          try {
            await callGasServer(webhookUrl, 'deleteQuizResult', {
              quizId,
              studentId: mr.studentId,
              studentNisn: mr.studentNisn,
              studentName: mr.studentName,
              resultId: mr.id,
              id: mr.id
            });
          } catch (e) {}
        }
      })().catch(() => {});
    }

    broadcastRealtimeUpdate('DATA_UPDATED');

    console.log(`[Bulk Quiz Reset] Kuis ${quizId} di-reset untuk ${matchingResults.length} siswa (Kriteria: ${filterType}, Ambang: ${numThreshold})`);
    res.json({
      success: true,
      count: matchingResults.length,
      studentNames: resetStudentNames,
      message: `Berhasil memberikan pengulangan kuis untuk ${matchingResults.length} siswa.`
    });
  } catch (err: any) {
    console.error('Error during bulk quiz reset:', err);
    res.status(500).json({ success: false, error: err.message || 'Gagal mereset kuis massal' });
  }
});

// Dedicated endpoint to permanently delete a user and prevent resurrection
app.post('/api/users/delete', async (req, res) => {
  try {
    const { id, nisn, nik, username } = req.body || {};
    if (!id && !nisn && !nik && !username) {
      return res.status(400).json({ success: false, error: 'Identitas pengguna wajib dikirimkan' });
    }

    const current = readAppData();
    if (!Array.isArray(current.deletedUserKeys)) {
      current.deletedUserKeys = [];
    }

    // Add all identifiers to tombstone list
    const candidateKeys = [id, nisn, nik, username].filter(Boolean).map(s => String(s).trim());
    for (const k of candidateKeys) {
      if (!current.deletedUserKeys.includes(k)) {
        current.deletedUserKeys.push(k);
      }
    }

    // Permanently filter out from server memory
    current.users = current.users.filter((u: any) => {
      if (u.role === 'SUPER_ADMIN' || u.username === 'rafx2' || u.id === 'sa-1') return true;
      if (id && u.id === id) return false;
      if (nisn && u.nisn && String(u.nisn).trim() === String(nisn).trim()) return false;
      if (nik && u.nik && String(u.nik).trim() === String(nik).trim()) return false;
      if (username && u.username && String(u.username).trim().toLowerCase() === String(username).trim().toLowerCase()) return false;
      return true;
    });

    current.updatedAt = new Date().toISOString();
    writeAppData(current);

    // Call GAS Webhook to permanently delete row(s) in Google Sheets
    const config = readConfig();
    const webhookUrl = (config.webhookUrl || '').trim();
    if (webhookUrl && webhookUrl.includes('script.google.com/macros/s/')) {
      callGasServer(webhookUrl, 'deleteUser', { id, nisn, nik, username }).catch(err => {
        console.warn('[GAS Delete User Notice]:', err.message);
      });
    }

    res.json({ success: true, message: 'Pengguna berhasil dihapus permanen dari server dan Google Sheet' });
  } catch (err: any) {
    console.error('Error in /api/users/delete:', err);
    res.status(500).json({ success: false, error: err.message || 'Gagal menghapus pengguna' });
  }
});

// File upload endpoint for student assignments and media
const uploadsDir = path.join(dataDir, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

app.post('/api/upload', (req, res) => {
  try {
    const { fileName, fileData } = req.body || {};
    if (!fileName || !fileData) {
      return res.status(400).json({ success: false, error: 'Nama dan data berkas diperlukan' });
    }
    const base64Data = fileData.replace(/^data:[^;]+;base64,/, '');
    const ext = path.extname(fileName) || '';
    const safeBaseName = path.basename(fileName, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    const cleanFileName = `tugas_${Date.now()}_${safeBaseName}${ext}`;
    const filePath = path.join(uploadsDir, cleanFileName);
    fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
    const fileUrl = `/uploads/${cleanFileName}`;
    res.json({ success: true, fileUrl, fileName: cleanFileName });
  } catch (err: any) {
    console.error('Upload error:', err);
    res.status(500).json({ success: false, error: 'Gagal mengunggah berkas' });
  }
});

// Endpoint to purge initial sample/mock data from server and Google Sheets
app.post('/api/clean-samples', async (_req, res) => {
  try {
    const appData = readAppData();
    // 1. Clean sample quizzes
    appData.quizzes = (appData.quizzes || []).filter((q: any) => 
      !q.title?.toLowerCase().includes('aljabar dasar') &&
      !q.title?.toLowerCase().includes('bangun datar') &&
      q.id !== 'q-1' && q.id !== 'quiz-1' && q.id !== 'quiz-cbt-1'
    );
    // 2. Clean sample materials
    appData.materials = (appData.materials || []).filter((m: any) => {
      const mId = String(m?.id || '').toLowerCase();
      return mId !== 'm-1' && mId !== 'm-demo';
    });
    // 2b. Clean sample assignments
    appData.assignments = (appData.assignments || []).filter((a: any) => {
      const sId = String(a.studentId || '').toLowerCase();
      const mId = String(a.materialId || '').toLowerCase();
      const file = String(a.fileName || '').toLowerCase();
      const link = String(a.link || '').toLowerCase();
      return sId !== 'student-1' && sId !== 'student-test-1' && !sId.includes('test') &&
        mId !== 'm-1' && mId !== 'm-demo' && !mId.includes('test') &&
        !file.includes('test') && !link.includes('test') && !file.includes('contoh');
    });
    // 2c. Clean sample quiz results
    appData.quizResults = (appData.quizResults || []).filter((qr: any) => {
      const sId = String(qr.studentId || '').toLowerCase();
      const qId = String(qr.quizId || '').toLowerCase();
      const sName = String(qr.studentName || '').toLowerCase();
      return sId !== 'student-1' && sId !== 'student-test-1' && !sId.includes('test') &&
        qId !== 'q-1' && qId !== 'quiz-1' && qId !== 'quiz-cbt-1' && !qId.includes('test') &&
        !sName.includes('contoh') && !sName.includes('percobaan') && !sName.includes('dummy');
    });
    // 3. Clean sample users
    appData.users = (appData.users || []).filter((u: any) => {
      const nameLower = (u.name || '').toLowerCase();
      const isSample = u.id === 'student-1' || u.id === 'teacher-1' || nameLower.includes('contoh') || nameLower.includes('percobaan') || nameLower.includes('sample');
      return !isSample;
    });
    // Ensure Super Admin remains
    if (!appData.users.some((u: any) => u.role === 'SUPER_ADMIN')) {
      appData.users.unshift({ id: 'sa-1', role: 'SUPER_ADMIN', name: 'Super Administrator', username: 'rafx2' });
    }
    appData.updatedAt = new Date().toISOString();
    writeAppData(appData);

    // Call GAS to clean sample data in Google Sheets as well
    const config = readConfig();
    const webhookUrl = (config.webhookUrl || '').trim();
    if (webhookUrl && webhookUrl.includes('script.google.com/macros/s/')) {
      await callGasServer(webhookUrl, 'cleanInitialSampleData', {}).catch(() => {});
      await callGasServer(webhookUrl, 'syncAllData', {
        users: appData.users,
        quizzes: appData.quizzes,
        materials: appData.materials,
        quizResults: appData.quizResults,
        assignments: appData.assignments
      }).catch(() => {});
    }

    res.json({ success: true, message: 'Data contoh awal berhasil dibersihkan dari server dan Google Sheet' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Dedicated user change password API endpoint with automatic Google Sheets Webhook sync
app.post('/api/users/change-password', async (req, res) => {
  try {
    const { userId, nisn, nik, username, newPassword } = req.body || {};
    if ((!userId && !nisn && !nik && !username) || !newPassword || typeof newPassword !== 'string' || newPassword.trim().length < 6) {
      return res.status(400).json({ success: false, error: 'Identitas pengguna dan kata sandi baru (minimal 6 karakter) diperlukan' });
    }

    const cleanPass = newPassword.trim();
    const appData = readAppData();
    const cleanNisn = nisn ? String(nisn).trim() : '';
    const cleanNik = nik ? String(nik).trim() : '';
    const cleanUser = username ? String(username).trim().toLowerCase() : '';

    const userIndex = appData.users.findIndex((u: any) => 
      (userId && u.id === userId) ||
      (cleanNisn && u.nisn && String(u.nisn).trim() === cleanNisn) ||
      (cleanNik && u.nik && String(u.nik).trim() === cleanNik) ||
      (cleanUser && u.username && String(u.username).trim().toLowerCase() === cleanUser)
    );

    if (userIndex === -1) {
      return res.status(404).json({ success: false, error: 'Pengguna tidak ditemukan di database server' });
    }

    // 1. Update in local server cache and permanent customPasswords index
    appData.users[userIndex].password = cleanPass;
    if (!appData.customPasswords) appData.customPasswords = {};
    const targetUser = appData.users[userIndex];
    const keys = getUserPrimaryKeys(targetUser);
    for (const k of keys) {
      appData.customPasswords[k] = cleanPass;
    }
    appData.updatedAt = new Date().toISOString();
    writeAppData(appData);

    // 2. Synchronize directly with Google Apps Script Webhook
    const config = readConfig();
    const webhookUrl = (config.webhookUrl || '').trim();
    let gasResult = null;
    if (webhookUrl && webhookUrl.includes('script.google.com/macros/s/')) {
      try {
        gasResult = await callGasServer(webhookUrl, 'changePassword', {
          id: targetUser.id,
          nisn: targetUser.nisn,
          nik: targetUser.nik,
          username: targetUser.username,
          name: targetUser.name,
          password: cleanPass
        });
        // Also call updateUser in GAS as extra guarantee to update row
        callGasServer(webhookUrl, 'updateUser', {
          id: targetUser.id,
          nisn: targetUser.nisn,
          nik: targetUser.nik,
          username: targetUser.username,
          data: { password: cleanPass },
          password: cleanPass
        }).catch(() => {});
      } catch (gasErr: any) {
        console.warn('[ChangePassword GAS Sync Warning]:', gasErr.message);
      }
    }

    res.json({
      success: true,
      message: 'Kata sandi berhasil diperbarui dan tersimpan permanen di database server dan Google Sheet',
      gasSynced: Boolean(gasResult && gasResult.success)
    });
  } catch (err: any) {
    console.error('Error in change-password endpoint:', err);
    res.status(500).json({ success: false, error: err.message || 'Gagal mengubah kata sandi di server' });
  }
});

// Batch users sync / import from any browser
app.post('/api/data/users', (req, res) => {
  try {
    const { newUsers, replace } = req.body || {};
    if (!Array.isArray(newUsers)) {
      return res.status(400).json({ success: false, error: 'newUsers harus berupa array' });
    }

    const current = readAppData();
    let finalUsers: any[] = [];

    if (replace) {
      finalUsers = [...newUsers];
    } else {
      const userMap = new Map<string, any>();
      for (const u of current.users) {
        userMap.set(u.id, u);
      }
      for (const nu of newUsers) {
        if (!nu.id) nu.id = `user-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
        userMap.set(nu.id, nu);
      }
      finalUsers = Array.from(userMap.values());
    }

    if (!finalUsers.some((u: any) => u.role === 'SUPER_ADMIN')) {
      finalUsers.unshift({ id: 'sa-1', role: 'SUPER_ADMIN', name: 'Super Administrator', username: 'rafx2' });
    }

    current.users = finalUsers;
    current.updatedAt = new Date().toISOString();
    writeAppData(current);

    res.json({ success: true, count: finalUsers.length });
  } catch (err: any) {
    console.error('Error importing users:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Proxy for Google Apps Script Webhook (prevents CORS, timeout and browser-specific issues)
app.post('/api/gas-proxy', async (req, res) => {
  try {
    const config = readConfig();
    const targetUrl = (req.body && req.body.webhookUrl) || config.webhookUrl;
    if (!targetUrl) {
      return res.status(400).json({ success: false, error: 'Webhook URL belum dikonfigurasi di sistem' });
    }

    const payload = req.body && req.body.payload ? req.body.payload : req.body;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 35000);

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify(payload),
      redirect: 'follow',
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return res.status(response.status).json({ success: false, error: `GAS Server HTTP ${response.status}` });
    }

    const data = await response.json();
    res.json(data);
  } catch (err: any) {
    console.error('GAS proxy error:', err);
    res.status(500).json({ success: false, error: err.message || 'Koneksi ke Google Apps Script gagal' });
  }
});

// Vite middleware in dev or static serving in production
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, 'dist');
  app.use(express.static(distPath));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
} else {
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa'
  });
  app.use(vite.middlewares);
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on port ${PORT}`);

  // Auto-sync with Google Sheets on server boot
  setTimeout(() => {
    const config = readConfig();
    if (config.webhookUrl && config.webhookUrl.includes('script.google.com/macros/s/')) {
      console.log('[Startup] Memulai sinkronisasi otomatis database Google Sheet & pembersihan sampel...');
      callGasServer(config.webhookUrl, 'cleanInitialSampleData', {}).catch(() => {});
      syncServerWithGoogleSheets().catch((err) => console.warn('[Startup Sync Notice]:', err.message));
    }
  }, 2000);

  // Periodic background realtime sync every 20 seconds
  setInterval(() => {
    const config = readConfig();
    if (config.webhookUrl && config.webhookUrl.includes('script.google.com/macros/s/')) {
      syncServerWithGoogleSheets().catch(() => {});
    }
  }, 20 * 1000);
});
