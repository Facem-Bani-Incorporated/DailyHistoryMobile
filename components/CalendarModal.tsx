// components/CalendarModal.tsx
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';

const { width: W, height: H } = Dimensions.get('window');
const SERIF = Platform.OS === 'ios' ? 'Georgia' : 'serif';
const SANS = Platform.OS === 'ios' ? 'System' : 'sans-serif';
const CELL_SIZE = Math.floor((W - 56) / 7);

interface CalendarModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectDate: (date: Date) => void;
  selectedDate: Date;
  maxFutureOffset?: number;
  events?: any[];
}

const WEEKDAYS: Record<string, string[]> = {
  en: ['S', 'M', 'T', 'W', 'T', 'F', 'S'],
  ro: ['D', 'L', 'M', 'M', 'J', 'V', 'S'],
  fr: ['D', 'L', 'M', 'M', 'J', 'V', 'S'],
  de: ['S', 'M', 'D', 'M', 'D', 'F', 'S'],
  es: ['D', 'L', 'M', 'M', 'J', 'V', 'S'],
};

const MONTHS: Record<string, string[]> = {
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  ro: ['Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie', 'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie'],
  fr: ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'],
  de: ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'],
  es: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'],
};

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

/* ── Editorial Day Cell ── */
const DayCell = React.memo(({
  day, isToday, isSelected, isDisabled, hasEvents, impactLevel, theme, isDark, gold, onPress,
}: {
  day: number; isToday: boolean; isSelected: boolean; isDisabled: boolean;
  hasEvents: boolean; impactLevel: number; theme: any; isDark: boolean; gold: string;
  onPress: () => void;
}) => {
  const scale = useRef(new Animated.Value(1)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isSelected) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 0, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
      ).start();
    } else {
      pulse.setValue(0);
    }
  }, [isSelected]);

  const handlePressIn = () => {
    if (isDisabled) return;
    Animated.spring(scale, { toValue: 0.88, tension: 300, friction: 15, useNativeDriver: true }).start();
  };
  const handlePressOut = () => {
    Animated.spring(scale, { toValue: 1, tension: 200, friction: 12, useNativeDriver: true }).start();
  };

  const haloScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.35] });
  const haloOp = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0] });

  const dotColor = () => {
    if (impactLevel === 3) return gold;
    if (impactLevel === 2) return isDark ? '#A88B4D' : '#8B7355';
    if (impactLevel === 1) return isDark ? '#5A564E' : '#B5B0A8';
    return 'transparent';
  };

  const dotSize = impactLevel === 3 ? 4 : impactLevel === 2 ? 3 : 2.5;

  return (
    <Pressable
      onPress={isDisabled ? undefined : onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[cs.cellWrap, isDisabled && { opacity: 0.25 }]}
    >
      {isSelected && (
        <Animated.View style={[
          cs.halo,
          {
            backgroundColor: gold,
            opacity: haloOp,
            transform: [{ scale: haloScale }],
          },
        ]} />
      )}

      <Animated.View style={[
        cs.cell,
        {
          transform: [{ scale }],
          backgroundColor: isSelected
            ? gold
            : isToday
              ? (isDark ? '#2A251C' : '#F5EFE3')
              : 'transparent',
        },
        isSelected && {
          shadowColor: gold,
          shadowOpacity: 0.5,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 4 },
          elevation: 8,
        },
      ]}>
        <Text style={[
          cs.cellText,
          {
            color: isSelected ? '#000' : theme.text,
            fontFamily: SERIF,
            fontWeight: isSelected || isToday
              ? '700'
              : impactLevel === 3
                ? '600'
                : hasEvents
                  ? '500'
                  : '400',
            opacity: isSelected ? 1 : hasEvents || isToday ? 1 : isDark ? 0.72 : 0.65,
          },
        ]}>
          {day}
        </Text>

        {hasEvents && !isSelected && (
          <View style={[
            cs.dot,
            {
              width: dotSize,
              height: dotSize,
              borderRadius: dotSize / 2,
              backgroundColor: dotColor(),
            },
          ]} />
        )}

        {isToday && !isSelected && (
          <View style={[cs.todayRing, { borderColor: gold }]} />
        )}
      </Animated.View>
    </Pressable>
  );
});

