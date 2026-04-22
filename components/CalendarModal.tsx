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
const SANS = Platform.OS === 'ios' ? 'System' : 'sans-serif'; // Adăugat: Definiția SANS
const CELL_SIZE = Math.floor((W - 64) / 7);

interface CalendarModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectDate: (date: Date) => void;
  selectedDate: Date;
  maxFutureOffset?: number;
  events?: any[];
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

/* ── Editorial Day Cell ── */
const DayCell = React.memo(({
  day, isToday, isSelected, isDisabled, hasEvents, impactLevel, theme, isDark, gold, onPress,
}: {
  day: number; isToday: boolean; isSelected: boolean; isDisabled: boolean; 
  hasEvents: boolean; impactLevel: number; theme: any; isDark: boolean; gold: string;
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

  // Color logic based on AI Impact Score
  // 3: High Impact (>80), 2: Med (40-80), 1: Low (<40), 0: No Events
  const getImpactColor = () => {
    if (isSelected) return gold;
    if (impactLevel === 3) return gold;
    if (impactLevel === 2) return isDark ? '#A88B4D' : '#8B7355';
    if (impactLevel === 1) return isDark ? '#4A463F' : '#D1CDC7';
    return 'transparent';
  };

  const impactColor = getImpactColor();
  
  // If no events, we show a very subtle indicator or nothing (per user request)
  if (!hasEvents && !isToday) {
    return (
      <View style={cs.cellWrap}>
        <View style={[cs.emptyDot, { backgroundColor: theme.border + '40' }]} />
      </View>
    );
  }

  return (
    <Pressable
      onPress={isDisabled ? undefined : onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[cs.cellWrap, isDisabled && { opacity: 0.3 }]}
    >
      <Animated.View style={[
        cs.cell,
        {
          backgroundColor: isSelected ? gold : 'transparent',
          transform: [{ scale }],
          borderColor: isToday ? gold : 'transparent',
          borderWidth: isToday && !isSelected ? 1 : 0,
        },
        isSelected && {
          shadowColor: gold,
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 4,
        },
      ]}>
        <Text style={[
          cs.cellText,
          {
            color: isSelected ? '#000' : (impactLevel > 0 ? impactColor : theme.text),
            fontFamily: SERIF,
            fontWeight: impactLevel === 3 || isSelected ? '800' : '500',
            fontSize: impactLevel === 3 ? 18 : 15,
          },
        ]}>
          {day}
        </Text>
        {impactLevel === 3 && !isSelected && (
          <View style={[cs.impactLine, { backgroundColor: gold }]} />
        )}
      </Animated.View>
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
  cellText: { letterSpacing: -0.3 },
  emptyDot: { width: 3, height: 3, borderRadius: 1.5 },
  impactLine: {
    position: 'absolute', bottom: 6, width: 10, height: 1.5, borderRadius: 1,
  },
});

/* ── Main Calendar ── */
const toRoman = (n: number) => {
  const romans = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
  return romans[n] || "";
};

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

  // Map events to a day-impact object for quick lookup
  const dayMetadata = useMemo(() => {
    const map: Record<number, { hasEvents: boolean, maxImpact: number }> = {};
    events.forEach(ev => {
      const dateStr = ev.eventDate || ev.event_date;
      if (!dateStr) return;
      
      const d = new Date(dateStr);
      // Only care about events in the current viewing month/year
      if (d.getMonth() === viewMonth) {
        const day = d.getDate();
        const impact = ev.impactScore || 0;
        
        if (!map[day]) map[day] = { hasEvents: true, maxImpact: 0 };
        if (impact > map[day].maxImpact) map[day].maxImpact = impact;
      }
    });
    return map;
  }, [events, viewMonth, viewYear]);

  const getImpactLevel = (day: number) => {
    const score = dayMetadata[day]?.maxImpact || 0;
    if (score > 80) return 3;
    if (score > 40) return 2;
    if (score > 0) return 1;
    return 0;
  };

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
          <View style={[ms.mastheadLine, { backgroundColor: theme.gold + '25' }]} />
          <TouchableOpacity onPress={prevMonth} activeOpacity={0.6} style={ms.monthArrow} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Ionicons name="chevron-back" size={18} color={theme.gold} />
          </TouchableOpacity>

          <Animated.View style={[ms.monthCenter, { opacity: monthFade }]}>
            <Text style={[ms.mastheadLabel, { color: theme.text }]}>{monthNames[viewMonth].toUpperCase()}</Text>
            <Text style={[ms.mastheadIssue, { color: theme.gold }]}>N° {toRoman(viewMonth)}</Text>
          </Animated.View>

          <TouchableOpacity
            onPress={nextMonth} activeOpacity={0.6}
            disabled={!canGoForward}
            style={[ms.monthArrow, !canGoForward && { opacity: 0.2 }]}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Ionicons name="chevron-forward" size={18} color={theme.gold} />
          </TouchableOpacity>
          <View style={[ms.mastheadLine, { backgroundColor: theme.gold + '25' }]} />
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
        <View style={[ms.sep, { backgroundColor: theme.gold + '20' }]} />

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

        {/* Footer hint */}
        <View style={ms.footerWrap}>
          {!isCurrentMonth && (
            <TouchableOpacity onPress={goToToday} activeOpacity={0.65} style={[ms.todayChip, { backgroundColor: `${gold}12` }]}>
              <Text style={[ms.todayChipText, { color: gold }]}>BACK TO TODAY</Text>
            </TouchableOpacity>
          )}
          
          <View style={ms.footer}>
            <View style={[ms.footerLine, { backgroundColor: theme.gold + '30' }]} />
            <Text style={[ms.footerText, { color: theme.subtext }]}>
              ✦ AI SCORING ACTIVE ✦
            </Text>
            <View style={[ms.footerLine, { backgroundColor: theme.gold + '30' }]} />
          </View>
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
  },
  handleRow: { alignItems: 'center', paddingTop: 12, paddingBottom: 6 },
  handle: { width: 36, height: 4, borderRadius: 2 },

  monthHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 20, gap: 10,
  },
  mastheadLine: { flex: 1, height: StyleSheet.hairlineWidth },
  monthCenter: { alignItems: 'center', gap: 2 },
  mastheadLabel: {
    fontSize: 13, fontWeight: '800', letterSpacing: 4, fontFamily: SANS,
  },
  mastheadIssue: {
    fontSize: 11, fontWeight: '700', letterSpacing: 1.5,
    fontFamily: SERIF, fontStyle: 'italic',
  },

  monthArrow: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },

  footerWrap: { marginTop: 16, gap: 16 },
  todayChip: {
    alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8,
  },
  todayChipText: { fontSize: 10, fontWeight: '800', letterSpacing: 2 },

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