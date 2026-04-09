// components/LockedTomorrowCard.tsx
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef } from 'react';
import {
    Animated,
    Easing,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';

const SERIF = Platform.OS === 'ios' ? 'Georgia' : 'serif';

const T: Record<string, Record<string, string>> = {
  en: {
    locked: "Tomorrow's Story",
    lockedSub: 'Watch a short ad to unlock',
    unlocking: 'Loading ad...',
    discover: "Tomorrow's Events",
    discoverSub: 'Watch a short ad to explore',
    cta: 'Unlock Now',
    ctaDisabled: 'Loading...',
    tomorrow: 'TOMORROW',
    preview: 'A new story awaits',
  },
  ro: {
    locked: 'Povestea de Mâine',
    lockedSub: 'Vizionează o reclamă scurtă pentru a debloca',
    unlocking: 'Se încarcă...',
    discover: 'Evenimentele de Mâine',
    discoverSub: 'Vizionează o reclamă scurtă pentru a explora',
    cta: 'Deblochează',
    ctaDisabled: 'Se încarcă...',
    tomorrow: 'MÂINE',
    preview: 'O nouă poveste te așteaptă',
  },
  fr: {
    locked: "L'Histoire de Demain",
    lockedSub: 'Regardez une courte pub pour débloquer',
    unlocking: 'Chargement...',
    discover: 'Les Événements de Demain',
    discoverSub: 'Regardez une courte pub pour explorer',
    cta: 'Débloquer',
    ctaDisabled: 'Chargement...',
    tomorrow: 'DEMAIN',
    preview: 'Une nouvelle histoire vous attend',
  },
  de: {
    locked: 'Die Geschichte von Morgen',
    lockedSub: 'Sieh dir eine kurze Werbung an',
    unlocking: 'Laden...',
    discover: 'Die Ereignisse von Morgen',
    discoverSub: 'Sieh dir eine kurze Werbung an',
    cta: 'Freischalten',
    ctaDisabled: 'Laden...',
    tomorrow: 'MORGEN',
    preview: 'Eine neue Geschichte wartet',
  },
  es: {
    locked: 'La Historia de Mañana',
    lockedSub: 'Mira un anuncio corto para desbloquear',
    unlocking: 'Cargando...',
    discover: 'Los Eventos de Mañana',
    discoverSub: 'Mira un anuncio corto para explorar',
    cta: 'Desbloquear',
    ctaDisabled: 'Cargando...',
    tomorrow: 'MAÑANA',
    preview: 'Una nueva historia te espera',
  },
};
const tx = (lang: string, k: string) => (T[lang] ?? T.en)[k] ?? T.en[k] ?? k;

interface LockedTomorrowCardProps {
  variant: 'main' | 'discover';
  onUnlock: () => void;
  isReady: boolean;
}

export default function LockedTomorrowCard({ variant, onUnlock, isReady }: LockedTomorrowCardProps) {
  const { theme, isDark } = useTheme();
  const { language } = useLanguage();

  const pulse = useRef(new Animated.Value(0)).current;
  const lockBounce = useRef(new Animated.Value(0.8)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Fade in
    Animated.timing(fadeIn, { toValue: 1, duration: 600, useNativeDriver: true }).start();

    // Lock icon bounce
    Animated.spring(lockBounce, { toValue: 1, tension: 80, friction: 6, useNativeDriver: true }).start();

    // Pulse glow on CTA
    if (isReady) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
      ).start();
    }
  }, [isReady]);

  const gold = isDark ? '#E8B84D' : '#C77E08';
  const isMain = variant === 'main';
  const title = tx(language, isMain ? 'locked' : 'discover');
  const subtitle = tx(language, isMain ? 'lockedSub' : 'discoverSub');
  const ctaText = isReady ? tx(language, 'cta') : tx(language, 'ctaDisabled');

  const pulseScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.05],
  });
  const pulseGlow = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.6, 1],
  });

  return (
    <Animated.View style={[styles.card, { shadowColor: isDark ? '#000' : '#444', opacity: fadeIn }]}>
      <View style={styles.inner}>
        {/* Background gradient */}
        <LinearGradient
          colors={isDark
            ? ['#0D0A07', '#1A1408', '#0D0A07']
            : ['#FFF9EF', '#FFFBF5', '#FFF9EF']}
          style={StyleSheet.absoluteFill}
        />

        {/* Top badge */}
        <View style={styles.top}>
          <View style={[styles.tomorrowBadge, { borderColor: gold + '40', backgroundColor: gold + '15' }]}>
            <Text style={[styles.tomorrowText, { color: gold }]}>{tx(language, 'tomorrow')}</Text>
          </View>
        </View>

        {/* Center — lock icon + text */}
        <View style={styles.center}>
          <Animated.View style={[styles.lockCircle, {
            backgroundColor: gold + '12',
            borderColor: gold + '30',
            transform: [{ scale: lockBounce }],
          }]}>
            <Ionicons name="lock-closed" size={32} color={gold} />
          </Animated.View>

          <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
          <Text style={[styles.subtitle, { color: theme.subtext }]}>{subtitle}</Text>

          {/* Decorative line */}
          <View style={styles.decoRow}>
            <View style={[styles.decoLine, { backgroundColor: gold + '25' }]} />
            <Ionicons name="play-circle" size={14} color={gold + '50'} />
            <View style={[styles.decoLine, { backgroundColor: gold + '25' }]} />
          </View>

          <Text style={[styles.preview, { color: theme.subtext }]}>{tx(language, 'preview')}</Text>
        </View>

        {/* CTA button */}
        <View style={styles.bottom}>
          <TouchableOpacity
            onPress={onUnlock}
            disabled={!isReady}
            activeOpacity={0.75}
            style={styles.ctaWrap}
          >
            <Animated.View style={[
              styles.ctaBtn,
              {
                backgroundColor: isReady ? gold : (isDark ? '#1A1610' : '#EDE5D8'),
                transform: [{ scale: isReady ? pulseScale : 1 }],
                opacity: isReady ? pulseGlow : 0.5,
              },
            ]}>
              <Ionicons
                name={isReady ? 'play' : 'hourglass-outline'}
                size={16}
                color={isReady ? '#000' : theme.subtext}
              />
              <Text style={[styles.ctaText, { color: isReady ? '#000' : theme.subtext }]}>
                {ctaText}
              </Text>
            </Animated.View>
          </TouchableOpacity>

          {/* Fine print */}
          <View style={styles.fineRow}>
            <Ionicons name="videocam-outline" size={10} color={theme.subtext + '60'} />
            <Text style={[styles.fineText, { color: theme.subtext }]}>~15-30s</Text>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
    elevation: 15,
    shadowOpacity: 0.5,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 10 },
  },
  inner: {
    flex: 1,
    borderRadius: 30,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.12)',
    justifyContent: 'space-between',
    paddingVertical: 28,
    paddingHorizontal: 24,
  },
  top: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  tomorrowBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
  },
  tomorrowText: {
    fontWeight: '800',
    fontSize: 9,
    letterSpacing: 2.5,
  },
  center: {
    alignItems: 'center',
    gap: 12,
  },
  lockCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '500',
    opacity: 0.6,
    textAlign: 'center',
    lineHeight: 19,
  },
  decoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 4,
  },
  decoLine: {
    width: 30,
    height: 1,
  },
  preview: {
    fontSize: 11,
    fontWeight: '600',
    fontStyle: 'italic',
    opacity: 0.35,
    letterSpacing: 0.5,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  bottom: {
    alignItems: 'center',
    gap: 8,
  },
  ctaWrap: {
    width: '100%',
  },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
    borderRadius: 16,
  },
  ctaText: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  fineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  fineText: {
    fontSize: 10,
    fontWeight: '500',
    opacity: 0.3,
  },
});