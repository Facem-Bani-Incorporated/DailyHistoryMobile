// components/LeaderboardModal.tsx
// ═══════════════════════════════════════════════════════════════════════════════
//  LEADERBOARD — Esports-style ranking with tier system and stair-step podium
// ═══════════════════════════════════════════════════════════════════════════════

import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Crown, Trophy, X } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
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
import { pushToServer } from '../hooks/useGamificationSync';
import {
  fetchLeaderboard,
  LeaderboardEntry,
  LeaderboardType,
} from '../services/leaderboardService';

const SERIF = Platform.OS === 'ios' ? 'Georgia' : 'serif';

// ── Tab definitions ──
const TAB_META: Record<LeaderboardType, {
  icon: keyof typeof Ionicons.glyphMap; color: string; glow: string; labelKey: string;
}> = {
  xp:      { icon: 'star',    color: '#FFB300', glow: '#FFC43D', labelKey: 'xp' },
  streak:  { icon: 'flame',   color: '#FF6D00', glow: '#FF8F3D', labelKey: 'streak' },
  stories: { icon: 'book',    color: '#7B5EA7', glow: '#9B7DC9', labelKey: 'stories' },
  goals:   { icon: 'trophy',  color: '#34C759', glow: '#5FD67F', labelKey: 'goals' },
};

// ── Rank tier system ──
type RankTier = { max: number; key: string; color: string; icon: string };
const RANK_TIERS: RankTier[] = [
  { max: 1,    key: 'champion', color: '#FFD700', icon: '👑' },
  { max: 3,    key: 'elite',    color: '#E8B84D', icon: '🏆' },
  { max: 10,   key: 'gold',     color: '#FFB300', icon: '🥇' },
  { max: 25,   key: 'silver',   color: '#C0C0C0', icon: '🥈' },
  { max: 50,   key: 'bronze',   color: '#CD7F32', icon: '🥉' },
  { max: 100,  key: 'rising',   color: '#818CF8', icon: '⭐' },
  { max: 9999, key: 'explorer', color: '#78716C', icon: '✦' },
];
const getRankTier = (rank: number): RankTier =>
  RANK_TIERS.find(t => rank <= t.max) ?? RANK_TIERS[RANK_TIERS.length - 1];

