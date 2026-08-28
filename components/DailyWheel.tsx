// components/DailyWheel.tsx
// The daily wheel.
//
// Visual direction is an antique brass instrument — an astrolabe dial, not a casino
// wheel. Aged gold rim, ink-dark segments, serif numerals, a fixed pointer at twelve
// o'clock. The app is about history; a neon slot machine would read as bolted on.
//
// The spin is one long decelerating rotation with a slight overshoot and settle, which
// is what a heavy physical wheel does. Everything animated runs on the native driver
// (rotation, scale, opacity only) so it holds 60fps on the low-end Androids that make
// up most of the install base.
import { LinearGradient } from 'expo-linear-gradient';
import { Sparkles, X } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated, Easing, Modal, Platform, Pressable, ScrollView,
  StyleSheet, Text, View,
} from 'react-native';
import Svg, { Circle, G, Path, Text as SvgText } from 'react-native-svg';

import {
  AD_WHEEL_PRIZES, drawPrize, oddsPercent, WHEEL_PRIZES, type WheelPrize,
} from '../config/wheel';
import { useLanguage } from '../context/LanguageContext';
import { useRevenueCat } from '../context/RevenueCatContext';
import { useTheme } from '../context/ThemeContext';
import { useRewardedUnlock } from '../hooks/useRewardedUnlock';
import * as analytics from '../src/analytics/posthog';
import { useCoinStore } from '../store/useCoinStore';
import { useFutureDaysStore } from '../store/useFutureDaysStore';
import { useGamificationStore } from '../store/useGamificationStore';
import { useMapLayerPassStore } from '../store/useMapLayerPassStore';
import { useWheelStore } from '../store/useWheelStore';
import { haptic } from '../utils/haptics';

const SERIF = Platform.OS === 'ios' ? 'Georgia' : 'serif';
const SIZE = 300;
const R = SIZE / 2;
const RIM = 13;

// Layers that the wheel can hand out for 24h. Kept to the ad tier on purpose — the
// wheel never opens a crown-jewel layer, those are the subscription's.
const AD_LAYER_POOL = ['routes', 'cities', 'trade', 'plagues', 'pirates'];

type Lang = 'en' | 'ro' | 'fr' | 'de' | 'es';

