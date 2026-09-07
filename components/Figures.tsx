// components/Figures.tsx
//
// The drawn parts of a story: the band of numbers above the article, the bar charts
// inside it, and the timeline rail in the long read.
//
// Where the data comes from: the pipeline writes `figures` into the deep-dive JSON,
// and copies the first stat_row into `deepDiveTeaser.figure` so a free reader gets one
// without the long read leaking. Both ride inside text columns the Java backend passes
// through untouched, the same way `parallelUniverse` does, so none of this needed a
// server change.
//
// Everything here renders nothing rather than something wrong. Events published before
// the feature carry no figures, a figure the generator was not confident about is
// absent by design, and a malformed one was already dropped in the pipeline. So every
// component below returns null on bad input instead of drawing an empty axis.
//
// Bars are plain Views, not SVG. A horizontal bar is a rounded rectangle whose width is
// a percentage: react-native-svg would add a native round trip to draw the same shape
// and cannot be laid out by flex. SVG earns its place on curves and axes, and there are
// none here.
import { memo, useEffect, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet, Text, View } from 'react-native';

const SERIF = Platform.OS === 'ios' ? 'Georgia' : 'serif';

// ─── Shapes written by the pipeline ──────────────────────────────────────────
export interface FigureStat { value: string; unit?: string; label?: string }
export interface FigureBarPoint { label: string; value: number }
export interface Figure {
  kind: 'stat_row' | 'bar' | string;
  title?: string;
  unit?: string;
  /** Provenance, printed under the figure. "Ammianus' estimate; modern figures run lower." */
  note?: string;
  stats?: FigureStat[];
  points?: FigureBarPoint[];
}

interface Palette {
  text: string;
  subtext: string;
  gold: string;
  isDark: boolean;
}

/** Thousands separators for the languages the app ships in. The pipeline writes stat
 *  values pre-formatted, so this is only for bar values, which arrive as raw numbers. */
const LOCALES: Record<string, string> = {
  en: 'en-US', ro: 'ro-RO', fr: 'fr-FR', de: 'de-DE', es: 'es-ES',
};

function formatValue(n: number, lang: string): string {
  try {
    // Whole numbers dominate here (troops, deaths, pounds). A decimal only shows up
    // on rates and ratios, and two places is enough for every one of those.
    const decimals = Number.isInteger(n) ? 0 : 2;
    return n.toLocaleString(LOCALES[lang] ?? 'en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  } catch {
    return String(n);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// STAT ROW — the band of numbers, above the article
// ═════════════════════════════════════════════════════════════════════════════
export const StatRow = memo(function StatRow({
  figure, palette,
}: { figure: Figure; palette: Palette }) {
  const stats = (figure?.stats ?? []).filter(s => s && String(s.value ?? '').trim());
  if (stats.length < 2) return null;

  const { text, subtext, gold, isDark } = palette;
  const hairline = isDark ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.08)';

  // Four across is too tight on a narrow phone, so four wraps to two rows of two.
  const perRow = stats.length === 4 ? 2 : stats.length;

  return (
    <View style={s.statWrap}>
      <View style={[s.statBand, { borderColor: hairline }]}>
        {stats.map((stat, i) => {
          const startsRow = i % perRow === 0;
          return (
            <View
              key={i}
              style={[
                s.statCell,
                { flexBasis: `${100 / perRow}%` },
                !startsRow && { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: hairline },
                i >= perRow && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: hairline },
              ]}
            >
              <Text style={[s.statValue, { color: gold }]} numberOfLines={1} adjustsFontSizeToFit>
                {stat.value}
              </Text>
              {!!stat.unit && (
                <Text style={[s.statUnit, { color: subtext }]} numberOfLines={1}>{stat.unit}</Text>
              )}
              {!!stat.label && (
                <Text style={[s.statLabel, { color: text }]} numberOfLines={2}>{stat.label}</Text>
              )}
            </View>
          );
        })}
      </View>
      {!!figure.note && <Text style={[s.note, { color: subtext }]}>{figure.note}</Text>}
    </View>
  );
});

// ═════════════════════════════════════════════════════════════════════════════
// BAR FIGURE — comparable quantities on one axis
// ═════════════════════════════════════════════════════════════════════════════
const Bar = memo(function Bar({
  point, max, palette, lang, index,
}: {
  point: FigureBarPoint; max: number; palette: Palette; lang: string; index: number;
}) {
  const grow = useRef(new Animated.Value(0)).current;
  // Every bar is measured against the largest, and a floor of 4% keeps a very small
  // value visible as a mark rather than as nothing at all.
  const pct = max > 0 ? Math.max(4, (point.value / max) * 100) : 0;

  useEffect(() => {
    Animated.timing(grow, {
      toValue: 1,
      duration: 620,
      delay: index * 90,
      easing: Easing.out(Easing.cubic),
      // Width is a layout property, so this cannot run on the UI thread. It is a
      // one-shot animation over at most six bars, which is well inside budget.
      useNativeDriver: false,
    }).start();
  }, [grow, index]);

  const width = grow.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', `${pct}%`],
  });

  return (
    <View style={s.barRow}>
      <Text style={[s.barLabel, { color: palette.text }]} numberOfLines={1}>{point.label}</Text>
      <View
        style={[
          s.barTrack,
          { backgroundColor: palette.isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)' },
        ]}
      >
        <Animated.View style={[s.barFill, { width, backgroundColor: palette.gold }]} />
      </View>
      <Text style={[s.barValue, { color: palette.subtext }]} numberOfLines={1}>
        {formatValue(point.value, lang)}
      </Text>
    </View>
  );
});

