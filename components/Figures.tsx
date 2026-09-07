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
import { memo, useEffect, useRef, useState } from 'react';
import {
  Animated, Easing, Platform, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';

import { haptic } from '../utils/haptics';

const SERIF = Platform.OS === 'ios' ? 'Georgia' : 'serif';

// ─── Shapes written by the pipeline ──────────────────────────────────────────
export interface FigureStat { value: string; unit?: string; label?: string }
export interface FigureBarPoint { label: string; value: number }
export interface FigureRow { label: string; value: string; cells?: string[] }
export interface Figure {
  kind:
    | 'stat_row' | 'bar' | 'fact_grid' | 'compare' | 'table' | 'share' | 'guess'
    | string;
  title?: string;
  unit?: string;
  /** Provenance, printed under the figure. "Ammianus' estimate; modern figures run lower." */
  note?: string;
  /** A band of 2-4 numbers, or exactly 2 for a before/after comparison. */
  stats?: FigureStat[];
  points?: FigureBarPoint[];
  rows?: FigureRow[];
  columns?: string[];
  /** kind === 'guess' */
  question?: string;
  options?: string[];
  answerIndex?: number;
  reveal?: string;
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
// FACT GRID — the event's specification sheet
// ═════════════════════════════════════════════════════════════════════════════
export const FactGrid = memo(function FactGrid({
  figure, palette,
}: { figure: Figure; palette: Palette }) {
  const rows = (figure?.rows ?? []).filter(r => r && r.label && r.value);
  if (rows.length < 2) return null;

  const { text, subtext, gold, isDark } = palette;
  const hairline = isDark ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.08)';

  return (
    <View style={s.gridWrap}>
      {!!figure.title && (
        <Text style={[s.figTitle, { color: gold }]}>{figure.title.toUpperCase()}</Text>
      )}
      <View style={[s.gridBox, { borderColor: hairline }]}>
        {rows.map((row, i) => (
          <View
            key={i}
            style={[
              s.gridRow,
              i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: hairline },
            ]}
          >
            <Text style={[s.gridLabel, { color: subtext }]} numberOfLines={1}>
              {row.label.toUpperCase()}
            </Text>
            <Text style={[s.gridValue, { color: text }]} numberOfLines={2}>{row.value}</Text>
          </View>
        ))}
      </View>
      {!!figure.note && <Text style={[s.note, { color: subtext }]}>{figure.note}</Text>}
    </View>
  );
});

// ═════════════════════════════════════════════════════════════════════════════
// COMPARE — before and after, the same thing measured twice
// ═════════════════════════════════════════════════════════════════════════════
export const CompareFigure = memo(function CompareFigure({
  figure, palette,
}: { figure: Figure; palette: Palette }) {
  const pair = (figure?.stats ?? []).filter(st => st && String(st.value ?? '').trim());
  // Exactly two. Anything else is a stat row or a bar chart wearing the wrong kind,
  // and drawing an arrow between three things means nothing.
  if (pair.length !== 2) return null;

  const { text, subtext, gold, isDark } = palette;
  const hairline = isDark ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.08)';
  const [before, after] = pair;

  return (
    <View style={[s.cmpWrap, { borderColor: hairline }]}>
      {!!figure.title && (
        <Text style={[s.figTitle, { color: gold }]}>{figure.title.toUpperCase()}</Text>
      )}
      <View style={s.cmpRow}>
        {[before, after].map((st, i) => (
          <View key={i} style={s.cmpSide}>
            {!!st.unit && (
              <Text style={[s.cmpUnit, { color: subtext }]} numberOfLines={1}>
                {st.unit.toUpperCase()}
              </Text>
            )}
            <Text
              style={[s.cmpValue, { color: i === 0 ? subtext : gold }]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {st.value}
            </Text>
            {!!st.label && (
              <Text style={[s.cmpLabel, { color: text }]} numberOfLines={2}>{st.label}</Text>
            )}
          </View>
        ))}
        <View style={s.cmpArrowWrap} pointerEvents="none">
          <Text style={[s.cmpArrow, { color: gold }]}>{'\u2192'}</Text>
        </View>
      </View>
      {!!figure.note && <Text style={[s.note, { color: subtext }]}>{figure.note}</Text>}
    </View>
  );
});

