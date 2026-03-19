// components/RelatedEvents.tsx
// ═══════════════════════════════════════════════════════════════════════════════
//  RELATED EVENTS — "History Connections" section inside StoryModal
//  Finds related events from allCollectedEvents by:
//    1. Same category (highest priority)
//    2. Same decade (±10 years)
//    3. Same century
//  Shows up to 4 related events as tappable cards
// ═══════════════════════════════════════════════════════════════════════════════

import { Image } from 'expo-image';
import { Bookmark, Link2 } from 'lucide-react-native';
import React, { useMemo } from 'react';
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useLanguage } from '../context/LanguageContext';
import { getEventId } from '../store/useSavedStore';

const T: Record<string, Record<string, string>> = {
  en: { related: 'History Connections', sameCategory: 'Same category', sameEra: 'Same era', sameCentury: 'Same century' },
  ro: { related: 'Conexiuni Istorice', sameCategory: 'Aceeași categorie', sameEra: 'Aceeași eră', sameCentury: 'Același secol' },
  fr: { related: 'Connexions Historiques', sameCategory: 'Même catégorie', sameEra: 'Même époque', sameCentury: 'Même siècle' },
  de: { related: 'Historische Verbindungen', sameCategory: 'Gleiche Kategorie', sameEra: 'Gleiche Ära', sameCentury: 'Gleiches Jahrhundert' },
  es: { related: 'Conexiones Históricas', sameCategory: 'Misma categoría', sameEra: 'Misma era', sameCentury: 'Mismo siglo' },
};
const tx = (lang: string, key: string) => (T[lang] ?? T.en)[key] ?? T.en[key] ?? key;

const CAT_COLORS: Record<string, string> = {
  war_conflict: '#E84545', tech_innovation: '#3E7BFA', science_discovery: '#A855F7',
  politics_state: '#F59E0B', culture_arts: '#10B981', natural_disaster: '#F97316',
  exploration: '#06B6D4', religion_phil: '#8B6F47',
};

function extractYear(event: any): number {
  if (event?.year && Number(event.year) > 100) return Number(event.year);
  const raw = event?.eventDate ?? event?.event_date ?? '';
  const match = String(raw).match(/^(\d{3,4})/);
  return match ? parseInt(match[1], 10) : 0;
}

function getCatColor(cat: string): string {
  return CAT_COLORS[(cat ?? '').toLowerCase().replace(/\s+/g, '_')] ?? '#8B7355';
}

interface RelatedEventsProps {
  currentEvent: any;
  allEvents: any[];
  theme: any;
  isDark: boolean;
  onEventPress: (event: any) => void;
}

interface ScoredEvent {
  event: any;
  score: number;
  reason: 'sameCategory' | 'sameEra' | 'sameCentury';
}

