// components/DiscoverSection.tsx
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Check } from 'lucide-react-native';
import EventImage from './EventImage';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { COIN_GOLD } from '../config/coins';
import { useLanguage } from '../context/LanguageContext';
import { useCoinData, useCoinStore } from '../store/useCoinStore';
import { useGamificationStore } from '../store/useGamificationStore';
import { getEventId } from '../store/useSavedStore';
import { useUnlockStore } from '../store/useUnlockStore';
import { haptic } from '../utils/haptics';
import { StoryModal } from './StoryModal';

const GAP = 8;
const SERIF = Platform.OS === 'ios' ? 'Georgia' : 'serif';
const SANS = Platform.OS === 'ios' ? 'System' : 'sans-serif';

interface DiscoverSectionProps {
  events: any[];
  theme: any;
  t: (key: string) => string;
  isPro?: boolean;
  isDark?: boolean;
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

const ERA_LABELS: Record<string, Record<string, string>> = {
  en: { antiquity: 'Antiquity', classical: 'Classical', medieval: 'Medieval', early_modern: 'Early Modern', xix: 'XIX Century', xx: 'XX Century', contemporary: 'Contemporary' },
  ro: { antiquity: 'Antichitate', classical: 'Clasic', medieval: 'Medieval', early_modern: 'Epoca Modernă', xix: 'Sec. XIX', xx: 'Sec. XX', contemporary: 'Contemporan' },
  fr: { antiquity: 'Antiquité', classical: 'Classique', medieval: 'Médiéval', early_modern: 'Époque Moderne', xix: 'XIXe siècle', xx: 'XXe siècle', contemporary: 'Contemporain' },
  de: { antiquity: 'Antike', classical: 'Klassisch', medieval: 'Mittelalter', early_modern: 'Frühe Neuzeit', xix: 'XIX. Jh.', xx: 'XX. Jh.', contemporary: 'Gegenwart' },
  es: { antiquity: 'Antigüedad', classical: 'Clásico', medieval: 'Medieval', early_modern: 'Edad Moderna', xix: 'S. XIX', xx: 'S. XX', contemporary: 'Contemporáneo' },
};
const eraLabel = (year: number, lang = 'en'): string => {
  const L = ERA_LABELS[lang] ?? ERA_LABELS.en;
  if (year < 0) return L.antiquity;
  if (year < 500) return L.classical;
  if (year < 1500) return L.medieval;
  if (year < 1800) return L.early_modern;
  if (year < 1900) return L.xix;
  if (year < 2000) return L.xx;
  return L.contemporary;
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

const isProEvent = (event: any): boolean => !!(event?.isPro || event?.is_pro || event?.pro);

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

/* ── Unlock-with-coin chip — shown on every locked PRO card ─────── */
const UnlockChip = ({ compact }: { compact?: boolean }) => (
  <View style={[st.unlockChip, compact && st.unlockChipCompact]}>
    <Text style={[st.unlockCoin, compact && st.unlockCoinCompact]}>🪙</Text>
    <Text style={[st.unlockChipT, compact && st.unlockChipTCompact]}>UNLOCK</Text>
  </View>
);

/* Decide the top badge for a PRO card: locked → coin chip; unlocked/subscribed → PRO pill. */
const ProBadge = ({ locked, compact }: { locked: boolean; compact?: boolean }) =>
  locked ? <UnlockChip compact={compact} /> : <ProPill compact={compact} />;

/* ── Already Read badge — small pill overlay ─ */
const ReadBadge = () => (
  <View style={rb.badge} pointerEvents="none">
    <Check size={10} color="#4ade80" strokeWidth={3} />
    <View style={rb.sep} />
    <Text style={rb.text}>Already Read</Text>
  </View>
);

const rb = StyleSheet.create({
  badge: {
    position: 'absolute', bottom: 10, right: 10, zIndex: 10,
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(0,0,0,0.52)',
    borderRadius: 20, paddingHorizontal: 9, paddingVertical: 5,
    borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.22)',
  },
  sep:   { width: 1, height: 9, backgroundColor: 'rgba(255,255,255,0.25)' },
  text:  { color: 'rgba(255,255,255,0.88)', fontSize: 9, fontWeight: '700', letterSpacing: 0.8 },
});

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
   SKELETON — shimmer placeholder shown while the
   ScrollView measures itself (avoids the empty flash
   before the editorial grid can lay out).
   ═══════════════════════════════════════════ */
const DiscoverSkeleton = ({ isDark }: { isDark: boolean }) => {
  const shimmer = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(shimmer, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
  }, []);
  const opacity = shimmer.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.4, 0.85, 0.4] });
  const block = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)';

  const H = Dimensions.get('window').height;
  const heroH = Math.floor(H * 0.30);
  const editH = Math.floor(H * 0.18);
  const mosaicH = Math.floor(H * 0.16);

  return (
    <View pointerEvents="none">
      {/* masthead */}
      <View style={[st.masthead, { justifyContent: 'center' }]}>
        <Animated.View style={{ width: 160, height: 12, borderRadius: 6, backgroundColor: block, opacity }} />
      </View>
      {/* hero */}
      <Animated.View style={{ height: heroH, borderRadius: 18, backgroundColor: block, opacity, marginBottom: GAP }} />
      {/* editorial */}
      <Animated.View style={{ height: editH, borderRadius: 16, backgroundColor: block, opacity, marginBottom: GAP }} />
      {/* mosaic duo */}
      <View style={{ flexDirection: 'row', gap: GAP }}>
        <Animated.View style={{ flex: 1, height: mosaicH, borderRadius: 14, backgroundColor: block, opacity }} />
        <Animated.View style={{ flex: 1, height: mosaicH, borderRadius: 14, backgroundColor: block, opacity }} />
      </View>
    </View>
  );
};

