import * as GoogleAuth from 'expo-auth-session/providers/google';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import {
  Apple,
  ArrowLeft, Eye, EyeOff,
  Chrome as Google,
  Lock,
  Mail,
  User
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
  View
} from 'react-native';

import api from '../../api';
import { useAuthStore } from '../../store/useAuthStore';

WebBrowser.maybeCompleteAuthSession();

export default function RegisterScreen() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
  });

  // --- CONFIGURARE GOOGLE AUTH ---
  const [request, response, promptAsync] = GoogleAuth.useAuthRequest({
    androidClientId: 'ID-UL-TAU-ANDROID.apps.googleusercontent.com',
    iosClientId: 'ID-UL-TAU-IOS.apps.googleusercontent.com',
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const { authentication } = response;
      handleGoogleRegister(authentication?.idToken);
    }
  }, [response]);

  const handleGoogleRegister = async (idToken: string | undefined | null) => {
    if (!idToken) return;
    setIsLoading(true);
    try {
      // De obicei, backend-ul folosește același endpoint de Google pentru login și register (Upsert)
      const res = await api.post('/auth/google', { token: idToken });
      const { token, user } = res.data;
      setAuth(token, user);
      router.replace('/(main)');
    } catch (error) {
      console.error(error);
      Alert.alert("Google Auth", "Server error. Fake session activated for testing.");
      setAuth('fake-jwt-google', { name: 'New History Member' });
      router.replace('/(main)');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!form.username || !form.email || !form.password) {
      Alert.alert("Error", "Please fill in all fields.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await api.post('/auth/register', {
        username: form.username,
        email: form.email,
        password: form.password
      });

      const { token, user } = res.data;
      setAuth(token, user);
      router.replace('/(main)');
    } catch (e: any) {
      if (!e.response) {
        // Fallback pentru testare dacă backend-ul nu e gata
        console.warn('Backend offline. Mocking register...');
        setAuth('fake-jwt-token', { username: form.username });
        router.replace('/(main)');
      } else {
        Alert.alert("Registration Failed", e.response?.data?.message || "Something went wrong.");
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
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft color="#ffd700" size={28} />
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.title}>Create <Text style={styles.gold}>Account</Text></Text>
          <Text style={styles.subtitle}>Join the elite circle of history explorers.</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputWrapper}>
            <User color="#666" size={20} style={styles.inputIcon} />
            <TextInput 
              style={styles.input}
              placeholder="Username"
              placeholderTextColor="#666"
              value={form.username}
              onChangeText={(text) => setForm({...form, username: text})}
            />
          </View>

          <View style={styles.inputWrapper}>
            <Mail color="#666" size={20} style={styles.inputIcon} />
            <TextInput 
              style={styles.input}
              placeholder="Email Address"
              placeholderTextColor="#666"
              keyboardType="email-address"
              autoCapitalize="none"
              value={form.email}
              onChangeText={(text) => setForm({...form, email: text})}
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
              onChangeText={(text) => setForm({...form, password: text})}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              {showPassword ? <EyeOff color="#ffd700" size={20} /> : <Eye color="#666" size={20} />}
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={styles.registerButton} 
            onPress={handleRegister}
            disabled={isLoading}
          >
            <LinearGradient colors={['#ffd700', '#b8860b']} style={styles.gradientButton}>
              {isLoading ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={styles.registerButtonText}>BECOME A MEMBER</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR CONTINUE WITH</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.socialContainer}>
            <TouchableOpacity 
                style={styles.socialButton} 
                onPress={() => promptAsync()}
                disabled={!request || isLoading}
            >
              <Google color="#fff" size={24} />
              <Text style={styles.socialButtonText}>Google</Text>
            </TouchableOpacity>

            {Platform.OS === 'ios' && (
              <TouchableOpacity style={styles.socialButton}>
                <Apple color="#fff" size={24} />
                <Text style={styles.socialButtonText}>Apple</Text>
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity 
            style={styles.loginLink} 
            onPress={() => router.push('/(auth)/login')}
          >
            <Text style={styles.loginLinkText}>
              Already have an account? <Text style={styles.gold}>Sign In</Text>
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
  backButton: { marginBottom: 30 },
  header: { marginBottom: 35 },
  title: { fontSize: 32, fontWeight: '800', color: '#fff' },
  gold: { color: '#ffd700' },
  subtitle: { color: '#aaa', fontSize: 16, marginTop: 10 },
  form: { gap: 18 },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1c23',
    borderRadius: 15,
    paddingHorizontal: 15,
    height: 60,
    borderWidth: 1,
    borderColor: '#333'
  },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, color: '#fff', fontSize: 16 },
  registerButton: { marginTop: 10, borderRadius: 15, overflow: 'hidden' },
  gradientButton: { paddingVertical: 18, alignItems: 'center' },
  registerButtonText: { color: '#000', fontWeight: '900', fontSize: 16, letterSpacing: 1 },
  dividerContainer: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#333' },
  dividerText: { color: '#666', marginHorizontal: 15, fontSize: 12, fontWeight: '700' },
  socialContainer: { flexDirection: 'row', gap: 15 },
  socialButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a1c23',
    borderRadius: 15,
    height: 55,
    borderWidth: 1,
    borderColor: '#333',
    gap: 10
  },
  socialButtonText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  loginLink: { alignItems: 'center', marginTop: 10 },
  loginLinkText: { color: '#aaa', fontSize: 15 }
});