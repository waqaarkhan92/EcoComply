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
  role?: string; // CONSULTANT, OWNER, MANAGER, etc.
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

interface AuthStateWithHydration extends AuthState {
  _hasHydrated: boolean;
  setHasHydrated: (state: boolean) => void;
}

export const useAuthStore = create<AuthStateWithHydration>()(
  persist(
    (set) => ({
      user: null,
      company: null,
      roles: [],
      isAuthenticated: false,
      accessToken: null,
      refreshToken: null,
      _hasHydrated: false,
      setHasHydrated: (state) => {
        set({ _hasHydrated: state });
      },
      login: (user, company, roles, tokens) => {
        // Set cookie for server-side access (7 days expiry)
        if (typeof document !== 'undefined') {
          const maxAge = 7 * 24 * 60 * 60; // 7 days
          const isSecure = window.location.protocol === 'https:';
          document.cookie = `access_token=${tokens.access_token}; path=/; max-age=${maxAge}; SameSite=Lax${isSecure ? '; Secure' : ''}`;
        }
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
        // Clear cookie
        if (typeof document !== 'undefined') {
          document.cookie = 'access_token=; path=/; max-age=0';
        }
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
        // Update cookie when tokens are refreshed (7 days expiry)
        if (typeof document !== 'undefined') {
          const maxAge = 7 * 24 * 60 * 60; // 7 days
          const isSecure = window.location.protocol === 'https:';
          document.cookie = `access_token=${tokens.access_token}; path=/; max-age=${maxAge}; SameSite=Lax${isSecure ? '; Secure' : ''}`;
        }
        set({
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
        });
      },
    }),
    {
      name: 'auth-storage',
      onRehydrateStorage: () => (state) => {
        // Mark as hydrated when rehydration completes
        if (state) {
          state.setHasHydrated(true);
          // Also set cookie from stored token if available
          if (state.accessToken && typeof document !== 'undefined') {
            const maxAge = 7 * 24 * 60 * 60; // 7 days
            const isSecure = window.location.protocol === 'https:';
            document.cookie = `access_token=${state.accessToken}; path=/; max-age=${maxAge}; SameSite=Lax${isSecure ? '; Secure' : ''}`;
          }
        }
      },
    }
  )
);

