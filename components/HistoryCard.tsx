// components/HistoryCard.tsx
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import * as Sharing from 'expo-sharing';
import { Check, Share2, X } from 'lucide-react-native';
import { memo, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Modal,
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

const { width } = Dimensions.get('window');

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

const CornerOrnament = ({ position }: { position: 'tl' | 'tr' | 'bl' | 'br' }) => {
  const size = 24;
  const pos: any = {};
  if (position.includes('t')) pos.top = 10;
  if (position.includes('b')) pos.bottom = 10;
  if (position.includes('l')) pos.left = 10;
  if (position.includes('r')) pos.right = 10;
  const borderStyle: any = { position: 'absolute', width: size, height: size, ...pos };
  if (position === 'tl') { borderStyle.borderTopWidth = 1.5; borderStyle.borderLeftWidth = 1.5; borderStyle.borderTopLeftRadius = 4; }
  if (position === 'tr') { borderStyle.borderTopWidth = 1.5; borderStyle.borderRightWidth = 1.5; borderStyle.borderTopRightRadius = 4; }
  if (position === 'bl') { borderStyle.borderBottomWidth = 1.5; borderStyle.borderLeftWidth = 1.5; borderStyle.borderBottomLeftRadius = 4; }
  if (position === 'br') { borderStyle.borderBottomWidth = 1.5; borderStyle.borderRightWidth = 1.5; borderStyle.borderBottomRightRadius = 4; }
  return <View style={[borderStyle, { borderColor: '#D4A84350' }]} pointerEvents="none" />;
};

/* ── Share Image Picker Modal ── */
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
          {/* Header */}
          <View style={sp.header}>
            <TouchableOpacity onPress={onClose} style={[sp.closeBtn, { borderColor: theme.border }]}>
              <X size={16} color={theme.subtext} strokeWidth={2.5} />
            </TouchableOpacity>
            <Text style={[sp.headerTitle, { color: theme.text }]}>Share Story</Text>
            <View style={{ width: 36 }} />
          </View>

          {/* Preview */}
          <View style={sp.previewWrap}>
            <ShareCard event={event} language={language} cardRef={shareCardRef} imageIndex={selectedIdx} />
          </View>

          {/* Gallery picker */}
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

          {/* Share button */}
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

/* ── Main HistoryCard ── */
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
        Animated.timing(borderGlow, { toValue: 1, duration: 2500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(borderGlow, { toValue: 0, duration: 3000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])).start();
    }
  }, [isPremium]);

  if (!event) return null;

  const year = extractYear(event);
  const title = event.titleTranslations?.[language] ?? event.titleTranslations?.en ?? 'No Title';
  const narrative = event.narrativeTranslations?.[language] ?? event.narrativeTranslations?.en ?? '';
  const category = (event.category ?? 'HISTORY').replace(/_/g, ' ');
  const imageUri = event.gallery?.[0];
  const gallery: string[] = event.gallery ?? [];

  const onPressIn = () => { Animated.parallel([Animated.spring(scaleAnim, { toValue: 0.975, tension: 300, friction: 20, useNativeDriver: true }), Animated.timing(glowAnim, { toValue: 1, duration: 150, useNativeDriver: true })]).start(); };
  const onPressOut = () => { Animated.parallel([Animated.spring(scaleAnim, { toValue: 1, tension: 200, friction: 18, useNativeDriver: true }), Animated.timing(glowAnim, { toValue: 0, duration: 200, useNativeDriver: true })]).start(); };

  const onPress = () => {
    setStoryVisible(true);
    const eventId = getEventId(event);
    markEventRead(eventId, event.category ?? 'history', year);
  };

  const glowOpacity = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.15] });
  const premiumBorderOpacity = borderGlow.interpolate({ inputRange: [0, 1], outputRange: [0.15, 0.5] });
  const goldColor = isPremium ? '#D4A843' : '#ffd700';

  return (
    <>
      <TouchableWithoutFeedback onPressIn={onPressIn} onPressOut={onPressOut} onPress={onPress}>
        <Animated.View style={[styles.card, { shadowColor: isPremium ? '#D4A843' : isDark ? '#000' : '#444', shadowOpacity: isPremium ? 0.3 : 0.5, transform: [{ scale: scaleAnim }] }]}>
          {isPremium && <Animated.View style={[StyleSheet.absoluteFill, { borderRadius: 30, borderWidth: 1.5, borderColor: '#D4A843', opacity: premiumBorderOpacity }]} pointerEvents="none" />}

          <View style={[styles.inner, { borderColor: isPremium ? '#D4A84325' : 'rgba(255,255,255,0.08)' }]}>
            {imageUri ? <Image source={{ uri: imageUri }} style={styles.image} contentFit="cover" transition={600} /> : <View style={[styles.image, { backgroundColor: isPremium ? '#0A0815' : '#121418' }]} />}

            <LinearGradient
              colors={isPremium ? ['rgba(10,8,21,0.05)', 'rgba(10,8,21,0.35)', 'rgba(5,4,10,0.97)'] : ['rgba(0,0,0,0.05)', 'rgba(0,0,0,0.38)', 'rgba(0,0,0,0.97)']}
              locations={[0, 0.38, 0.82]} style={styles.gradient}>
              <View style={styles.top}>
                <View style={[styles.catBadge, { backgroundColor: isPremium ? 'rgba(10,8,21,0.7)' : 'rgba(0,0,0,0.6)', borderColor: isPremium ? '#D4A84350' : 'rgba(255,215,0,0.3)' }]}>
                  <Text style={[styles.catText, { color: goldColor }]}>{t(category).replace(/_/g, ' ').toUpperCase()}</Text>
                </View>
                <TouchableWithoutFeedback onPress={() => setSharePickerVisible(true)}>
                  <View style={[styles.shareBtn, { backgroundColor: isPremium ? 'rgba(212,168,67,0.12)' : 'rgba(255,255,255,0.15)', borderWidth: isPremium ? 1 : 0, borderColor: isPremium ? '#D4A84330' : 'transparent' }]}>
                    <Share2 color={isPremium ? '#D4A843' : '#fff'} size={18} />
                  </View>
                </TouchableWithoutFeedback>
              </View>
              <View>
                <View style={styles.yearRow}>
                  <Text style={[styles.yearText, { color: isPremium ? '#F5ECD7' : '#fff' }]}>{year}</Text>
                  <View style={[styles.accentLine, { backgroundColor: goldColor }]} />
                  {isPremium && <View style={[styles.accentLine, { backgroundColor: '#D4A84340', marginLeft: 4, width: 20 }]} />}
                </View>
                <Text style={[styles.title, { color: isPremium ? '#F5ECD7' : '#fff' }]} numberOfLines={2}>{title}</Text>
                <Text numberOfLines={3} style={[styles.narrative, { color: isPremium ? 'rgba(245,236,215,0.7)' : 'rgba(255,255,255,0.8)' }]}>{narrative}</Text>
                <View style={styles.readMore}>
                  <View style={[styles.readMoreDot, { backgroundColor: isPremium ? '#D4A84360' : 'rgba(255,215,0,0.5)' }]} />
                  <Text style={[styles.readMoreText, { color: isPremium ? '#D4A84370' : 'rgba(255,255,255,0.45)' }]}>{t('tap_for_story') || 'TAP TO READ STORY'}</Text>
                  <View style={[styles.readMoreDot, { backgroundColor: isPremium ? '#D4A84360' : 'rgba(255,215,0,0.5)' }]} />
                </View>
              </View>
            </LinearGradient>

            {isPremium && <><CornerOrnament position="tl" /><CornerOrnament position="tr" /><CornerOrnament position="bl" /><CornerOrnament position="br" /></>}
            <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: goldColor, opacity: glowOpacity, borderRadius: 30 }]} pointerEvents="none" />
          </View>
        </Animated.View>
      </TouchableWithoutFeedback>

      {/* ── Share picker with image selection ── */}
      <SharePickerModal visible={sharePickerVisible} event={event} language={language} gallery={gallery} onClose={() => setSharePickerVisible(false)} />

      <StoryModal visible={storyVisible} event={event} onClose={() => setStoryVisible(false)} theme={theme} allEvents={allEvents} />
    </>
  );
};

