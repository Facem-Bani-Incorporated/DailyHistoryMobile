import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import * as Sharing from 'expo-sharing';
import { Share2, Zap } from 'lucide-react-native';
import React, { memo, useRef, useState } from 'react';
import {
    Dimensions,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
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
  if (dateStr.includes('-')) {
    const parts = dateStr.split('-');
    if (parts[0].length === 4) return parts[0];
  }
  return '';
};

const HistoryCardComponent = ({ event }: { event: any }) => {
  const { theme, isDark } = useTheme();
  const { language, t } = useLanguage();
  const [storyVisible, setStoryVisible] = useState(false);
  const [shareVisible, setShareVisible] = useState(false);

  // Corecție tip: React.RefObject<View | null>
  const shareCardRef = useRef<View>(null);

  if (!event) return null;

  const year      = extractYear(event);
  const title     = event.titleTranslations?.[language] ?? event.titleTranslations?.en ?? 'No Title';
  const narrative = event.narrativeTranslations?.[language] ?? event.narrativeTranslations?.en ?? '';
  const category  = event.category ?? 'HISTORY';
  const impact    = event.impactScore || 0;
  const imageUri  = event.gallery?.[0];

  const handleShare = async () => {
    setShareVisible(true);
    // Așteptăm un timp scurt pentru ca Modalul să randeze ShareCard-ul
    await new Promise(r => setTimeout(r, 200));

    try {
      const uri = await captureRef(shareCardRef, {
        format: 'png',
        quality: 1,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          dialogTitle: `${title} (${year})`,
          mimeType: 'image/png',
          UTI: 'public.png',
        });
      }
    } catch (error) {
      console.log('Share Error:', error);
    } finally {
      setShareVisible(false);
    }
  };

  return (
    <>
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => setStoryVisible(true)}
        style={[styles.cardContainer, { shadowColor: isDark ? '#000' : '#444' }]}
      >
        <View style={styles.cardInner}>
          {imageUri ? (
            <Image
              source={{ uri: imageUri }}
              style={styles.image}
              contentFit="cover"
              transition={600}
            />
          ) : (
            <View style={[styles.image, { backgroundColor: '#121418' }]} />
          )}

          <LinearGradient
            colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.95)']}
            locations={[0, 0.4, 0.8]}
            style={styles.gradient}
          >
            <View style={styles.topActions}>
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryText}>{t(category).toUpperCase()}</Text>
              </View>
              <TouchableOpacity onPress={handleShare} style={styles.shareBtn}>
                <Share2 color="#fff" size={18} />
              </TouchableOpacity>
            </View>

            <View style={styles.content}>
              <View style={styles.yearContainer}>
                <Text style={styles.yearText}>{year}</Text>
                <View style={styles.accentLine} />
              </View>

              <Text style={styles.title} numberOfLines={2}>{title}</Text>

              <View style={styles.impactRow}>
                <Zap size={14} color="#ffd700" fill="#ffd700" />
                <Text style={styles.impactText}>{t('impact')} {impact}%</Text>
              </View>

              <Text numberOfLines={3} style={styles.narrative}>{narrative}</Text>

              <View style={styles.readMoreContainer}>
                <Text style={styles.readMoreText}>{t('tap_for_story')}</Text>
                <View style={styles.readMoreDot} />
              </View>
            </View>
          </LinearGradient>
        </View>
      </TouchableOpacity>

      {/* Modal invizibil pentru captura de ecran */}
      <Modal
        visible={shareVisible}
        transparent
        animationType="none"
        statusBarTranslucent
      >
        <View style={styles.shareOverlay}>
          <ShareCard
            event={event}
            language={language}
            cardRef={shareCardRef}
          />
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

// Optimizare pentru a preveni re-randarea inutilă în liste/swipe
export const HistoryCard = memo(HistoryCardComponent, (prevProps, nextProps) => {
  return (
    prevProps.event?.id === nextProps.event?.id &&
    prevProps.event?.titleTranslations?.en === nextProps.event?.titleTranslations?.en
  );
});

const styles = StyleSheet.create({
  cardContainer: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
    elevation: 15,
    shadowOpacity: 0.5,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 10 },
  },
  cardInner: {
    flex: 1,
    borderRadius: 30,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  image: {
    ...StyleSheet.absoluteFillObject,
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
    padding: 24,
    justifyContent: 'space-between',
  },
  topActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryBadge: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.3)',
  },
  categoryText: {
    color: '#ffd700',
    fontWeight: '800',
    fontSize: 10,
    letterSpacing: 2,
  },
  shareBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    width: '100%',
  },
  yearContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  yearText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 1,
  },
  accentLine: {
    height: 3,
    width: 40,
    backgroundColor: '#ffd700',
    marginLeft: 10,
    borderRadius: 2,
  },
  title: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '900',
    lineHeight: 38,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  impactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 6,
  },
  impactText: {
    color: '#ffd700',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  narrative: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 12,
    fontWeight: '500',
  },
  readMoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    opacity: 0.8,
  },
  readMoreText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
  },
  readMoreDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ffd700',
    marginLeft: 8,
  },
  shareOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.01)', // Aproape invizibil dar necesar pentru captură
    alignItems: 'center',
    justifyContent: 'center',
  },
});