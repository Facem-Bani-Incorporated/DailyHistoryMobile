// components/ParallelPromoStrip.tsx
// The home-screen door into Parallel Universes.
//
// The in-story card was too quiet: it sits below a 600-word narrative and a long read,
// so most people never scrolled to it. This lives directly under the header, where the
// `today` banner ad used to be, and it opens the game in one tap rather than opening a
// story you then have to scroll through.
//
// It has to explain itself in about a second, so it leads with the fork-in-the-road
// icon and "3 decisions · 8 endings" rather than the feature name. A person who has
// never heard of it should understand what happens when they tap.
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
    meta: '3 decisions · 8 endings',
    found: 'found',
  },
  ro: {
    badge: 'NOU',
    title: 'Schimbă o decizie. Vezi ce iese.',
    meta: '3 decizii · 8 finaluri',
    found: 'găsite',
  },
  fr: {
    badge: 'NOUVEAU',
    title: 'Changez une décision. Voyez la suite.',
    meta: '3 décisions · 8 fins',
    found: 'trouvées',
  },
  de: {
    badge: 'NEU',
    title: 'Ändere eine Entscheidung. Sieh, was folgt.',
    meta: '3 Entscheidungen · 8 Enden',
    found: 'gefunden',
  },
  es: {
    badge: 'NUEVO',
    title: 'Cambia una decisión. Mira qué pasa.',
    meta: '3 decisiones · 8 finales',
    found: 'encontrados',
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
  const event = useMemo(
    () => (events ?? []).find(e => {
      if (!e?.parallelUniverse) return false;
      try {
        const p = JSON.parse(e.parallelUniverse);
        return !!(p?.[lang] ?? p?.en)?.nodes?.length;
      } catch {
        return false;
      }
    }) ?? null,
    [events, lang],
  );

  const eventId = String(event?.id ?? '');
  const discovered = useDiscovered(eventId).length;

  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!event) return;
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0, duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [event, pulse]);

  // Nothing to promote on a day with no game — a dead strip is worse than no strip.
  if (!event) return null;

  const glow = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.22, 0.6] });
  const tilt = pulse.interpolate({ inputRange: [0, 1], outputRange: ['-4deg', '4deg'] });

  return (
    <>
      <Pressable
        onPress={() => { haptic('medium'); setOpen(true); }}
        accessibilityRole="button"
        accessibilityLabel={t.title}
        style={({ pressed }) => [s.wrap, { opacity: pressed ? 0.92 : 1 }]}
      >
        <LinearGradient
          colors={isDark ? ['#1A1430', '#0F0C1B'] : ['#F3EEFF', '#FFFCF5']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={[s.card, { borderColor: gold + '4A' }]}
        >
          <View style={s.iconWrap}>
            <Animated.View style={[s.iconGlow, { backgroundColor: gold, opacity: glow }]} />
            <Animated.View style={{ transform: [{ rotate: tilt }] }}>
              <MaterialCommunityIcons name="directions-fork" size={26} color={gold} />
            </Animated.View>
          </View>

          <View style={s.body}>
            <View style={s.row}>
              <View style={[s.badge, { backgroundColor: gold }]}>
                <Text style={s.badgeText}>{t.badge}</Text>
              </View>
              <Text style={[s.meta, { color: theme.subtext }]} numberOfLines={1}>{t.meta}</Text>
            </View>
            <Text style={[s.title, { color: theme.text }]} numberOfLines={2}>{t.title}</Text>
            {discovered > 0 && (
              <Text style={[s.found, { color: gold }]}>{discovered}/8 {t.found}</Text>
            )}
          </View>

          <MaterialCommunityIcons name="chevron-right" size={22} color={gold} />
        </LinearGradient>
      </Pressable>

      <ParallelUniverse visible={open} onClose={() => setOpen(false)} event={event} />
    </>
  );
}

export default memo(ParallelPromoStripInner);

const s = StyleSheet.create({
  wrap: { marginHorizontal: 16, marginBottom: 12 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 13,
    borderWidth: 1, borderRadius: 16, paddingVertical: 13, paddingHorizontal: 15,
  },
  iconWrap: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  iconGlow: { position: 'absolute', width: 42, height: 42, borderRadius: 21 },

  body: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  badge: { borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2 },
  badgeText: { color: '#1A1408', fontSize: 8.5, fontWeight: '900', letterSpacing: 0.9 },
  meta: { flex: 1, fontSize: 10.5, fontWeight: '700', letterSpacing: 0.3 },

  title: { fontSize: 15, fontFamily: SERIF, fontWeight: '700', lineHeight: 20, letterSpacing: -0.2 },
  found: { fontSize: 10.5, fontWeight: '800', marginTop: 4, fontVariant: ['tabular-nums'] },
});
