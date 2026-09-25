import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '../types';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  login: (user: User) => void;
  logout: () => void;
  updateCurrentUser: (data: Partial<User>) => void;
  updateAssignedClasses: (classes: string[]) => void;
  updateTeachingAssignment: (classes: string[], subject?: string) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      login: (user) => set({ user, isAuthenticated: true }),
      logout: () => set({ user: null, isAuthenticated: false }),
      updateCurrentUser: (data: Partial<User>) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...data } : null,
        })),
      updateAssignedClasses: (classes: string[]) =>
        set((state) => ({
          user: state.user ? { ...state.user, assignedClasses: classes } : null,
        })),
      updateTeachingAssignment: (classes: string[], subject?: string) =>
        set((state) => ({
          user: state.user ? { ...state.user, assignedClasses: classes, ...(subject !== undefined ? { subject } : {}) } : null,
        })),
    }),
    {
      name: 'smartlms-auth-storage',
    }
  )
);

