// components/StreakIcon.tsx
import { Ionicons } from '@expo/vector-icons';
import { X } from 'lucide-react-native';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { useGamificationStore } from '../store/useGamificationStore';

const { width: W } = Dimensions.get('window');
const SERIF = Platform.OS === 'ios' ? 'Georgia' : 'serif';
const DAILY_GOAL = 5;

// ─── i18n ────────────────────────────────────────────────────────────────────
const L: Record<string, Record<string, string>> = {
  en: {
    title: 'Your Progress', dayStreak: 'day streak', daysStreak: 'days streak',
    bestStreak: 'Best streak', totalRead: 'Total read', todayProgress: "Today's Goal",
    allDone: 'Goal reached!', storiesLeft: 'stories to go',
    allDoneDesc: "Amazing! You've hit your daily goal. Come back tomorrow!",
    readMoreDesc: 'Read stories to build your daily streak.',
    readToday: 'Recently Read',
    tip: 'Read at least one story every day to keep your streak alive.',
    complete: 'complete', read: 'read',
    keepGoing: 'Start reading today',
    onFire: "You're on fire!",
    showMore: 'Show more',
    showLess: 'Show less',
  },
  ro: {
    title: 'Progresul tău', dayStreak: 'zi consecutivă', daysStreak: 'zile consecutive',
    bestStreak: 'Cel mai lung streak', totalRead: 'Total citite', todayProgress: 'Obiectivul Zilei',
    allDone: 'Obiectiv atins!', storiesLeft: 'povești rămase',
    allDoneDesc: 'Excelent! Ai atins obiectivul zilnic. Revino mâine!',
    readMoreDesc: 'Citește povești pentru a-ți construi streak-ul.',
    readToday: 'Citite Recent',
    tip: 'Citește cel puțin o poveste în fiecare zi pentru a-ți menține streak-ul.',
    complete: 'complet', read: 'citite',
    keepGoing: 'Începe să citești azi',
    onFire: 'Ești pe foc!',
    showMore: 'Mai multe',
    showLess: 'Mai puține',
  },
  fr: {
    title: 'Votre progression', dayStreak: 'jour consécutif', daysStreak: 'jours consécutifs',
    bestStreak: 'Meilleure série', totalRead: 'Total lus', todayProgress: "Objectif du Jour",
    allDone: 'Objectif atteint !', storiesLeft: 'histoires restantes',
    allDoneDesc: 'Incroyable ! Vous avez atteint votre objectif. Revenez demain !',
    readMoreDesc: 'Lisez des histoires pour construire votre série.',
    readToday: 'Lus Récemment',
    tip: 'Lisez au moins une histoire chaque jour pour maintenir votre série.',
    complete: 'terminé', read: 'lus',
    keepGoing: 'Commencez à lire',
    onFire: 'Vous êtes en feu !',
    showMore: 'Voir plus',
    showLess: 'Voir moins',
  },
  de: {
    title: 'Dein Fortschritt', dayStreak: 'Tag in Folge', daysStreak: 'Tage in Folge',
    bestStreak: 'Bester Streak', totalRead: 'Gesamt gelesen', todayProgress: 'Tagesziel',
    allDone: 'Ziel erreicht!', storiesLeft: 'Geschichten übrig',
    allDoneDesc: 'Super! Du hast dein Tagesziel erreicht. Komm morgen wieder!',
    readMoreDesc: 'Lies Geschichten um deinen Streak aufzubauen.',
    readToday: 'Kürzlich Gelesen',
    tip: 'Lies jeden Tag mindestens eine Geschichte um deinen Streak zu halten.',
    complete: 'fertig', read: 'gelesen',
    keepGoing: 'Fang an zu lesen',
    onFire: 'Du bist on fire!',
    showMore: 'Mehr anzeigen',
    showLess: 'Weniger',
  },
  es: {
    title: 'Tu progreso', dayStreak: 'día consecutivo', daysStreak: 'días consecutivos',
    bestStreak: 'Mejor racha', totalRead: 'Total leídos', todayProgress: 'Meta del Día',
    allDone: '¡Meta alcanzada!', storiesLeft: 'historias restantes',
    allDoneDesc: '¡Increíble! Alcanzaste tu meta diaria. ¡Vuelve mañana!',
    readMoreDesc: 'Lee historias para construir tu racha diaria.',
    readToday: 'Leídos Recientemente',
    tip: 'Lee al menos una historia cada día para mantener tu racha.',
    complete: 'completo', read: 'leídos',
    keepGoing: 'Empieza a leer hoy',
    onFire: '¡Estás en llamas!',
    showMore: 'Ver más',
    showLess: 'Ver menos',
  },
};
const tx = (lang: string, key: string) => (L[lang] ?? L.en)[key] ?? L.en[key] ?? key;

