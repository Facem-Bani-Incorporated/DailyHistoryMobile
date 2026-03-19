// app/(main)/saved.tsx
import { Image } from 'expo-image';
import { Bookmark, Clock, Sparkles, Trash2 } from 'lucide-react-native';
import React, { useCallback, useMemo, useRef, useState } from 'react';
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
const DELETE_WIDTH = 80;

// ── Translations ──
const SAVED_T: Record<string, Record<string, string>> = {
  en: {
    saved: 'Saved',
    event_saved: 'event saved',
    events_saved: 'events saved',
    recent: 'Recent',
    by_year: 'By Year',
    nothing_saved: 'Nothing saved yet',
    save_hint: 'Tap the bookmark icon on any story to start building your collection.',
    swipe_hint: 'swipe to remove',
    swipe_remove: 'Remove',
    end_of_list: 'You\u2019re all caught up',
  },
  ro: {
    saved: 'Salvate',
    event_saved: 'eveniment salvat',
    events_saved: 'evenimente salvate',
    recent: 'Recente',
    by_year: 'După An',
    nothing_saved: 'Nimic salvat încă',
    save_hint: 'Apasă pe iconița de bookmark pe orice poveste pentru a-ți construi colecția.',
    swipe_hint: 'glisează pentru a șterge',
    swipe_remove: 'Șterge',
    end_of_list: 'Ești la curent cu tot',
  },
  fr: {
    saved: 'Enregistrés',
    event_saved: 'événement enregistré',
    events_saved: 'événements enregistrés',
    recent: 'Récents',
    by_year: 'Par Année',
    nothing_saved: 'Rien d\'enregistré',
    save_hint: 'Appuyez sur l\'icône de favori sur n\'importe quelle histoire pour commencer votre collection.',
    swipe_hint: 'glisser pour supprimer',
    swipe_remove: 'Supprimer',
    end_of_list: 'Vous êtes à jour',
  },
  de: {
    saved: 'Gespeichert',
    event_saved: 'Ereignis gespeichert',
    events_saved: 'Ereignisse gespeichert',
    recent: 'Neueste',
    by_year: 'Nach Jahr',
    nothing_saved: 'Noch nichts gespeichert',
    save_hint: 'Tippe auf das Lesezeichen-Symbol bei einer Geschichte, um deine Sammlung aufzubauen.',
    swipe_hint: 'wischen zum Entfernen',
    swipe_remove: 'Entfernen',
    end_of_list: 'Du bist auf dem neuesten Stand',
  },
  es: {
    saved: 'Guardados',
    event_saved: 'evento guardado',
    events_saved: 'eventos guardados',
    recent: 'Recientes',
    by_year: 'Por Año',
    nothing_saved: 'Nada guardado aún',
    save_hint: 'Toca el icono de marcador en cualquier historia para comenzar tu colección.',
    swipe_hint: 'desliza para eliminar',
    swipe_remove: 'Eliminar',
    end_of_list: 'Estás al día',
  },
};

const extractYear = (event: any): string => {
  const raw = event?.eventDate ?? event?.event_date ?? event?.year ?? '';
  const s = String(raw).trim();
  if (/^\d{4}$/.test(s)) return s;
  if (s.includes('-') && s.split('-')[0].length === 4) return s.split('-')[0];
  return '';
};

const CAT_COLORS: Record<string, string> = {
  war_conflict: '#E84545',
  tech_innovation: '#3E7BFA',
  science_discovery: '#A855F7',
  politics_state: '#F59E0B',
  culture_arts: '#10B981',
  natural_disaster: '#F97316',
  exploration: '#06B6D4',
  religion_phil: '#8B6F47',
};
const getCatColor = (cat: string): string => {
  const key = (cat ?? '').toLowerCase().replace(/\s+/g, '_');
  return CAT_COLORS[key] ?? '#8B7355';
};

// ───────────────────────────────────
// Swipeable card
// ───────────────────────────────────
interface SwipeCardProps {
  children: React.ReactNode;
  onDelete: () => void;
  onPress: () => void;
  removeLabel: string;
}

