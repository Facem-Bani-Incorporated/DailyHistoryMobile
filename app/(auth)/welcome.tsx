import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';
import { LinearGradient } from 'expo-linear-gradient';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Bell, ShieldCheck, Zap } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

const HISTORICAL_IMAGES = [
  'https://res.cloudinary.com/dimwqrltb/image/upload/v1771668729/pexels-pixabay-53442_bwyr2e.jpg',
  'https://res.cloudinary.com/dimwqrltb/image/upload/v1771668729/pexels-meperdinaviagem-2038361_q2nf23.jpg',
  'https://res.cloudinary.com/dimwqrltb/image/upload/v1771668730/pexels-pixabay-159862_q0olii.jpg',
  'https://res.cloudinary.com/dimwqrltb/image/upload/v1771668730/pexels-aquintanar-4448698_po20ba.jpg',
  'https://res.cloudinary.com/dimwqrltb/image/upload/v1771668731/pexels-alexazabache-3290068_vkui5d.jpg',
  'https://res.cloudinary.com/dimwqrltb/image/upload/v1771668731/pexels-robshumski-6102271_zylp73.jpg',
  'https://res.cloudinary.com/dimwqrltb/image/upload/v1771668732/pexels-clickerhappy-615344_wps3tw.jpg',
  'https://res.cloudinary.com/dimwqrltb/image/upload/v1771668733/pexels-andrea-albanese-130507-397431_vghzpi.jpg',
  'https://res.cloudinary.com/dimwqrltb/image/upload/v1771668733/pexels-alexazabache-3185480_epcnhb.jpg',
];

const COLUMN_1 = [
  HISTORICAL_IMAGES[0], HISTORICAL_IMAGES[1], HISTORICAL_IMAGES[2],
  HISTORICAL_IMAGES[3], HISTORICAL_IMAGES[4],
];
const COLUMN_2 = [
  HISTORICAL_IMAGES[4], HISTORICAL_IMAGES[5], HISTORICAL_IMAGES[6],
  HISTORICAL_IMAGES[7], HISTORICAL_IMAGES[8],
];

const CARD_H = 222;

// ─── FRAMED IMAGE CARD ────────────────────────────────────────────────────────
const KBCard = ({ uri }: { uri: string }) => (
  <View style={cardStyles.frame}>
    {/* Top-left corner accent */}
    <View style={[cardStyles.corner, cardStyles.cornerTL]} />
    <View style={[cardStyles.corner, cardStyles.cornerTR]} />
    <View style={[cardStyles.corner, cardStyles.cornerBL]} />
    <View style={[cardStyles.corner, cardStyles.cornerBR]} />
    <View style={cardStyles.inner}>
      <Animated.Image source={{ uri }} style={cardStyles.img} resizeMode="cover" />
      <View style={cardStyles.overlay} />
    </View>
  </View>
);

const cardStyles = StyleSheet.create({
  // Outer frame — aged dark wood feel
  frame: {
    width: '100%',
    height: CARD_H - 14,
    marginBottom: 14,
    padding: 5,
    backgroundColor: '#12100a',
    borderWidth: 1,
    borderColor: 'rgba(180,148,60,0.4)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 10,
  },
  // Inner photo area
  inner: {
    flex: 1,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.10)',
  },
  img:     { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(6,4,1,0.15)' },

  // Decorative corner accents
  corner: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderColor: 'rgba(200,163,60,0.7)',
    zIndex: 2,
  },
  cornerTL: { top: 2,  left: 2,  borderTopWidth: 1.5, borderLeftWidth: 1.5 },
  cornerTR: { top: 2,  right: 2, borderTopWidth: 1.5, borderRightWidth: 1.5 },
  cornerBL: { bottom: 2, left: 2,  borderBottomWidth: 1.5, borderLeftWidth: 1.5 },
  cornerBR: { bottom: 2, right: 2, borderBottomWidth: 1.5, borderRightWidth: 1.5 },
});

