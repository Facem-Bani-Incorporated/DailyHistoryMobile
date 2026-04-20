// components/StreakIcon.tsx
// ═══════════════════════════════════════════════════════════════════════════════
//  STREAK — Tiered progression, weekly calendar, streak recovery via rewarded ad
// ═══════════════════════════════════════════════════════════════════════════════

import { Ionicons } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';
import { AlertTriangle, Flame, X } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
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
import Svg, { Circle, Defs, Stop, LinearGradient as SvgLinearGradient } from 'react-native-svg';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { useRewardedAd } from '../hooks/useRewardedAd';
import { useGamificationStore } from '../store/useGamificationStore';

const SERIF = Platform.OS === 'ios' ? 'Georgia' : 'serif';
const GOAL = 5;
const LOTTIE_URI = 'https://lottie.host/605591b9-00ac-4d2e-8fb8-fa339587ef8c/UuLbWlRAAw.lottie';

// ── Tier system (Duolingo/Clash-style progression) ──
type Tier = { threshold: number; key: string; color: string; glow: string; icon: string };
const TIERS: Tier[] = [
  { threshold: 0,   key: 'ready',   color: '#78716C', glow: '#78716C', icon: '🌱' },
  { threshold: 1,   key: 'spark',   color: '#FBA525', glow: '#FFA726', icon: '✨' },
  { threshold: 3,   key: 'fire',    color: '#FB7435', glow: '#FF6B35', icon: '🔥' },
  { threshold: 7,   key: 'bronze',  color: '#CD7F32', glow: '#D4884E', icon: '🥉' },
  { threshold: 14,  key: 'silver',  color: '#C0C0C0', glow: '#D8D8D8', icon: '🥈' },
  { threshold: 30,  key: 'gold',    color: '#FFB300', glow: '#FFC43D', icon: '🏆' },
  { threshold: 50,  key: 'diamond', color: '#00D4FF', glow: '#3DDCFF', icon: '💎' },
  { threshold: 100, key: 'legend',  color: '#FFD700', glow: '#FFE55C', icon: '👑' },
];

const getTier = (streak: number) => {
  let current = TIERS[0];
  let next: Tier | null = null;
  for (const t of TIERS) {
    if (streak >= t.threshold) current = t;
    else if (!next) next = t;
  }
  return { current, next };
};

