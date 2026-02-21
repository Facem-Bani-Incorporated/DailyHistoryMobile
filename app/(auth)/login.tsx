import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Eye, Lock, Mail } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import api from '../../api';
import { useAuthStore } from '../../store/useAuthStore';
import { authService } from '../services/authService';

// Real Google "G" logo in official brand colors
function GoogleIcon({ size = 22 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <Path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <Path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <Path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.96 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
      <Path fill="none" d="M0 0h48v48H0z"/>
    </Svg>
  );
}

export default function LoginScreen() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);

  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ email: '', password: '' });
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const formFadeAnim = useRef(new Animated.Value(0)).current;
  const formSlideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 700, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(formFadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(formSlideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
      ]),
    ]).start();

    GoogleSignin.configure({
      webClientId: '49902921378-4k5mjec67t0pnu0jrfti1bejpi1e5u3h.apps.googleusercontent.com',
      offlineAccess: true,
    });
  }, []);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();
      const idToken = response.data?.idToken;
      if (idToken) {
        handleBackendGoogleLogin(idToken);
      } else {
        Alert.alert('Eroare', 'Nu s-a putut obține jetonul de la Google.');
        setIsLoading(false);
      }
    } catch (error: any) {
      setIsLoading(false);
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        console.log('Utilizatorul a anulat logarea');
      } else if (error.code === statusCodes.IN_PROGRESS) {
        console.log('Operatiune in curs');
      } else {
        console.error('Google Sign-In Error:', error);
        Alert.alert('Eroare Google', 'Asigură-te că rulezi pe un dispozitiv cu Google Play Services.');
      }
    }
  };

  const handleBackendGoogleLogin = async (googleIdToken: string) => {
    try {
      setIsLoading(true);
      try {
        await GoogleSignin.signOut();
        console.log('Google Session curățată cu succes.');
      } catch (signOutError) {
        console.log('Niciun cont Google logat anterior.');
      }
      console.log('Trimit ID Token la Railway...');
      await authService.loginWithGoogle(googleIdToken);
      router.replace('/(main)');
    } catch (error: any) {
      console.error('Detalii eroare Railway:', error.response?.data);
      Alert.alert(
        'Eroare Server',
        error.response?.data?.message || 'Validarea Google a eșuat.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!form.email || !form.password) return;
    setIsLoading(true);
    try {
      const res = await api.post('/auth/signin', {
        username: form.email,
        password: form.password,
      });
      const { token, accessToken, ...userData } = res.data;
      const finalToken = token || accessToken;
      if (finalToken) {
        setAuth(finalToken, userData);
        router.replace('/(main)');
      }
    } catch (e: any) {
      Alert.alert('Eroare', 'Date de logare incorecte.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <StatusBar style="light" />

      {/* Subtle background accent */}
      <View style={styles.bgAccent} />
      <View style={styles.bgAccentBottom} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View style={[styles.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.logoRow}>
            <View style={styles.logoMark}>
              <Text style={styles.logoMarkText}>D</Text>
            </View>
            <View>
              <Text style={styles.title}>
                Daily<Text style={styles.titleGold}>History</Text>
              </Text>
              <Text style={styles.tagline}>Every day, a new story from the past.</Text>
            </View>
          </View>
        </Animated.View>

        {/* Form */}
        <Animated.View style={[styles.form, { opacity: formFadeAnim, transform: [{ translateY: formSlideAnim }] }]}>
          <Text style={styles.formHeading}>Welcome back</Text>
          <Text style={styles.formSubheading}>Sign in to your account</Text>

          {/* Email Input */}
          <View style={[styles.inputWrapper, focusedField === 'email' && styles.inputWrapperFocused]}>
            <Mail color={focusedField === 'email' ? '#ffd700' : '#444'} size={18} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Email address"
              placeholderTextColor="#444"
              value={form.email}
              onChangeText={(text) => setForm({ ...form, email: text })}
              autoCapitalize="none"
              keyboardType="email-address"
              onFocus={() => setFocusedField('email')}
              onBlur={() => setFocusedField(null)}
            />
          </View>

          {/* Password Input */}
          <View style={[styles.inputWrapper, focusedField === 'password' && styles.inputWrapperFocused]}>
            <Lock color={focusedField === 'password' ? '#ffd700' : '#444'} size={18} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#444"
              secureTextEntry={!showPassword}
              value={form.password}
              onChangeText={(text) => setForm({ ...form, password: text })}
              onFocus={() => setFocusedField('password')}
              onBlur={() => setFocusedField(null)}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Eye color={showPassword ? '#ffd700' : '#444'} size={18} />
            </TouchableOpacity>
          </View>

          {/* Sign In Button */}
          <Pressable style={styles.loginButton} onPress={handleLogin} disabled={isLoading}>
            <LinearGradient
              colors={['#ffd700', '#c9950c']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradientButton}
            >
              {isLoading ? (
                <ActivityIndicator color="#0e1117" />
              ) : (
                <Text style={styles.loginButtonText}>Sign In</Text>
              )}
            </LinearGradient>
          </Pressable>

          {/* Divider */}
          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Google Button — styled like the real Google Sign-In button */}
          <TouchableOpacity
            style={styles.socialButton}
            onPress={handleGoogleSignIn}
            disabled={isLoading}
            activeOpacity={0.85}
          >
            {isLoading ? (
              <ActivityIndicator color="#444" />
            ) : (
              <>
                <View style={styles.googleIconWrapper}>
                  <GoogleIcon size={22} />
                </View>
                <Text style={styles.socialButtonText}>Sign in with Google</Text>
              </>
            )}
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0c10',
  },

  // Background accents — subtle radial glow effects
  bgAccent: {
    position: 'absolute',
    top: -80,
    left: -80,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(255, 215, 0, 0.045)',
  },
  bgAccentBottom: {
    position: 'absolute',
    bottom: -100,
    right: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(255, 215, 0, 0.03)',
  },

  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingTop: 80,
    paddingBottom: 40,
  },

  // Header / Logo
  header: {
    marginBottom: 56,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  logoMark: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#ffd700',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoMarkText: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0a0c10',
    letterSpacing: -1,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.5,
  },
  titleGold: {
    color: '#ffd700',
  },
  tagline: {
    fontSize: 12,
    color: '#3a3d47',
    marginTop: 2,
    letterSpacing: 0.2,
  },

  // Form section
  form: {
    gap: 14,
  },
  formHeading: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.6,
    marginBottom: 2,
  },
  formSubheading: {
    fontSize: 14,
    color: '#3a3d47',
    marginBottom: 10,
  },

  // Inputs
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111318',
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 58,
    borderWidth: 1,
    borderColor: '#1e2028',
  },
  inputWrapperFocused: {
    borderColor: 'rgba(255, 215, 0, 0.4)',
    backgroundColor: '#13151b',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: '#fff',
    fontSize: 15,
    letterSpacing: 0.1,
  },

  // Primary button
  loginButton: {
    marginTop: 8,
    borderRadius: 14,
    overflow: 'hidden',
  },
  gradientButton: {
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginButtonText: {
    color: '#0a0c10',
    fontWeight: '800',
    fontSize: 15,
    letterSpacing: 0.3,
  },

  // Divider
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 6,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#1a1c22',
  },
  dividerText: {
    color: '#2e3039',
    marginHorizontal: 14,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },

  // Google button — white background like the real thing
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    height: 56,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    gap: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  googleIconWrapper: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  socialButtonText: {
    color: '#3c4043',
    fontWeight: '600',
    fontSize: 15,
    letterSpacing: 0.1,
    flex: 1,
    textAlign: 'center',
    marginRight: 40, // visually center text accounting for icon width
  },
});