// components/LongReadSection.tsx
// "The Long Read" — the long-form PRO narrative that sits under every story.
//
// Two states, and the difference between them is the entire subscription pitch:
//   • PRO      → the full article: chapters, timeline, the misconception, aftermath, sources.
//   • not PRO  → the opening ~70 words plus the CHAPTER TITLES and the word count.
//
// The teaser deliberately shows the table of contents rather than blurred text. A reader
// who can see "VI. What everyone gets wrong about that day" knows exactly what they are
// buying; a reader looking at a grey gradient only knows something is hidden. Concrete
// curiosity converts, fog does not.
//
// The body text of a locked long read never reaches the device — the server sends
// `deepDive: null` to anyone it does not see as PRO, and only `deepDiveTeaser` travels.
import { LinearGradient } from 'expo-linear-gradient';
import { BookOpen, Clock, Lock, Quote, ScrollText } from 'lucide-react-native';
import { memo, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// ─── Shape of the JSON the backend passes through ────────────────────────────
interface DeepDiveChapter { title: string; body: string }

interface DeepDive {
  chapters: DeepDiveChapter[];
  timeline: string[];
  misconception: string;
  aftermath: string[];
  sources: string[];
  teaser: string;
  word_count: number;
}

interface DeepDiveTeaser {
  teaser: string;
  chapters: string[];   // titles only
  wordCount: number;
  sourceCount: number;
}

type Lang = 'en' | 'ro' | 'fr' | 'de' | 'es';

const L: Record<Lang, Record<string, string>> = {
  en: {
    label: 'THE LONG READ',
    words: 'words',
    chapters: 'chapters',
    sources: 'sources',
    minRead: 'min',
    timeline: 'How it unfolded',
    misconception: 'What everyone gets wrong',
    aftermath: 'What happened next',
    sourcesTitle: 'Sources',
    ctaTitle: 'Continue with PRO',
    ctaBody: 'The full article, on every story, every day.',
    ctaButton: 'See what PRO includes',
    locked: 'PRO',
  },
  ro: {
    label: 'POVESTEA COMPLETĂ',
    words: 'de cuvinte',
    chapters: 'capitole',
    sources: 'surse',
    minRead: 'min',
    timeline: 'Cum s-a desfășurat',
    misconception: 'Ce înțelege toată lumea greșit',
    aftermath: 'Ce a urmat',
    sourcesTitle: 'Surse',
    ctaTitle: 'Continuă cu PRO',
    ctaBody: 'Articolul complet, la fiecare poveste, în fiecare zi.',
    ctaButton: 'Vezi ce include PRO',
    locked: 'PRO',
  },
  fr: {
    label: 'LE RÉCIT COMPLET',
    words: 'mots',
    chapters: 'chapitres',
    sources: 'sources',
    minRead: 'min',
    timeline: 'Le déroulé',
    misconception: 'Ce que tout le monde se trompe',
    aftermath: 'Ce qui a suivi',
    sourcesTitle: 'Sources',
    ctaTitle: 'Continuer avec PRO',
    ctaBody: "L'article complet, sur chaque récit, chaque jour.",
    ctaButton: 'Voir ce que PRO inclut',
    locked: 'PRO',
  },
  de: {
    label: 'DIE GANZE GESCHICHTE',
    words: 'Wörter',
    chapters: 'Kapitel',
    sources: 'Quellen',
    minRead: 'Min.',
    timeline: 'Der Ablauf',
    misconception: 'Was alle falsch verstehen',
    aftermath: 'Was danach geschah',
    sourcesTitle: 'Quellen',
    ctaTitle: 'Mit PRO weiterlesen',
    ctaBody: 'Der vollständige Artikel, zu jeder Geschichte, jeden Tag.',
    ctaButton: 'Was PRO enthält',
    locked: 'PRO',
  },
  es: {
    label: 'LA HISTORIA COMPLETA',
    words: 'palabras',
    chapters: 'capítulos',
    sources: 'fuentes',
    minRead: 'min',
    timeline: 'Cómo se desarrolló',
    misconception: 'Lo que todo el mundo entiende mal',
    aftermath: 'Lo que pasó después',
    sourcesTitle: 'Fuentes',
    ctaTitle: 'Continúa con PRO',
    ctaBody: 'El artículo completo, en cada historia, cada día.',
    ctaButton: 'Ver qué incluye PRO',
    locked: 'PRO',
  },
};

/** Group digits without Intl. `toLocaleString(locale)` throws a RangeError on a Hermes
 *  build without full ICU data, and a word count is not worth a crash in the reader. */
function groupDigits(n: number, lang: string): string {
  const sep = lang === 'en' ? ',' : lang === 'fr' ? ' ' : '.';
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, sep);
}

/** Roman numerals for chapter markers. Chapters cap at 7, so a small table is enough. */
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];

