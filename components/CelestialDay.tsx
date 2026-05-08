// components/CelestialDay.tsx
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G, Line, Path } from 'react-native-svg';

interface CelestialDayProps {
  date: Date;
  size: number;
  isToday: boolean;
  dayNumber?: string | number;
  showNumber?: boolean;
  textColor?: string;
  textSize?: number;
  textWeight?: any;
  /** When true, the celestial body fills the bounds with extra glow (header use). */
  intense?: boolean;
}

const SYNODIC_MONTH = 29.5305882;
// Reference new moon: 2000-01-06 at 18:14 UTC, expressed as Julian Date.
const REF_NEW_MOON_JD = 2451550.1;

export function getMoonPhase(date: Date): number {
  const jd = (date.getTime() / 86400000) + 2440587.5;
  let phase = ((jd - REF_NEW_MOON_JD) / SYNODIC_MONTH) % 1;
  if (phase < 0) phase += 1;
  return phase;
}

function moonLitPath(phase: number, r: number): string | null {
  if (phase < 0.01 || phase > 0.99) return null;

  const cx = r;
  const cy = r;

  if (Math.abs(phase - 0.5) < 0.01) {
    return `M ${cx - r},${cy} a ${r},${r} 0 1,0 ${2 * r},0 a ${r},${r} 0 1,0 ${-2 * r},0 Z`;
  }

  const k = Math.cos(phase * 2 * Math.PI);
  const rx = Math.max(0.4, Math.abs(k) * r);
  const waxing = phase < 0.5;

  if (waxing) {
    if (k > 0) {
      return `M ${cx},${cy - r} A ${r},${r} 0 0,1 ${cx},${cy + r} A ${rx},${r} 0 0,1 ${cx},${cy - r} Z`;
    }
    return `M ${cx},${cy - r} A ${r},${r} 0 0,1 ${cx},${cy + r} A ${rx},${r} 0 0,0 ${cx},${cy - r} Z`;
  }

  if (k > 0) {
    return `M ${cx},${cy - r} A ${r},${r} 0 0,0 ${cx},${cy + r} A ${rx},${r} 0 0,0 ${cx},${cy - r} Z`;
  }
  return `M ${cx},${cy - r} A ${r},${r} 0 0,0 ${cx},${cy + r} A ${rx},${r} 0 0,1 ${cx},${cy - r} Z`;
}

const Sun = ({ size, intense }: { size: number; intense?: boolean }) => {
  const rotation = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const flicker = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 16000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1700, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1700, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(flicker, { toValue: 1, duration: 600, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(flicker, { toValue: 0, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const r = size / 2;
  const coreR = r * 0.56;
  const rotate = rotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const haloOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [intense ? 0.45 : 0.32, intense ? 0.85 : 0.65] });
  const coreScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] });
  const flickerScale = flicker.interpolate({ inputRange: [0, 1], outputRange: [1, 1.04] });

  const NUM_RAYS = 12;
  const rays: { x1: number; y1: number; x2: number; y2: number; long: boolean }[] = [];
  for (let i = 0; i < NUM_RAYS; i++) {
    const angle = (i * 360 / NUM_RAYS) * Math.PI / 180;
    const innerR = coreR * 1.10;
    const long = i % 2 === 0;
    const outerR = long ? r * 0.96 : r * 0.82;
    rays.push({
      x1: r + Math.cos(angle) * innerR,
      y1: r + Math.sin(angle) * innerR,
      x2: r + Math.cos(angle) * outerR,
      y2: r + Math.sin(angle) * outerR,
      long,
    });
  }

  return (
    <View style={[StyleSheet.absoluteFill, styles.center]} pointerEvents="none">
      {/* Outer warm halo */}
      <Animated.View style={[styles.abs, {
        width: size, height: size, borderRadius: size / 2,
        backgroundColor: '#FFB627',
        opacity: haloOpacity,
        transform: [{ scale: coreScale }],
      }]} />

      {/* Inner glow ring */}
      <Animated.View style={[styles.abs, {
        width: size * 0.78, height: size * 0.78, borderRadius: size * 0.39,
        backgroundColor: '#FFD66B',
        opacity: 0.55,
        transform: [{ scale: flickerScale }],
      }]} />

      {/* Rotating rays */}
      <Animated.View style={[styles.abs, {
        width: size, height: size,
        transform: [{ rotate }],
      }]}>
        <Svg width={size} height={size}>
          {rays.map((ray, i) => (
            <Line
              key={i}
              x1={ray.x1}
              y1={ray.y1}
              x2={ray.x2}
              y2={ray.y2}
              stroke={ray.long ? '#FFE08A' : '#FFB347'}
              strokeWidth={Math.max(1.4, size * (ray.long ? 0.045 : 0.032))}
              strokeLinecap="round"
              opacity={ray.long ? 0.92 : 0.7}
            />
          ))}
        </Svg>
      </Animated.View>

      {/* Solid sun core */}
      <Animated.View style={{
        width: coreR * 2, height: coreR * 2, borderRadius: coreR,
        backgroundColor: '#FFC83D',
        transform: [{ scale: flickerScale }],
        shadowColor: '#FF8B0F',
        shadowOpacity: 0.85,
        shadowRadius: Math.max(4, size * 0.18),
        shadowOffset: { width: 0, height: 0 },
        elevation: 8,
      }} />

      {/* Subtle highlight on the core */}
      <View style={{
        position: 'absolute',
        top: r - coreR * 0.55,
        left: r - coreR * 0.45,
        width: coreR * 0.55,
        height: coreR * 0.5,
        borderRadius: coreR * 0.3,
        backgroundColor: 'rgba(255,255,255,0.32)',
      }} />
    </View>
  );
};

