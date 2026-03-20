// components/CalendarModal.tsx
import { Ionicons } from '@expo/vector-icons';
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
const CELL_SIZE = Math.floor((W - 64) / 7);

interface CalendarModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectDate: (date: Date) => void;
  selectedDate: Date;
  maxFutureOffset?: number;
}

const WEEKDAYS: Record<string, string[]> = {
  en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  ro: ['Dum', 'Lun', 'Mar', 'Mie', 'Joi', 'Vin', 'Sâm'],
  fr: ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'],
  de: ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'],
  es: ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'],
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

/* ── Day Cell ── */
const DayCell = React.memo(({
  day, isToday, isSelected, isDisabled, isFuture, isPast, theme, isDark, gold, onPress,
}: {
  day: number; isToday: boolean; isSelected: boolean; isDisabled: boolean;
  isFuture: boolean; isPast: boolean; theme: any; isDark: boolean; gold: string;
  onPress: () => void;
}) => {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (isDisabled) return;
    Animated.spring(scale, { toValue: 0.85, tension: 300, friction: 15, useNativeDriver: true }).start();
  };
  const handlePressOut = () => {
    Animated.spring(scale, { toValue: 1, tension: 200, friction: 12, useNativeDriver: true }).start();
  };

  const bgColor = isSelected
    ? gold
    : isToday
      ? `${gold}18`
      : 'transparent';

  const textColor = isSelected
    ? '#000'
    : isDisabled
      ? theme.subtext + '30'
      : isToday
        ? gold
        : theme.text;

  return (
    <Pressable
      onPress={isDisabled ? undefined : onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={cs.cellWrap}
    >
      <Animated.View style={[
        cs.cell,
        {
          backgroundColor: bgColor,
          transform: [{ scale }],
        },
        isSelected && {
          shadowColor: gold,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.4,
          shadowRadius: 10,
          elevation: 6,
        },
        isToday && !isSelected && {
          borderWidth: 1.5,
          borderColor: `${gold}50`,
        },
      ]}>
        <Text style={[
          cs.cellText,
          {
            color: textColor,
            fontWeight: isSelected || isToday ? '800' : '500',
            opacity: isDisabled ? 0.2 : 1,
          },
        ]}>
          {day}
        </Text>
      </Animated.View>
      {isToday && !isSelected && (
        <View style={[cs.todayDot, { backgroundColor: gold }]} />
      )}
    </Pressable>
  );
});

const cs = StyleSheet.create({
  cellWrap: { width: CELL_SIZE, height: CELL_SIZE + 6, alignItems: 'center', justifyContent: 'center' },
  cell: {
    width: CELL_SIZE - 6, height: CELL_SIZE - 6,
    borderRadius: (CELL_SIZE - 6) / 2,
    alignItems: 'center', justifyContent: 'center',
  },
  cellText: { fontSize: 15, letterSpacing: -0.3 },
  todayDot: { width: 4, height: 4, borderRadius: 2, marginTop: 1 },
});

/* ── Main Calendar ── */
export default function CalendarModal({
  visible, onClose, onSelectDate, selectedDate, maxFutureOffset = 1,
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

  // Reset view when modal opens
  useEffect(() => {
    if (visible) {
      setViewYear(selectedDate.getFullYear());
      setViewMonth(selectedDate.getMonth());
    }
  }, [visible, selectedDate]);

  // Animations
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const sheetY = useRef(new Animated.Value(H)).current;
  const monthFade = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible) {
      backdropOpacity.setValue(0);
      sheetY.setValue(H * 0.5);
      Animated.parallel([
        Animated.timing(backdropOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(sheetY, { toValue: 0, tension: 65, friction: 11, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const handleClose = useCallback(() => {
    Animated.parallel([
      Animated.timing(backdropOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(sheetY, { toValue: H * 0.5, duration: 250, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
    ]).start(() => onClose());
  }, [onClose]);

  const animateMonthChange = useCallback((cb: () => void) => {
    Animated.timing(monthFade, { toValue: 0, duration: 120, useNativeDriver: true }).start(() => {
      cb();
      Animated.timing(monthFade, { toValue: 1, duration: 180, useNativeDriver: true }).start();
    });
  }, []);

  const prevMonth = useCallback(() => {
    animateMonthChange(() => {
      if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
      else setViewMonth(m => m - 1);
    });
  }, [viewMonth, animateMonthChange]);

  const nextMonth = useCallback(() => {
    // Don't go beyond maxDate month
    const nextM = viewMonth === 11 ? 0 : viewMonth + 1;
    const nextY = viewMonth === 11 ? viewYear + 1 : viewYear;
    if (new Date(nextY, nextM, 1) > new Date(maxDate.getFullYear(), maxDate.getMonth() + 1, 0)) return;

    animateMonthChange(() => {
      setViewMonth(nextM);
      setViewYear(nextY);
    });
  }, [viewMonth, viewYear, maxDate, animateMonthChange]);

  const goToToday = useCallback(() => {
    animateMonthChange(() => {
      setViewMonth(today.getMonth());
      setViewYear(today.getFullYear());
    });
  }, [today, animateMonthChange]);

  const handleSelectDay = useCallback((day: number) => {
    const date = new Date(viewYear, viewMonth, day);
    date.setHours(0, 0, 0, 0);
    onSelectDate(date);
    // Small delay so the user sees the selection before closing
    setTimeout(() => handleClose(), 180);
  }, [viewYear, viewMonth, onSelectDate, handleClose]);

  // Build grid
  const { weeks, daysInMonth, firstDay } = useMemo(() => {
    const daysInMonth = getDaysInMonth(viewYear, viewMonth);
    const firstDay = getFirstDayOfMonth(viewYear, viewMonth);
    const weeks: (number | null)[][] = [];
    let currentWeek: (number | null)[] = [];

    // Leading blanks
    for (let i = 0; i < firstDay; i++) currentWeek.push(null);

    for (let d = 1; d <= daysInMonth; d++) {
      currentWeek.push(d);
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    }

    // Trailing blanks
    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) currentWeek.push(null);
      weeks.push(currentWeek);
    }

    return { weeks, daysInMonth, firstDay };
  }, [viewYear, viewMonth]);

  // Can go forward?
  const canGoForward = useMemo(() => {
    const nextM = viewMonth === 11 ? 0 : viewMonth + 1;
    const nextY = viewMonth === 11 ? viewYear + 1 : viewYear;
    return new Date(nextY, nextM, 1) <= new Date(maxDate.getFullYear(), maxDate.getMonth() + 1, 0);
  }, [viewMonth, viewYear, maxDate]);

  // Is viewing current month?
  const isCurrentMonth = viewYear === today.getFullYear() && viewMonth === today.getMonth();

  const weekdayLabels = WEEKDAYS[language] ?? WEEKDAYS.en;
  const monthNames = MONTHS[language] ?? MONTHS.en;

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={handleClose}>
      {/* Backdrop */}
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.55)', opacity: backdropOpacity }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
      </Animated.View>

      {/* Sheet */}
      <Animated.View style={[
        ms.sheet,
        {
          backgroundColor: theme.background,
          paddingBottom: insets.bottom + 16,
          transform: [{ translateY: sheetY }],
        },
      ]}>
        {/* Handle */}
        <View style={ms.handleRow}>
          <View style={[ms.handle, { backgroundColor: theme.border }]} />
        </View>

        {/* Month header */}
        <View style={ms.monthHeader}>
          <TouchableOpacity onPress={prevMonth} activeOpacity={0.6} style={ms.monthArrow} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Ionicons name="chevron-back" size={20} color={theme.text} />
          </TouchableOpacity>

          <Animated.View style={[ms.monthCenter, { opacity: monthFade }]}>
            <Text style={[ms.monthName, { color: theme.text }]}>
              {monthNames[viewMonth]}
            </Text>
            <Text style={[ms.yearLabel, { color: gold }]}>{viewYear}</Text>
          </Animated.View>

          <TouchableOpacity
            onPress={nextMonth} activeOpacity={0.6}
            disabled={!canGoForward}
            style={[ms.monthArrow, !canGoForward && { opacity: 0.2 }]}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="chevron-forward" size={20} color={theme.text} />
          </TouchableOpacity>
        </View>

        {/* Today shortcut */}
        {!isCurrentMonth && (
          <TouchableOpacity onPress={goToToday} activeOpacity={0.65} style={[ms.todayChip, { backgroundColor: `${gold}12`, borderColor: `${gold}30` }]}>
            <Ionicons name="today-outline" size={13} color={gold} />
            <Text style={[ms.todayChipText, { color: gold }]}>Today</Text>
          </TouchableOpacity>
        )}

        {/* Weekday headers */}
        <View style={ms.weekdayRow}>
          {weekdayLabels.map((wd, i) => (
            <View key={i} style={[ms.weekdayCell, { width: CELL_SIZE }]}>
              <Text style={[
                ms.weekdayText,
                { color: i === 0 || i === 6 ? `${theme.subtext}60` : theme.subtext },
              ]}>
                {wd}
              </Text>
            </View>
          ))}
        </View>

        {/* Separator */}
        <View style={[ms.sep, { backgroundColor: theme.border }]} />

        {/* Calendar grid */}
        <Animated.View style={{ opacity: monthFade }}>
          {weeks.map((week, wi) => (
            <View key={wi} style={ms.weekRow}>
              {week.map((day, di) => {
                if (day === null) return <View key={di} style={{ width: CELL_SIZE, height: CELL_SIZE + 6 }} />;

                const date = new Date(viewYear, viewMonth, day);
                date.setHours(0, 0, 0, 0);
                const isT = isSameDay(date, today);
                const isSel = isSameDay(date, selectedDate);
                const isFut = date > maxDate;

                return (
                  <DayCell
                    key={di}
                    day={day}
                    isToday={isT}
                    isSelected={isSel}
                    isDisabled={isFut}
                    isFuture={date > today}
                    isPast={date < today}
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

        {/* Footer hint */}
        <View style={ms.footer}>
          <View style={[ms.footerLine, { backgroundColor: theme.border }]} />
          <Text style={[ms.footerText, { color: theme.subtext }]}>
            Select a date to explore its history
          </Text>
          <View style={[ms.footerLine, { backgroundColor: theme.border }]} />
        </View>
      </Animated.View>
    </Modal>
  );
}

const ms = StyleSheet.create({
  sheet: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    // shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 20,
  },
  handleRow: { alignItems: 'center', paddingTop: 12, paddingBottom: 6 },
  handle: { width: 36, height: 4, borderRadius: 2 },

  monthHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 14, paddingHorizontal: 4,
  },
  monthArrow: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  monthCenter: { flex: 1, alignItems: 'center' },
  monthName: { fontSize: 22, fontWeight: '800', letterSpacing: -0.3, fontFamily: SERIF },
  yearLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 2, marginTop: 2, textTransform: 'uppercase' },

  todayChip: {
    alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1,
    marginBottom: 10,
  },
  todayChipText: { fontSize: 12, fontWeight: '700', letterSpacing: 0.3 },

  weekdayRow: { flexDirection: 'row', justifyContent: 'center', paddingBottom: 8, paddingTop: 4 },
  weekdayCell: { alignItems: 'center' },
  weekdayText: { fontSize: 11, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase' },

  sep: { height: StyleSheet.hairlineWidth, marginBottom: 6 },

  weekRow: { flexDirection: 'row', justifyContent: 'center' },

  footer: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginTop: 16, paddingHorizontal: 8,
  },
  footerLine: { flex: 1, height: StyleSheet.hairlineWidth },
  footerText: { fontSize: 11, fontWeight: '500', opacity: 0.35, letterSpacing: 0.3, fontFamily: SERIF, fontStyle: 'italic' },
});