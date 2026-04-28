// app/(tabs)/index.tsx
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Award, Search, Trophy } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  FlatList,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewToken,
} from 'react-native';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import api from '../../api';
import AchievementsModal from '../../components/AchievementsModal';
import AchievementToast from '../../components/AchievementToast';
import AdCard from '../../components/AdCard';
import CalendarModal from '../../components/CalendarModal';
import { DiscoverSection } from '../../components/DiscoverSection';
import { HistoryCard } from '../../components/HistoryCard';
import LeaderboardModal from '../../components/LeaderboardModal';
import LockedTomorrowCard from '../../components/LockedTomorrowCard';
import MapScreen from '../../components/MapScreen';
import ProfileAvatar from '../../components/ProfileAvatar';
import SearchScreen from '../../components/SearchScreen';
import { StoryModal } from '../../components/StoryModal';
import StreakIcon from '../../components/StreakIcon';
import type { Tab } from '../../components/TabBar';
import TabBar from '../../components/TabBar';
import TimelineScreen from '../../components/TimelineScreen';
import WeeklyRecapModal from '../../components/WeeklyRecapModal';
import { AD_UNIT_IDS } from '../../config/ads';
import { AllEventsProvider } from '../../context/AllEventsContext';
import { useLanguage } from '../../context/LanguageContext';
import { useRevenueCat } from '../../context/RevenueCatContext';
import { useTheme } from '../../context/ThemeContext';
import { useInterstitialAd } from '../../hooks/useInterstitialAd';
import { useRewardedUnlock } from '../../hooks/useRewardedUnlock';
import { useAuthStore } from '../../store/useAuthStore';
import { useGamificationStore } from '../../store/useGamificationStore';
import { useNotificationEventStore } from '../../store/useNotificationEventStore';
import { useUserSavedEvents } from '../../store/useSavedStore';
import { haptic } from '../../utils/haptics';
import { schedulePersonalizedNotification } from '../../utils/Notifications';
import SavedScreen from './saved';

const { width: W, height: H } = Dimensions.get('window');
const CARD_H = H * 0.55;
const CACHE_TTL = 30 * 60 * 1000;
const MAX_FWD = 1;
const PAST_DAYS = 200;
const TODAY_INDEX = PAST_DAYS;
const AD_FREQUENCY = 3;
const STORY_AD_FREQUENCY = 3;

// Show banner only on these tabs
const SHOW_BANNER_TABS: Tab[] = ['today', 'discover', 'timeline', 'saved'];

// ── Helpers ──
const offDate = (n: number) => { const d = new Date(); d.setDate(d.getDate() + n); return d; };
const toISO = (d: Date) => d.toISOString().split('T')[0];
const isoFor = (n: number) => toISO(offDate(n));
const todayISO = () => new Date().toISOString().split('T')[0];
const labelFor = (off: number, lang: string) => {
  const loc = ({ ro: 'ro-RO', en: 'en-US', fr: 'fr-FR', de: 'de-DE', es: 'es-ES' } as Record<string, string>)[lang] || 'en-US';
  const d = offDate(off);
  return {
    day: d.getDate().toString().padStart(2, '0'),
    fullDay: d.toLocaleString(loc, { weekday: 'long' }),
    monthLong: d.toLocaleString(loc, { month: 'long' }),
    dayNum: d.getDate(), yearNum: d.getFullYear(),
    isToday: off === 0, isTomorrow: off === 1,
  };
};
const d2o = (date: Date) => {
  const t = new Date(); t.setHours(0, 0, 0, 0);
  const d = new Date(date); d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - t.getTime()) / 86400000);
};

type Tier = 'free' | 'pro';
interface PD { data: any[]; empty: boolean }
const EMPTY: PD = { data: [], empty: true };
const ck = (iso: string, tier: Tier = 'free') => tier === 'pro' ? `dh_v2_pro_${iso}` : `dh_v2_${iso}`;
const mk = (tier: Tier, iso: string) => `${tier}_${iso}`;
const rC = async (iso: string, tier: Tier = 'free') => {
  try {
    const r = await AsyncStorage.getItem(ck(iso, tier)); if (!r) return null;
    const e = JSON.parse(r);
    return Date.now() - e.ts > CACHE_TTL ? null : e as { ts: number; data: any[]; empty: boolean };
  } catch { return null; }
};
const wC = async (iso: string, tier: Tier, d: any[], e: boolean) => {
  try { await AsyncStorage.setItem(ck(iso, tier), JSON.stringify({ ts: Date.now(), data: d, empty: e })); } catch { }
};

const DAY_OFFSETS = Array.from({ length: PAST_DAYS + 1 + MAX_FWD }, (_, i) => i - PAST_DAYS);

// ═════════════════════════════════════════════════════════════════════════════
// EMPTY DAY
// ═════════════════════════════════════════════════════════════════════════════
const EmptyDay = ({ isToday, theme, t }: { isToday: boolean; theme: any; t: (k: string) => string }) => (
  <View style={ey.w}>
    <View style={[ey.r, { borderColor: theme.gold + '20' }]}>
      <Text style={[ey.i, { color: theme.gold }]}>{isToday ? '~' : '\u2014'}</Text>
    </View>
    <Text style={[ey.t, { color: theme.text }]}>{isToday ? t('today') : t('no_content')}</Text>
    <Text style={[ey.d, { color: theme.subtext }]}>{isToday ? t('empty_today_desc') : t('empty_day_desc')}</Text>
  </View>
);
const ey = StyleSheet.create({
  w: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 40 },
  r: { width: 64, height: 64, borderRadius: 32, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  i: { fontSize: 24, fontWeight: '300' },
  t: { fontSize: 18, fontWeight: '700', letterSpacing: 0.2 },
  d: { fontSize: 13, textAlign: 'center', lineHeight: 20, opacity: 0.7 },
});

