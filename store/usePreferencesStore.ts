// store/usePreferencesStore.ts
//
// Per-user content preferences, persisted to AsyncStorage.
//
// Partitioned by user id (like useSavedStore) so each account keeps its own
// interest picks — switching/creating accounts on the same device does not
// leak one user's choices onto another. `interests` holds the category keys
// picked in the interest quiz; `interestQuizDone` gates the one-time quiz.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { useAuthStore } from './useAuthStore';

interface UserPrefs {
  interests: string[];
  interestQuizDone: boolean;
}

const EMPTY_PREFS: UserPrefs = { interests: [], interestQuizDone: false };

const getUserId = (): string => {
  try {
    return useAuthStore.getState().user?.id ?? 'guest';
  } catch {
    return 'guest';
  }
};

interface PreferencesState {
  _perUser: Record<string, UserPrefs>;
  setInterests: (interests: string[]) => void;
  /** Save the picks and mark the quiz complete for the current user. */
  completeInterestQuiz: (interests: string[]) => void;
  /** Let the current user re-take the quiz. */
  resetInterestQuiz: () => void;
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set, get) => ({
      _perUser: {},
      setInterests: (interests) => {
        const uid = getUserId();
        const prev = get()._perUser[uid] ?? EMPTY_PREFS;
        set({ _perUser: { ...get()._perUser, [uid]: { ...prev, interests } } });
      },
      completeInterestQuiz: (interests) => {
        const uid = getUserId();
        set({ _perUser: { ...get()._perUser, [uid]: { interests, interestQuizDone: true } } });
      },
      resetInterestQuiz: () => {
        const uid = getUserId();
        set({ _perUser: { ...get()._perUser, [uid]: { ...EMPTY_PREFS } } });
      },
    }),
    {
      name: 'preferences_v2',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

// ── Reactive per-user hooks (re-render on user switch or data change) ──
export const useUserInterests = (): string[] => {
  const user = useAuthStore(s => s.user);
  const perUser = usePreferencesStore(s => s._perUser);
  return perUser[user?.id ?? 'guest']?.interests ?? [];
};

export const useInterestQuizDone = (): boolean => {
  const user = useAuthStore(s => s.user);
  const perUser = usePreferencesStore(s => s._perUser);
  return perUser[user?.id ?? 'guest']?.interestQuizDone ?? false;
};
