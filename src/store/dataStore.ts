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
  
  // Users (Admin, Teacher, Student)
  addUser: (user: User) => Promise<void>;
  addUsers: (users: User[]) => Promise<void>;
  updateUser: (id: string, data: Partial<User>) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  resetPassword: (id: string, defaultPassword: string) => Promise<void>;

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

  // Assignments
  submitAssignment: (studentId: string, materialId: string, link: string) => Promise<void>;

  // Super Admin Database Maintenance
  clearDatabase: (options: DatabaseCleanOptions) => Promise<DatabaseCleanSummary>;
}

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
      quizzes: [
        {
          id: 'quiz-cbt-1',
          title: 'Penilaian Harian CBT Matematika: Bangun Datar & Aljabar',
          subjectId: 'Matematika',
          classId: '7A',
          durationMinutes: 45,
          isScheduled: true,
          startTime: new Date(Date.now() - 3600000).toISOString().slice(0, 16),
          endTime: new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 16),
          createdAt: new Date().toISOString(),
          questions: [
            {
              id: 'q-med-1',
              text: 'Perhatikan gambar bangun datar berikut. Jika panjang sisi sejajar masing-masing 10 cm dan 22 cm, serta tingginya 8 cm, berapakah luas bangun trapesium tersebut?',
              options: ['128 cm²', '144 cm²', '160 cm²', '176 cm²'],
              correctOptionIndex: 0,
              points: 25,
              imageUrl: 'https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&w=800&q=80',
              explanation: 'Rumus Luas Trapesium = ½ × (a + b) × t = ½ × (10 + 22) × 8 = ½ × 32 × 8 = 128 cm².'
            },
            {
              id: 'q-med-2',
              text: 'Simak video penjelasan konsep geometri berikut. Berdasarkan prinsip segitiga siku-siku, jika alas 6 cm dan tinggi 8 cm, berapakah panjang sisi miringnya?',
              options: ['9 cm', '10 cm', '12 cm', '14 cm'],
              correctOptionIndex: 1,
              points: 25,
              videoUrl: 'https://www.youtube.com/watch?v=AA6RfgP-AHU',
              explanation: 'c = √(6² + 8²) = √(36 + 64) = √100 = 10 cm.'
            },
            {
              id: 'q-med-3',
              text: 'Dengarkan rekaman instrumen audio listening berikut. Berapakah hasil perhitungan aljabar dari 12 dikali 3?',
              options: ['24 butir', '36 butir', '48 butir', '60 butir'],
              correctOptionIndex: 1,
              points: 25,
              audioUrl: 'https://actions.google.com/sounds/v1/science/ambient_music.ogg',
              explanation: 'Hasil perhitungan adalah 12 × 3 = 36.'
            },
            {
              id: 'q-med-4',
              text: 'Bentuk paling sederhana dari aljabar 5x + 3y - 2x + 7y adalah...',
              options: ['3x + 10y', '7x + 10y', '3x - 4y', '10x + 3y'],
              correctOptionIndex: 0,
              points: 25,
              explanation: 'Suku sejenis dikelompokkan: (5x - 2x) + (3y + 7y) = 3x + 10y.'
            }
          ]
        }
      ] as Quiz[],
      quizResults: [] as QuizResult[],

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
        await syncToGas('setAllUsers', { users: allUsers });
      },
      updateUser: async (id, data) => {
        set(state => ({ users: state.users.map(u => u.id === id ? { ...u, ...data } : u) }));
        await syncToGas('updateUser', { id, data });
      },
      deleteUser: async (id) => {
        set(state => ({ users: state.users.filter(u => u.id !== id) }));
        await syncToGas('deleteUser', { id });
      },
      resetPassword: async (id, defaultPassword) => {
        await syncToGas('resetPassword', { id, password: defaultPassword });
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
        await syncToGas('addMaterial', { material });
      },
      updateMaterial: async (id: string, data: Partial<Material>) => {
        set(state => ({ materials: state.materials.map(m => m.id === id ? { ...m, ...data } : m) }));
        await syncToGas('updateMaterial', { id, data });
      },
      deleteMaterial: async (id: string) => {
        set(state => ({ materials: state.materials.filter(m => m.id !== id) }));
        await syncToGas('deleteMaterial', { id });
      },
      markMaterialAsRead: async (studentId: string, materialId: string) => {
        await syncToGas('markMaterialAsRead', { studentId, materialId });
      },

      addQuiz: async (quiz: Quiz) => {
        set(state => ({ quizzes: [...state.quizzes, quiz] }));
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
          await syncToGas('updateQuiz', { id, data, quiz: fullUpdatedQuiz });
        }
      },
      deleteQuiz: async (id: string) => {
        set(state => ({ quizzes: state.quizzes.filter(q => q.id !== id) }));
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
      submitQuiz: async (result: QuizResult) => {
        set(state => ({ 
          quizResults: [
            ...state.quizResults.filter(r => !(r.quizId === result.quizId && r.studentId === result.studentId)), 
            result
          ] 
        }));
        await syncToGas('submitQuiz', { result });
      },
      updateQuizResult: async (id: string, data: Partial<QuizResult>) => {
        set(state => ({
          quizResults: state.quizResults.map(r => r.id === id ? { ...r, ...data } : r)
        }));
        await syncToGas('updateQuizResult', { id, data });
      },
      deleteQuizResult: async (id: string) => {
        set(state => ({
          quizResults: state.quizResults.filter(r => r.id !== id)
        }));
        await syncToGas('deleteQuizResult', { id });
      },
      submitAssignment: async (studentId: string, materialId: string, link: string) => {
        await syncToGas('submitAssignment', { studentId, materialId, link });
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
