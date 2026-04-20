// components/TimelineScreen.tsx
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Clock, Sparkles } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
  useDerivedValue,
  useSharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { haptic } from '../utils/haptics';
import { StoryModal } from './StoryModal';

const { width: W, height: H } = Dimensions.get('window');
const SERIF = Platform.OS === 'ios' ? 'Georgia' : 'serif';

// ── Responsive sizing ──────────────────────────────────────────────────────
const IS_SMALL = W < 360;
const IS_LARGE = W > 420;

const ITEM_H      = IS_SMALL ? 92  : IS_LARGE ? 108 : 100;
const ERA_H       = IS_SMALL ? 100 : IS_LARGE ? 116 : 108;
const ITEM_GAP    = 10;
const ITEM_TOTAL  = ITEM_H + ITEM_GAP;
const ERA_TOTAL   = ERA_H  + ITEM_GAP;

const SPINE_X     = 52;   // spine center from left edge
const YEAR_W      = 62;   // year capsule width
const YEAR_H      = 26;
const HEADER_H    = 56;   // header bar height (ignoring safe area)

// ── Category system ────────────────────────────────────────────────────────
const CAT: Record<string, { color: string; tag: string; tKey: string }> = {
  war_conflict:      { color: '#E84545', tag: 'WAR',  tKey: 'war' },
  tech_innovation:   { color: '#3E7BFA', tag: 'TECH', tKey: 'technology' },
  science_discovery: { color: '#A855F7', tag: 'SCI',  tKey: 'science' },
  politics_state:    { color: '#F59E0B', tag: 'POL',  tKey: 'politics' },
  culture_arts:      { color: '#10B981', tag: 'ART',  tKey: 'culture' },
  natural_disaster:  { color: '#F97316', tag: 'NAT',  tKey: 'nature' },
  exploration:       { color: '#06B6D4', tag: 'EXP',  tKey: 'exploration' },
  religion_phil:     { color: '#8B6F47', tag: 'REL',  tKey: 'religion' },
};
const DEF_CAT = { color: '#8B7355', tag: 'HIS', tKey: 'history' };
const getCat = (c?: string) => CAT[(c ?? '').toLowerCase()] ?? DEF_CAT;

// ── Local translations ─────────────────────────────────────────────────────
type TKeys = 'events' | 'event' | 'centuries' | 'century' |
             'empty_title' | 'empty_desc' | 'ancient' | 'chapter' |
             'bc' | 'of' | 'jump_top';
const TL: Record<string, Record<TKeys, string>> = {
  en: { events: 'events', event: 'event', centuries: 'centuries', century: 'century',
        empty_title: 'Your timeline awaits', empty_desc: 'Events you explore will be woven into history here.',
        ancient: 'Ancient Era', chapter: 'Chapter', bc: 'BC', of: 'of', jump_top: 'Back to start' },
  ro: { events: 'evenimente', event: 'eveniment', centuries: 'secole', century: 'secol',
        empty_title: 'Cronologia te așteaptă', empty_desc: 'Evenimentele pe care le explorezi vor fi adăugate aici.',
        ancient: 'Era Antică', chapter: 'Capitolul', bc: 'î.Hr.', of: 'din', jump_top: 'Sus' },
  fr: { events: 'événements', event: 'événement', centuries: 'siècles', century: 'siècle',
        empty_title: 'Votre chronologie attend', empty_desc: 'Les événements que vous explorez apparaîtront ici.',
        ancient: 'Ère Ancienne', chapter: 'Chapitre', bc: 'av. J.-C.', of: 'de', jump_top: 'Haut' },
  de: { events: 'Ereignisse', event: 'Ereignis', centuries: 'Jahrhunderte', century: 'Jahrhundert',
        empty_title: 'Deine Zeitleiste wartet', empty_desc: 'Erkundete Ereignisse erscheinen hier in der Geschichte.',
        ancient: 'Antike', chapter: 'Kapitel', bc: 'v. Chr.', of: 'von', jump_top: 'Nach oben' },
  es: { events: 'eventos', event: 'evento', centuries: 'siglos', century: 'siglo',
        empty_title: 'Tu cronología espera', empty_desc: 'Los eventos que explores aparecerán aquí.',
        ancient: 'Era Antigua', chapter: 'Capítulo', bc: 'a.C.', of: 'de', jump_top: 'Arriba' },
};
const tl = (lang: string, k: TKeys) => (TL[lang] ?? TL.en)[k] ?? TL.en[k];

