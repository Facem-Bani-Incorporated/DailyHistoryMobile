// components/MapScreen.tsx
// ═══════════════════════════════════════════════════════════════════════════════
// CLEAN HISTORIC MAP - Native markers + elegant preview cards
// ═══════════════════════════════════════════════════════════════════════════════

import {
  Book,
  Calendar,
  ChevronDown,
  ChevronRight,
  Globe2,
  MapPin,
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
  View
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import api from '../api';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { haptic } from '../utils/haptics';
import { extractLocation } from '../utils/locationExtractor';
import { StoryModal } from './StoryModal';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental)
  UIManager.setLayoutAnimationEnabledExperimental(true);

const { width: W, height: H } = Dimensions.get('window');
const SHEET_CLOSED = 0;
const SHEET_HALF = H * 0.5;
const SHEET_FULL = H * 0.88;

const INIT_REGION: Region = { latitude: 30, longitude: 15, latitudeDelta: 100, longitudeDelta: 120 };
const INIT_CAM = { center: { latitude: 30, longitude: 15 }, pitch: 0, heading: 0, altitude: 20000000, zoom: 1.5 };

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
    tap_to_explore: 'Tap a country to explore',
    read_more: 'Read Full Story',
    close: 'Close',
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
    tap_to_explore: 'Apasă pe o țară',
    read_more: 'Citește Articolul',
    close: 'Închide',
  },
};

// ─── Categories ────────────────────────────────────────────────────────────────
const CAT: Record<string, { color: string; tKey: string; emoji: string }> = {
  war_conflict: { color: '#DC2626', tKey: 'war_conflict', emoji: '⚔️' },
  tech_innovation: { color: '#2563EB', tKey: 'tech_innovation', emoji: '⚡' },
  science_discovery: { color: '#7C3AED', tKey: 'science_discovery', emoji: '🔬' },
  politics_state: { color: '#D97706', tKey: 'politics_state', emoji: '🏛️' },
  culture_arts: { color: '#059669', tKey: 'culture_arts', emoji: '🎭' },
  natural_disaster: { color: '#EA580C', tKey: 'natural_disaster', emoji: '🌋' },
  exploration: { color: '#0891B2', tKey: 'exploration', emoji: '🧭' },
  religion_phil: { color: '#92400E', tKey: 'religion_phil', emoji: '📜' },
};
const FALLBACK = '#6B7280';

// ─── Helpers ───────────────────────────────────────────────────────────────────
const getCat = (e: any): string => (e.category ?? '').toString().toLowerCase();
const getYear = (e: any): string => {
  const r = String(e.eventDate ?? e.event_date ?? e.year ?? '').trim();
  if (/^\d{4}$/.test(r)) return r;
  if (r.includes('-')) return r.split('-')[0];
  return '';
};
const extractCountry = (label: string): string => {
  if (!label) return 'Unknown';
  const parts = label.split(',').map(s => s.trim());
  return parts.length >= 2 ? parts[parts.length - 1] : label;
};

const ALIAS: Record<string, string> = { UK: 'United Kingdom', England: 'United Kingdom', USA: 'United States' };
const norm = (c: string): string => ALIAS[c] ?? c;

// ─── Types ─────────────────────────────────────────────────────────────────────
interface EventWithLocation {
  event: any;
  lat: number;
  lng: number;
  label: string;
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
}

const buildClusters = (events: any[]): Cluster[] => {
  const withLoc: EventWithLocation[] = [];
  
  for (const ev of events) {
    const loc = extractLocation(ev);
    if (loc) {
      withLoc.push({ event: ev, lat: loc.latitude, lng: loc.longitude, label: loc.label });
    }
  }

  const byCountry = new Map<string, EventWithLocation[]>();
  for (const item of withLoc) {
    const country = norm(extractCountry(item.label));
    if (!byCountry.has(country)) byCountry.set(country, []);
    byCountry.get(country)!.push(item);
  }

  const clusters: Cluster[] = [];
  
  for (const [country, items] of byCountry) {
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
        color: CAT[key]?.color ?? FALLBACK,
        emoji: CAT[key]?.emoji ?? '📌',
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
      mainColor: cats[0]?.color ?? FALLBACK,
    });
  }

  return clusters.sort((a, b) => b.items.length - a.items.length);
};

