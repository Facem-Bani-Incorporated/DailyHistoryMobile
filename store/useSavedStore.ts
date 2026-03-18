// store/useSavedStore.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { useAuthStore } from './useAuthStore';

// ── Helpers ──────────────────────────────────────────────
export const getEventId = (event: any): string => {
  const id =
    event?.id ??
    event?.eventId ??
    event?.daily_content_id ??
    event?.dailyContentId ??
    event?._id;

  if (id !== undefined && id !== null) return String(id);

  const date = event?.eventDate ?? event?.event_date ?? event?.year ?? '';
  const title = event?.titleTranslations?.en ?? '';
  return `${date}_${title}`.slice(0, 80);
};

const getUserId = (): string => {
  try {
    return useAuthStore.getState().user?.id ?? 'guest';
  } catch {
    return 'guest';
  }
};

// ── Types ────────────────────────────────────────────────
interface SavedStore {
  // Internal per-user map
  _perUser: Record<string, any[]>;

  // BACKWARDS COMPATIBLE: other files that read `savedEvents` still work
  savedEvents: any[];

  saveEvent: (event: any) => void;
  removeEvent: (eventId: string) => void;
  isSaved: (eventId: string) => boolean;
}

// Helper: builds the next state and computes savedEvents from current user
const buildState = (perUser: Record<string, any[]>) => {
  const uid = getUserId();
  return {
    _perUser: perUser,
    savedEvents: perUser[uid] ?? [],
  };
};

export const useSavedStore = create<SavedStore>()(
  persist(
    (set, get) => ({
      _perUser: {},
      savedEvents: [],

      saveEvent: (event: any) => {
        const uid = getUserId();
        const id = getEventId(event);
        const current = get()._perUser[uid] ?? [];
        if (current.some(e => getEventId(e) === id)) return;
        const updated = { ...get()._perUser, [uid]: [event, ...current] };
        set(buildState(updated));
      },

      removeEvent: (eventId: string) => {
        const uid = getUserId();
        const current = get()._perUser[uid] ?? [];
        const updated = {
          ...get()._perUser,
          [uid]: current.filter(e => getEventId(e) !== eventId),
        };
        set(buildState(updated));
      },

      isSaved: (eventId: string) => {
        const uid = getUserId();
        return (get()._perUser[uid] ?? []).some(e => getEventId(e) === eventId);
      },
    }),
    {
      name: 'saved_events',
      storage: createJSONStorage(() => AsyncStorage),
      version: 2,

      migrate: (persisted: any, version: number) => {
        try {
          if (!persisted || typeof persisted !== 'object') {
            return { _perUser: {}, savedEvents: [] };
          }

          // v0 / v1: old format had `savedEvents` array at top level
          if (version < 2) {
            const oldEvents = Array.isArray(persisted.savedEvents)
              ? persisted.savedEvents
              : [];
            const perUser = oldEvents.length > 0 ? { guest: oldEvents } : {};
            return {
              _perUser: perUser,
              savedEvents: [], // will be recomputed on first access
            };
          }

          return persisted;
        } catch {
          // If anything goes wrong, start fresh — never crash
          return { _perUser: {}, savedEvents: [] };
        }
      },

      // Recompute savedEvents after rehydration so it matches current user
      onRehydrateStorage: () => {
        return (state, error) => {
          if (error || !state) return;
          try {
            const uid = getUserId();
            const events = state._perUser?.[uid] ?? [];
            useSavedStore.setState({ savedEvents: events });
          } catch {
            // silent
          }
        };
      },

      // Only persist _perUser, not the computed savedEvents
      partialize: (state) => ({
        _perUser: state._perUser,
      } as any),
    }
  )
);

// ── Reactive hook for current user's saved events ────────
// Use this in saved.tsx for guaranteed reactivity
export const useUserSavedEvents = (): any[] => {
  const user = useAuthStore(s => s.user);
  const perUser = useSavedStore(s => s._perUser);
  const uid = user?.id ?? 'guest';
  return perUser[uid] ?? [];
};

// ── Keep savedEvents in sync when auth changes ──────────
// Call this once in your root layout or App.tsx:
//   useKeepSavedInSync();
export const useKeepSavedInSync = () => {
  const user = useAuthStore(s => s.user);
  const perUser = useSavedStore(s => s._perUser);

  // Update savedEvents whenever user changes
  const uid = user?.id ?? 'guest';
  const events = perUser[uid] ?? [];
  const current = useSavedStore.getState().savedEvents;

  // Only update if different reference
  if (current !== events) {
    useSavedStore.setState({ savedEvents: events });
  }
};