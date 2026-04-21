// hooks/useInterstitialAd.ts
import { useCallback, useEffect, useRef } from 'react';
import {
  AdEventType,
  InterstitialAd,
} from 'react-native-google-mobile-ads';
import { AD_UNIT_IDS, ADS_CONFIG } from '../config/ads';
import { initAdsSDK, logAdErr } from './useAdsInit';

export function useInterstitialAd() {
  const adRef = useRef<InterstitialAd | null>(null);
  const loadedRef = useRef(false);
  const lastShownRef = useRef(0);
  const pendingRef = useRef(false);
  const loadCountRef = useRef(0);

  const loadAd = useCallback(() => {
    loadedRef.current = false;
    loadCountRef.current += 1;
    const attempt = loadCountRef.current;

    console.log(`[Ads][Interstitial] Load #${attempt} — unitId=${AD_UNIT_IDS.INTERSTITIAL}`);

    const ad = InterstitialAd.createForAdRequest(AD_UNIT_IDS.INTERSTITIAL);

    ad.addAdEventListener(AdEventType.LOADED, () => {
      loadedRef.current = true;
      console.log(`[Ads][Interstitial] LOADED (attempt #${attempt})`);
      if (pendingRef.current) {
        pendingRef.current = false;
        const now = Date.now();
        if (now - lastShownRef.current >= ADS_CONFIG.INTERSTITIAL_COOLDOWN) {
          console.log('[Ads][Interstitial] Showing pending ad');
          ad.show();
          lastShownRef.current = now;
        }
      }
    });

    ad.addAdEventListener(AdEventType.OPENED, () => {
      console.log('[Ads][Interstitial] OPENED');
    });

    ad.addAdEventListener(AdEventType.CLOSED, () => {
      console.log('[Ads][Interstitial] CLOSED — reloading');
      loadAd();
    });

    ad.addAdEventListener(AdEventType.ERROR, (error) => {
      logAdErr(`Interstitial attempt#${attempt}`, error);
      loadedRef.current = false;
      pendingRef.current = false;
      console.log('[Ads][Interstitial] Retrying in 15s...');
      setTimeout(loadAd, 15000);
    });

    try {
      ad.load();
      adRef.current = ad;
    } catch (e) {
      logAdErr(`Interstitial .load() throw`, e);
    }
  }, []);

  useEffect(() => {
    initAdsSDK().then(() => {
      console.log('[Ads][Interstitial] SDK ready — loading first ad');
      loadAd();
    });
    return () => { adRef.current = null; };
  }, [loadAd]);

  const maybeShowInterstitial = useCallback((_count: number) => {
    if (_count === 0) return;
    const now = Date.now();
    if (now - lastShownRef.current < ADS_CONFIG.INTERSTITIAL_COOLDOWN) {
      console.log('[Ads][Interstitial] Skipped (cooldown)');
      return;
    }

    if (loadedRef.current && adRef.current) {
      console.log('[Ads][Interstitial] Showing');
      adRef.current.show();
      lastShownRef.current = now;
      pendingRef.current = false;
    } else {
      console.log('[Ads][Interstitial] Not loaded yet — marking pending');
      pendingRef.current = true;
    }
  }, []);

  return { maybeShowInterstitial };
}
