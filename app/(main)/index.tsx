// app/(tabs)/index.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { Award, Bookmark, CalendarDays, Clock, Compass, Map, Search } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Easing, PanResponder, Platform, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../../api';
import AchievementsModal from '../../components/AchievementsModal';
import AchievementToast from '../../components/AchievementToast';
import { DiscoverSection } from '../../components/DiscoverSection';
import { HistoryCard } from '../../components/HistoryCard';
import MapScreen from '../../components/MapScreen';
import ProfileAvatar from '../../components/ProfileAvatar';
import SearchScreen from '../../components/SearchScreen';
import StreakIcon from '../../components/StreakIcon';
import TimelineScreen from '../../components/TimelineScreen';
import WeeklyRecapModal from '../../components/WeeklyRecapModal';
import XPBar from '../../components/XPBar';
import { AllEventsProvider } from '../../context/AllEventsContext';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { useAuthStore } from '../../store/useAuthStore';
import { useGamificationStore } from '../../store/useGamificationStore';
import { useSavedStore, useUserSavedEvents } from '../../store/useSavedStore';
import { haptic } from '../../utils/haptics';
import { schedulePersonalizedNotification } from '../../utils/Notifications';
import SavedScreen from './saved';

const { width: W } = Dimensions.get('window');
const SWIPE_THRESHOLD = W * 0.2; const VELOCITY_THRESHOLD = 0.4; const CACHE_TTL_MS = 30 * 60 * 1000; const MAX_FUTURE_OFFSET = 1;
const offsetDate = (n: number): Date => { const d = new Date(); d.setDate(d.getDate() + n); return d; };
const toISO = (d: Date) => d.toISOString().split('T')[0];
const labelFor = (offset: number, lang: string) => { const d = offsetDate(offset); const localeMap: Record<string, string> = { ro: 'ro-RO', en: 'en-US', fr: 'fr-FR', de: 'de-DE', es: 'es-ES' }; const loc = localeMap[lang] || 'en-US'; return { day: d.getDate().toString().padStart(2, '0'), fullDay: d.toLocaleString(loc, { weekday: 'long' }), monthLong: d.toLocaleString(loc, { month: 'long' }), dayNum: d.getDate(), yearNum: d.getFullYear(), iso: toISO(d), isToday: offset === 0, isTomorrow: offset === 1 }; };
interface CacheEntry { ts: number; data: any[]; empty: boolean }
const cacheKey = (iso: string) => `dh_v2_${iso}`;
const readCache = async (iso: string): Promise<CacheEntry | null> => { try { const raw = await AsyncStorage.getItem(cacheKey(iso)); if (!raw) return null; const e: CacheEntry = JSON.parse(raw); if (Date.now() - e.ts > CACHE_TTL_MS) return null; return e; } catch { return null; } };
const writeCache = async (iso: string, data: any[], empty: boolean) => { try { await AsyncStorage.setItem(cacheKey(iso), JSON.stringify({ ts: Date.now(), data, empty })); } catch {} };
const clearCacheForDate = async (iso: string) => { try { await AsyncStorage.removeItem(cacheKey(iso)); } catch {} };

