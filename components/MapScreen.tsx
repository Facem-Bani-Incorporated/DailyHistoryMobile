// components/MapScreen.tsx
import {
  ChevronRight,
  Globe,
  Map,
  Sparkles,
  X,
  Zap
} from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  FlatList,
  PanResponder,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import api from '../api';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { extractLocation } from '../utils/locationExtractor';
import { StoryModal } from './StoryModal';

const { height: H } = Dimensions.get('window');

const SHEET_CLOSED   = 0;
const SHEET_HALF     = H * 0.48;
const SHEET_FULL     = H * 0.85;
const DRAG_THRESHOLD = 60;

const INITIAL_REGION: Region = {
  latitude: 30,
  longitude: 15,
  latitudeDelta: 110,
  longitudeDelta: 130,
};

// ── Traduceri
const MAP_TRANSLATIONS: Record<string, Record<string, string>> = {
  en: {
    loading: 'Loading map...',
    events_globe: 'events on the globe',
    no_events: 'No events found',
    legend: 'Legend',
    war_conflict: 'War & Conflict',
    tech_innovation: 'Tech & Innovation',
    science_discovery: 'Science & Discovery',
    politics_state: 'Politics & State',
    culture_arts: 'Culture & Arts',
    natural_disaster: 'Natural Disaster',
    exploration: 'Exploration',
    religion_phil: 'Religion & Philosophy',
  },
  ro: {
    loading: 'Se \u00eenc\u0103rc\u0103 harta...',
    events_globe: 'evenimente pe glob',
    no_events: 'Niciun eveniment g\u0103sit',
    legend: 'Legend\u0103',
    war_conflict: 'R\u0103zboi & Conflict',
    tech_innovation: 'Tehnologie & Inova\u021bie',
    science_discovery: '\u0218tiin\u021b\u0103 & Descoperiri',
    politics_state: 'Politic\u0103 & Stat',
    culture_arts: 'Cultur\u0103 & Arte',
    natural_disaster: 'Dezastru Natural',
    exploration: 'Explorare',
    religion_phil: 'Religie & Filozofie',
  },
  fr: {
    loading: 'Chargement de la carte...',
    events_globe: '\u00e9v\u00e9nements sur le globe',
    no_events: 'Aucun \u00e9v\u00e9nement trouv\u00e9',
    legend: 'L\u00e9gende',
    war_conflict: 'Guerre & Conflit',
    tech_innovation: 'Tech & Innovation',
    science_discovery: 'Science & D\u00e9couverte',
    politics_state: 'Politique & \u00c9tat',
    culture_arts: 'Culture & Arts',
    natural_disaster: 'Catastrophe Naturelle',
    exploration: 'Exploration',
    religion_phil: 'Religion & Philosophie',
  },
  de: {
    loading: 'Karte wird geladen...',
    events_globe: 'Ereignisse auf dem Globus',
    no_events: 'Keine Ereignisse gefunden',
    legend: 'Legende',
    war_conflict: 'Krieg & Konflikt',
    tech_innovation: 'Technik & Innovation',
    science_discovery: 'Wissenschaft & Entdeckung',
    politics_state: 'Politik & Staat',
    culture_arts: 'Kultur & Kunst',
    natural_disaster: 'Naturkatastrophe',
    exploration: 'Entdeckung',
    religion_phil: 'Religion & Philosophie',
  },
  es: {
    loading: 'Cargando mapa...',
    events_globe: 'eventos en el globo',
    no_events: 'No se encontraron eventos',
    legend: 'Leyenda',
    war_conflict: 'Guerra & Conflicto',
    tech_innovation: 'Tecnolog\u00eda & Innovaci\u00f3n',
    science_discovery: 'Ciencia & Descubrimiento',
    politics_state: 'Pol\u00edtica & Estado',
    culture_arts: 'Cultura & Artes',
    natural_disaster: 'Desastre Natural',
    exploration: 'Exploraci\u00f3n',
    religion_phil: 'Religi\u00f3n & Filosof\u00eda',
  },
};

