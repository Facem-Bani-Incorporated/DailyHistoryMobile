// components/HistoryCard.tsx
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import * as Sharing from 'expo-sharing';
import { Check, Share2, X } from 'lucide-react-native';
import { memo, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { captureRef } from 'react-native-view-shot';

import { ShareCard } from '../components/Sharecard';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
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
   SHARE PICKER MODAL
   ═══════════════════════════════════════════ */
const SharePickerModal = ({ visible, event, language, gallery, onClose }: {
  visible: boolean; event: any; language: string; gallery: string[]; onClose: () => void;
}) => {
  const { theme, isDark, isPremium } = useTheme();
  const insets = useSafeAreaInsets();
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [sharing, setSharing] = useState(false);
  const shareCardRef = useRef<View>(null);

  useEffect(() => {
    if (visible) setSelectedIdx(0);
  }, [visible]);

  const handleShare = async () => {
    setSharing(true);
    await new Promise(r => setTimeout(r, 300));
    try {
      const uri = await captureRef(shareCardRef, { format: 'png', quality: 1 });
      if (await Sharing.isAvailableAsync()) {
        const title = event.titleTranslations?.[language] ?? event.titleTranslations?.en ?? '';
        const year = extractYear(event);
        await Sharing.shareAsync(uri, { dialogTitle: `${title} (${year})`, mimeType: 'image/png', UTI: 'public.png' });
      }
    } catch {} finally { setSharing(false); }
  };

  const bg = isPremium ? '#05040A' : isDark ? '#090807' : '#FDFBF7';
  const gold = isPremium ? '#D4A843' : isDark ? '#E8B84D' : '#C77E08';

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent>
      <View style={sp.overlay}>
        <View style={[sp.sheet, { backgroundColor: bg, paddingBottom: insets.bottom + 20 }]}>
          <View style={sp.header}>
            <TouchableOpacity onPress={onClose} style={[sp.closeBtn, { borderColor: theme.border }]}>
              <X size={16} color={theme.subtext} strokeWidth={2.5} />
            </TouchableOpacity>
            <Text style={[sp.headerTitle, { color: theme.text }]}>Share Story</Text>
            <View style={{ width: 36 }} />
          </View>

          <View style={sp.previewWrap}>
            <ShareCard event={event} language={language} cardRef={shareCardRef} imageIndex={selectedIdx} />
          </View>

          {gallery.length > 1 && (
            <View style={sp.pickerSection}>
              <Text style={[sp.pickerLabel, { color: theme.subtext }]}>Choose image</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={sp.pickerScroll}>
                {gallery.map((img, i) => (
                  <TouchableOpacity key={i} onPress={() => setSelectedIdx(i)} activeOpacity={0.8}
                    style={[sp.thumbWrap, {
                      borderColor: i === selectedIdx ? gold : 'transparent',
                      borderWidth: 2,
                    }]}>
                    <Image source={{ uri: img }} style={sp.thumb} contentFit="cover" transition={200} />
                    {i === selectedIdx && (
                      <View style={[sp.thumbCheck, { backgroundColor: gold }]}>
                        <Check size={10} color="#000" strokeWidth={3} />
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          <TouchableOpacity onPress={handleShare} disabled={sharing} activeOpacity={0.8}
            style={[sp.shareBtn, { backgroundColor: gold, opacity: sharing ? 0.6 : 1 }]}>
            <Share2 size={16} color="#000" strokeWidth={2.5} />
            <Text style={sp.shareBtnText}>{sharing ? 'Sharing...' : 'Share'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const sp = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 12 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 },
  closeBtn: { width: 36, height: 36, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '700', letterSpacing: 0.2 },
  previewWrap: { alignItems: 'center', paddingVertical: 12, transform: [{ scale: 0.55 }], marginVertical: -80 },
  pickerSection: { paddingHorizontal: 20, marginBottom: 16 },
  pickerLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 0.5, marginBottom: 10, textTransform: 'uppercase', opacity: 0.5 },
  pickerScroll: { gap: 8, paddingRight: 20 },
  thumbWrap: { width: 64, height: 64, borderRadius: 12, overflow: 'hidden' },
  thumb: { width: '100%', height: '100%' },
  thumbCheck: { position: 'absolute', top: 4, right: 4, width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  shareBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginHorizontal: 20, paddingVertical: 15, borderRadius: 14 },
  shareBtnText: { fontSize: 15, fontWeight: '800', color: '#000', letterSpacing: 0.3 },
});

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
  const imageUri = event.gallery?.[0];
  const gallery: string[] = event.gallery ?? [];
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
  const premiumBorderOpacity = borderGlow.interpolate({ inputRange: [0, 1], outputRange: [0.18, 0.48] });
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
          {/* Premium glowing border */}
          {isPremium && (
            <Animated.View
              style={[
                StyleSheet.absoluteFill,
                {
                  borderRadius: 28,
                  borderWidth: 1.5,
                  borderColor: '#D4A843',
                  opacity: premiumBorderOpacity,
                },
              ]}
              pointerEvents="none"
            />
          )}

          <View style={[styles.inner, { borderColor: isPremium ? '#D4A84325' : 'rgba(255,255,255,0.08)' }]}>
            {/* Background image */}
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={styles.image} contentFit="cover" transition={650} />
            ) : (
              <View style={[styles.image, { backgroundColor: isPremium ? '#0A0815' : '#121418' }]} />
            )}

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
                    <View style={styles.proPillDot} />
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
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 4,
    backgroundColor: '#D4A843',
  },
  proPillDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#000' },
  proPillT: { fontSize: 8, fontWeight: '900', color: '#000', letterSpacing: 1.5 },

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
