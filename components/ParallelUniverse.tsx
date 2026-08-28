// components/ParallelUniverse.tsx
// "Parallel Universes" — a branching what-if game built on a real event.
//
// Three decisions, one of eighteen endings. Four world meters, four named factions and
// the mood of ordinary people all move against each other the whole way. The pipeline
// generates the tree (engine/parallel.py); this runs it.
//
// The turn has three beats, and the middle one is the reason the game is not a quiz:
// you choose, the room answers (named people from that exact week, with a mood the
// public-mood bar is made of), and only then does time move. Advancing is the
// player's own press — the voices are the point, not a transition.
//
// The design principle throughout: show consequence, never state it. A line of text
// saying "freedom decreased" is worth less than a bar that visibly falls. So every
// screen carries hard numbers rather than prose — the facts you are deciding under,
// what each choice commits and how likely it is to backfire, which faction you just
// made an enemy of, and at the end a table setting your world's figures against the
// real ones.
//
// Everything drawn lives in ParallelCanvas.tsx, on Skia. This file keeps the state, the
// copy and the typography: React Native <Text> sits on top of the canvases rather than
// inside them, because Skia text would cost a bundled typeface, font scaling, screen
// readers and the five languages the app ships in.
//
// The two layers meet at a handful of Reanimated shared values — the four meters, public
// mood, how divided the room is, how far the world has drifted. React state drives the
// words; those shared values drive the drawing, on the UI thread, so the meters keep
// easing and the tide keeps moving through the frame where a 160KB tree is being parsed.
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { X } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated, Dimensions, Easing, Modal, Platform, Pressable,
  ScrollView, StyleSheet, Text, View,
} from 'react-native';
import {
  useSharedValue, withTiming, Easing as REasing, type SharedValue,
} from 'react-native-reanimated';

import {
  BranchMap, ConsequenceBloom, DivergenceField, ForkMark, MoodTide,
  RarityAura, SkiaMeter, TrajectoryCurve, WorldRadar,
  METER_WIDTH, MOOD_TIDE_HEIGHT,
} from './ParallelCanvas';
import { useLanguage } from '../context/LanguageContext';
import { useRevenueCat } from '../context/RevenueCatContext';
import { useTheme } from '../context/ThemeContext';
import * as analytics from '../src/analytics/posthog';
import { usePaywallStore } from '../store/usePaywallStore';
import { useDiscovered, useParallelStore, useRunsLeft } from '../store/useParallelStore';
import { haptic } from '../utils/haptics';

const { width: W, height: H } = Dimensions.get('window');
const SERIF = Platform.OS === 'ios' ? 'Georgia' : 'serif';

/** Diameter of the halo behind an ending's rarity badge. */
const AURA = 150;

