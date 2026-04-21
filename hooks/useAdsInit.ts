// hooks/useAdsInit.ts
import { useEffect, useRef, useState } from 'react';
import mobileAds from 'react-native-google-mobile-ads';
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

  globalInitPromise = mobileAds()
    .initialize()
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
