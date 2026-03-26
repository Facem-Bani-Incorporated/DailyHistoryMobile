// app/(main)/saved.tsx
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Bookmark, Trash2 } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  PanResponder,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StoryModal } from '../../components/StoryModal';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { getEventId, useSavedStore, useUserSavedEvents } from '../../store/useSavedStore';

const { width: W } = Dimensions.get('window');
const SWIPE_THRESHOLD = W * 0.28;
const SERIF = Platform.OS === 'ios' ? 'Georgia' : 'serif';
const CARD_IMG_H = 196;

/* ─── Translations ─── */
const T: Record<string, Record<string, string>> = {
  en: { saved: 'Saved', event_saved: 'story collected', events_saved: 'stories collected', recent: 'Recent', by_year: 'By Year', nothing_saved: 'Your collection is empty', save_hint: 'Tap the bookmark icon on any story to start building your personal archive.', swipe_remove: 'Remove', end_of_list: 'End of collection', categories: 'categories', swipe_hint: 'swipe left to remove', no_filter: 'No stories in this category' },
  ro: { saved: 'Salvate', event_saved: 'poveste colectată', events_saved: 'povești colectate', recent: 'Recente', by_year: 'După An', nothing_saved: 'Colecția ta e goală', save_hint: 'Apasă pe bookmark pe orice poveste pentru a-ți construi arhiva personală.', swipe_remove: 'Șterge', end_of_list: 'Sfârșitul colecției', categories: 'categorii', swipe_hint: 'glisează stânga pentru a șterge', no_filter: 'Nicio poveste în această categorie' },
  fr: { saved: 'Enregistrés', event_saved: 'histoire collectée', events_saved: 'histoires collectées', recent: 'Récents', by_year: 'Par Année', nothing_saved: 'Votre collection est vide', save_hint: 'Appuyez sur le favori pour commencer votre archive personnelle.', swipe_remove: 'Supprimer', end_of_list: 'Fin de la collection', categories: 'catégories', swipe_hint: 'glisser à gauche pour supprimer', no_filter: 'Aucune histoire dans cette catégorie' },
  de: { saved: 'Gespeichert', event_saved: 'Geschichte gesammelt', events_saved: 'Geschichten gesammelt', recent: 'Neueste', by_year: 'Nach Jahr', nothing_saved: 'Ihre Sammlung ist leer', save_hint: 'Tippe auf das Lesezeichen, um dein Archiv aufzubauen.', swipe_remove: 'Entfernen', end_of_list: 'Ende der Sammlung', categories: 'Kategorien', swipe_hint: 'nach links wischen zum Entfernen', no_filter: 'Keine Geschichten in dieser Kategorie' },
  es: { saved: 'Guardados', event_saved: 'historia coleccionada', events_saved: 'historias coleccionadas', recent: 'Recientes', by_year: 'Por Año', nothing_saved: 'Tu colección está vacía', save_hint: 'Toca el marcador en cualquier historia para construir tu archivo personal.', swipe_remove: 'Eliminar', end_of_list: 'Fin de la colección', categories: 'categorías', swipe_hint: 'desliza a la izquierda para eliminar', no_filter: 'No hay historias en esta categoría' },
};

/* ─── Category data ─── */
const CAT_COLORS: Record<string, string> = {
  war_conflict: '#E84545',
  tech_innovation: '#3E7BFA',
  science_discovery: '#A855F7',
  politics_state: '#F59E0B',
  culture_arts: '#10B981',
  natural_disaster: '#F97316',
  exploration: '#06B6D4',
  religion_phil: '#C2965A',
};
const CAT_LABELS: Record<string, string> = {
  war_conflict: 'War',
  tech_innovation: 'Tech',
  science_discovery: 'Science',
  politics_state: 'Politics',
  culture_arts: 'Arts',
  natural_disaster: 'Disasters',
  exploration: 'Exploration',
  religion_phil: 'Philosophy',
};
const getCatColor = (cat: string) => CAT_COLORS[(cat ?? '').toLowerCase().replace(/\s+/g, '_')] ?? '#8B7355';
const getCatLabel = (cat: string) => CAT_LABELS[(cat ?? '').toLowerCase().replace(/\s+/g, '_')] ?? cat.replace(/_/g, ' ');

