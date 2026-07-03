// utils/dailyChallenge.ts — per-day completion lock for the noon Daily Challenge quiz.
import AsyncStorage from '@react-native-async-storage/async-storage';

export const PERFECT_XP = 1000;   // awarded only for a flawless run
export const PARTIAL_PER = 100;   // XP per correct answer when not perfect

export const todayIso = (): string => new Date().toISOString().split('T')[0];

const doneKey = (iso: string) => `daily_challenge_done_${iso}`;

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
