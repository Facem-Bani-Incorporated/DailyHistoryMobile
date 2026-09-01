// utils/Notifications.ts
import * as Notifications from 'expo-notifications';
import { SchedulableTriggerInputTypes } from 'expo-notifications';
import { Platform } from 'react-native';

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

// ── Notification payloads must stay small ────────────────────────────────────
// Everything in `content.data` is parcelled and handed to NotificationsService
// over Binder. A full event carries narratives in five languages plus a gallery;
// a day of them measured ~272 KB, and seven scheduled days pushed one broadcast
// to 600 KB. Android cannot deliver a parcel that size, and its response is not
// an exception the app can catch — ActivityManager kills the process with
// "Can't deliver broadcast", then restarts it to retry, forever.
//
// So the notification carries a bounded excerpt plus the id. Anything that needs
// the whole story looks it up by id from the day's content, which the home screen
// fetches anyway.
const NOTIF_NARRATIVE_BUDGET = 1200;

function slimEventForNotification(event: any): any {
  if (!event || typeof event !== 'object') return event;
  const narratives: Record<string, string> = {};
  for (const [lang, text] of Object.entries(event.narrativeTranslations ?? {})) {
    if (typeof text === 'string') narratives[lang] = text.slice(0, NOTIF_NARRATIVE_BUDGET);
  }
  return {
    id: event.id,
    eventDate: event.eventDate,
    category: event.category,
    isPro: event.isPro,
    titleTranslations: event.titleTranslations ?? {},
    narrativeTranslations: narratives,
    // One image is all the story header shows; the rest is dead weight in a parcel.
    gallery: Array.isArray(event.gallery) ? event.gallery.slice(0, 1) : [],
    imageUrl: event.imageUrl,
  };
}

// ── Schedule a single notification at a specific Date ──
async function scheduleAt(date: Date, title: string, body: string, eventData?: any) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: 'default',
      data: eventData ? { event: slimEventForNotification(eventData) } : {},
    },
    trigger: {
      type: SchedulableTriggerInputTypes.DATE,
      date,
      ...(Platform.OS === 'android' ? { channelId: 'daily-history' } : {}),
    },
  });
}

// ── Schedule a notification at a specific time tomorrow (legacy single-shot) ──
export async function scheduleDailyNotification(
  title: string,
  body: string,
  hour: number = 9,
  minute: number = 0,
  eventData?: any,
) {
  try {
    const trigger = new Date();
    trigger.setDate(trigger.getDate() + 1);
    trigger.setHours(hour, minute, 0, 0);
    await scheduleAt(trigger, title, body, eventData);
  } catch (e) {
    if (__DEV__) console.warn('[Notifications] Failed to schedule:', e);
  }
}

// ── Schedule a notification carrying an arbitrary data payload ──
async function scheduleTagged(date: Date, title: string, body: string, data: Record<string, any>) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: 'default',
      data,
    },
    trigger: {
      type: SchedulableTriggerInputTypes.DATE,
      date,
      ...(Platform.OS === 'android' ? { channelId: 'daily-history' } : {}),
    },
  });
}

/** Same yyyy-mm-dd convention the rest of the app uses for content day keys. */
const todayKey = () => new Date().toISOString().split('T')[0];
const yesterdayKey = () =>
  new Date(Date.now() - 86400000).toISOString().split('T')[0];

/**
 * Read the streak state without importing the store at module load — the store
 * pulls in api/auth, and this file is imported from the notification handler.
 *
 * `streak` is the *effective* streak (same rule as getStreakInfo): a run that was
 * already broken counts as 0, so we never threaten someone with days they've lost.
 */
function readStreakState(): { streak: number; activeToday: boolean } {
  try {
    const { useGamificationStore } = require('../store/useGamificationStore');
    const s = useGamificationStore.getState();
    const last = s.lastActiveDate;
    const alive = last === todayKey() || last === yesterdayKey();
    return {
      streak: alive ? (s.currentStreak ?? 0) : 0,
      activeToday: last === todayKey(),
    };
  } catch {
    return { streak: 0, activeToday: false };
  }
}