const extractYear = (event: any): string => {
  const s = String(event?.eventDate ?? event?.event_date ?? event?.year ?? '').trim();
  if (/^\d{4}$/.test(s)) return s;
  if (s.includes('-') && s.split('-')[0].length === 4) return s.split('-')[0];
  return '';
};

/* ══════════════════════════════════
   Swipe-to-delete card wrapper
══════════════════════════════════ */
const SwipeCard: React.FC<{
  children: React.ReactNode;
  onDelete: () => void;
  onPress: () => void;
  removeLabel: string;
}> = ({ children, onDelete, onPress, removeLabel }) => {
  const translateX = useRef(new Animated.Value(0)).current;
  const isSwipingRef = useRef(false);

  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_, g) => {
      const horiz = Math.abs(g.dx) > Math.abs(g.dy) * 1.2 && Math.abs(g.dx) > 6;
      if (horiz) isSwipingRef.current = true;
      return horiz;
    },
    onMoveShouldSetPanResponderCapture: (_, g) =>
      Math.abs(g.dx) > Math.abs(g.dy) * 1.2 && Math.abs(g.dx) > 10,
    onShouldBlockNativeResponder: () => true,
    onPanResponderGrant: () => translateX.stopAnimation(),
    onPanResponderMove: (_, g) => {
      translateX.setValue(g.dx > 10 ? Math.pow(g.dx, 0.5) * 2 : g.dx);
    },
    onPanResponderRelease: (_, g) => {
      isSwipingRef.current = false;
      if (g.dx < -SWIPE_THRESHOLD || g.vx < -0.5) {
        Animated.timing(translateX, { toValue: -W, duration: 250, useNativeDriver: true }).start(() => onDelete());
      } else {
        Animated.spring(translateX, { toValue: 0, tension: 300, friction: 28, useNativeDriver: true }).start();
      }
    },
    onPanResponderTerminate: () => {
      isSwipingRef.current = false;
      Animated.spring(translateX, { toValue: 0, tension: 300, friction: 28, useNativeDriver: true }).start();
    },
  })).current;

  const deleteOpacity = translateX.interpolate({ inputRange: [-160, -80, 0], outputRange: [1, 0.9, 0], extrapolate: 'clamp' });
  const deleteScale = translateX.interpolate({ inputRange: [-160, -80, 0], outputRange: [1.1, 1, 0.6], extrapolate: 'clamp' });
  const cardOpacity = translateX.interpolate({ inputRange: [-W * 0.5, -SWIPE_THRESHOLD, 0], outputRange: [0.4, 0.85, 1], extrapolate: 'clamp' });

  return (
    <View style={sw.wrap}>
      <Animated.View style={[sw.deleteBg, { opacity: deleteOpacity }]}>
        <Animated.View style={{ transform: [{ scale: deleteScale }], alignItems: 'center', gap: 6 }}>
          <Trash2 size={22} color="#fff" strokeWidth={2} />
          <Text style={sw.deleteLabel}>{removeLabel}</Text>
        </Animated.View>
      </Animated.View>
      <Animated.View style={{ transform: [{ translateX }], opacity: cardOpacity }} {...pan.panHandlers}>
        <TouchableOpacity activeOpacity={0.93} onPress={onPress}>
          {children}
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};
const sw = StyleSheet.create({
  wrap: { position: 'relative', overflow: 'hidden', borderRadius: 22 },
  deleteBg: { ...StyleSheet.absoluteFillObject, backgroundColor: '#FF3B30', borderRadius: 22, alignItems: 'flex-end', justifyContent: 'center', paddingRight: 30 },
  deleteLabel: { color: '#fff', fontSize: 10, fontWeight: '700', letterSpacing: 0.8 },
});

