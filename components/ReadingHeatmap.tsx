// components/ReadingHeatmap.tsx
// ═══════════════════════════════════════════════════════════════════════════════
//  READING HEATMAP — Premium activity calendar
//  Shows last 16 weeks of reading activity from calendarLog
//  Fresh design with gradient cells, streak indicators, monthly stats
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { useGamificationStore } from '../store/useGamificationStore';

const WEEKS = 16;
const CELL = 14;
const GAP = 3;
const DAYS_LABELS_WIDTH = 20;

// ── Translations ──
const T: Record<string, Record<string, string>> = {
  en: { title: 'Your Journey', subtitle: 'Reading activity', stories: 'stories', days: 'active days', avgPerDay: 'avg/day', bestDay: 'best day', less: 'Less', more: 'More', noActivity: 'Your story begins today', thisWeek: 'This week', allTime: 'All time' },
  ro: { title: 'Călătoria Ta', subtitle: 'Activitate de citire', stories: 'povești', days: 'zile active', avgPerDay: 'medie/zi', bestDay: 'cea mai bună zi', less: 'Mai puțin', more: 'Mai mult', noActivity: 'Povestea ta începe azi', thisWeek: 'Săptămâna asta', allTime: 'Total' },
  fr: { title: 'Votre Parcours', subtitle: 'Activité de lecture', stories: 'histoires', days: 'jours actifs', avgPerDay: 'moy/jour', bestDay: 'meilleur jour', less: 'Moins', more: 'Plus', noActivity: 'Votre histoire commence aujourd\'hui', thisWeek: 'Cette semaine', allTime: 'Total' },
  de: { title: 'Deine Reise', subtitle: 'Leseaktivität', stories: 'Geschichten', days: 'aktive Tage', avgPerDay: 'Ø/Tag', bestDay: 'bester Tag', less: 'Weniger', more: 'Mehr', noActivity: 'Deine Geschichte beginnt heute', thisWeek: 'Diese Woche', allTime: 'Gesamt' },
  es: { title: 'Tu Viaje', subtitle: 'Actividad de lectura', stories: 'historias', days: 'días activos', avgPerDay: 'prom/día', bestDay: 'mejor día', less: 'Menos', more: 'Más', noActivity: 'Tu historia comienza hoy', thisWeek: 'Esta semana', allTime: 'Total' },
};
const tx = (lang: string, key: string) => (T[lang] ?? T.en)[key] ?? T.en[key] ?? key;

const DAY_LABELS: Record<string, string[]> = {
  en: ['S', 'M', 'T', 'W', 'T', 'F', 'S'],
  ro: ['D', 'L', 'M', 'M', 'J', 'V', 'S'],
  fr: ['D', 'L', 'M', 'M', 'J', 'V', 'S'],
  de: ['S', 'M', 'D', 'M', 'D', 'F', 'S'],
  es: ['D', 'L', 'M', 'M', 'J', 'V', 'S'],
};

interface DayData {
  date: string;
  count: number;
  isToday: boolean;
  isFuture: boolean;
}

// ── Animated cell that fades in on mount ──
const HeatCell = React.memo(({ color, isToday, isFuture, delay, gold }: {
  color: string; isToday: boolean; isFuture: boolean; delay: number; gold: string;
}) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: isFuture ? 0 : 1,
        duration: 400,
        delay,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        tension: 120,
        friction: 8,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        hs.cell,
        {
          backgroundColor: color,
          opacity,
          transform: [{ scale }],
        },
        isToday && {
          borderWidth: 2,
          borderColor: gold,
          shadowColor: gold,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.6,
          shadowRadius: 6,
          elevation: 4,
        },
      ]}
    />
  );
});

// ── Stat Pill ──
const StatPill = ({ value, label, icon, theme, isDark }: {
  value: string | number; label: string; icon: string; theme: any; isDark: boolean;
}) => (
  <View style={[hs.statPill, { backgroundColor: isDark ? '#1C1810' : '#FFF9EF', borderColor: isDark ? '#2A2218' : '#F0E6D4' }]}>
    <Text style={hs.statIcon}>{icon}</Text>
    <Text style={[hs.statValue, { color: theme.text }]}>{value}</Text>
    <Text style={[hs.statLabel, { color: theme.subtext }]}>{label}</Text>
  </View>
);

