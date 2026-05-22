import api from '../api';
import { ENDPOINTS } from '../config/api';
import { buildAvatarUrl } from '../config/urls';
import { useAuthStore } from '../store/useAuthStore';
import { getLevelForXP } from '../store/useGamificationStore';

export type LeaderboardType = 'xp' | 'streak' | 'stories' | 'goals';
export type LeaderboardPeriod = 'alltime' | 'monthly';

export interface LeaderboardEntry {
  userId: string;
  username: string;
  value: number;
  level: number;
  rank: number;
  isCurrentUser: boolean;
  photoUrl?: string;
}

export const fetchLeaderboard = async (type: LeaderboardType, period: LeaderboardPeriod = 'alltime'): Promise<LeaderboardEntry[]> => {
  try {
    const user = useAuthStore.getState().user;
    const myId = user?.id || (user as any)?._id || (user as any)?.userId;

    const response = await api.get(ENDPOINTS.GAMIFICATION_ALL, { params: { period } });

    if (!response.data || !Array.isArray(response.data)) {
        return [];
    }

    const fieldMap: Record<LeaderboardType, string> = {
      xp: period === 'monthly' ? 'monthlyXP' : 'totalXP',
      streak: 'currentStreak',
      stories: 'totalEventsRead',
      goals: 'dailyGoalsCompleted'
    };

    const sortField = fieldMap[type];

    // My own photo from auth store (always available for the current user)
    const myPhotoUrl = (user as any)?.avatar_url || (user as any)?.avatarUrl || (user as any)?.picture || undefined;

    // Generates a nice avatar image from the username — same trick as ProfileAvatar.tsx
    const generatedAvatar = (name: string) => buildAvatarUrl(name, { size: 128 });

    // Sortăm descrescător în funcție de tab-ul selectat
    const sorted = [...response.data].sort((a, b) => (b[sortField] || 0) - (a[sortField] || 0));

    // Mapăm pe formatul cerut de interfață
    return sorted.map((item: any, index: number) => {
      const itemId = item.userId;
      const username = item.username || 'Utilizator';
      const isCurrentUser = String(itemId) === String(myId);

      // Try every plausible field the backend might return for the profile photo
      let photoUrl: string | undefined =
        item.avatarUrl ||
        item.avatar_url ||
        item.photoUrl ||
        item.picture ||
        item.profileImageUrl ||
        item.profilePicture ||
        undefined;

      // For the current user, fall back to the auth store photo (guaranteed to work)
      if (!photoUrl && isCurrentUser) {
        photoUrl = myPhotoUrl;
      }

      // Try parsing the gamificationData blob if the backend returns it
      if (!photoUrl && item.gamificationData) {
        try {
          const blob = typeof item.gamificationData === 'string'
            ? JSON.parse(item.gamificationData)
            : item.gamificationData;
          if (blob?.photoUrl && typeof blob.photoUrl === 'string') {
            photoUrl = blob.photoUrl;
          }
        } catch {}
      }

      // Final fallback: generate a nice initial-based avatar so every user has an image
      if (!photoUrl) {
        photoUrl = generatedAvatar(username);
      }

      return {
        userId: String(itemId),
        username,
        value: item[sortField] || 0,
        level: getLevelForXP(item.totalXP || 0).level,
        rank: index + 1,
        isCurrentUser,
        photoUrl,
      };
    });
  } catch (error) {
    console.error('[Leaderboard Service Error]:', error);
    return [];
  }
};