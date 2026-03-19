// components/MapScreen.tsx
// ═══════════════════════════════════════════════════════════════════════════════
//  BULLETPROOF MAP v5 — Native Google Maps pinColor markers everywhere
//
//  WORLD VIEW  → Native pinColor markers (same as country view).
//                No custom Views, no bitmap snapshot issues, always visible.
//                A `renderKey` counter forces full remount of all world-view
//                markers after returning from country close-up, so they always
//                reappear correctly.
//
//  COUNTRY VIEW → Native pinColor markers. Zero custom views.
//                 100% reliable on every device ever made.
// ═══════════════════════════════════════════════════════════════════════════════

import {
  ChevronDown,
  ChevronRight,
  Globe2,
  Layers,
  MapPin,
  Sparkles,
  X,
} from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
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

const { height: H } = Dimensions.get('window');
const SHEET_CLOSED = 0;
const SHEET_HALF = H * 0.48;
const SHEET_FULL = H * 0.88;
const SNAP_VEL = 1.0;

const INIT_REGION: Region = { latitude: 28, longitude: 15, latitudeDelta: 120, longitudeDelta: 140 };
const INIT_CAM = { center: { latitude: 28, longitude: 15 }, pitch: 45, heading: 0, altitude: 18000000, zoom: 1.8 };

// ─── i18n ────────────────────────────────────────────────────────────────────
const T: Record<string, Record<string, string>> = {
  en: { loading: 'Loading map…', events_across: 'events across', countries: 'countries', no_events: 'No events found', events: 'events', categories: 'categories', back_to_world: 'World view', war_conflict: 'War & Conflict', tech_innovation: 'Technology', science_discovery: 'Science', politics_state: 'Politics', culture_arts: 'Culture & Arts', natural_disaster: 'Natural Disaster', exploration: 'Exploration', religion_phil: 'Religion', tap_to_explore: 'Tap a country to explore' },
  ro: { loading: 'Se încarcă…', events_across: 'evenimente în', countries: 'țări', no_events: 'Niciun eveniment', events: 'evenimente', categories: 'categorii', back_to_world: 'Vedere globală', war_conflict: 'Război', tech_innovation: 'Tehnologie', science_discovery: 'Știință', politics_state: 'Politică', culture_arts: 'Cultură', natural_disaster: 'Dezastre', exploration: 'Explorare', religion_phil: 'Religie', tap_to_explore: 'Apasă pe o țară' },
  fr: { loading: 'Chargement…', events_across: 'événements dans', countries: 'pays', no_events: 'Aucun événement', events: 'événements', categories: 'catégories', back_to_world: 'Vue monde', war_conflict: 'Guerre', tech_innovation: 'Technologie', science_discovery: 'Science', politics_state: 'Politique', culture_arts: 'Culture', natural_disaster: 'Catastrophe', exploration: 'Exploration', religion_phil: 'Religion', tap_to_explore: 'Touchez un pays' },
  de: { loading: 'Wird geladen…', events_across: 'Ereignisse in', countries: 'Ländern', no_events: 'Keine Ereignisse', events: 'Ereignisse', categories: 'Kategorien', back_to_world: 'Weltansicht', war_conflict: 'Krieg', tech_innovation: 'Technik', science_discovery: 'Wissenschaft', politics_state: 'Politik', culture_arts: 'Kultur', natural_disaster: 'Katastrophe', exploration: 'Entdeckung', religion_phil: 'Religion', tap_to_explore: 'Tippe auf ein Land' },
  es: { loading: 'Cargando…', events_across: 'eventos en', countries: 'países', no_events: 'Sin eventos', events: 'eventos', categories: 'categorías', back_to_world: 'Vista mundial', war_conflict: 'Guerra', tech_innovation: 'Tecnología', science_discovery: 'Ciencia', politics_state: 'Política', culture_arts: 'Cultura', natural_disaster: 'Desastre', exploration: 'Exploración', religion_phil: 'Religión', tap_to_explore: 'Toca un país' },
};

const CAT: Record<string, { color: string; tKey: string; emoji: string }> = {
  war_conflict:      { color: '#EF4444', tKey: 'war_conflict',      emoji: '⚔️' },
  tech_innovation:   { color: '#3B82F6', tKey: 'tech_innovation',   emoji: '⚡' },
  science_discovery: { color: '#8B5CF6', tKey: 'science_discovery', emoji: '🔬' },
  politics_state:    { color: '#F59E0B', tKey: 'politics_state',    emoji: '🏛️' },
  culture_arts:      { color: '#10B981', tKey: 'culture_arts',      emoji: '🎭' },
  natural_disaster:  { color: '#F97316', tKey: 'natural_disaster',  emoji: '🌋' },
  exploration:       { color: '#06B6D4', tKey: 'exploration',       emoji: '🧭' },
  religion_phil:     { color: '#A16207', tKey: 'religion_phil',     emoji: '🕊️' },
};
const FALLBACK = '#78716C';