// ═════════════════════════════════════════════════════════════════════════════
// PREMIUM ACCENT LINE
// ═════════════════════════════════════════════════════════════════════════════
const PremiumAccentLine = () => {
  const shimmer = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.timing(shimmer, { toValue: 1, duration: 3000, easing: Easing.inOut(Easing.sin), useNativeDriver: true })
    ).start();
  }, []);
  const op = shimmer.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.2, 0.6, 0.2] });
  return (
    <Animated.View style={{ height: 1, marginHorizontal: 20, marginBottom: 2, backgroundColor: '#D4A843', opacity: op, borderRadius: 1 }} />
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// PRO PEEK HINT — Placed BETWEEN the free card and the PRO card.
// Big animated downward arrow with a golden glow trail. The arrow bobs up-down
// gently while 3 accent rings pulse outward from behind it. This is the
// "hey, there's a PRO event below!" moment. Symmetric and impossible to miss.
// ═════════════════════════════════════════════════════════════════════════════
const ProPeekHint = ({ gold, onPress }: { gold: string; onPress: () => void }) => {
  const bob = useRef(new Animated.Value(0)).current;
  const ring1 = useRef(new Animated.Value(0)).current;
  const ring2 = useRef(new Animated.Value(0)).current;
  const ring3 = useRef(new Animated.Value(0)).current;
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Arrow bobs up and down continuously
    Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    ).start();

    // Three rings pulse outward — staggered so one is always expanding
    const pulse = (val: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(val, { toValue: 1, duration: 2100, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.timing(val, { toValue: 0, duration: 0, useNativeDriver: true }),
        ]),
      );
    pulse(ring1, 0).start();
    pulse(ring2, 700).start();
    pulse(ring3, 1400).start();

    // Soft shimmer for the gold accent lines
    Animated.loop(
      Animated.timing(shimmer, { toValue: 1, duration: 2400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ).start();
  }, []);

  const arrowY = bob.interpolate({ inputRange: [0, 1], outputRange: [-4, 8] });
  const arrowScale = bob.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.08, 1] });
  const lineOp = shimmer.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.25, 0.75, 0.25] });

  const ringStyle = (val: Animated.Value) => ({
    transform: [{
      scale: val.interpolate({ inputRange: [0, 1], outputRange: [0.4, 2.2] }),
    }],
    opacity: val.interpolate({ inputRange: [0, 0.1, 1], outputRange: [0, 0.55, 0] }),
  });

  return (
    <TouchableOpacity activeOpacity={0.8} onPress={onPress} style={_peek.wrap}>
      {/* Left shimmering gold line */}
      <Animated.View style={[_peek.sideLine, { backgroundColor: gold, opacity: lineOp }]} />

      {/* Center arrow area with expanding rings */}
      <View style={_peek.centerBox}>
        {/* Pulsing concentric rings */}
        <Animated.View style={[_peek.ring, { borderColor: gold }, ringStyle(ring1)]} />
        <Animated.View style={[_peek.ring, { borderColor: gold }, ringStyle(ring2)]} />
        <Animated.View style={[_peek.ring, { borderColor: gold }, ringStyle(ring3)]} />

        {/* Static gold-glow disc behind arrow */}
        <View style={[_peek.disc, { backgroundColor: gold + '18', borderColor: gold + '40' }]} />

        {/* Bobbing arrow */}
        <Animated.View style={[_peek.arrow, {
          transform: [{ translateY: arrowY }, { scale: arrowScale }],
        }]}>
          <Ionicons name="chevron-down" size={28} color={gold} />
        </Animated.View>
      </View>

      {/* Right shimmering gold line */}
      <Animated.View style={[_peek.sideLine, { backgroundColor: gold, opacity: lineOp }]} />
    </TouchableOpacity>
  );
};

const _peek = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    paddingHorizontal: 24,
    paddingVertical: 18,
    height: 80,
  },
  sideLine: {
    flex: 1,
    height: 1,
    borderRadius: 0.5,
    maxWidth: 80,
  },
  centerBox: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
  },
  disc: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
  },
  arrow: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

// ═════════════════════════════════════════════════════════════════════════════
// PRO CARD SECTION — Magazine-style editorial PRO card
// Same height as the free card above for perfect symmetry
// For non-pro users: an editorial unlock overlay with serif hairline design
// ═════════════════════════════════════════════════════════════════════════════
const PRO_CARD_H = H * 0.65;
const SERIF_FONT = Platform.OS === 'ios' ? 'Georgia' : 'serif';

