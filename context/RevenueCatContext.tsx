// context/RevenueCatContext.tsx
//
// RevenueCat integration for Daily History.
//
// Source of truth for PRO subscription status. Exposes helpers for presenting
// the paywall and customer center from the `react-native-purchases-ui` package.
//
// Keys and the entitlement identifier live in config/revenuecat.ts.

import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import Purchases, {
  CustomerInfo,
  LOG_LEVEL,
  PurchasesOffering,
} from 'react-native-purchases';
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';

import { PRO_ENTITLEMENT_ID, REVENUECAT_API_KEYS } from '../config/revenuecat';
import { useReferralActive } from '../hooks/useCoins';
import { refreshMe } from '../services/authService';
import { useAuthStore } from '../store/useAuthStore';

// Re-exported for backwards compatibility with existing callers.
export const PRO_ENTITLEMENT = PRO_ENTITLEMENT_ID;

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

  // Referral "free day of PRO" pass — a local, time-boxed unlock-all (no payment).
  const referralActive = useReferralActive();

  // RC entitlement is the live source of truth; backend is_pro is the durable
  // fallback — set by the RevenueCat webhook, survives app updates and reinstalls.
  // A referral pass also counts as PRO while it's active.
  const isPro =
    !!customerInfo?.entitlements.active[PRO_ENTITLEMENT] ||
    user?.is_pro === true ||
    referralActive;

  // ── Configure SDK once ──
  useEffect(() => {
    if (configuredRef.current) return;
    configuredRef.current = true;

    const apiKey = Platform.select(REVENUECAT_API_KEYS) ?? REVENUECAT_API_KEYS.ios;

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

  // ── Identify user in RC + refresh backend profile when auth is available ──
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
          await refreshMe();
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

  // ── Refresh RC entitlement + backend is_pro when app comes to foreground ──
  useEffect(() => {
    if (!ready) return;
    const sub = AppState.addEventListener('change', async (state) => {
      if (state !== 'active') return;
      try {
        const info = await Purchases.getCustomerInfo();
        setCustomerInfo(info);
        if (user?.id) await refreshMe();
      } catch (e) {
        if (__DEV__) console.warn('[RC] foreground refresh failed', e);
      }
    });
    return () => sub.remove();
  }, [ready, user?.id]);

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
      const outcome = mapPaywallResult(res);
      try {
        const info = await Purchases.getCustomerInfo();
        setCustomerInfo(info);
      } catch { /* listener will catch it */ }
      if (outcome === 'PURCHASED' || outcome === 'RESTORED') {
        await refreshMe();
      }
      return outcome;
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
      const hasPro = !!info.entitlements.active[PRO_ENTITLEMENT];
      if (hasPro) await refreshMe();
      return hasPro;
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
  }), [ready, isPro, referralActive, customerInfo, currentOffering, presentPaywall, presentPaywallIfNeeded, presentCustomerCenter, restorePurchases, refresh]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
