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
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useDiscovered } from '../store/useParallelStore';
import { haptic } from '../utils/haptics';
import ParallelUniverse from './ParallelUniverse';

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
      {/* One row, read left to right: what this is, what it asks, how far you are.
          It replaces a gradient card carrying an animated branching diagram, a gold
          "NEW" pill, a serif headline and a separate Play button — five things
          competing for the same glance, none of which said what the feature does.
          The row is the target; the chevron says so. */}
      <Pressable
        onPress={open_}
        accessibilityRole="button"
        accessibilityLabel={`${t.title} — ${discovered}/${total}`}
        style={({ pressed }) => [
          s.row,
          { backgroundColor: theme.card, borderColor: theme.border, opacity: pressed ? 0.85 : 1 },
        ]}
      >
        <View style={s.body}>
          <Text style={[s.label, { color: theme.subtext }]}>{t.badge}</Text>
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

        {/* Progress only once there is progress. An empty bar on first sight reads as
            something already failing rather than something not yet started. */}
        {discovered > 0 && (
          <View style={[s.track, { backgroundColor: theme.border }]}>
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

const s = StyleSheet.create({
  row: {
    marginHorizontal: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  body: { flex: 1, gap: 5 },
  label: { fontSize: 10, fontWeight: '700', letterSpacing: 1.4 },
  title: { fontSize: 15.5, fontWeight: '600', lineHeight: 21, letterSpacing: -0.2 },

  right: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  count: { fontSize: 13, fontWeight: '700', fontVariant: ['tabular-nums'] },

  track: {
    position: 'absolute', left: 16, right: 16, bottom: 0,
    height: 2, borderRadius: 1, overflow: 'hidden',
  },
  fill: { height: 2, borderRadius: 1 },
});

/** Memoised: it sits above the day feed and re-renders on every scroll otherwise. */
const ParallelPromoStrip = memo(ParallelPromoStripInner);
export default ParallelPromoStrip;
