// components/AchievementsModal.tsx
// ═══════════════════════════════════════════════════════════════════════════════
//  ACHIEVEMENTS — Trophy-hall modal with hero stats and categorized grid
// ═══════════════════════════════════════════════════════════════════════════════

import { LinearGradient } from 'expo-linear-gradient';
import { Award, BookOpen, Compass, Flame, Lock, Sparkles, Trophy, X } from 'lucide-react-native';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
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

const SERIF = Platform.OS === 'ios' ? 'Georgia' : 'serif';

// ── i18n ──
const T: Record<string, Record<string, string>> = {
  en: { title: 'Achievements', subtitle: 'Trophy Hall', of: 'of', earned: 'earned', complete: 'COMPLETE',
        all: 'All', reading: 'Reading', streak: 'Streak', explorer: 'Explorer', dedication: 'Dedication',
        unlocked_on: 'Unlocked', locked_hint: 'Keep exploring to unlock', legendary: 'LEGENDARY',
        epic: 'EPIC', rare: 'RARE', common: 'COMMON' },
  ro: { title: 'Realizări', subtitle: 'Sala Trofeelor', of: 'din', earned: 'obținute', complete: 'COMPLET',
        all: 'Toate', reading: 'Citire', streak: 'Streak', explorer: 'Explorator', dedication: 'Dedicare',
        unlocked_on: 'Deblocat', locked_hint: 'Continuă să explorezi', legendary: 'LEGENDAR',
        epic: 'EPIC', rare: 'RAR', common: 'COMUN' },
  fr: { title: 'Succès', subtitle: 'Salle des Trophées', of: 'sur', earned: 'obtenus', complete: 'TERMINÉ',
        all: 'Tous', reading: 'Lecture', streak: 'Série', explorer: 'Explorateur', dedication: 'Dévotion',
        unlocked_on: 'Débloqué', locked_hint: 'Continuez à explorer', legendary: 'LÉGENDAIRE',
        epic: 'ÉPIQUE', rare: 'RARE', common: 'COMMUN' },
  de: { title: 'Erfolge', subtitle: 'Trophäensaal', of: 'von', earned: 'erreicht', complete: 'KOMPLETT',
        all: 'Alle', reading: 'Lesen', streak: 'Streak', explorer: 'Entdecker', dedication: 'Hingabe',
        unlocked_on: 'Freigeschaltet', locked_hint: 'Erkunde weiter', legendary: 'LEGENDÄR',
        epic: 'EPISCH', rare: 'SELTEN', common: 'HÄUFIG' },
  es: { title: 'Logros', subtitle: 'Sala de Trofeos', of: 'de', earned: 'obtenidos', complete: 'COMPLETO',
        all: 'Todos', reading: 'Lectura', streak: 'Racha', explorer: 'Explorador', dedication: 'Dedicación',
        unlocked_on: 'Desbloqueado', locked_hint: 'Sigue explorando', legendary: 'LEGENDARIO',
        epic: 'ÉPICO', rare: 'RARO', common: 'COMÚN' },
};
const tx = (lang: string, key: string) => (T[lang] ?? T.en)[key] ?? T.en[key] ?? key;

// ── Category metadata ──
type CatKey = 'reading' | 'streak' | 'explorer' | 'dedication';
const CAT_META: Record<CatKey, { color: string; icon: any; tier: number }> = {
  reading:    { color: '#3E7BFA', icon: BookOpen, tier: 2 },
  streak:     { color: '#FF8F00', icon: Flame,    tier: 3 },
  explorer:   { color: '#10B981', icon: Compass,  tier: 3 },
  dedication: { color: '#A855F7', icon: Trophy,   tier: 4 },
};

const tierLabel = (tier: number, lang: string) =>
  tier >= 4 ? tx(lang, 'legendary') : tier === 3 ? tx(lang, 'epic') : tier === 2 ? tx(lang, 'rare') : tx(lang, 'common');

// ── Hero circular progress (pure View, no SVG dep) ──
const HeroProgress = ({ percent, gold, isDark, label }: {
  percent: number; gold: string; isDark: boolean; label: string;
}) => {
  const fillAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fillAnim, {
      toValue: percent / 100,
      duration: 1200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [percent]);

  return (
    <View style={hs.wrap}>
      <View style={[hs.ringOuter, { borderColor: gold + '20' }]}>
        <View style={[hs.ringMid, { borderColor: gold + '40' }]}>
          <View style={[hs.ringInner, { backgroundColor: isDark ? '#0F0D0A' : '#FFFDF6' }]}>
            <Text style={[hs.percent, { color: gold }]}>{Math.round(percent)}</Text>
            <Text style={[hs.percentSign, { color: gold }]}>%</Text>
            <Text style={[hs.percentLabel, { color: gold + 'AA' }]}>{label}</Text>
          </View>
        </View>
      </View>

      {/* Animated outer progress arc (simplified as bar at bottom) */}
      <Animated.View style={[hs.arcBar, {
        backgroundColor: gold,
        width: fillAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
      }]} />
    </View>
  );
};

