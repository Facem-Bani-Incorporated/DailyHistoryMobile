// config/revenuecat.ts
// Central configuration for RevenueCat.
//
// PRO_ENTITLEMENT_ID must match exactly the Entitlement identifier configured
// in the RevenueCat dashboard (case + spaces).
//
// API_KEYS are currently RevenueCat **test** keys — swap to production keys
// (prefixed `appl_` for iOS and `goog_` for Android) before shipping.

export const PRO_ENTITLEMENT_ID = 'Daily History Pro';

export const REVENUECAT_API_KEYS = {
  ios:     'appl_KDSEplizwQfToYFiZijHJsijVeE',
  android: 'goog_taZgFRPRaDbDwkjWiPxSOvFylGh',
} as const;