const ck = (e: any): string => (e.category ?? '').toString().toLowerCase();
const getYear = (e: any): string => {
  const r = String(e.eventDate ?? e.event_date ?? e.year ?? '').trim();
  if (/^\d{4}$/.test(r)) return r;
  if (r.includes('-') && r.split('-')[0].length === 4) return r.split('-')[0];
  return '';
};
const extractCountry = (label: string): string => {
  if (!label) return 'Unknown';
  const p = label.split(',').map(s => s.trim());
  return p.length >= 2 ? p[p.length - 1] : label;
};
const ALIAS: Record<string, string> = { UK: 'United Kingdom', England: 'United Kingdom', USA: 'United States', Hawaii: 'United States' };
const norm = (c: string): string => ALIAS[c] ?? c;

interface EWL { event: any; lat: number; lng: number; label: string }
interface CatGroup { key: string; color: string; emoji: string; label: string; events: EWL[] }
interface Cluster { country: string; cLat: number; cLng: number; items: EWL[]; cats: CatGroup[]; topColor: string }

const buildClusters = (events: any[]): Cluster[] => {
  const wl: EWL[] = [];
  for (const ev of events) {
    const loc = extractLocation(ev);
    if (loc) wl.push({ event: ev, lat: loc.latitude, lng: loc.longitude, label: loc.label });
  }
  const cm = new Map<string, EWL[]>();
  for (const i of wl) { const c = norm(extractCountry(i.label)); if (!cm.has(c)) cm.set(c, []); cm.get(c)!.push(i); }
  const out: Cluster[] = [];
  for (const [country, items] of cm) {
    const cLat = items.reduce((s, i) => s + i.lat, 0) / items.length;
    const cLng = items.reduce((s, i) => s + i.lng, 0) / items.length;
    const km = new Map<string, EWL[]>();
    for (const i of items) { const k = ck(i.event); if (!km.has(k)) km.set(k, []); km.get(k)!.push(i); }
    const cats = Array.from(km.entries())
      .map(([k, e]) => ({ key: k, color: CAT[k]?.color ?? FALLBACK, emoji: CAT[k]?.emoji ?? '📌', label: CAT[k]?.tKey ?? k, events: e.sort((a, b) => (b.event.impactScore ?? 0) - (a.event.impactScore ?? 0)) }))
      .sort((a, b) => b.events.length - a.events.length);
    out.push({ country, cLat, cLng, items, cats, topColor: cats[0]?.color ?? FALLBACK });
  }
  return out.sort((a, b) => b.items.length - a.items.length);
};

// ═════════════════════════════════════════════════════════════════════════════
//  Sheet sub-components
// ═════════════════════════════════════════════════════════════════════════════
const EventRow = React.memo(({ item, language, theme, isDark, color, onPress }: {
  item: EWL; language: string; theme: any; isDark: boolean; color: string; onPress: () => void;
}) => {
  const title = item.event.titleTranslations?.[language] ?? item.event.titleTranslations?.en ?? '';
  const year = getYear(item.event);
  const city = item.label.includes(',') ? item.label.split(',')[0].trim() : '';
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.55} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, gap: 14 }}>
      <View style={{ width: 54, paddingVertical: 6, borderRadius: 10, alignItems: 'center', backgroundColor: color + '14', borderWidth: 1, borderColor: color + '20' }}>
        <Text style={{ fontSize: 11, fontWeight: '900', letterSpacing: 0.6, color }}>{year || '—'}</Text>
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={{ fontSize: 14.5, fontWeight: '600', lineHeight: 20, color: theme.text, letterSpacing: -0.1 }} numberOfLines={2}>{title}</Text>
        {city !== '' && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <MapPin size={10} color={theme.subtext} strokeWidth={2} style={{ opacity: 0.4 }} />
            <Text style={{ fontSize: 11, fontWeight: '500', opacity: 0.45, color: theme.subtext }}>{city}</Text>
          </View>
        )}
      </View>
      <ChevronRight size={14} color={theme.subtext} strokeWidth={2} style={{ opacity: 0.3 }} />
    </TouchableOpacity>
  );
});

