// components/StoryModal.tsx
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Bookmark, BookOpen, Share2, X } from 'lucide-react-native';
import React, { useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Linking,
  Modal,
  Platform,
  ScrollView,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '../context/LanguageContext';
import { getEventId, useSavedStore } from '../store/useSavedStore';

const { height: H, width: W } = Dimensions.get('window');
const HERO_H = H * 0.48;

interface StoryModalProps {
  visible: boolean;
  event: any;
  onClose: () => void;
  theme: any;
}

// ── Full-screen image viewer ──────────────────────────────────────────────────
const ImageViewer = ({
  images, initialIndex, onClose,
}: { images: string[]; initialIndex: number; onClose: () => void }) => {
  const insets = useSafeAreaInsets();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const scrollRef = useRef<ScrollView>(null);
  const bgOpacity = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(bgOpacity, { toValue: 1, duration: 220, useNativeDriver: true }).start();
    setTimeout(() => {
      scrollRef.current?.scrollTo({ x: W * initialIndex, animated: false });
    }, 50);
  }, []);

  const handleClose = () => {
    Animated.timing(bgOpacity, { toValue: 0, duration: 180, useNativeDriver: true })
      .start(() => onClose());
  };

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={handleClose}>
      <View style={{ flex: 1 }}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#000', opacity: bgOpacity }]} />
        <ScrollView
          ref={scrollRef}
          horizontal pagingEnabled showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          onMomentumScrollEnd={e => {
            setCurrentIndex(Math.round(e.nativeEvent.contentOffset.x / W));
          }}
          style={{ flex: 1 }}
        >
          {images.map((img, i) => (
            <View key={i} style={{ width: W, height: H, alignItems: 'center', justifyContent: 'center' }}>
              <Image source={{ uri: img }} style={{ width: W, height: H }} contentFit="contain" transition={300} />
            </View>
          ))}
        </ScrollView>

        <View style={[styles.viewerTopBar, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity onPress={handleClose} style={styles.viewerCloseBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <X color="#fff" size={20} strokeWidth={2.5} />
          </TouchableOpacity>
          {images.length > 1 && (
            <Text style={styles.viewerCounter}>{currentIndex + 1} / {images.length}</Text>
          )}
          <View style={{ width: 40 }} />
        </View>

        {images.length > 1 && (
          <View style={[styles.viewerDots, { paddingBottom: insets.bottom + 24 }]}>
            {images.map((_, i) => (
              <View key={i} style={[styles.viewerDot, {
                backgroundColor: i === currentIndex ? '#fff' : 'rgba(255,255,255,0.35)',
                width: i === currentIndex ? 16 : 5,
              }]} />
            ))}
          </View>
        )}
      </View>
    </Modal>
  );
};

// ── Paragraphs with drop cap ──────────────────────────────────────────────────
const Paragraphs = ({ text, theme }: { text: string; theme: any }) => {
  const raw = text.trim();
  const chunks: string[] = raw.includes('\n\n')
    ? raw.split(/\n{2,}/).map(s => s.replace(/\n/g, ' ').trim()).filter(Boolean)
    : splitIntoParagraphs(raw);

  return (
    <>
      {chunks.map((para, i) => {
        if (i === 0) {
          const first = para.charAt(0);
          const rest = para.slice(1);
          return (
            <View key={i} style={styles.paraWrap}>
              <View style={styles.dropCapRow}>
                <Text style={[styles.dropCap, { color: theme.gold }]}>{first}</Text>
                <Text style={[styles.paraText, { color: theme.text, flex: 1 }]}>{rest}</Text>
              </View>
            </View>
          );
        }
        return (
          <View key={i} style={styles.paraWrap}>
            <Text style={[styles.paraText, { color: theme.text }]}>{para}</Text>
          </View>
        );
      })}
    </>
  );
};

function splitIntoParagraphs(text: string): string[] {
  const sentences = text.match(/[^.!?]+[.!?]+/g) ?? [text];
  const chunks: string[] = [];
  let current = '';
  for (const s of sentences) {
    current += s;
    if (current.length > 260) { chunks.push(current.trim()); current = ''; }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks.length > 0 ? chunks : [text];
}

// ── Stat chip ─────────────────────────────────────────────────────────────────
const StatChip = ({ label, value, theme }: { label: string; value: string; theme: any }) => (
  <View style={[styles.statChip, { borderColor: theme.gold + '28', backgroundColor: theme.gold + '0C' }]}>
    <Text style={[styles.statLabel, { color: theme.subtext }]}>{label}</Text>
    <Text style={[styles.statValue, { color: theme.gold }]}>{value}</Text>
  </View>
);

// ── Gallery dots ──────────────────────────────────────────────────────────────
const GalleryDots = ({ total, active, gold }: { total: number; active: number; gold: string }) => {
  if (total <= 1) return null;
  return (
    <View style={styles.dotsRow}>
      {Array.from({ length: total }).map((_, i) => (
        <View key={i} style={[styles.dot,
          { backgroundColor: i === active ? gold : 'rgba(255,255,255,0.35)' },
          i === active && { width: 16 },
        ]} />
      ))}
    </View>
  );
};

// ── Wikipedia button ──────────────────────────────────────────────────────────
const WikipediaButton = ({ url, theme }: { url: string; theme: any }) => (
  <TouchableOpacity
    onPress={() => Linking.openURL(url).catch(() => {})}
    activeOpacity={0.75}
    style={[styles.wikiBtn, { borderColor: theme.gold + '40', backgroundColor: theme.gold + '0D' }]}
  >
    <View style={styles.wikiBtnLeft}>
      <BookOpen size={16} color={theme.gold} strokeWidth={2} />
      <View>
        <Text style={[styles.wikiLabel, { color: theme.subtext }]}>WANT TO READ MORE?</Text>
        <Text style={[styles.wikiTitle, { color: theme.gold }]}>Continue on Wikipedia</Text>
      </View>
    </View>
    <Text style={[styles.wikiArrow, { color: theme.gold }]}>→</Text>
  </TouchableOpacity>
);

// ── Main modal ────────────────────────────────────────────────────────────────
export const StoryModal = ({ visible, event, onClose, theme }: StoryModalProps) => {
  const { language } = useLanguage();
  const insets = useSafeAreaInsets();
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerStartIndex, setViewerStartIndex] = useState(0);
  const scrollY = useRef(new Animated.Value(0)).current;

  const { saveEvent, removeEvent, isSaved } = useSavedStore();

  if (!event) return null;

  // ── ID unic pentru acest event ──
  const eventId = getEventId(event);
  const saved = isSaved(eventId);

  const handleBookmark = () => {
    if (saved) {
      removeEvent(eventId);
    } else {
      saveEvent(event);
    }
  };

  const gallery: string[] = event.gallery ?? [];
  const rawYear = event.eventDate ?? event.event_date ?? event.year ?? '';
  const year = String(rawYear).trim();
  const title = event.titleTranslations?.[language] ?? event.titleTranslations?.en ?? '';
  const fullNarrative = event.narrativeTranslations?.[language] ?? event.narrativeTranslations?.en ?? '';
  const category = (event.category ?? 'HISTORY').toUpperCase();
  const impact = event.impactScore ?? 0;
  const sourceUrl: string | null = event.source_url ?? event.sourceUrl ?? null;

  const heroTranslateY = scrollY.interpolate({
    inputRange: [-100, 0, HERO_H], outputRange: [0, 0, HERO_H * 0.35], extrapolate: 'clamp',
  });
  const headerBg = scrollY.interpolate({
    inputRange: [HERO_H - 80, HERO_H], outputRange: ['rgba(0,0,0,0)', theme.background], extrapolate: 'clamp',
  });
  const headerTitleOpacity = scrollY.interpolate({
    inputRange: [HERO_H - 40, HERO_H + 10], outputRange: [0, 1], extrapolate: 'clamp',
  });

  const onShare = async () => {
    try {
      await Share.share({
        message: `${title} (${year})\n\n${fullNarrative.substring(0, 140)}…\n\nDaily History App`,
      });
    } catch {}
  };

  return (
    <>
      <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose} statusBarTranslucent>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
        <View style={[styles.root, { backgroundColor: theme.background }]}>

          {/* ── FLOATING ACTION BAR ── */}
          <Animated.View style={[styles.floatingBar, { paddingTop: insets.top + 6, backgroundColor: headerBg }]} pointerEvents="box-none">
            <Animated.Text style={[styles.floatingTitle, { color: theme.text, opacity: headerTitleOpacity }]} numberOfLines={1}>
              {title}
            </Animated.Text>
            <View style={styles.floatingActions}>
              <TouchableOpacity onPress={onClose} style={styles.glassBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <X color="#fff" size={18} strokeWidth={2.5} />
              </TouchableOpacity>
              <View style={{ flex: 1 }} />
              <TouchableOpacity onPress={onShare} style={styles.glassBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Share2 color="#fff" size={17} strokeWidth={2} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleBookmark}
                style={[styles.glassBtn, { marginLeft: 10 }, saved && styles.glassBtnActive]}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Bookmark color={saved ? '#ffd700' : '#fff'} fill={saved ? '#ffd700' : 'transparent'} size={17} strokeWidth={2} />
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* ── SCROLLABLE CONTENT ── */}
          <Animated.ScrollView
            bounces showsVerticalScrollIndicator={false}
            onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
            scrollEventThrottle={16}
            contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
          >
            {/* Hero */}
            <View style={styles.heroWrap}>
              <Animated.View style={[styles.heroInner, { transform: [{ translateY: heroTranslateY }] }]}>
                {gallery.length > 0 ? (
                  <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} scrollEventThrottle={16}
                    onMomentumScrollEnd={e => setGalleryIndex(Math.round(e.nativeEvent.contentOffset.x / W))}>
                    {gallery.map((img, i) => (
                      <TouchableOpacity key={i} activeOpacity={0.9}
                        onPress={() => { setViewerStartIndex(i); setViewerVisible(true); }}
                        style={{ width: W, height: HERO_H + 40 }}>
                        <Image source={{ uri: img }} style={{ width: W, height: HERO_H + 40 }} contentFit="cover" transition={400} />
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                ) : (
                  <View style={{ width: W, height: HERO_H + 40, backgroundColor: '#0d0d0f' }} />
                )}
              </Animated.View>

              <LinearGradient
                colors={['rgba(0,0,0,0.15)', 'transparent', 'rgba(0,0,0,0.55)', 'rgba(0,0,0,0.96)']}
                locations={[0, 0.3, 0.65, 1]}
                style={StyleSheet.absoluteFill} pointerEvents="none"
              />

              <View style={[styles.heroOverlay, { paddingBottom: 24 }]}>
                <View style={styles.heroBadgeRow}>
                  <View style={styles.heroCategoryBadge}>
                    <Text style={styles.heroCategoryText}>{category}</Text>
                  </View>
                  {saved && (
                    <View style={styles.savedBadge}>
                      <Bookmark size={10} color="#ffd700" fill="#ffd700" />
                      <Text style={styles.savedBadgeText}>SAVED</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.heroYear}>{year}</Text>
                <Text style={styles.heroTitle} numberOfLines={3}>{title}</Text>
                <GalleryDots total={gallery.length} active={galleryIndex} gold="#ffd700" />
              </View>
            </View>

            {/* ── BODY ── */}
            <View style={[styles.body, { backgroundColor: theme.background }]}>
              {impact > 0 && (
                <View style={styles.statsRow}>
                  <StatChip label="IMPACT" value={`${impact}%`} theme={theme} />
                  {year !== '' && <StatChip label="YEAR" value={year} theme={theme} />}
                  <StatChip label="CATEGORY" value={category} theme={theme} />
                </View>
              )}

              <View style={styles.ruleRow}>
                <View style={[styles.ruleLine, { backgroundColor: theme.border }]} />
                <View style={[styles.ruleDiamond, { backgroundColor: theme.gold }]} />
                <View style={[styles.ruleLine, { backgroundColor: theme.border }]} />
              </View>

              <View style={styles.narrativeWrap}>
                <Paragraphs text={fullNarrative || 'No story available.'} theme={theme} />
              </View>

              {sourceUrl ? (
                <View style={styles.wikiWrap}>
                  <WikipediaButton url={sourceUrl} theme={theme} />
                </View>
              ) : null}

              {/* Save button */}
              <TouchableOpacity
                onPress={handleBookmark}
                activeOpacity={0.8}
                style={[styles.saveBtn, {
                  backgroundColor: saved ? '#ffd700' + '18' : theme.card,
                  borderColor: saved ? '#ffd700' + '60' : theme.border,
                }]}
              >
                <Bookmark size={15} color={saved ? '#ffd700' : theme.subtext} fill={saved ? '#ffd700' : 'transparent'} strokeWidth={2} />
                <Text style={[styles.saveBtnText, { color: saved ? '#ffd700' : theme.subtext }]}>
                  {saved ? 'Saved to library' : 'Save to library'}
                </Text>
              </TouchableOpacity>

              <View style={styles.footerOrnament}>
                <View style={[styles.footerLine, { backgroundColor: theme.border }]} />
                <Text style={[styles.footerMark, { color: theme.gold }]}>✦</Text>
                <View style={[styles.footerLine, { backgroundColor: theme.border }]} />
              </View>

              <Text style={[styles.watermark, { color: theme.subtext }]}>Daily History</Text>
            </View>
          </Animated.ScrollView>
        </View>
      </Modal>

      {viewerVisible && gallery.length > 0 && (
        <ImageViewer images={gallery} initialIndex={viewerStartIndex} onClose={() => setViewerVisible(false)} />
      )}
    </>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  floatingBar: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100, paddingHorizontal: 16, paddingBottom: 10 },
  floatingTitle: { fontSize: 13, fontWeight: '600', letterSpacing: 0.2, textAlign: 'center', marginBottom: 8 },
  floatingActions: { flexDirection: 'row', alignItems: 'center' },
  glassBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.18)',
  },
  glassBtnActive: { backgroundColor: 'rgba(255,215,0,0.2)', borderColor: 'rgba(255,215,0,0.4)' },

  heroWrap: { height: HERO_H, overflow: 'hidden' },
  heroInner: { height: HERO_H + 40, marginTop: -40 },
  heroOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 22 },
  heroBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  heroCategoryBadge: {
    paddingHorizontal: 11, paddingVertical: 5, borderRadius: 20,
    backgroundColor: 'rgba(255,215,0,0.16)',
    borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,215,0,0.5)',
  },
  heroCategoryText: { color: '#ffd700', fontSize: 9, fontWeight: '800', letterSpacing: 2.5 },
  savedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,215,0,0.18)',
    paddingHorizontal: 8, paddingVertical: 5, borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,215,0,0.4)',
  },
  savedBadgeText: { color: '#ffd700', fontSize: 8, fontWeight: '800', letterSpacing: 1.5 },

  heroYear: { color: 'rgba(255,255,255,0.38)', fontSize: 12, fontWeight: '700', letterSpacing: 3, marginBottom: 6 },
  heroTitle: {
    color: '#fff', fontSize: 30, fontWeight: '800', lineHeight: 36, letterSpacing: -0.3, marginBottom: 16,
    textShadowColor: 'rgba(0,0,0,0.7)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 8,
  },
  dotsRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 4 },
  dot: { width: 5, height: 5, borderRadius: 3 },

  body: {
    marginTop: -28, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingTop: 28, paddingHorizontal: 22,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.2, shadowRadius: 12,
  },
  statsRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 22 },
  statChip: { borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 12, paddingVertical: 7, alignItems: 'center', gap: 2 },
  statLabel: { fontSize: 7, fontWeight: '700', letterSpacing: 2 },
  statValue: { fontSize: 14, fontWeight: '800', letterSpacing: 0.5 },

  ruleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 26, gap: 10 },
  ruleLine: { flex: 1, height: StyleSheet.hairlineWidth },
  ruleDiamond: { width: 5, height: 5, transform: [{ rotate: '45deg' }], opacity: 0.7 },

  narrativeWrap: { gap: 0 },
  paraWrap: { marginBottom: 20 },
  dropCapRow: { flexDirection: 'row', alignItems: 'flex-start' },
  dropCap: { fontSize: 68, lineHeight: 64, fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', fontWeight: '900', marginRight: 6, marginTop: -4, opacity: 0.9 },
  paraText: { fontSize: 17, lineHeight: 29, fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', letterSpacing: 0.15, opacity: 0.92 },

  wikiWrap: { marginTop: 8, marginBottom: 20 },
  wikiBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 16, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth },
  wikiBtnLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  wikiLabel: { fontSize: 8, fontWeight: '700', letterSpacing: 2, marginBottom: 3 },
  wikiTitle: { fontSize: 14, fontWeight: '700', letterSpacing: 0.2 },
  wikiArrow: { fontSize: 18, fontWeight: '300' },

  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 14, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, marginBottom: 28 },
  saveBtnText: { fontSize: 13, fontWeight: '700', letterSpacing: 0.5 },

  footerOrnament: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8, marginBottom: 16, opacity: 0.45 },
  footerLine: { flex: 1, height: StyleSheet.hairlineWidth },
  footerMark: { fontSize: 11 },
  watermark: { textAlign: 'center', fontSize: 10, fontWeight: '600', letterSpacing: 3, opacity: 0.3, marginBottom: 8 },

  viewerTopBar: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12, zIndex: 10, backgroundColor: 'rgba(0,0,0,0.4)' },
  viewerCloseBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  viewerCounter: { color: '#fff', fontSize: 13, fontWeight: '600', letterSpacing: 0.5 },
  viewerDots: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 },
  viewerDot: { height: 5, borderRadius: 3 },
});