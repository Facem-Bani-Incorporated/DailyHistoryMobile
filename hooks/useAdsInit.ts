// hooks/useAdsInit.ts
import { useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import mobileAds, { AdsConsent } from 'react-native-google-mobile-ads';
import {
  getTrackingPermissionsAsync,
  requestTrackingPermissionsAsync,
} from 'expo-tracking-transparency';
import { AD_UNIT_IDS } from '../config/ads';
import * as analytics from '../src/analytics/posthog';

/** Hard ceiling on the consent phase. Nothing here may block ad serving forever:
 *  if UMP or the ATT prompt stalls, we initialise anyway and the SDK falls back
 *  to non-personalised ads, which is the compliant outcome. */
const CONSENT_TIMEOUT_MS = 8000;

const withTimeout = <T,>(p: Promise<T>, ms: number, tag: string): Promise<T | null> =>
  Promise.race([
    p,
    new Promise<null>((resolve) =>
      setTimeout(() => {
        console.warn(`[Ads][${tag}] timed out after ${ms}ms — continuing without it`);
        resolve(null);
      }, ms),
    ),
  ]);

/** ATT can only present while the app is foregrounded; asking earlier resolves
 *  immediately as denied and the prompt is then never shown again. */
function waitForActive(timeoutMs = 5000): Promise<void> {
  if (AppState.currentState === 'active') return Promise.resolve();
  return new Promise((resolve) => {
    const timer = setTimeout(() => { sub.remove(); resolve(); }, timeoutMs);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        clearTimeout(timer);
        sub.remove();
        resolve();
      }
    });
  });
}

let globalInitialized = false;
let globalInitPromise: Promise<void> | null = null;

const logErr = (tag: string, err: any) => {
  console.warn(
    `[Ads][${tag}] FAILED`,
    '\n  code   :', err?.code ?? '(none)',
    '\n  message:', err?.message ?? '(none)',
    '\n  raw    :', JSON.stringify(err, Object.getOwnPropertyNames(err ?? {}))
  );
};

export const logAdErr = logErr;

// ── Consent gathering — MUST run before mobileAds().initialize() ──
//
// Order required for compliance:
//   1. Google UMP (GDPR/EEA + UK) — gather/refresh consent and show the
//      consent form when required. AdMob policy mandates a CMP for EU traffic.
//   2. iOS App Tracking Transparency — request the ATT prompt before the SDK
//      reads the IDFA. Apple requires this for personalized ads.
// The GMA SDK then serves personalized vs. non-personalized ads automatically
// based on the gathered consent + ATT status — no manual flag needed per request.
//
// Both phases are time-boxed. Previously they were awaited unbounded, and
// mobileAds().initialize() sat behind them — so on iOS the entire ad stack was
// blocked until the user tapped the ATT prompt. Anything the user did before
// that found every rewarded ad "not ready", which is why iOS logged 114 requests
// and zero impressions while Android was fine.
async function gatherAdConsent(): Promise<void> {
  // 1. Google UMP (GDPR)
  try {
    await withTimeout(AdsConsent.requestInfoUpdate(), CONSENT_TIMEOUT_MS, 'UMP.requestInfoUpdate');
    await withTimeout(
      AdsConsent.loadAndShowConsentFormIfRequired(),
      CONSENT_TIMEOUT_MS,
      'UMP.consentForm',
    );
  } catch (err) {
    logErr('UMP', err);
  }

  // 2. iOS ATT — only prompt if the user hasn't decided yet.
  if (Platform.OS === 'ios') {
    try {
      const { status } = await getTrackingPermissionsAsync();
      if (status === 'undetermined') {
        await waitForActive();
        await withTimeout(requestTrackingPermissionsAsync(), CONSENT_TIMEOUT_MS, 'ATT');
      }
    } catch (err) {
      logErr('ATT', err);
    }
  }
}

export function initAdsSDK(): Promise<void> {
  if (globalInitialized) return Promise.resolve();
  if (globalInitPromise) return globalInitPromise;

  console.log('[Ads][SDK] ==========================================');
  console.log('[Ads][SDK] Starting initialization...');
  console.log('[Ads][SDK] Unit IDs in use:');
  console.log('[Ads][SDK]   BANNER       =', AD_UNIT_IDS.BANNER);
  console.log('[Ads][SDK]   INTERSTITIAL =', AD_UNIT_IDS.INTERSTITIAL);
  console.log('[Ads][SDK]   REWARDED     =', AD_UNIT_IDS.REWARDED);
  console.log('[Ads][SDK] __DEV__        =', __DEV__);

  const start = Date.now();

  globalInitPromise = gatherAdConsent()
    .then(() => mobileAds().initialize())
    .then((adapterStatuses) => {
      globalInitialized = true;
      const ms = Date.now() - start;
      console.log(`[Ads][SDK] Initialized OK in ${ms}ms`);
      console.log('[Ads][SDK] Adapter statuses:', JSON.stringify(adapterStatuses));
      // init_ms is the number to watch on iOS: if it stays in the thousands,
      // the consent phase is still gating ad availability.
      try {
        analytics.capture('ad_sdk_initialized', { init_ms: ms, platform: Platform.OS });
      } catch {}
    })
    .catch((err) => {
      globalInitPromise = null;
      logErr('SDK', err);
      try {
        analytics.capture('ad_sdk_init_failed', {
          platform: Platform.OS,
          error_message: err?.message ?? '',
        });
      } catch {}
    });

  return globalInitPromise;
}

export function useAdsInit() {
  const initialized = useRef(false);
  const [ready, setReady] = useState(globalInitialized);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    initAdsSDK().then(() => setReady(true));
  }, []);

  return ready;
}
