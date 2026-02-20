import api from '../../api';
import { useAuthStore } from '../../store/useAuthStore';

export const authService = {
  async loginWithGoogle(idToken: string) {
    try {
      const res = await api.post('/auth/google', { idToken });

      console.log('SERVER RESPONSE:', res.data);

      const { token, ...userFromBackend } = res.data;

      if (!token || !userFromBackend.email) {
        throw new Error('Date incomplete de la server');
      }

      // 🔥 REPARĂM MAPAREA AICI:
      // Luăm ce vine din Java (avatarUrl) și îl punem în avatar_url
      const userData = {
        ...userFromBackend,
        avatar_url: userFromBackend.avatarUrl || userFromBackend.avatar_url, 
        provider: userFromBackend.provider ?? 'google',
      };

      useAuthStore.getState().setAuth(token, userData);

      console.log('USER SALVAT IN ZUSTAND (CU FIX):', userData);

      return res.data;
    } catch (error: any) {
      console.error(
        'LOGIN ERROR:',
        error.response?.status,
        error.response?.data || error.message
      );
      throw error;
    }
  },
};