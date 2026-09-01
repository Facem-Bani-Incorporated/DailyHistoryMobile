// utils/crashReporter.ts
// A JS error is fatal in a release build: React Native hands it to the default
// global handler, which tells native to close the app. There is no red box and
// no logcat on a store install, so all the user sees is the app dropping them
// back to the launcher, and we learn nothing about why.
//
// This module keeps the error in JS instead. It records the last crash, tells
// whoever is listening (AppErrorBoundary), and forwards it to PostHog — which
// is plain fetch, no native module, so it still reports after the tree is down.
//
// Pure JS on purpose: it ships to already-installed binaries over `eas update`.
import * as analytics from '../src/analytics/posthog';

export interface CrashInfo {
  message: string;
  stack: string;
  /** 'render' — caught by the error boundary. 'global' — a timer, promise or
   *  native callback, which no boundary can see. */
  source: 'render' | 'global';
  at: number;
}

let lastCrash: CrashInfo | null = null;
let installed = false;
const listeners = new Set<(c: CrashInfo) => void>();

export const getLastCrash = (): CrashInfo | null => lastCrash;

export function subscribeToCrash(cb: (c: CrashInfo) => void): () => void {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}

export function reportCrash(
  error: unknown,
  source: CrashInfo['source'],
  extra?: Record<string, any>,
): void {
  const err = error as any;
  const info: CrashInfo = {
    message: String(err?.message ?? err ?? 'Unknown error'),
    stack: String(err?.stack ?? ''),
    source,
    at: Date.now(),
  };
  lastCrash = info;

  // capture() is fire-and-forget and documented never to throw, so it is safe
  // to call from inside crash handling.
  analytics.capture('js_fatal', {
    source,
    message: info.message.slice(0, 300),
    // Hermes stacks are long and the answer is always in the top frames.
    stack: info.stack.split('\n').slice(0, 12).join('\n'),
    ...extra,
  });

  listeners.forEach(cb => { try { cb(info); } catch { } });
}

/** Replace RN's fatal handler so an error outside React renders a screen instead
 *  of terminating the process. Idempotent. */
export function installGlobalErrorHandler(): void {
  if (installed) return;
  const ErrorUtils = (global as any).ErrorUtils;
  if (!ErrorUtils?.setGlobalHandler) return;
  installed = true;

  const previous = ErrorUtils.getGlobalHandler?.();
  ErrorUtils.setGlobalHandler((error: any, isFatal?: boolean) => {
    try { reportCrash(error, 'global', { is_fatal: !!isFatal }); } catch { }
    // In development the previous handler is what draws the red box, so keep it.
    // In release it is what kills the app, which is the whole point of this file.
    if (__DEV__ && typeof previous === 'function') previous(error, isFatal);
  });
}
