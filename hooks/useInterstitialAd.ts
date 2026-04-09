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

  const loadAd = useCallback(() => {
    loadedRef.current = false;

    const ad = InterstitialAd.createForAdRequest(AD_UNIT_IDS.INTERSTITIAL, {
      requestNonPersonalizedAdsOnly: true,
    });

    ad.addAdEventListener(AdEventType.LOADED, () => {
      loadedRef.current = true;
      console.log('[Ads] Interstitial loaded');
    });

    ad.addAdEventListener(AdEventType.CLOSED, () => {
      console.log('[Ads] Interstitial closed');
      // Preload next one
      loadAd();
    });

    ad.addAdEventListener(AdEventType.ERROR, (error) => {
      console.warn('[Ads] Interstitial error:', error);
      loadedRef.current = false;
      // Retry after 30s
      setTimeout(loadAd, 30000);
    });

    ad.load();
    adRef.current = ad;
  }, []);

  useEffect(() => {
    loadAd();

    return () => {
      adRef.current = null;
    };
  }, [loadAd]);

  const maybeShowInterstitial = useCallback((storiesReadCount: number) => {
    // Only show every N stories
    if (storiesReadCount % ADS_CONFIG.INTERSTITIAL_FREQUENCY !== 0) return;
    if (storiesReadCount === 0) return;

    // Respect cooldown
    const now = Date.now();
    if (now - lastShownRef.current < ADS_CONFIG.INTERSTITIAL_COOLDOWN) return;

    // Show if loaded
    if (loadedRef.current && adRef.current) {
      adRef.current.show();
      lastShownRef.current = now;
    }
  }, []);

  return { maybeShowInterstitial };
}