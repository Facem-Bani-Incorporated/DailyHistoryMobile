// components/TimelineScreen.tsx
import { Image } from 'expo-image';
import { ChevronDown, Clock } from 'lucide-react-native';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  LayoutAnimation,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { haptic } from '../utils/haptics';
import { StoryModal } from './StoryModal';

const { width: W } = Dimensions.get('window');

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ── Constants ────────────────────────────────────────────────────────────────
const SPINE_LEFT = 28;
const SPINE_W = 2;
const NODE_SIZE = 14;
const ERA_NODE = 20;
const CONTENT_LEFT = SPINE_LEFT + 24;

const CAT_COLORS: Record<string, string> = {
  war_conflict: '#E84545', tech_innovation: '#3E7BFA', science_discovery: '#A855F7',
  politics_state: '#F59E0B', culture_arts: '#10B981', natural_disaster: '#F97316',
  exploration: '#06B6D4', religion_phil: '#8B6F47',
};
const CAT_LABELS: Record<string, string> = {
  war_conflict: 'War & Conflict', tech_innovation: 'Technology', science_discovery: 'Science',
  politics_state: 'Politics', culture_arts: 'Culture & Arts', natural_disaster: 'Natural Disaster',
  exploration: 'Exploration', religion_phil: 'Religion',
};
const FALLBACK_COLOR = '#8B7355';

const extractYear = (e: any): number => {
  const r = String(e?.eventDate ?? e?.event_date ?? e?.year ?? '').trim();
  if (/^\d{4}$/.test(r)) return parseInt(r);
  if (r.includes('-') && r.split('-')[0].length === 4) return parseInt(r.split('-')[0]);
  return 0;
};

const getCenturyLabel = (year: number): string => {
  if (year <= 0) return 'Ancient';
  const c = Math.ceil(year / 100);
  return `${c}${c === 1 ? 'st' : c === 2 ? 'nd' : c === 3 ? 'rd' : 'th'} Century`;
};

const getCenturyRange = (year: number): string => {
  if (year <= 0) return 'Before 1 AD';
  const c = Math.ceil(year / 100);
  return `${(c - 1) * 100 + 1} – ${c * 100}`;
};

interface CatGroup { key: string; label: string; color: string; events: any[] }
interface CenturyGroup {
  label: string; range: string; sortKey: number;
  categories: CatGroup[]; totalEvents: number;
}
interface Props { allEvents: any[] }

