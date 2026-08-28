// utils/review.ts — one-shot native store review prompt (Apple SKStoreReview / Google In-App Review)
//
// Apple & Google forbid custom rating gates and don't tell us whether the user
// actually left a review. The only compliant approach is: ask the OS to show its
// native prompt once, then never ask again. We persist a flag so a user who has
// already been prompted (and, we assume, reviewed or dismissed) is never bothered.
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as StoreReview from 'expo-store-review';
import { Linking, Platform } from 'react-native';

const SHOWN_KEY = 'review_prompt_shown_v1';

// Guards against two triggers (e.g. map timer + quiz finish) firing at once.
let inFlight = false;

/**
 * Request the native review prompt at most once ever.
 * Safe to call from multiple trigger points — subsequent calls are no-ops.
 */
export async function maybeRequestReview(): Promise<void> {
  try {
    if (inFlight) return;
    inFlight = true;

    const alreadyShown = await AsyncStorage.getItem(SHOWN_KEY);
    if (alreadyShown === 'true') return;

    const available = await StoreReview.isAvailableAsync();
    if (!available) return;

    // Mark as shown BEFORE requesting: even if the OS silently throttles the
    // prompt, we honour "show at most once" and never pester the user again.
    await AsyncStorage.setItem(SHOWN_KEY, 'true');
    await StoreReview.requestReview();
  } catch {
    // Never let a review prompt crash a flow.
  } finally {
    inFlight = false;
  }
}

/** Whether we've already fired the one-shot review prompt. */
export async function hasRequestedReview(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(SHOWN_KEY)) === 'true';
  } catch {
    return false;
  }
}

// ══════════════════════════════════════════════════════════════
// IN-APP ASK — our own modal, which then hands off to the store
//
// The native prompt above can only ever be *asked for*: iOS caps
// SKStoreReviewController at 3 dialogs per 365 days and decides silently
// whether to show anything at all, and Play's In-App Review has its own
// undocumented quota. So it cannot be made to appear "more often".
// What we control is our own modal — and the store page it opens, which
// has no quota. Tuning knobs live here.
// ══════════════════════════════════════════════════════════════

/** Stories the user must finish before we ask the first time. */
export const REVIEW_MIN_STORIES = 3;
/** Days between two asks. */
export const REVIEW_COOLDOWN_DAYS = 4;
/** Hard ceiling on how many times we ever ask. */
export const REVIEW_MAX_ASKS = 5;

const ASK_COUNT_KEY = 'review_ask_count_v1';
const LAST_ASK_KEY = 'review_last_ask_v1';
const DONE_KEY = 'review_done_v1';
const STORIES_KEY = 'review_stories_finished_v1';

const DAY_MS = 86400000;

/** App Store id (eas.json → submit.production.ios.ascAppId) and Play package. */
const IOS_APP_ID = '6768552706';
const ANDROID_PACKAGE = 'com.rexinus.dailyhistorymobile';

/**
 * Count a finished story and report whether this is a good moment to ask.
 * Call once per completed read; the counter is what gates the first ask.
 */
export async function noteStoryFinishedAndCheck(): Promise<boolean> {
  try {
    if ((await AsyncStorage.getItem(DONE_KEY)) === 'true') return false;

    const finished = Number((await AsyncStorage.getItem(STORIES_KEY)) ?? '0') + 1;
    await AsyncStorage.setItem(STORIES_KEY, String(finished));
    if (finished < REVIEW_MIN_STORIES) return false;

    const asks = Number((await AsyncStorage.getItem(ASK_COUNT_KEY)) ?? '0');
    if (asks >= REVIEW_MAX_ASKS) return false;

    const last = Number((await AsyncStorage.getItem(LAST_ASK_KEY)) ?? '0');
    if (last && Date.now() - last < REVIEW_COOLDOWN_DAYS * DAY_MS) return false;

    return true;
  } catch {
    return false;
  }
}

/** Record that the modal was actually put on screen — starts the cooldown. */
export async function noteReviewPromptShown(): Promise<void> {
  try {
    const asks = Number((await AsyncStorage.getItem(ASK_COUNT_KEY)) ?? '0');
    await AsyncStorage.multiSet([
      [ASK_COUNT_KEY, String(asks + 1)],
      [LAST_ASK_KEY, String(Date.now())],
    ]);
  } catch {
    // Never let bookkeeping break a reading flow.
  }
}

/**
 * The user tapped "Rate" — take them straight to the store's review page.
 *
 * We deliberately do NOT route this through StoreReview.requestReview(): neither
 * iOS nor Android reports back whether the native sheet was actually displayed,
 * so once the yearly quota is spent an explicit tap would appear to do nothing.
 * The store page always opens. After an explicit tap we stop asking for good.
 */
export async function openReviewFlow(): Promise<void> {
  try {
    await AsyncStorage.setItem(DONE_KEY, 'true');
  } catch {
    // Losing the flag only costs us one extra ask later — still open the page.
  }
  await openStoreReviewPage();
}

/** Open the store listing straight on its review section. */
export async function openStoreReviewPage(): Promise<void> {
  const [deep, web] =
    Platform.OS === 'ios'
      ? [
          `itms-apps://apps.apple.com/app/id${IOS_APP_ID}?action=write-review`,
          `https://apps.apple.com/app/id${IOS_APP_ID}?action=write-review`,
        ]
      : [
          `market://details?id=${ANDROID_PACKAGE}`,
          `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE}`,
        ];
  try {
    if (await Linking.canOpenURL(deep)) {
      await Linking.openURL(deep);
      return;
    }
  } catch {
    // Store app missing or scheme blocked — fall through to the web listing.
  }
  await Linking.openURL(web).catch(() => {});
}
