// app/_layout.tsx
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import * as Notifications from 'expo-notifications';
import * as Linking from 'expo-linking';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import OnboardingScreen from '../components/OnBoardingScreen';
import { LanguageProvider } from '../context/LanguageContext';
import { RevenueCatProvider } from '../context/RevenueCatContext';
import { ThemeProvider, useTheme } from '../context/ThemeContext';
import { useAdsInit } from '../hooks/useAdsInit';
import { useGamificationSync } from '../hooks/useGamificationSync';
import { useAuthStore } from '../store/useAuthStore';
import { useNotificationEventStore } from '../store/useNotificationEventStore';

function AppContent() {
  const token = useAuthStore((state) => state.token);
  const segments = useSegments();
  const router = useRouter();
  const { theme } = useTheme();
  const [isReady, setIsReady] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  // null = still resolving from AsyncStorage; 'full' = new account (features →
  // notifications → PRO); 'proOnly' = returning account (just the PRO upsell).
  const [onboardingMode, setOnboardingMode] = useState<'full' | 'proOnly' | null>(null);

  const prevTokenRef = useRef<string | null | undefined>(undefined);
  const onboardingActiveRef = useRef(false);

  const handleWidgetDeepLink = (url: string | null) => {
    if (!url || !url.startsWith('dailyhistorymobile://widget')) return;
    try {
      const parsed = Linking.parse(url);
      const title = typeof parsed.queryParams?.title === 'string' ? parsed.queryParams.title : '';
      const year = typeof parsed.queryParams?.year === 'string' ? parsed.queryParams.year : '';
      const narrative = typeof parsed.queryParams?.narrative === 'string' ? parsed.queryParams.narrative : '';
      const image = typeof parsed.queryParams?.image === 'string' ? parsed.queryParams.image : '';

      const event = {
        titleTranslations: { en: title || 'Daily History' },
        narrativeTranslations: { en: narrative || 'Open the app to explore this event.' },
        eventDate: year ? `${year}-01-01` : '',
        gallery: image ? [image] : [],
      };

      useNotificationEventStore.getState().setPendingEvent(event);
      if (token) router.replace('/(main)');
      else router.replace('/preview');
    } catch (error) {
      if (__DEV__) console.warn('[Widget deeplink] parse failed', error);
    }
  };

  // ── Sync gamification data with backend ──
  useGamificationSync();

  // ── Initialize Google Mobile Ads SDK ──
  useAdsInit();

  // ── Handle notification taps (deep-link to event) ──
  useEffect(() => {
    // User tapped notification while app was killed/background
    Notifications.getLastNotificationResponseAsync().then((response) => {
      const event = response?.notification?.request?.content?.data?.event;
      if (event) useNotificationEventStore.getState().setPendingEvent(event);
    });

    // User taps notification while app is in foreground
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const event = response?.notification?.request?.content?.data?.event;
      if (event) useNotificationEventStore.getState().setPendingEvent(event);
    });

    return () => sub.remove();
  }, []);

  useEffect(() => {
    Linking.getInitialURL().then((url) => {
      handleWidgetDeepLink(url);
    });
    const sub = Linking.addEventListener('url', ({ url }) => handleWidgetDeepLink(url));
    return () => sub.remove();
  }, [token]);

  useEffect(() => {
    GoogleSignin.configure({
      // Web + iOS OAuth client IDs from the Firebase project (dailyhistory-a717e).
      // Web client_id is the one used for backend idToken verification; must
      // match GOOGLE_CLIENT_ID configured on the Railway backend.
      webClientId: '146058417942-b63gth649kqijdf8avkh8fuhbgael563.apps.googleusercontent.com',
      iosClientId: '146058417942-oulpjek0jpbbp6so5g0vj7vcn62qt1uj.apps.googleusercontent.com',
      scopes: ['email', 'profile'],
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

      prevTokenRef.current = useAuthStore.getState().token || null;
      setIsReady(true);
    };

    init();
  }, []);

  useEffect(() => {
    if (!isReady) return;
    if (prevTokenRef.current === undefined) return;

    const wasLoggedOut = !prevTokenRef.current;
    const isNowLoggedIn = !!token;

    if (wasLoggedOut && isNowLoggedIn && !onboardingActiveRef.current) {
      onboardingActiveRef.current = true;
      // New account (didn't exist in DB) → full onboarding; existing → PRO only.
      const isNew = useAuthStore.getState().isNewAccount;
      setOnboardingMode(isNew ? 'full' : 'proOnly');
      setShowOnboarding(true);
    }

    prevTokenRef.current = token || null;
  }, [token, isReady]);

  useEffect(() => {
    if (!isReady || showOnboarding) return;

    const inAuthGroup = segments[0] === '(auth)';
    const isNotificationPrompt = segments[0] === 'notification-prompt';
    const isPreview = segments[0] === 'preview';

    const timeout = setTimeout(() => {
      if (!token && !inAuthGroup && !isNotificationPrompt && !isPreview) {
        router.replace('/preview');
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

  if (showOnboarding && token) {
    // Mode still resolving from AsyncStorage — hold on a matching dark frame
    // (imperceptible) instead of flashing the wrong first screen.
    if (onboardingMode === null) {
      return <View style={{ flex: 1, backgroundColor: '#0A0B0E' }} />;
    }
    return (
      <OnboardingScreen
        startStep={onboardingMode === 'proOnly' ? 'subscription' : 'language'}
        onComplete={() => {
          onboardingActiveRef.current = false;
          setShowOnboarding(false);
          setOnboardingMode(null);
          router.replace('/(main)');
        }}
      />
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="preview" />
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
        <RevenueCatProvider>
          <AppContent />
        </RevenueCatProvider>
      </ThemeProvider>
    </LanguageProvider>
  );
}