// ── Helpers ─────────────────────────────────────────────────────────────────
const extractYear = (ev: any): number => {
  const r = String(ev?.eventDate ?? ev?.event_date ?? ev?.year ?? '').trim();
  if (/^-?\d{1,4}$/.test(r)) return parseInt(r);
  if (r.includes('-') && r.split('-')[0].length === 4) return parseInt(r.split('-')[0]);
  const m = r.match(/-?\d{1,4}/);
  return m ? parseInt(m[0]) : 0;
};

const toRoman = (n: number): string => {
  if (n <= 0) return '—';
  const map: [string, number][] = [
    ['M',1000],['CM',900],['D',500],['CD',400],['C',100],['XC',90],
    ['L',50],['XL',40],['X',10],['IX',9],['V',5],['IV',4],['I',1],
  ];
  let r = '', x = n;
  for (const [s, v] of map) { while (x >= v) { r += s; x -= v; } }
  return r;
};

const centuryLabel = (n: number, lang: string): string => {
  const r = toRoman(n);
  switch (lang) {
    case 'ro': return `Secolul ${r}`;
    case 'fr': return `${r}${n === 1 ? 'ᵉʳ' : 'ᵉ'} siècle`;
    case 'es': return `Siglo ${r}`;
    case 'de': return `${n}. Jahrhundert`;
    default: {
      const s = n % 100 === 11 || n % 100 === 12 || n % 100 === 13
        ? 'th' : n % 10 === 1 ? 'st' : n % 10 === 2 ? 'nd' : n % 10 === 3 ? 'rd' : 'th';
      return `${n}${s} Century`;
    }
  }
};

const formatYear = (y: number, lang: string): string =>
  y < 0 ? `${Math.abs(y)} ${tl(lang, 'bc')}` : `${y}`;

const centuryRange = (century: number): string => {
  const start = (century - 1) * 100 + 1;
  const end = century * 100;
  return `${start}–${end}`;
};

// ── Types ───────────────────────────────────────────────────────────────────
type TItem =
  | { k: 'era'; century: number; count: number; y: number; h: number }
  | { k: 'ev';  event: any;      y: number; h: number };
interface Props { allEvents: any[] }