const CatSection = ({ cat, language, tm, theme, isDark, onEvent }: {
  cat: CatGroup; language: string; tm: (k: string) => string; theme: any; isDark: boolean; onEvent: (e: any) => void;
}) => {
  const [open, setOpen] = useState(true);
  return (
    <View>
      <TouchableOpacity onPress={() => { haptic('light'); LayoutAnimation.configureNext(LayoutAnimation.create(280, 'easeInEaseOut', 'opacity')); setOpen(v => !v); }} activeOpacity={0.6}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingVertical: 13, backgroundColor: isDark ? cat.color + '08' : cat.color + '05' }}>
        <Text style={{ fontSize: 14 }}>{cat.emoji}</Text>
        <Text style={{ fontSize: 11, fontWeight: '800', letterSpacing: 1.5, color: cat.color, textTransform: 'uppercase' }}>{tm(cat.label)}</Text>
        <View style={{ paddingHorizontal: 7, paddingVertical: 2.5, borderRadius: 7, backgroundColor: cat.color + '18', borderWidth: 1, borderColor: cat.color + '25' }}>
          <Text style={{ fontSize: 10, fontWeight: '900', color: cat.color }}>{cat.events.length}</Text>
        </View>
        <View style={{ flex: 1 }} />
        <ChevronDown size={16} color={theme.subtext} strokeWidth={2} style={{ transform: [{ rotate: open ? '0deg' : '-90deg' }], opacity: 0.5 }} />
      </TouchableOpacity>
      {open && cat.events.map((item, i) => (
        <View key={`${getYear(item.event)}-${item.label}-${i}`}>
          <EventRow item={item} language={language} theme={theme} isDark={isDark} color={cat.color} onPress={() => onEvent(item.event)} />
          {i < cat.events.length - 1 && <View style={{ height: StyleSheet.hairlineWidth, marginLeft: 88, backgroundColor: isDark ? '#2A2520' : '#F0F0F0' }} />}
        </View>
      ))}
    </View>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
