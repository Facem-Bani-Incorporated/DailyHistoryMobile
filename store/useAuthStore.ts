// store/useAuthStore.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export interface User {
  id: string;
  email: string;
  username?: string;
  avatar_url?: string | null;
  picture?: string | null;
  provider: 'google' | 'apple' | 'standard';
  roles?: string[];

  // permite orice alt câmp din backend
  [key: string]: any;
}

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  setAuth: (token: string, user: User) => void;
  updateUser: (patch: Partial<User>) => void;
  logout: () => void;
  deleteAccountCleanup: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      setAuth: (token, user) =>
        set({
          token,
          user,
          isAuthenticated: true,
        }),
      updateUser: (patch) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...patch } : state.user,
        })),
      logout: () => {
        // ── Sync gamification to server before clearing ──
        try {
          const { pushToServer } = require('../hooks/useGamificationSync');
          pushToServer().catch(() => {});
        } catch {
          // Hook not available — skip silently
        }

        // ── Clear gamification local state ──
        try {
          const { useGamificationStore } = require('./useGamificationStore');
          useGamificationStore.getState().clearUserData();
        } catch {
          // Store not available — skip silently
        }

        // ── Clear auth ──
        set({
          token: null,
          user: null,
          isAuthenticated: false,
        });
      },
      // Local cleanup after an account is deleted on the server.
      // Unlike logout(), it does NOT push gamification to the server first —
      // the account no longer exists, so that call would be wasted / 404.
      deleteAccountCleanup: () => {
        const userId = get().user?.id;

        // ── Clear gamification local state ──
        try {
          const { useGamificationStore } = require('./useGamificationStore');
          useGamificationStore.getState().clearUserData();
        } catch {
          // Store not available — skip silently
        }

        // ── Clear saved events for this user ──
        try {
          if (userId) {
            const { useSavedStore } = require('./useSavedStore');
            useSavedStore.getState().clearForUser(String(userId));
          }
        } catch {
          // Store not available — skip silently
        }

        // ── Clear auth ──
        set({
          token: null,
          user: null,
          isAuthenticated: false,
        });
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);