// ─── Shape of the JSON the pipeline produces ─────────────────────────────────
interface Effects { stability: number; lives: number; progress: number; freedom: number }
interface Actor { id: string; name: string; start: number }
interface Fact { label: string; value: string }
interface Outcome { label: string; value: string }
interface Stat { label: string; real: string; alt: string }
/** One person alive at that moment, reacting to what you just did. */
interface Reaction { who: string; mood: string; quote: string }
interface Choice {
  id: string; label: string; detail: string; effects: Effects; next: string;
  actorEffects?: Record<string, number>;
  risk?: number;
  outcome?: Outcome | null;
  /** Two or three voices from the week this was decided. */
  reactions?: Reaction[];
}
interface Node {
  id: string; year: string; title: string; text: string;
  facts?: Fact[];
  choices: Choice[];
  verdict: string; epitaph: string; rarity: string;
  stats?: Stat[];
  /** Endings only: the same idea generations later — how the people who ended up
   *  living in this world talk about what was decided. */
  legacy?: Reaction[];
}
interface Universe {
  pivotYear: string; pivotTitle: string; premise: string; root: string;
  actors?: Actor[];
  nodes: Node[];
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

// ═════════════════════════════════════════════════════════════════════════════
// PUBLIC MOOD
// ═════════════════════════════════════════════════════════════════════════════
/**
 * A closed vocabulary, mirrored in engine/parallel.py. The generator may only emit these
 * ten, which is what lets a mood be a colour, an icon and a number at the same time —
 * `valence` is what turns a handful of quotes into a bar that moves.
 *
 * Ordered best to worst; the order is what the legend along the mood bar reads off.
 */
type Mood =
  | 'elated' | 'hopeful' | 'relieved' | 'defiant'
  | 'uneasy' | 'resigned' | 'afraid' | 'angry' | 'betrayed' | 'grieving';

const MOOD_META: Record<Mood, {
  valence: number;
  color: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
}> = {
  elated:   { valence:  3, color: '#3FA97A', icon: 'party-popper' },
  hopeful:  { valence:  2, color: '#5CB88C', icon: 'weather-sunset-up' },
  relieved: { valence:  2, color: '#6FA8C9', icon: 'weather-partly-cloudy' },
  defiant:  { valence:  1, color: '#C99A3C', icon: 'flag-triangle' },
  uneasy:   { valence: -1, color: '#B08A5A', icon: 'eye-outline' },
  resigned: { valence: -1, color: '#8A8A96', icon: 'weather-fog' },
  afraid:   { valence: -2, color: '#9B7BD4', icon: 'ghost-outline' },
  angry:    { valence: -2, color: '#D9603F', icon: 'fire' },
  betrayed: { valence: -3, color: '#C7433F', icon: 'knife-military' },
  grieving: { valence: -3, color: '#7A6E86', icon: 'candle' },
};

const isMood = (m: string): m is Mood => m in MOOD_META;
const moodMeta = (m: string) => MOOD_META[isMood(m) ? m : 'uneasy'];

/** Where public mood starts: reality, like every other meter. */
const MOOD_BASELINE = 50;
/** One point of average valence is worth this much on the 0-100 bar. Six keeps a
 *  unanimously furious crowd (-3) at a visible but survivable -18 a turn. */
const MOOD_SCALE = 6;

/**
 * The crowd's temper as one word, read off the bar itself. Needed because the mood meter
 * is on screen the whole time, not only in the beat after a choice when there are quotes
 * to name it from. `defiant` is absent on purpose — it is a reaction to a specific act,
 * not a resting state a population sits in.
 */
function moodAt(value: number): Mood {
  if (value >= 78) return 'elated';
  if (value >= 66) return 'hopeful';
  if (value >= 57) return 'relieved';
  if (value >= 48) return 'uneasy';
  if (value >= 38) return 'resigned';
  if (value >= 28) return 'afraid';
  if (value >= 18) return 'angry';
  if (value >= 9) return 'betrayed';
  return 'grieving';
}

/**
 * How far apart the voices are, 0-1. A country that agrees on a decision lies flat; one
 * arguing about it will not settle. The average swing says which way the room moved —
 * only the spread says whether it moved together, and that is the half a single bar
 * cannot carry.
 */
function moodUnrest(reactions: Reaction[] | undefined): number {
  if (!reactions || reactions.length < 2) return 0;
  const vals = reactions.map(r => moodMeta(r.mood).valence);
  // Widest possible gap is elated (+3) to grieving (-3).
  return Math.min(1, (Math.max(...vals) - Math.min(...vals)) / 6);
}

/** The average feeling in the room, as a signed swing. */
function moodSwing(reactions: Reaction[] | undefined): number {
  if (!reactions?.length) return 0;
  const total = reactions.reduce((sum, r) => sum + moodMeta(r.mood).valence, 0);
  return Math.round((total / reactions.length) * MOOD_SCALE);
}

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
    firstTime: 'New timeline', risk: 'Risk',
    voices: 'What people are saying', mood: 'Public mood', onward: 'Live with it',
    legacyTitle: 'How they remember it', trajectory: 'How it went',
    worldNow: 'The world you made', noVoices: 'The news has not travelled yet',
    bandRuin: 'In ruins', bandWorse: 'Worse than history', bandSame: 'Much as it was',
    bandBetter: 'Better than history', bandGolden: 'A golden age',
    elated: 'Elated', hopeful: 'Hopeful', relieved: 'Relieved', defiant: 'Defiant', uneasy: 'Uneasy',
    resigned: 'Resigned', afraid: 'Afraid', angry: 'Angry', betrayed: 'Betrayed', grieving: 'Grieving',
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
    firstTime: 'Cronologie nouă', risk: 'Risc',
    voices: 'Ce se spune în epocă', mood: 'Starea de spirit', onward: 'Trăiește cu asta',
    legacyTitle: 'Cum își amintesc', trajectory: 'Cum a mers',
    worldNow: 'Lumea pe care ai făcut-o', noVoices: 'Vestea nu a ajuns încă departe',
    bandRuin: 'În ruină', bandWorse: 'Mai rău decât în realitate', bandSame: 'Cam ca înainte',
    bandBetter: 'Mai bine decât în realitate', bandGolden: 'O epocă de aur',
    elated: 'Exaltați', hopeful: 'Plini de speranță', relieved: 'Ușurați', defiant: 'Sfidători', uneasy: 'Neliniștiți',
    resigned: 'Resemnați', afraid: 'Înspăimântați', angry: 'Furioși', betrayed: 'Trădați', grieving: 'Îndoliați',
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
    firstTime: 'Nouvelle chronologie', risk: 'Risque',
    voices: 'Ce que l\'on dit', mood: 'Humeur publique', onward: 'Vivre avec',
    legacyTitle: 'Ce qu\'on en retient', trajectory: 'Comment ça a tourné',
    worldNow: 'Le monde que vous avez fait', noVoices: 'La nouvelle n\'a pas encore voyagé',
    bandRuin: 'En ruines', bandWorse: 'Pire que l\'histoire', bandSame: 'À peu près pareil',
    bandBetter: 'Mieux que l\'histoire', bandGolden: 'Un âge d\'or',
    elated: 'Exaltés', hopeful: 'Pleins d\'espoir', relieved: 'Soulagés', defiant: 'Défiants', uneasy: 'Inquiets',
    resigned: 'Résignés', afraid: 'Effrayés', angry: 'En colère', betrayed: 'Trahis', grieving: 'En deuil',
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
    firstTime: 'Neue Zeitlinie', risk: 'Risiko',
    voices: 'Was die Leute sagen', mood: 'Stimmung im Volk', onward: 'Damit leben',
    legacyTitle: 'Wie man sich erinnert', trajectory: 'Wie es lief',
    worldNow: 'Die Welt, die du gemacht hast', noVoices: 'Die Nachricht ist noch nicht weit gekommen',
    bandRuin: 'In Trümmern', bandWorse: 'Schlimmer als die Geschichte', bandSame: 'Fast wie zuvor',
    bandBetter: 'Besser als die Geschichte', bandGolden: 'Ein goldenes Zeitalter',
    elated: 'Begeistert', hopeful: 'Hoffnungsvoll', relieved: 'Erleichtert', defiant: 'Trotzig', uneasy: 'Beunruhigt',
    resigned: 'Resigniert', afraid: 'Verängstigt', angry: 'Wütend', betrayed: 'Verraten', grieving: 'Trauernd',
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
    firstTime: 'Cronología nueva', risk: 'Riesgo',
    voices: 'Lo que dice la gente', mood: 'Ánimo público', onward: 'Vive con ello',
    legacyTitle: 'Cómo lo recuerdan', trajectory: 'Cómo fue',
    worldNow: 'El mundo que hiciste', noVoices: 'La noticia aún no ha viajado',
    bandRuin: 'En ruinas', bandWorse: 'Peor que la historia', bandSame: 'Casi igual',
    bandBetter: 'Mejor que la historia', bandGolden: 'Una edad de oro',
    elated: 'Eufóricos', hopeful: 'Esperanzados', relieved: 'Aliviados', defiant: 'Desafiantes', uneasy: 'Inquietos',
    resigned: 'Resignados', afraid: 'Asustados', angry: 'Furiosos', betrayed: 'Traicionados', grieving: 'De luto',
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
/**
 * One world meter. The bar itself is Skia (ParallelCanvas), the icon, label and floating
 * delta stay React Native — Skia text would cost a bundled typeface, font scaling and the
 * five languages this app ships in, for four words.
 */
function Meter({ k, value, delta, label, isDark }: {
  k: MeterKey; value: SharedValue<number>; delta: number | null; label: string; isDark: boolean;
}) {
  const color = METER_COLOR[k];
  const floatY = useRef(new Animated.Value(0)).current;
  const floatOp = useRef(new Animated.Value(0)).current;

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

  return (
    <View style={m.wrap}>
      <MaterialCommunityIcons name={METER_ICON[k]} size={13} color={color} />
      <SkiaMeter value={value} hue={color} isDark={isDark} />
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

// ═════════════════════════════════════════════════════════════════════════════
// FACTIONS — the political board, not four abstract meters
// ═════════════════════════════════════════════════════════════════════════════
function ActorRow({ actor, value, delta, isDark, gold }: {
  actor: Actor; value: number; delta: number; isDark: boolean; gold: string;
}) {
  const fill = useRef(new Animated.Value(value / 100)).current;
  useEffect(() => {
    Animated.spring(fill, { toValue: value / 100, tension: 48, friction: 9, useNativeDriver: true }).start();
  }, [value, fill]);

  const W_BAR = 92;
  const scaleX = fill;
  const shift = fill.interpolate({ inputRange: [0, 1], outputRange: [-W_BAR / 2, 0] });
  // Colour by where they stand, not by which way they just moved — a faction at 12 is
  // your enemy whether it rose or fell this turn.
  const tone = value >= 66 ? '#3FA97A' : value >= 33 ? gold : '#D9603F';

  return (
    <View style={a_.row}>
      <Text style={[a_.name, { color: isDark ? 'rgba(255,255,255,0.72)' : 'rgba(0,0,0,0.62)' }]} numberOfLines={1}>
        {actor.name}
      </Text>
      <View style={[a_.track, { backgroundColor: isDark ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.08)', width: W_BAR }]}>
        <Animated.View style={[a_.fill, { backgroundColor: tone, width: W_BAR, transform: [{ translateX: shift }, { scaleX }] }]} />
      </View>
      <Text style={[a_.val, { color: tone }]}>{value}</Text>
      {delta !== 0 && (
        <Text style={[a_.delta, { color: delta > 0 ? '#3FA97A' : '#D9603F' }]}>
          {delta > 0 ? `+${delta}` : delta}
        </Text>
      )}
    </View>
  );
}

const a_ = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  name: { flex: 1, fontSize: 11.5, fontWeight: '600' },
  track: { height: 5, borderRadius: 3, overflow: 'hidden' },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 3 },
  val: { width: 22, textAlign: 'right', fontSize: 11, fontWeight: '800', fontVariant: ['tabular-nums'] },
  delta: { width: 26, textAlign: 'right', fontSize: 10.5, fontWeight: '800', fontVariant: ['tabular-nums'] },
});

// ═════════════════════════════════════════════════════════════════════════════
// FACTS — the constraints you are deciding under
// ═════════════════════════════════════════════════════════════════════════════
function FactStrip({ facts, isDark, gold }: { facts: Fact[]; isDark: boolean; gold: string }) {
  if (!facts?.length) return null;
  return (
    <View style={[f_.wrap, { borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.09)' }]}>
      {facts.map((f, i) => (
        <View key={i} style={[f_.cell, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)' }]}>
          <Text style={[f_.label, { color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.42)' }]} numberOfLines={1}>
            {f.label}
          </Text>
          <Text style={[f_.value, { color: gold }]} numberOfLines={1}>{f.value}</Text>
        </View>
      ))}
    </View>
  );
}

const f_ = StyleSheet.create({
  wrap: { borderWidth: 1, borderRadius: 11, paddingHorizontal: 13, paddingVertical: 4, marginBottom: 18 },
  cell: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 7 },
  label: { flex: 1, fontSize: 10.5, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },
  value: { fontSize: 12.5, fontWeight: '800', fontVariant: ['tabular-nums'] },
});

const m = StyleSheet.create({
  wrap: { alignItems: 'center', width: METER_WIDTH + 8 },
  label: { fontSize: 8, letterSpacing: 0.5, marginTop: 2, textTransform: 'uppercase', fontWeight: '700' },
  delta: { position: 'absolute', top: -4, fontSize: 12, fontWeight: '900', fontVariant: ['tabular-nums'] },
});

// ═════════════════════════════════════════════════════════════════════════════
// YEAR — rolls over when the scene jumps forward
// ═════════════════════════════════════════════════════════════════════════════
function YearMark({ year, gold }: { year: string; gold: string }) {
  const roll = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    roll.setValue(0);
    Animated.timing(roll, {
      toValue: 1, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true,
    }).start();
  }, [year, roll]);

  // Drops in from above rather than fading: the tree moves forward in time on every
  // decision, and the year should feel like it advanced, not like it swapped.
  const translateY = roll.interpolate({ inputRange: [0, 1], outputRange: [-12, 0] });

  return (
    <Animated.Text style={[g.year, { color: gold, opacity: roll, transform: [{ translateY }] }]}>
      {year}
    </Animated.Text>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// STAT ROW — reality struck out, your world landing on top of it
// ═════════════════════════════════════════════════════════════════════════════
function StatRow({ stat, index, gold, theme, isDark }: {
  stat: Stat; index: number; gold: string; theme: any; isDark: boolean;
}) {
  const enter = useRef(new Animated.Value(0)).current;
  const land = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // The row arrives, then your figure lands on it a beat later. Staggered down the
    // table so the comparison reads one line at a time instead of all at once.
    Animated.sequence([
      Animated.timing(enter, {
        toValue: 1, duration: 300, delay: 90 + index * 110,
        easing: Easing.out(Easing.cubic), useNativeDriver: true,
      }),
      Animated.spring(land, { toValue: 1, tension: 90, friction: 7, useNativeDriver: true }),
    ]).start();
  }, [enter, land, index]);

  const rowOpacity = enter;
  const rowSlide = enter.interpolate({ inputRange: [0, 1], outputRange: [14, 0] });
  const altScale = land.interpolate({ inputRange: [0, 1], outputRange: [1.5, 1] });
  const altOpacity = land;

  return (
    <Animated.View
      style={[
        st_.row,
        index > 0 && {
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)',
        },
        { opacity: rowOpacity, transform: [{ translateY: rowSlide }] },
      ]}
    >
      <Text style={[st_.label, { color: theme.text }]} numberOfLines={2}>{stat.label}</Text>
      <Text style={[st_.real, { color: theme.subtext }]} numberOfLines={2}>{stat.real}</Text>
      <Animated.Text
        style={[st_.alt, { color: gold, opacity: altOpacity, transform: [{ scale: altScale }] }]}
        numberOfLines={2}
      >
        {stat.alt}
      </Animated.Text>
    </Animated.View>
  );
}

const st_ = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9 },
  label: { flex: 1, fontSize: 12, fontWeight: '600', lineHeight: 16 },
  real: { width: 72, textAlign: 'right', fontSize: 11.5, lineHeight: 15, textDecorationLine: 'line-through' },
  alt: { width: 72, textAlign: 'right', fontSize: 12.5, fontWeight: '800', lineHeight: 16 },
});

