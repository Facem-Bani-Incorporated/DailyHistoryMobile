// store/usePaywallStore.ts
// Decides *when* the paywall may appear. The paywall itself is RevenueCat's UI;
// this store only owns the timing policy, so the rules live in one readable place
// instead of being scattered across call sites.
//
// Policy:
//  - The paywall left onboarding. It now appears only after the user has shown
//    intent: a second session, repeated unlock attempts without coins, or a
//    handful of rewarded ads watched (at which point "no ads" is a real pitch).
//  - Each trigger fires at most once, ever.
//  - A global cooldown means two triggers can never stack into back-to-back
//    paywalls. Without it, "2nd session" + "3rd failed unlock" could both fire
//    in the same minute.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type PaywallTrigger = 'second_session' | 'failed_unlocks' | 'rewarded_milestone';

/** Session number that earns the first paywall. */
export const SESSIONS_BEFORE_PAYWALL = 2;
/** Unlock attempts without enough coins before we pitch PRO. */
export const FAILED_UNLOCKS_BEFORE_PAYWALL = 3;
/** Rewarded ads watched before "remove ads" becomes a credible offer. */
export const REWARDED_BEFORE_PAYWALL = 5;
/** Minimum gap between two paywalls, whatever the trigger. */
export const PAYWALL_COOLDOWN_MS = 72 * 60 * 60 * 1000; // 72h

interface PaywallState {
  sessions: number;
  failedUnlocks: number;
  rewardedWatched: number;
  lastShownAt: number;
  firedTriggers: PaywallTrigger[];

  registerSession: () => void;
  registerFailedUnlock: () => void;
  registerRewardedWatched: () => void;

  /** True when this trigger is due, unused, and outside the cooldown. */
  shouldShow: (trigger: PaywallTrigger) => boolean;
  markShown: (trigger: PaywallTrigger) => void;
  reset: () => void;
}

const initial = {
  sessions: 0,
  failedUnlocks: 0,
  rewardedWatched: 0,
  lastShownAt: 0,
  firedTriggers: [] as PaywallTrigger[],
};

export const usePaywallStore = create<PaywallState>()(
  persist(
    (set, get) => ({
      ...initial,

      registerSession: () => set(s => ({ sessions: s.sessions + 1 })),
      registerFailedUnlock: () => set(s => ({ failedUnlocks: s.failedUnlocks + 1 })),
      registerRewardedWatched: () => set(s => ({ rewardedWatched: s.rewardedWatched + 1 })),

      shouldShow: (trigger) => {
        const s = get();
        if (s.firedTriggers.includes(trigger)) return false;
        if (Date.now() - s.lastShownAt < PAYWALL_COOLDOWN_MS) return false;
        switch (trigger) {
          case 'second_session':     return s.sessions >= SESSIONS_BEFORE_PAYWALL;
          case 'failed_unlocks':     return s.failedUnlocks >= FAILED_UNLOCKS_BEFORE_PAYWALL;
          case 'rewarded_milestone': return s.rewardedWatched >= REWARDED_BEFORE_PAYWALL;
          default:                   return false;
        }
      },

      markShown: (trigger) => set(s => ({
        lastShownAt: Date.now(),
        firedTriggers: s.firedTriggers.includes(trigger) ? s.firedTriggers : [...s.firedTriggers, trigger],
      })),

      reset: () => set({ ...initial }),
    }),
    {
      name: 'paywall_policy_v1',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
