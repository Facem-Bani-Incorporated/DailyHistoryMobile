// components/ParallelCanvas.tsx
// The Skia drawing layer for Parallel Universes.
//
// Everything visual in the game is drawn here; ParallelUniverse.tsx keeps the state, the
// copy and the typography. The split is deliberate — Skia text needs a bundled typeface
// and loses font scaling, screen readers and the five languages the app ships, so real
// <Text> stays on top of the canvas rather than inside it.
//
// Two rules hold the whole file together:
//
// 1. **Every value that moves is a Reanimated shared value passed straight into a Skia
//    prop.** Nothing here calls setState on a frame. The canvases run on the UI thread
//    and keep running while JavaScript is busy parsing a 160KB tree.
//
// 2. **Nothing decorative is random.** Each drawing is bound to a number the player is
//    being asked to care about — the four meters, the mood of the room, how far the
//    world has drifted from the one that really happened. The backdrop churns harder as
//    you diverge; the tide turns red as people turn on you. A flourish that would look
//    the same whatever you chose has been left out.
import {
  BlurMask, Canvas, Circle, Fill, Group, LinearGradient, Path, RadialGradient,
  Rect, RoundedRect, Skia, SweepGradient, Turbulence, vec,
} from '@shopify/react-native-skia';
import { memo, useEffect, useMemo } from 'react';
import { StyleSheet } from 'react-native';
import {
  Easing, interpolate, interpolateColor, useDerivedValue, useSharedValue,
  withDelay, withRepeat, withSequence, withTiming, type SharedValue,
} from 'react-native-reanimated';

// ─── Palette ─────────────────────────────────────────────────────────────────
// Mirrors Colors.premium in ThemeContext. Kept as plain constants because Skia takes
// colour strings and these are the only ones the canvas layer ever uses.
export const GOLD = '#D4A843';
export const AMBER = '#C17B2A';
export const PURPLE = '#7B5EA7';
export const IVORY = '#F5ECD7';
const GOOD = '#3FA97A';
const BAD = '#D9603F';

/** The four world meters, in the order they are always drawn. */
export const METER_HUES = ['#4A90D9', '#3FA97A', '#9B7BD4', '#E0A33C'];

const TAU = Math.PI * 2;

// ═════════════════════════════════════════════════════════════════════════════
// DIVERGENCE FIELD — the room you are deciding in
// ═════════════════════════════════════════════════════════════════════════════
/**
 * The full-screen backdrop: a vignette, a grain of fractal noise, and a dozen threads
 * drifting across it — the timelines you did not take.
 *
 * `divergence` (0-100) is the only input, and it drives everything: at zero the threads
 * lie almost flat and the field is still, and as the world pulls away from the real one
 * they bow, speed up and warm towards amber. The screen is restless in proportion to
 * how much history you have bent, which is a thing the player can feel before they have
 * read a single number.
 */
export const DivergenceField = memo(function DivergenceField({
  width, height, divergence, isDark,
}: { width: number; height: number; divergence: SharedValue<number>; isDark: boolean }) {
  const clock = useSharedValue(0);

  useEffect(() => {
    clock.value = withRepeat(withTiming(1, { duration: 24000, easing: Easing.linear }), -1, false);
  }, [clock]);

  // Twelve threads, each with its own lane, phase and speed so they never march in step.
  const threads = useMemo(
    () => Array.from({ length: 12 }, (_, i) => ({
      y: (height * (i + 0.5)) / 12,
      phase: (i * 0.37) % 1,
      speed: 0.6 + ((i * 7) % 5) / 6,
      bow: ((i % 3) - 1) || 0.5,
    })),
    [height],
  );

  const opacity = useDerivedValue(() => interpolate(divergence.value, [0, 100], [0.1, 0.3]));

  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* The ground the whole screen sits on. Painted here rather than as a View so the
          threads can blend into it instead of sitting on a seam. */}
      <Rect x={0} y={0} width={width} height={height}>
        <RadialGradient
          c={vec(width / 2, height * 0.32)}
          r={Math.max(width, height) * 0.85}
          colors={isDark
            ? ['#141024', '#0A0812', '#05040A']
            : ['#FFFDF7', '#F7F3E9', '#EFE9DC']}
        />
      </Rect>

      {/* Grain. Almost invisible on purpose — it stops the gradient banding on OLED and
          gives the background the tooth of paper rather than of a screen. */}
      <Rect x={0} y={0} width={width} height={height} opacity={isDark ? 0.055 : 0.035}>
        <Turbulence freqX={0.7} freqY={0.7} octaves={3} seed={7} tileWidth={0} tileHeight={0} />
      </Rect>

      <Group opacity={opacity}>
        {threads.map((t, i) => (
          <Thread key={i} width={width} clock={clock} {...t} />
        ))}
      </Group>
    </Canvas>
  );
});