export default function ReadingHeatmap() {
  const { theme, isDark } = useTheme();
  const { language } = useLanguage();
  const calendarLog = useGamificationStore(s => s.calendarLog);

  const { grid, monthLabels, totalDays, totalStories, maxCount, bestDayCount, thisWeekCount, avgPerDay } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString().split('T')[0];

    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));

    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - (WEEKS * 7 - 1));

    const grid: DayData[][] = [];
    const monthLabelsMap: { weekIdx: number; label: string }[] = [];
    let totalDays = 0;
    let totalStories = 0;
    let maxCount = 0;
    let bestDayCount = 0;
    let thisWeekCount = 0;
    let lastMonth = -1;

    const localeMap: Record<string, string> = { ro: 'ro-RO', en: 'en-US', fr: 'fr-FR', de: 'de-DE', es: 'es-ES' };
    const loc = localeMap[language] ?? 'en-US';

    // Calculate current week start (Sunday)
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const weekStartISO = weekStart.toISOString().split('T')[0];

    for (let w = 0; w < WEEKS; w++) {
      const week: DayData[] = [];
      for (let d = 0; d < 7; d++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + (w * 7 + d));
        const iso = date.toISOString().split('T')[0];
        const isFuture = date > today;
        const isToday = iso === todayISO;

        const log = calendarLog[iso];
        const count = isFuture ? 0 : (log?.eventIds?.length ?? 0);

        if (count > 0) totalDays++;
        totalStories += count;
        if (count > maxCount) maxCount = count;
        if (count > bestDayCount) bestDayCount = count;
        if (iso >= weekStartISO && !isFuture) thisWeekCount += count;

        const month = date.getMonth();
        if (month !== lastMonth && d === 0) {
          monthLabelsMap.push({
            weekIdx: w,
            label: date.toLocaleString(loc, { month: 'short' }),
          });
          lastMonth = month;
        }

        week.push({ date: iso, count, isToday, isFuture });
      }
      grid.push(week);
    }

    const avgPerDay = totalDays > 0 ? (totalStories / totalDays).toFixed(1) : '0';

    return { grid, monthLabels: monthLabelsMap, totalDays, totalStories, maxCount, bestDayCount, thisWeekCount, avgPerDay };
  }, [calendarLog, language]);

  // ── Color palette — warm amber tones ──
  const getColor = (count: number, isFuture: boolean): string => {
    if (isFuture) return 'transparent';
    if (count === 0) return isDark ? '#15120E' : '#F5F0E8';

    const effectiveMax = Math.max(maxCount, 5);
    const ratio = count / effectiveMax;

    if (isDark) {
      if (ratio <= 0.15) return '#2A1F0D';
      if (ratio <= 0.3) return '#4A3312';
      if (ratio <= 0.5) return '#7A5518';
      if (ratio <= 0.7) return '#B8860B';
      if (ratio <= 0.85) return '#D4A017';
      return '#FFB300';
    } else {
      if (ratio <= 0.15) return '#FEF3C7';
      if (ratio <= 0.3) return '#FDE68A';
      if (ratio <= 0.5) return '#FCD34D';
      if (ratio <= 0.7) return '#FBBF24';
      if (ratio <= 0.85) return '#F59E0B';
      return '#D97706';
    }
  };

  const dayLabels = DAY_LABELS[language] ?? DAY_LABELS.en;
  const gold = isDark ? '#E8B84D' : '#C77E08';
  const hasActivity = totalStories > 0;

  return (
    <View style={[hs.container, {
      backgroundColor: isDark ? '#0F0D0A' : '#FFFFFF',
      borderColor: isDark ? '#1E1A14' : '#EDE5D8',
    }]}>
      {/* ── Header ── */}
      <View style={hs.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={[hs.title, { color: theme.text }]}>{tx(language, 'title')}</Text>
          <Text style={[hs.subtitle, { color: theme.subtext }]}>{tx(language, 'subtitle')}</Text>
        </View>
        {hasActivity && (
          <View style={[hs.headerBadge, { backgroundColor: isDark ? '#1C1810' : '#FFF9EF', borderColor: gold + '30' }]}>
            <Text style={[hs.headerBadgeNum, { color: gold }]}>{totalStories}</Text>
            <Text style={[hs.headerBadgeLabel, { color: theme.subtext }]}>{tx(language, 'stories')}</Text>
          </View>
        )}
      </View>

      {/* ── Stats Row ── */}
      {hasActivity && (
        <View style={hs.statsRow}>
          <StatPill value={totalDays} label={tx(language, 'days')} icon="📅" theme={theme} isDark={isDark} />
          <StatPill value={avgPerDay} label={tx(language, 'avgPerDay')} icon="⚡" theme={theme} isDark={isDark} />
          <StatPill value={bestDayCount} label={tx(language, 'bestDay')} icon="🏆" theme={theme} isDark={isDark} />
        </View>
      )}

      {/* ── Month labels ── */}
      <View style={[hs.monthRow, { marginLeft: DAYS_LABELS_WIDTH + 2 }]}>
        {monthLabels.map((m, i) => (
          <Text
            key={`m-${i}`}
            style={[hs.monthLabel, {
              color: theme.subtext,
              left: m.weekIdx * (CELL + GAP),
            }]}
          >
            {m.label}
          </Text>
        ))}
      </View>

      {/* ── Grid ── */}
      <View style={hs.gridArea}>
        {/* Day labels column */}
        <View style={[hs.dayLabelsCol, { width: DAYS_LABELS_WIDTH }]}>
          {dayLabels.map((label, i) => (
            <View key={`dl-${i}`} style={{ height: CELL + GAP, justifyContent: 'center' }}>
              <Text style={[hs.dayLabel, { color: theme.subtext }]}>{i % 2 === 1 ? label : ''}</Text>
            </View>
          ))}
        </View>

        {/* Cells grid */}
        <View style={hs.gridRow}>
          {grid.map((week, wi) => (
            <View key={`w-${wi}`} style={hs.weekCol}>
              {week.map((day, di) => (
                <HeatCell
                  key={`d-${wi}-${di}`}
                  color={getColor(day.count, day.isFuture)}
                  isToday={day.isToday}
                  isFuture={day.isFuture}
                  delay={wi * 15 + di * 5}
                  gold={gold}
                />
              ))}
            </View>
          ))}
        </View>
      </View>

      {/* ── Legend ── */}
      <View style={hs.legendRow}>
        <Text style={[hs.legendText, { color: theme.subtext }]}>{tx(language, 'less')}</Text>
        {[0, 0.2, 0.4, 0.6, 0.8, 1].map((level, idx) => (
          <View
            key={`l-${idx}`}
            style={[hs.legendCell, {
              backgroundColor: getColor(
                Math.ceil(level * Math.max(maxCount, 5)),
                false,
              ),
            }]}
          />
        ))}
        <Text style={[hs.legendText, { color: theme.subtext }]}>{tx(language, 'more')}</Text>
      </View>

      {/* ── Empty state ── */}
      {!hasActivity && (
        <View style={hs.emptyWrap}>
          <View style={[hs.emptyLine, { backgroundColor: gold + '15' }]} />
          <Text style={[hs.emptyText, { color: theme.subtext }]}>
            {tx(language, 'noActivity')}
          </Text>
          <View style={[hs.emptyLine, { backgroundColor: gold + '15' }]} />
        </View>
      )}
    </View>
  );
}

