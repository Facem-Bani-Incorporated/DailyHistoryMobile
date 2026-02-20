import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin'; // Noua librarie
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
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
import { authService } from '../services/authService';

export default function LoginScreen() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);

  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ email: '', password: '' });

  // CONFIGURARE INITIALA
  useEffect(() => {
    GoogleSignin.configure({
      // ID-ul de Web din Google Cloud Console (obligatoriu pentru idToken pe Android)
      webClientId: '49902921378-4k5mjec67t0pnu0jrfti1bejpi1e5u3h.apps.googleusercontent.com',
      offlineAccess: true, 
    });
  }, []);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();
      
      // Extragem idToken-ul (care merge la backend pentru validare)
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
    setIsLoading(true); // Asigură-te că pornești loading-ul la început

    // --- SOLUȚIA: Forțăm signOut la nivel de Google SDK ---
    // Asta va curăța cache-ul Google și va forța apariția selectorului de conturi
    try {
      await GoogleSignin.signOut();
      console.log('Google Session curățată cu succes.');
    } catch (signOutError) {
      // Ignorăm eroarea dacă nu era niciun cont logat anterior
      console.log('Niciun cont Google logat anterior.');
    }

    console.log('Trimit ID Token la Railway...'); 
    await authService.loginWithGoogle(googleIdToken);
    
    // Navigăm către aplicație
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
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.title}>History <Text style={styles.gold}>Gold</Text></Text>
          <Text style={styles.subtitle}>Sign in to continue.</Text>
        </View>

        <View style={styles.form}>
          {/* Email Input */}
          <View style={styles.inputWrapper}>
            <Mail color="#666" size={20} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#666"
              value={form.email}
              onChangeText={(text) => setForm({ ...form, email: text })}
              autoCapitalize="none"
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
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Eye color={showPassword ? '#ffd700' : '#666'} size={20} />
            </TouchableOpacity>
          </View>

          <Pressable style={styles.loginButton} onPress={handleLogin} disabled={isLoading}>
            <LinearGradient colors={['#ffd700', '#b8860b']} style={styles.gradientButton}>
              {isLoading ? <ActivityIndicator color="#000" /> : <Text style={styles.loginButtonText}>SIGN IN</Text>}
            </LinearGradient>
          </Pressable>

          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={styles.socialButton}
            onPress={handleGoogleSignIn}
            disabled={isLoading}
          >
            {isLoading ? <ActivityIndicator color="#fff" /> : (
              <>
                <Google color="#fff" size={22} />
                <Text style={styles.socialButtonText}>Continue with Google</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0e1117' },
  scrollContent: { padding: 25, paddingTop: 60 },
  header: { marginBottom: 40 },
  title: { fontSize: 36, fontWeight: '800', color: '#fff' },
  gold: { color: '#ffd700' },
  subtitle: { color: '#aaa', fontSize: 16, marginTop: 10 },
  form: { gap: 18 },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#1a1c23',
    borderRadius: 16, paddingHorizontal: 16, height: 62, borderWidth: 1, borderColor: '#333',
  },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, color: '#fff', fontSize: 16 },
  loginButton: { marginTop: 10, borderRadius: 16, overflow: 'hidden' },
  gradientButton: { height: 60, justifyContent: 'center', alignItems: 'center' },
  loginButtonText: { color: '#000', fontWeight: '900', fontSize: 16, letterSpacing: 1.5 },
  dividerContainer: { flexDirection: 'row', alignItems: 'center', marginVertical: 25 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#333' },
  dividerText: { color: '#666', marginHorizontal: 15, fontSize: 11, fontWeight: '800' },
  socialButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#1a1c23', borderRadius: 16, height: 58, borderWidth: 1, borderColor: '#333', gap: 10,
  },
  socialButtonText: { color: '#fff', fontWeight: '600', fontSize: 15 },
});