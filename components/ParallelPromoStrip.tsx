// components/ParallelPromoStrip.tsx
// The home-screen door into Parallel Universes.
//
// The in-story card was too quiet: it sits below a 600-word narrative and a long read,
// so most people never scrolled to it. This lives directly under the header, where the
// `today` banner ad used to be, and it opens the game in one tap rather than opening a
// story you then have to scroll through.
//
// It has to stop a thumb and explain itself in about a second, so it leads with a
// three-way fork drawing itself and "3 decisions · 12 endings" rather than the feature
// name. Someone who has never heard of it should know what happens when they tap.
//
// Three native-driven loops and nothing else — this sits on the home screen, which is
// the one place in the app where a dropped frame is unforgivable.
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { useDiscovered } from '../store/useParallelStore';
import { haptic } from '../utils/haptics';
import ParallelUniverse from './ParallelUniverse';

const SERIF = Platform.OS === 'ios' ? 'Georgia' : 'serif';

type Lang = 'en' | 'ro' | 'fr' | 'de' | 'es';

const L: Record<Lang, Record<string, string>> = {
  en: {
    badge: 'NEW',
    title: 'Change one decision. See what happens.',
    meta: '3 decisions · 12 endings',
    found: 'found',
    play: 'Play',
  },
  ro: {
    badge: 'NOU',
    title: 'Schimbă o decizie. Vezi ce iese.',
    meta: '3 decizii · 12 finaluri',
    found: 'găsite',
    play: 'Joacă',
  },
  fr: {
    badge: 'NOUVEAU',
    title: 'Changez une décision. Voyez la suite.',
    meta: '3 décisions · 12 fins',
    found: 'trouvées',
    play: 'Jouer',
  },
  de: {
    badge: 'NEU',
    title: 'Ändere eine Entscheidung. Sieh, was folgt.',
    meta: '3 Entscheidungen · 12 Enden',
    found: 'gefunden',
    play: 'Spielen',
  },
  es: {
    badge: 'NUEVO',
    title: 'Cambia una decisión. Mira qué pasa.',
    meta: '3 decisiones · 12 finales',
    found: 'encontrados',
    play: 'Jugar',
  },
};

interface Props {
  /** The day's events. The first one carrying a game wins. */
  events: any[];
  language: string;
  theme: any;
  isDark: boolean;
}

