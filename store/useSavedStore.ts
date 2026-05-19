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
  _perUser: Record<string, any[]>;
  savedEvents: any[];
  isLoading: boolean;

  saveEvent: (event: any) => void;
  removeEvent: (eventId: string) => void;
  isSaved: (eventId: string) => boolean;
  clearForUser: (userId: string) => void;
}

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
      isLoading: true,

      saveEvent: (event: any) => {
        const uid = getUserId();
        const id = getEventId(event);
        const current = get()._perUser[uid] ?? [];
        if (current.some(e => getEventId(e) === id)) return;
        const updated = { ...get()._perUser, [uid]: [event, ...current] };
        set(buildState(updated));
        try { require('../hooks/useGamificationSync').pushToServer(); } catch {}
      },

      removeEvent: (eventId: string) => {
        const uid = getUserId();
        const current = get()._perUser[uid] ?? [];
        const updated = {
          ...get()._perUser,
          [uid]: current.filter(e => getEventId(e) !== eventId),
        };
        set(buildState(updated));
        try { require('../hooks/useGamificationSync').pushToServer(); } catch {}
      },

      isSaved: (eventId: string) => {
        const uid = getUserId();
        return (get()._perUser[uid] ?? []).some(e => getEventId(e) === eventId);
      },

      clearForUser: (userId: string) => {
        const updated = { ...get()._perUser, [userId]: [] };
        set({ _perUser: updated, savedEvents: [] });
      },
    }),
    {
      name: 'saved-events-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ _perUser: state._perUser }),
    }
  )
);

// ── Reactive hook for current user's saved events ────────
export const useUserSavedEvents = (): any[] => {
  const user = useAuthStore(s => s.user);
  const perUser = useSavedStore(s => s._perUser);
  const uid = user?.id ?? 'guest';
  return perUser[uid] ?? [];
};

// ── Legacy compat ────────────────────────────────────────
export const useKeepSavedInSync = () => {
  const user = useAuthStore(s => s.user);
  const perUser = useSavedStore(s => s._perUser);
  const uid = user?.id ?? 'guest';
  const events = perUser[uid] ?? [];
  const current = useSavedStore.getState().savedEvents;
  if (current !== events) {
    useSavedStore.setState({ savedEvents: events });
  }
};
