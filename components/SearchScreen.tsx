// components/SearchScreen.tsx
import { Image } from 'expo-image';
import { Search, X } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
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

const ALL_CATEGORIES = [
  'war_conflict', 'tech_innovation', 'science_discovery', 'politics_state',
  'culture_arts', 'natural_disaster', 'exploration', 'religion_phil',
];

const extractYear = (event: any): string => {
  const raw = event?.eventDate ?? event?.event_date ?? event?.year ?? '';
  const s = String(raw).trim();
  if (/^\d{4}$/.test(s)) return s;
  if (s.includes('-') && s.split('-')[0].length === 4) return s.split('-')[0];
  return '';
};

interface Props {
  allEvents: any[];
}

export default function SearchScreen({ allEvents }: Props) {
  const { theme, isDark } = useTheme();
  const { language, t } = useLanguage();
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);

  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 300);
  }, []);

  const filteredEvents = useMemo(() => {
    let results = [...allEvents];

    if (activeCategory) {
      results = results.filter(e =>
        (e.category ?? '').toLowerCase() === activeCategory,
      );
    }

    if (query.trim().length > 0) {
      const q = query.toLowerCase().trim();
      results = results.filter(e => {
        const title = (
          e.titleTranslations?.[language] ??
          e.titleTranslations?.en ?? ''
        ).toLowerCase();
        const narrative = (
          e.narrativeTranslations?.[language] ??
          e.narrativeTranslations?.en ?? ''
        ).toLowerCase();
        const year = extractYear(e);
        const cat = (e.category ?? '').toLowerCase().replace(/_/g, ' ');
        return title.includes(q) || narrative.includes(q) || year.includes(q) || cat.includes(q);
      });
    }

    return results.sort((a, b) => (b.impactScore ?? 0) - (a.impactScore ?? 0));
  }, [allEvents, query, activeCategory, language]);

  const handleCategoryPress = useCallback((cat: string) => {
    haptic('selection');
    setActiveCategory(prev => prev === cat ? null : cat);
  }, []);

  const s = makeStyles(theme, isDark);

  const renderEvent = ({ item }: { item: any }) => {
    const title = item.titleTranslations?.[language] ?? item.titleTranslations?.en ?? '';
    const year = extractYear(item);
    const catKey = (item.category ?? '').toLowerCase();
    const catColor = CAT_COLORS[catKey] ?? '#8B7355';
    // Categoria fara underscore
    const catLabel = (item.category ?? 'history').replace(/_/g, ' ');
    const imageUri = item.gallery?.[0];

    return (
      <TouchableOpacity
        onPress={() => { haptic('light'); setSelectedEvent(item); }}
        activeOpacity={0.85}
        style={[s.resultCard, { backgroundColor: theme.card }]}
      >
        <View style={s.resultImage}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: catColor + '15', alignItems: 'center', justifyContent: 'center' }]}>
              <Search size={16} color={catColor + '40'} />
            </View>
          )}
        </View>

        <View style={s.resultBody}>
          <View style={s.resultMeta}>
            <View style={[s.resultCatDot, { backgroundColor: catColor }]} />
            <Text style={[s.resultCat, { color: catColor }]}>{catLabel.toUpperCase()}</Text>
            {year !== '' && (
              <Text style={[s.resultYear, { color: theme.subtext }]}>{year}</Text>
            )}
          </View>
          <Text style={[s.resultTitle, { color: theme.text }]} numberOfLines={2}>
            {title}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>

      {/* Search bar */}
      <View style={s.searchWrap}>
        <View style={[s.searchBar, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Search size={18} color={theme.subtext} strokeWidth={2} />
          <TextInput
            ref={inputRef}
            style={[s.searchInput, { color: theme.text }]}
            placeholder={t('search_placeholder') || 'Search events, years, places...'}
            placeholderTextColor={theme.subtext + '80'}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => { setQuery(''); haptic('light'); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <X size={16} color={theme.subtext} strokeWidth={2} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Category filter chips */}
      <View style={s.chipsWrap}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={ALL_CATEGORIES}
          keyExtractor={(item) => item}
          contentContainerStyle={s.chipsContent}
          renderItem={({ item }) => {
            const isActive = activeCategory === item;
            const color = CAT_COLORS[item] ?? '#888';
            // Chip label fara underscore, cu fallback la t()
            const label = (t(item) || item).replace(/_/g, ' ');
            return (
              <TouchableOpacity
                onPress={() => handleCategoryPress(item)}
                activeOpacity={0.7}
                style={[s.chip, {
                  backgroundColor: isActive ? color : 'transparent',
                  borderColor: isActive ? color : theme.border,
                }]}
              >
                <View style={[s.chipDot, { backgroundColor: isActive ? '#FFF' : color }]} />
                <Text style={[s.chipLabel, {
                  color: isActive ? '#FFF' : theme.subtext,
                  fontWeight: isActive ? '700' : '500',
                }]}>{label}</Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Results count */}
      <View style={s.countRow}>
        <Text style={[s.countText, { color: theme.subtext }]}>
          {filteredEvents.length} {filteredEvents.length === 1 ? 'result' : 'results'}
        </Text>
      </View>

      {/* Results */}
      <FlatList
        data={filteredEvents}
        keyExtractor={(item, idx) => `${item.eventDate}-${idx}`}
        renderItem={renderEvent}
        contentContainerStyle={[s.listContent, { paddingBottom: insets.bottom + 20 }]}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="on-drag"
        ListEmptyComponent={
          <View style={s.emptyWrap}>
            <Search size={32} color={theme.subtext + '30'} strokeWidth={1.5} />
            <Text style={[s.emptyText, { color: theme.subtext }]}>
              {t('no_results') || 'No events found'}
            </Text>
          </View>
        }
      />

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

  searchWrap: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, borderWidth: 1,
  },
  searchInput: {
    flex: 1, fontSize: 15, fontWeight: '500', paddingVertical: 2,
    fontFamily: Platform.OS === 'ios' ? 'System' : undefined,
  },

  chipsWrap: { marginBottom: 8 },
  chipsContent: { paddingHorizontal: 16, gap: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1,
  },
  chipDot: { width: 7, height: 7, borderRadius: 4 },
  chipLabel: { fontSize: 12, letterSpacing: 0.2 },

  countRow: { paddingHorizontal: 20, paddingBottom: 8 },
  countText: { fontSize: 11, fontWeight: '600', letterSpacing: 0.5, opacity: 0.5 },

  listContent: { paddingHorizontal: 16, gap: 8 },

  resultCard: {
    flexDirection: 'row', borderRadius: 14, overflow: 'hidden', height: 80,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: isDark ? 0.2 : 0.05, shadowRadius: 4, elevation: 2,
  },
  resultImage: { width: 80, height: 80 },
  resultBody: { flex: 1, paddingHorizontal: 12, paddingVertical: 10, justifyContent: 'center', gap: 4 },
  resultMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  resultCatDot: { width: 6, height: 6, borderRadius: 3 },
  resultCat: { fontSize: 9, fontWeight: '700', letterSpacing: 0.8 },
  resultYear: { fontSize: 10, fontWeight: '600', marginLeft: 4, opacity: 0.5 },
  resultTitle: { fontSize: 13, fontWeight: '600', lineHeight: 18 },

  emptyWrap: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 14, fontWeight: '500', opacity: 0.4 },
});