/* ═══════════════════════════════════════════
   HERO — Cinematic featured story
   Top-bar: FEATURE chip + Roman number
   Bottom: category · year, serif title,
   lede line, hairline CTA
   ═══════════════════════════════════════════ */
const HeroCard = ({
  event, lang, number, onPress, height, isRead, subscribed = true, unlocked = false,
}: { event: any; lang: string; number: number; onPress: () => void; height: number; isRead?: boolean; subscribed?: boolean; unlocked?: boolean }) => {
  const title = event.titleTranslations?.[lang] ?? event.titleTranslations?.en ?? '';
  const narrative = event.narrativeTranslations?.[lang] ?? event.narrativeTranslations?.en ?? '';
  const category = (event.category ?? 'HISTORY').replace(/_/g, ' ');
  const year = extractYear(event);
  const yearNum = parseInt(year) || 0;
  const accent = getCatColor(event.category);
  const pro = isProEvent(event);
  const locked = pro && !subscribed && !unlocked;

  return (
    <TouchableOpacity activeOpacity={0.94} onPress={onPress} style={[st.heroCard, { height }, pro && st.cardProBorder]}>
      <EventImage event={event} style={StyleSheet.absoluteFill} showLoader={false} />

      <LinearGradient
        colors={['rgba(0,0,0,0.45)', 'transparent', 'rgba(0,0,0,0.82)', 'rgba(0,0,0,0.98)']}
        locations={[0, 0.3, 0.74, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Inner hairline frame — a touch of editorial polish */}
      <View style={st.heroInnerFrame} pointerEvents="none" />

      {isRead && <ReadBadge />}

      {/* Top bar */}
      <View style={st.heroTopBar}>
        <View style={st.heroFeatureChip}>
          <View style={[st.heroFeatureDot, { backgroundColor: accent }]} />
          <Text style={st.heroFeatureTxt}>FEATURE</Text>
        </View>
        <View style={st.heroTopRight}>
          {pro && <ProBadge locked={locked} compact />}
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
              <Text style={st.heroMetaEra}>{eraLabel(yearNum, lang)}</Text>
            </>
          )}
        </View>

        <Text style={st.heroTitle} numberOfLines={2}>{title}</Text>

        {narrative !== '' && (
          <Text style={st.heroLead} numberOfLines={2}>{narrative}</Text>
        )}

        <View style={st.heroCtaRow}>
          {locked ? (
            <>
              <View style={[st.heroCtaLine, { backgroundColor: COIN_GOLD }]} />
              <Ionicons name="lock-open" size={11} color={COIN_GOLD} style={{ marginRight: 5 }} />
              <Text style={[st.heroCtaTxt, { color: COIN_GOLD }]}>UNLOCK · 1 🪙</Text>
            </>
          ) : (
            <>
              <View style={[st.heroCtaLine, { backgroundColor: accent + '70' }]} />
              <Text style={st.heroCtaTxt}>READ STORY</Text>
              <Ionicons name="arrow-forward" size={11} color="rgba(255,255,255,0.8)" style={{ marginLeft: 6 }} />
            </>
          )}
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
  event, lang, number, onPress, height, isRead, subscribed = true, unlocked = false,
}: { event: any; lang: string; number: number; onPress: () => void; height: number; isRead?: boolean; subscribed?: boolean; unlocked?: boolean }) => {
  const title = event.titleTranslations?.[lang] ?? event.titleTranslations?.en ?? '';
  const category = (event.category ?? 'HISTORY').replace(/_/g, ' ');
  const year = extractYear(event);
  const yearNum = parseInt(year) || 0;
  const accent = getCatColor(event.category);
  const pro = isProEvent(event);
  const locked = pro && !subscribed && !unlocked;

  return (
    <TouchableOpacity activeOpacity={0.94} onPress={onPress} style={[st.editCard, { height }, pro && st.cardProBorder]}>
      {/* Left image panel */}
      <View style={st.editThumb}>
        <EventImage event={event} style={StyleSheet.absoluteFill} showLoader={false} />
        <LinearGradient
          colors={['rgba(0,0,0,0.15)', 'rgba(0,0,0,0.5)', 'rgba(0,0,0,0.92)']}
          locations={[0, 0.5, 1]}
          style={StyleSheet.absoluteFill}
        />
        {year !== '' && (
          <View style={st.editYearPanel}>
            <Text style={st.editYearMain}>{year}</Text>
            <View style={[st.editYearRule, { backgroundColor: accent }]} />
            <Text style={st.editYearEra}>{eraLabel(yearNum, lang)}</Text>
          </View>
        )}
      </View>

      {isRead && <ReadBadge />}

      {/* Right editorial body */}
      <View style={st.editBody}>
        <View style={st.editTopRow}>
          <View style={st.editCatRow}>
            <View style={[st.editCatDot, { backgroundColor: accent }]} />
            <Text style={[st.editCatT, { color: accent }]}>{category}</Text>
          </View>
          <View style={st.editNumWrap}>
            {pro && <ProBadge locked={locked} compact />}
            <Text style={[st.editNumRoman, pro && { marginLeft: 6 }]}>
              {toRoman(number)}
            </Text>
          </View>
        </View>

        <Text style={st.editTitle} numberOfLines={3}>{title}</Text>

        <View style={st.editCtaRow}>
          {locked ? (
            <>
              <View style={[st.editCtaLine, { backgroundColor: COIN_GOLD }]} />
              <Ionicons name="lock-open" size={10} color={COIN_GOLD} style={{ marginRight: 4 }} />
              <Text style={[st.editCtaTxt, { color: COIN_GOLD }]}>UNLOCK · 1 🪙</Text>
            </>
          ) : (
            <>
              <View style={[st.editCtaLine, { backgroundColor: accent + '55' }]} />
              <Text style={st.editCtaTxt}>CONTINUE</Text>
              <Ionicons name="arrow-forward" size={10} color="rgba(255,255,255,0.55)" style={{ marginLeft: 5 }} />
            </>
          )}
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
  event, lang, number, onPress, width, height, isRead, subscribed = true, unlocked = false,
}: { event: any; lang: string; number: number; onPress: () => void; width: number; height: number; isRead?: boolean; subscribed?: boolean; unlocked?: boolean }) => {
  const title = event.titleTranslations?.[lang] ?? event.titleTranslations?.en ?? '';
  const category = (event.category ?? 'HISTORY').replace(/_/g, ' ');
  const year = extractYear(event);
  const accent = getCatColor(event.category);
  const pro = isProEvent(event);
  const locked = pro && !subscribed && !unlocked;

  return (
    <TouchableOpacity activeOpacity={0.94} onPress={onPress} style={[st.curCard, { width, height }, pro && st.cardProBorder]}>
      <EventImage event={event} style={StyleSheet.absoluteFill} showLoader={false} />

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
          <ProBadge locked={locked} compact />
        </View>
      )}

      {isRead && <ReadBadge />}

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
   EXTRAS WIDE CARD — full-width horizontal
   Image left 40%, editorial text right 60%
   ═══════════════════════════════════════════ */
