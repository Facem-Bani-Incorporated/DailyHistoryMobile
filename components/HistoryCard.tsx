// components/HistoryCard.tsx
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Share2 } from 'lucide-react-native';
import { memo, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';

import { useLanguage } from '../context/LanguageContext';
import { SharePickerModal } from './SharePickerModal';
import { useTheme } from '../context/ThemeContext';
import { useEventImages } from '../hooks/useEventImages';
import { useGamificationStore } from '../store/useGamificationStore';
import { getEventId } from '../store/useSavedStore';
import { StoryModal } from './StoryModal';

const SERIF = Platform.OS === 'ios' ? 'Georgia' : 'serif';
const SANS = Platform.OS === 'ios' ? 'System' : 'sans-serif';

const extractYear = (event: any): string => {
  if (!event) return '';
  if (event.year && Number(event.year) > 100) return String(event.year);
  const rawDate = event.eventDate ?? event.event_date ?? event.date;
  if (rawDate) {
    if (rawDate instanceof Date) return String(rawDate.getFullYear());
    const dateStr = String(rawDate).trim();
    const match = dateStr.match(/^(\d{3,4})-/);
    if (match) return match[1];
  }
  return '';
};

const eraLabel = (year: number): string => {
  if (!year) return '';
  if (year < 0) return 'Antiquity';
  if (year < 500) return 'Classical';
  if (year < 1500) return 'Medieval';
  if (year < 1800) return 'Early Modern';
  if (year < 1900) return 'XIX Century';
  if (year < 2000) return 'XX Century';
  return 'Contemporary';
};

/* ═══════════════════════════════════════════
   MAIN HISTORY CARD — Editorial/magazine style
   ═══════════════════════════════════════════ */
const HistoryCardComponent = ({ event, allEvents = [] }: { event: any; allEvents?: any[] }) => {
  const { theme, isDark, isPremium } = useTheme();
  const { language, t } = useLanguage();
  const [storyVisible, setStoryVisible] = useState(false);
  const [sharePickerVisible, setSharePickerVisible] = useState(false);
  const markEventRead = useGamificationStore(s => s.markEventRead);

  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const borderGlow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isPremium) {
      Animated.loop(Animated.sequence([
        Animated.timing(borderGlow, { toValue: 1, duration: 2800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(borderGlow, { toValue: 0, duration: 3200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])).start();
    }
  }, [isPremium]);

  if (!event) return null;

  const year = extractYear(event);
  const yearNum = parseInt(year) || 0;
  const title = event.titleTranslations?.[language] ?? event.titleTranslations?.en ?? 'No Title';
  const narrative = event.narrativeTranslations?.[language] ?? event.narrativeTranslations?.en ?? '';
  const category = (event.category ?? 'HISTORY').replace(/_/g, ' ');
  const catLabel = t(category).replace(/_/g, ' ').toUpperCase();
  const { images } = useEventImages(event);
  const imageUri = images[0];
  const gallery = images;
  const isPro = !!(event.isPro || event.pro);

  const onPressIn = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 0.98, tension: 300, friction: 20, useNativeDriver: true }),
      Animated.timing(glowAnim, { toValue: 1, duration: 160, useNativeDriver: true }),
    ]).start();
  };
  const onPressOut = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, tension: 200, friction: 18, useNativeDriver: true }),
      Animated.timing(glowAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start();
  };

  const onPress = () => {
    setStoryVisible(true);
    const eventId = getEventId(event);
    markEventRead(eventId, event.category ?? 'history', year);
  };

  const glowOpacity = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.12] });
  const premiumBorderOpacity = borderGlow.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0.92] });
  const gold = isPremium ? '#D4A843' : '#E8B84D';
  const titleColor = isPremium ? '#F5ECD7' : '#FFFFFF';

  return (
    <>
      <TouchableWithoutFeedback onPressIn={onPressIn} onPressOut={onPressOut} onPress={onPress}>
        <Animated.View style={[
          styles.card,
          {
            shadowColor: isPremium ? '#D4A843' : isDark ? '#000' : '#444',
            shadowOpacity: isPremium ? 0.35 : 0.5,
            transform: [{ scale: scaleAnim }],
          },
        ]}>
          {/* PRO event — static visible gold border */}
          {isPro && !isPremium && (
            <View
              style={[StyleSheet.absoluteFill, { borderRadius: 28, borderWidth: 2, borderColor: '#D4A843' }]}
              pointerEvents="none"
            />
          )}

          {/* Premium user — animated glowing gold border */}
          {isPremium && (
            <Animated.View
              style={[
                StyleSheet.absoluteFill,
                {
                  borderRadius: 28,
                  borderWidth: 2,
                  borderColor: '#D4A843',
                  opacity: premiumBorderOpacity,
                },
              ]}
              pointerEvents="none"
            />
          )}

          <View style={[styles.inner, { borderColor: isPremium ? '#D4A84325' : 'rgba(255,255,255,0.08)' }]}>
            {/* Background image */}
            <Image source={{ uri: imageUri }} style={styles.image} contentFit="cover" transition={650} />

            {/* Editorial gradient — taller, more balanced */}
            <LinearGradient
              colors={
                isPremium
                  ? [
                      'rgba(5,4,10,0.35)',
                      'rgba(5,4,10,0.05)',
                      'rgba(5,4,10,0.55)',
                      'rgba(5,4,10,0.98)',
                    ]
                  : [
                      'rgba(0,0,0,0.35)',
                      'rgba(0,0,0,0.05)',
                      'rgba(0,0,0,0.55)',
                      'rgba(0,0,0,0.98)',
                    ]
              }
              locations={[0, 0.32, 0.68, 1]}
              style={styles.gradient}
            />

            {/* Editorial hairline frame */}
            <View
              style={[
                styles.innerFrame,
                { borderColor: isPremium ? 'rgba(212,168,67,0.20)' : 'rgba(255,255,255,0.10)' },
              ]}
              pointerEvents="none"
            />

            {/* ═════ TOP BAR ═════ */}
            <View style={styles.topBar}>
              <View style={styles.kickerRow}>
                <Text style={[styles.kickerOrn, { color: gold }]}>✦</Text>
                <Text style={[styles.kickerLabel, { color: gold }]}>FEATURE</Text>
                <View style={[styles.kickerDivider, { backgroundColor: gold + '70' }]} />
                <Text style={styles.kickerCat}>{catLabel}</Text>
                {isPro && (
                  <View style={[styles.proPill, { marginLeft: 8 }]}>
                    <Ionicons name="star" size={11} color="#1a1208" />
                    <Text style={styles.proPillT}>PRO</Text>
                  </View>
                )}
              </View>

              <TouchableWithoutFeedback onPress={() => setSharePickerVisible(true)}>
                <View
                  style={[
                    styles.shareBtn,
                    {
                      backgroundColor: isPremium ? 'rgba(212,168,67,0.10)' : 'rgba(255,255,255,0.06)',
                      borderColor: isPremium ? 'rgba(212,168,67,0.32)' : 'rgba(255,255,255,0.16)',
                    },
                  ]}>
                  <Share2 color={isPremium ? '#D4A843' : '#FFF'} size={15} strokeWidth={1.8} />
                </View>
              </TouchableWithoutFeedback>
            </View>

            {/* ═════ BOTTOM CONTENT ═════ */}
            <View style={styles.bottom}>
              {/* Year block with rule + era */}
              {year !== '' && (
                <View style={styles.yearBlock}>
                  <Text style={[styles.year, { color: titleColor }]}>{year}</Text>
                  <View style={styles.yearMeta}>
                    <View style={[styles.yearRule, { backgroundColor: gold }]} />
                    <Text style={styles.yearEra}>{eraLabel(yearNum)}</Text>
                  </View>
                </View>
              )}

              {/* Title — serif */}
              <Text style={[styles.title, { color: titleColor }]} numberOfLines={3}>
                {title}
              </Text>

              {/* Narrative preview */}
              {narrative !== '' && (
                <Text
                  style={[
                    styles.narrative,
                    { color: isPremium ? 'rgba(245,236,215,0.68)' : 'rgba(255,255,255,0.72)' },
                  ]}
                  numberOfLines={2}>
                  {narrative}
                </Text>
              )}

              {/* CTA — hairline editorial */}
              <View style={styles.cta}>
                <View style={[styles.ctaLine, { backgroundColor: gold }]} />
                <Text style={[styles.ctaTxt, { color: titleColor }]}>
                  {(t('tap_for_story') || 'READ STORY').toUpperCase()}
                </Text>
                <Ionicons name="arrow-forward" size={12} color={titleColor} style={{ marginLeft: 4 }} />
              </View>
            </View>

            {/* Tap glow overlay */}
            <Animated.View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: gold, opacity: glowOpacity, borderRadius: 28 },
              ]}
              pointerEvents="none"
            />
          </View>
        </Animated.View>
      </TouchableWithoutFeedback>

      <SharePickerModal
        visible={sharePickerVisible}
        event={event}
        language={language}
        gallery={gallery}
        onClose={() => setSharePickerVisible(false)}
      />

      <StoryModal
        visible={storyVisible}
        event={event}
        onClose={() => setStoryVisible(false)}
        theme={theme}
        allEvents={allEvents}
      />
    </>
  );
};

