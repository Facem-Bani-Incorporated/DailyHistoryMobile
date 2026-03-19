// utils/Notifications.ts
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { useGamificationStore } from '../store/useGamificationStore';

// ── Configure notification handler ──
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// ── Request permissions ──
export async function requestNotificationPermissions(): Promise<boolean> {
  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing === 'granted') return true;
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

// ── Schedule a notification at midnight ──
export async function scheduleMidnightNotification(title: string, body: string) {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();

    const trigger = new Date();
    trigger.setDate(trigger.getDate() + 1);
    trigger.setHours(0, 1, 0, 0); // 00:01 next day

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: 'default',
        ...(Platform.OS === 'android' && {
          channelId: 'daily-history',
        }),
      },
      trigger: { date: trigger } as any,
    });
  } catch (e) {
    if (__DEV__) console.warn('[Notifications] Failed to schedule:', e);
  }
}

// ── Personalized notification based on user's top category ──
// Call this from index.tsx after fetching tomorrow's events
export function buildPersonalizedNotification(
  tomorrowEvents: any[],
  language: string,
): { title: string; body: string } {
  const fallback = {
    title: '📅 Daily History',
    body: 'A new historical event awaits you!',
  };

  if (!tomorrowEvents || tomorrowEvents.length === 0) return fallback;

  // Get user's preferred categories from gamification store
  const { categoryCount } = useGamificationStore.getState();
  const sortedCategories = Object.entries(categoryCount ?? {})
    .sort(([, a], [, b]) => b - a)
    .map(([cat]) => cat);

  // Try to find an event matching user's top categories
  let bestEvent: any = null;

  if (sortedCategories.length > 0) {
    for (const prefCat of sortedCategories) {
      const match = tomorrowEvents.find(
        (e) => (e.category ?? '').toLowerCase().trim() === prefCat
      );
      if (match) {
        bestEvent = match;
        break;
      }
    }
  }

  // Fallback to highest impact event
  if (!bestEvent) {
    bestEvent = [...tomorrowEvents].sort(
      (a, b) => (b.impactScore ?? 0) - (a.impactScore ?? 0)
    )[0];
  }

  if (!bestEvent) return fallback;

  const title =
    bestEvent.titleTranslations?.[language] ??
    bestEvent.titleTranslations?.en ??
    'Daily History';

  const narrative =
    bestEvent.narrativeTranslations?.[language] ??
    bestEvent.narrativeTranslations?.en ??
    '';

  const year = extractYearFromEvent(bestEvent);
  const emoji = getCategoryEmoji(bestEvent.category);

  return {
    title: `${emoji} ${year ? `${year}: ` : ''}${title}`,
    body: narrative.length > 120 ? narrative.slice(0, 117) + '…' : narrative || 'Discover what happened on this day!',
  };
}

// ── Schedule personalized notification for tomorrow ──
export async function schedulePersonalizedNotification(
  tomorrowEvents: any[],
  language: string,
) {
  const { title, body } = buildPersonalizedNotification(tomorrowEvents, language);
  await scheduleMidnightNotification(title, body);
}

// ── Helpers ──
function extractYearFromEvent(event: any): string {
  if (event.year && Number(event.year) > 100) return String(event.year);
  const raw = event.eventDate ?? event.event_date ?? '';
  const s = String(raw).trim();
  const match = s.match(/^(\d{3,4})/);
  return match ? match[1] : '';
}

function getCategoryEmoji(category?: string): string {
  const cat = (category ?? '').toLowerCase().replace(/\s+/g, '_');
  const map: Record<string, string> = {
    war_conflict: '⚔️',
    tech_innovation: '💡',
    science_discovery: '🔬',
    politics_state: '🏛️',
    culture_arts: '🎨',
    natural_disaster: '🌋',
    exploration: '🧭',
    religion_phil: '📿',
  };
  return map[cat] ?? '📅';
}

// ── Android notification channel ──
export async function setupNotificationChannel() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('daily-history', {
      name: 'Daily History',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FFD700',
    });
  }
}