// components/AchievementToast.tsx
// ═══════════════════════════════════════════════════════════════════════════════
//  ACHIEVEMENT TOAST — Animated popup when a new achievement is unlocked
//  Shows at top of screen, auto-dismisses after 3 seconds
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useEffect, useRef, useState } from 'react';
import {
    Animated,
    Easing,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import {
    ACHIEVEMENT_NAMES,
    ACHIEVEMENTS,
    useGamificationStore,
} from '../store/useGamificationStore';

const T: Record<string, Record<string, string>> = {
  en: { unlocked: 'Achievement Unlocked!' },
  ro: { unlocked: 'Realizare Deblocată!' },
  fr: { unlocked: 'Succès Débloqué !' },
  de: { unlocked: 'Erfolg Freigeschaltet!' },
  es: { unlocked: '¡Logro Desbloqueado!' },
};
const tx = (lang: string, key: string) => (T[lang] ?? T.en)[key] ?? T.en[key] ?? key;

export default function AchievementToast() {
  const { theme, isDark } = useTheme();
  const { language } = useLanguage();
  const insets = useSafeAreaInsets();
  const newAchievements = useGamificationStore(s => s.newAchievements);

  const [currentToast, setCurrentToast] = useState<string | null>(null);
  const [queue, setQueue] = useState<string[]>([]);

  const slideY = useRef(new Animated.Value(-120)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.8)).current;
  const iconBounce = useRef(new Animated.Value(0.5)).current;

  // Queue new achievements
  useEffect(() => {
    if (newAchievements.length > 0) {
      setQueue(prev => {
        const newItems = newAchievements.filter(id => !prev.includes(id));
        return [...prev, ...newItems];
      });
    }
  }, [newAchievements]);

  // Process queue
  useEffect(() => {
    if (queue.length > 0 && !currentToast) {
      const next = queue[0];
      setCurrentToast(next);
      setQueue(prev => prev.slice(1));
    }
  }, [queue, currentToast]);

  // Animate toast
  useEffect(() => {
    if (!currentToast) return;

    slideY.setValue(-120);
    opacity.setValue(0);
    scale.setValue(0.8);
    iconBounce.setValue(0.5);

    // Slide in
    Animated.parallel([
      Animated.spring(slideY, { toValue: 0, tension: 80, friction: 10, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, tension: 100, friction: 8, useNativeDriver: true }),
    ]).start(() => {
      // Icon bounce
      Animated.spring(iconBounce, { toValue: 1, tension: 200, friction: 5, useNativeDriver: true }).start();
    });

    // Auto dismiss after 3.5s
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(slideY, { toValue: -120, duration: 300, easing: Easing.in(Easing.back(1.5)), useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: true }),
      ]).start(() => {
        setCurrentToast(null);
      });
    }, 3500);

    return () => clearTimeout(timer);
  }, [currentToast]);

  if (!currentToast) return null;

  const achievement = ACHIEVEMENTS.find(a => a.id === currentToast);
  if (!achievement) return null;

  const name = (ACHIEVEMENT_NAMES[language] ?? ACHIEVEMENT_NAMES.en)[achievement.id] ?? achievement.id;

  return (
    <Animated.View style={[
      s.container,
      {
        top: insets.top + 10,
        opacity,
        transform: [{ translateY: slideY }, { scale }],
      },
    ]}>
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => {
          Animated.parallel([
            Animated.timing(slideY, { toValue: -120, duration: 200, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 0, duration: 150, useNativeDriver: true }),
          ]).start(() => setCurrentToast(null));
        }}
        style={[s.toast, {
          backgroundColor: isDark ? '#1A1610' : '#FFFFFF',
          borderColor: isDark ? '#3D2A14' : '#F0D8A8',
          shadowColor: '#FF8F00',
        }]}
      >
        {/* Glow background */}
        <View style={s.glowBg} />

        {/* Icon */}
        <Animated.View style={[s.iconWrap, { transform: [{ scale: iconBounce }] }]}>
          <Text style={s.icon}>{achievement.icon}</Text>
        </Animated.View>

        {/* Text */}
        <View style={s.textWrap}>
          <Text style={[s.label, { color: isDark ? '#FFB300' : '#C77E08' }]}>
            {tx(language, 'unlocked')}
          </Text>
          <Text style={[s.name, { color: isDark ? '#F5E6D0' : '#1A1510' }]}>{name}</Text>
        </View>

        {/* XP badge */}
        <View style={s.xpBadge}>
          <Text style={s.xpText}>+100 XP</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 9999,
    elevation: 20,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    gap: 12,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 10,
  },
  glowBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FFB30008',
    borderRadius: 18,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#FFB30015',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { fontSize: 22 },
  textWrap: { flex: 1, gap: 2 },
  label: { fontSize: 9, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' },
  name: { fontSize: 15, fontWeight: '800', letterSpacing: -0.3 },
  xpBadge: {
    backgroundColor: '#FF8F00',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  xpText: { color: '#FFF', fontSize: 11, fontWeight: '900', letterSpacing: 0.3 },
});