// ─── SCROLLING COLUMN ─────────────────────────────────────────────────────────
const ScrollingColumn = ({ images, duration, reverse }: { images: string[]; duration: number; reverse?: boolean }) => {
  const TOTAL_H = images.length * CARD_H;
  const translateY = useSharedValue(reverse ? -TOTAL_H : 0);
  const doubled = [...images, ...images, ...images];

  useEffect(() => {
    translateY.value = withRepeat(
      withTiming(reverse ? 0 : -TOTAL_H, { duration, easing: Easing.linear }),
      -1, false
    );
  }, []);

  const colStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));

  return (
    <View style={{ flex: 1, overflow: 'hidden' }}>
      <Animated.View style={colStyle}>
        {doubled.map((uri, i) => (
          <KBCard key={`${i}-${uri}`} uri={uri} />
        ))}
      </Animated.View>
    </View>
  );
};

// ─── GOLD PARTICLE ────────────────────────────────────────────────────────────
type ParticleData = { id: number; x: number; y: number; size: number; delay: number; dur: number };

const PARTICLES: ParticleData[] = Array.from({ length: 16 }, (_, i) => ({
  id: i,
  x: Math.random() * width,
  y: height * 0.1 + Math.random() * height * 0.6,
  size: 1.5 + Math.random() * 2,
  delay: Math.floor(Math.random() * 3000),
  dur: 2600 + Math.floor(Math.random() * 1800),
}));

const GoldParticle = ({ x, y, size, delay, dur }: ParticleData) => {
  const opacity = useSharedValue(0);
  const ty = useSharedValue(0);

  useEffect(() => {
    opacity.value = withDelay(delay, withRepeat(withSequence(
      withTiming(0.75, { duration: dur * 0.35, easing: Easing.out(Easing.ease) }),
      withTiming(0,    { duration: dur * 0.65, easing: Easing.in(Easing.ease) }),
    ), -1, false));
    ty.value = withDelay(delay, withRepeat(
      withTiming(-40, { duration: dur, easing: Easing.out(Easing.ease) }),
      -1, false
    ));
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: ty.value }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[{
        position: 'absolute', left: x, top: y,
        width: size, height: size, borderRadius: size / 2,
        backgroundColor: '#ffd700',
      }, style]}
    />
  );
};

// ─── TYPEWRITER ───────────────────────────────────────────────────────────────
const HEADLINE_TEXT = 'The past is a gold mine.';
const GOLD_START    = 15; // index where "gold mine." begins

