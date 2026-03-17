// api.ts
import axios from 'axios';
import { useAuthStore } from './store/useAuthStore';

const api = axios.create({
  baseURL: 'https://daily-history-server-dev-development.up.railway.app/api/v1',
  timeout: 10000,
});

api.interceptors.request.use(async (config) => {
  // Auth endpoints — fără token
  if (config.url?.includes('/auth')) {
    return config;
  }

  // Dacă store-ul nu s-a hidratat încă din AsyncStorage, așteptăm
  if (!useAuthStore.persist.hasHydrated()) {
    await new Promise<void>(resolve => {
      const unsub = useAuthStore.persist.onFinishHydration(() => {
        unsub();
        resolve();
      });
      // Timeout de siguranță — maxim 3 secunde
      setTimeout(resolve, 3000);
    });
  }

  const token = useAuthStore.getState().token;

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    console.log(`[API] 🚀 Trimitere către: ${config.url}`);
  } else {
    console.warn(`[API] ⚠️ No token for: ${config.url}`);
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error(`[API ERROR] ❌ URL: ${error.config?.url} | Status: ${error.response?.status}`);
    return Promise.reject(error);
  }
);

export default api;