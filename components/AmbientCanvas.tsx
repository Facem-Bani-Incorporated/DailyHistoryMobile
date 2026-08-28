// components/AmbientCanvas.tsx
// The Skia layer that sits under the whole home screen.
//
// The feed was correct but flat: a colour, a card, a colour. This gives the app a room to
// stand in — a slow aurora, gold dust that drifts, and a warm floor light that answers
// the scroll. All of it stays behind the content and none of it competes with a headline.
//
// Two constraints shaped every choice here:
//
// 1. **It sits behind a scrolling list, so it must never cost a frame.** One canvas, four
//    animated paths, everything on the UI thread through Reanimated shared values. No
//    per-item canvases, no setState on scroll.
//
// 2. **It has to survive light mode.** The premium palette is near-black and the effect
//    is obvious there; on the light theme the same ribbons at the same opacity read as
//    dirt. Every layer therefore has two amplitudes, not one colour swap.
import {
  BlurMask, Canvas, Circle, Group, LinearGradient, Path, RadialGradient,
  Rect, Skia, vec,
} from '@shopify/react-native-skia';
import { memo, useMemo } from 'react';
import { StyleSheet } from 'react-native';
import {
  Easing, interpolate, useDerivedValue, useSharedValue,
  withRepeat, withTiming, type SharedValue,
} from 'react-native-reanimated';

const GOLD = '#D4A843';
const AMBER = '#C17B2A';
const PURPLE = '#7B5EA7';

const TAU = Math.PI * 2;

/**
 * One aurora ribbon at time `t`. A module function marked as a worklet so both ribbons
 * share it without either of them owning a hook.
 */
function auroraPath(
  clock: number, speed: number, phase: number,
  baseY: number, amp: number, width: number, height: number,
) {
  'worklet';
  const t = (clock * speed + phase) % 1;
  const y = baseY + Math.sin(t * TAU) * height * 0.045;
  const p = Skia.Path.Make();
  p.moveTo(-width * 0.2, y);
  const steps = 6;
  for (let i = 1; i <= steps; i++) {
    const x = -width * 0.2 + (width * 1.4 * i) / steps;
    const prevX = -width * 0.2 + (width * 1.4 * (i - 1)) / steps;
    const wob = Math.sin(t * TAU + i * 1.1) * amp;
    p.cubicTo(prevX + width * 0.12, y + wob, x - width * 0.12, y - wob, x, y);
  }
  return p;
}

interface Props {
  width: number;
  height: number;
  isDark: boolean;
  /** Premium gets the full treatment; the plain dark theme gets a quieter version. */
  isPremium?: boolean;
  /** Feed offset in px. The floor light and the dust drift against it. */
  scroll?: SharedValue<number>;
}

/**
 * The room the app stands in.
 *
 * Three layers, back to front: a vertical ground gradient, two aurora ribbons that
 * breathe across each other, and a field of dust motes. The ribbons are slow enough
 * (18 and 26 seconds) that nothing ever appears to loop while you are reading.
 */
export const AmbientBackdrop = memo(function AmbientBackdrop({
  width, height, isDark, isPremium = false, scroll,
}: Props) {
  const clock = useSharedValue(0);

  useMemo(() => {
    clock.value = withRepeat(withTiming(1, { duration: 26000, easing: Easing.linear }), -1, false);
  }, [clock]);

  // Light mode runs at about half: the same ribbon that reads as atmosphere on
  // near-black reads as a smudge on ivory. A third turned out to be invisible on a
  // real screen, which is worse than absent — it costs a canvas and gives nothing.
  const A = isDark ? (isPremium ? 1 : 0.72) : 0.55;

  const ground = isDark
    ? (isPremium ? ['#0B0817', '#07060E', '#05040A'] : ['#141821', '#0E1117', '#0B0E14'])
    : ['#FFFDF7', '#FAF7EE', '#F3EFE4'];

  // Written out twice rather than through a helper: a hook called inside a closure is a
  // rule-of-hooks violation that happens to work here, and the next person to add a third
  // ribbon behind an `if` would find out the hard way.
  const r1 = useDerivedValue(() => {
    'worklet';
    return auroraPath(clock.value, 1, 0, height * 0.26, height * 0.06, width, height);
  });
  const r2 = useDerivedValue(() => {
    'worklet';
    return auroraPath(clock.value, 0.68, 0.5, height * 0.62, height * 0.045, width, height);
  });

  // The floor light tracks the scroll, so pushing the feed up warms the bottom of the
  // screen. Subtle, but it is what stops the background feeling painted on.
  const floorY = useDerivedValue(() =>
    scroll ? height * 0.94 - Math.min(160, Math.max(0, scroll.value)) * 0.25 : height * 0.94);

  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      <Rect x={0} y={0} width={width} height={height}>
        <LinearGradient start={vec(0, 0)} end={vec(0, height)} colors={ground} />
      </Rect>

      <Group opacity={0.5 * A}>
        <Path path={r1} style="stroke" strokeWidth={height * 0.1} color={isDark ? PURPLE : GOLD}>
          <BlurMask blur={70} style="normal" />
        </Path>
        <Path path={r2} style="stroke" strokeWidth={height * 0.08} color={isDark ? AMBER : AMBER}>
          <BlurMask blur={80} style="normal" />
        </Path>
      </Group>

      <Dust width={width} height={height} clock={clock} amount={A} isDark={isDark} />

      {/* Warm floor light. Anchors the tab bar instead of letting it float on flat colour. */}
      <FloorGlow width={width} y={floorY} isDark={isDark} amount={A} />
    </Canvas>
  );
});

