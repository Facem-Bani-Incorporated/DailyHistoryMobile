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
const CARD_H = 280;
const CARD_GAP = 16;
const ITEM_SIZE = CARD_H + CARD_GAP;
const SPINE_X = 32;
const SERIF = Platform.OS === 'ios' ? 'Georgia' : 'serif';

// ── Helpers ─────────────────────────────────────────────────────────────────
const CAT_COLORS: Record<string, string> = {
  war_conflict: '#E84545', tech_innovation: '#3E7BFA', science_discovery: '#A855F7',
  politics_state: '#F59E0B', culture_arts: '#10B981', natural_disaster: '#F97316',
  exploration: '#06B6D4', religion_phil: '#8B6F47',
};
const CAT_LABELS: Record<string, string> = {
  war_conflict: 'War', tech_innovation: 'Tech', science_discovery: 'Science',
  politics_state: 'Politics', culture_arts: 'Culture', natural_disaster: 'Disaster',
  exploration: 'Exploration', religion_phil: 'Religion',
};

const extractYear = (e: any): number => {
  const r = String(e?.eventDate ?? e?.event_date ?? e?.year ?? '').trim();
  if (/^\d{4}$/.test(r)) return parseInt(r);
  if (r.includes('-') && r.split('-')[0].length === 4) return parseInt(r.split('-')[0]);
  return 0;
};

const getCatColor = (cat?: string) => CAT_COLORS[(cat ?? '').toLowerCase()] ?? '#8B7355';
const getCatLabel = (cat?: string) => CAT_LABELS[(cat ?? '').toLowerCase()] ?? 'History';

const getCenturyLabel = (year: number): string => {
  if (year <= 0) return 'Ancient';
  const c = Math.ceil(year / 100);
  const s = c === 1 ? 'st' : c === 2 ? 'nd' : c === 3 ? 'rd' : 'th';
  return `${c}${s} Century`;
};

// ── Types ───────────────────────────────────────────────────────────────────
type TimelineItem =
  | { type: 'era'; century: number; label: string; count: number }
  | { type: 'event'; event: any; index: number };

interface Props { allEvents: any[] }

// ══════════════════════════════════════════════════════════════════════════════
// ANIMATED EVENT CARD — scroll-driven focus
// ══════════════════════════════════════════════════════════════════════════════
const EventCard = React.memo(({
  event, itemIndex, scrollY, theme, isDark, language, gold, onPress,
}: {
  event: any; itemIndex: number; scrollY: SharedValue<number>;
  theme: any; isDark: boolean; language: string; gold: string;
  onPress: () => void;
}) => {
  const year = extractYear(event);
  const title = event.titleTranslations?.[language] ?? event.titleTranslations?.en ?? '';
  const narrative = event.narrativeTranslations?.[language] ?? event.narrativeTranslations?.en ?? '';
  const imageUri = event.gallery?.[0];
  const catColor = getCatColor(event.category);
  const catLabel = getCatLabel(event.category);
  const preview = narrative.length > 120 ? narrative.slice(0, 120).replace(/\s+\S*$/, '') + '...' : narrative;

  // Card center position relative to scroll
  const cardCenter = itemIndex * ITEM_SIZE + CARD_H / 2;

  const animStyle = useAnimatedStyle(() => {
    const viewportCenter = scrollY.value + H / 2 - 80;
    const dist = Math.abs(cardCenter - viewportCenter);
    const maxDist = H * 0.5;

    const scale = interpolate(dist, [0, maxDist], [1, 0.88], Extrapolation.CLAMP);
    const opacity = interpolate(dist, [0, maxDist * 0.5, maxDist], [1, 0.7, 0.4], Extrapolation.CLAMP);

    return {
      transform: [{ scale }],
      opacity,
    };
  });

  // Spine node glow when focused
  const nodeStyle = useAnimatedStyle(() => {
    const viewportCenter = scrollY.value + H / 2 - 80;
    const dist = Math.abs(cardCenter - viewportCenter);
    const maxDist = H * 0.4;
    const glowScale = interpolate(dist, [0, maxDist], [1.4, 0.8], Extrapolation.CLAMP);
    const glowOpacity = interpolate(dist, [0, maxDist], [1, 0.3], Extrapolation.CLAMP);
    return {
      transform: [{ scale: glowScale }],
      opacity: glowOpacity,
    };
  });

  return (
    <View style={[ev.wrapper, { height: CARD_H, marginBottom: CARD_GAP }]}>
      {/* Spine */}
      <View style={ev.spineCol}>
        <View style={[ev.spineLine, { backgroundColor: theme.border }]} />
        <Animated.View style={[ev.node, { backgroundColor: catColor, shadowColor: catColor }, nodeStyle]} />
        <View style={[ev.spineLine, { backgroundColor: theme.border }]} />
      </View>

      {/* Card */}
      <Animated.View style={[ev.cardOuter, animStyle]}>
        <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={{ flex: 1 }}>
          <View style={[ev.card, {
            backgroundColor: isDark ? '#111116' : '#FAFAF9',
            borderColor: isDark ? '#1E1E26' : '#E8E6E1',
          }]}>
            {/* Hero image area */}
            {imageUri ? (
              <View style={ev.imageWrap}>
                <Image source={{ uri: imageUri }} style={ev.image} contentFit="cover" transition={400} />
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.8)']}
                  style={ev.imageOverlay}
                />
                {/* Year badge on image */}
                <View style={[ev.yearBadgeImage, { backgroundColor: catColor }]}>
                  <Text style={ev.yearBadgeText}>{year}</Text>
                </View>
              </View>
            ) : (
              <View style={[ev.noImageHero, { backgroundColor: catColor + '0A' }]}>
                <Text style={[ev.noImageYear, { color: catColor }]}>{year}</Text>
                <View style={[ev.noImageLine, { backgroundColor: catColor + '20' }]} />
              </View>
            )}

            {/* Content */}
            <View style={ev.content}>
              {/* Category + Year row */}
              <View style={ev.metaRow}>
                <View style={[ev.catPill, { backgroundColor: catColor + '14', borderColor: catColor + '28' }]}>
                  <View style={[ev.catDot, { backgroundColor: catColor }]} />
                  <Text style={[ev.catText, { color: catColor }]}>{catLabel}</Text>
                </View>
                {imageUri && (
                  <Text style={[ev.yearSmall, { color: theme.subtext }]}>{year}</Text>
                )}
              </View>

              {/* Title */}
              <Text style={[ev.title, { color: theme.text }]} numberOfLines={2}>
                {title}
              </Text>

              {/* Narrative preview */}
              {preview !== '' && (
                <Text style={[ev.narrative, { color: theme.subtext }]} numberOfLines={2}>
                  {preview}
                </Text>
              )}
            </View>

            {/* Connector from spine to card */}
            <View style={[ev.connector, { backgroundColor: catColor + '30' }]} />
          </View>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
});

