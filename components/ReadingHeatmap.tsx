// components/ReadingHeatmap.tsx
// ═══════════════════════════════════════════════════════════════════════════════
//  READING HEATMAP — GitHub-style contribution calendar
//  Shows last 16 weeks of reading activity from calendarLog
//  Color intensity = number of stories read that day
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useMemo } from 'react';
import {
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { useGamificationStore } from '../store/useGamificationStore';

const WEEKS = 16;
const CELL = 13;
const GAP = 3;
const DAYS_LABELS_WIDTH = 22;

const T: Record<string, Record<string, string>> = {
  en: { title: 'Reading Activity', stories: 'stories', less: 'Less', more: 'More', noActivity: 'Start reading to fill your calendar!' },
  ro: { title: 'Activitate de Citire', stories: 'povești', less: 'Mai puțin', more: 'Mai mult', noActivity: 'Citește pentru a-ți umple calendarul!' },
  fr: { title: 'Activité de Lecture', stories: 'histoires', less: 'Moins', more: 'Plus', noActivity: 'Lisez pour remplir votre calendrier !' },
  de: { title: 'Leseaktivität', stories: 'Geschichten', less: 'Weniger', more: 'Mehr', noActivity: 'Lies, um deinen Kalender zu füllen!' },
  es: { title: 'Actividad de Lectura', stories: 'historias', less: 'Menos', more: 'Más', noActivity: '¡Lee para llenar tu calendario!' },
};
const tx = (lang: string, key: string) => (T[lang] ?? T.en)[key] ?? T.en[key] ?? key;

const DAY_LABELS: Record<string, string[]> = {
  en: ['', 'Mon', '', 'Wed', '', 'Fri', ''],
  ro: ['', 'Lun', '', 'Mie', '', 'Vin', ''],
  fr: ['', 'Lun', '', 'Mer', '', 'Ven', ''],
  de: ['', 'Mo', '', 'Mi', '', 'Fr', ''],
  es: ['', 'Lun', '', 'Mié', '', 'Vie', ''],
};

interface DayData {
  date: string;        // ISO
  count: number;       // stories read
  isToday: boolean;
  isFuture: boolean;
}

export default function ReadingHeatmap() {
  const { theme, isDark } = useTheme();
  const { language } = useLanguage();
  const calendarLog = useGamificationStore(s => s.calendarLog);

  const { grid, monthLabels, totalDays, totalStories, maxCount } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString().split('T')[0];

    // Find the most recent Sunday (end of grid)
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + (6 - endDate.getDay())); // next Saturday

    // Go back WEEKS * 7 days
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - (WEEKS * 7 - 1));

    // Build grid: weeks × 7 days
    const grid: DayData[][] = [];
    const monthLabelsMap: { weekIdx: number; label: string }[] = [];
    let totalDays = 0;
    let totalStories = 0;
    let maxCount = 0;
    let lastMonth = -1;

    const localeMap: Record<string, string> = { ro: 'ro-RO', en: 'en-US', fr: 'fr-FR', de: 'de-DE', es: 'es-ES' };
    const loc = localeMap[language] ?? 'en-US';

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

        // Month label detection
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

    return { grid, monthLabels: monthLabelsMap, totalDays, totalStories, maxCount };
  }, [calendarLog, language]);

  // Color function: 0 = empty, 1-2 = light, 3-4 = medium, 5+ = intense
  const getColor = (count: number, isFuture: boolean, isToday: boolean): string => {
    if (isFuture) return isDark ? '#0D0B0900' : '#00000000';
    if (count === 0) return isDark ? '#1A1612' : '#F0EBE3';
    if (maxCount <= 1) {
      return count > 0 ? (isDark ? '#B8860B' : '#F59E0B') : (isDark ? '#1A1612' : '#F0EBE3');
    }

    const ratio = count / Math.max(maxCount, 5);
    if (ratio <= 0.2) return isDark ? '#5C3D10' : '#FDE68A';
    if (ratio <= 0.4) return isDark ? '#8B5E14' : '#FCD34D';
    if (ratio <= 0.6) return isDark ? '#B8860B' : '#FBBF24';
    if (ratio <= 0.8) return isDark ? '#D4A017' : '#F59E0B';
    return isDark ? '#FFB300' : '#D97706';
  };

  const dayLabels = DAY_LABELS[language] ?? DAY_LABELS.en;
  const gold = isDark ? '#E8B84D' : '#C77E08';

  return (
    <View style={[hs.container, {
      backgroundColor: isDark ? '#141210' : '#FFFFFF',
      borderColor: isDark ? '#251E16' : '#EDE5D8',
    }]}>
      {/* Header */}
      <View style={hs.headerRow}>
        <Text style={[hs.title, { color: theme.text }]}>{tx(language, 'title')}</Text>
        {totalStories > 0 && (
          <Text style={[hs.subtitle, { color: theme.subtext }]}>
            {totalStories} {tx(language, 'stories')} · {totalDays} days
          </Text>
        )}
      </View>

      {/* Month labels */}
      <View style={[hs.monthRow, { marginLeft: DAYS_LABELS_WIDTH }]}>
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

      {/* Grid */}
      <View style={hs.gridArea}>
        {/* Day labels */}
        <View style={[hs.dayLabelsCol, { width: DAYS_LABELS_WIDTH }]}>
          {dayLabels.map((label, i) => (
            <View key={`dl-${i}`} style={{ height: CELL + GAP, justifyContent: 'center' }}>
              <Text style={[hs.dayLabel, { color: theme.subtext }]}>{label}</Text>
            </View>
          ))}
        </View>

        {/* Cells */}
        <View style={hs.gridRow}>
          {grid.map((week, wi) => (
            <View key={`w-${wi}`} style={hs.weekCol}>
              {week.map((day, di) => (
                <View
                  key={`d-${wi}-${di}`}
                  style={[
                    hs.cell,
                    {
                      backgroundColor: getColor(day.count, day.isFuture, day.isToday),
                      opacity: day.isFuture ? 0 : 1,
                    },
                    day.isToday && { borderWidth: 1.5, borderColor: gold },
                  ]}
                />
              ))}
            </View>
          ))}
        </View>
      </View>

      {/* Legend */}
      <View style={hs.legendRow}>
        <Text style={[hs.legendText, { color: theme.subtext }]}>{tx(language, 'less')}</Text>
        {[0, 1, 2, 3, 4].map(level => (
          <View
            key={`l-${level}`}
            style={[hs.legendCell, {
              backgroundColor: getColor(
                level === 0 ? 0 : Math.ceil((level / 4) * Math.max(maxCount, 5)),
                false,
                false,
              ),
            }]}
          />
        ))}
        <Text style={[hs.legendText, { color: theme.subtext }]}>{tx(language, 'more')}</Text>
      </View>

      {/* Empty state */}
      {totalStories === 0 && (
        <Text style={[hs.emptyText, { color: theme.subtext }]}>
          {tx(language, 'noActivity')}
        </Text>
      )}
    </View>
  );
}

const hs = StyleSheet.create({
  container: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginBottom: 24,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 10,
    fontWeight: '500',
    opacity: 0.5,
  },
  monthRow: {
    position: 'relative',
    height: 16,
    marginBottom: 4,
  },
  monthLabel: {
    position: 'absolute',
    fontSize: 9,
    fontWeight: '600',
    opacity: 0.5,
    letterSpacing: 0.3,
  },
  gridArea: {
    flexDirection: 'row',
  },
  dayLabelsCol: {
    marginRight: 2,
  },
  dayLabel: {
    fontSize: 8,
    fontWeight: '600',
    opacity: 0.4,
    letterSpacing: 0.2,
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
    borderRadius: 3,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    marginTop: 10,
  },
  legendCell: {
    width: CELL,
    height: CELL,
    borderRadius: 2,
  },
  legendText: {
    fontSize: 9,
    fontWeight: '500',
    opacity: 0.4,
    letterSpacing: 0.3,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '500',
    opacity: 0.3,
    marginTop: 8,
  },
});