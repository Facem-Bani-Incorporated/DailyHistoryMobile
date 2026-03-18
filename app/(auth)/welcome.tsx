import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ChevronRight } from 'lucide-react-native';
import { useEffect } from 'react';
import {
  Dimensions,
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

const COLUMN_1 = HISTORICAL_IMAGES.slice(0, 5);
const COLUMN_2 = HISTORICAL_IMAGES.slice(4, 9);

const CARD_H = 200;
const GAP = 8;

// ─── IMAGE CARD ───────────────────────────────────────────────────────────────
const ImageCard = ({ uri }: { uri: string }) => (
  <View style={cardStyles.card}>
    <Animated.Image source={{ uri }} style={cardStyles.img} resizeMode="cover" />
    <View style={cardStyles.overlay} />
  </View>
);

const cardStyles = StyleSheet.create({
  card: {
    width: '100%',
    height: CARD_H,
    marginBottom: GAP,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#111318',
  },
  img: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(11,13,17,0.12)',
  },
});

// ─── SCROLLING COLUMN ─────────────────────────────────────────────────────────
const ScrollingColumn = ({
  images,
  duration,
  reverse,
}: {
  images: string[];
  duration: number;
  reverse?: boolean;
}) => {
  const TOTAL_H = images.length * (CARD_H + GAP);
  const translateY = useSharedValue(reverse ? -TOTAL_H : 0);
  const tripled = [...images, ...images, ...images];

  useEffect(() => {
    translateY.value = withRepeat(
      withTiming(reverse ? 0 : -TOTAL_H, { duration, easing: Easing.linear }),
      -1,
      false
    );
  }, []);

  const colStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <View style={{ flex: 1, overflow: 'hidden' }}>
      <Animated.View style={colStyle}>
        {tripled.map((uri, i) => (
          <ImageCard key={`${i}-${uri}`} uri={uri} />
        ))}
      </Animated.View>
    </View>
  );
};

// ─── MAIN WELCOME SCREEN ─────────────────────────────────────────────────────
export default function WelcomeScreen() {
  const router = useRouter();

  // Content animations
  const contentOpacity = useSharedValue(0);
  const contentY = useSharedValue(30);

  useEffect(() => {
    contentOpacity.value = withDelay(
      600,
      withTiming(1, { duration: 800, easing: Easing.out(Easing.cubic) })
    );
    contentY.value = withDelay(
      600,
      withTiming(0, { duration: 800, easing: Easing.out(Easing.cubic) })
    );
  }, []);

  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ translateY: contentY.value }],
  }));

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Scrolling image mosaic */}
      <View style={styles.mosaic}>
        <ScrollingColumn images={COLUMN_1} duration={40000} />
        <View style={{ width: GAP }} />
        <ScrollingColumn images={COLUMN_2} duration={32000} reverse />
      </View>

      {/* Gradient overlays */}
      <LinearGradient
        colors={[
          'rgba(11,13,17,0.0)',
          'rgba(11,13,17,0.15)',
          'rgba(11,13,17,0.55)',
          'rgba(11,13,17,0.88)',
          '#0B0D11',
        ]}
        locations={[0, 0.2, 0.45, 0.65, 0.82]}
        style={styles.gradient}
        pointerEvents="none"
      />

      {/* Content */}
      <Animated.View style={[styles.content, contentStyle]}>
        {/* Brand pill */}
        <View style={styles.brandPill}>
          <LinearGradient
            colors={['#D4A017', '#F5CE50']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.brandPillIcon}
          >
            <Text style={styles.brandPillLetter}>D</Text>
          </LinearGradient>
          <Text style={styles.brandPillText}>DailyHistory</Text>
        </View>

        {/* Headline */}
        <Text style={styles.headline}>
          History,{'\n'}
          <Text style={styles.headlineGold}>one story</Text>{'\n'}
          at a time.
        </Text>

        <Text style={styles.tagline}>
          Discover one remarkable moment from the past, delivered fresh every single day.
        </Text>

        {/* CTA Buttons — go directly to register/login */}
        <View style={styles.btnGroup}>
          <Pressable
            onPress={() => router.push('/(auth)/register')}
            style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.85 }]}
          >
            <Text style={styles.primaryBtnText}>Get Started</Text>
            <ChevronRight color="#0B0D11" size={18} strokeWidth={2.5} />
          </Pressable>

          <TouchableOpacity
            onPress={() => router.push('/(auth)/login')}
            style={styles.secondaryBtn}
            activeOpacity={0.6}
          >
            <Text style={styles.secondaryBtnText}>
              Already a member?{' '}
              <Text style={styles.secondaryBtnLink}>Sign In</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}

// ─── STYLES ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0D11',
  },

  mosaic: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    paddingHorizontal: 6,
    opacity: 0.85,
  },

  gradient: {
    ...StyleSheet.absoluteFillObject,
  },

  content: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 56 : 40,
  },

  // Brand pill
  brandPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 100,
    paddingRight: 16,
    paddingLeft: 4,
    paddingVertical: 4,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  brandPillIcon: {
    width: 32,
    height: 32,
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  brandPillLetter: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0B0D11',
    letterSpacing: -0.5,
  },
  brandPillText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 0.1,
  },

  // Headline
  headline: {
    fontSize: 44,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 52,
    letterSpacing: -1.5,
    marginBottom: 16,
  },
  headlineGold: {
    color: '#D4A017',
  },

  tagline: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.4)',
    lineHeight: 24,
    letterSpacing: 0.1,
    marginBottom: 36,
    maxWidth: width * 0.82,
  },

  // Buttons
  btnGroup: {
    gap: 16,
  },
  primaryBtn: {
    backgroundColor: '#D4A017',
    borderRadius: 14,
    height: 56,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    shadowColor: '#D4A017',
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  primaryBtnText: {
    color: '#0B0D11',
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: 0.1,
  },
  secondaryBtn: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  secondaryBtnText: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 14,
  },
  secondaryBtnLink: {
    color: '#D4A017',
    fontWeight: '600',
  },
});