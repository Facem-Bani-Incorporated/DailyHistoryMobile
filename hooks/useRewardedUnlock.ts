import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AdEventType,
  RewardedAd,
  RewardedAdEventType,
} from 'react-native-google-mobile-ads';
import { AD_UNIT_IDS } from '../config/ads';
import * as analytics from '../src/analytics/posthog';
import { usePaywallStore } from '../store/usePaywallStore';
import { initAdsSDK, logAdErr } from './useAdsInit';

export function useRewardedUnlock() {
  const [isReady, setIsReady] = useState(false);
  const adRef = useRef<RewardedAd | null>(null);
  const earnedRef = useRef(false);
  const callbackRef = useRef<(() => void) | null>(null);
  const retryCount = useRef(0);
  const loadCountRef = useRef(0);
  const placementRef = useRef<string>('unknown');

  const loadAd = useCallback(() => {
    setIsReady(false);
    earnedRef.current = false;
    loadCountRef.current += 1;
    const attempt = loadCountRef.current;

    console.log(`[Ads][RewardedUnlock] Load #${attempt} — unitId=${AD_UNIT_IDS.REWARDED}`);

    const ad = RewardedAd.createForAdRequest(AD_UNIT_IDS.REWARDED);

    ad.addAdEventListener(RewardedAdEventType.LOADED, () => {
      retryCount.current = 0;
      setIsReady(true);
      console.log(`[Ads][RewardedUnlock] LOADED (attempt #${attempt})`);
    });

    ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, (reward) => {
      console.log('[Ads][RewardedUnlock] EARNED_REWARD:', JSON.stringify(reward));
      earnedRef.current = true;
    });

    ad.addAdEventListener(AdEventType.OPENED, () => {
      console.log('[Ads][RewardedUnlock] OPENED');
      analytics.capture('rewarded_ad_started', { placement: placementRef.current });
    });

    ad.addAdEventListener(AdEventType.CLOSED, () => {
      console.log('[Ads][RewardedUnlock] CLOSED — earned=', earnedRef.current);
      // No EARNED_REWARD by the time the ad closes = the user skipped out early.
      if (earnedRef.current) {
        analytics.capture('rewarded_ad_completed', { placement: placementRef.current });
        try { usePaywallStore.getState().registerRewardedWatched(); } catch {}
      } else {
        analytics.capture('rewarded_ad_abandoned', { placement: placementRef.current });
      }
      if (earnedRef.current && callbackRef.current) {
        callbackRef.current();
        callbackRef.current = null;
      }
      loadAd();
    });

    ad.addAdEventListener(AdEventType.ERROR, (error) => {
      logAdErr(`RewardedUnlock attempt#${attempt}`, error);
      setIsReady(false);
      retryCount.current += 1;
      const delay = Math.min(5000 * retryCount.current, 30000);
      console.log(`[Ads][RewardedUnlock] Retrying in ${delay}ms (retry #${retryCount.current})`);
      setTimeout(loadAd, delay);
    });

    try {
      ad.load();
      adRef.current = ad;
    } catch (e) {
      logAdErr(`RewardedUnlock .load() throw`, e);
    }
  }, []);

  useEffect(() => {
    initAdsSDK().then(() => {
      console.log('[Ads][RewardedUnlock] SDK ready — loading first ad');
      loadAd();
    });
    return () => { adRef.current = null; };
  }, [loadAd]);

  const showForUnlock = useCallback((onUnlocked: () => void, placement: string = 'unknown') => {
    placementRef.current = placement;
    if (isReady && adRef.current) {
      console.log('[Ads][RewardedUnlock] Showing ad');
      callbackRef.current = onUnlocked;
      adRef.current.show();
    } else {
      console.log('[Ads][RewardedUnlock] Not ready — fallback unlock, reloading ad');
      onUnlocked();
      loadAd();
    }
  }, [isReady, loadAd]);

  return { showForUnlock, isUnlockReady: isReady };
}
