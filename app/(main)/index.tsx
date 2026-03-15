// app/(tabs)/index.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  PanResponder,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import api from '../../api';
import { DiscoverSection } from '../../components/DiscoverSection';
import { HistoryCard } from '../../components/HistoryCard';
import ProfileAvatar from '../../components/ProfileAvatar';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { useSavedStore } from '../../store/useSavedStore';
import { scheduleMidnightNotification } from '../../utils/Notifications';
import SavedScreen from './saved';

const { width: W } = Dimensions.get('window');
const SWIPE_THRESHOLD = W * 0.18;
const CACHE_TTL_MS = 30 * 60 * 1000;
const MAX_FUTURE_OFFSET = 1;

// ─── HELPERS ──────────────────────────────────────────────────────────────────

const offsetDate = (n: number): Date => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
};
const toISO = (d: Date) => d.toISOString().split('T')[0];

const labelFor = (offset: number, lang: string) => {
  const d = offsetDate(offset);
  const localeMap: Record<string, string> = {
    ro: 'ro-RO', en: 'en-US', fr: 'fr-FR', de: 'de-DE', es: 'es-ES',
  };
  const loc = localeMap[lang] || 'en-US';
  return {
    day: d.getDate().toString().padStart(2, '0'),
    month: d.toLocaleString(loc, { month: 'short' }).toUpperCase(),
    weekday: d.toLocaleString(loc, { weekday: 'short' }).toUpperCase(),
    iso: toISO(d),
    isToday: offset === 0,
    isTomorrow: offset === 1,
  };
};

// ─── CACHE ────────────────────────────────────────────────────────────────────

interface CacheEntry { ts: number; data: any[]; empty: boolean; }
const cacheKey = (iso: string) => `dh_v2_${iso}`;

const readCache = async (iso: string): Promise<CacheEntry | null> => {
  try {
    const raw = await AsyncStorage.getItem(cacheKey(iso));
    if (!raw) return null;
    const e: CacheEntry = JSON.parse(raw);
    if (Date.now() - e.ts > CACHE_TTL_MS) return null;
    return e;
  } catch { return null; }
};

const writeCache = async (iso: string, data: any[], empty: boolean) => {
  try {
    await AsyncStorage.setItem(cacheKey(iso), JSON.stringify({ ts: Date.now(), data, empty }));
  } catch {}
};

const clearCacheForDate = async (iso: string) => {
  try {
    await AsyncStorage.removeItem(cacheKey(iso));
  } catch {}
};

// ─── COMPONENTS ───────────────────────────────────────────────────────────────

const Divider = ({ color, gold }: { color: string; gold: string }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
    <View style={{ flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: color }} />
    <View style={{
      width: 3, height: 3, backgroundColor: gold,
      transform: [{ rotate: '45deg' }], marginHorizontal: 8, opacity: 0.4,
    }} />
    <View style={{ flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: color }} />
  </View>
);

const DateCircle = ({
  offset, theme, lang, slideX,
}: {
  offset: number; theme: any; lang: string; slideX: Animated.Value;
}) => {
  const { day, month, isToday, isTomorrow } = labelFor(offset, lang);
  const isHighlighted = isToday || isTomorrow;

  return (
    <Animated.View style={{ alignItems: 'center', transform: [{ translateX: slideX }] }}>
      {isToday && (
        <View style={{
          position: 'absolute', width: 52, height: 52, borderRadius: 26,
          borderWidth: StyleSheet.hairlineWidth, borderColor: theme.gold,
          borderStyle: 'dashed', opacity: 0.4, top: -3, left: -3,
        }} />
      )}
      <View style={{
        width: 46, height: 46, borderRadius: 23,
        backgroundColor: isToday ? theme.gold : isTomorrow ? theme.gold + '22' : 'transparent',
        borderWidth: isHighlighted ? (isToday ? 0 : 1) : StyleSheet.hairlineWidth,
        borderColor: isTomorrow ? theme.gold : theme.border,
        alignItems: 'center', justifyContent: 'center',
        shadowColor: isToday ? theme.gold : 'transparent',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: isToday ? 0.6 : 0,
        shadowRadius: 10, elevation: isToday ? 8 : 0,
      }}>
        <Text style={{ color: isToday ? theme.background : theme.text, fontSize: 16, fontWeight: '800', lineHeight: 18 }}>
          {day}
        </Text>
        <Text style={{ color: isToday ? theme.background : theme.subtext, fontSize: 7, fontWeight: '700', letterSpacing: 1.2, opacity: 0.9 }}>
          {month}
        </Text>
      </View>
      <Text style={{ marginTop: 4, fontSize: 8, fontWeight: '700', letterSpacing: 2, color: isHighlighted ? theme.gold : theme.subtext, opacity: isHighlighted ? 1 : 0.55 }}>
        {labelFor(offset, lang).weekday}
      </Text>
    </Animated.View>
  );
};