// ── Schedule the next N days of hooks at local time, each with its own event ──
// `eventsByDate` maps ISO yyyy-mm-dd → events array for that day; include TODAY so
// the slots still ahead of us today (noon quiz, 9 PM streak) are not skipped.
// Each day gets: 09:00 story · 12:00 daily quiz · 21:00 streak reminder, plus the
// Monday 10:00 weekly recap. Re-call on every app open to refresh the queue.
export async function scheduleDailyForDays(
  eventsByDate: Record<string, any[]>,
  language: string,
  hour: number = DAILY_STORY_HOUR,
  minute: number = 0,
) {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    const now = Date.now();
    const today = todayKey();
    const { streak, activeToday } = readStreakState();

    for (const iso of Object.keys(eventsByDate).sort()) {
      const [y, m, d] = iso.split('-').map(Number);
      // Local-time Date constructor — respects device timezone automatically.
      const fireAt = new Date(y, m - 1, d, hour, minute, 0, 0);
      if (fireAt.getTime() > now) {
        const { title, body, event } = buildPersonalizedNotification(
          eventsByDate[iso] ?? [],
          language,
        );
        await scheduleAt(fireAt, title, body, event);
      }

      // ── Weekly recap — Monday morning, after the 9 AM event so the two
      // don't arrive in the same minute. Carries weeklyRecap so the tap opens
      // the recap sheet (which pays the coin bonus).
      const monday = new Date(y, m - 1, d, WEEKLY_RECAP_HOUR, 0, 0, 0);
      if (monday.getDay() === 1 && monday.getTime() > now) {
        const r = buildWeeklyRecapNotification(language);
        await scheduleTagged(monday, r.title, r.body, { weeklyRecap: true });
      }

      // ── Daily Challenge reminder at noon — separate hook from the 9 AM event ──
      const challengeAt = new Date(y, m - 1, d, DAILY_CHALLENGE_HOUR, 0, 0, 0);
      if (challengeAt.getTime() > now) {
        const c = buildDailyChallengeNotification(language);
        await scheduleTagged(challengeAt, c.title, c.body, { dailyChallenge: true });
      }

      // ── Streak reminder at 9 PM — last call before the day rolls over.
      // Skipped for today when the streak is already secured (opening the app
      // counts), so nobody is nagged about a streak they already kept.
      const streakAt = new Date(y, m - 1, d, STREAK_REMINDER_HOUR, 0, 0, 0);
      const alreadySafe = iso === today && activeToday;
      if (streakAt.getTime() > now && !alreadySafe) {
        // `streak` is the run that would be lost if they don't open the app — the
        // reminder fires *before* any activity that day, so the number doesn't grow
        // with distance. Every app open reschedules the queue with fresh numbers.
        const s = buildStreakReminderNotification(language, streak);
        await scheduleTagged(streakAt, s.title, s.body, { streakReminder: true, iso });
      }
    }
  } catch (e) {
    if (__DEV__) console.warn('[Notifications] Failed to schedule week:', e);
  }
}

/**
 * Drop today's 9 PM streak reminder — call it the moment the streak is secured
 * (the app open itself does that) so the evening nag never lands unearned.
 */
export async function cancelStreakReminderForToday() {
  try {
    const today = todayKey();
    const pending = await Notifications.getAllScheduledNotificationsAsync();
    for (const n of pending) {
      const data = n.content?.data as any;
      if (data?.streakReminder && data?.iso === today) {
        await Notifications.cancelScheduledNotificationAsync(n.identifier);
      }
    }
  } catch (e) {
    if (__DEV__) console.warn('[Notifications] Failed to cancel streak reminder:', e);
  }
}

// ══════════════════════════════════════════════════════════════
// THE THREE DAILY SLOTS
//   09:00 — today's new story
//   12:00 — daily quiz / challenge
//   21:00 — streak reminder (skipped once the streak is safe)
// Monday 10:00 carries the weekly recap on top of the 09:00 story.
// ══════════════════════════════════════════════════════════════

export const DAILY_STORY_HOUR = 9;

// ── Weekly recap — Monday 10:00, one hour after the daily event push ──
export const WEEKLY_RECAP_HOUR = 10;

const WEEKLY_RECAP_TEXT: Record<string, { title: string; body: string }> = {
  en: { title: '📊 Your week in history', body: 'See what you read last week — and collect 2 coins for opening it.' },
  ro: { title: '📊 Săptămâna ta în istorie', body: 'Vezi ce ai citit săptămâna trecută — și iei 2 monede că-l deschizi.' },
  es: { title: '📊 Tu semana en la historia', body: 'Mira lo que leíste la semana pasada y gana 2 monedas por abrirlo.' },
  fr: { title: '📊 Votre semaine en histoire', body: 'Découvrez vos lectures de la semaine — et gagnez 2 pièces.' },
  de: { title: '📊 Deine Woche in der Geschichte', body: 'Sieh, was du letzte Woche gelesen hast — und hol dir 2 Münzen.' },
};

export function buildWeeklyRecapNotification(language: string): { title: string; body: string } {
  return WEEKLY_RECAP_TEXT[language] ?? WEEKLY_RECAP_TEXT.en;
}

// ── Daily Challenge (bonus quiz) — fires at noon, links to the challenge quiz ──
export const DAILY_CHALLENGE_HOUR = 12;

// The wheel rides along with this one rather than getting a notification of its own.
// A second daily push is the fastest way to get switched off entirely, and both things
// live on the same screen anyway — one trip covers them.
const DAILY_CHALLENGE_TEXT: Record<string, { title: string; body: string }> = {
  en: { title: '🎡 Your turn is waiting', body: 'Spin today\'s wheel, then ace the daily quiz for 1000 XP. Both reset at midnight.' },
  ro: { title: '🎡 Ai o rotire neatinsă', body: 'Învârte roata de azi, apoi ia quiz-ul zilnic pentru 1000 XP. Se resetează amândouă la miezul nopții.' },
  es: { title: '🎡 Tu giro te espera', body: 'Gira la ruleta de hoy y luego acierta el reto diario por 1000 XP. Ambos se reinician a medianoche.' },
  fr: { title: '🎡 Votre tour vous attend', body: 'Faites tourner la roue du jour, puis réussissez le quiz quotidien pour 1000 XP. Tout se remet à zéro à minuit.' },
  de: { title: '🎡 Deine Drehung wartet', body: 'Dreh das Rad des Tages und meistere dann das Tagesquiz für 1000 XP. Beides endet um Mitternacht.' },
};

