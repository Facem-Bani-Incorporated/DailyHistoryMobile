// components/StoryModal.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Bookmark, BookOpen, ChevronLeft, ChevronRight, Pause, Play, Share2, X } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated, Dimensions, Linking, Modal, PanResponder, Platform, ScrollView,
  StatusBar, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAllEvents } from '../context/AllEventsContext';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { useEventImages } from '../hooks/useEventImages';
import { useTTS } from '../hooks/useTTS';
import { useGamificationStore } from '../store/useGamificationStore';
import { getEventId, useSavedStore } from '../store/useSavedStore';
import { QuizSection } from './QuizSection';
import RelatedEvents from './RelatedEvents';
import { SharePickerModal } from './SharePickerModal';

const { height: H, width: W } = Dimensions.get('window');
const HERO_H = H * 0.50;
const SERIF = Platform.OS === 'ios' ? 'Georgia' : 'serif';

const TTS_LABELS: Record<string, Record<string, string>> = {
  en: { listen: 'Listen', listening: 'Playing...' },
  ro: { listen: 'Ascultă', listening: 'Redare...' },
  fr: { listen: 'Écouter', listening: 'Lecture...' },
  de: { listen: 'Anhören', listening: 'Wiedergabe...' },
  es: { listen: 'Escuchar', listening: 'Reproduciendo...' },
};

const SAME_YEAR_LABELS: Record<string, string> = {
  en: 'What else happened in',
  ro: 'Ce s-a mai întâmplat în',
  fr: "Que s'est-il passé en",
  de: 'Was geschah noch im Jahr',
  es: 'Qué más pasó en',
};

const RESUME_LABELS: Record<string, string> = {
  en: 'Continuing where you left off',
  ro: 'Continuă de unde ai rămas',
  fr: 'Reprise là où vous vous êtes arrêté',
  de: 'Weiter, wo Sie aufgehört haben',
  es: 'Continuando donde lo dejaste',
};

// AsyncStorage key for per-event resume-reading scroll position
const readPosKey = (eid: string) => `read_pos_v1:${eid}`;
const READ_POS_MIN = 250; // only save/restore if scrolled past this

export interface StoryModalProps {
  visible: boolean;
  event: any;
  onClose: () => void;
  theme: any;
  allEvents?: any[];
  // Optional sibling navigation (e.g. from Timeline) — when provided,
  // floating prev/next arrows appear and tapping them swaps the open event.
  prevEvent?: any | null;
  nextEvent?: any | null;
  onNavigate?: (event: any) => void;
  // When true, enable left/right swipe gesture for prev/next and hide arrows.
  // Default false — all other callers see exactly the existing behaviour.
  swipeable?: boolean;
}

// ─── Single zoomable image (PanResponder pinch — works on Android + iOS) ──────
const ZoomableImage = ({ uri, onZoomChange }: { uri: string; onZoomChange: (z: boolean) => void }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const baseScale = useRef(1);
  const startDist = useRef(0);

  const getTouchDist = (touches: any[]): number => {
    if (touches.length < 2) return 0;
    const dx = touches[1].pageX - touches[0].pageX;
    const dy = touches[1].pageY - touches[0].pageY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const panResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: (e) => e.nativeEvent.touches.length === 2,
    onMoveShouldSetPanResponder: (e) => e.nativeEvent.touches.length === 2,
    onPanResponderGrant: (e) => {
      startDist.current = getTouchDist(Array.from(e.nativeEvent.touches));
    },
    onPanResponderMove: (e) => {
      const touches = Array.from(e.nativeEvent.touches);
      if (touches.length < 2 || !startDist.current) return;
      const newScale = Math.min(4, Math.max(1, baseScale.current * (getTouchDist(touches) / startDist.current)));
      scale.setValue(newScale);
      onZoomChange(newScale > 1.05);
    },
    onPanResponderRelease: () => {
      const v: number = (scale as any)._value;
      const clamped = Math.min(4, Math.max(1, v));
      baseScale.current = clamped < 1.05 ? 1 : clamped;
      if (clamped < 1.05) {
        Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();
        onZoomChange(false);
      }
      startDist.current = 0;
    },
  })).current;

  return (
    <View style={{ width: W, height: H, alignItems: 'center', justifyContent: 'center' }} {...panResponder.panHandlers}>
      <Animated.View style={{ transform: [{ scale }] }}>
        <Image source={{ uri }} style={{ width: W, height: H }} contentFit="contain" transition={300} />
      </Animated.View>
    </View>
  );
};

