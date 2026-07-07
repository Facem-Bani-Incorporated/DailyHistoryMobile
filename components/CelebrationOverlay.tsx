// components/CelebrationOverlay.tsx
// Big-moment celebrations: LEVEL UP and STREAK MILESTONE. These are the dopamine
// beats that turn "read another story" into a habit. Achievement unlocks already
// have their own top toast (AchievementToast); this handles the two rarer, bigger
// moments with a centered card + sparkle burst.
//
// Detection is guarded so it never false-fires:
//  • waits for the gamification store to finish hydrating (totalXP jumps from 0 →
//    real on launch would otherwise look like a level-up),
//  • re-baselines silently when the logged-in user switches.
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COIN_GOLD, COIN_GOLD_DEEP } from '../config/coins';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { getLevelForXP, LEVEL_NAMES, useGamificationStore } from '../store/useGamificationStore';
import { useUiStore } from '../store/useUiStore';
import { haptic } from '../utils/haptics';
import { GameIcon } from '../utils/GameIcon';

const SERIF = Platform.OS === 'ios' ? 'Georgia' : 'serif';
const STREAK_MILESTONES = [3, 7, 14, 30, 100, 365];

type Celebration = { type: 'level'; value: number } | { type: 'streak'; value: number };

const L: Record<string, Record<string, string>> = {
  en: { levelUp: 'LEVEL UP', level: 'Level', streak: 'STREAK', dayStreak: 'day streak', view: 'View my progress', dismiss: 'Not now' },
  ro: { levelUp: 'NIVEL NOU', level: 'Nivel', streak: 'STREAK', dayStreak: 'zile la rând', view: 'Vezi progresul', dismiss: 'Mai târziu' },
  fr: { levelUp: 'NIVEAU SUPÉRIEUR', level: 'Niveau', streak: 'SÉRIE', dayStreak: 'jours de suite', view: 'Voir ma progression', dismiss: 'Plus tard' },
  de: { levelUp: 'LEVEL-AUFSTIEG', level: 'Level', streak: 'SERIE', dayStreak: 'Tage in Folge', view: 'Fortschritt ansehen', dismiss: 'Später' },
  es: { levelUp: 'SUBIDA DE NIVEL', level: 'Nivel', streak: 'RACHA', dayStreak: 'días seguidos', view: 'Ver mi progreso', dismiss: 'Ahora no' },
};

/* ── Sparkle burst — a handful of particles flying outward on show ── */
const SparkleBurst = ({ trigger, color }: { trigger: number; color: string }) => {
  const parts = useRef(
    Array.from({ length: 12 }).map((_, i) => {
      const angle = (Math.PI * 2 * i) / 12 + Math.random() * 0.4;
      const dist = 70 + Math.random() * 60;
      return { anim: new Animated.Value(0), dx: Math.cos(angle) * dist, dy: Math.sin(angle) * dist, size: 4 + Math.random() * 5 };
    }),
  ).current;

  useEffect(() => {
    if (!trigger) return;
    parts.forEach(p => p.anim.setValue(0));
    Animated.stagger(20, parts.map(p =>
      Animated.timing(p.anim, { toValue: 1, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    )).start();
  }, [trigger]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {parts.map((p, i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute', left: '50%', top: '32%',
            width: p.size, height: p.size, borderRadius: p.size / 2, backgroundColor: color,
            opacity: p.anim.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 1, 0] }),
            transform: [
              { translateX: p.anim.interpolate({ inputRange: [0, 1], outputRange: [0, p.dx] }) },
              { translateY: p.anim.interpolate({ inputRange: [0, 1], outputRange: [0, p.dy] }) },
              { scale: p.anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.4, 1.1, 0.5] }) },
            ],
          }}
        />
      ))}
    </View>
  );
};