const hs = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  ringOuter: {
    width: 112, height: 112, borderRadius: 56, borderWidth: 1.5,
    padding: 5, alignItems: 'center', justifyContent: 'center',
  },
  ringMid: {
    flex: 1, alignSelf: 'stretch', borderRadius: 50, borderWidth: 1,
    padding: 4, alignItems: 'center', justifyContent: 'center',
  },
  ringInner: {
    flex: 1, alignSelf: 'stretch', borderRadius: 46,
    alignItems: 'center', justifyContent: 'center',
  },
  percent: { fontSize: 32, fontWeight: '900', letterSpacing: -1, fontFamily: SERIF, lineHeight: 36 },
  percentSign: { position: 'absolute', top: 28, right: 22, fontSize: 14, fontWeight: '800', opacity: 0.7 },
  percentLabel: { fontSize: 8.5, fontWeight: '800', letterSpacing: 1.8, marginTop: -2 },
  arcBar: { height: 2, borderRadius: 1, marginTop: 12, alignSelf: 'stretch', maxWidth: 112 },
});

// ── Badge component ──
const AchievementBadge = ({
  achievement, isUnlocked, isNew, date, index, isDark, language, theme, gold,
}: {
  achievement: AchievementDef;
  isUnlocked: boolean; isNew: boolean; date?: string;
  index: number; isDark: boolean; language: string; theme: any; gold: string;
}) => {
  const scaleIn = useRef(new Animated.Value(0.85)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0)).current;

  const name = (ACHIEVEMENT_NAMES[language] ?? ACHIEVEMENT_NAMES.en)[achievement.id] ?? achievement.id;
  const desc = (ACHIEVEMENT_DESCS[language] ?? ACHIEVEMENT_DESCS.en)[achievement.id] ?? '';
  const meta = CAT_META[achievement.category as CatKey] ?? CAT_META.reading;
  const CatIcon = meta.icon;

  useEffect(() => {
    const delay = Math.min(index * 40, 400);
    Animated.parallel([
      Animated.spring(scaleIn, { toValue: 1, tension: 90, friction: 10, delay, useNativeDriver: true }),
      Animated.timing(fadeIn, { toValue: 1, duration: 360, delay, useNativeDriver: true }),
    ]).start();

    if (isNew) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(glow, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
          Animated.timing(glow, { toValue: 0, duration: 1300, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
        ]),
      ).start();
    }
  }, []);

  const cardBg = isUnlocked
    ? (isDark ? '#17130C' : '#FFFDF6')
    : (isDark ? '#0C0B08' : '#F7F5F0');
  const borderClr = isUnlocked
    ? meta.color + '35'
    : (isDark ? '#1A1612' : '#EBE6DC');

  const glowBorder = glow.interpolate({ inputRange: [0, 1], outputRange: [meta.color + '30', meta.color + 'A0'] });

  return (
    <Animated.View style={[
      bs.card,
      {
        backgroundColor: cardBg,
        borderColor: isNew ? glowBorder : borderClr,
        opacity: fadeIn,
        transform: [{ scale: scaleIn }],
      },
    ]}>
      {/* Accent bar on left */}
      {isUnlocked && (
        <View style={[bs.accentBar, { backgroundColor: meta.color }]} />
      )}

      {/* Icon medal */}
      <View style={[bs.medalOuter, {
        borderColor: isUnlocked ? meta.color + '50' : (isDark ? '#2A241C' : '#E5DFD4'),
      }]}>
        <View style={[bs.medalInner, {
          backgroundColor: isUnlocked ? meta.color + '15' : (isDark ? '#14110D' : '#F0EBE0'),
        }]}>
          {isUnlocked ? (
            <Text style={bs.icon}>{achievement.icon}</Text>
          ) : (
            <Lock size={18} color={isDark ? '#3D3325' : '#BDB4A0'} strokeWidth={1.8} />
          )}
        </View>
      </View>

      {/* Info */}
      <View style={bs.info}>
        <View style={bs.tagRow}>
          <CatIcon size={9} color={isUnlocked ? meta.color : theme.subtext + '80'} strokeWidth={2.5} />
          <Text style={[bs.tagText, {
            color: isUnlocked ? meta.color : theme.subtext + '90',
          }]}>{tierLabel(meta.tier, language)}</Text>
          {/* Star tier */}
          <View style={bs.starsRow}>
            {Array.from({ length: 4 }).map((_, i) => (
              <View key={i} style={[bs.starDot, {
                backgroundColor: i < meta.tier
                  ? (isUnlocked ? meta.color : theme.subtext + '40')
                  : (isUnlocked ? meta.color + '25' : theme.subtext + '15'),
              }]} />
            ))}
          </View>
        </View>
        <Text numberOfLines={1} style={[bs.name, {
          color: isUnlocked ? theme.text : (isDark ? '#4A3F30' : '#A89F8E'),
        }]}>{name}</Text>
        <Text numberOfLines={2} style={[bs.desc, {
          color: isUnlocked ? theme.subtext : (isDark ? '#352E22' : '#C0B7A8'),
        }]}>{desc}</Text>

        {/* Bottom line: date or locked hint */}
        <View style={bs.bottomRow}>
          {isUnlocked && date ? (
            <>
              <View style={[bs.dot, { backgroundColor: meta.color }]} />
              <Text style={[bs.date, { color: theme.subtext + 'B0' }]}>
                {tx(language, 'unlocked_on')} · {date.split('-').reverse().join('.')}
              </Text>
            </>
          ) : !isUnlocked ? (
            <>
              <Lock size={8} color={theme.subtext + '60'} strokeWidth={2.5} />
              <Text style={[bs.date, { color: theme.subtext + '80', fontStyle: 'italic' }]}>
                {tx(language, 'locked_hint')}
              </Text>
            </>
          ) : null}
        </View>
      </View>

      {/* NEW ribbon */}
      {isNew && (
        <View style={[bs.newBadge, { backgroundColor: meta.color }]}>
          <Sparkles size={8} color="#FFF" strokeWidth={3} />
          <Text style={bs.newText}>NEW</Text>
        </View>
      )}
    </Animated.View>
  );
};