/** One drifting timeline. A cubic that redraws its control point every frame. */
function Thread({ width, y, phase, speed, bow, clock }: {
  width: number; y: number; phase: number; speed: number; bow: number;
  clock: SharedValue<number>;
}) {
  const path = useDerivedValue(() => {
    'worklet';
    const t = (clock.value * speed + phase) % 1;
    const x = -width * 0.3 + t * width * 1.6;
    const p = Skia.Path.Make();
    p.moveTo(x - width * 0.45, y);
    p.cubicTo(
      x - width * 0.2, y + bow * 34,
      x + width * 0.2, y - bow * 34,
      x + width * 0.45, y,
    );
    return p;
  });

  return (
    <Path path={path} style="stroke" strokeWidth={1} strokeCap="round" color={GOLD}>
      <BlurMask blur={2} style="normal" />
    </Path>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// CONSEQUENCE BLOOM — did that go well?
// ═════════════════════════════════════════════════════════════════════════════
/**
 * One bloom of colour from the centre of the screen the instant a choice lands: green
 * outward when the four meters net up, red inward when they net down, nothing when the
 * choice was a genuine wash.
 *
 * Pre-attentive on purpose. The player knows how it went before they have focused on a
 * single bar, which is the whole reason it sits behind everything instead of inside a
 * card. `nonce` and not a boolean, because two bad choices running must bloom twice.
 */
export const ConsequenceBloom = memo(function ConsequenceBloom({
  width, height, net, nonce,
}: { width: number; height: number; net: number; nonce: number }) {
  const t = useSharedValue(0);

  useMemo(() => {
    if (!nonce || net === 0) return;
    t.value = 0;
    t.value = withSequence(
      withTiming(1, { duration: 220, easing: Easing.out(Easing.quad) }),
      withTiming(0, { duration: 820, easing: Easing.in(Easing.quad) }),
    );
  }, [nonce, net, t]);

  const good = net > 0;
  const tint = good ? GOOD : BAD;
  // Strength tracks magnitude, capped: +40 should feel bigger than +6 without +90
  // whiting out the screen.
  const peak = Math.min(0.42, 0.12 + Math.abs(net) / 130);
  const cx = width / 2;
  const cy = height * 0.42;
  const maxR = Math.hypot(width, height) * 0.6;

  const opacity = useDerivedValue(() => t.value * peak);
  // A good outcome opens outward; a bad one closes in on you.
  const r = useDerivedValue(() =>
    good
      ? interpolate(t.value, [0, 1], [maxR * 0.15, maxR])
      : interpolate(t.value, [0, 1], [maxR, maxR * 0.45]));
  const ringR = useDerivedValue(() => interpolate(t.value, [0, 1], [0, maxR * 0.9]));
  const ringOpacity = useDerivedValue(() => t.value * (1 - t.value) * 2.6);

  if (!nonce || net === 0) return null;

  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      <Group opacity={opacity}>
        <Circle cx={cx} cy={cy} r={r}>
          <RadialGradient
            c={vec(cx, cy)}
            r={maxR}
            colors={good ? [`${tint}00`, `${tint}66`, `${tint}00`] : [`${tint}88`, `${tint}22`, `${tint}00`]}
          />
        </Circle>
      </Group>
      {/* The shockwave. Peaks mid-flight and is gone by the end, so it reads as an
          impact rather than a halo that lingers. */}
      <Circle cx={cx} cy={cy} r={ringR} style="stroke" strokeWidth={2}
        color={tint} opacity={ringOpacity}>
        <BlurMask blur={9} style="normal" />
      </Circle>
    </Canvas>
  );
});

// ═════════════════════════════════════════════════════════════════════════════
// WORLD METERS — four bars that trade against each other
// ═════════════════════════════════════════════════════════════════════════════
const METER_W = 66;
const METER_H = 9;

/**
 * One world meter, as a piece of glass with light in it.
 *
 * Two things make it read as an object rather than a progress bar: a specular highlight
 * along the top of the fill, and a bloom underneath that grows with the value. And when
 * one meter runs away from the other three it starts to burn — `dominance` drives a
 * pulse, so a world that bought progress by spending everything else announces itself
 * before you have read a single label.
 */
export const SkiaMeter = memo(function SkiaMeter({
  value, dominance, hue, isDark,
}: { value: SharedValue<number>; dominance: number; hue: string; isDark: boolean }) {
  const burn = useSharedValue(0);
  const pulse = useSharedValue(0);

  useEffect(() => {
    burn.value = withTiming(Math.max(0, Math.min(1, dominance)), { duration: 700 });
  }, [dominance, burn]);

  useEffect(() => {
    pulse.value = withRepeat(withTiming(1, { duration: 1300, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [pulse]);

  const w = useDerivedValue(() => Math.max(3, (value.value / 100) * METER_W));
  const bloom = useDerivedValue(() =>
    0.35 + (value.value / 100) * 0.25 + burn.value * (0.35 + pulse.value * 0.4));
  const bloomBlur = useDerivedValue(() => 5 + burn.value * 9);
  const specW = useDerivedValue(() => Math.max(0, w.value - 3));

  return (
    <Canvas style={{ width: METER_W, height: METER_H + 12 }}>
      <Group transform={[{ translateY: 6 }]}>
        <RoundedRect x={0} y={0} width={METER_W} height={METER_H} r={METER_H / 2}
          color={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)'} />

        <RoundedRect x={0} y={0} width={w} height={METER_H} r={METER_H / 2}
          color={hue} opacity={bloom}>
          <BlurMask blur={bloomBlur} style="normal" />
        </RoundedRect>

        {/* The fill: darker at the base, bright at the crown, like a lit tube. */}
        <RoundedRect x={0} y={0} width={w} height={METER_H} r={METER_H / 2}>
          <LinearGradient start={vec(0, 0)} end={vec(0, METER_H)}
            colors={[`${hue}FF`, hue, `${hue}AA`]} />
        </RoundedRect>

        {/* Specular: a thin bright line along the upper third. This is the whole gloss. */}
        <RoundedRect x={1.5} y={1.2} width={specW} height={METER_H * 0.34}
          r={METER_H * 0.17} color="#FFFFFF" opacity={0.42} />

        <Rect x={METER_W / 2 - 0.75} y={-2.5} width={1.5} height={METER_H + 5}
          color={isDark ? 'rgba(255,255,255,0.42)' : 'rgba(0,0,0,0.34)'} />
      </Group>
    </Canvas>
  );
});

// ═════════════════════════════════════════════════════════════════════════════
// WORLD DIAL — how far from the world that happened
// ═════════════════════════════════════════════════════════════════════════════
/**
 * One arc, one number, one word.
 *
 * Replaces a labelled track with a needle and a caption. The arc sweeps out from top
 * centre — right when the world came out better than history, left when worse — so the
 * direction alone carries the sign before the number is read.
 */
export const WorldDial = memo(function WorldDial({
  size, wellbeing, tone, isDark,
}: { size: number; wellbeing: number; tone: string; isDark: boolean }) {
  const sweep = useSharedValue(0);

  useEffect(() => {
    sweep.value = withTiming(Math.max(-1, Math.min(1, wellbeing / 140)), {
      duration: 900, easing: Easing.out(Easing.cubic),
    });
  }, [wellbeing, sweep]);

  const cx = size / 2;
  const cy = size / 2;
  const R = size / 2 - 9;
  const SPAN = 132;

  const track = useMemo(() => {
    const p = Skia.Path.Make();
    p.addArc({ x: cx - R, y: cy - R, width: R * 2, height: R * 2 }, -90 - SPAN, SPAN * 2);
    return p;
  }, [size]);

  const arc = useDerivedValue(() => {
    'worklet';
    const p = Skia.Path.Make();
    p.addArc({ x: cx - R, y: cy - R, width: R * 2, height: R * 2 }, -90, sweep.value * SPAN);
    return p;
  });

  return (
    <Canvas style={{ width: size, height: size }} pointerEvents="none">
      <Path path={track} style="stroke" strokeWidth={7} strokeCap="round"
        color={isDark ? 'rgba(245,236,215,0.09)' : 'rgba(0,0,0,0.07)'} />
      <Path path={arc} style="stroke" strokeWidth={10} strokeCap="round" color={tone} opacity={0.5}>
        <BlurMask blur={12} style="normal" />
      </Path>
      <Path path={arc} style="stroke" strokeWidth={5.5} strokeCap="round" color={tone} />
      {/* Reality: the mark the arc grows away from. */}
      <Rect x={cx - 1} y={cy - R - 6} width={2} height={11}
        color={isDark ? 'rgba(245,236,215,0.5)' : 'rgba(0,0,0,0.4)'} />
    </Canvas>
  );
});

// ═════════════════════════════════════════════════════════════════════════════
// THE MARCH — public mood, as the people themselves
// ═════════════════════════════════════════════════════════════════════════════
/**
 * A crowd crossing the screen, and the way it moves is the reading.
 *
 * Content: they stroll, upright, warm-lit, well spaced.
 * Uneasy: the pace picks up, the light goes amber, the gaps close.
 * Furious: they run, pitchforks up, and the ground turns red under them.
 *
 * This replaced a coloured band with a wave on it. A bar can carry a number; it cannot
 * carry the difference between a country walking home and a country coming for you, and
 * that difference is the only thing this meter was ever trying to say.
 *
 * The whole crowd is one path rebuilt each frame — twelve figures at twelve transforms
 * would be twelve draw calls for something that sits under a scrolling screen.
 */
export const PeasantMarch = memo(function PeasantMarch({
  width, mood, unrest, isDark,
}: {
  width: number; mood: SharedValue<number>; unrest: SharedValue<number>; isDark: boolean;
}) {
  const H = 92;
  const GROUND = H - 22;
  const COUNT = 11;
  const clock = useSharedValue(0);

  useEffect(() => {
    clock.value = withRepeat(withTiming(1, { duration: 6000, easing: Easing.linear }), -1, false);
  }, [clock]);

  // Each walker gets its own lane, phase and gait so the crowd never marches in step.
  const seeds = useMemo(
    () => Array.from({ length: COUNT }, (_, i) => ({
      phase: (i * 0.173 + (i % 3) * 0.06) % 1,
      lane: ((i * 7) % 5) - 2,          // -2..2, slight depth
      gait: 0.9 + ((i * 11) % 7) / 10,
      scale: 0.86 + ((i * 5) % 4) / 10,
    })),
    [],
  );

  const crowd = useDerivedValue(() => {
    'worklet';
    const m = mood.value;
    // Below fifty they are hurrying; by twenty they are running.
    const haste = interpolate(m, [0, 30, 60, 100], [2.6, 1.7, 1.0, 0.75], 'clamp');
    const angry = interpolate(m, [45, 15], [0, 1], 'clamp');   // 1 = pitchforks up
    const stride = interpolate(m, [0, 100], [7, 3.4], 'clamp');

    const p = Skia.Path.Make();

    for (let i = 0; i < COUNT; i++) {
      const sd = seeds[i];
      const t = (clock.value * haste * sd.gait + sd.phase) % 1;
      const x = -24 + t * (width + 48);
      const sc = sd.scale;
      const baseY = GROUND + sd.lane * 2.2;

      // A running figure bobs harder and leans into it.
      const step = Math.sin((clock.value * haste * sd.gait * 18 + sd.phase * 6) * Math.PI * 2);
      const bob = Math.abs(step) * (1 + angry * 1.6) * sc;
      const y = baseY - bob;
      const lean = angry * 3 * sc;

      const headR = 3.4 * sc;
      const shoulder = y - 15 * sc;
      const hip = y - 6 * sc;

      // Head
      p.addCircle(x + lean, shoulder - headR - 1.5 * sc, headR);
      // Spine, leaning forward as they run
      p.moveTo(x + lean, shoulder);
      p.lineTo(x, hip);
      // Legs, swinging out of phase
      const sw = step * stride * 0.5 * sc;
      p.moveTo(x, hip);
      p.lineTo(x - sw, y);
      p.moveTo(x, hip);
      p.lineTo(x + sw, y);
      // Trailing arm
      p.moveTo(x + lean * 0.8, shoulder - 1 * sc);
      p.lineTo(x - 4 * sc - sw * 0.4, shoulder + 5 * sc);

      // Raised arm and pitchfork, only once they are angry enough to carry one.
      if (angry > 0.05) {
        const armX = x + lean + 5 * sc;
        const armY = shoulder - 2 * sc - angry * 5 * sc;
        p.moveTo(x + lean, shoulder - 1 * sc);
        p.lineTo(armX, armY);
        const shaftTop = armY - 13 * sc * angry;
        p.moveTo(armX, armY + 3 * sc);
        p.lineTo(shaftTop === armY ? armX : armX + 1.5 * sc, shaftTop);
        // Three tines
        for (const d of [-2.4, 0, 2.4]) {
          p.moveTo(armX + 1.5 * sc + d * sc, shaftTop);
          p.lineTo(armX + 1.5 * sc + d * sc, shaftTop - 4.5 * sc * angry);
        }
      }
    }
    return p;
  });

  const tint = useDerivedValue(() =>
    interpolateColor(mood.value, [0, 22, 50, 78, 100],
      ['#E0483A', '#D9603F', '#C79A54', '#5CB88C', '#3FA97A']));

  // The ground goes red under a mob. It is the first thing you notice and it is doing the
  // same job as the colour of the figures, one beat earlier.
  const heat = useDerivedValue(() => interpolate(mood.value, [40, 8], [0, 1], 'clamp'));
  const groundOpacity = useDerivedValue(() => 0.1 + heat.value * 0.4);
  const glowOpacity = useDerivedValue(() => 0.34 + unrest.value * 0.3 + heat.value * 0.25);

  const clip = useMemo(
    () => Skia.RRectXY(Skia.XYWHRect(0, 0, width, H), 12, 12),
    [width],
  );

  return (
    <Canvas style={{ width, height: H }}>
      <RoundedRect x={0} y={0} width={width} height={H} r={12}
        color={isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.022)'} />

      <Group clip={clip}>
        {/* Heat haze on the ground. */}
        <Rect x={0} y={GROUND - 26} width={width} height={52} opacity={groundOpacity}>
          <LinearGradient
            start={vec(0, GROUND - 26)} end={vec(0, GROUND + 26)}
            colors={['#E0483A00', '#E0483A80', '#E0483A00']}
          />
        </Rect>

        {/* The road they are on. */}
        <Rect x={0} y={GROUND + 1} width={width} height={1}
          color={isDark ? 'rgba(245,236,215,0.22)' : 'rgba(0,0,0,0.16)'} />

        {/* Glow first, figures on top — the gloss is a blurred copy underneath, which is
            cheaper than a shadow and keeps the silhouettes crisp. */}
        <Path path={crowd} style="stroke" strokeWidth={4.5} strokeCap="round" strokeJoin="round"
          color={tint} opacity={glowOpacity}>
          <BlurMask blur={7} style="normal" />
        </Path>
        <Path path={crowd} style="stroke" strokeWidth={1.9} strokeCap="round" strokeJoin="round"
          color={tint} />
      </Group>
    </Canvas>
  );
});

// ═════════════════════════════════════════════════════════════════════════════
// BRANCH MAP — where you are, and what you gave up
// ═════════════════════════════════════════════════════════════════════════════
/**
 * The road you actually walked, bending the way you chose, with the forks in front of
 * you still open.
 *
 * It used to draw the whole tree — twelve endpoints crushed into a 96px band, every line
 * the same grey — which read as a scribble. Then it drew a straight line with a generic
 * fan on the end, so a player who went left, left, right saw exactly what a player who
 * went right, right, left saw. The lit path now follows `path`, so the shape of the run
 * is the shape on screen.
 */
export const BranchMap = memo(function BranchMap({
  width, depth, step, path, isDark,
}: {
  width: number; depth: number; step: number;
  /** Which option was taken at each decision so far, as an index into that node's list. */
  path: number[];
  isDark: boolean;
}) {
  const H = 86;
  const progress = useSharedValue(0);
  const pulse = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(depth ? step / depth : 0, {
      duration: 760, easing: Easing.out(Easing.cubic),
    });
  }, [step, depth, progress]);

  useEffect(() => {
    pulse.value = withRepeat(withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.sin) }), -1, false);
  }, [pulse]);

  const PAD = 16;
  const usable = width - PAD * 2;
  const midY = H / 2;
  const stepX = usable / Math.max(1, depth);

  const { travelled, ahead, nodes } = useMemo(() => {
    const done = Skia.Path.Make();
    const open = Skia.Path.Make();
    const dots: { x: number; y: number }[] = [];

    const SPREAD = H * 0.3;
    let y = midY;
    done.moveTo(PAD, y);
    dots.push({ x: PAD, y });

    for (let i = 0; i < depth; i++) {
      const x0 = PAD + i * stepX;
      const x1 = PAD + (i + 1) * stepX;
      // Later decisions move the line less — the first choice is the one that swings it.
      const spread = SPREAD / Math.pow(1.7, i);
      const count = i === 0 ? 3 : 2;

      if (i < step) {
        const idx = path[i] ?? 0;
        const dir = (idx / (count - 1)) * 2 - 1;
        const ny = y + dir * spread;
        done.cubicTo(x0 + stepX * 0.45, y, x1 - stepX * 0.45, ny, x1, ny);
        dots.push({ x: x1, y: ny });
        y = ny;
      } else if (i === step) {
        for (let k = 0; k < count; k++) {
          const dir = (k / (count - 1)) * 2 - 1;
          const ny = y + dir * spread;
          open.moveTo(x0, y);
          open.cubicTo(x0 + stepX * 0.45, y, x1 - stepX * 0.45, ny, x1, ny);
        }
      }
    }
    return { travelled: done, ahead: open, nodes: dots };
  }, [width, depth, step, path.join(',')]);

  const end = useDerivedValue(() => Math.max(0.001, progress.value));
  const glow = useDerivedValue(() => 0.42 + Math.sin(pulse.value * Math.PI * 2) * 0.16);

  return (
    <Canvas style={{ width, height: H }}>
      {/* The forks you have not taken. Brighter than the road, because they are the live
          question and the road behind you is settled. */}
      <Path path={ahead} style="stroke" strokeWidth={1.6} strokeCap="round"
        color={isDark ? 'rgba(245,236,215,0.34)' : 'rgba(0,0,0,0.26)'} />

      <Path path={travelled} style="stroke" strokeWidth={8} strokeCap="round"
        color={GOLD} start={0} end={end} opacity={glow}>
        <BlurMask blur={9} style="normal" />
      </Path>
      <Path path={travelled} style="stroke" strokeWidth={3} strokeCap="round"
        color={GOLD} start={0} end={end} />

      {nodes.map((n, i) => (
        <Circle key={i} cx={n.x} cy={n.y} r={4.5} color={IVORY} />
      ))}
    </Canvas>
  );
});

