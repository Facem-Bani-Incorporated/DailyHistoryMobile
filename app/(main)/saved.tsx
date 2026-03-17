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
import { getEventId, useSavedStore } from '../../store/useSavedStore';

const { width: W } = Dimensions.get('window');
const SWIPE_THRESHOLD = W * 0.28;
const DELETE_WIDTH = 80;

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
// Swipeable card wrapper
// ───────────────────────────────────
interface SwipeCardProps {
  children: React.ReactNode;
  onDelete: () => void;
  onPress: () => void;
  theme: any;
  isDark: boolean;
}

const SwipeCard: React.FC<SwipeCardProps> = ({ children, onDelete, onPress, theme, isDark }) => {
  const translateX = useRef(new Animated.Value(0)).current;
  const isDeleting = useRef(false);

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > Math.abs(g.dy) * 1.5 && Math.abs(g.dx) > 8,
      onShouldBlockNativeResponder: () => false,

      onPanResponderGrant: () => {
        translateX.stopAnimation();
      },

      onPanResponderMove: (_, g) => {
        // Only allow swipe left (negative)
        if (g.dx > 10) {
          // Rubber-band right (snap back feel)
          translateX.setValue(Math.pow(g.dx, 0.5) * 2);
        } else {
          translateX.setValue(g.dx);
        }
      },

      onPanResponderRelease: (_, g) => {
        if (g.dx < -SWIPE_THRESHOLD || g.vx < -0.8) {
          // Swipe away — delete
          isDeleting.current = true;
          Animated.timing(translateX, {
            toValue: -W,
            duration: 250,
            useNativeDriver: true,
          }).start(() => {
            onDelete();
          });
        } else {
          // Snap back
          Animated.spring(translateX, {
            toValue: 0,
            tension: 300,
            friction: 28,
            useNativeDriver: true,
          }).start();
        }
      },

      onPanResponderTerminate: () => {
        Animated.spring(translateX, {
          toValue: 0,
          tension: 300,
          friction: 28,
          useNativeDriver: true,
        }).start();
      },
    }),
  ).current;

  // Background red zone behind card
  const deleteOpacity = translateX.interpolate({
    inputRange: [-DELETE_WIDTH * 2, -DELETE_WIDTH, 0],
    outputRange: [1, 0.9, 0],
    extrapolate: 'clamp',
  });
  const deleteScale = translateX.interpolate({
    inputRange: [-DELETE_WIDTH * 2, -DELETE_WIDTH, 0],
    outputRange: [1.1, 1, 0.6],
    extrapolate: 'clamp',
  });
  const cardOpacity = translateX.interpolate({
    inputRange: [-W * 0.5, -SWIPE_THRESHOLD, 0],
    outputRange: [0.4, 0.85, 1],
    extrapolate: 'clamp',
  });

  return (
    <View style={swipeStyles.wrap}>
      {/* Delete background */}
      <Animated.View style={[
        swipeStyles.deleteBg,
        { opacity: deleteOpacity },
      ]}>
        <Animated.View style={{ transform: [{ scale: deleteScale }], alignItems: 'center', gap: 4 }}>
          <Trash2 size={20} color="#FFFFFF" strokeWidth={2} />
          <Text style={swipeStyles.deleteLabel}>Remove</Text>
        </Animated.View>
      </Animated.View>

      {/* Actual card */}
      <Animated.View
        style={{
          transform: [{ translateX }],
          opacity: cardOpacity,
        }}
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
  wrap: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 20,
  },
  deleteBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FF3B30',
    borderRadius: 20,
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingRight: 28,
  },
  deleteLabel: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});