const bs = StyleSheet.create({
  card: {
    flexDirection: 'row',
    padding: 14,
    paddingLeft: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
    position: 'relative',
    overflow: 'hidden',
  },
  accentBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3 },
  medalOuter: {
    width: 50, height: 50, borderRadius: 16, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center', padding: 3,
  },
  medalInner: {
    flex: 1, alignSelf: 'stretch', borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  icon: { fontSize: 22 },
  info: { flex: 1, gap: 3, paddingTop: 1 },
  tagRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  tagText: { fontSize: 8.5, fontWeight: '900', letterSpacing: 1.4 },
  starsRow: { flexDirection: 'row', gap: 2.5, marginLeft: 4, alignItems: 'center' },
  starDot: { width: 4.5, height: 4.5, borderRadius: 2.5 },
  name: { fontSize: 14.5, fontWeight: '800', letterSpacing: -0.3, fontFamily: SERIF, marginTop: 2 },
  desc: { fontSize: 11, fontWeight: '500', lineHeight: 15.5, opacity: 0.75 },
  bottomRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
  dot: { width: 4, height: 4, borderRadius: 2 },
  date: { fontSize: 9.5, fontWeight: '600', letterSpacing: 0.2 },
  newBadge: {
    position: 'absolute', top: 10, right: 10,
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6,
  },
  newText: { fontSize: 8, fontWeight: '900', color: '#FFF', letterSpacing: 0.8 },
});

