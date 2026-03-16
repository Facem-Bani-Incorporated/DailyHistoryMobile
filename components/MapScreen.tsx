// components/MapScreen.tsx
import { MapPin, X, Zap } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  FlatList,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import api from '../api';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { groupEventsByLocation, LocationGroup } from '../utils/locationExtractor';
import { StoryModal } from './StoryModal';

const { width: W, height: H } = Dimensions.get('window');

// Înălțimile bottom sheet-ului
const SHEET_CLOSED   = 0;
const SHEET_PEEK     = 110;  // vizibil puțin — arată că există conținut
const SHEET_HALF     = H * 0.45;
const SHEET_FULL     = H * 0.82;
const DRAG_THRESHOLD = 60;

const INITIAL_REGION: Region = {
  latitude: 30,
  longitude: 15,
  latitudeDelta: 100,
  longitudeDelta: 120,
};

// ── Culoarea pinului în funcție de numărul de evenimente
const pinColor = (count: number, gold: string): string => {
  if (count >= 5) return gold;
  if (count >= 3) return '#ff9500';
  if (count >= 2) return '#ff6b35';
  return '#ff453a';
};

// ── Dimensiunea pinului în funcție de numărul de evenimente
const pinSize = (count: number): number => {
  if (count >= 5) return 44;
  if (count >= 3) return 38;
  if (count >= 2) return 32;
  return 26;
};

interface EventRowProps {
  event: any;
  language: string;
  t: (k: string) => string;
  theme: any;
  onPress: () => void;
}

// Stiluri statice pentru EventRow (nu depind de temă — culorile vin prin props)
const styles = StyleSheet.create({
  eventRow:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  eventRowLeft:  { flex: 1, marginRight: 12 },
  eventYear:     { fontSize: 11, fontWeight: '800', letterSpacing: 1.5, marginBottom: 3 },
  eventTitle:    { fontSize: 14, fontWeight: '600', lineHeight: 20 },
  eventRowRight: { alignItems: 'center', gap: 6 },
  impactBadge:   { flexDirection: 'row', alignItems: 'center', gap: 3 },
  impactText:    { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  chevron:       { fontSize: 20, fontWeight: '300', lineHeight: 22 },
});

const EventRow: React.FC<EventRowProps> = ({ event, language, t, theme, onPress }) => {
  const title  = event.titleTranslations?.[language] ?? event.titleTranslations?.en ?? 'No Title';
  const impact = event.impactScore || 0;
  const year   = (() => {
    const raw = event.eventDate ?? event.event_date ?? event.date ?? event.year ?? '';
    const s = String(raw).trim();
    if (/^\d{4}$/.test(s)) return s;
    if (s.includes('-') && s.split('-')[0].length === 4) return s.split('-')[0];
    return '';
  })();

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.75} style={[styles.eventRow, { borderBottomColor: theme.border }]}>
      <View style={styles.eventRowLeft}>
        <Text style={[styles.eventYear, { color: theme.gold }]}>{year}</Text>
        <Text style={[styles.eventTitle, { color: theme.text }]} numberOfLines={2}>{title}</Text>
      </View>
      <View style={styles.eventRowRight}>
        <View style={styles.impactBadge}>
          <Zap size={10} color={theme.gold} fill={theme.gold} />
          <Text style={[styles.impactText, { color: theme.gold }]}>{impact}%</Text>
        </View>
        <Text style={[styles.chevron, { color: theme.subtext }]}>›</Text>
      </View>
    </TouchableOpacity>
  );
};

