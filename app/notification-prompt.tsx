import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';
import { LinearGradient } from 'expo-linear-gradient';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { Bell, ShieldCheck, Zap } from 'lucide-react-native';
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const { width, height } = Dimensions.get('window');

export default function NotificationPrompt() {
  const router = useRouter();

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const iconScaleAnim = useRef(new Animated.Value(0.6)).current;
  const iconFadeAnim = useRef(new Animated.Value(0)).current;
  const feature1Anim = useRef(new Animated.Value(0)).current;
  const feature2Anim = useRef(new Animated.Value(0)).current;
  const btnAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      // Icon pops in first
      Animated.parallel([
        Animated.spring(iconScaleAnim, { toValue: 1, useNativeDriver: true, tension: 60, friction: 8 }),
        Animated.timing(iconFadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]),
      // Title + subtitle slide up
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
      ]),
      // Feature cards stagger
      Animated.stagger(120, [
        Animated.timing(feature1Anim, { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.timing(feature2Anim, { toValue: 1, duration: 350, useNativeDriver: true }),
      ]),
      // Button fades in
      Animated.timing(btnAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
  }, []);

  // ------------------ REQUEST PERMISSIONS ------------------
  const requestPushPermissions = async () => {
    if (!Device.isDevice) {
      console.log('Must use physical device for Push Notifications');
      return;
    }
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.log('Permission denied');
      return;
    }
    const token = (await Notifications.getExpoPushTokenAsync()).data;
    console.log('Push token:', token);
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
      });
    }
  };
  // ----------------------------------------------------------

  const handleEnable = async () => {
    try {
      await AsyncStorage.setItem('notif_prompt_seen', 'true');
      await requestPushPermissions();
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
      {/* Background accents */}
      <View style={styles.bgGlowTop} />
      <View style={styles.bgGlowBottom} />

      {/* Thin gold top bar */}
      <View style={styles.topBar} />

      {/* Skip button */}
      <TouchableOpacity style={styles.skipButton} onPress={handleSkip} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      <View style={styles.content}>

        {/* Icon area */}
        <Animated.View style={[styles.iconArea, { opacity: iconFadeAnim, transform: [{ scale: iconScaleAnim }] }]}>
          {/* Rings */}
          <View style={styles.ring3} />
          <View style={styles.ring2} />
          <View style={styles.ring1} />
          {/* Core */}
          <LinearGradient colors={['#ffd700', '#c9950c']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.iconCircle}>
            <Bell color="#0a0c10" size={36} strokeWidth={2.2} />
          </LinearGradient>
        </Animated.View>

        {/* Heading */}
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          <Text style={styles.eyebrow}>DAILY HISTORY</Text>
          <Text style={styles.title}>
            Stay in the{'\n'}
            <Text style={styles.titleGold}>loop.</Text>
          </Text>
          <Text style={styles.subtitle}>
            One notification a day. One untold story that changed the world. Never miss it.
          </Text>
        </Animated.View>

        {/* Feature cards */}
        <View style={styles.features}>
          <Animated.View style={[styles.featureCard, { opacity: feature1Anim, transform: [{ translateX: feature1Anim.interpolate({ inputRange: [0, 1], outputRange: [-16, 0] }) }] }]}>
            <View style={styles.featureIconWrap}>
              <Zap color="#ffd700" size={17} />
            </View>
            <View style={styles.featureTextWrap}>
              <Text style={styles.featureTitle}>Daily insights</Text>
              <Text style={styles.featureDesc}>Curated historical moments, every morning.</Text>
            </View>
          </Animated.View>

          <Animated.View style={[styles.featureCard, { opacity: feature2Anim, transform: [{ translateX: feature2Anim.interpolate({ inputRange: [0, 1], outputRange: [-16, 0] }) }] }]}>
            <View style={styles.featureIconWrap}>
              <ShieldCheck color="#ffd700" size={17} />
            </View>
            <View style={styles.featureTextWrap}>
              <Text style={styles.featureTitle}>No spam, ever</Text>
              <Text style={styles.featureDesc}>One story per day. Nothing more, nothing less.</Text>
            </View>
          </Animated.View>
        </View>

        {/* CTA Button */}
        <Animated.View style={[styles.btnWrapper, { opacity: btnAnim }]}>
          <Pressable onPress={handleEnable} style={styles.mainButton}>
            <LinearGradient
              colors={['#ffd700', '#c9950c']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradientButton}
            >
              <Bell color="#0a0c10" size={18} strokeWidth={2.5} style={{ marginRight: 10 }} />
              <Text style={styles.buttonText}>Enable Notifications</Text>
            </LinearGradient>
          </Pressable>

          <TouchableOpacity onPress={handleSkip} activeOpacity={0.6} style={styles.maybeLater}>
            <Text style={styles.maybeLaterText}>I'll check manually</Text>
          </TouchableOpacity>
        </Animated.View>

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0c10',
  },

  // Thin gold accent bar at top
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#ffd700',
    opacity: 0.6,
  },

  // Background glow orbs
  bgGlowTop: {
    position: 'absolute',
    top: -60,
    alignSelf: 'center',
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(255, 215, 0, 0.06)',
  },
  bgGlowBottom: {
    position: 'absolute',
    bottom: -80,
    right: -60,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(255, 215, 0, 0.03)',
  },

  skipButton: {
    position: 'absolute',
    top: 58,
    right: 28,
    zIndex: 10,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#111318',
    borderWidth: 1,
    borderColor: '#1e2028',
  },
  skipText: {
    color: '#3a3d47',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.3,
  },

  content: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: height * 0.13,
    paddingBottom: 48,
    justifyContent: 'space-between',
  },

  // Icon with pulse rings
  iconArea: {
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    width: 160,
    height: 160,
  },
  ring1: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
  },
  ring2: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.1)',
  },
  ring3: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.05)',
  },
  iconCircle: {
    width: 76,
    height: 76,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#ffd700',
    shadowOpacity: 0.5,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 0 },
    elevation: 16,
  },

  // Text
  eyebrow: {
    color: '#ffd700',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 3,
    marginBottom: 12,
    opacity: 0.7,
  },
  title: {
    fontSize: 44,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -1.5,
    lineHeight: 50,
    marginBottom: 16,
  },
  titleGold: {
    color: '#ffd700',
  },
  subtitle: {
    fontSize: 15,
    color: '#3a3d47',
    lineHeight: 23,
    letterSpacing: 0.1,
    maxWidth: width * 0.78,
  },

  // Feature cards
  features: {
    gap: 10,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111318',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1e2028',
    gap: 14,
  },
  featureIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 215, 0, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureTextWrap: {
    flex: 1,
  },
  featureTitle: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
    letterSpacing: 0.1,
    marginBottom: 2,
  },
  featureDesc: {
    color: '#3a3d47',
    fontSize: 12,
    letterSpacing: 0.1,
  },

  // Buttons
  btnWrapper: {
    gap: 0,
  },
  mainButton: {
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 16,
  },
  gradientButton: {
    height: 56,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: '#0a0c10',
    fontWeight: '800',
    fontSize: 15,
    letterSpacing: 0.3,
  },
  maybeLater: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  maybeLaterText: {
    color: '#2e3039',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});