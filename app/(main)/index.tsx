// app/(tabs)/index.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import api from '../../api';
import { DiscoverSection } from '../../components/DiscoverSection';
import { HistoryCard } from '../../components/HistoryCard';
import ProfileAvatar from '../../components/ProfileAvatar';
import { Language, useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';

const { width: W } = Dimensions.get('window');
const SWIPE_THRESHOLD = W * 0.20; // Prag mai mic pentru sensibilitate mai bună
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

// ─── HELPERS ──────────────────────────────────────────────────────────────────

const offsetDate = (n: number): Date => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
};

const toISO = (d: Date): string => d.toISOString().split('T')[0];

const labelFor = (offset: number, lang: string) => {
  const d = offsetDate(offset);
  const localeMap: Record<string, string> = { ro: 'ro-RO', en: 'en-US', fr: 'fr-FR', de: 'de-DE', es: 'es-ES' };
  const currentLocale = localeMap[lang] || 'en-US';

  return {
    day: d.getDate().toString().padStart(2, '0'),
    month: d.toLocaleString(currentLocale, { month: 'short' }).toUpperCase(),
    weekday: d.toLocaleString(currentLocale, { weekday: 'short' }).toUpperCase(),
    iso: toISO(d),
    isToday: offset === 0,
  };
};

// ─── CACHE LOGIC ──────────────────────────────────────────────────────────────

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

// ─── COMPONENTS ───────────────────────────────────────────────────────────────

const Divider = ({ color, gold }: { color: string; gold: string }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
    <View style={{ flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: color }} />
    <View style={{ width: 4, height: 4, backgroundColor: gold, transform: [{ rotate: '45deg' }], marginHorizontal: 8, opacity: 0.65 }} />
    <View style={{ flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: color }} />
  </View>
);

const Skeleton = ({ card, border }: { card: string; border: string }) => {
  const pulse = useRef(new Animated.Value(0.2)).current;
  useEffect(() => {
    const anim = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0.2, duration: 800, useNativeDriver: true }),
    ]));
    anim.start();
    return () => anim.stop();
  }, []);

  const Bar = ({ flex, h, mb = 10 }: { flex: number; h: number; mb?: number }) => (
    <View style={{ flexDirection: 'row', marginBottom: mb }}>
      <Animated.View style={{ flex, height: h, backgroundColor: border, borderRadius: 4, opacity: pulse }} />
      <View style={{ flex: 1 - flex }} />
    </View>
  );

  return (
    <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 16 }}>
      <View style={{ backgroundColor: card, borderRadius: 24, borderWidth: 1, borderColor: border, padding: 22, height: W * 0.88 }}>
        <Bar flex={0.36} h={9} mb={16} /><Bar flex={0.82} h={22} mb={10} /><Bar flex={0.62} h={22} mb={26} />
        <Bar flex={1.0} h={13} /><Bar flex={0.88} h={13} /><Bar flex={0.55} h={13} mb={0} />
      </View>
    </View>
  );
};

const DateCircle = ({ offset, theme, lang }: { offset: number; theme: any; lang: string }) => {
  const { day, month, isToday } = labelFor(offset, lang);
  return (
    <View style={{ alignItems: 'center' }}>
      {isToday && (
        <View style={{ position: 'absolute', width: 68, height: 68, borderRadius: 34, borderWidth: 1, borderColor: theme.gold, borderStyle: 'dashed', opacity: 0.3, top: -4, left: -4 }} />
      )}
      <View style={{
        width: 60, height: 60, borderRadius: 30,
        backgroundColor: isToday ? theme.gold : theme.card,
        borderWidth: isToday ? 0 : 1, borderColor: theme.border,
        alignItems: 'center', justifyContent: 'center',
        shadowColor: isToday ? theme.gold : 'transparent',
        shadowOffset: { width: 0, height: 0 }, shadowOpacity: isToday ? 0.5 : 0,
        shadowRadius: 12, elevation: isToday ? 8 : 0,
      }}>
        <Text style={{ color: isToday ? theme.background : theme.text, fontSize: 20, fontWeight: '900', lineHeight: 22 }}>{day}</Text>
        <Text style={{ color: isToday ? theme.background : theme.subtext, fontSize: 7, fontWeight: '800', letterSpacing: 1, opacity: 0.8 }}>{month}</Text>
      </View>
    </View>
  );
};

const EmptyDay = ({ isToday, theme, onRetry, t }: { isToday: boolean; theme: any; onRetry: () => void; t: (key: string) => string }) => (
  <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 30 }}>
    <Text style={{ fontSize: 36, color: theme.gold, opacity: 0.6, marginBottom: 4 }}>◌</Text>
    <Text style={{ fontSize: 20, fontWeight: '900', letterSpacing: 1, color: theme.text }}>
      {isToday ? t('today') : t('no_content')}
    </Text>
    <Text style={{ fontSize: 13, textAlign: 'center', lineHeight: 20, color: theme.subtext }}>
      {isToday ? t('empty_today_desc') : t('empty_day_desc')}
    </Text>
    {isToday && (
      <TouchableOpacity onPress={onRetry} activeOpacity={0.85} style={styles.retryBtn}>
        <Text style={{ color: theme.gold, fontSize: 12, fontWeight: '900', letterSpacing: 3 }}>{t('retry').toUpperCase()}</Text>
      </TouchableOpacity>
    )}
  </View>
);

