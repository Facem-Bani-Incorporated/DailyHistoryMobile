import AsyncStorage from '@react-native-async-storage/async-storage';
import * as GoogleAuth from 'expo-auth-session/providers/google';
import { LinearGradient } from 'expo-linear-gradient';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as WebBrowser from 'expo-web-browser';
import {
  Apple,
  ArrowLeft,
  BellRing,
  Eye,
  EyeOff,
  Chrome as Google,
  Lock,
  Mail,
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import api from '../../api';
import { useAuthStore } from '../../store/useAuthStore';

// Finalizează sesiunea de browser pentru Google Auth
WebBrowser.maybeCompleteAuthSession();

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldVibrate: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldSetBadge: true,
  }),
});

export default function LoginScreen() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);

  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({
    email: '',
    password: '',
  });

  // --- 1. CONFIGURARE GOOGLE AUTH ---
  const [request, response, promptAsync] = GoogleAuth.useAuthRequest({
    androidClientId: 'ID-UL-TAU-ANDROID.apps.googleusercontent.com',
    iosClientId: 'ID-UL-TAU-IOS.apps.googleusercontent.com',
  });

  // Logare stare request Google
  useEffect(() => {
    if (response) {
      console.log("🟡 Google Auth Response Type:", response.type);
      if (response.type === 'success') {
        const { authentication } = response;
        console.log("🔑 Google ID Token primit:", authentication?.idToken?.substring(0, 15) + "...");
        handleBackendGoogleLogin(authentication?.idToken);
      }
    }
  }, [response]);

  // --- 2. HANDLE GOOGLE LOGIN (BACKEND CONTEXT) ---
  const handleBackendGoogleLogin = async (googleToken: string | undefined | null) => {
    if (!googleToken) return;
    
    console.log("🚀 Trimitere token Google către Sergiu...");
    setIsLoading(true);
    try {
      const res = await api.post('/auth/google', { token: googleToken });
      console.log("✅ Backend-ul lui Sergiu a validat Google Login!");
      
      const { token, user } = res.data;
      setAuth(token, user);
      router.replace('/(main)');
    } catch (error: any) {
      console.error('❌ Google Backend Error:', error.message);
      
      // MOCK pentru testare
      console.warn('⚠️ Server offline - Activare sesiune fictivă Google.');
      setAuth('fake-google-jwt-123', { name: 'Google Explorer', email: 'test@google.com' });
      router.replace('/(main)');
    } finally {
      setIsLoading(false);
    }
  };

  // --- 3. HANDLE CLASSIC LOGIN ---
  const handleLogin = async () => {
    if (!form.email || !form.password) {
      Alert.alert('Atenție', 'Te rugăm să introduci email-ul și parola.');
      return;
    }

    console.log("📧 Încercare login clasic pentru:", form.email);
    setIsLoading(true);
    try {
      const res = await api.post('/auth/login', {
        username: form.email,
        password: form.password,
      });

      console.log("✅ Login reușit cu succes!");
      const { token, user } = res.data;
      setAuth(token, user);
      router.replace('/(main)');
    } catch (e: any) {
      if (!e.response) {
        console.warn('⚠️ Backend offline. Activare sesiune fictivă JWT.');
        // Te lasă să intri chiar dacă serverul e jos (pentru teste front-end)
        setAuth('fake-jwt-token-999', { name: 'History Explorer', email: form.email });
        router.replace('/(main)');
      } else {
        console.error("❌ Eroare Auth:", e.response?.data?.message || "Credentiale gresite");
        Alert.alert('Eroare', 'Email sau parolă incorectă.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // --- 4. HANDLE APPLE (MOCK) ---
  const handleAppleLogin = () => {
    console.log("🍏 Apple Login apăsat (Urmează să fie implementat)");
    Alert.alert("Apple Auth", "Funcționalitatea Apple va fi disponibilă după configurarea contului de Developer Apple.");
  };

  // --- 5. NOTIFICĂRI & ALTE HANDLE-URI ---
  const triggerNotificationTest = async () => {
    console.log("🔔 Test notificare & vibrație declanșat");
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') {
        Alert.alert('Eroare', 'Permisiunile pentru notificări au fost respinse.');
        return;
      }
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "📜 Daily History Gold",
          body: "A new Archive has been discovered",
          sound: true,
          badge: 1,
        },
        trigger: null,
      });
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    const showNotificationPrompt = async () => {
      try {
        const seen = await AsyncStorage.getItem('notif_prompt_seen');
        console.log("📦 Verificare prompt notificare. Văzut anterior:", seen);
        if (!seen) {
          setTimeout(() => {
            router.push('/notification-prompt');
          }, 600);
        }
      } catch (e) {
        console.log('Storage error:', e);
      }
    };
    showNotificationPrompt();
  }, []);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <StatusBar style="light" />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topActions}>
          <TouchableOpacity
            onPress={() => {
                console.log("⬅️ Back pressed");
                router.canGoBack() ? router.back() : router.replace('/');
            }}
          >
            <ArrowLeft color="#ffd700" size={28} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.testNotifButton} onPress={triggerNotificationTest}>
            <BellRing color="#ffd700" size={18} />
            <Text style={styles.testNotifText}>Vibrate Now</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.header}>
          <Text style={styles.title}>
            Welcome <Text style={styles.gold}>Back</Text>
          </Text>
          <Text style={styles.subtitle}>The archives are waiting for your return.</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputWrapper}>
            <Mail color="#666" size={20} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Email or Username"
              placeholderTextColor="#666"
              autoCapitalize="none"
              value={form.email}
              onChangeText={(text) => setForm({ ...form, email: text })}
            />
          </View>

          <View style={styles.inputWrapper}>
            <Lock color="#666" size={20} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#666"
              secureTextEntry={!showPassword}
              value={form.password}
              onChangeText={(text) => setForm({ ...form, password: text })}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              {showPassword ? <EyeOff color="#ffd700" size={20} /> : <Eye color="#666" size={20} />}
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={styles.forgotPassword}
            onPress={() => console.log("🔗 Forgot password link clicked")}
          >
            <Text style={styles.forgotText}>Forgot password?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.loginButton}
            onPress={handleLogin}
            disabled={isLoading}
          >
            <LinearGradient colors={['#ffd700', '#b8860b']} style={styles.gradientButton}>
              {isLoading ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={styles.loginButtonText}>SIGN IN</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR LOGIN WITH</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.socialContainer}>
            <TouchableOpacity 
              style={styles.socialButton} 
              onPress={() => {
                console.log("🔵 Google Login Button Pressed");
                promptAsync();
              }}
              disabled={!request || isLoading}
            >
              <Google color="#fff" size={22} />
              <Text style={styles.socialButtonText}>Google</Text>
            </TouchableOpacity>

            {Platform.OS === 'ios' && (
              <TouchableOpacity style={styles.socialButton} onPress={handleAppleLogin}>
                <Apple color="#fff" size={22} />
                <Text style={styles.socialButtonText}>Apple</Text>
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={styles.registerLink}
            onPress={() => {
                console.log("🔗 Navigate to Register");
                router.push('/(auth)/register');
            }}
          >
            <Text style={styles.registerLinkText}>
              Don't have an account? <Text style={styles.gold}>Join Now</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0e1117' },
  scrollContent: { padding: 25, paddingTop: 60, paddingBottom: 40 },
  topActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  testNotifButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1c23',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ffd700',
    gap: 6,
  },
  testNotifText: {
    color: '#ffd700',
    fontSize: 12,
    fontWeight: '700',
  },
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
  forgotPassword: { alignSelf: 'flex-end', marginTop: -5 },
  forgotText: { color: '#666', fontSize: 14, fontWeight: '600' },
  loginButton: { marginTop: 10, borderRadius: 16, overflow: 'hidden' },
  gradientButton: {
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginButtonText: {
    color: '#000',
    fontWeight: '900',
    fontSize: 16,
    letterSpacing: 1.5,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 25,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#333' },
  dividerText: {
    color: '#666',
    marginHorizontal: 15,
    fontSize: 11,
    fontWeight: '800',
  },
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
  socialButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  registerLink: { alignItems: 'center', marginTop: 15 },
  registerLinkText: { color: '#aaa', fontSize: 15 },
});