// ═════════════════════════════════════════════════════════════════════════════
// BRANCHING PULSE — the home strip's whole idea in one drawing
// ═════════════════════════════════════════════════════════════════════════════
/**
 * A light runs in from the left, hits the fork, and takes all three roads at once —
 * one bright, two dim — then the whole thing dissolves and does it again.
 *
 * Replaces a play button and a row of statistics. The strip has about a second to say
 * "a decision splits into worlds"; a triangle in a circle says "video" and the numbers
 * said nothing anyone had asked yet.
 */
export const BranchingPulse = memo(function BranchingPulse({
  width, height, isDark,
}: { width: number; height: number; isDark: boolean }) {
  const run = useSharedValue(0);

  useEffect(() => {
    run.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2100, easing: Easing.inOut(Easing.cubic) }),
        withTiming(1, { duration: 900 }),
        withTiming(0, { duration: 600, easing: Easing.in(Easing.quad) }),
      ), -1, false,
    );
  }, [run]);

  const midY = height / 2;
  const forkX = width * 0.36;

  const { stem, arms } = useMemo(() => {
    const stemPath = Skia.Path.Make();
    stemPath.moveTo(width * 0.06, midY);
    stemPath.lineTo(forkX, midY);

    const armPaths = [-1, 0, 1].map(dir => {
      const p = Skia.Path.Make();
      const endY = midY + dir * height * 0.3;
      p.moveTo(forkX, midY);
      p.cubicTo(forkX + width * 0.16, midY, width * 0.78, endY, width * 0.94, endY);
      return p;
    });
    return { stem: stemPath, arms: armPaths };
  }, [width, height]);

  // The stem draws first, then the arms — one gesture, not four.
  const stemEnd = useDerivedValue(() => interpolate(run.value, [0, 0.42], [0, 1], 'clamp'));
  const armEnd = useDerivedValue(() => interpolate(run.value, [0.38, 1], [0, 1], 'clamp'));
  const nodeR = useDerivedValue(() => interpolate(run.value, [0.34, 0.5, 0.62], [0, 5.5, 3.6], 'clamp'));
  const nodeGlow = useDerivedValue(() => interpolate(run.value, [0.34, 0.5, 0.8], [0, 1, 0.35], 'clamp'));

  const dim = isDark ? 'rgba(245,236,215,0.28)' : 'rgba(60,50,35,0.3)';

  return (
    <Canvas style={{ width, height }} pointerEvents="none">
      <Path path={stem} style="stroke" strokeWidth={2.2} strokeCap="round"
        color={GOLD} start={0} end={stemEnd} />

      {arms.map((a, i) => (
        <Path key={i} path={a} style="stroke" strokeWidth={i === 1 ? 2.4 : 1.4} strokeCap="round"
          color={i === 1 ? GOLD : dim} start={0} end={armEnd} />
      ))}

      {/* The moment of the split, lit. */}
      <Circle cx={forkX} cy={midY} r={nodeR} color={GOLD} opacity={nodeGlow} />
      <Circle cx={forkX} cy={midY} r={10} color={GOLD} opacity={useDerivedValue(() => nodeGlow.value * 0.5)}>
        <BlurMask blur={10} style="normal" />
      </Circle>
    </Canvas>
  );
});

