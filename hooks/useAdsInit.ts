// hooks/useAdsInit.ts
import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import mobileAds, { AdsConsent } from 'react-native-google-mobile-ads';
import {
  getTrackingPermissionsAsync,
  requestTrackingPermissionsAsync,
} from 'expo-tracking-transparency';
import { AD_UNIT_IDS } from '../config/ads';

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
async function gatherAdConsent(): Promise<void> {
  // 1. Google UMP (GDPR)
  try {
    await AdsConsent.requestInfoUpdate();
    await AdsConsent.loadAndShowConsentFormIfRequired();
  } catch (err) {
    logErr('UMP', err);
  }

  // 2. iOS ATT — only prompt if the user hasn't decided yet.
  if (Platform.OS === 'ios') {
    try {
      const { status } = await getTrackingPermissionsAsync();
      if (status === 'undetermined') {
        await requestTrackingPermissionsAsync();
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
    })
    .catch((err) => {
      globalInitPromise = null;
      logErr('SDK', err);
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
