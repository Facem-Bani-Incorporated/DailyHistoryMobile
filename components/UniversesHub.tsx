// components/UniversesHub.tsx
// The Parallel Universes tab.
//
// The game used to live at the bottom of one story, below a 600-word narrative and a
// long read, which meant almost nobody scrolled to it. It is now a destination of its
// own: every game the day carries, what you have found in each, and one tap to play.
//
// The hub leads with the collection rather than the premise. "4 / 36 timelines" is a
// sharper hook than any description of the mechanic, and it is also the honest pitch —
// the reason to come back is the eighteen worlds per event you have not seen yet.
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, FlatList, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useLanguage } from '../context/LanguageContext';
import { useRevenueCat } from '../context/RevenueCatContext';
import { useTheme } from '../context/ThemeContext';
import * as analytics from '../src/analytics/posthog';
import { useDiscovered, useRunsLeft } from '../store/useParallelStore';
import { haptic } from '../utils/haptics';
import ParallelUniverse from './ParallelUniverse';

const SERIF = Platform.OS === 'ios' ? 'Georgia' : 'serif';

type Lang = 'en' | 'ro' | 'fr' | 'de' | 'es';

const L: Record<Lang, Record<string, string>> = {
  en: {
    kicker: 'PARALLEL UNIVERSES',
    title: 'Change one decision. See what happens.',
    sub: 'Every day, the turning points of history — handed back to you.',
    found: 'timelines found',
    play: 'Play', replay: 'Play again',
    runsLeft: 'run left today', runsNone: 'No runs left today',
    proUnlimited: 'PRO plays as often as it likes',
    emptyTitle: 'No fork today',
    emptyBody: 'Today\'s stories had no decision worth replaying. Come back tomorrow — there is a new one most days.',
    complete: 'Complete',
  },
  ro: {
    kicker: 'UNIVERSURI PARALELE',
    title: 'Schimbă o decizie. Vezi ce iese.',
    sub: 'În fiecare zi, punctele de cotitură ale istoriei — date înapoi ție.',
    found: 'cronologii găsite',
    play: 'Joacă', replay: 'Joacă din nou',
    runsLeft: 'rulare rămasă azi', runsNone: 'Nu mai ai rulări azi',
    proUnlimited: 'PRO joacă oricât vrea',
    emptyTitle: 'Nicio bifurcație azi',
    emptyBody: 'Poveștile de azi n-au avut o decizie care merită rejucată. Revino mâine — în cele mai multe zile e una nouă.',
    complete: 'Complet',
  },
  fr: {
    kicker: 'UNIVERS PARALLÈLES',
    title: 'Changez une décision. Voyez la suite.',
    sub: 'Chaque jour, les tournants de l\'histoire — remis entre vos mains.',
    found: 'chronologies trouvées',
    play: 'Jouer', replay: 'Rejouer',
    runsLeft: 'partie restante aujourd\'hui', runsNone: 'Plus de parties aujourd\'hui',
    proUnlimited: 'PRO joue autant qu\'il veut',
    emptyTitle: 'Pas de bifurcation aujourd\'hui',
    emptyBody: 'Les récits du jour n\'avaient pas de décision à rejouer. Revenez demain — il y en a une presque tous les jours.',
    complete: 'Complet',
  },
  de: {
    kicker: 'PARALLELE WELTEN',
    title: 'Ändere eine Entscheidung. Sieh, was folgt.',
    sub: 'Jeden Tag die Wendepunkte der Geschichte — zurück in deiner Hand.',
    found: 'Zeitlinien gefunden',
    play: 'Spielen', replay: 'Nochmal spielen',
    runsLeft: 'Durchgang heute übrig', runsNone: 'Heute keine Durchgänge mehr',
    proUnlimited: 'PRO spielt so oft es will',
    emptyTitle: 'Heute keine Abzweigung',
    emptyBody: 'Die Geschichten von heute hatten keine Entscheidung zum Nachspielen. Komm morgen wieder — meistens gibt es eine neue.',
    complete: 'Vollständig',
  },
  es: {
    kicker: 'UNIVERSOS PARALELOS',
    title: 'Cambia una decisión. Mira qué pasa.',
    sub: 'Cada día, los puntos de giro de la historia — devueltos a tus manos.',
    found: 'cronologías encontradas',
    play: 'Jugar', replay: 'Jugar otra vez',
    runsLeft: 'partida restante hoy', runsNone: 'No quedan partidas hoy',
    proUnlimited: 'PRO juega cuantas veces quiera',
    emptyTitle: 'Hoy no hay bifurcación',
    emptyBody: 'Las historias de hoy no tenían una decisión que valga la pena rejugar. Vuelve mañana — casi todos los días hay una.',
    complete: 'Completo',
  },
};