// ── Avatar colors (deterministic per name) ──
const AVATAR_COLORS = [
  '#EF476F', '#06D6A0', '#118AB2', '#8338EC',
  '#FFD166', '#FF9F1C', '#7C3AED', '#F43F5E',
];
const getAvatarColor = (username: string): string => {
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

// ── i18n (supplement what's in LanguageContext) ──
const L: Record<string, Record<string, string>> = {
  en: {
    subtitle: 'Global Ranking', loading: 'Loading ranks...',
    beFirst: 'Be the first to set the pace.',
    top3: 'Top Contenders', full: 'Full Ranking', you: 'YOU',
    points: 'pts', gap: 'Gap to next',
    champion: 'CHAMPION', elite: 'ELITE', gold: 'GOLD', silver: 'SILVER',
    bronze: 'BRONZE', rising: 'RISING', explorer: 'EXPLORER',
    noRank: 'Not ranked yet', climbHint: 'Read more to climb the ranks',
  },
  ro: {
    subtitle: 'Clasament Global', loading: 'Se încarcă...',
    beFirst: 'Fii primul care dă ritmul.',
    top3: 'Top Competitori', full: 'Clasament Complet', you: 'TU',
    points: 'pct', gap: 'Până la următorul',
    champion: 'CAMPION', elite: 'ELITĂ', gold: 'AUR', silver: 'ARGINT',
    bronze: 'BRONZ', rising: 'ÎN ASCENSIUNE', explorer: 'EXPLORATOR',
    noRank: 'Încă neclasat', climbHint: 'Citește mai mult ca să urci în clasament',
  },
  fr: {
    subtitle: 'Classement Mondial', loading: 'Chargement...',
    beFirst: 'Soyez le premier à donner le rythme.',
    top3: 'Meilleurs Concurrents', full: 'Classement Complet', you: 'VOUS',
    points: 'pts', gap: 'Écart avec le suivant',
    champion: 'CHAMPION', elite: 'ÉLITE', gold: 'OR', silver: 'ARGENT',
    bronze: 'BRONZE', rising: 'MONTANT', explorer: 'EXPLORATEUR',
    noRank: 'Pas encore classé', climbHint: 'Lisez plus pour grimper',
  },
  de: {
    subtitle: 'Globale Rangliste', loading: 'Wird geladen...',
    beFirst: 'Sei der Erste.',
    top3: 'Top Konkurrenten', full: 'Komplette Rangliste', you: 'DU',
    points: 'Pkt', gap: 'Abstand zum nächsten',
    champion: 'CHAMPION', elite: 'ELITE', gold: 'GOLD', silver: 'SILBER',
    bronze: 'BRONZE', rising: 'AUFSTEIGEND', explorer: 'ENTDECKER',
    noRank: 'Noch nicht platziert', climbHint: 'Lies mehr um aufzusteigen',
  },
  es: {
    subtitle: 'Ranking Mundial', loading: 'Cargando...',
    beFirst: 'Sé el primero en marcar el ritmo.',
    top3: 'Principales Contendientes', full: 'Ranking Completo', you: 'TÚ',
    points: 'pts', gap: 'Diferencia al siguiente',
    champion: 'CAMPEÓN', elite: 'ÉLITE', gold: 'ORO', silver: 'PLATA',
    bronze: 'BRONCE', rising: 'EN ASCENSO', explorer: 'EXPLORADOR',
    noRank: 'Sin clasificar', climbHint: 'Lee más para subir en el ranking',
  },
};
const tx = (lang: string, k: string) => (L[lang] ?? L.en)[k] ?? L.en[k] ?? k;

// ══════════════════════════════════════════════════════════════════════════════
// USER HERO CARD — Big "YOU" card showing rank + tier + progress to next
// ══════════════════════════════════════════════════════════════════════════════
const UserHero = ({ me, nextUser, data, tabColor, isDark, language, theme, t }: {
  me: LeaderboardEntry | undefined;
  nextUser: LeaderboardEntry | undefined;
  data: LeaderboardEntry[];
  tabColor: string; isDark: boolean; language: string; theme: any;
  t: (k: string) => string;
}) => {
  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(12)).current;
  const progressFill = useRef(new Animated.Value(0)).current;

  const rank = me?.rank ?? 0;
  const tier = getRankTier(rank);
  const tierName = tx(language, tier.key);

  // Progress to next rank: how close are we to overtaking the person above?
  const gap = nextUser && me ? nextUser.value - me.value : 0;
  const progressValue = me && nextUser && gap > 0
    ? Math.max(0, Math.min(1, me.value / nextUser.value))
    : me && !nextUser && rank === 1 ? 1 : 0;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 420, useNativeDriver: true }),
      Animated.spring(slideUp, { toValue: 0, tension: 80, friction: 11, useNativeDriver: true }),
    ]).start();
    Animated.timing(progressFill, {
      toValue: progressValue, duration: 1100, delay: 200,
      easing: Easing.out(Easing.cubic), useNativeDriver: false,
    }).start();
  }, [progressValue]);

  if (!me) {
    // Not-ranked state
    return (
      <Animated.View style={[uh.card, {
        backgroundColor: isDark ? '#151117' : '#FFFFFF',
        borderColor: isDark ? '#2A2230' : '#E7ECF3',
        opacity: fadeIn, transform: [{ translateY: slideUp }],
      }]}>
        <View style={uh.noRankWrap}>
          <View style={[uh.noRankIcon, { backgroundColor: tabColor + '15' }]}>
            <Ionicons name="trending-up" size={20} color={tabColor} />
          </View>
          <Text style={[uh.noRankTitle, { color: theme.text }]}>{tx(language, 'noRank')}</Text>
          <Text style={[uh.noRankSub, { color: theme.subtext }]}>{tx(language, 'climbHint')}</Text>
        </View>
      </Animated.View>
    );
  }

  const avatarColor = getAvatarColor(me.username || 'U');

  return (
    <Animated.View style={{ opacity: fadeIn, transform: [{ translateY: slideUp }] }}>
      <View style={[uh.card, {
        backgroundColor: isDark ? '#0F0D15' : '#FFFFFF',
        borderColor: tabColor + '40',
        shadowColor: tabColor,
      }]}>
        {/* Gradient accent */}
        <LinearGradient
          colors={[tabColor + '20', 'transparent']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill} pointerEvents="none"
        />

        {/* Top row: tier badge + YOU pill */}
        <View style={uh.topRow}>
          <View style={[uh.tierBadge, { backgroundColor: tier.color + '20', borderColor: tier.color + '55' }]}>
            <Text style={{ fontSize: 13 }}>{tier.icon}</Text>
            <Text style={[uh.tierText, { color: tier.color }]}>{tierName}</Text>
          </View>
          <View style={[uh.youPill, { backgroundColor: tabColor }]}>
            <Text style={uh.youPillText}>{tx(language, 'you')}</Text>
          </View>
        </View>

        {/* Main row: avatar + rank */}
        <View style={uh.mainRow}>
          <View style={[uh.avatar, { backgroundColor: avatarColor, borderColor: tabColor + '60' }]}>
            <Text style={uh.avatarText}>{(me.username || '?')[0].toUpperCase()}</Text>
          </View>

          <View style={{ flex: 1 }}>
            <Text style={[uh.username, { color: theme.text }]} numberOfLines={1}>
              {me.username}
            </Text>
            <Text style={[uh.level, { color: theme.subtext }]}>
              {t('level')} · {me.level}
            </Text>
          </View>

          {/* Big rank */}
          <View style={uh.rankWrap}>
            <Text style={[uh.rankHash, { color: tabColor }]}>#</Text>
            <Text style={[uh.rankNum, { color: tabColor }]}>{me.rank}</Text>
          </View>
        </View>

        {/* Score + progress to next */}
        <View style={[uh.progWrap, { borderColor: isDark ? '#1F1A24' : '#F0EBE0' }]}>
          <View style={uh.progHeader}>
            <Text style={[uh.scoreNum, { color: theme.text }]}>
              {me.value.toLocaleString()}
            </Text>
            {nextUser && gap > 0 && (
              <View style={uh.gapWrap}>
                <Ionicons name="arrow-up" size={11} color={tabColor} />
                <Text style={[uh.gapText, { color: tabColor }]}>
                  {gap.toLocaleString()} {tx(language, 'points')}
                </Text>
              </View>
            )}
            {rank === 1 && (
              <View style={[uh.crownWrap, { backgroundColor: '#FFD70020' }]}>
                <Crown size={12} color="#FFD700" strokeWidth={2.5} />
                <Text style={uh.crownText}>#1</Text>
              </View>
            )}
          </View>

          {nextUser && (
            <>
              <View style={[uh.progTrack, { backgroundColor: isDark ? '#1A1520' : '#F0EBE0' }]}>
                <Animated.View style={[uh.progFill, {
                  backgroundColor: tabColor,
                  width: progressFill.interpolate({
                    inputRange: [0, 1], outputRange: ['0%', '100%'],
                  }),
                }]} />
              </View>
              <Text style={[uh.gapLabel, { color: theme.subtext }]}>
                {tx(language, 'gap')} · #{nextUser.rank}
              </Text>
            </>
          )}
        </View>
      </View>
    </Animated.View>
  );
};