const ProCardSection = ({ event, allEvents, gold, isPro, onPaywall }: {
  event: any; allEvents: any[]; gold: string; isPro: boolean; onPaywall: () => void;
}) => {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isPro) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(shimmer, { toValue: 1, duration: 2400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(shimmer, { toValue: 0, duration: 2600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
      ).start();
    }
  }, [isPro]);

  const ruleOp = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.85] });

  return (
    <View style={[_proSec.cardWrap, { height: PRO_CARD_H }]}>
      <HistoryCard event={event} allEvents={allEvents} />
      {!isPro && (
        <TouchableOpacity activeOpacity={0.92} onPress={onPaywall}
          style={[StyleSheet.absoluteFill, _proSec.locked]}>
          <LinearGradient
            colors={['rgba(5,4,10,0.55)', 'rgba(5,4,10,0.92)', 'rgba(5,4,10,0.98)']}
            locations={[0, 0.5, 1]}
            style={StyleSheet.absoluteFill}
          />

          {/* Editorial hairline frame */}
          <View style={[_proSec.frame, { borderColor: gold + '30' }]} pointerEvents="none" />

          {/* Kicker row */}
          <View style={_proSec.kickerRow}>
            <Animated.View style={[_proSec.kickerRule, { backgroundColor: gold, opacity: ruleOp }]} />
            <Text style={[_proSec.kicker, { color: gold }]}>✦  PRO EDITION</Text>
            <Animated.View style={[_proSec.kickerRule, { backgroundColor: gold, opacity: ruleOp }]} />
          </View>

          {/* Serif headline */}
          <Text style={[_proSec.headline, { color: '#F5ECD7' }]}>The Archive</Text>
          <Text style={[_proSec.subhead, { color: gold }]}>—  Unlocked  —</Text>

          {/* Description */}
          <Text style={_proSec.desc}>
            Exclusive editorial stories, curated daily for the history devoted.
          </Text>

          {/* CTA */}
          <View style={[_proSec.cta, { borderColor: gold, backgroundColor: gold + '12' }]}>
            <Ionicons name="lock-open" size={14} color={gold} />
            <Text style={[_proSec.ctaT, { color: gold }]}>UNLOCK THE ARCHIVE</Text>
            <Ionicons name="arrow-forward" size={14} color={gold} />
          </View>

          {/* Footer meta */}
          <Text style={_proSec.footer}>CURATED · HISTORICAL · EDITORIAL</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const _proSec = StyleSheet.create({
  cardWrap: { position: 'relative' },
  locked: {
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    overflow: 'hidden',
  },
  frame: {
    position: 'absolute',
    top: 18, left: 18, right: 18, bottom: 18,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
  },
  kickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 22,
  },
  kickerRule: { width: 26, height: 1, borderRadius: 0.5 },
  kicker: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 3.2,
  },
  headline: {
    fontSize: 44,
    fontWeight: '800',
    letterSpacing: -0.8,
    fontFamily: SERIF_FONT,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  subhead: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 3,
    marginTop: 6,
    marginBottom: 18,
    textTransform: 'uppercase',
  },
  desc: {
    color: 'rgba(245,236,215,0.65)',
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    fontStyle: 'italic',
    fontFamily: SERIF_FONT,
    maxWidth: 280,
    marginBottom: 28,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 2,
    borderWidth: 1,
  },
  ctaT: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 2.2,
  },
  footer: {
    position: 'absolute',
    bottom: 34,
    color: 'rgba(245,236,215,0.32)',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 3,
  },
});


// ═════════════════════════════════════════════════════════════════════════════
// PRO STAR BUTTON — Compact gold star button for the header.
// Replaces the wide "GET PRO" button. Just a star icon with subtle pulse
// animation to draw attention without taking horizontal space.
// ═════════════════════════════════════════════════════════════════════════════
const ProStarButton = ({ gold, onPress }: { gold: string; onPress: () => void }) => {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    ).start();
  }, []);

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] });
  const glow = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.7] });

  return (
    <TouchableOpacity activeOpacity={0.7} onPress={onPress} style={_proStar.btn}>
      {/* Glow backdrop */}
      <Animated.View style={[_proStar.glow, {
        backgroundColor: gold + '25',
        opacity: glow,
        transform: [{ scale }],
      }]} />
      {/* Star icon */}
      <Ionicons name="star" size={19} color={gold} />
    </TouchableOpacity>
  );
};

const _proStar = StyleSheet.create({
  btn: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    width: 34,
    height: 34,
    borderRadius: 17,
  },
});

// ═════════════════════════════════════════════════════════════════════════════
// PROFILE WITH XP — Ring around avatar + level badge corner
// ═════════════════════════════════════════════════════════════════════════════
const AVATAR_SLOT = 38;
const RING_STROKE = 2;
const RING_R = (AVATAR_SLOT - RING_STROKE) / 2;
const RING_C = 2 * Math.PI * RING_R;

const ProfileWithXP = ({ gold, theme, isDark }: { gold: string; theme: any; isDark: boolean }) => {
  const level = useGamificationStore((s: any) => s.level ?? 1);
  const xp    = useGamificationStore((s: any) => s.xp ?? s.totalXP ?? 0);
  const fillAnim = useRef(new Animated.Value(0)).current;

  const progress = useMemo(() => {
    const curBase = (level - 1) * 100;
    const nextBase = level * 100;
    const span = Math.max(1, nextBase - curBase);
    return Math.min(1, Math.max(0, (xp - curBase) / span));
  }, [level, xp]);

  useEffect(() => {
    Animated.timing(fillAnim, {
      toValue: progress, duration: 900,
      easing: Easing.out(Easing.cubic), useNativeDriver: false,
    }).start();
  }, [progress]);

  const dashOffset = fillAnim.interpolate({
    inputRange: [0, 1], outputRange: [RING_C, 0],
  });

  const AnimatedCircle = Animated.createAnimatedComponent(Circle);

  return (
    <View style={pwx.wrap}>
      <View style={pwx.avatarArea}>
        <Svg width={AVATAR_SLOT} height={AVATAR_SLOT} style={StyleSheet.absoluteFill}>
          <Circle cx={AVATAR_SLOT / 2} cy={AVATAR_SLOT / 2} r={RING_R}
            stroke={gold + '25'} strokeWidth={RING_STROKE} fill="none" />
          <AnimatedCircle cx={AVATAR_SLOT / 2} cy={AVATAR_SLOT / 2} r={RING_R}
            stroke={gold} strokeWidth={RING_STROKE} fill="none"
            strokeDasharray={RING_C} strokeDashoffset={dashOffset}
            strokeLinecap="round" rotation="-90"
            origin={`${AVATAR_SLOT / 2}, ${AVATAR_SLOT / 2}`} />
        </Svg>
        <View style={pwx.avatarHolder}><ProfileAvatar /></View>
      </View>
      <Text style={[pwx.levelText, { color: gold }]} numberOfLines={1}>
        LVL {level}
      </Text>
    </View>
  );
};