export default function RelatedEvents({ currentEvent, allEvents, theme, isDark, onEventPress }: RelatedEventsProps) {
  const { language } = useLanguage();

  const relatedEvents = useMemo(() => {
    if (!currentEvent || !allEvents || allEvents.length === 0) return [];

    const currentId = getEventId(currentEvent);
    const currentCat = (currentEvent.category ?? '').toLowerCase().trim();
    const currentYear = extractYear(currentEvent);
    const currentDecade = Math.floor(currentYear / 10) * 10;
    const currentCentury = Math.floor(currentYear / 100) * 100;

    const scored: ScoredEvent[] = [];

    for (const evt of allEvents) {
      const evtId = getEventId(evt);
      if (evtId === currentId) continue;

      const evtCat = (evt.category ?? '').toLowerCase().trim();
      const evtYear = extractYear(evt);
      const evtDecade = Math.floor(evtYear / 10) * 10;
      const evtCentury = Math.floor(evtYear / 100) * 100;

      // Same category = highest score
      if (currentCat && evtCat === currentCat) {
        // Bonus if also same era
        const eraBonus = (evtYear > 0 && currentYear > 0 && Math.abs(evtYear - currentYear) <= 20) ? 2 : 0;
        scored.push({ event: evt, score: 10 + eraBonus, reason: 'sameCategory' });
        continue;
      }

      // Same decade
      if (evtYear > 0 && currentYear > 0 && evtDecade === currentDecade) {
        scored.push({ event: evt, score: 7, reason: 'sameEra' });
        continue;
      }

      // Same century
      if (evtYear > 0 && currentYear > 0 && evtCentury === currentCentury) {
        scored.push({ event: evt, score: 4, reason: 'sameCentury' });
      }
    }

    // Sort by score desc, take top 4
    scored.sort((a, b) => b.score - a.score);

    // Ensure diversity: max 2 from same reason
    const result: ScoredEvent[] = [];
    const reasonCounts: Record<string, number> = {};
    for (const s of scored) {
      const count = reasonCounts[s.reason] ?? 0;
      if (count >= 2) continue;
      result.push(s);
      reasonCounts[s.reason] = count + 1;
      if (result.length >= 4) break;
    }

    return result;
  }, [currentEvent, allEvents]);

  if (relatedEvents.length === 0) return null;

  return (
    <View style={rs.container}>
      {/* Section header */}
      <View style={rs.headerRow}>
        <Link2 size={14} color={theme.gold} strokeWidth={2} />
        <Text style={[rs.headerText, { color: theme.gold }]}>
          {tx(language, 'related').toUpperCase()}
        </Text>
      </View>

      {/* Event cards */}
      <View style={rs.list}>
        {relatedEvents.map(({ event, reason }, i) => {
          const title = event.titleTranslations?.[language] ?? event.titleTranslations?.en ?? '';
          const year = extractYear(event);
          const cat = (event.category ?? '').replace(/_/g, ' ').toUpperCase();
          const catColor = getCatColor(event.category ?? '');
          const imageUri = event.gallery?.[0];

          return (
            <TouchableOpacity
              key={getEventId(event) || `related-${i}`}
              activeOpacity={0.8}
              onPress={() => onEventPress(event)}
              style={[rs.card, {
                backgroundColor: isDark ? '#141210' : '#FFFFFF',
                borderColor: isDark ? '#251E16' : '#EDE5D8',
              }]}
            >
              {/* Thumbnail */}
              <View style={rs.thumb}>
                {imageUri ? (
                  <Image source={{ uri: imageUri }} style={StyleSheet.absoluteFill} contentFit="cover" transition={300} />
                ) : (
                  <View style={[StyleSheet.absoluteFill, { backgroundColor: catColor + '15', alignItems: 'center', justifyContent: 'center' }]}>
                    <Bookmark size={14} color={catColor + '60'} strokeWidth={1.5} />
                  </View>
                )}
                {year > 0 && (
                  <View style={rs.yearBadge}>
                    <Text style={rs.yearText}>{year}</Text>
                  </View>
                )}
              </View>

              {/* Info */}
              <View style={rs.info}>
                <View style={rs.catRow}>
                  <View style={[rs.catDot, { backgroundColor: catColor }]} />
                  <Text style={[rs.catLabel, { color: catColor }]} numberOfLines={1}>{cat}</Text>
                </View>
                <Text style={[rs.title, { color: theme.text }]} numberOfLines={2}>{title}</Text>
                <Text style={[rs.reasonLabel, { color: theme.subtext }]}>
                  {tx(language, reason)}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const rs = StyleSheet.create({
  container: {
    marginTop: 8,
    marginBottom: 24,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  headerText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
  },
  list: {
    gap: 10,
  },
  card: {
    flexDirection: 'row',
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    height: 88,
  },
  thumb: {
    width: 80,
    height: 88,
  },
  yearBadge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 6,
  },
  yearText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  info: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: 'center',
    gap: 4,
  },
  catRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  catDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  catLabel: {
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 17,
  },
  reasonLabel: {
    fontSize: 9,
    fontWeight: '500',
    opacity: 0.4,
    letterSpacing: 0.3,
  },
});