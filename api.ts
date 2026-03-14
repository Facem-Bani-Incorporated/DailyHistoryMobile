// api.ts
import axios from 'axios';
import { useAuthStore } from './store/useAuthStore';

// Păstrăm baseURL la nivel de domeniu + /api, fără versiune fixă aici
const api = axios.create({
  baseURL: 'https://daily-history-server-dev-development.up.railway.app/api',
  timeout: 15000,
});

api.interceptors.request.use(async (config) => {
  const token = useAuthStore.getState().token;

  // --- LOGICA DE RATARE DINAMICĂ (FĂRĂ REDEPLOY) ---
  
  // 1. Dacă e cerere de login/register, forțăm /v1 în URL
  if (config.url?.includes('/auth')) {
    if (!config.url.startsWith('/v1')) {
      config.url = `/v1${config.url.startsWith('/') ? '' : '/'}${config.url}`;
    }
    // Nu punem token pe auth
    return config;
  }

  // 2. Pentru restul (Daily Content), verificăm dacă are deja /v1. 
  // Dacă are și știm că dă 404, îl scoatem (sau invers).
  // În cazul tău: Daily Content NU are v1 în Java, deci ne asigurăm că url-ul e curat.
  if (config.url?.includes('/daily-content') && config.url.includes('/v1')) {
     config.url = config.url.replace('/v1', '');
  }

  // Adăugare Token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    console.log(`[API] 🚀 Trimitere către: ${config.url}`);
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