// ══════════════════════════════════════════════════════════════════════════════
// MAIN MODAL
// ══════════════════════════════════════════════════════════════════════════════
export default function AchievementsModal({
  visible, onClose,
}: { visible: boolean; onClose: () => void }) {
  const { theme, isDark } = useTheme();
  const { language } = useLanguage();
  const insets = useSafeAreaInsets();
  const getAchievements = useGamificationStore(s => s.getAchievements);
  const achievementDates = useGamificationStore(s => s.achievementDates);
  const markAchievementsSeen = useGamificationStore(s => s.markAchievementsSeen);

  const { unlocked, newIds } = getAchievements();
  const [filter, setFilter] = useState<'all' | CatKey>('all');

  const gold = isDark ? '#E8B84D' : '#C77E08';
  const bg = isDark ? '#0D0A07' : '#FBF7F0';
  const cardBrd = isDark ? '#251E16' : '#EDE5D8';

  const handleClose = () => { markAchievementsSeen(); onClose(); };

  // Stats
  const totalCount = ACHIEVEMENTS.length;
  const unlockedCount = unlocked.length;
  const percent = totalCount > 0 ? (unlockedCount / totalCount) * 100 : 0;
  const xpEarned = unlockedCount * 100; // 100 XP each (matches toast)

  // Category stats
  const catStats = useMemo(() => {
    const stats: Record<CatKey, { total: number; unlocked: number }> = {
      reading: { total: 0, unlocked: 0 }, streak: { total: 0, unlocked: 0 },
      explorer: { total: 0, unlocked: 0 }, dedication: { total: 0, unlocked: 0 },
    };
    for (const a of ACHIEVEMENTS) {
      const k = a.category as CatKey;
      if (stats[k]) {
        stats[k].total++;
        if (unlocked.some(u => u.id === a.id)) stats[k].unlocked++;
      }
    }
    return stats;
  }, [unlocked]);

  // Filtered list
  const filteredAchievements = useMemo(() => {
    const list = filter === 'all' ? ACHIEVEMENTS : ACHIEVEMENTS.filter(a => a.category === filter);
    // Unlocked first, then new, then locked
    return [...list].sort((a, b) => {
      const au = unlocked.some(u => u.id === a.id) ? 1 : 0;
      const bu = unlocked.some(u => u.id === b.id) ? 1 : 0;
      if (au !== bu) return bu - au;
      const an = newIds.includes(a.id) ? 1 : 0;
      const bn = newIds.includes(b.id) ? 1 : 0;
      return bn - an;
    });
  }, [filter, unlocked, newIds]);

  const categories: ('all' | CatKey)[] = ['all', 'reading', 'streak', 'explorer', 'dedication'];

  return (
    <Modal visible={visible} animationType="slide" transparent={false} statusBarTranslucent>
      <View style={[ms.root, { backgroundColor: bg, paddingTop: insets.top }]}>

        {/* Header */}
        <View style={ms.hdr}>
          <View style={{ width: 38 }} />
          <View style={ms.hdrCenter}>
            <Text style={[ms.hdrKicker, { color: gold }]}>{tx(language, 'subtitle').toUpperCase()}</Text>
            <Text style={[ms.hdrTitle, { color: theme.text }]}>{tx(language, 'title')}</Text>
          </View>
          <TouchableOpacity onPress={handleClose} hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
            style={[ms.xBtn, { backgroundColor: isDark ? '#1C1612' : '#FFFFFF', borderColor: cardBrd }]}>
            <X size={16} color={theme.subtext} strokeWidth={2.5} />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={[ms.scroll, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* HERO CARD */}
          <View style={[ms.hero, { backgroundColor: isDark ? '#141108' : '#FFFFFF', borderColor: gold + '28' }]}>
            <LinearGradient
              colors={[gold + '15', 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />

            {/* Decorative corner ornaments */}
            <View style={[ms.cornerDeco, ms.cornerTL, { borderColor: gold + '60' }]} />
            <View style={[ms.cornerDeco, ms.cornerTR, { borderColor: gold + '60' }]} />
            <View style={[ms.cornerDeco, ms.cornerBL, { borderColor: gold + '60' }]} />
            <View style={[ms.cornerDeco, ms.cornerBR, { borderColor: gold + '60' }]} />

            <View style={ms.heroRow}>
              <HeroProgress
                percent={percent}
                gold={gold}
                isDark={isDark}
                label={tx(language, 'complete')}
              />

              <View style={ms.heroStats}>
                <StatLine
                  icon={<Award size={14} color={gold} strokeWidth={2.2} />}
                  value={`${unlockedCount} / ${totalCount}`}
                  label={tx(language, 'earned').toUpperCase()}
                  theme={theme} gold={gold}
                />
                <View style={[ms.statDivider, { backgroundColor: cardBrd }]} />
                <StatLine
                  icon={<Sparkles size={14} color={gold} strokeWidth={2.2} />}
                  value={`+${xpEarned.toLocaleString()}`}
                  label="XP"
                  theme={theme} gold={gold}
                />
                <View style={[ms.statDivider, { backgroundColor: cardBrd }]} />
                <StatLine
                  icon={<Trophy size={14} color={gold} strokeWidth={2.2} />}
                  value={`${newIds.length}`}
                  label="NEW"
                  theme={theme} gold={gold}
                />
              </View>
            </View>
          </View>

          {/* CATEGORY FILTER PILLS */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={ms.pillsRow}
          >
            {categories.map((c) => {
              const active = filter === c;
              const meta = c === 'all' ? null : CAT_META[c as CatKey];
              const pillColor = meta ? meta.color : gold;
              const Icon = meta ? meta.icon : Award;
              const count = c === 'all'
                ? unlockedCount
                : catStats[c as CatKey]?.unlocked ?? 0;
              const total = c === 'all'
                ? totalCount
                : catStats[c as CatKey]?.total ?? 0;

              return (
                <TouchableOpacity
                  key={c}
                  onPress={() => setFilter(c)}
                  activeOpacity={0.7}
                  style={[ms.pill, {
                    backgroundColor: active ? pillColor + '12' : (isDark ? '#141108' : '#FFFFFF'),
                    borderColor: active ? pillColor + '55' : cardBrd,
                  }]}
                >
                  <Icon size={12} color={active ? pillColor : theme.subtext + 'B0'} strokeWidth={2.3} />
                  <Text style={[ms.pillText, {
                    color: active ? pillColor : theme.subtext,
                  }]}>
                    {tx(language, c)}
                  </Text>
                  <View style={[ms.pillCount, {
                    backgroundColor: active ? pillColor + '22' : (isDark ? '#201A13' : '#F5EFE4'),
                  }]}>
                    <Text style={[ms.pillCountText, {
                      color: active ? pillColor : theme.subtext + '90',
                    }]}>
                      {count}/{total}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* ACHIEVEMENT LIST */}
          <View style={ms.list}>
            {filteredAchievements.map((ach, idx) => {
              const isUnlocked = unlocked.some(u => u.id === ach.id);
              const isNew = newIds.includes(ach.id);
              const date = achievementDates[ach.id];
              return (
                <AchievementBadge
                  key={ach.id}
                  achievement={ach}
                  isUnlocked={isUnlocked}
                  isNew={isNew}
                  date={date}
                  index={idx}
                  isDark={isDark}
                  language={language}
                  theme={theme}
                  gold={gold}
                />
              );
            })}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

// Small stat line helper
const StatLine = ({ icon, value, label, theme, gold }: any) => (
  <View style={ms.stat}>
    <View style={ms.statTop}>
      {icon}
      <Text style={[ms.statValue, { color: theme.text }]}>{value}</Text>
    </View>
    <Text style={[ms.statLabel, { color: theme.subtext }]}>{label}</Text>
  </View>
);

const ms = StyleSheet.create({
  root: { flex: 1 },

  // Header
  hdr: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
  },
  hdrCenter: { alignItems: 'center' },
  hdrKicker: { fontSize: 9, fontWeight: '900', letterSpacing: 2.2 },
  hdrTitle: { fontSize: 19, fontWeight: '800', letterSpacing: -0.4, fontFamily: SERIF, marginTop: 2 },
  xBtn: {
    width: 38, height: 38, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1,
  },

  scroll: { paddingHorizontal: 20 },

  // Hero
  hero: {
    borderRadius: 20, borderWidth: 1,
    paddingVertical: 20, paddingHorizontal: 18,
    marginBottom: 18, overflow: 'hidden',
  },
  cornerDeco: { position: 'absolute', width: 16, height: 16 },
  cornerTL: { top: 8, left: 8, borderLeftWidth: 1, borderTopWidth: 1, borderTopLeftRadius: 4 },
  cornerTR: { top: 8, right: 8, borderRightWidth: 1, borderTopWidth: 1, borderTopRightRadius: 4 },
  cornerBL: { bottom: 8, left: 8, borderLeftWidth: 1, borderBottomWidth: 1, borderBottomLeftRadius: 4 },
  cornerBR: { bottom: 8, right: 8, borderRightWidth: 1, borderBottomWidth: 1, borderBottomRightRadius: 4 },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  heroStats: { flex: 1, gap: 10 },
  stat: { gap: 2 },
  statTop: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  statValue: { fontSize: 15, fontWeight: '800', letterSpacing: -0.3, fontFamily: SERIF },
  statLabel: { fontSize: 8.5, fontWeight: '800', letterSpacing: 1.5, opacity: 0.55, marginLeft: 21 },
  statDivider: { height: StyleSheet.hairlineWidth, opacity: 0.6 },

  // Filter pills
  pillsRow: { flexDirection: 'row', gap: 8, paddingBottom: 16, paddingRight: 20 },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 12, borderWidth: 1,
  },
  pillText: { fontSize: 11.5, fontWeight: '700', letterSpacing: 0.2 },
  pillCount: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginLeft: 2 },
  pillCountText: { fontSize: 9.5, fontWeight: '800', letterSpacing: 0.3 },

  // List
  list: { gap: 10 },
});