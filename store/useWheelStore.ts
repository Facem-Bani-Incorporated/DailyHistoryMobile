// store/useWheelStore.ts
// Daily-wheel state: whether today's free spin is still available, whether the ad
// bonus round has been used, and the unspent streak shields.
//
// Partitioned per user under `_perUser`, the same way useCoinStore and useSavedStore
// are. Devices get shared — a spin on one account used to mark the wheel spent for
// everyone else who logged in on that phone.
//
// Keyed on the local calendar date rather than a rolling 24h window. A wheel is a habit
// anchor, and "come back tomorrow" is a clearer promise than "come back in 24 hours".
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { useAuthStore } from './useAuthStore';

const todayISO = () => new Date().toISOString().split('T')[0];

const getUserId = (): string => {
  try {
    return useAuthStore.getState().user?.id ?? 'guest';
  } catch {
    return 'guest';
  }
};

export interface WheelWin {
  prizeId: string;
  date: string;
  /** Which wheel produced it — the ad round can never award PRO. */
  source: 'free' | 'ad';
}

interface WheelData {
  lastSpinDate: string | null;
  lastAdSpinDate: string | null;
  history: WheelWin[];
  streakShields: number;
}

const EMPTY: WheelData = {
  lastSpinDate: null,
  lastAdSpinDate: null,
  history: [],
  streakShields: 0,
};

const MAX_HISTORY = 20;

interface WheelState {
  _perUser: Record<string, WheelData>;

  /** This user's slice. Never returns undefined. */
  getData: () => WheelData;

  canSpin: () => boolean;
  canSpinAd: () => boolean;
  recordSpin: (prizeId: string, source: 'free' | 'ad') => void;
  addShield: () => void;
  consumeShield: () => boolean;
  reset: () => void;
}

export const useWheelStore = create<WheelState>()(
  persist(
    (set, get) => {
      const read = (): WheelData => get()._perUser[getUserId()] ?? EMPTY;
      const write = (patch: Partial<WheelData>) => {
        const uid = getUserId();
        set(s => ({
          _perUser: { ...s._perUser, [uid]: { ...(s._perUser[uid] ?? EMPTY), ...patch } },
        }));
      };

      return {
        _perUser: {},

        getData: read,

        canSpin: () => read().lastSpinDate !== todayISO(),

        // The bonus round is only offered once the free spin is spent, so it reads as a
        // continuation of the moment rather than a competing offer.
        canSpinAd: () => {
          const d = read();
          return d.lastSpinDate === todayISO() && d.lastAdSpinDate !== todayISO();
        },

        recordSpin: (prizeId, source) => {
          const d = read();
          write({
            lastSpinDate: source === 'free' ? todayISO() : d.lastSpinDate,
            lastAdSpinDate: source === 'ad' ? todayISO() : d.lastAdSpinDate,
            history: [{ prizeId, date: todayISO(), source }, ...d.history].slice(0, MAX_HISTORY),
          });
        },

        addShield: () => write({ streakShields: read().streakShields + 1 }),

        consumeShield: () => {
          const n = read().streakShields;
          if (n <= 0) return false;
          write({ streakShields: n - 1 });
          return true;
        },

        reset: () => write({ ...EMPTY }),
      };
    },
    {
      // v2: state moved under `_perUser`. A new name rather than a migration — the only
      // thing worth carrying was a day-scoped counter and a shield or two, and starting
      // those fresh is harmless next to the risk of a bad migration on a live app.
      name: 'daily_wheel_v2',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ _perUser: s._perUser }),
    },
  ),
);

/** Reactive "is today's spin still available" for the current user. */
export function useWheelReady(): boolean {
  const perUser = useWheelStore(s => s._perUser);
  return (perUser[getUserId()] ?? EMPTY).lastSpinDate !== todayISO();
}

/** Reactive "is the ad bonus round available" for the current user. */
export function useWheelAdReady(): boolean {
  const perUser = useWheelStore(s => s._perUser);
  const d = perUser[getUserId()] ?? EMPTY;
  return d.lastSpinDate === todayISO() && d.lastAdSpinDate !== todayISO();
}
