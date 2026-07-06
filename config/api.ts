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

  // Quiz — all paths relative to /quizzes/event/{eventId}
  QUIZ_EVENT: '/quizzes/event',  // base: /{id}?lang=, /{id}/status, /{id}/submit

  // Friends — see friendsService.ts. Dynamic paths:
  //   accept/decline: /friends/requests/{friendshipId}/accept|decline
  //   remove:         /friends/{userId}
  FRIENDS:             '/friends',
  FRIENDS_REQUESTS:    '/friends/requests',
  FRIENDS_INCOMING:    '/friends/requests/incoming',
  FRIENDS_OUTGOING:    '/friends/requests/outgoing',
  FRIENDS_LEADERBOARD: '/friends/leaderboard',

  // Support
  SUPPORT:       '/support',
} as const;

// Endpoints that should NOT receive the Authorization header.
// Centralised so the axios interceptor and any future caller stay in sync.
export const PUBLIC_ENDPOINT_MARKERS = ['/auth', '/guest'] as const;