// ═══════════════════════════════════════════════════════════════════════════════
// Preview Card Component
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
  const color = catInfo?.color ?? FALLBACK;
  const emoji = catInfo?.emoji ?? '📌';
  
  const title = item.event.titleTranslations?.[language] ?? item.event.titleTranslations?.en ?? 'Untitled';
  const summary = item.event.summaryTranslations?.[language] ?? item.event.summaryTranslations?.en ?? '';
  const year = getYear(item.event);
  const location = item.label.split(',')[0]?.trim() ?? item.label;

  const cardBg = isDark ? '#1C1917' : '#FFFFFF';
  const borderCol = isDark ? '#292524' : '#E5E5E5';
  const subtextCol = isDark ? '#A8A29E' : '#737373';

  return (
    <Animated.View style={[styles.previewOverlay, { opacity: opacityAnim }]}>
      <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={close} />
      
      <Animated.View
        style={[
          styles.previewCard,
          {
            backgroundColor: cardBg,
            borderColor: borderCol,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {/* Header with category */}
        <View style={[styles.previewHeader, { borderBottomColor: borderCol }]}>
          <View style={[styles.previewBadge, { backgroundColor: color + '15' }]}>
            <Text style={styles.previewEmoji}>{emoji}</Text>
            <Text style={[styles.previewCatText, { color }]}>
              {tm(catInfo?.tKey ?? catKey)}
            </Text>
          </View>
          
          <TouchableOpacity onPress={close} style={[styles.previewClose, { backgroundColor: isDark ? '#292524' : '#F5F5F5' }]}>
            <X size={18} color={subtextCol} strokeWidth={2} />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View style={styles.previewBody}>
          <Text style={[styles.previewTitle, { color: theme.text }]} numberOfLines={3}>
            {title}
          </Text>
          
          {summary !== '' && (
            <Text style={[styles.previewSummary, { color: subtextCol }]} numberOfLines={3}>
              {summary}
            </Text>
          )}

          {/* Meta row */}
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
                {location}
              </Text>
            </View>
          </View>
        </View>

        {/* Action button */}
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
// Event Row Component
// ═══════════════════════════════════════════════════════════════════════════════
const EventRow = React.memo(({
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
  const title = item.event.titleTranslations?.[language] ?? item.event.titleTranslations?.en ?? '';
  const year = getYear(item.event);
  const city = item.label.includes(',') ? item.label.split(',')[0].trim() : '';

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.6} style={styles.eventRow}>
      <View style={[styles.eventYear, { backgroundColor: color + '12', borderColor: color + '25' }]}>
        <Text style={[styles.eventYearText, { color }]}>{year || '—'}</Text>
      </View>
      
      <View style={styles.eventContent}>
        <Text style={[styles.eventTitle, { color: theme.text }]} numberOfLines={2}>{title}</Text>
        {city !== '' && (
          <View style={styles.eventLoc}>
            <MapPin size={10} color={theme.subtext} strokeWidth={2} style={{ opacity: 0.5 }} />
            <Text style={[styles.eventLocText, { color: theme.subtext }]}>{city}</Text>
          </View>
        )}
      </View>
      
      <ChevronRight size={16} color={theme.subtext} strokeWidth={2} style={{ opacity: 0.4 }} />
    </TouchableOpacity>
  );
});

// ═══════════════════════════════════════════════════════════════════════════════
// Category Section Component
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
    setExpanded(v => !v);
  };

  return (
    <View>
      <TouchableOpacity onPress={toggle} activeOpacity={0.7} style={[styles.catHeader, { backgroundColor: cat.color + '08' }]}>
        <View style={styles.catLeft}>
          <Text style={styles.catEmoji}>{cat.emoji}</Text>
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
      
      {expanded && cat.events.map((item, i) => (
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
            <View style={[styles.divider, { backgroundColor: isDark ? '#292524' : '#F0F0F0' }]} />
          )}
        </View>
      ))}
    </View>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════════════
export default function MapScreen() {
  const { theme, isDark } = useTheme();
  const { language } = useLanguage();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);

  const tm = useCallback((k: string) => (T[language] ?? T.en)[k] ?? T.en[k] ?? k, [language]);

  const [allEvents, setAllEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCountry, setActiveCountry] = useState<string | null>(null);
  const activeCountryRef = useRef<string | null>(null);
  const [renderKey, setRenderKey] = useState(0);

  // Preview state
  const [previewItem, setPreviewItem] = useState<EventWithLocation | null>(null);

  // Story modal
  const [storyEvent, setStoryEvent] = useState<any>(null);
  const [storyVisible, setStoryVisible] = useState(false);
  const storyVisibleRef = useRef(false);
  const justClosedStory = useRef(false);

  useEffect(() => { storyVisibleRef.current = storyVisible; }, [storyVisible]);

  // Sheet animation
  const sheetY = useRef(new Animated.Value(SHEET_CLOSED)).current;
  const backdropOp = useRef(new Animated.Value(0)).current;
  const dragStart = useRef(0);

  const snapSheet = useCallback((to: number) => {
    Animated.parallel([
      Animated.spring(sheetY, { toValue: to, tension: 200, friction: 25, useNativeDriver: false }),
      Animated.timing(backdropOp, { toValue: to > 0 ? 0.3 : 0, duration: 200, useNativeDriver: false }),
    ]).start();
  }, [sheetY, backdropOp]);

  const closeSheet = useCallback(() => {
    snapSheet(SHEET_CLOSED);
    setTimeout(() => {
      setActiveCountry(null);
      activeCountryRef.current = null;
      setRenderKey(k => k + 1);
    }, 250);
  }, [snapSheet]);

  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 8,
    onPanResponderGrant: () => { dragStart.current = (sheetY as any)._value; },
    onPanResponderMove: (_, g) => {
      const val = Math.max(0, Math.min(SHEET_FULL, dragStart.current - g.dy));
      sheetY.setValue(val);
    },
    onPanResponderRelease: (_, g) => {
      const cur = (sheetY as any)._value;
      if (g.vy > 1.2) { closeSheet(); return; }
      if (-g.vy > 1.2) { snapSheet(SHEET_FULL); return; }
      
      const snaps = [SHEET_CLOSED, SHEET_HALF, SHEET_FULL];
      const nearest = snaps.reduce((p, s) => Math.abs(s - cur) < Math.abs(p - cur) ? s : p);
      nearest === SHEET_CLOSED ? closeSheet() : snapSheet(nearest);
    },
  })).current;

  // Fetch events
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const promises = Array.from({ length: 60 }, (_, i) => {
          const d = new Date();
          d.setDate(d.getDate() - i);
          return api.get('/daily-content/by-date', { params: { date: d.toISOString().split('T')[0] } })
            .then(r => r.data?.events ?? [])
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
        setAllEvents(unique);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const clusters = useMemo(() => buildClusters(allEvents), [allEvents]);
  const total = useMemo(() => clusters.reduce((s, c) => s + c.items.length, 0), [clusters]);
  const activeCluster = useMemo(() => clusters.find(c => c.country === activeCountry) ?? null, [clusters, activeCountry]);

  const zoomToCluster = useCallback((cluster: Cluster) => {
    haptic('medium');
    setActiveCountry(cluster.country);
    activeCountryRef.current = cluster.country;

    if (cluster.items.length === 1) {
      mapRef.current?.animateToRegion({
        latitude: cluster.items[0].lat,
        longitude: cluster.items[0].lng,
        latitudeDelta: 8,
        longitudeDelta: 8,
      }, 700);
    } else {
      const lats = cluster.items.map(i => i.lat);
      const lngs = cluster.items.map(i => i.lng);
      const minLat = Math.min(...lats), maxLat = Math.max(...lats);
      const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
      
      mapRef.current?.animateToRegion({
        latitude: (minLat + maxLat) / 2,
        longitude: (minLng + maxLng) / 2,
        latitudeDelta: Math.max((maxLat - minLat) * 1.8, 5),
        longitudeDelta: Math.max((maxLng - minLng) * 1.8, 5),
      }, 700);
    }
    
    snapSheet(SHEET_HALF);
  }, [snapSheet]);

  const zoomOut = useCallback(() => {
    haptic('light');
    closeSheet();
    mapRef.current?.animateCamera(INIT_CAM, { duration: 800 });
  }, [closeSheet]);

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
    setTimeout(() => { justClosedStory.current = false; }, 500);
  }, []);

  const onMapPress = useCallback(() => {
    if (storyVisibleRef.current || justClosedStory.current) return;
    if (previewItem) { setPreviewItem(null); return; }
    if (activeCountryRef.current) zoomOut();
  }, [previewItem, zoomOut]);

  const onMapReady = useCallback(() => {
    mapRef.current?.animateCamera(INIT_CAM, { duration: 1000 });
  }, []);

  // Colors
  const accent = isDark ? '#F59E0B' : '#2563EB';
  const cardBg = isDark ? '#1C1917' : '#FFFFFF';
  const borderCol = isDark ? '#292524' : '#E5E5E5';

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Map */}
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        provider={PROVIDER_GOOGLE}
        initialRegion={INIT_REGION}
        mapType="terrain"
        showsUserLocation
        showsCompass={false}
        showsScale={false}
        pitchEnabled
        rotateEnabled
        onMapReady={onMapReady}
        onPress={onMapPress}
      >
        {/* World view - cluster markers */}
        {!activeCountry && clusters.map(cluster => (
          <Marker
            key={`cluster-${renderKey}-${cluster.country}`}
            coordinate={{ latitude: cluster.lat, longitude: cluster.lng }}
            pinColor={cluster.mainColor}
            title={cluster.country}
            description={`${cluster.items.length} events`}
            onPress={() => zoomToCluster(cluster)}
            tracksViewChanges={false}
          />
        ))}

        {/* Country view - individual event markers */}
        {activeCountry && activeCluster && activeCluster.items.map((item, idx) => {
          const catKey = getCat(item.event);
          const color = CAT[catKey]?.color ?? FALLBACK;
          
          return (
            <Marker
              key={`event-${activeCountry}-${idx}`}
              coordinate={{ latitude: item.lat, longitude: item.lng }}
              pinColor={color}
              onPress={() => openPreview(item)}
              tracksViewChanges={false}
            />
          );
        })}
      </MapView>

      {/* Top status pill */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]} pointerEvents="box-none">
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
                · {activeCluster?.items.length ?? 0} {tm('events')}
              </Text>
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

      {/* Back button */}
      {activeCountry && (
        <TouchableOpacity
          onPress={zoomOut}
          activeOpacity={0.8}
          style={[styles.backBtn, { top: insets.top + 60, backgroundColor: cardBg, borderColor: borderCol }]}
        >
          <Globe2 size={14} color={accent} strokeWidth={2.5} />
          <Text style={[styles.backText, { color: accent }]}>{tm('back_to_world')}</Text>
        </TouchableOpacity>
      )}

      {/* Backdrop */}
      <Animated.View style={[styles.backdrop, { opacity: backdropOp }]} pointerEvents="none" />

      {/* Bottom sheet */}
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
          
          {activeCluster && (
            <View style={styles.sheetHeader}>
              <View style={styles.sheetHeaderLeft}>
                <View style={[styles.sheetDot, { backgroundColor: activeCluster.mainColor }]} />
                <View>
                  <Text style={[styles.sheetTitle, { color: theme.text }]}>{activeCluster.country}</Text>
                  <Text style={[styles.sheetSub, { color: theme.subtext }]}>
                    {activeCluster.items.length} {tm('events')} · {activeCluster.cats.length} {tm('categories')}
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={zoomOut} style={[styles.sheetClose, { backgroundColor: isDark ? '#292524' : '#F5F5F5' }]}>
                <X size={16} color={theme.subtext} strokeWidth={2} />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {activeCluster ? (
          <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 20 }} showsVerticalScrollIndicator={false}>
            {activeCluster.cats.map((cat, i) => (
              <React.Fragment key={cat.key}>
                <CategorySection
                  cat={cat}
                  language={language}
                  theme={theme}
                  isDark={isDark}
                  tm={tm}
                  onEventPress={openPreview}
                />
                {i < activeCluster.cats.length - 1 && (
                  <View style={[styles.catDivider, { backgroundColor: isDark ? '#292524' : '#E5E5E5' }]} />
                )}
              </React.Fragment>
            ))}
          </ScrollView>
        ) : (
          <View style={styles.sheetEmpty}>
            <MapPin size={32} color={theme.subtext + '30'} strokeWidth={1.5} />
            <Text style={[styles.sheetEmptyText, { color: theme.subtext }]}>{tm('tap_to_explore')}</Text>
          </View>
        )}
      </Animated.View>

      {/* Loading overlay */}
      {loading && (
        <View style={[styles.loadingOverlay, { backgroundColor: isDark ? 'rgba(15,14,13,0.9)' : 'rgba(255,255,255,0.9)' }]}>
          <View style={[styles.loadingCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
            <Globe2 size={36} color={accent} strokeWidth={1.5} />
            <ActivityIndicator size="large" color={accent} style={{ marginTop: 16 }} />
            <Text style={[styles.loadingText, { color: accent }]}>{tm('loading')}</Text>
          </View>
        </View>
      )}

      {/* Preview card */}
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

      {/* Story modal */}
      <StoryModal visible={storyVisible} event={storyEvent} onClose={closeStory} theme={theme} />
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Styles
// ═══════════════════════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: { flex: 1 },

  // Top bar
  topBar: { position: 'absolute', top: 0, left: 0, right: 0, alignItems: 'center', paddingHorizontal: 16 },
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

  // Back button
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

  // Backdrop
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: '#000' },

  // Sheet
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
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sheetHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  sheetDot: { width: 12, height: 12, borderRadius: 6 },
  sheetTitle: { fontSize: 18, fontWeight: '700' },
  sheetSub: { fontSize: 12, fontWeight: '500', marginTop: 2, opacity: 0.6 },
  sheetClose: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  sheetEmpty: { alignItems: 'center', paddingVertical: 50, gap: 12 },
  sheetEmptyText: { fontSize: 14, fontWeight: '500', opacity: 0.5 },

  // Category
  catHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 },
  catLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  catEmoji: { fontSize: 16 },
  catLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },
  catBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  catCount: { fontSize: 11, fontWeight: '800' },
  catDivider: { height: 1, marginHorizontal: 20, marginVertical: 8 },

  // Event row
  eventRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, gap: 12 },
  eventYear: { width: 52, paddingVertical: 6, borderRadius: 8, alignItems: 'center', borderWidth: 1 },
  eventYearText: { fontSize: 11, fontWeight: '800' },
  eventContent: { flex: 1, gap: 4 },
  eventTitle: { fontSize: 14, fontWeight: '600', lineHeight: 20 },
  eventLoc: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  eventLocText: { fontSize: 11, fontWeight: '500', opacity: 0.5 },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 84 },

  // Loading
  loadingOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
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

  // Preview
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
  previewHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1 },
  previewBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  previewEmoji: { fontSize: 16 },
  previewCatText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },
  previewClose: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  previewBody: { padding: 16, gap: 12 },
  previewTitle: { fontSize: 17, fontWeight: '700', lineHeight: 24 },
  previewSummary: { fontSize: 14, lineHeight: 21, opacity: 0.7 },
  previewMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  previewMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  previewMetaText: { fontSize: 12, fontWeight: '600' },
  previewButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginHorizontal: 16, marginBottom: 16, paddingVertical: 14, borderRadius: 12 },
  previewButtonText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
});
