// store/usePreferencesStore.ts
//
// User content preferences, persisted to AsyncStorage.
//
// `interests` holds the category keys the user picked in the onboarding
// interest quiz (e.g. 'war_conflict', 'science_discovery'). The home screen
// uses them to rank each day's events so matching categories surface first.
// `interestQuizDone` gates the one-time quiz so it isn't shown again.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface PreferencesState {
  /** Category keys the user is interested in (lowercase, e.g. 'culture_arts'). */
  interests: string[];
  /** Whether the interest quiz has been shown/answered at least once. */
  interestQuizDone: boolean;
  setInterests: (interests: string[]) => void;
  /** Save the picks and mark the quiz complete so it won't show again. */
  completeInterestQuiz: (interests: string[]) => void;
  /** Allow re-taking the quiz (e.g. from a future settings entry). */
  resetInterestQuiz: () => void;
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      interests: [],
      interestQuizDone: false,
      setInterests: (interests) => set({ interests }),
      completeInterestQuiz: (interests) => set({ interests, interestQuizDone: true }),
      resetInterestQuiz: () => set({ interests: [], interestQuizDone: false }),
    }),
    {
      name: 'preferences_v1',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