function ChoiceCard({ choice, onPick, disabled, exiting, chosen, showEffects, gold, theme, isDark, delay, riskLabel }: {
  choice: Choice; onPick: () => void; disabled: boolean; exiting: boolean; chosen: boolean;
  showEffects: boolean; gold: string; theme: any; isDark: boolean; delay: number;
  riskLabel: string;
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

        {/* What this commits, and how likely it is to go wrong. Shown to everyone —
            it is the tension of the decision, not a spoiler of the meter maths. */}
        {(!!choice.outcome?.value || typeof choice.risk === 'number') && (
          <View style={[cc.footer, { borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)' }]}>
            {!!choice.outcome?.value && (
              <View style={cc.outcome}>
                <Text style={[cc.outLabel, { color: theme.subtext }]} numberOfLines={1}>
                  {choice.outcome.label}
                </Text>
                <Text style={[cc.outValue, { color: theme.text }]} numberOfLines={1}>
                  {choice.outcome.value}
                </Text>
              </View>
            )}
            {typeof choice.risk === 'number' && (
              <View style={cc.risk}>
                <Text style={[cc.riskLabel, { color: theme.subtext }]}>{riskLabel}</Text>
                <View style={[cc.riskTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }]}>
                  <View style={[cc.riskFill, {
                    width: `${Math.max(4, Math.min(100, choice.risk))}%`,
                    backgroundColor: choice.risk >= 66 ? '#D9603F' : choice.risk >= 33 ? gold : '#3FA97A',
                  }]} />
                </View>
              </View>
            )}
          </View>
        )}

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
  footer: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 12, paddingTop: 11, borderTopWidth: StyleSheet.hairlineWidth },
  outcome: { flex: 1 },
  outLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase' },
  outValue: { fontSize: 13.5, fontWeight: '800', marginTop: 2, fontVariant: ['tabular-nums'] },
  risk: { width: 78 },
  riskLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 4, textAlign: 'right' },
  riskTrack: { height: 4, borderRadius: 2, overflow: 'hidden' },
  riskFill: { height: 4, borderRadius: 2 },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 11 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 3, borderWidth: 1, borderRadius: 7, paddingHorizontal: 7, paddingVertical: 3 },
  chipText: { fontSize: 11, fontWeight: '800', fontVariant: ['tabular-nums'] },
});

