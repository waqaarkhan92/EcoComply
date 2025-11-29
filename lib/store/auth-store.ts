/**
 * Authentication Store (Zustand)
 * Manages authentication state and user session
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  full_name: string;
  company_id: string;
  email_verified: boolean;
}

interface Company {
  id: string;
  name: string;
  subscription_tier: 'core' | 'growth' | 'consultant';
}

interface AuthState {
  user: User | null;
  company: Company | null;
  roles: string[];
  isAuthenticated: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  login: (user: User, company: Company, roles: string[], tokens: { access_token: string; refresh_token: string }) => void;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
  setTokens: (tokens: { access_token: string; refresh_token: string }) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      company: null,
      roles: [],
      isAuthenticated: false,
      accessToken: null,
      refreshToken: null,
      login: (user, company, roles, tokens) => {
        set({
          user,
          company,
          roles,
          isAuthenticated: true,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
        });
      },
      logout: () => {
        set({
          user: null,
          company: null,
          roles: [],
          isAuthenticated: false,
          accessToken: null,
          refreshToken: null,
        });
      },
      updateUser: (updates) => {
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        }));
      },
      setTokens: (tokens) => {
        set({
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
        });
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);

