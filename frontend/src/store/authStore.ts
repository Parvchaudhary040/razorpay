import { create } from 'zustand';

interface AuthState {
  userId: string | null;
  role: 'CUSTOMER' | 'MERCHANT' | 'ADMIN' | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  setAuth: (userId: string, role: 'CUSTOMER' | 'MERCHANT' | 'ADMIN', token: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  userId: null,
  role: null,
  accessToken: null,
  isAuthenticated: false,
  setAuth: (userId, role, token) => set({
    userId,
    role,
    accessToken: token,
    isAuthenticated: true,
  }),
  clearAuth: () => set({
    userId: null,
    role: null,
    accessToken: null,
    isAuthenticated: false,
  }),
}));