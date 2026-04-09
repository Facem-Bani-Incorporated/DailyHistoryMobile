import { Ionicons } from '@expo/vector-icons';
import { X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
import { pushToServer } from '../hooks/useGamificationSync';
import { fetchLeaderboard, LeaderboardEntry, LeaderboardType } from '../services/leaderboardService';

const SERIF = Platform.OS === 'ios' ? 'Georgia' : 'serif';

const TAB_COLORS: Record<LeaderboardType, string> = {
  xp: '#FFB300', streak: '#FF6D00', stories: '#7B5EA7', goals: '#34C759',
};

// Culori vibrante pentru avatare în funcție de nume
const AVATAR_COLORS = ['#EF476F', '#06D6A0', '#118AB2', '#073B4C', '#FFD166', '#8338EC', '#FF9F1C'];

// Funcție pentru a genera aceeași culoare mereu pentru același username
const getAvatarColor = (username: string) => {
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

export default function LeaderboardModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { theme, isDark } = useTheme();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  
  const [activeTab, setActiveTab] = useState<LeaderboardType>('xp');
  const [data, setData] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    await pushToServer();
    const results = await fetchLeaderboard(activeTab);
    setData(results);
    setLoading(false);
  };

  useEffect(() => {
    if (visible) loadData();
  }, [visible, activeTab]);

  const activeColor = TAB_COLORS[activeTab];
  const me = data.find(e => e.isCurrentUser);

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Ionicons name="medal" size={24} color="#FFD700" />; // Gold
    if (rank === 2) return <Ionicons name="medal" size={24} color="#C0C0C0" />; // Silver
    if (rank === 3) return <Ionicons name="medal" size={24} color="#CD7F32" />; // Bronze
    return <Text style={[lbs.rankNum, { color: theme.subtext }]}>{rank}</Text>;
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} statusBarTranslucent>
      <View style={[lbs.root, { backgroundColor: isDark ? '#000000' : '#F8F9FA', paddingTop: insets.top }]}>
        
        {/* HEADER */}
        <View style={lbs.hdr}>
          <TouchableOpacity onPress={onClose} style={lbs.closeBtn}>
            <X size={26} color={theme.text}/>
          </TouchableOpacity>
          <Text style={[lbs.hdrTitle, { color: theme.text }]}>
            {t('leaderboard')}
          </Text>
          <TouchableOpacity onPress={loadData} style={lbs.refreshBtn}>
            <Ionicons name="refresh" size={22} color={theme.text}/>
          </TouchableOpacity>
        </View>

        {/* HERO RANK CARD */}
        <View style={[lbs.heroCard, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF', shadowColor: isDark ? '#000' : '#888' }]}>
          <Text style={[lbs.heroLabel, { color: theme.subtext }]}>{t('your_rank')}</Text>
          <Text style={[lbs.heroRank, { color: activeColor }]}>#{me?.rank || '--'}</Text>
        </View>

        {/* MODERN PILL TABS */}
        <View style={lbs.tabsContainer}>
          {(['xp', 'streak', 'stories', 'goals'] as LeaderboardType[]).map(type => {
            const isActive = activeTab === type;
            const tabColor = TAB_COLORS[type];
            return (
              <TouchableOpacity key={type} onPress={() => setActiveTab(type)} 
                style={[
                  lbs.tabPill, 
                  { backgroundColor: isActive ? tabColor : (isDark ? '#1C1C1E' : '#E9ECEF') }
                ]}>
                <Ionicons 
                  name={type === 'xp' ? 'star' : type === 'streak' ? 'flame' : type === 'stories' ? 'book' : 'trophy'} 
                  size={20} 
                  color={isActive ? '#FFF' : theme.subtext} 
                />
              </TouchableOpacity>
            );
          })}
        </View>

        {/* LEADERBOARD LIST */}
        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 40 }}>
          {loading ? (
            <ActivityIndicator size="large" color={activeColor} style={{marginTop: 50}} />
          ) : data.length === 0 ? (
            <Text style={{textAlign:'center', color: theme.subtext, marginTop: 40, fontSize: 16}}>
              {t('no_users_found')}
            </Text>
          ) : (
            data.map((item) => {
              const avatarColor = getAvatarColor(item.username || 'U');
              const isTop3 = item.rank <= 3;
              
              return (
                <View 
                  key={item.userId} 
                  style={[
                    lbs.row, 
                    { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' },
                    item.isCurrentUser && { 
                      borderColor: activeColor, 
                      borderWidth: 2, 
                      backgroundColor: isDark ? `${activeColor}15` : `${activeColor}10`
                    }
                  ]}
                >
                  <View style={lbs.rankContainer}>
                    {getRankIcon(item.rank)}
                  </View>
                  
                  {/* BEAUTIFUL AVATAR */}
                  <View style={[lbs.avatar, { backgroundColor: avatarColor }]}>
                    <Text style={lbs.avatarText}>
                      {(item.username || '?')[0].toUpperCase()}
                    </Text>
                  </View>
                  
                  <View style={lbs.userInfo}>
                      <Text style={[lbs.username, { color: theme.text }]} numberOfLines={1}>
                        {item.username}
                      </Text>
                      <Text style={[lbs.userLevel, { color: theme.subtext }]}>
                        {t('level')} {item.level}
                      </Text>
                  </View>

                  <Text style={[lbs.score, { color: isTop3 ? theme.text : theme.subtext }]}>
                    {item.value.toLocaleString()}
                  </Text>
                </View>
              );
            })
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const lbs = StyleSheet.create({
  root: { flex: 1 },
  hdr: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15 },
  hdrTitle: { fontSize: 24, fontWeight: '800', fontFamily: SERIF },
  closeBtn: { padding: 8, marginLeft: -8 },
  refreshBtn: { padding: 8, marginRight: -8 },
  
  heroCard: { 
    marginHorizontal: 20, 
    marginBottom: 24, 
    padding: 24, 
    borderRadius: 28, 
    alignItems: 'center',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  heroLabel: { fontSize: 12, fontWeight: '800', letterSpacing: 1.5, marginBottom: 8 },
  heroRank: { fontSize: 48, fontWeight: '900' },
  
  tabsContainer: { flexDirection: 'row', justifyContent: 'center', gap: 12, paddingHorizontal: 20, marginBottom: 20 },
  tabPill: { paddingVertical: 14, paddingHorizontal: 24, borderRadius: 100, alignItems: 'center', justifyContent: 'center' },
  
  row: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 16, 
    borderRadius: 24, 
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  rankContainer: { width: 40, alignItems: 'center', justifyContent: 'center' },
  rankNum: { fontSize: 16, fontWeight: '800' },
  
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  avatarText: { fontWeight: '800', color: '#FFF', fontSize: 20 },
  
  userInfo: { flex: 1, justifyContent: 'center' },
  username: { fontWeight: '700', fontSize: 16, marginBottom: 2 },
  userLevel: { fontSize: 12, fontWeight: '600' },
  
  score: { fontWeight: '900', fontSize: 18 },
});