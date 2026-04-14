// components/TimelineScreen.tsx
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Clock } from 'lucide-react-native';
import React, { useCallback, useMemo, useState } from 'react';
import {
  Dimensions,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  type SharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { haptic } from '../utils/haptics';
import { StoryModal } from './StoryModal';

const { width: W, height: H } = Dimensions.get('window');
const SERIF = Platform.OS === 'ios' ? 'Georgia' : 'serif';

// ── Compact sizes — fits ~6-7 items on screen ───────────────────────────────
const ITEM_H = 72;
const ITEM_GAP = 6;
const ITEM_TOTAL = ITEM_H + ITEM_GAP;
const ERA_H = 50;
const ERA_TOTAL = ERA_H + ITEM_GAP;

// ── Arc geometry ────────────────────────────────────────────────────────────
// Imagine a huge circle to the LEFT of the spine. Items sit on its rim.
// The item at viewport-center is at the 3-o'clock position (rightmost).
// Items above/below curve away toward 12/6-o'clock (leftward + smaller).
const ARC_SHIFT = W * 0.18;          // max horizontal push at center
const FOCUS_ZONE = H * 0.44;         // half-height of the effect window
const CENTER_Y = 56;                 // header height offset

// ── Helpers ─────────────────────────────────────────────────────────────────
const CAT_COLORS: Record<string, string> = {
  war_conflict: '#E84545', tech_innovation: '#3E7BFA', science_discovery: '#A855F7',
  politics_state: '#F59E0B', culture_arts: '#10B981', natural_disaster: '#F97316',
  exploration: '#06B6D4', religion_phil: '#8B6F47',
};
const CAT_TAG: Record<string, string> = {
  war_conflict: 'WAR', tech_innovation: 'TECH', science_discovery: 'SCI',
  politics_state: 'POL', culture_arts: 'ART', natural_disaster: 'NAT',
  exploration: 'EXP', religion_phil: 'REL',
};
const extractYear = (ev: any): number => {
  const r = String(ev?.eventDate ?? ev?.event_date ?? ev?.year ?? '').trim();
  if (/^\d{4}$/.test(r)) return parseInt(r);
  if (r.includes('-') && r.split('-')[0].length === 4) return parseInt(r.split('-')[0]);
  return 0;
};
const catColor = (c?: string) => CAT_COLORS[(c ?? '').toLowerCase()] ?? '#8B7355';
const catTag = (c?: string) => CAT_TAG[(c ?? '').toLowerCase()] ?? 'HIS';
const centuryLabel = (y: number) => {
  if (y <= 0) return 'Ancient';
  const n = Math.ceil(y / 100);
  const s = n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th';
  return `${n}${s} Century`;
};

// ── Types ───────────────────────────────────────────────────────────────────
type TItem =
  | { k: 'era'; century: number; label: string; count: number; y: number; h: number }
  | { k: 'ev';  event: any;      y: number; h: number };
interface Props { allEvents: any[] }

// ══════════════════════════════════════════════════════════════════════════════
// EVENT CARD — compact, arc-animated
// ══════════════════════════════════════════════════════════════════════════════
const EvCard = React.memo(({
  event, yOff, scrollY, theme, isDark, language, gold, onPress,
}: {
  event: any; yOff: number; scrollY: SharedValue<number>;
  theme: any; isDark: boolean; language: string; gold: string;
  onPress: () => void;
}) => {
  const year = extractYear(event);
  const title = event.titleTranslations?.[language] ?? event.titleTranslations?.en ?? '';
  const img = event.gallery?.[0];
  const cc = catColor(event.category);
  const ct = catTag(event.category);
  const mid = yOff + ITEM_H / 2;

  // ── Arc animation ──
  const cardStyle = useAnimatedStyle(() => {
    const vc = scrollY.value + H / 2 - CENTER_Y;
    const d = mid - vc;                           // signed distance
    const ad = Math.abs(d);
    const t = Math.min(ad / FOCUS_ZONE, 1);       // 0 at center → 1 at edge
    const angle = t * (Math.PI / 2);

    // Circular translateX: cos(0)=1 → cos(π/2)=0
    const tx = ARC_SHIFT * Math.cos(angle);

    // Scale: big at center, small at edges
    const sc = interpolate(t, [0, 0.35, 1], [1.15, 0.98, 0.78], Extrapolation.CLAMP);

    // Opacity
    const op = interpolate(t, [0, 0.4, 1], [1, 0.7, 0.3], Extrapolation.CLAMP);

    // Subtle rotation following the arc tangent
    const rot = interpolate(d, [-FOCUS_ZONE, 0, FOCUS_ZONE], [2, 0, -2], Extrapolation.CLAMP);

    return {
      transform: [{ translateX: tx }, { scale: sc }, { rotate: `${rot}deg` }],
      opacity: op,
    };
  });

  // Spine node
  const nodeStyle = useAnimatedStyle(() => {
    const vc = scrollY.value + H / 2 - CENTER_Y;
    const t = Math.min(Math.abs(mid - vc) / (FOCUS_ZONE * 0.5), 1);
    return {
      transform: [{ scale: interpolate(t, [0, 1], [1.9, 0.6], Extrapolation.CLAMP) }],
      opacity: interpolate(t, [0, 1], [1, 0.2], Extrapolation.CLAMP),
    };
  });

  // Connector stretches with the arc shift
  const connStyle = useAnimatedStyle(() => {
    const vc = scrollY.value + H / 2 - CENTER_Y;
    const t = Math.min(Math.abs(mid - vc) / FOCUS_ZONE, 1);
    const w = interpolate(t, [0, 1], [20, 5], Extrapolation.CLAMP);
    const o = interpolate(t, [0, 1], [0.45, 0.06], Extrapolation.CLAMP);
    return { width: w, opacity: o };
  });

  return (
    <View style={[cs.row, { height: ITEM_H, marginBottom: ITEM_GAP }]}>
      {/* Spine */}
      <View style={cs.spine}>
        <View style={[cs.line, { backgroundColor: theme.border }]} />
        <Animated.View style={[cs.node, { backgroundColor: cc, shadowColor: cc }, nodeStyle]} />
        <View style={[cs.line, { backgroundColor: theme.border }]} />
      </View>

      {/* Connector bridge */}
      <Animated.View style={[cs.conn, { backgroundColor: cc }, connStyle]} />

      {/* Card body */}
      <Animated.View style={[cs.wrap, cardStyle]}>
        <TouchableOpacity onPress={onPress} activeOpacity={0.82} style={{ flex: 1 }}>
          <View style={[cs.card, {
            backgroundColor: isDark ? '#0F0F14' : '#FAFAF8',
            borderColor: isDark ? '#1C1C24' : '#ECEAE5',
          }]}>
            {/* Thumbnail */}
            {img ? (
              <View style={cs.imgBox}>
                <Image source={{ uri: img }} style={cs.img} contentFit="cover" transition={250} />
                <LinearGradient colors={['transparent', 'rgba(0,0,0,0.55)']} style={cs.imgFade} />
              </View>
            ) : (
              <View style={[cs.imgBox, { backgroundColor: cc + '08' }]}>
                <Text style={[cs.imgYear, { color: cc }]}>{year}</Text>
              </View>
            )}

            {/* Text */}
            <View style={cs.body}>
              <View style={cs.meta}>
                <View style={[cs.dot, { backgroundColor: cc }]} />
                <Text style={[cs.tag, { color: cc }]}>{ct}</Text>
                <Text style={[cs.yr, { color: theme.subtext }]}>{year}</Text>
              </View>
              <Text style={[cs.title, { color: theme.text }]} numberOfLines={2}>{title}</Text>
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
});

const cs = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  spine: { width: 26, alignItems: 'center' },
  line: { flex: 1, width: 1.5, borderRadius: 1 },
  node: {
    width: 7, height: 7, borderRadius: 4, zIndex: 2,
    shadowOpacity: 0.6, shadowRadius: 6, shadowOffset: { width: 0, height: 0 }, elevation: 3,
  },
  conn: { height: 1.5, borderRadius: 1, marginLeft: -1 },
  wrap: { flex: 1, marginRight: 12 },
  card: {
    flex: 1, flexDirection: 'row', borderRadius: 14, overflow: 'hidden', borderWidth: 1,
  },
  imgBox: { width: 58, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  img: { width: 58, height: '100%' },
  imgFade: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 20 },
  imgYear: { fontSize: 15, fontWeight: '900', opacity: 0.2, letterSpacing: -0.5 },
  body: { flex: 1, paddingHorizontal: 10, paddingVertical: 8, justifyContent: 'center', gap: 3 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dot: { width: 4, height: 4, borderRadius: 2 },
  tag: { fontSize: 8, fontWeight: '800', letterSpacing: 1 },
  yr: { fontSize: 9, fontWeight: '600', opacity: 0.3, marginLeft: 'auto' },
  title: { fontSize: 12, fontWeight: '700', lineHeight: 16, letterSpacing: -0.1, fontFamily: SERIF },
});

// ══════════════════════════════════════════════════════════════════════════════
// ERA DIVIDER — century separator, also arc-animated
// ══════════════════════════════════════════════════════════════════════════════
const EraCard = React.memo(({
  century, label, count, yOff, scrollY, theme, isDark, gold,
}: {
  century: number; label: string; count: number; yOff: number;
  scrollY: SharedValue<number>; theme: any; isDark: boolean; gold: string;
}) => {
  const mid = yOff + ERA_H / 2;

  const style = useAnimatedStyle(() => {
    const vc = scrollY.value + H / 2 - CENTER_Y;
    const d = mid - vc;
    const ad = Math.abs(d);
    const t = Math.min(ad / FOCUS_ZONE, 1);
    const angle = t * (Math.PI / 2);
    const tx = ARC_SHIFT * 0.6 * Math.cos(angle);
    const sc = interpolate(t, [0, 1], [1.1, 0.82], Extrapolation.CLAMP);
    const op = interpolate(t, [0, 0.5, 1], [1, 0.75, 0.35], Extrapolation.CLAMP);
    return {
      transform: [{ translateX: tx }, { scale: sc }],
      opacity: op,
    };
  });

  // Pulsing glow on the era node
  const nodeStyle = useAnimatedStyle(() => {
    const vc = scrollY.value + H / 2 - CENTER_Y;
    const t = Math.min(Math.abs(mid - vc) / (FOCUS_ZONE * 0.4), 1);
    return {
      transform: [{ scale: interpolate(t, [0, 1], [2.5, 0.8], Extrapolation.CLAMP) }],
      opacity: interpolate(t, [0, 1], [1, 0.25], Extrapolation.CLAMP),
    };
  });

  const glowStyle = useAnimatedStyle(() => {
    const vc = scrollY.value + H / 2 - CENTER_Y;
    const t = Math.min(Math.abs(mid - vc) / (FOCUS_ZONE * 0.3), 1);
    return {
      opacity: interpolate(t, [0, 1], [0.35, 0], Extrapolation.CLAMP),
      transform: [{ scale: interpolate(t, [0, 1], [4, 1], Extrapolation.CLAMP) }],
    };
  });

  return (
    <View style={[es.row, { height: ERA_H, marginBottom: ITEM_GAP }]}>
      {/* Spine with glowing node */}
      <View style={es.spine}>
        <View style={[es.line, { backgroundColor: gold + '50' }]} />
        <View style={es.nodeWrap}>
          <Animated.View style={[es.glow, { backgroundColor: gold }, glowStyle]} />
          <Animated.View style={[es.node, { backgroundColor: gold, shadowColor: gold }, nodeStyle]} />
        </View>
        <View style={[es.line, { backgroundColor: gold + '50' }]} />
      </View>

      {/* Label card */}
      <Animated.View style={[es.wrap, style]}>
        <View style={[es.card, {
          backgroundColor: isDark ? gold + '0A' : gold + '08',
          borderColor: gold + '22',
        }]}>
          <View style={[es.badge, { backgroundColor: gold }]}>
            <Text style={es.badgeNum}>{century}</Text>
          </View>
          <View style={es.texts}>
            <Text style={[es.label, { color: gold }]}>{label}</Text>
            <Text style={[es.count, { color: theme.subtext }]}>
              {count} event{count !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>
      </Animated.View>
    </View>
  );
});

const es = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  spine: { width: 26, alignItems: 'center' },
  line: { flex: 1, width: 1.5, borderRadius: 1 },
  nodeWrap: { alignItems: 'center', justifyContent: 'center' },
  glow: { position: 'absolute', width: 7, height: 7, borderRadius: 4 },
  node: {
    width: 7, height: 7, borderRadius: 4, zIndex: 3,
    shadowOpacity: 0.55, shadowRadius: 8, shadowOffset: { width: 0, height: 0 }, elevation: 5,
  },
  wrap: { flex: 1, marginRight: 12 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, borderWidth: 1,
  },
  badge: { width: 24, height: 24, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  badgeNum: { color: '#000', fontSize: 9, fontWeight: '900', letterSpacing: 0.2 },
  texts: { flex: 1 },
  label: { fontSize: 13, fontWeight: '800', letterSpacing: -0.2, fontFamily: SERIF },
  count: { fontSize: 9, fontWeight: '600', opacity: 0.4, letterSpacing: 0.4, marginTop: 1 },
});

// ══════════════════════════════════════════════════════════════════════════════
// MAIN
// ══════════════════════════════════════════════════════════════════════════════
export default function TimelineScreen({ allEvents }: Props) {
  const { theme, isDark, isPremium } = useTheme();
  const { language, t } = useLanguage();
  const insets = useSafeAreaInsets();
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const scrollY = useSharedValue(0);
  const gold = isPremium ? '#D4A843' : theme.gold;

  // Build items with pre-computed Y offsets
  const { items, nEvents, nEras } = useMemo(() => {
    const sorted = allEvents.filter(x => extractYear(x) > 0).sort((a, b) => extractYear(a) - extractYear(b));
    const out: TItem[] = [];
    let lastC = -1, y = 0;
    const cc = new Map<number, number>();
    for (const x of sorted) { const k = Math.ceil(extractYear(x) / 100); cc.set(k, (cc.get(k) ?? 0) + 1); }
    let eras = 0;
    for (const x of sorted) {
      const k = Math.ceil(extractYear(x) / 100);
      if (k !== lastC) {
        out.push({ k: 'era', century: k, label: centuryLabel(k * 100), count: cc.get(k) ?? 0, y, h: ERA_H });
        y += ERA_TOTAL;
        lastC = k;
        eras++;
      }
      out.push({ k: 'ev', event: x, y, h: ITEM_H });
      y += ITEM_TOTAL;
    }
    return { items: out, nEvents: sorted.length, nEras: eras };
  }, [allEvents]);

  const scrollHandler = useAnimatedScrollHandler({ onScroll: (ev) => { scrollY.value = ev.contentOffset.y; } });

  const press = useCallback((ev: any) => { haptic('light'); setSelectedEvent(ev); }, []);

  const renderItem = useCallback(({ item }: { item: TItem }) => {
    if (item.k === 'era') {
      return <EraCard century={item.century} label={item.label} count={item.count} yOff={item.y} scrollY={scrollY} theme={theme} isDark={isDark} gold={gold} />;
    }
    return <EvCard event={item.event} yOff={item.y} scrollY={scrollY} theme={theme} isDark={isDark} language={language} gold={gold} onPress={() => press(item.event)} />;
  }, [theme, isDark, language, gold, scrollY, press]);

  const getLayout = useCallback((_: any, i: number) => {
    const item = items[i];
    if (!item) return { length: ITEM_TOTAL, offset: 0, index: i };
    return { length: item.h + ITEM_GAP, offset: item.y, index: i };
  }, [items]);

  const keyEx = useCallback((item: TItem, i: number) => item.k === 'era' ? `e${item.century}` : `v${i}`, []);

  return (
    <View style={[m.root, { backgroundColor: theme.background }]}>
      {isPremium && <LinearGradient colors={['#0A0815', '#05040A']} style={StyleSheet.absoluteFill} />}

      {/* Header */}
      <View style={[m.hdr, { paddingTop: insets.top + 4 }]}>
        <View style={m.hdrRow}>
          <View style={[m.hdrIcon, { backgroundColor: gold + '15' }]}>
            <Clock size={14} color={gold} strokeWidth={2.2} />
          </View>
          <View>
            <Text style={[m.hdrTitle, { color: theme.text }]}>{t('timeline') || 'Timeline'}</Text>
            <Text style={[m.hdrSub, { color: theme.subtext }]}>{nEvents} events · {nEras} centuries</Text>
          </View>
        </View>
      </View>
      <View style={[m.sep, { backgroundColor: theme.border }]} />

      {nEvents === 0 ? (
        <View style={m.empty}>
          <View style={[m.emptyRing, { borderColor: theme.subtext + '20' }]}>
            <Clock size={24} color={theme.subtext + '40'} strokeWidth={1.5} />
          </View>
          <Text style={[m.emptyT, { color: theme.text }]}>{t('no_events') || 'No events yet'}</Text>
          <Text style={[m.emptyS, { color: theme.subtext }]}>Events will appear as you explore more days</Text>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          {/* Spine background */}
          <View style={[m.spineBg, { backgroundColor: theme.border }]} pointerEvents="none" />

          {/* Focus ring on the spine at viewport center */}
          <View style={[m.focusWrap, { top: H / 2 - CENTER_Y - 11 }]} pointerEvents="none">
            <View style={[m.focusRing, { borderColor: gold + '18' }]} />
            <View style={[m.focusDot, { backgroundColor: gold + '35' }]} />
          </View>

          <Animated.FlatList
            data={items}
            renderItem={renderItem}
            keyExtractor={keyEx}
            getItemLayout={getLayout}
            onScroll={scrollHandler}
            scrollEventThrottle={16}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              paddingTop: H * 0.45,
              paddingBottom: H * 0.45 + insets.bottom,
              paddingLeft: 8,
            }}
            removeClippedSubviews={Platform.OS === 'android'}
            maxToRenderPerBatch={18}
            windowSize={13}
          />
        </View>
      )}

      <StoryModal visible={!!selectedEvent} event={selectedEvent} onClose={() => setSelectedEvent(null)} theme={theme} />
    </View>
  );
}

const m = StyleSheet.create({
  root: { flex: 1 },
  hdr: { paddingHorizontal: 20, paddingBottom: 10 },
  hdrRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  hdrIcon: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  hdrTitle: { fontSize: 17, fontWeight: '800', letterSpacing: -0.3, fontFamily: SERIF },
  hdrSub: { fontSize: 10, fontWeight: '500', opacity: 0.4, marginTop: 1 },
  sep: { height: StyleSheet.hairlineWidth },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 40 },
  emptyRing: { width: 52, height: 52, borderRadius: 26, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  emptyT: { fontSize: 15, fontWeight: '700' },
  emptyS: { fontSize: 11.5, opacity: 0.4, textAlign: 'center', lineHeight: 17 },
  spineBg: { position: 'absolute', left: 21, top: 0, bottom: 0, width: 1.5, borderRadius: 1, opacity: 0.15, zIndex: 0 },
  focusWrap: { position: 'absolute', left: 8, width: 26, height: 22, alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  focusRing: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5 },
  focusDot: { position: 'absolute', width: 5, height: 5, borderRadius: 3 },
});
