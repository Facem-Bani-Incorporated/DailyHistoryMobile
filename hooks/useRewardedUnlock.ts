// hooks/useRewardedUnlock.ts
// Thin subscriber over the shared singleton in rewardedAdManager.
//
// This hook used to own a RewardedAd per component. Five components mount it,
// three of them unconditionally at boot, so every app open fired five requests
// for one ad unit and at most one of them could ever be shown. The instance now
// lives in the manager; this file only wires UI state and the reward callback.
import { useCallback, useEffect, useState } from 'react';
import * as analytics from '../src/analytics/posthog';
import {
  getRewardedStatus,
  isRewardedPending,
  prepareRewarded,
  showRewarded,
  subscribeRewarded,
} from './rewardedAdManager';

interface Options {
  /** Pass the surface's own `visible` flag. The ad starts loading when the
   *  surface appears rather than at app boot, so it is warm by the time the
   *  user taps without costing a request on every launch. */
  preload?: boolean;
}

export function useRewardedUnlock({ preload = false }: Options = {}) {
  const [status, setStatus] = useState(getRewardedStatus);
  const [waiting, setWaiting] = useState(false);

  useEffect(() => subscribeRewarded(setStatus), []);

  useEffect(() => {
    if (preload) prepareRewarded();
  }, [preload]);

  const showForUnlock = useCallback(
    (onUnlocked: () => void, placement: string = 'unknown') => {
      const result = showRewarded({
        placement,
        onReward: () => {
          setWaiting(false);
          onUnlocked();
        },
        onUnavailable: () => {
          setWaiting(false);
          // The ad genuinely could not be served within the wait window. Grant
          // the reward anyway — punishing the user for our fill problem is
          // worse than the lost impression — but make it visible in analytics
          // instead of silent, which is how it used to be.
          analytics.capture('rewarded_ad_unavailable', { placement });
          console.warn('[Ads][Rewarded] unavailable — granting unlock without ad:', placement);
          onUnlocked();
        },
      });

      // 'waiting' means a load is in flight and the ad will open shortly.
      setWaiting(result === 'waiting');
      return result;
    },
    [],
  );

  return {
    showForUnlock,
    isUnlockReady: status === 'ready',
    /** True while a tap is queued behind an in-flight load — drive a spinner off this. */
    isUnlockWaiting: waiting || isRewardedPending(),
    prepareRewarded,
  };
}
