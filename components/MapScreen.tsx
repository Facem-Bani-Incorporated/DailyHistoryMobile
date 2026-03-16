// components/MapScreen.tsx
import { X, Zap } from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  FlatList,
  PanResponder,
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

// ── Traduceri inline pentru MapScreen
const MAP_TRANSLATIONS: Record<string, Record<string, string>> = {
  en: {
    loading:       'Loading map...',
    events_globe:  'events on the globe',
    no_events:     'No events found',
    tap_marker:    'Tap a marker to explore',
    all_category:  'All',
    close:         'Close',
    impact:        'Impact',
    next_event:    'Tap to read story',
    war_conflict:      'War & Conflict',
    tech_innovation:   'Tech & Innovation',
    science_discovery: 'Science & Discovery',
    politics_state:    'Politics & State',
    culture_arts:      'Culture & Arts',
    natural_disaster:  'Natural Disaster',
    exploration:       'Exploration',
    religion_phil:     'Religion & Philosophy',
  },
  ro: {
    loading:       'Se încarcă harta...',
    events_globe:  'evenimente pe glob',
    no_events:     'Niciun eveniment găsit',
    tap_marker:    'Apasă un marker pentru a explora',
    all_category:  'Toate',
    close:         'Închide',
    impact:        'Impact',
    next_event:    'Atinge pentru a citi povestea',
    war_conflict:      'Război & Conflict',
    tech_innovation:   'Tehnologie & Inovație',
    science_discovery: 'Știință & Descoperiri',
    politics_state:    'Politică & Stat',
    culture_arts:      'Cultură & Arte',
    natural_disaster:  'Dezastru Natural',
    exploration:       'Explorare',
    religion_phil:     'Religie & Filozofie',
  },
  fr: {
    loading:       'Chargement de la carte...',
    events_globe:  'événements sur le globe',
    no_events:     'Aucun événement trouvé',
    tap_marker:    'Appuyez sur un marqueur',
    all_category:  'Tous',
    close:         'Fermer',
    impact:        'Impact',
    next_event:    'Appuyez pour lire l\'histoire',
    war_conflict:      'Guerre & Conflit',
    tech_innovation:   'Tech & Innovation',
    science_discovery: 'Science & Découverte',
    politics_state:    'Politique & État',
    culture_arts:      'Culture & Arts',
    natural_disaster:  'Catastrophe Naturelle',
    exploration:       'Exploration',
    religion_phil:     'Religion & Philosophie',
  },
  de: {
    loading:       'Karte wird geladen...',
    events_globe:  'Ereignisse auf dem Globus',
    no_events:     'Keine Ereignisse gefunden',
    tap_marker:    'Marker antippen zum Erkunden',
    all_category:  'Alle',
    close:         'Schließen',
    impact:        'Einfluss',
    next_event:    'Tippen um die Geschichte zu lesen',
    war_conflict:      'Krieg & Konflikt',
    tech_innovation:   'Technik & Innovation',
    science_discovery: 'Wissenschaft & Entdeckung',
    politics_state:    'Politik & Staat',
    culture_arts:      'Kultur & Kunst',
    natural_disaster:  'Naturkatastrophe',
    exploration:       'Entdeckung',
    religion_phil:     'Religion & Philosophie',
  },
  es: {
    loading:       'Cargando mapa...',
    events_globe:  'eventos en el globo',
    no_events:     'No se encontraron eventos',
    tap_marker:    'Toca un marcador para explorar',
    all_category:  'Todos',
    close:         'Cerrar',
    impact:        'Impacto',
    next_event:    'Toca para leer la historia',
    war_conflict:      'Guerra & Conflicto',
    tech_innovation:   'Tecnología & Innovación',
    science_discovery: 'Ciencia & Descubrimiento',
    politics_state:    'Política & Estado',
    culture_arts:      'Cultura & Artes',
    natural_disaster:  'Desastre Natural',
    exploration:       'Exploración',
    religion_phil:     'Religión & Filosofía',
  },
};

// ── Categorii cu emoji, culoare, cheie de traducere
const CATEGORIES: Record<string, { emoji: string; color: string; tKey: string }> = {
  war_conflict:      { emoji: '⚔️', color: '#c0392b', tKey: 'war_conflict' },
  tech_innovation:   { emoji: '⚙️', color: '#2980b9', tKey: 'tech_innovation' },
  science_discovery: { emoji: '🔭', color: '#8e44ad', tKey: 'science_discovery' },
  politics_state:    { emoji: '👑', color: '#d4a017', tKey: 'politics_state' },
  culture_arts:      { emoji: '🎭', color: '#16a085', tKey: 'culture_arts' },
  natural_disaster:  { emoji: '🌋', color: '#e67e22', tKey: 'natural_disaster' },
  exploration:       { emoji: '🧭', color: '#27ae60', tKey: 'exploration' },
  religion_phil:     { emoji: '✝️', color: '#7f6e5d', tKey: 'religion_phil' },
};