// ───────────────────────────────────
// MAIN SAVED SCREEN
// ───────────────────────────────────
export default function SavedScreen() {
  const { theme, isDark } = useTheme();
  const { language, t } = useLanguage();
  const { savedEvents, removeEvent } = useSavedStore();
  const insets = useSafeAreaInsets();
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [sortMode, setSortMode] = useState<'recent' | 'year'>('recent');

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
              <Text style={[s.headerTitle, { color: theme.text }]}>
                {t('saved') || 'Saved'}
              </Text>
              {savedEvents.length > 0 && (
                <Text style={[s.headerSub, { color: theme.subtext }]}>
                  {savedEvents.length} {savedEvents.length === 1
                    ? (t('event_saved') || 'event saved')
                    : (t('events_saved') || 'events saved')}
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* Sort pills */}
        {savedEvents.length > 1 && (
          <View style={s.sortRow}>
            <TouchableOpacity
              onPress={() => setSortMode('recent')}
              activeOpacity={0.7}
              style={[s.sortPill, sortMode === 'recent'
                ? { backgroundColor: theme.gold + '18', borderColor: theme.gold + '40' }
                : { backgroundColor: 'transparent', borderColor: theme.border },
              ]}
            >
              <Clock size={13} color={sortMode === 'recent' ? theme.gold : theme.subtext} strokeWidth={2.2} />
              <Text style={[s.sortLabel, {
                color: sortMode === 'recent' ? theme.gold : theme.subtext,
                fontWeight: sortMode === 'recent' ? '700' : '500',
              }]}>{t('recent') || 'Recent'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setSortMode('year')}
              activeOpacity={0.7}
              style={[s.sortPill, sortMode === 'year'
                ? { backgroundColor: theme.gold + '18', borderColor: theme.gold + '40' }
                : { backgroundColor: 'transparent', borderColor: theme.border },
              ]}
            >
              <Sparkles size={13} color={sortMode === 'year' ? theme.gold : theme.subtext} strokeWidth={2.2} />
              <Text style={[s.sortLabel, {
                color: sortMode === 'year' ? theme.gold : theme.subtext,
                fontWeight: sortMode === 'year' ? '700' : '500',
              }]}>{t('by_year') || 'By Year'}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* ── EMPTY STATE ── */}
      {savedEvents.length === 0 ? (
        <View style={s.empty}>
          <View style={[s.emptyCircle, { backgroundColor: theme.gold + '0A', borderColor: theme.gold + '20' }]}>
            <Bookmark size={32} color={theme.gold} strokeWidth={1.2} />
          </View>
          <Text style={[s.emptyTitle, { color: theme.text }]}>
            {t('nothing_saved') || 'Nothing saved yet'}
          </Text>
          <Text style={[s.emptyDesc, { color: theme.subtext }]}>
            {t('save_hint') || 'Tap the bookmark icon on any story to start building your collection.'}
          </Text>
          <View style={[s.emptyHint, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[s.emptyHintText, { color: theme.subtext }]}>
              Swipe left on a card to remove it
            </Text>
          </View>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
        >
          {/* Swipe hint — shown once at the top */}
          <View style={s.swipeHintRow}>
            <View style={[s.swipeHintLine, { backgroundColor: theme.border }]} />
            <Text style={[s.swipeHintText, { color: theme.subtext }]}>
              {'\u2190'} swipe to remove
            </Text>
            <View style={[s.swipeHintLine, { backgroundColor: theme.border }]} />
          </View>

          {sortedEvents.map((event, index) => {
            const title = event.titleTranslations?.[language] ?? event.titleTranslations?.en ?? '';
            const narrative = event.narrativeTranslations?.[language] ?? event.narrativeTranslations?.en ?? '';
            const year = extractYear(event);
            const category = (event.category ?? 'history');
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
                theme={theme}
                isDark={isDark}
              >
                <View style={[s.card, { backgroundColor: theme.card }]}>
                  {/* Image */}
                  <View style={s.cardImage}>
                    {imageUri ? (
                      <Image
                        source={{ uri: imageUri }}
                        style={StyleSheet.absoluteFill}
                        contentFit="cover"
                        transition={300}
                      />
                    ) : (
                      <View style={[StyleSheet.absoluteFill, {
                        backgroundColor: catColor + '15',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }]}>
                        <Bookmark size={22} color={catColor + '60'} strokeWidth={1.5} />
                      </View>
                    )}
                    {/* Soft gradient overlay */}
                    <View style={s.imageOverlayTop} />
                    <View style={s.imageOverlayBottom} />
                    {/* Year on image */}
                    {year !== '' && (
                      <View style={[s.yearPill, { backgroundColor: 'rgba(0,0,0,0.55)' }]}>
                        <Text style={s.yearText}>{year}</Text>
                      </View>
                    )}
                  </View>

                  {/* Content */}
                  <View style={s.cardBody}>
                    {/* Category row */}
                    <View style={s.catRow}>
                      <View style={[s.catDot, { backgroundColor: catColor }]} />
                      <Text style={[s.catLabel, { color: catColor }]}>{categoryDisplay}</Text>
                    </View>

                    <Text style={[s.cardTitle, { color: theme.text }]} numberOfLines={2}>
                      {title}
                    </Text>

                    <Text style={[s.cardNarrative, { color: theme.subtext }]} numberOfLines={2}>
                      {narrative}
                    </Text>

                    {/* Impact micro bar */}
                    {event.impactScore > 0 && (
                      <View style={s.impactRow}>
                        <View style={[s.impactTrack, { backgroundColor: theme.border + '80' }]}>
                          <View style={[s.impactFill, {
                            backgroundColor: catColor + '90',
                            width: `${Math.min(event.impactScore, 100)}%` as any,
                          }]} />
                        </View>
                        <Text style={[s.impactNum, { color: theme.subtext }]}>
                          {event.impactScore}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </SwipeCard>
            );
          })}

          {/* Footer */}
          <View style={s.listFooter}>
            <View style={[s.footerDot, { backgroundColor: theme.gold + '30' }]} />
            <Text style={[s.footerText, { color: theme.subtext }]}>
              {t('end_of_list') || 'You\u2019re all caught up'}
            </Text>
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

// ═══════════════════════════════════════
// STYLES
// ═══════════════════════════════════════
const makeStyles = (theme: any, isDark: boolean) => StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.background },

  // Header
  header: { paddingHorizontal: 20, paddingBottom: 16 },
  headerTop: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerIcon: {
    width: 36, height: 36, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 22, fontWeight: '800', letterSpacing: -0.3,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  headerSub: { fontSize: 12, fontWeight: '500', marginTop: 1, opacity: 0.6 },

  // Sort
  sortRow: { flexDirection: 'row', gap: 8, marginTop: 14 },
  sortPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1,
  },
  sortLabel: { fontSize: 12, letterSpacing: 0.2 },

  // Empty
  empty: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 44, gap: 14,
  },
  emptyCircle: {
    width: 80, height: 80, borderRadius: 40, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  emptyTitle: { fontSize: 19, fontWeight: '700', letterSpacing: 0.1 },
  emptyDesc: { fontSize: 14, textAlign: 'center', lineHeight: 22, opacity: 0.55 },
  emptyHint: {
    marginTop: 16, paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 12, borderWidth: 1,
  },
  emptyHintText: { fontSize: 12, fontWeight: '500', letterSpacing: 0.2 },

  // Swipe hint
  swipeHintRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 12, marginBottom: 6,
  },
  swipeHintLine: { flex: 1, height: StyleSheet.hairlineWidth },
  swipeHintText: { fontSize: 10, fontWeight: '500', opacity: 0.35, letterSpacing: 0.5 },

  // List
  list: { paddingHorizontal: 16, paddingTop: 12, gap: 12 },

  // Card
  card: {
    flexDirection: 'row',
    borderRadius: 20,
    overflow: 'hidden',
    height: 148,
  },
  cardImage: { width: 118, height: 148 },
  imageOverlayTop: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 30,
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  imageOverlayBottom: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 50,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  yearPill: {
    position: 'absolute', bottom: 8, left: 8,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
  },
  yearText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },

  // Card body
  cardBody: {
    flex: 1, paddingHorizontal: 14, paddingVertical: 13,
    justifyContent: 'center', gap: 5,
  },
  catRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  catDot: { width: 7, height: 7, borderRadius: 4 },
  catLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  cardTitle: { fontSize: 14, fontWeight: '700', lineHeight: 19 },
  cardNarrative: { fontSize: 11, lineHeight: 16, opacity: 0.55 },

  // Impact
  impactRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 3 },
  impactTrack: { flex: 1, height: 3, borderRadius: 2, overflow: 'hidden' },
  impactFill: { height: 3, borderRadius: 2 },
  impactNum: { fontSize: 9, fontWeight: '800', letterSpacing: 0.3, opacity: 0.5 },

  // Footer
  listFooter: { alignItems: 'center', gap: 8, paddingVertical: 24 },
  footerDot: { width: 6, height: 6, borderRadius: 3 },
  footerText: { fontSize: 12, fontWeight: '500', opacity: 0.3 },
});