// ── Timeline Event Card ──────────────────────────────────────────────────────
const TimelineEventCard = ({ event, color, theme, isDark, language, onPress, isLast }: {
  event: any; color: string; theme: any; isDark: boolean; language: string;
  onPress: () => void; isLast: boolean;
}) => {
  const title = event.titleTranslations?.[language] ?? event.titleTranslations?.en ?? '';
  const year = extractYear(event);
  const imageUri = event.gallery?.[0];
  const narrative = event.narrativeTranslations?.[language] ?? event.narrativeTranslations?.en ?? '';
  const preview = narrative ? narrative.substring(0, 90).trim() + '…' : '';

  return (
    <View style={ev.row}>
      {/* Spine node */}
      <View style={ev.spineCol}>
        <View style={[ev.lineTop, { backgroundColor: theme.border }]} />
        <View style={[ev.node, { borderColor: color, backgroundColor: theme.background }]}>
          <View style={[ev.nodeInner, { backgroundColor: color }]} />
        </View>
        {!isLast && <View style={[ev.lineBottom, { backgroundColor: theme.border }]} />}
      </View>

      {/* Card */}
      <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={{ flex: 1 }}>
        <View style={[ev.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={ev.cardTop}>
            <View style={[ev.yearPill, { backgroundColor: color + '14' }]}>
              <Text style={[ev.yearText, { color }]}>{year}</Text>
            </View>
            {imageUri && (
              <View style={ev.thumbWrap}>
                <Image source={{ uri: imageUri }} style={ev.thumb} contentFit="cover" transition={200} />
              </View>
            )}
          </View>
          <Text style={[ev.title, { color: theme.text }]} numberOfLines={2}>{title}</Text>
          {preview !== '' && (
            <Text style={[ev.preview, { color: theme.subtext }]} numberOfLines={2}>{preview}</Text>
          )}
          {/* Connector line from node to card */}
          <View style={[ev.connector, { backgroundColor: color + '30' }]} />
        </View>
      </TouchableOpacity>
    </View>
  );
};

const ev = StyleSheet.create({
  row: { flexDirection: 'row', minHeight: 80 },
  spineCol: { width: SPINE_LEFT + 16, alignItems: 'center', paddingLeft: SPINE_LEFT - NODE_SIZE / 2 },
  lineTop: { width: SPINE_W, height: 14 },
  lineBottom: { width: SPINE_W, flex: 1 },
  node: {
    width: NODE_SIZE, height: NODE_SIZE, borderRadius: NODE_SIZE / 2,
    borderWidth: 2.5, alignItems: 'center', justifyContent: 'center', zIndex: 2,
  },
  nodeInner: { width: 5, height: 5, borderRadius: 3 },
  card: {
    flex: 1, borderRadius: 14, padding: 14, marginRight: 16, marginBottom: 6,
    borderWidth: StyleSheet.hairlineWidth,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  yearPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  yearText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  thumbWrap: { width: 36, height: 36, borderRadius: 8, overflow: 'hidden' },
  thumb: { width: 36, height: 36 },
  title: { fontSize: 14, fontWeight: '700', lineHeight: 19, letterSpacing: -0.1 },
  preview: { fontSize: 12, lineHeight: 17, marginTop: 4, opacity: 0.6 },
  connector: {
    position: 'absolute', left: -10, top: 18, width: 10, height: 2, borderRadius: 1,
  },
});

// ── Category group inside century ────────────────────────────────────────────
const CatGroupView = ({ cat, theme, isDark, language, onEventPress }: {
  cat: CatGroup; theme: any; isDark: boolean; language: string; onEventPress: (e: any) => void;
}) => {
  return (
    <View style={cg.wrap}>
      {/* Category label row on the spine */}
      <View style={cg.labelRow}>
        <View style={[cg.spineSection, { paddingLeft: SPINE_LEFT - 4 }]}>
          <View style={[cg.catLine, { backgroundColor: theme.border }]} />
          <View style={[cg.catDot, { backgroundColor: cat.color }]} />
          <View style={[cg.catLine, { backgroundColor: theme.border }]} />
        </View>
        <View style={[cg.catPill, { backgroundColor: cat.color + '12', borderColor: cat.color + '25' }]}>
          <Text style={[cg.catLabel, { color: cat.color }]}>{cat.label}</Text>
          <View style={[cg.catCount, { backgroundColor: cat.color + '18' }]}>
            <Text style={[cg.catCountText, { color: cat.color }]}>{cat.events.length}</Text>
          </View>
        </View>
      </View>

      {/* Events */}
      {cat.events.map((event, i) => (
        <TimelineEventCard
          key={`${extractYear(event)}-${i}`}
          event={event} color={cat.color} theme={theme} isDark={isDark}
          language={language} onPress={() => onEventPress(event)}
          isLast={i === cat.events.length - 1}
        />
      ))}
    </View>
  );
};

const cg = StyleSheet.create({
  wrap: { marginBottom: 4 },
  labelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  spineSection: { width: SPINE_LEFT + 16, alignItems: 'center' },
  catLine: { width: SPINE_W, height: 8 },
  catDot: { width: 8, height: 8, borderRadius: 4, zIndex: 2 },
  catPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1,
  },
  catLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  catCount: { paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 },
  catCountText: { fontSize: 9, fontWeight: '800' },
});

// ── Century Era Node ─────────────────────────────────────────────────────────
const CenturyEra = ({ century, theme, isDark, language, onEventPress, isLast }: {
  century: CenturyGroup; theme: any; isDark: boolean; language: string;
  onEventPress: (e: any) => void; isLast: boolean;
}) => {
  const [expanded, setExpanded] = useState(false);
  const chevronAnim = useRef(new Animated.Value(0)).current;

  const toggle = useCallback(() => {
    haptic('light');
    LayoutAnimation.configureNext(LayoutAnimation.create(300, 'easeInEaseOut', 'opacity'));
    setExpanded(prev => !prev);
    Animated.timing(chevronAnim, { toValue: expanded ? 0 : 1, duration: 250, useNativeDriver: true }).start();
  }, [expanded]);

  const catDots = century.categories.slice(0, 5).map(c => c.color);

  return (
    <View>
      {/* ── Era header row ── */}
      <TouchableOpacity onPress={toggle} activeOpacity={0.7}>
        <View style={era.headerRow}>
          {/* Spine with large era node */}
          <View style={[era.spineCol, { paddingLeft: SPINE_LEFT - ERA_NODE / 2 }]}>
            <View style={[era.lineAbove, { backgroundColor: theme.border }]} />
            <View style={[era.eraNode, {
              backgroundColor: expanded ? theme.gold : theme.card,
              borderColor: theme.gold,
              shadowColor: theme.gold,
            }]}>
              <Text style={[era.eraNodeText, { color: expanded ? '#000' : theme.gold }]}>
                {century.sortKey}
              </Text>
            </View>
            {(!isLast || expanded) && (
              <View style={[era.lineBelow, { backgroundColor: theme.border }]} />
            )}
          </View>

          {/* Century info */}
          <View style={era.info}>
            <View style={era.infoTop}>
              <View style={era.infoTexts}>
                <Text style={[era.label, { color: theme.text }]}>{century.label}</Text>
                <Text style={[era.range, { color: theme.subtext }]}>{century.range}</Text>
              </View>
              <View style={era.infoRight}>
                {!expanded && (
                  <View style={era.catDotsRow}>
                    {catDots.map((c, i) => <View key={i} style={[era.miniDot, { backgroundColor: c }]} />)}
                  </View>
                )}
                <View style={[era.countBadge, { backgroundColor: theme.gold + '15' }]}>
                  <Text style={[era.countText, { color: theme.gold }]}>{century.totalEvents}</Text>
                </View>
                <Animated.View style={{
                  transform: [{ rotate: chevronAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] }) }],
                }}>
                  <ChevronDown size={16} color={theme.subtext} strokeWidth={2} />
                </Animated.View>
              </View>
            </View>
          </View>
        </View>
      </TouchableOpacity>

      {/* ── Expanded content ── */}
      {expanded && (
        <View>
          {century.categories.map(cat => (
            <CatGroupView
              key={cat.key} cat={cat} theme={theme} isDark={isDark}
              language={language} onEventPress={onEventPress}
            />
          ))}
          {/* End cap */}
          <View style={era.endCap}>
            <View style={[era.spineCol, { paddingLeft: SPINE_LEFT - 3 }]}>
              <View style={[era.lineAbove, { backgroundColor: theme.border, height: 12 }]} />
              <View style={[era.endDot, { backgroundColor: theme.border }]} />
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

const era = StyleSheet.create({
  headerRow: { flexDirection: 'row', minHeight: 64 },
  spineCol: { width: SPINE_LEFT + 16, alignItems: 'center' },
  lineAbove: { width: SPINE_W, height: 12 },
  lineBelow: { width: SPINE_W, flex: 1, minHeight: 12 },
  eraNode: {
    width: ERA_NODE, height: ERA_NODE, borderRadius: ERA_NODE / 2,
    borderWidth: 2.5, alignItems: 'center', justifyContent: 'center', zIndex: 3,
    shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 0 }, elevation: 6,
  },
  eraNodeText: { fontSize: 8, fontWeight: '900', letterSpacing: 0.5 },
  info: { flex: 1, justifyContent: 'center', paddingRight: 16, paddingVertical: 10 },
  infoTop: { flexDirection: 'row', alignItems: 'center' },
  infoTexts: { flex: 1, gap: 2 },
  label: { fontSize: 16, fontWeight: '800', letterSpacing: -0.2 },
  range: { fontSize: 11, fontWeight: '500', opacity: 0.5 },
  infoRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  catDotsRow: { flexDirection: 'row', gap: 3 },
  miniDot: { width: 5, height: 5, borderRadius: 3 },
  countBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8 },
  countText: { fontSize: 11, fontWeight: '800' },
  endCap: { height: 20 },
  endDot: { width: 6, height: 6, borderRadius: 3 },
});

// ── Main ─────────────────────────────────────────────────────────────────────
export default function TimelineScreen({ allEvents }: Props) {
  const { theme, isDark } = useTheme();
  const { language, t } = useLanguage();
  const insets = useSafeAreaInsets();
  const [selectedEvent, setSelectedEvent] = useState<any>(null);

  const centuries = useMemo((): CenturyGroup[] => {
    const withYear = allEvents.filter(e => extractYear(e) > 0);
    const map = new Map<number, any[]>();
    for (const e of withYear) {
      const k = Math.ceil(extractYear(e) / 100);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(e);
    }
    const groups: CenturyGroup[] = [];
    for (const [k, events] of map) {
      const catMap = new Map<string, any[]>();
      for (const e of events) {
        const c = (e.category ?? 'culture_arts').toLowerCase();
        if (!catMap.has(c)) catMap.set(c, []);
        catMap.get(c)!.push(e);
      }
      const categories = Array.from(catMap.entries())
        .map(([key, evs]) => ({
          key, label: CAT_LABELS[key] ?? key.replace(/_/g, ' '),
          color: CAT_COLORS[key] ?? FALLBACK_COLOR,
          events: evs.sort((a, b) => extractYear(a) - extractYear(b)),
        }))
        .sort((a, b) => b.events.length - a.events.length);
      groups.push({
        label: getCenturyLabel(k * 100), range: getCenturyRange(k * 100),
        sortKey: k, categories, totalEvents: events.length,
      });
    }
    return groups.sort((a, b) => a.sortKey - b.sortKey);
  }, [allEvents]);

  const totalEvents = useMemo(() => centuries.reduce((s, c) => s + c.totalEvents, 0), [centuries]);
  const s = ms(theme, isDark);

  return (
    <View style={s.root}>
      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 4 }]}>
        <View style={s.headerRow}>
          <Clock size={18} color={theme.gold} strokeWidth={2} />
          <Text style={[s.headerTitle, { color: theme.text }]}>{t('timeline') || 'Timeline'}</Text>
        </View>
        <Text style={[s.headerSub, { color: theme.subtext }]}>
          {totalEvents} events · {centuries.length} centuries
        </Text>
      </View>

      <View style={[s.separator, { backgroundColor: theme.border }]} />

      {totalEvents === 0 ? (
        <View style={s.emptyWrap}>
          <Clock size={32} color={theme.subtext + '30'} strokeWidth={1.5} />
          <Text style={[s.emptyText, { color: theme.subtext }]}>
            {t('no_events') || 'No events to display'}
          </Text>
          <Text style={[s.emptySub, { color: theme.subtext }]}>
            Events will appear as you explore more days
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[s.list, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Timeline start cap */}
          <View style={s.startCap}>
            <View style={[s.startDot, { backgroundColor: theme.gold, shadowColor: theme.gold }]} />
            <Text style={[s.startLabel, { color: theme.subtext }]}>BEGINNING</Text>
          </View>

          {centuries.map((c, i) => (
            <CenturyEra
              key={c.sortKey} century={c} theme={theme} isDark={isDark}
              language={language} onEventPress={(e) => { haptic('light'); setSelectedEvent(e); }}
              isLast={i === centuries.length - 1}
            />
          ))}

          {/* Timeline end cap */}
          <View style={s.endCap}>
            <View style={{ paddingLeft: SPINE_LEFT - 4, alignItems: 'center' }}>
              <View style={[s.endLine, { backgroundColor: theme.border }]} />
              <View style={[s.endDiamond, { backgroundColor: theme.gold }]} />
            </View>
            <Text style={[s.endLabel, { color: theme.subtext }]}>PRESENT</Text>
          </View>
        </ScrollView>
      )}

      <StoryModal
        visible={!!selectedEvent} event={selectedEvent}
        onClose={() => setSelectedEvent(null)} theme={theme}
      />
    </View>
  );
}