const EmptyDay = ({ isToday, theme, onRetry, t }: { isToday: boolean; theme: any; onRetry: () => void; t: (k: string) => string }) => (
  <View style={emptyStyles.wrap}><View style={[emptyStyles.iconRing, { borderColor: theme.gold + '20' }]}><Text style={[emptyStyles.icon, { color: theme.gold }]}>{isToday ? '~' : '\u2014'}</Text></View><Text style={[emptyStyles.title, { color: theme.text }]}>{isToday ? t('today') : t('no_content')}</Text><Text style={[emptyStyles.desc, { color: theme.subtext }]}>{isToday ? t('empty_today_desc') : t('empty_day_desc')}</Text>{isToday && (<TouchableOpacity onPress={onRetry} activeOpacity={0.7} style={[emptyStyles.retryBtn, { borderColor: theme.gold + '30' }]}><Text style={[emptyStyles.retryTxt, { color: theme.gold }]}>{t('retry').toUpperCase()}</Text></TouchableOpacity>)}</View>
);
const emptyStyles = StyleSheet.create({ wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 40 }, iconRing: { width: 64, height: 64, borderRadius: 32, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginBottom: 4 }, icon: { fontSize: 24, fontWeight: '300' }, title: { fontSize: 18, fontWeight: '700', letterSpacing: 0.2 }, desc: { fontSize: 13, textAlign: 'center', lineHeight: 20, opacity: 0.7 }, retryBtn: { marginTop: 8, paddingVertical: 10, paddingHorizontal: 28, borderRadius: 24, borderWidth: 1 }, retryTxt: { fontSize: 11, fontWeight: '700', letterSpacing: 2 } });

type Tab = 'today' | 'discover' | 'search' | 'timeline' | 'map' | 'saved';