// ══════════════════════════════════════════════════════════════════════════════
// EVENT ROW — year capsule on spine + card with image
// ══════════════════════════════════════════════════════════════════════════════
const EvRow = React.memo(({
  event, yOff, scrollY, theme, isDark, language, onPress,
}: {
  event: any; yOff: number; scrollY: SharedValue<number>;
  theme: any; isDark: boolean; language: string; onPress: () => void;
}) => {
  const year = extractYear(event);
  const yearStr = formatYear(year, language);
  const title = event.titleTranslations?.[language] ?? event.titleTranslations?.en ?? '';
  const img = event.gallery?.[0];
  const { color: cc, tag: ct } = getCat(event.category);
  const mid = yOff + ITEM_H / 2;
  const focusZone = H * 0.32;

  // Distance-based focus: item in viewport center gets highlighted
  const cardStyle = useAnimatedStyle(() => {
    const vc = scrollY.value + H / 2;
    const d = Math.abs(mid - vc);
    const t = Math.min(d / focusZone, 1);
    const sc = interpolate(t, [0, 1], [1.02, 0.97], Extrapolation.CLAMP);
    const op = interpolate(t, [0, 1], [1, 0.55], Extrapolation.CLAMP);
    return { transform: [{ scale: sc }], opacity: op };
  });

  const yearStyle = useAnimatedStyle(() => {
    const vc = scrollY.value + H / 2;
    const t = Math.min(Math.abs(mid - vc) / focusZone, 1);
    return {
      transform: [{ scale: interpolate(t, [0, 1], [1.08, 0.94], Extrapolation.CLAMP) }],
    };
  });

  return (
    <View style={[rs.row, { height: ITEM_H, marginBottom: ITEM_GAP }]}>
      {/* Spine line (continuous vertical) */}
      <View style={[rs.spineLine, { backgroundColor: theme.border, left: SPINE_X - 0.75 }]} />

      {/* Year capsule anchored on spine */}
      <Animated.View style={[rs.yearWrap, yearStyle, {
        left: SPINE_X - YEAR_W / 2,
        backgroundColor: isDark ? '#15130F' : '#FFFFFF',
        borderColor: cc + '55',
      }]}>
        <View style={[rs.yearAccent, { backgroundColor: cc }]} />
        <Text style={[rs.yearText, { color: cc, fontSize: yearStr.length > 5 ? 10 : 12 }]} numberOfLines={1}>
          {yearStr}
        </Text>
      </Animated.View>

      {/* Horizontal connector */}
      <View style={[rs.conn, { backgroundColor: cc + '30', left: SPINE_X + YEAR_W / 2 - 2 }]} />

      {/* Card */}
      <Animated.View style={[rs.cardWrap, cardStyle, { left: SPINE_X + YEAR_W / 2 + 14 }]}>
        <TouchableOpacity onPress={onPress} activeOpacity={0.82} style={rs.cardTouch}>
          <View style={[rs.card, {
            backgroundColor: isDark ? '#0F0E0C' : '#FFFFFF',
            borderColor: isDark ? '#1E1B17' : '#EEEAE3',
            shadowColor: cc,
          }]}>
            {/* Image */}
            {img ? (
              <View style={rs.imgBox}>
                <Image source={{ uri: img }} style={rs.img} contentFit="cover" transition={240} />
                <LinearGradient
                  colors={['transparent', cc + '20']}
                  style={StyleSheet.absoluteFill}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                />
              </View>
            ) : (
              <View style={[rs.imgBox, { backgroundColor: cc + '12' }]}>
                <Text style={[rs.imgPlaceholder, { color: cc }]}>{ct}</Text>
              </View>
            )}

            {/* Body */}
            <View style={rs.body}>
              <View style={rs.tagRow}>
                <View style={[rs.tagDot, { backgroundColor: cc }]} />
                <Text style={[rs.tagText, { color: cc }]}>{ct}</Text>
              </View>
              <Text style={[rs.title, { color: theme.text }]} numberOfLines={3}>{title}</Text>
            </View>

            {/* Left color bar */}
            <View style={[rs.sideBar, { backgroundColor: cc }]} />
          </View>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
});

const rs = StyleSheet.create({
  row: { position: 'relative' },
  spineLine: { position: 'absolute', top: 0, bottom: -ITEM_GAP, width: 1.5, borderRadius: 1, opacity: 0.5 },
  yearWrap: {
    position: 'absolute', top: (ITEM_H - YEAR_H) / 2,
    width: YEAR_W, height: YEAR_H, borderRadius: YEAR_H / 2,
    borderWidth: 1, flexDirection: 'row', alignItems: 'center',
    paddingLeft: 8, paddingRight: 10, zIndex: 3,
  },
  yearAccent: { width: 5, height: 5, borderRadius: 3, marginRight: 6 },
  yearText: { fontWeight: '800', letterSpacing: 0.3, flex: 1, textAlign: 'center', fontFamily: SERIF },
  conn: { position: 'absolute', top: ITEM_H / 2 - 0.75, width: 14, height: 1.5, borderRadius: 1, zIndex: 1 },
  cardWrap: {
    position: 'absolute', top: 0, bottom: 0, right: 14,
  },
  cardTouch: { flex: 1 },
  card: {
    flex: 1, flexDirection: 'row', borderRadius: 16, overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.06, shadowRadius: 10,
    elevation: 2,
  },
  sideBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 2.5, opacity: 0.85 },
  imgBox: {
    width: ITEM_H - 12, height: ITEM_H - 12, margin: 6,
    borderRadius: 11, overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center',
  },
  img: { width: '100%', height: '100%' },
  imgPlaceholder: { fontSize: 14, fontWeight: '900', opacity: 0.5, letterSpacing: 1.5 },
  body: { flex: 1, paddingHorizontal: 12, paddingVertical: 10, justifyContent: 'center', gap: 6 },
  tagRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tagDot: { width: 5, height: 5, borderRadius: 3 },
  tagText: { fontSize: 9, fontWeight: '800', letterSpacing: 1.5 },
  title: { fontSize: 13.5, fontWeight: '700', lineHeight: 18, letterSpacing: -0.1, fontFamily: SERIF },
});

