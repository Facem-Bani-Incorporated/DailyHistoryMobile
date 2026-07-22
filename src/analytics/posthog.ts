// src/analytics/posthog.ts — PostHog over plain fetch, zero native dependencies.
//
// Deliberately NOT posthog-react-native: that package pulls native modules,
// which would require a new store build. This file is pure JS so it ships
// over `eas update` to existing binaries.
//
// Contract:
// - capture() is fire-and-forget: it never throws, never blocks UI.
// - Events queue in memory and flush every 10 events / 30 s / on background.
// - A persistent distinct_id (UUID in AsyncStorage) identifies the device
//   across sessions; identify() links it to the backend user id so web and
//   app sessions join into one person in PostHog.
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { AppState, Platform } from 'react-native';
import { POSTHOG_API_KEY, POSTHOG_HOST } from '../../config/posthog';

const ID_KEY = 'ph_distinct_id';
const FIRST_OPEN_KEY = 'ph_first_open_ts';

const FLUSH_AT = 10;          // queue length that triggers an immediate flush
const FLUSH_INTERVAL_MS = 30_000;
const MAX_QUEUE = 100;        // hard cap so a dead network can't grow memory forever

interface QueuedEvent {
  event: string;
  properties: Record<string, any>;
  timestamp: string;
  /** Snapshotted at capture time. Null means "not known yet" (queued before
   *  init resolved) and gets filled with the live id at flush. Without this,
   *  events captured before identify() would be re-attributed to the user id. */
  distinctId: string | null;
}

// Pure-JS UUID v4 — Math.random is plenty for an analytics id, and it avoids
// any dependency on native crypto being present in the installed binary.
const uuidv4 = (): string =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });

let distinctId: string | null = null;
let firstOpenTs: number | null = null;
let queue: QueuedEvent[] = [];
let flushTimer: ReturnType<typeof setInterval> | null = null;
let initStarted = false;
let firstFlushDone = false;

// ── Diagnostics ────────────────────────────────────────────────────────────
// capture() swallows every error by design, which makes "is this working?"
// unanswerable from a device. This records the outcome of each flush so a
// hidden panel can show it. Cheap: a handful of scalars, no retention.
const diag = {
  sent: 0,
  failed: 0,
  lastStatus: '' as string,
  lastEvent: '' as string,
  lastFlushAt: 0,
};

export function getDiagnostics() {
  return {
    ...diag,
    queued: queue.length,
    distinctId,
    host: POSTHOG_HOST,
    keySet: enabled(),
    keyTail: POSTHOG_API_KEY ? POSTHOG_API_KEY.slice(-6) : '',
  };
}

// Properties stamped onto every event. platform/app_version are static;
// locale/is_pro are pushed in from React via setSuperProps().
const superProps: Record<string, any> = {
  platform: Platform.OS,
  app_version: Constants.expoConfig?.version ?? 'unknown',
};

const enabled = () => POSTHOG_API_KEY.length > 0;

async function flush(): Promise<void> {
  if (!enabled() || queue.length === 0 || !distinctId) return;
  const batch = queue;
  queue = [];
  diag.lastFlushAt = Date.now();
  diag.lastEvent = batch[batch.length - 1].event;
  try {
    const res = await fetch(`${POSTHOG_HOST}/batch/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: POSTHOG_API_KEY,
        batch: batch.map(e => ({
          event: e.event,
          properties: { ...e.properties, distinct_id: e.distinctId ?? distinctId },
          timestamp: e.timestamp,
        })),
        sent_at: new Date().toISOString(),
      }),
    });
    if (res.ok) {
      diag.sent += batch.length;
      diag.lastStatus = 'HTTP ' + res.status;
    } else {
      // 4xx/5xx: PostHog rejected it. Requeueing a rejected payload would loop
      // forever, so record the status and drop the batch.
      diag.failed += batch.length;
      diag.lastStatus = 'HTTP ' + res.status + ' (rejected)';
    }
  } catch (e: any) {
    // Network failed — requeue (bounded) and retry on the next flush.
    diag.failed += batch.length;
    diag.lastStatus = 'ERR ' + String(e?.message ?? e).slice(0, 60);
    queue = [...batch, ...queue].slice(0, MAX_QUEUE);
  }
}

/** Merge extra properties (locale, is_pro, …) into every future event. */
export function setSuperProps(props: Record<string, any>): void {
  Object.assign(superProps, props);
}

/**
 * Queue an event. Safe to call before init() resolves and safe with no API
 * key configured (silent no-op). Never throws.
 */
export function capture(event: string, properties?: Record<string, any>): void {
  try {
    if (!enabled()) return;
    if (queue.length >= MAX_QUEUE) queue.shift();
    queue.push({
      event,
      properties: { ...superProps, ...properties },
      timestamp: new Date().toISOString(),
      distinctId,
    });
    // Send the first event of a session straight away: it confirms the pipeline
    // and means a session still registers if the app is killed within 30s.
    if (!firstFlushDone && distinctId) {
      firstFlushDone = true;
      void flush();
      return;
    }
    if (queue.length >= FLUSH_AT) void flush();
  } catch {
    // analytics must never take the app down
  }
}

/**
 * Link this device to the backend user id — the same id the website passes to
 * identify(), which is what merges the web and app person into one profile.
 */
export function identify(userId: string | number): void {
  try {
    if (!enabled() || !distinctId || !userId) return;
    const newId = String(userId);
    if (newId === distinctId) return; // already identified
    queue.push({
      event: '$identify',
      properties: {
        ...superProps,
        // PostHog aliases the anonymous id onto the identified one.
        $anon_distinct_id: distinctId,
        $set: { platform: superProps.platform, locale: superProps.locale, is_pro: superProps.is_pro },
      },
      timestamp: new Date().toISOString(),
      distinctId: newId,
    });
    distinctId = newId;
    AsyncStorage.setItem(ID_KEY, newId).catch(() => {});
    void flush();
  } catch {
    // ignore
  }
}

/**
 * Idempotent boot: load/create the distinct_id, start the flush loop, hook
 * background flush, and fire app_opened with days_since_install.
 */
export async function init(): Promise<void> {
  if (initStarted) return;
  initStarted = true;
  try {
    if (!enabled()) return;

    const [storedId, storedFirst] = await Promise.all([
      AsyncStorage.getItem(ID_KEY),
      AsyncStorage.getItem(FIRST_OPEN_KEY),
    ]);

    if (storedId) {
      distinctId = storedId;
    } else {
      distinctId = uuidv4();
      AsyncStorage.setItem(ID_KEY, distinctId).catch(() => {});
    }

    if (storedFirst) {
      firstOpenTs = parseInt(storedFirst, 10) || Date.now();
    } else {
      firstOpenTs = Date.now();
      AsyncStorage.setItem(FIRST_OPEN_KEY, String(firstOpenTs)).catch(() => {});
    }

    if (!flushTimer) flushTimer = setInterval(() => void flush(), FLUSH_INTERVAL_MS);
    AppState.addEventListener('change', state => {
      if (state === 'background' || state === 'inactive') void flush();
    });

    capture('app_opened', {
      days_since_install: Math.floor((Date.now() - firstOpenTs) / 86_400_000),
    });
  } catch {
    // never let analytics boot failure affect startup
  }
}
