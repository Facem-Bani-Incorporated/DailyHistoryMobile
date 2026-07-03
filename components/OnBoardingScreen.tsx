// components/OnBoardingScreen.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';
import { LinearGradient } from 'expo-linear-gradient';
import * as Notifications from 'expo-notifications';
import {
  Bell,
  BookmarkCheck,
  Calendar,
  Check,
  ChevronRight,
  Crown,
  Globe,
  Layers3,
  Sparkles,
  Trophy,
} from 'lucide-react-native';

import {
  INTEREST_CATEGORIES,
  INTEREST_LABELS,
  INTEREST_UI,
  normalizeInterestLang,
} from '../config/interests';
import { useLanguage } from '../context/LanguageContext';
import { useRevenueCat } from '../context/RevenueCatContext';
import { usePreferencesStore } from '../store/usePreferencesStore';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../api';
import { ENDPOINTS } from '../config/api';

const { width: W } = Dimensions.get('window');

const GOLD = '#D4A017';
const GOLD_LIGHT = '#F3CB55';
const INK = '#0A0B0E';

type Step = 'language' | 'interests' | 'features' | 'notifications' | 'subscription';

// Language picker options (mirrors the profile modal).
const LANGUAGES: { code: 'en' | 'ro' | 'fr' | 'de' | 'es'; native: string; label: string; flag: string }[] = [
  { code: 'en', native: 'English', label: 'English', flag: 'EN' },
  { code: 'ro', native: 'Română', label: 'Romanian', flag: 'RO' },
  { code: 'fr', native: 'Français', label: 'French', flag: 'FR' },
  { code: 'de', native: 'Deutsch', label: 'German', flag: 'DE' },
  { code: 'es', native: 'Español', label: 'Spanish', flag: 'ES' },
];

// Localized copy for the language step (shown in whatever language is currently
// selected, so it updates live as the user taps).
const LANG_STEP_UI: Record<string, { title: string; subtitle: string; cta: string }> = {
  en: { title: 'Choose your language', subtitle: 'You can change this anytime in your profile.', cta: 'Continue' },
  ro: { title: 'Alege-ți limba', subtitle: 'O poți schimba oricând din profil.', cta: 'Continuă' },
  fr: { title: 'Choisissez votre langue', subtitle: 'Modifiable à tout moment dans votre profil.', cta: 'Continuer' },
  de: { title: 'Wähle deine Sprache', subtitle: 'Jederzeit im Profil änderbar.', cta: 'Weiter' },
  es: { title: 'Elige tu idioma', subtitle: 'Puedes cambiarlo cuando quieras en tu perfil.', cta: 'Continuar' },
};

interface Props {
  onComplete: () => void;
  /** Where to start. 'subscription' = returning account, show only the PRO upsell. */
  startStep?: Step;
}

const FEATURES = [
  {
    icon: Calendar,
    title: 'A fresh story every day',
    desc: 'New events from this exact day in history, waiting each morning.',
  },
  {
    icon: Layers3,
    title: 'Timeline & map',
    desc: 'Wander through the centuries, or see exactly where it all happened.',
  },
  {
    icon: BookmarkCheck,
    title: 'Save & test yourself',
    desc: 'Keep the moments you love and take quizzes to make them stick.',
  },
  {
    icon: Trophy,
    title: 'Climb the leaderboard',
    desc: 'Earn XP, build a streak, and rank against fellow history buffs.',
  },
  {
    icon: Sparkles,
    title: 'Brought to life by AI',
    desc: 'Every story enriched for richer detail and an effortless read.',
  },
];

// ── Step progress dots ────────────────────────────────────────────────────────
const Dots = ({ index }: { index: number }) => (
  <View style={ui.dots}>
    {[0, 1, 2].map((i) => (
      <View key={i} style={[ui.dot, i === index && ui.dotActive]} />
    ))}
  </View>
);