export default function CelebrationOverlay() {
  const { theme, isDark } = useTheme();
  const { language } = useLanguage();
  const tx = (k: string) => (L[language] ?? L.en)[k] ?? L.en[k] ?? k;
  const gold = isDark ? COIN_GOLD : COIN_GOLD_DEEP;

  const totalXP = useGamificationStore(s => s.totalXP);
  const streak = useGamificationStore(s => s.currentStreak);
  const userId = useGamificationStore(s => s._userId);

  const [hydrated, setHydrated] = useState(() => {
    try { return (useGamificationStore as any).persist?.hasHydrated?.() ?? true; } catch { return true; }
  });
  useEffect(() => {
    try {
      const unsub = (useGamificationStore as any).persist?.onFinishHydration?.(() => setHydrated(true));
      return unsub;
    } catch { /* no persist api → treat as hydrated */ }
  }, []);

  const prevLevel = useRef<number | null>(null);
  const prevStreak = useRef<number | null>(null);
  const baselineUser = useRef<string | null | undefined>(undefined);

  const [queue, setQueue] = useState<Celebration[]>([]);
  const [current, setCurrent] = useState<Celebration | null>(null);

  // Detect transitions (guarded).
  useEffect(() => {
    if (!hydrated) return;
    const level = getLevelForXP(totalXP).level;

    // (Re)baseline on first hydrated run or when the account changes — no celebration.
    if (prevLevel.current === null || baselineUser.current !== userId) {
      prevLevel.current = level;
      prevStreak.current = streak;
      baselineUser.current = userId;
      return;
    }

    const next: Celebration[] = [];
    if (level > prevLevel.current) next.push({ type: 'level', value: level });
    if (streak > (prevStreak.current ?? 0) && STREAK_MILESTONES.includes(streak)) next.push({ type: 'streak', value: streak });

    prevLevel.current = level;
    prevStreak.current = streak;
    if (next.length) setQueue(q => [...q, ...next]);
  }, [hydrated, totalXP, streak, userId]);

  // Drive the queue.
  useEffect(() => {
    if (!current && queue.length) {
      setCurrent(queue[0]);
      setQueue(q => q.slice(1));
    }
  }, [queue, current]);

  // Animate in when a celebration becomes current.
  const scale = useRef(new Animated.Value(0.7)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const [burst, setBurst] = useState(0);
  useEffect(() => {
    if (!current) return;
    scale.setValue(0.7); opacity.setValue(0);
    haptic('success');
    setBurst(b => b + 1);
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, tension: 120, friction: 8, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();
  }, [current]);

  const dismiss = (after?: () => void) => {
    Animated.parallel([
      Animated.timing(scale, { toValue: 0.85, duration: 180, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start(() => { setCurrent(null); after?.(); });
  };

  if (!current) return null;

  const isLevel = current.type === 'level';
  const levelDef = isLevel ? getLevelForXP(totalXP) : null;
  const levelName = isLevel ? ((LEVEL_NAMES[language] ?? LEVEL_NAMES.en)[`level_${current.value}`] ?? '') : '';
  const bg = isDark ? '#161009' : '#FFFDF6';
  const border = gold + '55';

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={() => dismiss()}>
      <TouchableOpacity activeOpacity={1} onPress={() => dismiss()} style={s.backdrop}>
        <Animated.View style={[s.card, { backgroundColor: bg, borderColor: border, opacity, transform: [{ scale }] }]}>
          <LinearGradient colors={[gold + '18', 'transparent']} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={StyleSheet.absoluteFill} pointerEvents="none" />
          <SparkleBurst trigger={burst} color={gold} />

          {/* Icon medal */}
          <View style={[s.medal, { borderColor: gold + '55', backgroundColor: gold + '14' }]}>
            {isLevel
              ? <GameIcon iconKey={levelDef?.icon ?? 'star'} size={40} color={gold} />
              : <Ionicons name="flame" size={42} color={gold} />}
          </View>

          <Text style={[s.kicker, { color: gold }]}>{isLevel ? tx('levelUp') : tx('streak')}</Text>

          <Text style={[s.big, { color: theme.text }]}>
            {isLevel ? `${tx('level')} ${current.value}` : current.value}
          </Text>

          <Text style={[s.sub, { color: theme.subtext }]}>
            {isLevel ? levelName : tx('dayStreak')}
          </Text>

          <TouchableOpacity
            onPress={() => dismiss(() => useUiStore.getState().show('profile'))}
            activeOpacity={0.85}
            style={[s.cta, { backgroundColor: gold }]}
            accessibilityRole="button"
            accessibilityLabel={tx('view')}
          >
            <Text style={s.ctaText}>{tx('view')}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => dismiss()} activeOpacity={0.7} style={s.dismiss}>
            <Text style={[s.dismissText, { color: theme.subtext }]}>{tx('dismiss')}</Text>
          </TouchableOpacity>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.62)', alignItems: 'center', justifyContent: 'center', padding: 32 },
  card: {
    width: '100%', maxWidth: 320, borderRadius: 28, borderWidth: 1, paddingVertical: 30, paddingHorizontal: 24,
    alignItems: 'center', overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.4, shadowRadius: 30, elevation: 16,
  },
  medal: { width: 92, height: 92, borderRadius: 46, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  kicker: { fontSize: 12, fontWeight: '900', letterSpacing: 3, marginBottom: 6 },
  big: { fontSize: 34, fontWeight: '900', letterSpacing: -0.6, fontFamily: SERIF, textAlign: 'center' },
  sub: { fontSize: 14, fontWeight: '600', marginTop: 4, textAlign: 'center', opacity: 0.9 },
  cta: { alignSelf: 'stretch', paddingVertical: 14, borderRadius: 15, alignItems: 'center', marginTop: 22 },
  ctaText: { color: '#1a1208', fontWeight: '900', fontSize: 15, letterSpacing: 0.3 },
  dismiss: { paddingVertical: 12, marginTop: 2 },
  dismissText: { fontSize: 13, fontWeight: '700', opacity: 0.7 },
});