// ═════════════════════════════════════════════════════════════════════════════
// SCENE WIPE — time moving between one decision and the next
// ═════════════════════════════════════════════════════════════════════════════
/**
 * A band of light crossing the screen as the scene changes.
 *
 * The old transition was a cross-fade, which reads as a screen being replaced. This
 * reads as time passing over the same world — brighter, quicker, and it gives the cut a
 * direction, which a fade never has.
 */
export const SceneWipe = memo(function SceneWipe({
  width, height, nonce,
}: { width: number; height: number; nonce: number }) {
  const t = useSharedValue(0);

  useMemo(() => {
    if (!nonce) return;
    t.value = 0;
    t.value = withTiming(1, { duration: 620, easing: Easing.inOut(Easing.cubic) });
  }, [nonce, t]);

  const BAND = width * 0.5;
  const x = useDerivedValue(() => interpolate(t.value, [0, 1], [-BAND, width + BAND]));
  const opacity = useDerivedValue(() => interpolate(t.value, [0, 0.2, 0.75, 1], [0, 1, 1, 0]));

  if (!nonce) return null;

  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      <Group opacity={opacity}>
        <Rect x={x} y={-height * 0.2} width={BAND} height={height * 1.4}
          origin={vec(width / 2, height / 2)} transform={[{ rotate: 0.12 }]}>
          <LinearGradient start={vec(0, 0)} end={vec(BAND, 0)}
            colors={[`${GOLD}00`, `${GOLD}30`, `${IVORY}66`, `${GOLD}30`, `${GOLD}00`]} />
        </Rect>
      </Group>
    </Canvas>
  );
});

