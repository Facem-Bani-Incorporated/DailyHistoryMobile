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

// ── Schedule a notification at a specific time ──
export async function scheduleDailyNotification(
  title: string,
  body: string,
  hour: number = 9,
  minute: number = 0,
  eventData?: any,
) {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();

    const trigger = new Date();
    trigger.setDate(trigger.getDate() + 1);
    trigger.setHours(hour, minute, 0, 0);

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: 'default',
        data: eventData ? { event: eventData } : {},
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

// ── Backward compat alias ──
export const scheduleMidnightNotification = (title: string, body: string) =>
  scheduleDailyNotification(title, body, 9, 0);

// ══════════════════════════════════════════════════════════════
// HOOK-STYLE ENGAGING NOTIFICATION BUILDER
// ══════════════════════════════════════════════════════════════

type HookTemplate = {
  title: (year: string, emoji: string, shortTitle: string) => string;
  body: (year: string, narrative: string, shortTitle: string) => string;
};

const HOOK_TEMPLATES_EN: HookTemplate[] = [
  {
    title: (y, e, t) => `${e} ${y}: The day everything changed`,
    body: (y, n, t) => n || `${t} — tap to discover what happened.`,
  },
  {
    title: (y, e, t) => `${e} Did you know this happened in ${y}?`,
    body: (y, n, t) => n || `${t} — a story you won't forget.`,
  },
  {
    title: (y, e, t) => `${e} On this day in ${y}...`,
    body: (y, n, t) => n || `${t} — history's wildest moments.`,
  },
  {
    title: (y, e, t) => `${e} ${y} called. It left you a story.`,
    body: (y, n, t) => n || `${t} — open to find out.`,
  },
  {
    title: (y, e, t) => `${e} History is crazier than fiction`,
    body: (y, n, t) => `${y}: ${n || t}`,
  },
  {
    title: (y, e, t) => `${e} You won't believe what happened in ${y}`,
    body: (y, n, t) => n || `${t} — the story behind the date.`,
  },
  {
    title: (y, e, t) => `${e} Plot twist from ${y}`,
    body: (y, n, t) => n || `${t} — truth is stranger than fiction.`,
  },
  {
    title: (y, e, t) => `${e} Today in history: a moment that shaped the world`,
    body: (y, n, t) => `${y} — ${n || t}`,
  },
];

const HOOK_TEMPLATES_RO: HookTemplate[] = [
  {
    title: (y, e, t) => `${e} ${y}: Ziua în care totul s-a schimbat`,
    body: (y, n, t) => n || `${t} — descoperă ce s-a întâmplat.`,
  },
  {
    title: (y, e, t) => `${e} Știai că asta s-a întâmplat în ${y}?`,
    body: (y, n, t) => n || `${t} — o poveste pe care n-o vei uita.`,
  },
  {
    title: (y, e, t) => `${e} În această zi din ${y}...`,
    body: (y, n, t) => n || `${t} — momentele cele mai nebune din istorie.`,
  },
  {
    title: (y, e, t) => `${e} Anul ${y} te-a sunat. Ți-a lăsat o poveste.`,
    body: (y, n, t) => n || `${t} — deschide să afli.`,
  },
  {
    title: (y, e, t) => `${e} Istoria e mai nebună decât ficțiunea`,
    body: (y, n, t) => `${y}: ${n || t}`,
  },
  {
    title: (y, e, t) => `${e} N-o să crezi ce s-a întâmplat în ${y}`,
    body: (y, n, t) => n || `${t} — povestea din spatele datei.`,
  },
  {
    title: (y, e, t) => `${e} Plot twist din ${y}`,
    body: (y, n, t) => n || `${t} — realitatea bate orice film.`,
  },
  {
    title: (y, e, t) => `${e} Azi în istorie: un moment care a schimbat lumea`,
    body: (y, n, t) => `${y} — ${n || t}`,
  },
];

const HOOK_TEMPLATES_ES: HookTemplate[] = [
  {
    title: (y, e, t) => `${e} ${y}: El día que todo cambió`,
    body: (y, n, t) => n || `${t} — descubre qué pasó.`,
  },
  {
    title: (y, e, t) => `${e} ¿Sabías que esto pasó en ${y}?`,
    body: (y, n, t) => n || `${t} — una historia que no olvidarás.`,
  },
  {
    title: (y, e, t) => `${e} En este día de ${y}...`,
    body: (y, n, t) => n || `${t} — los momentos más locos de la historia.`,
  },
  {
    title: (y, e, t) => `${e} El año ${y} te llamó. Te dejó una historia.`,
    body: (y, n, t) => n || `${t} — abre para descubrir.`,
  },
  {
    title: (y, e, t) => `${e} La historia es más loca que la ficción`,
    body: (y, n, t) => `${y}: ${n || t}`,
  },
  {
    title: (y, e, t) => `${e} No creerás lo que pasó en ${y}`,
    body: (y, n, t) => n || `${t} — la historia detrás de la fecha.`,
  },
  {
    title: (y, e, t) => `${e} Giro inesperado de ${y}`,
    body: (y, n, t) => n || `${t} — la realidad supera la ficción.`,
  },
  {
    title: (y, e, t) => `${e} Hoy en la historia: un momento que cambió el mundo`,
    body: (y, n, t) => `${y} — ${n || t}`,
  },
];

const HOOK_TEMPLATES_FR: HookTemplate[] = [
  {
    title: (y, e, t) => `${e} ${y}: Le jour où tout a changé`,
    body: (y, n, t) => n || `${t} — découvrez ce qui s'est passé.`,
  },
  {
    title: (y, e, t) => `${e} Saviez-vous que cela s'est passé en ${y}?`,
    body: (y, n, t) => n || `${t} — une histoire inoubliable.`,
  },
  {
    title: (y, e, t) => `${e} Ce jour-là en ${y}...`,
    body: (y, n, t) => n || `${t} — les moments les plus fous de l'histoire.`,
  },
  {
    title: (y, e, t) => `${e} L'an ${y} vous a appelé. Il vous a laissé une histoire.`,
    body: (y, n, t) => n || `${t} — ouvrez pour découvrir.`,
  },
  {
    title: (y, e, t) => `${e} L'histoire est plus folle que la fiction`,
    body: (y, n, t) => `${y}: ${n || t}`,
  },
  {
    title: (y, e, t) => `${e} Vous n'allez pas croire ce qui s'est passé en ${y}`,
    body: (y, n, t) => n || `${t} — l'histoire derrière la date.`,
  },
  {
    title: (y, e, t) => `${e} Retournement de ${y}`,
    body: (y, n, t) => n || `${t} — la réalité dépasse la fiction.`,
  },
  {
    title: (y, e, t) => `${e} Aujourd'hui dans l'histoire: un moment qui a changé le monde`,
    body: (y, n, t) => `${y} — ${n || t}`,
  },
];

const HOOK_TEMPLATES_DE: HookTemplate[] = [
  {
    title: (y, e, t) => `${e} ${y}: Der Tag, der alles veränderte`,
    body: (y, n, t) => n || `${t} — entdecke, was geschah.`,
  },
  {
    title: (y, e, t) => `${e} Wusstest du, dass das ${y} passiert ist?`,
    body: (y, n, t) => n || `${t} — eine Geschichte, die du nie vergisst.`,
  },
  {
    title: (y, e, t) => `${e} An diesem Tag im Jahr ${y}...`,
    body: (y, n, t) => n || `${t} — die verrücktesten Momente der Geschichte.`,
  },
  {
    title: (y, e, t) => `${e} Das Jahr ${y} hat angerufen. Es hat dir eine Geschichte hinterlassen.`,
    body: (y, n, t) => n || `${t} — öffne, um es herauszufinden.`,
  },
  {
    title: (y, e, t) => `${e} Geschichte ist verrückter als jede Fiktion`,
    body: (y, n, t) => `${y}: ${n || t}`,
  },
  {
    title: (y, e, t) => `${e} Du wirst nicht glauben, was ${y} geschah`,
    body: (y, n, t) => n || `${t} — die Geschichte hinter dem Datum.`,
  },
  {
    title: (y, e, t) => `${e} Plot-Twist aus ${y}`,
    body: (y, n, t) => n || `${t} — die Realität übertrifft jede Fiktion.`,
  },
  {
    title: (y, e, t) => `${e} Heute in der Geschichte: Ein Moment, der die Welt veränderte`,
    body: (y, n, t) => `${y} — ${n || t}`,
  },
];

const HOOK_TEMPLATES: Record<string, HookTemplate[]> = {
  en: HOOK_TEMPLATES_EN,
  ro: HOOK_TEMPLATES_RO,
  es: HOOK_TEMPLATES_ES,
  fr: HOOK_TEMPLATES_FR,
  de: HOOK_TEMPLATES_DE,
};

/** Pick a random template for a given language, seeded by date so it changes daily */
function pickTemplate(language: string): HookTemplate {
  const templates = HOOK_TEMPLATES[language] ?? HOOK_TEMPLATES.en;
  const daySeed = new Date().getDate() + new Date().getMonth() * 31;
  return templates[daySeed % templates.length];
}

/** Truncate body text for notification (iOS ~178 chars, Android ~240) */
function truncateBody(text: string, max = 130): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 1).replace(/\s+\S*$/, '') + '…';
}

