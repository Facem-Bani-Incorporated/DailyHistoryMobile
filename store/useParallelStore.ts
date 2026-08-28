// store/useParallelStore.ts
// Run limits and the ending collection for Parallel Universes.
//
// The collection is the retention mechanic, not the run limit. Eight endings per event
// means a player who finishes one has seen an eighth of what is there, and the grid of
// empty slots is what pulls them back into an event they have already "read".
//
// Free gets one run a day across all events — enough to form the habit, tight enough
// that the eight-slot grid stays mostly empty. PRO gets unlimited runs, which is the
// honest version of "more": the wall is the number of attempts, never the content.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

const todayISO = () => new Date().toISOString().split('T')[0];

/** Runs a free account gets per calendar day, across every event. */
export const FREE_RUNS_PER_DAY = 1;

interface ParallelState {
  /** Calendar date the run counter belongs to. */
  runDate: string | null;
  /** Runs started today. */
  runsToday: number;
  /** eventId -> ending ids discovered, ever. The collection survives everything. */
  discovered: Record<string, string[]>;

  runsLeft: (isPro: boolean) => number;
  canPlay: (isPro: boolean) => boolean;
  startRun: () => void;
  recordEnding: (eventId: string, endingId: string) => void;
  discoveredFor: (eventId: string) => string[];
  reset: () => void;
}

export const useParallelStore = create<ParallelState>()(
  persist(
    (set, get) => ({
      runDate: null,
      runsToday: 0,
      discovered: {},

      runsLeft: (isPro) => {
        if (isPro) return Infinity;
        const s = get();
        if (s.runDate !== todayISO()) return FREE_RUNS_PER_DAY;
        return Math.max(0, FREE_RUNS_PER_DAY - s.runsToday);
      },

      canPlay: (isPro) => isPro || get().runsLeft(false) > 0,

      // Counted when a run STARTS, not when it ends. Otherwise abandoning at the last
      // decision would be a free retry, and the choice that matters most would be the
      // one with no cost to redo.
      startRun: () => set(s => {
        const today = todayISO();
        return s.runDate === today
          ? { runsToday: s.runsToday + 1 }
          : { runDate: today, runsToday: 1 };
      }),

      recordEnding: (eventId, endingId) => set(s => {
        const had = s.discovered[eventId] ?? [];
        if (had.includes(endingId)) return s;
        return { discovered: { ...s.discovered, [eventId]: [...had, endingId] } };
      }),

      discoveredFor: (eventId) => get().discovered[eventId] ?? [],

      reset: () => set({ runDate: null, runsToday: 0, discovered: {} }),
    }),
    {
      name: 'parallel_universes_v1',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
