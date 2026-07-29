// hooks/rewardedAdManager.ts
// ═══════════════════════════════════════════════════════════════════════════════
//  ONE shared rewarded ad for the whole app.
//
//  Why a module singleton instead of per-hook instances: every component that
//  called useRewardedAd/useRewardedUnlock used to build its own RewardedAd and
//  load() it on mount. Five of those mount unconditionally on every app open
//  (CoinRewardModal / UnlockStoryModal / StreakRestoreModal in _layout, StreakIcon
//  in the header, ProfileModal under ProfileAvatar) — a `<Modal visible={false}>`
//  still runs its component body. That produced 5 requests for the same ad unit
//  before the user touched anything, and only the instance belonging to the modal
//  the user actually opened could ever reach show(). The other four were
//  guaranteed zero-impression requests.
//
//  Invariants enforced here:
//    • at most one in-flight request — ensureLoaded() is idempotent
//    • an instance is never reused for a second show; a fresh one is built on close
//    • retries are capped, not an unbounded 30s loop
//    • listeners and timers are always torn down — no zombie keeps reloading
//    • nothing loads at boot; loading starts on user intent (prepare/show)
//
//  show() never silently no-ops: if the ad is not ready yet it waits for the
//  in-flight load up to PENDING_SHOW_TIMEOUT_MS and only then reports
//  'unavailable' to the caller. That window is what turns an iOS tap into an
//  impression instead of a free unlock.
// ═══════════════════════════════════════════════════════════════════════════════
import { Platform } from 'react-native';
import {
  AdEventType,
  RewardedAd,
  RewardedAdEventType,
} from 'react-native-google-mobile-ads';
import { AD_UNIT_IDS } from '../config/ads';
import * as analytics from '../src/analytics/posthog';
import { usePaywallStore } from '../store/usePaywallStore';
import { initAdsSDK, logAdErr } from './useAdsInit';

export type RewardedStatus = 'idle' | 'loading' | 'ready' | 'showing';

/** Consecutive load failures before we stop retrying on our own. A later
 *  prepare()/show() driven by user intent resets the counter and tries again. */
const MAX_RETRIES = 3;
/** Backoff between retries: 4s, 8s, 16s. */
const RETRY_BASE_MS = 4000;
/** How long a show() request waits for an in-flight load before giving up. */
const PENDING_SHOW_TIMEOUT_MS = 8000;
/** Hard ceiling on rewarded requests per app session. With one shared instance
 *  and intent-driven loading a real user lands around 2-5, so this only trips if
 *  something regresses into a loop again. AdMob flags accounts on sustained
 *  request volume with no impressions, so the cap is cheaper than the ban. */
const MAX_SESSION_REQUESTS = 15;

// ── Module state ──────────────────────────────────────────────────────────────
let ad: RewardedAd | null = null;
let listenerCleanups: Array<() => void> = [];
let status: RewardedStatus = 'idle';

let retries = 0;
let sessionRequests = 0;
let cappedReported = false;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let pendingTimer: ReturnType<typeof setTimeout> | null = null;
let loadStartedAt = 0;

let earned = false;
let activePlacement = 'unknown';
let activeReward: (() => void) | null = null;

type PendingShow = {
  placement: string;
  onReward: () => void;
  onUnavailable: () => void;
};
let pendingShow: PendingShow | null = null;

const subscribers = new Set<(s: RewardedStatus) => void>();

// ── Subscription API (hooks render off this) ─────────────────────────────────
function setStatus(next: RewardedStatus) {
  if (status === next) return;
  status = next;
  subscribers.forEach((fn) => {
    try { fn(status); } catch {}
  });
}

export function subscribeRewarded(fn: (s: RewardedStatus) => void): () => void {
  subscribers.add(fn);
  return () => { subscribers.delete(fn); };
}

export function getRewardedStatus(): RewardedStatus {
  return status;
}

export function isRewardedLoaded(): boolean {
  return status === 'ready';
}

// ── Analytics ────────────────────────────────────────────────────────────────
// Every request/load/failure/impression is reported so the AdMob console is no
// longer the only place this funnel is visible. Naming is shared with the banner
// and AdCard so `ad_requested → ad_loaded → ad_impression` can be split by format.
const track = (event: string, props: Record<string, any> = {}) => {
  try {
    analytics.capture(event, {
      format: 'rewarded',
      unit_id: AD_UNIT_IDS.REWARDED,
      platform: Platform.OS,
      ...props,
    });
  } catch {}
};

// ── Teardown ─────────────────────────────────────────────────────────────────
function clearTimers() {
  if (retryTimer) { clearTimeout(retryTimer); retryTimer = null; }
  if (pendingTimer) { clearTimeout(pendingTimer); pendingTimer = null; }
}

