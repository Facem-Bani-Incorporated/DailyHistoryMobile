// components/TabBar.tsx
import { Bookmark, CalendarDays, Clock, Compass, Map } from 'lucide-react-native';
import { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { haptic } from '../utils/haptics';

export type Tab = 'today' | 'discover' | 'timeline' | 'map' | 'saved' | 'search';

interface TabBarProps {
  active: Tab;
  onSwitch: (tab: Tab) => void;
  unseenSaved?: number;
  t: (key: string) => string;
}

const TABS: { key: Tab; icon: any; labelKey: string }[] = [
  { key: 'today',    icon: CalendarDays, labelKey: 'today'    },
  { key: 'discover', icon: Compass,      labelKey: 'discover' },
  { key: 'timeline', icon: Clock,        labelKey: 'timeline' },
  { key: 'map',      icon: Map,          labelKey: 'map'      },
  { key: 'saved',    icon: Bookmark,     labelKey: 'saved'    },
];

// ─────────────────────────────────────────────────────────────────────────────
// TAB ITEM
// ─────────────────────────────────────────────────────────────────────────────
const TabItem = ({
  label, Icon, isActive, badge, theme, isDark, isPremium, onPress,
}: {
  label: string; Icon: any; isActive: boolean; badge?: number;
  theme: any; isDark: boolean; isPremium: boolean; onPress: () => void;
}) => {
  const scale        = useRef(new Animated.Value(1)).current;
  const activeFade   = useRef(new Animated.Value(isActive ? 1 : 0)).current;
  const iconY        = useRef(new Animated.Value(isActive ? -2 : 0)).current;
  const iconScale    = useRef(new Animated.Value(isActive ? 1.18 : 1)).current;
  const labelOpacity = useRef(new Animated.Value(isActive ? 1 : 0)).current;
  const labelY       = useRef(new Animated.Value(isActive ? 0 : 5)).current;
  const glowPulse    = useRef(new Animated.Value(0)).current;

  // Premium: gold glow pulse on active tab
  useEffect(() => {
    if (isPremium && isActive) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowPulse, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(glowPulse, { toValue: 0, duration: 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
      ).start();
    } else {
      glowPulse.setValue(0);
    }
  }, [isPremium, isActive]);

  // Activate / deactivate transitions
  useEffect(() => {
    const dur    = 280;
    const easing = Easing.bezier(0.4, 0, 0.2, 1);
    if (isActive) {
      Animated.parallel([
        Animated.timing(activeFade,   { toValue: 1, duration: dur,  easing,                                        useNativeDriver: true }),
        Animated.timing(iconY,        { toValue: -2, duration: dur, easing,                                        useNativeDriver: true }),
        Animated.spring(iconScale,    { toValue: 1.18, tension: 220, friction: 12,                                 useNativeDriver: true }),
        Animated.timing(labelOpacity, { toValue: 1, duration: dur,  easing,                                        useNativeDriver: true }),
        Animated.timing(labelY,       { toValue: 0, duration: dur,  easing,                                        useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(activeFade,   { toValue: 0, duration: 200, easing, useNativeDriver: true }),
        Animated.timing(iconY,        { toValue: 0, duration: 200, easing, useNativeDriver: true }),
        Animated.timing(iconScale,    { toValue: 1, duration: 200, easing, useNativeDriver: true }),
        Animated.timing(labelOpacity, { toValue: 0, duration: 140, easing, useNativeDriver: true }),
        Animated.timing(labelY,       { toValue: 5, duration: 200, easing, useNativeDriver: true }),
      ]).start();
    }
  }, [isActive]);

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.82, duration: 55, useNativeDriver: true }),
      Animated.spring(scale,  { toValue: 1, tension: 320, friction: 10, useNativeDriver: true }),
    ]).start();
    haptic('selection');
    onPress();
  };

  const activeColor   = isPremium ? '#D4A843' : theme.gold;
  const inactiveColor = isDark ? 'rgba(255,255,255,0.36)' : 'rgba(0,0,0,0.32)';

  const indicatorBg = isPremium
    ? 'rgba(212,168,67,0.18)'
    : isDark
      ? 'rgba(255,255,255,0.14)'
      : 'rgba(0,0,0,0.065)';

  const indicatorBorder = isPremium
    ? 'rgba(212,168,67,0.35)'
    : isDark
      ? 'rgba(255,255,255,0.22)'
      : 'rgba(255,255,255,0.95)';

  const glowOp = glowPulse.interpolate({ inputRange: [0, 1], outputRange: [0, 0.28] });

  return (
    <TouchableOpacity style={s.tabItem} onPress={handlePress} activeOpacity={1}>
      <Animated.View style={[s.tabInner, { transform: [{ scale }] }]}>

        {/* Liquid glass active indicator pill */}
        <Animated.View style={[
          s.indicator,
          { backgroundColor: indicatorBg, borderColor: indicatorBorder, opacity: activeFade },
        ]} />

        {/* Premium: gold glow ring */}
        {isPremium && (
          <Animated.View style={{
            position: 'absolute',
            width: 46, height: 46, borderRadius: 23,
            borderWidth: 1.5, borderColor: '#D4A843',
            opacity: glowOp,
          }} />
        )}

        {/* Icon */}
        <Animated.View style={{ transform: [{ translateY: iconY }, { scale: iconScale }], zIndex: 2 }}>
          <Icon
            size={22}
            color={isActive ? activeColor : inactiveColor}
            strokeWidth={isActive ? 2.2 : 1.6}
          />
          {badge !== undefined && badge > 0 && (
            <View style={[s.badge, { backgroundColor: activeColor }]}>
              <Text style={s.badgeT}>{badge > 99 ? '99+' : badge}</Text>
            </View>
          )}
        </Animated.View>

        {/* Label slides up when active */}
        <Animated.Text
          style={[s.label, { color: activeColor, opacity: labelOpacity, transform: [{ translateY: labelY }] }]}
          numberOfLines={1}
        >
          {label}
        </Animated.Text>

      </Animated.View>
    </TouchableOpacity>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// TAB BAR — Floating liquid glass pill
// ─────────────────────────────────────────────────────────────────────────────
export default function TabBar({ active, onSwitch, unseenSaved = 0, t }: TabBarProps) {
  const { theme, isDark, isPremium } = useTheme();
  const insets = useSafeAreaInsets();

  const overlayBg = isPremium
    ? 'rgba(5,4,10,0.72)'
    : isDark
      ? 'rgba(10,9,16,0.62)'
      : 'rgba(255,255,255,0.42)';

  const pillBorder = isPremium
    ? 'rgba(212,168,67,0.22)'
    : isDark
      ? 'rgba(255,255,255,0.13)'
      : 'rgba(255,255,255,0.85)';

  return (
    <View style={[s.outerWrap, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      <View style={[
        s.pill,
        {
          borderColor: pillBorder,
          ...Platform.select({
            ios: {
              shadowColor: isPremium ? '#D4A843' : '#000',
              shadowOffset: { width: 0, height: -3 },
              shadowOpacity: isPremium ? 0.12 : isDark ? 0.45 : 0.1,
              shadowRadius: 24,
            },
            android: { elevation: 18 },
          }),
        },
      ]}>
        {/* Background fill */}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: overlayBg }]} />

        {/* Tinted overlay on top of blur */}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: overlayBg }]} />

        {/* Glass surface highlight — 1px bright line across the top */}
        <View style={s.topHighlight} />

        {/* Subtle inner bottom shadow line */}
        <View style={[
          s.bottomEdge,
          { backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.04)' },
        ]} />

        {/* Tabs */}
        <View style={s.tabsRow}>
          {TABS.map(({ key, icon, labelKey }) => (
            <TabItem
              key={key}
              label={t(labelKey)}
              Icon={icon}
              isActive={active === key}
              badge={key === 'saved' ? unseenSaved : undefined}
              theme={theme}
              isDark={isDark}
              isPremium={isPremium}
              onPress={() => onSwitch(key)}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  outerWrap: {
    paddingHorizontal: 18,
    paddingTop: 6,
  },
  pill: {
    borderRadius: 32,
    borderWidth: 1,
    overflow: 'hidden',
  },
  topHighlight: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.32)',
    zIndex: 10,
  },
  bottomEdge: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: 1,
    zIndex: 10,
  },
  tabsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingTop: 10,
    paddingBottom: 10,
  },
  tabItem:  { flex: 1, alignItems: 'center' },
  tabInner: { alignItems: 'center', justifyContent: 'center', minHeight: 44, gap: 3 },

  // Glass pill behind active icon
  indicator: {
    position: 'absolute',
    width: 56,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
  },

  label: { fontSize: 10, fontWeight: '700', letterSpacing: 0.2 },

  badge: {
    position: 'absolute', top: -5, right: -9,
    minWidth: 15, height: 15, borderRadius: 7.5,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3,
  },
  badgeT: { fontSize: 8, fontWeight: '900', color: '#000' },
});
