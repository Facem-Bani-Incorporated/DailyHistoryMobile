// hooks/useReferralRewards.ts
// Grants the referral reward (a stacking 24h "free day of PRO" pass) when someone
// you invited accepts your friend request. Detection is client-side and reuses the
// Friends feature: when a user who was in your *outgoing* pending requests shows up
// in your friends list, they accepted your invite → you get a day.
//
// No payments involved — the pass just OR's into isPro (see useReferralActive /
// RevenueCatContext), unlocking every event and map layer while active.
import { useCallback, useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { getFriends, getOutgoingRequests } from '../services/friendsService';
import { useAuthStore } from '../store/useAuthStore';
import { useCoinStore } from '../store/useCoinStore';

const CHECK_THROTTLE_MS = 60 * 1000;

export function useReferralRewards() {
  const token = useAuthStore(s => s.token);
  const user = useAuthStore(s => s.user);
  const lastCheck = useRef(0);

  const check = useCallback(async () => {
    if (!useAuthStore.getState().token) return;
    const now = Date.now();
    if (now - lastCheck.current < CHECK_THROTTLE_MS) return;
    lastCheck.current = now;

    try {
      const [friends, outgoing] = await Promise.all([getFriends(), getOutgoingRequests()]);
      const friendIds = friends.map(f => String(f.userId));
      const outgoingIds = outgoing.map(f => String(f.userId));

      const coin = useCoinStore.getState();
      const data = coin.getData();

      // A friend who was previously in my outgoing (pending) snapshot accepted my
      // invite. Credit each such friend exactly once.
      const newlyAccepted = friendIds.filter(
        id => data.pendingOutgoingIds.includes(id) && !data.creditedReferralFriendIds.includes(id),
      );

      for (const id of newlyAccepted) {
        coin.creditReferral(id);
        coin.grantReferralDays(1);
      }

      // Refresh baselines for the next diff.
      coin.setReferralBaseline(friendIds, outgoingIds);
    } catch {
      // network hiccup — try again next foreground
    }
  }, []);

  // Run on auth + on every foreground.
  useEffect(() => {
    if (!token || !user?.id) return;
    check();
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') check();
    });
    return () => sub.remove();
  }, [token, user?.id, check]);
}