// ═════════════════════════════════════════════════════════════════════════════
// TABLE — two or three parties across several dimensions
// ═════════════════════════════════════════════════════════════════════════════
export const TableFigure = memo(function TableFigure({
  figure, palette,
}: { figure: Figure; palette: Palette }) {
  const columns = figure?.columns ?? [];
  const rows = (figure?.rows ?? []).filter(
    r => r && r.label && Array.isArray(r.cells) && r.cells.length >= columns.length,
  );
  if (columns.length < 2 || rows.length < 2) return null;

  const { text, subtext, gold, isDark } = palette;
  const hairline = isDark ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.08)';
  const headBg = isDark ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.025)';

  return (
    <View style={s.tblWrap}>
      {!!figure.title && (
        <Text style={[s.figTitle, { color: gold }]}>{figure.title.toUpperCase()}</Text>
      )}
      <View style={[s.tblBox, { borderColor: hairline }]}>
        <View style={[s.tblRow, { backgroundColor: headBg }]}>
          <View style={s.tblLabelCell} />
          {columns.map((c, i) => (
            <Text key={i} style={[s.tblHead, { color: gold }]} numberOfLines={1}>
              {c.toUpperCase()}
            </Text>
          ))}
        </View>
        {rows.map((row, i) => (
          <View
            key={i}
            style={[s.tblRow, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: hairline }]}
          >
            <Text style={[s.tblLabel, { color: subtext }]} numberOfLines={2}>{row.label}</Text>
            {columns.map((_, j) => (
              <Text key={j} style={[s.tblCell, { color: text }]} numberOfLines={2}>
                {row.cells?.[j] ?? ''}
              </Text>
            ))}
          </View>
        ))}
      </View>
      {!!figure.note && <Text style={[s.note, { color: subtext }]}>{figure.note}</Text>}
    </View>
  );
});

// ═════════════════════════════════════════════════════════════════════════════
// SHARE — one whole, divided
// ═════════════════════════════════════════════════════════════════════════════
/** Tints of the accent rather than separate hues: the slices belong to one quantity,
 *  and five unrelated colours would read as five unrelated things. */
const SHARE_OPACITY = ['ff', 'cc', '99', '66', '40'];

export const ShareFigure = memo(function ShareFigure({
  figure, palette, lang,
}: { figure: Figure; palette: Palette; lang: string }) {
  const points = (figure?.points ?? []).filter(
    p => p && typeof p.value === 'number' && isFinite(p.value) && p.value > 0,
  );
  if (points.length < 2) return null;

  const total = points.reduce((sum, p) => sum + p.value, 0);
  if (total <= 0) return null;

  const { text, subtext, gold, isDark } = palette;
  const hairline = isDark ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.08)';

  return (
    <View style={[s.shrWrap, { borderColor: hairline }]}>
      {!!figure.title && (
        <Text style={[s.figTitle, { color: gold }]}>{figure.title.toUpperCase()}</Text>
      )}
      <View style={s.shrBar}>
        {points.map((p, i) => (
          <View
            key={i}
            style={{
              flex: p.value,
              backgroundColor: gold + (SHARE_OPACITY[i] ?? '33'),
              borderRightWidth: i === points.length - 1 ? 0 : 1,
              borderRightColor: isDark ? '#000' : '#fff',
            }}
          />
        ))}
      </View>
      <View style={s.shrLegend}>
        {points.map((p, i) => (
          <View key={i} style={s.shrLegendItem}>
            <View style={[s.shrSwatch, { backgroundColor: gold + (SHARE_OPACITY[i] ?? '33') }]} />
            <Text style={[s.shrLabel, { color: text }]} numberOfLines={1}>{p.label}</Text>
            <Text style={[s.shrPct, { color: subtext }]}>
              {Math.round((p.value / total) * 100)}%
            </Text>
          </View>
        ))}
      </View>
      {(!!figure.unit || !!figure.note) && (
        <Text style={[s.note, { color: subtext }]}>
          {[
            figure.unit ? `${formatValue(total, lang)} ${figure.unit}` : '',
            figure.note,
          ].filter(Boolean).join(' · ')}
        </Text>
      )}
    </View>
  );
});

