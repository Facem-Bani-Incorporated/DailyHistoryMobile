import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import * as Notifications from 'expo-notifications'; // Import nou
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
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

// CONFIGURARE NOTIFICĂRI: Spunem sistemului să arate alerta chiar dacă aplicația e deschisă
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldVibrate: true,
    // Proprietățile cerute de noile versiuni de Expo:
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

  // FUNCȚIA DE TEST PENTRU NOTIFICARE REALĂ
  const triggerNotificationTest = async () => {
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
          badge: 1, // Adăugăm și un badge pentru realism
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

  const handleLogin = async () => {
    if (!form.email || !form.password) {
      Alert.alert('Atenție', 'Te rugăm să introduci email-ul și parola.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await api.post('/auth/login', {
        username: form.email,
        password: form.password,
      });

      const { token, user } = res.data;
      setAuth(token, user);
      router.replace('/(main)');
    } catch (e: any) {
      if (!e.response) {
        console.warn('Backend offline. Sesiune fictivă activată.');
        setAuth('fake-jwt-token', { name: 'History Explorer' });
        router.replace('/(main)');
      } else {
        Alert.alert('Eroare', 'Email sau parolă incorectă.');
      }
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
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topActions}>
          <TouchableOpacity
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          >
            <ArrowLeft color="#ffd700" size={28} />
          </TouchableOpacity>

          {/* BUTONUL TĂU DE TEST CU VIBRAȚIE */}
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

          <TouchableOpacity style={styles.forgotPassword}>
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
            <TouchableOpacity style={styles.socialButton}>
              <Google color="#fff" size={22} />
              <Text style={styles.socialButtonText}>Google</Text>
            </TouchableOpacity>

            {Platform.OS === 'ios' && (
              <TouchableOpacity style={styles.socialButton}>
                <Apple color="#fff" size={22} />
                <Text style={styles.socialButtonText}>Apple</Text>
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={styles.registerLink}
            onPress={() => router.push('/(auth)/register')}
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
    borderColor: '#ffd700', // Schimbat în Gold să iasă în evidență
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