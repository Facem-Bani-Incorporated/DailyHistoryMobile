// config/ads.ts
import { TestIds } from 'react-native-google-mobile-ads';
import { Platform } from 'react-native';

// true  → test ads (debugging/testing)
// false → real AdMob IDs (production)
const USE_TEST_IDS = true;

const PRODUCTION_IDS = {
  BANNER: Platform.OS === 'ios'
    ? 'ca-app-pub-2338557822432313/3671068145'
    : 'ca-app-pub-2338557822432313/1375182105',
  INTERSTITIAL: Platform.OS === 'ios'
    ? 'ca-app-pub-2338557822432313/6825424108'
    : 'ca-app-pub-2338557822432313/3442955557',
  REWARDED: Platform.OS === 'ios'
    ? 'ca-app-pub-2338557822432313/8053685806'
    : 'ca-app-pub-2338557822432313/4532675945',
};

export const AD_UNIT_IDS = {
  BANNER:       USE_TEST_IDS ? TestIds.BANNER       : PRODUCTION_IDS.BANNER,
  INTERSTITIAL: USE_TEST_IDS ? TestIds.INTERSTITIAL : PRODUCTION_IDS.INTERSTITIAL,
  REWARDED:     USE_TEST_IDS ? TestIds.REWARDED     : PRODUCTION_IDS.REWARDED,
};

export const ADS_CONFIG = {
  // Minimum gap between any two interstitials (5 minutes)
  INTERSTITIAL_COOLDOWN: 5 * 60 * 1000,

  // Max interstitials per app session; +1 allowed if session > SESSION_LONG_THRESHOLD
  MAX_INTERSTITIALS_PER_SESSION: 2,
  SESSION_LONG_THRESHOLD: 10 * 60 * 1000, // 10 min session gets 3 interstitials

  // AdCard (full-slot carousel card) shown every N days in the swipe feed
  AD_CARD_DAY_FREQUENCY: 7,

  // XP reward for finishing a rewarded ad
  REWARDED_XP_BONUS: 500,
};
