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

export interface StoryModalProps {
  visible: boolean;
  event: any;
  onClose: () => void;
  theme: any;
}

// ── Image viewer ──────────────────────────────────────────────────────────────
const ImageViewer = ({ images, initialIndex, onClose }: { images: string[]; initialIndex: number; onClose: () => void }) => {
  const insets = useSafeAreaInsets();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const scrollRef = useRef<ScrollView>(null);
  const bgOpacity = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(bgOpacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    setTimeout(() => scrollRef.current?.scrollTo({ x: W * initialIndex, animated: false }), 50);
  }, []);

  const handleClose = () =>
    Animated.timing(bgOpacity, { toValue: 0, duration: 160, useNativeDriver: true }).start(() => onClose());

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={handleClose}>
      <View style={{ flex: 1 }}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#000', opacity: bgOpacity }]} />
        <ScrollView
          ref={scrollRef} horizontal pagingEnabled showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={e => setCurrentIndex(Math.round(e.nativeEvent.contentOffset.x / W))}
          style={{ flex: 1 }}
        >
          {images.map((img, i) => (
            <View key={i} style={{ width: W, height: H, alignItems: 'center', justifyContent: 'center' }}>
              <Image source={{ uri: img }} style={{ width: W, height: H }} contentFit="contain" transition={300} />
            </View>
          ))}
        </ScrollView>
        <View style={[s.ivBar, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity onPress={handleClose} style={s.ivBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <X color="#fff" size={20} strokeWidth={2.5} />
          </TouchableOpacity>
          {images.length > 1 && <Text style={s.ivCount}>{currentIndex + 1} / {images.length}</Text>}
          <View style={{ width: 40 }} />
        </View>
        {images.length > 1 && (
          <View style={[s.ivDots, { paddingBottom: insets.bottom + 20 }]}>
            {images.map((_, i) => (
              <View key={i} style={[s.ivDot, { backgroundColor: i === currentIndex ? '#fff' : 'rgba(255,255,255,0.3)', width: i === currentIndex ? 16 : 5 }]} />
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
      {chunks.map((para, i) => i === 0 ? (
        <View key={i} style={s.paraWrap}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
            <Text style={[s.dropCap, { color: theme.gold }]}>{para.charAt(0)}</Text>
            <Text style={[s.paraText, { color: theme.text, flex: 1 }]}>{para.slice(1)}</Text>
          </View>
        </View>
      ) : (
        <View key={i} style={s.paraWrap}>
          <Text style={[s.paraText, { color: theme.text }]}>{para}</Text>
        </View>
      ))}
    </>
  );
};

function splitIntoParagraphs(text: string): string[] {
  const sentences = text.match(/[^.!?]+[.!?]+/g) ?? [text];
  const chunks: string[] = [];
  let current = '';
  for (const sent of sentences) {
    current += sent;
    if (current.length > 260) { chunks.push(current.trim()); current = ''; }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks.length > 0 ? chunks : [text];
}

const StatChip = ({ label, value, theme }: { label: string; value: string; theme: any }) => (
  <View style={[s.chip, { borderColor: theme.gold + '28', backgroundColor: theme.gold + '0C' }]}>
    <Text style={[s.chipLabel, { color: theme.subtext }]}>{label}</Text>
    <Text style={[s.chipValue, { color: theme.gold }]}>{value}</Text>
  </View>
);

const GalleryDots = ({ total, active, gold }: { total: number; active: number; gold: string }) => {
  if (total <= 1) return null;
  return (
    <View style={s.dotsRow}>
      {Array.from({ length: total }).map((_, i) => (
        <View key={i} style={[s.dot, { backgroundColor: i === active ? gold : 'rgba(255,255,255,0.35)', width: i === active ? 16 : 5 }]} />
      ))}
    </View>
  );
};

// ── Main ──────────────────────────────────────────────────────────────────────
export const StoryModal = ({ visible, event, onClose, theme }: StoryModalProps) => {
  const { language } = useLanguage();
  const insets = useSafeAreaInsets();
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerStartIndex, setViewerStartIndex] = useState(0);
  const scrollY = useRef(new Animated.Value(0)).current;
  const { saveEvent, removeEvent, isSaved } = useSavedStore();

  if (!event) return null;

  const eventId = getEventId(event);
  const saved = isSaved(eventId);
  const toggleSave = () => saved ? removeEvent(eventId) : saveEvent(event);

  const gallery: string[] = event.gallery ?? [];
  const year = String(event.eventDate ?? event.event_date ?? event.year ?? '').trim();
  const title = event.titleTranslations?.[language] ?? event.titleTranslations?.en ?? '';
  const narrative = event.narrativeTranslations?.[language] ?? event.narrativeTranslations?.en ?? '';
  // Category fara underscore
  const category = (event.category ?? 'HISTORY').replace(/_/g, ' ').toUpperCase();
  const sourceUrl = event.source_url ?? event.sourceUrl ?? null;

  const headerBg = scrollY.interpolate({
    inputRange: [HERO_H - 80, HERO_H], outputRange: ['rgba(0,0,0,0)', theme.background], extrapolate: 'clamp',
  });
  const titleOpacity = scrollY.interpolate({
    inputRange: [HERO_H - 40, HERO_H + 10], outputRange: [0, 1], extrapolate: 'clamp',
  });
  const heroParallax = scrollY.interpolate({
    inputRange: [-100, 0, HERO_H], outputRange: [0, 0, HERO_H * 0.35], extrapolate: 'clamp',
  });

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={onClose}
        statusBarTranslucent
      >
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
        <View style={[s.root, { backgroundColor: theme.background }]}>

          {/* Floating bar */}
          <Animated.View style={[s.floatingBar, { paddingTop: insets.top + 6, backgroundColor: headerBg }]} pointerEvents="box-none">
            <Animated.Text style={[s.floatingTitle, { color: theme.text, opacity: titleOpacity }]} numberOfLines={1}>
              {title}
            </Animated.Text>
            <View style={s.actions}>
              <TouchableOpacity onPress={onClose} style={s.btn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <X color="#fff" size={18} strokeWidth={2.5} />
              </TouchableOpacity>
              <View style={{ flex: 1 }} />
              <TouchableOpacity onPress={() => Share.share({ message: `${title} (${year})\n\n${narrative.substring(0, 140)}…\n\nDaily History App` }).catch(() => {})} style={s.btn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Share2 color="#fff" size={17} strokeWidth={2} />
              </TouchableOpacity>
              <TouchableOpacity onPress={toggleSave} style={[s.btn, { marginLeft: 10 }, saved && s.btnActive]} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Bookmark color={saved ? '#ffd700' : '#fff'} fill={saved ? '#ffd700' : 'transparent'} size={17} strokeWidth={2} />
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* Scroll */}
          <Animated.ScrollView
            bounces showsVerticalScrollIndicator={false}
            onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
            scrollEventThrottle={16}
            contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
          >
            {/* Hero */}
            <View style={s.heroWrap}>
              <Animated.View style={{ height: HERO_H + 40, marginTop: -40, transform: [{ translateY: heroParallax }] }}>
                {gallery.length > 0 ? (
                  <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}
                    onMomentumScrollEnd={e => setGalleryIndex(Math.round(e.nativeEvent.contentOffset.x / W))}>
                    {gallery.map((img, i) => (
                      <TouchableOpacity key={i} activeOpacity={0.9}
                        onPress={() => { setViewerStartIndex(i); setViewerVisible(true); }}
                        style={{ width: W, height: HERO_H + 40 }}>
                        <Image source={{ uri: img }} style={{ width: W, height: HERO_H + 40 }} contentFit="cover" transition={400} />
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                ) : <View style={{ width: W, height: HERO_H + 40, backgroundColor: '#0d0d0f' }} />}
              </Animated.View>

              <LinearGradient
                colors={['rgba(0,0,0,0.15)', 'transparent', 'rgba(0,0,0,0.55)', 'rgba(0,0,0,0.96)']}
                locations={[0, 0.3, 0.65, 1]}
                style={StyleSheet.absoluteFill} pointerEvents="none"
              />

              <View style={[s.heroOverlay, { paddingBottom: 24 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <View style={s.catBadge}><Text style={s.catText}>{category}</Text></View>
                  {saved && (
                    <View style={s.savedBadge}>
                      <Bookmark size={9} color="#ffd700" fill="#ffd700" />
                      <Text style={s.savedText}>SAVED</Text>
                    </View>
                  )}
                </View>
                <Text style={s.heroYear}>{year}</Text>
                <Text style={s.heroTitle} numberOfLines={3}>{title}</Text>
                <GalleryDots total={gallery.length} active={galleryIndex} gold="#ffd700" />
              </View>
            </View>

            {/* Body */}
            <View style={[s.body, { backgroundColor: theme.background }]}>
              {/* Chips: doar YEAR si CATEGORY, fara IMPACT */}
              <View style={s.chips}>
                {year !== '' && <StatChip label="YEAR" value={year} theme={theme} />}
                <StatChip label="CATEGORY" value={category} theme={theme} />
              </View>

              <View style={s.ruleRow}>
                <View style={[s.rule, { backgroundColor: theme.border }]} />
                <View style={[s.diamond, { backgroundColor: theme.gold }]} />
                <View style={[s.rule, { backgroundColor: theme.border }]} />
              </View>

              <Paragraphs text={narrative || 'No story available.'} theme={theme} />

              {sourceUrl && (
                <TouchableOpacity onPress={() => Linking.openURL(sourceUrl).catch(() => {})} activeOpacity={0.75}
                  style={[s.wikiBtn, { borderColor: theme.gold + '40', backgroundColor: theme.gold + '0D' }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                    <BookOpen size={16} color={theme.gold} strokeWidth={2} />
                    <View>
                      <Text style={[s.wikiLabel, { color: theme.subtext }]}>WANT TO READ MORE?</Text>
                      <Text style={[s.wikiTitle, { color: theme.gold }]}>Continue on Wikipedia</Text>
                    </View>
                  </View>
                  <Text style={{ fontSize: 18, color: theme.gold }}>→</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity onPress={toggleSave} activeOpacity={0.8}
                style={[s.saveBtn, { backgroundColor: saved ? '#ffd700' + '18' : theme.card, borderColor: saved ? '#ffd700' + '60' : theme.border }]}>
                <Bookmark size={15} color={saved ? '#ffd700' : theme.subtext} fill={saved ? '#ffd700' : 'transparent'} strokeWidth={2} />
                <Text style={[s.saveBtnText, { color: saved ? '#ffd700' : theme.subtext }]}>
                  {saved ? 'Saved to library' : 'Save to library'}
                </Text>
              </TouchableOpacity>

              <View style={s.footer}>
                <View style={[s.rule, { backgroundColor: theme.border }]} />
                <Text style={{ fontSize: 11, color: theme.gold }}>✦</Text>
                <View style={[s.rule, { backgroundColor: theme.border }]} />
              </View>
              <Text style={[s.watermark, { color: theme.subtext }]}>Daily History</Text>
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

const s = StyleSheet.create({
  root: { flex: 1 },

  floatingBar: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100, paddingHorizontal: 16, paddingBottom: 10 },
  floatingTitle: { fontSize: 13, fontWeight: '600', letterSpacing: 0.2, textAlign: 'center', marginBottom: 8 },
  actions: { flexDirection: 'row', alignItems: 'center' },
  btn: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.18)' },
  btnActive: { backgroundColor: 'rgba(255,215,0,0.2)', borderColor: 'rgba(255,215,0,0.4)' },

  heroWrap: { height: HERO_H, overflow: 'hidden' },
  heroOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 22 },
  catBadge: { paddingHorizontal: 11, paddingVertical: 5, borderRadius: 20, backgroundColor: 'rgba(255,215,0,0.16)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,215,0,0.5)' },
  catText: { color: '#ffd700', fontSize: 9, fontWeight: '800', letterSpacing: 2.5 },
  savedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,215,0,0.18)', paddingHorizontal: 8, paddingVertical: 5, borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,215,0,0.4)' },
  savedText: { color: '#ffd700', fontSize: 8, fontWeight: '800', letterSpacing: 1.5 },
  heroYear: { color: 'rgba(255,255,255,0.38)', fontSize: 12, fontWeight: '700', letterSpacing: 3, marginBottom: 6 },
  heroTitle: { color: '#fff', fontSize: 30, fontWeight: '800', lineHeight: 36, letterSpacing: -0.3, marginBottom: 16, textShadowColor: 'rgba(0,0,0,0.7)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 8 },
  dotsRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 4 },
  dot: { height: 5, borderRadius: 3 },

  body: { marginTop: -28, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 28, paddingHorizontal: 22 },
  chips: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 22 },
  chip: { borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 12, paddingVertical: 7, alignItems: 'center', gap: 2 },
  chipLabel: { fontSize: 7, fontWeight: '700', letterSpacing: 2 },
  chipValue: { fontSize: 14, fontWeight: '800', letterSpacing: 0.5 },

  ruleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 26, gap: 10 },
  rule: { flex: 1, height: StyleSheet.hairlineWidth },
  diamond: { width: 5, height: 5, transform: [{ rotate: '45deg' }], opacity: 0.7 },

  paraWrap: { marginBottom: 20 },
  dropCap: { fontSize: 42, lineHeight: 42, fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', fontWeight: '800', marginRight: 4, marginTop: 2, opacity: 0.85 },
  paraText: { fontSize: 17, lineHeight: 29, fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', letterSpacing: 0.15, opacity: 0.92 },

  wikiBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 16, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, marginTop: 8, marginBottom: 20 },
  wikiLabel: { fontSize: 8, fontWeight: '700', letterSpacing: 2, marginBottom: 3 },
  wikiTitle: { fontSize: 14, fontWeight: '700', letterSpacing: 0.2 },

  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 14, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, marginBottom: 28 },
  saveBtnText: { fontSize: 13, fontWeight: '700', letterSpacing: 0.5 },

  footer: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8, marginBottom: 16, opacity: 0.4 },
  watermark: { textAlign: 'center', fontSize: 10, fontWeight: '600', letterSpacing: 3, opacity: 0.3, marginBottom: 8 },

  ivBar: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12, zIndex: 10, backgroundColor: 'rgba(0,0,0,0.4)' },
  ivBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  ivCount: { color: '#fff', fontSize: 13, fontWeight: '600', letterSpacing: 0.5 },
  ivDots: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 },
  ivDot: { height: 5, borderRadius: 3 },
});