// ── i18n ──
const L: Record<string, Record<string, string>> = {
  en: {
    title: 'Streak', day: 'day streak', days: 'days streak',
    best: 'Best', total: 'Read', goal: 'Daily goal',
    done: 'Complete', left: 'to go',
    doneMsg: 'Daily goal reached. Come back tomorrow!',
    goMsg: 'Keep reading to hit your goal.',
    recent: 'Read today', tip: 'Read every day to keep your streak alive.',
    more: 'Show all', less: 'Show less',
    // tiers
    ready: 'Ready', spark: 'Spark', fire: 'On Fire', bronze: 'Bronze',
    silver: 'Silver', gold: 'Gold', diamond: 'Diamond', legend: 'Legend',
    // milestone
    nextTier: 'days to', maxTier: 'You reached the peak!',
    // calendar
    thisWeek: 'This week', d_mon: 'M', d_tue: 'T', d_wed: 'W', d_thu: 'T',
    d_fri: 'F', d_sat: 'S', d_sun: 'S',
    today: 'TODAY',
    // broken / restore
    broken: 'Streak Broken', brokenSub: 'You had a {N}-day streak',
    restore: 'Restore Streak', restoreDesc: 'Watch a quick ad to get it back',
    restoring: 'Ready to restore', adNotReady: 'Ad loading...',
    newJourney: 'Begin your journey', newJourneyDesc: 'Read your first story to light the flame.',
    // bonus
    bonusXP: 'Bonus: Watch ad for +50 XP',
    bonusReady: 'Bonus reward ready',
  },
  ro: {
    title: 'Streak', day: 'zi consecutivă', days: 'zile consecutive',
    best: 'Record', total: 'Citite', goal: 'Obiectiv zilnic',
    done: 'Complet', left: 'rămase',
    doneMsg: 'Obiectiv atins. Revino mâine!',
    goMsg: 'Citește pentru a atinge obiectivul.',
    recent: 'Citite azi', tip: 'Citește zilnic pentru a-ți menține streak-ul.',
    more: 'Toate', less: 'Mai puține',
    ready: 'Pregătit', spark: 'Scânteie', fire: 'În Flăcări', bronze: 'Bronz',
    silver: 'Argint', gold: 'Aur', diamond: 'Diamant', legend: 'Legendă',
    nextTier: 'zile până la', maxTier: 'Ai ajuns în vârf!',
    thisWeek: 'Săptămâna asta', d_mon: 'L', d_tue: 'M', d_wed: 'M', d_thu: 'J',
    d_fri: 'V', d_sat: 'S', d_sun: 'D',
    today: 'AZI',
    broken: 'Streak Pierdut', brokenSub: 'Aveai un streak de {N} zile',
    restore: 'Recuperează Streak', restoreDesc: 'Vizionează o reclamă scurtă ca să-l recuperezi',
    restoring: 'Gata de recuperare', adNotReady: 'Se încarcă reclama...',
    newJourney: 'Începe călătoria', newJourneyDesc: 'Citește prima poveste ca să aprinzi flacăra.',
    bonusXP: 'Bonus: Vizionează reclamă +50 XP',
    bonusReady: 'Recompensă bonus gata',
  },
  fr: {
    title: 'Série', day: 'jour consécutif', days: 'jours consécutifs',
    best: 'Record', total: 'Lus', goal: 'Objectif du jour',
    done: 'Terminé', left: 'restantes',
    doneMsg: 'Objectif atteint. Revenez demain !',
    goMsg: 'Continuez pour atteindre votre objectif.',
    recent: "Lus aujourd'hui", tip: 'Lisez chaque jour pour maintenir votre série.',
    more: 'Tout voir', less: 'Moins',
    ready: 'Prêt', spark: 'Étincelle', fire: 'En Feu', bronze: 'Bronze',
    silver: 'Argent', gold: 'Or', diamond: 'Diamant', legend: 'Légende',
    nextTier: 'jours jusqu\'à', maxTier: 'Vous avez atteint le sommet !',
    thisWeek: 'Cette semaine', d_mon: 'L', d_tue: 'M', d_wed: 'M', d_thu: 'J',
    d_fri: 'V', d_sat: 'S', d_sun: 'D',
    today: "AUJ.",
    broken: 'Série Perdue', brokenSub: 'Vous aviez une série de {N} jours',
    restore: 'Restaurer la Série', restoreDesc: 'Regardez une pub pour la récupérer',
    restoring: 'Prêt à restaurer', adNotReady: 'Chargement...',
    newJourney: 'Commencez votre voyage', newJourneyDesc: 'Lisez votre première histoire.',
    bonusXP: 'Bonus : Regarder une pub +50 XP',
    bonusReady: 'Récompense bonus prête',
  },
  de: {
    title: 'Streak', day: 'Tag in Folge', days: 'Tage in Folge',
    best: 'Rekord', total: 'Gelesen', goal: 'Tagesziel',
    done: 'Fertig', left: 'übrig',
    doneMsg: 'Tagesziel erreicht. Komm morgen wieder!',
    goMsg: 'Weiterlesen um dein Ziel zu erreichen.',
    recent: 'Heute gelesen', tip: 'Lies täglich um deinen Streak zu halten.',
    more: 'Alle zeigen', less: 'Weniger',
    ready: 'Bereit', spark: 'Funke', fire: 'In Flammen', bronze: 'Bronze',
    silver: 'Silber', gold: 'Gold', diamond: 'Diamant', legend: 'Legende',
    nextTier: 'Tage bis', maxTier: 'Du hast den Gipfel erreicht!',
    thisWeek: 'Diese Woche', d_mon: 'M', d_tue: 'D', d_wed: 'M', d_thu: 'D',
    d_fri: 'F', d_sat: 'S', d_sun: 'S',
    today: 'HEUTE',
    broken: 'Streak Verloren', brokenSub: 'Du hattest einen {N}-Tage-Streak',
    restore: 'Streak Wiederherstellen', restoreDesc: 'Schau eine kurze Werbung um ihn zurückzuholen',
    restoring: 'Bereit zur Wiederherstellung', adNotReady: 'Wird geladen...',
    newJourney: 'Beginne deine Reise', newJourneyDesc: 'Lies deine erste Geschichte.',
    bonusXP: 'Bonus: Werbung ansehen +50 XP',
    bonusReady: 'Bonus-Belohnung bereit',
  },
  es: {
    title: 'Racha', day: 'día consecutivo', days: 'días consecutivos',
    best: 'Récord', total: 'Leídos', goal: 'Meta diaria',
    done: 'Completo', left: 'restantes',
    doneMsg: 'Meta alcanzada. ¡Vuelve mañana!',
    goMsg: 'Sigue leyendo para alcanzar tu meta.',
    recent: 'Leídos hoy', tip: 'Lee cada día para mantener tu racha.',
    more: 'Ver todo', less: 'Menos',
    ready: 'Listo', spark: 'Chispa', fire: 'En Llamas', bronze: 'Bronce',
    silver: 'Plata', gold: 'Oro', diamond: 'Diamante', legend: 'Leyenda',
    nextTier: 'días para', maxTier: '¡Llegaste a la cima!',
    thisWeek: 'Esta semana', d_mon: 'L', d_tue: 'M', d_wed: 'M', d_thu: 'J',
    d_fri: 'V', d_sat: 'S', d_sun: 'D',
    today: 'HOY',
    broken: 'Racha Perdida', brokenSub: 'Tenías una racha de {N} días',
    restore: 'Recuperar Racha', restoreDesc: 'Mira un anuncio corto para recuperarla',
    restoring: 'Listo para recuperar', adNotReady: 'Cargando anuncio...',
    newJourney: 'Comienza tu viaje', newJourneyDesc: 'Lee tu primera historia.',
    bonusXP: 'Bono: Ver anuncio +50 XP',
    bonusReady: 'Recompensa bonus lista',
  },
};
const tx = (lang: string, k: string) => (L[lang] ?? L.en)[k] ?? L.en[k] ?? k;

// ── Helpers ──
const cleanName = (id: string) => {
  const dm = id.match(/^(\d{4}-\d{2}-\d{2})/);
  const parts = id.split('_');
  if (dm) {
    const n = parts.slice(1).join(' ').replace(/-/g, ' ').trim();
    return { name: n || id.replace(/_/g, ' '), date: dm[1] };
  }
  return { name: id.replace(/_/g, ' ').replace(/-/g, ' '), date: '' };
};

