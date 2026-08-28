// components/ParallelUniverse.tsx
// "Parallel Universes" — a branching what-if game built on a real event.
//
// Three decisions, four world meters that trade against each other, one of eight
// endings. The pipeline generates the tree (engine/parallel.py); this runs it.
//
// The design principle throughout: show consequence, never state it. The meters move
// visibly on every choice, the timeline you are building draws itself down the left
// edge, and the ending compares your world to the real one on a radar rather than
// telling you it went badly. A line of text saying "freedom decreased" is worth less
// than a bar that visibly falls.
//
// Everything on the native driver except the radar reveal, which is a one-off rAF
// sweep — SVG polygon points cannot be driven natively, and animating it through
// Animated listeners would setState on every frame for the whole run.
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { X } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated, Dimensions, Easing, Modal, Platform, Pressable,
  ScrollView, StyleSheet, Text, View,
} from 'react-native';
import Svg, { Circle, Line, Polygon } from 'react-native-svg';

import { useLanguage } from '../context/LanguageContext';
import { useRevenueCat } from '../context/RevenueCatContext';
import { useTheme } from '../context/ThemeContext';
import * as analytics from '../src/analytics/posthog';
import { usePaywallStore } from '../store/usePaywallStore';
import { useDiscovered, useParallelStore, useRunsLeft } from '../store/useParallelStore';
import { haptic } from '../utils/haptics';

const { width: W } = Dimensions.get('window');
const SERIF = Platform.OS === 'ios' ? 'Georgia' : 'serif';

// ─── Shape of the JSON the pipeline produces ─────────────────────────────────
interface Effects { stability: number; lives: number; progress: number; freedom: number }
interface Choice { id: string; label: string; detail: string; effects: Effects; next: string }
interface Node {
  id: string; year: string; title: string; text: string;
  choices: Choice[]; verdict: string; epitaph: string; rarity: string;
}
interface Universe {
  pivotYear: string; pivotTitle: string; premise: string; root: string; nodes: Node[];
}

type MeterKey = keyof Effects;
const METERS: MeterKey[] = ['stability', 'lives', 'progress', 'freedom'];

/** Reality is the midpoint. Every meter starts here and the radar compares back to it. */
const BASELINE = 50;

const METER_COLOR: Record<MeterKey, string> = {
  stability: '#4A90D9',
  lives: '#3FA97A',
  progress: '#9B7BD4',
  freedom: '#E0A33C',
};
const METER_ICON: Record<MeterKey, React.ComponentProps<typeof MaterialCommunityIcons>['name']> = {
  stability: 'shield-crown',
  lives: 'heart-pulse',
  progress: 'flask',
  freedom: 'bird',
};

type Lang = 'en' | 'ro' | 'fr' | 'de' | 'es';