function ParallelPromoStripInner({ events, language, theme, isDark }: Props) {
  const lang = (['en', 'ro', 'fr', 'de', 'es'].includes(language) ? language : 'en') as Lang;
  const t = L[lang];
  const gold = theme.gold ?? '#D4A843';
  const [open, setOpen] = useState(false);

  // Only the day's hero events carry a game, so most days this finds exactly one.
  const found = useMemo(() => {
    for (const e of events ?? []) {
      if (!e?.parallelUniverse) continue;
      try {
        const parsed = JSON.parse(e.parallelUniverse);
        const u = parsed?.[lang] ?? parsed?.en;
        if (u?.nodes?.length) {
          return { event: e, endings: u.nodes.filter((n: any) => !n.choices?.length).length };
        }
      } catch { /* a malformed blob is the same as no game */ }
    }
    return null;
  }, [events, lang]);

  const eventId = String(found?.event?.id ?? '');
  const discovered = useDiscovered(eventId).length;

  const sweep = useRef(new Animated.Value(0)).current;   // light crossing the card
  const draw = useRef(new Animated.Value(0)).current;    // the fork drawing itself
  const breathe = useRef(new Animated.Value(0)).current; // the glow behind the icon

  useEffect(() => {
    if (!found) return;
    const loops = [
      Animated.loop(Animated.sequence([
        Animated.delay(1200),
        Animated.timing(sweep, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(sweep, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])),
      Animated.loop(Animated.sequence([
        Animated.timing(draw, { toValue: 1, duration: 1800, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.delay(2600),
        Animated.timing(draw, { toValue: 0, duration: 600, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      ])),
      Animated.loop(Animated.sequence([
        Animated.timing(breathe, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(breathe, { toValue: 0, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])),
    ];
    loops.forEach(l => l.start());
    return () => loops.forEach(l => l.stop());
  }, [found, sweep, draw, breathe]);

  // Nothing to promote on a day with no game — a dead strip is worse than no strip.
  if (!found) return null;

  const sweepX = sweep.interpolate({ inputRange: [0, 1], outputRange: [-160, 460] });
  const sweepFade = sweep.interpolate({ inputRange: [0, 0.15, 0.85, 1], outputRange: [0, 0.5, 0.5, 0] });
  const glow = breathe.interpolate({ inputRange: [0, 1], outputRange: [0.2, 0.55] });
  const glowScale = breathe.interpolate({ inputRange: [0, 1], outputRange: [0.88, 1.1] });

  return (
    <>
      <Pressable
        onPress={() => { haptic('medium'); setOpen(true); }}
        accessibilityRole="button"
        accessibilityLabel={t.title}
        style={({ pressed }) => [s.wrap, { transform: [{ scale: pressed ? 0.988 : 1 }] }]}
      >
        <LinearGradient
          colors={isDark ? ['#1D1636', '#120E20', '#0C0A14'] : ['#F0E9FF', '#FBF6FF', '#FFFCF5']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={[s.card, { borderColor: gold + '55' }]}
        >
          {/* Light crossing the card. Clipped by the card's overflow, so it reads as a
              sheen on the surface rather than a rectangle sliding past. */}
          <Animated.View
            pointerEvents="none"
            style={[s.sheen, { opacity: sweepFade, transform: [{ translateX: sweepX }, { rotate: '18deg' }] }]}
          >
            <LinearGradient
              colors={['transparent', gold + '55', 'transparent']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>

          {/* The fork, drawing and resetting. One path stays gold — the one you take. */}
          <View style={s.forkWrap} pointerEvents="none">
            <Animated.View style={[s.forkStem, {
              backgroundColor: gold,
              opacity: draw.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 0.75, 0.75] }),
              transform: [{ scaleY: draw.interpolate({ inputRange: [0, 0.35, 1], outputRange: [0, 1, 1] }) }],
            }]} />
            {[-1, 0, 1].map(i => (
              <Animated.View
                key={i}
                style={[s.forkArm, {
                  backgroundColor: gold,
                  opacity: draw.interpolate({
                    inputRange: [0, 0.4, 1],
                    outputRange: [0, i === 0 ? 0.8 : 0.3, i === 0 ? 0.8 : 0.3],
                  }),
                  transform: [
                    { scaleY: draw.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 0, 1] }) },
                    { translateY: 13 },
                    { rotate: `${i * 26}deg` },
                  ],
                }]}
              />
            ))}
          </View>

          <View style={s.iconWrap}>
            <Animated.View style={[s.iconGlow, { backgroundColor: gold, opacity: glow, transform: [{ scale: glowScale }] }]} />
            <MaterialCommunityIcons name="directions-fork" size={27} color={gold} />
          </View>

          <View style={s.body}>
            <View style={s.row}>
              <View style={[s.badge, { backgroundColor: gold }]}>
                <Text style={s.badgeText}>{t.badge}</Text>
              </View>
              <Text style={[s.meta, { color: theme.subtext }]} numberOfLines={1}>{t.meta}</Text>
            </View>
            <Text style={[s.title, { color: theme.text }]} numberOfLines={2}>{t.title}</Text>
            <View style={s.progressRow}>
              <View style={[s.track, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }]}>
                <View style={[s.fill, {
                  width: `${Math.max(3, (discovered / Math.max(1, found.endings)) * 100)}%`,
                  backgroundColor: gold,
                }]} />
              </View>
              <Text style={[s.count, { color: gold }]}>
                {discovered}/{found.endings} {t.found}
              </Text>
            </View>
          </View>

          <View style={[s.play, { borderColor: gold + '66', backgroundColor: gold + '18' }]}>
            <MaterialCommunityIcons name="play" size={16} color={gold} />
          </View>
        </LinearGradient>
      </Pressable>

      <ParallelUniverse visible={open} onClose={() => setOpen(false)} event={found.event} />
    </>
  );
}

export default memo(ParallelPromoStripInner);

const s = StyleSheet.create({
  wrap: { marginHorizontal: 16, marginBottom: 12 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 13,
    borderWidth: 1, borderRadius: 18, paddingVertical: 14, paddingHorizontal: 15,
    overflow: 'hidden',
  },
  sheen: { position: 'absolute', top: -40, bottom: -40, width: 70 },

  forkWrap: { position: 'absolute', right: 54, top: 8, alignItems: 'center', opacity: 0.9 },
  forkStem: { width: 1.5, height: 15, borderRadius: 1 },
  forkArm: { position: 'absolute', top: 12, width: 1.5, height: 26, borderRadius: 1 },

  iconWrap: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  iconGlow: { position: 'absolute', width: 44, height: 44, borderRadius: 22 },

  body: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  badge: { borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2 },
  badgeText: { color: '#1A1408', fontSize: 8.5, fontWeight: '900', letterSpacing: 0.9 },
  meta: { flex: 1, fontSize: 10.5, fontWeight: '700', letterSpacing: 0.3 },

  title: { fontSize: 15, fontFamily: SERIF, fontWeight: '700', lineHeight: 20, letterSpacing: -0.2 },

  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 7 },
  track: { flex: 1, height: 3, borderRadius: 2, overflow: 'hidden' },
  fill: { height: 3, borderRadius: 2 },
  count: { fontSize: 9.5, fontWeight: '800', fontVariant: ['tabular-nums'] },

  play: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
