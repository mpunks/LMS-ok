import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useGasStore } from './gasStore';
import { useAuthStore } from './authStore';
import { isResultMatchStudent } from '../lib/utils';
import { 
  User, 
  Material, 
  Quiz, 
  QuizResult, 
  DatabaseCleanOptions, 
  DatabaseCleanSummary,
  PromotionOptions,
  PromotionSummary,
  DeduplicationSummary,
  OfflineQueueItem
} from '../types';

interface DataState {
  users: User[];
  materials: Material[];
  quizzes: Quiz[];
  quizResults: QuizResult[];
  assignments?: any[];
  deletedUserKeys?: string[];
  customPasswords?: Record<string, string>;
  resetQuizKeys?: string[];
  offlineQueue?: OfflineQueueItem[];
  enqueueOfflineAction: (type: OfflineQueueItem['type'], payload: any) => void;
  processOfflineQueue: () => Promise<void>;
  
  // Users (Admin, Teacher, Student)
  addUser: (user: User) => Promise<void>;
  addUsers: (users: User[]) => Promise<void>;
  updateUser: (id: string, data: Partial<User>) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  resetPassword: (id: string, defaultPassword: string) => Promise<void>;
  changePassword: (id: string, newPassword: string) => Promise<{ success: boolean; message?: string }>;

  // Student Lifecycle Management
  deleteAllStudents: () => Promise<number>;
  promoteStudents: (options: PromotionOptions) => Promise<PromotionSummary>;
  deduplicateUsers: () => Promise<DeduplicationSummary>;

  // Materials
  addMaterial: (material: Material) => Promise<void>;
  updateMaterial: (id: string, data: Partial<Material>) => Promise<void>;
  deleteMaterial: (id: string) => Promise<void>;
  markMaterialAsRead: (studentId: string, materialId: string) => Promise<void>;

