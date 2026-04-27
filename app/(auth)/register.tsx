import { Ionicons } from '@expo/vector-icons';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import * as AppleAuthentication from 'expo-apple-authentication';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react-native';
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
import { authService } from '../../services/authService';
import { useAuthStore } from '../../store/useAuthStore';

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

export default function RegisterScreen() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);

  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
  });

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
      iosClientId: '49902921378-bicgq9s907d0qegfjkvk8a3mqlhsmrt7.apps.googleusercontent.com',
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
        console.log('Utilizatorul a anulat înregistrarea');
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
      } catch (e) {
        console.log('Nicio sesiune anterioară de curățat.');
      }
      console.log('Trimit ID Token la Railway (din Register)...');
      await authService.loginWithGoogle(googleIdToken);
      // Don't navigate — _layout.tsx will detect the token and show onboarding
    } catch (error: any) {
      console.error('Detalii eroare Railway Register:', error.response?.data);
      Alert.alert(
        'Eroare Server',
        error.response?.data?.message || 'Validarea Google a eșuat.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (credential.identityToken) {
        setIsLoading(true);
        await authService.loginWithApple(
          credential.identityToken,
          credential.fullName?.givenName,
          credential.fullName?.familyName
        );
      }
    } catch (e: any) {
      if (e.code === 'ERR_CANCELED') {
        // Utilizatorul a închis fereastra
      } else {
        Alert.alert('Eroare Apple', 'Nu s-a putut efectua autentificarea cu Apple.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!form.username || !form.email || !form.password) {
      Alert.alert('Eroare', 'Toate câmpurile sunt obligatorii.');
      return;
    }
    setIsLoading(true);
    try {
      await api.post('/auth/register', {
        username: form.username,
        email: form.email,
        password: form.password,
        role: ['user'],
      });

      // Auto-login after successful registration
      // Small delay to let backend process the new account
      await new Promise(resolve => setTimeout(resolve, 500));

      const trySignin = async (user: string) => {
        const res = await api.post('/auth/signin', {
          username: user,
          password: form.password,
        });
        return res;
      };

      try {
        let res;
        try {
          res = await trySignin(form.username);
        } catch {
          // Retry with email
          res = await trySignin(form.email);
        }
        const { token, accessToken, ...userData } = res.data;
        const finalToken = token || accessToken;
        if (finalToken) {
          setAuth(finalToken, userData);
          // Don't navigate — _layout.tsx will detect the token and show onboarding
        } else {
          router.replace('/(auth)/login');
        }
      } catch {
        // Auto-login failed but account was created
        Alert.alert('Succes', 'Cont creat! Te poți loga acum.');
        router.replace('/(auth)/login');
      }
    } catch (e: any) {
      Alert.alert('Eroare', e.response?.data?.message || 'Nu s-a putut crea contul.');
    } finally {
      setIsLoading(false);
    }
  };

  const isFormValid = form.username.length > 0 && form.email.length > 0 && form.password.length > 0;

  // Password strength
  const getPasswordStrength = () => {
    const p = form.password;
    if (p.length === 0) return { level: 0, label: '', color: 'transparent' };
    if (p.length < 6) return { level: 1, label: 'Weak', color: '#E5484D' };
    const hasUpper = /[A-Z]/.test(p);
    const hasNumber = /[0-9]/.test(p);
    const hasSpecial = /[^A-Za-z0-9]/.test(p);
    const score = [p.length >= 8, hasUpper, hasNumber, hasSpecial].filter(Boolean).length;
    if (score <= 1) return { level: 1, label: 'Weak', color: '#E5484D' };
    if (score === 2) return { level: 2, label: 'Fair', color: '#F5A623' };
    if (score === 3) return { level: 3, label: 'Good', color: '#D4A017' };
    return { level: 4, label: 'Strong', color: '#30A46C' };
  };

  const pwStrength = getPasswordStrength();

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <StatusBar style="light" />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Back button */}
        <Animated.View style={{ opacity: fadeAnim }}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            activeOpacity={0.6}
          >
            <ArrowLeft color="#9CA0AB" size={20} />
          </TouchableOpacity>
        </Animated.View>

        {/* Header */}
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
          <Text style={styles.title}>Create account</Text>
          <Text style={styles.subtitle}>Join millions exploring history</Text>
        </Animated.View>

        {/* Form */}
        <Animated.View style={[styles.form, { opacity: formFadeAnim, transform: [{ translateY: formSlideAnim }] }]}>

          {/* Apple Button (Only show on iOS) */}
          {Platform.OS === 'ios' && (
            <TouchableOpacity
              style={[styles.googleButton, { backgroundColor: '#000', marginBottom: 12 }]}
              onPress={handleAppleSignIn}
              disabled={isLoading}
              activeOpacity={0.7}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Ionicons name="logo-apple" size={20} color="#FFF" />
                  <Text style={[styles.googleButtonText, { color: '#FFF' }]}>Continue with Apple</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {/* Google Button */}
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

          {/* Username Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Username</Text>
            <View style={[
              styles.inputWrapper,
              focusedField === 'username' && styles.inputWrapperFocused,
            ]}>
              <TextInput
                style={styles.input}
                placeholder="Choose a username"
                placeholderTextColor="#555"
                value={form.username}
                onChangeText={(text) => setForm({ ...form, username: text })}
                onFocus={() => setFocusedField('username')}
                onBlur={() => setFocusedField(null)}
              />
            </View>
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
                placeholder="Create a password"
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

            {/* Password strength indicator */}
            {form.password.length > 0 && (
              <View style={styles.strengthContainer}>
                <View style={styles.strengthBars}>
                  {[1, 2, 3, 4].map((level) => (
                    <View
                      key={level}
                      style={[
                        styles.strengthBar,
                        {
                          backgroundColor: level <= pwStrength.level
                            ? pwStrength.color
                            : '#1E2028',
                        },
                      ]}
                    />
                  ))}
                </View>
                <Text style={[styles.strengthLabel, { color: pwStrength.color }]}>
                  {pwStrength.label}
                </Text>
              </View>
            )}
          </View>

          {/* Create Account Button */}
          <Pressable
            style={({ pressed }) => [
              styles.createButton,
              !isFormValid && styles.createButtonDisabled,
              pressed && isFormValid && { opacity: 0.85 },
            ]}
            onPress={handleRegister}
            disabled={isLoading || !isFormValid}
          >
            {isLoading ? (
              <ActivityIndicator color="#0B0D11" />
            ) : (
              <Text style={[
                styles.createButtonText,
                !isFormValid && styles.createButtonTextDisabled,
              ]}>Create Account</Text>
            )}
          </Pressable>

          {/* Terms */}
          <Text style={styles.termsText}>
            By creating an account, you agree to our{' '}
            <Text style={styles.termsLink}>Terms</Text> and{' '}
            <Text style={styles.termsLink}>Privacy Policy</Text>
          </Text>
        </Animated.View>

        {/* Footer */}
        <Animated.View style={[styles.footer, { opacity: formFadeAnim }]}>
          <TouchableOpacity
            onPress={() => router.push('/(auth)/login')}
            activeOpacity={0.6}
          >
            <Text style={styles.footerText}>
              Already have an account?{' '}
              <Text style={styles.footerLink}>Sign In</Text>
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
    paddingTop: Platform.OS === 'ios' ? 64 : 48,
    paddingBottom: 40,
  },

  // Back
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#13151B',
    borderWidth: 1,
    borderColor: '#1E2028',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },

  // Header
  header: {
    alignItems: 'center',
    marginBottom: 36,
  },
  logoContainer: {
    marginBottom: 24,
  },
  logoMark: {
    width: 52,
    height: 52,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#D4A017',
    shadowOpacity: 0.3,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  logoMarkText: {
    fontSize: 24,
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

  // Password strength
  strengthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 10,
  },
  strengthBars: {
    flexDirection: 'row',
    gap: 4,
    flex: 1,
  },
  strengthBar: {
    flex: 1,
    height: 3,
    borderRadius: 2,
  },
  strengthLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
  },

  // Create button
  createButton: {
    backgroundColor: '#D4A017',
    borderRadius: 12,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  createButtonDisabled: {
    backgroundColor: '#1A1D25',
  },
  createButtonText: {
    color: '#0B0D11',
    fontWeight: '700',
    fontSize: 15,
    letterSpacing: 0.2,
  },
  createButtonTextDisabled: {
    color: '#3A3D47',
  },

  // Terms
  termsText: {
    textAlign: 'center',
    color: '#444854',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 16,
  },
  termsLink: {
    color: '#6B6F7B',
    textDecorationLine: 'underline',
  },

  // Footer
  footer: {
    alignItems: 'center',
    marginTop: 28,
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