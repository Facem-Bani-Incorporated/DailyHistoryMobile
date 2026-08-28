// hooks/useRewardedUnlock.ts
//
// Thin view onto the app-wide rewarded ad (services/rewardedAdManager). This hook
// is called from five permanently-mounted components; before the manager existed
// each of them loaded its own ad, so a cold start burned five requests for one
// possible impression.

import { useCallback, useEffect, useState } from 'react';
import { rewardedAds } from '../services/rewardedAdManager';
import * as analytics from '../src/analytics/posthog';
import { usePaywallStore } from '../store/usePaywallStore';

export function useRewardedUnlock() {
  const [isReady, setIsReady] = useState(rewardedAds.isReady());

  useEffect(() => {
    const unsubscribe = rewardedAds.subscribe(setIsReady);
    rewardedAds.preload();
    return unsubscribe;
  }, []);

  const showForUnlock = useCallback((onUnlocked: () => void, placement: string = 'unknown') => {
    const shown = rewardedAds.show({
      placement,
      onOpened: () => analytics.capture('rewarded_ad_started', { placement }),
      onClosed: (earned) => {
        // No EARNED_REWARD by the time the ad closes = the user skipped out early.
        if (!earned) {
          analytics.capture('rewarded_ad_abandoned', { placement });
          return;
        }
        analytics.capture('rewarded_ad_completed', { placement });
        try { usePaywallStore.getState().registerRewardedWatched(); } catch { }
        onUnlocked();
      },
    });

    if (!shown) {
      // Nothing loaded — grant the unlock anyway rather than punish the user for
      // our fill problem. The manager has already started loading the next one.
      console.log('[Ads][RewardedUnlock] Not ready — fallback unlock');
      onUnlocked();
    }
  }, []);

  return { showForUnlock, isUnlockReady: isReady };
}
