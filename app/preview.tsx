// app/preview.tsx — guest preview: today's event + locked Discover teaser
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import api from '../api';
import { HistoryCard } from '../components/HistoryCard';
import { useTheme } from '../context/ThemeContext';

const { height: H } = Dimensions.get('window');
const CARD_H = H * 0.55;
const SERIF = Platform.OS === 'ios' ? 'Georgia' : 'serif';

// ── Shimmer accent line (same as index) ──────────────────────────────────────
const AccentLine = ({ gold }: { gold: string }) => {
  const shimmer = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.timing(shimmer, { toValue: 1, duration: 3000, easing: Easing.inOut(Easing.sin), useNativeDriver: true })
    ).start();
  }, []);
  const op = shimmer.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.15, 0.55, 0.15] });
  return <Animated.View style={{ height: 1, marginHorizontal: 20, backgroundColor: gold, opacity: op, borderRadius: 1 }} />;
};

// ── Discover teaser card — one event, blurred bottom, lock overlay ────────────
const DiscoverTeaser = ({
  event,
  gold,
  isDark,
  onPress,
}: {
  event: any;
  gold: string;
  isDark: boolean;
  onPress: () => void;
}) => {
  const img = event?.gallery?.[0];
  const title =
    event?.titleTranslations?.en ??
    event?.titleTranslations?.ro ??
    'Historical Event';
  const category = (event?.category ?? 'HISTORY').replace(/_/g, ' ');
  const rawDate = event?.eventDate ?? event?.event_date ?? '';
  const year = rawDate ? String(rawDate).slice(0, 4) : '';

  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();
  }, []);
  const lockScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });
  const lockGlow = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.6] });

  return (
    <TouchableOpacity
      activeOpacity={0.92}
      onPress={onPress}
      style={[s.teaserCard, { height: H * 0.42 }]}
    >
      {/* Background image */}
      {img ? (
        <Image
          source={{ uri: img }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={600}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? '#1A1520' : '#E8E4F0' }]} />
      )}

      {/* Gradient: show top, fade to dark at bottom */}
      <LinearGradient
        colors={['rgba(0,0,0,0.35)', 'transparent', 'rgba(0,0,0,0.75)', 'rgba(0,0,0,0.97)']}
        locations={[0, 0.28, 0.62, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Top badge */}
      <View style={s.teaserTopRow}>
        <View style={s.discoverChip}>
          <Text style={s.discoverChipText}>DISCOVER</Text>
        </View>
        <View style={[s.catChip, { backgroundColor: gold + '22', borderColor: gold + '55' }]}>
          <Text style={[s.catChipText, { color: gold }]}>{category}</Text>
        </View>
      </View>

      {/* Event info at bottom — partially visible */}
      <View style={s.teaserBottom}>
        {year !== '' && (
          <Text style={[s.teaserYear, { color: gold }]}>{year}</Text>
        )}
        <Text style={s.teaserTitle} numberOfLines={2}>{title}</Text>
      </View>

      {/* Lock overlay — gradient from transparent to opaque covering lower 60% */}
      <LinearGradient
        colors={['transparent', isDark ? 'rgba(5,4,10,0.65)' : 'rgba(245,246,250,0.7)', isDark ? 'rgba(5,4,10,0.96)' : 'rgba(245,246,250,0.97)']}
        locations={[0, 0.45, 1]}
        style={[StyleSheet.absoluteFill, s.lockGradient]}
        pointerEvents="none"
      />

      {/* Lock card */}
      <View style={s.lockBox} pointerEvents="none">
        <Animated.View
          style={[
            s.lockRing,
            {
              borderColor: gold + '70',
              backgroundColor: gold + '18',
              transform: [{ scale: lockScale }],
            },
          ]}
        >
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              s.lockGlowBg,
              { backgroundColor: gold, borderRadius: 28, opacity: lockGlow },
            ]}
          />
          <Ionicons name="lock-closed" size={22} color={gold} />
        </Animated.View>

        <Text style={[s.lockTitle, { color: isDark ? '#F5ECD7' : '#1A1208' }]}>
          Sign in to read more
        </Text>
        <Text style={[s.lockSub, { color: isDark ? 'rgba(245,236,215,0.6)' : 'rgba(26,18,8,0.55)' }]}>
          Access the full Discover feed, Timeline, and saved events
        </Text>

        <View style={[s.lockCta, { backgroundColor: gold }]}>
          <Text style={s.lockCtaText}>Get Started — It's Free</Text>
          <Ionicons name="arrow-forward" size={14} color="#1A1208" />
        </View>
      </View>
    </TouchableOpacity>
  );
};

