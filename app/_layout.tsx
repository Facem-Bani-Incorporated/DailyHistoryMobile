// app/_layout.tsx
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import OnboardingScreen, { checkOnboardingSeen } from '../components/OnBoardingScreen';
import { LanguageProvider } from '../context/LanguageContext';
import { ThemeProvider, useTheme } from '../context/ThemeContext';
import { useAuthStore } from '../store/useAuthStore';

function AppContent() {
  const token = useAuthStore((state) => state.token);
  const segments = useSegments();
  const router = useRouter();
  const { theme } = useTheme();
  const [isReady, setIsReady] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState<boolean | null>(null);

  useEffect(() => {
    GoogleSignin.configure({
      webClientId: '937397754645-8m819hke8eul773o681lre9960787p98.apps.googleusercontent.com',
      offlineAccess: true,
    });

    // Check both hydration and onboarding status
    const init = async () => {
      if (!useAuthStore.persist.hasHydrated()) {
        await new Promise<void>((resolve) => {
          const unsub = useAuthStore.persist.onFinishHydration(() => {
            resolve();
            unsub();
          });
        });
      }

      const seen = await checkOnboardingSeen();
      setShowOnboarding(!seen);
      setIsReady(true);
    };

    init();
  }, []);

  useEffect(() => {
    if (!isReady || showOnboarding) return;

    const inAuthGroup = segments[0] === '(auth)';
    const isNotificationPrompt = segments[0] === 'notification-prompt';

    const timeout = setTimeout(() => {
      if (!token && !inAuthGroup && !isNotificationPrompt) {
        router.replace('/(auth)/welcome');
      } else if (token && inAuthGroup) {
        router.replace('/(main)');
      }
    }, 0);

    return () => clearTimeout(timeout);
  }, [token, segments, isReady, showOnboarding]);

  if (!isReady) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={theme.gold} />
      </View>
    );
  }

  // Show onboarding before anything else
  if (showOnboarding) {
    return (
      <OnboardingScreen onComplete={() => setShowOnboarding(false)} />
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(main)" />
      <Stack.Screen
        name="notification-prompt"
        options={{ presentation: 'transparentModal', animation: 'fade' }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <LanguageProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </LanguageProvider>
  );
}