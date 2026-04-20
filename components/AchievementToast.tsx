// components/AchievementToast.tsx
// ═══════════════════════════════════════════════════════════════════════════════
//  ACHIEVEMENT TOAST — Museum-plaque style popup
//  Shows ONCE per achievement (persistent seen-state), auto-dismisses
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

const DISMISS_MS = 3800;

const T: Record<string, Record<string, string>> = {
  en: { unlocked: 'Achievement Unlocked' },
  ro: { unlocked: 'Realizare Deblocată' },
  fr: { unlocked: 'Succès Débloqué' },
  de: { unlocked: 'Erfolg Freigeschaltet' },
  es: { unlocked: 'Logro Desbloqueado' },
};
const tx = (lang: string, key: string) => (T[lang] ?? T.en)[key] ?? T.en[key] ?? key;

// Map category → rarity tier (1-4 stars)
const TIER: Record<string, number> = {
  reading: 2, streak: 3, explorer: 3, dedication: 4,
};
const tierStars = (cat?: string) => TIER[cat ?? ''] ?? 2;

// Category-themed accent
const ACCENT: Record<string, string> = {
  reading: '#3E7BFA', streak: '#FF8F00', explorer: '#10B981', dedication: '#A855F7',
};
const accentColor = (cat?: string) => ACCENT[cat ?? ''] ?? '#FFB300';

