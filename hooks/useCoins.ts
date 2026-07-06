// hooks/useCoins.ts
// Cross-cutting coin hooks: keep the "1 coin per 1000 XP" grant in sync with the
// gamification store, and expose a referral-pass boolean that flips off by itself
// when the pass expires.
import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useCoinData, useCoinStore } from '../store/useCoinStore';
import { useGamificationStore } from '../store/useGamificationStore';

/**
 * Mount once (in _layout). Grants a coin for every 1000 total XP the moment the
 * user crosses each threshold, and once on mount to catch up existing XP.
 */
export function useCoinsFromXp() {
  const user = useAuthStore(s => s.user);

  useEffect(() => {
    // Catch up immediately (also credits existing XP the first time).
    try { useCoinStore.getState().syncXpCoins(useGamificationStore.getState().totalXP ?? 0); } catch {}

    // Grant as totalXP changes.
    const unsub = useGamificationStore.subscribe((state, prev) => {
      if (state.totalXP === prev.totalXP) return;
      try { useCoinStore.getState().syncXpCoins(state.totalXP ?? 0); } catch {}
    });
    return unsub;
  }, [user?.id]);
}

/** Reactive referral-pass flag that auto-flips to false at expiry. */
export function useReferralActive(): boolean {
  const data = useCoinData();
  const until = data.referralPassUntil;
  const [, force] = useState(0);

  useEffect(() => {
    if (!until) return;
    const ms = until - Date.now();
    if (ms <= 0) return;
    const id = setTimeout(() => force(x => x + 1), ms + 250);
    return () => clearTimeout(id);
  }, [until]);

  return !!until && Date.now() < until;
}
