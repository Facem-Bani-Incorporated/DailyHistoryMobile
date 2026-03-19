// components/AchievementsModal.tsx
// ═══════════════════════════════════════════════════════════════════════════════
//  ACHIEVEMENTS — Full-screen modal showing all badges with animations
// ═══════════════════════════════════════════════════════════════════════════════

import { Award, Lock, X } from 'lucide-react-native';
import React, { useEffect, useRef } from 'react';
import {
    Animated,
    Easing,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import {
    ACHIEVEMENT_DESCS,
    ACHIEVEMENT_NAMES,
    ACHIEVEMENTS,
    useGamificationStore,
    type AchievementDef,
} from '../store/useGamificationStore';

// ── i18n ──
const T: Record<string, Record<string, string>> = {
  en: {
    title: 'Achievements',
    unlocked: 'UNLOCKED',
    locked: 'LOCKED',
    of: 'of',
    earned: 'earned',
    reading: 'Reading',
    streak: 'Streak',
    explorer: 'Explorer',
    dedication: 'Dedication',
  },
  ro: {
    title: 'Realizări',
    unlocked: 'DEBLOCATE',
    locked: 'BLOCATE',
    of: 'din',
    earned: 'obținute',
    reading: 'Citire',
    streak: 'Streak',
    explorer: 'Explorator',
    dedication: 'Dedicare',
  },
  fr: {
    title: 'Succès',
    unlocked: 'DÉBLOQUÉS',
    locked: 'VERROUILLÉS',
    of: 'sur',
    earned: 'obtenus',
    reading: 'Lecture',
    streak: 'Série',
    explorer: 'Explorateur',
    dedication: 'Dévotion',
  },
  de: {
    title: 'Erfolge',
    unlocked: 'FREIGESCHALTET',
    locked: 'GESPERRT',
    of: 'von',
    earned: 'erreicht',
    reading: 'Lesen',
    streak: 'Streak',
    explorer: 'Entdecker',
    dedication: 'Hingabe',
  },
  es: {
    title: 'Logros',
    unlocked: 'DESBLOQUEADOS',
    locked: 'BLOQUEADOS',
    of: 'de',
    earned: 'obtenidos',
    reading: 'Lectura',
    streak: 'Racha',
    explorer: 'Explorador',
    dedication: 'Dedicación',
  },
};
const tx = (lang: string, key: string) => (T[lang] ?? T.en)[key] ?? T.en[key] ?? key;

// ── Badge component ──
const AchievementBadge = ({
  achievement,
  isUnlocked,
  isNew,
  date,
  index,
  isDark,
  language,
  theme,
}: {
  achievement: AchievementDef;
  isUnlocked: boolean;
  isNew: boolean;
  date?: string;
  index: number;
  isDark: boolean;
  language: string;
  theme: any;
}) => {
  const scaleIn = useRef(new Animated.Value(0.6)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0)).current;

  const name = (ACHIEVEMENT_NAMES[language] ?? ACHIEVEMENT_NAMES.en)[achievement.id] ?? achievement.id;
  const desc = (ACHIEVEMENT_DESCS[language] ?? ACHIEVEMENT_DESCS.en)[achievement.id] ?? '';

  useEffect(() => {
    const delay = index * 60;
    Animated.parallel([
      Animated.spring(scaleIn, {
        toValue: 1,
        tension: 80,
        friction: 8,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(fadeIn, {
        toValue: 1,
        duration: 400,
        delay,
        useNativeDriver: true,
      }),
    ]).start();

    if (isNew) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(glow, { toValue: 1, duration: 1000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(glow, { toValue: 0, duration: 1200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
      ).start();
    }
  }, []);

  const cardBg = isUnlocked
    ? (isDark ? '#1A1610' : '#FFFCF5')
    : (isDark ? '#0D0B09' : '#F8F6F2');
  const borderClr = isUnlocked
    ? (isDark ? '#3D2A14' : '#F0D8A8')
    : (isDark ? '#1A1612' : '#E8E2D8');

  const glowOpacity = glow.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.5],
  });

  return (
    <Animated.View style={[
      bs.card,
      {
        backgroundColor: cardBg,
        borderColor: borderClr,
        opacity: fadeIn,
        transform: [{ scale: scaleIn }],
      },
    ]}>
      {/* New glow ring */}
      {isNew && (
        <Animated.View style={[bs.newGlow, { opacity: glowOpacity }]} />
      )}

      {/* Icon */}
      <View style={[bs.iconWrap, {
        backgroundColor: isUnlocked ? '#FFB30015' : (isDark ? '#1A161205' : '#00000008'),
      }]}>
        {isUnlocked ? (
          <Text style={bs.icon}>{achievement.icon}</Text>
        ) : (
          <Lock size={20} color={isDark ? '#3D3020' : '#C0B8A8'} strokeWidth={1.5} />
        )}
      </View>

      {/* Info */}
      <View style={bs.info}>
        <Text style={[bs.name, {
          color: isUnlocked ? theme.text : (isDark ? '#4A3D2E' : '#B0A890'),
        }]}>{name}</Text>
        <Text style={[bs.desc, {
          color: isUnlocked ? theme.subtext : (isDark ? '#3A2E20' : '#C8C0B0'),
        }]}>{desc}</Text>
      </View>

      {/* Status */}
      {isUnlocked && date && (
        <Text style={[bs.date, { color: isDark ? '#5A4D38' : '#B0A080' }]}>
          {date.split('-').reverse().join('.')}
        </Text>
      )}
      {isNew && (
        <View style={bs.newBadge}>
          <Text style={bs.newText}>NEW</Text>
        </View>
      )}
    </Animated.View>
  );
};

const bs = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
    position: 'relative',
    overflow: 'hidden',
  },
  newGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#FFB300',
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { fontSize: 22 },
  info: { flex: 1, gap: 2 },
  name: { fontSize: 14, fontWeight: '700', letterSpacing: -0.2 },
  desc: { fontSize: 11, fontWeight: '500', lineHeight: 16, opacity: 0.6 },
  date: { fontSize: 9, fontWeight: '600', letterSpacing: 0.3 },
  newBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#FF6D00',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  newText: { fontSize: 8, fontWeight: '900', color: '#FFF', letterSpacing: 0.8 },
});