const L: Record<Lang, Record<string, string>> = {
  en: {
    kicker: 'PARALLEL UNIVERSES', reality: 'What really happened',
    begin: 'Change it', decision: 'Decision', of: 'of',
    stability: 'Stability', lives: 'Lives', progress: 'Progress', freedom: 'Freedom',
    yourWorld: 'Your world', realWorld: 'The real world',
    divergence: 'Divergence from reality', timeline: 'Your timeline',
    discovered: 'timelines discovered', again: 'Run it again', done: 'Close',
    rare: 'RARE', uncommon: 'UNCOMMON', common: 'COMMON',
    noRuns: 'You have used today\'s run', proUnlimited: 'PRO plays as often as it likes',
    getPro: 'Unlock unlimited runs', locked: 'Come back tomorrow',
    preview: 'PRO sees the cost before choosing', already: 'Found before',
    firstTime: 'New timeline',
  },
  ro: {
    kicker: 'UNIVERSURI PARALELE', reality: 'Ce s-a întâmplat cu adevărat',
    begin: 'Schimbă', decision: 'Decizia', of: 'din',
    stability: 'Stabilitate', lives: 'Vieți', progress: 'Progres', freedom: 'Libertate',
    yourWorld: 'Lumea ta', realWorld: 'Lumea reală',
    divergence: 'Abatere de la realitate', timeline: 'Cronologia ta',
    discovered: 'cronologii descoperite', again: 'Încearcă din nou', done: 'Închide',
    rare: 'RAR', uncommon: 'NEOBIȘNUIT', common: 'OBIȘNUIT',
    noRuns: 'Ți-ai folosit rularea de azi', proUnlimited: 'PRO joacă oricât vrea',
    getPro: 'Deblochează rulări nelimitate', locked: 'Revino mâine',
    preview: 'PRO vede costul înainte să aleagă', already: 'Găsită deja',
    firstTime: 'Cronologie nouă',
  },
  fr: {
    kicker: 'UNIVERS PARALLÈLES', reality: 'Ce qui est vraiment arrivé',
    begin: 'Changer', decision: 'Décision', of: 'sur',
    stability: 'Stabilité', lives: 'Vies', progress: 'Progrès', freedom: 'Liberté',
    yourWorld: 'Votre monde', realWorld: 'Le monde réel',
    divergence: 'Écart avec la réalité', timeline: 'Votre chronologie',
    discovered: 'chronologies découvertes', again: 'Recommencer', done: 'Fermer',
    rare: 'RARE', uncommon: 'PEU COMMUN', common: 'COMMUN',
    noRuns: 'Vous avez utilisé votre tour du jour', proUnlimited: 'PRO joue autant qu\'il veut',
    getPro: 'Débloquer les parties illimitées', locked: 'Revenez demain',
    preview: 'PRO voit le coût avant de choisir', already: 'Déjà trouvée',
    firstTime: 'Nouvelle chronologie',
  },
  de: {
    kicker: 'PARALLELE WELTEN', reality: 'Was wirklich geschah',
    begin: 'Ändere es', decision: 'Entscheidung', of: 'von',
    stability: 'Stabilität', lives: 'Leben', progress: 'Fortschritt', freedom: 'Freiheit',
    yourWorld: 'Deine Welt', realWorld: 'Die echte Welt',
    divergence: 'Abweichung von der Realität', timeline: 'Deine Zeitlinie',
    discovered: 'Zeitlinien entdeckt', again: 'Nochmal spielen', done: 'Schließen',
    rare: 'SELTEN', uncommon: 'UNGEWÖHNLICH', common: 'GEWÖHNLICH',
    noRuns: 'Dein heutiger Durchgang ist verbraucht', proUnlimited: 'PRO spielt so oft es will',
    getPro: 'Unbegrenzte Durchgänge freischalten', locked: 'Komm morgen wieder',
    preview: 'PRO sieht die Kosten vor der Wahl', already: 'Schon gefunden',
    firstTime: 'Neue Zeitlinie',
  },
  es: {
    kicker: 'UNIVERSOS PARALELOS', reality: 'Lo que realmente pasó',
    begin: 'Cámbialo', decision: 'Decisión', of: 'de',
    stability: 'Estabilidad', lives: 'Vidas', progress: 'Progreso', freedom: 'Libertad',
    yourWorld: 'Tu mundo', realWorld: 'El mundo real',
    divergence: 'Desviación de la realidad', timeline: 'Tu cronología',
    discovered: 'cronologías descubiertas', again: 'Jugar otra vez', done: 'Cerrar',
    rare: 'RARO', uncommon: 'POCO COMÚN', common: 'COMÚN',
    noRuns: 'Ya usaste tu partida de hoy', proUnlimited: 'PRO juega cuantas veces quiera',
    getPro: 'Desbloquear partidas ilimitadas', locked: 'Vuelve mañana',
    preview: 'PRO ve el coste antes de elegir', already: 'Ya encontrada',
    firstTime: 'Cronología nueva',
  },
};

/** Parse the per-language blob the backend passes through untouched. */
function pickUniverse(raw: string | null | undefined, lang: string): Universe | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    const u = parsed?.[lang] ?? parsed?.en;
    return u && Array.isArray(u.nodes) && u.nodes.length ? (u as Universe) : null;
  } catch {
    return null;
  }
}

const clamp = (n: number) => Math.max(0, Math.min(100, n));

// ═════════════════════════════════════════════════════════════════════════════
// WORLD METERS — four bars that trade against each other
// ═════════════════════════════════════════════════════════════════════════════
const BAR_W = 62;

