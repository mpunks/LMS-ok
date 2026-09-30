import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

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
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
    
    // Also save to .env for persistent restarts
    if (config.webhookUrl) {
      try {
        const envPath = path.join(__dirname, '.env');
        let envContent = '';
        if (fs.existsSync(envPath)) {
          envContent = fs.readFileSync(envPath, 'utf-8');
        }
        if (envContent.includes('VITE_GAS_WEBHOOK_URL=')) {
          envContent = envContent.replace(/VITE_GAS_WEBHOOK_URL=.*/g, `VITE_GAS_WEBHOOK_URL="${config.webhookUrl}"`);
        } else {
          envContent += `\nVITE_GAS_WEBHOOK_URL="${config.webhookUrl}"\n`;
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

// Primary key detection helpers
function getUserPrimaryKeys(u: any): string[] {
  if (!u) return [];
  const keys: string[] = [];
  if (u.id) keys.push(String(u.id).trim());
  if (u.nisn && String(u.nisn).trim()) keys.push(String(u.nisn).trim());
  if (u.nik && String(u.nik).trim()) keys.push(String(u.nik).trim());
  if (u.username && String(u.username).trim()) keys.push(String(u.username).trim().toLowerCase());
  return keys;
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

function readAppData() {
  try {
    if (fs.existsSync(APP_DATA_FILE)) {
      const data = fs.readFileSync(APP_DATA_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      if (parsed && Array.isArray(parsed.users)) {
        if (Array.isArray(parsed.quizzes)) {
          parsed.quizzes = parsed.quizzes.filter((q: any) => 
            !q.title?.toLowerCase().includes('bangun datar') && 
            !q.title?.toLowerCase().includes('aljabar dasar') &&
            q.id !== 'quiz-cbt-1' && 
            q.id !== 'quiz-1' &&
            q.id !== 'q-1'
          );
        }
        if (!Array.isArray(parsed.assignments)) {
          parsed.assignments = [];
        }
        if (!Array.isArray(parsed.deletedUserKeys)) {
          parsed.deletedUserKeys = [];
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

function writeAppData(data: any) {
  try {
    fs.writeFileSync(APP_DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
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

          const isExistingCustom = existing?.password && 
            existing.password !== u.nisn && 
            existing.password !== u.nik && 
            existing.password !== '123456';
          
          const isGasCustom = u.password && 
            u.password !== u.nisn && 
            u.password !== u.nik && 
            u.password !== '123456';

          const finalPass = savedCustomPass || 
            (isExistingCustom ? existing.password : (isGasCustom ? u.password : (existing?.password || u.password || u.nisn || u.nik || '123456')));

          // If a custom password is found, cache it in customPasswords dictionary
          if (savedCustomPass || isExistingCustom || isGasCustom) {
            const passToCache = savedCustomPass || (isExistingCustom ? existing.password : u.password);
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

      const updated = {
        ...current,
        users: updatedUsers,
        materials: Array.isArray(res.materials) && res.materials.length > 0 ? res.materials : current.materials,
        quizzes: Array.isArray(res.quizzes) && res.quizzes.length > 0 ? res.quizzes : current.quizzes,
        quizResults: Array.isArray(res.quizResults) && res.quizResults.length > 0 ? res.quizResults : current.quizResults,
        assignments: Array.isArray(res.assignments) && res.assignments.length > 0 ? res.assignments : (current.assignments || []),
        updatedAt: new Date().toISOString()
      };

      writeAppData(updated);
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
app.get('/api/data', (_req, res) => {
  const data = readAppData();
  res.json({ success: true, data });
});

app.post('/api/data', (req, res) => {
  try {
    const current = readAppData();
    const incoming = req.body || {};
    
    const cleanQuizzes = (Array.isArray(incoming.quizzes) ? incoming.quizzes : current.quizzes)
      .filter((q: any) => !q.title?.includes('Bangun Datar & Aljabar') && q.id !== 'quiz-cbt-1' && q.id !== 'quiz-1');

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

    const updated = {
      ...current,
      users: finalUsers,
      materials: Array.isArray(incoming.materials) ? incoming.materials : current.materials,
      quizzes: cleanQuizzes,
      quizResults: Array.isArray(incoming.quizResults) ? incoming.quizResults : current.quizResults,
      assignments: Array.isArray(incoming.assignments) ? incoming.assignments : (current.assignments || []),
      deletedUserKeys: current.deletedUserKeys,
      customPasswords: current.customPasswords,
      updatedAt: new Date().toISOString()
    };

    writeAppData(updated);

    // Auto-forward to Google Apps Script Webhook asynchronously so Google Sheets is always up-to-date!
    const config = readConfig();
    const webhookUrl = (config.webhookUrl || '').trim();
    if (webhookUrl && webhookUrl.includes('script.google.com/macros/s/')) {
      callGasServer(webhookUrl, 'syncAllData', {
        users: updated.users,
        quizzes: updated.quizzes,
        materials: updated.materials,
        quizResults: updated.quizResults,
        assignments: updated.assignments
      }).catch(err => console.warn('[Auto GAS Sync Error]:', err.message));
    }

    res.json({ success: true, message: 'Data berhasil disimpan di server dan disinkronkan', data: updated });
  } catch (err: any) {
    console.error('Error saving app data:', err);
    res.status(500).json({ success: false, error: err.message || 'Gagal menyimpan data di server' });
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
    appData.materials = (appData.materials || []).filter((m: any) =>
      m.id !== 'm-1' && m.id !== 'm-demo' && !m.title?.toLowerCase().includes('contoh')
    );
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
    const { userId, newPassword } = req.body || {};
    if (!userId || !newPassword || typeof newPassword !== 'string' || newPassword.trim().length < 6) {
      return res.status(400).json({ success: false, error: 'ID Pengguna dan kata sandi baru (minimal 6 karakter) diperlukan' });
    }

    const cleanPass = newPassword.trim();
    const appData = readAppData();
    const userIndex = appData.users.findIndex((u: any) => u.id === userId);
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
          password: cleanPass
        });
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

  // Periodic background sync every 3 minutes
  setInterval(() => {
    const config = readConfig();
    if (config.webhookUrl && config.webhookUrl.includes('script.google.com/macros/s/')) {
      syncServerWithGoogleSheets().catch(() => {});
    }
  }, 3 * 60 * 1000);
});
