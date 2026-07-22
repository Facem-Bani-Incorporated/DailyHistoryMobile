// store/useCoinStore.ts
//
// Coin economy + referral pass, persisted per-user to AsyncStorage (same
// partition trick as usePreferencesStore/useSavedStore so accounts on one
// device stay separate). The meaningful fields also ride along in the
// gamification `gamificationData` sync blob (see hooks/useGamificationSync.ts)
// so coins/unlocks survive reinstall and sync across devices.
//
// Coins are earned from a rewarded clip (+1, capped per day), every 1000 XP,
// streak milestones, a flawless quiz, and opening the weekly recap. They are
// spent on PRO events, PRO map layers, day unlocks, and streak restores.
// The referral "free day of PRO" is a time-boxed pass OR'd into isPro.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import {
  COIN_POPUP_COOLDOWN_MS,
  COINS_WEEKLY_RECAP,
  EVENTS_OPEN_TRIGGER,
  REFERRAL_PASS_MS,
  REWARDED_DAILY_CAP,
  STREAK_MILESTONES,
  XP_PER_COIN,
  REFERRAL_COINS,
  type CoinSink,
  type CoinSource,
} from '../config/coins';
import * as analytics from '../src/analytics/posthog';
import { useAuthStore } from './useAuthStore';

const todayISO = () => new Date().toISOString().split('T')[0];

export interface CoinData {
  coins: number;
  unlockedEvents: string[];
  unlockedMapLayers: string[];
  unlockedDays: string[];
  xpCoinsClaimed: number;        // how many "per-1000-XP" coins already granted
  referralPassUntil: number | null; // epoch ms; while > now, everything is unlocked
  creditedReferralFriendIds: string[]; // invited friends already rewarded
  knownFriendIds: string[];      // baseline to detect newly accepted friends (local)
  referralBaselineReady: boolean; // false until the first sync — see creditFriendOnce (local)
  lastCoinPopupAt: number | null;   // cooldown for the "watch a clip" pop-up (local)
  eventsOpenedDate: string | null;  // for the ">6 events opened today" trigger (local)
  eventsOpenedCount: number;
  claimedStreakMilestones: number[]; // streak lengths already paid out
  claimedRecapWeeks: string[];       // weekKeys whose recap bonus was paid
  rewardedDate: string | null;       // day the rewarded counter belongs to (local)
  rewardedCount: number;             // rewarded clips watched today (local)
}

export const EMPTY_COINS: CoinData = {
  coins: 0,
  unlockedEvents: [],
  unlockedMapLayers: [],
  unlockedDays: [],
  xpCoinsClaimed: 0,
  referralPassUntil: null,
  creditedReferralFriendIds: [],
  knownFriendIds: [],
  referralBaselineReady: false,
  lastCoinPopupAt: null,
  eventsOpenedDate: null,
  eventsOpenedCount: 0,
  claimedStreakMilestones: [],
  claimedRecapWeeks: [],
  rewardedDate: null,
  rewardedCount: 0,
};

// Only these fields cross-device-sync via the gamification blob. Device-local
// bookkeeping (friend baselines, pop-up cooldown, event counters) stays local.
const SYNCED_KEYS = [
  'coins', 'unlockedEvents', 'unlockedMapLayers', 'unlockedDays',
  'xpCoinsClaimed', 'referralPassUntil', 'creditedReferralFriendIds',
  // Claim ledgers must sync, or a second device would pay the same milestone
  // and recap bonus again.
  'claimedStreakMilestones', 'claimedRecapWeeks',
] as const;

const getUserId = (): string => {
  try {
    return useAuthStore.getState().user?.id ?? 'guest';
  } catch {
    return 'guest';
  }
};

const uniq = (arr: string[]) => Array.from(new Set(arr));

interface CoinState {
  _perUser: Record<string, CoinData>;

  // reads (imperative)
  getData: () => CoinData;

  // earning / spending — every movement carries a source/sink so the economy
  // is legible in analytics without extra call-site instrumentation.
  addCoins: (n: number, source: CoinSource) => void;
  spendCoins: (n: number, sink: CoinSink) => boolean;
  syncXpCoins: (totalXP: number) => number;

  // one-off bonuses (idempotent — each is paid at most once)
  claimStreakMilestone: (streak: number) => number;  // returns coins granted
  claimRecapBonus: (weekKey: string) => number;

  // rewarded-ad daily budget
  canWatchRewarded: () => boolean;
  rewardedLeftToday: () => number;
  registerRewardedWatch: () => void;

