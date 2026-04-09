// components/LeaderboardModal.tsx
import { Ionicons } from '@expo/vector-icons';
import { X } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
    Animated,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { fetchLeaderboard, LeaderboardEntry, LeaderboardType } from '../services/leaderboardService';
import { getLevelForXP, useGamificationStore } from '../store/useGamificationStore';

const SERIF = Platform.OS === 'ios' ? 'Georgia' : 'serif';

const T: Record<string, Record<string, string>> = {
  en: {
    title: 'Leaderboard', you: 'You', xp: 'Total XP', streak: 'Longest Streak',
    stories: 'Stories Read', goals: 'Daily Goals', rank: 'Rank', loading: 'Loading...',
    empty: 'No data yet', level: 'Lv',
  },
  ro: {
    title: 'Clasament', you: 'Tu', xp: 'XP Total', streak: 'Cel Mai Lung Streak',
    stories: 'Povești Citite', goals: 'Obiective Zilnice', rank: 'Loc', loading: 'Se încarcă...',
    empty: 'Nicio dată încă', level: 'Nv',
  },
  fr: {
    title: 'Classement', you: 'Vous', xp: 'XP Total', streak: 'Plus Longue Série',
    stories: 'Histoires Lues', goals: 'Objectifs Quotidiens', rank: 'Rang', loading: 'Chargement...',
    empty: 'Pas encore de données', level: 'Nv',
  },
  de: {
    title: 'Rangliste', you: 'Du', xp: 'Gesamt-XP', streak: 'Längster Streak',
    stories: 'Geschichten Gelesen', goals: 'Tagesziele', rank: 'Rang', loading: 'Laden...',
    empty: 'Noch keine Daten', level: 'Lv',
  },
  es: {
    title: 'Clasificación', you: 'Tú', xp: 'XP Total', streak: 'Racha Más Larga',
    stories: 'Historias Leídas', goals: 'Objetivos Diarios', rank: 'Puesto', loading: 'Cargando...',
    empty: 'Sin datos aún', level: 'Nv',
  },
};
const tx = (lang: string, k: string) => (T[lang] ?? T.en)[k] ?? T.en[k] ?? k;

const TABS: { key: LeaderboardType; icon: keyof typeof Ionicons.glyphMap; labelKey: string }[] = [
  { key: 'xp', icon: 'star', labelKey: 'xp' },
  { key: 'streak', icon: 'flame', labelKey: 'streak' },
  { key: 'stories', icon: 'book', labelKey: 'stories' },
  { key: 'goals', icon: 'trophy', labelKey: 'goals' },
];

const TAB_COLORS: Record<LeaderboardType, string> = {
  xp: '#FFB300',
  streak: '#FF6D00',
  stories: '#7B5EA7',
  goals: '#34C759',
};

const MEDAL_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32'];