function Meter({ k, value, delta, label, isDark }: {
  k: MeterKey; value: number; delta: number | null; label: string; isDark: boolean;
}) {
  const color = METER_COLOR[k];
  const fill = useRef(new Animated.Value(value / 100)).current;
  const floatY = useRef(new Animated.Value(0)).current;
  const floatOp = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Overshoot slightly and settle. A bar that slides linearly to its new value reads
    // as a progress indicator; one that springs reads as a reaction.
    Animated.spring(fill, {
      toValue: value / 100, tension: 52, friction: 9, useNativeDriver: true,
    }).start();
  }, [value, fill]);

  useEffect(() => {
    if (delta === null || delta === 0) return;
    floatY.setValue(0); floatOp.setValue(0);
    Animated.sequence([
      Animated.parallel([
        Animated.timing(floatOp, { toValue: 1, duration: 160, useNativeDriver: true }),
        Animated.timing(floatY, { toValue: -16, duration: 520, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      ]),
      Animated.timing(floatOp, { toValue: 0, duration: 420, useNativeDriver: true }),
    ]).start();
  }, [delta, floatY, floatOp]);

  // scaleX anchors at the centre, so translate back by half the lost width to pin it left.
  const scaleX = fill;
  const shift = fill.interpolate({ inputRange: [0, 1], outputRange: [-BAR_W / 2, 0] });

  return (
    <View style={m.wrap}>
      <MaterialCommunityIcons name={METER_ICON[k]} size={13} color={color} />
      <View style={[m.track, { backgroundColor: isDark ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.08)' }]}>
        <Animated.View
          style={[
            m.fill,
            { backgroundColor: color, width: BAR_W, transform: [{ translateX: shift }, { scaleX }] },
          ]}
        />
        {/* Reality sits at the midpoint — the notch is what makes a bar readable as
            "above or below what actually happened" rather than just a quantity. */}
        <View style={[m.notch, { backgroundColor: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.3)' }]} />
      </View>
      <Text style={[m.label, { color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)' }]} numberOfLines={1}>
        {label}
      </Text>
      {delta !== null && delta !== 0 && (
        <Animated.Text
          style={[
            m.delta,
            { color: delta > 0 ? color : '#D9603F', opacity: floatOp, transform: [{ translateY: floatY }] },
          ]}
        >
          {delta > 0 ? `+${delta}` : delta}
        </Animated.Text>
      )}
    </View>
  );
}

const m = StyleSheet.create({
  wrap: { alignItems: 'center', width: BAR_W + 8 },
  track: { width: BAR_W, height: 6, borderRadius: 3, marginTop: 5, overflow: 'hidden', justifyContent: 'center' },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 3 },
  notch: { position: 'absolute', left: BAR_W / 2 - 0.5, width: 1, top: 0, bottom: 0 },
  label: { fontSize: 8, letterSpacing: 0.5, marginTop: 4, textTransform: 'uppercase', fontWeight: '700' },
  delta: { position: 'absolute', top: -4, fontSize: 12, fontWeight: '900', fontVariant: ['tabular-nums'] },
});

// ═════════════════════════════════════════════════════════════════════════════
// BRANCH SPINE — the timeline you are building, down the left edge
// ═════════════════════════════════════════════════════════════════════════════
function Spine({ steps, total, gold, isDark }: {
  steps: number; total: number; gold: string; isDark: boolean;
}) {
  return (
    <View style={sp.wrap} pointerEvents="none">
      {Array.from({ length: total }).map((_, i) => {
        const done = i < steps;
        const current = i === steps;
        return (
          <View key={i} style={sp.seg}>
            <SpineDot done={done} current={current} gold={gold} isDark={isDark} />
            {i < total - 1 && (
              <View style={[sp.line, {
                backgroundColor: done ? gold : (isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)'),
              }]} />
            )}
          </View>
        );
      })}
    </View>
  );
}

function SpineDot({ done, current, gold, isDark }: {
  done: boolean; current: boolean; gold: string; isDark: boolean;
}) {
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!current) return;
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 780, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0, duration: 780, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    loop.start();
    return () => { loop.stop(); pulse.setValue(0); };
  }, [current, pulse]);

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.45] });
  const idle = isDark ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.14)';

  return (
    <Animated.View
      style={[
        sp.dot,
        {
          backgroundColor: done || current ? gold : idle,
          transform: [{ scale: current ? scale : 1 }],
        },
      ]}
    />
  );
}

const sp = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, top: 4, alignItems: 'center', width: 18 },
  seg: { alignItems: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4 },
  line: { width: 2, height: 34, marginVertical: 2, borderRadius: 1 },
});

// ═════════════════════════════════════════════════════════════════════════════
// RADAR — your world against the real one
// ═════════════════════════════════════════════════════════════════════════════
const RAD = 96;