  // unlocks
  unlockEvent: (id: string) => void;
  isEventUnlocked: (id: string) => boolean;
  unlockMapLayer: (key: string) => void;
  isMapLayerUnlocked: (key: string) => boolean;
  unlockDay: (key: string) => void;
  isDayUnlocked: (key: string) => boolean;

  // referral pass
  grantReferralDays: (days?: number) => void;
  isReferralActive: () => boolean;
  setReferralBaseline: (knownFriendIds: string[]) => void;
  creditReferral: (friendId: string) => void;
  creditFriendOnce: (friendId: string) => boolean;

  // coin pop-up
  registerEventOpen: () => boolean; // true when the ">6 events" trigger fires
  canShowCoinPopup: () => boolean;
  markCoinPopupShown: () => void;

  // sync
  serializeForBlob: () => Partial<CoinData>;
  hydrateFromBlob: (data: any) => void;
}

export const useCoinStore = create<CoinState>()(
  persist(
    (set, get) => {
      const read = (): CoinData => get()._perUser[getUserId()] ?? EMPTY_COINS;
      const write = (patch: Partial<CoinData>) => {
        const uid = getUserId();
        const prev = get()._perUser[uid] ?? EMPTY_COINS;
        set({ _perUser: { ...get()._perUser, [uid]: { ...prev, ...patch } } });
      };

      return {
        _perUser: {},

        getData: read,

        addCoins: (n, source) => {
          if (!n) return;
          const next = Math.max(0, read().coins + n);
          write({ coins: next });
          analytics.capture('coin_earned', { amount: n, source, balance: next });
        },

        spendCoins: (n, sink) => {
          const d = read();
          if (d.coins < n) return false;
          write({ coins: d.coins - n });
          analytics.capture('coin_spent', { amount: n, sink, balance: d.coins - n });
          return true;
        },

        // ── One-off bonuses ────────────────────────────────────────────────
        claimStreakMilestone: (streak) => {
          const bonus = STREAK_MILESTONES[streak];
          if (!bonus) return 0;
          const d = read();
          if (d.claimedStreakMilestones.includes(streak)) return 0;
          write({
            coins: d.coins + bonus,
            claimedStreakMilestones: [...d.claimedStreakMilestones, streak],
          });
          analytics.capture('coin_earned', {
            amount: bonus, source: 'streak_milestone', streak, balance: d.coins + bonus,
          });
          return bonus;
        },

        claimRecapBonus: (weekKey) => {
          const d = read();
          if (!weekKey || d.claimedRecapWeeks.includes(weekKey)) return 0;
          write({
            coins: d.coins + COINS_WEEKLY_RECAP,
            claimedRecapWeeks: [...d.claimedRecapWeeks, weekKey],
          });
          analytics.capture('coin_earned', {
            amount: COINS_WEEKLY_RECAP, source: 'weekly_recap', week: weekKey,
            balance: d.coins + COINS_WEEKLY_RECAP,
          });
          return COINS_WEEKLY_RECAP;
        },

        // ── Rewarded daily budget ──────────────────────────────────────────
        // Past the cap an extra impression is worth little and drags eCPM down,
        // so the offer is withdrawn rather than served cheaply.
        rewardedLeftToday: () => {
          const d = read();
          const used = d.rewardedDate === todayISO() ? d.rewardedCount : 0;
          return Math.max(0, REWARDED_DAILY_CAP - used);
        },

        canWatchRewarded: () => get().rewardedLeftToday() > 0,

        registerRewardedWatch: () => {
          const d = read();
          const isToday = d.rewardedDate === todayISO();
          write({
            rewardedDate: todayISO(),
            rewardedCount: isToday ? d.rewardedCount + 1 : 1,
          });
        },

        syncXpCoins: (totalXP) => {
          const d = read();
          const target = Math.floor((totalXP ?? 0) / XP_PER_COIN);
          if (target <= d.xpCoinsClaimed) return 0;
          const granted = target - d.xpCoinsClaimed;
          write({ coins: d.coins + granted, xpCoinsClaimed: target });
          return granted;
        },

        unlockEvent: (id) => {
          if (!id) return;
          write({ unlockedEvents: uniq([...read().unlockedEvents, String(id)]) });
        },
        isEventUnlocked: (id) => read().unlockedEvents.includes(String(id)),

        unlockMapLayer: (key) => {
          write({ unlockedMapLayers: uniq([...read().unlockedMapLayers, key]) });
        },
        isMapLayerUnlocked: (key) => read().unlockedMapLayers.includes(key),

        unlockDay: (key) => {
          write({ unlockedDays: uniq([...read().unlockedDays, key]) });
        },
        isDayUnlocked: (key) => read().unlockedDays.includes(key),

        grantReferralDays: (days = 1) => {
          const d = read();
          const base = Math.max(Date.now(), d.referralPassUntil ?? 0);
          write({ referralPassUntil: base + days * REFERRAL_PASS_MS });
        },
        isReferralActive: () => {
          const until = read().referralPassUntil;
          return !!until && Date.now() < until;
        },
        setReferralBaseline: (knownFriendIds) => {
          write({ knownFriendIds: uniq(knownFriendIds), referralBaselineReady: true });
        },
        creditReferral: (friendId) => {
          write({ creditedReferralFriendIds: uniq([...read().creditedReferralFriendIds, String(friendId)]) });
        },

        /**
         * Pays REFERRAL_COINS for a new friendship, at most once per friend ever.
         * Both the accepter (from the Friends sheet) and the inviter (from the
         * background check) call this for the same pair, so the credit list — not
         * the call site — is what makes it exactly once. Returns true if it paid.
         */
        creditFriendOnce: (friendId) => {
          const d = read();
          const id = String(friendId);
          if (d.creditedReferralFriendIds.includes(id)) return false;
          write({
            creditedReferralFriendIds: uniq([...d.creditedReferralFriendIds, id]),
            coins: Math.max(0, d.coins + REFERRAL_COINS),
            knownFriendIds: uniq([...d.knownFriendIds, id]),
          });
          return true;
        },

        registerEventOpen: () => {
          const d = read();
          const today = todayISO();
          const count = d.eventsOpenedDate === today ? d.eventsOpenedCount + 1 : 1;
          write({ eventsOpenedDate: today, eventsOpenedCount: count });
          // fire exactly once per day, when crossing "more than 6"
          return count === EVENTS_OPEN_TRIGGER + 1;
        },

        canShowCoinPopup: () => {
          const last = read().lastCoinPopupAt;
          return !last || Date.now() - last >= COIN_POPUP_COOLDOWN_MS;
        },
        markCoinPopupShown: () => write({ lastCoinPopupAt: Date.now() }),

        serializeForBlob: () => {
          const d = read();
          const out: any = {};
          for (const k of SYNCED_KEYS) out[k] = (d as any)[k];
          return out;
        },
        hydrateFromBlob: (data) => {
          if (!data || typeof data !== 'object') return;
          const d = read();
          // On login the server is authoritative for the *consumable* balance and
          // the XP-claim counter (max-merge would revive already-spent coins). The
          // one-time XP→coin retroactive grant runs before this, so on a fresh
          // device it gets correctly overwritten by the server value here.
          write({
            coins: data.coins != null ? Number(data.coins) || 0 : d.coins,
            xpCoinsClaimed: data.xpCoinsClaimed != null ? Number(data.xpCoinsClaimed) || 0 : d.xpCoinsClaimed,
            // Unlocks are permanent → safe to union so an unlock is never lost.
            unlockedEvents: uniq([...d.unlockedEvents, ...(data.unlockedEvents ?? [])]),
            unlockedMapLayers: uniq([...d.unlockedMapLayers, ...(data.unlockedMapLayers ?? [])]),
            unlockedDays: uniq([...d.unlockedDays, ...(data.unlockedDays ?? [])]),
            // Keep the latest pass expiry and every credited referral.
            referralPassUntil: Math.max(d.referralPassUntil ?? 0, Number(data.referralPassUntil) || 0) || null,
            creditedReferralFriendIds: uniq([...d.creditedReferralFriendIds, ...(data.creditedReferralFriendIds ?? [])]),
          });
        },
      };
    },
    {
      name: 'coins_v1',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

// ── Reactive per-user hooks (re-render on user switch or data change) ──
export const useCoinData = (): CoinData => {
  const user = useAuthStore(s => s.user);
  const perUser = useCoinStore(s => s._perUser);
  return perUser[user?.id ?? 'guest'] ?? EMPTY_COINS;
};

export const useCoins = (): number => useCoinData().coins;

export const useIsEventUnlocked = (id?: string | number): boolean => {
  const data = useCoinData();
  return id != null && data.unlockedEvents.includes(String(id));
};

export const useIsMapLayerUnlocked = (key: string): boolean =>
  useCoinData().unlockedMapLayers.includes(key);