export default function AchievementToast() {
  const { isDark } = useTheme();
  const { language } = useLanguage();
  const insets = useSafeAreaInsets();
  const newAchievements = useGamificationStore(s => s.newAchievements);
  const markAchievementsSeen = useGamificationStore(s => s.markAchievementsSeen);

  const [currentToast, setCurrentToast] = useState<string | null>(null);
  const [queue, setQueue] = useState<string[]>([]);
  const queuedIds = useRef<Set<string>>(new Set()); // session dedupe

  const slideY = useRef(new Animated.Value(-140)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.85)).current;
  const iconBounce = useRef(new Animated.Value(0.3)).current;
  const iconRotate = useRef(new Animated.Value(0)).current;
  const timerWidth = useRef(new Animated.Value(1)).current;
  const shimmer = useRef(new Animated.Value(0)).current;

  // ── Queue new achievements + immediately persist as "seen" ──
  useEffect(() => {
    if (newAchievements.length > 0) {
      const fresh = newAchievements.filter(id => !queuedIds.current.has(id));
      if (fresh.length > 0) {
        fresh.forEach(id => queuedIds.current.add(id));
        setQueue(prev => [...prev, ...fresh]);
      }
      // CRITICAL: persist the seen state immediately so these don't re-trigger
      // on next app launch. The local queue still holds them for display.
      markAchievementsSeen();
    }
  }, [newAchievements, markAchievementsSeen]);

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

    slideY.setValue(-140);
    opacity.setValue(0);
    scale.setValue(0.85);
    iconBounce.setValue(0.3);
    iconRotate.setValue(0);
    timerWidth.setValue(1);
    shimmer.setValue(0);

    // Slide + fade in
    Animated.parallel([
      Animated.spring(slideY, { toValue: 0, tension: 70, friction: 11, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 320, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, tension: 90, friction: 9, useNativeDriver: true }),
    ]).start(() => {
      // Icon bounce + rotate
      Animated.parallel([
        Animated.spring(iconBounce, { toValue: 1, tension: 160, friction: 6, useNativeDriver: true }),
        Animated.spring(iconRotate, { toValue: 1, tension: 80, friction: 7, useNativeDriver: true }),
      ]).start();

      // Shimmer loop
      Animated.loop(
        Animated.sequence([
          Animated.timing(shimmer, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(shimmer, { toValue: 0, duration: 200, useNativeDriver: true }),
        ]),
      ).start();

      // Timer bar countdown
      Animated.timing(timerWidth, {
        toValue: 0, duration: DISMISS_MS, easing: Easing.linear, useNativeDriver: false,
      }).start();
    });

    const timer = setTimeout(() => {
      dismiss();
    }, DISMISS_MS);

    return () => clearTimeout(timer);
  }, [currentToast]);

  const dismiss = () => {
    Animated.parallel([
      Animated.timing(slideY, { toValue: -140, duration: 280, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start(() => {
      setCurrentToast(null);
    });
  };

  if (!currentToast) return null;

  const achievement = ACHIEVEMENTS.find(a => a.id === currentToast);
  if (!achievement) return null;

  const name = (ACHIEVEMENT_NAMES[language] ?? ACHIEVEMENT_NAMES.en)[achievement.id] ?? achievement.id;
  const stars = tierStars(achievement.category);
  const accent = accentColor(achievement.category);
  const goldDark = '#E8B84D';
  const goldLight = '#C77E08';
  const gold = isDark ? goldDark : goldLight;

  // Shimmer translate across icon
  const shimmerX = shimmer.interpolate({ inputRange: [0, 1], outputRange: [-60, 60] });
  const iconSpin = iconRotate.interpolate({ inputRange: [0, 1], outputRange: ['-30deg', '0deg'] });

  return (
    <Animated.View style={[
      s.container,
      {
        top: insets.top + 10,
        opacity,
        transform: [{ translateY: slideY }, { scale }],
      },
    ]}>
      <TouchableOpacity activeOpacity={0.92} onPress={dismiss}>
        <View style={[s.toast, {
          backgroundColor: isDark ? '#17130C' : '#FFFDF5',
          borderColor: gold + '55',
          shadowColor: gold,
        }]}>
          {/* Top gold accent line */}
          <View style={[s.topAccent, { backgroundColor: gold }]} />

          {/* Corner ornaments */}
          <View style={[s.cornerTL, { borderColor: gold + '60' }]} />
          <View style={[s.cornerTR, { borderColor: gold + '60' }]} />

          <View style={s.content}>
            {/* Medal icon */}
            <Animated.View style={[s.medalOuter, {
              borderColor: gold + '40',
              transform: [{ scale: iconBounce }, { rotate: iconSpin }],
            }]}>
              <View style={[s.medalMid, { borderColor: gold + '80', backgroundColor: gold + '15' }]}>
                <View style={[s.medalInner, { backgroundColor: isDark ? '#2A1F0E' : '#FFF6E0' }]}>
                  <Text style={s.icon}>{achievement.icon}</Text>
                </View>
                {/* Shimmer swipe */}
                <Animated.View style={[s.shimmer, {
                  transform: [{ translateX: shimmerX }, { rotate: '20deg' }],
                }]} pointerEvents="none" />
              </View>
            </Animated.View>

            {/* Text */}
            <View style={s.textWrap}>
              <View style={s.labelRow}>
                <Text style={[s.label, { color: gold }]}>
                  {tx(language, 'unlocked').toUpperCase()}
                </Text>
                {/* Rarity stars */}
                <View style={s.starsWrap}>
                  {Array.from({ length: 4 }).map((_, i) => (
                    <View key={i} style={[s.star, {
                      backgroundColor: i < stars ? gold : gold + '20',
                    }]} />
                  ))}
                </View>
              </View>
              <Text numberOfLines={1} style={[s.name, { color: isDark ? '#F5E6D0' : '#1A1510' }]}>
                {name}
              </Text>
            </View>

            {/* XP badge */}
            <View style={[s.xpBadge, { backgroundColor: accent }]}>
              <Text style={s.xpPlus}>+</Text>
              <Text style={s.xpNum}>100</Text>
              <Text style={s.xpLbl}>XP</Text>
            </View>
          </View>

          {/* Timer bar */}
          <View style={[s.timerTrack, { backgroundColor: gold + '15' }]}>
            <Animated.View style={[s.timerFill, {
              backgroundColor: gold,
              width: timerWidth.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
            }]} />
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 14,
    right: 14,
    zIndex: 9999,
    elevation: 24,
  },
  toast: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 18,
    elevation: 14,
  },
  topAccent: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 2,
    opacity: 0.9,
  },
  cornerTL: {
    position: 'absolute', top: 6, left: 6,
    width: 10, height: 10, borderLeftWidth: 1, borderTopWidth: 1, borderTopLeftRadius: 3,
  },
  cornerTR: {
    position: 'absolute', top: 6, right: 6,
    width: 10, height: 10, borderRightWidth: 1, borderTopWidth: 1, borderTopRightRadius: 3,
  },
  content: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 14, paddingVertical: 14, paddingTop: 16,
  },

  // Medal
  medalOuter: {
    width: 54, height: 54, borderRadius: 27, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center', padding: 3,
  },
  medalMid: {
    flex: 1, alignSelf: 'stretch', borderRadius: 22, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center', padding: 2, overflow: 'hidden',
  },
  medalInner: {
    flex: 1, alignSelf: 'stretch', borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  icon: { fontSize: 22 },
  shimmer: {
    position: 'absolute', top: -8, width: 20, height: 80,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },

  textWrap: { flex: 1, gap: 4 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { fontSize: 9, fontWeight: '900', letterSpacing: 1.6 },
  starsWrap: { flexDirection: 'row', gap: 3, alignItems: 'center' },
  star: { width: 5, height: 5, borderRadius: 2.5 },
  name: {
    fontSize: 15, fontWeight: '800', letterSpacing: -0.3,
    fontFamily: 'Georgia',
  },

  // XP
  xpBadge: {
    flexDirection: 'row', alignItems: 'baseline',
    paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10, gap: 1,
  },
  xpPlus: { color: '#FFF', fontSize: 11, fontWeight: '900', opacity: 0.8 },
  xpNum: { color: '#FFF', fontSize: 13, fontWeight: '900', letterSpacing: -0.3 },
  xpLbl: { color: '#FFF', fontSize: 8, fontWeight: '900', letterSpacing: 0.5, marginLeft: 2, opacity: 0.85 },

  // Timer
  timerTrack: { height: 2, width: '100%' },
  timerFill: { height: 2 },
});