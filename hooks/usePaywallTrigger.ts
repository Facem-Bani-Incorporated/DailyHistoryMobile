// hooks/usePaywallTrigger.ts
// Single entry point for "should we pitch PRO right now?". Call sites express
// intent (a session started, a pass is expiring) and this decides + presents.
import { useCallback } from 'react';
import { useRevenueCat } from '../context/RevenueCatContext';
import * as analytics from '../src/analytics/posthog';
import { usePaywallStore, type PaywallTrigger } from '../store/usePaywallStore';

export function usePaywallTrigger() {
  const { ready, isPro, presentPaywall } = useRevenueCat();

  /**
   * Present the paywall if this trigger is due. Returns true when it was shown.
   * PRO users are never pitched.
   */
  const maybeShow = useCallback(async (trigger: PaywallTrigger): Promise<boolean> => {
    // `isPro` is false until RevenueCat resolves entitlements. Firing before then
    // would show a paywall to an actual subscriber, so wait for `ready` and let
    // the caller try again rather than risk it.
    if (!ready) return false;
    if (isPro) return false;
    const store = usePaywallStore.getState();
    if (!store.shouldShow(trigger)) return false;
    // Mark before presenting: if the user kills the app mid-paywall we still
    // treat it as spent rather than showing it again on next launch.
    store.markShown(trigger);
    // `view_index` is the whole point of the v2 policy — without it there is no way
    // to check whether purchases really cluster on the third view, which is the
    // assumption the shorter cooldown is built on.
    analytics.capture('paywall_attempt', {
      trigger,
      view_index: usePaywallStore.getState().viewsThisMonth(),
    });
    await presentPaywall(trigger);
    return true;
  }, [ready, isPro, presentPaywall]);

  return { maybeShow, ready };
}
