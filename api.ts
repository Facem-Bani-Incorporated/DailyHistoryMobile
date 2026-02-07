// api.ts
import axios from 'axios';
import { useAuthStore } from './store/useAuthStore';

const api = axios.create({
  baseURL: 'https://proiectul-lui-sergiu.railway.app/api/v1',
});

// Interceptor care adaugă Token-ul automat
api.interceptors.request.use(async (config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;