const TypewriterHeadline = ({ onDone }: { onDone: () => void }) => {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idxRef   = useRef(0);

  useEffect(() => {
    const tick = () => {
      if (idxRef.current < HEADLINE_TEXT.length) {
        idxRef.current += 1;
        setDisplayed(HEADLINE_TEXT.slice(0, idxRef.current));
        timerRef.current = setTimeout(tick, 44 + Math.random() * 28);
      } else {
        setDone(true);
        onDone();
      }
    };
    timerRef.current = setTimeout(tick, 120);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  const part1 = displayed.slice(0, Math.min(displayed.length, GOLD_START));
  const part2 = displayed.length > GOLD_START ? displayed.slice(GOLD_START) : '';

  return (
    <Text style={twStyles.headline}>
      {part1}
      {part2 ? <Text style={twStyles.gold}>{part2}</Text> : null}
      {!done && <Text style={twStyles.cursor}>|</Text>}
    </Text>
  );
};

const twStyles = StyleSheet.create({
  headline: { fontSize: 46, fontWeight: '800', color: '#fff', lineHeight: 54, letterSpacing: -1.8, marginBottom: 16 },
  gold:     { color: '#ffd700' },
  cursor:   { color: '#ffd700', fontWeight: '200' },
});

// ─── NOTIFICATION SHEET ───────────────────────────────────────────────────────
const NotificationPrompt = ({
  onDone,
  targetRoute,
}: {
  onDone: (route: string) => void;
  targetRoute: string;
}) => {
  const opacity  = useSharedValue(0);
  const slideY   = useSharedValue(40);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 400 });
    slideY.value  = withTiming(0, { duration: 400, easing: Easing.out(Easing.cubic) });
  }, []);

  const sheetStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: slideY.value }],
  }));

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

  const handleFinalAction = async (granted: boolean) => {
    if (granted) await requestPushPermissions();
    await AsyncStorage.setItem('notif_prompt_seen', 'true');
    onDone(targetRoute);
  };

  return (
    <View style={styles.notifBackdrop}>
      <Animated.View style={[styles.notifSheet, sheetStyle]}>
        <View style={styles.sheetHandle} />

        <View style={styles.notifHeader}>
          <LinearGradient colors={['#ffd700', '#c9950c']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.notifIconGrad}>
            <Bell color="#0a0c10" size={26} strokeWidth={2.2} />
          </LinearGradient>
          <TouchableOpacity onPress={() => handleFinalAction(false)} style={styles.notifSkipPill} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={styles.notifSkipText}>Skip</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.notifEyebrow}>ONE STORY A DAY</Text>
        <Text style={styles.notifTitle}>Don't miss{'\n'}<Text style={styles.notifTitleGold}>history.</Text></Text>
        <Text style={styles.notifSubtitle}>
          The most important events happen once. Get notified the moment we unearth a golden nugget of wisdom.
        </Text>

        <View style={styles.notifFeatures}>
          <View style={styles.notifFeatureRow}>
            <View style={styles.notifFeatureIcon}><Zap color="#ffd700" size={15} /></View>
            <View style={styles.notifFeatureTexts}>
              <Text style={styles.notifFeatureTitle}>Daily historical insights</Text>
              <Text style={styles.notifFeatureDesc}>Curated moments, every morning.</Text>
            </View>
          </View>
          <View style={styles.notifDivider} />
          <View style={styles.notifFeatureRow}>
            <View style={styles.notifFeatureIcon}><ShieldCheck color="#ffd700" size={15} /></View>
            <View style={styles.notifFeatureTexts}>
              <Text style={styles.notifFeatureTitle}>No spam, ever</Text>
              <Text style={styles.notifFeatureDesc}>One notification. Nothing more.</Text>
            </View>
          </View>
        </View>

        <Pressable onPress={() => handleFinalAction(true)} style={styles.notifMainBtn}>
          <LinearGradient colors={['#ffd700', '#c9950c']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.notifMainBtnGrad}>
            <Bell color="#0a0c10" size={17} strokeWidth={2.5} style={{ marginRight: 9 }} />
            <Text style={styles.notifMainBtnText}>Enable Notifications</Text>
          </LinearGradient>
        </Pressable>

        <TouchableOpacity onPress={() => handleFinalAction(false)} activeOpacity={0.6} style={styles.notifLaterBtn}>
          <Text style={styles.notifLaterText}>I'll check manually</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

