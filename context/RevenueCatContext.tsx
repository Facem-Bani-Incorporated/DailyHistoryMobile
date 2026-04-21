// context/RevenueCatContext.tsx
//
// RevenueCat integration for Daily History.
//
// Source of truth for PRO subscription status. Exposes helpers for presenting
// the paywall and customer center from the `react-native-purchases-ui` package.
//
// Dashboard setup required:
//   - Entitlement identifier: "Daily History Pro" (exactly, incl. spaces)
//   - Packages in the current offering: $rc_lifetime, $rc_annual, $rc_monthly
//     (or custom identifiers "lifetime", "yearly", "monthly")
//   - Paywall template configured in the RevenueCat dashboard
//
// NOTE: Replace the test key with platform-specific public SDK keys before
// shipping — production keys are prefixed `appl_` (iOS) and `goog_` (Android).

import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import Purchases, {
  CustomerInfo,
  LOG_LEVEL,
  PurchasesOffering,
} from 'react-native-purchases';
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';

import { syncProStatus } from '../services/authService';
import { useAuthStore } from '../store/useAuthStore';

export const PRO_ENTITLEMENT = 'Daily History Pro';

const API_KEYS = {
  ios: 'test_NPEErcNAGTbTJeYrsKYqcefxldU',
  android: 'test_NPEErcNAGTbTJeYrsKYqcefxldU',
} as const;

export type PaywallOutcome = 'PURCHASED' | 'RESTORED' | 'CANCELLED' | 'ERROR' | 'NOT_PRESENTED';

interface RevenueCatCtx {
  ready: boolean;
  isPro: boolean;
  customerInfo: CustomerInfo | null;
  currentOffering: PurchasesOffering | null;
  presentPaywall: () => Promise<PaywallOutcome>;
  presentPaywallIfNeeded: () => Promise<PaywallOutcome>;
  presentCustomerCenter: () => Promise<void>;
  restorePurchases: () => Promise<boolean>;
  refresh: () => Promise<void>;
}

const Ctx = createContext<RevenueCatCtx | null>(null);

export const useRevenueCat = (): RevenueCatCtx => {
  const v = useContext(Ctx);
  if (!v) throw new Error('useRevenueCat must be used within a RevenueCatProvider');
  return v;
};

export const useIsPro = (): boolean => useRevenueCat().isPro;

const mapPaywallResult = (r: PAYWALL_RESULT): PaywallOutcome => {
  switch (r) {
    case PAYWALL_RESULT.PURCHASED: return 'PURCHASED';
    case PAYWALL_RESULT.RESTORED: return 'RESTORED';
    case PAYWALL_RESULT.CANCELLED: return 'CANCELLED';
    case PAYWALL_RESULT.ERROR: return 'ERROR';
    case PAYWALL_RESULT.NOT_PRESENTED: return 'NOT_PRESENTED';
    default: return 'CANCELLED';
  }
};