  // Quizzes
  addQuiz: (quiz: Quiz) => Promise<void>;
  updateQuiz: (id: string, data: Partial<Quiz>) => Promise<void>;
  deleteQuiz: (id: string) => Promise<void>;
  submitQuiz: (result: QuizResult) => Promise<void>;
  updateQuizResult: (id: string, data: Partial<QuizResult>) => Promise<void>;
  deleteQuizResult: (id: string) => Promise<void>;
  resetStudentQuiz: (quizId: string, studentId: string, studentNisn?: string, studentName?: string, resultId?: string) => Promise<boolean>;
  resetBulkStudentQuiz: (quizId: string, options: { filterType: 'below_threshold' | 'disqualified' | 'all' | 'selected'; threshold?: number; studentIds?: string[] }) => Promise<{ count: number; studentNames: string[] }>;
  syncQuizToGas: (quizId: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  syncAllToGas: () => Promise<{ success: boolean; message?: string; error?: string }>;
  pullAllFromGas: () => Promise<boolean>;
  pullUsersFromGas: () => Promise<boolean>;
  pullAllFromServer: (forceGasSync?: boolean) => Promise<boolean>;

  // Assignments
  submitAssignment: (studentId: string, materialId: string, link: string, fileName?: string, fileSize?: number) => Promise<void>;
  gradeAssignment: (studentId: string, materialId: string, grade: number, feedback?: string) => Promise<void>;

  activeEditingQuizId?: string | null;
  setActiveEditingQuizId: (id: string | null) => void;

  // Super Admin Database Maintenance
  clearDatabase: (options: DatabaseCleanOptions) => Promise<DatabaseCleanSummary>;
  cleanInitialSamples: () => Promise<void>;
}

export const getUserPrimaryKeys = (u: any): string[] => {
  if (!u) return [];
  const keys: string[] = [];
  if (u.id) keys.push(String(u.id).trim());
  if (u.nisn && String(u.nisn).trim()) {
    const raw = String(u.nisn).trim();
    keys.push(raw);
    const noZero = raw.replace(/^0+/, '');
    if (noZero && noZero !== raw) keys.push(noZero);
  }
  if (u.nik && String(u.nik).trim()) keys.push(String(u.nik).trim());
  if (u.username && String(u.username).trim()) keys.push(String(u.username).trim().toLowerCase());
  if (u.name && String(u.name).trim()) keys.push(String(u.name).trim().toLowerCase());
  return keys;
};

export const isUserInDeletedList = (u: any, deletedKeys: string[] = []): boolean => {
  if (!u || !Array.isArray(deletedKeys) || deletedKeys.length === 0) return false;
  if (u.role === 'SUPER_ADMIN' || u.username === 'rafx2' || u.id === 'sa-1') return false;
  const userKeys = getUserPrimaryKeys(u);
  return userKeys.some(k => deletedKeys.includes(k) || deletedKeys.includes(k.toLowerCase()));
};

export const findExistingUserMatch = (list: User[], candidate: any): User | undefined => {
  if (!candidate) return undefined;
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
  return undefined;
};

const syncToServer = async (payload: { users?: User[]; materials?: Material[]; quizzes?: Quiz[]; quizResults?: QuizResult[]; assignments?: any[]; customPasswords?: Record<string, string>; deletedUserKeys?: string[] }) => {
  try {
    await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (err) {
    // Non-blocking background sync
    console.warn('Server sync background notice:', err);
  }
};

const syncToGas = async (action: string, payload: any) => {
  const gasStore = useGasStore.getState();
  let url = gasStore.webhookUrl?.trim();
  if (!url) {
    url = await gasStore.fetchServerConfig();
  }
  if (url && url.includes('script.google.com/macros/s/')) {
    try {
      const res = await gasStore.executeAction(action, payload);
      if (!res?.success) {
        console.warn(`GAS Sync Notice for ${action}:`, res?.error || 'Gagal sinkronisasi');
      }
      return res;
    } catch (e: any) {
      console.warn(`GAS Sync Warning for ${action}:`, e?.message || e);
      return { success: false, error: e?.message };
    }
  }
  return { success: false, error: 'GAS not connected' };
};

export const useDataStore = create<DataState>()(
  persist(
    (set, get) => ({
      users: [
        { id: 'sa-1', role: 'SUPER_ADMIN', name: 'Super Administrator', username: 'rafx2' } as User
      ],
      materials: [] as Material[],
      quizzes: [] as Quiz[],
      quizResults: [] as QuizResult[],
      assignments: [] as any[],
      deletedUserKeys: [] as string[],
      customPasswords: {} as Record<string, string>,
      offlineQueue: [] as OfflineQueueItem[],
      activeEditingQuizId: null as string | null,

      setActiveEditingQuizId: (id: string | null) => set({ activeEditingQuizId: id }),

      enqueueOfflineAction: (type, payload) => {
        const item: OfflineQueueItem = {
          id: `queue-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          type,
          payload,
          createdAt: new Date().toISOString(),
          retries: 0
        };
        set(state => ({
          offlineQueue: [...(state.offlineQueue || []).filter(q => !(q.type === type && JSON.stringify(q.payload) === JSON.stringify(payload))), item]
        }));
      },

      processOfflineQueue: async () => {
        const queue = get().offlineQueue || [];
        if (queue.length === 0 || !navigator.onLine) return;

        const remainingQueue: OfflineQueueItem[] = [];
        for (const item of queue) {
          try {
            if (item.type === 'SUBMIT_QUIZ') {
              const res = await fetch('/api/quizzes/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(item.payload.result || item.payload)
              });
              if (!res.ok) throw new Error('Server submit quiz error');
              await syncToGas('submitQuiz', item.payload);
            } else if (item.type === 'SUBMIT_ASSIGNMENT') {
              const res = await fetch('/api/assignments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(item.payload)
              });
              if (!res.ok) throw new Error('Server submit assignment error');
              await syncToGas('submitAssignment', item.payload);
            } else if (item.type === 'GRADE_ASSIGNMENT') {
              const res = await fetch('/api/assignments/grade', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(item.payload)
              });
              if (!res.ok) throw new Error('Server grade assignment error');
              await syncToGas('gradeAssignment', item.payload);
            }
          } catch (e) {
            if (item.retries < 5) {
              remainingQueue.push({ ...item, retries: item.retries + 1 });
            }
          }
        }
        set({ offlineQueue: remainingQueue });
      },

      // Actions
      addUser: async (user) => {
        set(state => {
          // Check if already exists to prevent duplication
          const exists = state.users.some(u => 
            u.id === user.id || 
            (user.role === 'STUDENT' && user.nisn && u.nisn === user.nisn) ||
            (user.role === 'TEACHER' && user.username && u.username === user.username)
          );
          if (exists) {
            return {
              users: state.users.map(u => 
                (u.id === user.id || (user.role === 'STUDENT' && user.nisn && u.nisn === user.nisn))
                  ? { ...u, ...user }
                  : u
              )
            };
          }
          return { users: [...state.users, user] };
        });
        const currentUsers = useDataStore.getState().users;
        syncToServer({ users: currentUsers });
        await syncToGas('addUser', { user });
      },
      addUsers: async (newUsers) => {
        if (newUsers.length === 0) return;
        set(state => {
          const userMap = new Map<string, User>();
          
          // Index existing users
          for (const u of state.users) {
            if (u.role === 'STUDENT') {
              const key = u.nisn && u.nisn.trim() 
                ? `student:nisn:${u.nisn.trim()}` 
                : `student:name:${u.name.toLowerCase().trim()}::${(u.classId || '').toUpperCase().trim()}`;
              userMap.set(key, u);
            } else if (u.role === 'TEACHER') {
              const key = u.username && u.username.trim()
                ? `teacher:user:${u.username.trim().toLowerCase()}`
                : (u.nik && u.nik.trim() ? `teacher:nik:${u.nik.trim()}` : `teacher:name:${u.name.toLowerCase().trim()}`);
              userMap.set(key, u);
            } else {
              userMap.set(`admin:${u.username || u.id}`, u);
            }
          }

          // Process incoming users: update existing if match, otherwise append
          for (const nu of newUsers) {
            if (nu.role === 'STUDENT') {
              const key = nu.nisn && nu.nisn.trim() 
                ? `student:nisn:${nu.nisn.trim()}` 
                : `student:name:${nu.name.toLowerCase().trim()}::${(nu.classId || '').toUpperCase().trim()}`;
              
              if (userMap.has(key)) {
                const existing = userMap.get(key)!;
                userMap.set(key, {
                  ...existing,
                  ...nu,
                  id: existing.id // preserve existing id
                });
              } else {
                userMap.set(key, nu);
              }
            } else if (nu.role === 'TEACHER') {
              const key = nu.username && nu.username.trim()
                ? `teacher:user:${nu.username.trim().toLowerCase()}`
                : (nu.nik && nu.nik.trim() ? `teacher:nik:${nu.nik.trim()}` : `teacher:name:${nu.name.toLowerCase().trim()}`);
              
              if (userMap.has(key)) {
                const existing = userMap.get(key)!;
                userMap.set(key, {
                  ...existing,
                  ...nu,
                  id: existing.id
                });
              } else {
                userMap.set(key, nu);
              }
            } else {
              const key = `admin:${nu.username || nu.id}`;
              if (userMap.has(key)) {
                const existing = userMap.get(key)!;
                userMap.set(key, { ...existing, ...nu, id: existing.id });
              } else {
                userMap.set(key, nu);
              }
            }
          }

          return { users: Array.from(userMap.values()) };
        });

        const allUsers = useDataStore.getState().users;
        syncToServer({ users: allUsers });
        await syncToGas('setAllUsers', { users: allUsers });
      },
      updateUser: async (id, data) => {
        set(state => {
          const passMap = { ...(state.customPasswords || {}) };
          if (data.password && data.password.trim() && data.password !== '123456') {
            passMap[id] = data.password.trim();
          }
          return { 
            users: state.users.map(u => u.id === id ? { ...u, ...data } : u),
            customPasswords: passMap
          };
        });
        const allUsers = useDataStore.getState().users;
        syncToServer({ users: allUsers });
        const userObj = allUsers.find(u => u.id === id);
        await syncToGas('updateUser', { 
          id, 
          nisn: userObj?.nisn, 
          nik: userObj?.nik, 
          username: userObj?.username, 
          data, 
          password: data.password 
        });
      },
      deleteUser: async (id) => {
        const userToDelete = get().users.find(u => u.id === id);
        const candidateKeys = getUserPrimaryKeys(userToDelete);
        if (id && !candidateKeys.includes(id)) candidateKeys.push(id);

        set(state => ({
          users: state.users.filter(u => {
            if (u.id === id) return false;
            if (userToDelete?.nisn && u.nisn && u.nisn.trim() === userToDelete.nisn.trim()) return false;
            if (userToDelete?.nik && u.nik && u.nik.trim() === userToDelete.nik.trim()) return false;
            if (userToDelete?.username && u.username && u.username.trim().toLowerCase() === userToDelete.username.trim().toLowerCase()) return false;
            return true;
          }),
          deletedUserKeys: Array.from(new Set([...(state.deletedUserKeys || []), ...candidateKeys]))
        }));

        // Send to server permanent tombstone deletion endpoint
        try {
          await fetch('/api/users/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id,
              nisn: userToDelete?.nisn,
              nik: userToDelete?.nik,
              username: userToDelete?.username
            })
          });
        } catch (e) {}

        const remainingUsers = useDataStore.getState().users;
        syncToServer({ users: remainingUsers });
        await syncToGas('deleteUser', { 
          id, 
          nisn: userToDelete?.nisn, 
          nik: userToDelete?.nik, 
          username: userToDelete?.username 
        });
      },
      resetPassword: async (id, defaultPassword) => {
        set(state => {
          const passMap = { ...(state.customPasswords || {}) };
          delete passMap[id];
          return {
            users: state.users.map(u => u.id === id ? { ...u, password: defaultPassword } : u),
            customPasswords: passMap
          };
        });
        syncToServer({ users: useDataStore.getState().users });
        await syncToGas('resetPassword', { id, password: defaultPassword });
      },
      changePassword: async (id: string, newPassword: string) => {
        const cleanPass = newPassword.trim();
        const user = get().users.find(u => u.id === id);
        const candidateKeys = getUserPrimaryKeys(user);
        if (id && !candidateKeys.includes(id)) candidateKeys.push(id);

        // 1. Update state and permanent customPasswords index
        set(state => {
          const passMap = { ...(state.customPasswords || {}) };
          for (const k of candidateKeys) {
            passMap[k] = cleanPass;
          }
          return {
            users: state.users.map(u => (u.id === id || (user?.nisn && u.nisn === user.nisn)) ? { ...u, password: cleanPass } : u),
            customPasswords: passMap
          };
        });
        
        // 2. Sync to server /api/data and /api/users/change-password
        const updatedUsers = get().users;
        const currentCustomPasswords = get().customPasswords;
        syncToServer({ users: updatedUsers, customPasswords: currentCustomPasswords });
        
        try {
          await fetch('/api/users/change-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: id,
              nisn: user?.nisn,
              nik: user?.nik,
              username: user?.username,
              name: user?.name,
              newPassword: cleanPass
            })
          });
        } catch (e) {}

        // 3. Direct Google Apps Script sync with multiple match keys
        const res = await syncToGas('changePassword', {
          id,
          nisn: user?.nisn,
          nik: user?.nik,
          username: user?.username,
          name: user?.name,
          password: cleanPass
        });
        
        // Also call updateUser in GAS as extra fallback guarantee
        await syncToGas('updateUser', {
          id,
          nisn: user?.nisn,
          nik: user?.nik,
          username: user?.username,
          name: user?.name,
          data: { password: cleanPass },
          password: cleanPass
        }).catch(() => {});

        return res || { success: true };
      },

      // Student Lifecycle Management
      deleteAllStudents: async () => {
        let deletedCount = 0;
        set(state => {
          const remaining = state.users.filter(u => {
            if (u.role === 'STUDENT') {
              deletedCount++;
              return false;
            }
            return true;
          });
          return { users: remaining };
        });

        await syncToGas('clearDatabase', { targets: ['Students'] });
        return deletedCount;
      },

      promoteStudents: async (options) => {
        let count7To8 = 0;
        let count8To9 = 0;
        let count9 = 0;

        set(state => {
          const updatedUsers: User[] = [];

          for (const u of state.users) {
            if (u.role !== 'STUDENT') {
              updatedUsers.push(u);
              continue;
            }

            const currentClass = (u.classId || '').trim().toUpperCase();

            if (currentClass.startsWith('7')) {
              // 7A -> 8A, 7B -> 8B ... 7L -> 8L
              const suffix = currentClass.substring(1);
              const newClass = `8${suffix}`;
              updatedUsers.push({
                ...u,
                classId: newClass,
                status: 'ACTIVE'
              });
              count7To8++;
            } else if (currentClass.startsWith('8')) {
              // 8A -> 9A, 8B -> 9B ... 8K -> 9K
              const suffix = currentClass.substring(1);
              let newClass = `9${suffix}`;
              if (suffix === 'L') {
                newClass = options.grade8LTarget || '9K';
              }
              updatedUsers.push({
                ...u,
                classId: newClass,
                status: 'ACTIVE'
              });
              count8To9++;
            } else if (currentClass.startsWith('9')) {
              count9++;
              if (options.grade9Action === 'DELETE') {
                // Permanently remove from database as requested
                continue;
              } else {
                // Mode Lulus / Alumni
                updatedUsers.push({
                  ...u,
                  classId: 'LULUS',
                  status: 'GRADUATED'
                });
              }
            } else {
              // Student with other class format, keep as is
              updatedUsers.push(u);
            }
          }

          return { users: updatedUsers };
        });

        // Sync new state to GAS
        const allUsers = useDataStore.getState().users;
        await syncToGas('setAllUsers', { users: allUsers });

        return {
          promotedGrade7To8: count7To8,
          promotedGrade8To9: count8To9,
          grade9Handled: count9,
          grade9Action: options.grade9Action,
          totalAffected: count7To8 + count8To9 + count9
        };
      },

      deduplicateUsers: async () => {
        let removedStudents = 0;
        let removedTeachers = 0;

        set(state => {
          const studentMap = new Map<string, User>();
          const teacherMap = new Map<string, User>();
          const otherUsers: User[] = [];

          for (const u of state.users) {
            if (u.role === 'STUDENT') {
              const key = u.nisn && u.nisn.trim() 
                ? `nisn:${u.nisn.trim()}` 
                : `name:${u.name.toLowerCase().trim()}::${(u.classId || '').toUpperCase().trim()}`;
              
              if (studentMap.has(key)) {
                removedStudents++;
                // Merge data
                const existing = studentMap.get(key)!;
                studentMap.set(key, {
                  ...existing,
                  gender: existing.gender || u.gender,
                  classId: existing.classId || u.classId,
                  nisn: existing.nisn || u.nisn
                });
              } else {
                studentMap.set(key, u);
              }
            } else if (u.role === 'TEACHER') {
              const key = u.username && u.username.trim()
                ? `user:${u.username.trim().toLowerCase()}`
                : (u.nik && u.nik.trim() ? `nik:${u.nik.trim()}` : `name:${u.name.toLowerCase().trim()}`);
              
              if (teacherMap.has(key)) {
                removedTeachers++;
                const existing = teacherMap.get(key)!;
                teacherMap.set(key, {
                  ...existing,
                  gender: existing.gender || u.gender,
                  subject: existing.subject || u.subject,
                  nik: existing.nik || u.nik
                });
              } else {
                teacherMap.set(key, u);
              }
            } else {
              // Admin/Super Admin
              if (!otherUsers.some(o => o.username === u.username || o.id === u.id)) {
                otherUsers.push(u);
              }
            }
          }

          return {
            users: [
              ...otherUsers,
              ...Array.from(teacherMap.values()),
              ...Array.from(studentMap.values())
            ]
          };
        });

        const currentUsers = get().users;
        await syncToGas('setAllUsers', { users: currentUsers });

        return {
          duplicatesRemoved: removedStudents + removedTeachers,
          studentsDeduplicated: removedStudents,
          teachersDeduplicated: removedTeachers,
          totalRemaining: currentUsers.length
        };
      },

      addMaterial: async (material: Material) => {
        set(state => {
          const exists = state.materials.some(m => m.id === material.id);
          if (exists) {
            return { materials: state.materials.map(m => m.id === material.id ? material : m) };
          }
          return { materials: [...state.materials, material] };
        });

        // Direct persistent endpoint
        try {
          await fetch('/api/materials', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ material })
          });
        } catch (e) {}

        await syncToServer({ materials: useDataStore.getState().materials });
        await syncToGas('addMaterial', { material });
      },
      updateMaterial: async (id: string, data: Partial<Material>) => {
        let updatedMat: Material | undefined;
        set(state => {
          const updatedList = state.materials.map(m => {
            if (m.id === id) {
              updatedMat = { ...m, ...data };
              return updatedMat;
            }
            return m;
          });
          return { materials: updatedList };
        });

        if (updatedMat) {
          try {
            await fetch('/api/materials', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ material: updatedMat })
            });
          } catch (e) {}
        }

        await syncToServer({ materials: useDataStore.getState().materials });
        await syncToGas('updateMaterial', { id, data });
      },
      deleteMaterial: async (id: string) => {
        set(state => ({ materials: state.materials.filter(m => m.id !== id) }));
        try {
          await fetch(`/api/materials/${id}`, { method: 'DELETE' });
        } catch (e) {}
        syncToServer({ materials: useDataStore.getState().materials });
        await syncToGas('deleteMaterial', { id });
      },
      markMaterialAsRead: async (studentId: string, materialId: string) => {
        await syncToGas('markMaterialAsRead', { studentId, materialId });
      },

      addQuiz: async (quiz: Quiz) => {
        set(state => ({ quizzes: [...state.quizzes, quiz] }));
        try {
          await fetch('/api/quizzes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ quiz })
          });
        } catch (e) {}
        syncToServer({ quizzes: useDataStore.getState().quizzes });
        await syncToGas('addQuiz', { quiz });
      },
      updateQuiz: async (id: string, data: Partial<Quiz>) => {
        let fullUpdatedQuiz: Quiz | undefined;
        set(state => {
          const updatedQuizzes = state.quizzes.map(q => {
            if (q.id === id) {
              fullUpdatedQuiz = { ...q, ...data };
              return fullUpdatedQuiz;
            }
            return q;
          });
          return { quizzes: updatedQuizzes };
        });
        if (fullUpdatedQuiz) {
          try {
            await fetch(`/api/quizzes/${id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ data, quiz: fullUpdatedQuiz })
            });
          } catch (e) {}
        }
        syncToServer({ 
          quizzes: useDataStore.getState().quizzes,
          quizResults: useDataStore.getState().quizResults 
        });
        if (fullUpdatedQuiz) {
          await syncToGas('updateQuiz', { id, data, quiz: fullUpdatedQuiz });
        }
      },
      deleteQuiz: async (id: string) => {
        set(state => ({ quizzes: state.quizzes.filter(q => q.id !== id) }));
        try {
          await fetch(`/api/quizzes/${id}`, { method: 'DELETE' });
        } catch (e) {}
        syncToServer({ quizzes: useDataStore.getState().quizzes });
        await syncToGas('deleteQuiz', { id });
      },
      syncQuizToGas: async (quizId: string) => {
        const quiz = get().quizzes.find(q => q.id === quizId);
        if (!quiz) return { success: false, error: 'Kuis tidak ditemukan' };
        const res = await syncToGas('saveQuiz', { quiz });
        return res;
      },
      syncAllToGas: async () => {
        const { users, quizzes, materials, quizResults, assignments } = get();
        const res = await syncToGas('syncAllData', { users, quizzes, materials, quizResults, assignments });
        return res;
      },
      pullAllFromGas: async () => {
        const gasStore = useGasStore.getState();
        if (!gasStore.isConnected && !gasStore.webhookUrl) {
          await gasStore.fetchServerConfig();
        }
        const res = await syncToGas('getAllData', {});
        if (res && res.success) {
          set(state => {
            const activeDeletedKeys = state.deletedUserKeys || [];
            const activeCustomPasswords = state.customPasswords || {};
            const currentUsers = state.users.filter(u => !isUserInDeletedList(u, activeDeletedKeys));
            const fetchedUsers: User[] = Array.isArray(res.users) ? res.users : [];
            
            const getIndexKey = (u: any) => {
              if (u.role === 'STUDENT' && u.nisn && String(u.nisn).trim()) return `student:nisn:${String(u.nisn).trim()}`;
              if (u.role === 'TEACHER' && u.username && String(u.username).trim()) return `teacher:user:${String(u.username).trim().toLowerCase()}`;
              if (u.role === 'TEACHER' && u.nik && String(u.nik).trim()) return `teacher:nik:${String(u.nik).trim()}`;
              if (u.username) return `user:${String(u.username).trim().toLowerCase()}`;
              return `id:${u.id}`;
            };

            const userMap = new Map<string, User>();
            for (const u of currentUsers) userMap.set(getIndexKey(u), u);

            for (const u of fetchedUsers) {
              if (isUserInDeletedList(u, activeDeletedKeys)) continue;
              const nameLower = (u.name || '').toLowerCase();
              if (u.id === 'student-1' || u.id === 'teacher-1' || nameLower.includes('contoh') || nameLower.includes('percobaan') || nameLower.includes('sample') || u.nisn === '1234567890') continue;

              const key = getIndexKey(u);
              const existing = userMap.get(key) || findExistingUserMatch(currentUsers, u);

              const uKeys = getUserPrimaryKeys(u);
              let customPass = '';
              for (const k of uKeys) {
                if (activeCustomPasswords[k]) {
                  customPass = activeCustomPasswords[k];
                  break;
                }
              }
              const isExistingCustom = existing?.password && existing.password !== u.nisn && existing.password !== u.nik && existing.password !== '123456';
              const isGasCustom = u.password && u.password !== u.nisn && u.password !== u.nik && u.password !== '123456';

              const finalPass = customPass || (isExistingCustom ? existing.password : (isGasCustom ? u.password : (existing?.password || u.password || u.nisn || u.nik || '123456')));

              userMap.set(key, {
                ...(existing || {}),
                ...u,
                id: (existing && existing.id) ? existing.id : u.id,
                password: finalPass
              });
            }

            // Ensure Super Admin exists
            if (!Array.from(userMap.values()).some(u => u.role === 'SUPER_ADMIN')) {
              userMap.set('id:sa-1', { id: 'sa-1', role: 'SUPER_ADMIN', name: 'Super Administrator', username: 'rafx2' } as User);
            }

            // Safely merge quizzes so existing rich questions (MCMA, ESSAY, images) are never stripped
            const quizMap = new Map<string, Quiz>();
            for (const q of (state.quizzes || [])) {
              if (q && q.id) quizMap.set(q.id, q);
            }
            if (Array.isArray(res.quizzes)) {
              for (const gq of res.quizzes) {
                if (gq && gq.id) {
                  const localQ = quizMap.get(gq.id);
                  if (state.activeEditingQuizId && gq.id === state.activeEditingQuizId && localQ) {
                    quizMap.set(gq.id, localQ);
                    continue;
                  }
                  const mergedQuestions = (Array.isArray(gq.questions) && gq.questions.length > 0)
                    ? gq.questions.map((gqQ: any, idx: number) => {
                        const lq = (localQ?.questions || []).find((q: any) => q.id === gqQ.id) || (localQ?.questions || [])[idx];
                        const mergedOpts = (Array.isArray(gqQ.options) && gqQ.options.length > 0) ? gqQ.options : (lq?.options || []);
                        const mergedOptImgs = (Array.isArray(gqQ.optionImages) && gqQ.optionImages.length > 0) ? gqQ.optionImages : (lq?.optionImages || []);
                        
                        let gqCorIndices: number[] = [];
                        if (Array.isArray(gqQ.correctOptionIndices)) {
                          gqCorIndices = gqQ.correctOptionIndices.map(Number);
                        } else if (typeof gqQ.correctOptionIndices === 'string' && gqQ.correctOptionIndices.trim()) {
                          try {
                            const p = JSON.parse(gqQ.correctOptionIndices);
                            if (Array.isArray(p)) gqCorIndices = p.map(Number);
                          } catch (e) {
                            const parts = gqQ.correctOptionIndices.replace(/[\[\]]/g, '').split(/[,;\s]+/).filter(Boolean);
                            gqCorIndices = parts.map((x: string) => {
                              const u = x.trim().toUpperCase();
                              if (/^[A-E]$/.test(u)) return u.charCodeAt(0) - 65;
                              const n = parseInt(x.trim(), 10);
                              return isNaN(n) ? 0 : n;
                            });
                          }
                        }

                        const mergedCorIndices = gqCorIndices.length > 0
                          ? gqCorIndices
                          : (Array.isArray(lq?.correctOptionIndices) && lq.correctOptionIndices.length > 0 ? lq.correctOptionIndices : []);

                        const mergedSampleAns = gqQ.sampleAnswer !== undefined ? gqQ.sampleAnswer : lq?.sampleAnswer;
                        const hasOptText = Array.isArray(mergedOpts) && mergedOpts.some((o: any) => String(o || '').trim() !== '');
                        const hasOptImg = Array.isArray(mergedOptImgs) && mergedOptImgs.some((img: any) => String(img || '').trim() !== '');

                        const inferredType =
                          (mergedSampleAns && String(mergedSampleAns).trim() !== '') || (!hasOptText && !hasOptImg)
                            ? 'ESSAY'
                            : (mergedCorIndices.length > 1 || gqQ.type === 'MCMA' || lq?.type === 'MCMA')
                            ? 'MCMA'
                            : (gqQ.type || lq?.type || 'SINGLE');

                        return {
                          ...lq,
                          ...gqQ,
                          type: inferredType,
                          options: inferredType === 'ESSAY' ? [] : mergedOpts,
                          optionImages: inferredType === 'ESSAY' ? [] : mergedOptImgs,
                          correctOptionIndex: gqQ.correctOptionIndex !== undefined ? gqQ.correctOptionIndex : (lq?.correctOptionIndex !== undefined ? lq.correctOptionIndex : (mergedCorIndices[0] ?? 0)),
                          correctOptionIndices: mergedCorIndices,
                          sampleAnswer: mergedSampleAns,
                          points: gqQ.points !== undefined ? Number(gqQ.points) : (lq?.points !== undefined ? Number(lq.points) : 10)
                        };
                      })
                    : (localQ?.questions || []);

                  quizMap.set(gq.id, {
                    ...(localQ || {}),
                    ...gq,
                    questions: mergedQuestions
                  });
                }
              }
            }
            const cleanGasQuizzes = Array.from(quizMap.values())
              .filter((q: Quiz) => !q.title?.includes('Bangun Datar & Aljabar') && q.id !== 'quiz-cbt-1' && q.id !== 'quiz-1');
            
            // Safely merge materials so existing materials are never wiped
            const matMap = new Map<string, Material>();
            for (const m of (state.materials || [])) {
              if (m && m.id) matMap.set(m.id, m);
            }
            if (Array.isArray(res.materials)) {
              for (const gm of res.materials) {
                if (gm && gm.id) matMap.set(gm.id, gm);
              }
            }
            const cleanGasMaterials = Array.from(matMap.values());

            // Safely merge assignments
            const asgMap = new Map<string, any>();
            for (const a of (state.assignments || [])) {
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
            const gasAssignments = Array.from(asgMap.values());

            // Safely merge quizResults from GAS so student scores and essayScores are preserved
            const qrMap = new Map<string, QuizResult>();
            for (const qr of (state.quizResults || [])) {
              if (qr) {
                const k = qr.id || `${qr.quizId}::${qr.studentId || qr.studentNisn}`;
                qrMap.set(k, qr);
              }
            }
            if (Array.isArray(res.quizResults)) {
              for (const gqr of res.quizResults) {
                if (gqr) {
                  const k = gqr.id || `${gqr.quizId}::${gqr.studentId || gqr.studentNisn}`;
                  const existing = qrMap.get(k);
                  qrMap.set(k, { 
                    ...(existing || {}), 
                    ...gqr,
                    essayScores: gqr.essayScores || existing?.essayScores || {}
                  });
                }
              }
            }
            const cleanGasResults = Array.from(qrMap.values());

            return {
              users: Array.from(userMap.values()),
              quizzes: cleanGasQuizzes,
              materials: cleanGasMaterials,
              quizResults: cleanGasResults,
              assignments: gasAssignments
            };
          });
          return true;
        }
        return false;
      },
      pullUsersFromGas: async () => {
        const gasStore = useGasStore.getState();
        if (!gasStore.isConnected && !gasStore.webhookUrl) {
          await gasStore.fetchServerConfig();
        }
        const res = await syncToGas('getAllUsers', {});
        if (res && res.success && Array.isArray(res.users) && res.users.length > 0) {
          set(state => {
            const activeDeletedKeys = state.deletedUserKeys || [];
            const activeCustomPasswords = state.customPasswords || {};
            const currentUsers = state.users.filter(u => !isUserInDeletedList(u, activeDeletedKeys));
            
            const getIndexKey = (u: any) => {
              if (u.role === 'STUDENT' && u.nisn && String(u.nisn).trim()) return `student:nisn:${String(u.nisn).trim()}`;
              if (u.role === 'TEACHER' && u.username && String(u.username).trim()) return `teacher:user:${String(u.username).trim().toLowerCase()}`;
              if (u.role === 'TEACHER' && u.nik && String(u.nik).trim()) return `teacher:nik:${String(u.nik).trim()}`;
              if (u.username) return `user:${String(u.username).trim().toLowerCase()}`;
              return `id:${u.id}`;
            };

            const userMap = new Map<string, User>();
            for (const u of currentUsers) userMap.set(getIndexKey(u), u);

            for (const u of res.users) {
              if (isUserInDeletedList(u, activeDeletedKeys)) continue;
              const nameLower = (u.name || '').toLowerCase();
              if (u.id === 'student-1' || u.id === 'teacher-1' || nameLower.includes('contoh') || nameLower.includes('percobaan') || nameLower.includes('sample') || u.nisn === '1234567890') continue;

              const key = getIndexKey(u);
              const existing = userMap.get(key) || findExistingUserMatch(currentUsers, u);

              const uKeys = getUserPrimaryKeys(u);
              let customPass = '';
              for (const k of uKeys) {
                if (activeCustomPasswords[k]) {
                  customPass = activeCustomPasswords[k];
                  break;
                }
              }
              const isExistingCustom = existing?.password && existing.password !== u.nisn && existing.password !== u.nik && existing.password !== '123456';
              const isGasCustom = u.password && u.password !== u.nisn && u.password !== u.nik && u.password !== '123456';

              const finalPass = customPass || (isExistingCustom ? existing.password : (isGasCustom ? u.password : (existing?.password || u.password || u.nisn || u.nik || '123456')));

              userMap.set(key, {
                ...(existing || {}),
                ...u,
                id: (existing && existing.id) ? existing.id : u.id,
                password: finalPass
              });
            }
            if (!Array.from(userMap.values()).some(u => u.role === 'SUPER_ADMIN')) {
              userMap.set('id:sa-1', { id: 'sa-1', role: 'SUPER_ADMIN', name: 'Super Administrator', username: 'rafx2' } as User);
            }
            return { users: Array.from(userMap.values()) };
          });
          return true;
        }
        return false;
      },
      pullAllFromServer: async (forceGasSync = false) => {
        try {
          const currentWebhookUrl = useGasStore.getState().webhookUrl || '';
          const url = forceGasSync 
            ? `/api/sync/realtime?t=${Date.now()}` 
            : `/api/data?t=${Date.now()}&webhookUrl=${encodeURIComponent(currentWebhookUrl)}`;

          const res = await fetch(url, {
            method: forceGasSync ? 'POST' : 'GET',
            cache: 'no-store',
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache',
              'x-gas-webhook-url': currentWebhookUrl
            },
            ...(forceGasSync ? { body: JSON.stringify({ webhookUrl: currentWebhookUrl }) } : {})
          });
          if (!res.ok) return false;
          const json = await res.json();
          if (json && json.success && json.data) {
            // Reconcile shared webhookUrl across client and server
            if (json.webhookUrl && typeof json.webhookUrl === 'string' && json.webhookUrl.trim()) {
              const localGas = useGasStore.getState().webhookUrl;
              if (!localGas || localGas !== json.webhookUrl.trim()) {
                useGasStore.getState().setWebhookUrl(json.webhookUrl.trim());
              }
            }

            const serverData = json.data;
            set(state => {
              const activeDeletedKeys = Array.from(new Set([
                ...(state.deletedUserKeys || []),
                ...(Array.isArray(serverData.deletedUserKeys) ? serverData.deletedUserKeys : [])
              ]));

              const activeCustomPasswords = {
                ...(state.customPasswords || {}),
                ...(serverData.customPasswords || {})
              };

              const cleanLocalUsers = state.users.filter(u => !isUserInDeletedList(u, activeDeletedKeys));
              const candidateUsers = Array.isArray(serverData.users) ? serverData.users : [];

              const getIndexKey = (u: any) => {
                if (u.role === 'STUDENT' && u.nisn && String(u.nisn).trim()) return `student:nisn:${String(u.nisn).trim()}`;
                if (u.role === 'TEACHER' && u.username && String(u.username).trim()) return `teacher:user:${String(u.username).trim().toLowerCase()}`;
                if (u.role === 'TEACHER' && u.nik && String(u.nik).trim()) return `teacher:nik:${String(u.nik).trim()}`;
                if (u.username) return `user:${String(u.username).trim().toLowerCase()}`;
                return `id:${u.id}`;
              };

              const mergedMap = new Map<string, User>();
              for (const u of cleanLocalUsers) {
                mergedMap.set(getIndexKey(u), u);
              }

              for (const su of candidateUsers) {
                if (isUserInDeletedList(su, activeDeletedKeys)) continue;
                const nameLower = (su.name || '').toLowerCase();
                if (su.id === 'student-1' || su.id === 'teacher-1' || nameLower.includes('contoh') || nameLower.includes('percobaan') || nameLower.includes('sample') || su.nisn === '1234567890') continue;

                const key = getIndexKey(su);
                const existing = mergedMap.get(key) || findExistingUserMatch(cleanLocalUsers, su);

                const suKeys = getUserPrimaryKeys(su);
                let customPass = '';
                for (const k of suKeys) {
                  if (activeCustomPasswords[k]) {
                    customPass = activeCustomPasswords[k];
                    break;
                  }
                }
                const isExistingCustom = existing?.password && existing.password !== su.nisn && existing.password !== su.nik && existing.password !== '123456';
                const isServerCustom = su.password && su.password !== su.nisn && su.password !== su.nik && su.password !== '123456';

                const finalPass = customPass || (isExistingCustom ? existing.password : (isServerCustom ? su.password : (existing?.password || su.password || su.nisn || su.nik || '123456')));

                mergedMap.set(key, {
                  ...(existing || {}),
                  ...su,
                  id: (existing && existing.id) ? existing.id : su.id,
                  password: finalPass
                });
              }

              if (!Array.from(mergedMap.values()).some(u => u.role === 'SUPER_ADMIN')) {
                mergedMap.set('id:sa-1', { id: 'sa-1', role: 'SUPER_ADMIN', name: 'Super Administrator', username: 'rafx2' } as User);
              }

              // Server & Google Sheet are authoritative for quizzes and their schedules
              const localQuizzesMap = new Map<string, Quiz>();
              for (const q of (state.quizzes || [])) {
                if (q && q.id) localQuizzesMap.set(q.id, q);
              }

              const cleanQuizzes: Quiz[] = [];
              if (Array.isArray(serverData.quizzes)) {
                for (const sq of serverData.quizzes) {
                  if (sq && sq.id) {
                    const localQ = localQuizzesMap.get(sq.id);
                    if (state.activeEditingQuizId && sq.id === state.activeEditingQuizId && localQ) {
                      cleanQuizzes.push(localQ);
                      continue;
                    }
                    const isSched = sq.isScheduled === true || String(sq.isScheduled).toUpperCase() === 'TRUE';
                    cleanQuizzes.push({
                      ...(localQ || {}),
                      ...sq,
                      isScheduled: isSched,
                      startTime: isSched ? (sq.startTime || '') : '',
                      endTime: isSched ? (sq.endTime || '') : '',
                      durationMinutes: Number(sq.durationMinutes) || Number(localQ?.durationMinutes) || 45,
                      questions: (Array.isArray(sq.questions) && sq.questions.length > 0)
                        ? sq.questions.map((sqQ: any, idx: number) => {
                            const lq = (localQ?.questions || []).find((q: any) => q.id === sqQ.id) || (localQ?.questions || [])[idx];
                            const mergedOpts = (Array.isArray(sqQ.options) && sqQ.options.length > 0) ? sqQ.options : (lq?.options || []);
                            const mergedOptImgs = (Array.isArray(sqQ.optionImages) && sqQ.optionImages.length > 0) ? sqQ.optionImages : (lq?.optionImages || []);
                            let sqCorIndices: number[] = [];
                            if (Array.isArray(sqQ.correctOptionIndices)) {
                              sqCorIndices = sqQ.correctOptionIndices.map(Number);
                            } else if (typeof sqQ.correctOptionIndices === 'string' && sqQ.correctOptionIndices.trim()) {
                              try {
                                const p = JSON.parse(sqQ.correctOptionIndices);
                                if (Array.isArray(p)) sqCorIndices = p.map(Number);
                              } catch (e) {
                                const parts = sqQ.correctOptionIndices.replace(/[\[\]]/g, '').split(/[,;\s]+/).filter(Boolean);
                                sqCorIndices = parts.map((x: string) => {
                                  const u = x.trim().toUpperCase();
                                  if (/^[A-E]$/.test(u)) return u.charCodeAt(0) - 65;
                                  const n = parseInt(x.trim(), 10);
                                  return isNaN(n) ? 0 : n;
                                });
                              }
                            }

                            const mergedCorIndices = sqCorIndices.length > 0
                              ? sqCorIndices
                              : (Array.isArray(lq?.correctOptionIndices) && lq.correctOptionIndices.length > 0 ? lq.correctOptionIndices : []);

                            const mergedSampleAns = sqQ.sampleAnswer !== undefined ? sqQ.sampleAnswer : lq?.sampleAnswer;
                            const hasOptText = Array.isArray(mergedOpts) && mergedOpts.some((o: any) => String(o || '').trim() !== '');
                            const hasOptImg = Array.isArray(mergedOptImgs) && mergedOptImgs.some((img: any) => String(img || '').trim() !== '');

                            // Inferred type preserves MCMA and ESSAY even if an old client sent SINGLE
                            const inferredType =
                              (mergedSampleAns && String(mergedSampleAns).trim() !== '') || (!hasOptText && !hasOptImg)
                                ? 'ESSAY'
                                : (mergedCorIndices.length > 1 || sqQ.type === 'MCMA' || lq?.type === 'MCMA')
                                ? 'MCMA'
                                : (sqQ.type || lq?.type || 'SINGLE');

                            return {
                              ...lq,
                              ...sqQ,
                              type: inferredType,
                              options: inferredType === 'ESSAY' ? [] : mergedOpts,
                              optionImages: inferredType === 'ESSAY' ? [] : mergedOptImgs,
                              correctOptionIndex: sqQ.correctOptionIndex !== undefined ? sqQ.correctOptionIndex : (lq?.correctOptionIndex !== undefined ? lq.correctOptionIndex : (mergedCorIndices[0] ?? 0)),
                              correctOptionIndices: mergedCorIndices,
                              sampleAnswer: mergedSampleAns,
                              points: sqQ.points !== undefined ? Number(sqQ.points) : (lq?.points !== undefined ? Number(lq.points) : 10)
                            };
                          })
                        : ((Array.isArray(localQ?.questions) && localQ.questions.length > 0) ? localQ.questions : (sq.questions || []))
                    });
                  }
                }
              }
              
              // Safely merge materials so existing materials are never wiped
              const matMap = new Map<string, Material>();
              for (const m of (state.materials || [])) {
                if (m && m.id) matMap.set(m.id, m);
              }
              if (Array.isArray(serverData.materials)) {
                for (const sm of serverData.materials) {
                  if (sm && sm.id) matMap.set(sm.id, sm);
                }
              }
              const cleanMaterials = Array.from(matMap.values());

              // Authoritative quizResults from server
              let serverResults = state.quizResults || [];
              if (Array.isArray(serverData.quizResults)) {
                const resetKeys = new Set<string>(
                  Array.isArray(json.resetQuizKeys) ? json.resetQuizKeys : (state.resetQuizKeys || [])
                );
                const qrMap = new Map<string, QuizResult>();
                for (const sqr of serverData.quizResults) {
                  if (sqr && sqr.quizId) {
                    const sKey = sqr.studentId || sqr.studentNisn || sqr.studentName?.toLowerCase() || sqr.id || '';
                    const compKey = `${sqr.quizId}::${sKey}`;
                    const compKeyLower = `${sqr.quizId}::${sKey.toLowerCase()}`;
                    const compKeyNoZero = `${sqr.quizId}::${sKey.replace(/^0+/, '')}`;

                    if (
                      resetKeys.has(compKey) ||
                      resetKeys.has(compKeyLower) ||
                      resetKeys.has(compKeyNoZero) ||
                      (sqr.id && resetKeys.has(`${sqr.quizId}::${sqr.id}`)) ||
                      (sqr.studentId && (
                        resetKeys.has(`${sqr.quizId}::${sqr.studentId}`) ||
                        resetKeys.has(`${sqr.quizId}::${sqr.studentId.toLowerCase()}`) ||
                        resetKeys.has(`${sqr.quizId}::${sqr.studentId.replace(/^0+/, '')}`)
                      )) ||
                      (sqr.studentNisn && (
                        resetKeys.has(`${sqr.quizId}::${sqr.studentNisn}`) ||
                        resetKeys.has(`${sqr.quizId}::${sqr.studentNisn.replace(/^0+/, '')}`)
                      )) ||
                      (sqr.studentName && resetKeys.has(`${sqr.quizId}::${sqr.studentName.toLowerCase()}`))
                    ) {
                      continue;
                    }
                    qrMap.set(`${sqr.quizId}::${sKey}`, sqr);
                  }
                }

                // Preserve local results ONLY if they are genuinely pending in offline queue
                const offlinePendingKeys = new Set(
                  (state.offlineQueue || [])
                    .filter(item => item.type === 'SUBMIT_QUIZ')
                    .map(item => `${item.payload?.quizId}::${item.payload?.studentId}`)
                );
                for (const lqr of (state.quizResults || [])) {
                  if (lqr && lqr.quizId) {
                    const offlineKey = `${lqr.quizId}::${lqr.studentId}`;
                    if (offlinePendingKeys.has(offlineKey)) {
                      const sKey = `${lqr.quizId}::${lqr.studentId || lqr.id}`;
                      if (!qrMap.has(sKey)) {
                        qrMap.set(sKey, lqr);
                      }
                    }
                  }
                }

                serverResults = Array.from(qrMap.values());
              }

              // Cleanup student local storage if any quiz was reset
              try {
                const curUser = useAuthStore.getState().user;
                if (curUser && curUser.role === 'STUDENT') {
                  const studentKeysToClean = [
                    curUser.id,
                    curUser.nisn,
                    curUser.nisn ? curUser.nisn.replace(/^0+/, '') : '',
                    curUser.username,
                    'guest'
                  ].filter(Boolean) as string[];

                  for (const q of cleanQuizzes) {
                    const hasResult = serverResults.some(r => 
                      r.quizId === q.id && isResultMatchStudent(r, curUser)
                    );
                    if (!hasResult) {
                      for (const sk of studentKeysToClean) {
                        localStorage.removeItem(`cbt_finished_${sk}_${q.id}`);
                        localStorage.removeItem(`cbt_session_${sk}_${q.id}`);
                        localStorage.removeItem(`cbt_result_${sk}_${q.id}`);
                        localStorage.removeItem(`cbt_answers_${sk}_${q.id}`);
                      }
                    }
                  }
                }
              } catch (e) {}
              
              // Safely merge assignments
              const asgMap = new Map<string, any>();
              for (const a of (state.assignments || [])) {
                if (a && a.studentId && a.materialId) asgMap.set(`${a.studentId}::${a.materialId}`, a);
              }
              if (Array.isArray(serverData.assignments)) {
                for (const sa of serverData.assignments) {
                  if (sa && sa.studentId && sa.materialId) {
                    const key = `${sa.studentId}::${sa.materialId}`;
                    const existing = asgMap.get(key);
                    asgMap.set(key, { ...(existing || {}), ...sa });
                  }
                }
              }
              const serverAssignments = Array.from(asgMap.values());

              return {
                users: Array.from(mergedMap.values()),
                materials: cleanMaterials,
                quizzes: cleanQuizzes,
                quizResults: serverResults,
                assignments: serverAssignments,
                deletedUserKeys: activeDeletedKeys,
                customPasswords: activeCustomPasswords,
                resetQuizKeys: Array.isArray(json.resetQuizKeys) ? json.resetQuizKeys : (state.resetQuizKeys || [])
              };
            });
            return true;
          }
        } catch (err) {
          console.warn('Failed to pull from server:', err);
        }
        return false;
      },
      submitQuiz: async (result: QuizResult) => {
        const activeUsers = get().users || [];
        const activeQuizzes = get().quizzes || [];
        const student = activeUsers.find(u => 
          u.id === result.studentId || 
          (u.nisn && u.nisn === result.studentId) || 
          (result.studentNisn && u.nisn === result.studentNisn) ||
          (result.studentName && u.name && u.name.toLowerCase() === result.studentName.toLowerCase())
        );
        const quiz = activeQuizzes.find(q => q.id === result.quizId);

        const enriched: QuizResult = {
          ...result,
          studentName: result.studentName || student?.name || 'Siswa',
          studentNisn: result.studentNisn || student?.nisn || '',
          studentClass: result.studentClass || student?.classId || '',
          quizTitle: result.quizTitle || quiz?.title || 'Kuis CBT',
          subject: result.subject || quiz?.subjectId || ''
        };

        const studentCleanKeys = [
          enriched.studentId,
          enriched.studentNisn,
          student?.id,
          student?.nisn,
          enriched.studentName?.toLowerCase()
        ].filter(Boolean) as string[];

        // 1. Immediately store in Zustand client state so student sees completed score and reset is cleared
        set(state => ({ 
          resetQuizKeys: (state.resetQuizKeys || []).filter(k => {
            return !studentCleanKeys.some(sk => 
              k === `${enriched.quizId}::${sk}` || 
              k === `${enriched.quizId}::${sk.toLowerCase()}` || 
              k === `${enriched.quizId}::${sk.replace(/^0+/, '')}`
            );
          }),
          quizResults: [
            ...state.quizResults.filter(r => !(r.quizId === enriched.quizId && (
              r.studentId === enriched.studentId ||
              (enriched.studentNisn && (r.studentId === enriched.studentNisn || r.studentNisn === enriched.studentNisn)) ||
              (enriched.id && r.id === enriched.id)
            ))), 
            enriched
          ] 
        }));

        // Dedicated local storage backup
        try {
          if (enriched.studentId && enriched.quizId) {
            localStorage.setItem(`cbt_result_${enriched.studentId}_${enriched.quizId}`, JSON.stringify(enriched));
          }
          if (enriched.studentNisn && enriched.quizId) {
            localStorage.setItem(`cbt_result_${enriched.studentNisn}_${enriched.quizId}`, JSON.stringify(enriched));
          }
        } catch (e) {}

        const activeWebhook = useGasStore.getState().webhookUrl || '';

        // 2. Dedicated endpoint /api/quizzes/submit (Awaited for persistent server & immediate GAS forward)
        let serverSaved = false;
        let gasSynced = false;
        try {
          const res = await fetch('/api/quizzes/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...enriched,
              webhookUrl: activeWebhook
            })
          });
          if (res.ok) {
            serverSaved = true;
            const data = await res.json();
            if (data?.gasSynced) gasSynced = true;
            if (data?.result) {
              set(state => ({
                resetQuizKeys: Array.isArray(data.resetQuizKeys) ? data.resetQuizKeys : state.resetQuizKeys,
                quizResults: [
                  ...state.quizResults.filter(r => r.id !== enriched.id && !(r.quizId === enriched.quizId && (r.studentId === enriched.studentId || r.studentNisn === enriched.studentNisn))),
                  data.result
                ]
              }));
            }
          }
        } catch (serverErr) {
          console.warn('Dedicated quiz submit to server notice:', serverErr);
        }

        // 3. Fallback to offlineQueue if network failed or server submit failed
        if (!navigator.onLine || !serverSaved) {
          get().enqueueOfflineAction('SUBMIT_QUIZ', { result: enriched });
        }

        // 4. CRITICAL: Dual-Channel Guarantee - If server did not sync to Google Sheets, sync directly from client
        if (!gasSynced) {
          try {
            await syncToGas('submitQuiz', { result: enriched });
          } catch (gasErr) {
            console.warn('Direct GAS sync fallback:', gasErr);
          }
        }
      },
      updateQuizResult: async (id: string, data: Partial<QuizResult>) => {
        set(state => ({
          quizResults: state.quizResults.map(r => r.id === id ? { ...r, ...data } : r)
        }));
        try {
          await fetch('/api/quizzes/result/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, data })
          });
        } catch (e) {}
        syncToServer({ quizResults: useDataStore.getState().quizResults });
        await syncToGas('updateQuizResult', { id, data });
      },
      deleteQuizResult: async (id: string) => {
        const target = (get().quizResults || []).find((r: QuizResult) => r.id === id);
        set(state => ({
          quizResults: (state.quizResults || []).filter((r: QuizResult) => r.id !== id)
        }));
        try {
          await fetch('/api/quizzes/reset-student', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              resultId: id,
              quizId: target?.quizId,
              studentId: target?.studentId,
              studentNisn: target?.studentNisn,
              studentName: target?.studentName,
              webhookUrl: useGasStore.getState().webhookUrl
            })
          });
        } catch (e) {}
        syncToServer({ quizResults: get().quizResults });
        await syncToGas('deleteQuizResult', { 
          id, 
          quizId: target?.quizId, 
          studentId: target?.studentId, 
          studentNisn: target?.studentNisn 
        });
      },
      resetStudentQuiz: async (quizId: string, studentId: string, studentNisn?: string, studentName?: string, resultId?: string): Promise<boolean> => {
        const activeUsers = get().users || [];
        const targetUser = activeUsers.find(u => 
          (studentId && (u.id === studentId || u.nisn === studentId || (u.nisn && u.nisn.replace(/^0+/, '') === studentId.replace(/^0+/, '')))) ||
          (studentNisn && (u.nisn === studentNisn || (u.nisn && u.nisn.replace(/^0+/, '') === studentNisn.replace(/^0+/, '')))) ||
          (studentName && u.name && u.name.toLowerCase() === studentName.toLowerCase())
        );

        const studentKeys = new Set<string>();
        if (resultId) studentKeys.add(resultId);
        if (studentId) {
          studentKeys.add(studentId);
          studentKeys.add(studentId.toLowerCase());
          studentKeys.add(studentId.replace(/^0+/, ''));
        }
        if (studentNisn) {
          studentKeys.add(studentNisn);
          studentKeys.add(studentNisn.replace(/^0+/, ''));
        }
        if (studentName) studentKeys.add(studentName.toLowerCase());
        if (targetUser) {
          if (targetUser.id) studentKeys.add(targetUser.id);
          if (targetUser.nisn) {
            studentKeys.add(targetUser.nisn);
            studentKeys.add(targetUser.nisn.replace(/^0+/, ''));
          }
          if (targetUser.username) studentKeys.add(targetUser.username.toLowerCase());
          if (targetUser.name) studentKeys.add(targetUser.name.toLowerCase());
        }

        const target = (get().quizResults || []).find((r: QuizResult) => 
          r.quizId === quizId && (
            (resultId && r.id === resultId) ||
            (r.id && studentKeys.has(r.id)) ||
            (r.studentId && (studentKeys.has(r.studentId) || studentKeys.has(r.studentId.replace(/^0+/, '')))) ||
            (r.studentNisn && (studentKeys.has(r.studentNisn) || studentKeys.has(r.studentNisn.replace(/^0+/, '')))) ||
            (r.studentName && studentKeys.has(r.studentName.toLowerCase())) ||
            (targetUser && isResultMatchStudent(r, targetUser))
          )
        );
        const targetId = resultId || target?.id;

        const updatedResetKeys = Array.from(new Set([
          ...(get().resetQuizKeys || []),
          ...Array.from(studentKeys).map(k => `${quizId}::${k}`)
        ]));

        set(state => ({
          resetQuizKeys: updatedResetKeys,
          quizResults: (state.quizResults || []).filter((r: QuizResult) => {
            if (r.quizId !== quizId) return true;
            if (targetId && r.id === targetId) return false;
            if (r.id && studentKeys.has(r.id)) return false;
            if (r.studentId && (studentKeys.has(r.studentId) || studentKeys.has(r.studentId.replace(/^0+/, '')))) return false;
            if (r.studentNisn && (studentKeys.has(r.studentNisn) || studentKeys.has(r.studentNisn.replace(/^0+/, '')))) return false;
            if (r.studentName && studentKeys.has(r.studentName.toLowerCase())) return false;
            if (targetUser && isResultMatchStudent(r, targetUser)) return false;
            return true;
          })
        }));

        try {
          for (const sk of studentKeys) {
            localStorage.removeItem(`cbt_finished_${sk}_${quizId}`);
            localStorage.removeItem(`cbt_session_${sk}_${quizId}`);
            localStorage.removeItem(`cbt_result_${sk}_${quizId}`);
            localStorage.removeItem(`cbt_answers_${sk}_${quizId}`);
          }
        } catch (e) {}

        try {
          const res = await fetch('/api/quizzes/reset-student', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              quizId,
              studentId: studentId || target?.studentId || targetUser?.id,
              studentNisn: studentNisn || target?.studentNisn || targetUser?.nisn,
              studentName: studentName || target?.studentName || targetUser?.name,
              resultId: targetId,
              webhookUrl: useGasStore.getState().webhookUrl
            })
          });
          const json = await res.json().catch(() => ({}));
          syncToServer({ quizResults: get().quizResults });
          await syncToGas('deleteQuizResult', {
            quizId,
            studentId: studentId || target?.studentId || targetUser?.id,
            studentNisn: studentNisn || target?.studentNisn || targetUser?.nisn,
            id: targetId,
            resultId: targetId
          });
          return json?.success !== false;
        } catch (e) {
          syncToServer({ quizResults: get().quizResults });
          return true;
        }
      },
      resetBulkStudentQuiz: async (quizId: string, options: { filterType: 'below_threshold' | 'disqualified' | 'all' | 'selected'; threshold?: number; studentIds?: string[] }) => {
        const { filterType, threshold = 75, studentIds = [] } = options;
        const allResults = get().quizResults || [];
        const activeUsers = get().users || [];

        const matchingResults = allResults.filter(qr => {
          if (qr.quizId !== quizId) return false;
          const score = Number(qr.finalScore !== undefined ? qr.finalScore : qr.score || 0);
          const isDisqualified = Boolean(qr.disqualified) || Number(qr.violationsCount || 0) > 0;

          if (filterType === 'below_threshold') {
            return score < threshold;
          } else if (filterType === 'disqualified') {
            return isDisqualified;
          } else if (filterType === 'all') {
            return true;
          } else if (filterType === 'selected') {
            return studentIds.some(sid => qr.id === sid || qr.studentId === sid || qr.studentNisn === sid);
          }
          return false;
        });

        if (matchingResults.length === 0) {
          return { count: 0, studentNames: [] };
        }

        const resetStudentKeys = new Set<string>();
        const resetNames: string[] = [];

        for (const r of matchingResults) {
          if (r.id) resetStudentKeys.add(r.id);
          if (r.studentId) {
            resetStudentKeys.add(r.studentId);
            resetStudentKeys.add(r.studentId.toLowerCase());
            resetStudentKeys.add(r.studentId.replace(/^0+/, ''));
          }
          if (r.studentNisn) {
            resetStudentKeys.add(r.studentNisn);
            resetStudentKeys.add(r.studentNisn.replace(/^0+/, ''));
          }
          if (r.studentName) {
            resetStudentKeys.add(r.studentName.toLowerCase());
            if (!resetNames.includes(r.studentName)) resetNames.push(r.studentName);
          }

          const u = activeUsers.find(usr => 
            (r.studentId && (usr.id === r.studentId || usr.nisn === r.studentId)) ||
            (r.studentNisn && usr.nisn === r.studentNisn) ||
            (r.studentName && usr.name && usr.name.toLowerCase() === r.studentName.toLowerCase())
          );
          if (u) {
            if (u.id) resetStudentKeys.add(u.id);
            if (u.nisn) {
              resetStudentKeys.add(u.nisn);
              resetStudentKeys.add(u.nisn.replace(/^0+/, ''));
            }
            if (u.username) resetStudentKeys.add(u.username.toLowerCase());
            if (u.name) resetStudentKeys.add(u.name.toLowerCase());
          }
        }

        const matchResultIds = new Set(matchingResults.map(r => r.id));
        const updatedResetKeys = Array.from(new Set([
          ...(get().resetQuizKeys || []),
          ...Array.from(resetStudentKeys).map(k => `${quizId}::${k}`)
        ]));

        // Update local state immediately
        set(state => ({
          resetQuizKeys: updatedResetKeys,
          quizResults: (state.quizResults || []).filter(r => !matchResultIds.has(r.id))
        }));

        // Clean local CBT storage for all affected students
        try {
          for (const sk of resetStudentKeys) {
            localStorage.removeItem(`cbt_finished_${sk}_${quizId}`);
            localStorage.removeItem(`cbt_session_${sk}_${quizId}`);
            localStorage.removeItem(`cbt_result_${sk}_${quizId}`);
            localStorage.removeItem(`cbt_answers_${sk}_${quizId}`);
          }
        } catch (e) {}

        // Call server bulk-reset endpoint
        try {
          const res = await fetch('/api/quizzes/bulk-reset', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              quizId,
              filterType,
              threshold,
              studentIds,
              webhookUrl: useGasStore.getState().webhookUrl
            })
          });
          const data = await res.json().catch(() => ({}));
          syncToServer({ quizResults: get().quizResults });
          return {
            count: data?.count || matchingResults.length,
            studentNames: data?.studentNames || resetNames
          };
        } catch (e) {
          syncToServer({ quizResults: get().quizResults });
          return {
            count: matchingResults.length,
            studentNames: resetNames
          };
        }
      },
      submitAssignment: async (studentId: string, materialId: string, link: string, fileName?: string, fileSize?: number) => {
        const newRecord = {
          studentId,
          materialId,
          link,
          fileName: fileName || '',
          fileSize: fileSize || 0,
          submittedAt: new Date().toISOString()
        };

        set(state => {
          const currentList = state.assignments || [];
          const existing = currentList.find(a => a.studentId === studentId && a.materialId === materialId);
          const filtered = currentList.filter(a => !(a.studentId === studentId && a.materialId === materialId));
          return {
            assignments: [...filtered, {
              ...newRecord,
              grade: existing?.grade,
              feedback: existing?.feedback,
              gradedAt: existing?.gradedAt
            }]
          };
        });

        // Save to dedicated server endpoint immediately
        try {
          await fetch('/api/assignments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ studentId, materialId, link, fileName, fileSize })
          });
        } catch (e) {}

        const allAssignments = get().assignments || [];
        syncToServer({ assignments: allAssignments });
        await syncToGas('submitAssignment', { studentId, materialId, link, fileName, fileSize });
      },
      gradeAssignment: async (studentId: string, materialId: string, grade: number, feedback?: string) => {
        const gradedAt = new Date().toISOString();
        set(state => {
          const currentList = state.assignments || [];
          const updated = currentList.map(a => {
            if (a.studentId === studentId && a.materialId === materialId) {
              return {
                ...a,
                grade,
                feedback: feedback || '',
                gradedAt
              };
            }
            return a;
          });
          return { assignments: updated };
        });

        // Save to server
        try {
          await fetch('/api/assignments/grade', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ studentId, materialId, grade, feedback })
          });
        } catch (e) {}

        syncToServer({ assignments: get().assignments });
        await syncToGas('gradeAssignment', { studentId, materialId, grade, feedback });
      },
      cleanInitialSamples: async () => {
        set(state => {
          const cleanUsers = state.users.filter(u => {
            if (u.role === 'SUPER_ADMIN') return true;
            const nameLower = (u.name || '').toLowerCase();
            const isSample = u.id === 'student-1' || u.id === 'teacher-1' || 
              nameLower.includes('contoh') || nameLower.includes('percobaan') || nameLower.includes('sample') ||
              (u.nisn && String(u.nisn).trim() === '1234567890');
            return !isSample;
          });
          const cleanQuizzes = state.quizzes.filter(q => 
            !q.title?.toLowerCase().includes('bangun datar') && 
            !q.title?.toLowerCase().includes('aljabar dasar') && 
            q.id !== 'quiz-cbt-1' && q.id !== 'quiz-1' && q.id !== 'q-1'
          );
          const cleanMaterials = state.materials.filter(m => 
            m.id !== 'm-1' && m.id !== 'm-demo'
          );
          const cleanAssignments = (state.assignments || []).filter(a => {
            const sId = String(a.studentId || '').toLowerCase();
            const mId = String(a.materialId || '').toLowerCase();
            const file = String(a.fileName || '').toLowerCase();
            const link = String(a.link || '').toLowerCase();
            return sId !== 'student-1' && sId !== 'student-test-1' && !sId.includes('test') &&
              mId !== 'm-1' && mId !== 'm-demo' && !mId.includes('test') &&
              !file.includes('test') && !link.includes('test') && !file.includes('contoh');
          });
          const cleanQuizResults = (state.quizResults || []).filter(qr => {
            const sId = String(qr.studentId || '').toLowerCase();
            const qId = String(qr.quizId || '').toLowerCase();
            const sName = String(qr.studentName || '').toLowerCase();
            return sId !== 'student-1' && sId !== 'student-test-1' && !sId.includes('test') &&
              qId !== 'q-1' && qId !== 'quiz-1' && qId !== 'quiz-cbt-1' && !qId.includes('test') &&
              !sName.includes('contoh') && !sName.includes('percobaan') && !sName.includes('dummy');
          });
          return {
            users: cleanUsers,
            quizzes: cleanQuizzes,
            materials: cleanMaterials,
            assignments: cleanAssignments,
            quizResults: cleanQuizResults
          };
        });

        try {
          await fetch('/api/clean-samples', { method: 'POST' });
        } catch (e) {}

        await syncToGas('cleanInitialSampleData', {});
      },

      clearDatabase: async (options: DatabaseCleanOptions) => {
        const { targets } = options;
        const isAll = targets.includes('ALL');
        const clearStudents = isAll || targets.includes('STUDENTS');
        const clearTeachers = isAll || targets.includes('TEACHERS');
        const clearMaterials = isAll || targets.includes('MATERIALS');
        const clearQuizzes = isAll || targets.includes('QUIZZES');
        const clearQuizResults = isAll || targets.includes('QUIZ_RESULTS') || clearQuizzes;

        let studentsDeleted = 0;
        let teachersDeleted = 0;
        let materialsDeleted = 0;
        let quizzesDeleted = 0;
        let quizResultsDeleted = 0;

        set((state) => {
          if (clearStudents) {
            studentsDeleted = state.users.filter((u) => u.role === 'STUDENT').length;
          }
          if (clearTeachers) {
            teachersDeleted = state.users.filter((u) => u.role === 'TEACHER').length;
          }
          if (clearMaterials) {
            materialsDeleted = state.materials.length;
          }
          if (clearQuizzes) {
            quizzesDeleted = state.quizzes.length;
          }
          if (clearQuizResults) {
            quizResultsDeleted = state.quizResults.length;
          }

          const newUsers = state.users.filter((u) => {
            // NEVER delete SUPER_ADMIN
            if (u.role === 'SUPER_ADMIN') return true;
            // Retain normal ADMIN users safely
            if (u.role === 'ADMIN') return true;
            if (clearStudents && u.role === 'STUDENT') return false;
            if (clearTeachers && u.role === 'TEACHER') return false;
            return true;
          });

          // Ensure at least one Super Admin exists
          const hasSuperAdmin = newUsers.some((u) => u.role === 'SUPER_ADMIN');
          if (!hasSuperAdmin) {
            newUsers.unshift({
              id: 'sa-1',
              role: 'SUPER_ADMIN',
              name: 'Super Administrator',
              username: 'rafx2',
            });
          }

          return {
            users: newUsers,
            materials: clearMaterials ? [] : state.materials,
            quizzes: clearQuizzes ? [] : state.quizzes,
            quizResults: clearQuizResults ? [] : state.quizResults,
          };
        });

        // Sync target flags to Google Apps Script
        const gasTargets: string[] = [];
        if (isAll) {
          gasTargets.push('All');
        } else {
          if (clearStudents) gasTargets.push('Students');
          if (clearTeachers) gasTargets.push('Teachers');
          if (clearMaterials) gasTargets.push('Materials');
          if (clearQuizzes) gasTargets.push('Quizzes');
          if (clearQuizResults) gasTargets.push('QuizResults', 'Assignments', 'StudentProgress');
        }

        if (gasTargets.length > 0) {
          await syncToGas('clearDatabase', { targets: gasTargets });
        }

        const finalState = useDataStore.getState();
        syncToServer({
          users: finalState.users,
          materials: finalState.materials,
          quizzes: finalState.quizzes,
          quizResults: finalState.quizResults
        });

        return {
          students: studentsDeleted,
          teachers: teachersDeleted,
          materials: materialsDeleted,
          quizzes: quizzesDeleted,
          quizResults: quizResultsDeleted,
        };
      }
    }),
    {
      name: 'smartlms-data-storage-v2',
      partialize: (state) => ({
        // Ensure devices ALWAYS connect to and retrieve the latest authoritative data from server / Google Sheet
        // Do NOT store stale local quizzes, materials, or results on individual devices
        customPasswords: state.customPasswords || {},
        deletedUserKeys: state.deletedUserKeys || [],
        offlineQueue: state.offlineQueue || [],
        resetQuizKeys: state.resetQuizKeys || []
      })
    }
  )
);
