// components/DiscoverSection.tsx
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { useLanguage } from '../context/LanguageContext';
import { StoryModal } from './StoryModal';

const GAP = 6;
const SERIF = Platform.OS === 'ios' ? 'Georgia' : 'serif';
const SANS = Platform.OS === 'ios' ? 'System' : 'sans-serif';

interface DiscoverSectionProps {
  events: any[];
  theme: any;
  t: (key: string) => string;
}

const extractYear = (event: any): string => {
  const raw = event?.eventDate ?? event?.event_date ?? event?.year;
  if (!raw) return '';
  const s = String(raw).trim();
  if (/^\d{4}$/.test(s)) return s;
  const y = new Date(s).getFullYear();
  return isNaN(y) ? '' : String(y);
};

const eraLabel = (year: number): string => {
  if (year < 0) return 'Ancient';
  if (year < 500) return 'Classical';
  if (year < 1500) return 'Medieval';
  if (year < 1800) return 'Early Modern';
  if (year < 1900) return '19th Century';
  if (year < 2000) return '20th Century';
  return 'Modern';
};

// Category accent colors — editorial feel
const CAT_COLORS: Record<string, string> = {
  HISTORY: '#E85D3A',
  SCIENCE: '#2D9CDB',
  CULTURE: '#9B51E0',
  POLITICS: '#EB5757',
  TECHNOLOGY: '#27AE60',
  WAR: '#C0392B',
  ART: '#F2994A',
  MUSIC: '#BB6BD9',
  SPORT: '#219653',
  LITERATURE: '#6C5CE7',
};

const getCatColor = (cat: string): string => {
  const key = (cat ?? 'HISTORY').replace(/_/g, '').toUpperCase();
  for (const [k, v] of Object.entries(CAT_COLORS)) {
    if (key.includes(k)) return v;
  }
  return '#E85D3A';
};

/* ── Animated Card ── */
const AnimatedCard = ({ children, delay, style }: { children: React.ReactNode; delay: number; style?: any }) => {
  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 450, delay, useNativeDriver: true }),
      Animated.spring(slide, { toValue: 0, tension: 65, friction: 11, delay, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[style, { opacity: fade, transform: [{ translateY: slide }] }]}>
      {children}
    </Animated.View>
  );
};

/* ═══════════════════════════════════════════
   HERO CARD — Full width, Apple News style
   Big image, bold serif title, color accent bar
   ═══════════════════════════════════════════ */