const hs = StyleSheet.create({
  container: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
    marginBottom: 24,
    overflow: 'hidden',
  },

  // Header
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  subtitle: {
    fontSize: 11,
    fontWeight: '500',
    opacity: 0.4,
    marginTop: 2,
    letterSpacing: 0.3,
  },
  headerBadge: {
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
  },
  headerBadgeNum: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -1,
  },
  headerBadgeLabel: {
    fontSize: 8,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
    opacity: 0.5,
    marginTop: 1,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 18,
  },
  statPill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 14,
    borderWidth: 1,
    gap: 2,
  },
  statIcon: {
    fontSize: 14,
    marginBottom: 2,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 8,
    fontWeight: '600',
    letterSpacing: 0.5,
    opacity: 0.5,
    textTransform: 'uppercase',
    textAlign: 'center',
  },

  // Month labels
  monthRow: {
    position: 'relative',
    height: 16,
    marginBottom: 4,
  },
  monthLabel: {
    position: 'absolute',
    fontSize: 9,
    fontWeight: '700',
    opacity: 0.4,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  // Grid
  gridArea: {
    flexDirection: 'row',
  },
  dayLabelsCol: {
    marginRight: 4,
  },
  dayLabel: {
    fontSize: 8,
    fontWeight: '700',
    opacity: 0.3,
    letterSpacing: 0.3,
  },
  gridRow: {
    flexDirection: 'row',
    gap: GAP,
    flex: 1,
  },
  weekCol: {
    gap: GAP,
  },
  cell: {
    width: CELL,
    height: CELL,
    borderRadius: 4,
  },

  // Legend
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    marginTop: 14,
  },
  legendCell: {
    width: 12,
    height: 12,
    borderRadius: 3,
  },
  legendText: {
    fontSize: 9,
    fontWeight: '600',
    opacity: 0.35,
    letterSpacing: 0.5,
    marginHorizontal: 2,
  },

  // Empty
  emptyWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: 14,
    paddingVertical: 4,
  },
  emptyLine: {
    flex: 1,
    height: 1,
  },
  emptyText: {
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.35,
    letterSpacing: 0.5,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontStyle: 'italic',
  },
});