export const BarFigure = memo(function BarFigure({
  figure, palette, lang,
}: { figure: Figure; palette: Palette; lang: string }) {
  const points = (figure?.points ?? []).filter(
    p => p && typeof p.value === 'number' && isFinite(p.value) && p.value > 0,
  );
  if (points.length < 2) return null;

  const max = Math.max(...points.map(p => p.value));
  const hairline = palette.isDark ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.08)';

  return (
    <View style={[s.barWrap, { borderColor: hairline }]}>
      {!!figure.title && (
        <Text style={[s.figTitle, { color: palette.gold }]}>{figure.title.toUpperCase()}</Text>
      )}
      {points.map((p, i) => (
        <Bar
          key={`${p.label}-${i}`}
          point={p}
          max={max}
          palette={palette}
          lang={lang}
          index={i}
        />
      ))}
      {(!!figure.unit || !!figure.note) && (
        <Text style={[s.note, { color: palette.subtext }]}>
          {[figure.unit, figure.note].filter(Boolean).join(' · ')}
        </Text>
      )}
    </View>
  );
});

// ═════════════════════════════════════════════════════════════════════════════
// FIGURES — a whole list, in the order the pipeline wrote them
// ═════════════════════════════════════════════════════════════════════════════
export const Figures = memo(function Figures({
  figures, palette, lang,
}: { figures?: Figure[] | null; palette: Palette; lang: string }) {
  if (!Array.isArray(figures) || figures.length === 0) return null;
  return (
    <>
      {figures.map((f, i) =>
        f?.kind === 'bar'
          ? <BarFigure key={i} figure={f} palette={palette} lang={lang} />
          : <StatRow key={i} figure={f} palette={palette} />,
      )}
    </>
  );
});

// ═════════════════════════════════════════════════════════════════════════════
// TIMELINE RAIL — "14:32 — the first signal reaches Lisbon"
// ═════════════════════════════════════════════════════════════════════════════
/** Split an entry into its marker and its text.
 *
 *  The pipeline writes "MARKER — text" and deliberately does NOT run these through the
 *  dash stripper, because here the dash is the separator rather than punctuation. Both
 *  the em dash and a plain hyphen show up in practice, and an entry that carries no
 *  separator at all is kept whole as the text. */
function splitEntry(entry: string): { marker: string; text: string } {
  const m = String(entry ?? '').match(/^\s*(.{1,24}?)\s+[—–-]\s+(.+)$/s);
  if (!m) return { marker: '', text: String(entry ?? '').trim() };
  return { marker: m[1].trim(), text: m[2].trim() };
}

export const TimelineRail = memo(function TimelineRail({
  entries, palette,
}: { entries?: string[] | null; palette: Palette }) {
  const rows = (entries ?? []).map(splitEntry).filter(r => r.text);
  if (rows.length === 0) return null;

  const { text, subtext, gold } = palette;
  const rail = gold + '40';

  return (
    <View style={s.railWrap}>
      {rows.map((row, i) => {
        const last = i === rows.length - 1;
        return (
          <View key={i} style={s.railRow}>
            <View style={s.railGutter}>
              <View style={[s.railDot, { borderColor: gold }]} />
              {!last && <View style={[s.railLine, { backgroundColor: rail }]} />}
            </View>
            <View style={[s.railBody, last && { paddingBottom: 0 }]}>
              {!!row.marker && (
                <Text style={[s.railMarker, { color: gold }]}>{row.marker}</Text>
              )}
              <Text style={[s.railText, { color: row.marker ? subtext : text }]}>{row.text}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
});

const s = StyleSheet.create({
  // ── stat row ──
  statWrap: { marginBottom: 26 },
  statBand: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  statCell: { paddingVertical: 16, paddingHorizontal: 10, alignItems: 'center' },
  statValue: { fontFamily: SERIF, fontSize: 28, lineHeight: 34, fontWeight: '700' },
  statUnit: { fontSize: 10.5, letterSpacing: 0.4, marginTop: 1 },
  statLabel: {
    fontSize: 11,
    lineHeight: 15,
    textAlign: 'center',
    marginTop: 6,
    opacity: 0.85,
  },

  // ── bars ──
  barWrap: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 16,
    marginBottom: 26,
  },
  figTitle: { fontSize: 10.5, fontWeight: '800', letterSpacing: 1.2, marginBottom: 14 },
  barRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  barLabel: { width: 78, fontSize: 12.5, fontWeight: '600' },
  barTrack: { flex: 1, height: 12, borderRadius: 6, overflow: 'hidden' },
  barFill: { height: 12, borderRadius: 6 },
  barValue: { width: 68, fontSize: 12, textAlign: 'right', fontVariant: ['tabular-nums'] },

  note: { fontSize: 11, lineHeight: 16, marginTop: 10, fontStyle: 'italic', opacity: 0.9 },

  // ── timeline rail ──
  railWrap: { marginTop: 4 },
  railRow: { flexDirection: 'row' },
  railGutter: { width: 22, alignItems: 'center' },
  railDot: { width: 9, height: 9, borderRadius: 5, borderWidth: 2, marginTop: 4 },
  railLine: { width: 1.5, flex: 1, marginTop: 3, marginBottom: -1 },
  railBody: { flex: 1, paddingBottom: 16, paddingLeft: 4 },
  railMarker: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.9,
    marginBottom: 3,
    fontFamily: SERIF,
  },
  railText: { fontSize: 13.5, lineHeight: 20 },
});
