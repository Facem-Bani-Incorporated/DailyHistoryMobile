// components/DiscoverSection.tsx
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { useLanguage } from '../context/LanguageContext';
import { StoryModal } from './StoryModal';

const GAP = 8;
const SERIF = Platform.OS === 'ios' ? 'Georgia' : 'serif';
const SANS = Platform.OS === 'ios' ? 'System' : 'sans-serif';

interface DiscoverSectionProps {
  events: any[];
  theme: any;
  t: (key: string) => string;
  isPro?: boolean;
  onPaywall?: () => void;
}

/* ── Utilities ────────────────────────────── */
const extractYear = (event: any): string => {
  const raw = event?.eventDate ?? event?.event_date ?? event?.year;
  if (!raw) return '';
  const s = String(raw).trim();
  if (/^\d{4}$/.test(s)) return s;
  const y = new Date(s).getFullYear();
  return isNaN(y) ? '' : String(y);
};

const eraLabel = (year: number): string => {
  if (year < 0) return 'Antiquity';
  if (year < 500) return 'Classical';
  if (year < 1500) return 'Medieval';
  if (year < 1800) return 'Early Modern';
  if (year < 1900) return 'XIX Century';
  if (year < 2000) return 'XX Century';
  return 'Contemporary';
};

const toRoman = (num: number): string => {
  const romans: [number, string][] = [
    [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'],
    [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'],
    [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
  ];
  let result = '', n = num;
  for (const [val, sym] of romans) {
    while (n >= val) { result += sym; n -= val; }
  }
  return result;
};

const CAT_COLORS: Record<string, string> = {
  HISTORY: '#E85D3A',
  SCIENCE: '#3D9EE0',
  CULTURE: '#A65FE0',
  POLITICS: '#E85757',
  TECHNOLOGY: '#2AB872',
  WAR: '#C0392B',
  ART: '#F0A050',
  MUSIC: '#BB6BD9',
  SPORT: '#3BC07D',
  LITERATURE: '#7C6CE7',
};

const getCatColor = (cat: string): string => {
  const key = (cat ?? 'HISTORY').replace(/_/g, '').toUpperCase();
  for (const [k, v] of Object.entries(CAT_COLORS)) {
    if (key.includes(k)) return v;
  }
  return '#E85D3A';
};

const isProEvent = (event: any): boolean => !!(event?.isPro ?? event?.pro);

/* ── Animated entrance ────────────────────── */
const AnimatedCard = ({
  children, delay, style,
}: { children: React.ReactNode; delay: number; style?: any }) => {
  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(22)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 540, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.spring(slide, { toValue: 0, tension: 58, friction: 11, delay, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[style, { opacity: fade, transform: [{ translateY: slide }] }]}>
      {children}
    </Animated.View>
  );
};

/* ── PRO pill — gold star + label ─────────── */
const ProPill = ({ compact }: { compact?: boolean }) => (
  <View style={[st.proPill, compact && st.proPillCompact]}>
    <Ionicons name="star" size={compact ? 9 : 10} color="#1a1208" />
    <Text style={[st.proPillT, compact && st.proPillTCompact]}>PRO</Text>
  </View>
);

/* ═══════════════════════════════════════════
   MASTHEAD — Magazine-style header with
   hairline rules and Roman-numeral issue no.
   ═══════════════════════════════════════════ */
const Masthead = ({ issue, count, theme, t }: {
  issue: number; count: number; theme: any; t: (k: string) => string;
}) => (
  <View style={st.masthead}>
    <View style={[st.mastheadLine, { backgroundColor: theme.gold + '35' }]} />
    <View style={st.mastheadCenter}>
      <Text style={[st.mastheadOrn, { color: theme.gold }]}>✦</Text>
      <Text style={[st.mastheadLabel, { color: theme.text }]}>
        {t('discover').toUpperCase()}
      </Text>
      <Text style={[st.mastheadSep, { color: theme.gold + 'AA' }]}>·</Text>
      <Text style={[st.mastheadIssue, { color: theme.gold }]}>
        N° {toRoman(issue)}
      </Text>
      <Text style={[st.mastheadOrn, { color: theme.gold }]}>✦</Text>
    </View>
    <View style={[st.mastheadLine, { backgroundColor: theme.gold + '35' }]} />
  </View>
);

/* ═══════════════════════════════════════════
   HERO — Cinematic featured story
   Top-bar: FEATURE chip + Roman number
   Bottom: category · year, serif title,
   lede line, hairline CTA
   ═══════════════════════════════════════════ */
const HeroCard = ({
  event, lang, number, onPress, height,
}: { event: any; lang: string; number: number; onPress: () => void; height: number }) => {
  const title = event.titleTranslations?.[lang] ?? event.titleTranslations?.en ?? '';
  const narrative = event.narrativeTranslations?.[lang] ?? event.narrativeTranslations?.en ?? '';
  const category = (event.category ?? 'HISTORY').replace(/_/g, ' ');
  const year = extractYear(event);
  const yearNum = parseInt(year) || 0;
  const img = event.gallery?.[0];
  const accent = getCatColor(event.category);
  const pro = isProEvent(event);

  return (
    <TouchableOpacity activeOpacity={0.94} onPress={onPress} style={[st.heroCard, { height }]}>
      {img
        ? <Image source={{ uri: img }} style={StyleSheet.absoluteFill} contentFit="cover" transition={700} />
        : <View style={[StyleSheet.absoluteFill, { backgroundColor: '#111' }]} />}

      <LinearGradient
        colors={['rgba(0,0,0,0.45)', 'transparent', 'rgba(0,0,0,0.82)', 'rgba(0,0,0,0.98)']}
        locations={[0, 0.3, 0.74, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Inner hairline frame — a touch of editorial polish */}
      <View style={st.heroInnerFrame} pointerEvents="none" />

      {/* Top bar */}
      <View style={st.heroTopBar}>
        <View style={st.heroFeatureChip}>
          <View style={[st.heroFeatureDot, { backgroundColor: accent }]} />
          <Text style={st.heroFeatureTxt}>FEATURE</Text>
        </View>
        <View style={st.heroTopRight}>
          {pro && <ProPill compact />}
          <Text style={[st.heroNumRoman, { marginLeft: pro ? 8 : 0 }]}>
            {toRoman(number)}
          </Text>
        </View>
      </View>

      {/* Body */}
      <View style={st.heroBody}>
        <View style={st.heroMetaRow}>
          <Text style={[st.heroCat, { color: accent }]}>{category}</Text>
          {year !== '' && (
            <>
              <View style={[st.heroMetaBar, { backgroundColor: accent + '70' }]} />
              <Text style={st.heroMetaYear}>{year}</Text>
              <View style={[st.heroMetaBar, { backgroundColor: accent + '40' }]} />
              <Text style={st.heroMetaEra}>{eraLabel(yearNum)}</Text>
            </>
          )}
        </View>

        <Text style={st.heroTitle} numberOfLines={2}>{title}</Text>

        {narrative !== '' && (
          <Text style={st.heroLead} numberOfLines={2}>{narrative}</Text>
        )}

        <View style={st.heroCtaRow}>
          <View style={[st.heroCtaLine, { backgroundColor: accent + '70' }]} />
          <Text style={st.heroCtaTxt}>READ STORY</Text>
          <Ionicons name="arrow-forward" size={11} color="rgba(255,255,255,0.8)" style={{ marginLeft: 6 }} />
        </View>
      </View>
    </TouchableOpacity>
  );
};

/* ═══════════════════════════════════════════
   EDITORIAL — Image left, text right
   Year block on image (big serif year, era)
   Right panel: category row, serif title,
   hairline CTA. Article-style composition.
   ═══════════════════════════════════════════ */
const EditorialCard = ({
  event, lang, number, onPress, height,
}: { event: any; lang: string; number: number; onPress: () => void; height: number }) => {
  const title = event.titleTranslations?.[lang] ?? event.titleTranslations?.en ?? '';
  const category = (event.category ?? 'HISTORY').replace(/_/g, ' ');
  const year = extractYear(event);
  const yearNum = parseInt(year) || 0;
  const img = event.gallery?.[0];
  const accent = getCatColor(event.category);
  const pro = isProEvent(event);

  return (
    <TouchableOpacity activeOpacity={0.94} onPress={onPress} style={[st.editCard, { height }]}>
      {/* Left image panel */}
      <View style={st.editThumb}>
        {img
          ? <Image source={{ uri: img }} style={StyleSheet.absoluteFill} contentFit="cover" transition={400} />
          : <View style={[StyleSheet.absoluteFill, { backgroundColor: '#1a1814' }]} />}
        <LinearGradient
          colors={['rgba(0,0,0,0.15)', 'rgba(0,0,0,0.5)', 'rgba(0,0,0,0.92)']}
          locations={[0, 0.5, 1]}
          style={StyleSheet.absoluteFill}
        />
        {year !== '' && (
          <View style={st.editYearPanel}>
            <Text style={st.editYearMain}>{year}</Text>
            <View style={[st.editYearRule, { backgroundColor: accent }]} />
            <Text style={st.editYearEra}>{eraLabel(yearNum)}</Text>
          </View>
        )}
      </View>

      {/* Right editorial body */}
      <View style={st.editBody}>
        <View style={st.editTopRow}>
          <View style={st.editCatRow}>
            <View style={[st.editCatDot, { backgroundColor: accent }]} />
            <Text style={[st.editCatT, { color: accent }]}>{category}</Text>
          </View>
          <View style={st.editNumWrap}>
            {pro && <ProPill compact />}
            <Text style={[st.editNumRoman, pro && { marginLeft: 6 }]}>
              {toRoman(number)}
            </Text>
          </View>
        </View>

        <Text style={st.editTitle} numberOfLines={3}>{title}</Text>

        <View style={st.editCtaRow}>
          <View style={[st.editCtaLine, { backgroundColor: accent + '55' }]} />
          <Text style={st.editCtaTxt}>CONTINUE</Text>
          <Ionicons name="arrow-forward" size={10} color="rgba(255,255,255,0.55)" style={{ marginLeft: 5 }} />
        </View>
      </View>
    </TouchableOpacity>
  );
};

/* ═══════════════════════════════════════════
   CURATED — Compact overlay cards for mosaic
   Big serif Roman number top-left,
   editorial bottom with category, title, year
   ═══════════════════════════════════════════ */
const CuratedCard = ({
  event, lang, number, onPress, width, height,
}: { event: any; lang: string; number: number; onPress: () => void; width: number; height: number }) => {
  const title = event.titleTranslations?.[lang] ?? event.titleTranslations?.en ?? '';
  const category = (event.category ?? 'HISTORY').replace(/_/g, ' ');
  const year = extractYear(event);
  const img = event.gallery?.[0];
  const accent = getCatColor(event.category);
  const pro = isProEvent(event);

  return (
    <TouchableOpacity activeOpacity={0.94} onPress={onPress} style={[st.curCard, { width, height }]}>
      {img
        ? <Image source={{ uri: img }} style={StyleSheet.absoluteFill} contentFit="cover" transition={400} />
        : <View style={[StyleSheet.absoluteFill, { backgroundColor: '#1a1814' }]} />}

      <LinearGradient
        colors={['rgba(0,0,0,0.3)', 'transparent', 'rgba(0,0,0,0.95)']}
        locations={[0, 0.28, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Top-left: big Roman number with accent rule */}
      <View style={st.curNumBox}>
        <Text style={st.curNum}>{toRoman(number)}</Text>
        <View style={[st.curNumRule, { backgroundColor: accent }]} />
      </View>

      {pro && (
        <View style={{ position: 'absolute', top: 10, right: 10, zIndex: 3 }}>
          <ProPill compact />
        </View>
      )}

      {/* Bottom */}
      <View style={st.curBot}>
        <Text style={[st.curCat, { color: accent }]}>{category}</Text>
        <Text style={st.curTitle} numberOfLines={2}>{title}</Text>
        {year !== '' && (
          <View style={st.curYearRow}>
            <View style={[st.curYearDot, { backgroundColor: accent }]} />
            <Text style={st.curYear}>{year}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

/* ═══════════════════════════════════════════
   MAIN COMPONENT

   Layout (magazine editorial):
   ┌─────────────────────────────────────┐
   │  ── ✦ DISCOVER · N° IV ✦ ──         │   masthead
   ├─────────────────────────────────────┤
   │                                     │
   │            HERO                     │   44%
   │       (cinematic, serif)            │
   │                                     │
   ├─────────────────────────────────────┤
   │  ┌────┐                             │
   │  │year│    EDITORIAL                │   28%
   │  │era │                             │
   │  └────┘                             │
   ├─────────────────┬───────────────────┤
   │    III          │      IV           │   ~26%
   │   curated       │   curated         │
   └─────────────────┴───────────────────┘
   ═══════════════════════════════════════════ */
export const DiscoverSection = ({ events, theme, t, isPro = true, onPaywall }: DiscoverSectionProps) => {
  const { language } = useLanguage();
  const [selected, setSelected] = useState<any>(null);
  const [cW, setCW] = useState(0);
  const [cH, setCH] = useState(0);

  const secondary = events.length > 1 ? events.slice(1, 5) : [];
  const issueNumber = new Date().getDate();

  const handleSelect = (event: any) => {
    if (isProEvent(event) && !isPro) {
      onPaywall?.();
      return;
    }
    setSelected(event);
  };

  if (secondary.length === 0) {
    return (
      <View style={st.empty}>
        <View style={st.emptyFrame}>
          <Text style={[st.emptyOrn, { color: theme.gold }]}>✦</Text>
          <View style={[st.emptyRule, { backgroundColor: theme.gold + '55' }]} />
          <Text style={[st.emptyKicker, { color: theme.gold }]}>EDITOR'S NOTE</Text>
          <View style={[st.emptyRule, { backgroundColor: theme.gold + '55' }]} />
          <Text style={[st.emptyOrn, { color: theme.gold }]}>✦</Text>
        </View>
        <Text style={[st.emptyTitle, { color: theme.text }]}>
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

  const HEADER_H = 40;
  const usable = cH - HEADER_H - GAP * 3;

  const has4 = rest.length >= 3;
  const has3 = rest.length >= 2;

  const heroH = Math.floor(usable * (has4 ? 0.44 : has3 ? 0.50 : 0.58));
  const editH = Math.floor(usable * (has4 ? 0.28 : 0.42));
  const mosaicH = has4 ? usable - heroH - editH - GAP : 0;

  const mosaicLeftW = has4 ? Math.floor((cW - GAP) * 0.56) : 0;
  const mosaicRightW = has4 ? cW - mosaicLeftW - GAP : 0;

  return (
    <View style={{ flex: 1 }} onLayout={onLayout}>
      {ready && (
        <>
          <Masthead issue={issueNumber} count={secondary.length} theme={theme} t={t} />

          <AnimatedCard delay={40} style={{ marginBottom: GAP }}>
            <HeroCard
              event={hero}
              lang={language}
              number={1}
              onPress={() => handleSelect(hero)}
              height={heroH}
            />
          </AnimatedCard>

          {rest.length >= 1 && (
            <AnimatedCard delay={180} style={{ marginBottom: has4 ? GAP : 0 }}>
              <EditorialCard
                event={rest[0]}
                lang={language}
                number={2}
                onPress={() => handleSelect(rest[0])}
                height={editH}
              />
            </AnimatedCard>
          )}

          {has4 && (
            <View style={st.mosaicRow}>
              <AnimatedCard delay={320} style={{ width: mosaicLeftW }}>
                <CuratedCard
                  event={rest[1]}
                  lang={language}
                  number={3}
                  onPress={() => handleSelect(rest[1])}
                  width={mosaicLeftW}
                  height={mosaicH}
                />
              </AnimatedCard>
              <AnimatedCard delay={440} style={{ width: mosaicRightW }}>
                <CuratedCard
                  event={rest[2]}
                  lang={language}
                  number={4}
                  onPress={() => handleSelect(rest[2])}
                  width={mosaicRightW}
                  height={mosaicH}
                />
              </AnimatedCard>
            </View>
          )}

          {rest.length === 2 && (
            <AnimatedCard delay={320}>
              <CuratedCard
                event={rest[1]}
                lang={language}
                number={3}
                onPress={() => handleSelect(rest[1])}
                width={cW}
                height={Math.floor(usable * 0.32)}
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
  /* ── Empty state ── */
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30, gap: 14 },
  emptyFrame: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  emptyOrn: { fontSize: 11, opacity: 0.85 },
  emptyRule: { width: 24, height: StyleSheet.hairlineWidth },
  emptyKicker: { fontSize: 10, fontWeight: '800', letterSpacing: 3, fontFamily: SANS },
  emptyTitle: {
    fontSize: 19, fontWeight: '700', letterSpacing: 0.1,
    fontFamily: SERIF, textAlign: 'center', lineHeight: 24,
  },

  /* ── Masthead ── */
  masthead: {
    height: 40, flexDirection: 'row', alignItems: 'center',
    gap: 10, marginBottom: 6,
  },
  mastheadLine: { flex: 1, height: StyleSheet.hairlineWidth },
  mastheadCenter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  mastheadOrn: { fontSize: 9, opacity: 0.85 },
  mastheadLabel: {
    fontSize: 11, fontWeight: '800', letterSpacing: 3, fontFamily: SANS,
  },
  mastheadSep: { fontSize: 12, fontWeight: '700' },
  mastheadIssue: {
    fontSize: 11, fontWeight: '700', letterSpacing: 1.4,
    fontFamily: SERIF, fontStyle: 'italic',
  },

  /* ── Hero ── */
  heroCard: { width: '100%', borderRadius: 18, overflow: 'hidden', backgroundColor: '#0d0d0d' },
  heroInnerFrame: {
    position: 'absolute', top: 8, left: 8, right: 8, bottom: 8,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.07)',
    zIndex: 1,
  },
  heroTopBar: {
    position: 'absolute', top: 16, left: 16, right: 16,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    zIndex: 3,
  },
  heroFeatureChip: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    paddingHorizontal: 10, paddingVertical: 5,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  heroFeatureDot: { width: 5, height: 5, borderRadius: 2.5 },
  heroFeatureTxt: { color: '#fff', fontSize: 9, fontWeight: '800', letterSpacing: 2 },
  heroTopRight: { flexDirection: 'row', alignItems: 'center' },
  heroNumRoman: {
    color: 'rgba(255,255,255,0.9)', fontSize: 16, fontWeight: '700',
    letterSpacing: 1.5, fontFamily: SERIF, fontStyle: 'italic',
  },
  heroBody: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 18, paddingBottom: 18, zIndex: 2,
  },
  heroMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'nowrap' },
  heroCat: { fontSize: 10, fontWeight: '800', letterSpacing: 2, textTransform: 'uppercase' },
  heroMetaBar: { width: 1, height: 10 },
  heroMetaYear: {
    color: 'rgba(255,255,255,0.75)', fontSize: 10, fontWeight: '700',
    letterSpacing: 1.5, fontFamily: SERIF,
  },
  heroMetaEra: {
    color: 'rgba(255,255,255,0.45)', fontSize: 9, fontWeight: '700',
    letterSpacing: 1.8, textTransform: 'uppercase',
  },
  heroTitle: {
    color: '#fff', fontSize: 23, fontWeight: '800',
    lineHeight: 28, letterSpacing: -0.5, fontFamily: SERIF,
  },
  heroLead: {
    color: 'rgba(255,255,255,0.55)', fontSize: 12,
    lineHeight: 17, marginTop: 7, letterSpacing: 0.1,
  },
  heroCtaRow: {
    flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 8,
  },
  heroCtaLine: { width: 20, height: 1 },
  heroCtaTxt: {
    color: 'rgba(255,255,255,0.82)', fontSize: 10, fontWeight: '800', letterSpacing: 2,
  },

  /* ── Editorial ── */
  editCard: {
    width: '100%', borderRadius: 16, overflow: 'hidden',
    flexDirection: 'row', backgroundColor: '#0f1114',
  },
  editThumb: { width: '42%', overflow: 'hidden' },
  editYearPanel: { position: 'absolute', bottom: 12, left: 12, right: 12 },
  editYearMain: {
    color: '#fff', fontSize: 26, fontWeight: '900',
    letterSpacing: 0.5, fontFamily: SERIF, lineHeight: 28,
  },
  editYearRule: { width: 28, height: 2, borderRadius: 1, marginTop: 6, marginBottom: 4 },
  editYearEra: {
    color: 'rgba(255,255,255,0.7)', fontSize: 8,
    fontWeight: '800', letterSpacing: 2.2,
  },

  editBody: { flex: 1, padding: 15, justifyContent: 'space-between' },
  editTopRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  editCatRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  editCatDot: { width: 6, height: 6, borderRadius: 3 },
  editCatT: { fontSize: 9, fontWeight: '800', letterSpacing: 1.8, textTransform: 'uppercase' },
  editNumWrap: { flexDirection: 'row', alignItems: 'center' },
  editNumRoman: {
    color: 'rgba(255,255,255,0.45)', fontSize: 12, fontWeight: '700',
    letterSpacing: 1.2, fontFamily: SERIF, fontStyle: 'italic',
  },
  editTitle: {
    color: '#fff', fontSize: 15.5, fontWeight: '700',
    lineHeight: 20, letterSpacing: -0.2, fontFamily: SERIF,
    marginVertical: 6,
  },
  editCtaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  editCtaLine: { width: 16, height: 1 },
  editCtaTxt: {
    color: 'rgba(255,255,255,0.6)', fontSize: 9, fontWeight: '800', letterSpacing: 1.8,
  },

  /* ── Curated ── */
  curCard: { borderRadius: 14, overflow: 'hidden', backgroundColor: '#0d0d0d' },
  curNumBox: { position: 'absolute', top: 12, left: 12, zIndex: 2 },
  curNum: {
    color: '#fff', fontSize: 26, fontWeight: '800',
    letterSpacing: -0.5, fontFamily: SERIF, lineHeight: 28,
    fontStyle: 'italic',
  },
  curNumRule: { width: 18, height: 2, borderRadius: 1, marginTop: 4 },
  curBot: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 13 },
  curCat: {
    fontSize: 9, fontWeight: '800', letterSpacing: 2,
    textTransform: 'uppercase', marginBottom: 6,
  },
  curTitle: {
    color: '#fff', fontSize: 13, fontWeight: '700',
    lineHeight: 17, letterSpacing: -0.1, fontFamily: SERIF,
  },
  curYearRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 },
  curYearDot: { width: 4, height: 4, borderRadius: 2 },
  curYear: {
    color: 'rgba(255,255,255,0.5)', fontSize: 9, fontWeight: '700',
    letterSpacing: 1.2, fontFamily: SERIF,
  },

  /* ── Mosaic row ── */
  mosaicRow: { flexDirection: 'row', gap: GAP, flex: 0 },

  /* ── PRO pill — gold star badge ── */
  proPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6,
    backgroundColor: '#E8B84D',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  proPillCompact: { paddingHorizontal: 7, paddingVertical: 3, gap: 3 },
  proPillT: { fontSize: 9, fontWeight: '900', color: '#1a1208', letterSpacing: 1.6 },
  proPillTCompact: { fontSize: 8, letterSpacing: 1.3 },
});