/* ══════════════════════════════════
   Main Screen
══════════════════════════════════ */
export default function SavedScreen() {
  const { theme, isDark } = useTheme();
  const { language } = useLanguage();
  const { removeEvent } = useSavedStore();
  const savedEvents = useUserSavedEvents();
  const insets = useSafeAreaInsets();

  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [sortMode, setSortMode] = useState<'recent' | 'year'>('recent');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(18)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 520, useNativeDriver: true }),
      Animated.timing(slideUp, { toValue: 0, duration: 420, useNativeDriver: true }),
    ]).start();
  }, []);

  const ts = useCallback((key: string) => {
    const table = T[language] ?? T['en'];
    return table[key] ?? T['en'][key] ?? key;
  }, [language]);

  /* ── Derived data ── */
  const categories = useMemo(() => {
    const cats = new Set(savedEvents.map(e => e.category).filter(Boolean));
    return Array.from(cats) as string[];
  }, [savedEvents]);

  const yearRange = useMemo(() => {
    const years = savedEvents.map(e => parseInt(extractYear(e))).filter(y => y > 0).sort((a, b) => a - b);
    if (years.length === 0) return '';
    return years.length === 1 || years[0] === years[years.length - 1]
      ? String(years[0])
      : `${years[0]} – ${years[years.length - 1]}`;
  }, [savedEvents]);

  const sortedEvents = useMemo(() => {
    const copy = [...savedEvents];
    if (sortMode === 'year') copy.sort((a, b) => (parseInt(extractYear(b)) || 0) - (parseInt(extractYear(a)) || 0));
    return copy;
  }, [savedEvents, sortMode]);

  const displayEvents = useMemo(() => {
    if (!activeCategory) return sortedEvents;
    return sortedEvents.filter(e => e.category === activeCategory);
  }, [sortedEvents, activeCategory]);

  const handleDelete = useCallback((id: string) => removeEvent(id), [removeEvent]);

  /* ── HEADER ── */
  const renderHeader = () => (
    <View style={[st.header, { paddingTop: insets.top + 12, backgroundColor: theme.background }]}>
      {/* Gold accent line at very top */}
      <View style={[st.headerAccentLine, { backgroundColor: theme.gold }]} />

      <View style={st.headerInner}>
        {/* Left: title block */}
        <View style={st.headerLeft}>
          <Text style={[st.headerLabel, { color: theme.gold }]}>MY LIBRARY</Text>
          <Text style={[st.headerTitle, { color: theme.text }]}>The Archive</Text>
          {savedEvents.length > 0 ? (
            <Text style={[st.headerMeta, { color: theme.subtext }]}>
              {savedEvents.length} {savedEvents.length === 1 ? ts('event_saved') : ts('events_saved')}
              {yearRange !== '' ? `  ·  ${yearRange}` : ''}
            </Text>
          ) : (
            <Text style={[st.headerMeta, { color: theme.subtext }]}>Empty collection</Text>
          )}
        </View>

        {/* Right: bookmark icon, minimal */}
        <Bookmark size={20} color={theme.gold} fill={theme.gold} strokeWidth={1.5} style={{ opacity: 0.7 }} />
      </View>

      {/* Sort tabs — editorial underline style */}
      {savedEvents.length > 1 && (
        <View style={[st.sortTabs, { borderTopColor: theme.border }]}>
          <TouchableOpacity onPress={() => setSortMode('recent')} activeOpacity={0.6} style={st.sortTab}>
            <Text style={[st.sortTabLabel, { color: sortMode === 'recent' ? theme.text : theme.subtext, fontWeight: sortMode === 'recent' ? '700' : '400' }]}>
              {ts('recent')}
            </Text>
            {sortMode === 'recent' && <View style={[st.sortTabUnderline, { backgroundColor: theme.gold }]} />}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setSortMode('year')} activeOpacity={0.6} style={st.sortTab}>
            <Text style={[st.sortTabLabel, { color: sortMode === 'year' ? theme.text : theme.subtext, fontWeight: sortMode === 'year' ? '700' : '400' }]}>
              {ts('by_year')}
            </Text>
            {sortMode === 'year' && <View style={[st.sortTabUnderline, { backgroundColor: theme.gold }]} />}
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
        </View>
      )}
    </View>
  );

  /* ── CATEGORY FILTER ── */
  const renderCategoryFilter = () => {
    if (categories.length < 2) return null;
    return (
      <View style={[st.filterBar, { backgroundColor: theme.background, borderBottomColor: theme.border }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.filterScroll}>
          <TouchableOpacity
            onPress={() => setActiveCategory(null)}
            style={[st.filterPill,
              !activeCategory
                ? { backgroundColor: theme.gold, borderColor: theme.gold }
                : { borderColor: theme.border }]}
          >
            <Text style={[st.filterPillLabel, { color: !activeCategory ? (isDark ? '#0A0800' : '#fff') : theme.subtext }]}>
              ALL
            </Text>
          </TouchableOpacity>
          {categories.map(cat => {
            const color = getCatColor(cat);
            const isActive = activeCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                onPress={() => setActiveCategory(isActive ? null : cat)}
                style={[st.filterPill,
                  isActive
                    ? { backgroundColor: color + '20', borderColor: color }
                    : { borderColor: theme.border }]}
              >
                <View style={[st.filterDot, { backgroundColor: color }]} />
                <Text style={[st.filterPillLabel, { color: isActive ? color : theme.subtext }]}>
                  {getCatLabel(cat).toUpperCase()}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    );
  };

  /* ── CARD ── */
  const renderCard = (event: any, index: number) => {
    const title = event.titleTranslations?.[language] ?? event.titleTranslations?.en ?? '';
    const narrative = event.narrativeTranslations?.[language] ?? event.narrativeTranslations?.en ?? '';
    const year = extractYear(event);
    const category = event.category ?? 'history';
    const catColor = getCatColor(category);
    const catLabel = getCatLabel(category).toUpperCase();
    const imageUri = event.gallery?.[0];
    const eventId = getEventId(event);
    const eventKey = eventId || `ev-${index}`;
    const impact = event.impactScore ?? 0;

    return (
      <SwipeCard
        key={eventKey}
        onDelete={() => handleDelete(eventId)}
        onPress={() => setSelectedEvent(event)}
        removeLabel={ts('swipe_remove')}
      >
        <View style={[st.card, { backgroundColor: theme.card }]}>

          {/* Image section */}
          <View style={st.cardImgWrap}>
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={StyleSheet.absoluteFill} contentFit="cover" transition={350} />
            ) : (
              <View style={[StyleSheet.absoluteFill, { backgroundColor: catColor + '14', alignItems: 'center', justifyContent: 'center' }]}>
                <Bookmark size={44} color={catColor + '28'} strokeWidth={1} />
              </View>
            )}

            {/* Gradient overlay */}
            <LinearGradient
              colors={['rgba(0,0,0,0.02)', 'rgba(0,0,0,0.08)', 'rgba(0,0,0,0.65)', 'rgba(0,0,0,0.93)']}
              locations={[0, 0.35, 0.72, 1]}
              style={StyleSheet.absoluteFill}
            />

            {/* Category badge – top right */}
            <View style={[st.catBadge, { backgroundColor: catColor }]}>
              <Text style={st.catBadgeText}>{catLabel}</Text>
            </View>

            {/* Text over image – bottom */}
            <View style={st.cardImgOverlay}>
              {year !== '' && (
                <Text style={st.cardYear}>{year}</Text>
              )}
              <Text style={[st.cardTitle, { fontFamily: SERIF }]} numberOfLines={2}>{title}</Text>
            </View>
          </View>

          {/* Colored accent strip */}
          <View style={[st.accentStrip, { backgroundColor: catColor }]} />

          {/* Text body */}
          <View style={st.cardBody}>
            <Text style={[st.cardExcerpt, { color: theme.subtext }]} numberOfLines={2}>{narrative}</Text>
            {impact > 0 && (
              <View style={st.impactRow}>
                <Text style={[st.impactLabel, { color: theme.subtext }]}>SIGNIFICANCE</Text>
                <View style={[st.impactTrack, { backgroundColor: theme.border }]}>
                  <View style={[st.impactFill, { backgroundColor: catColor, width: `${Math.min(impact, 100)}%` as any }]} />
                </View>
                <Text style={[st.impactScore, { color: catColor }]}>{impact}</Text>
              </View>
            )}
          </View>
        </View>
      </SwipeCard>
    );
  };

  /* ── EMPTY STATE ── */
  const renderEmpty = () => (
    <View style={st.emptyRoot}>
      <View style={st.emptyGlowRing}>
        <View style={st.emptyGlowInner}>
          <Bookmark size={34} color={theme.gold} strokeWidth={1.2} />
        </View>
      </View>
      <Text style={[st.emptyTitle, { color: theme.text, fontFamily: SERIF }]}>{ts('nothing_saved')}</Text>
      <Text style={[st.emptyDesc, { color: theme.subtext }]}>{ts('save_hint')}</Text>
      <View style={[st.emptyHintPill, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={[st.emptyHintText, { color: theme.subtext }]}>← {ts('swipe_hint')}</Text>
      </View>
    </View>
  );

  /* ── NO FILTER RESULTS ── */
  const renderNoFilter = () => (
    <View style={[st.emptyRoot, { paddingTop: 60 }]}>
      <Text style={[st.emptyTitle, { color: theme.text, fontFamily: SERIF, fontSize: 17 }]}>
        {ts('no_filter')}
      </Text>
      <TouchableOpacity onPress={() => setActiveCategory(null)} style={[st.clearFilterBtn, { borderColor: theme.gold + '50', backgroundColor: theme.gold + '0C' }]}>
        <Text style={[st.clearFilterText, { color: theme.gold }]}>SHOW ALL</Text>
      </TouchableOpacity>
    </View>
  );

  /* ── ROOT ── */
  return (
    <View style={[st.root, { backgroundColor: theme.background }]}>
      {renderHeader()}
      {savedEvents.length > 0 && renderCategoryFilter()}

      {savedEvents.length === 0 ? (
        renderEmpty()
      ) : displayEvents.length === 0 ? (
        renderNoFilter()
      ) : (
        <Animated.ScrollView
          style={{ opacity: fadeIn, transform: [{ translateY: slideUp }] }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[st.list, { paddingBottom: insets.bottom + 32 }]}
        >
          {/* Swipe hint */}
          <View style={st.swipeHintRow}>
            <View style={[st.swipeHintLine, { backgroundColor: theme.border }]} />
            <Text style={[st.swipeHintText, { color: theme.subtext }]}>← {ts('swipe_hint')}</Text>
            <View style={[st.swipeHintLine, { backgroundColor: theme.border }]} />
          </View>

          {displayEvents.map((event, i) => renderCard(event, i))}

          {/* Footer */}
          <View style={st.listFooter}>
            <View style={[st.footerLine, { backgroundColor: theme.border }]} />
            <Text style={[st.footerGlyph, { color: theme.gold }]}>✦</Text>
            <View style={[st.footerLine, { backgroundColor: theme.border }]} />
          </View>
          <Text style={[st.footerText, { color: theme.subtext }]}>{ts('end_of_list')}</Text>
        </Animated.ScrollView>
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

/* ══════════════════════════════════
   Styles
══════════════════════════════════ */
const st = StyleSheet.create({
  root: { flex: 1 },

  // Header
  header: { paddingHorizontal: 22, paddingBottom: 0 },
  headerAccentLine: { height: 2, width: 36, borderRadius: 1, marginBottom: 18 },
  headerInner: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 6 },
  headerLeft: { flex: 1 },
  headerLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 3.5, marginBottom: 5 },
  headerTitle: { fontSize: 30, fontWeight: '800', fontFamily: SERIF, letterSpacing: -0.5, lineHeight: 34, marginBottom: 6 },
  headerMeta: { fontSize: 12, fontWeight: '400', opacity: 0.55, letterSpacing: 0.2 },
  sortTabs: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, marginTop: 14, paddingTop: 2 },
  sortTab: { paddingVertical: 10, paddingRight: 24, position: 'relative' },
  sortTabLabel: { fontSize: 13, letterSpacing: 0.2 },
  sortTabUnderline: { position: 'absolute', bottom: 0, left: 0, right: 24, height: 2, borderRadius: 1 },

  // Category filter
  filterBar: { borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 10 },
  filterScroll: { paddingHorizontal: 16, gap: 8, flexDirection: 'row', alignItems: 'center' },
  filterPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 13, paddingVertical: 7, borderRadius: 16, borderWidth: 1 },
  filterDot: { width: 5, height: 5, borderRadius: 3 },
  filterPillLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 1.6 },

  // Cards list
  list: { paddingHorizontal: 16, paddingTop: 14, gap: 14 },
  swipeHintRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  swipeHintLine: { flex: 1, height: StyleSheet.hairlineWidth },
  swipeHintText: { fontSize: 9, fontWeight: '500', opacity: 0.3, letterSpacing: 0.4 },

  // Card
  card: { borderRadius: 22, overflow: 'hidden' },
  cardImgWrap: { width: '100%', height: CARD_IMG_H, position: 'relative' },
  catBadge: { position: 'absolute', top: 14, right: 14, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  catBadgeText: { color: '#fff', fontSize: 8, fontWeight: '800', letterSpacing: 1.6 },
  cardImgOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 16, paddingBottom: 16, paddingTop: 40 },
  cardYear: { color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: '700', letterSpacing: 3, marginBottom: 5 },
  cardTitle: { color: '#fff', fontSize: 21, fontWeight: '800', lineHeight: 27, letterSpacing: -0.2 },
  accentStrip: { height: 3, width: '100%' },
  cardBody: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 14 },
  cardExcerpt: { fontSize: 13, lineHeight: 20, opacity: 0.65 },
  impactRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  impactLabel: { fontSize: 7, fontWeight: '700', letterSpacing: 1.5, opacity: 0.5 },
  impactTrack: { flex: 1, height: 2, borderRadius: 1, overflow: 'hidden' },
  impactFill: { height: 2, borderRadius: 1 },
  impactScore: { fontSize: 10, fontWeight: '800', letterSpacing: 0.3 },

  // Footer
  listFooter: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 16, marginBottom: 6, opacity: 0.3 },
  footerLine: { flex: 1, height: StyleSheet.hairlineWidth },
  footerGlyph: { fontSize: 10 },
  footerText: { textAlign: 'center', fontSize: 11, fontWeight: '500', opacity: 0.25, marginBottom: 4 },

  // Empty state
  emptyRoot: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 44, gap: 12 },
  emptyGlowRing: { width: 100, height: 100, borderRadius: 50, borderWidth: 1, borderColor: 'rgba(255,215,0,0.2)', backgroundColor: 'rgba(255,215,0,0.04)', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  emptyGlowInner: { width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(255,215,0,0.08)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,215,0,0.25)', alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 20, fontWeight: '800', letterSpacing: -0.2, textAlign: 'center' },
  emptyDesc: { fontSize: 14, textAlign: 'center', lineHeight: 22, opacity: 0.45 },
  emptyHintPill: { marginTop: 8, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 14, borderWidth: 1 },
  emptyHintText: { fontSize: 12, fontWeight: '600', letterSpacing: 0.3 },

  // No filter results
  clearFilterBtn: { marginTop: 14, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, borderWidth: 1 },
  clearFilterText: { fontSize: 11, fontWeight: '800', letterSpacing: 2 },
});
