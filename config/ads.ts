// config/ads.ts
import { TestIds } from 'react-native-google-mobile-ads';

// ── Flip to false for production ──
const USE_TEST_IDS = true;

// ── Real Ad Unit IDs from AdMob ──
const PRODUCTION_IDS = {
  BANNER: 'ca-app-pub-7999755031829705/5483648199',
  INTERSTITIAL: 'ca-app-pub-7999755031829705/9813775443',
  REWARDED: 'ca-app-pub-7999755031829705/1025528432',
};

// ── Export: uses test IDs in dev, real in prod ──
export const AD_UNIT_IDS = {
  BANNER: USE_TEST_IDS ? TestIds.ADAPTIVE_BANNER : PRODUCTION_IDS.BANNER,
  INTERSTITIAL: USE_TEST_IDS ? TestIds.INTERSTITIAL : PRODUCTION_IDS.INTERSTITIAL,
  REWARDED: USE_TEST_IDS ? TestIds.REWARDED : PRODUCTION_IDS.REWARDED,
};

// ── Ad behavior config ──
export const ADS_CONFIG = {
  // Show interstitial every N stories read
  INTERSTITIAL_FREQUENCY: 5,

  // XP bonus for watching a rewarded ad
  REWARDED_XP_BONUS: 50,

  // Cooldown between interstitials (ms) — minimum 60s
  INTERSTITIAL_COOLDOWN: 60 * 1000,
};