export default function HomeScreen() {
  const { theme, isDark } = useTheme(); const { t, language } = useLanguage(); const insets = useSafeAreaInsets();
  const { savedEvents } = useSavedStore(); const userSavedEvents = useUserSavedEvents();
  const recordDailyVisit = useGamificationStore(s => s.recordDailyVisit); const generateWeeklyRecap = useGamificationStore(s => s.generateWeeklyRecap);
  const getUnseenRecap = useGamificationStore(s => s.getUnseenRecap); const newAchievements = useGamificationStore(s => s.newAchievements);
  const [achievementsVisible, setAchievementsVisible] = useState(false); const [weeklyRecapVisible, setWeeklyRecapVisible] = useState(false);
  const [dayOffset, setDayOffset] = useState(0); const [events, setEvents] = useState<any[]>([]); const [allCollectedEvents, setAllCollectedEvents] = useState<any[]>([]);
  const [isEmpty, setIsEmpty] = useState(false); const [initialLoad, setInitialLoad] = useState(true); const [isRefreshing, setIsRefreshing] = useState(false); const [activeTab, setActiveTab] = useState<Tab>('today');
  const user = useAuthStore(s => s.user); const [seenSavedCount, setSeenSavedCount] = useState(userSavedEvents.length);
  useEffect(() => { setSeenSavedCount(userSavedEvents.length); }, [user?.id]);
  const unseenSaved = activeTab === 'saved' ? 0 : Math.max(0, userSavedEvents.length - seenSavedCount);
  const prefetchCache = useRef<Record<string, { data: any[]; empty: boolean }>>({}); const cardX = useRef(new Animated.Value(0)).current; const dateSlide = useRef(new Animated.Value(0)).current; const cardOpacity = useRef(new Animated.Value(1)).current;

  const fetchData = useCallback(async (offset: number, forceRefresh = false): Promise<{ data: any[]; empty: boolean }> => {
    const iso = toISO(offsetDate(offset)); if (!forceRefresh) { if (prefetchCache.current[iso]) return prefetchCache.current[iso]; const cached = await readCache(iso); if (cached) { prefetchCache.current[iso] = { data: cached.data, empty: cached.empty }; return prefetchCache.current[iso]; } }
    try { const response = await api.get('/daily-content/by-date', { params: { date: iso, _t: Date.now() } }); const data: any[] = response.data?.events ?? []; const result = { data, empty: data.length === 0 }; prefetchCache.current[iso] = result; await writeCache(iso, data, data.length === 0); return result; } catch { return { data: [], empty: true }; }
  }, []);
  const handleRefresh = useCallback(async () => { setIsRefreshing(true); haptic('light'); const iso = toISO(offsetDate(dayOffset)); delete prefetchCache.current[iso]; await clearCacheForDate(iso); const { data, empty } = await fetchData(dayOffset, true); setEvents(data); setIsEmpty(empty); setIsRefreshing(false); }, [dayOffset, fetchData]);
  const prefetchNeighbours = useCallback((offset: number) => { fetchData(offset - 1).catch(() => {}); if (offset < MAX_FUTURE_OFFSET) fetchData(offset + 1).catch(() => {}); }, [fetchData]);
  const fetchAllEvents = useCallback(async () => { const promises = Array.from({ length: 60 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - i); return api.get('/daily-content/by-date', { params: { date: d.toISOString().split('T')[0] } }).then(r => r.data?.events ?? []).catch(() => []); }); const all = (await Promise.all(promises)).flat(); const seen = new Set<string>(); setAllCollectedEvents(all.filter((e: any) => { const id = `${e.eventDate}-${e.titleTranslations?.en}`; if (seen.has(id)) return false; seen.add(id); return true; })); }, []);

  useEffect(() => { recordDailyVisit(); try { generateWeeklyRecap(); } catch {} setTimeout(() => { const unseen = getUnseenRecap(); if (unseen) setWeeklyRecapVisible(true); }, 2000);
    fetchData(0).then(async ({ data, empty }) => { setEvents(data); setIsEmpty(empty); setInitialLoad(false); prefetchNeighbours(0); fetchAllEvents();
      try { const tomorrow = await fetchData(1); schedulePersonalizedNotification(tomorrow.data, language); } catch { schedulePersonalizedNotification([], language); }
    }); }, []);

  const navigating = useRef(false);
  const navigateToOffset = useCallback(async (newOffset: number, direction: 'left' | 'right') => {
    if (navigating.current || newOffset > MAX_FUTURE_OFFSET) return; navigating.current = true; haptic('light');
    const exitTo = direction === 'left' ? -W * 0.4 : W * 0.4; const enterFrom = direction === 'left' ? W * 0.3 : -W * 0.3;
    await new Promise<void>(resolve => Animated.parallel([Animated.timing(cardX, { toValue: exitTo, duration: 200, easing: Easing.out(Easing.cubic), useNativeDriver: true }), Animated.timing(cardOpacity, { toValue: 0, duration: 180, easing: Easing.out(Easing.cubic), useNativeDriver: true }), Animated.timing(dateSlide, { toValue: direction === 'left' ? -30 : 30, duration: 200, easing: Easing.out(Easing.cubic), useNativeDriver: true })]).start(() => resolve()));
    cardX.setValue(enterFrom); dateSlide.setValue(direction === 'left' ? 20 : -20); setDayOffset(newOffset); const { data, empty } = await fetchData(newOffset); setEvents(data); setIsEmpty(empty);
    await new Promise<void>(resolve => Animated.parallel([Animated.spring(cardX, { toValue: 0, tension: 200, friction: 26, useNativeDriver: true }), Animated.timing(cardOpacity, { toValue: 1, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }), Animated.spring(dateSlide, { toValue: 0, tension: 200, friction: 26, useNativeDriver: true })]).start(() => resolve()));
    navigating.current = false; prefetchNeighbours(newOffset);
  }, [cardX, cardOpacity, dateSlide, fetchData, prefetchNeighbours]);
  const goBack = useCallback(() => navigateToOffset(dayOffset - 1, 'right'), [dayOffset, navigateToOffset]);
  const goForward = useCallback(() => { if (dayOffset < MAX_FUTURE_OFFSET) navigateToOffset(dayOffset + 1, 'left'); }, [dayOffset, navigateToOffset]);
  const navRef = useRef({ goBack, goForward, dayOffset }); useEffect(() => { navRef.current = { goBack, goForward, dayOffset }; }, [goBack, goForward, dayOffset]);

  const pan = useRef(PanResponder.create({ onStartShouldSetPanResponder: () => false, onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > Math.abs(g.dy) * 1.6 && Math.abs(g.dx) > 8, onShouldBlockNativeResponder: () => false,
    onPanResponderGrant: () => { cardX.stopAnimation(); cardOpacity.stopAnimation(); dateSlide.stopAnimation(); },
    onPanResponderMove: (_, g) => { const { dayOffset: off } = navRef.current; if (off >= MAX_FUTURE_OFFSET && g.dx < 0) { const r = Math.sign(g.dx) * Math.pow(Math.abs(g.dx), 0.6) * 1.2; cardX.setValue(r); dateSlide.setValue(r * 0.15); cardOpacity.setValue(1 - Math.min(Math.abs(r) / W, 0.15)); } else { cardX.setValue(g.dx); dateSlide.setValue(g.dx * 0.2); cardOpacity.setValue(1 - Math.abs(g.dx) / W * 0.3); } },
    onPanResponderRelease: (_, g) => { const { dayOffset: off, goBack: gb, goForward: gf } = navRef.current; const fwd = off < MAX_FUTURE_OFFSET && (g.dx < -SWIPE_THRESHOLD || (g.vx < -VELOCITY_THRESHOLD && g.dx < -15)); const bck = g.dx > SWIPE_THRESHOLD || (g.vx > VELOCITY_THRESHOLD && g.dx > 15); if (fwd) gf(); else if (bck) gb(); else Animated.parallel([Animated.spring(cardX, { toValue: 0, tension: 300, friction: 28, useNativeDriver: true }), Animated.timing(cardOpacity, { toValue: 1, duration: 180, useNativeDriver: true }), Animated.spring(dateSlide, { toValue: 0, tension: 300, friction: 28, useNativeDriver: true })]).start(); },
    onPanResponderTerminate: () => { Animated.parallel([Animated.spring(cardX, { toValue: 0, tension: 300, friction: 28, useNativeDriver: true }), Animated.timing(cardOpacity, { toValue: 1, duration: 150, useNativeDriver: true }), Animated.spring(dateSlide, { toValue: 0, tension: 300, friction: 28, useNativeDriver: true })]).start(); },
  })).current;

  const ms = makeStyles(theme, isDark); const info = labelFor(dayOffset, language);
  const sortedEvents = [...events].sort((a, b) => (b.impactScore ?? 0) - (a.impactScore ?? 0));
  const todayEvent = sortedEvents[0] ?? null; const discoverEvents = sortedEvents.slice(1);
  const canGoForward = dayOffset < MAX_FUTURE_OFFSET; const showChrome = activeTab === 'today' || activeTab === 'discover' || activeTab === 'search';
  const achievementBadgeCount = newAchievements.length;
  const switchTab = useCallback((tab: Tab) => { haptic('selection'); setActiveTab(tab); if (tab === 'saved') setSeenSavedCount(userSavedEvents.length); }, [userSavedEvents.length]);

  return (
    <AllEventsProvider events={allCollectedEvents}>
      <View style={ms.root}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <AchievementToast />
        {showChrome && (
          <View style={[ms.chrome, { paddingTop: insets.top }]}>
            <View style={ms.brandRow}>
              <View style={ms.brandLeft}><Text style={ms.brandLabel}>{t('Daily').toUpperCase()}</Text><Text style={ms.brandTitle}>{t('History')}</Text></View>
              <View style={ms.headerRight}>
                <TouchableOpacity onPress={() => switchTab('search')} activeOpacity={0.6} style={[ms.searchBtn, { backgroundColor: activeTab === 'search' ? theme.gold + '18' : 'transparent' }]}><Search size={20} color={activeTab === 'search' ? theme.gold : theme.subtext} strokeWidth={1.8} /></TouchableOpacity>
                <TouchableOpacity onPress={() => { haptic('light'); setAchievementsVisible(true); }} activeOpacity={0.6} style={[ms.achieveBtn, { backgroundColor: achievementBadgeCount > 0 ? theme.gold + '18' : 'transparent', borderColor: achievementBadgeCount > 0 ? theme.gold + '40' : 'transparent' }]}>
                  <Award size={19} color={achievementBadgeCount > 0 ? theme.gold : theme.subtext} strokeWidth={1.8} />
                  {achievementBadgeCount > 0 && (<View style={[ms.achieveBadge, { backgroundColor: '#FF6D00' }]}><Text style={ms.achieveBadgeText}>{achievementBadgeCount}</Text></View>)}
                </TouchableOpacity>
                <StreakIcon /><ProfileAvatar />
              </View>
            </View>
            {(activeTab === 'today' || activeTab === 'discover') && <XPBar />}
            {activeTab !== 'search' && (
              <Animated.View style={[ms.dateNav, { transform: [{ translateX: dateSlide }] }]}>
                <TouchableOpacity onPress={goBack} activeOpacity={0.6} hitSlop={{ top: 16, bottom: 16, left: 12, right: 12 }} style={ms.navArrow}><Text style={[ms.navArrowIcon, { color: theme.subtext }]}>{'\u2039'}</Text></TouchableOpacity>
                <View style={ms.dateCenter}><View style={ms.datePrimary}><View style={[ms.dayCircle, { backgroundColor: info.isToday ? theme.gold : 'transparent', borderColor: info.isToday ? theme.gold : theme.border }]}><Text style={[ms.dayNumber, { color: info.isToday ? '#000' : theme.text }]}>{info.day}</Text></View><View style={ms.dateTexts}><Text style={[ms.dateLabel, { color: theme.text }]}>{info.isToday ? t('today') : info.isTomorrow ? t('tomorrow') || 'Tomorrow' : info.fullDay}</Text><Text style={[ms.dateSubLabel, { color: theme.subtext }]}>{`${info.monthLong} ${info.dayNum}, ${info.yearNum}`}</Text></View></View></View>
                <TouchableOpacity onPress={goForward} activeOpacity={0.6} disabled={!canGoForward} hitSlop={{ top: 16, bottom: 16, left: 12, right: 12 }} style={[ms.navArrow, !canGoForward && { opacity: 0.2 }]}><Text style={[ms.navArrowIcon, { color: theme.subtext }]}>{'\u203A'}</Text></TouchableOpacity>
              </Animated.View>
            )}
            <View style={[ms.separator, { backgroundColor: theme.border }]} />
          </View>
        )}
        <View style={{ flex: 1 }}>
          {activeTab === 'saved' ? <SavedScreen /> : activeTab === 'map' ? <MapScreen /> : activeTab === 'search' ? <SearchScreen allEvents={allCollectedEvents} /> : activeTab === 'timeline' ? <TimelineScreen allEvents={allCollectedEvents} /> : initialLoad ? (
            <View style={ms.loadingWrap}><View style={[ms.loadingPulse, { borderColor: theme.gold + '25' }]}><Text style={{ color: theme.gold, fontSize: 22, opacity: 0.4 }}>{'\u25CB'}</Text></View></View>
          ) : (
            <View style={ms.contentWrap} {...(activeTab === 'today' ? pan.panHandlers : {})}>
              {activeTab === 'today' ? (isEmpty || !todayEvent ? (<EmptyDay isToday={info.isToday} theme={theme} t={t} onRetry={() => { prefetchCache.current = {}; fetchData(dayOffset, true).then(({ data, empty }) => { setEvents(data); setIsEmpty(empty); }); }} />) : (
                <Animated.View style={{ flex: 1, transform: [{ translateX: cardX }], opacity: cardOpacity }}><ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false} scrollEventThrottle={16} refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={theme.gold} colors={[theme.gold]} progressBackgroundColor={theme.card} />}><HistoryCard event={todayEvent} allEvents={allCollectedEvents} /></ScrollView></Animated.View>
              )) : (<DiscoverSection events={discoverEvents} theme={theme} t={t} />)}
            </View>
          )}
        </View>
        <View style={[ms.tabBar, { paddingBottom: insets.bottom + 2 }]}>
          <TabBtn label={t('today')} icon={CalendarDays} active={activeTab === 'today'} theme={theme} onPress={() => switchTab('today')} />
          <TabBtn label={t('discover')} icon={Compass} active={activeTab === 'discover'} theme={theme} onPress={() => switchTab('discover')} />
          <TabBtn label={t('timeline') || 'Timeline'} icon={Clock} active={activeTab === 'timeline'} theme={theme} onPress={() => switchTab('timeline')} />
          <TabBtn label={t('map') || 'Map'} icon={Map} active={activeTab === 'map'} theme={theme} onPress={() => switchTab('map')} />
          <TabBtn label={t('saved') || 'Saved'} icon={Bookmark} active={activeTab === 'saved'} badge={unseenSaved} theme={theme} onPress={() => switchTab('saved')} />
        </View>
        <AchievementsModal visible={achievementsVisible} onClose={() => setAchievementsVisible(false)} />
        <WeeklyRecapModal visible={weeklyRecapVisible} onClose={() => setWeeklyRecapVisible(false)} />
      </View>
    </AllEventsProvider>
  );
}