// ═════════════════════════════════════════════════════════════════════════════
// HOW WELL IS IT GOING — the one reading that answers the whole question
// ═════════════════════════════════════════════════════════════════════════════
/** The four meters against reality, summed. -200 (ruin) … +200 (golden age). */
function wellbeing(meters: Record<MeterKey, number>): number {
  return METERS.reduce((sum, k) => sum + (meters[k] - BASELINE), 0);
}

/** Five bands, because "your world is at -34" means nothing and "worse than history"
 *  means everything. The thresholds are deliberately wide in the middle: most runs
 *  land near reality, and a band that flickered every turn would be noise. */
const BANDS: { max: number; key: string; color: string }[] = [
  { max: -60,      key: 'bandRuin',   color: '#C7433F' },
  { max: -20,      key: 'bandWorse',  color: '#D9603F' },
  { max:  20,      key: 'bandSame',   color: '#8A8A96' },
  { max:  60,      key: 'bandBetter', color: '#5CB88C' },
  { max: Infinity, key: 'bandGolden', color: '#3FA97A' },
];
const bandFor = (w: number) => BANDS.find(b => w < b.max) ?? BANDS[BANDS.length - 1];

/**
 * The headline readout: a bar centred on reality with your world sitting to one side of
 * it, and the band named underneath. This is the answer to "is this going well?", which
 * four separate meters never quite give — they can all move and still leave you unsure
 * whether you are winning.
 */