const getWeekdayOrder = (language: string): string[] => {
  // Mon-first (international) — localized day codes
  return [
    tx(language, 'd_mon'), tx(language, 'd_tue'), tx(language, 'd_wed'),
    tx(language, 'd_thu'), tx(language, 'd_fri'), tx(language, 'd_sat'), tx(language, 'd_sun'),
  ];
};

// Returns array of 7 booleans [6 days ago ... today]
const getWeekActivity = (streak: number, readToday: number): boolean[] => {
  const arr: boolean[] = [];
  for (let daysAgo = 6; daysAgo >= 0; daysAgo--) {
    if (daysAgo === 0) arr.push(readToday > 0);
    else arr.push(streak > daysAgo);
  }
  return arr;
};

// ── SVG Progress Ring for daily goal ──
const RS = 72, RW = 4, RR = (RS - RW) / 2, RC = 2 * Math.PI * RR;
const ProgressRing = ({ read, total, theme, isDark, color }: {
  read: number; total: number; theme: any; isDark: boolean; color: string;
}) => {
  const p = total > 0 ? Math.min(read / total, 1) : 0;
  const ok = p >= 1;
  const c = ok ? '#34D399' : color;
  return (
    <View style={{ width: RS, height: RS, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={RS} height={RS}>
        <Defs>
          <SvgLinearGradient id="rg" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={c} />
            <Stop offset="1" stopColor={ok ? '#10B981' : color} stopOpacity="0.85" />
          </SvgLinearGradient>
        </Defs>
        <Circle cx={RS/2} cy={RS/2} r={RR} stroke={isDark ? '#1E1812' : '#EDEAD5'} strokeWidth={RW} fill="none" />
        <Circle cx={RS/2} cy={RS/2} r={RR} stroke="url(#rg)" strokeWidth={RW} fill="none"
          strokeDasharray={RC} strokeDashoffset={RC * (1 - p)} strokeLinecap="round"
          rotation="-90" origin={`${RS/2}, ${RS/2}`} />
      </Svg>
      <View style={{ position: 'absolute', alignItems: 'center' }}>
        <Text style={{ fontSize: 17, fontWeight: '900', color: ok ? '#34D399' : theme.text, letterSpacing: -0.5 }}>
          {ok ? '✓' : `${read}`}
        </Text>
        <Text style={{ fontSize: 8, fontWeight: '700', color: theme.subtext, opacity: 0.4, letterSpacing: 0.5, marginTop: 1 }}>
          /{total}
        </Text>
      </View>
    </View>
  );
};

// ── Tier Ring — concentric circles behind the flame ──
const TierHalo = ({ color, glow, pulseValue }: {
  color: string; glow: string; pulseValue: Animated.Value;
}) => {
  const pulseScale = pulseValue.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] });
  const pulseOpacity = pulseValue.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0] });
  return (
    <View style={th.wrap} pointerEvents="none">
      <Animated.View style={[th.pulse, {
        backgroundColor: glow + '30',
        transform: [{ scale: pulseScale }],
        opacity: pulseOpacity,
      }]} />
      <View style={[th.ring1, { borderColor: color + '18' }]} />
      <View style={[th.ring2, { borderColor: color + '30' }]} />
    </View>
  );
};
const th = StyleSheet.create({
  wrap: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  pulse: { position: 'absolute', width: 200, height: 200, borderRadius: 100 },
  ring1: { position: 'absolute', width: 240, height: 240, borderRadius: 120, borderWidth: 1 },
  ring2: { position: 'absolute', width: 180, height: 180, borderRadius: 90, borderWidth: 1 },
});

