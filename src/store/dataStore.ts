import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useGasStore } from './gasStore';
import { 
  User, 
  Material, 
  Quiz, 
  QuizResult, 
  DatabaseCleanOptions, 
  DatabaseCleanSummary,
  PromotionOptions,
  PromotionSummary,
  DeduplicationSummary
} from '../types';

interface DataState {
  users: User[];
  materials: Material[];
  quizzes: Quiz[];
  quizResults: QuizResult[];
  assignments?: any[];
  deletedUserKeys?: string[];
  customPasswords?: Record<string, string>;
  
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
  syncQuizToGas: (quizId: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  syncAllToGas: () => Promise<{ success: boolean; message?: string; error?: string }>;
  pullAllFromGas: () => Promise<boolean>;
  pullUsersFromGas: () => Promise<boolean>;
  pullAllFromServer: () => Promise<boolean>;

  // Assignments
  submitAssignment: (studentId: string, materialId: string, link: string, fileName?: string, fileSize?: number) => Promise<void>;

  // Super Admin Database Maintenance
  clearDatabase: (options: DatabaseCleanOptions) => Promise<DatabaseCleanSummary>;
  cleanInitialSamples: () => Promise<void>;
}

export const getUserPrimaryKeys = (u: any): string[] => {
  if (!u) return [];
  const keys: string[] = [];
  if (u.id) keys.push(String(u.id).trim());
  if (u.nisn && String(u.nisn).trim()) keys.push(String(u.nisn).trim());
  if (u.nik && String(u.nik).trim()) keys.push(String(u.nik).trim());
  if (u.username && String(u.username).trim()) keys.push(String(u.username).trim().toLowerCase());
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

const syncToServer = async (payload: { users?: User[]; materials?: Material[]; quizzes?: Quiz[]; quizResults?: QuizResult[]; assignments?: any[] }) => {
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
  if (gasStore.isConnected && gasStore.webhookUrl) {
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
        syncToServer({ users: updatedUsers });
        
        try {
          await fetch('/api/users/change-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: id,
              nisn: user?.nisn,
              nik: user?.nik,
              username: user?.username,
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
          password: cleanPass
        });
        
        // Also call updateUser in GAS as extra fallback guarantee
        await syncToGas('updateUser', {
          id,
          nisn: user?.nisn,
          nik: user?.nik,
          username: user?.username,
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
        set(state => ({ materials: [...state.materials, material] }));
        syncToServer({ materials: useDataStore.getState().materials });
        await syncToGas('addMaterial', { material });
      },
      updateMaterial: async (id: string, data: Partial<Material>) => {
        set(state => ({ materials: state.materials.map(m => m.id === id ? { ...m, ...data } : m) }));
        syncToServer({ materials: useDataStore.getState().materials });
        await syncToGas('updateMaterial', { id, data });
      },
      deleteMaterial: async (id: string) => {
        set(state => ({ materials: state.materials.filter(m => m.id !== id) }));
        syncToServer({ materials: useDataStore.getState().materials });
        await syncToGas('deleteMaterial', { id });
      },
      markMaterialAsRead: async (studentId: string, materialId: string) => {
        await syncToGas('markMaterialAsRead', { studentId, materialId });
      },

      addQuiz: async (quiz: Quiz) => {
        set(state => ({ quizzes: [...state.quizzes, quiz] }));
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
        syncToServer({ quizzes: useDataStore.getState().quizzes });
        if (fullUpdatedQuiz) {
          await syncToGas('updateQuiz', { id, data, quiz: fullUpdatedQuiz });
        }
      },
      deleteQuiz: async (id: string) => {
        set(state => ({ quizzes: state.quizzes.filter(q => q.id !== id) }));
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
        const { users, quizzes, materials } = get();
        const res = await syncToGas('syncAllData', { users, quizzes, materials });
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

            const cleanGasQuizzes = (Array.isArray(res.quizzes) ? res.quizzes : state.quizzes)
              .filter((q: Quiz) => !q.title?.includes('Bangun Datar & Aljabar') && q.id !== 'quiz-cbt-1' && q.id !== 'quiz-1');
            const cleanGasMaterials = Array.isArray(res.materials) ? res.materials : state.materials;
            const gasAssignments = Array.isArray(res.assignments) && res.assignments.length > 0 ? res.assignments : (state.assignments || []);

            return {
              users: Array.from(userMap.values()),
              quizzes: cleanGasQuizzes,
              materials: cleanGasMaterials,
              quizResults: state.quizResults,
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
      pullAllFromServer: async () => {
        try {
          const res = await fetch('/api/data');
          if (!res.ok) return false;
          const json = await res.json();
          if (json && json.success && json.data) {
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

              const cleanQuizzes = (Array.isArray(serverData.quizzes) ? serverData.quizzes : state.quizzes)
                .filter((q: Quiz) => !q.title?.includes('Bangun Datar & Aljabar') && q.id !== 'quiz-cbt-1' && q.id !== 'quiz-1');
              const cleanMaterials = Array.isArray(serverData.materials) ? serverData.materials : state.materials;
              const serverResults = Array.isArray(serverData.quizResults) ? serverData.quizResults : state.quizResults;
              const serverAssignments = Array.isArray(serverData.assignments) ? serverData.assignments : (state.assignments || []);

              return {
                users: Array.from(mergedMap.values()),
                materials: cleanMaterials,
                quizzes: cleanQuizzes,
                quizResults: serverResults,
                assignments: serverAssignments,
                deletedUserKeys: activeDeletedKeys,
                customPasswords: activeCustomPasswords
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
        set(state => ({ 
          quizResults: [
            ...state.quizResults.filter(r => !(r.quizId === result.quizId && r.studentId === result.studentId)), 
            result
          ] 
        }));
        syncToServer({ quizResults: useDataStore.getState().quizResults });
        await syncToGas('submitQuiz', { result });
      },
      updateQuizResult: async (id: string, data: Partial<QuizResult>) => {
        set(state => ({
          quizResults: state.quizResults.map(r => r.id === id ? { ...r, ...data } : r)
        }));
        syncToServer({ quizResults: useDataStore.getState().quizResults });
        await syncToGas('updateQuizResult', { id, data });
      },
      deleteQuizResult: async (id: string) => {
        set(state => ({
          quizResults: state.quizResults.filter(r => r.id !== id)
        }));
        syncToServer({ quizResults: useDataStore.getState().quizResults });
        await syncToGas('deleteQuizResult', { id });
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
          const filtered = currentList.filter(a => !(a.studentId === studentId && a.materialId === materialId));
          return {
            assignments: [...filtered, newRecord]
          };
        });

        const allAssignments = get().assignments || [];
        syncToServer({ assignments: allAssignments });
        await syncToGas('submitAssignment', { studentId, materialId, link, fileName, fileSize });
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
            m.id !== 'm-1' && m.id !== 'm-demo' && !m.title?.toLowerCase().includes('contoh')
          );
          return {
            users: cleanUsers,
            quizzes: cleanQuizzes,
            materials: cleanMaterials
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
    }
  )
);