// ═════════════════════════════════════════════════════════════════════════════
// GUESS — the one figure the reader touches
// ═════════════════════════════════════════════════════════════════════════════
export const GuessFigure = memo(function GuessFigure({
  figure, palette,
}: { figure: Figure; palette: Palette }) {
  const options = figure?.options ?? [];
  const answer = figure?.answerIndex ?? -1;
  // Everything has to be present and in range. An out-of-range answer would mark the
  // true option wrong in front of the reader, which is worse than showing nothing.
  const usable =
    !!figure?.question && !!figure?.reveal && options.length === 3 &&
    answer >= 0 && answer < options.length;

  const [picked, setPicked] = useState<number | null>(null);
  const revealFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (picked === null) return;
    Animated.timing(revealFade, {
      toValue: 1, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true,
    }).start();
  }, [picked, revealFade]);

  if (!usable) return null;

  const { text, subtext, gold, isDark } = palette;
  const hairline = isDark ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.08)';
  const right = '#3FA96A';

  const choose = (i: number) => {
    if (picked !== null) return;
    haptic(i === answer ? 'success' : 'warning');
    setPicked(i);
  };

  return (
    <View style={[s.gsWrap, { borderColor: gold + '44', backgroundColor: gold + '0D' }]}>
      <Text style={[s.gsQuestion, { color: text }]}>{figure.question}</Text>

      <View style={s.gsOptions}>
        {options.map((opt, i) => {
          const isAnswer = i === answer;
          const chosen = picked === i;
          const settled = picked !== null;
          const border = !settled ? hairline : isAnswer ? right : chosen ? '#C4553D' : hairline;
          const fg = !settled ? text : isAnswer ? right : chosen ? '#C4553D' : subtext;
          return (
            <TouchableOpacity
              key={i}
              activeOpacity={0.8}
              onPress={() => choose(i)}
              disabled={settled}
              style={[
                s.gsOption,
                { borderColor: border, opacity: settled && !isAnswer && !chosen ? 0.45 : 1 },
              ]}
            >
              <Text style={[s.gsOptionText, { color: fg }]} numberOfLines={1} adjustsFontSizeToFit>
                {opt}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {picked !== null && (
        <Animated.View style={{ opacity: revealFade }}>
          <Text style={[s.gsVerdict, { color: picked === answer ? right : subtext }]}>
            {picked === answer ? '\u2713' : '\u2192'} {options[answer]}
          </Text>
          <Text style={[s.gsReveal, { color: text }]}>{figure.reveal}</Text>
        </Animated.View>
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
      {figures.map((f, i) => {
        switch (f?.kind) {
          case 'bar':       return <BarFigure key={i} figure={f} palette={palette} lang={lang} />;
          case 'fact_grid': return <FactGrid key={i} figure={f} palette={palette} />;
          case 'compare':   return <CompareFigure key={i} figure={f} palette={palette} />;
          case 'table':     return <TableFigure key={i} figure={f} palette={palette} />;
          case 'share':     return <ShareFigure key={i} figure={f} palette={palette} lang={lang} />;
          case 'guess':     return <GuessFigure key={i} figure={f} palette={palette} />;
          // Anything unrecognised is treated as a stat row, which renders null unless
          // it actually has two numbers. A future kind this build predates therefore
          // shows nothing rather than crashing the story.
          default:          return <StatRow key={i} figure={f} palette={palette} />;
        }
      })}
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

  // ── fact grid ──
  gridWrap: { marginBottom: 26 },
  gridBox: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, overflow: 'hidden' },
  gridRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 11, paddingHorizontal: 13 },
  gridLabel: { width: 96, fontSize: 9.5, fontWeight: '800', letterSpacing: 0.9, paddingTop: 2 },
  gridValue: { flex: 1, fontSize: 13.5, lineHeight: 19, fontWeight: '500' },

  // ── table ──
  tblWrap: { marginBottom: 26 },
  tblBox: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, overflow: 'hidden' },
  tblRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 11 },
  tblLabelCell: { flex: 1.3 },
  tblLabel: { flex: 1.3, fontSize: 11, fontWeight: '700', letterSpacing: 0.2, paddingRight: 6 },
  tblHead: { flex: 1, fontSize: 9.5, fontWeight: '800', letterSpacing: 0.9, textAlign: 'right' },
  tblCell: {
    flex: 1,
    fontSize: 12.5,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
    paddingLeft: 6,
  },

  // ── share ──
  shrWrap: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 16,
    marginBottom: 26,
  },
  shrBar: { flexDirection: 'row', height: 16, borderRadius: 8, overflow: 'hidden' },
  shrLegend: { marginTop: 12 },
  shrLegendItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  shrSwatch: { width: 9, height: 9, borderRadius: 2, marginRight: 8 },
  shrLabel: { flex: 1, fontSize: 12.5 },
  shrPct: { fontSize: 12, fontWeight: '700', fontVariant: ['tabular-nums'] },

  // ── guess ──
  gsWrap: { borderWidth: 1, borderRadius: 14, padding: 16, marginBottom: 26 },
  gsQuestion: { fontFamily: SERIF, fontSize: 16, lineHeight: 23, marginBottom: 14 },
  gsOptions: { flexDirection: 'row', gap: 8 },
  gsOption: {
    flex: 1,
    borderWidth: 1.2,
    borderRadius: 10,
    paddingVertical: 13,
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  gsOptionText: { fontFamily: SERIF, fontSize: 17, fontWeight: '700' },
  gsVerdict: { fontFamily: SERIF, fontSize: 19, fontWeight: '700', marginTop: 16 },
  gsReveal: { fontSize: 13.5, lineHeight: 20, marginTop: 6 },

  // ── compare ──
  cmpWrap: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 16,
    marginBottom: 26,
  },
  cmpRow: { flexDirection: 'row', alignItems: 'center' },
  cmpSide: { flex: 1, alignItems: 'center', paddingHorizontal: 6 },
  cmpUnit: { fontSize: 9.5, fontWeight: '800', letterSpacing: 1, marginBottom: 4 },
  cmpValue: { fontFamily: SERIF, fontSize: 30, lineHeight: 36, fontWeight: '700' },
  cmpLabel: { fontSize: 11, lineHeight: 15, textAlign: 'center', marginTop: 5, opacity: 0.85 },
  // Centred over the gap between the two sides rather than laid out between them, so
  // neither value has to give up width to it.
  cmpArrowWrap: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  cmpArrow: { fontSize: 20, fontWeight: '300' },

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
