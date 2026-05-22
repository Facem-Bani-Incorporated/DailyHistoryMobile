// components/MapScreen.tsx
// ═══════════════════════════════════════════════════════════════════════════════
// HISTORIC MAP — Country clusters at world zoom, city markers when zoomed in
// Uses event.location field directly from DB ("City, Country")
// ═══════════════════════════════════════════════════════════════════════════════

import {
  Book,
  Calendar,
  Castle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Circle as CircleIcon,
  Clock,
  Crown,
  Globe2,
  Layers,
  Lock,
  MapPin,
  Navigation,
  Swords,
  Thermometer,
  X,
} from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  LayoutAnimation,
  PanResponder,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View,
} from 'react-native';
import MapView, { Circle, Marker, Polygon, Polyline, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { EMPIRE_BORDERS } from '../data/empireBorders';
import { EXPLORER_ROUTES } from '../data/explorerRoutes';
import { FAMOUS_BATTLES, FamousBattle } from '../data/famousBattles';
import { ANCIENT_CITIES, AncientCity } from '../data/ancientCities';
import { TRADE_ROUTES } from '../data/tradeRoutes';
import { RELIGIONS, Religion } from '../data/religionSpread';
import { WW1_EVENTS, WW1_YEAR_MIN, WW1_YEAR_MAX } from '../data/ww1Events';
import { WW2_EVENTS, WW2_YEAR_MIN, WW2_YEAR_MAX } from '../data/ww2Events';
import { WAR_TERRITORIES } from '../data/warTerritories';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { useRevenueCat } from '../context/RevenueCatContext';
import { useAllEvents } from '../context/AllEventsContext';
import { haptic } from '../utils/haptics';
import { extractLocation } from '../utils/locationExtractor';
import { GameIcon } from '../utils/GameIcon';
import { StoryModal } from './StoryModal';
import { useRewardedUnlock } from '../hooks/useRewardedUnlock';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental)
  UIManager.setLayoutAnimationEnabledExperimental(true);

const { width: W, height: H } = Dimensions.get('window');
const SHEET_CLOSED = 0;
const SHEET_HALF = H * 0.5;
const SHEET_FULL = H * 0.88;

// latitudeDelta threshold: above = world view (clusters), below = city view (individual)
const ZOOM_CLUSTER_THRESHOLD = 35;

// Local-storage cache so the map opens instantly on subsequent app launches
const MAP_CACHE_KEY = 'map_events_v1';
const MAP_CACHE_TTL = 1000 * 60 * 60 * 24; // 24h

const INIT_REGION: Region = {
  latitude: 30,
  longitude: 15,
  latitudeDelta: 100,
  longitudeDelta: 120,
};
const INIT_CAM = {
  center: { latitude: 30, longitude: 15 },
  pitch: 0,
  heading: 0,
  altitude: 20000000,
  zoom: 1.5,
};

// ─── Era presets for time slider ───────────────────────────────────────────────
const ERA_PRESETS = [
  { label: 'Ancient', year: 500 },
  { label: 'Medieval', year: 1400 },
  { label: 'Renaissance', year: 1700 },
  { label: 'Industrial', year: 1900 },
  { label: 'Modern', year: 2024 },
];

// ─── i18n ──────────────────────────────────────────────────────────────────────
const T: Record<string, Record<string, string>> = {
  en: {
    loading: 'Loading...',
    events_across: 'events across',
    countries: 'countries',
    no_events: 'No events found',
    events: 'events',
    categories: 'categories',
    back_to_world: 'World View',
    war_conflict: 'Wars & Conflicts',
    tech_innovation: 'Technology',
    science_discovery: 'Science',
    politics_state: 'Politics',
    culture_arts: 'Culture & Arts',
    natural_disaster: 'Natural Disasters',
    exploration: 'Exploration',
    religion_phil: 'Religion',
    personalities: 'Personalities',
    media: 'Media',
    sport: 'Sport',
    tap_to_explore: 'Tap a marker to explore',
    read_more: 'Read Full Story',
    close: 'Close',
    zoom_hint: 'Zoom in to see city markers',
    time_filter: 'Time Filter',
    heat_map: 'Heat Map',
    empires: 'Empires',
    routes: 'Routes',
    battles: 'Famous Battles',
    cities: 'Ancient Cities',
    trade: 'Trade Routes',
    religion: 'Religion Spread',
    all_time: 'All Time',
    phase: 'Phase',
    attacker: 'Attacker',
    defender: 'Defender',
    outcome: 'Outcome',
    significance: 'Significance',
    casualties: 'Casualties',
  },
  ro: {
    loading: 'Se încarcă...',
    events_across: 'evenimente în',
    countries: 'țări',
    no_events: 'Niciun eveniment',
    events: 'evenimente',
    categories: 'categorii',
    back_to_world: 'Vedere globală',
    war_conflict: 'Războaie',
    tech_innovation: 'Tehnologie',
    science_discovery: 'Știință',
    politics_state: 'Politică',
    culture_arts: 'Cultură',
    natural_disaster: 'Dezastre',
    exploration: 'Explorare',
    religion_phil: 'Religie',
    personalities: 'Personalități',
    media: 'Media',
    sport: 'Sport',
    tap_to_explore: 'Apasă pe un marker',
    read_more: 'Citește Articolul',
    close: 'Închide',
    zoom_hint: 'Mărește pentru a vedea orașe',
    time_filter: 'Filtru Timp',
    heat_map: 'Hartă Termică',
    empires: 'Imperii',
    routes: 'Rute',
    battles: 'Bătălii Celebre',
    cities: 'Orașe Antice',
    trade: 'Rute Comerciale',
    religion: 'Răspândire Religii',
    all_time: 'Tot Timpul',
    phase: 'Faza',
    attacker: 'Atacant',
    defender: 'Apărător',
    outcome: 'Rezultat',
    significance: 'Semnificație',
    casualties: 'Pierderi',
  },
};

// ─── Categories ────────────────────────────────────────────────────────────────
const CAT: Record<string, { color: string; tKey: string; emoji: string }> = {
  war_conflict:      { color: '#DC2626', tKey: 'war_conflict',      emoji: 'sword' },
  tech_innovation:   { color: '#2563EB', tKey: 'tech_innovation',   emoji: 'flash' },
  science_discovery: { color: '#7C3AED', tKey: 'science_discovery', emoji: 'microscope' },
  politics_state:    { color: '#D97706', tKey: 'politics_state',    emoji: 'castle' },
  culture_arts:      { color: '#059669', tKey: 'culture_arts',      emoji: 'theater' },
  natural_disaster:  { color: '#EA580C', tKey: 'natural_disaster',  emoji: 'globe' },
  exploration:       { color: '#0891B2', tKey: 'exploration',       emoji: 'compass' },
  religion_phil:     { color: '#92400E', tKey: 'religion_phil',     emoji: 'scroll' },
  personalities:     { color: '#BE185D', tKey: 'personalities',     emoji: 'star' },
  media:             { color: '#0F766E', tKey: 'media',             emoji: 'film' },
  sport:             { color: '#15803D', tKey: 'sport',             emoji: 'sport' },
};
const FALLBACK_COLOR = '#6B7280';

// ─── War event type → GameIcon key (SVG — renders reliably inside markers) ───────
const WAR_TYPE_ICON: Record<string, string> = {
  battle: 'sword',
  invasion: 'shield',
  bombing: 'flash',
  naval: 'compass',
  turning_point: 'star',
  atrocity: 'fire',
  surrender: 'check',
  treaty: 'scroll',
  offensive: 'target',
};
const sideColorOf = (side: string) =>
  side === 'axis' || side === 'central' ? '#DC2626' : side === 'allied' ? '#2563EB' : '#6B7280';

// Map a country-filter chip key → keyword found in a WarTerritory.country name
const WAR_COUNTRY_KEYWORD: Record<string, string> = {
  germany: 'german', uk: 'united kingdom', france: 'france', usa: 'united states',
  russia: 'russian', ottoman: 'ottoman', austria: 'austria', japan: 'japan',
  ussr: 'soviet', italy: 'italy',
};

// ─── Helpers ───────────────────────────────────────────────────────────────────
const getCat = (e: any): string => (e.category ?? '').toString().toLowerCase();
const getYear = (e: any): string => {
  const r = String(e.eventDate ?? e.event_date ?? e.year ?? '').trim();
  if (/^\d{4}$/.test(r)) return r;
  if (r.includes('-')) return r.split('-')[0];
  return '';
};

// ─── Types ─────────────────────────────────────────────────────────────────────
interface EventWithLocation {
  event: any;
  lat: number;
  lng: number;
  label: string;
  city: string;
  country: string;
}

interface CatGroup {
  key: string;
  color: string;
  emoji: string;
  labelKey: string;
  events: EventWithLocation[];
}

interface Cluster {
  country: string;
  lat: number;
  lng: number;
  items: EventWithLocation[];
  cats: CatGroup[];
  mainColor: string;
  count: number;
}

// ─── Build helpers ─────────────────────────────────────────────────────────────

const buildEventsWithLocation = (events: any[]): EventWithLocation[] => {
  const result: EventWithLocation[] = [];
  for (const ev of events) {
    const loc = extractLocation(ev);
    if (loc) {
      result.push({
        event: ev,
        lat: loc.latitude,
        lng: loc.longitude,
        label: loc.label,
        city: loc.city,
        country: loc.country,
      });
    }
  }
  return result;
};

const buildClusters = (eventsWithLoc: EventWithLocation[]): Cluster[] => {
  const byCountry = new Map<string, EventWithLocation[]>();
  for (const item of eventsWithLoc) {
    const c = item.country || 'Unknown';
    if (!byCountry.has(c)) byCountry.set(c, []);
    byCountry.get(c)!.push(item);
  }

  const clusters: Cluster[] = [];
  for (const [country, items] of byCountry) {
    // Cluster center = average of all event coords in that country
    const lat = items.reduce((s, i) => s + i.lat, 0) / items.length;
    const lng = items.reduce((s, i) => s + i.lng, 0) / items.length;

    const byCat = new Map<string, EventWithLocation[]>();
    for (const item of items) {
      const cat = getCat(item.event);
      if (!byCat.has(cat)) byCat.set(cat, []);
      byCat.get(cat)!.push(item);
    }

    const cats: CatGroup[] = Array.from(byCat.entries())
      .map(([key, evts]) => ({
        key,
        color: CAT[key]?.color ?? FALLBACK_COLOR,
        emoji: CAT[key]?.emoji ?? 'star',
        labelKey: CAT[key]?.tKey ?? key,
        events: evts.sort((a, b) => (b.event.impactScore ?? 0) - (a.event.impactScore ?? 0)),
      }))
      .sort((a, b) => b.events.length - a.events.length);

    clusters.push({
      country,
      lat,
      lng,
      items,
      cats,
      mainColor: cats[0]?.color ?? FALLBACK_COLOR,
      count: items.length,
    });
  }

  return clusters.sort((a, b) => b.count - a.count);
};