// ══════════════════════════════════════════════════════════════
// BUILD NOTIFICATION — engaging, language-aware, category-smart
// ══════════════════════════════════════════════════════════════

export function buildPersonalizedNotification(
  events: any[],
  language: string,
): { title: string; body: string; event: any | null } {
  const fallbacks: Record<string, { title: string; body: string }> = {
    en: { title: '📅 Daily History', body: 'A new historical event awaits you!' },
    ro: { title: '📅 Daily History', body: 'Un nou eveniment istoric te așteaptă!' },
    es: { title: '📅 Daily History', body: '¡Un nuevo evento histórico te espera!' },
    fr: { title: '📅 Daily History', body: 'Un nouvel événement historique vous attend!' },
    de: { title: '📅 Daily History', body: 'Ein neues historisches Ereignis wartet auf dich!' },
  };

  const fallback = fallbacks[language] ?? fallbacks.en;

  if (!events || events.length === 0) return { ...fallback, event: null };

  // ── Pick best event: user's preferred category first, then highest impact ──
  const { categoryCount } = useGamificationStore.getState();
  const sortedPrefs = Object.entries(categoryCount ?? {})
    .sort(([, a], [, b]) => b - a)
    .map(([cat]) => cat);

  let bestEvent: any = null;

  if (sortedPrefs.length > 0) {
    for (const prefCat of sortedPrefs) {
      const match = events.find(
        (e) => (e.category ?? '').toLowerCase().trim() === prefCat,
      );
      if (match) {
        bestEvent = match;
        break;
      }
    }
  }

  if (!bestEvent) {
    bestEvent = [...events].sort(
      (a, b) => (b.impactScore ?? 0) - (a.impactScore ?? 0),
    )[0];
  }

  if (!bestEvent) return { ...fallback, event: null };

  // ── Extract data ──
  const year = extractYearFromEvent(bestEvent);
  const emoji = getCategoryEmoji(bestEvent.category);
  const shortTitle =
    bestEvent.titleTranslations?.[language] ??
    bestEvent.titleTranslations?.en ??
    'Daily History';

  const narrative =
    bestEvent.narrativeTranslations?.[language] ??
    bestEvent.narrativeTranslations?.en ??
    '';

  // ── Pick engaging template for this language ──
  const template = pickTemplate(language);

  const title = template.title(year, emoji, shortTitle);
  const rawBody = template.body(year, narrative, shortTitle);

  return {
    title,
    body: truncateBody(rawBody),
    event: bestEvent,
  };
}

// ── Schedule for tomorrow ──
export async function schedulePersonalizedNotification(
  tomorrowEvents: any[],
  language: string,
) {
  const { title, body, event } = buildPersonalizedNotification(tomorrowEvents, language);
  await scheduleDailyNotification(title, body, 9, 0, event);
}

// ── Fire a test notification NOW (immediately) ──
export async function fireTestNotification(
  events: any[],
  language: string,
) {
  const { title, body, event } = buildPersonalizedNotification(events, language);

  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: 'default',
      data: event ? { event } : {},
      ...(Platform.OS === 'android' && { channelId: 'daily-history' }),
    },
    trigger: null,
  });
}

// ══════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════

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