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

export type Tab = 'today' | 'discover' | 'timeline' | 'map' | 'saved';

interface TabBarProps {
  active: Tab;
  onSwitch: (tab: Tab) => void;
  unseenSaved?: number;
  t: (key: string) => string;
}

const TABS: { key: Tab; icon: any; labelKey: string }[] = [
  { key: 'today', icon: CalendarDays, labelKey: 'today' },
  { key: 'discover', icon: Compass, labelKey: 'discover' },
  { key: 'timeline', icon: Clock, labelKey: 'timeline' },
  { key: 'map', icon: Map, labelKey: 'map' },
  { key: 'saved', icon: Bookmark, labelKey: 'saved' },
];

/* ── Single Tab Item with animations ── */
const TabItem = ({
  tab,
  label,
  Icon,
  isActive,
  badge,
  theme,
  isDark,
  onPress,
}: {
  tab: Tab;
  label: string;
  Icon: any;
  isActive: boolean;
  badge?: number;
  theme: any;
  isDark: boolean;
  onPress: () => void;
}) => {
  const scale = useRef(new Animated.Value(1)).current;
  const pillWidth = useRef(new Animated.Value(isActive ? 1 : 0)).current;
  const iconY = useRef(new Animated.Value(isActive ? -2 : 0)).current;
  const labelOpacity = useRef(new Animated.Value(isActive ? 1 : 0)).current;
  const labelY = useRef(new Animated.Value(isActive ? 0 : 6)).current;
  const iconScale = useRef(new Animated.Value(isActive ? 1.25 : 1)).current;
  const spin = useRef(new Animated.Value(isActive ? 1 : 0)).current;

  const spinRotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  useEffect(() => {
    const dur = 300;
    const easing = Easing.bezier(0.4, 0, 0.2, 1);

    if (isActive) {
      Animated.parallel([
        Animated.timing(pillWidth, { toValue: 1, duration: dur, easing, useNativeDriver: false }),
        Animated.timing(iconY, { toValue: -2, duration: dur, easing, useNativeDriver: true }),
        Animated.spring(iconScale, { toValue: 1.25, tension: 200, friction: 12, useNativeDriver: true }),
        Animated.timing(spin, { toValue: 1, duration: 400, easing: Easing.bezier(0.34, 1.56, 0.64, 1), useNativeDriver: true }),
        Animated.timing(labelOpacity, { toValue: 1, duration: dur, easing, useNativeDriver: true }),
        Animated.timing(labelY, { toValue: 0, duration: dur, easing, useNativeDriver: true }),
      ]).start();
    } else {
      spin.setValue(0);
      Animated.parallel([
        Animated.timing(pillWidth, { toValue: 0, duration: 200, easing, useNativeDriver: false }),
        Animated.timing(iconY, { toValue: 0, duration: 200, easing, useNativeDriver: true }),
        Animated.timing(iconScale, { toValue: 1, duration: 200, easing, useNativeDriver: true }),
        Animated.timing(labelOpacity, { toValue: 0, duration: 150, easing, useNativeDriver: true }),
        Animated.timing(labelY, { toValue: 6, duration: 200, easing, useNativeDriver: true }),
      ]).start();
    }
  }, [isActive]);

  const handlePress = () => {
    // Bounce + scale up on tap
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.82, duration: 60, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, tension: 300, friction: 10, useNativeDriver: true }),
    ]).start();
    haptic('selection');
    onPress();
  };

  const activeColor = theme.gold;
  const inactiveColor = isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)';

  // Pill background width animated
  const pillBg = pillWidth.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 56],
  });

  return (
    <TouchableOpacity style={s.tabItem} onPress={handlePress} activeOpacity={1}>
      <Animated.View style={[s.tabInner, { transform: [{ scale }] }]}>
        {/* Animated pill background */}
        <View style={s.pillContainer}>
          <Animated.View style={[s.pill, {
            width: pillBg,
            backgroundColor: activeColor + (isDark ? '20' : '15'),
          }]} />
        </View>

        {/* Icon */}
        <Animated.View style={{
          transform: [{ translateY: iconY }, { scale: iconScale }, { rotate: spinRotate }],
          zIndex: 2,
        }}>
          <Icon
            size={21}
            color={isActive ? activeColor : inactiveColor}
            strokeWidth={isActive ? 2.2 : 1.5}
          />
          {/* Badge */}
          {badge !== undefined && badge > 0 && (
            <View style={[s.badge, { backgroundColor: activeColor }]}>
              <Text style={s.badgeT}>{badge > 99 ? '99+' : badge}</Text>
            </View>
          )}
        </Animated.View>

        {/* Label — slides up and fades in */}
        <Animated.Text
          style={[s.label, {
            color: activeColor,
            opacity: labelOpacity,
            transform: [{ translateY: labelY }],
          }]}
          numberOfLines={1}
        >
          {label}
        </Animated.Text>
      </Animated.View>
    </TouchableOpacity>
  );
};

/* ── Main TabBar ── */
export default function TabBar({ active, onSwitch, unseenSaved = 0, t }: TabBarProps) {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[s.bar, {
      backgroundColor: isDark ? '#0C0A08' : '#FFFFFF',
      borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
      paddingBottom: Math.max(insets.bottom, 6) + 2,
    }]}>
      {TABS.map(({ key, icon, labelKey }) => (
        <TabItem
          key={key}
          tab={key}
          label={t(labelKey)}
          Icon={icon}
          isActive={active === key}
          badge={key === 'saved' ? unseenSaved : undefined}
          theme={theme}
          isDark={isDark}
          onPress={() => onSwitch(key)}
        />
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 6,
    // Subtle shadow on iOS
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
  },
  tabInner: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    gap: 2,
  },
  pillContainer: {
    position: 'absolute',
    top: 0,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: {
    height: 32,
    borderRadius: 16,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.2,
    marginTop: -1,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    minWidth: 15,
    height: 15,
    borderRadius: 7.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeT: {
    fontSize: 8,
    fontWeight: '900',
    color: '#000',
  },
});