export const HistoryCard = memo(
  HistoryCardComponent,
  (prev, next) =>
    prev.event?.id === next.event?.id &&
    prev.event?.titleTranslations?.en === next.event?.titleTranslations?.en,
);

/* ═══════════════════════════════════════════
   STYLES
   ═══════════════════════════════════════════ */
const styles = StyleSheet.create({
  card: {
    width: '100%',
    height: '100%',
    borderRadius: 28,
    elevation: 14,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
  },
  inner: {
    flex: 1,
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1,
  },
  image: { ...StyleSheet.absoluteFillObject },
  gradient: { ...StyleSheet.absoluteFillObject },
  innerFrame: {
    position: 'absolute',
    top: 14,
    left: 14,
    right: 14,
    bottom: 14,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
  },

  /* ── Top bar (kicker + share) ── */
  topBar: {
    position: 'absolute',
    top: 22,
    left: 24,
    right: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  kickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },
  kickerOrn: { fontSize: 9, marginRight: 6 },
  kickerLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2.2,
    fontFamily: SANS,
  },
  kickerDivider: { width: 10, height: 1, marginHorizontal: 8 },
  kickerCat: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
  },
  shareBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },

  /* ── PRO pill ── */
  proPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#D4A843',
    borderWidth: 1,
    borderColor: 'rgba(255,235,140,0.6)',
    shadowColor: '#D4A843',
    shadowOpacity: 0.5,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  proPillT: { fontSize: 11, fontWeight: '900', color: '#1a1208', letterSpacing: 1.8 },

  /* ── Bottom content ── */
  bottom: {
    position: 'absolute',
    left: 28,
    right: 28,
    bottom: 30,
  },
  yearBlock: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 14,
    marginBottom: 14,
  },
  year: {
    fontSize: 42,
    fontWeight: '800',
    letterSpacing: 1.2,
    fontFamily: SERIF,
    lineHeight: 44,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  yearMeta: {
    flex: 1,
    paddingBottom: 6,
  },
  yearRule: {
    width: 40,
    height: 2,
    borderRadius: 1,
    marginBottom: 5,
  },
  yearEra: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 2.2,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 33,
    letterSpacing: -0.6,
    fontFamily: SERIF,
    textShadowColor: 'rgba(0,0,0,0.55)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  narrative: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 10,
    letterSpacing: 0.1,
    fontWeight: '400',
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 18,
  },
  ctaLine: {
    width: 22,
    height: 1.5,
    borderRadius: 1,
    marginRight: 10,
  },
  ctaTxt: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2.5,
    marginRight: 6,
  },
});