// ── Categorii — pinColor nativ (funcționează pe iOS + Android fără custom view)
// iOS suportă orice hex color. Android suportă: red, green, blue, yellow, cyan, magenta, orange, purple, violet, rose, azure, indigo, tomato, gold
const CATEGORIES: Record<string, { pinColor: string; color: string; bg: string; tKey: string }> = {
  war_conflict:      { pinColor: 'tomato',  color: '#E84545', bg: '#FFF0F0', tKey: 'war_conflict' },
  tech_innovation:   { pinColor: 'indigo',  color: '#3E7BFA', bg: '#EEF4FF', tKey: 'tech_innovation' },
  science_discovery: { pinColor: 'violet',  color: '#A855F7', bg: '#F5EEFF', tKey: 'science_discovery' },
  politics_state:    { pinColor: 'gold',    color: '#F59E0B', bg: '#FFFBEB', tKey: 'politics_state' },
  culture_arts:      { pinColor: 'green',   color: '#10B981', bg: '#ECFDF5', tKey: 'culture_arts' },
  natural_disaster:  { pinColor: 'orange',  color: '#F97316', bg: '#FFF7ED', tKey: 'natural_disaster' },
  exploration:       { pinColor: 'cyan',    color: '#06B6D4', bg: '#ECFEFF', tKey: 'exploration' },
  religion_phil:     { pinColor: 'rose',    color: '#8B6F47', bg: '#FAF5EF', tKey: 'religion_phil' },
};

const DEFAULT_CAT = { pinColor: 'red', color: '#8B7355', bg: '#FAF5EF', tKey: '' };

const getCatKey = (event: any): string =>
  (event.category ?? '').toString().toLowerCase();

const getYear = (event: any): string => {
  const raw = String(event.eventDate ?? event.event_date ?? event.date ?? event.year ?? '').trim();
  if (/^\d{4}$/.test(raw)) return raw;
  if (raw.includes('-') && raw.split('-')[0].length === 4) return raw.split('-')[0];
  return '';
};

// ─────────────────────────────────────────
// EventRow in bottom sheet
// ─────────────────────────────────────────
interface EventRowProps {
  event: any;
  language: string;
  tm: (key: string) => string;
  theme: any;
  onPress: () => void;
}

const EventRow: React.FC<EventRowProps> = ({ event, language, tm, theme, onPress }) => {
  const title  = event.titleTranslations?.[language] ?? event.titleTranslations?.en ?? 'No Title';
  const impact = event.impactScore || 0;
  const catKey = getCatKey(event);
  const cat    = CATEGORIES[catKey] ?? DEFAULT_CAT;
  const year   = getYear(event);
  const catLabel = cat.tKey ? tm(cat.tKey) : catKey;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.72}>
      <View style={[eStyles.row, { backgroundColor: theme.card }]}>
        {/* Color dot */}
        <View style={[eStyles.dotWrap, { backgroundColor: cat.bg, borderColor: cat.color }]}>
          <View style={[eStyles.dotInner, { backgroundColor: cat.color }]} />
        </View>

        {/* Content */}
        <View style={eStyles.content}>
          <View style={eStyles.metaRow}>
            <View style={[eStyles.catPill, { backgroundColor: cat.color }]}>
              <Text style={eStyles.catPillTxt}>{catLabel.toUpperCase()}</Text>
            </View>
            {year !== '' && (
              <View style={eStyles.yearBubble}>
                <Text style={[eStyles.yearTxt, { color: cat.color }]}>{year}</Text>
              </View>
            )}
          </View>
          <Text style={[eStyles.title, { color: theme.text }]} numberOfLines={2}>
            {title}
          </Text>
        </View>

        {/* Impact + arrow */}
        <View style={eStyles.right}>
          <View style={[eStyles.impactBubble, { backgroundColor: '#FFF8E1', borderColor: '#FFD54F' }]}>
            <Zap size={11} color="#F9A825" fill="#F9A825" />
            <Text style={eStyles.impactTxt}>{impact}%</Text>
          </View>
          <View style={[eStyles.arrowCircle, { backgroundColor: cat.color }]}>
            <ChevronRight size={14} color="#FFFFFF" strokeWidth={3} />
          </View>
        </View>
      </View>

      <View style={[eStyles.separator, { borderBottomColor: theme.border }]} />
    </TouchableOpacity>
  );
};

const eStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    gap: 12,
  },
  dotWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 1, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 0,
    elevation: 3,
  },
  dotInner: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.7)',
  },
  content: { flex: 1, gap: 5 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  catPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 1, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 0,
    elevation: 2,
  },
  catPillTxt: {
    fontSize: 8.5,
    fontWeight: '900',
    letterSpacing: 1.2,
    color: '#FFFFFF',
  },
  yearBubble: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 7,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  yearTxt: { fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  title: { fontSize: 14.5, fontWeight: '700', lineHeight: 20, letterSpacing: 0.15 },
  right: { alignItems: 'center', gap: 8 },
  impactBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 2,
  },
  impactTxt: { fontSize: 10.5, fontWeight: '900', color: '#F9A825', letterSpacing: 0.3 },
  arrowCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 1, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 0,
    elevation: 3,
  },
  separator: {
    marginHorizontal: 18,
    borderBottomWidth: 1,
    opacity: 0.15,
  },
});

// ─────────────────────────────────────────
// MapScreen
// ─────────────────────────────────────────
export default function MapScreen() {
  const { theme, isDark }  = useTheme();
  const { language }       = useLanguage();
  const insets             = useSafeAreaInsets();
  const mapRef             = useRef<MapView>(null);

  const tm = useCallback((key: string): string => {
    const table = MAP_TRANSLATIONS[language] ?? MAP_TRANSLATIONS['en'];
    return table[key] ?? MAP_TRANSLATIONS['en'][key] ?? key;
  }, [language]);

  const [allEvents, setAllEvents]         = useState<any[]>([]);
  const [loading, setLoading]             = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [sheetEvents, setSheetEvents]     = useState<any[]>([]);
  const [sheetLabel, setSheetLabel]       = useState('');
  const [sheetColor, setSheetColor]       = useState('#FFD700');
  const [storyEvent, setStoryEvent]       = useState<any>(null);
  const [storyVisible, setStoryVisible]   = useState(false);
  const [activeFilter, setActiveFilter]   = useState<string | null>(null);
  const [legendOpen, setLegendOpen]       = useState(false);

  // ── Bottom sheet
  const sheetY = useRef(new Animated.Value(SHEET_CLOSED)).current;
  const lastY  = useRef(0);

  const animateSheet = useCallback((h: number) => {
    Animated.spring(sheetY, { toValue: h, tension: 180, friction: 22, useNativeDriver: false }).start();
  }, [sheetY]);

  const openSheet = useCallback((events: any[], label: string, color = '#FFD700') => {
    const sorted = [...events].sort((a, b) => (b.impactScore ?? 0) - (a.impactScore ?? 0));
    setSheetEvents(sorted);
    setSheetLabel(label);
    setSheetColor(color);
    animateSheet(SHEET_HALF);
  }, [animateSheet]);

  const closeSheet = useCallback(() => {
    animateSheet(SHEET_CLOSED);
    setSelectedEvent(null);
    setActiveFilter(null);
    setTimeout(() => { setSheetEvents([]); setSheetLabel(''); }, 350);
  }, [animateSheet]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 5,
      onPanResponderGrant: () => {
        // @ts-ignore
        lastY.current = sheetY._value;
      },
      onPanResponderMove: (_, g) => {
        sheetY.setValue(Math.max(0, Math.min(SHEET_FULL, lastY.current - g.dy)));
      },
      onPanResponderRelease: (_, g) => {
        // @ts-ignore
        const cur = sheetY._value;
        if (-g.vy > 1.5 || cur > SHEET_HALF + 60) { animateSheet(SHEET_FULL); return; }
        if (g.vy > 1.5 || (g.dy > DRAG_THRESHOLD && cur < SHEET_HALF)) { closeSheet(); return; }
        if (cur > 80) animateSheet(SHEET_HALF); else closeSheet();
      },
    })
  ).current;

  // ── Fetch 60 zile
  useEffect(() => {
    const fetchAll = async () => {
      try {
        setLoading(true);
        const promises = Array.from({ length: 60 }, (_, i) => {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const iso = d.toISOString().split('T')[0];
          return api.get('/daily-content/by-date', { params: { date: iso } })
            .then(r => r.data?.events ?? [])
            .catch(() => []);
        });
        const all = (await Promise.all(promises)).flat();
        const seen = new Set<string>();
        const unique = all.filter((e: any) => {
          const id = `${e.eventDate}-${e.titleTranslations?.en}`;
          if (seen.has(id)) return false;
          seen.add(id); return true;
        });
        setAllEvents(unique.filter((e: any) => extractLocation(e) !== null));
      } catch (e) {
        console.error('MapScreen fetch error:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  // ── Tap marker
  const handleMarkerPress = useCallback((event: any) => {
    const loc = extractLocation(event);
    if (!loc) return;
    setSelectedEvent(event);
    setActiveFilter(null);
    mapRef.current?.animateToRegion({
      latitude: loc.latitude, longitude: loc.longitude,
      latitudeDelta: 10, longitudeDelta: 10,
    }, 400);
    const nearby = allEvents.filter(e => extractLocation(e)?.label === loc.label);
    openSheet(nearby, loc.label, '#FFD700');
  }, [allEvents, openSheet]);

  // ── Tap categorie din legenda
  const handleCategoryPress = useCallback((catKey: string) => {
    if (activeFilter === catKey) { closeSheet(); return; }
    setActiveFilter(catKey);
    setSelectedEvent(null);
    const cat = CATEGORIES[catKey];
    const events = allEvents.filter(e => getCatKey(e) === catKey);
    if (events.length === 0) return;
    openSheet(events, tm(cat.tKey), cat.color);
  }, [allEvents, activeFilter, openSheet, closeSheet, tm]);

  // ── Stats per categorie
  const catStats = useMemo(() =>
    Object.keys(CATEGORIES).map(k => ({
      key: k,
      count: allEvents.filter(e => getCatKey(e) === k).length,
      ...CATEGORIES[k],
    })).filter(s => s.count > 0),
  [allEvents]);

  // ── Events to show (filtered or all)
  const visibleEvents = useMemo(() => {
    if (!activeFilter) return allEvents;
    return allEvents.filter(e => getCatKey(e) === activeFilter);
  }, [allEvents, activeFilter]);

  const s = makeStyles(theme, isDark);

  return (
    <View style={s.root}>

      {/* ── HARTA ── */}
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={INITIAL_REGION}
        mapType="standard"
        customMapStyle={isDark ? DARK_MAP : LIGHT_MAP}
        showsUserLocation
        showsCompass={false}
        showsScale={false}
        onPress={closeSheet}
      >
        {/*
          NATIVE MARKERS — pinColor only, zero custom children.
          This is the most reliable way to render markers on both platforms.
          No custom View = no rasterization = no rendering bugs.
        */}
        {visibleEvents.map((event, idx) => {
          const loc = extractLocation(event);
          if (!loc) return null;
          const catKey = getCatKey(event);
          const cat = CATEGORIES[catKey] ?? DEFAULT_CAT;

          return (
            <Marker
              key={`ev-${event.eventDate}-${idx}`}
              coordinate={{ latitude: loc.latitude, longitude: loc.longitude }}
              onPress={() => handleMarkerPress(event)}
              pinColor={cat.pinColor}
              tracksViewChanges={false}
            />
          );
        })}
      </MapView>

      {/* ── HEADER ── */}
      <View style={[s.header, { paddingTop: insets.top + 8 }]} pointerEvents="none">
        <View style={[s.headerPill, {
          backgroundColor: isDark ? '#2A2520EE' : '#FFFDF5EE',
          borderColor: isDark ? '#5C4A28' : '#D4A017',
        }]}>
          <Map size={15} color={isDark ? '#F5D67B' : '#8B6914'} strokeWidth={2.5} />
          <Text style={[s.headerText, { color: isDark ? '#F5D67B' : '#6B4E0A' }]}>
            {loading ? tm('loading') : `${allEvents.length} ${tm('events_globe')}`}
          </Text>
          <Sparkles size={13} color={isDark ? '#F5D67B' : '#D4A017'} strokeWidth={2.5} />
        </View>
      </View>

      {/* ── LEGENDA FLOTANT\u0102 (dreapta-jos, colapsabil\u0103) ── */}
      {!loading && catStats.length > 0 && (
        <View style={[s.legendWrap, { bottom: insets.bottom + 18 }]}>
          {legendOpen && (
            <View style={[s.legendCard, {
              backgroundColor: isDark ? '#2A2520F5' : '#FFFDF5F5',
              borderColor: isDark ? '#5C4A28' : '#D4A017',
            }]}>
              <Text style={[s.legendTitle, { color: isDark ? '#F5D67B' : '#6B4E0A' }]}>
                {tm('legend')}
              </Text>
              <ScrollView style={{ maxHeight: 240 }} showsVerticalScrollIndicator={false}>
                {/* "All" option */}
                {activeFilter !== null && (
                  <TouchableOpacity onPress={() => { setActiveFilter(null); closeSheet(); }} activeOpacity={0.7}>
                    <View style={[s.legendRow, { marginBottom: 4 }]}>
                      <View style={s.legendAllDots}>
                        <View style={[s.legendMiniDot, { backgroundColor: '#E84545' }]} />
                        <View style={[s.legendMiniDot, { backgroundColor: '#3E7BFA' }]} />
                        <View style={[s.legendMiniDot, { backgroundColor: '#10B981' }]} />
                        <View style={[s.legendMiniDot, { backgroundColor: '#F59E0B' }]} />
                      </View>
                      <Text style={[s.legendLabel, { color: isDark ? '#C9B896' : '#5C4A1E' }]}>
                        Show All
                      </Text>
                      <View style={[s.legendCount, { backgroundColor: 'rgba(0,0,0,0.06)' }]}>
                        <Text style={[s.legendCountTxt, { color: isDark ? '#C9B896' : '#5C4A1E' }]}>
                          {allEvents.length}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                )}
                {catStats.map(stat => {
                  const isActive = activeFilter === stat.key;
                  return (
                    <TouchableOpacity
                      key={stat.key}
                      onPress={() => handleCategoryPress(stat.key)}
                      activeOpacity={0.7}
                    >
                      <View style={[
                        s.legendRow,
                        isActive && { backgroundColor: stat.color + '18', borderRadius: 10 },
                      ]}>
                        {/* Pin-shaped dot matching the native marker */}
                        <View style={[s.legendPin, { backgroundColor: stat.color }]} />
                        <Text style={[
                          s.legendLabel,
                          { color: isActive ? stat.color : (isDark ? '#C9B896' : '#5C4A1E') },
                          isActive && { fontWeight: '900' },
                        ]} numberOfLines={1}>
                          {tm(stat.tKey)}
                        </Text>
                        <View style={[s.legendCount, { backgroundColor: stat.color + '18' }]}>
                          <Text style={[s.legendCountTxt, { color: stat.color }]}>{stat.count}</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* Toggle button */}
          <TouchableOpacity
            onPress={() => setLegendOpen(v => !v)}
            activeOpacity={0.8}
            style={[s.legendToggle, {
              backgroundColor: isDark ? '#2A2520' : '#FFFDF5',
              borderColor: isDark ? '#5C4A28' : '#D4A017',
            }]}
          >
            {legendOpen ? (
              <X size={16} color={isDark ? '#F5D67B' : '#8B6914'} strokeWidth={2.5} />
            ) : (
              <View style={s.legendToggleGrid}>
                <View style={[s.miniDot, { backgroundColor: '#E84545' }]} />
                <View style={[s.miniDot, { backgroundColor: '#3E7BFA' }]} />
                <View style={[s.miniDot, { backgroundColor: '#A855F7' }]} />
                <View style={[s.miniDot, { backgroundColor: '#10B981' }]} />
              </View>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* ── LOADING ── */}
      {loading && (
        <View style={[s.loadingWrap, {
          backgroundColor: isDark ? 'rgba(28,26,20,0.85)' : 'rgba(255,253,245,0.88)'
        }]} pointerEvents="none">
          <View style={s.loadingBubble}>
            <Globe size={34} color={isDark ? '#F5D67B' : '#D4A017'} strokeWidth={1.8} />
          </View>
          <ActivityIndicator color={isDark ? '#F5D67B' : '#D4A017'} size="large" />
          <Text style={[s.loadingText, { color: isDark ? '#F5D67B' : '#6B4E0A' }]}>{tm('loading')}</Text>
        </View>
      )}

      {/* ── EMPTY STATE ── */}
      {!loading && allEvents.length === 0 && (
        <View style={s.emptyMapWrap} pointerEvents="none">
          <Globe size={42} color={theme.subtext} strokeWidth={1.5} />
          <Text style={[s.emptyMapText, { color: theme.subtext }]}>{tm('no_events')}</Text>
        </View>
      )}

      {/* ── BOTTOM SHEET ── */}
      <Animated.View style={[s.sheet, {
        height: sheetY,
        backgroundColor: isDark ? '#1E1B16' : '#FFFEF8',
      }]}>
        <View style={s.sheetTop} {...panResponder.panHandlers}>
          <View style={[s.handle, { backgroundColor: isDark ? '#4A3F28' : '#D4C484' }]} />

          {sheetLabel !== '' && (
            <View style={s.sheetHeader}>
              <View style={s.sheetTitleRow}>
                <View style={[s.sheetDot, { backgroundColor: sheetColor }]} />
                <Text style={[s.sheetTitle, { color: theme.text }]} numberOfLines={1}>
                  {sheetLabel}
                </Text>
                <View style={[s.badge, { backgroundColor: sheetColor }]}>
                  <Text style={s.badgeTxt}>{sheetEvents.length}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={closeSheet} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                <View style={[s.closeBtn, {
                  backgroundColor: isDark ? '#3A3228' : '#F0E8D4',
                  borderColor: isDark ? '#5C4A28' : '#D4C484',
                }]}>
                  <X size={14} color={isDark ? '#C9A84C' : '#8B6914'} strokeWidth={3} />
                </View>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <FlatList
          data={sheetEvents}
          keyExtractor={(item, idx) => `${item.eventDate}-${idx}`}
          renderItem={({ item }) => (
            <EventRow
              event={item}
              language={language}
              tm={tm}
              theme={theme}
              onPress={() => { setStoryEvent(item); setStoryVisible(true); }}
            />
          )}
          contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
          showsVerticalScrollIndicator={false}
          bounces={false}
          ListEmptyComponent={
            <View style={s.emptyWrap}>
              <Globe size={42} color={theme.subtext} strokeWidth={1.5} />
              <Text style={[s.emptyText, { color: theme.subtext }]}>{tm('no_events')}</Text>
            </View>
          }
        />
      </Animated.View>

      {/* ── STORY MODAL ── */}
      {storyEvent && (
        <StoryModal
          visible={storyVisible}
          event={storyEvent}
          onClose={() => { setStoryVisible(false); setStoryEvent(null); }}
          theme={theme}
        />
      )}
    </View>
  );
}

// ── Dark map
const DARK_MAP = [
  { elementType: 'geometry', stylers: [{ color: '#1c1a14' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#9a8b6e' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1c1a14' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0d1b2a' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#3d5a6e' }] },
  { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#1e1a10' }] },
  { featureType: 'landscape.natural', elementType: 'geometry', stylers: [{ color: '#221e12' }] },
  { featureType: 'administrative.country', elementType: 'geometry.stroke', stylers: [{ color: '#4a3f28' }, { weight: 1.5 }] },
  { featureType: 'administrative.country', elementType: 'labels.text.fill', stylers: [{ color: '#c9a84c' }] },
  { featureType: 'administrative.province', elementType: 'geometry.stroke', stylers: [{ color: '#2e2818' }, { weight: 0.8 }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
];

// ── Light map
const LIGHT_MAP = [
  { elementType: 'geometry', stylers: [{ color: '#FFF8E7' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#5c4a1e' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#FFF8E7' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#B8D8E8' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#4a7a9b' }] },
  { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#FFF3D6' }] },
  { featureType: 'landscape.natural', elementType: 'geometry', stylers: [{ color: '#E8DDB5' }] },
  { featureType: 'administrative.country', elementType: 'geometry.stroke', stylers: [{ color: '#C4974C' }, { weight: 2 }] },
  { featureType: 'administrative.country', elementType: 'labels.text.fill', stylers: [{ color: '#5c3d0a' }] },
  { featureType: 'administrative.province', elementType: 'geometry.stroke', stylers: [{ color: '#D4B87A' }, { weight: 1 }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
];

const makeStyles = (theme: any, isDark: boolean) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.background },

    // Header
    header: {
      position: 'absolute', top: 0, left: 0, right: 0,
      alignItems: 'center', paddingHorizontal: 20, paddingBottom: 8,
    },
    headerPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 18,
      paddingVertical: 10,
      borderRadius: 24,
      borderWidth: 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 6,
      elevation: 5,
    },
    headerText: { fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },

    // Legend
    legendWrap: {
      position: 'absolute',
      right: 12,
      alignItems: 'flex-end',
      gap: 8,
    },
    legendCard: {
      borderRadius: 16,
      borderWidth: 2,
      paddingVertical: 14,
      paddingHorizontal: 14,
      width: 210,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.18,
      shadowRadius: 8,
      elevation: 8,
    },
    legendTitle: {
      fontSize: 10,
      fontWeight: '900',
      letterSpacing: 1.5,
      textTransform: 'uppercase',
      marginBottom: 10,
    },
    legendRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 7,
      paddingHorizontal: 6,
    },
    legendAllDots: {
      flexDirection: 'row',
      gap: 2,
    },
    legendMiniDot: {
      width: 5,
      height: 5,
      borderRadius: 3,
    },
    legendPin: {
      width: 10,
      height: 10,
      borderRadius: 5,
      borderWidth: 1.5,
      borderColor: 'rgba(255,255,255,0.5)',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.15,
      shadowRadius: 0,
      elevation: 1,
    },
    legendLabel: {
      flex: 1,
      fontSize: 12,
      fontWeight: '600',
    },
    legendCount: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 8,
      minWidth: 24,
      alignItems: 'center',
    },
    legendCountTxt: {
      fontSize: 10,
      fontWeight: '900',
    },
    legendToggle: {
      width: 44,
      height: 44,
      borderRadius: 22,
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
      elevation: 4,
    },
    legendToggleGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      width: 20,
      height: 20,
      gap: 3,
      alignItems: 'center',
      justifyContent: 'center',
    },
    miniDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
    },

    // Loading
    loadingWrap: {
      ...StyleSheet.absoluteFillObject,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 16,
    },
    loadingBubble: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: isDark ? '#2A2520' : '#FFFDF5',
      borderWidth: 2,
      borderColor: isDark ? '#5C4A28' : '#D4A017',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 6,
      elevation: 5,
    },
    loadingText: { fontSize: 14, fontWeight: '700', letterSpacing: 0.3 },

    // Empty
    emptyMapWrap: {
      position: 'absolute', bottom: 120, left: 0, right: 0,
      alignItems: 'center', gap: 10,
    },
    emptyMapText: { fontSize: 15, fontWeight: '700' },

    // Sheet
    sheet: {
      position: 'absolute',
      bottom: 0, left: 0, right: 0,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      overflow: 'hidden',
      borderTopWidth: 2,
      borderLeftWidth: 1,
      borderRightWidth: 1,
      borderColor: isDark ? '#4A3F28' : '#D4B87A',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -6 },
      shadowOpacity: 0.2,
      shadowRadius: 12,
      elevation: 20,
    },
    sheetTop: {
      paddingTop: 12,
      paddingHorizontal: 20,
      paddingBottom: 12,
    },
    handle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      alignSelf: 'center',
      marginBottom: 16,
    },
    sheetHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    sheetTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      flex: 1,
      marginRight: 12,
    },
    sheetDot: {
      width: 14,
      height: 14,
      borderRadius: 7,
      borderWidth: 2,
      borderColor: '#FFFFFF',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.15,
      shadowRadius: 0,
      elevation: 2,
    },
    sheetTitle: {
      fontSize: 17,
      fontWeight: '800',
      letterSpacing: 0.2,
      flex: 1,
    },
    badge: {
      paddingHorizontal: 9,
      paddingVertical: 3,
      borderRadius: 10,
      borderWidth: 2,
      borderColor: '#FFFFFF',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 0,
      elevation: 2,
    },
    badgeTxt: {
      fontSize: 11,
      fontWeight: '900',
      color: '#FFFFFF',
    },
    closeBtn: {
      width: 32,
      height: 32,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.08,
      shadowRadius: 0,
      elevation: 1,
    },

    // Empty in sheet
    emptyWrap: {
      paddingVertical: 50,
      alignItems: 'center',
      gap: 10,
    },
    emptyText: { fontSize: 15, fontWeight: '700' },
  });