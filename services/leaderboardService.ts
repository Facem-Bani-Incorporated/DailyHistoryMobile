import api from '../api';
import { useAuthStore } from '../store/useAuthStore';

export type LeaderboardType = 'xp' | 'streak' | 'stories' | 'goals';

export interface LeaderboardEntry {
  userId: string;
  username: string;
  value: number;
  level: number;
  rank: number;
  isCurrentUser: boolean;
  photoUrl?: string;
}

export const fetchLeaderboard = async (type: LeaderboardType): Promise<LeaderboardEntry[]> => {
  try {
    const user = useAuthStore.getState().user;
    // Luăm ID-ul tău pentru a te marca în listă cu "Tu" / Highlighting
    const myId = user?.id || (user as any)?._id || (user as any)?.userId;

    // Apelează ruta nouă din Spring Boot care returnează List<LeaderboardEntryDTO>
    const response = await api.get('/gamification/all');
    
    if (!response.data || !Array.isArray(response.data)) {
        return [];
    }

    // Aceste chei trebuie să se potrivească EXACT cu variabilele din LeaderboardEntryDTO (Java)
    const fieldMap: Record<LeaderboardType, string> = {
      xp: 'totalXP',
      streak: 'currentStreak',
      stories: 'totalEventsRead',
      goals: 'dailyGoalsCompleted'
    };

    const sortField = fieldMap[type];

    // My own photo from auth store (always available for the current user)
    const myPhotoUrl = (user as any)?.avatar_url || (user as any)?.avatarUrl || (user as any)?.picture || undefined;

    // Generates a nice avatar image from the username — same trick as ProfileAvatar.tsx
    const generatedAvatar = (name: string) =>
      `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=ffd700&color=000&bold=true&size=128`;

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
        level: Math.floor((item.totalXP || 0) / 100) + 1,
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