export default function MapScreen() {
  const { theme, isDark } = useTheme();
  const { language, t } = useLanguage();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);

  const [allEvents, setAllEvents]         = useState<any[]>([]);
  const [loading, setLoading]             = useState(true);
  const [locationGroups, setLocationGroups] = useState<LocationGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<LocationGroup | null>(null);
  const [storyEvent, setStoryEvent]       = useState<any>(null);
  const [storyVisible, setStoryVisible]   = useState(false);
  const [totalMatched, setTotalMatched]   = useState(0);

  // ── Bottom sheet animation
  const sheetY     = useRef(new Animated.Value(SHEET_CLOSED)).current;
  const sheetState = useRef<'closed' | 'peek' | 'half' | 'full'>('closed');

  const setSheetHeight = useCallback((h: number, animated = true) => {
    if (animated) {
      Animated.spring(sheetY, { toValue: h, tension: 200, friction: 28, useNativeDriver: false }).start();
    } else {
      sheetY.setValue(h);
    }
  }, [sheetY]);

  const openSheet = useCallback((group: LocationGroup) => {
    setSelectedGroup(group);
    sheetState.current = 'half';
    setSheetHeight(SHEET_HALF);
  }, [setSheetHeight]);

  const closeSheet = useCallback(() => {
    sheetState.current = 'closed';
    setSheetHeight(SHEET_CLOSED);
    setTimeout(() => setSelectedGroup(null), 300);
  }, [setSheetHeight]);

  // Pan responder pentru drag pe sheet
  const lastY  = useRef(0);
  const startY = useRef(0);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder:  (_, g) => Math.abs(g.dy) > 5,

      onPanResponderGrant: () => {
        // @ts-ignore
        lastY.current = sheetY._value;
        startY.current = lastY.current;
      },

      onPanResponderMove: (_, g) => {
        const newH = Math.max(0, Math.min(SHEET_FULL, lastY.current - g.dy));
        sheetY.setValue(newH);
      },

      onPanResponderRelease: (_, g) => {
        // @ts-ignore
        const currentH = sheetY._value;
        const velocity = -g.vy; // negativ pentru că drag în jos = închide

        if (velocity > 1.5 || (g.dy > DRAG_THRESHOLD && currentH < SHEET_HALF)) {
          // Swipe rapid în jos sau drag sub jumătate → închide
          closeSheet();
          return;
        }
        if (velocity < -1.5 || currentH > SHEET_HALF + 50) {
          // Swipe rapid în sus → full
          sheetState.current = 'full';
          setSheetHeight(SHEET_FULL);
          return;
        }
        if (currentH > SHEET_PEEK + 30) {
          // Snap la half
          sheetState.current = 'half';
          setSheetHeight(SHEET_HALF);
        } else {
          closeSheet();
        }
      },
    })
  ).current;

  // ── Fetch toate evenimentele din DB
  useEffect(() => {
    const fetchAll = async () => {
      try {
        setLoading(true);
        // Încearcă mai multe endpoint-uri posibile
        let events: any[] = [];
        try {
          const res = await api.get('/events/all');
          events = res.data?.events ?? res.data ?? [];
        } catch {
          try {
            const res = await api.get('/daily-content/all');
            events = res.data?.events ?? res.data ?? [];
          } catch {
            // Fallback: fetch ultimele 30 zile de conținut daily
            const promises = Array.from({ length: 30 }, (_, i) => {
              const d = new Date();
              d.setDate(d.getDate() - i);
              const iso = d.toISOString().split('T')[0];
              return api.get('/daily-content/by-date', { params: { date: iso } })
                .then(r => r.data?.events ?? [])
                .catch(() => []);
            });
            const results = await Promise.all(promises);
            events = results.flat();
          }
        }

        // Deduplicare pe id
        const seen = new Set<string>();
        const unique = events.filter((e: any) => {
          if (seen.has(e.id)) return false;
          seen.add(e.id);
          return true;
        });

        setAllEvents(unique);
        const groups = groupEventsByLocation(unique);
        setLocationGroups(groups);
        setTotalMatched(groups.reduce((sum, g) => sum + g.events.length, 0));
      } catch (err) {
        console.error('MapScreen fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, []);

  const handleMarkerPress = useCallback((group: LocationGroup) => {
    // Zoom pe marker
    mapRef.current?.animateToRegion({
      latitude: group.latitude,
      longitude: group.longitude,
      latitudeDelta: 8,
      longitudeDelta: 8,
    }, 400);
    openSheet(group);
  }, [openSheet]);

  const handleEventPress = useCallback((event: any) => {
    setStoryEvent(event);
    setStoryVisible(true);
  }, []);

  const sortedEvents = useMemo(() => {
    if (!selectedGroup) return [];
    return [...selectedGroup.events].sort((a, b) => (b.impactScore ?? 0) - (a.impactScore ?? 0));
  }, [selectedGroup]);

  const s = makeStyles(theme, isDark);

  return (
    <View style={s.root}>
      {/* ── HARTA ── */}
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={INITIAL_REGION}
        mapType={isDark ? 'mutedStandard' : 'standard'}
        customMapStyle={isDark ? DARK_MAP_STYLE : []}
        showsUserLocation
        showsCompass={false}
        showsScale={false}
        onPress={closeSheet}
      >
        {locationGroups.map((group) => {
          const count = group.events.length;
          const size  = pinSize(count);
          const color = pinColor(count, theme.gold);
          const isSelected = selectedGroup?.label === group.label;

          return (
            <Marker
              key={group.label}
              coordinate={{ latitude: group.latitude, longitude: group.longitude }}
              onPress={() => handleMarkerPress(group)}
              anchor={{ x: 0.5, y: 0.5 }}
              tracksViewChanges={false}
            >
              <View style={[
                s.markerWrap,
                { width: size, height: size, borderRadius: size / 2,
                  backgroundColor: isSelected ? theme.gold : color,
                  borderColor: isSelected ? '#fff' : 'rgba(255,255,255,0.6)',
                  borderWidth: isSelected ? 2.5 : 1.5,
                  transform: [{ scale: isSelected ? 1.2 : 1 }],
                }
              ]}>
                <Text style={[s.markerCount, { fontSize: count > 9 ? 10 : 12 }]}>{count}</Text>
              </View>
            </Marker>
          );
        })}
      </MapView>

      {/* ── OVERLAY HEADER ── */}
      <View style={[s.headerOverlay, { paddingTop: insets.top + 8 }]} pointerEvents="none">
        <View style={s.headerPill}>
          <MapPin size={12} color={theme.gold} />
          <Text style={[s.headerText, { color: theme.text }]}>
            {loading
              ? 'Se încarcă harta...'
              : `${locationGroups.length} locații · ${totalMatched} evenimente`}
          </Text>
        </View>
      </View>

      {/* ── LOADING ── */}
      {loading && (
        <View style={s.loadingOverlay} pointerEvents="none">
          <ActivityIndicator color={theme.gold} size="large" />
        </View>
      )}

      {/* ── BOTTOM SHEET ── */}
      <Animated.View
        style={[s.sheet, { height: sheetY, backgroundColor: theme.card }]}
      >
        {/* Drag handle */}
        <View style={s.sheetHandleWrap} {...panResponder.panHandlers}>
          <View style={[s.sheetHandle, { backgroundColor: theme.border }]} />

          {selectedGroup && (
            <View style={s.sheetHeader}>
              <View style={s.sheetTitleWrap}>
                <MapPin size={14} color={theme.gold} />
                <Text style={[s.sheetTitle, { color: theme.text }]} numberOfLines={1}>
                  {selectedGroup.label}
                </Text>
                <View style={[s.countBadge, { backgroundColor: theme.gold + '22', borderColor: theme.gold + '44' }]}>
                  <Text style={[s.countBadgeText, { color: theme.gold }]}>
                    {selectedGroup.events.length}
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={closeSheet} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <View style={[s.closeBtn, { backgroundColor: theme.border + '80' }]}>
                  <X size={14} color={theme.subtext} />
                </View>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Lista de evenimente */}
        {selectedGroup && (
          <FlatList
            data={sortedEvents}
            keyExtractor={(item) => item.id ?? item._id ?? Math.random().toString()}
            renderItem={({ item }) => (
              <EventRow
                event={item}
                language={language}
                t={t}
                theme={theme}
                onPress={() => handleEventPress(item)}
              />
            )}
            contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
            showsVerticalScrollIndicator={false}
            bounces={false}
          />
        )}
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

// ── Dark map style pentru MapView
const DARK_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#1a1a2e' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8899aa' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1a1a2e' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#2d2d44' }] },
  { featureType: 'administrative.country', elementType: 'labels.text.fill', stylers: [{ color: '#9db3c8' }] },
  { featureType: 'administrative.province', elementType: 'labels.text.fill', stylers: [{ color: '#6b7c8a' }] },
  { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#16213e' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0a1628' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#3d5f78' }] },
  { featureType: 'administrative.country', elementType: 'geometry.stroke', stylers: [{ color: '#2a3a4a' }] },
];

const makeStyles = (theme: any, isDark: boolean) =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: theme.background,
    },
    headerOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingBottom: 10,
    },
    headerPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: isDark ? 'rgba(0,0,0,0.72)' : 'rgba(255,255,255,0.88)',
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.border,
    },
    headerText: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.5,
    },
    loadingOverlay: {
      ...StyleSheet.absoluteFillObject,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(0,0,0,0.3)',
    },
    markerWrap: {
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.35,
      shadowRadius: 4,
      elevation: 5,
    },
    markerCount: {
      color: '#fff',
      fontWeight: '900',
      textAlign: 'center',
    },
    sheet: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      overflow: 'hidden',
      borderTopWidth: StyleSheet.hairlineWidth,
      borderColor: theme.border,
      // Shadow pe iOS
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.25,
      shadowRadius: 12,
      elevation: 20,
    },
    sheetHandleWrap: {
      paddingTop: 10,
      paddingHorizontal: 20,
      paddingBottom: 8,
    },
    sheetHandle: {
      width: 36,
      height: 4,
      borderRadius: 2,
      alignSelf: 'center',
      marginBottom: 14,
    },
    sheetHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    sheetTitleWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      flex: 1,
      marginRight: 12,
    },
    sheetTitle: {
      fontSize: 16,
      fontWeight: '800',
      letterSpacing: 0.3,
      flex: 1,
    },
    countBadge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 10,
      borderWidth: 1,
    },
    countBadgeText: {
      fontSize: 11,
      fontWeight: '800',
    },
    closeBtn: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });