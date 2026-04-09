// app/(tabs)/index.tsx
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Award, Search, Trophy } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Easing, FlatList, Platform, StyleSheet, Text, TouchableOpacity, View, ViewToken } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../../api';
import AchievementsModal from '../../components/AchievementsModal';
import AchievementToast from '../../components/AchievementToast';
import AdCard from '../../components/AdCard';
import CalendarModal from '../../components/CalendarModal';
import { DiscoverSection } from '../../components/DiscoverSection';
import { HistoryCard } from '../../components/HistoryCard';
import LeaderboardModal from '../../components/LeaderboardModal';
import LockedTomorrowCard from '../../components/LockedTomorrowCard';
import MapScreen from '../../components/MapScreen';
import ProfileAvatar from '../../components/ProfileAvatar';
import SearchScreen from '../../components/SearchScreen';
import StreakIcon from '../../components/StreakIcon';
import type { Tab } from '../../components/TabBar';
import TabBar from '../../components/TabBar';
import TimelineScreen from '../../components/TimelineScreen';
import WeeklyRecapModal from '../../components/WeeklyRecapModal';
import XPBar from '../../components/XPBar';
import { AllEventsProvider } from '../../context/AllEventsContext';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { useInterstitialAd } from '../../hooks/useInterstitialAd';
import { useRewardedUnlock } from '../../hooks/useRewardedUnlock';
import { useAuthStore } from '../../store/useAuthStore';
import { useGamificationStore } from '../../store/useGamificationStore';
import { useUserSavedEvents } from '../../store/useSavedStore';
import { haptic } from '../../utils/haptics';
import { schedulePersonalizedNotification } from '../../utils/Notifications';
import SavedScreen from './saved';

const { width: W } = Dimensions.get('window');
const CACHE_TTL = 30 * 60 * 1000;
const MAX_FWD = 1;
const PAST_DAYS = 200;
const TODAY_INDEX = PAST_DAYS;
const AD_FREQUENCY = 3; 
const STORY_AD_FREQUENCY = 3; // Reclama clip la fiecare 3 povesti

const offDate = (n: number) => { const d = new Date(); d.setDate(d.getDate() + n); return d; };
const toISO = (d: Date) => d.toISOString().split('T')[0];
const isoFor = (n: number) => toISO(offDate(n));
const todayISO = () => new Date().toISOString().split('T')[0];
const labelFor = (off: number, lang: string) => {
  const loc = ({ ro: 'ro-RO', en: 'en-US', fr: 'fr-FR', de: 'de-DE', es: 'es-ES' } as Record<string, string>)[lang] || 'en-US';
  const d = offDate(off);
  return { day: d.getDate().toString().padStart(2, '0'), fullDay: d.toLocaleString(loc, { weekday: 'long' }), monthLong: d.toLocaleString(loc, { month: 'long' }), dayNum: d.getDate(), yearNum: d.getFullYear(), isToday: off === 0, isTomorrow: off === 1 };
};
const d2o = (date: Date) => { const t = new Date(); t.setHours(0, 0, 0, 0); const d = new Date(date); d.setHours(0, 0, 0, 0); return Math.round((d.getTime() - t.getTime()) / 86400000); };

interface PD { data: any[]; empty: boolean }
const EMPTY: PD = { data: [], empty: true };
const ck = (iso: string) => `dh_v2_${iso}`;
const rC = async (iso: string) => { try { const r = await AsyncStorage.getItem(ck(iso)); if (!r) return null; const e = JSON.parse(r); return Date.now() - e.ts > CACHE_TTL ? null : e as { ts: number; data: any[]; empty: boolean }; } catch { return null; } };
const wC = async (iso: string, d: any[], e: boolean) => { try { await AsyncStorage.setItem(ck(iso), JSON.stringify({ ts: Date.now(), data: d, empty: e })); } catch { } };

