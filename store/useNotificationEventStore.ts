// store/useNotificationEventStore.ts
import { create } from 'zustand';

interface NotificationEventStore {
  /** Event the user tapped from a notification */
  pendingEvent: any | null;
  /** Store an event to be opened */
  setPendingEvent: (event: any) => void;
  /** Clear after it's been consumed */
  clearPendingEvent: () => void;
}

export const useNotificationEventStore = create<NotificationEventStore>((set) => ({
  pendingEvent: null,
  setPendingEvent: (event) => set({ pendingEvent: event }),
  clearPendingEvent: () => set({ pendingEvent: null }),
}));
