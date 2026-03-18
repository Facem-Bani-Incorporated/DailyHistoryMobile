// api.ts
import axios from 'axios';
import { useAuthStore } from './store/useAuthStore';

const api = axios.create({
  baseURL: 'https://daily-history-server-dev-development.up.railway.app/api/v1',
  timeout: 10000,
});

// ── Request interceptor — attach JWT token ──
api.interceptors.request.use(async (config) => {
  // Auth endpoints — no token needed
  if (config.url?.includes('/auth')) {
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
    if (status === 401 && !url?.includes('/auth')) {
      if (__DEV__) console.log('[API] Token expired — logging out');
      useAuthStore.getState().logout();
    }

    return Promise.reject(error);
  }
);

export default api;