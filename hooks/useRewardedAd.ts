// hooks/useRewardedAd.ts
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    AdEventType,
    RewardedAd,
    RewardedAdEventType,
} from 'react-native-google-mobile-ads';
import { AD_UNIT_IDS, ADS_CONFIG } from '../config/ads';
import { useGamificationStore } from '../store/useGamificationStore';

/**
 * Hook for rewarded ads — "Watch ad for +50 XP bonus".
 *
 * Usage:
 *   const { showRewardedAd, isRewardedReady } = useRewardedAd();
 *   <Button onPress={showRewardedAd} disabled={!isRewardedReady} />
 */
export function useRewardedAd() {
  const [isReady, setIsReady] = useState(false);
  const adRef = useRef<RewardedAd | null>(null);
  const earnedRef = useRef(false);

  const loadAd = useCallback(() => {
    setIsReady(false);
    earnedRef.current = false;

    const ad = RewardedAd.createForAdRequest(AD_UNIT_IDS.REWARDED, {
      requestNonPersonalizedAdsOnly: true,
    });

    ad.addAdEventListener(RewardedAdEventType.LOADED, () => {
      setIsReady(true);
      console.log('[Ads] Rewarded loaded');
    });

    ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, (reward) => {
      console.log('[Ads] Reward earned:', reward);
      earnedRef.current = true;
    });

    ad.addAdEventListener(AdEventType.CLOSED, () => {
      console.log('[Ads] Rewarded closed');

      // Grant XP only if user watched the full ad
      if (earnedRef.current) {
        const store = useGamificationStore.getState();
        const today = new Date().toISOString().split('T')[0];
        const isToday = store.xpDate === today;

        useGamificationStore.setState({
          totalXP: store.totalXP + ADS_CONFIG.REWARDED_XP_BONUS,
          todayXP: (isToday ? store.todayXP : 0) + ADS_CONFIG.REWARDED_XP_BONUS,
          xpDate: today,
        });

        // Check if XP triggered new achievements
        setTimeout(() => {
          try { useGamificationStore.getState().checkAchievements(); } catch {}
        }, 100);
      }

      // Preload next ad
      loadAd();
    });

    ad.addAdEventListener(AdEventType.ERROR, (error) => {
      console.warn('[Ads] Rewarded error:', error);
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

  const showRewardedAd = useCallback(() => {
    if (isReady && adRef.current) {
      adRef.current.show();
    }
  }, [isReady]);

  return { showRewardedAd, isRewardedReady: isReady };
}