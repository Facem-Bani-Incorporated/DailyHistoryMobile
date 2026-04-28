// app/preview.tsx — guest preview: today's event + locked Discover, any tap → welcome
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
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
import { DiscoverSection } from '../components/DiscoverSection';
import { HistoryCard } from '../components/HistoryCard';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';

const { height: H } = Dimensions.get('window');
const CARD_H = H * 0.54;

export default function PreviewScreen() {
  const router  = useRouter();
  const { theme, isDark } = useTheme();
  const { t }   = useLanguage();
  const insets  = useSafeAreaInsets();

  const [events,  setEvents]  = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const date = new Date().toISOString().split('T')[0];
    api
      .get('/daily-content/guest', { params: { date } })
      .then(r => setEvents(r.data?.events ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const goWelcome = () => router.replace('/(auth)/welcome');

  const todayEvent = events[0] ?? null;

  const overlayBg = isDark ? 'rgba(5,4,10,0.82)' : 'rgba(245,246,250,0.88)';
  const bottomBg  = isDark ? 'rgba(10,9,16,0.95)' : 'rgba(255,255,255,0.97)';

  return (
    <View style={[s.root, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} translucent />

      <ScrollView
        contentContainerStyle={[
          s.scroll,
          { paddingTop: insets.top + 10, paddingBottom: insets.bottom + 110 },
        ]}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
      >
        {/* ── Branding header ── */}
        <View style={s.header}>
          <Text style={[s.brandTitle, { color: theme.text }]}>Daily History</Text>
          <View style={[s.brandRule, { backgroundColor: theme.gold + '55' }]} />
          <Text style={[s.brandDate, { color: theme.subtext }]}>
            {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
          </Text>
        </View>

        {/* ── Today's event card ── */}
        <TouchableOpacity
          activeOpacity={0.97}
          onPress={goWelcome}
          style={[s.cardWrap, { height: CARD_H }]}
        >
          {loading ? (
            <View style={[s.cardLoader, { backgroundColor: theme.card }]}>
              <ActivityIndicator color={theme.gold} size="large" />
            </View>
          ) : todayEvent ? (
            <View style={StyleSheet.absoluteFill} pointerEvents="none">
              <HistoryCard event={todayEvent} allEvents={events} />
            </View>
          ) : null}

          {/* "Tap to sign in" badge */}
          {!loading && todayEvent && (
            <View
              style={[s.tapHint, { backgroundColor: isDark ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.72)' }]}
              pointerEvents="none"
            >
              <Text style={[s.tapHintText, { color: isDark ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.75)' }]}>
                Tap to sign in and read more
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {/* ── Divider ── */}
        <View style={s.divider}>
          <View style={[s.dividerLine, { backgroundColor: theme.gold + '35' }]} />
          <Text style={[s.dividerLabel, { color: theme.gold }]}>✦</Text>
          <Text style={[s.dividerText, { color: theme.subtext }]}>Discover More</Text>
          <Text style={[s.dividerLabel, { color: theme.gold }]}>✦</Text>
          <View style={[s.dividerLine, { backgroundColor: theme.gold + '35' }]} />
        </View>

        {/* ── DiscoverSection — locked behind overlay ── */}
        <View style={s.discoverWrap}>
          <View pointerEvents="none" style={{ opacity: 0.45 }}>
            {events.length > 0 && (
              <DiscoverSection
                events={events}
                theme={theme}
                t={t}
                isPro={false}
                onPaywall={goWelcome}
              />
            )}
            {!loading && events.length === 0 && (
              <View style={[s.discoverPlaceholder, { backgroundColor: theme.card }]} />
            )}
          </View>

          {/* Plain overlay — no native blur needed */}
          <TouchableOpacity
            style={[StyleSheet.absoluteFill, s.lockOverlayWrap, { backgroundColor: overlayBg }]}
            onPress={goWelcome}
            activeOpacity={0.9}
          >
            <View style={[s.lockCard, { backgroundColor: isDark ? 'rgba(20,17,30,0.92)' : 'rgba(255,255,255,0.95)', borderColor: theme.gold + '40' }]}>
              <View style={[s.lockIconRing, { borderColor: theme.gold + '60', backgroundColor: theme.gold + '14' }]}>
                <Text style={[s.lockIconText, { color: theme.gold }]}>⚿</Text>
              </View>
              <Text style={[s.lockTitle, { color: theme.text }]}>Sign in to unlock</Text>
              <Text style={[s.lockSub, { color: theme.subtext }]}>
                Access the full Discover feed, Timeline, Map, and saved events
              </Text>
              <View style={[s.lockCta, { backgroundColor: theme.gold }]}>
                <Text style={s.lockCtaText}>Get Started — It's Free</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ── Bottom CTA bar ── */}
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
        <View style={s.bottomContent}>
          <TouchableOpacity
            style={[s.ctaBtn, { backgroundColor: theme.gold }]}
            onPress={goWelcome}
            activeOpacity={0.88}
          >
            <Text style={s.ctaBtnText}>Create Free Account</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={goWelcome} activeOpacity={0.7}>
            <Text style={[s.signInLink, { color: theme.subtext }]}>
              Already have an account?{' '}
              <Text style={{ color: theme.gold, fontWeight: '700' }}>Sign In</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root:   { flex: 1 },
  scroll: { paddingHorizontal: 0 },

  header:     { alignItems: 'center', paddingHorizontal: 24, paddingBottom: 18, gap: 6 },
  brandTitle: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5, fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' },
  brandRule:  { width: 40, height: 1, borderRadius: 0.5 },
  brandDate:  { fontSize: 13, fontWeight: '500', letterSpacing: 0.3 },

  cardWrap:    { marginHorizontal: 16, borderRadius: 28, overflow: 'hidden' },
  cardLoader:  { flex: 1, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  tapHint:     { position: 'absolute', bottom: 16, alignSelf: 'center', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8 },
  tapHintText: { fontSize: 12, fontWeight: '600', letterSpacing: 0.2 },

  divider:      { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 24, marginTop: 24, marginBottom: 8 },
  dividerLine:  { flex: 1, height: 1, borderRadius: 0.5 },
  dividerLabel: { fontSize: 10 },
  dividerText:  { fontSize: 11, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase' },

  discoverWrap:        { minHeight: 420, overflow: 'hidden' },
  discoverPlaceholder: { height: 380, marginHorizontal: 16, borderRadius: 20 },

  lockOverlayWrap: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  lockCard: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 24,
    borderWidth: 1,
    padding: 28,
    alignItems: 'center',
    gap: 12,
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.22, shadowRadius: 20 },
      android: { elevation: 12 },
    }),
  },
  lockIconRing: { width: 56, height: 56, borderRadius: 28, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  lockIconText: { fontSize: 22 },
  lockTitle:    { fontSize: 18, fontWeight: '800', letterSpacing: -0.3, textAlign: 'center' },
  lockSub:      { fontSize: 13, lineHeight: 20, textAlign: 'center', opacity: 0.8 },
  lockCta:      { marginTop: 6, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14 },
  lockCtaText:  { fontSize: 14, fontWeight: '800', color: '#000', letterSpacing: 0.2 },

  bottomBar:     { position: 'absolute', bottom: 0, left: 0, right: 0, borderTopWidth: 1 },
  bottomContent: { paddingHorizontal: 20, paddingTop: 14, gap: 10, alignItems: 'center' },
  ctaBtn:        { width: '100%', paddingVertical: 15, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  ctaBtnText:    { fontSize: 16, fontWeight: '800', color: '#000', letterSpacing: 0.2 },
  signInLink:    { fontSize: 13, fontWeight: '500' },
});