const ev = StyleSheet.create({
  wrapper: { flexDirection: 'row', paddingRight: 20 },
  spineCol: { width: SPINE_X + 20, alignItems: 'center', paddingLeft: SPINE_X - 5 },
  spineLine: { flex: 1, width: 2, borderRadius: 1 },
  node: {
    width: 10, height: 10, borderRadius: 5, zIndex: 2,
    shadowOpacity: 0.5, shadowRadius: 8, shadowOffset: { width: 0, height: 0 }, elevation: 4,
  },
  cardOuter: { flex: 1 },
  card: {
    flex: 1, borderRadius: 18, overflow: 'hidden',
    borderWidth: 1,
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 }, elevation: 3,
  },
  imageWrap: { height: 140, overflow: 'hidden' },
  image: { width: '100%', height: '100%' },
  imageOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 60 },
  yearBadgeImage: {
    position: 'absolute', bottom: 10, left: 14,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
  },
  yearBadgeText: { color: '#fff', fontSize: 13, fontWeight: '900', letterSpacing: 0.5 },
  noImageHero: {
    height: 80, alignItems: 'center', justifyContent: 'center',
  },
  noImageYear: { fontSize: 32, fontWeight: '900', letterSpacing: -1, opacity: 0.3 },
  noImageLine: { position: 'absolute', bottom: 0, left: 20, right: 20, height: 1 },
  content: { flex: 1, padding: 14, gap: 6 },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  catPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1,
  },
  catDot: { width: 5, height: 5, borderRadius: 3 },
  catText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' },
  yearSmall: { fontSize: 11, fontWeight: '600', opacity: 0.4 },
  title: {
    fontSize: 16, fontWeight: '800', letterSpacing: -0.2, lineHeight: 21,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  narrative: { fontSize: 12.5, lineHeight: 18, opacity: 0.6 },
  connector: {
    position: 'absolute', left: -12, top: '45%' as any, width: 12, height: 2, borderRadius: 1,
  },
});

