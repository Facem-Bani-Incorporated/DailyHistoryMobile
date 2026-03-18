import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Eye, EyeOff } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
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

const { width } = Dimensions.get('window');

function GoogleIcon({ size = 20 }: { size?: number }) {
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
  const slideAnim = useRef(new Animated.Value(24)).current;
  const formFadeAnim = useRef(new Animated.Value(0)).current;
  const formSlideAnim = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(formFadeAnim, { toValue: 1, duration: 450, useNativeDriver: true }),
        Animated.timing(formSlideAnim, { toValue: 0, duration: 450, useNativeDriver: true }),
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
      // Don't navigate — _layout.tsx will detect the token and show onboarding
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
        // Don't navigate — _layout.tsx will detect the token and show onboarding
      }
    } catch (e: any) {
      Alert.alert('Eroare', 'Date de logare incorecte.');
    } finally {
      setIsLoading(false);
    }
  };

  const isFormValid = form.email.length > 0 && form.password.length > 0;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <StatusBar style="light" />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo & Header */}
        <Animated.View style={[styles.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.logoContainer}>
            <LinearGradient
              colors={['#D4A017', '#F5CE50']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.logoMark}
            >
              <Text style={styles.logoMarkText}>D</Text>
            </LinearGradient>
          </View>
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Sign in to DailyHistory</Text>
        </Animated.View>

        {/* Form */}
        <Animated.View style={[styles.form, { opacity: formFadeAnim, transform: [{ translateY: formSlideAnim }] }]}>

          {/* Google Button — first, prominent */}
          <TouchableOpacity
            style={styles.googleButton}
            onPress={handleGoogleSignIn}
            disabled={isLoading}
            activeOpacity={0.7}
          >
            {isLoading ? (
              <ActivityIndicator color="#666" />
            ) : (
              <>
                <GoogleIcon size={20} />
                <Text style={styles.googleButtonText}>Continue with Google</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Email Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email</Text>
            <View style={[
              styles.inputWrapper,
              focusedField === 'email' && styles.inputWrapperFocused,
            ]}>
              <TextInput
                style={styles.input}
                placeholder="your@email.com"
                placeholderTextColor="#555"
                value={form.email}
                onChangeText={(text) => setForm({ ...form, email: text })}
                autoCapitalize="none"
                keyboardType="email-address"
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
              />
            </View>
          </View>

          {/* Password Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Password</Text>
            <View style={[
              styles.inputWrapper,
              focusedField === 'password' && styles.inputWrapperFocused,
            ]}>
              <TextInput
                style={styles.input}
                placeholder="Enter your password"
                placeholderTextColor="#555"
                secureTextEntry={!showPassword}
                value={form.password}
                onChangeText={(text) => setForm({ ...form, password: text })}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                style={styles.eyeButton}
              >
                {showPassword
                  ? <EyeOff color="#666" size={18} />
                  : <Eye color="#666" size={18} />
                }
              </TouchableOpacity>
            </View>
          </View>

          {/* Sign In Button */}
          <Pressable
            style={({ pressed }) => [
              styles.signInButton,
              !isFormValid && styles.signInButtonDisabled,
              pressed && isFormValid && { opacity: 0.85 },
            ]}
            onPress={handleLogin}
            disabled={isLoading || !isFormValid}
          >
            {isLoading ? (
              <ActivityIndicator color="#0a0c10" />
            ) : (
              <Text style={[
                styles.signInButtonText,
                !isFormValid && styles.signInButtonTextDisabled,
              ]}>Sign In</Text>
            )}
          </Pressable>
        </Animated.View>

        {/* Footer */}
        <Animated.View style={[styles.footer, { opacity: formFadeAnim }]}>
          <TouchableOpacity
            onPress={() => router.push('/(auth)/register')}
            activeOpacity={0.6}
          >
            <Text style={styles.footerText}>
              Don't have an account?{' '}
              <Text style={styles.footerLink}>Create one</Text>
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0D11',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 100 : 80,
    paddingBottom: 40,
    justifyContent: 'center',
  },

  // Header
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    marginBottom: 28,
  },
  logoMark: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#D4A017',
    shadowOpacity: 0.3,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  logoMarkText: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0B0D11',
    letterSpacing: -1,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B6F7B',
    letterSpacing: 0.1,
  },

  // Form
  form: {
    gap: 0,
  },

  // Google button
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    height: 52,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  googleButtonText: {
    color: '#1F1F1F',
    fontWeight: '600',
    fontSize: 15,
    letterSpacing: 0.1,
  },

  // Divider
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#222530',
  },
  dividerText: {
    color: '#444854',
    marginHorizontal: 16,
    fontSize: 13,
    fontWeight: '500',
  },

  // Inputs
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    color: '#9CA0AB',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    marginLeft: 2,
    letterSpacing: 0.2,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#13151B',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 52,
    borderWidth: 1.5,
    borderColor: '#1E2028',
  },
  inputWrapperFocused: {
    borderColor: '#D4A017',
    backgroundColor: '#141720',
  },
  input: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 15,
    letterSpacing: 0.1,
  },
  eyeButton: {
    padding: 4,
  },

  // Sign In button
  signInButton: {
    backgroundColor: '#D4A017',
    borderRadius: 12,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  signInButtonDisabled: {
    backgroundColor: '#1A1D25',
  },
  signInButtonText: {
    color: '#0B0D11',
    fontWeight: '700',
    fontSize: 15,
    letterSpacing: 0.2,
  },
  signInButtonTextDisabled: {
    color: '#3A3D47',
  },

  // Footer
  footer: {
    alignItems: 'center',
    marginTop: 32,
    paddingVertical: 8,
  },
  footerText: {
    color: '#6B6F7B',
    fontSize: 14,
  },
  footerLink: {
    color: '#D4A017',
    fontWeight: '600',
  },
});