const HeroCard = ({ event, lang, onPress, height }: {
  event: any; lang: string; onPress: () => void; height: number;
}) => {
  const title = event.titleTranslations?.[lang] ?? event.titleTranslations?.en ?? '';
  const narrative = event.narrativeTranslations?.[lang] ?? event.narrativeTranslations?.en ?? '';
  const category = (event.category ?? 'HISTORY').replace(/_/g, ' ');
  const year = extractYear(event);
  const img = event.gallery?.[0];
  const accent = getCatColor(event.category);

  return (
    <TouchableOpacity activeOpacity={0.92} onPress={onPress} style={[st.heroCard, { height }]}>
      {img
        ? <Image source={{ uri: img }} style={StyleSheet.absoluteFill} contentFit="cover" transition={700} />
        : <View style={[StyleSheet.absoluteFill, { backgroundColor: '#111' }]} />}

      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.05)', 'rgba(0,0,0,0.85)', 'rgba(0,0,0,0.97)']}
        locations={[0, 0.3, 0.7, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Color accent bar top-left */}
      <View style={[st.heroAccentBar, { backgroundColor: accent }]} />

      <View style={st.heroContent}>
        {/* Category + Year tag */}
        <View style={st.heroMeta}>
          <Text style={[st.heroCat, { color: accent }]}>{category}</Text>
          {year !== '' && (
            <>
              <View style={[st.heroDivider, { backgroundColor: accent + '60' }]} />
              <Text style={st.heroYearT}>{year}</Text>
            </>
          )}
        </View>

        <Text style={st.heroTitle} numberOfLines={2}>{title}</Text>

        {narrative !== '' && (
          <Text style={st.heroDesc} numberOfLines={2}>{narrative}</Text>
        )}

        <View style={st.heroReadRow}>
          <View style={[st.heroReadDot, { backgroundColor: accent }]} />
          <Text style={st.heroReadT}>Read story</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

/* ═══════════════════════════════════════════
   EDITORIAL CARD — Side-by-side image + text
   Google News style: image left, content right
   ═══════════════════════════════════════════ */
const EditorialCard = ({ event, lang, onPress, height }: {
  event: any; lang: string; onPress: () => void; height: number;
}) => {
  const title = event.titleTranslations?.[lang] ?? event.titleTranslations?.en ?? '';
  const category = (event.category ?? 'HISTORY').replace(/_/g, ' ');
  const year = extractYear(event);
  const yearNum = parseInt(year) || 0;
  const img = event.gallery?.[0];
  const accent = getCatColor(event.category);

  return (
    <TouchableOpacity activeOpacity={0.92} onPress={onPress} style={[st.editCard, { height }]}>
      {/* Thumbnail */}
      <View style={st.editThumb}>
        {img
          ? <Image source={{ uri: img }} style={StyleSheet.absoluteFill} contentFit="cover" transition={400} />
          : <View style={[StyleSheet.absoluteFill, { backgroundColor: '#1a1814' }]} />}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.4)']}
          style={StyleSheet.absoluteFill}
        />
        {/* Year overlay on image */}
        {year !== '' && (
          <View style={st.editYearBadge}>
            <Text style={st.editYearT}>{year}</Text>
          </View>
        )}
      </View>

      {/* Text content */}
      <View style={st.editBody}>
        <View style={st.editCatRow}>
          <View style={[st.editCatDot, { backgroundColor: accent }]} />
          <Text style={[st.editCatT, { color: accent }]}>{category}</Text>
        </View>
        <Text style={st.editTitle} numberOfLines={3}>{title}</Text>
        <Text style={st.editEra}>{eraLabel(yearNum)}</Text>
      </View>
    </TouchableOpacity>
  );
};

/* ═══════════════════════════════════════════
   OVERLAY CARD — Compact image card with
   text overlay, for the bottom mosaic
   ═══════════════════════════════════════════ */
const OverlayCard = ({ event, lang, onPress, width, height }: {
  event: any; lang: string; onPress: () => void; width: number; height: number;
}) => {
  const title = event.titleTranslations?.[lang] ?? event.titleTranslations?.en ?? '';
  const category = (event.category ?? 'HISTORY').replace(/_/g, ' ');
  const year = extractYear(event);
  const img = event.gallery?.[0];
  const accent = getCatColor(event.category);

  return (
    <TouchableOpacity activeOpacity={0.92} onPress={onPress} style={[st.overlayCard, { width, height }]}>
      {img
        ? <Image source={{ uri: img }} style={StyleSheet.absoluteFill} contentFit="cover" transition={400} />
        : <View style={[StyleSheet.absoluteFill, { backgroundColor: '#1a1814' }]} />}

      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.2)', 'rgba(0,0,0,0.92)']}
        locations={[0, 0.35, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Accent line at top */}
      <View style={[st.overlayAccent, { backgroundColor: accent }]} />

      <View style={st.overlayBot}>
        <Text style={[st.overlayCat, { color: accent }]}>{category}</Text>
        <Text style={st.overlayTitle} numberOfLines={2}>{title}</Text>
        {year !== '' && <Text style={st.overlayYear}>{year}</Text>}
      </View>
    </TouchableOpacity>
  );
};

/* ═══════════════════════════════════════════
   SECTION HEADER
   ═══════════════════════════════════════════ */
const SectionHeader = ({ theme, t, count }: { theme: any; t: (k: string) => string; count: number }) => (
  <View style={st.sectionHeader}>
    <View style={st.sectionLeft}>
      <Text style={[st.sectionTitle, { color: theme.text }]}>{t('discover')}</Text>
      <View style={[st.sectionLine, { backgroundColor: theme.gold }]} />
    </View>
    <View style={[st.countBadge, { backgroundColor: theme.gold + '12' }]}>
      <Text style={[st.countT, { color: theme.gold }]}>{count}</Text>
    </View>
  </View>
);

/* ═══════════════════════════════════════════
   MAIN COMPONENT

   Layout (fills screen, no scroll):
   ┌─────────────────────────────────┐
   │         SECTION HEADER          │  32px
   ├─────────────────────────────────┤
   │                                 │
   │          HERO CARD              │  ~42%
   │     (full width, big image)     │
   │                                 │
   ├─────────────────────────────────┤
   │  EDITORIAL CARD                 │
   │  (image left + text right)      │  ~28%
   │                                 │
   ├────────────────┬────────────────┤
   │  OVERLAY CARD  │  OVERLAY CARD  │  ~30%
   │   (wider)      │  (narrower)    │
   └────────────────┴────────────────┘
   ═══════════════════════════════════════════ */
export const DiscoverSection = ({ events, theme, t }: DiscoverSectionProps) => {
  const { language } = useLanguage();
  const [selected, setSelected] = useState<any>(null);
  const [cW, setCW] = useState(0);
  const [cH, setCH] = useState(0);

  const secondary = events.length > 1 ? events.slice(1, 5) : [];

  if (secondary.length === 0) {
    return (
      <View style={st.empty}>
        <Text style={{ fontSize: 28, color: theme.gold, opacity: 0.45 }}>✦</Text>
        <Text style={{ fontSize: 16, fontWeight: '700', color: theme.text, marginTop: 10, letterSpacing: 0.3, fontFamily: SERIF }}>
          {t('only_one_today')}
        </Text>
      </View>
    );
  }

  const onLayout = (e: any) => {
    const { width, height } = e.nativeEvent.layout;
    if (width > 0 && height > 0) { setCW(width); setCH(height); }
  };

  const ready = cW > 0 && cH > 0;
  const [hero, ...rest] = secondary;

  const HEADER_H = 32;
  const usable = cH - HEADER_H - GAP * 3;

  // Adaptive layout based on card count
  const has4 = rest.length >= 3;
  const has3 = rest.length >= 2;

  const heroH = Math.floor(usable * (has4 ? 0.42 : has3 ? 0.48 : 0.55));
  const editH = Math.floor(usable * (has4 ? 0.28 : 0.52));
  const mosaicH = has4 ? usable - heroH - editH : 0;

  const mosaicLeftW = has4 ? Math.floor((cW - GAP) * 0.55) : 0;
  const mosaicRightW = has4 ? cW - mosaicLeftW - GAP : 0;

  return (
    <View style={{ flex: 1 }} onLayout={onLayout}>
      {ready && (
        <>
          <SectionHeader theme={theme} t={t} count={secondary.length} />

          {/* Row 1: Hero */}
          <AnimatedCard delay={40} style={{ marginBottom: GAP }}>
            <HeroCard
              event={hero}
              lang={language}
              onPress={() => setSelected(hero)}
              height={heroH}
            />
          </AnimatedCard>

          {/* Row 2: Editorial (image + text side by side) */}
          {rest.length >= 1 && (
            <AnimatedCard delay={180} style={{ marginBottom: has4 ? GAP : 0 }}>
              <EditorialCard
                event={rest[0]}
                lang={language}
                onPress={() => setSelected(rest[0])}
                height={editH}
              />
            </AnimatedCard>
          )}

          {/* Row 3: Mosaic — two overlay cards */}
          {has4 && (
            <View style={st.mosaicRow}>
              <AnimatedCard delay={320} style={{ width: mosaicLeftW }}>
                <OverlayCard
                  event={rest[1]}
                  lang={language}
                  onPress={() => setSelected(rest[1])}
                  width={mosaicLeftW}
                  height={mosaicH}
                />
              </AnimatedCard>
              <AnimatedCard delay={440} style={{ width: mosaicRightW }}>
                <OverlayCard
                  event={rest[2]}
                  lang={language}
                  onPress={() => setSelected(rest[2])}
                  width={mosaicRightW}
                  height={mosaicH}
                />
              </AnimatedCard>
            </View>
          )}

          {/* Fallback: if only 3 events, show 2nd as overlay full width */}
          {rest.length === 2 && (
            <AnimatedCard delay={320}>
              <OverlayCard
                event={rest[1]}
                lang={language}
                onPress={() => setSelected(rest[1])}
                width={cW}
                height={Math.floor(usable * 0.30)}
              />
            </AnimatedCard>
          )}
        </>
      )}

      <StoryModal visible={!!selected} event={selected} onClose={() => setSelected(null)} theme={theme} />
    </View>
  );
};

/* ═══════════════════════════════════════════
   STYLES
   ═══════════════════════════════════════════ */
const st = StyleSheet.create({
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30, gap: 6 },

  /* Section Header — minimal, Apple-style */
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 32, marginBottom: 4 },
  sectionLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { fontSize: 14, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase', fontFamily: SANS },
  sectionLine: { width: 20, height: 2, borderRadius: 1 },
  countBadge: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  countT: { fontSize: 11, fontWeight: '800' },

  /* ── Hero Card ── */
  heroCard: { width: '100%', borderRadius: 16, overflow: 'hidden' },
  heroAccentBar: { position: 'absolute', top: 0, left: 0, width: 4, height: '35%', borderBottomRightRadius: 4, zIndex: 2 },
  heroContent: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, paddingBottom: 16 },
  heroMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  heroCat: { fontSize: 10, fontWeight: '800', letterSpacing: 1.8, textTransform: 'uppercase' },
  heroDivider: { width: 1, height: 10 },
  heroYearT: { color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: '700', letterSpacing: 2 },
  heroTitle: { color: '#fff', fontSize: 22, fontWeight: '800', lineHeight: 27, letterSpacing: -0.4, fontFamily: SERIF },
  heroDesc: { color: 'rgba(255,255,255,0.45)', fontSize: 12, lineHeight: 17, marginTop: 6 },
  heroReadRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  heroReadDot: { width: 5, height: 5, borderRadius: 2.5 },
  heroReadT: { color: 'rgba(255,255,255,0.4)', fontSize: 9, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase' },

  /* ── Editorial Card (image + text) ── */
  editCard: { width: '100%', borderRadius: 14, overflow: 'hidden', flexDirection: 'row', backgroundColor: '#111' },
  editThumb: { width: '38%', overflow: 'hidden' },
  editYearBadge: { position: 'absolute', bottom: 8, left: 8, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  editYearT: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },
  editBody: { flex: 1, padding: 14, justifyContent: 'center' },
  editCatRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  editCatDot: { width: 6, height: 6, borderRadius: 3 },
  editCatT: { fontSize: 9, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase' },
  editTitle: { color: '#fff', fontSize: 15, fontWeight: '700', lineHeight: 20, letterSpacing: -0.2, fontFamily: SERIF },
  editEra: { color: 'rgba(255,255,255,0.3)', fontSize: 9, fontWeight: '600', letterSpacing: 1, marginTop: 8, textTransform: 'uppercase' },

  /* ── Overlay Card ── */
  overlayCard: { borderRadius: 14, overflow: 'hidden' },
  overlayAccent: { position: 'absolute', top: 0, left: 16, right: 16, height: 2, borderBottomLeftRadius: 2, borderBottomRightRadius: 2, zIndex: 2 },
  overlayBot: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 12, paddingBottom: 14 },
  overlayCat: { fontSize: 8, fontWeight: '800', letterSpacing: 1.8, textTransform: 'uppercase', marginBottom: 4 },
  overlayTitle: { color: '#fff', fontSize: 13, fontWeight: '700', lineHeight: 17, letterSpacing: 0.1 },
  overlayYear: { color: 'rgba(255,255,255,0.35)', fontSize: 9, fontWeight: '700', letterSpacing: 1.5, marginTop: 5 },

  /* ── Mosaic Row ── */
  mosaicRow: { flexDirection: 'row', gap: GAP, flex: 0 },
});