// ══════════════════════════════════════════════════════════════════════════════
// ERA DIVIDER — century separator in the timeline
// ══════════════════════════════════════════════════════════════════════════════
const EraDivider = React.memo(({ century, label, count, theme, gold, scrollY, itemIndex }: {
  century: number; label: string; count: number;
  theme: any; gold: string; scrollY: SharedValue<number>; itemIndex: number;
}) => {
  const cardCenter = itemIndex * ITEM_SIZE + 36;

  const animStyle = useAnimatedStyle(() => {
    const viewportCenter = scrollY.value + H / 2 - 80;
    const dist = Math.abs(cardCenter - viewportCenter);
    const maxDist = H * 0.5;
    const opacity = interpolate(dist, [0, maxDist * 0.4, maxDist], [1, 0.8, 0.5], Extrapolation.CLAMP);
    return { opacity };
  });

  return (
    <Animated.View style={[ed.wrapper, { height: CARD_H, marginBottom: CARD_GAP }, animStyle]}>
      {/* Spine */}
      <View style={ed.spineCol}>
        <View style={[ed.spineLine, { backgroundColor: theme.border }]} />
        <View style={[ed.eraNode, { backgroundColor: gold, shadowColor: gold }]}>
          <Text style={ed.eraNodeText}>{century}</Text>
        </View>
        <View style={[ed.spineLine, { backgroundColor: theme.border }]} />
      </View>

      {/* Era content */}
      <View style={ed.content}>
        <View style={ed.inner}>
          <Text style={[ed.label, { color: gold }]}>{label}</Text>
          <View style={[ed.divider, { backgroundColor: gold + '25' }]} />
          <Text style={[ed.count, { color: theme.subtext }]}>
            {count} {count === 1 ? 'event' : 'events'}
          </Text>
        </View>
      </View>
    </Animated.View>
  );
});