// ══════════════════════════════════════════════════════════════════════════════
// STREAK MODAL
// ══════════════════════════════════════════════════════════════════════════════
const StreakModal = ({ visible, onClose }: { visible: boolean; onClose: () => void }) => {
  const { theme, isDark } = useTheme();
  const { language } = useLanguage();
  const ins = useSafeAreaInsets();
  const {
    getStreakStatus, getTodayProgress, totalEventsRead, readEventsToday,
  } = useGamificationStore();
  const { streak, longest } = getStreakStatus();
  const { read: rawRead } = getTodayProgress();
  const read = Math.min(rawRead, GOAL);
  const [showAll, setShowAll] = useState(false);
  const items = showAll ? readEventsToday : readEventsToday.slice(0, 4);

  const { showRewardedAd, isRewardedReady } = useRewardedAd();

  // State detection
  const isBroken = streak === 0 && longest > 0;
  const isFreshUser = streak === 0 && longest === 0;
  const isActive = streak > 0;

  // Tier calculation (based on current or longest if broken)
  const tierBasis = isBroken ? longest : streak;
  const { current: tier, next: nextTier } = getTier(tierBasis);
  const tierName = tx(language, tier.key);
  const milestoneProgress = nextTier
    ? (tierBasis - tier.threshold) / (nextTier.threshold - tier.threshold)
    : 1;
  const daysToNext = nextTier ? nextTier.threshold - tierBasis : 0;

  // Heat color based on state
  const heatColor = isBroken ? '#64748B' : tier.color;
  const heatGlow  = isBroken ? '#64748B' : tier.glow;

  // Week calendar
  const weekActivity = useMemo(() => getWeekActivity(streak, rawRead), [streak, rawRead]);
  const weekdays = useMemo(() => getWeekdayOrder(language), [language]);

  // ── Animations ──
  const fadeHero = useRef(new Animated.Value(0)).current;
  const fadeGoal = useRef(new Animated.Value(0)).current;
  const fadeCal  = useRef(new Animated.Value(0)).current;
  const fadeList = useRef(new Animated.Value(0)).current;
  const slideHero = useRef(new Animated.Value(16)).current;
  const slideGoal = useRef(new Animated.Value(16)).current;
  const slideCal  = useRef(new Animated.Value(16)).current;
  const slideList = useRef(new Animated.Value(16)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const milestoneFill = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setShowAll(false);
      [fadeHero, fadeGoal, fadeCal, fadeList].forEach(v => v.setValue(0));
      [slideHero, slideGoal, slideCal, slideList].forEach(v => v.setValue(16));
      milestoneFill.setValue(0);

      const anim = (fade: Animated.Value, slide: Animated.Value, delay: number) =>
        Animated.parallel([
          Animated.timing(fade, { toValue: 1, duration: 380, delay, useNativeDriver: true }),
          Animated.spring(slide, { toValue: 0, tension: 70, friction: 12, delay, useNativeDriver: true }),
        ]);
      Animated.stagger(80, [
        anim(fadeHero, slideHero, 50),
        anim(fadeCal, slideCal, 0),
        anim(fadeGoal, slideGoal, 0),
        anim(fadeList, slideList, 0),
      ]).start();

      Animated.timing(milestoneFill, {
        toValue: milestoneProgress, duration: 900, delay: 400,
        easing: Easing.out(Easing.cubic), useNativeDriver: false,
      }).start();

      if (isActive) {
        Animated.loop(
          Animated.sequence([
            Animated.timing(pulse, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
            Animated.timing(pulse, { toValue: 0, duration: 200, useNativeDriver: true }),
          ])
        ).start();
      }
    }
  }, [visible]);

  // ── Streak recovery handler ──
  // NOTE: For this to actually restore the streak after the ad completes,
  // add a `restoreStreak()` method to useGamificationStore and wire it into
  // useRewardedAd's onEarnedReward callback. See bottom of file for example.
  const handleRestoreStreak = () => {
    showRewardedAd();
    // If your store exposes it synchronously you can also call:
    // useGamificationStore.getState().restoreStreak?.();
  };

  const bg = isDark ? '#07060A' : '#FDFBF7';
  const card = isDark ? '#121014' : '#FFFFFF';
  const brd = isDark ? '#1F1A24' : '#EDE7DC';
  const sub = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)';
  const dimBg = isDark ? '#0E0C10' : '#FAF7F2';

  return (
    <Modal visible={visible} animationType="slide" transparent={false} statusBarTranslucent>
      <View style={[sms.root, { backgroundColor: bg, paddingTop: ins.top }]}>
        {/* Header */}
        <View style={sms.hdr}>
          <View style={{ width: 36 }} />
          <View style={{ alignItems: 'center' }}>
            <Text style={[sms.hdrKicker, { color: heatColor }]}>
              {tx(language, 'title').toUpperCase()}
            </Text>
            <Text style={[sms.hdrTitle, { color: theme.text }]}>
              {tierName} · {tier.icon}
            </Text>
          </View>
          <TouchableOpacity onPress={onClose}
            hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
            style={[sms.closeBtn, { backgroundColor: isDark ? '#181420' : '#F5F0E8', borderColor: brd }]}>
            <X size={16} color={theme.subtext} strokeWidth={2.5} />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={[sms.scroll, { paddingBottom: ins.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* ═════ HERO ═════ */}
          <Animated.View style={{ opacity: fadeHero, transform: [{ translateY: slideHero }] }}>
            {isBroken ? (
              // ── BROKEN STATE ──
              <View style={[sms.brokenCard, { borderColor: '#EF444445' }]}>
                <View style={sms.brokenIconWrap}>
                  <View style={sms.brokenIconBg}>
                    <AlertTriangle size={28} color="#EF4444" strokeWidth={2.2} />
                  </View>
                </View>
                <Text style={sms.brokenTitle}>{tx(language, 'broken')}</Text>
                <Text style={sms.brokenSub}>
                  {tx(language, 'brokenSub').replace('{N}', String(longest))}
                </Text>

                {/* Restore CTA */}
                <TouchableOpacity
                  onPress={handleRestoreStreak}
                  disabled={!isRewardedReady}
                  activeOpacity={0.85}
                  style={[sms.restoreBtn, {
                    opacity: isRewardedReady ? 1 : 0.6,
                  }]}
                >
                  <View style={sms.restoreBtnInner}>
                    <View style={sms.restoreFlame}>
                      <LottieView source={{ uri: LOTTIE_URI }} autoPlay loop speed={0.9}
                        style={{ width: 38, height: 38 }} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={sms.restoreBtnTitle}>{tx(language, 'restore')}</Text>
                      <Text style={sms.restoreBtnSub}>
                        {isRewardedReady ? tx(language, 'restoreDesc') : tx(language, 'adNotReady')}
                      </Text>
                    </View>
                    <View style={sms.restorePlay}>
                      <Ionicons name="play" size={16} color="#FFF" />
                    </View>
                  </View>
                </TouchableOpacity>

                <Text style={[sms.brokenHint, { color: sub }]}>
                  {tx(language, 'tip')}
                </Text>
              </View>
            ) : isFreshUser ? (
              // ── NEW USER ──
              <View style={[sms.heroCard, { backgroundColor: '#0A0806', borderColor: brd }]}>
                <View style={sms.freshIconWrap}>
                  <Text style={{ fontSize: 56 }}>🌱</Text>
                </View>
                <Text style={[sms.heroLabel, { color: heatColor, marginTop: 8 }]}>
                  {tx(language, 'newJourney').toUpperCase()}
                </Text>
                <Text style={[sms.freshDesc, { color: 'rgba(255,255,255,0.7)' }]}>
                  {tx(language, 'newJourneyDesc')}
                </Text>
              </View>
            ) : (
              // ── ACTIVE STREAK ──
              <View style={[sms.heroCard, { backgroundColor: '#0A0806', borderColor: heatColor + '35' }]}>
                {/* Tier halo behind flame */}
                <View style={sms.lottieWrap}>
                  <TierHalo color={tier.color} glow={tier.glow} pulseValue={pulse} />
                  <LottieView source={{ uri: LOTTIE_URI }} autoPlay loop speed={0.85}
                    style={sms.lottieBig} />
                </View>

                {/* Tier badge */}
                <View style={[sms.tierPill, { backgroundColor: tier.color + '18', borderColor: tier.color + '55' }]}>
                  <Text style={{ fontSize: 10 }}>{tier.icon}</Text>
                  <Text style={[sms.tierPillText, { color: tier.color }]}>{tierName.toUpperCase()}</Text>
                </View>

                {/* Streak number */}
                <View style={sms.heroTextWrap}>
                  <Text style={sms.heroNumber}>{streak}</Text>
                  <Text style={[sms.heroLabel, { color: heatColor }]}>
                    {streak === 1 ? tx(language, 'day') : tx(language, 'days')}
                  </Text>
                </View>

                {/* Milestone progress bar */}
                <View style={sms.milestoneWrap}>
                  {nextTier ? (
                    <>
                      <View style={sms.milestoneHeader}>
                        <Text style={sms.milestoneLabel}>
                          {daysToNext} {tx(language, 'nextTier')}
                        </Text>
                        <View style={sms.milestoneNextBadge}>
                          <Text style={{ fontSize: 10 }}>{nextTier.icon}</Text>
                          <Text style={[sms.milestoneNext, { color: nextTier.color }]}>
                            {tx(language, nextTier.key).toUpperCase()}
                          </Text>
                        </View>
                      </View>
                      <View style={sms.milestoneTrack}>
                        <Animated.View style={[sms.milestoneFill, {
                          backgroundColor: tier.color,
                          width: milestoneFill.interpolate({
                            inputRange: [0, 1], outputRange: ['0%', '100%'],
                          }),
                        }]} />
                      </View>
                    </>
                  ) : (
                    <View style={sms.maxTierWrap}>
                      <Text style={{ fontSize: 14 }}>👑</Text>
                      <Text style={sms.maxTierText}>{tx(language, 'maxTier')}</Text>
                    </View>
                  )}
                </View>

                <View style={[sms.heroDivider, { backgroundColor: 'rgba(255,255,255,0.08)' }]} />

                {/* Stats */}
                <View style={sms.heroStatsRow}>
                  <View style={sms.heroStat}>
                    <Ionicons name="trophy" size={14} color="#FFB300" />
                    <Text style={sms.heroStatVal}>{longest}</Text>
                    <Text style={sms.heroStatLbl}>{tx(language, 'best')}</Text>
                  </View>
                  <View style={[sms.heroStatDivider, { backgroundColor: 'rgba(255,255,255,0.08)' }]} />
                  <View style={sms.heroStat}>
                    <Ionicons name="book" size={14} color="#7C6BC4" />
                    <Text style={sms.heroStatVal}>{totalEventsRead}</Text>
                    <Text style={sms.heroStatLbl}>{tx(language, 'total')}</Text>
                  </View>
                </View>
              </View>
            )}
          </Animated.View>

          {/* ═════ WEEK CALENDAR ═════ */}
          {!isFreshUser && (
            <Animated.View style={[sms.calCard, {
              backgroundColor: card, borderColor: brd,
              opacity: fadeCal, transform: [{ translateY: slideCal }],
            }]}>
              <Text style={[sms.calTitle, { color: theme.text }]}>{tx(language, 'thisWeek')}</Text>
              <View style={sms.calRow}>
                {weekActivity.map((active, i) => {
                  const isToday = i === 6;
                  const label = weekdays[i];
                  return (
                    <View key={i} style={sms.calDay}>
                      <Text style={[sms.calDayLabel, {
                        color: isToday ? heatColor : sub,
                        fontWeight: isToday ? '900' : '700',
                      }]}>{label}</Text>
                      <View style={[sms.calDot, {
                        backgroundColor: active
                          ? heatColor
                          : (isDark ? '#1A1510' : '#EFEAE0'),
                        borderColor: isToday ? heatColor : 'transparent',
                        borderWidth: isToday && !active ? 1.5 : 0,
                      }]}>
                        {active && <Flame size={13} color="#FFF" strokeWidth={2.8} fill="#FFF" />}
                      </View>
                      {isToday && (
                        <Text style={[sms.calToday, { color: heatColor }]}>
                          {tx(language, 'today')}
                        </Text>
                      )}
                    </View>
                  );
                })}
              </View>
            </Animated.View>
          )}

          {/* ═════ DAILY GOAL ═════ */}
          <Animated.View style={[sms.goalCard, {
            backgroundColor: card, borderColor: brd,
            opacity: fadeGoal, transform: [{ translateY: slideGoal }],
          }]}>
            <View style={sms.goalHeader}>
              <Text style={[sms.goalTitle, { color: theme.text }]}>{tx(language, 'goal')}</Text>
              <View style={[sms.goalBadge, {
                backgroundColor: read >= GOAL ? '#34D39915' : (heatColor + '15'),
              }]}>
                <Text style={[sms.goalBadgeT, {
                  color: read >= GOAL ? '#34D399' : heatColor,
                }]}>
                  {read >= GOAL ? tx(language, 'done') : `${GOAL - read} ${tx(language, 'left')}`}
                </Text>
              </View>
            </View>
            <View style={sms.goalBody}>
              <ProgressRing read={read} total={GOAL} theme={theme} isDark={isDark} color={heatColor} />
              <View style={{ flex: 1, gap: 10 }}>
                <Text style={[sms.goalMsg, { color: sub }]}>
                  {read >= GOAL ? tx(language, 'doneMsg') : tx(language, 'goMsg')}
                </Text>
                <View style={sms.barRow}>
                  {Array.from({ length: GOAL }).map((_, i) => (
                    <View key={i} style={[sms.barSeg, {
                      backgroundColor: i < read
                        ? (read >= GOAL ? '#34D399' : heatColor)
                        : (isDark ? '#1A1510' : '#F0EBE3'),
                    }]} />
                  ))}
                </View>
              </View>
            </View>
          </Animated.View>

          {/* ═════ BONUS XP AD (only shown if streak is active) ═════ */}
          {isActive && (
            <TouchableOpacity
              onPress={showRewardedAd}
              disabled={!isRewardedReady}
              activeOpacity={0.75}
              style={[sms.bonusBtn, {
                backgroundColor: isRewardedReady ? (isDark ? '#1A1608' : '#FFFAF0') : (isDark ? '#141210' : '#F5F2EC'),
                borderColor: isRewardedReady ? (isDark ? '#3A2810' : '#EDD8A8') : brd,
                opacity: isRewardedReady ? 1 : 0.5,
              }]}
            >
              <View style={sms.bonusIcon}>
                <Text style={{ fontSize: 20 }}>🎬</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[sms.bonusText, { color: isRewardedReady ? heatColor : theme.subtext }]}>
                  {isRewardedReady ? tx(language, 'bonusXP') : tx(language, 'adNotReady')}
                </Text>
              </View>
              <View style={[sms.bonusBadge, { backgroundColor: heatColor + '20' }]}>
                <Text style={[sms.bonusBadgeT, { color: heatColor }]}>+50 XP</Text>
              </View>
            </TouchableOpacity>
          )}

          {/* ═════ READ TODAY LIST ═════ */}
          {readEventsToday.length > 0 && (
            <Animated.View style={[sms.listCard, {
              backgroundColor: card, borderColor: brd,
              opacity: fadeList, transform: [{ translateY: slideList }],
            }]}>
              <View style={sms.listHeader}>
                <Text style={[sms.listTitle, { color: theme.text }]}>{tx(language, 'recent')}</Text>
                <View style={[sms.listCount, { backgroundColor: dimBg }]}>
                  <Text style={[sms.listCountT, { color: heatColor }]}>{readEventsToday.length}</Text>
                </View>
              </View>
              {items.map((eid, i) => {
                const { name, date } = cleanName(eid);
                return (
                  <View key={eid}>
                    {i > 0 && <View style={[sms.listDiv, { backgroundColor: brd }]} />}
                    <View style={sms.listItem}>
                      <View style={[sms.listCheck, { backgroundColor: heatColor + '12' }]}>
                        <Ionicons name="checkmark" size={12} color={heatColor} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[sms.listName, { color: theme.text }]} numberOfLines={2}>{name}</Text>
                        {date !== '' && <Text style={[sms.listDate, { color: sub }]}>{date}</Text>}
                      </View>
                    </View>
                  </View>
                );
              })}
              {readEventsToday.length > 4 && (
                <>
                  <View style={[sms.listDiv, { backgroundColor: brd }]} />
                  <TouchableOpacity onPress={() => setShowAll(v => !v)} activeOpacity={0.6} style={sms.moreBtn}>
                    <Text style={[sms.moreTxt, { color: heatColor }]}>
                      {showAll ? tx(language, 'less') : `${tx(language, 'more')} (${readEventsToday.length - 4})`}
                    </Text>
                    <Ionicons name={showAll ? 'chevron-up' : 'chevron-down'} size={13} color={heatColor} />
                  </TouchableOpacity>
                </>
              )}
            </Animated.View>
          )}

          {/* Tip footer */}
          <View style={[sms.tipCard, { borderColor: brd }]}>
            <Ionicons name="sparkles" size={13} color={heatColor} style={{ marginTop: 1 }} />
            <Text style={[sms.tipText, { color: sub }]}>{tx(language, 'tip')}</Text>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

const sms = StyleSheet.create({
  root: { flex: 1 },
  hdr: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, height: 60 },
  hdrKicker: { fontSize: 9, fontWeight: '900', letterSpacing: 2.2 },
  hdrTitle: { fontSize: 15, fontWeight: '800', letterSpacing: -0.2, marginTop: 2, fontFamily: SERIF },
  closeBtn: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  scroll: { paddingHorizontal: 20, paddingTop: 4 },

  // Hero (active)
  heroCard: { borderRadius: 26, borderWidth: 1, overflow: 'hidden', marginBottom: 12, paddingBottom: 16 },
  lottieWrap: { width: '100%', height: 210, alignItems: 'center', justifyContent: 'center' },
  lottieBig: { width: 210, height: 210, zIndex: 2 },
  tierPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    alignSelf: 'center', paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 10, borderWidth: 1, marginTop: -20,
  },
  tierPillText: { fontSize: 9.5, fontWeight: '900', letterSpacing: 1.6 },
  heroTextWrap: { alignItems: 'center', marginTop: 8 },
  heroNumber: { fontSize: 62, fontWeight: '900', color: '#FFFFFF', letterSpacing: -3, fontFamily: SERIF, lineHeight: 66 },
  heroLabel: { fontSize: 10.5, fontWeight: '800', letterSpacing: 2, textTransform: 'uppercase', marginTop: 2 },

  // Milestone
  milestoneWrap: { paddingHorizontal: 20, marginTop: 16, marginBottom: 14 },
  milestoneHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  milestoneLabel: { fontSize: 10.5, fontWeight: '700', color: 'rgba(255,255,255,0.55)', letterSpacing: 0.4 },
  milestoneNextBadge: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  milestoneNext: { fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
  milestoneTrack: { height: 5, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' },
  milestoneFill: { height: 5, borderRadius: 3 },
  maxTierWrap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8 },
  maxTierText: { fontSize: 11, fontWeight: '800', color: '#FFD700', letterSpacing: 0.5 },

  heroDivider: { height: StyleSheet.hairlineWidth, marginHorizontal: 20 },
  heroStatsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14 },
  heroStat: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 20 },
  heroStatVal: { fontSize: 18, fontWeight: '900', letterSpacing: -0.5, color: '#FFF' },
  heroStatLbl: { fontSize: 9, fontWeight: '700', color: 'rgba(255,255,255,0.35)', letterSpacing: 0.8, textTransform: 'uppercase', marginLeft: 2 },
  heroStatDivider: { width: 1, height: 22 },

  // Broken state
  brokenCard: {
    borderRadius: 26, borderWidth: 1.5, overflow: 'hidden', marginBottom: 12,
    padding: 22, alignItems: 'center', backgroundColor: '#1A0C0C',
  },
  brokenIconWrap: { marginBottom: 14 },
  brokenIconBg: {
    width: 64, height: 64, borderRadius: 20,
    backgroundColor: '#EF444418', borderWidth: 1.5, borderColor: '#EF444440',
    alignItems: 'center', justifyContent: 'center',
  },
  brokenTitle: { fontSize: 22, fontWeight: '900', color: '#FFFFFF', letterSpacing: -0.5, fontFamily: SERIF, marginBottom: 4 },
  brokenSub: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.55)', marginBottom: 22, textAlign: 'center' },
  restoreBtn: {
    alignSelf: 'stretch', borderRadius: 18, overflow: 'hidden',
    backgroundColor: '#DC2626',
    shadowColor: '#DC2626', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4, shadowRadius: 16, elevation: 8,
  },
  restoreBtnInner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 14, paddingHorizontal: 16,
  },
  restoreFlame: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  restoreBtnTitle: { fontSize: 15, fontWeight: '900', color: '#FFF', letterSpacing: -0.2 },
  restoreBtnSub: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  restorePlay: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  brokenHint: { fontSize: 11, fontWeight: '500', marginTop: 16, textAlign: 'center', color: 'rgba(255,255,255,0.4)' },

  // Fresh user
  freshIconWrap: { alignItems: 'center', paddingTop: 30, paddingBottom: 4 },
  freshDesc: { fontSize: 13, fontWeight: '500', textAlign: 'center', marginTop: 8, marginHorizontal: 28, marginBottom: 20, lineHeight: 19 },

  // Week calendar
  calCard: { borderRadius: 20, borderWidth: 1, padding: 16, marginBottom: 12 },
  calTitle: { fontSize: 12, fontWeight: '800', letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 14, opacity: 0.7 },
  calRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  calDay: { alignItems: 'center', flex: 1, gap: 8 },
  calDayLabel: { fontSize: 10, letterSpacing: 0.8 },
  calDot: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  calToday: { fontSize: 8, fontWeight: '900', letterSpacing: 1, marginTop: 2 },

  // Goal
  goalCard: { borderRadius: 20, borderWidth: 1, padding: 18, marginBottom: 12 },
  goalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  goalTitle: { fontSize: 14, fontWeight: '800', letterSpacing: -0.2 },
  goalBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  goalBadgeT: { fontSize: 10, fontWeight: '800', letterSpacing: 0.3 },
  goalBody: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  goalMsg: { fontSize: 12.5, lineHeight: 18 },
  barRow: { flexDirection: 'row', gap: 4 },
  barSeg: { flex: 1, height: 5, borderRadius: 3 },

  // Bonus
  bonusBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 18, borderWidth: 1, marginBottom: 12 },
  bonusIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  bonusText: { fontSize: 13, fontWeight: '700', letterSpacing: 0.2 },
  bonusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  bonusBadgeT: { fontSize: 11.5, fontWeight: '900', letterSpacing: 0.3 },

  // List
  listCard: { borderRadius: 20, borderWidth: 1, overflow: 'hidden', marginBottom: 12 },
  listHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 16, paddingBottom: 12 },
  listTitle: { fontSize: 14, fontWeight: '800', letterSpacing: -0.2 },
  listCount: { minWidth: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  listCountT: { fontSize: 11, fontWeight: '800' },
  listItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 12, gap: 12 },
  listCheck: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  listName: { fontSize: 13, fontWeight: '600', lineHeight: 18 },
  listDate: { fontSize: 10, marginTop: 2 },
  listDiv: { height: StyleSheet.hairlineWidth, marginLeft: 54 },
  moreBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 12 },
  moreTxt: { fontSize: 12, fontWeight: '700' },

  tipCard: { flexDirection: 'row', gap: 10, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 14, borderWidth: 1 },
  tipText: { flex: 1, fontSize: 12, lineHeight: 18 },
});

