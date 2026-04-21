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
//  Under the hood, the ad is shared; a ref tracks which reward to grant
//  when the user finishes watching.
// ═══════════════════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AdEventType,
  RewardedAd,
  RewardedAdEventType,
} from 'react-native-google-mobile-ads';
import { AD_UNIT_IDS, ADS_CONFIG } from '../config/ads';
import { useGamificationStore } from '../store/useGamificationStore';
import { initAdsSDK, logAdErr } from './useAdsInit';
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
  const [isReady, setIsReady] = useState(false);
  const adRef = useRef<RewardedAd | null>(null);
  const earnedRef = useRef(false);
  const pendingRewardRef = useRef<RewardKind>('xp'); // default matches old behavior

  const loadCountRef = useRef(0);

  const loadAd = useCallback(() => {
    setIsReady(false);
    earnedRef.current = false;
    loadCountRef.current += 1;
    const attempt = loadCountRef.current;

    console.log(`[Ads][Rewarded] Load #${attempt} — unitId=${AD_UNIT_IDS.REWARDED}`);

    const ad = RewardedAd.createForAdRequest(AD_UNIT_IDS.REWARDED);

    ad.addAdEventListener(RewardedAdEventType.LOADED, () => {
      setIsReady(true);
      console.log(`[Ads][Rewarded] LOADED (attempt #${attempt})`);
    });

    ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, (reward) => {
      console.log('[Ads][Rewarded] EARNED_REWARD:', JSON.stringify(reward));
      earnedRef.current = true;
    });

    ad.addAdEventListener(AdEventType.OPENED, () => {
      console.log('[Ads][Rewarded] OPENED');
    });

    ad.addAdEventListener(AdEventType.CLOSED, () => {
      console.log('[Ads][Rewarded] CLOSED — earned=', earnedRef.current);

      if (earnedRef.current) {
        const kind = pendingRewardRef.current;
        try {
          if (kind === 'restore') {
            restoreUserStreak();
          } else {
            grantXPBonus();
          }
        } catch (e) {
          logAdErr('Rewarded handler', e);
        }
      }

      pendingRewardRef.current = 'xp';
      loadAd();
    });

    ad.addAdEventListener(AdEventType.ERROR, (error) => {
      logAdErr(`Rewarded attempt#${attempt}`, error);
      setIsReady(false);
      console.log('[Ads][Rewarded] Retrying in 30s...');
      setTimeout(loadAd, 30000);
    });

    try {
      ad.load();
      adRef.current = ad;
    } catch (e) {
      logAdErr(`Rewarded .load() throw`, e);
    }
  }, []);

  useEffect(() => {
    initAdsSDK().then(() => {
      console.log('[Ads] Loading rewarded after SDK ready');
      loadAd();
    });
    return () => { adRef.current = null; };
  }, [loadAd]);

  // ── Existing behavior: show ad for XP bonus (backward compatible) ──
  const showRewardedAd = useCallback(() => {
    if (isReady && adRef.current) {
      pendingRewardRef.current = 'xp';
      adRef.current.show();
    }
  }, [isReady]);

  // ── New: show ad for streak restoration ──
  const showRewardedAdForRestore = useCallback(() => {
    if (isReady && adRef.current) {
      pendingRewardRef.current = 'restore';
      adRef.current.show();
    }
  }, [isReady]);

  // ── Generic: show with explicit reward kind ──
  const showRewardedAdFor = useCallback((kind: RewardKind) => {
    if (isReady && adRef.current) {
      pendingRewardRef.current = kind;
      adRef.current.show();
    }
  }, [isReady]);

  return {
    showRewardedAd,
    showRewardedAdForRestore,
    showRewardedAdFor,
    isRewardedReady: isReady,
  };
}