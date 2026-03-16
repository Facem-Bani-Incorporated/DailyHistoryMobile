// components/HistoryCard.tsx
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import * as Sharing from 'expo-sharing';
import { Share2, Zap } from 'lucide-react-native';
import React, { memo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { captureRef } from 'react-native-view-shot';

import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { ShareCard } from './Sharecard';
import { StoryModal } from './StoryModal';

const { width } = Dimensions.get('window');

const extractYear = (event: any): string => {
  if (!event) return '';
  const rawDate = event.eventDate ?? event.event_date ?? event.date ?? event.year;
  if (!rawDate) return '';
  const dateStr = String(rawDate).trim();
  if (/^\d{4}$/.test(dateStr)) return dateStr;
  if (dateStr.includes('-') && dateStr.split('-')[0].length === 4) return dateStr.split('-')[0];
  return '';
};

const HistoryCardComponent = ({ event }: { event: any }) => {
  const { theme, isDark } = useTheme();
  const { language, t } = useLanguage();
  const [storyVisible, setStoryVisible] = useState(false);
  const [shareVisible, setShareVisible] = useState(false);
  const shareCardRef = useRef<View>(null);

  // Press animation
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  if (!event) return null;

  const year      = extractYear(event);
  const title     = event.titleTranslations?.[language] ?? event.titleTranslations?.en ?? 'No Title';
  const narrative = event.narrativeTranslations?.[language] ?? event.narrativeTranslations?.en ?? '';
  const category  = event.category ?? 'HISTORY';
  const impact    = event.impactScore || 0;
  const imageUri  = event.gallery?.[0];

  const onPressIn = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 0.975, tension: 300, friction: 20, useNativeDriver: true }),
      Animated.timing(glowAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();
  };

  const onPressOut = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, tension: 200, friction: 18, useNativeDriver: true }),
      Animated.timing(glowAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start();
  };

  const onPress = () => setStoryVisible(true);

  const handleShare = async () => {
    setShareVisible(true);
    await new Promise(r => setTimeout(r, 200));
    try {
      const uri = await captureRef(shareCardRef, { format: 'png', quality: 1 });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          dialogTitle: `${title} (${year})`,
          mimeType: 'image/png',
          UTI: 'public.png',
        });
      }
    } catch {}
    finally { setShareVisible(false); }
  };

  const glowOpacity = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.15] });

  return (
    <>
      <TouchableWithoutFeedback onPressIn={onPressIn} onPressOut={onPressOut} onPress={onPress}>
        <Animated.View style={[styles.card, { shadowColor: isDark ? '#000' : '#444', transform: [{ scale: scaleAnim }] }]}>
          <View style={styles.inner}>
            {imageUri
              ? <Image source={{ uri: imageUri }} style={styles.image} contentFit="cover" transition={600} />
              : <View style={[styles.image, { backgroundColor: '#121418' }]} />
            }

            <LinearGradient
              colors={['rgba(0,0,0,0.05)', 'rgba(0,0,0,0.38)', 'rgba(0,0,0,0.97)']}
              locations={[0, 0.38, 0.82]}
              style={styles.gradient}
            >
              {/* Top row */}
              <View style={styles.top}>
                <View style={styles.catBadge}>
                  <Text style={styles.catText}>{t(category).toUpperCase()}</Text>
                </View>
                <TouchableWithoutFeedback onPress={handleShare}>
                  <View style={styles.shareBtn}>
                    <Share2 color="#fff" size={18} />
                  </View>
                </TouchableWithoutFeedback>
              </View>

              {/* Bottom content */}
              <View>
                <View style={styles.yearRow}>
                  <Text style={styles.yearText}>{year}</Text>
                  <View style={styles.accentLine} />
                </View>
                <Text style={styles.title} numberOfLines={2}>{title}</Text>
                <View style={styles.impactRow}>
                  <Zap size={14} color="#ffd700" fill="#ffd700" />
                  <Text style={styles.impactText}>{t('impact')} {impact}%</Text>
                </View>
                <Text numberOfLines={3} style={styles.narrative}>{narrative}</Text>

                {/* Read more hint */}
                <View style={styles.readMore}>
                  <View style={styles.readMoreDot} />
                  <Text style={styles.readMoreText}>{t('tap_for_story') || 'TAP TO READ STORY'}</Text>
                  <View style={styles.readMoreDot} />
                </View>
              </View>
            </LinearGradient>

            {/* Press glow overlay */}
            <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#ffd700', opacity: glowOpacity, borderRadius: 30 }]} pointerEvents="none" />
          </View>
        </Animated.View>
      </TouchableWithoutFeedback>

      <Modal visible={shareVisible} transparent animationType="none" statusBarTranslucent>
        <View style={styles.shareOverlay}>
          <ShareCard event={event} language={language} cardRef={shareCardRef} />
        </View>
      </Modal>

      <StoryModal
        visible={storyVisible}
        event={event}
        onClose={() => setStoryVisible(false)}
        theme={theme}
      />
    </>
  );
};

export const HistoryCard = memo(HistoryCardComponent, (prev, next) =>
  prev.event?.id === next.event?.id &&
  prev.event?.titleTranslations?.en === next.event?.titleTranslations?.en
);

const styles = StyleSheet.create({
  card: {
    width: '100%', height: '100%', borderRadius: 30,
    elevation: 15, shadowOpacity: 0.5, shadowRadius: 15, shadowOffset: { width: 0, height: 10 },
  },
  inner: { flex: 1, borderRadius: 30, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  image: { ...StyleSheet.absoluteFillObject },
  gradient: { ...StyleSheet.absoluteFillObject, padding: 24, justifyContent: 'space-between' },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  catBadge: { backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,215,0,0.3)' },
  catText: { color: '#ffd700', fontWeight: '800', fontSize: 10, letterSpacing: 2 },
  shareBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  yearRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  yearText: { color: '#fff', fontSize: 22, fontWeight: '900', letterSpacing: 1 },
  accentLine: { height: 3, width: 40, backgroundColor: '#ffd700', marginLeft: 10, borderRadius: 2 },
  title: { color: '#fff', fontSize: 32, fontWeight: '900', lineHeight: 38, textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 10 },
  impactRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 6 },
  impactText: { color: '#ffd700', fontSize: 12, fontWeight: 'bold', letterSpacing: 1 },
  narrative: { color: 'rgba(255,255,255,0.8)', fontSize: 14, lineHeight: 20, marginTop: 12, fontWeight: '500' },
  readMore: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 20 },
  readMoreDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,215,0,0.5)' },
  readMoreText: { color: 'rgba(255,255,255,0.45)', fontSize: 9, fontWeight: '800', letterSpacing: 2.5 },
  shareOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.01)', alignItems: 'center', justifyContent: 'center' },
});