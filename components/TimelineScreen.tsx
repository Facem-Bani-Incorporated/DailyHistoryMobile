// components/TimelineScreen.tsx
import { Image } from 'expo-image';
import { Clock } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import {
    Dimensions,
    FlatList,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { haptic } from '../utils/haptics';
import { StoryModal } from './StoryModal';

const { width: W } = Dimensions.get('window');

const CAT_COLORS: Record<string, string> = {
  war_conflict: '#E84545', tech_innovation: '#3E7BFA',
  science_discovery: '#A855F7', politics_state: '#F59E0B',
  culture_arts: '#10B981', natural_disaster: '#F97316',
  exploration: '#06B6D4', religion_phil: '#8B6F47',
};

const extractYear = (event: any): number => {
  const raw = event?.eventDate ?? event?.event_date ?? event?.year ?? '';
  const s = String(raw).trim();
  if (/^\d{4}$/.test(s)) return parseInt(s);
  if (s.includes('-') && s.split('-')[0].length === 4) return parseInt(s.split('-')[0]);
  return 0;
};

interface Props {
  allEvents: any[];
}

export default function TimelineScreen({ allEvents }: Props) {
  const { theme, isDark } = useTheme();
  const { language, t } = useLanguage();
  const insets = useSafeAreaInsets();
  const [selectedEvent, setSelectedEvent] = useState<any>(null);

  // Sort events by year (oldest first for timeline)
  const timelineEvents = useMemo(() => {
    return [...allEvents]
      .filter(e => extractYear(e) > 0)
      .sort((a, b) => extractYear(a) - extractYear(b));
  }, [allEvents]);

  // Group into centuries for section headers
  const centuries = useMemo(() => {
    const map = new Map<string, typeof timelineEvents>();
    for (const event of timelineEvents) {
      const year = extractYear(event);
      const century = Math.ceil(year / 100);
      const label = year < 0 ? `${Math.abs(year)} BC` : `${century}th Century`;
      if (!map.has(label)) map.set(label, []);
      map.get(label)!.push(event);
    }
    return Array.from(map.entries()).map(([label, events]) => ({ label, events }));
  }, [timelineEvents]);

  // Flatten for FlatList with section headers
  type ListItem = { type: 'header'; label: string; count: number } | { type: 'event'; event: any; isLast: boolean };
  const listData = useMemo(() => {
    const items: ListItem[] = [];
    for (const section of centuries) {
      items.push({ type: 'header', label: section.label, count: section.events.length });
      section.events.forEach((event, i) => {
        items.push({ type: 'event', event, isLast: i === section.events.length - 1 });
      });
    }
    return items;
  }, [centuries]);

  const s = makeStyles(theme, isDark);

  const renderItem = ({ item }: { item: ListItem }) => {
    if (item.type === 'header') {
      return (
        <View style={s.sectionHeader}>
          <View style={[s.sectionDot, { backgroundColor: theme.gold }]} />
          <Text style={[s.sectionLabel, { color: theme.gold }]}>{item.label}</Text>
          <View style={[s.sectionLine, { backgroundColor: theme.border }]} />
          <Text style={[s.sectionCount, { color: theme.subtext }]}>{item.count}</Text>
        </View>
      );
    }

    const { event, isLast } = item;
    const title = event.titleTranslations?.[language] ?? event.titleTranslations?.en ?? '';
    const year = extractYear(event);
    const catKey = (event.category ?? '').toLowerCase();
    const catColor = CAT_COLORS[catKey] ?? '#8B7355';
    const catLabel = (event.category ?? 'history').replace(/_/g, ' ');
    const imageUri = event.gallery?.[0];
    const impact = event.impactScore ?? 0;

    return (
      <TouchableOpacity
        onPress={() => { haptic('light'); setSelectedEvent(event); }}
        activeOpacity={0.88}
        style={s.eventRow}
      >
        {/* Timeline spine */}
        <View style={s.spine}>
          <View style={[s.spineLine, { backgroundColor: theme.border }, !isLast && { flex: 1 }]} />
          <View style={[s.spineNode, { borderColor: catColor, backgroundColor: theme.background }]}>
            <View style={[s.spineNodeInner, { backgroundColor: catColor }]} />
          </View>
          {!isLast && <View style={[s.spineLine, { backgroundColor: theme.border, flex: 1 }]} />}
        </View>

        {/* Card */}
        <View style={[s.eventCard, { backgroundColor: theme.card }]}>
          <View style={s.eventTop}>
            <View style={s.eventMeta}>
              <Text style={[s.eventYear, { color: catColor }]}>{year}</Text>
              <View style={[s.eventCatPill, { backgroundColor: catColor + '12' }]}>
                <Text style={[s.eventCatText, { color: catColor }]}>{catLabel}</Text>
              </View>
            </View>
            {impact > 0 && (
              <Text style={[s.eventImpact, { color: theme.subtext }]}>{impact}%</Text>
            )}
          </View>

          <Text style={[s.eventTitle, { color: theme.text }]} numberOfLines={2}>
            {title}
          </Text>

          {/* Tiny image preview */}
          {imageUri && (
            <View style={s.eventImageWrap}>
              <Image source={{ uri: imageUri }} style={s.eventImage} contentFit="cover" transition={200} />
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.header}>
        <Clock size={18} color={theme.gold} strokeWidth={2} />
        <Text style={[s.headerTitle, { color: theme.text }]}>
          {t('timeline') || 'Timeline'}
        </Text>
        <Text style={[s.headerCount, { color: theme.subtext }]}>
          {timelineEvents.length} events
        </Text>
      </View>

      <View style={[s.separator, { backgroundColor: theme.border }]} />

      {timelineEvents.length === 0 ? (
        <View style={s.emptyWrap}>
          <Clock size={32} color={theme.subtext + '30'} strokeWidth={1.5} />
          <Text style={[s.emptyText, { color: theme.subtext }]}>
            {t('no_events') || 'No events to display'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={listData}
          keyExtractor={(item, idx) => `tl-${idx}`}
          renderItem={renderItem}
          contentContainerStyle={[s.list, { paddingBottom: insets.bottom + 20 }]}
          showsVerticalScrollIndicator={false}
        />
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

const makeStyles = (theme: any, isDark: boolean) => StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.background },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 14,
  },
  headerTitle: {
    fontSize: 22, fontWeight: '800', letterSpacing: -0.3, flex: 1,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  headerCount: { fontSize: 12, fontWeight: '600', opacity: 0.5 },
  separator: { height: StyleSheet.hairlineWidth },

  list: { paddingTop: 16 },

  // Section header
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 20, paddingVertical: 12,
  },
  sectionDot: { width: 8, height: 8, borderRadius: 4 },
  sectionLabel: { fontSize: 14, fontWeight: '800', letterSpacing: 0.5 },
  sectionLine: { flex: 1, height: StyleSheet.hairlineWidth },
  sectionCount: { fontSize: 11, fontWeight: '600', opacity: 0.4 },

  // Event row
  eventRow: {
    flexDirection: 'row',
    paddingRight: 16,
    minHeight: 90,
  },

  // Spine
  spine: {
    width: 44,
    alignItems: 'center',
  },
  spineLine: { width: 2, minHeight: 12 },
  spineNode: {
    width: 14, height: 14, borderRadius: 7,
    borderWidth: 2.5,
    alignItems: 'center', justifyContent: 'center',
    zIndex: 2,
  },
  spineNodeInner: { width: 5, height: 5, borderRadius: 3 },

  // Event card
  eventCard: {
    flex: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: isDark ? 0.2 : 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  eventTop: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 6,
  },
  eventMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  eventYear: { fontSize: 13, fontWeight: '900', letterSpacing: 0.5 },
  eventCatPill: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  eventCatText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
  eventImpact: { fontSize: 10, fontWeight: '700', opacity: 0.4 },
  eventTitle: { fontSize: 13, fontWeight: '600', lineHeight: 18 },
  eventImageWrap: {
    marginTop: 8, height: 48, borderRadius: 8, overflow: 'hidden',
  },
  eventImage: { width: '100%', height: 48 },

  // Empty
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyText: { fontSize: 14, fontWeight: '500', opacity: 0.4 },
});