const Moon = ({ size, date }: { size: number; date: Date }) => {
  const phase = getMoonPhase(date);
  const r = size / 2;
  const moonR = r * 0.92;
  const offset = r - moonR;
  const litPath = moonLitPath(phase, moonR);

  return (
    <View style={[StyleSheet.absoluteFill, styles.center]} pointerEvents="none">
      <Svg width={size} height={size}>
        {/* Outer halo */}
        <Circle cx={r} cy={r} r={moonR} fill="rgba(160,180,210,0.06)" />
        {/* Dark base — unlit portion */}
        <Circle
          cx={r}
          cy={r}
          r={moonR}
          fill="#1F1D2A"
          stroke="rgba(180,195,220,0.22)"
          strokeWidth={Math.max(0.5, size * 0.018)}
        />
        {/* Lit portion */}
        {litPath && (
          <G transform={`translate(${offset}, ${offset})`}>
            <Path d={litPath} fill="#EFEAD3" opacity={0.96} />
          </G>
        )}
        {/* Subtle craters on the lit side — only visible when reasonably lit */}
        {litPath && phase > 0.18 && phase < 0.82 && (
          <G transform={`translate(${offset}, ${offset})`} opacity={0.16}>
            <Circle cx={moonR * 1.05} cy={moonR * 0.7} r={moonR * 0.06} fill="#7A7560" />
            <Circle cx={moonR * 1.25} cy={moonR * 1.1} r={moonR * 0.04} fill="#7A7560" />
            <Circle cx={moonR * 0.95} cy={moonR * 1.3} r={moonR * 0.05} fill="#7A7560" />
          </G>
        )}
      </Svg>
    </View>
  );
};

export default function CelestialDay({
  date, size, isToday, dayNumber, showNumber = true, textColor, textSize, textWeight, intense,
}: CelestialDayProps) {
  return (
    <View style={[{ width: size, height: size }, styles.center]}>
      {isToday ? <Sun size={size} intense={intense} /> : <Moon size={size} date={date} />}

      {showNumber && (
        <View style={styles.abs} pointerEvents="none">
          <Text style={{
            fontSize: textSize ?? Math.round(size * 0.34),
            fontWeight: textWeight ?? '900',
            color: textColor ?? (isToday ? '#1A0F00' : '#F4EFD8'),
            textShadowColor: isToday ? 'rgba(255,170,40,0.55)' : 'rgba(0,0,0,0.7)',
            textShadowOffset: { width: 0, height: 1 },
            textShadowRadius: 3,
            letterSpacing: -0.5,
          }}>
            {dayNumber ?? date.getDate()}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  abs: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