const L: Record<Lang, Record<string, string>> = {
  en: {
    title: 'The Daily Turn', sub: 'One spin a day',
    spin: 'Spin', spinning: 'Spinning…', comeBack: 'Come back tomorrow',
    bonusCta: 'Watch a clip to double', bonusTitle: 'Bonus round',
    odds: 'View odds', oddsTitle: 'Prize odds', close: 'Close',
    won: 'You won', xp: 'XP', proDays: 'days of PRO', proDay: 'day of PRO',
    shield: 'Streak shield', shieldDesc: 'One missed day forgiven',
    future: "Tomorrow's stories", futureDesc: 'Unlocked for 24 hours',
    layer: 'A map layer', layerDesc: 'Unlocked for 24 hours',
    oddsNote: 'Every prize shown can be won. Odds are per spin and never change.',
    proNote: 'PRO time from the wheel stacks with any you already have.',
  },
  ro: {
    title: 'Roata Zilei', sub: 'O rotire pe zi',
    spin: 'Învârte', spinning: 'Se învârte…', comeBack: 'Revino mâine',
    bonusCta: 'Vezi un clip ca să dublezi', bonusTitle: 'Rundă bonus',
    odds: 'Vezi șansele', oddsTitle: 'Șansele la premii', close: 'Închide',
    won: 'Ai câștigat', xp: 'XP', proDays: 'zile de PRO', proDay: 'zi de PRO',
    shield: 'Scut de serie', shieldDesc: 'O zi ratată îți e iertată',
    future: 'Poveștile de mâine', futureDesc: 'Deblocate 24 de ore',
    layer: 'Un strat de hartă', layerDesc: 'Deblocat 24 de ore',
    oddsNote: 'Fiecare premiu afișat poate fi câștigat. Șansele sunt per rotire și nu se schimbă.',
    proNote: 'Timpul PRO de la roată se adună cu cel pe care îl ai deja.',
  },
  fr: {
    title: 'Le Tour du Jour', sub: 'Un tour par jour',
    spin: 'Tourner', spinning: 'En cours…', comeBack: 'Revenez demain',
    bonusCta: 'Regardez une pub pour doubler', bonusTitle: 'Tour bonus',
    odds: 'Voir les chances', oddsTitle: 'Chances de gain', close: 'Fermer',
    won: 'Vous avez gagné', xp: 'XP', proDays: 'jours de PRO', proDay: 'jour de PRO',
    shield: 'Bouclier de série', shieldDesc: 'Un jour manqué pardonné',
    future: 'Les récits de demain', futureDesc: 'Débloqués 24 heures',
    layer: 'Une couche de carte', layerDesc: 'Débloquée 24 heures',
    oddsNote: 'Chaque lot affiché peut être gagné. Les chances sont par tour et ne changent jamais.',
    proNote: "Le temps PRO gagné s'ajoute à celui que vous avez déjà.",
  },
  de: {
    title: 'Die Tagesdrehung', sub: 'Eine Drehung pro Tag',
    spin: 'Drehen', spinning: 'Dreht…', comeBack: 'Komm morgen wieder',
    bonusCta: 'Clip ansehen und verdoppeln', bonusTitle: 'Bonusrunde',
    odds: 'Chancen ansehen', oddsTitle: 'Gewinnchancen', close: 'Schließen',
    won: 'Du hast gewonnen', xp: 'XP', proDays: 'Tage PRO', proDay: 'Tag PRO',
    shield: 'Serien-Schutz', shieldDesc: 'Ein verpasster Tag wird verziehen',
    future: 'Die Geschichten von morgen', futureDesc: '24 Stunden freigeschaltet',
    layer: 'Eine Kartenebene', layerDesc: '24 Stunden freigeschaltet',
    oddsNote: 'Jeder gezeigte Preis ist gewinnbar. Die Chancen gelten pro Drehung und ändern sich nie.',
    proNote: 'PRO-Zeit vom Rad wird zu deiner vorhandenen addiert.',
  },
  es: {
    title: 'El Giro del Día', sub: 'Un giro al día',
    spin: 'Girar', spinning: 'Girando…', comeBack: 'Vuelve mañana',
    bonusCta: 'Mira un clip para doblar', bonusTitle: 'Ronda extra',
    odds: 'Ver probabilidades', oddsTitle: 'Probabilidades', close: 'Cerrar',
    won: 'Has ganado', xp: 'XP', proDays: 'días de PRO', proDay: 'día de PRO',
    shield: 'Escudo de racha', shieldDesc: 'Un día perdido perdonado',
    future: 'Las historias de mañana', futureDesc: 'Desbloqueadas 24 horas',
    layer: 'Una capa del mapa', layerDesc: 'Desbloqueada 24 horas',
    oddsNote: 'Todos los premios mostrados se pueden ganar. Las probabilidades son por giro y nunca cambian.',
    proNote: 'El tiempo PRO de la ruleta se suma al que ya tengas.',
  },
};

/** Human label for a prize, in the reader's language. */
function prizeLabel(p: WheelPrize, t: Record<string, string>): string {
  switch (p.kind) {
    case 'xp':            return `${p.value} ${t.xp}`;
    case 'pro_days':      return `${p.value} ${p.value === 1 ? t.proDay : t.proDays}`;
    case 'streak_shield': return t.shield;
    case 'future_days':   return t.future;
    case 'map_layer':     return t.layer;
  }
}

/** Short label for the segment itself — must stay legible at ~11px on the dial. */
function segmentLabel(p: WheelPrize, t: Record<string, string>): string {
  switch (p.kind) {
    case 'xp':            return `${p.value}`;
    case 'pro_days':      return p.value >= 365 ? '1 AN' : `${p.value}d`;
    case 'streak_shield': return '◈';
    case 'future_days':   return '→';
    case 'map_layer':     return '◉';
  }
}