// ═════════════════════════════════════════════════════════════════════════════
// CHANGE BARS — the four numbers, said plainly
// ═════════════════════════════════════════════════════════════════════════════
/**
 * What each meter did, against the world that happened.
 *
 * This replaces a radar and a line chart. Both were abstract: the radar had four
 * unlabelled axes and asked the player to remember which corner meant lives, and the
 * trajectory drew two lines that on most runs are almost flat. Neither answered the only
 * question the screen is for — what did I change?
 *
 * A bar growing out of a centre line does answer it. Reality is the line. Right is
 * better, left is worse, and the length is how much.
 */
export const ChangeBars = memo(function ChangeBars({
  width, values, baseline, hues, isDark,
}: {
  width: number; values: number[]; baseline: number; hues: string[]; isDark: boolean;
}) {
  const ROW = 34;
  const H = ROW * values.length;
  const grow = useSharedValue(0);

  useEffect(() => {
    grow.value = 0;
    grow.value = withTiming(1, { duration: 1000, easing: Easing.out(Easing.cubic) });
  }, [grow, values.join(',')]);

  const cx = width / 2;
  const half = width / 2 - 6;

  return (
    <Canvas style={{ width, height: H }}>
      {/* Reality, floor to ceiling. Everything is measured off this. */}
      <Rect x={cx - 0.75} y={2} width={1.5} height={H - 4}
        color={isDark ? 'rgba(245,236,215,0.34)' : 'rgba(0,0,0,0.26)'} />

      {values.map((v, i) => (
        <ChangeBar key={i} y={i * ROW + ROW / 2} delta={(v - baseline) / baseline}
          cx={cx} half={half} hue={hues[i]} grow={grow} />
      ))}
    </Canvas>
  );
});