const cs = StyleSheet.create({
  cellWrap: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cell: {
    width: CELL_SIZE - 8,
    height: CELL_SIZE - 8,
    borderRadius: (CELL_SIZE - 8) / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellText: {
    fontSize: 15,
    letterSpacing: -0.2,
  },
  dot: {
    position: 'absolute',
    bottom: 5,
  },
  halo: {
    position: 'absolute',
    width: CELL_SIZE - 8,
    height: CELL_SIZE - 8,
    borderRadius: (CELL_SIZE - 8) / 2,
  },
  todayRing: {
    position: 'absolute',
    width: CELL_SIZE - 4,
    height: CELL_SIZE - 4,
    borderRadius: (CELL_SIZE - 4) / 2,
    borderWidth: 1,
  },
});

/* ── Main Calendar ── */
export default function CalendarModal({
  visible, onClose, onSelectDate, selectedDate, maxFutureOffset = 1, events = [],
}: CalendarModalProps) {
  const { theme, isDark } = useTheme();
  const { language } = useLanguage();
  const insets = useSafeAreaInsets();
  const gold = isDark ? '#E8B84D' : '#C77E08';

  const today = useMemo(() => {
    const d = new Date(); d.setHours(0, 0, 0, 0); return d;
  }, []);

  const maxDate = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() + maxFutureOffset);
    return d;
  }, [today, maxFutureOffset]);

  const [viewYear, setViewYear] = useState(selectedDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(selectedDate.getMonth());

  const dayMetadata = useMemo(() => {
    const map: Record<number, { hasEvents: boolean, maxImpact: number, count: number }> = {};
    events.forEach(ev => {
      const dateStr = ev.eventDate || ev.event_date;
      if (!dateStr) return;
      const d = new Date(dateStr);
      if (d.getMonth() === viewMonth && d.getFullYear() === viewYear) {
        const day = d.getDate();
        const impact = ev.impactScore || 0;
        if (!map[day]) map[day] = { hasEvents: true, maxImpact: 0, count: 0 };
        map[day].count += 1;
        if (impact > map[day].maxImpact) map[day].maxImpact = impact;
      }
    });
    return map;
  }, [events, viewMonth, viewYear]);

  const monthStats = useMemo(() => {
    const days = Object.values(dayMetadata);
    const totalEvents = days.reduce((sum, d) => sum + d.count, 0);
    const highImpactDays = days.filter(d => d.maxImpact > 80).length;
    return { totalEvents, highImpactDays, activeDays: days.length };
  }, [dayMetadata]);

  const getImpactLevel = (day: number) => {
    const score = dayMetadata[day]?.maxImpact || 0;
    if (score > 80) return 3;
    if (score > 40) return 2;
    if (score > 0) return 1;
    return 0;
  };

  useEffect(() => {
    if (visible) {
      setViewYear(selectedDate.getFullYear());
      setViewMonth(selectedDate.getMonth());
    }
  }, [visible, selectedDate]);

  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const sheetY = useRef(new Animated.Value(H)).current;
  const monthFade = useRef(new Animated.Value(1)).current;
  const monthSlide = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      backdropOpacity.setValue(0);
      sheetY.setValue(H);
      Animated.parallel([
        Animated.timing(backdropOpacity, { toValue: 1, duration: 280, useNativeDriver: true }),
        Animated.spring(sheetY, { toValue: 0, tension: 58, friction: 12, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const handleClose = useCallback(() => {
    Animated.parallel([
      Animated.timing(backdropOpacity, { toValue: 0, duration: 220, useNativeDriver: true }),
      Animated.timing(sheetY, { toValue: H, duration: 280, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
    ]).start(() => onClose());
  }, [onClose]);

  const animateMonthChange = useCallback((direction: 'next' | 'prev', cb: () => void) => {
    const startX = direction === 'next' ? -20 : 20;
    Animated.parallel([
      Animated.timing(monthFade, { toValue: 0, duration: 140, useNativeDriver: true }),
      Animated.timing(monthSlide, { toValue: direction === 'next' ? -14 : 14, duration: 140, useNativeDriver: true }),
    ]).start(() => {
      cb();
      monthSlide.setValue(startX);
      Animated.parallel([
        Animated.timing(monthFade, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.spring(monthSlide, { toValue: 0, tension: 140, friction: 14, useNativeDriver: true }),
      ]).start();
    });
  }, []);

  const prevMonth = useCallback(() => {
    animateMonthChange('prev', () => {
      if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
      else setViewMonth(m => m - 1);
    });
  }, [viewMonth, animateMonthChange]);

  const nextMonth = useCallback(() => {
    const nextM = viewMonth === 11 ? 0 : viewMonth + 1;
    const nextY = viewMonth === 11 ? viewYear + 1 : viewYear;
    if (new Date(nextY, nextM, 1) > new Date(maxDate.getFullYear(), maxDate.getMonth() + 1, 0)) return;
    animateMonthChange('next', () => {
      setViewMonth(nextM);
      setViewYear(nextY);
    });
  }, [viewMonth, viewYear, maxDate, animateMonthChange]);

  const goToToday = useCallback(() => {
    const dir = today.getTime() > new Date(viewYear, viewMonth, 1).getTime() ? 'next' : 'prev';
    animateMonthChange(dir, () => {
      setViewMonth(today.getMonth());
      setViewYear(today.getFullYear());
    });
  }, [today, viewMonth, viewYear, animateMonthChange]);

  const handleSelectDay = useCallback((day: number) => {
    const date = new Date(viewYear, viewMonth, day);
    date.setHours(0, 0, 0, 0);
    onSelectDate(date);
    setTimeout(() => handleClose(), 200);
  }, [viewYear, viewMonth, onSelectDate, handleClose]);

  const { weeks } = useMemo(() => {
    const daysInMonth = getDaysInMonth(viewYear, viewMonth);
    const firstDay = getFirstDayOfMonth(viewYear, viewMonth);
    const weeks: (number | null)[][] = [];
    let currentWeek: (number | null)[] = [];

    for (let i = 0; i < firstDay; i++) currentWeek.push(null);

    for (let d = 1; d <= daysInMonth; d++) {
      currentWeek.push(d);
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    }

    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) currentWeek.push(null);
      weeks.push(currentWeek);
    }

    return { weeks };
  }, [viewYear, viewMonth]);

  const canGoForward = useMemo(() => {
    const nextM = viewMonth === 11 ? 0 : viewMonth + 1;
    const nextY = viewMonth === 11 ? viewYear + 1 : viewYear;
    return new Date(nextY, nextM, 1) <= new Date(maxDate.getFullYear(), maxDate.getMonth() + 1, 0);
  }, [viewMonth, viewYear, maxDate]);

  const isCurrentMonth = viewYear === today.getFullYear() && viewMonth === today.getMonth();

  const weekdayLabels = WEEKDAYS[language] ?? WEEKDAYS.en;
  const monthNames = MONTHS[language] ?? MONTHS.en;

  if (!visible) return null;

  const sheetBg = isDark ? '#0E0B14' : '#FBF8F2';
  const gradientTop = isDark ? 'rgba(232, 184, 77, 0.08)' : 'rgba(199, 126, 8, 0.06)';
  const gradientBottom = isDark ? 'rgba(14, 11, 20, 0)' : 'rgba(251, 248, 242, 0)';

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={handleClose}>
      {/* Backdrop */}
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.6)', opacity: backdropOpacity }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
      </Animated.View>

      {/* Sheet */}
      <Animated.View style={[
        ms.sheet,
        {
          backgroundColor: sheetBg,
          paddingBottom: insets.bottom + 20,
          transform: [{ translateY: sheetY }],
        },
      ]}>
        {/* Top radiant gradient */}
        <LinearGradient
          colors={[gradientTop, gradientBottom]}
          style={ms.topGradient}
          pointerEvents="none"
        />

        {/* Handle */}
        <View style={ms.handleRow}>
          <View style={[ms.handle, { backgroundColor: isDark ? '#3A3240' : '#D8D2C5' }]} />
        </View>

        {/* Header — Year eyebrow + Large month + stat pill */}
        <View style={ms.header}>
          <Animated.View style={[ms.headerCenter, {
            opacity: monthFade,
            transform: [{ translateX: monthSlide }],
          }]}>
            <Text style={[ms.yearEyebrow, { color: gold }]}>
              {viewYear}
            </Text>
            <Text style={[ms.monthTitle, { color: theme.text }]}>
              {monthNames[viewMonth]}
            </Text>
          </Animated.View>

          {/* Nav arrows row — floating pill */}
          <View style={[ms.navPill, {
            backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.035)',
            borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
          }]}>
            <TouchableOpacity onPress={prevMonth} activeOpacity={0.6} style={ms.navBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="chevron-back" size={16} color={theme.text} />
            </TouchableOpacity>

            <View style={[ms.navDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]} />

            <TouchableOpacity
              onPress={goToToday}
              activeOpacity={0.6}
              disabled={isCurrentMonth}
              style={[ms.navBtn, ms.navTodayBtn, isCurrentMonth && { opacity: 0.3 }]}
              hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}>
              <View style={[ms.todayDot, { backgroundColor: gold }]} />
            </TouchableOpacity>

            <View style={[ms.navDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]} />

            <TouchableOpacity
              onPress={nextMonth}
              activeOpacity={0.6}
              disabled={!canGoForward}
              style={[ms.navBtn, !canGoForward && { opacity: 0.25 }]}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="chevron-forward" size={16} color={theme.text} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats strip — only shown when we actually have data for this month */}
        {monthStats.totalEvents > 0 ? (
          <View style={ms.statsRow}>
            <View style={ms.statCell}>
              <Text style={[ms.statNum, { color: theme.text, fontFamily: SERIF }]}>
                {monthStats.activeDays}
              </Text>
              <Text style={[ms.statLabel, { color: theme.subtext }]}>active days</Text>
            </View>
            <View style={[ms.statDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)' }]} />
            <View style={ms.statCell}>
              <Text style={[ms.statNum, { color: theme.text, fontFamily: SERIF }]}>
                {monthStats.totalEvents}
              </Text>
              <Text style={[ms.statLabel, { color: theme.subtext }]}>events</Text>
            </View>
            <View style={[ms.statDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)' }]} />
            <View style={ms.statCell}>
              <Text style={[ms.statNum, { color: gold, fontFamily: SERIF }]}>
                {monthStats.highImpactDays}
              </Text>
              <Text style={[ms.statLabel, { color: theme.subtext }]}>landmark</Text>
            </View>
          </View>
        ) : (
          <View style={ms.simpleTagline}>
            <View style={[ms.simpleLine, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]} />
            <Text style={[ms.simpleText, { color: theme.subtext, fontFamily: SERIF }]}>
              select a date
            </Text>
            <View style={[ms.simpleLine, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]} />
          </View>
        )}

        {/* Weekday headers */}
        <View style={ms.weekdayRow}>
          {weekdayLabels.map((wd, i) => (
            <View key={i} style={[ms.weekdayCell, { width: CELL_SIZE }]}>
              <Text style={[
                ms.weekdayText,
                {
                  color: i === 0 || i === 6
                    ? (isDark ? theme.subtext + '80' : theme.subtext + '90')
                    : theme.subtext,
                  fontFamily: SANS,
                },
              ]}>
                {wd}
              </Text>
            </View>
          ))}
        </View>

        {/* Calendar grid */}
        <Animated.View style={{
          opacity: monthFade,
          transform: [{ translateX: monthSlide }],
          paddingTop: 4,
        }}>
          {weeks.map((week, wi) => (
            <View key={wi} style={ms.weekRow}>
              {week.map((day, di) => {
                if (day === null) return <View key={di} style={{ width: CELL_SIZE, height: CELL_SIZE }} />;

                const date = new Date(viewYear, viewMonth, day);
                date.setHours(0, 0, 0, 0);
                const isT = isSameDay(date, today);
                const isSel = isSameDay(date, selectedDate);
                const metadata = dayMetadata[day];

                return (
                  <DayCell
                    key={di}
                    day={day}
                    isToday={isT}
                    isSelected={isSel}
                    isDisabled={date > maxDate}
                    hasEvents={!!metadata}
                    impactLevel={getImpactLevel(day)}
                    theme={theme}
                    isDark={isDark}
                    gold={gold}
                    onPress={() => handleSelectDay(day)}
                  />
                );
              })}
            </View>
          ))}
        </Animated.View>

        {/* Legend — only shown when we have event data to legend */}
        {monthStats.totalEvents > 0 && (
          <View style={[ms.legend, {
            borderTopColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
          }]}>
            <View style={ms.legendItem}>
              <View style={[ms.legendDot, { backgroundColor: gold, width: 4, height: 4, borderRadius: 2 }]} />
              <Text style={[ms.legendText, { color: theme.subtext }]}>landmark</Text>
            </View>
            <View style={ms.legendItem}>
              <View style={[ms.legendDot, {
                backgroundColor: isDark ? '#A88B4D' : '#8B7355',
                width: 3, height: 3, borderRadius: 1.5,
              }]} />
              <Text style={[ms.legendText, { color: theme.subtext }]}>notable</Text>
            </View>
            <View style={ms.legendItem}>
              <View style={[ms.legendDot, {
                backgroundColor: isDark ? '#5A564E' : '#B5B0A8',
                width: 2.5, height: 2.5, borderRadius: 1.25,
              }]} />
              <Text style={[ms.legendText, { color: theme.subtext }]}>minor</Text>
            </View>
          </View>
        )}
      </Animated.View>
    </Modal>
  );
}

const ms = StyleSheet.create({
  sheet: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 20,
    overflow: 'hidden',
  },
  topGradient: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 200,
  },
  handleRow: { alignItems: 'center', paddingTop: 10, paddingBottom: 4 },
  handle: { width: 40, height: 4, borderRadius: 2 },

  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingTop: 18,
    paddingBottom: 16,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'flex-start',
  },
  yearEyebrow: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 4,
    marginBottom: 2,
  },
  monthTitle: {
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: -1,
    fontFamily: SERIF,
    lineHeight: 40,
  },

  navPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  navBtn: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTodayBtn: {
    width: 26,
  },
  navDivider: {
    width: StyleSheet.hairlineWidth,
    height: 18,
  },
  todayDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    marginBottom: 10,
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    height: 24,
  },
  statNum: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    opacity: 0.7,
  },

  simpleTagline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 18,
    marginBottom: 6,
    paddingHorizontal: 12,
  },
  simpleLine: { flex: 1, height: StyleSheet.hairlineWidth },
  simpleText: {
    fontSize: 11,
    fontStyle: 'italic',
    letterSpacing: 2,
    textTransform: 'lowercase',
    opacity: 0.6,
  },

  weekdayRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingBottom: 4,
    paddingTop: 6,
  },
  weekdayCell: { alignItems: 'center' },
  weekdayText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1,
  },

  weekRow: {
    flexDirection: 'row',
    justifyContent: 'center',
  },

  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    paddingTop: 18,
    marginTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  legendDot: {},
  legendText: {
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    opacity: 0.75,
  },
});
