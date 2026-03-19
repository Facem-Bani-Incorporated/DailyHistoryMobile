// components/StreakIcon.tsx
// ═══════════════════════════════════════════════════════════════════════════════
//  STREAK v2 — PLASMA CORE FIRE + GLASSMORPHIC MODAL
// ═══════════════════════════════════════════════════════════════════════════════

import { X } from 'lucide-react-native';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Modal,
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

const { width: W, height: H } = Dimensions.get('window');

// ─── i18n ────────────────────────────────────────────────────────────────────
const L: Record<string, Record<string, string>> = {
  en: {
    title: 'Your Progress', dayStreak: 'day streak', daysStreak: 'days streak',
    bestStreak: 'Best streak', totalRead: 'Total read', todayProgress: "TODAY'S PROGRESS",
    allDone: 'All done!', storiesLeft: 'stories left',
    allDoneDesc: "You've read every story today. Come back tomorrow!",
    readMoreDesc: 'Read stories to build your daily streak.',
    readToday: 'READ TODAY',
    tip: 'Read at least one story every day to keep your streak going!',
    complete: 'complete', read: 'read',
    keepGoing: 'Keep the flame alive',
    onFire: "You're on fire!",
  },
  ro: {
    title: 'Progresul tău', dayStreak: 'zi consecutivă', daysStreak: 'zile consecutive',
    bestStreak: 'Cel mai lung streak', totalRead: 'Total citite', todayProgress: 'PROGRESUL DE AZI',
    allDone: 'Gata!', storiesLeft: 'povești rămase',
    allDoneDesc: 'Ai citit toate poveștile de azi. Revino mâine!',
    readMoreDesc: 'Citește povești pentru a-ți construi streak-ul.',
    readToday: 'CITITE AZI',
    tip: 'Citește cel puțin o poveste în fiecare zi pentru a-ți menține streak-ul!',
    complete: 'complet', read: 'citite',
    keepGoing: 'Menține flacăra vie',
    onFire: 'Ești pe foc!',
  },
  fr: {
    title: 'Votre progression', dayStreak: 'jour consécutif', daysStreak: 'jours consécutifs',
    bestStreak: 'Meilleure série', totalRead: 'Total lus', todayProgress: 'PROGRÈS DU JOUR',
    allDone: 'Terminé !', storiesLeft: 'histoires restantes',
    allDoneDesc: 'Vous avez lu toutes les histoires. Revenez demain !',
    readMoreDesc: 'Lisez des histoires pour construire votre série.',
    readToday: "LUS AUJOURD'HUI",
    tip: 'Lisez au moins une histoire chaque jour pour maintenir votre série !',
    complete: 'terminé', read: 'lus',
    keepGoing: 'Gardez la flamme vivante',
    onFire: 'Vous êtes en feu !',
  },
  de: {
    title: 'Dein Fortschritt', dayStreak: 'Tag in Folge', daysStreak: 'Tage in Folge',
    bestStreak: 'Bester Streak', totalRead: 'Gesamt gelesen', todayProgress: 'FORTSCHRITT HEUTE',
    allDone: 'Fertig!', storiesLeft: 'Geschichten übrig',
    allDoneDesc: 'Du hast alle Geschichten gelesen. Komm morgen wieder!',
    readMoreDesc: 'Lies Geschichten um deinen Streak aufzubauen.',
    readToday: 'HEUTE GELESEN',
    tip: 'Lies jeden Tag mindestens eine Geschichte um deinen Streak zu halten!',
    complete: 'fertig', read: 'gelesen',
    keepGoing: 'Halte die Flamme am Leben',
    onFire: 'Du bist on fire!',
  },
  es: {
    title: 'Tu progreso', dayStreak: 'día consecutivo', daysStreak: 'días consecutivos',
    bestStreak: 'Mejor racha', totalRead: 'Total leídos', todayProgress: 'PROGRESO DE HOY',
    allDone: '¡Listo!', storiesLeft: 'historias restantes',
    allDoneDesc: '¡Leíste todas las historias! Vuelve mañana.',
    readMoreDesc: 'Lee historias para construir tu racha diaria.',
    readToday: 'LEÍDOS HOY',
    tip: '¡Lee al menos una historia cada día para mantener tu racha!',
    complete: 'completo', read: 'leídos',
    keepGoing: 'Mantén la llama viva',
    onFire: '¡Estás en llamas!',
  },
};
const tx = (lang: string, key: string) => (L[lang] ?? L.en)[key] ?? L.en[key] ?? key;

// ═════════════════════════════════════════════════════════════════════════════
//  PLASMA TENDRIL
// ═════════════════════════════════════════════════════════════════════════════
interface TendrilConfig {
  index: number;
  fireSize: number;
  width: number;
  height: number;
  offsetX: number;
  bottom: number;
  color: string;
  swayDur: number;      swayAmp: number;
  stretchDur: number;   stretchRange: [number, number];
  breathDur: number;    breathRange: [number, number];
  flickerDur: number;   flickerRange: [number, number];
  rotateDur: number;    rotateRange: [string, string];
  pivotY: number;
}