const uh = StyleSheet.create({
  card: {
    borderRadius: 24, borderWidth: 1.5, padding: 18,
    marginBottom: 16, overflow: 'hidden',
    shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.15, shadowRadius: 18, elevation: 6,
  },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  tierBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderWidth: 1,
  },
  tierText: { fontSize: 10, fontWeight: '900', letterSpacing: 1.4 },
  youPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  youPillText: { color: '#FFF', fontSize: 10, fontWeight: '900', letterSpacing: 1 },

  mainRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 },
  avatar: {
    width: 56, height: 56, borderRadius: 28, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: '#FFF', fontSize: 22, fontWeight: '900' },
  username: { fontSize: 17, fontWeight: '800', letterSpacing: -0.3, fontFamily: SERIF },
  level: { fontSize: 11.5, fontWeight: '600', opacity: 0.65, marginTop: 2 },

  rankWrap: { flexDirection: 'row', alignItems: 'baseline' },
  rankHash: { fontSize: 18, fontWeight: '900', marginRight: 1, opacity: 0.7 },
  rankNum: { fontSize: 42, fontWeight: '900', letterSpacing: -2, fontFamily: SERIF, lineHeight: 46 },

  progWrap: { paddingTop: 14, borderTopWidth: StyleSheet.hairlineWidth },
  progHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  scoreNum: { fontSize: 20, fontWeight: '900', letterSpacing: -0.5, fontFamily: SERIF },
  gapWrap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  gapText: { fontSize: 11.5, fontWeight: '800', letterSpacing: 0.2 },
  crownWrap: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  crownText: { fontSize: 11, fontWeight: '900', color: '#FFD700', letterSpacing: 0.5 },

  progTrack: { height: 6, borderRadius: 3, overflow: 'hidden', marginBottom: 6 },
  progFill: { height: 6, borderRadius: 3 },
  gapLabel: { fontSize: 10, fontWeight: '600', opacity: 0.55, letterSpacing: 0.3 },

  // No-rank
  noRankWrap: { alignItems: 'center', paddingVertical: 8, gap: 8 },
  noRankIcon: {
    width: 48, height: 48, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  noRankTitle: { fontSize: 16, fontWeight: '800', letterSpacing: -0.3 },
  noRankSub: { fontSize: 12, fontWeight: '500', opacity: 0.6, textAlign: 'center' },
});

