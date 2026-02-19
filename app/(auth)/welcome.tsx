import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useMemo } from 'react';
import { Dimensions, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming
} from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

// --- 1. CONFIG: URL-urile tale Cloudinary ---
const HISTORICAL_IMAGES = [
  'https://res.cloudinary.com/dimwqrltb/image/upload/v1771459289/history_app/sec_1942_2.jpg',
  'https://res.cloudinary.com/dimwqrltb/image/upload/v1771459288/history_app/sec_1915_1.jpg',
  'https://res.cloudinary.com/dimwqrltb/image/upload/v1771372849/history_app/sec_1938_1.jpg',
  'https://res.cloudinary.com/dimwqrltb/image/upload/v1771459286/history_app/sec_1942_0.jpg',
  'https://res.cloudinary.com/dimwqrltb/image/upload/v1771459286/history_app/sec_1942_0.jpg',
  'https://res.cloudinary.com/dimwqrltb/image/upload/v1771459286/history_app/sec_1942_0.jpg',
  'https://res.cloudinary.com/dimwqrltb/image/upload/v1771459286/history_app/sec_1942_0.jpg',
];

interface ScrollingColumnProps {
  images: string[];
  duration?: number;
  reverse?: boolean;
}

// --- 2. SUB-COMPONENT: ANIMATED COLUMN ---
const ScrollingColumn = ({ images, duration = 20000, reverse = false }: ScrollingColumnProps) => {
  const translateY = useSharedValue(0);

  // Triplăm array-ul pentru a fi siguri că nu rămâne spațiu gol în timpul tranziției
  const tripledImages = [...images, ...images, ...images];

  const itemHeight = 265; // 250 inaltime + 15 margin
  const totalSingleListHeight = images.length * itemHeight;

  useEffect(() => {
    // Resetăm poziția inițială pentru coloana care merge invers
    if (reverse) {
      translateY.value = -totalSingleListHeight;
    }

    translateY.value = withRepeat(
      withTiming(reverse ? 0 : -totalSingleListHeight, {
        duration: duration,
        easing: Easing.linear,
      }),
      -1, // Infinit
      false // Nu face yoyo
    );
  }, [totalSingleListHeight, duration, reverse]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <View style={styles.columnWrapper}>
      <Animated.View style={[styles.column, animatedStyle]}>
        {tripledImages.map((img, index) => (
          <View key={`${index}`} style={styles.imageContainer}>
            <Image
              source={{ uri: img }}
              style={styles.image}
              resizeMode="cover"
            />
          </View>
        ))}
      </Animated.View>
    </View>
  );
};

// --- 3. MAIN SCREEN ---
export default function WelcomeScreen() {
  const router = useRouter();

  // Generăm datele amestecate
  const column1Data = useMemo(() => [...HISTORICAL_IMAGES].sort(() => Math.random() - 0.5), []);
  const column2Data = useMemo(() => [...HISTORICAL_IMAGES].sort(() => Math.random() - 0.5), []);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <View style={styles.animationContainer}>
        {/* Coloana 1: Urcă lent */}
        <ScrollingColumn images={column1Data} duration={35000} />

        {/* Coloana 2: Coboară mai repede */}
        <ScrollingColumn images={column2Data} duration={25000} reverse={true} />
      </View>

      <LinearGradient
        colors={['transparent', 'rgba(14, 17, 23, 0.7)', '#0e1117', '#0e1117']}
        locations={[0, 0.2, 0.5, 1]}
        style={styles.gradientOverlay}
      >
        <View style={styles.contentContainer}>
          <Text style={styles.brand}>DAILY<Text style={styles.gold}>HISTORY</Text></Text>

          <View style={styles.textBlock}>
            <Text style={styles.headline}>The past is a gold mine.</Text>
            <Text style={styles.tagline}>
              Get your daily nugget of wisdom delivered in a visual story.
            </Text>
            <Text style={styles.taglinenotif}>
              Activate notifications for a premium historical experience.
            </Text>
          </View>

          <View style={styles.buttonContainer}>
  <TouchableOpacity
    style={styles.mainButton}
    // START JOURNEY -> de obicei duce la Înregistrare (Register)
    onPress={() => router.push('/(auth)/register')} 
    activeOpacity={0.85}
  >
    <Text style={styles.buttonText}>Start Journey</Text>
  </TouchableOpacity>

  <TouchableOpacity
    style={styles.secondaryButton}
    // SIGN IN -> trebuie să ducă la ecranul de Login
    onPress={() => router.push('/(auth)/login')} 
  >
    <Text style={styles.secondaryButtonText}>
      Have an account? <Text style={styles.gold}>Sign In</Text>
    </Text>
  </TouchableOpacity>
</View>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0e1117' },
  animationContainer: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    opacity: 0.5,
  },
  columnWrapper: { flex: 1, overflow: 'hidden' },
  column: { paddingHorizontal: 6 },
  imageContainer: {
    width: '100%',
    height: 250,
    marginBottom: 15,
    borderRadius: 20,
    backgroundColor: '#1a1c23',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  image: { width: '100%', height: '100%' },
  gradientOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 25,
    paddingBottom: 60,
  },
  contentContainer: { width: '100%', alignItems: 'center' },
  brand: { fontSize: 22, fontWeight: '900', color: '#fff', letterSpacing: 6, marginBottom: 35 },
  gold: { color: '#ffd700' },
  textBlock: { marginBottom: 45, alignItems: 'center' },
  headline: { color: '#fff', fontSize: 38, fontWeight: '800', textAlign: 'center', lineHeight: 44 },
  tagline: { color: '#aaaaaa', fontSize: 16, textAlign: 'center', marginTop: 12, paddingHorizontal: 15, lineHeight: 24 },
  taglinenotif: { color: '#ffd700', fontSize: 14, textAlign: 'center', marginTop: 15, fontWeight: '600' },
  buttonContainer: { width: '100%', gap: 12 },
  mainButton: {
    backgroundColor: '#ffd700',
    paddingVertical: 18,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: '#ffd700',
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8
  },
  buttonText: { color: '#000', fontWeight: '900', fontSize: 18, textTransform: 'uppercase' },
  secondaryButton: { alignItems: 'center', paddingVertical: 12 },
  secondaryButtonText: { color: '#fff', fontSize: 15, fontWeight: '500' }
});