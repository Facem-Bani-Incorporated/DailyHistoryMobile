// components/OnBoardingScreen.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';
import { LinearGradient } from 'expo-linear-gradient';
import * as Notifications from 'expo-notifications';
import {
  Bell,
  BookmarkCheck,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  Crown,
  Globe2,
  Layers3,
  Map as MapIcon,
  Rocket,
  ShieldCheck,
  Sparkles,
} from 'lucide-react-native';

import { useRevenueCat } from '../context/RevenueCatContext';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: W } = Dimensions.get('window');

interface Props {
  onComplete: () => void;
}

const FEATURES = [
  {
    icon: Calendar,
    title: '5 events, every day',
    desc: 'Each morning you get 5 events that happened on this exact date throughout history.',
    accent: '#D4A017',
  },
  {
    icon: Layers3,
    title: 'Interactive timeline',
    desc: 'Scroll through centuries and see how events connect across eras.',
    accent: '#3B82F6',
  },
  {
    icon: Globe2,
    title: 'Events on the map',
    desc: 'Every event is pinned on a globe. Tap any marker to explore.',
    accent: '#10B981',
  },
  {
    icon: BookmarkCheck,
    title: 'Save your favorites',
    desc: 'Bookmark any event and build a personal collection.',
    accent: '#A855F7',
  },
  {
    icon: Sparkles,
    title: 'AI-powered stories',
    desc: 'Rich narratives crafted to bring every moment to life.',
    accent: '#F59E0B',
  },
];

// ── Feature row ──────────────────────────────────────────────────────────────
const FeatureRow = ({
  feature,
  animValue,
}: {
  feature: (typeof FEATURES)[0];
  animValue: Animated.Value;
}) => {
  const Icon = feature.icon;
  return (
    <Animated.View
      style={[
        s.featureRow,
        {
          opacity: animValue,
          transform: [
            {
              translateY: animValue.interpolate({
                inputRange: [0, 1],
                outputRange: [16, 0],
              }),
            },
          ],
        },
      ]}
    >
      <View
        style={[
          s.featureIcon,
          { backgroundColor: feature.accent + '10', borderColor: feature.accent + '18' },
        ]}
      >
        <Icon color={feature.accent} size={18} strokeWidth={2} />
      </View>
      <View style={s.featureText}>
        <Text style={s.featureTitle}>{feature.title}</Text>
        <Text style={s.featureDesc}>{feature.desc}</Text>
      </View>
    </Animated.View>
  );
};