export const HistoryCard = memo(HistoryCardComponent, (prev, next) =>
  prev.event?.id === next.event?.id && prev.event?.titleTranslations?.en === next.event?.titleTranslations?.en
);

const styles = StyleSheet.create({
  card: { width: '100%', height: '100%', borderRadius: 30, elevation: 15, shadowRadius: 15, shadowOffset: { width: 0, height: 10 } },
  inner: { flex: 1, borderRadius: 30, overflow: 'hidden', borderWidth: 1 },
  image: { ...StyleSheet.absoluteFillObject },
  gradient: { ...StyleSheet.absoluteFillObject, padding: 24, justifyContent: 'space-between' },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  catBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1 },
  catText: { fontWeight: '800', fontSize: 10, letterSpacing: 2 },
  shareBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  yearRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  yearText: { fontSize: 22, fontWeight: '900', letterSpacing: 1 },
  accentLine: { height: 3, width: 40, marginLeft: 10, borderRadius: 2 },
  title: { fontSize: 32, fontWeight: '900', lineHeight: 38, textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 10 },
  narrative: { fontSize: 14, lineHeight: 20, marginTop: 12, fontWeight: '500' },
  readMore: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 20 },
  readMoreDot: { width: 4, height: 4, borderRadius: 2 },
  readMoreText: { fontSize: 9, fontWeight: '800', letterSpacing: 2.5 },
});