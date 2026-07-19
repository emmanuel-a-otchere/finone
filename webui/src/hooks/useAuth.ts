import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '../lib/api';
import type { AuthState } from '../types';

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      bootstrapped: false,

      login: async (username: string, password: string) => {
        try {
          const data = await api.login(username, password);
          api.setToken(data.access_token);
          set({
            user: { username },
            token: data.access_token,
            isAuthenticated: true,
          });
          return true;
        } catch {
          return false;
        }
      },

      logout: () => {
        api.setToken(null);
        set({
          user: null,
          token: null,
          isAuthenticated: false,
        });
      },

      // Single-user bootstrap: the backend hands out a static token to anyone
      // who can reach it (personal deployment — network access IS the access
      // control). If the endpoint 404s the backend is multi-user; leave state
      // untouched and the login page will show when needed.
      bootstrap: async () => {
        try {
          const { access_token } = await api.getSingleUserToken();
          api.setToken(access_token);
          let username = 'owner';
          try { username = (await api.getMe()).username; } catch { /* cosmetic */ }
          set({
            user: { username },
            token: access_token,
            isAuthenticated: true,
          });
        } catch {
          // Multi-user mode — fall through to LoginPage.
        } finally {
          set({ bootstrapped: true });
        }
      },
    }),
    {
      name: 'systemone-auth',
      // bootstrapped must always re-run on app start — persist it forced to
      // false so a rehydrated store still shows the loading state first.
      partialize: (state) => ({ ...state, bootstrapped: false }),
      onRehydrateStorage: () => (state) => {
        if (state?.token) {
          api.setToken(state.token);
        }
      },
    }
  )
);
