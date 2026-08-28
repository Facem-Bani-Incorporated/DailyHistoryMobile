// store/useParallelStore.ts
// Run limits and the ending collection for Parallel Universes.
//
// Partitioned per user under `_perUser`, like useCoinStore and useSavedStore. A shared
// device must not let one account spend another's run — or, worse, show one player
// someone else's collection.
//
// The collection is the retention mechanic, not the run limit. Eight endings per event
// means finishing one shows you an eighth of what is there, and the grid of empty slots
// is what pulls a player back into an event they have already read.
//
// Free gets one run a day across all events; PRO unlimited. The wall is always the
// number of attempts, never the content.
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

/** Runs a free account gets per calendar day, across every event. */
export const FREE_RUNS_PER_DAY = 1;

interface ParallelData {
  runDate: string | null;
  runsToday: number;
  /** eventId -> ending ids discovered, ever. */
  discovered: Record<string, string[]>;
}

const EMPTY: ParallelData = { runDate: null, runsToday: 0, discovered: {} };

/** Shared empty array: a fresh `[]` from a selector re-renders forever (Object.is). */
export const NO_ENDINGS: string[] = [];

interface ParallelState {
  _perUser: Record<string, ParallelData>;

  getData: () => ParallelData;
  runsLeft: (isPro: boolean) => number;
  startRun: () => void;
  recordEnding: (eventId: string, endingId: string) => void;
  reset: () => void;
}

export const useParallelStore = create<ParallelState>()(
  persist(
    (set, get) => {
      const read = (): ParallelData => get()._perUser[getUserId()] ?? EMPTY;
      const write = (patch: Partial<ParallelData>) => {
        const uid = getUserId();
        set(s => ({
          _perUser: { ...s._perUser, [uid]: { ...(s._perUser[uid] ?? EMPTY), ...patch } },
        }));
      };

      return {
        _perUser: {},

        getData: read,

        runsLeft: (isPro) => {
          if (isPro) return Infinity;
          const d = read();
          if (d.runDate !== todayISO()) return FREE_RUNS_PER_DAY;
          return Math.max(0, FREE_RUNS_PER_DAY - d.runsToday);
        },

        // Counted when a run STARTS. Counting at the end would make abandoning at the
        // last decision a free retry, and the choice that matters most would be the one
        // with no cost to redo.
        startRun: () => {
          const d = read();
          const today = todayISO();
          write(d.runDate === today
            ? { runsToday: d.runsToday + 1 }
            : { runDate: today, runsToday: 1 });
        },

        recordEnding: (eventId, endingId) => {
          const d = read();
          const had = d.discovered[eventId] ?? NO_ENDINGS;
          if (had.includes(endingId)) return;
          write({ discovered: { ...d.discovered, [eventId]: [...had, endingId] } });
        },

        reset: () => write({ ...EMPTY, discovered: {} }),
      };
    },
    {
      // v2: state moved under `_perUser`.
      name: 'parallel_universes_v2',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ _perUser: s._perUser }),
    },
  ),
);

/** Endings this user has found for an event. Stable reference when there are none. */
export function useDiscovered(eventId: string): string[] {
  const perUser = useParallelStore(s => s._perUser);
  return (perUser[getUserId()] ?? EMPTY).discovered[eventId] ?? NO_ENDINGS;
}

/** Runs left today for the current user. Infinity for PRO. */
export function useRunsLeft(isPro: boolean): number {
  const perUser = useParallelStore(s => s._perUser);
  if (isPro) return Infinity;
  const d = perUser[getUserId()] ?? EMPTY;
  if (d.runDate !== todayISO()) return FREE_RUNS_PER_DAY;
  return Math.max(0, FREE_RUNS_PER_DAY - d.runsToday);
}
