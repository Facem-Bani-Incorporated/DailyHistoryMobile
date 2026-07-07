// store/useUnlockStore.ts
// Tiny controller for the per-event "Unlock this story" sheet (UnlockStoryModal).
// Any locked PRO card (Today's ProCardSection, every Discover PRO card) calls
// open(event); the globally-mounted UnlockStoryModal reads the event from here and
// drives the coin-spend / watch-a-clip flow. Keeping the event in a store means the
// modal can live once at the app root instead of being duplicated per card.
import { create } from 'zustand';

interface UnlockState {
  visible: boolean;
  event: any | null;
  open: (event: any) => void;
  hide: () => void;
}

export const useUnlockStore = create<UnlockState>((set) => ({
  visible: false,
  event: null,
  open: (event) => set({ visible: true, event }),
  hide: () => set({ visible: false, event: null }),
}));