const ms = (theme: any, isDark: boolean) => StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.background },

  header: { paddingHorizontal: 20, paddingBottom: 14 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  headerTitle: {
    fontSize: 22, fontWeight: '800', letterSpacing: -0.3,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  headerSub: { fontSize: 13, fontWeight: '500', opacity: 0.5, marginLeft: 28 },
  separator: { height: StyleSheet.hairlineWidth },

  list: { paddingTop: 8, paddingLeft: 0, paddingRight: 0 },

  // Start cap
  startCap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingLeft: SPINE_LEFT - 4, paddingVertical: 12,
  },
  startDot: {
    width: 8, height: 8, borderRadius: 4,
    shadowOpacity: 0.5, shadowRadius: 6, shadowOffset: { width: 0, height: 0 }, elevation: 4,
  },
  startLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 3, opacity: 0.4 },

  // End cap
  endCap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingLeft: 0, paddingVertical: 8,
  },
  endLine: { width: SPINE_W, height: 16 },
  endDiamond: { width: 8, height: 8, borderRadius: 1, transform: [{ rotate: '45deg' }] },
  endLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 3, opacity: 0.4, marginLeft: SPINE_LEFT + 6 },

  // Empty
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 40 },
  emptyText: { fontSize: 16, fontWeight: '600', opacity: 0.5 },
  emptySub: { fontSize: 13, fontWeight: '400', opacity: 0.35, textAlign: 'center' },
});