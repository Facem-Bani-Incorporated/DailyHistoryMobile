import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AdEventType,
  RewardedAd,
  RewardedAdEventType,
} from 'react-native-google-mobile-ads';
import { AD_UNIT_IDS } from '../config/ads';

export function useRewardedUnlock() {
  const [isReady, setIsReady] = useState(false);
  const adRef = useRef<RewardedAd | null>(null);
  const earnedRef = useRef(false);
  const callbackRef = useRef<(() => void) | null>(null);
  const retryCount = useRef(0);

  const loadAd = useCallback(() => {
    setIsReady(false);
    earnedRef.current = false;

    const ad = RewardedAd.createForAdRequest(AD_UNIT_IDS.REWARDED, {
      requestNonPersonalizedAdsOnly: true,
    });

    ad.addAdEventListener(RewardedAdEventType.LOADED, () => {
      retryCount.current = 0;
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
      retryCount.current += 1;
      const delay = Math.min(5000 * retryCount.current, 30000);
      setTimeout(loadAd, delay);
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
    } else {
      // Fallback: dacă reclama nu s-a încărcat, deblochează direct
      onUnlocked();
      loadAd();
    }
  }, [isReady, loadAd]);

  return { showForUnlock, isUnlockReady: isReady };
}