const EmptyDay = ({ isToday, theme, t }: { isToday: boolean; theme: any; t: (k: string) => string }) => (
  <View style={ey.w}><View style={[ey.r, { borderColor: theme.gold + '20' }]}><Text style={[ey.i, { color: theme.gold }]}>{isToday ? '~' : '\u2014'}</Text></View><Text style={[ey.t, { color: theme.text }]}>{isToday ? t('today') : t('no_content')}</Text><Text style={[ey.d, { color: theme.subtext }]}>{isToday ? t('empty_today_desc') : t('empty_day_desc')}</Text></View>
);
const ey = StyleSheet.create({ w: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 40 }, r: { width: 64, height: 64, borderRadius: 32, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginBottom: 4 }, i: { fontSize: 24, fontWeight: '300' }, t: { fontSize: 18, fontWeight: '700', letterSpacing: 0.2 }, d: { fontSize: 13, textAlign: 'center', lineHeight: 20, opacity: 0.7 } });

const DAY_OFFSETS = Array.from({ length: PAST_DAYS + 1 + MAX_FWD }, (_, i) => i - PAST_DAYS);

const PremiumAccentLine = () => {
  const shimmer = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(Animated.timing(shimmer, { toValue: 1, duration: 3000, easing: Easing.inOut(Easing.sin), useNativeDriver: true })).start();
  }, []);
  const op = shimmer.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.2, 0.6, 0.2] });
  return (
    <Animated.View style={{ height: 1, marginHorizontal: 20, marginBottom: 2, backgroundColor: '#D4A843', opacity: op, borderRadius: 1 }} />
  );
};