const SwipeCard: React.FC<SwipeCardProps> = ({ children, onDelete, onPress, removeLabel }) => {
  const translateX = useRef(new Animated.Value(0)).current;
  const isSwipingRef = useRef(false);

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, g) => {
        const isHorizontal = Math.abs(g.dx) > Math.abs(g.dy) * 1.2 && Math.abs(g.dx) > 6;
        if (isHorizontal) {
          isSwipingRef.current = true;
        }
        return isHorizontal;
      },
      onMoveShouldSetPanResponderCapture: (_, g) => {
        // Capture the gesture once we've committed to swiping
        return Math.abs(g.dx) > Math.abs(g.dy) * 1.2 && Math.abs(g.dx) > 10;
      },
      onShouldBlockNativeResponder: () => true,
      onPanResponderGrant: () => {
        translateX.stopAnimation();
      },
      onPanResponderMove: (_, g) => {
        if (g.dx > 10) {
          // Rubber-band effect for right swipe
          translateX.setValue(Math.pow(g.dx, 0.5) * 2);
        } else {
          translateX.setValue(g.dx);
        }
      },
      onPanResponderRelease: (_, g) => {
        isSwipingRef.current = false;
        if (g.dx < -SWIPE_THRESHOLD || g.vx < -0.5) {
          // Swiped far enough or fast enough — delete
          Animated.timing(translateX, {
            toValue: -W, duration: 250, useNativeDriver: true,
          }).start(() => onDelete());
        } else {
          // Snap back
          Animated.spring(translateX, {
            toValue: 0, tension: 300, friction: 28, useNativeDriver: true,
          }).start();
        }
      },
      onPanResponderTerminate: () => {
        isSwipingRef.current = false;
        Animated.spring(translateX, {
          toValue: 0, tension: 300, friction: 28, useNativeDriver: true,
        }).start();
      },
    }),
  ).current;

  const deleteOpacity = translateX.interpolate({
    inputRange: [-DELETE_WIDTH * 2, -DELETE_WIDTH, 0],
    outputRange: [1, 0.9, 0], extrapolate: 'clamp',
  });
  const deleteScale = translateX.interpolate({
    inputRange: [-DELETE_WIDTH * 2, -DELETE_WIDTH, 0],
    outputRange: [1.1, 1, 0.6], extrapolate: 'clamp',
  });
  const cardOpacity = translateX.interpolate({
    inputRange: [-W * 0.5, -SWIPE_THRESHOLD, 0],
    outputRange: [0.4, 0.85, 1], extrapolate: 'clamp',
  });

  return (
    <View style={swipeStyles.wrap}>
      <Animated.View style={[swipeStyles.deleteBg, { opacity: deleteOpacity }]}>
        <Animated.View style={{ transform: [{ scale: deleteScale }], alignItems: 'center', gap: 4 }}>
          <Trash2 size={20} color="#FFFFFF" strokeWidth={2} />
          <Text style={swipeStyles.deleteLabel}>{removeLabel}</Text>
        </Animated.View>
      </Animated.View>
      <Animated.View
        style={{ transform: [{ translateX }], opacity: cardOpacity }}
        {...pan.panHandlers}
      >
        <TouchableOpacity activeOpacity={0.92} onPress={onPress}>
          {children}
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const swipeStyles = StyleSheet.create({
  wrap: { position: 'relative', overflow: 'hidden', borderRadius: 20 },
  deleteBg: {
    ...StyleSheet.absoluteFillObject, backgroundColor: '#FF3B30', borderRadius: 20,
    alignItems: 'flex-end', justifyContent: 'center', paddingRight: 28,
  },
  deleteLabel: { color: '#FFF', fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
});

// ───────────────────────────────────
// SAVED SCREEN
// ───────────────────────────────────
export default function SavedScreen() {
  const { theme, isDark } = useTheme();
  const { language } = useLanguage();
  const { removeEvent } = useSavedStore();
  const savedEvents = useUserSavedEvents();
  const insets = useSafeAreaInsets();
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [sortMode, setSortMode] = useState<'recent' | 'year'>('recent');

  const ts = useCallback((key: string): string => {
    const table = SAVED_T[language] ?? SAVED_T['en'];
    return table[key] ?? SAVED_T['en'][key] ?? key;
  }, [language]);

  const sortedEvents = useMemo(() => {
    const copy = [...savedEvents];
    if (sortMode === 'year') {
      return copy.sort((a, b) => {
        const ya = parseInt(extractYear(a)) || 0;
        const yb = parseInt(extractYear(b)) || 0;
        return yb - ya;
      });
    }
    return copy;
  }, [savedEvents, sortMode]);

  const handleDelete = useCallback((eventId: string) => {
    removeEvent(eventId);
  }, [removeEvent]);

  const s = makeStyles(theme, isDark);

  return (
    <View style={s.root}>
      {/* ── HEADER ── */}
      <View style={[s.header, { paddingTop: insets.top + 8 }]}>
        <View style={s.headerTop}>
          <View style={s.headerTitleRow}>
            <View style={[s.headerIcon, { backgroundColor: theme.gold + '15' }]}>
              <Bookmark size={16} color={theme.gold} fill={theme.gold} strokeWidth={2} />
            </View>
            <View>
              <Text style={[s.headerTitle, { color: theme.text }]}>{ts('saved')}</Text>
              {savedEvents.length > 0 && (
                <Text style={[s.headerSub, { color: theme.subtext }]}>
                  {savedEvents.length} {savedEvents.length === 1 ? ts('event_saved') : ts('events_saved')}
                </Text>
              )}
            </View>
          </View>
        </View>

        {savedEvents.length > 1 && (
          <View style={s.sortRow}>
            <TouchableOpacity
              onPress={() => setSortMode('recent')} activeOpacity={0.7}
              style={[s.sortPill, sortMode === 'recent'
                ? { backgroundColor: theme.gold + '18', borderColor: theme.gold + '40' }
                : { backgroundColor: 'transparent', borderColor: theme.border }]}
            >
              <Clock size={13} color={sortMode === 'recent' ? theme.gold : theme.subtext} strokeWidth={2.2} />
              <Text style={[s.sortLabel, {
                color: sortMode === 'recent' ? theme.gold : theme.subtext,
                fontWeight: sortMode === 'recent' ? '700' : '500',
              }]}>{ts('recent')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setSortMode('year')} activeOpacity={0.7}
              style={[s.sortPill, sortMode === 'year'
                ? { backgroundColor: theme.gold + '18', borderColor: theme.gold + '40' }
                : { backgroundColor: 'transparent', borderColor: theme.border }]}
            >
              <Sparkles size={13} color={sortMode === 'year' ? theme.gold : theme.subtext} strokeWidth={2.2} />
              <Text style={[s.sortLabel, {
                color: sortMode === 'year' ? theme.gold : theme.subtext,
                fontWeight: sortMode === 'year' ? '700' : '500',
              }]}>{ts('by_year')}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* ── EMPTY ── */}
      {savedEvents.length === 0 ? (
        <View style={s.empty}>
          <View style={[s.emptyCircle, { backgroundColor: theme.gold + '0A', borderColor: theme.gold + '20' }]}>
            <Bookmark size={32} color={theme.gold} strokeWidth={1.2} />
          </View>
          <Text style={[s.emptyTitle, { color: theme.text }]}>{ts('nothing_saved')}</Text>
          <Text style={[s.emptyDesc, { color: theme.subtext }]}>{ts('save_hint')}</Text>
          <View style={[s.emptyHint, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[s.emptyHintText, { color: theme.subtext }]}>
              {'\u2190'} {ts('swipe_hint')}
            </Text>
          </View>
        </View>
      ) : (
        <ScrollView contentContainerStyle={s.list} showsVerticalScrollIndicator={false}>
          <View style={s.swipeHintRow}>
            <View style={[s.swipeHintLine, { backgroundColor: theme.border }]} />
            <Text style={[s.swipeHintText, { color: theme.subtext }]}>
              {'\u2190'} {ts('swipe_hint')}
            </Text>
            <View style={[s.swipeHintLine, { backgroundColor: theme.border }]} />
          </View>

          {sortedEvents.map((event, index) => {
            const title = event.titleTranslations?.[language] ?? event.titleTranslations?.en ?? '';
            const narrative = event.narrativeTranslations?.[language] ?? event.narrativeTranslations?.en ?? '';
            const year = extractYear(event);
            const category = event.category ?? 'history';
            const categoryDisplay = category.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
            const catColor = getCatColor(category);
            const imageUri = event.gallery?.[0];
            const eventId = getEventId(event);
            const eventKey = eventId || `saved-${index}-${event.year || '0'}`;

            return (
              <SwipeCard
                key={eventKey}
                onDelete={() => handleDelete(eventId)}
                onPress={() => setSelectedEvent(event)}
                removeLabel={ts('swipe_remove')}
              >
                <View style={[s.card, { backgroundColor: theme.card }]}>
                  <View style={s.cardImage}>
                    {imageUri ? (
                      <Image source={{ uri: imageUri }} style={StyleSheet.absoluteFill} contentFit="cover" transition={300} />
                    ) : (
                      <View style={[StyleSheet.absoluteFill, { backgroundColor: catColor + '15', alignItems: 'center', justifyContent: 'center' }]}>
                        <Bookmark size={22} color={catColor + '60'} strokeWidth={1.5} />
                      </View>
                    )}
                    <View style={s.imageOverlayTop} />
                    <View style={s.imageOverlayBottom} />
                    {year !== '' && (
                      <View style={[s.yearPill, { backgroundColor: 'rgba(0,0,0,0.55)' }]}>
                        <Text style={s.yearText}>{year}</Text>
                      </View>
                    )}
                  </View>
                  <View style={s.cardBody}>
                    <View style={s.catRow}>
                      <View style={[s.catDot, { backgroundColor: catColor }]} />
                      <Text style={[s.catLabel, { color: catColor }]}>{categoryDisplay}</Text>
                    </View>
                    <Text style={[s.cardTitle, { color: theme.text }]} numberOfLines={2}>{title}</Text>
                    <Text style={[s.cardNarrative, { color: theme.subtext }]} numberOfLines={2}>{narrative}</Text>
                    {event.impactScore > 0 && (
                      <View style={s.impactRow}>
                        <View style={[s.impactTrack, { backgroundColor: theme.border + '80' }]}>
                          <View style={[s.impactFill, { backgroundColor: catColor + '90', width: `${Math.min(event.impactScore, 100)}%` as any }]} />
                        </View>
                        <Text style={[s.impactNum, { color: theme.subtext }]}>{event.impactScore}</Text>
                      </View>
                    )}
                  </View>
                </View>
              </SwipeCard>
            );
          })}

          <View style={s.listFooter}>
            <View style={[s.footerDot, { backgroundColor: theme.gold + '30' }]} />
            <Text style={[s.footerText, { color: theme.subtext }]}>{ts('end_of_list')}</Text>
          </View>
          <View style={{ height: insets.bottom + 24 }} />
        </ScrollView>
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
  header: { paddingHorizontal: 20, paddingBottom: 16 },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 22, fontWeight: '800', letterSpacing: -0.3, fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' },
  headerSub: { fontSize: 12, fontWeight: '500', marginTop: 1, opacity: 0.6 },
  sortRow: { flexDirection: 'row', gap: 8, marginTop: 14 },
  sortPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  sortLabel: { fontSize: 12, letterSpacing: 0.2 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 44, gap: 14 },
  emptyCircle: { width: 80, height: 80, borderRadius: 40, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  emptyTitle: { fontSize: 19, fontWeight: '700', letterSpacing: 0.1 },
  emptyDesc: { fontSize: 14, textAlign: 'center', lineHeight: 22, opacity: 0.55 },
  emptyHint: { marginTop: 16, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, borderWidth: 1 },
  emptyHintText: { fontSize: 12, fontWeight: '500', letterSpacing: 0.2 },
  swipeHintRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, marginBottom: 6 },
  swipeHintLine: { flex: 1, height: StyleSheet.hairlineWidth },
  swipeHintText: { fontSize: 10, fontWeight: '500', opacity: 0.35, letterSpacing: 0.5 },
  list: { paddingHorizontal: 16, paddingTop: 12, gap: 12 },
  card: { flexDirection: 'row', borderRadius: 20, overflow: 'hidden', height: 148 },
  cardImage: { width: 118, height: 148 },
  imageOverlayTop: { position: 'absolute', top: 0, left: 0, right: 0, height: 30, backgroundColor: 'rgba(0,0,0,0.08)' },
  imageOverlayBottom: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 50, backgroundColor: 'rgba(0,0,0,0.25)' },
  yearPill: { position: 'absolute', bottom: 8, left: 8, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  yearText: { color: '#FFF', fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  cardBody: { flex: 1, paddingHorizontal: 14, paddingVertical: 13, justifyContent: 'center', gap: 5 },
  catRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  catDot: { width: 7, height: 7, borderRadius: 4 },
  catLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  cardTitle: { fontSize: 14, fontWeight: '700', lineHeight: 19 },
  cardNarrative: { fontSize: 11, lineHeight: 16, opacity: 0.55 },
  impactRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 3 },
  impactTrack: { flex: 1, height: 3, borderRadius: 2, overflow: 'hidden' },
  impactFill: { height: 3, borderRadius: 2 },
  impactNum: { fontSize: 9, fontWeight: '800', letterSpacing: 0.3, opacity: 0.5 },
  listFooter: { alignItems: 'center', gap: 8, paddingVertical: 24 },
  footerDot: { width: 6, height: 6, borderRadius: 3 },
  footerText: { fontSize: 12, fontWeight: '500', opacity: 0.3 },
});