function ChangeBar({ y, delta, cx, half, hue, grow }: {
  y: number; delta: number; cx: number; half: number; hue: string; grow: SharedValue<number>;
}) {
  const BAR_H = 13;
  const target = Math.max(-1, Math.min(1, delta)) * half;

  const x = useDerivedValue(() => (target >= 0 ? cx : cx + target * grow.value));
  const w = useDerivedValue(() => Math.max(1.5, Math.abs(target) * grow.value));
  const specX = useDerivedValue(() => x.value + 2);
  const specW = useDerivedValue(() => Math.max(0, w.value - 4));

  return (
    <Group>
      <RoundedRect x={x} y={y - BAR_H / 2} width={w} height={BAR_H} r={BAR_H / 2}
        color={hue} opacity={0.5}>
        <BlurMask blur={9} style="normal" />
      </RoundedRect>
      <RoundedRect x={x} y={y - BAR_H / 2} width={w} height={BAR_H} r={BAR_H / 2}>
        <LinearGradient start={vec(0, y - BAR_H / 2)} end={vec(0, y + BAR_H / 2)}
          colors={[`${hue}FF`, hue, `${hue}99`]} />
      </RoundedRect>
      {/* Gloss along the top of the bar. */}
      <RoundedRect x={specX} y={y - BAR_H / 2 + 1.6} width={specW}
        height={BAR_H * 0.32} r={BAR_H * 0.16} color="#FFFFFF" opacity={0.38} />
    </Group>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// THE TOWN BOARD — planks, nails, and whatever got pinned up today
// ═════════════════════════════════════════════════════════════════════════════
/**
 * The wall the notices hang on: rough vertical planks, seams between them, grain, and
 * the odd knot.
 *
 * The voices were on flat cards before, which made a stranger's opinion look like a
 * notification. In a medieval town the square is where you found out what had happened —
 * bills went up on a board and whoever could read read them aloud. Giving them the actual
 * wall does more for that idea than any amount of styling on a rectangle.
 *
 * Everything is seeded off the plank index, so the wall is identical between renders and
 * never shimmers as the list re-lays out.
 */
export const WoodWall = memo(function WoodWall({
  width, height, isDark,
}: { width: number; height: number; isDark: boolean }) {
  const PLANK = 58;
  const count = Math.max(1, Math.ceil(width / PLANK) + 1);

  // Two woods: a dark oiled oak at night, a sun-bleached pine by day.
  const base = isDark ? '#241B12' : '#B99A6E';
  const dark = isDark ? '#160F09' : '#8F7148';
  const light = isDark ? '#33261A' : '#D4B98C';

  const planks = useMemo(
    () => Array.from({ length: count }, (_, i) => {
      const seed = (i * 2654435761) % 1000;
      return {
        x: i * PLANK,
        // No two boards the same width; a wall of equal planks reads as wallpaper.
        w: PLANK * (0.82 + (seed % 40) / 100),
        shade: (seed % 7) / 22,
        knot: seed % 5 === 0 ? { y: 0.12 + (seed % 60) / 100, r: 4 + (seed % 3) } : null,
        grain: Array.from({ length: 3 }, (_, g) => ({
          x: 0.2 + ((seed + g * 137) % 60) / 100,
          y: ((seed + g * 71) % 90) / 100,
          len: 0.18 + ((seed + g * 31) % 40) / 100,
        })),
      };
    }),
    [count, PLANK],
  );

  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      <Rect x={0} y={0} width={width} height={height} color={base} />

      {planks.map((pl, i) => (
        <Group key={i}>
          {/* The board face: lit down the middle, shadowed at both edges. */}
          <Rect x={pl.x} y={0} width={pl.w} height={height}>
            <LinearGradient
              start={vec(pl.x, 0)} end={vec(pl.x + pl.w, 0)}
              colors={[dark, light, base, dark]}
              positions={[0, 0.18, 0.7, 1]}
            />
          </Rect>
          <Rect x={pl.x} y={0} width={pl.w} height={height} color={dark} opacity={pl.shade} />

          {/* The gap between boards. */}
          <Rect x={pl.x + pl.w - 1} y={0} width={2} height={height} color="#000000" opacity={0.42} />

          {pl.grain.map((g, k) => (
            <Rect
              key={k}
              x={pl.x + pl.w * g.x}
              y={height * g.y}
              width={1}
              height={height * g.len}
              color={dark}
              opacity={0.3}
            />
          ))}

          {pl.knot && (
            <Group>
              <Circle cx={pl.x + pl.w * 0.5} cy={height * pl.knot.y} r={pl.knot.r} color={dark} opacity={0.75} />
              <Circle cx={pl.x + pl.w * 0.5} cy={height * pl.knot.y} r={pl.knot.r * 1.9}
                style="stroke" strokeWidth={1} color={dark} opacity={0.4} />
            </Group>
          )}
        </Group>
      ))}

      {/* Light falls from above, as it would on a wall in a square. */}
      <Rect x={0} y={0} width={width} height={height} opacity={isDark ? 0.5 : 0.28}>
        <LinearGradient
          start={vec(0, 0)} end={vec(0, height)}
          colors={['#00000000', '#00000055', '#000000AA']}
        />
      </Rect>
    </Canvas>
  );
});

/**
 * One sheet of paper, torn by hand and nailed up.
 *
 * The edges are perturbed off a hash of the speaker, so every note is a different shape
 * but the same speaker always gets the same one — a sheet that re-tore itself on each
 * render would be unbearable. Drawn in Skia because a torn edge is a path, and put behind
 * real <Text> because the quote has to stay selectable, scalable and translated.
 */
export const PinnedNote = memo(function PinnedNote({
  width, height, seed, tone, isDark,
}: { width: number; height: number; seed: string; tone: string; isDark: boolean }) {
  const SPILL = 18;

  const rnd = useMemo(() => {
    let h = 2166136261;
    for (let i = 0; i < seed.length; i++) {
      h ^= seed.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    let v = Math.abs(h);
    // A tiny deterministic generator: same speaker, same tear, every time.
    return () => {
      v = (v * 1103515245 + 12345) & 0x7fffffff;
      return v / 0x7fffffff;
    };
  }, [seed]);

  const { paper, shadow } = useMemo(() => {
    const r = rnd;
    const p = Skia.Path.Make();
    const jitter = (n: number) => (r() - 0.5) * n;

    // Walk the four edges, wobbling as it goes. The top edge stays calmest — that is
    // the edge under the nail, the one that would be cut rather than torn.
    const steps = 7;
    p.moveTo(jitter(3), jitter(2));
    for (let i = 1; i <= steps; i++) p.lineTo((width / steps) * i, jitter(2.4));
    for (let i = 1; i <= steps; i++) p.lineTo(width + jitter(5), (height / steps) * i);
    for (let i = steps - 1; i >= 0; i--) p.lineTo((width / steps) * i, height + jitter(5));
    for (let i = steps - 1; i >= 0; i--) p.lineTo(jitter(5), (height / steps) * i);
    p.close();

    const sh = p.copy();
    return { paper: p, shadow: sh };
  }, [width, height, rnd]);

  // Old paper, warmer where it has been handled.
  const sheet = isDark ? '#E4D6B4' : '#F4EAD2';

  return (
    <Canvas
      style={{
        position: 'absolute',
        left: -SPILL, top: -SPILL,
        width: width + SPILL * 2, height: height + SPILL * 2,
      }}
      pointerEvents="none"
    >
      <Group transform={[{ translateX: SPILL, translateY: SPILL }]}>
        {/* The sheet lifts off the board, so it casts. */}
        <Group transform={[{ translateX: 2, translateY: 5 }]}>
          <Path path={shadow} color="#000000" opacity={0.45}>
            <BlurMask blur={7} style="normal" />
          </Path>
        </Group>

        <Path path={paper} color={sheet} />
        {/* Foxing: the paper darkens towards its edges the way old stock does. */}
        <Path path={paper} opacity={0.5}>
          <LinearGradient
            start={vec(0, 0)} end={vec(width, height)}
            colors={['#00000000', '#8A6A3A22', '#6B4E2833']}
          />
        </Path>
        <Path path={paper} style="stroke" strokeWidth={1} color={tone} opacity={0.28} />
      </Group>
    </Canvas>
  );
});

/** The nail holding a sheet to the board: a head, its shadow, and a point of light. */
export const Nail = memo(function Nail({ size, tone }: { size: number; tone: string }) {
  const c = size / 2;
  return (
    <Canvas style={{ width: size, height: size }} pointerEvents="none">
      <Circle cx={c} cy={c + 1.5} r={size * 0.32} color="#000000" opacity={0.5}>
        <BlurMask blur={2.5} style="normal" />
      </Circle>
      <Circle cx={c} cy={c} r={size * 0.3}>
        <LinearGradient
          start={vec(c - size * 0.3, c - size * 0.3)}
          end={vec(c + size * 0.3, c + size * 0.3)}
          colors={['#9A9089', '#4A423C', '#2A2420']}
        />
      </Circle>
      {/* The glint that makes it read as metal rather than a dot. */}
      <Circle cx={c - size * 0.09} cy={c - size * 0.09} r={size * 0.08} color="#E8E2D8" opacity={0.85} />
      <Circle cx={c} cy={c} r={size * 0.3} style="stroke" strokeWidth={0.6} color={tone} opacity={0.35} />
    </Canvas>
  );
});

// ═════════════════════════════════════════════════════════════════════════════
// CROWD OPINION — what the people actually think of you
// ═════════════════════════════════════════════════════════════════════════════
/**
 * Every voice the run produced, drawn as a person.
 *
 * The mood bar says where the room landed on average; an average is exactly the thing
 * that hides a country split down the middle. Here each quote the player was shown
 * becomes one figure, coloured by its mood, and the crowd arrives mood by mood — the
 * relieved settle, then the furious, then the grieving. The proportion IS the opinion,
 * and you read it without reading anything.
 *
 * One path per mood rather than one node per figure: ten animated groups instead of
 * sixty, which is the difference between a smooth arrival and a stutter.
 */
export const CrowdOpinion = memo(function CrowdOpinion({
  width, tally, order, isDark,
}: {
  width: number;
  /** mood -> how many voices felt it, across the whole run. */
  tally: Record<string, number>;
  /** Moods best-to-worst, so the crowd assembles in a stable, meaningful order. */
  order: string[];
  isDark: boolean;
}) {
  const R = 5.5;
  const GAP = 5;
  const perRow = Math.max(6, Math.floor((width + GAP) / (R * 2 + GAP)));
  const present = order.filter(mo => (tally[mo] ?? 0) > 0);
  const voices = present.reduce((n, mo) => n + tally[mo], 0);

  // Each voice stands for a slice of a population, not for one person. Eight quotes drew
  // eight dots in a single row, which reads as a tally rather than as a crowd — and a
  // proportion you cannot see is a proportion that says nothing. Scaled up to fill three
  // or four rows, the blocks of colour become the opinion.
  const scale = Math.max(1, Math.round(48 / Math.max(1, voices)));
  const counts: Record<string, number> = {};
  for (const mo of present) counts[mo] = tally[mo] * scale;
  const total = voices * scale;
  const rows = Math.max(1, Math.ceil(total / perRow));
  const H = rows * (R * 2 + GAP) + 6;

  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = 0;
    progress.value = withTiming(1, { duration: 260 + present.length * 190, easing: Easing.out(Easing.cubic) });
  }, [progress, total, present.length]);

  // Figures are laid out in reading order across the whole crowd, then split by mood, so
  // each colour occupies a contiguous run and the block sizes are the proportions.
  const groups = useMemo(() => {
    let i = 0;
    return present.map(mo => {
      const path = Skia.Path.Make();
      for (let n = 0; n < counts[mo]; n++, i++) {
        const col = i % perRow;
        const row = Math.floor(i / perRow);
        // A little jitter per row so it reads as a crowd rather than a spreadsheet.
        const jitter = ((row * 7 + col * 3) % 5) - 2;
        path.addCircle(R + col * (R * 2 + GAP), R + 3 + row * (R * 2 + GAP) + jitter * 0.35, R);
      }
      return { mood: mo, path };
    });
  }, [present, counts, perRow]);

  return (
    <Canvas style={{ width, height: H }}>
      {groups.map((g, gi) => {
        const from = gi / Math.max(1, groups.length);
        const to = (gi + 1) / Math.max(1, groups.length);
        return <CrowdGroup key={g.mood} group={g} progress={progress} from={from} to={to} isDark={isDark} />;
      })}
    </Canvas>
  );
});