const TabBtn = ({ label, icon: Icon, active, badge, theme, onPress }: { label: string; icon: any; active: boolean; badge?: number; theme: any; onPress: () => void }) => (
  <TouchableOpacity style={tabS.item} onPress={onPress} activeOpacity={0.6}><View style={[tabS.iconWrap, active && { backgroundColor: theme.gold + '18' }]}><Icon size={20} color={active ? theme.gold : theme.subtext} strokeWidth={active ? 2.2 : 1.6} />{badge !== undefined && badge > 0 && (<View style={[tabS.badge, { backgroundColor: theme.gold }]}><Text style={tabS.badgeTxt}>{badge > 99 ? '99+' : badge}</Text></View>)}</View><Text style={[tabS.label, { color: active ? theme.gold : theme.subtext, fontWeight: active ? '700' : '500' }]}>{label}</Text></TouchableOpacity>
);
const tabS = StyleSheet.create({ item: { flex: 1, alignItems: 'center', gap: 2 }, iconWrap: { width: 36, height: 28, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }, label: { fontSize: 9, letterSpacing: 0.2 }, badge: { position: 'absolute', top: -3, right: -7, minWidth: 14, height: 14, borderRadius: 7, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2 }, badgeTxt: { fontSize: 8, fontWeight: '800', color: '#000' } });

