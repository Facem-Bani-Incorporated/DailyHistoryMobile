import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import api from '../api';
import { useAuthStore } from '../store/useAuthStore';

export default function RootLayout() {
  const token = useAuthStore((state) => state.token);
  const segments = useSegments();
  const router = useRouter();

  const [isReady, setIsReady] = useState(false);

  /* -------------------- HYDRATION CHECK -------------------- */
  useEffect(() => {
    // Dacă deja s-a hidratat (hot reload)
    if (useAuthStore.persist.hasHydrated()) {
      console.log('[LAYOUT] Already hydrated on mount');
      setIsReady(true);
      return;
    }

    // Așteptăm hidratarea
    const unsubFinishHydration = useAuthStore.persist.onFinishHydration(() => {
      console.log('[LAYOUT] Hydration finished');
      setIsReady(true);
    });

    // Fallback: dacă hidratarea durează prea mult, pornim oricum
    const timeout = setTimeout(() => {
      console.log('[LAYOUT] Hydration timeout fallback - forcing ready');
      setIsReady(true);
    }, 1000);

    return () => {
      unsubFinishHydration();
      clearTimeout(timeout);
    };
  }, []);
  /* --------------------------------------------------------- */

  /* ---- SYNC TOKEN ÎN AXIOS DUPĂ HYDRATION ---- */
  useEffect(() => {
    if (!isReady) return;

    if (token) {
      console.log('[LAYOUT] Syncing token to axios headers');
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      console.log('[LAYOUT] No token, clearing axios headers');
      delete api.defaults.headers.common['Authorization'];
    }
  }, [token, isReady]);
  /* -------------------------------------------- */

  /* -------------------- JWT GUARD -------------------- */
  useEffect(() => {
    if (!isReady) return;

    const inAuthGroup = segments[0] === '(auth)';
    const isNotificationPrompt = segments[0] === 'notification-prompt';

    console.log('[GUARD]', { token: !!token, segments });

    if (!token) {
      if (!inAuthGroup && !isNotificationPrompt) {
        router.replace('/(auth)/welcome');
      }
    } else {
      if (inAuthGroup) {
        router.replace('/(main)');
      }
    }
  }, [token, segments, isReady]);
  /* -------------------------------------------------- */

  if (!isReady) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0e1117', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#ffd700" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(main)" />
      <Stack.Screen
        name="notification-prompt"
        options={{
          presentation: 'transparentModal',
          animation: 'fade',
          headerShown: false,
        }}
      />
    </Stack>
  );
}