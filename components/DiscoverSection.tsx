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

const GAP = 10;
const SERIF = Platform.OS === 'ios' ? 'Georgia' : 'serif';

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

// ── Animated Card Wrapper ──
const AnimatedCard = ({ children, delay, style }: { children: React.ReactNode; delay: number; style?: any }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, delay, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 80, friction: 12, delay, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[style, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      {children}
    </Animated.View>
  );
};

// ── Hero Card (larger, editorial feel) ──
const HeroCard = ({ event, lang, theme, onPress, height }: {
  event: any; lang: string; theme: any; onPress: () => void; height: number;
}) => {
  const title = event.titleTranslations?.[lang] ?? event.titleTranslations?.en ?? '';
  const narrative = event.narrativeTranslations?.[lang] ?? event.narrativeTranslations?.en ?? '';
  const category = (event.category ?? 'HISTORY').replace(/_/g, ' ');
  const year = extractYear(event);
  const yearNum = parseInt(year) || 0;
  const img = event.gallery?.[0];

  return (
    <TouchableOpacity activeOpacity={0.88} onPress={onPress} style={[st.heroCard, { height }]}>
      {img
        ? <Image source={{ uri: img }} style={StyleSheet.absoluteFill} contentFit="cover" transition={600} />
        : <View style={[StyleSheet.absoluteFill, { backgroundColor: '#1a1814' }]} />}
      <LinearGradient
        colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.15)', 'rgba(0,0,0,0.92)']}
        locations={[0, 0.35, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Top: era + category */}
      <View style={st.heroTop}>
        <View style={st.eraPill}>
          <Text style={st.eraPillT}>{eraLabel(yearNum)}</Text>
        </View>
        <View style={st.catPill}>
          <Text style={st.catPillT}>{category}</Text>
        </View>
      </View>

      {/* Bottom: year + title + teaser */}
      <View style={st.heroBot}>
        {year !== '' && (
          <View style={st.yearRow}>
            <View style={st.yearLine} />
            <Text style={st.heroYear}>{year}</Text>
            <View style={st.yearLine} />
          </View>
        )}
        <Text style={st.heroTitle} numberOfLines={2}>{title}</Text>
        {narrative !== '' && <Text style={st.heroNarr} numberOfLines={2}>{narrative}</Text>}
        <View style={st.heroAction}>
          <Text style={st.heroActionT}>Read the full story</Text>
          <Text style={st.heroArrow}>→</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

// ── Compact Card ──
const CompactCard = ({ event, lang, theme, onPress, width, height, rank }: {
  event: any; lang: string; theme: any; onPress: () => void; width: number; height: number; rank: number;
}) => {
  const title = event.titleTranslations?.[lang] ?? event.titleTranslations?.en ?? '';
  const category = (event.category ?? 'HISTORY').replace(/_/g, ' ');
  const year = extractYear(event);
  const yearNum = parseInt(year) || 0;
  const img = event.gallery?.[0];

  return (
    <TouchableOpacity activeOpacity={0.88} onPress={onPress} style={[st.compact, { width, height }]}>
      {img
        ? <Image source={{ uri: img }} style={StyleSheet.absoluteFill} contentFit="cover" transition={400} />
        : <View style={[StyleSheet.absoluteFill, { backgroundColor: '#1a1814' }]} />}
      <LinearGradient
        colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.92)']}
        locations={[0, 0.35, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Rank number */}
      <View style={st.rankBadge}>
        <Text style={st.rankT}>{rank}</Text>
      </View>

      <View style={st.compactBot}>
        <Text style={st.compactCat}>{category}</Text>
        <Text style={st.compactTitle} numberOfLines={2}>{title}</Text>
        <View style={st.compactFooter}>
          {year !== '' && <Text style={st.compactYear}>{year}</Text>}
          <View style={st.compactDot} />
          <Text style={st.compactEra}>{eraLabel(yearNum)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

// ── Section Header ──
const SectionHeader = ({ theme, t, count }: { theme: any; t: (k: string) => string; count: number }) => (
  <View style={st.sectionHeader}>
    <View style={st.sectionLeft}>
      <View style={[st.sectionAccent, { backgroundColor: theme.gold }]} />
      <Text style={[st.sectionTitle, { color: theme.text }]}>{t('discover')}</Text>
    </View>
    <View style={[st.countPill, { backgroundColor: theme.gold + '15', borderColor: theme.gold + '30' }]}>
      <Text style={[st.countT, { color: theme.gold }]}>{count} {t('stories_read') ? 'stories' : 'stories'}</Text>
    </View>
  </View>
);

export const DiscoverSection = ({ events, theme, t }: DiscoverSectionProps) => {
  const { language } = useLanguage();
  const [selected, setSelected] = useState<any>(null);
  const [containerH, setContainerH] = useState(0);
  const [containerW, setContainerW] = useState(0);

  // Skip first event (main in Today tab), take next 4
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
    if (width > 0 && height > 0) { setContainerW(width); setContainerH(height); }
  };

  const ready = containerW > 0 && containerH > 0;

  // Layout: Hero card on top (~50%), then 3 compact cards in bottom row
  // If 4 events: 1 hero + 3 compact
  // If 3 events: 1 hero + 2 compact
  // If 2 events: 1 hero + 1 compact
  const [hero, ...rest] = secondary;
  const HEADER_H = 36;
  const heroH = ready ? Math.floor((containerH - HEADER_H - GAP) * 0.52) : 220;
  const compactH = ready ? containerH - HEADER_H - heroH - GAP * 2 : 160;
  const compactW = ready ? (containerW - GAP * (rest.length - 1)) / Math.max(rest.length, 1) : 120;

  return (
    <View style={{ flex: 1 }} onLayout={onLayout}>
      {ready && (
        <>
          <SectionHeader theme={theme} t={t} count={secondary.length} />

          {/* Hero — second most important event */}
          <AnimatedCard delay={50} style={{ marginBottom: GAP }}>
            <HeroCard
              event={hero}
              lang={language}
              theme={theme}
              onPress={() => setSelected(hero)}
              height={heroH}
            />
          </AnimatedCard>

          {/* Bottom row — remaining events */}
          {rest.length > 0 && (
            <View style={st.bottomRow}>
              {rest.map((ev, i) => (
                <AnimatedCard key={i} delay={150 + i * 100}>
                  <CompactCard
                    event={ev}
                    lang={language}
                    theme={theme}
                    onPress={() => setSelected(ev)}
                    width={compactW}
                    height={compactH}
                    rank={i + 3}
                  />
                </AnimatedCard>
              ))}
            </View>
          )}
        </>
      )}

      <StoryModal visible={!!selected} event={selected} onClose={() => setSelected(null)} theme={theme} />
    </View>
  );
};

const st = StyleSheet.create({
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30, gap: 6 },

  // Section header
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 36, marginBottom: 2 },
  sectionLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionAccent: { width: 3, height: 16, borderRadius: 1.5 },
  sectionTitle: { fontSize: 13, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },
  countPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, borderWidth: 1 },
  countT: { fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },

  // Hero card
  heroCard: { width: '100%', borderRadius: 20, overflow: 'hidden' },
  heroTop: { position: 'absolute', top: 12, left: 12, right: 12, flexDirection: 'row', gap: 6 },
  eraPill: { backgroundColor: 'rgba(255,215,0,0.2)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,215,0,0.4)' },
  eraPillT: { color: '#ffd700', fontSize: 8, fontWeight: '800', letterSpacing: 1.5 },
  catPill: { backgroundColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  catPillT: { color: 'rgba(255,255,255,0.7)', fontSize: 8, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase' },
  heroBot: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, paddingBottom: 18 },
  yearRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  yearLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255,215,0,0.25)' },
  heroYear: { color: '#ffd700', fontSize: 11, fontWeight: '800', letterSpacing: 3 },
  heroTitle: { color: '#fff', fontSize: 22, fontWeight: '800', lineHeight: 27, letterSpacing: -0.3, fontFamily: SERIF },
  heroNarr: { color: 'rgba(255,255,255,0.55)', fontSize: 12, lineHeight: 17, marginTop: 6, fontWeight: '400' },
  heroAction: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  heroActionT: { color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase' },
  heroArrow: { color: '#ffd700', fontSize: 14, fontWeight: '400' },

  // Bottom row
  bottomRow: { flexDirection: 'row', gap: GAP, flex: 1 },

  // Compact card
  compact: { borderRadius: 16, overflow: 'hidden' },
  rankBadge: { position: 'absolute', top: 10, right: 10, width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(0,0,0,0.5)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  rankT: { color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: '800' },
  compactBot: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 10, paddingBottom: 12 },
  compactCat: { color: '#ffd700', fontSize: 7, fontWeight: '800', letterSpacing: 1.5, marginBottom: 4, opacity: 0.8, textTransform: 'uppercase' },
  compactTitle: { color: '#fff', fontSize: 13, fontWeight: '700', lineHeight: 17, letterSpacing: 0.1 },
  compactFooter: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 },
  compactYear: { color: 'rgba(255,255,255,0.45)', fontSize: 9, fontWeight: '700', letterSpacing: 1 },
  compactDot: { width: 2.5, height: 2.5, borderRadius: 1.25, backgroundColor: 'rgba(255,255,255,0.25)' },
  compactEra: { color: 'rgba(255,255,255,0.35)', fontSize: 8, fontWeight: '600', letterSpacing: 0.5 },
});