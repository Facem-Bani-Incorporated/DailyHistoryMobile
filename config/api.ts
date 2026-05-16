// config/api.ts
// Central configuration for the Daily History backend.
// All API URLs, endpoints and HTTP defaults live here — do not hardcode them
// in services/components.

export const API_BASE_URL =
  'https://daily-history-server-production.up.railway.app/api/v1';

// Axios request timeout (ms)
export const API_TIMEOUT = 10_000;

export const ENDPOINTS = {
  // Auth
  SIGN_IN:       '/auth/signin',
  REGISTER:      '/auth/register',
  GOOGLE_AUTH:   '/auth/google',
  APPLE_AUTH:    '/auth/apple',

  // User
  ME:            '/users/me',

  // Content
  DAILY_CONTENT: '/daily-content/by-date',
  GUEST_CONTENT: '/daily-content/guest',

  // Gamification
  GAMIFICATION:     '/gamification',
  GAMIFICATION_ALL: '/gamification/all',

  // Support
  SUPPORT:       '/support',
} as const;

// Endpoints that should NOT receive the Authorization header.
// Centralised so the axios interceptor and any future caller stay in sync.
export const PUBLIC_ENDPOINT_MARKERS = ['/auth', '/guest'] as const;
