import axios from 'axios';
import { useAuthStore } from './store/useAuthStore';

const api = axios.create({
  baseURL: 'https://daily-history-server-dev-dev.up.railway.app/api/v1',
  timeout: 15000,
});

api.interceptors.request.use(
  (config) => {
    // Dacă headerul e deja setat explicit (ex: imediat după login), nu îl suprascrie
    if (config.headers.Authorization) {
      return config;
    }

    // Altfel citim din store (pentru requesturi ulterioare)
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);



export default api;

