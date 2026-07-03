// utils/dailyChallenge.ts — per-user, per-day completion lock for the noon Daily Challenge quiz.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '../store/useAuthStore';

export const PERFECT_XP = 1000;   // awarded only for a flawless run
export const PARTIAL_PER = 100;   // XP per correct answer when not perfect

export const todayIso = (): string => new Date().toISOString().split('T')[0];

const getUserId = (): string => {
  try {
    return useAuthStore.getState().user?.id ?? 'guest';
  } catch {
    return 'guest';
  }
};

// Keyed per user so each account gets its own daily challenge on the same device.
const doneKey = (iso: string) => `daily_challenge_done_${getUserId()}_${iso}`;

export async function isDailyChallengeDone(iso: string = todayIso()): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(doneKey(iso))) === 'true';
  } catch {
    return false;
  }
}

export async function markDailyChallengeDone(iso: string = todayIso()): Promise<void> {
  try {
    await AsyncStorage.setItem(doneKey(iso), 'true');
  } catch {
    // ignore
  }
}