export default function HomeScreen() {
  const { theme, isDark, isPremium } = useTheme();
  const { t, language } = useLanguage();
  const insets = useSafeAreaInsets();
  const userSaved = useUserSavedEvents();
  const recordVisit = useGamificationStore(s => s.recordDailyVisit);
  const genRecap = useGamificationStore(s => s.generateWeeklyRecap);
  const getRecap = useGamificationStore(s => s.getUnseenRecap);
  const newAch = useGamificationStore(s => s.newAchievements);
  const totalEventsRead = useGamificationStore(s => s.totalEventsRead);

  const { maybeShowInterstitial } = useInterstitialAd();
  const { showForUnlock, isUnlockReady } = useRewardedUnlock();

  const [tomorrowMainUnlocked, setTomorrowMainUnlocked] = useState(false);
  const [tomorrowDiscoverUnlocked, setTomorrowDiscoverUnlocked] = useState(false);
  const [unlockDate, setUnlockDate] = useState(todayISO());

  useEffect(() => {
    const today = todayISO();
    if (unlockDate !== today) { setTomorrowMainUnlocked(false); setTomorrowDiscoverUnlocked(false); setUnlockDate(today); }
  });

  const handleUnlockMain = useCallback(() => { showForUnlock(() => { haptic('success'); setTomorrowMainUnlocked(true); }); }, [showForUnlock]);
  const handleUnlockDiscover = useCallback(() => { showForUnlock(() => { haptic('success'); setTomorrowDiscoverUnlocked(true); }); }, [showForUnlock]);

  const [achVis, setAchVis] = useState(false);
  const [leadVis, setLeadVis] = useState(false);
  const [recapVis, setRecapVis] = useState(false);
  const [calVis, setCalVis] = useState(false);
  const [off, setOff] = useState(0);
  const [allEvents, setAllEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('today');
  const user = useAuthStore(s => s.user);
  const [seenSaved, setSeenSaved] = useState(userSaved.length);
  useEffect(() => { setSeenSaved(userSaved.length); }, [user?.id]);
  const unseenSaved = tab === 'saved' ? 0 : Math.max(0, userSaved.length - seenSaved);

  // LOGICA RECLAMA VIDEO LA 3 POVESTI
  const prevEventsRead = useRef(totalEventsRead);
  useEffect(() => { 
    if (totalEventsRead > prevEventsRead.current) {
      // Daca numarul de povesti citite este multiplu de 3, apelăm funcția
      if (totalEventsRead % STORY_AD_FREQUENCY === 0) {
        // Trimitem totalEventsRead (număr) în loc de boolean pentru a respecta tipul de date
        maybeShowInterstitial(totalEventsRead); 
      }
    } 
    prevEventsRead.current = totalEventsRead; 
  }, [totalEventsRead]);

  const mem = useRef<Record<string, PD>>({});
  const [tick, setTick] = useState(0);

  const fetchOne = useCallback(async (o: number, force = false): Promise<PD> => {
    const iso = isoFor(o);
    if (!force && mem.current[iso]) return mem.current[iso];
    if (!force) { const c = await rC(iso); if (c) { mem.current[iso] = { data: c.data, empty: c.empty }; return mem.current[iso]; } }
    try { const r = await api.get('/daily-content/by-date', { params: { date: iso, _t: Date.now() } }); const data: any[] = r.data?.events ?? []; const pg: PD = { data, empty: data.length === 0 }; mem.current[iso] = pg; wC(iso, data, pg.empty); return pg; } catch { return EMPTY; }
  }, []);

  const fetchAll = useCallback(async () => {
    const ps = Array.from({ length: 60 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - i); return api.get('/daily-content/by-date', { params: { date: d.toISOString().split('T')[0] } }).then(r => r.data?.events ?? []).catch(() => []); });
    const all = (await Promise.all(ps)).flat(); const seen = new Set<string>();
    setAllEvents(all.filter((e: any) => { const id = `${e.eventDate}-${e.titleTranslations?.en}`; if (seen.has(id)) return false; seen.add(id); return true; }));
  }, []);

  useEffect(() => {
    recordVisit(); try { genRecap(); } catch { }
    setTimeout(() => { if (getRecap()) setRecapVis(true); }, 2000);
    Promise.all([fetchOne(0), fetchOne(-1), fetchOne(1)]).then(() => { setLoading(false); setTick(t => t + 1); fetchAll(); for (let i = 2; i <= 7; i++) fetchOne(-i).catch(() => { }); fetchOne(1).then(d => schedulePersonalizedNotification(d.data, language)).catch(() => schedulePersonalizedNotification([], language)); });
  }, []);

  const listRef = useRef<FlatList>(null);
  const dateAnim = useRef(new Animated.Value(0)).current;

  const onViewRef = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0) { const idx = viewableItems[0].index ?? TODAY_INDEX; const newOff = idx - PAST_DAYS; setOff(newOff); const iso1 = isoFor(newOff - 1); const iso2 = isoFor(newOff + 1); if (!mem.current[iso1]) fetchOne(newOff - 1).then(() => setTick(t => t + 1)).catch(() => { }); if (!mem.current[iso2]) fetchOne(newOff + 1).then(() => setTick(t => t + 1)).catch(() => { }); }
  });
  const viewConfigRef = useRef({ viewAreaCoveragePercentThreshold: 50 });

  const goFwd = useCallback(() => { if (off >= MAX_FWD) return; haptic('light'); const idx = off + 1 + PAST_DAYS; listRef.current?.scrollToIndex({ index: idx, animated: true }); Animated.sequence([Animated.timing(dateAnim, { toValue: -16, duration: 80, useNativeDriver: true }), Animated.spring(dateAnim, { toValue: 0, tension: 220, friction: 24, useNativeDriver: true })]).start(); }, [off, dateAnim]);
  const goBck = useCallback(() => { haptic('light'); const idx = off - 1 + PAST_DAYS; if (idx >= 0) listRef.current?.scrollToIndex({ index: idx, animated: true }); Animated.sequence([Animated.timing(dateAnim, { toValue: 16, duration: 80, useNativeDriver: true }), Animated.spring(dateAnim, { toValue: 0, tension: 220, friction: 24, useNativeDriver: true })]).start(); }, [off, dateAnim]);
  const jump = useCallback((newOff: number) => { if (newOff > MAX_FWD) return; haptic('medium'); const idx = newOff + PAST_DAYS; if (idx >= 0 && idx < DAY_OFFSETS.length) fetchOne(newOff).then(() => { setTick(t => t + 1); listRef.current?.scrollToIndex({ index: idx, animated: false }); }); }, [fetchOne]);

  const renderItem = useCallback(({ item: dayOff }: { item: number }) => {
    if (dayOff === 1) {
      if (tab === 'today' && !tomorrowMainUnlocked) return <View style={{ width: W, paddingHorizontal: 16, paddingTop: 12, flex: 1 }}><LockedTomorrowCard variant="main" onUnlock={handleUnlockMain} isReady={isUnlockReady} /></View>;
      if (tab === 'discover' && !tomorrowDiscoverUnlocked) return <View style={{ width: W, paddingHorizontal: 16, paddingTop: 12, flex: 1 }}><LockedTomorrowCard variant="discover" onUnlock={handleUnlockDiscover} isReady={isUnlockReady} /></View>;
    }
    if (dayOff < 0 && Math.abs(dayOff) % AD_FREQUENCY === 0 && tab === 'today') return <View style={{ width: W, paddingHorizontal: 16, paddingTop: 12, flex: 1 }}><AdCard /></View>;

    const iso = isoFor(dayOff); const pg = mem.current[iso] ?? EMPTY;
    const sorted = [...pg.data].sort((a, b) => (b.impactScore ?? 0) - (a.impactScore ?? 0));
    const main = sorted[0] ?? null; const pi = labelFor(dayOff, language);

    if (tab === 'today') {
      if (pg.empty || !main) return <View style={{ width: W, paddingHorizontal: 16, paddingTop: 12, flex: 1 }}><EmptyDay isToday={pi.isToday} theme={theme} t={t} /></View>;
      return <View style={{ width: W, paddingHorizontal: 16, paddingTop: 12, flex: 1 }}><HistoryCard event={main} allEvents={allEvents} /></View>;
    } else {
      return <View style={{ width: W, paddingHorizontal: 16, paddingTop: 12, flex: 1 }}><DiscoverSection events={sorted} theme={theme} t={t} /></View>;
    }
  }, [tab, theme, t, language, allEvents, tick, tomorrowMainUnlocked, tomorrowDiscoverUnlocked, isUnlockReady, handleUnlockMain, handleUnlockDiscover]);

  const getItemLayout = useCallback((_: any, index: number) => ({ length: W, offset: W * index, index }), []);

  const ms = makeStyles(theme, isDark, isPremium);
  const info = labelFor(off, language);
  const canFwd = off < MAX_FWD;
  const showChrome = tab === 'today' || tab === 'discover' || tab === 'search';
  const badgeCnt = newAch.length;
  const switchTab = useCallback((t: Tab) => { setTab(t); if (t === 'saved') setSeenSaved(userSaved.length); }, [userSaved.length]);
  const swipeOn = tab === 'today' || tab === 'discover';
  const isTomorrowNext = off === 0 && canFwd;
  const isTomorrowLocked = isTomorrowNext && ((tab === 'today' && !tomorrowMainUnlocked) || (tab === 'discover' && !tomorrowDiscoverUnlocked));

  const goldColor = isPremium ? '#D4A843' : theme.gold;

  return (
    <AllEventsProvider events={allEvents}>
      <View style={ms.root}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <AchievementToast />
        {showChrome && (
          <View style={[ms.chrome, { paddingTop: insets.top }]}>
            {isPremium && (
              <LinearGradient
                colors={['#0A0815', '#05040A']}
                style={StyleSheet.absoluteFill}
              />
            )}

            <View style={ms.brandRow}>
              <View style={ms.brandLeft}>
                <Text style={[ms.brandLabel, { color: goldColor }]}>{t('Daily').toUpperCase()}</Text>
                <Text style={[ms.brandTitle, { color: theme.text }]}>{t('History')}</Text>
              </View>
              <View style={ms.headerRight}>
                <TouchableOpacity onPress={() => { haptic('light'); setLeadVis(true); }} activeOpacity={0.6} style={ms.searchBtn}><Trophy size={20} color={theme.subtext} strokeWidth={1.8} /></TouchableOpacity>
                <TouchableOpacity onPress={() => switchTab('search')} activeOpacity={0.6} style={[ms.searchBtn, { backgroundColor: tab === 'search' ? goldColor + '18' : 'transparent' }]}><Search size={20} color={tab === 'search' ? goldColor : theme.subtext} strokeWidth={1.8} /></TouchableOpacity>
                <TouchableOpacity onPress={() => { haptic('light'); setAchVis(true); }} activeOpacity={0.6} style={[ms.achieveBtn, {
                  backgroundColor: badgeCnt > 0 ? goldColor + '18' : 'transparent',
                  borderColor: badgeCnt > 0 ? goldColor + '40' : isPremium ? '#2A2230' : 'transparent',
                }]}>
                  <Award size={19} color={badgeCnt > 0 ? goldColor : theme.subtext} strokeWidth={1.8} />
                  {badgeCnt > 0 && <View style={[ms.achBadge, { backgroundColor: isPremium ? '#C17B2A' : '#FF6D00' }]}><Text style={ms.achBadgeT}>{badgeCnt}</Text></View>}
                </TouchableOpacity>
                <StreakIcon /><ProfileAvatar />
              </View>
            </View>

            {isPremium && <PremiumAccentLine />}

            {(tab === 'today' || tab === 'discover') && <XPBar />}
            {tab !== 'search' && (
              <Animated.View style={[ms.dateNav, { transform: [{ translateX: dateAnim }] }]}>
                <TouchableOpacity onPress={goBck} activeOpacity={0.6} hitSlop={{ top: 16, bottom: 16, left: 12, right: 12 }} style={ms.navArrow}><Text style={[ms.navArrowIcon, { color: theme.subtext }]}>{'\u2039'}</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => { haptic('light'); setCalVis(true); }} activeOpacity={0.7} style={ms.dateCenter}>
                  <View style={ms.datePrimary}>
                    <View style={[ms.dayCircle, {
                      backgroundColor: info.isToday ? goldColor : 'transparent',
                      borderColor: info.isToday ? goldColor : isPremium ? '#2A2230' : theme.border,
                      ...(isPremium && info.isToday && {
                        shadowColor: '#D4A843', shadowOffset: { width: 0, height: 0 },
                        shadowOpacity: 0.4, shadowRadius: 8, elevation: 6,
                      }),
                    }]}>
                      <Text style={[ms.dayNum, { color: info.isToday ? (isPremium ? '#05040A' : '#000') : theme.text }]}>{info.day}</Text>
                    </View>
                    <View style={ms.dateTexts}>
                      <Text style={[ms.dateLabel, { color: theme.text }]}>{info.isToday ? t('today') : info.isTomorrow ? t('tomorrow') : info.fullDay}</Text>
                      <Text style={[ms.dateSub, { color: theme.subtext }]}>{`${info.monthLong} ${info.dayNum}, ${info.yearNum}`}</Text>
                    </View>
                  </View>
                </TouchableOpacity>

                {isTomorrowLocked ? (
                  <TouchableOpacity onPress={goFwd} activeOpacity={0.6} hitSlop={{ top: 16, bottom: 16, left: 12, right: 12 }}
                    style={[ms.unlockArrow, { backgroundColor: goldColor + '15', borderColor: goldColor + '35' }]}>
                    <Ionicons name="lock-closed" size={13} color={goldColor} />
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity onPress={goFwd} activeOpacity={0.6} disabled={!canFwd} hitSlop={{ top: 16, bottom: 16, left: 12, right: 12 }} style={[ms.navArrow, !canFwd && { opacity: 0.2 }]}>
                    <Text style={[ms.navArrowIcon, { color: theme.subtext }]}>{'\u203A'}</Text>
                  </TouchableOpacity>
                )}
              </Animated.View>
            )}
            <View style={[ms.sep, { backgroundColor: isPremium ? '#D4A84315' : theme.border }]} />
          </View>
        )}

        <View style={{ flex: 1 }}>
          {tab === 'saved' ? <SavedScreen />
            : tab === 'map' ? <MapScreen />
            : tab === 'search' ? <SearchScreen allEvents={allEvents} />
            : tab === 'timeline' ? <TimelineScreen allEvents={allEvents} />
            : loading ? <View style={ms.loadW}><View style={[ms.loadP, { borderColor: goldColor + '25' }]}><Text style={{ color: goldColor, fontSize: 22, opacity: 0.4 }}>{'\u25CB'}</Text></View></View>
            : swipeOn ? (
              <FlatList ref={listRef} data={DAY_OFFSETS} keyExtractor={(item) => String(item)} renderItem={renderItem} horizontal pagingEnabled showsHorizontalScrollIndicator={false} initialScrollIndex={TODAY_INDEX} getItemLayout={getItemLayout} onViewableItemsChanged={onViewRef.current} viewabilityConfig={viewConfigRef.current} maxToRenderPerBatch={3} windowSize={3} removeClippedSubviews={false} extraData={tick} />
            ) : null}
        </View>

        <TabBar active={tab} onSwitch={switchTab} unseenSaved={unseenSaved} t={t} />
        <AchievementsModal visible={achVis} onClose={() => setAchVis(false)} />
        <LeaderboardModal visible={leadVis} onClose={() => setLeadVis(false)} />
        <WeeklyRecapModal visible={recapVis} onClose={() => setRecapVis(false)} />
        <CalendarModal visible={calVis} onClose={() => setCalVis(false)} onSelectDate={(d: Date) => jump(d2o(d))} selectedDate={offDate(off)} maxFutureOffset={MAX_FWD} />
      </View>
    </AllEventsProvider>
  );
}

