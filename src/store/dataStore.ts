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

  // Assignments
  submitAssignment: (studentId: string, materialId: string, link: string) => Promise<void>;
}

const syncToGas = async (action: string, payload: any) => {
  const gasStore = useGasStore.getState();
  if (gasStore.isConnected && gasStore.webhookUrl) {
    try {
      const res = await gasStore.executeAction(action, payload);
      if (!res.success) {
        throw new Error(res.error || 'Gagal sinkronisasi dengan Google Sheets');
      }
    } catch (e: any) {
      console.error('GAS Sync Error', e);
      throw e;
    }
  }
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
        await syncToGas('addUser', { user });
        set(state => ({ users: [...state.users, user] }));
      },
      addUsers: async (newUsers) => {
        if (newUsers.length === 0) return;
        try {
          await syncToGas('addUsers', { users: newUsers });
        } catch (e) {
          console.warn('Sync bulk users warning:', e);
        }
        set(state => ({ users: [...state.users, ...newUsers] }));
      },
      updateUser: async (id, data) => {
        await syncToGas('updateUser', { id, data });
        set(state => ({ users: state.users.map(u => u.id === id ? { ...u, ...data } : u) }));
      },
      deleteUser: async (id) => {
        await syncToGas('deleteUser', { id });
        set(state => ({ users: state.users.filter(u => u.id !== id) }));
      },
      resetPassword: async (id, defaultPassword) => {
        await syncToGas('resetPassword', { id, password: defaultPassword });
      },

      addMaterial: async (material) => {
        await syncToGas('addMaterial', { material });
        set(state => ({ materials: [...state.materials, material] }));
      },
      updateMaterial: async (id, data) => {
        await syncToGas('updateMaterial', { id, data });
        set(state => ({ materials: state.materials.map(m => m.id === id ? { ...m, ...data } : m) }));
      },
      deleteMaterial: async (id) => {
        await syncToGas('deleteMaterial', { id });
        set(state => ({ materials: state.materials.filter(m => m.id !== id) }));
      },
      markMaterialAsRead: async (studentId, materialId) => {
        await syncToGas('markMaterialAsRead', { studentId, materialId });
      },

      addQuiz: async (quiz) => {
        await syncToGas('addQuiz', { quiz });
        set(state => ({ quizzes: [...state.quizzes, quiz] }));
      },
      updateQuiz: async (id, data) => {
        await syncToGas('updateQuiz', { id, data });
        set(state => ({ quizzes: state.quizzes.map(q => q.id === id ? { ...q, ...data } : q) }));
      },
      deleteQuiz: async (id) => {
        await syncToGas('deleteQuiz', { id });
        set(state => ({ quizzes: state.quizzes.filter(q => q.id !== id) }));
      },
      submitQuiz: async (result) => {
        await syncToGas('submitQuiz', { result });
        set(state => ({ quizResults: [...state.quizResults, result] }));
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