// ══════════════════════════════════════════════════════════════════════════════
// HEADER ICON (unchanged behavior, small polish)
// ══════════════════════════════════════════════════════════════════════════════
export default function StreakIcon() {
  const { theme, isDark } = useTheme();
  const { getStreakStatus, getTodayProgress } = useGamificationStore();
  const [show, setShow] = useState(false);
  const { streak, longest } = getStreakStatus();
  const { read } = getTodayProgress();
  const active = streak > 0 && read > 0;
  const broken = streak === 0 && longest > 0;

  const pulse = useRef(new Animated.Value(0)).current;
  const tap = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (active || broken) {
      Animated.loop(Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])).start();
    } else { pulse.setValue(0); }
  }, [active, broken]);

  const onPress = () => {
    Animated.sequence([
      Animated.timing(tap, { toValue: 0.85, duration: 60, useNativeDriver: true }),
      Animated.spring(tap, { toValue: 1, tension: 300, friction: 10, useNativeDriver: true }),
    ]).start();
    setShow(true);
  };

  const pulseColor = broken ? '#EF4444' : '#FF8F00';

  return (
    <>
      <TouchableOpacity onPress={onPress} activeOpacity={0.8}
        style={[ic.wrap, {
          backgroundColor: active ? (isDark ? '#1A1208' : '#FFFAF0')
            : broken ? (isDark ? '#1A0A0A' : '#FFF0F0')
            : (isDark ? '#141110' : '#F8F5EF'),
          borderColor: active ? (isDark ? '#3A2810' : '#EDD8A8')
            : broken ? (isDark ? '#3A1515' : '#F5C5C5')
            : (isDark ? '#1E1A15' : '#EDE7DC'),
        }]}>
        {(active || broken) && (
          <Animated.View style={{
            ...StyleSheet.absoluteFillObject, borderRadius: 13,
            borderWidth: 1.5, borderColor: pulseColor,
            opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0, 0.35] }),
            transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] }) }],
          }} />
        )}
        <Animated.View style={{ transform: [{ scale: tap }] }}>
          {active ? (
            <LottieView source={{ uri: LOTTIE_URI }} autoPlay loop speed={0.7} style={{ width: 26, height: 26 }} />
          ) : broken ? (
            <AlertTriangle size={16} color="#EF4444" strokeWidth={2.5} />
          ) : (
            <View style={{ width: 18, height: 18, alignItems: 'center', justifyContent: 'flex-end' }}>
              <View style={{ width: 7, height: 9, borderRadius: 3.5, backgroundColor: isDark ? '#3A3025' : '#C8BFB0', opacity: 0.4 }} />
            </View>
          )}
        </Animated.View>
        {(streak > 0 || broken) && (
          <View style={[ic.badge, {
            backgroundColor: active ? '#E8850A' : broken ? '#EF4444' : (isDark ? '#3A3530' : '#C0B8A8'),
          }]}>
            <Text style={ic.badgeT}>{broken ? '!' : streak}</Text>
          </View>
        )}
      </TouchableOpacity>
      <StreakModal visible={show} onClose={() => setShow(false)} />
    </>
  );
}

