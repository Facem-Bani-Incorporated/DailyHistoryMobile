// components/GetProButton.tsx
//
// Small reusable CTA for upgrading to Daily History Pro.
// Two variants:
//   - `header`: compact gold pill for the top nav (GET PRO / PRO)
//   - `cta`   : full-width CTA for profile / paywall screens

import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';

import { useRevenueCat } from '../context/RevenueCatContext';
import { haptic } from '../utils/haptics';

interface Props {
  variant?: 'header' | 'cta';
  gold?: string;
  /** If true, always opens the paywall (even when user is already PRO). */
  forcePaywall?: boolean;
  /** Override default onPress. */
  onPress?: () => void;
}

export default function GetProButton({
  variant = 'cta',
  gold = '#D4A843',
  forcePaywall = false,
  onPress,
}: Props) {
  const { isPro, presentPaywall, presentCustomerCenter } = useRevenueCat();

  const handle = async () => {
    haptic('light');
    if (onPress) { onPress(); return; }
    if (isPro && !forcePaywall) {
      await presentCustomerCenter();
    } else {
      await presentPaywall();
    }
  };

  if (variant === 'header') {
    return (
      <TouchableOpacity
        onPress={handle}
        activeOpacity={0.8}
        style={[styles.headerPill, { backgroundColor: gold, shadowColor: gold }]}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="sparkles" size={10} color="#000" />
        <Text style={styles.headerPillT}>{isPro ? 'PRO' : 'GET PRO'}</Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={handle}
      activeOpacity={0.85}
      style={[styles.cta, { backgroundColor: gold, shadowColor: gold }]}
    >
      <Ionicons name="sparkles" size={16} color="#000" />
      <Text style={styles.ctaT}>
        {isPro ? 'Manage subscription' : 'Unlock Daily History Pro'}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  headerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    shadowOpacity: 0.35,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  headerPillT: {
    fontSize: 10,
    fontWeight: '900',
    color: '#000',
    letterSpacing: 1.2,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 14,
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  ctaT: {
    fontSize: 14,
    fontWeight: '800',
    color: '#000',
    letterSpacing: 0.3,
  },
});
