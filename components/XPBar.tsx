// components/XPBar.tsx
// ═══════════════════════════════════════════════════════════════════════════════
//  XP LEVEL BAR — Compact header widget showing level + XP progress
//  Features: animated fill, level badge, streak multiplier indicator,
//  tap to expand with today's XP details
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
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import {
    LEVEL_NAMES,
    useGamificationStore,
} from '../store/useGamificationStore';

// ── i18n ──
const T: Record<string, Record<string, string>> = {
  en: { xp: 'XP', today: 'Today', level: 'Lvl', multiplier: 'Streak bonus', nextLevel: 'Next level' },
  ro: { xp: 'XP', today: 'Azi', level: 'Niv', multiplier: 'Bonus streak', nextLevel: 'Nivelul următor' },
  fr: { xp: 'XP', today: "Aujourd'hui", level: 'Niv', multiplier: 'Bonus série', nextLevel: 'Prochain niveau' },
  de: { xp: 'XP', today: 'Heute', level: 'Lvl', multiplier: 'Streak-Bonus', nextLevel: 'Nächstes Level' },
  es: { xp: 'XP', today: 'Hoy', level: 'Niv', multiplier: 'Bono racha', nextLevel: 'Siguiente nivel' },
};
const tx = (lang: string, key: string) => (T[lang] ?? T.en)[key] ?? T.en[key] ?? key;

export default function XPBar() {
  const { theme, isDark } = useTheme();
  const { language } = useLanguage();
  const getXPInfo = useGamificationStore(s => s.getXPInfo);
  const totalXP = useGamificationStore(s => s.totalXP);
  const todayXP = useGamificationStore(s => s.todayXP);
  const currentStreak = useGamificationStore(s => s.currentStreak);

  const info = getXPInfo();
  const { level, progress, multiplier } = info;
  const levelName = (LEVEL_NAMES[language] ?? LEVEL_NAMES.en)[level.nameKey] ?? '';

  const [expanded, setExpanded] = useState(false);

  // Animated progress bar
  const barWidth = useRef(new Animated.Value(0)).current;
  const shimmer = useRef(new Animated.Value(0)).current;
  const expandAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(barWidth, {
      toValue: progress.percent,
      duration: 800,
      easing: Easing.out(Easing.exp),
      useNativeDriver: false,
    }).start();
  }, [progress.percent]);

  // Shimmer on the progress bar
  useEffect(() => {
    Animated.loop(
      Animated.timing(shimmer, {
        toValue: 1,
        duration: 2000,
        easing: Easing.inOut(Easing.sin),
        useNativeDriver: true,
      }),
    ).start();
  }, []);

  useEffect(() => {
    Animated.spring(expandAnim, {
      toValue: expanded ? 1 : 0,
      tension: 200,
      friction: 20,
      useNativeDriver: false,
    }).start();
  }, [expanded]);

  const expandedHeight = expandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 48],
  });

  const shimmerOpacity = shimmer.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.3, 0.7, 0.3],
  });

  const accentColor = isDark ? '#FFB300' : '#F59E0B';
  const trackColor = isDark ? '#1C1612' : '#F0E8DA';
  const cardBg = isDark ? '#141210' : '#FFFCF7';
  const borderColor = isDark ? '#251E16' : '#EDE5D8';

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => setExpanded(!expanded)}
      style={[s.container, { backgroundColor: cardBg, borderColor }]}
    >
      {/* Top row: level badge + bar + XP count */}
      <View style={s.topRow}>
        {/* Level badge */}
        <View style={[s.levelBadge, { backgroundColor: accentColor + '20', borderColor: accentColor + '40' }]}>
          <Text style={s.levelIcon}>{level.icon}</Text>
          <Text style={[s.levelNum, { color: accentColor }]}>{level.level}</Text>
        </View>

        {/* Progress bar */}
        <View style={s.barContainer}>
          <View style={[s.barTrack, { backgroundColor: trackColor }]}>
            <Animated.View
              style={[s.barFill, {
                backgroundColor: accentColor,
                width: barWidth.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                }),
              }]}
            >
              <Animated.View style={[s.barShimmer, { opacity: shimmerOpacity }]} />
            </Animated.View>
          </View>
          <Text style={[s.barLabel, { color: theme.subtext }]}>
            {progress.current}/{progress.needed} {tx(language, 'xp')}
          </Text>
        </View>

        {/* Multiplier badge */}
        {multiplier > 1 && (
          <View style={[s.multiBadge, { backgroundColor: '#FF6D00' + '20' }]}>
            <Text style={[s.multiText, { color: '#FF6D00' }]}>×{multiplier.toFixed(1)}</Text>
          </View>
        )}
      </View>

      {/* Expanded details */}
      <Animated.View style={[s.expandedRow, { height: expandedHeight, opacity: expandAnim }]}>
        <View style={s.expandedInner}>
          <View style={s.statItem}>
            <Text style={[s.statValue, { color: theme.text }]}>{totalXP.toLocaleString()}</Text>
            <Text style={[s.statLabel, { color: theme.subtext }]}>Total {tx(language, 'xp')}</Text>
          </View>
          <View style={[s.statDivider, { backgroundColor: borderColor }]} />
          <View style={s.statItem}>
            <Text style={[s.statValue, { color: accentColor }]}>+{todayXP}</Text>
            <Text style={[s.statLabel, { color: theme.subtext }]}>{tx(language, 'today')}</Text>
          </View>
          <View style={[s.statDivider, { backgroundColor: borderColor }]} />
          <View style={s.statItem}>
            <Text style={[s.statValue, { color: theme.text }]}>{levelName}</Text>
            <Text style={[s.statLabel, { color: theme.subtext }]}>{tx(language, 'level')} {level.level}</Text>
          </View>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  container: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
  },
  levelIcon: { fontSize: 14 },
  levelNum: { fontSize: 12, fontWeight: '900', letterSpacing: -0.5 },
  barContainer: {
    flex: 1,
    gap: 3,
  },
  barTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  barShimmer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FFFFFF40',
  },
  barLabel: {
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  multiBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  multiText: {
    fontSize: 11,
    fontWeight: '800',
  },
  expandedRow: {
    overflow: 'hidden',
  },
  expandedInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: 10,
  },
  statItem: {
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.3,
    opacity: 0.5,
    textTransform: 'uppercase',
  },
  statDivider: {
    width: 1,
    height: 24,
  },
});