const ic = StyleSheet.create({
  wrap: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  badge: {
    position: 'absolute', top: -5, right: -5, minWidth: 18, height: 18, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.15, shadowRadius: 3, elevation: 3,
  },
  badgeT: { fontSize: 9, fontWeight: '900', color: '#FFF', letterSpacing: -0.3 },
});

// ═══════════════════════════════════════════════════════════════════════════════
//  STORE WIRING — ADD TO useGamificationStore.ts
// ═══════════════════════════════════════════════════════════════════════════════
// To make the "Restore Streak" button actually restore the streak after the ad,
// add this method to your gamification store:
//
//   restoreStreak: () => set((state) => ({
//     currentStreak: state.longestStreak,  // or previous broken streak
//     lastStreakDate: todayDateString(),
//   })),
//
// Then in your useRewardedAd hook, add a reward callback system:
//
//   const [pendingReward, setPendingReward] = useState<'xp' | 'restore' | null>(null);
//
//   const showRewardedAdFor = (type: 'xp' | 'restore') => {
//     setPendingReward(type);
//     rewardedAd.show();
//   };
//
//   // In the onEarnedReward handler:
//   if (pendingReward === 'restore') {
//     useGamificationStore.getState().restoreStreak();
//   } else {
//     useGamificationStore.getState().addXP(50);
//   }
//   setPendingReward(null);
//
// Then replace handleRestoreStreak() above with showRewardedAdFor('restore').
// ═══════════════════════════════════════════════════════════════════════════════