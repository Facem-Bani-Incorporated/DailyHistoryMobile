// components/StoryModal.tsx
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Bookmark, BookOpen, Clock, Share2, X } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated, Dimensions, Linking, Modal, Platform, ScrollView,
  Share, StatusBar, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAllEvents } from '../context/AllEventsContext';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { useGamificationStore } from '../store/useGamificationStore';
import { getEventId, useSavedStore } from '../store/useSavedStore';
import RelatedEvents from './RelatedEvents';

const { height: H, width: W } = Dimensions.get('window');
const HERO_H = H * 0.48;

// Rich magazine drop-cap palette — cycles through every paragraph
const DROPCAP_PALETTE = [
  '#C0392B', // crimson
  '#8E44AD', // royal purple
  '#2980B9', // sapphire
  '#27AE60', // emerald
  '#D4AC0D', // antique gold
  '#CA6F1E', // burnt sienna
  '#148F77', // deep teal
];

export interface StoryModalProps {
  visible: boolean;
  event: any;
  onClose: () => void;
  theme: any;
  allEvents?: any[];
}

/* ─── Image fullscreen viewer ─── */
const ImageViewer = ({ images, initialIndex, onClose }: { images: string[]; initialIndex: number; onClose: () => void }) => {
  const insets = useSafeAreaInsets();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const scrollRef = useRef<ScrollView>(null);
  const bgOpacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
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
          ref={scrollRef}
          horizontal pagingEnabled showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={e => setCurrentIndex(Math.round(e.nativeEvent.contentOffset.x / W))}
          style={{ flex: 1 }}
        >
          {images.map((img, i) => (
            <View key={i} style={{ width: W, height: H, alignItems: 'center', justifyContent: 'center' }}>
              <Image source={{ uri: img }} style={{ width: W, height: H }} contentFit="contain" transition={300} />
            </View>
          ))}
        </ScrollView>
        <View style={[iv.bar, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity onPress={handleClose} style={iv.btn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <X color="#fff" size={20} strokeWidth={2.5} />
          </TouchableOpacity>
          {images.length > 1 && <Text style={iv.count}>{currentIndex + 1} / {images.length}</Text>}
          <View style={{ width: 40 }} />
        </View>
        {images.length > 1 && (
          <View style={[iv.dots, { paddingBottom: insets.bottom + 20 }]}>
            {images.map((_, i) => (
              <View key={i} style={[iv.dot, { backgroundColor: i === currentIndex ? '#fff' : 'rgba(255,255,255,0.3)', width: i === currentIndex ? 16 : 5 }]} />
            ))}
          </View>
        )}
      </View>
    </Modal>
  );
};
const iv = StyleSheet.create({
  bar: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12, zIndex: 10, backgroundColor: 'rgba(0,0,0,0.4)' },
  btn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  count: { color: '#fff', fontSize: 13, fontWeight: '600', letterSpacing: 0.5 },
  dots: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 },
  dot: { height: 5, borderRadius: 3 },
});

/* ─── Helpers ─── */
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

function estimateReadTime(text: string): string {
  const words = text.trim().split(/\s+/).length;
  const minutes = Math.max(1, Math.round(words / 200));
  return `${minutes} MIN READ`;
}

/* ─── Pull Quote ─── */
const PullQuote = ({ text, theme }: { text: string; theme: any }) => (
  <View style={[st.pullWrap, { borderLeftColor: theme.gold, backgroundColor: theme.gold + '09' }]}>
    <Text style={[st.pullMark, { color: theme.gold }]}>"</Text>
    <Text style={[st.pullText, { color: theme.text }]}>{text}</Text>
    <View style={[st.pullRule, { backgroundColor: theme.gold }]} />
    <Text style={[st.pullCredit, { color: theme.gold }]}>DAILY HISTORY</Text>
  </View>
);