// ─── MAIN SCREEN ──────────────────────────────────────────────────────────────
export default function WelcomeScreen() {
  const router = useRouter();
  const [showNotifPrompt, setShowNotifPrompt] = useState(false);
  const [pendingRoute, setPendingRoute]       = useState('');
  const [typingDone, setTypingDone]           = useState(false);

  // All entry anims via reanimated
  const brandOpacity  = useSharedValue(0);
  const brandY        = useSharedValue(-18);
  const lineOpacity   = useSharedValue(0);
  const lineScaleX    = useSharedValue(0);
  const headlineOp    = useSharedValue(0);
  const taglineOp     = useSharedValue(0);
  const btnOpacity    = useSharedValue(0);
  const btnY          = useSharedValue(18);

  useEffect(() => {
    // Brand in
    brandOpacity.value = withDelay(350, withTiming(1, { duration: 650 }));
    brandY.value       = withDelay(350, withTiming(0, { duration: 650, easing: Easing.out(Easing.cubic) }));
    // Line draw
    lineOpacity.value  = withDelay(900, withTiming(1, { duration: 300 }));
    lineScaleX.value   = withDelay(900, withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) }));
    // Headline
    headlineOp.value   = withDelay(1300, withTiming(1, { duration: 250 }));
  }, []);

  useEffect(() => {
    if (!typingDone) return;
    taglineOp.value = withTiming(1, { duration: 500 });
    btnOpacity.value= withDelay(200, withTiming(1, { duration: 500 }));
    btnY.value      = withDelay(200, withTiming(0, { duration: 500, easing: Easing.out(Easing.cubic) }));
  }, [typingDone]);

  const brandStyle    = useAnimatedStyle(() => ({ opacity: brandOpacity.value, transform: [{ translateY: brandY.value }] }));
  const lineStyle     = useAnimatedStyle(() => ({ opacity: lineOpacity.value, transform: [{ scaleX: lineScaleX.value }] }));
  const headlineStyle = useAnimatedStyle(() => ({ opacity: headlineOp.value }));
  const taglineStyle  = useAnimatedStyle(() => ({ opacity: taglineOp.value }));
  const btnStyle      = useAnimatedStyle(() => ({ opacity: btnOpacity.value, transform: [{ translateY: btnY.value }] }));

  const handleAction = (route: string) => {
    setPendingRoute(route);
    setShowNotifPrompt(true);
  };

  const onNotifComplete = (route: string) => {
    setShowNotifPrompt(false);
    router.push(route as any);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* ── Two scrolling columns with per-card Ken Burns ── */}
      <View style={styles.mosaic}>
        <ScrollingColumn images={COLUMN_1} duration={38000} />
        <View style={{ width: 10 }} />
        <ScrollingColumn images={COLUMN_2} duration={29000} reverse />
      </View>

      {/* ── Gold dust particles ── */}
      {PARTICLES.map(p => <GoldParticle key={p.id} {...p} />)}

      {/* ── Deep layered gradient ── */}
      <LinearGradient
        colors={[
          'rgba(10,12,16,0.05)',
          'rgba(10,12,16,0.22)',
          'rgba(10,12,16,0.62)',
          'rgba(10,12,16,0.90)',
          '#0a0c10',
        ]}
        locations={[0, 0.15, 0.42, 0.65, 0.85]}
        style={styles.gradient}
        pointerEvents="none"
      />



      {/* ── UI content ── */}
      <View style={styles.content}>

        {/* Brand */}
        <Animated.View style={[styles.brandRow, brandStyle]}>
          <View style={styles.logoMark}>
            <Text style={styles.logoLetter}>D</Text>
          </View>
          <View>
            <Text style={styles.brandName}>Daily<Text style={styles.brandGold}>History</Text></Text>
            <Text style={styles.brandSub}>Since the beginning of time.</Text>
          </View>
        </Animated.View>

        {/* Rule */}
        <Animated.View style={[styles.rule, lineStyle]} />

        {/* Typewriter headline */}
        <Animated.View style={headlineStyle}>
          <TypewriterHeadline onDone={() => setTypingDone(true)} />
        </Animated.View>

        {/* Tagline */}
        <Animated.Text style={[styles.tagline, taglineStyle]}>
          One untold story from history, delivered to you every single day.
        </Animated.Text>

        {/* Buttons */}
        <Animated.View style={[styles.btnGroup, btnStyle]}>
          <Pressable
            onPress={() => handleAction('/(auth)/register')}
            style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.86 }]}
          >
            <LinearGradient colors={['#ffd700', '#c9950c']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.primaryGrad}>
              <Text style={styles.primaryText}>Begin Your Journey</Text>
            </LinearGradient>
          </Pressable>

          <TouchableOpacity onPress={() => handleAction('/(auth)/login')} style={styles.secondaryBtn} activeOpacity={0.7}>
            <Text style={styles.secondaryText}>
              Already a member?{'  '}<Text style={styles.secondaryGold}>Sign In</Text>
            </Text>
          </TouchableOpacity>
        </Animated.View>

      </View>

      <Modal visible={showNotifPrompt} transparent animationType="none">
        <NotificationPrompt onDone={onNotifComplete} targetRoute={pendingRoute} />
      </Modal>
    </View>
  );
}

