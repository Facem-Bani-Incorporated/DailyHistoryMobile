// store/useCoinPopupStore.ts
// Tiny controller for the opportunistic "watch a clip for a coin" pop-up.
// Triggers (after a quiz, leaving the map, the daily quiz, opening >6 events, or
// trying to unlock with 0 coins) call maybeShow(); it respects the cooldown and
// the active referral pass. Callers still guard on isPro (from RevenueCat).
import { create } from 'zustand';
import type { CoinPopupTrigger } from '../config/coins';
import { useAuthStore } from './useAuthStore';
import { useCoinStore } from './useCoinStore';

interface CoinPopupState {
  visible: boolean;
  trigger: CoinPopupTrigger | null;
  /** Show only if off cooldown and no referral pass is active. */
  maybeShow: (trigger: CoinPopupTrigger) => void;
  /** Force-show (e.g. from a "get coins" button). */
  show: (trigger: CoinPopupTrigger) => void;
  hide: () => void;
}

export const useCoinPopupStore = create<CoinPopupState>((set) => ({
  visible: false,
  trigger: null,
  maybeShow: (trigger) => {
    // Don't nag PRO users (backend is_pro) or anyone on an active referral pass.
    if (useAuthStore.getState().user?.is_pro === true) return;
    const coin = useCoinStore.getState();
    if (coin.isReferralActive()) return;
    if (!coin.canShowCoinPopup()) return;
    coin.markCoinPopupShown();
    set({ visible: true, trigger });
  },
  show: (trigger) => set({ visible: true, trigger }),
  hide: () => set({ visible: false, trigger: null }),
}));