const pwx = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  avatarArea: { width: AVATAR_SLOT, height: AVATAR_SLOT, alignItems: 'center', justifyContent: 'center' },
  avatarHolder: { width: AVATAR_SLOT - 8, height: AVATAR_SLOT - 8, alignItems: 'center', justifyContent: 'center' },
  levelText: {
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1.2,
    marginTop: 3,
  },
});

// ═════════════════════════════════════════════════════════════════════════════
// PAGE WRAPPER — animated card that reacts to scroll position
// ═════════════════════════════════════════════════════════════════════════════
const AnimatedPage = ({
  dayOff, scrollX, children,
}: { dayOff: number; scrollX: Animated.Value; children: React.ReactNode }) => {
  const idx = dayOff + PAST_DAYS;
  const inputRange = [(idx - 1) * W, idx * W, (idx + 1) * W];

  const scale = scrollX.interpolate({ inputRange, outputRange: [0.92, 1, 0.92], extrapolate: 'clamp' });
  const opacity = scrollX.interpolate({ inputRange, outputRange: [0.4, 1, 0.4], extrapolate: 'clamp' });
  const translateY = scrollX.interpolate({ inputRange, outputRange: [14, 0, 14], extrapolate: 'clamp' });

  return (
    <Animated.View style={{
      width: W, paddingHorizontal: 16, paddingTop: 12, flex: 1,
      transform: [{ scale }, { translateY }], opacity,
    }}>
      {children}
    </Animated.View>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// LOCKED PRO OVERLAY — shown on top of pro cards for non-pro users
// ═════════════════════════════════════════════════════════════════════════════
const LockedProOverlay = ({ gold, onPress }: { gold: string; onPress: () => void }) => (
  <TouchableOpacity activeOpacity={0.9} onPress={onPress}
    style={[StyleSheet.absoluteFill, _lo.wrap]}>
    <View style={[_lo.badge, { backgroundColor: gold + '20', borderColor: gold + '50' }]}>
      <Ionicons name="lock-closed" size={22} color={gold} />
    </View>
    <Text style={[_lo.text, { color: gold }]}>UNLOCK PRO</Text>
  </TouchableOpacity>
);
const _lo = StyleSheet.create({
  wrap: { backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 30, alignItems: 'center', justifyContent: 'center', gap: 10, zIndex: 10 },
  badge: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  text: { fontWeight: '900', fontSize: 11, letterSpacing: 2 },
});

// ═════════════════════════════════════════════════════════════════════════════
// MAIN SCREEN
// ═════════════════════════════════════════════════════════════════════════════
export default function HomeScreen() {
  const { theme, isDark, isPremium } = useTheme();
  const { t, language } = useLanguage();
  const { isPro, presentPaywall, presentPaywallIfNeeded } = useRevenueCat();
  const insets = useSafeAreaInsets();
  const userSaved = useUserSavedEvents();
  const recordVisit = useGamificationStore(s => s.recordDailyVisit);
  const genRecap = useGamificationStore(s => s.generateWeeklyRecap);
  const getRecap = useGamificationStore(s => s.getUnseenRecap);
  const newAch = useGamificationStore(s => s.newAchievements);
  const totalEventsRead = useGamificationStore(s => s.totalEventsRead);

  const { maybeShowInterstitial } = useInterstitialAd();
  const { showForUnlock, isUnlockReady } = useRewardedUnlock();

  const [tomorrowMainUnlocked, setTomorrowMainUnlocked] = useState(false);
  const [tomorrowDiscoverUnlocked, setTomorrowDiscoverUnlocked] = useState(false);
  const [unlockDate, setUnlockDate] = useState(todayISO());
  const [bannerLoaded, setBannerLoaded] = useState(false);
  const [bannerError, setBannerError] = useState(false);

  useEffect(() => {
    const today = todayISO();
    if (unlockDate !== today) {
      setTomorrowMainUnlocked(false);
      setTomorrowDiscoverUnlocked(false);
      setUnlockDate(today);
    }
  });

  const handleUnlockMain = useCallback(() => {
    showForUnlock(() => { haptic('success'); setTomorrowMainUnlocked(true); });
  }, [showForUnlock]);
  const handleUnlockDiscover = useCallback(() => {
    showForUnlock(() => { haptic('success'); setTomorrowDiscoverUnlocked(true); });
  }, [showForUnlock]);

  const [achVis, setAchVis] = useState(false);
  const [leadVis, setLeadVis] = useState(false);
  const [recapVis, setRecapVis] = useState(false);
  const [calVis, setCalVis] = useState(false);
  const [off, setOff] = useState(0);
  const [allEvents, setAllEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('today');
  const user = useAuthStore(s => s.user);
  const [seenSaved, setSeenSaved] = useState(userSaved.length);
  useEffect(() => { setSeenSaved(userSaved.length); }, [user?.id]);
  const unseenSaved = tab === 'saved' ? 0 : Math.max(0, userSaved.length - seenSaved);

  // Notification deep-link
  const pendingEvent = useNotificationEventStore(s => s.pendingEvent);
  const clearPendingEvent = useNotificationEventStore(s => s.clearPendingEvent);
  const [notifEvent, setNotifEvent] = useState<any>(null);
  useEffect(() => {
    if (pendingEvent) { setNotifEvent(pendingEvent); clearPendingEvent(); }
  }, [pendingEvent]);

  // Ad trigger: every 3 stories read (skip for pro)
  const prevEventsRead = useRef(totalEventsRead);
  useEffect(() => {
    if (!isPro && totalEventsRead > prevEventsRead.current) {
      if (totalEventsRead % STORY_AD_FREQUENCY === 0) {
        maybeShowInterstitial(totalEventsRead);
      }
    }
    prevEventsRead.current = totalEventsRead;
  }, [totalEventsRead, isPro]);

  // ── Data loading ──
  const mem = useRef<Record<string, PD>>({});
  const [tick, setTick] = useState(0);

  const fetchOne = useCallback(async (o: number, tierArg: Tier = 'free', force = false): Promise<PD> => {
    const iso = isoFor(o);
    const key = mk(tierArg, iso);
    if (!force && mem.current[key]) return mem.current[key];
    if (!force) {
      const c = await rC(iso, tierArg);
      if (c) { mem.current[key] = { data: c.data, empty: c.empty }; return mem.current[key]; }
    }
    try {
      const path = tierArg === 'pro' ? '/daily-content/pro/by-date' : '/daily-content/by-date';
      const r = await api.get(path, { params: { date: iso, _t: Date.now() } });
      const data: any[] = r.data?.events ?? [];
      const pg: PD = { data, empty: data.length === 0 };
      mem.current[key] = pg; wC(iso, tierArg, data, pg.empty);
      return pg;
    } catch { return EMPTY; }
  }, []);

  const fetchAll = useCallback(async () => {
    const ps = Array.from({ length: 60 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - i);
      return api.get('/daily-content/by-date', { params: { date: d.toISOString().split('T')[0] } })
        .then(r => r.data?.events ?? []).catch(() => []);
    });
    const all = (await Promise.all(ps)).flat();
    const seen = new Set<string>();
    setAllEvents(all.filter((e: any) => {
      const id = `${e.eventDate}-${e.titleTranslations?.en}`;
      if (seen.has(id)) return false;
      seen.add(id); return true;
    }));
  }, []);

  useEffect(() => {
    recordVisit();
    try { genRecap(); } catch { }
    setTimeout(() => { if (getRecap()) setRecapVis(true); }, 2000);
    Promise.all([fetchOne(0), fetchOne(-1), fetchOne(1)]).then(async () => {
      setLoading(false);
      setTick(t => t + 1);
      fetchAll();
      fetchOne(0, 'pro').catch(() => {}); fetchOne(-1, 'pro').catch(() => {}); fetchOne(1, 'pro').catch(() => {});
      for (let i = 2; i <= 7; i++) { fetchOne(-i).catch(() => { }); fetchOne(-i, 'pro').catch(() => {}); }
      const notifPref = await AsyncStorage.getItem('notifications_enabled');
      if (notifPref !== 'false') {
        fetchOne(1).then(d => schedulePersonalizedNotification(d.data, language))
          .catch(() => schedulePersonalizedNotification([], language));
      }
    });
  }, []);

  // ── Scroll animation (native-driven) ──
  const scrollX = useRef(new Animated.Value(TODAY_INDEX * W)).current;
  const listRef = useRef<FlatList>(null);
  const dateAnim = useRef(new Animated.Value(0)).current;

  const onScroll = useMemo(
    () => Animated.event(
      [{ nativeEvent: { contentOffset: { x: scrollX } } }],
      { useNativeDriver: true }
    ),
    [scrollX]
  );

  const onViewRef = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0) {
      const idx = viewableItems[0].index ?? TODAY_INDEX;
      const newOff = idx - PAST_DAYS;
      setOff(newOff);
      const key1 = mk('free', isoFor(newOff - 1));
      const key2 = mk('free', isoFor(newOff + 1));
      if (!mem.current[key1]) fetchOne(newOff - 1).then(() => setTick(t => t + 1)).catch(() => { });
      if (!mem.current[key2]) fetchOne(newOff + 1).then(() => setTick(t => t + 1)).catch(() => { });
      fetchOne(newOff, 'pro').catch(() => {});
      fetchOne(newOff - 1, 'pro').catch(() => {});
      fetchOne(newOff + 1, 'pro').catch(() => {});
    }
  });
  const viewConfigRef = useRef({ viewAreaCoveragePercentThreshold: 50 });

  const goFwd = useCallback(() => {
    if (off >= MAX_FWD) return;
    haptic('light');
    const idx = off + 1 + PAST_DAYS;
    listRef.current?.scrollToIndex({ index: idx, animated: true });
    Animated.sequence([
      Animated.timing(dateAnim, { toValue: -16, duration: 80, useNativeDriver: true }),
      Animated.spring(dateAnim, { toValue: 0, tension: 220, friction: 24, useNativeDriver: true }),
    ]).start();
  }, [off, dateAnim]);

  const goBck = useCallback(() => {
    haptic('light');
    const idx = off - 1 + PAST_DAYS;
    if (idx >= 0) listRef.current?.scrollToIndex({ index: idx, animated: true });
    Animated.sequence([
      Animated.timing(dateAnim, { toValue: 16, duration: 80, useNativeDriver: true }),
      Animated.spring(dateAnim, { toValue: 0, tension: 220, friction: 24, useNativeDriver: true }),
    ]).start();
  }, [off, dateAnim]);

  const jump = useCallback((newOff: number) => {
    if (newOff > MAX_FWD) return;
    haptic('medium');
    const idx = newOff + PAST_DAYS;
    if (idx >= 0 && idx < DAY_OFFSETS.length) {
      fetchOne(newOff).then(() => {
        fetchOne(newOff, 'pro').catch(() => {});
        setTick(t => t + 1);
        listRef.current?.scrollToIndex({ index: idx, animated: false });
      });
    }
  }, [fetchOne]);

  const goldColor = isPremium ? '#D4A843' : theme.gold;

  // ── Item renderer ──
  const sortByImpact = (a: any, b: any) => (b.impactScore ?? 0) - (a.impactScore ?? 0);

  const renderItem = useCallback(({ item: dayOff }: { item: number }) => {
    let content: React.ReactNode = null;

    if (dayOff === 1 && !isPro) {
      if (tab === 'today' && !tomorrowMainUnlocked) {
        content = <LockedTomorrowCard variant="main" onUnlock={handleUnlockMain} isReady={isUnlockReady} />;
      } else if (tab === 'discover' && !tomorrowDiscoverUnlocked) {
        content = <LockedTomorrowCard variant="discover" onUnlock={handleUnlockDiscover} isReady={isUnlockReady} />;
      }
    }

    if (!content && !isPro && dayOff < 0 && Math.abs(dayOff) % AD_FREQUENCY === 0 && tab === 'today') {
      content = <AdCard />;
    }

    if (!content) {
      const iso = isoFor(dayOff);
      const freePg = mem.current[mk('free', iso)] ?? EMPTY;
      const proPg = mem.current[mk('pro', iso)] ?? EMPTY;
      const freeSorted = [...freePg.data].sort(sortByImpact);
      const proSorted = [...proPg.data].sort(sortByImpact);
      const freeMain = freeSorted[0] ?? null;
      const proMain = proSorted[0] ?? null;
      const pi = labelFor(dayOff, language);

      if (tab === 'today') {
        if (freePg.empty || !freeMain) {
          content = <EmptyDay isToday={pi.isToday} theme={theme} t={t} />;
        } else if (proMain) {
          // ── Symmetric layout: Free card + animated arrow between + PRO card ──
          content = (
            <ScrollView
              style={{ flex: 1 }}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled
              bounces={false}
            >
              {/* Free main event — same size as PRO below */}
              <View style={{ height: H * 0.65 }}>
                <HistoryCard event={freeMain} allEvents={allEvents} />
              </View>

              {/* Animated arrow between the two cards */}
              <ProPeekHint gold={goldColor} onPress={() => {
                if (!isPro) presentPaywall();
              }} />

              {/* PRO card — exact same height as free card for symmetry */}
              <ProCardSection
                event={proMain}
                allEvents={allEvents}
                gold={goldColor}
                isPro={isPro}
                onPaywall={() => presentPaywall()}
              />
              <View style={{ height: 40 }} />
            </ScrollView>
          );
        } else {
          // No PRO content — full screen card, no scroll needed
          content = <HistoryCard event={freeMain} allEvents={allEvents} />;
        }
      } else {
        // Discover tab — merge pro + free into one editorial grid.
        // PRO events keep the gold star badge and route to paywall on tap when not subscribed.
        const combinedSorted = [
          ...freeSorted,
          ...proSorted.map((e: any) => ({ ...e, isPro: true })),
        ].sort(sortByImpact);
        content = (
          <DiscoverSection
            events={combinedSorted}
            theme={theme}
            t={t}
            isPro={isPro}
            onPaywall={() => presentPaywall()}
          />
        );
      }
    }

    return (
      <AnimatedPage dayOff={dayOff} scrollX={scrollX}>
        {content}
      </AnimatedPage>
    );
  }, [
    tab, theme, t, language, allEvents, tick, goldColor, isPro,
    tomorrowMainUnlocked, tomorrowDiscoverUnlocked, isUnlockReady,
    handleUnlockMain, handleUnlockDiscover, scrollX, presentPaywall,
  ]);

  const getItemLayout = useCallback((_: any, index: number) => ({
    length: W, offset: W * index, index,
  }), []);

  const ms = makeStyles(theme, isDark, isPremium);
  const info = labelFor(off, language);
  const canFwd = off < MAX_FWD;
  const showChrome = tab === 'today' || tab === 'discover' || tab === 'search';
  const badgeCnt = newAch.length;
  const PRO_ONLY_TABS: Tab[] = ['timeline', 'saved'];
  const switchTab = useCallback(async (t: Tab) => {
    if (PRO_ONLY_TABS.includes(t) && !isPro) {
      await presentPaywallIfNeeded();
      return;
    }
    setTab(t);
    if (t === 'saved') setSeenSaved(userSaved.length);
  }, [userSaved.length, isPro, presentPaywallIfNeeded]);
  const swipeOn = tab === 'today' || tab === 'discover';
  const isTomorrowNext = off === 0 && canFwd;
  const isTomorrowLocked = isTomorrowNext && (
    (tab === 'today' && !tomorrowMainUnlocked) ||
    (tab === 'discover' && !tomorrowDiscoverUnlocked)
  );

  const shouldShowBanner = SHOW_BANNER_TABS.includes(tab) && !loading && !isPro;

  return (
    <AllEventsProvider events={allEvents}>
      <View style={ms.root}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <AchievementToast />

        {/* ═════════════════ CHROME (header) ═════════════════ */}
        {showChrome && (
          <View style={[ms.chrome, { paddingTop: insets.top }]}>
            {isPremium && (
              <LinearGradient colors={['#0A0815', '#05040A']} style={StyleSheet.absoluteFill} />
            )}

            {/* Brand + icon row */}
            <View style={ms.brandRow}>
              <View style={ms.brandLeft}>
                <Text style={[ms.brandLabel, { color: goldColor }]}>
                  {t('Daily').toUpperCase()}
                </Text>
                <Text style={[ms.brandTitle, { color: theme.text }]}>{t('History')}</Text>
              </View>

              <View style={ms.headerRight}>
                {/* Compact PRO star button — replaces the wide Get Pro button */}
                {!isPro && <ProStarButton gold={goldColor} onPress={() => presentPaywall()} />}

                <TouchableOpacity onPress={() => { haptic('light'); setLeadVis(true); }}
                  activeOpacity={0.6} style={ms.iconBtn}>
                  <Trophy size={18} color={theme.subtext} strokeWidth={1.8} />
                </TouchableOpacity>

                <TouchableOpacity onPress={() => switchTab('search')} activeOpacity={0.6}
                  style={[ms.iconBtn, { backgroundColor: tab === 'search' ? goldColor + '18' : 'transparent' }]}>
                  <Search size={18} color={tab === 'search' ? goldColor : theme.subtext} strokeWidth={1.8} />
                </TouchableOpacity>

                <TouchableOpacity onPress={() => { haptic('light'); setAchVis(true); }}
                  activeOpacity={0.6}
                  style={[ms.iconBtn, {
                    backgroundColor: badgeCnt > 0 ? goldColor + '18' : 'transparent',
                    borderColor: badgeCnt > 0 ? goldColor + '40' : isPremium ? '#2A2230' : 'transparent',
                    borderWidth: badgeCnt > 0 || isPremium ? 1 : 0,
                  }]}>
                  <Award size={18} color={badgeCnt > 0 ? goldColor : theme.subtext} strokeWidth={1.8} />
                  {badgeCnt > 0 && (
                    <View style={[ms.achBadge, { backgroundColor: isPremium ? '#C17B2A' : '#FF6D00' }]}>
                      <Text style={ms.achBadgeT}>{badgeCnt}</Text>
                    </View>
                  )}
                </TouchableOpacity>

                <StreakIcon />
                <ProfileWithXP gold={goldColor} theme={theme} isDark={isDark} />
              </View>
            </View>

            {isPremium && <PremiumAccentLine />}

            {/* Date nav */}
            {tab !== 'search' && (
              <Animated.View style={[ms.dateNav, { transform: [{ translateX: dateAnim }] }]}>
                <TouchableOpacity onPress={goBck} activeOpacity={0.6}
                  hitSlop={{ top: 16, bottom: 16, left: 12, right: 12 }} style={ms.navArrow}>
                  <Text style={[ms.navArrowIcon, { color: theme.subtext }]}>{'\u2039'}</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => { haptic('light'); setCalVis(true); }}
                  activeOpacity={0.7} style={ms.dateCenter}>
                  <View style={ms.datePrimary}>
                    <View style={[ms.dayCircle, {
                      backgroundColor: info.isToday ? goldColor : 'transparent',
                      borderColor: info.isToday ? goldColor : isPremium ? '#2A2230' : theme.border,
                      ...(isPremium && info.isToday && {
                        shadowColor: '#D4A843', shadowOffset: { width: 0, height: 0 },
                        shadowOpacity: 0.4, shadowRadius: 8, elevation: 6,
                      }),
                    }]}>
                      <Text style={[ms.dayNum, {
                        color: info.isToday ? (isPremium ? '#05040A' : '#000') : theme.text,
                      }]}>{info.day}</Text>
                    </View>
                    <View style={ms.dateTexts}>
                      <Text style={[ms.dateLabel, { color: theme.text }]}>
                        {info.isToday ? t('today') : info.isTomorrow ? t('tomorrow') : info.fullDay}
                      </Text>
                      <Text style={[ms.dateSub, { color: theme.subtext }]}>
                        {`${info.monthLong} ${info.dayNum}, ${info.yearNum}`}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>

                {isTomorrowLocked ? (
                  <TouchableOpacity onPress={goFwd} activeOpacity={0.6}
                    hitSlop={{ top: 16, bottom: 16, left: 12, right: 12 }}
                    style={[ms.unlockArrow, { backgroundColor: goldColor + '15', borderColor: goldColor + '35' }]}>
                    <Ionicons name="lock-closed" size={13} color={goldColor} />
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity onPress={goFwd} activeOpacity={0.6} disabled={!canFwd}
                    hitSlop={{ top: 16, bottom: 16, left: 12, right: 12 }}
                    style={[ms.navArrow, !canFwd && { opacity: 0.2 }]}>
                    <Text style={[ms.navArrowIcon, { color: theme.subtext }]}>{'\u203A'}</Text>
                  </TouchableOpacity>
                )}
              </Animated.View>
            )}

            <View style={[ms.sep, { backgroundColor: isPremium ? '#D4A84315' : theme.border }]} />
          </View>
        )}

        {/* ═════════════════ CONTENT ═════════════════ */}
        <View style={{ flex: 1 }}>
          {tab === 'saved' ? <SavedScreen />
            : tab === 'map' ? <MapScreen />
            : tab === 'search' ? <SearchScreen allEvents={allEvents} />
            : tab === 'timeline' ? <TimelineScreen allEvents={allEvents} />
            : loading ? (
              <View style={ms.loadW}>
                <View style={[ms.loadP, { borderColor: goldColor + '25' }]}>
                  <Text style={{ color: goldColor, fontSize: 22, opacity: 0.4 }}>{'\u25CB'}</Text>
                </View>
              </View>
            )
            : swipeOn ? (
              <Animated.FlatList
                ref={listRef as any}
                data={DAY_OFFSETS}
                keyExtractor={(item) => String(item)}
                renderItem={renderItem}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                initialScrollIndex={TODAY_INDEX}
                getItemLayout={getItemLayout}
                onViewableItemsChanged={onViewRef.current}
                viewabilityConfig={viewConfigRef.current}
                onScroll={onScroll}
                scrollEventThrottle={16}
                decelerationRate="fast"
                snapToInterval={W}
                snapToAlignment="start"
                disableIntervalMomentum
                maxToRenderPerBatch={3}
                windowSize={3}
                removeClippedSubviews={false}
                extraData={tick}
                bounces={false}
                overScrollMode="never"
              />
            ) : null}
        </View>

        {/* ═════════════════ BANNER AD (above tab bar) ═════════════════ */}
        {shouldShowBanner && !bannerError && (
          <View style={[
            ms.bannerWrap,
            {
              backgroundColor: theme.background,
              borderTopColor: isPremium ? '#D4A84315' : theme.border,
            },
            !bannerLoaded && { height: 0, minHeight: 0, paddingVertical: 0, borderTopWidth: 0, overflow: 'hidden' },
          ]}>
            <BannerAd
              unitId={AD_UNIT_IDS.BANNER}
              size={BannerAdSize.BANNER}
              onAdLoaded={() => {
                console.log('[Ads][Banner-bottom] LOADED — unitId=', AD_UNIT_IDS.BANNER);
                setBannerLoaded(true);
                setBannerError(false);
              }}
              onAdFailedToLoad={(err: any) => {
                console.warn('[Ads][Banner-bottom] FAILED', err?.message);
                setBannerError(true);
              }}
              onAdOpened={() => console.log('[Ads][Banner-bottom] OPENED')}
              onAdClosed={() => console.log('[Ads][Banner-bottom] CLOSED')}
            />
          </View>
        )}

        <TabBar active={tab} onSwitch={switchTab} unseenSaved={unseenSaved} t={t} />

        <AchievementsModal visible={achVis} onClose={() => setAchVis(false)} />
        <LeaderboardModal visible={leadVis} onClose={() => setLeadVis(false)} />
        <WeeklyRecapModal visible={recapVis} onClose={() => setRecapVis(false)} />
        <CalendarModal
          visible={calVis}
          onClose={() => setCalVis(false)}
          onSelectDate={(d: Date) => jump(d2o(d))}
          selectedDate={offDate(off)}
          maxFutureOffset={MAX_FWD}
          events={allEvents}
        />
        <StoryModal
          visible={!!notifEvent}
          event={notifEvent}
          onClose={() => setNotifEvent(null)}
          theme={theme}
          allEvents={allEvents}
        />
      </View>
    </AllEventsProvider>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// STYLES