export function buildDailyChallengeNotification(language: string): { title: string; body: string } {
  return DAILY_CHALLENGE_TEXT[language] ?? DAILY_CHALLENGE_TEXT.en;
}

// ── Streak reminder — fires at 9 PM so there's still time to save the day ──
export const STREAK_REMINDER_HOUR = 21;

type StreakText = {
  /** User already has a running streak worth losing. */
  keep: (days: number) => { title: string; body: string };
  /** No streak yet — invite them to start one instead of threatening a loss. */
  start: { title: string; body: string };
};

const STREAK_REMINDER_TEXT: Record<string, StreakText> = {
  en: {
    keep: (n) => ({
      title: `🔥 Your ${n}-day streak ends at midnight`,
      body: 'One story is all it takes to keep it alive. Two minutes, tops.',
    }),
    start: {
      title: '🔥 Start your streak tonight',
      body: "Read one story before midnight and day 1 is yours.",
    },
  },
  ro: {
    keep: (n) => ({
      title: `🔥 Seria ta de ${n} zile se pierde la miezul nopții`,
      body: 'O singură poveste și rămâne intactă. Două minute, maximum.',
    }),
    start: {
      title: '🔥 Începe-ți seria în seara asta',
      body: 'Citește o poveste până la miezul nopții și ziua 1 e a ta.',
    },
  },
  es: {
    keep: (n) => ({
      title: `🔥 Tu racha de ${n} días termina a medianoche`,
      body: 'Con una sola historia la mantienes viva. Dos minutos, como mucho.',
    }),
    start: {
      title: '🔥 Empieza tu racha esta noche',
      body: 'Lee una historia antes de medianoche y el día 1 es tuyo.',
    },
  },
  fr: {
    keep: (n) => ({
      title: `🔥 Votre série de ${n} jours s'arrête à minuit`,
      body: 'Une seule histoire suffit à la sauver. Deux minutes, pas plus.',
    }),
    start: {
      title: '🔥 Lancez votre série ce soir',
      body: 'Lisez une histoire avant minuit et le jour 1 est à vous.',
    },
  },
  de: {
    keep: (n) => ({
      title: `🔥 Deine ${n}-Tage-Serie endet um Mitternacht`,
      body: 'Eine Geschichte genügt, um sie zu retten. Höchstens zwei Minuten.',
    }),
    start: {
      title: '🔥 Starte heute Abend deine Serie',
      body: 'Lies eine Geschichte vor Mitternacht und Tag 1 gehört dir.',
    },
  },
};

export function buildStreakReminderNotification(
  language: string,
  streakDays: number,
): { title: string; body: string } {
  const text = STREAK_REMINDER_TEXT[language] ?? STREAK_REMINDER_TEXT.en;
  return streakDays > 0 ? text.keep(streakDays) : text.start;
}

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
    en: { title: 'Daily History', body: 'A new historical event awaits you!' },
    ro: { title: 'Daily History', body: 'Un nou eveniment istoric te așteaptă!' },
    es: { title: 'Daily History', body: '¡Un nuevo evento histórico te espera!' },
    fr: { title: 'Daily History', body: 'Un nouvel événement historique vous attend!' },
    de: { title: 'Daily History', body: 'Ein neues historisches Ereignis wartet auf dich!' },
  };

  const fallback = fallbacks[language] ?? fallbacks.en;

  if (!events || events.length === 0) return { ...fallback, event: null };

  // Match home screen's "main event" rule: only FREE events, sorted by impactScore,
  // pick the first one. Never surface a PRO event in notifications.
  const freeEvents = events.filter((e: any) => !e.isPro);
  if (freeEvents.length === 0) return { ...fallback, event: null };

  const bestEvent = [...freeEvents].sort(
    (a: any, b: any) => (b.impactScore ?? 0) - (a.impactScore ?? 0),
  )[0];

  if (!bestEvent) return { ...fallback, event: null };

  // ── Prefer the TikTok-style hook generated by the pipeline and stored in the DB ──
  // (notificationTitleTranslations / notificationBodyTranslations, per language). Only
  // when it's missing/blank do we fall back to the client-side templates below.
  const dbTitle = (
    bestEvent.notificationTitleTranslations?.[language] ??
    bestEvent.notificationTitleTranslations?.en ??
    ''
  ).trim();
  const dbBody = (
    bestEvent.notificationBodyTranslations?.[language] ??
    bestEvent.notificationBodyTranslations?.en ??
    ''
  ).trim();
  if (dbTitle && dbBody) {
    return { title: dbTitle, body: truncateBody(dbBody), event: bestEvent };
  }

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

  const title = template.title(year, emoji, shortTitle).trim();
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
      data: event ? { event: slimEventForNotification(event) } : {},
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

function getCategoryEmoji(_category?: string): string {
  return '';
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