const PlasmaTendril = React.memo(({ cfg }: { cfg: TendrilConfig }) => {
  const sway = useRef(new Animated.Value(0)).current;
  const stretchY = useRef(new Animated.Value(cfg.stretchRange[0])).current;
  const breathX = useRef(new Animated.Value(cfg.breathRange[0])).current;
  const flicker = useRef(new Animated.Value(cfg.flickerRange[1])).current;
  const rotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(sway, { toValue: cfg.swayAmp, duration: cfg.swayDur, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(sway, { toValue: -cfg.swayAmp, duration: cfg.swayDur * 1.07, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ])).start();
    Animated.loop(Animated.sequence([
      Animated.timing(stretchY, { toValue: cfg.stretchRange[1], duration: cfg.stretchDur, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(stretchY, { toValue: cfg.stretchRange[0], duration: cfg.stretchDur * 0.93, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ])).start();
    Animated.loop(Animated.sequence([
      Animated.timing(breathX, { toValue: cfg.breathRange[1], duration: cfg.breathDur, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(breathX, { toValue: cfg.breathRange[0], duration: cfg.breathDur * 1.04, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ])).start();
    Animated.loop(Animated.sequence([
      Animated.timing(flicker, { toValue: cfg.flickerRange[1], duration: cfg.flickerDur, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(flicker, { toValue: cfg.flickerRange[0], duration: cfg.flickerDur * 0.88, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ])).start();
    Animated.loop(Animated.sequence([
      Animated.timing(rotate, { toValue: 1, duration: cfg.rotateDur, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(rotate, { toValue: -1, duration: cfg.rotateDur * 1.13, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ])).start();
  }, []);

  const rotateInterp = rotate.interpolate({
    inputRange: [-1, 1],
    outputRange: cfg.rotateRange,
  });

  const s = cfg.fireSize;
  const w = s * cfg.width;
  const h = s * cfg.height;

  return (
    <Animated.View style={{
      position: 'absolute',
      bottom: s * cfg.bottom,
      left: s / 2 + cfg.offsetX - w / 2,
      width: w,
      height: h,
      borderTopLeftRadius: w * 0.5,
      borderTopRightRadius: w * 0.5,
      borderBottomLeftRadius: w * 0.35,
      borderBottomRightRadius: w * 0.35,
      backgroundColor: cfg.color,
      opacity: flicker,
      transform: [
        { translateX: sway },
        { translateY: cfg.pivotY },
        { scaleX: breathX },
        { scaleY: stretchY },
        { rotate: rotateInterp },
        { translateY: -cfg.pivotY },
      ],
    }} />
  );
});

// ═════════════════════════════════════════════════════════════════════════════
//  PHOTON JET
// ═════════════════════════════════════════════════════════════════════════════
interface PhotonConfig {
  index: number;
  fireSize: number;
  angle: number;
  speed: number;
  duration: number;
  delay: number;
  size: number;
  color: string;
}

const PhotonJet = React.memo(({ cfg }: { cfg: PhotonConfig }) => {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(cfg.delay),
        Animated.timing(progress, {
          toValue: 1,
          duration: cfg.duration,
          easing: Easing.out(Easing.exp),
          useNativeDriver: true,
        }),
        Animated.timing(progress, { toValue: 0, duration: 0, useNativeDriver: true }),
      ]),
    ).start();
  }, []);

  const dx = Math.cos(cfg.angle) * cfg.speed;
  const dy = Math.sin(cfg.angle) * cfg.speed;

  const translateX = progress.interpolate({ inputRange: [0, 1], outputRange: [0, dx] });
  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [0, dy] });
  const opacity = progress.interpolate({ inputRange: [0, 0.05, 0.3, 1], outputRange: [0, 1, 0.5, 0] });
  const scale = progress.interpolate({ inputRange: [0, 0.1, 1], outputRange: [0.2, 1.2, 0] });

  return (
    <Animated.View style={{
      position: 'absolute',
      bottom: cfg.fireSize * 0.38,
      left: cfg.fireSize / 2 - cfg.size / 2,
      width: cfg.size,
      height: cfg.size,
      borderRadius: cfg.size / 2,
      backgroundColor: cfg.color,
      opacity,
      transform: [{ translateX }, { translateY }, { scale }],
    }} />
  );
});

// ═════════════════════════════════════════════════════════════════════════════
//  MOLTEN CORE RING
// ═════════════════════════════════════════════════════════════════════════════
const CoreRing = React.memo(({ size, ringSize, color, pulseDur, pulseRange, fireSize }: {
  size: number; ringSize: number; color: string; pulseDur: number; pulseRange: [number, number]; fireSize: number;
}) => {
  const pulse = useRef(new Animated.Value(pulseRange[0])).current;
  const glow = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: pulseRange[1], duration: pulseDur, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(pulse, { toValue: pulseRange[0], duration: pulseDur * 0.9, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ])).start();
    Animated.loop(Animated.sequence([
      Animated.timing(glow, { toValue: 1, duration: pulseDur * 0.7, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(glow, { toValue: 0.4, duration: pulseDur * 0.8, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ])).start();
  }, []);

  return (
    <Animated.View style={{
      position: 'absolute',
      bottom: fireSize * 0.32 + (fireSize * 0.12 - ringSize / 2),
      alignSelf: 'center',
      width: ringSize,
      height: ringSize,
      borderRadius: ringSize / 2,
      backgroundColor: color,
      opacity: glow,
      transform: [{ scale: pulse }],
    }} />
  );
});

// ═════════════════════════════════════════════════════════════════════════════
//  PLASMA FIRE COMPOSITE
// ═════════════════════════════════════════════════════════════════════════════

const TENDRIL_CONFIGS: Omit<TendrilConfig, 'fireSize' | 'index'>[] = [
  { width: 0.48, height: 0.70, offsetX: -2, bottom: 0.06, color: '#6B0F1A',
    swayDur: 3100, swayAmp: 6, stretchDur: 2700, stretchRange: [0.92, 1.12],
    breathDur: 2300, breathRange: [0.88, 1.15], flickerDur: 1900, flickerRange: [0.35, 0.75],
    rotateDur: 3700, rotateRange: ['-8deg', '8deg'], pivotY: 20 },
  { width: 0.44, height: 0.68, offsetX: 3, bottom: 0.07, color: '#8B1A1A',
    swayDur: 2900, swayAmp: 7, stretchDur: 2500, stretchRange: [0.90, 1.14],
    breathDur: 2100, breathRange: [0.86, 1.18], flickerDur: 1700, flickerRange: [0.4, 0.8],
    rotateDur: 3300, rotateRange: ['-10deg', '6deg'], pivotY: 18 },
  { width: 0.38, height: 0.62, offsetX: -5, bottom: 0.09, color: '#B71C1C',
    swayDur: 2300, swayAmp: 8, stretchDur: 2100, stretchRange: [0.88, 1.18],
    breathDur: 1800, breathRange: [0.84, 1.2], flickerDur: 1500, flickerRange: [0.45, 0.85],
    rotateDur: 2900, rotateRange: ['-12deg', '8deg'], pivotY: 16 },
  { width: 0.36, height: 0.60, offsetX: 6, bottom: 0.10, color: '#D32F2F',
    swayDur: 2100, swayAmp: 7, stretchDur: 1900, stretchRange: [0.86, 1.20],
    breathDur: 1600, breathRange: [0.82, 1.22], flickerDur: 1300, flickerRange: [0.5, 0.88],
    rotateDur: 2700, rotateRange: ['-9deg', '11deg'], pivotY: 15 },
  { width: 0.32, height: 0.55, offsetX: -3, bottom: 0.11, color: '#E64A19',
    swayDur: 1900, swayAmp: 6, stretchDur: 1700, stretchRange: [0.85, 1.22],
    breathDur: 1400, breathRange: [0.80, 1.25], flickerDur: 1100, flickerRange: [0.55, 0.90],
    rotateDur: 2300, rotateRange: ['-7deg', '10deg'], pivotY: 12 },
  { width: 0.30, height: 0.52, offsetX: 4, bottom: 0.12, color: '#F4511E',
    swayDur: 1700, swayAmp: 5, stretchDur: 1500, stretchRange: [0.84, 1.24],
    breathDur: 1300, breathRange: [0.78, 1.28], flickerDur: 1000, flickerRange: [0.58, 0.92],
    rotateDur: 2100, rotateRange: ['-11deg', '7deg'], pivotY: 10 },
  { width: 0.26, height: 0.46, offsetX: -2, bottom: 0.14, color: '#FF8F00',
    swayDur: 1500, swayAmp: 4, stretchDur: 1300, stretchRange: [0.82, 1.26],
    breathDur: 1100, breathRange: [0.76, 1.30], flickerDur: 900, flickerRange: [0.6, 0.95],
    rotateDur: 1900, rotateRange: ['-6deg', '9deg'], pivotY: 8 },
  { width: 0.24, height: 0.43, offsetX: 2, bottom: 0.15, color: '#FFA000',
    swayDur: 1300, swayAmp: 3.5, stretchDur: 1200, stretchRange: [0.80, 1.28],
    breathDur: 1000, breathRange: [0.75, 1.32], flickerDur: 800, flickerRange: [0.62, 0.96],
    rotateDur: 1700, rotateRange: ['-8deg', '6deg'], pivotY: 7 },
  { width: 0.20, height: 0.38, offsetX: -1, bottom: 0.17, color: '#FFB300',
    swayDur: 1100, swayAmp: 3, stretchDur: 1000, stretchRange: [0.78, 1.30],
    breathDur: 900, breathRange: [0.74, 1.34], flickerDur: 700, flickerRange: [0.65, 0.97],
    rotateDur: 1500, rotateRange: ['-5deg', '7deg'], pivotY: 6 },
  { width: 0.17, height: 0.34, offsetX: 1, bottom: 0.18, color: '#FFC107',
    swayDur: 950, swayAmp: 2.5, stretchDur: 900, stretchRange: [0.76, 1.32],
    breathDur: 800, breathRange: [0.72, 1.36], flickerDur: 600, flickerRange: [0.68, 0.98],
    rotateDur: 1300, rotateRange: ['-4deg', '6deg'], pivotY: 5 },
  { width: 0.13, height: 0.28, offsetX: 0, bottom: 0.20, color: '#FFD54F',
    swayDur: 800, swayAmp: 2, stretchDur: 750, stretchRange: [0.75, 1.35],
    breathDur: 700, breathRange: [0.70, 1.38], flickerDur: 500, flickerRange: [0.55, 1.0],
    rotateDur: 1100, rotateRange: ['-3deg', '5deg'], pivotY: 4 },
  { width: 0.09, height: 0.20, offsetX: 0, bottom: 0.22, color: '#FFF8E1',
    swayDur: 700, swayAmp: 1.5, stretchDur: 650, stretchRange: [0.74, 1.38],
    breathDur: 600, breathRange: [0.68, 1.40], flickerDur: 400, flickerRange: [0.5, 1.0],
    rotateDur: 900, rotateRange: ['-2deg', '4deg'], pivotY: 3 },
];

const PHOTON_COLORS = ['#FFFFFF', '#FFF8E1', '#FFE082', '#FFD54F', '#FFCA28', '#FFB300', '#FF8F00', '#FF6D00'];

const PlasmaFire = ({ size = 160, active = true }: { size?: number; active?: boolean }) => {
  const tendrils = useMemo<TendrilConfig[]>(() =>
    TENDRIL_CONFIGS.map((t, i) => ({ ...t, index: i, fireSize: size })),
    [size],
  );

  const photons = useMemo<PhotonConfig[]>(() =>
    Array.from({ length: 16 }, (_, i) => {
      const baseAngle = -Math.PI / 6 - (i / 16) * (4 * Math.PI / 6);
      const jitter = ((i * 37) % 20 - 10) * (Math.PI / 180);
      return {
        index: i,
        fireSize: size,
        angle: baseAngle + jitter,
        speed: size * 0.25 + (i * 53) % (size * 0.2),
        duration: 400 + (i * 89) % 500,
        delay: (i * 311) % 2500,
        size: 2 + (i * 23) % 4,
        color: PHOTON_COLORS[i % PHOTON_COLORS.length],
      };
    }),
    [size],
  );

  const coreRings = useMemo(() => [
    { ringSize: size * 0.22, color: '#FFF8E1', pulseDur: 600, pulseRange: [0.85, 1.2] as [number, number] },
    { ringSize: size * 0.17, color: '#FFFFFF', pulseDur: 500, pulseRange: [0.8, 1.25] as [number, number] },
    { ringSize: size * 0.12, color: '#FFFDE7', pulseDur: 420, pulseRange: [0.78, 1.3] as [number, number] },
    { ringSize: size * 0.08, color: '#FFFFFF', pulseDur: 350, pulseRange: [0.75, 1.35] as [number, number] },
    { ringSize: size * 0.04, color: '#FFFFFF', pulseDur: 280, pulseRange: [0.7, 1.4] as [number, number] },
  ], [size]);

  const aurora1 = useRef(new Animated.Value(0.08)).current;
  const aurora2 = useRef(new Animated.Value(0.06)).current;
  const aurora3 = useRef(new Animated.Value(0.04)).current;
  const coronaScale = useRef(new Animated.Value(1)).current;
  const scorchGlow = useRef(new Animated.Value(0.2)).current;

  useEffect(() => {
    if (!active) {
      aurora1.setValue(0.02); aurora2.setValue(0.01); aurora3.setValue(0.01);
      coronaScale.setValue(0.9); scorchGlow.setValue(0.05);
      return;
    }
    Animated.loop(Animated.sequence([
      Animated.timing(aurora1, { toValue: 0.22, duration: 2900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(aurora1, { toValue: 0.06, duration: 3300, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ])).start();
    Animated.loop(Animated.sequence([
      Animated.timing(aurora2, { toValue: 0.18, duration: 2300, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(aurora2, { toValue: 0.04, duration: 2700, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ])).start();
    Animated.loop(Animated.sequence([
      Animated.timing(aurora3, { toValue: 0.25, duration: 1900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(aurora3, { toValue: 0.05, duration: 2100, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ])).start();
    Animated.loop(Animated.sequence([
      Animated.timing(coronaScale, { toValue: 1.15, duration: 1700, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(coronaScale, { toValue: 0.92, duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ])).start();
    Animated.loop(Animated.sequence([
      Animated.timing(scorchGlow, { toValue: 0.45, duration: 1300, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(scorchGlow, { toValue: 0.15, duration: 1100, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ])).start();
  }, [active]);

  if (!active) {
    return (
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{
          width: size * 0.25, height: size * 0.18, borderRadius: size * 0.12,
          backgroundColor: '#3E2723', opacity: 0.4,
          position: 'absolute', bottom: size * 0.15,
        }} />
        <View style={{
          width: size * 0.12, height: size * 0.08, borderRadius: size * 0.06,
          backgroundColor: '#5D4037', opacity: 0.25,
          position: 'absolute', bottom: size * 0.18,
        }} />
      </View>
    );
  }

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {/* Aurora Corona layers */}
      <Animated.View style={{
        position: 'absolute', width: size * 1.2, height: size * 0.9,
        borderRadius: size * 0.45, backgroundColor: '#BF360C',
        bottom: size * 0.02, opacity: aurora1,
        transform: [{ scaleX: 1.1 }],
      }} />
      <Animated.View style={{
        position: 'absolute', width: size * 0.9, height: size * 0.7,
        borderRadius: size * 0.35, backgroundColor: '#E65100',
        bottom: size * 0.06, opacity: aurora2,
      }} />
      <Animated.View style={{
        position: 'absolute', width: size * 0.6, height: size * 0.5,
        borderRadius: size * 0.25, backgroundColor: '#FF8F00',
        bottom: size * 0.10, opacity: aurora3,
      }} />

      {/* Heat Corona ring */}
      <Animated.View style={{
        position: 'absolute', bottom: size * 0.28,
        width: size * 0.5, height: size * 0.5,
        borderRadius: size * 0.25,
        borderWidth: 2, borderColor: '#FFAB0050',
        opacity: aurora2,
        transform: [{ scale: coronaScale }],
      }} />

      {/* Ground scorch */}
      <Animated.View style={{
        position: 'absolute', bottom: size * 0.04,
        width: size * 0.7, height: size * 0.06,
        borderRadius: size * 0.03, backgroundColor: '#FF6D00',
        opacity: scorchGlow,
      }} />

      {/* Plasma tendrils */}
      {tendrils.map(t => (
        <PlasmaTendril key={`pt-${t.index}`} cfg={t} />
      ))}

      {/* Molten core rings */}
      {coreRings.map((r, i) => (
        <CoreRing key={`cr-${i}`} size={size} ringSize={r.ringSize} color={r.color}
          pulseDur={r.pulseDur} pulseRange={r.pulseRange} fireSize={size} />
      ))}

      {/* Photon jets */}
      {photons.map(p => (
        <PhotonJet key={`pj-${p.index}`} cfg={p} />
      ))}
    </View>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
//  ICON FLAME
// ═════════════════════════════════════════════════════════════════════════════
const IconFlame = ({ size = 22, active = true }: { size?: number; active?: boolean }) => {
  const coreBreath = useRef(new Animated.Value(1)).current;
  const tipSway = useRef(new Animated.Value(0)).current;
  const glowPulse = useRef(new Animated.Value(0.15)).current;
  const spark1Angle = useRef(new Animated.Value(0)).current;
  const spark2Angle = useRef(new Animated.Value(0)).current;
  const spark1Op = useRef(new Animated.Value(0)).current;
  const spark2Op = useRef(new Animated.Value(0)).current;
  const innerFlicker = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    if (!active) return;
    Animated.loop(Animated.sequence([
      Animated.timing(coreBreath, { toValue: 1.15, duration: 500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(coreBreath, { toValue: 0.9, duration: 600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ])).start();
    Animated.loop(Animated.sequence([
      Animated.timing(tipSway, { toValue: 2.5, duration: 600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(tipSway, { toValue: -2.5, duration: 700, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ])).start();
    Animated.loop(Animated.sequence([
      Animated.timing(glowPulse, { toValue: 0.35, duration: 800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(glowPulse, { toValue: 0.1, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ])).start();
    Animated.loop(Animated.sequence([
      Animated.timing(innerFlicker, { toValue: 1, duration: 350, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(innerFlicker, { toValue: 0.6, duration: 400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ])).start();
    Animated.loop(Animated.sequence([
      Animated.delay(300),
      Animated.parallel([
        Animated.timing(spark1Angle, { toValue: 1, duration: 700, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.sequence([
          Animated.timing(spark1Op, { toValue: 0.9, duration: 150, useNativeDriver: true }),
          Animated.timing(spark1Op, { toValue: 0, duration: 550, useNativeDriver: true }),
        ]),
      ]),
      Animated.timing(spark1Angle, { toValue: 0, duration: 0, useNativeDriver: true }),
      Animated.delay(600),
    ])).start();
    Animated.loop(Animated.sequence([
      Animated.delay(900),
      Animated.parallel([
        Animated.timing(spark2Angle, { toValue: 1, duration: 600, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.sequence([
          Animated.timing(spark2Op, { toValue: 0.8, duration: 120, useNativeDriver: true }),
          Animated.timing(spark2Op, { toValue: 0, duration: 480, useNativeDriver: true }),
        ]),
      ]),
      Animated.timing(spark2Angle, { toValue: 0, duration: 0, useNativeDriver: true }),
      Animated.delay(800),
    ])).start();
  }, [active]);

  const spark1X = spark1Angle.interpolate({ inputRange: [0, 1], outputRange: [0, -size * 0.5] });
  const spark1Y = spark1Angle.interpolate({ inputRange: [0, 1], outputRange: [0, -size * 0.7] });
  const spark2X = spark2Angle.interpolate({ inputRange: [0, 1], outputRange: [0, size * 0.4] });
  const spark2Y = spark2Angle.interpolate({ inputRange: [0, 1], outputRange: [0, -size * 0.6] });

  if (!active) {
    return (
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'flex-end' }}>
        <View style={{ width: size * 0.45, height: size * 0.6, borderRadius: size * 0.22, backgroundColor: '#5D4037', opacity: 0.35 }} />
      </View>
    );
  }

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'flex-end' }}>
      <Animated.View style={{
        position: 'absolute', bottom: -2, width: size * 1.1, height: size * 0.7,
        borderRadius: size * 0.35, backgroundColor: '#FF6D00', opacity: glowPulse,
      }} />
      <Animated.View style={{
        position: 'absolute', bottom: 0, width: size * 0.6, height: size * 0.88,
        borderTopLeftRadius: size * 0.3, borderTopRightRadius: size * 0.3,
        borderBottomLeftRadius: size * 0.18, borderBottomRightRadius: size * 0.18,
        backgroundColor: '#E64A19',
        transform: [{ translateX: tipSway }, { scaleY: coreBreath }],
      }} />
      <Animated.View style={{
        position: 'absolute', bottom: size * 0.04, width: size * 0.42, height: size * 0.65,
        borderTopLeftRadius: size * 0.21, borderTopRightRadius: size * 0.21,
        borderBottomLeftRadius: size * 0.12, borderBottomRightRadius: size * 0.12,
        backgroundColor: '#FFA000',
        transform: [{ translateX: Animated.multiply(tipSway, -0.5) }],
      }} />
      <Animated.View style={{
        position: 'absolute', bottom: size * 0.08, width: size * 0.24, height: size * 0.38,
        borderRadius: size * 0.12, backgroundColor: '#FFF8E1',
        opacity: innerFlicker,
        transform: [{ scaleY: coreBreath }],
      }} />
      <Animated.View style={{
        position: 'absolute', bottom: size * 0.5, left: size / 2 - 1.5,
        width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#FFE082',
        opacity: spark1Op,
        transform: [{ translateX: spark1X }, { translateY: spark1Y }],
      }} />
      <Animated.View style={{
        position: 'absolute', bottom: size * 0.4, left: size / 2 - 1,
        width: 2, height: 2, borderRadius: 1, backgroundColor: '#FFCC02',
        opacity: spark2Op,
        transform: [{ translateX: spark2X }, { translateY: spark2Y }],
      }} />
    </View>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
//  ANIMATED PROGRESS RING
// ═════════════════════════════════════════════════════════════════════════════
const RNG = 80; const STR = 6; const RAD = (RNG - STR) / 2; const CRC = 2 * Math.PI * RAD;

const ProgressRing = ({ read, total, lang, theme, isDark }: {
  read: number; total: number; lang: string; theme: any; isDark: boolean;
}) => {
  const p = total > 0 ? read / total : 0;
  const done = read >= total && total > 0;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (done) {
      Animated.loop(Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 1200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])).start();
    }
  }, [done]);

  return (
    <Animated.View style={{ width: RNG, height: RNG, alignItems: 'center', justifyContent: 'center', transform: [{ scale: pulseAnim }] }}>
      <Svg width={RNG} height={RNG}>
        <Defs>
          <LinearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={done ? '#34D399' : '#FF8F00'} />
            <Stop offset="1" stopColor={done ? '#10B981' : '#FFD54F'} />
          </LinearGradient>
        </Defs>
        <Circle cx={RNG / 2} cy={RNG / 2} r={RAD}
          stroke={isDark ? '#2A2218' : '#F0E8Da'} strokeWidth={STR} fill="none" />
        <Circle cx={RNG / 2} cy={RNG / 2} r={RAD}
          stroke="url(#ringGrad)" strokeWidth={STR} fill="none"
          strokeDasharray={CRC} strokeDashoffset={CRC * (1 - p)}
          strokeLinecap="round" rotation="-90" origin={`${RNG / 2}, ${RNG / 2}`} />
      </Svg>
      <View style={{ position: 'absolute', alignItems: 'center' }}>
        <Text style={{ fontSize: 18, fontWeight: '900', letterSpacing: -0.5, color: done ? '#34D399' : theme.text }}>
          {done ? '✓' : `${read}/${total}`}
        </Text>
        <Text style={{ fontSize: 9, fontWeight: '700', marginTop: 2, color: theme.subtext, opacity: 0.5, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          {done ? tx(lang, 'complete') : tx(lang, 'read')}
        </Text>
      </View>
    </Animated.View>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
//  STAT CARD
// ═════════════════════════════════════════════════════════════════════════════
const StatCard = ({ value, label, icon, delay, isDark }: {
  value: number | string; label: string; icon: string; delay: number; isDark: boolean;
}) => {
  const slideUp = useRef(new Animated.Value(30)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideUp, { toValue: 0, duration: 600, delay, easing: Easing.out(Easing.back(1.2)), useNativeDriver: true }),
      Animated.timing(fadeIn, { toValue: 1, duration: 500, delay, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={{
      flex: 1,
      backgroundColor: isDark ? '#1C1612' : '#FFFCF7',
      borderRadius: 16,
      padding: 16,
      alignItems: 'center',
      gap: 6,
      borderWidth: 1,
      borderColor: isDark ? '#2E2518' : '#F0E8DA',
      opacity: fadeIn,
      transform: [{ translateY: slideUp }],
    }}>
      <Text style={{ fontSize: 20 }}>{icon}</Text>
      <Text style={{ fontSize: 26, fontWeight: '900', letterSpacing: -1.5, color: isDark ? '#F5E6D0' : '#1A1510' }}>
        {value}
      </Text>
      <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', color: isDark ? '#8B7355' : '#A6956E', textAlign: 'center' }}>
        {label}
      </Text>
    </Animated.View>
  );
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
  const { read, total } = getTodayProgress();

  const bg = isDark ? '#0D0A07' : '#FBF7F0';
  const cardBg = isDark ? '#161210' : '#FFFFFF';
  const cardBrd = isDark ? '#251E16' : '#EDE5D8';
  const gold = isDark ? '#E8B84D' : '#C77E08';

  const headerFade = useRef(new Animated.Value(0)).current;
  const heroScale = useRef(new Animated.Value(0.85)).current;
  const heroFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      headerFade.setValue(0); heroScale.setValue(0.85); heroFade.setValue(0);
      Animated.stagger(100, [
        Animated.timing(headerFade, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.parallel([
          Animated.spring(heroScale, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }),
          Animated.timing(heroFade, { toValue: 1, duration: 500, useNativeDriver: true }),
        ]),
      ]).start();
    }
  }, [visible]);

  return (
    <Modal visible={visible} animationType="slide" transparent={false} statusBarTranslucent>
      <View style={[ms.root, { backgroundColor: bg, paddingTop: insets.top }]}>
        {/* HEADER */}
        <Animated.View style={[ms.hdr, { opacity: headerFade }]}>
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
        </Animated.View>

        <ScrollView contentContainerStyle={[ms.scroll, { paddingBottom: insets.bottom + 50 }]} showsVerticalScrollIndicator={false}>
          {/* HERO — Fire on top, number below */}
          <Animated.View style={[ms.hero, {
            backgroundColor: cardBg, borderColor: cardBrd,
            opacity: heroFade, transform: [{ scale: heroScale }],
          }]}>
            {/* Fire container */}
            <View style={[ms.fireBg, { backgroundColor: isDark ? '#0A0604' : '#1A0E02' }]}>
              <PlasmaFire size={170} active={streak > 0} />
            </View>
            {/* Streak number below the fire */}
            <View style={ms.heroInfo}>
              <Text style={[ms.heroNum, { color: theme.text }]}>
                {streak}
              </Text>
              <Text style={[ms.heroLabel, { color: isDark ? '#FFD54F' : '#C77E08' }]}>
                {streak === 1 ? tx(language, 'dayStreak') : tx(language, 'daysStreak')}
              </Text>
            </View>
          </Animated.View>

          {/* STATS ROW */}
          <View style={ms.statsRow}>
            <StatCard value={longest} label={tx(language, 'bestStreak')} icon="🏆" delay={300} isDark={isDark} />
            <StatCard value={totalEventsRead} label={tx(language, 'totalRead')} icon="📚" delay={450} isDark={isDark} />
          </View>

          {/* TODAY'S PROGRESS */}
          <Text style={[ms.sec, { color: gold }]}>{tx(language, 'todayProgress')}</Text>
          <View style={[ms.todayC, { backgroundColor: cardBg, borderColor: cardBrd }]}>
            <View style={ms.todayR}>
              <ProgressRing read={read} total={total} lang={language} theme={theme} isDark={isDark} />
              <View style={{ flex: 1, gap: 6 }}>
                <Text style={[ms.todayT, { color: theme.text }]}>
                  {read >= total && total > 0 ? tx(language, 'allDone') : `${total - read} ${tx(language, 'storiesLeft')}`}
                </Text>
                <Text style={[ms.todayD, { color: theme.subtext }]}>
                  {read >= total && total > 0 ? tx(language, 'allDoneDesc') : tx(language, 'readMoreDesc')}
                </Text>
              </View>
            </View>
            {total > 0 && (
              <View style={ms.dots}>
                {Array.from({ length: total }).map((_, i) => (
                  <View key={i} style={[ms.dot, {
                    backgroundColor: i < read
                      ? (isDark ? '#FFB300' : '#F59E0B')
                      : (isDark ? '#1C1612' : '#F0E8DA'),
                    flex: total <= 10 ? 1 : undefined,
                    width: total > 10 ? Math.max(8, (W - 88) / total - 4) : undefined,
                    height: 6,
                    borderRadius: 3,
                  }]} />
                ))}
              </View>
            )}
          </View>

          {/* READ TODAY LIST */}
          {readEventsToday.length > 0 && (
            <>
              <Text style={[ms.sec, { color: gold }]}>{tx(language, 'readToday')} ({readEventsToday.length})</Text>
              <View style={[ms.listC, { backgroundColor: cardBg, borderColor: cardBrd }]}>
                {readEventsToday.map((eid, i) => (
                  <View key={eid}>
                    <View style={ms.listI}>
                      <View style={[ms.listChk, { backgroundColor: '#FF8F00' }]}>
                        <Text style={{ fontSize: 9, color: '#FFF', fontWeight: '800' }}>✓</Text>
                      </View>
                      <Text style={[ms.listTx, { color: theme.text }]} numberOfLines={1}>{eid}</Text>
                      <View style={[ms.listBadge, { backgroundColor: isDark ? '#1C1612' : '#FFF8F0' }]}>
                        <Text style={{ fontSize: 9, color: gold, fontWeight: '700' }}>✦</Text>
                      </View>
                    </View>
                    {i < readEventsToday.length - 1 && <View style={[ms.listD, { backgroundColor: cardBrd }]} />}
                  </View>
                ))}
              </View>
            </>
          )}

          {/* TIP CARD */}
          <View style={[ms.tipC, {
            backgroundColor: isDark ? '#1A140E' : '#FFFAF2',
            borderColor: isDark ? '#2E2518' : '#F0E0C8',
          }]}>
            <View style={ms.tipIcon}>
              <Text style={{ fontSize: 16 }}>🔥</Text>
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
  hdr: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
  },
  hdrT: { fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  xBtn: {
    width: 40, height: 40, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1,
  },
  scroll: { paddingHorizontal: 20, paddingTop: 4 },
  hero: {
    borderRadius: 28, borderWidth: 1, overflow: 'hidden', marginBottom: 16,
  },
  fireBg: {
    width: '100%', height: 220, alignItems: 'center', justifyContent: 'center',
    borderRadius: 27,
  },
  heroInfo: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  heroNum: {
    fontSize: 64, fontWeight: '900', letterSpacing: -4,
  },
  heroLabel: {
    fontSize: 14, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase', marginTop: -2,
  },
  statsRow: {
    flexDirection: 'row', gap: 12, marginBottom: 28,
  },
  sec: {
    fontSize: 10, fontWeight: '900', letterSpacing: 2, marginBottom: 12, marginLeft: 4,
  },
  todayC: {
    borderRadius: 22, borderWidth: 1, padding: 20, marginBottom: 28,
  },
  todayR: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  todayT: { fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  todayD: { fontSize: 13, lineHeight: 19, opacity: 0.5 },
  dots: { flexDirection: 'row', gap: 4, marginTop: 18, justifyContent: 'center' },
  dot: { minWidth: 8 },
  listC: {
    borderRadius: 20, borderWidth: 1, overflow: 'hidden', marginBottom: 28,
  },
  listI: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14, gap: 12,
  },
  listChk: {
    width: 22, height: 22, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
  },
  listTx: { flex: 1, fontSize: 13, fontWeight: '600' },
  listBadge: {
    width: 24, height: 24, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  listD: { height: StyleSheet.hairlineWidth, marginLeft: 50 },
  tipC: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 14,
    borderRadius: 18, borderWidth: 1, padding: 18,
  },
  tipIcon: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: '#FF8F0015', alignItems: 'center', justifyContent: 'center',
  },
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
    } else {
      ringGlow.setValue(0);
    }
  }, [isActive]);

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(badgeBounce, { toValue: 0.8, duration: 80, useNativeDriver: true }),
      Animated.spring(badgeBounce, { toValue: 1, tension: 300, friction: 10, useNativeDriver: true }),
    ]).start();
    setModalVisible(true);
  };

  const glowOpacity = ringGlow.interpolate({ inputRange: [0, 1], outputRange: [0, 0.4] });
  const glowScale = ringGlow.interpolate({ inputRange: [0, 1], outputRange: [1, 1.25] });

  return (
    <>
      <TouchableOpacity onPress={handlePress} activeOpacity={0.7}
        style={[si.wrap, {
          backgroundColor: isActive ? (isDark ? '#1A120A' : '#FFF8EE') : (isDark ? '#161210' : '#F8F4EE'),
          borderColor: isActive ? (isDark ? '#3D2A14' : '#F0D8A8') : (isDark ? '#251E16' : '#EDE5D8'),
        }]}>
        {isActive && (
          <Animated.View style={{
            ...StyleSheet.absoluteFillObject,
            borderRadius: 14,
            borderWidth: 2,
            borderColor: '#FF8F00',
            opacity: glowOpacity,
            transform: [{ scale: glowScale }],
          }} />
        )}
        <IconFlame size={20} active={isActive} />
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
  wrap: {
    width: 42, height: 42, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1,
  },
  badge: {
    position: 'absolute', top: -6, right: -6,
    minWidth: 20, height: 20, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5,
    shadowColor: '#FF8F00', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4,
    elevation: 4,
  },
  badgeN: { fontSize: 10, fontWeight: '900', letterSpacing: -0.3 },
});