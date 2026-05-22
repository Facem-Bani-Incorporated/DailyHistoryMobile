// hooks/useInterstitialAd.ts
// ─────────────────────────────────────────────────────────────────────────────
// Interstitial ad hook — session-aware, natural-trigger only.
//
// Strategy:
//   • Max 2 interstitials per session (3 if session > 10 min)
//   • Min 5-minute gap between any two interstitials
//   • No automatic count-based triggering — callers fire at natural moments
//     (quiz done, leaving map, closing story after reading)
//
// Usage:
//   const { showInterstitial } = useInterstitialAd();
//   showInterstitial(); // e.g. after quiz completes
// ─────────────────────────────────────────────────────────────────────────────
import { useCallback, useEffect, useRef } from 'react';
import { AdEventType, InterstitialAd } from 'react-native-google-mobile-ads';
import { AD_UNIT_IDS, ADS_CONFIG } from '../config/ads';
import { initAdsSDK, logAdErr } from './useAdsInit';

const sessionStart = Date.now();

export function useInterstitialAd() {
  const adRef        = useRef<InterstitialAd | null>(null);
  const loadedRef    = useRef(false);
  const lastShownRef = useRef(0);
  const pendingRef   = useRef(false);
  const loadCountRef = useRef(0);
  const sessionShownRef = useRef(0); // how many interstitials shown this session

  const loadAd = useCallback(() => {
    loadedRef.current = false;
    loadCountRef.current += 1;
    const attempt = loadCountRef.current;

    const ad = InterstitialAd.createForAdRequest(AD_UNIT_IDS.INTERSTITIAL);

    ad.addAdEventListener(AdEventType.LOADED, () => {
      loadedRef.current = true;
      if (pendingRef.current) {
        pendingRef.current = false;
        const now = Date.now();
        if (now - lastShownRef.current >= ADS_CONFIG.INTERSTITIAL_COOLDOWN) {
          ad.show();
          lastShownRef.current = now;
          sessionShownRef.current += 1;
        }
      }
    });

    ad.addAdEventListener(AdEventType.CLOSED, () => {
      loadAd(); // pre-load next immediately after close
    });

    ad.addAdEventListener(AdEventType.ERROR, (error) => {
      logAdErr(`Interstitial #${attempt}`, error);
      loadedRef.current = false;
      pendingRef.current = false;
      setTimeout(loadAd, 30_000); // retry after 30s on error
    });

    try {
      ad.load();
      adRef.current = ad;
    } catch (e) {
      logAdErr('Interstitial .load()', e);
    }
  }, []);

  useEffect(() => {
    initAdsSDK().then(() => loadAd());
    return () => { adRef.current = null; };
  }, [loadAd]);

  // ── Public API ──────────────────────────────────────────────────────────────
  // Call this at natural transition moments (quiz done, map close, etc.)
  const showInterstitial = useCallback(() => {
    const now = Date.now();

    // Session cap: allow 3 if session > SESSION_LONG_THRESHOLD, else 2
    const sessionAge = now - sessionStart;
    const cap = sessionAge >= ADS_CONFIG.SESSION_LONG_THRESHOLD
      ? ADS_CONFIG.MAX_INTERSTITIALS_PER_SESSION + 1
      : ADS_CONFIG.MAX_INTERSTITIALS_PER_SESSION;

    if (sessionShownRef.current >= cap) {
      console.log('[Ads][Interstitial] Session cap reached, skipping');
      return;
    }

    if (now - lastShownRef.current < ADS_CONFIG.INTERSTITIAL_COOLDOWN) {
      console.log('[Ads][Interstitial] Cooldown active, skipping');
      return;
    }

    if (loadedRef.current && adRef.current) {
      adRef.current.show();
      lastShownRef.current = now;
      sessionShownRef.current += 1;
      pendingRef.current = false;
    } else {
      // Mark pending — will show as soon as the current load finishes
      pendingRef.current = true;
    }
  }, []);

  // Kept for backwards compat with any remaining callers — internally
  // just calls showInterstitial() and ignores the count argument.
  const maybeShowInterstitial = useCallback((_count: number) => {
    showInterstitial();
  }, [showInterstitial]);

  return { showInterstitial, maybeShowInterstitial };
}
