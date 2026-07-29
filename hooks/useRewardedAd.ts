// hooks/useRewardedAd.ts
// ═══════════════════════════════════════════════════════════════════════════════
//  REWARDED AD HOOK — dual reward system
//
//  Supports two reward types:
//    • 'xp'      → grants ADS_CONFIG.REWARDED_XP_BONUS (default behavior)
//    • 'restore' → restores the user's streak to their longest streak
//
//  Usage:
//    const { showRewardedAd, showRewardedAdForRestore, isRewardedReady } = useRewardedAd();
//
//    // XP bonus:
//    <Button onPress={showRewardedAd} disabled={!isRewardedReady} />
//
//    // Streak restore:
//    <Button onPress={showRewardedAdForRestore} disabled={!isRewardedReady} />
//
//  The ad instance itself lives in rewardedAdManager — one per app, not one per
//  component. This hook only picks which reward to grant when the ad completes.
// ═══════════════════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useState } from 'react';
import { ADS_CONFIG } from '../config/ads';
import { useGamificationStore } from '../store/useGamificationStore';
import {
  getRewardedStatus,
  prepareRewarded,
  showRewarded,
  subscribeRewarded,
} from './rewardedAdManager';
import { pushToServer } from './useGamificationSync';

type RewardKind = 'xp' | 'restore';

// ── Today as YYYY-MM-DD (local time) ──
const todayISO = () => new Date().toISOString().split('T')[0];

// ── Grant XP bonus ──
function grantXPBonus() {
  const store = useGamificationStore.getState();
  const today = todayISO();
  const isToday = store.xpDate === today;

  useGamificationStore.setState({
    totalXP: (store.totalXP ?? 0) + ADS_CONFIG.REWARDED_XP_BONUS,
    todayXP: (isToday ? (store.todayXP ?? 0) : 0) + ADS_CONFIG.REWARDED_XP_BONUS,
    xpDate: today,
  });

  // Check achievements after XP grant
  setTimeout(() => {
    try { useGamificationStore.getState().checkAchievements?.(); } catch {}
  }, 100);

  console.log('[Ads] Granted +' + ADS_CONFIG.REWARDED_XP_BONUS + ' XP bonus');
}

// ── Restore the user's streak ──
// Sets currentStreak back to longestStreak (their peak), marks today as active,
// and syncs to backend so it persists across devices.
function restoreUserStreak() {
  const store = useGamificationStore.getState();
  const today = todayISO();

  // Restore to the longest streak they ever had (or minimum 1 if longest was 0)
  const restoredStreak = Math.max(1, store.longestStreak ?? 0);

  useGamificationStore.setState({
    currentStreak: restoredStreak,
    // Also update longest if restored is somehow bigger (shouldn't happen but safe)
    longestStreak: Math.max(store.longestStreak ?? 0, restoredStreak),
    // Mark today as active so the streak isn't immediately re-broken
    lastActiveDate: today,
    // Reset read-tracking for today so user can still earn XP from reading
    readDate: today,
    readEventsToday: store.readDate === today ? (store.readEventsToday ?? []) : [],
  });

  console.log('[Ads] Streak restored to', restoredStreak, 'days');

  // Push to server immediately so it persists
  pushToServer().catch((e) => console.warn('[Ads] Failed to sync restore:', e));
}

const grant = (kind: RewardKind) => () => {
  if (kind === 'restore') restoreUserStreak();
  else grantXPBonus();
};

// ══════════════════════════════════════════════════════════════════════════════
// HOOK
// ══════════════════════════════════════════════════════════════════════════════
interface Options {
  /** Start loading when the surface that offers the ad becomes visible.
   *  StreakIcon lives in the always-mounted header, so it must NOT preload —
   *  that is exactly the boot-time request storm we removed. */
  preload?: boolean;
}

export function useRewardedAd({ preload = false }: Options = {}) {
  const [status, setStatus] = useState(getRewardedStatus);

  useEffect(() => subscribeRewarded(setStatus), []);

  useEffect(() => {
    if (preload) prepareRewarded();
  }, [preload]);

  const showRewardedAdFor = useCallback((kind: RewardKind, placement?: string) => {
    return showRewarded({
      placement: placement ?? (kind === 'restore' ? 'streak_restore' : 'xp_bonus'),
      onReward: grant(kind),
      // No reward when the ad could not be served — unlike the unlock flow,
      // free XP and free streak restores would devalue the whole mechanic.
      onUnavailable: () => {
        console.warn('[Ads][Rewarded] unavailable — no reward granted for', kind);
      },
    });
  }, []);

  const showRewardedAd = useCallback(
    () => showRewardedAdFor('xp'),
    [showRewardedAdFor],
  );

  const showRewardedAdForRestore = useCallback(
    () => showRewardedAdFor('restore'),
    [showRewardedAdFor],
  );

  return {
    showRewardedAd,
    showRewardedAdForRestore,
    showRewardedAdFor,
    isRewardedReady: status === 'ready',
    prepareRewarded,
  };
}