/** Parse a per-language JSON blob, tolerating anything malformed. */
function pick<T>(raw: string | null | undefined, language: string): T | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return (parsed?.[language] ?? parsed?.en ?? null) as T | null;
  } catch {
    return null;
  }
}

interface Props {
  event: any;
  language: string;
  theme: any;
  isDark: boolean;
  isPro: boolean;
  /** Opens the paywall. Called only from the locked state. */
  onUnlock: () => void;
  /** Fired once when a non-PRO reader actually reaches the teaser. */
  onTeaserSeen?: (wordCount: number) => void;
}

function LongReadSectionInner({
  event, language, theme, isDark, isPro, onUnlock, onTeaserSeen,
}: Props) {
  const lang = (['en', 'ro', 'fr', 'de', 'es'].includes(language) ? language : 'en') as Lang;
  const t = L[lang];

  const full = useMemo(
    () => pick<DeepDive>(event?.deepDive, lang),
    [event?.deepDive, lang],
  );
  const teaser = useMemo(
    () => pick<DeepDiveTeaser>(event?.deepDiveTeaser, lang),
    [event?.deepDiveTeaser, lang],
  );

  const wordCount = full?.word_count ?? teaser?.wordCount ?? 0;
  const hasContent = !!full || !!teaser;
  const showingTeaser = hasContent && !(isPro && full);

  // Held in a ref so the effect below never lists it as a dependency: the parent passes
  // a plain function, so its identity changes on every one of the modal's scroll frames.
  const onTeaserSeenRef = useRef(onTeaserSeen);
  onTeaserSeenRef.current = onTeaserSeen;

  // Report at most once per event, not once per render.
  const reportedRef = useRef<string | null>(null);
  const eventKey = String(event?.id ?? event?.eventDate ?? '') + (showingTeaser ? ':t' : ':f');
  useEffect(() => {
    if (!showingTeaser) return;
    if (reportedRef.current === eventKey) return;
    reportedRef.current = eventKey;
    onTeaserSeenRef.current?.(wordCount);
  }, [showingTeaser, eventKey, wordCount]);

  // Events published before this feature have neither. Render nothing rather than
  // advertising chapters that do not exist.
  if (!hasContent) return null;

  const chapterTitles = full ? full.chapters.map(c => c.title) : (teaser?.chapters ?? []);
  const sourceCount = full ? full.sources.length : (teaser?.sourceCount ?? 0);
  // 200 wpm is the usual estimate for this kind of prose.
  const minutes = Math.max(1, Math.round(wordCount / 200));

  const gold = theme.gold ?? '#E8B84D';
  const hairline = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)';
  const softBg = isDark ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.025)';

  const Header = (
    <View style={s.header}>
      <View style={s.headerRow}>
        <ScrollText size={13} color={gold} strokeWidth={2.2} />
        <Text style={[s.label, { color: gold }]}>{t.label}</Text>
      </View>
      <Text style={[s.meta, { color: theme.subtext }]}>
        {groupDigits(wordCount, lang)} {t.words} · {chapterTitles.length} {t.chapters}
        {' · '}{minutes} {t.minRead}
        {sourceCount > 0 ? ` · ${sourceCount} ${t.sources}` : ''}
      </Text>
    </View>
  );

  // ── Unlocked: the whole article ──────────────────────────────────────────
  if (isPro && full) {
    return (
      <View style={s.wrap}>
        {Header}

        {full.chapters.map((ch, i) => (
          <View key={i} style={s.chapter}>
            <Text style={[s.chapterNum, { color: gold }]}>{ROMAN[i] ?? String(i + 1)}</Text>
            <Text style={[s.chapterTitle, { color: theme.text }]}>{ch.title}</Text>
            {ch.body.split(/\n{2,}/).filter(Boolean).map((para, j) => (
              <Text key={j} style={[s.body, { color: theme.text }]}>{para.trim()}</Text>
            ))}
          </View>
        ))}

        {full.timeline.length > 0 && (
          <View style={[s.block, { backgroundColor: softBg, borderColor: hairline }]}>
            <View style={s.blockHead}>
              <Clock size={13} color={gold} strokeWidth={2.2} />
              <Text style={[s.blockTitle, { color: theme.text }]}>{t.timeline}</Text>
            </View>
            {full.timeline.map((entry, i) => (
              <View key={i} style={s.timelineRow}>
                <View style={[s.timelineDot, { backgroundColor: gold }]} />
                <Text style={[s.timelineText, { color: theme.subtext }]}>{entry}</Text>
              </View>
            ))}
          </View>
        )}

        {!!full.misconception && (
          <View style={[s.block, { backgroundColor: gold + '10', borderColor: gold + '30' }]}>
            <View style={s.blockHead}>
              <Quote size={13} color={gold} strokeWidth={2.2} />
              <Text style={[s.blockTitle, { color: theme.text }]}>{t.misconception}</Text>
            </View>
            <Text style={[s.body, { color: theme.text }]}>{full.misconception}</Text>
          </View>
        )}

        {full.aftermath.length > 0 && (
          <View style={s.chapter}>
            <Text style={[s.blockTitle, { color: theme.text, marginBottom: 10 }]}>{t.aftermath}</Text>
            {full.aftermath.map((entry, i) => (
              <Text key={i} style={[s.aftermath, { color: theme.subtext, borderLeftColor: gold + '55' }]}>
                {entry}
              </Text>
            ))}
          </View>
        )}

        {full.sources.length > 0 && (
          <View style={[s.sources, { borderTopColor: hairline }]}>
            <Text style={[s.sourcesTitle, { color: theme.subtext }]}>{t.sourcesTitle}</Text>
            {full.sources.map((src, i) => (
              <Text key={i} style={[s.sourceLine, { color: theme.subtext }]}>{src}</Text>
            ))}
          </View>
        )}
      </View>
    );
  }

  // ── Locked: opening words + the table of contents ────────────────────────
  const teaserText = teaser?.teaser ?? full?.teaser ?? '';

  return (
    <View style={s.wrap}>
      {Header}

      {!!teaserText && (
        <View>
          <Text style={[s.body, { color: theme.text }]}>{teaserText}</Text>
          {/* Fades the opening paragraph out — the chapter list below is the real pitch,
              so this is a transition, not a wall. */}
          <LinearGradient
            colors={['transparent', theme.background]}
            style={s.fade}
            pointerEvents="none"
          />
        </View>
      )}

      <View style={[s.toc, { borderColor: hairline, backgroundColor: softBg }]}>
        {chapterTitles.map((title, i) => (
          <View key={i} style={s.tocRow}>
            <Text style={[s.tocNum, { color: gold }]}>{ROMAN[i] ?? String(i + 1)}</Text>
            <Text style={[s.tocTitle, { color: theme.text }]} numberOfLines={2}>{title}</Text>
            <Lock size={11} color={theme.subtext} strokeWidth={2.2} />
          </View>
        ))}
      </View>

      <TouchableOpacity
        onPress={onUnlock}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={t.ctaButton}
        style={[s.cta, { borderColor: gold + '45', backgroundColor: gold + '12' }]}
      >
        <View style={[s.ctaIcon, { backgroundColor: gold + '20' }]}>
          <BookOpen size={17} color={gold} strokeWidth={2} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[s.ctaTitle, { color: theme.text }]}>{t.ctaTitle}</Text>
          <Text style={[s.ctaBody, { color: theme.subtext }]}>{t.ctaBody}</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}