function destroyAd() {
  const dying = ad;
  ad = null;

  listenerCleanups.forEach((off) => { try { off(); } catch {} });
  listenerCleanups = [];

  // removeAllListeners() is the belt-and-braces path in case a listener was
  // registered without us capturing its unsubscribe function.
  try { (dying as any)?.removeAllListeners?.(); } catch {}
}

/** Full reset. Used by logout so a new user never inherits a warm ad. */
export function resetRewarded() {
  clearTimers();
  destroyAd();
  pendingShow = null;
  activeReward = null;
  earned = false;
  retries = 0;
  sessionRequests = 0;
  cappedReported = false;
  setStatus('idle');
}

// ── Load ─────────────────────────────────────────────────────────────────────
/** True when the session request budget is spent. Reported once so a runaway is
 *  visible in PostHog without spamming the queue. */
function isRateLimited(): boolean {
  if (sessionRequests < MAX_SESSION_REQUESTS) return false;
  if (!cappedReported) {
    cappedReported = true;
    track('ad_request_capped', { session_requests: sessionRequests });
    console.warn(`[Ads][Rewarded] session request cap (${MAX_SESSION_REQUESTS}) reached — no further loads`);
  }
  return true;
}

function createAndLoad() {
  destroyAd();

  if (isRateLimited()) {
    setStatus('idle');
    // Release a queued tap now rather than making it wait out the timeout.
    if (pendingShow) {
      const p = pendingShow;
      pendingShow = null;
      if (pendingTimer) { clearTimeout(pendingTimer); pendingTimer = null; }
      track('ad_show_skipped', { placement: p.placement, reason: 'rate_limited' });
      try { p.onUnavailable(); } catch {}
    }
    return;
  }

  const instance = RewardedAd.createForAdRequest(AD_UNIT_IDS.REWARDED);
  ad = instance;
  earned = false;
  sessionRequests += 1;
  loadStartedAt = Date.now();
  setStatus('loading');
  track('ad_requested', { attempt: retries + 1, session_requests: sessionRequests });
  console.log(`[Ads][Rewarded] request #${sessionRequests} (attempt ${retries + 1}) unit=${AD_UNIT_IDS.REWARDED}`);

  // Every listener is registered through this so its unsubscribe is captured.
  const on = (type: any, handler: (arg?: any) => void) => {
    const off = instance.addAdEventListener(type, (arg: any) => {
      // A late event from a superseded instance must not touch shared state.
      if (ad !== instance) return;
      handler(arg);
    });
    if (typeof off === 'function') listenerCleanups.push(off);
  };

  on(RewardedAdEventType.LOADED, () => {
    retries = 0;
    setStatus('ready');
    track('ad_loaded', { load_ms: Date.now() - loadStartedAt });
    console.log('[Ads][Rewarded] loaded');

    // Someone tapped "watch" while this was still in flight — honour it now.
    if (pendingShow) {
      const p = pendingShow;
      pendingShow = null;
      if (pendingTimer) { clearTimeout(pendingTimer); pendingTimer = null; }
      doShow(p);
    }
  });

  on(RewardedAdEventType.EARNED_REWARD, (reward: any) => {
    earned = true;
    console.log('[Ads][Rewarded] earned:', JSON.stringify(reward));
  });

  on(AdEventType.OPENED, () => {
    // OPENED is the closest client-side proxy for an AdMob impression.
    track('ad_impression', { placement: activePlacement });
    analytics.capture('rewarded_ad_started', { placement: activePlacement });
  });

  on(AdEventType.CLOSED, () => {
    const wasEarned = earned;
    const placement = activePlacement;
    const reward = activeReward;

    activeReward = null;
    activePlacement = 'unknown';

    track('ad_closed', { placement, earned: wasEarned });
    analytics.capture(
      wasEarned ? 'rewarded_ad_completed' : 'rewarded_ad_abandoned',
      { placement },
    );

    // Feeds the "5 rewarded ads watched" paywall trigger. Previously only
    // useRewardedUnlock registered this; now every completed rewarded ad counts,
    // including the streak-restore/XP ones that go through useRewardedAd.
    if (wasEarned) {
      try { usePaywallStore.getState().registerRewardedWatched(); } catch {}
    }

    if (wasEarned && reward) {
      try { reward(); } catch (e) { logAdErr('Rewarded reward callback', e); }
    }

    // Never reuse an instance that has been shown — that is the "ad reused"
    // error. Build a fresh one so the next show is instant.
    retries = 0;
    createAndLoad();
  });

  on(AdEventType.ERROR, (error: any) => {
    logAdErr(`Rewarded attempt#${retries + 1}`, error);
    track('ad_failed', {
      attempt: retries + 1,
      error_code: error?.code ?? 'unknown',
      error_message: error?.message ?? '',
    });

    destroyAd();
    setStatus('idle');
    retries += 1;

    // A caller waiting on this load must be released now rather than sitting
    // through the whole PENDING_SHOW_TIMEOUT_MS.
    if (pendingShow && retries >= MAX_RETRIES) {
      const p = pendingShow;
      pendingShow = null;
      if (pendingTimer) { clearTimeout(pendingTimer); pendingTimer = null; }
      track('ad_show_skipped', { placement: p.placement, reason: 'load_failed' });
      try { p.onUnavailable(); } catch {}
    }

    if (retries >= MAX_RETRIES) {
      console.warn(`[Ads][Rewarded] giving up after ${retries} failures — will retry on next user intent`);
      return;
    }

    const delay = RETRY_BASE_MS * Math.pow(2, retries - 1);
    console.log(`[Ads][Rewarded] retry in ${delay}ms`);
    if (retryTimer) clearTimeout(retryTimer);
    retryTimer = setTimeout(() => { retryTimer = null; createAndLoad(); }, delay);
  });

  try {
    instance.load();
  } catch (e) {
    logAdErr('Rewarded .load() throw', e);
    destroyAd();
    setStatus('idle');
  }
}

