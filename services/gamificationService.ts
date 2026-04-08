// services/gamificationService.ts
import api from '../api';

export interface GamificationSyncDTO {
  totalXP: number;
  currentStreak: number;
  longestStreak: number;
  totalEventsRead: number;
  dailyGoalsCompleted: number;
  lastActiveDate: string | null;
  gamificationData: string | null; // JSON blob — opaque for backend
}

/**
 * GET /api/v1/gamification
 * Server is source of truth at login / user switch.
 */
export async function fetchGamification(): Promise<GamificationSyncDTO> {
  const res = await api.get('/gamification');
  return res.data;
}

/**
 * PUT /api/v1/gamification
 * Sync local state → server. Called every 5 min during active session.
 */
export async function syncGamification(dto: GamificationSyncDTO): Promise<void> {
  await api.put('/gamification', dto);
}