const EmptyDay = ({
  isToday, theme, onRetry, t,
}: { isToday: boolean; theme: any; onRetry: () => void; t: (k: string) => string }) => (
  <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 30 }}>
    <Text style={{ fontSize: 32, color: theme.gold, opacity: 0.5, marginBottom: 4 }}>◌</Text>
    <Text style={{ fontSize: 19, fontWeight: '800', letterSpacing: 0.5, color: theme.text }}>
      {isToday ? t('today') : t('no_content')}
    </Text>
    <Text style={{ fontSize: 13, textAlign: 'center', lineHeight: 20, color: theme.subtext }}>
      {isToday ? t('empty_today_desc') : t('empty_day_desc')}
    </Text>
    {isToday && (
      <TouchableOpacity onPress={onRetry} activeOpacity={0.8} style={{
        marginTop: 10, paddingVertical: 10, paddingHorizontal: 24,
        borderRadius: 12, borderWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(255,215,0,0.35)',
      }}>
        <Text style={{ color: theme.gold, fontSize: 11, fontWeight: '800', letterSpacing: 2.5 }}>
          {t('retry').toUpperCase()}
        </Text>
      </TouchableOpacity>
    )}
  </View>
);

// ─── MAIN SCREEN ──────────────────────────────────────────────────────────────

type Tab = 'today' | 'discover' | 'saved';