// ─── Fullscreen image viewer ───────────────────────────────────────────────────
const ImageViewer = ({ images, initialIndex, onClose }: {
  images: string[]; initialIndex: number; onClose: () => void;
}) => {
  const insets = useSafeAreaInsets();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isZoomed, setIsZoomed] = useState(false);
  const bgOpacity = useRef(new Animated.Value(0)).current;
  const outerRef = useRef<ScrollView>(null);

  useEffect(() => {
    Animated.timing(bgOpacity, { toValue: 1, duration: 220, useNativeDriver: true }).start();
    setTimeout(() => outerRef.current?.scrollTo({ x: W * initialIndex, animated: false }), 30);
  }, []);

  const handleClose = () => {
    Animated.timing(bgOpacity, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => onClose());
  };

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={handleClose}>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#000', opacity: bgOpacity }]} />
      <ScrollView
        ref={outerRef}
        horizontal
        pagingEnabled
        scrollEnabled={!isZoomed}
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onMomentumScrollEnd={e => setCurrentIndex(Math.round(e.nativeEvent.contentOffset.x / W))}
        style={{ flex: 1 }}
      >
        {images.map((img, i) => (
          <ZoomableImage key={i} uri={img} onZoomChange={setIsZoomed} />
        ))}
      </ScrollView>
      <View style={[iv.bar, { paddingTop: insets.top + 10 }]} pointerEvents="box-none">
        <TouchableOpacity onPress={handleClose} style={iv.closeBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <X color="#fff" size={20} strokeWidth={2.5} />
        </TouchableOpacity>
        {images.length > 1 && <Text style={iv.counter}>{currentIndex + 1} / {images.length}</Text>}
        <View style={{ width: 44 }} />
      </View>
      {images.length > 1 && (
        <View style={[iv.dots, { paddingBottom: insets.bottom + 24 }]}>
          {images.map((_, i) => (
            <View key={i} style={[iv.dot, {
              backgroundColor: i === currentIndex ? '#fff' : 'rgba(255,255,255,0.3)',
              width: i === currentIndex ? 18 : 5,
            }]} />
          ))}
        </View>
      )}
    </Modal>
  );
};

const iv = StyleSheet.create({
  bar: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 16, zIndex: 10 },
  closeBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.15)' },
  counter: { color: '#fff', fontSize: 14, fontWeight: '600', letterSpacing: 0.3, textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  dots: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 },
  dot: { height: 5, borderRadius: 3 },
});

// ─── Utilities ────────────────────────────────────────────────────────────────
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

function estimateReadTime(text: string, minReadLabel: string): string {
  const words = text.trim().split(/\s+/).length;
  return `${Math.max(1, Math.round(words / 200))} ${minReadLabel}`;
}

// ─── Paragraphs ───────────────────────────────────────────────────────────────
const Paragraphs = ({ text, theme }: { text: string; theme: any; isDark: boolean }) => {
  const raw = text.trim();
  const chunks: string[] = raw.includes('\n\n')
    ? raw.split(/\n{2,}/).map(s => s.replace(/\n/g, ' ').trim()).filter(Boolean)
    : splitIntoParagraphs(raw);

  return (
    <>
      {chunks.map((para, i) => {
        if (i === 0) {
          return (
            <View key={0} style={st.paraFirst}>
              <Text style={[st.dropCapFirst, { color: theme.gold }]}>{para.charAt(0)}</Text>
              <Text style={[st.paraTextFirst, { color: theme.text }]}>{para.slice(1)}</Text>
            </View>
          );
        }
        return (
          <Text key={i} style={[st.paraText, { color: theme.text }]}>{para}</Text>
        );
      })}
    </>
  );
};

// ─── Gallery dots ─────────────────────────────────────────────────────────────
const GalleryDots = ({ total, active, gold }: { total: number; active: number; gold: string }) => {
  if (total <= 1) return null;
  return (
    <View style={st.dotsRow}>
      {Array.from({ length: total }).map((_, i) => (
        <View key={i} style={[st.dot, {
          backgroundColor: i === active ? gold : 'rgba(255,255,255,0.35)',
          width: i === active ? 16 : 5,
        }]} />
      ))}
    </View>
  );
};