function WorldBand({ meters, label, t, theme, isDark }: {
  meters: Record<MeterKey, number>; label: string;
  t: Record<string, string>; theme: any; isDark: boolean;
}) {
  const w = wellbeing(meters);
  const band = bandFor(w);
  // -200…+200 onto 0…1, clamped: past ±140 the needle would leave the track and the
  // difference stops being legible anyway.
  const pos = Math.max(0, Math.min(1, (w + 140) / 280));
  const slide = useRef(new Animated.Value(pos)).current;

  useEffect(() => {
    Animated.spring(slide, { toValue: pos, tension: 46, friction: 9, useNativeDriver: false }).start();
  }, [pos, slide]);

  return (
    <View style={[wb.wrap, { borderColor: band.color + '3A', backgroundColor: band.color + '0E' }]}>
      <Text style={[wb.kicker, { color: theme.subtext }]}>{label}</Text>
      <Text style={[wb.band, { color: band.color }]}>{t[band.key]}</Text>

      <View style={[wb.track, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)' }]}>
        {/* Reality is the centre line, not zero on the left — the whole bar is a
            comparison, so the thing being compared to has to be visible. */}
        <View style={[wb.centre, { backgroundColor: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.26)' }]} />
        <Animated.View
          style={[
            wb.needle,
            {
              backgroundColor: band.color,
              left: slide.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
            },
          ]}
        />
      </View>
      <Text style={[wb.value, { color: band.color }]}>{w > 0 ? `+${w}` : w}</Text>
    </View>
  );
}

const wb = StyleSheet.create({
  wrap: { borderWidth: 1, borderRadius: 13, paddingHorizontal: 15, paddingVertical: 13, marginBottom: 16 },
  kicker: { fontSize: 9, fontWeight: '800', letterSpacing: 1.4, textTransform: 'uppercase' },
  band: { fontSize: 17, fontWeight: '800', letterSpacing: -0.2, marginTop: 3, marginBottom: 10 },
  track: { height: 5, borderRadius: 3, position: 'relative', justifyContent: 'center' },
  centre: { position: 'absolute', left: '50%', width: 1.5, height: 11, borderRadius: 1, marginLeft: -0.75 },
  needle: { position: 'absolute', width: 3, height: 15, borderRadius: 2, marginLeft: -1.5 },
  value: { fontSize: 11, fontWeight: '800', textAlign: 'right', marginTop: 7, fontVariant: ['tabular-nums'] },
});

// ═════════════════════════════════════════════════════════════════════════════
// PUBLIC MOOD — the fifth meter, and the only one made of people
// ═════════════════════════════════════════════════════════════════════════════
/**
 * The four world meters are abstractions: stability, lives, progress, freedom. This one
 * is the room. It moves on the average feeling of the people quoted after each choice,
 * which is why it can fall while every other meter rises — a decision can be correct and
 * still be hated, and that gap is the most interesting thing the game has to say.
 */
function MoodBar({ value, unrest, delta, label, moodLabel, moodColor, width, theme, isDark }: {
  value: SharedValue<number>; unrest: SharedValue<number>; delta: number | null;
  label: string; moodLabel: string; moodColor: string; width: number;
  theme: any; isDark: boolean;
}) {
  const floatY = useRef(new Animated.Value(0)).current;
  const floatOp = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!delta) return;
    floatY.setValue(0); floatOp.setValue(0);
    Animated.sequence([
      Animated.parallel([
        Animated.timing(floatOp, { toValue: 1, duration: 170, useNativeDriver: true }),
        Animated.timing(floatY, { toValue: -15, duration: 620, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      ]),
      Animated.timing(floatOp, { toValue: 0, duration: 460, useNativeDriver: true }),
    ]).start();
  }, [delta, floatY, floatOp]);

  return (
    <View style={[mb.wrap, { borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.09)' }]}>
      <View style={mb.head}>
        <Text style={[mb.label, { color: theme.subtext }]}>{label}</Text>
        <View style={mb.right}>
          <Text style={[mb.mood, { color: moodColor }]}>{moodLabel}</Text>
          {!!delta && (
            <Animated.Text
              style={[
                mb.delta,
                { color: delta > 0 ? '#3FA97A' : '#D9603F', opacity: floatOp, transform: [{ translateY: floatY }] },
              ]}
            >
              {delta > 0 ? `+${delta}` : delta}
            </Animated.Text>
          )}
        </View>
      </View>
      <MoodTide width={width} mood={value} unrest={unrest} isDark={isDark} />
    </View>
  );
}

const mb = StyleSheet.create({
  wrap: { borderWidth: 1, borderRadius: 13, paddingHorizontal: 11, paddingTop: 10, paddingBottom: 9, marginBottom: 18 },
  head: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 },
  label: { fontSize: 9, fontWeight: '800', letterSpacing: 1.3, textTransform: 'uppercase' },
  right: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  mood: { fontSize: 12.5, fontWeight: '800' },
  delta: { fontSize: 12, fontWeight: '900', fontVariant: ['tabular-nums'] },
});

// ═════════════════════════════════════════════════════════════════════════════
// VOICES OF THE AGE
// ═════════════════════════════════════════════════════════════════════════════
/**
 * One person, alive that week, on what you just did.
 *
 * Deliberately not a chat bubble: the mood colour runs down the left edge, the speaker
 * is set small and the quote large and serif, so a screen of three of them reads as
 * testimony rather than notifications.
 */
function VoiceCard({ voice, delay, t, theme, isDark }: {
  voice: Reaction; delay: number; t: Record<string, string>; theme: any; isDark: boolean;
}) {
  const enter = useRef(new Animated.Value(0)).current;
  const meta = moodMeta(voice.mood);

  useEffect(() => {
    Animated.spring(enter, {
      toValue: 1, tension: 54, friction: 11, delay, useNativeDriver: true,
    }).start();
  }, [enter, delay]);

  return (
    <Animated.View
      style={{
        opacity: enter,
        transform: [
          { translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) },
          { scale: enter.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) },
        ],
      }}
    >
      <View style={[vc.card, {
        borderColor: meta.color + '30',
        backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.022)',
      }]}>
        <View style={[vc.spine, { backgroundColor: meta.color }]} />
        <View style={vc.body}>
          <View style={vc.head}>
            <MaterialCommunityIcons name={meta.icon} size={13} color={meta.color} />
            <Text style={[vc.mood, { color: meta.color }]}>{t[voice.mood] ?? voice.mood}</Text>
            <Text style={[vc.who, { color: theme.subtext }]} numberOfLines={1}>{voice.who}</Text>
          </View>
          <Text style={[vc.quote, { color: theme.text }]}>“{voice.quote}”</Text>
        </View>
      </View>
    </Animated.View>
  );
}

