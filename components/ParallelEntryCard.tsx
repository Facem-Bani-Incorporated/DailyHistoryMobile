// components/ParallelEntryCard.tsx
// The door into Parallel Universes, sitting at the bottom of a story.
//
// Only the day's hero events carry a game, so this renders nothing most of the time —
// promising a branching what-if on a story that has none would be worse than staying
// quiet. When it does appear it leads with the collection count, because "2 / 8
// timelines" is a sharper hook than any description of the mechanic.
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { memo, useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { useParallelStore } from '../store/useParallelStore';

const SERIF = Platform.OS === 'ios' ? 'Georgia' : 'serif';

type Lang = 'en' | 'ro' | 'fr' | 'de' | 'es';

const L: Record<Lang, Record<string, string>> = {
  en: {
    kicker: 'PARALLEL UNIVERSES',
    title: 'What if it had gone differently?',
    body: 'Three decisions. Four things you can break or save. Eight worlds waiting.',
    cta: 'Enter the divergence',
    found: 'timelines found',
  },
  ro: {
    kicker: 'UNIVERSURI PARALELE',
    title: 'Dar dacă ar fi ieșit altfel?',
    body: 'Trei decizii. Patru lucruri de salvat sau de distrus. Opt lumi care așteaptă.',
    cta: 'Intră în bifurcație',
    found: 'cronologii găsite',
  },
  fr: {
    kicker: 'UNIVERS PARALLÈLES',
    title: "Et si cela s'était passé autrement ?",
    body: 'Trois décisions. Quatre choses à sauver ou à briser. Huit mondes en attente.',
    cta: 'Entrer dans la divergence',
    found: 'chronologies trouvées',
  },
  de: {
    kicker: 'PARALLELE WELTEN',
    title: 'Und wenn es anders gekommen wäre?',
    body: 'Drei Entscheidungen. Vier Dinge zum Retten oder Zerstören. Acht Welten warten.',
    cta: 'Betritt die Abzweigung',
    found: 'Zeitlinien gefunden',
  },
  es: {
    kicker: 'UNIVERSOS PARALELOS',
    title: '¿Y si hubiera salido de otra forma?',
    body: 'Tres decisiones. Cuatro cosas que salvar o romper. Ocho mundos esperando.',
    cta: 'Entra en la bifurcación',
    found: 'cronologías encontradas',
  },
};

interface Props {
  event: any;
  language: string;
  theme: any;
  isDark: boolean;
  onOpen: () => void;
}

function ParallelEntryCardInner({ event, language, theme, isDark, onOpen }: Props) {
  const lang = (['en', 'ro', 'fr', 'de', 'es'].includes(language) ? language : 'en') as Lang;
  const t = L[lang];
  const gold = theme.gold ?? '#D4A843';
  const eventId = String(event?.id ?? '');

  // Parse only far enough to know a game exists and how many endings it has. The full
  // tree is parsed inside the game itself, not on every story that scrolls past.
  const meta = useMemo(() => {
    if (!event?.parallelUniverse) return null;
    try {
      const parsed = JSON.parse(event.parallelUniverse);
      const u = parsed?.[lang] ?? parsed?.en;
      if (!u?.nodes?.length) return null;
      return {
        pivotTitle: String(u.pivotTitle ?? ''),
        endings: u.nodes.filter((n: any) => !n.choices?.length).length,
      };
    } catch {
      return null;
    }
  }, [event?.parallelUniverse, lang]);

  const discovered = useParallelStore(s => (s.discovered[eventId] ?? []).length);

  const drift = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!meta) return;
    const loop = Animated.loop(
      Animated.timing(drift, { toValue: 1, duration: 5200, easing: Easing.linear, useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
  }, [meta, drift]);

  if (!meta) return null;

  // Two branch strokes drifting slowly behind the card — the divergence, at rest.
  const shiftA = drift.interpolate({ inputRange: [0, 1], outputRange: [0, 14] });
  const shiftB = drift.interpolate({ inputRange: [0, 1], outputRange: [0, -14] });
  const fade = drift.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.18, 0.42, 0.18] });

  return (
    <Pressable
      onPress={onOpen}
      accessibilityRole="button"
      accessibilityLabel={t.cta}
      style={({ pressed }) => [s.wrap, { opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.995 : 1 }] }]}
    >
      <LinearGradient
        colors={isDark ? ['#171326', '#0E0C15'] : ['#F6F2FF', '#FFFDF7']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[s.card, { borderColor: gold + '38' }]}
      >
        <Animated.View style={[s.branch, { backgroundColor: gold, opacity: fade, transform: [{ translateX: shiftA }, { rotate: '24deg' }] }]} />
        <Animated.View style={[s.branch, s.branch2, { backgroundColor: gold, opacity: fade, transform: [{ translateX: shiftB }, { rotate: '-24deg' }] }]} />

        <View style={s.headRow}>
          <MaterialCommunityIcons name="source-branch" size={13} color={gold} />
          <Text style={[s.kicker, { color: gold }]}>{t.kicker}</Text>
        </View>

        <Text style={[s.title, { color: theme.text }]}>{t.title}</Text>
        <Text style={[s.body, { color: theme.subtext }]}>{t.body}</Text>

        <View style={s.footer}>
          <View style={s.count}>
            <Text style={[s.countNum, { color: gold }]}>{discovered}</Text>
            <Text style={[s.countTotal, { color: theme.subtext }]}>/ {meta.endings} {t.found}</Text>
          </View>
          <View style={[s.cta, { borderColor: gold + '55' }]}>
            <Text style={[s.ctaText, { color: gold }]}>{t.cta}</Text>
            <MaterialCommunityIcons name="arrow-right" size={13} color={gold} />
          </View>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

export default memo(ParallelEntryCardInner);

const s = StyleSheet.create({
  wrap: { marginTop: 30 },
  card: { borderWidth: 1, borderRadius: 16, padding: 19, overflow: 'hidden' },
  branch: { position: 'absolute', right: 22, top: -30, width: 2, height: 150, borderRadius: 1 },
  branch2: { right: 46 },

  headRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 9 },
  kicker: { fontSize: 9.5, fontWeight: '800', letterSpacing: 1.9 },

  title: { fontSize: 20, fontFamily: SERIF, fontWeight: '700', lineHeight: 26, letterSpacing: -0.35, marginBottom: 7 },
  body: { fontSize: 13.5, lineHeight: 20, marginBottom: 17 },

  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  count: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  countNum: { fontSize: 19, fontWeight: '900', fontVariant: ['tabular-nums'] },
  countTotal: { fontSize: 11.5, fontWeight: '600' },

  cta: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 11, paddingHorizontal: 13, paddingVertical: 9 },
  ctaText: { fontSize: 12.5, fontWeight: '800' },
});