/** Parse only far enough to know a game exists and how big it is. */
function gameMeta(event: any, lang: Lang) {
  if (!event?.parallelUniverse) return null;
  try {
    const parsed = JSON.parse(event.parallelUniverse);
    const u = parsed?.[lang] ?? parsed?.en;
    if (!u?.nodes?.length) return null;
    return {
      pivotTitle: String(u.pivotTitle ?? ''),
      pivotYear: String(u.pivotYear ?? ''),
      premise: String(u.premise ?? ''),
      endings: u.nodes.filter((n: any) => !n.choices?.length).length,
    };
  } catch {
    return null;
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// ONE GAME
// ═════════════════════════════════════════════════════════════════════════════
/**
 * A card is its own component so `useDiscovered` is called once per card rather than in
 * a loop — the number of games a day carries varies, and a hook inside `.map` would
 * change call order the moment it did.
 */
const GameCard = memo(function GameCard({ event, meta, title, day, t, theme, isDark, gold, onOpen }: {
  event: any; meta: NonNullable<ReturnType<typeof gameMeta>>; title: string; day: string;
  t: Record<string, string>; theme: any; isDark: boolean; gold: string; onOpen: () => void;
}) {
  const discovered = useDiscovered(String(event?.id ?? '')).length;
  const done = discovered >= meta.endings;
  const pct = Math.min(1, discovered / Math.max(1, meta.endings));

  const grow = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(grow, {
      toValue: pct, duration: 780, easing: Easing.out(Easing.cubic), useNativeDriver: false,
    }).start();
  }, [pct, grow]);

  return (
    <Pressable
      onPress={onOpen}
      accessibilityRole="button"
      accessibilityLabel={meta.pivotTitle || title}
      style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.995 : 1 }] }]}
    >
      <LinearGradient
        colors={isDark ? ['#171326', '#0E0C15'] : ['#F6F2FF', '#FFFDF7']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[s.card, { borderColor: done ? gold + '66' : gold + '30' }]}
      >
        <View style={s.cardHead}>
          <Text style={[s.year, { color: gold }]}>{meta.pivotYear}</Text>
          {!!day && <Text style={[s.day, { color: theme.subtext }]}>{day}</Text>}
          <View style={{ flex: 1 }} />
          {done && (
            <View style={[s.completeTag, { borderColor: gold + '66' }]}>
              <MaterialCommunityIcons name="check-decagram" size={11} color={gold} />
              <Text style={[s.completeText, { color: gold }]}>{t.complete}</Text>
            </View>
          )}
        </View>

        <Text style={[s.cardTitle, { color: theme.text }]} numberOfLines={2}>
          {meta.pivotTitle || title}
        </Text>
        {!!meta.premise && (
          <Text style={[s.premise, { color: theme.subtext }]} numberOfLines={2}>{meta.premise}</Text>
        )}

        <View style={[s.track, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)' }]}>
          <Animated.View
            style={[
              s.fill,
              {
                backgroundColor: gold,
                width: grow.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
              },
            ]}
          />
        </View>

        <View style={s.cardFoot}>
          <Text style={[s.count, { color: theme.subtext }]}>
            <Text style={{ color: gold, fontWeight: '900' }}>{discovered}</Text>
            {` / ${meta.endings} ${t.found}`}
          </Text>
          <View style={[s.cta, { borderColor: gold + '55' }]}>
            <Text style={[s.ctaText, { color: gold }]}>{discovered ? t.replay : t.play}</Text>
            <MaterialCommunityIcons name="arrow-right" size={13} color={gold} />
          </View>
        </View>
      </LinearGradient>
    </Pressable>
  );
});