// ═════════════════════════════════════════════════════════════════════════════
const makeStyles = (theme: any, isDark: boolean, isPremium: boolean) => StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.background },

  chrome: {
    backgroundColor: isPremium ? 'transparent' : theme.background,
    paddingHorizontal: 16,
    overflow: 'hidden',
  },
  brandRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 10, paddingBottom: 14,
  },
  brandLeft: { gap: 1, flexShrink: 1, minWidth: 0 },
  brandLabel: {
    fontSize: 9, fontWeight: '700', letterSpacing: 4,
    opacity: isPremium ? 0.8 : 0.6,
  },
  brandTitle: {
    fontSize: 22, fontWeight: '800', letterSpacing: 0.5,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 2, flexShrink: 0 },
  iconBtn: { width: 32, height: 32, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  achBadge: {
    position: 'absolute', top: -4, right: -4, minWidth: 16, height: 16,
    borderRadius: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3,
  },
  achBadgeT: { fontSize: 9, fontWeight: '900', color: '#FFF' },

  dateNav: { flexDirection: 'row', alignItems: 'center', paddingBottom: 14 },
  navArrow: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  navArrowIcon: { fontSize: 28, fontWeight: '300', lineHeight: 30, marginTop: -1 },
  dateCenter: { flex: 1, alignItems: 'center' },
  datePrimary: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dayCircle: {
    width: 44, height: 44, borderRadius: 22, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  dayNum: { fontSize: 17, fontWeight: '800', letterSpacing: -0.5 },
  dateTexts: { gap: 2 },
  dateLabel: { fontSize: 16, fontWeight: '700', letterSpacing: 0.2 },
  dateSub: { fontSize: 12, fontWeight: '500', opacity: 0.6 },
  sep: { height: isPremium ? 1 : StyleSheet.hairlineWidth },
  unlockArrow: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1,
  },

  loadW: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadP: {
    width: 56, height: 56, borderRadius: 28, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
  },

  bannerWrap: {
    alignItems: 'center', justifyContent: 'center', paddingVertical: 4,
    borderTopWidth: StyleSheet.hairlineWidth, minHeight: 58,
  },
});