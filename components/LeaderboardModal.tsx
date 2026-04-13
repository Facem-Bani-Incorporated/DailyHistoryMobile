import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { X } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
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

const TAB_COLORS: Record<LeaderboardType, string> = {
  xp: '#FFB300',
  streak: '#FF6D00',
  stories: '#7B5EA7',
  goals: '#34C759',
};

const TAB_META: Record<
  LeaderboardType,
  { icon: keyof typeof Ionicons.glyphMap; labelKey: string }
> = {
  xp: { icon: 'star', labelKey: 'xp' },
  streak: { icon: 'flame', labelKey: 'streak' },
  stories: { icon: 'book', labelKey: 'stories' },
  goals: { icon: 'trophy', labelKey: 'goals' },
};

const AVATAR_COLORS = [
  '#EF476F',
  '#06D6A0',
  '#118AB2',
  '#073B4C',
  '#FFD166',
  '#8338EC',
  '#FF9F1C',
];

const getAvatarColor = (username: string) => {
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

function rankBadge(rank: number) {
  if (rank === 1) return { icon: 'medal' as const, color: '#F7C948', bg: 'rgba(247,201,72,0.16)' };
  if (rank === 2) return { icon: 'medal' as const, color: '#C7CDD6', bg: 'rgba(199,205,214,0.16)' };
  if (rank === 3) return { icon: 'medal' as const, color: '#D98C4B', bg: 'rgba(217,140,75,0.16)' };
  return { icon: 'ellipsis-horizontal' as const, color: '#94A3B8', bg: 'rgba(148,163,184,0.14)' };
}

export default function LeaderboardModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { theme, isDark } = useTheme();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();

  const [activeTab, setActiveTab] = useState<LeaderboardType>('xp');
  const [data, setData] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const activeColor = TAB_COLORS[activeTab];

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

  const me = useMemo(() => data.find((e) => e.isCurrentUser), [data]);
  const top3 = useMemo(() => data.slice(0, 3), [data]);
  const others = useMemo(() => data.slice(3), [data]);

  const surface = isDark ? '#101114' : '#F4F6FA';
  const card = isDark ? '#17181C' : '#FFFFFF';
  const cardSoft = isDark ? '#1E2026' : '#EEF2F7';

  const getRankIcon = (rank: number) => {
    const badge = rankBadge(rank);
    if (rank <= 3) {
      return <Ionicons name={badge.icon} size={24} color={badge.color} />;
    }
    return (
      <View style={[lbs.rankPill, { backgroundColor: badge.bg }]}>
        <Text style={[lbs.rankNum, { color: theme.subtext }]}>{rank}</Text>
      </View>
    );
  };

  const renderTopCard = (item: LeaderboardEntry, index: number) => {
    const avatarColor = getAvatarColor(item.username || 'U');
    const isFirst = index === 0;
    const badge = rankBadge(item.rank);

    return (
      <View
        key={item.userId}
        style={[
          lbs.topCard,
          {
            backgroundColor: card,
            borderColor: isFirst ? activeColor : isDark ? '#262A31' : '#E6EAF0',
          },
          isFirst && {
            transform: [{ scale: 1.02 }],
            shadowOpacity: 0.14,
          },
        ]}
      >
        <View style={lbs.topBadgeRow}>
          <View style={[lbs.topMedal, { backgroundColor: badge.bg }]}>
            <Ionicons name={badge.icon} size={18} color={badge.color} />
          </View>
          {item.isCurrentUser ? (
            <View style={[lbs.youTag, { backgroundColor: activeColor }]}>
              <Text style={lbs.youTagText}>YOU</Text>
            </View>
          ) : null}
        </View>

        <View style={[lbs.topAvatar, { backgroundColor: avatarColor }]}>
          <Text style={lbs.topAvatarText}>{(item.username || '?')[0].toUpperCase()}</Text>
        </View>

        <Text style={[lbs.topUsername, { color: theme.text }]} numberOfLines={1}>
          {item.username}
        </Text>

        <Text style={[lbs.topLevel, { color: theme.subtext }]}>
          {t('level')} {item.level}
        </Text>

        <View style={[lbs.topScoreWrap, { backgroundColor: isDark ? '#111318' : '#F6F8FC' }]}>
          <Text style={[lbs.topScore, { color: activeColor }]} numberOfLines={1}>
            {item.value.toLocaleString()}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} statusBarTranslucent>
      <View style={[lbs.root, { backgroundColor: surface, paddingTop: insets.top }]}>
        <LinearGradient
          colors={
            isDark
              ? ['#0B0C10', '#12141A', '#0B0C10']
              : ['#F8FAFF', '#F3F6FB', '#EEF3F9']
          }
          style={StyleSheet.absoluteFill}
        />

        <View style={lbs.hdr}>
          <TouchableOpacity onPress={onClose} style={lbs.iconBtn} activeOpacity={0.8}>
            <X size={24} color={theme.text} />
          </TouchableOpacity>

          <View style={lbs.hdrCenter}>
            <Text style={[lbs.hdrTitle, { color: theme.text }]}>{t('leaderboard')}</Text>
            <Text style={[lbs.hdrSubtitle, { color: theme.subtext }]}>
              Rise, climb, dominate.
            </Text>
          </View>

          <TouchableOpacity onPress={loadData} style={lbs.iconBtn} activeOpacity={0.8}>
            <Ionicons name="refresh" size={22} color={theme.text} />
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingBottom: insets.bottom + 28,
          }}
        >
          <LinearGradient
            colors={
              isDark
                ? ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.03)']
                : ['rgba(255,255,255,0.95)', 'rgba(255,255,255,0.72)']
            }
            style={[lbs.heroCard, { borderColor: isDark ? '#272A31' : '#E7ECF3' }]}
          >
            <Text style={[lbs.heroLabel, { color: theme.subtext }]}>
              {t('your_rank')}
            </Text>

            <Text style={[lbs.heroRank, { color: activeColor }]}>
              #{me?.rank || '--'}
            </Text>

            <Text style={[lbs.heroHint, { color: theme.text }]}>
              {me ? `You are ${Math.max(1, me.rank - 1)} spots away from the next target.` : 'No rank yet.'}
            </Text>
          </LinearGradient>

          <View style={lbs.tabsWrap}>
            {(['xp', 'streak', 'stories', 'goals'] as LeaderboardType[]).map((type) => {
              const isActive = activeTab === type;
              const meta = TAB_META[type];
              const tabColor = TAB_COLORS[type];

              return (
                <TouchableOpacity
                  key={type}
                  onPress={() => setActiveTab(type)}
                  activeOpacity={0.85}
                  style={[
                    lbs.tabChip,
                    {
                      backgroundColor: isActive ? tabColor : cardSoft,
                      borderColor: isActive ? tabColor : isDark ? '#2A2D35' : '#E1E7EF',
                    },
                  ]}
                >
                  <Ionicons
                    name={meta.icon}
                    size={18}
                    color={isActive ? '#FFF' : theme.subtext}
                  />
                  <Text
                    style={[
                      lbs.tabText,
                      { color: isActive ? '#FFF' : theme.subtext },
                    ]}
                  >
                    {t(meta.labelKey)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {loading ? (
            <View style={lbs.stateWrap}>
              <ActivityIndicator size="large" color={activeColor} />
              <Text style={[lbs.stateText, { color: theme.subtext }]}>
                Loading leaderboard...
              </Text>
            </View>
          ) : data.length === 0 ? (
            <View style={lbs.stateWrap}>
              <Text style={[lbs.emptyTitle, { color: theme.text }]}>
                {t('no_users_found')}
              </Text>
              <Text style={[lbs.stateText, { color: theme.subtext }]}>
                Be the first to set the pace.
              </Text>
            </View>
          ) : (
            <>
              {top3.length > 0 ? (
                <View style={lbs.podiumSection}>
                  <Text style={[lbs.sectionTitle, { color: theme.text }]}>
                    Top contenders
                  </Text>

                  <View style={lbs.podiumRow}>
                    {top3[1] ? renderTopCard(top3[1], 1) : <View style={lbs.podiumSpacer} />}
                    {top3[0] ? renderTopCard(top3[0], 0) : <View style={lbs.podiumSpacer} />}
                    {top3[2] ? renderTopCard(top3[2], 2) : <View style={lbs.podiumSpacer} />}
                  </View>
                </View>
              ) : null}

              <View style={lbs.listSection}>
                <Text style={[lbs.sectionTitle, { color: theme.text }]}>
                  Full ranking
                </Text>

                {others.map((item) => {
                  const avatarColor = getAvatarColor(item.username || 'U');
                  const badge = rankBadge(item.rank);
                  const isCurrentUser = item.isCurrentUser;

                  return (
                    <View
                      key={item.userId}
                      style={[
                        lbs.row,
                        {
                          backgroundColor: card,
                          borderColor: isCurrentUser
                            ? activeColor
                            : isDark
                              ? '#252831'
                              : '#E7ECF3',
                        },
                        isCurrentUser && {
                          shadowColor: activeColor,
                          shadowOpacity: 0.18,
                          shadowRadius: 14,
                          elevation: 3,
                        },
                      ]}
                    >
                      <View style={lbs.rankContainer}>
                        {item.rank <= 3 ? (
                          <View style={[lbs.smallMedal, { backgroundColor: badge.bg }]}>
                            <Ionicons name={badge.icon} size={20} color={badge.color} />
                          </View>
                        ) : (
                          <Text style={[lbs.rankNum, { color: theme.subtext }]}>
                            {item.rank}
                          </Text>
                        )}
                      </View>

                      <View style={[lbs.avatar, { backgroundColor: avatarColor }]}>
                        <Text style={lbs.avatarText}>
                          {(item.username || '?')[0].toUpperCase()}
                        </Text>
                      </View>

                      <View style={lbs.userInfo}>
                        <View style={lbs.usernameRow}>
                          <Text
                            style={[lbs.username, { color: theme.text }]}
                            numberOfLines={1}
                          >
                            {item.username}
                          </Text>

                          {isCurrentUser ? (
                            <View style={[lbs.youBadge, { backgroundColor: activeColor }]}>
                              <Text style={lbs.youBadgeText}>YOU</Text>
                            </View>
                          ) : null}
                        </View>

                        <Text style={[lbs.userLevel, { color: theme.subtext }]}>
                          {t('level')} {item.level}
                        </Text>
                      </View>

                      <View style={lbs.scoreWrap}>
                        <Text style={[lbs.score, { color: isCurrentUser ? activeColor : theme.text }]}>
                          {item.value.toLocaleString()}
                        </Text>
                        <Text style={[lbs.scoreLabel, { color: theme.subtext }]}>
                          pts
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const lbs = StyleSheet.create({
  root: {
    flex: 1,
  },

  hdr: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  hdrCenter: {
    flex: 1,
    alignItems: 'center',
  },
  hdrTitle: {
    fontSize: 24,
    fontWeight: '900',
    fontFamily: SERIF,
    letterSpacing: 0.2,
  },
  hdrSubtitle: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },

  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.38)',
  },

  heroCard: {
    borderRadius: 28,
    paddingVertical: 24,
    paddingHorizontal: 20,
    marginBottom: 16,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 4,
    alignItems: 'center',
  },
  heroLabel: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  heroRank: {
    marginTop: 6,
    fontSize: 54,
    lineHeight: 60,
    fontWeight: '900',
  },
  heroHint: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    opacity: 0.9,
  },

  tabsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 18,
  },
  tabChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'capitalize',
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 12,
    letterSpacing: 0.2,
  },

  podiumSection: {
    marginBottom: 12,
  },
  podiumRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 10,
  },
  podiumSpacer: {
    flex: 1,
  },
  topCard: {
    flex: 1,
    borderRadius: 24,
    padding: 14,
    borderWidth: 1,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 2,
  },
  topBadgeRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  topMedal: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  youTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  youTagText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  topAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  topAvatarText: {
    fontWeight: '900',
    color: '#FFF',
    fontSize: 24,
  },
  topUsername: {
    fontSize: 14,
    fontWeight: '900',
    textAlign: 'center',
  },
  topLevel: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: '700',
  },
  topScoreWrap: {
    marginTop: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 16,
    width: '100%',
    alignItems: 'center',
  },
  topScore: {
    fontSize: 18,
    fontWeight: '900',
  },

  listSection: {
    marginTop: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 22,
    marginBottom: 10,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 1,
  },
  rankContainer: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankPill: {
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  smallMedal: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankNum: {
    fontSize: 15,
    fontWeight: '900',
  },

  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  avatarText: {
    fontWeight: '900',
    color: '#FFF',
    fontSize: 18,
  },

  userInfo: {
    flex: 1,
    justifyContent: 'center',
    minWidth: 0,
  },
  usernameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  username: {
    fontWeight: '800',
    fontSize: 16,
    maxWidth: '82%',
  },
  youBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  youBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  userLevel: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 3,
  },

  scoreWrap: {
    alignItems: 'flex-end',
    marginLeft: 12,
  },
  score: {
    fontWeight: '900',
    fontSize: 18,
    textAlign: 'right',
  },
  scoreLabel: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: '700',
  },

  stateWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  stateText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '600',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 6,
  },
});