// ═════════════════════════════════════════════════════════════════════════════
// THE HUB
// ═════════════════════════════════════════════════════════════════════════════
export default function UniversesHub({ events, topInset }: { events: any[]; topInset?: number }) {
  const { theme, isDark } = useTheme();
  const { language } = useLanguage();
  const { isPro } = useRevenueCat();

  const lang = (['en', 'ro', 'fr', 'de', 'es'].includes(language) ? language : 'en') as Lang;
  const t = L[lang];
  const gold = theme.gold ?? '#D4A843';

  const runsLeft = useRunsLeft(isPro);
  const [open, setOpen] = useState<any | null>(null);
  // This tab draws its own header rather than sitting under the app chrome, so it owns
  // the notch. Without this the kicker and the headline ran under the status bar.
  const insets = useSafeAreaInsets();

  // `events` is the whole loaded archive — sixty days of content, not just today — so
  // this tab is a shelf of everything still playable rather than a single card. Newest
  // first: today's fork is the one people came for, and the rest is the back catalogue.
  const games = useMemo(
    () => (events ?? [])
      .map(e => ({ event: e, meta: gameMeta(e, lang), day: String(e?.__day ?? '') }))
      .filter((x): x is { event: any; meta: NonNullable<ReturnType<typeof gameMeta>>; day: string } => !!x.meta)
      .sort((a, b) => b.day.localeCompare(a.day)),
    [events, lang],
  );

  const todayISO = new Date().toISOString().split('T')[0];
  const dayFmt = useMemo(
    () => new Intl.DateTimeFormat(DATE_LOCALE[lang], { day: 'numeric', month: 'short' }),
    [lang],
  );
  /** Today's card carries no date — it is the default, and labelling it adds noise. */
  const dayLabel = (iso: string) => {
    if (!iso || iso === todayISO) return '';
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? '' : dayFmt.format(d);
  };

  useEffect(() => {
    analytics.capture('universes_hub_viewed', { games: games.length, is_pro: isPro });
  }, [games.length, isPro]);

  const header = (
    <>
      <Text style={[s.kicker, { color: gold }]}>{t.kicker}</Text>
      <Text style={[s.title, { color: theme.text }]}>{t.title}</Text>
      <Text style={[s.sub, { color: theme.subtext }]}>{t.sub}</Text>
    </>
  );

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={games}
        keyExtractor={(item) => String(item.event?.id)}
        ListHeaderComponent={header}
        contentContainerStyle={[
          s.scroll,
          { paddingTop: (topInset ?? insets.top) + 18 },
        ]}
        showsVerticalScrollIndicator={false}
        initialNumToRender={6}
        windowSize={7}
        removeClippedSubviews
        renderItem={({ item }) => (
          <GameCard
            event={item.event}
            meta={item.meta}
            day={dayLabel(item.day)}
            title={item.event?.titleTranslations?.[lang] ?? item.event?.titleTranslations?.en ?? ''}
            t={t} theme={theme} isDark={isDark} gold={gold}
            onOpen={() => { haptic('medium'); setOpen(item.event); }}
          />
        )}
        ListFooterComponent={
          games.length ? (
            <Text style={[s.runs, { color: theme.subtext }]}>
              {isPro
                ? t.proUnlimited
                : runsLeft > 0 ? `${runsLeft} ${t.runsLeft}` : t.runsNone}
            </Text>
          ) : null
        }
        ListEmptyComponent={
          <View style={[s.empty, { borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.09)' }]}>
            <MaterialCommunityIcons name="directions-fork" size={26} color={theme.subtext} />
            <Text style={[s.emptyTitle, { color: theme.text }]}>{t.emptyTitle}</Text>
            <Text style={[s.emptyBody, { color: theme.subtext }]}>{t.emptyBody}</Text>
          </View>
        }
      />

      <ParallelUniverse visible={!!open} onClose={() => setOpen(null)} event={open} />
    </View>
  );
}

/** Intl tags for the short date on an archived card. */
const DATE_LOCALE: Record<Lang, string> = {
  en: 'en-US', ro: 'ro-RO', fr: 'fr-FR', de: 'de-DE', es: 'es-ES',
};

const s = StyleSheet.create({
  scroll: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 130 },

  kicker: { fontSize: 10, fontWeight: '800', letterSpacing: 2.2, marginBottom: 10 },
  title: { fontSize: 27, fontFamily: SERIF, fontWeight: '700', lineHeight: 33, letterSpacing: -0.5, marginBottom: 8 },
  sub: { fontSize: 14, lineHeight: 21, marginBottom: 24 },

  card: { borderWidth: 1, borderRadius: 17, padding: 17, marginBottom: 14, overflow: 'hidden' },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 },
  year: { fontSize: 11.5, fontWeight: '800', letterSpacing: 1.4 },
  day: { fontSize: 10.5, marginLeft: 9 },
  completeTag: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: 9, paddingHorizontal: 7, paddingVertical: 2.5 },
  completeText: { fontSize: 9, fontWeight: '900', letterSpacing: 0.8, textTransform: 'uppercase' },

  cardTitle: { fontSize: 20, fontFamily: SERIF, fontWeight: '700', lineHeight: 26, letterSpacing: -0.35, marginBottom: 7 },
  premise: { fontSize: 13, lineHeight: 19.5, marginBottom: 14 },

  track: { height: 5, borderRadius: 3, overflow: 'hidden', marginBottom: 12 },
  fill: { height: 5, borderRadius: 3 },

  cardFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  count: { fontSize: 12 },
  cta: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 11, paddingHorizontal: 12, paddingVertical: 7 },
  ctaText: { fontSize: 12.5, fontWeight: '800' },

  runs: { fontSize: 12, fontStyle: 'italic', textAlign: 'center', marginTop: 10 },

  empty: { borderWidth: 1, borderRadius: 16, padding: 26, alignItems: 'center', gap: 10, marginTop: 20 },
  emptyTitle: { fontSize: 18, fontFamily: SERIF, fontWeight: '700' },
  emptyBody: { fontSize: 13.5, lineHeight: 20.5, textAlign: 'center' },
});
