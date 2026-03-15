import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { LanguageProvider } from '../context/LanguageContext'; // ← ADĂUGAT
import { ThemeProvider } from '../context/ThemeContext';
import { useAuthStore } from '../store/useAuthStore';

export default function RootLayout() {
  const token = useAuthStore((state) => state.token);
  const segments = useSegments();
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    GoogleSignin.configure({
      webClientId: '937397754645-8m819hke8eul773o681lre9960787p98.apps.googleusercontent.com',
      offlineAccess: true,
    });

    if (useAuthStore.persist.hasHydrated()) {
      setIsReady(true);
    } else {
      const unsub = useAuthStore.persist.onFinishHydration(() => setIsReady(true));
      return () => unsub();
    }
  }, []);

  useEffect(() => {
    if (!isReady) return;

    const inAuthGroup = segments[0] === '(auth)';
    const isNotificationPrompt = segments[0] === 'notification-prompt';

    const timeout = setTimeout(() => {
      if (!token && !inAuthGroup && !isNotificationPrompt) {
        console.log('[GUARD] Redirecting to welcome...');
        router.replace('/(auth)/welcome');
      } else if (token && inAuthGroup) {
        console.log('[GUARD] Redirecting to main...');
        router.replace('/(main)');
      }
    }, 0);

    return () => clearTimeout(timeout);
  }, [token, segments, isReady]);

  if (!isReady) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0e1117', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#ffd700" />
      </View>
    );
  }

  return (
    <LanguageProvider>  {/* ← ADĂUGAT — wrappuiește tot app-ul */}
      <ThemeProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(main)" />
          <Stack.Screen
            name="notification-prompt"
            options={{ presentation: 'transparentModal', animation: 'fade' }}
          />
        </Stack>
      </ThemeProvider>
    </LanguageProvider>
  );
}