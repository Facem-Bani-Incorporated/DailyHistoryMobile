// hooks/useAdsInit.ts
import { useEffect, useRef } from 'react';
import mobileAds from 'react-native-google-mobile-ads';

/**
 * Initialize Google Mobile Ads SDK.
 * Call once in _layout.tsx.
 */
export function useAdsInit() {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    mobileAds()
      .initialize()
      .then(() => {
        console.log('[Ads] SDK initialized');
      })
      .catch((err) => {
        console.warn('[Ads] SDK init failed:', err);
      });
  }, []);
}