/* ── Rank row ── */
const RankRow = ({ entry, type, index, theme, isDark, isPremium, language }: {
  entry: LeaderboardEntry; type: LeaderboardType; index: number;
  theme: any; isDark: boolean; isPremium: boolean; language: string;
}) => {
  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideIn = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    const delay = index * 50;
    Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 400, delay, useNativeDriver: true }),
      Animated.spring(slideIn, { toValue: 0, tension: 80, friction: 12, delay, useNativeDriver: true }),
    ]).start();
  }, []);

  const isTop3 = entry.rank <= 3;
  const medal = isTop3 ? MEDAL_COLORS[entry.rank - 1] : null;
  const accent = TAB_COLORS[type];
  const rowBg = entry.isCurrentUser
    ? (isPremium ? '#1A1525' : isDark ? '#1A1610' : '#FFFBF2')
    : 'transparent';
  const rowBorder = entry.isCurrentUser
    ? (isPremium ? '#D4A84330' : isDark ? '#2A2015' : '#F0E4D0')
    : 'transparent';

  const initials = entry.username.slice(0, 2).toUpperCase();
  const avatarBg = isTop3 ? medal + '25' : (isDark ? '#1C1A16' : '#F0ECE4');
  const levelDef = getLevelForXP(entry.value);

  const unitMap: Record<LeaderboardType, string> = {
    xp: 'XP', streak: 'd', stories: '', goals: '',
  };

  return (
    <Animated.View style={[rs.row, {
      backgroundColor: rowBg,
      borderColor: rowBorder,
      borderWidth: entry.isCurrentUser ? 1 : 0,
      opacity: fadeIn,
      transform: [{ translateY: slideIn }],
    }]}>
      {/* Rank */}
      <View style={[rs.rankWrap, { backgroundColor: medal ? medal + '20' : 'transparent' }]}>
        {medal ? (
          <Text style={[rs.rankMedal, { color: medal }]}>{entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : '🥉'}</Text>
        ) : (
          <Text style={[rs.rankNum, { color: theme.subtext }]}>{entry.rank}</Text>
        )}
      </View>

      {/* Avatar */}
      <View style={[rs.avatar, { backgroundColor: avatarBg }]}>
        <Text style={[rs.avatarText, { color: isTop3 ? medal : theme.subtext }]}>{initials}</Text>
      </View>

      {/* Name + level */}
      <View style={rs.info}>
        <Text style={[rs.name, { color: entry.isCurrentUser ? accent : theme.text }]} numberOfLines={1}>
          {entry.isCurrentUser ? `${entry.username} (${tx(language, 'you')})` : entry.username}
        </Text>
        <Text style={[rs.level, { color: theme.subtext }]}>
          {tx(language, 'level')} {entry.level}
        </Text>
      </View>

      {/* Value */}
      <View style={[rs.valueBadge, { backgroundColor: accent + '15' }]}>
        <Text style={[rs.value, { color: accent }]}>
          {entry.value.toLocaleString()}{unitMap[type] ? ` ${unitMap[type]}` : ''}
        </Text>
      </View>
    </Animated.View>
  );
};

const rs = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12, borderRadius: 14, marginBottom: 4 },
  rankWrap: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  rankMedal: { fontSize: 16 },
  rankNum: { fontSize: 13, fontWeight: '700', opacity: 0.5 },
  avatar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 13, fontWeight: '800', letterSpacing: 0.5 },
  info: { flex: 1, gap: 1 },
  name: { fontSize: 14, fontWeight: '700', letterSpacing: -0.1 },
  level: { fontSize: 10, fontWeight: '600', opacity: 0.4, letterSpacing: 0.3 },
  valueBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  value: { fontSize: 12, fontWeight: '800', letterSpacing: 0.2 },
});