/** Gold motes on their own loops. Twenty is enough to feel alive and cheap to draw. */
function Dust({ width, height, clock, amount, isDark }: {
  width: number; height: number; clock: SharedValue<number>; amount: number; isDark: boolean;
}) {
  const motes = useMemo(
    () => Array.from({ length: 20 }, (_, i) => ({
      x: ((i * 97) % 100) / 100,
      y: ((i * 61) % 100) / 100,
      r: 0.8 + ((i * 13) % 5) * 0.34,
      speed: 0.35 + ((i * 7) % 6) / 9,
      phase: ((i * 29) % 100) / 100,
    })),
    [],
  );

  return (
    <Group opacity={amount * (isDark ? 0.5 : 0.28)}>
      {motes.map((m, i) => (
        <Mote key={i} m={m} width={width} height={height} clock={clock} />
      ))}
    </Group>
  );
}

function Mote({ m, width, height, clock }: {
  m: { x: number; y: number; r: number; speed: number; phase: number };
  width: number; height: number; clock: SharedValue<number>;
}) {
  // Rises, wanders sideways, wraps. Never in step with its neighbours.
  const cy = useDerivedValue(() => {
    const t = (clock.value * m.speed + m.phase) % 1;
    return height * (1.05 - t * 1.1);
  });
  const cx = useDerivedValue(() => {
    const t = (clock.value * m.speed + m.phase) % 1;
    return width * m.x + Math.sin(t * TAU + m.phase * TAU) * 22;
  });
  const opacity = useDerivedValue(() => {
    const t = (clock.value * m.speed + m.phase) % 1;
    // Fade in and out at the edges so nothing pops into existence.
    return interpolate(t, [0, 0.15, 0.85, 1], [0, 1, 1, 0]);
  });

  return (
    <Circle cx={cx} cy={cy} r={m.r} color={GOLD} opacity={opacity}>
      <BlurMask blur={2} style="normal" />
    </Circle>
  );
}

function FloorGlow({ width, y, isDark, amount }: {
  width: number; y: SharedValue<number>; isDark: boolean; amount: number;
}) {
  const transform = useDerivedValue(() => [{ translateY: y.value }]);
  return (
    <Group transform={transform} opacity={amount * (isDark ? 0.55 : 0.3)}>
      <Circle cx={width / 2} cy={0} r={width * 0.85}>
        <RadialGradient
          c={vec(width / 2, 0)}
          r={width * 0.85}
          colors={[`${GOLD}44`, `${GOLD}12`, `${GOLD}00`]}
        />
      </Circle>
    </Group>
  );
}

/**
 * A soft halo behind a card. Draws the eye to the day's lead story without a border,
 * a shadow or any of the other things that make a card look like a container.
 */
export const CardHalo = memo(function CardHalo({
  width, height, tone = GOLD, isDark, intensity = 1,
}: { width: number; height: number; tone?: string; isDark: boolean; intensity?: number }) {
  const breathe = useSharedValue(0);

  useMemo(() => {
    breathe.value = withRepeat(
      withTiming(1, { duration: 5200, easing: Easing.inOut(Easing.sin) }), -1, true,
    );
  }, [breathe]);

  const opacity = useDerivedValue(() =>
    interpolate(breathe.value, [0, 1], [0.16, 0.32]) * intensity * (isDark ? 1 : 0.55));

  return (
    <Canvas style={{ width, height }} pointerEvents="none">
      <Group opacity={opacity}>
        <Rect x={18} y={18} width={width - 36} height={height - 36} color={tone}>
          <BlurMask blur={26} style="normal" />
        </Rect>
      </Group>
    </Canvas>
  );
});