// ═══════════════════════════════════════════════════════════════════════════════
// Preview Card
// ═══════════════════════════════════════════════════════════════════════════════
const PreviewCard = ({
  item,
  language,
  theme,
  isDark,
  tm,
  onClose,
  onReadMore,
}: {
  item: EventWithLocation;
  language: string;
  theme: any;
  isDark: boolean;
  tm: (k: string) => string;
  onClose: () => void;
  onReadMore: () => void;
}) => {
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, tension: 300, friction: 20, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  }, []);

  const close = () => {
    Animated.parallel([
      Animated.timing(scaleAnim, { toValue: 0.9, duration: 150, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
    ]).start(() => onClose());
  };

  const catKey = getCat(item.event);
  const catInfo = CAT[catKey];
  const color = catInfo?.color ?? FALLBACK_COLOR;
  const emoji = catInfo?.emoji ?? 'star';

  const title =
    item.event.titleTranslations?.[language] ??
    item.event.titleTranslations?.en ??
    'Untitled';
  const summary =
    item.event.summaryTranslations?.[language] ??
    item.event.summaryTranslations?.en ??
    '';
  const year = getYear(item.event);
  const locationLabel = item.city || item.label.split(',')[0]?.trim() || item.label;

  const cardBg = isDark ? '#1C1917' : '#FFFFFF';
  const borderCol = isDark ? '#292524' : '#E5E5E5';
  const subtextCol = isDark ? '#A8A29E' : '#737373';

  return (
    <Animated.View style={[styles.previewOverlay, { opacity: opacityAnim }]}>
      <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={close} />
      <Animated.View
        style={[
          styles.previewCard,
          { backgroundColor: cardBg, borderColor: borderCol, transform: [{ scale: scaleAnim }] },
        ]}
      >
        <View style={[styles.previewHeader, { borderBottomColor: borderCol }]}>
          <View style={[styles.previewBadge, { backgroundColor: color + '15' }]}>
            <GameIcon iconKey={emoji} size={16} color={color} />
            <Text style={[styles.previewCatText, { color }]}>
              {tm(catInfo?.tKey ?? catKey)}
            </Text>
          </View>
          <TouchableOpacity
            onPress={close}
            style={[styles.previewClose, { backgroundColor: isDark ? '#292524' : '#F5F5F5' }]}
          >
            <X size={18} color={subtextCol} strokeWidth={2} />
          </TouchableOpacity>
        </View>

        <View style={styles.previewBody}>
          <Text style={[styles.previewTitle, { color: theme.text }]} numberOfLines={3}>
            {title}
          </Text>
          {summary !== '' && (
            <Text style={[styles.previewSummary, { color: subtextCol }]} numberOfLines={3}>
              {summary}
            </Text>
          )}
          <View style={styles.previewMeta}>
            {year !== '' && (
              <View style={[styles.previewMetaItem, { backgroundColor: isDark ? '#292524' : '#F5F5F5' }]}>
                <Calendar size={12} color={color} strokeWidth={2.5} />
                <Text style={[styles.previewMetaText, { color: theme.text }]}>{year}</Text>
              </View>
            )}
            <View style={[styles.previewMetaItem, { backgroundColor: isDark ? '#292524' : '#F5F5F5' }]}>
              <MapPin size={12} color={color} strokeWidth={2.5} />
              <Text style={[styles.previewMetaText, { color: theme.text }]} numberOfLines={1}>
                {locationLabel}
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          onPress={onReadMore}
          activeOpacity={0.8}
          style={[styles.previewButton, { backgroundColor: color }]}
        >
          <Book size={16} color="#FFF" strokeWidth={2} />
          <Text style={styles.previewButtonText}>{tm('read_more')}</Text>
          <ChevronRight size={16} color="#FFF" strokeWidth={2.5} />
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// Event Row
// ═══════════════════════════════════════════════════════════════════════════════
const EventRow = React.memo(
  ({
    item,
    language,
    theme,
    isDark,
    color,
    onPress,
  }: {
    item: EventWithLocation;
    language: string;
    theme: any;
    isDark: boolean;
    color: string;
    onPress: () => void;
  }) => {
    const title =
      item.event.titleTranslations?.[language] ??
      item.event.titleTranslations?.en ??
      '';
    const year = getYear(item.event);
    const cityLabel = item.city || (item.label.includes(',') ? item.label.split(',')[0].trim() : '');

    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.6} style={styles.eventRow}>
        <View style={[styles.eventYear, { backgroundColor: color + '12', borderColor: color + '25' }]}>
          <Text style={[styles.eventYearText, { color }]}>{year || '—'}</Text>
        </View>
        <View style={styles.eventContent}>
          <Text style={[styles.eventTitle, { color: theme.text }]} numberOfLines={2}>
            {title}
          </Text>
          {cityLabel !== '' && (
            <View style={styles.eventLoc}>
              <MapPin size={10} color={theme.subtext} strokeWidth={2} style={{ opacity: 0.5 }} />
              <Text style={[styles.eventLocText, { color: theme.subtext }]}>{cityLabel}</Text>
            </View>
          )}
        </View>
        <ChevronRight size={16} color={theme.subtext} strokeWidth={2} style={{ opacity: 0.4 }} />
      </TouchableOpacity>
    );
  },
);

// ═══════════════════════════════════════════════════════════════════════════════
// Category Section
// ═══════════════════════════════════════════════════════════════════════════════
const CategorySection = ({
  cat,
  language,
  theme,
  isDark,
  tm,
  onEventPress,
}: {
  cat: CatGroup;
  language: string;
  theme: any;
  isDark: boolean;
  tm: (k: string) => string;
  onEventPress: (item: EventWithLocation) => void;
}) => {
  const [expanded, setExpanded] = useState(true);

  const toggle = () => {
    haptic('light');
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((v) => !v);
  };

  return (
    <View>
      <TouchableOpacity
        onPress={toggle}
        activeOpacity={0.7}
        style={[styles.catHeader, { backgroundColor: cat.color + '08' }]}
      >
        <View style={styles.catLeft}>
          <GameIcon iconKey={cat.emoji} size={16} color={cat.color} />
          <Text style={[styles.catLabel, { color: cat.color }]}>{tm(cat.labelKey)}</Text>
          <View style={[styles.catBadge, { backgroundColor: cat.color + '18' }]}>
            <Text style={[styles.catCount, { color: cat.color }]}>{cat.events.length}</Text>
          </View>
        </View>
        <ChevronDown
          size={18}
          color={theme.subtext}
          strokeWidth={2}
          style={{ transform: [{ rotate: expanded ? '0deg' : '-90deg' }], opacity: 0.5 }}
        />
      </TouchableOpacity>
      {expanded &&
        cat.events.map((item, i) => (
          <View key={`${getYear(item.event)}-${item.label}-${i}`}>
            <EventRow
              item={item}
              language={language}
              theme={theme}
              isDark={isDark}
              color={cat.color}
              onPress={() => onEventPress(item)}
            />
            {i < cat.events.length - 1 && (
              <View
                style={[styles.divider, { backgroundColor: isDark ? '#292524' : '#F0F0F0' }]}
              />
            )}
          </View>
        ))}
    </View>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// SmartMarker — fixes the react-native-maps Android "half/clipped marker" bug.
// Custom-view markers capture a bitmap snapshot; with tracksViewChanges=false that
// snapshot is taken before the view finishes laying out, so only part renders.
// We keep tracking ON until the content has settled, then freeze it for performance.
// Re-tracks whenever `redraw` changes (e.g. selection/colour), then freezes again.
// ═══════════════════════════════════════════════════════════════════════════════
const SmartMarker = ({
  redraw,
  children,
  ...markerProps
}: React.ComponentProps<typeof Marker> & { redraw?: string | number }) => {
  const [track, setTrack] = useState(true);
  useEffect(() => {
    setTrack(true);
    // freeze the bitmap once content has laid out — short window keeps panning smooth
    const t = setTimeout(() => setTrack(false), 500);
    return () => clearTimeout(t);
  }, [redraw]);
  return (
    <Marker tracksViewChanges={track} {...markerProps}>
      {children}
    </Marker>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// PinHead — reusable teardrop marker graphic with a fixed size (no clipping),
// an SVG GameIcon or single emoji glyph, an optional name label, and a tail.
// ═══════════════════════════════════════════════════════════════════════════════
const PinHead = ({
  color, size = 38, selected, iconKey, emoji, label, text,
}: {
  color: string;
  size?: number;
  selected?: boolean;
  iconKey?: string;
  emoji?: string;
  label?: string;
  text?: string;
}) => (
  <View style={mkr.wrap}>
    {label ? (
      <View style={[mkr.label, { borderColor: color }]}>
        <Text style={[mkr.labelText, { color }]} numberOfLines={1}>{label}</Text>
      </View>
    ) : null}
    <View style={[mkr.head, {
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: color, borderWidth: selected ? 4 : 2.5,
    }]}>
      {iconKey
        ? <GameIcon iconKey={iconKey} size={Math.round(size * 0.52)} color="#FFFFFF" />
        : text != null
        ? <Text style={{
            fontSize: Math.round(size * 0.4), lineHeight: Math.round(size * 0.52),
            fontWeight: '900', color: '#FFFFFF', textAlign: 'center', includeFontPadding: false,
          }}>{text}</Text>
        : <Text style={{ fontSize: Math.round(size * 0.5), lineHeight: Math.round(size * 0.6) }}>{emoji}</Text>}
    </View>
    <View style={[mkr.tail, { borderTopColor: color }]} />
  </View>
);

// ═══════════════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════════════
export default function MapScreen({ onInterstitial }: { onInterstitial?: () => void } = {}) {
  const { theme, isDark } = useTheme();
  const { language } = useLanguage();
  const insets = useSafeAreaInsets();
  const { isPro, presentPaywall } = useRevenueCat();
  const { showForUnlock } = useRewardedUnlock();
  const [routesUnlocked, setRoutesUnlocked] = useState(false);
  const [tradeUnlocked, setTradeUnlocked] = useState(false);
  const [citiesUnlocked, setCitiesUnlocked] = useState(false);
  const mapRef = useRef<MapView>(null);

  const tm = useCallback(
    (k: string) => (T[language] ?? T.en)[k] ?? T.en[k] ?? k,
    [language],
  );

  // Events already loaded app-wide by the home screen (60 days of daily content)
  const contextEvents = useAllEvents();
  const [allEvents, setAllEvents] = useState<any[]>(contextEvents ?? []);
  const [loading, setLoading] = useState(!(contextEvents && contextEvents.length));

  // isZoomedIn: true when latitudeDelta < ZOOM_CLUSTER_THRESHOLD
  const [isZoomedIn, setIsZoomedIn] = useState(false);

  // Layer state
  type MapLayer = 'off' | 'time' | 'heatmap' | 'empires' | 'routes' | 'battles' | 'cities' | 'trade' | 'religion' | 'ww1' | 'ww2';
  const [mapLayer, setMapLayer] = useState<MapLayer>('off');
  const [selectedEmpires, setSelectedEmpires] = useState<Set<string>>(new Set());
  const [selectedRoutes, setSelectedRoutes] = useState<Set<string>>(new Set());
  const [selectedTradeRoutes, setSelectedTradeRoutes] = useState<Set<string>>(new Set());
  const [selectedReligions, setSelectedReligions] = useState<Set<string>>(new Set());
  const [sliderRatio, setSliderRatio] = useState(1);
  const sliderBarWidthRef = useRef(300);
  const sliderRatioAtGrant = useRef(1);
  const [selectedKeyStop, setSelectedKeyStop] = useState<{ route: any; stop: any } | null>(null);
  const [layersOpen, setLayersOpen] = useState(false);

  // Battles layer state
  const [selectedBattle, setSelectedBattle] = useState<FamousBattle | null>(null);
  const [battlePhase, setBattlePhase] = useState(0);

  // Cities layer state — empire-style: pick cities from top chips, show their area
  const [selectedCity, setSelectedCity] = useState<AncientCity | null>(null);
  const [selectedCities, setSelectedCities] = useState<Set<string>>(new Set());

  // Religion layer state
  const RELIGION_YEAR_MIN = -600;
  const RELIGION_YEAR_MAX = 2000;
  const [religionYear, setReligionYear] = useState(1000);
  const religionSliderWidthRef = useRef(300);
  const religionSliderRatioAtGrant = useRef(0.5);

  // WW1/WW2 layer state
  const [ww1Unlocked, setWw1Unlocked] = useState(false);
  const [ww1Year, setWw1Year] = useState(WW1_YEAR_MAX);
  const [ww2Year, setWw2Year] = useState(WW2_YEAR_MAX);
  const [ww1Countries, setWw1Countries] = useState<Set<string>>(new Set());
  const [ww2Countries, setWw2Countries] = useState<Set<string>>(new Set());
  const [selectedWarEvent, setSelectedWarEvent] = useState<any>(null);
  const ww1SliderWidthRef = useRef(300);
  const ww2SliderWidthRef = useRef(300);
  const ww1SliderRatioAtGrant = useRef(1);
  const ww2SliderRatioAtGrant = useRef(1);

  // Keep latest selectedBattle accessible inside callbacks (phase navigation)
  const selectedBattleRef = useRef<FamousBattle | null>(null);
  useEffect(() => { selectedBattleRef.current = selectedBattle; }, [selectedBattle]);

  // Active country for bottom sheet (null = no sheet)
  const [activeCountry, setActiveCountry] = useState<string | null>(null);
  const activeCountryRef = useRef<string | null>(null);

  // Preview card
  const [previewItem, setPreviewItem] = useState<EventWithLocation | null>(null);

  // Story modal
  const [storyEvent, setStoryEvent] = useState<any>(null);
  const [storyVisible, setStoryVisible] = useState(false);
  const storyVisibleRef = useRef(false);
  const justClosedStory = useRef(false);

  useEffect(() => {
    storyVisibleRef.current = storyVisible;
  }, [storyVisible]);

  // Sheet animation
  const sheetY = useRef(new Animated.Value(SHEET_CLOSED)).current;
  const backdropOp = useRef(new Animated.Value(0)).current;
  const dragStart = useRef(0);

  const snapSheet = useCallback(
    (to: number) => {
      Animated.parallel([
        Animated.spring(sheetY, { toValue: to, tension: 200, friction: 25, useNativeDriver: false }),
        Animated.timing(backdropOp, {
          toValue: to > 0 ? 0.3 : 0,
          duration: 200,
          useNativeDriver: false,
        }),
      ]).start();
    },
    [sheetY, backdropOp],
  );

  const closeSheet = useCallback(() => {
    snapSheet(SHEET_CLOSED);
    setTimeout(() => {
      setActiveCountry(null);
      activeCountryRef.current = null;
    }, 250);
  }, [snapSheet]);

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 8,
      onPanResponderGrant: () => {
        dragStart.current = (sheetY as any)._value;
      },
      onPanResponderMove: (_, g) => {
        const val = Math.max(0, Math.min(SHEET_FULL, dragStart.current - g.dy));
        sheetY.setValue(val);
      },
      onPanResponderRelease: (_, g) => {
        const cur = (sheetY as any)._value;
        if (g.vy > 1.2) {
          closeSheet();
          return;
        }
        if (-g.vy > 1.2) {
          snapSheet(SHEET_FULL);
          return;
        }
        const snaps = [SHEET_CLOSED, SHEET_HALF, SHEET_FULL];
        const nearest = snaps.reduce((p, s) =>
          Math.abs(s - cur) < Math.abs(p - cur) ? s : p,
        );
        nearest === SHEET_CLOSED ? closeSheet() : snapSheet(nearest);
      },
    }),
  ).current;

  // ── Source events: reuse home-screen data → cache → network (in that order) ─────
  // The home screen fetches the same 60 days at app start and shares them via
  // AllEventsContext, so opening the map is instant with no extra requests.
  useEffect(() => {
    // 1) Already loaded app-wide — use immediately, no network, no spinner.
    if (contextEvents && contextEvents.length) {
      setAllEvents(contextEvents);
      setLoading(false);
      AsyncStorage.setItem(MAP_CACHE_KEY, JSON.stringify({ ts: Date.now(), events: contextEvents })).catch(() => {});
      return;
    }

    let cancelled = false;
    (async () => {
      // 2) Fall back to the local cache for an instant cold-start render.
      let hadData = false;
      try {
        const raw = await AsyncStorage.getItem(MAP_CACHE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed?.events?.length && !cancelled) {
            setAllEvents(parsed.events);
            setLoading(false);
            hadData = true;
            if (Date.now() - (parsed.ts ?? 0) < MAP_CACHE_TTL) return; // fresh — skip network
          }
        }
      } catch {}

      // 3) Network fallback (first ever launch, or stale cache).
      if (!hadData) setLoading(true);
      try {
        const promises = Array.from({ length: 60 }, (_, i) => {
          const d = new Date();
          d.setDate(d.getDate() - i);
          return api
            .get('/daily-content/by-date', { params: { date: d.toISOString().split('T')[0] } })
            .then((r) => r.data?.events ?? [])
            .catch(() => []);
        });
        const all = (await Promise.all(promises)).flat();
        const seen = new Set<string>();
        const unique = all.filter((e: any) => {
          const id = `${e.eventDate}-${e.titleTranslations?.en}`;
          if (seen.has(id)) return false;
          seen.add(id);
          return true;
        });
        if (cancelled) return;
        setAllEvents(unique);
        AsyncStorage.setItem(MAP_CACHE_KEY, JSON.stringify({ ts: Date.now(), events: unique })).catch(() => {});
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [contextEvents]);

  // ── Derived data ──────────────────────────────────────────────────────────────
  const eventsWithLocation = useMemo(
    () => buildEventsWithLocation(allEvents),
    [allEvents],
  );

  const clusters = useMemo(
    () => buildClusters(eventsWithLocation),
    [eventsWithLocation],
  );

  const total = useMemo(
    () => eventsWithLocation.length,
    [eventsWithLocation],
  );

  // ── Layer: time filter ─────────────────────────────────────────────────────
  const { minYear, maxYear } = useMemo(() => {
    const years = eventsWithLocation.map(e => {
      const raw = String(e.event.eventDate ?? e.event.event_date ?? '');
      const y = parseInt(raw.replace(/^(-?\d+).*/, '$1'));
      return isNaN(y) ? null : y;
    }).filter((y): y is number => y !== null);
    if (years.length === 0) return { minYear: -500, maxYear: 2024 };
    return { minYear: Math.min(...years), maxYear: Math.max(...years) };
  }, [eventsWithLocation]);

  const filteredYear = Math.round(minYear + (maxYear - minYear) * sliderRatio);

  const activeEventsWithLocation = useMemo(() => {
    if (mapLayer !== 'time' || sliderRatio >= 1) return eventsWithLocation;
    return eventsWithLocation.filter(e => {
      const raw = String(e.event.eventDate ?? e.event.event_date ?? '');
      const y = parseInt(raw.replace(/^(-?\d+).*/, '$1'));
      return !isNaN(y) && y <= filteredYear;
    });
  }, [mapLayer, eventsWithLocation, filteredYear, sliderRatio]);

  const activeClusters = useMemo(() => buildClusters(activeEventsWithLocation), [activeEventsWithLocation]);

  const visibleWW1Events = useMemo(() => {
    if (mapLayer !== 'ww1') return [];
    return WW1_EVENTS.filter(e => {
      const yearOk = e.year <= ww1Year;
      const countryOk = ww1Countries.size === 0 || e.countries.some((c: string) => ww1Countries.has(c));
      return yearOk && countryOk;
    });
  }, [mapLayer, ww1Year, ww1Countries]);

  const visibleWW2Events = useMemo(() => {
    if (mapLayer !== 'ww2') return [];
    return WW2_EVENTS.filter(e => {
      const yearOk = e.year <= ww2Year;
      const countryOk = ww2Countries.size === 0 || e.countries.some((c: string) => ww2Countries.has(c));
      return yearOk && countryOk;
    });
  }, [mapLayer, ww2Year, ww2Countries]);

  const warEventSideColor = useMemo(() => {
    if (!selectedWarEvent) return '#DC2626';
    const s = selectedWarEvent.side;
    return s === 'axis' || s === 'central' ? '#DC2626' : s === 'allied' ? '#2563EB' : '#6B7280';
  }, [selectedWarEvent]);

  // ── Layer: heat map ────────────────────────────────────────────────────────
  const heatCells = useMemo(() => {
    if (mapLayer !== 'heatmap') return [];
    const CELL = 6;
    const grid = new Map<string, { lat: number; lng: number; count: number }>();
    for (const e of eventsWithLocation) {
      const cLat = Math.floor(e.lat / CELL) * CELL + CELL / 2;
      const cLng = Math.floor(e.lng / CELL) * CELL + CELL / 2;
      const key = `${cLat},${cLng}`;
      if (!grid.has(key)) grid.set(key, { lat: cLat, lng: cLng, count: 0 });
      grid.get(key)!.count++;
    }
    const cells = Array.from(grid.values());
    const maxC = Math.max(1, ...cells.map(c => c.count));
    return cells.map(c => ({ ...c, ratio: c.count / maxC }));
  }, [mapLayer, eventsWithLocation]);

  // ── Slider PanResponder ────────────────────────────────────────────────────
  const sliderPan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (e) => {
      const touchX = e.nativeEvent.locationX;
      const ratio = Math.max(0, Math.min(1, touchX / sliderBarWidthRef.current));
      sliderRatioAtGrant.current = ratio;
      setSliderRatio(ratio);
    },
    onPanResponderMove: (_, g) => {
      const ratio = Math.max(0, Math.min(1, sliderRatioAtGrant.current + g.dx / sliderBarWidthRef.current));
      setSliderRatio(ratio);
    },
  })).current;

  // Layer toggle helpers
  const toggleLayer = useCallback((layer: MapLayer) => {
    haptic('medium');

    if (!isPro && layer !== 'heatmap') {
      const rewardedLayers: MapLayer[] = ['routes', 'trade', 'cities', 'ww1'];
      if (rewardedLayers.includes(layer)) {
        const unlocked =
          layer === 'routes' ? routesUnlocked :
          layer === 'trade'  ? tradeUnlocked  :
          layer === 'cities' ? citiesUnlocked :
          ww1Unlocked;
        if (!unlocked) {
          setLayersOpen(false);
          showForUnlock(() => {
            if (layer === 'routes')      setRoutesUnlocked(true);
            else if (layer === 'trade')  setTradeUnlocked(true);
            else if (layer === 'cities') setCitiesUnlocked(true);
            else if (layer === 'ww1')   setWw1Unlocked(true);
            setMapLayer(layer);
            setSelectedKeyStop(null);
            setSelectedWarEvent(null);
          });
          return;
        }
        // already unlocked via rewarded — fall through
      } else {
        setLayersOpen(false);
        presentPaywall();
        return;
      }
    }

    setMapLayer(prev => prev === layer ? 'off' : layer);
    setSelectedKeyStop(null);
    setSelectedWarEvent(null);
    setLayersOpen(false);
  }, [isPro, routesUnlocked, tradeUnlocked, citiesUnlocked, ww1Unlocked, showForUnlock, presentPaywall]);

  const toggleEmpire = useCallback((id: string) => {
    haptic('selection');
    setSelectedEmpires(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const toggleRoute = useCallback((id: string) => {
    haptic('selection');
    setSelectedRoutes(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const toggleTradeRoute = useCallback((id: string) => {
    haptic('selection');
    setSelectedTradeRoutes(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const toggleReligion = useCallback((id: string) => {
    haptic('selection');
    setSelectedReligions(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const toggleWw1Country = useCallback((c: string) => {
    haptic('selection');
    setWw1Countries(prev => {
      const next = new Set(prev);
      if (next.has(c)) next.delete(c); else next.add(c);
      return next;
    });
  }, []);

  const toggleWw2Country = useCallback((c: string) => {
    haptic('selection');
    setWw2Countries(prev => {
      const next = new Set(prev);
      if (next.has(c)) next.delete(c); else next.add(c);
      return next;
    });
  }, []);

  // Religion slider pan
  const religionSliderPan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (e) => {
      const touchX = e.nativeEvent.locationX;
      const ratio = Math.max(0, Math.min(1, touchX / religionSliderWidthRef.current));
      religionSliderRatioAtGrant.current = ratio;
      const year = Math.round(RELIGION_YEAR_MIN + ratio * (RELIGION_YEAR_MAX - RELIGION_YEAR_MIN));
      setReligionYear(year);
    },
    onPanResponderMove: (_, g) => {
      const ratio = Math.max(0, Math.min(1, religionSliderRatioAtGrant.current + g.dx / religionSliderWidthRef.current));
      const year = Math.round(RELIGION_YEAR_MIN + ratio * (RELIGION_YEAR_MAX - RELIGION_YEAR_MIN));
      setReligionYear(year);
    },
  })).current;

  const ww1SliderPan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (e) => {
      const ratio = Math.max(0, Math.min(1, e.nativeEvent.locationX / ww1SliderWidthRef.current));
      ww1SliderRatioAtGrant.current = ratio;
      setWw1Year(Math.round(WW1_YEAR_MIN + ratio * (WW1_YEAR_MAX - WW1_YEAR_MIN)));
    },
    onPanResponderMove: (_, g) => {
      const ratio = Math.max(0, Math.min(1, ww1SliderRatioAtGrant.current + g.dx / ww1SliderWidthRef.current));
      setWw1Year(Math.round(WW1_YEAR_MIN + ratio * (WW1_YEAR_MAX - WW1_YEAR_MIN)));
    },
  })).current;

  const ww2SliderPan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (e) => {
      const ratio = Math.max(0, Math.min(1, e.nativeEvent.locationX / ww2SliderWidthRef.current));
      ww2SliderRatioAtGrant.current = ratio;
      setWw2Year(Math.round(WW2_YEAR_MIN + ratio * (WW2_YEAR_MAX - WW2_YEAR_MIN)));
    },
    onPanResponderMove: (_, g) => {
      const ratio = Math.max(0, Math.min(1, ww2SliderRatioAtGrant.current + g.dx / ww2SliderWidthRef.current));
      setWw2Year(Math.round(WW2_YEAR_MIN + ratio * (WW2_YEAR_MAX - WW2_YEAR_MIN)));
    },
  })).current;

  // When zoomed in + active country: show only that country's events
  // When zoomed in + no active country: show all individual events
  const visibleCityEvents = useMemo(() => {
    if (!isZoomedIn) return [];
    if (activeCountry) {
      return activeEventsWithLocation.filter((e) => e.country === activeCountry);
    }
    // No country selected: cap markers to the most impactful ones so free-panning
    // never tries to render hundreds of custom markers at once (kills lag).
    if (activeEventsWithLocation.length <= 70) return activeEventsWithLocation;
    return [...activeEventsWithLocation]
      .sort((a, b) => (b.event.impactScore ?? 0) - (a.event.impactScore ?? 0))
      .slice(0, 70);
  }, [isZoomedIn, activeCountry, activeEventsWithLocation]);

  const activeCluster = useMemo(
    () => activeClusters.find((c) => c.country === activeCountry) ?? null,
    [activeClusters, activeCountry],
  );

  // ── Region change — detect zoom level ────────────────────────────────────────
  const onRegionChangeComplete = useCallback(
    (region: Region) => {
      const zoomed = region.latitudeDelta < ZOOM_CLUSTER_THRESHOLD;
      setIsZoomedIn(zoomed);

      // If user zoomed out manually, close country sheet
      if (!zoomed && activeCountryRef.current) {
        closeSheet();
      }
    },
    [closeSheet],
  );

  // ── Interactions ──────────────────────────────────────────────────────────────
  const onClusterPress = useCallback(
    (cluster: Cluster) => {
      haptic('medium');
      setActiveCountry(cluster.country);
      activeCountryRef.current = cluster.country;

      // Zoom into the country
      if (cluster.items.length === 1) {
        mapRef.current?.animateToRegion(
          {
            latitude: cluster.items[0].lat,
            longitude: cluster.items[0].lng,
            latitudeDelta: 8,
            longitudeDelta: 8,
          },
          700,
        );
      } else {
        const lats = cluster.items.map((i) => i.lat);
        const lngs = cluster.items.map((i) => i.lng);
        const minLat = Math.min(...lats);
        const maxLat = Math.max(...lats);
        const minLng = Math.min(...lngs);
        const maxLng = Math.max(...lngs);

        mapRef.current?.animateToRegion(
          {
            latitude: (minLat + maxLat) / 2,
            longitude: (minLng + maxLng) / 2,
            latitudeDelta: Math.max((maxLat - minLat) * 1.8, 5),
            longitudeDelta: Math.max((maxLng - minLng) * 1.8, 5),
          },
          700,
        );
      }

      snapSheet(SHEET_HALF);
    },
    [snapSheet],
  );

  const zoomOut = useCallback(() => {
    haptic('light');
    closeSheet();
    mapRef.current?.animateCamera(INIT_CAM, { duration: 800 });
  }, [closeSheet]);

  // ── Fit map to a set of coordinates ─────────────────────────────────────────
  const fitToCoords = useCallback((coords: { latitude: number; longitude: number }[], pad = 1.6, minDelta = 4, duration = 700) => {
    if (coords.length === 0) return;
    const lats = coords.map(c => c.latitude);
    const lngs = coords.map(c => c.longitude);
    const minLat = Math.min(...lats), maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
    mapRef.current?.animateToRegion({
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: Math.max((maxLat - minLat) * pad, minDelta),
      longitudeDelta: Math.max((maxLng - minLng) * pad, minDelta),
    }, duration);
  }, []);

  // ── Select a battle: open it, reset to phase 1, zoom to its location ─────────
  const selectBattle = useCallback((battle: FamousBattle) => {
    haptic('medium');
    setSelectedBattle(battle);
    setBattlePhase(0);
    const phase0 = battle.phases[0];
    const coords = phase0?.positions?.length
      ? phase0.positions.map(p => ({ latitude: p.latitude, longitude: p.longitude }))
      : [{ latitude: battle.latitude, longitude: battle.longitude }];
    // include the battle center so the marker stays visible
    fitToCoords([...coords, { latitude: battle.latitude, longitude: battle.longitude }], 2.2, 1.5, 800);
  }, [fitToCoords]);

  // ── Move to a battle phase + fit map to that phase's positions ───────────────
  const goToPhase = useCallback((idx: number) => {
    const battle = selectedBattleRef.current;
    if (!battle) return;
    const clamped = Math.max(0, Math.min(battle.phases.length - 1, idx));
    haptic('selection');
    setBattlePhase(clamped);
    const ph = battle.phases[clamped];
    if (ph?.positions?.length) {
      fitToCoords(ph.positions.map(p => ({ latitude: p.latitude, longitude: p.longitude })), 2.4, 0.6, 600);
    }
  }, [fitToCoords]);

  // ── Select an ancient city: open card + zoom in ──────────────────────────────
  const selectCity = useCallback((city: AncientCity) => {
    haptic('medium');
    setSelectedCity(city);
    mapRef.current?.animateToRegion({
      latitude: city.latitude,
      longitude: city.longitude,
      latitudeDelta: 6,
      longitudeDelta: 6,
    }, 800);
  }, []);

  // ── Toggle a city from the top chips (empire-style): show its area + focus it ──
  const toggleCity = useCallback((city: AncientCity) => {
    haptic('selection');
    setSelectedCities(prev => {
      const next = new Set(prev);
      if (next.has(city.id)) {
        next.delete(city.id);
        setSelectedCity(cur => (cur?.id === city.id ? null : cur));
      } else {
        next.add(city.id);
        selectCity(city); // focus + zoom + open card
      }
      return next;
    });
  }, [selectCity]);

  // ── Select a war event: open card + zoom in ──────────────────────────────────
  const selectWarEvent = useCallback((e: any) => {
    haptic('medium');
    setSelectedWarEvent(e);
    mapRef.current?.animateToRegion({
      latitude: e.latitude,
      longitude: e.longitude,
      latitudeDelta: 14,
      longitudeDelta: 14,
    }, 800);
  }, []);

  const openPreview = useCallback((item: EventWithLocation) => {
    haptic('light');
    setPreviewItem(item);
  }, []);

  const closePreview = useCallback(() => {
    setPreviewItem(null);
  }, []);

  const openStory = useCallback((ev: any) => {
    haptic('light');
    setPreviewItem(null);
    setStoryEvent(ev);
    setStoryVisible(true);
  }, []);

  const closeStory = useCallback(() => {
    setStoryVisible(false);
    justClosedStory.current = true;
    setTimeout(() => {
      justClosedStory.current = false;
    }, 500);
  }, []);

  const onMapPress = useCallback(() => {
    if (storyVisibleRef.current || justClosedStory.current) return;
    if (previewItem) {
      setPreviewItem(null);
      return;
    }
  }, [previewItem]);

  const onMapReady = useCallback(() => {
    mapRef.current?.animateCamera(INIT_CAM, { duration: 1000 });
  }, []);

  // ── Colors ────────────────────────────────────────────────────────────────────
  const accent = isDark ? '#F59E0B' : '#2563EB';
  const cardBg = isDark ? '#1C1917' : '#FFFFFF';
  const borderCol = isDark ? '#292524' : '#E5E5E5';

  // ── Sheet content: show active country events, or all zoomed events ───────────
  const sheetCluster: Cluster | null = useMemo(() => {
    if (activeCluster) return activeCluster;
    if (isZoomedIn && !activeCountry && activeEventsWithLocation.length > 0) {
      // Build a virtual cluster from all visible events
      const byCat = new Map<string, EventWithLocation[]>();
      for (const item of activeEventsWithLocation) {
        const cat = getCat(item.event);
        if (!byCat.has(cat)) byCat.set(cat, []);
        byCat.get(cat)!.push(item);
      }
      const cats: CatGroup[] = Array.from(byCat.entries())
        .map(([key, evts]) => ({
          key,
          color: CAT[key]?.color ?? FALLBACK_COLOR,
          emoji: CAT[key]?.emoji ?? 'star',
          labelKey: CAT[key]?.tKey ?? key,
          events: evts.sort((a, b) => (b.event.impactScore ?? 0) - (a.event.impactScore ?? 0)),
        }))
        .sort((a, b) => b.events.length - a.events.length);
      return {
        country: 'Area',
        lat: 0,
        lng: 0,
        items: activeEventsWithLocation,
        cats,
        mainColor: cats[0]?.color ?? FALLBACK_COLOR,
        count: activeEventsWithLocation.length,
      };
    }
    return null;
  }, [activeCluster, isZoomedIn, activeCountry, eventsWithLocation]);

  const sheetOpen = (sheetY as any)._value > 0 || activeCountry !== null;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* ── Map ── */}
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        initialRegion={INIT_REGION}
        mapType="terrain"
        showsUserLocation
        showsCompass={false}
        showsScale={false}
        pitchEnabled
        rotateEnabled
        minZoomLevel={0}
        onMapReady={onMapReady}
        onPress={onMapPress}
        onRegionChangeComplete={onRegionChangeComplete}
      >
        {/* World view — one count-bubble per country (hidden when any overlay layer is active) */}
        {!isZoomedIn && (mapLayer === 'off' || mapLayer === 'time') &&
          activeClusters.map((cluster) => (
            <SmartMarker
              key={`cluster-${cluster.country}`}
              redraw={`${cluster.mainColor}-${cluster.count}`}
              coordinate={{ latitude: cluster.lat, longitude: cluster.lng }}
              title={cluster.country}
              description={`${cluster.count} event${cluster.count !== 1 ? 's' : ''}`}
              onPress={() => onClusterPress(cluster)}
              anchor={{ x: 0.5, y: 1 }}
            >
              {(() => {
                const n = cluster.count;
                const dia = n > 99 ? 50 : n > 9 ? 44 : 38;
                return <PinHead color={cluster.mainColor} size={dia} text={n > 99 ? '99+' : String(n)} />;
              })()}
            </SmartMarker>
          ))}

        {/* Zoomed view — individual category pins (hidden when any overlay layer is active) */}
        {isZoomedIn && (mapLayer === 'off' || mapLayer === 'time') &&
          visibleCityEvents.map((item, idx) => {
            const catKey = getCat(item.event);
            const color = CAT[catKey]?.color ?? FALLBACK_COLOR;
            const isPro = !!(item.event?.isPro || item.event?.is_pro);
            const c = isPro ? '#F59E0B' : color;
            return (
              <SmartMarker
                key={`city-${idx}-${item.lat}-${item.lng}`}
                redraw={c}
                coordinate={{ latitude: item.lat, longitude: item.lng }}
                title={isPro ? 'PRO — unlock to read' : undefined}
                onPress={() => openPreview(item)}
                anchor={{ x: 0.5, y: 1 }}
              >
                <PinHead color={c} size={34} iconKey={isPro ? 'crown' : (CAT[catKey]?.emoji ?? 'star')} />
              </SmartMarker>
            );
          })}
        {/* ── Empire Overlays ── */}
        {mapLayer === 'empires' && EMPIRE_BORDERS.filter(e => selectedEmpires.has(e.id)).map(empire => (
          <Polygon
            key={`empire-${empire.id}`}
            coordinates={empire.coordinates}
            strokeColor={empire.color}
            fillColor={empire.color + '28'}
            strokeWidth={2}
            tappable={false}
          />
        ))}

        {/* ── Heat Map ── */}
        {mapLayer === 'heatmap' && heatCells.map((cell, i) => (
          <Circle
            key={`heat-${i}`}
            center={{ latitude: cell.lat, longitude: cell.lng }}
            radius={80000 + cell.ratio * 380000}
            strokeColor="transparent"
            fillColor={`rgba(234,56,24,${(0.12 + cell.ratio * 0.52).toFixed(2)})`}
          />
        ))}

        {/* ── Explorer Routes ── */}
        {mapLayer === 'routes' && EXPLORER_ROUTES.filter(r => selectedRoutes.has(r.id)).map(route => (
          <React.Fragment key={`route-${route.id}`}>
            <Polyline
              coordinates={route.coordinates}
              strokeColor={route.color}
              strokeWidth={3}
              lineDashPattern={[8, 4]}
              geodesic
            />
            {route.keyStops.map((stop: any, idx: number) => (
              <SmartMarker
                key={`stop-${route.id}-${idx}`}
                redraw={route.color}
                coordinate={{ latitude: stop.latitude, longitude: stop.longitude }}
                anchor={{ x: 0.5, y: 0.5 }}
                title={stop.label}
                onPress={() => { haptic('light'); setSelectedKeyStop({ route, stop }); }}
              >
                <View style={[mkr.dot, { backgroundColor: route.color }]} />
              </SmartMarker>
            ))}
          </React.Fragment>
        ))}

        {/* ── Trade Routes ── */}
        {mapLayer === 'trade' && TRADE_ROUTES.filter(r => selectedTradeRoutes.has(r.id)).map(route => (
          <React.Fragment key={`trade-${route.id}`}>
            <Polyline
              coordinates={route.coordinates}
              strokeColor={route.color}
              strokeWidth={3}
              lineDashPattern={[10, 6]}
              geodesic
            />
            {route.keyStops.map((stop, idx) => (
              <SmartMarker
                key={`trade-stop-${route.id}-${idx}`}
                redraw={route.color}
                coordinate={{ latitude: stop.latitude, longitude: stop.longitude }}
                anchor={{ x: 0.5, y: 0.5 }}
                title={stop.label}
                onPress={() => { haptic('light'); setSelectedKeyStop({ route, stop }); }}
              >
                <View style={[mkr.dot, { backgroundColor: route.color }]} />
              </SmartMarker>
            ))}
          </React.Fragment>
        ))}

        {/* ── Ancient Cities — area "borders" for cities picked in the top chips ── */}
        {mapLayer === 'cities' && ANCIENT_CITIES.filter(c => selectedCities.has(c.id)).map(city => {
          const isFocused = selectedCity?.id === city.id;
          const r = city.status === 'modern_city' ? 130000 : city.status === 'ruins' ? 95000 : 80000;
          return (
            <Circle
              key={`city-zone-${city.id}`}
              center={{ latitude: city.latitude, longitude: city.longitude }}
              radius={isFocused ? r * 1.25 : r}
              strokeColor={city.color}
              fillColor={city.color + (isFocused ? '55' : '33')}
              strokeWidth={isFocused ? 3 : 2}
            />
          );
        })}

        {/* ── Ancient Cities — clean label-less pins (only for picked cities) ── */}
        {mapLayer === 'cities' && ANCIENT_CITIES.filter(c => selectedCities.has(c.id)).map(city => {
          const isFocused = selectedCity?.id === city.id;
          return (
            <SmartMarker
              key={`city-${city.id}`}
              redraw={`${city.color}-${isFocused}`}
              coordinate={{ latitude: city.latitude, longitude: city.longitude }}
              title={city.name}
              description={city.civilization}
              onPress={() => selectCity(city)}
              anchor={{ x: 0.5, y: 1 }}
              zIndex={isFocused ? 999 : 1}
            >
              <PinHead color={city.color} size={isFocused ? 42 : 36} emoji={city.emoji} selected={isFocused} />
            </SmartMarker>
          );
        })}

        {/* ── Famous Battles — conflict zone circles ── */}
        {mapLayer === 'battles' && FAMOUS_BATTLES.map(battle => (
          <Circle
            key={`battle-zone-${battle.id}`}
            center={{ latitude: battle.latitude, longitude: battle.longitude }}
            radius={selectedBattle?.id === battle.id ? 55000 : 35000}
            strokeColor={battle.color + (selectedBattle?.id === battle.id ? 'CC' : '60')}
            fillColor={battle.color + (selectedBattle?.id === battle.id ? '28' : '12')}
            strokeWidth={selectedBattle?.id === battle.id ? 2 : 1}
          />
        ))}

        {/* ── Famous Battles — emoji pins ── */}
        {mapLayer === 'battles' && FAMOUS_BATTLES.map(battle => {
          const isSel = selectedBattle?.id === battle.id;
          return (
            <SmartMarker
              key={`battle-${battle.id}`}
              redraw={`${battle.color}-${isSel}`}
              coordinate={{ latitude: battle.latitude, longitude: battle.longitude }}
              title={battle.name}
              description={battle.yearLabel}
              onPress={() => selectBattle(battle)}
              anchor={{ x: 0.5, y: 1 }}
              zIndex={isSel ? 999 : 1}
            >
              <PinHead color={battle.color} size={isSel ? 46 : 38} emoji={battle.emoji} selected={isSel} />
            </SmartMarker>
          );
        })}

        {/* Battle phase troop markers — labeled pins by side */}
        {mapLayer === 'battles' && selectedBattle && selectedBattle.phases[battlePhase]?.positions.map((pos, idx) => {
          const sideCol = pos.side === 'attacker' ? '#DC2626' : pos.side === 'defender' ? '#2563EB' : '#6B7280';
          return (
            <SmartMarker
              key={`troop-${selectedBattle.id}-${battlePhase}-${idx}`}
              redraw={`${sideCol}-${battlePhase}`}
              coordinate={{ latitude: pos.latitude, longitude: pos.longitude }}
              title={pos.label}
              description={pos.troops ?? pos.note}
              anchor={{ x: 0.5, y: 1 }}
            >
              <PinHead color={sideCol} size={30} iconKey={pos.side === 'attacker' ? 'sword' : 'shield'} label={pos.label.split(' ').slice(0, 3).join(' ')} />
            </SmartMarker>
          );
        })}

        {/* Religion Spread Circles */}
        {mapLayer === 'religion' && RELIGIONS.filter(r => selectedReligions.has(r.id)).map(religion =>
          religion.regions
            .filter(region => region.yearStart <= religionYear)
            .map(region => (
              <Circle
                key={`rel-${religion.id}-${region.id}`}
                center={{ latitude: region.latitude, longitude: region.longitude }}
                radius={region.radius}
                strokeColor={religion.color + '60'}
                fillColor={religion.color + Math.round(region.intensity * 40).toString(16).padStart(2, '0')}
                strokeWidth={1}
              />
            ))
        )}
        {mapLayer === 'religion' && RELIGIONS.filter(r => selectedReligions.has(r.id)).map(religion => (
          <SmartMarker
            key={`rel-origin-${religion.id}`}
            redraw={religion.color}
            coordinate={religion.origin}
            title={religion.name}
            anchor={{ x: 0.5, y: 1 }}
          >
            <PinHead color={religion.color} size={36} emoji={religion.emoji} label={religion.name} />
          </SmartMarker>
        ))}

        {/* ── WW1/WW2 — alliance territory highlights ── */}
        {(mapLayer === 'ww1' || mapLayer === 'ww2') && WAR_TERRITORIES.filter(t => t.war === mapLayer).map(t => {
          const col = sideColorOf(t.side);
          const selected = mapLayer === 'ww1' ? ww1Countries : ww2Countries;
          const tName = t.country.toLowerCase();
          const matches = selected.size === 0 ||
            Array.from(selected).some(k => tName.includes(WAR_COUNTRY_KEYWORD[k] ?? k));
          return (
            <Polygon
              key={`terr-${t.id}`}
              coordinates={t.coordinates}
              strokeColor={col + (matches ? 'FF' : '55')}
              fillColor={col + (matches ? '4D' : '14')}
              strokeWidth={matches ? 2.5 : 1}
              tappable={false}
            />
          );
        })}

        {/* ── WW1/WW2 — battle / event pins (red = Axis/Central, blue = Allied) ── */}
        {(mapLayer === 'ww1' ? visibleWW1Events : mapLayer === 'ww2' ? visibleWW2Events : []).map(e => {
          const col = sideColorOf(e.side);
          const isSel = selectedWarEvent?.id === e.id;
          const size = e.significance === 3 ? 40 : e.significance === 2 ? 34 : 28;
          return (
            <SmartMarker
              key={`war-${e.id}`}
              redraw={`${col}-${isSel}`}
              coordinate={{ latitude: e.latitude, longitude: e.longitude }}
              title={e.title}
              description={`${e.year} · ${String(e.type).replace('_', ' ')}`}
              onPress={() => selectWarEvent(e)}
              anchor={{ x: 0.5, y: 1 }}
              zIndex={isSel ? 999 : e.significance}
            >
              <PinHead color={col} size={isSel ? size + 6 : size} selected={isSel} iconKey={WAR_TYPE_ICON[e.type] ?? 'sword'} />
            </SmartMarker>
          );
        })}
      </MapView>

      {/* ── Top status pill ── */}
      <View
        style={[styles.topBar, { paddingTop: insets.top + 8 }]}
        pointerEvents="box-none"
      >
        <View style={[styles.topPill, { backgroundColor: cardBg, borderColor: borderCol }]}>
          {loading ? (
            <>
              <ActivityIndicator size="small" color={accent} />
              <Text style={[styles.topText, { color: accent }]}>{tm('loading')}</Text>
            </>
          ) : activeCountry ? (
            <>
              <View style={[styles.topDot, { backgroundColor: activeCluster?.mainColor ?? accent }]} />
              <Text style={[styles.topTextBold, { color: theme.text }]}>{activeCountry}</Text>
              <Text style={[styles.topText, { color: theme.subtext }]}>
                · {activeCluster?.count ?? 0} {tm('events')}
              </Text>
            </>
          ) : isZoomedIn ? (
            <>
              <MapPin size={14} color={accent} strokeWidth={2} />
              <Text style={[styles.topTextBold, { color: theme.text }]}>{visibleCityEvents.length}</Text>
              <Text style={[styles.topText, { color: theme.subtext }]}>{tm('events')}</Text>
            </>
          ) : (
            <>
              <Globe2 size={16} color={accent} strokeWidth={2} />
              <Text style={[styles.topTextBold, { color: theme.text }]}>{total}</Text>
              <Text style={[styles.topText, { color: theme.subtext }]}>
                {tm('events_across')} {clusters.length} {tm('countries')}
              </Text>
            </>
          )}
        </View>
      </View>

      {/* ── Back to world button ── */}
      {(activeCountry || isZoomedIn) && (
        <TouchableOpacity
          onPress={zoomOut}
          activeOpacity={0.8}
          style={[
            styles.backBtn,
            { top: insets.top + 60, backgroundColor: cardBg, borderColor: borderCol },
          ]}
        >
          <Globe2 size={14} color={accent} strokeWidth={2.5} />
          <Text style={[styles.backText, { color: accent }]}>{tm('back_to_world')}</Text>
        </TouchableOpacity>
      )}

      {/* ── Single Layers button ── */}
      <TouchableOpacity
        onPress={() => { haptic('medium'); setLayersOpen(v => !v); }}
        activeOpacity={0.8}
        style={[styles.layerBtn, styles.layerBtnSingle, {
          top: insets.top + (activeCountry || isZoomedIn ? 110 : 62),
          backgroundColor: (mapLayer !== 'off' || layersOpen) ? accent : cardBg,
          borderColor: (mapLayer !== 'off' || layersOpen) ? accent : borderCol,
        }]}
      >
        <Layers size={17} color={(mapLayer !== 'off' || layersOpen) ? '#FFF' : theme.subtext} strokeWidth={2} />
      </TouchableOpacity>

      {/* ── Layers selection panel ── */}
      {layersOpen && (
        <View style={[styles.layersPanel, {
          top: insets.top + (activeCountry || isZoomedIn ? 162 : 114),
          backgroundColor: cardBg, borderColor: borderCol,
          maxHeight: H * 0.55,
        }]}>
          <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
            {([
              { id: 'time'     as const, Icon: Clock,       label: tm('time_filter'), desc: 'Explore events through time',            badge: 'pro'   as const },
              { id: 'heatmap'  as const, Icon: Thermometer, label: tm('heat_map'),    desc: 'Density of historical events',           badge: 'free'  as const },
              { id: 'empires'  as const, Icon: Castle,      label: tm('empires'),     desc: `${EMPIRE_BORDERS.length} great empires at peak`,     badge: 'pro'   as const },
              { id: 'routes'   as const, Icon: Navigation,  label: tm('routes'),      desc: `${EXPLORER_ROUTES.length} legendary voyages`,         badge: 'video' as const },
              { id: 'battles'  as const, Icon: Swords,      label: tm('battles'),     desc: `${FAMOUS_BATTLES.length} famous battles with phases`, badge: 'pro'   as const },
              { id: 'cities'   as const, Icon: CircleIcon,  label: tm('cities'),      desc: `${ANCIENT_CITIES.length} great ancient cities`,       badge: 'video' as const },
              { id: 'trade'    as const, Icon: Navigation,  label: tm('trade'),       desc: `${TRADE_ROUTES.length} historical trade routes`,      badge: 'video' as const },
              { id: 'religion' as const, Icon: Globe2,      label: tm('religion'),    desc: '4 world religions spreading through time', badge: 'pro'   as const },
              { id: 'ww1'      as const, Icon: Swords,      label: 'WW1 1914–1918',   desc: `${WW1_EVENTS.length} battles & key events`,           badge: 'video' as const },
              { id: 'ww2'      as const, Icon: Swords,      label: 'WW2 1939–1945',   desc: `${WW2_EVENTS.length} battles & key events`,           badge: 'pro'   as const },
            ]).map(({ id, Icon, label, desc, badge }) => {
              const active = mapLayer === id;
              const lockedPro = !isPro && badge === 'pro';
              const lockedVideo = !isPro && badge === 'video' && (
                (id === 'routes'  && !routesUnlocked) ||
                (id === 'trade'   && !tradeUnlocked)  ||
                (id === 'cities'  && !citiesUnlocked)  ||
                (id === 'ww1'     && !ww1Unlocked)
              );
              return (
                <TouchableOpacity key={id} onPress={() => toggleLayer(id)} activeOpacity={0.75}
                  style={[styles.layersPanelRow, active && { backgroundColor: accent + '12' }]}>
                  <View style={[styles.layersPanelIcon, { backgroundColor: active ? accent + '22' : (isDark ? '#292524' : '#F5F5F5') }]}>
                    <Icon size={14} color={active ? accent : theme.subtext} strokeWidth={2} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.layersPanelLabel, { color: active ? accent : theme.text }]}>{label}</Text>
                    <Text style={[styles.layersPanelDesc, { color: theme.subtext }]}>{desc}</Text>
                  </View>
                  {active ? (
                    <View style={[styles.layersPanelDot, { backgroundColor: accent }]} />
                  ) : badge === 'free' ? (
                    <View style={[styles.layersPanelBadge, { backgroundColor: '#05966920' }]}>
                      <Text style={[styles.layersPanelBadgeText, { color: '#059669' }]}>FREE</Text>
                    </View>
                  ) : lockedVideo ? (
                    <View style={[styles.layersPanelBadge, { backgroundColor: '#D9770620' }]}>
                      <Text style={[styles.layersPanelBadgeText, { color: '#D97706' }]}>▶ VIDEO</Text>
                    </View>
                  ) : lockedPro ? (
                    <Crown size={13} color="#D97706" strokeWidth={2.5} />
                  ) : null}
                </TouchableOpacity>
              );
            })}
            {mapLayer !== 'off' && (
              <>
                <View style={[styles.layersPanelSep, { backgroundColor: borderCol }]} />
                <TouchableOpacity onPress={() => { haptic('light'); setMapLayer('off'); setLayersOpen(false); setSelectedKeyStop(null); setSelectedBattle(null); setSelectedCity(null); setSelectedWarEvent(null); }}
                  activeOpacity={0.75} style={styles.layersPanelRow}>
                  <View style={[styles.layersPanelIcon, { backgroundColor: isDark ? '#292524' : '#F5F5F5' }]}>
                    <X size={14} color={theme.subtext} strokeWidth={2} />
                  </View>
                  <Text style={[styles.layersPanelLabel, { color: theme.subtext }]}>Clear layer</Text>
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </View>
      )}

      {/* ── Backdrop tap to close layers panel ── */}
      {layersOpen && (
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={0} onPress={() => setLayersOpen(false)} />
      )}

      {/* ── Empire / Route / Trade / Religion / Battle / War / City chips ── */}
      {(mapLayer === 'empires' || mapLayer === 'routes' || mapLayer === 'trade' || mapLayer === 'religion' || mapLayer === 'battles' || mapLayer === 'ww1' || mapLayer === 'ww2' || mapLayer === 'cities') && (
        <View style={[styles.chipsRow, { top: insets.top + (activeCountry || isZoomedIn ? 110 : 52) }]} pointerEvents="box-none">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsContent}>
            {mapLayer === 'empires' ? EMPIRE_BORDERS.map(empire => {
              const on = selectedEmpires.has(empire.id);
              return (
                <TouchableOpacity key={empire.id} onPress={() => toggleEmpire(empire.id)}
                  style={[styles.chip, { backgroundColor: on ? empire.color + '22' : cardBg, borderColor: on ? empire.color : borderCol }]}>
                  <View style={[styles.chipDot, { backgroundColor: empire.color }]} />
                  <Text style={[styles.chipLabel, { color: on ? empire.color : theme.subtext }]} numberOfLines={1}>{empire.name}</Text>
                </TouchableOpacity>
              );
            }) : mapLayer === 'cities' ? ANCIENT_CITIES.map(city => {
              const on = selectedCities.has(city.id);
              return (
                <TouchableOpacity key={city.id} onPress={() => toggleCity(city)}
                  style={[styles.chip, { backgroundColor: on ? city.color + '22' : cardBg, borderColor: on ? city.color : borderCol }]}>
                  <Text style={styles.chipEmoji}>{city.emoji}</Text>
                  <Text style={[styles.chipLabel, { color: on ? city.color : theme.subtext }]} numberOfLines={1}>{city.name}</Text>
                </TouchableOpacity>
              );
            }) : mapLayer === 'routes' ? EXPLORER_ROUTES.map(route => {
              const on = selectedRoutes.has(route.id);
              return (
                <TouchableOpacity key={route.id} onPress={() => toggleRoute(route.id)}
                  style={[styles.chip, { backgroundColor: on ? route.color + '22' : cardBg, borderColor: on ? route.color : borderCol }]}>
                  <Text style={styles.chipEmoji}>{route.emoji}</Text>
                  <Text style={[styles.chipLabel, { color: on ? route.color : theme.subtext }]} numberOfLines={1}>
                    {route.explorer.split('&')[0].split('–')[0].trim()}
                  </Text>
                </TouchableOpacity>
              );
            }) : mapLayer === 'trade' ? TRADE_ROUTES.map(route => {
              const on = selectedTradeRoutes.has(route.id);
              return (
                <TouchableOpacity key={route.id} onPress={() => toggleTradeRoute(route.id)}
                  style={[styles.chip, { backgroundColor: on ? route.color + '22' : cardBg, borderColor: on ? route.color : borderCol }]}>
                  <Text style={styles.chipEmoji}>{route.emoji}</Text>
                  <Text style={[styles.chipLabel, { color: on ? route.color : theme.subtext }]} numberOfLines={1}>{route.name.split(' ').slice(0, 2).join(' ')}</Text>
                </TouchableOpacity>
              );
            }) : mapLayer === 'religion' ? RELIGIONS.map(rel => {
              const on = selectedReligions.has(rel.id);
              return (
                <TouchableOpacity key={rel.id} onPress={() => toggleReligion(rel.id)}
                  style={[styles.chip, { backgroundColor: on ? rel.color + '22' : cardBg, borderColor: on ? rel.color : borderCol }]}>
                  <Text style={styles.chipEmoji}>{rel.emoji}</Text>
                  <Text style={[styles.chipLabel, { color: on ? rel.color : theme.subtext }]} numberOfLines={1}>{rel.name}</Text>
                </TouchableOpacity>
              );
            }) : mapLayer === 'ww1' ? (
              (['germany', 'uk', 'france', 'usa', 'russia', 'ottoman', 'austria'] as const).map(country => {
                const on = ww1Countries.has(country);
                const isAxis = ['germany', 'austria', 'ottoman'].includes(country);
                const col = isAxis ? '#DC2626' : '#2563EB';
                return (
                  <TouchableOpacity key={country} onPress={() => toggleWw1Country(country)}
                    style={[styles.chip, { backgroundColor: on ? col + '22' : cardBg, borderColor: on ? col : borderCol }]}>
                    <View style={[styles.chipDot, { backgroundColor: col }]} />
                    <Text style={[styles.chipLabel, { color: on ? col : theme.subtext }]}>{country.charAt(0).toUpperCase() + country.slice(1)}</Text>
                  </TouchableOpacity>
                );
              })
            ) : mapLayer === 'ww2' ? (
              (['germany', 'japan', 'usa', 'uk', 'france', 'ussr', 'italy'] as const).map(country => {
                const on = ww2Countries.has(country);
                const isAxis = ['germany', 'japan', 'italy'].includes(country);
                const col = isAxis ? '#DC2626' : '#2563EB';
                return (
                  <TouchableOpacity key={country} onPress={() => toggleWw2Country(country)}
                    style={[styles.chip, { backgroundColor: on ? col + '22' : cardBg, borderColor: on ? col : borderCol }]}>
                    <View style={[styles.chipDot, { backgroundColor: col }]} />
                    <Text style={[styles.chipLabel, { color: on ? col : theme.subtext }]}>{country.toUpperCase()}</Text>
                  </TouchableOpacity>
                );
              })
            ) : FAMOUS_BATTLES.map(battle => {
              const on = selectedBattle?.id === battle.id;
              return (
                <TouchableOpacity key={battle.id} onPress={() => on ? setSelectedBattle(null) : selectBattle(battle)}
                  style={[styles.chip, { backgroundColor: on ? battle.color + '22' : cardBg, borderColor: on ? battle.color : borderCol }]}>
                  <Text style={styles.chipEmoji}>{battle.emoji}</Text>
                  <Text style={[styles.chipLabel, { color: on ? battle.color : theme.subtext }]} numberOfLines={1}>{battle.name.replace('Battle of ', '')}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* ── Time Slider ── */}
      {mapLayer === 'time' && (
        <View style={[styles.sliderCard, { bottom: insets.bottom + 12, backgroundColor: cardBg, borderColor: borderCol }]}>
          <View style={styles.sliderHeader}>
            <Text style={[styles.sliderYearLabel, { color: accent }]}>
              {filteredYear < 0 ? `${Math.abs(filteredYear)} BC` : `${filteredYear} AD`}
            </Text>
            <TouchableOpacity onPress={() => setSliderRatio(1)}>
              <Text style={[styles.sliderAllTime, { color: theme.subtext }]}>{tm('all_time')}</Text>
            </TouchableOpacity>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}
            contentContainerStyle={{ paddingHorizontal: 2, gap: 6, flexDirection: 'row' }}>
            {ERA_PRESETS.map(p => {
              const pRatio = Math.max(0, Math.min(1, (p.year - minYear) / Math.max(1, maxYear - minYear)));
              const isActive = Math.abs(filteredYear - p.year) < 60;
              return (
                <TouchableOpacity key={p.label}
                  onPress={() => { haptic('selection'); setSliderRatio(pRatio); }}
                  style={[styles.eraPreset, { borderColor: isActive ? accent : borderCol, backgroundColor: isActive ? accent + '14' : 'transparent' }]}>
                  <Text style={[styles.eraPresetText, { color: isActive ? accent : theme.subtext }]}>{p.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={styles.sliderTrackWrap}
            onLayout={e => { sliderBarWidthRef.current = e.nativeEvent.layout.width; }}
            {...sliderPan.panHandlers}>
            <View style={[styles.sliderTrack, { backgroundColor: borderCol }]}>
              <View style={[styles.sliderFill, { width: `${sliderRatio * 100}%` as any, backgroundColor: accent }]} />
            </View>
            <View style={[styles.sliderThumb, { left: `${sliderRatio * 100}%` as any, backgroundColor: accent, borderColor: cardBg }]} />
          </View>
        </View>
      )}

      {/* ── Route key stop info card ── */}
      {selectedKeyStop && (
        <View style={[styles.keyStopCard, { bottom: insets.bottom + 16, backgroundColor: cardBg, borderColor: borderCol }]}>
          <TouchableOpacity onPress={() => setSelectedKeyStop(null)} style={styles.keyStopClose}>
            <X size={14} color={theme.subtext} strokeWidth={2} />
          </TouchableOpacity>
          <View style={[styles.keyStopDot, { backgroundColor: selectedKeyStop.route.color }]} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.keyStopTitle, { color: theme.text }]}>{selectedKeyStop.stop.label}</Text>
            <Text style={[styles.keyStopNote, { color: theme.subtext }]} numberOfLines={3}>{selectedKeyStop.stop.note}</Text>
            <Text style={[styles.keyStopRouteName, { color: selectedKeyStop.route.color }]}>{selectedKeyStop.route.name}</Text>
          </View>
        </View>
      )}

      {/* ── Religion Year Slider ── */}
      {mapLayer === 'religion' && (
        <View style={[styles.sliderCard, { bottom: insets.bottom + 12, backgroundColor: cardBg, borderColor: borderCol }]}>
          <View style={styles.sliderHeader}>
            <Text style={[styles.sliderYearLabel, { color: accent }]}>
              {religionYear < 0 ? `${Math.abs(religionYear)} BC` : `${religionYear} AD`}
            </Text>
            <TouchableOpacity onPress={() => setReligionYear(2000)}>
              <Text style={[styles.sliderAllTime, { color: theme.subtext }]}>{tm('all_time')}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.sliderTrackWrap}
            onLayout={e => { religionSliderWidthRef.current = e.nativeEvent.layout.width; }}
            {...religionSliderPan.panHandlers}>
            <View style={[styles.sliderTrack, { backgroundColor: borderCol }]}>
              <View style={[styles.sliderFill, {
                width: `${((religionYear - RELIGION_YEAR_MIN) / (RELIGION_YEAR_MAX - RELIGION_YEAR_MIN)) * 100}%` as any,
                backgroundColor: accent,
              }]} />
            </View>
            <View style={[styles.sliderThumb, {
              left: `${((religionYear - RELIGION_YEAR_MIN) / (RELIGION_YEAR_MAX - RELIGION_YEAR_MIN)) * 100}%` as any,
              backgroundColor: accent, borderColor: cardBg,
            }]} />
          </View>
        </View>
      )}

      {/* ── WW1 Year Slider ── */}
      {mapLayer === 'ww1' && !selectedWarEvent && (
        <View style={[styles.sliderCard, { bottom: insets.bottom + 12, backgroundColor: cardBg, borderColor: borderCol }]}>
          <View style={styles.sliderHeader}>
            <Text style={[styles.sliderYearLabel, { color: '#DC2626' }]}>{ww1Year}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={[mls.warLegend, { backgroundColor: '#DC262620' }]}>
                <View style={[mls.warLegendDot, { backgroundColor: '#DC2626' }]} />
                <Text style={[mls.warLegendText, { color: '#DC2626' }]}>Central</Text>
              </View>
              <View style={[mls.warLegend, { backgroundColor: '#2563EB20' }]}>
                <View style={[mls.warLegendDot, { backgroundColor: '#2563EB' }]} />
                <Text style={[mls.warLegendText, { color: '#2563EB' }]}>Allied</Text>
              </View>
            </View>
          </View>
          <View style={styles.sliderTrackWrap}
            onLayout={e => { ww1SliderWidthRef.current = e.nativeEvent.layout.width; }}
            {...ww1SliderPan.panHandlers}>
            <View style={[styles.sliderTrack, { backgroundColor: borderCol }]}>
              <View style={[styles.sliderFill, {
                width: `${((ww1Year - WW1_YEAR_MIN) / (WW1_YEAR_MAX - WW1_YEAR_MIN)) * 100}%` as any,
                backgroundColor: '#DC2626',
              }]} />
            </View>
            <View style={[styles.sliderThumb, {
              left: `${((ww1Year - WW1_YEAR_MIN) / (WW1_YEAR_MAX - WW1_YEAR_MIN)) * 100}%` as any,
              backgroundColor: '#DC2626', borderColor: cardBg,
            }]} />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
            <Text style={[styles.sliderAllTime, { color: theme.subtext }]}>1914</Text>
            <Text style={[styles.sliderAllTime, { color: theme.subtext }]}>1918</Text>
          </View>
        </View>
      )}

      {/* ── WW2 Year Slider ── */}
      {mapLayer === 'ww2' && !selectedWarEvent && (
        <View style={[styles.sliderCard, { bottom: insets.bottom + 12, backgroundColor: cardBg, borderColor: borderCol }]}>
          <View style={styles.sliderHeader}>
            <Text style={[styles.sliderYearLabel, { color: '#DC2626' }]}>{ww2Year}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={[mls.warLegend, { backgroundColor: '#DC262620' }]}>
                <View style={[mls.warLegendDot, { backgroundColor: '#DC2626' }]} />
                <Text style={[mls.warLegendText, { color: '#DC2626' }]}>Axis</Text>
              </View>
              <View style={[mls.warLegend, { backgroundColor: '#2563EB20' }]}>
                <View style={[mls.warLegendDot, { backgroundColor: '#2563EB' }]} />
                <Text style={[mls.warLegendText, { color: '#2563EB' }]}>Allied</Text>
              </View>
            </View>
          </View>
          <View style={styles.sliderTrackWrap}
            onLayout={e => { ww2SliderWidthRef.current = e.nativeEvent.layout.width; }}
            {...ww2SliderPan.panHandlers}>
            <View style={[styles.sliderTrack, { backgroundColor: borderCol }]}>
              <View style={[styles.sliderFill, {
                width: `${((ww2Year - WW2_YEAR_MIN) / (WW2_YEAR_MAX - WW2_YEAR_MIN)) * 100}%` as any,
                backgroundColor: '#DC2626',
              }]} />
            </View>
            <View style={[styles.sliderThumb, {
              left: `${((ww2Year - WW2_YEAR_MIN) / (WW2_YEAR_MAX - WW2_YEAR_MIN)) * 100}%` as any,
              backgroundColor: '#DC2626', borderColor: cardBg,
            }]} />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
            <Text style={[styles.sliderAllTime, { color: theme.subtext }]}>1939</Text>
            <Text style={[styles.sliderAllTime, { color: theme.subtext }]}>1945</Text>
          </View>
        </View>
      )}

      {/* ── War Event Detail Card ── */}
      {(mapLayer === 'ww1' || mapLayer === 'ww2') && selectedWarEvent && (
        <View style={[styles.warEventCard, { bottom: insets.bottom + 12, backgroundColor: cardBg, borderColor: warEventSideColor + '60' }]}>
          <TouchableOpacity onPress={() => setSelectedWarEvent(null)} style={styles.keyStopClose}>
            <X size={14} color={theme.subtext} strokeWidth={2} />
          </TouchableOpacity>
          <View style={styles.warEventHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <View style={[styles.warSideBadge, { backgroundColor: warEventSideColor + '20' }]}>
                <View style={[mls.warLegendDot, { backgroundColor: warEventSideColor }]} />
                <Text style={[styles.warSideText, { color: warEventSideColor }]}>{selectedWarEvent.side?.toUpperCase()}</Text>
              </View>
              <Text style={[styles.warEventType, { color: theme.subtext }]}>{selectedWarEvent.type?.replace('_', ' ')}</Text>
              <Text style={[styles.warEventYear, { color: warEventSideColor }]}>{selectedWarEvent.year}</Text>
              {'significance' in selectedWarEvent && (
                <View style={{ flexDirection: 'row', gap: 2 }}>
                  {[1, 2, 3].map(s => (
                    <View key={s} style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: s <= selectedWarEvent.significance ? warEventSideColor : borderCol }} />
                  ))}
                </View>
              )}
            </View>
            <Text style={[styles.warEventTitle, { color: theme.text }]}>{selectedWarEvent.title}</Text>
          </View>
          <Text style={[styles.warEventDesc, { color: theme.subtext }]} numberOfLines={4}>{selectedWarEvent.description}</Text>
          {selectedWarEvent.casualties && (
            <View style={[styles.warCasRow, { backgroundColor: '#DC262610', borderColor: '#DC262625' }]}>
              <Text style={styles.warCasIcon}>⚔️</Text>
              <Text style={[styles.warCasText, { color: theme.text }]}>{selectedWarEvent.casualties}</Text>
            </View>
          )}
        </View>
      )}

      {/* ── Battle Phase Card ── */}
      {mapLayer === 'battles' && selectedBattle && (
        <View style={[styles.battleCard, { bottom: insets.bottom + 12, backgroundColor: cardBg, borderColor: selectedBattle.color + '50' }]}>
          <TouchableOpacity onPress={() => setSelectedBattle(null)} style={styles.keyStopClose}>
            <X size={14} color={theme.subtext} strokeWidth={2} />
          </TouchableOpacity>
          <View style={styles.battleHeader}>
            <Text style={styles.battleEmoji}>{selectedBattle.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.battleName, { color: theme.text }]}>{selectedBattle.name}</Text>
              <Text style={[styles.battleYear, { color: selectedBattle.color }]}>{selectedBattle.yearLabel} · {selectedBattle.outcome}</Text>
            </View>
          </View>
          {/* Phase navigation — prev / next arrows */}
          <View style={styles.phaseNav}>
            <TouchableOpacity
              onPress={() => goToPhase(battlePhase - 1)}
              disabled={battlePhase === 0}
              style={[styles.phaseArrow, {
                backgroundColor: battlePhase === 0 ? (isDark ? '#1C1917' : '#F5F5F5') : selectedBattle.color + '18',
                borderColor: battlePhase === 0 ? borderCol : selectedBattle.color + '40',
                opacity: battlePhase === 0 ? 0.4 : 1,
              }]}>
              <ChevronLeft size={20} color={battlePhase === 0 ? theme.subtext : selectedBattle.color} strokeWidth={2.5} />
            </TouchableOpacity>

            <View style={styles.phaseNavCenter}>
              <Text style={[styles.phaseNum, { color: selectedBattle.color }]}>
                {tm('phase')} {battlePhase + 1} / {selectedBattle.phases.length}
              </Text>
              <Text style={[styles.phaseTitle, { color: theme.text, textAlign: 'center' }]} numberOfLines={1}>
                {selectedBattle.phases[battlePhase]?.title}
              </Text>
              {/* progress dots */}
              {selectedBattle.phases.length > 1 && (
                <View style={styles.phaseDots}>
                  {selectedBattle.phases.map((_, idx) => (
                    <TouchableOpacity key={idx} onPress={() => goToPhase(idx)} hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}>
                      <View style={{
                        width: idx === battlePhase ? 18 : 7, height: 7, borderRadius: 3.5,
                        backgroundColor: idx === battlePhase ? selectedBattle.color : borderCol,
                      }} />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            <TouchableOpacity
              onPress={() => goToPhase(battlePhase + 1)}
              disabled={battlePhase === selectedBattle.phases.length - 1}
              style={[styles.phaseArrow, {
                backgroundColor: battlePhase === selectedBattle.phases.length - 1 ? (isDark ? '#1C1917' : '#F5F5F5') : selectedBattle.color + '18',
                borderColor: battlePhase === selectedBattle.phases.length - 1 ? borderCol : selectedBattle.color + '40',
                opacity: battlePhase === selectedBattle.phases.length - 1 ? 0.4 : 1,
              }]}>
              <ChevronRight size={20} color={battlePhase === selectedBattle.phases.length - 1 ? theme.subtext : selectedBattle.color} strokeWidth={2.5} />
            </TouchableOpacity>
          </View>
          {selectedBattle.phases[battlePhase] && (
            <View style={[styles.phaseBody, { borderTopColor: borderCol }]}>
              {selectedBattle.phases[battlePhase].year && (
                <Text style={[styles.phaseTime, { color: selectedBattle.color }]}>
                  {selectedBattle.phases[battlePhase].year}
                </Text>
              )}
              <Text style={[styles.phaseDesc, { color: theme.text }]}>
                {selectedBattle.phases[battlePhase].description}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* ── Ancient City Info Card ── */}
      {mapLayer === 'cities' && selectedCity && (
        <View style={[styles.cityCard, { bottom: insets.bottom + 16, backgroundColor: cardBg, borderColor: selectedCity.color + '60' }]}>
          <TouchableOpacity onPress={() => { haptic('light'); setSelectedCity(null); }} style={styles.keyStopClose}>
            <X size={14} color={theme.subtext} strokeWidth={2} />
          </TouchableOpacity>

          {/* Hero row */}
          <View style={styles.cityCardHero}>
            <View style={[styles.cityCardEmojiWrap, { backgroundColor: selectedCity.color + '18', borderColor: selectedCity.color + '40' }]}>
              <Text style={styles.cityCardEmoji}>{selectedCity.emoji}</Text>
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={[styles.cityCardName, { color: theme.text }]}>{selectedCity.name}</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                <View style={[styles.cityStatusBadge, { backgroundColor: selectedCity.color + '20' }]}>
                  <Text style={[styles.cityStatusText, { color: selectedCity.color }]}>
                    {selectedCity.status === 'modern_city' ? '🏙 Active' : selectedCity.status === 'ruins' ? '🏚 Ruins' : selectedCity.status === 'lost' ? '❓ Lost' : '🌊 Submerged'}
                  </Text>
                </View>
                <View style={[styles.cityStatusBadge, { backgroundColor: isDark ? '#292524' : '#F5F5F4' }]}>
                  <Text style={[styles.cityStatusText, { color: theme.subtext }]}>👥 {selectedCity.peakPopulation}</Text>
                </View>
              </View>
              <Text style={[styles.cityCardCiv, { color: selectedCity.color }]}>
                {selectedCity.civilization} · {selectedCity.period}
              </Text>
            </View>
          </View>

          <Text style={[styles.cityCardDesc, { color: theme.subtext }]} numberOfLines={3}>{selectedCity.description}</Text>

          <View style={[styles.cityCardFactRow, { backgroundColor: selectedCity.color + '10', borderColor: selectedCity.color + '25' }]}>
            <Text style={[styles.cityCardFactLabel, { color: selectedCity.color }]}>💡</Text>
            <Text style={[styles.cityCardFact, { color: theme.text }]} numberOfLines={2}>{selectedCity.funFact}</Text>
          </View>
        </View>
      )}

      {/* ── Backdrop ── */}
      <Animated.View
        style={[styles.backdrop, { opacity: backdropOp }]}
        pointerEvents="none"
      />

      {/* ── Bottom sheet ── */}
      <Animated.View
        style={[
          styles.sheet,
          {
            height: sheetY,
            backgroundColor: isDark ? '#0F0E0D' : '#FAFAFA',
            borderColor: borderCol,
          },
        ]}
      >
        <View style={styles.sheetHandle} {...pan.panHandlers}>
          <View style={[styles.sheetBar, { backgroundColor: isDark ? '#404040' : '#D4D4D4' }]} />
          {sheetCluster && (
            <View style={styles.sheetHeader}>
              <View style={styles.sheetHeaderLeft}>
                <View style={[styles.sheetDot, { backgroundColor: sheetCluster.mainColor }]} />
                <View>
                  <Text style={[styles.sheetTitle, { color: theme.text }]}>
                    {sheetCluster.country}
                  </Text>
                  <Text style={[styles.sheetSub, { color: theme.subtext }]}>
                    {sheetCluster.count} {tm('events')} · {sheetCluster.cats.length}{' '}
                    {tm('categories')}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={closeSheet}
                style={[styles.sheetClose, { backgroundColor: isDark ? '#292524' : '#F5F5F5' }]}
              >
                <X size={16} color={theme.subtext} strokeWidth={2} />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {sheetCluster ? (
          <ScrollView
            contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
            showsVerticalScrollIndicator={false}
          >
            {sheetCluster.cats.map((cat, i) => (
              <React.Fragment key={cat.key}>
                <CategorySection
                  cat={cat}
                  language={language}
                  theme={theme}
                  isDark={isDark}
                  tm={tm}
                  onEventPress={openPreview}
                />
                {i < sheetCluster.cats.length - 1 && (
                  <View
                    style={[
                      styles.catDivider,
                      { backgroundColor: isDark ? '#292524' : '#E5E5E5' },
                    ]}
                  />
                )}
              </React.Fragment>
            ))}
          </ScrollView>
        ) : (
          <View style={styles.sheetEmpty}>
            <MapPin size={32} color={theme.subtext + '30'} strokeWidth={1.5} />
            <Text style={[styles.sheetEmptyText, { color: theme.subtext }]}>
              {tm('tap_to_explore')}
            </Text>
          </View>
        )}
      </Animated.View>

      {/* ── Loading overlay ── */}
      {loading && (
        <View
          style={[
            styles.loadingOverlay,
            {
              backgroundColor: isDark ? 'rgba(15,14,13,0.9)' : 'rgba(255,255,255,0.9)',
            },
          ]}
        >
          <View style={[styles.loadingCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
            <Globe2 size={36} color={accent} strokeWidth={1.5} />
            <ActivityIndicator size="large" color={accent} style={{ marginTop: 16 }} />
            <Text style={[styles.loadingText, { color: accent }]}>{tm('loading')}</Text>
          </View>
        </View>
      )}

      {/* ── Preview card ── */}
      {previewItem && (
        <PreviewCard
          item={previewItem}
          language={language}
          theme={theme}
          isDark={isDark}
          tm={tm}
          onClose={closePreview}
          onReadMore={() => openStory(previewItem.event)}
        />
      )}

      {/* ── Story modal ── */}
      <StoryModal
        visible={storyVisible}
        event={storyEvent}
        onClose={closeStory}
        theme={theme}
      />
    </View>
  );
}

// ─── Custom marker graphics (rendered via SmartMarker) ──────────────────────────
const mkr = StyleSheet.create({
  wrap: { alignItems: 'center' },
  head: {
    alignItems: 'center', justifyContent: 'center', borderColor: '#FFFFFF',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
      android: { elevation: 7 },
    }),
  },
  tail: {
    width: 0, height: 0, marginTop: -2,
    borderLeftWidth: 6, borderRightWidth: 6, borderTopWidth: 9,
    borderLeftColor: 'transparent', borderRightColor: 'transparent',
  },
  label: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 9, borderWidth: 1.5,
    backgroundColor: '#FFFFFF', marginBottom: 3, maxWidth: 160,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 3, shadowOffset: { width: 0, height: 1 } },
      android: { elevation: 4 },
    }),
  },
  labelText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.2 },
  countBadge: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    minWidth: 38, height: 34, paddingHorizontal: 11, borderRadius: 17,
    borderWidth: 2.5, borderColor: '#FFFFFF',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
      android: { elevation: 7 },
    }),
  },
  countText: { fontSize: 13, fontWeight: '900', color: '#FFFFFF' },
  clusterCircle: {
    alignItems: 'center', justifyContent: 'center', borderWidth: 2.5, borderColor: '#FFFFFF',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
      android: { elevation: 7 },
    }),
  },
  clusterNum: { fontWeight: '900', color: '#FFFFFF' },
  dot: {
    width: 16, height: 16, borderRadius: 8, borderWidth: 3, borderColor: '#FFFFFF',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 3, shadowOffset: { width: 0, height: 1 } },
      android: { elevation: 5 },
    }),
  },
});

const mls = StyleSheet.create({
  clusterBubble: {
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2.5, borderColor: '#FFF',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 5, shadowOffset: { width: 0, height: 2 } },
      android: { elevation: 7 },
    }),
  },
  clusterCount: {
    position: 'absolute', top: -5, right: -7,
    minWidth: 19, height: 19, borderRadius: 10, paddingHorizontal: 4,
    backgroundColor: '#1C1917', borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  clusterCountText: { fontSize: 10, fontWeight: '900', color: '#FFF' },
  clusterNeedle: {
    width: 0, height: 0, marginTop: -2,
    borderLeftWidth: 6, borderRightWidth: 6, borderTopWidth: 9,
    borderLeftColor: 'transparent', borderRightColor: 'transparent',
  },
  eventPin: {
    width: 30, height: 30, borderRadius: 15, borderWidth: 2, borderColor: '#FFF',
    alignItems: 'center', justifyContent: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
      android: { elevation: 6 },
    }),
  },
  eventPinNeedle: {
    width: 0, height: 0, marginTop: -2,
    borderLeftWidth: 5, borderRightWidth: 5, borderTopWidth: 8,
    borderLeftColor: 'transparent', borderRightColor: 'transparent',
  },
  stopOuter: {
    width: 16, height: 16, borderRadius: 8, borderWidth: 2,
    backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center',
  },
  stopInner: { width: 7, height: 7, borderRadius: 3.5 },
  cityMarker: {
    width: 34, height: 34, borderRadius: 12, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  cityEmoji: { fontSize: 17 },
  cityPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 9, paddingVertical: 5, borderRadius: 14, borderWidth: 2,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
      android: { elevation: 5 },
    }),
  },
  cityPillEmoji: { fontSize: 15 },
  cityPillName: { fontSize: 12, fontWeight: '800', letterSpacing: 0.2, maxWidth: 120 },
  cityPillNeedle: {
    width: 0, height: 0, marginTop: -1,
    borderLeftWidth: 5, borderRightWidth: 5, borderTopWidth: 7,
    borderLeftColor: 'transparent', borderRightColor: 'transparent',
  },
  battleMarker: {
    width: 36, height: 36, borderRadius: 10, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  battleEmoji: { fontSize: 18 },
  troopMarker: {
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1.5,
    maxWidth: 100,
  },
  troopLabel: { fontSize: 9, fontWeight: '800', color: '#FFF', letterSpacing: 0.2 },
  religionOrigin: {
    width: 28, height: 28, borderRadius: 14, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  warPin: {
    borderColor: '#FFF', alignItems: 'center', justifyContent: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
      android: { elevation: 6 },
    }),
  },
  warPinNeedle: {
    width: 0, height: 0, marginTop: -2,
    borderLeftWidth: 5, borderRightWidth: 5, borderTopWidth: 8,
    borderLeftColor: 'transparent', borderRightColor: 'transparent',
  },
  warLabel: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 9, borderWidth: 1.5,
    marginBottom: 3, maxWidth: 150,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 3, shadowOffset: { width: 0, height: 1 } },
      android: { elevation: 4 },
    }),
  },
  warLabelText: { fontSize: 10.5, fontWeight: '800', letterSpacing: 0.2 },
  capLabel: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: 10, borderWidth: 1.5, opacity: 0.95,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 3, shadowOffset: { width: 0, height: 1 } },
      android: { elevation: 3 },
    }),
  },
  capStar: { width: 6, height: 6, borderRadius: 3 },
  capName: { fontSize: 9.5, fontWeight: '800', letterSpacing: 0.2 },
  warLegend: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
  },
  warLegendDot: { width: 7, height: 7, borderRadius: 3.5 },
  warLegendText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },
});

