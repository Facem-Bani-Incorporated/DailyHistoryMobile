import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Bell, Clock, ShieldCheck } from 'lucide-react-native';
import { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import api from '../api';
import {
  requestNotificationPermissions,
  schedulePersonalizedNotification,
  setupNotificationChannel,
} from '../utils/Notifications';

const { width } = Dimensions.get('window');

// ─── Animated ring component ──────────────────────────────────────────────────
const PulseRing = ({ size, delay, duration }: { size: number; delay: number; duration: number }) => {
  const scale = useRef(new Animated.Value(0.85)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = () => {
      scale.setValue(0.85);
      opacity.setValue(0.6);
      Animated.parallel([
        Animated.timing(scale, {
          toValue: 1.15,
          duration,
          delay,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration,
          delay,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(() => animate());
    };
    animate();
  }, []);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 1,
        borderColor: '#D4A017',
        opacity,
        transform: [{ scale }],
      }}
    />
  );
};

export default function NotificationPrompt() {
  const router = useRouter();

  // Staggered entrance animations
  const iconAnim = useRef(new Animated.Value(0)).current;
  const iconScale = useRef(new Animated.Value(0.5)).current;
  const titleAnim = useRef(new Animated.Value(0)).current;
  const titleSlide = useRef(new Animated.Value(20)).current;
  const subtitleAnim = useRef(new Animated.Value(0)).current;
  const card1Anim = useRef(new Animated.Value(0)).current;
  const card1Slide = useRef(new Animated.Value(24)).current;
  const card2Anim = useRef(new Animated.Value(0)).current;
  const card2Slide = useRef(new Animated.Value(24)).current;
  const ctaAnim = useRef(new Animated.Value(0)).current;
  const ctaSlide = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.sequence([
      // Icon
      Animated.parallel([
        Animated.spring(iconScale, { toValue: 1, tension: 50, friction: 7, useNativeDriver: true }),
        Animated.timing(iconAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      ]),
      // Title
      Animated.parallel([
        Animated.timing(titleAnim, { toValue: 1, duration: 450, useNativeDriver: true }),
        Animated.timing(titleSlide, { toValue: 0, duration: 450, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
      // Subtitle
      Animated.timing(subtitleAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
      // Cards stagger
      Animated.stagger(100, [
        Animated.parallel([
          Animated.timing(card1Anim, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(card1Slide, { toValue: 0, duration: 400, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(card2Anim, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(card2Slide, { toValue: 0, duration: 400, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        ]),
      ]),
      // CTA
      Animated.parallel([
        Animated.timing(ctaAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(ctaSlide, { toValue: 0, duration: 400, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  const handleEnable = async () => {
    try {
      await AsyncStorage.setItem('notif_prompt_seen', 'true');
      await AsyncStorage.setItem('notifications_enabled', 'true');

      // Setup Android channel & request permission
      await setupNotificationChannel();
      const granted = await requestNotificationPermissions();

      if (granted) {
        // Fetch tomorrow's events and schedule the first notification
        try {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          const iso = tomorrow.toISOString().split('T')[0];
          const res = await api.get('/daily-content/by-date', {
            params: { date: iso, _t: Date.now() },
          });
          const events: any[] = res.data?.events ?? [];
          await schedulePersonalizedNotification(events, 'en');
        } catch {
          await schedulePersonalizedNotification([], 'en');
        }
      }

      router.replace('/(auth)/login');
    } catch (e) {
      console.error('Failed to save notification status', e);
    }
  };

  const handleSkip = async () => {
    try {
      await AsyncStorage.setItem('notif_prompt_seen', 'true');
      router.replace('/(auth)/login');
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <View style={styles.container}>

      {/* Content */}
      <View style={styles.content}>

        {/* Skip */}
        <View style={styles.topRow}>
          <View style={{ flex: 1 }} />
          <TouchableOpacity
            onPress={handleSkip}
            style={styles.skipButton}
            activeOpacity={0.5}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        </View>

        {/* ── Hero section ── */}
        <View style={styles.heroSection}>

          {/* Animated icon with pulse rings */}
          <Animated.View style={[styles.iconArea, { opacity: iconAnim, transform: [{ scale: iconScale }] }]}>
            <PulseRing size={140} delay={0} duration={2800} />
            <PulseRing size={140} delay={1400} duration={2800} />
            <View style={styles.iconRingOuter} />
            <View style={styles.iconRingInner} />
            <LinearGradient
              colors={['#D4A017', '#F5CE50']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.iconCircle}
            >
              <Bell color="#0B0D11" size={30} strokeWidth={2.2} />
            </LinearGradient>
          </Animated.View>

          {/* Title */}
          <Animated.View style={{ opacity: titleAnim, transform: [{ translateY: titleSlide }] }}>
            <Text style={styles.title}>
              Never miss a{'\n'}
              <Text style={styles.titleGold}>golden moment.</Text>
            </Text>
          </Animated.View>

          {/* Subtitle */}
          <Animated.View style={{ opacity: subtitleAnim }}>
            <Text style={styles.subtitle}>
              One story from history, delivered each morning.{'\n'}That's it — no noise, no clutter.
            </Text>
          </Animated.View>
        </View>

        {/* ── Feature cards ── */}
        <View style={styles.features}>
          <Animated.View style={[styles.featureCard, { opacity: card1Anim, transform: [{ translateY: card1Slide }] }]}>
            <View style={styles.featureIconWrap}>
              <Clock color="#D4A017" size={16} strokeWidth={2} />
            </View>
            <View style={styles.featureTextWrap}>
              <Text style={styles.featureTitle}>Every morning at 9 AM</Text>
              <Text style={styles.featureDesc}>Start your day with a fascinating piece of history</Text>
            </View>
          </Animated.View>

          <Animated.View style={[styles.featureCard, { opacity: card2Anim, transform: [{ translateY: card2Slide }] }]}>
            <View style={styles.featureIconWrap}>
              <ShieldCheck color="#D4A017" size={16} strokeWidth={2} />
            </View>
            <View style={styles.featureTextWrap}>
              <Text style={styles.featureTitle}>No spam, ever</Text>
              <Text style={styles.featureDesc}>One notification per day — we respect your attention</Text>
            </View>
          </Animated.View>
        </View>

        {/* ── CTA area ── */}
        <Animated.View style={[styles.ctaArea, { opacity: ctaAnim, transform: [{ translateY: ctaSlide }] }]}>
          <Pressable
            onPress={handleEnable}
            style={({ pressed }) => [styles.mainButton, pressed && { opacity: 0.85 }]}
          >
            <Bell color="#0B0D11" size={17} strokeWidth={2.5} style={{ marginRight: 10 }} />
            <Text style={styles.mainButtonText}>Enable Notifications</Text>
          </Pressable>

          <TouchableOpacity
            onPress={handleSkip}
            activeOpacity={0.5}
            style={styles.laterButton}
          >
            <Text style={styles.laterText}>I'll check manually</Text>
          </TouchableOpacity>
        </Animated.View>

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0D11',
  },

  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 60 : 44,
    paddingBottom: Platform.OS === 'ios' ? 50 : 36,
  },

  // Top row
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  skipButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#13151B',
    borderWidth: 1,
    borderColor: '#1E2028',
  },
  skipText: {
    color: '#6B6F7B',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
  },

  // Hero
  heroSection: {
    alignItems: 'center',
    marginBottom: 32,
    flex: 1,
    justifyContent: 'center',
  },

  // Icon area
  iconArea: {
    width: 160,
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 36,
  },
  iconRingOuter: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(212, 160, 23, 0.12)',
  },
  iconRingInner: {
    position: 'absolute',
    width: 85,
    height: 85,
    borderRadius: 42.5,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(212, 160, 23, 0.08)',
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#D4A017',
    shadowOpacity: 0.35,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 4 },
    elevation: 12,
  },

  // Title
  title: {
    fontSize: 34,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -1,
    lineHeight: 42,
    textAlign: 'center',
    marginBottom: 14,
  },
  titleGold: {
    color: '#D4A017',
  },

  // Subtitle
  subtitle: {
    fontSize: 15,
    color: '#6B6F7B',
    lineHeight: 23,
    textAlign: 'center',
    letterSpacing: 0.1,
    maxWidth: width * 0.8,
  },

  // Feature cards
  features: {
    gap: 8,
    marginBottom: 28,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#13151B',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1E2028',
    gap: 14,
  },
  featureIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: 'rgba(212, 160, 23, 0.07)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(212, 160, 23, 0.12)',
  },
  featureTextWrap: {
    flex: 1,
  },
  featureTitle: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
    letterSpacing: 0.1,
    marginBottom: 3,
  },
  featureDesc: {
    color: '#555B67',
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0.1,
  },

  // CTA
  ctaArea: {
    gap: 0,
  },
  mainButton: {
    backgroundColor: '#D4A017',
    borderRadius: 14,
    height: 54,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    shadowColor: '#D4A017',
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  mainButtonText: {
    color: '#0B0D11',
    fontWeight: '700',
    fontSize: 15,
    letterSpacing: 0.2,
  },
  laterButton: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  laterText: {
    color: '#444854',
    fontSize: 14,
    fontWeight: '500',
  },
});