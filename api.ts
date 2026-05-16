// api.ts
import axios from 'axios';
import { API_BASE_URL, API_TIMEOUT, PUBLIC_ENDPOINT_MARKERS } from './config/api';
import { useAuthStore } from './store/useAuthStore';

const isPublicEndpoint = (url?: string): boolean =>
  !!url && PUBLIC_ENDPOINT_MARKERS.some(marker => url.includes(marker));

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
});

// ── Request interceptor — attach JWT token ──
api.interceptors.request.use(async (config) => {
  // Auth + guest endpoints — no token needed
  if (isPublicEndpoint(config.url)) {
    return config;
  }

  // Wait for store hydration from AsyncStorage
  if (!useAuthStore.persist.hasHydrated()) {
    await new Promise<void>((resolve) => {
      const unsub = useAuthStore.persist.onFinishHydration(() => {
        unsub();
        resolve();
      });
      // Safety timeout — max 3 seconds
      setTimeout(resolve, 3000);
    });
  }

  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    if (__DEV__) console.log(`[API] Request: ${config.url}`);
  } else {
    if (__DEV__) console.warn(`[API] No token for: ${config.url}`);
  }

  return config;
});

// ── Response interceptor — handle 401 (expired/invalid token) ──
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url;

    if (__DEV__) {
      console.error(`[API ERROR] ${url} | Status: ${status}`);
    }

    // If backend returns 401 on a protected route, token is expired/invalid
    // Auto-logout so user gets redirected to login screen cleanly
    const hadToken = !!error.config?.headers?.Authorization;
    if (status === 401 && hadToken && !isPublicEndpoint(url)) {
      if (__DEV__) console.log('[API] Token expired — logging out');
      useAuthStore.getState().logout();
    }

    return Promise.reject(error);
  }
);

export default api;
