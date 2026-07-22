// config/posthog.ts — PostHog project credentials.
//
// POSTHOG_API_KEY is the *project* key (phc_...) — write-only and safe to ship
// in the bundle. Never put a personal key (phx_...) here.
//
// The same key is shared with the website: one PostHog project means the
// site → install → play funnel joins on the same person via identify().
// IMPORTANT: the host region must match the project (EU vs US) — a mismatched
// host drops events silently.
export const POSTHOG_API_KEY =
  process.env.EXPO_PUBLIC_POSTHOG_API_KEY ??
  'phc_pSMS9UwJ6WknXf3iMRQ9P83mrELnUNqJeyHXwHGPqHMG';

// Verified against /decide + /array/<key>/config: this project lives in the US
// region (the EU host rejects the key with authentication_failed). The website
// must point at the same host, or one side's events vanish silently.
export const POSTHOG_HOST =
  process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com';
