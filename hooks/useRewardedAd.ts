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
//    // XP bonus (existing behavior — backward compatible):
//    <Button onPress={showRewardedAd} disabled={!isRewardedReady} />
//
//    // Streak restore (new):
//    <Button onPress={showRewardedAdForRestore} disabled={!isRewardedReady} />
//
//  The ad itself lives in services/rewardedAdManager — one instance for the whole
//  app. This hook only decides which reward to grant when the clip finishes.
// ═══════════════════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useState } from 'react';
import { ADS_CONFIG } from '../config/ads';
import { rewardedAds } from '../services/rewardedAdManager';
import { useGamificationStore } from '../store/useGamificationStore';
import { logAdErr } from './useAdsInit';
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

// ══════════════════════════════════════════════════════════════════════════════
// HOOK
// ══════════════════════════════════════════════════════════════════════════════
export function useRewardedAd() {
  const [isReady, setIsReady] = useState(rewardedAds.isReady());

  useEffect(() => {
    const unsubscribe = rewardedAds.subscribe(setIsReady);
    rewardedAds.preload();
    return unsubscribe;
  }, []);

  // ── Generic: show with explicit reward kind ──
  // Deliberately no analytics/registerRewardedWatched here — these placements
  // never counted toward the paywall's "5 rewarded watched" trigger, and folding
  // them in now would silently move when the paywall fires.
  const showRewardedAdFor = useCallback((kind: RewardKind) => {
    rewardedAds.show({
      placement: kind === 'restore' ? 'streak_restore' : 'xp_bonus',
      onClosed: (earned) => {
        if (!earned) return;
        try {
          if (kind === 'restore') restoreUserStreak();
          else grantXPBonus();
        } catch (e) {
          logAdErr('Rewarded handler', e);
        }
      },
    });
  }, []);

  // ── Existing behavior: show ad for XP bonus (backward compatible) ──
  const showRewardedAd = useCallback(() => showRewardedAdFor('xp'), [showRewardedAdFor]);

  // ── Show ad for streak restoration ──
  const showRewardedAdForRestore = useCallback(() => showRewardedAdFor('restore'), [showRewardedAdFor]);

  return {
    showRewardedAd,
    showRewardedAdForRestore,
    showRewardedAdFor,
    isRewardedReady: isReady,
  };
}
