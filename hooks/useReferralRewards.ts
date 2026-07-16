// hooks/useReferralRewards.ts
// Pays both sides of a new friendship REFERRAL_COINS, once per friend.
//
// Detection is client-side and reuses the Friends feature: any user who appears
// in your friends list for the first time is a new friendship, so this covers
// both directions with one rule — the inviter sees the invitee appear once they
// accept, and the invitee sees the inviter. The accepter is usually credited
// sooner, by the Friends sheet on the accept tap; whoever gets there first wins,
// and useCoinStore.creditFriendOnce makes the pair pay out exactly once.
import { useCallback, useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { getFriends } from '../services/friendsService';
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
      const friends = await getFriends();
      const friendIds = friends.map(f => String(f.userId));

      const coin = useCoinStore.getState();
      const data = coin.getData();

      if (!data.referralBaselineReady) {
        // First run for this account on this device: everyone already on the list
        // predates the reward, so record them as known and pay nothing. Without
        // this, signing in with existing friends would mint coins for each one.
        coin.setReferralBaseline(friendIds);
        return;
      }

      const appeared = friendIds.filter(id => !data.knownFriendIds.includes(id));
      for (const id of appeared) coin.creditFriendOnce(id);

      // Refresh baselines for the next diff.
      coin.setReferralBaseline(friendIds);
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