const mapProMarker = StyleSheet.create({
  pin: {
    backgroundColor: '#D4A017',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1.5,
    borderColor: '#fff',
    shadowColor: '#D4A017',
    shadowOpacity: 0.7,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 6,
  },
  star: { fontSize: 11, color: '#1a1208' },
  label: { fontSize: 10, fontWeight: '900', color: '#1a1208', letterSpacing: 1.4 },
  needle: {
    width: 2,
    height: 7,
    backgroundColor: '#D4A017',
    alignSelf: 'center',
    marginTop: -1,
    borderBottomLeftRadius: 1,
    borderBottomRightRadius: 1,
  },
});

// ═══════════════════════════════════════════════════════════════════════════════
// Styles
// ═══════════════════════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: { flex: 1 },

  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  topPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8 },
      android: { elevation: 4 },
    }),
  },
  topDot: { width: 10, height: 10, borderRadius: 5 },
  topText: { fontSize: 13, fontWeight: '500' },
  topTextBold: { fontSize: 14, fontWeight: '700' },

  backBtn: {
    position: 'absolute',
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6 },
      android: { elevation: 3 },
    }),
  },
  backText: { fontSize: 13, fontWeight: '600' },

  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: '#000' },

  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 12 },
      android: { elevation: 16 },
    }),
  },
  sheetHandle: { paddingTop: 12, paddingHorizontal: 20, paddingBottom: 8 },
  sheetBar: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sheetHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  sheetDot: { width: 12, height: 12, borderRadius: 6 },
  sheetTitle: { fontSize: 18, fontWeight: '700' },
  sheetSub: { fontSize: 12, fontWeight: '500', marginTop: 2, opacity: 0.6 },
  sheetClose: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetEmpty: { alignItems: 'center', paddingVertical: 50, gap: 12 },
  sheetEmptyText: { fontSize: 14, fontWeight: '500', opacity: 0.5 },

  catHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  catLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  catEmoji: { fontSize: 16 },
  catLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },
  catBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  catCount: { fontSize: 11, fontWeight: '800' },
  catDivider: { height: 1, marginHorizontal: 20, marginVertical: 8 },

  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 12,
  },
  eventYear: {
    width: 52,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
  },
  eventYearText: { fontSize: 11, fontWeight: '800' },
  eventContent: { flex: 1, gap: 4 },
  eventTitle: { fontSize: 14, fontWeight: '600', lineHeight: 20 },
  eventLoc: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  eventLocText: { fontSize: 11, fontWeight: '500', opacity: 0.5 },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 84 },

  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingCard: {
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 32,
    borderRadius: 20,
    borderWidth: 1,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12 },
      android: { elevation: 8 },
    }),
  },
  loadingText: { fontSize: 14, fontWeight: '600', marginTop: 8 },

  previewOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    zIndex: 100,
  },
  previewCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 16 },
      android: { elevation: 12 },
    }),
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  previewBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  previewEmoji: { fontSize: 16 },
  previewCatText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  previewClose: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewBody: { padding: 16, gap: 12 },
  previewTitle: { fontSize: 17, fontWeight: '700', lineHeight: 24 },
  previewSummary: { fontSize: 14, lineHeight: 21, opacity: 0.7 },
  previewMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  previewMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  previewMetaText: { fontSize: 12, fontWeight: '600' },
  previewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 16,
    paddingVertical: 14,
    borderRadius: 12,
  },
  previewButtonText: { color: '#FFF', fontSize: 14, fontWeight: '700' },

  // ── Layer UI ─────────────────────────────────────────────────────────────
  layerBtn: {
    width: 40, height: 40, borderRadius: 12, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 6 },
      android: { elevation: 4 },
    }),
  },
  layerBtnSingle: {
    position: 'absolute', right: 12, zIndex: 22,
  },
  layersPanel: {
    position: 'absolute', right: 12, zIndex: 21,
    borderRadius: 16, borderWidth: 1, paddingVertical: 6, minWidth: 210,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12 },
      android: { elevation: 8 },
    }),
  },
  layersPanelRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, marginHorizontal: 4,
  },
  layersPanelIcon: {
    width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center',
  },
  layersPanelLabel: { fontSize: 13, fontWeight: '700' },
  layersPanelDesc: { fontSize: 10.5, fontWeight: '500', opacity: 0.55, marginTop: 1 },
  layersPanelDot: { width: 7, height: 7, borderRadius: 3.5 },
  layersPanelSep: { height: StyleSheet.hairlineWidth, marginHorizontal: 12, marginVertical: 4 },
  layersPanelBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  layersPanelBadgeText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.4 },

  chipsRow: { position: 'absolute', left: 0, right: 0, zIndex: 18 },
  chipsContent: { paddingHorizontal: 12, gap: 6, flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4 },
      android: { elevation: 2 },
    }),
  },
  chipDot: { width: 8, height: 8, borderRadius: 4 },
  chipEmoji: { fontSize: 13 },
  chipLabel: { fontSize: 11, fontWeight: '700', maxWidth: 90 },

  sliderCard: {
    position: 'absolute', left: 14, right: 14,
    borderRadius: 18, borderWidth: 1, padding: 16, zIndex: 30,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12 },
      android: { elevation: 8 },
    }),
  },
  sliderHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  sliderYearLabel: { fontSize: 24, fontWeight: '900', letterSpacing: -0.5 },
  sliderAllTime: { fontSize: 11, fontWeight: '600', opacity: 0.6 },
  eraPreset: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderWidth: 1 },
  eraPresetText: { fontSize: 10.5, fontWeight: '700', letterSpacing: 0.3 },
  sliderTrackWrap: { height: 36, justifyContent: 'center', position: 'relative' },
  sliderTrack: { height: 4, borderRadius: 2, overflow: 'hidden' },
  sliderFill: { height: '100%' as any, borderRadius: 2 },
  sliderThumb: {
    position: 'absolute', width: 22, height: 22, borderRadius: 11,
    marginLeft: -11, top: 7, borderWidth: 3,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4 },
      android: { elevation: 4 },
    }),
  },

  keyStopCard: {
    position: 'absolute', left: 14, right: 14,
    borderRadius: 16, borderWidth: 1, padding: 16,
    flexDirection: 'row', alignItems: 'flex-start', gap: 12, zIndex: 30,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12 },
      android: { elevation: 8 },
    }),
  },
  keyStopClose: { position: 'absolute', top: 10, right: 10, padding: 6 },
  keyStopDot: { width: 12, height: 12, borderRadius: 6, marginTop: 4, flexShrink: 0 },
  keyStopTitle: { fontSize: 15, fontWeight: '700', marginBottom: 4, paddingRight: 24 },
  keyStopNote: { fontSize: 12, lineHeight: 18, opacity: 0.65, marginBottom: 6 },
  keyStopRouteName: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },

  // ── Battle phase card ─────────────────────────────────────────────────────
  battleCard: {
    position: 'absolute', left: 14, right: 14,
    borderRadius: 18, borderWidth: 1.5, padding: 14, zIndex: 30,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 12 },
      android: { elevation: 8 },
    }),
  },
  battleHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10, paddingRight: 28 },
  battleEmoji: { fontSize: 26, marginTop: 2 },
  battleName: { fontSize: 14, fontWeight: '800', marginBottom: 2 },
  battleYear: { fontSize: 11, fontWeight: '600' },
  phaseChip: {
    paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10, borderWidth: 1,
    minWidth: 90, alignItems: 'flex-start',
  },
  phaseNav: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
  phaseArrow: {
    width: 42, height: 42, borderRadius: 14, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  phaseNavCenter: { flex: 1, alignItems: 'center', gap: 3 },
  phaseDots: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
  phaseNum: { fontSize: 9, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 2 },
  phaseTitle: { fontSize: 11, fontWeight: '700' },
  phaseBody: { marginTop: 10, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth },
  phaseTime: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5, marginBottom: 4, textTransform: 'uppercase' },
  phaseDesc: { fontSize: 12, lineHeight: 18 },

  // ── City badge ────────────────────────────────────────────────────────────
  cityStatusBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8 },
  cityStatusText: { fontSize: 10, fontWeight: '700' },

  // ── Ancient City card (redesigned) ───────────────────────────────────────
  cityCard: {
    position: 'absolute', left: 14, right: 14,
    borderRadius: 20, borderWidth: 1.5, padding: 14, zIndex: 30, gap: 10,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 14 },
      android: { elevation: 10 },
    }),
  },
  cityCardHero: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  cityCardEmojiWrap: {
    width: 52, height: 52, borderRadius: 16, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  cityCardEmoji: { fontSize: 26 },
  cityCardName: { fontSize: 17, fontWeight: '800', letterSpacing: -0.3 },
  cityCardCiv: { fontSize: 11, fontWeight: '700', letterSpacing: 0.2 },
  cityCardDesc: { fontSize: 12, lineHeight: 18, opacity: 0.7 },
  cityCardFactRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    borderRadius: 10, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 8,
  },
  cityCardFactLabel: { fontSize: 14, flexShrink: 0 },
  cityCardFact: { flex: 1, fontSize: 11.5, lineHeight: 17, fontStyle: 'italic', fontWeight: '500' },

  // ── War Event card ────────────────────────────────────────────────────────
  warEventCard: {
    position: 'absolute', left: 14, right: 14,
    borderRadius: 18, borderWidth: 1.5, padding: 14, zIndex: 30, gap: 8,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 12 },
      android: { elevation: 8 },
    }),
  },
  warEventHeader: { paddingRight: 24 },
  warSideBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  warSideText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.6 },
  warEventType: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize', opacity: 0.6 },
  warEventYear: { fontSize: 11, fontWeight: '800' },
  warEventTitle: { fontSize: 15, fontWeight: '800', lineHeight: 21 },
  warEventDesc: { fontSize: 12, lineHeight: 18, opacity: 0.7 },
  warCasRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderRadius: 10, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 8 },
  warCasIcon: { fontSize: 13, flexShrink: 0 },
  warCasText: { flex: 1, fontSize: 11.5, lineHeight: 17, fontWeight: '500' },
});