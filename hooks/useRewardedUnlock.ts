// hooks/useRewardedUnlock.ts
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    AdEventType,
    RewardedAd,
    RewardedAdEventType,
} from 'react-native-google-mobile-ads';
import { AD_UNIT_IDS } from '../config/ads';

/**
 * Rewarded ad hook for unlocking content.
 * No XP bonus — just shows ad and calls onUnlocked when complete.
 */
export function useRewardedUnlock() {
  const [isReady, setIsReady] = useState(false);
  const adRef = useRef<RewardedAd | null>(null);
  const earnedRef = useRef(false);
  const callbackRef = useRef<(() => void) | null>(null);

  const loadAd = useCallback(() => {
    setIsReady(false);
    earnedRef.current = false;

    const ad = RewardedAd.createForAdRequest(AD_UNIT_IDS.REWARDED, {
      requestNonPersonalizedAdsOnly: true,
    });

    ad.addAdEventListener(RewardedAdEventType.LOADED, () => {
      setIsReady(true);
    });

    ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
      earnedRef.current = true;
    });

    ad.addAdEventListener(AdEventType.CLOSED, () => {
      if (earnedRef.current && callbackRef.current) {
        callbackRef.current();
        callbackRef.current = null;
      }
      loadAd();
    });

    ad.addAdEventListener(AdEventType.ERROR, () => {
      setIsReady(false);
      setTimeout(loadAd, 30000);
    });

    ad.load();
    adRef.current = ad;
  }, []);

  useEffect(() => {
    loadAd();
    return () => { adRef.current = null; };
  }, [loadAd]);

  const showForUnlock = useCallback((onUnlocked: () => void) => {
    if (isReady && adRef.current) {
      callbackRef.current = onUnlocked;
      adRef.current.show();
    }
  }, [isReady]);

  return { showForUnlock, isUnlockReady: isReady };
}