function CrowdGroup({ group, progress, from, to, isDark }: {
  group: { mood: string; path: any }; progress: SharedValue<number>;
  from: number; to: number; isDark: boolean;
}) {
  const meta = MOOD_PAINT[group.mood] ?? { color: '#8A7E6B' };
  const opacity = useDerivedValue(() =>
    interpolate(progress.value, [from, to], [0, 1], 'clamp'));
  const scale = useDerivedValue(() =>
    interpolate(progress.value, [from, to], [0.4, 1], 'clamp'));

  return (
    <Group opacity={opacity} transform={useDerivedValue(() => [{ scale: scale.value }])}>
      <Path path={group.path} color={meta.color} opacity={isDark ? 0.9 : 0.85}>
        <BlurMask blur={3} style="normal" />
      </Path>
      <Path path={group.path} color={meta.color} />
    </Group>
  );
}

/** Mirrors MOOD_META in ParallelUniverse.tsx — only the colour, which is all the canvas needs. */
export const MOOD_PAINT: Record<string, { color: string }> = {
  elated: { color: '#3FA97A' }, hopeful: { color: '#5CB88C' },
  relieved: { color: '#6FA8C9' }, defiant: { color: '#C99A3C' },
  uneasy: { color: '#B08A5A' }, resigned: { color: '#8A8A96' },
  afraid: { color: '#9B7BD4' }, angry: { color: '#D9603F' },
  betrayed: { color: '#C7433F' }, grieving: { color: '#7A6E86' },
};

// ═════════════════════════════════════════════════════════════════════════════
// VERDICT SEAL — how good were you
// ═════════════════════════════════════════════════════════════════════════════
/**
 * One grade for the whole run, struck like a seal into wax.
 *
 * The ring sweeps to the score, the letter drops in behind it, and a ripple goes out on
 * landing. It answers the question the four meters never quite do — was I any good at
 * this? — and it is the thing a player screenshots.
 *
 * The letter itself is drawn by the hosting screen in real <Text>; this is the seal it
 * sits inside.
 */
export const VerdictSeal = memo(function VerdictSeal({
  size, score, tone,
}: { size: number; score: number; tone: string }) {
  const sweep = useSharedValue(0);
  const strike = useSharedValue(0);

  useEffect(() => {
    sweep.value = 0;
    strike.value = 0;
    sweep.value = withTiming(1, { duration: 1150, easing: Easing.out(Easing.cubic) });
    strike.value = withDelay(1000, withSequence(
      withTiming(1, { duration: 260, easing: Easing.out(Easing.quad) }),
      withTiming(0, { duration: 700, easing: Easing.in(Easing.quad) }),
    ));
  }, [sweep, strike, score]);

  const cx = size / 2;
  const cy = size / 2;
  const R = size / 2 - 10;

  const ring = useMemo(() => {
    const p = Skia.Path.Make();
    p.addArc({ x: cx - R, y: cy - R, width: R * 2, height: R * 2 }, -90, 360);
    return p;
  }, [size]);

  const end = useDerivedValue(() => sweep.value * score);
  const rippleR = useDerivedValue(() => interpolate(strike.value, [0, 1], [R, R * 1.5]));
  const rippleOpacity = useDerivedValue(() => strike.value * 0.6);

  return (
    <Canvas style={{ width: size, height: size }} pointerEvents="none">
      {/* The track: what a perfect run would have filled. */}
      <Path path={ring} style="stroke" strokeWidth={7} strokeCap="round"
        color={`${tone}22`} />

      <Path path={ring} style="stroke" strokeWidth={9} strokeCap="round"
        color={tone} start={0} end={end} opacity={0.55}>
        <BlurMask blur={12} style="normal" />
      </Path>
      <Path path={ring} style="stroke" strokeWidth={5} strokeCap="round"
        color={tone} start={0} end={end} />

      <Circle cx={cx} cy={cy} r={rippleR} style="stroke" strokeWidth={2}
        color={tone} opacity={rippleOpacity}>
        <BlurMask blur={7} style="normal" />
      </Circle>
    </Canvas>
  );
});