/* ─── Magazine Paragraphs ─── */
const Paragraphs = ({ text, theme }: { text: string; theme: any }) => {
  const raw = text.trim();
  const chunks: string[] = raw.includes('\n\n')
    ? raw.split(/\n{2,}/).map(s => s.replace(/\n/g, ' ').trim()).filter(Boolean)
    : splitIntoParagraphs(raw);

  // Pull quote: first sentence of the ~40% paragraph
  const pullIdx = chunks.length > 4 ? Math.floor(chunks.length * 0.42) : -1;
  const pullSentence = pullIdx >= 0
    ? (chunks[pullIdx].match(/[^.!?]+[.!?]+/)?.[0] ?? '').trim()
    : '';

  const nodes: React.ReactNode[] = [];

  chunks.forEach((para, i) => {
    const dropColor = DROPCAP_PALETTE[i % DROPCAP_PALETTE.length];
    const isFirst = i === 0;

    // Pull quote inserted BEFORE its source paragraph
    if (i === pullIdx && pullSentence.length > 50) {
      nodes.push(<PullQuote key="pq" text={pullSentence} theme={theme} />);
    }

    // Chapter break every 3 paragraphs (skipping first and last)
    if (i > 0 && i % 3 === 0 && i < chunks.length - 1 && i !== pullIdx) {
      nodes.push(
        <View key={`cb-${i}`} style={st.chapterBreak}>
          <Text style={[st.chapterDots, { color: theme.gold }]}>· · ·</Text>
        </View>,
      );
    }

    nodes.push(
      <View key={i} style={[st.paraWrap, isFirst && st.paraWrapFirst]}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
          <Text style={[st.dropCap, { color: dropColor }, isFirst && st.dropCapLead]}>
            {para.charAt(0)}
          </Text>
          <Text style={[st.paraText, { color: theme.text, flex: 1 }, isFirst && st.paraTextLead]}>
            {para.slice(1)}
          </Text>
        </View>
      </View>,
    );
  });

  return <>{nodes}</>;
};

/* ─── Small stat chip ─── */
const StatChip = ({ label, value, theme }: { label: string; value: string; theme: any }) => (
  <View style={[st.chip, { borderColor: theme.gold + '28', backgroundColor: theme.gold + '0C' }]}>
    <Text style={[st.chipLabel, { color: theme.subtext }]}>{label}</Text>
    <Text style={[st.chipValue, { color: theme.gold }]}>{value}</Text>
  </View>
);

/* ─── Gallery pagination dots ─── */
const GalleryDots = ({ total, active, gold }: { total: number; active: number; gold: string }) => {
  if (total <= 1) return null;
  return (
    <View style={st.dotsRow}>
      {Array.from({ length: total }).map((_, i) => (
        <View key={i} style={[st.dot, { backgroundColor: i === active ? gold : 'rgba(255,255,255,0.35)', width: i === active ? 16 : 5 }]} />
      ))}
    </View>
  );
};