export default function HomeScreen() {
  const { theme, isDark } = useTheme();
  const { t, language } = useLanguage();
  const insets = useSafeAreaInsets();
  const { savedEvents } = useSavedStore();

  const [dayOffset, setDayOffset] = useState(0);
  const [events, setEvents] = useState<any[]>([]);
  const [isEmpty, setIsEmpty] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('today');

  const prefetchCache = useRef<Record<string, { data: any[]; empty: boolean }>>({});
  const slideX = useRef(new Animated.Value(0)).current;
  const cardOpacity = useRef(new Animated.Value(1)).current;
  const cardScale = useRef(new Animated.Value(1)).current;

  // ── Data fetching ──────────────────────────────────────────────────────────

  const fetchData = useCallback(async (
    offset: number,
    forceRefresh = false
  ): Promise<{ data: any[]; empty: boolean }> => {
    const iso = toISO(offsetDate(offset));

    if (!forceRefresh) {
      if (prefetchCache.current[iso]) return prefetchCache.current[iso];
      const cached = await readCache(iso);
      if (cached) {
        const result = { data: cached.data, empty: cached.empty };
        prefetchCache.current[iso] = result;
        return result;
      }
    }

    try {
      const response = await api.get('/daily-content/by-date', {
        params: { date: iso, _t: Date.now() },
      });
      const data: any[] = response.data?.events ?? [];
      const result = { data, empty: data.length === 0 };
      prefetchCache.current[iso] = result;
      await writeCache(iso, data, data.length === 0);
      return result;
    } catch (error) {
      console.error('Fetch failed:', error);
      return { data: [], empty: true };
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    const iso = toISO(offsetDate(dayOffset));
    delete prefetchCache.current[iso];
    await clearCacheForDate(iso);
    const { data, empty } = await fetchData(dayOffset, true);
    setEvents(data);
    setIsEmpty(empty);
    setIsRefreshing(false);
  }, [dayOffset, fetchData]);

  const prefetchNeighbours = useCallback((offset: number) => {
    fetchData(offset - 1).catch(() => {});
    if (offset < MAX_FUTURE_OFFSET) fetchData(offset + 1).catch(() => {});
  }, [fetchData]);

  useEffect(() => {
    fetchData(0).then(async ({ data, empty }) => {
      setEvents(data);
      setIsEmpty(empty);
      setInitialLoad(false);
      prefetchNeighbours(0);

      try {
        const tomorrow = await fetchData(1);
        const topTomorrow = [...(tomorrow.data)]
          .sort((a, b) => (b.impactScore ?? 0) - (a.impactScore ?? 0))[0];

        if (topTomorrow) {
          const notifTitle = `📅 ${topTomorrow.titleTranslations?.[language] ?? topTomorrow.titleTranslations?.en ?? 'Daily History'}`;
          const notifBody =
            topTomorrow.narrativeTranslations?.[language]?.slice(0, 100) ??
            topTomorrow.narrativeTranslations?.en?.slice(0, 100) ??
            'A new historical event awaits you!';
          scheduleMidnightNotification(notifTitle, notifBody);
        } else {
          scheduleMidnightNotification('📅 Daily History', 'A new historical event awaits you!');
        }
      } catch {
        scheduleMidnightNotification('📅 Daily History', 'A new historical event awaits you!');
      }
    });
  }, []);

  // ── Navigation ─────────────────────────────────────────────────────────────

  const navigating = useRef(false);

  const navigateToOffset = useCallback(async (newOffset: number, direction: 'left' | 'right') => {
    if (navigating.current) return;
    if (newOffset > MAX_FUTURE_OFFSET) return;
    navigating.current = true;

    const promise = fetchData(newOffset);

    await new Promise<void>(resolve => {
      Animated.parallel([
        Animated.timing(cardOpacity, { toValue: 0, duration: 120, easing: Easing.bezier(0.4, 0, 1, 1), useNativeDriver: true }),
        Animated.timing(cardScale, { toValue: 0.94, duration: 120, easing: Easing.bezier(0.4, 0, 1, 1), useNativeDriver: true }),
        Animated.timing(slideX, { toValue: direction === 'left' ? -W * 0.15 : W * 0.15, duration: 120, easing: Easing.bezier(0.4, 0, 1, 1), useNativeDriver: true }),
      ]).start(() => resolve());
    });

    const { data, empty } = await promise;
    cardScale.setValue(0.94);
    cardOpacity.setValue(0);
    slideX.setValue(direction === 'left' ? W * 0.15 : -W * 0.15);
    setDayOffset(newOffset);
    setEvents(data);
    setIsEmpty(empty);

    await new Promise<void>(resolve => {
      Animated.parallel([
        Animated.timing(cardOpacity, { toValue: 1, duration: 220, easing: Easing.bezier(0.0, 0, 0.2, 1), useNativeDriver: true }),
        Animated.spring(cardScale, { toValue: 1, tension: 300, friction: 26, useNativeDriver: true }),
        Animated.spring(slideX, { toValue: 0, tension: 300, friction: 26, useNativeDriver: true }),
      ]).start(() => resolve());
    });

    navigating.current = false;
    prefetchNeighbours(newOffset);
  }, [slideX, cardOpacity, cardScale, fetchData, prefetchNeighbours]);

  const goBack = useCallback(() => navigateToOffset(dayOffset - 1, 'right'), [dayOffset, navigateToOffset]);
  const goForward = useCallback(() => {
    if (dayOffset < MAX_FUTURE_OFFSET) navigateToOffset(dayOffset + 1, 'left');
  }, [dayOffset, navigateToOffset]);

  const navRef = useRef({ goBack, goForward, dayOffset });
  useEffect(() => { navRef.current = { goBack, goForward, dayOffset }; }, [goBack, goForward, dayOffset]);

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy) * 1.8,
      onPanResponderGrant: () => { navigating.current = false; },
      onPanResponderMove: (_, g) => {
        const { dayOffset: off } = navRef.current;
        const atFutureLimit = off >= MAX_FUTURE_OFFSET;
        const progress = Math.min(Math.abs(g.dx) / SWIPE_THRESHOLD, 1);
        cardOpacity.setValue(1 - progress * 0.18);
        cardScale.setValue(1 - progress * 0.04);
        if (g.dx < 0 && atFutureLimit) {
          slideX.setValue(g.dx * 0.15);
        } else {
          slideX.setValue(g.dx * ((off === 0 && g.dx > 0) ? 0.25 : 1));
        }
      },
      onPanResponderRelease: (_, g) => {
        const { dayOffset: off, goBack: gb, goForward: gf } = navRef.current;
        const vel = Math.abs(g.vx);
        const atFutureLimit = off >= MAX_FUTURE_OFFSET;
        if ((g.dx < -SWIPE_THRESHOLD || (vel > 0.7 && g.dx < -20)) && !atFutureLimit) {
          gf();
        } else if (g.dx > SWIPE_THRESHOLD || (vel > 0.7 && g.dx > 20)) {
          gb();
        } else {
          Animated.parallel([
            Animated.spring(slideX, { toValue: 0, tension: 280, friction: 26, useNativeDriver: true }),
            Animated.spring(cardOpacity, { toValue: 1, tension: 280, friction: 26, useNativeDriver: true }),
            Animated.spring(cardScale, { toValue: 1, tension: 280, friction: 26, useNativeDriver: true }),
          ]).start();
        }
      },
    }),
  ).current;

  // ── Render ─────────────────────────────────────────────────────────────────

  const s = makeStyles(theme);
  const { isToday, isTomorrow, weekday, iso } = labelFor(dayOffset, language);
  const sortedEvents = [...events].sort((a, b) => (b.impactScore ?? 0) - (a.impactScore ?? 0));
  const todayEvent = sortedEvents[0] ?? null;
  const discoverEvents = sortedEvents.slice(1);
  const canGoForward = dayOffset < MAX_FUTURE_OFFSET;
  const savedCount = savedEvents.length;

  return (
    <View style={s.root}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* ── HEADER — ascuns pe tab-ul Saved ── */}
      {activeTab !== 'saved' && (
        <>
          <View style={[s.header, { paddingTop: insets.top + 8 }]}>
            <View style={{ width: 40 }} />
            <View style={s.brandCenter}>
              <Text style={s.brandSub}>{t('Daily').toUpperCase()}</Text>
              <Text style={s.brandMain}>{t('History')}</Text>
            </View>
            <View style={{ width: 40, alignItems: 'flex-end' }}>
              <ProfileAvatar />
            </View>
          </View>

          <Divider color={theme.border} gold={theme.gold} />

          {/* ── DATE STRIP ── */}
          <View style={s.dayStrip}>
            <TouchableOpacity onPress={goBack} style={s.arrowBtn} hitSlop={{ top: 14, bottom: 14, left: 10, right: 10 }}>
              <Text style={[s.arrowText, { color: theme.subtext }]}>‹</Text>
            </TouchableOpacity>

            <View style={s.dayCenter}>
              <DateCircle offset={dayOffset} theme={theme} lang={language} slideX={slideX} />
              <Animated.Text
                style={[
                  s.dayLabel,
                  { color: (isToday || isTomorrow) ? theme.gold : theme.subtext },
                  { transform: [{ translateX: Animated.multiply(slideX, 0.25) }] },
                ]}
              >
                {isToday
                  ? t('today').toUpperCase()
                  : isTomorrow
                    ? t('tomorrow') ? t('tomorrow').toUpperCase() : 'TOMORROW'
                    : `${weekday}  ·  ${iso}`}
              </Animated.Text>
            </View>

            <TouchableOpacity
              onPress={goForward}
              style={[s.arrowBtn, !canGoForward && s.arrowDisabled]}
              disabled={!canGoForward}
              hitSlop={{ top: 14, bottom: 14, left: 10, right: 10 }}
            >
              <Text style={[s.arrowText, { color: theme.subtext }]}>›</Text>
            </TouchableOpacity>
          </View>

          <Divider color={theme.border} gold={theme.gold} />
        </>
      )}

      {/* ── CONTENT ── */}
      <View style={{ flex: 1, overflow: 'hidden' }}>
        {activeTab === 'saved' ? (
          <SavedScreen />
        ) : initialLoad ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ color: theme.gold, fontSize: 26, opacity: 0.3 }}>◌</Text>
          </View>
        ) : (
          <View style={s.contentArea} {...(activeTab === 'today' ? pan.panHandlers : {})}>
            {activeTab === 'today' ? (
              isEmpty || !todayEvent ? (
                <EmptyDay
                  isToday={isToday} theme={theme} t={t}
                  onRetry={() => {
                    prefetchCache.current = {};
                    fetchData(dayOffset, true).then(({ data, empty }) => {
                      setEvents(data);
                      setIsEmpty(empty);
                    });
                  }}
                />
              ) : (
                <Animated.View style={{ flex: 1, opacity: cardOpacity, transform: [{ scale: cardScale }] }}>
                  <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={{ flexGrow: 1 }}
                    showsVerticalScrollIndicator={false}
                    scrollEventThrottle={16}
                    refreshControl={
                      <RefreshControl
                        refreshing={isRefreshing}
                        onRefresh={handleRefresh}
                        tintColor={theme.gold}
                        colors={[theme.gold]}
                        progressBackgroundColor={theme.card}
                      />
                    }
                  >
                    <HistoryCard event={todayEvent} />
                  </ScrollView>
                </Animated.View>
              )
            ) : (
              <DiscoverSection events={discoverEvents} theme={theme} t={t} />
            )}
          </View>
        )}
      </View>

      {/* ── BOTTOM NAV — 3 taburi ── */}
      <View style={[s.navBar, { paddingBottom: insets.bottom + 4 }]}>
        <TouchableOpacity style={s.navItem} onPress={() => setActiveTab('today')} activeOpacity={0.7}>
          <View style={[s.navPill, activeTab === 'today' && s.navPillActive]}>
            <Text style={[s.navIcon, { color: activeTab === 'today' ? theme.gold : theme.subtext }]}>◉</Text>
            <Text style={[s.navLabel, { color: activeTab === 'today' ? theme.gold : theme.subtext }]}>
              {t('today')}
            </Text>
          </View>
        </TouchableOpacity>

        <View style={[s.navSep, { backgroundColor: theme.border }]} />

        <TouchableOpacity style={s.navItem} onPress={() => setActiveTab('discover')} activeOpacity={0.7}>
          <View style={[s.navPill, activeTab === 'discover' && s.navPillActive]}>
            <Text style={[s.navIcon, { color: activeTab === 'discover' ? theme.gold : theme.subtext }]}>✦</Text>
            <Text style={[s.navLabel, { color: activeTab === 'discover' ? theme.gold : theme.subtext }]}>
              {t('discover')}
            </Text>
          </View>
        </TouchableOpacity>

        <View style={[s.navSep, { backgroundColor: theme.border }]} />

        <TouchableOpacity style={s.navItem} onPress={() => setActiveTab('saved')} activeOpacity={0.7}>
          <View style={[s.navPill, activeTab === 'saved' && s.navPillActive]}>
            {/* Badge cu numărul de saved */}
            <View style={{ position: 'relative' }}>
              <Text style={[s.navIcon, { color: activeTab === 'saved' ? theme.gold : theme.subtext }]}>◈</Text>
              {savedCount > 0 && (
                <View style={[s.badge, { backgroundColor: theme.gold }]}>
                  <Text style={s.badgeText}>{savedCount > 99 ? '99' : savedCount}</Text>
                </View>
              )}
            </View>
            <Text style={[s.navLabel, { color: activeTab === 'saved' ? theme.gold : theme.subtext }]}>
              {t('saved') || 'Saved'}
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const makeStyles = (theme: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.background },

  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 12,
  },
  brandCenter: { flex: 1, alignItems: 'center' },
  brandSub: { color: theme.gold, fontSize: 8, fontWeight: '800', letterSpacing: 5, marginBottom: 1, opacity: 0.7 },
  brandMain: { color: theme.text, fontSize: 20, fontWeight: '900', letterSpacing: 2 },

  dayStrip: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 10,
  },
  arrowBtn: { width: 36, alignItems: 'center', justifyContent: 'center' },
  arrowDisabled: { opacity: 0.15 },
  arrowText: { fontSize: 30, fontWeight: '200', lineHeight: 34 },
  dayCenter: { flex: 1, alignItems: 'center', gap: 4 },
  dayLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 2.5, textAlign: 'center' },

  contentArea: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },

  navBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: theme.card,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border,
    paddingTop: 8,
  },
  navItem: { flex: 1, alignItems: 'center' },
  navPill: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    paddingVertical: 8, paddingHorizontal: 16, borderRadius: 22,
  },
  navPillActive: { backgroundColor: theme.gold + '15' },
  navIcon: { fontSize: 13 },
  navLabel: { fontSize: 12, fontWeight: '600', letterSpacing: 0.3 },
  navSep: { width: StyleSheet.hairlineWidth, height: 28 },

  badge: {
    position: 'absolute', top: -4, right: -6,
    minWidth: 14, height: 14, borderRadius: 7,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 2,
  },
  badgeText: { fontSize: 8, fontWeight: '900', color: '#000' },
});