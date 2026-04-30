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
import { useTheme } from '../context/ThemeContext';
import { haptic } from '../utils/haptics';

export type Tab = 'today' | 'discover' | 'timeline' | 'map' | 'saved' | 'search';

export const TABBAR_PILL_HEIGHT = 78;
export const TABBAR_BANNER_HEIGHT = 66;

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

const CIRCLE = 56;
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
  const circleScale   = useRef(new Animated.Value(isActive ? 1 : 0.4)).current;
  const circleOpacity = useRef(new Animated.Value(isActive ? 1 : 0)).current;
  const labelOpacity  = useRef(new Animated.Value(isActive ? 1 : 0)).current;
  const iconScale     = useRef(new Animated.Value(isActive ? 1.08 : 0.92)).current;
  const pressScale    = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isActive) {
      Animated.parallel([
        Animated.spring(circleScale,   { toValue: 1,    tension: 220, friction: 14, useNativeDriver: true }),
        Animated.timing(circleOpacity, { toValue: 1,    duration: 240, easing, useNativeDriver: true }),
        Animated.timing(labelOpacity,  { toValue: 1,    duration: 200, easing, useNativeDriver: true }),
        Animated.spring(iconScale,     { toValue: 1.08, tension: 220, friction: 14, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(circleScale,   { toValue: 0.4, tension: 220, friction: 14, useNativeDriver: true }),
        Animated.timing(circleOpacity, { toValue: 0,   duration: 180, easing, useNativeDriver: true }),
        Animated.timing(labelOpacity,  { toValue: 0,   duration: 140, easing, useNativeDriver: true }),
        Animated.spring(iconScale,     { toValue: 0.92, tension: 220, friction: 14, useNativeDriver: true }),
      ]).start();
    }
  }, [isActive]);

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(pressScale, { toValue: 0.86, duration: 65, useNativeDriver: true }),
      Animated.spring(pressScale,  { toValue: 1, tension: 320, friction: 10, useNativeDriver: true }),
    ]).start();
    haptic('selection');
    onPress();
  };

  const activeColor   = isDark ? '#FFFFFF' : '#000000';
  const inactiveColor = isDark ? 'rgba(255,255,255,0.42)' : 'rgba(0,0,0,0.40)';

  return (
    <TouchableOpacity style={s.tabItem} onPress={handlePress} activeOpacity={1}>
      <Animated.View style={[s.tabInner, { transform: [{ scale: pressScale }] }]}>

        {/* Circular active indicator */}
        <Animated.View style={[
          s.activeCircle,
          {
            backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.065)',
            borderColor: isDark ? 'rgba(255,255,255,0.24)' : 'rgba(255,255,255,0.75)',
            opacity: circleOpacity,
            transform: [{ scale: circleScale }],
          },
        ]} />

        {/* Icon */}
        <Animated.View style={[s.iconWrap, { transform: [{ scale: iconScale }] }]}>
          <Icon
            size={21}
            color={isActive ? activeColor : inactiveColor}
            strokeWidth={isActive ? 2.2 : 1.65}
          />
          {badge !== undefined && badge > 0 && (
            <View style={[s.badge, { borderColor: isDark ? 'rgba(10,8,21,0.7)' : 'rgba(255,255,255,0.6)' }]}>
              <Text style={s.badgeT}>{badge > 99 ? '99+' : badge}</Text>
            </View>
          )}
        </Animated.View>

        {/* Label — always in layout so circle height is stable; opacity drives visibility */}
        <Animated.Text
          style={[s.label, { color: activeColor, opacity: labelOpacity }]}
          numberOfLines={1}
        >
          {label}
        </Animated.Text>

      </Animated.View>
    </TouchableOpacity>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// TAB BAR — Liquid Glass
// ─────────────────────────────────────────────────────────────────────────────
export default function TabBar({ active, onSwitch, unseenSaved = 0, t }: TabBarProps) {
  const { isDark } = useTheme();

  return (
    <View style={s.outerWrap}>
      <View style={[
        s.glassBar,
        {
          borderColor: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.65)',
          ...Platform.select({
            ios: {
              shadowColor: isDark ? '#000' : '#000',
              shadowOffset: { width: 0, height: 12 },
              shadowOpacity: isDark ? 0.55 : 0.14,
              shadowRadius: 28,
            },
            android: { elevation: 14 },
          }),
        },
      ]}>
        {/* Primary blur layer */}
        <BlurView
          intensity={isDark ? 85 : 95}
          tint={isDark ? 'dark' : 'light'}
          style={StyleSheet.absoluteFill}
        />

        {/* Specular top edge — thin bright strip to sell the glass depth */}
        <View
          style={[s.topEdge, {
            backgroundColor: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.55)',
          }]}
          pointerEvents="none"
        />

        {/* Subtle inner glow — soft fill that lifts the surface */}
        <View
          style={[s.innerGlow, {
            backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.28)',
          }]}
          pointerEvents="none"
        />

        {/* Tabs row */}
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
    paddingHorizontal: 14,
    paddingTop: 6,
    paddingBottom: Platform.OS === 'ios' ? 0 : 14,
  },

  glassBar: {
    borderRadius: 40,
    borderWidth: 1,
    overflow: 'hidden',
  },

  topEdge: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 1,
    zIndex: 10,
  },

  innerGlow: {
    position: 'absolute',
    top: 1, left: 1, right: 1, bottom: 1,
    borderRadius: 39,
  },

  tabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },

  tabItem:  { flex: 1, alignItems: 'center', justifyContent: 'center' },

  tabInner: {
    alignItems: 'center',
    justifyContent: 'center',
    height: CIRCLE,
    width: CIRCLE + 4,
    position: 'relative',
  },

  activeCircle: {
    position: 'absolute',
    width: CIRCLE,
    height: CIRCLE,
    borderRadius: CIRCLE / 2,
    borderWidth: 1,
  },

  iconWrap: { zIndex: 2 },

  label: {
    fontSize: 9.5,
    fontWeight: '700',
    marginTop: 3,
    letterSpacing: 0.05,
    zIndex: 2,
  },

  badge: {
    position: 'absolute', top: -4, right: -8,
    minWidth: 16, height: 16, borderRadius: 8,
    backgroundColor: '#FF3B30',
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
  },
  badgeT: { fontSize: 8, fontWeight: '900', color: '#FFF' },
});