//  MAIN
// ═════════════════════════════════════════════════════════════════════════════
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

  // ─── renderKey: incremented every time we return to world view ────────────
  // This forces React to fully remount all world-view Markers so they always
  // reappear after exiting country close-up, regardless of Android caching.
  const [renderKey, setRenderKey] = useState(0);

  const [storyEvent, setStoryEvent] = useState<any>(null);
  const [storyVisible, setStoryVisible] = useState(false);
  const storyVisibleRef = useRef(false);
  const storyJustClosed = useRef(false);
  useEffect(() => { storyVisibleRef.current = storyVisible; }, [storyVisible]);

  const sheetY = useRef(new Animated.Value(SHEET_CLOSED)).current;
  const dragStart = useRef(0);
  const backdropOp = useRef(new Animated.Value(0)).current;

  const snapSheet = useCallback((to: number) => {
    Animated.parallel([
      Animated.spring(sheetY, { toValue: to, tension: 180, friction: 22, useNativeDriver: false }),
      Animated.timing(backdropOp, { toValue: to >= SHEET_HALF ? 0.35 : 0, duration: 250, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
    ]).start();
  }, [sheetY, backdropOp]);

  const closeSheet = useCallback(() => {
    snapSheet(SHEET_CLOSED);
    setTimeout(() => {
      setActiveCountry(null);
      activeCountryRef.current = null;
      // Bump renderKey so world-view markers fully remount and are visible again
      setRenderKey(k => k + 1);
    }, 300);
  }, [snapSheet]);

  const closeStory = useCallback(() => {
    setStoryVisible(false);
    storyJustClosed.current = true;
    setTimeout(() => { storyJustClosed.current = false; }, 700);
  }, []);

  const openStory = useCallback((ev: any) => {
    haptic('light');
    setStoryEvent(ev);
    setStoryVisible(true);
  }, []);

  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 5,
    onPanResponderGrant: () => { dragStart.current = (sheetY as any)._value; },
    onPanResponderMove: (_, g) => {
      const v = Math.max(0, Math.min(SHEET_FULL, dragStart.current - g.dy));
      sheetY.setValue(v);
      backdropOp.setValue(v >= SHEET_HALF ? Math.min(0.35, (v - SHEET_HALF) / (SHEET_FULL - SHEET_HALF) * 0.35) : 0);
    },
    onPanResponderRelease: (_, g) => {
      const c = (sheetY as any)._value;
      if (-g.vy > SNAP_VEL) { snapSheet(SHEET_FULL); return; }
      if (g.vy > SNAP_VEL) { c < SHEET_HALF * 0.6 ? closeSheet() : snapSheet(SHEET_HALF); return; }
      const near = [SHEET_CLOSED, SHEET_HALF, SHEET_FULL].reduce((p, t) => Math.abs(t - c) < Math.abs(p - c) ? t : p);
      near === SHEET_CLOSED ? closeSheet() : snapSheet(near);
    },
  })).current;

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const ps = Array.from({ length: 60 }, (_, i) => {
          const d = new Date(); d.setDate(d.getDate() - i);
          return api.get('/daily-content/by-date', { params: { date: d.toISOString().split('T')[0] } }).then(r => r.data?.events ?? []).catch(() => []);
        });
        const all = (await Promise.all(ps)).flat();
        const seen = new Set<string>();
        const uniq = all.filter((e: any) => { const id = `${e.eventDate}-${e.titleTranslations?.en}`; if (seen.has(id)) return false; seen.add(id); return true; });
        setAllEvents(uniq);
      } catch {}
      finally {
        setLoading(false);
      }
    })();
  }, []);

  const clusters = useMemo(() => buildClusters(allEvents), [allEvents]);
  const total = useMemo(() => clusters.reduce((s, c) => s + c.items.length, 0), [clusters]);
  const active = useMemo(() => clusters.find(c => c.country === activeCountry) ?? null, [clusters, activeCountry]);

  const zoomIn = useCallback((cl: Cluster) => {
    haptic('medium');
    setActiveCountry(cl.country);
    activeCountryRef.current = cl.country;
    if (cl.items.length === 1) {
      mapRef.current?.animateToRegion({ latitude: cl.items[0].lat - 1.5, longitude: cl.items[0].lng, latitudeDelta: 6, longitudeDelta: 6 }, 800);
    } else {
      try {
        mapRef.current?.fitToCoordinates(
          cl.items.map(i => ({ latitude: i.lat, longitude: i.lng })),
          { edgePadding: { top: 140, right: 60, bottom: Math.round(H * 0.5) + 60, left: 60 }, animated: true },
        );
      } catch {
        const lats = cl.items.map(i => i.lat), lngs = cl.items.map(i => i.lng);
        mapRef.current?.animateToRegion({
          latitude: (Math.min(...lats) + Math.max(...lats)) / 2,
          longitude: (Math.min(...lngs) + Math.max(...lngs)) / 2,
          latitudeDelta: Math.max((Math.max(...lats) - Math.min(...lats)) * 2.2, 5),
          longitudeDelta: Math.max((Math.max(...lngs) - Math.min(...lngs)) * 2.2, 5),
        }, 800);
      }
    }
    snapSheet(SHEET_HALF);
  }, [snapSheet]);

  const zoomOut = useCallback(() => {
    haptic('light');
    closeSheet();
    mapRef.current?.animateCamera(INIT_CAM, { duration: 900 });
  }, [closeSheet]);

  const onMapReady = useCallback(() => { mapRef.current?.animateCamera(INIT_CAM, { duration: 1200 }); }, []);

  const onMapPress = useCallback(() => {
    if (storyVisibleRef.current) return;
    if (storyJustClosed.current) return;
    if (activeCountryRef.current) zoomOut();
  }, [zoomOut]);

  const accent = isDark ? '#E8D5A3' : '#1A73E8';
  const panelBg = isDark ? '#1E1B16' : '#FFFFFF';
  const panelBrd = isDark ? '#2E2A22' : '#E0E0E0';

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <MapView
        ref={mapRef} style={StyleSheet.absoluteFill}
        provider={PROVIDER_GOOGLE} initialRegion={INIT_REGION}
        mapType="terrain" showsUserLocation showsCompass={false}
        showsScale={false} showsBuildings pitchEnabled rotateEnabled
        onMapReady={onMapReady} onPress={onMapPress}
      >
        {/* ══════════════════════════════════════════════════════════════
            WORLD VIEW — Native Google Maps pinColor markers.
            
            renderKey changes every time we return from country close-up,
            forcing a full remount so markers always reappear correctly.
            
            Each cluster shows the dominant category color.
            title prop shows country name + event count in native callout.
            ══════════════════════════════════════════════════════════════ */}
        {!activeCountry && clusters.map(c => (
          <Marker
            key={`c-${renderKey}-${c.country}`}
            coordinate={{ latitude: c.cLat, longitude: c.cLng }}
            pinColor={c.topColor}
            title={c.country}
            description={`${c.items.length} ${tm('events')} · ${c.cats.length} ${tm('categories')}`}
            onPress={() => zoomIn(c)}
            tracksViewChanges={false}
            zIndex={c.items.length}
          />
        ))}

        {/* ══════════════════════════════════════════════════════════════
            COUNTRY VIEW — Native pinColor markers. ZERO custom views.
            
            pinColor uses the native Google Maps marker tinting.
            This is the ONLY approach guaranteed to render on every
            Android device without any bitmap snapshot issues.
            
            title + description props give native callout on long-press.
            onPress directly opens the story.
            ══════════════════════════════════════════════════════════════ */}
        {activeCountry != null && active != null && active.items.map((item, idx) => {
          const catKey = ck(item.event);
          const color = CAT[catKey]?.color ?? FALLBACK;
          const title = item.event.titleTranslations?.[language] ?? item.event.titleTranslations?.en ?? '';
          return (
            <Marker
              key={`p-${activeCountry}-${idx}`}
              coordinate={{ latitude: item.lat, longitude: item.lng }}
              pinColor={color}
              title={title}
              description={`${getYear(item.event)} · ${item.label}`}
              onPress={() => openStory(item.event)}
              tracksViewChanges={false}
            />
          );
        })}
      </MapView>

      {/* ═══════════ TOP STATUS ═══════════ */}
      <View style={[S.topBar, { paddingTop: insets.top + 8 }]} pointerEvents="box-none">
        <View style={[S.pill, { backgroundColor: panelBg + 'EE', borderColor: panelBrd }]}>
          {loading ? (
            <>
              <ActivityIndicator size="small" color={accent} />
              <Text style={[S.pillT, { color: accent }]}>{tm('loading')}</Text>
            </>
          ) : activeCountry ? (
            <>
              <Layers size={13} color={accent} strokeWidth={2.5} />
              <Text style={[S.pillT, { color: accent }]}>{active?.items.length ?? 0} {tm('events')}</Text>
              <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: panelBrd, marginHorizontal: 2 }} />
              <Text style={[S.pillT, { color: theme.text, fontWeight: '800' }]}>{activeCountry}</Text>
            </>
          ) : (
            <>
              <Globe2 size={13} color={accent} strokeWidth={2.5} />
              <Text style={[S.pillT, { color: accent }]}>{total} {tm('events_across')} {clusters.length} {tm('countries')}</Text>
              <Sparkles size={11} color={isDark ? '#E8D5A3' : '#FBBC04'} strokeWidth={2.5} />
            </>
          )}
        </View>
      </View>

      {/* ═══════════ BACK ═══════════ */}
      {activeCountry && (
        <TouchableOpacity onPress={zoomOut} activeOpacity={0.7}
          style={[S.back, { top: insets.top + 56, backgroundColor: panelBg + 'F0', borderColor: panelBrd }]}>
          <Globe2 size={13} color={accent} strokeWidth={2.5} />
          <Text style={{ fontSize: 12, fontWeight: '700', color: accent }}>{tm('back_to_world')}</Text>
        </TouchableOpacity>
      )}

      {/* ═══════════ EMPTY ═══════════ */}
      {!loading && total === 0 && (
        <View style={S.emptyW} pointerEvents="none">
          <View style={[S.emptyC, { backgroundColor: panelBg + 'DD', borderColor: panelBrd }]}>
            <Globe2 size={36} color={theme.subtext + '30'} strokeWidth={1.5} />
            <Text style={{ fontSize: 14, fontWeight: '600', opacity: 0.5, color: theme.subtext }}>{tm('no_events')}</Text>
          </View>
        </View>
      )}

      {/* ═══════════ BACKDROP ═══════════ */}
      <Animated.View style={[S.bd, { opacity: backdropOp }]} pointerEvents="none" />

      {/* ═══════════ SHEET ═══════════ */}
      <Animated.View style={[S.sheet, { height: sheetY, backgroundColor: isDark ? '#151310' : '#FAFAFA', borderColor: isDark ? '#2E2A22' : '#E0E0E0' }]}>
        <View style={S.hArea} {...pan.panHandlers}>
          <View style={[S.hBar, { backgroundColor: isDark ? '#3D372E' : '#CDCDCD' }]} />
          {active && (
            <View style={S.sHdr}>
              <View style={S.sHdrL}>
                <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: active.topColor }} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ fontSize: 18, fontWeight: '800', letterSpacing: -0.3, color: theme.text }} numberOfLines={1}>{active.country}</Text>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: theme.subtext, opacity: 0.55 }}>{active.items.length} {tm('events')} · {active.cats.length} {tm('categories')}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={zoomOut} hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}>
                <View style={[S.xBtn, { backgroundColor: isDark ? '#2A2520' : '#F0F0F0', borderColor: isDark ? '#3A3228' : '#E0E0E0' }]}>
                  <X size={14} color={isDark ? '#C9A84C' : '#888'} strokeWidth={2.5} />
                </View>
              </TouchableOpacity>
            </View>
          )}
        </View>
        {active ? (
          <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 30 }} showsVerticalScrollIndicator={false} bounces={false}>
            {active.cats.map((cat, i) => (
              <React.Fragment key={cat.key}>
                <CatSection cat={cat} language={language} tm={tm} theme={theme} isDark={isDark} onEvent={openStory} />
                {i < active.cats.length - 1 && <View style={{ height: 1, marginHorizontal: 20, marginVertical: 4, backgroundColor: isDark ? '#2A2520' : '#EEE', borderRadius: 1 }} />}
              </React.Fragment>
            ))}
          </ScrollView>
        ) : (
          <View style={{ paddingVertical: 50, alignItems: 'center' }}>
            <MapPin size={28} color={theme.subtext + '20'} strokeWidth={1.5} />
            <Text style={{ fontSize: 13, fontWeight: '600', opacity: 0.35, color: theme.subtext, marginTop: 8 }}>{tm('tap_to_explore')}</Text>
          </View>
        )}
      </Animated.View>

      {/* ═══════════ LOADING ═══════════ */}
      {loading && (
        <View style={[S.loadOv, { backgroundColor: isDark ? 'rgba(18,16,12,0.92)' : 'rgba(255,255,255,0.92)' }]} pointerEvents="none">
          <View style={[S.loadC, { backgroundColor: panelBg, borderColor: panelBrd }]}>
            <Globe2 size={32} color={accent} strokeWidth={1.8} />
            <ActivityIndicator color={accent} size="large" style={{ marginTop: 14 }} />
            <Text style={{ fontSize: 13, fontWeight: '700', marginTop: 6, color: accent }}>{tm('loading')}</Text>
          </View>
        </View>
      )}

      {/* ═══════════ STORY (always mounted) ═══════════ */}
      <StoryModal visible={storyVisible} event={storyEvent} onClose={closeStory} theme={theme} />
    </View>
  );
}

