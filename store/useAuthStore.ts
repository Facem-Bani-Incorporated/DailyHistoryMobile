// store/useAuthStore.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface AuthState {
  token: string | null;
  user: any | null;
  setAuth: (token: string, user: any) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setAuth: (token, user) => {
        console.log('[AUTH STORE] setAuth called, token:', token ? token.substring(0, 20) + '...' : 'NULL');
        set({ token, user });
      },
      logout: () => {
        // Stack trace ca să vedem EXACT cine apelează logout
        const stack = new Error().stack;
        console.log('[AUTH STORE] logout called FROM:\n', stack);
        set({ token: null, user: null });
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.error('[AUTH STORE] Hydration error:', error);
        } else {
          console.log('[AUTH STORE] Hydration complete, token:', state?.token ? 'EXISTS' : 'NULL');
        }
      },
    }
  )
);