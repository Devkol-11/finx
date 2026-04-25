import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { AuthState, User } from '@/types';

interface AuthStore extends AuthState {
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  login: (user: User, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>()(
  devtools(
    persist(
      (set) => ({
        user: null,
        token: null,
        isAuthenticated: false,
        setUser: (user) => set({ user }),
        setToken: (token) => set({ token, isAuthenticated: !!token }),
        login: (user, token) => {
          localStorage.setItem('authToken', token);
          set({ user, token, isAuthenticated: true });
        },
        logout: () => {
          localStorage.removeItem('authToken');
          set({ user: null, token: null, isAuthenticated: false });
        },
      }),
      {
        name: 'auth-store',
      }
    )
  )
);