const getCatKey = (event: any): string =>
  (event.category ?? '').toString().toLowerCase();

const getYear = (event: any): string => {
  const raw = String(event.eventDate ?? event.event_date ?? event.date ?? event.year ?? '').trim();
  if (/^\d{4}$/.test(raw)) return raw;
  if (raw.includes('-') && raw.split('-')[0].length === 4) return raw.split('-')[0];
  return '';
};

// ─────────────────────────────────────────
// Marker individual per eveniment
// ─────────────────────────────────────────
interface EventMarkerProps {
  event: any;
  isSelected: boolean;
  onPress: () => void;
}

const EventMarker: React.FC<EventMarkerProps> = ({ event, isSelected, onPress }) => {
  const [tracked, setTracked] = useState(true);
  const loc    = extractLocation(event);
  if (!loc) return null;
  const catKey = getCatKey(event);
  const cat    = CATEGORIES[catKey] ?? { emoji: '📜', color: '#8B7355', tKey: '' };

  return (
    <Marker
      coordinate={{ latitude: loc.latitude, longitude: loc.longitude }}
      onPress={onPress}
      anchor={{ x: 0.5, y: 1 }}
      tracksViewChanges={tracked}
    >
      <View onLayout={() => setTimeout(() => setTracked(false), 500)}>
        <Animated.View style={[
          mStyles.pin,
          {
            backgroundColor: isSelected ? '#FFD700' : cat.color,
            borderColor:     isSelected ? '#fff'    : 'rgba(255,255,255,0.55)',
            borderWidth:     isSelected ? 2.5       : 1.5,
            transform: [{ scale: isSelected ? 1.25 : 1 }],
          }
        ]}>
          <Text style={mStyles.emoji}>{cat.emoji}</Text>
        </Animated.View>
        <View style={[mStyles.tail, { borderTopColor: isSelected ? '#FFD700' : cat.color }]} />
      </View>
    </Marker>
  );
};

const mStyles = StyleSheet.create({
  pin: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.45, shadowRadius: 5, elevation: 8,
  },
  emoji: { fontSize: 18 },
  tail: {
    width: 0, height: 0, alignSelf: 'center',
    borderLeftWidth: 5, borderRightWidth: 5, borderTopWidth: 10,
    borderLeftColor: 'transparent', borderRightColor: 'transparent',
    marginTop: -1,
  },
});

// ─────────────────────────────────────────
// EventRow în bottom sheet
// ─────────────────────────────────────────
const eStyles = StyleSheet.create({
  row:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  left:      { flex: 1, marginRight: 12 },
  topRow:    { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  catBadge:  { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  catText:   { fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  emoji:     { fontSize: 12 },
  year:      { fontSize: 11, fontWeight: '800', letterSpacing: 1.5 },
  title:     { fontSize: 14, fontWeight: '600', lineHeight: 20 },
  right:     { alignItems: 'center', gap: 5 },
  impact:    { flexDirection: 'row', alignItems: 'center', gap: 3 },
  impactTxt: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  chevron:   { fontSize: 22, fontWeight: '200', lineHeight: 24 },
});

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
  const cat    = CATEGORIES[catKey] ?? { emoji: '📜', color: '#8B7355', tKey: '' };
  const year   = getYear(event);
  const catLabel = cat.tKey ? tm(cat.tKey) : catKey;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.72} style={[eStyles.row, { borderBottomColor: theme.border }]}>
      <View style={eStyles.left}>
        <View style={eStyles.topRow}>
          <Text style={eStyles.emoji}>{cat.emoji}</Text>
          <View style={[eStyles.catBadge, { backgroundColor: cat.color + '25' }]}>
            <Text style={[eStyles.catText, { color: cat.color }]}>{catLabel.toUpperCase()}</Text>
          </View>
          <Text style={[eStyles.year, { color: theme.gold }]}>{year}</Text>
        </View>
        <Text style={[eStyles.title, { color: theme.text }]} numberOfLines={2}>{title}</Text>
      </View>
      <View style={eStyles.right}>
        <View style={eStyles.impact}>
          <Zap size={10} color={theme.gold} fill={theme.gold} />
          <Text style={[eStyles.impactTxt, { color: theme.gold }]}>{impact}%</Text>
        </View>
        <Text style={[eStyles.chevron, { color: theme.subtext }]}>›</Text>
      </View>
    </TouchableOpacity>
  );
};

