import { Zap } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useGamificationStore } from '../store/useGamificationStore';
import { TABBAR_PILL_HEIGHT } from './TabBar';

let _nextId = 1;

const PopupItem = ({
  amount, gold, onDone,
}: { amount: number; gold: string; onDone: () => void }) => {
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(scale,    { toValue: 1,   tension: 280, friction: 9, useNativeDriver: true }),
        Animated.timing(opacity,  { toValue: 1,   duration: 160,             useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(translateY, { toValue: -72, duration: 950,           useNativeDriver: true }),
        Animated.sequence([
          Animated.delay(260),
          Animated.timing(opacity, { toValue: 0,  duration: 680,             useNativeDriver: true }),
        ]),
      ]),
    ]).start(onDone);
  }, []);

  return (
    <Animated.View style={[
      st.pill,
      { borderColor: gold + '50', opacity, transform: [{ translateY }, { scale }] },
    ]}>
      <Zap size={11} color={gold} fill={gold} />
      <Text style={[st.text, { color: gold }]}>+{amount} XP</Text>
    </Animated.View>
  );
};

export default function XPFloatToast() {
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const totalXP = useGamificationStore(s => s.totalXP);
  const prevXP = useRef(totalXP);
  const isFirst = useRef(true);
  const [popups, setPopups] = useState<{ id: number; amount: number }[]>([]);

  const gold = isDark ? '#E8B84D' : '#C77E08';
  const bottom = Math.max(insets.bottom, 8) + TABBAR_PILL_HEIGHT + 16;

  useEffect(() => {
    if (isFirst.current) {
      isFirst.current = false;
      prevXP.current = totalXP;
      return;
    }
    const delta = totalXP - prevXP.current;
    prevXP.current = totalXP;
    if (delta > 0) {
      const id = _nextId++;
      setPopups(prev => [...prev, { id, amount: delta }]);
    }
  }, [totalXP]);

  if (popups.length === 0) return null;

  return (
    <View style={[st.wrap, { bottom }]} pointerEvents="none">
      {popups.map(p => (
        <PopupItem
          key={p.id}
          amount={p.amount}
          gold={gold}
          onDone={() => setPopups(prev => prev.filter(x => x.id !== p.id))}
        />
      ))}
    </View>
  );
}

const st = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0, right: 0,
    alignItems: 'center',
    zIndex: 9998,
    elevation: 20,
    pointerEvents: 'none',
  },
  pill: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    backgroundColor: 'rgba(20,16,8,0.82)',
  },
  text: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
});
