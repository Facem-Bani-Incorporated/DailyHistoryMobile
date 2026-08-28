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
import { memo, useMemo } from 'react';
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

  useMemo(() => {
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
const METER_H = 7;

/**
 * One meter. Reality is the midpoint notch, so the bar reads as "above or below what
 * actually happened" rather than as a quantity, and the fill glows in its own colour so
 * four of them side by side stay legible at a glance.
 */
export const SkiaMeter = memo(function SkiaMeter({
  value, hue, isDark,
}: { value: SharedValue<number>; hue: string; isDark: boolean }) {
  const w = useDerivedValue(() => Math.max(2, (value.value / 100) * METER_W));
  const glowW = useDerivedValue(() => Math.max(2, (value.value / 100) * METER_W));

  return (
    <Canvas style={{ width: METER_W, height: METER_H + 10 }}>
      <Group transform={[{ translateY: 5 }]}>
        <RoundedRect x={0} y={0} width={METER_W} height={METER_H} r={METER_H / 2}
          color={isDark ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.08)'} />

        {/* The glow is a second, blurred copy underneath — cheaper than a shadow and it
            keeps the crisp edge on top. */}
        <RoundedRect x={0} y={0} width={glowW} height={METER_H} r={METER_H / 2} color={hue} opacity={0.55}>
          <BlurMask blur={6} style="normal" />
        </RoundedRect>

        <RoundedRect x={0} y={0} width={w} height={METER_H} r={METER_H / 2}>
          <LinearGradient start={vec(0, 0)} end={vec(METER_W, 0)} colors={[`${hue}AA`, hue]} />
        </RoundedRect>

        {/* Reality. */}
        <Rect x={METER_W / 2 - 0.75} y={-2} width={1.5} height={METER_H + 4}
          color={isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.32)'} />
      </Group>
    </Canvas>
  );
});

// ═════════════════════════════════════════════════════════════════════════════
// MOOD TIDE — the fifth meter, and the only one made of people
// ═════════════════════════════════════════════════════════════════════════════
/**
 * Public mood as a body of water rather than a bar.
 *
 * The level is how the room feels, the colour runs from grief-red through a muted
 * neutral to elated-green, and the chop is how divided they are — a country that agrees
 * on a decision lies flat, one that is tearing itself apart will not settle. A bar can
 * carry the level; only the surface can carry the disagreement, and the disagreement is
 * the interesting half.
 */
export const MoodTide = memo(function MoodTide({
  width, mood, unrest, isDark,
}: {
  width: number; mood: SharedValue<number>; unrest: SharedValue<number>; isDark: boolean;
}) {
  const H = 58;
  const clock = useSharedValue(0);

  useMemo(() => {
    clock.value = withRepeat(withTiming(1, { duration: 4200, easing: Easing.linear }), -1, false);
  }, [clock]);

  const surface = useDerivedValue(() => {
    'worklet';
    const level = H - (mood.value / 100) * H;
    const amp = 1.5 + unrest.value * 5;
    const p = Skia.Path.Make();
    p.moveTo(0, H);
    p.lineTo(0, level);
    // Two summed sines at different rates: one wave alone reads as a loop, two never
    // quite repeat inside the time anyone looks at it.
    const steps = 28;
    for (let i = 0; i <= steps; i++) {
      const x = (i / steps) * width;
      const a = (i / steps) * TAU * 1.6 + clock.value * TAU;
      const b = (i / steps) * TAU * 2.7 - clock.value * TAU * 0.7;
      p.lineTo(x, level + Math.sin(a) * amp + Math.sin(b) * amp * 0.55);
    }
    p.lineTo(width, H);
    p.close();
    return p;
  });

  // A real rounded-rect object: `clip` takes Skia geometry, and a plain literal with rx
  // and ry on it slips past the union's type check while clipping to a square.
  const clip = useMemo(
    () => Skia.RRectXY(Skia.XYWHRect(0, 0, width, H), 11, 11),
    [width],
  );

  const tint = useDerivedValue(() =>
    interpolateColor(mood.value, [0, 30, 50, 70, 100], [BAD, '#C0713A', '#8A7E6B', '#5CB88C', GOOD]));
  const glowOpacity = useDerivedValue(() => 0.28 + unrest.value * 0.32);

  return (
    <Canvas style={{ width, height: H }}>
      <RoundedRect x={0} y={0} width={width} height={H} r={11}
        color={isDark ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.025)'} />
      <Group clip={clip}>
        <Path path={surface} color={tint} opacity={glowOpacity}>
          <BlurMask blur={11} style="normal" />
        </Path>
        <Path path={surface} color={tint} opacity={0.5} />
        {/* The waterline itself, drawn crisp on top of the soft body. */}
        <Path path={surface} style="stroke" strokeWidth={1.6} color={tint} />
      </Group>
      {/* Reality, again: half the room content is the neutral the tide is measured from. */}
      <Rect x={0} y={H / 2} width={width} height={1}
        color={isDark ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.13)'} />
    </Canvas>
  );
});

// ═════════════════════════════════════════════════════════════════════════════
// BRANCH MAP — the shape of the run
// ═════════════════════════════════════════════════════════════════════════════
/**
 * The tree, drawn as a tree: the root on the left, the endings fanning out on the right,
 * the path you actually took lit in gold and everything you passed up left dim.
 *
 * This replaces a row of dots that showed how far along you were but never what you gave
 * up. The untaken branches are the point — a player who can see nine other worlds hanging
 * off the choice they just made is a player who will run it again.
 */
export const BranchMap = memo(function BranchMap({
  width, depth, step, isDark,
}: { width: number; depth: number; step: number; isDark: boolean }) {
  const H = 96;
  const progress = useSharedValue(0);

  useMemo(() => {
    progress.value = withTiming(depth ? step / depth : 0, {
      duration: 620, easing: Easing.out(Easing.cubic),
    });
  }, [step, depth, progress]);

  // A symmetric fan: every level doubles, which is close enough to the real 3/3/2 tree
  // to read as its portrait without needing the tree itself passed down.
  const { dim, lit } = useMemo(() => {
    const padX = 10;
    const usable = width - padX * 2;
    const dimPath = Skia.Path.Make();
    const litPath = Skia.Path.Make();

    const build = (x: number, y: number, level: number, spread: number, onPath: boolean) => {
      if (level >= depth) return;
      const nx = x + usable / depth;
      const kids = level === 0 ? 3 : 2;
      for (let k = 0; k < kids; k++) {
        const offset = (k - (kids - 1) / 2) * spread;
        const ny = y + offset;
        const target = onPath && k === 0 ? litPath : dimPath;
        target.moveTo(x, y);
        target.cubicTo(x + usable / depth / 2, y, nx - usable / depth / 2, ny, nx, ny);
        build(nx, ny, level + 1, spread * 0.5, onPath && k === 0);
      }
    };
    build(padX, H / 2, 0, H * 0.3, true);
    return { dim: dimPath, lit: litPath };
  }, [width, depth]);

  return (
    <Canvas style={{ width, height: H }}>
      <Path path={dim} style="stroke" strokeWidth={1.1} strokeCap="round"
        color={isDark ? 'rgba(245,236,215,0.14)' : 'rgba(0,0,0,0.13)'} />
      {/* `end` trims the stroke, so the lit path draws itself forward as decisions are
          taken instead of appearing a segment at a time. */}
      <Path path={lit} style="stroke" strokeWidth={2.4} strokeCap="round"
        color={GOLD} start={0} end={progress}>
        <BlurMask blur={5} style="normal" />
      </Path>
      <Path path={lit} style="stroke" strokeWidth={1.5} strokeCap="round"
        color={IVORY} start={0} end={progress} />
    </Canvas>
  );
});

// ═════════════════════════════════════════════════════════════════════════════
// WORLD RADAR — your four numbers against the real ones
// ═════════════════════════════════════════════════════════════════════════════
/**
 * The ending's summary: a ghost quadrilateral at reality, yours drawn over it, and the
 * gap between them as a glow. Four numbers in a row can say the same thing, but the
 * shape says it in one look — a world that traded lives for freedom is a lopsided
 * diamond, and you recognise the silhouette before you read the labels.
 */
export const WorldRadar = memo(function WorldRadar({
  size, values, isDark,
}: { size: number; values: number[]; isDark: boolean }) {
  const R = size / 2 - 22;
  const cx = size / 2;
  const cy = size / 2;
  const reveal = useSharedValue(0);

  useMemo(() => {
    reveal.value = withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) });
  }, [reveal, values]);

  const pointAt = (i: number, r: number) => {
    const a = -Math.PI / 2 + (i / 4) * TAU;
    return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r };
  };

  const ghost = useMemo(() => {
    const p = Skia.Path.Make();
    for (let i = 0; i < 4; i++) {
      const { x, y } = pointAt(i, R * 0.5);
      i === 0 ? p.moveTo(x, y) : p.lineTo(x, y);
    }
    p.close();
    return p;
  }, [R, size]);

  const shape = useDerivedValue(() => {
    'worklet';
    const p = Skia.Path.Make();
    for (let i = 0; i < 4; i++) {
      const a = -Math.PI / 2 + (i / 4) * TAU;
      // Everything eases out from reality rather than from zero, so the reveal reads as
      // the world pulling away from the one that happened.
      const v = 0.5 + ((values[i] / 100) - 0.5) * reveal.value;
      const r = R * v;
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;
      i === 0 ? p.moveTo(x, y) : p.lineTo(x, y);
    }
    p.close();
    return p;
  });

  const grid = isDark ? 'rgba(245,236,215,0.13)' : 'rgba(0,0,0,0.12)';

  return (
    <Canvas style={{ width: size, height: size }}>
      {[1, 0.75, 0.5, 0.25].map((f, i) => {
        const p = Skia.Path.Make();
        for (let k = 0; k < 4; k++) {
          const { x, y } = pointAt(k, R * f);
          k === 0 ? p.moveTo(x, y) : p.lineTo(x, y);
        }
        p.close();
        return <Path key={i} path={p} style="stroke" strokeWidth={1} color={grid} />;
      })}
      {[0, 1, 2, 3].map(i => {
        const { x, y } = pointAt(i, R);
        const p = Skia.Path.Make();
        p.moveTo(cx, cy);
        p.lineTo(x, y);
        return <Path key={`a${i}`} path={p} style="stroke" strokeWidth={1} color={grid} />;
      })}

      {/* Reality, dashed and unglamorous. It is the thing being argued with. */}
      <Path path={ghost} style="stroke" strokeWidth={1.4} color={isDark ? '#8A7E6B' : '#9A8E7B'} />

      <Path path={shape} opacity={0.4}>
        <SweepGradient c={vec(cx, cy)} colors={[...METER_HUES, METER_HUES[0]]} />
        <BlurMask blur={13} style="normal" />
      </Path>
      <Path path={shape} opacity={0.22}>
        <SweepGradient c={vec(cx, cy)} colors={[...METER_HUES, METER_HUES[0]]} />
      </Path>
      <Path path={shape} style="stroke" strokeWidth={2}>
        <SweepGradient c={vec(cx, cy)} colors={[...METER_HUES, METER_HUES[0]]} />
      </Path>

      {[0, 1, 2, 3].map(i => {
        const { x, y } = pointAt(i, R + 11);
        return <Circle key={`d${i}`} cx={x} cy={y} r={3} color={METER_HUES[i]} />;
      })}
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
  const total = present.reduce((n, mo) => n + tally[mo], 0);
  const rows = Math.max(1, Math.ceil(total / perRow));
  const H = rows * (R * 2 + GAP) + 6;

  const progress = useSharedValue(0);
  useMemo(() => {
    progress.value = 0;
    progress.value = withTiming(1, { duration: 260 + present.length * 190, easing: Easing.out(Easing.cubic) });
  }, [progress, total, present.length]);

  // Figures are laid out in reading order across the whole crowd, then split by mood, so
  // each colour occupies a contiguous run and the block sizes are the proportions.
  const groups = useMemo(() => {
    let i = 0;
    return present.map(mo => {
      const path = Skia.Path.Make();
      for (let n = 0; n < tally[mo]; n++, i++) {
        const col = i % perRow;
        const row = Math.floor(i / perRow);
        // A little jitter per row so it reads as a crowd rather than a spreadsheet.
        const jitter = ((row * 7 + col * 3) % 5) - 2;
        path.addCircle(R + col * (R * 2 + GAP), R + 3 + row * (R * 2 + GAP) + jitter * 0.35, R);
      }
      return { mood: mo, path };
    });
  }, [present, tally, perRow]);

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

  useMemo(() => {
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

  useMemo(() => {
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

  useMemo(() => {
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
// TRAJECTORY — the arc of the whole run
// ═════════════════════════════════════════════════════════════════════════════
/**
 * Two lines over the run: where the world stood after each decision, and where the
 * people stood. A run that recovered from a catastrophic second act reads completely
 * differently from one that coasted to the same place, and the end-state numbers cannot
 * tell those apart — only the shape can.
 */
export const TrajectoryCurve = memo(function TrajectoryCurve({
  width, history, isDark,
}: { width: number; history: { world: number; mood: number }[]; isDark: boolean }) {
  const H = 86;
  const PAD = 12;
  const draw = useSharedValue(0);

  useMemo(() => {
    draw.value = 0;
    draw.value = withTiming(1, { duration: 1100, easing: Easing.out(Easing.cubic) });
  }, [draw, history.length]);

  const { worldPath, moodPath, fill, dots } = useMemo(() => {
    const n = Math.max(1, history.length - 1);
    const stepX = (width - PAD * 2) / n;
    // World runs -140…+140 and mood 0…100, so each is drawn against its own midpoint.
    // They share a meaningful centre — reality — rather than a scale.
    const yW = (v: number) => PAD + (1 - (Math.max(-140, Math.min(140, v)) + 140) / 280) * (H - PAD * 2);
    const yM = (v: number) => PAD + (1 - Math.max(0, Math.min(100, v)) / 100) * (H - PAD * 2);

    const mk = (f: (v: number) => number, key: 'world' | 'mood') => {
      const p = Skia.Path.Make();
      history.forEach((h, i) => {
        const x = PAD + i * stepX;
        const y = f(h[key]);
        if (i === 0) { p.moveTo(x, y); return; }
        // Smoothed with horizontal control points: a polyline of three points reads as
        // a chart, a curve reads as a story.
        const px = PAD + (i - 1) * stepX;
        const py = f(history[i - 1][key]);
        p.cubicTo(px + stepX / 2, py, x - stepX / 2, y, x, y);
      });
      return p;
    };

    const w = mk(yW, 'world');
    const area = w.copy();
    area.lineTo(PAD + n * stepX, H);
    area.lineTo(PAD, H);
    area.close();

    return {
      worldPath: w,
      moodPath: mk(yM, 'mood'),
      fill: area,
      dots: history.map((h, i) => ({ x: PAD + i * stepX, y: yW(h.world) })),
    };
  }, [history, width]);

  const grid = isDark ? 'rgba(245,236,215,0.12)' : 'rgba(0,0,0,0.1)';

  return (
    <Canvas style={{ width, height: H }}>
      <Rect x={PAD} y={H / 2} width={width - PAD * 2} height={1} color={grid} />

      <Path path={fill} opacity={0.16}>
        <LinearGradient start={vec(0, 0)} end={vec(0, H)} colors={[GOLD, `${GOLD}00`]} />
      </Path>

      <Path path={moodPath} style="stroke" strokeWidth={1.8} strokeCap="round"
        color={PURPLE} start={0} end={draw} opacity={0.85} />

      <Path path={worldPath} style="stroke" strokeWidth={4} strokeCap="round"
        color={GOLD} start={0} end={draw} opacity={0.5}>
        <BlurMask blur={7} style="normal" />
      </Path>
      <Path path={worldPath} style="stroke" strokeWidth={2.2} strokeCap="round"
        color={GOLD} start={0} end={draw} />

      {dots.map((d, i) => (
        <Circle key={i} cx={d.x} cy={d.y} r={3.2} color={IVORY} />
      ))}
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

  useMemo(() => {
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