function Radar({ values, gold, isDark, t }: {
  values: Record<MeterKey, number>; gold: string; isDark: boolean; t: Record<string, string>;
}) {
  // One-off reveal. SVG polygon points cannot be driven natively, so this sweeps with
  // rAF for ~700ms rather than putting an Animated listener on every frame of the run.
  const [p, setP] = useState(0);
  useEffect(() => {
    let raf = 0; const start = Date.now();
    const tick = () => {
      const k = Math.min(1, (Date.now() - start) / 700);
      setP(1 - Math.pow(1 - k, 3));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const c = RAD;
  const pt = (i: number, r: number) => {
    const a = (i * 90 - 90) * (Math.PI / 180);
    return [c + r * Math.cos(a), c + r * Math.sin(a)];
  };
  const poly = (get: (k: MeterKey) => number) =>
    METERS.map((k, i) => pt(i, (get(k) / 100) * (RAD - 16)).join(',')).join(' ');

  const grid = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.09)';
  const realColor = isDark ? '#7A8A94' : '#8A97A0';

  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={RAD * 2} height={RAD * 2}>
        {[0.25, 0.5, 0.75, 1].map(r => (
          <Polygon
            key={r}
            points={METERS.map((_, i) => pt(i, r * (RAD - 16)).join(',')).join(' ')}
            fill="none" stroke={grid} strokeWidth={1}
          />
        ))}
        {METERS.map((_, i) => {
          const [x, y] = pt(i, RAD - 16);
          return <Line key={i} x1={c} y1={c} x2={x} y2={y} stroke={grid} strokeWidth={1} />;
        })}

        {/* Reality first, underneath — your world is drawn over it. */}
        <Polygon points={poly(() => BASELINE)} fill={realColor + '22'} stroke={realColor} strokeWidth={1.5} />
        <Polygon
          points={poly(k => BASELINE + (values[k] - BASELINE) * p)}
          fill={gold + '2E'} stroke={gold} strokeWidth={2.2}
        />
        {METERS.map((k, i) => {
          const [x, y] = pt(i, ((BASELINE + (values[k] - BASELINE) * p) / 100) * (RAD - 16));
          return <Circle key={k} cx={x} cy={y} r={3.4} fill={METER_COLOR[k]} />;
        })}
      </Svg>
      <View style={r_.legend}>
        {METERS.map((k, i) => {
          const [x, y] = pt(i, RAD - 4);
          return (
            <View key={k} style={[r_.tag, { left: x - 30, top: y - 8 }]}>
              <Text style={[r_.tagText, { color: METER_COLOR[k] }]} numberOfLines={1}>
                {t[k]}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const r_ = StyleSheet.create({
  legend: { position: 'absolute', width: RAD * 2, height: RAD * 2 },
  tag: { position: 'absolute', width: 60, alignItems: 'center' },
  tagText: { fontSize: 8.5, fontWeight: '800', letterSpacing: 0.6, textTransform: 'uppercase' },
});

// ═════════════════════════════════════════════════════════════════════════════
// CHOICE CARD
// ═════════════════════════════════════════════════════════════════════════════
function ChoiceCard({ choice, onPick, disabled, exiting, chosen, showEffects, gold, theme, isDark, delay }: {
  choice: Choice; onPick: () => void; disabled: boolean; exiting: boolean; chosen: boolean;
  showEffects: boolean; gold: string; theme: any; isDark: boolean; delay: number;
}) {
  const enter = useRef(new Animated.Value(0)).current;
  const exit = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(enter, {
      toValue: 1, tension: 58, friction: 10, delay, useNativeDriver: true,
    }).start();
  }, [enter, delay]);

  useEffect(() => {
    if (!exiting) return;
    Animated.timing(exit, {
      toValue: 1, duration: 340, easing: Easing.in(Easing.cubic), useNativeDriver: true,
    }).start();
  }, [exiting, exit]);

  // The chosen card swells and holds; the other slides off. The asymmetry is the point —
  // you should feel which door you walked through.
  const scale = Animated.multiply(
    enter.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }),
    exit.interpolate({ inputRange: [0, 1], outputRange: [1, chosen ? 1.04 : 0.9] }),
  );
  const translateX = exit.interpolate({ inputRange: [0, 1], outputRange: [0, chosen ? 0 : -W] });
  const opacity = Animated.multiply(
    enter,
    exit.interpolate({ inputRange: [0, 1], outputRange: [1, chosen ? 1 : 0] }),
  );

  return (
    <Animated.View style={{ opacity, transform: [{ scale }, { translateX }] }}>
      <Pressable
        onPress={onPick}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={choice.label}
        style={({ pressed }) => [
          cc.card,
          {
            borderColor: chosen ? gold : (isDark ? 'rgba(255,255,255,0.11)' : 'rgba(0,0,0,0.1)'),
            backgroundColor: chosen ? gold + '14' : (isDark ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.025)'),
            opacity: pressed ? 0.85 : 1,
          },
        ]}
      >
        <Text style={[cc.label, { color: theme.text }]}>{choice.label}</Text>
        <Text style={[cc.detail, { color: theme.subtext }]}>{choice.detail}</Text>

        {showEffects && (
          <View style={cc.chips}>
            {METERS.filter(k => choice.effects[k] !== 0).map(k => (
              <View key={k} style={[cc.chip, { borderColor: METER_COLOR[k] + '55', backgroundColor: METER_COLOR[k] + '14' }]}>
                <MaterialCommunityIcons name={METER_ICON[k]} size={10} color={METER_COLOR[k]} />
                <Text style={[cc.chipText, { color: METER_COLOR[k] }]}>
                  {choice.effects[k] > 0 ? `+${choice.effects[k]}` : choice.effects[k]}
                </Text>
              </View>
            ))}
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

const cc = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 15, padding: 15, marginBottom: 11 },
  label: { fontSize: 16.5, fontWeight: '700', letterSpacing: -0.25, marginBottom: 4 },
  detail: { fontSize: 13, lineHeight: 18.5 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 11 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 3, borderWidth: 1, borderRadius: 7, paddingHorizontal: 7, paddingVertical: 3 },
  chipText: { fontSize: 11, fontWeight: '800', fontVariant: ['tabular-nums'] },
});

// ═════════════════════════════════════════════════════════════════════════════
// THE GAME
// ═════════════════════════════════════════════════════════════════════════════
interface Props { visible: boolean; onClose: () => void; event: any }

export default function ParallelUniverse({ visible, onClose, event }: Props) {
  const { theme, isDark } = useTheme();
  const { language } = useLanguage();
  const { isPro, presentPaywall } = useRevenueCat();

  const lang = (['en', 'ro', 'fr', 'de', 'es'].includes(language) ? language : 'en') as Lang;
  const t = L[lang];
  const gold = theme.gold ?? '#D4A843';
  const eventId = String(event?.id ?? '');

  const universe = useMemo(
    () => pickUniverse(event?.parallelUniverse, lang),
    [event?.parallelUniverse, lang],
  );
  const byId = useMemo(
    () => Object.fromEntries((universe?.nodes ?? []).map(n => [n.id, n])),
    [universe],
  );
  const endings = useMemo(
    () => (universe?.nodes ?? []).filter(n => !n.choices?.length),
    [universe],
  );

  const discovered = useDiscovered(eventId);
  const runsLeft = useRunsLeft(isPro);

  const [phase, setPhase] = useState<'intro' | 'play' | 'end'>('intro');
  const [nodeId, setNodeId] = useState<string>('');
  const [meters, setMeters] = useState<Record<MeterKey, number>>({
    stability: BASELINE, lives: BASELINE, progress: BASELINE, freedom: BASELINE,
  });
  const [deltas, setDeltas] = useState<Record<MeterKey, number> | null>(null);
  const [route, setRoute] = useState<string[]>([]);
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [wasNew, setWasNew] = useState(false);

  const bodyFade = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!visible) return;
    setPhase('intro'); setNodeId(''); setRoute([]); setPickedId(null); setWasNew(false);
    setMeters({ stability: BASELINE, lives: BASELINE, progress: BASELINE, freedom: BASELINE });
    setDeltas(null);
    bodyFade.setValue(1);
  }, [visible, bodyFade]);

  const node: Node | undefined = byId[nodeId];
  const step = route.length;

  const begin = useCallback(() => {
    if (!universe) return;
    if (!isPro && runsLeft <= 0) {
      usePaywallStore.getState().registerProStoryTap();
      presentPaywall('parallel_runs_out');
      return;
    }
    haptic('medium');
    useParallelStore.getState().startRun();
    analytics.capture('parallel_started', { event_id: eventId, is_pro: isPro });
    setNodeId(universe.root);
    setPhase('play');
  }, [universe, isPro, runsLeft, presentPaywall, eventId]);

  const pick = useCallback((choice: Choice) => {
    if (pickedId) return;
    haptic('medium');
    setPickedId(choice.id);

    const next = { ...meters };
    const d: Record<MeterKey, number> = { stability: 0, lives: 0, progress: 0, freedom: 0 };
    for (const k of METERS) {
      d[k] = choice.effects[k];
      next[k] = clamp(next[k] + choice.effects[k]);
    }

    // Meters move while the cards are still leaving, so cause and effect land together.
    setTimeout(() => { setMeters(next); setDeltas(d); }, 120);

    setTimeout(() => {
      Animated.timing(bodyFade, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => {
        const target = byId[choice.next];
        setRoute(r => [...r, choice.id]);
        setPickedId(null);
        setDeltas(null);
        setNodeId(choice.next);
        if (target && !target.choices?.length) {
          const isNew = !discovered.includes(target.id);
          setWasNew(isNew);
          useParallelStore.getState().recordEnding(eventId, target.id);
          analytics.capture('parallel_ending', {
            event_id: eventId, ending_id: target.id, rarity: target.rarity,
            is_new: isNew, is_pro: isPro,
            divergence: METERS.reduce((s, k) => s + Math.abs(next[k] - BASELINE), 0),
          });
          haptic(target.rarity === 'rare' ? 'success' : 'light');
          setPhase('end');
        }
        Animated.timing(bodyFade, { toValue: 1, duration: 260, useNativeDriver: true }).start();
      });
    }, 620);
  }, [pickedId, meters, byId, bodyFade, discovered, eventId, isPro]);

  if (!universe) return null;

  const divergence = Math.round(
    (METERS.reduce((s, k) => s + Math.abs(meters[k] - BASELINE), 0) / (METERS.length * BASELINE)) * 100,
  );
  const rarityLabel = (r: string) => t[r] ?? t.common;
  const rarityColor = (r: string) =>
    r === 'rare' ? gold : r === 'uncommon' ? '#9B7BD4' : theme.subtext;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose} statusBarTranslucent>
      <View style={[g.root, { backgroundColor: isDark ? '#08070A' : '#FAF8F3' }]}>
        <LinearGradient
          colors={isDark ? ['#12101A', '#08070A'] : ['#FFFDF7', '#F2EFE6']}
          style={StyleSheet.absoluteFill}
        />

        <Pressable onPress={() => { haptic('light'); onClose(); }} hitSlop={14}
          accessibilityRole="button" accessibilityLabel={t.done}
          style={[g.close, { borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)' }]}>
          <X size={16} color={theme.subtext} strokeWidth={2.4} />
        </Pressable>

        <ScrollView contentContainerStyle={g.scroll} showsVerticalScrollIndicator={false}>
          <Text style={[g.kicker, { color: gold }]}>{t.kicker}</Text>

          {/* ── INTRO ───────────────────────────────────────────────── */}
          {phase === 'intro' && (
            <>
              <Text style={[g.pivotYear, { color: theme.subtext }]}>{universe.pivotYear}</Text>
              <Text style={[g.title, { color: theme.text }]}>{universe.pivotTitle}</Text>

              <View style={[g.realityBox, { borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.09)' }]}>
                <Text style={[g.realityLabel, { color: theme.subtext }]}>{t.reality}</Text>
                <Text style={[g.realityText, { color: theme.text }]}>{universe.premise}</Text>
              </View>

              <CollectionGrid
                endings={endings} discovered={discovered} gold={gold}
                theme={theme} isDark={isDark} t={t}
              />

              {(isPro || runsLeft > 0) ? (
                <Pressable onPress={begin} accessibilityRole="button"
                  style={({ pressed }) => [g.cta, { opacity: pressed ? 0.86 : 1 }]}>
                  <LinearGradient colors={[gold, '#A9791F']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={g.ctaBg}>
                    <MaterialCommunityIcons name="directions-fork" size={19} color="#1A1408" />
                    <Text style={g.ctaText}>{t.begin}</Text>
                  </LinearGradient>
                </Pressable>
              ) : (
                <View style={g.lockedWrap}>
                  <Text style={[g.lockedText, { color: theme.subtext }]}>{t.noRuns}</Text>
                  <Pressable onPress={() => { haptic('medium'); presentPaywall('parallel_runs_out'); }}
                    accessibilityRole="button"
                    style={({ pressed }) => [g.proBtn, { borderColor: gold + '55', opacity: pressed ? 0.8 : 1 }]}>
                    <MaterialCommunityIcons name="crown" size={15} color={gold} />
                    <Text style={[g.proBtnText, { color: gold }]}>{t.getPro}</Text>
                  </Pressable>
                  <Text style={[g.lockedSub, { color: theme.subtext }]}>{t.proUnlimited}</Text>
                </View>
              )}
            </>
          )}

          {/* ── PLAYING ─────────────────────────────────────────────── */}
          {phase === 'play' && node && (
            <>
              <View style={g.metersRow}>
                {METERS.map(k => (
                  <Meter key={k} k={k} value={meters[k]} delta={deltas?.[k] ?? null}
                    label={t[k]} isDark={isDark} />
                ))}
              </View>

              <Text style={[g.stepLabel, { color: theme.subtext }]}>
                {t.decision} {Math.min(step + 1, 3)} {t.of} 3
              </Text>

              <View style={g.stage}>
                <Spine steps={step} total={4} gold={gold} isDark={isDark} />
                <Animated.View style={{ opacity: bodyFade, paddingLeft: 30 }}>
                  <Text style={[g.year, { color: gold }]}>{node.year}</Text>
                  <Text style={[g.nodeTitle, { color: theme.text }]}>{node.title}</Text>
                  <Text style={[g.nodeText, { color: theme.text }]}>{node.text}</Text>

                  {node.choices.map((c, i) => (
                    <ChoiceCard
                      key={c.id} choice={c} delay={i * 90}
                      onPick={() => pick(c)}
                      disabled={!!pickedId}
                      exiting={!!pickedId}
                      chosen={pickedId === c.id}
                      showEffects={isPro}
                      gold={gold} theme={theme} isDark={isDark}
                    />
                  ))}

                  {!isPro && (
                    <View style={g.previewHint}>
                      <MaterialCommunityIcons name="eye-off-outline" size={12} color={theme.subtext} />
                      <Text style={[g.previewHintText, { color: theme.subtext }]}>{t.preview}</Text>
                    </View>
                  )}
                </Animated.View>
              </View>
            </>
          )}

          {/* ── ENDING ──────────────────────────────────────────────── */}
          {phase === 'end' && node && (
            <Animated.View style={{ opacity: bodyFade }}>
              <RarityBadge rarity={node.rarity} label={rarityLabel(node.rarity)}
                color={rarityColor(node.rarity)} isNew={wasNew} newLabel={t.firstTime} />

              <Text style={[g.year, { color: gold, textAlign: 'center' }]}>{node.year}</Text>
              <Text style={[g.endTitle, { color: theme.text }]}>{node.title}</Text>
              <Text style={[g.nodeText, { color: theme.text, textAlign: 'center' }]}>{node.text}</Text>

              <View style={[g.verdictBox, { borderColor: gold + '3A', backgroundColor: gold + '10' }]}>
                <Text style={[g.verdict, { color: theme.text }]}>{node.verdict}</Text>
              </View>

              <Text style={[g.sectionLabel, { color: theme.subtext }]}>{t.yourWorld}</Text>
              <Radar values={meters} gold={gold} isDark={isDark} t={t} />

              <View style={g.statRow}>
                {METERS.map(k => {
                  const d = meters[k] - BASELINE;
                  return (
                    <View key={k} style={g.statCell}>
                      <Text style={[g.statVal, { color: METER_COLOR[k] }]}>{meters[k]}</Text>
                      <Text style={[g.statDelta, { color: d >= 0 ? METER_COLOR[k] : '#D9603F' }]}>
                        {d > 0 ? `+${d}` : d}
                      </Text>
                      <Text style={[g.statLabel, { color: theme.subtext }]}>{t[k]}</Text>
                    </View>
                  );
                })}
              </View>

              <View style={[g.divergeBox, { borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.09)' }]}>
                <Text style={[g.divergeLabel, { color: theme.subtext }]}>{t.divergence}</Text>
                <Text style={[g.divergeVal, { color: gold }]}>{divergence}%</Text>
                <View style={[g.divergeTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)' }]}>
                  <View style={[g.divergeFill, { width: `${Math.min(100, divergence)}%`, backgroundColor: gold }]} />
                </View>
              </View>

              <Text style={[g.epitaph, { color: theme.text }]}>“{node.epitaph}”</Text>

              <CollectionGrid endings={endings} discovered={discovered} gold={gold}
                theme={theme} isDark={isDark} t={t} highlight={node.id} />

              {(isPro || runsLeft > 0) ? (
                <Pressable onPress={() => {
                  setPhase('intro'); setRoute([]); setNodeId('');
                  setMeters({ stability: BASELINE, lives: BASELINE, progress: BASELINE, freedom: BASELINE });
                }} accessibilityRole="button"
                  style={({ pressed }) => [g.againBtn, { borderColor: gold + '55', opacity: pressed ? 0.8 : 1 }]}>
                  <MaterialCommunityIcons name="restart" size={16} color={gold} />
                  <Text style={[g.againText, { color: gold }]}>{t.again}</Text>
                </Pressable>
              ) : (
                <Pressable onPress={() => { haptic('medium'); presentPaywall('parallel_runs_out'); }}
                  accessibilityRole="button"
                  style={({ pressed }) => [g.againBtn, { borderColor: gold + '55', opacity: pressed ? 0.8 : 1 }]}>
                  <MaterialCommunityIcons name="crown" size={15} color={gold} />
                  <Text style={[g.againText, { color: gold }]}>{t.getPro}</Text>
                </Pressable>
              )}
            </Animated.View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

// ─── Rarity badge ────────────────────────────────────────────────────────────
function RarityBadge({ rarity, label, color, isNew, newLabel }: {
  rarity: string; label: string; color: string; isNew: boolean; newLabel: string;
}) {
  const shine = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (rarity !== 'rare') return;
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(shine, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(shine, { toValue: 0, duration: 1100, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [rarity, shine]);

  const scale = shine.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] });

  return (
    <View style={g.badgeWrap}>
      <Animated.View style={[g.badge, { borderColor: color, transform: [{ scale: rarity === 'rare' ? scale : 1 }] }]}>
        <MaterialCommunityIcons
          name={rarity === 'rare' ? 'diamond-stone' : 'bookmark-check'}
          size={13} color={color}
        />
        <Text style={[g.badgeText, { color }]}>{label}</Text>
      </Animated.View>
      {isNew && <Text style={[g.newTag, { color }]}>{newLabel}</Text>}
    </View>
  );
}

// ─── Collection grid ─────────────────────────────────────────────────────────
function CollectionGrid({ endings, discovered, gold, theme, isDark, t, highlight }: {
  endings: Node[]; discovered: string[]; gold: string; theme: any; isDark: boolean;
  t: Record<string, string>; highlight?: string;
}) {
  return (
    <View style={g.collection}>
      <Text style={[g.collectionCount, { color: theme.subtext }]}>
        <Text style={{ color: gold, fontWeight: '900' }}>{discovered.length}</Text>
        {` / ${endings.length} ${t.discovered}`}
      </Text>
      <View style={g.slots}>
        {endings.map(e => {
          const found = discovered.includes(e.id);
          const isHere = highlight === e.id;
          return (
            <View
              key={e.id}
              style={[
                g.slot,
                {
                  borderColor: isHere ? gold : found ? gold + '55' : (isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)'),
                  backgroundColor: isHere ? gold + '22' : found ? gold + '10' : 'transparent',
                },
              ]}
            >
              <MaterialCommunityIcons
                name={found ? (e.rarity === 'rare' ? 'diamond-stone' : 'check') : 'help'}
                size={13}
                color={found ? gold : (isDark ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.2)')}
              />
            </View>
          );
        })}
      </View>
    </View>
  );
}

const g = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 22, paddingTop: 64, paddingBottom: 56 },
  close: {
    position: 'absolute', top: 50, right: 18, width: 34, height: 34, zIndex: 10,
    borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center',
  },

  kicker: { fontSize: 10, fontWeight: '800', letterSpacing: 2.2, marginBottom: 14 },
  pivotYear: { fontSize: 13, fontWeight: '700', letterSpacing: 1.4, marginBottom: 3 },
  title: { fontSize: 30, fontFamily: SERIF, fontWeight: '700', lineHeight: 36, letterSpacing: -0.5, marginBottom: 20 },

  realityBox: { borderWidth: 1, borderRadius: 14, padding: 16, marginBottom: 22 },
  realityLabel: { fontSize: 9.5, fontWeight: '800', letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 7 },
  realityText: { fontSize: 15, lineHeight: 23 },

  metersRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  stepLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 14 },

  stage: { position: 'relative' },
  year: { fontSize: 13, fontWeight: '800', letterSpacing: 1.6, marginBottom: 4 },
  nodeTitle: { fontSize: 22, fontFamily: SERIF, fontWeight: '700', lineHeight: 28, letterSpacing: -0.4, marginBottom: 11 },
  nodeText: { fontSize: 15.5, lineHeight: 24.5, marginBottom: 20 },

  previewHint: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center', marginTop: 4 },
  previewHintText: { fontSize: 11, fontStyle: 'italic' },

  badgeWrap: { alignItems: 'center', marginBottom: 14 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1.5, borderRadius: 20, paddingHorizontal: 13, paddingVertical: 6 },
  badgeText: { fontSize: 10.5, fontWeight: '900', letterSpacing: 1.5 },
  newTag: { fontSize: 10, fontWeight: '800', letterSpacing: 1.2, marginTop: 7, textTransform: 'uppercase' },

  endTitle: { fontSize: 26, fontFamily: SERIF, fontWeight: '700', lineHeight: 32, letterSpacing: -0.4, marginBottom: 13, textAlign: 'center' },
  verdictBox: { borderWidth: 1, borderRadius: 13, padding: 14, marginBottom: 26 },
  verdict: { fontSize: 15, lineHeight: 22, textAlign: 'center', fontWeight: '600' },

  sectionLabel: { fontSize: 9.5, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase', textAlign: 'center', marginBottom: 12 },

  statRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 18, marginBottom: 22 },
  statCell: { alignItems: 'center', flex: 1 },
  statVal: { fontSize: 21, fontWeight: '900', fontVariant: ['tabular-nums'] },
  statDelta: { fontSize: 11.5, fontWeight: '800', fontVariant: ['tabular-nums'], marginTop: 1 },
  statLabel: { fontSize: 8.5, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase', marginTop: 3 },

  divergeBox: { borderWidth: 1, borderRadius: 13, padding: 15, marginBottom: 24 },
  divergeLabel: { fontSize: 9.5, fontWeight: '800', letterSpacing: 1.3, textTransform: 'uppercase' },
  divergeVal: { fontSize: 30, fontWeight: '900', fontVariant: ['tabular-nums'], marginTop: 3, marginBottom: 9 },
  divergeTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  divergeFill: { height: 6, borderRadius: 3 },

  epitaph: { fontSize: 18, fontFamily: SERIF, fontStyle: 'italic', lineHeight: 27, textAlign: 'center', marginBottom: 28 },

  collection: { alignItems: 'center', marginBottom: 24 },
  collectionCount: { fontSize: 12.5, marginBottom: 10 },
  slots: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  slot: { width: 32, height: 32, borderRadius: 9, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },

  cta: { borderRadius: 16, overflow: 'hidden', marginTop: 6 },
  ctaBg: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, paddingVertical: 16 },
  ctaText: { color: '#1A1408', fontSize: 16, fontWeight: '800', letterSpacing: 0.3 },

  lockedWrap: { alignItems: 'center', marginTop: 8 },
  lockedText: { fontSize: 14, marginBottom: 13 },
  proBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 14, paddingHorizontal: 20, paddingVertical: 13 },
  proBtnText: { fontSize: 14, fontWeight: '800' },
  lockedSub: { fontSize: 11.5, marginTop: 10, fontStyle: 'italic' },

  againBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderRadius: 15, paddingVertical: 14 },
  againText: { fontSize: 14.5, fontWeight: '800' },
});
