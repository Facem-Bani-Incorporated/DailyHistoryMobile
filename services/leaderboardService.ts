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

    // Sortăm descrescător în funcție de tab-ul selectat
    const sorted = [...response.data].sort((a, b) => (b[sortField] || 0) - (a[sortField] || 0));

    // Mapăm pe formatul cerut de interfață
    return sorted.map((item: any, index: number) => {
      const itemId = item.userId; 
      const username = item.username || 'Utilizator';

      return {
        userId: String(itemId),
        username: username,
        value: item[sortField] || 0,
        level: Math.floor((item.totalXP || 0) / 100) + 1,
        rank: index + 1,
        isCurrentUser: String(itemId) === String(myId)
      };
    });
  } catch (error) {
    console.error('[Leaderboard Service Error]:', error);
    return [];
  }
};