// app/services/authService.ts
import api from '../../api';
import { useAuthStore } from '../../store/useAuthStore';

export const authService = {
  async loginWithGoogle(idToken: string) {
    console.log("======= [DEBUG AUTH START] =======");
    
    try {
      const res = await api.post('/auth/google', { idToken });

      // [DEBUG] Vedem exact ce vine de la Railway
      console.log("[3] Răspuns de la server:", JSON.stringify(res.data, null, 2));

      // 1. Extragere Token (Backend-ul tău trimite "token")
      const token = res.data.token;
      
      // 2. Extragere User (Datele tale sunt direct în res.data, nu în res.data.user)
      const userData = {
        id: res.data.id,
        email: res.data.email,
        name: res.data.username,
        roles: res.data.roles
      };

      if (token && userData.email) {
        console.log("[4] Date valide. Salvare în Zustand Store...");
        
        // Salvăm în store-ul Zustand
        useAuthStore.getState().setAuth(token, userData);
        
        console.log("[5] Autentificare reușită pentru:", userData.email);
        console.log("======= [DEBUG AUTH END] =======");
        
        return res.data;
      } else {
        console.error("[ERORARE] Date primite incomplete. Token sau Email lipsă.");
        throw new Error("Date de autentificare incomplete de la server.");
      }

    } catch (error: any) {
      console.log("======= [DEBUG AUTH ERROR] =======");
      const status = error.response?.status;
      const message = error.response?.data?.message || error.message;
      console.error(`Status: ${status} | Mesaj: ${message}`);
      throw error;
    }
  }
};