// ═════════════════════════════════════════════════════════════════════════════
// SOCIETY IMPACT — how much did you actually help
// ═════════════════════════════════════════════════════════════════════════════
/**
 * Two towers: the world that happened, and the one you made. Each is built of the four
 * meters stacked, growing from the ground up, and the difference in height is the answer
 * to "did I help?" — asked and answered without a sentence.
 *
 * Reality's tower is always the same height, which is what makes yours mean anything.
 */
export const SocietyImpact = memo(function SocietyImpact({
  width, values, baseline, isDark,
}: { width: number; values: number[]; baseline: number; isDark: boolean }) {
  const H = 128;
  const FLOOR = H - 16;
  const grow = useSharedValue(0);

  useEffect(() => {
    grow.value = 0;
    grow.value = withTiming(1, { duration: 1000, easing: Easing.out(Easing.cubic) });
  }, [grow, values]);

  const colW = Math.min(58, width * 0.28);
  const gap = width * 0.18;
  const leftX = width / 2 - gap / 2 - colW;
  const rightX = width / 2 + gap / 2;

  // Each meter contributes its share of the tower; reality is four equal blocks.
  const unit = (FLOOR - 12) / (baseline * 4);
  const real = [baseline, baseline, baseline, baseline];

  const tower = (xs: number, vals: number[], dim: boolean) => {
    let acc = 0;
    return vals.map((v, i) => {
      const h = v * unit;
      const y = FLOOR - acc - h;
      acc += h;
      return (
        <TowerBlock key={i} x={xs} y={y} w={colW} h={h} grow={grow}
          floor={FLOOR} hue={METER_HUES[i]} dim={dim} />
      );
    });
  };

  return (
    <Canvas style={{ width, height: H }}>
      <Rect x={0} y={FLOOR} width={width} height={1}
        color={isDark ? 'rgba(245,236,215,0.18)' : 'rgba(0,0,0,0.14)'} />
      {tower(leftX, real, true)}
      {tower(rightX, values, false)}
    </Canvas>
  );
});

function TowerBlock({ x, y, w, h, grow, floor, hue, dim }: {
  x: number; y: number; w: number; h: number; grow: SharedValue<number>;
  floor: number; hue: string; dim: boolean;
}) {
  // Everything rises out of the ground together rather than each block sliding in.
  const ry = useDerivedValue(() => floor - (floor - y) * grow.value);
  const rh = useDerivedValue(() => Math.max(0, h * grow.value));

  return (
    <>
      {!dim && (
        <RoundedRect x={x} y={ry} width={w} height={rh} r={3} color={hue} opacity={0.4}>
          <BlurMask blur={8} style="normal" />
        </RoundedRect>
      )}
      <RoundedRect x={x} y={ry} width={w} height={rh} r={3}
        color={hue} opacity={dim ? 0.24 : 0.95} />
    </>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// RARITY AURA — the badge behind a world you have just found
// ═════════════════════════════════════════════════════════════════════════════
/**
 * A slow sweep of light behind the ending's badge. Rare endings get a full gold rotation;
 * common ones get a dim, almost still one — the treatment has to be visibly different at
 * a glance or the rarity means nothing.
 */
export const RarityAura = memo(function RarityAura({
  size, rarity,
}: { size: number; rarity: string }) {
  const spin = useSharedValue(0);
  const rare = rarity === 'rare';
  const uncommon = rarity === 'uncommon';

  useEffect(() => {
    spin.value = withRepeat(
      withTiming(1, { duration: rare ? 4200 : 9000, easing: Easing.linear }), -1, false,
    );
  }, [spin, rare]);

  const transform = useDerivedValue(() => [{ rotate: spin.value * TAU }]);

  const colors = rare
    ? [`${GOLD}00`, `${GOLD}CC`, `${AMBER}55`, `${GOLD}00`]
    : uncommon
      ? [`${PURPLE}00`, `${PURPLE}88`, `${PURPLE}00`]
      : [`${IVORY}00`, `${IVORY}33`, `${IVORY}00`];

  return (
    <Canvas style={{ width: size, height: size }} pointerEvents="none">
      <Group origin={vec(size / 2, size / 2)} transform={transform}>
        <Circle cx={size / 2} cy={size / 2} r={size / 2 - 4} opacity={rare ? 0.85 : 0.5}>
          <SweepGradient c={vec(size / 2, size / 2)} colors={colors} />
          <BlurMask blur={rare ? 16 : 10} style="normal" />
        </Circle>
      </Group>
    </Canvas>
  );
});

// ═════════════════════════════════════════════════════════════════════════════
// FORK MARK — the icon the whole feature is introduced by
// ═════════════════════════════════════════════════════════════════════════════
/**
 * A single line that arrives, splits three ways and settles — the feature's whole idea
 * in one gesture, drawn once on the intro screen while the player reads the premise.
 */
export const ForkMark = memo(function ForkMark({ width, isDark }: { width: number; isDark: boolean }) {
  const H = 74;
  const draw = useSharedValue(0);

  useEffect(() => {
    draw.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1700, easing: Easing.out(Easing.cubic) }),
        withTiming(1, { duration: 1900 }),
        withTiming(0, { duration: 500, easing: Easing.in(Easing.quad) }),
      ), -1, false,
    );
  }, [draw]);

  const path = useMemo(() => {
    const p = Skia.Path.Make();
    const x0 = width * 0.16;
    const x1 = width * 0.5;
    const x2 = width * 0.84;
    p.moveTo(x0, H / 2);
    p.lineTo(x1, H / 2);
    for (const dy of [-H * 0.32, 0, H * 0.32]) {
      p.moveTo(x1, H / 2);
      p.cubicTo(x1 + 26, H / 2, x2 - 26, H / 2 + dy, x2, H / 2 + dy);
    }
    return p;
  }, [width]);

  return (
    <Canvas style={{ width, height: H }} pointerEvents="none">
      <Path path={path} style="stroke" strokeWidth={5} strokeCap="round"
        color={GOLD} start={0} end={draw} opacity={0.4}>
        <BlurMask blur={9} style="normal" />
      </Path>
      <Path path={path} style="stroke" strokeWidth={1.8} strokeCap="round"
        color={isDark ? IVORY : '#3A3226'} start={0} end={draw} />
      <Circle cx={width * 0.5} cy={H / 2} r={3.4} color={GOLD} />
    </Canvas>
  );
});

// Heights the hosting screen needs for layout, so it never has to guess at a canvas.
export const METER_WIDTH = METER_W;
export const MOOD_TIDE_HEIGHT = 58;
export const BRANCH_MAP_HEIGHT = 96;
