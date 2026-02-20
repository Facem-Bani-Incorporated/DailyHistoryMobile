// api.ts
import axios from 'axios';
import { useAuthStore } from './store/useAuthStore';

const api = axios.create({
  // VERIFICĂ: Acesta este URL-ul corect de Railway? 
  baseURL: 'https://daily-history-server-dev-dev.up.railway.app/api/v1',
  timeout: 10000,
});

api.interceptors.request.use(async (config) => {
  const token = useAuthStore.getState().token;
  
  // Dacă e rută de auth, nu punem token
  if (config.url?.includes('/auth/')) {
    return config;
  }

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    console.log(`[API] Trimitere Token către ${config.url}`);
  } else {
    console.warn(`[API] Cerere către ${config.url} fără Token!`);
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // SCOATEM useAuthStore.getState().logout() de aici momentan!
    // Vrem doar să vedem eroarea în consolă, nu să ne dea afară din aplicație.
    console.error(`[API ERROR] ${error.config?.url} a dat status ${error.response?.status}`);
    return Promise.reject(error);
  }
);

export default api;