export const LongReadSection = memo(LongReadSectionInner);
export default LongReadSection;

const s = StyleSheet.create({
  wrap: { marginTop: 34 },

  header: { marginBottom: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 6 },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 1.6 },
  meta: { fontSize: 11.5, letterSpacing: 0.3, fontVariant: ['tabular-nums'] },

  chapter: { marginBottom: 26 },
  chapterNum: { fontSize: 11, fontWeight: '700', letterSpacing: 1.4, marginBottom: 4 },
  chapterTitle: { fontSize: 19, fontWeight: '700', lineHeight: 25, marginBottom: 12, letterSpacing: -0.3 },
  body: { fontSize: 16, lineHeight: 27, marginBottom: 14 },

  block: { borderRadius: 12, borderWidth: 1, padding: 16, marginBottom: 26 },
  blockHead: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 12 },
  blockTitle: { fontSize: 14.5, fontWeight: '700', letterSpacing: -0.2 },

  timelineRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  timelineDot: { width: 5, height: 5, borderRadius: 3, marginTop: 8 },
  timelineText: { flex: 1, fontSize: 14, lineHeight: 21 },

  aftermath: { fontSize: 14.5, lineHeight: 23, paddingLeft: 12, borderLeftWidth: 2, marginBottom: 12 },

  sources: { borderTopWidth: 1, paddingTop: 16, marginTop: 4 },
  sourcesTitle: { fontSize: 10.5, fontWeight: '700', letterSpacing: 1.3, marginBottom: 9, textTransform: 'uppercase' },
  sourceLine: { fontSize: 12.5, lineHeight: 19, marginBottom: 5 },

  fade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 56 },

  toc: { borderRadius: 12, borderWidth: 1, paddingVertical: 6, paddingHorizontal: 14, marginTop: 4, marginBottom: 16 },
  tocRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11 },
  tocNum: { fontSize: 10.5, fontWeight: '700', letterSpacing: 1.1, width: 24 },
  tocTitle: { flex: 1, fontSize: 14.5, lineHeight: 20, fontWeight: '600' },

  cta: { flexDirection: 'row', alignItems: 'center', gap: 13, borderRadius: 12, borderWidth: 1, padding: 15 },
  ctaIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  ctaTitle: { fontSize: 15, fontWeight: '700', letterSpacing: -0.2, marginBottom: 2 },
  ctaBody: { fontSize: 12.5, lineHeight: 17 },
});
