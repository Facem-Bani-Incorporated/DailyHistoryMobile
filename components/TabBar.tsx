import { BlurView } from 'expo-blur';
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

export const TABBAR_PILL_HEIGHT = 62;
export const TABBAR_BANNER_HEIGHT = 52;

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

const easing = Easing.bezier(0.4, 0, 0.2, 1);

// ─────────────────────────────────────────────────────────────────────────────
// TAB ITEM
// ─────────────────────────────────────────────────────────────────────────────
const TabItem = ({
  label, Icon, isActive, badge, isDark, onPress,
}: {
  label: string; Icon: any; isActive: boolean; badge?: number;
  isDark: boolean; onPress: () => void;
}) => {
  const pillScale   = useRef(new Animated.Value(isActive ? 1 : 0.5)).current;
  const pillOpacity = useRef(new Animated.Value(isActive ? 1 : 0)).current;
  const iconScale   = useRef(new Animated.Value(isActive ? 1.1 : 1)).current;
  const iconOpacity = useRef(new Animated.Value(isActive ? 1 : 0.42)).current;
  const dotOpacity  = useRef(new Animated.Value(isActive ? 0 : 1)).current;
  const pressScale  = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isActive) {
      Animated.parallel([
        Animated.spring(pillScale,    { toValue: 1,    tension: 260, friction: 16, useNativeDriver: true }),
        Animated.timing(pillOpacity,  { toValue: 1,    duration: 220, easing, useNativeDriver: true }),
        Animated.spring(iconScale,    { toValue: 1.1,  tension: 260, friction: 16, useNativeDriver: true }),
        Animated.timing(iconOpacity,  { toValue: 1,    duration: 200, easing, useNativeDriver: true }),
        Animated.timing(dotOpacity,   { toValue: 0,    duration: 150, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(pillScale,    { toValue: 0.5,  tension: 260, friction: 16, useNativeDriver: true }),
        Animated.timing(pillOpacity,  { toValue: 0,    duration: 180, easing, useNativeDriver: true }),
        Animated.spring(iconScale,    { toValue: 1,    tension: 260, friction: 16, useNativeDriver: true }),
        Animated.timing(iconOpacity,  { toValue: 0.42, duration: 180, easing, useNativeDriver: true }),
        Animated.timing(dotOpacity,   { toValue: 0,    duration: 100, useNativeDriver: true }),
      ]).start();
    }
  }, [isActive]);

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(pressScale, { toValue: 0.82, duration: 55, useNativeDriver: true }),
      Animated.spring(pressScale, { toValue: 1, tension: 380, friction: 10, useNativeDriver: true }),
    ]).start();
    haptic('selection');
    onPress();
  };

  const activeColor   = isDark ? '#FFFFFF' : '#111111';
  const inactiveColor = isDark ? 'rgba(255,255,255,0.42)' : 'rgba(0,0,0,0.38)';
  const pillBg        = isDark ? 'rgba(255,255,255,0.13)' : 'rgba(0,0,0,0.07)';

  return (
    <TouchableOpacity style={s.tabItem} onPress={handlePress} activeOpacity={1}>
      <Animated.View style={[s.tabInner, { transform: [{ scale: pressScale }] }]}>

        {/* Pill active indicator */}
        <Animated.View style={[
          s.pill,
          { backgroundColor: pillBg, opacity: pillOpacity, transform: [{ scaleX: pillScale }, { scaleY: pillScale }] },
        ]} />

        {/* Icon */}
        <Animated.View style={[s.iconWrap, { transform: [{ scale: iconScale }] }]}>
          <Icon
            size={19}
            color={isActive ? activeColor : inactiveColor}
            strokeWidth={isActive ? 2.2 : 1.6}
          />
          {badge !== undefined && badge > 0 && (
            <View style={[s.badge, { borderColor: isDark ? 'rgba(10,8,21,0.8)' : 'rgba(255,255,255,0.7)' }]}>
              <Text style={s.badgeT}>{badge > 99 ? '99+' : badge}</Text>
            </View>
          )}
        </Animated.View>

        {/* Active label — small text, only shows when active */}
        <Animated.Text
          style={[s.label, { color: activeColor, opacity: pillOpacity }]}
          numberOfLines={1}
        >
          {label}
        </Animated.Text>

      </Animated.View>
    </TouchableOpacity>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// TAB BAR
// ─────────────────────────────────────────────────────────────────────────────
export default function TabBar({ active, onSwitch, unseenSaved = 0, t }: TabBarProps) {
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();
  // Lift the bar above the system nav bar (Android gesture / 3-button) and the
  // iOS home indicator. Min 12dp so it still floats nicely on devices with no inset.
  const bottomPad = Math.max(insets.bottom, 12);

  return (
    <View style={[s.outerWrap, { paddingBottom: bottomPad }]}>
      <View style={[
        s.bar,
        {
          borderColor: isDark ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.6)',
          ...Platform.select({
            ios: {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: isDark ? 0.45 : 0.10,
              shadowRadius: 20,
            },
            android: { elevation: 12 },
          }),
        },
      ]}>
        <BlurView
          intensity={isDark ? 88 : 96}
          tint={isDark ? 'dark' : 'light'}
          style={StyleSheet.absoluteFill}
        />

        {/* Specular top edge */}
        <View
          style={[s.topEdge, {
            backgroundColor: isDark ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.6)',
          }]}
          pointerEvents="none"
        />

        <View style={s.tabsRow}>
          {TABS.map(({ key, icon: Icon, labelKey }) => (
            <TabItem
              key={key}
              label={t(labelKey)}
              Icon={Icon}
              isActive={active === key}
              badge={key === 'saved' ? unseenSaved : undefined}
              isDark={isDark}
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
    paddingHorizontal: 16,
    paddingTop: 5,
    // paddingBottom is set inline from useSafeAreaInsets so it adapts to each device
  },

  bar: {
    borderRadius: 36,
    borderWidth: 1,
    overflow: 'hidden',
  },

  topEdge: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: StyleSheet.hairlineWidth,
    zIndex: 10,
  },

  tabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 4,
  },

  tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  tabInner: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 46,
    width: 52,
  },

  pill: {
    position: 'absolute',
    width: 44,
    height: 30,
    borderRadius: 15,
  },

  iconWrap: { zIndex: 2 },

  label: {
    fontSize: 9,
    fontWeight: '700',
    marginTop: 2,
    letterSpacing: 0.1,
    zIndex: 2,
  },

  badge: {
    position: 'absolute', top: -4, right: -8,
    minWidth: 15, height: 15, borderRadius: 7.5,
    backgroundColor: '#FF3B30',
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
  },
  badgeT: { fontSize: 7.5, fontWeight: '900', color: '#FFF' },
});