// ═════════════════════════════════════════════════════════════════════════════
//  REALISTIC FLAME — layered organic shapes with phase-shifted animations
// ═════════════════════════════════════════════════════════════════════════════

interface FlameLayerProps {
  size: number;
  widthRatio: number;
  heightRatio: number;
  color: string;
  bottom: number;
  swayAmp: number;
  swayDur: number;
  scaleDur: number;
  scaleRange: [number, number];
  opacityRange: [number, number];
  delay: number;
}

const FlameLayer = React.memo(({ cfg }: { cfg: FlameLayerProps }) => {
  const sway = useRef(new Animated.Value(0)).current;
  const scaleY = useRef(new Animated.Value(cfg.scaleRange[0])).current;
  const opacity = useRef(new Animated.Value(cfg.opacityRange[1])).current;

  useEffect(() => {
    const d = cfg.delay;
    setTimeout(() => {
      Animated.loop(Animated.sequence([
        Animated.timing(sway, { toValue: cfg.swayAmp, duration: cfg.swayDur, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(sway, { toValue: -cfg.swayAmp, duration: cfg.swayDur * 1.1, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])).start();
      Animated.loop(Animated.sequence([
        Animated.timing(scaleY, { toValue: cfg.scaleRange[1], duration: cfg.scaleDur, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(scaleY, { toValue: cfg.scaleRange[0], duration: cfg.scaleDur * 0.9, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])).start();
      Animated.loop(Animated.sequence([
        Animated.timing(opacity, { toValue: cfg.opacityRange[0], duration: cfg.scaleDur * 0.7, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(opacity, { toValue: cfg.opacityRange[1], duration: cfg.scaleDur * 0.8, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])).start();
    }, d);
  }, []);

  const w = cfg.size * cfg.widthRatio;
  const h = cfg.size * cfg.heightRatio;

  return (
    <Animated.View style={{
      position: 'absolute',
      bottom: cfg.bottom,
      left: (cfg.size - w) / 2,
      width: w,
      height: h,
      borderTopLeftRadius: w * 0.45,
      borderTopRightRadius: w * 0.45,
      borderBottomLeftRadius: w * 0.35,
      borderBottomRightRadius: w * 0.35,
      backgroundColor: cfg.color,
      opacity,
      transform: [
        { translateX: sway },
        { scaleY },
      ],
    }} />
  );
});

// Spark particle
const Spark = React.memo(({ size, delay, x, color }: { size: number; delay: number; x: number; color: string }) => {
  const progress = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.delay(delay),
      Animated.timing(progress, { toValue: 1, duration: 600 + Math.random() * 400, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(progress, { toValue: 0, duration: 0, useNativeDriver: true }),
    ])).start();
  }, []);

  const ty = progress.interpolate({ inputRange: [0, 1], outputRange: [0, -(size * 0.5 + Math.random() * size * 0.3)] });
  const op = progress.interpolate({ inputRange: [0, 0.1, 0.6, 1], outputRange: [0, 1, 0.5, 0] });
  const sc = progress.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0.3, 1, 0] });

  return (
    <Animated.View style={{
      position: 'absolute', bottom: size * 0.35, left: size / 2 + x,
      width: 3, height: 3, borderRadius: 1.5,
      backgroundColor: color, opacity: op,
      transform: [{ translateY: ty }, { scale: sc }],
    }} />
  );
});

const RealisticFire = ({ size = 140, active = true }: { size?: number; active?: boolean }) => {
  const layers = useMemo<FlameLayerProps[]>(() => {
    if (!active) return [];
    return [
      // Outer glow
      { size, widthRatio: 0.7, heightRatio: 0.55, color: '#4A1508', bottom: size * 0.08, swayAmp: 4, swayDur: 2800, scaleDur: 2400, scaleRange: [0.9, 1.1], opacityRange: [0.2, 0.45], delay: 0 },
      // Deep red base
      { size, widthRatio: 0.55, heightRatio: 0.65, color: '#8B1A1A', bottom: size * 0.06, swayAmp: 5, swayDur: 2200, scaleDur: 2000, scaleRange: [0.88, 1.14], opacityRange: [0.5, 0.85], delay: 50 },
      // Orange body
      { size, widthRatio: 0.45, heightRatio: 0.6, color: '#D84315', bottom: size * 0.08, swayAmp: 6, swayDur: 1800, scaleDur: 1700, scaleRange: [0.85, 1.18], opacityRange: [0.6, 0.9], delay: 100 },
      // Bright orange
      { size, widthRatio: 0.38, heightRatio: 0.55, color: '#EF6C00', bottom: size * 0.1, swayAmp: 5, swayDur: 1500, scaleDur: 1400, scaleRange: [0.84, 1.2], opacityRange: [0.65, 0.92], delay: 130 },
      // Yellow-orange
      { size, widthRatio: 0.3, heightRatio: 0.48, color: '#FF8F00', bottom: size * 0.12, swayAmp: 4, swayDur: 1300, scaleDur: 1200, scaleRange: [0.82, 1.22], opacityRange: [0.7, 0.95], delay: 170 },
      // Bright yellow
      { size, widthRatio: 0.22, heightRatio: 0.4, color: '#FFB300', bottom: size * 0.14, swayAmp: 3, swayDur: 1100, scaleDur: 1000, scaleRange: [0.8, 1.25], opacityRange: [0.75, 1], delay: 200 },
      // Hot core
      { size, widthRatio: 0.15, heightRatio: 0.3, color: '#FFD54F', bottom: size * 0.16, swayAmp: 2, swayDur: 900, scaleDur: 800, scaleRange: [0.78, 1.28], opacityRange: [0.6, 1], delay: 230 },
      // White-hot center
      { size, widthRatio: 0.08, heightRatio: 0.18, color: '#FFF8E1', bottom: size * 0.2, swayAmp: 1.5, swayDur: 700, scaleDur: 650, scaleRange: [0.75, 1.3], opacityRange: [0.5, 1], delay: 260 },
    ];
  }, [size, active]);

  const sparks = useMemo(() => {
    if (!active) return [];
    return Array.from({ length: 8 }, (_, i) => ({
      key: i,
      delay: i * 350 + Math.random() * 500,
      x: (Math.random() - 0.5) * size * 0.3,
      color: ['#FFD54F', '#FFCC02', '#FF8F00', '#FFE082', '#FFF8E1', '#FFB300', '#FF6D00', '#FFFFFF'][i],
    }));
  }, [size, active]);

  // Ambient glow
  const ambientPulse = useRef(new Animated.Value(0.15)).current;
  useEffect(() => {
    if (!active) { ambientPulse.setValue(0); return; }
    Animated.loop(Animated.sequence([
      Animated.timing(ambientPulse, { toValue: 0.35, duration: 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(ambientPulse, { toValue: 0.1, duration: 2400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ])).start();
  }, [active]);

  if (!active) {
    return (
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ width: size * 0.2, height: size * 0.15, borderRadius: size * 0.1, backgroundColor: '#3E2723', opacity: 0.3, position: 'absolute', bottom: size * 0.2 }} />
      </View>
    );
  }

  return (
    <View style={{ width: size, height: size, alignItems: 'center' }}>
      {/* Ambient glow */}
      <Animated.View style={{
        position: 'absolute', bottom: size * 0.05, width: size * 0.8, height: size * 0.5,
        borderRadius: size * 0.25, backgroundColor: '#BF360C', opacity: ambientPulse,
      }} />
      {/* Flame layers */}
      {layers.map((l, i) => <FlameLayer key={i} cfg={l} />)}
      {/* Sparks */}
      {sparks.map(s => <Spark key={s.key} size={size} delay={s.delay} x={s.x} color={s.color} />)}
    </View>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
//  SMALL ICON FLAME (header)
// ═════════════════════════════════════════════════════════════════════════════
const SmallFlame = ({ size = 20, active = true }: { size?: number; active?: boolean }) => {
  const sway = useRef(new Animated.Value(0)).current;
  const scaleY = useRef(new Animated.Value(1)).current;
  const glow = useRef(new Animated.Value(0.1)).current;

  useEffect(() => {
    if (!active) return;
    Animated.loop(Animated.sequence([
      Animated.timing(sway, { toValue: 1.5, duration: 500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(sway, { toValue: -1.5, duration: 600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ])).start();
    Animated.loop(Animated.sequence([
      Animated.timing(scaleY, { toValue: 1.12, duration: 450, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(scaleY, { toValue: 0.92, duration: 550, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ])).start();
    Animated.loop(Animated.sequence([
      Animated.timing(glow, { toValue: 0.3, duration: 700, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(glow, { toValue: 0.08, duration: 800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ])).start();
  }, [active]);

  if (!active) {
    return <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'flex-end' }}>
      <View style={{ width: size * 0.4, height: size * 0.55, borderRadius: size * 0.2, backgroundColor: '#5D4037', opacity: 0.3 }} />
    </View>;
  }

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'flex-end' }}>
      <Animated.View style={{ position: 'absolute', bottom: -1, width: size * 0.9, height: size * 0.55, borderRadius: size * 0.28, backgroundColor: '#FF6D00', opacity: glow }} />
      <Animated.View style={{
        width: size * 0.5, height: size * 0.8,
        borderTopLeftRadius: size * 0.25, borderTopRightRadius: size * 0.25,
        borderBottomLeftRadius: size * 0.15, borderBottomRightRadius: size * 0.15,
        backgroundColor: '#E64A19',
        transform: [{ translateX: sway }, { scaleY }],
      }} />
      <Animated.View style={{
        position: 'absolute', bottom: size * 0.05,
        width: size * 0.32, height: size * 0.55,
        borderTopLeftRadius: size * 0.16, borderTopRightRadius: size * 0.16,
        borderBottomLeftRadius: size * 0.1, borderBottomRightRadius: size * 0.1,
        backgroundColor: '#FFA000',
        transform: [{ translateX: Animated.multiply(sway, -0.6) }],
      }} />
      <Animated.View style={{
        position: 'absolute', bottom: size * 0.1,
        width: size * 0.18, height: size * 0.32,
        borderRadius: size * 0.09, backgroundColor: '#FFF8E1', opacity: 0.85,
        transform: [{ scaleY }],
      }} />
    </View>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
//  PROGRESS RING
// ═════════════════════════════════════════════════════════════════════════════
const RNG = 80; const STR = 6; const RAD = (RNG - STR) / 2; const CRC = 2 * Math.PI * RAD;

const ProgressRing = ({ read, total, lang, theme, isDark }: {
  read: number; total: number; lang: string; theme: any; isDark: boolean;
}) => {
  const p = total > 0 ? Math.min(read / total, 1) : 0;
  const done = read >= total && total > 0;

  return (
    <View style={{ width: RNG, height: RNG, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={RNG} height={RNG}>
        <Defs>
          <LinearGradient id="ringG" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={done ? '#34D399' : '#FF8F00'} />
            <Stop offset="1" stopColor={done ? '#10B981' : '#FFD54F'} />
          </LinearGradient>
        </Defs>
        <Circle cx={RNG / 2} cy={RNG / 2} r={RAD} stroke={isDark ? '#2A2218' : '#F0E8Da'} strokeWidth={STR} fill="none" />
        <Circle cx={RNG / 2} cy={RNG / 2} r={RAD} stroke="url(#ringG)" strokeWidth={STR} fill="none"
          strokeDasharray={CRC} strokeDashoffset={CRC * (1 - p)} strokeLinecap="round" rotation="-90" origin={`${RNG / 2}, ${RNG / 2}`} />
      </Svg>
      <View style={{ position: 'absolute', alignItems: 'center' }}>
        <Text style={{ fontSize: 18, fontWeight: '900', letterSpacing: -0.5, color: done ? '#34D399' : theme.text }}>
          {done ? '✓' : `${read}/${total}`}
        </Text>
        <Text style={{ fontSize: 8, fontWeight: '700', marginTop: 2, color: theme.subtext, opacity: 0.45, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          {done ? tx(lang, 'complete') : tx(lang, 'read')}
        </Text>
      </View>
    </View>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
//  STAT CARD (with Ionicons)
// ═════════════════════════════════════════════════════════════════════════════
const StatCardItem = ({ value, label, icon, iconColor, iconBg, isDark, theme }: {
  value: number | string; label: string; icon: keyof typeof Ionicons.glyphMap;
  iconColor: string; iconBg: string; isDark: boolean; theme: any;
}) => (
  <View style={[sc.card, { backgroundColor: isDark ? '#1C1612' : '#FFFCF7', borderColor: isDark ? '#2E2518' : '#F0E8DA' }]}>
    <View style={[sc.iconWrap, { backgroundColor: iconBg }]}>
      <Ionicons name={icon} size={16} color={iconColor} />
    </View>
    <Text style={[sc.value, { color: theme.text }]}>{value}</Text>
    <Text style={[sc.label, { color: theme.subtext }]}>{label}</Text>
  </View>
);
const sc = StyleSheet.create({
  card: { flex: 1, alignItems: 'center', padding: 16, gap: 6, borderRadius: 16, borderWidth: 1 },
  iconWrap: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  value: { fontSize: 24, fontWeight: '900', letterSpacing: -1.5 },
  label: { fontSize: 9, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', opacity: 0.4, textAlign: 'center' },
});

// ═════════════════════════════════════════════════════════════════════════════
//  HELPER — clean event display name
// ═════════════════════════════════════════════════════════════════════════════
const cleanEventName = (eid: string): { name: string; date: string } => {
  // Event IDs are typically "YYYY-MM-DD_Title_With_Underscores" or just titles
  const parts = eid.split('_');
  const dateMatch = eid.match(/^(\d{4}-\d{2}-\d{2})/);
  if (dateMatch) {
    const date = dateMatch[1];
    const name = parts.slice(1).join(' ').replace(/-/g, ' ').trim();
    return { name: name || eid.replace(/_/g, ' '), date };
  }
  return { name: eid.replace(/_/g, ' ').replace(/-/g, ' '), date: '' };
};

// ═════════════════════════════════════════════════════════════════════════════
//  STREAK MODAL
// ═════════════════════════════════════════════════════════════════════════════
const StreakModal = ({ visible, onClose }: { visible: boolean; onClose: () => void }) => {
  const { theme, isDark } = useTheme();
  const { language } = useLanguage();
  const insets = useSafeAreaInsets();
  const { getStreakStatus, getTodayProgress, totalEventsRead, readEventsToday } = useGamificationStore();
  const { streak, longest } = getStreakStatus();
  const { read: rawRead } = getTodayProgress();

  const read = Math.min(rawRead, DAILY_GOAL);
  const total = DAILY_GOAL;

  const [showAllEvents, setShowAllEvents] = useState(false);
  const visibleEvents = showAllEvents ? readEventsToday : readEventsToday.slice(0, 5);

  const bg = isDark ? '#0D0A07' : '#FBF7F0';
  const cardBg = isDark ? '#161210' : '#FFFFFF';
  const cardBrd = isDark ? '#251E16' : '#EDE5D8';
  const gold = isDark ? '#E8B84D' : '#C77E08';

  useEffect(() => { if (visible) setShowAllEvents(false); }, [visible]);

  return (
    <Modal visible={visible} animationType="slide" transparent={false} statusBarTranslucent>
      <View style={[ms.root, { backgroundColor: bg, paddingTop: insets.top }]}>
        {/* HEADER */}
        <View style={ms.hdr}>
          <View style={{ width: 40 }} />
          <View style={{ alignItems: 'center' }}>
            <Text style={[ms.hdrT, { color: theme.text }]}>{tx(language, 'title')}</Text>
            <Text style={{ fontSize: 10, fontWeight: '700', color: gold, letterSpacing: 1.5, marginTop: 2, textTransform: 'uppercase' }}>
              {streak > 0 ? tx(language, 'onFire') : tx(language, 'keepGoing')}
            </Text>
          </View>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
            style={[ms.xBtn, { backgroundColor: isDark ? '#1C1612' : '#F5EFE5', borderColor: cardBrd }]}>
            <X size={16} color={theme.subtext} strokeWidth={2.5} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={[ms.scroll, { paddingBottom: insets.bottom + 50 }]} showsVerticalScrollIndicator={false}>
          {/* HERO */}
          <View style={[ms.hero, { backgroundColor: cardBg, borderColor: cardBrd }]}>
            <View style={[ms.fireBg, { backgroundColor: isDark ? '#0A0604' : '#1A0E02' }]}>
              <RealisticFire size={160} active={streak > 0} />
            </View>
            <View style={ms.heroInfo}>
              <Text style={[ms.heroNum, { color: theme.text, fontFamily: SERIF }]}>{streak}</Text>
              <Text style={[ms.heroLabel, { color: gold }]}>
                {streak === 1 ? tx(language, 'dayStreak') : tx(language, 'daysStreak')}
              </Text>
            </View>
          </View>

          {/* STATS */}
          <View style={ms.statsRow}>
            <StatCardItem
              value={longest} label={tx(language, 'bestStreak')}
              icon="trophy-outline" iconColor="#FFB300" iconBg={'#FFB30012'}
              isDark={isDark} theme={theme}
            />
            <StatCardItem
              value={totalEventsRead} label={tx(language, 'totalRead')}
              icon="book-outline" iconColor="#5856D6" iconBg={'#5856D612'}
              isDark={isDark} theme={theme}
            />
          </View>

          {/* TODAY'S GOAL */}
          <Text style={[ms.sec, { color: gold }]}>{tx(language, 'todayProgress').toUpperCase()}</Text>
          <View style={[ms.todayC, { backgroundColor: cardBg, borderColor: cardBrd }]}>
            <View style={ms.todayR}>
              <ProgressRing read={read} total={total} lang={language} theme={theme} isDark={isDark} />
              <View style={{ flex: 1, gap: 6 }}>
                <Text style={[ms.todayT, { color: theme.text }]}>
                  {read >= total ? tx(language, 'allDone') : `${total - read} ${tx(language, 'storiesLeft')}`}
                </Text>
                <Text style={[ms.todayD, { color: theme.subtext }]}>
                  {read >= total ? tx(language, 'allDoneDesc') : tx(language, 'readMoreDesc')}
                </Text>
              </View>
            </View>
            {/* Dot progress */}
            <View style={ms.dots}>
              {Array.from({ length: total }).map((_, i) => (
                <View key={i} style={[ms.dot, {
                  backgroundColor: i < read ? (isDark ? '#FFB300' : '#F59E0B') : (isDark ? '#1C1612' : '#F0E8DA'),
                  flex: 1, height: 6, borderRadius: 3,
                }]} />
              ))}
            </View>
          </View>

          {/* RECENTLY READ */}
          {readEventsToday.length > 0 && (
            <>
              <Text style={[ms.sec, { color: gold }]}>{tx(language, 'readToday').toUpperCase()} ({readEventsToday.length})</Text>
              <View style={[ms.listC, { backgroundColor: cardBg, borderColor: cardBrd }]}>
                {visibleEvents.map((eid, i) => {
                  const { name, date } = cleanEventName(eid);
                  return (
                    <View key={eid}>
                      <TouchableOpacity activeOpacity={0.6} style={ms.listI}>
                        <View style={[ms.listChk, { backgroundColor: '#FF8F0015' }]}>
                          <Ionicons name="checkmark" size={13} color="#FF8F00" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[ms.listTx, { color: theme.text }]} numberOfLines={2}>{name}</Text>
                          {date !== '' && <Text style={[ms.listDate, { color: theme.subtext }]}>{date}</Text>}
                        </View>
                        <Ionicons name="chevron-forward" size={14} color={theme.border} />
                      </TouchableOpacity>
                      {i < visibleEvents.length - 1 && <View style={[ms.listD, { backgroundColor: cardBrd }]} />}
                    </View>
                  );
                })}
                {readEventsToday.length > 5 && (
                  <TouchableOpacity
                    onPress={() => setShowAllEvents(v => !v)}
                    activeOpacity={0.6}
                    style={[ms.showMoreBtn, { borderColor: cardBrd }]}
                  >
                    <Ionicons name={showAllEvents ? 'chevron-up' : 'chevron-down'} size={14} color={gold} />
                    <Text style={[ms.showMoreText, { color: gold }]}>
                      {showAllEvents ? tx(language, 'showLess') : `${tx(language, 'showMore')} (${readEventsToday.length - 5})`}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </>
          )}

          {/* TIP */}
          <View style={[ms.tipC, { backgroundColor: isDark ? '#1A140E' : '#FFFAF2', borderColor: isDark ? '#2E2518' : '#F0E0C8' }]}>
            <View style={[ms.tipIcon, { backgroundColor: '#FF8F0012' }]}>
              <Ionicons name="bulb-outline" size={16} color="#FF8F00" />
            </View>
            <Text style={[ms.tipT, { color: theme.subtext }]}>{tx(language, 'tip')}</Text>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

const ms = StyleSheet.create({
  root: { flex: 1 },
  hdr: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16 },
  hdrT: { fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  xBtn: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  scroll: { paddingHorizontal: 20, paddingTop: 4 },
  hero: { borderRadius: 28, borderWidth: 1, overflow: 'hidden', marginBottom: 16 },
  fireBg: { width: '100%', height: 200, alignItems: 'center', justifyContent: 'center', borderRadius: 27 },
  heroInfo: { alignItems: 'center', paddingVertical: 14 },
  heroNum: { fontSize: 56, fontWeight: '900', letterSpacing: -3 },
  heroLabel: { fontSize: 13, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase', marginTop: -2 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 28 },
  sec: { fontSize: 10, fontWeight: '900', letterSpacing: 2, marginBottom: 12, marginLeft: 4 },
  todayC: { borderRadius: 22, borderWidth: 1, padding: 20, marginBottom: 28 },
  todayR: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  todayT: { fontSize: 17, fontWeight: '800', letterSpacing: -0.3 },
  todayD: { fontSize: 12.5, lineHeight: 18, opacity: 0.5 },
  dots: { flexDirection: 'row', gap: 5, marginTop: 18 },
  dot: { minWidth: 8 },
  listC: { borderRadius: 20, borderWidth: 1, overflow: 'hidden', marginBottom: 28 },
  listI: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13, gap: 12 },
  listChk: { width: 28, height: 28, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  listTx: { fontSize: 13, fontWeight: '600', letterSpacing: 0.05 },
  listDate: { fontSize: 10.5, fontWeight: '400', opacity: 0.4, marginTop: 2 },
  listD: { height: StyleSheet.hairlineWidth, marginLeft: 56 },
  showMoreBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth },
  showMoreText: { fontSize: 12.5, fontWeight: '700', letterSpacing: 0.2 },
  tipC: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, borderRadius: 18, borderWidth: 1, padding: 18 },
  tipIcon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  tipT: { flex: 1, fontSize: 13, lineHeight: 20, fontWeight: '500' },
});

// ═════════════════════════════════════════════════════════════════════════════
//  HEADER ICON
// ═════════════════════════════════════════════════════════════════════════════
export default function StreakIcon() {
  const { theme, isDark } = useTheme();
  const { getStreakStatus, getTodayProgress } = useGamificationStore();
  const [modalVisible, setModalVisible] = useState(false);
  const { streak } = getStreakStatus();
  const { read } = getTodayProgress();
  const isActive = streak > 0 && read > 0;

  const ringGlow = useRef(new Animated.Value(0)).current;
  const badgeBounce = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isActive) {
      Animated.loop(Animated.sequence([
        Animated.timing(ringGlow, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(ringGlow, { toValue: 0, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])).start();
    } else { ringGlow.setValue(0); }
  }, [isActive]);

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(badgeBounce, { toValue: 0.8, duration: 80, useNativeDriver: true }),
      Animated.spring(badgeBounce, { toValue: 1, tension: 300, friction: 10, useNativeDriver: true }),
    ]).start();
    setModalVisible(true);
  };

  const glowOp = ringGlow.interpolate({ inputRange: [0, 1], outputRange: [0, 0.4] });
  const glowSc = ringGlow.interpolate({ inputRange: [0, 1], outputRange: [1, 1.25] });

  return (
    <>
      <TouchableOpacity onPress={handlePress} activeOpacity={0.7}
        style={[si.wrap, {
          backgroundColor: isActive ? (isDark ? '#1A120A' : '#FFF8EE') : (isDark ? '#161210' : '#F8F4EE'),
          borderColor: isActive ? (isDark ? '#3D2A14' : '#F0D8A8') : (isDark ? '#251E16' : '#EDE5D8'),
        }]}>
        {isActive && (
          <Animated.View style={{
            ...StyleSheet.absoluteFillObject, borderRadius: 14,
            borderWidth: 2, borderColor: '#FF8F00',
            opacity: glowOp, transform: [{ scale: glowSc }],
          }} />
        )}
        <SmallFlame size={20} active={isActive} />
        {streak > 0 && (
          <Animated.View style={[si.badge, {
            backgroundColor: isActive ? '#FF8F00' : (isDark ? '#444' : '#BBB'),
            transform: [{ scale: badgeBounce }],
          }]}>
            <Text style={[si.badgeN, { color: isActive ? '#FFF' : (isDark ? '#222' : '#FFF') }]}>{streak}</Text>
          </Animated.View>
        )}
      </TouchableOpacity>
      <StreakModal visible={modalVisible} onClose={() => setModalVisible(false)} />
    </>
  );
}

const si = StyleSheet.create({
  wrap: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  badge: {
    position: 'absolute', top: -6, right: -6, minWidth: 20, height: 20, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5,
    shadowColor: '#FF8F00', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 4,
  },
  badgeN: { fontSize: 10, fontWeight: '900', letterSpacing: -0.3 },
});