const vc = StyleSheet.create({
  card: { flexDirection: 'row', borderWidth: 1, borderRadius: 13, marginBottom: 10, overflow: 'hidden' },
  spine: { width: 3 },
  body: { flex: 1, paddingHorizontal: 13, paddingVertical: 12 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 7 },
  mood: { fontSize: 9.5, fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase' },
  who: { flex: 1, fontSize: 11, textAlign: 'right' },
  quote: { fontSize: 15.5, lineHeight: 23, fontFamily: SERIF, fontStyle: 'italic' },
});

/**
 * The beat between deciding and living with it.
 *
 * The old flow went straight from a tap to the next scene, which meant the consequence
 * of a choice was four bars twitching while the screen was already changing. Now the
 * choice lands, the room answers, and only then does time move — and the player has to
 * press on rather than being carried, so the quotes are read instead of glimpsed.
 */
function ReactionWave({ choice, t, gold, theme, isDark, onward }: {
  choice: Choice;
  t: Record<string, string>; gold: string; theme: any; isDark: boolean; onward: () => void;
}) {
  const voices = choice.reactions ?? [];
  const btn = useRef(new Animated.Value(0)).current;
  // The button waits for the last voice to land. A "continue" that is tappable before
  // anyone has spoken invites skipping the only part of the turn that is about people.
  const btnDelay = 420 + voices.length * 260;

  useEffect(() => {
    Animated.timing(btn, {
      toValue: 1, duration: 420, delay: btnDelay, easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [btn, btnDelay]);

  return (
    <View>
      <View style={rw.head}>
        <MaterialCommunityIcons name="account-voice" size={14} color={gold} />
        <Text style={[rw.headText, { color: gold }]}>{t.voices}</Text>
      </View>

      {voices.length
        ? voices.map((v, i) => (
            <VoiceCard key={`${v.who}-${i}`} voice={v} delay={280 + i * 260}
              t={t} theme={theme} isDark={isDark} />
          ))
        : <Text style={[rw.silent, { color: theme.subtext }]}>{t.noVoices}</Text>}

      <Animated.View style={{ opacity: btn, transform: [{ translateY: btn.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] }}>
        <Pressable onPress={onward} accessibilityRole="button" accessibilityLabel={t.onward}
          style={({ pressed }) => [rw.btn, { borderColor: gold + '55', opacity: pressed ? 0.8 : 1 }]}>
          <Text style={[rw.btnText, { color: gold }]}>{t.onward}</Text>
          <MaterialCommunityIcons name="arrow-right" size={16} color={gold} />
        </Pressable>
      </Animated.View>
    </View>
  );
}

const rw = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 12 },
  headText: { fontSize: 9.5, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase' },
  silent: { fontSize: 13.5, fontStyle: 'italic', marginBottom: 14 },
  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1, borderRadius: 15, paddingVertical: 14, marginTop: 6,
  },
  btnText: { fontSize: 14.5, fontWeight: '800' },
});

/** How the people who ended up living in this world talk about what was decided. */
function LegacyVoices({ voices, label, t, gold, theme, isDark }: {
  voices: Reaction[]; label: string; t: Record<string, string>;
  gold: string; theme: any; isDark: boolean;
}) {
  if (!voices.length) return null;
  return (
    <View style={{ marginBottom: 26 }}>
      <View style={rw.head}>
        <MaterialCommunityIcons name="account-voice" size={14} color={gold} />
        <Text style={[rw.headText, { color: gold }]}>{label}</Text>
      </View>
      {voices.map((v, i) => (
        <VoiceCard key={`${v.who}-${i}`} voice={v} delay={160 + i * 200}
          t={t} theme={theme} isDark={isDark} />
      ))}
    </View>
  );
}

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

  // How many decisions a run takes, walked off the tree rather than assumed. The shape
  // has changed twice — 2-wide, then 3/2, now 3/3/2 — and a screen reading "Decision 3
  // of 3" on a four-deep tree is the kind of thing nobody notices until a player does.
  const depth = useMemo(() => {
    let n = 0;
    let cur = byId[universe?.root ?? ''];
    const seen = new Set<string>();
    while (cur?.choices?.length && !seen.has(cur.id)) {
      seen.add(cur.id);
      n += 1;
      cur = byId[cur.choices[0].next];
    }
    return n || 1;
  }, [byId, universe]);

  const discovered = useDiscovered(eventId);
  const runsLeft = useRunsLeft(isPro);

  const [phase, setPhase] = useState<'intro' | 'play' | 'end'>('intro');
  const [nodeId, setNodeId] = useState<string>('');
  const [meters, setMeters] = useState<Record<MeterKey, number>>({
    stability: BASELINE, lives: BASELINE, progress: BASELINE, freedom: BASELINE,
  });
  const [deltas, setDeltas] = useState<Record<MeterKey, number> | null>(null);
  const [standing, setStanding] = useState<Record<string, number>>({});
  const [actorDeltas, setActorDeltas] = useState<Record<string, number>>({});
  const [route, setRoute] = useState<string[]>([]);
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [wasNew, setWasNew] = useState(false);

  // The beat between deciding and living with it. Non-null means the voices are on
  // screen and time is paused until the player presses on.
  const [reacting, setReacting] = useState<Choice | null>(null);
  const [publicMood, setPublicMood] = useState(MOOD_BASELINE);
  const [moodDelta, setMoodDelta] = useState(0);
  // The run's shape, one point per decision plus the world as it stood at the fork.
  const [history, setHistory] = useState<{ world: number; mood: number }[]>([
    { world: 0, mood: MOOD_BASELINE },
  ]);
  // `nonce` and not a boolean: two bad choices running must flash twice.
  const [flash, setFlash] = useState({ net: 0, nonce: 0 });

  const bodyFade = useRef(new Animated.Value(1)).current;

  // ── The bridge to the canvas ───────────────────────────────────────────────
  // React state drives the copy; these drive the drawing. Skia reads shared values on
  // the UI thread, so the meters keep easing and the tide keeps moving through the frame
  // where a 160KB tree is being parsed or a modal is mounting.
  const mStability = useSharedValue(BASELINE);
  const mLives = useSharedValue(BASELINE);
  const mProgress = useSharedValue(BASELINE);
  const mFreedom = useSharedValue(BASELINE);
  const meterSV: Record<MeterKey, SharedValue<number>> = {
    stability: mStability, lives: mLives, progress: mProgress, freedom: mFreedom,
  };
  const moodSV = useSharedValue(MOOD_BASELINE);
  /** 0-1: how divided the last set of voices was. Drives the chop on the mood tide. */
  const unrestSV = useSharedValue(0);
  const divergenceSV = useSharedValue(0);

  const EASE = { duration: 620, easing: REasing.out(REasing.cubic) };

  useEffect(() => {
    for (const k of METERS) {
      meterSV[k].value = withTiming(meters[k], EASE);
    }
    divergenceSV.value = withTiming(
      (METERS.reduce((sum, k) => sum + Math.abs(meters[k] - BASELINE), 0) / (METERS.length * BASELINE)) * 100,
      EASE,
    );
  }, [meters]);

  useEffect(() => {
    moodSV.value = withTiming(publicMood, EASE);
  }, [publicMood]);


  useEffect(() => {
    if (!visible) return;
    setPhase('intro'); setNodeId(''); setRoute([]); setPickedId(null); setWasNew(false);
    setMeters({ stability: BASELINE, lives: BASELINE, progress: BASELINE, freedom: BASELINE });
    setDeltas(null);
    setActorDeltas({});
    setStanding(Object.fromEntries((universe?.actors ?? []).map(a => [a.id, a.start])));
    setReacting(null);
    setPublicMood(MOOD_BASELINE); setMoodDelta(0);
    setHistory([{ world: 0, mood: MOOD_BASELINE }]);
    setFlash({ net: 0, nonce: 0 });
    for (const k of METERS) meterSV[k].value = BASELINE;
    moodSV.value = MOOD_BASELINE;
    unrestSV.value = 0;
    divergenceSV.value = 0;
    bodyFade.setValue(1);
  }, [visible, bodyFade, universe]);

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
    if (pickedId || reacting) return;
    haptic('medium');
    setPickedId(choice.id);

    const next = { ...meters };
    const d: Record<MeterKey, number> = { stability: 0, lives: 0, progress: 0, freedom: 0 };
    for (const k of METERS) {
      d[k] = choice.effects[k];
      next[k] = clamp(next[k] + choice.effects[k]);
    }

    // Factions move on the same beat. Their deltas are the half of the consequence the
    // four meters cannot express: who you just made an enemy of.
    const nextStanding = { ...standing };
    const ad: Record<string, number> = {};
    for (const [id, delta] of Object.entries(choice.actorEffects ?? {})) {
      ad[id] = delta;
      nextStanding[id] = clamp((nextStanding[id] ?? BASELINE) + delta);
    }

    // The people move on the same beat as the meters. Mood can fall while every other
    // bar rises — a decision can be correct and still be hated, and that gap is the most
    // interesting thing this game has to say.
    const swing = moodSwing(choice.reactions);
    const nextMood = clamp(publicMood + swing);
    const unrest = moodUnrest(choice.reactions);
    const net = METERS.reduce((sum, k) => sum + choice.effects[k], 0);

    // Meters move while the cards are still leaving, so cause and effect land together.
    setTimeout(() => {
      setMeters(next); setDeltas(d);
      setStanding(nextStanding); setActorDeltas(ad);
      setPublicMood(nextMood); setMoodDelta(swing);
      unrestSV.value = withTiming(unrest, { duration: 900, easing: REasing.out(REasing.cubic) });
      setFlash(f => ({ net, nonce: f.nonce + 1 }));
      setHistory(h => [...h, { world: wellbeing(next), mood: nextMood }]);
      // A second, quieter haptic under the flash: the screen and the hand agree on
      // whether that went well before a single number has been read.
      if (net !== 0) haptic(net > 0 ? 'success' : 'warning');
    }, 120);

    // Then the room speaks, and time stops until the player presses on. Advancing
    // straight to the next scene is what made the old flow feel like a questionnaire.
    setTimeout(() => setReacting(choice), 560);
  }, [pickedId, reacting, meters, standing, publicMood]);

  /** Leave the reaction beat and walk through the door. */
  const onward = useCallback(() => {
    const choice = reacting;
    if (!choice) return;
    haptic('light');
    setReacting(null);
    Animated.timing(bodyFade, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => {
      const target = byId[choice.next];
      setRoute(r => [...r, choice.id]);
      setPickedId(null);
      setDeltas(null);
      setActorDeltas({});
      setMoodDelta(0);
      setNodeId(choice.next);
      if (target && !target.choices?.length) {
        const isNew = !discovered.includes(target.id);
        setWasNew(isNew);
        useParallelStore.getState().recordEnding(eventId, target.id);
        analytics.capture('parallel_ending', {
          event_id: eventId, ending_id: target.id, rarity: target.rarity,
          is_new: isNew, is_pro: isPro,
          divergence: METERS.reduce((s, k) => s + Math.abs(meters[k] - BASELINE), 0),
          public_mood: publicMood,
        });
        haptic(target.rarity === 'rare' ? 'success' : 'light');
        setPhase('end');
      }
      Animated.timing(bodyFade, { toValue: 1, duration: 260, useNativeDriver: true }).start();
    });
  }, [reacting, byId, bodyFade, discovered, eventId, isPro, meters, publicMood]);

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
        <DivergenceField width={W} height={H} divergence={divergenceSV} isDark={isDark} />
        <ConsequenceBloom width={W} height={H} net={flash.net} nonce={flash.nonce} />

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
              <ForkMark width={W - 44} isDark={isDark} />

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
                  <Meter key={k} k={k} value={meterSV[k]} delta={deltas?.[k] ?? null}
                    label={t[k]} isDark={isDark} />
                ))}
              </View>

              {/* Four bars can all move and still leave you unsure whether you are
                  winning. These two say so outright, and they stay on screen the whole
                  run so the player watches them move rather than meeting them at the end. */}
              <WorldBand meters={meters} label={t.worldNow} t={t} theme={theme} isDark={isDark} />

              <MoodBar
                value={moodSV}
                unrest={unrestSV}
                delta={moodDelta}
                label={t.mood}
                moodLabel={t[moodAt(publicMood)]}
                moodColor={moodMeta(moodAt(publicMood)).color}
                width={W - 44 - 22}
                theme={theme}
                isDark={isDark}
              />

              {!!universe.actors?.length && (
                <View style={[g.actorBox, { borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.09)' }]}>
                  {universe.actors.map(act => (
                    <ActorRow
                      key={act.id}
                      actor={act}
                      value={standing[act.id] ?? act.start}
                      delta={actorDeltas[act.id] ?? 0}
                      isDark={isDark}
                      gold={gold}
                    />
                  ))}
                </View>
              )}

              <Text style={[g.stepLabel, { color: theme.subtext }]}>
                {t.decision} {Math.min(step + 1, depth)} {t.of} {depth}
              </Text>

              <View style={g.stage}>
                <BranchMap width={W - 44} depth={depth} step={step} isDark={isDark} />
                <Animated.View style={{ opacity: bodyFade }}>
                  <YearMark year={node.year} gold={gold} />
                  <Text style={[g.nodeTitle, { color: theme.text }]}>{node.title}</Text>
                  <Text style={[g.nodeText, { color: theme.text }]}>{node.text}</Text>

                  <FactStrip facts={node.facts ?? []} isDark={isDark} gold={gold} />

                  {reacting ? (
                    <ReactionWave
                      choice={reacting}
                      t={t} gold={gold} theme={theme} isDark={isDark}
                      onward={onward}
                    />
                  ) : (
                    <>
                      {node.choices.map((c, i) => (
                        <ChoiceCard
                          key={c.id} choice={c} delay={i * 90}
                          onPick={() => pick(c)}
                          disabled={!!pickedId}
                          exiting={!!pickedId}
                          chosen={pickedId === c.id}
                          showEffects={isPro}
                          riskLabel={t.risk}
                          gold={gold} theme={theme} isDark={isDark}
                        />
                      ))}

                      {!isPro && (
                        <View style={g.previewHint}>
                          <MaterialCommunityIcons name="eye-off-outline" size={12} color={theme.subtext} />
                          <Text style={[g.previewHintText, { color: theme.subtext }]}>{t.preview}</Text>
                        </View>
                      )}
                    </>
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

              {/* The two readings the player actually came for: how the world ended up,
                  and how the people in it feel about it. */}
              <WorldBand meters={meters} label={t.worldNow} t={t} theme={theme} isDark={isDark} />
              <MoodBar
                value={moodSV} unrest={unrestSV} delta={null} label={t.mood}
                moodLabel={t[moodAt(publicMood)]}
                moodColor={moodMeta(moodAt(publicMood)).color}
                width={W - 44 - 22}
                theme={theme} isDark={isDark}
              />

              {!!node.stats?.length && (
                <View style={[g.statsTable, { borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.09)' }]}>
                  <View style={[g.statsHead, { borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }]}>
                    <View style={{ flex: 1 }} />
                    <Text style={[g.statsCol, { color: theme.subtext }]}>{t.realWorld}</Text>
                    <Text style={[g.statsCol, { color: gold }]}>{t.yourWorld}</Text>
                  </View>
                  {node.stats.map((st, i) => (
                    <StatRow key={i} stat={st} index={i} gold={gold} theme={theme} isDark={isDark} />
                  ))}
                </View>
              )}

              <LegacyVoices
                voices={node.legacy ?? []} label={t.legacyTitle}
                t={t} gold={gold} theme={theme} isDark={isDark}
              />

              <Text style={[g.sectionLabel, { color: theme.subtext }]}>{t.yourWorld}</Text>
              <View style={{ alignItems: 'center' }}>
                <WorldRadar size={Math.min(W - 70, 260)} values={METERS.map(k => meters[k])} isDark={isDark} />
              </View>

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

              <View style={[g.trajectoryBox, { borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.09)' }]}>
                <Text style={[g.divergeLabel, { color: theme.subtext }]}>{t.trajectory}</Text>
                <TrajectoryCurve width={W - 44 - 26} history={history} isDark={isDark} />
                <View style={g.legendRow}>
                  <View style={g.legendKey}>
                    <View style={[g.legendSwatch, { backgroundColor: gold }]} />
                    <Text style={[g.legendText, { color: theme.subtext }]}>{t.yourWorld}</Text>
                  </View>
                  <View style={g.legendKey}>
                    <View style={[g.legendSwatch, { backgroundColor: '#7B5EA7' }]} />
                    <Text style={[g.legendText, { color: theme.subtext }]}>{t.mood}</Text>
                  </View>
                </View>
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
                  setStanding(Object.fromEntries((universe.actors ?? []).map(a => [a.id, a.start])));
                  setActorDeltas({});
                  setReacting(null);
                  setPublicMood(MOOD_BASELINE); setMoodDelta(0);
                  setHistory([{ world: 0, mood: MOOD_BASELINE }]);
                  setFlash({ net: 0, nonce: 0 });
                  unrestSV.value = 0;
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
      {/* The aura is the tell. A rare world turns a full gold sweep behind the badge and
          a common one barely glows — the treatment has to differ at a glance, or the
          rarity is just a word. */}
      <View style={g.auraWrap} pointerEvents="none">
        <RarityAura size={AURA} rarity={rarity} />
      </View>
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

  metersRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  actorBox: { borderWidth: 1, borderRadius: 11, paddingHorizontal: 13, paddingVertical: 7, marginBottom: 18 },

  statsTable: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 13, paddingBottom: 4, marginBottom: 26 },
  statsHead: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, paddingVertical: 9, borderBottomWidth: StyleSheet.hairlineWidth },
  statsCol: { width: 72, textAlign: 'right', fontSize: 8.5, fontWeight: '800', letterSpacing: 0.7, textTransform: 'uppercase' },
  stepLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 14 },

  stage: { position: 'relative' },
  year: { fontSize: 13, fontWeight: '800', letterSpacing: 1.6, marginBottom: 4 },
  nodeTitle: { fontSize: 22, fontFamily: SERIF, fontWeight: '700', lineHeight: 28, letterSpacing: -0.4, marginBottom: 11 },
  nodeText: { fontSize: 15.5, lineHeight: 24.5, marginBottom: 20 },

  previewHint: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center', marginTop: 4 },
  previewHintText: { fontSize: 11, fontStyle: 'italic' },

  badgeWrap: { alignItems: 'center', marginBottom: 14, justifyContent: 'center' },
  auraWrap: { position: 'absolute', top: -(AURA - 30) / 2, alignItems: 'center', justifyContent: 'center' },
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
  trajectoryBox: { borderWidth: 1, borderRadius: 13, paddingHorizontal: 12, paddingTop: 13, paddingBottom: 11, marginBottom: 24 },
  legendRow: { flexDirection: 'row', gap: 16, marginTop: 8 },
  legendKey: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendSwatch: { width: 10, height: 2.5, borderRadius: 2 },
  legendText: { fontSize: 10.5 },
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
