// src/analytics/firebase.ts — the Firebase Analytics half of the pipe.
//
// Every event the app already sends to PostHog is mirrored here, from inside
// `capture()` in posthog.ts. Nothing calls this file directly, and no call site
// needed changing to switch it on.
//
// Why both. PostHog answers "what did this person do, in what order" and is where
// funnels get built. Firebase answers "how many of Monday's installs came back on
// Thursday", for free, without a query, and it is the only one of the two that
// feeds Google Play's retention reporting and AdMob's audience signals. They are
// not redundant, and the cost of the second one is this file.
//
// The native SDK is already in the binary: `RNFBAnalytics (24.0.0)` is in
// ios/Podfile.lock and Android autolinks it, because `@react-native-firebase/analytics`
// has been a dependency since before the 1.4.0 build. It had simply never been
// called. That is what makes this shippable over `eas update` rather than a store
// release — but it also means the module can be MISSING on an older binary, so
// every access below is lazy and guarded, and a failure here is silent.
//
// Firebase's naming rules are strict and it drops what it does not like without
// telling you: event and parameter names must be <=40 characters, alphanumeric plus
// underscore, starting with a letter, and the `firebase_`, `google_` and `ga_`
// prefixes are reserved. String values are truncated at 100 characters and only 25
// parameters survive per event. Our own names are already snake_case, but the
// sanitising below is what stops a future `capture('some-event', ...)` from
// vanishing into a console nobody is watching.

type FirebaseAnalytics = {
  logEvent: (name: string, params?: Record<string, any>) => Promise<void>;
  setUserId: (id: string | null) => Promise<void>;
  setUserProperty: (name: string, value: string | null) => Promise<void>;
};

let resolved = false;
let mod: FirebaseAnalytics | null = null;

/** Load the native module once, lazily, and never let its absence throw.
 *
 *  Required lazily rather than imported: a static import runs at module load, which
 *  on a binary without the native module takes the whole JS bundle down before the
 *  error boundary exists. */
function analytics(): FirebaseAnalytics | null {
  if (resolved) return mod;
  resolved = true;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const m = require('@react-native-firebase/analytics');
    const factory = m?.default ?? m;
    mod = typeof factory === 'function' ? factory() : null;
  } catch {
    mod = null;
  }
  return mod;
}

const RESERVED = /^(firebase_|google_|ga_)/i;

/** Coerce a name into something Firebase will actually record. Returns '' when it
 *  cannot be salvaged, and the caller then drops the event rather than sending one
 *  that will be silently discarded on the other end. */
function safeName(raw: string): string {
  let n = String(raw ?? '')
    .trim()
    .replace(/[^A-Za-z0-9_]/g, '_')
    .replace(/_{2,}/g, '_')
    .slice(0, 40);
  // PostHog's `$identify` and friends start with a symbol, which becomes a leading
  // underscore here; Firebase needs a letter.
  if (!/^[A-Za-z]/.test(n)) n = n.replace(/^_+/, '');
  if (!n || RESERVED.test(n)) return '';
  return n;
}

const MAX_PARAMS = 25;
const MAX_STRING = 100;

function safeParams(props?: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  if (!props) return out;
  let n = 0;
  for (const [rawKey, rawValue] of Object.entries(props)) {
    if (n >= MAX_PARAMS) break;
    if (rawValue === null || rawValue === undefined) continue;
    const key = safeName(rawKey);
    if (!key) continue;

    let value: string | number;
    if (typeof rawValue === 'number') {
      value = Number.isFinite(rawValue) ? rawValue : 0;
    } else if (typeof rawValue === 'boolean') {
      // Firebase has no boolean parameter type, and 0/1 stays usable in BigQuery.
      value = rawValue ? 1 : 0;
    } else if (typeof rawValue === 'object') {
      // Nested objects are dropped by Firebase. A short JSON string is at least
      // readable in the console, and the full shape is still in PostHog.
      try {
        value = JSON.stringify(rawValue).slice(0, MAX_STRING);
      } catch {
        continue;
      }
    } else {
      value = String(rawValue).slice(0, MAX_STRING);
    }
    out[key] = value;
    n += 1;
  }
  return out;
}

/** Mirror one event. Fire and forget: never awaited, never throws, never logs. */
export function mirrorEvent(event: string, properties?: Record<string, any>): void {
  try {
    const a = analytics();
    if (!a) return;
    const name = safeName(event);
    if (!name) return;
    void a.logEvent(name, safeParams(properties)).catch(() => {});
  } catch {
    // analytics must never take the app down
  }
}

/** Join this device to the backend user id, so Firebase and PostHog agree on who
 *  a person is. Called from identify() alongside the PostHog alias. */
export function mirrorIdentify(userId: string | number): void {
  try {
    const a = analytics();
    if (!a || !userId) return;
    void a.setUserId(String(userId)).catch(() => {});
  } catch {
    // ignore
  }
}

/** User properties are how Firebase segments a retention curve, which is the whole
 *  reason for wiring it: "returning users, but only the ones who granted push". */
export function mirrorUserProperty(name: string, value: string | number | boolean | null): void {
  try {
    const a = analytics();
    if (!a) return;
    const key = safeName(name);
    if (!key) return;
    const v = value === null ? null : String(value).slice(0, MAX_STRING);
    void a.setUserProperty(key, v).catch(() => {});
  } catch {
    // ignore
  }
}
