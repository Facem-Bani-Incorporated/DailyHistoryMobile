// store/useWheelStore.ts
// Daily-wheel state: whether today's free spin is still available, whether the ad
// bonus round has been used, and a short history of what was won.
//
// Keyed on the local calendar date rather than a rolling 24h window. A wheel is a
// habit anchor — "come back tomorrow" is a clearer promise than "come back in 24
// hours", and it lines up with the streak, which already resets on calendar days.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

const todayISO = () => new Date().toISOString().split('T')[0];

export interface WheelWin {
  prizeId: string;
  date: string;
  /** Which wheel produced it — the ad round can never award PRO. */
  source: 'free' | 'ad';
}

interface WheelState {
  /** Calendar date of the last free spin. */
  lastSpinDate: string | null;
  /** Calendar date the ad bonus round was last used. */
  lastAdSpinDate: string | null;
  /** Most recent wins, newest first. Capped — this is a receipt, not an archive. */
  history: WheelWin[];
  /** Unused streak shields. Consumed by the gamification store when a day is missed. */
  streakShields: number;

  canSpin: () => boolean;
  canSpinAd: () => boolean;
  recordSpin: (prizeId: string, source: 'free' | 'ad') => void;
  addShield: () => void;
  consumeShield: () => boolean;
  reset: () => void;
}

const MAX_HISTORY = 20;

export const useWheelStore = create<WheelState>()(
  persist(
    (set, get) => ({
      lastSpinDate: null,
      lastAdSpinDate: null,
      history: [],
      streakShields: 0,

      canSpin: () => get().lastSpinDate !== todayISO(),

      // The bonus round is only offered once the free spin is spent, so it reads as a
      // continuation of the moment rather than a competing offer.
      canSpinAd: () => get().lastSpinDate === todayISO() && get().lastAdSpinDate !== todayISO(),

      recordSpin: (prizeId, source) => set(s => ({
        lastSpinDate: source === 'free' ? todayISO() : s.lastSpinDate,
        lastAdSpinDate: source === 'ad' ? todayISO() : s.lastAdSpinDate,
        history: [{ prizeId, date: todayISO(), source }, ...s.history].slice(0, MAX_HISTORY),
      })),

      addShield: () => set(s => ({ streakShields: s.streakShields + 1 })),

      consumeShield: () => {
        if (get().streakShields <= 0) return false;
        set(s => ({ streakShields: s.streakShields - 1 }));
        return true;
      },

      reset: () => set({ lastSpinDate: null, lastAdSpinDate: null, history: [], streakShields: 0 }),
    }),
    {
      name: 'daily_wheel_v1',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