/** SVG path for one wheel segment, measured from twelve o'clock, clockwise. */
function segmentPath(index: number, count: number): string {
  const sweep = (2 * Math.PI) / count;
  const start = index * sweep - Math.PI / 2;
  const end = start + sweep;
  const inner = RIM;
  const outer = R - RIM;
  const p = (angle: number, radius: number) =>
    `${R + radius * Math.cos(angle)} ${R + radius * Math.sin(angle)}`;
  const large = sweep > Math.PI ? 1 : 0;
  return [
    `M ${p(start, inner)}`,
    `L ${p(start, outer)}`,
    `A ${outer} ${outer} 0 ${large} 1 ${p(end, outer)}`,
    `L ${p(end, inner)}`,
    `A ${inner} ${inner} 0 ${large} 0 ${p(start, inner)}`,
    'Z',
  ].join(' ');
}

interface Props { visible: boolean; onClose: () => void }

export default function DailyWheel({ visible, onClose }: Props) {
  const { theme, isDark } = useTheme();
  const { language } = useLanguage();
  const { isPro } = useRevenueCat();
  const { showForUnlock } = useRewardedUnlock();

  const lang = (['en', 'ro', 'fr', 'de', 'es'].includes(language) ? language : 'en') as Lang;
  const t = L[lang];

  const canSpin = useWheelStore(s => s.lastSpinDate !== new Date().toISOString().split('T')[0]);
  const canSpinAd = useWheelStore(s => s.canSpinAd());

  const [phase, setPhase] = useState<'idle' | 'spinning' | 'won'>('idle');
  const [prize, setPrize] = useState<WheelPrize | null>(null);
  const [bonus, setBonus] = useState(false);
  const [oddsOpen, setOddsOpen] = useState(false);

  const rotation = useRef(new Animated.Value(0)).current;
  const turns = useRef(0);
  const resultScale = useRef(new Animated.Value(0.9)).current;
  const resultOpacity = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0)).current;

  const prizes = bonus ? AD_WHEEL_PRIZES : WHEEL_PRIZES;

  // Reset when the sheet reopens, so yesterday's result isn't still on screen.
  useEffect(() => {
    if (!visible) return;
    setPhase('idle'); setPrize(null); setBonus(false);
    resultOpacity.setValue(0); resultScale.setValue(0.9); glow.setValue(0);
  }, [visible]);

  const award = useCallback((p: WheelPrize, source: 'free' | 'ad') => {
    switch (p.kind) {
      case 'xp':
        // Despite the name this is the store's general XP adder — it also handles the
        // monthly reset, which a raw `totalXP + n` would skip.
        try { useGamificationStore.getState().addQuizXP(p.value, isPro); } catch { }
        break;
      case 'pro_days':
        // Reuses the referral-pass timestamp, which is already OR'd into isPro and
        // already stacks days. The ad wheel never reaches this branch.
        try { useCoinStore.getState().grantReferralDays(p.value); } catch { }
        break;
      case 'streak_shield':
        useWheelStore.getState().addShield();
        break;
      case 'future_days':
        useFutureDaysStore.getState().unlock();
        break;
      case 'map_layer': {
        const layer = AD_LAYER_POOL[Math.floor(Math.random() * AD_LAYER_POOL.length)];
        useMapLayerPassStore.getState().unlock(layer);
        break;
      }
    }
    useWheelStore.getState().recordSpin(p.id, source);
    analytics.capture('wheel_spun', {
      prize_id: p.id, kind: p.kind, value: p.value, source, is_pro: isPro,
    });
  }, [isPro]);

  const runSpin = useCallback((source: 'free' | 'ad') => {
    if (phase === 'spinning') return;
    const pool = source === 'ad' ? AD_WHEEL_PRIZES : WHEEL_PRIZES;
    const won = drawPrize(pool);
    const index = pool.indexOf(won);
    const sweep = 360 / pool.length;

    // Land mid-segment, with a little jitter so the pointer doesn't stop at the exact
    // same pixel every time — a wheel that always settles dead-centre looks scripted.
    const jitter = (Math.random() - 0.5) * sweep * 0.55;
    const target = -(index * sweep + sweep / 2 + jitter);
    // Always spin forward from wherever it stopped last time.
    const full = 360 * (5 + Math.floor(Math.random() * 2));
    const to = turns.current + full + ((target - (turns.current % 360)) % 360);

    setPhase('spinning');
    setPrize(null);
    haptic('medium');

    Animated.sequence([
      Animated.timing(rotation, {
        toValue: to,
        duration: 4200,
        // Heavy overshoot then settle — a weighted dial, not a spring toy.
        easing: Easing.bezier(0.15, 0.9, 0.12, 1),
        useNativeDriver: true,
      }),
      Animated.timing(rotation, {
        toValue: to - 2.2,
        duration: 340,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (!finished) return;
      turns.current = to - 2.2;
      setPrize(won);
      setPhase('won');
      award(won, source);
      haptic(won.rare ? 'success' : 'light');

      Animated.parallel([
        Animated.spring(resultScale, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }),
        Animated.timing(resultOpacity, { toValue: 1, duration: 320, useNativeDriver: true }),
      ]).start();

      if (won.rare) {
        Animated.loop(
          Animated.sequence([
            Animated.timing(glow, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
            Animated.timing(glow, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          ]),
        ).start();
      }
    });
  }, [phase, award, rotation, resultScale, resultOpacity, glow]);

  const onBonus = useCallback(() => {
    haptic('medium');
    showForUnlock(() => {
      setBonus(true);
      setPhase('idle');
      setPrize(null);
      resultOpacity.setValue(0);
      resultScale.setValue(0.9);
      glow.setValue(0);
      setTimeout(() => runSpin('ad'), 260);
    }, 'wheel_bonus');
  }, [showForUnlock, runSpin, resultOpacity, resultScale, glow]);

  const gold = theme.gold ?? '#D4A843';
  const bg = isDark ? '#0C0A08' : '#FBF8F1';
  const hairline = isDark ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.08)';

  const spin = rotation.interpolate({ inputRange: [0, 360], outputRange: ['0deg', '360deg'] });
  const glowOpacity = glow.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.85] });

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={[s.overlay, { backgroundColor: isDark ? 'rgba(0,0,0,0.88)' : 'rgba(20,15,5,0.55)' }]}>
        <View style={[s.card, { backgroundColor: bg, borderColor: gold + '2E' }]}>

          <Pressable
            onPress={() => { haptic('light'); onClose(); }}
            hitSlop={14}
            accessibilityRole="button"
            accessibilityLabel={t.close}
            style={[s.close, { borderColor: hairline }]}
          >
            <X size={15} color={theme.subtext} strokeWidth={2.4} />
          </Pressable>

          <Text style={[s.kicker, { color: gold }]}>{bonus ? t.bonusTitle : t.sub}</Text>
          <Text style={[s.title, { color: theme.text }]}>{t.title}</Text>

          <View style={s.dialWrap}>
            {/* Rare-win halo. Sits under the dial so it reads as light behind brass. */}
            {prize?.rare && (
              <Animated.View
                pointerEvents="none"
                style={[s.halo, { backgroundColor: gold, opacity: glowOpacity }]}
              />
            )}

            <Animated.View style={{ transform: [{ rotate: spin }] }}>
              <Svg width={SIZE} height={SIZE}>
                <Circle cx={R} cy={R} r={R - 1} fill={isDark ? '#141009' : '#F0E8D6'} />
                <Circle cx={R} cy={R} r={R - 3} fill="none" stroke={gold} strokeWidth={2.5} opacity={0.85} />
                <G>
                  {prizes.map((p, i) => {
                    const sweep = 360 / prizes.length;
                    const mid = i * sweep + sweep / 2 - 90;
                    const rad = (mid * Math.PI) / 180;
                    const lr = R - RIM - 42;
                    return (
                      <G key={p.id}>
                        <Path
                          d={segmentPath(i, prizes.length)}
                          fill={p.color}
                          stroke={p.rare ? gold : hairline}
                          strokeWidth={p.rare ? 1.6 : 0.6}
                        />
                        <SvgText
                          x={R + lr * Math.cos(rad)}
                          y={R + lr * Math.sin(rad) + 5}
                          fill={p.rare ? gold : 'rgba(255,255,255,0.82)'}
                          fontSize={p.value >= 365 ? 13 : 15}
                          fontWeight="700"
                          fontFamily={SERIF}
                          textAnchor="middle"
                        >
                          {segmentLabel(p, t)}
                        </SvgText>
                      </G>
                    );
                  })}
                </G>
                <Circle cx={R} cy={R} r={RIM + 5} fill={isDark ? '#1A1408' : '#E8DCC2'} stroke={gold} strokeWidth={1.8} />
              </Svg>
            </Animated.View>

            {/* Fixed pointer at twelve o'clock — the wheel turns under it. */}
            <View style={[s.pointer, { borderTopColor: gold }]} pointerEvents="none" />
          </View>

          {/* Result */}
          {phase === 'won' && prize && (
            <Animated.View style={[s.result, { opacity: resultOpacity, transform: [{ scale: resultScale }] }]}>
              <Text style={[s.wonLabel, { color: theme.subtext }]}>{t.won}</Text>
              <Text style={[s.wonPrize, { color: prize.rare ? gold : theme.text }]}>
                {prizeLabel(prize, t)}
              </Text>
              {prize.kind === 'streak_shield' && <Text style={[s.wonSub, { color: theme.subtext }]}>{t.shieldDesc}</Text>}
              {prize.kind === 'future_days' && <Text style={[s.wonSub, { color: theme.subtext }]}>{t.futureDesc}</Text>}
              {prize.kind === 'map_layer' && <Text style={[s.wonSub, { color: theme.subtext }]}>{t.layerDesc}</Text>}
              {prize.kind === 'pro_days' && <Text style={[s.wonSub, { color: theme.subtext }]}>{t.proNote}</Text>}
            </Animated.View>
          )}

          {/* Action */}
          <View style={s.actions}>
            {phase !== 'won' && canSpin && (
              <Pressable
                onPress={() => runSpin('free')}
                disabled={phase === 'spinning'}
                accessibilityRole="button"
                style={({ pressed }) => [s.cta, { opacity: phase === 'spinning' ? 0.55 : pressed ? 0.85 : 1 }]}
              >
                <LinearGradient colors={[gold, '#A9791F']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.ctaBg}>
                  <Sparkles size={16} color="#1A1408" strokeWidth={2.4} />
                  <Text style={s.ctaText}>{phase === 'spinning' ? t.spinning : t.spin}</Text>
                </LinearGradient>
              </Pressable>
            )}

            {phase === 'won' && !bonus && canSpinAd && (
              <Pressable
                onPress={onBonus}
                accessibilityRole="button"
                style={({ pressed }) => [s.secondary, { borderColor: gold + '55', opacity: pressed ? 0.8 : 1 }]}
              >
                <Text style={[s.secondaryText, { color: gold }]}>{t.bonusCta}</Text>
              </Pressable>
            )}

            {phase === 'idle' && !canSpin && (
              <Text style={[s.comeBack, { color: theme.subtext }]}>{t.comeBack}</Text>
            )}
          </View>

          <Pressable onPress={() => { haptic('light'); setOddsOpen(true); }} hitSlop={10} accessibilityRole="button">
            <Text style={[s.oddsLink, { color: theme.subtext }]}>{t.odds}</Text>
          </Pressable>
        </View>
      </View>

      {/* Odds — required disclosure for this mechanic, and generated straight from the
          prize table so the printed numbers can never drift from the real ones. */}
      <Modal visible={oddsOpen} transparent animationType="slide" statusBarTranslucent onRequestClose={() => setOddsOpen(false)}>
        <View style={[s.overlay, { backgroundColor: 'rgba(0,0,0,0.9)' }]}>
          <View style={[s.card, { backgroundColor: bg, borderColor: gold + '2E', maxHeight: '82%' }]}>
            <Pressable onPress={() => setOddsOpen(false)} hitSlop={14} style={[s.close, { borderColor: hairline }]} accessibilityRole="button" accessibilityLabel={t.close}>
              <X size={15} color={theme.subtext} strokeWidth={2.4} />
            </Pressable>
            <Text style={[s.title, { color: theme.text, marginBottom: 14 }]}>{t.oddsTitle}</Text>
            <ScrollView style={{ alignSelf: 'stretch' }} contentContainerStyle={{ paddingBottom: 8 }}>
              {WHEEL_PRIZES.map(p => (
                <View key={p.id} style={[s.oddsRow, { borderBottomColor: hairline }]}>
                  <View style={[s.oddsSwatch, { backgroundColor: p.color, borderColor: p.rare ? gold : hairline }]} />
                  <Text style={[s.oddsName, { color: p.rare ? gold : theme.text }]}>{prizeLabel(p, t)}</Text>
                  <Text style={[s.oddsPct, { color: theme.subtext }]}>{oddsPercent(p)}</Text>
                </View>
              ))}
              <Text style={[s.oddsNote, { color: theme.subtext }]}>{t.oddsNote}</Text>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 22 },
  card: {
    width: '100%', maxWidth: 380, borderRadius: 26, borderWidth: 1,
    paddingHorizontal: 22, paddingTop: 26, paddingBottom: 20, alignItems: 'center',
  },
  close: {
    position: 'absolute', top: 13, right: 13, width: 30, height: 30,
    borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center', zIndex: 5,
  },
  kicker: { fontSize: 10.5, fontWeight: '700', letterSpacing: 1.9, textTransform: 'uppercase', marginBottom: 5 },
  title: { fontSize: 25, fontFamily: SERIF, fontWeight: '600', letterSpacing: -0.3, marginBottom: 18, textAlign: 'center' },

  dialWrap: { width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' },
  halo: { position: 'absolute', width: SIZE + 42, height: SIZE + 42, borderRadius: (SIZE + 42) / 2 },
  pointer: {
    position: 'absolute', top: -3, width: 0, height: 0,
    borderLeftWidth: 10, borderRightWidth: 10, borderTopWidth: 21,
    borderLeftColor: 'transparent', borderRightColor: 'transparent',
  },

  result: { alignItems: 'center', marginTop: 18 },
  wonLabel: { fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: '600' },
  wonPrize: { fontSize: 27, fontFamily: SERIF, fontWeight: '700', letterSpacing: -0.4, marginTop: 3 },
  wonSub: { fontSize: 12.5, marginTop: 5, textAlign: 'center', lineHeight: 17, maxWidth: 260 },

  actions: { marginTop: 20, minHeight: 52, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center' },
  cta: { alignSelf: 'stretch', borderRadius: 15, overflow: 'hidden' },
  ctaBg: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15 },
  ctaText: { color: '#1A1408', fontSize: 15.5, fontWeight: '800', letterSpacing: 0.3 },
  secondary: { alignSelf: 'stretch', borderWidth: 1, borderRadius: 15, paddingVertical: 13, alignItems: 'center' },
  secondaryText: { fontSize: 13.5, fontWeight: '700' },
  comeBack: { fontSize: 13.5, fontStyle: 'italic' },

  oddsLink: { fontSize: 11.5, marginTop: 14, textDecorationLine: 'underline' },
  oddsRow: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 11, borderBottomWidth: StyleSheet.hairlineWidth },
  oddsSwatch: { width: 13, height: 13, borderRadius: 3, borderWidth: 1 },
  oddsName: { flex: 1, fontSize: 14, fontWeight: '600' },
  oddsPct: { fontSize: 13, fontVariant: ['tabular-nums'] },
  oddsNote: { fontSize: 11.5, lineHeight: 16.5, marginTop: 14, fontStyle: 'italic' },
});
