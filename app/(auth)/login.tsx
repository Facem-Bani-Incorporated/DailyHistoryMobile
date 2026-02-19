import * as GoogleAuth from 'expo-auth-session/providers/google';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as WebBrowser from 'expo-web-browser';
import { Eye, Chrome as Google, Lock, Mail } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import api from '../../api';
import { useAuthStore } from '../../store/useAuthStore';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);

  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ email: '', password: '' });

  // --- GOOGLE AUTH ---
  const [request, response, promptAsync] = GoogleAuth.useAuthRequest({
    webClientId: '49902921378-sl7m2ooqvg1mmm20prg9epps37qcm9v1.apps.googleusercontent.com',
    androidClientId: '49902921378-fd5pr10cj8okto020lrqoa0d740sdr7q.apps.googleusercontent.com',
    redirectUri: 'https://auth.expo.io/@anonymous/dailyhistorymobile',
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      handleBackendGoogleLogin(id_token);
    }
  }, [response]);

  const handleBackendGoogleLogin = async (googleIdToken: string | undefined | null) => {
    if (!googleIdToken) return;
    setIsLoading(true);
    try {
      const res = await api.post('/auth/google', { idToken: googleIdToken });
      const { token: accessToken, ...userData } = res.data;
      api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
      setAuth(accessToken, userData);
      router.replace('/(main)');
    } catch (error: any) {
      Alert.alert('Eroare Google', 'Serverul nu a putut valida contul Google.');
    } finally {
      setIsLoading(false);
    }
  };

  // --- CLASSIC LOGIN ---
  const handleLogin = async () => {
    console.log('[LOGIN] Button pressed! email:', form.email);

    if (!form.email || !form.password) {
      Alert.alert('Eroare', 'Completează email și parola.');
      return;
    }

    setIsLoading(true);
    try {
      console.log('[LOGIN] Calling API...');
      const res = await api.post('/auth/signin', {
        username: form.email,
        password: form.password,
      });

      console.log('[LOGIN] Response:', res.status, Object.keys(res.data));
      const { token: accessToken, ...userData } = res.data;

      if (accessToken) {
        api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
        setAuth(accessToken, userData);
        console.log('[LOGIN] Success! Navigating...');
        router.replace('/(main)');
      } else {
        Alert.alert('Eroare', 'Token lipsă în răspuns.');
      }
    } catch (e: any) {
      console.error('[LOGIN] Error:', e.response?.status, e.response?.data, e.message);
      Alert.alert(
        'Eroare Login',
        e.response?.data?.message || `Status: ${e.response?.status}` || e.message
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"  // FIX: permite tap-uri când tastatura e deschisă
      >
        <View style={styles.header}>
          <Text style={styles.title}>Welcome <Text style={styles.gold}>Back</Text></Text>
          <Text style={styles.subtitle}>The archives are waiting.</Text>
        </View>

        <View style={styles.form}>
          {/* Username Input */}
          <View style={styles.inputWrapper}>
            <Mail color="#666" size={20} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Username or Email"
              placeholderTextColor="#666"
              value={form.email}
              onChangeText={(text) => setForm({ ...form, email: text })}
              autoCapitalize="none"
              autoCorrect={false}
              // FIX: eliminat keyboardType="email-address" care cauza probleme pe Android
            />
          </View>

          {/* Password Input */}
          <View style={styles.inputWrapper}>
            <Lock color="#666" size={20} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#666"
              secureTextEntry={!showPassword}
              value={form.password}
              onChangeText={(text) => setForm({ ...form, password: text })}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Eye color={showPassword ? '#ffd700' : '#666'} size={20} />
            </TouchableOpacity>
          </View>

          {/* FIX: Folosim Pressable în loc de TouchableOpacity pentru butonul principal */}
          <Pressable
            style={styles.loginButton}
            onPress={() => {
              console.log('[LOGIN] Pressable pressed!');
              handleLogin();
            }}
            disabled={isLoading}
          >
            <LinearGradient colors={['#ffd700', '#b8860b']} style={styles.gradientButton}>
              {isLoading ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={styles.loginButtonText}>SIGN IN</Text>
              )}
            </LinearGradient>
          </Pressable>

          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.socialContainer}>
            <TouchableOpacity
              style={styles.socialButton}
              onPress={() => promptAsync()}
              disabled={!request || isLoading}
            >
              <Google color="#fff" size={22} />
              <Text style={styles.socialButtonText}>Google</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0e1117' },
  scrollContent: { padding: 25, paddingTop: 60, paddingBottom: 40 },
  header: { marginBottom: 40 },
  title: { fontSize: 36, fontWeight: '800', color: '#fff' },
  gold: { color: '#ffd700' },
  subtitle: { color: '#aaa', fontSize: 16, marginTop: 10 },
  form: { gap: 18 },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1c23',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 62,
    borderWidth: 1,
    borderColor: '#333',
  },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, color: '#fff', fontSize: 16 },
  loginButton: { marginTop: 10, borderRadius: 16, overflow: 'hidden' },
  gradientButton: { height: 60, justifyContent: 'center', alignItems: 'center' },
  loginButtonText: { color: '#000', fontWeight: '900', fontSize: 16, letterSpacing: 1.5 },
  dividerContainer: { flexDirection: 'row', alignItems: 'center', marginVertical: 25 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#333' },
  dividerText: { color: '#666', marginHorizontal: 15, fontSize: 11, fontWeight: '800' },
  socialContainer: { flexDirection: 'row', gap: 15 },
  socialButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a1c23',
    borderRadius: 16,
    height: 58,
    borderWidth: 1,
    borderColor: '#333',
    gap: 10,
  },
  socialButtonText: { color: '#fff', fontWeight: '600', fontSize: 15 },
});