const makeStyles = (theme: any, isDark: boolean) => StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.background }, chrome: { backgroundColor: theme.background, paddingHorizontal: 20 },
  brandRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10, paddingBottom: 14 }, brandLeft: { gap: 1 },
  brandLabel: { color: theme.gold, fontSize: 9, fontWeight: '700', letterSpacing: 4, opacity: 0.6 }, brandTitle: { color: theme.text, fontSize: 22, fontWeight: '800', letterSpacing: 0.5, fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 }, searchBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  achieveBtn: { width: 36, height: 36, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  achieveBadge: { position: 'absolute', top: -4, right: -4, minWidth: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 }, achieveBadgeText: { fontSize: 9, fontWeight: '900', color: '#FFF' },
  dateNav: { flexDirection: 'row', alignItems: 'center', paddingBottom: 14 }, navArrow: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }, navArrowIcon: { fontSize: 28, fontWeight: '300', lineHeight: 30, marginTop: -1 },
  dateCenter: { flex: 1, alignItems: 'center' }, datePrimary: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dayCircle: { width: 44, height: 44, borderRadius: 22, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' }, dayNumber: { fontSize: 17, fontWeight: '800', letterSpacing: -0.5 },
  dateTexts: { gap: 2 }, dateLabel: { fontSize: 16, fontWeight: '700', letterSpacing: 0.2 }, dateSubLabel: { fontSize: 12, fontWeight: '500', opacity: 0.6 },
  separator: { height: StyleSheet.hairlineWidth }, contentWrap: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' }, loadingPulse: { width: 56, height: 56, borderRadius: 28, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  tabBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.card, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border, paddingTop: 8 },
});