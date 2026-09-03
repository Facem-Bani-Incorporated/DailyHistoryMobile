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
import { memo, useMemo, useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useDiscovered } from '../store/useParallelStore';
import { haptic } from '../utils/haptics';
import ParallelUniverse from './ParallelUniverse';
import { BranchField } from './ParallelCanvas';

type Lang = 'en' | 'ro' | 'fr' | 'de' | 'es';

const L: Record<Lang, Record<string, string>> = {
  en: {
    badge: 'PARALLEL WORLDS',
    title: 'Change one decision. See what happens.',
    meta: '{n} endings to find',
    found: 'found',
    play: 'Play',
  },
  ro: {
    badge: 'LUMI PARALELE',
    title: 'Schimbă o decizie. Vezi ce iese.',
    meta: '{n} finaluri de găsit',
    found: 'găsite',
    play: 'Joacă',
  },
  fr: {
    badge: 'MONDES PARALLÈLES',
    title: 'Changez une décision. Voyez la suite.',
    meta: '{n} fins à trouver',
    found: 'trouvées',
    play: 'Jouer',
  },
  de: {
    badge: 'PARALLELWELTEN',
    title: 'Ändere eine Entscheidung. Sieh, was folgt.',
    meta: '{n} Enden zu finden',
    found: 'gefunden',
    play: 'Spielen',
  },
  es: {
    badge: 'MUNDOS PARALELOS',
    title: 'Cambia una decisión. Mira qué pasa.',
    meta: '{n} finales por descubrir',
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
  const [w, setW] = useState(0);

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

  const open_ = () => { haptic('medium'); setOpen(true); };

  // Nothing to promote on a day with no game — a dead strip is worse than no strip.
  if (!found) return null;

  const total = found.endings;
  const pct = total ? Math.min(1, discovered / total) : 0;

  return (
    <>
      <Pressable
        onPress={open_}
        onLayout={e => setW(e.nativeEvent.layout.width)}
        accessibilityRole="button"
        accessibilityLabel={`${t.title}, ${discovered}/${total}`}
        style={({ pressed }) => [
          s.card,
          { borderColor: gold + '2E', opacity: pressed ? 0.9 : 1 },
        ]}
      >
        {/* Ground first, then the moving field, then a scrim, then the words. The
            scrim is what lets the animation run bright enough to be worth having
            without the title ever fighting a line crossing behind it. */}
        <LinearGradient
          colors={isDark ? ['#17131F', '#0E0C13'] : ['#FFFBF2', '#FFF7E8']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        {w > 0 && (
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <BranchField width={w} height={CARD_H} isDark={isDark} />
          </View>
        )}

        <LinearGradient
          colors={
            isDark
              ? ['rgba(14,12,19,0.94)', 'rgba(14,12,19,0.72)', 'rgba(14,12,19,0.12)']
              : ['rgba(255,251,242,0.94)', 'rgba(255,251,242,0.7)', 'rgba(255,251,242,0.1)']
          }
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />

        <View style={s.content}>
          <View style={s.body}>
            <Text style={[s.label, { color: gold }]}>{t.badge}</Text>
            <Text style={[s.title, { color: theme.text }]} numberOfLines={2}>
              {t.title}
            </Text>
          </View>

          <View style={s.right}>
            <Text style={[s.count, { color: discovered ? gold : theme.subtext }]}>
              {discovered}/{total}
            </Text>
            <MaterialCommunityIcons name="chevron-right" size={20} color={theme.subtext} />
          </View>
        </View>

        {discovered > 0 && (
          <View style={[s.track, { backgroundColor: isDark ? '#ffffff14' : '#00000012' }]}>
            <View style={[s.fill, { backgroundColor: gold, width: `${pct * 100}%` }]} />
          </View>
        )}
      </Pressable>

      <ParallelUniverse
        visible={open}
        onClose={() => setOpen(false)}
        event={found.event}
      />
    </>
  );
}

const CARD_H = 92;

const s = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom: 14,
    height: CARD_H,
    borderWidth: 1,
    borderRadius: 16,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  content: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16 },
  body: { flex: 1, gap: 5 },
  label: { fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },
  title: { fontSize: 16, fontWeight: '600', lineHeight: 21, letterSpacing: -0.2 },

  right: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  count: { fontSize: 13, fontWeight: '700', fontVariant: ['tabular-nums'] },

  track: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 2 },
  fill: { height: 2 },
});

/** Memoised: it sits above the day feed and re-renders on every scroll otherwise. */
const ParallelPromoStrip = memo(ParallelPromoStripInner);
export default ParallelPromoStrip;
