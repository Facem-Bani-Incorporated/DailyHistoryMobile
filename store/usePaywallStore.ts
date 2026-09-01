// store/usePaywallStore.ts
// Decides *when* the paywall may appear. The paywall itself is RevenueCat's UI;
// this store only owns the timing policy, so the rules live in one readable place
// instead of being scattered across call sites.
//
// What changed from v1, and why:
//
//  - v1 had three triggers, each firing ONCE EVER, behind a single 72h cooldown.
//    In practice `second_session` fired on day 1-2 for essentially everyone, and
//    `failed_unlocks` almost never did (coins were abundant enough that running out
//    was rare). The median user therefore saw the paywall exactly once in their
//    lifetime, before they had any idea what PRO contained. Purchases in content
//    subscriptions typically land on the third to fifth view, so the old policy
//    capped conversion at whatever the first-view rate happened to be.
//
//  - v2 lets each trigger fire TWICE, shortens the cooldown to 48h, and adds a hard
//    ceiling of 5 views per 30 days so "more chances" cannot become harassment.
//
//  - `failed_unlocks` is gone with the coin economy. Its replacements fire on real
//    intent: reaching the locked chapter list, filling the save allowance, tapping a
//    PRO story or a subscription-only map layer.
//
//  - `pass_expiring` is the strongest moment in the app and did not exist before: the
//    user has lived inside PRO for a day or more and is about to lose it.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type PaywallTrigger =
  | 'pass_expiring'      // a PRO Pass runs out within 12h — highest intent in the app
  | 'deep_dive_gate'     // tapped the locked chapter list
  | 'save_limit'         // filled the free save allowance
  | 'pro_story_blocked'  // repeatedly tapped PRO stories
  | 'map_layer_pro'      // tapped a subscription-only map layer
  | 'streak_at_risk'     // lost a streak worth protecting
  | 'rewarded_milestone' // watched enough ads that "no ads" is a real pitch
  | 'third_session';     // safety net for users who trip none of the above

/** Session number that earns the first paywall. Raised from 2: at session 2 the user
 *  has usually not seen a long read yet, so there is nothing concrete to sell. */
export const SESSIONS_BEFORE_PAYWALL = 3;
/** Locked-chapter-list taps before we pitch. The first tap shows the offer without
 *  pressure; the second is a deliberate repeat and reads as intent. */
export const DEEP_DIVE_GATES_BEFORE_PAYWALL = 2;
/** PRO story card taps before we pitch. */
export const PRO_TAPS_BEFORE_PAYWALL = 3;
/** Subscription-only map layer taps before we pitch. */
export const MAP_TAPS_BEFORE_PAYWALL = 2;
/** Rewarded ads watched before "remove ads" becomes a credible offer. */
export const REWARDED_BEFORE_PAYWALL = 6;
/** Minimum gap between two paywalls, whatever the trigger. */
export const PAYWALL_COOLDOWN_MS = 48 * 60 * 60 * 1000; // 48h
/** How often any single trigger may fire, ever. */
export const MAX_FIRES_PER_TRIGGER = 2;
/** Hard ceiling across all triggers, so the shorter cooldown cannot stack up. */
export const MAX_VIEWS_PER_MONTH = 5;
const MONTH_MS = 30 * 24 * 60 * 60 * 1000;

interface PaywallState {
  sessions: number;
  deepDiveGates: number;
  proStoryTaps: number;
  mapLayerTaps: number;
  rewardedWatched: number;
  lastShownAt: number;
  /** Trigger name → how many times it has fired. */
  fireCounts: Record<string, number>;
  /** Epoch ms of every paywall shown in the last 30 days. */
  recentViews: number[];
  /** Account these counters describe. The policy is per-user — "third session"
   *  means the user's third session, not the device's. Without this a brand-new
   *  account inherits the previous account's count and gets pitched on its very
   *  first launch, seconds after onboarding. */
  _userId: string | null;
  /** Point the counters at an account, resetting them when it changes. */
  syncUser: (userId: string | null) => void;