const S = StyleSheet.create({
  topBar: { position: 'absolute', top: 0, left: 0, right: 0, alignItems: 'center', paddingHorizontal: 20 },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 28, borderWidth: 1,
    ...(Platform.OS === 'ios' ? { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 12 } : { elevation: 6 }),
  },
  pillT: { fontSize: 12, fontWeight: '700', letterSpacing: 0.2 },
  back: {
    position: 'absolute', left: 20, flexDirection: 'row', alignItems: 'center', gap: 7,
    borderRadius: 22, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 10,
    ...(Platform.OS === 'ios' ? { shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.1, shadowRadius: 8 } : { elevation: 5 }),
  },
  emptyW: { position: 'absolute', bottom: 120, left: 0, right: 0, alignItems: 'center' },
  emptyC: { alignItems: 'center', gap: 10, paddingHorizontal: 30, paddingVertical: 24, borderRadius: 20, borderWidth: 1 },
  bd: { ...StyleSheet.absoluteFillObject, backgroundColor: '#000' },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    borderTopLeftRadius: 28, borderTopRightRadius: 28, borderTopWidth: 1, overflow: 'hidden',
    ...(Platform.OS === 'ios' ? { shadowColor: '#000', shadowOffset: { width: 0, height: -6 }, shadowOpacity: 0.15, shadowRadius: 16 } : { elevation: 20 }),
  },
  hArea: { paddingTop: 12, paddingHorizontal: 20, paddingBottom: 4 },
  hBar: { width: 40, height: 4.5, borderRadius: 3, alignSelf: 'center', marginBottom: 14 },
  sHdr: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 10 },
  sHdrL: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1, marginRight: 14 },
  xBtn: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  loadOv: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  loadC: {
    alignItems: 'center', gap: 4, paddingHorizontal: 40, paddingVertical: 32, borderRadius: 24, borderWidth: 1,
    ...(Platform.OS === 'ios' ? { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 20 } : { elevation: 10 }),
  },
});