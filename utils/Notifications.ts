// utils/notifications.ts
import * as Notifications from 'expo-notifications';

// Configurare handler global — afișează notificarea chiar dacă app-ul e deschis
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const NOTIFICATION_ID = 'daily_history_midnight';

/**
 * Programează o notificație zilnică la 00:00.
 * Dacă există deja una, o anulează și o reprogramează (safe to call multiple times).
 */
export async function scheduleMidnightNotification(title: string, body: string) {
  try {
    // Verifică permisiunile
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      const { status: newStatus } = await Notifications.requestPermissionsAsync();
      if (newStatus !== 'granted') return;
    }

    // Anulează notificarea veche dacă există
    await Notifications.cancelScheduledNotificationAsync(NOTIFICATION_ID).catch(() => {});

    // Programează zilnic la 00:00
    await Notifications.scheduleNotificationAsync({
      identifier: NOTIFICATION_ID,
      content: {
        title,
        body,
        sound: true,
        badge: 1,
        data: { type: 'new_day' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 0,
        minute: 0,
      },
    });

    console.log('✅ Midnight notification scheduled');
  } catch (e) {
    console.error('❌ Failed to schedule notification:', e);
  }
}

/**
 * Trimite o notificație de test imediat (după 3 secunde).
 * Folosit doar în development.
 */
export async function testNotificationNow(title: string, body: string) {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      const { status: newStatus } = await Notifications.requestPermissionsAsync();
      if (newStatus !== 'granted') return;
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: `🧪 TEST — ${title}`,
        body,
        sound: true,
        badge: 1,
        data: { type: 'test' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 3,
      },
    });

    console.log('🧪 Test notification will fire in 3 seconds');
  } catch (e) {
    console.error('❌ Test notification failed:', e);
  }
}
export async function cancelMidnightNotification() {
  await Notifications.cancelScheduledNotificationAsync(NOTIFICATION_ID).catch(() => {});
}