// ─── STYLES ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0c10' },

  mosaic: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    paddingHorizontal: 8,
  },

  gradient: { ...StyleSheet.absoluteFillObject },

  content: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 26,
    paddingBottom: 50,
  },

  // Brand
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 13, marginBottom: 22 },
  logoMark: {
    width: 44, height: 44, borderRadius: 13,
    backgroundColor: '#ffd700',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#ffd700', shadowOpacity: 0.6, shadowRadius: 16, shadowOffset: { width: 0, height: 0 },
    elevation: 10,
  },
  logoLetter: { fontSize: 24, fontWeight: '900', color: '#0a0c10', letterSpacing: -1 },
  brandName:  { fontSize: 20, fontWeight: '800', color: '#fff', letterSpacing: -0.3 },
  brandGold:  { color: '#ffd700' },
  brandSub:   { fontSize: 11, color: 'rgba(255,255,255,0.2)', marginTop: 1, letterSpacing: 0.4 },

  rule: {
    height: 1,
    backgroundColor: 'rgba(255,215,0,0.18)',
    marginBottom: 26,
    transformOrigin: 'left',
  },

  tagline: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.34)',
    lineHeight: 23,
    letterSpacing: 0.1,
    marginBottom: 40,
    maxWidth: width * 0.74,
  },

  btnGroup:    { gap: 0 },
  primaryBtn:  { borderRadius: 14, overflow: 'hidden', marginBottom: 18 },
  primaryGrad: { height: 56, justifyContent: 'center', alignItems: 'center' },
  primaryText: { color: '#0a0c10', fontWeight: '800', fontSize: 15, letterSpacing: 0.2 },
  secondaryBtn: { alignItems: 'center', paddingVertical: 4 },
  secondaryText:{ color: 'rgba(255,255,255,0.26)', fontSize: 14 },
  secondaryGold:{ color: '#ffd700', fontWeight: '700' },

  // Notif
  notifBackdrop: { flex: 1, backgroundColor: 'rgba(4,5,8,0.88)', justifyContent: 'flex-end' },
  notifSheet: {
    backgroundColor: '#0d0f14',
    borderTopLeftRadius: 30, borderTopRightRadius: 30,
    paddingHorizontal: 28, paddingBottom: 50,
    borderWidth: 1, borderColor: '#1a1c24', borderBottomWidth: 0,
  },
  sheetHandle: {
    width: 38, height: 3, borderRadius: 99,
    backgroundColor: 'rgba(255,215,0,0.28)',
    alignSelf: 'center', marginTop: 14, marginBottom: 24,
  },
  notifHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  notifIconGrad: {
    width: 54, height: 54, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#ffd700', shadowOpacity: 0.45, shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 }, elevation: 10,
  },
  notifSkipPill: {
    paddingVertical: 6, paddingHorizontal: 16, borderRadius: 20,
    backgroundColor: '#111318', borderWidth: 1, borderColor: '#1e2028',
  },
  notifSkipText:    { color: '#2a2d38', fontSize: 13, fontWeight: '600', letterSpacing: 0.3 },
  notifEyebrow:     { color: '#ffd700', fontSize: 10, fontWeight: '800', letterSpacing: 3.5, marginBottom: 10, opacity: 0.6 },
  notifTitle:       { fontSize: 36, fontWeight: '800', color: '#fff', letterSpacing: -1.2, lineHeight: 42, marginBottom: 12 },
  notifTitleGold:   { color: '#ffd700' },
  notifSubtitle:    { fontSize: 14, color: '#3a3d47', lineHeight: 22, marginBottom: 26, maxWidth: width * 0.82 },
  notifFeatures:    { backgroundColor: '#111318', borderRadius: 16, borderWidth: 1, borderColor: '#1e2028', marginBottom: 26, overflow: 'hidden' },
  notifFeatureRow:  { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14 },
  notifFeatureIcon: { width: 32, height: 32, borderRadius: 9, backgroundColor: 'rgba(255,215,0,0.08)', justifyContent: 'center', alignItems: 'center' },
  notifFeatureTexts:{ flex: 1 },
  notifFeatureTitle:{ color: '#fff', fontWeight: '700', fontSize: 13, marginBottom: 2 },
  notifFeatureDesc: { color: '#3a3d47', fontSize: 12 },
  notifDivider:     { height: 1, backgroundColor: '#1a1c24', marginHorizontal: 16 },
  notifMainBtn:     { borderRadius: 14, overflow: 'hidden', marginBottom: 14 },
  notifMainBtnGrad: { height: 56, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  notifMainBtnText: { color: '#0a0c10', fontWeight: '800', fontSize: 15, letterSpacing: 0.2 },
  notifLaterBtn:    { alignItems: 'center', paddingVertical: 8 },
  notifLaterText:   { color: '#272a34', fontSize: 13, fontWeight: '600' },
});