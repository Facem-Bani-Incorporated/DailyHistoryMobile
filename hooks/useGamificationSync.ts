// hooks/useGamificationSync.ts
import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import type { GamificationSyncDTO } from '../services/gamificationService';
import { fetchGamification, syncGamification } from '../services/gamificationService';
import { useAuthStore } from '../store/useAuthStore';
import { useGamificationStore } from '../store/useGamificationStore';

const SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutes

// ── Resolve user ID — handles id, _id, userId ──
function getUserId(): string | null {
  try {
    const user = useAuthStore.getState().user;
    if (!user) return null;
    return user.id ?? (user as any)._id ?? (user as any).userId ?? null;
  } catch {
    return null;
  }
}

// ── Build DTO payload from Zustand state (exported for logout sync) ──
export function buildSyncPayload(): GamificationSyncDTO {
  const s = useGamificationStore.getState();

  let categoriesArray: string[] = [];
  try {
    categoriesArray = s.categoriesRead instanceof Set
      ? Array.from(s.categoriesRead)
      : Array.isArray(s.categoriesRead)
        ? s.categoriesRead
        : [];
  } catch {
    categoriesArray = [];
  }

  const blob = {
    readEventsToday: s.readEventsToday ?? [],
    readDate: s.readDate ?? null,
    todayXP: s.todayXP ?? 0,
    xpDate: s.xpDate ?? null,
    unlockedAchievements: s.unlockedAchievements ?? [],
    achievementDates: s.achievementDates ?? {},
    newAchievements: s.newAchievements ?? [],
    categoriesRead: categoriesArray,
    categoryCount: s.categoryCount ?? {},
    dailyGoalDates: s.dailyGoalDates ?? [],
    weeklyRecaps: s.weeklyRecaps ?? {},
    currentWeekKey: s.currentWeekKey ?? null,
    calendarLog: s.calendarLog ?? {},
  };

  return {
    totalXP: s.totalXP ?? 0,
    currentStreak: s.currentStreak ?? 0,
    longestStreak: s.longestStreak ?? 0,
    totalEventsRead: s.totalEventsRead ?? 0,
    dailyGoalsCompleted: s.dailyGoalsCompleted ?? 0,
    lastActiveDate: s.lastActiveDate ?? null,
    gamificationData: JSON.stringify(blob),
  };
}

// ── Hydrate Zustand from server DTO ──
function hydrateFromServer(dto: GamificationSyncDTO, userId: string) {
  let blob: any = {};

  if (dto.gamificationData) {
    try {
      blob = typeof dto.gamificationData === 'string'
        ? JSON.parse(dto.gamificationData)
        : dto.gamificationData;
    } catch {
      blob = {};
    }
  }

  try {
    useGamificationStore.setState({
      totalXP: dto.totalXP ?? 0,
      currentStreak: dto.currentStreak ?? 0,
      longestStreak: dto.longestStreak ?? 0,
      totalEventsRead: dto.totalEventsRead ?? 0,
      dailyGoalsCompleted: dto.dailyGoalsCompleted ?? 0,
      lastActiveDate: dto.lastActiveDate ?? null,
      readEventsToday: blob.readEventsToday ?? [],
      readDate: blob.readDate ?? null,
      todayXP: blob.todayXP ?? 0,
      xpDate: blob.xpDate ?? null,
      unlockedAchievements: blob.unlockedAchievements ?? [],
      achievementDates: blob.achievementDates ?? {},
      newAchievements: blob.newAchievements ?? [],
      categoriesRead: new Set(blob.categoriesRead ?? []),
      categoryCount: blob.categoryCount ?? {},
      dailyGoalDates: blob.dailyGoalDates ?? [],
      weeklyRecaps: blob.weeklyRecaps ?? {},
      currentWeekKey: blob.currentWeekKey ?? null,
      calendarLog: blob.calendarLog ?? {},
      _userId: userId,
    });
  } catch (e) {
    console.warn('[GamSync] hydrateFromServer error:', e);
  }
}

// ── Push to server (exported for logout sync) ──
export async function pushToServer(): Promise<boolean> {
  try {
    const token = useAuthStore.getState().token;
    if (!token) return false;

    const payload = buildSyncPayload();
    await syncGamification(payload);
    return true;
  } catch {
    return false;
  }
}

/**
 * Main hook — call once in _layout.tsx (AppContent).
 *
 * 1. On login / user change → GET from server, hydrate local
 * 2. Every 5 min → PUT local → server
 * 3. On app background → immediate sync
 * 4. On logout → sync handled in useAuthStore.logout()
 */
export function useGamificationSync() {
  const user = useAuthStore(s => s.user);
  const token = useAuthStore(s => s.token);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSyncedUserId = useRef<string | null>(null);

  // ── 1. Fetch on login / user switch ──
  useEffect(() => {
    let cancelled = false;
    const userId = getUserId();

    if (!token || !userId) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      lastSyncedUserId.current = null;
      return;
    }

    if (lastSyncedUserId.current === userId) return;
    lastSyncedUserId.current = userId;

    (async () => {
      try {
        const dto = await fetchGamification();
        if (cancelled) return;

        if (dto.gamificationData != null) {
          hydrateFromServer(dto, userId);
        } else {
          useGamificationStore.setState({ _userId: userId });
          await pushToServer();
        }
      } catch {
        if (cancelled) return;
        useGamificationStore.setState({ _userId: userId });
      }

      // ── Always record daily visit after hydrate ──
      if (!cancelled) {
        try { useGamificationStore.getState().recordDailyVisit(); } catch {}
      }
    })();

    // ── 2. Start 5-min interval ──
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(pushToServer, SYNC_INTERVAL);

    return () => {
      cancelled = true;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [token, user]);

  // ── 3. Sync on background ──
  useEffect(() => {
    const userId = getUserId();
    if (!token || !userId) return;

    const handleAppState = (nextState: AppStateStatus) => {
      if (nextState === 'background' || nextState === 'inactive') {
        pushToServer();
      }
    };

    const sub = AppState.addEventListener('change', handleAppState);
    return () => sub.remove();
  }, [token, user]);
}