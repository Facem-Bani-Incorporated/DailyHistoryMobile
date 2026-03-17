// components/OnboardingScreen.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { haptic } from '../utils/haptics';

const { width: W, height: H } = Dimensions.get('window');
const ONBOARDING_KEY = 'has_seen_onboarding_v1';

export const checkOnboardingSeen = async (): Promise<boolean> => {
  try {
    return (await AsyncStorage.getItem(ONBOARDING_KEY)) === 'true';
  } catch {
    return false;
  }
};

export const markOnboardingSeen = async () => {
  try {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
  } catch {}
};

interface Props {
  onComplete: () => void;
}

const PAGES = [
  {
    icon: '📜',
    titleKey: 'onboarding_title_1',
    titleFallback: 'History, Every Day',
    descKey: 'onboarding_desc_1',
    descFallback: 'Discover what happened on this day throughout history. From ancient civilizations to modern breakthroughs.',
    accent: '#FFD700',
  },
  {
    icon: '🗺️',
    titleKey: 'onboarding_title_2',
    titleFallback: 'Explore the Map',
    descKey: 'onboarding_desc_2',
    descFallback: 'See where history happened. Events are pinned across the globe — tap any marker to dive deeper.',
    accent: '#3E7BFA',
  },
  {
    icon: '🔖',
    titleKey: 'onboarding_title_3',
    titleFallback: 'Save & Collect',
    descKey: 'onboarding_desc_3',
    descFallback: 'Bookmark your favorite moments. Build your personal history library and revisit them anytime.',
    accent: '#10B981',
  },
];

export default function OnboardingScreen({ onComplete }: Props) {
  const { theme, isDark } = useTheme();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const [currentPage, setCurrentPage] = useState(0);

  const handleNext = () => {
    haptic('light');
    if (currentPage < PAGES.length - 1) {
      scrollRef.current?.scrollTo({ x: W * (currentPage + 1), animated: true });
      setCurrentPage(currentPage + 1);
    } else {
      handleFinish();
    }
  };

  const handleFinish = async () => {
    haptic('success');
    await markOnboardingSeen();
    onComplete();
  };

  const handleSkip = async () => {
    haptic('light');
    await markOnboardingSeen();
    onComplete();
  };

  return (
    <View style={[s.root, { backgroundColor: theme.background }]}>

      {/* Skip button */}
      <TouchableOpacity
        onPress={handleSkip}
        activeOpacity={0.7}
        style={[s.skipBtn, { top: insets.top + 12 }]}
      >
        <Text style={[s.skipText, { color: theme.subtext }]}>
          {t('skip') || 'Skip'}
        </Text>
      </TouchableOpacity>

      {/* Pages */}
      <Animated.ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: true },
        )}
        onMomentumScrollEnd={(e) => {
          const page = Math.round(e.nativeEvent.contentOffset.x / W);
          setCurrentPage(page);
        }}
      >
        {PAGES.map((page, index) => {
          // Parallax for the icon
          const inputRange = [(index - 1) * W, index * W, (index + 1) * W];
          const iconScale = scrollX.interpolate({
            inputRange,
            outputRange: [0.6, 1, 0.6],
            extrapolate: 'clamp',
          });
          const iconTranslateY = scrollX.interpolate({
            inputRange,
            outputRange: [30, 0, 30],
            extrapolate: 'clamp',
          });
          const textOpacity = scrollX.interpolate({
            inputRange,
            outputRange: [0, 1, 0],
            extrapolate: 'clamp',
          });
          const textTranslateY = scrollX.interpolate({
            inputRange,
            outputRange: [20, 0, 20],
            extrapolate: 'clamp',
          });

          return (
            <View key={index} style={s.page}>
              {/* Decorative ring */}
              <Animated.View style={[
                s.iconWrap,
                {
                  borderColor: page.accent + '25',
                  transform: [{ scale: iconScale }, { translateY: iconTranslateY }],
                },
              ]}>
                <View style={[s.iconInner, { backgroundColor: page.accent + '12' }]}>
                  <Text style={s.iconEmoji}>{page.icon}</Text>
                </View>
              </Animated.View>

              {/* Text */}
              <Animated.View style={[
                s.textWrap,
                {
                  opacity: textOpacity,
                  transform: [{ translateY: textTranslateY }],
                },
              ]}>
                <Text style={[s.pageTitle, { color: theme.text }]}>
                  {t(page.titleKey) || page.titleFallback}
                </Text>
                <Text style={[s.pageDesc, { color: theme.subtext }]}>
                  {t(page.descKey) || page.descFallback}
                </Text>
              </Animated.View>

              {/* Page number */}
              <View style={[s.pageNum, { backgroundColor: page.accent + '15' }]}>
                <Text style={[s.pageNumText, { color: page.accent }]}>
                  {index + 1}/{PAGES.length}
                </Text>
              </View>
            </View>
          );
        })}
      </Animated.ScrollView>

      {/* Bottom area */}
      <View style={[s.bottom, { paddingBottom: insets.bottom + 20 }]}>
        {/* Dots */}
        <View style={s.dotsRow}>
          {PAGES.map((page, i) => {
            const dotWidth = scrollX.interpolate({
              inputRange: [(i - 1) * W, i * W, (i + 1) * W],
              outputRange: [6, 24, 6],
              extrapolate: 'clamp',
            });
            const dotOpacity = scrollX.interpolate({
              inputRange: [(i - 1) * W, i * W, (i + 1) * W],
              outputRange: [0.3, 1, 0.3],
              extrapolate: 'clamp',
            });
            return (
              <Animated.View
                key={i}
                style={[s.dot, {
                  width: dotWidth,
                  opacity: dotOpacity,
                  backgroundColor: page.accent,
                }]}
              />
            );
          })}
        </View>

        {/* CTA Button */}
        <TouchableOpacity
          onPress={handleNext}
          activeOpacity={0.85}
          style={[s.ctaBtn, { backgroundColor: PAGES[currentPage].accent }]}
        >
          <Text style={s.ctaText}>
            {currentPage === PAGES.length - 1
              ? (t('get_started') || 'Get Started')
              : (t('next') || 'Next')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },

  skipBtn: {
    position: 'absolute',
    right: 20,
    zIndex: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  skipText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.3,
  },

  page: {
    width: W,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },

  iconWrap: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  iconInner: {
    width: 110,
    height: 110,
    borderRadius: 55,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconEmoji: {
    fontSize: 48,
  },

  textWrap: {
    alignItems: 'center',
    gap: 14,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.3,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  pageDesc: {
    fontSize: 15,
    lineHeight: 24,
    textAlign: 'center',
    fontWeight: '400',
    opacity: 0.7,
    maxWidth: 300,
  },

  pageNum: {
    position: 'absolute',
    top: '18%',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
  },
  pageNumText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },

  bottom: {
    paddingHorizontal: 32,
    gap: 24,
    alignItems: 'center',
  },

  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },

  ctaBtn: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  ctaText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});