const ExtrasWideCard = ({
  event, lang, onPress, isRead, subscribed = true, unlocked = false,
}: { event: any; lang: string; onPress: () => void; isRead?: boolean; subscribed?: boolean; unlocked?: boolean }) => {
  const title = event.titleTranslations?.[lang] ?? event.titleTranslations?.en ?? '';
  const narrative = event.narrativeTranslations?.[lang] ?? event.narrativeTranslations?.en ?? '';
  const category = (event.category ?? 'HISTORY').replace(/_/g, ' ');
  const year = extractYear(event);
  const accent = getCatColor(event.category);
  const pro = isProEvent(event);
  const locked = pro && !subscribed && !unlocked;

  return (
    <TouchableOpacity activeOpacity={0.93} onPress={onPress} style={[ew.card, pro && st.cardProBorder]}>
      <View style={ew.imgWrap}>
        <EventImage event={event} style={StyleSheet.absoluteFill} showLoader={false} />
        <LinearGradient
          colors={['rgba(0,0,0,0.05)', 'rgba(0,0,0,0.65)']}
          style={StyleSheet.absoluteFill}
        />
        {year !== '' && (
          <View style={ew.yearBox}>
            <Text style={ew.yearText}>{year}</Text>
            <View style={[ew.yearLine, { backgroundColor: accent }]} />
          </View>
        )}
        {pro && (
          locked ? (
            <View style={[ew.proTag, { gap: 3 }]}>
              <Text style={{ fontSize: 8 }}>🪙</Text>
              <Text style={ew.proTagT}>UNLOCK</Text>
            </View>
          ) : (
            <View style={ew.proTag}>
              <Ionicons name="star" size={8} color="#1a1208" />
              <Text style={ew.proTagT}>PRO</Text>
            </View>
          )
        )}
      </View>
      {isRead && <ReadBadge />}
      <View style={ew.body}>
        <View style={ew.catRow}>
          <View style={[ew.catDot, { backgroundColor: accent }]} />
          <Text style={[ew.catT, { color: accent }]}>{category.toUpperCase()}</Text>
        </View>
        <Text style={ew.title} numberOfLines={2}>{title}</Text>
        {narrative !== '' && (
          <Text style={ew.lead} numberOfLines={1}>{narrative}</Text>
        )}
        <View style={ew.ctaRow}>
          {locked ? (
            <>
              <View style={[ew.ctaLine, { backgroundColor: COIN_GOLD }]} />
              <Text style={[ew.ctaT, { color: COIN_GOLD }]}>UNLOCK · 1 🪙</Text>
            </>
          ) : (
            <>
              <View style={[ew.ctaLine, { backgroundColor: accent + '60' }]} />
              <Text style={ew.ctaT}>READ STORY</Text>
              <Ionicons name="arrow-forward" size={9} color="rgba(255,255,255,0.55)" style={{ marginLeft: 4 }} />
            </>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const ew = StyleSheet.create({
  card: {
    flexDirection: 'row', borderRadius: 16, overflow: 'hidden',
    backgroundColor: '#0f1114', height: 138,
  },
  imgWrap: { width: '40%', overflow: 'hidden' },
  yearBox: { position: 'absolute', bottom: 10, left: 11 },
  yearText: {
    color: '#fff', fontSize: 20, fontWeight: '900',
    fontFamily: SERIF, lineHeight: 22,
  },
  yearLine: { width: 22, height: 2, borderRadius: 1, marginTop: 4 },
  proTag: {
    position: 'absolute', top: 9, right: 9,
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: COIN_GOLD, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 5,
  },
  proTagT: { fontSize: 8, fontWeight: '900', color: '#1a1208', letterSpacing: 1.4 },
  body: { flex: 1, padding: 14, justifyContent: 'space-between' },
  catRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  catDot: { width: 5, height: 5, borderRadius: 2.5 },
  catT: { fontSize: 9, fontWeight: '800', letterSpacing: 1.8 },
  title: {
    color: '#fff', fontSize: 15, fontWeight: '700',
    lineHeight: 20, letterSpacing: -0.2, fontFamily: SERIF,
    marginVertical: 5,
  },
  lead: { color: 'rgba(255,255,255,0.42)', fontSize: 11, lineHeight: 15 },
  ctaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  ctaLine: { width: 14, height: 1 },
  ctaT: { color: 'rgba(255,255,255,0.6)', fontSize: 9, fontWeight: '800', letterSpacing: 1.8 },
});

/* ═══════════════════════════════════════════
   EXTRAS TILE CARD — half-width vertical
   Image top 55%, editorial text bottom 45%
   ═══════════════════════════════════════════ */
const ExtrasTileCard = ({
  event, lang, onPress, width, isRead, subscribed = true, unlocked = false,
}: { event: any; lang: string; onPress: () => void; width: number; isRead?: boolean; subscribed?: boolean; unlocked?: boolean }) => {
  const title = event.titleTranslations?.[lang] ?? event.titleTranslations?.en ?? '';
  const category = (event.category ?? 'HISTORY').replace(/_/g, ' ');
  const year = extractYear(event);
  const accent = getCatColor(event.category);
  const pro = isProEvent(event);
  const locked = pro && !subscribed && !unlocked;

  return (
    <TouchableOpacity activeOpacity={0.93} onPress={onPress} style={[et.card, { width }, pro && st.cardProBorder]}>
      <View style={et.imgWrap}>
        <EventImage event={event} style={StyleSheet.absoluteFill} showLoader={false} />
        <LinearGradient
          colors={['rgba(0,0,0,0.18)', 'transparent', 'rgba(0,0,0,0.72)']}
          locations={[0, 0.38, 1]}
          style={StyleSheet.absoluteFill}
        />
        <View style={[et.catChip, { backgroundColor: accent + '22', borderColor: accent + '60' }]}>
          <View style={[et.catChipDot, { backgroundColor: accent }]} />
          <Text style={[et.catChipT, { color: accent }]}>{category.slice(0, 9).toUpperCase()}</Text>
        </View>
        {pro && (
          locked ? (
            <View style={[et.proTag, { gap: 2 }]}>
              <Text style={{ fontSize: 7.5 }}>🪙</Text>
              <Text style={et.proTagT}>UNLOCK</Text>
            </View>
          ) : (
            <View style={et.proTag}>
              <Ionicons name="star" size={8} color="#1a1208" />
              <Text style={et.proTagT}>PRO</Text>
            </View>
          )
        )}
        {year !== '' && <Text style={et.yearOverlay}>{year}</Text>}
      </View>
      {isRead && <ReadBadge />}
      <View style={et.body}>
        <Text style={et.title} numberOfLines={2}>{title}</Text>
        <View style={et.ctaRow}>
          {locked ? (
            <>
              <View style={[et.ctaAccent, { backgroundColor: COIN_GOLD }]} />
              <Text style={[et.ctaT, { color: COIN_GOLD }]}>UNLOCK · 1 🪙</Text>
            </>
          ) : (
            <>
              <View style={[et.ctaAccent, { backgroundColor: accent }]} />
              <Text style={et.ctaT}>READ</Text>
              <Ionicons name="arrow-forward" size={9} color="rgba(255,255,255,0.5)" style={{ marginLeft: 4 }} />
            </>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const et = StyleSheet.create({
  card: { borderRadius: 14, overflow: 'hidden', backgroundColor: '#0f1114', height: 200 },
  imgWrap: { width: '100%', height: 118, overflow: 'hidden' },
  catChip: {
    position: 'absolute', top: 9, left: 9,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 6, borderWidth: StyleSheet.hairlineWidth,
  },
  catChipDot: { width: 4, height: 4, borderRadius: 2 },
  catChipT: { fontSize: 8, fontWeight: '800', letterSpacing: 1.4 },
  proTag: {
    position: 'absolute', top: 9, right: 9,
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: COIN_GOLD, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 5,
  },
  proTagT: { fontSize: 7.5, fontWeight: '900', color: '#1a1208', letterSpacing: 1.3 },
  yearOverlay: {
    position: 'absolute', bottom: 8, right: 10,
    color: 'rgba(255,255,255,0.55)', fontSize: 11,
    fontFamily: SERIF, fontWeight: '700', letterSpacing: 0.5,
  },
  body: { flex: 1, padding: 12, justifyContent: 'space-between' },
  title: {
    color: '#fff', fontSize: 13.5, fontWeight: '700',
    lineHeight: 18, letterSpacing: -0.1, fontFamily: SERIF,
  },
  ctaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  ctaAccent: { width: 14, height: 2, borderRadius: 1 },
  ctaT: { color: 'rgba(255,255,255,0.55)', fontSize: 9, fontWeight: '800', letterSpacing: 1.6 },
});

/* ═══════════════════════════════════════════
   EXTRAS MAGAZINE GRID
   Groups: [wide] + [tile, tile] repeating
   ═══════════════════════════════════════════ */
const ExtrasGrid = ({
  extras, lang, cW, handleSelect, readIds, subscribed, isUnlocked,
}: { extras: any[]; lang: string; cW: number; handleSelect: (e: any) => void; readIds: Set<string>; subscribed: boolean; isUnlocked: (e: any) => boolean }) => {
  const TILE_GAP = 8;
  const tileW = Math.floor((cW - TILE_GAP) / 2);

  type Group = { type: 'wide'; event: any } | { type: 'duo'; events: [any, any] };
  const groups: Group[] = [];
  let i = 0;
  while (i < extras.length) {
    if (i + 2 < extras.length) {
      groups.push({ type: 'wide', event: extras[i] });
      groups.push({ type: 'duo', events: [extras[i + 1], extras[i + 2]] });
      i += 3;
    } else if (i + 1 < extras.length) {
      groups.push({ type: 'duo', events: [extras[i], extras[i + 1]] });
      i += 2;
    } else {
      groups.push({ type: 'wide', event: extras[i] });
      i += 1;
    }
  }

  return (
    <>
      {groups.map((group, gi) => (
        <AnimatedCard key={gi} delay={Math.min(60 + gi * 50, 350)} style={{ marginBottom: TILE_GAP }}>
          {group.type === 'wide' ? (
            <ExtrasWideCard event={group.event} lang={lang} onPress={() => handleSelect(group.event)} isRead={readIds.has(getEventId(group.event))} subscribed={subscribed} unlocked={isUnlocked(group.event)} />
          ) : (
            <View style={{ flexDirection: 'row', gap: TILE_GAP }}>
              <ExtrasTileCard event={group.events[0]} lang={lang} onPress={() => handleSelect(group.events[0])} width={tileW} isRead={readIds.has(getEventId(group.events[0]))} subscribed={subscribed} unlocked={isUnlocked(group.events[0])} />
              <ExtrasTileCard event={group.events[1]} lang={lang} onPress={() => handleSelect(group.events[1])} width={tileW} isRead={readIds.has(getEventId(group.events[1]))} subscribed={subscribed} unlocked={isUnlocked(group.events[1])} />
            </View>
          )}
        </AnimatedCard>
      ))}
    </>
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
export const DiscoverSection = ({ events, theme, t, isPro = true, isDark = true, onPaywall }: DiscoverSectionProps) => {
  const { language } = useLanguage();
  const readEventIds = useGamificationStore(s => s.readEventIds);
  // Reactive coin-unlock set so a PRO card flips from "locked" to readable the
  // instant it's unlocked (via a coin or a watched clip).
  const coinData = useCoinData();
  const unlockedSet = new Set(coinData.unlockedEvents);
  const isUnlocked = (event: any) => unlockedSet.has(getEventId(event));
  const [selected, setSelected] = useState<any>(null);
  const [cW, setCW] = useState(0);
  const [cH, setCH] = useState(0);
  const isRead = (event: any) => readEventIds.has(getEventId(event));

  const secondary = events.length > 1 ? events.slice(1, 5) : [];
  const extras = events.length > 5 ? events.slice(5) : [];
  const issueNumber = new Date().getDate();

  const handleSelect = (event: any) => {
    // Locked PRO story → open the per-event unlock sheet (coin / watch-a-clip),
    // NOT the paywall. Already-unlocked (or subscribed) stories open the reader.
    if (isProEvent(event) && !isPro && !useCoinStore.getState().isEventUnlocked(getEventId(event))) {
      haptic('medium');
      useUnlockStore.getState().open(event);
      return;
    }
    haptic('light');
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
    <View style={{ flex: 1 }}>
      <ScrollView
        style={{ flex: 1 }}
        onLayout={onLayout}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
        bounces
        contentContainerStyle={{ paddingBottom: 28 }}
      >
        {!ready && <DiscoverSkeleton isDark={isDark} />}
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
                isRead={isRead(hero)}
                subscribed={isPro}
                unlocked={isUnlocked(hero)}
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
                  isRead={isRead(rest[0])}
                  subscribed={isPro}
                  unlocked={isUnlocked(rest[0])}
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
                    isRead={isRead(rest[1])}
                    subscribed={isPro}
                    unlocked={isUnlocked(rest[1])}
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
                    isRead={isRead(rest[2])}
                    subscribed={isPro}
                    unlocked={isUnlocked(rest[2])}
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
                  isRead={isRead(rest[1])}
                  subscribed={isPro}
                  unlocked={isUnlocked(rest[1])}
                />
              </AnimatedCard>
            )}

            {/* ── MORE STORIES — scrollable list of remaining events (includes PRO) ── */}
            {extras.length > 0 && (
              <View style={st.extrasSection}>
                <View style={st.extrasDivider}>
                  <View style={[st.extrasLine, { backgroundColor: theme.gold + '35' }]} />
                  <Text style={[st.extrasOrn, { color: theme.gold }]}>✦</Text>
                  <Text style={[st.extrasLabel, { color: theme.text }]}>
                    MORE STORIES
                  </Text>
                  <Text style={[st.extrasCount, { color: theme.gold }]}>
                    {extras.length}
                  </Text>
                  <Text style={[st.extrasOrn, { color: theme.gold }]}>✦</Text>
                  <View style={[st.extrasLine, { backgroundColor: theme.gold + '35' }]} />
                </View>

                <ExtrasGrid extras={extras} lang={language} cW={cW} handleSelect={handleSelect} readIds={readEventIds} subscribed={isPro} isUnlocked={isUnlocked} />
              </View>
            )}
          </>
        )}
      </ScrollView>

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

  /* ── Extras "MORE STORIES" section ── */
  extrasSection: {
    marginTop: 22,
    paddingTop: 2,
  },
  extrasDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 16,
    marginBottom: 6,
  },
  extrasLine: { flex: 1, height: StyleSheet.hairlineWidth },
  extrasOrn: { fontSize: 10, opacity: 0.85 },
  extrasLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2.8,
    fontFamily: SANS,
  },
  extrasCount: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    fontFamily: SERIF,
    fontStyle: 'italic',
  },

  /* ── PRO gold border — applied to any card with isPro ── */
  cardProBorder: {
    borderWidth: 1.5,
    borderColor: COIN_GOLD,
  },

  /* ── PRO pill — gold star badge ── */
  proPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6,
    backgroundColor: COIN_GOLD,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  proPillCompact: { paddingHorizontal: 7, paddingVertical: 3, gap: 3 },
  proPillT: { fontSize: 9, fontWeight: '900', color: '#1a1208', letterSpacing: 1.6 },
  proPillTCompact: { fontSize: 8, letterSpacing: 1.3 },

  /* ── Unlock-with-coin chip ── */
  unlockChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6,
    backgroundColor: COIN_GOLD,
    shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 4,
  },
  unlockChipCompact: { paddingHorizontal: 7, paddingVertical: 3, gap: 3 },
  unlockCoin: { fontSize: 10 },
  unlockCoinCompact: { fontSize: 9 },
  unlockChipT: { fontSize: 9, fontWeight: '900', color: '#1a1208', letterSpacing: 1.4 },
  unlockChipTCompact: { fontSize: 8, letterSpacing: 1.1 },
});
