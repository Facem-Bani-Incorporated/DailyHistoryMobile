// services/friendsService.ts
// Friends + friends-leaderboard API. All calls go through the shared axios
// instance (auth token attached automatically). Endpoints live in config/api.ts.
import api from '../api';
import { ENDPOINTS } from '../config/api';
import { buildAvatarUrl } from '../config/urls';
import { useAuthStore } from '../store/useAuthStore';
import { getLevelForXP } from '../store/useGamificationStore';

// ── Types ──────────────────────────────────────────────────────────────────
// Mirrors the backend FriendDTO { friendshipId, userId, username, avatarUrl, pro }.
export interface Friend {
  friendshipId: number;
  userId: number;
  username: string;
  avatarUrl?: string | null;
  pro: boolean;
}

// Same shape the LeaderboardModal already knows how to render.
export interface FriendLeaderboardEntry {
  userId: string;
  username: string;
  value: number;       // total XP
  level: number;
  rank: number;
  isCurrentUser: boolean;
  photoUrl?: string;
}

const currentUserId = (): string | undefined => {
  const user = useAuthStore.getState().user;
  return (user?.id ?? (user as any)?._id ?? (user as any)?.userId)?.toString();
};

// ── Requests ────────────────────────────────────────────────────────────────

/**
 * Send a friend request by username. Resolves on success; throws the axios error
 * (with response.status: 404 no such user, 409 already friends/requested,
 * 400 self-add) so the caller can show a precise message.
 */
export const sendFriendRequest = async (username: string): Promise<Friend> => {
  const res = await api.post(ENDPOINTS.FRIENDS_REQUESTS, { username: username.trim() });
  return res.data;
};

export const getIncomingRequests = async (): Promise<Friend[]> => {
  const res = await api.get(ENDPOINTS.FRIENDS_INCOMING);
  return Array.isArray(res.data) ? res.data : [];
};

export const getOutgoingRequests = async (): Promise<Friend[]> => {
  const res = await api.get(ENDPOINTS.FRIENDS_OUTGOING);
  return Array.isArray(res.data) ? res.data : [];
};

export const acceptRequest = async (friendshipId: number): Promise<void> => {
  await api.post(`${ENDPOINTS.FRIENDS_REQUESTS}/${friendshipId}/accept`);
};

export const declineRequest = async (friendshipId: number): Promise<void> => {
  await api.post(`${ENDPOINTS.FRIENDS_REQUESTS}/${friendshipId}/decline`);
};

// ── Friends ──────────────────────────────────────────────────────────────────

export const getFriends = async (): Promise<Friend[]> => {
  const res = await api.get(ENDPOINTS.FRIENDS);
  return Array.isArray(res.data) ? res.data : [];
};

export const removeFriend = async (userId: number): Promise<void> => {
  await api.delete(`${ENDPOINTS.FRIENDS}/${userId}`);
};

// ── Friends leaderboard ───────────────────────────────────────────────────────

/**
 * Friends leaderboard (me + accepted friends), already ranked by XP on the server.
 * `avatarById` optionally supplies real avatars (from the friends list) so entries
 * show a proper photo instead of a generated one.
 */
export const getFriendsLeaderboard = async (
  avatarById?: Map<string, string | undefined>,
): Promise<FriendLeaderboardEntry[]> => {
  try {
    const res = await api.get(ENDPOINTS.FRIENDS_LEADERBOARD);
    if (!Array.isArray(res.data)) return [];

    const myId = currentUserId();
    const user = useAuthStore.getState().user;
    const myPhoto =
      (user as any)?.avatar_url || (user as any)?.avatarUrl || (user as any)?.picture || undefined;

    return res.data.map((item: any, index: number) => {
      const id = String(item.userId);
      const username = item.username || 'Utilizator';
      const isCurrentUser = id === myId;

      let photoUrl: string | undefined = avatarById?.get(id) || undefined;
      if (!photoUrl && isCurrentUser) photoUrl = myPhoto;
      if (!photoUrl) photoUrl = buildAvatarUrl(username, { size: 128 });

      return {
        userId: id,
        username,
        value: item.totalXP || 0,
        level: getLevelForXP(item.totalXP || 0).level,
        rank: index + 1,
        isCurrentUser,
        photoUrl,
      };
    });
  } catch (error) {
    console.error('[Friends Leaderboard Error]:', error);
    return [];
  }
};
