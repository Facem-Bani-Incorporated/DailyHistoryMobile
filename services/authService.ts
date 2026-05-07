import api from '../api';
import { useAuthStore } from '../store/useAuthStore';

// Fetches the latest user profile from the backend and updates the local store.
// Called on app boot to pick up is_pro changes made by the RevenueCat webhook.
export async function refreshMe(): Promise<void> {
  try {
    const res = await api.get('/users/me');
    if (res.data) useAuthStore.getState().updateUser(res.data);
  } catch (e) {
    if (__DEV__) console.warn('[Auth] refreshMe failed', e);
  }
}

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

  async loginWithApple(identityToken: string, firstName?: string | null, lastName?: string | null) {
    try {
      const fullName = [firstName, lastName].filter(Boolean).join(' ') || undefined;
      const res = await api.post('/auth/apple', {
        idToken: identityToken,
        fullName,
      });

      const { token, ...userFromBackend } = res.data;

      if (!token) {
        throw new Error('Token lipsă de la server');
      }

      const userData = {
        ...userFromBackend,
        avatar_url: userFromBackend.avatarUrl || userFromBackend.avatar_url,
        provider: 'apple',
      };

      useAuthStore.getState().setAuth(token, userData);
      return res.data;
    } catch (error: any) {
      console.error('APPLE LOGIN ERROR:', error.response?.data || error.message);
      throw error;
    }
  },
};