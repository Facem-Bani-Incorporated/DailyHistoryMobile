// hooks/useNotifications.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import api from '../api';
import { useLanguage } from '../context/LanguageContext';
import { useAuthStore } from '../store/useAuthStore';
import {
    buildPersonalizedNotification,
    fireTestNotification,
    requestNotificationPermissions,
    scheduleDailyNotification,
    schedulePersonalizedNotification,
    setupNotificationChannel,
} from '../utils/Notifications';

const NOTIF_PREF_KEY = 'notifications_enabled';

// ── Dev accounts — only these see the test button ──
const DEV_EMAILS = ['razvanstefan.dogaru@gmail.com'];
const DEV_USER_IDS = [2, '2'];

interface UseNotificationsReturn {
  /** Whether push permissions are granted */
  permissionGranted: boolean | null;
  /** Whether notifications are enabled by user preference */
  enabled: boolean;
  /** Toggle notifications on/off */
  toggle: (on: boolean) => Promise<void>;
  /** Whether this user sees the dev test button */
  isDevAccount: boolean;
  /** Fire a test notification with today's real events (dev only) */
  sendTestNotification: () => Promise<void>;
  /** Schedule tomorrow's personalized notification */
  scheduleForTomorrow: (tomorrowEvents: any[]) => Promise<void>;
  /** Whether a test notification is currently being sent */
  testLoading: boolean;
}

export function useNotifications(): UseNotificationsReturn {
  const { language } = useLanguage();
  const user = useAuthStore((s) => s.user);

  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);
  const [enabled, setEnabled] = useState(true);
  const [testLoading, setTestLoading] = useState(false);
  const hasSetupChannel = useRef(false);
  const hasLoadedPref = useRef(false);

  // ── Check if current user is a dev account ──
  const isDevAccount =
    DEV_EMAILS.includes(user?.email ?? '') ||
    DEV_USER_IDS.includes(user?.id as any);

  // ── Setup Android channel once ──
  useEffect(() => {
    if (!hasSetupChannel.current) {
      setupNotificationChannel();
      hasSetupChannel.current = true;
    }
  }, []);

  // ── Load persisted preference ──
  useEffect(() => {
    AsyncStorage.getItem(NOTIF_PREF_KEY).then((val) => {
      if (val !== null) setEnabled(val === 'true');
      hasLoadedPref.current = true;
    });
  }, []);

  // ── Check permission on mount & on foreground ──
  useEffect(() => {
    const check = async () => {
      const { status } = await Notifications.getPermissionsAsync();
      setPermissionGranted(status === 'granted');
    };

    check();

    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') check();
    });

    return () => sub.remove();
  }, []);

  // ── Helper: fetch tomorrow's events and schedule notification ──
  const fetchAndScheduleTomorrow = useCallback(async () => {
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const iso = tomorrow.toISOString().split('T')[0];
      const res = await api.get('/daily-content/by-date', {
        params: { date: iso, _t: Date.now() },
      });
      const events: any[] = res.data?.events ?? [];
      await schedulePersonalizedNotification(events, language);
    } catch {
      // Schedule with empty events as fallback (shows generic message)
      await schedulePersonalizedNotification([], language);
    }
  }, [language]);

  // ── Toggle ──
  const toggle = useCallback(async (on: boolean) => {
    setEnabled(on);
    await AsyncStorage.setItem(NOTIF_PREF_KEY, String(on));

    if (on) {
      const granted = await requestNotificationPermissions();
      setPermissionGranted(granted);
      if (granted) {
        await fetchAndScheduleTomorrow();
      }
    } else {
      // Cancel all scheduled notifications when user disables
      await Notifications.cancelAllScheduledNotificationsAsync();
    }
  }, [fetchAndScheduleTomorrow]);

  // ── Schedule for tomorrow (language-aware) ──
  const scheduleForTomorrow = useCallback(
    async (tomorrowEvents: any[]) => {
      if (!enabled || permissionGranted === false) return;

      const { title, body } = buildPersonalizedNotification(
        tomorrowEvents,
        language,
      );
      await scheduleDailyNotification(title, body, 9, 0);
    },
    [language, permissionGranted, enabled],
  );

  // ── Test notification — fetches TODAY's real events ──
  const sendTestNotification = useCallback(async () => {
    if (!isDevAccount) return;
    setTestLoading(true);

    try {
      // Fetch today's actual events from the API
      const today = new Date().toISOString().split('T')[0];
      const res = await api.get('/daily-content/by-date', {
        params: { date: today, _t: Date.now() },
      });
      const events: any[] = res.data?.events ?? [];

      if (events.length > 0) {
        // Fire with real events — uses the user's current language
        await fireTestNotification(events, language);
      } else {
        // Fallback: fire with a compelling sample event
        await fireTestNotification(
          [
            {
              titleTranslations: {
                en: 'The Fall of Constantinople',
                ro: 'Căderea Constantinopolului',
                fr: 'La chute de Constantinople',
                de: 'Der Fall Konstantinopels',
                es: 'La caída de Constantinopla',
              },
              narrativeTranslations: {
                en: 'The Ottoman Empire captured Constantinople in 1453, ending over a thousand years of the Byzantine Empire.',
                ro: 'Imperiul Otoman a cucerit Constantinopolul în 1453, punând capăt a peste o mie de ani de Imperiu Bizantin.',
                fr: "L'Empire ottoman s'empara de Constantinople en 1453, mettant fin à plus de mille ans d'Empire byzantin.",
                de: 'Das Osmanische Reich eroberte 1453 Konstantinopel und beendete über tausend Jahre Byzantinisches Reich.',
                es: 'El Imperio Otomano capturó Constantinopla en 1453, poniendo fin a más de mil años del Imperio Bizantino.',
              },
              year: 1453,
              category: 'war_conflict',
              impactScore: 95,
            },
          ],
          language,
        );
      }
    } catch (e) {
      if (__DEV__) console.warn('[Notifications] Test failed:', e);
    } finally {
      setTestLoading(false);
    }
  }, [isDevAccount, language]);

  return {
    permissionGranted,
    enabled,
    toggle,
    isDevAccount,
    sendTestNotification,
    scheduleForTomorrow,
    testLoading,
  };
}