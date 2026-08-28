// components/ParallelPromoStrip.tsx
// The home-screen door into Parallel Universes.
//
// The in-story card was too quiet: it sits below a 600-word narrative and a long read,
// so most people never scrolled to it. This lives directly under the header, where the
// `today` banner ad used to be, and it opens the game in one tap rather than opening a
// story you then have to scroll through.
//
// It has to stop a thumb and explain itself in about a second, so it leads with a
// three-way fork drawing itself and "3 decisions · N endings" rather than the feature
// name. Someone who has never heard of it should know what happens when they tap.
//
// Three native-driven loops and nothing else — this sits on the home screen, which is
// the one place in the app where a dropped frame is unforgivable.
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { BranchingPulse } from './ParallelCanvas';
import { useDiscovered } from '../store/useParallelStore';
import { haptic } from '../utils/haptics';
import ParallelUniverse from './ParallelUniverse';

const SERIF = Platform.OS === 'ios' ? 'Georgia' : 'serif';

type Lang = 'en' | 'ro' | 'fr' | 'de' | 'es';

const L: Record<Lang, Record<string, string>> = {
  en: {
    badge: 'NEW',
    title: 'Change one decision. See what happens.',
    meta: '3 decisions · {n} endings',
    found: 'found',
    play: 'Play',
  },
  ro: {
    badge: 'NOU',
    title: 'Schimbă o decizie. Vezi ce iese.',
    meta: '3 decizii · {n} finaluri',
    found: 'găsite',
    play: 'Joacă',
  },
  fr: {
    badge: 'NOUVEAU',
    title: 'Changez une décision. Voyez la suite.',
    meta: '3 décisions · {n} fins',
    found: 'trouvées',
    play: 'Jouer',
  },
  de: {
    badge: 'NEU',
    title: 'Ändere eine Entscheidung. Sieh, was folgt.',
    meta: '3 Entscheidungen · {n} Enden',
    found: 'gefunden',
    play: 'Spielen',
  },
  es: {
    badge: 'NUEVO',
    title: 'Cambia una decisión. Mira qué pasa.',
    meta: '3 decisiones · {n} finales',
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

  // Nothing to promote on a day with no game — a dead strip is worse than no strip.
  if (!found) return null;

  return (
    <>
      <Pressable
        onPress={() => { haptic('medium'); setOpen(true); }}
        accessibilityRole="button"
        accessibilityLabel={t.title}
        style={({ pressed }) => [s.wrap, { transform: [{ scale: pressed ? 0.99 : 1 }] }]}
      >
        <LinearGradient
          colors={isDark ? ['#1A142E', '#100D1C', '#0B0912'] : ['#F4EEFF', '#FCF8FF', '#FFFDF7']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={[s.card, { borderColor: gold + '3A' }]}
        >
          {/* The drawing is the pitch. It sits behind the words at the left, where a
              play button used to be — a triangle in a circle said "video", which is the
              one thing this is not. */}
          <View style={s.art} pointerEvents="none">
            <BranchingPulse width={ART_W} height={ART_H} isDark={isDark} />
          </View>

          <View style={s.body}>
            <View style={s.topRow}>
              <View style={[s.badge, { backgroundColor: gold }]}>
                <Text style={s.badgeText}>{t.badge}</Text>
              </View>
              {discovered > 0 && (
                <Text style={[s.found, { color: theme.subtext }]}>
                  {discovered} {t.found}
                </Text>
              )}
            </View>

            <Text style={[s.title, { color: theme.text }]} numberOfLines={2}>
              {t.title}
            </Text>
          </View>
        </LinearGradient>
      </Pressable>

      <ParallelUniverse
        visible={open}
        onClose={() => setOpen(false)}
        event={found.event}
      />
    </>
  );
}

const ART_W = 104;
const ART_H = 74;

const s = StyleSheet.create({
  wrap: { marginHorizontal: 16, marginBottom: 14 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 20,
    paddingVertical: 16,
    paddingRight: 18,
    overflow: 'hidden',
  },
  art: { width: ART_W, height: ART_H, marginLeft: 4, justifyContent: 'center' },
  body: { flex: 1, justifyContent: 'center' },

  topRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 7 },
  badge: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2.5 },
  badgeText: { fontSize: 9, fontWeight: '900', letterSpacing: 1.1, color: '#1A1408' },
  found: { fontSize: 11 },

  title: { fontSize: 18, fontFamily: SERIF, fontWeight: '700', lineHeight: 24, letterSpacing: -0.35 },
});

/** Memoised: it sits above the day feed and re-renders on every scroll otherwise. */
const ParallelPromoStrip = memo(ParallelPromoStripInner);
export default ParallelPromoStrip;
