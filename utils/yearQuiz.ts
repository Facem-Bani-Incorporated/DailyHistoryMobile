// utils/yearQuiz.ts — per-user, per-day completion lock for the "Guess the Year" quiz,
// plus the deterministic daily story pick. Mirrors utils/dailyChallenge.ts.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '../store/useAuthStore';

export const YEAR_QUIZ_XP = 500;    // awarded only when the year is guessed within 3 tries
export const YEAR_QUIZ_TRIES = 3;

export const todayIso = (): string => new Date().toISOString().split('T')[0];

const getUserId = (): string => {
  try {
    return useAuthStore.getState().user?.id ?? 'guest';
  } catch {
    return 'guest';
  }
};

// Keyed per user so each account gets its own daily quiz on the same device.
const doneKey = (iso: string) => `year_quiz_done_${getUserId()}_${iso}`;

export async function isYearQuizDone(iso: string = todayIso()): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(doneKey(iso))) === 'true';
  } catch {
    return false;
  }
}

export async function markYearQuizDone(iso: string = todayIso()): Promise<void> {
  try {
    await AsyncStorage.setItem(doneKey(iso), 'true');
  } catch {
    // ignore
  }
}

// ── Daily pick ────────────────────────────────────────────────────────────────

export const extractYear = (e: any): number => {
  const r = String(e?.eventDate ?? e?.event_date ?? e?.year ?? '').trim();
  if (/^-?\d{1,4}$/.test(r)) return parseInt(r);
  if (r.includes('-') && r.split('-')[0].length === 4) return parseInt(r.split('-')[0]);
  return 0;
};

/**
 * Deterministically picks today's mystery story from the pool: everyone (and every
 * re-open) gets the same event for a given date. Sorted by title first so the pick
 * is stable even if the pool arrives in a different order.
 */
export function pickDailyEvent(pool: any[], iso: string = todayIso()): any | null {
  const usable = pool.filter(e =>
    extractYear(e) > 0 && (e?.titleTranslations?.en ?? '').length > 0,
  );
  if (usable.length === 0) return null;
  const sorted = [...usable].sort((a, b) =>
    String(a.titleTranslations.en).localeCompare(String(b.titleTranslations.en)),
  );
  let hash = 0;
  for (let i = 0; i < iso.length; i++) hash = iso.charCodeAt(i) + ((hash << 5) - hash);
  return sorted[Math.abs(hash) % sorted.length];
}
