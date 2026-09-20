import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useGasStore } from './gasStore';
import { User, Material, Quiz, QuizResult } from '../types';

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

  // Assignments
  submitAssignment: (studentId: string, materialId: string, link: string) => Promise<void>;
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
    (set) => ({
      users: [
        { id: 'sa-1', role: 'SUPER_ADMIN', name: 'Super Administrator', username: 'rafx2' }
      ],
      materials: [],
      quizzes: [],
      quizResults: [],

      // Actions
      addUser: async (user) => {
        set(state => ({ users: [...state.users, user] }));
        await syncToGas('addUser', { user });
      },
      addUsers: async (newUsers) => {
        if (newUsers.length === 0) return;
        set(state => ({ users: [...state.users, ...newUsers] }));
        await syncToGas('addUsers', { users: newUsers });
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

      addMaterial: async (material) => {
        set(state => ({ materials: [...state.materials, material] }));
        await syncToGas('addMaterial', { material });
      },
      updateMaterial: async (id, data) => {
        set(state => ({ materials: state.materials.map(m => m.id === id ? { ...m, ...data } : m) }));
        await syncToGas('updateMaterial', { id, data });
      },
      deleteMaterial: async (id) => {
        set(state => ({ materials: state.materials.filter(m => m.id !== id) }));
        await syncToGas('deleteMaterial', { id });
      },
      markMaterialAsRead: async (studentId, materialId) => {
        await syncToGas('markMaterialAsRead', { studentId, materialId });
      },

      addQuiz: async (quiz) => {
        set(state => ({ quizzes: [...state.quizzes, quiz] }));
        await syncToGas('addQuiz', { quiz });
      },
      updateQuiz: async (id, data) => {
        set(state => ({ quizzes: state.quizzes.map(q => q.id === id ? { ...q, ...data } : q) }));
        await syncToGas('updateQuiz', { id, data });
      },
      deleteQuiz: async (id) => {
        set(state => ({ quizzes: state.quizzes.filter(q => q.id !== id) }));
        await syncToGas('deleteQuiz', { id });
      },
      submitQuiz: async (result) => {
        set(state => ({ 
          quizResults: [
            ...state.quizResults.filter(r => !(r.quizId === result.quizId && r.studentId === result.studentId)), 
            result
          ] 
        }));
        await syncToGas('submitQuiz', { result });
      },
      updateQuizResult: async (id, data) => {
        set(state => ({
          quizResults: state.quizResults.map(r => r.id === id ? { ...r, ...data } : r)
        }));
        await syncToGas('updateQuizResult', { id, data });
      },
      deleteQuizResult: async (id) => {
        set(state => ({
          quizResults: state.quizResults.filter(r => r.id !== id)
        }));
        await syncToGas('deleteQuizResult', { id });
      },
      submitAssignment: async (studentId, materialId, link) => {
        await syncToGas('submitAssignment', { studentId, materialId, link });
      }
    }),
    {
      name: 'smartlms-data-storage-v2',
    }
  )
);
