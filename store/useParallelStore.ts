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
// Free gets one run per WORLD, plus a second on that world in exchange for a rewarded
// video; PRO unlimited. It used to be a single run per calendar day across every event,
// which made the archive unreachable — a player who spent today's run on one fork could
// not look at the other fifty-nine, so the back catalogue that the hub exists to show
// was decoration. Per-world is more generous and points the player at more content
// rather than less. The wall is always the number of attempts, never the content.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { useAuthStore } from './useAuthStore';

/** Runs still available on one world, ignoring PRO. Shared by the store action and the
 *  hook so the button and the guard can never disagree about whether a play is left. */
const runsLeft = (d: ParallelData, eventId: string): number =>
  Math.max(0, FREE_RUNS_PER_WORLD + (d.adRuns[eventId] ?? 0) - (d.attempts[eventId] ?? 0));

const getUserId = (): string => {
  try {
    return useAuthStore.getState().user?.id ?? 'guest';
  } catch {
    return 'guest';
  }
};

/** Free runs on each world, before any ad is watched. */
export const FREE_RUNS_PER_WORLD = 1;
/** Extra runs a rewarded video buys on a world. Once per world, ever. */
export const REWARDED_RUNS_PER_WORLD = 1;

interface ParallelData {
  /** eventId -> runs started on that world, ever. */
  attempts: Record<string, number>;
  /** eventId -> extra runs earned by watching an ad. Capped at REWARDED_RUNS_PER_WORLD. */
  adRuns: Record<string, number>;
  /** eventId -> ending ids discovered, ever. */
  discovered: Record<string, string[]>;
}

const EMPTY: ParallelData = { attempts: {}, adRuns: {}, discovered: {} };

/** Fill in whatever a stored record is missing.
 *
 *  `?? EMPTY` is not enough and that mistake shipped: it only fires on null/undefined,
 *  and an account that used this feature before the per-world rewrite HAS a record — the
 *  old `{ runDate, runsToday, discovered }` one. That record is not nullish, so the
 *  default was skipped, `d.adRuns` was undefined, and reading `d.adRuns[eventId]` threw
 *  on every existing install. Everything that touches a stored record goes through here
 *  so a shape older than the current one can never do that again. */
const hydrate = (d: Partial<ParallelData> | undefined): ParallelData => ({
  attempts: d?.attempts ?? EMPTY.attempts,
  adRuns: d?.adRuns ?? EMPTY.adRuns,
  discovered: d?.discovered ?? EMPTY.discovered,
});

/** Shared empty array: a fresh `[]` from a selector re-renders forever (Object.is). */
export const NO_ENDINGS: string[] = [];

interface ParallelState {
  _perUser: Record<string, ParallelData>;

  getData: () => ParallelData;
  runsLeftFor: (eventId: string, isPro: boolean) => number;
  canWatchAdFor: (eventId: string, isPro: boolean) => boolean;
  startRun: (eventId: string) => void;
  grantRewardedRun: (eventId: string) => void;
  recordEnding: (eventId: string, endingId: string) => void;
  reset: () => void;
}

export const useParallelStore = create<ParallelState>()(
  persist(
    (set, get) => {
      const read = (): ParallelData => hydrate(get()._perUser[getUserId()]);
      const write = (patch: Partial<ParallelData>) => {
        const uid = getUserId();
        set(s => ({
          _perUser: { ...s._perUser, [uid]: { ...hydrate(s._perUser[uid]), ...patch } },
        }));
      };

      return {
        _perUser: {},

        getData: read,

        runsLeftFor: (eventId, isPro) => {
          if (isPro) return Infinity;
          return runsLeft(read(), eventId);
        },

        // True only in the gap between spending the free run and spending the earned
        // one. Offering the ad before the free run is used would sell what is already
        // free; offering it after would sell what cannot be delivered.
        canWatchAdFor: (eventId, isPro) => {
          if (isPro) return false;
          const d = read();
          return runsLeft(d, eventId) <= 0
            && (d.adRuns[eventId] ?? 0) < REWARDED_RUNS_PER_WORLD;
        },

        // Counted when a run STARTS. Counting at the end would make abandoning at the
        // last decision a free retry, and the choice that matters most would be the one
        // with no cost to redo.
        startRun: (eventId) => {
          const d = read();
          write({ attempts: { ...d.attempts, [eventId]: (d.attempts[eventId] ?? 0) + 1 } });
        },

        grantRewardedRun: (eventId) => {
          const d = read();
          const had = d.adRuns[eventId] ?? 0;
          if (had >= REWARDED_RUNS_PER_WORLD) return;
          write({ adRuns: { ...d.adRuns, [eventId]: had + 1 } });
        },

        recordEnding: (eventId, endingId) => {
          const d = read();
          const had = d.discovered[eventId] ?? NO_ENDINGS;
          if (had.includes(endingId)) return;
          write({ discovered: { ...d.discovered, [eventId]: [...had, endingId] } });
        },

        reset: () => write({ attempts: {}, adRuns: {}, discovered: {} }),
      };
    },
    {
      // v2: state moved under `_perUser`. The key is deliberately unchanged for the
      // per-world migration: `attempts` and `adRuns` simply arrive empty on an existing
      // install, which grants everyone a fresh free run, while `discovered` — the
      // collection, and the whole reason anyone comes back — is preserved.
      name: 'parallel_universes_v2',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ _perUser: s._perUser }),
    },
  ),
);

/** Endings this user has found for an event. Stable reference when there are none. */
export function useDiscovered(eventId: string): string[] {
  const perUser = useParallelStore(s => s._perUser);
  return hydrate(perUser[getUserId()]).discovered[eventId] ?? NO_ENDINGS;
}

/** Runs left on one world for the current user. Infinity for PRO. */
export function useRunsLeftFor(eventId: string, isPro: boolean): number {
  const perUser = useParallelStore(s => s._perUser);
  if (isPro) return Infinity;
  return runsLeft(hydrate(perUser[getUserId()]), eventId);
}

/** Whether a rewarded video would buy this user another run on this world. */
export function useCanWatchAdFor(eventId: string, isPro: boolean): boolean {
  const perUser = useParallelStore(s => s._perUser);
  if (isPro) return false;
  const d = hydrate(perUser[getUserId()]);
  return runsLeft(d, eventId) <= 0
    && (d.adRuns[eventId] ?? 0) < REWARDED_RUNS_PER_WORLD;
}