export function RevenueCatProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [currentOffering, setCurrentOffering] = useState<PurchasesOffering | null>(null);
  const configuredRef = useRef(false);

  const user = useAuthStore(s => s.user);

  const isPro = !!customerInfo?.entitlements.active[PRO_ENTITLEMENT];

  // ── Configure SDK once ──
  useEffect(() => {
    if (configuredRef.current) return;
    configuredRef.current = true;

    const apiKey = Platform.select(API_KEYS) ?? API_KEYS.ios;

    try {
      if (__DEV__) Purchases.setLogLevel(LOG_LEVEL.DEBUG);
      Purchases.configure({ apiKey });
    } catch (e) {
      if (__DEV__) console.warn('[RC] configure failed', e);
      setReady(true);
      return;
    }

    const onInfo = (info: CustomerInfo) => setCustomerInfo(info);
    Purchases.addCustomerInfoUpdateListener(onInfo);

    (async () => {
      try {
        const [info, offerings] = await Promise.all([
          Purchases.getCustomerInfo(),
          Purchases.getOfferings(),
        ]);
        setCustomerInfo(info);
        setCurrentOffering(offerings.current ?? null);
      } catch (e) {
        if (__DEV__) console.warn('[RC] initial fetch failed', e);
      } finally {
        setReady(true);
      }
    })();

    return () => {
      Purchases.removeCustomerInfoUpdateListener(onInfo);
    };
  }, []);

  // ── Identify user in RC when auth is available ──
  useEffect(() => {
    if (!ready) return;
    (async () => {
      try {
        if (user?.id) {
          const uid = String(user.id);
          const currentId = await Purchases.getAppUserID();
          if (currentId !== uid) {
            const { customerInfo: info } = await Purchases.logIn(uid);
            setCustomerInfo(info);
          }
        } else {
          const anonymous = await Purchases.isAnonymous();
          if (!anonymous) {
            const info = await Purchases.logOut();
            setCustomerInfo(info);
          }
        }
      } catch (e) {
        if (__DEV__) console.warn('[RC] identity sync failed', e);
      }
    })();
  }, [ready, user?.id]);

  // ── Sync is_pro to backend whenever subscription state changes ──
  const prevIsProRef = useRef<boolean | null>(null);
  useEffect(() => {
    if (!ready || !user?.id) return;
    if (prevIsProRef.current === isPro) return;
    prevIsProRef.current = isPro;
    syncProStatus(isPro);
  }, [isPro, ready, user?.id]);

  const refresh = useCallback(async () => {
    try {
      const [info, offerings] = await Promise.all([
        Purchases.getCustomerInfo(),
        Purchases.getOfferings(),
      ]);
      setCustomerInfo(info);
      setCurrentOffering(offerings.current ?? null);
    } catch (e) {
      if (__DEV__) console.warn('[RC] refresh failed', e);
    }
  }, []);

  const presentPaywall = useCallback(async (): Promise<PaywallOutcome> => {
    try {
      const res = await RevenueCatUI.presentPaywall();
      try {
        const info = await Purchases.getCustomerInfo();
        setCustomerInfo(info);
      } catch { /* listener will catch it */ }
      return mapPaywallResult(res);
    } catch (e) {
      if (__DEV__) console.warn('[RC] presentPaywall failed', e);
      return 'ERROR';
    }
  }, []);

  const presentPaywallIfNeeded = useCallback(async (): Promise<PaywallOutcome> => {
    try {
      const res = await RevenueCatUI.presentPaywallIfNeeded({
        requiredEntitlementIdentifier: PRO_ENTITLEMENT,
      });
      try {
        const info = await Purchases.getCustomerInfo();
        setCustomerInfo(info);
      } catch { /* listener will catch it */ }
      return mapPaywallResult(res);
    } catch (e) {
      if (__DEV__) console.warn('[RC] presentPaywallIfNeeded failed', e);
      return 'ERROR';
    }
  }, []);

  const presentCustomerCenter = useCallback(async () => {
    try {
      await RevenueCatUI.presentCustomerCenter();
      const info = await Purchases.getCustomerInfo();
      setCustomerInfo(info);
    } catch (e) {
      if (__DEV__) console.warn('[RC] presentCustomerCenter failed', e);
    }
  }, []);

  const restorePurchases = useCallback(async () => {
    try {
      const info = await Purchases.restorePurchases();
      setCustomerInfo(info);
      return !!info.entitlements.active[PRO_ENTITLEMENT];
    } catch (e) {
      if (__DEV__) console.warn('[RC] restore failed', e);
      return false;
    }
  }, []);

  const value = useMemo<RevenueCatCtx>(() => ({
    ready,
    isPro,
    customerInfo,
    currentOffering,
    presentPaywall,
    presentPaywallIfNeeded,
    presentCustomerCenter,
    restorePurchases,
    refresh,
  }), [ready, isPro, customerInfo, currentOffering, presentPaywall, presentPaywallIfNeeded, presentCustomerCenter, restorePurchases, refresh]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
