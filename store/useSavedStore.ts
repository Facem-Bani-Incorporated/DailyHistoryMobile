// store/useSavedStore.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

// Extrage un ID unic din event indiferent de denumirea câmpului din API
export const getEventId = (event: any): string => {
  const id =
    event?.id ??
    event?.eventId ??
    event?.daily_content_id ??
    event?.dailyContentId ??
    event?._id;

  if (id !== undefined && id !== null) return String(id);

  // Fallback: combinație din dată + titlu en
  const date = event?.eventDate ?? event?.event_date ?? event?.year ?? '';
  const title = event?.titleTranslations?.en ?? '';
  return `${date}_${title}`.slice(0, 80);
};

interface SavedStore {
  savedEvents: any[];
  saveEvent: (event: any) => void;
  removeEvent: (eventId: string) => void;
  isSaved: (eventId: string) => boolean;
}

export const useSavedStore = create<SavedStore>()(
  persist(
    (set, get) => ({
      savedEvents: [],

      saveEvent: (event: any) => {
        const id = getEventId(event);
        const already = get().savedEvents.find(e => getEventId(e) === id);
        if (already) return;
        set(state => ({ savedEvents: [event, ...state.savedEvents] }));
      },

      removeEvent: (eventId: string) => {
        set(state => ({
          savedEvents: state.savedEvents.filter(e => getEventId(e) !== eventId),
        }));
      },

      isSaved: (eventId: string) => {
        return get().savedEvents.some(e => getEventId(e) === eventId);
      },
    }),
    {
      name: 'saved_events',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);