const makeStyles = (theme: any, isDark: boolean, isPremium: boolean) => StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.background },
  chrome: { backgroundColor: isPremium ? 'transparent' : theme.background, paddingHorizontal: 20, overflow: 'hidden' },
  brandRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10, paddingBottom: 14 },
  brandLeft: { gap: 1 },
  brandLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 4, opacity: isPremium ? 0.8 : 0.6 },
  brandTitle: { fontSize: 22, fontWeight: '800', letterSpacing: 0.5, fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  searchBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  achieveBtn: { width: 36, height: 36, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  achBadge: { position: 'absolute', top: -4, right: -4, minWidth: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  achBadgeT: { fontSize: 9, fontWeight: '900', color: '#FFF' },
  dateNav: { flexDirection: 'row', alignItems: 'center', paddingBottom: 14 },
  navArrow: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  navArrowIcon: { fontSize: 28, fontWeight: '300', lineHeight: 30, marginTop: -1 },
  dateCenter: { flex: 1, alignItems: 'center' },
  datePrimary: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dayCircle: { width: 44, height: 44, borderRadius: 22, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  dayNum: { fontSize: 17, fontWeight: '800', letterSpacing: -0.5 },
  dateTexts: { gap: 2 },
  dateLabel: { fontSize: 16, fontWeight: '700', letterSpacing: 0.2 },
  dateSub: { fontSize: 12, fontWeight: '500', opacity: 0.6 },
  sep: { height: isPremium ? 1 : StyleSheet.hairlineWidth },
  loadW: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadP: { width: 56, height: 56, borderRadius: 28, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  unlockArrow: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
});