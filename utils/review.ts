// utils/review.ts — one-shot native store review prompt (Apple SKStoreReview / Google In-App Review)
//
// Apple & Google forbid custom rating gates and don't tell us whether the user
// actually left a review. The only compliant approach is: ask the OS to show its
// native prompt once, then never ask again. We persist a flag so a user who has
// already been prompted (and, we assume, reviewed or dismissed) is never bothered.
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as StoreReview from 'expo-store-review';

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
