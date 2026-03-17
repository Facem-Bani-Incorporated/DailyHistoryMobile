// utils/haptics.ts
// Centralized haptic feedback — import { haptic } from '../utils/haptics'
// Usage: haptic('light') | haptic('medium') | haptic('success') | haptic('warning')

let Haptics: any = null;

try {
  Haptics = require('expo-haptics');
} catch {
  // expo-haptics not installed — all calls become no-ops
}

type HapticStyle = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' | 'selection';

export function haptic(style: HapticStyle = 'light') {
  if (!Haptics) return;

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