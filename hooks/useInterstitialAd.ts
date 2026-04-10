// hooks/useInterstitialAd.ts
import { useCallback, useEffect, useRef } from 'react';
import {
  AdEventType,
  InterstitialAd,
} from 'react-native-google-mobile-ads';
import { AD_UNIT_IDS, ADS_CONFIG } from '../config/ads';

/**
 * Hook for interstitial ads.
 * Preloads an ad, shows it every N stories, respects cooldown.
 *
 * Usage:
 *   const { maybeShowInterstitial } = useInterstitialAd();
 *   // Call after reading a story:
 *   maybeShowInterstitial(totalEventsRead);
 */
export function useInterstitialAd() {
  const adRef = useRef<InterstitialAd | null>(null);
  const loadedRef = useRef(false);
  const lastShownRef = useRef(0);
  const pendingRef = useRef(false);  // ← NOU

  const loadAd = useCallback(() => {
    loadedRef.current = false;

    const ad = InterstitialAd.createForAdRequest(AD_UNIT_IDS.INTERSTITIAL, {
      requestNonPersonalizedAdsOnly: true,
    });

    ad.addAdEventListener(AdEventType.LOADED, () => {
      loadedRef.current = true;
      // Dacă era pending, arată-o acum
      if (pendingRef.current) {
        pendingRef.current = false;
        const now = Date.now();
        if (now - lastShownRef.current >= ADS_CONFIG.INTERSTITIAL_COOLDOWN) {
          ad.show();
          lastShownRef.current = now;
        }
      }
    });

    ad.addAdEventListener(AdEventType.CLOSED, () => {
      loadAd();
    });

    ad.addAdEventListener(AdEventType.ERROR, () => {
      loadedRef.current = false;
      pendingRef.current = false;
      setTimeout(loadAd, 15000);
    });

    ad.load();
    adRef.current = ad;
  }, []);

  useEffect(() => {
    loadAd();
    return () => { adRef.current = null; };
  }, [loadAd]);

  const maybeShowInterstitial = useCallback((_count: number) => {
    if (_count === 0) return;

    const now = Date.now();
    if (now - lastShownRef.current < ADS_CONFIG.INTERSTITIAL_COOLDOWN) return;

    if (loadedRef.current && adRef.current) {
      adRef.current.show();
      lastShownRef.current = now;
      pendingRef.current = false;
    } else {
      // Reclama nu e gata — marchează pending, se va arăta la LOADED
      pendingRef.current = true;
    }
  }, []);

  return { maybeShowInterstitial };
}