// ─────────────────────────────────────────
// MapScreen principal
// ─────────────────────────────────────────
export default function MapScreen() {
  const { theme, isDark }  = useTheme();
  const { language }       = useLanguage();
  const insets             = useSafeAreaInsets();
  const mapRef             = useRef<MapView>(null);

  // Helper traduceri map
  const tm = useCallback((key: string): string => {
    const table = MAP_TRANSLATIONS[language] ?? MAP_TRANSLATIONS['en'];
    return table[key] ?? MAP_TRANSLATIONS['en'][key] ?? key;
  }, [language]);

  const [allEvents, setAllEvents]         = useState<any[]>([]);
  const [loading, setLoading]             = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [sheetEvents, setSheetEvents]     = useState<any[]>([]);
  const [sheetLabel, setSheetLabel]       = useState('');
  const [sheetIcon, setSheetIcon]         = useState('');
  const [sheetColor, setSheetColor]       = useState('#FFD700');
  const [storyEvent, setStoryEvent]       = useState<any>(null);
  const [storyVisible, setStoryVisible]   = useState(false);
  const [activeFilter, setActiveFilter]   = useState<string | null>(null);

  // ── Bottom sheet
  const sheetY = useRef(new Animated.Value(SHEET_CLOSED)).current;
  const lastY  = useRef(0);

  const animateSheet = useCallback((h: number) => {
    Animated.spring(sheetY, { toValue: h, tension: 220, friction: 26, useNativeDriver: false }).start();
  }, [sheetY]);

  const openSheet = useCallback((events: any[], label: string, icon = '📍', color = '#FFD700') => {
    const sorted = [...events].sort((a, b) => (b.impactScore ?? 0) - (a.impactScore ?? 0));
    setSheetEvents(sorted);
    setSheetLabel(label);
    setSheetIcon(icon);
    setSheetColor(color);
    animateSheet(SHEET_HALF);
  }, [animateSheet]);

  const closeSheet = useCallback(() => {
    animateSheet(SHEET_CLOSED);
    setSelectedEvent(null);
    setActiveFilter(null);
    setTimeout(() => { setSheetEvents([]); setSheetLabel(''); setSheetIcon(''); }, 350);
  }, [animateSheet]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder:  (_, g) => Math.abs(g.dy) > 5,
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
        const all    = (await Promise.all(promises)).flat();
        const seen   = new Set<string>();
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

  // ── Tap marker → toate evenimentele din locația respectivă
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
    openSheet(nearby, loc.label, '📍', '#FFD700');
  }, [allEvents, openSheet]);

  // ── Tap categorie → toate evenimentele din acea categorie
  const handleCategoryPress = useCallback((catKey: string) => {
    if (activeFilter === catKey) { closeSheet(); return; }
    setActiveFilter(catKey);
    setSelectedEvent(null);
    const cat    = CATEGORIES[catKey];
    const events = allEvents.filter(e => getCatKey(e) === catKey);
    if (events.length === 0) return;
    openSheet(events, tm(cat.tKey), cat.emoji, cat.color);
  }, [allEvents, activeFilter, openSheet, closeSheet, tm]);

  // ── Statistici per categorie
  const catStats = Object.keys(CATEGORIES).map(k => ({
    key: k,
    count: allEvents.filter(e => getCatKey(e) === k).length,
    ...CATEGORIES[k],
  })).filter(s => s.count > 0);

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
        {allEvents.map((event, idx) => (
          <EventMarker
            key={`${event.eventDate}-${idx}`}
            event={event}
            isSelected={selectedEvent === event}
            onPress={() => handleMarkerPress(event)}
          />
        ))}
      </MapView>

      {/* ── HEADER ── */}
      <View style={[s.header, { paddingTop: insets.top + 8 }]} pointerEvents="none">
        <View style={[s.headerPill, { backgroundColor: isDark ? 'rgba(28,26,20,0.92)' : 'rgba(244,232,193,0.96)', borderColor: isDark ? '#4a3f28' : '#8b6914' }]}>
          <Text style={s.headerMapIcon}>🗺️</Text>
          <Text style={[s.headerText, { color: theme.text }]}>
            {loading ? tm('loading') : `${allEvents.length} ${tm('events_globe')}`}
          </Text>
        </View>
      </View>

      {/* ── FILTRE CATEGORIE (stânga) ── */}
      {!loading && (
        <View style={[s.filters, { top: insets.top + 62 }]}>
          {catStats.map(stat => {
            const isActive = activeFilter === stat.key;
            return (
              <TouchableOpacity
                key={stat.key}
                onPress={() => handleCategoryPress(stat.key)}
                activeOpacity={0.8}
              >
                <View style={[
                  s.filterBtn,
                  { backgroundColor: isActive ? stat.color : stat.color + 'BB' },
                  isActive && s.filterBtnActive,
                ]}>
                  <Text style={s.filterEmoji}>{stat.emoji}</Text>
                  <View style={s.filterBadge}>
                    <Text style={s.filterBadgeTxt}>{stat.count}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* ── LOADING ── */}
      {loading && (
        <View style={[s.loadingWrap, { backgroundColor: isDark ? 'rgba(28,26,20,0.75)' : 'rgba(244,232,193,0.75)' }]} pointerEvents="none">
          <ActivityIndicator color={theme.gold} size="large" />
          <Text style={[s.loadingText, { color: theme.gold }]}>{tm('loading')}</Text>
        </View>
      )}

      {/* ── EMPTY STATE (fără loading) ── */}
      {!loading && allEvents.length === 0 && (
        <View style={s.emptyMapWrap} pointerEvents="none">
          <Text style={s.emptyMapIcon}>🌍</Text>
          <Text style={[s.emptyMapText, { color: theme.subtext }]}>{tm('no_events')}</Text>
        </View>
      )}

      {/* ── BOTTOM SHEET ── */}
      <Animated.View style={[s.sheet, { height: sheetY, backgroundColor: theme.card }]}>

        {/* Handle + header */}
        <View style={s.sheetTop} {...panResponder.panHandlers}>
          <View style={[s.handle, { backgroundColor: theme.border }]} />

          {sheetLabel !== '' && (
            <View style={s.sheetHeader}>
              <View style={s.sheetTitleRow}>
                <View style={[s.sheetIconWrap, { backgroundColor: sheetColor + '22' }]}>
                  <Text style={s.sheetIconTxt}>{sheetIcon}</Text>
                </View>
                <Text style={[s.sheetTitle, { color: theme.text }]} numberOfLines={1}>
                  {sheetLabel}
                </Text>
                <View style={[s.badge, { backgroundColor: sheetColor + '22', borderColor: sheetColor + '55' }]}>
                  <Text style={[s.badgeTxt, { color: sheetColor }]}>{sheetEvents.length}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={closeSheet} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                <View style={[s.closeBtn, { backgroundColor: theme.border + '80' }]}>
                  <X size={14} color={theme.subtext} />
                </View>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Lista evenimente */}
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
              <Text style={s.emptyIcon}>🌍</Text>
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

// ── Dark map (manuscris medieval)
const DARK_MAP = [
  { elementType: 'geometry',            stylers: [{ color: '#1c1a14' }] },
  { elementType: 'labels.text.fill',    stylers: [{ color: '#9a8b6e' }] },
  { elementType: 'labels.text.stroke',  stylers: [{ color: '#1c1a14' }] },
  { featureType: 'water', elementType: 'geometry',          stylers: [{ color: '#0d1b2a' }] },
  { featureType: 'water', elementType: 'labels.text.fill',  stylers: [{ color: '#3d5a6e' }] },
  { featureType: 'landscape',           elementType: 'geometry', stylers: [{ color: '#1e1a10' }] },
  { featureType: 'landscape.natural',   elementType: 'geometry', stylers: [{ color: '#221e12' }] },
  { featureType: 'administrative.country', elementType: 'geometry.stroke', stylers: [{ color: '#4a3f28' }, { weight: 1.5 }] },
  { featureType: 'administrative.country', elementType: 'labels.text.fill', stylers: [{ color: '#c9a84c' }] },
  { featureType: 'administrative.province', elementType: 'geometry.stroke', stylers: [{ color: '#2e2818' }, { weight: 0.8 }] },
  { featureType: 'poi',     stylers: [{ visibility: 'off' }] },
  { featureType: 'road',    stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
];

// ── Light map (pergament sepia)
const LIGHT_MAP = [
  { elementType: 'geometry',            stylers: [{ color: '#f4e8c1' }] },
  { elementType: 'labels.text.fill',    stylers: [{ color: '#5c4a1e' }] },
  { elementType: 'labels.text.stroke',  stylers: [{ color: '#f4e8c1' }] },
  { featureType: 'water', elementType: 'geometry',          stylers: [{ color: '#a8c5da' }] },
  { featureType: 'water', elementType: 'labels.text.fill',  stylers: [{ color: '#4a7a9b' }] },
  { featureType: 'landscape',           elementType: 'geometry', stylers: [{ color: '#ede0b0' }] },
  { featureType: 'landscape.natural',   elementType: 'geometry', stylers: [{ color: '#d4c484' }] },
  { featureType: 'administrative.country', elementType: 'geometry.stroke', stylers: [{ color: '#8b6914' }, { weight: 1.5 }] },
  { featureType: 'administrative.country', elementType: 'labels.text.fill', stylers: [{ color: '#5c3d0a' }] },
  { featureType: 'administrative.province', elementType: 'geometry.stroke', stylers: [{ color: '#b8a060' }, { weight: 0.8 }] },
  { featureType: 'poi',     stylers: [{ visibility: 'off' }] },
  { featureType: 'road',    stylers: [{ visibility: 'off' }] },
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
      flexDirection: 'row', alignItems: 'center', gap: 7,
      paddingHorizontal: 16, paddingVertical: 9, borderRadius: 22,
      borderWidth: 1,
      shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2, shadowRadius: 6, elevation: 4,
    },
    headerMapIcon: { fontSize: 16 },
    headerText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },

    // Filtre stânga
    filters: {
      position: 'absolute', left: 12,
      flexDirection: 'column', gap: 8,
    },
    filterBtn: {
      width: 44, height: 44, borderRadius: 22,
      alignItems: 'center', justifyContent: 'center',
      shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3, shadowRadius: 4, elevation: 5,
    },
    filterBtnActive: {
      borderWidth: 2.5, borderColor: '#fff',
      transform: [{ scale: 1.1 }],
    },
    filterEmoji: { fontSize: 18 },
    filterBadge: {
      position: 'absolute', top: -3, right: -3,
      minWidth: 16, height: 16, borderRadius: 8,
      backgroundColor: '#fff',
      alignItems: 'center', justifyContent: 'center',
      paddingHorizontal: 3,
    },
    filterBadgeTxt: { fontSize: 9, fontWeight: '900', color: '#000' },

    // Loading
    loadingWrap: {
      ...StyleSheet.absoluteFillObject,
      alignItems: 'center', justifyContent: 'center', gap: 14,
    },
    loadingText: { fontSize: 13, fontWeight: '600', letterSpacing: 0.5 },

    // Empty state pe hartă
    emptyMapWrap: {
      position: 'absolute', bottom: 120, left: 0, right: 0,
      alignItems: 'center', gap: 8,
    },
    emptyMapIcon: { fontSize: 36 },
    emptyMapText: { fontSize: 14, fontWeight: '600' },

    // Bottom sheet
    sheet: {
      position: 'absolute', bottom: 0, left: 0, right: 0,
      borderTopLeftRadius: 26, borderTopRightRadius: 26,
      overflow: 'hidden',
      borderTopWidth: StyleSheet.hairlineWidth, borderColor: theme.border,
      shadowColor: '#000', shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.28, shadowRadius: 14, elevation: 22,
    },
    sheetTop: {
      paddingTop: 10, paddingHorizontal: 20, paddingBottom: 10,
    },
    handle: {
      width: 38, height: 4, borderRadius: 2,
      alignSelf: 'center', marginBottom: 14,
    },
    sheetHeader: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    },
    sheetTitleRow: {
      flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, marginRight: 12,
    },
    sheetIconWrap: {
      width: 34, height: 34, borderRadius: 17,
      alignItems: 'center', justifyContent: 'center',
    },
    sheetIconTxt: { fontSize: 16 },
    sheetTitle: { fontSize: 16, fontWeight: '800', letterSpacing: 0.3, flex: 1 },
    badge: {
      paddingHorizontal: 9, paddingVertical: 3,
      borderRadius: 10, borderWidth: 1,
    },
    badgeTxt: { fontSize: 11, fontWeight: '800' },
    closeBtn: {
      width: 30, height: 30, borderRadius: 15,
      alignItems: 'center', justifyContent: 'center',
    },

    // Empty în sheet
    emptyWrap: {
      paddingVertical: 50, alignItems: 'center', gap: 10,
    },
    emptyIcon: { fontSize: 38 },
    emptyText: { fontSize: 14, fontWeight: '500' },
  });