// ══════════════════════════════════════════════════════════════════════════════
// ERA ROW — chapter divider
// ══════════════════════════════════════════════════════════════════════════════
const EraRow = React.memo(({
  century, count, yOff, scrollY, theme, isDark, gold, language,
}: {
  century: number; count: number; yOff: number;
  scrollY: SharedValue<number>; theme: any; isDark: boolean; gold: string; language: string;
}) => {
  const mid = yOff + ERA_H / 2;
  const focusZone = H * 0.35;
  const roman = toRoman(century);
  const label = centuryLabel(century, language);
  const range = centuryRange(century);

  const style = useAnimatedStyle(() => {
    const vc = scrollY.value + H / 2;
    const t = Math.min(Math.abs(mid - vc) / focusZone, 1);
    const sc = interpolate(t, [0, 1], [1.015, 0.98], Extrapolation.CLAMP);
    const op = interpolate(t, [0, 1], [1, 0.7], Extrapolation.CLAMP);
    return { transform: [{ scale: sc }], opacity: op };
  });

  const glowStyle = useAnimatedStyle(() => {
    const vc = scrollY.value + H / 2;
    const t = Math.min(Math.abs(mid - vc) / (focusZone * 0.6), 1);
    return {
      opacity: interpolate(t, [0, 1], [0.35, 0], Extrapolation.CLAMP),
      transform: [{ scale: interpolate(t, [0, 1], [2.2, 0.6], Extrapolation.CLAMP) }],
    };
  });

  return (
    <View style={[es.row, { height: ERA_H, marginBottom: ITEM_GAP }]}>
      {/* Gold spine segment */}
      <View style={[es.spineGold, { backgroundColor: gold + '80', left: SPINE_X - 1 }]} />

      {/* Glowing node */}
      <Animated.View style={[es.glow, { backgroundColor: gold, left: SPINE_X - 12 }, glowStyle]} />

      {/* Card */}
      <Animated.View style={[es.wrap, style]}>
        <View style={[es.card, {
          backgroundColor: isDark ? '#15110A' : '#FFFBF0',
          borderColor: gold + '35',
        }]}>
          {/* Background gradient accent */}
          <LinearGradient
            colors={[gold + '18', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />

          {/* Roman numeral badge */}
          <View style={[es.romanWrap, { borderColor: gold + '55' }]}>
            <View style={[es.romanInner, { backgroundColor: gold }]}>
              <Text style={es.romanText}>{roman}</Text>
            </View>
            <Sparkles size={10} color={gold} style={es.sparkle} />
          </View>

          {/* Text block */}
          <View style={es.texts}>
            <Text style={[es.chapterTag, { color: gold }]}>
              {tl(language, 'chapter').toUpperCase()} · {century}
            </Text>
            <Text style={[es.label, { color: theme.text }]} numberOfLines={1}>{label}</Text>
            <View style={es.metaRow}>
              <Text style={[es.range, { color: theme.subtext }]}>{range}</Text>
              <View style={[es.metaDot, { backgroundColor: theme.subtext + '60' }]} />
              <Text style={[es.count, { color: theme.subtext }]}>
                {count} {tl(language, count === 1 ? 'event' : 'events')}
              </Text>
            </View>
          </View>

          {/* Right ornament */}
          <View style={[es.ornament, { backgroundColor: gold + '15' }]} />
        </View>
      </Animated.View>
    </View>
  );
});

const es = StyleSheet.create({
  row: { position: 'relative' },
  spineGold: { position: 'absolute', top: 0, bottom: -ITEM_GAP, width: 2, borderRadius: 1 },
  glow: {
    position: 'absolute', top: ERA_H / 2 - 12, width: 24, height: 24, borderRadius: 12, zIndex: 1,
  },
  wrap: {
    position: 'absolute', top: 6, bottom: 6, left: SPINE_X + 18, right: 14,
  },
  card: {
    flex: 1, borderRadius: 14, borderWidth: 1, overflow: 'hidden',
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 14, paddingRight: 18,
  },
  romanWrap: {
    width: 52, height: 52, borderRadius: 14, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
    padding: 4,
  },
  romanInner: {
    flex: 1, alignSelf: 'stretch', borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  romanText: { color: '#000', fontSize: 13, fontWeight: '900', letterSpacing: 0.5, fontFamily: SERIF },
  sparkle: { position: 'absolute', top: -2, right: -2 },
  texts: { flex: 1, gap: 3 },
  chapterTag: { fontSize: 9.5, fontWeight: '800', letterSpacing: 2 },
  label: { fontSize: 16, fontWeight: '800', letterSpacing: -0.3, fontFamily: SERIF },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 2 },
  range: { fontSize: 10.5, fontWeight: '600', opacity: 0.55, letterSpacing: 0.3 },
  metaDot: { width: 3, height: 3, borderRadius: 1.5, opacity: 0.5 },
  count: { fontSize: 10.5, fontWeight: '600', opacity: 0.55 },
  ornament: {
    position: 'absolute', right: -18, top: -18, width: 80, height: 80, borderRadius: 40,
  },
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
  const gold = isPremium ? '#D4A843' : (theme.gold ?? '#C77E08');

  // Build items with pre-computed Y offsets
  const { items, nEvents, nEras, totalHeight, yearRange } = useMemo(() => {
    const sorted = allEvents.filter(x => extractYear(x) !== 0).sort((a, b) => extractYear(a) - extractYear(b));
    const out: TItem[] = [];
    let lastC = -Infinity, y = 0, eras = 0;
    const cc = new Map<number, number>();
    for (const x of sorted) {
      const yr = extractYear(x);
      const k = yr > 0 ? Math.ceil(yr / 100) : Math.floor(yr / 100);
      cc.set(k, (cc.get(k) ?? 0) + 1);
    }
    for (const x of sorted) {
      const yr = extractYear(x);
      const k = yr > 0 ? Math.ceil(yr / 100) : Math.floor(yr / 100);
      if (k !== lastC) {
        out.push({ k: 'era', century: k, count: cc.get(k) ?? 0, y, h: ERA_H });
        y += ERA_TOTAL;
        lastC = k;
        eras++;
      }
      out.push({ k: 'ev', event: x, y, h: ITEM_H });
      y += ITEM_TOTAL;
    }
    const first = sorted.length ? extractYear(sorted[0]) : 0;
    const last  = sorted.length ? extractYear(sorted[sorted.length - 1]) : 0;
    return { items: out, nEvents: sorted.length, nEras: eras, totalHeight: y, yearRange: { first, last } };
  }, [allEvents]);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (ev) => { scrollY.value = ev.contentOffset.y; },
  });

  // Progress bar fill (0–1)
  const progress = useDerivedValue(() => {
    const max = Math.max(1, totalHeight - H * 0.5);
    return Math.max(0, Math.min(1, scrollY.value / max));
  }, [totalHeight]);

  const progressStyle = useAnimatedStyle(() => ({
    height: `${progress.value * 100}%`,
  }));

  // Current-era badge (updates on scroll end — cheap, no per-frame work)
  const [displayCentury, setDisplayCentury] = useState(0);
  useEffect(() => {
    const first = items.find(i => i.k === 'era');
    if (first && first.k === 'era') setDisplayCentury(first.century);
  }, [items]);

  const onScrollJS = useCallback((e: any) => {
    const y = e.nativeEvent.contentOffset.y + H / 2;
    let c = 0;
    for (const it of items) {
      if (it.k === 'era' && it.y <= y) c = it.century;
    }
    if (c !== 0 && c !== displayCentury) setDisplayCentury(c);
  }, [items, displayCentury]);

  const press = useCallback((ev: any) => { haptic('light'); setSelectedEvent(ev); }, []);

  const renderItem = useCallback(({ item }: { item: TItem }) => {
    if (item.k === 'era') {
      return <EraRow century={item.century} count={item.count} yOff={item.y}
               scrollY={scrollY} theme={theme} isDark={isDark} gold={gold} language={language} />;
    }
    return <EvRow event={item.event} yOff={item.y} scrollY={scrollY}
             theme={theme} isDark={isDark} language={language} onPress={() => press(item.event)} />;
  }, [theme, isDark, language, gold, scrollY, press]);

  const getLayout = useCallback((_: any, i: number) => {
    const item = items[i];
    if (!item) return { length: ITEM_TOTAL, offset: 0, index: i };
    return { length: item.h + ITEM_GAP, offset: item.y, index: i };
  }, [items]);

  const keyEx = useCallback((item: TItem, i: number) =>
    item.k === 'era' ? `e${item.century}` : `v${i}-${extractYear(item.event)}`, []);

  return (
    <View style={[m.root, { backgroundColor: theme.background }]}>
      {isPremium && <LinearGradient colors={['#0A0815', '#05040A']} style={StyleSheet.absoluteFill} />}

      {/* ── HEADER ── */}
      <View style={[m.hdrWrap, { paddingTop: insets.top }]}>
        <LinearGradient
          colors={[theme.background, theme.background + 'F0', theme.background + '00']}
          style={[StyleSheet.absoluteFill, { height: insets.top + HEADER_H + 20 }]}
          pointerEvents="none"
        />
        <View style={m.hdr}>
          <View style={m.hdrLeft}>
            <View style={[m.hdrIcon, { backgroundColor: gold + '15', borderColor: gold + '30' }]}>
              <Clock size={14} color={gold} strokeWidth={2.2} />
            </View>
            <View>
              <Text style={[m.hdrTitle, { color: theme.text }]}>{t('timeline') || 'Timeline'}</Text>
              <Text style={[m.hdrSub, { color: theme.subtext }]}>
                {nEvents} {tl(language, nEvents === 1 ? 'event' : 'events')} · {nEras} {tl(language, nEras === 1 ? 'century' : 'centuries')}
              </Text>
            </View>
          </View>

          {/* Current era badge (right side) */}
          {displayCentury !== 0 && (
            <View style={[m.eraBadge, { backgroundColor: gold + '14', borderColor: gold + '30' }]}>
              <Text style={[m.eraBadgeText, { color: gold }]}>{toRoman(Math.abs(displayCentury))}</Text>
            </View>
          )}
        </View>
        <View style={[m.sep, { backgroundColor: theme.border }]} />
      </View>

      {nEvents === 0 ? (
        <View style={m.empty}>
          <View style={[m.emptyRing, { borderColor: gold + '25' }]}>
            <View style={[m.emptyInner, { backgroundColor: gold + '10' }]}>
              <Clock size={26} color={gold} strokeWidth={1.6} />
            </View>
          </View>
          <Text style={[m.emptyT, { color: theme.text }]}>{tl(language, 'empty_title')}</Text>
          <Text style={[m.emptyS, { color: theme.subtext }]}>{tl(language, 'empty_desc')}</Text>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          {/* Top fade overlay (fades items entering from top) */}
          <LinearGradient
            colors={[theme.background, theme.background + '00']}
            style={[m.fadeTop, { top: insets.top + HEADER_H, height: 40 }]}
            pointerEvents="none"
          />

          {/* Bottom fade overlay */}
          <LinearGradient
            colors={[theme.background + '00', theme.background]}
            style={[m.fadeBot, { height: 80, bottom: insets.bottom }]}
            pointerEvents="none"
          />

          {/* Scroll progress rail (right edge) */}
          <View style={[m.progRail, {
            backgroundColor: theme.border + '80',
            top: insets.top + HEADER_H + 20,
            bottom: insets.bottom + 20,
          }]} pointerEvents="none">
            <Animated.View style={[m.progFill, { backgroundColor: gold }, progressStyle]} />
          </View>

          {/* Year range labels on rail */}
          <View style={[m.railTop, { top: insets.top + HEADER_H + 8 }]} pointerEvents="none">
            <Text style={[m.railYear, { color: theme.subtext }]}>{formatYear(yearRange.first, language)}</Text>
          </View>
          <View style={[m.railBot, { bottom: insets.bottom + 8 }]} pointerEvents="none">
            <Text style={[m.railYear, { color: theme.subtext }]}>{formatYear(yearRange.last, language)}</Text>
          </View>

          {/* List */}
          <Animated.FlatList
            data={items}
            renderItem={renderItem}
            keyExtractor={keyEx}
            getItemLayout={getLayout}
            onScroll={scrollHandler}
            onMomentumScrollEnd={onScrollJS}
            onScrollEndDrag={onScrollJS}
            scrollEventThrottle={16}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              paddingTop: insets.top + HEADER_H + 16,
              paddingBottom: insets.bottom + 60,
              paddingRight: 24,
            }}
            removeClippedSubviews={Platform.OS === 'android'}
            maxToRenderPerBatch={12}
            windowSize={11}
            initialNumToRender={8}
          />
        </View>
      )}

      <StoryModal visible={!!selectedEvent} event={selectedEvent} onClose={() => setSelectedEvent(null)} theme={theme} />
    </View>
  );
}