/* ── Main Modal ── */
export default function LeaderboardModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { theme, isDark, isPremium } = useTheme();
  const { language } = useLanguage();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<LeaderboardType>('xp');
  const [data, setData] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const totalXP = useGamificationStore(s => s.totalXP);
  const userLevel = getLevelForXP(totalXP);

  useEffect(() => {
    if (visible) {
      setLoading(true);
      fetchLeaderboard(activeTab).then(d => { setData(d); setLoading(false); });
    }
  }, [visible, activeTab]);

  const bg = isPremium ? '#05040A' : isDark ? '#090807' : '#FDFBF7';
  const cardBg = isPremium ? '#0F0D14' : isDark ? '#121010' : '#FFFFFF';
  const brd = isPremium ? '#2A2230' : isDark ? '#1E1A15' : '#EDE7DC';
  const gold = isPremium ? '#D4A843' : isDark ? '#E8B84D' : '#C77E08';
  const accent = TAB_COLORS[activeTab];

  return (
    <Modal visible={visible} animationType="slide" transparent={false} statusBarTranslucent>
      <View style={[lbs.root, { backgroundColor: bg, paddingTop: insets.top }]}>
        {/* Header */}
        <View style={lbs.hdr}>
          <View style={{ width: 36 }} />
          <View style={{ alignItems: 'center' }}>
            <Text style={[lbs.hdrTitle, { color: theme.text }]}>{tx(language, 'title')}</Text>
          </View>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
            style={[lbs.closeBtn, { backgroundColor: isPremium ? '#14101E' : isDark ? '#181412' : '#F5F0E8', borderColor: brd }]}>
            <X size={15} color={theme.subtext} strokeWidth={2.5} />
          </TouchableOpacity>
        </View>

        {/* Your rank card */}
        <View style={[lbs.yourCard, { backgroundColor: cardBg, borderColor: brd }]}>
          <View style={[lbs.yourAvatar, { backgroundColor: gold + '20' }]}>
            <Text style={{ fontSize: 22 }}>{userLevel.icon}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[lbs.yourLabel, { color: theme.subtext }]}>{tx(language, 'rank')}</Text>
            <Text style={[lbs.yourRank, { color: gold }]}>#8</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[lbs.yourXP, { color: gold }]}>{totalXP.toLocaleString()}</Text>
            <Text style={[lbs.yourUnit, { color: theme.subtext }]}>XP</Text>
          </View>
        </View>

        {/* Tab selector */}
        <View style={[lbs.tabRow, { borderColor: brd }]}>
          {TABS.map(tab => {
            const active = activeTab === tab.key;
            const color = TAB_COLORS[tab.key];
            return (
              <TouchableOpacity key={tab.key} onPress={() => setActiveTab(tab.key)} activeOpacity={0.6}
                style={[lbs.tab, {
                  backgroundColor: active ? color + '15' : 'transparent',
                  borderColor: active ? color + '40' : 'transparent',
                }]}>
                <Ionicons name={tab.icon} size={14} color={active ? color : theme.subtext + '60'} />
                <Text style={[lbs.tabLabel, { color: active ? color : theme.subtext, fontWeight: active ? '800' : '500' }]}>
                  {tx(language, tab.labelKey)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* List */}
        <ScrollView contentContainerStyle={[lbs.scroll, { paddingBottom: insets.bottom + 30 }]} showsVerticalScrollIndicator={false}>
          {loading ? (
            <View style={lbs.loadWrap}><Text style={[lbs.loadText, { color: theme.subtext }]}>{tx(language, 'loading')}</Text></View>
          ) : data.length === 0 ? (
            <View style={lbs.loadWrap}><Text style={[lbs.loadText, { color: theme.subtext }]}>{tx(language, 'empty')}</Text></View>
          ) : (
            data.map((entry, i) => (
              <RankRow key={entry.userId} entry={entry} type={activeTab} index={i}
                theme={theme} isDark={isDark} isPremium={isPremium} language={language} />
            ))
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const lbs = StyleSheet.create({
  root: { flex: 1 },
  hdr: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, height: 54 },
  hdrTitle: { fontSize: 18, fontWeight: '800', letterSpacing: -0.3, fontFamily: SERIF },
  closeBtn: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  yourCard: { flexDirection: 'row', alignItems: 'center', gap: 14, marginHorizontal: 20, padding: 16, borderRadius: 18, borderWidth: 1, marginBottom: 12 },
  yourAvatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  yourLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', opacity: 0.5 },
  yourRank: { fontSize: 24, fontWeight: '900', letterSpacing: -1 },
  yourXP: { fontSize: 18, fontWeight: '900', letterSpacing: -0.5 },
  yourUnit: { fontSize: 8, fontWeight: '700', letterSpacing: 1.5, opacity: 0.4, textTransform: 'uppercase' },
  tabRow: { flexDirection: 'row', gap: 6, paddingHorizontal: 20, marginBottom: 12, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  tabLabel: { fontSize: 9, letterSpacing: 0.3, textTransform: 'uppercase' },
  scroll: { paddingHorizontal: 16 },
  loadWrap: { alignItems: 'center', paddingVertical: 40 },
  loadText: { fontSize: 13, fontWeight: '500', opacity: 0.4 },
});