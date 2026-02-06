import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useAuthStore } from '../store/useAuthStore';

export default function RootLayout() {
  const token = useAuthStore((state) => state.token);
  const segments = useSegments();
  const router = useRouter();

  const [ready, setReady] = useState(false);

  /* -------------------- INIT -------------------- */
  useEffect(() => {
    setReady(true);
  }, []);
  /* ---------------------------------------------- */

  /* -------------------- JWT GUARD -------------------- */
  useEffect(() => {
  if (!ready) return;

  const inAuthGroup = segments[0] === '(auth)';
  const isNotificationPrompt = segments[0] === 'notification-prompt';

  // Dacă nu am token și NU sunt în grupul de auth și NU sunt pe prompt-ul de notificări
  if (!token && !inAuthGroup && !isNotificationPrompt) {
    router.replace('/(auth)/welcome');
  } 
  // Dacă am token și încerc să intru la auth, trimite-mă în main
  else if (token && inAuthGroup) {
    router.replace('/(main)');
  }
}, [token, segments, ready]);
  /* -------------------------------------------------- */

  /* -------------------- LOADER -------------------- */
  if (!ready) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: '#0e1117',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <ActivityIndicator size="large" color="#ffd700" />
      </View>
    );
  }
  /* ------------------------------------------------ */

  /* -------------------- STACK -------------------- */
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(main)" />

      {/* Overlay */}
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