// ── Pulse ring for notification step ─────────────────────────────────────────
const PulseRing = ({ size, delay, duration }: { size: number; delay: number; duration: number }) => {
  const scale = useRef(new Animated.Value(0.85)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = () => {
      scale.setValue(0.85);
      opacity.setValue(0.5);
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

// ── Main component ───────────────────────────────────────────────────────────
export default function OnboardingScreen({ onComplete }: Props) {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<'features' | 'notifications' | 'subscription'>('features');
  const { isPro, presentPaywall } = useRevenueCat();

  // ── Features step animations ──
  const headerFade = useRef(new Animated.Value(0)).current;
  const headerSlide = useRef(new Animated.Value(20)).current;
  const featureAnims = useRef(FEATURES.map(() => new Animated.Value(0))).current;
  const ctaFade = useRef(new Animated.Value(0)).current;
  const ctaSlide = useRef(new Animated.Value(12)).current;

  // ── Notifications step animations ──
  const notifFade = useRef(new Animated.Value(0)).current;
  const notifSlide = useRef(new Animated.Value(30)).current;

  // ── Subscription step animations ──
  const subFade = useRef(new Animated.Value(0)).current;
  const subSlide = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    if (step === 'features') {
      Animated.sequence([
        Animated.parallel([
          Animated.timing(headerFade, { toValue: 1, duration: 500, useNativeDriver: true }),
          Animated.timing(headerSlide, {
            toValue: 0,
            duration: 500,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),
        Animated.stagger(
          80,
          featureAnims.map((anim) =>
            Animated.timing(anim, {
              toValue: 1,
              duration: 350,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            })
          )
        ),
        Animated.parallel([
          Animated.timing(ctaFade, { toValue: 1, duration: 350, useNativeDriver: true }),
          Animated.timing(ctaSlide, {
            toValue: 0,
            duration: 350,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    }
  }, [step]);

  useEffect(() => {
    if (step === 'notifications') {
      notifFade.setValue(0);
      notifSlide.setValue(30);
      Animated.parallel([
        Animated.timing(notifFade, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(notifSlide, {
          toValue: 0,
          duration: 500,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [step]);

  useEffect(() => {
    if (step === 'subscription') {
      subFade.setValue(0);
      subSlide.setValue(30);
      Animated.parallel([
        Animated.timing(subFade, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(subSlide, {
          toValue: 0,
          duration: 500,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [step]);

  // ── Push permissions ──
  const requestPushPermissions = async () => {
    if (!Device.isDevice) return;
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus === 'granted' && Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
      });
    }
  };

  const handleEnableNotifs = async () => {
    await AsyncStorage.setItem('notif_prompt_seen', 'true');
    await requestPushPermissions();
    if (isPro) { onComplete(); return; }
    setStep('subscription');
  };

  const handleSkipNotifs = async () => {
    await AsyncStorage.setItem('notif_prompt_seen', 'true');
    if (isPro) { onComplete(); return; }
    setStep('subscription');
  };

  // ── Subscription step handlers ──
  const [paywallLoading, setPaywallLoading] = useState(false);
  const handleUnlockPro = async () => {
    if (paywallLoading) return;
    setPaywallLoading(true);
    try {
      await presentPaywall();
    } finally {
      setPaywallLoading(false);
      onComplete();
    }
  };
  const handleSkipPro = () => onComplete();

  // ── FEATURES STEP ──
  if (step === 'features') {
    return (
      <View style={s.container}>
        <ScrollView
          contentContainerStyle={[
            s.scrollContent,
            { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 },
          ]}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Header */}
          <Animated.View
            style={[s.header, { opacity: headerFade, transform: [{ translateY: headerSlide }] }]}
          >
            <View style={s.logoPill}>
              <LinearGradient
                colors={['#D4A017', '#F5CE50']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={s.logoIcon}
              >
                <Text style={s.logoLetter}>D</Text>
              </LinearGradient>
              <Text style={s.logoText}>DailyHistory</Text>
            </View>

            <Text style={s.title}>Here's what{'\n'}you can do.</Text>
            <Text style={s.subtitle}>A quick look at everything inside the app.</Text>
          </Animated.View>

          {/* Features */}
          <View style={s.featuresContainer}>
            {FEATURES.map((feature, i) => (
              <FeatureRow key={i} feature={feature} animValue={featureAnims[i]} />
            ))}
          </View>

          {/* CTA */}
          <Animated.View
            style={[s.ctaArea, { opacity: ctaFade, transform: [{ translateY: ctaSlide }] }]}
          >
            <Pressable
              onPress={() => setStep('notifications')}
              style={({ pressed }) => [s.ctaButton, pressed && { opacity: 0.85 }]}
            >
              <Text style={s.ctaText}>Continue</Text>
              <ChevronRight color="#0B0D11" size={18} strokeWidth={2.5} />
            </Pressable>
          </Animated.View>
        </ScrollView>
      </View>
    );
  }

  // ── NOTIFICATIONS + SUBSCRIPTION STEPS ──
  return (
    <View style={s.container}>
      {step === 'notifications' && (
      <Animated.View
        style={[
          s.notifContent,
          {
            paddingTop: insets.top + 16,
            paddingBottom: insets.bottom + 24,
            opacity: notifFade,
            transform: [{ translateY: notifSlide }],
          },
        ]}
      >
        {/* Skip */}
        <View style={s.notifTopRow}>
          <View style={{ flex: 1 }} />
          <TouchableOpacity
            onPress={handleSkipNotifs}
            style={s.skipButton}
            activeOpacity={0.5}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={s.skipText}>Skip</Text>
          </TouchableOpacity>
        </View>

        {/* Hero */}
        <View style={s.notifHero}>
          <View style={s.notifIconArea}>
            <PulseRing size={130} delay={0} duration={2800} />
            <PulseRing size={130} delay={1400} duration={2800} />
            <View style={s.notifRingOuter} />
            <LinearGradient
              colors={['#D4A017', '#F5CE50']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={s.notifIconCircle}
            >
              <Bell color="#0B0D11" size={28} strokeWidth={2.2} />
            </LinearGradient>
          </View>

          <Text style={s.notifTitle}>
            Never miss a{'\n'}
            <Text style={s.notifTitleGold}>golden moment.</Text>
          </Text>
          <Text style={s.notifSubtitle}>
            One story from history, delivered each morning.{'\n'}No noise, no clutter.
          </Text>
        </View>

        {/* Feature cards */}
        <View style={s.notifFeatures}>
          <View style={s.notifFeatureCard}>
            <View style={s.notifFeatureIconWrap}>
              <Clock color="#D4A017" size={16} strokeWidth={2} />
            </View>
            <View style={s.notifFeatureTextWrap}>
              <Text style={s.notifFeatureTitle}>Every morning at 9 AM</Text>
              <Text style={s.notifFeatureDesc}>
                Start your day with a fascinating piece of history
              </Text>
            </View>
          </View>

          <View style={s.notifFeatureCard}>
            <View style={s.notifFeatureIconWrap}>
              <ShieldCheck color="#D4A017" size={16} strokeWidth={2} />
            </View>
            <View style={s.notifFeatureTextWrap}>
              <Text style={s.notifFeatureTitle}>No spam, ever</Text>
              <Text style={s.notifFeatureDesc}>
                One notification per day — we respect your attention
              </Text>
            </View>
          </View>
        </View>

        {/* CTA */}
        <View style={s.notifCtaArea}>
          <Pressable
            onPress={handleEnableNotifs}
            style={({ pressed }) => [s.ctaButton, pressed && { opacity: 0.85 }]}
          >
            <Bell color="#0B0D11" size={17} strokeWidth={2.5} style={{ marginRight: 8 }} />
            <Text style={s.ctaText}>Enable Notifications</Text>
          </Pressable>

          <TouchableOpacity onPress={handleSkipNotifs} activeOpacity={0.5} style={s.laterButton}>
            <Text style={s.laterText}>I'll check manually</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
      )}

      {step === 'subscription' && renderSubscriptionStep()}
    </View>
  );

  // ── SUBSCRIPTION STEP ──
  function renderSubscriptionStep() {
    const benefits = [
      { icon: Sparkles, title: 'Exclusive PRO stories', desc: 'Curated premium events with deeper research and visuals.' },
      { icon: MapIcon,  title: 'Unlock every category', desc: 'Full access to all topics — science, art, war, culture.' },
      { icon: ShieldCheck, title: 'Ad-free experience', desc: 'Read without interruptions. Just history, nothing else.' },
      { icon: Rocket, title: 'Early access', desc: 'Be the first to try new features as we release them.' },
    ];
    return (
      <Animated.View
        style={[
          s.subContent,
          {
            paddingTop: insets.top + 16,
            paddingBottom: insets.bottom + 24,
            opacity: subFade,
            transform: [{ translateY: subSlide }],
          },
        ]}
      >
        <View style={s.notifTopRow}>
          <View style={{ flex: 1 }} />
          <TouchableOpacity
            onPress={handleSkipPro}
            style={s.skipButton}
            activeOpacity={0.5}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={s.skipText}>Skip</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 20 }}
          bounces={false}
        >
          <View style={s.subHero}>
            <View style={s.subCrownWrap}>
              <LinearGradient
                colors={['#D4A017', '#F5CE50']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={s.subCrownCircle}
              >
                <Crown color="#0B0D11" size={26} strokeWidth={2.2} />
              </LinearGradient>
            </View>

            <View style={s.subBadge}>
              <Sparkles color="#D4A017" size={10} strokeWidth={2.5} />
              <Text style={s.subBadgeT}>DAILY HISTORY PRO</Text>
            </View>

            <Text style={s.subTitle}>
              Go deeper into{'\n'}
              <Text style={s.subTitleGold}>every story.</Text>
            </Text>
            <Text style={s.subSubtitle}>
              Unlock premium events, remove ads, and support the team building the app.
            </Text>
          </View>

          <View style={s.subBenefits}>
            {benefits.map((b, i) => {
              const Icon = b.icon;
              return (
                <View key={i} style={s.subBenefitRow}>
                  <View style={s.subBenefitIconWrap}>
                    <Icon color="#D4A017" size={15} strokeWidth={2.2} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.subBenefitTitle}>{b.title}</Text>
                    <Text style={s.subBenefitDesc}>{b.desc}</Text>
                  </View>
                  <CheckCircle2 color="#D4A017" size={15} strokeWidth={2.2} />
                </View>
              );
            })}
          </View>
        </ScrollView>

        <View style={s.subCtaArea}>
          <Pressable
            onPress={handleUnlockPro}
            disabled={paywallLoading}
            style={({ pressed }) => [s.ctaButton, pressed && { opacity: 0.85 }, paywallLoading && { opacity: 0.7 }]}
          >
            {paywallLoading ? (
              <ActivityIndicator color="#0B0D11" size="small" />
            ) : (
              <>
                <Sparkles color="#0B0D11" size={16} strokeWidth={2.5} style={{ marginRight: 8 }} />
                <Text style={s.ctaText}>Unlock Pro</Text>
              </>
            )}
          </Pressable>

          <TouchableOpacity onPress={handleSkipPro} activeOpacity={0.5} style={s.laterButton}>
            <Text style={s.laterText}>Continue with free</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  }
}

// ─── STYLES ──────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0D11',
  },
  scrollContent: {
    paddingHorizontal: 24,
    flexGrow: 1,
  },

  // ── Features step ──
  header: {
    marginBottom: 28,
  },
  logoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 100,
    paddingRight: 14,
    paddingLeft: 4,
    paddingVertical: 4,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  logoIcon: {
    width: 28,
    height: 28,
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  logoLetter: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0B0D11',
    letterSpacing: -0.5,
  },
  logoText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 0.1,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.8,
    lineHeight: 39,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B6F7B',
    lineHeight: 23,
    letterSpacing: 0.1,
  },

  featuresContainer: {
    gap: 6,
    marginBottom: 28,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: '#13151B',
    borderWidth: 1,
    borderColor: '#1A1D25',
    gap: 14,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.1,
    marginBottom: 3,
  },
  featureDesc: {
    color: '#555B67',
    fontSize: 13,
    lineHeight: 19,
    letterSpacing: 0.1,
  },

  ctaArea: {
    marginTop: 'auto',
    paddingTop: 8,
  },
  ctaButton: {
    backgroundColor: '#D4A017',
    borderRadius: 14,
    height: 54,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    shadowColor: '#D4A017',
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  ctaText: {
    color: '#0B0D11',
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: 0.1,
  },

  // ── Notifications step ──
  notifContent: {
    flex: 1,
    paddingHorizontal: 24,
  },
  notifTopRow: {
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

  notifHero: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  notifIconArea: {
    width: 150,
    height: 150,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  notifRingOuter: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(212, 160, 23, 0.12)',
  },
  notifIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#D4A017',
    shadowOpacity: 0.35,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 4 },
    elevation: 12,
  },
  notifTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -1,
    lineHeight: 40,
    textAlign: 'center',
    marginBottom: 12,
  },
  notifTitleGold: {
    color: '#D4A017',
  },
  notifSubtitle: {
    fontSize: 15,
    color: '#6B6F7B',
    lineHeight: 23,
    textAlign: 'center',
    letterSpacing: 0.1,
    maxWidth: W * 0.8,
  },

  notifFeatures: {
    gap: 8,
    marginBottom: 28,
  },
  notifFeatureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#13151B',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1E2028',
    gap: 14,
  },
  notifFeatureIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: 'rgba(212, 160, 23, 0.07)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(212, 160, 23, 0.12)',
  },
  notifFeatureTextWrap: {
    flex: 1,
  },
  notifFeatureTitle: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
    letterSpacing: 0.1,
    marginBottom: 3,
  },
  notifFeatureDesc: {
    color: '#555B67',
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0.1,
  },

  notifCtaArea: {
    gap: 0,
  },
  laterButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  laterText: {
    color: '#444854',
    fontSize: 14,
    fontWeight: '500',
  },

  // ── Subscription step ──
  subContent: {
    flex: 1,
    paddingHorizontal: 24,
  },
  subHero: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 20,
  },
  subCrownWrap: {
    marginBottom: 22,
  },
  subCrownCircle: {
    width: 64,
    height: 64,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#D4A017',
    shadowOpacity: 0.45,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 4 },
    elevation: 12,
  },
  subBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 100,
    backgroundColor: 'rgba(212, 160, 23, 0.08)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(212, 160, 23, 0.2)',
    marginBottom: 18,
  },
  subBadgeT: {
    color: '#D4A017',
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 2,
  },
  subTitle: {
    fontSize: 30,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.8,
    lineHeight: 38,
    textAlign: 'center',
    marginBottom: 10,
  },
  subTitleGold: {
    color: '#D4A017',
  },
  subSubtitle: {
    fontSize: 14,
    color: '#6B6F7B',
    lineHeight: 21,
    textAlign: 'center',
    letterSpacing: 0.1,
    maxWidth: W * 0.85,
  },
  subBenefits: {
    gap: 8,
    marginTop: 8,
  },
  subBenefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#13151B',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1E2028',
    gap: 12,
  },
  subBenefitIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(212, 160, 23, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(212, 160, 23, 0.15)',
  },
  subBenefitTitle: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13.5,
    letterSpacing: 0.1,
    marginBottom: 2,
  },
  subBenefitDesc: {
    color: '#555B67',
    fontSize: 12,
    lineHeight: 17,
    letterSpacing: 0.1,
  },
  subCtaArea: {
    paddingTop: 8,
  },
});