// ── Main screen ───────────────────────────────────────────────────────────────
export default function PreviewScreen() {
  const router = useRouter();
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const gold = theme.gold ?? '#D4A843';

  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const date = new Date().toISOString().split('T')[0];
    api
      .get('/daily-content/guest', { params: { date } })
      .then(r => {
        const data = r.data;
        const arr = data?.events
          ? data.events
          : Array.isArray(data)
          ? data
          : data && typeof data === 'object'
          ? [data]
          : [];
        setEvents(arr);
      })
      .catch(e => console.error('[Preview] guest error:', e?.response?.status, e?.message))
      .finally(() => setLoading(false));
  }, []);

  const goWelcome = () => router.replace('/(auth)/welcome');

  const todayEvent = events[0] ?? null;
  const discoverEvent = events[1] ?? null;

  const dateLabel = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const bottomBg = isDark ? 'rgba(10,9,16,0.97)' : 'rgba(255,255,255,0.97)';

  return (
    <View style={[s.root, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} translucent />

      {/* ── Header (same design as index) ── */}
      <View style={[s.chrome, { paddingTop: insets.top + 4, backgroundColor: theme.background }]}>
        <View style={s.brandRow}>
          <View style={s.brandLeft}>
            <Text style={[s.brandLabel, { color: gold }]}>DAILY</Text>
            <Text style={[s.brandTitle, { color: theme.text }]}>History</Text>
          </View>
          <TouchableOpacity
            style={[s.signInBtn, { borderColor: gold + '60', backgroundColor: gold + '14' }]}
            onPress={goWelcome}
            activeOpacity={0.8}
          >
            <Text style={[s.signInBtnText, { color: gold }]}>Sign In</Text>
          </TouchableOpacity>
        </View>
        <AccentLine gold={gold} />

        {/* Date row */}
        <View style={s.dateRow}>
          <View style={[s.dateDot, { backgroundColor: gold }]} />
          <Text style={[s.dateText, { color: theme.subtext }]}>{dateLabel}</Text>
        </View>

        <View style={[s.sep, { backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)' }]} />
      </View>

      <ScrollView
        contentContainerStyle={[
          s.scroll,
          { paddingBottom: insets.bottom + 110 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Today's event card ── */}
        <View style={[s.cardWrap, { height: CARD_H }]}>
          {loading ? (
            <View style={[s.cardLoader, { backgroundColor: theme.card }]}>
              <ActivityIndicator color={gold} size="large" />
            </View>
          ) : todayEvent ? (
            <HistoryCard event={todayEvent} allEvents={events} />
          ) : null}
        </View>

        {/* ── Divider ── */}
        <View style={s.divider}>
          <View style={[s.dividerLine, { backgroundColor: gold + '30' }]} />
          <Text style={[s.dividerOrn, { color: gold }]}>✦</Text>
          <Text style={[s.dividerLabel, { color: theme.subtext }]}>DISCOVER MORE</Text>
          <Text style={[s.dividerOrn, { color: gold }]}>✦</Text>
          <View style={[s.dividerLine, { backgroundColor: gold + '30' }]} />
        </View>

        {/* ── Discover teaser ── */}
        {!loading && discoverEvent && (
          <View style={s.teaserWrap}>
            <DiscoverTeaser
              event={discoverEvent}
              gold={gold}
              isDark={isDark}
              onPress={goWelcome}
            />
          </View>
        )}

        {loading && (
          <View style={[s.teaserPlaceholder, { backgroundColor: theme.card, height: H * 0.42 }]} />
        )}
      </ScrollView>

      {/* ── Bottom CTA ── */}
      <View
        style={[
          s.bottomBar,
          {
            paddingBottom: Math.max(insets.bottom, 16),
            backgroundColor: bottomBg,
            borderTopColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)',
          },
        ]}
      >
        <TouchableOpacity
          style={[s.ctaBtn, { backgroundColor: gold }]}
          onPress={goWelcome}
          activeOpacity={0.88}
        >
          <Text style={s.ctaBtnText}>Create Free Account</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={goWelcome} activeOpacity={0.7}>
          <Text style={[s.ctaLink, { color: theme.subtext }]}>
            Already have an account?{' '}
            <Text style={{ color: gold, fontWeight: '700' }}>Sign In</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 0 },

  // Header
  chrome: { paddingHorizontal: 16, overflow: 'hidden' },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    paddingBottom: 12,
  },
  brandLeft: { gap: 1 },
  brandLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 4, opacity: 0.7 },
  brandTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0.5,
    fontFamily: SERIF,
  },
  signInBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  signInBtnText: { fontSize: 13, fontWeight: '700', letterSpacing: 0.2 },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 10,
  },
  dateDot: { width: 5, height: 5, borderRadius: 3 },
  dateText: { fontSize: 13, fontWeight: '500', letterSpacing: 0.2 },
  sep: { height: StyleSheet.hairlineWidth, marginBottom: 2 },

  // Main card
  cardWrap: { marginHorizontal: 16, borderRadius: 28, overflow: 'hidden' },
  cardLoader: {
    flex: 1,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Divider
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    marginTop: 22,
    marginBottom: 14,
  },
  dividerLine: { flex: 1, height: 1, borderRadius: 0.5 },
  dividerOrn: { fontSize: 10 },
  dividerLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2.5,
  },

  // Discover teaser
  teaserWrap: { marginHorizontal: 16 },
  teaserPlaceholder: { marginHorizontal: 16, borderRadius: 24 },

  teaserCard: {
    borderRadius: 24,
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.18, shadowRadius: 16 },
      android: { elevation: 8 },
    }),
  },

  teaserTopRow: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  discoverChip: {
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  discoverChipText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 2,
  },
  catChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
  },
  catChipText: { fontSize: 9, fontWeight: '800', letterSpacing: 1.5 },

  teaserBottom: {
    position: 'absolute',
    bottom: 160,
    left: 20,
    right: 20,
    gap: 4,
  },
  teaserYear: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5 },
  teaserTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: SERIF,
    letterSpacing: -0.3,
    lineHeight: 28,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },

  lockGradient: {},

  // Lock overlay contents
  lockBox: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingBottom: 28,
    paddingHorizontal: 28,
    gap: 10,
  },
  lockRing: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  lockGlowBg: {},
  lockTitle: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.2,
    fontFamily: SERIF,
    textAlign: 'center',
  },
  lockSub: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  lockCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    paddingHorizontal: 22,
    paddingVertical: 11,
    borderRadius: 14,
  },
  lockCtaText: { fontSize: 13, fontWeight: '800', color: '#1A1208', letterSpacing: 0.2 },

  // Bottom bar
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 14,
    gap: 10,
    alignItems: 'center',
  },
  ctaBtn: {
    width: '100%',
    paddingVertical: 15,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaBtnText: { fontSize: 16, fontWeight: '800', color: '#1A1208', letterSpacing: 0.2 },
  ctaLink: { fontSize: 13, fontWeight: '500' },
});