// ── Main Modal ──
export default function AchievementsModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { theme, isDark } = useTheme();
  const { language } = useLanguage();
  const insets = useSafeAreaInsets();
  const getAchievements = useGamificationStore(s => s.getAchievements);
  const achievementDates = useGamificationStore(s => s.achievementDates);
  const markAchievementsSeen = useGamificationStore(s => s.markAchievementsSeen);

  const { unlocked, locked, newIds } = getAchievements();

  const bg = isDark ? '#0D0A07' : '#FBF7F0';
  const cardBrd = isDark ? '#251E16' : '#EDE5D8';
  const gold = isDark ? '#E8B84D' : '#C77E08';

  // Mark achievements as seen when modal closes
  const handleClose = () => {
    markAchievementsSeen();
    onClose();
  };

  // Group by category
  const categories: AchievementDef['category'][] = ['reading', 'streak', 'explorer', 'dedication'];

  return (
    <Modal visible={visible} animationType="slide" transparent={false} statusBarTranslucent>
      <View style={[ms.root, { backgroundColor: bg, paddingTop: insets.top }]}>
        {/* Header */}
        <View style={ms.hdr}>
          <View style={{ width: 40 }} />
          <View style={{ alignItems: 'center' }}>
            <Text style={[ms.hdrTitle, { color: theme.text }]}>{tx(language, 'title')}</Text>
            <Text style={[ms.hdrSub, { color: gold }]}>
              {unlocked.length} {tx(language, 'of')} {ACHIEVEMENTS.length} {tx(language, 'earned')}
            </Text>
          </View>
          <TouchableOpacity onPress={handleClose} hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
            style={[ms.xBtn, { backgroundColor: isDark ? '#1C1612' : '#F5EFE5', borderColor: cardBrd }]}>
            <X size={16} color={theme.subtext} strokeWidth={2.5} />
          </TouchableOpacity>
        </View>

        {/* Progress overview */}
        <View style={[ms.overview, { backgroundColor: isDark ? '#141210' : '#FFFFFF', borderColor: cardBrd }]}>
          <Award size={20} color={gold} strokeWidth={2} />
          <View style={ms.overviewBar}>
            <View style={[ms.overviewTrack, { backgroundColor: isDark ? '#1C1612' : '#F0E8DA' }]}>
              <View style={[ms.overviewFill, {
                backgroundColor: gold,
                width: `${(unlocked.length / ACHIEVEMENTS.length) * 100}%` as any,
              }]} />
            </View>
          </View>
          <Text style={[ms.overviewText, { color: gold }]}>
            {Math.round((unlocked.length / ACHIEVEMENTS.length) * 100)}%
          </Text>
        </View>

        <ScrollView contentContainerStyle={[ms.scroll, { paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false}>
          {categories.map(cat => {
            const catAchievements = ACHIEVEMENTS.filter(a => a.category === cat);
            const catUnlocked = catAchievements.filter(a => unlocked.some(u => u.id === a.id));
            let globalIndex = 0;

            return (
              <View key={cat} style={ms.section}>
                <View style={ms.secHeader}>
                  <Text style={[ms.secTitle, { color: gold }]}>
                    {tx(language, cat).toUpperCase()}
                  </Text>
                  <Text style={[ms.secCount, { color: theme.subtext }]}>
                    {catUnlocked.length}/{catAchievements.length}
                  </Text>
                </View>
                <View style={ms.secList}>
                  {catAchievements.map((ach) => {
                    const isUnlocked = unlocked.some(u => u.id === ach.id);
                    const isNew = newIds.includes(ach.id);
                    const date = achievementDates[ach.id];
                    globalIndex++;
                    return (
                      <AchievementBadge
                        key={ach.id}
                        achievement={ach}
                        isUnlocked={isUnlocked}
                        isNew={isNew}
                        date={date}
                        index={globalIndex}
                        isDark={isDark}
                        language={language}
                        theme={theme}
                      />
                    );
                  })}
                </View>
              </View>
            );
          })}
        </ScrollView>
      </View>
    </Modal>
  );
}

const ms = StyleSheet.create({
  root: { flex: 1 },
  hdr: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
  },
  hdrTitle: { fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  hdrSub: { fontSize: 10, fontWeight: '700', letterSpacing: 1, marginTop: 2, textTransform: 'uppercase' },
  xBtn: {
    width: 40, height: 40, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1,
  },
  overview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  overviewBar: { flex: 1 },
  overviewTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  overviewFill: { height: 6, borderRadius: 3 },
  overviewText: { fontSize: 13, fontWeight: '800', letterSpacing: -0.3 },
  scroll: { paddingHorizontal: 20 },
  section: { marginBottom: 24 },
  secHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  secTitle: { fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  secCount: { fontSize: 11, fontWeight: '600', opacity: 0.4 },
  secList: { gap: 8 },
});