// ══════════════════════════════════════════════════════════════════════════════
// TABS ROW — Sleek pill design with active glow
// ══════════════════════════════════════════════════════════════════════════════
const TabsRow = ({ active, onSelect, t, theme, isDark }: {
  active: LeaderboardType; onSelect: (t: LeaderboardType) => void;
  t: (k: string) => string; theme: any; isDark: boolean;
}) => {
  return (
    <View style={ts.row}>
      {(['xp', 'streak', 'stories', 'goals'] as LeaderboardType[]).map((type) => {
        const isActive = active === type;
        const meta = TAB_META[type];
        return (
          <TouchableOpacity key={type} onPress={() => onSelect(type)} activeOpacity={0.75} style={ts.tabWrap}>
            <View style={[ts.tab, {
              backgroundColor: isActive ? meta.color : (isDark ? '#151117' : '#FFFFFF'),
              borderColor: isActive ? meta.color : (isDark ? '#252030' : '#E7ECF3'),
              shadowColor: isActive ? meta.color : 'transparent',
            }]}>
              <Ionicons
                name={meta.icon}
                size={16}
                color={isActive ? '#FFF' : theme.subtext + 'B0'}
              />
              <Text style={[ts.tabText, {
                color: isActive ? '#FFF' : theme.subtext,
              }]}>
                {t(meta.labelKey)}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};
const ts = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  tabWrap: { flex: 1 },
  tab: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    paddingVertical: 11, paddingHorizontal: 8, borderRadius: 14, borderWidth: 1,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 3,
  },
  tabText: { fontSize: 12, fontWeight: '800', textTransform: 'capitalize', letterSpacing: 0.2 },
});

// ══════════════════════════════════════════════════════════════════════════════
// PODIUM — Stair-step 2 | 1 | 3 with 1st elevated
// ══════════════════════════════════════════════════════════════════════════════
const Podium = ({ top3, tabColor, isDark, theme, language, t }: {
  top3: LeaderboardEntry[]; tabColor: string; isDark: boolean; theme: any;
  language: string; t: (k: string) => string;
}) => {
  const [first, second, third] = [top3[0], top3[1], top3[2]];
  const scales = useRef([new Animated.Value(0.85), new Animated.Value(0.85), new Animated.Value(0.85)]).current;
  const fades = useRef([new Animated.Value(0), new Animated.Value(0), new Animated.Value(0)]).current;

  useEffect(() => {
    // Animate 2nd, then 3rd, then 1st (dramatic reveal)
    Animated.sequence([
      Animated.parallel([
        Animated.spring(scales[1], { toValue: 1, tension: 80, friction: 10, useNativeDriver: true }),
        Animated.timing(fades[1], { toValue: 1, duration: 350, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.spring(scales[2], { toValue: 1, tension: 80, friction: 10, useNativeDriver: true }),
        Animated.timing(fades[2], { toValue: 1, duration: 350, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.spring(scales[0], { toValue: 1, tension: 70, friction: 9, useNativeDriver: true }),
        Animated.timing(fades[0], { toValue: 1, duration: 450, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  const renderPodiumCard = (entry: LeaderboardEntry | undefined, position: 1 | 2 | 3) => {
    if (!entry) return <View style={[pd.slot, pd[`slot${position}` as 'slot1']]} />;

    const avatarColor = getAvatarColor(entry.username || 'U');
    const tier = getRankTier(entry.rank);
    const height = position === 1 ? 190 : position === 2 ? 160 : 140;
    const crownSize = position === 1 ? 24 : 18;
    const idx = position - 1;

    return (
      <Animated.View style={[pd.slot, pd[`slot${position}` as 'slot1'], {
        transform: [{ scale: scales[idx] }],
        opacity: fades[idx],
      }]}>
        {/* Crown/medal icon floating above */}
        <View style={[pd.crownHolder, position === 1 && pd.crown1]}>
          {position === 1 ? (
            <Crown size={crownSize} color="#FFD700" strokeWidth={2.5} fill="#FFD700" />
          ) : (
            <Text style={{ fontSize: position === 2 ? 18 : 16 }}>{tier.icon}</Text>
          )}
        </View>

        {/* Avatar */}
        <View style={[pd.avatar, {
          backgroundColor: avatarColor,
          borderColor: tier.color,
          width: position === 1 ? 68 : 54,
          height: position === 1 ? 68 : 54,
          borderRadius: position === 1 ? 34 : 27,
          borderWidth: position === 1 ? 3 : 2,
        }]}>
          <Text style={[pd.avatarText, { fontSize: position === 1 ? 26 : 20 }]}>
            {(entry.username || '?')[0].toUpperCase()}
          </Text>
          {entry.isCurrentUser && (
            <View style={[pd.youDot, { backgroundColor: tabColor }]} />
          )}
        </View>

        {/* Username */}
        <Text style={[pd.username, {
          color: theme.text,
          fontSize: position === 1 ? 13.5 : 12.5,
        }]} numberOfLines={1}>
          {entry.username}
        </Text>

        {/* Level */}
        <Text style={[pd.level, { color: theme.subtext }]}>
          {t('level')} {entry.level}
        </Text>

        {/* Podium block with score */}
        <View style={[pd.block, {
          height,
          backgroundColor: isDark ? '#15111A' : '#FFFFFF',
          borderColor: tier.color + '55',
          borderTopColor: tier.color,
          borderTopWidth: position === 1 ? 3 : 2,
        }]}>
          {/* Large rank number */}
          <Text style={[pd.rankBig, { color: tier.color + 'BB' }]}>
            {position}
          </Text>

          {/* Score */}
          <View style={pd.scoreWrap}>
            <Text style={[pd.score, {
              color: tabColor,
              fontSize: position === 1 ? 17 : 14,
            }]}>
              {entry.value.toLocaleString()}
            </Text>
            <Text style={[pd.scoreLabel, { color: theme.subtext }]}>
              {tx(language, 'points')}
            </Text>
          </View>
        </View>
      </Animated.View>
    );
  };

  return (
    <View style={pd.wrap}>
      <View style={pd.row}>
        {renderPodiumCard(second, 2)}
        {renderPodiumCard(first, 1)}
        {renderPodiumCard(third, 3)}
      </View>
    </View>
  );
};

const pd = StyleSheet.create({
  wrap: { marginBottom: 18 },
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  slot: { flex: 1, alignItems: 'center' },
  slot1: { marginBottom: 0 },
  slot2: { marginBottom: 0 },
  slot3: { marginBottom: 0 },
  crownHolder: { marginBottom: 6, height: 24, alignItems: 'center', justifyContent: 'center' },
  crown1: { marginBottom: 4 },
  avatar: { alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  avatarText: { color: '#FFF', fontWeight: '900' },
  youDot: {
    position: 'absolute', bottom: -2, right: -2,
    width: 12, height: 12, borderRadius: 6,
    borderWidth: 2, borderColor: '#FFF',
  },
  username: { fontWeight: '900', letterSpacing: -0.2, textAlign: 'center', marginBottom: 1, fontFamily: SERIF },
  level: { fontSize: 9.5, fontWeight: '700', opacity: 0.55, marginBottom: 8, letterSpacing: 0.2 },
  block: {
    alignSelf: 'stretch', alignItems: 'center', justifyContent: 'space-between',
    borderRadius: 16, borderWidth: 1, paddingTop: 12, paddingBottom: 10, paddingHorizontal: 6,
  },
  rankBig: { fontSize: 40, fontWeight: '900', letterSpacing: -2, fontFamily: SERIF, lineHeight: 42 },
  scoreWrap: { alignItems: 'center' },
  score: { fontWeight: '900', letterSpacing: -0.3, fontFamily: SERIF },
  scoreLabel: { fontSize: 8.5, fontWeight: '700', opacity: 0.5, letterSpacing: 0.5, textTransform: 'uppercase', marginTop: 1 },
});

// ══════════════════════════════════════════════════════════════════════════════
// LIST ROW
// ══════════════════════════════════════════════════════════════════════════════
const ListRow = ({ entry, tabColor, isDark, theme, t, index, language }: {
  entry: LeaderboardEntry; tabColor: string; isDark: boolean; theme: any;
  t: (k: string) => string; index: number; language: string;
}) => {
  const fadeIn = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    const delay = Math.min(index * 30, 300);
    Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 320, delay, useNativeDriver: true }),
      Animated.spring(slide, { toValue: 0, tension: 80, friction: 11, delay, useNativeDriver: true }),
    ]).start();
  }, []);

  const avatarColor = getAvatarColor(entry.username || 'U');
  const tier = getRankTier(entry.rank);
  const isMe = entry.isCurrentUser;

  return (
    <Animated.View style={[lr.row, {
      backgroundColor: isMe
        ? tabColor + '10'
        : (isDark ? '#141017' : '#FFFFFF'),
      borderColor: isMe ? tabColor + '60' : (isDark ? '#201B28' : '#ECE6DC'),
      opacity: fadeIn,
      transform: [{ translateY: slide }],
    }]}>
      {/* Rank */}
      <View style={lr.rankCol}>
        <Text style={[lr.rankText, {
          color: isMe ? tabColor : theme.subtext,
        }]}>{entry.rank}</Text>
        <Text style={{ fontSize: 11 }}>{tier.icon}</Text>
      </View>

      {/* Avatar */}
      <View style={[lr.avatar, {
        backgroundColor: avatarColor,
        borderColor: isMe ? tabColor + '80' : 'transparent',
        borderWidth: isMe ? 2 : 0,
      }]}>
        <Text style={lr.avatarText}>{(entry.username || '?')[0].toUpperCase()}</Text>
      </View>

      {/* Info */}
      <View style={lr.info}>
        <View style={lr.nameRow}>
          <Text style={[lr.username, { color: theme.text }]} numberOfLines={1}>
            {entry.username}
          </Text>
          {isMe && (
            <View style={[lr.youTag, { backgroundColor: tabColor }]}>
              <Text style={lr.youTagText}>{tx(language, 'you')}</Text>
            </View>
          )}
        </View>
        <Text style={[lr.level, { color: theme.subtext }]}>
          {t('level')} {entry.level} · {tx(language, tier.key)}
        </Text>
      </View>

      {/* Score */}
      <View style={lr.scoreCol}>
        <Text style={[lr.score, { color: isMe ? tabColor : theme.text }]}>
          {entry.value.toLocaleString()}
        </Text>
        <Text style={[lr.scoreLabel, { color: theme.subtext }]}>
          {tx(language, 'points')}
        </Text>
      </View>
    </Animated.View>
  );
};

const lr = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 12, paddingRight: 14, borderRadius: 16, borderWidth: 1, marginBottom: 8,
  },
  rankCol: { width: 36, alignItems: 'center', gap: 2 },
  rankText: { fontSize: 15, fontWeight: '900', letterSpacing: -0.3, fontFamily: SERIF },
  avatar: {
    width: 42, height: 42, borderRadius: 21,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: '#FFF', fontWeight: '900', fontSize: 16 },
  info: { flex: 1, minWidth: 0 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  username: { fontSize: 14, fontWeight: '800', letterSpacing: -0.2, flexShrink: 1 },
  youTag: { paddingHorizontal: 7, paddingVertical: 2.5, borderRadius: 6 },
  youTagText: { color: '#FFF', fontSize: 8.5, fontWeight: '900', letterSpacing: 0.8 },
  level: { fontSize: 10.5, fontWeight: '600', opacity: 0.55, marginTop: 2, letterSpacing: 0.2 },
  scoreCol: { alignItems: 'flex-end', minWidth: 60 },
  score: { fontSize: 15, fontWeight: '900', letterSpacing: -0.3, fontFamily: SERIF },
  scoreLabel: { fontSize: 8.5, fontWeight: '700', opacity: 0.5, letterSpacing: 0.5, textTransform: 'uppercase', marginTop: 1 },
});

// ══════════════════════════════════════════════════════════════════════════════
// MAIN MODAL
// ══════════════════════════════════════════════════════════════════════════════
export default function LeaderboardModal({
  visible, onClose,
}: { visible: boolean; onClose: () => void }) {
  const { theme, isDark } = useTheme();
  const { t, language } = useLanguage();
  const insets = useSafeAreaInsets();

  const [activeTab, setActiveTab] = useState<LeaderboardType>('xp');
  const [data, setData] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const tabMeta = TAB_META[activeTab];
  const tabColor = tabMeta.color;

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      await pushToServer();
      const results = await fetchLeaderboard(activeTab);
      setData(results);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    if (visible) loadData();
  }, [visible, loadData]);

  const me = useMemo(() => data.find(e => e.isCurrentUser), [data]);
  const nextUser = useMemo(() => {
    if (!me || me.rank <= 1) return undefined;
    return data.find(e => e.rank === me.rank - 1);
  }, [data, me]);
  const top3 = useMemo(() => data.slice(0, 3), [data]);
  const others = useMemo(() => data.slice(3), [data]);

  const bg = isDark ? '#0A0810' : '#F8F6FC';

  return (
    <Modal visible={visible} animationType="slide" transparent={false} statusBarTranslucent>
      <View style={[lbs.root, { backgroundColor: bg, paddingTop: insets.top }]}>
        {/* Background gradient */}
        <LinearGradient
          colors={isDark
            ? ['#0B0912', '#0F0D17', '#0B0912']
            : ['#FBF8FF', '#F5F1FA', '#FBF8FF']}
          style={StyleSheet.absoluteFill}
        />

        {/* Header */}
        <View style={lbs.hdr}>
          <TouchableOpacity onPress={onClose} style={[lbs.iconBtn, {
            backgroundColor: isDark ? '#181220' : '#FFFFFF',
            borderColor: isDark ? '#2A2332' : '#EFE9E0',
          }]} activeOpacity={0.75}>
            <X size={18} color={theme.text} strokeWidth={2.4} />
          </TouchableOpacity>

          <View style={lbs.hdrCenter}>
            <Text style={[lbs.hdrKicker, { color: tabColor }]}>
              {tx(language, 'subtitle').toUpperCase()}
            </Text>
            <Text style={[lbs.hdrTitle, { color: theme.text }]}>
              {t('leaderboard')}
            </Text>
          </View>

          <TouchableOpacity onPress={loadData} style={[lbs.iconBtn, {
            backgroundColor: isDark ? '#181220' : '#FFFFFF',
            borderColor: isDark ? '#2A2332' : '#EFE9E0',
          }]} activeOpacity={0.75}>
            <Ionicons name="refresh" size={18} color={theme.text} />
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingBottom: insets.bottom + 28,
          }}
        >
          {/* USER HERO */}
          <UserHero
            me={me} nextUser={nextUser} data={data}
            tabColor={tabColor} isDark={isDark} language={language}
            theme={theme} t={t}
          />

          {/* TABS */}
          <TabsRow
            active={activeTab} onSelect={setActiveTab}
            t={t} theme={theme} isDark={isDark}
          />

          {/* Content */}
          {loading ? (
            <View style={lbs.stateWrap}>
              <ActivityIndicator size="large" color={tabColor} />
              <Text style={[lbs.stateText, { color: theme.subtext }]}>
                {tx(language, 'loading')}
              </Text>
            </View>
          ) : data.length === 0 ? (
            <View style={lbs.stateWrap}>
              <View style={[lbs.emptyIcon, { backgroundColor: tabColor + '12' }]}>
                <Trophy size={28} color={tabColor} strokeWidth={1.8} />
              </View>
              <Text style={[lbs.emptyTitle, { color: theme.text }]}>
                {t('no_users_found')}
              </Text>
              <Text style={[lbs.stateText, { color: theme.subtext }]}>
                {tx(language, 'beFirst')}
              </Text>
            </View>
          ) : (
            <>
              {/* PODIUM */}
              {top3.length > 0 && (
                <>
                  <Text style={[lbs.sectionTitle, { color: theme.text }]}>
                    {tx(language, 'top3')}
                  </Text>
                  <Podium
                    top3={top3} tabColor={tabColor} isDark={isDark}
                    theme={theme} language={language} t={t}
                  />
                </>
              )}

              {/* FULL RANKING */}
              {others.length > 0 && (
                <>
                  <View style={lbs.sectionRow}>
                    <Text style={[lbs.sectionTitle, { color: theme.text }]}>
                      {tx(language, 'full')}
                    </Text>
                    <View style={[lbs.sectionCount, { backgroundColor: tabColor + '15' }]}>
                      <Text style={[lbs.sectionCountText, { color: tabColor }]}>
                        {others.length}
                      </Text>
                    </View>
                  </View>

                  {others.map((entry, i) => (
                    <ListRow
                      key={entry.userId}
                      entry={entry}
                      tabColor={tabColor}
                      isDark={isDark}
                      theme={theme}
                      t={t}
                      index={i}
                      language={language}
                    />
                  ))}
                </>
              )}
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const lbs = StyleSheet.create({
  root: { flex: 1 },
  hdr: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  hdrCenter: { flex: 1, alignItems: 'center' },
  hdrKicker: { fontSize: 9.5, fontWeight: '900', letterSpacing: 2.2 },
  hdrTitle: { fontSize: 19, fontWeight: '800', letterSpacing: -0.3, fontFamily: SERIF, marginTop: 2 },
  iconBtn: {
    width: 40, height: 40, borderRadius: 13, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },

  sectionTitle: { fontSize: 13, fontWeight: '900', letterSpacing: 1.6, textTransform: 'uppercase', marginBottom: 12, opacity: 0.75 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, marginTop: 6 },
  sectionCount: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 7 },
  sectionCountText: { fontSize: 10.5, fontWeight: '900', letterSpacing: 0.3 },

  stateWrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48, gap: 10 },
  stateText: { fontSize: 13, fontWeight: '600', opacity: 0.7 },
  emptyIcon: {
    width: 72, height: 72, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  emptyTitle: { fontSize: 17, fontWeight: '800', letterSpacing: -0.3, fontFamily: SERIF },
});