const m = StyleSheet.create({
  root: { flex: 1 },

  // Header
  hdrWrap: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20 },
  hdr: {
    height: HEADER_H, paddingHorizontal: 20,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  hdrLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  hdrIcon: {
    width: 32, height: 32, borderRadius: 10, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  hdrTitle: { fontSize: 18, fontWeight: '800', letterSpacing: -0.3, fontFamily: SERIF },
  hdrSub: { fontSize: 10.5, fontWeight: '500', opacity: 0.5, marginTop: 1, letterSpacing: 0.2 },
  eraBadge: {
    minWidth: 40, height: 28, paddingHorizontal: 10, borderRadius: 9, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  eraBadgeText: { fontSize: 12, fontWeight: '900', letterSpacing: 0.5, fontFamily: SERIF },
  sep: { height: StyleSheet.hairlineWidth, opacity: 0.6 },

  // Empty state
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 40 },
  emptyRing: {
    width: 84, height: 84, borderRadius: 42, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center', padding: 8, marginBottom: 4,
  },
  emptyInner: { flex: 1, alignSelf: 'stretch', borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  emptyT: { fontSize: 17, fontWeight: '800', fontFamily: SERIF, letterSpacing: -0.3 },
  emptyS: { fontSize: 12.5, opacity: 0.5, textAlign: 'center', lineHeight: 19 },

  // Fades
  fadeTop: { position: 'absolute', left: 0, right: 0, zIndex: 5 },
  fadeBot: { position: 'absolute', left: 0, right: 0, zIndex: 5 },

  // Progress rail
  progRail: {
    position: 'absolute', right: 10, width: 2, borderRadius: 1,
    overflow: 'hidden', zIndex: 6,
  },
  progFill: { width: '100%', borderRadius: 1 },
  railTop: { position: 'absolute', right: 4, zIndex: 6 },
  railBot: { position: 'absolute', right: 4, zIndex: 6 },
  railYear: {
    fontSize: 8.5, fontWeight: '700', letterSpacing: 0.5, opacity: 0.45,
    transform: [{ rotate: '90deg' }],
    width: 50, textAlign: 'center',
  },
});