/* ══════════════════════════════════════════
   Main StoryModal
══════════════════════════════════════════ */
export const StoryModal = ({ visible, event, onClose, theme, allEvents: allEventsProp }: StoryModalProps) => {
  const { language } = useLanguage();
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const contextEvents = useAllEvents();
  const allEvents = (allEventsProp && allEventsProp.length > 0) ? allEventsProp : contextEvents;

  const [galleryIndex, setGalleryIndex] = useState(0);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerStartIndex, setViewerStartIndex] = useState(0);
  const [relatedEvent, setRelatedEvent] = useState<any>(null);
  const [contentH, setContentH] = useState(H * 2);

  const scrollY = useRef(new Animated.Value(0)).current;
  const { saveEvent, removeEvent, isSaved } = useSavedStore();
  const markEventRead = useGamificationStore(s => s.markEventRead);
  const eventId = event ? getEventId(event) : null;

  useEffect(() => {
    if (visible && eventId && event) {
      markEventRead(eventId, event.category ?? 'history', String(event.eventDate ?? event.event_date ?? event.year ?? '').trim());
    }
  }, [visible, eventId]);

  useEffect(() => {
    if (visible) { setGalleryIndex(0); setRelatedEvent(null); }
  }, [visible, eventId]);

  if (!event) return null;

  const saved = isSaved(eventId!);
  const toggleSave = () => saved ? removeEvent(eventId!) : saveEvent(event);
  const gallery: string[] = event.gallery ?? [];
  const year = String(event.eventDate ?? event.event_date ?? event.year ?? '').trim();
  const title = event.titleTranslations?.[language] ?? event.titleTranslations?.en ?? '';
  const narrative = event.narrativeTranslations?.[language] ?? event.narrativeTranslations?.en ?? '';
  const category = (event.category ?? 'HISTORY').replace(/_/g, ' ').toUpperCase();
  const sourceUrl = event.source_url ?? event.sourceUrl ?? null;
  const readTime = estimateReadTime(narrative || '');

  // Scroll-driven animations
  const headerBg = scrollY.interpolate({ inputRange: [HERO_H - 80, HERO_H], outputRange: ['rgba(0,0,0,0)', theme.background], extrapolate: 'clamp' });
  const titleOpacity = scrollY.interpolate({ inputRange: [HERO_H - 40, HERO_H + 10], outputRange: [0, 1], extrapolate: 'clamp' });
  const heroParallax = scrollY.interpolate({ inputRange: [-100, 0, HERO_H], outputRange: [0, 0, HERO_H * 0.35], extrapolate: 'clamp' });
  const progressWidth = scrollY.interpolate({
    inputRange: [0, Math.max(1, contentH - H)],
    outputRange: [0, W],
    extrapolate: 'clamp',
  });

  return (
    <>
      <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose} statusBarTranslucent>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
        <View style={[st.root, { backgroundColor: theme.background }]}>

          {/* ── Reading progress bar ── */}
          <View style={[st.progressTrack, { top: insets.top }]} pointerEvents="none">
            <Animated.View style={[st.progressFill, { width: progressWidth, backgroundColor: theme.gold }]} />
          </View>

          {/* ── Floating header ── */}
          <Animated.View style={[st.floatingBar, { paddingTop: insets.top + 6, backgroundColor: headerBg }]} pointerEvents="box-none">
            <Animated.Text style={[st.floatingTitle, { color: theme.text, opacity: titleOpacity }]} numberOfLines={1}>{title}</Animated.Text>
            <View style={st.actions}>
              <TouchableOpacity onPress={onClose} style={st.btn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <X color="#fff" size={18} strokeWidth={2.5} />
              </TouchableOpacity>
              <View style={{ flex: 1 }} />
              <TouchableOpacity
                onPress={() => Share.share({ message: `${title} (${year})\n\n${narrative.substring(0, 140)}…\n\nDaily History App` }).catch(() => {})}
                style={st.btn}
              >
                <Share2 color="#fff" size={17} strokeWidth={2} />
              </TouchableOpacity>
              <TouchableOpacity onPress={toggleSave} style={[st.btn, { marginLeft: 10 }, saved && st.btnActive]}>
                <Bookmark color={saved ? '#ffd700' : '#fff'} fill={saved ? '#ffd700' : 'transparent'} size={17} strokeWidth={2} />
              </TouchableOpacity>
            </View>
          </Animated.View>

          <Animated.ScrollView
            bounces
            showsVerticalScrollIndicator={false}
            onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
            scrollEventThrottle={16}
            onContentSizeChange={(_, h) => setContentH(h)}
            contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
          >
            {/* ── Hero image ── */}
            <View style={st.heroWrap}>
              <Animated.View style={{ height: HERO_H + 40, marginTop: -40, transform: [{ translateY: heroParallax }] }}>
                {gallery.length > 0 ? (
                  <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={e => setGalleryIndex(Math.round(e.nativeEvent.contentOffset.x / W))}>
                    {gallery.map((img, i) => (
                      <TouchableOpacity key={i} activeOpacity={0.9} onPress={() => { setViewerStartIndex(i); setViewerVisible(true); }} style={{ width: W, height: HERO_H + 40 }}>
                        <Image source={{ uri: img }} style={{ width: W, height: HERO_H + 40 }} contentFit="cover" transition={400} />
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                ) : (
                  <View style={{ width: W, height: HERO_H + 40, backgroundColor: '#0d0d0f' }} />
                )}
              </Animated.View>
              <LinearGradient
                colors={['rgba(0,0,0,0.1)', 'transparent', 'rgba(0,0,0,0.55)', 'rgba(0,0,0,0.97)']}
                locations={[0, 0.3, 0.65, 1]}
                style={StyleSheet.absoluteFill}
                pointerEvents="none"
              />
              <View style={[st.heroOverlay, { paddingBottom: 24 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <View style={st.catBadge}><Text style={st.catText}>{category}</Text></View>
                  {saved && (
                    <View style={st.savedBadge}>
                      <Bookmark size={9} color="#ffd700" fill="#ffd700" />
                      <Text style={st.savedText}>SAVED</Text>
                    </View>
                  )}
                </View>
                <Text style={st.heroYear}>{year}</Text>
                <Text style={st.heroTitle} numberOfLines={3}>{title}</Text>
                <GalleryDots total={gallery.length} active={galleryIndex} gold="#ffd700" />
              </View>
            </View>

            {/* ── Body ── */}
            <View style={[st.body, { backgroundColor: theme.background }]}>

              {/* Stat chips */}
              <View style={st.chips}>
                {year !== '' && <StatChip label="YEAR" value={year} theme={theme} />}
                <StatChip label="CATEGORY" value={category} theme={theme} />
              </View>

              {/* Magazine byline */}
              <View style={st.bylineRow}>
                <View style={[st.bylineLine, { backgroundColor: theme.border }]} />
                <View style={[st.bylinePill, { borderColor: theme.gold + '35', backgroundColor: theme.gold + '0A' }]}>
                  <Clock size={9} color={theme.gold} strokeWidth={2.5} />
                  <Text style={[st.bylineText, { color: theme.subtext }]}>DAILY HISTORY  ·  {readTime}</Text>
                </View>
                <View style={[st.bylineLine, { backgroundColor: theme.border }]} />
              </View>

              {/* Ornamental divider */}
              <View style={st.ornamentRow}>
                <View style={[st.ornamentLine, { backgroundColor: theme.gold + '45' }]} />
                <Text style={[st.ornamentGlyph, { color: theme.gold }]}>✦</Text>
                <View style={[st.ornamentLine, { backgroundColor: theme.gold + '45' }]} />
              </View>

              {/* Article body */}
              <Paragraphs text={narrative || 'No story available.'} theme={theme} />

              {/* Wikipedia CTA */}
              {sourceUrl && (
                <TouchableOpacity
                  onPress={() => Linking.openURL(sourceUrl).catch(() => {})}
                  activeOpacity={0.75}
                  style={[st.wikiBtn, { borderColor: theme.gold + '40', backgroundColor: theme.gold + '0D' }]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                    <BookOpen size={16} color={theme.gold} strokeWidth={2} />
                    <View>
                      <Text style={[st.wikiLabel, { color: theme.subtext }]}>WANT TO READ MORE?</Text>
                      <Text style={[st.wikiTitle, { color: theme.gold }]}>Continue on Wikipedia</Text>
                    </View>
                  </View>
                  <Text style={{ fontSize: 18, color: theme.gold }}>→</Text>
                </TouchableOpacity>
              )}

              {/* Related events */}
              {allEvents.length > 0 && (
                <RelatedEvents currentEvent={event} allEvents={allEvents} theme={theme} isDark={isDark} onEventPress={(evt) => setRelatedEvent(evt)} />
              )}

              {/* Save button */}
              <TouchableOpacity
                onPress={toggleSave}
                activeOpacity={0.8}
                style={[st.saveBtn, { backgroundColor: saved ? '#ffd700' + '18' : theme.card, borderColor: saved ? '#ffd700' + '60' : theme.border }]}
              >
                <Bookmark size={15} color={saved ? '#ffd700' : theme.subtext} fill={saved ? '#ffd700' : 'transparent'} strokeWidth={2} />
                <Text style={[st.saveBtnText, { color: saved ? '#ffd700' : theme.subtext }]}>
                  {saved ? 'Saved to library' : 'Save to library'}
                </Text>
              </TouchableOpacity>

              {/* Footer ornament */}
              <View style={st.footerRule}>
                <View style={[st.rule, { backgroundColor: theme.border }]} />
                <Text style={{ fontSize: 11, color: theme.gold }}>✦</Text>
                <View style={[st.rule, { backgroundColor: theme.border }]} />
              </View>
              <Text style={[st.watermark, { color: theme.subtext }]}>Daily History</Text>
            </View>
          </Animated.ScrollView>
        </View>
      </Modal>

      {viewerVisible && gallery.length > 0 && (
        <ImageViewer images={gallery} initialIndex={viewerStartIndex} onClose={() => setViewerVisible(false)} />
      )}
      {relatedEvent && (
        <StoryModal visible={!!relatedEvent} event={relatedEvent} onClose={() => setRelatedEvent(null)} theme={theme} allEvents={allEvents} />
      )}
    </>
  );
};

/* ══════════════════════════════════════════
   Styles
══════════════════════════════════════════ */
const SERIF = Platform.OS === 'ios' ? 'Georgia' : 'serif';

const st = StyleSheet.create({
  root: { flex: 1 },

  // Reading progress bar
  progressTrack: { position: 'absolute', left: 0, right: 0, height: 3, zIndex: 200 },
  progressFill: { height: 3, borderRadius: 1.5 },

  // Floating header
  floatingBar: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100, paddingHorizontal: 16, paddingBottom: 10 },
  floatingTitle: { fontSize: 13, fontWeight: '600', letterSpacing: 0.2, textAlign: 'center', marginBottom: 8 },
  actions: { flexDirection: 'row', alignItems: 'center' },
  btn: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.18)' },
  btnActive: { backgroundColor: 'rgba(255,215,0,0.2)', borderColor: 'rgba(255,215,0,0.4)' },

  // Hero
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

  // Body panel
  body: { marginTop: -28, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 28, paddingHorizontal: 22 },
  chips: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 20 },
  chip: { borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 12, paddingVertical: 7, alignItems: 'center', gap: 2 },
  chipLabel: { fontSize: 7, fontWeight: '700', letterSpacing: 2 },
  chipValue: { fontSize: 14, fontWeight: '800', letterSpacing: 0.5 },

  // Byline
  bylineRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 22 },
  bylineLine: { flex: 1, height: StyleSheet.hairlineWidth },
  bylinePill: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: StyleSheet.hairlineWidth, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  bylineText: { fontSize: 8, fontWeight: '700', letterSpacing: 1.8 },

  // Ornamental divider
  ornamentRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 30, gap: 12 },
  ornamentLine: { flex: 1, height: 1 },
  ornamentGlyph: { fontSize: 10, opacity: 0.8 },

  // Paragraphs
  paraWrap: { marginBottom: 22 },
  paraWrapFirst: { marginBottom: 26 },
  dropCap: {
    fontSize: 40,
    lineHeight: 40,
    fontFamily: SERIF,
    fontWeight: '800',
    marginRight: 5,
    marginTop: 3,
  },
  dropCapLead: {
    fontSize: 58,
    lineHeight: 58,
    marginRight: 7,
    marginTop: 2,
  },
  paraText: {
    fontSize: 17,
    lineHeight: 30,
    fontFamily: SERIF,
    letterSpacing: 0.15,
    opacity: 0.93,
  },
  paraTextLead: {
    fontSize: 18.5,
    lineHeight: 32,
    fontWeight: '500',
    opacity: 1,
  },

  // Pull quote
  pullWrap: {
    marginVertical: 28,
    marginHorizontal: -2,
    paddingLeft: 20,
    paddingRight: 18,
    paddingTop: 14,
    paddingBottom: 18,
    borderLeftWidth: 4,
    borderRadius: 2,
  },
  pullMark: {
    fontSize: 56,
    lineHeight: 46,
    fontFamily: SERIF,
    fontWeight: '800',
    opacity: 0.55,
    marginBottom: 2,
  },
  pullText: {
    fontSize: 19,
    lineHeight: 31,
    fontFamily: SERIF,
    fontStyle: 'italic',
    fontWeight: '600',
    letterSpacing: 0.1,
    marginBottom: 18,
  },
  pullRule: { height: 1, width: 36, marginBottom: 8, opacity: 0.55 },
  pullCredit: { fontSize: 8, fontWeight: '800', letterSpacing: 2.8, opacity: 0.7 },

  // Chapter break
  chapterBreak: { alignItems: 'center', marginVertical: 22 },
  chapterDots: { fontSize: 15, letterSpacing: 10, opacity: 0.45 },

  // Wikipedia CTA
  wikiBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 16, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, marginTop: 8, marginBottom: 20 },
  wikiLabel: { fontSize: 8, fontWeight: '700', letterSpacing: 2, marginBottom: 3 },
  wikiTitle: { fontSize: 14, fontWeight: '700', letterSpacing: 0.2 },

  // Save button
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 14, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, marginBottom: 28 },
  saveBtnText: { fontSize: 13, fontWeight: '700', letterSpacing: 0.5 },

  // Footer
  rule: { flex: 1, height: StyleSheet.hairlineWidth },
  footerRule: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8, marginBottom: 16, opacity: 0.4 },
  watermark: { textAlign: 'center', fontSize: 10, fontWeight: '600', letterSpacing: 3, opacity: 0.3, marginBottom: 8 },
});
