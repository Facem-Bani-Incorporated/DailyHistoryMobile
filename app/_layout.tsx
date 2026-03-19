// app/_layout.tsx
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import OnboardingScreen from '../components/OnBoardingScreen';
import { LanguageProvider } from '../context/LanguageContext';
import { ThemeProvider, useTheme } from '../context/ThemeContext';
import { useGamificationSync } from '../hooks/useGamificationSync';
import { useAuthStore } from '../store/useAuthStore';

function AppContent() {
  const token = useAuthStore((state) => state.token);
  const segments = useSegments();
  const router = useRouter();
  const { theme } = useTheme();
  const [isReady, setIsReady] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Track previous token value to detect transitions (null → token = login)
  const prevTokenRef = useRef<string | null | undefined>(undefined); // undefined = uninitialized
  const onboardingActiveRef = useRef(false); // prevents re-trigger while onboarding is showing

  // ── Sync gamification data with current user ──
  useGamificationSync();

  useEffect(() => {
    GoogleSignin.configure({
      webClientId: '937397754645-8m819hke8eul773o681lre9960787p98.apps.googleusercontent.com',
      offlineAccess: true,
    });

    const init = async () => {
      if (!useAuthStore.persist.hasHydrated()) {
        await new Promise<void>((resolve) => {
          const unsub = useAuthStore.persist.onFinishHydration(() => {
            resolve();
            unsub();
          });
        });
      }

      // Initialize prevTokenRef with current token AFTER hydration
      // This prevents showing onboarding on app reopen when already logged in
      prevTokenRef.current = useAuthStore.getState().token || null;
      setIsReady(true);
    };

    init();
  }, []);

  // Detect login transitions: prevToken was null/falsy → token is now truthy
  useEffect(() => {
    if (!isReady) return;
    if (prevTokenRef.current === undefined) return;

    const wasLoggedOut = !prevTokenRef.current;
    const isNowLoggedIn = !!token;

    if (wasLoggedOut && isNowLoggedIn && !onboardingActiveRef.current) {
      onboardingActiveRef.current = true;
      setShowOnboarding(true);
    }

    prevTokenRef.current = token || null;
  }, [token, isReady]);

  // Navigation routing
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

  // Show onboarding after fresh login
  if (showOnboarding && token) {
    return (
      <OnboardingScreen
        onComplete={() => {
          onboardingActiveRef.current = false;
          setShowOnboarding(false);
          router.replace('/(main)');
        }}
      />
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