const ed = StyleSheet.create({
  wrapper: { flexDirection: 'row', paddingRight: 20, justifyContent: 'center' },
  spineCol: { width: SPINE_X + 20, alignItems: 'center', paddingLeft: SPINE_X - 10 },
  spineLine: { flex: 1, width: 2, borderRadius: 1 },
  eraNode: {
    width: 22, height: 22, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center', zIndex: 3,
    shadowOpacity: 0.4, shadowRadius: 10, shadowOffset: { width: 0, height: 0 }, elevation: 6,
  },
  eraNodeText: { color: '#000', fontSize: 8, fontWeight: '900', letterSpacing: 0.3 },
  content: { flex: 1, justifyContent: 'center', paddingRight: 20 },
  inner: { alignItems: 'flex-start', gap: 8 },
  label: {
    fontSize: 24, fontWeight: '900', letterSpacing: -0.5,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  divider: { width: 40, height: 2, borderRadius: 1 },
  count: { fontSize: 12, fontWeight: '600', opacity: 0.5, letterSpacing: 0.5 },
});

// ══════════════════════════════════════════════════════════════════════════════
// FOCUS INDICATOR — center crosshair line
// ══════════════════════════════════════════════════════════════════════════════
const FocusIndicator = ({ theme, gold }: { theme: any; gold: string }) => (
  <View style={fi.wrap} pointerEvents="none">
    <View style={[fi.line, { backgroundColor: gold + '15' }]} />
  </View>
);
const fi = StyleSheet.create({
  wrap: {
    position: 'absolute', left: SPINE_X + 16, right: 0,
    top: '50%' as any, marginTop: -40, height: 0, zIndex: 10,
  },
  line: { height: 1, borderRadius: 1 },
});

// ══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════
export default function TimelineScreen({ allEvents }: Props) {
  const { theme, isDark, isPremium } = useTheme();
  const { language, t } = useLanguage();
  const insets = useSafeAreaInsets();
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const scrollY = useSharedValue(0);
  const gold = isPremium ? '#D4A843' : theme.gold;

  // Flatten events sorted by year, with era dividers inserted
  const timelineItems = useMemo((): TimelineItem[] => {
    const sorted = allEvents
      .filter(e => extractYear(e) > 0)
      .sort((a, b) => extractYear(a) - extractYear(b));

    const items: TimelineItem[] = [];
    let lastCentury = -1;

    // Count events per century
    const centuryCounts = new Map<number, number>();
    for (const e of sorted) {
      const c = Math.ceil(extractYear(e) / 100);
      centuryCounts.set(c, (centuryCounts.get(c) ?? 0) + 1);
    }

    let idx = 0;
    for (const event of sorted) {
      const c = Math.ceil(extractYear(event) / 100);
      if (c !== lastCentury) {
        items.push({
          type: 'era',
          century: c,
          label: getCenturyLabel(c * 100),
          count: centuryCounts.get(c) ?? 0,
        });
        lastCentury = c;
      }
      items.push({ type: 'event', event, index: idx++ });
    }

    return items;
  }, [allEvents]);

  const totalEvents = useMemo(
    () => timelineItems.filter(i => i.type === 'event').length,
    [timelineItems],
  );
  const totalCenturies = useMemo(
    () => timelineItems.filter(i => i.type === 'era').length,
    [timelineItems],
  );

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (e) => { scrollY.value = e.contentOffset.y; },
  });

  const onEventPress = useCallback((event: any) => {
    haptic('light');
    setSelectedEvent(event);
  }, []);

  const renderItem = useCallback(({ item, index }: { item: TimelineItem; index: number }) => {
    if (item.type === 'era') {
      return (
        <EraDivider
          century={item.century}
          label={item.label}
          count={item.count}
          theme={theme}
          gold={gold}
          scrollY={scrollY}
          itemIndex={index}
        />
      );
    }

    return (
      <EventCard
        event={item.event}
        itemIndex={index}
        scrollY={scrollY}
        theme={theme}
        isDark={isDark}
        language={language}
        gold={gold}
        onPress={() => onEventPress(item.event)}
      />
    );
  }, [theme, isDark, language, gold, scrollY, onEventPress]);

  const getItemLayout = useCallback((_: any, index: number) => ({
    length: ITEM_SIZE,
    offset: ITEM_SIZE * index,
    index,
  }), []);

  const keyExtractor = useCallback((item: TimelineItem, index: number) => {
    if (item.type === 'era') return `era-${item.century}`;
    return `ev-${extractYear(item.event)}-${index}`;
  }, []);

  return (
    <View style={[s.root, { backgroundColor: theme.background }]}>
      {isPremium && (
        <LinearGradient
          colors={['#0A0815', '#05040A']}
          style={StyleSheet.absoluteFill}
        />
      )}

      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 4 }]}>
        <View style={s.headerRow}>
          <View style={[s.headerIcon, { backgroundColor: gold + '15' }]}>
            <Clock size={16} color={gold} strokeWidth={2.2} />
          </View>
          <View>
            <Text style={[s.headerTitle, { color: theme.text }]}>
              {t('timeline') || 'Timeline'}
            </Text>
            <Text style={[s.headerSub, { color: theme.subtext }]}>
              {totalEvents} events across {totalCenturies} centuries
            </Text>
          </View>
        </View>
      </View>

      <View style={[s.separator, { backgroundColor: theme.border }]} />

      {totalEvents === 0 ? (
        <View style={s.emptyWrap}>
          <View style={[s.emptyIcon, { borderColor: theme.subtext + '20' }]}>
            <Clock size={28} color={theme.subtext + '40'} strokeWidth={1.5} />
          </View>
          <Text style={[s.emptyText, { color: theme.text }]}>
            {t('no_events') || 'No events yet'}
          </Text>
          <Text style={[s.emptySub, { color: theme.subtext }]}>
            Events will appear as you explore more days
          </Text>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <FocusIndicator theme={theme} gold={gold} />

          <Animated.FlatList
            data={timelineItems}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            getItemLayout={getItemLayout}
            onScroll={scrollHandler}
            scrollEventThrottle={16}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              paddingTop: H * 0.35,
              paddingBottom: H * 0.4 + insets.bottom,
            }}
            removeClippedSubviews={Platform.OS === 'android'}
            maxToRenderPerBatch={8}
            windowSize={7}
          />

          {/* Spine line overlay (background) */}
          <View style={[s.spineOverlay, { backgroundColor: theme.border }]} pointerEvents="none" />
        </View>
      )}

      <StoryModal
        visible={!!selectedEvent}
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
        theme={theme}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },

  header: { paddingHorizontal: 20, paddingBottom: 14 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerIcon: {
    width: 36, height: 36, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20, fontWeight: '800', letterSpacing: -0.3,
    fontFamily: SERIF,
  },
  headerSub: { fontSize: 12, fontWeight: '500', opacity: 0.5, marginTop: 1 },
  separator: { height: StyleSheet.hairlineWidth },

  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 40 },
  emptyIcon: {
    width: 64, height: 64, borderRadius: 32, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  emptyText: { fontSize: 17, fontWeight: '700', letterSpacing: -0.2 },
  emptySub: { fontSize: 13, fontWeight: '400', opacity: 0.5, textAlign: 'center', lineHeight: 19 },

  spineOverlay: {
    position: 'absolute', left: SPINE_X + 14, top: 0, bottom: 0,
    width: 2, borderRadius: 1, opacity: 0.15, zIndex: -1,
  },
});