// ─── MAIN SCREEN ──────────────────────────────────────────────────────────────

type Tab = 'today' | 'discover';

export default function HomeScreen() {
  const { theme, isDark } = useTheme();
  const { t, language, setLanguage } = useLanguage(); 
  const insets = useSafeAreaInsets();

  const [dayOffset, setDayOffset] = useState(0);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEmpty, setIsEmpty] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('today');
  const [showLangMenu, setShowLangMenu] = useState(false);

  const slideX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  const fetchForOffset = useCallback(async (offset: number) => {
    const iso = toISO(offsetDate(offset));
    const cached = await readCache(iso);
    if (cached !== null) {
      setEvents(cached.data);
      setIsEmpty(cached.empty);
      setLoading(false);
      return;
    }
    try {
      const response = await api.get('/daily-content/by-date', { params: { date: iso } });
      const data: any[] = response.data?.events ?? [];
      setEvents(data);
      setIsEmpty(data.length === 0);
      await writeCache(iso, data, data.length === 0);
    } catch (e) {
      setEvents([]);
      setIsEmpty(true);
    } finally {
      setLoading(false);
    }
  }, []);

  const navigateToOffset = useCallback((newOffset: number, direction: 'left' | 'right') => {
    // Definirea punctelor de ieșire și intrare
    const exitX = direction === 'left' ? -W * 0.5 : W * 0.5;
    const enterX = direction === 'left' ? W * 0.5 : -W * 0.5;

    // Faza 1: Ieșire card curent
    Animated.parallel([
      Animated.timing(slideX, {
        toValue: exitX,
        duration: 150,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 120,
        useNativeDriver: true,
      }),
    ]).start(async () => {
      // Schimbare stare
      slideX.setValue(enterX);
      setDayOffset(newOffset);
      setLoading(true);
      await fetchForOffset(newOffset);

      // Faza 2: Intrare card nou
      Animated.parallel([
        Animated.spring(slideX, {
          toValue: 0,
          tension: 80,
          friction: 12,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    });
  }, [slideX, opacity, fetchForOffset]);

  const goBack = useCallback(() => navigateToOffset(dayOffset - 1, 'right'), [dayOffset, navigateToOffset]);
  const goForward = useCallback(() => dayOffset < 0 && navigateToOffset(dayOffset + 1, 'left'), [dayOffset, navigateToOffset]);

  useEffect(() => { fetchForOffset(0); }, []);

  // Update refs for PanResponder
  const navRef = useRef({ goBack, goForward, dayOffset });
  useEffect(() => { navRef.current = { goBack, goForward, dayOffset }; }, [goBack, goForward, dayOffset]);

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, g) => {
        // Activăm swipe-ul doar dacă mișcarea orizontală e predominantă
        return Math.abs(g.dx) > 10 && Math.abs(g.dx) > Math.abs(g.dy) * 2;
      },
      onPanResponderMove: (_, g) => {
        const { dayOffset: off } = navRef.current;
        // Permitem swipe la dreapta oricând, dar la stânga doar dacă nu suntem la "Today"
        if (g.dx > 0 || off < 0) {
          slideX.setValue(g.dx);
          opacity.setValue(Math.max(0.5, 1 - Math.abs(g.dx) / W));
        }
      },
      onPanResponderRelease: (_, g) => {
        const { dayOffset: off, goBack: gb, goForward: gf } = navRef.current;
        
        if (g.dx < -SWIPE_THRESHOLD && off < 0) {
          gf();
        } else if (g.dx > SWIPE_THRESHOLD) {
          gb();
        } else {
          // Reset animat dacă nu s-a depășit pragul
          Animated.parallel([
            Animated.spring(slideX, { toValue: 0, friction: 8, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true })
          ]).start();
        }
      },
    })
  ).current;

  const s = makeStyles(theme);
  const { isToday, weekday, iso } = labelFor(dayOffset, language);
  const todayEvent = events[0] ?? null;
  const discoverEvents = events.slice(1);
  const languages: Language[] = ['ro', 'en', 'fr', 'de', 'es'];

  return (
    <View style={s.root}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* HEADER */}
      <View style={[s.header, { paddingTop: insets.top + 6 }]}>
        <View style={{ zIndex: 100 }}>
          <TouchableOpacity onPress={() => setShowLangMenu(!showLangMenu)} style={s.langBtn}>
            <Text style={s.langText}>{language.toUpperCase()}</Text>
          </TouchableOpacity>
          {showLangMenu && (
            <View style={s.langDropdown}>
              {languages.map(l => (
                <TouchableOpacity key={l} onPress={() => { setLanguage(l); setShowLangMenu(false); }} style={s.langItem}>
                  <Text style={[s.langItemText, language === l && { color: theme.gold }]}>{l.toUpperCase()}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <View style={s.brand}>
          <Text style={s.brandSub}>{t('Daily').toUpperCase()}</Text>
          <Text style={s.brandMain}>{t('History')}</Text>
        </View>

        <DateCircle offset={dayOffset} theme={theme} lang={language} />
        <View style={s.avatarWrap}><ProfileAvatar /></View>
      </View>

      <Divider color={theme.border} gold={theme.gold} />

      {/* DATE NAVIGATION STRIP */}
      <View style={s.dayStrip}>
        <TouchableOpacity onPress={goBack} style={s.arrowBtn}>
          <Text style={[s.arrowText, { color: theme.subtext }]}>‹</Text>
        </TouchableOpacity>
        <Text style={[s.dayLabel, { color: theme.gold }]}>
          {isToday ? t('today') : `${weekday}  ·  ${iso}`}
        </Text>
        <TouchableOpacity onPress={goForward} style={[s.arrowBtn, dayOffset >= 0 && s.arrowDisabled]} disabled={dayOffset >= 0}>
          <Text style={[s.arrowText, { color: theme.subtext }]}>›</Text>
        </TouchableOpacity>
      </View>

      {/* CONTENT AREA */}
      <View style={{ flex: 1, overflow: 'hidden' }}>
        {loading ? (
          <Skeleton card={theme.card} border={theme.border} />
        ) : (
          <Animated.View 
            style={[s.contentArea, { opacity, transform: [{ translateX: slideX }] }]}
            {...(activeTab === 'today' ? pan.panHandlers : {})}
          >
            {activeTab === 'today' ? (
              isEmpty || !todayEvent ? (
                <EmptyDay isToday={isToday} theme={theme} t={t} onRetry={() => { setLoading(true); fetchForOffset(dayOffset); }} />
              ) : (
                <HistoryCard event={todayEvent} />
              )
            ) : (
              <DiscoverSection events={discoverEvents} theme={theme} t={t} />
            )}
          </Animated.View>
        )}
      </View>

      {/* BOTTOM NAV BAR */}
      <View style={[s.navBar, { paddingBottom: insets.bottom + 6 }]}>
        <TouchableOpacity style={s.navItem} onPress={() => setActiveTab('today')}>
          {activeTab === 'today' && <View style={[s.navIndicator, { backgroundColor: theme.gold }]} />}
          <Text style={[s.navIcon, { color: activeTab === 'today' ? theme.gold : theme.subtext }]}>◉</Text>
          <Text style={[s.navLabel, { color: activeTab === 'today' ? theme.gold : theme.subtext }]}>{t('today')}</Text>
        </TouchableOpacity>

        <View style={[s.navDivider, { backgroundColor: theme.border }]} />

        <TouchableOpacity style={s.navItem} onPress={() => setActiveTab('discover')}>
          {activeTab === 'discover' && <View style={[s.navIndicator, { backgroundColor: theme.gold }]} />}
          <Text style={[s.navIcon, { color: activeTab === 'discover' ? theme.gold : theme.subtext }]}>✦</Text>
          <Text style={[s.navLabel, { color: activeTab === 'discover' ? theme.gold : theme.subtext }]}>{t('discover')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const makeStyles = (theme: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 14, zIndex: 100 },
  langBtn: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: theme.border, alignItems: 'center', justifyContent: 'center', marginRight: 15 },
  langText: { color: theme.gold, fontSize: 9, fontWeight: '900' },
  langDropdown: { position: 'absolute', top: 40, left: 0, backgroundColor: theme.card, borderRadius: 12, padding: 8, borderWidth: 1, borderColor: theme.border, elevation: 10, minWidth: 60 },
  langItem: { paddingVertical: 8, alignItems: 'center' },
  langItemText: { color: theme.text, fontSize: 10, fontWeight: '800' },
  brand: { flex: 1.5 },
  brandSub: { color: theme.gold, fontSize: 9, fontWeight: '800', letterSpacing: 4, marginBottom: 1 },
  brandMain: { color: theme.text, fontSize: 21, fontWeight: '900', letterSpacing: 2 },
  avatarWrap: { flex: 1, alignItems: 'flex-end' },
  dayStrip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 7, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border },
  arrowBtn: { paddingHorizontal: 12, paddingVertical: 4 },
  arrowDisabled: { opacity: 0.18 },
  arrowText: { fontSize: 28, fontWeight: '300', lineHeight: 32 },
  dayLabel: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '800', letterSpacing: 2.5 },
  contentArea: { flex: 1, paddingHorizontal: 16, paddingTop: 14 },
  navBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.card, borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 12 },
  navItem: { flex: 1, alignItems: 'center', position: 'relative' },
  navIndicator: { position: 'absolute', top: -12, width: 32, height: 2, borderRadius: 1 },
  navIcon: { fontSize: 20, marginBottom: 4 },
  navLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 1.5 },
  navDivider: { width: 1, height: 30 },
});

const styles = StyleSheet.create({
  retryBtn: { marginTop: 10, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,215,0,0.3)' }
});