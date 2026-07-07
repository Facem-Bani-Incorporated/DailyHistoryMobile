// store/useUiStore.ts
// Cross-component overlay/navigation controller. The home screen owns the actual
// modals, but they now need to be openable from anywhere — the profile sheet
// (Achievements / Daily Challenge / Search rows) and the reward pop-ups
// (AchievementToast → achievements, CelebrationOverlay → profile). Keeping a tiny
// store avoids threading callbacks through deeply-nested components.
import { create } from 'zustand';

export type Overlay = 'achievements' | 'friends' | 'challenge' | 'profile';

interface UiState {
  open: Record<Overlay, boolean>;
  /** Bumped to request the home screen switch to the Search tab. */
  searchTick: number;
  show: (o: Overlay) => void;
  hide: (o: Overlay) => void;
  requestSearch: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  open: { achievements: false, friends: false, challenge: false, profile: false },
  searchTick: 0,
  show: (o) => set((s) => ({ open: { ...s.open, [o]: true } })),
  hide: (o) => set((s) => ({ open: { ...s.open, [o]: false } })),
  requestSearch: () => set((s) => ({ searchTick: s.searchTick + 1 })),
}));