// ── Main component ────────────────────────────────────────────────────────────
export default function OnboardingScreen({ onComplete, startStep = 'features' }: Props) {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<Step>(startStep);
  const { isPro, presentPaywall } = useRevenueCat();
  const { language, setLanguage } = useLanguage();
  const completeInterestQuiz = usePreferencesStore(s => s.completeInterestQuiz);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const iLang = normalizeInterestLang(language);
  const toggleInterest = (key: string) =>
    setSelectedInterests(prev => (prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]));

  // Standalone PRO upsell (returning account). If they're already PRO there's
  // nothing to show — exit straight away (handles late RevenueCat hydration).
  const standalonePro = startStep === 'subscription';
  useEffect(() => {
    if (standalonePro && isPro) onComplete();
  }, [standalonePro, isPro]);

  // One shared enter animation, restarted per step.
  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    fade.setValue(0);
    slide.setValue(24);
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 480, useNativeDriver: true }),
      Animated.timing(slide, {
        toValue: 0,
        duration: 560,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [step]);

  const enterStyle = { opacity: fade, transform: [{ translateY: slide }] };

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

  // ── Background image for subscription step ──
  const [bgImageUri, setBgImageUri] = useState<string | null>(null);
  useEffect(() => {
    if (step !== 'subscription') return;
    api.get(ENDPOINTS.GUEST_CONTENT).then(res => {
      const data = res.data;
      const arr = data?.events
        ? data.events
        : Array.isArray(data)
        ? data
        : data && typeof data === 'object'
        ? [data]
        : [];
      const event = arr[0] ?? null;
      const uri = event?.gallery?.[0] ?? event?.imageUrl ?? null;
      if (uri) setBgImageUri(uri);
    }).catch(() => {});
  }, [step]);

  // ── Subscription handlers ──
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

  // ─────────────────────────────────────────────────────────────────────────────
  // FEATURES
  // ─────────────────────────────────────────────────────────────────────────────
  // ─────────────────────────────────────────────────────────────────────────────
  // LANGUAGE (new account) — pick preferred language, mirrors the profile picker
  // ─────────────────────────────────────────────────────────────────────────────
  if (step === 'language') {
    const L = LANG_STEP_UI[language] ?? LANG_STEP_UI.en;
    return (
      <View style={ui.screen}>
        <View style={ui.glow} pointerEvents="none" />
        <View style={[ui.pad, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }]}>
          <View style={ui.topBar}>
            <View style={ui.brand}>
              <LinearGradient colors={[GOLD_LIGHT, GOLD]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={ui.brandMark}>
                <Text style={ui.brandLetter}>D</Text>
              </LinearGradient>
              <Text style={ui.brandName}>DailyHistory</Text>
            </View>
          </View>
          <Animated.View style={[enterStyle, { flex: 1 }]}>
            <View style={ui.stepIconWrap}>
              <Globe color={GOLD} size={28} strokeWidth={2} />
            </View>
            <Text style={ui.stepTitle}>{L.title}</Text>
            <Text style={ui.stepSub}>{L.subtitle}</Text>
            <ScrollView showsVerticalScrollIndicator={false} style={{ marginTop: 6 }} contentContainerStyle={{ gap: 10, paddingBottom: 12 }}>
              {LANGUAGES.map((l) => {
                const active = language === l.code;
                return (
                  <TouchableOpacity
                    key={l.code}
                    activeOpacity={0.7}
                    onPress={() => setLanguage(l.code)}
                    style={[ui.langItem, { borderColor: active ? GOLD : 'rgba(255,255,255,0.08)', backgroundColor: active ? 'rgba(212,160,23,0.10)' : 'transparent' }]}
                  >
                    <View style={[ui.langFlag, { borderColor: active ? GOLD : 'rgba(255,255,255,0.14)' }]}>
                      <Text style={[ui.langFlagText, { color: active ? GOLD : '#9AA0AC' }]}>{l.flag}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[ui.langNative, { color: active ? GOLD : '#F4F4F5' }]}>{l.native}</Text>
                      <Text style={ui.langLabel}>{l.label}</Text>
                    </View>
                    {active && <Check color={GOLD} size={20} strokeWidth={2.6} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </Animated.View>
          <Animated.View style={[ui.ctaWrap, enterStyle]}>
            <PrimaryButton label={L.cta} onPress={() => setStep('interests')} trailingChevron />
          </Animated.View>
        </View>
      </View>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // INTERESTS (new account) — pick topics; the home feed ranks matches first
  // ─────────────────────────────────────────────────────────────────────────────
  if (step === 'interests') {
    const U = INTEREST_UI[iLang];
    const labels = INTEREST_LABELS[iLang];
    return (
      <View style={ui.screen}>
        <View style={ui.glow} pointerEvents="none" />
        <View style={[ui.pad, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }]}>
          <View style={ui.topBar}>
            <View style={ui.brand}>
              <LinearGradient colors={[GOLD_LIGHT, GOLD]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={ui.brandMark}>
                <Text style={ui.brandLetter}>D</Text>
              </LinearGradient>
              <Text style={ui.brandName}>DailyHistory</Text>
            </View>
          </View>
          <Animated.View style={[enterStyle, { flex: 1 }]}>
            <Text style={ui.stepTitle}>{U.title}</Text>
            <Text style={ui.stepSub}>{U.subtitle}</Text>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={ui.interestGrid}>
              {INTEREST_CATEGORIES.map(({ key, color, Icon }) => {
                const on = selectedInterests.includes(key);
                return (
                  <TouchableOpacity
                    key={key}
                    activeOpacity={0.8}
                    onPress={() => toggleInterest(key)}
                    style={[ui.interestChip, { borderColor: on ? color : 'rgba(255,255,255,0.10)', backgroundColor: on ? color + '1E' : 'rgba(255,255,255,0.03)' }]}
                  >
                    <Icon color={on ? color : '#9AA0AC'} size={20} strokeWidth={2.2} />
                    <Text style={[ui.interestLabel, { color: on ? '#F4F4F5' : '#C7CBD2' }]} numberOfLines={1}>
                      {labels[key] ?? key}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </Animated.View>
          <Animated.View style={[ui.ctaWrap, enterStyle]}>
            <PrimaryButton label={U.cta} onPress={() => { completeInterestQuiz(selectedInterests); setStep('features'); }} trailingChevron />
            <TouchableOpacity onPress={() => { completeInterestQuiz([]); setStep('features'); }} style={ui.skipBtn} hitSlop={8}>
              <Text style={ui.interestSkipText}>{U.skip}</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </View>
    );
  }

  if (step === 'features') {
    return (
      <View style={ui.screen}>
        <View style={ui.glow} pointerEvents="none" />
        <ScrollView
          contentContainerStyle={[
            ui.featuresScroll,
            { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 },
          ]}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Top bar */}
          <View style={ui.topBar}>
            <View style={ui.brand}>
              <LinearGradient
                colors={[GOLD_LIGHT, GOLD]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={ui.brandMark}
              >
                <Text style={ui.brandLetter}>D</Text>
              </LinearGradient>
              <Text style={ui.brandName}>DailyHistory</Text>
            </View>
            <Dots index={0} />
          </View>

          <Animated.View style={enterStyle}>
            {/* Headline */}
            <View style={ui.headline}>
              <Text style={ui.h1}>
                Every day has a{'\n'}story worth{' '}
                <Text style={ui.h1Gold}>telling.</Text>
              </Text>
              <Text style={ui.lede}>And we'll bring you the best of them — here's what's inside.</Text>
            </View>

            {/* Feature list — airy, borderless, hairline dividers */}
            <View style={ui.list}>
              {FEATURES.map((f, i) => {
                const Icon = f.icon;
                return (
                  <View key={i}>
                    <View style={ui.row}>
                      <View style={ui.rowIcon}>
                        <Icon color={GOLD} size={20} strokeWidth={2} />
                      </View>
                      <View style={ui.rowText}>
                        <Text style={ui.rowTitle}>{f.title}</Text>
                        <Text style={ui.rowDesc}>{f.desc}</Text>
                      </View>
                    </View>
                    {i < FEATURES.length - 1 && <View style={ui.divider} />}
                  </View>
                );
              })}
            </View>
          </Animated.View>

          {/* CTA */}
          <Animated.View style={[ui.ctaWrap, enterStyle]}>
            <PrimaryButton label="Continue" onPress={() => setStep('notifications')} trailingChevron />
          </Animated.View>
        </ScrollView>
      </View>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // NOTIFICATIONS
  // ─────────────────────────────────────────────────────────────────────────────
  if (step === 'notifications') {
    return (
      <View style={ui.screen}>
        <View style={ui.glow} pointerEvents="none" />
        <View style={[ui.pad, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }]}>
          {/* Top bar */}
          <View style={ui.topBar}>
            <Dots index={1} />
            <TouchableOpacity
              onPress={handleSkipNotifs}
              style={ui.skip}
              activeOpacity={0.6}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Text style={ui.skipText}>Skip</Text>
            </TouchableOpacity>
          </View>

          <Animated.View style={[ui.notifBody, enterStyle]}>
            {/* Hero icon */}
            <View style={ui.notifIconWrap}>
              <View style={ui.notifIconGlow} />
              <LinearGradient
                colors={[GOLD_LIGHT, GOLD]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={ui.notifIcon}
              >
                <Bell color={INK} size={30} strokeWidth={2.2} />
              </LinearGradient>
            </View>

            <Text style={ui.notifH1}>
              Wake up to{'\n'}
              <Text style={ui.h1Gold}>history.</Text>
            </Text>
            <Text style={ui.notifLede}>
              One story each morning — the one worth knowing. No spam, no noise.
            </Text>

            {/* Realistic push preview */}
            <View style={ui.preview}>
              <LinearGradient
                colors={[GOLD_LIGHT, GOLD]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={ui.previewIcon}
              >
                <Text style={ui.previewIconLetter}>D</Text>
              </LinearGradient>
              <View style={ui.previewBody}>
                <View style={ui.previewTop}>
                  <Text style={ui.previewApp}>DailyHistory</Text>
                  <Text style={ui.previewTime}>9:00 AM</Text>
                </View>
                <Text style={ui.previewTitle}>On this day · 1969</Text>
                <Text style={ui.previewMsg} numberOfLines={2}>
                  Apollo 11 lands on the Moon — humanity's first steps on another world.
                </Text>
              </View>
            </View>
          </Animated.View>

          {/* CTA */}
          <Animated.View style={enterStyle}>
            <PrimaryButton label="Turn on notifications" onPress={handleEnableNotifs} leadingIcon={Bell} />
            <TouchableOpacity onPress={handleSkipNotifs} activeOpacity={0.6} style={ui.ghostBtn}>
              <Text style={ui.ghostText}>Not now</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </View>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SUBSCRIPTION — minimalist image paywall
  // ─────────────────────────────────────────────────────────────────────────────
  const benefits = [
    'Every story, every day — fully unlocked',
    'All topics: science, art, war, culture & more',
    'No ads getting in the way',
    'First to try every new feature',
  ];

  return (
    <View style={ui.screen}>
      {/* Photo */}
      {bgImageUri ? (
        <Image source={{ uri: bgImageUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      ) : (
        <LinearGradient colors={['#1C1608', INK]} locations={[0, 1]} style={StyleSheet.absoluteFill} />
      )}

      {/* Readability fade anchored to the bottom */}
      <LinearGradient
        colors={['rgba(10,11,14,0.10)', 'rgba(10,11,14,0.72)', 'rgba(10,11,14,0.99)']}
        locations={[0, 0.4, 0.76]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <Animated.View
        style={[
          ui.pad,
          { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20, flex: 1 },
          { opacity: fade },
        ]}
      >
        {/* Top bar */}
        <View style={ui.topBar}>
          {standalonePro ? <View /> : <Dots index={2} />}
          <TouchableOpacity
            onPress={handleSkipPro}
            style={ui.skipOnPhoto}
            activeOpacity={0.6}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={ui.skipText}>Skip</Text>
          </TouchableOpacity>
        </View>

        {/* Bottom-anchored content */}
        <Animated.View style={[ui.proBottom, { transform: [{ translateY: slide }] }]}>
          <View style={ui.proTag}>
            <Crown color={GOLD} size={14} strokeWidth={2.4} />
            <Text style={ui.proTagText}>DAILY HISTORY PRO</Text>
          </View>

          <Text style={ui.proH1}>
            Go beyond{'\n'}the <Text style={ui.h1Gold}>headlines.</Text>
          </Text>
          <Text style={ui.proLede}>
            Pro opens up every story and every topic — no limits, no ads, just history.
          </Text>

          <View style={ui.proList}>
            {benefits.map((b, i) => (
              <View key={i} style={ui.proRow}>
                <View style={ui.proCheck}>
                  <Check color={INK} size={12} strokeWidth={3} />
                </View>
                <Text style={ui.proRowText}>{b}</Text>
              </View>
            ))}
          </View>

          <PrimaryButton
            label="Start Daily History Pro"
            onPress={handleUnlockPro}
            loading={paywallLoading}
          />
          <Text style={ui.reassure}>Cancel anytime · No commitment</Text>
          <TouchableOpacity onPress={handleSkipPro} activeOpacity={0.6} style={ui.ghostBtn}>
            <Text style={ui.ghostTextDim}>Maybe later</Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

// ── Shared primary button ─────────────────────────────────────────────────────
function PrimaryButton({
  label,
  onPress,
  loading,
  leadingIcon: Leading,
  trailingChevron,
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  leadingIcon?: typeof Bell;
  trailingChevron?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      style={({ pressed }) => [ui.cta, pressed && { opacity: 0.9, transform: [{ scale: 0.99 }] }, loading && { opacity: 0.7 }]}
    >
      <LinearGradient
        colors={[GOLD_LIGHT, GOLD]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {loading ? (
        <ActivityIndicator color={INK} size="small" />
      ) : (
        <>
          {Leading && <Leading color={INK} size={18} strokeWidth={2.4} style={{ marginRight: 8 }} />}
          <Text style={ui.ctaText}>{label}</Text>
          {trailingChevron && <ChevronRight color={INK} size={18} strokeWidth={2.6} style={{ marginLeft: 4 }} />}
        </>
      )}
    </Pressable>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const ui = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: INK,
  },
  glow: {
    position: 'absolute',
    top: -120,
    alignSelf: 'center',
    width: W * 1.1,
    height: W * 1.1,
    borderRadius: W,
    backgroundColor: GOLD,
    opacity: 0.06,
  },
  pad: {
    flex: 1,
    paddingHorizontal: 26,
  },
  featuresScroll: {
    paddingHorizontal: 26,
    flexGrow: 1,
  },

  // Top bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  brandMark: {
    width: 28,
    height: 28,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandLetter: {
    fontSize: 15,
    fontWeight: '800',
    color: INK,
    letterSpacing: -0.5,
  },
  brandName: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.55)',
    letterSpacing: 0.1,
  },

  // Progress dots
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  dotActive: {
    width: 20,
    backgroundColor: GOLD,
  },

  // Skip
  skip: {
    paddingVertical: 7,
    paddingHorizontal: 15,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  skipOnPhoto: {
    paddingVertical: 7,
    paddingHorizontal: 15,
    borderRadius: 100,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  skipText: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
  },

  // Headline
  headline: {
    marginBottom: 12,
  },
  h1: {
    fontSize: 33,
    fontWeight: '800',
    color: '#FAFAFA',
    letterSpacing: -1,
    lineHeight: 40,
    marginBottom: 12,
  },
  h1Gold: {
    color: GOLD,
  },
  lede: {
    fontSize: 15.5,
    color: '#8A8F9C',
    lineHeight: 23,
    letterSpacing: 0.1,
    maxWidth: W * 0.82,
  },

  // Feature list
  list: {
    marginTop: 18,
    marginBottom: 24,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    gap: 16,
  },
  rowIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(212,160,23,0.10)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(212,160,23,0.20)',
  },
  rowText: {
    flex: 1,
  },
  rowTitle: {
    color: '#F4F4F5',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.1,
    marginBottom: 3,
  },
  rowDesc: {
    color: '#7C8290',
    fontSize: 13.5,
    lineHeight: 19,
    letterSpacing: 0.1,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.07)',
    marginLeft: 62,
  },

  // Language & interests steps (new account)
  stepIconWrap: {
    width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(212,160,23,0.10)', borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(212,160,23,0.22)', marginBottom: 18,
  },
  stepTitle: { color: '#F4F4F5', fontSize: 26, fontWeight: '800', letterSpacing: 0.2, marginBottom: 8 },
  stepSub: { color: '#7C8290', fontSize: 14.5, lineHeight: 20, marginBottom: 18 },
  langItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 13, borderRadius: 14, borderWidth: 1.5 },
  langFlag: { width: 40, height: 26, borderRadius: 7, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  langFlagText: { fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },
  langNative: { fontSize: 15.5, fontWeight: '700' },
  langLabel: { color: '#7C8290', fontSize: 12.5, marginTop: 1 },
  interestGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingBottom: 12, justifyContent: 'center' },
  interestChip: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 15, paddingVertical: 13, borderRadius: 14, borderWidth: 1.5 },
  interestLabel: { fontSize: 14.5, fontWeight: '700' },
  skipBtn: { alignItems: 'center', marginTop: 12 },
  interestSkipText: { color: '#7C8290', fontSize: 14, fontWeight: '600' },

  // CTA shared
  ctaWrap: {
    marginTop: 'auto',
    paddingTop: 8,
  },
  cta: {
    height: 56,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: GOLD,
    shadowOpacity: 0.28,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  ctaText: {
    color: INK,
    fontWeight: '800',
    fontSize: 16,
    letterSpacing: 0.2,
  },
  ghostBtn: {
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 2,
  },
  ghostText: {
    color: '#5C616D',
    fontSize: 14.5,
    fontWeight: '600',
  },
  ghostTextDim: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14.5,
    fontWeight: '600',
  },

  // Notifications
  notifBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifIconWrap: {
    width: 96,
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
  },
  notifIconGlow: {
    position: 'absolute',
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: GOLD,
    opacity: 0.16,
  },
  notifIcon: {
    width: 68,
    height: 68,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: GOLD,
    shadowOpacity: 0.4,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 6 },
    elevation: 12,
  },
  notifH1: {
    fontSize: 33,
    fontWeight: '800',
    color: '#FAFAFA',
    letterSpacing: -1,
    lineHeight: 40,
    textAlign: 'center',
    marginBottom: 12,
  },
  notifLede: {
    fontSize: 15.5,
    color: '#8A8F9C',
    lineHeight: 23,
    textAlign: 'center',
    letterSpacing: 0.1,
    maxWidth: W * 0.8,
    marginBottom: 34,
  },

  // Push preview card
  preview: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    padding: 14,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.045)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.09)',
  },
  previewIcon: {
    width: 40,
    height: 40,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewIconLetter: {
    fontSize: 19,
    fontWeight: '800',
    color: INK,
    letterSpacing: -0.5,
  },
  previewBody: {
    flex: 1,
  },
  previewTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  previewApp: {
    color: '#F4F4F5',
    fontSize: 13.5,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  previewTime: {
    color: '#6B7080',
    fontSize: 12,
    fontWeight: '500',
  },
  previewTitle: {
    color: GOLD,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  previewMsg: {
    color: '#A6ABB6',
    fontSize: 13.5,
    lineHeight: 19,
  },

  // Subscription
  proBottom: {
    marginTop: 'auto',
  },
  proTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 14,
  },
  proTagText: {
    color: GOLD,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2.4,
  },
  proH1: {
    fontSize: 34,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -1,
    lineHeight: 40,
    marginBottom: 12,
    ...Platform.select({
      ios: { textShadowColor: 'rgba(0,0,0,0.45)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 12 },
    }),
  },
  proLede: {
    fontSize: 15.5,
    color: 'rgba(255,255,255,0.72)',
    lineHeight: 23,
    letterSpacing: 0.1,
    marginBottom: 26,
    maxWidth: W * 0.92,
  },
  proList: {
    gap: 14,
    marginBottom: 30,
  },
  proRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  proCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
  },
  proRowText: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '500',
    letterSpacing: 0.1,
  },
  reassure: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 12.5,
    fontWeight: '500',
    textAlign: 'center',
    letterSpacing: 0.2,
    marginTop: 12,
  },
});