/**
 * Idempotent. Safe to call from many components; only the first one starts a
 * request. Call it when a rewarded surface becomes visible so the ad is warm by
 * the time the user taps, without paying the cost at app boot.
 */
export function prepareRewarded(): void {
  if (status === 'loading' || status === 'ready' || status === 'showing') return;
  if (isRateLimited()) return;

  // Explicit user intent — forgive earlier failures.
  if (retries >= MAX_RETRIES) retries = 0;
  if (retryTimer) { clearTimeout(retryTimer); retryTimer = null; }

  initAdsSDK().then(() => {
    // Another caller may have won the race while the SDK was initialising.
    if (status === 'idle') createAndLoad();
  });
}

// ── Show ─────────────────────────────────────────────────────────────────────
function doShow(req: PendingShow) {
  const instance = ad;
  if (!instance || status !== 'ready') {
    track('ad_show_skipped', { placement: req.placement, reason: 'not_ready' });
    try { req.onUnavailable(); } catch {}
    return;
  }

  activePlacement = req.placement;
  activeReward = req.onReward;
  earned = false;
  setStatus('showing');

  try {
    instance.show();
  } catch (e) {
    logAdErr('Rewarded .show() throw', e);
    track('ad_show_skipped', { placement: req.placement, reason: 'show_threw' });
    activeReward = null;
    setStatus('idle');
    try { req.onUnavailable(); } catch {}
    createAndLoad();
  }
}

export type ShowRewardedResult = 'showing' | 'waiting' | 'busy';

/**
 * Show the shared rewarded ad.
 *
 * - ready      → shows immediately, resolves via onReward when earned
 * - loading    → waits up to PENDING_SHOW_TIMEOUT_MS, then calls onUnavailable
 * - idle       → starts a load and waits the same way
 * - showing    → returns 'busy', caller should do nothing
 *
 * onUnavailable is the caller's cue to degrade gracefully. It is never called
 * before we have genuinely tried, which is what stops the old "instant free
 * unlock" path from burning a filled request with no impression.
 */
export function showRewarded(opts: {
  placement: string;
  onReward: () => void;
  onUnavailable: () => void;
}): ShowRewardedResult {
  const req: PendingShow = {
    placement: opts.placement,
    onReward: opts.onReward,
    onUnavailable: opts.onUnavailable,
  };

  if (status === 'showing') {
    track('ad_show_skipped', { placement: req.placement, reason: 'already_showing' });
    return 'busy';
  }

  if (status === 'ready') {
    doShow(req);
    return 'showing';
  }

  // Not ready: queue the show and make sure something is actually loading.
  pendingShow = req;
  if (pendingTimer) clearTimeout(pendingTimer);
  pendingTimer = setTimeout(() => {
    pendingTimer = null;
    const p = pendingShow;
    pendingShow = null;
    if (!p) return;
    track('ad_show_skipped', { placement: p.placement, reason: 'timeout' });
    console.log('[Ads][Rewarded] show timed out waiting for load');
    try { p.onUnavailable(); } catch {}
  }, PENDING_SHOW_TIMEOUT_MS);

  prepareRewarded();
  return 'waiting';
}

/** True while a show() is queued behind an in-flight load — drive a spinner off this. */
export function isRewardedPending(): boolean {
  return pendingShow !== null;
}
