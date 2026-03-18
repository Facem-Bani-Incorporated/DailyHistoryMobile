// utils/haptics.ts
import { Platform } from 'react-native';

let Haptics: any = null;

try {
  Haptics = require('expo-haptics');
} catch {
  // expo-haptics not installed — all calls become no-ops
}

type HapticStyle = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' | 'selection';

export function haptic(style: HapticStyle = 'light') {
  if (!Haptics || Platform.OS === 'android') return;

  try {
    switch (style) {
      case 'light':
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        break;
      case 'medium':
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        break;
      case 'heavy':
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        break;
      case 'success':
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        break;
      case 'warning':
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        break;
      case 'error':
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        break;
      case 'selection':
        Haptics.selectionAsync();
        break;
    }
  } catch {
    // Silently fail on unsupported platforms
  }
}