// ─── Same year events ─────────────────────────────────────────────────────────
const SameYearEvents = ({ currentEvent, allEvents, year, theme, isDark, language, onPress }: {
  currentEvent: any; allEvents: any[]; year: string; theme: any; isDark: boolean; language: string; onPress: (e: any) => void;
}) => {
  const yearNum = parseInt(year);
  if (!yearNum || isNaN(yearNum)) return null;

  const sameYear = allEvents.filter(e => {
    if (getEventId(e) === getEventId(currentEvent)) return false;
    const eYear = String(e.eventDate ?? e.event_date ?? e.year ?? '').trim();
    const parsed = parseInt(eYear.match(/^(\d{3,4})/)?.[1] ?? '');
    return parsed === yearNum;
  }).slice(0, 5);

  if (sameYear.length === 0) return null;
  const label = SAME_YEAR_LABELS[language] ?? SAME_YEAR_LABELS.en;

  return (
    <View style={sy.wrap}>
      <View style={sy.header}>
        <View style={[sy.line, { backgroundColor: theme.gold + '30' }]} />
        <Text style={[sy.title, { color: theme.gold }]}>{label} {yearNum}</Text>
        <View style={[sy.line, { backgroundColor: theme.gold + '30' }]} />
      </View>
      {sameYear.map(evt => {
        const evtTitle = evt.titleTranslations?.[language] ?? evt.titleTranslations?.en ?? '';
        const evtCat = (evt.category ?? 'HISTORY').replace(/_/g, ' ');
        const evtImg = evt.gallery?.[0];
        return (
          <TouchableOpacity key={getEventId(evt)} onPress={() => onPress(evt)} activeOpacity={0.7}
            style={[sy.card, { backgroundColor: isDark ? '#141210' : '#FAFAF8', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)' }]}>
            {evtImg && <Image source={{ uri: evtImg }} style={sy.thumb} contentFit="cover" transition={300} />}
            <View style={sy.cardBody}>
              <Text style={[sy.cardCat, { color: theme.gold }]}>{evtCat.toUpperCase()}</Text>
              <Text style={[sy.cardTitle, { color: theme.text }]} numberOfLines={2}>{evtTitle}</Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const sy = StyleSheet.create({
  wrap: { marginTop: 8, marginBottom: 24 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  line: { flex: 1, height: 1 },
  title: { fontSize: 11, fontWeight: '800', letterSpacing: 1.5 },
  card: { flexDirection: 'row', borderRadius: 14, borderWidth: 1, overflow: 'hidden', marginBottom: 8 },
  thumb: { width: 72, height: 72 },
  cardBody: { flex: 1, padding: 12, justifyContent: 'center', gap: 4 },
  cardCat: { fontSize: 8, fontWeight: '800', letterSpacing: 1.5 },
  cardTitle: { fontSize: 13, fontWeight: '700', lineHeight: 18 },
});

// ═════════════════════════════════════════════════════════════════════════════
// STORY MODAL
// ═════════════════════════════════════════════════════════════════════════════
export const StoryModal = ({ visible, event, onClose, theme, allEvents: allEventsProp, prevEvent, nextEvent, onNavigate, swipeable = false }: StoryModalProps) => {
  const { language, t } = useLanguage();
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const contextEvents = useAllEvents();
  const allEvents = (allEventsProp && allEventsProp.length > 0) ? allEventsProp : contextEvents;

  const [eventStack, setEventStack] = useState<any[]>([]);
  const currentEvent = eventStack.length > 0 ? eventStack[eventStack.length - 1] : event;

  const [galleryIndex, setGalleryIndex] = useState(0);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerStartIndex, setViewerStartIndex] = useState(0);
  const [contentH, setContentH] = useState(H * 2);
  const [sharePickerVisible, setSharePickerVisible] = useState(false);

  const scrollY = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef<any>(null);
  const { saveEvent, removeEvent, isSaved } = useSavedStore();
  const markEventRead = useGamificationStore(s => s.markEventRead);
  const eventId = currentEvent ? getEventId(currentEvent) : null;
  const { images: gallery } = useEventImages(currentEvent ?? {});

  // ── Resume reading: per-event scroll position persisted to AsyncStorage ────────
  const lastScrollYRef = useRef(0);                       // most recent observed scrollY
  const savePosTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingResumeRef = useRef<number | null>(null);   // saved pos to restore once content is laid out
  const resumedThisEventRef = useRef(false);              // restored already? avoid loops
  const resumeToastOpacity = useRef(new Animated.Value(0)).current;

  const persistReadPos = (eid: string | null, y: number) => {
    if (!eid) return;
    if (y > READ_POS_MIN) AsyncStorage.setItem(readPosKey(eid), String(Math.round(y))).catch(() => {});
    else AsyncStorage.removeItem(readPosKey(eid)).catch(() => {});
  };

  const showResumeToast = () => {
    Animated.sequence([
      Animated.timing(resumeToastOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.delay(2200),
      Animated.timing(resumeToastOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
  };

  const resetScroll = () => {
    scrollY.setValue(0);
    setGalleryIndex(0);
    // NOTE: deliberately not touching lastScrollYRef here — the [eventId] useEffect
    // resets it after React commits the new event, so explicit saves above don't
    // capture a stale 0 for the just-departed event.
    requestAnimationFrame(() => scrollViewRef.current?.scrollTo?.({ y: 0, animated: false }));
  };

  const pushRelated = (evt: any) => {
    if (!evt) return;
    // save scroll position of the event we're leaving
    persistReadPos(eventId, lastScrollYRef.current);
    stop();
    setEventStack(prev => [...prev, evt]);
    resetScroll();
  };

  const handleClose = () => {
    persistReadPos(eventId, lastScrollYRef.current);
    if (eventStack.length > 0) { setEventStack(prev => prev.slice(0, -1)); resetScroll(); }
    else onClose();
  };

  const handleNavigate = (evt: any | null | undefined) => {
    if (!evt || !onNavigate) return;
    persistReadPos(eventId, lastScrollYRef.current);
    stop();
    resetScroll();
    onNavigate(evt);
  };

  const { speak, stop, isPlaying } = useTTS();

  useEffect(() => {
    if (visible && eventId && currentEvent)
      markEventRead(eventId, currentEvent.category ?? 'history', String(currentEvent.eventDate ?? currentEvent.event_date ?? currentEvent.year ?? '').trim());
  }, [visible, eventId]);

  // When the visible event changes (open / external nav / push related),
  // reset state, then look up a saved reading position to restore once content lays out.
  useEffect(() => {
    if (visible) { setGalleryIndex(0); setEventStack([]); }
    if (!visible) stop();
    resumedThisEventRef.current = false;
    pendingResumeRef.current = null;
    if (visible && eventId) {
      AsyncStorage.getItem(readPosKey(eventId)).then(raw => {
        const pos = raw ? parseInt(raw, 10) || 0 : 0;
        if (pos > READ_POS_MIN) pendingResumeRef.current = pos;
      }).catch(() => {});
    }
  }, [visible, event]);

  // When the currently-displayed event changes (push related / pop / external nav),
  // reset scroll tracking, fetch saved position, and schedule a fallback restore
  // in case onContentSizeChange doesn't fire (e.g. similar content height).
  useEffect(() => {
    if (!eventId) return;
    lastScrollYRef.current = 0;
    resumedThisEventRef.current = false;
    pendingResumeRef.current = null;
    AsyncStorage.getItem(readPosKey(eventId)).then(raw => {
      const pos = raw ? parseInt(raw, 10) || 0 : 0;
      if (pos > READ_POS_MIN) pendingResumeRef.current = pos;
    }).catch(() => {});

    const fallback = setTimeout(() => {
      const pending = pendingResumeRef.current;
      if (!resumedThisEventRef.current && pending) {
        resumedThisEventRef.current = true;
        pendingResumeRef.current = null;
        scrollViewRef.current?.scrollTo?.({ y: pending, animated: true });
        showResumeToast();
      }
    }, 900);
    return () => clearTimeout(fallback);
  }, [eventId]);

  if (!currentEvent) return null;

  const saved = isSaved(eventId!);
  const toggleSave = () => saved ? removeEvent(eventId!) : saveEvent(currentEvent);

  const year = String(currentEvent.eventDate ?? currentEvent.event_date ?? currentEvent.year ?? '').trim();
  const title = currentEvent.titleTranslations?.[language] ?? currentEvent.titleTranslations?.en ?? '';
  const narrative = currentEvent.narrativeTranslations?.[language] ?? currentEvent.narrativeTranslations?.en ?? '';
  const category = (currentEvent.category ?? 'HISTORY').replace(/_/g, ' ').toUpperCase();
  const sourceUrl = currentEvent.source_url ?? currentEvent.sourceUrl ?? null;
  const readTime = estimateReadTime(narrative || '', t('min_read'));
  const ttsLabel = TTS_LABELS[language] ?? TTS_LABELS.en;

  const headerBg = scrollY.interpolate({ inputRange: [HERO_H - 80, HERO_H], outputRange: ['rgba(0,0,0,0)', theme.background], extrapolate: 'clamp' });
  const titleOpacity = scrollY.interpolate({ inputRange: [HERO_H - 40, HERO_H + 10], outputRange: [0, 1], extrapolate: 'clamp' });
  const heroParallax = scrollY.interpolate({ inputRange: [-100, 0, HERO_H], outputRange: [0, 0, HERO_H * 0.35], extrapolate: 'clamp' });
  const progressWidth = scrollY.interpolate({ inputRange: [0, Math.max(1, contentH - H)], outputRange: [0, W], extrapolate: 'clamp' });

  const handleTTS = () => speak(`${title}. ${narrative}`, language);

  // ── Optional horizontal swipe nav (only when `swipeable` AND `onNavigate`) ────
  // Refs keep PanResponder's closure pointing at the latest props/handlers without
  // recreating the PanResponder on every render.
  const onNavigateRef = useRef(onNavigate);
  const prevEventRef = useRef(prevEvent);
  const nextEventRef = useRef(nextEvent);
  const handleNavigateRef = useRef<(evt: any) => void>(() => {});
  useEffect(() => { onNavigateRef.current = onNavigate; }, [onNavigate]);
  useEffect(() => { prevEventRef.current = prevEvent; }, [prevEvent]);
  useEffect(() => { nextEventRef.current = nextEvent; }, [nextEvent]);
  useEffect(() => { handleNavigateRef.current = handleNavigate; });

  const swipeX = useRef(new Animated.Value(0)).current;
  const swipePan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, g) =>
        !!onNavigateRef.current && Math.abs(g.dx) > 14 && Math.abs(g.dx) > Math.abs(g.dy) * 2,
      onPanResponderMove: (_, g) => {
        const hasTarget = g.dx > 0 ? !!prevEventRef.current : !!nextEventRef.current;
        swipeX.setValue(hasTarget ? g.dx : g.dx / 3);
      },
      onPanResponderRelease: (_, g) => {
        const thresh = W * 0.22;
        if ((g.dx > thresh || g.vx > 0.7) && prevEventRef.current) {
          Animated.timing(swipeX, { toValue: W, duration: 180, useNativeDriver: true }).start(() => {
            handleNavigateRef.current?.(prevEventRef.current);
            swipeX.setValue(0);
          });
        } else if ((g.dx < -thresh || g.vx < -0.7) && nextEventRef.current) {
          Animated.timing(swipeX, { toValue: -W, duration: 180, useNativeDriver: true }).start(() => {
            handleNavigateRef.current?.(nextEventRef.current);
            swipeX.setValue(0);
          });
        } else {
          Animated.spring(swipeX, { toValue: 0, tension: 200, friction: 18, useNativeDriver: true }).start();
        }
      },
      onPanResponderTerminate: () => {
        Animated.spring(swipeX, { toValue: 0, tension: 200, friction: 18, useNativeDriver: true }).start();
      },
    }),
  ).current;

  return (
    <>
      <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={handleClose} statusBarTranslucent>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
        <Animated.View
          {...(swipeable ? swipePan.panHandlers : {})}
          style={[st.root, { backgroundColor: theme.background }, swipeable && { transform: [{ translateX: swipeX }] }]}
        >

          {/* Reading progress bar */}
          <View style={[st.progressTrack, { top: insets.top }]} pointerEvents="none">
            <Animated.View style={[st.progressFill, { width: progressWidth, backgroundColor: theme.gold }]} />
          </View>

          {/* Floating header — fades in on scroll */}
          <Animated.View style={[st.floatingBar, { paddingTop: insets.top + 8, backgroundColor: headerBg }]} pointerEvents="box-none">
            <TouchableOpacity onPress={handleClose} style={st.headerBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <X color="#fff" size={18} strokeWidth={2.5} />
            </TouchableOpacity>
            <Animated.Text style={[st.floatingTitle, { color: theme.text, opacity: titleOpacity }]} numberOfLines={1}>
              {title}
            </Animated.Text>
            <View style={st.headerRight}>
              <TouchableOpacity onPress={handleTTS} style={[st.headerBtn, isPlaying && st.headerBtnActive]}>
                {isPlaying
                  ? <Pause color="#ffd700" size={15} strokeWidth={2.5} fill="#ffd700" />
                  : <Play color="#fff" size={15} strokeWidth={2.5} />}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setSharePickerVisible(true)} style={st.headerBtn}>
                <Share2 color="#fff" size={16} strokeWidth={2} />
              </TouchableOpacity>
              <TouchableOpacity onPress={toggleSave} style={[st.headerBtn, saved && st.headerBtnActive]}>
                <Bookmark color={saved ? '#ffd700' : '#fff'} fill={saved ? '#ffd700' : 'transparent'} size={16} strokeWidth={2} />
              </TouchableOpacity>
            </View>
          </Animated.View>

          <Animated.ScrollView
            ref={scrollViewRef}
            bounces
            showsVerticalScrollIndicator={false}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { y: scrollY } } }],
              {
                useNativeDriver: false,
                listener: (e: any) => {
                  const y = e.nativeEvent.contentOffset.y;
                  lastScrollYRef.current = y;
                  if (savePosTimer.current) clearTimeout(savePosTimer.current);
                  savePosTimer.current = setTimeout(() => persistReadPos(eventId, y), 800);
                },
              },
            )}
            scrollEventThrottle={16}
            onContentSizeChange={(_, h) => {
              setContentH(h);
              // Restore saved reading position once content is tall enough to scroll to it
              const pending = pendingResumeRef.current;
              if (!resumedThisEventRef.current && pending && pending > READ_POS_MIN && h > pending + 120) {
                resumedThisEventRef.current = true;
                pendingResumeRef.current = null;
                requestAnimationFrame(() => {
                  scrollViewRef.current?.scrollTo?.({ y: pending, animated: true });
                  showResumeToast();
                });
              }
            }}
            contentContainerStyle={{ paddingBottom: insets.bottom + 48 }}
          >
            {/* ── Hero ── */}
            <View style={st.heroWrap}>
              <Animated.View style={{ height: HERO_H + 40, marginTop: -40, transform: [{ translateY: heroParallax }] }}>
                {gallery.length > 0 ? (
                  <ScrollView
                    horizontal pagingEnabled showsHorizontalScrollIndicator={false}
                    onMomentumScrollEnd={e => setGalleryIndex(Math.round(e.nativeEvent.contentOffset.x / W))}
                  >
                    {gallery.map((img, i) => (
                      <TouchableOpacity key={i} activeOpacity={0.95}
                        onPress={() => { setViewerStartIndex(i); setViewerVisible(true); }}
                        style={{ width: W, height: HERO_H + 40 }}
                      >
                        <Image source={{ uri: img }} style={{ width: W, height: HERO_H + 40 }} contentFit="cover" transition={400} />
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                ) : (
                  <View style={{ width: W, height: HERO_H + 40, backgroundColor: isDark ? '#0d0d0f' : '#E8E8EC' }} />
                )}
              </Animated.View>
              <LinearGradient
                colors={['rgba(0,0,0,0.0)', 'transparent', 'rgba(0,0,0,0.38)', 'rgba(0,0,0,0.94)']}
                locations={[0, 0.22, 0.62, 1]}
                style={StyleSheet.absoluteFill}
                pointerEvents="none"
              />
              <View style={[st.heroOverlay, { paddingBottom: 30 }]}>
                <View style={st.heroBadgeRow}>
                  <View style={st.catBadge}>
                    <Text style={st.catText}>{category}</Text>
                  </View>
                  {saved && (
                    <View style={st.savedBadge}>
                      <Bookmark size={9} color="#ffd700" fill="#ffd700" />
                      <Text style={st.savedText}>{t('saved_badge')}</Text>
                    </View>
                  )}
                </View>
                {year !== '' && <Text style={st.heroYear}>{year}</Text>}
                <Text style={st.heroTitle} numberOfLines={4}>{title}</Text>
                <GalleryDots total={gallery.length} active={galleryIndex} gold="#ffd700" />
              </View>
            </View>

            {/* ── Body ── */}
            <View style={[st.body, { backgroundColor: theme.background }]}>

              {/* Meta strip: category · year · read time + TTS */}
              <View style={st.metaStrip}>
                <View style={[st.metaCatPill, { backgroundColor: theme.gold + '14', borderColor: theme.gold + '28' }]}>
                  <Text style={[st.metaCatText, { color: theme.gold }]}>{category}</Text>
                </View>
                {year !== '' && (
                  <>
                    <View style={[st.metaDot, { backgroundColor: theme.subtext }]} />
                    <Text style={[st.metaInfo, { color: theme.subtext }]}>{year}</Text>
                  </>
                )}
                <View style={[st.metaDot, { backgroundColor: theme.subtext }]} />
                <Text style={[st.metaInfo, { color: theme.subtext }]}>{readTime}</Text>
                <View style={{ flex: 1 }} />
                <TouchableOpacity onPress={handleTTS} activeOpacity={0.7}
                  style={[st.ttsBtn, {
                    borderColor: isPlaying ? theme.gold + '50' : theme.gold + '25',
                    backgroundColor: isPlaying ? theme.gold + '16' : theme.gold + '09',
                  }]}>
                  {isPlaying
                    ? <Pause size={11} color={theme.gold} strokeWidth={2.5} fill={theme.gold} />
                    : <Play size={11} color={theme.gold} strokeWidth={2.5} />}
                  <Text style={[st.ttsBtnText, { color: theme.gold }]}>
                    {isPlaying ? ttsLabel.listening : ttsLabel.listen}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Thin gold accent separator */}
              <View style={[st.accentLine, { backgroundColor: theme.gold + '35' }]} />

              {/* Narrative text */}
              <Paragraphs text={narrative || t('no_story_available')} theme={theme} isDark={isDark} />

              {/* Quiz */}
              <QuizSection eventId={eventId} language={language} theme={theme} isDark={isDark} />

              {/* Same year events */}
              <SameYearEvents
                currentEvent={currentEvent} allEvents={allEvents} year={year}
                theme={theme} isDark={isDark} language={language} onPress={pushRelated}
              />

              {/* Wikipedia CTA */}
              {sourceUrl && (
                <TouchableOpacity
                  onPress={() => Linking.openURL(sourceUrl).catch(() => {})}
                  activeOpacity={0.75}
                  style={[st.wikiCard, {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                    borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)',
                  }]}
                >
                  <View style={[st.wikiIconBox, { backgroundColor: theme.gold + '18' }]}>
                    <BookOpen size={17} color={theme.gold} strokeWidth={2} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[st.wikiLabel, { color: theme.subtext }]}>{t('want_to_read_more')}</Text>
                    <Text style={[st.wikiTitle, { color: theme.text }]}>{t('continue_wikipedia')}</Text>
                  </View>
                  <Text style={{ color: theme.gold, fontSize: 18, fontWeight: '300' }}>→</Text>
                </TouchableOpacity>
              )}

              {/* Related events */}
              {allEvents.length > 0 && (
                <RelatedEvents currentEvent={currentEvent} allEvents={allEvents} theme={theme} isDark={isDark} onEventPress={pushRelated} />
              )}

              {/* Save to library */}
              <TouchableOpacity
                onPress={toggleSave}
                activeOpacity={0.8}
                style={[st.saveBtn, {
                  backgroundColor: saved ? 'rgba(255,215,0,0.1)' : isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                  borderColor: saved ? 'rgba(255,215,0,0.45)' : isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.09)',
                }]}
              >
                <Bookmark
                  size={16}
                  color={saved ? '#ffd700' : theme.subtext}
                  fill={saved ? '#ffd700' : 'transparent'}
                  strokeWidth={2}
                />
                <Text style={[st.saveBtnText, { color: saved ? '#ffd700' : theme.subtext }]}>
                  {saved ? t('saved_to_library') : t('save_to_library')}
                </Text>
              </TouchableOpacity>

              <Text style={[st.watermark, { color: theme.subtext }]}>Daily History</Text>
            </View>
          </Animated.ScrollView>

          {/* Sibling nav arrows — only when not using swipe */}
          {!swipeable && onNavigate && prevEvent && (
            <TouchableOpacity
              onPress={() => handleNavigate(prevEvent)}
              activeOpacity={0.8}
              hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
              style={[st.navArrow, { left: 10 }]}
            >
              <ChevronLeft color="#fff" size={22} strokeWidth={2.6} />
            </TouchableOpacity>
          )}
          {!swipeable && onNavigate && nextEvent && (
            <TouchableOpacity
              onPress={() => handleNavigate(nextEvent)}
              activeOpacity={0.8}
              hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
              style={[st.navArrow, { right: 10 }]}
            >
              <ChevronRight color="#fff" size={22} strokeWidth={2.6} />
            </TouchableOpacity>
          )}

          {/* Resume-reading toast — fades in/out after restoring saved scroll */}
          <Animated.View
            pointerEvents="none"
            style={[st.resumeToast, { opacity: resumeToastOpacity, bottom: insets.bottom + 24 }]}
          >
            <BookOpen color="#fff" size={14} strokeWidth={2.4} />
            <Text style={st.resumeToastText}>{RESUME_LABELS[language] ?? RESUME_LABELS.en}</Text>
          </Animated.View>
        </Animated.View>
      </Modal>

      {viewerVisible && gallery.length > 0 && (
        <ImageViewer images={gallery} initialIndex={viewerStartIndex} onClose={() => setViewerVisible(false)} />
      )}
      <SharePickerModal
        visible={sharePickerVisible}
        event={currentEvent}
        language={language}
        gallery={gallery}
        onClose={() => setSharePickerVisible(false)}
      />
    </>
  );
};

const st = StyleSheet.create({
  root: { flex: 1 },

  progressTrack: { position: 'absolute', left: 0, right: 0, height: 2, zIndex: 200 },
  progressFill: { height: 2, borderRadius: 1 },

  floatingBar: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100,
    paddingHorizontal: 16, paddingBottom: 12,
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  floatingTitle: { flex: 1, fontSize: 13, fontWeight: '600', letterSpacing: 0.1, textAlign: 'center' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.13)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.16)',
  },
  headerBtnActive: { backgroundColor: 'rgba(255,215,0,0.2)', borderColor: 'rgba(255,215,0,0.4)' },

  heroWrap: { height: HERO_H, overflow: 'hidden' },
  heroOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 24 },
  heroBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  catBadge: {
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20,
    backgroundColor: 'rgba(255,215,0,0.16)',
    borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,215,0,0.45)',
  },
  catText: { color: '#ffd700', fontSize: 9, fontWeight: '800', letterSpacing: 2.5 },
  savedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,215,0,0.18)',
    paddingHorizontal: 9, paddingVertical: 5, borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,215,0,0.4)',
  },
  savedText: { color: '#ffd700', fontSize: 8, fontWeight: '800', letterSpacing: 1.5 },
  heroYear: { color: 'rgba(255,255,255,0.45)', fontSize: 12, fontWeight: '700', letterSpacing: 3.5, marginBottom: 8 },
  heroTitle: {
    color: '#fff', fontSize: 28, fontWeight: '800', lineHeight: 34,
    letterSpacing: -0.5, marginBottom: 16,
    textShadowColor: 'rgba(0,0,0,0.6)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 10,
  },
  dotsRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 4 },
  dot: { height: 5, borderRadius: 3 },

  body: { marginTop: -28, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 32, paddingHorizontal: 24 },

  metaStrip: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, gap: 8, flexWrap: 'wrap' },
  metaCatPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderWidth: StyleSheet.hairlineWidth },
  metaCatText: { fontSize: 9, fontWeight: '800', letterSpacing: 1.8 },
  metaDot: { width: 3, height: 3, borderRadius: 1.5, opacity: 0.4 },
  metaInfo: { fontSize: 11, fontWeight: '600', letterSpacing: 0.4, opacity: 0.7 },
  ttsBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, borderWidth: 1 },
  ttsBtnText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },

  accentLine: { height: 1, marginBottom: 30 },

  paraFirst: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 20 },
  dropCapFirst: { fontSize: 56, lineHeight: 52, fontFamily: SERIF, fontWeight: '700', marginRight: 7, marginTop: 3 },
  paraTextFirst: { flex: 1, fontSize: 17, lineHeight: 30, fontFamily: SERIF, fontWeight: '400', letterSpacing: 0.2 },
  paraText: { fontSize: 17, lineHeight: 30, fontFamily: SERIF, letterSpacing: 0.2, marginBottom: 20 },

  wikiCard: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    paddingHorizontal: 18, paddingVertical: 18,
    borderRadius: 18, borderWidth: 1,
    marginTop: 8, marginBottom: 24,
  },
  wikiIconBox: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  wikiLabel: { fontSize: 8, fontWeight: '700', letterSpacing: 2, marginBottom: 4 },
  wikiTitle: { fontSize: 14, fontWeight: '700', letterSpacing: 0.1 },

  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    paddingVertical: 16, borderRadius: 16, borderWidth: 1,
    marginBottom: 20, marginTop: 8,
  },
  saveBtnText: { fontSize: 13, fontWeight: '700', letterSpacing: 0.4 },

  watermark: { textAlign: 'center', fontSize: 10, fontWeight: '600', letterSpacing: 3.5, opacity: 0.25, marginBottom: 8 },

  navArrow: {
    position: 'absolute', top: H * 0.5 - 22,
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
    zIndex: 50,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
      android: { elevation: 8 },
    }),
  },

  resumeToast: {
    position: 'absolute', alignSelf: 'center', left: 0, right: 0,
    marginHorizontal: 'auto',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 22,
    backgroundColor: 'rgba(20,17,14,0.92)',
    borderWidth: 1, borderColor: 'rgba(255,215,0,0.4)',
    maxWidth: 320,
    zIndex: 60,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
      android: { elevation: 12 },
    }),
  },
  resumeToastText: { color: '#fff', fontSize: 13, fontWeight: '700', letterSpacing: 0.2 },
});