  registerSession: () => void;
  registerDeepDiveGate: () => void;
  registerProStoryTap: () => void;
  registerMapLayerTap: () => void;
  registerRewardedWatched: () => void;

  /** True when this trigger is due, under its fire limit, and outside both cooldowns. */
  shouldShow: (trigger: PaywallTrigger) => boolean;
  markShown: (trigger: PaywallTrigger) => void;
  /** Paywall views in the last 30 days — also the `view_index` sent to analytics. */
  viewsThisMonth: () => number;
  reset: () => void;
}

const initial = {
  sessions: 0,
  deepDiveGates: 0,
  proStoryTaps: 0,
  mapLayerTaps: 0,
  rewardedWatched: 0,
  lastShownAt: 0,
  fireCounts: {} as Record<string, number>,
  recentViews: [] as number[],
  _userId: null as string | null,
};

export const usePaywallStore = create<PaywallState>()(
  persist(
    (set, get) => ({
      ...initial,

      syncUser: (userId) => {
        if (get()._userId === userId) return;
        set({ ...initial, _userId: userId });
      },

      registerSession: () => set(s => ({ sessions: s.sessions + 1 })),
      registerDeepDiveGate: () => set(s => ({ deepDiveGates: s.deepDiveGates + 1 })),
      registerProStoryTap: () => set(s => ({ proStoryTaps: s.proStoryTaps + 1 })),
      registerMapLayerTap: () => set(s => ({ mapLayerTaps: s.mapLayerTaps + 1 })),
      registerRewardedWatched: () => set(s => ({ rewardedWatched: s.rewardedWatched + 1 })),

      viewsThisMonth: () => {
        const cutoff = Date.now() - MONTH_MS;
        return get().recentViews.filter(t => t > cutoff).length;
      },

      shouldShow: (trigger) => {
        const s = get();

        if ((s.fireCounts[trigger] ?? 0) >= MAX_FIRES_PER_TRIGGER) return false;
        if (Date.now() - s.lastShownAt < PAYWALL_COOLDOWN_MS) return false;
        if (get().viewsThisMonth() >= MAX_VIEWS_PER_MONTH) return false;

        switch (trigger) {
          // No threshold: the caller only asks when a pass is genuinely about to
          // lapse, and that is the single best moment we get.
          case 'pass_expiring':      return true;
          case 'deep_dive_gate':     return s.deepDiveGates >= DEEP_DIVE_GATES_BEFORE_PAYWALL;
          case 'save_limit':         return true;  // hitting the allowance is the signal
          case 'pro_story_blocked':  return s.proStoryTaps >= PRO_TAPS_BEFORE_PAYWALL;
          case 'map_layer_pro':      return s.mapLayerTaps >= MAP_TAPS_BEFORE_PAYWALL;
          case 'streak_at_risk':     return true;  // the caller checks streak length
          case 'rewarded_milestone': return s.rewardedWatched >= REWARDED_BEFORE_PAYWALL;
          case 'third_session':      return s.sessions >= SESSIONS_BEFORE_PAYWALL;
          default:                   return false;
        }
      },

      markShown: (trigger) => set(s => {
        const cutoff = Date.now() - MONTH_MS;
        return {
          lastShownAt: Date.now(),
          fireCounts: { ...s.fireCounts, [trigger]: (s.fireCounts[trigger] ?? 0) + 1 },
          // Prune on write so the array can never grow without bound.
          recentViews: [...s.recentViews.filter(t => t > cutoff), Date.now()],
        };
      }),

      reset: () => set({ ...initial }),
    }),
    {
      // v2: different shape (fireCounts replaces firedTriggers, counters renamed).
      // A new name rather than a migration — the old state described an economy that
      // no longer exists, and starting these counters from zero is harmless.
      name: 'paywall_policy_v2',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
