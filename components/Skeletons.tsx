// components/Skeletons.tsx
// Shared shimmer skeletons so loading states match the real layout instead of a
// bare spinner (kills the "flash" from placeholder → content).
import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, Easing, StyleSheet, View } from 'react-native';

const { height: H } = Dimensions.get('window');

const blockColor = (isDark: boolean) => (isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)');

/** Wraps children in a looping opacity pulse. */
export const Shimmer = ({ children, style }: { children: React.ReactNode; style?: any }) => {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(v, { toValue: 1, duration: 1150, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
  }, []);
  const opacity = v.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.4, 0.85, 0.4] });
  return <Animated.View style={[{ opacity }, style]}>{children}</Animated.View>;
};

const Bar = ({ w, h = 13, mt = 0, br = 6, isDark }: { w: any; h?: number; mt?: number; br?: number; isDark: boolean }) => (
  <View style={{ width: w, height: h, marginTop: mt, borderRadius: br, backgroundColor: blockColor(isDark) }} />
);

/** Full-screen Today/Discover main-card placeholder: hero image + title block. */
export const HistoryCardSkeleton = ({ isDark = true }: { isDark?: boolean }) => {
  const heroH = Math.floor(H * 0.5);
  return (
    <Shimmer style={sk.wrap}>
      <View style={[sk.hero, { height: heroH, backgroundColor: blockColor(isDark) }]} />
      <View style={sk.body}>
        <Bar w={90} h={11} isDark={isDark} />
        <Bar w={'92%'} h={22} mt={14} isDark={isDark} />
        <Bar w={'70%'} h={22} mt={8} isDark={isDark} />
        <Bar w={'100%'} h={12} mt={20} isDark={isDark} />
        <Bar w={'100%'} h={12} mt={9} isDark={isDark} />
        <Bar w={'85%'} h={12} mt={9} isDark={isDark} />
      </View>
    </Shimmer>
  );
};

const sk = StyleSheet.create({
  wrap: { flex: 1, paddingHorizontal: 16 },
  hero: { width: '100%', borderRadius: 20, marginTop: 8 },
  body: { paddingTop: 22, paddingHorizontal: 4 },
});
