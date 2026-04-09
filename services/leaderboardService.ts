// services/leaderboardService.ts
import api from '../api';

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  avatar?: string;
  value: number;
  level: number;
  isCurrentUser: boolean;
}

export type LeaderboardType = 'xp' | 'streak' | 'stories' | 'goals';

/**
 * Fetch leaderboard from backend.
 * Falls back to mock data if endpoint doesn't exist yet.
 */
export async function fetchLeaderboard(type: LeaderboardType): Promise<LeaderboardEntry[]> {
  try {
    const res = await api.get(`/gamification/leaderboard`, { params: { type } });
    return res.data;
  } catch {
    // Backend endpoint not ready yet — return mock data
    return generateMockLeaderboard(type);
  }
}

function generateMockLeaderboard(type: LeaderboardType): LeaderboardEntry[] {
  const names = [
    'Alexander', 'Cleopatra', 'Leonardo', 'Napoleon', 'Victoria',
    'Caesar', 'Athena', 'Marco', 'Eleanor', 'Galileo',
    'Aristotle', 'Isabella', 'Confucius', 'Nefertiti', 'Socrates',
  ];

  const values: Record<LeaderboardType, number[]> = {
    xp: [12500, 9800, 7200, 5400, 4100, 3200, 2800, 2100, 1600, 1200, 900, 650, 400, 250, 100],
    streak: [42, 31, 28, 21, 17, 14, 12, 9, 7, 6, 5, 4, 3, 2, 1],
    stories: [320, 245, 190, 150, 120, 95, 78, 60, 45, 35, 28, 20, 14, 8, 3],
    goals: [85, 62, 48, 35, 28, 22, 18, 14, 10, 8, 6, 4, 3, 2, 1],
  };

  return names.map((name, i) => ({
    rank: i + 1,
    userId: `mock-${i}`,
    username: name,
    value: values[type][i] ?? 0,
    level: Math.max(1, Math.floor(values.xp[i] / 500)),
    isCurrentUser: i === 7, // Mock: current user is #8
  }));
}