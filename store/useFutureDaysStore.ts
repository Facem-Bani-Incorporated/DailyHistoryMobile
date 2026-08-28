// store/useFutureDaysStore.ts
// The one remaining rewarded-ad unlock for content: tomorrow and the day after.
//
// This replaces four separate React-state flags (main/discover x day+1/day+2). The
// user perceives "tomorrow" as one thing, so asking for up to four clips to see it
// was friction that cost conversion — and exactly the request volume that drew the
// AdMob fill throttle. One clip now opens both days on both surfaces.
//
// It also persists. The old flags lived in component state and died with the process,
// so someone who watched a clip at 23:50 and reopened the app at 00:05 had paid with
// their attention for nothing. The window is a real 24 hours from the clip, not
// "until midnight".
//
// PRO users never touch this: future days are simply always open for them.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/** How long one clip keeps the next two days open. */
export const FUTURE_DAYS_WINDOW_MS = 24 * 60 * 60 * 1000;

interface FutureDaysState {
  /** Epoch ms. While in the future, days +1 and +2 are open on every surface. */
  unlockedUntil: number | null;
  unlock: () => void;
  isUnlocked: () => boolean;
  reset: () => void;
}

export const useFutureDaysStore = create<FutureDaysState>()(
  persist(
    (set, get) => ({
      unlockedUntil: null,

      // Deliberately not additive: a second clip inside the window re-bases the 24h
      // rather than stacking, so the user can never bank days by watching four in a row.
      unlock: () => set({ unlockedUntil: Date.now() + FUTURE_DAYS_WINDOW_MS }),

      isUnlocked: () => {
        const until = get().unlockedUntil;
        return !!until && Date.now() < until;
      },

      reset: () => set({ unlockedUntil: null }),
    }),
    {
      name: 'future_days_v1',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

/** Reactive variant that flips itself to false the moment the window closes.
 *  Zustand only re-renders when `unlockedUntil` changes, and expiry changes nothing
 *  in the store — so schedule a re-render for the exact moment it lapses. */
export function useFutureDaysUnlocked(): boolean {
  const until = useFutureDaysStore(s => s.unlockedUntil);
  const [, force] = useState(0);

  useEffect(() => {
    if (!until) return;
    const ms = until - Date.now();
    if (ms <= 0) return;
    const id = setTimeout(() => force(x => x + 1), ms + 250);
    return () => clearTimeout(id);
  }, [until]);

  return !!until && Date.now() < until;
}
