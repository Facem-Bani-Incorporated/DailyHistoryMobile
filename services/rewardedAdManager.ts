// services/rewardedAdManager.ts
//
// ONE rewarded ad for the whole app.
//
// Every screen that can show a rewarded clip used to own its own RewardedAd and
// call .load() on mount. Five of those components are mounted permanently — three
// modals at the root of app/_layout.tsx, ProfileModal behind the avatar, and
// StreakIcon in the header — so a single cold start fired five requests for the
// same ad unit while at most one of them was ever shown. AdMob counted five
// requests against one impression, which is what held the show rate near 22% and
// drew a fill throttle on 2 Aug (290 requests, 17% match rate).
//
// This module keeps a single instance, hands it to whoever asks first, and
// reloads once after each close. Retries are capped: an unfilled unit retried
// forever is the same waste in a different shape.

import {
  AdEventType,
  RewardedAd,
  RewardedAdEventType,
} from 'react-native-google-mobile-ads';
import { AD_UNIT_IDS } from '../config/ads';
import { initAdsSDK, logAdErr } from '../hooks/useAdsInit';

export type RewardedShowRequest = {
  placement: string;
  onOpened?: () => void;
  /** Fires once the ad is dismissed. `earned` is false if the user bailed early. */
  onClosed?: (earned: boolean) => void;
};

type Listener = (ready: boolean) => void;

// After this many consecutive load failures we stop and wait for someone to ask
// for an ad again, instead of hammering the unit for the rest of the session.
const MAX_RETRIES = 4;

let ad: RewardedAd | null = null;
let ready = false;
let inFlight = false;
let retries = 0;
let loadCount = 0;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let earned = false;
let pending: RewardedShowRequest | null = null;
const listeners = new Set<Listener>();

const emit = () => {
  for (const l of listeners) {
    try { l(ready); } catch { /* a bad subscriber must not stall the rest */ }
  }
};

const setReady = (v: boolean) => {
  if (ready === v) return;
  ready = v;
  emit();
};

const clearRetry = () => {
  if (retryTimer) { clearTimeout(retryTimer); retryTimer = null; }
};

function load() {
  if (inFlight || ready) return;
  inFlight = true;
  clearRetry();
  earned = false;
  const attempt = ++loadCount;

  console.log(`[Ads][Rewarded] Load #${attempt} — unitId=${AD_UNIT_IDS.REWARDED}`);
  const next = RewardedAd.createForAdRequest(AD_UNIT_IDS.REWARDED);

  next.addAdEventListener(RewardedAdEventType.LOADED, () => {
    inFlight = false;
    retries = 0;
    console.log(`[Ads][Rewarded] LOADED (attempt #${attempt})`);
    setReady(true);
  });

  next.addAdEventListener(RewardedAdEventType.EARNED_REWARD, (reward) => {
    console.log('[Ads][Rewarded] EARNED_REWARD:', JSON.stringify(reward));
    earned = true;
  });

  next.addAdEventListener(AdEventType.OPENED, () => {
    console.log('[Ads][Rewarded] OPENED —', pending?.placement ?? 'unknown');
    try { pending?.onOpened?.(); } catch (e) { logAdErr('Rewarded onOpened', e); }
  });

  next.addAdEventListener(AdEventType.CLOSED, () => {
    const req = pending;
    const didEarn = earned;
    pending = null;
    console.log('[Ads][Rewarded] CLOSED — earned=', didEarn);
    // A shown RewardedAd is spent and cannot be shown twice.
    ad = null;
    inFlight = false;
    setReady(false);
    try { req?.onClosed?.(didEarn); } catch (e) { logAdErr('Rewarded onClosed', e); }
    load();
  });

  next.addAdEventListener(AdEventType.ERROR, (error) => {
    inFlight = false;
    setReady(false);
    logAdErr(`Rewarded attempt#${attempt}`, error);
    if (retries >= MAX_RETRIES) {
      console.log('[Ads][Rewarded] Retry budget spent — idle until the next show attempt');
      return;
    }
    retries += 1;
    const delay = Math.min(5000 * 2 ** (retries - 1), 60000);
    console.log(`[Ads][Rewarded] Retry #${retries} in ${delay}ms`);
    clearRetry();
    retryTimer = setTimeout(load, delay);
  });

  try {
    next.load();
    ad = next;
  } catch (e) {
    inFlight = false;
    logAdErr('Rewarded .load() throw', e);
  }
}

export const rewardedAds = {
  /** Idempotent — safe to call from every hook instance on every mount. */
  preload() {
    initAdsSDK().then(load);
  },

  isReady() {
    return ready;
  },

  subscribe(l: Listener) {
    listeners.add(l);
    return () => { listeners.delete(l); };
  },

  /**
   * Shows the loaded ad. Returns false when nothing was in hand — the caller
   * decides what to do about it — and kicks off a fresh load either way.
   */
  show(req: RewardedShowRequest): boolean {
    if (!ready || !ad) {
      console.log(`[Ads][Rewarded] show(${req.placement}) — nothing loaded`);
      retries = 0;
      initAdsSDK().then(load);
      return false;
    }
    pending = req;
    setReady(false);
    try {
      ad.show();
      return true;
    } catch (e) {
      logAdErr('Rewarded .show() throw', e);
      pending = null;
      ad = null;
      load();
      return false;
    }
  },
};
